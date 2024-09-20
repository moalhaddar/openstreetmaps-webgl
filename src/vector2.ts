export class Vector2 {
    x: number;
    y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    multiply(v2: Vector2) {
        return new Vector2(this.x * v2.x, this.y * v2.y);
    }

    multiplyScalar(x: number, y: number) {
        return new Vector2(this.x * x, this.y * y);
    }

    add(v2: Vector2) {
        return new Vector2(this.x + v2.x, this.y + v2.y);
    }

    addScalar(x: number, y: number) {
        return new Vector2(this.x + x, this.y + y);
    }

    subtract(v2: Vector2) {
        return new Vector2(this.x - v2.x, this.y - v2.y);
    }

    distance(v: Vector2) {
        return Math.sqrt(
            Math.pow((this.x - v.x), 2) + Math.pow((this.y - v.y), 2)
        )
    }

    length() {
        return Math.sqrt(this.x*this.x + this.y*this.y);
    }


    static scalar(s: number) {
        return new Vector2(s, s);
    }

    *[Symbol.iterator]() {
        yield this.x;
        yield this.y;
    }
}