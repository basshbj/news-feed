'use strict';

require('dotenv').config();

const REQUIRED = ['COSMOS_ENDPOINT', 'COSMOS_KEY'];

function loadFeeds() {
  const defaults = [
    {
      index: 0,
      category: 'Foundry',
      url: 'https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/board?board.id=azure-ai-foundry-blog',
    },
    {
      index: 1,
      category: 'MS All',
      url: 'https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/Community?interaction.style=blog&feeds.replies=false',
    },
  ];
  const raw = process.env.RSS_FEEDS;
  if (!raw) return defaults;
  try {
    const parsed = JSON.parse(raw);
    return parsed.map((f) => ({ index: Number(f.index), category: String(f.category), url: String(f.url) }));
  } catch (err) {
    console.warn('RSS_FEEDS is invalid JSON; using defaults:', err.message);
    return defaults;
  }
}

function validate() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

module.exports = {
  validate,
  port: Number(process.env.PORT) || 3000,
  cosmos: {
    endpoint: process.env.COSMOS_ENDPOINT,
    key: process.env.COSMOS_KEY,
    database: process.env.COSMOS_DATABASE || 'newsfeed',
    container: process.env.COSMOS_CONTAINER || 'articles',
  },
  feeds: loadFeeds(),
};
