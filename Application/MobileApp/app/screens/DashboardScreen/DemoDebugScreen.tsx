import { FC, useCallback, useMemo } from "react"
import * as Application from "expo-application"
import { LayoutAnimation, Linking, Platform, TextStyle, useColorScheme, View, ViewStyle } from "react-native"
import { Button, ListItem, Screen, Text } from "../../components"
import { DashboardTabScreenProps } from "../../navigators/DashboardNavigator"
import type { ThemedStyle } from "@/theme"
import { $styles } from "../../theme"
import { isRTL } from "@/i18n"
import { useStores } from "../../models"
import { useAppTheme } from "@/utils/useAppTheme"
import { useState } from "react"
import { TextInput as PaperTextInput } from "react-native-paper"
import { observer } from "mobx-react-lite"

/**
 * @param {string} url - The URL to open in the browser.
 * @returns {void} - No return value.
 */
function openLinkInBrowser(url: string) {
  Linking.canOpenURL(url).then((canOpen) => canOpen && Linking.openURL(url))
}

const usingHermes = typeof HermesInternal === "object" && HermesInternal !== null

export const DemoDebugScreen: FC<DashboardTabScreenProps<"DemoDebug">> = observer(function DemoDebugScreen(_props) {
  const { setThemeContextOverride, themeContext, themed } = useAppTheme()
  const {
    authenticationStore: { logout, apiKey, setApiKey },
  } = useStores()

  // @ts-expect-error
  const usingFabric = global.nativeFabricUIManager != null

  const demoReactotron = useMemo(
    () => async () => {
      if (__DEV__) {
        console.tron.display({
          name: "DISPLAY",
          value: {
            appId: Application.applicationId,
            appName: Application.applicationName,
            appVersion: Application.nativeApplicationVersion,
            appBuildVersion: Application.nativeBuildVersion,
            hermesEnabled: usingHermes,
          },
          important: true,
        })
      }
    },
    [],
  )

  const toggleTheme = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut) // Animate the transition
    setThemeContextOverride(themeContext === "dark" ? "light" : "dark")
  }, [themeContext, setThemeContextOverride])

  // Resets the theme to the system theme
  const colorScheme = useColorScheme()
  const resetTheme = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setThemeContextOverride(undefined)
  }, [setThemeContextOverride])

  const [apiKeyValue, setApiKeyValue] = useState(apiKey)
  const [showApiKey, setShowApiKey] = useState(false)

  // Update the apiKey in the store when the input changes
  const handleApiKeyChange = useCallback(
    (value: string) => {
      setApiKeyValue(value)
      setApiKey(value)
    },
    [setApiKey, setApiKeyValue],
  )

  return (
    <Screen preset="scroll" safeAreaEdges={["top"]} contentContainerStyle={[$styles.container, themed($container)]}>
      <Text
        style={themed($reportBugsLink)}
        tx="demoDebugScreen:reportBugs"
        onPress={() => openLinkInBrowser("https://github.com/infinitered/ignite/issues")}
      />
      <Text style={themed($title)} preset="heading" tx="demoDebugScreen:title" />
      <Text preset="bold">Current system theme: {colorScheme}</Text>
      <Text preset="bold">Current app theme: {themeContext}</Text>
      <Button onPress={resetTheme} text={`Reset`} style={{ marginTop: 14 }} />
      <View style={themed($itemsContainer)}>
        <Button onPress={toggleTheme} text={`Toggle Theme: ${themeContext}`} />
      </View>
      <View>
        <PaperTextInput
          label="API Key"
          value={apiKeyValue}
          onChangeText={handleApiKeyChange}
          mode="outlined"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={!showApiKey}
          style={{ marginBottom: 8 }}
          placeholder="Enter your API key"
          right={<PaperTextInput.Icon icon={showApiKey ? "eye-off" : "eye"} onPress={() => setShowApiKey((v) => !v)} />}
        />
      </View>
      <View style={themed($itemsContainer)}>
        <ListItem
          LeftComponent={
            <View style={themed($item)}>
              <Text preset="bold">App Id</Text>
              <Text>{Application.applicationId}</Text>
            </View>
          }
        />
        <ListItem
          LeftComponent={
            <View style={themed($item)}>
              <Text preset="bold">App Name</Text>
              <Text>{Application.applicationName}</Text>
            </View>
          }
        />
        <ListItem
          LeftComponent={
            <View style={themed($item)}>
              <Text preset="bold">App Version</Text>
              <Text>{Application.nativeApplicationVersion}</Text>
            </View>
          }
        />
        <ListItem
          LeftComponent={
            <View style={themed($item)}>
              <Text preset="bold">App Build Version</Text>
              <Text>{Application.nativeBuildVersion}</Text>
            </View>
          }
        />
        <ListItem
          LeftComponent={
            <View style={themed($item)}>
              <Text preset="bold">Hermes Enabled</Text>
              <Text>{String(usingHermes)}</Text>
            </View>
          }
        />
        <ListItem
          LeftComponent={
            <View style={themed($item)}>
              <Text preset="bold">Fabric Enabled</Text>
              <Text>{String(usingFabric)}</Text>
            </View>
          }
        />
      </View>
      <View style={themed($buttonContainer)}>
        <Button style={themed($button)} tx="demoDebugScreen:reactotron" onPress={demoReactotron} />
        <Text style={themed($hint)} tx={`demoDebugScreen:${Platform.OS}ReactotronHint` as const} />
      </View>
      <View style={themed($buttonContainer)}>
        <Button style={themed($button)} tx="common:logOut" onPress={logout} />
      </View>
    </Screen>
  )
})

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingBottom: spacing.xxl,
})

const $title: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})

const $reportBugsLink: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.tint,
  marginBottom: spacing.lg,
  alignSelf: isRTL ? "flex-start" : "flex-end",
})

const $item: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})

const $itemsContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginVertical: spacing.xl,
})

const $button: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.xs,
})

const $buttonContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})

const $hint: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.palette.neutral600,
  fontSize: 12,
  lineHeight: 15,
  paddingBottom: spacing.lg,
})
