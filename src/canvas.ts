import { state } from "./state.js";

export function initCanvas() {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    state.canvas = canvas;
}