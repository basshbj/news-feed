"""Parse RSS feeds into Cosmos-ready article documents."""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from time import mktime

import feedparser
from bs4 import BeautifulSoup

from feeds_config import Feed

log = logging.getLogger(__name__)

DESCRIPTION_MAX_CHARS = 200


def _article_id(url: str) -> str:
    return hashlib.sha256(url.encode("utf-8")).hexdigest()


def _strip_html(value: str) -> str:
    if not value:
        return ""
    return BeautifulSoup(value, "html.parser").get_text(" ", strip=True)


def _truncate(text: str, limit: int = DESCRIPTION_MAX_CHARS) -> str:
    text = (text or "").strip()
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "\u2026"


def _publish_date(entry) -> str:
    for attr in ("published_parsed", "updated_parsed"):
        parsed = getattr(entry, attr, None)
        if parsed:
            return datetime.fromtimestamp(mktime(parsed), tz=timezone.utc).isoformat()
    return datetime.now(tz=timezone.utc).isoformat()


def build_article(entry, feed: Feed) -> dict:
    url = entry.link
    description = _truncate(_strip_html(getattr(entry, "description", "")))
    return {
        "id": _article_id(url),
        "url": url,
        "title": getattr(entry, "title", "(untitled)"),
        "description": description,
        "publishDate": _publish_date(entry),
        "feedCategory": feed.category,
        "feedIndex": feed.index,
        "flag": None,
        "flagUpdatedAt": None,
        "createdAt": datetime.now(tz=timezone.utc).isoformat(),
    }


def fetch_feed_entries(feed: Feed):
    parsed = feedparser.parse(feed.url)
    if parsed.bozo:
        log.warning("Feed %s reported parse warning: %s", feed.category, parsed.bozo_exception)
    return parsed.entries
