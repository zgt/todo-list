import { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Pattern, Rect } from "react-native-svg";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/* eslint-disable react-hooks/refs */
// Animated.Value pattern requires ref access during render - this is the standard React Native Animated API usage
export function DotBackground({ trigger }: { trigger?: boolean }) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1, 0],
  });

  useEffect(() => {
    if (trigger === undefined) {
      // Auto-play mode (original behavior)
      animationRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ]),
      );
      animationRef.current.start();
      return;
    }

    if (trigger) {
      animatedValue.setValue(0);
      animationRef.current = Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]);
      animationRef.current.start();
    }
  }, [animatedValue, trigger]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}>
        <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
          <Defs>
            <Pattern
              id="dotPattern"
              x="0"
              y="0"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              {/* Dot with emerald green color */}
              <Circle cx="10" cy="10" r="1.5" fill="#4ade80" opacity="0.4" />
            </Pattern>
          </Defs>
          {/* Apply the pattern to a rectangle covering the screen */}
          <Rect
            x="0"
            y="0"
            width={SCREEN_WIDTH}
            height={SCREEN_HEIGHT}
            fill="url(#dotPattern)"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
