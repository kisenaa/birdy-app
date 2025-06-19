
cmake_minimum_required(VERSION 3.22.1)
set (CMAKE_CXX_STANDARD 20)

project("birdinference_native")

set (PACKAGE_NAME birdinference_native)
set(CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} -Wl,--gc-sections")

find_library(
        TFLITE
        tensorflowlite_jni
        PATHS "${CMAKE_SOURCE_DIR}/lib/litert/jni/${ANDROID_ABI}"
        NO_DEFAULT_PATH
        NO_CMAKE_FIND_ROOT_PATH
)

find_library(
        TFLITE_GPU
        tensorflowlite_gpu_jni
        PATHS "${CMAKE_SOURCE_DIR}/lib/litert/jni/${ANDROID_ABI}"
        NO_DEFAULT_PATH
        NO_CMAKE_FIND_ROOT_PATH
)

add_library(${CMAKE_PROJECT_NAME} SHARED
        # List C/C++ source files with relative paths to this CMakeLists.txt.
        birdinference_native.cpp
        birdDetection.cpp
        HybridBirdDetector.cpp
        HybridBirdDetector.hpp)

include_directories(
  ${CMAKE_SOURCE_DIR}/../../../../nitrogen/generated/android/
)

target_include_directories(
  ${PACKAGE_NAME}
  PRIVATE
  "./"
  "${CMAKE_SOURCE_DIR}/lib/litert/headers/"
  "${CMAKE_SOURCE_DIR}/lib/litert/headers/external/org_tensorflow/"
)

include(${CMAKE_SOURCE_DIR}/../../../../nitrogen/generated/android/birdinference_native+autolinking.cmake)
set_target_properties(${PACKAGE_NAME} PROPERTIES LINKER_LANGUAGE CXX)

# Add NitroModules include path
#include_directories(
#  ${CMAKE_SOURCE_DIR}/../../../../../../node_modules/react-native-nitro-modules/android/build/headers/nitromodules
#)

# Find NitroModules library (adjust path if needed)
#add_library(NitroModules SHARED IMPORTED)
#set_target_properties(NitroModules PROPERTIES
#  IMPORTED_LOCATION
#  ${CMAKE_SOURCE_DIR}/../../../../../../node_modules/react-native-nitro-modules/android/build/intermediates/cmake/debug/obj/${ANDROID_ABI}/libNitroModules.so
#)


# Specifies libraries CMake should link to your target library. You
# can link libraries from various origins, such as libraries defined in this
# build script, prebuilt third-party libraries, or Android system libraries.
target_link_libraries(${CMAKE_PROJECT_NAME}
    # List libraries link to the target library
    android
    log
    ${TFLITE}
    ${TFLITE_GPU})
