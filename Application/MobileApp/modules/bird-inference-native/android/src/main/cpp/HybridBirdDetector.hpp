// src/native/HybridBirdDetector.hpp
#pragma once

#include "HybridBirdDetectorSpec.hpp"
#include "tflite/c/c_api.h"


struct Buffer {
    void* data;
    size_t size;
};

namespace margelo::nitro::birdDetection
{
  class HybridBirdDetector final : public HybridBirdDetectorSpec
  {
  public:
    // Call the base constructor to set up the JS “this” tag
    HybridBirdDetector() : HybridObject(TAG) {
        _interpreter = nullptr;
        _model = nullptr;
        _options = nullptr;
    }

    ~HybridBirdDetector();

    // ─── Implement the spec methods ────────────────────────────────────────────
    std::shared_ptr<Promise<bool>> loadModel(const std::string& fileURI) override;

    std::shared_ptr<Promise<std::vector<std::string>>> detect(const std::shared_ptr<ArrayBuffer> &image) override;

    std::string getStr() override
    {
      return "HybridBirdDetector";
    }
  private:
      TfLiteInterpreter* _interpreter;
      TfLiteModel* _model;
      TfLiteInterpreterOptions* _options;
  };
} // namespace
