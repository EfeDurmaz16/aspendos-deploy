import { Checkout } from '@polar-sh/nextjs';
import type { NextRequest } from 'next/server';

/**
 * Polar Checkout Route
 *
 * This route creates a checkout session and redirects to Polar's hosted checkout.
 * Usage: /checkout?productId=<polar_product_id>
 *
 * Configure products in Polar Dashboard → Products
 */
const polarCheckout = Checkout({
    accessToken: process.env.POLAR_ACCESS_TOKEN!,
    successUrl: '/billing?success=true&checkout_id={CHECKOUT_ID}',
    server: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
});

export function GET(request: NextRequest, context: { params: Promise<Record<string, never>> }) {
    void context;
    return polarCheckout(request as never) as Response | Promise<Response>;
}
