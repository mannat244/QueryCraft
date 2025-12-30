import { generateSQL } from './llm.js';

/**
 * Safely executes a SQL query ensuring it is read-only.
 * @param {object} connection - MySQL connection object
 * @param {string} query - The SQL query to execute
 * @returns {Promise<array>} - The query results
 */
export async function runSafeSQL(connection, query) {
    if (!query) return [];

    const upperQuery = query.trim().toUpperCase();

    // Strict Safety Check: Allow only SELECT
    if (!upperQuery.startsWith('SELECT') && !upperQuery.startsWith('SHOW') && !upperQuery.startsWith('DESCRIBE')) {
        throw new Error("Safety Block: Only SELECT, SHOW, and DESCRIBE queries are allowed.");
    }

    // Double check for destructive keywords just in case they are embedded (though highly unlikely with startWith SELECT)
    // We want to allow subqueries, but prevent stacked commands like "; DROP TABLE"
    if (upperQuery.includes(';')) {
        // Basic injection prevention for stacked queries
        // A more robust parser would be better, but this is a good first line of defense for generated SQL.
        const parts = upperQuery.split(';');
        for (let part of parts) {
            const trimmed = part.trim();
            if (trimmed && !trimmed.startsWith('SELECT') && !trimmed.startsWith('SHOW') && !trimmed.startsWith('DESCRIBE')) {
                throw new Error("Safety Block: Detected potentially unsafe stacked query.");
            }
        }
    }

    // specific blocklist
    const forbidden = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'TRUNCATE', 'GRANT', 'REVOKE'];
    for (let word of forbidden) {
        // Regex to match whole word to avoid false positives safely
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        if (regex.test(query)) {
            throw new Error(`Safety Block: Forbidden keyword '${word}' detected.`);
        }
    }

    try {
        console.log(`[SafeRunner] Executing: ${query}`);
        const [rows] = await connection.query(query);
        return rows;
    } catch (err) {
        console.error("[SafeRunner] Execution Error:", err.message);
        throw err;
    }
}
