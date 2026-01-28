/**
 * Simulation + Rendering controller. Runs on main thread.
 */
import { RenderField, RenderFieldBuffer } from "./render"; // render command
import { CPU_CORES, ReassignBuffer, sharedViewSimdata, SIGNAL_RUN } from "./structs/global"; // hardware/signalling info
import { rawPixelBufferA, rawPixelBufferB, rawPixelBufferActive } from "./structs/global"; // double buffering
import { WORKER_POOL } from "./structs/global"; // worker pool 
import { ResetWorker } from "./init";

export const perfStats = {
    fps: 0, 
    frameMs: 0,
    renderMs: 0
};
let last_time : number = 0;
let emaFrameMs : number = 16.7; 
const FPS_EMA_ALPHA : number  = 0.1;

/**
 * runs dt-ticks of the simulations.
 * dt = delta time, calculate to handle variable frame rate. 
 * @param curr_time 
 */
export function runSimulation(curr_time: number) : void { 
    // perf stuff setup 
    if (last_time === 0) last_time = curr_time;
    const dt : number = Math.min(1, (curr_time - last_time)/1000); 
    const frameMs = curr_time - last_time;
    last_time = curr_time;
    emaFrameMs = emaFrameMs + FPS_EMA_ALPHA * (frameMs - emaFrameMs);
    perfStats.frameMs = frameMs; 
    perfStats.fps = 1000 / emaFrameMs; 
    // end perf stuff setup

    sharedViewSimdata[0] = dt;
    ResetWorker();
    // profiling starts
    const renderStart : number = performance.now();
    
    WORKER_POOL.forEach((worker: Worker, i: number) => {
        worker.postMessage({
            rawPixelBufferActive
        })
    })
    
    ReassignBuffer()
    RenderFieldBuffer(new Uint8ClampedArray(rawPixelBufferActive))
    perfStats.renderMs = performance.now() - renderStart;
    // profiling ends. 
}  
