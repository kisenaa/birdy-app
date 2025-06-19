#include "jni.h"
#include <android/log.h>

#ifdef __cplusplus
extern "C" {
#endif

jstring sayHello(JNIEnv* env, jclass clazz) {
    return env->NewStringUTF("hello from fast native.cpp22");
}

#ifdef __cplusplus
}
#endif
