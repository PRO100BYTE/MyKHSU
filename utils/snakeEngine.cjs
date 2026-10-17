const GRID_SIZE = 16;
const INITIAL_SNAKE = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }];
const INITIAL_DIRECTION = { x: 1, y: 0 };
const samePoint = (a, b) => a.x === b.x && a.y === b.y;
const isOpposite = (a, b) => a.x === -b.x && a.y === -b.y;

function spawnFood(snake, random = Math.random) {
  const occupied = new Set(snake.map(point => `${point.x}:${point.y}`));
  const free = [];
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      if (!occupied.has(`${x}:${y}`)) free.push({ x, y });
    }
  }
  const sample = random();
  const fraction = Number.isFinite(sample) ? Math.max(0, Math.min(0.999999, sample)) : 0;
  return free.length ? free[Math.floor(fraction * free.length)] : null;
}

function createGame(random = Math.random) {
  const snake = INITIAL_SNAKE.map(point => ({ ...point }));
  return {
    snake,
    direction: { ...INITIAL_DIRECTION },
    queuedDirection: null,
    food: spawnFood(snake, random),
    score: 0,
    running: false,
    paused: false,
    gameOver: false,
    won: false,
  };
}

function queueDirection(state, direction) {
  if (!state.running || state.gameOver || !direction || state.queuedDirection) return state;
  if (!Number.isInteger(direction.x) || !Number.isInteger(direction.y) || Math.abs(direction.x) + Math.abs(direction.y) !== 1) return state;
  if (isOpposite(direction, state.direction) || samePoint(direction, state.direction)) return state;
  // Only the first valid turn is consumed per tick, even during rapid double taps.
  return { ...state, queuedDirection: { x: direction.x, y: direction.y } };
}

function tick(state, random = Math.random) {
  if (!state.running || state.gameOver) return state;
  const direction = state.queuedDirection || state.direction;
  const next = { x: state.snake[0].x + direction.x, y: state.snake[0].y + direction.y };
  const outside = next.x < 0 || next.x >= GRID_SIZE || next.y < 0 || next.y >= GRID_SIZE;
  const eats = state.food && samePoint(next, state.food);
  const bodyToCheck = eats ? state.snake : state.snake.slice(0, -1);
  if (outside || bodyToCheck.some(point => samePoint(point, next))) {
    return { ...state, running: false, gameOver: true, queuedDirection: null };
  }
  const snake = [next, ...bodyToCheck];
  const food = eats ? spawnFood(snake, random) : state.food;
  const won = food === null;
  return {
    ...state,
    snake,
    direction,
    queuedDirection: null,
    score: eats ? state.score + 10 : state.score,
    food,
    won,
    gameOver: won,
    running: !won,
  };
}

function start(state) {
  const next = state.gameOver ? createGame() : state;
  return { ...next, running: true, paused: false, queuedDirection: null };
}

module.exports = { GRID_SIZE, INITIAL_SNAKE, INITIAL_DIRECTION, createGame, queueDirection, spawnFood, start, tick };
