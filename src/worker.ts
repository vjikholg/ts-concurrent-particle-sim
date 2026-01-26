// import { GravitationalAcceleration } from "./physics/AccelerationSources";
console.log("worker created");

const GRAVITY_FIELDS = 7;
const SIGNAL_RUN : number = 0;
const SIGNAL_PAUSE : number = 1;
const SIGNAL_READY : number = 2;
const GRAVITATIONAL_CONSTANT : number = 6.67430; 
const eps : number =  0.001; // prevents acceleration from exploding

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

function Render(x: number, y: number) : void {

}

onmessage = (event) => {
    const {
        rawParticleBuffer,
        rawSharedViewSignals,
        rawSharedViewSimData,
        rawSimData,
        id, 
        chunkSize, 
        chunkOffset, 
        FIELDS, 
        rawGravityBuffer
    } = event.data

    const particleView : Float32Array = new Float32Array(rawParticleBuffer)!;
    const signalView : Uint8Array = new Uint8Array(rawSharedViewSignals)!;
    const simDataView : Float32Array = new Float32Array(rawSharedViewSimData)!; 
    const gravityView : Float32Array = new Float32Array(rawGravityBuffer);
    const dt = () => simDataView[0]!;
    const input = () => [
        simDataView[1], // mx
        simDataView[2], // my
        simDataView[3], // isTouch
        simDataView[4], // WIDTH
        simDataView[5]  // HEIGHT
    ]; 

    signalView[id] = SIGNAL_READY;

    console.log(`worker init: ${id}`); 

    setInterval(() => { 
        if (signalView[id] !== SIGNAL_RUN) return;
        const delta : number = dt();
        const height = input()[4]!;
        const width = input()[5]!;
            
        for (let i = chunkOffset; i < chunkOffset+chunkSize; i++) { 
            particleView[i*FIELDS]! += particleView[i*FIELDS + 3]! * delta;
            particleView[i*FIELDS + 1]! += particleView[i*FIELDS + 4]! * delta;
            particleView[i*FIELDS + 2]! += particleView[i*FIELDS + 5]! * delta; 
            if (gravityView.length > 0) {
                const accel : number[] = GravitationalAcceleration(particleView[i*FIELDS]!, particleView[i*FIELDS + 1]!, gravityView)  
                particleView[i*FIELDS+3]! += accel[0]!; 
                particleView[i*FIELDS+4]! += accel[1]!; 
            }
            
            const x = particleView[i*FIELDS]!, y = particleView[i*FIELDS + 1]!, z = particleView[i*FIELDS+3]!;
            if (x < 0 || x > width) continue;
            if (y < 0 || y > height) continue; 
            const pxIdx : number = ((y | 0) * width!+ (x | 0)) * 4;

        }
        signalView[id] = SIGNAL_READY;
    }, 1)
};
