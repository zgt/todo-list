import { ActivityIndicator, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";
import { CategoryPill } from "./CategoryPill";

interface CategoriesProps {
  selectedCategoryId: string | null; // null = "All"
  onCategoryChange: (categoryId: string | null) => void;
}

export function Categories({
  selectedCategoryId,
  onCategoryChange,
}: CategoriesProps) {
  const { data: session } = authClient.useSession();

  const {
    data: categories,
    isLoading,
    isError,
  } = useQuery(
    trpc.category.all.queryOptions(undefined, {
      enabled: !!session,
    }),
  );

  // Loading state
  if (isLoading) {
    return (
      <View className="flex-row items-center gap-3">
        <CategoryPill
          label="All"
          active={true}
          onPress={() => onCategoryChange(null)}
        />
        <ActivityIndicator size="small" color="#50C878" />
      </View>
    );
  }

  // Error or no categories - show only "All" (graceful degradation)
  if (isError || !categories) {
    return (
      <View className="flex-row flex-wrap gap-3">
        <CategoryPill
          label="All"
          active={true}
          onPress={() => onCategoryChange(null)}
        />
      </View>
    );
  }

  return (
    <View className="flex-row flex-wrap gap-3">
      <CategoryPill
        label="All"
        active={selectedCategoryId === null}
        onPress={() => onCategoryChange(null)}
      />
      {categories.map((category) => (
        <CategoryPill
          key={category.id}
          label={category.name}
          active={selectedCategoryId === category.id}
          onPress={() => onCategoryChange(category.id)}
        />
      ))}
    </View>
  );
}
