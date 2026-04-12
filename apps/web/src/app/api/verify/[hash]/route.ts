import { NextResponse } from 'next/server';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ hash: string }> },
) {
    const { hash } = await params;

    if (!hash || hash.length < 8) {
        return NextResponse.json({ error: 'Invalid hash' }, { status: 400 });
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

    try {
        const response = await fetch(`${apiUrl}/audit/verify/${hash}`, {
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Commit not found', hash },
                { status: 404 },
            );
        }

        const data = await response.json();
        return NextResponse.json({
            verified: true,
            hash,
            signer_did: data.did,
            signature: data.signature,
            timestamp: data.timestamp,
            tool_name: data.tool_name,
            reversibility_class: data.reversibility_class,
        });
    } catch {
        return NextResponse.json(
            {
                verified: false,
                hash,
                note: 'Verification service unavailable — commit may still be valid',
            },
            { status: 503 },
        );
    }
}
