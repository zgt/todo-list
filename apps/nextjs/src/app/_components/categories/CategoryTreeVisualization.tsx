"use client";

import type { ZoomBehavior } from "d3-zoom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { select } from "d3-selection";
import { zoom as d3Zoom, zoomIdentity } from "d3-zoom";
import { Minus, Plus } from "lucide-react";

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

  const { nodes, links } = useMemo(() => calculateRadialLayout(tree), [tree]);

  // Bounding box of all node centers, so the fit can scale the whole tree
  // into view instead of just centering the origin.
  const bounds = useMemo(() => {
    if (nodes.length === 0) return null;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const n of nodes) {
      const r = n.isRoot ? 24 : 14;
      minX = Math.min(minX, n.x - r);
      maxX = Math.max(maxX, n.x + r);
      minY = Math.min(minY, n.y - r);
      maxY = Math.max(maxY, n.y + r);
    }
    return { minX, maxX, minY, maxY };
  }, [nodes]);

  // Fits the whole tree into the container with padding that leaves room for
  // labels and the hover-action orbit, so outer nodes aren't clipped by the
  // panel's overflow-hidden. Reused on mount, on resize (when the user hasn't
  // manually moved the view), and by the "Reset View" button.
  const fitToViewport = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current || !bounds) return;
    const rect = svgRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Padding covers node labels (~28px below) plus the action orbit (~44px).
    const PADDING = 72;
    const contentW = bounds.maxX - bounds.minX || 1;
    const contentH = bounds.maxY - bounds.minY || 1;
    // Only ever zoom out to fit; never zoom past 1:1 for small trees.
    const scale = Math.min(
      1,
      Math.max(
        0.3,
        Math.min(
          (rect.width - PADDING * 2) / contentW,
          (rect.height - PADDING * 2) / contentH,
        ),
      ),
    );
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;

    const svg = select(svgRef.current);
    svg.call(
      // eslint-disable-next-line @typescript-eslint/unbound-method
      zoomBehaviorRef.current.transform as Parameters<typeof svg.call>[0],
      zoomIdentity
        .translate(rect.width / 2, rect.height / 2)
        .scale(scale)
        .translate(-cx, -cy),
    );
  }, [bounds]);

  // Zooms in/out around the container center with a smooth transition,
  // driving the same d3-zoom behavior the pointer gestures use. d3-transition
  // augments Selection at runtime (loaded transitively via d3-zoom) but its
  // types aren't installed, so we bridge the transition call structurally.
  const handleZoomBy = useCallback((factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    // Programmatic zooms carry no sourceEvent, so mark the view as
    // user-adjusted here or the next resize refit would discard the zoom.
    userInteractedRef.current = true;
    const svg = select(svgRef.current) as unknown as {
      transition: () => {
        duration: (ms: number) => {
          call: (fn: unknown, ...args: unknown[]) => void;
        };
      };
    };
    svg
      .transition()
      .duration(200)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      .call(zoomBehaviorRef.current.scaleBy, factor);
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

  // Reveal actions immediately (keyboard focus, click/tap).
  const handleActivate = useCallback((id: string) => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setHoveredId(id);
  }, []);

  // Dismiss immediately (focus leaving the node+actions group, Escape).
  const handleDeactivate = useCallback(() => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setHoveredId(null);
  }, []);

  const handleResetView = useCallback(() => {
    // Treat an explicit reset as "un-touching" the view so future resizes
    // resume auto-fitting.
    userInteractedRef.current = false;
    fitToViewport();
  }, [fitToViewport]);

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
              stroke="var(--border-strong)"
              strokeWidth={1.5}
              opacity={0.6}
            />
          ))}

          {/* Nodes — each node's actions render adjacent to it in DOM order so
              Tab moves from a node straight into its own actions. Focus-out
              (relatedTarget outside the group) and Escape dismiss the actions. */}
          {nodes.map((node) => {
            const isActive = hoveredId === node.id;
            const nodeData = node.data;
            const hasActions = node.isRoot || nodeData !== null;
            return (
              <g
                key={node.id}
                onFocus={() => handleActivate(node.id)}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    handleDeactivate();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && isActive) {
                    handleDeactivate();
                    e.currentTarget
                      .querySelector<SVGGElement>('[role="treeitem"]')
                      ?.focus();
                  }
                }}
              >
                <CategoryNode
                  node={node}
                  isHovered={isActive}
                  hasActions={hasActions}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  onActivate={handleActivate}
                />

                {isActive && node.isRoot && (
                  <CategoryNodeActions
                    x={node.x}
                    y={node.y}
                    nodeRadius={24}
                    onAddChild={() => onAddChild(null)}
                    onMouseEnter={() => handleMouseEnter(node.id)}
                    onMouseLeave={handleMouseLeave}
                  />
                )}

                {isActive && !node.isRoot && nodeData && (
                  <CategoryNodeActions
                    x={node.x}
                    y={node.y}
                    nodeRadius={14}
                    onEdit={() => onEdit(nodeData)}
                    onAddChild={() => onAddChild(nodeData)}
                    onDelete={onDelete ? () => onDelete(nodeData) : undefined}
                    onMouseEnter={() => handleMouseEnter(node.id)}
                    onMouseLeave={handleMouseLeave}
                  />
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Zoom / fit controls */}
      <div className="absolute right-4 bottom-4 flex items-center gap-2">
        <div className="bg-surface/80 border-primary/30 flex items-center rounded-lg border backdrop-blur-sm">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => handleZoomBy(1 / 1.3)}
            className="focus-visible:ring-border-focus text-primary rounded-l-lg px-2 py-1.5 transition-colors hover:text-white focus-visible:ring-2 focus-visible:outline-none"
          >
            <Minus className="size-4" />
          </button>
          <div className="bg-primary/30 h-4 w-px" />
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => handleZoomBy(1.3)}
            className="focus-visible:ring-border-focus text-primary rounded-r-lg px-2 py-1.5 transition-colors hover:text-white focus-visible:ring-2 focus-visible:outline-none"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={handleResetView}
          className="bg-surface/80 focus-visible:ring-border-focus border-primary/30 text-primary hover:border-primary rounded-lg border px-3 py-1.5 text-xs backdrop-blur-sm transition-colors hover:text-white focus-visible:ring-2 focus-visible:outline-none"
        >
          Reset View
        </button>
      </div>
    </div>
  );
}
