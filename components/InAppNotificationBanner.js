import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons as Icon } from '@expo/vector-icons';
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
          <Text numberOfLines={3} style={[styles.body, { color: glass.textSecondary }]}>{notification.notification.body}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Закрыть уведомление"
          onPress={dismiss} style={styles.close}>
          <Icon name="close" size={20} color={glass.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 10000, elevation: 20 },
  banner: { width: '100%', maxWidth: 560, flexDirection: 'row', borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  content: { flex: 1, minWidth: 0, padding: 16, paddingRight: 4 },
  title: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, lineHeight: 20, marginBottom: 4 },
  body: { fontFamily: 'Montserrat_400Regular', fontSize: 13, lineHeight: 19 },
  close: { width: 44, minHeight: 44, alignSelf: 'flex-start', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
});
