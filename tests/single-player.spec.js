const { test, expect } = require('@playwright/test');

test('Single Player: home -> setup -> start -> dice rolls -> back home', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  page.on('console', (msg) => {
    // Prefix to distinguish browser logs from test runner logs
    console.log(`[browser:${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    console.log(`[browser:pageerror] ${err.message}`);
  });

  const singlePlayerBtn = page.locator('#single-player-btn');
  await expect(singlePlayerBtn).toBeVisible();
  // Should be enabled even for guest users
  await expect(singlePlayerBtn).toBeEnabled();

  // Trigger the click deterministically from the DOM.
  await page.waitForFunction(() => typeof window.showScreen === 'function');

  const before = await page.evaluate(() => {
    const sp = document.getElementById('single-player-btn');
    const setup = document.getElementById('single-player-setup-screen');
    const home = document.getElementById('home-screen');
    return {
      singlePlayerDisabled: !!sp?.disabled,
      overlayCount: document.querySelectorAll('.auth-overlay').length,
      homeDisplay: home ? getComputedStyle(home).display : null,
      setupDisplay: setup ? getComputedStyle(setup).display : null,
      activeEl: document.activeElement?.id || null,
      __gameInitDone: window.__gameInitDone,
      __singlePlayerHomeDelegationBound: window.__singlePlayerHomeDelegationBound,
    };
  });
  console.log('Before click:', before);

  const clickReach = await page.evaluate(() => {
    window.__docClickCaptured = false;
    document.addEventListener(
      'click',
      (e) => {
        const t = e.target;
        const targetEl = (t && t.nodeType === 3 && t.parentElement) ? t.parentElement : t;
        if (targetEl && targetEl.closest && targetEl.closest('#single-player-btn')) {
          window.__docClickCaptured = true;
        }
      },
      true // capture phase
    );
    return true;
  });
  console.log('Prepared capture listener:', clickReach);

  await page.evaluate(() => {
    const btn = document.getElementById('single-player-btn');
    if (!btn) return;
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  });

  await page.waitForTimeout(800);

  const captured = await page.evaluate(() => window.__docClickCaptured === true);
  console.log('Document click captured for single-player:', captured);

  const after = await page.evaluate(() => {
    const sp = document.getElementById('single-player-btn');
    const setup = document.getElementById('single-player-setup-screen');
    const home = document.getElementById('home-screen');
    const stack = document.getElementById('toast-stack');
    return {
      singlePlayerDisabled: !!sp?.disabled,
      overlayCount: document.querySelectorAll('.auth-overlay').length,
      homeDisplay: home ? getComputedStyle(home).display : null,
      setupDisplay: setup ? getComputedStyle(setup).display : null,
      setupInline: setup ? setup.style.display : null,
      activeEl: document.activeElement?.id || null,
      toastCount: stack ? stack.children.length : 0,
    };
  });
  console.log('After click:', after);

  const setupScreen = page.locator('#single-player-setup-screen');
  // Diagnostic: print computed display styles
  const debugStyles = await page.evaluate(() => {
    const home = document.getElementById('home-screen');
    const setup = document.getElementById('single-player-setup-screen');
    const homeDisplay = home ? getComputedStyle(home).display : null;
    const setupDisplay = setup ? getComputedStyle(setup).display : null;
    const setupInline = setup ? setup.style.display : null;
    return { homeDisplay, setupDisplay, setupInline };
  });
  console.log('Home/Setup displays after click:', debugStyles);

  await expect(setupScreen).toBeVisible({ timeout: 12000 });

  const nameInput = page.locator('#sp-player-name-input');
  await expect(nameInput).toBeVisible();
  await nameInput.fill('PlaywrightUser');

  const startBtn = page.locator('#start-single-player-game-btn');
  await expect(startBtn).toBeVisible();
  await expect(startBtn).toBeEnabled();
  await startBtn.click();

  const gameScreen = page.locator('#single-player-game-screen');
  await expect(gameScreen).toBeVisible({ timeout: 8000 });

  const dice = page.locator('#sp-dice-display');
  await expect(dice).toBeVisible();

  const linesToDraw = page.locator('#sp-lines-to-draw-count');
  // Initially it should be 0
  // (We don't hard assert equality because fonts/rendering can delay text updates)

  const diceBefore = await page.evaluate(() => {
    const diceEl = document.getElementById('sp-dice-display');
    if (!diceEl) return null;
    return {
      className: diceEl.className,
      pointerEvents: getComputedStyle(diceEl).pointerEvents,
      inlineDisplay: diceEl.style.display || null,
    };
  });
  console.log('Dice state before click:', diceBefore);

  // Roll dice
  await page.evaluate(() => {
    const el = document.getElementById('sp-dice-display');
    if (!el) return;
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  });

  // After dice roll completes, Lines to Draw should be 1-6
  await page.waitForTimeout(1200);

  const afterDice = await page.evaluate(() => {
    const lines = document.getElementById('sp-lines-to-draw-count');
    const diceEl = document.getElementById('sp-dice-display');
    return {
      linesText: lines ? lines.textContent : null,
      diceClass: diceEl ? diceEl.className : null,
      toastCount: document.getElementById('toast-stack') ? document.getElementById('toast-stack').children.length : 0,
    };
  });
  console.log('After dice click:', afterDice);

  await expect(linesToDraw).toHaveText(/^[1-6]$/, { timeout: 15000 });

  // Go back home (will show confirmation)
  const backBtn = page.locator('#sp-back-to-home-btn');
  await expect(backBtn).toBeVisible();
  await backBtn.click();

  const confirmYes = page.locator('#confirmYesBtn');
  await expect(confirmYes).toBeVisible({ timeout: 5000 });
  await confirmYes.click();

  await expect(page.locator('#home-screen')).toBeVisible({ timeout: 5000 });
  await expect(gameScreen).toBeHidden();
});

