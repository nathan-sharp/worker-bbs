import React, { useState, useEffect } from 'react';
import { Thread, Post } from '../types';
import { PostCard } from './PostCard';
import { useAdmin } from '../context/AdminContext';

interface ThreadViewProps {
  threadId: number;
  onBack: () => void;
  onOpenReply: (quoteId?: number) => void;
  onHoverQuote: (postId: number, pos: { x: number; y: number } | null) => void;
  onBanPost: (post: Post) => void;
}

export const ThreadView: React.FC<ThreadViewProps> = ({
  threadId,
  onBack,
  onOpenReply,
  onHoverQuote,
  onBanPost,
}) => {
  const { isAdmin } = useAdmin();
  const [thread, setThread] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Auto-Update Polling State
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [pollInterval, setPollInterval] = useState(10);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchThreadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/threads/${threadId}/posts`);
      const data = (await res.json()) as any;
      if (data.success) {
        setThread(data.thread);
        setPosts(data.posts || []);
        setLastUpdated(new Date());
      } else {
        setError(data.error || 'Failed to load thread');
      }
    } catch (err: any) {
      setError('Error loading thread data');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreadData();
  }, [threadId]);

  // Auto-Update interval effect
  useEffect(() => {
    if (!autoUpdate) return;
    const timer = setInterval(() => {
      fetchThreadData(true);
    }, pollInterval * 1000);
    return () => clearInterval(timer);
  }, [autoUpdate, pollInterval, threadId]);

  const handleDeletePost = async (postId: number) => {
    try {
      const res = await fetch(`/api/admin/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'X-Admin-Key': localStorage.getItem('bbs_admin_key') || '',
        },
      });
      const data = (await res.json()) as any;
      if (data.success) {
        if (data.threadDeleted) {
          alert('Thread deleted');
          onBack();
        } else {
          setPosts((prev) => prev.filter((p) => p.id !== postId));
        }
      } else {
        alert(data.error || 'Failed to delete');
      }
    } catch {
      alert('Delete failed');
    }
  };

  const handleToggleSticky = async () => {
    if (!thread) return;
    const res = await fetch(`/api/admin/threads/${thread.id}/sticky`, {
      method: 'POST',
      headers: { 'X-Admin-Key': localStorage.getItem('bbs_admin_key') || '' },
    });
    if (res.ok) fetchThreadData(true);
  };

  const handleToggleLock = async () => {
    if (!thread) return;
    const res = await fetch(`/api/admin/threads/${thread.id}/lock`, {
      method: 'POST',
      headers: { 'X-Admin-Key': localStorage.getItem('bbs_admin_key') || '' },
    });
    if (res.ok) fetchThreadData(true);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px', fontSize: '16px' }}>Loading Thread No.{threadId}...</div>;
  }

  if (error || !thread) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: '#d9534f' }}>
        <h3>Error: {error || 'Thread not found'}</h3>
        <button onClick={onBack} style={{ marginTop: '16px' }}>Return to Board</button>
      </div>
    );
  }

  const opPost = posts.find((p) => p.is_op === 1);
  const replies = posts.filter((p) => p.is_op === 0);

  return (
    <div>
      <div className="view-controls">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={onBack}>&larr; Return</button>
          <button onClick={() => onOpenReply()} style={{ fontWeight: 700 }}>
            [ Reply to Thread ]
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '13px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={autoUpdate}
              onChange={(e) => setAutoUpdate(e.target.checked)}
            />
            Auto-Update
          </label>

          {autoUpdate && (
            <select
              value={pollInterval}
              onChange={(e) => setPollInterval(parseInt(e.target.value, 10))}
              style={{ padding: '2px 6px', fontSize: '12px' }}
            >
              <option value={5}>Every 5s</option>
              <option value={10}>Every 10s</option>
              <option value={30}>Every 30s</option>
            </select>
          )}

          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            Updated: {lastUpdated.toLocaleTimeString()}
          </span>

          <button onClick={() => fetchThreadData(true)} title="Refresh now" style={{ padding: '4px 8px' }}>
            ↻
          </button>
        </div>
      </div>

      {isAdmin && (
        <div style={{ background: 'var(--header-bg)', padding: '8px 12px', borderRadius: '4px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontWeight: 700 }}>Admin Thread Actions:</span>
          <button onClick={handleToggleSticky}>
            {thread.sticky === 1 ? 'Unsticky Thread' : 'Sticky Thread'}
          </button>
          <button onClick={handleToggleLock}>
            {thread.locked === 1 ? 'Unlock Thread' : 'Lock Thread'}
          </button>
          <button
            style={{ background: '#d9534f', color: '#fff' }}
            onClick={() => {
              if (confirm(`Delete entire thread No.${thread.id}?`)) handleDeletePost(opPost ? opPost.id : thread.id);
            }}
          >
            Delete Thread
          </button>
        </div>
      )}

      <div className="thread-container">
        {thread.sticky === 1 && <span className="badge badge-sticky" style={{ marginRight: '6px' }}>Sticky</span>}
        {thread.locked === 1 && <span className="badge badge-locked" style={{ marginRight: '6px' }}>Locked</span>}
        <h2 style={{ fontSize: '20px', color: 'var(--banner-title)', marginBottom: '12px', display: 'inline' }}>
          {thread.subject}
        </h2>

        {opPost && (
          <PostCard
            post={opPost}
            isOP={true}
            onReplyClick={(id) => onOpenReply(id)}
            onHoverQuote={onHoverQuote}
            onDeletePost={handleDeletePost}
            onBanPost={onBanPost}
          />
        )}

        <div style={{ marginTop: '16px' }}>
          {replies.map((reply) => (
            <PostCard
              key={reply.id}
              post={reply}
              isOP={false}
              onReplyClick={(id) => onOpenReply(id)}
              onHoverQuote={onHoverQuote}
              onDeletePost={handleDeletePost}
              onBanPost={onBanPost}
            />
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center', margin: '30px 0' }}>
        <button onClick={() => onOpenReply()} style={{ fontWeight: 700, padding: '10px 24px', fontSize: '15px' }}>
          [ Post a Reply ]
        </button>
      </div>
    </div>
  );
};
