import express from 'express';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

import { getRelevantTables } from '../libs/pinecone.js';
import { getRelevantTablesLocal } from '../libs/vectra.js';
import { fetchSchemaQuoted } from '../libs/schema.js';
import { PROMPT_START, PROMPT_SCHEMA_AWARENESS, THINK_PROMPT, INVESTIGATE_PROMPT, FINAL_PROMPT } from '../libs/prompts.js';
import { generateSQL, generateThinkResponse } from '../libs/llm.js';
import { runSafeSQL } from '../libs/sqlRunner.js';

dotenv.config();

const router = express.Router();

async function createDBConnection(dbConfig) {
    console.log("Connecting to DB:", { ...dbConfig, password: dbConfig.password ? "****" : "MISSING" });
    return await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        database: dbConfig.database,
        password: dbConfig.password,
        port: dbConfig.port,
        multipleStatements: true, // Needed for potential setup, but runSafeSQL checks split queries
        ...(dbConfig.ssl && {
            ssl: {
                ca: process.env.DB_SSL_CA?.replace(/\\n/gm, '\n'),
            }
        })
    });
}

router.post('/', async (req, res) => {
    const { query, think, llm, vectorStore, dbConfig, history } = req.body;
    let connection;

    // Set up Streaming Headers
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');

    const sendLog = (msg) => {
        console.log(`[AskRoute Log] ${msg}`);
        res.write(JSON.stringify({ type: 'log', message: msg }) + '\n');
    };

    const sendError = (msg) => {
        console.error(`[AskRoute Error] ${msg}`);
        res.write(JSON.stringify({ type: 'error', message: msg }) + '\n');
        res.end();
    };

    try {
        if (!dbConfig) throw new Error("Database configuration matching session is required.");
        if (dbConfig.type == "mongoDB") throw new Error("MongoDB support isn't ready yet.");

        sendLog("Connecting to database...");
        connection = await createDBConnection(dbConfig);

        console.log(`[AskRoute] Mode: ${think ? "AGENTIC THINKING" : "FAST SQL"}`);
        sendLog(`Mode: ${think ? "Agentic (Safe) Mode" : "Fast Mode"}`);

        // 1. Check Table Count & Fetch Schema
        const rows = await runSafeSQL(connection, 'SELECT COUNT(*) as count FROM information_schema.TABLES WHERE TABLE_SCHEMA = "' + dbConfig.database + '"');
        const tableCount = rows[0].count;

        let schemaBlock = "";
        let filterTables = null;

        if (tableCount < 50) {
            sendLog("Fetching full schema...");
        } else {
            sendLog("Large DB detected. Using vector search for relevant tables...");
            let retrievedBlock;
            if (vectorStore === 'Pinecone') {
                retrievedBlock = await getRelevantTables(query, dbConfig.database);
            } else {
                retrievedBlock = await getRelevantTablesLocal(query, dbConfig.database);
            }
            schemaBlock = retrievedBlock.text;
            filterTables = retrievedBlock.tables;
        }

        const { schemaString } = await fetchSchemaQuoted(connection, dbConfig.database, 20000, filterTables);
        sendLog("Schema loaded.");

        let finalResults = [];
        let finalSql = "";
        let finalText = "";
        let isTable = false;

        let invResults = []; // Declare in outer scope for use throughout

        // --- AGENTIC LOOP (Think Mode) ---
        if (think) {
            sendLog("Starting Agentic Investigation...");

            // Step 1: Investigate
            const invResponse = await generateSQL(llm, query, schemaBlock, INVESTIGATE_PROMPT, PROMPT_SCHEMA_AWARENESS, schemaString, history);
            const invSql = invResponse.sql;

            if (invSql) {
                sendLog(`Investigation Query: ${invSql}`);
                try {
                    invResults = await runSafeSQL(connection, invSql);
                    sendLog(`Found ${invResults.length} matching rows.`);

                    // Step 2: Final Query based on investigation
                    const investigationContext = `\n\n[INVESTIGATION RESULTS]:\n${JSON.stringify(invResults.slice(0, 50))}`;

                    sendLog("Refining final query...");
                    const finalResponse = await generateSQL(llm, query + investigationContext, schemaBlock, FINAL_PROMPT, PROMPT_SCHEMA_AWARENESS, schemaString, history);
                    finalSql = finalResponse.sql;
                    finalText = finalResponse.text;

                } catch (e) {
                    console.error("[Investigate] Failed:", e.message);
                    sendLog(`Investigation failed: ${e.message}. Falling back...`);
                    finalText = "Investigation failed, falling back to direct query.";
                    const fallback = await generateSQL(llm, query, schemaBlock, PROMPT_START, PROMPT_SCHEMA_AWARENESS, schemaString, history);
                    finalSql = fallback.sql;
                }
            } else {
                sendLog("No investigation needed.");
                finalText = invResponse.text;
            }

        } else {
            // --- STANDARD FAST MODE ---
            sendLog("Generating SQL...");
            const response = await generateSQL(llm, query, schemaBlock, PROMPT_START, PROMPT_SCHEMA_AWARENESS, schemaString, history);
            finalSql = response.sql;
            finalText = response.text;
        }

        // --- EXECUTE FINAL SQL ---
        if (finalSql) {
            sendLog(`Executing: ${finalSql}`);
            try {
                finalResults = await runSafeSQL(connection, finalSql);
                isTable = true;
                sendLog(`Execution complete. Found ${finalResults.length} results.`);
            } catch (e) {
                console.error("[FinalExecution] Error:", e.message);
                finalText = `Error executing SQL: ${e.message}`;
                sendLog(`Execution error: ${e.message}`);
            }
        }

        // --- GENERATE INSIGHTS (If Think Mode used) ---
        if (think && finalSql && finalResults.length > 0) {
            sendLog("Generating deep insights...");
            const insightResponse = await generateThinkResponse(
                llm,
                query,
                finalResults.slice(0, 100),
                THINK_PROMPT,
                schemaBlock || "Full Schema Context"
            );
            finalText = insightResponse.text;
        } else if (think && finalSql && finalResults.length === 0) {
            // If investigation found results but final query didn't, use investigation results for analysis
            sendLog("Final query returned no results. Using investigation data for analysis...");
            if (invResults && invResults.length > 0) {
                const insightResponse = await generateThinkResponse(
                    llm,
                    query,
                    invResults.slice(0, 100),
                    THINK_PROMPT,
                    schemaBlock || "Full Schema Context"
                );
                finalText = insightResponse.text;
            } else {
                finalText = "No records found matching your query.";
            }
        }

        await connection.end();

        // Final Response - Use investigation results if final query returned nothing
        res.write(JSON.stringify({
            type: 'result',
            data: {
                'output': finalResults.length > 0 ? finalResults : (invResults || []),
                "sql": finalSql,
                'text': finalText,
                'table': isTable || (invResults && invResults.length > 0),
            }
        }) + '\n');

        res.end();

    } catch (err) {
        if (connection) await connection.end();
        sendError(err.message || "An unexpected error occurred.");
    }
});

export default router;
