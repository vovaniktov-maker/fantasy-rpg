export class GameplayActionBuffer {
  private basicAttackQueued = false;
  private interactQueued = false;
  private dodgeQueued = false;
  private skillSlotQueued: number | null = null;

  queueBasicAttack(): void {
    this.basicAttackQueued = true;
  }

  consumeBasicAttack(): boolean {
    if (!this.basicAttackQueued) return false;
    this.basicAttackQueued = false;
    return true;
  }

  queueInteract(): void {
    this.interactQueued = true;
  }

  consumeInteract(): boolean {
    if (!this.interactQueued) return false;
    this.interactQueued = false;
    return true;
  }

  queueDodge(): void {
    this.dodgeQueued = true;
  }

  consumeDodge(): boolean {
    if (!this.dodgeQueued) return false;
    this.dodgeQueued = false;
    return true;
  }

  queueSkillSlot(slotIndex: number): void {
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 3) return;
    this.skillSlotQueued = slotIndex;
  }

  consumeSkillSlot(): number | null {
    const slot = this.skillSlotQueued;
    this.skillSlotQueued = null;
    return slot;
  }

  clear(): void {
    this.basicAttackQueued = false;
    this.interactQueued = false;
    this.dodgeQueued = false;
    this.skillSlotQueued = null;
  }
}
