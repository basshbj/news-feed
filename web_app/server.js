'use strict';

const path = require('path');
const express = require('express');

const config = require('./src/config');
const feedsRouter = require('./src/api/feeds');
const articlesRouter = require('./src/api/articles');

config.validate();

const app = express();
app.use(express.json());

app.use('/api/feeds', feedsRouter);
app.use('/api/articles', articlesRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Static SPA (built by `npm --prefix client run build`)
const clientDist = path.join(__dirname, 'client', 'dist');
app.use(express.static(clientDist));
app.get(/^\/(?!api).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, () => {
  console.log(`news-feed web app listening on http://localhost:${config.port}`);
});
