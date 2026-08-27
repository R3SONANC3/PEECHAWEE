'use client';
import { useMemo, useState } from 'react';
import { useConfirm } from './useConfirm';
import { useToast } from './useToast';
import ClassIcon from './ClassIcon';
import { formatNum } from '@/lib/format';

async function callApi(body) {
  const res = await fetch('/api/roster', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'unknown error');
  return data;
}

export default function RosterBoard({ initialRoster, classes, initialGearMap, isAdmin }) {
  const [roster, setRoster] = useState(initialRoster);
  const [gearMap, setGearMap] = useState(initialGearMap || {});
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [cls, setCls] = useState(classes[0].key);
  const [gear, setGear] = useState('');
  const [busy, setBusy] = useState(false);
  const [formMsg, setFormMsg] = useState('');
  const [editing, setEditing] = useState(null); // { cls, name }
  const [editName, setEditName] = useState('');
  const [editCls, setEditCls] = useState('');
  const [editGear, setEditGear] = useState('');
  const [classPickerFor, setClassPickerFor] = useState(null); // { cls, name }
  const { confirm, modal } = useConfirm();
  const { toast, toastUI } = useToast();

  const counts = useMemo(() => {
    const c = {};
    classes.forEach((cl) => { c[cl.key] = roster[cl.key]?.length || 0; });
    return c;
  }, [roster, classes]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  async function handleAdd(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setFormMsg('กรุณากรอกชื่อผู้เล่น'); return; }
    setFormMsg('');
    setBusy(true);
    try {
      const data = await callApi({ action: 'add', name: trimmed, cls, gear });
      setRoster(data.roster);
      setGearMap(data.gearMap);
      setName('');
      setGear('');
      toast(`เพิ่ม "${trimmed}" แล้ว`);
    } catch (err) {
      setFormMsg('เพิ่มไม่สำเร็จ: ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(clsKey, memberName) {
    const ok = await confirm({
      title: 'ลบสมาชิก',
      message: `ต้องการลบ "${memberName}" ออกจากรายชื่อใช่หรือไม่?`,
      confirmText: 'ลบ',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const data = await callApi({ action: 'delete', name: memberName, cls: clsKey });
      setRoster(data.roster);
      toast(`ลบ "${memberName}" แล้ว`);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(clsKey, memberName) {
    setEditing({ cls: clsKey, name: memberName });
    setEditName(memberName);
    setEditCls(clsKey);
    setEditGear(gearMap?.[memberName] ?? '');
  }

  async function saveEdit() {
    if (!editing) return;
    const trimmed = editName.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const data = await callApi({
        action: 'edit',
        oldName: editing.name,
        oldCls: editing.cls,
        newName: trimmed,
        newCls: editCls,
        gear: editGear,
      });
      setRoster(data.roster);
      setGearMap(data.gearMap);
      setEditing(null);
      toast('บันทึกการแก้ไขแล้ว');
    } finally {
      setBusy(false);
    }
  }

  async function changeClass(oldCls, memberName, newCls) {
    setClassPickerFor(null);
    if (newCls === oldCls) return;
    setBusy(true);
    try {
      const data = await callApi({ action: 'edit', oldName: memberName, oldCls, newName: memberName, newCls });
      setRoster(data.roster);
      toast(`ย้าย "${memberName}" ไป ${newCls} แล้ว`);
    } finally {
      setBusy(false);
    }
  }

  const q = query.trim().toLowerCase();

  return (
    <>
      {modal}
      {toastUI}

      <section className="stat-panel">
        <div className="stat-bar">
          {total === 0 && <span className="stat-bar-empty" />}
          {classes.map((c) => {
            const pct = total ? (counts[c.key] / total) * 100 : 0;
            if (pct === 0) return null;
            return <span key={c.key} style={{ width: pct + '%', background: c.color }} title={`${c.key}: ${counts[c.key]}`} />;
          })}
        </div>
        <div className="stat-legend">
          <div className="stat-total"><b>{total}</b> สมาชิกทั้งหมด</div>
          {classes.map((c) => (
            <div key={c.key} className="legend-item">
              <span className="legend-icon" style={{ background: c.color }}>
                <ClassIcon icon={c.icon} size={13} />
              </span>
              <span className="legend-name">{c.key}</span>
              <span className="legend-th">{c.th}</span>
              <span className="legend-count">{counts[c.key]}</span>
            </div>
          ))}
        </div>
      </section>

      {isAdmin && (
        <>
          <div className="panel-title">เพิ่มสมาชิกใหม่</div>
          <form className="add-form" onSubmit={handleAdd}>
            <div className="field">
              <label htmlFor="nameInput">ชื่อผู้เล่น</label>
              <input id="nameInput" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น Kotoha" autoComplete="off" />
            </div>
            <div className="field">
              <label htmlFor="classInput">คลาส</label>
              <select id="classInput" value={cls} onChange={(e) => setCls(e.target.value)}>
                {classes.map((c) => <option key={c.key} value={c.key}>{c.key} · {c.th}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="gearInput">ค่าพลัง (GEAR)</label>
              <input
                id="gearInput"
                type="number"
                inputMode="numeric"
                value={gear}
                onChange={(e) => setGear(e.target.value)}
                placeholder="เช่น 21000"
                style={{ minWidth: 120 }}
              />
            </div>
            <button type="submit" className="btn btn-add" disabled={busy}>
              {busy ? 'กำลังเพิ่ม...' : '+ เพิ่มสมาชิก'}
            </button>
            <div className="form-msg">{formMsg}</div>
          </form>
        </>
      )}

      <div className="toolbar">
        <input
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาชื่อผู้เล่น..."
          autoComplete="off"
        />
      </div>

      <div className="board">
        {classes.map((c) => {
          const members = (roster[c.key] || [])
            .filter((n) => !q || n.toLowerCase().includes(q))
            .slice()
            .sort((a, b) => (gearMap?.[b] ?? -1) - (gearMap?.[a] ?? -1));
          // Cap 15 per column: split into however many equal-ish columns
          // that takes, rather than one long scroll for a big class.
          const colCount = Math.max(1, Math.ceil(members.length / 15));
          const perCol = Math.ceil(members.length / colCount) || 1;
          const memberCols = Array.from({ length: colCount }, (_, i) => members.slice(i * perCol, (i + 1) * perCol));

          function renderMember(m) {
            const isEditing = isAdmin && editing && editing.cls === c.key && editing.name === m;
            if (isEditing) {
              return (
                <li className="edit-row" key={m}>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                  <select value={editCls} onChange={(e) => setEditCls(e.target.value)}>
                    {classes.map((cc) => <option key={cc.key} value={cc.key}>{cc.key}</option>)}
                  </select>
                  <input
                    type="number"
                    inputMode="numeric"
                    className="edit-row-gear"
                    value={editGear}
                    onChange={(e) => setEditGear(e.target.value)}
                    placeholder="GEAR"
                  />
                  <button type="button" className="icon-btn" onClick={saveEdit} title="บันทึก">✓</button>
                  <button type="button" className="icon-btn del" onClick={() => setEditing(null)} title="ยกเลิก">✕</button>
                </li>
              );
            }
            const pickerOpen = isAdmin && classPickerFor?.cls === c.key && classPickerFor?.name === m;
            return (
              <li className="member-row" key={m}>
                <span className="member-name" style={{ '--cc': c.color }}>
                  {isAdmin ? (
                    <button
                      type="button"
                      className="class-badge"
                      style={{ background: c.color }}
                      title="เปลี่ยนอาชีพ"
                      onClick={() => setClassPickerFor(pickerOpen ? null : { cls: c.key, name: m })}
                    >
                      <ClassIcon icon={c.icon} size={12} />
                    </button>
                  ) : (
                    <span className="class-badge" style={{ background: c.color }}>
                      <ClassIcon icon={c.icon} size={12} />
                    </span>
                  )}
                  <span className="member-name-text">{m}</span>
                  {pickerOpen && (
                    <div className="class-filter-row class-badge-popover">
                      {classes.map((cc) => (
                        <button
                          type="button"
                          key={cc.key}
                          className={`class-filter-chip${cc.key === c.key ? ' active' : ''}`}
                          style={{ '--cc': cc.color }}
                          title={cc.key}
                          onClick={() => changeClass(c.key, m, cc.key)}
                        >
                          <ClassIcon icon={cc.icon} size={14} />
                        </button>
                      ))}
                    </div>
                  )}
                </span>
                {gearMap?.[m] !== undefined && <span className="gear">{formatNum(gearMap[m])}</span>}
                {isAdmin && (
                  <span className="row-actions">
                    <button type="button" className="icon-btn" onClick={() => startEdit(c.key, m)} title="แก้ไข">✎</button>
                    <button type="button" className="icon-btn del" onClick={() => handleDelete(c.key, m)} title="ลบ">✕</button>
                  </span>
                )}
              </li>
            );
          }

          return (
            <div className="class-card" key={c.key} style={colCount > 1 ? { gridColumn: `span ${Math.min(colCount, 3)}` } : undefined}>
              <div className="class-head">
                <span className="class-icon" style={{ background: c.color }}>
                  <ClassIcon icon={c.icon} size={16} />
                </span>
                <div className="class-names">
                  <span className="class-en">{c.key}</span>
                  <span className="class-th">{c.th}</span>
                </div>
                <span className="class-count">{members.length}</span>
              </div>
              {members.length === 0 ? (
                <ul className="class-list">
                  <li className="empty-note">{q ? 'ไม่พบผู้เล่น' : 'ยังไม่มีสมาชิก'}</li>
                </ul>
              ) : (
                <div className={colCount > 1 ? 'class-list-cols' : undefined}>
                  {memberCols.map((col, ci) => (
                    <ul className="class-list" key={ci}>
                      {col.map((m) => renderMember(m))}
                    </ul>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
