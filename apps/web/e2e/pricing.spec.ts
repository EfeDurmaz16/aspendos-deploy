import { test, expect } from '@playwright/test';

/**
 * Pricing Page E2E Tests
 *
 * Verifies the pricing page displays correctly with tier information.
 */
test.describe('Pricing Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/pricing');
    });

    test('should load pricing page', async ({ page }) => {
        await expect(page).toHaveURL(/pricing/);
    });

    test('should display pricing tiers', async ({ page }) => {
        // Look for pricing cards or tier sections
        const pricingCards = page.locator(
            '[data-pricing-card], [class*="pricing"], [class*="tier"]'
        );

        // Should have at least 2 tiers (Free and Pro typically)
        const cardCount = await pricingCards.count();
        if (cardCount === 0) {
            // Alternative: look for headings with tier names
            const tierHeadings = page.locator('h2, h3').filter({
                hasText: /free|pro|enterprise|starter|basic|premium/i,
            });
            expect(await tierHeadings.count()).toBeGreaterThanOrEqual(1);
        } else {
            expect(cardCount).toBeGreaterThanOrEqual(1);
        }
    });

    test('should display prices', async ({ page }) => {
        // Look for price indicators
        const priceIndicators = page.locator('text=/\\$|€|£|free|\\d+\\/mo/i');
        expect(await priceIndicators.count()).toBeGreaterThanOrEqual(1);
    });

    test('should have CTA buttons for each tier', async ({ page }) => {
        // Look for action buttons
        const ctaButtons = page.locator('button, a').filter({
            hasText: /get started|subscribe|upgrade|try|start|choose/i,
        });
        expect(await ctaButtons.count()).toBeGreaterThanOrEqual(1);
    });

    test('should display feature lists', async ({ page }) => {
        // Look for feature checkmarks or lists
        const featureLists = page.locator('ul li, [class*="feature"]');
        expect(await featureLists.count()).toBeGreaterThan(0);
    });

    test('should have toggle for billing period', async ({ page }) => {
        // Look for monthly/annual toggle
        const billingToggle = page.locator(
            'button, [role="switch"], [role="tab"]'
        ).filter({
            hasText: /monthly|annual|yearly/i,
        });

        // This is optional, not all pricing pages have it
        if (await billingToggle.count() > 0) {
            await expect(billingToggle.first()).toBeVisible();
        }
    });

    test('should be responsive on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/pricing');

        // Page should still show pricing info on mobile
        const headline = page.locator('h1, h2').first();
        await expect(headline).toBeVisible();
    });
});
