/**
 * Test restore on single file with debug output
 */
import fs from 'fs';

const filePath = 'scenes/v2/composite/baseline/anal-interest.json';
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

console.log('Line 48:', JSON.stringify(lines[47]));
console.log('Line 49:', JSON.stringify(lines[48]));
console.log('Trimmed 48:', JSON.stringify(lines[47].trim()));
console.log('Trimmed 49:', JSON.stringify(lines[48].trim()));

const trimmed48 = lines[47].trim();
const trimmed49 = lines[48].trim();

console.log('\nTest: trimmed48 === "]":', trimmed48 === ']');
console.log('Test: /^"[^"]+":/.test(trimmed49):', /^"[^"]+":/.test(trimmed49));
console.log('Both true?:', trimmed48 === ']' && /^"[^"]+":/.test(trimmed49));
