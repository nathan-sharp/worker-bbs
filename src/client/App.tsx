import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AdminProvider } from './context/AdminContext';
import { Board, ThreadWithOP, CatalogItem, Post } from './types';
import { Header } from './components/Header';
import { BoardBanner } from './components/BoardBanner';
import { CatalogView } from './components/CatalogView';
import { ThreadView } from './components/ThreadView';
import { PostCard } from './components/PostCard';
import { QuotePreview } from './components/QuotePreview';
import { QuickReplyModal } from './components/QuickReplyModal';
import { CreateThreadModal } from './components/CreateThreadModal';
import { AdminDashboard } from './components/AdminDashboard';
import { BanModal } from './components/BanModal';

const AppContent: React.FC = () => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [currentBoardId, setCurrentBoardId] = useState<string>('tech');
  const [viewMode, setViewMode] = useState<'board' | 'catalog' | 'thread' | 'admin'>('board');
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null);

  const [threads, setThreads] = useState<ThreadWithOP[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [filterText, setFilterText] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals & Floating popups
  const [showNewThreadModal, setShowNewThreadModal] = useState(false);
  const [quickReply, setQuickReply] = useState<{ isOpen: boolean; threadId: number; quoteId?: number | null }>({
    isOpen: false,
    threadId: 0,
  });
  const [hoverQuote, setHoverQuote] = useState<{ postId: number; pos: { x: number; y: number } } | null>(null);
  const [banModalPost, setBanModalPost] = useState<Post | null>(null);

  // Parse URL Hash for Routing
  const parseHash = () => {
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (!hash || hash === '') {
      window.location.hash = '#/tech/';
      return;
    }
    if (hash === 'admin') {
      setViewMode('admin');
      return;
    }

    const parts = hash.split('/').filter(Boolean);
    const boardSlug = parts[0];
    if (boardSlug) {
      setCurrentBoardId(boardSlug);
    }

    if (parts[1] === 'catalog') {
      setViewMode('catalog');
      setActiveThreadId(null);
    } else if (parts[1] === 'thread' && parts[2]) {
      const tId = parseInt(parts[2], 10);
      if (!isNaN(tId)) {
        setActiveThreadId(tId);
        setViewMode('thread');
      }
    } else {
      setViewMode('board');
      setActiveThreadId(null);
    }
  };

  useEffect(() => {
    parseHash();
    window.addEventListener('hashchange', parseHash);
    return () => window.removeEventListener('hashchange', parseHash);
  }, []);

  // Fetch Boards
  const fetchBoards = async () => {
    try {
      const res = await fetch('/api/boards');
      const data = (await res.json()) as any;
      if (data.success && data.boards.length > 0) {
        setBoards(data.boards);
      }
    } catch {
      console.error('Failed to load boards');
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  // Fetch Board Content (Threads or Catalog)
  const fetchBoardContent = async () => {
    if (viewMode === 'admin' || !currentBoardId) return;
    setLoading(true);
    try {
      if (viewMode === 'catalog') {
        const res = await fetch(`/api/boards/${currentBoardId}/catalog`);
        const data = (await res.json()) as any;
        if (data.success) setCatalog(data.catalog || []);
      } else if (viewMode === 'board') {
        const res = await fetch(`/api/boards/${currentBoardId}/threads`);
        const data = (await res.json()) as any;
        if (data.success) setThreads(data.threads || []);
      }
    } catch {
      console.error('Failed to load board content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'board' || viewMode === 'catalog') {
      fetchBoardContent();
    }
  }, [currentBoardId, viewMode]);

  const currentBoard = boards.find((b) => b.id === currentBoardId);

  const handleSelectBoard = (id: string) => {
    window.location.hash = `#/${id}/`;
  };

  const handleToggleCatalog = () => {
    if (viewMode === 'catalog') {
      window.location.hash = `#/${currentBoardId}/`;
    } else {
      window.location.hash = `#/${currentBoardId}/catalog`;
    }
  };

  const handleOpenThread = (tId: number) => {
    window.location.hash = `#/${currentBoardId}/thread/${tId}`;
  };

  const handleDeletePost = async (postId: number) => {
    try {
      const res = await fetch(`/api/admin/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Key': localStorage.getItem('bbs_admin_key') || '' },
      });
      const data = (await res.json()) as any;
      if (data.success) {
        fetchBoardContent();
      } else {
        alert(data.error || 'Delete failed');
      }
    } catch {
      alert('Delete failed');
    }
  };

  return (
    <div className="app-wrapper">
      <Header
        boards={boards}
        currentBoardId={currentBoardId}
        onSelectBoard={handleSelectBoard}
        viewMode={viewMode}
        onToggleCatalog={handleToggleCatalog}
        onOpenAdmin={() => (window.location.hash = '#/admin')}
      />

      <div className="container">
        {viewMode === 'admin' ? (
          <AdminDashboard
            onBoardCreated={fetchBoards}
            onClose={() => (window.location.hash = `#/${currentBoardId}/`)}
          />
        ) : (
          <>
            <BoardBanner
              board={currentBoard}
              onNewThread={() => setShowNewThreadModal(true)}
              filterText={filterText}
              onFilterChange={setFilterText}
              showFilter={viewMode === 'catalog' || viewMode === 'board'}
            />

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                Loading /{currentBoardId}/...
              </div>
            ) : viewMode === 'catalog' ? (
              <CatalogView
                catalog={catalog}
                filterText={filterText}
                onSelectThread={handleOpenThread}
              />
            ) : viewMode === 'thread' && activeThreadId ? (
              <ThreadView
                threadId={activeThreadId}
                onBack={() => (window.location.hash = `#/${currentBoardId}/`)}
                onOpenReply={(qId) => setQuickReply({ isOpen: true, threadId: activeThreadId, quoteId: qId })}
                onHoverQuote={(id, pos) => (pos ? setHoverQuote({ postId: id, pos }) : setHoverQuote(null))}
                onBanPost={(post) => setBanModalPost(post)}
              />
            ) : (
              <div>
                {threads.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No threads on /{currentBoardId}/ yet. Be the first to post!
                  </div>
                ) : (
                  threads
                    .filter((t) => {
                      if (!filterText.trim()) return true;
                      const q = filterText.toLowerCase();
                      return (
                        t.subject.toLowerCase().includes(q) ||
                        t.op_post?.comment?.toLowerCase().includes(q) ||
                        false
                      );
                    })
                    .map((t) => (
                      <div key={t.id} className="thread-container">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          {t.sticky === 1 && <span className="badge badge-sticky">Sticky</span>}
                          {t.locked === 1 && <span className="badge badge-locked">Locked</span>}
                          <span
                            onClick={() => handleOpenThread(t.id)}
                            style={{ fontWeight: 700, fontSize: '18px', color: 'var(--banner-title)', cursor: 'pointer' }}
                          >
                            {t.subject}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            [{t.post_count} replies, {t.image_count} images]
                          </span>
                          <span
                            onClick={() => handleOpenThread(t.id)}
                            style={{ fontSize: '12px', color: 'var(--link-color)', cursor: 'pointer', fontWeight: 600 }}
                          >
                            [View / Reply]
                          </span>
                        </div>

                        {t.op_post && (
                          <PostCard
                            post={t.op_post}
                            isOP={true}
                            onReplyClick={(id) => setQuickReply({ isOpen: true, threadId: t.id, quoteId: id })}
                            onHoverQuote={(id, pos) => (pos ? setHoverQuote({ postId: id, pos }) : setHoverQuote(null))}
                            onDeletePost={handleDeletePost}
                            onBanPost={(post) => setBanModalPost(post)}
                          />
                        )}

                        {t.recent_posts && t.recent_posts.length > 0 && (
                          <div style={{ marginTop: '8px', paddingLeft: '15px', borderLeft: '2px solid var(--border-color)' }}>
                            {t.post_count > 6 && (
                              <div
                                onClick={() => handleOpenThread(t.id)}
                                style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', cursor: 'pointer', fontStyle: 'italic' }}
                              >
                                {t.post_count - 6} posts omitted. Click to view all replies.
                              </div>
                            )}
                            {t.recent_posts.map((reply) => (
                              <PostCard
                                key={reply.id}
                                post={reply}
                                isOP={false}
                                onReplyClick={(id) => setQuickReply({ isOpen: true, threadId: t.id, quoteId: id })}
                                onHoverQuote={(id, pos) => (pos ? setHoverQuote({ postId: id, pos }) : setHoverQuote(null))}
                                onDeletePost={handleDeletePost}
                                onBanPost={(post) => setBanModalPost(post)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Quote Preview */}
      {hoverQuote && <QuotePreview postId={hoverQuote.postId} position={hoverQuote.pos} />}

      {/* Floating Quick Reply Box */}
      {quickReply.isOpen && (
        <QuickReplyModal
          threadId={quickReply.threadId}
          boardId={currentBoardId}
          initialQuoteId={quickReply.quoteId}
          onClose={() => setQuickReply({ isOpen: false, threadId: 0 })}
          onSuccess={() => {
            setQuickReply({ isOpen: false, threadId: 0 });
            if (viewMode === 'thread' && activeThreadId === quickReply.threadId) {
              // Thread view will auto refresh or can refresh on close
            } else {
              fetchBoardContent();
            }
          }}
        />
      )}

      {/* Create New Thread Modal */}
      {showNewThreadModal && (
        <CreateThreadModal
          boardId={currentBoardId}
          onClose={() => setShowNewThreadModal(false)}
          onSuccess={(newThreadId) => {
            setShowNewThreadModal(false);
            window.location.hash = `#/${currentBoardId}/thread/${newThreadId}`;
          }}
        />
      )}

      {/* Ban Modal */}
      {banModalPost && (
        <BanModal
          post={banModalPost}
          onClose={() => setBanModalPost(null)}
          onSuccess={() => {
            fetchBoardContent();
          }}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AdminProvider>
        <AppContent />
      </AdminProvider>
    </ThemeProvider>
  );
}
