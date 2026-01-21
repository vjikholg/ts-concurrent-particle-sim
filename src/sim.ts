import { RenderField } from "./render";
import { CPU_CORES, sharedViewSignals, SIGNAL_RUN } from "./structs/global";

let last_time = 1;

/**
 * dt = delta time, calculate to handle variable frame rate. 
 * @param curr_time 
 */
export function runSimulation(curr_time: number) : void { 
    const dt : number = Math.min(1, (curr_time - last_time)/1000); 
    last_time = curr_time;
    for (let i = 0 ; i < CPU_CORES; i++) {
        sharedViewSignals[i] = SIGNAL_RUN
    }
    RenderField(); 
    requestAnimationFrame(runSimulation);
}   