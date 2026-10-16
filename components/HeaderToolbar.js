import React from 'react';
import { ActionSheetIOS, Alert, Platform, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';

export default function HeaderToolbar({ title, icon, onBack, actions = [], accent, textColor, glass, supportsGlass, colorScheme, top }) {
  const available = actions.filter(action => action && !action.hidden);
  const runAction = async (action) => {
    if (!action || action.disabled) return;
    try {
      await action.onPress();
    } catch (error) {
      console.warn('Header action failed:', error);
      Alert.alert('Не удалось выполнить действие', 'Попробуйте ещё раз.');
    }
  };
  const openActions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({
        title,
        options: [...available.map(action => action.label), 'Отмена'],
        cancelButtonIndex: available.length,
        disabledButtonIndices: available.flatMap((action, index) => action.disabled ? [index] : []),
      }, index => {
        void runAction(available[index]);
      });
    } else {
      Alert.alert(title, undefined, [...available.filter(action => !action.disabled).map(action => ({ text: action.label, onPress: () => { void runAction(action); } })), { text: 'Отмена', style: 'cancel' }]);
    }
  };
  const Surface = supportsGlass ? GlassView : BlurView;
  return (
    <View pointerEvents="box-none" style={[styles.overlay, { top }]}>
      <Surface
        {...(supportsGlass ? { colorScheme, glassEffectStyle: 'regular' } : { tint: colorScheme === 'dark' ? 'dark' : 'light', intensity: 70 })}
        style={[styles.surface, { borderColor: glass.borderStrong }]}
      >
        <View style={styles.row}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} accessibilityRole="button" accessibilityLabel="Назад" style={styles.button}>
              <Icon name="chevron-back" size={24} color={accent} />
            </TouchableOpacity>
          ) : <Icon name={icon} size={22} color={accent} style={styles.icon} />}
          <Text accessibilityRole="header" numberOfLines={1} style={[styles.title, { color: textColor }]}>{title}</Text>
          {available.length > 0 && (
            <TouchableOpacity onPress={openActions} accessibilityRole="button" accessibilityLabel={`Действия: ${title}`} accessibilityHint="Открывает меню доступных действий раздела" style={styles.button}>
              <Icon name="ellipsis-horizontal" size={23} color={accent} />
            </TouchableOpacity>
          )}
        </View>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', left: 8, right: 8, zIndex: 10 },
  surface: { borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, minHeight: 52 },
  button: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  icon: { marginHorizontal: 10 },
  title: { flex: 1, fontSize: 18, fontFamily: 'Montserrat_700Bold', paddingVertical: 12 },
});
