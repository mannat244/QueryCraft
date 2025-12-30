import express from 'express';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';
import { upsertItemLocal } from '../libs/vectra.js';

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
    const { vectorStore, dbConfig } = req.body;
    let connection;

    try {
        connection = await createDBConnection(dbConfig);

        const [cols] = await connection.query(
            `SELECT TABLE_NAME, COLUMN_NAME
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = ?`,
            [dbConfig.database]
        );

        const tables = {};
        for (const { TABLE_NAME, COLUMN_NAME } of cols) {
            if (!tables[TABLE_NAME]) tables[TABLE_NAME] = [];
            tables[TABLE_NAME].push(COLUMN_NAME);
        }

        const dbName = dbConfig.database;
        const tableTexts = Object.entries(tables).map(([table, columns]) => ({
            id: `${dbName}_${table}`,
            text: `Table: ${table}, Columns: ${columns.join(", ")}`,
            table,
            columns
        }));

        await connection.end();

        if (vectorStore === 'Local' || !vectorStore) {
            // Default to Local
            for (const t of tableTexts) {
                await upsertItemLocal(t.text, { table: t.table }, dbName);
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
                    database: dbName
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
