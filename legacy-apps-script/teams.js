const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzRrNL5vOd_8VeoDmgA4oa7sOD32q62f5PEy-UF0a_BlgetnkBXefpbFlBDJ4CzNsh7/exec';
let appsScriptUrl = null;

const CLASS_COLORS = {
  Knight: '#FF0000',
  Wizard: '#0000FF',
  Hunter: '#FF9900',
  Priest: '#00FF00',
  Assassin: '#9900FF',
  Blacksmith: '#CC4125',
  Gunslinger: '#B8BCC0',
  Druid: '#4A86E8',
  Paladin: '#980000',
  Champion: '#38761d'
};

let currentTeams = [];
let currentNameToColor = {};

function hideLoadingOverlay(){
  document.getElementById('loadingOverlay').classList.add('hidden');
}
function setSyncStatus(text, connected){
  document.getElementById('syncStatus').textContent = text;
  document.getElementById('syncDot').className = 'sync-dot ' + (connected ? 'on' : 'off');
}
function setSyncError(text){
  document.getElementById('syncError').textContent = text || '';
}
function escapeHtml(s){
  return s.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function formatNum(n){
  if(n === null || n === undefined || isNaN(n)) return '';
  return Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

// ---- modal (same pattern as the roster page) ----
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

// ---- rendering ----
function renderTeams(){
  const grid = document.getElementById('teamGrid');
  document.getElementById('teamCount').textContent = currentTeams.length;
  document.getElementById('playerCount').textContent = currentTeams.reduce((n,t)=>n+t.members.length, 0);

  grid.innerHTML = currentTeams.map(team => {
    const slots = [];
    for(let i=0; i<5; i++){
      const m = team.members[i];
      const slotNum = i+1;
      if(!m){
        slots.push(`
        <li class="team-member empty" data-team="${escapeHtml(team.name)}" data-slot="${slotNum}" data-name="">
          <span class="slot-num">${slotNum}</span>
          <span class="member-label">ว่าง</span>
          <span class="slot-actions">
            <button class="icon-btn slot-edit-btn" title="เพิ่มชื่อ">✎</button>
          </span>
        </li>`);
        continue;
      }
      const color = currentNameToColor[m.name] ? `style="color:${currentNameToColor[m.name]}"` : '';
      const gear = (m.gear !== null && m.gear !== undefined) ? `<span class="gear">${formatNum(m.gear)}</span>` : '';
      slots.push(`
      <li class="team-member" data-team="${escapeHtml(team.name)}" data-slot="${slotNum}" data-name="${escapeHtml(m.name)}">
        <span class="slot-num">${slotNum}</span>
        <span class="member-label" ${color}>${escapeHtml(m.name)}</span>
        ${gear}
        <span class="slot-actions">
          <button class="icon-btn slot-edit-btn" title="แก้ไข">✎</button>
          <button class="icon-btn del slot-delete-btn" title="ลบ">✕</button>
        </span>
      </li>`);
    }
    const avgLine = team.average !== null && team.average !== undefined
      ? `<div class="team-avg">เฉลี่ย ${formatNum(team.average)}</div>` : '';
    return `
    <div class="team-card">
      <div class="team-head">
        <div>
          <div>${escapeHtml(team.name)}</div>
          ${avgLine}
        </div>
        <span class="team-size">${team.members.length}/5</span>
      </div>
      <ul class="team-members">${slots.join('')}</ul>
    </div>`;
  }).join('');
}

function highlightMatch(name, query){
  const idx = name.toLowerCase().indexOf(query.toLowerCase());
  if(idx === -1) return escapeHtml(name);
  return escapeHtml(name.slice(0,idx)) + '<mark>' + escapeHtml(name.slice(idx, idx+query.length)) + '</mark>' + escapeHtml(name.slice(idx+query.length));
}

// ---- edit modal (name + gear) ----
let editingTeam = null;
let editingSlot = null;

function openEditModal(li){
  editingTeam = li.dataset.team;
  editingSlot = Number(li.dataset.slot);
  const m = currentTeams.find(t => t.name === editingTeam)?.members[editingSlot - 1];

  document.getElementById('editModalTitle').textContent = `แก้ไขสมาชิก — ${editingTeam} ช่องที่ ${editingSlot}`;
  const nameInput = document.getElementById('editNameInput');
  const gearInput = document.getElementById('editGearInput');
  nameInput.value = m ? m.name : '';
  gearInput.value = (m && m.gear !== null && m.gear !== undefined) ? m.gear : '';
  document.getElementById('editNameSuggestions').hidden = true;

  document.getElementById('editModalOverlay').hidden = false;
  nameInput.focus();
  nameInput.select();
}

function closeEditModal(){
  document.getElementById('editModalOverlay').hidden = true;
  editingTeam = null;
  editingSlot = null;
}

document.getElementById('editNameInput').addEventListener('input', (e)=>{
  const box = document.getElementById('editNameSuggestions');
  const q = e.target.value.trim();
  if(!q){ box.hidden = true; box.innerHTML = ''; return; }
  const names = Object.keys(currentNameToColor);
  const matches = names.filter(n => n.toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  box.innerHTML = matches.length
    ? matches.map(n => `<div class="suggestion-item" data-name="${encodeURIComponent(n)}">${highlightMatch(n, q)}</div>`).join('')
    : `<div class="suggestion-empty">ไม่พบชื่อที่ตรงกัน</div>`;
  box.hidden = false;
});

document.getElementById('editNameSuggestions').addEventListener('click', (e)=>{
  const item = e.target.closest('.suggestion-item');
  if(!item) return;
  document.getElementById('editNameInput').value = decodeURIComponent(item.dataset.name || '');
  document.getElementById('editNameSuggestions').hidden = true;
  document.getElementById('editGearInput').focus();
});

document.addEventListener('click', (e)=>{
  const box = document.getElementById('editNameSuggestions');
  const wrap = document.getElementById('editNameInput')?.parentElement;
  if(wrap && !wrap.contains(e.target)) box.hidden = true;
});

document.getElementById('editModalCancel').addEventListener('click', closeEditModal);
document.getElementById('editModalOverlay').addEventListener('click', (e)=>{
  if(e.target.id === 'editModalOverlay') closeEditModal();
});
document.addEventListener('keydown', (e)=>{
  if(document.getElementById('editModalOverlay').hidden) return;
  if(e.key === 'Escape') closeEditModal();
});
document.getElementById('editModalSave').addEventListener('click', async ()=>{
  const name = document.getElementById('editNameInput').value.trim();
  const gear = document.getElementById('editGearInput').value.trim();
  const saveBtn = document.getElementById('editModalSave');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="inline-spinner"></span>กำลังบันทึก...';
  const ok = await saveSlot(editingTeam, editingSlot, name, gear);
  saveBtn.disabled = false;
  saveBtn.textContent = 'บันทึก';
  if(ok) closeEditModal();
});

async function saveSlot(teamName, slot, name, gear){
  setSyncError('');
  try{
    const res = await fetch(appsScriptUrl, {
      method: 'POST',
      body: JSON.stringify({ action:'team_update', sheet: TEAM_SHEET_TYPE, team: teamName, slot, name, gear })
    });
    const data = await res.json();
    if(!data.ok) throw new Error(data.error || 'unknown error');
    currentTeams = data.teams;
    renderTeams();
    return true;
  } catch(e){
    setSyncError('บันทึกไม่สำเร็จ: ' + e.message);
    return false;
  }
}

document.getElementById('teamGrid').addEventListener('click', async (e)=>{
  const li = e.target.closest('.team-member');
  if(!li) return;
  const teamName = li.dataset.team;
  const slot = Number(li.dataset.slot);

  if(e.target.closest('.slot-edit-btn')){
    openEditModal(li);
  } else if(e.target.closest('.slot-delete-btn')){
    const confirmed = await showModal({
      title: 'ลบสมาชิกออกจากทีม',
      message: `ต้องการลบ "${li.dataset.name}" ออกจาก ${teamName} ช่องที่ ${slot} ใช่หรือไม่?`,
      confirmText: 'ลบ',
      danger: true
    });
    if(!confirmed) return;
    await saveSlot(teamName, slot, '', '');
  }
});

// ---- data loading ----
async function fetchNameToColor(){
  try{
    const res = await fetch(appsScriptUrl);
    const data = await res.json();
    if(!data.ok || !data.classes) return {};
    const map = {};
    Object.keys(data.classes).forEach(cls => {
      (data.classes[cls] || []).forEach(name => { map[name] = CLASS_COLORS[cls] || null; });
    });
    return map;
  } catch(e){
    return {}; // roster lookup is a nice-to-have; team display still works without it
  }
}

async function fetchTeams(){
  setSyncError('');
  try{
    const [teamsRes, nameToColor] = await Promise.all([
      fetch(`${appsScriptUrl}?type=teams&sheet=${TEAM_SHEET_TYPE}`).then(r => r.json()),
      fetchNameToColor()
    ]);
    if(!teamsRes.ok) throw new Error(teamsRes.error || 'unknown error');
    setSyncStatus('เชื่อมต่อกับ Google Sheet แล้ว', true);
    currentTeams = teamsRes.teams;
    currentNameToColor = nameToColor;
    renderTeams();
    document.getElementById('storage-note').textContent = 'ข้อมูลซิงค์กับ Google Sheet โดยตรง';
    return true;
  } catch(e){
    setSyncStatus('เชื่อมต่อ Google Sheet ไม่สำเร็จ — ตรวจสอบ URL หรือการตั้งค่า Deploy', false);
    setSyncError('รายละเอียด: ' + e.message + ' (ต้อง Deploy เป็น Web app แบบ Anyone access)');
    document.getElementById('storage-note').textContent = 'เชื่อมต่อ Google Sheet ไม่สำเร็จ';
    return false;
  }
}

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
  const ok = await fetchTeams();
  if(ok) document.getElementById('urlForm').style.display = 'none';
});
document.getElementById('refreshBtn').addEventListener('click', async (e)=>{
  const btn = e.currentTarget;
  btn.disabled = true;
  btn.innerHTML = '<span class="inline-spinner"></span>กำลังรีเฟรช...';
  await fetchTeams();
  btn.disabled = false;
  btn.textContent = 'รีเฟรชจากชีต';
});

async function init(){
  try{
    await resolveAppsScriptUrl();
    if(!appsScriptUrl){
      document.getElementById('storage-note').textContent = 'ยังไม่ได้เชื่อมต่อกับ Google Sheet';
      return;
    }
    await fetchTeams();
  } finally {
    hideLoadingOverlay();
  }
}

init();