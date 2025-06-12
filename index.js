#!/usr/bin/env node
import {spawnSync} from 'child_process';
import fs from 'fs';
import path from 'path';
import process from 'process';

const API_BASE = process.env.LM_BASE_URL || 'http://192.168.3.159:1234/v1';
const MODEL = process.env.LM_MODEL || 'google/gemma-3-4b';

async function chat(messages) {
  let res;
  try {
    res = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0,
        functions: [
        {
          name: 'cmd',
          description: 'Executa um comando no shell',
          parameters: {
            type: 'object',
            properties: {
              command: { type: 'string' }
            },
            required: ['command']
          }
        },
        {
          name: 'apply_patch',
          description: 'Aplica um patch git',
          parameters: {
            type: 'object',
            properties: {
              patch: { type: 'string' }
            },
            required: ['patch']
          }
        },
        {
          name: 'done',
          description: 'Finaliza a sessão',
          parameters: { type: 'object', properties: {} }
        }
      ]
    })
    });
  } catch (err) {
    console.error(`Could not connect to LM Studio API at ${API_BASE}`);
    throw err;
  }
  if(!res.ok){
    throw new Error(`Erro HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.choices[0].message;
}

function runCommand(cmd) {
  const result = spawnSync(cmd, {shell: true, encoding: 'utf8'});
  return result.stdout + result.stderr;
}

function applyPatch(patch) {
  const proc = spawnSync('git', ['apply', '--whitespace=nowarn'], {
    input: patch,
    encoding: 'utf8'
  });
  if(proc.status !== 0) {
    return `erro ao aplicar patch: ${proc.stderr}`;
  }
  return 'patch aplicado com sucesso';
}

function loadProjectDocs() {
  const docFiles = ['README.md', path.join('codex-rs', 'README.md')];
  let docs = '';
  for (const file of docFiles) {
    try {
      const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      docs += `\n### ${file}\n` + content;
    } catch {
      // ignore missing files
    }
  }
  return docs;
}

async function main() {
  const prompt = process.argv.slice(2).join(' ');
  if(!prompt){
    console.log('Uso: lmstudio-agent "sua instrução"');
    process.exit(1);
  }
  const docs = loadProjectDocs();
  let systemContent = 'Você é um agente de código que executa comandos e aplica patches usando funções.';
  if(docs) {
    systemContent += '\n\nContexto do projeto:\n' + docs;
  }
  const messages = [
    {role: 'system', content: systemContent},
    {role: 'user', content: prompt}
  ];
  while(true){
    const msg = await chat(messages);
    if(msg.function_call){
      const {name, arguments: args} = msg.function_call;
      let result = '';
      if(name === 'cmd'){
        const {command} = JSON.parse(args);
        result = runCommand(command);
      } else if(name === 'apply_patch'){
        const {patch} = JSON.parse(args);
        result = applyPatch(patch);
      } else if(name === 'done'){
        console.log('Tarefa concluída.');
        break;
      }
      messages.push({role: 'assistant', content: null, function_call: msg.function_call});
      messages.push({role: 'function', name, content: result});
      continue;
    }
    console.log(msg.content);
    break;
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
