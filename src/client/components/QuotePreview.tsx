import React, { useState, useEffect } from 'react';
import { Post } from '../types';

interface QuotePreviewProps {
  postId: number;
  position: { x: number; y: number };
  onClose?: () => void;
}

const postCache: Record<number, Post> = {};

export const QuotePreview: React.FC<QuotePreviewProps> = ({ postId, position }) => {
  const [post, setPost] = useState<Post | null>(postCache[postId] || null);
  const [loading, setLoading] = useState(!postCache[postId]);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (postCache[postId]) {
      setPost(postCache[postId]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetch(`/api/posts/${postId}`)
      .then((res) => res.json() as Promise<any>)
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.post) {
          postCache[postId] = data.post;
          setPost(data.post);
        } else {
          setError(true);
        }
      })
      .catch(() => {
        if (isMounted) setError(true);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [postId]);

  // Position adjustment to keep preview inside viewport
  const left = Math.min(position.x + 15, window.innerWidth - 460);
  const top = Math.min(position.y + 15, window.innerHeight - 250);

  return (
    <div className="quote-preview" style={{ left: `${Math.max(10, left)}px`, top: `${Math.max(10, top)}px` }}>
      {loading && <div style={{ padding: '12px', color: 'var(--text-muted)' }}>Loading &gt;&gt;{postId}...</div>}
      {error && <div style={{ padding: '12px', color: '#d9534f' }}>Post &gt;&gt;{postId} not found</div>}
      {post && (
        <div style={{ padding: '10px' }}>
          <div className="post-header">
            <span className="post-author">{post.author_name}</span>
            {post.tripcode && <span className="post-tripcode">{post.tripcode}</span>}
            <span className="post-date">{new Date(post.created_at).toLocaleString()}</span>
            <span className="post-id">No.{post.id}</span>
          </div>
          {post.file_url && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              File: {post.file_name || 'attachment'}
            </div>
          )}
          <div className="post-body" style={{ fontSize: '13px', maxHeight: '150px', overflowY: 'auto' }}>
            {post.comment || (post.file_url ? ' [Image only]' : '')}
          </div>
        </div>
      )}
    </div>
  );
};
