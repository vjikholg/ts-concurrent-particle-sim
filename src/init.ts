import { chunkSize, CPU_CORES, FIELDS, PARTICLE_COUNT, ParticleBuffer, rawParticleBuffer, rawSharedViewSimData, rawSharedViewSignals, WORKER_POOL } from "./structs/global";

const canvas : HTMLElement = (document.getElementById("particle")!);
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
        buffer[i*FIELDS]   = Math.random() * HEIGHT // x 
        buffer[i*FIELDS+1] = Math.random() * WIDTH  // y
        buffer[i*FIELDS+2] = 0// z
        buffer[i*FIELDS+3] = (Math.random()*2 - 1) * 10 // dx
        buffer[i*FIELDS+4] = (Math.random()*2 - 1) * 10 // dy
        buffer[i*FIELDS+5] = 0 // dz unused for now but added just to see perf. 
    }
}

export function InitializeWorkers(pool : Worker[]) : void { 
    for (let i = 0; i < CPU_CORES; i++) {
        const worker = new Worker(new URL("../worker.js", import.meta.url));
        pool.push(worker);
        worker.postMessage({
            rawParticleBuffer,
            rawSharedViewSignals,
            id: i, 
            chunkSize, 
            chunkOffset: chunkSize * i, 
            FIELDS, 
            rawSharedViewSimData
        })
    }
}
