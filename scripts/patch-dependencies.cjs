// query-string 7 is CommonJS; the security-fixed decoder 0.5 is ESM.
// Keep the upstream algorithm intact and normalize only its module namespace.
const fs = require('node:fs');
const path = require('node:path');
const target = require.resolve('query-string');
const original = "const decodeComponent = require('decode-uri-component');";
const replacement =
  "const decoderModule = require('decode-uri-component');\nconst decodeComponent = decoderModule.default || decoderModule;";
const source = fs.readFileSync(target, 'utf8');
if (source.includes(replacement)) process.exit(0);
if (!source.includes(original)) {
  throw new Error(
    `Review the decoder compatibility patch for ${path.basename(path.dirname(target))}: upstream source changed.`,
  );
}
fs.writeFileSync(target, source.replace(original, replacement));
process.stdout.write('Applied query-string decoder module compatibility patch.\n');
