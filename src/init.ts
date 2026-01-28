import { runSimulation } from "./sim";
import { WORKER_CHUNK_SIZE, CPU_CORES, FIELDS, PARTICLE_COUNT, 
    ParticleBuffer, rawParticleBuffer, rawSharedViewSimData, 
    rawSharedViewSignals, WORKER_POOL, rawGravityBuffer, GravityBuffer,
    rawPixelBufferA, rawPixelBufferB, PixelBufferA, PixelBufferB, rawPixelBufferActive, 
    WORKER_COUNT} from "./structs/global";

// hardware info
const canvas : HTMLCanvasElement = (document.getElementById("canvas")!) as HTMLCanvasElement;
const WIDTH : number = window.innerWidth; 
const HEIGHT : number = window.innerHeight;

// shared info between init, sim, and render.
let ACTIVE_WORKERS : number = 0; // needed in sim.ts

/**
 * Resets number of workers that are still working to WORKER_COUNT
 */
export function ResetWorker() {
    ACTIVE_WORKERS = WORKER_COUNT;
}

let colorbuffer : ImageData = new ImageData(window.innerWidth, window.innerHeight);

/**
 * buffer[0] - buffer[6] contain info in following order: (x,y,z,dx,dy,dz)
 * performant not bad, goal is to access 6 at a time. 
 * @param buffer 
 */ 
export function InitializeParticleField(buffer: Float32Array) : void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        // here we'll want to assign these into something, i.e., initial conditions basically
        // for our simulation we can do a LOT of things. between visualizing generic vector fields to electric/gravitational fields
        // strong, weak force (could be weird but could be interesting!)   
        buffer[i*FIELDS]   = Math.random() * WIDTH // x 
        buffer[i*FIELDS+1] = Math.random() * HEIGHT  // y
        buffer[i*FIELDS+2] = 0// z
        buffer[i*FIELDS+3] = (Math.random()*2 - 1) * 10 // dx
        buffer[i*FIELDS+4] = (Math.random()*2 - 1) * 10 // dy
        buffer[i*FIELDS+5] = 0 // dz unused for now but added just to see perf. 
        buffer[i*FIELDS+6] = (Math.random()*999 + 1)
    }
}

/**
 * populates a given pool of workers based on given parameters 
 * @param pool  pool it's populating
 * @param count number of workers to init
 */
export function InitializeWorkers(pool : Worker[], count: number) : void { 
    ACTIVE_WORKERS = count;
    for (let i = 0; i < count; i++) {
        const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: 'module' });
        worker.addEventListener('message', onWorkerMessage)
        pool.push(worker);
        worker.postMessage({
            id: i,                                                                   // worker ID
            rawParticleBuffer,                                                       // particle info
            rawSharedViewSimData,                                                    // dt, width, height, mouse (x,y), relevent sim information
            rawGravityBuffer,                                                        // (x,y,z,mass) for gravitational sources
            particleWorkingPositionStart: WORKER_CHUNK_SIZE,                         // size of chunk assigned to worker, section of SharedArrayBuffer its working in
            particleWorkingPositionEnd: WORKER_CHUNK_SIZE*i + WORKER_CHUNK_SIZE,     // starting pos'n of the SAB its working in
            FIELDS,                                                                  // # of fields/particle which it occupies, aka "strides";
        });
    }
}

/**
 * worker message helper, ensure all workers complete before running animation frame. 
 * @returns 
 */
function onWorkerMessage() : void {
    ACTIVE_WORKERS--;
    if (ACTIVE_WORKERS !== 0) return; 
    requestAnimationFrame(runSimulation); 
}

export function InitializeTestGravity() : void {
    GravityBuffer[0] = WIDTH/2 - 200; 
    GravityBuffer[1] = HEIGHT/2; 
    GravityBuffer[6] = 1000;
    console.log(GravityBuffer);
    GravityBuffer[7] = WIDTH/2 + 200; 
    GravityBuffer[8] = HEIGHT/2; 
    GravityBuffer[13] = 1000;
}

export function AddResizeListener(window: Window) : void {
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth; 
        canvas.height = window.innerHeight;
        colorbuffer = new ImageData(canvas.width, canvas.height);
    })
}

export function AddMouseListener(window: Window, fn?: Function) : void {
    window.addEventListener('click', (e: PointerEvent) => {
        console.log(`event fired: with params ${e.clientX}, ${e.clientY}`)
        fn ? fn(e.clientX, e.clientY) : null;
    })
}
