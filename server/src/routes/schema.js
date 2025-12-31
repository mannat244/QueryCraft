import express from 'express';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';
import { upsertItemLocal, resetIndex } from '../libs/vectra.js';
import { getRichSchema } from '../libs/schema.js';

dotenv.config();

const router = express.Router();

// Create MySQL Connection Helper (Read-Only focus)
async function createDBConnection(dbConfig) {
    return await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        database: dbConfig.database,
        password: dbConfig.password,
        port: dbConfig.port,
        ...(dbConfig.ssl && {
            ssl: {
                ca: process.env.DB_SSL_CA?.replace(/\\n/gm, '\n'),
            }
        })
    });
}

router.post('/', async (req, res) => {
    const { vectorStore } = req.body;
    // Fallback: Use request body config OR Environment variables
    const dbConfig = req.body.dbConfig || {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'evaldb',
        port: parseInt(process.env.DB_PORT || 3306),
        ssl: process.env.DB_SSL === 'true'
    };

    // Force Enable AI Description if API Key exists
    const llmConfig = req.body.llmConfig || (process.env.GROQ_API_KEY ? {
        provider: 'groq',
        apiKey: process.env.GROQ_API_KEY,
        model: 'llama-3.1-8b-instant'
    } : null);

    let connection;

    try {
        connection = await createDBConnection(dbConfig);
        const dbName = dbConfig.database;

        // 1. Get Rich Schema (Columns + Foreign Keys)
        const { tables, foreignKeys } = await getRichSchema(connection, dbName);

        const tableTexts = [];

        // 2. Process each table
        for (const [table, columns] of Object.entries(tables)) {
            // Build Base Text
            let text = `Table: ${table}\nColumns: ${columns.join(", ")}`;

            // Add Foreign Keys if any
            const fks = foreignKeys[table];
            if (fks && fks.length > 0) {
                text += `\nForeign Keys: ${fks.join(", ")}`;
            }

            tableTexts.push({
                id: `${dbName}_${table}`,
                text: text,
                table,
                description: ""
            });
        }

        // 3. Generate LLM Descriptions (Bulk) with DATA SAMPLING
        if (llmConfig) {
            console.log("[Schema] Sampling data for better descriptions...");

            // Prepare schemas object
            const allSchemas = {};

            for (const [table, columns] of Object.entries(tables)) {
                // DATA SAMPLING STRATEGY:
                // Find first 3 string columns (likely to hold categorical info)
                const stringCols = columns
                    .filter(c => c.includes('varchar') || c.includes('text') || c.includes('char'))
                    .map(c => c.split(' ')[0]) // Extract column name "source" from "source (varchar)"
                    .slice(0, 3);

                let sampleValues = [];
                if (stringCols.length > 0) {
                    try {
                        // Safe query to get distinct values for context
                        // e.g. "source: Fundraising, Donation"
                        for (const col of stringCols) {
                            const [rows] = await connection.query(`SELECT DISTINCT ${col} FROM ${table} WHERE ${col} IS NOT NULL LIMIT 3`);
                            const vals = rows.map(r => r[col]).filter(v => v && v.toString().length < 50); // Filter out long texts
                            if (vals.length > 0) {
                                sampleValues.push(`${col}: [${vals.join(', ')}]`);
                            }
                        }
                    } catch (err) {
                        console.warn(`[Schema] Failed to sample ${table}:`, err.message);
                    }
                }

                allSchemas[table] = {
                    columns,
                    foreignKeys: foreignKeys[table],
                    samples: sampleValues.join('; ')
                };
            }

            console.log("[Schema] Generating Bulk Descriptions...");
            const { generateBulkDescriptions } = await import('../libs/llm_client.js');
            const descriptions = await generateBulkDescriptions(allSchemas, llmConfig);

            // Assign descriptions back to each table
            for (const t of tableTexts) {
                if (descriptions[t.table]) {
                    // Append samples to the description so they appear in Prompt Context
                    const samples = allSchemas[t.table]?.samples || "";
                    const descText = descriptions[t.table];

                    // Format: "Description text. (Samples: col: [val], ...)"
                    const finalDesc = samples ? `${descText} (Samples: ${samples})` : descText;

                    t.description = finalDesc;
                    t.text += `\nDescription: ${finalDesc}`; // Update vector text

                    // Update the map for JSON saving
                    descriptions[t.table] = finalDesc;
                }
            }

            // Save descriptions to a JSON file for Schema/Prompt Context usage (Fast Lookup)
            try {
                const fs = await import('fs');
                const path = await import('path');
                const descPath = path.join(process.cwd(), 'data', 'schema_descriptions.json');
                fs.writeFileSync(descPath, JSON.stringify(descriptions, null, 2));
                console.log(`[Schema] Saved table descriptions to ${descPath}`);
            } catch (saveErr) {
                console.warn("[Schema] Failed to save descriptions JSON:", saveErr.message);
            }
        }

        await connection.end();

        // 4. Vector Store Upsert
        // 4. Vector Store Upsert
        if (vectorStore === 'Local' || !vectorStore) {
            // Reset Index for fresh start (Avoid Duplicates)
            try {
                console.log("[SchemaRoute] Resetting Local Vector Index...");
                await resetIndex();
            } catch (resetErr) {
                console.error("[SchemaRoute] Warning: Failed to reset index, proceeding...", resetErr);
            }

            // Default to Local
            for (const t of tableTexts) {
                await upsertItemLocal(t.text, {
                    table: t.table,
                    description: t.description
                }, dbName);
            }
            return res.json({ status: '200', message: "Synced to Local Vector Store" });
        } else {
            // Pinecone
            const pc = new Pinecone({ apiKey: process.env.PINECONE_APIKEY });
            const textsToEmbed = tableTexts.map(t => t.text);
            const model = 'multilingual-e5-large';

            const embeddings = await pc.inference.embed(
                model,
                textsToEmbed,
                { inputType: 'passage', truncate: 'END' }
            );

            const indexName = process.env.INDEX_NAME || "schemaindex";
            const embeddedData = embeddings.data;
            const vectors = embeddedData.map((item, i) => ({
                id: tableTexts[i].id,
                values: item.values,
                metadata: {
                    text: tableTexts[i].text,
                    table: tableTexts[i].table,
                    database: dbName,
                    description: tableTexts[i].description
                }
            }));

            const index = pc.index(indexName);
            await index.namespace(dbName).upsert(vectors);

            return res.json({ status: '200' });
        }

    } catch (err) {
        console.error("[SchemaRoute] Error:", err.message);
        if (connection) await connection.end();
        return res.status(500).json({
            status: '500',
            error: err.message || "Database synchronization failed"
        });
    }
});

export default router;
