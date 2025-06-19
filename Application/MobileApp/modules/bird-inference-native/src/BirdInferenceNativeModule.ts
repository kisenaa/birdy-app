import { NativeModule, requireNativeModule } from "expo"

import { BirdInferenceNativeModuleEvents } from "./BirdInferenceNative.types"

declare class BirdInferenceNativeModule extends NativeModule<BirdInferenceNativeModuleEvents> {
  PI: number
  hello(): string
  helloFromCpp(): string
  setValueAsync(value: string): Promise<void>
}

// This call loads the native module object from the JSI.
export default requireNativeModule<BirdInferenceNativeModule>("BirdInferenceNative")
