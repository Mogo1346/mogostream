const express = require("express");

const app = express();
const PORT = process.env.PORT || 8080;
const UPSTREAM_URL = process.env.UPSTREAM_URL;

app.get("/stream", async (req, res) => {
  try {
    const response = await fetch(UPSTREAM_URL);

    if (!response.ok) {
      return res.status(response.status).send("Upstream error");
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

        const absoluteUrl = new URL(trimmed, base).href;

        return `/proxy?url=${encodeURIComponent(absoluteUrl)}`;
      })
      .join("\n");

    res.set({
      "Content-Type": "application/vnd.apple.mpegurl",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache"
    });

    res.send(rewritten);

  } catch (error) {
    console.error(error);
    res.status(500).send("Proxy error");
  }
});

app.get("/proxy", async (req, res) => {
  try {
    const url = new URL(req.query.url);

    if (!["http:", "https:"].includes(url.protocol)) {
      return res.status(400).send("Invalid URL");
    }

    const response = await fetch(url);

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
    console.error(error);
    res.status(500).send("Proxy error");
  }
});

app.get("/", (req, res) => {
  res.send("HLS Proxy is running");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Running on port ${PORT}`);
});