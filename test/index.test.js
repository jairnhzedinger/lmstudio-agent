import assert from 'assert';
import fs from 'fs';
import {mkdtempSync} from 'fs';
import {tmpdir} from 'os';
import {join} from 'path';
import {spawnSync} from 'child_process';
import {test} from 'node:test';
import * as agent from '../index.js';

// verifica se o README é incorporado
test('loadProjectDocs inclui conteudo do README', () => {
  const docs = agent.loadProjectDocs();
  assert.ok(docs.includes('Agente LM Studio'));
});

// confirma execucao de comandos
test('runCommand retorna saida do comando', () => {
  const out = agent.runCommand('echo hello');
  assert.strictEqual(out.trim(), 'hello');
});

// aplica patch git em repositorio temporario
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
  const result = agent.applyPatch(diff);
  assert.strictEqual(result.trim(), 'patch aplicado com sucesso');
  const content = fs.readFileSync('foo.txt', 'utf8');
  assert.strictEqual(content, 'world\n');
  process.chdir(cwd);
});

// leitura de arquivo
test('readFile retorna conteudo correto', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agent-test-'));
  const file = join(dir, 'exemplo.txt');
  fs.writeFileSync(file, 'conteudo');
  const out = agent.readFile(file);
  assert.strictEqual(out, 'conteudo');
});

// listagem de diretorios
test('listFiles lista arquivos do diretorio', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agent-test-'));
  fs.writeFileSync(join(dir, 'a.txt'), '');
  fs.writeFileSync(join(dir, 'b.txt'), '');
  const out = agent.listFiles(dir);
  assert.ok(out.includes('a.txt'));
  assert.ok(out.includes('b.txt'));
});

// gravacao em disco
test('writeFile grava dados em arquivo', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agent-test-'));
  const file = join(dir, 'saida.txt');
  const result = agent.writeFile(file, 'dados');
  const content = fs.readFileSync(file, 'utf8');
  assert.strictEqual(result.trim(), 'arquivo escrito com sucesso');
  assert.strictEqual(content, 'dados');
});

// processChat deve lidar com JSON mal formado
test('processChat lida com JSON invalido', async () => {
  const originalChat = agent.chat;
  let first = true;
  agent.setChat(async () => {
    if (first) {
      first = false;
      return {function_call: {name: 'cmd', arguments: '{oops'}};
    }
    return {content: 'fim'};
  });
  const msgs = [{role: 'user', content: 'oi'}];
  const cont = await agent.processChat(msgs);
  assert.ok(cont);
  assert.strictEqual(msgs[1].role, 'assistant');
  assert.ok(msgs[2].content.startsWith('erro ao analisar'));
  agent.setChat(originalChat);
});
