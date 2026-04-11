import { useEffect } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Canvas, Fill, Shader, Skia } from "@shopify/react-native-skia";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CONTINUOUS_RIPPLE_CYCLE_MS = 3000;
const CONTINUOUS_RIPPLE_MAX_TIME = 10;
const CONTINUOUS_RIPPLE_EPOCH = Date.now();

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- static shader source is always valid
const source = Skia.RuntimeEffect.Make(`
  uniform float2 resolution;
  uniform float rippleTime;
  uniform float2 rippleCenter;
  uniform float rippleIntensity;
  uniform float gridSize;
  uniform float dotOpacity;

  float sdfCircle(float2 p, float r) {
    return length(p - 0.5) - r;
  }

  half4 main(float2 fragCoord) {
    float2 uv = fragCoord / resolution;
    float aspect = resolution.x / resolution.y;

    // Dot grid
    float2 gridUv = fract(uv * float2(gridSize * aspect, gridSize));
    float dot = smoothstep(0.02, 0.0, sdfCircle(gridUv, 0.07));

    // Ripple
    float ripple = 0.0;
    if (rippleIntensity > 0.0) {
      float dist = distance(uv * float2(aspect, 1.0), rippleCenter * float2(aspect, 1.0));
      float speed = 2.0;
      float frequency = 20.0;
      float baseWave = sin(dist * frequency - rippleTime * speed);
      float sharpWave = pow(baseWave * 0.5 + 0.5, 10.0);
      float decay = exp(-dist * 1.0);
      float wavefront = rippleTime * 0.15;
      float waveMask = 1.0 - smoothstep(wavefront - 0.1, wavefront, dist);
      ripple = sharpWave * decay * rippleIntensity * waveMask;
    }

    // Emerald green background with dark dots
    float dotMask = dot * dotOpacity * (1.0 + ripple * 20.0);
    // Background: #4ade80, Dots: #09090B
    half3 bg = half3(0.063, 0.165, 0.165);
    half3 dotColor = half3(0.094, 0.25, 0.19);
    half3 color = mix(bg, dotColor, half(dotMask));
    return half4(color, 1.0);
  }
`)!;

interface DotBackgroundProps {
  trigger?: number;
  loopWhileVisible?: boolean;
  pulseIntervalMs?: number;
  continuousWhileVisible?: boolean;
}

function startRipple(
  rippleTime: { value: number },
  rippleIntensity: { value: number },
): void {
  rippleTime.value = 0;
  rippleIntensity.value = 1;
  rippleTime.value = withTiming(10, {
    duration: 5000,
    easing: Easing.linear,
  });
  rippleIntensity.value = withTiming(0, {
    duration: 6000,
    easing: Easing.out(Easing.quad),
  });
}

export function DotBackground({
  trigger,
  loopWhileVisible = false,
  pulseIntervalMs = 4200,
  continuousWhileVisible = false,
}: DotBackgroundProps) {
  const rippleTime = useSharedValue(0);
  const rippleIntensity = useSharedValue(0);

  useEffect(() => {
    if (continuousWhileVisible) {
      return;
    }
    if (trigger === undefined) return;
    if (rippleIntensity.value > 0.1) return;

    startRipple(rippleTime, rippleIntensity);
  }, [continuousWhileVisible, trigger, rippleTime, rippleIntensity]);

  useEffect(() => {
    if (continuousWhileVisible) {
      return;
    }
    if (!loopWhileVisible) {
      return;
    }

    startRipple(rippleTime, rippleIntensity);

    const interval = setInterval(() => {
      startRipple(rippleTime, rippleIntensity);
    }, pulseIntervalMs);

    return () => {
      clearInterval(interval);
    };
  }, [
    continuousWhileVisible,
    loopWhileVisible,
    pulseIntervalMs,
    rippleTime,
    rippleIntensity,
  ]);

  useEffect(() => {
    if (!continuousWhileVisible) {
      return;
    }

    rippleIntensity.value = 0.9;
    const elapsedMs =
      (Date.now() - CONTINUOUS_RIPPLE_EPOCH) % CONTINUOUS_RIPPLE_CYCLE_MS;
    const initialTime =
      (elapsedMs / CONTINUOUS_RIPPLE_CYCLE_MS) * CONTINUOUS_RIPPLE_MAX_TIME;
    const remainingDuration =
      ((CONTINUOUS_RIPPLE_MAX_TIME - initialTime) /
        CONTINUOUS_RIPPLE_MAX_TIME) *
      CONTINUOUS_RIPPLE_CYCLE_MS;

    rippleTime.value = initialTime;
    rippleTime.value = withRepeat(
      withTiming(CONTINUOUS_RIPPLE_MAX_TIME, {
        duration: Math.max(1, Math.round(remainingDuration)),
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(rippleTime);
      cancelAnimation(rippleIntensity);
      rippleTime.value = 0;
      rippleIntensity.value = 0;
    };
  }, [continuousWhileVisible, rippleIntensity, rippleTime]);

  const uniforms = useDerivedValue(() => ({
    resolution: [SCREEN_WIDTH, SCREEN_HEIGHT] as const,
    rippleTime: rippleTime.value,
    rippleCenter: [0.5, 0.5] as const,
    rippleIntensity: rippleIntensity.value,
    gridSize: 50,
    dotOpacity: 4,
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Canvas style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}>
        <Fill>
          <Shader source={source} uniforms={uniforms} />
        </Fill>
      </Canvas>
    </View>
  );
}
