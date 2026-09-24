# Ótica System - Backend

## Visão geral

Este backend foi configurado como uma aplicação NestJS com módulo WhatsApp inicial, estruturado para evoluir sem acoplar a biblioteca de automação ao restante da aplicação.

## Instalação

```bash
npm install
```

## Execução em desenvolvimento

```bash
npm run start:dev
```

## Variáveis de ambiente

Crie um arquivo `.env` na raiz do backend com as opções necessárias para o WhatsApp.

Exemplo:

```bash
PORT=3001
WHATSAPP_SESSION_NAME=otica
WHATSAPP_CLIENT_ID=otica
WHATSAPP_HEADLESS=true
```

> Nunca versionar arquivos reais de ambiente, sessão ou cache do WhatsApp.

## WhatsApp

### Como conectar

1. Inicie o backend:

```bash
npm run start:dev
```

2. Acesse a rota de status:

```bash
GET http://localhost:3001/whatsapp/status
```

3. Conecte o cliente:

```bash
POST http://localhost:3001/whatsapp/connect
```

4. O QR Code será gerado no console do processo e o cliente ficará aguardando autenticação no WhatsApp.

5. Escaneie o QR Code com o aplicativo do WhatsApp e aguarde a confirmação de conexão.

### Verificar status

```bash
GET http://localhost:3001/whatsapp/status
```

Resposta esperada:

```json
{
  "connected": false,
  "ready": false,
  "status": "disconnected"
}
```

### Enviar mensagem

```bash
POST http://localhost:3001/whatsapp/send
Content-Type: application/json
```

Body:

```json
{
  "phone": "5531999999999",
  "message": "Olá!"
}
```

### Estrutura atual do módulo WhatsApp

```text
src/whatsapp/
├── whatsapp.module.ts
├── whatsapp.controller.ts
├── whatsapp.service.ts
├── whatsapp.client.ts
├── whatsapp.events.ts
├── whatsapp.types.ts
├── menu/
│   ├── menu.service.ts
│   ├── menu.types.ts
│   └── menu.config.ts
├── conversation/
│   ├── conversation.service.ts
│   ├── conversation.state.ts
│   └── conversation.types.ts
└── dto/
    ├── send-message.dto.ts
    └── send-menu.dto.ts
```

## Observações importantes

- O cliente de WhatsApp está encapsulado em `src/whatsapp/whatsapp.client.ts`.
- O módulo centraliza conexão, sessão e eventos.
- O `ConversationService` já está preparado para receber mensagens e responder de forma inicial.
- O menu está separado da conversa, permitindo evolução futura sem mexer na regra principal do fluxo.
- O armazenamento inicial de conversa usa memória para desenvolvimento local.

## Segurança

- não versionar `.env`, `.wwebjs_auth`, `.wwebjs_cache` ou qualquer sessão do WhatsApp;
- não expor credenciais ou sessão pela API;
- sempre validar payloads de entrada com DTO e `ValidationPipe`.

## Próximos passos recomendados

- migrar o armazenamento de conversa para Redis;
- criar modelos Prisma para mensagens e estados;
- implementar a sequência real de atendimento e agendamento;
- criar uma interface administrativa no frontend para visualizar status do WhatsApp.
