import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import CampusBackground from '@/components/CampusBackground';
import CampusButton from '@/components/CampusButton';
import EventManager from '@/components/EventManager';
import { CAMPUS } from '@/constants/colors';
import * as tokens from '@/constants/tokens';

/* ----------------------------- Types ----------------------------- */

type FeatureAction = 'users' | 'events' | 'attendance' | 'corrections' | 'reports';
type RoleName = 'student' | 'teacher' | 'admin';

type Feature = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  action: FeatureAction;
};

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at?: string;
};

type EventRecord = {
  id: string;
  event_code: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  created_by: string | null;
  created_at?: string;
};

type AttendanceRecord = {
  id: string;
  student_id: string;
  event_id: string;
  scanned_at: string;
};

type Notice = { type: 'success' | 'error'; text: string } | null;

type ModalState =
  | null
  | {
      kind: 'confirm';
      title: string;
      message: string;
      confirmLabel: string;
      onConfirm: () => void;
    }
  | { kind: 'addAttendance' }
  | { kind: 'moveAttendance'; record: AttendanceRecord };

type DbResult = {
  error: { message: string } | null;
  data?: unknown[] | null;
};

/* ----------------------------- Config ----------------------------- */

const ROLES: RoleName[] = ['student', 'teacher', 'admin'];

const adminFeatures: Feature[] = [
  {
    title: 'Manage Users',
    description: 'View accounts and change user roles.',
    icon: 'people-outline',
    color: '#6C8DFF',
    action: 'users',
  },
  {
    title: 'Manage Events',
    description: 'Create, view, edit, close or delete any event.',
    icon: 'calendar-outline',
    color: '#A78BFA',
    action: 'events',
  },
  {
    title: 'Overall Attendance',
    description: 'View attendance records across all events.',
    icon: 'clipboard-outline',
    color: '#34D399',
    action: 'attendance',
  },
  {
    title: 'Correct Attendance',
    description: 'Add missing, move, or remove attendance records.',
    icon: 'create-outline',
    color: '#FBBF24',
    action: 'corrections',
  },
  {
    title: 'System Records & Reports',
    description: 'Review totals, per-event summaries, and export CSV.',
    icon: 'document-text-outline',
    color: '#F472B6',
    action: 'reports',
  },
];

const RLS_HINT =
  'Nothing was saved. Your admin permissions (RLS policies) are probably missing — run admin_policies.sql in the Supabase SQL Editor.';

/* ----------------------------- Helpers ----------------------------- */

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/* ----------------------------- Screen ----------------------------- */

export default function AdminScreen() {
  const [section, setSection] = useState<FeatureAction | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [eventFilter, setEventFilter] = useState<string | null>(null);

  /* ------------------------- Data loading ------------------------- */

  const loadDashboard = useCallback(
    async (isRefresh = false): Promise<void> => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setIsAdmin(false);
      }
      setErrorMessage('');

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          setProfiles([]);
          setEvents([]);
          setAttendance([]);
          setSection(null);
          setIsAdmin(false);
          setErrorMessage('Please sign in to access the admin dashboard.');
          return;
        }

        setCurrentUserId(user.id);

        const { data: currentProfile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (currentProfile?.role !== 'admin') {
          setProfiles([]);
          setEvents([]);
          setAttendance([]);
          setSection(null);
          setIsAdmin(false);
          setErrorMessage(
            'Only administrators are allowed to access this dashboard.'
          );
          return;
        }

        const [
          { data: userData, error: usersError },
          { data: eventData, error: eventsError },
          { data: attendanceData, error: attendanceError },
        ] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, email, full_name, role, created_at')
            .order('created_at', { ascending: false }),
          supabase
            .from('events')
            .select(
              'id, event_code, title, start_time, end_time, created_by, created_at'
            )
            .order('created_at', { ascending: false }),
          supabase
            .from('attendance')
            .select('id, student_id, event_id, scanned_at')
            .order('scanned_at', { ascending: false }),
        ]);

        if (usersError) throw usersError;
        if (eventsError) throw eventsError;
        if (attendanceError) throw attendanceError;

        setProfiles((userData ?? []) as Profile[]);
        setEvents((eventData ?? []) as EventRecord[]);
        setAttendance((attendanceData ?? []) as AttendanceRecord[]);
        setIsAdmin(true);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to verify administrator access.';

        if (isRefresh) {
          // Keep the dashboard visible; just report the failed refresh.
          setNotice({ type: 'error', text: message });
        } else {
          setIsAdmin(false);
          setProfiles([]);
          setEvents([]);
          setAttendance([]);
          setSection(null);
          setErrorMessage(message);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  /* ------------------------- Mutations ------------------------- */

  // Runs a write, reports the outcome, then refreshes the data.
  const mutate = async (
    action: () => PromiseLike<DbResult>,
    successText: string
  ): Promise<boolean> => {
    setBusy(true);
    setNotice(null);

    try {
      const { error, data } = await action();

      if (error) {
        setNotice({
          type: 'error',
          text:
            error.message.includes('duplicate') ||
            error.message.includes('unique')
              ? 'That record already exists.'
              : error.message,
        });
        return false;
      }

      if (data && data.length === 0) {
        setNotice({ type: 'error', text: RLS_HINT });
        return false;
      }

      setNotice({ type: 'success', text: successText });
      await loadDashboard(true);
      return true;
    } catch (e: unknown) {
      setNotice({
        type: 'error',
        text: e instanceof Error ? e.message : 'Something went wrong.',
      });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const changeRole = (profile: Profile, role: RoleName) => {
    if (profile.role === role) return;

    if (profile.id === currentUserId) {
      setNotice({
        type: 'error',
        text: 'You cannot change your own role. Ask another admin.',
      });
      return;
    }

    void mutate(
      () =>
        supabase
          .from('profiles')
          .update({ role })
          .eq('id', profile.id)
          .select('id'),
      `${profile.full_name || profile.email} is now ${role}.`
    );
  };

  const askDeleteAttendance = (record: AttendanceRecord) => {
    setModal({
      kind: 'confirm',
      title: 'Remove attendance?',
      message: `Remove ${getStudentName(record.student_id)} from "${getEventName(
        record.event_id
      )}"?`,
      confirmLabel: 'Remove',
      onConfirm: () => {
        setModal(null);
        void mutate(
          () =>
            supabase
              .from('attendance')
              .delete()
              .eq('id', record.id)
              .select('id'),
          'Attendance record removed.'
        );
      },
    });
  };

  const addAttendance = async (studentId: string, eventId: string) => {
    if (!studentId || !eventId) {
      return 'Choose both a student and an event.';
    }
    const ok = await mutate(
      () =>
        supabase
          .from('attendance')
          .insert([{ student_id: studentId, event_id: eventId }])
          .select('id'),
      'Attendance added.'
    );
    if (ok) setModal(null);
    return null;
  };

  const moveAttendance = async (record: AttendanceRecord, eventId: string) => {
    if (!eventId || eventId === record.event_id) {
      return 'Choose a different event.';
    }
    const ok = await mutate(
      () =>
        supabase
          .from('attendance')
          .update({ event_id: eventId })
          .eq('id', record.id)
          .select('id'),
      'Attendance moved.'
    );
    if (ok) setModal(null);
    return null;
  };

  /* ------------------------- Derived data ------------------------- */

  const selectedFeature = adminFeatures.find((f) => f.action === section);

  const getStudentName = (studentId: string): string => {
    const profile = profiles.find((item) => item.id === studentId);
    return (
      profile?.full_name ||
      profile?.email ||
      `Student ID: ${studentId.slice(0, 8)}`
    );
  };

  const getEventName = (eventId: string): string => {
    const event = events.find((item) => item.id === eventId);
    return event?.title || `Event ID: ${eventId.slice(0, 8)}`;
  };

  const formatDate = (value?: string | null): string => {
    if (!value) return 'Not set';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not set';
    return date.toLocaleString();
  };

  const visibleAttendance = useMemo(
    () =>
      eventFilter
        ? attendance.filter((a) => a.event_id === eventFilter)
        : attendance,
    [attendance, eventFilter]
  );

  const perEventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    attendance.forEach((a) => {
      counts[a.event_id] = (counts[a.event_id] ?? 0) + 1;
    });
    return counts;
  }, [attendance]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { student: 0, teacher: 0, admin: 0 };
    profiles.forEach((p) => {
      counts[p.role] = (counts[p.role] ?? 0) + 1;
    });
    return counts;
  }, [profiles]);

  const getSectionCount = (action: FeatureAction): number => {
    switch (action) {
      case 'users':
        return profiles.length;
      case 'events':
        return events.length;
      case 'attendance':
      case 'corrections':
        return attendance.length;
      case 'reports':
        return events.length;
    }
  };

  const exportCsv = async () => {
    const header = [
      'Student',
      'Email',
      'Event',
      'Event code',
      'Scanned at',
    ].join(',');

    const rows = attendance.map((a) => {
      const p = profiles.find((x) => x.id === a.student_id);
      const e = events.find((x) => x.id === a.event_id);
      return [
        csvCell(p?.full_name ?? ''),
        csvCell(p?.email ?? a.student_id),
        csvCell(e?.title ?? a.event_id),
        csvCell(e?.event_code ?? ''),
        csvCell(new Date(a.scanned_at).toISOString()),
      ].join(',');
    });

    const csv = [header, ...rows].join('\n');

    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'attendance-report.csv';
        link.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ message: csv, title: 'Attendance report' });
      }
      setNotice({ type: 'success', text: 'Report exported.' });
    } catch {
      setNotice({ type: 'error', text: 'Could not export the report.' });
    }
  };

  /* ------------------------- Section content ------------------------- */

  const renderEventChips = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chipScroll}
    >
      <TouchableOpacity
        style={[styles.chip, !eventFilter && styles.chipActive]}
        hitSlop={6}
        onPress={() => setEventFilter(null)}
      >
        <Text style={[styles.chipText, !eventFilter && styles.chipTextActive]}>
          All events
        </Text>
      </TouchableOpacity>
      {events.map((e) => (
        <TouchableOpacity
          key={e.id}
          style={[styles.chip, eventFilter === e.id && styles.chipActive]}
          hitSlop={6}
          onPress={() => setEventFilter(e.id)}
        >
          <Text
            style={[
              styles.chipText,
              eventFilter === e.id && styles.chipTextActive,
            ]}
          >
            {e.title}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderSectionContent = (): React.ReactNode => {
    if (!section || !selectedFeature) return null;

    if (section === 'users') {
      if (profiles.length === 0) {
        return <Text style={styles.emptyText}>No user profiles found.</Text>;
      }

      return profiles.map((profile) => {
        const isSelf = profile.id === currentUserId;
        return (
          <View key={profile.id} style={styles.dataCardColumn}>
            <View style={styles.dataRow}>
              <View style={styles.dataIcon}>
                <Ionicons name="person-outline" size={22} color={CAMPUS.accent} />
              </View>
              <View style={styles.dataText}>
                <Text style={styles.dataTitle}>
                  {profile.full_name || 'Unnamed User'}
                  {isSelf ? ' (you)' : ''}
                </Text>
                <Text style={styles.dataDescription}>{profile.email}</Text>
                <Text style={styles.dataMeta}>
                  Joined {formatDate(profile.created_at)}
                </Text>
              </View>
            </View>

            <View style={styles.roleRow}>
              {ROLES.map((r) => {
                const active = profile.role === r;
                return (
                  <TouchableOpacity
                    key={r}
                    disabled={busy || isSelf}
                    hitSlop={6}
                    onPress={() => changeRole(profile, r)}
                    style={[
                      styles.roleChip,
                      active && styles.roleChipActive,
                      isSelf && !active && styles.disabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleChipText,
                        active && styles.roleChipTextActive,
                      ]}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      });
    }

    if (section === 'events') {
      return (
        <EventManager
          scope="all"
          userId={currentUserId}
          canDelete
          onChanged={() => void loadDashboard(true)}
        />
      );
    }

    if (section === 'attendance' || section === 'corrections') {
      const isCorrections = section === 'corrections';

      return (
        <>
          {isCorrections && (
            <View style={styles.addWrap}>
              <CampusButton
                variant="primary"
                title="Add Missing Attendance"
                icon="add-circle-outline"
                onPress={() => setModal({ kind: 'addAttendance' })}
              />
            </View>
          )}

          {renderEventChips()}

          {visibleAttendance.length === 0 ? (
            <Text style={styles.emptyText}>No attendance records found.</Text>
          ) : (
            visibleAttendance.map((record) => (
              <View key={record.id} style={styles.dataCardColumn}>
                <View style={styles.dataRow}>
                  <View
                    style={[styles.dataIcon, { backgroundColor: 'rgba(52,211,153,0.12)' }]}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={22}
                      color={CAMPUS.mint}
                    />
                  </View>
                  <View style={styles.dataText}>
                    <Text style={styles.dataTitle}>
                      {getStudentName(record.student_id)}
                    </Text>
                    <Text style={styles.dataDescription}>
                      {getEventName(record.event_id)}
                    </Text>
                    <Text style={styles.dataMeta}>
                      Scanned: {formatDate(record.scanned_at)}
                    </Text>
                  </View>
                </View>

                {isCorrections && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.smallButton}
                      hitSlop={6}
                      onPress={() => setModal({ kind: 'moveAttendance', record })}
                    >
                      <Ionicons
                        name="swap-horizontal-outline"
                        size={16}
                        color={CAMPUS.accent}
                      />
                      <Text style={styles.smallButtonText}>Move event</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.smallButton, styles.smallButtonDanger]}
                      hitSlop={6}
                      onPress={() => askDeleteAttendance(record)}
                    >
                      <Ionicons name="trash-outline" size={16} color={CAMPUS.danger} />
                      <Text style={[styles.smallButtonText, styles.dangerText]}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </>
      );
    }

    // Reports
    return (
      <>
        <View style={styles.reportCard}>
          <Text style={styles.reportTitle}>System Summary</Text>

          <View style={styles.reportRow}>
            <Text style={styles.reportLabel}>Total user profiles</Text>
            <Text style={styles.reportValue}>{profiles.length}</Text>
          </View>
          <View style={styles.reportRow}>
            <Text style={styles.reportLabel}>Students / Teachers / Admins</Text>
            <Text style={styles.reportValue}>
              {roleCounts.student} / {roleCounts.teacher} / {roleCounts.admin}
            </Text>
          </View>
          <View style={styles.reportRow}>
            <Text style={styles.reportLabel}>Total events</Text>
            <Text style={styles.reportValue}>{events.length}</Text>
          </View>
          <View style={styles.reportRow}>
            <Text style={styles.reportLabel}>Attendance records</Text>
            <Text style={styles.reportValue}>{attendance.length}</Text>
          </View>
        </View>

        <View style={[styles.reportCard, { marginTop: 14 }]}>
          <Text style={styles.reportTitle}>Attendance per Event</Text>
          {events.length === 0 ? (
            <Text style={styles.reportNote}>No events yet.</Text>
          ) : (
            events.map((e) => (
              <View key={e.id} style={styles.reportRow}>
                <Text style={styles.reportLabel}>{e.title}</Text>
                <Text style={styles.reportValue}>
                  {perEventCounts[e.id] ?? 0}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={[styles.addWrap, { marginTop: 16 }]}>
          <CampusButton
            variant="primary"
            title="Export Attendance CSV"
            icon="download-outline"
            onPress={() => void exportCsv()}
          />
        </View>
      </>
    );
  };

  /* ------------------------- Early returns ------------------------- */

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <CampusBackground />
        <StatusBar barStyle="light-content" backgroundColor="#0A0F1E" />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={CAMPUS.accent} />
          <Text style={styles.loadingText}>
            Verifying administrator access...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <CampusBackground />
        <StatusBar barStyle="light-content" backgroundColor="#0A0F1E" />
        <View style={styles.centerContent}>
          <View style={styles.accessIcon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={38}
              color={CAMPUS.accent}
            />
          </View>
          <Text style={styles.accessTitle}>Admin Access Only</Text>
          <Text style={styles.accessDescription}>
            {errorMessage ||
              'Only administrators are allowed to access this section.'}
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => void loadDashboard()}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Check Access Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const noticeView = notice ? (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => setNotice(null)}
      style={[
        styles.noticeCard,
        notice.type === 'success' ? styles.noticeSuccess : styles.errorCard,
      ]}
    >
      <Ionicons
        name={
          notice.type === 'success'
            ? 'checkmark-circle-outline'
            : 'alert-circle-outline'
        }
        size={20}
        color={notice.type === 'success' ? CAMPUS.mint : CAMPUS.danger}
      />
      <Text
        style={
          notice.type === 'success' ? styles.noticeSuccessText : styles.errorText
        }
      >
        {notice.text}
      </Text>
    </TouchableOpacity>
  ) : null;

  /* ------------------------- Main render ------------------------- */

  return (
    <SafeAreaView style={styles.container}>
      <CampusBackground />
      <StatusBar barStyle="light-content" backgroundColor="#0A0F1E" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadDashboard(true)}
            tintColor={CAMPUS.accent}
            colors={[CAMPUS.accent]}
            progressBackgroundColor={CAMPUS.bgDeep}
          />
        }
      >
        {section ? (
          <>
            <View style={styles.sectionTopBar}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  setSection(null);
                  setNotice(null);
                  setEventFilter(null);
                }}
                accessibilityRole="button"
                accessibilityLabel="Back to administration tools"
              >
                <Ionicons name="arrow-back" size={22} color={CAMPUS.text} />
              </TouchableOpacity>

              <View style={styles.sectionTopText}>
                <Text style={styles.eyebrow}>QR-ATT MANAGEMENT</Text>
                <Text style={styles.title}>{selectedFeature?.title}</Text>
              </View>

              <TouchableOpacity
                style={styles.refreshButton}
                onPress={() => void loadDashboard(true)}
                accessibilityRole="button"
                accessibilityLabel="Refresh dashboard data"
              >
                <Ionicons name="refresh-outline" size={22} color={CAMPUS.accent} />
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionSubtitle}>
              {selectedFeature?.description}
            </Text>

            <View style={styles.countCard}>
              <Text style={styles.countLabel}>Records found</Text>
              <Text style={styles.countValue}>
                {section === 'attendance' || section === 'corrections'
                  ? visibleAttendance.length
                  : getSectionCount(section)}
              </Text>
            </View>

            {noticeView}
            {renderSectionContent()}
          </>
        ) : (
          <>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.eyebrow}>[ROOT] / ADMIN_CONSOLE</Text>
                <Text style={styles.title}>Zen_admin_panel</Text>
                <Text style={styles.subtitle}>
                  $ systemctl manage --users --events --attendance
                </Text>
              </View>
              <View style={styles.adminIcon}>
                <Ionicons
                  name="terminal"
                  size={28}
                  color={CAMPUS.accent}
                />
              </View>
            </View>

            <View style={styles.welcomeCard}>
              <View style={styles.terminalHeader}>
                <View style={styles.terminalDots}>
                  <View style={[styles.dot, { backgroundColor: '#FF5F57' }]} />
                  <View style={[styles.dot, { backgroundColor: '#FEBC2E' }]} />
                  <View style={[styles.dot, { backgroundColor: '#28C840' }]} />
                </View>
                <Text style={styles.terminalTitle}>admin@qr-att:~$</Text>
              </View>
              <View style={styles.welcomeContent}>
                <Text style={styles.terminalLine}>[INFO] Initializing admin session...</Text>
                <Text style={styles.terminalLine}>[OK] Authentication verified</Text>
                <Text style={styles.terminalLine}>[READY] Select module to execute</Text>
              </View>
            </View>

            <Text style={styles.statsSectionTitle}>[METRICS]</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCardGrid}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="people-outline" size={20} color={CAMPUS.accent} />
                </View>
                <View style={styles.statTextContainer}>
                  <Text style={styles.statValueGrid}>{profiles.length}</Text>
                  <Text style={styles.statLabelGrid}>USERS</Text>
                </View>
              </View>
              <View style={styles.statCardGrid}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(167,139,250,0.12)', borderColor: 'rgba(167,139,250,0.35)' }]}>
                  <Ionicons name="calendar-outline" size={20} color="#A78BFA" />
                </View>
                <View style={styles.statTextContainer}>
                  <Text style={styles.statValueGrid}>{events.length}</Text>
                  <Text style={styles.statLabelGrid}>EVENTS</Text>
                </View>
              </View>
              <View style={styles.statCardGrid}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(82,240,176,0.12)', borderColor: 'rgba(82,240,176,0.35)' }]}>
                  <Ionicons
                    name="checkmark-done-outline"
                    size={20}
                    color={CAMPUS.mint}
                  />
                </View>
                <View style={styles.statTextContainer}>
                  <Text style={styles.statValueGrid}>{attendance.length}</Text>
                  <Text style={styles.statLabelGrid}>CHECK-INS</Text>
                </View>
              </View>
            </View>

            {noticeView}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>[MODULES]</Text>
              <Text style={styles.sectionSubtitle}>
                $ ls ./modules/
              </Text>
            </View>

            <View style={styles.featuresGrid}>
              {adminFeatures.map((feature) => (
                <TouchableOpacity
                  key={feature.action}
                  style={styles.featureCardGrid}
                  activeOpacity={0.7}
                  onPress={() => {
                    setNotice(null);
                    setSection(feature.action);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={feature.title}
                >
                  <View
                    style={[
                      styles.featureIconGrid,
                      {
                        backgroundColor: `${feature.color}15`,
                        borderColor: `${feature.color}40`,
                      },
                    ]}
                  >
                    <Ionicons
                      name={feature.icon}
                      size={24}
                      color={feature.color}
                    />
                  </View>
                  <Text style={styles.featureTitleGrid}>{feature.title}</Text>
                  <Text style={styles.featureDescriptionGrid}>
                    {feature.description}
                  </Text>
                  <View style={styles.featureFooter}>
                    <Text style={[styles.featureCountGrid, { color: feature.color }]}>
                      {getSectionCount(feature.action)}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={feature.color} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.securityCard}>
              <Ionicons name="shield-checkmark-outline" size={20} color={CAMPUS.accent} />
              <View style={styles.securityText}>
                <Text style={styles.securityTitle}>SECURITY NOTICE</Text>
                <Text style={styles.securityDescription}>
                  Admin privileges enforced via Supabase RLS policies. All actions are logged and restricted to authorized roles.
                </Text>
              </View>
            </View>

            <Text style={styles.footer}>QR-ATT // ADMIN_CONSOLE_v1.0</Text>
          </>
        )}
      </ScrollView>

      {busy && (
        <View style={styles.busyOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}

      <ModalHost
        modal={modal}
        close={() => setModal(null)}
        profiles={profiles}
        events={events}
        addAttendance={addAttendance}
        moveAttendance={moveAttendance}
        getStudentName={getStudentName}
        getEventName={getEventName}
      />
    </SafeAreaView>
  );
}

/* ----------------------------- Modals ----------------------------- */

type ModalHostProps = {
  modal: ModalState;
  close: () => void;
  profiles: Profile[];
  events: EventRecord[];
  addAttendance: (studentId: string, eventId: string) => Promise<string | null>;
  moveAttendance: (
    record: AttendanceRecord,
    eventId: string
  ) => Promise<string | null>;
  getStudentName: (id: string) => string;
  getEventName: (id: string) => string;
};

function ModalHost(props: ModalHostProps) {
  const { modal, close } = props;

  return (
    <Modal
      visible={modal !== null}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          {modal?.kind === 'confirm' && (
            <>
              <Text style={styles.modalTitle}>{modal.title}</Text>
              <Text style={styles.modalMessage}>{modal.message}</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancel} onPress={close}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalDanger}
                  onPress={modal.onConfirm}
                >
                  <Text style={styles.modalConfirmText}>
                    {modal.confirmLabel}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {modal?.kind === 'addAttendance' && (
            <AddAttendanceForm
              profiles={props.profiles}
              events={props.events}
              onSave={props.addAttendance}
              onCancel={close}
            />
          )}

          {modal?.kind === 'moveAttendance' && (
            <MoveAttendanceForm
              record={modal.record}
              events={props.events}
              studentName={props.getStudentName(modal.record.student_id)}
              currentEvent={props.getEventName(modal.record.event_id)}
              onSave={props.moveAttendance}
              onCancel={close}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function OptionList({
  options,
  selected,
  onSelect,
}: {
  options: { id: string; label: string; sub?: string }[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  if (options.length === 0) {
    return <Text style={styles.emptyTextSmall}>Nothing to choose from.</Text>;
  }

  return (
    <ScrollView style={styles.optionList} nestedScrollEnabled>
      {options.map((o) => {
        const active = o.id === selected;
        return (
          <TouchableOpacity
            key={o.id}
            style={[styles.option, active && styles.optionActive]}
            onPress={() => onSelect(o.id)}
          >
            <Text style={[styles.optionText, active && styles.optionTextActive]}>
              {o.label}
            </Text>
            {o.sub ? <Text style={styles.optionSub}>{o.sub}</Text> : null}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function AddAttendanceForm({
  profiles,
  events,
  onSave,
  onCancel,
}: {
  profiles: Profile[];
  events: EventRecord[];
  onSave: ModalHostProps['addAttendance'];
  onCancel: () => void;
}) {
  const [studentId, setStudentId] = useState('');
  const [eventId, setEventId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const students = profiles.filter((p) => p.role === 'student');

  return (
    <>
      <Text style={styles.modalTitle}>Add Missing Attendance</Text>

      <Text style={styles.inputLabel}>Student</Text>
      <OptionList
        options={students.map((s) => ({
          id: s.id,
          label: s.full_name || s.email,
          sub: s.full_name ? s.email : undefined,
        }))}
        selected={studentId}
        onSelect={setStudentId}
      />

      <Text style={styles.inputLabel}>Event</Text>
      <OptionList
        options={events.map((e) => ({ id: e.id, label: e.title, sub: e.event_code }))}
        selected={eventId}
        onSelect={setEventId}
      />

      {error ? <Text style={styles.formError}>{error}</Text> : null}

      <View style={styles.modalButtons}>
        <TouchableOpacity style={styles.modalCancel} onPress={onCancel}>
          <Text style={styles.modalCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.modalPrimary}
          onPress={async () => setError(await onSave(studentId, eventId))}
        >
          <Text style={styles.modalConfirmText}>Add</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

function MoveAttendanceForm({
  record,
  events,
  studentName,
  currentEvent,
  onSave,
  onCancel,
}: {
  record: AttendanceRecord;
  events: EventRecord[];
  studentName: string;
  currentEvent: string;
  onSave: ModalHostProps['moveAttendance'];
  onCancel: () => void;
}) {
  const [eventId, setEventId] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Text style={styles.modalTitle}>Move Attendance</Text>
      <Text style={styles.modalMessage}>
        {studentName} is currently recorded for "{currentEvent}". Choose the
        correct event:
      </Text>

      <OptionList
        options={events
          .filter((e) => e.id !== record.event_id)
          .map((e) => ({ id: e.id, label: e.title, sub: e.event_code }))}
        selected={eventId}
        onSelect={setEventId}
      />

      {error ? <Text style={styles.formError}>{error}</Text> : null}

      <View style={styles.modalButtons}>
        <TouchableOpacity style={styles.modalCancel} onPress={onCancel}>
          <Text style={styles.modalCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.modalPrimary}
          onPress={async () => setError(await onSave(record, eventId))}
        >
          <Text style={styles.modalConfirmText}>Move</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

/* ----------------------------- Styles ----------------------------- */

const SHEET_BG = '#0F1629';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CAMPUS.bg },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: tokens.spacing[6],
    paddingTop: tokens.spacing[5],
    paddingBottom: tokens.spacing[10],
  },
  centerContent: {
    flex: 1,
    padding: tokens.spacing[7],
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { marginTop: tokens.spacing[3] + 2, color: CAMPUS.textMuted, fontSize: tokens.typography.body[0] - 2 },
  accessIcon: {
    width: 80,
    height: 80,
    borderRadius: tokens.radius.xl,
    backgroundColor: 'rgba(34,211,238,0.1)',
    borderWidth: tokens.borderWidth.thin,
    borderColor: 'rgba(34,211,238,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing[1] + 2,
    shadowColor: CAMPUS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 6,
  },
  accessTitle: {
    fontSize: tokens.typography.title[0] + 2,
    fontWeight: (tokens.typography.title[2] as any),
    color: CAMPUS.text,
    marginTop: tokens.spacing[4] + 2,
    textAlign: 'center',
  },
  accessDescription: {
    fontSize: tokens.typography.body[0] - 2,
    color: CAMPUS.textMuted,
    textAlign: 'center',
    lineHeight: tokens.typography.body[1] - 3,
    marginTop: tokens.spacing[2] + 2,
    marginBottom: tokens.spacing[6],
    maxWidth: 360,
  },
  primaryButton: {
    backgroundColor: CAMPUS.primary,
    paddingHorizontal: tokens.spacing[6] + 2,
    paddingVertical: tokens.componentTokens.buttonPadding.vertical,
    borderRadius: tokens.radius.md + 2,
    shadowColor: CAMPUS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 5,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: tokens.typography.body[0] - 2, fontWeight: '700' },


  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing[6],
    gap: tokens.spacing[3],
  },
  headerText: { flex: 1 },
  eyebrow: {
    fontFamily: tokens.typography.fontFamily.techMono,
    fontSize: tokens.typography.overline[0],
    fontWeight: '700',
    color: CAMPUS.accent,
    letterSpacing: 2,
    marginBottom: tokens.spacing[2],
  },
  title: { fontSize: tokens.typography.display2[0], fontWeight: (tokens.typography.display2[2] as any), color: CAMPUS.text, letterSpacing: -0.5 },
  subtitle: {
    fontSize: tokens.typography.body[0] - 1,
    color: CAMPUS.textMuted,
    lineHeight: tokens.typography.body[1] - 2,
    marginTop: tokens.spacing[1] + 2,
  },
  adminIcon: {
    width: 58,
    height: 58,
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(66,232,255,0.1)',
    borderWidth: tokens.borderWidth.thin,
    borderColor: 'rgba(66,232,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeCard: {
    backgroundColor: CAMPUS.surface,
    borderWidth: tokens.borderWidth.thin,
    borderColor: CAMPUS.border,
    borderRadius: tokens.radius.sm,
    marginBottom: tokens.spacing[6],
    overflow: 'hidden',
  },
  terminalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[3],
    backgroundColor: CAMPUS.surfaceStrong,
    paddingHorizontal: tokens.spacing[3],
    paddingVertical: tokens.spacing[2],
    borderBottomWidth: tokens.borderWidth.thin,
    borderBottomColor: CAMPUS.border,
  },
  terminalDots: {
    flexDirection: 'row',
    gap: tokens.spacing[1],
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  terminalTitle: {
    fontFamily: tokens.typography.fontFamily.techMono,
    fontSize: tokens.typography.small[0],
    color: CAMPUS.textMuted,
  },
  welcomeContent: {
    padding: tokens.spacing[4],
    gap: tokens.spacing[1],
  },
  terminalLine: {
    fontFamily: tokens.typography.fontFamily.techMono,
    fontSize: tokens.typography.small[0],
    color: CAMPUS.mint,
  },
  statsSectionTitle: {
    fontFamily: tokens.typography.fontFamily.techMono,
    fontSize: tokens.typography.overline[0],
    fontWeight: '700',
    color: CAMPUS.accent,
    letterSpacing: 2,
    marginBottom: tokens.spacing[3],
  },
  statsGrid: {
    flexDirection: 'row',
    gap: tokens.spacing[2],
    marginBottom: tokens.spacing[6],
    flexWrap: 'wrap',
  },
  statCardGrid: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CAMPUS.surface,
    borderWidth: tokens.borderWidth.thin,
    borderColor: CAMPUS.border,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing[3],
    gap: tokens.spacing[2],
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.sm,
    backgroundColor: 'rgba(102,139,255,0.12)',
    borderWidth: tokens.borderWidth.thin,
    borderColor: 'rgba(102,139,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTextContainer: {
    flex: 1,
  },
  statValueGrid: { fontSize: tokens.typography.title[0], fontWeight: (tokens.typography.title[2] as any), color: CAMPUS.text },
  statLabelGrid: {
    fontFamily: tokens.typography.fontFamily.techMono,
    fontSize: tokens.typography.overline[0] - 1,
    letterSpacing: 1.2,
    color: CAMPUS.textFaint,
    marginTop: tokens.spacing[0],
  },
  sectionHeader: { marginBottom: tokens.spacing[4] },
  sectionTitle: { fontSize: tokens.typography.title[0] - 2, fontWeight: (tokens.typography.title[2] as any), color: CAMPUS.text, letterSpacing: -0.3, fontFamily: tokens.typography.fontFamily.techMono },
  sectionSubtitle: {
    fontSize: tokens.typography.small[0],
    color: CAMPUS.mint,
    marginTop: tokens.spacing[1],
    lineHeight: tokens.typography.small[1] + 1,
    fontFamily: tokens.typography.fontFamily.techMono,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing[2],
    marginBottom: tokens.spacing[6],
  },
  featureCardGrid: {
    width: '48%',
    backgroundColor: CAMPUS.surface,
    padding: tokens.spacing[3],
    borderRadius: tokens.radius.md,
    borderWidth: tokens.borderWidth.thin,
    borderColor: CAMPUS.border,
    minHeight: 140,
  },
  featureIconGrid: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.sm,
    borderWidth: tokens.borderWidth.thin,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing[2],
  },
  featureTitleGrid: {
    fontSize: tokens.typography.body[0] - 1,
    fontWeight: '700',
    color: CAMPUS.text,
    marginBottom: tokens.spacing[1],
  },
  featureDescriptionGrid: { fontSize: tokens.typography.small[0] - 1, color: CAMPUS.textMuted, lineHeight: tokens.typography.small[1], marginBottom: tokens.spacing[2] },
  featureFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  featureCountGrid: {
    fontFamily: tokens.typography.fontFamily.techMono,
    fontSize: tokens.typography.small[0],
    fontWeight: '700',
  },
  securityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: CAMPUS.surface,
    borderWidth: tokens.borderWidth.thin,
    borderColor: CAMPUS.border,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing[3],
    marginTop: tokens.spacing[2],
    gap: tokens.spacing[2],
  },
  securityText: { flex: 1 },
  securityTitle: {
    fontSize: tokens.typography.small[0],
    fontWeight: '700',
    color: CAMPUS.accent,
    marginBottom: tokens.spacing[1],
    fontFamily: tokens.typography.fontFamily.techMono,
    letterSpacing: 1,
  },
  securityDescription: { fontSize: tokens.typography.small[0] - 1, color: CAMPUS.textMuted, lineHeight: tokens.typography.small[1] },
  footer: {
    fontFamily: tokens.typography.fontFamily.techMono,
    textAlign: 'center',
    color: CAMPUS.textFaint,
    fontSize: tokens.typography.overline[0],
    letterSpacing: 1.5,
    marginTop: tokens.spacing[8],
  },
  sectionTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 15,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: CAMPUS.surface,
    borderWidth: 1,
    borderColor: CAMPUS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTopText: { flex: 1 },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: 'rgba(34,211,238,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countCard: {
    backgroundColor: 'rgba(79,124,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(79,124,255,0.4)',
    padding: 18,
    borderRadius: 18,
    marginTop: 18,
    marginBottom: 18,
  },
  countLabel: {
    fontFamily: CAMPUS.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#9DB4FF',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  countValue: { fontSize: 34, fontWeight: '800', color: CAMPUS.text, marginTop: 5 },

  dataCardColumn: {
    backgroundColor: CAMPUS.surface,
    padding: 14,
    borderRadius: 18,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: CAMPUS.border,
    gap: 12,
  },
  dataRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dataIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: 'rgba(34,211,238,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataText: { flex: 1 },
  dataTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: CAMPUS.text,
    marginBottom: 5,
  },
  dataDescription: { fontSize: 12, color: CAMPUS.textMuted, lineHeight: 18 },
  dataMeta: { fontSize: 11, color: CAMPUS.textFaint, lineHeight: 17, marginTop: 4 },
  emptyText: {
    color: CAMPUS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    padding: 28,
  },
  emptyTextSmall: { color: CAMPUS.textMuted, fontSize: 13, paddingVertical: 8 },

  roleRow: { flexDirection: 'row', gap: 8 },
  roleChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CAMPUS.border,
    backgroundColor: CAMPUS.surface,
  },
  roleChipActive: {
    backgroundColor: 'rgba(34,211,238,0.16)',
    borderColor: CAMPUS.accent,
  },
  roleChipText: {
    fontFamily: CAMPUS.mono,
    fontSize: 11,
    fontWeight: '600',
    color: CAMPUS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  roleChipTextActive: { color: CAMPUS.accent },
  disabled: { opacity: 0.4 },

  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(34,211,238,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.3)',
  },
  smallButtonDanger: {
    backgroundColor: CAMPUS.dangerBg,
    borderColor: CAMPUS.dangerBorder,
  },
  smallButtonText: { fontSize: 12, fontWeight: '700', color: CAMPUS.accent },
  dangerText: { color: CAMPUS.danger },

  addWrap: { marginBottom: 14 },

  chipScroll: { marginBottom: 14, flexGrow: 0 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: CAMPUS.surface,
    borderWidth: 1,
    borderColor: CAMPUS.border,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: 'rgba(34,211,238,0.14)',
    borderColor: CAMPUS.accent,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: CAMPUS.textMuted },
  chipTextActive: { color: CAMPUS.accent },

  reportCard: {
    backgroundColor: CAMPUS.surface,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CAMPUS.border,
  },
  reportTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: CAMPUS.text,
    marginBottom: 12,
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  reportLabel: { fontSize: 13, color: CAMPUS.textMuted, flex: 1 },
  reportValue: { fontSize: 17, fontWeight: '800', color: CAMPUS.text },
  reportNote: { fontSize: 12, color: CAMPUS.textMuted, lineHeight: 19 },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: CAMPUS.dangerBg,
    borderWidth: 1,
    borderColor: CAMPUS.dangerBorder,
    marginBottom: 15,
  },
  errorText: { flex: 1, color: CAMPUS.danger, fontSize: 12, lineHeight: 18 },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    marginBottom: 15,
  },
  noticeSuccess: {
    backgroundColor: 'rgba(52,211,153,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.35)',
  },
  noticeSuccessText: {
    flex: 1,
    color: CAMPUS.mint,
    fontSize: 12,
    lineHeight: 18,
  },

  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3,6,14,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(3,6,14,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    backgroundColor: SHEET_BG,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: CAMPUS.border,
    padding: 22,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: CAMPUS.text,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 13,
    color: CAMPUS.textMuted,
    lineHeight: 20,
    marginBottom: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  modalCancel: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: CAMPUS.surface,
    borderWidth: 1,
    borderColor: CAMPUS.border,
  },
  modalCancelText: { fontSize: 13, fontWeight: '700', color: CAMPUS.textMuted },
  modalPrimary: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: CAMPUS.primary,
    alignItems: 'center',
  },
  modalDanger: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#E5484D',
  },
  modalConfirmText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  inputLabel: {
    fontFamily: CAMPUS.mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.3,
    color: CAMPUS.textMuted,
    marginTop: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1.5,
    borderColor: CAMPUS.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: CAMPUS.text,
    backgroundColor: CAMPUS.inputBg,
  },
  inputDisabled: {
    backgroundColor: 'rgba(255,255,255,0.025)',
    color: CAMPUS.textFaint,
  },
  formError: {
    color: CAMPUS.danger,
    fontSize: 12,
    marginTop: 12,
    lineHeight: 18,
  },

  optionList: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: CAMPUS.border,
    borderRadius: 14,
    backgroundColor: CAMPUS.inputBg,
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  optionActive: { backgroundColor: 'rgba(34,211,238,0.14)' },
  optionText: { fontSize: 13, color: CAMPUS.text, fontWeight: '600' },
  optionTextActive: { color: CAMPUS.accent },
  optionSub: { fontSize: 11, color: CAMPUS.textMuted, marginTop: 2 },

  qrBox: { alignItems: 'center', paddingVertical: 14 },
  qrCode: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: CAMPUS.text,
    marginBottom: 14,
  },
});