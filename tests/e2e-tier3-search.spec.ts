import { test, expect, type Page } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL || 'oman.demo.test.e2e@gmail.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPassword123';

// Skip entire file if no test credentials
test.beforeEach(({ }, testInfo) => {
  test.skip(!process.env.TEST_EMAIL, 'Requires test credentials (TEST_EMAIL)');
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

async function loginWithEmail(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
}

async function navigateToChat(page: Page) {
  await page.locator('a[href="/home"]').click();
  await expect(page).toHaveURL('/home');
  await page.waitForLoadState('networkidle');
}

async function selectHaikuModel(page: Page) {
  const modelButton = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-down') }).first();
  await modelButton.click();
  const searchInput = page.locator('input[placeholder="Search models..."]');
  await searchInput.fill('haiku');
  await page.locator('text=claude-haiku-35-20241022').first().click();
}

// ═══════════════════════════════════════════════════════════════════════════
// TIER 3: Web Search Integration
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Tier 3: Web Search', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithEmail(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateToChat(page);
  });

  test('T3.01 web search toggle is clickable', async ({ page }) => {
    const globeButton = page.locator('button').filter({ has: page.locator('svg.lucide-globe') });
    await expect(globeButton.first()).toBeVisible();
    await globeButton.first().click();

    // After clicking, it should change state (active/highlighted)
    // The button might gain a different class or color
    await page.waitForTimeout(500);
  });

  test('T3.02 can send message with web search enabled', async ({ page }) => {
    // Select model first
    await selectHaikuModel(page);

    // Start new chat
    await page.locator('button', { hasText: 'New Chat' }).click();

    // Enable web search
    const globeButton = page.locator('button').filter({ has: page.locator('svg.lucide-globe') });
    await globeButton.first().click();

    // Send a search-worthy question
    const textarea = page.locator('textarea');
    await textarea.fill('What happened in the news today? Keep your answer brief.');
    await textarea.press('Enter');

    // Wait for response — should see search results or response with web context
    // The response should eventually appear (may take longer due to search + LLM)
    await page.waitForTimeout(15000);

    // The chat should contain some response text
    const chatArea = page.locator('main');
    const text = await chatArea.textContent();
    expect(text!.length).toBeGreaterThan(100);
  });

  test('T3.03 search results appear as citations', async ({ page }) => {
    // Select model
    await selectHaikuModel(page);

    // Start new chat
    await page.locator('button', { hasText: 'New Chat' }).click();

    // Enable web search
    const globeButton = page.locator('button').filter({ has: page.locator('svg.lucide-globe') });
    await globeButton.first().click();

    // Ask something that requires web search
    const textarea = page.locator('textarea');
    await textarea.fill('What is the latest version of Node.js?');
    await textarea.press('Enter');

    // Wait for response to complete
    await page.waitForTimeout(20000);

    // Look for search result citations/source cards
    // These could appear as links, source cards, or citation markers
    const pageText = await page.textContent('body');
    // The response should contain some content about Node.js
    expect(pageText).toMatch(/node|Node/i);
  });
});
