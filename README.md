# Agente LM Studio

Este pacote implementa um agente simples para interagir com um LLM local executado via [LM Studio](https://lmstudio.ai).

## Uso

```bash
pnpm install --global .
lmstudio-agent "Descreva sua tarefa"
```

Para um bate-papo interativo, execute:

```bash
lmstudio-agent --repl
```
Digite `exit` para sair do modo interativo.

### Exemplo

Para descobrir a versão do sistema operacional você pode executar:

```bash
lmstudio-agent "Qual a versão do meu sistema?"
```
O modelo utiliza a função `cmd` para rodar comandos como `uname -a` ou `lsb_release -a` e retornar o resultado.

Se receber `lmstudio-agent: command not found`, verifique se o diretório de binários globais do pnpm está no seu `PATH`.
Execute `pnpm setup` ou adicione `~/.local/share/pnpm` (ou o caminho equivalente no seu sistema) à variável `PATH`.

O agente comunica‑se com o endpoint OpenAI compatível do LM Studio (por padrão `http://45.161.201.27:1234/v1`).

Variáveis de ambiente:

- `LM_BASE_URL` – URL da API do LM Studio.
- `LM_MODEL` – modelo a ser utilizado.
- `LM_TEMPERATURE` – temperatura das respostas (padrão 0.7).
- `LM_MAX_TOKENS` – limite máximo de tokens (padrão -1).
- `LM_STREAM` – defina como `true` para habilitar streaming.

### Requisição com `curl`

O exemplo abaixo mostra como enviar manualmente uma mensagem para o LM Studio:

```bash
curl http://localhost:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/gemma-3-12b",
    "messages": [
      { "role": "system", "content": "Always answer in rhymes. Today is Thursday" },
      { "role": "user", "content": "What day is it today?" }
    ],
    "temperature": 0.7,
    "max_tokens": -1,
    "stream": false
}'
```

O agente suporta várias funções especiais que o modelo pode acionar:

- `cmd` – executa um comando no shell e retorna a saída.
- `apply_patch` – aplica um patch Git no repositório atual.
- `read_file` – lê o conteúdo de um arquivo.
- `list_files` – lista os arquivos de um diretório.
- `write_file` – grava texto em um arquivo.
- `done` – encerra a sessão.

## Dicas de prompt

Para garantir que o modelo execute as ações desejadas, inclua instruções claras
no seu pedido. Por exemplo:

```bash
lmstudio-agent "Use \`cmd\` para executar 'htop -v' e mostre somente a saída"
```

Modelos tendem a imitar o formato do exemplo e a chamar as funções em vez de
apenas descrever o que fariam.

### Testes

Execute `npm test` para rodar a suíte de testes automatizados.

## Licença

Distribuído sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.
