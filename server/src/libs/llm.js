import * as GeminiProvider from '../providers/gemini.js';
import * as GroqProvider from '../providers/groq.js';
import * as AzureProvider from '../providers/azure.js';
import * as OllamaProvider from '../providers/ollama.js';
import * as LlamaCppProvider from '../providers/llamacpp.js';

export async function generateSQL(llmType, query, schema, promptStart, schemaPrompt, schemaString, history) {
    console.log(`[LLM Dispatcher] Routing to: ${llmType}`);

    try {
        if (llmType === "Local (Ollama)" || llmType === "Local") {
            return await OllamaProvider.generateSQL(query, schema, promptStart, schemaPrompt, schemaString, history);
        }
        else if (llmType === "Local (Llama.cpp)") {
            const prompt = `${promptStart}\n${schemaPrompt}\n${schemaString}\n\nUser Question: ${query}`;
            return await LlamaCppProvider.generateSQL(prompt, history);
        }
        else if (llmType === "Gemini") {
            try {
                return await GeminiProvider.generateSQL(query, schema, promptStart, schemaPrompt, schemaString, history);
            } catch (e) {
                console.warn("[LLM] Gemini failed, falling back to Local (Ollama)...");
                return await OllamaProvider.generateSQL(query, schema, promptStart, schemaPrompt, schemaString, history);
            }
        }
        else if (llmType === "Azure") {
            try {
                return await AzureProvider.generateSQL(query, schema, promptStart, schemaPrompt, schemaString, history);
            } catch (e) {
                console.warn("[LLM] Azure failed, falling back to Local (Ollama)...");
                return await OllamaProvider.generateSQL(query, schema, promptStart, schemaPrompt, schemaString, history);
            }
        }
        else {
            // Assume everything else is handled by Groq
            try {
                return await GroqProvider.generateSQL(llmType, query, schema, promptStart, schemaPrompt, schemaString, history);
            } catch (e) {
                console.warn(`[LLM] Groq (${llmType}) failed, falling back to Local (Ollama)...`);
                return await OllamaProvider.generateSQL(query, schema, promptStart, schemaPrompt, schemaString, history);
            }
        }
    } catch (err) {
        console.error("LLM Dispatch Error Final Catch:", err);
        // Last resort: If even fallback fails, we must throw
        throw err;
    }
}

export async function generateThinkResponse(llmType, query, results, prompt, schema) {
    // 1. If User explicitly chooses Gemini
    if (llmType === "Gemini") {
        try {
            return await GeminiProvider.generateThinkResponse(query, results, prompt, schema);
        } catch (error) {
            console.warn("[LLM] Gemini Think failed, falling back to Groq Llama 3...", error.message);
            return await GroqProvider.generateThinkResponse("llama3-70b-8192", query, results, prompt, schema);
        }
    }

    // 2. If User explicitly chooses a Local model (Ollama)
    else if (llmType === "Local (Ollama)" || llmType === "Local") {
        return await OllamaProvider.generateThinkResponse(query, results, prompt, schema);
    }

    // 3. If User chooses Local (Llama.cpp)
    else if (llmType === "Local (Llama.cpp)") {
        const combinedPrompt = `${prompt}\n\nUser Question: ${query}\n\nData Results:\n${JSON.stringify(results, null, 2)}`;
        return await LlamaCppProvider.generateThinkResponse(combinedPrompt, []);
    }

    // 3. Default / Groq Models (Llama 3, etc)
    else {
        return await GroqProvider.generateThinkResponse(llmType, query, results, prompt, schema);
    }
}
