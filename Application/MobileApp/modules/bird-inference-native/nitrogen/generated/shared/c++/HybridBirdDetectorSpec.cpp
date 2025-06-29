///
/// HybridBirdDetectorSpec.cpp
/// This file was generated by nitrogen. DO NOT MODIFY THIS FILE.
/// https://github.com/mrousavy/nitro
/// Copyright © 2025 Marc Rousavy @ Margelo
///

#include "HybridBirdDetectorSpec.hpp"

namespace margelo::nitro::birdDetection {

  void HybridBirdDetectorSpec::loadHybridMethods() {
    // load base methods/properties
    HybridObject::loadHybridMethods();
    // load custom methods/properties
    registerHybrids(this, [](Prototype& prototype) {
      prototype.registerHybridMethod("loadModel", &HybridBirdDetectorSpec::loadModel);
      prototype.registerHybridMethod("detect", &HybridBirdDetectorSpec::detect);
      prototype.registerHybridMethod("getStr", &HybridBirdDetectorSpec::getStr);
    });
  }

} // namespace margelo::nitro::birdDetection
