import { useEffect, useRef } from 'react';
import { createGame } from './createGame';

export function GameCanvas() {
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!parentRef.current) return;
    const game = createGame(parentRef.current);
    return () => game.destroy(true);
  }, []);

  return <div id="game-root" ref={parentRef} className="game-canvas" aria-label="Fantasy RPG game canvas" />;
}
