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

    getBucketLocationForLonLat(lon: number, lat: number): [number, number] {
        const { maxLat, minLat, maxLon, minLon } = this.metadata;

        const latRange = maxLat - minLat;
        const lonRange = maxLon - minLon;

        let x = ((lon - minLon) / lonRange) * this.cols;
        let y = ((lat - minLat) / latRange) * this.rows;

        return [x, y];
    }

    getBucketIndexForLonLat(lon: number, lat: number): [number, number] {
        let [x, y] = this.getBucketLocationForLonLat(lon, lat);
        x = Math.trunc(x);
        y = Math.trunc(y);

        if (x < 0 || y < 0) {
            throw new Error(`Found negative lon lat values yeild ${x}, ${y}`)
        }

        return [x, y];
    }

    getBucketEntriesForClipspace(x: number, y: number): BucketEntry[] | undefined {
        x = Math.trunc(x * this.cols);
        y = Math.trunc(y * this.rows);
 
        return this.data.get(x)?.get(y);
    }

    getClosestBucketEntryForClipspace(x: number, y: number): BucketEntry | undefined {
        const row = Math.trunc(x * this.cols);
        const col = Math.trunc(y * this.rows);

        const bucketEntries = this.data.get(row)?.get(col)
        if (bucketEntries === undefined) {
            return undefined;
        }

        let closest: BucketEntry | undefined = undefined;

        const distance = (v1: [number, number], v2: [number, number]) => {
            return Math.sqrt(
                Math.pow((v1[0] - v2[0]), 2) + Math.pow((v1[1] - v2[1]), 2)
            )
        }

        for (let i = 0 ; i < bucketEntries.length; i++) {
            const {lon, lat} = bucketEntries[i].node;
            const nodeBucketLocation = this.getBucketLocationForLonLat(lon, lat);
            const mouseBucketLocation: [number, number] = [x * this.cols, y * this.rows];
            if (closest) {
                const closestNodeBucketLocation = this.getBucketLocationForLonLat(closest.node.lon, closest.node.lat);
                if (distance(mouseBucketLocation, nodeBucketLocation) <= distance(mouseBucketLocation, closestNodeBucketLocation)) {
                    closest = bucketEntries[i];
                }
            } else {
                closest = bucketEntries[i];
            }

        }

        return closest;
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