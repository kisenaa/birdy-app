/**
 * The app navigator (formerly "AppNavigator" and "MainNavigator") is used for the primary
 * navigation flows of your app.
 * Generally speaking, it will contain an auth flow (registration, login, forgot password)
 * and a "main" flow which the user will use once logged in.
 */
import { NavigationContainer, NavigatorScreenParams } from "@react-navigation/native"
import { createNativeStackNavigator, NativeStackScreenProps } from "@react-navigation/native-stack"
import { observer } from "mobx-react-lite"
import * as Screens from "@/screens"
import Config from "../config"
import { useStores } from "../models"
import { DashboardNavigator, DashboardTabParamList } from "./DashboardNavigator"
import { navigationRef, useBackButtonHandler } from "./navigationUtilities"
import { useAppTheme, useThemeProvider } from "@/utils/useAppTheme"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { $styles } from "@/theme/styles"
import { ComponentProps } from "react"
import { PaperProvider } from "react-native-paper"

/**
 * This type allows TypeScript to know what routes are defined in this navigator
 * as well as what properties (if any) they might take when navigating to them.
 *
 * If no params are allowed, pass through `undefined`. Generally speaking, we
 * recommend using your MobX-State-Tree store(s) to keep application state
 * rather than passing state through navigation params.
 *
 * For more information, see this documentation:
 *   https://reactnavigation.org/docs/params/
 *   https://reactnavigation.org/docs/typescript#type-checking-the-navigator
 *   https://reactnavigation.org/docs/typescript/#organizing-types
 */
export type AppStackParamList = {
  Welcome: undefined
  Login: undefined
  Register: undefined
  Intro: undefined
  Dashboard: NavigatorScreenParams<DashboardTabParamList>
  // 🔥 Your screens go here
  // IGNITE_GENERATOR_ANCHOR_APP_STACK_PARAM_LIST
}

/**
 * This is a list of all the route names that will exit the app if the back button
 * is pressed while in that screen. Only affects Android.
 */
const exitRoutes = Config.exitRoutes

export type AppStackScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<AppStackParamList, T>

// Documentation: https://reactnavigation.org/docs/stack-navigator/
const Stack = createNativeStackNavigator<AppStackParamList>()

const AppStack = observer(function AppStack() {
  const {
    authenticationStore: { isAuthenticated },
  } = useStores()

  const {
    theme: { colors },
  } = useAppTheme()

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        navigationBarColor: colors.background,
        contentStyle: {
          backgroundColor: colors.background,
        },
        animation: "fade_from_bottom",
      }}
      initialRouteName={isAuthenticated ? "Welcome" : "Intro"}
    >
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Welcome" component={Screens.WelcomeScreen} />

          <Stack.Screen name="Dashboard" component={DashboardNavigator} />
        </>
      ) : (
        <>
          <Stack.Screen name="Intro" component={Screens.IntroScreen} />
          <Stack.Screen name="Login" component={Screens.LoginScreen} />
          <Stack.Screen name="Register" component={Screens.RegisterScreen} />
        </>
      )}

      {/** 🔥 Your screens go here */}
      {/* IGNITE_GENERATOR_ANCHOR_APP_STACK_SCREENS */}
    </Stack.Navigator>
  )
})

export interface NavigationProps extends Partial<ComponentProps<typeof NavigationContainer<AppStackParamList>>> {}

export const AppNavigator = observer(function AppNavigator(props: NavigationProps) {
  const { themeScheme, navigationTheme, setThemeContextOverride, ThemeProvider } = useThemeProvider()

  useBackButtonHandler((routeName) => exitRoutes.includes(routeName))

  return (
    <PaperProvider theme={navigationTheme}>
      <ThemeProvider value={{ themeScheme, setThemeContextOverride }}>
        <GestureHandlerRootView style={$styles.flex1}>
          <NavigationContainer ref={navigationRef} theme={navigationTheme} {...props}>
            <Screens.ErrorBoundary catchErrors={Config.catchErrors}>
              <AppStack />
            </Screens.ErrorBoundary>
          </NavigationContainer>
        </GestureHandlerRootView>
      </ThemeProvider>
    </PaperProvider>
  )
})
