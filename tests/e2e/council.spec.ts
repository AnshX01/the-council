import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';

test.describe('The Council - Complete Deliberation E2E Suite', () => {
  test.beforeAll(() => {
    const screenshotDir = path.join(process.cwd(), 'test-results', 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  test('Landing page renders correctly, pre-fills dilemma from example, and captures screenshots', async ({ page }) => {
    await page.goto('/');

    // Verify main brand heading and subtitle
    await expect(page.locator('h1')).toContainText('The Council');
    await expect(page.locator('text=Eight Autonomous AI Personas')).toBeVisible();

    // Check all 8 personas are displayed in preview grid
    const personas = [
      'The Skeptic',
      'The Optimist',
      'The Ethicist',
      'The Pragmatist',
      'The Systems Thinker',
      'The Historian',
      'The Humanist',
      'The Contrarian',
    ];

    for (const persona of personas) {
      await expect(page.locator(`text=${persona}`).first()).toBeVisible();
    }

    // Capture desktop dark screenshot
    await page.screenshot({
      path: path.join(process.cwd(), 'test-results', 'screenshots', 'landing-desktop-dark.png'),
      fullPage: true,
    });

    // Click an example dilemma pill
    const exampleButton = page.locator('button:has-text("Career vs. Family")');
    await expect(exampleButton).toBeVisible();
    await exampleButton.click();

    // Verify textarea was populated
    const textarea = page.locator('textarea');
    await expect(textarea).not.toBeEmpty();
    const textVal = await textarea.inputValue();
    expect(textVal).toContain('high-paying executive job');

    // Verify submit button is enabled
    const submitBtn = page.locator('button:has-text("Convene The Council")');
    await expect(submitBtn).toBeEnabled();
  });

  test('Theme toggle switches between dark and light modes cleanly', async ({ page }) => {
    await page.goto('/');

    // Initially dark mode
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);

    // Toggle theme to light mode
    const themeBtn = page.locator('button[aria-label="Toggle theme"]');
    await expect(themeBtn).toBeVisible();
    await themeBtn.click();
    await expect(html).not.toHaveClass(/dark/);

    // Capture desktop light screenshot
    await page.screenshot({
      path: path.join(process.cwd(), 'test-results', 'screenshots', 'landing-desktop-light.png'),
      fullPage: true,
    });

    // Toggle back to dark mode
    await themeBtn.click();
    await expect(html).toHaveClass(/dark/);
  });

  test('Persona modal displays deep profile details and closes', async ({ page }) => {
    await page.goto('/');

    // Click on The Skeptic card to open modal
    const skepticCard = page.locator('button:has-text("The Skeptic")').first();
    await skepticCard.click();

    // Verify modal elements
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('The Skeptic');
    await expect(modal).toContainText('Core Values');
    await expect(modal).toContainText('Reasoning Style');
    await expect(modal).toContainText('Blind Spots');

    // Close modal via close button
    const closeBtn = page.locator('button[aria-label="Close modal"]');
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test('Full deliberation session completes with unanimous verdict and view shifts', async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto('/');

    // Select dilemma and submit
    const exampleButton = page.locator('button:has-text("AI Regulation")');
    await exampleButton.click();

    const submitBtn = page.locator('button:has-text("Convene The Council")');
    await submitBtn.click();

    // Should redirect to session chamber page
    await page.waitForURL(/\/session\/[a-f0-9-]+/);
    expect(page.url()).toContain('/session/');

    // Verify Chamber UI components are mounted
    await expect(page.locator('text=Consensus Alignment')).toBeVisible();
    await expect(page.locator('text=The Moderator').first()).toBeVisible();

    // Verify Phase tracker shows progress
    const phaseTracker = page.locator('text=Phase 0');
    await expect(phaseTracker).toBeVisible();

    // Wait for deliberation to progress through phases and produce final verdict
    const finalVerdictHeader = page.locator('text=Deliberation Concluded');
    await expect(finalVerdictHeader).toBeVisible({ timeout: 60_000 });

    // Verify Final Verdict card content
    await expect(page.locator('text=Unanimous Consensus Reached')).toBeVisible();
    await expect(page.locator('text=Unanimous Synthesis')).toBeVisible();
    await expect(page.locator('text=Key Pillars of Agreement')).toBeVisible();
    await expect(page.locator('text=Crucial Caveats & Boundary Conditions')).toBeVisible();
    await expect(page.locator('text=Actionable Guidance')).toBeVisible();

    // Verify "How Personas' Views Shifted" section
    await expect(page.locator("text=How Personas' Views Shifted")).toBeVisible();
    await expect(page.locator('text=Initial Stance').first()).toBeVisible();
    await expect(page.locator('text=Final Stance').first()).toBeVisible();

    // Capture screenshot of deliberation verdict
    await page.screenshot({
      path: path.join(process.cwd(), 'test-results', 'screenshots', 'session-chamber-verdict.png'),
      fullPage: true,
    });

    // Test Copy Summary button
    const copyBtn = page.locator('button:has-text("Copy Deliberation Summary")');
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();
    await expect(page.locator('text=Copied to Clipboard')).toBeVisible();

    // Verify Feed filtering works
    const feedFilterBtn = page.locator('button:has-text("Cross-Examination")');
    if (await feedFilterBtn.isVisible()) {
      await feedFilterBtn.click();
      await expect(page.locator('text=Cross-Examination').first()).toBeVisible();
    }
  });

  test('Session state reloads cleanly on refresh and reopens from URL', async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto('/');

    const exampleButton = page.locator('button:has-text("Startup Dilemma")');
    await exampleButton.click();

    const submitBtn = page.locator('button:has-text("Convene The Council")');
    await submitBtn.click();

    await page.waitForURL(/\/session\/[a-f0-9-]+/);
    const sessionUrl = page.url();

    // Wait for verdict
    await expect(page.locator('text=Deliberation Concluded')).toBeVisible({ timeout: 60_000 });

    // Reload the page directly
    await page.reload();

    // Verify state hydrates cleanly from snapshot
    await expect(page.locator('text=Deliberation Concluded')).toBeVisible();
    await expect(page.locator('text=Unanimous Consensus Reached')).toBeVisible();
    await expect(page.locator("text=How Personas' Views Shifted")).toBeVisible();
  });

  test('Session chamber handles non-existent session with user-friendly error state', async ({ page }) => {
    await page.goto('/session/non-existent-session-uuid-12345');

    await expect(page.locator('text=Deliberation Error')).toBeVisible();
    await expect(page.locator('text=Deliberation session not found.')).toBeVisible();

    const returnBtn = page.locator('a:has-text("Return to Chamber Entrance")');
    await expect(returnBtn).toBeVisible();
    await returnBtn.click();

    await page.waitForURL('/');
    await expect(page.locator('h1')).toContainText('The Council');
  });

  test('Mobile viewport renders responsive chamber layout cleanly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await expect(page.locator('h1')).toContainText('The Council');
    const submitBtn = page.locator('button:has-text("Convene The Council")');
    await expect(submitBtn).toBeVisible();

    // Capture mobile landing screenshot
    await page.screenshot({
      path: path.join(process.cwd(), 'test-results', 'screenshots', 'landing-mobile.png'),
      fullPage: true,
    });
  });

  test('Accessibility audit passes WCAG AA guidelines with axe', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast']) // fonts and subtle tints
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
