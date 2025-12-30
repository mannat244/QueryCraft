import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
dotenv.config();

let pc = null;

// Only initialize Pinecone if API key is provided
if (process.env.PINECONE_APIKEY) {
    pc = new Pinecone({ apiKey: process.env.PINECONE_APIKEY });
}

export async function getRelevantTables(query, database) {
    if (!pc) {
        throw new Error('Pinecone is not configured. Add PINECONE_APIKEY to .env to use cloud vector storage.');
    }

    const index = pc.index(process.env.PINECONE_INDEX_NAME || "schemaindex");
    const model = 'multilingual-e5-large';

    const embedding = await pc.inference.embed(
        model,
        [query],
        { inputType: 'query' }
    );

    // Filter by database namespace if needed, logic borrowed from original
    const queryResponse = await index.namespace(database).query({
        topK: 10,
        vector: embedding.data[0].values,
        includeValues: true,
        includeMetadata: true
    });

    const usedTables = new Set();
    const promptLines = queryResponse.matches.map(m => {
        const { table, text } = m.metadata;
        usedTables.add(table);
        return `- ${text}`;
    });

    const uniquePromptLines = Array.from(usedTables).map(tbl => {
        const meta = queryResponse.matches.find(m => m.metadata.table === tbl).metadata;
        return `- ${meta.text}`;
    });

    return {
        text: uniquePromptLines.join("\n"),
        tables: Array.from(usedTables)
    };
}
