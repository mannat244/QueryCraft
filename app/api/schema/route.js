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
      let lastRes;
      try {
        const res = await fetch(url, options);
        lastRes = res;
        // If it's a 500, we might want to see the body, but retrying is usually for transient issues.
        // However, if the engine gives a 500 with a specific error (like "Database not found"), 
        // we should probably stop retrying and show it.
        if (res.ok) return res;

        const errorData = await res.json().catch(() => ({ error: `Server Error ${res.status}` }));

        if (res.status >= 500) {
          console.warn(`Fetch attempt ${i + 1} failed: ${errorData.error}. Retrying...`);
          if (i === retries - 1) {
            const err = new Error(errorData.error || `Server Error ${res.status}`);
            err.status = res.status;
            throw err;
          }
        } else {
          // Client error (4xx) - don't retry
          const err = new Error(errorData.error || `Client Error ${res.status}`);
          err.status = res.status;
          throw err;
        }
      } catch (err) {
        if (err.status && err.status < 500) throw err; // Don't retry client errors
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
    return NextResponse.json({
      status: 500,
      error: error.message || "Engine connection failed"
    }, { status: 500 });
  }
}
