import { LocalIndex } from 'vectra';
import { pipeline, env } from '@huggingface/transformers';
import path from 'path';
import fs from 'fs';

// Configure transformers to use a local cache directory
// This avoids permission issues within node_modules on some systems
const cacheDir = path.join(process.cwd(), '.cache');
if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
}
env.cacheDir = cacheDir;

// Fix: Use data directory strictly inside the server structure
const index = new LocalIndex(path.join(process.cwd(), 'data', 'vectra_index'));

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

    // Filter by database
    const results = await index.queryItems(vector, 10, { "database": { "$eq": database } });

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
