import { GoogleGenAI } from "@google/genai";
import { ParsedSheet } from "../types";

// Initialize Gemini
// Note: In a real app, ensure process.env.API_KEY is available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeDataWithGemini = async (
  query: string,
  currentSheet: ParsedSheet,
  history: { role: string; text: string }[] = []
): Promise<string> => {
  try {
    // We need to limit the context size. We will send the headers and a sample of the data.
    // Sending huge Excel files directly in JSON can exhaust tokens quickly.
    const maxRows = 30;
    const dataSample = currentSheet.data.slice(0, maxRows);
    
    const contextString = `
      CONTEXTO DE DATOS (Hoja: ${currentSheet.name}):
      Columnas: ${currentSheet.columns.join(', ')}
      Muestra de datos (primeras ${maxRows} filas en formato JSON):
      ${JSON.stringify(dataSample)}
      
      Total de filas en el archivo real: ${currentSheet.data.length}
      
      INSTRUCCIONES:
      Eres un analista de datos experto. Responde a la pregunta del usuario basándote en los datos proporcionados.
      Si la respuesta requiere cálculos sobre el total de datos y solo tienes una muestra, explica claramente cómo harías el cálculo o da una estimación basada en la muestra, aclarando que es una muestra.
      Responde en español, usando formato Markdown para tablas o listas si es necesario.
    `;

    const model = 'gemini-2.5-flash';
    
    // Construct the chat history for context
    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: contextString,
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }))
    });

    const response = await chat.sendMessage({
        message: query
    });

    return response.text || "No se pudo generar una respuesta.";

  } catch (error: any) {
    console.error("Error calling Gemini:", error);
    return `Error al conectar con Gemini: ${error.message || 'Error desconocido'}`;
  }
};