import { GRAVITY_FIELDS, GravityBuffer } from "../structs/global";

const GRAVITATIONAL_CONSTANT : number = 6.67430 * 15; 
const eps : number = 100

export function GravitationalAcceleration(m_source: number, x_source: number, y_source: number, x: number, y: number) : number[] { 
    const dx = x_source-x;
    const dy = y_source-y;
    const r2 = Math.max(dx * dx + dy * dy + eps, eps);
    if (!Number.isFinite(r2) || r2 === 0) return [0,0];
    const mu = (GRAVITATIONAL_CONSTANT * m_source) / r2;
    const invR = 1 / Math.sqrt(r2);
    const ax : number = mu * dx * invR;
    const ay : number = mu * dy * invR;
    return [ax,ay];
}