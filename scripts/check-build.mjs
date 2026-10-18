import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
assert.ok(html.includes('https://usions.com/sdk/v2/2.33.0-dev.3/usion-sdk.js'),'Production needs the official SDK');
assert.ok(html.includes('Most')&&html.includes('getParticipants'),'Expected app bundle');
assert.ok(!html.includes('/test/sdk.js')&&!html.includes('LOCAL TEST TRANSPORT'),'Do not deploy mock SDK');
console.log('Production bundle verified');
