const { test, expect } = require('@playwright/test');

const URL = 'https://dotsandboxes-ey9u.onrender.com/';

async function waitAndFillIfVisible(page, selector, value) {
  const el = page.locator(selector);
  if (await el.count()) {
    await el.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    if (await el.first().isVisible().catch(() => false)) {
      await el.first().fill(value);
    }
  }
}

async function ensureGuestAuth(page, username) {
  // Clicking "Online Game" can open the auth modal.
  const modal = page.locator('#auth-modal');
  const guestInput = page.locator('#guestUsername');
  const guestSubmit = page.locator('#guestForm button[type="submit"]');

  // If modal isn't visible, assume already authed/guest.
  if (await modal.isVisible().catch(() => false)) {
    await guestInput.waitFor({ state: 'visible', timeout: 15000 });
    await guestInput.fill(username);

    // Guest flow triggers a page reload after successful login.
    const clickPromise = guestSubmit.first().click().catch(() => page.keyboard.press('Enter'));
    await Promise.race([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => null),
      modal.waitFor({ state: 'hidden', timeout: 25000 }).catch(() => null),
      page.locator('#guestError').waitFor({ state: 'visible', timeout: 25000 }).catch(() => null),
    ]);
    await modal.waitFor({ state: 'hidden', timeout: 25000 }).catch(() => {});
  }
}

async function startRandomMatch(page, username) {
  const onlineBtn = page.locator('#online-game-btn');
  await expect(onlineBtn).toBeVisible();
  await onlineBtn.click();

  await ensureGuestAuth(page, username);

  // After auth, click online again if lobby UI didn't open.
  const lobbyUI = page.locator('#online-lobby-ui');
  if (!(await lobbyUI.isVisible().catch(() => false))) {
    await onlineBtn.click();
  }
  await expect(lobbyUI).toBeVisible({ timeout: 30000 });

  const randomMatchBtn = page.locator('#random-match-btn');
  await expect(randomMatchBtn).toBeVisible();
  await page.locator('#auth-modal').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  await randomMatchBtn.click({ timeout: 20000 });

  // Wait until game screen is shown (human-human or human-bot fallback).
  const onlineGameScreen = page.locator('#online-game-screen');
  await expect(onlineGameScreen).toBeVisible({ timeout: 45000 });
  await expect(page.locator('#online-dice-display')).toBeVisible({ timeout: 30000 });
}

test('Online Random Match (2 players) reaches online game screen', async ({ browser }) => {
  const context1 = await browser.newContext({ bypassCSP: true });
  const context2 = await browser.newContext({ bypassCSP: true });
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  const u1 = `UI_PlayerA_${Date.now()}`;
  const u2 = `UI_PlayerB_${Date.now() + 1}`;

  test.setTimeout(120000);

  await page1.goto(URL, { waitUntil: 'domcontentloaded' });
  await page2.goto(URL, { waitUntil: 'domcontentloaded' });

  // Both players start Random Match.
  await Promise.all([
    startRandomMatch(page1, u1),
    startRandomMatch(page2, u2),
  ]);

  // Basic sanity: both pages show some online game UI.
  await expect(page1.locator('#online-game-screen')).toBeVisible();
  await expect(page2.locator('#online-game-screen')).toBeVisible();

  await context1.close();
  await context2.close();
});

