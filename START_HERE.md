# Comece aqui

*English: [START_HERE.en.md](START_HERE.en.md)*

Bem-vindo! Este guia é para quem vai criar funcionalidades aqui **com a ajuda do Claude** (Claude Code), mesmo sem muita experiência com programação. O Claude lê o [`CLAUDE.md`](CLAUDE.md) para as regras técnicas; esta página é para você.

## 1. O que é isto

Este repositório é um app de uma família de **apps de coleção**:

| App | Nicho | Repositório |
|---|---|---|
| Smokership | charutos | `erickmobltda/smokership` |
| Maltship | whisky | `erickmobltda/maltship` |
| Watcheship | relógios | `erickmobltda/watcheship` |

Todos fazem a mesma coisa: mostram um **catálogo**, deixam a pessoa marcar o que **tem** e o que **quer**, **avaliar**, e seguir outras pessoas num **feed** social. Em português e inglês.

Todos os apps usam o mesmo **core** (o código em comum). Cada um tem só a sua **camada de nicho** (catálogo, textos, cores, logo). O core fica em outro repositório, o **blueprint** (`erickmobltda/collector-app-blueprint`), e chega a todos os apps automaticamente. A lista de apps fica no `PRODUCTS.md` do blueprint.

## 2. Palavras que você vai ver (em português claro)

| Palavra | O que é |
|---|---|
| **Repo** (repositório) | A pasta do projeto, com o histórico de todas as mudanças, guardada no GitHub. |
| **Clonar** | Baixar uma cópia do repositório para o seu computador. |
| **Branch** | Uma cópia paralela onde você muda coisas sem afetar a versão oficial (`main`). |
| **Commit** | Uma "foto" salva das suas mudanças, com uma descrição curta. |
| **PR** (pull request) | O pedido para levar as mudanças de uma branch para a `main`. Outras pessoas podem revisar, comentar e aprovar. |
| **CI** | Verificações automáticas que rodam em cada PR (testes, formatação, traduções…). Verde = ok; vermelho = algo a corrigir. |
| **Merge** | Aceitar o PR: as mudanças entram na `main`. |
| **Deploy** | Colocar a versão nova no ar. Aqui acontece **sozinho** depois do merge na `main`. |
| **Firebase / Firestore** | Serviço do Google que os apps usam para login (Firebase Auth) e para guardar dados (Firestore). |
| **Regras** (rules) | As regras de segurança do Firestore: quem pode ler e escrever o quê. Ficam num repositório privado (`erickmob-api`), cuidado pelo Erick. |
| **i18n** | Tradução: todo texto do app existe em português e inglês. |
| **Core / nicho** | Core = código igual em todos os apps. Nicho = o que é só deste app. |
| **Catálogo** | A lista de itens (charutos, whiskies, relógios…), em `data/` e `public/catalog.json`. |

## 3. Preparar o ambiente (uma vez)

1. **Contas:** uma conta no GitHub, e peça ao Erick para te adicionar nos repositórios. Peça também um **login nos apps** (o cadastro é fechado).
2. **Instale:** [Node.js](https://nodejs.org) (versão LTS), [Python 3](https://www.python.org/downloads/), [Git](https://git-scm.com), o [GitHub CLI](https://cli.github.com) (`gh`, depois `gh auth login`) e o [Claude Code](https://claude.com/claude-code).
3. **Baixe o app** (o exemplo usa o Maltship; troque pelo app em que você vai trabalhar):
   ```bash
   gh repo clone erickmobltda/maltship
   cd maltship
   npm install
   ```
4. **Configuração:** peça ao Erick o conteúdo do arquivo `.env.local` deste app (é o endereço do projeto Firebase; ele não fica no repositório). Salve na pasta do projeto com o nome `.env.local`.
5. **Rode:** `npm run dev` e abra <http://localhost:5173>. Você vê o app no seu computador, falando com o banco de dados de verdade.

Dica: você pode pedir ao Claude para fazer tudo isso por você. Abra o Claude Code na pasta e diga "configure este projeto para rodar localmente; já tenho o .env.local do Erick".

## 4. Como pedir uma funcionalidade ao Claude

Abra o Claude Code na pasta do app (`claude`) e descreva **o que** você quer e **por quê**, como explicaria para uma pessoa. Um bom pedido tem:

- **O objetivo:** "quero que as pessoas possam ordenar o catálogo por nome, não só por nota."
- **Onde aparece:** "na tela Descobrir, junto dos filtros".
- **Para quem:** só para este app, ou para **todos** os apps? (Isso muda onde a mudança é feita; o Claude sabe lidar com os dois casos.)
- **Como saber que ficou pronto:** "quando eu escolher 'Nome', a lista fica de A a Z, nos dois idiomas".

Exemplos:
- "Adicione mais 5 whiskies ao catálogo: [lista]. Mantenha o formato atual."
- "Troque a cor principal deste app por um azul mais escuro."
- "Em todos os apps, mostre o número de itens no perfil do usuário." (mudança no core)
- "Quero guardar o 'preço pago' nos itens que a pessoa tem." (dado novo → o Claude prepara a proposta e pede para você falar com o Erick sobre as regras)

Peça ao Claude para **abrir um PR** no fim, e para te dizer como testar.

Uma mudança "para todos os apps" passa pelo blueprint: o Claude monta e testa primeiro neste app, e depois copia para o blueprint. Enquanto isso, a verificação chamada `check-core` reclama neste app; é normal, porque os arquivos comuns só podem mudar no blueprint. Quando o PR do blueprint é aceito, cada app recebe um PR chamado `Core v<N>`, e você faz o merge de um por um.

Nos testes, lembre que o app no seu computador usa o banco de dados **de verdade**: apague suas avaliações de teste, os "seguir" e os itens da coleção quando terminar.

## 5. O que você faz sozinho, e o que precisa do Erick

| Você (com o Claude) | Erick |
|---|---|
| Criar branches, mudar código e textos, abrir PRs, neste app e no blueprint | Firebase, domínios, senhas e chaves, servidores |
| Fazer merge de PRs **com o CI verde** (o deploy é automático). Para mudanças em todos os apps: teste em dois apps antes, depois faça o merge dos PRs `Core v<N>` um por vez e olhe cada site | Regras de segurança (`erickmob-api`): dados novos no Firestore |
| Adicionar ou corrigir itens do catálogo, traduções, cores | Criar contas, restaurar a conta demo em produção |
| Propor mudanças no core (no blueprint) | Criar um app novo ou um repositório novo |

Na dúvida, abra o PR e pergunte ao Erick lá.

## 6. Quando algo dá errado

- **O CI ficou vermelho no PR:** abra o PR no GitHub, clique na verificação que falhou, copie o erro e passe para o Claude: "o CI falhou com este erro, corrija." Os mais comuns:
  - `check-core`: alguém editou um arquivo do core neste app. A mudança tem que ser feita no blueprint (o Claude sabe como).
  - `i18n:check`: falta um texto em um dos idiomas.
- **O app não abre localmente:** confira se o `.env.local` existe e se você rodou `npm install`. Peça ao Claude: "o npm run dev não está funcionando, aqui está o erro."
- **Algo quebrou em produção depois de um merge:** avise o Erick na hora. Um PR que desfaz o merge (um "revert") resolve rápido; o Claude pode preparar.

## 7. Onde saber mais

- O `README.md` deste app: o que é específico dele.
- O blueprint (`erickmobltda/collector-app-blueprint`): `START_HERE.md`, `PRODUCTS.md` e a pasta `docs/`, com o funcionamento da família toda.
