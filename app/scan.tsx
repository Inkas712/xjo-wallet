import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { X, Zap, ZapOff, SwitchCamera } from 'lucide-react-native';
import Colors from '@/constants/colors';

const { width } = Dimensions.get('window');
const SCAN_AREA_SIZE = width * 0.7;

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);
  const [facing, setFacing] = useState<'front' | 'back'>('back');

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    if (scanned) return;
    
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    console.log('Scanned QR Code:', result.data);
    
    Alert.alert(
      'QR Code Scanned',
      `Data: ${result.data}`,
      [
        {
          text: 'Scan Again',
          onPress: () => setScanned(false),
        },
        {
          text: 'Done',
          onPress: () => router.back(),
          style: 'default',
        },
      ]
    );
  };

  const toggleTorch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTorch(!torch);
  };

  const toggleCamera = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFacing(facing === 'back' ? 'front' : 'back');
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading camera...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.permissionContainer}>
          <View style={styles.permissionContent}>
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionText}>
              We need access to your camera to scan QR codes.
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
              <Text style={styles.cancelButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.webContainer}>
          <View style={styles.webContent}>
            <Text style={styles.webTitle}>QR Scanner</Text>
            <Text style={styles.webText}>
              QR scanning works best on mobile devices. Please use the mobile app to scan QR codes.
            </Text>
            <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
              <Text style={styles.cancelButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing={facing}
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'aztec', 'ean13', 'ean8', 'pdf417', 'upc_e', 'datamatrix', 'code39', 'code93', 'itf14', 'codabar', 'code128', 'upc_a'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      
      <View style={styles.overlay}>
        <SafeAreaView style={styles.topBar}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Scan QR Code</Text>
          <View style={styles.placeholder} />
        </SafeAreaView>

        <View style={styles.scanAreaContainer}>
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>

        <View style={styles.instructionContainer}>
          <Text style={styles.instruction}>
            Position the QR code within the frame
          </Text>
        </View>

        <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
          <View style={styles.controls}>
            <TouchableOpacity style={styles.controlButton} onPress={toggleTorch}>
              {torch ? (
                <Zap size={24} color="#FFD700" />
              ) : (
                <ZapOff size={24} color="#FFFFFF" />
              )}
              <Text style={styles.controlLabel}>{torch ? 'Light On' : 'Light Off'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.controlButton} onPress={toggleCamera}>
              <SwitchCamera size={24} color="#FFFFFF" />
              <Text style={styles.controlLabel}>Flip</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  permissionContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.light.primaryDark,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    marginBottom: 16,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
  },
  webContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  webContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  webTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.light.primaryDark,
    marginBottom: 16,
  },
  webText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  placeholder: {
    width: 44,
  },
  scanAreaContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: Colors.light.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  instructionContainer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  instruction: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  bottomBar: {
    paddingBottom: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 60,
  },
  controlButton: {
    alignItems: 'center',
    gap: 8,
  },
  controlLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
});
