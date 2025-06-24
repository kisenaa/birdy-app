/* eslint-disable react-native/no-inline-styles */
/* eslint-disable no-restricted-imports */
/* eslint-disable react-native/no-color-literals */
import { ReactElement } from "react"
import { useRef, useState, useCallback, useMemo } from "react"
import type { GestureResponderEvent } from "react-native"
import { StyleSheet, Text, View } from "react-native"
import type { PinchGestureHandlerGestureEvent } from "react-native-gesture-handler"
import { PinchGestureHandler, TapGestureHandler } from "react-native-gesture-handler"
import type { CameraProps, CameraRuntimeError, PhotoFile, VideoFile } from "react-native-vision-camera"
import {
  runAsync,
  runAtTargetFps,
  useCameraDevice,
  useCameraFormat,
  useFrameProcessor,
  useLocationPermission,
  useSkiaFrameProcessor,
} from "react-native-vision-camera"
import { Camera } from "react-native-vision-camera"
import {
  CONTENT_SPACING,
  CONTROL_BUTTON_SIZE,
  MAX_ZOOM_FACTOR,
  SAFE_AREA_PADDING,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
} from "@/constants"
import Reanimated, {
  Extrapolate,
  interpolate,
  useAnimatedGestureHandler,
  useAnimatedProps,
  useSharedValue,
} from "react-native-reanimated"
import { useEffect } from "react"
import { useIsForeground } from "@/hooks/useIsForeground"
import { CaptureButton } from "@/views/CaptureButton"
import { PressableOpacity } from "react-native-pressable-opacity"
import MaterialIcon from "react-native-vector-icons/MaterialCommunityIcons"
import IonIcon from "react-native-vector-icons/Ionicons"
import { useIsFocused } from "@react-navigation/core"
import { usePreferredCameraDevice } from "@/hooks/usePreferredCameraDevice"
import { PaintStyle, Skia } from "@shopify/react-native-skia"
import { Tensor, TensorflowModel, useTensorflowModel } from "react-native-fast-tflite"
import { useResizePlugin } from "vision-camera-resize-plugin"
import { DetectionBox } from "@/services/onnx/DetectionInference"

const ReanimatedCamera = Reanimated.createAnimatedComponent(Camera)
Reanimated.addWhitelistedNativeProps({
  zoom: true,
})

const SCALE_FULL_ZOOM = 3

export function CameraPage(): ReactElement {
  const camera = useRef<Camera>(null)
  const [isCameraInitialized, setIsCameraInitialized] = useState(false)
  const location = useLocationPermission()
  const zoom = useSharedValue(1)
  const isPressingButton = useSharedValue(false)

  // check if camera page is active
  const isFocussed = useIsFocused()
  const isForeground = useIsForeground()
  const isActive = isFocussed && isForeground

  const [cameraPosition, setCameraPosition] = useState<"front" | "back">("back")
  const [enableHdr, setEnableHdr] = useState(false)
  const [flash, setFlash] = useState<"off" | "on">("off")
  const [enableNightMode, setEnableNightMode] = useState(false)

  // camera device settings
  const [preferredDevice] = usePreferredCameraDevice()
  let device = useCameraDevice(cameraPosition)

  if (preferredDevice != null && preferredDevice.position === cameraPosition) {
    // override default device with the one selected by the user in settings
    device = preferredDevice
  }

  const [targetFps, setTargetFps] = useState(30)

  const screenAspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH
  const format = useCameraFormat(device, [
    { fps: targetFps },
    { videoAspectRatio: screenAspectRatio },
    { videoResolution: { width: 1280, height: 720 } },
    { photoAspectRatio: screenAspectRatio },
    { photoResolution: { width: 1280, height: 720 } },
  ])

  const fps = Math.min(format?.maxFps ?? 1, targetFps)

  const supportsFlash = device?.hasFlash ?? false
  const supportsHdr = format?.supportsPhotoHdr
  const supports60Fps = useMemo(() => device?.formats.some((f) => f.maxFps >= 60), [device?.formats])
  const canToggleNightMode = device?.supportsLowLightBoost ?? false

  //#region Animated Zoom
  const minZoom = device?.minZoom ?? 1
  const maxZoom = Math.min(device?.maxZoom ?? 1, MAX_ZOOM_FACTOR)

  const cameraAnimatedProps = useAnimatedProps<CameraProps>(() => {
    const z = Math.max(Math.min(zoom.value, maxZoom), minZoom)
    return {
      zoom: z,
    }
  }, [maxZoom, minZoom, zoom])
  //#endregion

  //#region Callbacks
  const setIsPressingButton = useCallback(
    (_isPressingButton: boolean) => {
      isPressingButton.value = _isPressingButton
    },
    [isPressingButton],
  )
  const onError = useCallback((error: CameraRuntimeError) => {
    console.error(error)
  }, [])
  const onInitialized = useCallback(() => {
    console.log("Camera initialized!")
    setIsCameraInitialized(true)
  }, [])
  const onMediaCaptured = useCallback((media: PhotoFile | VideoFile, type: "photo" | "video") => {
    console.log(`Media captured! ${JSON.stringify(media)}`)
  }, [])
  const onFlipCameraPressed = useCallback(() => {
    setCameraPosition((p) => (p === "back" ? "front" : "back"))
  }, [])
  const onFlashPressed = useCallback(() => {
    setFlash((f) => (f === "off" ? "on" : "off"))
  }, [])
  //#endregion

  //#region Tap Gesture
  const onFocusTap = useCallback(
    ({ nativeEvent: event }: GestureResponderEvent) => {
      if (!device?.supportsFocus) return
      camera.current?.focus({
        x: event.locationX,
        y: event.locationY,
      })
    },
    [device?.supportsFocus],
  )
  const onDoubleTap = useCallback(() => {
    onFlipCameraPressed()
  }, [onFlipCameraPressed])
  //#endregion

  //#region Effects
  useEffect(() => {
    // Reset zoom to it's default everytime the `device` changes.
    zoom.value = device?.neutralZoom ?? 1
  }, [zoom, device])
  //#endregion

  //#region Pinch to Zoom Gesture
  // The gesture handler maps the linear pinch gesture (0 - 1) to an exponential curve since a camera's zoom
  // function does not appear linear to the user. (aka zoom 0.1 -> 0.2 does not look equal in difference as 0.8 -> 0.9)
  const onPinchGesture = useAnimatedGestureHandler<PinchGestureHandlerGestureEvent, { startZoom?: number }>({
    onStart: (_, context) => {
      context.startZoom = zoom.value
    },
    onActive: (event, context) => {
      // we're trying to map the scale gesture to a linear zoom here
      const startZoom = context.startZoom ?? 0
      const scale = interpolate(event.scale, [1 - 1 / SCALE_FULL_ZOOM, 1, SCALE_FULL_ZOOM], [-1, 0, 1], Extrapolate.CLAMP)
      zoom.value = interpolate(scale, [-1, 0, 1], [minZoom, startZoom, maxZoom], Extrapolate.CLAMP)
    },
  })
  //#endregion

  useEffect(() => {
    const f =
      format != null
        ? `(${format.photoWidth}x${format.photoHeight} photo / ${format.videoWidth}x${format.videoHeight}@${format.maxFps} video @ ${fps}fps)`
        : undefined
    console.log(`Camera: ${device?.name} | Format: ${f}`)
  }, [device?.name, format, fps])

  useEffect(() => {
    location.requestPermission()
  }, [location])

  const objectDetectionRef = useRef<TensorflowModel | undefined>(undefined)
  const objectDetection = useTensorflowModel(require("@/../assets/model/birddetect_fp16.tflite"), "android-gpu")

  const { resize } = useResizePlugin()

  useEffect(() => {
    if (objectDetectionRef.current !== undefined) {
      return
    }
    if (objectDetection.state === "loaded") {
      objectDetectionRef.current = objectDetection.model
      console.log("Object detection model loaded successfully.")
    }
  }, [objectDetection.state])

  const frameProcessor = useSkiaFrameProcessor((frame) => {
    "worklet"

    if (!objectDetectionRef.current) {
      return
    }
    frame.render()
  }, [])
  return (
    <View style={styles.container}>
      {device != null ? (
        <PinchGestureHandler onGestureEvent={onPinchGesture} enabled={isActive}>
          <Reanimated.View onTouchEnd={onFocusTap} style={StyleSheet.absoluteFill}>
            <TapGestureHandler onEnded={onDoubleTap} numberOfTaps={2}>
              <ReanimatedCamera
                style={[StyleSheet.absoluteFill, { marginTop: 30 }]} // Add marginTop to move the FPS graph down
                device={device}
                isActive={isActive}
                ref={camera}
                onInitialized={onInitialized}
                onError={onError}
                format={format}
                fps={fps}
                photoQualityBalance="quality"
                lowLightBoost={device.supportsLowLightBoost && enableNightMode}
                enableZoomGesture={false}
                animatedProps={cameraAnimatedProps}
                exposure={0}
                enableFpsGraph={true}
                outputOrientation="device"
                enableLocation={location.hasPermission}
                frameProcessor={frameProcessor}
              />
            </TapGestureHandler>
          </Reanimated.View>
        </PinchGestureHandler>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.text}>Your phone does not have a Camera.</Text>
        </View>
      )}

      <CaptureButton
        style={styles.captureButton}
        camera={camera}
        onMediaCaptured={onMediaCaptured}
        cameraZoom={zoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
        flash={supportsFlash ? flash : "off"}
        enabled={isCameraInitialized && isActive}
        setIsPressingButton={setIsPressingButton}
      />

      <View style={styles.rightButtonRow}>
        <PressableOpacity style={styles.button} onPress={onFlipCameraPressed} disabledOpacity={0.4}>
          <IonIcon name="camera-reverse" color="white" size={24} />
        </PressableOpacity>
        {supportsFlash && (
          <PressableOpacity style={styles.button} onPress={onFlashPressed} disabledOpacity={0.4}>
            <IonIcon name={flash === "on" ? "flash" : "flash-off"} color="white" size={24} />
          </PressableOpacity>
        )}
        {supports60Fps && (
          <PressableOpacity style={styles.button} onPress={() => setTargetFps((t) => (t === 30 ? 60 : 30))}>
            <Text style={styles.text}>{`${targetFps}\nFPS`}</Text>
          </PressableOpacity>
        )}
        {supportsHdr && (
          <PressableOpacity style={styles.button} onPress={() => setEnableHdr((h) => !h)}>
            <MaterialIcon name={enableHdr ? "hdr" : "hdr-off"} color="white" size={24} />
          </PressableOpacity>
        )}
        {canToggleNightMode && (
          <PressableOpacity style={styles.button} onPress={() => setEnableNightMode(!enableNightMode)} disabledOpacity={0.4}>
            <IonIcon name={enableNightMode ? "moon" : "moon-outline"} color="white" size={24} />
          </PressableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: "rgba(140, 140, 140, 0.3)",
    borderRadius: CONTROL_BUTTON_SIZE / 2,
    height: CONTROL_BUTTON_SIZE,
    justifyContent: "center",
    marginBottom: CONTENT_SPACING,
    width: CONTROL_BUTTON_SIZE,
  },
  captureButton: {
    alignSelf: "center",
    bottom: SAFE_AREA_PADDING.paddingBottom + 30,
    position: "absolute",
  },
  container: {
    backgroundColor: "black",
    flex: 1,
  },
  emptyContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  rightButtonRow: {
    position: "absolute",
    right: SAFE_AREA_PADDING.paddingRight,
    top: SAFE_AREA_PADDING.paddingTop + 25,
  },
  text: {
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
  },
})
