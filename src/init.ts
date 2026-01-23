import { chunkSize, CPU_CORES, FIELDS, PARTICLE_COUNT, 
    ParticleBuffer, rawParticleBuffer, rawSharedViewSimData, 
    rawSharedViewSignals, WORKER_POOL, rawGravityBuffer, GravityBuffer } from "./structs/global";

const canvas : HTMLCanvasElement = (document.getElementById("canvas")!) as HTMLCanvasElement;
const WIDTH : number = window.innerWidth; 
const HEIGHT : number = window.innerHeight;
let colorbuffer : ImageData = new ImageData(window.innerWidth, window.innerHeight)

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
        buffer[i*FIELDS+3] = (Math.random()*2 - 1) * 0 // dx
        buffer[i*FIELDS+4] = (Math.random()*2 - 1) * 0 // dy
        buffer[i*FIELDS+5] = 0 // dz unused for now but added just to see perf. 
        buffer[i*FIELDS+6] = (Math.random()*999 + 1)
    }
}

export function InitializeWorkers(pool : Worker[]) : void { 
    for (let i = 0; i < CPU_CORES; i++) {
        const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: 'module' });
        pool.push(worker);
        worker.postMessage({
            rawParticleBuffer,
            rawSharedViewSignals,
            id: i, 
            chunkSize, 
            chunkOffset: chunkSize * i, 
            FIELDS, 
            rawSharedViewSimData,
            rawGravityBuffer
        })
    }
}

export function InitializeTestGravity() : void {
    GravityBuffer[0] = WIDTH/2 - 200; 
    GravityBuffer[1] = HEIGHT/2; 
    GravityBuffer[2] = 1000;
    console.log(GravityBuffer);
    GravityBuffer[3] = WIDTH/2 + 200; 
    GravityBuffer[4] = HEIGHT/2; 
    GravityBuffer[5] = 1000;
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
