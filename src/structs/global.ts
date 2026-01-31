// hardware
export const WIDTH = window.innerWidth; 
export const HEIGHT = window.innerHeight;
export const CPU_CORES = navigator.hardwareConcurrency;
export const WORKER_COUNT = CPU_CORES-2;

// particle init stuff
export const FIELDS : number = 7; // x, y, z, dx, dy, dz, mass; 
export const BYTES_PER_PARTICLE: number = 4 * FIELDS; // 4 bytes per float instance
export const PARTICLE_COUNT : number = 1_000_000;
export const WORKER_CHUNK_SIZE : number = Math.floor(PARTICLE_COUNT/CPU_CORES);

// contiguity = speed, instead of array<particle> we keep typearray<float>. 
export const rawParticleBuffer : SharedArrayBuffer = new SharedArrayBuffer(BYTES_PER_PARTICLE * PARTICLE_COUNT);
export const ParticleBuffer : Float32Array = new Float32Array(rawParticleBuffer);
export const ColorBuffer = new ImageData(window.innerWidth, window.innerHeight);

// simulation data, i.e., dt, mouse x, y, necessary for future stuff.
export const rawSharedViewSimData = new SharedArrayBuffer(4 * 6); // dt, mx, my, isTouch, width, height
export const SimulationData = new Float32Array(rawSharedViewSimData);
// render data - multithreading render as well

// gravitational sources, x,y,z,dx,dy,dz,mass
export const GRAVITY_FIELDS : number = 7; 
export const MAX_GFIELDS : number = 10
export const rawGravityBuffer : SharedArrayBuffer = new SharedArrayBuffer(4 * GRAVITY_FIELDS * MAX_GFIELDS)
export const GravityBuffer : Float32Array = new Float32Array(rawGravityBuffer);

// misc info
export const rawSharedViewSignals : SharedArrayBuffer = new SharedArrayBuffer(CPU_CORES);
export const ViewSignals : Uint8Array = new Uint8Array(rawSharedViewSignals);

export const SIGNAL_RUN : number = 0;
export const SIGNAL_PAUSE : number = 1;
export const SIGNAL_READY : number = 2;
export const SIGNAL_DONE : number = 3; 
export const WORKER_POOL : Worker[] = [];

// pixel buffers 
// workers are assigned a section of the large PixelBuffer, and writes into it
// Each section is then composited by the main thread to create one frame 
// since we're using RGB, we need size: width * height * fields (which is 3) * # of workers 
export let PIXEL_FIELDS : number = 3; // rgb 
export let PixelBufferA : Uint32Array = new Uint32Array(new SharedArrayBuffer(WIDTH * HEIGHT * 4 * WORKER_COUNT));
export let PixelBufferB : Uint32Array = new Uint32Array(new SharedArrayBuffer(WIDTH * HEIGHT * 4 * WORKER_COUNT));

export let ActivePixelBuffer = PixelBufferA;
export let InactivePixelBuffer = PixelBufferB;
/**
 * Swaps active pixel buffers for workers to render to.
 */
export function SwapBuffer() : void {
    ActivePixelBuffer = (ActivePixelBuffer === PixelBufferA) ? PixelBufferB : PixelBufferA; 
    InactivePixelBuffer = (ActivePixelBuffer === PixelBufferB) ? PixelBufferA : PixelBufferB; 

    // console.log(ActivePixelBuffer); 
    // console.log(InactivePixelBuffer);
    // console.log(ParticleBuffer);

}
