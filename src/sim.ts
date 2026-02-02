import { RenderField, RenderFieldBuffer } from "./render";
import { CPU_CORES, SimulationData, SIGNAL_RUN, WORKER_POOL, ActivePixelBuffer, SwapBuffer, SIGNAL_READY, WORKER_COUNT, SIGNAL_DONE, InactivePixelBuffer, SIGNAL_PAUSE } from "./structs/global";

export const perfStats = {
    fps: 0, 
    frameMs: 0,
    renderMs: 0
};

let last_time : number = 0;
let emaFrameMs : number = 16.7; 
const FPS_EMA_ALPHA : number  = 0.1;

/**
 * Runs dt simulation ticks after workers synchronize.  
 * @param curr_time current time used for perf stats. 
 */
export function runSimulationMultithreaded(curr_time: number) : void { 
    PerfHandlerInit(curr_time);
    PerfHandlerRender(RequestSimulation);
}

/**
 * Simulation Controller. Posts Active Pixel Buffer, swap, then requests a render. 
 */
function RequestSimulation() : void {
    WORKER_POOL.forEach((worker : Worker) => { 
        worker.postMessage({type: 1, ActivePixelBuffer});
    }); 
    SwapBuffer();
    RenderFieldBuffer(InactivePixelBuffer); 
    requestAnimationFrame(runSimulationMultithreaded)
    // console.log("simulation requested!");
}

/**
 * Forces workers to synchronize before requesting a simulation/render frame.
 * @returns returns early if there are still workers busy.  
 */
let active_workers : number = WORKER_COUNT; 
let ready_workers : number = 0; 
export function MessageHandler(event: MessageEvent) : void {
    if (event.data?.id === SIGNAL_READY) {
        console.log(`worker ${event.data?.worker_id} out of ${WORKER_COUNT} ready`); 
        ready_workers++; 

        if (ready_workers === WORKER_COUNT){
            RequestSimulation()
        }

    } else if (event.data?.id === SIGNAL_DONE) {
        active_workers--; 
        if (active_workers > 0) return; 
        requestAnimationFrame(RequestSimulation);
        active_workers = WORKER_COUNT;
    }
    return;
}

/**
 * Handles pre-simulation performance calcs.  
 * @param curr_time 
 */
function PerfHandlerInit(curr_time: number) : void {
    if (last_time === 0) last_time = curr_time; 
    const frameMs : number = curr_time - last_time; 
    last_time = curr_time;
    emaFrameMs = emaFrameMs + FPS_EMA_ALPHA * (frameMs - emaFrameMs);
    
    perfStats.frameMs = frameMs; 
    perfStats.fps = 1000/emaFrameMs; 
}

/**
 * Generic render performance calculator;
 * @param fn function we're measuring runtime with.
 */
function PerfHandlerRender(fn : Function) : void {
    const renderStart : number = performance.now(); 
    fn(); 
    perfStats.renderMs = performance.now() - renderStart; 
}

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

    SimulationData[0] = dt;
    for (let i = 0 ; i < CPU_CORES; i++) {
        SimulationData[i] = SIGNAL_RUN
    }
    const renderStart : number = performance.now();
    RenderField(); 
    perfStats.renderMs = performance.now() - renderStart;
    requestAnimationFrame(runSimulation);
}