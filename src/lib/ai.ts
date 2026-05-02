import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const getAIResponse = async (message: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: message,
    });
    return response.text || "I am currently unable to process your request.";
  } catch (error) {
    console.error("AI Error:", error);
    return "Something went wrong while connecting to my brain. Please try again later.";
  }
};

export const getSmartReplies = async (message: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: message,
      config: {
        systemInstruction: "You are a smart reply assistant. Given the last message, return exactly 3 short (1-3 words) contextual replies separated by a pipe character (|). Example: Sounds good!|Thanks!|No problem.",
      }
    });
    if (response.text) {
      const replies = response.text.split('|').map(r => r.trim()).filter(r => r.length > 0);
      return replies.slice(0, 3);
    }
    return ["Okay", "Thanks!", "Got it"];
  } catch (error) {
    console.error("AI Smart Reply Error:", error);
    return ["Okay", "Thanks!", "Got it"];
  }
};

export const translateText = async (text: string, targetLanguage: string = "English"): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate the following text to ${targetLanguage}: "${text}". Return only the translated text.`,
    });
    return response.text?.trim() || "Translation failed.";
  } catch (error) {
    console.error("AI Translation Error:", error);
    return "Error during translation.";
  }
};
