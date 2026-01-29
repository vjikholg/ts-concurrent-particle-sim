// import { GravitationalAcceleration } from "./physics/AccelerationSources";
console.log("worker created");
// signaling stuff
const SIGNAL_RUN : number = 0;
const SIGNAL_PAUSE : number = 1;
const SIGNAL_READY : number = 2;

// gravity stuff 
const GRAVITY_FIELDS = 7;
const GRAVITATIONAL_CONSTANT : number = 6.67430; 
const eps : number =  0.001; // prevents acceleration from exploding

// local per-worker cache
let lastSetupEvent : MessageEvent | null = null; 
let worker_id : number; 
let particleView : Float32Array;
let simDataView : Float32Array;
let gravityView : Float32Array;
let pixelView : Uint8ClampedArray;
let start : number; 
let end : number; 
let fields : number;


function colorFromVelocity(dx: number, dy: number, dz?: number) : number { 
    const velocity : number = Math.sqrt(dx * dx + dy * dy);
    const normalized : number = Math.min(1, velocity/1000); 
    const color : number = normalized * 175; 
    return color;
}

function GravitationalAcceleration(x: number, y: number, GravityBuffer: Float32Array) : number[] { 
    let accels : number[] = [0,0]; 

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
        accels[0]! += mu * dx * invR;
        accels[1]! += mu * dy * invR;
    }
    return accels;
}

// startup cache values/views for worker
const startup = (event: MessageEvent) : void => {
    const {
        id,
        rawParticleBuffer,
        rawSharedViewSimData,
        rawGravityBuffer, 
        particleWorkingPositionStart, 
        particleWorkingPositionEnd, 
        FIELDS, 
    } = event.data

    worker_id = id;
    particleView = new Float32Array(rawParticleBuffer);
    simDataView = new Float32Array(rawSharedViewSimData);
    gravityView = new Float32Array(rawGravityBuffer);
    start = particleWorkingPositionStart; 
    end = particleWorkingPositionEnd
    fields = FIELDS;
}

// step function for our simulation
const simulate = (ActivePixelBuffer: SharedArrayBuffer) : void => {
    const [dt, mx, my, isTouch, width, height] = [
        simDataView[0]!, // dt
        simDataView[1]!, // mx
        simDataView[2]!, // my
        simDataView[3], // isTouch, might be undef
        simDataView[4]!, // WIDTH
        simDataView[5]!  // HEIGHT
    ]

    pixelView = new Uint8ClampedArray(ActivePixelBuffer);

    const pixelChunkSize : number = width * height * 4;             
    const pixelOffset : number = worker_id * pixelChunkSize;
    const delta : number = dt;

    pixelView.fill(0, pixelOffset, pixelOffset + pixelChunkSize);

    for (let i = start; i < end; i++) {
            // update position by velocity
            particleView[i*fields]! += particleView[i*fields + 3]! * delta;
            particleView[i*fields + 1]! += particleView[i*fields + 4]! * delta;
            particleView[i*fields + 2]! += particleView[i*fields + 5]! * delta; 

            // update velocity by acceleration
            if (gravityView.length > 0) {
                const accel : number[] = GravitationalAcceleration(particleView[i*fields]!, particleView[i*fields + 1]!, gravityView)  
                particleView[i*fields+3]! += accel[0]!; 
                particleView[i*fields+4]! += accel[1]!; 
            }

            // grab position of particle relative to our pixelbuffer. 
            const x = particleView[i*fields]!, y = particleView[i*fields + 1]!, z = particleView[i*fields+3]!;
            if (x < 0 || x > width) continue;
            if (y < 0 || y > height) continue; 
            const pxIdx : number = pixelOffset + ((y | 0) * width + (x | 0)) * 4;

            // write to shared pixel buffer
            pixelView![pxIdx]! += colorFromVelocity(particleView[i * fields + 3]!, particleView[i * fields + 4]!); // red 
            pixelView![pxIdx + 1]! += 80; // green
            pixelView![pxIdx + 2]! += 80; // blue
            pixelView![pxIdx + 3]! += 125; // alpha 
    }
}

onmessage = (event: MessageEvent) : void => {
    if (event.data?.type === 0) {
        startup(event);
        lastSetupEvent = event;
        postMessage({type: 1, id: event.data.id}); 
        return;
    }

    if (event.data?.type === 2) {
        simulate(event.data?.rawPixelBufferActive);
        postMessage({type: 3, id: lastSetupEvent!.data.id});
        return;
    }
}
