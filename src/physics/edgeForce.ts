import { WIDTH, HEIGHT } from "../structs/global";
const boundary : number = Math.max(WIDTH/5, HEIGHT/5)
const center_x : number = WIDTH/2;
const center_y : number = HEIGHT/2;


export function edgeForce(x: number, y: number, alpha: number = 1, eps : number = 0.1, k : number = 5) : number[] {

    const d_abs : number = Math.min(x, WIDTH - x, y, HEIGHT-y);

    if (d_abs > boundary) return [0,0]

    const dx : number = center_x - x;
    const dy : number = center_y - y;
    const mag : number = Math.hypot(dx, dy)
    const dx_hat : number = dx; 
    const dy_hat : number = dy; 

    const g: number = 1/(d_abs + eps)**alpha;
    console.log([k*dx_hat*g, k*dy_hat*g], 
        `dx: ${dx} dy: ${dy} mag: ${mag} dx_hat: ${dx_hat} dy_hat ${dy_hat} g: ${g}`);
    return [k*dx_hat*g, k*dy_hat*g]

}

const k : number = 2;
export function Dampening(dx: number, dy: number) : number[] {
    return [-k*dx, -k*dy];
}

function EdgeDistance(x: number, y: number, z? : number) { 
    return Math.min(x, WIDTH-x, y, HEIGHT-y);
}

