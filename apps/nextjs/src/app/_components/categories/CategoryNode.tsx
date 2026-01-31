"use client";

import type { TreeLayoutNode } from "./CategoryTreeUtils";

interface CategoryNodeProps {
  node: TreeLayoutNode;
  isHovered: boolean;
  onMouseEnter: (id: string) => void;
  onMouseLeave: () => void;
}

export function CategoryNode({
  node,
  isHovered,
  onMouseEnter,
  onMouseLeave,
}: CategoryNodeProps) {
  const radius = node.isRoot ? 24 : 14;
  const fontSize = node.isRoot ? 14 : 11;

  return (
    <g
      transform={`translate(${node.x},${node.y})`}
      onMouseEnter={() => onMouseEnter(node.id)}
      onMouseLeave={onMouseLeave}
      style={{ cursor: node.isRoot ? "default" : "pointer" }}
      role="treeitem"
      aria-label={node.name}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onMouseEnter(node.id);
      }}
    >
      {/* Invisible hit area */}
      <circle r={radius + 12} fill="transparent" />

      {/* Glow filter */}
      {isHovered && !node.isRoot && (
        <circle
          r={radius + 8}
          fill="none"
          stroke={node.color}
          strokeWidth={2}
          opacity={0.4}
          className="animate-pulse"
        />
      )}

      {/* Root glow */}
      {node.isRoot && (
        <circle
          r={radius + 6}
          fill="none"
          stroke="#50C878"
          strokeWidth={1.5}
          opacity={0.3}
        />
      )}

      {/* Main circle */}
      <circle
        r={radius}
        fill={node.color}
        stroke={isHovered ? "#fff" : `${node.color}80`}
        strokeWidth={isHovered ? 2 : 1}
        style={{
          transform: isHovered ? "scale(1.15)" : "scale(1)",
          transition: "transform 200ms ease, stroke-width 200ms ease",
        }}
      />

      {/* Label */}
      <text
        y={radius + 16}
        textAnchor="middle"
        fill={isHovered ? "#fff" : "#DCE4E4"}
        fontSize={fontSize}
        fontWeight={isHovered || node.isRoot ? 600 : 400}
        style={{
          transition: "fill 200ms ease, font-weight 200ms ease",
          pointerEvents: "none",
        }}
      >
        {node.name.length > 16 ? `${node.name.slice(0, 14)}…` : node.name}
      </text>
    </g>
  );
}
