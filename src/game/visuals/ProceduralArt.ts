import Phaser from 'phaser';

type Draw = (graphics: Phaser.GameObjects.Graphics) => void;

function makeTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: Draw,
): void {
  if (scene.textures.exists(key)) return;
  const graphics = scene.add.graphics();
  draw(graphics);
  graphics.generateTexture(key, width, height);
  graphics.destroy();
}

function pixelBody(
  g: Phaser.GameObjects.Graphics,
  body: number,
  hood: number,
  skin: number,
  accent: number,
): void {
  g.fillStyle(body, 1);
  g.fillRect(15, 20, 18, 20);
  g.fillRect(12, 26, 6, 12);
  g.fillRect(30, 26, 6, 12);
  g.fillRect(16, 39, 7, 7);
  g.fillRect(25, 39, 7, 7);
  g.fillStyle(hood, 1);
  g.fillRect(14, 8, 20, 15);
  g.fillRect(11, 12, 5, 10);
  g.fillRect(32, 12, 5, 10);
  g.fillStyle(skin, 1);
  g.fillRect(19, 16, 10, 5);
  g.fillStyle(accent, 1);
  g.fillRect(17, 23, 14, 4);
}

function drawDagger(g: Phaser.GameObjects.Graphics, x: number, y: number, flip = false): void {
  g.fillStyle(0xc6d0d8, 1);
  if (flip) {
    g.fillTriangle(x, y + 3, x + 12, y, x + 3, y + 12);
  } else {
    g.fillTriangle(x, y, x + 12, y + 3, x + 3, y + 12);
  }
  g.fillStyle(0x795a38, 1);
  g.fillRect(x + 3, y + 9, 5, 5);
}

function drawSword(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0xd7dde3, 1);
  g.fillRect(x + 3, y, 4, 16);
  g.fillTriangle(x + 1, y + 1, x + 9, y + 1, x + 5, y - 5);
  g.fillStyle(0x9b7040, 1);
  g.fillRect(x, y + 14, 10, 3);
  g.fillRect(x + 3, y + 17, 4, 6);
}

function drawBow(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.lineStyle(3, 0x9c6a35, 1);
  g.beginPath();
  g.arc(x, y, 12, -1.25, 1.25, false);
  g.strokePath();
  g.lineStyle(1, 0xd9d2bf, 1);
  g.lineBetween(x + 4, y - 11, x + 4, y + 11);
}

function drawHammer(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x6e7479, 1);
  g.fillRect(x, y, 18, 9);
  g.fillStyle(0x5c3d28, 1);
  g.fillRect(x + 7, y + 7, 5, 20);
}

function drawPlayer(scene: Phaser.Scene): void {
  makeTexture(scene, 'rogue', 48, 48, (g) => {
    pixelBody(g, 0x26323d, 0x352b54, 0xd6b08b, 0x754fc4);
    g.fillStyle(0x151b22, 1);
    g.fillRect(10, 21, 5, 16);
    g.fillRect(33, 21, 5, 16);
    drawDagger(g, 2, 22);
    drawDagger(g, 34, 22, true);
    g.fillStyle(0x8f74d6, 1);
    g.fillRect(13, 7, 22, 3);
  });
}

function drawEnemies(scene: Phaser.Scene): void {
  makeTexture(scene, 'enemy-bandit-guard', 48, 48, (g) => {
    pixelBody(g, 0x5d4032, 0x7f352d, 0xc99b78, 0x9e6743);
    drawSword(g, 35, 17);
    g.fillStyle(0x71452d, 1);
    g.fillCircle(10, 30, 7);
    g.fillStyle(0xb79b71, 1);
    g.fillCircle(10, 30, 4);
  });

  makeTexture(scene, 'enemy-bandit-cutthroat', 48, 48, (g) => {
    pixelBody(g, 0x342d32, 0x211f26, 0xb8866e, 0x7c2534);
    drawDagger(g, 2, 24);
    drawDagger(g, 34, 24, true);
    g.fillStyle(0x8b2f42, 1);
    g.fillRect(14, 11, 20, 3);
  });

  makeTexture(scene, 'enemy-bandit-archer', 48, 48, (g) => {
    pixelBody(g, 0x45503b, 0x34402d, 0xc69a78, 0x73805b);
    drawBow(g, 38, 28);
    g.fillStyle(0x75512f, 1);
    g.fillRect(7, 18, 6, 24);
    g.fillStyle(0xc6c2aa, 1);
    for (let i = 0; i < 3; i += 1) g.fillRect(9 + i, 14 - i * 2, 1, 11);
  });

  makeTexture(scene, 'enemy-bandit-heavy', 56, 56, (g) => {
    g.fillStyle(0x404247, 1);
    g.fillRect(13, 20, 30, 28);
    g.fillStyle(0x5b5d62, 1);
    g.fillRect(9, 24, 8, 18);
    g.fillRect(39, 24, 8, 18);
    g.fillStyle(0x2e3034, 1);
    g.fillRect(15, 7, 26, 17);
    g.fillStyle(0xb88769, 1);
    g.fillRect(22, 15, 12, 5);
    g.fillStyle(0x9c6b37, 1);
    g.fillRect(16, 25, 24, 5);
    drawHammer(g, 36, 21);
  });

  makeTexture(scene, 'enemy-bandit-trapper', 48, 48, (g) => {
    pixelBody(g, 0x554831, 0x443824, 0xc69770, 0xaa7b35);
    g.fillStyle(0x6f5533, 1);
    g.fillRect(3, 19, 11, 19);
    g.fillStyle(0xc1a15c, 1);
    g.fillRect(5, 22, 7, 3);
    g.fillStyle(0x899097, 1);
    g.lineStyle(2, 0x899097, 1);
    g.strokeCircle(38, 32, 7);
    g.lineBetween(33, 27, 43, 37);
    g.lineBetween(43, 27, 33, 37);
  });

  makeTexture(scene, 'enemy-bandit-leader', 72, 72, (g) => {
    g.fillStyle(0x241e25, 1);
    g.fillRect(22, 28, 28, 31);
    g.fillStyle(0x631f2b, 1);
    g.fillRect(18, 12, 36, 22);
    g.fillTriangle(18, 30, 10, 61, 28, 48);
    g.fillTriangle(54, 30, 62, 61, 44, 48);
    g.fillStyle(0xd2a07c, 1);
    g.fillRect(29, 23, 14, 7);
    g.fillStyle(0xd2b068, 1);
    g.fillRect(24, 34, 24, 5);
    drawDagger(g, 7, 34);
    drawDagger(g, 51, 34, true);
    g.fillStyle(0xe7a346, 1);
    g.fillRect(19, 10, 34, 3);
  });
}

function drawItems(scene: Phaser.Scene): void {
  makeTexture(scene, 'item-weapon', 32, 32, (g) => drawDagger(g, 8, 6));
  makeTexture(scene, 'item-offhand', 32, 32, (g) => {
    drawDagger(g, 8, 7, true);
    g.fillStyle(0x9a6439, 1);
    g.fillCircle(20, 20, 6);
  });
  makeTexture(scene, 'item-head', 32, 32, (g) => {
    g.fillStyle(0x4d3e61, 1);
    g.fillRect(7, 9, 18, 15);
    g.fillRect(4, 15, 5, 9);
    g.fillRect(23, 15, 5, 9);
    g.fillStyle(0xd4b18e, 1);
    g.fillRect(12, 17, 8, 4);
  });
  makeTexture(scene, 'item-body', 32, 32, (g) => {
    g.fillStyle(0x6c4e36, 1);
    g.fillRect(7, 8, 18, 20);
    g.fillStyle(0x9a754f, 1);
    g.fillRect(14, 8, 4, 20);
  });
  makeTexture(scene, 'item-gloves', 32, 32, (g) => {
    g.fillStyle(0x79583f, 1);
    g.fillRect(5, 10, 9, 15);
    g.fillRect(18, 10, 9, 15);
  });
  makeTexture(scene, 'item-boots', 32, 32, (g) => {
    g.fillStyle(0x594231, 1);
    g.fillRect(6, 7, 8, 17);
    g.fillRect(18, 7, 8, 17);
    g.fillRect(4, 22, 12, 5);
    g.fillRect(16, 22, 12, 5);
  });
  makeTexture(scene, 'item-amulet', 32, 32, (g) => {
    g.lineStyle(2, 0xc5a65f, 1);
    g.strokeCircle(16, 15, 9);
    g.fillStyle(0x7c334a, 1);
    g.fillCircle(16, 21, 5);
  });
  makeTexture(scene, 'item-ring', 32, 32, (g) => {
    g.lineStyle(4, 0xd2b05d, 1);
    g.strokeCircle(16, 16, 8);
    g.fillStyle(0x8e3e4d, 1);
    g.fillRect(13, 5, 6, 5);
  });
  makeTexture(scene, 'item-health-potion', 32, 32, (g) => {
    g.fillStyle(0xddd2bd, 1);
    g.fillRect(12, 4, 8, 5);
    g.fillStyle(0x6e2732, 1);
    g.fillRect(8, 9, 16, 18);
    g.fillStyle(0xd95858, 1);
    g.fillRect(10, 13, 12, 11);
  });
  makeTexture(scene, 'item-energy-potion', 32, 32, (g) => {
    g.fillStyle(0xddd2bd, 1);
    g.fillRect(12, 4, 8, 5);
    g.fillStyle(0x273b65, 1);
    g.fillRect(8, 9, 16, 18);
    g.fillStyle(0x4e86de, 1);
    g.fillRect(10, 13, 12, 11);
  });
  makeTexture(scene, 'item-bandit-token', 32, 32, (g) => {
    g.fillStyle(0xb5894c, 1);
    g.fillCircle(16, 16, 10);
    g.fillStyle(0x725332, 1);
    g.fillRect(13, 9, 6, 14);
  });
  makeTexture(scene, 'item-material', 32, 32, (g) => {
    g.fillStyle(0x8b785c, 1);
    g.fillTriangle(6, 24, 16, 6, 26, 24);
  });
  makeTexture(scene, 'item-generic', 32, 32, (g) => {
    g.fillStyle(0xe2d3aa, 1);
    g.fillRect(7, 7, 18, 18);
    g.fillStyle(0x7f6b4b, 1);
    g.fillRect(10, 10, 12, 12);
  });
}

function drawEnvironment(scene: Phaser.Scene): void {
  makeTexture(scene, 'tile-grass', 64, 64, (g) => {
    g.fillStyle(0x1f3426, 1);
    g.fillRect(0, 0, 64, 64);
    g.fillStyle(0x29422f, 1);
    for (const [x, y] of [[8, 8], [30, 12], [51, 5], [17, 38], [43, 47], [58, 31]]) {
      g.fillRect(x, y, 2, 8);
      g.fillRect(x - 2, y + 4, 2, 4);
    }
  });
  makeTexture(scene, 'tile-dirt', 64, 64, (g) => {
    g.fillStyle(0x493b2b, 1);
    g.fillRect(0, 0, 64, 64);
    g.fillStyle(0x594936, 1);
    for (const [x, y] of [[8, 14], [22, 48], [39, 25], [55, 9], [49, 54]]) g.fillCircle(x, y, 2);
  });
  makeTexture(scene, 'tile-stone', 64, 64, (g) => {
    g.fillStyle(0x2c2d31, 1);
    g.fillRect(0, 0, 64, 64);
    g.lineStyle(2, 0x3c3e44, 1);
    g.lineBetween(0, 20, 64, 20);
    g.lineBetween(0, 43, 64, 43);
    g.lineBetween(19, 0, 19, 20);
    g.lineBetween(45, 20, 45, 43);
    g.lineBetween(27, 43, 27, 64);
  });
  makeTexture(scene, 'tile-wood', 64, 64, (g) => {
    g.fillStyle(0x4b3628, 1);
    g.fillRect(0, 0, 64, 64);
    g.lineStyle(2, 0x634a38, 1);
    for (let y = 8; y < 64; y += 12) g.lineBetween(0, y, 64, y);
    g.fillStyle(0x2d211b, 1);
    for (const [x, y] of [[9, 8], [38, 20], [20, 44], [56, 56]]) g.fillCircle(x, y, 2);
  });

  makeTexture(scene, 'prop-tree', 72, 96, (g) => {
    g.fillStyle(0x3d2b20, 1);
    g.fillRect(29, 52, 15, 39);
    g.fillStyle(0x294532, 1);
    g.fillCircle(21, 48, 20);
    g.fillCircle(48, 45, 22);
    g.fillCircle(35, 27, 26);
    g.fillStyle(0x36593e, 1);
    g.fillCircle(28, 28, 15);
    g.fillCircle(49, 42, 13);
  });
  makeTexture(scene, 'prop-dead-tree', 72, 96, (g) => {
    g.fillStyle(0x4b392c, 1);
    g.fillRect(31, 35, 12, 56);
    g.fillRect(15, 42, 22, 8);
    g.fillRect(39, 26, 20, 8);
    g.fillRect(15, 22, 8, 25);
    g.fillRect(52, 10, 8, 23);
  });
  makeTexture(scene, 'prop-rock', 56, 40, (g) => {
    g.fillStyle(0x54565b, 1);
    g.fillTriangle(5, 34, 18, 9, 31, 34);
    g.fillTriangle(20, 34, 38, 5, 51, 34);
    g.fillStyle(0x6a6c72, 1);
    g.fillTriangle(21, 29, 38, 7, 39, 29);
  });
  makeTexture(scene, 'prop-crate', 48, 48, (g) => {
    g.fillStyle(0x77512f, 1);
    g.fillRect(4, 4, 40, 40);
    g.lineStyle(4, 0x4b321f, 1);
    g.strokeRect(4, 4, 40, 40);
    g.lineBetween(7, 7, 41, 41);
    g.lineBetween(41, 7, 7, 41);
  });
  makeTexture(scene, 'prop-tent', 96, 72, (g) => {
    g.fillStyle(0x6c3c31, 1);
    g.fillTriangle(8, 63, 47, 7, 88, 63);
    g.fillStyle(0x3b2420, 1);
    g.fillTriangle(42, 63, 48, 25, 55, 63);
    g.lineStyle(3, 0xb38a61, 1);
    g.lineBetween(47, 8, 47, 66);
  });
  makeTexture(scene, 'prop-campfire', 48, 48, (g) => {
    g.fillStyle(0x563d2b, 1);
    g.fillRect(8, 32, 32, 5);
    g.fillStyle(0xe5592a, 1);
    g.fillTriangle(14, 32, 24, 8, 34, 32);
    g.fillStyle(0xf4b942, 1);
    g.fillTriangle(19, 32, 25, 15, 30, 32);
  });
  makeTexture(scene, 'prop-torch', 24, 64, (g) => {
    g.fillStyle(0x694528, 1);
    g.fillRect(10, 23, 5, 36);
    g.fillStyle(0xe85b2d, 1);
    g.fillCircle(12, 16, 8);
    g.fillStyle(0xffc247, 1);
    g.fillCircle(12, 14, 4);
  });
  makeTexture(scene, 'prop-wall', 64, 64, (g) => {
    g.fillStyle(0x35363a, 1);
    g.fillRect(0, 7, 64, 50);
    g.lineStyle(2, 0x4a4b50, 1);
    g.strokeRect(2, 9, 60, 46);
    g.lineBetween(0, 30, 64, 30);
    g.lineBetween(20, 7, 20, 30);
    g.lineBetween(44, 30, 44, 57);
  });
  makeTexture(scene, 'prop-banner', 32, 72, (g) => {
    g.fillStyle(0x5b4029, 1);
    g.fillRect(14, 3, 5, 66);
    g.fillStyle(0x7d2835, 1);
    g.fillRect(18, 10, 13, 30);
    g.fillTriangle(18, 40, 31, 40, 25, 52);
  });
}

function drawEffects(scene: Phaser.Scene): void {
  makeTexture(scene, 'fx-slash', 72, 72, (g) => {
    g.lineStyle(7, 0xeee6cf, 0.9);
    g.beginPath();
    g.arc(36, 36, 28, -1.2, 0.8, false);
    g.strokePath();
    g.lineStyle(3, 0xb6a4e9, 0.8);
    g.beginPath();
    g.arc(36, 36, 23, -1.1, 0.7, false);
    g.strokePath();
  });
  makeTexture(scene, 'fx-smoke', 48, 48, (g) => {
    g.fillStyle(0x4d4c58, 0.7);
    g.fillCircle(15, 25, 12);
    g.fillCircle(29, 19, 14);
    g.fillCircle(34, 31, 11);
  });
  makeTexture(scene, 'fx-loot-glow', 48, 48, (g) => {
    g.fillStyle(0xffffff, 0.08);
    g.fillCircle(24, 24, 22);
    g.lineStyle(2, 0xffffff, 0.25);
    g.strokeCircle(24, 24, 18);
  });
}

export function createProceduralArt(scene: Phaser.Scene): void {
  drawPlayer(scene);
  drawEnemies(scene);
  drawItems(scene);
  drawEnvironment(scene);
  drawEffects(scene);
}
