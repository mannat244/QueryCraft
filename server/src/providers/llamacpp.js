import { PROMPT_START, THINK_PROMPT, injectTemporalContext } from '../libs/prompts.js';

// Configuration
const BASE_URL = "http://127.0.0.1:8080/v1/chat/completions";
const MODEL_NAME = process.env.LLAMA_CPP_MODEL || "gemma-3-4b-it"; // Configurable via .env

async function callLlamaCpp(messages, max_tokens = 1000, timeoutMs = 120000) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(BASE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: messages,
                max_tokens: max_tokens,
                temperature: 0.1 // Low temp for SQL accuracy
            })
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Llama.cpp] HTTP ${response.status}: ${errorText}`);
            throw new Error(`Llama.cpp Error: ${response.status} ${response.statusText}. Is the server running?`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";

    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error(`Llama.cpp request timed out after ${timeoutMs / 1000}s. Try reducing complexity or enabling GPU.`);
        }
        if (error.cause && error.cause.code === 'ECONNREFUSED') {
            throw new Error("Llama.cpp Connection Refused. Ensure 'llama-server' is running on port 8080.");
        }
        throw error;
    }
}

export async function generateSQL(prompt, history = []) {
    // Construct messages with history
    const messages = [
        { role: "system", content: injectTemporalContext(PROMPT_START) },
        ...history,
        { role: "user", content: prompt }
    ];

    // Reduced max_tokens for faster SQL generation (500 is enough for most queries)
    const text = await callLlamaCpp(messages, 500, 60000); // 60s timeout

    // Clean markdown if present
    const jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/) || text.match(/(\{[\s\S]*?\})/);

    try {
        return JSON.parse(jsonMatch ? jsonMatch[1] : text);
    } catch (e) {
        console.error("Llama.cpp JSON Parse Error:", text);
        // Fallback if strict JSON parsing fails
        return { text: "I couldn't parse the response from the local model.", sql: "", table: false };
    }
}

export async function generateThinkResponse(prompt, history = []) {
    const messages = [
        { role: "system", content: injectTemporalContext(THINK_PROMPT) },
        ...history,
        { role: "user", content: prompt }
    ];

    // Reduced from 4000 to 1500 for faster Think Mode responses
    const responseText = await callLlamaCpp(messages, 1500, 180000); // 3min timeout
    return { text: responseText };
}
