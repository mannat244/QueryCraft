import { getIronSession } from 'iron-session';
import { sessionOptions } from '../../lib/session';

export async function POST(request) {
  const res = new Response(JSON.stringify({ message: "Logged out" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

  const session = await getIronSession(request, res, sessionOptions);
  session.destroy();

  return res;
}
