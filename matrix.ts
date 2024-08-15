
class Matrix {
    rows: number;
    cols: number;
    data: number[] = [];

    constructor(rows: number, cols: number, data?: number[]){
        this.rows = rows;
        this.cols = cols;
        if (data) {
            if (this.rows * this.cols != data.length) {
                throw new Error(`Data array size mismatch. Expected ${this.rows * this.cols}, received ${data.length}`)
            }
            this.data = data;
        } else {
            this.data = new Array(this.rows * this.cols).fill(0);
        }
    }

    at(row: number, column :number): number {
        return this.rows * row + column;
    }

    multiply(mat: Matrix): Matrix {
        if (this.cols !== mat.rows) {
            throw new Error(`Cannot multiply ${this.rows}x${this.cols} by ${mat.rows}x${mat.cols}`);
        }

        const result = new Matrix(this.rows, mat.cols);
        let n = this.cols || mat.rows;
        for (let i = 0; i < result.rows; i++) {
            for (let j = 0; j < result.cols; j++) {
                for (let k = 0; k < n; k++) {
                    result.data[this.at(i,j)] += this.data[this.at(i, k)] * mat.data[this.at(k, j)];
                }
            }
        }

        return result;
    }


    scale(sx: number, sy: number): Matrix {
        const scaleMat = new Matrix(3, 3, [
            sx, 0,  0,
            0,  sy, 0,
            0,  0,  0
        ])

        return this.multiply(scaleMat);
    }

    /**
     * Rotates counter-clockwise
     * @param angleRadian The angle
     */
    rotate(angleRadian: number): Matrix {
        const cos = Math.cos(angleRadian);
        const sin = Math.sin(angleRadian);
        const rotateMat = new Matrix(3, 3, [
            cos , sin, 0,
            -sin, cos, 0,
            0   , 0  , 1
        ])

        return this.multiply(rotateMat);
    }

    translate(dx: number, dy: number): Matrix {
        const translationMat = new Matrix(3, 3, [
            1,  0,  0,
            0,  1,  0,
            dx, dy, 0
        ])

        return this.multiply(translationMat);
    }

    static identity(): Matrix {
        return new Matrix(3, 3, [
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ])
    }
   
}

export { Matrix }