const express = require("express");

const app = express();
const PORT = process.env.PORT || 8080;
const UPSTREAM_URL = process.env.UPSTREAM_URL;

function safeUrl(raw) {
  try {
    const u = new URL(raw);
    return `${u.origin}${u.pathname}`;
  } catch {
    return "(invalid URL)";
  }
}

app.get("/", (req, res) => {
  res.send("HLS Proxy is running");
});

app.get("/stream", async (req, res) => {
  console.log("=== /stream requested ===");
  console.log("Upstream:", safeUrl(UPSTREAM_URL));

  try {
    const response = await fetch(UPSTREAM_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/vnd.apple.mpegurl, application/x-mpegURL, */*"
      },
      redirect: "follow"
    });

    console.log(
      "Upstream status:",
      response.status,
      response.statusText
    );

    console.log(
      "Content-Type:",
      response.headers.get("content-type")
    );

    if (!response.ok) {
      return res
        .status(response.status)
        .send(`Upstream HTTP ${response.status}`);
    }

    const playlist = await response.text();
    const base = new URL(UPSTREAM_URL);

    const rewritten = playlist
      .split(/\r?\n/)
      .map(line => {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith("#")) {
          return line;
        }

        try {
          const absoluteUrl = new URL(trimmed, base).href;
          return `/proxy?url=${encodeURIComponent(absoluteUrl)}`;
        } catch {
          return line;
        }
      })
      .join("\n");

    res.set({
      "Content-Type": "application/vnd.apple.mpegurl",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache"
    });

    res.send(rewritten);

  } catch (error) {
    console.error("FETCH ERROR:", error.stack || error);

    res
      .status(502)
      .send("Proxy connection error");
  }
});

app.get("/proxy", async (req, res) => {
  try {
    const url = new URL(req.query.url);

    if (!["http:", "https:"].includes(url.protocol)) {
      return res.status(400).send("Invalid URL");
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      },
      redirect: "follow"
    });

    console.log(
      "Segment status:",
      response.status,
      url.origin + url.pathname
    );

    if (!response.ok) {
      return res.status(response.status).send("Upstream error");
    }

    const data = Buffer.from(await response.arrayBuffer());

    res.set({
      "Content-Type":
        response.headers.get("content-type") ||
        "application/octet-stream",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache"
    });

    res.send(data);

  } catch (error) {
    console.error("PROXY ERROR:", error.stack || error);
    res.status(500).send("Proxy error");
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Running on port ${PORT}`);
});