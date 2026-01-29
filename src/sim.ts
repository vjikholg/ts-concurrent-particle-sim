/**
 * Simulation + Rendering controller. Runs on main thread.
 */
import { RenderFieldBuffer } from "./render"; // render command
import { sharedViewSimdata } from "./structs/global"; // hardware/signalling info
import { rawPixelBufferA, rawPixelBufferB } from "./structs/global"; // double buffering
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
let readBuffer : SharedArrayBuffer = rawPixelBufferA;
let writeBuffer : SharedArrayBuffer = rawPixelBufferB;

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

    const prevRead = readBuffer;
    readBuffer = writeBuffer;
    writeBuffer = prevRead;

    sharedViewSimdata[0] = dt;
    ResetWorker();
    // profiling starts
    const renderStart : number = performance.now();
    
    // post pixel buffer to render into for workers
    WORKER_POOL.forEach((worker: Worker) => {
        worker.postMessage({
            type: 2,
            rawPixelBufferActive: writeBuffer,
        });
    });
    
    // 1st iteration - reassign to an empty buffer
    // nth - reassign to n-1th buffer iteration  
    // ReassignBuffer()

    // render n-1 buffer 
    RenderFieldBuffer(new Uint8ClampedArray(readBuffer))
    perfStats.renderMs = performance.now() - renderStart;
    // profiling ends. 
}  
