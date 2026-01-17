import { CustomerPortal } from '@polar-sh/nextjs'
import { auth } from '@clerk/nextjs/server'

/**
 * Polar Customer Portal Route
 * 
 * This route opens Polar's customer portal for managing subscriptions.
 * The user must be authenticated (handled by middleware).
 */
export const GET = CustomerPortal({
    accessToken: process.env.POLAR_ACCESS_TOKEN!,
    server: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
    getCustomerId: async (req) => {
        // Get the current user's Polar customer ID from our database
        const { userId } = await auth()

        if (!userId) {
            throw new Error('User not authenticated')
        }

        // TODO: Look up the Polar customer ID from our database
        // const user = await db.user.findUnique({
        //   where: { clerkId: userId },
        //   include: { billingAccount: true }
        // })
        // return user?.billingAccount?.polarCustomerId || ''

        // For now, return empty string (will be updated when db is connected)
        return ''
    },
})
