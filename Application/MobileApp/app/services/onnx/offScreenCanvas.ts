/* eslint-disable @typescript-eslint/no-unused-vars */
// For React Native Skia to use GPU acceleration on node,
// We need to provide a polyfill for the OffscreenCanvas API on node
// Below is our implementation using [headless-gl](https://github.com/stackgl/headless-gl).
// Here we use gl for headless webgl support.
import GL from "gl"

// Now we need to provide polyfill for WebGLRenderingContext and OffscreenCanvas
// for Skia to be able to leverage WebGL
global.WebGLRenderingContext = GL.WebGLRenderingContext
global.OffscreenCanvas = class OffscreenCanvasPolyfill implements OffscreenCanvas {
  private gl: WebGLRenderingContext
  constructor(
    public readonly width: number,
    public readonly height: number,
  ) {
    this.gl = GL(width, height, {
      preserveDrawingBuffer: true,
    })
  }
  oncontextlost: ((this: OffscreenCanvas, ev: Event) => unknown) | null
  oncontextrestored: ((this: OffscreenCanvas, ev: Event) => unknown) | null

  transferToImageBitmap(): ImageBitmap {
    throw new Error("Method not implemented.")
  }

  addEventListener(type: unknown, listener: unknown, options?: unknown): void {
    throw new Error("Method not implemented.")
  }

  removeEventListener(type: unknown, listener: unknown, options?: unknown): void {
    throw new Error("Method not implemented.")
  }

  dispatchEvent(event: Event): boolean {
    throw new Error("Method not implemented.")
  }

  getContext(ctx: string) {
    if (ctx === "webgl") {
      const _getUniformLocation = this.gl.getUniformLocation
      // Temporary fix for https://github.com/stackgl/headless-gl/issues/170
      this.gl.getUniformLocation = function (program: any, name: any) {
        if (program._uniforms && !/\[\d+\]$/.test(name)) {
          const reg = new RegExp(`${name}\\[\\d+\\]$`)
          for (let i = 0; i < program._uniforms.length; i++) {
            const _name = program._uniforms[i].name
            if (reg.test(_name)) {
              name = _name
            }
          }
        }
        return _getUniformLocation.call(this, program, name)
      }

      return this.gl
    }
    return null
  }
}
