import { useRef, useState } from 'react';

const SWIPE_THRESHOLD = 80;

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function ArticleCard({ article, actions }) {
  const [dx, setDx] = useState(0);
  const [dismissing, setDismissing] = useState(null); // 'left' | 'right' | null
  const startX = useRef(null);

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
  };

  const onTouchMove = (e) => {
    if (startX.current == null) return;
    setDx(e.touches[0].clientX - startX.current);
  };

  const onTouchEnd = () => {
    if (startX.current == null) return;
    if (dx > SWIPE_THRESHOLD && actions.onSwipeRight) {
      setDismissing('right');
      setTimeout(() => actions.onSwipeRight(article), 180);
    } else if (dx < -SWIPE_THRESHOLD && actions.onSwipeLeft) {
      setDismissing('left');
      setTimeout(() => actions.onSwipeLeft(article), 180);
    } else {
      setDx(0);
    }
    startX.current = null;
  };

  const style = dismissing
    ? { transform: `translateX(${dismissing === 'right' ? '120%' : '-120%'})`, opacity: 0, transition: 'transform 180ms ease-out, opacity 180ms ease-out' }
    : { transform: `translateX(${dx}px)` };

  return (
    <article
      className="card"
      style={style}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="card-header">
        <span className="badge">{article.feedCategory}</span>
        <span className="date">{formatDate(article.publishDate)}</span>
      </div>
      <h2 className="card-title">
        <a href={article.url} target="_blank" rel="noopener noreferrer">{article.title}</a>
      </h2>
      {article.description && <p className="card-desc">{article.description}</p>}
      <div className="card-actions">
        {actions.buttons}
      </div>
    </article>
  );
}
