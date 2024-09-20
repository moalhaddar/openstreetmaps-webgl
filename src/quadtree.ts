import { WORLD_HEIGHT, WORLD_WIDTH } from "./osm";
import { OSMContext, OSMNode, WorldNode } from "./types";
import { Vector2 } from "./vector2";

class Rectangle {
    // x, y defines Top left corner
    constructor(public x: number, public y: number, public width: number, public height: number) {}

    contains(point: Vector2): boolean {
        return (point.x >= this.x &&
                point.x <= this.x + this.width &&
                point.y <= this.y &&
                point.y >= this.y - this.height);
    }

    intersects(range: Rectangle): boolean {
        const xOverlap = this.x < range.x + range.width && this.x + this.width > range.x;
        const yOverlap = this.y > range.y - range.height && this.y - this.height < range.y;
    
        return xOverlap && yOverlap;
    }

    distanceTo(point: Vector2): number {
        const dx = Math.max(this.x - point.x, 0, point.x - (this.x + this.width));
        const dy = Math.max(this.y - point.y, 0, point.y - (this.y - this.height));
        return Math.sqrt(dx * dx + dy * dy);
    }

    toString(): string {
        return `(${this.x}, ${this.y})..........(${this.x+this.width}, ${this.y})\n` 
        + `(${this.x}, ${this.y - this.height})...........(${this.x + this.width}, ${this.y - this.height})`
    }
}

class QuadTree {
    static quadsCount = 0;
    private nodes: WorldNode[] = [];
    private northeast: QuadTree | null = null;
    private northwest: QuadTree | null = null;
    private southeast: QuadTree | null = null;
    private southwest: QuadTree | null = null;
    private divided: boolean = false;
    maxDepth: number = 0;

    constructor(private boundary: Rectangle, private capacity: number, private parent: QuadTree | null = null) {
        QuadTree.quadsCount++;
    }

    insert(node: WorldNode, currentDepth: number = 0): {added: boolean, atDepth: number} {
        if (!this.boundary.contains(node.position)) {
            return {added: false, atDepth: 0};
        }

        if (this.nodes.length < this.capacity) {
            this.nodes.push(node);
            return {added: true, atDepth: currentDepth};
        }

        if (!this.divided) {
            this.subdivide();
        }

        const addedNE = this.northeast!.insert(node, currentDepth + 1);
        const addedNW = this.northwest!.insert(node, currentDepth + 1);
        const addedSE = this.southeast!.insert(node, currentDepth + 1);
        const addedSW = this.southwest!.insert(node, currentDepth + 1);
        
        const isAdded = addedNE.added || addedNW.added || addedSE.added || addedSW.added;
        const addedDepth = addedNE.atDepth || addedNW.atDepth || addedSE.atDepth || addedSW.atDepth;

        if (addedDepth > this.maxDepth) {
            this.maxDepth = addedDepth;
        }


        return {
            added: isAdded,
            atDepth: addedDepth
        }
    }

    private subdivide(): void {
        const x = this.boundary.x;
        const y = this.boundary.y;
        const w = this.boundary.width / 2;
        const h = this.boundary.height / 2;

        const ne = new Rectangle(x + w, y, w, h);
        this.northeast = new QuadTree(ne, this.capacity, this);

        const nw = new Rectangle(x, y, w, h);
        this.northwest = new QuadTree(nw, this.capacity, this);

        const se = new Rectangle(x + w, y - h, w, h);
        this.southeast = new QuadTree(se, this.capacity, this);

        const sw = new Rectangle(x, y - h, w, h);
        this.southwest = new QuadTree(sw, this.capacity, this);

        this.divided = true;
    }

    query(range: Rectangle, found: WorldNode[] = []): WorldNode[] {
        if (!this.boundary.intersects(range)) {
            return found;
        }

        for (const node of this.nodes) {
            if (range.contains(node.position)) {
                found.push(node);
            }
        }

        if (this.divided) {
            this.northeast!.query(range, found);
            this.northwest!.query(range, found);
            this.southeast!.query(range, found);
            this.southwest!.query(range, found);
        }

        return found;
    }

    findNearest(point: Vector2): WorldNode | null {
        return this.findNearestRecursive(point, null, Number.MAX_VALUE);
    }

    private findNearestRecursive(point: Vector2, best: WorldNode | null, bestDistance: number): WorldNode | null {
        if (!this.boundary.contains(point) && this.boundary.distanceTo(point) > bestDistance) {
          return best;
        }
    
        for (const node of this.nodes) {
          const distance = node.position.distance(point);
          if (distance < bestDistance) {
            best = node;
            bestDistance = distance;
          }
        }
    
        if (this.divided) {
          const quadrants = [this.northeast, this.northwest, this.southeast, this.southwest];
          quadrants.sort((a, b) => a!.boundary.distanceTo(point) - b!.boundary.distanceTo(point));
    
          for (const quadrant of quadrants) {
            best = quadrant!.findNearestRecursive(point, best, bestDistance);
            bestDistance = best ? best.position.distance(point) : bestDistance;
          }
        }
    
        return best;
      }
}

export class WorldQuadTree {
    private quadTree: QuadTree;

    constructor() {
        this.quadTree = new QuadTree(new Rectangle(0, WORLD_HEIGHT, WORLD_WIDTH, WORLD_HEIGHT), 4);
    }

    populate(nodes: WorldNode[]) {
        for (const node of nodes) {
            const result = this.quadTree.insert(node);
            if (result.added === false){
                throw new Error(`Failed to insert node into the qudd tree. ${JSON.stringify(node)}`)
            }
        }

        console.log("Quad tree max depth = " + this.quadTree.maxDepth);
        console.log("Quads count: " + QuadTree.quadsCount);
    }

    getClosestNodeForWorldPosition(worldPosition: Vector2): WorldNode | undefined {
        return this.quadTree.findNearest(worldPosition) ?? undefined;
    }
}