const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function handle(res) {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Request failed (${res.status}): ${body}`);
  }
  return res.json();
}

export function getFeeds() {
  return fetch('/api/feeds').then(handle);
}

export function getArticles({ status = 'unclassified', feed = 'all' } = {}) {
  const qs = new URLSearchParams({ status, feed });
  return fetch(`/api/articles?${qs}`).then(handle);
}

export function setFlag({ id, feedCategory, flag }) {
  const qs = new URLSearchParams({ feed: feedCategory });
  return fetch(`/api/articles/${encodeURIComponent(id)}?${qs}`, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify({ flag }),
  }).then(handle);
}
