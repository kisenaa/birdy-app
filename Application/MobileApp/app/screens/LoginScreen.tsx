import { observer } from "mobx-react-lite"
import { ComponentType, FC, useEffect, useMemo, useRef, useState } from "react"
import { TextInput, TextStyle, ViewStyle, ImageStyle, View, Platform } from "react-native"
import { AutoImage, Button, PressableIcon, Screen, Text, TextField, TextFieldAccessoryProps } from "../components"
import { useStores } from "../models"
import { AppStackScreenProps } from "../navigators"
import type { ThemedStyle } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"

interface LoginScreenProps extends AppStackScreenProps<"Login"> {}

export const LoginScreen: FC<LoginScreenProps> = observer(function LoginScreen(_props) {
  const authPasswordInput = useRef<TextInput>(null)

  const [authPassword, setAuthPassword] = useState("")
  const [isAuthPasswordHidden, setIsAuthPasswordHidden] = useState(true)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [attemptsCount, setAttemptsCount] = useState(0)
  const {
    authenticationStore: { authEmail, setAuthEmail, setAuthToken, validationError },
  } = useStores()

  const {
    themed,
    theme: { colors },
  } = useAppTheme()

  useEffect(() => {
    setAuthEmail("")
    setAuthPassword("")
    return () => {
      setAuthPassword("")
      setAuthEmail("")
    }
  }, [setAuthEmail])

  const error = isSubmitted ? validationError : ""

  function login() {
    setIsSubmitted(true)
    setAttemptsCount(attemptsCount + 1)
    if (validationError) return
    setIsSubmitted(false)
    setAuthPassword("")
    setAuthEmail("")
    setAuthToken(String(Date.now()))
  }

  const PasswordRightAccessory: ComponentType<TextFieldAccessoryProps> = useMemo(
    () =>
      function PasswordRightAccessory(props: TextFieldAccessoryProps) {
        return (
          <PressableIcon
            icon={isAuthPasswordHidden ? "view" : "hidden"}
            color={colors.palette.neutral800}
            containerStyle={props.style}
            size={20}
            onPress={() => setIsAuthPasswordHidden(!isAuthPasswordHidden)}
          />
        )
      },
    [isAuthPasswordHidden, colors.palette.neutral800],
  )

  return (
    <Screen
      preset="auto"
      keyboardOffset={Platform.select({ ios: 64, android: 0 })}
      contentContainerStyle={themed($screenContentContainer)}
      safeAreaEdges={["top", "bottom"]}
    >
      <View style={themed($contentWrapper)}>
        <AutoImage
          source={require("../../assets/images/intro-logo.png")}
          maxWidth={280}
          maxHeight={280}
          style={themed($logoStyle)}
        />
        <Text testID="login-heading" tx="loginScreen:logIn" preset="heading" style={themed($logIn)} />
        {attemptsCount > 2 && <Text tx="loginScreen:hint" size="sm" weight="light" style={themed($hint)} />}
        <View style={themed($fieldsContainer)}>
          <TextField
            value={authEmail}
            onChangeText={setAuthEmail}
            containerStyle={themed($textField)}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            labelTx="loginScreen:emailFieldLabel"
            placeholderTx="loginScreen:emailFieldPlaceholder"
            helper={error}
            status={error ? "error" : undefined}
            onSubmitEditing={() => authPasswordInput.current?.focus()}
          />
          <TextField
            ref={authPasswordInput}
            value={authPassword}
            onChangeText={setAuthPassword}
            containerStyle={themed($textField)}
            autoCapitalize="none"
            autoComplete="password"
            autoCorrect={false}
            secureTextEntry={isAuthPasswordHidden}
            labelTx="loginScreen:passwordFieldLabel"
            placeholderTx="loginScreen:passwordFieldPlaceholder"
            onSubmitEditing={login}
            RightAccessory={PasswordRightAccessory}
          />
          <Button
            testID="login-button"
            tx="loginScreen:tapToLogIn"
            style={themed($tapButton)}
            preset="reversed"
            onPress={login}
          />
        </View>
        <View style={themed($registerPromptContainer)}>
          <Text style={themed($registerPromptText)}>
            Not registered?{" "}
            <Text
              style={themed($registerPromptLink)}
              onPress={() => _props.navigation.navigate("Register")}
              weight="bold"
            >
              Register now!
            </Text>
          </Text>
        </View>
      </View>
    </Screen>
  )
})

const $screenContentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexGrow: 1,
  paddingVertical: spacing.xxl,
  justifyContent: "center",
  alignItems: "center",
})

const $contentWrapper: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: spacing.xl,
})

const $logIn: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
})

const $logoStyle: ThemedStyle<ImageStyle> = ({ spacing }) => ({
  alignSelf: "center",
  marginBottom: spacing.xxs,
  width: 280,
  height: 180,
})

const $hint: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.tint,
  marginBottom: spacing.md,
})

const $textField: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})

const $tapButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
})

const $fieldsContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: 320,
  maxWidth: "90%",
  alignSelf: "center",
})

const $registerPromptContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xl,
  alignItems: "center",
})

const $registerPromptText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 15,
})

const $registerPromptLink: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  textDecorationLine: "underline",
})
