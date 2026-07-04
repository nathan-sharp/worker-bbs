import React from 'react';
import { Board } from '../types';

interface BoardBannerProps {
  board?: Board;
  onNewThread: () => void;
  filterText?: string;
  onFilterChange?: (text: string) => void;
  showFilter?: boolean;
}

export const BoardBanner: React.FC<BoardBannerProps> = ({
  board,
  onNewThread,
  filterText = '',
  onFilterChange,
  showFilter = true,
}) => {
  if (!board) return null;

  return (
    <div>
      <div className="board-banner">
        <div className="board-title">/{board.id}/ - {board.title}</div>
        {board.subtitle && <div className="board-subtitle">{board.subtitle}</div>}
        {board.description && (
          <div style={{ fontSize: '13px', marginTop: '10px', color: 'var(--text-muted)' }}>
            {board.description}
          </div>
        )}
      </div>

      <div className="view-controls">
        <button onClick={onNewThread} style={{ fontWeight: 700, padding: '8px 16px' }}>
          + [ Start a New Thread ]
        </button>

        {showFilter && onFilterChange && (
          <div>
            <input
              type="text"
              className="filter-input"
              placeholder="Filter by keyword or #tag..."
              value={filterText}
              onChange={(e) => onFilterChange(e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
