import { getIronSession } from 'iron-session';
import { sessionOptions } from '../../lib/session';
import { NextResponse } from 'next/server';
import { AzureOpenAI } from "openai";
import { GoogleGenAI } from "@google/genai";
import { Pinecone } from '@pinecone-database/pinecone';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
import mysql from 'mysql2/promise';
const pc = new Pinecone({ apiKey: process.env.PINECONE_APIKEY });

const endpoint = process.env.ENDPOINT;
const modelName = process.env.MODELNAME;
const deployment = process.env.DEPLOYMENT;

export async function POST(request) {

  const session = await getIronSession(request, {}, sessionOptions);
  const {query , think} = await request.json()
  console.log(session.dbConfig, query)
  let connection
  if(session.dbConfig.type == "mongoDB") {
  return NextResponse.json({
    'output': "",
 'text': "😅 Oops! MongoDB support isn’t ready yet. Try MySQL for now!",
     'table': false,
  })
  } else {
  connection = await mysql.createConnection({
  host: session.dbConfig.host,
  user: session.dbConfig.user,
  database: session.dbConfig.database,
  password: session.dbConfig.password,
  port: session.dbConfig.port,
  ssl: {
    ca: process.env.DB_SSL_CA?.replace(/\\n/gm, '\n'),
  },
});
  }

const index = pc.index("schemaindex");
const model = 'multilingual-e5-large';
const embedding = await pc.inference.embed(
  model,
  [query],
  { inputType: 'query' }
);
  
 const queryResponse = await index.namespace(session.dbConfig.database).query({
  topK: 10,
  vector: embedding.data[0].values,
  includeValues: true,
  includeMetadata: true
});

console.log(queryResponse);
const usedTables = new Set();
const promptLines = queryResponse.matches.map(m => {
  const { table, text } = m.metadata;
  usedTables.add(table);
  return `- ${text}`;
});

// if you only want each table once:
const uniquePromptLines = Array.from(usedTables).map(tbl => {
  const meta = queryResponse.matches.find(m => m.metadata.table === tbl).metadata;
  return `- ${meta.text}`;
});

// build the schema block
const schemaBlock = uniquePromptLines.join("\n");

async function fetchSchemaQuoted(connection, database, maxLength = 8000) {
  // 1. Fetch columns
  const [cols] = await connection.query(
    `SELECT TABLE_NAME, COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?`,
    [database]
  );

  // 2. Group by table
  const tables = {};
  for (const { TABLE_NAME, COLUMN_NAME } of cols) {
    if (!tables[TABLE_NAME]) tables[TABLE_NAME] = [];
    tables[TABLE_NAME].push(COLUMN_NAME);
  }

  // 3. Fetch foreign-key relations
  const [rels] = await connection.query(
    `SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
    [database]
  );
  const relations = rels.map(r => ({
    from: `${r.TABLE_NAME}.${r.COLUMN_NAME}`,
    to:   `${r.REFERENCED_TABLE_NAME}.${r.REFERENCED_COLUMN_NAME}`
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
  const schemaString = await fetchSchemaQuoted(connection,session.dbConfig.database)
  console.log(schemaString)
  const schema = schemaBlock
  console.log(schema)
  const apiKey = process.env.APIKEY;
  const apiVersion = process.env.APIVERSION;
  const options = { endpoint, apiKey, deployment, apiVersion }
  const prompt = "You are QueryCraft, an intelligent AI assistant that converts natural language requests into accurate and safe MySQL queries for a MySQL database. You also return a helpful explanation for users based on the query.\n\nYour behavior must follow this structure:\n\nReturn ONLY a valid JSON object with the following fields:\n\n{\n  \"text\": string,  // A helpful message to show the user about the query or result\n  \"sql\": string, 'Do not use PostgreSQL-specific syntax like ILIKE, RETURNING, ::type, or SERIAL. Use MySQL alternatives.\n\nUse LOWER(column) LIKE instead of ILIKE for case-insensitive searches.\n\nUse backticks for identifiers (e.g., `table_name`) in MySQL if needed.\n\nDo not use FULL OUTER JOIN; MySQL doesn’t support it directly.\n\nAvoid WITH clauses unless MySQL 8.0+ is confirmed.'  // The complete SQL query string (must end with a semicolon)\n  \"table\": boolean // true if the query returns tabular data, false if not\n}\n\nSchema-awareness:\n\n- The database schema is provided to you \u2014 use table names, column names, and relationships as defined.\n- Use synonym recognition: for example, \u201cstaff\u201d means \u201cemployees\u201d if no table named \u201cstaff\u201d exists.\n- Resolve plural/singular terms, e.g., 'department' and 'departments' correctly.\n- Apply foreign key relationships to construct JOINs when needed.\n- If a table or column doesn\u2019t exist but something similar does, correct it smartly based on schema.\n\nAmbiguity handling:\n\n- If the user query is too vague or could mean multiple things, instead of guessing, return the JSON like this:\n  {\n    \"text\": \"Your question is ambiguous. Can you clarify what you mean by 'X'?\",\n    \"sql\": \"\",\n    \"table\": false\n  }\n\nAdditional rules:\n\n- Only return executable SQL \u2014 SELECT/INSERT/UPDATE/DELETE etc.\n- If the query doesn\u2019t produce a result set (like INSERT), set \"table\" to false.\n- Your response must include NO markdown, no extra commentary, and no formatting \u2014 just the JSON object.\n- Do not wrap the JSON in triple backticks.\n\nExamples:\n\nWhich employee has logged the most project hours in total?\nSELECT e.name, SUM(ep.hours_per_week) AS total_hours\nFROM employees e\nJOIN employee_projects ep ON e.emp_id = ep.emp_id\nGROUP BY e.name\nORDER BY total_hours DESC\nLIMIT 1;\n\nWho has worked under Alice Kim, either as her direct report or on her project team?\nSELECT DISTINCT e.name\nFROM employees e\nLEFT JOIN employee_projects ep ON e.emp_id = ep.emp_id\nLEFT JOIN employee_projects ep_alice ON ep_alice.emp_id = 1\nWHERE (e.manager_id = 1 OR ep.project_id = ep_alice.project_id)\nAND e.emp_id != 1;\n\nWhat\u2019s the average feedback score for each training category?\nSELECT t.category, AVG(et.feedback_score) AS avg_score\nFROM trainings t\nJOIN employee_training et ON t.training_id = et.training_id\nGROUP BY t.category;\n\nWhich project has the best ROI (revenue to budget ratio)?\nSELECT p.name, SUM(pr.revenue)/p.budget AS roi\nFROM projects p\nJOIN products pr ON p.project_id = pr.project_id\nGROUP BY p.name, p.budget\nORDER BY roi DESC\nLIMIT 1;\n\nWho are the top 3 people involved in the most projects?\nSELECT e.name, COUNT(DISTINCT ep.project_id) AS project_count\nFROM employees e\nJOIN employee_projects ep ON e.emp_id = ep.emp_id\nGROUP BY e.name\nORDER BY project_count DESC\nLIMIT 3;\n\nWhich employees have worked on projects from multiple departments?\nSELECT e.name\nFROM employees e\nJOIN employee_projects ep ON e.emp_id = ep.emp_id\nJOIN projects p ON ep.project_id = p.project_id\nGROUP BY e.name\nHAVING COUNT(DISTINCT p.dept_id) > 1;\n\nWho has completed at least one training in each of these categories: Technical, Soft Skills, and Compliance?\nSELECT e.name\nFROM employees e\nJOIN employee_training et ON e.emp_id = et.emp_id\nJOIN trainings t ON et.training_id = t.training_id\nGROUP BY e.emp_id, e.name\nHAVING COUNT(DISTINCT t.category) = 3;\n\nWho is Alice's employee ID?\nSELECT emp_id FROM employees WHERE name ILIKE '%alice%';\n\nWhat department is Bob in?\nSELECT d.name AS department\nFROM employees e\nJOIN departments d ON e.dept_id = d.dept_id\nWHERE e.name ILIKE '%bob%';\n\nShow me Charlie\u2019s projects.\nSELECT p.name\nFROM employees e\nJOIN employee_projects ep ON e.emp_id = ep.emp_id\nJOIN projects p ON p.project_id = ep.project_id\nWHERE e.name ILIKE '%charlie%';\n\nWhat trainings has Dana done?\nSELECT t.name\nFROM employees e\nJOIN employee_training et ON e.emp_id = et.emp_id\nJOIN trainings t ON et.training_id = t.training_id\nWHERE e.name ILIKE '%dana%';\n\nWhat\u2019s Fiona\u2019s feedback score?\nSELECT t.name, et.feedback_score\nFROM employees e\nJOIN employee_training et ON e.emp_id = et.emp_id\nJOIN trainings t ON et.training_id = t.training_id\nWHERE e.name ILIKE '%fiona%';\n\nWhich team is George working in?\nSELECT d.name\nFROM employees e\nJOIN departments d ON e.dept_id = d.dept_id\nWHERE e.name ILIKE '%george%';\n\nShow me all contracts with Fin in them.\nSELECT *\nFROM contracts c\nJOIN clients cl ON c.client_id = cl.client_id\nWHERE cl.name ILIKE '%fin%';\n\nAny products tied to something called quantum?\nSELECT pr.name\nFROM products pr\nJOIN projects p ON pr.project_id = p.project_id\nWHERE p.name ILIKE '%quantum%' OR pr.name ILIKE '%quantum%';\n\nWho are all the managers?\nSELECT DISTINCT m.emp_id, m.name\nFROM employees e\nJOIN employees m ON e.manager_id = m.emp_id;\n\nWhat did people think of the ethics course?\nSELECT e.name, et.feedback_score\nFROM employee_training et\nJOIN trainings t ON et.training_id = t.training_id\nJOIN employees e ON et.emp_id = e.emp_id\nWHERE t.name ILIKE '%ethics%';";
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `${query} with ${schema} complete ${schemaString}`,
    config: {
      systemInstruction: `${prompt} ${schema} complete ${schemaBlock}`,
    },
  });
  console.log(response.text);

  const cleaned = response.text
  .replace(/^```json\s*/, '')  // remove ```json and any following newlines
  .replace(/```$/, '');        // remove ending triple backticks

// Parse the JSON
const parsed = JSON.parse(cleaned);


//******* OPEN AI SDK**********/

  // const client = new AzureOpenAI(options);

  //  const response = await client.chat.completions.create({
  //   messages: [
  //     { role:"system", content: ` ${prompt}` },
  //     { role:"user", content: `query is: ${query} schema ${schema}` }
  //   ],
  //   max_completion_tokens: 1000,
  //     model: modelName
  // });

  // if (response?.error !== undefined && response.status !== "200") {
  //   throw response.error;
  // }
  // console.log(response.choices[0].message.content); 
  // const responseAI = await JSON.parse(response.choices[0].message.content);

  try {
  const [results, fields] = await connection.query(parsed.sql);

  console.log(results);
  console.log(fields); 

  if(think){
    const prompt = "You are a smart assistant that analyzes SQL query results and provides a clear, helpful explanation based on both the user's question and the data.\n\nYou receive:\n- A natural language query from the user (e.g. “show employee distribution by department”)\n- A result set in JSON format (a list of row objects from a SQL query)\n\nYour task:\n1. Understand the user's intent from their natural query.\n2. Carefully examine the data.\n3. Identify:\n   - Totals, counts, and distributions\n   - Most frequent or dominant values\n   - Groupings and relationships (e.g., departments, roles)\n   - Missing or empty results\n4. Respond with a brief, natural-sounding sentence that helps the user understand the key takeaway.\n\nGuidelines:\n- Use clear and concise English suitable for non-technical users.\n- Emphasize patterns and insights, such as “Most employees are in IT” or “Only one department has more than 5 staff.”\n- If the result is empty or the query yields no data, respond with “No data found.”\n- Return ONLY a single-line response enclosed in double quotes (escaped if needed) — e.g.:\n  \"There are 5 employees across 3 departments. Most are in IT.\"\n\n";
    const data = JSON.stringify(results);
    const thinkresponse = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `${query} with ${data}`,
    config: {
      systemInstruction: `${prompt} ${schema}`,
    },
  });
    
  

  return NextResponse.json({
    'output': results,
    "sql":parsed.sql,
    'text':thinkresponse.text.slice(1, -1),
    'table':parsed.table,
  })
  }
  
  return NextResponse.json({
    'output': results,
    "sql":parsed.sql,
    'text':parsed.text  ,
    'table':parsed.table,
  })

} catch (err) {
 
  console.log(err);
  
  return NextResponse.json({
    'output': "",
    "sql":parsed.sql,
    'text':parsed.text ,
    'table':parsed.table,
  })
}
  
}

 
   