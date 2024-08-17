import { state } from "./state.js";
class BucketMap {
    constructor(metadata) {
        this.rows = 200;
        this.cols = 200;
        this.data = new Map();
        this.metadata = metadata;
    }
    static init() {
        state.bucketMap = new BucketMap(state.metadata);
    }
    populate(nodes) {
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            this.put(node);
        }
    }
    getBucketLocationForLonLat(lon, lat) {
        const { maxLat, minLat, maxLon, minLon } = this.metadata;
        const latRange = maxLat - minLat;
        const lonRange = maxLon - minLon;
        let x = ((lon - minLon) / lonRange) * this.cols;
        let y = ((lat - minLat) / latRange) * this.rows;
        return [x, y];
    }
    getBucketIndexForLonLat(lon, lat) {
        let [x, y] = this.getBucketLocationForLonLat(lon, lat);
        x = Math.trunc(x);
        y = Math.trunc(y);
        if (x < 0 || y < 0) {
            throw new Error(`Found negative lon lat values yeild ${x}, ${y}`);
        }
        return [x, y];
    }
    getBucketEntriesForClipspace(x, y) {
        var _a;
        x = Math.trunc(x * this.cols);
        y = Math.trunc(y * this.rows);
        return (_a = this.data.get(x)) === null || _a === void 0 ? void 0 : _a.get(y);
    }
    getClosestBucketEntryForClipspace(x, y) {
        var _a;
        const row = Math.trunc(x * this.cols);
        const col = Math.trunc(y * this.rows);
        const bucketEntries = (_a = this.data.get(row)) === null || _a === void 0 ? void 0 : _a.get(col);
        if (bucketEntries === undefined) {
            return undefined;
        }
        let closest = undefined;
        const distance = (v1, v2) => {
            return Math.sqrt(Math.pow((v1[0] - v2[0]), 2) + Math.pow((v1[1] - v2[1]), 2));
        };
        for (let i = 0; i < bucketEntries.length; i++) {
            const { lon, lat } = bucketEntries[i].node;
            const nodeBucketLocation = this.getBucketLocationForLonLat(lon, lat);
            const mouseBucketLocation = [x * this.cols, y * this.rows];
            if (closest) {
                const closestNodeBucketLocation = this.getBucketLocationForLonLat(closest.node.lon, closest.node.lat);
                if (distance(mouseBucketLocation, nodeBucketLocation) <= distance(mouseBucketLocation, closestNodeBucketLocation)) {
                    closest = bucketEntries[i];
                }
            }
            else {
                closest = bucketEntries[i];
            }
        }
        return closest;
    }
    put(node) {
        let [x, y] = this.getBucketIndexForLonLat(node.lon, node.lat);
        if (x >= this.cols) {
            x = this.cols - 1;
        }
        if (y >= this.rows) {
            y = this.rows - 1;
        }
        const glIndex = state.nodeIdIdxMap.get(node.id);
        if (glIndex === undefined) {
            throw new Error(`Failed to find glIndex for node id ${node.id}`);
        }
        const entry = {
            node: node,
            glIndex
        };
        const row = this.data.get(x);
        if (row) {
            const buckets = row.get(y) || [];
            buckets.push(entry);
            row.set(y, buckets);
        }
        else {
            const newMap = new Map();
            newMap.set(y, [entry]);
            this.data.set(x, newMap);
        }
    }
}
export default BucketMap;
//# sourceMappingURL=bucket.js.map