import Groq from "groq-sdk";
import dotenv from 'dotenv';
dotenv.config();

let groqClient = null;

function getClient() {
    if (!groqClient) {
        groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }
    return groqClient;
}

export async function listModels() {
    const client = getClient();
    const response = await client.models.list();
    return response.data;
}

export async function generateSQL(llmType, query, schema, promptStart, schemaPrompt, schemaString, history) {
    try {
        // Use the llmType directly as it comes from the dynamic list (e.g., "llama3-70b-8192")
        // If it's a legacy name, we might want a map, but for now trusting the ID.
        let model = llmType || "llama3-70b-8192";

        // Legacy Fallback (optional, can remove if we trust frontend only sends IDs now)
        if (model === "Llama 3.1 8B") model = "llama-3.1-8b-instant";
        if (model === "Llama 3 70B") model = "llama3-70b-8192";
        if (model === "Gemma 2 9B") model = "gemma2-9b-it";

        const client = getClient();

        let messages = [
            { "role": "system", "content": `${promptStart} ${schema} ${schemaPrompt}` }
        ];

        // ADD HISTORY (Memory)
        if (history && Array.isArray(history)) {
            history.forEach(msg => {
                // Ensure role is valid (user/assistant) and content exists
                if (msg.role && msg.content) {
                    messages.push({ "role": msg.role, "content": msg.content });
                }
            });
        }

        // Add current user query
        messages.push({ "role": "user", "content": `${query} , you have to strictly follow the schema: ${schema} complete ${schemaString}` });

        const chatCompletion = await client.chat.completions.create({
            "messages": messages,
            "model": model,
            "temperature": 0.6,
            "max_completion_tokens": 4096,
            "top_p": 0.95,
            "stream": false,
            "response_format": { "type": "json_object" },
            "stop": null
        });

        const content = chatCompletion.choices[0].message.content;
        console.log("[Groq Provider] Response:", content);

        try {
            return JSON.parse(content);
        } catch {
            // Handle failed generation with error block if present, or re-throw
            if (chatCompletion.error) {
                return JSON.parse(chatCompletion.error.failed_generation);
            }
            throw new Error("Failed to parse Groq JSON response");
        }
    } catch (error) {
        console.error("[Groq Provider] Error:", error);
        throw new Error(`Groq Generation Failed: ${error.message}`);
    }
}

export async function generateThinkResponse(llmType, query, results, prompt, schema) {
    try {
        const client = getClient();
        // Use provided model or default to 70b for reasoning
        let model = llmType || "llama3-70b-8192";

        // Handle Friendly Names -> IDs mapping (similar to generateSQL)
        if (model === "Llama 3.1 8B") model = "llama-3.1-8b-instant";
        if (model === "Llama 3 70B") model = "llama3-70b-8192";
        if (model === "Gemma 2 9B") model = "gemma2-9b-it";
        // If "Groq" generic was passed, default to 70b
        if (model === "Groq") model = "llama3-70b-8192";

        const messages = [
            { "role": "system", "content": `${prompt} \n\n Context Schema: ${schema}` },
            { "role": "user", "content": `User Query: ${query} \n\n Data Results: ${JSON.stringify(results)}` }
        ];

        const chatCompletion = await client.chat.completions.create({
            "messages": messages,
            "model": model,
            "temperature": 0.5,
            "max_completion_tokens": 4096,
            "top_p": 1,
            "stream": false,
            "stop": null
        });

        const text = chatCompletion.choices[0].message.content;
        return { text: text };

    } catch (error) {
        console.error("[Groq Provider] Think Error:", error);
        return { text: "Failed to generate insights due to an error." };
    }
}
