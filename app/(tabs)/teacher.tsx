import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';

import CampusBackground from '@/components/CampusBackground';
import EventManager from '@/components/EventManager';
import { CAMPUS } from '@/constants/colors';
import * as tokens from '@/constants/tokens';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';

export default function TeacherScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      setRoleLoading(true);

      if (!user) {
        setRole(null);
        setRoleLoading(false);

        return () => {
          active = false;
        };
      }

      getProfile(user.id).then((profile) => {
        if (!active) return;

        setRole(profile?.role ?? 'student');
        setRoleLoading(false);
      });

      return () => {
        active = false;
      };
    }, [user])
  );

  if (roleLoading) {
    return (
      <View style={styles.centerContainer}>
        <CampusBackground />
        <ActivityIndicator size="large" color={CAMPUS.accent} />
        <Text style={styles.centerTitle}>Checking your account...</Text>
      </View>
    );
  }

  if ((role !== 'teacher' && role !== 'admin') || !user) {
    return (
      <View style={styles.centerContainer}>
        <CampusBackground />
        <View style={styles.lockTile}>
          <Ionicons
            name="lock-closed-outline"
            size={34}
            color={CAMPUS.accent}
          />
        </View>
        <Text style={styles.centerTitle}>Teachers Only</Text>
        <Text style={styles.centerSubtitle}>
          Only teacher and administrator accounts can manage events.
        </Text>
      </View>
    );
  }

  const isAdmin = role === 'admin';

  return (
    <View style={styles.container}>
      <CampusBackground />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              {isAdmin ? 'SYSTEM / ADMIN' : 'MODULE / TEACHER'}
            </Text>
            <Text style={styles.title}>Event Management</Text>
            <Text style={styles.subtitle}>
              {isAdmin
                ? 'Create, configure, and control all campus events.'
                : 'Create, configure, and manage your assigned events.'}
            </Text>
          </View>

          <View style={styles.rolePill}>
            <Ionicons
              name={isAdmin ? 'terminal-outline' : 'school-outline'}
              size={14}
              color={CAMPUS.accent}
            />
            <Text style={styles.roleText}>{isAdmin ? 'ADMIN' : 'TEACHER'}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: tokens.spacing[2], marginBottom: tokens.spacing[4] }}>
          <Pressable
            style={styles.quickBtn}
            onPress={() => router.push('/manage-announcements')}
          >
            <Ionicons name="megaphone-outline" size={18} color={CAMPUS.accent} />
            <Text style={styles.quickBtnText}>Announcements</Text>
          </Pressable>
          {(isAdmin || role === 'teacher') && (
            <Pressable
              style={styles.quickBtn}
              onPress={() => router.push('/heatmap')}
            >
              <Ionicons name="stats-chart-outline" size={18} color={CAMPUS.accent} />
              <Text style={styles.quickBtnText}>Heatmap</Text>
            </Pressable>
          )}
        </View>

        <EventManager
          scope={isAdmin ? 'all' : 'mine'}
          userId={user.id}
          canDelete={isAdmin}
        />
      </ScrollView>
    </View>
  );
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
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: tokens.spacing[6],
    paddingTop: tokens.spacing[5],
    paddingBottom: tokens.spacing[10],
  },
  centerContainer: {
    flex: 1,
    backgroundColor: CAMPUS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing[8],
  },
  lockTile: {
    width: 76,
    height: 76,
    borderRadius: tokens.radius.xl,
    backgroundColor: 'rgba(34,211,238,0.1)',
    borderWidth: tokens.borderWidth.thin,
    borderColor: 'rgba(34,211,238,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: CAMPUS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 6,
  },
  centerTitle: {
    fontSize: tokens.typography.title[0] + 2,
    fontWeight: (tokens.typography.title[2] as any),
    color: CAMPUS.text,
    marginTop: tokens.spacing[4],
    textAlign: 'center',
  },
  centerSubtitle: {
    fontSize: tokens.typography.body[0] - 1,
    color: CAMPUS.textMuted,
    lineHeight: tokens.typography.body[1],
    marginTop: tokens.spacing[2],
    textAlign: 'center',
    maxWidth: 360,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: tokens.spacing[3],
    marginBottom: tokens.spacing[5],
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    fontFamily: tokens.typography.fontFamily.techMono,
    fontSize: tokens.typography.overline[0],
    fontWeight: '700',
    letterSpacing: 2,
    color: CAMPUS.accent,
    marginBottom: tokens.spacing[2],
  },
  title: {
    fontSize: tokens.typography.headline[0] + 2,
    fontWeight: (tokens.typography.headline[2] as any),
    color: CAMPUS.text,
    marginBottom: tokens.spacing[2],
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: tokens.typography.body[0] - 1,
    color: CAMPUS.textMuted,
    lineHeight: tokens.typography.body[1] - 2,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[1] + 2,
    paddingHorizontal: tokens.spacing[3],
    paddingVertical: tokens.spacing[1] + 2,
    borderRadius: tokens.radius.sm,
    backgroundColor: CAMPUS.surface,
    borderWidth: tokens.borderWidth.thin,
    borderColor: CAMPUS.border,
  },
  roleText: {
    fontFamily: tokens.typography.fontFamily.techMono,
    fontSize: tokens.typography.overline[0] - 1,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: CAMPUS.accent,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing[2],
    backgroundColor: CAMPUS.surface,
    borderWidth: tokens.borderWidth.thin,
    borderColor: CAMPUS.border,
    borderRadius: tokens.radius.sm,
    paddingVertical: tokens.spacing[3],
  },
  quickBtnText: {
    fontSize: tokens.typography.small[0],
    fontWeight: '600',
    color: CAMPUS.text,
  },
});