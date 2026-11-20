#!/usr/bin/env node
'use strict';
/**
 * Het Spoor — Node regression test runner (zero dependencies)
 * Usage: node tests/node-tests.mjs [nSeeds]
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const nSeeds = Math.max(1, parseInt(process.argv[2] || '30', 10) || 30);

const ctx = {
  console, Math, Date, JSON, Object, Array, String, Number, Boolean,
  RegExp, Error, TypeError, Set, Map, Promise,
  document: { querySelector: () => null, getElementById: () => null },
  window: {}
};
vm.createContext(ctx);

for (const file of ['content.js', 'lib.js', 'engine.js', 'views.js']) {
  const fullPath = path.join(rootDir, file);
  vm.runInContext(fs.readFileSync(fullPath, 'utf8'), ctx, { filename: file });
}

const t0 = Date.now();
const results = vm.runInContext(`Tests.run(${nSeeds})`, ctx);
const ms = Date.now() - t0;

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok);

console.log(`Het Spoor — Node testsuite (${nSeeds} seeds, ${ms} ms): ${passed}/${results.length} geslaagd`);
for (const r of failed) {
  console.error(`  FAIL: ${r.name}${r.info ? ' — ' + r.info : ''}`);
}

if (failed.length > 0) {
  process.exit(1);
}
