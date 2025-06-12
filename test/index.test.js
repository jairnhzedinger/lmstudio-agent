import assert from 'assert';
import fs from 'fs';
import {mkdtempSync} from 'fs';
import {tmpdir} from 'os';
import {join} from 'path';
import {spawnSync} from 'child_process';
import {test} from 'node:test';
import {loadProjectDocs, runCommand, applyPatch, readFile, listFiles, writeFile, processChat} from '../index.js';
import * as agent from '../index.js';
import {loadProjectDocs, runCommand, applyPatch, readFile, listFiles, writeFile} from '../index.js';


test('loadProjectDocs inclui conteudo do README', () => {
  const docs = agent.loadProjectDocs();
  assert.ok(docs.includes('Agente LM Studio'));
});

test('runCommand retorna saida do comando', () => {
  const out = agent.runCommand('echo hello');
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
  const result = agent.applyPatch(diff);
  assert.strictEqual(result.trim(), 'patch aplicado com sucesso');
  const content = fs.readFileSync('foo.txt', 'utf8');
  assert.strictEqual(content, 'world\n');
  process.chdir(cwd);
});

test('readFile retorna conteudo correto', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agent-test-'));
  const file = join(dir, 'example.txt');
  fs.writeFileSync(file, 'conteudo');
  const out = agent.readFile(file);
  assert.strictEqual(out, 'conteudo');
});

test('listFiles lista arquivos do diretorio', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agent-test-'));
  fs.writeFileSync(join(dir, 'a.txt'), '');
  fs.writeFileSync(join(dir, 'b.txt'), '');
  const out = agent.listFiles(dir);
  assert.ok(out.includes('a.txt'));
  assert.ok(out.includes('b.txt'));
});

test('writeFile grava dados em arquivo', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agent-test-'));
  const file = join(dir, 'saida.txt');
  const result = writeFile(file, 'dados');
  const content = fs.readFileSync(file, 'utf8');
  assert.strictEqual(result.trim(), 'arquivo escrito com sucesso');
  assert.strictEqual(content, 'dados');
});

test('processChat lida com JSON invalido', async () => {
  const messages = [{role: 'system', content: 'teste'}];
  let called = false;
  const fakeChat = async () => {
    if(called) return {role: 'assistant', content: 'ok'};
    called = true;
    return {role: 'assistant', function_call: {name: 'cmd', arguments: '{'}};
  };
  await processChat(messages, fakeChat);
  const funcMsg = messages[messages.length - 2];
  assert.ok(funcMsg.content.startsWith('erro ao processar argumentos'));
test('processChat lida com JSON inválido', async () => {
  const originalChat = agent.chat;
  let call = 0;
  agent.setChat(async () => {
    call++;
    if (call === 1) {
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
test('writeFile cria e grava conteudo', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agent-test-'));
  const file = join(dir, 'novo.txt');
  const msg = writeFile(file, 'abc');
  const data = fs.readFileSync(file, 'utf8');
  assert.strictEqual(data, 'abc');
  assert.strictEqual(msg.trim(), 'arquivo escrito com sucesso');
});
