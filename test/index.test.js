import assert from 'assert';
import fs from 'fs';
import {mkdtempSync} from 'fs';
import {tmpdir} from 'os';
import {join} from 'path';
import {spawnSync} from 'child_process';
import {test} from 'node:test';
import {loadProjectDocs, runCommand, applyPatch, readFile, listFiles, writeFile} from '../index.js';


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

test('readFile retorna conteudo correto', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agent-test-'));
  const file = join(dir, 'example.txt');
  fs.writeFileSync(file, 'conteudo');
  const out = readFile(file);
  assert.strictEqual(out, 'conteudo');
});

test('listFiles lista arquivos do diretorio', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agent-test-'));
  fs.writeFileSync(join(dir, 'a.txt'), '');
  fs.writeFileSync(join(dir, 'b.txt'), '');
  const out = listFiles(dir);
  assert.ok(out.includes('a.txt'));
  assert.ok(out.includes('b.txt'));
});

test('writeFile cria e grava conteudo', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agent-test-'));
  const file = join(dir, 'novo.txt');
  const msg = writeFile(file, 'abc');
  const data = fs.readFileSync(file, 'utf8');
  assert.strictEqual(data, 'abc');
  assert.strictEqual(msg.trim(), 'arquivo escrito com sucesso');
});
