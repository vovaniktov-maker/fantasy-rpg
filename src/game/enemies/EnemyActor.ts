export interface EnemyActorSnapshot {
  id: string;
  definitionId: string;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  alive: boolean;
}

export class EnemyActor {
  constructor(private state: EnemyActorSnapshot) {}
  get snapshot(): EnemyActorSnapshot { return { ...this.state }; }
  setPosition(x: number, y: number): void { this.state = { ...this.state, x, y }; }
  damage(amount: number): void {
    const hp = Math.max(0, this.state.hp - Math.max(0, amount));
    this.state = { ...this.state, hp, alive: hp > 0 };
  }
}
