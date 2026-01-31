// import { GravitationalAcceleration } from "./physics/AccelerationSources";
console.log("worker created");

let PrevEvent : MessageEvent; 
let first : boolean = true; 

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
    const CanvasPixels : number = inputs[4]! * inputs[5]!;
    const PixelsOffset : number = worker_id * CanvasPixels;
    ActivePixelBuffer.fill(0, PixelsOffset, (PixelsOffset + CanvasPixels)*3); // rgb so 3 fields/px

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
        
        if (x < 0 || x >= inputs[4]! || y < 0 || y >= inputs[5]!) continue
        const pxIdx : number = (x | 0) * inputs[4]! + (y | 0);  

        const packed_rgb : number = ActivePixelBuffer[PixelsOffset + pxIdx] ?? 0xF;
        const r = (packed_rgb) >> 16 & 0xFF; 
        const g = (packed_rgb) >> 8 & 0xFF; 
        const b = (packed_rgb) & 0xFF; 
        
        const r_new : number = ((r + 25 + 255 * 0.2) & 0xff) << 16;
        const g_new : number = ((g + 25 + 255 * 0.2) & 0xff) << 8;
        const b_new : number = (b + 25 + 255 * 0.2) & 0xff;
        
        ActivePixelBuffer[PixelsOffset + pxIdx] = r_new | g_new | b_new;
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


