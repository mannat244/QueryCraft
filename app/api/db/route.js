const { NextResponse } = require("next/server");
import { getIronSession } from 'iron-session';
import { sessionOptions } from '../../lib/session';

export async function POST(request) {
    
    const response = NextResponse.json({'status':'200'});
    
    let data;
    let MongoDB = false;
    
    try{
             data = await request.json();

    } catch {
             data = await request.text;
             MongoDB = true;
    }


    const session = await getIronSession(request, response ,sessionOptions);

    if (MongoDB) {
        session.dbConfig = {
            "url": data,
            "type": "mongoDB",
        };
    }
    else {
        session.dbConfig = data;
    }

    await session.save(response)

    console.log(data)

   return response;
}
