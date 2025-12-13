import type { ReactNode } from "react";
import { Text as RNText } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import { Check, Edit3, Trash2, X } from "lucide-react-native";

export type SwipeDirection = "up" | "down" | "left" | "right" | null;

interface SwipeOverlayProps {
  direction: SharedValue<SwipeDirection>;
  translationX: SharedValue<number>;
  translationY: SharedValue<number>;
  deletePending: boolean;
}

interface DirectionConfig {
  color: string;
  backgroundColor: string;
  icon: ReactNode;
  text: string;
}

const directionConfigs: Record<Exclude<SwipeDirection, null>, DirectionConfig> =
  {
    up: {
      color: "#50C878", // Emerald green
      backgroundColor: "rgba(80, 200, 120, 0.1)",
      icon: <Check size={48} color="#50C878" strokeWidth={3} />,
      text: "Complete",
    },
    down: {
      color: "#3B82F6", // Blue
      backgroundColor: "rgba(59, 130, 246, 0.1)",
      icon: <Edit3 size={48} color="#3B82F6" strokeWidth={2.5} />,
      text: "Edit",
    },
    left: {
      color: "#8FA8A8", // Muted gray
      backgroundColor: "rgba(143, 168, 168, 0.1)",
      icon: <Check size={48} color="#8FA8A8" strokeWidth={3} />,
      text: "Next",
    },
    right: {
      color: "#8FA8A8", // Muted gray
      backgroundColor: "rgba(143, 168, 168, 0.1)",
      icon: <Check size={48} color="#8FA8A8" strokeWidth={3} />,
      text: "Previous",
    },
  };

export function SwipeOverlay({
  direction,
  translationX,
  translationY,
  deletePending,
}: SwipeOverlayProps) {
  const overlayStyle = useAnimatedStyle(() => {
    const currentDirection = direction.value;
    if (!currentDirection) {
      return { opacity: 0 };
    }

    let opacity = 0;

    // Calculate opacity based on translation distance
    if (currentDirection === "up" || currentDirection === "down") {
      const absY = Math.abs(translationY.value);
      opacity = interpolate(absY, [0, 150], [0, 0.8]);
    } else {
      const absX = Math.abs(translationX.value);
      opacity = interpolate(absX, [0, 150], [0, 0.8]);
    }

    return { opacity };
  });

  const configStyle = useAnimatedStyle(() => {
    const currentDirection = direction.value;
    if (!currentDirection) {
      return { opacity: 0 };
    }
    
    // Override config for 'up' direction if deletePending is true
    if (currentDirection === "up" && deletePending) {
       return {
         backgroundColor: "rgba(239, 68, 68, 0.1)", // Red background
       };
    }

    // Override config for 'down' direction if deletePending is true
    if (currentDirection === "down" && deletePending) {
      return {
        backgroundColor: "rgba(107, 114, 128, 0.1)", // Gray background
      };
   }

    const config = directionConfigs[currentDirection];
    return {
      backgroundColor: config.backgroundColor,
    };
  });



  return (
    <Animated.View
      style={[overlayStyle]}
      className="absolute inset-0 items-center justify-center rounded-2xl"
      pointerEvents="none"
    >
      <Animated.View
        style={[configStyle]}
        className="items-center justify-center gap-3 rounded-3xl px-12 py-8"
      >
        <OverlayContent direction={direction} deletePending={deletePending} />
      </Animated.View>
    </Animated.View>
  );
}

function OverlayContent({ direction, deletePending }: { direction: SharedValue<SwipeDirection>, deletePending: boolean }) {
  // We need to reactively render the icon/text based on the shared value
  // Ideally this would be done with separate animated components or derived values
  // But since we can't easily change the Icon component type with Reanimated, 
  // we might need a simpler approach or just rely on state if it was passed down, 
  // but here 'direction' is a shared value. 
  //
  // However, Reanimated doesn't easily let us switch React components based on SharedValues on the UI thread without 'useDerivedValue' + 'runOnJS' or similar, which might be overkill.
  // BUT: 'deletePending' IS a React state passed from parent. 'direction' IS a shared value.
  // We can use 'useAnimatedReaction' to set a local state for the icon, OR just render all icons and toggle opacity.
  //
  // Let's simplify: The generic design uses `directionConfigs`. We can just make the icon/text dynamic based on `deletePending`.
  // Since `deletePending` is a JS prop, we can use it directly for the specific overrides.
  
  // Actually, we can just use a specific component that observes the direction shared value if we want perfect sync,
  // but usually simple conditional rendering works if we just want to swap the "Up" icon.
  // 
  // Let's try to conditionally render the content based on the direction value using a derived value or just render all and hide/show.
  // Actually, wait. 'direction' is a SharedValue. We can't use it in standard React render logic directly (like `if (direction.value === ...)`).
  // 
  // We can use `useAnimatedStyle` to hide/show specific icons.
  
  const upStyle = useAnimatedStyle(() => ({
    display: direction.value === 'up' ? 'flex' : 'none',
  }));
  const downStyle = useAnimatedStyle(() => ({
    display: direction.value === 'down' ? 'flex' : 'none',
  }));
  const leftStyle = useAnimatedStyle(() => ({
    display: direction.value === 'left' ? 'flex' : 'none',
  }));
  const rightStyle = useAnimatedStyle(() => ({
    display: direction.value === 'right' ? 'flex' : 'none',
  }));

  // For UP specifically, we check deletePending
  return (
    <>
      <Animated.View style={[upStyle, { alignItems: 'center', gap: 12 }]}>
        {deletePending ? (
           <>
             <Trash2 size={48} color="#ef4444" strokeWidth={3} />
             <RNText className="text-2xl font-bold tracking-wide text-red-500">Delete</RNText>
           </>
        ) : (
           <>
             <Check size={48} color="#50C878" strokeWidth={3} />
             <RNText className="text-2xl font-bold tracking-wide text-[#50C878]">Complete</RNText>
           </>
        )}
      </Animated.View>

      <Animated.View style={[downStyle, { alignItems: 'center', gap: 12 }]}>
        {deletePending ? (
          <>
            <X size={48} color="#9ca3af" strokeWidth={3} />
            <RNText className="text-2xl font-bold tracking-wide text-gray-400">Cancel</RNText>
          </>
        ) : (
          <>
            <Edit3 size={48} color="#3B82F6" strokeWidth={2.5} />
            <RNText className="text-2xl font-bold tracking-wide text-[#3B82F6]">Edit</RNText>
          </>
        )}
      </Animated.View>

      <Animated.View style={[leftStyle, { alignItems: 'center', gap: 12 }]}>
         <Check size={48} color="#8FA8A8" strokeWidth={3} />
         <RNText className="text-2xl font-bold tracking-wide text-[#8FA8A8]">Next</RNText>
      </Animated.View>

       <Animated.View style={[rightStyle, { alignItems: 'center', gap: 12 }]}>
         <Check size={48} color="#8FA8A8" strokeWidth={3} />
         <RNText className="text-2xl font-bold tracking-wide text-[#8FA8A8]">Previous</RNText>
      </Animated.View>
    </>
  );
}
