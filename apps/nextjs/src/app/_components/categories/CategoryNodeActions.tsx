"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";

interface CategoryNodeActionsProps {
  x: number;
  y: number;
  nodeRadius: number;
  onEdit: () => void;
  onAddChild: () => void;
  onDelete?: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const BUTTON_SIZE = 28;
const FO_SIZE = 36; // foreignObject padding to prevent clipping
const FO_OFFSET = (FO_SIZE - BUTTON_SIZE) / 2;
const ORBIT_GAP = 12;

const SPREAD_ANGLE = Math.PI / 4.5; // 30° between each button

function radialPosition(
  index: number,
  total: number,
  orbitRadius: number,
  centerAngle = -Math.PI / 2,
) {
  const offset = (index - (total - 1) / 2) * SPREAD_ANGLE;
  const angle = centerAngle + offset;
  return {
    x: Math.cos(angle) * orbitRadius - BUTTON_SIZE / 2,
    y: Math.sin(angle) * orbitRadius - BUTTON_SIZE / 2,
  };
}

export function CategoryNodeActions({
  x,
  y,
  nodeRadius,
  onEdit,
  onAddChild,
  onDelete,
  onMouseEnter,
  onMouseLeave,
}: CategoryNodeActionsProps) {
  const actions = [
    {
      icon: Pencil,
      onClick: onEdit,
      label: "Edit category",
      variant: "default" as const,
    },
    {
      icon: Plus,
      onClick: onAddChild,
      label: "Add child category",
      variant: "default" as const,
    },
    ...(onDelete
      ? [
          {
            icon: Trash2,
            onClick: onDelete,
            label: "Delete category",
            variant: "danger" as const,
          },
        ]
      : []),
  ];

  const orbitRadius = nodeRadius + ORBIT_GAP + BUTTON_SIZE / 2;
  const hitAreaRadius = orbitRadius + BUTTON_SIZE / 2 + 4;

  return (
    <g
      transform={`translate(${x},${y})`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Invisible hit area covering node + orbit */}
      <circle
        r={hitAreaRadius}
        fill="transparent"
        style={{ pointerEvents: "all" }}
      />

      {actions.map((action, i) => {
        const pos = radialPosition(i, actions.length, orbitRadius);
        const isDanger = action.variant === "danger";
        return (
          <foreignObject
            key={action.label}
            x={pos.x - FO_OFFSET}
            y={pos.y - FO_OFFSET}
            width={FO_SIZE}
            height={FO_SIZE}
            style={{ overflow: "visible" }}
          >
            <div className="flex h-full w-full items-center justify-center">
            <button
              onClick={action.onClick}
              className={
                isDanger
                  ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-red-500/40 bg-[#0A1A1A] text-red-400 transition-colors hover:border-red-400 hover:bg-red-950/50 hover:text-red-300"
                  : "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-500/40 bg-[#0A1A1A] text-emerald-400 transition-colors hover:border-emerald-400 hover:bg-[#102A2A] hover:text-white"
              }
              title={action.label}
              aria-label={action.label}
            >
              <action.icon className="h-3 w-3" />
            </button>
            </div>
          </foreignObject>
        );
      })}
    </g>
  );
}
