// ---- ทำเนียบสมาชิกกิลผีชีวะ : Apps Script backend ----
// วิธีติดตั้ง:
// 1. เปิดชีตนี้ -> เมนู Extensions > Apps Script
// 2. ลบโค้ดเดิมทั้งหมด แล้ววางไฟล์นี้แทน
// 3. กด Save (ตั้งชื่อโปรเจกต์อะไรก็ได้)
// 4. Deploy > New deployment > เลือกประเภท "Web app"
//      - Execute as: Me
//      - Who has access: Anyone   (สำคัญ ต้องเลือก Anyone ไม่ใช่ Anyone with Google account)
// 5. กด Deploy แล้วกด Authorize access ตามที่ขอ
// 6. คัดลอก "Web app URL" (ลงท้ายด้วย /exec) ไปวางในหน้าเว็บ (ช่องตั้งค่าด้านบนของเว็บ)
//
// ทุกครั้งที่แก้โค้ดนี้ ต้องไปที่ Deploy > Manage deployments > แก้ไข (ไอคอนดินสอ) > New version > Deploy ใหม่ด้วย

var CLASS_ORDER = ['Knight','Wizard','Hunter','Priest','Assassin','Blacksmith','Gunslinger','Druid'];

var SPREADSHEET_ID = '1XBLOaSCL4WbNBofGiV6ikC3HOUzo2c7DxgyIb4G_1ps';

function getSheet_() {
  // เปิดไฟล์ด้วย ID ตรง ๆ เพราะ getActiveSpreadsheet() จะเป็น null เวลารันผ่าน Web App
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
}

function readGrid_() {
  var sheet = getSheet_();
  var lastRow = Math.max(sheet.getLastRow(), 2);
  var values = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  var map = {};
  CLASS_ORDER.forEach(function (c, i) {
    map[c] = [];
    values.forEach(function (row) {
      var v = row[i];
      if (v !== '' && v !== null && v !== undefined) map[c].push(String(v).trim());
    });
  });
  return map;
}

function writeGrid_(map) {
  var sheet = getSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 8).clearContent();
  }
  var maxLen = 0;
  CLASS_ORDER.forEach(function (c) { maxLen = Math.max(maxLen, map[c].length); });
  if (maxLen === 0) return;
  var out = [];
  for (var r = 0; r < maxLen; r++) {
    var row = [];
    CLASS_ORDER.forEach(function (c) {
      row.push(map[c][r] !== undefined ? map[c][r] : '');
    });
    out.push(row);
  }
  sheet.getRange(2, 1, out.length, 8).setValues(out);
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---- attendance sheet ("เช็คชื่อกิลวอร์") ----
var ATTENDANCE_SHEET_NAME = 'เช็คชื่อกิลวอร์';

function getAttendanceSheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(ATTENDANCE_SHEET_NAME);
  if (!sheet) sheet = ss.getSheets()[1]; // fallback: second tab
  return sheet;
}

function getTimeZone_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSpreadsheetTimeZone();
}

function formatDateLabel_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, getTimeZone_(), 'M/d/yyyy');
  }
  return String(value).trim();
}

function readAttendanceNames_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var names = [];
  values.forEach(function (row) {
    var v = row[0];
    if (v !== '' && v !== null && v !== undefined) names.push(String(v).trim());
  });
  return names;
}

function readAttendanceDates_(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 2) return [];
  var values = sheet.getRange(1, 2, 1, lastCol - 1).getValues()[0];
  var dates = [];
  values.forEach(function (v) {
    if (v !== '' && v !== null && v !== undefined) dates.push(formatDateLabel_(v));
  });
  return dates;
}

function findDateColumn_(sheet, dateLabel) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 2) return -1;
  var values = sheet.getRange(1, 2, 1, lastCol - 1).getValues()[0];
  for (var i = 0; i < values.length; i++) {
    if (formatDateLabel_(values[i]) === dateLabel) return i + 2; // 1-based column index
  }
  return -1;
}

function getAttendanceForDate_(dateLabel) {
  var sheet = getAttendanceSheet_();
  var names = readAttendanceNames_(sheet);
  var dates = readAttendanceDates_(sheet);
  var attendance = {};
  var colIdx = dateLabel ? findDateColumn_(sheet, dateLabel) : -1;
  if (colIdx > -1) {
    var lastRow = sheet.getLastRow();
    var colValues = sheet.getRange(2, colIdx, lastRow - 1, 1).getValues();
    for (var r = 0; r < names.length; r++) {
      var raw = colValues[r] ? colValues[r][0] : '';
      attendance[names[r]] = (raw === true) ? 'present' : null;
    }
  } else {
    names.forEach(function (n) { attendance[n] = null; });
  }
  return { names: names, dates: dates, date: dateLabel || '', attendance: attendance };
}

function ensureCheckboxValidation_(sheet, colIdx, numRows) {
  if (numRows <= 0) return;
  var range = sheet.getRange(2, colIdx, numRows, 1);
  range.clearDataValidations();
  var rule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  range.setDataValidation(rule);
}

// เรียกใช้ครั้งเดียวจาก Apps Script editor (เลือกฟังก์ชันนี้แล้วกด Run)
// เพื่อให้ทุกคอลัมน์วันที่ในชีตเช็คชื่อเป็น checkbox ทั้งหมด (ล้าง validation แบบ dropdown/ตัวหนังสือเดิมออก)
function setupAttendanceValidation() {
  var sheet = getAttendanceSheet_();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastCol < 2 || lastRow < 2) return;
  for (var c = 2; c <= lastCol; c++) {
    ensureCheckboxValidation_(sheet, c, lastRow - 1);
  }
}

function saveAttendance_(dateLabel, records) {
  var sheet = getAttendanceSheet_();
  var names = readAttendanceNames_(sheet);
  var colIdx = findDateColumn_(sheet, dateLabel);
  if (colIdx === -1) {
    colIdx = Math.max(sheet.getLastColumn() + 1, 2);
    var parts = dateLabel.split('/'); // "M/D/YYYY"
    var newDateObj = new Date(Number(parts[2]), Number(parts[0]) - 1, Number(parts[1]));
    var headerCell = sheet.getRange(1, colIdx);
    headerCell.setValue(newDateObj);
    headerCell.setNumberFormat('M/d/yyyy');
    if (colIdx > 2) {
      // คัดลอกฟอร์แมต (ตัวหนา, สีพื้น, เส้นขอบ) จากคอลัมน์วันที่ก่อนหน้า ให้หน้าตาเหมือนกัน
      sheet.getRange(1, colIdx - 1).copyTo(headerCell, { formatOnly: true });
    }
  }
  ensureCheckboxValidation_(sheet, colIdx, names.length);
  var out = names.map(function (name) {
    var status = records.hasOwnProperty(name) ? records[name] : null;
    return [status === 'present']; // true = checked (มา), false = unchecked (ขาด / ยังไม่เช็ค)
  });
  if (out.length > 0) {
    sheet.getRange(2, colIdx, out.length, 1).setValues(out);
  }
  return getAttendanceForDate_(dateLabel);
}

// ---- team sheets ("Main-War" / "Polarity") ----
function getTeamSheet_(which) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var name = which === 'polarity' ? 'Polarity' : 'Main-War';
  return ss.getSheetByName(name);
}

function readTeams_(sheet) {
  var data = sheet.getDataRange().getValues();
  var teams = [];
  for (var r = 0; r < data.length; r++) {
    for (var c = 0; c < data[r].length; c++) {
      var cell = String(data[r][c]).trim();
      if (/^TEAM\s*\d+$/i.test(cell)) {
        var members = [];
        for (var k = 1; k <= 5; k++) {
          if (data[r + k] && data[r + k][c] !== undefined) {
            var v = String(data[r + k][c]).trim();
            if (v) members.push(v);
          }
        }
        teams.push({ name: cell.toUpperCase().replace(/\s+/g, ''), members: members });
      }
    }
  }
  teams.sort(function (a, b) {
    return (parseInt(a.name.replace(/\D/g, ''), 10) || 0) - (parseInt(b.name.replace(/\D/g, ''), 10) || 0);
  });
  return teams;
}

function doGet(e) {
  var type = e && e.parameter ? e.parameter.type : null;
  if (type === 'attendance') {
    var date = (e.parameter.date || '').trim();
    return jsonOutput_(Object.assign({ ok: true }, getAttendanceForDate_(date)));
  }
  if (type === 'teams') {
    var which = (e.parameter.sheet || '').trim().toLowerCase();
    var sheet = getTeamSheet_(which);
    if (!sheet) return jsonOutput_({ ok: false, error: 'sheet not found' });
    return jsonOutput_({ ok: true, teams: readTeams_(sheet) });
  }
  return jsonOutput_({ ok: true, classes: readGrid_() });
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOutput_({ ok: false, error: 'invalid body' });
  }

  if (body.action === 'attendance_save') {
    var date = (body.date || '').trim();
    if (!date) return jsonOutput_({ ok: false, error: 'missing date' });
    var result = saveAttendance_(date, body.records || {});
    return jsonOutput_(Object.assign({ ok: true }, result));
  }

  var map = readGrid_();

  if (body.action === 'add') {
    var name = (body.name || '').trim();
    if (!name || CLASS_ORDER.indexOf(body.cls) === -1) {
      return jsonOutput_({ ok: false, error: 'invalid input' });
    }
    map[body.cls].push(name);
    writeGrid_(map);

  } else if (body.action === 'delete') {
    if (map[body.cls]) {
      var idx = map[body.cls].indexOf(body.name);
      if (idx > -1) map[body.cls].splice(idx, 1);
    }
    writeGrid_(map);

  } else if (body.action === 'edit') {
    if (map[body.oldCls]) {
      var i2 = map[body.oldCls].indexOf(body.oldName);
      if (i2 > -1) map[body.oldCls].splice(i2, 1);
    }
    var newName = (body.newName || '').trim();
    if (newName && map[body.newCls]) map[body.newCls].push(newName);
    writeGrid_(map);

  } else {
    return jsonOutput_({ ok: false, error: 'unknown action' });
  }

  return jsonOutput_({ ok: true, classes: readGrid_() });
}