/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import { useEffect } from "react"
import { View } from "react-native"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated"

type InfiniteProgressBarProps = {
  width?: number
  height?: number
  barWidth?: number
  color?: string
  isLoading: boolean
}

export function InfiniteProgressBar({
  width = 300,
  height = 8,
  barWidth = 0.3,
  color = "#3498db",
  isLoading,
}: InfiniteProgressBarProps) {
  const progress = useSharedValue(0)
  const barPx = width * barWidth

  useEffect(() => {
    progress.value = 0 // Reset progress when loading state changes
    if (isLoading) {
      progress.value = withRepeat(
        withTiming(1, { duration: 1600, easing: Easing.linear }),
        -1,
        false, // <--- do NOT reset before iteration
      )
    } else {
      progress.value = 0
    }
    return () => {
      cancelAnimation(progress)
      progress.value = 0
    }
  }, [isLoading])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        // Start fully off left, end fully off right
        translateX: progress.value * (width + barPx) - barPx,
      },
    ],
  }))

  if (isLoading === false) return

  return (
    <View
      style={{
        width,
        height,
        borderRadius: height / 2,
        backgroundColor: "#eee",
        overflow: "hidden",
        marginBottom: 18,
      }}
    >
      <Animated.View
        style={[
          {
            width: barPx,
            height: "100%",
            backgroundColor: color,
            borderRadius: height / 2,
            position: "absolute",
            left: 0,
          },
          animatedStyle,
        ]}
      />
    </View>
  )
}
