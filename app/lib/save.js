import { getIronSession } from 'iron-session';
import { sessionOptions } from '../../lib/session';
import { NextResponse } from 'next/server';
import { AzureOpenAI } from "openai"; 
import ollama from 'ollama'

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
  const {query , think, llm} = await request.json()

  let local_response;
  let parsed_local;
  let response;
  

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
  ...(session.dbConfig.ssl && {
    ssl: {
      ca: process.env.DB_SSL_CA?.replace(/\\n/gm, '\n'),
    }
  })
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

async function fetchSchemaQuoted(connection, database, maxLength = 1600) {
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
  
const prompt = `
Schema-awareness:
- Identifiers are case-sensitive; always use exact table and column name casing as provided in the embedded schema.
- The user will embed the database schema at the top of the prompt (e.g., listing tables and columns); always review that embedded schema before generating any SQL.
- Use table names, column names, and relationships as defined in the schema.
- Recognize synonyms like "staff" meaning "employees" if no such table exists.
- Resolve plural/singular terms like "department" vs. "departments".
- Refer to actual column names before writing joins.
- Use foreign key relationships to construct JOINs.
- If a table/column doesn't exist but something similar does, correct it smartly based on the schema.

Ambiguity handling:
If the query is too vague or can mean multiple things, return:
{
  "text": "Your question is ambiguous. Can you clarify what you mean by 'X'?",
  "sql": "",
  "table": false
}
Example:
User input: "Show me results by department"
Response:
{
  "text": "Your question is ambiguous. Can you clarify what you mean by 'results by department'?",
  "sql": "",
  "table": false
}

Additional rules:
- Only return executable SQL: SELECT / INSERT / UPDATE / DELETE, etc.
- If the query doesn’t produce a result set (like INSERT), set "table" to false.
- Response must include NO markdown, no extra commentary, and no formatting — just the JSON object.
- Do not wrap the JSON in triple backticks.

Examples:

Which employee has logged the most project hours in total?  
SELECT e.name, SUM(ep.hours_per_week) AS total_hours  
FROM employees e  
JOIN employee_projects ep ON e.emp_id = ep.emp_id  
GROUP BY e.name  
ORDER BY total_hours DESC  
LIMIT 1;

Who has worked under Alice Kim, either as her direct report or on her project team?  
SELECT DISTINCT e.name  
FROM employees e  
LEFT JOIN employee_projects ep ON e.emp_id = ep.emp_id  
LEFT JOIN employee_projects ep_alice ON ep_alice.emp_id = 1  
WHERE (e.manager_id = 1 OR ep.project_id = ep_alice.project_id)  
AND e.emp_id != 1;

What’s the average feedback score for each training category?  
SELECT t.category, AVG(et.feedback_score) AS avg_score  
FROM trainings t  
JOIN employee_training et ON t.training_id = et.training_id  
GROUP BY t.category;

Which project has the best ROI (revenue to budget ratio)?  
SELECT p.name, SUM(pr.revenue)/p.budget AS roi  
FROM projects p  
JOIN products pr ON p.project_id = pr.project_id  
GROUP BY p.name, p.budget  
ORDER BY roi DESC  
LIMIT 1;

Who are the top 3 people involved in the most projects?  
SELECT e.name, COUNT(DISTINCT ep.project_id) AS project_count  
FROM employees e  
JOIN employee_projects ep ON e.emp_id = ep.emp_id  
GROUP BY e.name  
ORDER BY project_count DESC  
LIMIT 3;

Which employees have worked on projects from multiple departments?  
SELECT e.name  
FROM employees e  
JOIN employee_projects ep ON e.emp_id = ep.emp_id  
JOIN projects p ON ep.project_id = p.project_id  
GROUP BY e.name  
HAVING COUNT(DISTINCT p.dept_id) > 1;

Who has completed at least one training in each of these categories: Technical, Soft Skills, and Compliance?  
SELECT e.name  
FROM employees e  
JOIN employee_training et ON e.emp_id = et.emp_id  
JOIN trainings t ON et.training_id = t.training_id  
GROUP BY e.emp_id, e.name  
HAVING COUNT(DISTINCT t.category) = 3;

Who is Alice's employee ID?  
SELECT emp_id FROM Employees WHERE FirstName LIKE '%Alice%' OR LastName LIKE '%Alice%';

What department is Bob in?  
SELECT d.DepartmentName AS department  
FROM Employees e  
JOIN Departments d ON e.DepartmentID = d.DepartmentID  
WHERE LOWER(e.FirstName) = 'bob' OR LOWER(e.LastName) = 'bob';

Any products tied to something called quantum?  
SELECT pr.ProductName  
FROM Products pr  
JOIN Projects p ON pr.ProjectID = p.ProjectID  
WHERE p.ProjectName LIKE '%quantum%' OR pr.ProductName LIKE '%quantum%';

Who are all the managers?  
SELECT DISTINCT m.EmployeeID, m.FirstName, m.LastName  
FROM Employees e  
JOIN Employees m ON e.ReportsTo = m.EmployeeID;

What did people think of the ethics course?  
SELECT e.FirstName, e.LastName, et.FeedbackScore  
FROM Employee_Training et  
JOIN Trainings t ON et.TrainingID = t.TrainingID  
JOIN Employees e ON et.EmployeeID = e.EmployeeID  
WHERE t.CourseName LIKE '%ethics%';

Show me our top 3 best-selling products by total revenue generated:  
SELECT p.ProductName,  
       SUM(oi.Quantity * oi.UnitPriceAtSale) AS TotalRevenueGenerated  
FROM Products p  
JOIN OrderItems oi ON p.ProductID = oi.ProductID  
GROUP BY p.ProductName  
ORDER BY TotalRevenueGenerated DESC  
LIMIT 3;

Show me last month’s total sales:  
SELECT SUM(oi.Quantity * oi.UnitPriceAtSale) AS LastMonthSales  
FROM OrderItems oi  
JOIN SalesOrders o ON oi.OrderID = o.OrderID  
WHERE MONTH(o.OrderDate) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH)  
  AND YEAR(o.OrderDate) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH);

Which product sold the most units last month:  
SELECT p.ProductName,  
       SUM(oi.Quantity) AS UnitsSold  
FROM OrderItems oi  
JOIN Products p ON oi.ProductID = p.ProductID  
JOIN SalesOrders o ON oi.OrderID = o.OrderID  
WHERE MONTH(o.OrderDate) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH)  
  AND YEAR(o.OrderDate) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH)  
GROUP BY p.ProductName  
ORDER BY UnitsSold DESC
LIMIT 1;`;

if(llm == "local"){
      
      local_response = await ollama.generate({
      model: 'gemma3:4b',
       prompt:`The user query is: ${query} , you have to strictly (even the case) follow the schema: complete ${schemaString}`,
       system: `${prompt}, keep names of table exact as schema the database schema is ${schemaBlock}`,
       format: "json",
    })
    console.log(local_response.response)
    const cleaned = local_response.response
      // .replace(/^```json\s*/, '')  // remove ```json and any following newlines
      // .replace(/```$/, '');        // remove ending triple backticks

    // Parse the JSON
    parsed_local = JSON.parse(cleaned);
}


   response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `${query} , you have to strictly follow the schema: ${schema} complete ${schemaString}`,
    config: {
      systemInstruction: `
You are QueryCraft, an intelligent AI assistant that converts natural language requests into accurate and safe MySQL queries for a MySQL database. You also return a helpful explanation for users based on the query.

Your behavior must follow this structure:

Return ONLY a valid JSON object with the following fields:

{ "text": string, // A helpful message to show the user about the query or result
  "sql": string,// The complete SQL query string (must end with a semicolon)
  "table": boolean // true if the query returns tabular data, false if not }

SQL Rules:
- Do not use PostgreSQL-specific syntax like ILIKE, RETURNING, ::type, or SERIAL.
- Use LOWER(column) LIKE for case-insensitive searches.
- Use backticks for identifiers (e.g., \\\`table_name\\\`) in MySQL if needed.
- Do not use FULL OUTER JOIN; MySQL doesn’t support it directly.
- Avoid WITH clauses unless MySQL 8.0+ is confirmed.
- STRICTLY use exact table and column name casing as provided in the embedded schema.

You will follow the following schema for returing response ${schema} ${prompt}` ,
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

  let parsed_query;

  if(llm == "local"){
    parsed_query = parsed_local.sql;
    console.log(parsed_query)
  } else {
    parsed_query = parsed.sql;
    console.log(parsed_query)
  }

 

  try {
  
  

  const [results, fields] = await connection.query(parsed_query);

  console.log(results);
  console.log(fields); 

  if(think){
      const prompt = "You are an intelligent data analyst that transforms SQL query results into clear, actionable insights. You receive structured data (JSON format) from database queries and translate findings into natural language explanations that anyone can understand.\n\nInputs You'll Receive:\n1. User's Question: A natural language query expressing what the user wants to know\n2. Data Results: JSON array containing the query results from the database\n\nYour Analysis Process:\n\n1. Understand Context & Intent\n- Parse the user's question to identify their core information need\n- Determine what type of analysis they're seeking (trends, comparisons, summaries, specific values)\n- Consider the business context and what would be most valuable to highlight\n\n2. Analyze the Data Systematically\n- Identify key metrics and dimensions in the dataset\n- Detect patterns and trends (increases, decreases, cyclical patterns, outliers)\n- Find meaningful comparisons (top performers, bottom performers, relative differences)\n- Note temporal aspects (most recent data, time-based changes, seasonality)\n- Calculate implicit insights (percentages, ratios, growth rates) when relevant\n- Assess data quality (completeness, potential gaps, anomalies)\n\n3. Prioritize Insights\n- Lead with the most direct answer to the user's question\n- Highlight unexpected or surprising findings\n- Include context that makes numbers meaningful (e.g., \"20% increase\" vs \"20% increase, the highest in 3 years\")\n\n4. Structure Your Response\n- Primary Answer: Direct response to the user's question with key findings\n- Supporting Details: Additional context, breakdowns, or notable patterns\n- Follow-up Questions (when appropriate): Relevant questions that could provide deeper insights\n\nResponse Format:\nProvide responses in plain, conversational English that a non-technical person can easily understand. Use specific numbers and concrete details rather than vague statements.\n\nStructure:\n- Main insights and findings\n- Supporting details and context\n- \\n (newline separator if including follow-up questions)\n- Questions: [comma-separated list of relevant follow-up questions]\n\nSpecial Cases:\n- Empty/No Data: Respond exactly with \"No data found.\"\n- Insufficient Data: Acknowledge limitations while providing what insights are possible\n- Complex Results: Break down into digestible pieces, focusing on what matters most\n\nQuality Standards:\n- Be specific and quantitative rather than vague\n- Provide context that makes numbers meaningful\n- Avoid technical jargon, JSON notation, code snippets, or formatted tables\n- Ensure insights are actionable and relevant to the user's needs\n- Maintain a helpful, professional tone throughout\n- ALWAYS respond with plain text string only - no markdown, no formatting, no code blocks\n- Your entire response must be a single plain text string that can be directly displayed to users\n\nRemember: Your goal is to make data accessible and actionable for users who may not have technical or analytical backgrounds, while ensuring accuracy and relevance to their specific questions. Your response must always be plain text suitable for direct string output."

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
      'text':thinkresponse.text,
      'table':parsed.table,
    })
  }
  
   if(llm == "local"){
        return NextResponse.json({
        'output': results,
        "sql":parsed_local.sql,
        'text':parsed_local.text,
        'table':parsed_local.table,
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
    'err':JSON.stringify(err),
    "sql":parsed.sql,
    'text':parsed.text ,
    'table':parsed.table,
  })
}
  
}

 
   