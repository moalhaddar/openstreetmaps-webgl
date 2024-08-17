var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import BucketMap from "./bucket.js";
import { Matrix } from "./matrix.js";
import { initBuildingNodes, initHighwayNodes, initMetadata, initNodesAndReverseLookup, initWays, normalizeNode, initFlatNodeData, parseOSMXML } from "./parser.js";
import { drawCircle, drawLine, initGl, initShader, prepareDrawLineExBufferData } from "./webgl.js";
import { state } from "./state.js";
import { MouseButton } from "./types.js";
import { initCanvas } from "./canvas.js";
import { worker } from "./worker-manager.js";
import { buildGraph } from "./pathfinding.js";
function getMouseCanvasPosition(e) {
    const rect = state.canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}
function getMouseClipPosition(e) {
    const { x, y } = getMouseCanvasPosition(e);
    // [0..1]
    let normalizedCanvasX = x / state.canvas.width;
    let normalizedCanvasY = y / state.canvas.height;
    // [0, 2]
    normalizedCanvasX *= 2;
    normalizedCanvasY *= 2;
    // [-1, 1]
    normalizedCanvasX -= 1;
    normalizedCanvasY -= 1;
    return {
        x: normalizedCanvasX,
        y: normalizedCanvasY * -1 // We invert the y axis
    };
}
function getMouseWorldPosition(mouseClipPosition, scale, offset) {
    return [
        ((mouseClipPosition[0] / scale) - offset[0]),
        ((mouseClipPosition[1] / scale) - offset[1]),
    ];
}
window.addEventListener('load', () => __awaiter(void 0, void 0, void 0, function* () {
    // Initial state
    state.translationOffset = [-0.5, -0.5];
    state.anchor = undefined;
    state.scale = 100;
    state.rotationAngleRad = 0;
    state.targetScale = 1;
    state.previous_render_timestamp = 0;
    state.mouseClipPosition = undefined;
    state.mouseWorldPosition = undefined;
    state.activeBucket = [];
    state.startNode = undefined;
    state.timeouts = [];
    state.graph = new Map();
    state.path = [];
    state.visited = [];
    state.startNodeTarget = undefined;
    state.startNodeCurrent = undefined;
    state.endNodeTarget = undefined;
    state.endNodeCurrent = undefined;
    const proxy = yield worker();
    yield parseOSMXML();
    initNodesAndReverseLookup();
    initWays();
    initMetadata();
    initHighwayNodes();
    initBuildingNodes();
    initFlatNodeData();
    BucketMap.init();
    state.bucketMap.populate(state.highwayNodes);
    initCanvas();
    initGl();
    initShader('#vertex-shader', '#fragment-shader');
    // Worker stuff
    buildGraph(state.ways, state.nodes, state.nodeIdIdxMap);
    proxy.buildGraph(state.ways, state.nodes, state.nodeIdIdxMap);
    const nodes_buffer = state.gl.createBuffer();
    state.gl.bindBuffer(state.gl.ARRAY_BUFFER, nodes_buffer);
    state.gl.bufferData(state.gl.ARRAY_BUFFER, new Float32Array(state.normalizedNodesLonLatArray), state.gl.STATIC_DRAW);
    const building_nodes_index_ebo = state.gl.createBuffer();
    state.gl.bindBuffer(state.gl.ELEMENT_ARRAY_BUFFER, building_nodes_index_ebo);
    state.gl.bufferData(state.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(state.buildingNodesIdxs), state.gl.STATIC_DRAW);
    const highway_nodes_index_ebo = state.gl.createBuffer();
    state.gl.bindBuffer(state.gl.ELEMENT_ARRAY_BUFFER, highway_nodes_index_ebo);
    state.gl.bufferData(state.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(state.highwayNodesIdxs), state.gl.STATIC_DRAW);
    const path_buffer_vbo = state.gl.createBuffer();
    state.gl.bindBuffer(state.gl.ARRAY_BUFFER, path_buffer_vbo);
    state.gl.bufferData(state.gl.ARRAY_BUFFER, new Uint32Array([]), state.gl.STATIC_DRAW);
    const visited_index_ebo = state.gl.createBuffer();
    state.gl.bindBuffer(state.gl.ELEMENT_ARRAY_BUFFER, visited_index_ebo);
    state.gl.bufferData(state.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array([]), state.gl.STATIC_DRAW);
    // Events
    state.canvas.addEventListener('mousedown', (e) => {
        const { x, y } = getMouseClipPosition(e);
        state.anchor = [x, y];
        if (state.activeBucket.length === 1) {
            const timeoutId = setTimeout(() => {
                if (e.button == MouseButton.Left) {
                    state.startNode = normalizeNode(state.activeBucket[0].node);
                    state.path = [];
                    state.visited = [];
                    const idx = state.activeBucket[0].glIndex;
                    const lon = state.normalizedNodesLonLatArray[idx * 2];
                    const lat = state.normalizedNodesLonLatArray[idx * 2 + 1];
                    state.startNodeTarget = new Matrix(1, 2, [lon, lat]);
                }
                else if (e.button == MouseButton.Right) {
                    state.endNode = normalizeNode(state.activeBucket[0].node);
                    state.path = [];
                    state.visited = [];
                    const idx = state.activeBucket[0].glIndex;
                    const lon = state.normalizedNodesLonLatArray[idx * 2];
                    const lat = state.normalizedNodesLonLatArray[idx * 2 + 1];
                    state.endNodeTarget = new Matrix(1, 2, [lon, lat]);
                }
                else if (e.button == MouseButton.Middle) {
                    state.startNode = undefined;
                    state.startNodeTarget = undefined;
                    state.endNode = undefined;
                    state.endNodeTarget = undefined;
                    state.path = [];
                    state.visited = [];
                }
            }, 200);
            state.timeouts.push(timeoutId);
        }
    });
    state.canvas.addEventListener('mouseup', () => {
        if (state.anchor) {
            state.anchor = undefined;
        }
    });
    state.canvas.addEventListener('mousemove', (e) => {
        state.timeouts.forEach(clearTimeout);
        const { x, y } = getMouseClipPosition(e);
        state.mouseClipPosition = [x, y];
        if (state.mouseClipPosition) {
            const mouseWorldPosition = getMouseWorldPosition(state.mouseClipPosition, state.scale, state.translationOffset);
            const entry = state.bucketMap.getClosestBucketEntryForClipspace(mouseWorldPosition[0], mouseWorldPosition[1]);
            if (entry) {
                state.activeBucket = [entry];
            }
        }
        if (state.anchor && state.isCtrlPressed) {
            const dy = state.mouseClipPosition[1] - state.anchor[1];
            state.rotationAngleRad = dy;
            return;
        }
        if (state.anchor) {
            const dx = state.mouseClipPosition[0] - state.anchor[0];
            const dy = state.mouseClipPosition[1] - state.anchor[1];
            state.translationOffset = [
                state.translationOffset[0] + (dx / state.scale),
                state.translationOffset[1] + (dy / state.scale)
            ];
            state.anchor = [x, y];
        }
    });
    document.addEventListener('contextmenu', event => event.preventDefault());
    window.addEventListener("keydown", (e) => {
        if (e.key === 'Control') {
            state.isCtrlPressed = true;
        }
        if (e.code === 'Space') {
            state.path = [];
            state.visited.length = 0;
            proxy.dijkstra(state.startNode, state.nodeIdIdxMap)
                .then((result) => {
                if (result) {
                    proxy.findPath(result.previous, state.endNode, state.nodeIdIdxMap)
                        .then((path) => {
                        if (path) {
                            state.path = path.map((x) => x);
                        }
                    });
                }
            });
        }
    });
    window.addEventListener("keyup", (e) => {
        if (e.key === 'Control') {
            state.isCtrlPressed = false;
        }
    });
    state.canvas.addEventListener('wheel', (e) => {
        if (e.deltaY < 0) {
            state.targetScale++;
        }
        else if (state.targetScale - 1 > 0) {
            state.targetScale--;
        }
    });
    const drawNodes = () => {
        state.gl.bindBuffer(state.gl.ARRAY_BUFFER, nodes_buffer);
        const COMPONENTS_PER_NODE = 2;
        state.gl.vertexAttribPointer(state.position_location, COMPONENTS_PER_NODE, state.gl.FLOAT, false, 0, 0);
        state.gl.uniformMatrix3fv(state.u_matrix_location, false, state.mat.data);
        state.gl.uniform4fv(state.u_color_location, [0, 1, 0, 1]);
        state.gl.drawArrays(state.gl.POINTS, 0, state.normalizedNodesLonLatArray.length / COMPONENTS_PER_NODE // How many points in the vbo
        );
    };
    const drawWays = () => {
        state.gl.bindBuffer(state.gl.ARRAY_BUFFER, nodes_buffer);
        const COMPONENTS_PER_WAY = 2;
        state.gl.vertexAttribPointer(state.position_location, COMPONENTS_PER_WAY, state.gl.FLOAT, false, 0, 0);
        state.gl.uniformMatrix3fv(state.u_matrix_location, false, state.mat.data);
        state.gl.uniform4fv(state.u_color_location, [0.5, 0.35, 0.61, 1]);
        state.gl.bindBuffer(state.gl.ELEMENT_ARRAY_BUFFER, building_nodes_index_ebo);
        // Count is for the elements in the ebo, not vbo.
        state.gl.drawElements(state.gl.TRIANGLE_STRIP, state.buildingNodesIdxs.length, state.gl.UNSIGNED_INT, 0);
        state.gl.uniform4fv(state.u_color_location, [0, 0.8, 0.99, 1]);
        state.gl.bindBuffer(state.gl.ELEMENT_ARRAY_BUFFER, highway_nodes_index_ebo);
        state.gl.drawElements(state.gl.LINE_STRIP, state.highwayNodesIdxs.length, state.gl.UNSIGNED_INT, 0);
    };
    const drawClipAxis = () => {
        drawLine(1, 0, -1, 0);
        drawLine(0, 1, 0, -1);
    };
    const drawBucket = () => {
        state.gl.bindBuffer(state.gl.ARRAY_BUFFER, nodes_buffer);
        const COMPONENTS_PER_WAY = 2;
        state.gl.vertexAttribPointer(state.position_location, COMPONENTS_PER_WAY, state.gl.FLOAT, false, 0, 0);
        state.gl.uniformMatrix3fv(state.u_matrix_location, false, state.mat.data);
        state.gl.uniform4fv(state.u_color_location, [1, 0, 0, 1]);
        const centers = [];
        for (let i = 0; i < state.activeBucket.length; i++) {
            const idx = state.activeBucket[i].glIndex;
            if (idx === 0xFFFFFFFF)
                continue;
            const lon = state.normalizedNodesLonLatArray[idx * 2];
            const lat = state.normalizedNodesLonLatArray[idx * 2 + 1];
            centers.push([lon, lat]);
            drawCircle(lon, lat, 0.003 / state.scale, [1, 1, 0]);
        }
    };
    const drawStartEndNodes = (dt) => {
        state.gl.bindBuffer(state.gl.ARRAY_BUFFER, nodes_buffer);
        const COMPONENTS_PER_WAY = 2;
        state.gl.vertexAttribPointer(state.position_location, COMPONENTS_PER_WAY, state.gl.FLOAT, false, 0, 0);
        state.gl.uniformMatrix3fv(state.u_matrix_location, false, state.mat.data);
        state.gl.uniform4fv(state.u_color_location, [1, 0, 0, 1]);
        if (state.startNodeTarget) {
            if (state.startNodeCurrent) {
                state.startNodeCurrent = state.startNodeCurrent
                    .add(state.startNodeTarget
                    .subtract(state.startNodeCurrent)
                    .scalar(dt * 50));
            }
            else {
                state.startNodeCurrent = state.startNodeTarget;
            }
            drawCircle(state.startNodeCurrent.x(), state.startNodeCurrent.y(), 0.006 / state.scale, [0, 1, 0]);
        }
        if (state.endNodeTarget) {
            if (state.endNodeCurrent) {
                state.endNodeCurrent = state.endNodeCurrent
                    .add(state.endNodeTarget
                    .subtract(state.endNodeCurrent)
                    .scalar(dt * 50));
            }
            else {
                state.endNodeCurrent = state.endNodeTarget;
            }
            drawCircle(state.endNodeCurrent.x(), state.endNodeCurrent.y(), 0.006 / state.scale, [1, 0, 0]);
        }
    };
    const drawGraphData = () => {
        const visitedIdxs = state.visited;
        state.gl.bindBuffer(state.gl.ARRAY_BUFFER, nodes_buffer);
        const COMPONENTS_PER_WAY = 2;
        state.gl.vertexAttribPointer(state.position_location, COMPONENTS_PER_WAY, state.gl.FLOAT, false, 0, 0);
        state.gl.uniformMatrix3fv(state.u_matrix_location, false, state.mat.data);
        state.gl.uniform4fv(state.u_color_location, [1, 0.5, 0, 1]);
        { // Visited nodes highlighting
            state.gl.bindBuffer(state.gl.ELEMENT_ARRAY_BUFFER, visited_index_ebo);
            const oldSize = state.gl.getBufferParameter(state.gl.ELEMENT_ARRAY_BUFFER, state.gl.BUFFER_SIZE) / 4;
            if (visitedIdxs.length != oldSize) {
                state.gl.bufferData(state.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(visitedIdxs), state.gl.STATIC_DRAW);
            }
            const newSize = state.gl.getBufferParameter(state.gl.ELEMENT_ARRAY_BUFFER, state.gl.BUFFER_SIZE) / 4;
            state.gl.drawElements(state.gl.LINES, newSize, state.gl.UNSIGNED_INT, 0);
        }
        { // Path highlighting
            // TODO: move this outside of the drawing loop
            const lines = [];
            for (let i = 0; i < state.path.length - 1; i += 1) {
                const startIdx = state.path[i];
                const endIdx = state.path[i + 1];
                const startNode = state.normalizedNodesLonLatArray.slice(startIdx * 2, startIdx * 2 + 2);
                const endnode = state.normalizedNodesLonLatArray.slice(endIdx * 2, endIdx * 2 + 2);
                const line = prepareDrawLineExBufferData(new Matrix(1, 2, startNode), new Matrix(1, 2, endnode), (0.01 / 3) / state.scale);
                lines.push(...line);
            }
            state.gl.bindBuffer(state.gl.ARRAY_BUFFER, path_buffer_vbo);
            const oldSize = state.gl.getBufferParameter(state.gl.ARRAY_BUFFER, state.gl.BUFFER_SIZE) / 4;
            if (lines.length != oldSize) { // TODO: Doesn't re-render on scaling
                state.gl.bufferData(state.gl.ARRAY_BUFFER, new Float32Array(lines), state.gl.STATIC_DRAW);
            }
            const newSize = state.gl.getBufferParameter(state.gl.ARRAY_BUFFER, state.gl.BUFFER_SIZE) / 4;
            const COMPONENTS_PER_ELEMENT = 2;
            state.gl.vertexAttribPointer(state.position_location, COMPONENTS_PER_ELEMENT, state.gl.FLOAT, false, 0, 0);
            state.gl.uniform4fv(state.u_color_location, new Matrix(1, 4, [1, 1, 0, 1]).data);
            state.gl.drawArrays(state.gl.TRIANGLE_STRIP, 0, newSize / COMPONENTS_PER_ELEMENT);
        }
    };
    // Drawing Loop
    const loop = (timestamp) => {
        const dt = (timestamp - state.previous_render_timestamp) / 1000;
        if (dt <= 0)
            window.requestAnimationFrame(loop);
        state.previous_render_timestamp = timestamp;
        // red, green, blue, alpha
        state.gl.clearColor(0, 0, 0, 1);
        state.gl.clear(state.gl.COLOR_BUFFER_BIT);
        state.gl.viewport(0, 0, state.gl.canvas.width, state.gl.canvas.height);
        state.mat = Matrix.identity();
        state.mat = state.mat.translate(state.translationOffset[0], state.translationOffset[1]);
        state.mat = state.mat.rotate(state.rotationAngleRad);
        state.mat = state.mat.scale(state.scale, state.scale);
        drawWays();
        drawGraphData();
        drawNodes;
        drawClipAxis;
        drawBucket();
        drawStartEndNodes(dt);
        if (state.mouseClipPosition) {
            // const mouseWorldPosition = getMouseWorldPosition(state.mouseClipPosition, state.scale, state.translationOffset);
            // drawCircle(mouseWorldPosition[0], mouseWorldPosition[1], 0.005 / state.scale);
        }
        // if (state.startNode) {
        //     drawCircle(state.startNode.lon, state.startNode.lat, 0.006 / state.scale, [0, 1, 0]);
        // }
        // if (state.endNode) {
        //     drawCircle(state.endNode.lon, state.endNode.lat, 0.006 / state.scale, [1, 0, 0]);
        // }
        state.scale += (state.targetScale - state.scale) * 10 * dt;
        window.requestAnimationFrame(loop);
    };
    window.requestAnimationFrame((timestamp) => {
        state.previous_render_timestamp = timestamp;
        window.requestAnimationFrame(loop);
    });
}));
//# sourceMappingURL=index.js.map