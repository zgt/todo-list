"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { shaderMaterial, useTrailTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useIsMutating } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import * as THREE from "three";

const DotMaterial = shaderMaterial(
  {
    time: 0,
    resolution: new THREE.Vector2(),
    dotColor: new THREE.Color("#FFFFFF"),
    bgColor: new THREE.Color("#121212"),
    mouseTrail: null,
    render: 0,
    rotation: 0,
    gridSize: 50,
    dotOpacity: 0.05,
    rippleTime: 0,
    rippleCenter: new THREE.Vector2(0.5, 0.5),
    rippleIntensity: 0,
  },
  /* glsl */ `
    void main() {
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  /* glsl */ `
    uniform float time;
    uniform int render;
    uniform vec2 resolution;
    uniform vec3 dotColor;
    uniform vec3 bgColor;
    uniform sampler2D mouseTrail;
    uniform float rotation;
    uniform float gridSize;
    uniform float dotOpacity;
    uniform float rippleTime;
    uniform vec2 rippleCenter;
    uniform float rippleIntensity;

    vec2 rotate(vec2 uv, float angle) {
        float s = sin(angle);
        float c = cos(angle);
        mat2 rotationMatrix = mat2(c, -s, s, c);
        return rotationMatrix * (uv - 0.5) + 0.5;
    }

    vec2 coverUv(vec2 uv) {
      vec2 s = resolution.xy / max(resolution.x, resolution.y);
      vec2 newUv = (uv - 0.5) * s + 0.5;
      return clamp(newUv, 0.0, 1.0);
    }

    float sdfCircle(vec2 p, float r) {
        return length(p - 0.5) - r;
    }

    void main() {
      vec2 screenUv = gl_FragCoord.xy / resolution;
      vec2 uv = coverUv(screenUv);

      vec2 rotatedUv = rotate(uv, rotation);

      // Create a grid
      vec2 gridUv = fract(rotatedUv * gridSize);
      vec2 gridUvCenterInScreenCoords = rotate((floor(rotatedUv * gridSize) + 0.5) / gridSize, -rotation);

      // Calculate distance from the center of each cell
      float baseDot = sdfCircle(gridUv, 0.25);

      // Screen mask
      float screenMask = smoothstep(0.0, 1.0, 1.0 - uv.y); // 0 at the top, 1 at the bottom

      float combinedMask = screenMask;

      // Mouse trail effect
      float mouseInfluence = texture2D(mouseTrail, gridUvCenterInScreenCoords).r;

      float scaleInfluence = mouseInfluence * 0.5;

      // Create dots with animated scale, influenced by mouse
      float dotSize = 0.2;

      float sdfDot = sdfCircle(gridUv, dotSize * (1.0 + scaleInfluence * 0.5));

      float smoothDot = smoothstep(0.05, 0.0, sdfDot);

      float opacityInfluence = mouseInfluence * 50.0;

      float ripple = 0.0;
      if (rippleIntensity > 0.0) {
          float dist = distance(uv, rippleCenter);
          // Continuous ripples using sine wave
          float speed = 2.0;
          float frequency = 20.0;

          // Thinner waves: Map sin to 0-1 and power it
          float baseWave = sin(dist * frequency - rippleTime * speed);
          float sharpWave = pow(baseWave * 0.5 + 0.5, 10.0); // High power = thinner peaks

          // Distance decay so they fade out as they get further
          float decay = exp(-dist * 2.0);

          // Wavefront mask: expanding circle to hide pre-existing outer waves
          // Matches the wave phase speed (speed/frequency = 2.0/20.0 = 0.1)
          float wavefront = rippleTime * 0.15; // slightly faster than phase to reveal waves
          float mask = 1.0 - smoothstep(wavefront - 0.1, wavefront, dist);

          ripple = sharpWave * decay * rippleIntensity * mask;
      }

    // Mix background color with dot color, using animated opacity to increase visibility
      // vec3 composition = mix(bgColor, dotColor, smoothDot * combinedMask * dotOpacity * (1.0 + opacityInfluence));

      // gl_FragColor = vec4(composition, 1.0);

      float finalAlpha = smoothDot * combinedMask * dotOpacity * (1.0 + opacityInfluence + ripple * 20.0);
      gl_FragColor = vec4(dotColor, finalAlpha);

      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
);

function Scene() {
  const size = useThree((s) => s.size);
  const viewport = useThree((s) => s.viewport);
  const { theme } = useTheme();

  const rotation = 0;
  const gridSize = 250;

  const getThemeColors = () => {
    switch (theme) {
      case "dark":
        return {
          dotColor: "#4ade80", // Green-400 from styles.css
          bgColor: "#000000", // Ignored due to transparency
          dotOpacity: 0.3, // Increased opacity for visibility
        };
      case "light":
        return {
          dotColor: "#e1e1e1",
          bgColor: "#F4F5F5",
          dotOpacity: 0.15,
        };
      default:
        return {
          dotColor: "#4ade80",
          bgColor: "#000000",
          dotOpacity: 0.3,
        };
    }
  };

  const themeColors = getThemeColors();
  const isMutating = useIsMutating();

  const [trail, onMove] = useTrailTexture({
    size: 512,
    radius: 0.025,
    maxAge: 400,
    interpolate: 1,
    ease: function easeInOutCirc(x) {
      return x < 0.5
        ? (1 - Math.sqrt(1 - Math.pow(2 * x, 2))) / 2
        : (Math.sqrt(1 - Math.pow(-2 * x + 2, 2)) + 1) / 2;
    },
  });

  const dotMaterial = useMemo(() => {
    return new DotMaterial({
      transparent: true,
      depthWrite: false,
    });
  }, []) as unknown as THREE.ShaderMaterial & {
    uniforms: {
      time: { value: number };
      resolution: { value: THREE.Vector2 };
      dotColor: { value: THREE.Color };
      bgColor: { value: THREE.Color };
      mouseTrail: { value: THREE.Texture | null };
      render: { value: number };
      rotation: { value: number };
      gridSize: { value: number };
      dotOpacity: { value: number };
      rippleTime: { value: number };
      rippleCenter: { value: THREE.Vector2 };
      rippleIntensity: { value: number };
    };
  };

  useEffect(() => {
    dotMaterial.uniforms.dotColor.value.setHex(
      parseInt(themeColors.dotColor.replace("#", ""), 16),
    );
    dotMaterial.uniforms.bgColor.value.setHex(
      parseInt(themeColors.bgColor.replace("#", ""), 16),
    );
    // eslint-disable-next-line react-hooks/immutability
    dotMaterial.uniforms.dotOpacity.value = themeColors.dotOpacity;
    // eslint-disable-next-line react-hooks/immutability
    dotMaterial.transparent = true;
    dotMaterial.needsUpdate = true;
  }, [theme, dotMaterial, themeColors]);

  const manualRippleTimeRemaining = useRef(0);
  const prevIsMutating = useRef(0);

  useFrame((state, delta) => {
    // eslint-disable-next-line react-hooks/immutability
    dotMaterial.uniforms.time.value = state.clock.elapsedTime;

    let isActive = false;

    if (manualRippleTimeRemaining.current > 0) {
      manualRippleTimeRemaining.current -= delta;
      isActive = true;
    }

    if (isMutating > 0) {
      isActive = true;

      // Reset on rising edge of mutation
      if (prevIsMutating.current === 0) {
        dotMaterial.uniforms.rippleTime.value = 0;
      }
    }
    prevIsMutating.current = isMutating;

    // Intensity Ramping Logic
    const targetIntensity = isActive ? 1.0 : 0.0;
    const currentIntensity = dotMaterial.uniforms.rippleIntensity.value;

    // Smooth damp towards target
    // If going up, go fast. If going down, go slow (calm exit).
    const dampSpeed = isActive ? 4.0 : 1.0;
    const nextIntensity = THREE.MathUtils.lerp(
      currentIntensity,
      targetIntensity,
      delta * dampSpeed,
    );

    dotMaterial.uniforms.rippleIntensity.value = nextIntensity;

    // Increment time as long as we have some visible intensity
    if (nextIntensity > 0.001) {
      if (dotMaterial.uniforms.rippleTime.value === 0 && isActive) {
        // Reset time only on fresh activation from 0
        // But here we just keep incrementing to make it continuous
      }
      dotMaterial.uniforms.rippleTime.value += delta * 2.0; // speed factor
    } else {
      dotMaterial.uniforms.rippleTime.value = 0;
    }
  });

  useEffect(() => {
    const handleTriggerRipple = () => {
      manualRippleTimeRemaining.current = 2.0; // Run for 2 seconds
      dotMaterial.uniforms.rippleTime.value = 0; // Restart
      dotMaterial.uniforms.rippleCenter.value.set(0.5, 0.5);
    };

    window.addEventListener("trigger-ripple", handleTriggerRipple);
    return () => {
      window.removeEventListener("trigger-ripple", handleTriggerRipple);
    };
  }, [dotMaterial]);

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    onMove(e);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = e.clientX / innerWidth;
      const y = 1 - e.clientY / innerHeight;

      // Apply aspect ratio correction (cover logic) to match shader
      const maxDim = Math.max(innerWidth, innerHeight);
      const sx = innerWidth / maxDim;
      const sy = innerHeight / maxDim;

      onMove({
        uv: new THREE.Vector2((x - 0.5) * sx + 0.5, (y - 0.5) * sy + 0.5),
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [onMove]);

  const scale = Math.max(viewport.width, viewport.height) / 2;

  return (
    <mesh scale={[scale, scale, 1]} onPointerMove={handlePointerMove}>
      <planeGeometry args={[2, 2]} />
      <primitive
        object={dotMaterial}
        resolution={[size.width * viewport.dpr, size.height * viewport.dpr]}
        rotation={rotation}
        gridSize={gridSize}
        mouseTrail={trail}
        render={0}
      />
    </mesh>
  );
}

export const DotScreenShader = () => {
  return (
    <Canvas
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        outputColorSpace: THREE.SRGBColorSpace,
        toneMapping: THREE.NoToneMapping,
        alpha: true,
      }}
    >
      <Scene />
    </Canvas>
  );
};
