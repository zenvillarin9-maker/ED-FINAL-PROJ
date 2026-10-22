import { router } from 'expo-router';
import { StyleSheet, Text, View, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import CampusBackground from '@/components/CampusBackground';
import CampusButton from '@/components/CampusButton';
import { CAMPUS } from '@/constants/colors';
import * as tokens from '@/constants/tokens';
import { useAuth } from '@/lib/auth';
import { createAnnouncement } from '@/lib/announcements';
import { getTeacherClasses, type Class } from '@/lib/classes';

export default function CreateAnnouncementScreen() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'general' | 'schedule_change' | 'room_update' | 'reminder'>('general');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);

  const loadClasses = useCallback(async () => {
    if (!user) return;
    const data = await getTeacherClasses(user.id);
    setClasses(data);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadClasses();
    }, [loadClasses])
  );

  const handleCreate = async () => {
    if (!user) return;
    if (!title.trim() || !message.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    const { data, error } = await createAnnouncement({
      teacher_id: user.id,
      title: title.trim(),
      message: message.trim(),
      type,
      class_id: selectedClass,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error);
      return;
    }

    const typeLabel = types.find(t => t.value === type)?.label || type;
    const classLabel = selectedClass 
      ? classes.find(c => c.id === selectedClass) 
        ? `${classes.find(c => c.id === selectedClass)?.name}${classes.find(c => c.id === selectedClass)?.section ? ` • ${classes.find(c => c.id === selectedClass)?.section}` : ''}`
        : 'Selected Class'
      : 'All Classes';

    Alert.alert(
      'Announcement Created',
      `Title: ${title}\n\nType: ${typeLabel}\n\nTarget: ${classLabel}\n\nMessage:\n${message}`,
      [
        { text: 'View All', onPress: () => router.push('/manage-announcements') },
        { text: 'Create Another', onPress: () => {
          setTitle('');
          setMessage('');
          setType('general');
          setSelectedClass(null);
        }},
      ]
    );
  };

  const types = [
    { value: 'general', label: 'General' },
    { value: 'schedule_change', label: 'Schedule Change' },
    { value: 'room_update', label: 'Room Update' },
    { value: 'reminder', label: 'Reminder' },
  ];

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
            <Text style={styles.eyebrow}>CREATE / ANNOUNCEMENT</Text>
            <Text style={styles.title}>New Announcement</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>TITLE</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter announcement title"
            placeholderTextColor={CAMPUS.textFaint}
          />

          <Text style={styles.label}>TYPE</Text>
          <View style={styles.typeRow}>
            {types.map((t) => (
              <Pressable
                key={t.value}
                style={[styles.typeChip, type === t.value && styles.typeChipActive]}
                onPress={() => setType(t.value as any)}
              >
                <Text style={[styles.typeChipText, type === t.value && styles.typeChipTextActive]}>
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>TARGET CLASS</Text>
          <Pressable
            style={[styles.selectButton, selectedClass === null && styles.selectButtonActive]}
            onPress={() => setSelectedClass(null)}
          >
            <Text style={[styles.selectButtonText, selectedClass === null && styles.selectButtonTextActive]}>
              All Classes
            </Text>
          </Pressable>
          {classes.map((cls) => (
            <Pressable
              key={cls.id}
              style={[styles.selectButton, selectedClass === cls.id && styles.selectButtonActive]}
              onPress={() => setSelectedClass(cls.id)}
            >
              <Text style={[styles.selectButtonText, selectedClass === cls.id && styles.selectButtonTextActive]}>
                {cls.name} {cls.section ? `• ${cls.section}` : ''}
              </Text>
            </Pressable>
          ))}

          <Text style={styles.label}>MESSAGE</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={message}
            onChangeText={setMessage}
            placeholder="Enter announcement message"
            placeholderTextColor={CAMPUS.textFaint}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        <CampusButton
          variant="primary"
          title={loading ? "Creating..." : "Create Announcement"}
          icon="send-outline"
          onPress={handleCreate}
          disabled={loading}
        />
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
    marginBottom: tokens.spacing[4],
  },
  label: {
    fontFamily: tokens.typography.fontFamily.techMono,
    fontSize: tokens.typography.overline[0],
    fontWeight: '700',
    letterSpacing: 1.5,
    color: CAMPUS.textMuted,
    marginBottom: tokens.spacing[2],
    marginTop: tokens.spacing[4],
  },
  input: {
    backgroundColor: CAMPUS.inputBg,
    borderRadius: tokens.radius.sm,
    borderWidth: tokens.borderWidth.thin,
    borderColor: CAMPUS.border,
    paddingHorizontal: tokens.spacing[3],
    paddingVertical: tokens.spacing[3],
    fontSize: tokens.typography.body[0] - 1,
    color: CAMPUS.text,
  },
  textArea: {
    height: 120,
    paddingTop: tokens.spacing[3],
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing[2],
  },
  typeChip: {
    paddingHorizontal: tokens.spacing[3],
    paddingVertical: tokens.spacing[2],
    borderRadius: tokens.radius.sm,
    backgroundColor: CAMPUS.inputBg,
    borderWidth: tokens.borderWidth.thin,
    borderColor: CAMPUS.border,
  },
  typeChipActive: {
    backgroundColor: 'rgba(102,139,255,0.15)',
    borderColor: CAMPUS.accent,
  },
  typeChipText: {
    fontSize: tokens.typography.small[0],
    color: CAMPUS.textMuted,
  },
  typeChipTextActive: {
    color: CAMPUS.accent,
    fontWeight: '600',
  },
  selectButton: {
    paddingHorizontal: tokens.spacing[3],
    paddingVertical: tokens.spacing[3],
    borderRadius: tokens.radius.sm,
    backgroundColor: CAMPUS.inputBg,
    borderWidth: tokens.borderWidth.thin,
    borderColor: CAMPUS.border,
    marginBottom: tokens.spacing[2],
  },
  selectButtonActive: {
    backgroundColor: 'rgba(102,139,255,0.15)',
    borderColor: CAMPUS.accent,
  },
  selectButtonText: {
    fontSize: tokens.typography.body[0] - 1,
    color: CAMPUS.textMuted,
  },
  selectButtonTextActive: {
    color: CAMPUS.accent,
    fontWeight: '600',
  },
});
