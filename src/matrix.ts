
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
        return (this.cols * row) + column;
    }

    x(): number {
        return this.data[this.at(0, 0)];
    }

    y(): number {
        return this.data[this.at(0, 1)];
    }

    add(mat: Matrix): Matrix {
        if (this.rows !== mat.rows || this.cols !== mat.cols) {
            throw new Error(`Cannot add ${this.rows}x${this.cols} with ${mat.rows}x${mat.cols}`);
        }
        const result = new Matrix(mat.rows, mat.cols);

        for (let i = 0; i < result.rows; i++) {
            for (let j = 0; j < result.cols; j++) {
                result.data[this.at(i, j)] = this.data[this.at(i, j)] + mat.data[this.at(i, j)]
            }
        }

        return result;
    }

    subtract(mat: Matrix): Matrix {
        if (this.rows !== mat.rows || this.cols !== mat.cols) {
            throw new Error(`Cannot subtract ${this.rows}x${this.cols} with ${mat.rows}x${mat.cols}`);
        }
        const result = new Matrix(mat.rows, mat.cols);

        for (let i = 0; i < result.rows; i++) {
            for (let j = 0; j < result.cols; j++) {
                result.data[this.at(i, j)] = this.data[this.at(i, j)] - mat.data[this.at(i, j)]
            }
        }

        return result;
    }


    div(mat: Matrix): Matrix {
        if (this.rows !== mat.rows || this.cols !== mat.cols) {
            throw new Error(`Cannot divide ${this.rows}x${this.cols} with ${mat.rows}x${mat.cols}`);
        }
        const result = new Matrix(mat.rows, mat.cols);

        for (let i = 0; i < result.rows; i++) {
            for (let j = 0; j < result.cols; j++) {
                result.data[this.at(i, j)] = this.data[this.at(i, j)] / mat.data[this.at(i, j)]
            }
        }

        return result;
    }

    scalar(s: number) {
        const result = new Matrix(this.rows, this.cols);

        for (let i = 0; i < result.rows; i++) {
            for (let j = 0; j < result.cols; j++) {
                result.data[this.at(i, j)] = this.data[this.at(i, j)] * s;
            }
        }

        return result;
    }

    multiply(right: Matrix): Matrix {
        const left = this;
        if (left.cols !== right.rows) {
            throw new Error(`Cannot multiply ${left.rows}x${left.cols} by ${right.rows}x${right.cols}`);
        }

        const result = new Matrix(left.rows, right.cols);
        let n = left.cols || right.rows;
        for (let i = 0; i < result.rows; i++) {
            for (let j = 0; j < result.cols; j++) {
                for (let k = 0; k < n; k++) {
                    result.data[result.at(i,j)] += left.data[left.at(i, k)] * right.data[right.at(k, j)];
                }
            }
        }

        return result;
    }


    static scale(sx: number, sy: number): Matrix {
        const scaleMat = new Matrix(3, 3, [
            sx, 0,  0,
            0,  sy, 0,
            0,  0,  1
        ])

        return scaleMat;
    }

    /**
     * Rotates counter-clockwise
     * @param angleRadian The angle
     */
    static rotate(angleRadian: number): Matrix {
        const cos = Math.cos(angleRadian);
        const sin = Math.sin(angleRadian);
        const rotateMat = new Matrix(3, 3, [
            cos , sin, 0,
            -sin, cos, 0,
            0   , 0  , 1
        ])

        return rotateMat;
    }

    static translate(dx: number, dy: number): Matrix {
        const translationMat = new Matrix(3, 3, [
            1,  0,  0,
            0,  1,  0,
            dx, dy, 1
        ])

        return translationMat;
    }

    static projection(clientWidth: number, clientHeight: number): Matrix {
        const zeroToOne = Matrix.scale(1 / clientWidth, 1 / clientHeight);
        const zeroToTwo = zeroToOne.multiply(Matrix.scale(2, 2));
        const minusOneToOne = zeroToTwo.multiply(Matrix.translate(-1, -1));
        return minusOneToOne;
    }

    determinant(): number {
        if (this.rows !== 3 || this.cols !== 3) {
            throw new Error("Determinant calculation is only implemented for 3x3 matrices");
        }

        const [a, b, c, d, e, f, g, h, i] = this.data;

        return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    }

    adjugate(): Matrix {
        if (this.rows !== 3 || this.cols !== 3) {
            throw new Error("Adjugate calculation is only implemented for 3x3 matrices");
        }

        const [
            a, b, c, 
            d, e, f, 
            g, h, i
        ] = this.data;

        return new Matrix(3, 3, [
            (e * i - f * h), -(b * i - c * h), (b * f - c * e),
            -(d * i - f * g), (a * i - c * g), -(a * f - c * d),
            (d * h - e * g), -(a * h - b * g), (a * e - b * d)
        ]);
    }

    inverse(): Matrix {
        if (this.rows !== 3 || this.cols !== 3) {
            throw new Error("Inverse calculation is only implemented for 3x3 matrices");
        }

        const det = this.determinant();

        if (Number.isNaN(det)) {
            throw new Error("Matrix is not invertible (determinant is close to zero)");
        }

        const adj = this.adjugate();
        return adj.scalar(1 / det);
    }

    transpose(): Matrix {
        const result = new Matrix(this.cols, this.rows);
        
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                result.data[result.at(j, i)] = this.data[this.at(i, j)];
            }
        }
        
        return result;
    }


    static identity(): Matrix {
        return new Matrix(3, 3, [
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ])
    }

    toString(): string {
        let result = "";

        for (let i = 0; i < this.rows * this.cols; i++) {
            result += `${this.data[i]}  `;

            if ((i + 1) % 3 === 0 && i !== 0) result += '\n';
        }

        return result;
    }
   
}

export { Matrix }
