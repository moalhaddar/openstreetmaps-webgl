import FastPriorityQueue from "./external/priorityqueue";
import { OSMNode, OSMWay } from "./types";

export let graph: Map<number, Map<number, number>>;

export function findPath(previous: Record<number, number | undefined>, endNodeIdx: number) {
    const path = [];
    let u: number | undefined = endNodeIdx;
    if (u === undefined) throw new Error(`Cannot find target node in the reverse lookup ${1}`);
    while (u !== undefined) {
        path.unshift(u);
        u = previous[u];
    }

    return path;
}

export function dijkstra(startNodeIndex: number) {
    console.log("Starting dijkstra")
    let distances: Record<number, number> = {};
    let previous: Record<number, number | undefined> = {};
    const visited = new Set();
    let nodes = graph.keys();
    for (let node of nodes) {
        distances[node] = Infinity;
        previous[node] = undefined;
    }

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

        for (const [v] of graph.get(u)!) {
            updates.push(v, u);

            if (!visited.has(v)) {
                const w = graph.get(u)!.get(v)!;
                const newDistance = distances[u] + w;
                if (distances[v] > newDistance) {
                    distances[v] = newDistance;
                    previous[v] = u;
                    pq.add({distance: distances[v], idx: v});
                }
            }
        }
        if (updates.length >= 100) {
            self.postMessage({
                eventType: "GRAPH_VISITED_UPDATE_BULK",
                eventData: updates,
            });
            updates.length = 0;
        }
    }

    self.postMessage({
        eventType: "GRAPH_VISITED_UPDATE_BULK",
        eventData: updates,
    });
    updates.length = 0;

    console.timeEnd("dijkstra time:")

    return { previous };
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

export function buildGraph(ways: OSMWay[], nodes: OSMNode[], nodeIdIdxMap: Map<string, number>) {
    const g: Map<number, Map<number, number>> = new Map();
    let edges = 0;
    for (let i = 0; i < ways.length; i++) {
        const way = ways[i];
        let oneWay = false;
        if (way.tags["oneway"] === "yes" || way.tags["junction"] === "roundabout") {
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
                if (g.get(startIndex) === undefined) {
                    g.set(startIndex, new Map());
                }
                if (g.get(endIndex) === undefined) {
                    g.set(endIndex, new Map());
                }
                if (oneWay) {
                    edges++;
                    g.get(startIndex)!.set(endIndex, distance);
                } else {
                    edges+=2;
                    g.get(startIndex)!.set(endIndex, distance);
                    g.get(endIndex)!.set(startIndex, distance);
                }
            }
        }
    }

    console.log(`Built graph. Edges count: ${edges}`);
    graph = g;
}