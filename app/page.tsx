'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import styles from './page.module.css';

const GRADES = ['K', '1', '2', '3', '4', '5'] as const;
const CLASSES = ['A', 'B', 'C', 'D'] as const;
const GRADE_LABELS: Record<string, string> = {
  K: 'Kinder', '1': '1st Grade', '2': '2nd Grade',
  '3': '3rd Grade', '4': '4th Grade', '5': '5th Grade',
};

type Grade = typeof GRADES[number];

interface Booth {
  id: string;
  grade: Grade;
  defaultName: string;
}

const BOOTHS: Booth[] = GRADES.flatMap(g =>
  CLASSES
    .filter(c => !(g === '3' && c === 'D'))
    .map(c => ({
      id: `${g}-${c}`,
      grade: g,
      defaultName: `${GRADE_LABELS[g]} · Class ${c}`,
    }))
);

type Counts = Record<string, number>;
type Names = Record<string, string>;
type View = 'booth' | 'organizer';

export default function FallFest() {
  const [counts, setCounts] = useState<Counts>(() =>
    Object.fromEntries(BOOTHS.map(b => [b.id, 0]))
  );
  const [names, setNames] = useState<Names>({});
  const [currentGrade, setCurrentGrade] = useState<Grade | 'all'>('all');
  const [view, setView] = useState<View>('booth');
  const [status, setStatus] = useState<'loading' | 'live' | 'error'>('loading');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const dirtyRef = useRef<Set<string>>(new Set()); // booths with in-flight writes

  const getDisplayName = (booth: Booth) => names[booth.id] || booth.defaultName;

  // Poll every 2 seconds — skip booths with pending writes
  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/tickets');
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      // Only update counts for booths that aren't being actively tapped
      setCounts(prev => {
        const next = { ...prev };
        for (const id of Object.keys(data.counts)) {
          if (!dirtyRef.current.has(id)) {
            next[id] = data.counts[id];
          }
        }
        return next;
      });
      setNames(data.names || {});
      setStatus('live');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 2000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  const updateCount = (boothId: string, delta: number) => {
    dirtyRef.current.add(boothId); // mark as in-flight
    setCounts(prev => {
      const next = { ...prev, [boothId]: Math.max(0, (prev[boothId] || 0) + delta) };
      clearTimeout(pendingRef.current[boothId]);
      pendingRef.current[boothId] = setTimeout(() => {
        fetch('/api/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ boothId, count: next[boothId] }),
        })
          .catch(console.error)
          .finally(() => {
            dirtyRef.current.delete(boothId); // clear after write completes
          });
      }, 400);
      return next;
    });
  };

  const startEdit = (booth: Booth) => {
    setEditingId(booth.id);
    setEditValue(names[booth.id] || '');
  };

  const commitEdit = async (boothId: string) => {
    const trimmed = editValue.trim();
    setNames(prev => {
      const next = { ...prev };
      if (trimmed) next[boothId] = trimmed;
      else delete next[boothId];
      return next;
    });
    setEditingId(null);
    await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boothId, name: trimmed }),
    }).catch(console.error);
  };

  const handleKeyDown = (e: React.KeyboardEvent, boothId: string) => {
    if (e.key === 'Enter') commitEdit(boothId);
    if (e.key === 'Escape') setEditingId(null);
  };

  const totalTickets = BOOTHS.reduce((s, b) => s + (counts[b.id] || 0), 0);
  const visibleBooths = currentGrade === 'all'
    ? BOOTHS
    : BOOTHS.filter(b => b.grade === currentGrade);

  return (
    <div className={styles.root}>
      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.siteTitle}>🎪 Fall Fest</div>
          <div className={styles.totalPill}>🎫 {totalTickets} tickets</div>
        </div>
        <nav className={styles.tabs}>
          {(['all', ...GRADES] as const).map(g => (
            <button
              key={g}
              className={`${styles.tabBtn} ${currentGrade === g ? styles.tabActive : ''}`}
              onClick={() => setCurrentGrade(g)}
            >
              {g === 'all' ? 'All' : g === 'K' ? 'Kinder' : `${g}th`}
            </button>
          ))}
        </nav>
      </header>

      <main className={styles.main}>
        {status === 'loading' && <p className={styles.statusMsg}>Connecting…</p>}
        {status === 'error' && <p className={styles.statusError}>⚠️ Connection issue — retrying…</p>}

        {/* VIEW TOGGLE */}
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${view === 'booth' ? styles.viewActive : ''}`}
            onClick={() => setView('booth')}
          >🏪 Booth View</button>
          <button
            className={`${styles.viewBtn} ${view === 'organizer' ? styles.viewActive : ''}`}
            onClick={() => setView('organizer')}
          >📊 Organizer</button>
        </div>

        {/* BOOTH VIEW */}
        {view === 'booth' && (
          <div className={styles.boothGrid}>
            {visibleBooths.map(booth => (
              <div key={booth.id} className={styles.boothCard}>

                {/* NAME ROW */}
                <div className={styles.nameRow}>
                  {editingId === booth.id ? (
                    <input
                      ref={editInputRef}
                      className={styles.nameInput}
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={() => commitEdit(booth.id)}
                      onKeyDown={e => handleKeyDown(e, booth.id)}
                      placeholder={booth.defaultName}
                      maxLength={40}
                    />
                  ) : (
                    <>
                      <span className={styles.boothName}>{getDisplayName(booth)}</span>
                      <button
                        className={styles.editBtn}
                        onClick={() => startEdit(booth)}
                        aria-label="Rename booth"
                        title="Rename"
                      >✏️</button>
                    </>
                  )}
                </div>

                <div>
                  <div className={styles.ticketCount}>{counts[booth.id] || 0}</div>
                  <div className={styles.ticketLabel}>tickets collected</div>
                </div>
                <div className={styles.counterBtns}>
                  <button
                    className={`${styles.counterBtn} ${styles.btnMinus}`}
                    onClick={() => updateCount(booth.id, -1)}
                    aria-label="Remove ticket"
                  >−</button>
                  <button
                    className={`${styles.counterBtn} ${styles.btnPlus}`}
                    onClick={() => updateCount(booth.id, 1)}
                    aria-label="Add ticket"
                  >+</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ORGANIZER VIEW */}
        {view === 'organizer' && (
          <>
            <p className={styles.sectionLabel}>Totals by Grade</p>
            <div className={styles.gradeSummaries}>
              {GRADES.map(g => {
                const total = BOOTHS.filter(b => b.grade === g)
                  .reduce((s, b) => s + (counts[b.id] || 0), 0);
                return (
                  <div key={g} className={styles.gradeSummaryCard}>
                    <div className={styles.gsLabel}>{GRADE_LABELS[g]}</div>
                    <div className={styles.gsCount}>{total}</div>
                    <div className={styles.gsSub}>tickets</div>
                  </div>
                );
              })}
            </div>

            <p className={styles.sectionLabel}>All Booths</p>
            <div className={styles.tableWrap}>
              <table className={styles.orgTable}>
                <thead>
                  <tr>
                    <th>Booth</th>
                    <th>Grade</th>
                    <th>Tickets</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleBooths.map(b => (
                    <tr key={b.id}>
                      <td>{getDisplayName(b)}</td>
                      <td>{GRADE_LABELS[b.grade]}</td>
                      <td>
                        <span className={`${styles.badge} ${counts[b.id] ? styles.badgeHigh : styles.badgeZero}`}>
                          {counts[b.id] || 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={styles.grandTotalRow}>
                    <td>Total</td>
                    <td></td>
                    <td>{visibleBooths.reduce((s, b) => s + (counts[b.id] || 0), 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
