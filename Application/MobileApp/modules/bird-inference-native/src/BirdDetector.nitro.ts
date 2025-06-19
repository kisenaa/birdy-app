import { type HybridObject } from "react-native-nitro-modules"

export interface BirdDetector
  extends HybridObject<{
    ios: "c++"
    android: "c++"
  }> {
  /**
   * @param fileURI path to the model file in the app's assets
   */
  loadModel(fileURI: string): Promise<boolean>

  /**
   * @param image raw RGBA or grayscale pixels
   */
  detect(image: ArrayBuffer): Promise<string[]>

  /**
   * @returns string representation of the model
   */
  getStr(): string
}
