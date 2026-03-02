import { GoogleGenAI, Modality, Type } from "@google/genai";
import { CharacterData, GeneratedCharacter } from "../types";

const apiKey = process.env.GEMINI_API_KEY || "";

export const generateCharacterImage = async (data: CharacterData): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
  
  const styleToUse = data.customStyle || data.style;
  
  let prompt = `GENERATE_IMAGE: Create a high-quality anime character portrait.
    Gender: ${data.gender}.
    Style: ${styleToUse} anime art.
    Clothing Style: ${data.clothingStyle || 'Modern Streetwear'}.
    Character Details: ${data.features.hairColor} hair, ${data.features.eyeColor} eyes, wearing ${data.features.outfit}, with ${data.features.accessory}. 
    Personality/Vibe: ${data.personality}. 
    The image should be a clear, centered portrait with vibrant colors and clean lines.`;

  if (data.photoBase64) {
    prompt = `GENERATE_IMAGE: Transform the attached photo into a high-fidelity anime portrait in ${styleToUse} style. 
      CRITICAL: The subject MUST remain highly recognizable. 
      Preserve their specific facial geometry, eye shape, bone structure, and unique identifying features from the photo. 
      The anime aesthetic is the medium, but the person's identity is the priority.
      Details: ${data.gender}, ${data.features.hairColor} hair, ${data.features.eyeColor} eyes, wearing ${data.features.outfit}.
      Clothing Style: ${data.clothingStyle || 'Modern Streetwear'}.
      Vibe: ${data.personality}.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [
          ...(data.photoBase64 ? [{
            inlineData: {
              data: data.photoBase64.split(',')[1],
              mimeType: "image/png"
            }
          }] : []),
          { text: prompt }
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "3:4",
          imageSize: data.imageSize || "1K"
        }
      },
    });

    const candidate = response.candidates?.[0];
    
    if (candidate?.finishReason === 'SAFETY') {
      throw new Error("Bilden blockerades av säkerhetsfilter. Gemini följer strikta regler som förbjuder generering av: \n1. Kända verkliga personer eller kändisar.\n2. Upphovsrättsskyddat material (t.ex. specifika existerande anime-karaktärer).\n3. Känsligt eller olämpligt innehåll.\n\nProva att ladda upp en annan bild eller ändra din beskrivning för att följa dessa riktlinjer.");
    }

    for (const part of candidate?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    if (candidate?.content?.parts?.[0]?.text) {
      console.warn("AI returned text instead of image:", candidate.content.parts[0].text);
      throw new Error("AI:n skickade text istället för en bild. Prova att vara mer specifik i din beskrivning.");
    }

    throw new Error("Ingen bild genererades. Försök igen om en stund.");
  } catch (error) {
    console.error("Image generation error:", error);
    throw error;
  }
};

export const generateCharacterStory = async (data: CharacterData): Promise<{ story: string; stats: GeneratedCharacter['stats']; coolName: string; japaneseSummary: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
  
  const styleToUse = data.customStyle || data.style;
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Create a cool Japanese anime version of the name "${data.name}". 
      Also create a short, engaging anime backstory (max 150 words) and RPG-style stats for this character. 
      Additionally, provide a very short summary of the backstory in Japanese (max 20 characters).
      Style: ${styleToUse}. Clothing Style: ${data.clothingStyle || 'Modern Streetwear'}. Features: ${JSON.stringify(data.features)}. Personality: ${data.personality}.
      Return the stats as Strength, Agility, Intelligence, and Spirit (values 1-100).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          coolName: { type: Type.STRING, description: "The Japanese anime version of the input name" },
          story: { type: Type.STRING },
          japaneseSummary: { type: Type.STRING, description: "A very short summary of the backstory in Japanese" },
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

export const editCharacterImage = async (imageBase64: string, editPrompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: {
      parts: [
        {
          inlineData: {
            data: imageBase64.split(',')[1],
            mimeType: "image/png",
          },
        },
        { text: editPrompt },
      ],
    },
  });

  const candidate = response.candidates?.[0];
  
  if (candidate?.finishReason === 'SAFETY') {
    throw new Error("Redigeringen blockerades av säkerhetsfilter. Gemini följer strikta regler som förbjuder generering av: \n1. Kända verkliga personer eller kändisar.\n2. Upphovsrättsskyddat material (t.ex. specifika existerande anime-karaktärer).\n3. Känsligt eller olämpligt innehåll.\n\nProva att ändra din beskrivning för att följa dessa riktlinjer.");
  }

  for (const part of candidate?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Failed to edit image");
};
