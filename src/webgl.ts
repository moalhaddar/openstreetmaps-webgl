import { Matrix } from "./matrix";
import { GLContext } from "./types";
import { Vector2 } from "./vector2";
 
type BufferType = "vbo" | "ebo"

export type Camera = {
    offset: Vector2;
    target: Vector2;
    rotation: number;
    zoom: number;
}

export function initBuffer(glContext: GLContext, data: ArrayBuffer, type: BufferType) {
    const { gl } = glContext;
    const buffer = gl.createBuffer()

    const BUFFER_TYPE_MAP: Record<BufferType, number> = {
        vbo: gl.ARRAY_BUFFER,
        ebo: gl.ELEMENT_ARRAY_BUFFER
    }

    const glBufferType = BUFFER_TYPE_MAP[type];
    
    gl.bindBuffer(glBufferType, buffer);
    gl.bufferData(glBufferType, data, gl.STATIC_DRAW);

    return buffer;
}

type VBO = {
    buffer: WebGLBuffer | null;
    vertexPtr: {
        location: number,
        components: 1 | 2 | 3 | 4,
        type: number,
    }
}

export function initVao(args: {
    glContext: GLContext, 
    enableLocations: number[], 
    vbos: VBO[], 
    ebo: WebGLBuffer | null
}) {
    const {ebo, enableLocations, vbos, glContext} = args;
    const vao = glContext.gl.createVertexArray();
    glContext.gl.bindVertexArray(vao);
    for (let i = 0; i < enableLocations.length; i++) {
        glContext.gl.enableVertexAttribArray(enableLocations[i]);
    }
    for (let i = 0; i < vbos.length; i++) {
        const {buffer, vertexPtr} = vbos[i];
        glContext.gl.bindBuffer(glContext.gl.ARRAY_BUFFER, buffer);
        glContext.gl.vertexAttribPointer(
            vertexPtr.location,
            vertexPtr.components, 
            vertexPtr.type, 
            false, 
            0, 
            0
        )
    }

    if (ebo) {
        glContext.gl.bindBuffer(glContext.gl.ELEMENT_ARRAY_BUFFER, ebo);    
    }

    glContext.gl.bindVertexArray(null);

    return vao;
}

export function initCanvas(id: string) {
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    return canvas;
}

export function initGl(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', {
        premultipliedAlpha: false,
    });
    if (!gl) {
        throw new Error("Cannot create webgl context");
    }

    return gl;
}


export function initShader<U extends string, A extends string, T extends 'uniform' | 'attribute', R = T extends 'uniform' ? WebGLUniformLocation : number>(args: {
    gl: WebGL2RenderingContext, 
    vertexShaderId: string, 
    fragmentShaderId: string,
    uniforms: Array<U>,
    attributes: Array<A>,
}
) {
    const {attributes, fragmentShaderId, gl, uniforms, vertexShaderId} = args;
    const [vertex_source, fragment_source] = loadSources(vertexShaderId, fragmentShaderId);
    const vertex_shader = createShader(gl, 'vertex', vertex_source);
    const fragment_shader = createShader(gl, 'fragment', fragment_source);

    const program = createProgram(gl, vertex_shader, fragment_shader)
    const _uniforms = {} as Record<U, WebGLUniformLocation | null>;
    const _attributes = {} as Record<A, number>;
    for (let i = 0 ; i < uniforms.length; i++) {
        const name = uniforms[i];
        const location = gl.getUniformLocation(program, name);
            _uniforms[name] = location;;
    }

    for (let i = 0 ; i < attributes.length; i++) {
        const name = attributes[i];
        const location = gl.getAttribLocation(program, name);
            _attributes[name] = location;;
    }

    return {
        program,
        uniforms: _uniforms,
        attributes: _attributes
    };
}

export function loadSources(vertexId: string, fragmentId: string): [string, string] {
    const vertexSource = document.querySelector(vertexId)?.textContent;
    const fragmentSource = document.querySelector(fragmentId)?.textContent;
    if (typeof vertexSource !== 'string') {
        throw new Error("Vertex shader not available");
    }

    if (typeof fragmentSource !== 'string') {
        throw new Error("Fragment shader not available");
    }

    return [vertexSource, fragmentSource];
}

export function createShader(gl: WebGL2RenderingContext, type: 'vertex' | 'fragment', source: string): WebGLShader {
    const shader = gl.createShader(type === 'vertex' ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
    if (!shader) {
        throw new Error("Cannot create shader");
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        throw new Error("Cannot compile shader");
    }

    return shader;
}

export function createProgram(gl: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    const program = gl.createProgram();
    if (!program) {
        throw new Error("Cannot create the program");
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program))
        gl.deleteProgram(program);
        throw new Error("Cannot create program");
    }

    return program;
}

// (Bottom, left) => (top, right)
export function getMouseCanvasPosition(e: MouseEvent, canvas: HTMLCanvasElement): Vector2 {
    const rect = canvas.getBoundingClientRect();

    return new Vector2(e.clientX - rect.left, (canvas.clientHeight - (e.clientY - rect.top)));
}

export function getScreenToWorld(screenPosition: Vector2, camera: Camera) {
    const inverse = getCameraMatrix(camera).inverse().transpose();

    const x = screenPosition.x;
    const y = screenPosition.y;

    const result = new Vector2(0, 0);
    result.x = (inverse.data[0] * x) + (inverse.data[1] * y) + inverse.data[2];
    result.y = (inverse.data[3] * x) + (inverse.data[4] * y) + inverse.data[5];
    return result;
}

/**
 * Credit to raylib,  rcore.c
 */
export function getCameraMatrix(camera: Camera): Matrix {
    const O = Matrix.translate(-camera.target.x, -camera.target.y)
    const R = Matrix.rotate(camera.rotation);
    const S = Matrix.scale(camera.zoom, camera.zoom);
    const T = Matrix.translate(camera.offset.x, camera.offset.y);
    return O.multiply(S).multiply(R).multiply(T);
}

/**
 * Credit: https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html 
 */
export function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement) {
    // Lookup the size the browser is displaying the canvas in CSS pixels.
    const displayWidth  = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
   
    // Check if the canvas is not the same size.
    const needResize = canvas.width  !== displayWidth ||
                       canvas.height !== displayHeight;
   
    if (needResize) {
      // Make the canvas the same size
      canvas.width  = displayWidth;
      canvas.height = displayHeight;
    }
   
    return needResize;
  }