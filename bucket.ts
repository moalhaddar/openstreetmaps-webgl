import { BucketEntry, Metadata, OSMNode } from "./types";


// Given lat, long => i,j => bucket
// A bucket contain {OSMNode, gl_index}


class BucketMap {
    rows: number = 100;
    cols: number = 100;
    data: Map<number, Map<number, BucketEntry[]>> = new Map();
    metadata: Metadata;
    nodeIdIdxMap: Map<number, number>;


    constructor(metadata: Metadata, nodeIdIdxMap: Map<number, number>) {
        this.metadata = metadata;
        this.nodeIdIdxMap = nodeIdIdxMap;
    }

    populate(nodes: OSMNode[]) {
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            this.put(node);
        }
    }

    getBucketIndexForLonLat(lon: number, lat: number): [number, number] {
        const { maxLat, minLat, maxLon, minLon } = this.metadata;

        const latRange = maxLat - minLat;
        const lonRange = maxLon - minLon;

        let x = ((lon - minLon) / lonRange) * this.cols;
        let y = ((lat - minLat) / latRange) * this.rows;
        x = Math.trunc(x);
        y = Math.trunc(y);

        if (x < 0 || y < 0) {
            throw new Error(`Found negative lon lat values yeild ${x}, ${y}`)
        }

        return [x, y];
    }

    getBucketEntriesForLonLat(lon: number, lat: number): BucketEntry[] | undefined {
        let [x, y] = this.getBucketIndexForLonLat(lon, lat)

        console.log(x, y);

        return this.data.get(x)?.get(y);
    }

    getBucketEntriesForClipspace(x: number, y: number): BucketEntry[] | undefined {
        x = x * this.cols;
        y = y * this.rows;

        x = Math.trunc(x);
        y = Math.trunc(y);

        console.log(x, y, this.data.get(x));
 
        return this.data.get(x)?.get(y);
    }

    put(node: OSMNode) {
        let [x, y] = this.getBucketIndexForLonLat(node.lon, node.lat)

        if (x >= this.cols) {
            x = this.cols - 1;
        }

        if (y >= this.rows) {
            y = this.rows - 1;
        }

        const glIndex = this.nodeIdIdxMap.get(node.id)

        if (glIndex === undefined) {
            throw new Error(`Failed to find glIndex for node id ${node.id}`)
        }
        
        const entry: BucketEntry = {
            node: node,
            glIndex
        }

        const row = this.data.get(x)
        if (row) {
            const buckets = row.get(y) || [];
            buckets.push(entry);
            row.set(y, buckets);
        } else {
            const newMap = new Map<number, BucketEntry[]>()
            newMap.set(y, [entry])
            this.data.set(x, newMap)
        }
    }
}

export default BucketMap;