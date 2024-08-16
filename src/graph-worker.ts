import { WorkerEvent } from "./types";

function add(a: number, b: number) {
    return a + b;
}

export let workerInstance = {
    add
}

self.addEventListener("message", function (event) {
    const { eventType, eventData, eventId } = event.data as WorkerEvent;
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
            } satisfies WorkerEvent);
    } else {
        console.error(`Unknown event type ${eventType}`);
    }

}, false);