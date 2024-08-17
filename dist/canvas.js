import { state } from "./state.js";
export function initCanvas() {
    const canvas = document.getElementById("canvas");
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    state.canvas = canvas;
}
//# sourceMappingURL=canvas.js.map