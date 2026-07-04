import React, { useState, useMemo } from 'react';
import { CatalogItem } from '../types';

interface CatalogViewProps {
  catalog: CatalogItem[];
  filterText: string;
  onSelectThread: (threadId: number) => void;
}

type SortOption = 'bump' | 'created' | 'replies' | 'images';

export const CatalogView: React.FC<CatalogViewProps> = ({ catalog, filterText, onSelectThread }) => {
  const [sort, setSort] = useState<SortOption>('bump');

  const filteredAndSorted = useMemo(() => {
    let items = [...catalog];

    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      items = items.filter((item) => {
        const titleMatch = item.subject.toLowerCase().includes(q);
        const commentMatch = item.op_post?.comment?.toLowerCase().includes(q) || false;
        return titleMatch || commentMatch;
      });
    }

    items.sort((a, b) => {
      // Always keep sticky at the top
      if (a.sticky !== b.sticky) {
        return b.sticky - a.sticky;
      }
      if (sort === 'bump') {
        return b.bumped_at - a.bumped_at;
      }
      if (sort === 'created') {
        return b.created_at - a.created_at;
      }
      if (sort === 'replies') {
        return b.post_count - a.post_count;
      }
      if (sort === 'images') {
        return b.image_count - a.image_count;
      }
      return 0;
    });

    return items;
  }, [catalog, filterText, sort]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '13px' }}>
        <span>Sort Catalog by:</span>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)} style={{ padding: '4px 8px' }}>
          <option value="bump">Bump Order</option>
          <option value="created">Creation Date</option>
          <option value="replies">Most Replies</option>
          <option value="images">Most Images</option>
        </select>
      </div>

      {filteredAndSorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          No threads found matching "{filterText}".
        </div>
      ) : (
        <div className="catalog-grid">
          {filteredAndSorted.map((item) => (
            <div key={item.id} className="catalog-card" onClick={() => onSelectThread(item.id)}>
              <div className="catalog-badges">
                {item.sticky === 1 && <span className="badge badge-sticky">Sticky</span>}
                {item.locked === 1 && <span className="badge badge-locked">Locked</span>}
              </div>

              <div className="catalog-thumb-container">
                {item.op_post?.file_url ? (
                  item.op_post.file_type?.startsWith('video/') ? (
                    <video src={item.op_post.file_url} className="catalog-thumb" muted />
                  ) : (
                    <img src={item.op_post.file_url} alt={item.subject} className="catalog-thumb" />
                  )
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>[No Image]</span>
                )}
              </div>

              <div className="catalog-stats">
                R: {Math.max(0, item.post_count - 1)} / I: {item.image_count}
              </div>

              <div className="catalog-subject">{item.subject}</div>

              {item.op_post?.comment && (
                <div className="catalog-excerpt">{item.op_post.comment}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
