import { Color } from "./color";
import { GLContext } from "./types";
import { Vector2 } from "./vector2";

export function drawLine(glContext: GLContext, start: Vector2, end: Vector2, color: Color) {
    const vbo = glContext.gl.createBuffer();
    glContext.gl.bindBuffer(glContext.gl.ARRAY_BUFFER, vbo);
    glContext.gl.bufferData(glContext.gl.ARRAY_BUFFER, new Float32Array([...start, ...end]), glContext.gl.STATIC_DRAW);
    const COMPONENTS_PER_AXIS = 2;
    glContext.gl.vertexAttribPointer(glContext.uniformColorShader.attributes.a_position, COMPONENTS_PER_AXIS, glContext.gl.FLOAT, false, 0, 0);
    glContext.gl.uniform4fv(glContext.uniformColorShader.uniforms.u_color, color);
    glContext.gl.drawArrays(glContext.gl.LINES, 0, 2);
    glContext.gl.deleteBuffer(vbo);
}

export function drawCircle(glContext: GLContext, center: Vector2, r: number, color: Color) {
    const vbo = glContext.gl.createBuffer();
    glContext.gl.bindBuffer(glContext.gl.ARRAY_BUFFER, vbo);
    const RESOLUTION = 100;
    const points = [...center];
    for (let i = 0; i <= RESOLUTION; i++) {
        const x = r * Math.cos((i * Math.PI * 2) / RESOLUTION);
        const y = r * Math.sin((i * Math.PI * 2) / RESOLUTION);
        points.push(
            points[0] + x,
            points[1] + y
        )
    }
    glContext.gl.bufferData(glContext.gl.ARRAY_BUFFER, new Float32Array(points), glContext.gl.STATIC_DRAW);
    const COMPONENTS_PER_AXIS = 2;
    glContext.gl.vertexAttribPointer(glContext.uniformColorShader.attributes.a_position, COMPONENTS_PER_AXIS, glContext.gl.FLOAT, false, 0, 0);
    glContext.gl.uniform4fv(glContext.uniformColorShader.uniforms.u_color, color);
    glContext.gl.drawArrays(glContext.gl.TRIANGLE_FAN, 0, points.length / 2);
    glContext.gl.deleteBuffer(vbo);
}

export function drawRectangle(glContext: GLContext, v1: Vector2, v2: Vector2, color: Color) {
    const vbo = glContext.gl.createBuffer();
    glContext.gl.bindBuffer(glContext.gl.ARRAY_BUFFER, vbo);

    const points = [
        v1.x, v1.y, // left top
        v1.x, v2.y, // left bottom
        v2.x, v1.y, // right top
        v2.x, v2.y, // right bottom
    ]

    glContext.gl.bufferData(glContext.gl.ARRAY_BUFFER, new Float32Array(points), glContext.gl.STATIC_DRAW);

    const COMPONENTS_PER_POINT = 2;
    glContext.gl.vertexAttribPointer(glContext.uniformColorShader.attributes.a_position, COMPONENTS_PER_POINT, glContext.gl.FLOAT, false, 0, 0);
    glContext.gl.uniform4fv(glContext.uniformColorShader.uniforms.u_color, color);
    glContext.gl.drawArrays(glContext.gl.TRIANGLE_STRIP, 0, 4);
    glContext.gl.deleteBuffer(vbo);
}

/**
 * Ported from raylib.js
 */
export function prepareDrawLineExBufferData(startPos: Vector2, endPos: Vector2, thickness: number) {
    const delta = new Vector2(endPos.x - startPos.x, endPos.y - startPos.y);
    const length = delta.length();

    if ((length > 0) && (thickness > 0)) {
        const scale = thickness / (2 * length);
        const radius = new Vector2(-scale * delta.y, scale * delta.x)
        
        const strip = [
            startPos.x - radius.x, startPos.y - radius.y,
            startPos.x + radius.x, startPos.y + radius.y,
            endPos.x - radius.x, endPos.y - radius.y,
            endPos.x + radius.x, endPos.y + radius.y
        ]

        return strip;
    } else {
        return [];
    }
}