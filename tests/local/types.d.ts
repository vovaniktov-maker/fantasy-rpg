declare module 'node:test' { const test: (name: string, fn: () => void | Promise<void>) => void; export default test; export function describe(name: string, fn: () => void): void; }
declare module 'node:assert/strict' { const assert: any; export default assert; }
declare module 'phaser' {
  namespace Types { namespace Core { interface GameConfig { type?: unknown; parent?: string | HTMLElement; width?: number; height?: number; backgroundColor?: string; pixelArt?: boolean; physics?: unknown; scene?: unknown[]; } } }
  const Phaser: any;
  export default Phaser;
  export { Types };
}
