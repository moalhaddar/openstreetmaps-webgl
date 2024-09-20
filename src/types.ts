import { Vector2 } from "./vector2"

export type GLContext = {
    gl: WebGL2RenderingContext,
    uniformColorShader: {
        program: WebGLProgram;
        uniforms: Record<"u_color" | "u_matrix", WebGLUniformLocation | null>;
        attributes: Record<"a_position", number>;
    }
    attributeColorShader: {
        program: WebGLProgram;
        uniforms: Record<"u_matrix", WebGLUniformLocation | null>;
        attributes: Record<"a_position" | "a_color", number>;
    }
}

export type OSMContext = {
    nodes: OSMNode[],
    worldNodes: WorldNode[]
    ways: OSMWay[],
    nodesIdIdxMap: Map<string, number>
    nodesIdWayIdxsMap: Map<string, number[]>
    metadata: Metadata
}

export type Metadata = {
    minLat: number,
    maxLat: number,
    minLon: number,
    maxLon: number,
    lonRange: number,
    latRange: number,
    nodesCount: number
}

type Brand<K, T> = T & { __brand: K }

export type OSMNode = Brand<"OSM_NODE", {
    id: string;
    lat: number;
    lon: number;
}>

export type WorldNode = Brand<"WORLD_NODE", {
    id: string;
    position: Vector2; // x = lon, y = lat
}>

export type WebMercatorNode = Brand<"WEB_MERCATOR_NODE", {
    id: string;
    position: Vector2; // x = lon, y = lat
}>

export type OSMWay = {
    node_ids: string[]
    tags: Record<string, string>
}

export type OSMSubgraph = {
    ways: OSMWay[];
    nodes: OSMNode[];
    worldNodes: WorldNode[]
    idxs: number[];
};