import { getIronSession } from 'iron-session';
import { sessionOptions } from '../../lib/session';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const session = await getIronSession(request, {}, sessionOptions);
  let body = {};
  try { body = await request.json(); } catch (e) { }

  if (!session.dbConfig) {
    return NextResponse.json({ status: 500, error: "Not connected" });
  }

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
    const response = await fetchWithRetry('http://localhost:4000/schema', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        dbConfig: session.dbConfig
      })
    });

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("Engine Error:", error);
    return NextResponse.json({ status: 500, error: "Engine connection failed" });
  }
}
