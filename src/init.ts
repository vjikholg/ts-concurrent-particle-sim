import { MessageHandler } from "./sim";
import { WORKER_CHUNK_SIZE, CPU_CORES, FIELDS, PARTICLE_COUNT, 
    ParticleBuffer, GravityBuffer, SimulationData} from "./structs/global";

const canvas : HTMLCanvasElement = (document.getElementById("canvas")!) as HTMLCanvasElement;
const WIDTH : number = window.innerWidth; 
const HEIGHT : number = window.innerHeight;
let colorbuffer : ImageData = new ImageData(window.innerWidth, window.innerHeight)

/**
 * buffer[0] - buffer[6] contain info in following order: (x,y,z,dx,dy,dz)
 * performant not bad, goal is to access 6 at a time. 
 * @param buffer 
 */ 
export function InitializeParticleField(buffer: Float32Array) : void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        // here we'll want to assign these into something, i.e., initial conditions basically
        // for our simulation we can do a LOT of things. between visualizing generic vector fields to electric/gravitational fields
        // strong, weak force (could be weird but could be interesting!)   
        buffer[i*FIELDS]   = Math.random() * WIDTH      // x 
        buffer[i*FIELDS+1] = Math.random() * HEIGHT     // y
        buffer[i*FIELDS+2] = 0                          // z, might be used for alpha.
        buffer[i*FIELDS+3] = (Math.random()*2 - 1) * 10 // dx
        buffer[i*FIELDS+4] = (Math.random()*2 - 1) * 10 // dy
        buffer[i*FIELDS+5] = 0 // dz unused for now but added just to see perf. 
        buffer[i*FIELDS+6] = (Math.random()*999 + 1)    // mass
    }
}

export function InitializeWorkers(pool : Worker[]) : void { 
    for (let i = 0; i < CPU_CORES; i++) {
        const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: 'module' });
        worker.addEventListener('message', MessageHandler)
        worker.addEventListener('error', (event) => {
            console.log(event.message);
        });
        pool.push(worker);
        worker.postMessage({
            id: i,                                                      // assigned worker id
            ParticleBuffer,                                             // particle information
            SimulationData,                                             // simulation information, like mx, my, isTouch
            GravityBuffer,                                              // position of gravitational fields
            ParticleOffsetStart: WORKER_CHUNK_SIZE*i,                   // assigned section of pixels to write in
            ParticleOffsetEnd: WORKER_CHUNK_SIZE*i+WORKER_CHUNK_SIZE,   // read above
            FIELDS,                                                     // # of fields/particle
        })
        console.log(`worker init'd: ${i}`)
    }
}

export function InitializeTestGravity() : void {
    GravityBuffer[0] = WIDTH/2 - 200; 
    GravityBuffer[1] = HEIGHT/2; 
    GravityBuffer[6] = 1000;
    GravityBuffer[7] = WIDTH/2 + 200; 
    GravityBuffer[8] = HEIGHT/2; 
    GravityBuffer[13] = 1000;
    console.log("grav view data init'd")
}

export function InitializeSimViewData() : void { 
    SimulationData[4] = WIDTH; 
    SimulationData[5] = HEIGHT; 
    
    function updateMouse(x: number, y: number) {
        SimulationData[1] = x; 
        SimulationData[2] = y;
    }
    function updateBorder(width: number, height: number) {
        SimulationData[4] = width; 
        SimulationData[5] = height; 
    }

    AddMouseListener(window, updateMouse);
    AddResizeListener(window, updateBorder);
    console.log("sim view data init'd");
}

export function AddResizeListener(window: Window, fn?: Function) : void {
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth; 
        canvas.height = window.innerHeight;
        fn ? fn(window.innerWidth, window.innerHeight) : null; 
    });
}

export function AddMouseListener(window: Window, fn?: Function) : void {
    window.addEventListener('click', (e: PointerEvent) => {
        console.log(`event fired: with params ${e.clientX}, ${e.clientY}`)
        fn ? fn(e.clientX, e.clientY) : null;
    });
}
