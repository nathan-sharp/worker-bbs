import React, { useState, useEffect, useRef } from 'react';

interface QuickReplyModalProps {
  threadId: number;
  boardId: string;
  initialQuoteId?: number | null;
  onClose: () => void;
  onSuccess: (newPostId: number) => void;
}

export const QuickReplyModal: React.FC<QuickReplyModalProps> = ({
  threadId,
  boardId,
  initialQuoteId,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [comment, setComment] = useState(initialQuoteId ? `>>${initialQuoteId}\n` : '');
  const [sage, setSage] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [useDirectUrl, setUseDirectUrl] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Dragging state
  const [pos, setPos] = useState({ x: window.innerWidth - 420, y: window.innerHeight - 450 });
  const [dragging, setDragging] = useState(false);
  const [rel, setRel] = useState({ x: 0, y: 0 });
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialQuoteId) {
      setComment((prev) => {
        const qStr = `>>${initialQuoteId}\n`;
        return prev.includes(`>>${initialQuoteId}`) ? prev : qStr + prev;
      });
    }
  }, [initialQuoteId]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setDragging(true);
    setRel({ x: e.pageX - pos.x, y: e.pageY - pos.y });
    e.stopPropagation();
    e.preventDefault();
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!dragging) return;
    setPos({
      x: Math.max(0, Math.min(window.innerWidth - 380, e.pageX - rel.x)),
      y: Math.max(0, Math.min(window.innerHeight - 300, e.pageY - rel.y)),
    });
    e.stopPropagation();
    e.preventDefault();
  };

  const onMouseUp = () => {
    setDragging(false);
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    } else {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragging]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment && !file && !imageUrl) {
      setError('Please provide a comment or an image attachment.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let uploadedUrl: string | null = useDirectUrl ? imageUrl : null;
      let fileName: string | null = null;
      let fileSize: number | null = null;
      let fileType: string | null = null;

      if (!useDirectUrl && file) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
        });
        const uploadData = (await uploadRes.json()) as any;
        if (!uploadData.success) {
          throw new Error(uploadData.error || 'File upload failed');
        }
        uploadedUrl = uploadData.file_url;
        fileName = uploadData.file_name;
        fileSize = uploadData.file_size;
        fileType = uploadData.file_type;
      }

      const res = await fetch(`/api/threads/${threadId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_name: name || 'Anonymous',
          comment,
          sage,
          file_url: uploadedUrl,
          file_name: fileName || (useDirectUrl ? 'external-image.jpg' : null),
          file_size: fileSize,
          file_type: fileType || (useDirectUrl ? 'image/jpeg' : null),
        }),
      });

      const data = (await res.json()) as any;
      if (!data.success) {
        throw new Error(data.error || 'Failed to post reply');
      }

      onSuccess(data.post_id);
    } catch (err: any) {
      setError(err.message || 'Error occurred while posting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={boxRef} className="quick-reply-box" style={{ left: `${pos.x}px`, top: `${pos.y}px` }}>
      <div className="qr-header" onMouseDown={onMouseDown}>
        <span>Reply to Thread No.{threadId}</span>
        <span onClick={onClose} style={{ cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>
          &times;
        </span>
      </div>

      <form onSubmit={handleSubmit} className="qr-body">
        {error && <div style={{ color: '#d9534f', fontSize: '12px' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Name#secret (default: Anonymous)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ flex: 1 }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
            <input type="checkbox" checked={sage} onChange={(e) => setSage(e.target.checked)} />
            [Sage]
          </label>
        </div>

        <textarea
          rows={5}
          placeholder="Comment... (use > for greentext, >>123 for quotes)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>Attachment:</span>
            <button
              type="button"
              style={{ fontSize: '11px', padding: '2px 6px' }}
              onClick={() => setUseDirectUrl(!useDirectUrl)}
            >
              {useDirectUrl ? 'Upload File instead' : 'Paste Direct URL instead'}
            </button>
          </div>

          {useDirectUrl ? (
            <input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          ) : (
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Remember to follow rules!
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{ fontWeight: 700 }}>
              {loading ? 'Posting...' : 'Post Reply'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
