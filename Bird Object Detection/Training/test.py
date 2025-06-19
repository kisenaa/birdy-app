import tensorflow as tf

interpreter = tf.lite.Interpreter(model_path="./best_saved_model/best_float32.tflite")
interpreter.allocate_tensors()


details = interpreter.get_tensor_details()
for d in details:
    if 400 in d['shape']:
        print("Tensor with 400 found:", d['name'], d['shape'])