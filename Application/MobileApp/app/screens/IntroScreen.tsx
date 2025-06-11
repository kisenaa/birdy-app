import { observer } from "mobx-react-lite"
import { FC } from "react"
import { Image, ImageStyle, TextStyle, View, ViewStyle, Dimensions } from "react-native"
import { Button, Text, Screen } from "@/components"
import { AppStackScreenProps } from "../navigators"
import { $styles, type ThemedStyle } from "@/theme"
import { useSafeAreaInsetsStyle } from "../utils/useSafeAreaInsetsStyle"
import { useAppTheme } from "@/utils/useAppTheme"

const welcomeLogo = require("../../assets/images/intro-logo.png")
const screenHeight = Dimensions.get("window").height

interface IntroScreenProps extends AppStackScreenProps<"Intro"> {}

export const IntroScreen: FC<IntroScreenProps> = observer(function IntroScreen({ navigation }) {
  const { themed } = useAppTheme()
  const bottomInsets = useSafeAreaInsetsStyle(["bottom"])

  const goLogin = () => navigation.navigate("Login")
  const goRegister = () => navigation.navigate("Register")

  return (
    <Screen preset="fixed" contentContainerStyle={$styles.flex1}>
      {/* Top: Bird Image 40% height */}
      <View style={themed($imageContainer)}>
        <Image source={welcomeLogo} style={themed($welcomeFace)} resizeMode="contain" />
      </View>

      {/* Content Wrapper: groups text and bottom sections */}
      <View style={themed($contentWrapper)}>
        {/* Text Section */}
        <View style={themed($textContainer)}>
          <Text
            testID="welcome-heading"
            style={themed($welcomeHeading)}
            text="Welcome to Birdy Birds"
            preset="heading"
            weight="bold"
          />
          <Text
            style={themed($subText)}
            preset="subheading"
            text="Discover, learn, and track birds with ease!"
          />
        </View>

        {/* Bottom Buttons */}
        <View style={themed([$bottomContainer, bottomInsets])}>
          <Button
            testID="next-screen-button"
            preset="filled"
            text="Login"
            onPress={goLogin}
            style={themed($button)}
            textStyle={themed($boldText)}
          />
          <Button
            testID="intro-register-button"
            preset="reversed"
            text="Register"
            onPress={goRegister}
            style={themed($button)}
          />
        </View>
      </View>
    </Screen>
  )
})

// ========== STYLES ==========

const $imageContainer: ThemedStyle<ViewStyle> = () => ({
  height: "75%",
  justifyContent: "center",
  alignItems: "center",
})

// Wrapper fills remaining space and pushes content to bottom
const $contentWrapper: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  justifyContent: "flex-end",
})

const $textContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.sm,
  marginBottom: Math.min(screenHeight * 0.1, 100),
  alignItems: "center",
})

const $welcomeFace: ThemedStyle<ImageStyle> = () => ({
  width: "80%",
  height: "100%",
})

const $welcomeHeading: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize: 32,
  textAlign: "center",
  marginBottom: spacing.sm,
})

const $subText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  textAlign: "center",
  color: colors.textDim,
})

const $bottomContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.lg,
  paddingBottom: spacing.xl,
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: -3 },
  shadowOpacity: 0.1,
  shadowRadius: 6,
  elevation: 10,
})

const $button: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
  borderRadius: 12,
})

const $boldText: ThemedStyle<TextStyle> = () => ({
  fontWeight: "bold",
})
