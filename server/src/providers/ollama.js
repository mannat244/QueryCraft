import ollama from 'ollama';
import dotenv from 'dotenv';
dotenv.config();

export async function generateSQL(query, schema, promptStart, schemaPrompt, schemaString, history) {
    try {
        let messages = [
            { role: "system", content: `${promptStart} ${schema} ${schemaPrompt}` }
        ];

        // ADD HISTORY
        if (history && Array.isArray(history)) {
            history.forEach(msg => {
                if (msg.role && msg.content) {
                    messages.push({ role: msg.role, content: msg.content });
                }
            });
        }

        messages.push({ role: "user", content: `The user query is: ${query} schema: ${schemaString}` });

        const response = await ollama.chat({
            model: process.env.LOCAL_MODEL || 'llama2',
            messages: messages,
            format: "json",
        });

        console.log("[Ollama Provider] Response:", response.message.content);
        return JSON.parse(response.message.content);

    } catch (error) {
        console.error("[Ollama Provider] Error:", error);
        throw new Error(`Ollama Generation Failed: ${error.message}`);
    }
}

export async function generateThinkResponse(query, results, prompt, schema) {
    try {
        const messages = [
            { role: "system", content: `${prompt}\n\nContext Schema: ${schema}` },
            { role: "user", content: `User Query: ${query}\n\nData Results: ${JSON.stringify(results)}` }
        ];

        const response = await ollama.chat({
            model: process.env.LOCAL_MODEL || 'llama2',
            messages: messages,
        });

        const text = response.message.content;
        return { text: text };

    } catch (error) {
        console.error("[Ollama Provider] Think Error:", error);
        return { text: "Failed to generate insights due to an error." };
    }
}
