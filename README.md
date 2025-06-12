# Agente LM Studio

Este pacote implementa um agente simples para interagir com um LLM local executado via [LM Studio](https://lmstudio.ai).

## Uso

```bash
pnpm install --global .
lmstudio-agent "Descreva sua tarefa"
```

Se receber `lmstudio-agent: command not found`, verifique se o diretório de binários globais do pnpm está no seu `PATH`.
Execute `pnpm setup` ou adicione `~/.local/share/pnpm` (ou o caminho equivalente no seu sistema) à variável `PATH`.

O agente comunica‑se com o endpoint OpenAI compatível do LM Studio (por padrão `http://localhost:1234/v1`).

Variáveis de ambiente:

- `LM_BASE_URL` – URL da API do LM Studio.
- `LM_MODEL` – modelo a ser utilizado.

O agente suporta três funções especiais que o modelo pode acionar:

- `cmd` – executa um comando no shell e retorna a saída.
- `apply_patch` – aplica um patch Git no repositório atual.
- `done` – encerra a sessão.

## Licença

Distribuído sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.
