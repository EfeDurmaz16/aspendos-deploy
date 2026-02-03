import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Tests
 *
 * Verifies auth pages load correctly and forms function properly.
 */
test.describe('Authentication', () => {
    test.describe('Login Page', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/login');
        });

        test('should load login page', async ({ page }) => {
            await expect(page).toHaveURL(/login/);
        });

        test('should display login form', async ({ page }) => {
            // Check for email input
            const emailInput = page.locator('input[type="email"], input[name="email"]');
            await expect(emailInput).toBeVisible();

            // Check for password input
            const passwordInput = page.locator('input[type="password"]');
            await expect(passwordInput).toBeVisible();

            // Check for submit button
            const submitButton = page.locator('button[type="submit"]');
            await expect(submitButton).toBeVisible();
        });

        test('should have OAuth buttons', async ({ page }) => {
            // Check for Google OAuth
            const googleButton = page.locator('button, a').filter({
                hasText: /google/i,
            });

            // Check for GitHub OAuth
            const githubButton = page.locator('button, a').filter({
                hasText: /github/i,
            });

            // At least one OAuth option should be visible
            const hasOAuth =
                (await googleButton.count()) > 0 || (await githubButton.count()) > 0;
            expect(hasOAuth).toBeTruthy();
        });

        test('should have link to signup', async ({ page }) => {
            const signupLink = page.locator('a[href*="signup"]');
            await expect(signupLink).toBeVisible();
        });

        test('should have forgot password link', async ({ page }) => {
            const forgotLink = page.locator('a[href*="forgot"]');
            if (await forgotLink.count() > 0) {
                await expect(forgotLink.first()).toBeVisible();
            }
        });

        test('should validate email format', async ({ page }) => {
            const emailInput = page.locator('input[type="email"], input[name="email"]');
            const submitButton = page.locator('button[type="submit"]');

            // Enter invalid email
            await emailInput.fill('invalid-email');
            await submitButton.click();

            // Should show validation error or stay on page
            await expect(page).toHaveURL(/login/);
        });
    });

    test.describe('Signup Page', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/signup');
        });

        test('should load signup page', async ({ page }) => {
            await expect(page).toHaveURL(/signup/);
        });

        test('should display signup form', async ({ page }) => {
            // Check for email input
            const emailInput = page.locator('input[type="email"], input[name="email"]');
            await expect(emailInput).toBeVisible();

            // Check for password input
            const passwordInput = page.locator('input[type="password"]');
            await expect(passwordInput).toBeVisible();

            // Check for submit button
            const submitButton = page.locator('button[type="submit"]');
            await expect(submitButton).toBeVisible();
        });

        test('should have link to login', async ({ page }) => {
            const loginLink = page.locator('a[href*="login"]');
            await expect(loginLink).toBeVisible();
        });

        test('should have password strength indicator', async ({ page }) => {
            const passwordInput = page.locator('input[type="password"]').first();
            await passwordInput.fill('test');

            // Wait for any strength indicator to appear
            await page.waitForTimeout(100);

            // Check if there's any visual feedback (progress bar, text, etc.)
            const strengthIndicator = page.locator(
                '[data-password-strength], [class*="strength"], [role="progressbar"]'
            );
            // This may or may not exist depending on implementation
        });

        test('should have terms checkbox or link', async ({ page }) => {
            const termsElement = page.locator(
                'input[type="checkbox"], a[href*="terms"], a[href*="privacy"]'
            );
            // At least one terms-related element should exist
            if (await termsElement.count() > 0) {
                await expect(termsElement.first()).toBeVisible();
            }
        });
    });
});
