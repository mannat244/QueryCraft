import { getIronSession } from 'iron-session';
import { sessionOptions } from '../../lib/session';

export async function GET(request) {
  const session = await getIronSession(request, {}, sessionOptions);

  if (!session?.dbConfig) {
    // Return environment defaults if available
    const defaults = {
      host: process.env.DB_HOST || "",
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || "",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || ""
    };

    // Only return if at least host and user are provided
    if (defaults.host && defaults.user) {
      return new Response(JSON.stringify({ connected: false, defaults }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ connected: false }), { status: 200 });
  }

  return new Response(JSON.stringify({ connected: true, dbConfig: session.dbConfig }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
