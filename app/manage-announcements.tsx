import { router } from 'expo-router';
import { StyleSheet, Text, View, ScrollView, Pressable, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import CampusBackground from '@/components/CampusBackground';
import CampusButton from '@/components/CampusButton';
import { CAMPUS } from '@/constants/colors';
import * as tokens from '@/constants/tokens';
import { useAuth } from '@/lib/auth';
import { getTeacherAnnouncements, deleteAnnouncement, type Announcement } from '@/lib/announcements';
import { getTeacherClasses, type Class } from '@/lib/classes';

export default function ManageAnnouncementsScreen() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [annData, classData] = await Promise.all([
      getTeacherAnnouncements(user.id),
      getTeacherClasses(user.id),
    ]);
    setAnnouncements(annData);
    setClasses(classData);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Announcement',
      'Are you sure you want to delete this announcement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteAnnouncement(id);
            if (result.error) {
              Alert.alert('Error', result.error);
            } else {
              loadData();
            }
          },
        },
      ]
    );
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'schedule_change': return 'Schedule Change';
      case 'room_update': return 'Room Update';
      case 'reminder': return 'Reminder';
      default: return 'General';
    }
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
            <Text style={styles.eyebrow}>MANAGE / ANNOUNCEMENTS</Text>
            <Text style={styles.title}>Class Announcements</Text>
          </View>
        </View>

        <CampusButton
          variant="primary"
          title="Create Announcement"
          icon="add-circle-outline"
          onPress={() => router.push('/create-announcement')}
        />

        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading...</Text>
          </View>
        ) : announcements.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="megaphone-outline" size={48} color={CAMPUS.textFaint} />
            <Text style={styles.emptyTitle}>No Announcements</Text>
            <Text style={styles.emptyText}>Create your first announcement to notify students.</Text>
          </View>
        ) : (
          <View style={{ marginTop: tokens.spacing[4] }}>
            {announcements.map((announcement) => (
              <View key={announcement.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.cardTitle}>{announcement.title}</Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaText}>{getTypeLabel(announcement.type)}</Text>
                      {announcement.class && (
                        <>
                          <Text style={styles.metaText}>•</Text>
                          <Text style={styles.metaText}>
                            {announcement.class.name}
                            {announcement.class.section ? ` ${announcement.class.section}` : ''}
                          </Text>
                        </>
                      )}
                      {!announcement.class_id && (
                        <>
                          <Text style={styles.metaText}>•</Text>
                          <Text style={styles.metaText}>All Classes</Text>
                        </>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(announcement.id)}>
                    <Ionicons name="trash-outline" size={20} color={CAMPUS.danger} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardMessage}>{announcement.message}</Text>
                <Text style={styles.cardTime}>
                  {new Date(announcement.created_at).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
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
    maxWidth: 700,
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
  card: {
    backgroundColor: CAMPUS.surface,
    borderRadius: tokens.radius.md,
    borderWidth: tokens.borderWidth.thin,
    borderColor: CAMPUS.border,
    padding: tokens.spacing[4],
    marginBottom: tokens.spacing[3],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: tokens.spacing[2],
    marginBottom: tokens.spacing[3],
  },
  cardHeaderText: { flex: 1 },
  cardTitle: {
    fontSize: tokens.typography.subtitle[0],
    fontWeight: '700',
    color: CAMPUS.text,
    marginBottom: tokens.spacing[2],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: tokens.spacing[1] + 2,
  },
  metaText: {
    fontSize: tokens.typography.small[0],
    color: CAMPUS.textMuted,
    fontFamily: tokens.typography.fontFamily.techMono,
  },
  cardMessage: {
    fontSize: tokens.typography.body[0] - 1,
    color: CAMPUS.text,
    lineHeight: tokens.typography.body[1] - 2,
    marginBottom: tokens.spacing[3],
  },
  cardTime: {
    fontSize: tokens.typography.small[0],
    color: CAMPUS.textFaint,
    fontFamily: tokens.typography.fontFamily.techMono,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing[16],
    gap: tokens.spacing[3],
    marginTop: tokens.spacing[4],
  },
  emptyTitle: {
    fontSize: tokens.typography.title[0],
    fontWeight: (tokens.typography.title[2] as any),
    color: CAMPUS.text,
  },
  emptyText: {
    fontSize: tokens.typography.body[0] - 1,
    color: CAMPUS.textMuted,
    textAlign: 'center',
  },
});
