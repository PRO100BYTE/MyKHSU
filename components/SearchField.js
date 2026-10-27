import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Keyboard } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS, LIQUID_GLASS } from '../utils/constants';

export default function SearchField({ value = '', onChangeText, onCancel, placeholder = 'Поиск', theme = 'light', accentColor = 'green' }) {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.green;
  const cancel = () => {
    onChangeText?.('');
    inputRef.current?.blur();
    Keyboard.dismiss();
    onCancel?.();
  };

  return (
    <View style={styles.row}>
      <View style={[styles.field, { backgroundColor: glass.surfaceSecondary, borderColor: focused ? colors.primary : glass.border }]}>
        <Icon name="search-outline" size={18} color={glass.textSecondary} accessible={false} />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          accessibilityLabel={placeholder}
          placeholderTextColor={glass.textSecondary}
          selectionColor={colors.primary}
          style={[styles.input, { color: glass.text }]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="never"
          onSubmitEditing={() => { inputRef.current?.blur(); Keyboard.dismiss(); }}
        />
        {value.length > 0 && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Очистить поиск"
            style={styles.clear}
            onPress={() => onChangeText?.('')}
          >
            <Icon name="close-circle" size={20} color={glass.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      {(focused || value.length > 0) && (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Отменить поиск" onPress={cancel} style={styles.cancel}>
          <Text style={{ color: colors.primary, fontFamily: 'Montserrat_400Regular' }}>Отмена</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  field: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingLeft: 12 },
  input: { flex: 1, minWidth: 0, paddingVertical: 12, paddingHorizontal: 8, fontSize: 15, fontFamily: 'Montserrat_400Regular' },
  clear: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  cancel: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
});
