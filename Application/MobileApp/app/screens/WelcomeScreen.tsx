import { observer } from "mobx-react-lite"
import { FC, useState } from "react"
import { Image, ImageStyle, TextStyle, View, ViewStyle } from "react-native"
import { Button, Text, Screen, Checkbox } from "@/components"
import { useStores } from "../models"
import { AppStackScreenProps } from "../navigators"
import { $styles, type ThemedStyle } from "@/theme"
import { useHeader } from "../utils/useHeader"
import { useSafeAreaInsetsStyle } from "../utils/useSafeAreaInsetsStyle"
import { useAppTheme } from "@/utils/useAppTheme"

const welcomeLogo = require("../../assets/images/intro-logo.png")

interface WelcomeScreenProps extends AppStackScreenProps<"Welcome"> {}

export const WelcomeScreen: FC<WelcomeScreenProps> = observer(function WelcomeScreen(_props) {
  const { themed, theme } = useAppTheme()

  const { navigation } = _props
  const {
    authenticationStore: { logout },
  } = useStores()

  function goNext() {
    navigation.navigate("Dashboard", { screen: "Home" })
  }

  const [accepted, setAccepted] = useState(false)

  useHeader(
    {
      rightTx: "common:logOut",
      onRightPress: logout,
    },
    [logout],
  )

  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])

  return (
    <Screen preset="fixed" contentContainerStyle={$styles.flex1}>
      <View style={themed($topContainer)}>
        <Image style={themed($welcomeLogo)} source={welcomeLogo} resizeMode="contain" />
        <Text testID="welcome-heading" style={themed($welcomeHeading)} tx="welcomeScreen:readyForLaunch" preset="heading" />
      </View>

      <View style={themed([$bottomContainer, $bottomContainerInsets])}>
        <View style={{ gap: theme.spacing.md }}>
          <Text size="md">
            Please read the following terms carefully before using the app. By accessing or using any part of the service, you
            agree to be bound by these <Text size="md" style={themed($link)} text="Terms of Service" />
          </Text>
          <Checkbox
            label="I accept the Terms of Service"
            value={accepted}
            onValueChange={() => setAccepted(!accepted)}
            containerStyle={themed($checkboxContainer)}
          />
        </View>
        <Button
          disabled={!accepted}
          disabledStyle={themed($customButtonDisabledStyle)}
          pressedStyle={themed($customButtonPressedStyle)}
          pressedTextStyle={themed($customButtonPressedTextStyle)}
          testID="next-screen-button"
          preset="reversed"
          tx="welcomeScreen:letsGo"
          onPress={goNext}
        />
      </View>
    </Screen>
  )
})

const $topContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexShrink: 1,
  flexGrow: 1,
  flexBasis: "57%",
  justifyContent: "center",
  paddingHorizontal: spacing.lg,
})

const $bottomContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexShrink: 1,
  flexGrow: 0,
  flexBasis: "43%",
  backgroundColor: colors.palette.neutral100,
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  paddingHorizontal: spacing.lg,
  justifyContent: "space-around",
})

const $welcomeLogo: ThemedStyle<ImageStyle> = () => ({
  height: 300,
  width: "100%",
})

const $welcomeHeading: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})

const $link: ThemedStyle<TextStyle> = () => ({
  color: "#007AFF",
  textDecorationLine: "underline",
})

const $checkboxContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginVertical: spacing.md,
})

const $customButtonPressedStyle: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.error,
})

const $customButtonPressedTextStyle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
})

const $customButtonDisabledStyle: ThemedStyle<ViewStyle> = () => ({
  opacity: 0.5,
})
