import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));

// Initialize Gemini Client safely
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please set it in the Secrets panel under Settings.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// API endpoint for generating learning modules
app.post("/api/generate", async (req: Request, res: Response) => {
  try {
    const { topic, documentText, fileData, fileMimeType } = req.body;

    if (!topic || typeof topic !== "string" || topic.trim() === "") {
      return res.status(400).json({ success: false, error: "A valid topic is required." });
    }

    const ai = getGeminiClient();

    let userPrompt = `Topic to explain: "${topic}"\n`;
    if (documentText && documentText.trim() !== "") {
      userPrompt += `Additional context / document reference:\n"""\n${documentText}\n"""\n`;
    }

    userPrompt += `Please analyze this topic and return a strictly structured JSON payload containing:
1) A "remedial_text" explanation aimed at a 5th-grade level, using friendly visual analogies.
2) An "advanced_text" explanation with academic rigor, deep technical/analytical details, and complex implications.
3) A 3-question adaptive "quiz" array. Each question must include 'question', 'options' (array of 4 unique strings), 'correct' (must match one of the options exactly), a 'hint' to guide them, and a 'scaffolded_step' (a gentle step-by-step guidance/hints when they answer incorrectly).`;

    const contents: any[] = [];

    // If file data is provided, pass it as inlineData
    if (fileData && fileMimeType) {
      const base64Clean = fileData.replace(/^data:.*?;base64,/, "");
      contents.push({
        inlineData: {
          data: base64Clean,
          mimeType: fileMimeType
        }
      });
    }

    // Add the text prompt
    contents.push(userPrompt);

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: "You are an expert adaptive EdTech AI Engine. You synthesize topics into a 5th-grade explanation with analogies, an advanced analytical explanation, and a highly rigorous 3-question adaptive quiz. You must always return a valid JSON matching the exact schema specified. If an uploaded file or image is provided in the contents, carefully read and deconstruct it to build your explanation and quiz around it.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            remedial_text: {
              type: Type.STRING,
              description: "A highly intuitive 5th-grade explanation utilizing creative analogies and visual metaphors to explain the concept simply."
            },
            advanced_text: {
              type: Type.STRING,
              description: "A comprehensive, analytical, deep-dive explanation with academic rigor covering technical mechanisms, complex implications, and nuance."
            },
            quiz: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: {
                    type: Type.STRING,
                    description: "A clear, challenging question testing understanding of the core concept."
                  },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "An array of exactly 4 unique choices for the question."
                  },
                  correct: {
                    type: Type.STRING,
                    description: "The correct option string. It MUST match one of the items in the options array exactly."
                  },
                  hint: {
                    type: Type.STRING,
                    description: "A helpful, gentle hint that guides the student's intuition without giving away the answer directly."
                  },
                  scaffolded_step: {
                    type: Type.STRING,
                    description: "A detailed, structured step-by-step sub-explanation or supportive coaching text explaining the reasoning, designed to scaffold learning when the student answers incorrectly."
                  }
                },
                required: ["question", "options", "correct", "hint", "scaffolded_step"]
              },
              description: "An array of exactly 3 progressive adaptive questions testing different difficulty levels of the topic."
            }
          },
          required: ["remedial_text", "advanced_text", "quiz"]
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("No response content generated by the AI.");
    }

    const parsedModule = JSON.parse(textOutput.trim());
    return res.json({ success: true, module: parsedModule });
  } catch (err: any) {
    console.error("Generation error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "An unexpected error occurred during module generation."
    });
  }
});

// Vite Middleware Integration
async function startServer() {
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
