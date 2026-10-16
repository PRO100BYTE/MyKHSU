import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import notificationService from '../utils/notificationService';
import { LIQUID_GLASS } from '../utils/constants';

export default function InAppNotificationBanner({ theme = 'light', onNavigate }) {
  const [queue, setQueue] = useState([]);
  const notification = queue[0] || null;
  const insets = useSafeAreaInsets();
  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;

  useEffect(() => notificationService.subscribeForeground(event => {
    setQueue(current => current.some(item => item.notification.id === event.notification.id)
      ? current : [...current, event].slice(0, 5));
  }), []);

  const dismiss = () => setQueue(current => current.slice(1));
  useEffect(() => {
    if (!notification) return undefined;
    const timer = setTimeout(() => setQueue(current => current.slice(1)), 7000);
    return () => clearTimeout(timer);
  }, [notification]);

  if (!notification) return null;
  return (
    <View pointerEvents="box-none" style={[styles.container, { top: insets.top + 8 }]}>
      <View style={[styles.banner, { backgroundColor: glass.backgroundElevated, borderColor: glass.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Открыть уведомление"
          style={styles.content} onPress={() => {
            const route = notification.route;
            dismiss();
            if (route && onNavigate) onNavigate(route);
          }}>
          <Text accessibilityLiveRegion="polite" style={[styles.title, { color: glass.text }]}>
            {notification.notification.title}
          </Text>
          <Text numberOfLines={3} style={{ color: glass.textSecondary }}>{notification.notification.body}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Закрыть уведомление"
          hitSlop={8} onPress={dismiss} style={styles.close}>
          <Text style={{ color: glass.text, fontSize: 22 }}>×</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: 12, right: 12, zIndex: 10000, elevation: 20 },
  banner: { flexDirection: 'row', borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  content: { flex: 1, padding: 16 },
  title: { fontWeight: '600', marginBottom: 4 },
  close: { paddingHorizontal: 16, justifyContent: 'center' },
});
