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
import { MouseButton } from "./types.js";
const state = {};
function parseOSMXML() {
    return __awaiter(this, void 0, void 0, function* () {
        const osmXml = yield fetch('./area.osm').then(data => data.text());
        const parser = new DOMParser();
        return parser.parseFromString(osmXml, 'text/xml');
    });
}
function getNodesFromXml(xml) {
    const nodesXml = Array.from(xml.getElementsByTagName('node'));
    const nodes = [];
    for (let i = 0; i < nodesXml.length; i++) {
        const lat = nodesXml[i].getAttribute('lat');
        const lon = nodesXml[i].getAttribute('lon');
        const id = nodesXml[i].getAttribute('id');
        if (id === null || lat === null || lon === null) {
            throw new Error(`Invalid id/lat/lon values: ${id}, ${lat}, ${lon}`);
        }
        nodes.push({
            id: parseInt(id),
            lat: parseFloat(lat),
            lon: parseFloat(lon)
        });
    }
    return nodes;
}
function getWaysFromXml(xml) {
    const waysXml = Array.from(xml.getElementsByTagName('way'));
    const ways = [];
    for (let i = 0; i < waysXml.length; i++) {
        const nodes = Array.from(waysXml[i].getElementsByTagName('nd'));
        const tags = Array.from(waysXml[i].getElementsByTagName('tag'));
        /**
         * "It is possible that faulty ways with zero or one node exist"
         * From: https://wiki.openstreetmap.org/wiki/Way
         */
        if (nodes.length <= 1)
            continue;
        const way = {
            node_ids: [],
            tags: new Map()
        };
        for (let j = 0; j < nodes.length; j++) {
            const ref = nodes[j].getAttribute("ref");
            if (!ref)
                throw new Error("Invalid node ref");
            way.node_ids.push(Number(ref));
        }
        for (let j = 0; j < tags.length; j++) {
            const key = tags[j].getAttribute("k");
            const value = tags[j].getAttribute("v");
            if (!key || !value)
                throw new Error("Invalid key/value pair");
            way.tags.set(key, value);
        }
        ways.push(way);
    }
    return ways;
}
function generateMetadata(nodes) {
    let minLat = Number.MAX_VALUE;
    let maxLat = Number.MIN_VALUE;
    let minLon = Number.MAX_VALUE;
    let maxLon = Number.MIN_VALUE;
    for (let node of nodes) {
        minLat = Math.min(minLat, node.lat);
        maxLat = Math.max(maxLat, node.lat);
        minLon = Math.min(minLon, node.lon);
        maxLon = Math.max(maxLon, node.lon);
    }
    return {
        minLat,
        maxLat,
        minLon,
        maxLon,
        nodesCount: nodes.length
    };
}
function normalizeNode(node) {
    const { maxLat, minLat, maxLon, minLon } = state.metadata;
    const latRange = maxLat - minLat;
    const lonRange = maxLon - minLon;
    return Object.assign(Object.assign({}, node), { lon: (node.lon - minLon) / lonRange, lat: (node.lat - minLat) / latRange });
}
function normalizeNodes(nodes) {
    const data = [];
    for (let i = 0; i < nodes.length; i++) {
        const normalized = normalizeNode(nodes[i]);
        data.push(normalized.lon, normalized.lat);
    }
    return data;
}
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
function initCanvas() {
    const canvas = document.getElementById("canvas");
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    return canvas;
}
function initGl() {
    const gl = state.canvas.getContext('webgl2');
    if (!gl) {
        throw new Error("Cannot create webgl context");
    }
    return gl;
}
function initShader(vertexShaderIdL, fragmentShaderId) {
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
const getMouseWorldPosition = (mouseClipPosition, scale, offset) => {
    return [
        ((mouseClipPosition[0] / scale) - offset[0]),
        ((mouseClipPosition[1] / scale) - offset[1]),
    ];
};
function makeNodesIdIdxMap(nodes) {
    const map = new Map();
    for (let i = 0; i < nodes.length; i++) {
        map.set(nodes[i].id, i);
    }
    return map;
}
function getNodesFromWayWithTag(type, ways, nodes, nodeIdIdxMap) {
    const filteredNodes = [];
    for (let i = 0; i < ways.length; i++) {
        if (!ways[i].tags.get(type))
            continue;
        for (let j = 0; j < ways[i].node_ids.length; j++) {
            const nodeId = ways[i].node_ids[j];
            const idx = nodeIdIdxMap.get(nodeId);
            if (idx === undefined)
                throw new Error(`Invalid node id ${nodeId} referenced in a way ${i}, but not found in root data`);
            filteredNodes.push(nodes[idx]);
        }
        filteredNodes.push(undefined);
    }
    return filteredNodes;
}
function getNodeIdxs(nodes, nodeIdIdxMap) {
    const wayNodesIdxs = [];
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node === undefined) {
            wayNodesIdxs.push(0xFFFFFFFF);
            continue;
        }
        const nodeId = node.id;
        const idx = nodeIdIdxMap.get(nodeId);
        if (idx === undefined)
            throw new Error(`Invalid node id ${nodeId} referenced in a way ${i}, but not found in root data`);
        wayNodesIdxs.push(idx);
    }
    return wayNodesIdxs;
}
function drawLine(x1, y1, x2, y2) {
    const vbo = state.gl.createBuffer();
    state.gl.bindBuffer(state.gl.ARRAY_BUFFER, vbo);
    state.gl.bufferData(state.gl.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y2]), state.gl.STATIC_DRAW);
    const COMPONENTS_PER_AXIS = 2;
    state.gl.vertexAttribPointer(state.position_location, COMPONENTS_PER_AXIS, state.gl.FLOAT, false, 0, 0);
    state.gl.uniform4fv(state.u_color_location, [1, 0, 0, 1]);
    state.gl.drawArrays(state.gl.LINES, 0, 2);
}
function drawCircle(cx, cy, r, color) {
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
function findPath(previous, nodeIdIdxMap) {
    if (state.endNode === undefined)
        return;
    const path = [];
    let u = String(nodeIdIdxMap.get(state.endNode.id));
    if (u === undefined)
        throw new Error(`Cannot find target node in the reverse lookup ${1}`);
    let i = 0;
    while (u !== undefined) {
        path.unshift(u);
        u = previous[u];
        i++;
    }
    console.log(i);
    return path;
}
function dijkstra(nodeIdIdxMap) {
    if (!state.startNode)
        return;
    let distances = {};
    let previous = {};
    const visited = new Set();
    let nodes = Object.keys(state.graph);
    for (let node of nodes) {
        distances[node] = Infinity;
        previous[node] = undefined;
    }
    const startNodeIndex = nodeIdIdxMap.get(state.startNode.id);
    if (!startNodeIndex)
        throw new Error("Start node not found in reverse lookup");
    distances[startNodeIndex] = 0;
    while (nodes.length > 0) {
        nodes.sort((a, b) => distances[a] - distances[b]);
        const closestNodeIndex = nodes.shift();
        if (distances[closestNodeIndex] === Infinity)
            break;
        visited.add(closestNodeIndex);
        for (let neighbor in state.graph[closestNodeIndex]) {
            // If the neighbor hasn't been visited yet
            if (!visited.has(neighbor)) {
                // Calculate tentative distance to the neighboring node
                let newDistance = distances[closestNodeIndex] + state.graph[closestNodeIndex][neighbor];
                // If the newly calculated distance is shorter than the previously known distance to this neighbor
                if (newDistance < distances[neighbor]) {
                    // Update the shortest distance to this neighbor
                    distances[neighbor] = newDistance;
                    previous[neighbor] = closestNodeIndex;
                }
            }
        }
    }
    return { distances, previous };
}
/**
 * Ref: http://www.movable-type.co.uk/scripts/latlong.html
 * @param lon1
 * @param lat1
 * @param lon2
 * @param lat2
 */
function haversine(lon1, lat1, lon2, lat2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // in metres
    return d;
}
function buildGraph(nodes, nodeIdIdxMap) {
    const graph = {};
    for (let i = 0; i < nodes.length; i++) {
        const start = nodes[i];
        const end = nodes[i + 1];
        if (start && end) {
            const startIndex = nodeIdIdxMap.get(start.id);
            const endIndex = nodeIdIdxMap.get(end.id);
            if (startIndex === undefined || endIndex === undefined) {
                throw new Error("Cannot find index for node ids");
            }
            const distance = haversine(start.lon, start.lat, end.lon, end.lat);
            if (graph[startIndex] === undefined) {
                graph[startIndex] = {};
            }
            graph[startIndex][endIndex] = distance;
        }
        else {
            continue;
        }
    }
    state.graph = graph;
}
window.addEventListener('load', () => __awaiter(void 0, void 0, void 0, function* () {
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
    const xmlDoc = yield parseOSMXML();
    const nodes = getNodesFromXml(xmlDoc);
    const ways = getWaysFromXml(xmlDoc);
    state.metadata = generateMetadata(nodes);
    const nodeIdIdxMap = makeNodesIdIdxMap(nodes);
    const highwayNodes = getNodesFromWayWithTag("highway", ways, nodes, nodeIdIdxMap);
    const buildingNodes = getNodesFromWayWithTag("building", ways, nodes, nodeIdIdxMap);
    const nodesLonLatArray = normalizeNodes(nodes);
    const buildingNodesIdxs = getNodeIdxs(buildingNodes, nodeIdIdxMap);
    const highwayNodesIdxs = getNodeIdxs(highwayNodes, nodeIdIdxMap);
    buildGraph(highwayNodes, nodeIdIdxMap);
    state.bucketMap = new BucketMap(state.metadata, nodeIdIdxMap);
    state.bucketMap.populate(highwayNodes.filter(x => !!x));
    state.canvas = initCanvas();
    state.gl = initGl();
    initShader('#vertex-shader', '#fragment-shader');
    const nodes_buffer = state.gl.createBuffer();
    state.gl.bindBuffer(state.gl.ARRAY_BUFFER, nodes_buffer);
    state.gl.bufferData(state.gl.ARRAY_BUFFER, new Float32Array(nodesLonLatArray), state.gl.STATIC_DRAW);
    const building_nodes_index_buffer = state.gl.createBuffer();
    state.gl.bindBuffer(state.gl.ELEMENT_ARRAY_BUFFER, building_nodes_index_buffer);
    state.gl.bufferData(state.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(buildingNodesIdxs), state.gl.STATIC_DRAW);
    const highnodes_index_buffer = state.gl.createBuffer();
    state.gl.bindBuffer(state.gl.ELEMENT_ARRAY_BUFFER, highnodes_index_buffer);
    state.gl.bufferData(state.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(highwayNodesIdxs), state.gl.STATIC_DRAW);
    const path_buffer = state.gl.createBuffer();
    state.gl.bindBuffer(state.gl.ELEMENT_ARRAY_BUFFER, path_buffer);
    state.gl.bufferData(state.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(state.path), state.gl.STATIC_DRAW);
    // Events
    state.canvas.addEventListener('mousedown', (e) => {
        const { x, y } = getMouseClipPosition(e);
        state.anchor = [x, y];
        if (state.activeBucket.length === 1) {
            const timeoutId = setTimeout(() => {
                if (e.button == MouseButton.Left) {
                    state.startNode = normalizeNode(state.activeBucket[0].node);
                }
                else if (e.button == MouseButton.Right) {
                    state.endNode = normalizeNode(state.activeBucket[0].node);
                }
                else if (e.button == MouseButton.Middle) {
                    state.startNode = undefined;
                    state.endNode = undefined;
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
            const result = dijkstra(nodeIdIdxMap);
            if (result) {
                const path = findPath(result.previous, nodeIdIdxMap);
                if (path) {
                    state.path = path.map(x => Number(x));
                }
            }
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
        state.gl.drawArrays(state.gl.POINTS, 0, nodesLonLatArray.length / COMPONENTS_PER_NODE // How many points in the vbo
        );
    };
    const drawWays = () => {
        state.gl.bindBuffer(state.gl.ARRAY_BUFFER, nodes_buffer);
        const COMPONENTS_PER_WAY = 2;
        state.gl.vertexAttribPointer(state.position_location, COMPONENTS_PER_WAY, state.gl.FLOAT, false, 0, 0);
        state.gl.uniformMatrix3fv(state.u_matrix_location, false, state.mat.data);
        state.gl.uniform4fv(state.u_color_location, [0.5, 0.35, 0.61, 1]);
        state.gl.bindBuffer(state.gl.ELEMENT_ARRAY_BUFFER, building_nodes_index_buffer);
        // Count is for the elements in the ebo, not vbo.
        state.gl.drawElements(state.gl.TRIANGLE_STRIP, buildingNodesIdxs.length, state.gl.UNSIGNED_INT, 0);
        state.gl.uniform4fv(state.u_color_location, [0, 0.8, 0.99, 1]);
        state.gl.bindBuffer(state.gl.ELEMENT_ARRAY_BUFFER, highnodes_index_buffer);
        state.gl.drawElements(state.gl.LINE_STRIP, highwayNodesIdxs.length, state.gl.UNSIGNED_INT, 0);
        state.gl.uniform4fv(state.u_color_location, [1, 0, 0, 1]);
        state.gl.bindBuffer(state.gl.ELEMENT_ARRAY_BUFFER, path_buffer);
        state.gl.bufferData(state.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(state.path), state.gl.STATIC_DRAW);
        state.gl.drawElements(state.gl.LINE_STRIP, state.path.length, state.gl.UNSIGNED_INT, 0);
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
            const lon = nodesLonLatArray[idx * 2];
            const lat = nodesLonLatArray[idx * 2 + 1];
            centers.push([lon, lat]);
            drawCircle(lon, lat, 0.003 / state.scale, [1, 1, 0]);
        }
    };
    // Drawing Loop
    const loop = (timestamp) => {
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
        // drawNodes();
        drawClipAxis();
        drawBucket();
        if (state.mouseClipPosition) {
            const mouseWorldPosition = getMouseWorldPosition(state.mouseClipPosition, state.scale, state.translationOffset);
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
    };
    window.requestAnimationFrame((timestamp) => {
        state.previous_render_timestamp = timestamp;
        window.requestAnimationFrame(loop);
    });
}));
//# sourceMappingURL=index.js.map