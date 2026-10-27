const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame, queueDirection, tick, start, spawnFood } = require('../utils/snakeEngine.cjs');

test('ticks inside bounded board and does not place food on snake', () => {
  const game = start(createGame(() => 0));
  const next = tick(game, () => 0.5);
  assert.equal(next.snake[0].x, 9);
  assert.ok(!next.snake.some(point => point.x === next.food.x && point.y === next.food.y));
});

test('rejects direct reversal and queues only one safe turn per tick', () => {
  let game = start(createGame(() => 0));
  game = queueDirection(game, { x: 0, y: -1 });
  game = queueDirection(game, { x: -1, y: 0 });
  game = tick(game, () => 0);
  assert.deepEqual(game.direction, { x: 0, y: -1 });
  assert.deepEqual(game.snake[0], { x: 8, y: 7 });
});

test('ends on wall and restart creates a fresh running game', () => {
  let game = start(createGame(() => 0));
  for (let i = 0; i < 8; i += 1) game = tick(game, () => 0);
  assert.equal(game.gameOver, true);
  assert.equal(start(game).running, true);
  assert.equal(start(game).gameOver, false);
});

test('food helper returns null only when board is full', () => {
  const snake = [];
  for (let y = 0; y < 16; y += 1) for (let x = 0; x < 16; x += 1) snake.push({ x, y });
  assert.equal(spawnFood(snake), null);
});
