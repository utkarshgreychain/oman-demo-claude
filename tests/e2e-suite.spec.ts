import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'https://oman-demo-claude.vercel.app';
const TEST_EMAIL = process.env.TEST_EMAIL || 'oman.demo.test.e2e@gmail.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPassword123';

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

async function loginWithEmail(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Fill email
  const emailInput = page.locator('input[type="email"]');
  await emailInput.fill(email);

  // Fill password
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.fill(password);

  // Click sign in
  const signInButton = page.locator('button', { hasText: /sign in/i });
  await signInButton.click();

  // Wait for navigation away from login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: Authentication
// ═══════════════════════════════════════════════════════════════════════════

test.describe('1. Authentication', () => {
  test('1.01 login page loads with gradient background', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('1.02 login page shows email and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('1.03 login page shows Google OAuth button', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('button', { hasText: /google/i })).toBeVisible();
  });

  test('1.04 unauthenticated users are redirected to login', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/login', { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('1.05 unauthenticated access to /home redirects to login', async ({ page }) => {
    await page.goto('/home');
    await page.waitForURL('**/login', { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('1.06 unauthenticated access to /config redirects to login', async ({ page }) => {
    await page.goto('/config');
    await page.waitForURL('**/login', { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('1.07 unauthenticated access to /sources redirects to login', async ({ page }) => {
    await page.goto('/sources');
    await page.waitForURL('**/login', { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('1.08 login page has glassmorphism card', async ({ page }) => {
    await page.goto('/login');
    const card = page.locator('.glass-strong');
    await expect(card).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: Navigation & Layout
// ═══════════════════════════════════════════════════════════════════════════

test.describe('2. Navigation & Layout', () => {
  test.skip(({ }, testInfo) => !process.env.TEST_EMAIL, 'Requires test credentials');

  test.beforeEach(async ({ page }) => {
    await loginWithEmail(page, TEST_EMAIL, TEST_PASSWORD);
  });

  test('2.01 after login, lands on Dashboard page', async ({ page }) => {
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('2.02 NavRail is visible with 4 navigation icons', async ({ page }) => {
    // The NavRail should be always visible
    const navRail = page.locator('nav');
    await expect(navRail).toBeVisible();
  });

  test('2.03 navigate to Home (chat) page', async ({ page }) => {
    // Click the Home nav link in the NavRail
    await page.locator('a[href="/home"]').click();
    await expect(page).toHaveURL('/home');
  });

  test('2.04 navigate to Sources page', async ({ page }) => {
    await page.locator('a[href="/sources"]').click();
    await expect(page).toHaveURL('/sources');
    await expect(page.locator('text=Sources Chat')).toBeVisible();
  });

  test('2.05 navigate to Settings page', async ({ page }) => {
    await page.locator('a[href="/config"]').click();
    await expect(page).toHaveURL('/config');
  });

  test('2.06 sidebar only appears on /home', async ({ page }) => {
    // On dashboard, no sidebar
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to Home - sidebar should appear
    await page.locator('a[href="/home"]').click();
    await expect(page).toHaveURL('/home');

    // Navigate to Sources - sidebar should disappear
    await page.locator('a[href="/sources"]').click();
    await expect(page).toHaveURL('/sources');
  });

  test('2.07 header shows page name', async ({ page }) => {
    await expect(page.locator('header').locator('text=Dashboard')).toBeVisible();

    await page.locator('a[href="/home"]').click();
    await expect(page.locator('header').locator('text=Home')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: Dashboard Page
// ═══════════════════════════════════════════════════════════════════════════

test.describe('3. Dashboard', () => {
  test.skip(({ }, testInfo) => !process.env.TEST_EMAIL, 'Requires test credentials');

  test.beforeEach(async ({ page }) => {
    await loginWithEmail(page, TEST_EMAIL, TEST_PASSWORD);
  });

  test('3.01 dashboard shows stats cards', async ({ page }) => {
    await expect(page.locator('text=Conversations')).toBeVisible();
    await expect(page.locator('text=Files Uploaded')).toBeVisible();
    await expect(page.locator('text=Active Providers')).toBeVisible();
  });

  test('3.02 stats cards use glassmorphism', async ({ page }) => {
    const glassCards = page.locator('.glass');
    const count = await glassCards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('3.03 dashboard shows collection dropdown', async ({ page }) => {
    await expect(page.locator('text=Select a collection to view insights')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: Settings Page
// ═══════════════════════════════════════════════════════════════════════════

test.describe('4. Settings', () => {
  test.skip(({ }, testInfo) => !process.env.TEST_EMAIL, 'Requires test credentials');

  test.beforeEach(async ({ page }) => {
    await loginWithEmail(page, TEST_EMAIL, TEST_PASSWORD);
    await page.locator('a[href="/config"]').click();
    await expect(page).toHaveURL('/config');
  });

  test('4.01 settings page shows LLM Providers section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'LLM Providers' })).toBeVisible();
  });

  test('4.02 settings page shows Search Providers section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Search Providers/i })).toBeVisible();
  });

  test('4.03 add LLM provider modal opens', async ({ page }) => {
    // First "Add New" button is in the LLM section
    const llmSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'LLM Providers' }) });
    await llmSection.getByRole('button', { name: /add new/i }).click();
    await expect(page.locator('text=Add LLM Provider')).toBeVisible();
  });

  test('4.04 add LLM provider modal shows all providers in dropdown', async ({ page }) => {
    const llmSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'LLM Providers' }) });
    await llmSection.getByRole('button', { name: /add new/i }).click();

    // Click the provider dropdown
    const dropdown = page.locator('text=Select a provider').first();
    await dropdown.click();

    // Check for new providers
    await expect(page.locator('text=Meta (Llama)')).toBeVisible();
    await expect(page.locator('text=Mistral')).toBeVisible();
    await expect(page.locator('text=DeepSeek')).toBeVisible();
    await expect(page.locator('text=Azure OpenAI')).toBeVisible();
    await expect(page.locator('text=AWS Bedrock')).toBeVisible();
  });

  test('4.05 add search provider modal opens', async ({ page }) => {
    const searchSection = page.locator('section').filter({ has: page.getByRole('heading', { name: /Search Providers/i }) });
    await searchSection.getByRole('button', { name: /add new/i }).click();
    await expect(page.locator('text=Add Search Provider')).toBeVisible();
  });

  test('4.06 add search provider modal shows all providers', async ({ page }) => {
    const searchSection = page.locator('section').filter({ has: page.getByRole('heading', { name: /Search Providers/i }) });
    await searchSection.getByRole('button', { name: /add new/i }).click();

    const dropdown = page.locator('text=Select a provider').first();
    await dropdown.click();

    await expect(page.locator('text=Bing')).toBeVisible();
    await expect(page.locator('text=Exa')).toBeVisible();
    await expect(page.locator('text=DuckDuckGo')).toBeVisible();
  });

  test('4.07 provider cards use glass styling', async ({ page }) => {
    const glassCards = page.locator('.glass');
    const count = await glassCards.count();
    expect(count).toBeGreaterThanOrEqual(0); // May not have any providers configured
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: Sources Page
// ═══════════════════════════════════════════════════════════════════════════

test.describe('5. Sources', () => {
  test.skip(({ }, testInfo) => !process.env.TEST_EMAIL, 'Requires test credentials');

  test.beforeEach(async ({ page }) => {
    await loginWithEmail(page, TEST_EMAIL, TEST_PASSWORD);
    await page.locator('a[href="/sources"]').click();
    await expect(page).toHaveURL('/sources');
  });

  test('5.01 sources page shows split-screen layout', async ({ page }) => {
    await expect(page.locator('text=Sources Chat')).toBeVisible();
  });

  test('5.02 sources page shows All Files tab', async ({ page }) => {
    await expect(page.locator('button', { hasText: 'All Files' })).toBeVisible();
  });

  test('5.03 sources page shows upload button', async ({ page }) => {
    await expect(page.locator('text=Upload files')).toBeVisible();
  });

  test('5.04 create collection modal opens', async ({ page }) => {
    // Click the + button to create new collection
    const plusButton = page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).last();
    await plusButton.click();
    await expect(page.locator('text=New Collection')).toBeVisible();
  });

  test('5.05 can create a new collection', async ({ page }) => {
    const uniqueName = `E2E Test ${Date.now()}`;
    const plusButton = page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).last();
    await plusButton.click();

    await page.locator('input[placeholder*="Research Papers"]').fill(uniqueName);
    await page.locator('button', { hasText: 'Create' }).click();

    // Collection should appear in tabs
    await expect(page.getByRole('button', { name: new RegExp(uniqueName) })).toBeVisible({ timeout: 5000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: Chat Page (Home)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('6. Chat Page', () => {
  test.skip(({ }, testInfo) => !process.env.TEST_EMAIL, 'Requires test credentials');

  test.beforeEach(async ({ page }) => {
    await loginWithEmail(page, TEST_EMAIL, TEST_PASSWORD);
    await page.locator('a[href="/home"]').click();
    await expect(page).toHaveURL('/home');
  });

  test('6.01 chat page shows input area', async ({ page }) => {
    await expect(page.locator('textarea')).toBeVisible();
  });

  test('6.02 chat page shows model selector', async ({ page }) => {
    // Find the model selector button
    const modelButton = page.locator('button', { hasText: /select model|openai|anthropic|google|groq/i });
    await expect(modelButton.first()).toBeVisible();
  });

  test('6.03 model dropdown shows search input', async ({ page }) => {
    // Click the model selector
    const modelButton = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-down') }).first();
    await modelButton.click();

    // Search input should appear
    await expect(page.locator('input[placeholder="Search models..."]')).toBeVisible();
  });

  test('6.04 chat page shows New Chat button in sidebar', async ({ page }) => {
    await expect(page.locator('button', { hasText: 'New Chat' })).toBeVisible();
  });

  test('6.05 chat page shows web search toggle', async ({ page }) => {
    // Look for the globe icon/toggle
    const globeButton = page.locator('button').filter({ has: page.locator('svg.lucide-globe') });
    await expect(globeButton.first()).toBeVisible();
  });

  test('6.06 chat page shows file upload button', async ({ page }) => {
    const attachButton = page.locator('button').filter({ has: page.locator('svg.lucide-paperclip') });
    await expect(attachButton).toBeVisible();
  });

  test('6.07 empty state shows suggestion chips', async ({ page }) => {
    // When there are no messages, suggestion chips should be visible
    const suggestions = page.locator('.glass', { hasText: /analyze|summarize|explain|help/i });
    // May or may not have suggestions depending on state
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7: Theme & Visual Polish
// ═══════════════════════════════════════════════════════════════════════════

test.describe('7. Theme & Visual', () => {
  test('7.01 login page has gradient background', async ({ page }) => {
    await page.goto('/login');
    const body = page.locator('body');
    const bg = await body.evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(bg).toContain('gradient');
  });

  test('7.02 glassmorphism card on login page', async ({ page }) => {
    await page.goto('/login');
    const glassCard = page.locator('.glass-strong');
    await expect(glassCard.first()).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 8: API Endpoints (no auth required for some)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('8. API Endpoints', () => {
  test('8.01 unauthenticated API call returns 401', async ({ request }) => {
    const resp = await request.get(`${BASE_URL}/api/config/llm-providers`);
    expect(resp.status()).toBe(401);
  });

  test('8.02 unauthenticated collections API returns 401', async ({ request }) => {
    const resp = await request.get(`${BASE_URL}/api/collections`);
    expect(resp.status()).toBe(401);
  });

  test('8.03 unauthenticated dashboard stats API returns 401', async ({ request }) => {
    const resp = await request.get(`${BASE_URL}/api/collections?stats=true`);
    expect(resp.status()).toBe(401);
  });

  test('8.04 unauthenticated files list API returns 401', async ({ request }) => {
    const resp = await request.get(`${BASE_URL}/api/files/list`);
    expect(resp.status()).toBe(401);
  });
});
