import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { CAMPUS } from '@/constants/colors';
import * as tokens from '@/constants/tokens';

export default function ScanLogo({ size = 92 }: { size?: number }) {
  return (
    <View
      style={[
        styles.box,
        { width: size, height: size, borderRadius: size * 0.26 },
      ]}
    >
      <View style={[styles.corner, styles.tl]} />
      <View style={[styles.corner, styles.tr]} />
      <View style={[styles.corner, styles.bl]} />
      <View style={[styles.corner, styles.br]} />
      <Ionicons
        name="qr-code-outline"
        size={size * 0.42}
        color={CAMPUS.accent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: 'rgba(79,124,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: CAMPUS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 8,
  },
  corner: {
    position: 'absolute',
    width: tokens.spacing[5] + 6,
    height: tokens.spacing[5] + 6,
    borderColor: CAMPUS.accent,
  },
  tl: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: tokens.radius.md,
  },
  tr: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: tokens.radius.md,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: tokens.radius.md,
  },
  br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: tokens.radius.md,
  },
});
