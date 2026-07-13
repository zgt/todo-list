"use client";

import type { ZoomBehavior } from "d3-zoom";
import { useCallback, useEffect, useRef, useState } from "react";
import { select } from "d3-selection";
import { zoom as d3Zoom, zoomIdentity } from "d3-zoom";

import type { CategoryTreeNode } from "./CategoryTreeUtils";
import { CategoryNode } from "./CategoryNode";
import { CategoryNodeActions } from "./CategoryNodeActions";
import { calculateRadialLayout, radialLinkPath } from "./CategoryTreeUtils";

interface CategoryTreeVisualizationProps {
  tree: CategoryTreeNode[];
  onEdit: (node: CategoryTreeNode) => void;
  onAddChild: (parentNode: CategoryTreeNode | null) => void;
  onDelete?: (node: CategoryTreeNode) => void;
}

export function CategoryTreeVisualization({
  tree,
  onEdit,
  onAddChild,
  onDelete,
}: CategoryTreeVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(
    null,
  );
  // Tracks whether the user has manually panned/zoomed since the last
  // auto-fit, so a resize doesn't yank the view out from under them.
  const userInteractedRef = useRef(false);

  const { nodes, links } = calculateRadialLayout(tree);

  // Fits the view by centering the tree's origin in the container.
  // Reused on mount, on resize (when the user hasn't manually moved the
  // view), and by the "Reset View" button.
  const fitToViewport = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const svg = select(svgRef.current);
    svg.call(
      // eslint-disable-next-line @typescript-eslint/unbound-method
      zoomBehaviorRef.current.transform as Parameters<typeof svg.call>[0],
      zoomIdentity.translate(rect.width / 2, rect.height / 2),
    );
  }, []);

  // Setup d3-zoom
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = select(svgRef.current);
    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on(
        "zoom",
        (event: {
          transform: { x: number; y: number; k: number };
          sourceEvent?: unknown;
        }) => {
          // Programmatic transforms (fitToViewport) don't carry a
          // sourceEvent; real user gestures (drag/wheel/touch) do.
          if (event.sourceEvent) userInteractedRef.current = true;
          setTransform({
            x: event.transform.x,
            y: event.transform.y,
            k: event.transform.k,
          });
        },
      );

    zoomBehaviorRef.current = zoomBehavior;
    svg.call(zoomBehavior as Parameters<typeof svg.call>[0]);

    return () => {
      svg.on(".zoom", null);
      zoomBehaviorRef.current = null;
    };
  }, []);

  // Auto-fit on mount and on container resize, unless the user has already
  // interacted with the view since the last fit.
  useEffect(() => {
    const container = svgRef.current;
    if (!container) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const observer = new ResizeObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!userInteractedRef.current) fitToViewport();
      }, 150);
    });
    observer.observe(container);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      observer.disconnect();
    };
  }, [fitToViewport]);

  const handleMouseEnter = useCallback((id: string) => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setHoveredId(id);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setHoveredId(null), 300);
  }, []);

  const handleResetView = useCallback(() => {
    // Treat an explicit reset as "un-touching" the view so future resizes
    // resume auto-fitting.
    userInteractedRef.current = false;
    fitToViewport();
  }, [fitToViewport]);

  const hoveredNode = hoveredId ? nodes.find((n) => n.id === hoveredId) : null;

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
          {(() => {
            const nodeData = hoveredNode?.data;
            if (!hoveredNode || hoveredNode.isRoot || !nodeData) return null;
            return (
              <CategoryNodeActions
                x={hoveredNode.x}
                y={hoveredNode.y}
                nodeRadius={14}
                onEdit={() => onEdit(nodeData)}
                onAddChild={() => onAddChild(nodeData)}
                onDelete={onDelete ? () => onDelete(nodeData) : undefined}
                onMouseEnter={() => handleMouseEnter(hoveredNode.id)}
                onMouseLeave={handleMouseLeave}
              />
            );
          })()}

          {/* Root add action */}
          {hoveredNode?.isRoot && (
            <CategoryNodeActions
              x={hoveredNode.x}
              y={hoveredNode.y}
              nodeRadius={24}
              onEdit={() => undefined}
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
