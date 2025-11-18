#!/usr/bin/env node
const path = require('path');
const express = require('express');

// Create express application
const app = express();
// Settings
const hostname = 'localhost';
const port = 8080;
const enableCORS = true;               // set true if your build will load cross-origin
const enableWasmMultithreading = true; // set true if built with multithreading (SharedArrayBuffer)

// Serve the current working directory (or change to your build folder)
const unityBuildPath = __dirname;

// Middleware to set headers Unity needs
app.use((req, res, next) => {
    var reqPath = req.url;

    // Provide COOP, COEP and CORP headers for SharedArrayBuffer multithreading
    if (enableWasmMultithreading &&
        (
            reqPath == '/' ||
            reqPath.includes('.js') ||
            reqPath.includes('.html') ||
            reqPath.includes('.htm')
        )
    ) {
        res.set('Cross-Origin-Opener-Policy', 'same-origin');
        res.set('Cross-Origin-Embedder-Policy', 'require-corp');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    }

    // CORS
    if (enableCORS) {
        res.set('Access-Control-Allow-Origin', '*');
    }

    // If serving pre-compressed files (e.g. file.js.gz or file.wasm.br) set Content-Encoding
    if (reqPath.endsWith('.br')) {
        res.set('Content-Encoding', 'br');
    } else if (reqPath.endsWith('.gz')) {
        res.set('Content-Encoding', 'gzip');
    }

    // Explicit content types for Unity file types (prevents wrong mime-type issues)
    if (reqPath.includes('.wasm')) {
        res.set('Content-Type', 'application/wasm');
    } else if (reqPath.includes('.js')) {
        res.set('Content-Type', 'application/javascript');
    } else if (reqPath.includes('.json')) {
        res.set('Content-Type', 'application/json');
    } else if (
        reqPath.includes('.data') ||
        reqPath.includes('.bundle') ||
        reqPath.endsWith('.unityweb')
    ) {
        res.set('Content-Type', 'application/octet-stream');
    }

    // Ignore cache-control: no-cache when revalidation headers are present, Unity loader manages caching
    if (req.headers['cache-control'] == 'no-cache' &&
        (req.headers['if-modified-since'] || req.headers['if-none-match'])
    ) {
        delete req.headers['cache-control'];
    }

    next();
});

// Serve static files (the unity build output)
app.use('/', express.static(unityBuildPath, { immutable: true }));

const server = app.listen(port, hostname, () => {
    console.log(`Web server serving directory ${unityBuildPath} at http://${hostname}:${port}`);
});

server.addListener('error', (error) => {
    console.error(error);
});

server.addListener('close', () => {
    console.log('Server stopped.');
    process.exit();
});