import { LocalIndex } from 'vectra';
import { pipeline, env } from '@huggingface/transformers';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Configure transformers to use a local cache directory
// This avoids permission issues within node_modules on some systems
const cacheDir = path.join(process.cwd(), '.cache');
if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
}
env.cacheDir = cacheDir;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fix: Resolve 'data' directory relative to THIS file (server/src/libs/vectra.js)
// Go up 2 levels: libs -> src -> server, then into 'data'
const dataPath = path.resolve(__dirname, '..', '..', 'data', 'vectra_index');

// Ensure parent data dir exists
if (!fs.existsSync(path.dirname(dataPath))) {
    fs.mkdirSync(path.dirname(dataPath), { recursive: true });
}

const index = new LocalIndex(dataPath);

let extractor = null;

async function getExtractor() {
    if (!extractor) {
        try {
            extractor = await pipeline('feature-extraction', 'sentence-transformers/all-MiniLM-L6-v2');
        } catch (err) {
            console.error("[Vectra] Failed to load embedding model:", err);
            throw err;
        }
    }
    return extractor;
}

export async function getRelevantTablesLocal(query, database) {
    if (!(await index.isIndexCreated())) {
        await index.createIndex();
        return "";
    }

    const pipe = await getExtractor();
    const output = await pipe(query, { pooling: 'mean', normalize: true });
    const vector = Array.from(output.data);

    // Relaxed Query: Fetch more candidates, filter manually for robustness
    console.log(`[Vectra] Querying for '${database}' (Manual Filter Loop)`);

    // Fetch top 50 to ensure we find our relevant items even if there's noise
    const rawResults = await index.queryItems(vector, 50);

    // Manual Filter
    const results = rawResults.filter(r => {
        return r.item.metadata && r.item.metadata.database === database;
    }).slice(0, 10); // Take top 10 after filtering

    if (results.length > 0) {
        const usedTables = new Set();
        const promptLines = results.map(r => {
            if (!r.item.metadata) return "";
            const { table, text } = r.item.metadata;
            if (table) usedTables.add(table);
            return `- ${text}`;
        }).filter(line => line !== "");

        return {
            text: promptLines.join("\n"),
            tables: Array.from(usedTables)
        };
    }

    return { text: "", tables: [] };
}

export async function upsertItemLocal(text, metadata, database) {
    if (!(await index.isIndexCreated())) {
        await index.createIndex();
    }
    const pipe = await getExtractor();
    const output = await pipe(text, { pooling: 'mean', normalize: true });
    const vector = Array.from(output.data);

    await index.insertItem({
        vector,
        metadata: { ...metadata, text, database }
    });
}

export async function resetIndex() {
    const indexPath = dataPath;
    try {
        if (fs.existsSync(indexPath)) {
            fs.rmSync(indexPath, { recursive: true, force: true });
        }
    } catch (e) {
        console.error("[Vectra] Failed to delete old index (locked?):", e.message);
    }

    // Always ensure index exists
    if (!(await index.isIndexCreated())) {
        await index.createIndex();
    }
}
