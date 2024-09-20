import { Metadata, OSMContext, OSMSubgraph, OSMNode, OSMWay, WorldNode, WebMercatorNode } from "./types";
import { Vector2 } from "./vector2";

export const WORLD_WIDTH = 1000;
export const WORLD_HEIGHT = 1000;

async function parseOSMPbf(url: string): Promise<OSMContext> {
    const nodes: OSMNode[] = [];
    const worldNodes: WorldNode[] = [];
    const ways: OSMWay[] = [];
    const nodesIdIdxMap = new Map<string, number>();
    const nodesIdWayIdxsMap = new Map<string, number[]>();
    const metadata: Metadata = {
        minLat: Number.MAX_VALUE,
        maxLat: Number.MIN_VALUE,
        minLon: Number.MAX_VALUE,
        maxLon: Number.MIN_VALUE,
        nodesCount: 0,
        lonRange: 0,
        latRange: 0,
    }    
    console.time("reading pbf")
    return new Promise(res => {
        const parser = window.pbfParser.parse({
            filePath: url,
            endDocument: function () {
                metadata.latRange = metadata.maxLat - metadata.minLat;
                metadata.lonRange = metadata.maxLon - metadata.minLon;
                
                console.timeEnd("reading pbf")
                console.log('document end');
                res({ 
                    nodes, 
                    ways, 
                    metadata, 
                    nodesIdIdxMap, 
                    nodesIdWayIdxsMap,
                    worldNodes,
                })
            },
            node: function (node: {id: string, lon: number, lat: number}) {
                metadata.minLat = Math.min(metadata.minLat, node.lat);
                metadata.maxLat = Math.max(metadata.maxLat, node.lat);
                metadata.minLon = Math.min(metadata.minLon, node.lon);
                metadata.maxLon = Math.max(metadata.maxLon, node.lon);
                metadata.nodesCount++;
                const osmNode: OSMNode = {
                    id: node.id,
                    lat: node.lat,
                    lon: node.lon,
                    __brand: 'OSM_NODE'
                }
                nodes.push(osmNode)
                worldNodes.push(osmNodeToWorldNode(osmNode))
                nodesIdIdxMap.set(node.id, nodes.length - 1);
            },
            way: function (way: {nodeRefs: string[], tags: Record<string, string>}) {
                const wayNodeIds = way.nodeRefs;
                /**
                 * "It is possible that faulty ways with zero or one node exist"
                 * From: https://wiki.openstreetmap.org/wiki/Way
                 */
                if (wayNodeIds.length <= 1) return;
                for (let i = 0; i < wayNodeIds.length; i++) {
                    const nodeId = wayNodeIds[i];
                    const wayIdxs = nodesIdWayIdxsMap.get(nodeId)
                    if (wayIdxs === undefined) {
                        nodesIdWayIdxsMap.set(nodeId, [ways.length])
                    } else {
                        wayIdxs.push(ways.length);
                        nodesIdWayIdxsMap.set(nodeId, wayIdxs);
                    }
                }

                ways.push({
                    node_ids: wayNodeIds,
                    tags: way.tags
                })
            },
        });
    })
}

export async function initOSM(url: string): Promise<OSMContext> {
    return parseOSMPbf(url);
}

function mapContains(map: Record<string, string>, key: "highway" | "building", searchValues: string[]) {
    const tagValue = map[key];
    if (tagValue === undefined) return false;
    if (searchValues.includes("*")) return true;
    if (searchValues.some(v => v === tagValue)) return true;
    return false;
}

export function getSubgraphFromWayWithTag(key: "highway" | "building", values: string[], osmContext: OSMContext): OSMSubgraph {
    const filteredNodes: OSMNode[] = [];
    const filteredWorldNodes: WorldNode[] = [];
    const filteredNodesIdx: number[] = [];
    const filteredWays: OSMWay[] = [];
    const { nodes, worldNodes, ways, nodesIdIdxMap } = osmContext
    for (let i = 0; i < ways.length; i++) {
        if (!mapContains(ways[i].tags, key, values)) continue;
        for (let j = 0; j < ways[i].node_ids.length; j++) {
            const nodeId = ways[i].node_ids[j];
            const idx = nodesIdIdxMap.get(nodeId);
            if (idx === undefined) throw new Error(`Invalid node id ${nodeId} referenced in a way ${i}, but not found in root data`);
            filteredNodes.push(nodes[idx]);
            filteredWorldNodes.push(worldNodes[idx]);
            filteredNodesIdx.push(idx);
        }
        filteredWays.push(ways[i]);
        filteredNodesIdx.push(0xFFFFFFFF);
    }

    return {
        ways: filteredWays,
        worldNodes: filteredWorldNodes,
        nodes: filteredNodes,
        idxs: filteredNodesIdx
    };
}

function degreesToRads(degree: number): number {
    return degree * (Math.PI/180);
}

/**  
 * Ref: https://en.wikipedia.org/wiki/Web_Mercator_projection
 * https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Derivation_of_tile_names
*/
function wgs84toWebMercator(node: OSMNode): WebMercatorNode {
    const ZOOM_LEVEL = 0;
    const PI = Math.PI;

    const x = (((1 / (2 * PI))) * Math.pow(2, ZOOM_LEVEL) * (PI + degreesToRads(node.lon)))
    const y = (((1 / (2 * PI))) * Math.pow(2, ZOOM_LEVEL) * (PI - Math.log(Math.tan((PI  / 4) + (degreesToRads(node.lat) / 2)))))
    if (x > Math.pow(2, ZOOM_LEVEL)  || y > Math.pow(2, ZOOM_LEVEL) ) {
        throw new Error(`Invalid web mercator position (${x},${y}). Lon lat ${node.lon}, ${node.lat}`)
    }

    const position = new Vector2(x, y)

    return {
        id: node.id,
        position,
        __brand: 'WEB_MERCATOR_NODE'
    }
}

export function normalizeNode(node: OSMNode, metadata: Metadata): OSMNode {
    const { minLat, minLon, lonRange, latRange } = metadata;

    return {
        ...node,
        lon: ((node.lon - minLon) / lonRange),
        lat: ((node.lat - minLat) / latRange),
    };
}

function osmNodeToWorldNode(node: OSMNode): WorldNode {
    const webMercatorNode = wgs84toWebMercator(node)
    /**
     * The projection top left is 0, 0, whereas our project uses bottom left as 0,0, so we fix the y axis by inverting it and adding a 1.
    */
    const worldPosition = webMercatorNode
        .position
        .multiplyScalar(1, -1)
        .addScalar(0, 1)
        .multiplyScalar(WORLD_WIDTH, WORLD_HEIGHT);

    return {
        id: webMercatorNode.id,
        position: worldPosition,
        __brand: 'WORLD_NODE'
    }
}
export function initFlatNodeData(nodes: WorldNode[]) {
    const data = [];
    for (let i = 0; i < nodes.length; i++) {
        data.push(
            nodes[i].position.x,
            nodes[i].position.y,
        )
    }

    return data;
}