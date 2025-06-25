/* eslint-disable @typescript-eslint/no-unused-vars */
// metro.config.js
const { getDefaultConfig } = require("expo/metro-config")
const { wrapWithReanimatedMetroConfig } = require("react-native-reanimated/metro-config")
const url = require("url")

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname)
config.transformer.getTransformOptions = async () => ({
  transform: { inlineRequires: true },
})
/*
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  buffer: require.resolve("buffer"),
  stream: require.resolve("stream-browserify"),
  util: require.resolve("util"),
}
*/
/** @type {import('expo/metro-config').MetroConfig} */
const wrapped = wrapWithReanimatedMetroConfig(config)

wrapped.server = {
  ...wrapped.server,
  enhanceMiddleware: (metroMiddleware, server) => {
    return (req, res, next) => {
      // sniff out the real asset path in unstable_path
      const parsed = url.parse(req.url, true)
      const assetPath = parsed.query.unstable_path
      if (typeof assetPath === "string" && /\.(onnx|ort|tflite|tfl)(\?|$)/.test(assetPath)) {
        console.log("» Forcing octet-stream on", assetPath)

        // Patch setHeader so *any* Content-Type Metro sets gets overridden
        const originalSetHeader = res.setHeader.bind(res)
        res.setHeader = (name, value) => {
          if (typeof name === "string" && name.toLowerCase() === "content-type") {
            value = "application/octet-stream"
          }
          return originalSetHeader(name, value)
        }
      }
      return metroMiddleware(req, res, next)
    }
  },
}

wrapped.resolver.sourceExts.push("cjs")
wrapped.resolver.assetExts.push("png", "jpg", "jpeg")
wrapped.resolver.assetExts.push("onnx", "ort", "tflite", "tfl")

module.exports = wrapped
