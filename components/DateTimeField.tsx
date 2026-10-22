import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { createElement, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { CAMPUS } from '@/constants/colors';
import * as tokens from '@/constants/tokens';

type Props = {
  value: Date;
  onChange: (date: Date) => void;
};

const pad = (n: number) => String(n).padStart(2, '0');


function toLocalInput(date: Date) {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

function formatDateTime(date: Date) {
  const month = date.toLocaleString('en-US', { month: 'short' });
  return `${month} ${pad(date.getDate())}, ${date.getFullYear()} at ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default function DateTimeField({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [part, setPart] = useState<'date' | 'time'>('date');
  const isAndroid = Platform.OS === 'android';


  if (Platform.OS === 'web') {
    return createElement('input', {
      type: 'datetime-local',
      value: toLocalInput(value),
      onChange: (e: any) => {
        const next = new Date(e.target.value);
        if (!Number.isNaN(next.getTime())) onChange(next);
      },
      style: {
        width: '100%',
        boxSizing: 'border-box',
        padding: '13px 14px',
        fontSize: 15,
        borderRadius: 14,
        border: `1.5px solid ${CAMPUS.border}`,
        backgroundColor: CAMPUS.inputBg,
        color: CAMPUS.text,
        colorScheme: 'dark',
        fontFamily: 'inherit',
      },
    });
  }

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed' || !selected) {
      setOpen(false);
      setPart('date');
      return;
    }

    const next = new Date(value);
    next.setFullYear(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate()
    );
    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    onChange(next);

    if (isAndroid && part === 'date') {
      setPart('time');
    } else {
      setOpen(false);
      setPart('date');
    }
  };

  return (
    <View>
      <Pressable
        style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]}
        onPress={() => {
          setPart('date');
          setOpen(true);
        }}
      >
        <Text style={styles.value}>{formatDateTime(value)}</Text>
        <Ionicons
          name="calendar-outline"
          size={18}
          color={CAMPUS.accent}
        />
      </Pressable>

      {open && (
        <View style={styles.picker}>
          <DateTimePicker
            value={value}
            mode={isAndroid ? part : 'datetime'}
            display={isAndroid ? 'default' : 'spinner'}
            themeVariant="dark"
            onChange={onPickerChange}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    backgroundColor: CAMPUS.inputBg,
    borderRadius: tokens.radius.md,
    borderWidth: tokens.borderWidth.normal,
    borderColor: CAMPUS.border,
    paddingHorizontal: tokens.spacing[4],
    paddingVertical: tokens.spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldPressed: { backgroundColor: CAMPUS.surfaceStrong },
  value: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: CAMPUS.text,
  },
  picker: { marginTop: tokens.spacing[2], alignItems: 'center' },
});