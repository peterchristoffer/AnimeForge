import { GoogleGenAI, Type } from "@google/genai";
import { CharacterData, GeneratedCharacter } from "../types";

const getAI = () => {
  // @ts-ignore
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Gemini API key is missing. Please ensure GEMINI_API_KEY is available in your environment.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateCharacterImage = async (data: CharacterData): Promise<string> => {
  const ai = getAI();
  const styleToUse = data.customStyle || data.style;
  
  let prompt = `GENERATE_IMAGE: Create a high-quality anime character portrait.
    Gender: ${data.gender}.
    Style: ${styleToUse} anime art.
    Clothing Style: ${data.clothingStyle || 'Modern Streetwear'}.
    Character Details: ${data.features.hairColor} hair, ${data.features.eyeColor} eyes, wearing ${data.features.outfit}, with ${data.features.accessory}. 
    Environment: ${data.environment || 'Anime Background'}.
    Personality/Vibe: ${data.personality}. 
    The image should be a clear, centered portrait with vibrant colors and clean lines.`;

  if (data.photoBase64) {
    prompt = `GENERATE_IMAGE: Transform the attached photo into a high-fidelity anime portrait in ${styleToUse} style. 
      CRITICAL: The subject MUST remain highly recognizable. 
      Preserve their specific facial geometry, eye shape, bone structure, and unique identifying features from the photo. 
      The anime aesthetic is the medium, but the person's identity is the priority.
      Details: ${data.gender}, ${data.features.hairColor} hair, ${data.features.eyeColor} eyes, wearing ${data.features.outfit}.
      Environment: ${data.environment || 'Anime Background'}.
      Clothing Style: ${data.clothingStyle || 'Modern Streetwear'}.
      Vibe: ${data.personality}.`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        ...(data.photoBase64 ? [{
          inlineData: {
            data: data.photoBase64.split(',')[1],
            mimeType: data.photoBase64.split(';')[0].split(':')[1] || "image/png"
          }
        }] : []),
        { text: prompt }
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "3:4",
      }
    },
  });

  const candidate = response.candidates?.[0];
  if (candidate?.finishReason === 'SAFETY') {
    throw new Error("Bilden blockerades av säkerhetsfilter.");
  }

  for (const part of candidate?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Ingen bild genererades.");
};

export const generateCharacterStory = async (data: CharacterData): Promise<{ story: string; stats: GeneratedCharacter['stats']; coolName: string; japaneseSummary: string }> => {
  const ai = getAI();
  const styleToUse = data.customStyle || data.style;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Create a cool Japanese anime version of the name "${data.name}". 
      Also create a short, engaging anime backstory (max 150 words) and RPG-style stats for this character. 
      Additionally, provide a very short summary of the backstory in Japanese (max 20 characters).
      Style: ${styleToUse}. Clothing Style: ${data.clothingStyle || 'Modern Streetwear'}. Features: ${JSON.stringify(data.features)}. Personality: ${data.personality}. Environment: ${data.environment || 'N/A'}.
      Return the stats as Strength, Agility, Intelligence, and Spirit (values 1-100).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          coolName: { type: Type.STRING },
          story: { type: Type.STRING },
          japaneseSummary: { type: Type.STRING },
          stats: {
            type: Type.OBJECT,
            properties: {
              strength: { type: Type.NUMBER },
              agility: { type: Type.NUMBER },
              intelligence: { type: Type.NUMBER },
              spirit: { type: Type.NUMBER }
            },
            required: ["strength", "agility", "intelligence", "spirit"]
          }
        },
        required: ["coolName", "story", "japaneseSummary", "stats"]
      }
    }
  });
  
  return JSON.parse(response.text);
};

export const generateMangaStory = async (prompt: string): Promise<{ title: string; content: string }> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          content: { type: Type.STRING }
        },
        required: ["title", "content"]
      }
    }
  });
  return JSON.parse(response.text);
};

export const editCharacterImage = async (imageBase64: string, editPrompt: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: imageBase64.split(',')[1],
            mimeType: imageBase64.split(';')[0].split(':')[1] || "image/png"
          }
        },
        { text: `GENERATE_IMAGE: Edit this anime character portrait based on this request: ${editPrompt}. Keep the character consistent.` }
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "3:4",
      }
    },
  });

  const candidate = response.candidates?.[0];
  for (const part of candidate?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Misslyckades med att redigera bilden.");
};
