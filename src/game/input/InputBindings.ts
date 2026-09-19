export const INPUT_BINDINGS = {
  moveUp: 'W',
  moveDown: 'S',
  moveLeft: 'A',
  moveRight: 'D',
  basicAttack: 'POINTER_LEFT',
  secondaryAction: 'POINTER_RIGHT',
  skill1: 'ONE',
  skill2: 'TWO',
  skill3: 'THREE',
  skill4: 'FOUR',
  dodge: 'SPACE',
  interact: 'E',
} as const;

export type InputBindingAction = keyof typeof INPUT_BINDINGS;
