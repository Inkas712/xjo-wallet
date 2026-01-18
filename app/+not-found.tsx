import { Link, Stack } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <AlertCircle size={48} color={Colors.light.textMuted} />
        </View>
        <Text style={styles.title}>Page Not Found</Text>
        <Text style={styles.description}>
          The page you are looking for does not exist.
        </Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to Home</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Colors.light.background,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.light.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.light.primaryDark,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  link: {
    backgroundColor: Colors.light.primaryDark,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.white,
  },
});
