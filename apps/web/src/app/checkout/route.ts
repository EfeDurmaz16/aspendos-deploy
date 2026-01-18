import { Checkout } from '@polar-sh/nextjs'

/**
 * Polar Checkout Route
 * 
 * This route creates a checkout session and redirects to Polar's hosted checkout.
 * Usage: /checkout?productId=<polar_product_id>
 * 
 * Configure products in Polar Dashboard → Products
 */
export const GET = Checkout({
    accessToken: process.env.POLAR_ACCESS_TOKEN!,
    successUrl: '/billing?success=true&checkout_id={CHECKOUT_ID}',
    server: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
})
