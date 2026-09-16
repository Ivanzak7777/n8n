# Payments Jobs Board

Статичний сайт, що збирає відкриті QA та Product вакансії у ~30 payment/fintech компаніях
(Solidgate, Ecommpay, payabl., WhiteTech, Paysafe, Praxis, GR8 Tech тощо) з фільтрами по позиції
та компанії. Компанії з Кіпру показуються першими.

Живе на claude.ai (миттєво, без налаштувань): https://claude.ai/artifact/CSdzAzEyCjiPYwZzudNeLZ

## Як це працює

- `scripts/scrape.mjs` — щодня збирає вакансії з Djinni.co та офіційних career-сторінок (ATS API:
  Greenhouse, Lever, Teamtailor, Workable), пише результат у `data/jobs.json`.
- `.github/workflows/scrape-jobs.yml` — GitHub Actions, що запускає скрапер щодня о 06:00 UTC і
  комітить оновлений `data/jobs.json`.
- `data/jobs-indeed.json` — окремий файл з тим самим набором полів, який оновлює **не** GitHub
  Actions, а щоденна Claude-рутина через офіційний Indeed MCP-конектор (пряме HTTP-скрапіння
  indeed.com блокується їхнім анти-бот захистом — підтверджено, HTTP 403 — тож легальний шлях
  тільки через конектор). Дивись розділ нижче.
- `index.html` / `styles.css` / `app.js` — статичний фронтенд без збірки. Фетчить дані напряму з
  `raw.githubusercontent.com` (абсолютні URL на `master`), тому ті самі три файли однаково
  працюють і на GitHub Pages, і як claude.ai Artifact.

Кожне джерело обгорнуте окремо: якщо одне джерело падає, інші все одно відпрацьовують, і сайт не
втрачає вже зібрані дані.

## Indeed-дані (окремий механізм)

Пряме HTTP-скрапіння Indeed заблоковане на рівні їхнього анти-бот захисту, а легальний Publisher
API Indeed закритий для сторонніх розробників. Тому Indeed-дані оновлюються через **окрему Claude
Code Remote сесію** ("Payments Jobs Board — Indeed automation"), яка щодня отримує будильник
(Routine, `trig_...`, cron `0 7 * * *` UTC — на годину пізніше за основний скрапер) і використовує
підключений у вашому акаунті Indeed MCP-конектор (справжній, санкціонований доступ до Indeed, а не
скрапінг) для пошуку QA/Product вакансій серед відстежуваних компаній, після чого комітить
`data/jobs-indeed.json` напряму в `master`. Ця сесія — окрема від тієї, що будувала сайт.

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

Сайт вже злитий у `master` (гілка за замовчуванням), тож щоденний cron GitHub Actions вже активний
сам по собі. Лишається тільки увімкнути роздачу сторінки:

1. Settings → Pages → Source: **Deploy from a branch**.
2. Branch: `master`, folder — `/ (root)`.
3. Збережіть. Сайт з'явиться за адресою `https://<username>.github.io/<repo>/`.
