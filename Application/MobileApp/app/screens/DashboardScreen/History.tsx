import { FC } from "react"
import { TextStyle } from "react-native"
import { Screen, Text } from "../../components"
import { DashboardTabScreenProps } from "../../navigators/DashboardNavigator"
import { $styles } from "../../theme"
import type { ThemedStyle } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"

export const History: FC<DashboardTabScreenProps<"History">> = function History(_props) {
  const { themed } = useAppTheme()
  return (
    <Screen preset="scroll" contentContainerStyle={$styles.container} safeAreaEdges={["top"]}>
      <Text preset="heading" text="Hello There !" style={themed($title)} />
      <Text preset="subheading" text="This is history" style={themed($title)} />
    </Screen>
  )
}

const $title: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
})
