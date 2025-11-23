import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

try {
  if (process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  } else {
    console.warn("Gemini API Key not found in environment variables.");
  }
} catch (e) {
  console.error("Failed to initialize Gemini client", e);
}

export const generateAICommentary = async (event: string, playerName: string, score: number): Promise<string> => {
  if (!ai) return "AI Offline: Good luck!";

  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      You are a hype-man esports commentator for a blockchain snake game called Kudoku.
      
      Event: ${event}
      Player: ${playerName}
      Current Score: ${score} (SLITH tokens)
      
      Generate a very short, punchy, 1-sentence commentary reaction. Use emojis. 
      If the event is 'GAME_OVER', be encouraging but sarcastic. 
      If 'KILL', be hyped.
      If 'START', welcome them to the blockchain.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        temperature: 0.9,
        maxOutputTokens: 60,
      }
    });

    return response.text || "Let's go! 🚀";
  } catch (error: any) {
    // Handle Quota Limits and Rate Limits Gracefully
    // Checks for various shapes of the 429 error from Google APIs
    const isQuotaError = 
        error?.status === 429 || 
        error?.code === 429 || 
        error?.message?.includes('429') || 
        error?.message?.includes('Quota') ||
        error?.message?.includes('RESOURCE_EXHAUSTED') ||
        error?.error?.code === 429 ||
        error?.error?.status === 'RESOURCE_EXHAUSTED';

    if (isQuotaError) {
         console.debug("Gemini Quota/Limit Exceeded - using fallback.");
         const fallbacks = [
             "The network is congested! 🚦", 
             "Gas fees are peaking! ⛽", 
             "Whales are moving markets! 🐋",
             "HODL your position! 🛡️",
             "Market volatility is high! 📉",
             "Consensus mechanism busy... 🤖"
         ];
         return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
    
    console.error("Gemini generation error:", error);
    return "Connection interrupted... but the blockchain never sleeps! 🔗";
  }
};