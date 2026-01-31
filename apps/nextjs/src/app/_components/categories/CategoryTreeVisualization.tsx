"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { zoomIdentity } from "d3-zoom";
import { zoom as d3Zoom } from "d3-zoom";
import { select } from "d3-selection";

import type { CategoryTreeNode, TreeLayoutNode } from "./CategoryTreeUtils";
import { calculateRadialLayout, radialLinkPath } from "./CategoryTreeUtils";
import { CategoryNode } from "./CategoryNode";
import { CategoryNodeActions } from "./CategoryNodeActions";

interface CategoryTreeVisualizationProps {
  tree: CategoryTreeNode[];
  onEdit: (node: CategoryTreeNode) => void;
  onAddChild: (parentNode: CategoryTreeNode | null) => void;
}

export function CategoryTreeVisualization({
  tree,
  onEdit,
  onAddChild,
}: CategoryTreeVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });

  const { nodes, links } = calculateRadialLayout(tree);

  // Setup d3-zoom
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = select(svgRef.current);
    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        setTransform({
          x: event.transform.x,
          y: event.transform.y,
          k: event.transform.k,
        });
      });

    svg.call(zoomBehavior);

    // Center the view
    const rect = svgRef.current.getBoundingClientRect();
    svg.call(
      zoomBehavior.transform,
      zoomIdentity.translate(rect.width / 2, rect.height / 2),
    );

    return () => {
      svg.on(".zoom", null);
    };
  }, []);

  const handleMouseEnter = useCallback((id: string) => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setHoveredId(id);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setHoveredId(null), 300);
  }, []);

  const handleResetView = useCallback(() => {
    if (!svgRef.current) return;
    const svg = select(svgRef.current);
    const rect = svgRef.current.getBoundingClientRect();
    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>().on("zoom", (event) => {
      setTransform({
        x: event.transform.x,
        y: event.transform.y,
        k: event.transform.k,
      });
    });
    svg.call(zoomBehavior);
    svg.call(
      zoomBehavior.transform,
      zoomIdentity.translate(rect.width / 2, rect.height / 2),
    );
  }, []);

  const hoveredNode = hoveredId
    ? nodes.find((n) => n.id === hoveredId)
    : null;

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        className="h-full w-full"
        style={{ background: "transparent" }}
      >
        <g
          ref={gRef}
          transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}
        >
          {/* Links */}
          {links.map((link, i) => (
            <path
              key={i}
              d={radialLinkPath(link)}
              fill="none"
              stroke="#164B49"
              strokeWidth={1.5}
              opacity={0.6}
            />
          ))}

          {/* Nodes */}
          {nodes.map((node) => (
            <CategoryNode
              key={node.id}
              node={node}
              isHovered={hoveredId === node.id}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            />
          ))}

          {/* Hover actions */}
          {hoveredNode && !hoveredNode.isRoot && hoveredNode.data && (
            <CategoryNodeActions
              x={hoveredNode.x}
              y={hoveredNode.y}
              onEdit={() => onEdit(hoveredNode.data!)}
              onAddChild={() => onAddChild(hoveredNode.data!)}
              onMouseEnter={() => handleMouseEnter(hoveredNode.id)}
              onMouseLeave={handleMouseLeave}
            />
          )}

          {/* Root add action */}
          {hoveredNode?.isRoot && (
            <CategoryNodeActions
              x={hoveredNode.x}
              y={hoveredNode.y}
              onEdit={() => {}}
              onAddChild={() => onAddChild(null)}
              onMouseEnter={() => handleMouseEnter(hoveredNode.id)}
              onMouseLeave={handleMouseLeave}
            />
          )}
        </g>
      </svg>

      {/* Reset button */}
      <button
        onClick={handleResetView}
        className="absolute right-4 bottom-4 rounded-lg border border-emerald-500/30 bg-[#0A1A1A]/80 px-3 py-1.5 text-xs text-emerald-400 backdrop-blur-sm transition-colors hover:border-emerald-400 hover:text-white"
      >
        Reset View
      </button>
    </div>
  );
}
