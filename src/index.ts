import { AddMouseListener, AddResizeListener, InitializeParticleField, InitializeSimViewData, InitializeTestGravity, InitializeWorkers } from "./init"
import { RenderFieldBuffer } from "./render";
import { perfStats, runSimulation } from "./sim";
import * as global from "./structs/global"
import GUI from "lil-gui";

console.log("starting up...")

const canvas : HTMLCanvasElement = document.getElementById("particle") as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const gui = new GUI({ title: "Perf" });
gui.add(perfStats, "fps", 0, 240, 0.1).name("FPS").listen();
gui.add(perfStats, "frameMs", 0, 50, 0.1).name("Frame ms").listen();
gui.add(perfStats, "renderMs", 0, 50, 0.1).name("Render ms").listen();

InitializeSimViewData();
InitializeTestGravity()
InitializeParticleField(global.ParticleBuffer);
InitializeWorkers(global.WORKER_POOL)
