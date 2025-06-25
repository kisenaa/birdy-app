// Reexport the native module. On web, it will be resolved to BirdInferenceNativeModule.web.ts
// and on native platforms to BirdInferenceNativeModule.ts
//import { NitroModules } from "react-native-nitro-modules"
import { BirdDetector as BirdDetectorType } from "./src/BirdDetector.nitro"
export { default } from "./src/BirdInferenceNativeModule"
export * from "./src/BirdInferenceNative.types"

//export const BirdDetector = NitroModules.createHybridObject<BirdDetectorType>("BirdDetector")
