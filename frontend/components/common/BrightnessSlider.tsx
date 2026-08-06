import { useRef } from 'react';
import {
  type GestureResponderEvent,
  type LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';

import { colors } from '@/src/theme/colors';

type Props = {
  value: number;
  onChange: (value: number) => void;
  onComplete: (value: number) => void;
};

function clamp(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function BrightnessSlider({ value, onChange, onComplete }: Props) {
  const width = useRef(1);
  const startValue = useRef(value);
  const latestValue = useRef(value);
  const onChangeRef = useRef(onChange);
  const onCompleteRef = useRef(onComplete);
  const currentValue = clamp(value);

  latestValue.current = currentValue;
  onChangeRef.current = onChange;
  onCompleteRef.current = onComplete;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event: GestureResponderEvent) => {
        const nextValue = clamp((event.nativeEvent.locationX / width.current) * 100);
        startValue.current = nextValue;
        latestValue.current = nextValue;
        onChangeRef.current(nextValue);
      },
      onPanResponderMove: (_, gesture) => {
        const nextValue = clamp(
          startValue.current + (gesture.dx / width.current) * 100,
        );
        latestValue.current = nextValue;
        onChangeRef.current(nextValue);
      },
      onPanResponderRelease: () =>
        onCompleteRef.current(Math.round(latestValue.current)),
      onPanResponderTerminate: () =>
        onCompleteRef.current(Math.round(latestValue.current)),
    }),
  ).current;

  const handleLayout = (event: LayoutChangeEvent) => {
    width.current = Math.max(1, event.nativeEvent.layout.width);
  };

  const adjust = (difference: number) => {
    const nextValue = clamp(currentValue + difference);
    latestValue.current = nextValue;
    onChange(nextValue);
    onComplete(Math.round(nextValue));
  };

  return (
    <View
      accessibilityActions={[
        { name: 'increment', label: 'Tăng độ sáng' },
        { name: 'decrement', label: 'Giảm độ sáng' },
      ]}
      accessibilityLabel="Độ sáng"
      accessibilityRole="adjustable"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(currentValue) }}
      onAccessibilityAction={(event) =>
        adjust(event.nativeEvent.actionName === 'increment' ? 5 : -5)
      }
      onLayout={handleLayout}
      style={styles.track}
      {...panResponder.panHandlers}>
      <View style={styles.rail} />
      <View style={[styles.fill, { width: `${currentValue}%` }]}>
        <View style={styles.thumb} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 24,
    justifyContent: 'center',
    marginTop: 14,
  },
  rail: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  fill: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primaryLight,
  },
  thumb: {
    position: 'absolute',
    right: -10,
    top: -7,
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
});
