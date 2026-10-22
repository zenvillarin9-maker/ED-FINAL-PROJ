import { router } from 'expo-router';
import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import CampusBackground from '@/components/CampusBackground';
import { CAMPUS } from '@/constants/colors';
import * as tokens from '@/constants/tokens';
import { useAuth } from '@/lib/auth';
import { getAllAttendanceForHeatmap } from '@/lib/attendance_heatmap';
import { getAllClasses } from '@/lib/classes';

export default function HeatmapScreen() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [attData, classData] = await Promise.all([
      getAllAttendanceForHeatmap(),
      getAllClasses(),
    ]);
    setAttendance(attData);
    setClasses(classData);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Group by date
  const getDateGroups = () => {
    const groups: Record<string, number> = {};
    attendance.forEach((a) => {
      const date = new Date(a.scanned_at).toISOString().split('T')[0];
      groups[date] = (groups[date] || 0) + 1;
    });
    return groups;
  };

  const dateGroups = getDateGroups();
  const dates = Object.keys(dateGroups).sort().reverse().slice(0, 30);
  const maxCount = Math.max(...Object.values(dateGroups), 1);

  const getColor = (count: number) => {
    const intensity = count / maxCount;
    if (intensity > 0.8) return CAMPUS.success;
    if (intensity > 0.6) return '#52F0B080';
    if (intensity > 0.4) return CAMPUS.accent;
    if (intensity > 0.2) return '#42E8FF60';
    return '#42E8FF30';
  };

  const getSelectedDateData = () => {
    if (!selectedDate) return [];
    return attendance.filter((a) => {
      const date = new Date(a.scanned_at).toISOString().split('T')[0];
      return date === selectedDate;
    });
  };

  return (
    <View style={styles.container}>
      <CampusBackground />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={CAMPUS.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>ANALYTICS / HEATMAP</Text>
            <Text style={styles.title}>Attendance Heatmap</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading...</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>OVERVIEW</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{attendance.length}</Text>
                  <Text style={styles.statLabel}>Total Check-ins</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{dates.length}</Text>
                  <Text style={styles.statLabel}>Active Days</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{classes.length}</Text>
                  <Text style={styles.statLabel}>Classes</Text>
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>DAILY ACTIVITY (LAST 30 DAYS)</Text>
            <View style={styles.heatmapGrid}>
              {dates.map((date) => {
                const count = dateGroups[date];
                const color = getColor(count);
                return (
                  <Pressable
                    key={date}
                    style={[styles.heatmapCell, { backgroundColor: color }]}
                    onPress={() => setSelectedDate(date === selectedDate ? null : date)}
                  >
                    <Text style={styles.heatmapCount}>{count}</Text>
                    <Text style={styles.heatmapDate}>{new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.legend}>
              <Text style={styles.legendText}>Less</Text>
              <View style={[styles.legendBox, { backgroundColor: '#42E8FF30' }]} />
              <View style={[styles.legendBox, { backgroundColor: '#42E8FF60' }]} />
              <View style={[styles.legendBox, { backgroundColor: CAMPUS.accent }]} />
              <View style={[styles.legendBox, { backgroundColor: '#52F0B080' }]} />
              <View style={[styles.legendBox, { backgroundColor: CAMPUS.success }]} />
              <Text style={styles.legendText}>More</Text>
            </View>

            {selectedDate && (
              <View style={styles.detailsCard}>
                <Text style={styles.detailsTitle}>
                  {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
                <Text style={styles.detailsSubtitle}>
                  {getSelectedDateData().length} attendance records
                </Text>
                {getSelectedDateData().slice(0, 10).map((record, idx) => (
                  <View key={idx} style={styles.detailRow}>
                    <Ionicons name="checkmark-circle" size={16} color={CAMPUS.mint} />
                    <Text style={styles.detailText}>
                      {record.events?.title || 'Unknown Event'}
                    </Text>
                    <Text style={styles.detailTime}>
                      {new Date(record.scanned_at).toLocaleTimeString()}
                    </Text>
                  </View>
                ))}
                {getSelectedDateData().length > 10 && (
                  <Text style={styles.moreText}>+ {getSelectedDateData().length - 10} more records</Text>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CAMPUS.bg },
  scroll: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    paddingHorizontal: tokens.spacing[6],
    paddingTop: tokens.spacing[5],
    paddingBottom: tokens.spacing[10],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[3],
    marginBottom: tokens.spacing[6],
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: tokens.radius.sm,
    backgroundColor: CAMPUS.surface,
    borderWidth: tokens.borderWidth.thin,
    borderColor: CAMPUS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  eyebrow: {
    fontFamily: tokens.typography.fontFamily.techMono,
    fontSize: tokens.typography.overline[0],
    fontWeight: '700',
    letterSpacing: 2,
    color: CAMPUS.accent,
    marginBottom: tokens.spacing[1] + 2,
  },
  title: {
    fontSize: tokens.typography.headline[0] + 2,
    fontWeight: (tokens.typography.headline[2] as any),
    color: CAMPUS.text,
    letterSpacing: -0.3,
  },
  statsCard: {
    backgroundColor: CAMPUS.surface,
    borderRadius: tokens.radius.md,
    borderWidth: tokens.borderWidth.thin,
    borderColor: CAMPUS.border,
    padding: tokens.spacing[4],
    marginBottom: tokens.spacing[6],
  },
  statsTitle: {
    fontFamily: tokens.typography.fontFamily.techMono,
    fontSize: tokens.typography.overline[0],
    fontWeight: '700',
    letterSpacing: 2,
    color: CAMPUS.accent,
    marginBottom: tokens.spacing[3],
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: tokens.typography.display2[0],
    fontWeight: (tokens.typography.display2[2] as any),
    color: CAMPUS.text,
  },
  statLabel: {
    fontSize: tokens.typography.small[0],
    color: CAMPUS.textMuted,
    marginTop: tokens.spacing[1],
  },
  sectionTitle: {
    fontFamily: tokens.typography.fontFamily.techMono,
    fontSize: tokens.typography.overline[0],
    fontWeight: '700',
    letterSpacing: 2,
    color: CAMPUS.accent,
    marginBottom: tokens.spacing[4],
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing[2],
    marginBottom: tokens.spacing[4],
  },
  heatmapCell: {
    width: 70,
    height: 70,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: tokens.borderWidth.thin,
    borderColor: CAMPUS.border,
  },
  heatmapCount: {
    fontSize: tokens.typography.subtitle[0],
    fontWeight: '700',
    color: CAMPUS.text,
  },
  heatmapDate: {
    fontSize: tokens.typography.overline[0] - 2,
    color: CAMPUS.text,
    marginTop: tokens.spacing[0],
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[1],
    justifyContent: 'center',
    marginBottom: tokens.spacing[6],
  },
  legendText: {
    fontSize: tokens.typography.small[0],
    color: CAMPUS.textMuted,
    marginHorizontal: tokens.spacing[2],
  },
  legendBox: {
    width: 20,
    height: 20,
    borderRadius: tokens.radius.xs,
    borderWidth: tokens.borderWidth.thin,
    borderColor: CAMPUS.border,
  },
  detailsCard: {
    backgroundColor: CAMPUS.surface,
    borderRadius: tokens.radius.md,
    borderWidth: tokens.borderWidth.thin,
    borderColor: CAMPUS.border,
    padding: tokens.spacing[4],
  },
  detailsTitle: {
    fontSize: tokens.typography.subtitle[0],
    fontWeight: '700',
    color: CAMPUS.text,
    marginBottom: tokens.spacing[1],
  },
  detailsSubtitle: {
    fontSize: tokens.typography.small[0],
    color: CAMPUS.textMuted,
    marginBottom: tokens.spacing[4],
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[2],
    paddingVertical: tokens.spacing[2],
    borderBottomWidth: tokens.borderWidth.thin,
    borderBottomColor: CAMPUS.border,
  },
  detailText: {
    flex: 1,
    fontSize: tokens.typography.body[0] - 1,
    color: CAMPUS.text,
  },
  detailTime: {
    fontSize: tokens.typography.small[0],
    color: CAMPUS.textMuted,
    fontFamily: tokens.typography.fontFamily.techMono,
  },
  moreText: {
    fontSize: tokens.typography.small[0],
    color: CAMPUS.accent,
    marginTop: tokens.spacing[3],
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing[16],
  },
  emptyText: {
    fontSize: tokens.typography.body[0] - 1,
    color: CAMPUS.textMuted,
  },
});
