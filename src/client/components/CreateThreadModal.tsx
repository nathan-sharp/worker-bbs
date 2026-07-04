import React, { useState } from 'react';

interface CreateThreadModalProps {
  boardId: string;
  onClose: () => void;
  onSuccess: (threadId: number) => void;
}

export const CreateThreadModal: React.FC<CreateThreadModalProps> = ({ boardId, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [comment, setComment] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [useDirectUrl, setUseDirectUrl] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setError('Please provide a subject for your new thread.');
      return;
    }
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

      const res = await fetch(`/api/boards/${boardId}/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_name: name || 'Anonymous',
          subject: subject.trim(),
          comment,
          file_url: uploadedUrl,
          file_name: fileName || (useDirectUrl ? 'external-image.jpg' : null),
          file_size: fileSize,
          file_type: fileType || (useDirectUrl ? 'image/jpeg' : null),
        }),
      });

      const data = (await res.json()) as any;
      if (!data.success) {
        throw new Error(data.error || 'Failed to create thread');
      }

      onSuccess(data.thread_id);
    } catch (err: any) {
      setError(err.message || 'Error occurred while creating thread');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Start a New Thread in /{boardId}/</h3>
          <span onClick={onClose} style={{ cursor: 'pointer', fontSize: '20px', fontWeight: 700 }}>&times;</span>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div style={{ color: '#d9534f', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

          <div className="form-group">
            <label>Name / Tripcode (optional)</label>
            <input
              type="text"
              placeholder="Name#secret (default: Anonymous)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Subject *</label>
            <input
              type="text"
              placeholder="Thread title or subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Comment</label>
            <textarea
              rows={6}
              placeholder="Type your comment here... Use > for greentext!"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ margin: 0 }}>Attachment (Image or Video)</label>
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

          <div className="form-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{ fontWeight: 700 }}>
              {loading ? 'Creating...' : 'Create Thread'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
