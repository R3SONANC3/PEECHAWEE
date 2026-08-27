'use client';
import { useMemo, useState } from 'react';
import { useConfirm } from './useConfirm';
import { useToast } from './useToast';
import ClassIcon from './ClassIcon';
import { CLASS_MAP, CLASSES } from '@/lib/classes';
import { formatNum } from '@/lib/format';

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

export default function TeamGrid({ sheetTitle, initialTeams, sectionLabels, nameToClass, gearMap, isAdmin }) {
  const [teams, setTeams] = useState(initialTeams || []);
  const [editing, setEditing] = useState(null); // { team, slot, name, gear }
  const [nameQuery, setNameQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { confirm, modal } = useConfirm();
  const { toast, toastUI } = useToast();

  const names = useMemo(() => Object.keys(nameToClass || {}), [nameToClass]);

  // Group teams by their sheet section (e.g. TOP/MID/BOT), preserving the
  // order they already come in from the server. Sheets with no section
  // labels fall into a single unlabeled group. Labels are seeded up front
  // so a section with no teams yet (e.g. an empty shift) still shows up.
  const sections = useMemo(() => {
    const groups = [];
    const byLabel = new Map();
    (sectionLabels || []).forEach((label) => {
      const group = { label, teams: [] };
      byLabel.set(label, group);
      groups.push(group);
    });
    teams.forEach((team) => {
      const key = team.section || '';
      if (!byLabel.has(key)) {
        const group = { label: team.section, teams: [] };
        byLabel.set(key, group);
        groups.push(group);
      }
      byLabel.get(key).teams.push(team);
    });
    return groups;
  }, [teams, sectionLabels]);

  const matches = nameQuery.trim() || classFilter
    ? names
        .filter((n) => !classFilter || nameToClass[n] === classFilter)
        .filter((n) => !nameQuery.trim() || n.toLowerCase().includes(nameQuery.trim().toLowerCase()))
        .slice(0, 30)
    : [];

  function openEdit(team, slot, member) {
    setEditing({ team, slot, name: member?.name || '', gear: member?.gear ?? '' });
    setNameQuery('');
    setClassFilter('');
    setError('');
  }

  // Picking a known name pulls in their GEAR from the shared sheet if
  // there's already a value on record, so re-assigning someone doesn't
  // require re-typing a number that's already known.
  function pickName(n) {
    const knownGear = gearMap?.[n];
    setEditing((prev) => ({ ...prev, name: n, gear: knownGear !== undefined ? knownGear : prev.gear }));
    setNameQuery('');
    setClassFilter('');
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

      {sections.map((sectionGroup) => (
        <div className="team-section" key={sectionGroup.label || '_'}>
          {sectionGroup.label && <h2 className="section-title">{sectionGroup.label}</h2>}
          {sectionGroup.teams.length === 0 ? (
            <p className="subtitle">ยังไม่มีทีมในส่วนนี้</p>
          ) : (
          <div className="team-grid">
            {sectionGroup.teams.map((team) => (
              <div className="team-card" key={team.name}>
                <div className="team-head">
                  <div>
                    <div>{team.name}</div>
                    {team.total !== null && (
                      <div className="team-avg">รวม {formatNum(team.total)} · เฉลี่ย {formatNum(team.average)}</div>
                    )}
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
                        {(() => {
                          const cls = m && CLASS_MAP[nameToClass[m.name]];
                          return (
                            <span className="member-label" style={cls ? { '--cc': cls.color } : undefined}>
                              {cls && <ClassIcon icon={cls.icon} size={14} className="member-icon" />}
                              <span className="member-name-text">{m ? m.name : 'ว่าง'}</span>
                            </span>
                          );
                        })()}
                        {m && m.gear !== null && <span className="gear">{formatNum(m.gear)}</span>}
                        {isAdmin && (
                          <span className="slot-actions">
                            <button type="button" className="icon-btn" onClick={() => openEdit(team.name, slot, m)} title={m ? 'แก้ไข' : 'เพิ่มชื่อ'}>✎</button>
                            {m && <button type="button" className="icon-btn del" onClick={() => removeMember(team.name, slot, m.name)} title="ลบ">✕</button>}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          )}
        </div>
      ))}

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
              <div className="class-filter-row">
                <button
                  type="button"
                  className={`class-filter-chip all${classFilter === '' ? ' active' : ''}`}
                  onClick={() => setClassFilter('')}
                >
                  ทั้งหมด
                </button>
                {CLASSES.map((c) => (
                  <button
                    type="button"
                    key={c.key}
                    className={`class-filter-chip${classFilter === c.key ? ' active' : ''}`}
                    style={{ '--cc': c.color }}
                    title={c.key}
                    onClick={() => setClassFilter(classFilter === c.key ? '' : c.key)}
                  >
                    <ClassIcon icon={c.icon} size={14} />
                  </button>
                ))}
              </div>
              {matches.length > 0 && (
                <div className="search-suggestions">
                  {matches.map((n) => (
                    <div key={n} className="suggestion-item" onClick={() => pickName(n)}>{n}</div>
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
