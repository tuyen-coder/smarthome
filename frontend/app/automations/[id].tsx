import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';

import { AppScreen } from '@/components/common/AppScreen';
import { colors } from '@/src/theme/colors';

import { TimeTemplate } from '@/components/automations/TimeTemplate';
import { SensorTemplate } from '@/components/automations/SensorTemplate';
import { SceneTemplate } from '@/components/automations/SceneTemplate';

// Mock UI for the Template Setup screen
export default function AutomationDetailScreen() {
  const { id, template } = useLocalSearchParams<{ id: string; template?: string }>();
  const automationId = id === 'new' ? undefined : Number(id);
  
  // Decide which template to render
  const renderTemplate = () => {
    if (template === 'sensor') return <SensorTemplate automationId={automationId} />;
    if (template === 'scene') return <SceneTemplate automationId={automationId} />;
    return <TimeTemplate automationId={automationId} />; // Default to time
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons color={colors.text} name="chevron-back" size={26} />
        </Pressable>
        <Text style={styles.headerTitle}>Thiết lập kịch bản</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {renderTemplate()}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginLeft: -8 },
  headerTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  scrollContent: { paddingBottom: 60, paddingTop: 10, paddingHorizontal: 4 },
});
