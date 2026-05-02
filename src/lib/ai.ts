import { GoogleGenAI, ThinkingLevel, Type, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const getAIResponse = async (message: string, history: { role: string; parts: { text: string }[] }[] = []): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [...history, { role: "user", parts: [{ text: message }] }],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });
    return response.text || "I am currently unable to process your request.";
  } catch (error) {
    console.error("AI Error:", error);
    return "Something went wrong while connecting to my brain. Please try again later.";
  }
};

export const analyzeImage = async (base64Image: string, prompt: string = "What is in this image?"): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { data: base64Image.split(',')[1] || base64Image, mimeType: "image/png" } }
          ]
        }
      ]
    });
    return response.text || "I couldn't analyze the image.";
  } catch (error) {
    console.error("Image Analysis Error:", error);
    return "Error analyzing the image.";
  }
};

export const generateAIImage = async (prompt: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("AI Image Generation Error:", error);
    return null;
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

export const summarizeConversation = async (messages: string[]): Promise<string> => {
  try {
    const conversation = messages.join("\n");
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Summarize the following conversation in a few bullet points:\n\n${conversation}`,
    });
    return response.text?.trim() || "Summary failed.";
  } catch (error) {
    console.error("AI Summary Error:", error);
    return "Error generating summary.";
  }
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return `data:audio/wav;base64,${base64Audio}`;
    }
    return null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};

export const magicRewrite = async (text: string, tone: string = "more professional"): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Rewrite the following message to be ${tone}. Keep it concise and suitable for a chat app: "${text}". Return only the rewritten text.`,
    });
    return response.text?.trim() || text;
  } catch (error) {
    console.error("Magic Rewrite Error:", error);
    return text;
  }
};
