import { test, expect } from '@playwright/test';

test.describe('Bug Fixes E2E', () => {

  test('New Chat button navigates from config page to chat', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Navigate to config page
    const settingsBtn = page.locator('button[aria-label="Settings"]');
    await settingsBtn.click();
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/config');

    // Click New Chat button in sidebar
    const newChatBtn = page.getByRole('button', { name: 'New Chat' });
    await expect(newChatBtn).toBeVisible();
    await newChatBtn.click();
    await page.waitForTimeout(1000);

    // Should navigate back to chat page
    expect(page.url()).not.toContain('/config');

    // Should show empty state
    const emptyState = page.getByText('Start a conversation');
    await expect(emptyState).toBeVisible();

    await page.screenshot({ path: 'test-results/bugfix-newchat-from-config.png', fullPage: true });
  });

  test('Conversation appears in sidebar after sending a message', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Switch to Anthropic model
    const modelSelector = page.locator('.truncate.max-w-\\[200px\\]').first();
    await modelSelector.click();
    await page.waitForTimeout(500);
    const anthropicModel = page.locator('button:has-text("claude-sonnet")').first();
    if (await anthropicModel.isVisible({ timeout: 3000 }).catch(() => false)) {
      await anthropicModel.click();
      await page.waitForTimeout(500);
    }

    // Get current conversation count
    const sidebarItems = page.locator('button:has(svg)').filter({ has: page.locator('.truncate') });

    // Send a unique message
    const uniqueId = Date.now().toString().slice(-6);
    const testMsg = `Sidebar test ${uniqueId}`;
    const textarea = page.locator('textarea[placeholder="Type a message..."]');
    await textarea.fill(testMsg);
    await textarea.press('Enter');

    // Wait for response to complete
    const sendBtn = page.locator('button[aria-label="Send message"]');
    await expect(sendBtn).toBeVisible({ timeout: 60000 });
    await page.waitForTimeout(2000);

    // Conversation should appear in sidebar WITHOUT refresh
    const sidebarText = await page.locator('.flex-1.overflow-y-auto').first().textContent();
    expect(sidebarText).toContain('Sidebar test');

    await page.screenshot({ path: 'test-results/bugfix-sidebar-updates.png', fullPage: true });
  });

  test('Web search shows progress steps including errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Switch to Anthropic model
    const modelSelector = page.locator('.truncate.max-w-\\[200px\\]').first();
    await modelSelector.click();
    await page.waitForTimeout(500);
    const anthropicModel = page.locator('button:has-text("claude-sonnet")').first();
    if (await anthropicModel.isVisible({ timeout: 3000 }).catch(() => false)) {
      await anthropicModel.click();
      await page.waitForTimeout(500);
    }

    // Enable web search
    const webSearchBtn = page.locator('button[aria-label*="web search"]');
    await webSearchBtn.click();
    await page.waitForTimeout(500);

    // Verify web search indicator shows
    const webSearchOn = page.getByText('Web search on');
    await expect(webSearchOn).toBeVisible();

    // Send a query
    const textarea = page.locator('textarea[placeholder="Type a message..."]');
    await textarea.fill('When is India next T20 match?');
    await textarea.press('Enter');

    // Wait briefly for progress events
    await page.waitForTimeout(3000);

    // Take screenshot showing progress steps (should show search step - either success or failure)
    await page.screenshot({ path: 'test-results/bugfix-websearch-progress.png', fullPage: true });

    // Wait for response
    const sendBtn = page.locator('button[aria-label="Send message"]');
    await expect(sendBtn).toBeVisible({ timeout: 60000 });

    // Take final screenshot
    await page.screenshot({ path: 'test-results/bugfix-websearch-final.png', fullPage: true });
  });
});
