//import chalk from 'chalk';
import * as webpack from 'webpack';
import * as path from 'path';

import * as HtmlWebpackPlugin from 'html-webpack-plugin';
//import CopyWebpackPlugin from 'copy-webpack-plugin';
//import * as MiniCssExtractPlugin from "mini-css-extract-plugin";
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const postcssNext = require('postcss-cssnext');
const postcssImport = require('postcss-import');
const postcssExtend = require('postcss-extend');
const postcssReporter = require('postcss-reporter');
//import StyleLintPlugin from 'stylelint-webpack-plugin';
const BrowserSyncPlugin = require('browser-sync-webpack-plugin');
//import * as _ from 'lodash';


const postcssProcessors = [
    postcssImport,
    postcssExtend,
    postcssNext,
    postcssReporter({
        clearReportedMessages: true
    }),
];

const scssProcessors = [
    postcssReporter({
        clearReportedMessages: true
    }),
];

const basePath = '.' + path.sep + 'src';
const appBasePath = basePath + path.sep + 'app'; 
const sourcePath = basePath + path.sep + 'ts';
const htmlTemplatePath = appBasePath + path.sep + 'index.html';

export default (env: any) => {



    //const stylesType = process.env.STYLES; // postcss or scss
    //const stylesExtension = stylesType === 'scss' ? '.scss' : '.css';

    const config: webpack.Configuration = {

        mode: (env.dev) ? 'development' : 'production',

        context: __dirname,

        resolve: {
            extensions: ['.js', '.ts'],
            alias: {
                //'ts': path.join(__dirname, path.join('src', 'ts')),
                'less': path.join(__dirname, path.join('src', 'less')),
                'css': path.join(__dirname, path.join('src', 'css')),
            }
        },

        entry: {
            // non-ES6 (Prototype/concat build) needs a dummy name or it will overwrite
            //[process.env.ES6 ? 'goldenlayout' : 'dummy']: env.dev ? ('.' + path.sep + 'app.js') : ('.' + path.sep + 'index.js'),
            'goldenlayout': env.dev ? (appBasePath + path.sep + 'index.js') : (sourcePath + path.sep + 'index.ts'),
        },

        externals: {
            'jQuery': 'jquery',
        },

        output: Object.assign({
            path: path.resolve(__dirname, 'dist'),
            //publicPath: './dist/',
            filename: path.join('js', '[name].js'),
        }, process.env.dev ? {} : {
            library: 'GoldenLayout',
            libraryTarget: 'umd', // should be umd for npm-package
            umdNamedDefine: true
        }),

        watch: env.dev || env.build_watch,

        devtool: 'cheap-module-source-map',

        // devServer: {
        //     contentBase: path.join(__dirname, 'dist'),
        //     watchContentBase: true,
        // },

        module: {
            rules: [
                {
                    test: /\.less$/,
                    use: [MiniCssExtractPlugin.loader, 'css-loader', 'less-loader']
                },
                {
                    test: /\.ts$/,
                    include: [
                        path.resolve(__dirname, './src/ts'),
                        //path.join(__dirname, 'test'),
                        //path.join(__dirname, 'test/specs')
                    ],
                    exclude: /node_modules/,
                    loader: 'ts-loader',
                },
                {
                    test: /\.css$/,
                    use: [
                        {
                            loader: MiniCssExtractPlugin.loader
                        },
                        {
                            loader: 'css-loader',
                            options: {
                                sourceMap: true,
                            },
                        },
                        {
                            loader: 'postcss-loader',
                            options: {
                                sourceMap: true,
                                plugins: postcssProcessors,
                            },
                        }],
                    //publicPath: '../',
                },
                {
                    test: /\.scss$/,
                    use: [
                        
                        {
                        loader: 'css-loader',
                        options: {
                            sourceMap: true,
                        },
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            sourceMap: true,
                            plugins: scssProcessors,
                        },
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            sourceMap: true,
                        },
                    }],
                },
                {
                    test: /.*\.(gif|png|jpe?g|svg)$/i,
                    use: [{
                        loader: 'file-loader',
                        options: {
                            name: 'assets/[name].[ext]',
                        },
                    },],
                },
                {
                    test: /\.(woff2?|ttf|eot)(\?v=\d+\.\d+\.\d+)?$/,
                    use: [{
                        loader: 'file-loader',
                        options: {
                            name: path.join('assets', '[name].[ext]'),
                        },
                    },],
                },
            ]
        },

        plugins: [
            new webpack.ProvidePlugin({
                $: 'jquery',
                jQuery: 'jquery',
                'window.jQuery': 'jquery'
            }),

            new webpack.DefinePlugin({
                env: JSON.stringify(process.env)
            }),

            new MiniCssExtractPlugin({
                filename: path.join('css', 'goldenlayout.css')

            }),


            // new StyleLintPlugin({
            //     configFile: '.stylelintrc',
            //     context: path.join('src', stylesType),
            //     files: '**/*' + stylesExtension,
            //     failOnError: false,
            //     quiet: true,
            // }),
        ].concat(env.dev ? [

            new HtmlWebpackPlugin({
                template: htmlTemplatePath,
                support_library: path.join('lib', 'jquery.js')
            }),

            new BrowserSyncPlugin({
                files: './dist/**/*.*',
                hostname: 'localhost',
                port: 8080,
                server: {
                    baseDir: ['dist']
                },
                reloadDelay: 50,
                injectChanges: false,
                reloadDebounce: 500,
                reloadOnRestart: true
            }),
        ] : [
                //new MinifyPlugin,
            ]),
    }

    return config;
};

