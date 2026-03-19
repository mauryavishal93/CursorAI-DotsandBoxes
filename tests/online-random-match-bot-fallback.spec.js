const { test, expect } = require('@playwright/test');

const URL = 'https://dotsandboxes-ey9u.onrender.com/';

async function ensureGuestAuth(page, username) {
  const modal = page.locator('#auth-modal');
  if (!(await modal.isVisible().catch(() => false))) return;

  const guestInput = page.locator('#guestUsername');
  const guestSubmit = page.locator('#guestForm button[type="submit"]');

  await guestInput.waitFor({ state: 'visible', timeout: 15000 });
  await guestInput.fill(username);

  await Promise.race([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => null),
    modal.waitFor({ state: 'hidden', timeout: 25000 }).catch(() => null),
    page.locator('#guestError').waitFor({ state: 'visible', timeout: 25000 }).catch(() => null),
    guestSubmit.first().click().catch(() => null),
  ]);

  // In case reload already happened, just wait for modal to be gone.
  await modal.waitFor({ state: 'hidden', timeout: 25000 }).catch(() => {});
}

test('Online Random Match bot fallback starts a game screen', async ({ browser }) => {
  const context = await browser.newContext({ bypassCSP: true });
  const page = await context.newPage();

  const username = `UI_BOT_${Date.now()}`;

  await page.goto(URL, { waitUntil: 'domcontentloaded' });

  const onlineBtn = page.locator('#online-game-btn');
  await expect(onlineBtn).toBeVisible();
  await onlineBtn.click();

  await ensureGuestAuth(page, username);

  const lobbyUI = page.locator('#online-lobby-ui');
  if (!(await lobbyUI.isVisible().catch(() => false))) {
    await onlineBtn.click();
  }
  await expect(lobbyUI).toBeVisible({ timeout: 30000 });

  const randomMatchBtn = page.locator('#random-match-btn');
  await expect(randomMatchBtn).toBeVisible();
  await randomMatchBtn.click({ timeout: 20000 });

  const onlineGameScreen = page.locator('#online-game-screen');
  await expect(onlineGameScreen).toBeVisible({ timeout: 45000 });
  await expect(page.locator('#online-dice-display')).toBeVisible({ timeout: 30000 });

  await context.close();
});

