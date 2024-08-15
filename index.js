"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const state = {};
function parseOSMXML() {
    return __awaiter(this, void 0, void 0, function* () {
        const osmXml = yield fetch('./data.osm').then(data => data.text());
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
function normalizeNodes(metadata, nodes) {
    const { maxLat, minLat, maxLon, minLon } = metadata;
    const latRange = maxLat - minLat;
    const lonRange = maxLon - minLon;
    const data = [];
    for (let i = 0; i < nodes.length; i++) {
        data.push((nodes[i].lon - minLon) / lonRange, (nodes[i].lat - minLat) / latRange);
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
function initGl() {
    const canvas = document.getElementById("canvas");
    const gl = canvas.getContext('webgl2');
    if (!gl) {
        throw new Error("Cannot create webgl context");
    }
    return gl;
}
function getMouseCanvasPosition(canvas, e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}
function getMouseClipPosition(canvas, e) {
    const { x, y } = getMouseCanvasPosition(canvas, e);
    // [0..1]
    let normalizedCanvasX = x / canvas.width;
    let normalizedCanvasY = y / canvas.height;
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
function makeWayNodesIdxsFor(type, ways, nodeIdIdxMap) {
    const wayNodesIdxs = [];
    for (let i = 0; i < ways.length; i++) {
        if (!ways[i].tags.get(type))
            continue;
        for (let j = 0; j < ways[i].node_ids.length; j++) {
            const nodeId = ways[i].node_ids[j];
            const idx = nodeIdIdxMap.get(nodeId);
            if (idx === undefined)
                throw new Error(`Invalid node id ${nodeId} referenced in a way ${i}, but not found in root data`);
            wayNodesIdxs.push(idx);
        }
        wayNodesIdxs.push(0xFFFFFFFF);
    }
    return wayNodesIdxs;
}
function drawLine(x1, y1, x2, y2) {
    const vbo = state.gl.createBuffer();
    state.gl.bindBuffer(state.gl.ARRAY_BUFFER, vbo);
    state.gl.bufferData(state.gl.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y2]), state.gl.STATIC_DRAW);
    const COMPONENTS_PER_AXIS = 2;
    state.gl.vertexAttribPointer(state.position_location, COMPONENTS_PER_AXIS, state.gl.FLOAT, false, 0, 0);
    state.gl.uniform2fv(state.offset_location, state.axisOffset);
    state.gl.uniform2fv(state.scale_location, [state.scale, state.scale]);
    state.gl.uniform4fv(state.color_location, [1, 0, 0, 1]);
    state.gl.drawArrays(state.gl.LINES, 0, 2);
}
function drawCircle(cx, cy, r) {
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
    state.gl.uniform2fv(state.offset_location, state.axisOffset);
    state.gl.uniform2fv(state.scale_location, [state.scale, state.scale]);
    state.gl.uniform4fv(state.color_location, [1, 0, 0, 1]);
    state.gl.drawArrays(state.gl.TRIANGLE_FAN, 0, points.length / 2);
    state.gl.deleteBuffer(vbo);
}
window.addEventListener('load', () => __awaiter(void 0, void 0, void 0, function* () {
    const xmlDoc = yield parseOSMXML();
    const nodes = getNodesFromXml(xmlDoc);
    const ways = getWaysFromXml(xmlDoc);
    const metadata = generateMetadata(nodes);
    const nodeIdIdxMap = makeNodesIdIdxMap(nodes);
    const nodesLonLatArray = normalizeNodes(metadata, nodes);
    const buildingNodesIdxs = makeWayNodesIdxsFor("building", ways, nodeIdIdxMap);
    const highwayNodesIdxs = makeWayNodesIdxsFor("highway", ways, nodeIdIdxMap);
    state.gl = initGl();
    const canvas = document.getElementById("canvas");
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    // Setup shader.
    const [vertex_source, fragment_source] = loadSources('#vertex-shader', '#fragment-shader');
    const vertex_shader = createShader('vertex', vertex_source);
    const fragment_shader = createShader('fragment', fragment_source);
    state.program = createProgram(vertex_shader, fragment_shader);
    state.gl.useProgram(state.program);
    state.position_location = state.gl.getAttribLocation(state.program, 'a_position');
    state.gl.enableVertexAttribArray(state.position_location);
    state.offset_location = state.gl.getUniformLocation(state.program, 'u_offset');
    state.scale_location = state.gl.getUniformLocation(state.program, 'u_scale');
    state.color_location = state.gl.getUniformLocation(state.program, 'u_color');
    const nodes_buffer = state.gl.createBuffer();
    state.gl.bindBuffer(state.gl.ARRAY_BUFFER, nodes_buffer);
    state.gl.bufferData(state.gl.ARRAY_BUFFER, new Float32Array(nodesLonLatArray), state.gl.STATIC_DRAW);
    const building_nodes_index_buffer = state.gl.createBuffer();
    state.gl.bindBuffer(state.gl.ELEMENT_ARRAY_BUFFER, building_nodes_index_buffer);
    state.gl.bufferData(state.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(buildingNodesIdxs), state.gl.STATIC_DRAW);
    const highnodes_index_buffer = state.gl.createBuffer();
    state.gl.bindBuffer(state.gl.ELEMENT_ARRAY_BUFFER, highnodes_index_buffer);
    state.gl.bufferData(state.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(highwayNodesIdxs), state.gl.STATIC_DRAW);
    // Initial state
    state.axisOffset = [-0.5, -0.5];
    state.anchor = undefined;
    state.scale = 1;
    state.targetScale = 1;
    state.previous_render_timestamp = 0;
    state.mouseClipPosition = undefined;
    state.mouseWorldPosition = undefined;
    // Events
    canvas.addEventListener('mousedown', (e) => {
        const { x, y } = getMouseClipPosition(canvas, e);
        state.anchor = [x, y];
    });
    canvas.addEventListener('mouseup', () => {
        if (state.anchor) {
            state.anchor = undefined;
        }
    });
    canvas.addEventListener('mousemove', (e) => {
        const { x, y } = getMouseClipPosition(canvas, e);
        state.mouseClipPosition = [x, y];
        if (state.anchor) {
            const dx = state.mouseClipPosition[0] - state.anchor[0];
            const dy = state.mouseClipPosition[1] - state.anchor[1];
            state.axisOffset = [
                state.axisOffset[0] + (dx / state.scale),
                state.axisOffset[1] + (dy / state.scale)
            ];
            state.anchor = [x, y];
        }
    });
    canvas.addEventListener('wheel', (e) => {
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
        state.gl.uniform2fv(state.offset_location, state.axisOffset);
        state.gl.uniform2fv(state.scale_location, [state.scale, state.scale]);
        state.gl.uniform4fv(state.color_location, [0, 1, 0, 1]);
        state.gl.drawArrays(state.gl.POINTS, 0, nodesLonLatArray.length / COMPONENTS_PER_NODE // How many points in the vbo
        );
    };
    const drawWays = () => {
        state.gl.bindBuffer(state.gl.ARRAY_BUFFER, nodes_buffer);
        const COMPONENTS_PER_WAY = 2;
        state.gl.vertexAttribPointer(state.position_location, COMPONENTS_PER_WAY, state.gl.FLOAT, false, 0, 0);
        state.gl.uniform2fv(state.offset_location, state.axisOffset);
        state.gl.uniform2fv(state.scale_location, [state.scale, state.scale]);
        state.gl.uniform4fv(state.color_location, [0.5, 0.35, 0.61, 1]);
        state.gl.bindBuffer(state.gl.ELEMENT_ARRAY_BUFFER, building_nodes_index_buffer);
        // Count is for the elements in the ebo, not vbo.
        state.gl.drawElements(state.gl.TRIANGLE_STRIP, buildingNodesIdxs.length, state.gl.UNSIGNED_INT, 0);
        state.gl.uniform4fv(state.color_location, [0, 0.8, 0.99, 1]);
        state.gl.bindBuffer(state.gl.ELEMENT_ARRAY_BUFFER, highnodes_index_buffer);
        state.gl.drawElements(state.gl.LINE_STRIP, highwayNodesIdxs.length, state.gl.UNSIGNED_INT, 0);
    };
    const drawClipAxis = () => {
        drawLine(1, 0, -1, 0);
        drawLine(0, 1, 0, -1);
    };
    // Drawing Loop
    const loop = (timestamp) => {
        const dt = (timestamp - state.previous_render_timestamp) / 1000;
        state.previous_render_timestamp = timestamp;
        // red, green, blue, alpha
        state.gl.clearColor(0, 0, 0, 1);
        state.gl.clear(state.gl.COLOR_BUFFER_BIT);
        state.gl.viewport(0, 0, state.gl.canvas.width, state.gl.canvas.height);
        drawWays();
        drawNodes();
        drawClipAxis();
        if (state.mouseClipPosition) {
            const mouseWorldPosition = getMouseWorldPosition(state.mouseClipPosition, state.scale, state.axisOffset);
            drawCircle(mouseWorldPosition[0], mouseWorldPosition[1], 0.005 / state.scale);
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