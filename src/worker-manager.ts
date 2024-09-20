import { WorkerInstance } from "./graph-worker";

type PromiseWrapped<T> = {
    [K in keyof T]: T[K] extends (...args: infer A) => infer R
      ? (...args: A) => Promise<R>
      : never;
  };

type AsyncWorkerInstance = PromiseWrapped<WorkerInstance>;

export function worker(cb: (data: any) => void): Promise<AsyncWorkerInstance> {
    const proxy: Partial<AsyncWorkerInstance> = {};
 
    let id = 0;
    let idPromises: Record<any, any> = {};

    return new Promise((resolve, reject) => {
        const worker = new Worker('/graph-worker.js', {type: 'module'});
        worker.postMessage({
            eventType: "INITIALISE" 
        });

        worker.addEventListener('message', function(event) {
 
            const { eventType, eventData, eventId } = event.data;
 
            if (eventType === "INITIALISED") {
                const methods = event.data.eventData;
                methods.forEach((method: any) => {
                    // @ts-ignore
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
                // @ts-ignore
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
            } else {
                cb(event.data);
            }
            // } else if (eventType === 'GRAPH_VISITED_UPDATE') {
            //     state.visited.push(eventData.parentNode,eventData.node);
            // } else if (eventType === 'GRAPH_VISITED_UPDATE_BULK') {
            //     for (let i = 0; i < eventData.length; i++) {
            //         state.visited.push(eventData[i]);
            //     }
            // }
        });
 
        worker.addEventListener("error", function(error) {
            reject(error);
        });
    })
}