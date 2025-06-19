export type OnLoadEventPayload = {
  url: string
}

export type BirdInferenceNativeModuleEvents = {
  onChange: (params: ChangeEventPayload) => void
}

export type ChangeEventPayload = {
  value: string
}
