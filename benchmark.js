/**
 * Benchmark: getStartPattern x 1000 iterations
 *
 * Mocks vscode.workspace.getConfiguration so this runs in plain Node.js.
 * Run with:  node benchmark.js
 */

'use strict';

const Module = require('module');

// ── Intercept 'vscode' before any require resolves it ─────────────────────────
const originalResolve = Module._resolveFilename.bind(Module);
Module._resolveFilename = (request, ...args) => {
	if (request === 'vscode') return 'vscode';
	return originalResolve(request, ...args);
};

const mockConfig = {
	get: (_key) => undefined,  // no overrides → falls back to markers.json
};

require.cache['vscode'] = {
	id: 'vscode',
	filename: 'vscode',
	loaded: true,
	exports: {
		workspace: {
			getConfiguration: (_section) => mockConfig,
		},
	},
};

// ── Load markers.json ──────────────────────────────────────────────────────────
const markers = require('./src/markers.json');

// ── Inline implementation matching utils.ts ────────────────────────────────────
function getStartPattern(languageId) {
	const config = require('vscode').workspace.getConfiguration();
	const markersOverrides = config.get('region-viewer');
	return markersOverrides?.[languageId]?.start ?? markers[languageId]?.start;
}

// ── Benchmark ──────────────────────────────────────────────────────────────────
const ITERATIONS = 1000;
// const languages = Object.keys(markers).filter(k => k !== 'colors');
const languages = ['cpp'];

console.log(`Languages in markers.json: ${languages.join(', ')}\n`);

// Warm-up (avoids JIT cold-start skewing first results)
for (let i = 0; i < 100; i++) {
	for (const lang of languages) {
		const startPattern = getStartPattern(lang);
		const regEx = new RegExp(startPattern, 'g');
	}
}

// Timed run – 1000 full sweeps across all languages
const t0 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
	for (const lang of languages) {
		const startPattern = getStartPattern(lang);
		const regEx = new RegExp(startPattern, 'g');
	}
}
const t1 = performance.now();

const totalMs   = t1 - t0;
const callCount = ITERATIONS * languages.length;
const perCallUs = (totalMs / callCount) * 1000;

console.log(`Iterations        : ${ITERATIONS}`);
console.log(`Languages per iter: ${languages.length}`);
console.log(`Total calls       : ${callCount.toLocaleString()}`);
console.log(`Total time        : ${totalMs.toFixed(3)} ms`);
console.log(`Per call          : ${perCallUs.toFixed(3)} µs`);
console.log();

// Spot-check a few results
for (const lang of ['typescript', 'python', 'cpp', 'nonexistent']) {
	console.log(`  getStartPattern('${lang}') => ${JSON.stringify(getStartPattern(lang))}`);
}
