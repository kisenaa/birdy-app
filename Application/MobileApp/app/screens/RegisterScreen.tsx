import { AutoImage } from "../components"
import { observer } from "mobx-react-lite"
import { ComponentType, FC, useEffect, useMemo, useRef, useState } from "react"
// eslint-disable-next-line no-restricted-imports
import { TextInput, TextStyle, ViewStyle } from "react-native"
import { Button, PressableIcon, Screen, Text, TextField, TextFieldAccessoryProps } from "../components"
import { useStores } from "../models"
import { AppStackScreenProps } from "../navigators"
import type { ThemedStyle } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"
import { View, ImageStyle } from "react-native"

interface RegisterScreenProps extends AppStackScreenProps<"Register"> {}

export const RegisterScreen: FC<RegisterScreenProps> = observer(function RegisterScreen(_props) {
  const authPasswordInput = useRef<TextInput>(null)
  const confirmPasswordInput = useRef<TextInput>(null)
  const { navigation } = _props

  const [username, setUsername] = useState("")
  const [authPassword, setAuthPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isAuthPasswordHidden, setIsAuthPasswordHidden] = useState(true)
  const [isConfirmPasswordHidden, setIsConfirmPasswordHidden] = useState(true)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [attemptsCount, setAttemptsCount] = useState(0)
  const {
    authenticationStore: { authEmail, setAuthEmail, validationError },
  } = useStores()

  const {
    themed,
    theme: { colors },
  } = useAppTheme()

  useEffect(() => {
    setAuthEmail("")
    setAuthPassword("")
    setUsername("")
    setConfirmPassword("")
    return () => {
      setAuthPassword("")
      setAuthEmail("")
      setUsername("")
      setConfirmPassword("")
    }
  }, [setAuthEmail])

  const error = isSubmitted ? validationError : ""

  function register() {
    setIsSubmitted(true)
    setAttemptsCount(attemptsCount + 1)
    if (validationError) return
    // Add your registration logic here
    navigation.navigate("Login")
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

  const ConfirmPasswordRightAccessory: ComponentType<TextFieldAccessoryProps> = useMemo(
    () =>
      function ConfirmPasswordRightAccessory(props: TextFieldAccessoryProps) {
        return (
          <PressableIcon
            icon={isConfirmPasswordHidden ? "view" : "hidden"}
            color={colors.palette.neutral800}
            containerStyle={props.style}
            size={20}
            onPress={() => setIsConfirmPasswordHidden(!isConfirmPasswordHidden)}
          />
        )
      },
    [isConfirmPasswordHidden, colors.palette.neutral800],
  )

  return (
    <Screen preset="auto" contentContainerStyle={themed($screenContentContainer)} safeAreaEdges={["bottom"]}>
      <AutoImage
        source={require("../../assets/images/intro-logo.png")}
        maxWidth={320}
        maxHeight={220}
        style={themed($logoStyle)}
      />
      <Text testID="register-heading" text="Register an account" preset="heading" style={themed($logIn)} />
      {/* Add space below heading */}
      <View style={{ height: themed(({ spacing }) => spacing.lg) }} />
      {attemptsCount > 2 && <Text tx="loginScreen:hint" size="sm" weight="light" style={themed($hint)} />}
      <View style={themed($fieldsContainer)}>
        <TextField
          value={username}
          onChangeText={setUsername}
          containerStyle={themed($textField)}
          autoCapitalize="none"
          autoCorrect={false}
          label="Username"
          placeholder="Enter your username"
          onSubmitEditing={() => authPasswordInput.current?.focus()}
        />
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
          onSubmitEditing={() => confirmPasswordInput.current?.focus()}
          RightAccessory={PasswordRightAccessory}
        />
        <TextField
          ref={confirmPasswordInput}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          containerStyle={themed($textField)}
          autoCapitalize="none"
          autoComplete="password"
          autoCorrect={false}
          secureTextEntry={isConfirmPasswordHidden}
          label="Confirm Password"
          placeholder="Re-enter your password"
          onSubmitEditing={register}
          RightAccessory={ConfirmPasswordRightAccessory}
        />
        <Button
          testID="register-button"
          text="Tap to register !"
          style={themed($tapButton)}
          preset="reversed"
          onPress={register}
        />
      </View>
      <View style={themed($loginPromptContainer)}>
        <Text style={themed($loginPromptText)}>
          Already have an account?{" "}
          <Text style={themed($loginPromptLink)} onPress={() => navigation.navigate("Login")} weight="bold">
            Log in!
          </Text>
        </Text>
      </View>
    </Screen>
  )
})

const $screenContentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexGrow: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: spacing.xxl,
})

const $logoStyle: ThemedStyle<ImageStyle> = ({ spacing }) => ({
  alignSelf: "center",
  marginTop: spacing.md,
  width: 220,
  height: 140,
})

const $logIn: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
})

const $hint: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.tint,
  marginBottom: spacing.md,
})

const $textField: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
})

const $tapButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.lg,
})

const $fieldsContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: 320,
  maxWidth: "90%",
  alignSelf: "center",
})

const $loginPromptContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.lg,
  alignItems: "center",
  justifyContent: "flex-end",
  flex: 0,
})

const $loginPromptText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.text,
  fontSize: 15,
  textAlign: "center",
})

const $loginPromptLink: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.primary500,
  textDecorationLine: "underline",
})
