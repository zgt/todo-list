"use client";

import { Pencil, Plus } from "lucide-react";

interface CategoryNodeActionsProps {
  x: number;
  y: number;
  onEdit: () => void;
  onAddChild: () => void;
}

export function CategoryNodeActions({
  x,
  y,
  onEdit,
  onAddChild,
}: CategoryNodeActionsProps) {
  return (
    <g transform={`translate(${x},${y})`}>
      <foreignObject x={20} y={-36} width={32} height={32}>
        <button
          onClick={onEdit}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/40 bg-[#0A1A1A]/90 text-emerald-400 transition-colors hover:border-emerald-400 hover:bg-[#102A2A] hover:text-white"
          title="Edit category"
          aria-label="Edit category"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </foreignObject>
      <foreignObject x={20} y={2} width={32} height={32}>
        <button
          onClick={onAddChild}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/40 bg-[#0A1A1A]/90 text-emerald-400 transition-colors hover:border-emerald-400 hover:bg-[#102A2A] hover:text-white"
          title="Add child category"
          aria-label="Add child category"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </foreignObject>
    </g>
  );
}
