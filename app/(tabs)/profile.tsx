import { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  TextInput,
  Pressable,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import CampusBackground from '@/components/CampusBackground';
import CampusButton from '@/components/CampusButton';
import { CAMPUS } from '@/constants/colors';
import * as tokens from '@/constants/tokens';
import { useAuth, signOut } from '@/lib/auth';
import { getProfile, updateProfile, Profile } from '@/lib/profiles';
import { LIMITS, validateFullName } from '@/lib/validation';

export default function ProfileScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftName, setDraftName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const router = useRouter();

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    try {
      const p = await getProfile(user.id);
      setProfile(p);
      setDraftName(p?.full_name ?? '');
    } catch (error) {
      console.error('Failed to load profile:', error);
      Alert.alert('Error', 'Unable to load your profile.');
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSaveName = async () => {
    if (!user) return;

    // Input validation
    const nameCheck = validateFullName(draftName);

    if (!nameCheck.ok) {
      setNameError(nameCheck.message);
      return;
    }

    setNameError(null);
    setSaving(true);

    try {
      const { error } = await updateProfile(user.id, {
        full_name: nameCheck.value,
      });

      if (error) {
        Alert.alert('Error', error);
        return;
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              full_name: nameCheck.value,
            }
          : prev
      );

      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);

    try {
      await signOut();
      router.replace('/login');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to sign out.');
    } finally {
      setLoading(false);
    }
  };

  const role = profile?.role?.toLowerCase();

  const roleLabel =
    role === 'admin'
      ? 'Admin'
      : role === 'teacher'
        ? 'Teacher'
        : role === 'student'
          ? 'Student'
          : 'Loading...';

  // Look-only: colours + icon for the role badge
  const roleBadgeStyle =
    role === 'admin'
      ? styles.roleBadgeAdmin
      : role === 'teacher'
        ? styles.roleBadgeTeacher
        : styles.roleBadgeStudent;

  const roleTextStyle =
    role === 'admin'
      ? styles.roleTextAdmin
      : role === 'teacher'
        ? styles.roleTextTeacher
        : styles.roleTextStudent;

  const roleIcon: keyof typeof Ionicons.glyphMap =
    role === 'admin'
      ? 'shield-checkmark'
      : role === 'teacher'
        ? 'school'
        : 'person';

  const roleIconColor =
    role === 'admin'
      ? CAMPUS.mint
      : role === 'teacher'
        ? '#9DB4FF'
        : CAMPUS.accent;

  const initials = getInitials(profile?.full_name, user?.email);

  return (
    <View style={styles.container}>
      <CampusBackground />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>USER / PROFILE</Text>
        <Text style={styles.title}>Account</Text>

        {user && (
          <>
            {/* Avatar + role */}
            <View style={styles.hero}>
              <View style={styles.avatarRing}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              </View>

              <View style={[styles.roleBadge, roleBadgeStyle]}>
                <Ionicons name={roleIcon} size={14} color={roleIconColor} />
                <Text style={[styles.roleBadgeText, roleTextStyle]}>
                  {roleLabel}
                </Text>
              </View>
            </View>

            {/* Details */}
            <View style={styles.infoCard}>
              <Text style={styles.label}>NAME</Text>

              {editing ? (
                <View style={styles.nameEditRow}>
                  <TextInput
                    style={styles.nameInput}
                    value={draftName}
                    onChangeText={setDraftName}
                    placeholder="Enter your name"
                    maxLength={LIMITS.name}
                    placeholderTextColor={CAMPUS.textFaint}
                    editable={!saving}
                  />

                  <Pressable
                    style={[styles.saveButton, saving && styles.saveButtonBusy]}
                    onPress={handleSaveName}
                    disabled={saving}
                  >
                    <Text style={styles.saveButtonText}>
                      {saving ? 'Saving...' : 'Save'}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => setEditing(true)}
                  style={styles.nameRow}
                >
                  <Text
                    style={[
                      styles.value,
                      !profile?.full_name && styles.valuePlaceholder,
                    ]}
                  >
                    {profile?.full_name || 'Tap to add your name'}
                  </Text>

                  <View style={styles.editChip}>
                    <Ionicons
                      name="create-outline"
                      size={14}
                      color={CAMPUS.accent}
                    />
                    <Text style={styles.editHint}>Edit</Text>
                  </View>
                </Pressable>
              )}

              {nameError ? (
                <Text style={styles.nameError}>{nameError}</Text>
              ) : null}

              <View style={styles.divider} />

              <Text style={styles.label}>EMAIL</Text>
              <View style={styles.valueRow}>
                <Ionicons
                  name="mail-outline"
                  size={17}
                  color={CAMPUS.textMuted}
                />
                <Text style={styles.value}>{user.email}</Text>
              </View>

              <View style={styles.divider} />

              <Text style={styles.label}>USER ID</Text>
              <View style={styles.valueRow}>
                <Ionicons
                  name="finger-print-outline"
                  size={17}
                  color={CAMPUS.textMuted}
                />
                <Text style={styles.valueSmall} selectable>
                  {user.id}
                </Text>
              </View>
            </View>
          </>
        )}

        <CampusButton
          variant="secondary"
          title="View Announcements"
          icon="megaphone-outline"
          onPress={() => router.push('/announcements')}
        />

        <CampusButton
          variant="danger"
          title="Sign Out"
          icon="log-out-outline"
          onPress={handleSignOut}
          disabled={loading}
        />
      </ScrollView>
    </View>
  );
}

function getInitials(name?: string | null, email?: string | null) {
  const source = (name && name.trim()) || (email && email.trim()) || '?';
  const parts = source.split(/[\s@._-]+/).filter(Boolean);

  if (parts.length >= 2 && name && name.trim()) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CAMPUS.bg,
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: tokens.spacing[6],
    paddingTop: tokens.spacing[5],
    paddingBottom: tokens.spacing[10],
  },
  eyebrow: {
    fontFamily: tokens.typography.fontFamily.techMono,
    fontSize: tokens.typography.overline[0],
    fontWeight: '700',
    letterSpacing: 2,
    color: CAMPUS.accent,
    marginBottom: tokens.spacing[1] + 2,
  },
  title: {
    fontSize: tokens.typography.headline[0],
    fontWeight: (tokens.typography.headline[2] as any),
    color: CAMPUS.text,
    marginBottom: tokens.spacing[6],
    letterSpacing: -0.3,
  },

  /* Hero */
  hero: {
    alignItems: 'center',
    marginBottom: tokens.spacing[5],
  },
  avatarRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: tokens.borderWidth.thick,
    borderColor: CAMPUS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: CAMPUS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: tokens.radius.xxl,
    backgroundColor: 'rgba(79,124,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: tokens.typography.display2[0],
    fontWeight: (tokens.typography.display2[2] as any),
    color: CAMPUS.text,
    letterSpacing: 1,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[1] + 2,
    borderRadius: tokens.radius.pill,
    borderWidth: tokens.borderWidth.thin,
    paddingHorizontal: tokens.spacing[3] + 2,
    paddingVertical: tokens.spacing[1] + 2,
    marginTop: tokens.spacing[4],
  },
  roleBadgeAdmin: {
    backgroundColor: 'rgba(52,211,153,0.12)',
    borderColor: 'rgba(52,211,153,0.4)',
  },
  roleBadgeTeacher: {
    backgroundColor: 'rgba(79,124,255,0.16)',
    borderColor: 'rgba(79,124,255,0.45)',
  },
  roleBadgeStudent: {
    backgroundColor: 'rgba(34,211,238,0.10)',
    borderColor: 'rgba(34,211,238,0.35)',
  },
  roleBadgeText: {
    fontFamily: tokens.typography.fontFamily.techMono,
    fontSize: tokens.typography.small[0] - 1,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  roleTextAdmin: { color: CAMPUS.mint },
  roleTextTeacher: { color: '#9DB4FF' },
  roleTextStudent: { color: CAMPUS.accent },

  /* Details card */
  infoCard: {
    backgroundColor: CAMPUS.surface,
    borderRadius: tokens.radius.xl,
    borderWidth: tokens.borderWidth.thin,
    borderColor: CAMPUS.border,
    padding: tokens.componentTokens.cardPadding,
    marginBottom: tokens.spacing[5],
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 4,
  },
  label: {
    fontFamily: tokens.typography.fontFamily.techMono,
    fontSize: tokens.typography.overline[0],
    fontWeight: (tokens.typography.overline[2] as any),
    letterSpacing: 1.4,
    color: CAMPUS.textMuted,
    marginBottom: tokens.spacing[1] + 2,
  },
  value: {
    flex: 1,
    fontSize: tokens.typography.body[0] - 1,
    color: CAMPUS.text,
    fontWeight: '600',
  },
  valuePlaceholder: {
    color: CAMPUS.textFaint,
    fontWeight: '500',
  },
  valueSmall: {
    flex: 1,
    fontFamily: tokens.typography.fontFamily.techMono,
    fontSize: tokens.typography.overline[0],
    color: CAMPUS.textMuted,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[2] + 2,
  },
  divider: {
    height: tokens.borderWidth.thin,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: tokens.spacing[4],
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing[2] + 2,
  },
  editChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[1],
    paddingHorizontal: tokens.spacing[2] + 2,
    paddingVertical: tokens.spacing[1],
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(34,211,238,0.10)',
    borderWidth: tokens.borderWidth.thin,
    borderColor: 'rgba(34,211,238,0.3)',
  },
  editHint: {
    fontSize: tokens.typography.small[0],
    color: CAMPUS.accent,
    fontWeight: '700',
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[2],
  },
  nameInput: {
    flex: 1,
    backgroundColor: CAMPUS.inputBg,
    borderRadius: tokens.radius.md,
    borderWidth: tokens.borderWidth.normal,
    borderColor: CAMPUS.accent,
    paddingHorizontal: tokens.spacing[3],
    paddingVertical: tokens.spacing[2] + 2,
    fontSize: tokens.typography.body[0] - 1,
    color: CAMPUS.text,
  },
  saveButton: {
    backgroundColor: CAMPUS.primary,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing[4],
    paddingVertical: tokens.spacing[2] + 3,
  },
  nameError: {
    color: CAMPUS.danger,
    fontSize: tokens.typography.small[0],
    marginTop: tokens.spacing[2],
  },
  saveButtonBusy: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: tokens.typography.small[0] + 1,
    fontWeight: '700',
  },
});
