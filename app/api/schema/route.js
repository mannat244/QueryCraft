import { getIronSession } from 'iron-session';
import { sessionOptions } from '../../lib/session';
import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { GoogleGenAI } from "@google/genai";
import { Pinecone } from '@pinecone-database/pinecone';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const pc = new Pinecone({ apiKey: process.env.PINECONE_APIKEY });

export async function POST(request) {
  const session = await getIronSession(request, {}, sessionOptions);

  const connection = await mysql.createConnection({
    host:     session.dbConfig.host,
    user:     session.dbConfig.user,
    database: session.dbConfig.database,
    password: session.dbConfig.password,
    port:     session.dbConfig.port,
...(session.dbConfig.ssl && {
    ssl: {
      ca: process.env.DB_SSL_CA?.replace(/\\n/gm, '\n'),
    }
  })
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
      to:   `${r.REFERENCED_TABLE_NAME}.${r.REFERENCED_COLUMN_NAME}`
    }));

    return { tables, relations };
  }

  const dbName = session.dbConfig.database;
  const parsedSchema = await fetchSchemaQuoted(connection, dbName);

  const tableTexts = Object.entries(parsedSchema.tables).map(([table, columns]) => ({
    id:      `${dbName}_${table}`,
    text:    `Table: ${table}, Columns: ${columns.join(", ")}`,
    table,
    columns
  }));

  const textsToEmbed = tableTexts.map(t => t.text);
  const model = 'multilingual-e5-large';

  const embeddings = await pc.inference.embed(
    model,
    textsToEmbed,
    { inputType: 'passage', truncate: 'END' }
  );

  console.log(embeddings[0]);
  console.log(embeddings);

  const indexName = process.env.INDEX_NAME;
  const embeddedData = embeddings.data;

  const vectors = embeddedData.map((item, i) => ({
    id:      tableTexts[i].id,
    values:  item.values,
    metadata: {
      text:     tableTexts[i].text,
      table:    tableTexts[i].table,
      database: dbName
    }
  }));


  const index = pc.index(indexName);
  await index.namespace(dbName).upsert(vectors);

  return NextResponse.json({ status: '200' });
}
