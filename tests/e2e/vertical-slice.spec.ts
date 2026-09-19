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

async function attackRuntimeEnemy(page: Page, target: RuntimeEnemyDiagnostic): Promise<void> {
  await moveTo(page, target.x, target.y, 75);

  const liveTarget = (await runtimeEnemies(page)).find((enemy) => enemy.id === target.id);
  if (!liveTarget) return;

  const player = await playerPosition(page);
  if (Math.hypot(liveTarget.x - player.x, liveTarget.y - player.y) > 115) return;

  await clickGame(page, liveTarget.x, liveTarget.y);
  await page.waitForTimeout(80);
  await page.keyboard.press('Space');
  await page.waitForTimeout(140);
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(100);
}

async function waitForScreen(page: Page, screen: string): Promise<void> {
  await expect.poll(() => runtimeScreen(page), { timeout: 10_000 }).toBe(screen);
}

async function pressUntilScreen(page: Page, key: string, screen: string): Promise<void> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (await runtimeScreen(page) === screen) return;
    await page.keyboard.press(key);
    await page.waitForTimeout(120);
  }
  await waitForScreen(page, screen);
}

interface RuntimeEnemyDiagnostic {
  id: string;
  x: number;
  y: number;
  hp: number;
}

async function runtimeEnemies(page: Page): Promise<RuntimeEnemyDiagnostic[]> {
  const raw = (await page.getByTestId('runtime-enemies').textContent()) ?? '[]';
  return JSON.parse(raw) as RuntimeEnemyDiagnostic[];
}

async function clearRuntimeEnemies(page: Page, maxEngagements = 24): Promise<void> {
  for (let engagement = 0; engagement < maxEngagements; engagement += 1) {
    const enemies = await runtimeEnemies(page);
    if (enemies.length === 0) return;
    const player = await playerPosition(page);
    enemies.sort((a, b) =>
      Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y)
    );
    const target = enemies[0];
    await attackRuntimeEnemy(page, target);
  }
  expect(await runtimeEnemies(page)).toHaveLength(0);
}


async function runtimeQuestStatus(page: Page): Promise<string> {
  return (await page.getByTestId('runtime-quest-status').textContent())?.trim() ?? '';
}

async function defeatRuntimeBoss(page: Page, maxEngagements = 20): Promise<{ x: number; y: number }> {
  let lastKnown = { x: 720, y: 360 };

  for (let engagement = 0; engagement < maxEngagements; engagement += 1) {
    if (await runtimeQuestStatus(page) === 'leaderDefeated') return lastKnown;

    const screen = await runtimeScreen(page);
    const hp = (await page.getByTestId('runtime-player-hp').textContent())?.trim() ?? '?';
    if (screen !== 'boss') {
      throw new Error(`Boss fight left scene: screen=${screen}, playerHp=${hp}, lastBoss=${JSON.stringify(lastKnown)}`);
    }

    const boss = (await runtimeEnemies(page)).find((enemy) => enemy.id === 'bandit_leader');
    if (!boss) {
      await page.waitForTimeout(100);
      continue;
    }

    lastKnown = { x: boss.x, y: boss.y };
    await moveTo(page, boss.x, boss.y, 80);

    const movedBoss = (await runtimeEnemies(page)).find((enemy) => enemy.id === 'bandit_leader') ?? boss;
    lastKnown = { x: movedBoss.x, y: movedBoss.y };
    const player = await playerPosition(page);
    if (Math.hypot(movedBoss.x - player.x, movedBoss.y - player.y) > 115) continue;

    await clickGame(page, movedBoss.x, movedBoss.y);
    await page.waitForTimeout(80);
    await page.keyboard.press('Space');
    await page.waitForTimeout(140);
  }

  const hp = (await page.getByTestId('runtime-player-hp').textContent())?.trim() ?? '?';
  const player = await playerPosition(page);
  const enemies = await runtimeEnemies(page);
  throw new Error(`Boss not defeated after ${maxEngagements} engagements: playerHp=${hp}, player=${JSON.stringify(player)}, enemies=${JSON.stringify(enemies)}, lastBoss=${JSON.stringify(lastKnown)}`);
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

  await pressUntilScreen(page, 'KeyE', 'forest');

  await clearRuntimeEnemies(page);
  await expect(page.getByTestId('runtime-forest-cleared')).toHaveText('true');

  await equipFirstGear(page);

  for (let i = 0; i < 8 && await runtimeScreen(page) === 'forest'; i += 1) {
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(120);
  }
  await waitForScreen(page, 'hideout');

  await clearRuntimeEnemies(page, 40);
  await pressUntilScreen(page, 'KeyE', 'boss');

  const bossDropPosition = await defeatRuntimeBoss(page);
  await expect(page.getByTestId('runtime-quest-status')).toHaveText('leaderDefeated');

  await moveTo(page, bossDropPosition.x, bossDropPosition.y, 45);
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
    await pressUntilScreen(page, 'KeyE', 'forest');
    await page.reload();
  }
  await waitForScreen(page, 'outpost');
});
