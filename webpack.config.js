const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';
    return {
        mode: isProduction ? 'production' : 'development',
        entry: {
            'main': './src/index.ts',
            'graph-worker': './src/graph-worker.ts',
        },
        devtool: 'eval-source-map',
        devServer: {
            static: {
                directory: path.join(__dirname, 'dist'),
            },
            compress: true,
            port: 8000,
            hot: false,
            liveReload: true,
            allowedHosts: "all"
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
            ],
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
        },
        output: {
            filename: '[name].js',
            path: path.resolve(__dirname, 'dist'),
        },
        plugins: [
            new CopyWebpackPlugin({
                patterns: [
                    { from: './src/index.html', to: '' },
                    { from: './src/external/osm-read-pbf.js', to: '' },
                    { from: 'assets', to: 'assets' }
                ],
            }),
        ],
        performance: {
            hints: false,
            maxEntrypointSize: 512000,
            maxAssetSize: 512000
        }
    }
};