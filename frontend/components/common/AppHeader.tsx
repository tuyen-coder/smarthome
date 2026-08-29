import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme/colors';

type Props = {
  title?: string;
  subtitle?: string;
};

export function AppHeader({ title = 'Home Smart', subtitle }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <Ionicons color={colors.primary} name="settings-outline" size={24} />
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.avatar}>
        <Ionicons color={colors.primary} name="person" size={18} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { color: colors.primary, fontSize: 22, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
