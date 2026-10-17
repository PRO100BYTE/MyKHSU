import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

/**
 * A shared modal sheet. Bounded sheets retain their backdrop in place while the
 * panel moves, avoiding a backdrop that appears to move with the surface.
 */
const NativeSheet = ({
  visible,
  onRequestClose,
  children,
  contentStyle,
  accessibilityLabel,
  presentationStyle = 'pageSheet',
  bounded = false,
  minHeight = 0.5,
  maxHeight = 0.8,
  expandable = true,
}) => {
  const { height: windowHeight } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const closeHandled = useRef(false);
  const panelTranslate = useRef(new Animated.Value(windowHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const dragStart = useRef(0);
  const expanded = useRef(false);

  const sheetHeight = Math.max(windowHeight, 1);
  const minimumHeight = Math.min(
    sheetHeight,
    Math.max(0, minHeight <= 1 ? sheetHeight * minHeight : minHeight),
  );
  const maximumHeight = Math.min(
    sheetHeight,
    Math.max(minimumHeight, maxHeight <= 1 ? sheetHeight * maxHeight : maxHeight),
  );
  const collapsedOffset = expandable ? maximumHeight - minimumHeight : 0;
  const expandedOffset = 0;

  const animateTo = (toValue, callback) => {
    Animated.spring(panelTranslate, {
      toValue,
      useNativeDriver: true,
      tension: 90,
      friction: 14,
    }).start(callback);
  };

  useEffect(() => {
    if (visible) {
      closeHandled.current = false;
      expanded.current = false;
      setMounted(true);
      panelTranslate.setValue(sheetHeight);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(panelTranslate, {
          toValue: collapsedOffset,
          useNativeDriver: true,
          tension: 90,
          friction: 14,
        }),
      ]).start();
      return;
    }

    if (!mounted) return;
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(panelTranslate, { toValue: sheetHeight, duration: 220, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, mounted, sheetHeight, collapsedOffset, backdropOpacity, panelTranslate]);

  const requestClose = () => {
    if (closeHandled.current) return;
    closeHandled.current = true;
    onRequestClose?.();
  };

  const settleDrag = () => {
    panelTranslate.stopAnimation(currentOffset => {
      const closeThreshold = Math.min(120, minimumHeight * 0.25);
      if (currentOffset > collapsedOffset + closeThreshold) {
        requestClose();
        return;
      }
      const shouldExpand = expandable && currentOffset < (collapsedOffset + expandedOffset) / 2;
      expanded.current = shouldExpand;
      animateTo(shouldExpand ? expandedOffset : collapsedOffset);
    });
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 2,
    onPanResponderGrant: () => {
      panelTranslate.stopAnimation(value => {
        dragStart.current = value;
      });
    },
    onPanResponderMove: (_, gesture) => {
      const nextOffset = Math.max(0, Math.min(sheetHeight, dragStart.current + gesture.dy));
      panelTranslate.setValue(nextOffset);
    },
    onPanResponderRelease: settleDrag,
    onPanResponderTerminate: settleDrag,
  }), [collapsedOffset, expandable, expandedOffset, minimumHeight, sheetHeight]);

  if (!bounded) {
    return (
      <Modal
        visible={visible}
        onRequestClose={requestClose}
        presentationStyle={Platform.OS === 'ios' ? presentationStyle : undefined}
        animationType="slide"
        allowSwipeDismissal={Platform.OS === 'ios'}
        transparent={Platform.OS !== 'ios'}
        accessibilityViewIsModal
        accessibilityLabel={accessibilityLabel}
      >
        <View style={[styles.container, Platform.OS === 'android' && styles.androidContainer]}>
          <View style={[styles.content, Platform.OS === 'android' && styles.androidContent, contentStyle]}>
            {children}
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={requestClose}
      accessibilityViewIsModal
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.boundedContainer}>
        <Animated.View pointerEvents="none" style={[styles.backdrop, { opacity: backdropOpacity }]} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Закрыть"
          style={styles.backdropPressable}
          onPress={requestClose}
        />
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.boundedContent,
            { height: maximumHeight, transform: [{ translateY: panelTranslate }] },
            contentStyle,
          ]}
        >
          <View accessibilityRole="adjustable" accessibilityLabel="Потяните, чтобы изменить размер листа" style={styles.dragHandleArea}>
            <View style={styles.dragHandle} />
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  androidContainer: { backgroundColor: 'rgba(0, 0, 0, 0.45)' },
  content: { flex: 1 },
  androidContent: { maxHeight: '90%', width: '100%' },
  boundedContainer: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.45)' },
  backdropPressable: { ...StyleSheet.absoluteFillObject },
  boundedContent: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    zIndex: 2,
    elevation: 2,
  },
  dragHandleArea: { alignItems: 'center', paddingTop: 10, paddingBottom: 8 },
  dragHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(127, 127, 127, 0.55)' },
});

export default NativeSheet;
