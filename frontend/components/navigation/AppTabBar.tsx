import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/src/theme/colors';

type IconName = ComponentProps<typeof Ionicons>['name'];

const items: Record<string, { label: string; icon: IconName; activeIcon: IconName }> = {
  index: { label: 'Trang chủ', icon: 'home-outline', activeIcon: 'home' },
  devices: { label: 'Thiết bị', icon: 'options-outline', activeIcon: 'options' },
  automations: { label: 'Tự động', icon: 'timer-outline', activeIcon: 'timer' },
  alerts: { label: 'Thống kê', icon: 'bar-chart-outline', activeIcon: 'bar-chart' },
  settings: { label: 'Cài đặt', icon: 'settings-outline', activeIcon: 'settings' },
};

export function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        const item = items[route.name];
        if (!item) return null;
        const focused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            key={route.key}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            onPress={onPress}
            style={[styles.item, route.name === 'automations' && styles.centerItem]}>
            <View
              style={[
                styles.icon,
                route.name === 'automations' && styles.centerIcon,
                focused && route.name !== 'automations' && styles.activeIcon,
              ]}>
              <Ionicons
                color={
                  route.name === 'automations'
                    ? colors.surface
                    : focused
                      ? colors.primary
                      : colors.textMuted
                }
                name={focused ? item.activeIcon : item.icon}
                size={route.name === 'automations' ? 23 : 20}
              />
            </View>
            <Text style={[styles.label, focused && styles.activeLabel]} numberOfLines={1}>
              {descriptors[route.key].options.tabBarLabel?.toString() ?? item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  item: { flex: 1, alignItems: 'center', gap: 3 },
  centerItem: { marginTop: -30 },
  icon: {
    minWidth: 32,
    height: 28,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  activeIcon: { backgroundColor: colors.primarySoft },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '600' },
  activeLabel: { color: colors.primary },
});
