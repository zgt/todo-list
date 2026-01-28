import { useEffect } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Canvas, Fill, Shader, Skia } from "@shopify/react-native-skia";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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

    // Dot grid
    float2 gridUv = fract(uv * gridSize);
    float dot = smoothstep(0.05, 0.0, sdfCircle(gridUv, 0.2));

    // Vertical fade mask (stronger at top)
    float mask = smoothstep(0.0, 1.0, 1.0 - uv.y);

    // Ripple
    float ripple = 0.0;
    if (rippleIntensity > 0.0) {
      float dist = distance(uv, rippleCenter);
      float speed = 2.0;
      float frequency = 20.0;
      float baseWave = sin(dist * frequency - rippleTime * speed);
      float sharpWave = pow(baseWave * 0.5 + 0.5, 10.0);
      float decay = exp(-dist * 2.0);
      float wavefront = rippleTime * 0.15;
      float waveMask = 1.0 - smoothstep(wavefront - 0.1, wavefront, dist);
      ripple = sharpWave * decay * rippleIntensity * waveMask;
    }

    float alpha = dot * mask * dotOpacity * (1.0 + ripple * 20.0);
    return half4(0.29, 0.87, 0.5, alpha); // #4ade80
  }
`)!;

interface DotBackgroundProps {
  trigger?: boolean;
}

export function DotBackground({ trigger }: DotBackgroundProps) {
  const rippleTime = useSharedValue(0);
  const rippleIntensity = useSharedValue(0);

  useEffect(() => {
    if (trigger === undefined) return;

    // Reset and start ripple
    rippleTime.value = 0;
    rippleIntensity.value = 1;
    rippleTime.value = withTiming(10, {
      duration: 5000,
      easing: Easing.linear,
    });
    // Fade out intensity
    rippleIntensity.value = withTiming(0, {
      duration: 3000,
      easing: Easing.out(Easing.quad),
    });
  }, [trigger, rippleTime, rippleIntensity]);

  const uniforms = useDerivedValue(() => ({
    resolution: [SCREEN_WIDTH, SCREEN_HEIGHT] as const,
    rippleTime: rippleTime.value,
    rippleCenter: [0.5, 0.5] as const,
    rippleIntensity: rippleIntensity.value,
    gridSize: 50,
    dotOpacity: 0.15,
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
