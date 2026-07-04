import React, { useState } from 'react';
import { Board } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useAdmin } from '../context/AdminContext';

interface HeaderProps {
  boards: Board[];
  currentBoardId?: string;
  onSelectBoard: (id: string) => void;
  viewMode: 'board' | 'catalog' | 'thread' | 'admin';
  onToggleCatalog: () => void;
  onOpenAdmin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  boards,
  currentBoardId,
  onSelectBoard,
  viewMode,
  onToggleCatalog,
  onOpenAdmin,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { isAdmin, login, logout } = useAdmin();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [inputKey, setInputKey] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(inputKey);
    setShowLoginModal(false);
    setInputKey('');
  };

  return (
    <>
      <header className="site-header">
        <div className="nav-boards">
          <span>[ </span>
          {boards.map((b, i) => (
            <React.Fragment key={b.id}>
              <a
                href={`#/${b.id}`}
                className={currentBoardId === b.id && viewMode !== 'admin' ? 'active' : ''}
                onClick={(e) => {
                  e.preventDefault();
                  onSelectBoard(b.id);
                }}
              >
                /{b.id}/
              </a>
              {i < boards.length - 1 && <span> / </span>}
            </React.Fragment>
          ))}
          <span> ]</span>
        </div>

        <div className="nav-controls">
          {currentBoardId && viewMode !== 'admin' && (
            <button onClick={onToggleCatalog}>
              {viewMode === 'catalog' ? 'Board View' : 'Catalog'}
            </button>
          )}

          <button onClick={toggleTheme} title="Switch classic theme">
            Style: {theme === 'yotsuba' ? 'Yotsuba (Light)' : 'Yotsuba B (Dark)'}
          </button>

          {isAdmin ? (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={onOpenAdmin} style={{ background: '#117743', color: '#fff' }}>
                Admin
              </button>
              <button onClick={logout} title="Log out of admin">
                Logout
              </button>
            </div>
          ) : (
            <button onClick={() => setShowLoginModal(true)}>Admin</button>
          )}
        </div>
      </header>

      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '16px' }}>Admin Login</h3>
            <form onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <label>Admin Secret Key</label>
                <input
                  type="password"
                  placeholder="Enter X-Admin-Key (default: admin123)"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowLoginModal(false)}>
                  Cancel
                </button>
                <button type="submit">Login</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
