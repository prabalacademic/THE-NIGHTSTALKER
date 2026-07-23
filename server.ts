import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const FALLBACK_RIDDLES = [
  {
    text: "I have no eyes, but I watch you in the damp dark. I have no legs, but I follow your every turn. What am I?",
    options: ["Your shadow", "The Nightstalker", "A dying bulb", "The corridor wall"],
    correctAnswer: "The Nightstalker"
  },
  {
    text: "When you look directly at me, I freeze. When you turn away, I step closer. What am I?",
    options: ["A statue", "The Stalker", "Your heartbeat", "A memory"],
    correctAnswer: "The Stalker"
  },
  {
    text: "Electric currents fade, the fuses burn. In which room does the final portal turn?",
    options: ["Room 404", "The Core", "Exit 0", "The Threshold"],
    correctAnswer: "The Core"
  }
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.post("/api/riddle", async (req, res) => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: "Generate a cryptic, atmospheric riddle suitable for a horror game encounter. Provide 4 options for the answer and the correct option. The riddle should fit the theme of a terrifying stalker or a surreal horror environment.",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "The riddle text" },
              options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "4 possible answers to the riddle" },
              correctAnswer: { type: Type.STRING, description: "The correct answer among the 4 options" }
            },
            required: ["text", "options", "correctAnswer"]
          }
        }
      });
      const data = JSON.parse(response.text || "{}");
      if (!data.text || !data.options) {
        throw new Error("Invalid response format");
      }
      res.json(data);
    } catch (error) {
      console.warn("Gemini API quota or error for riddle, using fallback:", error);
      const randomRiddle = FALLBACK_RIDDLES[Math.floor(Math.random() * FALLBACK_RIDDLES.length)];
      res.json(randomRiddle);
    }
  });

  app.post("/api/dossier", async (req, res) => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: "Generate a horrifying, classified SCP-style dossier paragraph (max 4 sentences) about the 'Nightstalker', a Level 0 Entity found in the damp corridors of the Black Painted Aarav Facility. It morphs behavior based on eye contact.",
      });
      res.json({ text: response.text || "Captured during surveillance inside the Backrooms damp corridors. Features dynamic morphing behavioral patterns." });
    } catch (error) {
      console.warn("Gemini API quota or error for dossier, using fallback:", error);
      res.json({ text: "Captured during surveillance inside the Backrooms damp corridors. Features dynamic morphing behavioral patterns: Turqouise State (Curious) when gazed upon, Indigo State (Feral) when blinded or ignored, and Red State (Hunting) during absolute pursuit." });
    }
  });

  app.post("/api/game-over-message", async (req, res) => {
    const { fuses, time } = req.body;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: `The player was caught by the Nightstalker. They survived for ${time} seconds and collected ${fuses} out of 3 fuses. Write a terrifying 2-sentence death screen message addressing the player.`,
      });
      res.json({ text: response.text || "The Nightstalker dragged you into the darkness of Black Painted Aarav." });
    } catch (error) {
      res.json({ text: `You survived ${time} seconds and collected ${fuses}/3 fuses before the Nightstalker claimed you in the shadows.` });
    }
  });

  app.post("/api/win-message", async (req, res) => {
    const { time } = req.body;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: `The player escaped the Nightstalker by powering the portal. They survived for ${time} seconds. Write an atmospheric 2-sentence victory screen message about their narrow escape.`,
      });
      res.json({ text: response.text || "You powered up the spatial jump-gate and escaped the creature." });
    } catch (error) {
      res.json({ text: `After ${time} seconds of terror, you successfully activated the threshold portal and escaped the facility.` });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
