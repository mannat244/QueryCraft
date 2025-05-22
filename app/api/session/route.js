import { getIronSession } from 'iron-session';
import { sessionOptions } from '../../lib/session';

export async function GET(request) {
  const session = await getIronSession(request, {}, sessionOptions);
  if (!session?.dbConfig) {
    return new Response(JSON.stringify({ connected: false }), { status: 200 });
  }

  return new Response(JSON.stringify({ connected: true, dbConfig: session.dbConfig }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
