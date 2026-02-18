import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { Pressable, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";

export interface ThemeTemplatePickerRef {
  present: () => void;
  dismiss: () => void;
}

interface ThemeTemplatePickerProps {
  onSelectTheme: (theme: string) => void;
}

interface ThemeTemplate {
  name: string;
  category: string;
}

const THEME_TEMPLATES: ThemeTemplate[] = [
  // Classic
  { name: "Songs That Define You", category: "Classic" },
  { name: "Guilty Pleasures", category: "Classic" },
  { name: "One-Hit Wonders", category: "Classic" },
  { name: "Cover Songs Better Than the Original", category: "Classic" },
  { name: "Songs Everyone Knows", category: "Classic" },
  // Genre
  { name: "Best Hip-Hop Track", category: "Genre" },
  { name: "Country Roads", category: "Genre" },
  { name: "Electronic Bangers", category: "Genre" },
  { name: "Jazz Essentials", category: "Genre" },
  { name: "Punk Rock Anthems", category: "Genre" },
  // Era
  { name: "Best of the 80s", category: "Era" },
  { name: "90s Nostalgia", category: "Era" },
  { name: "2000s Throwbacks", category: "Era" },
  { name: "Released This Year", category: "Era" },
  { name: "Before You Were Born", category: "Era" },
  // Mood
  { name: "Road Trip Vibes", category: "Mood" },
  { name: "Late Night Drive", category: "Mood" },
  { name: "Workout Motivation", category: "Mood" },
  { name: "Rainy Day Mood", category: "Mood" },
  { name: "Feel-Good Anthems", category: "Mood" },
  // Challenge
  { name: "Songs Under 2 Minutes", category: "Challenge" },
  { name: "Songs Over 7 Minutes", category: "Challenge" },
  { name: "Instrumental Only", category: "Challenge" },
  { name: "Foreign Language Songs", category: "Challenge" },
  { name: "Songs by Solo Artists Only", category: "Challenge" },
  // Personal
  { name: "Song That Changed Your Life", category: "Personal" },
  { name: "First Concert Memory", category: "Personal" },
  { name: "Your Childhood Anthem", category: "Personal" },
  { name: "Soundtrack to Your Year", category: "Personal" },
  { name: "Song You Wish You Wrote", category: "Personal" },
];

const CATEGORIES = [
  "Classic",
  "Genre",
  "Era",
  "Mood",
  "Challenge",
  "Personal",
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  Classic: "#50C878",
  Genre: "#5B8DEF",
  Era: "#E8A838",
  Mood: "#E06090",
  Challenge: "#C070E0",
  Personal: "#50B8D8",
};

type SectionItem =
  | { type: "header"; category: string }
  | { type: "template"; template: ThemeTemplate };

export const ThemeTemplatePicker = forwardRef<
  ThemeTemplatePickerRef,
  ThemeTemplatePickerProps
>(({ onSelectTheme }, ref) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["70%"], []);

  useImperativeHandle(ref, () => ({
    present: () => bottomSheetRef.current?.present(),
    dismiss: () => bottomSheetRef.current?.dismiss(),
  }));

  const sections = useMemo(() => {
    const items: SectionItem[] = [];
    for (const category of CATEGORIES) {
      items.push({ type: "header", category });
      for (const template of THEME_TEMPLATES.filter(
        (t) => t.category === category,
      )) {
        items.push({ type: "template", template });
      }
    }
    return items;
  }, []);

  const handleSelect = useCallback(
    (name: string) => {
      onSelectTheme(name);
      bottomSheetRef.current?.dismiss();
    },
    [onSelectTheme],
  );

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: SectionItem }) => {
      if (item.type === "header") {
        return (
          <View className="mt-4 mb-2 flex-row items-center gap-2 px-4">
            <View
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: CATEGORY_COLORS[item.category] ?? "#50C878",
              }}
            />
            <Text className="text-sm font-bold uppercase tracking-wide text-[#8FA8A8]">
              {item.category}
            </Text>
          </View>
        );
      }

      return (
        <Pressable
          onPress={() => handleSelect(item.template.name)}
          className="mx-4 mb-1.5 rounded-lg border border-[#164B49] bg-[#0A1A1A] px-4 py-3 active:bg-[#164B49]"
        >
          <Text className="text-base text-[#DCE4E4]">
            {item.template.name}
          </Text>
        </Pressable>
      );
    },
    [handleSelect],
  );

  const keyExtractor = useCallback(
    (item: SectionItem, index: number) =>
      item.type === "header"
        ? `header-${item.category}`
        : `template-${item.template.name}-${index}`,
    [],
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: "#102A2A" }}
      handleIndicatorStyle={{ backgroundColor: "#8FA8A8" }}
    >
      <View className="px-4 pb-2">
        <Text className="text-xl font-bold text-[#DCE4E4]">
          Theme Templates
        </Text>
        <Text className="mt-1 text-sm text-[#8FA8A8]">
          Tap a template to use it as your round theme
        </Text>
      </View>
      <BottomSheetFlatList
        data={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </BottomSheetModal>
  );
});

ThemeTemplatePicker.displayName = "ThemeTemplatePicker";
