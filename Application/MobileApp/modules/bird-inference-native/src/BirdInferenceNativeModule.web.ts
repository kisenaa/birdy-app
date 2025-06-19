import { registerWebModule, NativeModule } from "expo"

import { ChangeEventPayload } from "./BirdInferenceNative.types"

type BirdInferenceNativeModuleEvents = {
  onChange: (params: ChangeEventPayload) => void
}

class BirdInferenceNativeModule extends NativeModule<BirdInferenceNativeModuleEvents> {
  PI = Math.PI
  async setValueAsync(value: string): Promise<void> {
    this.emit("onChange", { value })
  }
  hello() {
    return "Hello world! 👋"
  }
}

export default registerWebModule(BirdInferenceNativeModule, "BirdInferenceNativeModule")
