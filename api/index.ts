import express from "express";
import * as prettier from "prettier";

const app = express();

app.use(express.json({ limit: "15mb" }));

// Formatter Endpoint
app.post("/api/format", async (req, res) => {
  const { code, language, tabSize } = req.body;
  if (typeof code !== "string") {
    res.status(400).json({ error: "Code must be a string" });
    return;
  }

  let parser = "";
  switch (language?.toLowerCase()) {
    case "javascript":
    case "js":
    case "jsx":
      parser = "babel";
      break;
    case "typescript":
    case "ts":
    case "tsx":
      parser = "babel-ts";
      break;
    case "html":
      parser = "html";
      break;
    case "css":
    case "scss":
    case "less":
      parser = "css";
      break;
    case "json":
      parser = "json";
      break;
    default:
      res.json({ formatted: code });
      return;
  }

  try {
    const formatted = await prettier.format(code, {
      parser,
      tabWidth: tabSize || 4,
      semi: true,
      singleQuote: false,
      trailingComma: "none",
      printWidth: 100,
    });
    res.json({ formatted });
  } catch (err: any) {
    console.error("Server-side Formatter error:", err);
    res.status(422).json({ error: err.message || "Formatting failed", original: code });
  }
});

// GitHub Pull Proxy Endpoint
app.post("/api/github/pull", async (req, res) => {
  const { owner, repo, branch, token } = req.body;
  if (!owner || !repo || !branch) {
    res.status(400).json({ error: "Missing owner, repo, or branch" });
    return;
  }

  try {
    const headers: Record<string, string> = {
      "User-Agent": "Visual-HTML5-Studio"
    };
    if (token) {
      headers["Authorization"] = `token ${token}`;
    }

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/zipball/${branch}`,
      { headers }
    );

    if (!response.ok) {
      res.status(response.status).json({ error: `GitHub API returned status ${response.status} (${response.statusText})` });
      return;
    }

    const buffer = await response.arrayBuffer();
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename=${owner}-${repo}-${branch}.zip`);
    res.end(Buffer.from(buffer));
  } catch (err: any) {
    console.error("GitHub pull proxy error:", err);
    res.status(500).json({ error: err.message || "Failed to pull zipball" });
  }
});

export default app;
