export async function fetchSchemaQuoted(connection, database, maxLength = 10000, filterTables = null) {
    // 1. Fetch columns
    let colSql = `SELECT TABLE_NAME, COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ?`;
    const colParams = [database];

    if (filterTables && filterTables.length > 0) {
        colSql += ` AND TABLE_NAME IN (?)`;
        colParams.push(filterTables);
    }

    const [cols] = await connection.query(colSql, colParams);

    // 2. Group by table
    const tables = {};
    for (const { TABLE_NAME, COLUMN_NAME } of cols) {
        if (!tables[TABLE_NAME]) tables[TABLE_NAME] = [];
        tables[TABLE_NAME].push(COLUMN_NAME);
    }

    // 3. Fetch foreign-key relations
    let relSql = `SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL`;
    const relParams = [database];

    if (filterTables && filterTables.length > 0) {
        relSql += ` AND (TABLE_NAME IN (?) OR REFERENCED_TABLE_NAME IN (?))`;
        relParams.push(filterTables);
        relParams.push(filterTables);
    }

    const [rels] = await connection.query(relSql, relParams);

    const relations = rels.map(r => ({
        from: `${r.TABLE_NAME}.${r.COLUMN_NAME}`,
        to: `${r.REFERENCED_TABLE_NAME}.${r.REFERENCED_COLUMN_NAME}`
    }));

    // 4. Build schema lines
    const lines = Object.entries(tables).map(
        ([table, cols]) => `- ${table}(${cols.join(', ')})`
    );

    // 5. Join and escape backticks/backslashes
    let schemaString = lines.join('\n')
        .replace(/\\/g, '\\\\')   // escape backslashes
        .replace(/`/g, '\\`');        // escape backticks

    // 6. Truncate to safe length
    if (schemaString.length > maxLength) {
        schemaString = schemaString.slice(0, maxLength - 3) + '...';
    }

    return { schemaString, relations };
}
