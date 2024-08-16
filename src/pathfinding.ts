import { state } from "./state.js";
import { OSMNode } from "./types.js";

export function findPath(previous: Record<string, string | undefined>, endNode: OSMNode, nodeIdIdxMap: Map<number, number>) {
    if (endNode === undefined) return;
    const path = [];
    let u: string | undefined = String(nodeIdIdxMap.get(endNode.id));
    if (u === undefined) throw new Error(`Cannot find target node in the reverse lookup ${1}`);
    while (u !== undefined) {
        path.unshift(u);
        u = previous[u];
    }

    return path;
}

export function dijkstra(startNode: OSMNode, nodeIdIdxMap: Map<number, number>) {
    if (!startNode) return;
    let distances: Record<string, number> = {};
    let previous: Record<string, string | undefined> = {};
    const visited = new Set();
    let nodes = Object.keys(state.graph);
    for (let node of nodes) {
        distances[node] = Infinity;
        previous[node] = undefined;
    }

    const startNodeIndex = nodeIdIdxMap.get(startNode.id);
    if (!startNodeIndex) throw new Error("Start node not found in reverse lookup");
    distances[startNodeIndex] = 0;

    while (nodes.length > 0) {
        nodes.sort((a, b) => distances[a] - distances[b]);
        const closestNodeIndex = nodes.shift() as string;
        if (distances[closestNodeIndex] === Infinity) break;
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
                    self.postMessage({
                            eventType: "GRAPH_VISITED_UPDATE",
                            eventData: {
                                parentNode: neighbor,
                                node: closestNodeIndex
                            },
                    })
                }
            }
        }
    }

    return {distances, previous};
}

/**
 * Ref: http://www.movable-type.co.uk/scripts/latlong.html
 * @param lon1 
 * @param lat1 
 * @param lon2 
 * @param lat2 
 */
export function haversine(lon1: number, lat1: number, lon2: number, lat2: number) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180; // φ, λ in radians
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    const d = R * c; // in metres

    return d;
}

export function buildGraph(nodes: OSMNode[], highwayNodesIdxs: number[], nodeIdIdxMap: Map<number, number>) {
    const graph: Record<string, Record<string, number>> = {};
    for (let i = 0; i < highwayNodesIdxs.length; i++) {
        const currentNodeIndex = highwayNodesIdxs[i];
        const nextNodeIndex = highwayNodesIdxs[i + 1];
        // 0xFFFFFFFF will give undefined, so that will act like delimiter between way nodes
        const start = nodes[currentNodeIndex];
        const end = nodes[nextNodeIndex]
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
        } else {
            continue;
        }
    }

    state.graph = graph;
}