import type { BlockDef, ColliderDef, MatName, StateFilter } from './types';

// Wall geometry constants, matching the v0.1 prototype.
const WALL_THICKNESS = 0.24;
const WALL_HALF_THICKNESS = WALL_THICKNESS / 2;
const WALL_HEIGHT = 3;
const WALL_Y = 1.5;

// Accumulates geometry + colliders for a room definition.
export class RoomBuilder {
  readonly blocks: BlockDef[] = [];
  readonly colliders: ColliderDef[] = [];

  block(
    size: [number, number, number],
    pos: [number, number, number],
    mat: MatName,
    states?: StateFilter,
    rotY?: number,
  ): void {
    this.blocks.push({ size, pos, mat, states, rotY });
  }

  // Wall running along X (a horizontal run in plan view), centered at z.
  wallX(x0: number, x1: number, z: number, mat: MatName = 'wall', states?: StateFilter): void {
    const width = x1 - x0;
    const cx = (x0 + x1) / 2;
    this.block([width, WALL_HEIGHT, WALL_THICKNESS], [cx, WALL_Y, z], mat, states);
    this.colliders.push({
      minX: x0,
      maxX: x1,
      minZ: z - WALL_HALF_THICKNESS,
      maxZ: z + WALL_HALF_THICKNESS,
      states,
    });
  }

  // Wall running along Z (a vertical run in plan view), centered at x.
  wallZ(z0: number, z1: number, x: number, mat: MatName = 'wall2', states?: StateFilter): void {
    const depth = z1 - z0;
    const cz = (z0 + z1) / 2;
    this.block([WALL_THICKNESS, WALL_HEIGHT, depth], [x, WALL_Y, cz], mat, states);
    this.colliders.push({
      minX: x - WALL_HALF_THICKNESS,
      maxX: x + WALL_HALF_THICKNESS,
      minZ: z0,
      maxZ: z1,
      states,
    });
  }

  // Collider-only region, no mesh (e.g. props whose mesh is added separately).
  solid(minX: number, maxX: number, minZ: number, maxZ: number, states?: StateFilter): void {
    this.colliders.push({ minX, maxX, minZ, maxZ, states });
  }
}
