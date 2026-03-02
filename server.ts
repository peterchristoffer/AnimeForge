import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // In-memory store for characters (simulating a database)
  const communityCharacters: any[] = [];

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/upload", (req, res) => {
    const character = req.body;
    if (!character.name || !character.imageUrl) {
      return res.status(400).json({ error: "Invalid character data" });
    }
    
    // Add to our "community" list
    communityCharacters.push({
      ...character,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      votes: 0
    });

    console.log(`Character ${character.name} uploaded to community!`);
    res.json({ success: true, message: "Character published to community!" });
  });

  app.get("/api/community", (req, res) => {
    res.json(communityCharacters);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
