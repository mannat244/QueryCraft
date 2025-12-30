import os from 'os';

/**
 * Ensures essential environment variables have sensible defaults for local development.
 * This enables "Zero-Config" operation where the app can run without a .env file.
 */
export function applyDefaults() {
    // Session Security
    if (!process.env.SESSION_PASSWORD) {
        process.env.SESSION_PASSWORD = 'querycraft_local_development_secret_32_chars_min';
    }

    // Server Port
    if (!process.env.PORT) {
        process.env.PORT = '4000';
    }

    // DB Defaults (for the pre-fill in the UI)
    if (!process.env.DB_HOST) process.env.DB_HOST = 'localhost';
    if (!process.env.DB_PORT) process.env.DB_PORT = '3306';
    if (!process.env.DB_USER) process.env.DB_USER = 'root';

    // LLM Defaults
    if (!process.env.LOCAL_MODEL) {
        process.env.LOCAL_MODEL = 'gemma-3-4b-it.gguf';
    }

    // Hardware Optimization Defaults
    if (!process.env.THREADS) {
        process.env.THREADS = '8';
    }

    console.log("[Config] Zero-Config defaults applied.");
}
