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
    return nodes.map(node => ({
        id: node.id,
        lat: (node.lat - minLat) / latRange,
        lon: ((node.lon - minLon) / lonRange)
    }));
}
function nodesToFloat32LonLatArray(nodes) {
    const flat = [];
    for (let i = 0; i < nodes.length; i++) {
        flat.push(nodes[i].lon, nodes[i].lat);
    }
    return new Float32Array(flat);
}
function createShader(gl, type, source) {
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
function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    if (!program) {
        throw new Error("Cannot create the program");
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
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
window.addEventListener('load', () => __awaiter(void 0, void 0, void 0, function* () {
    const xmlDoc = yield parseOSMXML();
    const nodes = getNodesFromXml(xmlDoc);
    const ways = getWaysFromXml(xmlDoc);
    const metadata = generateMetadata(nodes);
    const nodesFloat32LonLatArray = nodesToFloat32LonLatArray(normalizeNodes(metadata, nodes));
    const nodeIdIdxMap = makeNodesIdIdxMap(nodes);
    const buildingNodesIdxs = makeWayNodesIdxsFor("building", ways, nodeIdIdxMap);
    const highwayNodesIdxs = makeWayNodesIdxsFor("highway", ways, nodeIdIdxMap);
    const gl = initGl();
    const canvas = document.getElementById("canvas");
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    // Setup node shader.
    const [node_vertex_source, node_fragment_source] = loadSources('#node-vertex-shader', '#node-fragment-shader');
    const node_vertex_shader = createShader(gl, 'vertex', node_vertex_source);
    const node_fragment_shader = createShader(gl, 'fragment', node_fragment_source);
    const node_program = createProgram(gl, node_vertex_shader, node_fragment_shader);
    const node_position_location = gl.getAttribLocation(node_program, 'a_position');
    const node_offset_location = gl.getUniformLocation(node_program, 'u_offset');
    const node_scale_location = gl.getUniformLocation(node_program, 'u_scale');
    const node_position_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, node_position_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, nodesFloat32LonLatArray, gl.STATIC_DRAW);
    // Setup Ways shader.
    const [way_vertex_source, way_fragment_source] = loadSources('#way-vertex-shader', '#way-fragment-shader');
    const way_vertex_shader = createShader(gl, 'vertex', way_vertex_source);
    const way_fragment_shader = createShader(gl, 'fragment', way_fragment_source);
    const way_program = createProgram(gl, way_vertex_shader, way_fragment_shader);
    const way_position_location = gl.getAttribLocation(way_program, 'a_position');
    const way_offset_location = gl.getUniformLocation(way_program, 'u_offset');
    const way_scale_location = gl.getUniformLocation(way_program, 'u_scale');
    const way_color_location = gl.getUniformLocation(way_program, 'u_color');
    const way_position_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, way_position_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, nodesFloat32LonLatArray, gl.STATIC_DRAW);
    const building_nodes_index_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, building_nodes_index_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(buildingNodesIdxs), gl.STATIC_DRAW);
    const highway_nodes_index_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, highway_nodes_index_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(highwayNodesIdxs), gl.STATIC_DRAW);
    // State
    let center = [-0.5, -0.5];
    let anchor = undefined;
    let scale = 1;
    let targetScale = 1;
    let previous_render_timestamp = 0;
    // Events
    canvas.addEventListener('mousedown', (e) => {
        const { x, y } = getMouseCanvasPosition(canvas, e);
        anchor = [
            x / canvas.width,
            y / canvas.height
        ];
    });
    canvas.addEventListener('mouseup', () => {
        if (anchor) {
            anchor = undefined;
        }
    });
    canvas.addEventListener('mousemove', (e) => {
        if (anchor) {
            const { x, y } = getMouseCanvasPosition(canvas, e);
            const dx = (x / canvas.width) - anchor[0];
            const dy = -((y / canvas.height) - anchor[1]);
            center = [
                center[0] + (dx / scale) * 2,
                center[1] + (dy / scale) * 2
            ];
            anchor = [
                x / canvas.width,
                y / canvas.height
            ];
        }
    });
    canvas.addEventListener('wheel', (e) => {
        if (e.deltaY < 0) {
            targetScale++;
        }
        else if (targetScale - 1 > 0) {
            targetScale--;
        }
    });
    const drawNodes = () => {
        gl.useProgram(node_program);
        gl.enableVertexAttribArray(node_position_location);
        gl.bindBuffer(gl.ARRAY_BUFFER, node_position_buffer);
        const COMPONENTS_PER_NODE = 2;
        gl.vertexAttribPointer(node_position_location, COMPONENTS_PER_NODE, gl.FLOAT, false, 0, 0);
        gl.uniform2fv(node_offset_location, center);
        gl.uniform2fv(node_scale_location, [scale, scale]);
        gl.drawArrays(gl.POINTS, 0, nodesFloat32LonLatArray.length / COMPONENTS_PER_NODE // How many points in the vbo
        );
    };
    const drawWays = () => {
        gl.useProgram(way_program);
        gl.enableVertexAttribArray(way_position_location);
        gl.bindBuffer(gl.ARRAY_BUFFER, way_position_buffer);
        const COMPONENTS_PER_WAY = 2;
        gl.vertexAttribPointer(way_position_location, COMPONENTS_PER_WAY, gl.FLOAT, false, 0, 0);
        gl.uniform2fv(way_offset_location, center);
        gl.uniform2fv(way_scale_location, [scale, scale]);
        gl.uniform4fv(way_color_location, [0.5, 0.35, 0.61, 1]);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, building_nodes_index_buffer);
        // Count is for the elements in the ebo, not vbo.
        gl.drawElements(gl.TRIANGLE_STRIP, buildingNodesIdxs.length, gl.UNSIGNED_INT, 0);
        gl.uniform4fv(way_color_location, [0, 0.8, 0.99, 1]);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, highway_nodes_index_buffer);
        gl.drawElements(gl.LINE_STRIP, highwayNodesIdxs.length, gl.UNSIGNED_INT, 0);
    };
    const drawClipAxis = () => {
        gl.useProgram(way_program);
        gl.enableVertexAttribArray(way_position_location);
        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1, 0, -1, 0, 0, -1, 0, 1]), gl.STATIC_DRAW);
        const COMPONENTS_PER_AXIS = 2;
        gl.vertexAttribPointer(way_position_location, COMPONENTS_PER_AXIS, gl.FLOAT, false, 0, 0);
        gl.uniform2fv(way_offset_location, center);
        gl.uniform2fv(way_scale_location, [scale, scale]);
        gl.uniform4fv(way_color_location, [1, 0, 0, 1]);
        gl.drawArrays(gl.LINES, 0, 4);
    };
    // Drawing Loop
    const loop = (timestamp) => {
        const dt = (timestamp - previous_render_timestamp) / 1000;
        previous_render_timestamp = timestamp;
        // red, green, blue, alpha
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        drawWays();
        // drawNodes()
        drawClipAxis();
        scale += (targetScale - scale) * 10 * dt;
        window.requestAnimationFrame(loop);
    };
    window.requestAnimationFrame((timestamp) => {
        previous_render_timestamp = timestamp;
        window.requestAnimationFrame(loop);
    });
}));
//# sourceMappingURL=index.js.map