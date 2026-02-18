import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check, ChevronRight } from "lucide-react-native";

export interface CategoryNode {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  sortOrder: number;
  children: CategoryNode[];
}

interface CategoryTreeItemProps {
  node: CategoryNode;
  depth: number;
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export function CategoryTreeItem({
  node,
  depth,
  selectedIds,
  onToggle,
}: CategoryTreeItemProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedIds.includes(node.id);

  return (
    <View>
      <Pressable
        onPress={() => onToggle(node.id)}
        style={({ pressed }) => [
          styles.row,
          { paddingLeft: 12 + depth * 20 },
          isSelected && styles.rowSelected,
          pressed && styles.rowPressed,
        ]}
      >
        {/* Expansion chevron — only for parents */}
        {hasChildren ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            style={styles.chevronContainer}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronRight
              size={14}
              color="#8FA8A8"
              style={{
                transform: [{ rotate: expanded ? "90deg" : "0deg" }],
              }}
            />
          </Pressable>
        ) : (
          <View style={styles.chevronPlaceholder} />
        )}

        {/* Color dot */}
        <View style={[styles.colorDot, { backgroundColor: node.color }]} />

        {/* Label */}
        <Text style={styles.label} numberOfLines={1}>
          {node.name}
        </Text>

        {/* Check */}
        {isSelected && <Check size={16} color="#50C878" />}
      </Pressable>

      {/* Children */}
      {hasChildren &&
        expanded &&
        node.children.map((child) => (
          <CategoryTreeItem
            key={child.id}
            node={child}
            depth={depth + 1}
            selectedIds={selectedIds}
            onToggle={onToggle}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingRight: 12,
    marginVertical: 2,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "transparent",
  },
  rowSelected: {
    backgroundColor: "rgba(80, 200, 120, 0.1)",
    borderColor: "#50C878",
  },
  rowPressed: {
    backgroundColor: "#102A2A",
    borderColor: "#50C878",
  },
  chevronContainer: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  chevronPlaceholder: {
    width: 20,
    height: 20,
    marginRight: 4,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  label: {
    flex: 1,
    fontSize: 15,
    color: "#DCE4E4",
  },
});
