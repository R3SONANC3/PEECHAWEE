'use client';
import { useMemo, useState } from 'react';
import { useConfirm } from './useConfirm';

async function callApi(body) {
  const res = await fetch('/api/roster', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'unknown error');
  return data.roster;
}

export default function RosterBoard({ initialRoster, classes }) {
  const [roster, setRoster] = useState(initialRoster);
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [cls, setCls] = useState(classes[0].key);
  const [busy, setBusy] = useState(false);
  const [formMsg, setFormMsg] = useState('');
  const [editing, setEditing] = useState(null); // { cls, name }
  const [editName, setEditName] = useState('');
  const [editCls, setEditCls] = useState('');
  const { confirm, modal } = useConfirm();

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
      const updated = await callApi({ action: 'add', name: trimmed, cls });
      setRoster(updated);
      setName('');
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
      const updated = await callApi({ action: 'delete', name: memberName, cls: clsKey });
      setRoster(updated);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(clsKey, memberName) {
    setEditing({ cls: clsKey, name: memberName });
    setEditName(memberName);
    setEditCls(clsKey);
  }

  async function saveEdit() {
    if (!editing) return;
    const trimmed = editName.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const updated = await callApi({
        action: 'edit',
        oldName: editing.name,
        oldCls: editing.cls,
        newName: trimmed,
        newCls: editCls,
      });
      setRoster(updated);
      setEditing(null);
    } finally {
      setBusy(false);
    }
  }

  const q = query.trim().toLowerCase();

  return (
    <>
      {modal}

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
              <span className="legend-dot" style={{ background: c.color }} />
              <span className="legend-name">{c.key}</span>
              <span className="legend-th">{c.th}</span>
              <span className="legend-count">{counts[c.key]}</span>
            </div>
          ))}
        </div>
      </section>

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
        <button type="submit" className="btn btn-add" disabled={busy}>
          {busy ? 'กำลังเพิ่ม...' : '+ เพิ่มสมาชิก'}
        </button>
        <div className="form-msg">{formMsg}</div>
      </form>

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
            .sort((a, b) => a.localeCompare(b, 'th'));

          return (
            <div className="class-card" key={c.key}>
              <div className="class-head">
                <span className="class-swatch" style={{ background: c.color }} />
                <div className="class-names">
                  <span className="class-en">{c.key}</span>
                  <span className="class-th">{c.th}</span>
                </div>
                <span className="class-count">{members.length}</span>
              </div>
              <ul className="class-list">
                {members.length === 0 && <li className="empty-note">{q ? 'ไม่พบผู้เล่น' : 'ยังไม่มีสมาชิก'}</li>}
                {members.map((m) => {
                  const isEditing = editing && editing.cls === c.key && editing.name === m;
                  if (isEditing) {
                    return (
                      <li className="edit-row" key={m}>
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                        <select value={editCls} onChange={(e) => setEditCls(e.target.value)}>
                          {classes.map((cc) => <option key={cc.key} value={cc.key}>{cc.key}</option>)}
                        </select>
                        <button type="button" className="icon-btn" onClick={saveEdit} title="บันทึก">✓</button>
                        <button type="button" className="icon-btn del" onClick={() => setEditing(null)} title="ยกเลิก">✕</button>
                      </li>
                    );
                  }
                  return (
                    <li className="member-row" key={m}>
                      <span className="member-name" style={{ color: c.color }}>{m}</span>
                      <span className="row-actions">
                        <button type="button" className="icon-btn" onClick={() => startEdit(c.key, m)} title="แก้ไข">✎</button>
                        <button type="button" className="icon-btn del" onClick={() => handleDelete(c.key, m)} title="ลบ">✕</button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </>
  );
}
