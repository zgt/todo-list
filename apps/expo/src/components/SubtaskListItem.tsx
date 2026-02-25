import { Pressable, StyleSheet, Text, View } from "react-native";

interface SubtaskListItemProps {
  subtask: {
    id: string;
    title: string;
    completed: boolean;
    sortOrder: number;
  };
  onToggle: (id: string, completed: boolean) => void;
}

export function SubtaskListItem({ subtask, onToggle }: SubtaskListItemProps) {
  return (
    <View style={styles.container}>
      {/* Connector line */}
      <View style={styles.connectorLine} />

      {/* Checkbox */}
      <Pressable
        onPress={() => onToggle(subtask.id, !subtask.completed)}
        hitSlop={8}
        style={styles.checkboxContainer}
      >
        <View
          style={[
            styles.checkbox,
            subtask.completed
              ? styles.checkboxChecked
              : styles.checkboxUnchecked,
          ]}
        >
          {subtask.completed && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </Pressable>

      {/* Title */}
      <Text
        style={[styles.title, subtask.completed && styles.titleCompleted]}
        numberOfLines={1}
      >
        {subtask.title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    paddingLeft: 40, // Indent for subtasks
    gap: 10,
    backgroundColor: "rgba(16, 42, 42, 0.3)",
    borderLeftWidth: 2,
    borderLeftColor: "#164B49",
    marginLeft: 24,
  },
  connectorLine: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 16,
    height: "50%",
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: "#164B49",
    borderBottomLeftRadius: 8,
  },
  checkboxContainer: {
    padding: 2,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    borderColor: "#50C878",
    backgroundColor: "#50C878",
  },
  checkboxUnchecked: {
    borderColor: "#164B49",
    backgroundColor: "transparent",
  },
  checkmark: {
    fontSize: 10,
    color: "#0A1A1A",
    fontWeight: "700",
    lineHeight: 12,
  },
  title: {
    flex: 1,
    fontSize: 13,
    color: "#DCE4E4",
  },
  titleCompleted: {
    color: "#8FA8A8",
    textDecorationLine: "line-through",
  },
});
