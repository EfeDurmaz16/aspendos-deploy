import { NextRequest, NextResponse } from 'next/server';

/**
 * Checkout API Route
 * Handles checkout redirects and Polar integration
 */

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const tier = searchParams.get('tier') || 'pro';
    const cycle = searchParams.get('cycle') || 'monthly';

    // Redirect to pricing page with tier parameter
    return NextResponse.redirect(
        new URL(`/pricing?tier=${tier}&cycle=${cycle}`, request.url)
    );
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Forward to billing API
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const response = await fetch(`${apiUrl}/api/billing/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Cookie: request.headers.get('cookie') || '',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('Checkout error:', error);
        return NextResponse.json(
            { error: 'Checkout processing failed' },
            { status: 500 }
        );
    }
}
