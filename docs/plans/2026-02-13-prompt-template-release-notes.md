# Prompt Template Feature - Release Notes (2026-02-13)

Bu release, `prompt-template` özelliğini şema + API katmanında production kullanılabilir hale getirir.

## Kapsam

- `PromptTemplate` veritabanı modeli eklendi.
- `prompt_template` tablosu için SQL migration eklendi.
- `/api/prompt-templates` CRUD endpointleri tekrar aktif edildi.
- Prompt variable doldurma akışı (`/:id/use`) güvenli regex escape ile iyileştirildi.
- İlgili API ve DB tip kontrolleri temizlendi.

## Dahil Olan Commitler

- `ddff774` `feat(db): add prompt template model and user relation`
- `6533827` `feat(api): restore prompt template CRUD routes with validation`
- `7db5bca` `chore(db): add sql migration for prompt template table`

## API Değişiklikleri

Temel endpointler:

- `GET /api/prompt-templates`
- `POST /api/prompt-templates`
- `PATCH /api/prompt-templates/:id`
- `DELETE /api/prompt-templates/:id`
- `POST /api/prompt-templates/:id/use`
- `GET /api/prompt-templates/discover`

Not:

- Kullanıcı bazlı endpointler `requireAuth` altında.
- `variables` alanı string array olarak normalize ediliyor (trim + limit).

## Veritabanı Değişikliği

Yeni tablo:

- `prompt_template`
  - `id`, `userId`, `title`, `content`, `category`, `variables`, `usageCount`, `isPublic`, `createdAt`, `updatedAt`

İndeksler:

- `prompt_template_userId_idx`
- `prompt_template_userId_category_idx`
- `prompt_template_isPublic_usageCount_idx`

## Doğrulama Sonuçları

Çalıştırıldı ve başarılı:

- `cd packages/db && bunx prisma validate`
- `bun run db:generate`
- `cd services/api && bunx tsc --noEmit --pretty false`
- `cd services/api && bun run build`
- `cd services/api && bunx vitest run --reporter=dot` (`2288/2288`)

## Riskler ve Notlar

- Migration geçmişi bu repoda minimal (`0_init` + incremental). Prod ortamda `prisma migrate deploy` ile ilerlenmeli.
- Route fallback’i (501) kaldırıldı; bu yüzden migration uygulanmadan deploy edilirse runtime hata riski oluşur.

## Rollback Stratejisi

Önerilen rollback sırası:

1. API deploy rollback (prompt-template endpointlerini önceki sürüme çek).
2. DB’de tabloyu acil silme yapma; veri kaybı riski nedeniyle bırak.
3. Incident sonrası ayrı migration ile kontrollü geri alma planla.
