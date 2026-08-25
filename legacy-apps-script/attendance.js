const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzRrNL5vOd_8VeoDmgA4oa7sOD32q62f5PEy-UF0a_BlgetnkBXefpbFlBDJ4CzNsh7/exec';
let appsScriptUrl = null;

let allNames = [];
let knownDates = [];
let currentDateLabel = '';
let statuses = {};       // name -> 'present' | 'absent' | null
let savedSnapshot = {};  // last-fetched/last-saved state, used to detect unsaved changes

// ---- date helpers (sheet uses M/D/YYYY, no leading zeros) ----
function inputValueToLabel(v){
  // v is 'YYYY-MM-DD' from <input type="date">
  const [y, m, d] = v.split('-').map(Number);
  return `${m}/${d}/${y}`;
}
function labelToInputValue(label){
  const [m, d, y] = label.split('/').map(Number);
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function todayLabel(){
  const now = new Date();
  return `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()}`;
}

function isDirty(){
  return JSON.stringify(statuses) !== JSON.stringify(savedSnapshot);
}

// ---- modal (shared pattern with the roster page) ----
function showModal({ title, message, confirmText='ยืนยัน', cancelText='ยกเลิก', danger=false, onlyOk=false }){
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const titleEl = document.getElementById('modalTitle');
    const msgEl = document.getElementById('modalMessage');
    const cancelBtn = document.getElementById('modalCancel');
    const confirmBtn = document.getElementById('modalConfirm');

    titleEl.textContent = title;
    titleEl.className = 'modal-title' + (danger ? ' danger' : '');
    msgEl.textContent = message;
    confirmBtn.textContent = confirmText;
    confirmBtn.className = 'modal-btn modal-btn-confirm' + (danger ? ' danger' : '');
    cancelBtn.style.display = onlyOk ? 'none' : '';
    cancelBtn.textContent = cancelText;

    overlay.hidden = false;

    function cleanup(result){
      overlay.hidden = true;
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
      overlay.removeEventListener('click', onOverlay);
      document.removeEventListener('keydown', onKey);
      resolve(result);
    }
    function onConfirm(){ cleanup(true); }
    function onCancel(){ cleanup(false); }
    function onOverlay(e){ if(e.target === overlay && !onlyOk) cleanup(false); }
    function onKey(e){
      if(e.key === 'Escape' && !onlyOk) cleanup(false);
      if(e.key === 'Enter') cleanup(true);
    }
    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
    overlay.addEventListener('click', onOverlay);
    document.addEventListener('keydown', onKey);
    confirmBtn.focus();
  });
}

function hideLoadingOverlay(){
  document.getElementById('loadingOverlay').classList.add('hidden');
}

function setButtonLoading(btn, isLoading, loadingLabel, normalLabel){
  if(isLoading){
    btn.disabled = true;
    btn.innerHTML = `<span class="inline-spinner"></span>${loadingLabel}`;
  } else {
    btn.disabled = false;
    btn.textContent = normalLabel;
  }
}

function setSyncStatus(text, connected){
  document.getElementById('syncStatus').textContent = text;
  document.getElementById('syncDot').className = 'sync-dot ' + (connected ? 'on' : 'off');
}
function setSyncError(text){
  document.getElementById('syncError').textContent = text || '';
}

// ---- data loading ----
async function resolveAppsScriptUrl(){
  try{
    const urlRes = await window.storage.get('appsScriptUrl', false);
    if(urlRes && urlRes.value){ appsScriptUrl = urlRes.value; return; }
  } catch(e){ /* window.storage may not exist outside claude.ai — that's fine */ }
  if(DEFAULT_APPS_SCRIPT_URL){
    appsScriptUrl = DEFAULT_APPS_SCRIPT_URL;
    try{ await window.storage.set('appsScriptUrl', appsScriptUrl, false); } catch(e){}
  }
}

async function fetchAttendance(dateLabel){
  setSyncError('');
  try{
    const res = await fetch(`${appsScriptUrl}?type=attendance&date=${encodeURIComponent(dateLabel)}`);
    const data = await res.json();
    if(!data.ok) throw new Error(data.error || 'unknown error');
    allNames = data.names;
    knownDates = data.dates;
    currentDateLabel = data.date || dateLabel;
    statuses = { ...data.attendance };
    savedSnapshot = { ...data.attendance };
    setSyncStatus('เชื่อมต่อกับ Google Sheet แล้ว', true);
    return true;
  } catch(e){
    setSyncStatus('เชื่อมต่อ Google Sheet ไม่สำเร็จ — ตรวจสอบ URL หรือการตั้งค่า Deploy', false);
    setSyncError('รายละเอียด: ' + e.message + ' (ต้อง Deploy เป็น Web app แบบ Anyone access)');
    return false;
  }
}

async function saveAttendance(){
  setSyncError('');
  try{
    const res = await fetch(appsScriptUrl, {
      method: 'POST',
      body: JSON.stringify({ action:'attendance_save', date: currentDateLabel, records: statuses })
    });
    const data = await res.json();
    if(!data.ok) throw new Error(data.error || 'unknown error');
    allNames = data.names;
    knownDates = data.dates;
    statuses = { ...data.attendance };
    savedSnapshot = { ...data.attendance };
    return true;
  } catch(e){
    setSyncError('บันทึกไม่สำเร็จ: ' + e.message);
    return false;
  }
}

// ---- rendering ----
function renderDateChips(){
  const box = document.getElementById('dateChips');
  box.innerHTML = knownDates.map(d => `
    <button type="button" class="date-chip ${d === currentDateLabel ? 'active' : ''}" data-date="${d}">${d}</button>
  `).join('');
}

function renderSummary(){
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const visible = allNames.filter(n => !q || n.toLowerCase().includes(q));
  let present=0, absent=0, unmarked=0;
  visible.forEach(n=>{
    const s = statuses[n];
    if(s==='present') present++;
    else if(s==='absent') absent++;
    else unmarked++;
  });
  document.getElementById('presentCount').textContent = present;
  document.getElementById('absentCount').textContent = absent;
  document.getElementById('unmarkedCount').textContent = unmarked;
  document.getElementById('totalCount').textContent = visible.length;
}

function renderGrid(){
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const grid = document.getElementById('attGrid');
  const visible = allNames.filter(n => !q || n.toLowerCase().includes(q));
  grid.innerHTML = visible.map(name => {
    const s = statuses[name] || null;
    const chipCls = s === 'present' ? 'present' : (s === 'absent' ? 'absent' : '');
    return `
    <div class="att-chip ${chipCls}" data-name="${encodeURIComponent(name)}">
      <span class="att-name">${escapeHtml(name)}</span>
      <span class="att-boxes">
        <button type="button" class="att-box check ${s==='present' ? 'active' : ''}" data-status="present" title="มา">✓</button>
        <button type="button" class="att-box cross ${s==='absent' ? 'active' : ''}" data-status="absent" title="ขาด">✕</button>
      </span>
    </div>`;
  }).join('');
  renderSummary();
}

function escapeHtml(s){
  return s.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

// ---- init ----
async function init(){
  const note = document.getElementById('storage-note');
  try{
    await resolveAppsScriptUrl();
    if(!appsScriptUrl){
      note.textContent = 'ยังไม่ได้เชื่อมต่อกับ Google Sheet';
      return;
    }
    document.getElementById('dateInput').value = labelToInputValue(todayLabel());
    const ok = await fetchAttendance(todayLabel());
    if(ok){
      note.textContent = `กำลังดูวันที่ ${currentDateLabel} · ข้อมูลซิงค์กับ Google Sheet โดยตรง`;
      renderDateChips();
      renderGrid();
    } else {
      note.textContent = 'เชื่อมต่อ Google Sheet ไม่สำเร็จ';
    }
  } finally {
    hideLoadingOverlay();
  }
}

// ---- events ----
document.getElementById('attGrid').addEventListener('click', (e)=>{
  const box = e.target.closest('.att-box');
  if(!box) return;
  const chip = box.closest('.att-chip');
  const name = decodeURIComponent(chip.dataset.name);
  const wantStatus = box.dataset.status; // 'present' or 'absent'
  const current = statuses[name] || null;
  statuses[name] = (current === wantStatus) ? null : wantStatus;
  renderGrid();
});

document.getElementById('searchInput').addEventListener('input', ()=>{ renderGrid(); updateSearchSuggestions(); });

// ---- search suggestions ----
function highlightMatch(name, query){
  const idx = name.toLowerCase().indexOf(query.toLowerCase());
  if(idx === -1) return escapeHtml(name);
  return escapeHtml(name.slice(0,idx)) + '<mark>' + escapeHtml(name.slice(idx, idx+query.length)) + '</mark>' + escapeHtml(name.slice(idx+query.length));
}

function updateSearchSuggestions(){
  const input = document.getElementById('searchInput');
  const box = document.getElementById('searchSuggestions');
  const q = input.value.trim();
  if(!q){ box.hidden = true; box.innerHTML = ''; return; }
  const matches = allNames.filter(n => n.toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  if(matches.length === 0){
    box.innerHTML = `<div class="suggestion-empty">ไม่พบชื่อที่ตรงกัน</div>`;
  } else {
    box.innerHTML = matches.map(n => `<div class="suggestion-item" data-name="${encodeURIComponent(n)}">${highlightMatch(n, q)}</div>`).join('');
  }
  box.hidden = false;
}

document.getElementById('searchSuggestions').addEventListener('click', (e)=>{
  const item = e.target.closest('.suggestion-item');
  if(!item || !item.dataset.name) return;
  const input = document.getElementById('searchInput');
  input.value = decodeURIComponent(item.dataset.name);
  document.getElementById('searchSuggestions').hidden = true;
  renderGrid();
  input.focus();
});

document.getElementById('searchInput').addEventListener('focus', updateSearchSuggestions);
document.addEventListener('click', (e)=>{
  const box = document.getElementById('searchSuggestions');
  const input = document.getElementById('searchInput');
  if(e.target !== input && !box.contains(e.target)) box.hidden = true;
});
document.getElementById('searchInput').addEventListener('keydown', (e)=>{
  if(e.key === 'Escape') document.getElementById('searchSuggestions').hidden = true;
});

document.getElementById('markAllPresentBtn').addEventListener('click', ()=>{
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  allNames.filter(n => !q || n.toLowerCase().includes(q)).forEach(n => statuses[n] = 'present');
  renderGrid();
});
document.getElementById('markAllAbsentBtn').addEventListener('click', ()=>{
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  allNames.filter(n => !q || n.toLowerCase().includes(q)).forEach(n => statuses[n] = 'absent');
  renderGrid();
});
document.getElementById('clearAllMarksBtn').addEventListener('click', ()=>{
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  allNames.filter(n => !q || n.toLowerCase().includes(q)).forEach(n => statuses[n] = null);
  renderGrid();
});

async function switchToDate(label){
  if(isDirty()){
    const confirmed = await showModal({
      title: 'ยังไม่ได้บันทึก',
      message: 'การเปลี่ยนวันที่จะทิ้งการเช็คชื่อที่ยังไม่ได้บันทึกของวันนี้ ดำเนินการต่อหรือไม่?',
      confirmText: 'เปลี่ยนวันที่',
      danger: true
    });
    if(!confirmed) return;
  }
  document.getElementById('dateInput').value = labelToInputValue(label);
  const ok = await fetchAttendance(label);
  if(ok){
    document.getElementById('storage-note').textContent = `กำลังดูวันที่ ${currentDateLabel} · ข้อมูลซิงค์กับ Google Sheet โดยตรง`;
    renderDateChips();
    renderGrid();
  }
}

document.getElementById('dateInput').addEventListener('change', (e)=>{
  switchToDate(inputValueToLabel(e.target.value));
});
document.getElementById('todayBtn').addEventListener('click', ()=>{
  switchToDate(todayLabel());
});
document.getElementById('dateChips').addEventListener('click', (e)=>{
  const chip = e.target.closest('.date-chip');
  if(!chip) return;
  switchToDate(chip.dataset.date);
});

document.getElementById('saveBtn').addEventListener('click', async ()=>{
  const btn = document.getElementById('saveBtn');
  setButtonLoading(btn, true, 'กำลังบันทึก...', 'บันทึกการเช็คชื่อ');
  const ok = await saveAttendance();
  setButtonLoading(btn, false, '', 'บันทึกการเช็คชื่อ');
  if(ok){
    renderDateChips();
    renderGrid();
    document.getElementById('storage-note').textContent = `บันทึกวันที่ ${currentDateLabel} เรียบร้อย`;
  }
});

document.getElementById('editUrlBtn').addEventListener('click', ()=>{
  const form = document.getElementById('urlForm');
  const shown = form.style.display !== 'none';
  form.style.display = shown ? 'none' : 'flex';
  if(!shown){
    document.getElementById('urlInput').value = appsScriptUrl || '';
    document.getElementById('urlInput').focus();
  }
});
document.getElementById('urlForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const val = document.getElementById('urlInput').value.trim();
  if(!val) return;
  try{ await window.storage.set('appsScriptUrl', val, false); } catch(err){}
  appsScriptUrl = val;
  const ok = await fetchAttendance(currentDateLabel || todayLabel());
  if(ok){
    document.getElementById('urlForm').style.display = 'none';
    renderDateChips();
    renderGrid();
  }
});

init();