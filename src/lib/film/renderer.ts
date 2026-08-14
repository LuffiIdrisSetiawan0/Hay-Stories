import { FRAGMENT_SHADER, VERTEX_SHADER } from './shaders'
import type { FilmPreset } from '@/lib/catalog'

const LUT_SIZE = 32

export type FilmSource = HTMLVideoElement | HTMLImageElement | ImageBitmap | HTMLCanvasElement

export interface RenderOptions {
  /** Cerminkan horizontal — untuk kamera depan agar terasa seperti cermin. */
  mirror?: boolean
  /** 0 = warna asli, 1 = grading penuh. Hanya memengaruhi LUT, bukan grain/vignette/halation. */
  intensity?: number
  /**
   * 0-1, seberapa banyak kecerahan asli dikembalikan setelah LUT.
   *
   * 1 berarti LUT hanya boleh mengubah warna, tidak boleh mengangkat atau
   * menurunkan nada sama sekali. Dipakai untuk menahan kurva nada film
   * menumpuk di atas kurva yang sudah diterapkan ISP kamera ponsel.
   */
  lumaLock?: number
  /** 0–1, kekuatan kurva-S kontras setelah grading. */
  contrast?: number
  /**
   * 0–1, penghalusan kulit. Menekan detail berkontras rendah di area bernada
   * kulit saja; tepi tajam seperti mata dan bibir tidak tersentuh.
   */
  smooth?: number
  /**
   * Setel `false` bila sumbernya sudah dalam orientasi bawah-ke-atas.
   * Default (`true`) benar untuk video, gambar, dan ImageBitmap biasa.
   */
  flipY?: boolean
}

/**
 * Merender sumber gambar/video melalui LUT film ke sebuah canvas.
 *
 * Satu instance dipakai untuk viewfinder live DAN untuk membakar hasil
 * jepretan, sehingga apa yang dilihat tamu persis sama dengan yang tersimpan.
 *
 * Selalu panggil `dispose()` saat komponen dilepas. Di iOS, konteks WebGL yang
 * bocor akan dicabut paksa oleh sistem setelah beberapa kali dan viewfinder
 * berikutnya hanya menampilkan layar hitam.
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
  private lutCache = new Map<string, HTMLImageElement>()
  private currentLut: string | null = null
  private disposed = false

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: true, // dibutuhkan agar toBlob() setelah render tidak kosong
      powerPreference: 'high-performance',
    })

    if (!gl) {
      throw new FilmUnsupportedError('WebGL2 tidak tersedia di perangkat ini.')
    }

    this.canvas = canvas
    this.gl = gl
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
      'uSmooth',
      'uMirror',
      'uFlipY',
    ]) {
      this.uniforms[name] = gl.getUniformLocation(this.program, name)
    }
  }

  /** Memuat tekstur LUT sebuah preset. Aman dipanggil berulang; hasilnya di-cache. */
  async loadPreset(preset: FilmPreset): Promise<void> {
    if (this.disposed) return
    if (this.currentLut === preset.lut) return

    let img = this.lutCache.get(preset.lut)
    if (!img) {
      img = await loadImage(preset.lut)
      this.lutCache.set(preset.lut, img)
    }

    if (this.disposed) return

    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, this.lutTexture)
    // LUT TIDAK boleh dibalik: barisnya adalah data pencarian warna, bukan
    // gambar. Membaliknya akan menukar sumbu hijau.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
    gl.bindTexture(gl.TEXTURE_2D, null)
    this.currentLut = preset.lut
  }

  /**
   * Gambar satu frame. `width`/`height` menentukan ukuran keluaran.
   *
   * `loadPreset(preset)` wajib sudah selesai untuk preset yang sama. Guard di
   * bawah sengaja keras: merender dengan LUT preset lain tidak menimbulkan
   * error apa pun, hanya menghasilkan warna yang salah — dan foto tamu yang
   * tersimpan dengan film keliru tidak bisa diperbaiki setelahnya.
   */
  render(
    source: FilmSource,
    preset: FilmPreset,
    width: number,
    height: number,
    options: RenderOptions = {}
  ): void {
    if (this.disposed) return

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
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source as TexImageSource)

    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.lutTexture)

    gl.uniform1i(this.uniforms.uSource, 0)
    gl.uniform1i(this.uniforms.uLut, 1)
    gl.uniform2f(this.uniforms.uResolution, width, height)
    gl.uniform1f(this.uniforms.uLutSize, LUT_SIZE)
    gl.uniform1f(this.uniforms.uGrain, preset.grain)
    gl.uniform1f(this.uniforms.uVignette, preset.vignette)
    gl.uniform1f(this.uniforms.uHalation, preset.halation)
    gl.uniform1f(this.uniforms.uSeed, Math.random() * 1000)
    gl.uniform1f(this.uniforms.uIntensity, options.intensity ?? 1)
    gl.uniform1f(this.uniforms.uLumaLock, options.lumaLock ?? 0)
    gl.uniform1f(this.uniforms.uContrast, options.contrast ?? 0)
    gl.uniform1f(this.uniforms.uSmooth, options.smooth ?? 0)
    gl.uniform1i(this.uniforms.uMirror, options.mirror ? 1 : 0)
    gl.uniform1i(this.uniforms.uFlipY, options.flipY === false ? 0 : 1)

    gl.drawArrays(gl.TRIANGLES, 0, 6)
    gl.bindVertexArray(null)
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

  /**
   * Melepas seluruh sumber daya GPU. Canvas tetap bisa dipakai untuk membuat
   * FilmRenderer baru setelahnya.
   *
   * Sengaja TIDAK memanggil `WEBGL_lose_context.loseContext()`. Canvas yang
   * konteksnya dilepas paksa akan terus mengembalikan konteks mati itu pada
   * `getContext()` berikutnya — jadi satu kali dispose membuat canvas tersebut
   * rusak permanen. React StrictMode me-remount setiap komponen sekali di mode
   * dev, sehingga viewfinder akan selalu hitam. Menghapus objek GL sudah
   * membebaskan hampir seluruh memori GPU yang berarti; sisa konteksnya
   * direklamasi browser saat canvas-nya di-GC.
   */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true

    const gl = this.gl
    gl.deleteTexture(this.sourceTexture)
    gl.deleteTexture(this.lutTexture)
    gl.deleteVertexArray(this.vao)
    gl.deleteBuffer(this.quadBuffer)
    gl.deleteProgram(this.program)
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

  // Shader sudah tertanam di program setelah link; lepaskan referensinya.
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

function createTexture(gl: WebGL2RenderingContext): WebGLTexture {
  const texture = gl.createTexture()
  if (!texture) throw new Error('Gagal membuat tekstur.')

  gl.bindTexture(gl.TEXTURE_2D, texture)
  // CLAMP_TO_EDGE wajib: REPEAT akan membuat LUT membungkus antar-irisan.
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

export function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas gagal menghasilkan gambar.'))),
      'image/jpeg',
      quality
    )
  })
}
