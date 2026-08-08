import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LIQUID_GLASS, ACCENT_COLORS } from '../utils/constants';
import { unlockAchievement } from '../utils/achievements';
import { showAchievementToast } from './AchievementToast';

const GRID_SIZE = 16;
const CELL_SIZE = 16;
const TICK_MS = 140;
const CHAMPION_SCORE = 30;

const randomPos = (snake) => {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  return pos;
};

const INIT_SNAKE = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }];
const INIT_DIR = { x: 1, y: 0 };

const SnakeGame = ({ visible, onClose, theme, accentColor }) => {
  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.green;

  // All game state in refs to avoid stale closures in the interval callback
  const snakeRef = useRef([...INIT_SNAKE]);
  const dirRef = useRef({ ...INIT_DIR });
  const foodRef = useRef(randomPos(INIT_SNAKE));
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);
  const startedRef = useRef(false);
  const championRef = useRef(false);
  const tickRef = useRef(null);

  // Minimal state only for triggering re-renders
  const [tick, setTick] = useState(0);
  const rerender = useCallback(() => setTick(t => t + 1), []);

  const stopTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const resetGame = useCallback(() => {
    stopTick();
    snakeRef.current = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }];
    dirRef.current = { x: 1, y: 0 };
    foodRef.current = randomPos(snakeRef.current);
    scoreRef.current = 0;
    gameOverRef.current = false;
    startedRef.current = false;
    championRef.current = false;
    rerender();
  }, [stopTick, rerender]);

  const startGame = useCallback(() => {
    stopTick();
    startedRef.current = true;
    rerender();

    tickRef.current = setInterval(() => {
      if (gameOverRef.current) {
        stopTick();
        return;
      }

      const snake = snakeRef.current;
      const dir = dirRef.current;
      const food = foodRef.current;
      const head = snake[0];
      const newHead = { x: head.x + dir.x, y: head.y + dir.y };

      // Wall collision
      if (
        newHead.x < 0 ||
        newHead.x >= GRID_SIZE ||
        newHead.y < 0 ||
        newHead.y >= GRID_SIZE
      ) {
        gameOverRef.current = true;
        stopTick();
        rerender();
        return;
      }

      // Self collision
      if (snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
        gameOverRef.current = true;
        stopTick();
        rerender();
        return;
      }

      const ate = newHead.x === food.x && newHead.y === food.y;
      snakeRef.current = ate
        ? [newHead, ...snake]
        : [newHead, ...snake.slice(0, -1)];

      if (ate) {
        foodRef.current = randomPos(snakeRef.current);
        scoreRef.current += 10;
        if (scoreRef.current >= CHAMPION_SCORE && !championRef.current) {
          championRef.current = true;
          unlockAchievement('snake_champion').then(result => {
            if (result) showAchievementToast(result);
          }).catch(() => {});
        }
      }

      rerender();
    }, TICK_MS);
  }, [stopTick, rerender]);

  // Clean up on close / unmount
  useEffect(() => {
    if (!visible) {
      resetGame();
    }
    return stopTick;
  }, [visible, resetGame, stopTick]);

  const handleDir = (dx, dy) => {
    const cur = dirRef.current;
    // Prevent reversing direction
    if (cur.x === -dx && cur.y === -dy) return;
    dirRef.current = { x: dx, y: dy };
  };

  const handleAction = () => {
    if (gameOverRef.current) {
      resetGame();
      setTimeout(startGame, 30);
    } else {
      startGame();
    }
  };

  const snake = snakeRef.current;
  const food = foodRef.current;
  const score = scoreRef.current;
  const gameOver = gameOverRef.current;
  const started = startedRef.current;
  const gridPx = GRID_SIZE * CELL_SIZE;

  const bgColor = glass.backgroundElevated || (theme === 'dark' ? '#1c1c1e' : '#ffffff');
  const textColor = glass.text;
  const textSecondary = glass.textSecondary;
  const borderColor = glass.border;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: bgColor, borderColor }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: textColor }]}>🐍 Snake</Text>
            <View style={[styles.scoreBadge, { backgroundColor: colors.primary + '22' }]}>
              <Text style={[styles.scoreText, { color: colors.primary }]}>{score}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close-circle-outline" size={26} color={textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Grid */}
          <View
            style={[
              styles.grid,
              {
                width: gridPx,
                height: gridPx,
                borderColor,
                backgroundColor: glass.surfaceTertiary || 'rgba(0,0,0,0.04)',
              },
            ]}
          >
            {Array.from({ length: GRID_SIZE }).map((_, y) => (
              <View key={y} style={styles.row}>
                {Array.from({ length: GRID_SIZE }).map((_, x) => {
                  const isHead = snake[0]?.x === x && snake[0]?.y === y;
                  const isBody = !isHead && snake.slice(1).some(s => s.x === x && s.y === y);
                  const isFood = food.x === x && food.y === y;
                  return (
                    <View
                      key={x}
                      style={[
                        styles.cell,
                        isHead && { backgroundColor: colors.primary, borderRadius: 4 },
                        isBody && { backgroundColor: colors.primary + 'AA', borderRadius: 3 },
                        isFood && { backgroundColor: '#EF4444', borderRadius: 4 },
                      ]}
                    />
                  );
                })}
              </View>
            ))}

            {/* Start / Game over overlay */}
            {(!started || gameOver) && (
              <View style={styles.overlayPanel}>
                {gameOver && (
                  <>
                    <Text style={styles.gameOverText}>Игра окончена</Text>
                    <Text style={styles.finalScore}>Счёт: {score}</Text>
                  </>
                )}
                <TouchableOpacity
                  style={[styles.startButton, { backgroundColor: colors.primary }]}
                  onPress={handleAction}
                >
                  <Text style={styles.startButtonText}>
                    {gameOver ? 'Ещё раз' : 'Начать'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* D-pad */}
          <View style={styles.dpadContainer}>
            <TouchableOpacity style={[styles.dpadBtn, { borderColor }]} onPress={() => handleDir(0, -1)}>
              <Icon name="chevron-up" size={22} color={textColor} />
            </TouchableOpacity>
            <View style={styles.dpadRow}>
              <TouchableOpacity style={[styles.dpadBtn, { borderColor }]} onPress={() => handleDir(-1, 0)}>
                <Icon name="chevron-back" size={22} color={textColor} />
              </TouchableOpacity>
              <View style={styles.dpadCenter} />
              <TouchableOpacity style={[styles.dpadBtn, { borderColor }]} onPress={() => handleDir(1, 0)}>
                <Icon name="chevron-forward" size={22} color={textColor} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.dpadBtn, { borderColor }]} onPress={() => handleDir(0, 1)}>
              <Icon name="chevron-down" size={22} color={textColor} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.hint, { color: textSecondary }]}>
            Набери {CHAMPION_SCORE}+ очков для особой награды
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  card: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
  },
  scoreBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 10,
  },
  scoreText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
  },
  grid: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
  },
  overlayPanel: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderRadius: 10,
  },
  gameOverText: {
    color: '#EF4444',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 20,
    marginBottom: 4,
  },
  finalScore: {
    color: '#ffffff',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 15,
    marginBottom: 20,
  },
  startButton: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
  },
  startButtonText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
  },
  dpadContainer: {
    alignItems: 'center',
    marginTop: 16,
    gap: 4,
  },
  dpadRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dpadBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(128,128,128,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dpadCenter: {
    width: 46,
    height: 46,
  },
  hint: {
    marginTop: 12,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
  },
});

export default SnakeGame;
