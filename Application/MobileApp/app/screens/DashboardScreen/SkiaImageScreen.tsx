import { Fragment } from "react"
import { PixelRatio, Platform, View } from "react-native"
import { Canvas, Image as SkiaImage, Rect, Text, useImage } from "@shopify/react-native-skia"
import { Skia, FontStyle } from "@shopify/react-native-skia"

const fontMgr = Skia.FontMgr.System()
const defaultFontFamily = Platform.select({
  ios: "Helvetica",
  android: "sans-serif",
  default: "serif",
})
const typeface = fontMgr.matchFamilyStyle(defaultFontFamily, FontStyle.Bold)
const font = Skia.Font(typeface, 14)

type DetectionBox = {
  x1: number
  y1: number
  x2: number
  y2: number
  score: number
  classId: number
}

type YoloDetectionCanvasProps = {
  imageUri: string
  detections: DetectionBox[]
  classNames: string[]
  originalWidth: number // original image width (ow)
  originalHeight: number // original image height (oh)
  maxWidth?: number
  maxHeight?: number
}

export type YoloDetectionStateProps = {
  imageUri: string
  detections: DetectionBox[]
  originalWidth: number
  originalHeight: number
}

export function getScaledImageSize(
  originalWidth: number,
  originalHeight: number,
  maxWidth?: number,
  maxHeight?: number,
): [width: number, height: number] {
  const aspectRatio = originalWidth / originalHeight

  if (maxWidth && maxHeight) {
    const scale = Math.min(maxWidth / originalWidth, maxHeight / originalHeight)
    return [
      PixelRatio.roundToNearestPixel(originalWidth * scale),
      PixelRatio.roundToNearestPixel(originalHeight * scale),
    ]
  } else if (maxWidth) {
    return [maxWidth, PixelRatio.roundToNearestPixel(maxWidth / aspectRatio)]
  } else if (maxHeight) {
    return [PixelRatio.roundToNearestPixel(maxHeight * aspectRatio), maxHeight]
  } else {
    return [originalWidth, originalHeight]
  }
}

export function YoloDetectionCanvas({
  imageUri,
  detections,
  classNames,
  originalWidth,
  originalHeight,
  maxWidth,
  maxHeight,
}: YoloDetectionCanvasProps) {
  const [scaledW, scaledH] = getScaledImageSize(originalWidth, originalHeight, maxWidth, maxHeight)
  const image = useImage(imageUri)

  if (!image || scaledW === 0 || scaledH === 0) return null

  const scaleX = scaledW / originalWidth
  const scaleY = scaledH / originalHeight

  return (
    <View style={{ width: scaledW, height: scaledH }}>
      <Canvas style={{ width: scaledW, height: scaledH }}>
        <SkiaImage image={image} x={0} y={0} width={scaledW} height={scaledH} />
        {detections.map((box, idx) => (
          <Fragment key={idx}>
            <Rect
              x={box.x1 * scaleX}
              y={box.y1 * scaleY}
              width={(box.x2 - box.x1) * scaleX}
              height={(box.y2 - box.y1) * scaleY}
              color="lime"
              strokeWidth={3}
              style="stroke"
            />
            <Text
              x={box.x1 * scaleX + 0}
              y={box.y1 * scaleY - 6}
              color="green"
              text={`${classNames[box.classId]} ${(box.score * 100).toFixed(1)}%`}
              font={font}
            />
          </Fragment>
        ))}
      </Canvas>
    </View>
  )
}
