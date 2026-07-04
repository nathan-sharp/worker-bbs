import React, { useState } from 'react';
import { Post } from '../types';
import { useAdmin } from '../context/AdminContext';

interface PostCardProps {
  post: Post;
  onReplyClick?: (postId: number) => void;
  onHoverQuote?: (postId: number, pos: { x: number; y: number } | null) => void;
  onDeletePost?: (postId: number) => void;
  onBanPost?: (post: Post) => void;
  isOP?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onReplyClick,
  onHoverQuote,
  onDeletePost,
  onBanPost,
  isOP = false,
}) => {
  const { isAdmin } = useAdmin();
  const [expanded, setExpanded] = useState(false);

  const renderComment = (comment: string | null) => {
    if (!comment) return null;
    const lines = comment.split(/\r?\n/);

    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <br key={idx} />;

      // Check for quote reference >>123
      if (trimmed.startsWith('>>') && /^\>>\d+/.test(trimmed)) {
        const match = trimmed.match(/^\>>(\d+)(.*)/);
        if (match) {
          const qId = parseInt(match[1], 10);
          const rest = match[2];
          return (
            <div key={idx}>
              <span
                className="quote-link"
                onMouseEnter={(e) => {
                  if (onHoverQuote) onHoverQuote(qId, { x: e.clientX, y: e.clientY });
                }}
                onMouseLeave={() => {
                  if (onHoverQuote) onHoverQuote(qId, null);
                }}
                onClick={() => {
                  const target = document.getElementById(`post-${qId}`);
                  if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    target.style.backgroundColor = '#ffff99';
                    setTimeout(() => {
                      target.style.backgroundColor = '';
                    }, 1500);
                  }
                }}
              >
                &gt;&gt;{qId}
              </span>
              {rest && <span>{rest}</span>}
            </div>
          );
        }
      }

      // Check for greentext >quote
      if (trimmed.startsWith('>')) {
        return (
          <div key={idx} className="greentext">
            {line}
          </div>
        );
      }

      return <div key={idx}>{line}</div>;
    });
  };

  return (
    <div id={`post-${post.id}`} className={`post-card ${isOP ? 'post-op' : 'post-reply'}`}>
      <div className="post-header">
        <span className="post-author">{post.author_name || 'Anonymous'}</span>
        {post.tripcode && <span className="post-tripcode">{post.tripcode}</span>}
        {post.poster_hash && (
          <span style={{ fontSize: '11px', background: 'var(--border-color)', padding: '1px 5px', borderRadius: '3px' }}>
            {post.poster_hash}
          </span>
        )}
        <span className="post-date">{new Date(post.created_at).toLocaleString()}</span>
        <span
          className="post-id post-num"
          onClick={() => {
            if (onReplyClick) onReplyClick(post.id);
          }}
          title="Click to reply to this post"
        >
          No.{post.id}
        </span>

        {onReplyClick && (
          <span
            style={{ fontSize: '11px', cursor: 'pointer', color: 'var(--link-color)', fontWeight: 600 }}
            onClick={() => onReplyClick(post.id)}
          >
            [Reply]
          </span>
        )}

        {isAdmin && (
          <span style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
            {onDeletePost && (
              <button
                style={{ background: '#d9534f', padding: '2px 6px', fontSize: '11px' }}
                onClick={() => {
                  if (confirm(`Delete post No.${post.id}?`)) onDeletePost(post.id);
                }}
              >
                Delete
              </button>
            )}
            {onBanPost && post.ip_hash && (
              <button
                style={{ background: '#333', padding: '2px 6px', fontSize: '11px', color: '#fff' }}
                onClick={() => onBanPost(post)}
              >
                Ban IP
              </button>
            )}
          </span>
        )}
      </div>

      {post.file_url && (
        <div className="post-media">
          <div className="post-media-info">
            File: <a href={post.file_url} target="_blank" rel="noopener noreferrer">{post.file_name || 'attachment'}</a>
            {post.file_size ? ` (${Math.round(post.file_size / 1024)} KB)` : ''}
            {post.file_width && post.file_height ? `, ${post.file_width}x${post.file_height}` : ''}
          </div>
          {post.file_type?.startsWith('video/') ? (
            <video
              src={post.file_url}
              controls
              style={{ maxWidth: expanded ? '100%' : '300px', maxHeight: '500px', borderRadius: '4px' }}
            />
          ) : (
            <img
              src={post.file_url}
              alt={post.file_name || 'attachment'}
              className={`post-thumb ${expanded ? 'expanded' : ''}`}
              onClick={() => setExpanded(!expanded)}
              title="Click to toggle full image size"
            />
          )}
        </div>
      )}

      <div className="post-body">{renderComment(post.comment)}</div>
    </div>
  );
};
