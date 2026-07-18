"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@acme/ui";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  tone: 0 | 1 | 2;
}

/** Deterministic pseudo-random in [0, 1) — pure, so it's render-safe. */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * A hand-rolled particle burst fired when a task is completed: an expanding
 * ring plus a spray of primary-toned sparks from the card's center. No deps —
 * just framer-motion springs. Parent unmounts it after ~900ms.
 * Reduced motion: a single soft green flash that fades.
 */
export function CompletionBurst() {
  const reducedMotion = useReducedMotion();

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: 18 }, (_, i) => {
        const angle = (i / 18) * Math.PI * 2 + pseudoRandom(i) * 0.6;
        const distance = 55 + pseudoRandom(i + 20) * 95;
        return {
          id: i,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          size: 3 + pseudoRandom(i + 40) * 5,
          delay: pseudoRandom(i + 60) * 0.08,
          tone: (i % 3) as 0 | 1 | 2,
        };
      }),
    [],
  );

  if (reducedMotion) {
    return (
      <motion.div
        aria-hidden
        className="bg-primary/20 pointer-events-none absolute inset-0 z-30 rounded-2xl"
        initial={{ opacity: 0.9 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    );
  }

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-30">
      {/* Expanding ring */}
      <motion.div
        className="border-primary absolute rounded-full border-2"
        style={{
          left: "50%",
          top: "50%",
          width: 44,
          height: 44,
          marginLeft: -22,
          marginTop: -22,
        }}
        initial={{ scale: 0.4, opacity: 0.9 }}
        animate={{ scale: 3.2, opacity: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      />
      {/* Sparks */}
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className={cn(
            "absolute rounded-full",
            p.tone === 0 && "bg-primary",
            p.tone === 1 && "bg-primary-hover",
            p.tone === 2 && "bg-white",
          )}
          style={{
            left: "50%",
            top: "50%",
            width: p.size,
            height: p.size,
            marginLeft: -p.size / 2,
            marginTop: -p.size / 2,
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.3 }}
          transition={{
            duration: 0.7,
            delay: p.delay,
            ease: [0.12, 0.8, 0.3, 1],
          }}
        />
      ))}
    </div>
  );
}
