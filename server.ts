import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as prettier from "prettier";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // Formatter Endpoint
  app.post("/api/format", async (req, res) => {
    const { code, language, tabSize } = req.body;
    if (typeof code !== "string") {
      res.status(400).json({ error: "Code must be a string" });
      return;
    }

    const compressSVGs = (content: string): string => {
      const svgRegex = /<svg[\s>].*?<\/svg>/gis;
      return content.replace(svgRegex, (match) => {
        let condensed = match
          .replace(/\r?\n/g, " ")
          .replace(/\s+/g, " ")
          .replace(/>\s+</g, "><");
        return condensed.trim();
      });
    };

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
        res.json({ formatted: compressSVGs(code) });
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
      res.json({ formatted: compressSVGs(formatted) });
    } catch (err: any) {
      console.error("Server-side Formatter error:", err);
      // Let's return error message and original code so the client knows it failed
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
