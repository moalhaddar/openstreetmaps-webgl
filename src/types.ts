import BucketMap from "./bucket";
import { Matrix } from "./matrix";

export type Metadata = {
    minLat: number,
    maxLat: number,
    minLon: number,
    maxLon: number,
    nodesCount: number
}

export type OSMNode = {
    id: number;
    lat: number;
    lon: number;
}

export type OSMWay = {
    node_ids: number[]
    tags: Map<string, string>
}

export type State = {
    // Contexts
    canvas: HTMLCanvasElement,
    gl: WebGL2RenderingContext,

    // Shader
    program: WebGLProgram,
    position_location: number,
    u_matrix_location: WebGLUniformLocation,
    u_color_location: WebGLUniformLocation,
    mat: Matrix;

    // transformations
    anchor: [number, number] | undefined
    translationOffset: [number, number]
    scale: number
    targetScale: number;
    rotationAngleRad: number;
    isCtrlPressed: boolean;
    

    // frametime
    previous_render_timestamp: number;

    // mouse
    mouseWorldPosition: [number, number] | undefined;
    mouseClipPosition: [number, number] | undefined;

    // Buckets
    bucketMap: BucketMap;
    activeBucket: BucketEntry[];

    // Path finding
    startNode: OSMNode | undefined;
    endNode: OSMNode | undefined;
    graph: Record<string, Record<string, number>>
    path: number[]

    timeouts: number[];

    // OSM processed data
    xmlDoc: Document;
    nodes: OSMNode[];
    nodeIdIdxMap: Map<number, number>; // state.nodes[idx]
    normalizedNodesLonLatArray: number[] // [lon, lat, lon, lat ...]
    ways: OSMWay[];
    highwayNodes: (OSMNode | undefined)[] // undefined is a delimiter.
    highwayNodesIdxs: number[] // state.nodes[idx]
    buildingNodes: (OSMNode | undefined)[] // undefined is a delimiter.
    buildingNodesIdxs: number[] // state.nodes[idx]
    metadata: Metadata;
}

export type BucketEntry = {
    node: OSMNode
    glIndex: number
}

export enum MouseButton {
    Left = 0,
    Middle = 1,
    Right = 2
}