import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        // Get request body if provided
        const body = await request.json().catch(() => ({}));

        // Proxy to the Express backend
        const res = await fetch('http://localhost:4000/llm/stop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        // Handle non-JSON responses from backend
        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error("Backend returned non-JSON:", text);
            return NextResponse.json({ error: "Backend Error: Invalid Response" }, { status: 502 });
        }

        if (!res.ok) {
            return NextResponse.json({ error: data.error || "Failed to stop" }, { status: res.status });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Proxy Error:", error);
        return NextResponse.json({ error: "Proxy Error: " + error.message }, { status: 500 });
    }
}
