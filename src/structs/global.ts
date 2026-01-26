export const WIDTH = window.innerWidth; 
export const HEIGHT = window.innerHeight;
export const CPU_CORES = navigator.hardwareConcurrency;

export const FIELDS : number = 7; // x, y, z, dx, dy, dz, mass; 
export const BYTES_PER_PARTICLE: number = 4 * FIELDS; // 4 bytes per float instance
export const PARTICLE_COUNT : number =500_000;
export const chunkSize : number = Math.floor(PARTICLE_COUNT/CPU_CORES);

// contiguity = speed, instead of array<particle> we keep typearray<float>. 
export const rawParticleBuffer : SharedArrayBuffer = new SharedArrayBuffer(BYTES_PER_PARTICLE * PARTICLE_COUNT);
export const ParticleBuffer : Float32Array = new Float32Array(rawParticleBuffer);
export const ColorBuffer = new ImageData(window.innerWidth, window.innerHeight);
// simulation data, i.e., dt, mouse x, y, necessary for future stuff.
export const rawSharedViewSimData = new SharedArrayBuffer(4 * 6); // dt, mx, my, isTouch, width, height
export const sharedViewSimdata = new Float32Array(rawSharedViewSimData);
// render data - multithreading render as well
export let PIXEL_FIELDS : number = 4;
export let rawPixelBuffer : SharedArrayBuffer = new SharedArrayBuffer(CPU_CORES * window.innerWidth * window.innerHeight * PIXEL_FIELDS); // rgba
export let PixelBuffer : Int8Array = new Int8Array(rawPixelBuffer);

// gravitational sources, x,y,z,dx,dy,dz,mass
export const GRAVITY_FIELDS : number = 7; 
export const MAX_GFIELDS : number = 10
export const rawGravityBuffer : SharedArrayBuffer = new SharedArrayBuffer(4 * GRAVITY_FIELDS * MAX_GFIELDS)
export const GravityBuffer : Float32Array = new Float32Array(rawGravityBuffer);

// misc info
export const rawSharedViewSignals : SharedArrayBuffer = new SharedArrayBuffer(CPU_CORES);
export const sharedViewSignals : Uint8Array = new Uint8Array(rawSharedViewSignals);



export const SIGNAL_RUN : number = 0;
export const SIGNAL_PAUSE : number = 1;
export const SIGNAL_READY : number = 2;
export const WORKER_POOL : Worker[] = [];

