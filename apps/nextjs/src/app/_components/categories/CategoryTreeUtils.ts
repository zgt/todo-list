import { hierarchy, tree } from "d3-hierarchy";

import type { RouterOutputs } from "@acme/api";

export type CategoryTreeNode = RouterOutputs["category"]["tree"][number];

export interface TreeLayoutNode {
  id: string;
  name: string;
  color: string;
  parentId: string | null;
  x: number;
  y: number;
  depth: number;
  isRoot: boolean;
  data: CategoryTreeNode | null;
  children: string[];
}

export interface TreeLayoutLink {
  source: { x: number; y: number };
  target: { x: number; y: number };
}

interface HierarchyInput {
  id: string;
  name: string;
  color: string;
  parentId: string | null;
  data: CategoryTreeNode | null;
  children: HierarchyInput[];
}

const RADIUS_PER_DEPTH = 150;

export function calculateRadialLayout(roots: CategoryTreeNode[]): {
  nodes: TreeLayoutNode[];
  links: TreeLayoutLink[];
} {
  // Build a virtual root that contains all real roots
  const virtualRoot: HierarchyInput = {
    id: "__root__",
    name: "Categories",
    color: "#50C878",
    parentId: null,
    data: null,
    children: roots.map(mapToHierarchy),
  };

  const root = hierarchy(virtualRoot);

  const treeLayout = tree<HierarchyInput>()
    .size([2 * Math.PI, RADIUS_PER_DEPTH * root.height || RADIUS_PER_DEPTH])
    .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth || 1);

  treeLayout(root);

  const nodes: TreeLayoutNode[] = [];
  const links: TreeLayoutLink[] = [];

  root.each((d) => {
    // Convert polar to cartesian
    // d.x = angle in radians, d.y = radius
    const angle = d.x ?? 0;
    const radius = d.y ?? 0;
    const x = radius * Math.cos(angle - Math.PI / 2);
    const y = radius * Math.sin(angle - Math.PI / 2);

    nodes.push({
      id: d.data.id,
      name: d.data.name,
      color: d.data.color,
      parentId: d.data.parentId,
      x,
      y,
      depth: d.depth,
      isRoot: d.data.id === "__root__",
      data: d.data.data,
      children: d.children?.map((c) => c.data.id) ?? [],
    });
  });

  root.links().forEach((link) => {
    const sAngle = link.source.x ?? 0;
    const sRadius = link.source.y ?? 0;
    const tAngle = link.target.x ?? 0;
    const tRadius = link.target.y ?? 0;

    links.push({
      source: {
        x: sRadius * Math.cos(sAngle - Math.PI / 2),
        y: sRadius * Math.sin(sAngle - Math.PI / 2),
      },
      target: {
        x: tRadius * Math.cos(tAngle - Math.PI / 2),
        y: tRadius * Math.sin(tAngle - Math.PI / 2),
      },
    });
  });

  return { nodes, links };
}

function mapToHierarchy(node: CategoryTreeNode): HierarchyInput {
  return {
    id: node.id,
    name: node.name,
    color: node.color,
    parentId: node.parentId,
    data: node,
    children: node.children.map(mapToHierarchy),
  };
}

export function radialLinkPath(link: TreeLayoutLink): string {
  const dx = link.target.x - link.source.x;
  const dy = link.target.y - link.source.y;
  // Curved path using quadratic bezier
  const mx = (link.source.x + link.target.x) / 2;
  const my = (link.source.y + link.target.y) / 2;

  return `M${link.source.x},${link.source.y} Q${mx + dy * 0.2},${my - dx * 0.2} ${link.target.x},${link.target.y}`;
}
