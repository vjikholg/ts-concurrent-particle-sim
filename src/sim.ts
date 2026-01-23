import { RenderField } from "./render";
import { CPU_CORES, sharedViewSignals, sharedViewSimdata, SIGNAL_RUN } from "./structs/global";

export const perfStats = {
    fps: 0, 
    frameMs: 0,
    renderMs: 0
};
let last_time : number = 0;
let emaFrameMs : number = 16.7; 
const FPS_EMA_ALPHA : number  = 0.1;
/**
 * dt = delta time, calculate to handle variable frame rate. 
 * @param curr_time 
 */
export function runSimulation(curr_time: number) : void { 
    if (last_time === 0) last_time = curr_time;
    const dt : number = Math.min(1, (curr_time - last_time)/1000); 
    const frameMs = curr_time - last_time;
    last_time = curr_time;

    emaFrameMs = emaFrameMs + FPS_EMA_ALPHA * (frameMs - emaFrameMs);

    perfStats.frameMs = frameMs; 
    perfStats.fps = 1000 / emaFrameMs; 

    sharedViewSimdata[0] = dt;
    for (let i = 0 ; i < CPU_CORES; i++) {
        sharedViewSignals[i] = SIGNAL_RUN
    }
    const renderStart : number = performance.now();
    RenderField(); 
    perfStats.renderMs = performance.now() - renderStart;
    requestAnimationFrame(runSimulation);
}   
