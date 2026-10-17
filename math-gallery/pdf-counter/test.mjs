import assert from 'node:assert/strict';
import {countText,pageText} from './count.mjs';
assert.deepEqual(countText('가나다 abc 12!'),{withSpace:11,withoutSpace:9});
assert.deepEqual(countText('한 👨‍👩‍👧‍👦\nA\tB'),{withSpace:7,withoutSpace:4});
assert.deepEqual(countText(''),{withSpace:0,withoutSpace:0});
assert.equal(pageText([{str:'Hello',hasEOL:true},{str:'PDF'}]),'Hello\nPDF');
console.log('PASS: Korean, NFC, emoji, whitespace and PDF text items');
