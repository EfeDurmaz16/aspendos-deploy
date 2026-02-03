import { test, expect } from '@playwright/test';

/**
 * Landing Page E2E Tests
 *
 * Verifies the landing page loads correctly with all key elements.
 */
test.describe('Landing Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should load landing page', async ({ page }) => {
        await expect(page).toHaveTitle(/YULA/i);
    });

    test('should display hero section', async ({ page }) => {
        // Check for main headline
        const headline = page.locator('h1').first();
        await expect(headline).toBeVisible();
    });

    test('should have navigation links', async ({ page }) => {
        // Check for key navigation elements
        const nav = page.locator('nav').first();
        await expect(nav).toBeVisible();
    });

    test('should have CTA buttons', async ({ page }) => {
        // Look for call-to-action buttons
        const ctaButtons = page.locator('a[href*="chat"], a[href*="signup"], button').filter({
            hasText: /start|try|get started|sign up/i,
        });
        await expect(ctaButtons.first()).toBeVisible();
    });

    test('should be responsive on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');

        // Page should still be functional on mobile
        const headline = page.locator('h1').first();
        await expect(headline).toBeVisible();
    });

    test('should navigate to login page', async ({ page }) => {
        const loginLink = page.locator('a[href*="login"]').first();
        if (await loginLink.isVisible()) {
            await loginLink.click();
            await expect(page).toHaveURL(/login/);
        }
    });

    test('should navigate to signup page', async ({ page }) => {
        const signupLink = page.locator('a[href*="signup"]').first();
        if (await signupLink.isVisible()) {
            await signupLink.click();
            await expect(page).toHaveURL(/signup/);
        }
    });
});
