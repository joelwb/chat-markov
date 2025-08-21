# ChatGPT Clone com Markov Chain

Este projeto é um clone visual do ChatGPT, mas em vez de utilizar um modelo de linguagem (LLM), a geração de texto é feita com um algoritmo baseado em **Cadeia de Markov** implementado em **Deno**.

O objetivo é explorar conceitos de geração de texto e streaming de dados de forma simples, mostrando como é possível montar um chat interativo usando tecnologias modernas sem depender de grandes modelos.

## Tecnologias utilizadas

- **Front-end:** [Angular 20](https://angular.dev/)
- **Back-end:** [Deno](https://deno.com/) com API própria
- **Comunicação em tempo real:** Streaming de dados e **Server-Sent Events (SSE)**
- **Execução paralela:** Uso de **WebWorkers** para processar a lógica de Cadeia de Markov em paralelo, mantendo o event loop principal livre para atender as requisições
- **Infraestrutura:** Docker para build e execução

## Funcionalidades

- Interface semelhante ao ChatGPT
- Criação de chats e envio de mensagens
- Cada chat precisa começar com pelo menos um arquivo `.txt`, que serve de base para treinar o modelo de Cadeia de Markov
- É possível enviar múltiplos arquivos `.txt` para treinar um chat, enriquecendo o vocabulário e a geração de texto
- Após treinar com pelo menos um arquivo, o usuário pode digitar texto e obter sugestões de autocompletar geradas pelo modelo
- Suporte a diferentes **ordens (N)** da Cadeia de Markov, variando de **2 a 15**
  - Quanto maior o valor de N, mais complexo, custoso e assertivo tende a ser o modelo
  - O usuário pode selecionar a ordem (N) antes de iniciar o chat, simulando a escolha de diferentes modelos
  - Uma vez iniciado o chat, o valor de N não pode mais ser alterado
- Respostas geradas por um algoritmo de Cadeia de Markov
- Atualização em tempo real das respostas
- Arquivo `compose.yml` para execução simplificada com Docker Compose

## Como rodar o projeto

1. Certifique-se de ter o **Docker** instalado.
2. Clone este repositório:
3. Suba o ambiente com o Docker Compose:

```bash
docker compose up
```

4. Acesse o front-end em [http://localhost:4200](http://localhost:4200)

O back-end em Deno será iniciado automaticamente e ficará disponível para atender as requisições da aplicação.

## Status do projeto

🚧 Em desenvolvimento. Algumas funcionalidades podem não estar finalizadas e novas features estão em andamento.

## Próximos passos (roadmap)
- Criar testes end-to-end com **Cypress**
- Modal de confirmação para excluir chat
- Funcionalidade de renomear chat
