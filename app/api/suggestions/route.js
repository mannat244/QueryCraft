import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();

        const res = await fetch('http://localhost:4000/suggestions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            cache: 'no-store'
        });

        if (!res.ok) {
            throw new Error('Backend suggestions endpoint failed');
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Suggestions API error:', error);
        // Return fallback suggestions
        return NextResponse.json({
            suggestions: [
                "What is the average salary?",
                "Show me all employees",
                "How many records are in each table?"
            ]
        });
    }
}
