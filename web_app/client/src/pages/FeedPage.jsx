import { useCallback, useEffect, useState } from 'react';
import { getArticles, getFeeds, setFlag } from '../api.js';
import ArticleCard from '../components/ArticleCard.jsx';
import FeedFilter from '../components/FeedFilter.jsx';

export default function FeedPage() {
  const [feeds, setFeeds] = useState([]);
  const [feed, setFeed] = useState('all');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getFeeds().then(setFeeds).catch((e) => setError(e.message));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getArticles({ status: 'unclassified', feed })
      .then(setArticles)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [feed]);

  useEffect(() => { load(); }, [load]);

  const classify = async (article, flag) => {
    setArticles((prev) => prev.filter((a) => a.id !== article.id));
    try {
      await setFlag({ id: article.id, feedCategory: article.feedCategory, flag });
    } catch (e) {
      setError(e.message);
      load();
    }
  };

  return (
    <section>
      <div className="toolbar">
        <FeedFilter feeds={feeds} value={feed} onChange={setFeed} />
        <button type="button" className="refresh" onClick={load}>Refresh</button>
      </div>
      {error && <div className="error">{error}</div>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : articles.length === 0 ? (
        <p className="muted">Nothing new. Check back later.</p>
      ) : (
        <div className="card-grid">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              actions={{
                onSwipeRight: (a) => classify(a, 'interested'),
                onSwipeLeft: (a) => classify(a, 'not_interested'),
                buttons: (
                  <>
                    <button type="button" className="btn btn-secondary" onClick={() => classify(article, 'not_interested')}>
                      Not interested
                    </button>
                    <button type="button" className="btn btn-primary" onClick={() => classify(article, 'interested')}>
                      Interested
                    </button>
                  </>
                ),
              }}
            />
          ))}
        </div>
      )}
      <p className="hint">Tip: on mobile, swipe right for interested, left for not interested.</p>
    </section>
  );
}
