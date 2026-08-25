'use client';
import { useMemo, useState } from 'react';
import { useConfirm } from './useConfirm';

function inputValueToLabel(v) {
  const [y, m, d] = v.split('-').map(Number);
  return `${m}/${d}/${y}`;
}
function labelToInputValue(label) {
  const [m, d, y] = label.split('/').map(Number);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function todayLabel() {
  const now = new Date();
  return `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
}

export default function AttendanceBoard({ initialData, today }) {
  const [names, setNames] = useState(initialData.names);
  const [dates, setDates] = useState(initialData.dates);
  const [currentDate, setCurrentDate] = useState(initialData.date || today);
  const [statuses, setStatuses] = useState(initialData.attendance || {});
  const [savedSnapshot, setSavedSnapshot] = useState(initialData.attendance || {});
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(`กำลังดูวันที่ ${initialData.date || today}`);
  const [error, setError] = useState('');
  const { confirm, modal } = useConfirm();

  const isDirty = JSON.stringify(statuses) !== JSON.stringify(savedSnapshot);

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => names.filter((n) => !q || n.toLowerCase().includes(q)), [names, q]);
  const summary = useMemo(() => {
    let present = 0, absent = 0, unmarked = 0;
    visible.forEach((n) => {
      const s = statuses[n];
      if (s === 'present') present++;
      else if (s === 'absent') absent++;
      else unmarked++;
    });
    return { present, absent, unmarked, total: visible.length };
  }, [visible, statuses]);

  async function fetchDate(dateLabel) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/attendance?date=${encodeURIComponent(dateLabel)}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'unknown error');
      setNames(data.names);
      setDates(data.dates);
      setCurrentDate(data.date || dateLabel);
      setStatuses(data.attendance);
      setSavedSnapshot(data.attendance);
      setNote(`กำลังดูวันที่ ${data.date || dateLabel}`);
      return true;
    } catch (e) {
      setError('โหลดข้อมูลไม่สำเร็จ: ' + e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function switchToDate(label) {
    if (isDirty) {
      const ok = await confirm({
        title: 'ยังไม่ได้บันทึก',
        message: 'การเปลี่ยนวันที่จะทิ้งการเช็คชื่อที่ยังไม่ได้บันทึกของวันนี้ ดำเนินการต่อหรือไม่?',
        confirmText: 'เปลี่ยนวันที่',
        danger: true,
      });
      if (!ok) return;
    }
    await fetchDate(label);
  }

  function toggle(name, wantStatus) {
    setStatuses((prev) => {
      const current = prev[name] || null;
      return { ...prev, [name]: current === wantStatus ? null : wantStatus };
    });
  }

  function bulkSet(status) {
    setStatuses((prev) => {
      const next = { ...prev };
      visible.forEach((n) => { next[n] = status; });
      return next;
    });
  }

  async function handleSave() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: currentDate, records: statuses }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'unknown error');
      setNames(data.names);
      setDates(data.dates);
      setStatuses(data.attendance);
      setSavedSnapshot(data.attendance);
      setNote(`บันทึกวันที่ ${currentDate} เรียบร้อย`);
    } catch (e) {
      setError('บันทึกไม่สำเร็จ: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {modal}

      <div className="date-panel">
        <label htmlFor="dateInput">วันที่</label>
        <input
          id="dateInput"
          type="date"
          value={labelToInputValue(currentDate || today)}
          onChange={(e) => switchToDate(inputValueToLabel(e.target.value))}
        />
        <button type="button" className="sync-btn" onClick={() => switchToDate(todayLabel())}>วันนี้</button>
        <div className="date-chips">
          {dates.map((d) => (
            <button
              type="button"
              key={d}
              className={`date-chip${d === currentDate ? ' active' : ''}`}
              onClick={() => switchToDate(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="summary-bar">
        <div className="summary-count">
          <b>{summary.present}</b> มา · <b>{summary.absent}</b> ขาด · <b>{summary.unmarked}</b> ยังไม่เช็ค (จาก <b>{summary.total}</b> คน)
        </div>
        <div className="bulk-actions">
          <button type="button" className="sync-btn" onClick={() => bulkSet('present')}>มาทั้งหมด</button>
          <button type="button" className="sync-btn" onClick={() => bulkSet('absent')}>ขาดทั้งหมด</button>
          <button type="button" className="sync-btn" onClick={() => bulkSet(null)}>ล้างเครื่องหมาย</button>
        </div>
      </div>

      <input
        className="search-input"
        style={{ maxWidth: 340, marginBottom: 16 }}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ค้นหาชื่อผู้เล่น..."
        autoComplete="off"
      />

      <div className="att-grid">
        {visible.map((name) => {
          const s = statuses[name] || null;
          return (
            <div className={`att-chip${s === 'present' ? ' present' : s === 'absent' ? ' absent' : ''}`} key={name}>
              <span className="att-name">{name}</span>
              <span className="att-boxes">
                <button
                  type="button"
                  className={`att-box check${s === 'present' ? ' active' : ''}`}
                  onClick={() => toggle(name, 'present')}
                  title="มา"
                >✓</button>
                <button
                  type="button"
                  className={`att-box cross${s === 'absent' ? ' active' : ''}`}
                  onClick={() => toggle(name, 'absent')}
                  title="ขาด"
                >✕</button>
              </span>
            </div>
          );
        })}
      </div>

      {error && <div className="sync-error">{error}</div>}

      <div className="save-bar">
        <button type="button" className="save-btn" onClick={handleSave} disabled={busy}>
          {busy ? 'กำลังบันทึก...' : 'บันทึกการเช็คชื่อ'}
        </button>
      </div>

      <footer id="storage-note">{note}</footer>
    </>
  );
}
