import { resolve } from 'node:path';
import { zipBundle } from './lib/index.js';
import { IS_FIREFOX } from '@extension/env';
var YYYY_MM_DD = new Date().toISOString().slice(0, 10).replace(/-/g, '');
var HH_mm_ss = new Date().toISOString().slice(11, 19).replace(/:/g, '');
var fileName = "extension-".concat(YYYY_MM_DD, "-").concat(HH_mm_ss);
await zipBundle({
    distDirectory: resolve(import.meta.dirname, '..', '..', '..', 'dist'),
    buildDirectory: resolve(import.meta.dirname, '..', '..', '..', 'dist-zip'),
    archiveName: IS_FIREFOX ? "".concat(fileName, ".xpi") : "".concat(fileName, ".zip"),
});
