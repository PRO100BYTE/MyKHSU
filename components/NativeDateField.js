import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LIQUID_GLASS, ACCENT_COLORS } from '../utils/constants';

const formatISODate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseISODate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
  const [year, month, day] = value.split('-').map(Number);
  const result = new Date(year, month - 1, day, 12, 0, 0, 0);
  return Number.isNaN(result.getTime()) ? null : result;
};

const NativeDateField = ({ label, value, onChange, theme, accentColor, placeholder = 'Выбрать дату', clearable = true }) => {
  const [showIOSPicker, setShowIOSPicker] = useState(false);
  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.green;
  const selectedDate = useMemo(() => parseISODate(value) || new Date(), [value]);

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: selectedDate,
        mode: 'date',
        is24Hour: true,
        onChange: (event, pickedDate) => {
          if (event.type === 'set' && pickedDate) {
            onChange(formatISODate(pickedDate));
          }
        },
      });
      return;
    }

    setShowIOSPicker((prev) => !prev);
  };

  return (
    <View>
      {label ? (
        <Text style={{ color: glass.textSecondary, fontSize: 12, fontFamily: 'Montserrat_500Medium', marginBottom: 6, marginTop: 8 }}>
          {label}
        </Text>
      ) : null}

      <TouchableOpacity
        onPress={openPicker}
        activeOpacity={0.8}
        style={[
          styles.field,
          {
            backgroundColor: glass.surfaceSecondary,
            borderColor: glass.border,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Icon name="calendar-outline" size={16} color={value ? colors.primary : glass.textTertiary} />
          <Text
            style={{
              marginLeft: 8,
              color: value ? glass.text : glass.textTertiary,
              fontSize: 14,
              fontFamily: 'Montserrat_400Regular',
            }}
          >
            {value || placeholder}
          </Text>
        </View>

        {clearable && value ? (
          <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="close-circle" size={18} color={glass.textTertiary} />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>

      {Platform.OS === 'ios' && showIOSPicker ? (
        <View
          style={{
            marginTop: 8,
            borderRadius: 12,
            overflow: 'hidden',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: glass.border,
            backgroundColor: glass.surfaceSecondary,
          }}
        >
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="inline"
            onChange={(_, pickedDate) => {
              if (pickedDate) {
                onChange(formatISODate(pickedDate));
              }
            }}
            accentColor={colors.primary}
          />
          <TouchableOpacity
            onPress={() => setShowIOSPicker(false)}
            style={{
              paddingVertical: 10,
              alignItems: 'center',
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: glass.border,
            }}
          >
            <Text style={{ color: colors.primary, fontSize: 13, fontFamily: 'Montserrat_600SemiBold' }}>
              Готово
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default NativeDateField;