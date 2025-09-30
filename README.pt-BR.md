# Token Memory TTL

Armazenamento de tokens em memória com TTL (Time-To-Live) e coleta automática de expirados. Implementação simples, sem dependências externas, com suporte completo a TypeScript e distribuição para ESM e CommonJS.

Este projeto tem como objetivo oferecer uma solução previsível e segura para cenários em que é necessário manter tokens temporários em memória (por exemplo, sessões, códigos de verificação, chaves temporárias), com limpeza automática após o prazo configurado e sem manter o processo Node ativo desnecessariamente.

[English README](./README.md)

## Sumário

- [Motivação](#motivação)
- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Como funciona](#como-funciona)
- [Uso rápido](#uso-rápido)
- [API](#api)
- [Padrões de uso](#padrões-de-uso)
- [Limitações e considerações](#limitações-e-considerações)
- [Testes e qualidade](#testes-e-qualidade)
- [Licença](#licença)

## Motivação

Em muitas aplicações o custo de integrar um banco externo para armazenar dados efêmeros não compensa. Um mapa em memória pode resolver com latência mínima e simplicidade. Entretanto, há desafios: garantir a expiração correta, evitar vazamentos de memória e tratar limites de temporizadores do Node.js para TTLs longos (> 24 dias). Esta biblioteca aborda esses pontos de forma direta e documentada.

## Requisitos

- Node.js >= 18
- TypeScript opcional (tipos incluídos)

## Instalação

```bash
npm install @jwcbmat/token-memory-ttl
```

## Como funciona

Os registros são mantidos em um `Map<string, { token, createdAt, expiresAt }>` em memória. Para cada chave, é agendado um temporizador de expiração. Como o Node.js utiliza um inteiro de 32 bits para atrasos de timer, valores acima de ~24,8 dias podem causar overflow. Para contornar isso, o agendamento é feito em blocos: quando o restante até a expiração excede o limite seguro, agenda-se o próximo passo e reprograma-se até atingir o prazo final. Assim, TTLs extensos são honrados sem disparos prematuros.

Os timers são `unref()` quando suportado, o que significa que não impedem o encerramento do processo Node. A cada operação de leitura (`get`, `has`, `getMetadata`, `getTtl`, `keys`), itens expirados são limpos de forma oportunista, reduzindo o acúmulo de dados inválidos.

## Uso rápido

### ESM/TypeScript

```ts
import { MemoryTokenStore } from '@jwcbmat/token-memory-ttl';

const store = new MemoryTokenStore();
await store.set('user:123', 'token', 3600);
const token = await store.get('user:123');
```

### CommonJS

```js
const { MemoryTokenStore, tokenStore } = require('@jwcbmat/token-memory-ttl');

const store = new MemoryTokenStore();
store.set('k', 'v', 60).then(() => store.get('k'));
```

### Instância global

```ts
import { tokenStore } from '@jwcbmat/token-memory-ttl';

await tokenStore.set('session:abc', 'dados', 1800);
const session = await tokenStore.get('session:abc');
```

## API

### Opções do construtor

```ts
interface TokenStoreOptions {
  maxSize?: number;     // limite máximo de chaves (padrão: ilimitado)
  defaultTtl?: number;  // TTL padrão em segundos (padrão: 3600)
  debug?: boolean;      // logs mínimos de depuração (padrão: false)
}
```

### Métodos principais

- `set(key: string, token: string, ttlSeconds?: number): Promise<void>`
  - Armazena um token com TTL. Usa `defaultTtl` quando `ttlSeconds` não é informado.

- `get(key: string): Promise<string | null>`
  - Retorna o token se existente e não expirado; caso contrário, `null`.

- `delete(key: string): Promise<boolean>`
  - Remove a chave e retorna `true` se existia.

- `has(key: string): Promise<boolean>`
  - Indica se a chave existe e está válida.

### Metadados

- `getMetadata(key: string): Promise<{ createdAt: number; expiresAt: number } | null>`
  - Retorna metadados do item sem expor o valor do token.

- `getTtl(key: string): Promise<number | null>`
  - Retorna o TTL restante em segundos.

- `updateTtl(key: string, ttlSeconds: number): Promise<boolean>`
  - Atualiza o TTL de uma chave existente.

### Gestão

- `keys(): Promise<string[]>`
  - Lista as chaves válidas (não expiradas).

- `clear(): Promise<void>`
  - Remove todas as chaves e cancela temporizadores.

- `getStats(): { size: number; pendingCleanups: number; memoryUsage: number }`
  - Estatísticas aproximadas do armazenamento.

## Padrões de uso

### Sessão

```ts
await tokenStore.set(`session:${sessionId}`, userData, 1800);
const session = await tokenStore.get(`session:${sessionId}`);
```

### Cache de chaves de API

```ts
const apiKeyStore = new MemoryTokenStore({ defaultTtl: 3600, maxSize: 5000 });
await apiKeyStore.set(`api_key:${keyHash}`, userPermissions, 3600);
const permissions = await apiKeyStore.get(`api_key:${keyHash}`);
```

### Dados temporários

```ts
await tokenStore.set(`upload:${uploadId}`, uploadConfig, 300);
await tokenStore.set(`verify:${email}`, verificationCode, 600);
await tokenStore.set(`reset:${userId}`, resetToken, 1800);
```

## Limitações e considerações

- Persistência: o armazenamento é apenas em memória; um restart do processo limpa os dados.
- Segurança: a biblioteca não cifra valores; se necessário, armazene apenas tokens já seguros (ex.: JWT) ou dados não sensíveis.
- Memória: o custo por entrada envolve chave, valor, metadados e referências de timer. Use `maxSize` para controlar crescimento.
- Timers: para TTLs muito longos, o agendamento é segmentado por limites do Node; isso evita “disparos imediatos” indevidos.
- Ambiente: a biblioteca não mantém o processo ativo por causa de timers (`unref()` quando disponível); isso é desejável em CLIs e jobs.

## Testes e qualidade

- Testes com `vitest`, cobrindo operações básicas, expiração, concorrência e TTL longo.
- Tipos TypeScript incluídos (arquivo `.d.ts`) e checagem com `tsc --noEmit`.
- Lint configurado com `eslint` + `@typescript-eslint`.

## Licença

MIT © [jwcbmat](https://github.com/jwcbmat)

Links úteis:

- Repositório: https://github.com/jwcbmat/token-memory-ttl
- Pacote npm: https://www.npmjs.com/package/@jwcbmat/token-memory-ttl
- Issues: https://github.com/jwcbmat/token-memory-ttl/issues

<p align="center">
  Feito com :heart: by <a href="https://github.com/jwcbmat" target="_blank">jwcbmat</a>
</p>