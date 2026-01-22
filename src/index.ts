import { AddMouseListener, AddResizeListener, InitializeParticleField, InitializeWorkers } from "./init"
import { runSimulation } from "./sim";
import * as global from "./structs/global"

const canvas : HTMLCanvasElement = document.getElementById("particle") as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

InitializeParticleField(global.ParticleBuffer);
InitializeWorkers(global.WORKER_POOL)
AddResizeListener(window); 
AddMouseListener(window);

const handle = setInterval(() => {
    console.log("waiting for workers..." , global.sharedViewSignals);
    if (global.sharedViewSignals[global.sharedViewSignals.length - 1] !== global.SIGNAL_READY){
        return;
    }
    clearInterval(handle)
    requestAnimationFrame(runSimulation);
}, 100);