import Phaser from 'phaser';

type EnvironmentScene = any;

function floor(scene: EnvironmentScene, key: string): void {
  scene.add.tileSprite(640, 360, 1280, 720, key).setDepth(-20);
}

export function buildOutpostEnvironment(scene: EnvironmentScene): void {
  floor(scene, 'tile-dirt');
  scene.add.tileSprite(640, 560, 1280, 220, 'tile-stone').setDepth(-15).setAlpha(0.55);
  [[210,215],[1030,230],[970,500]].forEach(([x,y]) => scene.add.image(x,y,'prop-tent').setScale(1.35).setDepth(y));
  [[300,255],[338,274],[915,505],[955,520],[1060,275]].forEach(([x,y]) => scene.add.image(x,y,'prop-crate').setDepth(y));
  scene.add.image(640,335,'prop-campfire').setScale(1.4).setDepth(335);
  scene.add.image(640,610,'prop-banner').setScale(1.2).setDepth(610);
  scene.add.image(590,610,'prop-torch').setDepth(610);
  scene.add.image(690,610,'prop-torch').setDepth(610);
}

export function buildForestEnvironment(scene: EnvironmentScene): void {
  floor(scene, 'tile-grass');
  scene.add.tileSprite(650,360,340,760,'tile-dirt').setRotation(0.04).setDepth(-15).setAlpha(0.78);
  const trees = [[90,120],[185,90],[1090,105],[1185,150],[100,600],[220,640],[1080,615],[1190,570],[315,125],[960,110],[330,650],[950,645]];
  trees.forEach(([x,y],i) => scene.add.image(x,y,i % 4 === 0 ? 'prop-dead-tree' : 'prop-tree').setScale(i % 3 === 0 ? 1.15 : 1).setDepth(y));
  [[390,115],[835,140],[260,420],[1025,385],[430,620],[830,610]].forEach(([x,y]) => scene.add.image(x,y,'prop-rock').setDepth(y));
  scene.add.image(555,150,'prop-campfire').setScale(0.8).setDepth(150).setAlpha(0.75);
}

export function buildHideoutEnvironment(scene: EnvironmentScene): void {
  floor(scene, 'tile-stone');
  scene.add.tileSprite(640,390,1040,500,'tile-wood').setDepth(-15).setAlpha(0.32);
  for (let x=80; x<=1200; x+=64) {
    scene.add.image(x,95,'prop-wall').setDepth(95);
    scene.add.image(x,650,'prop-wall').setDepth(650);
  }
  [[130,170],[1150,175],[130,560],[1150,555]].forEach(([x,y]) => scene.add.image(x,y,'prop-torch').setDepth(y));
  [[260,180],[1010,190],[270,560],[1000,550],[635,150]].forEach(([x,y]) => scene.add.image(x,y,'prop-crate').setDepth(y));
  scene.add.image(1160,360,'prop-banner').setScale(1.3).setDepth(360);
}

export function buildBossEnvironment(scene: EnvironmentScene): void {
  floor(scene, 'tile-stone');
  scene.add.rectangle(640,365,930,500,0x27191c,0.55).setStrokeStyle(5,0x5e3139,0.8).setDepth(-15);
  scene.add.circle(640,365,220,0x411f29,0.22).setStrokeStyle(3,0x75404a,0.45).setDepth(-14);
  [[190,150],[1090,150],[190,580],[1090,580]].forEach(([x,y]) => scene.add.image(x,y,'prop-torch').setScale(1.35).setDepth(y));
  [[260,135],[1020,135]].forEach(([x,y]) => scene.add.image(x,y,'prop-banner').setScale(1.45).setDepth(y));
}
