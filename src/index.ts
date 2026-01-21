import { InitializeParticleField, InitializeWorkers } from "./init"
import { runSimulation } from "./sim";
import * as global from "./structs/global"

InitializeWorkers(global.WORKER_POOL)
InitializeParticleField(global.ParticleBuffer);

const handle = setInterval(() => {
    console.log("waiting for workers..." , global.sharedViewSignals);
    if (global.sharedViewSignals[global.sharedViewSignals.length - 1] !== global.SIGNAL_READY){
        return;
    }
    clearInterval(handle)
    requestAnimationFrame(runSimulation);
}, 100); 