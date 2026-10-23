# いま開いてる病院・薬局（open-clinic-finder）

現在地や駅名から、いま開いている近くの病院・診療所・歯科・薬局を探せるWebサイトです。
[医療施設マスタAPI](https://github.com/TomonoriYoshida/medical-facility-master-api-laravel) を使っています。

- **公開サイト**: https://168-110-42-30.sslip.io/

## できること

- 現在地、または駅名・住所（[国土地理院 住所検索API](https://msearch.gsi.go.jp/)）から、近い順に施設を表示
- 「いま開いている」「日時を指定」「時間で絞らない」の切り替え。開いている施設には「19:00まで」のように終了時刻を表示
- 種類（病院・診療所・歯科・薬局）と診療科での絞り込み、リストと地図の切り替え
- 施設の詳細（診療時間の表、電話、経路）
- 紹介用のQRコード、リンクのコピー、共有
- ホーム画面への追加（Web App Manifest）

## 技術構成

- Next.js 16（App Router、`output: "export"` による静的書き出し）/ React 19 / TypeScript / Tailwind CSS 4
- データ取得はブラウザからAPIを直接呼び出し（TanStack Query）。本番ではAPIと同じサーバーから配信するため、`/api` を同じオリジンで呼ぶ
- APIの型は、APIが生成するOpenAPI仕様から `openapi-typescript` で生成
- 地図は [Leaflet](https://leafletjs.com/) と[地理院タイル](https://maps.gsi.go.jp/development/ichiran.html)（淡色地図）
- QRコードは [qrcode](https://www.npmjs.com/package/qrcode)

## ローカルで動かす

Node.jsはDocker上で実行します。先にAPI（Laravel Sail）を起動しておいてください。

```bash
cp .env.local.example .env.local   # APIのオリジンを設定
docker compose up -d               # http://localhost:3002
```

## APIの型を更新する

APIのリポジトリでOpenAPI仕様を書き出し、`openapi/openapi.json` に置いてから型を生成します。

```bash
# APIのリポジトリで
vendor/bin/sail artisan scramble:export --path=storage/app/openapi.json
# このリポジトリで
mv ../medical-facility-master-api-laravel/storage/app/openapi.json openapi/openapi.json
docker compose exec app npm run generate:api
```

## 市区町村名の対応表を更新する

住所検索の候補に「宮城県栗原市」のような場所を添えるため、市区町村コードと名前の対応表（`src/lib/municipalities.json`）を同梱しています。
APIが取り込んだアドレス・ベース・レジストリの市区町村マスターから書き出したもので、市区町村の合併などがあったときに作り直します。

```bash
# APIのリポジトリで
vendor/bin/sail artisan tinker --execute 'echo json_encode(App\Models\Municipality::query()->orderBy("code")->get()->mapWithKeys(fn ($m) => [$m->code => App\Enums\Prefecture::from($m->prefecture_code)->label().$m->name]), JSON_UNESCAPED_UNICODE);' > ../open-clinic-finder/src/lib/municipalities.json
```

## 画面のテスト

[Playwright](https://playwright.dev/) で、ビルドした画面をスマホの画面（Pixel 7 相当）で動かして確かめます（`e2e/`）。PR と `main` への push のたびに GitHub Actions（`.github/workflows/test.yml`）で動きます。本番への反映はサーバーでのビルドなので、マージの前にここで通しておきます。

- APIと地名検索（国土地理院）は本物を呼ばず、テスト用の固定データ（`e2e/fixtures/`）で答えます。テスト用のビルドはAPIのオリジンをダミーの `http://api.test` にし、その通信をテストが受けます。地図タイルなど、ほかの外部への通信は止めます。
- 時刻は 2026-10-05（月）10:30（日本時間）に固定します。「いま開いている」の検索で送る時刻が、この時刻になることを確かめます。
- 現在地は、テストごとに許可（東京駅前）か、許可しないかを決めます。
- 想定していないAPIが呼ばれると、テストは失敗します。新しいAPIを使うときは、`e2e/support.ts` に固定データの応答を加えます。
- トップ・検索結果・施設詳細は、axe でアクセシビリティも確かめます（重大な問題があれば失敗）。

```bash
# テスト用にビルドする
docker run --rm --network host -u "$(id -u):$(id -g)" -e HOME=/tmp -v "$PWD":/app -w /app mcr.microsoft.com/playwright:v1.58.0-noble npm run build:e2e
# テストする
docker run --rm --network host --ipc=host -u "$(id -u):$(id -g)" -e HOME=/tmp -v "$PWD":/app -w /app mcr.microsoft.com/playwright:v1.58.0-noble npm run test:e2e
```

- 依存関係を追加・更新するときは、本番のサーバーと同じ `node:22-alpine`（npm 10）で `npm install` してください。Playwright のイメージ（npm 11）で書いた lockfile は、サーバーの `npm ci` で通らないことがあります（CI の確認で失敗します）。
- ビルドは Playwright のイメージで行います。`node:22-alpine` と行き来すると、`.next` に残ったキャッシュでビルドが失敗することがあります（`rm -rf .next` で直ります）。
- イメージの版（`v1.58.0`）は、`package.json` の `@playwright/test` と合わせます。上げるときは、ここと `.github/workflows/test.yml`（イメージのタグと `PLAYWRIGHT_IMAGE_VERSION`）も一緒に上げます。
- 失敗したテストの記録は `test-results/` に残ります（`npx playwright show-trace <trace.zip>` で再生できます）。CI では成果物 `playwright-report` に入ります。

### 固定データを作り直す

`e2e/fixtures/*.json` は、APIと地名検索の実際の応答です。近くの施設の一覧は、座標と診療時間がそろっている本番のAPIから取ります。選択肢・施設・診療時間はローカルのAPIで構いません。施設は、時間帯が2つあり、受付時間と第n週の休みがあるもの（鈴森内科クリニック）を使っています。

```bash
B=http://localhost:8000/api/v1; ID=33987
curl -s "$B/options" > e2e/fixtures/options.json
curl -s "$B/medical-facilities/$ID" > e2e/fixtures/facility.json
curl -s "$B/medical-facilities/$ID/opening-hours" > e2e/fixtures/opening-hours.json
# 東京駅前で、2026-10-05（月）10:30に開いている近い5件
curl -s "https://168-110-42-30.sslip.io/api/v1/medical-facilities?latitude=35.681236&longitude=139.767125&radius=2000&status=1&per_page=5&open_at=2026-10-05T10:30" > e2e/fixtures/nearby.json
curl -s "https://msearch.gsi.go.jp/address-search/AddressSearch?q=%E6%96%B0%E5%AE%BF%E9%A7%85" > e2e/fixtures/gsi-shinjuku.json
```

一覧を取り直したら、`e2e/finder.spec.ts` の件数（`1,043件`）や施設名、閉まる時刻の期待値も合わせます。

## 本番への反映

APIのサーバーでこのリポジトリをビルドし、書き出した `out/` をAPIのWebサーバー（Caddy）が `/` で配信します。
リンクのプレビュー（Facebook・LINE・X など）に使う絶対URLは、既定で `https://168-110-42-30.sslip.io` です。独自ドメインに移ったら、ビルドのときに環境変数 `SITE_URL` を渡すか、`src/lib/site.ts` の既定値を変えてください（プレビュー画像 `og.png` に書くアドレスも変わります）。
手順はAPIリポジトリの `DEPLOY.md` を参照してください。
