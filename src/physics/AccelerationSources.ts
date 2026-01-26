import { GRAVITY_FIELDS, GravityBuffer } from "../structs/global";

const GRAVITATIONAL_CONSTANT : number = 6.67430*10^15; 
const SAGITARRIUS : number = 8.54*10^36;

export function GravitationalAcceleration(x: number, y: number) : number[] { 
    let accels : number[] = [0,0]; 

    for (let i = 0 ; i < GravityBuffer.length ; i += GRAVITY_FIELDS) {
        // get incident angle
        try {
            const dy = -(GravityBuffer[i]! - y);
            const dx = GravityBuffer[i+1]! - x;
            const theta = Math.atan(dy/dx);
            
            let mu = (GRAVITATIONAL_CONSTANT * SAGITARRIUS) / Math.hypot(x,y)**2;
            accels[0]! += mu*Math.cos(theta);
            accels[1]! += mu*Math.sin(theta);
        } catch (exp) {
            console.log(`broken gravitational reference!: ${i}`);
            continue;
        }
    }
    return accels;
}

export function UpdateSources() : void {
    


}