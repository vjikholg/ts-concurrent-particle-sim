import { FIELDS, PARTICLE_COUNT, ParticleBuffer, PixelBuffer, ColorBuffer, WIDTH, HEIGHT, CPU_CORES, PIXEL_FIELDS } from "./structs/global";
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
        const pixel_idx : number = ((y | 0) * WIDTH + (x | 0)) * 4; 
        
        // handle z-case here, in general should be fine. 
        // colorFromVelocity(ParticleBuffer[i * FIELDS + 2]!, ParticleBuffer[i * FIELDS + 3]!)
        ColorBuffer.data[pixel_idx]! += 80 + colorFromVelocity(ParticleBuffer[i * FIELDS + 2]!, ParticleBuffer[i * FIELDS + 3]!);     // red 
        ColorBuffer.data[pixel_idx + 1]! += 80; // green
        ColorBuffer.data[pixel_idx + 2]! += 80; // blue
        ColorBuffer.data[pixel_idx + 3]! += 125; // alpha 
    }
    context.putImageData(ColorBuffer, 0, 0);
}

/**
 * Renders the field. Doesn't handle any of the rendering calculations itself, just reads. 
 */
export function RenderFieldBuffer(buffer : Int8Array) {
    const pixels : ImageDataArray = ColorBuffer.data; 
    const pxInfoNo : number = WIDTH * HEIGHT * 4; // # of px on screen * # |rgba|
    let r = 0; let g = 0;let b = 0; let a = 0; 
    for (let i = 0; i < WIDTH * HEIGHT; i++) {
        for (let j = 0; j < CPU_CORES; j++) {
            r! += PixelBuffer[j * pxInfoNo + i * PIXEL_FIELDS]!;
            g! += PixelBuffer[j * pxInfoNo + i * PIXEL_FIELDS + 1]!;
            b! += PixelBuffer[j * pxInfoNo + i * PIXEL_FIELDS + 2]!;
            a! += PixelBuffer[j * pxInfoNo + i * PIXEL_FIELDS + 3]!;
        }
        pixels[i*PIXEL_FIELDS] = r; 
        pixels[i*PIXEL_FIELDS + 1] = g; 
        pixels[i*PIXEL_FIELDS + 2] = b; 
        pixels[i*PIXEL_FIELDS + 3] = a; 
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
