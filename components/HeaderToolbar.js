import React from 'react';
import { Alert, ActionSheetIOS, Platform, UIManager, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { MenuView } from '@react-native-menu/menu';
import { Ionicons as Icon } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';

export default function HeaderToolbar({ title, icon, onBack, actions = [], status, accent, textColor, glass, supportsGlass, colorScheme, top }) {
  const available = actions.filter(action => action && !action.hidden);
  const primary = available.find(action => action.primary);
  const direct = available.filter(action => action !== primary && action.direct);
  const secondary = available.filter(action => action !== primary && !action.direct);
  const runAction = async (action) => {
    if (!action || action.disabled) return;
    try {
      await action.onPress();
    } catch (error) {
      console.warn('Header action failed:', error);
      Alert.alert('Не удалось выполнить действие', 'Попробуйте ещё раз.');
    }
  };
  const nativeMenuAvailable = Platform.OS === 'ios' && !!UIManager.hasViewManagerConfig('MenuView');
  const openFallbackMenu = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({
        title,
        options: [...secondary.map(action => action.label), 'Отмена'],
        cancelButtonIndex: secondary.length,
        disabledButtonIndices: secondary.flatMap((action, index) => action.disabled ? [index] : []),
      }, index => { void runAction(secondary[index]); });
    } else {
      Alert.alert(title, undefined, [...secondary.filter(action => !action.disabled).map(action => ({
        text: action.label, onPress: () => { void runAction(action); },
      })), { text: 'Отмена', style: 'cancel' }]);
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
          {status && (
            <TouchableOpacity onPress={status.onPress} accessibilityRole="button" accessibilityLabel={status.label} style={styles.button}>
              <Icon name={status.icon} size={22} color={accent} />
            </TouchableOpacity>
          )}
          {primary?.render ? primary.render() : primary && (
            <TouchableOpacity onPress={() => { void runAction(primary); }} disabled={primary.disabled}
              accessibilityRole="button" accessibilityLabel={primary.label} accessibilityState={{ disabled: !!primary.disabled }}
              style={[styles.button, primary.disabled && { opacity: 0.4 }]}>
              <Icon name={primary.icon || 'options-outline'} size={22} color={accent} />
              {!!primary.badge && <View style={[styles.badge, { backgroundColor: accent }]}><Text style={styles.badgeText}>{primary.badge}</Text></View>}
            </TouchableOpacity>
          )}
          {direct.map((action, index) => (
            <TouchableOpacity key={action.label || index} onPress={() => { void runAction(action); }} disabled={action.disabled}
              accessibilityRole="button" accessibilityLabel={action.label} accessibilityState={{ disabled: !!action.disabled }}
              style={[styles.button, action.disabled && { opacity: 0.4 }]}>
              <Icon name={action.icon || 'share-outline'} size={22} color={accent} />
            </TouchableOpacity>
          ))}
          {secondary.length > 0 && (nativeMenuAvailable ? (
            <MenuView title={title} shouldOpenOnLongPress={false}
              actions={secondary.map((action, index) => ({ id: String(index), title: action.label, image: action.symbol, attributes: { disabled: !!action.disabled } }))}
              onPressAction={({ nativeEvent }) => { void runAction(secondary[Number(nativeEvent.event)]); }}
              accessibilityRole="button" accessibilityLabel={`Другие действия: ${title}`}>
              <View style={styles.button}><Icon name="ellipsis" size={23} color={accent} /></View>
            </MenuView>
          ) : (
            <TouchableOpacity onPress={openFallbackMenu} accessibilityRole="button" accessibilityLabel={`Другие действия: ${title}`} style={styles.button}>
              <Icon name="ellipsis-horizontal" size={23} color={accent} />
            </TouchableOpacity>
          ))}
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
  badge: { position: 'absolute', right: 0, top: 2, borderRadius: 8, minWidth: 16, paddingHorizontal: 3, alignItems: 'center' },
  badgeText: { color: '#fff', fontFamily: 'Montserrat_600SemiBold', fontSize: 10 },
});
