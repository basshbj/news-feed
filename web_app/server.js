const express = require("express");
const https = require("https");
const http = require("http");
const { parseStringPromise } = require("xml2js");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const RSS_URL =
  "https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/Community?interaction.style=blog&feeds.replies=false";

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/feed", async (req, res) => {
  try {
    const xml = await fetchUrl(RSS_URL);
    const parsed = await parseStringPromise(xml, {
      trim: true,
      explicitArray: false,
    });

    const channel = parsed.rss?.channel;
    if (!channel) {
      return res.status(502).json({ error: "Invalid RSS feed structure" });
    }

    const rawItems = Array.isArray(channel.item)
      ? channel.item
      : channel.item
        ? [channel.item]
        : [];

    const articles = rawItems.map((item) => ({
      title: item.title || "",
      link: item.link || "",
      pubDate: item.pubDate || "",
      description: stripHtml(item.description || ""),
      categories: extractCategories(item.category),
      author: item["dc:creator"] || item.author || "",
    }));

    res.json({
      title: channel.title || "Microsoft Tech Community",
      description: channel.description || "",
      lastBuildDate: channel.lastBuildDate || "",
      articles,
    });
  } catch (err) {
    console.error("Feed fetch error:", err.message);
    res.status(502).json({ error: "Failed to fetch RSS feed" });
  }
});

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client
      .get(url, { headers: { "User-Agent": "MS-Blog-RSS-Dashboard/1.0" } }, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          return fetchUrl(response.headers.location).then(resolve).catch(reject);
        }
        if (response.statusCode !== 200) {
          return reject(new Error(`HTTP ${response.statusCode}`));
        }
        let data = "";
        response.on("data", (chunk) => (data += chunk));
        response.on("end", () => resolve(data));
        response.on("error", reject);
      })
      .on("error", reject);
  });
}

function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractCategories(category) {
  if (!category) return [];
  if (Array.isArray(category)) return category.map(String);
  return [String(category)];
}

app.listen(PORT, () => {
  console.log(`MS Blog RSS Dashboard running at http://localhost:${PORT}`);
});
