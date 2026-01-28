import { rawPixelBufferActive } from "./structs/global";

// import { GravitationalAcceleration } from "./physics/AccelerationSources";
console.log("worker created");

const GRAVITY_FIELDS = 7;
const SIGNAL_RUN : number = 0;
const SIGNAL_PAUSE : number = 1;
const SIGNAL_READY : number = 2;
const GRAVITATIONAL_CONSTANT : number = 6.67430; 
const eps : number =  0.001; // prevents acceleration from exploding
let lastSetupEvent : MessageEvent | null = null; 



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

// step function for our simulation
const simulate = (event: MessageEvent, ActivePixelBuffer: SharedArrayBuffer) => {
    // raw information import
    const {
        id,
        rawParticleBuffer,
        rawSharedViewSimData,
        rawGravityBuffer, 
        particleWorkingPositionStart, 
        particleWorkingPositionEnd, 
        FIELDS, 
    } = event.data

    // init views into raw buffers
    const particleView : Float32Array = new Float32Array(rawParticleBuffer)!;
    const simDataView : Float32Array = new Float32Array(rawSharedViewSimData)!; 
    const gravityView : Float32Array = new Float32Array(rawGravityBuffer)!;
    const pixelView : Uint8ClampedArray = new Uint8ClampedArray(ActivePixelBuffer)!;

    // init simulation information
    const [dt, mx, my, isTouch, width, height] = [
        simDataView[0]!, // dt
        simDataView[1]!, // mx
        simDataView[2]!, // my
        simDataView[3], // isTouch, might be undef
        simDataView[4]!, // WIDTH
        simDataView[5]!  // HEIGHT
    ]

    const pixelChunkSize : number = width * height;                 // size of each pixel chunk,.
    const pixelOffset : number = id * pixelChunkSize;               // starting point of the section we're writing to
    pixelView.fill(0, pixelOffset, pixelOffset + pixelChunkSize);   // resets assigned pixelbuffer section 

    const start : number = particleWorkingPositionStart; 
    const end : number = particleWorkingPositionEnd; 
    const delta : number = dt;

    for (let i = start; i < end; i++) {
            // update position by velocity
            particleView[i*FIELDS]! += particleView[i*FIELDS + 3]! * delta;
            particleView[i*FIELDS + 1]! += particleView[i*FIELDS + 4]! * delta;
            particleView[i*FIELDS + 2]! += particleView[i*FIELDS + 5]! * delta; 

            // update velocity by acceleration
            if (gravityView.length > 0) {
                const accel : number[] = GravitationalAcceleration(particleView[i*FIELDS]!, particleView[i*FIELDS + 1]!, gravityView)  
                particleView[i*FIELDS+3]! += accel[0]!; 
                particleView[i*FIELDS+4]! += accel[1]!; 
            }

            const x = particleView[i*FIELDS]!, y = particleView[i*FIELDS + 1]!, z = particleView[i*FIELDS+3]!;
            if (x < 0 || x > width) continue;
            if (y < 0 || y > height) continue; 
            const pxIdx : number = ((y | 0) * width + (x | 0)) * 4;

            // write to shared pixel buffer
            pixelView[pxIdx]! += colorFromVelocity(particleView[i * FIELDS + 2]!, particleView[i * FIELDS + 3]!); // red 
            pixelView[pxIdx + 1]! += 80; // green
            pixelView[pxIdx + 2]! += 80; // blue
            pixelView[pxIdx + 3]! += 125; // alpha 
    }
    // 
}

onmessage = (event: MessageEvent) => {
    if (event.data?.id >= 0) {
        simulate(lastSetupEvent ?? event, event.data.rawPixelBufferActive)
    }
    lastSetupEvent = event;
}


// onmessage = (event) => {
//     const {
//         rawParticleBuffer,
//         rawSharedViewSignals,
//         rawSharedViewSimData,
//         id, 
//         chunkSize, 
//         chunkOffset, 
//         FIELDS, 
//         rawGravityBuffer,
//         rawPixelBufferActive
//     } = event.data
// 
//     const particleView : Float32Array = new Float32Array(rawParticleBuffer)!;
//     const signalView : Uint8Array = new Uint8Array(rawSharedViewSignals)!;
//     const simDataView : Float32Array = new Float32Array(rawSharedViewSimData)!; 
//     const gravityView : Float32Array = new Float32Array(rawGravityBuffer)!;
//     const pixelView : Uint8ClampedArray = new Uint8ClampedArray(rawPixelBufferActive)!;
// 
//     const dt = () => simDataView[0]!;
//     const input = () => [
//         simDataView[1], // mx
//         simDataView[2], // my
//         simDataView[3], // isTouch
//         simDataView[4], // WIDTH
//         simDataView[5]  // HEIGHT
//     ]; 
// 
//     signalView[id] = SIGNAL_READY;
// 
//     console.log(`worker init: ${id}`); 
// 
//     setInterval(() => { 
//         if (signalView[id] !== SIGNAL_RUN) return;
//         const delta : number = dt();
//         const height = input()[4]!;
//         const width = input()[5]!;
//             
//         for (let i = chunkOffset; i < chunkOffset+chunkSize; i++) { 
//             // update position by velocity
//             particleView[i*FIELDS]! += particleView[i*FIELDS + 3]! * delta;
//             particleView[i*FIELDS + 1]! += particleView[i*FIELDS + 4]! * delta;
//             particleView[i*FIELDS + 2]! += particleView[i*FIELDS + 5]! * delta; 
// 
//             // update velocity by acceleration
//             if (gravityView.length > 0) {
//                 const accel : number[] = GravitationalAcceleration(particleView[i*FIELDS]!, particleView[i*FIELDS + 1]!, gravityView)  
//                 particleView[i*FIELDS+3]! += accel[0]!; 
//                 particleView[i*FIELDS+4]! += accel[1]!; 
//             }
// 
//             // render new particle positions to pixel buffer keeping our image data
//             // prep and cull coordinates
//             const x = particleView[i*FIELDS]!, y = particleView[i*FIELDS + 1]!, z = particleView[i*FIELDS+3]!;
//             if (x < 0 || x > width) continue;
//             if (y < 0 || y > height) continue; 
//             const pxIdx : number = ((y | 0) * width + (x | 0)) * 4;
// 
//             // write to shared pixel buffer
//             pixelView[pxIdx]! += colorFromVelocity(particleView[i * FIELDS + 2]!, particleView[i * FIELDS + 3]!); // red 
//             pixelView[pxIdx + 1]! += 80; // green
//             pixelView[pxIdx + 2]! += 80; // blue
//             pixelView[pxIdx + 3]! += 125; // alpha 
// 
//         }
//         signalView[id] = SIGNAL_READY;
//     }, 1)
// };
