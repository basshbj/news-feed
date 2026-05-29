import { NavLink, Route, Routes } from 'react-router-dom';
import FeedPage from './pages/FeedPage.jsx';
import InterestedPage from './pages/InterestedPage.jsx';

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>News Feed</h1>
        <nav>
          <NavLink to="/" end>Inbox</NavLink>
          <NavLink to="/interested">Interested</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<FeedPage />} />
          <Route path="/interested" element={<InterestedPage />} />
        </Routes>
      </main>
    </div>
  );
}
