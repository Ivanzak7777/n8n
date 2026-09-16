# Payments Jobs Board

Статичний сайт, що збирає відкриті QA та Product вакансії у ~30 payment/fintech компаніях
(Solidgate, Ecommpay, payabl., WhiteTech, Paysafe, Praxis, GR8 Tech тощо) з фільтрами по позиції
та компанії. Компанії з Кіпру показуються першими.

## Як це працює

- `scripts/scrape.mjs` — щодня збирає вакансії з Djinni.co, офіційних career-сторінок (ATS API:
  Greenhouse, Lever, Teamtailor, Workable, Ashby) та Indeed (best-effort), пише результат у
  `data/jobs.json`.
- `.github/workflows/scrape-jobs.yml` — GitHub Actions, що запускає скрапер щодня о 06:00 UTC і
  комітить оновлений `data/jobs.json`.
- `index.html` / `styles.css` / `app.js` — статичний фронтенд без збірки, читає `data/jobs.json`
  напряму, GitHub Pages роздає ці файли як є.

Кожне джерело обгорнуте окремо: якщо одне джерело падає (наприклад Indeed блокує запит), інші
джерела все одно відпрацьовують, і сайт не втрачає вже зібрані дані.

## Локальний запуск

```bash
npm install
npm run scrape        # генерує data/jobs.json
python3 -m http.server # відкрити http://localhost:8000
```

## Додати нову компанію

Додайте запис у `scripts/companies.json`: `name`, `aliases` (варіанти написання назви, як вони
можуть зустрічатись на Djinni), `careersUrl`, `ats` (`greenhouse` / `lever` / `teamtailor` /
`workable` / `ashby` / `custom` / `unknown`), `atsSlug` (якщо ATS підтримується напряму),
`hqCountry`, `isCyprus`.

## Увімкнути GitHub Pages (одноразово, вручну)

1. Settings → Pages → Source: **Deploy from a branch**.
2. Branch: оберіть гілку, де лежить сайт (зараз — `claude/qa-payment-solutions-jobs-0snb9e`),
   folder — `/ (root)`.
3. Збережіть. Сайт з'явиться за адресою `https://<username>.github.io/<repo>/`.

**Важливо:** GitHub запускає `schedule`-тригери Actions лише для гілки за замовчуванням
(default branch) репозиторію. Поки цей проєкт живе на `claude/qa-payment-solutions-jobs-0snb9e`,
а `master` лишається незміненим, щоденний cron **не спрацює автоматично** — потрібно або злити
цю гілку в `master` (чи зробити її гілкою за замовчуванням), або запускати оновлення вручну через
Actions → Scrape jobs daily → Run workflow.
