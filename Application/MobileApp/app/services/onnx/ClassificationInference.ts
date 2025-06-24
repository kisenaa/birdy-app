import { copyAsync, cacheDirectory, getInfoAsync } from "expo-file-system"
import { Tensor, InferenceSession } from "onnxruntime-react-native"
import { Asset } from "expo-asset"
import performance from "react-native-performance"
import { readAsStringAsync, EncodingType } from "expo-file-system"
import { Skia, ColorType, AlphaType, CatmullRomCubicSampling, SkSurface, SkPaint } from "@shopify/react-native-skia"

let cropSurf: SkSurface | null = null
let paint: SkPaint | null = null

export function initSkia() {
  if (!cropSurf) {
    cropSurf = Skia.Surface.MakeOffscreen(224, 224)!
    paint = Skia.Paint()
    paint.setAntiAlias(true)
  }
}

export const preProcessImage_NCHW_Skia = async (imageUri: string) => {
  const info = await getInfoAsync(imageUri)
  if (!info.exists) throw new Error("File not found")

  // 1) Load into Skia.Image
  const base64 = await readAsStringAsync(imageUri, { encoding: EncodingType.Base64 })
  const skData = Skia.Data.fromBase64(base64)
  const image = Skia.Image.MakeImageFromEncoded(skData)!

  // 2) Resize shortest edge to 256 via Surface+Canvas
  const ow = image.width(),
    oh = image.height()
  const scale = 256 / Math.min(ow, oh)
  const w256 = Math.round(ow * scale),
    h256 = Math.round(oh * scale)

  console.log(h256, w256)
  const surf = Skia.Surface.MakeOffscreen(w256, h256)!
  surf
    .getCanvas()
    .drawImageRectCubic(
      image,
      { x: 0, y: 0, width: ow, height: oh },
      { x: 0, y: 0, width: w256, height: h256 },
      CatmullRomCubicSampling.B,
      CatmullRomCubicSampling.C,
      paint,
    )
  surf.flush()
  const resized = surf.makeImageSnapshot()

  // 3) Center‐crop 224×224
  const cx = Math.floor((w256 - 224) / 2),
    cy = Math.floor((h256 - 224) / 2)

  cropSurf!.getCanvas().clear(Skia.Color("transparent")) // Clear the canvas to avoid artifacts
  cropSurf!.flush()
  cropSurf!
    .getCanvas()
    .drawImageRectCubic(
      resized,
      { x: cx, y: cy, width: 224, height: 224 },
      { x: 0, y: 0, width: 224, height: 224 },
      CatmullRomCubicSampling.B,
      CatmullRomCubicSampling.C,
      paint,
    )
  cropSurf!.flush()
  const cropped = cropSurf!.makeImageSnapshot()

  // 4) Read exactly 224×224 pixels from the cropped image
  const pixels = cropped.readPixels(0, 0, {
    width: 224,
    height: 224,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Premul,
  })!

  // 5) Normalize into Float32Array NCHW
  const float32Data = new Float32Array(3 * 224 * 224)
  const mean = [0.485, 0.456, 0.406]
  const std = [0.229, 0.224, 0.225]

  for (let i = 0; i < 224 * 224; i++) {
    const r = pixels[i * 4]
    const g = pixels[i * 4 + 1]
    const b = pixels[i * 4 + 2]

    float32Data[0 * 224 * 224 + i] = (r / 255 - mean[0]) / std[0] // Red channel
    float32Data[1 * 224 * 224 + i] = (g / 255 - mean[1]) / std[1] // Green channel
    float32Data[2 * 224 * 224 + i] = (b / 255 - mean[2]) / std[2] // Blue channel
  }

  return new Tensor("float32", float32Data, [1, 3, 224, 224])
}

export const preProcessImage_NHWC_SKIA = async (imageUri: string) => {
  const info = await getInfoAsync(imageUri)
  if (!info.exists) throw new Error("File not found")

  // 1) Load into Skia.Image
  const base64 = await readAsStringAsync(imageUri, { encoding: EncodingType.Base64 })
  const skData = Skia.Data.fromBase64(base64)
  const image = Skia.Image.MakeImageFromEncoded(skData)!

  // 2) Resize shortest edge to 256 via Surface+Canvas
  const ow = image.width(),
    oh = image.height()
  const scale = 256 / Math.min(ow, oh)
  const w256 = Math.round(ow * scale),
    h256 = Math.round(oh * scale)

  console.log(h256, w256)
  const surf = Skia.Surface.MakeOffscreen(w256, h256)!
  surf
    .getCanvas()
    .drawImageRectCubic(
      image,
      { x: 0, y: 0, width: ow, height: oh },
      { x: 0, y: 0, width: w256, height: h256 },
      CatmullRomCubicSampling.B,
      CatmullRomCubicSampling.C,
      paint,
    )
  surf.flush()
  const resized = surf.makeImageSnapshot()

  // 3) Center‐crop 224×224
  const cx = Math.floor((w256 - 224) / 2),
    cy = Math.floor((h256 - 224) / 2)

  cropSurf!.getCanvas().clear(Skia.Color("transparent")) // Clear the canvas to avoid artifacts
  cropSurf!.flush()
  cropSurf!
    .getCanvas()
    .drawImageRectCubic(
      resized,
      { x: cx, y: cy, width: 224, height: 224 },
      { x: 0, y: 0, width: 224, height: 224 },
      CatmullRomCubicSampling.B,
      CatmullRomCubicSampling.C,
      paint,
    )
  cropSurf!.flush()
  const cropped = cropSurf!.makeImageSnapshot()

  // 4) Read exactly 224×224 pixels from the cropped image
  const pixels = cropped.readPixels(0, 0, {
    width: 224,
    height: 224,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Premul,
  })!

  // 5) Normalize into Float32Array NHWC
  const float32DataNHWC = new Float32Array(224 * 224 * 3)
  const mean = [0.485, 0.456, 0.406]
  const std = [0.229, 0.224, 0.225]

  for (let i = 0; i < 224 * 224; i++) {
    const r = pixels[i * 4] / 255
    const g = pixels[i * 4 + 1] / 255
    const b = pixels[i * 4 + 2] / 255

    const baseIdx = i * 3
    float32DataNHWC[baseIdx + 0] = (r - mean[0]) / std[0] // R
    float32DataNHWC[baseIdx + 1] = (g - mean[1]) / std[1] // G
    float32DataNHWC[baseIdx + 2] = (b - mean[2]) / std[2] // B
  }

  // Return NHWC Tensor: [1, 224, 224, 3]
  return new Tensor("float32", float32DataNHWC, [1, 224, 224, 3])
}

let session: InferenceSession | null = null
export async function createInferenceSession() {
  // Check if there is model in the cache
  const targetPath = cacheDirectory + "baseQUInt8_quantized_dynamic.onnx"
  const fileInfo = await getInfoAsync(targetPath)

  if (!fileInfo.exists) {
    console.log("Model not found in cache, loading from assets...")
    const assets = await Asset.fromModule(require("@/../assets/model/baseQUInt8_quantized_dynamic.onnx"))
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
  console.log("Inference session created successfully.")
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

//The softmax transforms values to be between 0 and 1
function softmax(resultArray: number[]): number[] {
  const largestNumber = Math.max(...resultArray)
  const exps = resultArray.map((v) => Math.exp(v - largestNumber))
  const sumOfExp = exps.reduce((a, b) => a + b)
  return exps.map((v) => v / sumOfExp)
}

export async function predictImageClassification(imageUri: string) {
  const t0 = performance.now()
  const inputTensor = await preProcessImage_NHWC_SKIA(imageUri)
  console.log(performance.now() - t0, "ms")
  const [outputTensor, inferenceTime] = await runModel(inputTensor)

  // Assuming the model outputs logits for 1000 classes
  const outputArray = Array.from(outputTensor.data as Float32Array)
  const softmaxOutput = softmax(outputArray)

  // Find the class with the highest probability
  const maxIndex = softmaxOutput.indexOf(Math.max(...softmaxOutput))
  const confidence = softmaxOutput[maxIndex]

  return { maxIndex, confidence, inferenceTime }
}
