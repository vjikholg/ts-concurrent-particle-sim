// hardware
export const WIDTH = window.innerWidth; 
export const HEIGHT = window.innerHeight;
console.log(WIDTH, HEIGHT)
export const CPU_CORES = navigator.hardwareConcurrency;
export const WORKER_COUNT = CPU_CORES-1;

console.log(CPU_CORES);

// particle init stuff
export const FIELDS : number = 7; // x, y, z, dx, dy, dz, mass; 
export const BYTES_PER_PARTICLE: number = 4 * FIELDS; // 4 bytes per float instance
export const PARTICLE_COUNT : number = 1_000_000;
export const WORKER_CHUNK_SIZE : number = Math.floor(PARTICLE_COUNT/CPU_CORES);

// contiguity = speed, instead of array<particle> we keep typearray<float>. 
export const rawParticleBuffer : SharedArrayBuffer = new SharedArrayBuffer(BYTES_PER_PARTICLE * PARTICLE_COUNT);
export const ParticleBuffer : Float32Array = new Float32Array(rawParticleBuffer);
export const ColorBuffer = new ImageData(WIDTH, HEIGHT);
console.log(ColorBuffer.data.length);

// simulation data, i.e., dt, mouse x, y, necessary for future stuff.
export const rawSharedViewSimData = new SharedArrayBuffer(4 * 6); // dt, mx, my, isTouch, width, height
export const SimulationData = new Float32Array(rawSharedViewSimData);
// render data - multithreading render as well

// gravitational sources, x,y,z,dx,dy,dz,mass
export let source_count : number = 0;
export const GRAVITY_FIELDS : number = 7; 
export const MAX_GFIELDS : number = 10
export const rawGravityBuffer : SharedArrayBuffer = new SharedArrayBuffer(4 * GRAVITY_FIELDS * MAX_GFIELDS)
export const GravityBuffer : Float32Array = new Float32Array(rawGravityBuffer);

export function InitGravitySource(x: number, y: number, dx: number, dy: number, m: number) {
    if (source_count < MAX_GFIELDS) {
        GravityBuffer[source_count*GRAVITY_FIELDS] = x;
        GravityBuffer[source_count*GRAVITY_FIELDS+1] = y;
        GravityBuffer[source_count*GRAVITY_FIELDS+3] = dx;
        GravityBuffer[source_count*GRAVITY_FIELDS+4] = dy; 
        GravityBuffer[source_count*GRAVITY_FIELDS+6] = m;
        source_count++;
    }
}

// misc info
export const rawSharedViewSignals : SharedArrayBuffer = new SharedArrayBuffer(CPU_CORES);
export const ViewSignals : Uint8Array = new Uint8Array(rawSharedViewSignals);

export const SIGNAL_RUN : number = 0;
export const SIGNAL_PAUSE : number = 1;
export const SIGNAL_READY : number = 2;
export const SIGNAL_DONE : number = 3; 
export const WORKER_POOL : Worker[] = [];


/**
 * Swaps active pixel buffers for workers to render to.
 */
// export function SwapBuffer() : void {
//     ActivePixelBuffer = (ActivePixelBuffer === PixelBufferA) ? PixelBufferB : PixelBufferA; 
//     InactivePixelBuffer = (ActivePixelBuffer === PixelBufferB) ? PixelBufferA : PixelBufferB; 
// 
//     // console.log(ActivePixelBuffer); 
//     // console.log(InactivePixelBuffer);
//     // console.log(ParticleBuffer);
// 
// }
