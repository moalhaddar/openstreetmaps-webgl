type OSMNode = {
    id: number;
    lat: number;
    lon: number;
}

type State = {
    program: WebGLProgram,
    position_location: number,
    offset_location: WebGLUniformLocation,
    scale_location: WebGLUniformLocation,
    color_location: WebGLUniformLocation,
    
    // transformations
    axisOffset: [number, number]
    scale: number
    
    // dragging
    anchor: [number, number] | undefined

    // zooming
    targetScale: number;

    // frametime
    previous_render_timestamp: number;

    // mouse
    mouseWorldPosition: [number, number] | undefined;
    mouseClipPosition: [number, number] | undefined;

}

const state: State = {} as any;

async function parseOSMXML() {
    const osmXml = await fetch('./data.osm').then(data => data.text())
    const parser = new DOMParser();    
    return parser.parseFromString(osmXml, 'text/xml');
}

function getNodesFromXml(xml: Document): OSMNode[] {
    const nodesXml = Array.from(xml.getElementsByTagName('node'));
    const nodes: OSMNode[] = [];
    for (let i = 0; i < nodesXml.length; i++) {
        const lat = nodesXml[i].getAttribute('lat')
        const lon = nodesXml[i].getAttribute('lon')
        const id = nodesXml[i].getAttribute('id')
        if (id === null || lat === null || lon === null) {
            throw new Error(`Invalid id/lat/lon values: ${id}, ${lat}, ${lon}`);
        }
        nodes.push({
            id: parseInt(id),
            lat: parseFloat(lat),
            lon: parseFloat(lon)
        })
    }

    return nodes;
}

type OSMWay = {
    node_ids: number[]
    tags: Map<string, string>
}

function getWaysFromXml(xml: Document): OSMWay[] {
    const waysXml = Array.from(xml.getElementsByTagName('way'));
    const ways: OSMWay[] = [];

    for (let i = 0; i < waysXml.length; i++) {
        const nodes = Array.from(waysXml[i].getElementsByTagName('nd'));
        const tags = Array.from(waysXml[i].getElementsByTagName('tag'));
        /**
         * "It is possible that faulty ways with zero or one node exist"
         * From: https://wiki.openstreetmap.org/wiki/Way
         */
        if (nodes.length <= 1) continue; 

        const way: OSMWay = {
            node_ids: [],
            tags: new Map<string, string>()
        }

        for (let j = 0; j < nodes.length; j++) {
            const ref = nodes[j].getAttribute("ref");
            if (!ref) throw new Error("Invalid node ref");
            way.node_ids.push(Number(ref));
        }

        for (let j = 0; j < tags.length; j++) {
            const key = tags[j].getAttribute("k");
            const value = tags[j].getAttribute("v");
            if (!key || !value) throw new Error("Invalid key/value pair");
            way.tags.set(key, value);
        }
        ways.push(way);
    }

    return ways;
}


type Metadata = {
    minLat: number,
    maxLat: number,
    minLon: number,
    maxLon: number,
    nodesCount: number
}

function generateMetadata(nodes: OSMNode[]): Metadata {
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

function normalizeNodes(metadata: Metadata, nodes: OSMNode[]): number[] {
    const {maxLat, minLat, maxLon, minLon} = metadata;

    const latRange = maxLat - minLat;
    const lonRange = maxLon - minLon;

    const data = [];
    for (let i = 0; i < nodes.length; i++) {
        data.push(
            (nodes[i].lon - minLon) / lonRange,
            (nodes[i].lat - minLat) / latRange,
        )
    }

    return data;
}

function createShader(gl: WebGLRenderingContext, type: 'vertex' | 'fragment', source: string): WebGLShader {
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

function createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
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

function initGl(): WebGLRenderingContext {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    const gl = canvas.getContext('webgl2');
    if (!gl) {
        throw new Error("Cannot create webgl context");
    }

    return gl;
}

function getMouseCanvasPosition(canvas: HTMLCanvasElement, e: MouseEvent): {x: number, y: number} {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    }
}

function getMouseClipPosition(canvas: HTMLCanvasElement, e: MouseEvent): {x: number, y: number} {
    const {x, y} = getMouseCanvasPosition(canvas, e);
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
    }
}

const getMouseWorldPosition = (mouseClipPosition: [number, number], scale: number, offset: [number, number]) => {
    return [
        ((mouseClipPosition[0] / scale) - offset[0]), 
        ((mouseClipPosition[1] / scale) - offset[1]), 
    ]
}

function makeNodesIdIdxMap(nodes: OSMNode[]): Map<number, number> {
    const map = new Map<number, number>();
    for (let i = 0; i < nodes.length; i++) {
        map.set(nodes[i].id, i);
    }

    return map
}

function makeWayNodesIdxsFor(type: "highway" | "building", ways: OSMWay[], nodeIdIdxMap: Map<number, number>): number[] {
    const wayNodesIdxs: number[] = [];
    for (let i = 0; i < ways.length; i++) {
        if (!ways[i].tags.get(type)) continue;
        for (let j = 0; j < ways[i].node_ids.length; j++) {
            const nodeId = ways[i].node_ids[j];
            const idx = nodeIdIdxMap.get(nodeId);
            if (idx === undefined) throw new Error(`Invalid node id ${nodeId} referenced in a way ${i}, but not found in root data`);
            wayNodesIdxs.push(idx);
        }
        wayNodesIdxs.push(0xFFFFFFFF);
    }
    return wayNodesIdxs;
}

function drawLine(gl: WebGLRenderingContext, x1: number, y1: number, x2: number, y2: number) {
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1, 0, -1, 0, 0, -1, 0, 1]), gl.STATIC_DRAW);
    const COMPONENTS_PER_AXIS = 2;
    gl.vertexAttribPointer(state.position_location, COMPONENTS_PER_AXIS, gl.FLOAT, false, 0, 0);
    gl.uniform2fv(state.offset_location, state.axisOffset);
    gl.uniform2fv(state.scale_location, [state.scale, state.scale]);
    gl.uniform4fv(state.color_location, [1, 0, 0, 1]);
    gl.drawArrays(gl.LINES, 0, 2);
}

window.addEventListener('load', async () => {
    const xmlDoc = await parseOSMXML();
    const nodes = getNodesFromXml(xmlDoc);
    const ways = getWaysFromXml(xmlDoc);
    
    const metadata = generateMetadata(nodes);
    const nodeIdIdxMap = makeNodesIdIdxMap(nodes);
    const nodesLonLatArray = normalizeNodes(metadata, nodes)
    const buildingNodesIdxs = makeWayNodesIdxsFor("building", ways, nodeIdIdxMap);
    const highwayNodesIdxs = makeWayNodesIdxsFor("highway", ways, nodeIdIdxMap);

    const gl = initGl();
    
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    // Setup shader.
    const [vertex_source, fragment_source] = loadSources('#vertex-shader', '#fragment-shader');
    const vertex_shader = createShader(gl, 'vertex', vertex_source);
    const fragment_shader = createShader(gl, 'fragment', fragment_source);
    state.program = createProgram(gl, vertex_shader, fragment_shader)
    state.position_location = gl.getAttribLocation(state.program, 'a_position');
    state.offset_location = gl.getUniformLocation(state.program, 'u_offset') as WebGLUniformLocation;
    state.scale_location = gl.getUniformLocation(state.program, 'u_scale') as WebGLUniformLocation;
    state.color_location = gl.getUniformLocation(state.program, 'u_color') as WebGLUniformLocation;

    const nodes_buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, nodes_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nodesLonLatArray), gl.STATIC_DRAW);

    const building_nodes_index_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, building_nodes_index_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(buildingNodesIdxs), gl.STATIC_DRAW);

    const highnodes_index_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, highnodes_index_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(highwayNodesIdxs), gl.STATIC_DRAW);

    // State
    state.axisOffset = [-0.5, -0.5];
    state.anchor = undefined;
    state.scale = 1;
    state.targetScale = 1;
    state.previous_render_timestamp = 0;
    state.mouseClipPosition = undefined;
    state.mouseWorldPosition = undefined;

    // Events
    canvas.addEventListener('mousedown', (e) => {
        const {x, y} = getMouseClipPosition(canvas, e);
        state.anchor = [x, y]
    })

    canvas.addEventListener('mouseup', () => {
        if (state.anchor) {
            state.anchor = undefined;
        }
    })

    canvas.addEventListener('mousemove', (e) => {
        const {x, y} = getMouseClipPosition(canvas, e);
        state.mouseClipPosition = [x, y];
        if (state.anchor) {
            const dx = state.mouseClipPosition[0] - state.anchor[0];
            const dy = state.mouseClipPosition[1] - state.anchor[1];
            state.axisOffset = [
                state.axisOffset[0] + (dx / state.scale),
                state.axisOffset[1] + (dy / state.scale)
            ]
            
            state.anchor = [x, y];
        }  
    })

    canvas.addEventListener('wheel', (e) => {
        if (e.deltaY < 0) {
            state.targetScale++;
        } else if (state.targetScale - 1 > 0) {
            state.targetScale--;
        }
    })

    const drawNodes = () => {
        gl.useProgram(state.program);
        gl.enableVertexAttribArray(state.position_location);
        gl.bindBuffer(gl.ARRAY_BUFFER, nodes_buffer);
        const COMPONENTS_PER_NODE = 2;
        gl.vertexAttribPointer(state.position_location, COMPONENTS_PER_NODE, gl.FLOAT, false, 0, 0);
        gl.uniform2fv(state.offset_location, state.axisOffset);
        gl.uniform2fv(state.scale_location, [state.scale, state.scale]);
        gl.uniform4fv(state.color_location, [0, 1, 0, 1]);
        gl.drawArrays(
            gl.POINTS, 
            0, 
            nodesLonLatArray.length / COMPONENTS_PER_NODE // How many points in the vbo
        );
    }
    
    const drawWays = () => {
        gl.useProgram(state.program);
        gl.enableVertexAttribArray(state.position_location);
        gl.bindBuffer(gl.ARRAY_BUFFER, nodes_buffer);
        const COMPONENTS_PER_WAY = 2;
        gl.vertexAttribPointer(state.position_location, COMPONENTS_PER_WAY, gl.FLOAT, false, 0, 0);
        gl.uniform2fv(state.offset_location, state.axisOffset);
        gl.uniform2fv(state.scale_location, [state.scale, state.scale]);

        gl.uniform4fv(state.color_location, [0.5, 0.35, 0.61, 1]);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, building_nodes_index_buffer);
        // Count is for the elements in the ebo, not vbo.
        gl.drawElements(gl.TRIANGLE_STRIP, buildingNodesIdxs.length, gl.UNSIGNED_INT, 0);

        gl.uniform4fv(state.color_location, [0, 0.8, 0.99, 1]);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, highnodes_index_buffer);
        gl.drawElements(gl.LINE_STRIP, highwayNodesIdxs.length, gl.UNSIGNED_INT, 0);
    }

    const drawClipAxis = () => {
        gl.useProgram(state.program);
        gl.enableVertexAttribArray(state.position_location);
        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1, 0, -1, 0, 0, -1, 0, 1]), gl.STATIC_DRAW);
        const COMPONENTS_PER_AXIS = 2;
        gl.vertexAttribPointer(state.position_location, COMPONENTS_PER_AXIS, gl.FLOAT, false, 0, 0);
        gl.uniform2fv(state.offset_location, state.axisOffset);
        gl.uniform2fv(state.scale_location, [state.scale, state.scale]);
        gl.uniform4fv(state.color_location, [1, 0, 0, 1]);
        gl.drawArrays(gl.LINES, 0, 4);
        gl.deleteBuffer(vbo);
    }

    const drawMouseCircle = (cx: number, cy: number, r: number) => {
        gl.useProgram(state.program);
        gl.enableVertexAttribArray(state.position_location);
        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
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
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
        const COMPONENTS_PER_AXIS = 2;
        gl.vertexAttribPointer(state.position_location, COMPONENTS_PER_AXIS, gl.FLOAT, false, 0, 0);
        gl.uniform2fv(state.offset_location, state.axisOffset);
        gl.uniform2fv(state.scale_location, [state.scale, state.scale]);
        gl.uniform4fv(state.color_location, [1, 0, 0, 1]);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, points.length / 2);
        gl.deleteBuffer(vbo);
    }

    // Drawing Loop
    const loop = (timestamp: number) => {
        const dt = (timestamp -  state.previous_render_timestamp) / 1000;
        state.previous_render_timestamp = timestamp;
        // red, green, blue, alpha
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        drawWays();
        drawNodes();
        drawClipAxis();
        if (state.mouseClipPosition) {
            const mouseWorldPosition = getMouseWorldPosition(state.mouseClipPosition, state.scale, state.axisOffset);
            drawMouseCircle(mouseWorldPosition[0], mouseWorldPosition[1], 0.005 / state.scale);
        }
    
        
        state.scale += (state.targetScale - state.scale) * 10 * dt;
        window.requestAnimationFrame(loop);
    }
    window.requestAnimationFrame((timestamp) => {
        state.previous_render_timestamp = timestamp;

        window.requestAnimationFrame(loop);
    });
    
})