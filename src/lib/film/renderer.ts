import { FRAGMENT_SHADER, VERTEX_SHADER } from './shaders'
import type { FilmPreset } from '@/lib/catalog'

const LUT_SIZE = 32

/**
 * `gl.getError()` memaksa sinkronisasi dengan GPU process, jadi ia tidak boleh
 * berjalan pada loop preview. Beberapa frame pertama tetap diperiksa supaya
 * kesalahan setup (shader, LUT, format tekstur) tidak lolos tanpa suara.
 */
const STARTUP_ERROR_CHECKS = 3

export type FilmSource = HTMLVideoElement | HTMLImageElement | ImageBitmap | HTMLCanvasElement
type LutSource = HTMLImageElement | ImageBitmap

export interface RenderOptions {
  /** Cerminkan horizontal — untuk kamera depan agar terasa seperti cermin. */
  mirror?: boolean
  /** 0 = warna asli, 1 = grading penuh. Hanya memengaruhi LUT, bukan grain/vignette/halation. */
  intensity?: number
  /**
   * 0-1, seberapa banyak kecerahan asli dikembalikan setelah LUT.
   */
  lumaLock?: number
  /** 0–1, kekuatan kurva-S kontras setelah grading. */
  contrast?: number
  /**
   * 0–1, penghalusan kulit. Menekan detail berkontras rendah di area bernada kulit.
   */
  smooth?: number
  /**
   * -1.5 hingga +1.5, kompensasi pencahayaan fotografi (EV stops).
   */
  exposure?: number
  /**
   * 0–1, penajaman optik kamera (Unsharp Mask) untuk meningkatkan detail sensor HP.
   */
  sharpen?: number
  /** Seed grain tetap agar full image dan turunannya dapat direproduksi. */
  grainSeed?: number
  /**
   * Setel `false` bila sumbernya sudah dalam orientasi bawah-ke-atas.
   */
  flipY?: boolean
}

/**
 * Merender sumber gambar/video melalui LUT film ke sebuah canvas.
 */
export class FilmRenderer {
  private canvas: HTMLCanvasElement
  private gl: WebGL2RenderingContext
  private program: WebGLProgram
  private vao: WebGLVertexArrayObject
  private quadBuffer: WebGLBuffer
  private sourceTexture: WebGLTexture
  private lutTexture: WebGLTexture
  private uniforms: Record<string, WebGLUniformLocation | null>
  private lutCache = new Map<string, LutSource>()
  private currentLut: string | null = null
  private disposed = false
  private contextLost = false
  private maxRenderSize: number
  /** Dimensi yang sudah dialokasikan pada `sourceTexture`, agar frame berikutnya cukup `texSubImage2D`. */
  private sourceWidth = 0
  private sourceHeight = 0
  private unpackColorspace: number | null = null
  private errorBudget: number
  private readonly handleContextLost = (event: Event) => {
    event.preventDefault()
    this.contextLost = true
  }

  constructor(
    canvas: HTMLCanvasElement,
    options: {
      preserveDrawingBuffer?: boolean
      /**
       * `startup` hanya memeriksa beberapa frame pertama — dipakai loop preview
       * agar tidak ada sinkronisasi GPU per frame. `always` untuk jalur simpan.
       */
      errorChecking?: 'always' | 'startup'
    } = {}
  ) {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: options.preserveDrawingBuffer ?? true,
      powerPreference: 'high-performance',
    })

    if (!gl) {
      throw new FilmUnsupportedError('WebGL2 tidak tersedia di perangkat ini.')
    }

    this.canvas = canvas
    this.gl = gl
    this.errorBudget =
      (options.errorChecking ?? 'always') === 'always'
        ? Number.POSITIVE_INFINITY
        : STARTUP_ERROR_CHECKS
    canvas.addEventListener('webglcontextlost', this.handleContextLost)
    this.maxRenderSize = Math.min(
      Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)),
      Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE))
    )

    if ('drawingBufferColorSpace' in gl) gl.drawingBufferColorSpace = 'srgb'
    this.program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER)

    const quad = createFullscreenQuad(gl, this.program)
    this.vao = quad.vao
    this.quadBuffer = quad.buffer

    this.sourceTexture = createTexture(gl)
    this.lutTexture = createTexture(gl)

    this.uniforms = {}
    for (const name of [
      'uSource',
      'uLut',
      'uResolution',
      'uLutSize',
      'uGrain',
      'uVignette',
      'uHalation',
      'uSeed',
      'uIntensity',
      'uLumaLock',
      'uContrast',
      'uColorBalance',
      'uSmooth',
      'uExposure',
      'uSharpen',
      'uMirror',
      'uFlipY',
    ]) {
      this.uniforms[name] = gl.getUniformLocation(this.program, name)
    }
  }

  /** Memuat tekstur LUT sebuah preset. Aman dipanggil berulang; hasilnya di-cache. */
  async loadPreset(preset: FilmPreset): Promise<void> {
    if (this.disposed) throw new Error('Renderer film sudah ditutup.')
    if (this.currentLut === preset.lut) return

    let img = this.lutCache.get(preset.lut)
    if (!img) {
      img = await loadLutSource(preset.lut)
      if (this.disposed) {
        if (typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap) img.close()
        throw new Error('Renderer film ditutup saat LUT sedang dimuat.')
      }
      this.lutCache.set(preset.lut, img)
    }

    if (this.disposed) throw new Error('Renderer film ditutup saat LUT sedang dimuat.')
    if (this.contextLost || this.gl.isContextLost()) {
      throw new Error('Konteks grafis hilang. Gunakan mode Natural atau muat ulang kamera.')
    }

    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, this.lutTexture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE)
    this.unpackColorspace = gl.NONE
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
    gl.bindTexture(gl.TEXTURE_2D, null)
    this.currentLut = preset.lut
  }

  /**
   * Gambar satu frame. `width`/`height` menentukan ukuran keluaran.
   */
  render(
    source: FilmSource,
    preset: FilmPreset,
    width: number,
    height: number,
    options: RenderOptions = {}
  ): void {
    if (this.disposed) throw new Error('Renderer film sudah ditutup.')
    if (this.contextLost || this.gl.isContextLost()) {
      throw new Error('Konteks grafis hilang. Gunakan mode Natural atau muat ulang kamera.')
    }

    if (width > this.maxRenderSize || height > this.maxRenderSize) {
      throw new Error(
        `Ukuran ${width}×${height} melampaui batas perangkat ${this.maxRenderSize}px.`
      )
    }

    if (this.currentLut !== preset.lut) {
      throw new Error(
        `LUT untuk "${preset.id}" belum dimuat (terpasang: ${this.currentLut ?? 'tidak ada'}). ` +
          'Panggil await loadPreset(preset) sebelum render().'
      )
    }

    const gl = this.gl

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width
      this.canvas.height = height
    }

    gl.viewport(0, 0, width, height)
    gl.useProgram(this.program)
    gl.bindVertexArray(this.vao)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture)
    if (this.unpackColorspace !== gl.BROWSER_DEFAULT_WEBGL) {
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.BROWSER_DEFAULT_WEBGL)
      this.unpackColorspace = gl.BROWSER_DEFAULT_WEBGL
    }

    // Frame video berikutnya menempati tekstur yang sama, jadi cukup menimpa
    // isinya. `texImage2D` akan mengalokasi ulang ~50 MB tiap frame pada stream
    // 4K dan itulah sumber utama preview tersendat.
    const upload = sourceSize(source)
    if (
      this.sourceWidth > 0 &&
      upload.width === this.sourceWidth &&
      upload.height === this.sourceHeight
    ) {
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source as TexImageSource
      )
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source as TexImageSource)
      this.sourceWidth = upload.width
      this.sourceHeight = upload.height
    }

    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.lutTexture)

    gl.uniform1i(this.uniforms.uSource, 0)
    gl.uniform1i(this.uniforms.uLut, 1)
    gl.uniform2f(this.uniforms.uResolution, width, height)
    gl.uniform1f(this.uniforms.uLutSize, LUT_SIZE)
    gl.uniform1f(this.uniforms.uGrain, preset.grain)
    gl.uniform1f(this.uniforms.uVignette, preset.vignette)
    gl.uniform1f(this.uniforms.uHalation, preset.halation)
    gl.uniform1f(this.uniforms.uSeed, options.grainSeed ?? Math.random() * 1000)
    gl.uniform1f(this.uniforms.uIntensity, options.intensity ?? 1)
    gl.uniform1f(this.uniforms.uLumaLock, options.lumaLock ?? 0)
    gl.uniform1f(this.uniforms.uContrast, options.contrast ?? 0)
    gl.uniform3f(
      this.uniforms.uColorBalance,
      preset.colorBalance[0],
      preset.colorBalance[1],
      preset.colorBalance[2]
    )
    gl.uniform1f(this.uniforms.uSmooth, options.smooth ?? 0)
    gl.uniform1f(this.uniforms.uExposure, options.exposure ?? 0)
    gl.uniform1f(this.uniforms.uSharpen, options.sharpen ?? 0)
    gl.uniform1i(this.uniforms.uMirror, options.mirror ? 1 : 0)
    gl.uniform1i(this.uniforms.uFlipY, options.flipY === false ? 0 : 1)

    gl.drawArrays(gl.TRIANGLES, 0, 6)
    gl.bindVertexArray(null)

    if (this.errorBudget > 0) {
      this.errorBudget -= 1
      const glError = gl.getError()
      if (glError !== gl.NO_ERROR) {
        throw new Error(`GPU gagal merender foto (WebGL ${glError}).`)
      }
    }
  }

  /** Render lalu keluarkan sebagai JPEG. */
  async renderToBlob(
    source: FilmSource,
    preset: FilmPreset,
    width: number,
    height: number,
    options: RenderOptions & { quality?: number } = {}
  ): Promise<Blob> {
    this.render(source, preset, width, height, options)
    return canvasToBlob(this.canvas, options.quality ?? 0.9)
  }

  /** Batas aman tekstur/renderbuffer dari GPU perangkat saat ini. */
  getMaxRenderSize(): number {
    return this.maxRenderSize
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost)

    const gl = this.gl
    gl.deleteTexture(this.sourceTexture)
    gl.deleteTexture(this.lutTexture)
    gl.deleteVertexArray(this.vao)
    gl.deleteBuffer(this.quadBuffer)
    gl.deleteProgram(this.program)
    for (const source of this.lutCache.values()) {
      if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) source.close()
    }
    this.lutCache.clear()
    this.currentLut = null
  }
}

export class FilmUnsupportedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FilmUnsupportedError'
  }
}

export function isFilmSupported(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2')
    const ok = gl !== null
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return ok
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Pembantu WebGL
// ---------------------------------------------------------------------------

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Gagal membuat shader.')

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`Kompilasi shader gagal: ${log}`)
  }

  return shader
}

function createProgram(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vs)
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fs)
  const program = gl.createProgram()
  if (!program) throw new Error('Gagal membuat program WebGL.')

  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)

  gl.deleteShader(vertex)
  gl.deleteShader(fragment)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    throw new Error(`Link program gagal: ${log}`)
  }

  return program
}

function createFullscreenQuad(
  gl: WebGL2RenderingContext,
  program: WebGLProgram
): { vao: WebGLVertexArrayObject; buffer: WebGLBuffer } {
  const vao = gl.createVertexArray()
  if (!vao) throw new Error('Gagal membuat VAO.')

  gl.bindVertexArray(vao)

  const buffer = gl.createBuffer()
  if (!buffer) throw new Error('Gagal membuat buffer.')
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  )

  const location = gl.getAttribLocation(program, 'aPosition')
  gl.enableVertexAttribArray(location)
  gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0)

  gl.bindVertexArray(null)
  return { vao, buffer }
}

/** Dimensi intrinsik sumber — bukan ukuran tampilannya di layout. */
function sourceSize(source: FilmSource): { width: number; height: number } {
  if ('videoWidth' in source) return { width: source.videoWidth, height: source.videoHeight }
  if ('naturalWidth' in source) return { width: source.naturalWidth, height: source.naturalHeight }
  return { width: source.width, height: source.height }
}

function createTexture(gl: WebGL2RenderingContext): WebGLTexture {
  const texture = gl.createTexture()
  if (!texture) throw new Error('Gagal membuat tekstur.')

  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.bindTexture(gl.TEXTURE_2D, null)

  return texture
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Gagal memuat tekstur LUT: ${src}`))
    img.src = src
  })
}

/**
 * LUT adalah tabel angka, bukan foto untuk dikoreksi profil warnanya. Pakai
 * ImageBitmap tanpa color conversion bila browser mendukung; HTMLImageElement
 * tetap menjadi fallback dan WebGL UNPACK conversion sudah dinonaktifkan.
 */
async function loadLutSource(src: string): Promise<LutSource> {
  if (typeof createImageBitmap !== 'function') return loadImage(src)

  try {
    const response = await fetch(src, { cache: 'force-cache' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await createImageBitmap(await response.blob(), {
      colorSpaceConversion: 'none',
      premultiplyAlpha: 'none',
    })
  } catch {
    return loadImage(src)
  }
}

export function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas gagal menghasilkan gambar.'))),
      'image/jpeg',
      quality
    )
  })
}
