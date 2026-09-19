import { expect, test, type Page } from '@playwright/test';

test.setTimeout(120_000);

async function runtimeScreen(page: Page): Promise<string> {
  return (await page.getByTestId('runtime-screen').textContent())?.trim() ?? '';
}

async function playerPosition(page: Page): Promise<{ x: number; y: number }> {
  const raw = (await page.getByTestId('runtime-player-position').textContent()) ?? '0,0';
  const [x, y] = raw.split(',').map(Number);
  return { x, y };
}

async function hold(page: Page, keys: string[], ms: number): Promise<void> {
  for (const key of keys) await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  for (const key of [...keys].reverse()) await page.keyboard.up(key);
  await page.waitForTimeout(80);
}

async function moveTo(page: Page, targetX: number, targetY: number, tolerance = 55): Promise<void> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const pos = await playerPosition(page);
    const dx = targetX - pos.x;
    const dy = targetY - pos.y;
    if (Math.abs(dx) <= tolerance && Math.abs(dy) <= tolerance) return;

    const keys: string[] = [];
    if (dx > tolerance) keys.push('KeyD');
    else if (dx < -tolerance) keys.push('KeyA');
    if (dy > tolerance) keys.push('KeyS');
    else if (dy < -tolerance) keys.push('KeyW');

    const dominant = Math.max(Math.abs(dx), Math.abs(dy));
    await hold(page, keys, Math.max(90, Math.min(550, dominant / 180 * 700)));
  }
}

async function clickGame(page: Page, gameX: number, gameY: number): Promise<void> {
  const canvas = page.locator('#game-root canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Game canvas is not visible');
  await page.mouse.click(
    box.x + gameX / 1280 * box.width,
    box.y + gameY / 720 * box.height,
  );
}

async function attackNear(page: Page, x: number, y: number, attacks = 3): Promise<void> {
  await moveTo(page, x, y);
  await page.keyboard.press('Space');
  for (let index = 0; index < attacks; index += 1) {
    await clickGame(page, x, y);
    await page.waitForTimeout(360);
  }
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(120);
}

async function waitForScreen(page: Page, screen: string): Promise<void> {
  await expect.poll(() => runtimeScreen(page), { timeout: 10_000 }).toBe(screen);
}

async function equipFirstGear(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Inventory/ }).click();
  const gearIds = [
    'worn_dagger',
    'shadow_cowl',
    'trail_boots',
    'steel_dagger',
    'hooked_blade',
    'leather_jerkin',
    'cutpurse_gloves',
    'black_amber_amulet',
    'bandit_signet',
  ];

  let equipped = false;
  for (const id of gearIds) {
    const button = page.getByRole('button', { name: new RegExp(id) }).first();
    if (await button.count()) {
      await button.click();
      await page.getByRole('button', { name: 'Equip' }).click();
      equipped = true;
      break;
    }
  }
  expect(equipped).toBe(true);
  await expect.poll(async () => Number(await page.getByTestId('runtime-equipped-count').textContent())).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Close' }).click();
}

test('vertical slice completes through real runtime input and survives reload', async ({ page }) => {
  await page.goto('/?testMode=1');

  await expect(page.getByRole('button', { name: 'Defeat encounter' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Pick up test loot' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Defeat boss' })).toHaveCount(0);

  await expect(page.getByText('Bandit Leader Contract')).toBeVisible();
  await page.getByRole('button', { name: 'Accept' }).click();
  await page.keyboard.press('KeyJ');

  await page.keyboard.press('KeyE');
  await waitForScreen(page, 'forest');

  await attackNear(page, 740, 360, 5);
  await attackNear(page, 500, 300, 4);
  await attackNear(page, 900, 220, 3);
  await attackNear(page, 430, 480, 4);
  await attackNear(page, 860, 480, 3);
  await attackNear(page, 640, 360, 5);

  if ((await page.getByTestId('runtime-forest-cleared').textContent()) !== 'true') {
    await attackNear(page, 900, 220, 3);
    await attackNear(page, 640, 360, 5);
  }
  await expect(page.getByTestId('runtime-forest-cleared')).toHaveText('true');

  await equipFirstGear(page);

  for (let i = 0; i < 8 && await runtimeScreen(page) === 'forest'; i += 1) {
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(120);
  }
  await waitForScreen(page, 'hideout');

  const hideoutTargets = [
    [300, 230], [480, 490], [660, 230], [840, 490], [1020, 230],
    [300, 490], [480, 230], [660, 490], [840, 230], [1020, 490],
  ] as const;
  for (let sweep = 0; sweep < 2 && await runtimeScreen(page) === 'hideout'; sweep += 1) {
    for (const [x, y] of hideoutTargets) {
      await attackNear(page, x, y, 2);
      if (await runtimeScreen(page) !== 'hideout') break;
    }
    if (await runtimeScreen(page) === 'hideout') {
      await page.keyboard.press('KeyE');
      await page.waitForTimeout(200);
    }
  }
  await waitForScreen(page, 'boss');

  await moveTo(page, 650, 360, 45);
  await page.keyboard.press('Space');
  for (let index = 0; index < 5; index += 1) {
    await clickGame(page, 720, 360);
    await page.waitForTimeout(360);
  }
  await expect(page.getByTestId('runtime-quest-status')).toHaveText('leaderDefeated');

  await moveTo(page, 720, 360, 35);
  for (let i = 0; i < 4 && await runtimeScreen(page) === 'boss'; i += 1) {
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(150);
  }
  await waitForScreen(page, 'outpost');

  await page.keyboard.press('KeyJ');
  await page.getByRole('button', { name: 'Turn in' }).click();
  await page.getByRole('button', { name: 'Save game' }).click();
  await expect(page.getByTestId('runtime-quest-status')).toHaveText('completed');

  await page.reload();
  await expect(page.getByTestId('runtime-quest-status')).toHaveText('completed');
  await expect.poll(async () => Number(await page.getByTestId('runtime-equipped-count').textContent())).toBeGreaterThan(0);
});

test('normal outpost gate remains single-shot across repeated mounts', async ({ page }) => {
  await page.goto('/?testMode=1');
  for (let index = 0; index < 3; index += 1) {
    await waitForScreen(page, 'outpost');
    await page.keyboard.press('KeyE');
    await waitForScreen(page, 'forest');
    await page.reload();
  }
  await waitForScreen(page, 'outpost');
});
