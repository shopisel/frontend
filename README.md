# frontend

## Keycloak no frontend (Vite + React)

1. Copia `.env.example` para `.env`.
2. Preenche:
   - `VITE_KEYCLOAK_URL`
   - `VITE_KEYCLOAK_REALM`
   - `VITE_KEYCLOAK_CLIENT_ID`
3. No cliente do Keycloak, garante:
   - `Standard Flow` ativo
   - PKCE `S256`
   - `Valid Redirect URIs`: `http://localhost:5173/*`
   - `Web Origins`: `http://localhost:5173`
4. Corre `npm run dev`.

O login e feito por redirect para o Keycloak. O token fica em memoria no frontend e e renovado automaticamente.

Para producao, atualiza no cliente do Keycloak:
- `Valid Redirect URIs`: `https://<gateway-url>/*`
- `Web Origins`: `https://<gateway-url>`

## Deploy por imagem Docker

O frontend fica servido em Nginx (porta 80) com fallback de SPA para `index.html`.

Exemplo de build local da imagem:

```bash
docker build -t ghcr.io/shopisel/frontend:latest \
  --build-arg VITE_KEYCLOAK_URL=https://<keycloak-url> \
  --build-arg VITE_KEYCLOAK_REALM=shopisel \
  --build-arg VITE_KEYCLOAK_CLIENT_ID=shopisel-web \
  .
```

Depois faz push para o registry:

```bash
docker push ghcr.io/shopisel/frontend:latest
```

## Publicacao automatica no GHCR

Existe workflow em `.github/workflows/docker-publish.yml`.

- Em `push` para `main`, faz build e push para `ghcr.io/shopisel/frontend`.
- Em `pull_request` para `main`, valida build (sem push).
- Publica as tags `sha-<commit>` e `latest` (igual ao padrao do `list-service`).

Antes do primeiro run, define em `Settings > Secrets and variables > Actions > Variables`:
- `VITE_KEYCLOAK_URL`
- `VITE_KEYCLOAK_REALM`
- `VITE_KEYCLOAK_CLIENT_ID`

E define em `Settings > Secrets and variables > Actions > Secrets`:
- `GH_PAT_FOR_DISPATCH` (PAT com permissao para disparar `repository_dispatch` no repo `shopisel/deploy`)
