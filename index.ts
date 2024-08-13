type OSMNode = {
    lat: number;
    lon: number;
}

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
        if (lat === null || lon === null) {
            throw new Error(`Invalid lat/lon values: ${lat}, ${lon}`);
        }
        nodes.push({
            lat: parseFloat(lat),
            lon: parseFloat(lon)
        })
    }

    return nodes;
}

function getWayNodesFromXml(xml: Document): OSMNode[] {
    const waysXml = Array.from(xml.getElementsByTagName('way'));
    const nodes: OSMNode[] = [];
    for (let i = 0; i < waysXml.length; i++) {
        const wayNodes = Array.from(waysXml[i].getElementsByTagName('nd'));
        if (wayNodes.length <= 1) continue; // We skip ways with a single node.
        for (let j = 0; j < wayNodes.length; j++) {
            const ref = wayNodes[j].getAttribute("ref");
            
            const nodeXml = xml.querySelector(`node[id="${ref}"]`)
            if (!nodeXml) continue;
            const lon = nodeXml.getAttribute('lon')
            const lat = nodeXml.getAttribute('lat')
            if (lat === null || lon === null) {
                throw new Error(`Invalid lat/lon values: ${lat}, ${lon}`);
            }
            
            // A hack to be able to draw gl.LINES
            if (nodes.length % 2 === 0 || j + 1 >= wayNodes.length) {
                nodes.push({
                    lat: parseFloat(lat),
                    lon: parseFloat(lon)
                })
            } else {
                nodes.push({
                    lat: parseFloat(lat),
                    lon: parseFloat(lon)
                },{
                    lat: parseFloat(lat),
                    lon: parseFloat(lon)
                })
            }
        }
    }

    return nodes;
}

function normalizeNodes(nodes: OSMNode[]): OSMNode[] {
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

    const latRange = maxLat - minLat;
    const lonRange = maxLon - minLon;

    return nodes.map(node => ({
        lat: (node.lat - minLat) / latRange,
        lon: ((node.lon - minLon) / lonRange) * 2
    }));
}

function nodesToFloat32Array(nodes: OSMNode[]): Float32Array {
    const flat: number[] = [];
    for (let i = 0; i < nodes.length; i++) {
        flat.push(nodes[i].lon, nodes[i].lat);
    }
    return new Float32Array(flat);
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
    const gl = canvas.getContext('webgl');
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

window.addEventListener('load', async () => {
    console.time("parse");
    const xmlDoc = await parseOSMXML();
    console.timeEnd("parse");
    console.time("Nodes");
    const nodes = getNodesFromXml(xmlDoc);
    console.timeEnd("Nodes");
    console.time("Ways");
    const ways = getWayNodesFromXml(xmlDoc);
    console.timeEnd("Ways");
    const normalized_nodes = normalizeNodes(nodes);
    const normalized_ways_nodes = normalizeNodes(ways);
    const gl = initGl();
    
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;

    // Setup node shader.
    const [node_vertex_source, node_fragment_source] = loadSources('#node-vertex-shader', '#node-fragment-shader');
    const node_vertex_shader = createShader(gl, 'vertex', node_vertex_source);
    const node_fragment_shader = createShader(gl, 'fragment', node_fragment_source);
    const node_program = createProgram(gl, node_vertex_shader, node_fragment_shader)
    const node_position_location = gl.getAttribLocation(node_program, 'a_position');
    const node_offset_location = gl.getUniformLocation(node_program, 'u_offset');
    const node_scale_location = gl.getUniformLocation(node_program, 'u_scale');
    const node_position_buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, node_position_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, nodesToFloat32Array(normalized_nodes), gl.STATIC_DRAW);

    // Setup Ways shader.
    const [way_vertex_source, way_fragment_source] = loadSources('#way-vertex-shader', '#way-fragment-shader');
    const way_vertex_shader = createShader(gl, 'vertex', way_vertex_source);
    const way_fragment_shader = createShader(gl, 'fragment', way_fragment_source);
    const way_program = createProgram(gl, way_vertex_shader, way_fragment_shader)
    const way_position_location = gl.getAttribLocation(way_program, 'a_position');
    const way_offset_location = gl.getUniformLocation(way_program, 'u_offset');
    const way_scale_location = gl.getUniformLocation(way_program, 'u_scale');
    const way_position_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, way_position_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, nodesToFloat32Array(normalized_ways_nodes), gl.STATIC_DRAW);

    // State
    let center = [-1, -0.5];
    let anchor: [number, number] | undefined = undefined;
    let scale = 1;

    // Events
    canvas.addEventListener('mousedown', (e) => {
        const {x, y} = getMouseCanvasPosition(canvas, e);
        anchor = [
            x / canvas.width,
            y / canvas.height
        ]
    })

    canvas.addEventListener('mouseup', () => {
        if (anchor) {
            anchor = undefined;
        }
    })

    canvas.addEventListener('mousemove', (e) => {
      if (anchor) {
        const {x, y} = getMouseCanvasPosition(canvas, e);
        const dx = (x / canvas.width) - anchor[0];
        const dy = -((y / canvas.height) - anchor[1]);
        center = [
            center[0] + (dx / scale),
            center[1] + (dy / scale)
        ]

        anchor = [
            x / canvas.width,
            y / canvas.height
        ];
      }  
    })

    canvas.addEventListener('wheel', (e) => {
        if (e.deltaY < 0) {
            scale++;
        } else if (scale > 1) {
            scale--;
        }
    })

    const drawNodes = () => {
        gl.useProgram(node_program);
        gl.enableVertexAttribArray(node_position_location);
        gl.bindBuffer(gl.ARRAY_BUFFER, node_position_buffer);
        const COMPONENTS_PER_NODE = 2;
        gl.vertexAttribPointer(node_position_location, COMPONENTS_PER_NODE, gl.FLOAT, false, 0, 0);
        gl.uniform2fv(node_offset_location, center);
        gl.uniform2fv(node_scale_location, [scale, scale]);
        gl.drawArrays(gl.POINTS, 0, normalized_nodes.length / COMPONENTS_PER_NODE);
    }
    
    const drawWays = () => {
        gl.useProgram(way_program);
        gl.enableVertexAttribArray(way_position_location);
        gl.bindBuffer(gl.ARRAY_BUFFER, way_position_buffer);
        const COMPONENTS_PER_WAY = 2;
        gl.vertexAttribPointer(way_position_location, COMPONENTS_PER_WAY, gl.FLOAT, false, 0, 0);
        gl.uniform2fv(way_offset_location, center);
        gl.uniform2fv(way_scale_location, [scale, scale]);
        gl.drawArrays(gl.LINES, 0, normalized_ways_nodes.length);
    }

    // Drawing Loop
    const loop = () => {
        // red, green, blue, alpha
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        drawWays();
        // drawNodes()
    
        window.requestAnimationFrame(loop);
    }
    window.requestAnimationFrame(loop);
    
})