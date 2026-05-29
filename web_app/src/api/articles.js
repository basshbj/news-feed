'use strict';

const express = require('express');
const { getContainer } = require('../cosmos');

const router = express.Router();

const VALID_FLAGS = new Set(['interested', 'not_interested']);

function flagFilter(status) {
  switch (status) {
    case 'interested':
      return { clause: 'c.flag = "interested"' };
    case 'not_interested':
      return { clause: 'c.flag = "not_interested"' };
    case 'unclassified':
    default:
      return { clause: '(NOT IS_DEFINED(c.flag) OR c.flag = null)' };
  }
}

router.get('/', async (req, res, next) => {
  try {
    const container = await getContainer();
    const { status = 'unclassified', feed } = req.query;
    const where = [flagFilter(status).clause];
    const parameters = [];
    if (feed && feed !== 'all') {
      where.push('c.feedCategory = @feed');
      parameters.push({ name: '@feed', value: feed });
    }
    const query = `SELECT * FROM c WHERE ${where.join(' AND ')} ORDER BY c.publishDate DESC`;
    const { resources } = await container.items.query({ query, parameters }).fetchAll();
    res.json(resources);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { feed } = req.query;
    if (!feed) {
      return res.status(400).json({ error: 'feed query parameter (feedCategory) is required' });
    }
    const { flag } = req.body ?? {};
    if (flag !== null && !VALID_FLAGS.has(flag)) {
      return res.status(400).json({ error: `flag must be null, "interested", or "not_interested"` });
    }

    const container = await getContainer();
    const { resource: existing } = await container.item(id, feed).read();
    if (!existing) {
      return res.status(404).json({ error: 'Article not found' });
    }
    const updated = {
      ...existing,
      flag,
      flagUpdatedAt: flag === null ? null : new Date().toISOString(),
    };
    const { resource } = await container.item(id, feed).replace(updated);
    res.json(resource);
  } catch (err) {
    if (err.code === 404) {
      return res.status(404).json({ error: 'Article not found' });
    }
    next(err);
  }
});

module.exports = router;
