import { Matrix } from "./matrix.js";
import { state } from "./state.js";
function createShader(type, source) {
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
function createProgram(vertexShader, fragmentShader) {
    const program = state.gl.createProgram();
    if (!program) {
        throw new Error("Cannot create the program");
    }
    state.gl.attachShader(program, vertexShader);
    state.gl.attachShader(program, fragmentShader);
    state.gl.linkProgram(program);
    if (!state.gl.getProgramParameter(program, state.gl.LINK_STATUS)) {
        console.error(state.gl.getProgramInfoLog(program));
        state.gl.deleteProgram(program);
        throw new Error("Cannot create program");
    }
    return program;
}
function loadSources(vertexId, fragmentId) {
    var _a, _b;
    const vertexSource = (_a = document.querySelector(vertexId)) === null || _a === void 0 ? void 0 : _a.textContent;
    const fragmentSource = (_b = document.querySelector(fragmentId)) === null || _b === void 0 ? void 0 : _b.textContent;
    if (typeof vertexSource !== 'string') {
        throw new Error("Vertex shader not available");
    }
    if (typeof fragmentSource !== 'string') {
        throw new Error("Fragment shader not available");
    }
    return [vertexSource, fragmentSource];
}
export function initShader(vertexShaderIdL, fragmentShaderId) {
    const [vertex_source, fragment_source] = loadSources(vertexShaderIdL, fragmentShaderId);
    const vertex_shader = createShader('vertex', vertex_source);
    const fragment_shader = createShader('fragment', fragment_source);
    state.program = createProgram(vertex_shader, fragment_shader);
    state.gl.useProgram(state.program);
    state.position_location = state.gl.getAttribLocation(state.program, 'a_position');
    state.gl.enableVertexAttribArray(state.position_location);
    state.u_color_location = state.gl.getUniformLocation(state.program, 'u_color');
    state.u_matrix_location = state.gl.getUniformLocation(state.program, 'u_matrix');
}
export function initGl() {
    const gl = state.canvas.getContext('webgl2');
    if (!gl) {
        throw new Error("Cannot create webgl context");
    }
    state.gl = gl;
}
export function drawLine(x1, y1, x2, y2) {
    const vbo = state.gl.createBuffer();
    state.gl.bindBuffer(state.gl.ARRAY_BUFFER, vbo);
    state.gl.bufferData(state.gl.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y2]), state.gl.STATIC_DRAW);
    const COMPONENTS_PER_AXIS = 2;
    state.gl.vertexAttribPointer(state.position_location, COMPONENTS_PER_AXIS, state.gl.FLOAT, false, 0, 0);
    state.gl.uniform4fv(state.u_color_location, [1, 0, 0, 1]);
    state.gl.drawArrays(state.gl.LINES, 0, 2);
    state.gl.deleteBuffer(vbo);
}
export function drawCircle(cx, cy, r, color) {
    const vbo = state.gl.createBuffer();
    state.gl.bindBuffer(state.gl.ARRAY_BUFFER, vbo);
    const RESOLUTION = 200;
    const points = [cx, cy];
    for (let i = 0; i <= RESOLUTION; i++) {
        const x = r * Math.cos((i * Math.PI * 2) / RESOLUTION);
        const y = r * Math.sin((i * Math.PI * 2) / RESOLUTION);
        points.push(points[0] + x, points[1] + y);
    }
    state.gl.bufferData(state.gl.ARRAY_BUFFER, new Float32Array(points), state.gl.STATIC_DRAW);
    const COMPONENTS_PER_AXIS = 2;
    state.gl.vertexAttribPointer(state.position_location, COMPONENTS_PER_AXIS, state.gl.FLOAT, false, 0, 0);
    state.gl.uniform4fv(state.u_color_location, [...color, 1]);
    state.gl.drawArrays(state.gl.TRIANGLE_FAN, 0, points.length / 2);
    state.gl.deleteBuffer(vbo);
}
/**
 * Ported from raylib.js
 */
export function prepareDrawLineExBufferData(startPos, endPos, thickness) {
    const delta = new Matrix(1, 2, [endPos.x() - startPos.x(), endPos.y() - startPos.y()]);
    const length = Math.sqrt(delta.x() * delta.x() + delta.y() * delta.y());
    if ((length > 0) && (thickness > 0)) {
        const scale = thickness / (2 * length);
        const radius = new Matrix(1, 2, [-scale * delta.y(), scale * delta.x()]);
        const strip = [
            startPos.x() - radius.x(), startPos.y() - radius.y(),
            startPos.x() + radius.x(), startPos.y() + radius.y(),
            endPos.x() - radius.x(), endPos.y() - radius.y(),
            endPos.x() + radius.x(), endPos.y() + radius.y()
        ];
        return strip;
    }
    else {
        return [];
    }
}
export function drawLineEx(startPos, endPos, thickness, color) {
    const data = prepareDrawLineExBufferData(startPos, endPos, thickness);
    const vbo = state.gl.createBuffer();
    state.gl.bindBuffer(state.gl.ARRAY_BUFFER, vbo);
    state.gl.bufferData(state.gl.ARRAY_BUFFER, new Float32Array(data), state.gl.STATIC_DRAW);
    const COMPONENTS_PER_ELEMENT = 2;
    state.gl.vertexAttribPointer(state.position_location, COMPONENTS_PER_ELEMENT, state.gl.FLOAT, false, 0, 0);
    state.gl.uniform4fv(state.u_color_location, color.data);
    state.gl.drawArrays(state.gl.TRIANGLE_STRIP, 0, 4);
    state.gl.deleteBuffer(vbo);
}
//# sourceMappingURL=webgl.js.map