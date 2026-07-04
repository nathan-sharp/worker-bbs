import React, { useState, useEffect } from 'react';
import { Board } from '../types';
import { useAdmin } from '../context/AdminContext';

interface AdminDashboardProps {
  onBoardCreated: () => void;
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBoardCreated, onClose }) => {
  const { adminKey, logout } = useAdmin();
  const [stats, setStats] = useState({ boards: 0, threads: 0, posts: 0, active_bans: 0 });
  const [bans, setBans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Retention Policy State
  const [globalHours, setGlobalHours] = useState(720);
  const [boardOverrides, setBoardOverrides] = useState<Record<string, number>>({});
  const [savingRetention, setSavingRetention] = useState(false);
  const [pruning, setPruning] = useState(false);

  // New Board form
  const [newId, setNewId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const headers = { 'X-Admin-Key': adminKey || '' };
      const statsRes = await fetch('/api/admin/stats', { headers });
      const statsData = (await statsRes.json()) as any;
      if (statsData.success) {
        setStats(statsData.stats);
      }

      const bansRes = await fetch('/api/admin/bans', { headers });
      const bansData = (await bansRes.json()) as any;
      if (bansData.success) {
        setBans(bansData.bans || []);
      }

      const retRes = await fetch('/api/admin/retention', { headers });
      const retData = (await retRes.json()) as any;
      if (retData.success && retData.policy) {
        setGlobalHours(retData.policy.global_hours ?? 720);
        setBoardOverrides(retData.policy.board_overrides || {});
      }
    } catch {
      console.error('Failed to fetch admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [adminKey]);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId || !newTitle) return;

    setCreating(true);
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey || '',
        },
        body: JSON.stringify({
          id: newId,
          title: newTitle,
          subtitle: newSubtitle,
          description: newDesc,
        }),
      });

      const data = (await res.json()) as any;
      if (data.success) {
        alert(`Board /${data.board.id}/ created!`);
        setNewId('');
        setNewTitle('');
        setNewSubtitle('');
        setNewDesc('');
        onBoardCreated();
        fetchAdminData();
      } else {
        alert(data.error || 'Failed to create board');
      }
    } catch {
      alert('Error creating board');
    } finally {
      setCreating(false);
    }
  };

  const handleLiftBan = async (banId: number) => {
    if (!confirm('Lift this ban?')) return;
    try {
      await fetch(`/api/admin/bans/${banId}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Key': adminKey || '' },
      });
      fetchAdminData();
    } catch {
      alert('Failed to lift ban');
    }
  };

  const handleSaveRetention = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRetention(true);
    try {
      const res = await fetch('/api/admin/retention', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey || '',
        },
        body: JSON.stringify({
          global_hours: globalHours,
          board_overrides: boardOverrides,
        }),
      });
      const data = (await res.json()) as any;
      if (data.success) {
        alert('Retention policy saved! Post cleanup will run automatically on schedule and during site activity.');
        fetchAdminData();
      } else {
        alert(data.error || 'Failed to save retention policy');
      }
    } catch {
      alert('Error saving retention policy');
    } finally {
      setSavingRetention(false);
    }
  };

  const handleRunPrune = async () => {
    if (!confirm('Are you sure you want to run the retention pruning sweep now? This will permanently delete posts older than the configured retention thresholds.')) return;
    setPruning(true);
    try {
      const res = await fetch('/api/admin/prune', {
        method: 'POST',
        headers: { 'X-Admin-Key': adminKey || '' },
      });
      const data = (await res.json()) as any;
      if (data.success && data.result) {
        alert(`Pruning sweep complete!\n\nDeleted Threads: ${data.result.threads_deleted}\nDeleted Reply Posts: ${data.result.posts_deleted}`);
        fetchAdminData();
      } else {
        alert(data.error || 'Failed to execute pruning sweep');
      }
    } catch {
      alert('Error executing pruning sweep');
    } finally {
      setPruning(false);
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h2 style={{ fontSize: '24px', fontWeight: 700 }}>WorkerBBS Administration Panel</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchAdminData}>Refresh Stats</button>
          <button onClick={onClose} style={{ fontWeight: 700 }}>Return to Site</button>
          <button onClick={logout} style={{ background: '#d9534f', color: '#fff' }}>Logout</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading Admin Dashboard...</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-val">{stats.boards}</div>
              <div className="stat-label">Total Boards</div>
            </div>
            <div className="stat-card">
              <div className="stat-val">{stats.threads}</div>
              <div className="stat-label">Total Threads</div>
            </div>
            <div className="stat-card">
              <div className="stat-val">{stats.posts}</div>
              <div className="stat-label">Total Posts</div>
            </div>
            <div className="stat-card">
              <div className="stat-val">{stats.active_bans}</div>
              <div className="stat-label">Active Bans</div>
            </div>
          </div>

          <div className="admin-section">
            <h3>Create a New Board</h3>
            <form onSubmit={handleCreateBoard} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
              <div className="form-group">
                <label>Board Slug ID * (e.g. 'anime' or 'games')</label>
                <input
                  type="text"
                  placeholder="slug (no slashes)"
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Board Title * (e.g. 'Anime & Manga')</label>
                <input
                  type="text"
                  placeholder="Title..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Subtitle (optional)</label>
                <input
                  type="text"
                  placeholder="Short tagline..."
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <input
                  type="text"
                  placeholder="Detailed rules or description..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>
              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" disabled={creating} style={{ fontWeight: 700, padding: '8px 20px' }}>
                  {creating ? 'Creating Board...' : '+ Create Board'}
                </button>
              </div>
            </form>
          </div>

          <div className="admin-section" style={{ borderLeft: '4px solid #f0ad4e' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0 }}>⏱️ Automated Post Retention & Pruning Policy</h3>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Configure automated expiration for non-sticky threads and reply posts. Sticky threads are always preserved.
                </div>
              </div>
              <button
                type="button"
                onClick={handleRunPrune}
                disabled={pruning}
                style={{
                  background: '#f0ad4e',
                  color: '#fff',
                  fontWeight: 700,
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {pruning ? '🧹 Sweeping...' : '🧹 Run Prune Sweep Now'}
              </button>
            </div>
            <form onSubmit={handleSaveRetention} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label style={{ fontWeight: 700 }}>Global Site-Wide Retention Policy</label>
                <select
                  value={globalHours}
                  onChange={(e) => setGlobalHours(parseInt(e.target.value, 10) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-color)',
                    fontSize: '14px'
                  }}
                >
                  <option value={0}>♾️ Never Delete (Keep All Posts Forever)</option>
                  <option value={6}>⌛ Auto-Delete Posts Older than 6 Hours</option>
                  <option value={12}>⌛ Auto-Delete Posts Older than 12 Hours</option>
                  <option value={24}>⌛ Auto-Delete Posts Older than 24 Hours (1 Day)</option>
                  <option value={72}>⌛ Auto-Delete Posts Older than 3 Days</option>
                  <option value={168}>⌛ Auto-Delete Posts Older than 7 Days (1 Week)</option>
                  <option value={720}>⌛ Auto-Delete Posts Older than 30 Days (1 Month)</option>
                </select>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Applies globally to all boards unless overridden below. Expired posts are automatically pruned via Cloudflare Worker Cron Triggers (hourly) and background activity sweeps.
                </div>
              </div>
              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={savingRetention}
                  style={{ fontWeight: 700, padding: '8px 20px', background: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  {savingRetention ? 'Saving Policy...' : '💾 Save Retention Policy'}
                </button>
              </div>
            </form>
          </div>

          <div className="admin-section">
            <h3>Active Ban List ({bans.length})</h3>
            {bans.length === 0 ? (
              <div style={{ padding: '15px', color: 'var(--text-muted)' }}>No active bans recorded.</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>IP Hash</th>
                    <th>Board</th>
                    <th>Reason</th>
                    <th>Expires</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bans.map((b) => (
                    <tr key={b.id}>
                      <td>#{b.id}</td>
                      <td style={{ fontFamily: 'monospace' }}>{b.ip_hash.slice(0, 12)}...</td>
                      <td>{b.board_id ? `/${b.board_id}/` : 'Global'}</td>
                      <td>{b.reason}</td>
                      <td>{new Date(b.expires_at).toLocaleString()}</td>
                      <td>
                        <button
                          onClick={() => handleLiftBan(b.id)}
                          style={{ padding: '2px 8px', fontSize: '11px', background: '#d9534f', color: '#fff' }}
                        >
                          Lift Ban
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
};
