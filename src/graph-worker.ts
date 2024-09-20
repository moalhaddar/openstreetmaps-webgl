import { buildGraph, dijkstra, findPath } from "./pathfinding";


export type WorkerInstance = typeof workerInstance;

type MethodArguments<T> = {
    [K in keyof T]: T[K] extends (...args: infer A) => any ? A : never;
};

type MethodReturnTypes<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => infer R ? R : never;
};

type WorkerEvent<T extends WorkerInstance> = {
    eventId: number;
    eventType: 'INITIALISE' | 'CALL' | 'RESULT';
    eventData: {
        method: keyof T;
        arguments: MethodArguments<T>[keyof T];
    };
};

function add(a: number, b: number) {
    return a + b;
}


export let workerInstance = {
    add,
    buildGraph,
    dijkstra,
    findPath
}

self.addEventListener("message", function (event) {
    const { eventType, eventData, eventId } = event.data as WorkerEvent<WorkerInstance>;
    if (eventType === 'INITIALISE') {
            self.postMessage({
                eventType: "INITIALISED",
                eventData: Object.keys(workerInstance)
            });
    } else if (eventType === 'CALL') {
            const method = workerInstance[eventData.method];
            const result = method.apply<null, any[], any>(null, eventData.arguments);
            self.postMessage({
                eventType: "RESULT",
                eventData: result,
                eventId: eventId
            } satisfies WorkerEvent<WorkerInstance>);
    } else {
        console.error(`Unknown event type ${eventType}`);
    }

}, false);