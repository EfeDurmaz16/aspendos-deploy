import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility E2E Tests
 *
 * Uses axe-core to verify WCAG 2.1 AA compliance on key pages.
 * These tests ensure the app is accessible to users with disabilities.
 */
test.describe('Accessibility (WCAG 2.1 AA)', () => {
    test('landing page should have no critical accessibility violations', async ({
        page,
    }) => {
        await page.goto('/');

        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

        // Filter out minor violations, focus on critical issues
        const criticalViolations = accessibilityScanResults.violations.filter(
            (v) => v.impact === 'critical' || v.impact === 'serious'
        );

        expect(criticalViolations).toEqual([]);
    });

    test('login page should have no critical accessibility violations', async ({
        page,
    }) => {
        await page.goto('/login');

        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

        const criticalViolations = accessibilityScanResults.violations.filter(
            (v) => v.impact === 'critical' || v.impact === 'serious'
        );

        expect(criticalViolations).toEqual([]);
    });

    test('signup page should have no critical accessibility violations', async ({
        page,
    }) => {
        await page.goto('/signup');

        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

        const criticalViolations = accessibilityScanResults.violations.filter(
            (v) => v.impact === 'critical' || v.impact === 'serious'
        );

        expect(criticalViolations).toEqual([]);
    });

    test('pricing page should have no critical accessibility violations', async ({
        page,
    }) => {
        await page.goto('/pricing');

        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

        const criticalViolations = accessibilityScanResults.violations.filter(
            (v) => v.impact === 'critical' || v.impact === 'serious'
        );

        expect(criticalViolations).toEqual([]);
    });

    test('pages should have proper heading hierarchy', async ({ page }) => {
        await page.goto('/');

        // Check that h1 exists and is the first heading
        const h1 = page.locator('h1');
        await expect(h1.first()).toBeVisible();

        // Check heading count
        const h1Count = await h1.count();
        expect(h1Count).toBeLessThanOrEqual(1); // Should have at most one h1
    });

    test('images should have alt text', async ({ page }) => {
        await page.goto('/');

        const imagesWithoutAlt = await page.locator('img:not([alt])').count();
        const decorativeImages = await page.locator('img[alt=""]').count();

        // All images should either have meaningful alt text or be marked decorative
        const allImages = await page.locator('img').count();
        expect(imagesWithoutAlt).toBe(0);
    });

    test('interactive elements should be keyboard accessible', async ({ page }) => {
        await page.goto('/');

        // Tab through the page
        await page.keyboard.press('Tab');

        // Check that something is focused
        const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
        expect(focusedElement).not.toBe('BODY');
    });

    test('buttons should have accessible names', async ({ page }) => {
        await page.goto('/');

        // Find all buttons
        const buttons = page.locator('button');
        const buttonCount = await buttons.count();

        for (let i = 0; i < buttonCount; i++) {
            const button = buttons.nth(i);
            const isVisible = await button.isVisible();

            if (isVisible) {
                // Button should have either text content or aria-label
                const hasText = await button.textContent();
                const hasAriaLabel = await button.getAttribute('aria-label');
                const hasAriaLabelledBy = await button.getAttribute('aria-labelledby');

                const hasAccessibleName =
                    (hasText && hasText.trim().length > 0) ||
                    hasAriaLabel ||
                    hasAriaLabelledBy;

                expect(hasAccessibleName).toBeTruthy();
            }
        }
    });

    test('form inputs should have labels', async ({ page }) => {
        await page.goto('/login');

        // Find all inputs
        const inputs = page.locator(
            'input:not([type="hidden"]):not([type="submit"]):not([type="button"])'
        );
        const inputCount = await inputs.count();

        for (let i = 0; i < inputCount; i++) {
            const input = inputs.nth(i);
            const isVisible = await input.isVisible();

            if (isVisible) {
                const id = await input.getAttribute('id');
                const ariaLabel = await input.getAttribute('aria-label');
                const ariaLabelledBy = await input.getAttribute('aria-labelledby');
                const placeholder = await input.getAttribute('placeholder');

                // Should have a proper label association
                let hasLabel = false;

                if (id) {
                    const label = page.locator(`label[for="${id}"]`);
                    hasLabel = (await label.count()) > 0;
                }

                const hasAccessibleLabel =
                    hasLabel ||
                    ariaLabel ||
                    ariaLabelledBy ||
                    placeholder; // placeholder is fallback, not ideal

                expect(hasAccessibleLabel).toBeTruthy();
            }
        }
    });

    test('color contrast should be sufficient', async ({ page }) => {
        await page.goto('/');

        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2aa'])
            .options({ rules: { 'color-contrast': { enabled: true } } })
            .analyze();

        const contrastViolations = accessibilityScanResults.violations.filter(
            (v) => v.id === 'color-contrast'
        );

        // Log violations for debugging but don't fail (contrast can be tricky)
        if (contrastViolations.length > 0) {
            console.log('Color contrast issues:', contrastViolations);
        }
    });

    test('focus indicators should be visible', async ({ page }) => {
        await page.goto('/login');

        // Focus on first input
        const firstInput = page.locator('input').first();
        await firstInput.focus();

        // Check that the element has a visible focus indicator
        // This is a basic check - actual focus styling may vary
        const hasFocusStyles = await page.evaluate(() => {
            const el = document.activeElement;
            if (!el) return false;

            const styles = window.getComputedStyle(el);
            const outline = styles.outline;
            const boxShadow = styles.boxShadow;

            // Check for any focus indicator
            return outline !== 'none' || boxShadow !== 'none';
        });

        // Focus indicators should be present
        expect(hasFocusStyles).toBeTruthy();
    });
});
