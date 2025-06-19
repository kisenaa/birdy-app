from onnxconverter_common import convert_float_to_float16
import onnx

# Load the original FP32 ONNX model
model_fp32 = onnx.load("./quant/basefp32_slimmed.onnx")

# Convert to FP16 safely
model_fp16 = convert_float_to_float16(model_fp32, keep_io_types=True)

# Save the converted FP16 model
onnx.save(model_fp16, "./quant/basefp16_slimmed.onnx")
