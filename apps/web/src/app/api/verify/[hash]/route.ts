import { NextResponse } from 'next/server';

export async function GET(_request: Request, { params }: { params: Promise<{ hash: string }> }) {
    const { hash } = await params;

    if (!hash || hash.length < 8) {
        return NextResponse.json({ error: 'Invalid hash' }, { status: 400 });
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

    try {
        const response = await fetch(`${apiUrl}/audit/verify/${hash}`, {
            headers: { 'Content-Type': 'application/json' },
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
            return NextResponse.json(
                {
                    verified: false,
                    hash,
                    error: data?.error ?? 'Commit verification failed',
                },
                { status: response.status }
            );
        }

        if (data?.verified !== true) {
            return NextResponse.json(
                { verified: false, hash, error: 'Commit verification failed' },
                { status: 502 }
            );
        }

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
                error: 'Verification service unavailable',
            },
            { status: 503 }
        );
    }
}
