import BucketMap from "./bucket.js";
import { Matrix } from "./matrix.js"
import { initBuildingNodes, initHighwayNodes, initMetadata, initNodesAndReverseLookup, initWays, normalizeNode, initFlatNodeData, parseOSMXML } from "./parser.js";
import { drawCircle, drawLine, initGl, initShader } from "./webgl.js";
import { state } from "./state.js";
import { MouseButton } from "./types.js";
import { initCanvas } from "./canvas.js";
import { worker } from "./worker-manager.js";
import { buildGraph } from "./pathfinding.js";


function getMouseCanvasPosition(e: MouseEvent): { x: number, y: number } {
    const rect = state.canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    }
}

function getMouseClipPosition(e: MouseEvent): { x: number, y: number } {
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
    }
}

function getMouseWorldPosition (mouseClipPosition: [number, number], scale: number, offset: [number, number]) {
    return [
        ((mouseClipPosition[0] / scale) - offset[0]),
        ((mouseClipPosition[1] / scale) - offset[1]),
    ]
}

window.addEventListener('load', async () => {
    // Initial state
    state.translationOffset = [-0.5, -0.5];
    state.anchor = undefined;
    state.scale = 1;
    state.rotationAngleRad = 0;
    state.targetScale = 1;
    state.previous_render_timestamp = 0;
    state.mouseClipPosition = undefined;
    state.mouseWorldPosition = undefined;
    state.activeBucket = [];
    state.startNode = undefined;
    state.timeouts = [];
    state.graph = {};
    state.path = [];
    state.visited = new Set();

    const proxy = await worker();


    await parseOSMXML();
    initNodesAndReverseLookup();
    initWays();
    initMetadata();
    initHighwayNodes();
    initBuildingNodes();
    initFlatNodeData()
    BucketMap.init();
    state.bucketMap.populate(state.highwayNodes);

    initCanvas();
    initGl();
    initShader('#vertex-shader', '#fragment-shader');

    // Worker stuff
    buildGraph(state.nodes, state.highwayNodesIdxs, state.nodeIdIdxMap)
    proxy.buildGraph(state.nodes, state.highwayNodesIdxs, state.nodeIdIdxMap)

    const nodes_buffer = state.gl.createBuffer()
    state.gl.bindBuffer(state.gl.ARRAY_BUFFER, nodes_buffer);
    state.gl.bufferData(state.gl.ARRAY_BUFFER, new Float32Array(state.normalizedNodesLonLatArray), state.gl.STATIC_DRAW);

    const building_nodes_index_buffer = state.gl.createBuffer();
    state.gl.bindBuffer(state.gl.ELEMENT_ARRAY_BUFFER, building_nodes_index_buffer);
    state.gl.bufferData(state.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(state.buildingNodesIdxs), state.gl.STATIC_DRAW);

    const highnodes_index_buffer = state.gl.createBuffer();
    state.gl.bindBuffer(state.gl.ELEMENT_ARRAY_BUFFER, highnodes_index_buffer);
    state.gl.bufferData(state.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(state.highwayNodesIdxs), state.gl.STATIC_DRAW);

    const path_buffer = state.gl.createBuffer();
    state.gl.bindBuffer(state.gl.ELEMENT_ARRAY_BUFFER, path_buffer);
    state.gl.bufferData(state.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(state.path), state.gl.STATIC_DRAW);


    // Events
    state.canvas.addEventListener('mousedown', (e) => {
        const { x, y } = getMouseClipPosition(e);
        state.anchor = [x, y]
        if (state.activeBucket.length === 1) {
            const timeoutId = setTimeout(() => {
                if (e.button == MouseButton.Left) {
                    state.startNode = normalizeNode(state.activeBucket[0].node)
                } else if (e.button == MouseButton.Right) {
                    state.endNode = normalizeNode(state.activeBucket[0].node)
                } else if (e.button == MouseButton.Middle) {
                    state.startNode = undefined;
                    state.endNode = undefined;
                }
            }, 200)
            state.timeouts.push(timeoutId)
        }
    })

    state.canvas.addEventListener('mouseup', () => {
        if (state.anchor) {
            state.anchor = undefined;
        }
    })

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
            ]

            state.anchor = [x, y];
            
        }

    })

    document.addEventListener('contextmenu', event => event.preventDefault());
    window.addEventListener("keydown", (e) => {
        if (e.key === 'Control') {
            state.isCtrlPressed = true;
        }

        if (e.code === 'Space') {
            state.path = [];
            state.visited = new Set();
            proxy.dijkstra(state.startNode, state.nodeIdIdxMap)
            .then((result: any) => {
                if (result) {
                    proxy.findPath(result.previous, state.endNode, state.nodeIdIdxMap)
                    .then((path: any) => {
                        if (path) {
                            console.log(path);
                            state.path = path.map((x: any) => Number(x));
                        }
                    })
                } 
            })
        }
    })

    window.addEventListener("keyup", (e) => {
        if (e.key === 'Control') {
            state.isCtrlPressed = false;
        }
    })

    state.canvas.addEventListener('wheel', (e) => {
        if (e.deltaY < 0) {
            state.targetScale++;
        } else if (state.targetScale - 1 > 0) {
            state.targetScale--;
        }
    })

    const drawNodes = () => {
        state.gl.bindBuffer(state.gl.ARRAY_BUFFER, nodes_buffer);
        const COMPONENTS_PER_NODE = 2;
        state.gl.vertexAttribPointer(state.position_location, COMPONENTS_PER_NODE, state.gl.FLOAT, false, 0, 0);

        state.gl.uniformMatrix3fv(state.u_matrix_location, false, state.mat.data);
        state.gl.uniform4fv(state.u_color_location, [0, 1, 0, 1]);

        state.gl.drawArrays(
            state.gl.POINTS,
            0,
            state.normalizedNodesLonLatArray.length / COMPONENTS_PER_NODE // How many points in the vbo
        );
    }

    const drawWays = () => {
        state.gl.bindBuffer(state.gl.ARRAY_BUFFER, nodes_buffer);
        const COMPONENTS_PER_WAY = 2;
        state.gl.vertexAttribPointer(state.position_location, COMPONENTS_PER_WAY, state.gl.FLOAT, false, 0, 0);

        state.gl.uniformMatrix3fv(state.u_matrix_location, false, state.mat.data);
        state.gl.uniform4fv(state.u_color_location, [0.5, 0.35, 0.61, 1]);

        state.gl.bindBuffer(state.gl.ELEMENT_ARRAY_BUFFER, building_nodes_index_buffer);
        // Count is for the elements in the ebo, not vbo.
        state.gl.drawElements(state.gl.TRIANGLE_STRIP, state.buildingNodesIdxs.length, state.gl.UNSIGNED_INT, 0);

        state.gl.uniform4fv(state.u_color_location, [0, 0.8, 0.99, 1]);
        state.gl.bindBuffer(state.gl.ELEMENT_ARRAY_BUFFER, highnodes_index_buffer);
        state.gl.drawElements(state.gl.LINE_STRIP, state.highwayNodesIdxs.length, state.gl.UNSIGNED_INT, 0);


        state.gl.uniform4fv(state.u_color_location, [1, 0, 0, 1]);
        state.gl.bindBuffer(state.gl.ELEMENT_ARRAY_BUFFER, path_buffer);
        state.gl.bufferData(state.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(state.path), state.gl.STATIC_DRAW);
        state.gl.drawElements(state.gl.LINE_STRIP, state.path.length, state.gl.UNSIGNED_INT, 0);
    }

    const drawClipAxis = () => {
        drawLine(1, 0, -1, 0);
        drawLine(0, 1, 0, -1);
    }

    const drawBucket = () => {
        state.gl.bindBuffer(state.gl.ARRAY_BUFFER, nodes_buffer);
        const COMPONENTS_PER_WAY = 2;
        state.gl.vertexAttribPointer(state.position_location, COMPONENTS_PER_WAY, state.gl.FLOAT, false, 0, 0);

        state.gl.uniformMatrix3fv(state.u_matrix_location, false, state.mat.data);
        state.gl.uniform4fv(state.u_color_location, [1, 0, 0, 1]);

        const centers: number[][] = [];
        for (let i = 0; i < state.activeBucket.length; i++) {
            const idx = state.activeBucket[i].glIndex;
            if (idx === 0xFFFFFFFF) continue;
            const lon = state.normalizedNodesLonLatArray[idx * 2];
            const lat = state.normalizedNodesLonLatArray[idx * 2 + 1];
            centers.push([lon, lat]);
            drawCircle(lon, lat, 0.003 / state.scale, [1, 1, 0]);
        }
    }

    const drawVisitedPath = () => {
        state.gl.bindBuffer(state.gl.ARRAY_BUFFER, nodes_buffer);
        const COMPONENTS_PER_WAY = 2;
        state.gl.vertexAttribPointer(state.position_location, COMPONENTS_PER_WAY, state.gl.FLOAT, false, 0, 0);
        state.gl.uniformMatrix3fv(state.u_matrix_location, false, state.mat.data);
        state.gl.uniform4fv(state.u_color_location, [1, 0, 0, 1]);
        const visitedIdxs = Array.from(state.visited.keys());
        const buf = state.gl.createBuffer();        
        state.gl.bindBuffer(state.gl.ELEMENT_ARRAY_BUFFER, buf);
        state.gl.bufferData(state.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(visitedIdxs), state.gl.STATIC_DRAW);
        state.gl.drawElements(state.gl.POINTS, visitedIdxs.length, state.gl.UNSIGNED_INT, 0);
        state.gl.deleteBuffer(buf);
    }

    // Drawing Loop
    const loop = (timestamp: number) => {
        const dt = (timestamp - state.previous_render_timestamp) / 1000;
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
        drawNodes;
        drawClipAxis();
        drawBucket();
        drawVisitedPath();
        if (state.mouseClipPosition) {
            // const mouseWorldPosition = getMouseWorldPosition(state.mouseClipPosition, state.scale, state.translationOffset);
            // drawCircle(mouseWorldPosition[0], mouseWorldPosition[1], 0.005 / state.scale);
        }

        if (state.startNode) {
            drawCircle(state.startNode.lon, state.startNode.lat, 0.006 / state.scale, [0, 1, 0]);
        }

        if (state.endNode) {
            drawCircle(state.endNode.lon, state.endNode.lat, 0.006 / state.scale, [1, 0, 0]);
        }

        state.scale += (state.targetScale - state.scale) * 10 * dt;
        window.requestAnimationFrame(loop);
    }
    window.requestAnimationFrame((timestamp) => {
        state.previous_render_timestamp = timestamp;

        window.requestAnimationFrame(loop);
    });

})