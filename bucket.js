// Given lat, long => i,j => bucket
// A bucket contain {OSMNode, gl_index}
class BucketMap {
    constructor(metadata, nodeIdIdxMap) {
        this.rows = 100;
        this.cols = 100;
        this.data = new Map();
        this.metadata = metadata;
        this.nodeIdIdxMap = nodeIdIdxMap;
    }
    populate(nodes) {
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            this.put(node);
        }
    }
    getBucketIndexForLonLat(lon, lat) {
        const { maxLat, minLat, maxLon, minLon } = this.metadata;
        const latRange = maxLat - minLat;
        const lonRange = maxLon - minLon;
        let x = ((lon - minLon) / lonRange) * this.cols;
        let y = ((lat - minLat) / latRange) * this.rows;
        x = Math.trunc(x);
        y = Math.trunc(y);
        if (x < 0 || y < 0) {
            throw new Error(`Found negative lon lat values yeild ${x}, ${y}`);
        }
        return [x, y];
    }
    getBucketEntriesForLonLat(lon, lat) {
        var _a;
        let [x, y] = this.getBucketIndexForLonLat(lon, lat);
        console.log(x, y);
        return (_a = this.data.get(x)) === null || _a === void 0 ? void 0 : _a.get(y);
    }
    getBucketEntriesForClipspace(x, y) {
        var _a;
        x = x * this.cols;
        y = y * this.rows;
        x = Math.trunc(x);
        y = Math.trunc(y);
        console.log(x, y, this.data.get(x));
        return (_a = this.data.get(x)) === null || _a === void 0 ? void 0 : _a.get(y);
    }
    put(node) {
        let [x, y] = this.getBucketIndexForLonLat(node.lon, node.lat);
        if (x >= this.cols) {
            x = this.cols - 1;
        }
        if (y >= this.rows) {
            y = this.rows - 1;
        }
        const glIndex = this.nodeIdIdxMap.get(node.id);
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