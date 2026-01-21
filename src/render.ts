import { FIELDS, PARTICLE_COUNT, ParticleBuffer, ColorBuffer, WIDTH, HEIGHT } from "./structs/global";
// this represents the color each pixel based on particle positions within ParticleBuffer


const canvas : HTMLCanvasElement = document.getElementById("particle")! as HTMLCanvasElement;
const context : CanvasRenderingContext2D = canvas.getContext('2d')!;

/**
 * Exercise in CPU-side rendering, won't use three just to see how far I can go following the perf-tricks.
 * Doesn't render out-of-frame particles. helps with perf. 
*/
export function RenderField() { 
    ColorBuffer.data.fill(0); 
    for (let i = 0 ; i < PARTICLE_COUNT; i++) { 
        const x : number = ParticleBuffer[i * FIELDS]!; 
        if (x > WIDTH || x < 0) continue;
        const y : number = ParticleBuffer[i * FIELDS + 1]!; 
        if (y > HEIGHT || y < 0) continue;
        const pixel_idx : number = ((y | 0) * WIDTH + (x | 0)) * FIELDS; 
        
        // handle z-case here, in general should be fine. 

        ColorBuffer.data[pixel_idx]! += 30;     // red 
        ColorBuffer.data[pixel_idx + 1]! += 30; // green
        ColorBuffer.data[pixel_idx + 2]! += 30; // blue
        ColorBuffer.data[pixel_idx + 3]! += 30; // alpha 
    }
    context.putImageData(ColorBuffer, 0, 0);
}

/**
 * translates velocity of the particle to heat. it'll be interesting to see "heat" bleeding off per frame somehow actually. 
 * @param dx 
 * @param dy 
 * @param dz 
 */
function colorFromVelocity(dx: number, dy: number, dz: number) { 
    
}


