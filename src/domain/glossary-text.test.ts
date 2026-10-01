import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { storyGlossary, type StoryGlossaryId } from '../data/storybook';

const exports: Record<string, unknown> = {};
const modules: Record<string, unknown> = {
  react: { useState: () => [null, () => {}] },
  'react/jsx-runtime': {},
  'react-native': {},
  '@/components/ui/text': {},
  '@/data/storybook': { storyGlossary },
  '@/theme': {},
};
runInNewContext(ts.transpileModule(readFileSync(resolve('src/components/learning/glossary-text.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports, require: (name: string) => { assert.ok(name in modules); return modules[name]; } });
const parts = exports.glossaryParts as (text: string, ids: readonly StoryGlossaryId[]) => { text: string; id?: StoryGlossaryId }[];

test('inline help only recognizes whitelisted authored whole words', () => {
  const text = 'Counterevidence is not Evidence. Assumptions differ from an assumption.';
  const result = parts(text, ['evidence', 'assumption']);
  assert.deepEqual(Array.from(result.filter((part) => part.id), (part) => part.text), ['Evidence', 'assumption']);
  assert.equal(result.map((part) => part.text).join(''), text);
});

test('a term without permission does not gain a highlight or definition', () => {
  assert.equal(parts('Evidence and Friction.', []).some((part) => part.id), false);
  assert.deepEqual(Array.from(parts('Evidence and Friction.', ['evidence']).filter((part) => part.id), (part) => part.id), ['evidence']);
});

test('bounded highlights preserve long text exactly rather than adding a glossary wall', () => {
  const text = 'Evidence '.repeat(50);
  const result = parts(text, ['evidence']);
  assert.ok(result.filter((part) => part.id).length <= 8);
  assert.equal(result.map((part) => part.text).join(''), text);
});
