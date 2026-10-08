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

## 本番への反映

APIのサーバーでこのリポジトリをビルドし、書き出した `out/` をAPIのWebサーバー（Caddy）が `/` で配信します。
手順はAPIリポジトリの `DEPLOY.md` を参照してください。
