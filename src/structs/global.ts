export const WIDTH = window.innerWidth; 
export const HEIGHT = window.innerHeight;
export const CPU_CORES = navigator.hardwareConcurrency;

export const FIELDS : number = 7; // x, y, z, dx, dy, dz, mass; 
export const BYTES_PER_PARTICLE: number = 4 * FIELDS; // 4 bytes per float instance
export const PARTICLE_COUNT : number = 1_000_000;
export const chunkSize : number = Math.floor(PARTICLE_COUNT/CPU_CORES);

// contiguity = speed, instead of array<particle> we keep typearray<float>. 
export const rawParticleBuffer : SharedArrayBuffer = new SharedArrayBuffer(BYTES_PER_PARTICLE * PARTICLE_COUNT);
export const ParticleBuffer : Float32Array = new Float32Array(rawParticleBuffer);
export const ColorBuffer = new ImageData(window.innerWidth, window.innerHeight);
// simulation data, i.e., dt, mouse x, y, necessary for future stuff.
export const rawSharedViewSimData = new SharedArrayBuffer(4 + 4 + 4); // dt, mouse x, y
export const sharedViewSimdata = new Float32Array(rawSharedViewSimData);

// gravitational sources, x,y,mass
export const GRAVITY_FIELDS : number = 3; 
export const MAX_GFIELDS : number = 10
export const rawGravityBuffer : SharedArrayBuffer = new SharedArrayBuffer(4 * GRAVITY_FIELDS * MAX_GFIELDS)
export const GravityBuffer : Float32Array = new Float32Array(rawGravityBuffer);

export const rawSharedViewSignals : SharedArrayBuffer = new SharedArrayBuffer(CPU_CORES);
export const sharedViewSignals : Uint8Array = new Uint8Array(rawSharedViewSignals);
export const SIGNAL_RUN : number = 0;
export const SIGNAL_PAUSE : number = 1;
export const SIGNAL_READY : number = 2;
export const WORKER_POOL : Worker[] = [];

