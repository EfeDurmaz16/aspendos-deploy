# Prompt Template - Production Rollout Plan

Bu runbook, `PromptTemplate` özelliğini production'a güvenli şekilde açmak içindir.

## 1. Pre-Deploy Checklist

1. Branch `main` ile senkron ve CI yeşil olmalı.
2. Son commitler hazır olmalı:
   - `ddff774`
   - `6533827`
   - `7db5bca`
3. Production `DATABASE_URL` erişimi doğrulanmalı.
4. Yedek alınmalı:
   - `./scripts/db-backup.sh manual`
5. Migration state kontrolü:
   - `DATABASE_URL=... ./scripts/pre-deploy-check.sh`

## 2. Staging Rollout

1. Staging veritabanında migration:
   - `cd packages/db`
   - `DATABASE_URL=<staging_url> bunx prisma migrate deploy`
2. Prisma client generate:
   - `bun run db:generate`
3. API doğrulama:
   - `cd services/api && bunx tsc --noEmit --pretty false`
   - `cd services/api && bun run build`
   - `cd services/api && bunx vitest run --reporter=dot`
4. Staging smoke test:
   - Template oluştur
   - Listele
   - `/:id/use` çağır
   - Sil

## 3. Production Rollout

1. Backup:
   - `DATABASE_URL=<prod_url> ./scripts/db-backup.sh manual`
2. Migration deploy:
   - `cd packages/db`
   - `DATABASE_URL=<prod_url> bunx prisma migrate deploy`
3. API deploy et.
4. Web deploy et (prompt template UI/flow’u kullanıyorsa).

## 4. Post-Deploy Smoke Tests

`<TOKEN>` geçerli auth bearer token olacak şekilde:

```bash
BASE_URL="https://api.yula.dev"
TOKEN="<TOKEN>"

# 1) Create
CREATE_RES=$(curl -sS -X POST "$BASE_URL/api/prompt-templates" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Deploy Test","content":"Hello {{name}}","category":"ops","variables":["name"]}')

echo "$CREATE_RES"
ID=$(echo "$CREATE_RES" | jq -r '.template.id')

# 2) Use
curl -sS -X POST "$BASE_URL/api/prompt-templates/$ID/use" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"variables":{"name":"YULA"}}'

# 3) List
curl -sS "$BASE_URL/api/prompt-templates" -H "Authorization: Bearer $TOKEN"

# 4) Delete
curl -sS -X DELETE "$BASE_URL/api/prompt-templates/$ID" -H "Authorization: Bearer $TOKEN"
```

Beklenen:

- `POST /api/prompt-templates` -> `201`
- `POST /:id/use` -> `200`, `content` dolu
- `GET /api/prompt-templates` -> `200`
- `DELETE /:id` -> `200`

## 5. Monitoring

İlk 24 saat izlenecek metrikler:

1. `5xx` oranı (özellikle `prompt-templates` endpointleri)
2. Prisma query hata oranı
3. P95/P99 latency (`/api/prompt-templates*`)
4. Migration sonrası DB lock/timeout anomalileri

## 6. Rollback

Öncelik API rollback:

1. API deploy rollback (eski sürüme dön).
2. Gerekirse route’ları feature flag veya temporary guard ile kapat.
3. DB rollback için anlık `DROP TABLE` uygulanmaz; veri koruması için planlı migration hazırlanır.
