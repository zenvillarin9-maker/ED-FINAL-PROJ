import { StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  Path,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { CAMPUS } from '@/constants/colors';

// Faint grid + two colour glows behind everything. Sits behind a screen's content.

// Faint grid + two colour glows behind everything. Sits behind a screen's content.
export default function CampusBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          {/* Tech grid pattern - 32px checkers with subtle contrast */}
          <Pattern
            id="bgGrid"
            width="32"
            height="32"
            patternUnits="userSpaceOnUse"
          >
            <Path
              d="M32 0H0V32"
              fill="none"
              stroke={CAMPUS.border}
              strokeWidth={0.5}
            />
            <Path
              d="M0 32H32V0"
              fill="none"
              stroke={CAMPUS.border}
              strokeWidth={0.5}
            />
          </Pattern>

          {/* Primary blue glow - top-right, softer */}
          <RadialGradient
            id="bgGlowA"
            cx="90%"
            cy="0%"
            r="55%"
          >
            <Stop offset="0" stopColor={CAMPUS.primary} stopOpacity="0.35" />
            <Stop offset="1" stopColor={CAMPUS.primary} stopOpacity="0" />
          </RadialGradient>

          {/* Accent cyan glow - bottom-left, softer */}
          <RadialGradient
            id="bgGlowB"
            cx="0%"
            cy="100%"
            r="60%"
          >
            <Stop offset="0" stopColor={CAMPUS.accent} stopOpacity="0.2" />
            <Stop offset="1" stopColor={CAMPUS.accent} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        <Rect width="100%" height="100%" fill="url(#bgGlowA)" />
        <Rect width="100%" height="100%" fill="url(#bgGlowB)" />
        <Rect width="100%" height="100%" fill="url(#bgGrid)" />
      </Svg>
    </View>
  );
}