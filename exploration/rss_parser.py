import feedparser

RSS_URL = "https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/Community?interaction.style=blog&feeds.replies=false"

def parse_rss_feed(url):
    feed = feedparser.parse(url)
    articles = []
    for entry in feed.entries:
        article = {
            'title': entry.title,
            'link': entry.link,
            'description': entry.description,
            'published': entry.published,
        }
        articles.append(article)
    return articles

if __name__ == "__main__":
    articles = parse_rss_feed(RSS_URL)

    for article in articles:
        print(f"Title: {article['title']}")
        print(f"Link: {article['link']}")
        print("-" * 80)