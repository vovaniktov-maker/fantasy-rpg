export interface PlayerStepInput {
  dtMs: number;
  moveX: number;
  moveY: number;
  playerX: number;
  playerY: number;
  aimX: number;
  aimY: number;
  dodgePressed: boolean;
}

export interface PlayerStepResult {
  velocity: { x: number; y: number };
  facingRadians: number;
  requestedDodge: boolean;
}

export class PlayerController {
  constructor(private readonly moveSpeed: number) {}

  step(input: PlayerStepInput): PlayerStepResult {
    const length = Math.hypot(input.moveX, input.moveY);
    const scale = length > 1 ? 1 / length : 1;
    const velocity = {
      x: input.moveX * scale * this.moveSpeed,
      y: input.moveY * scale * this.moveSpeed,
    };
    const dx = input.aimX - input.playerX;
    const dy = input.aimY - input.playerY;
    const facingRadians = dx === 0 && dy === 0 ? 0 : Math.atan2(dy, dx);
    return { velocity, facingRadians, requestedDodge: input.dodgePressed };
  }
}
