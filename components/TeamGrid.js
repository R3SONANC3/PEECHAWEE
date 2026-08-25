'use client';
import { useMemo, useState } from 'react';
import { useConfirm } from './useConfirm';
import { useToast } from './useToast';

function formatNum(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '';
  return Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

async function callApi(body) {
  const res = await fetch('/api/teams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'unknown error');
  return data.teams;
}

export default function TeamGrid({ sheetTitle, initialTeams, nameToColor }) {
  const [teams, setTeams] = useState(initialTeams || []);
  const [editing, setEditing] = useState(null); // { team, slot, name, gear }
  const [nameQuery, setNameQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { confirm, modal } = useConfirm();
  const { toast, toastUI } = useToast();

  const names = useMemo(() => Object.keys(nameToColor || {}), [nameToColor]);
  const matches = nameQuery.trim()
    ? names.filter((n) => n.toLowerCase().includes(nameQuery.trim().toLowerCase())).slice(0, 8)
    : [];

  function openEdit(team, slot, member) {
    setEditing({ team, slot, name: member?.name || '', gear: member?.gear ?? '' });
    setNameQuery('');
    setError('');
  }

  async function saveEdit() {
    if (!editing) return;
    setBusy(true);
    setError('');
    try {
      const updated = await callApi({ sheet: sheetTitle, team: editing.team, slot: editing.slot, name: editing.name, gear: editing.gear });
      setTeams(updated);
      setEditing(null);
      toast('บันทึกแล้ว');
    } catch (e) {
      setError('บันทึกไม่สำเร็จ: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(team, slot, memberName) {
    const ok = await confirm({
      title: 'ลบสมาชิกออกจากทีม',
      message: `ต้องการลบ "${memberName}" ออกจาก ${team} ช่องที่ ${slot} ใช่หรือไม่?`,
      confirmText: 'ลบ',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const updated = await callApi({ sheet: sheetTitle, team, slot, name: '', gear: '' });
      setTeams(updated);
      toast(`ลบ "${memberName}" ออกจากทีมแล้ว`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {modal}
      {toastUI}

      <div className="team-grid">
        {teams.map((team) => (
          <div className="team-card" key={team.name}>
            <div className="team-head">
              <div>
                <div>{team.name}</div>
                {team.average !== null && <div className="team-avg">เฉลี่ย {formatNum(team.average)}</div>}
              </div>
              <span className="team-size">{team.members.length}/{team.slotCount}</span>
            </div>
            <ul className="team-members">
              {Array.from({ length: team.slotCount }, (_, i) => {
                const slot = i + 1;
                const m = team.members.find((mm) => mm.slot === slot);
                return (
                  <li className={`team-member${m ? '' : ' empty'}`} key={slot}>
                    <span className="slot-num">{slot}</span>
                    <span className="member-label" style={m && nameToColor[m.name] ? { color: nameToColor[m.name] } : undefined}>
                      {m ? m.name : 'ว่าง'}
                    </span>
                    {m && m.gear !== null && <span className="gear">{formatNum(m.gear)}</span>}
                    <span className="slot-actions">
                      <button type="button" className="icon-btn" onClick={() => openEdit(team.name, slot, m)} title={m ? 'แก้ไข' : 'เพิ่มชื่อ'}>✎</button>
                      {m && <button type="button" className="icon-btn del" onClick={() => removeMember(team.name, slot, m.name)} title="ลบ">✕</button>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {editing && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEditing(null); }}>
          <div className="modal-box">
            <div className="modal-title">แก้ไขสมาชิก — {editing.team} ช่องที่ {editing.slot}</div>
            <div className="field" style={{ marginBottom: 14, position: 'relative' }}>
              <label>ชื่อผู้เล่น</label>
              <input
                value={editing.name}
                onChange={(e) => { setEditing({ ...editing, name: e.target.value }); setNameQuery(e.target.value); }}
                placeholder="ค้นหาชื่อ..."
                autoFocus
              />
              {matches.length > 0 && (
                <div className="search-suggestions">
                  {matches.map((n) => (
                    <div key={n} className="suggestion-item" onClick={() => { setEditing({ ...editing, name: n }); setNameQuery(''); }}>{n}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="field" style={{ marginBottom: 22 }}>
              <label>ค่าพลัง (GEAR)</label>
              <input
                type="number"
                inputMode="numeric"
                value={editing.gear}
                onChange={(e) => setEditing({ ...editing, gear: e.target.value })}
                placeholder="เช่น 21000"
              />
            </div>
            {error && <div className="sync-error">{error}</div>}
            <div className="modal-actions">
              <button type="button" className="modal-btn modal-btn-cancel" onClick={() => setEditing(null)}>ยกเลิก</button>
              <button type="button" className="modal-btn modal-btn-confirm" onClick={saveEdit} disabled={busy}>
                {busy ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
