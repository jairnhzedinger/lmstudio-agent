import assert from 'assert';
import fs from 'fs';
import {mkdtempSync} from 'fs';
import {tmpdir} from 'os';
import {join} from 'path';
import {spawnSync} from 'child_process';
import {test} from 'node:test';
import {loadProjectDocs, runCommand, applyPatch} from '../index.js';


test('loadProjectDocs inclui conteudo do README', () => {
  const docs = loadProjectDocs();
  assert.ok(docs.includes('Agente LM Studio'));
});

test('runCommand retorna saida do comando', () => {
  const out = runCommand('echo hello');
  assert.strictEqual(out.trim(), 'hello');
});

test('applyPatch aplica patch git', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agent-test-'));
  const cwd = process.cwd();
  process.chdir(dir);
  spawnSync('git', ['init'], {encoding: 'utf8'});
  fs.writeFileSync('foo.txt', 'hello\n');
  spawnSync('git', ['add', 'foo.txt'], {encoding: 'utf8'});
  spawnSync('git', ['commit', '-m', 'init'], {encoding: 'utf8'});
  fs.writeFileSync('foo.txt', 'world\n');
  const diff = spawnSync('git', ['diff'], {encoding: 'utf8'}).stdout;
  spawnSync('git', ['checkout', '--', 'foo.txt'], {encoding: 'utf8'});
  const result = applyPatch(diff);
  assert.strictEqual(result.trim(), 'patch aplicado com sucesso');
  const content = fs.readFileSync('foo.txt', 'utf8');
  assert.strictEqual(content, 'world\n');
  process.chdir(cwd);
});
