import { RenderField, RenderFieldBuffer } from "./render";
import { WIDTH, HEIGHT, CPU_CORES, SimulationData, SIGNAL_RUN, WORKER_POOL, SIGNAL_READY, WORKER_COUNT, SIGNAL_DONE, SIGNAL_PAUSE } from "./structs/global";

export const perfStats = {
    fps: 0, 
    frameMs: 0,
    renderMs: 0
};

// pixel buffers 
// workers are assigned a section of the large PixelBuffer, and writes into it
// Each section is then composited by the main thread to create one frame 
// we byte pack an 8 bit value into a 32 bit section of memory
// mathematically, we pad via +256 
const PixelBufferA : Uint32Array = new Uint32Array(new SharedArrayBuffer(WIDTH * HEIGHT * 4 * WORKER_COUNT));
const PixelBufferB : Uint32Array = new Uint32Array(new SharedArrayBuffer(WIDTH * HEIGHT * 4 * WORKER_COUNT));
console.log("pxbuffer.length A,B: ", PixelBufferA.length, PixelBufferB.length )

let ActivePixelBuffer = PixelBufferA;
let InactivePixelBuffer = PixelBufferB;


let last_time : number = 0;
let emaFrameMs : number = 16.7; 
const FPS_EMA_ALPHA : number  = 0.1;

/**
 * Runs dt simulation ticks after workers synchronize.  
 * @param curr_time current time used for perf stats. 
 */
export function runSimulationMultithreaded(curr_time: number) : void { 
    const dt : number = Math.min(1, (curr_time - last_time)/1000); 
    SimulationData[0] = dt;
    PerfHandlerInit(curr_time);
    PerfHandlerRender(RequestSimulation, curr_time);
}

/**
 * Simulation Controller. Posts Active Pixel Buffer, swap, then requests a render. 
 */
let pendingWorkers : number = 0;
let frameId = 0;
function RequestSimulation() : void {
    pendingWorkers = WORKER_COUNT; 
    WORKER_POOL.forEach((worker : Worker) => { 
        worker.postMessage({type: 1, ActivePixelBuffer});
    }); 
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
        ready_workers++
        if (ready_workers === WORKER_COUNT){
            requestAnimationFrame(runSimulationMultithreaded);
        }
        return
    } 
    
    if (event.data?.id === SIGNAL_DONE) { 
        // console.log(active_workers);
        if (--active_workers > 0) return; 
        ActivePixelBuffer = ActivePixelBuffer === PixelBufferA ? PixelBufferB : PixelBufferA
        InactivePixelBuffer = InactivePixelBuffer === PixelBufferA ? PixelBufferB : PixelBufferA
        RenderFieldBuffer(InactivePixelBuffer);
        requestAnimationFrame(runSimulationMultithreaded);
        active_workers = WORKER_COUNT;
    }
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
function PerfHandlerRender(fn: Function, curr_time? : number) : void {
    const renderStart : number = performance.now(); 
    curr_time ? fn(curr_time) : fn(); 
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