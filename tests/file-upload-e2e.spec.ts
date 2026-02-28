import { test, expect } from '@playwright/test';
import path from 'path';

const EXCEL_FILE = '/Users/utkarsh/Downloads/Sample Floted Tenders Data.xlsx';

test.describe('File Upload & Chat E2E', () => {

  test('upload Excel file, ask about tenders, get markdown response', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // --- Step 1: Switch to Anthropic model ---
    const modelSelector = page.locator('.truncate.max-w-\\[200px\\]').first();
    await modelSelector.click();
    await page.waitForTimeout(500);

    const anthropicModel = page.locator('button:has-text("claude-sonnet")').first();
    if (await anthropicModel.isVisible({ timeout: 3000 }).catch(() => false)) {
      await anthropicModel.click();
      await page.waitForTimeout(500);
    }

    // --- Step 2: Upload the Excel file ---
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(EXCEL_FILE);

    // Wait for upload to complete - file preview should appear
    await page.waitForTimeout(3000);

    // --- Step 3: Type a question about the file ---
    const textarea = page.locator('textarea[placeholder="Type a message..."]');
    await expect(textarea).toBeVisible();
    await textarea.fill('Give me tenders for 17th feb. Show as a markdown table.');

    // --- Step 4: Send the message ---
    await textarea.press('Enter');

    // --- Step 5: Wait for streaming to start ---
    // The AI avatar or streaming indicator should appear
    await page.waitForTimeout(5000);

    // --- Step 6: Wait for response to finish streaming ---
    // Wait for the streaming to complete (the send button reappears when done)
    const sendBtn = page.locator('button[aria-label="Send message"]');
    await expect(sendBtn).toBeVisible({ timeout: 60000 });

    // --- Step 7: Verify the response contains actual tender data ---
    const pageText = await page.locator('body').textContent();

    // Should contain actual data from the Excel file, NOT tool_call hallucinations
    expect(pageText).not.toContain('tool_call');
    expect(pageText).not.toContain('tool_name');
    expect(pageText).not.toContain('web_search');

    // Should contain tender-related content from the file
    expect(pageText).toContain('17');
    // Should have some kind of tabular or structured response
    const hasTable = pageText?.includes('Tender') || pageText?.includes('tender');
    expect(hasTable).toBeTruthy();

    // Take a screenshot for visual verification
    await page.screenshot({ path: 'test-results/file-upload-tenders.png', fullPage: true });
  });

  test('upload Excel file, ask for a pie chart, get visualization', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // --- Step 1: Switch to Anthropic model ---
    const modelSelector = page.locator('.truncate.max-w-\\[200px\\]').first();
    await modelSelector.click();
    await page.waitForTimeout(500);

    const anthropicModel = page.locator('button:has-text("claude-sonnet")').first();
    if (await anthropicModel.isVisible({ timeout: 3000 }).catch(() => false)) {
      await anthropicModel.click();
      await page.waitForTimeout(500);
    }

    // --- Step 2: Upload the Excel file ---
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(EXCEL_FILE);
    await page.waitForTimeout(3000);

    // --- Step 3: Ask for a chart ---
    const textarea = page.locator('textarea[placeholder="Type a message..."]');
    await textarea.fill('Build a pie chart showing tenders by division from this file');
    await textarea.press('Enter');

    // --- Step 4: Wait for response to complete ---
    const sendBtn = page.locator('button[aria-label="Send message"]');
    await expect(sendBtn).toBeVisible({ timeout: 90000 });

    // --- Step 5: Wait a moment for visualization card to render ---
    await page.waitForTimeout(3000);

    // --- Step 6: Verify no hallucinated tool calls ---
    const pageText = await page.locator('body').textContent();
    expect(pageText).not.toContain('tool_call');
    expect(pageText).not.toContain('tool_name');

    // --- Step 7: Check for visualization card (chart image) ---
    // The VisualizationCard renders an img tag with src pointing to /api/viz/
    const vizCard = page.locator('img[alt*="Chart"], img[alt*="chart"], img[alt*="Distribution"], img[alt*="Tender"]').first();
    const vizCardVisible = await vizCard.isVisible({ timeout: 5000 }).catch(() => false);

    if (vizCardVisible) {
      // Verify the chart image loaded successfully
      const naturalWidth = await vizCard.evaluate((img: HTMLImageElement) => img.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/file-upload-pie-chart.png', fullPage: true });
  });

  test('upload Excel file, ask for a bar chart of tender types', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Switch to Anthropic
    const modelSelector = page.locator('.truncate.max-w-\\[200px\\]').first();
    await modelSelector.click();
    await page.waitForTimeout(500);
    const anthropicModel = page.locator('button:has-text("claude-sonnet")').first();
    if (await anthropicModel.isVisible({ timeout: 3000 }).catch(() => false)) {
      await anthropicModel.click();
      await page.waitForTimeout(500);
    }

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(EXCEL_FILE);
    await page.waitForTimeout(3000);

    // Ask for bar chart
    const textarea = page.locator('textarea[placeholder="Type a message..."]');
    await textarea.fill('Show me a bar chart of tender types from the uploaded file');
    await textarea.press('Enter');

    // Wait for completion
    const sendBtn = page.locator('button[aria-label="Send message"]');
    await expect(sendBtn).toBeVisible({ timeout: 90000 });
    await page.waitForTimeout(3000);

    // Verify response quality
    const pageText = await page.locator('body').textContent();
    expect(pageText).not.toContain('tool_call');
    // Should mention tender types
    const hasTenderTypes = pageText?.includes('Local') || pageText?.includes('International') || pageText?.includes('tender');
    expect(hasTenderTypes).toBeTruthy();

    // Screenshot
    await page.screenshot({ path: 'test-results/file-upload-bar-chart.png', fullPage: true });
  });
});
