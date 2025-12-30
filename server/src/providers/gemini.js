import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config();

// Singleton instance
let aiClient = null;

function getClient() {
    if (!aiClient) {
        aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return aiClient;
}

export async function generateSQL(query, schema, promptStart, schemaPrompt, schemaString, history) {
    try {
        const client = getClient();

        // Construct History Context
        let historyContext = "";
        if (history && Array.isArray(history)) {
            historyContext = "Chat History:\n" + history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n") + "\n\n";
        }

        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `${historyContext} ${query} , you have to strictly follow the schema: ${schema} complete ${schemaString}`,
            config: {
                systemInstruction: `${promptStart} ${schema} ${schemaPrompt}`,
            },
        });

        // Clean response - Google GenAI SDK `response` object handling varies by version.
        // The previous code used `response.text`.
        // Inspecting: `response.text` string property or `response.text()` function? 
        // In the error stack of previous turn, it accessed `response.text`.
        // I will keep `response.text` if that's what was working, or safely check.
        const textOutput = typeof response.text === 'function' ? response.text() : response.text;

        const cleaned = textOutput
            .replace(/^```json\s*/, '')
            .replace(/```$/, '');

        return JSON.parse(cleaned);
    } catch (error) {
        console.error("[Gemini Provider] Error:", error);
        throw new Error(`Gemini Generation Failed: ${error.message}`);
    }
}

export async function generateThinkResponse(query, results, prompt, schema) {
    try {
        const client = getClient();
        const data = JSON.stringify(results);
        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `${query} with ${data}`,
            config: {
                systemInstruction: `${prompt} ${schema}`,
            },
        });

        // Extract text properly and return in expected format
        const textOutput = typeof response.text === 'function' ? response.text() : response.text;
        return { text: textOutput };
    } catch (error) {
        console.error("[Gemini Provider] Think Error:", error);
        return { text: "Failed to generate insights due to an error." };
    }
}
