(()=>{"use strict";var __webpack_modules__={841:()=>{eval('\n// UNUSED EXPORTS: workerInstance\n\n;// CONCATENATED MODULE: ./src/external/priorityqueue.js\n/**\n * FastPriorityQueue.js : a fast heap-based priority queue  in JavaScript.\n * (c) the authors\n * Licensed under the Apache License, Version 2.0.\n *\n * Speed-optimized heap-based priority queue for modern browsers and JavaScript engines.\n *\n * Usage :\n         Installation (in shell, if you use node):\n         $ npm install fastpriorityqueue\n\n         Running test program (in JavaScript):\n\n         // var FastPriorityQueue = require("fastpriorityqueue");// in node\n         var x = new FastPriorityQueue();\n         x.add(1);\n         x.add(0);\n         x.add(5);\n         x.add(4);\n         x.add(3);\n         x.peek(); // should return 0, leaves x unchanged\n         x.size; // should return 5, leaves x unchanged\n         while(!x.isEmpty()) {\n           console.log(x.poll());\n         } // will print 0 1 3 4 5\n         x.trim(); // (optional) optimizes memory usage\n */\n\n\nvar defaultcomparator = function (a, b) {\n    return a < b;\n};\n\n// the provided comparator function should take a, b and return *true* when a < b\nfunction FastPriorityQueue(comparator) {\n    if (!(this instanceof FastPriorityQueue)) return new FastPriorityQueue(comparator);\n    this.array = [];\n    this.size = 0;\n    this.compare = comparator || defaultcomparator;\n}\n\n// copy the priority queue into another, and return it. Queue items are shallow-copied.\n// Runs in `O(n)` time.\nFastPriorityQueue.prototype.clone = function () {\n    var fpq = new FastPriorityQueue(this.compare);\n    fpq.size = this.size;\n    fpq.array = this.array.slice(0, this.size);\n    return fpq;\n};\n\n// Add an element into the queue\n// runs in O(log n) time\nFastPriorityQueue.prototype.add = function (myval) {\n    var i = this.size;\n    this.array[this.size] = myval;\n    this.size += 1;\n    var p;\n    var ap;\n    while (i > 0) {\n        p = (i - 1) >> 1;\n        ap = this.array[p];\n        if (!this.compare(myval, ap)) {\n            break;\n        }\n        this.array[i] = ap;\n        i = p;\n    }\n    this.array[i] = myval;\n};\n\n// replace the content of the heap by provided array and "heapify it"\nFastPriorityQueue.prototype.heapify = function (arr) {\n    this.array = arr;\n    this.size = arr.length;\n    var i;\n    for (i = this.size >> 1; i >= 0; i--) {\n        this._percolateDown(i);\n    }\n};\n\n// for internal use\nFastPriorityQueue.prototype._percolateUp = function (i, force) {\n    var myval = this.array[i];\n    var p;\n    var ap;\n    while (i > 0) {\n        p = (i - 1) >> 1;\n        ap = this.array[p];\n        // force will skip the compare\n        if (!force && !this.compare(myval, ap)) {\n            break;\n        }\n        this.array[i] = ap;\n        i = p;\n    }\n    this.array[i] = myval;\n};\n\n// for internal use\nFastPriorityQueue.prototype._percolateDown = function (i) {\n    var size = this.size;\n    var hsize = this.size >>> 1;\n    var ai = this.array[i];\n    var l;\n    var r;\n    var bestc;\n    while (i < hsize) {\n        l = (i << 1) + 1;\n        r = l + 1;\n        bestc = this.array[l];\n        if (r < size) {\n            if (this.compare(this.array[r], bestc)) {\n                l = r;\n                bestc = this.array[r];\n            }\n        }\n        if (!this.compare(bestc, ai)) {\n            break;\n        }\n        this.array[i] = bestc;\n        i = l;\n    }\n    this.array[i] = ai;\n};\n\n// internal\n// _removeAt(index) will remove the item at the given index from the queue,\n// retaining balance. returns the removed item, or undefined if nothing is removed.\nFastPriorityQueue.prototype._removeAt = function (index) {\n    if (index > this.size - 1 || index < 0) return undefined;\n\n    // impl1:\n    //this.array.splice(index, 1);\n    //this.heapify(this.array);\n    // impl2:\n    this._percolateUp(index, true);\n    return this.poll();\n};\n\n// remove(myval) will remove an item matching the provided value from the\n// queue, checked for equality by using the queue\'s comparator.\n// return true if removed, false otherwise.\nFastPriorityQueue.prototype.remove = function (myval) {\n    for (var i = 0; i < this.size; i++) {\n        if (!this.compare(this.array[i], myval) && !this.compare(myval, this.array[i])) {\n            // items match, comparator returns false both ways, remove item\n            this._removeAt(i);\n            return true;\n        }\n    }\n    return false;\n};\n\n// removeOne(callback) will execute the callback function for each item of the queue\n// and will remove the first item for which the callback will return true.\n// return the removed item, or undefined if nothing is removed.\nFastPriorityQueue.prototype.removeOne = function (callback) {\n    if (typeof callback !== "function") {\n        return undefined;\n    }\n    for (var i = 0; i < this.size; i++) {\n        if (callback(this.array[i])) {\n            return this._removeAt(i);\n        }\n    }\n};\n\n// remove(callback[, limit]) will execute the callback function for each item of\n// the queue and will remove each item for which the callback returns true, up to\n// a max limit of removed items if specified or no limit if unspecified.\n// return an array containing the removed items.\n// The callback function should be a pure function.\nFastPriorityQueue.prototype.removeMany = function (callback, limit) {\n    // Skip unnecessary processing for edge cases\n    if (typeof callback !== "function" || this.size < 1) {\n        return [];\n    }\n    limit = limit ? Math.min(limit, this.size) : this.size;\n\n    // Prepare the results container to hold up to the results limit\n    var resultSize = 0;\n    var result = new Array(limit);\n\n    // Prepare a temporary array to hold items we\'ll traverse through and need to keep\n    var tmpSize = 0;\n    var tmp = new Array(this.size);\n\n    while (resultSize < limit && !this.isEmpty()) {\n        // Dequeue items into either the results or our temporary array\n        var item = this.poll();\n        if (callback(item)) {\n            result[resultSize++] = item;\n        } else {\n            tmp[tmpSize++] = item;\n        }\n    }\n    // Update the result array with the exact number of results\n    result.length = resultSize;\n\n    // Re-add all the items we can keep\n    var i = 0;\n    while (i < tmpSize) {\n        this.add(tmp[i++]);\n    }\n\n    return result;\n};\n\n// Look at the top of the queue (one of the smallest elements) without removing it\n// executes in constant time\n//\n// Calling peek on an empty priority queue returns\n// the "undefined" value.\n// https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/undefined\n//\nFastPriorityQueue.prototype.peek = function () {\n    if (this.size == 0) return undefined;\n    return this.array[0];\n};\n\n// remove the element on top of the heap (one of the smallest elements)\n// runs in logarithmic time\n//\n// If the priority queue is empty, the function returns the\n// "undefined" value.\n// https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/undefined\n//\n// For long-running and large priority queues, or priority queues\n// storing large objects, you may  want to call the trim function\n// at strategic times to recover allocated memory.\nFastPriorityQueue.prototype.poll = function () {\n    if (this.size == 0) return undefined;\n    var ans = this.array[0];\n    if (this.size > 1) {\n        this.array[0] = this.array[--this.size];\n        this._percolateDown(0);\n    } else {\n        this.size -= 1;\n    }\n    return ans;\n};\n\n// This function adds the provided value to the heap, while removing\n// and returning one of the smallest elements (like poll). The size of the queue\n// thus remains unchanged.\nFastPriorityQueue.prototype.replaceTop = function (myval) {\n    if (this.size == 0) return undefined;\n    var ans = this.array[0];\n    this.array[0] = myval;\n    this._percolateDown(0);\n    return ans;\n};\n\n// recover unused memory (for long-running priority queues)\nFastPriorityQueue.prototype.trim = function () {\n    this.array = this.array.slice(0, this.size);\n};\n\n// Check whether the heap is empty\nFastPriorityQueue.prototype.isEmpty = function () {\n    return this.size === 0;\n};\n\n// iterate over the items in order, pass a callback that receives (item, index) as args.\n// TODO once we transpile, uncomment\n// if (Symbol && Symbol.iterator) {\n//   FastPriorityQueue.prototype[Symbol.iterator] = function*() {\n//     if (this.isEmpty()) return;\n//     var fpq = this.clone();\n//     while (!fpq.isEmpty()) {\n//       yield fpq.poll();\n//     }\n//   };\n// }\nFastPriorityQueue.prototype.forEach = function (callback) {\n    if (this.isEmpty() || typeof callback != \'function\') return;\n    var i = 0;\n    var fpq = this.clone();\n    while (!fpq.isEmpty()) {\n        callback(fpq.poll(), i++);\n    }\n};\n\n// return the k \'smallest\' elements of the queue as an array,\n// runs in O(k log k) time, the elements are not removed\n// from the priority queue.\nFastPriorityQueue.prototype.kSmallest = function (k) {\n    if ((this.size == 0) || (k <= 0)) return [];\n    k = Math.min(this.size, k);\n    const newSize = Math.min(this.size, (2 ** (k - 1)) + 1);\n    if (newSize < 2) { return [this.peek()] }\n\n    const fpq = new FastPriorityQueue(this.compare);\n    fpq.size = newSize;\n    fpq.array = this.array.slice(0, newSize);\n\n    const smallest = new Array(k);\n    for (let i = 0; i < k; i++) {\n        smallest[i] = fpq.poll();\n    }\n    return smallest;\n}\n\n/* harmony default export */ const priorityqueue = (FastPriorityQueue);\n\n;// CONCATENATED MODULE: ./src/pathfinding.ts\n\nlet graph;\nfunction findPath(previous, endNodeIdx) {\n    const path = [];\n    let u = endNodeIdx;\n    if (u === undefined)\n        throw new Error(`Cannot find target node in the reverse lookup ${1}`);\n    while (u !== undefined) {\n        path.unshift(u);\n        u = previous[u];\n    }\n    return path;\n}\nfunction dijkstra(startNodeIndex) {\n    console.log("Starting dijkstra");\n    let distances = {};\n    let previous = {};\n    const visited = new Set();\n    let nodes = graph.keys();\n    for (let node of nodes) {\n        distances[node] = Infinity;\n        previous[node] = undefined;\n    }\n    const pq = new priorityqueue((a, b) => {\n        return a.distance < b.distance;\n    });\n    pq.add({ distance: 0, idx: startNodeIndex });\n    distances[startNodeIndex] = 0;\n    console.time("dijkstra time:");\n    const updates = [];\n    while (!pq.isEmpty()) {\n        const u = pq.poll().idx;\n        if (distances[u] === Infinity)\n            break;\n        visited.add(u);\n        for (const [v] of graph.get(u)) {\n            updates.push(v, u);\n            if (!visited.has(v)) {\n                const w = graph.get(u).get(v);\n                const newDistance = distances[u] + w;\n                if (distances[v] > newDistance) {\n                    distances[v] = newDistance;\n                    previous[v] = u;\n                    pq.add({ distance: distances[v], idx: v });\n                }\n            }\n        }\n        if (updates.length >= 100) {\n            self.postMessage({\n                eventType: "GRAPH_VISITED_UPDATE_BULK",\n                eventData: updates,\n            });\n            updates.length = 0;\n        }\n    }\n    self.postMessage({\n        eventType: "GRAPH_VISITED_UPDATE_BULK",\n        eventData: updates,\n    });\n    updates.length = 0;\n    console.timeEnd("dijkstra time:");\n    return { previous };\n}\n/**\n * Ref: http://www.movable-type.co.uk/scripts/latlong.html\n * @param lon1\n * @param lat1\n * @param lon2\n * @param lat2\n */\nfunction haversine(lon1, lat1, lon2, lat2) {\n    const R = 6371e3; // metres\n    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians\n    const φ2 = lat2 * Math.PI / 180;\n    const Δφ = (lat2 - lat1) * Math.PI / 180;\n    const Δλ = (lon2 - lon1) * Math.PI / 180;\n    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +\n        Math.cos(φ1) * Math.cos(φ2) *\n            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);\n    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));\n    const d = R * c; // in metres\n    return d;\n}\nfunction buildGraph(ways, nodes, nodeIdIdxMap) {\n    const g = new Map();\n    let edges = 0;\n    for (let i = 0; i < ways.length; i++) {\n        const way = ways[i];\n        let oneWay = false;\n        if (way.tags["oneway"] === "yes" || way.tags["junction"] === "roundabout") {\n            oneWay = true;\n        }\n        const wayNodes = way.node_ids.map(id => {\n            const idx = nodeIdIdxMap.get(id);\n            if (idx === undefined) {\n                throw new Error("Cannot find index for node id");\n            }\n            return nodes[idx];\n        });\n        for (let j = 0; j < wayNodes.length; j++) {\n            const start = wayNodes[j];\n            const end = wayNodes[j + 1];\n            if (start && end) {\n                const startIndex = nodeIdIdxMap.get(start.id);\n                const endIndex = nodeIdIdxMap.get(end.id);\n                if (startIndex === undefined || endIndex === undefined) {\n                    throw new Error("Cannot find index for node ids");\n                }\n                const distance = haversine(start.lon, start.lat, end.lon, end.lat);\n                if (g.get(startIndex) === undefined) {\n                    g.set(startIndex, new Map());\n                }\n                if (g.get(endIndex) === undefined) {\n                    g.set(endIndex, new Map());\n                }\n                if (oneWay) {\n                    edges++;\n                    g.get(startIndex).set(endIndex, distance);\n                }\n                else {\n                    edges += 2;\n                    g.get(startIndex).set(endIndex, distance);\n                    g.get(endIndex).set(startIndex, distance);\n                }\n            }\n        }\n    }\n    console.log(`Built graph. Edges count: ${edges}`);\n    graph = g;\n}\n\n;// CONCATENATED MODULE: ./src/graph-worker.ts\n\nfunction add(a, b) {\n    return a + b;\n}\nlet workerInstance = {\n    add,\n    buildGraph: buildGraph,\n    dijkstra: dijkstra,\n    findPath: findPath\n};\nself.addEventListener("message", function (event) {\n    const { eventType, eventData, eventId } = event.data;\n    if (eventType === \'INITIALISE\') {\n        self.postMessage({\n            eventType: "INITIALISED",\n            eventData: Object.keys(workerInstance)\n        });\n    }\n    else if (eventType === \'CALL\') {\n        const method = workerInstance[eventData.method];\n        const result = method.apply(null, eventData.arguments);\n        self.postMessage({\n            eventType: "RESULT",\n            eventData: result,\n            eventId: eventId\n        });\n    }\n    else {\n        console.error(`Unknown event type ${eventType}`);\n    }\n}, false);\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw2QkFBNkIsZ0NBQWdDO0FBQzdEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDTztBQUNQLHNCQUFzQjtBQUN0QixxQ0FBcUM7QUFDckM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxQkFBcUI7QUFDckI7QUFDQTtBQUNPO0FBQ1A7QUFDQTtBQUNBLG9CQUFvQixpQkFBaUI7QUFDckM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVCx3QkFBd0IscUJBQXFCO0FBQzdDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDZDQUE2QyxNQUFNO0FBQ25EO0FBQ0E7OztBQ2pJK0Q7QUFDL0Q7QUFDQTtBQUNBO0FBQ087QUFDUDtBQUNBLGNBQWM7QUFDZCxZQUFZO0FBQ1osWUFBWTtBQUNaO0FBQ0E7QUFDQSxZQUFZLGdDQUFnQztBQUM1QztBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQSw0Q0FBNEMsVUFBVTtBQUN0RDtBQUNBLENBQUMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly93ZWJnbC1wcm9iZS0yLy4vc3JjL2V4dGVybmFsL3ByaW9yaXR5cXVldWUuanM/ZjY2NCIsIndlYnBhY2s6Ly93ZWJnbC1wcm9iZS0yLy4vc3JjL3BhdGhmaW5kaW5nLnRzPzU5YzYiLCJ3ZWJwYWNrOi8vd2ViZ2wtcHJvYmUtMi8uL3NyYy9ncmFwaC13b3JrZXIudHM/ZjNiZiJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEZhc3RQcmlvcml0eVF1ZXVlLmpzIDogYSBmYXN0IGhlYXAtYmFzZWQgcHJpb3JpdHkgcXVldWUgIGluIEphdmFTY3JpcHQuXG4gKiAoYykgdGhlIGF1dGhvcnNcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAuXG4gKlxuICogU3BlZWQtb3B0aW1pemVkIGhlYXAtYmFzZWQgcHJpb3JpdHkgcXVldWUgZm9yIG1vZGVybiBicm93c2VycyBhbmQgSmF2YVNjcmlwdCBlbmdpbmVzLlxuICpcbiAqIFVzYWdlIDpcbiAgICAgICAgIEluc3RhbGxhdGlvbiAoaW4gc2hlbGwsIGlmIHlvdSB1c2Ugbm9kZSk6XG4gICAgICAgICAkIG5wbSBpbnN0YWxsIGZhc3Rwcmlvcml0eXF1ZXVlXG5cbiAgICAgICAgIFJ1bm5pbmcgdGVzdCBwcm9ncmFtIChpbiBKYXZhU2NyaXB0KTpcblxuICAgICAgICAgLy8gdmFyIEZhc3RQcmlvcml0eVF1ZXVlID0gcmVxdWlyZShcImZhc3Rwcmlvcml0eXF1ZXVlXCIpOy8vIGluIG5vZGVcbiAgICAgICAgIHZhciB4ID0gbmV3IEZhc3RQcmlvcml0eVF1ZXVlKCk7XG4gICAgICAgICB4LmFkZCgxKTtcbiAgICAgICAgIHguYWRkKDApO1xuICAgICAgICAgeC5hZGQoNSk7XG4gICAgICAgICB4LmFkZCg0KTtcbiAgICAgICAgIHguYWRkKDMpO1xuICAgICAgICAgeC5wZWVrKCk7IC8vIHNob3VsZCByZXR1cm4gMCwgbGVhdmVzIHggdW5jaGFuZ2VkXG4gICAgICAgICB4LnNpemU7IC8vIHNob3VsZCByZXR1cm4gNSwgbGVhdmVzIHggdW5jaGFuZ2VkXG4gICAgICAgICB3aGlsZSgheC5pc0VtcHR5KCkpIHtcbiAgICAgICAgICAgY29uc29sZS5sb2coeC5wb2xsKCkpO1xuICAgICAgICAgfSAvLyB3aWxsIHByaW50IDAgMSAzIDQgNVxuICAgICAgICAgeC50cmltKCk7IC8vIChvcHRpb25hbCkgb3B0aW1pemVzIG1lbW9yeSB1c2FnZVxuICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBkZWZhdWx0Y29tcGFyYXRvciA9IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgcmV0dXJuIGEgPCBiO1xufTtcblxuLy8gdGhlIHByb3ZpZGVkIGNvbXBhcmF0b3IgZnVuY3Rpb24gc2hvdWxkIHRha2UgYSwgYiBhbmQgcmV0dXJuICp0cnVlKiB3aGVuIGEgPCBiXG5mdW5jdGlvbiBGYXN0UHJpb3JpdHlRdWV1ZShjb21wYXJhdG9yKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZhc3RQcmlvcml0eVF1ZXVlKSkgcmV0dXJuIG5ldyBGYXN0UHJpb3JpdHlRdWV1ZShjb21wYXJhdG9yKTtcbiAgICB0aGlzLmFycmF5ID0gW107XG4gICAgdGhpcy5zaXplID0gMDtcbiAgICB0aGlzLmNvbXBhcmUgPSBjb21wYXJhdG9yIHx8IGRlZmF1bHRjb21wYXJhdG9yO1xufVxuXG4vLyBjb3B5IHRoZSBwcmlvcml0eSBxdWV1ZSBpbnRvIGFub3RoZXIsIGFuZCByZXR1cm4gaXQuIFF1ZXVlIGl0ZW1zIGFyZSBzaGFsbG93LWNvcGllZC5cbi8vIFJ1bnMgaW4gYE8obilgIHRpbWUuXG5GYXN0UHJpb3JpdHlRdWV1ZS5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGZwcSA9IG5ldyBGYXN0UHJpb3JpdHlRdWV1ZSh0aGlzLmNvbXBhcmUpO1xuICAgIGZwcS5zaXplID0gdGhpcy5zaXplO1xuICAgIGZwcS5hcnJheSA9IHRoaXMuYXJyYXkuc2xpY2UoMCwgdGhpcy5zaXplKTtcbiAgICByZXR1cm4gZnBxO1xufTtcblxuLy8gQWRkIGFuIGVsZW1lbnQgaW50byB0aGUgcXVldWVcbi8vIHJ1bnMgaW4gTyhsb2cgbikgdGltZVxuRmFzdFByaW9yaXR5UXVldWUucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIChteXZhbCkge1xuICAgIHZhciBpID0gdGhpcy5zaXplO1xuICAgIHRoaXMuYXJyYXlbdGhpcy5zaXplXSA9IG15dmFsO1xuICAgIHRoaXMuc2l6ZSArPSAxO1xuICAgIHZhciBwO1xuICAgIHZhciBhcDtcbiAgICB3aGlsZSAoaSA+IDApIHtcbiAgICAgICAgcCA9IChpIC0gMSkgPj4gMTtcbiAgICAgICAgYXAgPSB0aGlzLmFycmF5W3BdO1xuICAgICAgICBpZiAoIXRoaXMuY29tcGFyZShteXZhbCwgYXApKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmFycmF5W2ldID0gYXA7XG4gICAgICAgIGkgPSBwO1xuICAgIH1cbiAgICB0aGlzLmFycmF5W2ldID0gbXl2YWw7XG59O1xuXG4vLyByZXBsYWNlIHRoZSBjb250ZW50IG9mIHRoZSBoZWFwIGJ5IHByb3ZpZGVkIGFycmF5IGFuZCBcImhlYXBpZnkgaXRcIlxuRmFzdFByaW9yaXR5UXVldWUucHJvdG90eXBlLmhlYXBpZnkgPSBmdW5jdGlvbiAoYXJyKSB7XG4gICAgdGhpcy5hcnJheSA9IGFycjtcbiAgICB0aGlzLnNpemUgPSBhcnIubGVuZ3RoO1xuICAgIHZhciBpO1xuICAgIGZvciAoaSA9IHRoaXMuc2l6ZSA+PiAxOyBpID49IDA7IGktLSkge1xuICAgICAgICB0aGlzLl9wZXJjb2xhdGVEb3duKGkpO1xuICAgIH1cbn07XG5cbi8vIGZvciBpbnRlcm5hbCB1c2VcbkZhc3RQcmlvcml0eVF1ZXVlLnByb3RvdHlwZS5fcGVyY29sYXRlVXAgPSBmdW5jdGlvbiAoaSwgZm9yY2UpIHtcbiAgICB2YXIgbXl2YWwgPSB0aGlzLmFycmF5W2ldO1xuICAgIHZhciBwO1xuICAgIHZhciBhcDtcbiAgICB3aGlsZSAoaSA+IDApIHtcbiAgICAgICAgcCA9IChpIC0gMSkgPj4gMTtcbiAgICAgICAgYXAgPSB0aGlzLmFycmF5W3BdO1xuICAgICAgICAvLyBmb3JjZSB3aWxsIHNraXAgdGhlIGNvbXBhcmVcbiAgICAgICAgaWYgKCFmb3JjZSAmJiAhdGhpcy5jb21wYXJlKG15dmFsLCBhcCkpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYXJyYXlbaV0gPSBhcDtcbiAgICAgICAgaSA9IHA7XG4gICAgfVxuICAgIHRoaXMuYXJyYXlbaV0gPSBteXZhbDtcbn07XG5cbi8vIGZvciBpbnRlcm5hbCB1c2VcbkZhc3RQcmlvcml0eVF1ZXVlLnByb3RvdHlwZS5fcGVyY29sYXRlRG93biA9IGZ1bmN0aW9uIChpKSB7XG4gICAgdmFyIHNpemUgPSB0aGlzLnNpemU7XG4gICAgdmFyIGhzaXplID0gdGhpcy5zaXplID4+PiAxO1xuICAgIHZhciBhaSA9IHRoaXMuYXJyYXlbaV07XG4gICAgdmFyIGw7XG4gICAgdmFyIHI7XG4gICAgdmFyIGJlc3RjO1xuICAgIHdoaWxlIChpIDwgaHNpemUpIHtcbiAgICAgICAgbCA9IChpIDw8IDEpICsgMTtcbiAgICAgICAgciA9IGwgKyAxO1xuICAgICAgICBiZXN0YyA9IHRoaXMuYXJyYXlbbF07XG4gICAgICAgIGlmIChyIDwgc2l6ZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuY29tcGFyZSh0aGlzLmFycmF5W3JdLCBiZXN0YykpIHtcbiAgICAgICAgICAgICAgICBsID0gcjtcbiAgICAgICAgICAgICAgICBiZXN0YyA9IHRoaXMuYXJyYXlbcl07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLmNvbXBhcmUoYmVzdGMsIGFpKSkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5hcnJheVtpXSA9IGJlc3RjO1xuICAgICAgICBpID0gbDtcbiAgICB9XG4gICAgdGhpcy5hcnJheVtpXSA9IGFpO1xufTtcblxuLy8gaW50ZXJuYWxcbi8vIF9yZW1vdmVBdChpbmRleCkgd2lsbCByZW1vdmUgdGhlIGl0ZW0gYXQgdGhlIGdpdmVuIGluZGV4IGZyb20gdGhlIHF1ZXVlLFxuLy8gcmV0YWluaW5nIGJhbGFuY2UuIHJldHVybnMgdGhlIHJlbW92ZWQgaXRlbSwgb3IgdW5kZWZpbmVkIGlmIG5vdGhpbmcgaXMgcmVtb3ZlZC5cbkZhc3RQcmlvcml0eVF1ZXVlLnByb3RvdHlwZS5fcmVtb3ZlQXQgPSBmdW5jdGlvbiAoaW5kZXgpIHtcbiAgICBpZiAoaW5kZXggPiB0aGlzLnNpemUgLSAxIHx8IGluZGV4IDwgMCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgIC8vIGltcGwxOlxuICAgIC8vdGhpcy5hcnJheS5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIC8vdGhpcy5oZWFwaWZ5KHRoaXMuYXJyYXkpO1xuICAgIC8vIGltcGwyOlxuICAgIHRoaXMuX3BlcmNvbGF0ZVVwKGluZGV4LCB0cnVlKTtcbiAgICByZXR1cm4gdGhpcy5wb2xsKCk7XG59O1xuXG4vLyByZW1vdmUobXl2YWwpIHdpbGwgcmVtb3ZlIGFuIGl0ZW0gbWF0Y2hpbmcgdGhlIHByb3ZpZGVkIHZhbHVlIGZyb20gdGhlXG4vLyBxdWV1ZSwgY2hlY2tlZCBmb3IgZXF1YWxpdHkgYnkgdXNpbmcgdGhlIHF1ZXVlJ3MgY29tcGFyYXRvci5cbi8vIHJldHVybiB0cnVlIGlmIHJlbW92ZWQsIGZhbHNlIG90aGVyd2lzZS5cbkZhc3RQcmlvcml0eVF1ZXVlLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAobXl2YWwpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuc2l6ZTsgaSsrKSB7XG4gICAgICAgIGlmICghdGhpcy5jb21wYXJlKHRoaXMuYXJyYXlbaV0sIG15dmFsKSAmJiAhdGhpcy5jb21wYXJlKG15dmFsLCB0aGlzLmFycmF5W2ldKSkge1xuICAgICAgICAgICAgLy8gaXRlbXMgbWF0Y2gsIGNvbXBhcmF0b3IgcmV0dXJucyBmYWxzZSBib3RoIHdheXMsIHJlbW92ZSBpdGVtXG4gICAgICAgICAgICB0aGlzLl9yZW1vdmVBdChpKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbi8vIHJlbW92ZU9uZShjYWxsYmFjaykgd2lsbCBleGVjdXRlIHRoZSBjYWxsYmFjayBmdW5jdGlvbiBmb3IgZWFjaCBpdGVtIG9mIHRoZSBxdWV1ZVxuLy8gYW5kIHdpbGwgcmVtb3ZlIHRoZSBmaXJzdCBpdGVtIGZvciB3aGljaCB0aGUgY2FsbGJhY2sgd2lsbCByZXR1cm4gdHJ1ZS5cbi8vIHJldHVybiB0aGUgcmVtb3ZlZCBpdGVtLCBvciB1bmRlZmluZWQgaWYgbm90aGluZyBpcyByZW1vdmVkLlxuRmFzdFByaW9yaXR5UXVldWUucHJvdG90eXBlLnJlbW92ZU9uZSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuc2l6ZTsgaSsrKSB7XG4gICAgICAgIGlmIChjYWxsYmFjayh0aGlzLmFycmF5W2ldKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JlbW92ZUF0KGkpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLy8gcmVtb3ZlKGNhbGxiYWNrWywgbGltaXRdKSB3aWxsIGV4ZWN1dGUgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uIGZvciBlYWNoIGl0ZW0gb2Zcbi8vIHRoZSBxdWV1ZSBhbmQgd2lsbCByZW1vdmUgZWFjaCBpdGVtIGZvciB3aGljaCB0aGUgY2FsbGJhY2sgcmV0dXJucyB0cnVlLCB1cCB0b1xuLy8gYSBtYXggbGltaXQgb2YgcmVtb3ZlZCBpdGVtcyBpZiBzcGVjaWZpZWQgb3Igbm8gbGltaXQgaWYgdW5zcGVjaWZpZWQuXG4vLyByZXR1cm4gYW4gYXJyYXkgY29udGFpbmluZyB0aGUgcmVtb3ZlZCBpdGVtcy5cbi8vIFRoZSBjYWxsYmFjayBmdW5jdGlvbiBzaG91bGQgYmUgYSBwdXJlIGZ1bmN0aW9uLlxuRmFzdFByaW9yaXR5UXVldWUucHJvdG90eXBlLnJlbW92ZU1hbnkgPSBmdW5jdGlvbiAoY2FsbGJhY2ssIGxpbWl0KSB7XG4gICAgLy8gU2tpcCB1bm5lY2Vzc2FyeSBwcm9jZXNzaW5nIGZvciBlZGdlIGNhc2VzXG4gICAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiIHx8IHRoaXMuc2l6ZSA8IDEpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBsaW1pdCA9IGxpbWl0ID8gTWF0aC5taW4obGltaXQsIHRoaXMuc2l6ZSkgOiB0aGlzLnNpemU7XG5cbiAgICAvLyBQcmVwYXJlIHRoZSByZXN1bHRzIGNvbnRhaW5lciB0byBob2xkIHVwIHRvIHRoZSByZXN1bHRzIGxpbWl0XG4gICAgdmFyIHJlc3VsdFNpemUgPSAwO1xuICAgIHZhciByZXN1bHQgPSBuZXcgQXJyYXkobGltaXQpO1xuXG4gICAgLy8gUHJlcGFyZSBhIHRlbXBvcmFyeSBhcnJheSB0byBob2xkIGl0ZW1zIHdlJ2xsIHRyYXZlcnNlIHRocm91Z2ggYW5kIG5lZWQgdG8ga2VlcFxuICAgIHZhciB0bXBTaXplID0gMDtcbiAgICB2YXIgdG1wID0gbmV3IEFycmF5KHRoaXMuc2l6ZSk7XG5cbiAgICB3aGlsZSAocmVzdWx0U2l6ZSA8IGxpbWl0ICYmICF0aGlzLmlzRW1wdHkoKSkge1xuICAgICAgICAvLyBEZXF1ZXVlIGl0ZW1zIGludG8gZWl0aGVyIHRoZSByZXN1bHRzIG9yIG91ciB0ZW1wb3JhcnkgYXJyYXlcbiAgICAgICAgdmFyIGl0ZW0gPSB0aGlzLnBvbGwoKTtcbiAgICAgICAgaWYgKGNhbGxiYWNrKGl0ZW0pKSB7XG4gICAgICAgICAgICByZXN1bHRbcmVzdWx0U2l6ZSsrXSA9IGl0ZW07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0bXBbdG1wU2l6ZSsrXSA9IGl0ZW07XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gVXBkYXRlIHRoZSByZXN1bHQgYXJyYXkgd2l0aCB0aGUgZXhhY3QgbnVtYmVyIG9mIHJlc3VsdHNcbiAgICByZXN1bHQubGVuZ3RoID0gcmVzdWx0U2l6ZTtcblxuICAgIC8vIFJlLWFkZCBhbGwgdGhlIGl0ZW1zIHdlIGNhbiBrZWVwXG4gICAgdmFyIGkgPSAwO1xuICAgIHdoaWxlIChpIDwgdG1wU2l6ZSkge1xuICAgICAgICB0aGlzLmFkZCh0bXBbaSsrXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8vIExvb2sgYXQgdGhlIHRvcCBvZiB0aGUgcXVldWUgKG9uZSBvZiB0aGUgc21hbGxlc3QgZWxlbWVudHMpIHdpdGhvdXQgcmVtb3ZpbmcgaXRcbi8vIGV4ZWN1dGVzIGluIGNvbnN0YW50IHRpbWVcbi8vXG4vLyBDYWxsaW5nIHBlZWsgb24gYW4gZW1wdHkgcHJpb3JpdHkgcXVldWUgcmV0dXJuc1xuLy8gdGhlIFwidW5kZWZpbmVkXCIgdmFsdWUuXG4vLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy91bmRlZmluZWRcbi8vXG5GYXN0UHJpb3JpdHlRdWV1ZS5wcm90b3R5cGUucGVlayA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5zaXplID09IDApIHJldHVybiB1bmRlZmluZWQ7XG4gICAgcmV0dXJuIHRoaXMuYXJyYXlbMF07XG59O1xuXG4vLyByZW1vdmUgdGhlIGVsZW1lbnQgb24gdG9wIG9mIHRoZSBoZWFwIChvbmUgb2YgdGhlIHNtYWxsZXN0IGVsZW1lbnRzKVxuLy8gcnVucyBpbiBsb2dhcml0aG1pYyB0aW1lXG4vL1xuLy8gSWYgdGhlIHByaW9yaXR5IHF1ZXVlIGlzIGVtcHR5LCB0aGUgZnVuY3Rpb24gcmV0dXJucyB0aGVcbi8vIFwidW5kZWZpbmVkXCIgdmFsdWUuXG4vLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy91bmRlZmluZWRcbi8vXG4vLyBGb3IgbG9uZy1ydW5uaW5nIGFuZCBsYXJnZSBwcmlvcml0eSBxdWV1ZXMsIG9yIHByaW9yaXR5IHF1ZXVlc1xuLy8gc3RvcmluZyBsYXJnZSBvYmplY3RzLCB5b3UgbWF5ICB3YW50IHRvIGNhbGwgdGhlIHRyaW0gZnVuY3Rpb25cbi8vIGF0IHN0cmF0ZWdpYyB0aW1lcyB0byByZWNvdmVyIGFsbG9jYXRlZCBtZW1vcnkuXG5GYXN0UHJpb3JpdHlRdWV1ZS5wcm90b3R5cGUucG9sbCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5zaXplID09IDApIHJldHVybiB1bmRlZmluZWQ7XG4gICAgdmFyIGFucyA9IHRoaXMuYXJyYXlbMF07XG4gICAgaWYgKHRoaXMuc2l6ZSA+IDEpIHtcbiAgICAgICAgdGhpcy5hcnJheVswXSA9IHRoaXMuYXJyYXlbLS10aGlzLnNpemVdO1xuICAgICAgICB0aGlzLl9wZXJjb2xhdGVEb3duKDApO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuc2l6ZSAtPSAxO1xuICAgIH1cbiAgICByZXR1cm4gYW5zO1xufTtcblxuLy8gVGhpcyBmdW5jdGlvbiBhZGRzIHRoZSBwcm92aWRlZCB2YWx1ZSB0byB0aGUgaGVhcCwgd2hpbGUgcmVtb3Zpbmdcbi8vIGFuZCByZXR1cm5pbmcgb25lIG9mIHRoZSBzbWFsbGVzdCBlbGVtZW50cyAobGlrZSBwb2xsKS4gVGhlIHNpemUgb2YgdGhlIHF1ZXVlXG4vLyB0aHVzIHJlbWFpbnMgdW5jaGFuZ2VkLlxuRmFzdFByaW9yaXR5UXVldWUucHJvdG90eXBlLnJlcGxhY2VUb3AgPSBmdW5jdGlvbiAobXl2YWwpIHtcbiAgICBpZiAodGhpcy5zaXplID09IDApIHJldHVybiB1bmRlZmluZWQ7XG4gICAgdmFyIGFucyA9IHRoaXMuYXJyYXlbMF07XG4gICAgdGhpcy5hcnJheVswXSA9IG15dmFsO1xuICAgIHRoaXMuX3BlcmNvbGF0ZURvd24oMCk7XG4gICAgcmV0dXJuIGFucztcbn07XG5cbi8vIHJlY292ZXIgdW51c2VkIG1lbW9yeSAoZm9yIGxvbmctcnVubmluZyBwcmlvcml0eSBxdWV1ZXMpXG5GYXN0UHJpb3JpdHlRdWV1ZS5wcm90b3R5cGUudHJpbSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmFycmF5ID0gdGhpcy5hcnJheS5zbGljZSgwLCB0aGlzLnNpemUpO1xufTtcblxuLy8gQ2hlY2sgd2hldGhlciB0aGUgaGVhcCBpcyBlbXB0eVxuRmFzdFByaW9yaXR5UXVldWUucHJvdG90eXBlLmlzRW1wdHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuc2l6ZSA9PT0gMDtcbn07XG5cbi8vIGl0ZXJhdGUgb3ZlciB0aGUgaXRlbXMgaW4gb3JkZXIsIHBhc3MgYSBjYWxsYmFjayB0aGF0IHJlY2VpdmVzIChpdGVtLCBpbmRleCkgYXMgYXJncy5cbi8vIFRPRE8gb25jZSB3ZSB0cmFuc3BpbGUsIHVuY29tbWVudFxuLy8gaWYgKFN5bWJvbCAmJiBTeW1ib2wuaXRlcmF0b3IpIHtcbi8vICAgRmFzdFByaW9yaXR5UXVldWUucHJvdG90eXBlW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbiooKSB7XG4vLyAgICAgaWYgKHRoaXMuaXNFbXB0eSgpKSByZXR1cm47XG4vLyAgICAgdmFyIGZwcSA9IHRoaXMuY2xvbmUoKTtcbi8vICAgICB3aGlsZSAoIWZwcS5pc0VtcHR5KCkpIHtcbi8vICAgICAgIHlpZWxkIGZwcS5wb2xsKCk7XG4vLyAgICAgfVxuLy8gICB9O1xuLy8gfVxuRmFzdFByaW9yaXR5UXVldWUucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICBpZiAodGhpcy5pc0VtcHR5KCkgfHwgdHlwZW9mIGNhbGxiYWNrICE9ICdmdW5jdGlvbicpIHJldHVybjtcbiAgICB2YXIgaSA9IDA7XG4gICAgdmFyIGZwcSA9IHRoaXMuY2xvbmUoKTtcbiAgICB3aGlsZSAoIWZwcS5pc0VtcHR5KCkpIHtcbiAgICAgICAgY2FsbGJhY2soZnBxLnBvbGwoKSwgaSsrKTtcbiAgICB9XG59O1xuXG4vLyByZXR1cm4gdGhlIGsgJ3NtYWxsZXN0JyBlbGVtZW50cyBvZiB0aGUgcXVldWUgYXMgYW4gYXJyYXksXG4vLyBydW5zIGluIE8oayBsb2cgaykgdGltZSwgdGhlIGVsZW1lbnRzIGFyZSBub3QgcmVtb3ZlZFxuLy8gZnJvbSB0aGUgcHJpb3JpdHkgcXVldWUuXG5GYXN0UHJpb3JpdHlRdWV1ZS5wcm90b3R5cGUua1NtYWxsZXN0ID0gZnVuY3Rpb24gKGspIHtcbiAgICBpZiAoKHRoaXMuc2l6ZSA9PSAwKSB8fCAoayA8PSAwKSkgcmV0dXJuIFtdO1xuICAgIGsgPSBNYXRoLm1pbih0aGlzLnNpemUsIGspO1xuICAgIGNvbnN0IG5ld1NpemUgPSBNYXRoLm1pbih0aGlzLnNpemUsICgyICoqIChrIC0gMSkpICsgMSk7XG4gICAgaWYgKG5ld1NpemUgPCAyKSB7IHJldHVybiBbdGhpcy5wZWVrKCldIH1cblxuICAgIGNvbnN0IGZwcSA9IG5ldyBGYXN0UHJpb3JpdHlRdWV1ZSh0aGlzLmNvbXBhcmUpO1xuICAgIGZwcS5zaXplID0gbmV3U2l6ZTtcbiAgICBmcHEuYXJyYXkgPSB0aGlzLmFycmF5LnNsaWNlKDAsIG5ld1NpemUpO1xuXG4gICAgY29uc3Qgc21hbGxlc3QgPSBuZXcgQXJyYXkoayk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBrOyBpKyspIHtcbiAgICAgICAgc21hbGxlc3RbaV0gPSBmcHEucG9sbCgpO1xuICAgIH1cbiAgICByZXR1cm4gc21hbGxlc3Q7XG59XG5cbmV4cG9ydCBkZWZhdWx0IEZhc3RQcmlvcml0eVF1ZXVlO1xuIiwiaW1wb3J0IEZhc3RQcmlvcml0eVF1ZXVlIGZyb20gXCIuL2V4dGVybmFsL3ByaW9yaXR5cXVldWVcIjtcbmV4cG9ydCBsZXQgZ3JhcGg7XG5leHBvcnQgZnVuY3Rpb24gZmluZFBhdGgocHJldmlvdXMsIGVuZE5vZGVJZHgpIHtcbiAgICBjb25zdCBwYXRoID0gW107XG4gICAgbGV0IHUgPSBlbmROb2RlSWR4O1xuICAgIGlmICh1ID09PSB1bmRlZmluZWQpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IGZpbmQgdGFyZ2V0IG5vZGUgaW4gdGhlIHJldmVyc2UgbG9va3VwICR7MX1gKTtcbiAgICB3aGlsZSAodSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHBhdGgudW5zaGlmdCh1KTtcbiAgICAgICAgdSA9IHByZXZpb3VzW3VdO1xuICAgIH1cbiAgICByZXR1cm4gcGF0aDtcbn1cbmV4cG9ydCBmdW5jdGlvbiBkaWprc3RyYShzdGFydE5vZGVJbmRleCkge1xuICAgIGNvbnNvbGUubG9nKFwiU3RhcnRpbmcgZGlqa3N0cmFcIik7XG4gICAgbGV0IGRpc3RhbmNlcyA9IHt9O1xuICAgIGxldCBwcmV2aW91cyA9IHt9O1xuICAgIGNvbnN0IHZpc2l0ZWQgPSBuZXcgU2V0KCk7XG4gICAgbGV0IG5vZGVzID0gZ3JhcGgua2V5cygpO1xuICAgIGZvciAobGV0IG5vZGUgb2Ygbm9kZXMpIHtcbiAgICAgICAgZGlzdGFuY2VzW25vZGVdID0gSW5maW5pdHk7XG4gICAgICAgIHByZXZpb3VzW25vZGVdID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCBwcSA9IG5ldyBGYXN0UHJpb3JpdHlRdWV1ZSgoYSwgYikgPT4ge1xuICAgICAgICByZXR1cm4gYS5kaXN0YW5jZSA8IGIuZGlzdGFuY2U7XG4gICAgfSk7XG4gICAgcHEuYWRkKHsgZGlzdGFuY2U6IDAsIGlkeDogc3RhcnROb2RlSW5kZXggfSk7XG4gICAgZGlzdGFuY2VzW3N0YXJ0Tm9kZUluZGV4XSA9IDA7XG4gICAgY29uc29sZS50aW1lKFwiZGlqa3N0cmEgdGltZTpcIik7XG4gICAgY29uc3QgdXBkYXRlcyA9IFtdO1xuICAgIHdoaWxlICghcHEuaXNFbXB0eSgpKSB7XG4gICAgICAgIGNvbnN0IHUgPSBwcS5wb2xsKCkuaWR4O1xuICAgICAgICBpZiAoZGlzdGFuY2VzW3VdID09PSBJbmZpbml0eSlcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB2aXNpdGVkLmFkZCh1KTtcbiAgICAgICAgZm9yIChjb25zdCBbdl0gb2YgZ3JhcGguZ2V0KHUpKSB7XG4gICAgICAgICAgICB1cGRhdGVzLnB1c2godiwgdSk7XG4gICAgICAgICAgICBpZiAoIXZpc2l0ZWQuaGFzKHYpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdyA9IGdyYXBoLmdldCh1KS5nZXQodik7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3RGlzdGFuY2UgPSBkaXN0YW5jZXNbdV0gKyB3O1xuICAgICAgICAgICAgICAgIGlmIChkaXN0YW5jZXNbdl0gPiBuZXdEaXN0YW5jZSkge1xuICAgICAgICAgICAgICAgICAgICBkaXN0YW5jZXNbdl0gPSBuZXdEaXN0YW5jZTtcbiAgICAgICAgICAgICAgICAgICAgcHJldmlvdXNbdl0gPSB1O1xuICAgICAgICAgICAgICAgICAgICBwcS5hZGQoeyBkaXN0YW5jZTogZGlzdGFuY2VzW3ZdLCBpZHg6IHYgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh1cGRhdGVzLmxlbmd0aCA+PSAxMDApIHtcbiAgICAgICAgICAgIHNlbGYucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgICAgIGV2ZW50VHlwZTogXCJHUkFQSF9WSVNJVEVEX1VQREFURV9CVUxLXCIsXG4gICAgICAgICAgICAgICAgZXZlbnREYXRhOiB1cGRhdGVzLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB1cGRhdGVzLmxlbmd0aCA9IDA7XG4gICAgICAgIH1cbiAgICB9XG4gICAgc2VsZi5wb3N0TWVzc2FnZSh7XG4gICAgICAgIGV2ZW50VHlwZTogXCJHUkFQSF9WSVNJVEVEX1VQREFURV9CVUxLXCIsXG4gICAgICAgIGV2ZW50RGF0YTogdXBkYXRlcyxcbiAgICB9KTtcbiAgICB1cGRhdGVzLmxlbmd0aCA9IDA7XG4gICAgY29uc29sZS50aW1lRW5kKFwiZGlqa3N0cmEgdGltZTpcIik7XG4gICAgcmV0dXJuIHsgcHJldmlvdXMgfTtcbn1cbi8qKlxuICogUmVmOiBodHRwOi8vd3d3Lm1vdmFibGUtdHlwZS5jby51ay9zY3JpcHRzL2xhdGxvbmcuaHRtbFxuICogQHBhcmFtIGxvbjFcbiAqIEBwYXJhbSBsYXQxXG4gKiBAcGFyYW0gbG9uMlxuICogQHBhcmFtIGxhdDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhhdmVyc2luZShsb24xLCBsYXQxLCBsb24yLCBsYXQyKSB7XG4gICAgY29uc3QgUiA9IDYzNzFlMzsgLy8gbWV0cmVzXG4gICAgY29uc3Qgz4YxID0gbGF0MSAqIE1hdGguUEkgLyAxODA7IC8vIM+GLCDOuyBpbiByYWRpYW5zXG4gICAgY29uc3Qgz4YyID0gbGF0MiAqIE1hdGguUEkgLyAxODA7XG4gICAgY29uc3QgzpTPhiA9IChsYXQyIC0gbGF0MSkgKiBNYXRoLlBJIC8gMTgwO1xuICAgIGNvbnN0IM6UzrsgPSAobG9uMiAtIGxvbjEpICogTWF0aC5QSSAvIDE4MDtcbiAgICBjb25zdCBhID0gTWF0aC5zaW4ozpTPhiAvIDIpICogTWF0aC5zaW4ozpTPhiAvIDIpICtcbiAgICAgICAgTWF0aC5jb3Moz4YxKSAqIE1hdGguY29zKM+GMikgKlxuICAgICAgICAgICAgTWF0aC5zaW4ozpTOuyAvIDIpICogTWF0aC5zaW4ozpTOuyAvIDIpO1xuICAgIGNvbnN0IGMgPSAyICogTWF0aC5hdGFuMihNYXRoLnNxcnQoYSksIE1hdGguc3FydCgxIC0gYSkpO1xuICAgIGNvbnN0IGQgPSBSICogYzsgLy8gaW4gbWV0cmVzXG4gICAgcmV0dXJuIGQ7XG59XG5leHBvcnQgZnVuY3Rpb24gYnVpbGRHcmFwaCh3YXlzLCBub2Rlcywgbm9kZUlkSWR4TWFwKSB7XG4gICAgY29uc3QgZyA9IG5ldyBNYXAoKTtcbiAgICBsZXQgZWRnZXMgPSAwO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgd2F5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCB3YXkgPSB3YXlzW2ldO1xuICAgICAgICBsZXQgb25lV2F5ID0gZmFsc2U7XG4gICAgICAgIGlmICh3YXkudGFnc1tcIm9uZXdheVwiXSA9PT0gXCJ5ZXNcIiB8fCB3YXkudGFnc1tcImp1bmN0aW9uXCJdID09PSBcInJvdW5kYWJvdXRcIikge1xuICAgICAgICAgICAgb25lV2F5ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB3YXlOb2RlcyA9IHdheS5ub2RlX2lkcy5tYXAoaWQgPT4ge1xuICAgICAgICAgICAgY29uc3QgaWR4ID0gbm9kZUlkSWR4TWFwLmdldChpZCk7XG4gICAgICAgICAgICBpZiAoaWR4ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBpbmRleCBmb3Igbm9kZSBpZFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBub2Rlc1tpZHhdO1xuICAgICAgICB9KTtcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCB3YXlOb2Rlcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSB3YXlOb2Rlc1tqXTtcbiAgICAgICAgICAgIGNvbnN0IGVuZCA9IHdheU5vZGVzW2ogKyAxXTtcbiAgICAgICAgICAgIGlmIChzdGFydCAmJiBlbmQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGFydEluZGV4ID0gbm9kZUlkSWR4TWFwLmdldChzdGFydC5pZCk7XG4gICAgICAgICAgICAgICAgY29uc3QgZW5kSW5kZXggPSBub2RlSWRJZHhNYXAuZ2V0KGVuZC5pZCk7XG4gICAgICAgICAgICAgICAgaWYgKHN0YXJ0SW5kZXggPT09IHVuZGVmaW5lZCB8fCBlbmRJbmRleCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIGluZGV4IGZvciBub2RlIGlkc1wiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgZGlzdGFuY2UgPSBoYXZlcnNpbmUoc3RhcnQubG9uLCBzdGFydC5sYXQsIGVuZC5sb24sIGVuZC5sYXQpO1xuICAgICAgICAgICAgICAgIGlmIChnLmdldChzdGFydEluZGV4KSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGcuc2V0KHN0YXJ0SW5kZXgsIG5ldyBNYXAoKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChnLmdldChlbmRJbmRleCkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBnLnNldChlbmRJbmRleCwgbmV3IE1hcCgpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG9uZVdheSkge1xuICAgICAgICAgICAgICAgICAgICBlZGdlcysrO1xuICAgICAgICAgICAgICAgICAgICBnLmdldChzdGFydEluZGV4KS5zZXQoZW5kSW5kZXgsIGRpc3RhbmNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVkZ2VzICs9IDI7XG4gICAgICAgICAgICAgICAgICAgIGcuZ2V0KHN0YXJ0SW5kZXgpLnNldChlbmRJbmRleCwgZGlzdGFuY2UpO1xuICAgICAgICAgICAgICAgICAgICBnLmdldChlbmRJbmRleCkuc2V0KHN0YXJ0SW5kZXgsIGRpc3RhbmNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgY29uc29sZS5sb2coYEJ1aWx0IGdyYXBoLiBFZGdlcyBjb3VudDogJHtlZGdlc31gKTtcbiAgICBncmFwaCA9IGc7XG59XG4iLCJpbXBvcnQgeyBidWlsZEdyYXBoLCBkaWprc3RyYSwgZmluZFBhdGggfSBmcm9tIFwiLi9wYXRoZmluZGluZ1wiO1xuZnVuY3Rpb24gYWRkKGEsIGIpIHtcbiAgICByZXR1cm4gYSArIGI7XG59XG5leHBvcnQgbGV0IHdvcmtlckluc3RhbmNlID0ge1xuICAgIGFkZCxcbiAgICBidWlsZEdyYXBoLFxuICAgIGRpamtzdHJhLFxuICAgIGZpbmRQYXRoXG59O1xuc2VsZi5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBjb25zdCB7IGV2ZW50VHlwZSwgZXZlbnREYXRhLCBldmVudElkIH0gPSBldmVudC5kYXRhO1xuICAgIGlmIChldmVudFR5cGUgPT09ICdJTklUSUFMSVNFJykge1xuICAgICAgICBzZWxmLnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgIGV2ZW50VHlwZTogXCJJTklUSUFMSVNFRFwiLFxuICAgICAgICAgICAgZXZlbnREYXRhOiBPYmplY3Qua2V5cyh3b3JrZXJJbnN0YW5jZSlcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGV2ZW50VHlwZSA9PT0gJ0NBTEwnKSB7XG4gICAgICAgIGNvbnN0IG1ldGhvZCA9IHdvcmtlckluc3RhbmNlW2V2ZW50RGF0YS5tZXRob2RdO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBtZXRob2QuYXBwbHkobnVsbCwgZXZlbnREYXRhLmFyZ3VtZW50cyk7XG4gICAgICAgIHNlbGYucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgZXZlbnRUeXBlOiBcIlJFU1VMVFwiLFxuICAgICAgICAgICAgZXZlbnREYXRhOiByZXN1bHQsXG4gICAgICAgICAgICBldmVudElkOiBldmVudElkXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgVW5rbm93biBldmVudCB0eXBlICR7ZXZlbnRUeXBlfWApO1xuICAgIH1cbn0sIGZhbHNlKTtcbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///841\n')}},__webpack_exports__={};__webpack_modules__[841]()})();