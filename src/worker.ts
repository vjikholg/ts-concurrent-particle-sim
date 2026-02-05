// import { GravitationalAcceleration } from "./physics/AccelerationSources";
console.log("worker created");

let PrevEvent : MessageEvent; 
let first : boolean = true; 
let first_temp : boolean = true;
let frames : number = 0;

const GRAVITY_FIELDS = 7;
const SIGNAL_RUN : number = 0;
const SIGNAL_PAUSE : number = 1;
const SIGNAL_READY : number = 2;
const SIGNAL_DONE : number = 3; 
const GRAVITATIONAL_CONSTANT : number = 6.67430; 
const eps : number =  0.001; // prevents acceleration from exploding

function GravitationalAcceleration(x: number, y: number, GravityBuffer: Float32Array) : number[] { 
    let ax : number = 0;
    let ay : number = 0; 
    for (let i = 0 ; i + GRAVITY_FIELDS - 1 < GravityBuffer.length ; i += GRAVITY_FIELDS) {
        const gx = GravityBuffer[i] ?? 0;
        const gy = GravityBuffer[i + 1] ?? 0;
        const gz = GravityBuffer[i + 2] ?? 0;
        const mass = GravityBuffer[i + 6] ?? 0;

        if (!Number.isFinite(gx) || !Number.isFinite(gy) || !Number.isFinite(mass) || mass === 0) {
            continue;
        }

        const dx = gx - x;
        const dy = gy - y;
        const r2 = Math.max(dx * dx + dy * dy, eps);
        if (!Number.isFinite(r2) || r2 === 0) continue;

        const mu = (GRAVITATIONAL_CONSTANT * mass) / r2;
        const invR = 1 / Math.sqrt(r2);
        ax += mu * dx * invR;
        ay += mu * dy * invR;
    }
    return [ax,ay];
}

// cached local information for setup. 
let ParticleView : Float32Array;
let SimDataView : Float32Array;
let GravityView : Float32Array;    
let worker_id : number; 
let fields : number;
let start : number; 
let end : number;
let inputs : number[]; 

/**
 * handles messages from main thread
 */
onmessage = (event : MessageEvent) : void => {
    if (event.data?.type === 1) {
        if (!first) {
            simulate(PrevEvent.data.ActivePixelBuffer);
        } else {
            first = false;
        } 
        PrevEvent = event
        postMessage({id: SIGNAL_DONE, worker_id: worker_id});
    } else if (event.data?.id >= 0) {
        setup(event);
        postMessage({id: SIGNAL_READY, worker_id: worker_id});
    }
    return;
} 

// caches initial array write locations 
const setup = (event : MessageEvent) => {
    const {
        id,
        ParticleBuffer,
        SimulationData,
        GravityBuffer,
        ParticleOffsetStart,
        ParticleOffsetEnd,
        FIELDS
    } = event.data

    ParticleView = ParticleBuffer;
    SimDataView = SimulationData
    GravityView = GravityBuffer
    worker_id = id;
    start = ParticleOffsetStart;
    end = ParticleOffsetEnd;
    fields = FIELDS;

    inputs = [
        SimDataView[1]!, // mx
        SimDataView[2]!, // my
        SimDataView[3]!, // isTouch
        SimDataView[4]!, // WIDTH
        SimDataView[5]!  // HEIGHT
    ]
}


/**
 * Advances a simulation by dt ticks, and renders a composite
 * Composites from each worker is combined in the main thread. 
 * See global.ts ActivePixelBuffer for more details. 
 * @param ActivePixelBuffer 
 */
const simulate = (ActivePixelBuffer : Uint32Array) : void => {
    // wipe existing composite position
    const width : number = inputs[3] ?? 1920
    const height : number = inputs[4] ?? 1080

    // update particle information 
    const dt : number = SimDataView[0]!;
    for (let i = start; i < end; i++) {
        let x : number = ParticleView[i*fields]!
        let y : number = ParticleView[i*fields+1]!
        let dx : number = ParticleView[i*fields+3]!
        let dy : number = ParticleView[i*fields+4]!

        ParticleView[i*fields]! = x + dx * dt; 
        ParticleView[i*fields+1]! = y + dy * dt;
    
        if (GravityView.length > 0) {
            const accel : number[] = GravitationalAcceleration(ParticleView[i*fields]!, ParticleView[i*fields + 1]!, GravityView)  
            ParticleView[i*fields+3]! += accel[0]!; 
            ParticleView[i*fields+4]! += accel[1]!; 
        }
        
        if (x < 0 || x >= width) continue;
        if (y < 0 || y >= height) continue;

        const pxIdx : number = (x | 0) + (y | 0) * width;  
        ActivePixelBuffer[pxIdx]!++; 

        // if (first_temp) {
        //     console.log("width, height", width, height)
        //     console.log("x,y,dx,dy",x,y,dx,dy)
        //     console.log(`
        //         offset + pxIdx: ${PixelsOffset + pxIdx}
        //         PixelsOffset: ${PixelsOffset},
        //         pxIdx: ${pxIdx}, 
        //         worker_id: ${worker_id}, 
        //         CanvasPixels: ${CanvasPixels}
        //         `)
        //     console.log("pixelbuff:",  ActivePixelBuffer[PixelsOffset + pxIdx])
        //     console.log("rgb: ",r,g,b);
        //     console.log("rgb_new:", r_new >> 16, g_new >> 8, b_new, r_new|g_new|b_new);
        //     console.log(ActivePixelBuffer.length)
        //     console.log(ActivePixelBuffer);
        //     if (frames > 10) first_temp = false;
        // }
        // frames++
    }   
}

/**
 * translates velocity of the particle to heat. it'll be interesting to see "heat" bleeding off per frame somehow actually. 
 * @param dx 
 * @param dy 
 * @param dz 
 */
function colorFromVelocity(dx: number, dy: number, dz?: number) : number { 
    const velocity : number = Math.sqrt(dx * dx + dy * dy);
    const normalized : number = Math.min(1, velocity/1000); 
    const color : number = normalized * 175; 
    return color;
}

// clamps a given number between 0 - 256; 
function clamp(n : number) { 
    // 1. -(n >= 0) is a bitmask to check if n < 0.
    // n >= 0 yields n &= (0xffffff) so does nothing 
    // n <= 0 yields n &= (0x000000) so zeroes out n
    n &= -(n >= 0);
    // 2. detects overflow above 255
    // t = 255 - n
    // n <= 255 -> t >= 0, its sign bit (32nd position) is 0, so t >> 31 = 0x000000
    // n > 255 -> t < 0, signbit is 1, so t >> 31 yields 0xFFFFFF (-1) 
    // 3. n | mask: if overflow, force all bits to 1, or 0xFFFFFF
    return n | ((255 - n) >> 31);
}