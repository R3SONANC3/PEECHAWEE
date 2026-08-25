const CLASSES = [
  { key:'Knight',     th:'อัศวิน',       color:'#FF0000' },
  { key:'Wizard',     th:'นักเวท',       color:'#0000FF' },
  { key:'Hunter',     th:'นักล่า',       color:'#FF9900' },
  { key:'Priest',     th:'นักบวช',       color:'#00FF00' },
  { key:'Assassin',   th:'นักฆ่า',       color:'#9900FF' },
  { key:'Blacksmith', th:'ช่างตีเหล็ก',  color:'#CC4125' },
  { key:'Gunslinger', th:'มือปืน',       color:'#B8BCC0' },
  { key:'Druid',      th:'ดรูอิด',       color:'#4A86E8' },
  { key:'Paladin',    th:'พาลาดิน',      color:'#980000' },
  { key:'Champion',   th:'แชมเปี้ยน',    color:'#38761d' },
];
const CLASS_MAP = Object.fromEntries(CLASSES.map(c => [c.key, c]));

const SEED = [
  ["Knight",["Kotoha","Miloka","Niroron","[M]z","ByLathz","จิมมี่เดอะแท้ง","Bal3YWP","แกงส้มไข่ชะอม","KAMACHIIZ","OoBanKoO","มานะ","N","อาก้า","ยูกิน่ารัก","kid","JeannyMIll"]],
  ["Wizard",["PAKKARD","ฟรีเรน","Kuma","TheBlackDread","Toph","PiccassO","BiBicop","Inwboyza007","PangCha","Asuma007","zROMz","Eszo","Vedx","Stifler","TamaXII"]],
  ["Hunter",["Articuno","KIRITI007x","93Curse","Artemis","ฮันสิว่ะ","Fluffy","Gosu35บาท","LOLLIPOPP","อย่ามองหน่าฉัน","Jays","TearlesS","กาก้า","Kyou","OP-01","DeviceZer","Nyrel","Meow_P","Mel","Stubbornboi","OUO","Todti",">g0xf","Dell","โปเนียว","Chiya","Emmilla","fylx","Avaaa"]],
  ["Priest",["Elfie","zCro","DOUBLERA","น้องนีน่า","Mellivora","COBRA","LegendTruffle","PopZ1ck","GeogemT","เณรแอร์","SweetBlood","NCM","meluSine","Floryn","MayR","TastyNa","ZGMF-A-262PD-P","พระสิวะ!","LordLarys","KornTayz","ต๊อด","Kumiko","Asanagi_Umi","VBDOTNET","Chill","Doublylw","JimmyJame","พระแท้มีใบ","MesutONewz","TIMTIM'"]],
  ["Assassin",["AdAofNaRak","Fendiqwq1-","นักนู","Amaterasu","Salmonn","สวยเลย","Estupiyoung","T0N","มีอัญเดียว"]],
  ["Blacksmith",["MokouTsuki","dropcard","TULA","BoatInwza","ToryTheGrean","PRitch"]],
  ["Gunslinger",["UKIOPPA","Encyclo","KikKaPu","FingerFreeze","มือปืน","Momu","Slanez","มือปืนมั้ง","MojiMoshi","แมงแคง","GongGoi","Testarossa","Chal2amp","Tamajang","SCRN","EweryPie"]],
  ["Druid",["แมวขนเทา","HANAMI","OM13T","Ohkami","spyro","Jashi","KEYESS","คงคอย","GraceSiri"]],
];

let players = [];
let nextId = 1;
let editingId = null;
const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzRrNL5vOd_8VeoDmgA4oa7sOD32q62f5PEy-UF0a_BlgetnkBXefpbFlBDJ4CzNsh7/exec';
let appsScriptUrl = null;   // null = local-storage mode, set = synced with Google Sheet

function buildSeed(){
  const out = [];
  SEED.forEach(([cls, names]) => {
    names.forEach(name => out.push({ id: nextId++, name, cls }));
  });
  return out;
}

function classesMapToPlayers(map){
  const out = [];
  CLASSES.forEach(cl => {
    (map[cl.key] || []).forEach(name => out.push({ id: nextId++, name, cls: cl.key }));
  });
  return out;
}

function setSyncStatus(text, connected){
  document.getElementById('syncStatus').textContent = text;
  document.getElementById('syncDot').className = 'sync-dot ' + (connected ? 'on' : 'off');
  document.getElementById('refreshBtn').style.display = connected ? '' : 'none';
}

function setSyncError(text){
  document.getElementById('syncError').textContent = text || '';
}

// ---- modal (replaces confirm()/alert()) ----
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

// ---- loading / busy helpers ----
function hideLoadingOverlay(){
  document.getElementById('loadingOverlay').classList.add('hidden');
}

function setBusy(isBusy){
  document.getElementById('addForm').classList.toggle('busy', isBusy);
  document.getElementById('board').classList.toggle('busy', isBusy);
}

function setButtonLoading(btn, isLoading, loadingLabel, normalLabel){
  if(isLoading){
    btn.dataset.originalLabel = normalLabel;
    btn.disabled = true;
    btn.innerHTML = `<span class="inline-spinner"></span>${loadingLabel}`;
  } else {
    btn.disabled = false;
    btn.textContent = normalLabel;
  }
}

async function loadData(){
  const note = document.getElementById('storage-note');

  try{
    const urlRes = await window.storage.get('appsScriptUrl', false);
    if(urlRes && urlRes.value){
      appsScriptUrl = urlRes.value;
    }
  } catch(e){ /* ignore, fall back to local mode */ }

  if(!appsScriptUrl && DEFAULT_APPS_SCRIPT_URL){
    appsScriptUrl = DEFAULT_APPS_SCRIPT_URL;
    try{ await window.storage.set('appsScriptUrl', appsScriptUrl, false); } catch(e){}
  }

  try{
    if(appsScriptUrl){
      const ok = await fetchFromSheet();
      if(ok){
        note.textContent = 'ข้อมูลซิงค์กับ Google Sheet โดยตรง';
        populateClassSelect();
        render();
        return;
      }
      // fetch failed, fall through to local cache below
    }

    try{
      const res = await window.storage.get('players', false);
      if(res && res.value){
        players = JSON.parse(res.value);
        nextId = players.reduce((m,p)=>Math.max(m,p.id),0) + 1;
        note.textContent = appsScriptUrl
          ? 'เชื่อมต่อชีตไม่สำเร็จ กำลังแสดงข้อมูลที่บันทึกไว้ล่าสุดในเบราว์เซอร์นี้แทน'
          : 'ข้อมูลถูกบันทึกไว้เฉพาะสำหรับคุณ (ในเบราว์เซอร์นี้)';
      } else {
        players = buildSeed();
        await saveLocal();
        note.textContent = 'โหลดรายชื่อเริ่มต้นจากกิลด์แล้ว · ข้อมูลบันทึกเฉพาะสำหรับคุณ';
      }
    } catch(e){
      players = buildSeed();
      note.textContent = 'ไม่สามารถเชื่อมต่อระบบบันทึกได้ (ใช้งานได้ชั่วคราวในหน้านี้)';
    }
    populateClassSelect();
    render();
  } finally {
    hideLoadingOverlay();
  }
}

async function saveLocal(){
  try{
    await window.storage.set('players', JSON.stringify(players), false);
  } catch(e){
    document.getElementById('storage-note').textContent = 'บันทึกข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง';
  }
}

async function fetchFromSheet(){
  setSyncError('');
  try{
    const res = await fetch(appsScriptUrl);
    const data = await res.json();
    if(!data.ok) throw new Error(data.error || 'unknown error');
    players = classesMapToPlayers(data.classes);
    setSyncStatus('เชื่อมต่อกับ Google Sheet แล้ว', true);
    return true;
  } catch(e){
    setSyncStatus('เชื่อมต่อ Google Sheet ไม่สำเร็จ — ตรวจสอบ URL หรือการตั้งค่า Deploy', false);
    setSyncError('รายละเอียด: ' + e.message + ' (ต้อง Deploy เป็น Web app แบบ Anyone access)');
    return false;
  }
}

async function postToSheet(payload){
  setSyncError('');
  try{
    const res = await fetch(appsScriptUrl, { method:'POST', body: JSON.stringify(payload) });
    const data = await res.json();
    if(!data.ok) throw new Error(data.error || 'unknown error');
    players = classesMapToPlayers(data.classes);
    return true;
  } catch(e){
    setSyncError('บันทึกกลับเข้าชีตไม่สำเร็จ: ' + e.message);
    return false;
  }
}

function populateClassSelect(){
  const sel = document.getElementById('classInput');
  sel.innerHTML = CLASSES.map(c => `<option value="${c.key}">${c.key} · ${c.th}</option>`).join('');
}

function counts(){
  const c = Object.fromEntries(CLASSES.map(cl => [cl.key, 0]));
  players.forEach(p => { if(c[p.cls] !== undefined) c[p.cls]++; });
  return c;
}

function renderSeal(){
  const c = counts();
  const total = players.length;
  document.getElementById('totalCount').textContent = total;
  const seg = document.getElementById('segments');
  const r = 80, circ = 2*Math.PI*r;
  let acc = 0;
  seg.innerHTML = '';
  if(total === 0){
    return;
  }
  CLASSES.forEach(cl => {
    const n = c[cl.key];
    if(n === 0) return;
    const frac = n/total;
    const len = frac*circ;
    const gap = circ - len;
    const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
    circle.setAttribute('cx','100'); circle.setAttribute('cy','100'); circle.setAttribute('r', r);
    circle.setAttribute('fill','none');
    circle.setAttribute('stroke', cl.color);
    circle.setAttribute('stroke-width','26');
    circle.setAttribute('stroke-dasharray', `${len} ${gap}`);
    circle.setAttribute('stroke-dashoffset', -acc);
    circle.style.transition = 'stroke-dasharray .5s ease';
    seg.appendChild(circle);
    acc += len;
  });
}

function renderLegend(){
  const c = counts();
  const legend = document.getElementById('legend');
  legend.innerHTML = CLASSES.map(cl => `
    <div class="legend-item">
      <span class="legend-dot" style="background:${cl.color};color:${cl.color}"></span>
      <span class="legend-name">${cl.key}</span>
      <span class="legend-th">${cl.th}</span>
      <span class="legend-count">${c[cl.key]}</span>
    </div>`).join('');
}

function renderBoard(){
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const board = document.getElementById('board');
  board.innerHTML = CLASSES.map(cl => {
    const members = players
      .filter(p => p.cls === cl.key)
      .filter(p => !q || p.name.toLowerCase().includes(q))
      .sort((a,b)=> a.name.localeCompare(b.name,'th'));

    const rows = members.map(p => {
      if(editingId === p.id){
        return `
        <li class="edit-row" data-id="${p.id}">
          <input type="text" class="editName" value="${escapeHtml(p.name)}">
          <select class="editClass">
            ${CLASSES.map(c=>`<option value="${c.key}" ${c.key===p.cls?'selected':''}>${c.key}</option>`).join('')}
          </select>
          <button class="icon-btn saveEdit" title="บันทึก" data-id="${p.id}">✓</button>
          <button class="icon-btn del cancelEdit" title="ยกเลิก" data-id="${p.id}">✕</button>
        </li>`;
      }
      return `
      <li class="member-row" data-id="${p.id}">
        <span class="member-name" style="color:${cl.color}">${escapeHtml(p.name)}</span>
        <span class="row-actions">
          <button class="icon-btn startEdit" title="แก้ไข" data-id="${p.id}">✎</button>
          <button class="icon-btn del deleteBtn" title="ลบ" data-id="${p.id}">✕</button>
        </span>
      </li>`;
    }).join('');

    return `
    <div class="class-card">
      <div class="class-head">
        <span class="class-swatch" style="background:${cl.color};color:${cl.color}"></span>
        <div class="class-names">
          <span class="class-en">${cl.key}</span>
          <span class="class-th">${cl.th}</span>
        </div>
        <span class="class-count">${members.length}</span>
      </div>
      <ul class="class-list">
        ${members.length ? rows : `<div class="empty-note">${q ? 'ไม่พบผู้เล่น' : 'ยังไม่มีสมาชิก'}</div>`}
      </ul>
    </div>`;
  }).join('');
}

function escapeHtml(s){
  return s.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function render(){
  renderSeal();
  renderLegend();
  renderBoard();
}

// ---- events ----
document.getElementById('addForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const nameInput = document.getElementById('nameInput');
  const classInput = document.getElementById('classInput');
  const msg = document.getElementById('formMsg');
  const submitBtn = e.target.querySelector('.btn-add');
  const name = nameInput.value.trim();
  const cls = classInput.value;
  if(!name){ msg.textContent = 'กรุณากรอกชื่อผู้เล่น'; return; }
  msg.textContent = '';

  setButtonLoading(submitBtn, true, 'กำลังเพิ่ม...', '+ เพิ่มสมาชิก');
  if(appsScriptUrl){
    const ok = await postToSheet({ action:'add', name, cls });
    if(!ok){ setButtonLoading(submitBtn, false, '', '+ เพิ่มสมาชิก'); return; }
  } else {
    players.push({ id: nextId++, name, cls });
    await saveLocal();
  }
  setButtonLoading(submitBtn, false, '', '+ เพิ่มสมาชิก');
  nameInput.value = '';
  render();
});

document.getElementById('searchInput').addEventListener('input', ()=>{ renderBoard(); updateSearchSuggestions(); });

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
  const names = [...new Set(players.map(p => p.name))];
  const matches = names.filter(n => n.toLowerCase().includes(q.toLowerCase())).slice(0, 8);
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
  renderBoard();
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

document.getElementById('clearAllBtn').addEventListener('click', async ()=>{
  if(players.length === 0) return;
  if(appsScriptUrl){
    await showModal({
      title: 'ไม่สามารถทำได้',
      message: 'เมื่อเชื่อมต่อกับ Google Sheet แล้ว กรุณาลบข้อมูลออกจากชีตโดยตรงแทนการล้างทั้งหมดจากที่นี่',
      onlyOk: true,
      confirmText: 'เข้าใจแล้ว'
    });
    return;
  }
  const confirmed = await showModal({
    title: 'ล้างข้อมูลทั้งหมด',
    message: 'ต้องการลบข้อมูลสมาชิกทั้งหมดใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้',
    confirmText: 'ลบทั้งหมด',
    danger: true
  });
  if(!confirmed) return;
  players = [];
  await saveLocal();
  render();
});

document.getElementById('board').addEventListener('click', async (e)=>{
  const btn = e.target.closest('button');
  if(!btn) return;
  const id = Number(btn.dataset.id);
  const p = players.find(p=>p.id===id);

  if(btn.classList.contains('deleteBtn')){
    if(!p) return;
    const confirmed = await showModal({
      title: 'ลบสมาชิก',
      message: `ต้องการลบ "${p.name}" ออกจากรายชื่อใช่หรือไม่?`,
      confirmText: 'ลบ',
      danger: true
    });
    if(!confirmed) return;

    setBusy(true);
    if(appsScriptUrl){
      const ok = await postToSheet({ action:'delete', name:p.name, cls:p.cls });
      if(!ok){ setBusy(false); return; }
    } else {
      players = players.filter(x=>x.id!==id);
      await saveLocal();
    }
    setBusy(false);
    render();
  } else if(btn.classList.contains('startEdit')){
    editingId = id;
    renderBoard();
    const row = document.querySelector(`.edit-row[data-id="${id}"] .editName`);
    if(row) row.focus();
  } else if(btn.classList.contains('cancelEdit')){
    editingId = null;
    renderBoard();
  } else if(btn.classList.contains('saveEdit')){
    const row = document.querySelector(`.edit-row[data-id="${id}"]`);
    const newName = row.querySelector('.editName').value.trim();
    const newCls = row.querySelector('.editClass').value;
    if(!newName || !p) return;

    setBusy(true);
    if(appsScriptUrl){
      const ok = await postToSheet({ action:'edit', oldName:p.name, oldCls:p.cls, newName, newCls });
      if(!ok){ setBusy(false); return; }
    } else {
      p.name = newName; p.cls = newCls;
      await saveLocal();
    }
    setBusy(false);
    editingId = null;
    render();
  }
});

// ---- sync panel controls ----
document.getElementById('toggleHelpBtn').addEventListener('click', ()=>{
  document.getElementById('syncHelp').classList.toggle('open');
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

document.getElementById('refreshBtn').addEventListener('click', async (e)=>{
  const btn = e.currentTarget;
  setButtonLoading(btn, true, 'กำลังรีเฟรช...', 'รีเฟรชจากชีต');
  const ok = await fetchFromSheet();
  if(ok) render();
  setButtonLoading(btn, false, '', 'รีเฟรชจากชีต');
});

document.getElementById('urlForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const val = document.getElementById('urlInput').value.trim();
  if(!val) return;
  const submitBtn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(submitBtn, true, 'กำลังเชื่อมต่อ...', 'บันทึก');
  try{
    await window.storage.set('appsScriptUrl', val, false);
  } catch(err){ /* still try to use it for this session */ }
  appsScriptUrl = val;
  const ok = await fetchFromSheet();
  populateClassSelect();
  render();
  setButtonLoading(submitBtn, false, '', 'บันทึก');
  if(ok){
    document.getElementById('urlForm').style.display = 'none';
    document.getElementById('storage-note').textContent = 'ข้อมูลซิงค์กับ Google Sheet โดยตรง';
  }
});

loadData();