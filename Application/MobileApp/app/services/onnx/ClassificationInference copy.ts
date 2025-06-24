import { copyAsync, cacheDirectory, getInfoAsync } from "expo-file-system"
import { manipulateAsync, SaveFormat } from "expo-image-manipulator"
import { decode as decodeBase64 } from "base64-arraybuffer"
import { decode as decodeJpeg } from "jpeg-js"
import { Tensor, InferenceSession } from "onnxruntime-react-native"
import { Asset } from "expo-asset"
import performance from "react-native-performance"

const TARGET_SIZE = 224

export const preProcessImage_NCHW = async (imageUri: string) => {
  const fileInfo = await getInfoAsync(imageUri)
  if (!fileInfo.exists) throw new Error("File does not exist")

  // Step 1: Resize and get base64 JPEG
  console.log(imageUri)
  console.log(fileInfo)
  const t0 = performance.now()
  const manipulated = await manipulateAsync(imageUri, [{ resize: { width: TARGET_SIZE, height: TARGET_SIZE } }], {
    base64: true,
    compress: 1,
    format: undefined,
  })
  console.log("Image manipulation took:", performance.now() - t0, "ms")

  // Step 2: Decode base64 → RGBA Uint8Array
  const rawBuffer = decodeBase64(manipulated.base64!)
  const { data, width, height } = decodeJpeg(new Uint8Array(rawBuffer)) // data = RGBA

  // Step 3–6: Directly normalize into a Float32Array in [C,H,W] order
  const float32Data = new Float32Array(3 * width * height)

  const mean = [0.485, 0.456, 0.406]
  const std = [0.229, 0.224, 0.225]

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]

    float32Data[0 * width * height + i] = (r / 255 - mean[0]) / std[0] // Red channel
    float32Data[1 * width * height + i] = (g / 255 - mean[1]) / std[1] // Green channel
    float32Data[2 * width * height + i] = (b / 255 - mean[2]) / std[2] // Blue channel
  }

  const shape = [1, 3, height, width] // NCHW
  const inputTensor = new Tensor("float32", float32Data, shape)
  return inputTensor
}

export const preProcessImage_NHWC = async (imageUri: string) => {
  const fileInfo = await getInfoAsync(imageUri)
  if (!fileInfo.exists) throw new Error("File does not exist")

  // Step 1: Resize and get base64 JPEG
  const manipulated = await manipulateAsync(imageUri, [{ resize: { width: TARGET_SIZE, height: TARGET_SIZE } }], {
    base64: true,
    compress: 1,
    format: undefined,
  })

  // Step 2: Decode base64 → RGBA Uint8Array
  const rawBuffer = decodeBase64(manipulated.base64!)
  const { data, width, height } = decodeJpeg(new Uint8Array(rawBuffer)) // data = RGBA

  // Step 3: Separate R, G, B channels
  const R: number[] = [],
    G: number[] = [],
    B: number[] = []

  for (let i = 0; i < data.length; i += 4) {
    R.push(data[i]) // Red
    G.push(data[i + 1]) // Green
    B.push(data[i + 2]) // Blue
    // Skip Alpha (data[i + 3])
  }

  const numPixels = width * height

  // Step 4: Interleave in pixel-major order: [H, W, C]
  const interleavedData: number[] = []
  for (let i = 0; i < numPixels; i++) {
    interleavedData.push(R[i], G[i], B[i])
  }

  // Step 5: Normalize to Float32 (0–1)
  const float32Data = new Float32Array(interleavedData.length)
  for (let i = 0; i < interleavedData.length; i++) {
    float32Data[i] = interleavedData[i] / 255
  }

  // Step 6: Apply mean/std normalization per channel
  const mean = [0.485, 0.456, 0.406]
  const std = [0.229, 0.224, 0.225]

  for (let idx = 0; idx < float32Data.length; idx++) {
    const c = idx % 3 // channel: 0=R,1=G,2=B
    float32Data[idx] = (float32Data[idx] - mean[c]) / std[c]
  }

  const shape = [1, height, width, 3] // [N, H, W, C]
  return new Tensor("float32", float32Data, shape)
}

const localUri: string | null = null
let session: InferenceSession | null = null

/*
export async function loadClassificationModel() {
  console.log("Loading Dinov2 classification model...")
  if (localUri) {
    return
  }
  const dinov2ClassificationAsset = Asset.fromModule(require("../../../assets/model/dinov2_classify_slimmed.onnx"))

  // Asset must be downloaded to get `localUri` as file://
  await dinov2ClassificationAsset.downloadAsync()

  if (!dinov2ClassificationAsset.localUri || !dinov2ClassificationAsset.localUri.startsWith("file://")) {
    throw new Error("ONNX asset was not downloaded to file:// path. Got: " + dinov2ClassificationAsset.localUri)
  }

  const rawUri = dinov2ClassificationAsset.localUri
  if (!rawUri) throw new Error("Could not resolve local asset URI")

  // Copy to FileSystem cache directory so ONNXRuntime can read it as file://
  const targetPath = cacheDirectory + "dinov2.onnx"
  const fileInfo = await getInfoAsync(targetPath)

  if (!fileInfo.exists) {
    console.log("Copying ONNX model to:", targetPath)
    await copyAsync({
      from: rawUri,
      to: targetPath,
    })
  }
  localUri = targetPath
  console.log("Model loaded from:", localUri)
}
*/

export async function createInferenceSession() {
  // Check if there is model in the cache
  const targetPath = cacheDirectory + "dinov2fp16.onnx"
  const fileInfo = await getInfoAsync(targetPath)

  if (!fileInfo.exists) {
    console.log("Model not found in cache, loading from assets...")
    const assets = await Asset.fromModule(require("@/../assets/model/modelfp16.onnx"))
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
        name: "nnapi",
        useNCHW: true,
      },
    ],
    graphOptimizationLevel: "all",
    logSeverityLevel: 1,
  })
  console.log("Inference session created successfully.")
}

/*
const cachedModelPath = `${cacheDirectory}dinov2_classify.onnx`

const cachedInfo = await getInfoAsync(cachedModelPath)
if (!cachedInfo.exists) {
  await copyAsync({
    from: dinov2ClassificationAsset.localUri || dinov2ClassificationAsset.uri,
    to: cachedModelPath,
  })
}
const session = await InferenceSession.create(cachedModelPath, {
  executionProviders: [
    {
      name: "nnapi",
      useNCHW: true,
    },
  ],
  graphOptimizationLevel: "all",
  logSeverityLevel: 1,
})
*/

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
  const inputTensor = await preProcessImage_NCHW(imageUri)
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
