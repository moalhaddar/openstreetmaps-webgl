import { state } from "./state.js";

export function worker(): Promise<Record<any, any>> {
    const proxy: Record<any, any> = {};
 
    let id = 0;
    let idPromises: Record<any, any> = {};

    return new Promise((resolve, reject) => {
        const worker = new Worker('/dist/graph-worker.js', {type: 'module'});
        worker.postMessage({
            eventType: "INITIALISE" 
        });

        worker.addEventListener('message', function(event) {
 
            const { eventType, eventData, eventId } = event.data;
 
            if (eventType === "INITIALISED") {
                const methods = event.data.eventData;
                methods.forEach((method: any) => {
                    proxy[method] = function() {
                        return new Promise((resolve, reject) => {
                            worker.postMessage({
                                eventType: "CALL",
                                eventData: {
                                    method: method,
                                    arguments: Array.from(arguments) // arguments is not an array
                                },
                                eventId: id
                            });
 
                            idPromises[id] = { resolve, reject };
                            id++
                        });
                    }
                });
                resolve(proxy);
                return;
            } else if (eventType === "RESULT") {
                if (eventId !== undefined && idPromises[eventId]) {
                    idPromises[eventId].resolve(eventData);
                    delete idPromises[eventId];
                }
            } else if (eventType === "ERROR") {
                if (eventId !== undefined && idPromises[eventId]) {
                    idPromises[eventId].reject(event.data.eventData);
                    delete idPromises[eventId];
                }
            } else if (eventType === 'GRAPH_VISITED_UPDATE') {
                // eventData: {
                //     neighbor,
                //     newDistance,
                //     closestNodeIndex
                // },
                state.visited.add(eventData.nodeIdx);
                // console.log(state.visited.size);
                // if (state.endNode) {
                //     // const path = findPath(eventData.previous, state.endNode, state.nodeIdIdxMap)
                // }
            }
             
        });
 
        worker.addEventListener("error", function(error) {
            reject(error);
        });
    })
}