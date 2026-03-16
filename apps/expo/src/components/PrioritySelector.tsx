import type React from "react";
import { useMemo, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Check } from "lucide-react-native";

import type { PriorityLevel } from "./priority-config";
import { PRIORITY_CONFIG } from "./priority-config";

interface PrioritySelectorProps {
  value: PriorityLevel;
  onChange: (priority: PriorityLevel) => void;
  disabled?: boolean;
  variant?: "picker" | "buttons";
  trigger?: React.ReactNode;
}

export function PrioritySelector({
  value,
  onChange,
  disabled,
  variant = "picker",
  trigger,
}: PrioritySelectorProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["55%"], []);

  const handleOpen = () => {
    if (disabled) return;
    bottomSheetRef.current?.present();
  };

  const handleSelect = (priority: PriorityLevel) => {
    onChange(priority);
    bottomSheetRef.current?.dismiss();
  };

  if (variant === "buttons") {
    return (
      <View className="flex-row gap-2 rounded-lg bg-[#102A2A] p-2">
        {(["high", "medium", "low", null] as const).map((p) => {
          const config = PRIORITY_CONFIG[p ?? "none"];
          if (!config) return null;
          const isSelected = value === p;
          return (
            <Pressable
              key={p ?? "null"}
              onPress={() => onChange(p)}
              disabled={disabled}
              className={`flex-1 items-center justify-center rounded-md py-2 ${
                isSelected ? "bg-[#164B49]" : "bg-transparent"
              }`}
              style={
                isSelected
                  ? {
                      borderWidth: 1,
                      borderColor: config.color,
                      backgroundColor: `${config.color}20`,
                    }
                  : {}
              }
            >
              <config.Icon
                size={20}
                color={isSelected ? config.color : "#8FA8A8"}
              />
            </Pressable>
          );
        })}
      </View>
    );
  }

  // Picker variant
  const currentConfig = PRIORITY_CONFIG[value ?? "none"];
  if (!currentConfig) return null;
  const CurrentIcon = currentConfig.Icon;

  return (
    <>
      <Pressable onPress={handleOpen} disabled={disabled}>
        {trigger ?? (
          <View className="flex-row items-center gap-2 rounded-lg border border-[#164B49] bg-[#102A2A] p-4">
            <CurrentIcon size={20} color={currentConfig.color} />
            <Text className="font-medium text-[#DCE4E4]">
              {value ? currentConfig.label : "No Priority"}
            </Text>
          </View>
        )}
      </Pressable>

      <BottomSheetModal
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: "#102A2A" }}
        handleIndicatorStyle={{ backgroundColor: "#8FA8A8" }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            opacity={0.6}
          />
        )}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: 16 }}>
          <Text className="mb-4 text-lg font-semibold text-[#DCE4E4]">
            Select Priority
          </Text>
          <View className="gap-2">
            {(["high", "medium", "low", null] as const).map((p) => {
              const config = PRIORITY_CONFIG[p ?? "none"];
              if (!config) return null;
              const isSelected = value === p;
              const Icon = config.Icon;

              return (
                <Pressable
                  key={p ?? "null"}
                  onPress={() => handleSelect(p)}
                  className={`flex-row items-center justify-between rounded-lg p-3 ${
                    isSelected ? "bg-[#164B49]" : "bg-transparent"
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    <Icon size={20} color={config.color} />
                    <Text className={`font-medium ${config.textClass}`}>
                      {config.label}
                    </Text>
                  </View>
                  {isSelected && <Check size={20} color={config.color} />}
                </Pressable>
              );
            })}
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </>
  );
}
