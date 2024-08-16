import { state } from "./state.js";

function createShader(type: 'vertex' | 'fragment', source: string): WebGLShader {
    const shader = state.gl.createShader(type === 'vertex' ? state.gl.VERTEX_SHADER : state.gl.FRAGMENT_SHADER);
    if (!shader) {
        throw new Error("Cannot create shader");
    }
    state.gl.shaderSource(shader, source);
    state.gl.compileShader(shader);
    if (!state.gl.getShaderParameter(shader, state.gl.COMPILE_STATUS)) {
        console.error(state.gl.getShaderInfoLog(shader));
        state.gl.deleteShader(shader);
        throw new Error("Cannot compile shader");
    }

    return shader;
}

function createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    const program = state.gl.createProgram();
    if (!program) {
        throw new Error("Cannot create the program");
    }
    state.gl.attachShader(program, vertexShader);
    state.gl.attachShader(program, fragmentShader);
    state.gl.linkProgram(program);
    if (!state.gl.getProgramParameter(program, state.gl.LINK_STATUS)) {
        console.error(state.gl.getProgramInfoLog(program))
        state.gl.deleteProgram(program);
        throw new Error("Cannot create program");
    }

    return program;
}

function loadSources(vertexId: string, fragmentId: string): [string, string] {
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

export function initShader(vertexShaderIdL: string, fragmentShaderId: string) {
    const [vertex_source, fragment_source] = loadSources(vertexShaderIdL, fragmentShaderId);
    const vertex_shader = createShader('vertex', vertex_source);
    const fragment_shader = createShader('fragment', fragment_source);

    state.program = createProgram(vertex_shader, fragment_shader)
    state.gl.useProgram(state.program);

    state.position_location = state.gl.getAttribLocation(state.program, 'a_position');
    state.gl.enableVertexAttribArray(state.position_location);
    state.u_color_location = state.gl.getUniformLocation(state.program, 'u_color') as WebGLUniformLocation;
    state.u_matrix_location = state.gl.getUniformLocation(state.program, 'u_matrix') as WebGLUniformLocation;
}

export function initGl() {
    const gl = state.canvas.getContext('webgl2');
    if (!gl) {
        throw new Error("Cannot create webgl context");
    }

    state.gl = gl;
}

export function drawLine(x1: number, y1: number, x2: number, y2: number) {
    const vbo = state.gl.createBuffer();
    state.gl.bindBuffer(state.gl.ARRAY_BUFFER, vbo);
    state.gl.bufferData(state.gl.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y2]), state.gl.STATIC_DRAW);
    const COMPONENTS_PER_AXIS = 2;
    state.gl.vertexAttribPointer(state.position_location, COMPONENTS_PER_AXIS, state.gl.FLOAT, false, 0, 0);
    state.gl.uniform4fv(state.u_color_location, [1, 0, 0, 1]);
    state.gl.drawArrays(state.gl.LINES, 0, 2);
    state.gl.deleteBuffer(vbo);
}

export function drawCircle(cx: number, cy: number, r: number, color: [number, number, number]) {
    const vbo = state.gl.createBuffer();
    state.gl.bindBuffer(state.gl.ARRAY_BUFFER, vbo);
    const RESOLUTION = 200;
    const points = [cx, cy];
    for (let i = 0; i <= RESOLUTION; i++) {
        const x = r * Math.cos((i * Math.PI * 2) / RESOLUTION);
        const y = r * Math.sin((i * Math.PI * 2) / RESOLUTION);
        points.push(
            points[0] + x,
            points[1] + y
        )
    }
    state.gl.bufferData(state.gl.ARRAY_BUFFER, new Float32Array(points), state.gl.STATIC_DRAW);
    const COMPONENTS_PER_AXIS = 2;
    state.gl.vertexAttribPointer(state.position_location, COMPONENTS_PER_AXIS, state.gl.FLOAT, false, 0, 0);
    state.gl.uniform4fv(state.u_color_location, [...color, 1]);
    state.gl.drawArrays(state.gl.TRIANGLE_FAN, 0, points.length / 2);
    state.gl.deleteBuffer(vbo);
}