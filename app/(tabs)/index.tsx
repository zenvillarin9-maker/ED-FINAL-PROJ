import { router } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import CampusBackground from '@/components/CampusBackground';
import CampusButton from '@/components/CampusButton';
import ScanLogo from '@/components/ScanLogo';
import { CAMPUS } from '@/constants/colors';
import * as tokens from '@/constants/tokens';

export default function Index() {
  return (
    <SafeAreaView style={styles.container}>
      <CampusBackground />

      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <ScanLogo />

          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>SYSTEM_READY</Text>
          </View>

          <Text style={styles.appName}>QR / ATTENDANCE</Text>
          <Text style={styles.credit}>[ VILLARIN F. ]</Text>
        </View>

        <View style={styles.bodyContainer}>
          <Text style={styles.eyebrow}>DASHBOARD</Text>
          <Text style={styles.mainTitle}>Event Attendance Control</Text>
          <Text style={styles.subtitle}>
            Scan, track, and manage attendance records with precision.
          </Text>
        </View>

        <View style={styles.footerContainer}>
          <CampusButton
            variant="primary"
            title="Scan QR Code"
            icon="scan-outline"
            onPress={() => router.push('/scan')}
          />
          <CampusButton
            title="Attendance History"
            icon="document-text-outline"
            onPress={() => router.push('/history')}
          />
          <CampusButton
            title="User Profile"
            icon="person-circle-outline"
            onPress={() => router.push('/profile')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CAMPUS.bg,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: tokens.spacing[6],
    paddingBottom: tokens.spacing[6],
  },
  headerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: tokens.spacing[2],
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[1] + 2,
    paddingHorizontal: tokens.spacing[3],
    paddingVertical: tokens.spacing[1] + 2,
    borderRadius: tokens.radius.sm,
    backgroundColor: CAMPUS.surface,
    borderWidth: tokens.borderWidth.thin,
    borderColor: CAMPUS.border,
    marginTop: tokens.spacing[5],
    marginBottom: tokens.spacing[2],
  },
  statusDot: {
    width: tokens.spacing[1] + 2,
    height: tokens.spacing[1] + 2,
    borderRadius: tokens.radius.sm,
    backgroundColor: CAMPUS.mint,
  },
  statusText: {
    fontFamily: tokens.typography.fontFamily.techMono,
    fontSize: tokens.typography.overline[0] - 1,
    letterSpacing: 2,
    color: CAMPUS.mint,
    fontWeight: '700',
  },
  appName: {
    fontSize: tokens.typography.display1[0],
    fontWeight: (tokens.typography.display1[2] as any),
    color: CAMPUS.text,
    letterSpacing: -1,
    textAlign: 'center',
  },
  credit: {
    fontFamily: tokens.typography.fontFamily.techMono,
    fontSize: tokens.typography.overline[0],
    letterSpacing: 2,
    color: CAMPUS.textFaint,
    marginTop: tokens.spacing[1],
    textAlign: 'center',
  },
  bodyContainer: {
    backgroundColor: CAMPUS.surface,
    borderWidth: tokens.borderWidth.thin,
    borderColor: CAMPUS.border,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing[5],
    marginBottom: tokens.spacing[6],
  },
  eyebrow: {
    fontFamily: tokens.typography.fontFamily.techMono,
    fontSize: tokens.typography.overline[0],
    fontWeight: '700',
    color: CAMPUS.accent,
    letterSpacing: 2,
    marginBottom: tokens.spacing[2],
  },
  mainTitle: {
    fontSize: tokens.typography.title[0],
    fontWeight: (tokens.typography.title[2] as any),
    color: CAMPUS.text,
    marginBottom: tokens.spacing[2],
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: tokens.typography.body[0] - 1,
    color: CAMPUS.textMuted,
    lineHeight: tokens.typography.body[1] - 2,
  },
  footerContainer: {
    gap: tokens.spacing[2],
    width: '100%',
  },
});
