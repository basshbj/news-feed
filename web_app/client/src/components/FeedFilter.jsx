export default function FeedFilter({ feeds, value, onChange }) {
  return (
    <div className="feed-filter">
      <label htmlFor="feed-select">Feed</label>
      <select
        id="feed-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="all">All feeds</option>
        {feeds.map((f) => (
          <option key={f.category} value={f.category}>{f.category}</option>
        ))}
      </select>
    </div>
  );
}
