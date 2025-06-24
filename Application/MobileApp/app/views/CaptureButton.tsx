/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable react-native/no-color-literals */
import { useCallback, useRef, FC, memo, useEffect } from "react"
import type { ViewProps } from "react-native"
import { StyleSheet, View } from "react-native"
import type {
  PanGestureHandlerGestureEvent,
  TapGestureHandlerStateChangeEvent,
} from "react-native-gesture-handler"
import { PanGestureHandler, State, TapGestureHandler } from "react-native-gesture-handler"
import Reanimated, {
  Easing,
  Extrapolate,
  interpolate,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useAnimatedGestureHandler,
  useSharedValue,
  withRepeat,
} from "react-native-reanimated"
import type { Camera, PhotoFile, VideoFile } from "react-native-vision-camera"
import { CAPTURE_BUTTON_SIZE, SCREEN_HEIGHT, SCREEN_WIDTH } from "@/constants"
import { useStores } from "@/models"
import { observer } from "mobx-react-lite"

const START_RECORDING_DELAY = 200
const BORDER_WIDTH = CAPTURE_BUTTON_SIZE * 0.1

interface Props extends ViewProps {
  camera: React.RefObject<Camera | null>
  onMediaCaptured: (media: PhotoFile | VideoFile, type: "photo" | "video") => void

  minZoom: number
  maxZoom: number
  cameraZoom: Reanimated.SharedValue<number>

  flash: "off" | "on"

  enabled: boolean

  setIsPressingButton: (isPressingButton: boolean) => void
}

const _CaptureButton: FC<Props> = observer(
  ({
    camera,
    onMediaCaptured,
    minZoom,
    maxZoom,
    cameraZoom,
    flash,
    enabled,
    setIsPressingButton,
    style,
    ...props
  }): React.ReactElement => {
    const pressDownDate = useRef<Date | undefined>(undefined)
    const isRecording = useRef(false)
    const recordingProgress = useSharedValue(0)
    const isPressingButton = useSharedValue(false)

    const {
      videoStore: { videoActive, setVideoActive },
    } = useStores()

    // Log whenever videoActive changes
    useEffect(() => {
      console.log("videoActive changed:", videoActive)
    }, [videoActive])

    const takePhoto = useCallback(async () => {
      setVideoActive(false)
      // Don't log here, log will be in useEffect above
    }, [setVideoActive])

    const stopRecording = useCallback(async () => {
      setVideoActive(false)
    }, [setVideoActive])

    const startRecording = useCallback(() => {
      setVideoActive(false)
    }, [setVideoActive])
    //#endregion

    //#region Tap handler
    const tapHandler = useRef<TapGestureHandler>(null)
    const onHandlerStateChanged = useCallback(
      async ({ nativeEvent: event }: TapGestureHandlerStateChangeEvent) => {
        // This is the gesture handler for the circular "shutter" button.
        // Once the finger touches the button (State.BEGAN), a photo is being taken and "capture mode" is entered. (disabled tab bar)
        // Also, we set `pressDownDate` to the time of the press down event, and start a 200ms timeout. If the `pressDownDate` hasn't changed
        // after the 200ms, the user is still holding down the "shutter" button. In that case, we start recording.
        //
        // Once the finger releases the button (State.END/FAILED/CANCELLED), we leave "capture mode" (enable tab bar) and check the `pressDownDate`,
        // if `pressDownDate` was less than 200ms ago, we know that the intention of the user is to take a photo. We check the `takePhotoPromise` if
        // there already is an ongoing (or already resolved) takePhoto() call (remember that we called takePhoto() when the user pressed down), and
        // if yes, use that. If no, we just try calling takePhoto() again
        console.debug(`state: ${Object.keys(State)[event.state]}`)
        switch (event.state) {
          case State.BEGAN: {
            // enter "recording mode"
            recordingProgress.value = 0
            isPressingButton.value = true
            const now = new Date()
            pressDownDate.current = now
            setTimeout(() => {
              if (pressDownDate.current === now) {
                // user is still pressing down after 200ms, so his intention is to create a video
                startRecording()
              }
            }, START_RECORDING_DELAY)
            setIsPressingButton(true)
            return
          }
          case State.END:
          case State.FAILED:
          case State.CANCELLED: {
            // exit "recording mode"
            try {
              if (pressDownDate.current == null) throw new Error("PressDownDate ref .current was null!")
              const now = new Date()
              const diff = now.getTime() - pressDownDate.current.getTime()
              pressDownDate.current = undefined
              if (diff < START_RECORDING_DELAY) {
                // user has released the button within 200ms, so his intention is to take a single picture.
                await takePhoto()
              } else {
                // user has held the button for more than 200ms, so he has been recording this entire time.
                await stopRecording()
              }
            } finally {
              setTimeout(() => {
                isPressingButton.value = false
                setIsPressingButton(false)
              }, 500)
            }
            return
          }
          default:
            break
        }
      },
      [isPressingButton, recordingProgress, setIsPressingButton, startRecording, stopRecording, takePhoto],
    )
    //#endregion
    //#region Pan handler

    const panHandler = useRef<PanGestureHandler>(null)
    const onPanGestureEvent = useAnimatedGestureHandler<
      PanGestureHandlerGestureEvent,
      { offsetY?: number; startY?: number }
    >({
      onStart: (event, context) => {
        context.startY = event.absoluteY
        const yForFullZoom = context.startY * 0.7
        const offsetYForFullZoom = context.startY - yForFullZoom

        // extrapolate [0 ... 1] zoom -> [0 ... Y_FOR_FULL_ZOOM] finger position
        context.offsetY = interpolate(
          cameraZoom.value,
          [minZoom, maxZoom],
          [0, offsetYForFullZoom],
          Extrapolate.CLAMP,
        )
      },
      onActive: (event, context) => {
        const offset = context.offsetY ?? 0
        const startY = context.startY ?? SCREEN_HEIGHT
        const yForFullZoom = startY * 0.7

        cameraZoom.value = interpolate(
          event.absoluteY - offset,
          [yForFullZoom, startY],
          [maxZoom, minZoom],
          Extrapolate.CLAMP,
        )
      },
    })
    //#endregion

    const shadowStyle = useAnimatedStyle(
      () => ({
        transform: [
          {
            scale: withSpring(isPressingButton.value ? 1 : 0, {
              mass: 1,
              damping: 35,
              stiffness: 300,
            }),
          },
        ],
      }),
      [isPressingButton],
    )
    const buttonStyle = useAnimatedStyle(() => {
      let scale: number
      if (enabled) {
        if (isPressingButton.value) {
          scale = withRepeat(
            withSpring(1, {
              stiffness: 100,
              damping: 1000,
            }),
            -1,
            true,
          )
        } else {
          scale = withSpring(0.9, {
            stiffness: 500,
            damping: 300,
          })
        }
      } else {
        scale = withSpring(0.6, {
          stiffness: 500,
          damping: 300,
        })
      }

      return {
        opacity: withTiming(enabled ? 1 : 0.3, {
          duration: 100,
          easing: Easing.linear,
        }),
        transform: [
          {
            scale: scale,
          },
        ],
      }
    }, [enabled, isPressingButton])

    return (
      <TapGestureHandler
        enabled={enabled}
        ref={tapHandler}
        onHandlerStateChange={onHandlerStateChanged}
        shouldCancelWhenOutside={false}
        maxDurationMs={99999999} // <-- this prevents the TapGestureHandler from going to State.FAILED when the user moves his finger outside of the child view (to zoom)
        simultaneousHandlers={panHandler}
      >
        <Reanimated.View {...props} style={[buttonStyle, style]}>
          <PanGestureHandler
            enabled={enabled}
            ref={panHandler}
            failOffsetX={[-SCREEN_WIDTH, SCREEN_WIDTH]}
            activeOffsetY={[-2, 2]}
            onGestureEvent={onPanGestureEvent}
            simultaneousHandlers={tapHandler}
          >
            <Reanimated.View style={styles.flex}>
              <Reanimated.View style={[styles.shadow, shadowStyle]} />
              <View style={styles.button} />
            </Reanimated.View>
          </PanGestureHandler>
        </Reanimated.View>
      </TapGestureHandler>
    )
  },
)

export const CaptureButton = memo(_CaptureButton)

const styles = StyleSheet.create({
  button: {
    borderColor: "white",
    borderRadius: CAPTURE_BUTTON_SIZE / 2,
    borderWidth: BORDER_WIDTH,
    height: CAPTURE_BUTTON_SIZE,
    width: CAPTURE_BUTTON_SIZE,
  },
  flex: {
    flex: 1,
  },
  shadow: {
    backgroundColor: "#e34077",
    borderRadius: CAPTURE_BUTTON_SIZE / 2,
    height: CAPTURE_BUTTON_SIZE,
    position: "absolute",
    width: CAPTURE_BUTTON_SIZE,
  },
})
