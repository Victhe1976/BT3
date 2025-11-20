import { GoogleGenAI, Type } from "@google/genai";
import { IndividualRanking, TeamSuggestion } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // Garante que a aplicação não inicialize se a chave API estiver faltando
  throw new Error("A chave API_KEY não está configurada no ambiente.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const getBalancedRankingSuggestion = async (): Promise<string> => {
  try {
    const prompt = `
      Suggest a ranking formula for an amateur beach tennis league that rewards participation but still prioritizes winning.
      The goal is to avoid penalizing players who play many more games than others and might accumulate more losses.
      Provide a clear formula and a brief explanation of why it's a good approach for a friendly, amateur setting.
      Format the response in Markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    if (response.text === undefined) {
      throw new Error("Resposta da API Gemini está vazia.");
    }

    return response.text;
  } catch (error) {
    console.error("Error fetching ranking suggestion from Gemini:", error);
    return "Failed to get a suggestion from the AI. Please check your API key and network connection.";
  }
};


export const getBalancedTeamSuggestion = async (attendedPlayers: IndividualRanking[]): Promise<TeamSuggestion> => {
    const prompt = `
      Act as an expert beach tennis coach and tournament organizer.
      You are given a list of amateur players available for today's games, along with their performance score and win rate.
      Your task is to create the most balanced and competitive doubles teams possible to ensure fun and exciting matches.
      
      Here are the players available today:
      ${JSON.stringify(attendedPlayers.map(p => ({ name: p.name, performanceScore: p.performanceScore.toFixed(1), winRate: p.winRate.toFixed(1) })))}

      Based on this data, please suggest pairs and matchups.
      Try to pair stronger players with weaker ones to balance the teams.
      Provide a brief rationale for your suggestions.
      You MUST return ONLY a JSON object that strictly follows the provided schema. Do not include any other text, markdown, or explanations outside of the JSON structure.
    `;
    
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
          matchups: {
            type: Type.ARRAY,
            description: "An array of suggested matchups.",
            items: {
              type: Type.OBJECT,
              properties: {
                teamA: {
                  type: Type.OBJECT,
                  properties: {
                    player1: { type: Type.STRING, description: "Name of the first player in Team A." },
                    player2: { type: Type.STRING, description: "Name of the second player in Team A." },
                  },
                  required: ["player1", "player2"],
                },
                teamB: {
                  type: Type.OBJECT,
                  properties: {
                    player1: { type: Type.STRING, description: "Name of the first player in Team B." },
                    player2: { type: Type.STRING, description: "Name of the second player in Team B." },
                  },
                  required: ["player1", "player2"],
                },
              },
              required: ["teamA", "teamB"],
            },
          },
          rationale: {
            type: Type.STRING,
            description: "A brief explanation for the suggested pairings and matchups.",
          },
        },
        required: ["matchups", "rationale"],
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            }
        });

        if (response.text === undefined) {
            throw new Error("Resposta da API Gemini está vazia.");
        }

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as TeamSuggestion;
    } catch (error) {
        console.error("Error fetching team suggestion from Gemini:", error);
        throw new Error("Failed to get a suggestion from the AI. Please check your API key, network connection, and prompt compliance.");
    }
};