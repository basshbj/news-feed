(function () {
  "use strict";

  // ── State ──
  let allArticles = [];
  let activeCategory = "All";
  const READ_KEY = "ms-blog-read";

  // ── DOM refs ──
  const grid = document.getElementById("articlesGrid");
  const loadingState = document.getElementById("loadingState");
  const errorState = document.getElementById("errorState");
  const searchInput = document.getElementById("searchInput");
  const categoryBar = document.getElementById("categoryBar");
  const statsBar = document.getElementById("statsBar");
  const feedMeta = document.getElementById("feedMeta");
  const refreshBtn = document.getElementById("refreshBtn");
  const retryBtn = document.getElementById("retryBtn");
  const themeToggle = document.getElementById("themeToggle");

  // ── Theme ──
  const savedTheme = localStorage.getItem("ms-blog-theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);

  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("ms-blog-theme", next);
  });

  // ── Read tracking ──
  function getReadSet() {
    try {
      return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]"));
    } catch {
      return new Set();
    }
  }

  function markRead(link) {
    const s = getReadSet();
    s.add(link);
    localStorage.setItem(READ_KEY, JSON.stringify([...s]));
  }

  // ── Relative time ──
  function timeAgo(dateStr) {
    const date = new Date(dateStr);
    if (isNaN(date)) return dateStr;
    const seconds = Math.floor((Date.now() - date) / 1000);
    const intervals = [
      { label: "y", seconds: 31536000 },
      { label: "mo", seconds: 2592000 },
      { label: "d", seconds: 86400 },
      { label: "h", seconds: 3600 },
      { label: "m", seconds: 60 },
    ];
    for (const { label, seconds: s } of intervals) {
      const count = Math.floor(seconds / s);
      if (count >= 1) return `${count}${label} ago`;
    }
    return "just now";
  }

  // ── Fetch feed ──
  async function fetchFeed() {
    loadingState.classList.remove("hidden");
    errorState.classList.add("hidden");
    grid.querySelectorAll(".card, .no-results").forEach((el) => el.remove());
    refreshBtn.classList.add("spinning");

    try {
      const res = await fetch("/api/feed");
      if (!res.ok) throw new Error("Feed request failed");
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      allArticles = data.articles;
      feedMeta.textContent = data.lastBuildDate
        ? `Updated ${timeAgo(data.lastBuildDate)}`
        : "";

      buildCategories();
      renderArticles();
    } catch (err) {
      console.error(err);
      errorState.classList.remove("hidden");
    } finally {
      loadingState.classList.add("hidden");
      refreshBtn.classList.remove("spinning");
    }
  }

  // ── Categories ──
  function buildCategories() {
    const catCounts = {};
    allArticles.forEach((a) =>
      a.categories.forEach((c) => (catCounts[c] = (catCounts[c] || 0) + 1))
    );

    const sorted = Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    categoryBar.innerHTML = "";

    const allBtn = createCatButton("All", allArticles.length);
    allBtn.classList.add("active");
    categoryBar.appendChild(allBtn);

    sorted.forEach(([name, count]) => {
      categoryBar.appendChild(createCatButton(name, count));
    });
  }

  function createCatButton(name, count) {
    const btn = document.createElement("button");
    btn.className = "cat-btn";
    btn.textContent = `${name} (${count})`;
    btn.dataset.cat = name;
    btn.addEventListener("click", () => {
      activeCategory = name;
      categoryBar.querySelectorAll(".cat-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderArticles();
    });
    return btn;
  }

  // ── Render ──
  function renderArticles() {
    grid.querySelectorAll(".card, .no-results").forEach((el) => el.remove());
    const readSet = getReadSet();
    const query = searchInput.value.toLowerCase().trim();

    let filtered = allArticles;

    if (activeCategory !== "All") {
      filtered = filtered.filter((a) => a.categories.includes(activeCategory));
    }

    if (query) {
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.description.toLowerCase().includes(query) ||
          a.author.toLowerCase().includes(query) ||
          a.categories.some((c) => c.toLowerCase().includes(query))
      );
    }

    const readCount = filtered.filter((a) => readSet.has(a.link)).length;
    statsBar.textContent = `${filtered.length} articles · ${readCount} read`;

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "no-results";
      empty.textContent = query
        ? `No articles matching "${query}"`
        : "No articles found.";
      grid.appendChild(empty);
      return;
    }

    filtered.forEach((article, i) => {
      const card = document.createElement("article");
      card.className = "card";
      card.style.animationDelay = `${i * 0.03}s`;

      if (readSet.has(article.link)) {
        card.classList.add("read");
      }

      const tagsHtml = article.categories
        .slice(0, 3)
        .map((c) => `<span class="tag">${escapeHtml(c)}</span>`)
        .join("");

      card.innerHTML = `
        <div class="card-header">
          <a class="card-title" href="${escapeAttr(article.link)}" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(article.title)}
          </a>
          <div class="read-marker" title="Unread"></div>
        </div>
        <div class="card-meta">
          ${article.author ? `<span class="card-author">${escapeHtml(article.author)}</span><span class="card-dot"></span>` : ""}
          <time>${timeAgo(article.pubDate)}</time>
        </div>
        <p class="card-desc">${escapeHtml(article.description)}</p>
        <div class="card-tags">${tagsHtml}</div>
      `;

      // Mark as read on click
      card.querySelector(".card-title").addEventListener("click", () => {
        markRead(article.link);
        card.classList.add("read");
        const rc = getReadSet().size;
        const total = grid.querySelectorAll(".card").length;
        const readNow = grid.querySelectorAll(".card.read").length;
        statsBar.textContent = `${total} articles · ${readNow} read`;
      });

      grid.appendChild(card);
    });
  }

  // ── Helpers ──
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // ── Events ──
  let searchTimeout;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(renderArticles, 200);
  });

  refreshBtn.addEventListener("click", fetchFeed);
  retryBtn.addEventListener("click", fetchFeed);

  // ── Keyboard shortcut: / to focus search ──
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
    }
    if (e.key === "Escape") {
      searchInput.blur();
      searchInput.value = "";
      renderArticles();
    }
  });

  // ── Auto-refresh every 5 minutes ──
  setInterval(fetchFeed, 5 * 60 * 1000);

  // ── Go ──
  fetchFeed();
})();
