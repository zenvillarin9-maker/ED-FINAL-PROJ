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
import { Link, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import CampusBackground from '@/components/CampusBackground';
import ScanLogo from '@/components/ScanLogo';
import { CAMPUS } from '@/constants/colors';
import * as tokens from '@/constants/tokens';
import { signUp } from '@/lib/auth';
import {
  LIMITS,
  validateEmail,
  validateFullName,
  validateNewPassword,
} from '@/lib/validation';

/* Blue -> cyan fill used inside the Sign Up button */
function ButtonGradient() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="registerBtn" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={CAMPUS.primary} />
          <Stop offset="1" stopColor={CAMPUS.accent} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#registerBtn)" />
      </Svg>
    </View>
  );
}

/* Label + icon + glowing border wrapper shared by every input */
function Field({
  label,
  icon,
  active,
  right,
  onPressBar,
  children,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  right?: React.ReactNode;
  onPressBar?: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={onPressBar}
        style={[styles.inputWrap, active && styles.inputWrapFocused]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={active ? CAMPUS.accent : CAMPUS.textMuted}
        />
        {children}
        {right}
      </Pressable>
    </>
  );
}

function RuleRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <View style={styles.ruleRow}>
      <Ionicons
        name={ok ? 'checkmark-circle' : 'ellipse-outline'}
        size={15}
        color={ok ? CAMPUS.mint : CAMPUS.textFaint}
      />
      <Text style={[styles.ruleText, ok && styles.ruleTextOk]}>{text}</Text>
    </View>
  );
}

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Look-and-feel only state
  const [focused, setFocused] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const handleRegister = async () => {
    setError(null);

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    const nameCheck = validateFullName(fullName);
    if (!nameCheck.ok) {
      setError(nameCheck.message);
      return;
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.ok) {
      setError(emailCheck.message);
      return;
    }

    const passwordCheck = validateNewPassword(password);
    if (!passwordCheck.ok) {
      setError(passwordCheck.message);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await signUp(
        emailCheck.value,
        password,
        {
          full_name: nameCheck.value,
        }
      );

      if (authError) {
        setError(authError.message);
      } else if (data.session) {
        router.replace('/(tabs)');
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Look-only: live checklist for the password rules
  const hasLength = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const matches = confirmPassword.length > 0 && password === confirmPassword;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <CampusBackground />

      <KeyboardAvoidingView
        style={styles.keyboardView}
       behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
keyboardVerticalOffset={0}
      >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: insets.top + 28 },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {/* Brand */}
            <View style={styles.brand}>
              <ScanLogo size={72} />
              <Text style={styles.appName}>QR Attendance</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>
                Register to start recording attendance
              </Text>

              {success ? (
                <View style={styles.successContainer}>
                  <View style={styles.successTile}>
                    <Ionicons
                      name="mail-open-outline"
                      size={30}
                      color={CAMPUS.mint}
                    />
                  </View>
                  <Text style={styles.successTitle}>Check your email!</Text>
                  <Text style={styles.successText}>
                    We sent a confirmation link to {email}. Click the link to
                    verify your account, then come back and sign in.
                  </Text>
                  <Link href="/login" asChild>
                    <Pressable
                      hitSlop={14}
                      style={styles.linkButton}
                      accessibilityRole="link"
                    >
                      <Text style={styles.link}>Back to Sign In</Text>
                    </Pressable>
                  </Link>
                </View>
              ) : (
                <View style={styles.form}>
                  <Field
                    label="FULL NAME"
                    icon="person-outline"
                    active={focused === 'name'}
                    onPressBar={() => nameRef.current?.focus()}
                  >
                    <TextInput
                      ref={nameRef}
                      style={styles.input}
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="Enter your full name"
                      maxLength={LIMITS.name}
                      placeholderTextColor={CAMPUS.textFaint}
                      autoCapitalize="words"
                      editable={!loading}
                      onFocus={() => setFocused('name')}
                      onBlur={() => setFocused(null)}
                    />
                  </Field>

                  <View style={styles.roleNoteBox}>
                    <Ionicons
                      name="information-circle-outline"
                      size={18}
                      color={CAMPUS.accent}
                    />
                    <Text style={styles.roleNote}>
                      New accounts start as students. Teacher access is granted
                      by an administrator after you sign up.
                    </Text>
                  </View>

                  <Field
                    label="EMAIL"
                    icon="mail-outline"
                    active={focused === 'email'}
                    onPressBar={() => emailRef.current?.focus()}
                  >
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
                  </Field>

                  <Field
                    label="PASSWORD"
                    icon="lock-closed-outline"
                    active={focused === 'password'}
                    onPressBar={() => passwordRef.current?.focus()}
                    right={
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
                    }
                  >
                    <TextInput
                      ref={passwordRef}
                      style={styles.input}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="At least 8 characters, with a letter and a number"
                      placeholderTextColor={CAMPUS.textFaint}
                      secureTextEntry={!showPassword}
                      maxLength={LIMITS.password}
                      editable={!loading}
                      onFocus={() => setFocused('password')}
                      onBlur={() => setFocused(null)}
                    />
                  </Field>

                  <View style={styles.rules}>
                    <RuleRow ok={hasLength} text="At least 8 characters" />
                    <RuleRow ok={hasLetter} text="Includes a letter" />
                    <RuleRow ok={hasNumber} text="Includes a number" />
                  </View>

                  <Field
                    label="CONFIRM PASSWORD"
                    icon="shield-checkmark-outline"
                    active={focused === 'confirm'}
                    onPressBar={() => confirmRef.current?.focus()}
                    right={
                      <Pressable
                        onPress={() => setShowConfirm((v) => !v)}
                        hitSlop={16}
                        accessibilityRole="button"
                        accessibilityLabel={
                          showConfirm ? 'Hide password' : 'Show password'
                        }
                      >
                        <Ionicons
                          name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                          size={19}
                          color={CAMPUS.textMuted}
                        />
                      </Pressable>
                    }
                  >
                    <TextInput
                      ref={confirmRef}
                      style={styles.input}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Re-enter your password"
                      placeholderTextColor={CAMPUS.textFaint}
                      secureTextEntry={!showConfirm}
                      maxLength={LIMITS.password}
                      editable={!loading}
                      onFocus={() => setFocused('confirm')}
                      onBlur={() => setFocused(null)}
                    />
                  </Field>

                  {confirmPassword.length > 0 && (
                    <View style={styles.rules}>
                      <RuleRow ok={matches} text="Passwords match" />
                    </View>
                  )}

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
                    onPress={handleRegister}
                    disabled={loading}
                    accessibilityRole="button"
                  >
                    <ButtonGradient />
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons
                          name="person-add-outline"
                          size={20}
                          color="#FFFFFF"
                        />
                        <Text style={styles.buttonText}>Sign Up</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              )}
            </View>

            {!success && (
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Already have an account?</Text>
                <Link href="/login" asChild>
                  <Pressable
                    hitSlop={14}
                    style={styles.linkButton}
                    accessibilityRole="link"
                  >
                    <Text style={styles.link}>Sign In</Text>
                  </Pressable>
                </Link>
              </View>
            )}
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

  brand: {
    alignItems: 'center',
    marginBottom: tokens.spacing[5] + 2,
  },
  appName: {
    fontSize: tokens.typography.display2[0],
    fontWeight: (tokens.typography.display2[2] as any),
    color: CAMPUS.text,
    marginTop: tokens.spacing[3] + 2,
    letterSpacing: 0.2,
  },

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
    marginBottom: tokens.spacing[1] + 2,
  },
  form: {
    marginTop: tokens.spacing[1],
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
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },

  roleNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing[2] + 2,
    backgroundColor: 'rgba(34,211,238,0.07)',
    borderWidth: tokens.borderWidth.thin,
    borderColor: 'rgba(34,211,238,0.25)',
    borderRadius: tokens.radius.md + 2,
    padding: tokens.spacing[3],
    marginTop: tokens.spacing[4],
  },
  roleNote: {
    flex: 1,
    fontSize: tokens.typography.small[0] - 1,
    lineHeight: tokens.typography.small[1],
    color: CAMPUS.textMuted,
  },

  rules: {
    marginTop: tokens.spacing[2] + 2,
    gap: tokens.spacing[1] + 2,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[1],
  },
  ruleText: {
    fontSize: tokens.typography.small[0] - 1,
    color: CAMPUS.textFaint,
  },
  ruleTextOk: {
    color: CAMPUS.mint,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing[1],
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
    gap: tokens.spacing[1] + 2,
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
    gap: tokens.spacing[0] + 4,
    marginTop: tokens.spacing[5],
  },
  footerText: {
    fontSize: tokens.typography.body[0],
    color: CAMPUS.textMuted,
  },
  linkButton: {
    paddingVertical: tokens.spacing[1] + 2,
    paddingHorizontal: tokens.spacing[1],
  },
  link: {
    color: CAMPUS.accent,
    fontWeight: (tokens.typography.overline[2] as any),
    fontSize: tokens.typography.body[0],
    textAlign: 'center',
  },

  successContainer: {
    alignItems: 'center',
    paddingTop: tokens.spacing[4] + 2,
  },
  successTile: {
    width: 68,
    height: 68,
    borderRadius: tokens.radius.lg,
    backgroundColor: 'rgba(52,211,153,0.12)',
    borderWidth: tokens.borderWidth.thin,
    borderColor: 'rgba(52,211,153,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing[2],
  },
  successTitle: {
    fontSize: tokens.typography.title[0],
    fontWeight: (tokens.typography.title[2] as any),
    color: CAMPUS.text,
    marginBottom: tokens.spacing[1],
    textAlign: 'center',
  },
  successText: {
    fontSize: tokens.typography.body[0],
    color: CAMPUS.textMuted,
    lineHeight: tokens.typography.body[1] - 3,
    marginBottom: tokens.spacing[2] + 2,
    textAlign: 'center',
  },
});
