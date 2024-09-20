import { drawCircle, drawLine, prepareDrawLineExBufferData } from "./draw";
import { Matrix } from "./matrix";
import { getSubgraphFromWayWithTag, initFlatNodeData, initOSM, WORLD_HEIGHT, WORLD_WIDTH } from "./osm";
import { buildGraph, findPath } from "./pathfinding";
import { WorldQuadTree } from "./quadtree";
import { GLContext, WorldNode } from "./types";
import { Vector2 } from "./vector2";
import './external/osm-read-pbf'
import { 
    Camera, 
    getCameraMatrix,
    getMouseCanvasPosition,
    getScreenToWorld,
    initBuffer,
    initCanvas,
    initGl,
    initShader,
    initVao,
    resizeCanvasToDisplaySize
} from "./webgl";
import { worker } from "./worker-manager";
import { Color } from "./color";
import { 
    BUILDINGS_COLOR,
    CAMERA_TARGET_COLOR,
    END_NODE_COLOR,
    HIGHLIGHTED_WAYS_COLOR,
    MOTORWAYS_COLOR,
    NODES_COLOR,
    PRIMARIES_COLOR,
    QUADTREE_POINT_COLOR,
    RESIDENTIALS_COLOR,
    SECONDARIES_COLOR,
    SHORTEST_PATH_COLOR,
    START_NODE_COLOR,
    TERTIARIES_COLOR,
    TRUNKS_COLOR,
    UNCLASSIFIEDS_COLOR,
    VISITED_NODE_COLOR,
    WORLD_OUTLINE_COLOR,
    X_AXIS_COLOR,
    Y_AXIS_COLOR 
} from "./constants";


declare global {
    interface Window { 
        pbfParser: any; 
    }
}

function setLoadingText(text: string) {
    const loadingElement = document.getElementById("loading")!;
    loadingElement.innerHTML = text;
}

function hideLoading() {
    document.getElementById("loading")!.style.display = 'none';
}

window.addEventListener("load", async () => {
    // Setup
    setLoadingText("Initializing canvas");
    const canvas = initCanvas("canvas");
    const gl = initGl(canvas);
    setLoadingText("Initializing Shaders");
    const uniformColorShader = initShader({
        gl, 
        vertexShaderId: '#uniform-color-vertex-shader', 
        fragmentShaderId: '#uniform-color-fragment-shader',
        uniforms: ['u_color', 'u_matrix'],
        attributes: ['a_position']
    });

    const attributeColorShader = initShader({
        gl, 
        vertexShaderId: '#attribute-color-vertex-shader', 
        fragmentShaderId: '#attribute-color-fragment-shader',
        uniforms: ['u_matrix'],
        attributes: ['a_position', 'a_color']
    });

    gl.useProgram(uniformColorShader.program);
    const glContext: GLContext = {
        gl, uniformColorShader, attributeColorShader
    }
    const workerRequest = worker((event) => {
        if (event.eventType === 'GRAPH_VISITED_UPDATE_BULK') {
            for (let i = 0; i < event.eventData.length; i++) {
                visitedNodesIdxs.push(event.eventData[i]);
            }
        }
    })

    setLoadingText("Processing OSM PBF data");
    const osmContext = await initOSM('/assets/kuwait.pbf');
    // TODO: https://wiki.openstreetmap.org/wiki/Key:highway
    setLoadingText("Extracting highway subgraphs");
    const motorways = getSubgraphFromWayWithTag("highway", ["motorway", "motorway_link"], osmContext);
    const trunks = getSubgraphFromWayWithTag("highway", ["trunk", "trunk_link"], osmContext);
    const primaries = getSubgraphFromWayWithTag("highway", ["primary", "primary_link"], osmContext);
    const secondaries = getSubgraphFromWayWithTag("highway", ["secondary", "secondary_link"], osmContext);
    const tertiaries = getSubgraphFromWayWithTag("highway", ["tertiary", "tertiary_link"], osmContext);
    const unclassifieds = getSubgraphFromWayWithTag("highway", ["unclassified"], osmContext);
    const residentials = getSubgraphFromWayWithTag("highway", ["residential"], osmContext);
    const buildings = getSubgraphFromWayWithTag("building", ["*"], osmContext);
    const normalizedNodesLonLatArray = initFlatNodeData(osmContext.worldNodes);

    setLoadingText("Initizliaing WebGL Vertex Buffers");
    // gl buffers
    const nodes_buffer = initBuffer(glContext, new Float32Array(normalizedNodesLonLatArray), 'vbo');
    const path_buffer = initBuffer(glContext, new Uint32Array([]), 'vbo');

    const building_nodes_index_buffer = initBuffer(glContext, new Uint32Array(buildings.idxs), 'ebo');
    const motorways_nodes_index_buffer = initBuffer(glContext, new Uint32Array(motorways.idxs), 'ebo');
    const trunks_nodes_index_buffer = initBuffer(glContext, new Uint32Array(trunks.idxs), 'ebo');
    const primaries_nodes_index_buffer = initBuffer(glContext, new Uint32Array(primaries.idxs), 'ebo');
    const secondaries_nodes_index_buffer = initBuffer(glContext, new Uint32Array(secondaries.idxs), 'ebo');
    const tertiaries_nodes_index_buffer = initBuffer(glContext, new Uint32Array(tertiaries.idxs), 'ebo');
    const unclassifieds_nodes_index_buffer = initBuffer(glContext, new Uint32Array(unclassifieds.idxs), 'ebo');
    const residentials_nodes_index_buffer = initBuffer(glContext, new Uint32Array(residentials.idxs), 'ebo');

    const highlighted_way_nodes_index_buffer = initBuffer(glContext, new Uint32Array(0), 'ebo');
    const visited_nodes_index_buffer = initBuffer(glContext, new Uint32Array(new Array(osmContext.nodes.length * 2)), 'ebo');

    // gl buffer optimizations
    let visited_nodes_index_buffer_elements_count = 0;

    setLoadingText("Initizliaing WebGL Array Buffers");
    // VAOs
    const default_vao = initVao({
        glContext,
        enableLocations: [glContext.uniformColorShader.attributes.a_position],
        vbos: [],
        ebo: null
    })

    const nodes_vao = initVao({
        glContext,
        enableLocations: [glContext.uniformColorShader.attributes.a_position],
        vbos: [
            {
                buffer: nodes_buffer,
                vertexPtr: {
                    location: glContext.uniformColorShader.attributes.a_position, 
                    components: 2,
                    type: glContext.gl.FLOAT
                }
            }
        ],
        ebo: null,
    });

    const path_vao = initVao({
        glContext,
        enableLocations: [glContext.uniformColorShader.attributes.a_position],
        vbos: [
            {
                buffer: path_buffer,
                vertexPtr: {
                    location: glContext.uniformColorShader.attributes.a_position, 
                    components: 2,
                    type: glContext.gl.FLOAT
                }
            }
        ],
        ebo: null,
    });

    
    // Quad tree
    setLoadingText("Loading Quad Tree")
    let quadTree = new WorldQuadTree();
    quadTree.populate([
        ...motorways.worldNodes,
        ...trunks.worldNodes,
        ...primaries.worldNodes,
        ...secondaries.worldNodes,
        ...tertiaries.worldNodes,
        ...unclassifieds.worldNodes,
        ...residentials.worldNodes,
    ]);

    // State
    let closestNodeToPointer: WorldNode | undefined;
    let previousTimestamp: number;
    let time = 0;
    let anchor: Vector2 | undefined = undefined;
    let camera: Camera = {
        zoom: 100,
        offset: new Vector2(0, 0),
        rotation: 2,
        target: new Vector2(WORLD_WIDTH / 2, WORLD_HEIGHT / 2)
    }
    let targetZoom = 1;
    let targetRotation = 0;
    let isCtrlPressed = false;
    let mouseCanvasPosition = new Vector2(0, 0);
    let mouseWorldPosition = new Vector2(0, 0);
    let startNodeIdx: number | undefined;
    let endNodeIdx: number | undefined;
    let mouseDownTimeout: number | undefined;
    let pathNodesIdxs: number[] = [];
    let visitedNodesIdxs: number[] = [];

    setLoadingText("Building Graphs")
    buildGraph([
        ...motorways.ways,
        ...trunks.ways,
        ...primaries.ways,
        ...secondaries.ways,
        ...tertiaries.ways,
        ...unclassifieds.ways,
        ...residentials.ways,
    ], osmContext.nodes, osmContext.nodesIdIdxMap);
    const workerProxy = await workerRequest;
    await workerProxy.buildGraph([
        ...motorways.ways,
        ...trunks.ways,
        ...primaries.ways,
        ...secondaries.ways,
        ...tertiaries.ways,
        ...unclassifieds.ways,
        ...residentials.ways,
    ], osmContext.nodes, osmContext.nodesIdIdxMap);


    window.addEventListener("mouseup", (e) => {
        anchor = undefined;
    })

    window.addEventListener("mousedown", (e) => {
        anchor = getMouseCanvasPosition(e, canvas);
        if (closestNodeToPointer) {
            const idx = osmContext.nodesIdIdxMap.get(closestNodeToPointer.id);
            mouseDownTimeout = window.setTimeout(() => {
                if (startNodeIdx !== undefined && endNodeIdx !== undefined) {
                    startNodeIdx = undefined;
                    endNodeIdx = undefined;
                    pathNodesIdxs.length = 0;
                    visitedNodesIdxs.length = 0;
                }
                if (startNodeIdx === undefined) {
                    startNodeIdx = idx
                } else if (endNodeIdx === undefined) {
                    endNodeIdx = idx
                };
            }, 200);
        }
    })

    window.addEventListener("mousemove", (e) => {
        if (mouseDownTimeout) clearTimeout(mouseDownTimeout);
        mouseCanvasPosition = getMouseCanvasPosition(e, canvas);
        mouseWorldPosition = getScreenToWorld(mouseCanvasPosition, camera);
        closestNodeToPointer = quadTree.getClosestNodeForWorldPosition(mouseWorldPosition);

        if (anchor && isCtrlPressed) {
            const dy = mouseCanvasPosition.y - anchor.y;
            targetRotation += dy / 250;
            anchor = mouseCanvasPosition;
            return;
        }

        if (anchor) {
            const delta = mouseCanvasPosition.subtract(anchor);

            // Ref https://matthew-brett.github.io/teaching/rotation_2d.html
            const rotatedAndScaledDelta = new Vector2(
                Math.cos(-camera.rotation) * delta.x - Math.sin(-camera.rotation) * delta.y,
                Math.sin(-camera.rotation) * delta.x  + Math.cos(-camera.rotation) * delta.y
            )
            .multiply(new Vector2(1 / camera.zoom, 1 / camera.zoom));

            camera.target = camera.target.subtract(rotatedAndScaledDelta)
            
            anchor = mouseCanvasPosition;
        }
    })

    canvas.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
        }
        if (e.deltaY < 0) {
            targetZoom *= 1.5;
        } else if (targetZoom - 1 > 0) {
            targetZoom /= 1.5;
        }
    })

    document.addEventListener('contextmenu', event => event.preventDefault());

    window.addEventListener("blur", (e) => {
        isCtrlPressed = false;
    });
    
    window.addEventListener("keydown", (e) => {
        if (e.key === 'Control') {
            isCtrlPressed = true;
        }

        if (e.key === '=') {
            targetZoom *= 1.5;
        }

        if (e.key === '-') {
            targetZoom /= 1.5;
            if (targetZoom < 1) {
                targetZoom = 1;
            }
        }

        if (e.code === 'Space') {
            pathNodesIdxs.length = 0;
            visitedNodesIdxs.length = 0;
            if (startNodeIdx) {
                workerProxy.dijkstra(startNodeIdx)
                .then((result: any) => {
                    if (result) {
                        if (endNodeIdx) {
                            pathNodesIdxs = findPath(result.previous, endNodeIdx);
                        }
                    } 
                })
            }
        }
    })

    window.addEventListener("keyup", (e) => {
        if (e.key === 'Control') {
            isCtrlPressed = false;
        }
    })


    function drawNodes() {
        glContext.gl.bindVertexArray(nodes_vao);
        glContext.gl.uniform4fv(glContext.uniformColorShader.uniforms.u_color, NODES_COLOR);
        glContext.gl.drawArrays(
            glContext.gl.POINTS,
            0,
            normalizedNodesLonLatArray.length / 2
        );
        glContext.gl.bindVertexArray(default_vao);;
    }

    function drawWays() {
        glContext.gl.bindVertexArray(nodes_vao);

        glContext.gl.uniform4fv(glContext.uniformColorShader.uniforms.u_color, MOTORWAYS_COLOR);
        glContext.gl.bindBuffer(glContext.gl.ELEMENT_ARRAY_BUFFER, motorways_nodes_index_buffer);
        glContext.gl.drawElements(glContext.gl.LINE_STRIP, motorways.idxs.length, glContext.gl.UNSIGNED_INT, 0);

        glContext.gl.uniform4fv(glContext.uniformColorShader.uniforms.u_color, BUILDINGS_COLOR);
        glContext.gl.bindBuffer(glContext.gl.ELEMENT_ARRAY_BUFFER, building_nodes_index_buffer);
        glContext.gl.drawElements(glContext.gl.TRIANGLE_STRIP, buildings.idxs.length, glContext.gl.UNSIGNED_INT, 0);

        glContext.gl.uniform4fv(glContext.uniformColorShader.uniforms.u_color, TRUNKS_COLOR);
        glContext.gl.bindBuffer(glContext.gl.ELEMENT_ARRAY_BUFFER, trunks_nodes_index_buffer);
        glContext.gl.drawElements(glContext.gl.LINE_STRIP, trunks.idxs.length, glContext.gl.UNSIGNED_INT, 0);

        glContext.gl.uniform4fv(glContext.uniformColorShader.uniforms.u_color, PRIMARIES_COLOR);
        glContext.gl.bindBuffer(glContext.gl.ELEMENT_ARRAY_BUFFER, primaries_nodes_index_buffer);
        glContext.gl.drawElements(glContext.gl.LINE_STRIP, primaries.idxs.length, glContext.gl.UNSIGNED_INT, 0);

        glContext.gl.uniform4fv(glContext.uniformColorShader.uniforms.u_color, SECONDARIES_COLOR);
        glContext.gl.bindBuffer(glContext.gl.ELEMENT_ARRAY_BUFFER, secondaries_nodes_index_buffer);
        glContext.gl.drawElements(glContext.gl.LINE_STRIP, secondaries.idxs.length, glContext.gl.UNSIGNED_INT, 0);

        glContext.gl.uniform4fv(glContext.uniformColorShader.uniforms.u_color, TERTIARIES_COLOR);
        glContext.gl.bindBuffer(glContext.gl.ELEMENT_ARRAY_BUFFER, tertiaries_nodes_index_buffer);
        glContext.gl.drawElements(glContext.gl.LINE_STRIP, tertiaries.idxs.length, glContext.gl.UNSIGNED_INT, 0);

        glContext.gl.uniform4fv(glContext.uniformColorShader.uniforms.u_color, UNCLASSIFIEDS_COLOR);
        glContext.gl.bindBuffer(glContext.gl.ELEMENT_ARRAY_BUFFER, unclassifieds_nodes_index_buffer);
        glContext.gl.drawElements(glContext.gl.LINE_STRIP, unclassifieds.idxs.length, glContext.gl.UNSIGNED_INT, 0);

        glContext.gl.uniform4fv(glContext.uniformColorShader.uniforms.u_color, RESIDENTIALS_COLOR);
        glContext.gl.bindBuffer(glContext.gl.ELEMENT_ARRAY_BUFFER, residentials_nodes_index_buffer);
        glContext.gl.drawElements(glContext.gl.LINE_STRIP, residentials.idxs.length, glContext.gl.UNSIGNED_INT, 0);
        
        glContext.gl.bindVertexArray(default_vao);;
    }


    function drawQuadtreeData(time: number) {
        glContext.gl.bindBuffer(glContext.gl.ARRAY_BUFFER, nodes_buffer);
        const COMPONENTS_PER_WAY = 2;
        glContext.gl.vertexAttribPointer(glContext.uniformColorShader.attributes.a_position, COMPONENTS_PER_WAY, glContext.gl.FLOAT, false, 0, 0);

        glContext.gl.uniform4fv(glContext.uniformColorShader.uniforms.u_color, QUADTREE_POINT_COLOR);

        if (closestNodeToPointer) {
            const idx = osmContext.nodesIdIdxMap.get(closestNodeToPointer.id)!!;
            const lon = normalizedNodesLonLatArray[idx * 2];
            const lat = normalizedNodesLonLatArray[idx * 2 + 1];
            drawCircle(
                glContext, 
                new Vector2(lon, lat), 
                (5 + (3 * Math.sin(time * 5))) / camera.zoom, 
                new Color(1, 0.9 + (Math.sin(time * 5) * 0.1), 1, 1)
            );
        }
    }

    function updateOverlay(dt: number) {
        const fpsElement = document.querySelector("#fpsTarget") as HTMLSpanElement;
        fpsElement.innerHTML = `${(Math.floor(1 / dt)).toFixed(0)}`;
        const nodesCountElement = document.querySelector("#nodesCount") as HTMLSpanElement;
        nodesCountElement.innerHTML = `${osmContext.metadata.nodesCount}`;
        const cameraTargetElement = document.querySelector("#cameraTarget") as HTMLSpanElement;
        cameraTargetElement.innerHTML = `${camera.target.x.toFixed(2)}, ${camera.target.y.toFixed(2)}`
        const cameraZoomElement = document.querySelector("#cameraZoom") as HTMLSpanElement;
        cameraZoomElement.innerHTML = `${camera.zoom.toFixed(2)}`
        const cameraRotationElement = document.querySelector("#cameraRotation") as HTMLSpanElement;
        cameraRotationElement.innerHTML = `${camera.rotation.toFixed(2)}`
        const mouseCanvasPositionElement = document.querySelector("#mouseCanvasPosition") as HTMLSpanElement;
        mouseCanvasPositionElement.innerHTML = `${mouseCanvasPosition.x.toFixed(2)}, ${(mouseCanvasPosition.y).toFixed(2)}`
        const mouseWorldPositionElement = document.querySelector("#mouseWorldPosition") as HTMLSpanElement;
        mouseWorldPositionElement.innerHTML = `${mouseWorldPosition.x.toFixed(2)}, ${mouseWorldPosition.y.toFixed(2)}`
    }

    function drawWayHighlight() {
        if (closestNodeToPointer) {
            const wayIdxs = osmContext.nodesIdWayIdxsMap.get(closestNodeToPointer.id) as number[];
            if (wayIdxs === undefined) {
                // https://help.openstreetmap.org/questions/50206/orphan-nodes-and-ways
                return;
            }
            const ways =  wayIdxs.map(wayIdx => osmContext.ways[wayIdx])
            const nodeIdxs = ways
                .reduce((acc, way) => [...acc, ...way.node_ids, "*"], [] as string[])
                .map(nodeId => {    
                    if (nodeId === "*") return 0xFFFFFFFF
                    return osmContext.nodesIdIdxMap.get(nodeId) as number
                });

            glContext.gl.bindVertexArray(nodes_vao);
            glContext.gl.uniform4fv(glContext.uniformColorShader.uniforms.u_color, HIGHLIGHTED_WAYS_COLOR);
            glContext.gl.bindBuffer(glContext.gl.ELEMENT_ARRAY_BUFFER, highlighted_way_nodes_index_buffer)
            glContext.gl.bufferData(glContext.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(nodeIdxs), glContext.gl.STATIC_DRAW);
            glContext.gl.drawElements(glContext.gl.LINE_STRIP, nodeIdxs.length, glContext.gl.UNSIGNED_INT, 0);
            glContext.gl.bindVertexArray(default_vao);;

            const tagsArray = []
            for (let i = 0; i < ways.length; i++) {
                tagsArray.push(...Object.entries(ways[i].tags).map((([k, v]) => `<div>${k}: ${v}</div>`)));
            }

            const wayTagsElement = document.querySelector("#wayTags") as HTMLSpanElement;
            wayTagsElement.innerHTML = tagsArray.join(" ");
            
        }
    }

    function drawPathfindingAlgorithm() {
        if (startNodeIdx) {
            const lon = normalizedNodesLonLatArray[startNodeIdx * 2];
            const lat = normalizedNodesLonLatArray[startNodeIdx * 2 + 1];
            drawCircle(glContext, new Vector2(lon, lat), (10 + (3 * Math.sin(time * 10))) / camera.zoom, START_NODE_COLOR);
        }

        if (endNodeIdx) {
            const lon = normalizedNodesLonLatArray[endNodeIdx * 2];
            const lat = normalizedNodesLonLatArray[endNodeIdx * 2 + 1];
            drawCircle(glContext, new Vector2(lon, lat), (10 + (3 * Math.sin(time * 10))) / camera.zoom, END_NODE_COLOR);
        }
        
        
        {   // Visited nodes highlighting
            glContext.gl.bindVertexArray(nodes_vao);
            glContext.gl.bindBuffer(glContext.gl.ELEMENT_ARRAY_BUFFER, visited_nodes_index_buffer);
            if (visitedNodesIdxs.length !== visited_nodes_index_buffer_elements_count) {
                glContext.gl.bufferSubData(
                    glContext.gl.ELEMENT_ARRAY_BUFFER, 
                    visited_nodes_index_buffer_elements_count * 4, 
                    new Uint32Array(visitedNodesIdxs.slice(visited_nodes_index_buffer_elements_count))
                )
                visited_nodes_index_buffer_elements_count = visitedNodesIdxs.length;
            }
            glContext.gl.uniform4fv(glContext.uniformColorShader.uniforms.u_color, VISITED_NODE_COLOR);
            glContext.gl.drawElements(glContext.gl.LINES, visitedNodesIdxs.length, glContext.gl.UNSIGNED_INT, 0);
            glContext.gl.bindVertexArray(default_vao);
        }

        {   // Path highlighting
            const lines = [];
            
            for (let i = 0 ; i < pathNodesIdxs.length - 1; i+= 1) {
                const startIdx = pathNodesIdxs[i];
                const endIdx = pathNodesIdxs[i + 1];
                const startNode = normalizedNodesLonLatArray.slice(startIdx * 2, startIdx * 2 + 2)
                const endnode = normalizedNodesLonLatArray.slice(endIdx * 2, endIdx * 2 + 2)
                const line = prepareDrawLineExBufferData(new Vector2(startNode[0], startNode[1]), new Vector2(endnode[0], endnode[1]), 5 / camera.zoom);
                lines.push(...line);
            }

            glContext.gl.bindVertexArray(path_vao)
            glContext.gl.bindBuffer(glContext.gl.ARRAY_BUFFER, path_buffer);
            glContext.gl.bufferData(glContext.gl.ARRAY_BUFFER, new Float32Array(lines), glContext.gl.STATIC_DRAW);
            glContext.gl.uniform4fv(glContext.uniformColorShader.uniforms.u_color, SHORTEST_PATH_COLOR);
            glContext.gl.drawArrays(glContext.gl.TRIANGLE_STRIP, 0, lines.length / 2);
            glContext.gl.bindVertexArray(default_vao);
        }
    }

    function drawFrame(timestamp: number) {
        const dt = (timestamp - previousTimestamp) / 1000;
        previousTimestamp = timestamp;
        time += dt;

        glContext.gl.clearColor(0, 0, 0, 1);
        glContext.gl.clear(glContext.gl.COLOR_BUFFER_BIT);
        glContext.gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
        glContext.gl.bindVertexArray(default_vao);
        resizeCanvasToDisplaySize(canvas);
        camera.offset.x = canvas.clientWidth / 2;
        camera.offset.y = canvas.clientHeight / 2;

        const P = Matrix.projection(canvas.clientWidth, canvas.clientHeight);
        const CAM_P = getCameraMatrix(camera).multiply(P);
        gl.uniformMatrix3fv(glContext.uniformColorShader.uniforms.u_matrix, false, CAM_P.data);
        
        drawQuadtreeData(time);
        drawWays();
        // drawNodes();
        drawCircle(glContext, camera.target, 5 / camera.zoom, CAMERA_TARGET_COLOR)
        drawWayHighlight();
        drawPathfindingAlgorithm();
        updateOverlay(dt);

        // X,Y axis
        drawLine(glContext, new Vector2(-canvas.clientWidth / 2, 0), new Vector2(canvas.clientWidth / 2, 0), X_AXIS_COLOR);
        drawLine(glContext, new Vector2(0, -canvas.clientHeight / 2), new Vector2(0, canvas.clientHeight / 2), Y_AXIS_COLOR);

        // World outline
        drawLine(glContext, new Vector2(0, 0), new Vector2(WORLD_WIDTH, 0), WORLD_OUTLINE_COLOR);
        drawLine(glContext, new Vector2(WORLD_WIDTH, 0), new Vector2(WORLD_WIDTH, WORLD_HEIGHT), WORLD_OUTLINE_COLOR);
        drawLine(glContext, new Vector2(WORLD_WIDTH, WORLD_HEIGHT), new Vector2(0, WORLD_HEIGHT), WORLD_OUTLINE_COLOR);
        drawLine(glContext, new Vector2(0, WORLD_HEIGHT), new Vector2(0, 0), WORLD_OUTLINE_COLOR);

        camera.zoom += (targetZoom - camera.zoom) * 10 * dt;
        camera.rotation += (targetRotation - camera.rotation) * 20 * dt;
        window.requestAnimationFrame(drawFrame);
    }

    window.requestAnimationFrame(timestamp => {
        previousTimestamp = timestamp;
        hideLoading();
        window.requestAnimationFrame(drawFrame);
    })
})