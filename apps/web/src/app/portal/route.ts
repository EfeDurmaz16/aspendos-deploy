import { CustomerPortal } from '@polar-sh/nextjs'
import { auth } from '@/lib/auth'
import { prisma } from '@aspendos/db'

/**
 * Polar Customer Portal Route
 * Opens Polar's customer portal for managing subscriptions.
 */
export const GET = CustomerPortal({
    accessToken: process.env.POLAR_ACCESS_TOKEN!,
    server: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
    getCustomerId: async () => {
        const session = await auth()

        if (!session?.userId) {
            throw new Error('User not authenticated')
        }

        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            include: { billingAccount: true }
        })

        return user?.billingAccount?.polarCustomerId || ''
    },
})
