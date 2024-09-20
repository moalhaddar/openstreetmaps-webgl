class Color {
    r: number
    g: number
    b: number
    a: number

    constructor(r: number, g: number, b: number, a: number) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    normalize() {
        return new Color(this.r / 255, this.g / 255, this.b / 255, this.a / 255);
    }

    *[Symbol.iterator]() {
        yield this.r;
        yield this.g;
        yield this.b;
        yield this.a;
    }
}


export { Color }