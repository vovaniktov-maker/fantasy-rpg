import Phaser from 'phaser';

interface CombatVisualScene {
  add: Phaser.GameObjects.GameObjectFactory;
  tweens: Phaser.Tweens.TweenManager;
}

export function drawAttackTelegraph(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  color = 0xe9a94a,
): void {
  graphics.clear();
  graphics.fillStyle(color, 0.12);
  graphics.fillCircle(x, y, radius);
  graphics.lineStyle(3, color, 0.72);
  graphics.strokeCircle(x, y, radius);
}

export function drawAttackActive(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
): void {
  graphics.clear();
  graphics.fillStyle(0xd84343, 0.15);
  graphics.fillCircle(x, y, radius);
  graphics.lineStyle(4, 0xed5d5d, 0.9);
  graphics.strokeCircle(x, y, radius);
}

export function clearTelegraph(graphics: Phaser.GameObjects.Graphics): void {
  graphics.clear();
}

export function playSlash(scene: CombatVisualScene, x: number, y: number, rotation: number): void {
  const slash = scene.add.image(x, y, 'fx-slash')
    .setRotation(rotation)
    .setAlpha(0.95)
    .setScale(0.75)
    .setDepth(1000);
  scene.tweens.add({
    targets: slash,
    alpha: 0,
    scale: 1.15,
    duration: 130,
    onComplete: () => slash.destroy(),
  });
}

export function playDodgeSmoke(scene: CombatVisualScene, x: number, y: number): void {
  const smoke = scene.add.image(x, y, 'fx-smoke')
    .setAlpha(0.6)
    .setDepth(999);
  scene.tweens.add({
    targets: smoke,
    alpha: 0,
    scale: 1.5,
    duration: 220,
    onComplete: () => smoke.destroy(),
  });
}
