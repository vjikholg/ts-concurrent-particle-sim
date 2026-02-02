import { FIELDS, PARTICLE_COUNT, ParticleBuffer, ColorBuffer, WIDTH, HEIGHT, WORKER_COUNT } from "./structs/global";
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
        const pixel_idx : number = ((y | 0) * WIDTH + (x | 0)) * 4; // bytelength for Colorbuffer.data
        
        // handle z-case here, in general should be fine. 
        // colorFromVelocity(ParticleBuffer[i * FIELDS + 2]!, ParticleBuffer[i * FIELDS + 3]!)
        ColorBuffer.data[pixel_idx]! += 60 + colorFromVelocity(ParticleBuffer[i * FIELDS + 3]!, ParticleBuffer[i * FIELDS + 4]!);     // red 
        ColorBuffer.data[pixel_idx + 1]! += 80;  // green
        ColorBuffer.data[pixel_idx + 2]! += 80;  // blue
        ColorBuffer.data[pixel_idx + 3]! += 125; // alpha 
    }
    context.putImageData(ColorBuffer, 0, 0);
}

/**
 * Given Uint8Clamped array representing a ImageDataArray, renders it to canvas. 
 * @param buffer UInt32Array or ImageDataArray. 
 */
export function RenderFieldBuffer(buffer : Uint32Array) : void {
    // console.log(buffer);
    ColorBuffer.data.fill(0); 
    const pixels : ImageDataArray = ColorBuffer.data; 
    for (let i = 0; i < WIDTH * HEIGHT; i++) {
        let r = 0; let g = 0; let b = 0; 
        // WORKER_COUNT number of layers we need to composite together
        // Read defs in global.ts for more information. 
        for (let j = 0; j < WORKER_COUNT; j++) {
            const offset : number = j * WIDTH * HEIGHT;
            const curr_col : number = buffer[offset + i]!; 
            r += (curr_col >> 16) & 0xFF; // to binary, shift to get field in question. 
            g += (curr_col >> 8) & 0xFF; 
            b += curr_col & 0xFF; 
            // console.log(`${r}, ${g}, ${b}`)
            // alpha constant 
        }
        pixels[i*4] = r;
        pixels[i*4 + 1] = g;
        pixels[i*4 + 2] = b
        pixels[i*4 + 3] = 80;
    }
    context.putImageData(ColorBuffer, 0, 0);
}

/**
 * translates velocity of the particle to heat. it'll be interesting to see "heat" bleeding off per frame somehow actually. 
 * @param dx 
 * @param dy 
 * @param dz 
 */
function colorFromVelocity(dx: number, dy: number, dz?: number) : number { 
    const velocity : number = Math.sqrt(dx * dx + dy * dy);
    const normalized : number = Math.min(1, velocity/1000); 
    const color : number = normalized * 175; 
    return color;
}
