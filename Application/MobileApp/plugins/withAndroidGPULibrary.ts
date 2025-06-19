import { ConfigPlugin, AndroidConfig, withAndroidManifest } from "@expo/config-plugins"
import { ManifestApplication, prefixAndroidKeys } from "@expo/config-plugins/build/android/Manifest"

function addUsesNativeLibraryItemToMainApplication(
  mainApplication: AndroidConfig.Manifest.ManifestApplication & {
    "uses-native-library"?: AndroidConfig.Manifest.ManifestUsesLibrary[]
  },
  item: { name: string; required?: boolean },
): ManifestApplication {
  let existingMetaDataItem
  const newItem = {
    $: prefixAndroidKeys(item),
  } as AndroidConfig.Manifest.ManifestUsesLibrary

  if (mainApplication["uses-native-library"] !== undefined) {
    existingMetaDataItem = mainApplication["uses-native-library"].filter((e) => e.$["android:name"] === item.name)
    if (existingMetaDataItem.length > 0 && existingMetaDataItem[0] !== undefined) existingMetaDataItem[0].$ = newItem.$
    else mainApplication["uses-native-library"].push(newItem)
  } else {
    mainApplication["uses-native-library"] = [newItem]
  }
  return mainApplication
}

export const withAndroidGpuLibraries: ConfigPlugin = (cfg) =>
  withAndroidManifest(cfg, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults)
    const gpuLibraries = [
      { name: "libOpenCL-pixel.so", required: false },
      { name: "libOpenCL.so", required: false },
      { name: "libPVROCL.so", required: false },
      { name: "libEGL.so", required: false },
      { name: "libGLES_mali.so", required: false },
      { name: "libGLESv1_CM.so", required: false },
      { name: "libGLESv2.so", required: false },
      { name: "libGLESv3.so", required: false },
      { name: "libvulkan.so", required: false },
    ]

    gpuLibraries.forEach((lib) => {
      addUsesNativeLibraryItemToMainApplication(mainApplication, lib)
    })
    return config
  })

export default withAndroidGpuLibraries
