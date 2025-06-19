import * as FileSystem from "expo-file-system"

export async function uploadImageToSpaceClassification(imageUri: string) {
  console.log("Uploading image to classification space:", imageUri)
  const uploadId = Math.random().toString(36).slice(2)
  const uploadUrl = `https://kisenaa-indonesian-bird-classification.hf.space/gradio_api/upload?upload_id=${uploadId}`

  // Read file as binary
  const fileInfo = await FileSystem.getInfoAsync(imageUri)
  if (!fileInfo.exists) throw new Error("File does not exist")

  const fileName = imageUri.split("/").pop() || "image.jpg"
  const fileType = fileName.endsWith(".png") ? "image/png" : "image/jpeg"

  const formData = new FormData()
  formData.append("files", {
    uri: imageUri,
    name: fileName,
    type: fileType,
  } as any)

  const uploadResp = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })

  const uploadedPath = await uploadResp.json()
  return Array.isArray(uploadedPath) ? uploadedPath[0] : uploadedPath
}

export async function uploadImageToSpaceDetection(imageUri: string) {
  const uploadId = Math.random().toString(36).slice(2)
  const uploadUrl = `https://kisenaa-bird-detection.hf.space/gradio_api/upload?upload_id=${uploadId}`

  // Read file as binary
  const fileInfo = await FileSystem.getInfoAsync(imageUri)
  if (!fileInfo.exists) throw new Error("File does not exist")

  const fileName = imageUri.split("/").pop() || "image.jpg"
  const fileType = fileName.endsWith(".png") ? "image/png" : "image/jpeg"

  const formData = new FormData()
  formData.append("files", {
    uri: imageUri,
    name: fileName,
    type: fileType,
  } as any)

  const uploadResp = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })

  const uploadedPath = await uploadResp.json()
  return Array.isArray(uploadedPath) ? uploadedPath[0] : uploadedPath
}

export async function predictBirdClassification(uploadedPath: string) {
  const payload = {
    data: [
      {
        path: uploadedPath,
        meta: { _type: "gradio.FileData" },
      },
    ],
  }

  const postUrl = "https://kisenaa-indonesian-bird-classification.hf.space/gradio_api/call/predict"
  const postResp = await fetch(postUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const { event_id } = await postResp.json()

  const getUrl = `https://kisenaa-indonesian-bird-classification.hf.space/gradio_api/call/predict/${event_id}`

  // Poll for result
  while (true) {
    const getResp = await fetch(getUrl)
    const text = await getResp.text()
    console.log("Received response:", text)
    if (!text.trim()) {
      await new Promise((res) => setTimeout(res, 1000))
      continue
    }
    if (text.startsWith("event: complete")) {
      const line = text.split("\n").find((l) => l.startsWith("data: "))
      if (line) {
        const result = JSON.parse(line.slice("data: ".length))
        return result
      }
      break
    } else if (text.startsWith("event: error")) {
      throw new Error("Prediction error: " + text)
    } else {
      await new Promise((res) => setTimeout(res, 1000))
    }
  }
}

export async function predictBirdDetection(uploadedPath: string) {
  const payload = {
    data: [
      "Image",
      {
        path: uploadedPath,
        meta: { _type: "gradio.FileData" },
      },
      null,
      0.5, // confidence threshold
      0.45, // IoU threshold
      30, //Max number of detections
    ],
  }

  const postUrl = "https://kisenaa-bird-detection.hf.space/gradio_api/call/yolo_inference"
  const postResp = await fetch(postUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const { event_id } = await postResp.json()

  const getUrl = `https://kisenaa-bird-detection.hf.space/gradio_api/call/yolo_inference/${event_id}`

  // Poll for result
  while (true) {
    console.log("Polling for result...")

    const getResp = await fetch(getUrl)
    const text = await getResp.text()
    console.log("Received response:", text)

    const trimmed = text.trim()

    // 1) Error case:
    if (trimmed.includes("event: error")) {
      throw new Error("Prediction error: " + trimmed)
    }

    // 2) Complete case:
    if (trimmed.includes("event: complete")) {
      // Split into two parts: before and after "event: complete"
      const [, afterComplete] = trimmed.split("event: complete")

      if (!afterComplete) {
        console.warn("No payload after complete.")
        return null
      }

      // Find the data: line in the 'afterComplete' chunk
      const dataLine = afterComplete
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.startsWith("data:"))

      if (!dataLine) {
        console.warn("Complete event but no data: line found")
        return null
      }

      // Parse just the JSON array
      const jsonText = dataLine.slice("data:".length).trim()
      let parsed: any
      try {
        parsed = JSON.parse(jsonText)
      } catch (err) {
        console.error("Failed to parse JSON:", err, "\nRaw:", jsonText)
        return null
      }

      if (!Array.isArray(parsed)) {
        console.warn("Expected an array but got:", parsed)
        return null
      }

      // Remove any nulls
      const filtered = parsed.filter((x) => x !== null)
      console.log("Detection result array:", filtered)
      return filtered
    }

    // 3) Still waiting…
    console.log("No complete/error yet, retrying in 1s…")
    await new Promise((r) => setTimeout(r, 1_000))
  }
}
