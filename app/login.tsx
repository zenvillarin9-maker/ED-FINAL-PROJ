import { useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { CAMPUS } from '@/constants/colors';
import * as tokens from '@/constants/tokens';
import { signIn } from '@/lib/auth';
import { LIMITS, validateEmail } from '@/lib/validation';

type Field = 'email' | 'password';

/* Faint grid + two colour glows behind everything */
function TechBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
      <Defs>
        <Pattern
          id="campusGrid"
          width="32"
          height="32"
          patternUnits="userSpaceOnUse"
        >
          <Path
            d="M32 0H0V32"
            fill="none"
            stroke="rgba(255,255,255,0.045)"
            strokeWidth="1"
          />
        </Pattern>
        <RadialGradient id="campusGlowA" cx="88%" cy="6%" r="60%">
          <Stop offset="0" stopColor={CAMPUS.primary} stopOpacity="0.5" />
          <Stop offset="1" stopColor={CAMPUS.primary} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="campusGlowB" cx="0%" cy="100%" r="65%">
          <Stop offset="0" stopColor={CAMPUS.accent} stopOpacity="0.3" />
          <Stop offset="1" stopColor={CAMPUS.accent} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#campusGlowA)" />
      <Rect width="100%" height="100%" fill="url(#campusGlowB)" />
      <Rect width="100%" height="100%" fill="url(#campusGrid)" />
      </Svg>
    </View>
  );
}

/* Blue -> cyan fill used inside the Sign In button */
function ButtonGradient() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="campusBtn" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={CAMPUS.primary} />
          <Stop offset="1" stopColor={CAMPUS.accent} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#campusBtn)" />
      </Svg>
    </View>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Look-and-feel only state
  const [focused, setFocused] = useState<Field | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    setError(null);

    // Input validation (before anything is sent to the server)
    const emailCheck = validateEmail(email);
    if (!emailCheck.ok) {
      setError(emailCheck.message);
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await signIn(emailCheck.value, password);

      if (authError) {
        setError(authError.message);
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setError(err?.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <TechBackground />

      <KeyboardAvoidingView
        style={styles.keyboardView}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
keyboardVerticalOffset={0}
      >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: insets.top + 44 },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {/* Brand */}
            <View style={styles.brand}>
              <View style={styles.scanBox}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
                <Ionicons name="qr-code-outline" size={38} color={CAMPUS.accent} />
              </View>

              <View style={styles.statusPill}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>One Campus ID</Text>
              </View>

              <Text style={styles.appName}>QR Attendance</Text>
              <Text style={styles.tagline}>
                Scan in. Show up. Stay on record.
              </Text>
            </View>

            {/* Glass card */}
            <View style={styles.card}>
              <Text style={styles.title}>Sign in</Text>
              <Text style={styles.subtitle}>
                Sign in to record your attendance
              </Text>

              <Text style={styles.label}>EMAIL</Text>
              <Pressable
                onPress={() => emailRef.current?.focus()}
                style={[
                  styles.inputWrap,
                  focused === 'email' && styles.inputWrapFocused,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={19}
                  color={focused === 'email' ? CAMPUS.accent : CAMPUS.textMuted}
                />
                <TextInput
                  ref={emailRef}
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your.email@school.edu"
                  placeholderTextColor={CAMPUS.textFaint}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  maxLength={LIMITS.email}
                  editable={!loading}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                />
              </Pressable>

              <Text style={styles.label}>PASSWORD</Text>
              <Pressable
                onPress={() => passwordRef.current?.focus()}
                style={[
                  styles.inputWrap,
                  focused === 'password' && styles.inputWrapFocused,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={19}
                  color={
                    focused === 'password' ? CAMPUS.accent : CAMPUS.textMuted
                  }
                />
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={CAMPUS.textFaint}
                  secureTextEntry={!showPassword}
                  maxLength={LIMITS.password}
                  editable={!loading}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={16}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? 'Hide password' : 'Show password'
                  }
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={19}
                    color={CAMPUS.textMuted}
                  />
                </Pressable>
              </Pressable>

              {error && (
                <View style={styles.errorBox}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={18}
                    color={CAMPUS.danger}
                  />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.buttonPressed,
                  loading && styles.buttonLoading,
                ]}
                onPress={handleLogin}
                disabled={loading}
                accessibilityRole="button"
              >
                <ButtonGradient />
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                  </>
                )}
              </Pressable>
            </View>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don't have an account?</Text>
              <Link href="/register" asChild>
                <Pressable
                  hitSlop={14}
                  style={styles.linkButton}
                  accessibilityRole="link"
                >
                  <Text style={styles.link}>Sign Up</Text>
                </Pressable>
              </Link>
            </View>

            <View style={styles.secureRow}>
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color={CAMPUS.textFaint}
              />
              <Text style={styles.secureText}>SECURE SIGN-IN</Text>
            </View>
          </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CAMPUS.bg,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: tokens.spacing[5],
    paddingBottom: tokens.spacing[10],
  },

  /* Brand */
  brand: {
    alignItems: 'center',
    marginBottom: tokens.spacing[7],
  },
  scanBox: {
    width: 92,
    height: 92,
    borderRadius: tokens.radius.lg,
    backgroundColor: 'rgba(79,124,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing[5],
    shadowColor: CAMPUS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 8,
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: CAMPUS.accent,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: tokens.radius.sm,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: tokens.radius.sm,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: tokens.radius.sm,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: tokens.radius.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[1],
    paddingHorizontal: tokens.spacing[3],
    paddingVertical: tokens.spacing[1] + 2,
    borderRadius: tokens.radius.pill,
    backgroundColor: CAMPUS.surface,
    borderWidth: tokens.borderWidth.thin,
    borderColor: CAMPUS.border,
    marginBottom: tokens.spacing[3] + 2,
  },
  statusDot: {
    width: tokens.spacing[2] - 1,
    height: tokens.spacing[2] - 1,
    borderRadius: tokens.radius.sm,
    backgroundColor: CAMPUS.mint,
  },
  statusText: {
    fontFamily: tokens.typography.fontFamily.techMono,
    fontSize: tokens.typography.overline[0],
    letterSpacing: 1.6,
    color: CAMPUS.textMuted,
    fontWeight: (tokens.typography.overline[2] as any),
  },
  appName: {
    fontSize: tokens.typography.display2[0],
    fontWeight: (tokens.typography.display2[2] as any),
    color: CAMPUS.text,
    letterSpacing: 0.2,
  },
  tagline: {
    fontSize: tokens.typography.body[0],
    color: CAMPUS.textMuted,
    marginTop: tokens.spacing[1] + 2,
    textAlign: 'center',
  },

  /* Glass card */
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: CAMPUS.surface,
    borderRadius: tokens.radius.xl,
    borderWidth: tokens.borderWidth.thin,
    borderColor: CAMPUS.border,
    padding: tokens.spacing[6],
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
    // frosted-glass blur where supported (web)
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(16px)' } as object)
      : null),
  },
  title: {
    fontSize: tokens.typography.headline[0],
    fontWeight: (tokens.typography.headline[2] as any),
    color: CAMPUS.text,
  },
  subtitle: {
    fontSize: tokens.typography.caption[0],
    color: CAMPUS.textMuted,
    lineHeight: tokens.typography.caption[1],
    marginTop: tokens.spacing[1],
    marginBottom: tokens.spacing[2] + 2,
  },
  label: {
    fontFamily: tokens.typography.fontFamily.techMono,
    fontSize: tokens.typography.overline[0],
    fontWeight: (tokens.typography.overline[2] as any),
    letterSpacing: 1.4,
    color: CAMPUS.textMuted,
    marginBottom: tokens.spacing[1],
    marginTop: tokens.spacing[4],
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[2] + 2,
    backgroundColor: CAMPUS.inputBg,
    borderRadius: tokens.radius.md + 2,
    borderWidth: tokens.borderWidth.normal,
    borderColor: CAMPUS.border,
    paddingHorizontal: tokens.componentTokens.inputPadding.horizontal,
  },
  inputWrapFocused: {
    borderColor: CAMPUS.accent,
    backgroundColor: 'rgba(34,211,238,0.06)',
    shadowColor: CAMPUS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  input: {
    flex: 1,
    paddingVertical: tokens.componentTokens.inputPadding.vertical,
    fontSize: tokens.typography.body[0],
    color: CAMPUS.text,
    // removes the default browser outline on web; the glow border shows focus
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing[2],
    backgroundColor: CAMPUS.dangerBg,
    borderWidth: tokens.borderWidth.thin,
    borderColor: CAMPUS.dangerBorder,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing[3],
    marginTop: tokens.spacing[4],
  },
  errorText: {
    flex: 1,
    fontSize: tokens.typography.small[0],
    lineHeight: tokens.typography.small[1],
    color: CAMPUS.danger,
  },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing[2] + 2,
    borderRadius: tokens.radius.md + 2,
    paddingVertical: tokens.componentTokens.buttonPadding.vertical + 2,
    marginTop: tokens.spacing[6],
    overflow: 'hidden',
    shadowColor: CAMPUS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 6,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  buttonLoading: {
    opacity: 0.8,
  },
  buttonText: {
    fontSize: tokens.typography.button[0],
    fontWeight: (tokens.typography.button[2] as any),
    color: '#FFFFFF',
  },

  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing[1],
    marginTop: tokens.spacing[5],
  },
  footerText: {
    fontSize: tokens.typography.body[0],
    color: CAMPUS.textMuted,
  },
  linkButton: {
    paddingVertical: tokens.spacing[2] + 2,
    paddingHorizontal: tokens.spacing[2],
  },
  link: {
    color: CAMPUS.accent,
    fontWeight: (tokens.typography.overline[2] as any),
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[1] + 2,
    marginTop: tokens.spacing[5] + 2,
  },
  secureText: {
    fontFamily: tokens.typography.fontFamily.techMono,
    fontSize: tokens.typography.overline[0] - 2,
    letterSpacing: 1.6,
    color: CAMPUS.textFaint,
  },
});
