"use client";

import { useSyncExternalStore } from "react";
import {
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";

/**
 * Pointer-following 3D tilt for a card. Returns springy rotateX/rotateY motion
 * values plus a radial "sheen" background that tracks the pointer across the
 * glass. Call `handlePointerMove` from the card element and `reset` on leave.
 */
export function useCardTilt(maxTilt = 9) {
  // Pointer position within the card, normalized 0..1 (resting = center).
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);

  const springConfig = { stiffness: 260, damping: 20, mass: 0.6 };
  const rotateX = useSpring(
    useTransform(py, [0, 1], [maxTilt, -maxTilt]),
    springConfig,
  );
  const rotateY = useSpring(
    useTransform(px, [0, 1], [-maxTilt, maxTilt]),
    springConfig,
  );

  const sheenX = useTransform(px, (v) => `${v * 100}%`);
  const sheenY = useTransform(py, (v) => `${v * 100}%`);
  const sheen = useMotionTemplate`radial-gradient(320px circle at ${sheenX} ${sheenY}, rgba(255, 255, 255, 0.09), transparent 65%)`;

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  };

  const reset = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return { rotateX, rotateY, sheen, handlePointerMove, reset };
}

const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";

function subscribeFinePointer(callback: () => void) {
  const mq = window.matchMedia(FINE_POINTER_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

/**
 * True on devices with a real hover + precise pointer (i.e. a mouse/trackpad).
 * Gestures and tilt only make sense there; touch keeps buttons and scroll.
 */
export function useFinePointer() {
  return useSyncExternalStore(
    subscribeFinePointer,
    () => window.matchMedia(FINE_POINTER_QUERY).matches,
    () => false,
  );
}
