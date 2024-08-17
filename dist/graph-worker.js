import { buildGraph, dijkstra, findPath } from "./pathfinding.js";
function add(a, b) {
    return a + b;
}
export let workerInstance = {
    add,
    buildGraph,
    dijkstra,
    findPath
};
self.addEventListener("message", function (event) {
    const { eventType, eventData, eventId } = event.data;
    if (eventType === 'INITIALISE') {
        self.postMessage({
            eventType: "INITIALISED",
            eventData: Object.keys(workerInstance)
        });
    }
    else if (eventType === 'CALL') {
        const method = workerInstance[eventData.method];
        const result = method.apply(null, eventData.arguments);
        self.postMessage({
            eventType: "RESULT",
            eventData: result,
            eventId: eventId
        });
    }
    else {
        console.error(`Unknown event type ${eventType}`);
    }
}, false);
//# sourceMappingURL=graph-worker.js.map