import { copyAsync, cacheDirectory, getInfoAsync } from "expo-file-system"
import { Tensor, InferenceSession } from "onnxruntime-react-native"
import { Asset } from "expo-asset"
import performance from "react-native-performance"
import { readAsStringAsync, EncodingType } from "expo-file-system"
import { Skia, ColorType, AlphaType, CatmullRomCubicSampling, SkSurface, SkPaint } from "@shopify/react-native-skia"
import { BirdDetector } from "modules/bird-inference-native"

const inputSize = 640
let paddedSurf: SkSurface | null = null
let paint: SkPaint | null = null

export function initSkia() {
  if (!paddedSurf) {
    paddedSurf = Skia.Surface.MakeOffscreen(inputSize, inputSize)!
    paint = Skia.Paint()
    paint.setAntiAlias(true)
  }
}

export const preProcessImage_YOLO_NHWC_SKIA = async (imageUri: string) => {
  const info = await getInfoAsync(imageUri)
  if (!info.exists) throw new Error("File not found")

  // 1) Load image into Skia.Image
  const base64 = await readAsStringAsync(imageUri, { encoding: EncodingType.Base64 })
  const skData = Skia.Data.fromBase64(base64)
  const image = Skia.Image.MakeImageFromEncoded(skData)!
  const ow = image.width()
  const oh = image.height()
  console.log(`Original image size: ${ow}x${oh}`)

  // 2) Resize to 640×640 with aspect ratio (padding if necessary)
  const scale = Math.min(inputSize / ow, inputSize / oh)
  const nw = Math.round(ow * scale)
  const nh = Math.round(oh * scale)

  const dx = Math.floor((inputSize - nw) / 2)
  const dy = Math.floor((inputSize - nh) / 2)

  // Resize first
  const resizedSurf = Skia.Surface.MakeOffscreen(nw, nh)!
  resizedSurf.getCanvas().drawImageRectCubic(image, { x: 0, y: 0, width: ow, height: oh }, { x: 0, y: 0, width: nw, height: nh }, CatmullRomCubicSampling.B, CatmullRomCubicSampling.C, paint)
  resizedSurf.flush()
  const resizedImage = resizedSurf.makeImageSnapshot()

  // Pad to 640×640
  paddedSurf!.getCanvas().clear(Skia.Color("black"))
  paddedSurf!.flush()
  paddedSurf!.getCanvas().drawImageCubic(resizedImage, dx, dy, CatmullRomCubicSampling.B, CatmullRomCubicSampling.C, paint)
  paddedSurf!.flush()
  const finalImage = paddedSurf!.makeImageSnapshot()

  // 3) Read 640×640 RGBA pixels
  const pixels = finalImage.readPixels(0, 0, {
    width: inputSize,
    height: inputSize,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Premul,
  })!

  // 4) Convert to Float32Array [1, 640, 640, 3] (RGB normalized to 0–1)
  const float32Data = new Float32Array(inputSize * inputSize * 3)
  for (let i = 0; i < inputSize * inputSize; i++) {
    const r = pixels[i * 4] / 255
    const g = pixels[i * 4 + 1] / 255
    const b = pixels[i * 4 + 2] / 255

    const baseIdx = i * 3
    float32Data[baseIdx + 0] = r
    float32Data[baseIdx + 1] = g
    float32Data[baseIdx + 2] = b
  }

  // Return NHWC tensor
  return { tensor: new Tensor("float32", float32Data, [1, inputSize, inputSize, 3]), originalWidth: ow, originalHeight: oh }
}

let session: InferenceSession | null = null
let tfLiteSession: boolean | null = null

export async function createInferenceSession() {
  if (session) {
    console.log("Inference session already exists.")
    return
  }
  // Check if there is model in the cache
  const targetPath = cacheDirectory + "bestfp16_nhwc.onnx"
  const fileInfo = await getInfoAsync(targetPath)

  if (!fileInfo.exists) {
    console.log("Model not found in cache, loading from assets...")
    const assets = await Asset.fromModule(require("@/../assets/model/bestfp16_nhwc.onnx"))
    await assets.downloadAsync()
    if (!assets.localUri) {
      throw new Error("ONNX asset was not downloaded to file:// path. Got: " + assets.localUri)
    }
    console.log("Copying ONNX model to:", targetPath)
    await copyAsync({
      from: assets.localUri,
      to: targetPath,
    })
    console.log("Model copied to cache directory.")
  }

  const modelUri = targetPath
  console.log(modelUri)
  if (!modelUri) {
    console.error("Model URI is not available. Ensure the asset is loaded correctly.")
    return
  }

  session = await InferenceSession.create(modelUri, {
    executionProviders: [
      {
        name: "xnnpack",
      },
    ],
    graphOptimizationLevel: "all",
    logSeverityLevel: 1,
  })
  console.log("Inference session for xnnpack created successfully.")
}

export async function createTFLiteInferenceSession() {
  if (tfLiteSession) {
    console.log("TFLite inference session already exists.")
    return
  }
  const targetPath = cacheDirectory + "birddetect_fp16.tflite"
  const fileInfo = await getInfoAsync(targetPath)

  if (!fileInfo.exists) {
    console.log("Model not found in cache, loading from assets...")
    const assets = await Asset.fromModule(require("@/../assets/model/birddetect_fp16.tflite"))
    await assets.downloadAsync()
    if (!assets.localUri) {
      throw new Error("ONNX asset was not downloaded to file:// path. Got: " + assets.localUri)
    }
    console.log("Copying ONNX model to:", targetPath)
    await copyAsync({
      from: assets.localUri,
      to: targetPath,
    })
    console.log("Model copied to cache directory.")
  }

  const modelUri = targetPath
  console.log(modelUri)
  if (!modelUri) {
    console.error("Model URI is not available. Ensure the asset is loaded correctly.")
    return
  }

  try {
    const modelUriWithFile = modelUri.replace("file:///", "")
    console.log("Loading TFLite model from:", modelUriWithFile)
    tfLiteSession = await BirdDetector.loadModel(modelUriWithFile)
    console.log("TFLite inference session created successfully.")
  } catch (e) {
    console.error("Error creating TFLite inference session:", e)
    throw new Error("Failed to create TFLite inference session")
  }
}

async function runModel(tensor: Tensor): Promise<[Tensor, number]> {
  if (!session) throw new Error("Session not loaded. Call loadClassificationModel() first.")

  const start = performance.now()
  try {
    const feeds: Record<string, Tensor> = {}
    feeds[session.inputNames[0]] = tensor
    const outputData = await session.run(feeds)
    const inferenceTime = performance.now() - start
    const output = outputData[session.outputNames[0]]
    return [output, inferenceTime]
  } catch (e) {
    console.error(e)
    throw new Error()
  }
}

type YoloDetectionResult = {
  detections: DetectionBox[]
  originalWidth: number
  originalHeight: number
}

type DetectionBox = {
  x1: number
  y1: number
  x2: number
  y2: number
  score: number
  classId: number
}

// Postprocess YOLO output
function postprocessYOLO(output: Tensor, confThreshold: number): DetectionBox[] {
  const raw = output.data as Float32Array // shape: [1, 300, 6]
  const boxes: DetectionBox[] = []

  for (let i = 0; i < raw.length; i += 6) {
    const score = raw[i + 4]
    if (score < confThreshold) continue

    boxes.push({
      x1: raw[i + 0],
      y1: raw[i + 1],
      x2: raw[i + 2],
      y2: raw[i + 3],
      score,
      classId: Math.round(raw[i + 5]),
    })
  }

  return boxes
}

export async function predictBirdDetectionYolo(imageUri: string, threshold = 0.25): Promise<YoloDetectionResult> {
  const { tensor, originalWidth, originalHeight } = await preProcessImage_YOLO_NHWC_SKIA(imageUri)
  const [output, inferenceTime] = await runModel(tensor)
  console.log(`Inference time: ${inferenceTime} ms`)

  const detections = postprocessYOLO(output, threshold)
  const scale = Math.min(inputSize / originalWidth, inputSize / originalHeight)
  const padX = (inputSize - originalWidth * scale) / 2
  const padY = (inputSize - originalHeight * scale) / 2

  console.log(`original size: ${originalWidth}x${originalHeight}`)

  const boxes = detections.map((box) => ({
    ...box,
    x1: Math.max(0, (box.x1 - padX) / scale),
    y1: Math.max(0, (box.y1 - padY) / scale),
    x2: Math.min(originalWidth, (box.x2 - padX) / scale),
    y2: Math.min(originalHeight, (box.y2 - padY) / scale),
  }))

  return {
    detections: boxes,
    originalWidth,
    originalHeight,
  }
}

export async function predictBirdDetectionTFLite(imageUri: string) {
  const base64 = await readAsStringAsync(imageUri, { encoding: EncodingType.Base64 })
  const bytes = Buffer.from(base64, "base64")
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)

  const result = await BirdDetector.detect(arrayBuffer)

  console.log("TFLite detection result:", result)
}
