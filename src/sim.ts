import { GravitationalAcceleration } from "./physics/AccelerationSources";
import { RenderField, RenderFieldBuffer } from "./render";
import { WIDTH, HEIGHT, CPU_CORES, SimulationData, SIGNAL_RUN, WORKER_POOL, SIGNAL_READY, WORKER_COUNT, SIGNAL_DONE, SIGNAL_PAUSE, GravityBuffer, source_count, GRAVITY_FIELDS } from "./structs/global";

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
const PixelBufferA : Uint32Array = new Uint32Array(new SharedArrayBuffer(WIDTH * HEIGHT * 4));
const PixelBufferB : Uint32Array = new Uint32Array(new SharedArrayBuffer(WIDTH * HEIGHT * 4));
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
    UpdateGravity(dt);
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

function UpdateGravity(dt: number) : void {
    const ax : number[] = new Array(source_count).fill(0);
    const ay : number[] = new Array(source_count).fill(0);

    for (let i = 0; i < source_count; i++) {
        const base = i * GRAVITY_FIELDS; 
        const x : number = GravityBuffer[base]!;
        const y : number = GravityBuffer[base+1]!;
    
        for (let j = 0; j < source_count; j++) {
            if (i === j) continue; 
            const base_j : number = j * GRAVITY_FIELDS;
            const xs : number = GravityBuffer[base_j]!;
            const ys : number = GravityBuffer[base_j + 1]!;
            const m : number = GravityBuffer[base_j + 6]!;
            const [aX, aY] : number[] = GravitationalAcceleration(m,xs,ys,x,y);
            
            ax[i]! += aX!; 
            ay[i]! += aY!;
        }

        const [edge_x, edge_y] : number[] = edgeForce(x,y); 
        ax[i]! += edge_x! * dt;
        ax[i+1]! += edge_y! * dt;
    }

    for (let i = 0; i < source_count; i++) { 
        const base = i * GRAVITY_FIELDS; 
        GravityBuffer[base + 3]! += ax[i]! * dt;
        GravityBuffer[base + 4]! += ay[i]! * dt; 
        
        GravityBuffer[base]! += GravityBuffer[base+3]!*dt
        GravityBuffer[base+1]! += GravityBuffer[base+4]!*dt
    } 
}

function distance(x1: number, y1: number, x2: number, y2: number) {
    return Math.sqrt((x2 - x1)*(x2 - x1) + (y2 - y1)*(y2-y1)); 
}

function edgeForce(x: number, y: number, alpha: number = 0.0001, eps : number = 0.01, delta : number = 0.01, k : number = 5) : number[] {

    const d_abs : number = Math.min(x, WIDTH - x, y, HEIGHT-y);

    if (d_abs > 100) return [0,0]
    const d_x : number = x/d_abs; 
    const d_y : number = y/d_abs;
    
    const g_edge : number = 1/(d_abs + eps)**alpha; 
    
    const v_x : number = k * g_edge * d_x * 5;
    const v_y : number = k * g_edge * d_y * 5;

    console.log(d_abs, d_x, d_y, g_edge, v_x, v_y);
    return [v_x, v_y]


    // const ax : number = x - WIDTH/2;
    // const ay : number = y - HEIGHT/2; 

    // const mag : number = Math.hypot(x,y) + delta
    // const ax_hat : number = ax/mag;
    // const ay_hat : number = ay/mag;

    // const d1 : number = distance(x,y,0,0);
    // const d2 : number = distance(x,y,WIDTH,0);
    // const d3 : number = distance(x,y,0,HEIGHT);
    // const d4 : number = distance(x,y,WIDTH,HEIGHT);
    // const gp : number = 1/((d1+eps)**alpha) + 1/((d2+eps)**alpha) + 1/((d3+eps)**alpha) + 1/((d4+eps)**alpha);
    // console.log(d1,d2,d3,d4,[gp * ax_hat* 10, gp * ay_hat* 10]);
    // return [gp * ax_hat * 10, gp * ay_hat * 10];
}