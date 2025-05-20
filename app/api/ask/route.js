import { getIronSession } from 'iron-session';
import { sessionOptions } from '../../lib/session';
import { NextResponse } from 'next/server';
import { AzureOpenAI } from "openai";
import mysql from 'mysql2/promise';

const endpoint = process.env.ENDPOINT;
const modelName = process.env.MODELNAME;
const deployment = process.env.DEPLOYMENT;

export async function POST(request) {

  const session = await getIronSession(request, {}, sessionOptions);
  const {query} = await request.json()
  console.log(session.dbConfig, query)

  const connection = await mysql.createConnection({
  host: session.dbConfig.host,
  user: session.dbConfig.user,
  database: session.dbConfig.database,
  password: session.dbConfig.password,
  port: session.dbConfig.port,
});

 async function fetchSchemaQuoted(connection, database) {
  const [cols] = await connection.query(
    `SELECT TABLE_NAME, COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?`,
    [database]
  );

  const tables = {};
  for (const { TABLE_NAME, COLUMN_NAME } of cols) {
    if (!tables[TABLE_NAME]) tables[TABLE_NAME] = [];
    tables[TABLE_NAME].push(COLUMN_NAME);
  }


  const [rels] = await connection.query(
    `SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
    [database]
  );

  const relations = rels.map(r => ({
    from: `${r.TABLE_NAME}.${r.COLUMN_NAME}`,
    to: `${r.REFERENCED_TABLE_NAME}.${r.REFERENCED_COLUMN_NAME}`
  }));

  const schema = { tables, relations };

  const raw = JSON.stringify(schema);

  const escaped = raw.replace(/"/g, '\\"');

  return `"${escaped}"`;
}

 const schema = await fetchSchemaQuoted(connection, session.dbConfig.database)
 console.log(schema)
  const apiKey = process.env.APIKEY;
  const apiVersion = process.env.APIVERSION;
  const options = { endpoint, apiKey, deployment, apiVersion }

  const client = new AzureOpenAI(options);
  const prompt = "You are QueryCraft, an AI assistant that converts natural language requests into SQL queries for a MySQL database and provides useful textual feedback.\n\Please respond ONLY with a JSON object with three fields:\n\n{\n  \"text\": string,  // A helpful message to display to the user about the query or its result\n  \"sql\": string,   // The exact SQL query string to execute (ends with a semicolon)\n  \"table\": boolean // true if the query returns tabular data, false if it doesn't (e.g. general info or no data)\n}\n\nGuidelines:\n\n- The `text` should be concise and relevant, e.g. \"Here are all departments\", or \"No data found\", or \"This request does not require a table output\".\n- The `sql` must be syntactically correct, safe, and executable on the schema.\n- Set `table` to true if the query returns rows from tables, false otherwise.\n- If the user's request is ambiguous or no suitable query exists, provide a best guess query, and set `table` accordingly.\n- Output ONLY the JSON object. No extra text, no explanations.\n\nSchema:\n${schema}\n\nUser query:\n${user_query}";

   const response = await client.chat.completions.create({
    messages: [
      { role:"system", content: ` ${prompt}` },
      { role:"user", content: `query is: ${query} schema ${schema}` }
    ],
    max_completion_tokens: 1000,
      model: modelName
  });

  if (response?.error !== undefined && response.status !== "200") {
    throw response.error;
  }
  console.log(response.choices[0].message.content); 
  const responseAI = await JSON.parse(response.choices[0].message.content);

  try {
  const [results, fields] = await connection.query(responseAI.sql);

  console.log(results);
  console.log(fields); 
  
  return NextResponse.json({
    'output': results,
    'text':responseAI.text,
    'table':responseAI.table,
  })

} catch (err) {
 
  console.log(err);
  
  return NextResponse.json({
    'output': "failed to generate a response"
  })
}
  
}

 
   