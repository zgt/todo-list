import { Image, Text, View } from "react-native";

interface UserAvatarProps {
  name: string | null | undefined;
  image: string | null | undefined;
  /** Diameter in pixels */
  size: number;
}

/** Deterministic background color from a name string */
function getAvatarColor(name: string): string {
  const colors = [
    "#2E7D6B", // teal-green
    "#3A6B5E", // deep sage
    "#4A7A6A", // muted emerald
    "#2D5A4E", // forest
    "#3B8574", // sea green
    "#356B60", // dark mint
    "#2A6652", // pine
    "#4D8B7A", // jade
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length] ?? "#2E7D6B";
}

function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (
      (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")
    ).toUpperCase();
  }
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

export function UserAvatar({ name, image, size }: UserAvatarProps) {
  const initials = getInitials(name);
  const bgColor = getAvatarColor(name ?? "?");
  const fontSize =
    size < 20 ? size * 0.5 : size < 40 ? size * 0.4 : size * 0.35;

  if (image) {
    return (
      <Image
        source={{ uri: image }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bgColor,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: "#DCE4E4",
          fontSize,
          fontWeight: "700",
          lineHeight: fontSize * 1.2,
        }}
      >
        {initials}
      </Text>
    </View>
  );
}
