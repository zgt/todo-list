import type { LucideIcon } from "lucide-react-native";
import { ArrowDown, ArrowUp, Circle, Minus } from "lucide-react-native";

interface PriorityConfigItem {
  label: string;
  Icon: LucideIcon;
  color: string;
  bgClass: string;
  borderColor: string;
  textClass: string;
}

export type PriorityLevel = "high" | "medium" | "low" | null;

export const PRIORITY_CONFIG: Record<string, PriorityConfigItem> = {
  high: {
    label: "High",
    Icon: ArrowUp,
    color: "#EF4444",
    bgClass: "bg-red-500/10",
    borderColor: "#EF4444",
    textClass: "text-red-400",
  },
  medium: {
    label: "Medium",
    Icon: Minus,
    color: "#50C878",
    bgClass: "bg-emerald-500/10",
    borderColor: "#50C878",
    textClass: "text-emerald-400",
  },
  low: {
    label: "Low",
    Icon: ArrowDown,
    color: "#3B82F6",
    bgClass: "bg-blue-500/10",
    borderColor: "#3B82F6",
    textClass: "text-blue-400",
  },
  none: {
    label: "None",
    Icon: Circle,
    color: "#8FA8A8",
    bgClass: "bg-zinc-500/10",
    borderColor: "#8FA8A8",
    textClass: "text-zinc-400",
  },
} as const;
