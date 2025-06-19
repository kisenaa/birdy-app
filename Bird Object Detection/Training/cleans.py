import onnx
import onnx_graphsurgeon as gs


# Load the model
model_path = "best.onnx"
model = onnx.load(model_path)
graph = gs.import_onnx(model)

'''
# Copy IR and opset version from original
exported_model.ir_version = original_model.ir_version
exported_model.opset_import.clear()
exported_model.opset_import.extend(original_model.opset_import)
'''
# Cleanup and export
graph.cleanup()

try:
    onnx.checker.check_model(model)
    print("✅ Model passed ONNX validation.")
except onnx.checker.ValidationError as e:
    print("❌ Model failed ONNX validation:")
    print(e)

print("IR version:", model.ir_version)
for opset in model.opset_import:
    print("Opset version for domain '{}': {}".format(opset.domain, opset.version))

exported_model = gs.export_onnx(graph)

# Copy IR and opset version from original
exported_model.ir_version = 10
#del exported_model.opset_import[:]
#exported_model.opset_import.extend(model.opset_import)

try:
    onnx.checker.check_model(exported_model)
    print("✅ Model passed ONNX validation.")
except onnx.checker.ValidationError as e:
    print("❌ Model failed ONNX validation:")
    print(e)


print("IR version:", exported_model.ir_version)
for opset in exported_model.opset_import:
    print("Opset version for domain '{}': {}".format(opset.domain, opset.version))

onnx.save(exported_model, "best.onnx")

