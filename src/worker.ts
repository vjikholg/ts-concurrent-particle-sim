import { SIGNAL_RUN, SIGNAL_PAUSE, SIGNAL_READY, rawParticleBuffer } from "./structs/global";
import { ParticleBuffer, sharedViewSignals, CHUNKSIZE } from "./structs/global";
console.log("worker created");

onmessage = (event) => {
    const {
        rawParticleBuffer,
        rawSharedViewSignals,
        id, 
        chunkSize, 
        chunkOffset, 
        FIELDS, 
        rawSharedViewSimData 
    } = event.data

    const particleView : Float32Array = new Float32Array(rawParticleBuffer)!;
    const signalView : Uint8Array = new Uint8Array(rawSharedViewSignals)!;
    const simDataView : Float32Array = new Float32Array(rawSharedViewSimData)!; 
    const dt = () => simDataView[0]!;
    signalView[id] = SIGNAL_READY;
    console.log(`worker init: ${id}`); 

    setInterval(() => { 
        if (signalView[id] !== SIGNAL_RUN) return;
        const delta : number = dt();

        for (let i = chunkOffset; i < chunkOffset+chunkSize; i++) { 
            particleView[i*FIELDS]! += particleView[i*FIELDS + 3]! * delta;
            particleView[i*FIELDS + 1]! += particleView[i*FIELDS + 4]! * delta;
            particleView[i*FIELDS + 2]! += particleView[i*FIELDS + 5]! * delta; 
        }
        signalView[id] = SIGNAL_READY;
    }, 1)
};