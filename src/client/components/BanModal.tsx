import React, { useState } from 'react';
import { Post } from '../types';

interface BanModalProps {
  post: Post;
  onClose: () => void;
  onSuccess: () => void;
}

export const BanModal: React.FC<BanModalProps> = ({ post, onClose, onSuccess }) => {
  const [reason, setReason] = useState('Violation of site rules');
  const [duration, setDuration] = useState('24');
  const [boardOnly, setBoardOnly] = useState(true);
  const [appendNotice, setAppendNotice] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post.ip_hash) {
      alert('Post has no IP hash recorded');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/ban', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': localStorage.getItem('bbs_admin_key') || '',
        },
        body: JSON.stringify({
          ip_hash: post.ip_hash,
          reason,
          duration_hours: duration,
          board_id: boardOnly ? post.board_id : null,
          post_id: post.id,
          append_notice: appendNotice,
        }),
      });

      const data = (await res.json()) as any;
      if (data.success) {
        alert(`User banned for ${duration} hours.`);
        onSuccess();
        onClose();
      } else {
        alert(data.error || 'Failed to ban user');
      }
    } catch {
      alert('Error executing ban');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: '16px', color: '#d9534f' }}>Ban Poster of Post No.{post.id}</h3>
        <div style={{ fontSize: '13px', marginBottom: '12px', background: 'var(--input-bg)', padding: '8px', borderRadius: '4px' }}>
          <strong>Poster Hash:</strong> {post.poster_hash || 'Unknown'}<br />
          <strong>Comment:</strong> {post.comment?.slice(0, 100) || '[No text]'}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Ban Reason *</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Duration</label>
            <select value={duration} onChange={(e) => setDuration(e.target.value)}>
              <option value="1">1 Hour (Cool off)</option>
              <option value="24">24 Hours (1 Day)</option>
              <option value="72">72 Hours (3 Days)</option>
              <option value="168">168 Hours (1 Week)</option>
              <option value="720">720 Hours (1 Month)</option>
              <option value="87600">Permanent (10 Years)</option>
            </select>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={boardOnly} onChange={(e) => setBoardOnly(e.target.checked)} />
              Ban only from /{post.board_id}/ (uncheck for Global Ban)
            </label>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#d9534f', fontWeight: 700 }}>
              <input type="checkbox" checked={appendNotice} onChange={(e) => setAppendNotice(e.target.checked)} />
              Append "(USER WAS BANNED FOR THIS POST)" message to post
            </label>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={loading} style={{ background: '#d9534f', color: '#fff', fontWeight: 700 }}>
              {loading ? 'Banning...' : 'Execute Ban'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
