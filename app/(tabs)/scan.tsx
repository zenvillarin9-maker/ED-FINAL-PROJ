import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import CampusBackground from '@/components/CampusBackground';
import CampusButton from '@/components/CampusButton';
import { CAMPUS } from '@/constants/colors';
import * as tokens from '@/constants/tokens';
import { useAuth } from '@/lib/auth';

import { registerAttendance } from '@/lib/attendance';
// import { registerAttendance } from '@/lib/database';

export default function ScanScreen() {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [lastData, setLastData] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <CampusBackground />

        <View style={styles.permissionTile}>
          <Ionicons name="camera-outline" size={36} color={CAMPUS.accent} />
        </View>

        <Text style={styles.title}>Camera Permission Needed</Text>
        <Text style={styles.subtitle}>
          We need access to your camera to scan QR codes.
        </Text>

        <View style={styles.permissionButton}>
          <CampusButton
            variant="primary"
            title="Grant Permission"
            icon="camera"
            onPress={requestPermission}
          />
        </View>
      </View>
    );
  }

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    setScanned(true);
    setLastData(data);
    // registerAttendance(data, STUDENT_ID).then((result) => {
      const studentId = user?.id ?? 'unknown';
     registerAttendance(data, studentId).then((result) => {
      setMessage(result.message);
      setSuccess(result.success);
    });
  };

  const handleScanAgain = () => {
    setScanned(false);
    setLastData(null);
    setMessage(null);
  };

  // Look-only: colour of the scan frame and the status icon
  const hasResult = scanned && message !== null;
  const frameColor = hasResult
    ? success
      ? CAMPUS.mint
      : CAMPUS.danger
    : CAMPUS.accent;

  const statusIcon: keyof typeof Ionicons.glyphMap = hasResult
    ? success
      ? 'checkmark-circle'
      : 'alert-circle'
    : scanned
      ? 'scan'
      : 'qr-code-outline';

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      {/* Scanner frame */}
      <View style={styles.frameLayer} pointerEvents="none">
        <View style={styles.topPill}>
          <View style={[styles.pillDot, { backgroundColor: frameColor }]} />
          <Text style={styles.pillText}>
            {scanned ? 'CODE CAPTURED' : 'SCANNING'}
          </Text>
        </View>

        <View style={styles.frame}>
          <View style={[styles.corner, styles.cTL, { borderColor: frameColor }]} />
          <View style={[styles.corner, styles.cTR, { borderColor: frameColor }]} />
          <View style={[styles.corner, styles.cBL, { borderColor: frameColor }]} />
          <View style={[styles.corner, styles.cBR, { borderColor: frameColor }]} />
        </View>
      </View>

      <View style={styles.overlay}>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusTile,
              { borderColor: frameColor, shadowColor: frameColor },
            ]}
          >
            <Ionicons name={statusIcon} size={22} color={frameColor} />
          </View>

          <Text style={styles.overlayText}>
            {scanned ? 'QR Code detected!' : 'Point your camera at a QR code'}
          </Text>
        </View>

        {scanned && message && (
          <View
            style={[
              styles.resultBox,
              success ? styles.resultSuccess : styles.resultError,
            ]}
          >
            <Text
              style={[styles.scanResult, success ? styles.success : styles.error]}
            >
              {message}
            </Text>
          </View>
        )}

        {scanned && lastData && (
          <Text style={styles.scanData} numberOfLines={2}>
            {lastData}
          </Text>
        )}

        {scanned && (
          <View style={styles.againButton}>
            <CampusButton
              variant="primary"
              title="Scan Again"
              icon="refresh"
              onPress={handleScanAgain}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const FRAME = 250;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CAMPUS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing[6],
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },

  /* Permission screen */
  permissionTile: {
    width: 80,
    height: 80,
    borderRadius: tokens.radius.lg + 2,
    backgroundColor: 'rgba(34,211,238,0.1)',
    borderWidth: tokens.borderWidth.thin,
    borderColor: 'rgba(34,211,238,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing[5],
    shadowColor: CAMPUS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 6,
  },
  title: {
    fontSize: tokens.typography.title[0],
    fontWeight: (tokens.typography.title[2] as any),
    color: CAMPUS.text,
    marginBottom: tokens.spacing[1],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: tokens.typography.body[0] - 2,
    color: CAMPUS.textMuted,
    textAlign: 'center',
    lineHeight: tokens.typography.body[1] - 3,
    marginBottom: tokens.spacing[6],
    maxWidth: 340,
  },
  permissionButton: {
    width: '100%',
    maxWidth: 340,
  },

  /* Scanner frame */
  frameLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topPill: {
    position: 'absolute',
    top: tokens.spacing[5],
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[1],
    paddingHorizontal: tokens.spacing[3] + 2,
    paddingVertical: tokens.spacing[1] + 3,
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(10,15,30,0.7)',
    borderWidth: tokens.borderWidth.thin,
    borderColor: CAMPUS.border,
  },
  pillDot: {
    width: tokens.spacing[2] - 1,
    height: tokens.spacing[2] - 1,
    borderRadius: tokens.radius.sm,
  },
  pillText: {
    fontFamily: tokens.typography.fontFamily.techMono,
    fontSize: tokens.typography.overline[0],
    fontWeight: (tokens.typography.overline[2] as any),
    letterSpacing: 1.6,
    color: CAMPUS.text,
  },
  frame: {
    width: FRAME,
    height: FRAME,
    marginBottom: tokens.spacing[10] + tokens.spacing[3],
  },
  corner: {
    position: 'absolute',
    width: 44,
    height: 44,
  },
  cTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: tokens.radius.lg + 6,
  },
  cTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: tokens.radius.lg + 6,
  },
  cBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: tokens.radius.lg + 6,
  },
  cBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: tokens.radius.lg + 6,
  },

  /* Bottom glass panel */
  overlay: {
    position: 'absolute',
    left: tokens.spacing[5],
    right: tokens.spacing[5],
    bottom: tokens.spacing[5] + 5,
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: 'rgba(10,15,30,0.86)',
    borderRadius: tokens.radius.lg + 4,
    borderWidth: tokens.borderWidth.thin,
    borderColor: CAMPUS.border,
    padding: tokens.spacing[4],
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[3],
  },
  statusTile: {
    width: 42,
    height: 42,
    borderRadius: tokens.radius.md + 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  overlayText: {
    flex: 1,
    fontSize: tokens.typography.subtitle[0],
    fontWeight: (tokens.typography.subtitle[2] as any),
    color: CAMPUS.text,
  },
  resultBox: {
    borderRadius: tokens.radius.md + 2,
    borderWidth: tokens.borderWidth.thin,
    paddingHorizontal: tokens.spacing[3] + 2,
    paddingVertical: tokens.spacing[3],
    marginTop: tokens.spacing[3] + 2,
  },
  resultSuccess: {
    backgroundColor: 'rgba(52,211,153,0.12)',
    borderColor: 'rgba(52,211,153,0.4)',
  },
  resultError: {
    backgroundColor: CAMPUS.dangerBg,
    borderColor: CAMPUS.dangerBorder,
  },
  scanResult: {
    fontSize: tokens.typography.caption[0],
    textAlign: 'center',
    fontWeight: (tokens.typography.headline[2] as any),
    lineHeight: tokens.typography.caption[1],
  },
  success: {
    color: CAMPUS.mint,
  },
  error: {
    color: CAMPUS.danger,
  },
  scanData: {
    fontFamily: tokens.typography.fontFamily.techMono,
    fontSize: tokens.typography.overline[0] - 1,
    color: CAMPUS.textFaint,
    textAlign: 'center',
    marginTop: tokens.spacing[3],
  },
  againButton: {
    marginTop: tokens.spacing[3] + 2,
  },
});
