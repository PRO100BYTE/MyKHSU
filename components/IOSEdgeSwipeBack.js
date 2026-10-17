import React, { useMemo } from 'react';
import { PanResponder, Platform, View } from 'react-native';

const EDGE_WIDTH = 28;
const DISTANCE_THRESHOLD = 72;

export default function IOSEdgeSwipeBack({ enabled, onBack, children }) {
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: event => Platform.OS === 'ios' && enabled && event.nativeEvent.pageX <= EDGE_WIDTH,
    onMoveShouldSetPanResponder: (event, gesture) => Platform.OS === 'ios' && enabled && event.nativeEvent.pageX <= EDGE_WIDTH && gesture.dx > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx >= DISTANCE_THRESHOLD || (gesture.dx >= 36 && gesture.vx > 0.45)) onBack?.();
    },
  }), [enabled, onBack]);

  return <View style={{ flex: 1 }} {...(Platform.OS === 'ios' && enabled ? responder.panHandlers : {})}>{children}</View>;
}
