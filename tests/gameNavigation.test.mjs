import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  entryPoints: [new URL('../src/store/gameStore.ts', import.meta.url).pathname],
  bundle: true, write: false, format: 'esm', platform: 'node', external: ['zustand'],
});
const source = bundle.outputFiles[0].text.replaceAll('"zustand"', JSON.stringify(import.meta.resolve('zustand')));
const { useGameStore } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('returning home after a finished match clears the match and ignores delayed results', () => {
  useGameStore.getState().startGame();
  const matchId = useGameStore.getState().matchId;
  for (let round = 0; round < 3; round++) {
    useGameStore.getState().recordShot('goal', matchId);
    useGameStore.getState().recordShot('miss', matchId);
  }
  assert.equal(useGameStore.getState().gamePhase, 'gameover');
  assert.equal(useGameStore.getState().winner, 1);
  useGameStore.getState().setShooting(true);
  useGameStore.getState().setNetBulge(true);
  useGameStore.getState().resetGame();
  useGameStore.getState().recordShot('goal', matchId);
  const home = useGameStore.getState();
  assert.equal(home.gamePhase, 'menu');
  assert.equal(home.winner, null);
  assert.equal(home.isShooting, false);
  assert.equal(home.isNetBulging, false);
  assert.ok(home.players.every(player => player.shots.length === 0));
});

test('a pending result from an earlier match cannot score in a new match', () => {
  useGameStore.getState().startGame();
  const oldMatch = useGameStore.getState().matchId;
  useGameStore.getState().resetGame();
  useGameStore.getState().startGame();
  const newMatch = useGameStore.getState().matchId;
  assert.notEqual(newMatch, oldMatch);
  useGameStore.getState().recordShot('goal', oldMatch);
  assert.ok(useGameStore.getState().players.every(player => player.shots.length === 0));
  useGameStore.getState().recordShot('goal', newMatch);
  assert.deepEqual(useGameStore.getState().players[0].shots, ['goal']);
  useGameStore.getState().resetGame();
});
