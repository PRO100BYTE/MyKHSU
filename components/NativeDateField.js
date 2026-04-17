import React, { useMemo, useState } from 'react';
import { Keyboard, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LIQUID_GLASS, ACCENT_COLORS } from '../utils/constants';

const formatISODate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

const parseISODate = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return null;

  let year;
  let month;
  let day;

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    [year, month, day] = normalized.split('-').map(Number);
  } else if (/^\d{2}\.\d{2}\.\d{4}$/.test(normalized)) {
    [day, month, year] = normalized.split('.').map(Number);
  } else {
    return null;
  }

  const result = new Date(year, month - 1, day, 12, 0, 0, 0);
  return Number.isNaN(result.getTime()) ? null : result;
};

const NativeDateField = ({ label, value, onChange, theme, accentColor, placeholder = 'Выбрать дату', clearable = true }) => {
  const [showIOSPicker, setShowIOSPicker] = useState(false);
  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.green;
  const selectedDate = useMemo(() => parseISODate(value) || new Date(), [value]);
  const displayValue = useMemo(() => {
    const parsed = parseISODate(value);
    return parsed ? formatDisplayDate(parsed) : '';
  }, [value]);

  const openPicker = () => {
    Keyboard.dismiss();

    if (!value) {
      onChange(formatISODate(new Date()));
    }

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

    setTimeout(() => {
      setShowIOSPicker((prev) => !prev);
    }, 80);
  };

  return (
    <View>
      {label ? (
        <Text style={{ color: glass.textSecondary, fontSize: 12, fontFamily: 'Montserrat_500Medium', marginBottom: 6, marginTop: 10 }}>
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
              fontFamily: value ? 'Montserrat_500Medium' : 'Montserrat_400Regular',
            }}
          >
            {displayValue || placeholder}
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
            borderRadius: 14,
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
            onPress={() => {
              Keyboard.dismiss();
              setShowIOSPicker(false);
            }}
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
    minHeight: 46,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default NativeDateField;