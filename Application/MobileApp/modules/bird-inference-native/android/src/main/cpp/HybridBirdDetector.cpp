#include "HybridBirdDetector.hpp"
#include <NitroModules/Promise.hpp>
#include "tflite/c/c_api.h"
#include "tflite/c/c_api_experimental.h"

#include "tflite/delegates/gpu/delegate.h"
#include "tflite/delegates/gpu/delegate_options.h"
#include "tflite/delegates/nnapi/nnapi_delegate_c_api.h"
#include <iostream>
#include "android/log.h"

namespace margelo::nitro::birdDetection {
    std::shared_ptr<Promise<bool>> HybridBirdDetector::loadModel(const std::string& fileURI) {
        return Promise<bool>::async([this, fileURI]() {
            _model = TfLiteModelCreateFromFile(fileURI.data());
            if (_model == nullptr) {
                __android_log_print(ANDROID_LOG_INFO, "BirdInference", "Failed to create model");
                throw std::runtime_error("Failed to create TFLite model");
            }

            _options = TfLiteInterpreterOptionsCreate();

            // Create interpreter WITHOUT delegate first
            _interpreter = TfLiteInterpreterCreate(_model, _options);
            if (!_interpreter) {
                __android_log_print(ANDROID_LOG_INFO, "BirdInference", "Failed to create interpreter");
                throw std::runtime_error("Failed to create TFLite interpreter");
            }

            // Resize input before applying delegate
            const int inputIndex = 0;
            const int input_dims[] = {1, 640, 640, 3};
            if (TfLiteInterpreterResizeInputTensor(_interpreter, inputIndex, input_dims, 4) != kTfLiteOk) {
                __android_log_print(ANDROID_LOG_INFO, "BirdInference", "Failed to resize input tensor");
                throw std::runtime_error("Failed to resize input tensor");
            }

            if (TfLiteInterpreterAllocateTensors(_interpreter) != kTfLiteOk) {
                __android_log_print(ANDROID_LOG_INFO, "BirdInference", "Failed to allocate tensors");
                throw std::runtime_error("Failed to allocate tensors");
            }

            TfLiteTensor* inputTensor = TfLiteInterpreterGetInputTensor(_interpreter, inputIndex);
            if (inputTensor && inputTensor->dims) {
                __android_log_print(ANDROID_LOG_INFO, "BirdInference", "Resized input shape: [%d, %d, %d, %d]",
                                    inputTensor->dims->data[0],
                                    inputTensor->dims->data[1],
                                    inputTensor->dims->data[2],
                                    inputTensor->dims->data[3]);
            }

            // Create GPU delegate after resizing
            TfLiteGpuDelegateOptionsV2 delegateOptions = TfLiteGpuDelegateOptionsV2Default();
            delegateOptions.inference_preference = TFLITE_GPU_INFERENCE_PREFERENCE_SUSTAINED_SPEED;
            delegateOptions.inference_priority1 = TFLITE_GPU_INFERENCE_PRIORITY_MIN_LATENCY;
            delegateOptions.inference_priority2 = TFLITE_GPU_INFERENCE_PRIORITY_AUTO;
            delegateOptions.inference_priority3 = TFLITE_GPU_INFERENCE_PRIORITY_AUTO;
            delegateOptions.is_precision_loss_allowed = true;

            TfLiteDelegate* delegate = TfLiteGpuDelegateV2Create(&delegateOptions);
            if (!delegate) {
                __android_log_print(ANDROID_LOG_INFO, "BirdInference", "Failed to create GPU delegate");
                throw std::runtime_error("Failed to create delegate GPU");
            }

            // Apply delegate to existing interpreter
            if (TfLiteInterpreterModifyGraphWithDelegate(_interpreter, delegate) != kTfLiteOk) {
                __android_log_print(ANDROID_LOG_INFO, "BirdInference", "Failed to apply GPU delegate");
                throw std::runtime_error("Failed to apply GPU delegate");
            }

            __android_log_print(ANDROID_LOG_INFO, "BirdInference", "Model loaded successfully");
            return true;
        });
    }


  
  std::shared_ptr<Promise<std::vector<std::string>>> HybridBirdDetector::detect(const std::shared_ptr<ArrayBuffer>& image) {
    std::vector<std::string> labels = { "sparrow", "eagle" };
    auto promise = Promise<std::vector<std::string>>::create();

    // Assuming RGBA input (640x640x4)
    const uint8_t* rgba = image->data();
    float* input = reinterpret_cast<float*>(TfLiteInterpreterGetInputTensor(_interpreter, 0)->data.raw);

    for (int i = 0; i < 640 * 640; ++i) {
      const uint8_t* pixel = rgba + i * 4;
      input[i * 3 + 0] = pixel[0] / 255.0f; // R
      input[i * 3 + 1] = pixel[1] / 255.0f; // G
      input[i * 3 + 2] = pixel[2] / 255.0f; // B
    }

    promise->resolve(labels);
    return promise;
  }

  HybridBirdDetector::~HybridBirdDetector() {
      if (_interpreter) {
          TfLiteInterpreterDelete(_interpreter);
          _interpreter = nullptr;
      }
      if (_options) {
          TfLiteInterpreterOptionsDelete(_options);
      }
      if(_model) {
          TfLiteModelDelete(_model);
          _model = nullptr;
      }
  };
}

