export class GameplayActionBuffer {
  private basicAttackQueued = false;

  queueBasicAttack(): void {
    this.basicAttackQueued = true;
  }

  consumeBasicAttack(): boolean {
    if (!this.basicAttackQueued) return false;
    this.basicAttackQueued = false;
    return true;
  }

  clear(): void {
    this.basicAttackQueued = false;
  }
}
