'use client';
import { useEffect, useMemo, useState } from 'react';
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
  return data;
}

// Rebuilds what THIS sheet contributes to the group's assigned-name map
// from freshly-saved team data, replacing whatever was known for this
// sheet before while leaving other sheets' entries (still accurate — this
// save didn't touch them) untouched. Without this, the dropdown wouldn't
// know about a name just assigned until the page was reloaded, letting the
// same name look "free" again for the very next edit in the same session.
function mergeGroupAssignments(prev, freshTeams, forSheet) {
  const next = {};
  Object.entries(prev || {}).forEach(([name, loc]) => {
    if (loc.sheet !== forSheet) next[name] = loc;
  });
  freshTeams.forEach((team) => {
    team.members.forEach((m) => {
      next[m.name] = { sheet: forSheet, team: team.name, teamKey: team.key, slot: m.slot };
    });
  });
  return next;
}

export default function TeamGrid({ sheetTitle, initialTeams, sectionLabels, nameToClass, gearMap, groupAssignments: initialGroupAssignments, importableTeams, isAdmin }) {
  const [teams, setTeams] = useState(initialTeams || []);
  const [groupAssignments, setGroupAssignments] = useState(initialGroupAssignments || {});
  const [editing, setEditing] = useState(null); // { team, slot, name, gear }
  const [nameQuery, setNameQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [importingFor, setImportingFor] = useState(null); // team object being imported into
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [findQuery, setFindQuery] = useState('');
  const [findFocused, setFindFocused] = useState(false);
  const [highlightKey, setHighlightKey] = useState(null);
  const { confirm, modal } = useConfirm();
  const { toast, toastUI } = useToast();

  const names = useMemo(() => Object.keys(nameToClass || {}), [nameToClass]);

  useEffect(() => {
    if (!highlightKey) return;
    const el = document.getElementById(`member-${highlightKey}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightKey]);

  const findSuggestions = findFocused && findQuery.trim()
    ? names.filter((n) => n.toLowerCase().includes(findQuery.trim().toLowerCase())).slice(0, 8)
    : [];

  function runFind(rawQuery) {
    const q = rawQuery.trim().toLowerCase();
    if (!q) return;
    let found = null;
    for (const team of teams) {
      for (const m of team.members) {
        if (m.name.toLowerCase() === q) { found = { team, slot: m.slot }; break; }
      }
      if (found) break;
    }
    if (!found) {
      for (const team of teams) {
        const m = team.members.find((mm) => mm.name.toLowerCase().includes(q));
        if (m) { found = { team, slot: m.slot }; break; }
      }
    }
    if (!found) {
      toast('ไม่พบชื่อนี้ในหน้านี้', 'error');
      return;
    }
    setHighlightKey(`${found.team.key.replace(':', '-')}-${found.slot}`);
  }

  function findMe(e) {
    e.preventDefault();
    runFind(findQuery);
  }

  function pickFindSuggestion(n) {
    setFindQuery(n);
    setFindFocused(false);
    runFind(n);
  }

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

  // Names free to pick (no ตี้/slot yet, within this sheet's duplicate
  // group) sort above ones already assigned elsewhere; GEAR (highest
  // first) breaks ties within each of those two groups.
  const matches = nameQuery.trim() || classFilter
    ? names
        .filter((n) => !classFilter || nameToClass[n] === classFilter)
        .filter((n) => !nameQuery.trim() || n.toLowerCase().includes(nameQuery.trim().toLowerCase()))
        .sort((a, b) => {
          const aConflict = conflictFor(a) ? 1 : 0;
          const bConflict = conflictFor(b) ? 1 : 0;
          if (aConflict !== bConflict) return aConflict - bConflict;
          return (gearMap?.[b] ?? -1) - (gearMap?.[a] ?? -1);
        })
        .slice(0, 30)
    : [];

  function openEdit(team, slot, member) {
    setEditing({ team: team.name, teamKey: team.key, slot, name: member?.name || '', gear: member?.gear ?? '' });
    setNameQuery('');
    setClassFilter('');
    setError('');
  }

  // Where `n` is already assigned within this sheet's duplicate-check group
  // (Main-War+SUB-WAR share one pool; Polarity and Castle each have their
  // own) — null if free, or if the only "conflict" is the exact slot
  // currently being edited (so re-picking yourself isn't blocked). Compared
  // by teamKey (row+col), not team name — a sheet can have more than one
  // team named e.g. "TEAM1" (Polarity's star/normal rooms both do).
  function conflictFor(n) {
    const loc = groupAssignments?.[n];
    if (!loc || !editing) return loc || null;
    if (loc.sheet === sheetTitle && loc.teamKey === editing.teamKey && loc.slot === editing.slot) return null;
    return loc;
  }

  // Picking a known name pulls in their GEAR from the shared sheet if
  // there's already a value on record, so re-assigning someone doesn't
  // require re-typing a number that's already known.
  function pickName(n) {
    if (conflictFor(n)) return;
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
      const data = await callApi({ sheet: sheetTitle, team: editing.team, teamKey: editing.teamKey, slot: editing.slot, name: editing.name, gear: editing.gear });
      setTeams(data.teams);
      setGroupAssignments((prev) => mergeGroupAssignments(prev, data.teams, sheetTitle));
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
      message: `ต้องการลบ "${memberName}" ออกจาก ${team.name} ช่องที่ ${slot} ใช่หรือไม่?`,
      confirmText: 'ลบ',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const data = await callApi({ sheet: sheetTitle, team: team.name, teamKey: team.key, slot, name: '', gear: '' });
      setTeams(data.teams);
      setGroupAssignments((prev) => mergeGroupAssignments(prev, data.teams, sheetTitle));
      toast(`ลบ "${memberName}" ออกจากทีมแล้ว`);
    } finally {
      setBusy(false);
    }
  }

  async function clearTeamMembers(team) {
    if (!team.members.length) return;
    const ok = await confirm({
      title: 'ล้างสมาชิกทั้งทีม',
      message: `ต้องการลบสมาชิกทั้งหมดใน ${team.name} (${team.members.length} คน) ใช่หรือไม่? เพื่อใส่รายชื่อใหม่`,
      confirmText: 'ล้างทีม',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const data = await callApi({ action: 'clear', sheet: sheetTitle, teamKey: team.key });
      setTeams(data.teams);
      setGroupAssignments((prev) => mergeGroupAssignments(prev, data.teams, sheetTitle));
      toast(`ล้างสมาชิกทีม ${team.name} แล้ว`);
    } catch (e) {
      toast('ล้างทีมไม่สำเร็จ: ' + e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function doImport(sourceTeam) {
    if (!importingFor) return;
    setBusy(true);
    try {
      const data = await callApi({
        action: 'import',
        sheet: sheetTitle,
        teamKey: importingFor.key,
        sourceSheet: sourceTeam.sheet,
        sourceTeamKey: sourceTeam.teamKey,
      });
      setTeams(data.teams);
      setGroupAssignments((prev) => mergeGroupAssignments(prev, data.teams, sheetTitle));
      setImportingFor(null);
      if (data.skipped?.length) {
        const names = data.skipped.map((s) => s.name).join(', ');
        toast(`นำเข้าทีมแล้ว (ข้าม ${names} — ซ้ำในชีทนี้อยู่แล้ว)`);
      } else {
        toast(`นำเข้าทีม ${sourceTeam.sheet} ${sourceTeam.name} แล้ว`);
      }
    } catch (e) {
      toast('นำเข้าไม่สำเร็จ: ' + e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {modal}
      {toastUI}

      <form className="find-me-bar" onSubmit={findMe}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            className="search-input"
            value={findQuery}
            onChange={(e) => setFindQuery(e.target.value)}
            onFocus={() => setFindFocused(true)}
            onBlur={() => setTimeout(() => setFindFocused(false), 150)}
            placeholder="ค้นหาชื่อของตัวเอง..."
          />
          {findSuggestions.length > 0 && (
            <div className="search-suggestions">
              {findSuggestions.map((n) => (
                <div key={n} className="suggestion-item" onMouseDown={() => pickFindSuggestion(n)}>
                  <span>{n}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button type="submit" className="sync-btn">ค้นหา</button>
      </form>

      {sections.map((sectionGroup) => (
        <div className="team-section" key={sectionGroup.label || '_'}>
          {sectionGroup.label && <h2 className="section-title">{sectionGroup.label}</h2>}
          {sectionGroup.teams.length === 0 ? (
            <p className="subtitle">ยังไม่มีทีมในส่วนนี้</p>
          ) : (
          <div className="team-grid">
            {sectionGroup.teams.map((team) => (
              <div className="team-card" key={team.key}>
                <div className="team-head">
                  <div>
                    <div>{team.name}</div>
                    {team.total !== null && (
                      <div className="team-avg">รวม {formatNum(team.total)} · เฉลี่ย {formatNum(team.average)}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="team-size">{team.members.length}/{team.slotCount}</span>
                    {isAdmin && importableTeams && (
                      <button
                        type="button"
                        className="icon-btn"
                        title="นำเข้าทั้งทีมจากทีมหลัก"
                        onClick={() => setImportingFor(team)}
                      >⇩</button>
                    )}
                    {isAdmin && team.members.length > 0 && (
                      <button
                        type="button"
                        className="icon-btn del"
                        title="ล้างสมาชิกทั้งทีม"
                        onClick={() => clearTeamMembers(team)}
                      >🗑</button>
                    )}
                  </div>
                </div>
                <ul className="team-members">
                  {Array.from({ length: team.slotCount }, (_, i) => {
                    const slot = i + 1;
                    const m = team.members.find((mm) => mm.slot === slot);
                    const memberId = `${team.key.replace(':', '-')}-${slot}`;
                    return (
                      <li
                        className={`team-member${m ? '' : ' empty'}${highlightKey === memberId ? ' highlighted' : ''}`}
                        id={`member-${memberId}`}
                        key={slot}
                      >
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
                            <button type="button" className="icon-btn" onClick={() => openEdit(team, slot, m)} title={m ? 'แก้ไข' : 'เพิ่มชื่อ'}>✎</button>
                            {m && <button type="button" className="icon-btn del" onClick={() => removeMember(team, slot, m.name)} title="ลบ">✕</button>}
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
                  {matches.map((n) => {
                    const conflict = conflictFor(n);
                    return (
                      <div
                        key={n}
                        className={`suggestion-item${conflict ? ' disabled' : ''}`}
                        onClick={() => pickName(n)}
                        title={conflict ? `ถูกจัดอยู่แล้วที่ ${conflict.sheet} · ${conflict.team} · ช่องที่ ${conflict.slot}` : undefined}
                      >
                        <span>
                          {n}
                          {conflict && <span className="suggestion-conflict"> · {conflict.sheet} {conflict.team}</span>}
                        </span>
                        {gearMap?.[n] !== undefined && <span className="gear">{formatNum(gearMap[n])}</span>}
                      </div>
                    );
                  })}
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

      {importingFor && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setImportingFor(null); }}>
          <div className="modal-box">
            <div className="modal-title">นำเข้าทั้งทีม — {importingFor.name}</div>
            <p className="modal-message">
              เลือกทีมจากหน้าทีมหลัก (Main-War / SUB-WAR) เพื่อคัดลอกสมาชิกทั้ง 5 ช่องมาทับที่นี่
            </p>
            <div className="search-suggestions" style={{ position: 'static', maxHeight: 320, marginBottom: 16 }}>
              {(importableTeams || []).map((t) => (
                <div
                  key={`${t.sheet}:${t.teamKey}`}
                  className="suggestion-item"
                  onClick={() => doImport(t)}
                >
                  <span>
                    {t.sheet} · {t.name}
                    <span className="suggestion-conflict"> · {t.members.map((m) => m.name).join(', ') || 'ว่าง'}</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="modal-btn modal-btn-cancel" onClick={() => setImportingFor(null)} disabled={busy}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
