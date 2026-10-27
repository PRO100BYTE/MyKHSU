import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LIQUID_GLASS, ACCENT_COLORS } from '../utils/constants';
import { unlockAchievement } from '../utils/achievements';
import { showAchievementToast } from './AchievementToast';

const { GRID_SIZE, createGame, queueDirection, start, tick } = require('../utils/snakeEngine.cjs');
const TICK_MS = 140;
const CHAMPION_SCORE = 30;
const DIRECTIONS = [
  { label: 'Влево', icon: 'arrow-back', x: -1, y: 0 },
  { label: 'Вверх', icon: 'arrow-up', x: 0, y: -1 },
  { label: 'Вниз', icon: 'arrow-down', x: 0, y: 1 },
  { label: 'Вправо', icon: 'arrow-forward', x: 1, y: 0 },
];

const SnakeGame = ({ visible, onClose, theme, accentColor }) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.green;
  const boardSize = Math.max(1, Math.min(width - 64, 360, Math.max(144, height - insets.top - insets.bottom - 340)));
  const cellSize = boardSize / GRID_SIZE;
  const [game, setGame] = useState(() => createGame());
  const gameRef = useRef(game);
  const timerRef = useRef(null);
  const visibleRef = useRef(visible);
  const appStateRef = useRef(AppState.currentState);
  const swipeStartRef = useRef(null);
  const championAwardedRef = useRef(false);
  visibleRef.current = visible;

  const publish = useCallback(next => {
    gameRef.current = next;
    setGame(next);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const pause = useCallback(() => {
    stopTimer();
    if (gameRef.current.running) {
      publish({ ...gameRef.current, running: false, paused: true, queuedDirection: null });
    }
  }, [publish, stopTimer]);

  const runTick = useCallback(() => {
    if (!visibleRef.current || appStateRef.current !== 'active') return;
    const previous = gameRef.current;
    const next = tick(previous);
    publish(next);
    if (!next.running) stopTimer();
    if (previous.score < CHAMPION_SCORE && next.score >= CHAMPION_SCORE && !championAwardedRef.current) {
      championAwardedRef.current = true;
      unlockAchievement('snake_champion')
        .then(result => { if (result) showAchievementToast(result); })
        .catch(error => console.warn('Snake achievement could not be saved:', error));
    }
  }, [publish, stopTimer]);

  const begin = useCallback(() => {
    if (!visibleRef.current || appStateRef.current !== 'active') return;
    stopTimer();
    publish(start(gameRef.current));
    timerRef.current = setInterval(runTick, TICK_MS);
  }, [publish, runTick, stopTimer]);

  const restart = useCallback(() => {
    championAwardedRef.current = false;
    publish(createGame());
    begin();
  }, [begin, publish]);

  const changeDirection = useCallback(direction => {
    if (gameRef.current.running) publish(queueDirection(gameRef.current, direction));
  }, [publish]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      appStateRef.current = state;
      if (state !== 'active') pause();
    });
    const blurSubscription = AppState.addEventListener('blur', pause);
    return () => {
      subscription.remove();
      blurSubscription.remove();
      stopTimer();
    };
  }, [pause, stopTimer]);

  useEffect(() => {
    stopTimer();
    publish(createGame());
    championAwardedRef.current = false;
    swipeStartRef.current = null;
    return stopTimer;
  }, [visible, publish, stopTimer]);

  const close = () => {
    pause();
    onClose?.();
  };
  const onTouchStart = event => {
    const touch = event.nativeEvent.touches?.[0];
    swipeStartRef.current = touch ? { x: touch.pageX, y: touch.pageY } : null;
  };
  const onTouchEnd = event => {
    const origin = swipeStartRef.current;
    swipeStartRef.current = null;
    const touch = event.nativeEvent.changedTouches?.[0];
    if (!origin || !touch) return;
    const dx = touch.pageX - origin.x;
    const dy = touch.pageY - origin.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
    changeDirection(Math.abs(dx) > Math.abs(dy)
      ? { x: Math.sign(dx), y: 0 }
      : { x: 0, y: Math.sign(dy) });
  };
  const renderDirectionButton = direction => (
    <TouchableOpacity
      key={direction.label}
      accessibilityRole="button"
      accessibilityLabel={direction.label}
      accessibilityState={{ disabled: !game.running }}
      disabled={!game.running}
      style={[styles.directionButton, { backgroundColor: glass.surfaceTertiary, borderColor: glass.border, opacity: game.running ? 1 : 0.5 }]}
      onPressIn={() => changeDirection(direction)}
    >
      <Icon name={direction.icon} size={23} color={glass.text} />
    </TouchableOpacity>
  );
  const title = game.gameOver ? (game.won ? 'Поле заполнено!' : 'Игра окончена') : game.paused ? 'Пауза' : 'Готовы к игре?';
  const action = game.gameOver ? 'Ещё раз' : game.paused ? 'Продолжить' : 'Начать';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={close}>
      <ScrollView
        style={styles.overlay}
        contentContainerStyle={[styles.modalContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}
        bounces={false}
      >
        <View style={[styles.card, { backgroundColor: glass.backgroundElevated || glass.background, borderColor: glass.border }]}>
          <View style={styles.header}>
            <View style={styles.heading}>
              <Text style={[styles.eyebrow, { color: colors.primary }]}>ПЕРЕРЫВ НА ИГРУ</Text>
              <Text style={[styles.title, { color: glass.text }]}>Змейка</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Закрыть игру" style={styles.iconButton} onPress={close}>
              <Icon name="close" size={24} color={glass.text} />
            </TouchableOpacity>
          </View>
          <View style={[styles.score, { backgroundColor: glass.surfaceTertiary }]}>
            <Text style={[styles.bodyText, { color: glass.textSecondary }]}>Счёт</Text>
            <Text style={[styles.scoreText, { color: colors.primary }]}>{game.score}</Text>
            <Text style={[styles.bodyText, { color: glass.textSecondary }]}>+10 за еду</Text>
          </View>
          <View
            accessibilityLabel="Игровое поле. Управляйте свайпами или кнопками ниже."
            style={[styles.board, { width: boardSize, height: boardSize, backgroundColor: glass.surfaceTertiary }]}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onTouchCancel={() => { swipeStartRef.current = null; }}
            onStartShouldSetResponder={() => game.running}
            onMoveShouldSetResponder={() => game.running}
            onStartShouldSetResponderCapture={() => game.running}
            onMoveShouldSetResponderCapture={() => game.running}
            onResponderTerminationRequest={() => false}
          >
            {game.snake.map((point, index) => (
              <View key={`${point.x}:${point.y}`} style={[
                styles.cell,
                { left: point.x * cellSize + 1, top: point.y * cellSize + 1, width: cellSize - 2, height: cellSize - 2, backgroundColor: colors.primary, opacity: index === 0 ? 1 : 0.65 },
              ]} />
            ))}
            {game.food && <View style={[
              styles.food,
              { left: game.food.x * cellSize + 2, top: game.food.y * cellSize + 2, width: cellSize - 4, height: cellSize - 4 },
            ]} />}
            {!game.running && (
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>{title}</Text>
                <TouchableOpacity accessibilityRole="button" style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={game.gameOver ? restart : begin}>
                  <Text style={styles.primaryText}>{action}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          <View style={styles.controls} accessibilityLabel="Управление направлением">
            <View style={styles.controlRow}>
              {renderDirectionButton(DIRECTIONS[1])}
            </View>
            <View style={styles.controlRow}>
              {renderDirectionButton(DIRECTIONS[0])}
              {renderDirectionButton(DIRECTIONS[2])}
              {renderDirectionButton(DIRECTIONS[3])}
            </View>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity accessibilityRole="button" disabled={!game.running} style={styles.secondaryButton} onPress={pause}>
              <Text style={[styles.bodyText, { color: game.running ? colors.primary : glass.textSecondary }]}>Пауза</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={styles.secondaryButton} onPress={restart}>
              <Text style={[styles.bodyText, { color: colors.primary }]}>Заново</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.hint, { color: glass.textSecondary }]}>Свайп по полю или стрелки. Стены нельзя пересекать. {CHAMPION_SCORE} очков — достижение.</Text>
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  modalContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  card: { maxWidth: 400, width: '100%', borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, padding: 16, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 12 },
  heading: { flex: 1 },
  eyebrow: { fontFamily: 'Montserrat_700Bold', fontSize: 10, letterSpacing: 1 },
  title: { fontFamily: 'Montserrat_700Bold', fontSize: 24, marginTop: 4 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  score: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, marginBottom: 12 },
  scoreText: { fontFamily: 'Montserrat_700Bold', fontSize: 22 },
  bodyText: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13 },
  board: { borderRadius: 12, overflow: 'hidden' },
  cell: { position: 'absolute', borderRadius: 3 },
  food: { position: 'absolute', borderRadius: 20, backgroundColor: '#EF4444' },
  panel: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: 8 },
  panelTitle: { color: '#fff', fontFamily: 'Montserrat_700Bold', fontSize: 17, marginBottom: 12, textAlign: 'center' },
  primaryButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 20, borderRadius: 12 },
  primaryText: { color: '#fff', fontFamily: 'Montserrat_700Bold', fontSize: 15 },
  controls: { alignItems: 'center', gap: 4, marginTop: 14 },
  controlRow: { flexDirection: 'row', gap: 4 },
  directionButton: { width: 52, height: 52, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center', alignItems: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 4 },
  secondaryButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  hint: { fontFamily: 'Montserrat_400Regular', fontSize: 11, textAlign: 'center', lineHeight: 16 },
});

export default SnakeGame;
