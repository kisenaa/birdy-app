#include <jni.h>
#include <string>
#include <android/log.h>
#include "birdinference_nativeOnLoad.hpp"
// extern "C"
// JNIEXPORT jstring JNICALL
// Java_expo_modules_birdinferencenative_BirdInferenceNativeModule_sayHelloFromCpp(
//        JNIEnv* env,
//        jobject /* this */
//) {
//    std::string hello = "hello world from C++";
//    return env->NewStringUTF(hello.c_str());
//}

// Java_{package_path}_{class_name}_{method_name}
// BirdDetection.cpp
#ifdef __cplusplus
extern "C" {
#endif

    jstring sayHello(JNIEnv* env, jclass clazz);

#ifdef __cplusplus
}
#endif


static JNINativeMethod methods[] = {
        {"sayHelloFromCpp", "()Ljava/lang/String;", reinterpret_cast<void*>(sayHello)}
};

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
    JNIEnv* env;
    if (vm->GetEnv(reinterpret_cast<void**>(&env), JNI_VERSION_1_6) != JNI_OK) {
        return JNI_ERR;
    }

    jclass clazz = env->FindClass("expo/modules/birdinferencenative/BirdInferenceNativeModule");
    if (clazz == nullptr) {
        __android_log_print(ANDROID_LOG_ERROR, "BirdInference", "Failed to find class");
        return JNI_ERR;
    }

    if (env->RegisterNatives(clazz, methods, sizeof(methods)/sizeof(JNINativeMethod)) != JNI_OK) {
        __android_log_print(ANDROID_LOG_ERROR, "BirdInference", "RegisterNatives failed");
        return JNI_ERR;
    }

    margelo::nitro::birdDetection::initialize(vm);

    return JNI_VERSION_1_6;
}

