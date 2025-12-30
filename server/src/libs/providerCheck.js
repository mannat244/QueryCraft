// Helper to check which LLM providers are available based on environment variables
export function getAvailableProviders() {
    const providers = {
        ollama: true, // Always available (local)
        llamacpp: true, // Always available (local)
        gemini: !!process.env.GEMINI_API_KEY,
        groq: !!process.env.GROQ_API_KEY,
        azure: !!(process.env.AZURE_ENDPOINT && process.env.AZURE_API_KEY)
    };

    return providers;
}

export function validateProvider(provider) {
    const available = getAvailableProviders();

    switch (provider) {
        case 'Gemini':
            if (!available.gemini) {
                throw new Error('Gemini API key not configured. Set GEMINI_API_KEY in .env');
            }
            break;
        case 'Azure':
            if (!available.azure) {
                throw new Error('Azure credentials not configured. Set AZURE_ENDPOINT and AZURE_API_KEY in .env');
            }
            break;
        case 'Local (Ollama)':
            // Always available, but could check if Ollama is running
            break;
        case 'Local (Llama.cpp)':
            // Always available
            break;
        default:
            // Groq models
            if (!available.groq) {
                throw new Error('Groq API key not configured. Set GROQ_API_KEY in .env');
            }
    }
}
