import { state } from "./state.js";
import { OSMNode, OSMWay } from "./types.js";

export async function parseOSMXML() {
    const osmXml = await fetch('/assets/country.osm').then(data => data.text())
    const parser = new DOMParser();
    state.xmlDoc = parser.parseFromString(osmXml, 'text/xml');
}

export function initNodesAndReverseLookup() {
    const nodesXml = Array.from(state.xmlDoc.getElementsByTagName('node'));

    const nodes: OSMNode[] = [];
    const nodesIdIdxMap = new Map<number, number>();

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
        nodesIdIdxMap.set(nodes[i].id, i);
    }

    state.nodeIdIdxMap = nodesIdIdxMap;
    state.nodes = nodes;
}

export function initWays() {
    const waysXml = Array.from(state.xmlDoc.getElementsByTagName('way'));
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

    state.ways = ways;
}

export function initMetadata() {
    let minLat = Number.MAX_VALUE;
    let maxLat = Number.MIN_VALUE;
    let minLon = Number.MAX_VALUE;
    let maxLon = Number.MIN_VALUE;

    for (let node of state.nodes) {
        minLat = Math.min(minLat, node.lat);
        maxLat = Math.max(maxLat, node.lat);
        minLon = Math.min(minLon, node.lon);
        maxLon = Math.max(maxLon, node.lon);
    }

    state.metadata = {
        minLat,
        maxLat,
        minLon,
        maxLon,
        nodesCount: state.nodes.length
    };
}


function getNodesFromWayWithTag(type: "highway" | "building"): {
    nodes: OSMNode[];
    idxs: number[];
} {
    const filteredNodes: OSMNode[] = [];
    const filteredNodesIdx: number[] = [];
    const { nodes, ways } = state;
    for (let i = 0; i < ways.length; i++) {
        if (!ways[i].tags.get(type)) continue;
        for (let j = 0; j < ways[i].node_ids.length; j++) {
            const nodeId = ways[i].node_ids[j];
            const idx = state.nodeIdIdxMap.get(nodeId);
            if (idx === undefined) throw new Error(`Invalid node id ${nodeId} referenced in a way ${i}, but not found in root data`);
            filteredNodes.push(nodes[idx]);
            filteredNodesIdx.push(idx);
        }
        filteredNodesIdx.push(0xFFFFFFFF);
    }
    return {
        nodes: filteredNodes, 
        idxs: filteredNodesIdx
    };
}

export function initHighwayNodes() {
    const { nodes, idxs } = getNodesFromWayWithTag("highway");
    state.highwayNodes = nodes;
    state.highwayNodesIdxs = idxs;
}

export function initBuildingNodes() {
    const { nodes, idxs } = getNodesFromWayWithTag("building");
    state.buildingNodes = nodes;
    state.buildingNodesIdxs = idxs;
}

export function normalizeNode(node: OSMNode): OSMNode {
    const { maxLat, minLat, maxLon, minLon } = state.metadata;

    const latRange = maxLat - minLat;
    const lonRange = maxLon - minLon;

    return {
        ...node,
        lon: (node.lon - minLon) / lonRange,
        lat: (node.lat - minLat) / latRange,
    };
}

export function initFlatNodeData() {
    const { nodes } = state;
    const data = [];
    for (let i = 0; i < nodes.length; i++) {
        const normalized = normalizeNode(nodes[i])
        data.push(
            normalized.lon,
            normalized.lat,
        )
    }

    state.normalizedNodesLonLatArray = data;
}
