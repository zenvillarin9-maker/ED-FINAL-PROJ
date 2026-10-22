import { router } from 'expo-router';
import { StyleSheet, Text, View, ScrollView, Pressable, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import CampusBackground from '@/components/CampusBackground';
import { CAMPUS } from '@/constants/colors';
import * as tokens from '@/constants/tokens';
import { useAuth } from '@/lib/auth';
import { getStudentAnnouncements, markAnnouncementAsRead, deleteAnnouncement, type AnnouncementWithReadStatus } from '@/lib/announcements';

export default function AnnouncementsScreen() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementWithReadStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAnnouncements = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await getStudentAnnouncements(user.id);
    setAnnouncements(data);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadAnnouncements();
    }, [loadAnnouncements])
  );

  const handleRead = async (announcementId: string) => {
    if (!user) return;
    await markAnnouncementAsRead(user.id, announcementId);
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === announcementId ? { ...a, read: true } : a))
    );
  };

  const handleDelete = (announcementId: string) => {
    Alert.alert(
      'Delete Announcement',
      'Remove this announcement from your view?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteAnnouncement(announcementId);
            loadAnnouncements();
          },
        },
      ]
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'schedule_change': return 'calendar-outline';
      case 'room_update': return 'location-outline';
      case 'reminder': return 'alarm-outline';
      default: return 'megaphone-outline';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'schedule_change': return '#FFD166';
      case 'room_update': return '#75B8FF';
      case 'reminder': return CAMPUS.mint;
      default: return CAMPUS.accent;
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
            <Text style={styles.eyebrow}>NOTIFICATIONS / ANNOUNCEMENTS</Text>
            <Text style={styles.title}>Class Announcements</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading...</Text>
          </View>
        ) : announcements.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="megaphone-outline" size={48} color={CAMPUS.textFaint} />
            <Text style={styles.emptyTitle}>No Announcements</Text>
            <Text style={styles.emptyText}>You have no announcements at this time.</Text>
          </View>
        ) : (
          announcements.map((announcement) => (
            <View key={announcement.id} style={[styles.card, !announcement.read && styles.unreadCard]}>
              <Pressable onPress={() => handleRead(announcement.id)}>
                <View style={styles.cardHeader}>
                  <View style={[styles.iconBox, { backgroundColor: `${getTypeColor(announcement.type)}20`, borderColor: `${getTypeColor(announcement.type)}40` }]}>
                    <Ionicons name={getTypeIcon(announcement.type) as any} size={20} color={getTypeColor(announcement.type)} />
                  </View>
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.cardTitle}>{announcement.title}</Text>
                    {announcement.class && (
                      <Text style={styles.classText}>
                        {announcement.class.name}
                        {announcement.class.section ? ` • ${announcement.class.section}` : ''}
                      </Text>
                    )}
                  </View>
                  {!announcement.read && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.cardMessage}>{announcement.message}</Text>
                <Text style={styles.cardTime}>
                  {new Date(announcement.created_at).toLocaleString()}
                </Text>
              </Pressable>
              <TouchableOpacity 
                style={styles.deleteBtn} 
                onPress={() => handleDelete(announcement.id)}
              >
                <Ionicons name="trash-outline" size={18} color={CAMPUS.danger} />
                <Text style={styles.deleteBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))
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
  unreadCard: {
    borderColor: CAMPUS.accent,
    backgroundColor: 'rgba(102,139,255,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing[3],
    marginBottom: tokens.spacing[3],
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.sm,
    borderWidth: tokens.borderWidth.thin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: { flex: 1 },
  cardTitle: {
    fontSize: tokens.typography.subtitle[0],
    fontWeight: '700',
    color: CAMPUS.text,
    marginBottom: tokens.spacing[1],
  },
  classText: {
    fontSize: tokens.typography.small[0],
    color: CAMPUS.textMuted,
    fontFamily: tokens.typography.fontFamily.techMono,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: CAMPUS.accent,
    marginTop: tokens.spacing[1],
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
    marginBottom: tokens.spacing[3],
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[1] + 2,
    alignSelf: 'flex-start',
    paddingHorizontal: tokens.spacing[3],
    paddingVertical: tokens.spacing[2],
    borderRadius: tokens.radius.sm,
    backgroundColor: CAMPUS.dangerBg,
    borderWidth: tokens.borderWidth.thin,
    borderColor: 'rgba(255,127,139,0.4)',
  },
  deleteBtnText: {
    fontSize: tokens.typography.small[0],
    color: CAMPUS.danger,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing[16],
    gap: tokens.spacing[3],
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
