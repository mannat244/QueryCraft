export async function getRichSchema(connection, database, filterTables = null) {
    // 1. Fetch detailed column info including DATA_TYPE and KEYS
    let colSql = `
        SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLUMN_KEY 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = ?`;
    const colParams = [database];

    if (filterTables && filterTables.length > 0) {
        colSql += ` AND TABLE_NAME IN (?)`;
        colParams.push(filterTables);
    }

    const [cols] = await connection.query(colSql, colParams);

    // 2. Fetch Foreign Keys
    let relSql = `
        SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL`;
    const relParams = [database];

    const [rels] = await connection.query(relSql, relParams);

    // 3. Process and Structure Data
    const tables = {};
    const foreignKeys = {};

    // Group columns by table
    for (const { TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLUMN_KEY } of cols) {
        if (!tables[TABLE_NAME]) tables[TABLE_NAME] = [];

        let colStr = `${COLUMN_NAME} (${DATA_TYPE})`;
        if (COLUMN_KEY === 'PRI') colStr += ` [PK]`;

        tables[TABLE_NAME].push(colStr);
    }

    // Group FKs by table
    for (const r of rels) {
        if (!foreignKeys[r.TABLE_NAME]) foreignKeys[r.TABLE_NAME] = [];
        foreignKeys[r.TABLE_NAME].push(`${r.COLUMN_NAME} -> ${r.REFERENCED_TABLE_NAME}.${r.REFERENCED_COLUMN_NAME}`);
    }

    // 4. Enrich with Semantic Descriptions (from Vector Index)
    // We need to fetch the "description" stored in the metadata for each table.
    // Since we are in schema.js, we can try to query the local index for metadata.
    try {
        const { LocalIndex } = await import('vectra');
        const path = await import('path');
        const index = new LocalIndex(path.join(process.cwd(), 'data', 'vectra_index'));

        if (await index.isIndexCreated()) {
            // We can't easily "get all" from vectra without a query. 
            // Hack: query with a zero vector or iterate known tables?
            // Better: 'listItems' if available, or just rely on 'getDesc' helper.
            // Since we don't have a direct key-value store, we might skip this for now 
            // OR we can assume descriptions are critical and we SHOULD fetch them.
            // Let's rely on the file system for now or the fact that we just generated them.

            // Actually, we can use the 'tables' list and do a quick lookup if we had a KV store.
            // Vector store is not a KV store. 
            // PLAN B: During 'Sync', we could save a `schema_descriptions.json` file for fast lookup here.

            // For now, let's just make sure the PROMPT gets the vector block IF it exists.
            // But wait, 'ask.js' passes 'schemaString' which is built here.
            // If we don't put descriptions here, they are lost.
        }
    } catch (e) {
        // Ignore vector loading errors
    }

    return { tables, foreignKeys };
}

export async function fetchSchemaQuoted(connection, database, maxLength = 25000, filterTables = null) {
    const { tables, foreignKeys } = await getRichSchema(connection, database, filterTables);

    // *NEW*: Load descriptions from a JSON file (KV store) to be reliable?
    // Or just query the vector store for each table? (Too slow)
    // Let's READ the `vectra` index directly? No.

    // SOLUTION: We will load descriptions from `data/schema_descriptions.json` if it exists.
    // I need to update `schema.js` (the route) to save this file during Sync.
    let descriptions = {};
    try {
        const fs = await import('fs');
        const path = await import('path');
        const descPath = path.join(process.cwd(), 'data', 'schema_descriptions.json');
        if (fs.existsSync(descPath)) {
            descriptions = JSON.parse(fs.readFileSync(descPath, 'utf8'));
        }
    } catch (e) { /* ignore */ }

    // Build Rich Text Representation
    const lines = Object.entries(tables).map(([table, cols]) => {
        let block = `Table: ${table}\nColumns:\n`;
        block += cols.map(c => `  - ${c}`).join('\n');

        if (descriptions[table]) {
            block += `\nDescription: ${descriptions[table]}`;
        }

        // Append FKs directly to the table block
        if (foreignKeys[table]) {
            block += `\nForeign Keys:\n`;
            block += foreignKeys[table].map(fk => `  - ${fk}`).join('\n');
        }
        return block;
    });

    // Join and Clean
    let schemaString = lines.join('\n\n');

    // Truncate
    if (schemaString.length > maxLength) {
        schemaString = schemaString.slice(0, maxLength - 100) + '\n...[Truncated]';
    }

    return { schemaString };
}