import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const res = await fetch('http://localhost:4000/models', {
            next: { revalidate: 60 } // Cache for 60 seconds
        });

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('[Models API] Error:', error.message);
        return NextResponse.json({ models: [], error: error.message });
    }
}
