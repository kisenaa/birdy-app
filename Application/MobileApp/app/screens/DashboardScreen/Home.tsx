/* eslint-disable react-native/no-inline-styles */
import { FC, useEffect, useRef, useState } from "react"
import { TextStyle, View, Alert, ViewStyle, Dimensions, ScrollView } from "react-native"
import * as ImagePicker from "expo-image-picker"
import { Screen, Text, Button, ListItem, AutoImage } from "../../components"
import { DashboardTabScreenProps } from "../../navigators/DashboardNavigator"
import { $styles } from "../../theme"
import type { ThemedStyle } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useActionSheet } from "@expo/react-native-action-sheet"
import {
  predictBirdClassification,
  predictBirdDetection,
  uploadImageToSpaceClassification,
  uploadImageToSpaceDetection,
} from "@/services/api/gradioAPI"
import { InfiniteProgressBar } from "@/components/InfiniteProgressBar"
import { predictImageClassification } from "@/services/onnx/ClassificationInference"
import { birdLabelName } from "@/services/onnx/species_label"
import { predictBirdDetectionYolo } from "@/services/onnx/DetectionInference"
import { YoloDetectionCanvas, YoloDetectionStateProps } from "./SkiaImageScreen"
import birdInferenceNative, { BirdDetector } from "modules/bird-inference-native"
import { fetchChatbotResponse } from "@/services/api/chatbotAPI"
import { Camera } from "react-native-vision-camera"
import { CameraPage } from "./CameraPage"
import { useStores, rootStoreSingleton } from "@/models"

import { observer } from "mobx-react-lite"
export const Home: FC<DashboardTabScreenProps<"Home">> = observer(function Home(_props) {
  const { themed, theme } = useAppTheme()
  const [image, setImage] = useState<string | null>(null)
  const [mode, setMode] = useState<"webapi" | "local">("webapi")
  const [shouldScroll, setShouldScroll] = useState(false)
  const [shoudlGoToEnd, setShouldGoToEnd] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [inferResult, setInferResult] = useState<{ conf: number; label: string } | null>(null)
  const [detectResult, setDetectResult] = useState("")
  const [yoloResult, setYoloResult] = useState<YoloDetectionStateProps | null>(null)
  const [chatbotResponse, setChatbotResponse] = useState<string | null>(null)

  const { navigation } = _props
  const { bottom } = useSafeAreaInsets()
  const {
    videoStore: { videoActive, setVideoActive },
  } = useStores()

  const [isVideoActive, setIsVideoActive] = useState(videoActive)
  useEffect(() => {
    setIsVideoActive(videoActive)
  }, [videoActive])

  useEffect(() => {
    if (isVideoActive) {
      navigation.setOptions({ tabBarStyle: { display: "none" } })
    } else {
      navigation.setOptions({ tabBarStyle: { height: bottom + 70 } })
    }
  }, [isVideoActive])

  const scrollRef = useRef<ScrollView>(null) as React.RefObject<ScrollView>
  const resultRef = useRef<View>(null)
  const screenWidth = Dimensions.get("window").width
  const insets = useSafeAreaInsets()
  const horizontalPadding = theme.spacing.lg
  const safeMaxWidth = screenWidth - insets.left - insets.right - horizontalPadding * 2

  const test_nativeModule = async () => {
    const t0 = performance.now()
    console.log(birdInferenceNative.helloFromCpp())
    const t1 = performance.now()
    console.log(t1 - t0, "ms")

    const t3 = performance.now()
    console.log(await BirdDetector.getStr())
    const t4 = performance.now()
    console.log(t4 - t3, "ms")
  }

  // Image pickers
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos", "livePhotos"],
      allowsEditing: true,
      quality: 1,
    })
    if (!result.canceled && result.assets.length > 0) {
      setImage(result.assets[0].uri)
    }
  }

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== "granted") {
      Alert.alert("Permission required", "Camera permission is required to take a photo.")
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    })
    if (!result.canceled && result.assets.length > 0) {
      setImage(result.assets[0].uri)
    }
  }

  const handleWebAPIInference = async (imageURI: string) => {
    try {
      setIsLoading(true)
      const uploadedPath = await uploadImageToSpaceClassification(imageURI)
      const result = await predictBirdClassification(uploadedPath)
      setInferResult({
        conf: result[0].confidences[0].confidence,
        label: result[0].confidences[0].label,
      })
      setShouldScroll(true)
      const uploadedPathDet = await uploadImageToSpaceDetection(imageURI)
      const resultDet = await predictBirdDetection(uploadedPathDet)
      setDetectResult(resultDet![0].url)
      setIsLoading(false)
      setShouldGoToEnd(true)
    } catch (error) {
      setIsLoading(false)
      console.error("Error during prediction:", error)
    }
  }

  const fetchBirdChatbot = async () => {
    const prompt = `Write a description, habitate, food, location country about this bird species of ${inferResult?.label}`
    try {
      const response = await fetchChatbotResponse(prompt)
      console.log("Chatbot response:", response)
      setChatbotResponse(response)
    } catch (error) {
      console.error("Error fetching chatbot response:", error)
    }
  }

  const handleLocalInference = async (imageURI: string) => {
    try {
      setIsLoading(true)
      const result = await predictImageClassification(imageURI)
      console.log("Local inference result:", result)
      setInferResult({
        conf: result.confidence,
        label: birdLabelName[result.maxIndex],
      })
      setShouldScroll(true)
      const resultDet = await predictBirdDetectionYolo(imageURI)
      setYoloResult({
        imageUri: imageURI,
        detections: resultDet.detections,
        originalWidth: resultDet.originalWidth,
        originalHeight: resultDet.originalHeight,
      })
      console.log("Local detection result:", resultDet)
      setIsLoading(false)
    } catch (error) {
      setIsLoading(false)
      setYoloResult(null)
      console.error("Error during local inference:", error)
    }
  }

  // Handle submit
  const handleSubmit = async (imageURI: string) => {
    setYoloResult(null)
    setInferResult(null)
    setDetectResult("")
    setChatbotResponse(null)
    try {
      if (mode === "webapi") {
        await handleWebAPIInference(imageURI)
      } else {
        await handleLocalInference(imageURI)
      }
    } catch (error) {
      console.error("err", error)
    }
  }

  // In your function:
  const takeVideo = async () => {
    const cameraPermission = await Camera.getCameraPermissionStatus()
    if (cameraPermission !== "granted") {
      const newCameraPermission = await Camera.requestCameraPermission()
      if (newCameraPermission !== "granted") {
        Alert.alert("Permission required", "Camera permission is required to record a video.")
        return
      }
    }
    setVideoActive(true)
  }

  // Action sheet for image source selection
  const { showActionSheetWithOptions } = useActionSheet()
  const onPress = () => {
    const options = ["Camera App", "Gallery", "Video", "Cancel"]
    const cancelButtonIndex = 3
    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        title: "Select Image Source",
        cancelButtonTintColor: "red",
        containerStyle: {
          marginBottom: insets.bottom,
        },
      },
      (selectedIndex?: number) => {
        switch (selectedIndex) {
          case 0:
            takePhoto()
            break
          case 1:
            pickImage()
            break
          case 2:
            takeVideo()
            break
          default:
            setImage(null)
            break
        }
      },
    )
  }

  useEffect(() => {
    if (yoloResult != null) {
      setShouldScroll(true)
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true })
      }, 500)
    }
  }, [yoloResult])

  return (
    <>
      {videoActive ? (
        <View style={{ flex: 1, position: "absolute", height: "100%", width: "100%" }}>
          <CameraPage />
        </View>
      ) : (
        <Screen
          preset="scroll"
          scrollRef={scrollRef}
          contentContainerStyle={$styles.container}
          safeAreaEdges={["top"]}
        >
          <Text preset="heading" text="Birds Detection" style={themed($title)} />
          <ListItem
            bottomSeparator={true}
            containerStyle={{
              borderBottomColor: themed(({ colors }) => colors.border),
              marginBottom: 20,
            }}
          >
            <Text
              preset="subheading"
              text="Find and Classify birds using your camera or gallery"
              style={themed($title)}
            />
          </ListItem>

          <Text
            preset="formLabel"
            size="sm"
            weight="bold"
            style={{
              textAlign: "center",
              marginBottom: 4,
              color: theme.colors.tint,
            }}
          >
            Choose Inference Method :
          </Text>

          <View style={{ flexDirection: "row", justifyContent: "center", marginVertical: 12, gap: 12 }}>
            <Button
              text="Use Web API"
              onPress={() => setMode("webapi")}
              style={[themed($toggleButton), mode === "webapi" && themed($toggleButtonActive)]}
              textStyle={mode === "webapi" ? themed($toggleTextActive) : undefined}
              preset="filled"
              pressedStyle={{ borderColor: theme.colors.palette.neutral400 }}
            />
            <Button
              text="Use Local"
              onPress={() => setMode("local")}
              style={[themed($toggleButton), mode === "local" && themed($toggleButtonActive)]}
              textStyle={mode === "local" ? themed($toggleTextActive) : undefined}
              preset="filled"
              pressedStyle={{ borderColor: theme.colors.palette.neutral400 }}
            />
          </View>

          {image ? (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 4,
                width: "100%",
              }}
            >
              <AutoImage
                source={{ uri: image }}
                maxHeight={325}
                maxWidth={safeMaxWidth}
                style={{
                  borderRadius: 12,
                  marginTop: 12,
                  marginBottom: 24,
                }}
              />
            </View>
          ) : (
            <Button
              style={{
                width: "100%",
                height: 225,
                borderRadius: 12,
                justifyContent: "center",
                alignItems: "center",
                marginTop: 16,
                marginBottom: 24,
                paddingHorizontal: 16,
              }}
              preset="reversed"
              text={`Upload or Take Photo ${mode === "webapi" ? "" : "/ Video"}`}
              textStyle={{ fontSize: 18, fontWeight: "medium" }}
              onPress={onPress}
            />
          )}

          <InfiniteProgressBar width={safeMaxWidth} color={theme.colors.tint} isLoading={isLoading} />

          <Button
            text="Submit"
            disabled={isLoading}
            preset="filled"
            onPress={async () => {
              if (!image) {
                Alert.alert("No Image Selected", "Please select an image before submitting.")
                return
              }
              await handleSubmit(image)
            }}
            style={{
              width: "100%",
              marginBottom: 12,
              borderRadius: 16,
              backgroundColor: theme.colors.tint,
              opacity: isLoading ? 0.7 : 0.9,
            }}
            textStyle={{ fontWeight: "semibold", color: theme.colors.palette.neutral100 }}
          />

          <Button
            text="Clear Image"
            preset="filled"
            onPress={() => {
              setImage(null)
              setInferResult(null)
              setDetectResult("")
              setShouldScroll(false)
              setYoloResult(null)
              test_nativeModule()
            }}
            style={{ width: "100%", marginBottom: 6, borderRadius: 16 }}
          />
          {inferResult !== null && (
            <>
              <ListItem bottomSeparator={true} height={1}>
                <View style={{ height: 1 }} />
              </ListItem>
              <View
                onLayout={(event) => {
                  if (!shouldScroll) return
                  const layoutY = event.nativeEvent.layout.y
                  scrollRef.current?.scrollTo({ y: layoutY, animated: true })
                  setShouldScroll(false)
                }}
                style={{
                  flexDirection: "column",
                  gap: 8,
                  alignContent: "center",
                  justifyContent: "center",
                  paddingBottom: 24,
                }}
                ref={resultRef}
              >
                <Text
                  preset="formLabel"
                  size="md"
                  weight="bold"
                  style={{
                    textAlign: "center",
                    color: theme.colors.tint,
                    marginTop: 6,
                  }}
                >
                  Inference Result :
                </Text>
                {yoloResult ? (
                  <View
                    style={{ alignItems: "center", justifyContent: "center", paddingHorizontal: 4, width: "100%" }}
                  >
                    <YoloDetectionCanvas
                      imageUri={yoloResult.imageUri}
                      detections={yoloResult.detections}
                      classNames={["bird"]}
                      originalWidth={yoloResult.originalWidth}
                      originalHeight={yoloResult.originalHeight}
                      maxWidth={safeMaxWidth}
                    />
                  </View>
                ) : null}
                {detectResult !== "" && (
                  <View
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 4,
                      width: "100%",
                    }}
                  >
                    <AutoImage
                      source={{ uri: detectResult }}
                      maxHeight={325}
                      maxWidth={safeMaxWidth}
                      style={{
                        borderRadius: 12,
                        marginTop: 12,
                        marginBottom: 6,
                      }}
                      onLayout={() => {
                        if (!shoudlGoToEnd) return
                        setShouldGoToEnd(false)
                        setTimeout(() => {
                          scrollRef.current?.scrollToEnd({ animated: true })
                        }, 1000)
                      }}
                    />
                  </View>
                )}
                <Text size="lg" weight="medium" style={{ textAlign: "center" }}>
                  {inferResult?.label}
                </Text>
                <Text size="md" style={{ color: theme.colors.palette.primary600, textAlign: "center" }}>
                  {inferResult?.conf}
                </Text>
                <Button
                  text="Explain more about the bird !"
                  onPress={fetchBirdChatbot}
                  style={{ width: "100%", marginTop: 8, marginBottom: 12, borderRadius: 16 }}
                  preset="filled"
                />

                {chatbotResponse
                  ?.split("\n")
                  .map((paragraph) => paragraph.trim())
                  .filter((paragraph) => paragraph !== "")
                  .map((paragraph, index) => {
                    const parts = paragraph.split(/(\*\*[^*]+\*\*)/g) // split on **...**

                    return (
                      <Text
                        key={index}
                        size="md"
                        style={{
                          textAlign: "left",
                          color: theme.colors.palette.neutral800,
                          marginTop: 10,
                          lineHeight: 22,
                        }}
                      >
                        {parts.map((part, i) => {
                          const match = part.match(/^\*\*(.+)\*\*$/)
                          if (match) {
                            return (
                              <Text key={i} style={{ fontWeight: "bold" }}>
                                {match[1]}
                              </Text>
                            )
                          } else {
                            return <Text key={i}>{part}</Text>
                          }
                        })}
                      </Text>
                    )
                  })}
              </View>
            </>
          )}
        </Screen>
      )}
    </>
  )
})

// Styles
const $title: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
})

const $toggleButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  backgroundColor: colors.palette.neutral200,
  borderRadius: 8,
  paddingVertical: spacing.sm,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
})

const $toggleButtonActive: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint,
  borderColor: colors.tint,
})

const $toggleTextActive: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
  fontWeight: "bold",
})

/*
  <Button
    text={tabBarVisible ? "Hide Tab Bar" : "Show Tab Bar"}
    onPress={() => setTabBarVisible((v) => !v)}
    style={{ marginTop: 16 }}
  />
  <Button text="Menu" onPress={onPress} style={{ marginBottom: 16 }} />
  <Button text="Open Camera" onPress={takePhoto} style={{ marginBottom: 16 }} />
  <Button text="Pick from Gallery" onPress={pickImage} />
  {image && (
    <View style={{ marginTop: 24, alignItems: "center" }}>
      <Image source={{ uri: image }} style={{ width: 250, height: 250, borderRadius: 8 }} />
    </View>
  )}
  */
/*
 /*
<Camera
  ref={cameraRef} // ✅ SET ref HERE
  style={{ flex: 1, position: "absolute", zIndex: 10, height: "100%", width: "100%" }}
  onInitialized={() => console.log("intitialized")}
  onError={(error) => console.log(error)}
  device={device}
  isActive={isActive}
  format={format!}
  fps={30}
/>
*/
