class Matrix {
    constructor(rows, cols, data) {
        this.data = [];
        this.rows = rows;
        this.cols = cols;
        if (data) {
            if (this.rows * this.cols != data.length) {
                throw new Error(`Data array size mismatch. Expected ${this.rows * this.cols}, received ${data.length}`);
            }
            this.data = data;
        }
        else {
            this.data = new Array(this.rows * this.cols).fill(0);
        }
    }
    at(row, column) {
        return this.rows * row + column;
    }
    x() {
        return this.data[this.at(0, 0)];
    }
    y() {
        return this.data[this.at(0, 1)];
    }
    add(mat) {
        if (this.rows !== mat.rows || this.cols !== mat.cols) {
            throw new Error(`Cannot add ${this.rows}x${this.cols} with ${mat.rows}x${mat.cols}`);
        }
        const result = new Matrix(mat.rows, mat.cols);
        for (let i = 0; i < result.rows; i++) {
            for (let j = 0; j < result.cols; j++) {
                result.data[this.at(i, j)] = this.data[this.at(i, j)] + mat.data[this.at(i, j)];
            }
        }
        return result;
    }
    subtract(mat) {
        if (this.rows !== mat.rows || this.cols !== mat.cols) {
            throw new Error(`Cannot subtract ${this.rows}x${this.cols} with ${mat.rows}x${mat.cols}`);
        }
        const result = new Matrix(mat.rows, mat.cols);
        for (let i = 0; i < result.rows; i++) {
            for (let j = 0; j < result.cols; j++) {
                result.data[this.at(i, j)] = this.data[this.at(i, j)] - mat.data[this.at(i, j)];
            }
        }
        return result;
    }
    div(mat) {
        if (this.rows !== mat.rows || this.cols !== mat.cols) {
            throw new Error(`Cannot divide ${this.rows}x${this.cols} with ${mat.rows}x${mat.cols}`);
        }
        const result = new Matrix(mat.rows, mat.cols);
        for (let i = 0; i < result.rows; i++) {
            for (let j = 0; j < result.cols; j++) {
                result.data[this.at(i, j)] = this.data[this.at(i, j)] / mat.data[this.at(i, j)];
            }
        }
        return result;
    }
    scalar(s) {
        const result = new Matrix(this.rows, this.cols);
        for (let i = 0; i < result.rows; i++) {
            for (let j = 0; j < result.cols; j++) {
                result.data[this.at(i, j)] = this.data[this.at(i, j)] * s;
            }
        }
        return result;
    }
    multiply(mat) {
        if (this.cols !== mat.rows) {
            throw new Error(`Cannot multiply ${this.rows}x${this.cols} by ${mat.rows}x${mat.cols}`);
        }
        const result = new Matrix(this.rows, mat.cols);
        let n = this.cols || mat.rows;
        for (let i = 0; i < result.rows; i++) {
            for (let j = 0; j < result.cols; j++) {
                for (let k = 0; k < n; k++) {
                    result.data[this.at(i, j)] += this.data[this.at(i, k)] * mat.data[this.at(k, j)];
                }
            }
        }
        return result;
    }
    scale(sx, sy) {
        const scaleMat = new Matrix(3, 3, [
            sx, 0, 0,
            0, sy, 0,
            0, 0, 0
        ]);
        return this.multiply(scaleMat);
    }
    /**
     * Rotates counter-clockwise
     * @param angleRadian The angle
     */
    rotate(angleRadian) {
        const cos = Math.cos(angleRadian);
        const sin = Math.sin(angleRadian);
        const rotateMat = new Matrix(3, 3, [
            cos, sin, 0,
            -sin, cos, 0,
            0, 0, 1
        ]);
        return this.multiply(rotateMat);
    }
    translate(dx, dy) {
        const translationMat = new Matrix(3, 3, [
            1, 0, 0,
            0, 1, 0,
            dx, dy, 0
        ]);
        return this.multiply(translationMat);
    }
    static identity() {
        return new Matrix(3, 3, [
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ]);
    }
}
export { Matrix };
//# sourceMappingURL=matrix.js.map