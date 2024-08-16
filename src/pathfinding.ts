import FastPriorityQueue from "./external/priorityqueue.js";
import { state } from "./state.js";
import { OSMNode, OSMWay } from "./types.js";

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
    let distances: Record<number, number> = {};
    let previous: Record<number, number | undefined> = {};
    const visited = new Set();
    let nodes = state.graph.keys();
    for (let node of nodes) {
        distances[node] = Infinity;
        previous[node] = undefined;
    }

    const startNodeIndex = nodeIdIdxMap.get(startNode.id);
    if (!startNodeIndex) throw new Error("Start node not found in reverse lookup");

    const pq = new FastPriorityQueue<{ distance: number, idx: number }>((a, b) => {
        return a.distance < b.distance;
    })

    pq.add({distance: 0, idx: startNodeIndex});
    distances[startNodeIndex] = 0;

    console.time("dijkstra time:");
    const updates: number[] = [];
    while (!pq.isEmpty()) {
        const u = pq.poll()!.idx;
        if (distances[u] === Infinity) break;
        visited.add(u);

        for (const [v] of state.graph.get(u)!) {
            updates.push(v, u);
            // self.postMessage({
            //     eventType: "GRAPH_VISITED_UPDATE",
            //     eventData: {
            //         parentNode: v,
            //         node: u
            //     },
            // });

            if (!visited.has(v)) {
                const w = state.graph.get(u)!.get(v)!;
                const newDistance = distances[u] + w;
                if (distances[v] > newDistance) {
                    distances[v] = newDistance;
                    previous[v] = u;
                    pq.add({distance: distances[v], idx: v});
                }
            }
        }
        if (updates.length >= 2000) {
            self.postMessage({
                eventType: "GRAPH_VISITED_UPDATE_BULK",
                eventData: updates,
            });
            updates.length = 0;
        }
    }

    console.timeEnd("dijkstra time:")

    return { distances, previous };
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
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const d = R * c; // in metres

    return d;
}

export function buildGraph(ways: OSMWay[], nodes: OSMNode[], nodeIdIdxMap: Map<number, number>) {
    const graph: Map<number, Map<number, number>> = new Map();
    let edges = 0;
    for (let i = 0; i < ways.length; i++) {
        const way = ways[i];
        if (way.tags.get("highway") == undefined) continue;
        let oneWay = false;
        if (way.tags.get("oneway") === "yes" || way.tags.get("junction") === "roundabout") {
            oneWay = true;
        }

        const wayNodes = way.node_ids.map(id => {
            const idx = nodeIdIdxMap.get(id)
            if (idx === undefined) {
                throw new Error("Cannot find index for node id");
            }
            return nodes[idx];
        })

        for (let j = 0; j < wayNodes.length; j++) {
            const start = wayNodes[j];
            const end = wayNodes[j + 1]
            if (start && end) {
                const startIndex = nodeIdIdxMap.get(start.id);
                const endIndex = nodeIdIdxMap.get(end.id);

                if (startIndex === undefined || endIndex === undefined) {
                    throw new Error("Cannot find index for node ids");
                }

                const distance = haversine(start.lon, start.lat, end.lon, end.lat);
                if (graph.get(startIndex) === undefined) {
                    graph.set(startIndex, new Map());
                }
                if (graph.get(endIndex) === undefined) {
                    graph.set(endIndex, new Map());
                }
                if (oneWay) {
                    edges++;
                    graph.get(startIndex)!.set(endIndex, distance);
                } else {
                    edges+=2;
                    graph.get(startIndex)!.set(endIndex, distance);
                    graph.get(endIndex)!.set(startIndex, distance);
                }
            }
        }
    }

    console.log(`Edges count: ${edges}`);

    state.graph = graph;
}