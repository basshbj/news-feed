'use strict';

const express = require('express');
const config = require('../config');

const router = express.Router();

router.get('/', (_req, res) => {
  res.json(config.feeds.map((f) => ({ index: f.index, category: f.category })));
});

module.exports = router;
