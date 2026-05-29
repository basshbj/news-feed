"""RSS feed configuration loaded from the RSS_FEEDS environment variable.

Format: JSON array of objects with keys ``index``, ``category``, and ``url``.
If the variable is missing or malformed, falls back to the defaults baked into
the application specification.
"""
from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass

log = logging.getLogger(__name__)

DEFAULT_FEEDS = [
    {
        "index": 0,
        "category": "Foundry",
        "url": "https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/board?board.id=azure-ai-foundry-blog",
    },
    {
        "index": 1,
        "category": "MS All",
        "url": "https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/Community?interaction.style=blog&feeds.replies=false",
    },
]


@dataclass(frozen=True)
class Feed:
    index: int
    category: str
    url: str


def load_feeds() -> list[Feed]:
    raw = os.environ.get("RSS_FEEDS")
    if not raw:
        return [Feed(**f) for f in DEFAULT_FEEDS]
    try:
        items = json.loads(raw)
        return [Feed(index=int(i["index"]), category=str(i["category"]), url=str(i["url"])) for i in items]
    except (ValueError, KeyError, TypeError) as exc:
        log.warning("RSS_FEEDS is invalid JSON or missing keys; falling back to defaults: %s", exc)
        return [Feed(**f) for f in DEFAULT_FEEDS]
