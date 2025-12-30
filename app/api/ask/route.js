import { getIronSession } from 'iron-session';
import { sessionOptions } from '../../lib/session';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const session = await getIronSession(request, {}, sessionOptions);
  const body = await request.json();

  if (!session.dbConfig) {
    return NextResponse.json({ text: "Not connected to database.", table: false });
  }

  // Forward request to Node.js Engine
  const fetchWithRetry = async (url, options, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, options);
        if (!res.ok && res.status >= 500) throw new Error(`Server Error: ${res.status}`);
        return res;
      } catch (err) {
        console.warn(`Fetch attempt ${i + 1} failed: ${err.message}. Retrying in ${delay}ms...`);
        if (i === retries - 1) throw err;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  try {
    const response = await fetch('http://localhost:4000/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        dbConfig: session.dbConfig
      })
    });

    // Proxy the stream directly
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Transfer-Encoding': 'chunked'
      }
    });

  } catch (error) {
    console.error("Engine Error:", error);
    return NextResponse.json({
      text: "Failed to contact AI Engine. Is the server running?",
      err: error.message,
      table: false
    }, { status: 500 });
  }
}
