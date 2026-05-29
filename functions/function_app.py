"""News-feed Azure Functions app (Python v2 model).

Timer trigger fetches each configured RSS feed every ``RSS_SCHEDULE_CRON``
(default: every 10 hours) and inserts new articles into Cosmos DB. Articles
already present (looked up by deterministic id) are skipped.
"""
from __future__ import annotations

import logging
import os

import azure.functions as func

import cosmos_client
import rss_ingest
from feeds_config import load_feeds

app = func.FunctionApp()

SCHEDULE = os.environ.get("RSS_SCHEDULE_CRON", "0 0 */10 * * *")


@app.function_name(name="IngestRssFeeds")
@app.timer_trigger(schedule=SCHEDULE, arg_name="timer", run_on_startup=False, use_monitor=True)
def ingest_rss_feeds(timer: func.TimerRequest) -> None:
    log = logging.getLogger("ingest_rss_feeds")
    if timer.past_due:
        log.warning("Timer is past due")

    feeds = load_feeds()
    log.info("Ingesting %d feed(s)", len(feeds))

    for feed in feeds:
        inserted = skipped = errors = 0
        try:
            entries = rss_ingest.fetch_feed_entries(feed)
        except Exception:
            log.exception("Failed to fetch feed %s", feed.category)
            continue

        for entry in entries:
            try:
                article = rss_ingest.build_article(entry, feed)
                if cosmos_client.exists(article["id"]):
                    skipped += 1
                    continue
                cosmos_client.insert(article)
                inserted += 1
            except Exception:
                errors += 1
                log.exception("Failed to process entry for %s", feed.category)

        log.info(
            "Feed '%s': inserted=%d skipped=%d errors=%d total=%d",
            feed.category, inserted, skipped, errors, len(entries),
        )
