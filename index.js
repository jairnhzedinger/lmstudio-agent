#!/usr/bin/env node
import {spawnSync} from 'child_process';
import fs from 'fs';
import path from 'path';
import process from 'process';
import readline from 'readline';
import {pathToFileURL} from 'url';

const API_BASE = process.env.LM_BASE_URL || 'http://45.161.201.27:1234/v1';
const MODEL = process.env.LM_MODEL || 'agentica-org_deepcoder-14b-preview';
const TEMPERATURE = process.env.LM_TEMPERATURE
  ? parseFloat(process.env.LM_TEMPERATURE)
  : 0.7;
const MAX_TOKENS = process.env.LM_MAX_TOKENS
  ? parseInt(process.env.LM_MAX_TOKENS, 10)
  : -1;
const STREAM = process.env.LM_STREAM === 'true';

let chat = async function(messages) {
  let res;
  try {
    res = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
        stream: STREAM,
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
          name: 'read_file',
          description: 'Lê o conteúdo de um arquivo',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string' }
            },
            required: ['path']
          }
        },
        {
          name: 'list_files',
          description: 'Lista arquivos em um diretório',
          parameters: {
            type: 'object',
            properties: {
              dir: { type: 'string' }
            },
            required: ['dir']
          }
        },
        {
          name: 'write_file',
          description: 'Escreve conteúdo em um arquivo',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              content: { type: 'string' }
            },
            required: ['path', 'content']
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
};

function setChat(fn) {
  chat = fn;
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
  const candidates = ['README.md', path.join('codex-rs', 'README.md')];
  const existing = candidates.filter(f =>
    fs.existsSync(path.join(process.cwd(), f))
  );
  let docs = '';
  for (const file of existing) {
    const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    docs += `\n### ${file}\n` + content;
  }
  return docs;
}

function readFile(pathname) {
  try {
    return fs.readFileSync(pathname, 'utf8');
  } catch (err) {
    return `erro ao ler arquivo: ${err.message}`;
  }
}

function listFiles(dir) {
  try {
    return fs.readdirSync(dir).join('\n');
  } catch (err) {
    return `erro ao listar arquivos: ${err.message}`;
  }
}

// escreve conteúdo em um arquivo
function writeFile(pathname, content) {
  try {
    fs.writeFileSync(pathname, content, 'utf8');
    return 'arquivo escrito com sucesso';
  } catch (err) {
    return `erro ao escrever arquivo: ${err.message}`;
  }
}

async function processChat(messages, chatFn = chat) {
  while(true){
    const msg = await chatFn(messages);
    if(msg.function_call){
      const {name, arguments: args} = msg.function_call;
      let result = '';
      let parsed;
      try {
        parsed = args ? JSON.parse(args) : {};
      } catch (err) {
        console.warn(`Falha ao analisar JSON: ${err.message}`);
        messages.push({role: 'assistant', content: null, function_call: msg.function_call});
        messages.push({role: 'function', name, content: `erro ao analisar argumentos: ${err.message}`});
        continue;
      }

      if(name === 'cmd'){
        const {command} = parsed;
        result = runCommand(command);
      } else if(name === 'apply_patch'){
        const {patch} = parsed;
        result = applyPatch(patch);
      } else if(name === 'read_file'){
        const {path} = parsed;
        result = readFile(path);
      } else if(name === 'list_files'){
        const {dir} = parsed;
        result = listFiles(dir);
      } else if(name === 'write_file'){
        const {path, content} = parsed;
        result = writeFile(path, content);
      } else if(name === 'done'){
        console.log('Tarefa concluída.');
        return false;
      }
      messages.push({role: 'assistant', content: null, function_call: msg.function_call});
      messages.push({role: 'function', name, content: result});
      continue;
    }
    console.log(msg.content);
    messages.push({role: 'assistant', content: msg.content});
    break;
  }
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const interactive = args.includes('--repl') || args.includes('-i');
  const prompt = args.filter(a => a !== '--repl' && a !== '-i').join(' ');
  if(!prompt && !interactive){
    console.log('Uso: lmstudio-agent "sua instrução" [--repl]');
    process.exit(1);
  }
  const docs = loadProjectDocs();
  let systemContent =
    'Você é a **LM Studio Agent**, um assistente de código que interage ' +
    'com o sistema por meio das funções "cmd" e "apply_patch". ' +
    'Sempre que precisar executar comandos ou alterar arquivos você DEVE ' +
    'chamar a função correspondente, sem apenas descrever a intenção. ' +
    'Responda em português com explicações curtas sobre cada passo. ' +
    'Ao finalizar a tarefa, chame a função "done".';
  if(docs) {
    systemContent += '\n\nContexto do projeto:\n' + docs;
  }
  const messages = [
    {role: 'system', content: systemContent}
  ];

  if(prompt){
    messages.push({role: 'user', content: prompt});
    const cont = await processChat(messages);
    if(!cont) return;
  }

  if(interactive){
    const rl = readline.createInterface({input: process.stdin, output: process.stdout});
    const ask = q => new Promise(res => rl.question(q, res));
    while(true){
      const input = await ask('> ');
      if(!input.trim()) continue;
      if(['exit','quit'].includes(input.trim().toLowerCase())) break;
      messages.push({role: 'user', content: input});
      const cont = await processChat(messages);
      if(!cont) break;
    }
    rl.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
export {
  chat,
  setChat,
  runCommand,
  applyPatch,
  readFile,
  listFiles,
  writeFile,
  loadProjectDocs,
  processChat,
  main
};
