import fetch from 'node-fetch';
import { Groq } from 'groq-sdk';

/**
 * Generates rich semantic descriptions for ALL database tables in a single batch request.
 * 
 * @param {Object} schemas - Dictionary of { tableName: { columns, foreignKeys } }
 * @param {Object} config - { provider, apiKey, model, baseUrl }
 * @returns {Promise<Object>} - Dictionary of { tableName: description }
 */
export async function generateBulkDescriptions(schemas, config = {}) {
    // 1. Construct Bulk Prompt
    let schemaText = "";
    for (const [table, info] of Object.entries(schemas)) {
        schemaText += `Table: ${table}\nColumns: ${info.columns.join(', ')}\n`;
        if (info.samples) {
            schemaText += `Sample Values: ${info.samples}\n`;
        }
        schemaText += `\n`;
    }

    const refinedPrompt = `
You are a database expert.
Task: Generate a short, keyword-dense description for EACH table in the provided schema.
Format: Return a VALID JSON object where keys are table names and values are descriptions.

Requirements:
- Max 25 words per description.
- USE THE SAMPLE VALUES to identify the content (e.g. if sample contains 'Fundraising', mention 'Fundraising').
- Include synonyms (e.g. 'income' -> revenue, sales, donations).
- DO NOT add markdown formatting. Output raw JSON only.

Schema:
${schemaText}
    `.trim();

    // 2. Call Groq
    try {
        const apiKey = config.apiKey || process.env.GROQ_API_KEY;
        if (apiKey) {
            console.log(`[LLM Client] Generating BULK descriptions via Groq...`);
            const response = await callGroq(refinedPrompt, apiKey, config.model || 'llama-3.1-8b-instant', true);
            return JSON.parse(response);
        }
    } catch (e) {
        console.warn(`[LLM Client] Groq Bulk failed. Falling back to Ollama...`, e.message);
    }

    // 3. Fallback to Ollama (Iterative or Bulk dependent on model capability)
    // For simplicity in fallback, we might just return empty or try one big request too.
    try {
        const response = await callOllamaOrLocal(refinedPrompt, config);
        return JSON.parse(response);
    } catch (e) {
        console.error("[LLM Client] Bulk Gen Failed:", e.message);
        return {};
    }
}

async function callGroq(prompt, apiKey, model, jsonMode = false) {
    const client = new Groq({ apiKey });

    const chatCompletion = await client.chat.completions.create({
        "messages": [{ "role": "user", "content": prompt + (jsonMode ? "\nRespond in JSON." : "") }],
        "model": model,
        "temperature": 0.1,
        "response_format": jsonMode ? { type: "json_object" } : undefined
    });

    return chatCompletion.choices[0]?.message?.content?.trim() || "";
}

async function callOllamaOrLocal(prompt, config) {
    const baseUrl = config.baseUrl ? config.baseUrl.replace(/\/$/, '') : 'http://localhost:11434';
    const model = process.env.LOCAL_MODEL || 'llama3';

    // Try Standard /v1/chat/completions
    try {
        const response = await fetch(`${baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', content: prompt }],
                model: model,
                temperature: 0.1,
                max_tokens: 150,
                stream: false
            })
        });

        if (response.ok) {
            const data = await response.json();
            return data.choices[0]?.message?.content?.trim() || "";
        }
    } catch (e) {
        // Ignore and try native
    }

    // Fallback to Native /api/generate
    const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: model,
            prompt: prompt,
            stream: false
        })
    });

    if (!response.ok) {
        throw new Error(`Ollama Error: ${response.status}`);
    }

    const data = await response.json();
    return data.response?.trim() || "";
}
