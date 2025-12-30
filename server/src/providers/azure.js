import { AzureOpenAI } from "openai";
import dotenv from 'dotenv';
dotenv.config();

export async function generateSQL(query, schema, promptStart, schemaPrompt, schemaString, history) {
    try {
        const endpoint = process.env.ENDPOINT;
        const modelName = process.env.MODELNAME;
        const deployment = process.env.DEPLOYMENT;
        const apiKey = process.env.APIKEY;
        const apiVersion = process.env.APIVERSION;

        // Azure client usually needs fresh config if env changes, but typically env is static.
        // Creating new instance per request to be safe with env vars, overhead is low.
        const client = new AzureOpenAI({ endpoint, apiKey, deployment, apiVersion });

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

        messages.push({ role: "user", content: `query is: ${query} schema ${schema}` });

        const response = await client.chat.completions.create({
            messages: messages,
            max_completion_tokens: 1000,
            model: modelName
        });

        if (response?.error) {
            throw response.error;
        }

        const content = response.choices[0].message.content;
        console.log("[Azure Provider] Response:", content);
        return JSON.parse(content);

    } catch (error) {
        console.error("[Azure Provider] Error:", error);
        throw new Error(`Azure Generation Failed: ${error.message}`);
    }
}

export async function generateThinkResponse(query, results, prompt, schema) {
    try {
        const endpoint = process.env.ENDPOINT;
        const modelName = process.env.MODELNAME;
        const deployment = process.env.DEPLOYMENT;
        const apiKey = process.env.APIKEY;
        const apiVersion = process.env.APIVERSION;

        const client = new AzureOpenAI({ endpoint, apiKey, deployment, apiVersion });

        const messages = [
            { role: "system", content: `${prompt}\n\nContext Schema: ${schema}` },
            { role: "user", content: `User Query: ${query}\n\nData Results: ${JSON.stringify(results)}` }
        ];

        const response = await client.chat.completions.create({
            messages: messages,
            max_completion_tokens: 2000,
            model: modelName,
            temperature: 0.5
        });

        const text = response.choices[0].message.content;
        return { text: text };

    } catch (error) {
        console.error("[Azure Provider] Think Error:", error);
        return { text: "Failed to generate insights due to an error." };
    }
}
