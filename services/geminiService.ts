import { GoogleGenAI, Type } from "@google/genai";
import { OHLC, AIAnalysisResult } from "../types";

const initGenAI = () => {
  // In a real app, this key should be securely handled.
  // For this demo, we assume the user might provide it or it's in env.
  const apiKey = process.env.API_KEY || ''; 
  if (!apiKey) {
    console.warn("No API Key found. AI features will fail.");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeChartPattern = async (symbol: string, data: OHLC[]): Promise<AIAnalysisResult> => {
  const ai = initGenAI();
  
  // Take last 30 days for pattern analysis
  const recentData = data.slice(-30).map(d => ({
    d: d.date,
    o: d.open,
    h: d.high,
    l: d.low,
    c: d.close,
    v: d.volume,
    ma20: d.ma20,
    ma200: d.ma200
  }));

  const prompt = `
  Analyze the following OHLC stock data for Taiwan Stock ${symbol}.
  Focus on the "Kristjan Qullamaggie" breakout strategy.
  
  Key Criteria to look for:
  1. Is price surfing above the 10-day or 20-day MA?
  2. Is there a "Coiling" pattern (tight consolidation with decreasing volume)?
  3. Is this a "First Pullback" after a major breakout?
  
  Data (Last 30 candles):
  ${JSON.stringify(recentData)}
  
  Return a structured JSON assessment.
  The 'pattern' and 'explanation' fields must be in Traditional Chinese (繁體中文).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment: { type: Type.STRING, enum: ['Bullish', 'Bearish', 'Neutral'] },
            pattern: { type: Type.STRING },
            explanation: { type: Type.STRING },
            score: { type: Type.INTEGER, description: "0-100 rating of the setup quality" }
          },
          required: ['sentiment', 'pattern', 'explanation', 'score']
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AIAnalysisResult;
    }
    throw new Error("Empty response from AI");

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // Fallback for demo if no API key or error
    return {
      sentiment: 'Neutral',
      pattern: '分析服務暫時無法使用',
      explanation: '請確認 API Key 設定或網路連線。 (' + (error as Error).message + ')',
      score: 0
    };
  }
};