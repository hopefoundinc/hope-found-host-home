import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const schema = JSON.parse(readFileSync(path.join(root, 'quizConfig.schema.json'), 'utf8'));
const config = JSON.parse(readFileSync(path.join(root, 'quizConfig.json'), 'utf8'));

const ajv = new Ajv({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);
const validate = ajv.compile(schema);
const valid = validate(config);

if (!valid) {
  console.error('quizConfig.json is INVALID:');
  for (const err of validate.errors) {
    console.error(`  ${err.instancePath || '/'} ${err.message}`);
  }
  process.exit(1);
}

console.log('quizConfig.json is valid.');
