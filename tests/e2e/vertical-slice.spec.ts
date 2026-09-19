import { expect, test } from '@playwright/test';

test('vertical slice can complete the contract and survive reload', async ({ page }) => {
  await page.goto('/?testMode=1');
  await expect(page.getByRole('button', { name: 'Defeat encounter' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Pick up test loot' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Defeat boss' })).toHaveCount(0);
  await expect(page.getByText('Bandit Leader Contract')).toBeVisible();
  await page.getByRole('button', { name: 'Accept' }).click();
  await page.getByRole('button', { name: 'Enter forest' }).click();
  await page.getByRole('button', { name: 'Defeat encounter' }).click();
  await page.getByRole('button', { name: 'Pick up test loot' }).click();
  await page.getByRole('button', { name: /Inventory/ }).click();
  await page.getByRole('button', { name: /steel_dagger/i }).click();
  await page.getByRole('button', { name: 'Equip' }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Enter hideout' }).click();
  await page.getByRole('button', { name: 'Reach boss' }).click();
  await page.getByRole('button', { name: 'Defeat boss' }).click();
  await page.getByRole('button', { name: 'Return to outpost' }).click();
  await page.getByRole('button', { name: 'Turn in' }).click();
  await page.getByRole('button', { name: 'Save game' }).click();
  await page.reload();
  await expect(page.getByText('Status: completed')).toBeVisible();
  await expect(page.getByText(/250 gold|gold/)).toBeVisible();
});

test('repeated transitions do not duplicate bridge actions', async ({ page }) => {
  await page.goto('/?testMode=1');
  for (let index = 0; index < 3; index += 1) {
    await page.getByRole('button', { name: 'Enter forest' }).click();
    await page.getByRole('button', { name: 'Enter hideout' }).click();
    await page.getByRole('button', { name: 'Return to outpost' }).click();
  }
  await page.getByRole('button', { name: 'Pick up test loot' }).click();
  await page.getByRole('button', { name: /Inventory/ }).click();
  await expect(page.getByText(/steel_dagger/)).toHaveCount(1);
});
