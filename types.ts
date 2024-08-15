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

    metadata: Metadata;

    timeouts: number[];
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