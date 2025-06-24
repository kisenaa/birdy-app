/* eslint-disable react-native/no-inline-styles */
/* eslint-disable import/first */
/**
 * Welcome to the main entry point of the app. In this file, we'll
 * be kicking off our app.
 *
 * Most of this file is boilerplate and you shouldn't need to modify
 * it very often. But take some time to look through and understand
 * what is going on here.
 *
 * The app navigation resides in ./app/navigators, so head over there
 * if you're interested in adding screens and navigators.
 */
if (__DEV__) {
  // Load Reactotron in development only.
  // Note that you must be using metro's `inlineRequires` for this to work.
  // If you turn it off in metro.config.js, you'll have to manually import it.
  require("./devtools/ReactotronConfig.ts")
}
import "./utils/gestureHandler"
import { initI18n } from "./i18n"
import { useFonts } from "expo-font"
import { useEffect, useState } from "react"
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context"
import * as Linking from "expo-linking"
import * as SplashScreen from "expo-splash-screen"
import { useInitialRootStore } from "./models"
import { AppNavigator, useNavigationPersistence } from "./navigators"
import * as storage from "./utils/storage"
import { customFontsToLoad } from "./theme"
import { KeyboardProvider } from "react-native-keyboard-controller"
import { loadDateFnsLocale } from "./utils/formatDate"
import { ActionSheetProvider } from "@expo/react-native-action-sheet"
import {
  createInferenceSession,
  initSkia as classificationInitSkia,
} from "./services/onnx/ClassificationInference"
import {
  createInferenceSession as CreateDetectioninferenceSession,
  createTFLiteInferenceSession,
  initSkia as detectionInitSkia,
} from "./services/onnx/DetectionInference"

export const NAVIGATION_PERSISTENCE_KEY = "NAVIGATION_STATE"

// Web linking configuration
const prefix = Linking.createURL("/")
const config = {
  screens: {
    Login: {
      path: "",
    },
    Welcome: "welcome",
    Demo: {
      screens: {
        DemoShowroom: {
          path: "showroom/:queryIndex?/:itemIndex?",
        },
        DemoDebug: "debug",
        DemoPodcastList: "podcast",
        DemoCommunity: "community",
      },
    },
  },
}

/* Polifill For Buffer*/
import { Buffer } from "buffer"
import { Platform } from "react-native"
global.Buffer = Buffer

/**
 * This is the root component of our app.
 * @param {AppProps} props - The props for the `App` component.
 * @returns {JSX.Element} The rendered `App` component.
 */
export function App() {
  const {
    initialNavigationState,
    onNavigationStateChange,
    isRestored: isNavigationStateRestored,
  } = useNavigationPersistence(storage, NAVIGATION_PERSISTENCE_KEY)

  const [areFontsLoaded, fontLoadError] = useFonts(customFontsToLoad)
  const [isI18nInitialized, setIsI18nInitialized] = useState(false)
  const [isSessionInitialized, setIsSessionInitialized] = useState(false)
  const [isDetectedSessionInitialized, setIsDetectedSessionInitialized] = useState(false)
  const [isSkiaLoaded, setIsSkiaLoaded] = useState(false)
  const [isDetectTFLiteInitialized, setIsDetectTFLiteInitialized] = useState(false)

  useEffect(() => {
    initI18n()
      .then(() => setIsI18nInitialized(true))
      .then(() => loadDateFnsLocale())
    // This is a good place to load any initial data or perform setup tasks.
  }, [])

  useEffect(() => {
    if (isSessionInitialized) return
    createInferenceSession()
      .then(() => setIsSessionInitialized(true))
      .catch((e) => {
        console.error("Error creating inference session:", e)
        setIsSessionInitialized(false)
      })
  }, [isSessionInitialized])

  useEffect(() => {
    if (isDetectedSessionInitialized) return
    CreateDetectioninferenceSession()
      .then(() => {
        setIsDetectedSessionInitialized(true)
        console.log("Detection inference session created successfully.")
      })
      .catch((e) => {
        setIsDetectedSessionInitialized(false)
        console.error("Error creating detection inference session:", e)
      })
  }, [isDetectedSessionInitialized])

  useEffect(() => {
    if (isSkiaLoaded) return
    if (Platform.OS === "web") {
      import("@shopify/react-native-skia/lib/module/web").then((mod) => {
        if (mod.LoadSkiaWeb) {
          mod
            .LoadSkiaWeb()
            .then(() => {
              setIsSkiaLoaded(true)
              console.log("Skia Web loaded successfully.")
              classificationInitSkia()
              detectionInitSkia()
            })
            .catch((e) => {
              setIsSkiaLoaded(false)
              console.error("Error loading Skia Web:", e)
            })
        }
      })
    } else {
      import("@/services/onnx/offScreenCanvas").then(() => {
        setIsSkiaLoaded(true)
        detectionInitSkia()
        classificationInitSkia()
      })
    }
  }, [isSkiaLoaded])

  /*
  useEffect(() => {
    if (isDetectTFLiteInitialized) {
      return
    }
    console.log("Initializing TFLite inference session...")
    createTFLiteInferenceSession()
      .then(() => {
        setIsDetectTFLiteInitialized(true)
        console.log("TFLite inference session created successfully.")
      })
      .catch((e) => {
        setIsDetectTFLiteInitialized(true)
        console.error("Error creating TFLite inference session:", e)
      })
  }, [isDetectTFLiteInitialized])
  */
  const { rehydrated } = useInitialRootStore(() => {
    // This runs after the root store has been initialized and rehydrated.

    // If your initialization scripts run very fast, it's good to show the splash screen for just a bit longer to prevent flicker.
    // Slightly delaying splash screen hiding for better UX; can be customized or removed as needed,
    setTimeout(SplashScreen.hideAsync, 500)
  })

  // Before we show the app, we have to wait for our state to be ready.
  // In the meantime, don't render anything. This will be the background
  // color set in native by rootView's background color.
  // In iOS: application:didFinishLaunchingWithOptions:
  // In Android: https://stackoverflow.com/a/45838109/204044
  // You can replace with your own loading component if you wish.
  if (
    !rehydrated ||
    !isNavigationStateRestored ||
    !isI18nInitialized ||
    (!areFontsLoaded && !fontLoadError) ||
    !isSessionInitialized ||
    !isDetectedSessionInitialized ||
    !isSkiaLoaded
  ) {
    return null
  }

  const linking = {
    prefixes: [prefix],
    config,
  }

  // otherwise, we're ready to render the app
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <KeyboardProvider>
        <ActionSheetProvider>
          <AppNavigator
            linking={linking}
            initialState={initialNavigationState}
            onStateChange={onNavigationStateChange}
          />
        </ActionSheetProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  )
}
