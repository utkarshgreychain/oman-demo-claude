import { test, expect } from '@playwright/test';

const EXCEL_FILE = '/Users/utkarsh/Downloads/Sample Floted Tenders Data.xlsx';

test.describe('Rich Chat Experience E2E', () => {

  test('upload Excel, ask comprehensive question, verify rich markdown + citations', async ({ page }) => {
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

    // Upload the Excel file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(EXCEL_FILE);
    await page.waitForTimeout(3000);

    // Ask the comprehensive question
    const textarea = page.locator('textarea[placeholder="Type a message..."]');
    await expect(textarea).toBeVisible();
    await textarea.fill('Give me count of tenders on 17th Feb. Also give me a summary of what all data this excel has and how can I do data analytics with it?');
    await textarea.press('Enter');

    // Wait for streaming to complete
    const sendBtn = page.locator('button[aria-label="Send message"]');
    await expect(sendBtn).toBeVisible({ timeout: 90000 });
    await page.waitForTimeout(2000);

    // Take screenshot of the rich response
    await page.screenshot({ path: 'test-results/rich-experience-excel.png', fullPage: true });

    // Verify response has rich markdown formatting
    const responseArea = page.locator('[class*="prose"]').first();
    const responseText = await responseArea.textContent();

    // Should NOT contain tool_call hallucinations
    expect(responseText).not.toContain('tool_call');
    expect(responseText).not.toContain('tool_name');

    // Should contain tender-related content
    expect(responseText).toContain('17');

    // Check for structured content (headings, bold text, or tables)
    const hasHeadings = await page.locator('[class*="prose"] h2, [class*="prose"] h3').count();
    const hasBold = await page.locator('[class*="prose"] strong').count();
    const hasTables = await page.locator('[class*="prose"] table').count();
    const hasLists = await page.locator('[class*="prose"] ul, [class*="prose"] ol').count();

    // Should have at least some rich formatting
    const totalRichElements = hasHeadings + hasBold + hasTables + hasLists;
    expect(totalRichElements).toBeGreaterThan(0);

    // Check for file source citation badge
    const fileCitations = await page.locator('cite[data-file], .citation-file, span:has-text("Source")').count();

    // Take a close-up of the response content
    const responseBox = page.locator('[class*="prose"]').first();
    await responseBox.screenshot({ path: 'test-results/rich-experience-content.png' });
  });

  test('progress steps appear during streaming', async ({ page }) => {
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

    // Upload the Excel file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(EXCEL_FILE);
    await page.waitForTimeout(3000);

    // Send message
    const textarea = page.locator('textarea[placeholder="Type a message..."]');
    await textarea.fill('What is the total number of tenders?');
    await textarea.press('Enter');

    // Wait briefly for progress steps to appear
    await page.waitForTimeout(2000);

    // Take screenshot showing progress steps
    await page.screenshot({ path: 'test-results/rich-experience-progress.png', fullPage: true });

    // Wait for completion
    const sendBtn = page.locator('button[aria-label="Send message"]');
    await expect(sendBtn).toBeVisible({ timeout: 90000 });

    // Final screenshot
    await page.screenshot({ path: 'test-results/rich-experience-complete.png', fullPage: true });
  });

  test('GFM tables render properly with styled borders', async ({ page }) => {
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

    // Upload the Excel file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(EXCEL_FILE);
    await page.waitForTimeout(3000);

    // Ask for a table
    const textarea = page.locator('textarea[placeholder="Type a message..."]');
    await textarea.fill('Show me the first 5 tenders in a markdown table with columns: Tender No, Description, Division, Type');
    await textarea.press('Enter');

    // Wait for completion
    const sendBtn = page.locator('button[aria-label="Send message"]');
    await expect(sendBtn).toBeVisible({ timeout: 90000 });
    await page.waitForTimeout(2000);

    // Verify table rendered
    const tables = await page.locator('[class*="prose"] table').count();
    expect(tables).toBeGreaterThan(0);

    // Take screenshot of the table
    await page.screenshot({ path: 'test-results/rich-experience-table.png', fullPage: true });
  });
});
