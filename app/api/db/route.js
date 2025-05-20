const { NextResponse } = require("next/server");
import { getIronSession } from 'iron-session';
import { sessionOptions } from '../../lib/session';

export async function POST(request) {


    const response = NextResponse.json({'status':'200'});

    const data = await request.json();

    const session = await getIronSession(request, response ,sessionOptions);

    session.dbConfig = data;

    await session.save(response)

    console.log(data)

   return response;
}
