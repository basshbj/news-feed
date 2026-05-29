import { useCallback, useEffect, useState } from 'react';
import { getArticles, getFeeds, setFlag } from '../api.js';
import ArticleCard from '../components/ArticleCard.jsx';
import FeedFilter from '../components/FeedFilter.jsx';

export default function InterestedPage() {
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
    getArticles({ status: 'interested', feed })
      .then(setArticles)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [feed]);

  useEffect(() => { load(); }, [load]);

  const unflag = async (article) => {
    setArticles((prev) => prev.filter((a) => a.id !== article.id));
    try {
      await setFlag({ id: article.id, feedCategory: article.feedCategory, flag: null });
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
        <p className="muted">No interested articles yet.</p>
      ) : (
        <div className="card-grid">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              actions={{
                onSwipeLeft: (a) => unflag(a),
                buttons: (
                  <button type="button" className="btn btn-secondary" onClick={() => unflag(article)}>
                    Unflag
                  </button>
                ),
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
