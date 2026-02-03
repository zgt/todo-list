import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Check, ChevronDown } from "lucide-react-native";

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

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: withTiming(expanded ? "0deg" : "-90deg", { duration: 200 }),
      },
    ],
  }));

  return (
    <>
      <Pressable
        onPress={() => onToggle(node.id)}
        className="flex-row items-center rounded-lg border border-transparent py-2 active:border-emerald-400 active:bg-[#102A2A]"
        style={{ paddingLeft: 8 + depth * 20 }}
      >
        {/* Expansion chevron — only for parents */}
        {hasChildren ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="mr-1 h-5 w-5 items-center justify-center rounded-sm"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Animated.View style={chevronStyle}>
              <ChevronDown size={14} color="#8FA8A8" />
            </Animated.View>
          </Pressable>
        ) : (
          <View className="mr-1 h-5 w-5" />
        )}

        {/* Color dot */}
        <View
          className="mr-2 h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: node.color }}
        />

        {/* Label */}
        <Text className="flex-1 text-sm text-[#DCE4E4]" numberOfLines={1}>
          {node.name}
        </Text>

        {/* Check */}
        {isSelected && <Check size={16} color="#50C878" className="ml-2" />}
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
    </>
  );
}
