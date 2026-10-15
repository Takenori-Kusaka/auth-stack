# 試験群 tenant-isolation（TC-002・TC-003）

> 対象: 高保証 PoC 系統 1、試験計画 POC-01（12_poc/preregistered-test-plan.md、凍結コミット 151940ac00dc64a89ac5a5cd148e42326e7c5e73）§4.2・§4.3。
> 作成: AI エージェント（Claude）。独立立会人の立会い・署名はない（§2.1 5 からの逸脱。各 run.json の `witness: null`）。

## 1. ファイル

| ファイル | 役割 |
|---|---|
| `TC-002.js` / `TC-002.params.json` / `TC-002.eval.js` | cross-tenant property test の実行器・凍結パラメータ・評価器 |
| `TC-003.js` / `TC-003.params.json` / `TC-003.eval.js` | BOLA・機能単位・プロパティ単位の負例の実行器・凍結パラメータ・評価器 |
| `mutants.js` | TC-002 手順 (4) の変異体 9 件（PEP 呼出し除去・tenant scope 除去・DB 行条件除去 × 3）。`.run/mutants/` に試験専用の複写として生成し、基盤のコードは変えない |
| `common.js` | 実行ディレクトリ（`12_poc/data/tenant-isolation/<TC>/<run-id>/`）、凍結（snapshot＋manifest）、参照評価器の常駐クライアント、変異体の生成 |
| `ref_server.py` | `ref/ref_eval.py`（参照評価器）を無改変で import し、tuple の鏡像を保ったまま期待値を返す常駐ラッパ |
| `harness-check.js` | 凍結前の動作確認（§2.5。合否を算出しない） |

## 2. 再現手順

```bash
cd 12_poc/code
node tests/tenant-isolation/TC-002.js --freeze      # 凍結: .run/snapshots/TC-002-v<k>/ にコードを複写し manifest を data/tenant-isolation/_freeze/ に保存
cd .run/snapshots/TC-002-v<k>/12_poc/code
node tests/tenant-isolation/TC-002.js --config all --mutants all
node tests/tenant-isolation/TC-002.eval.js ../data/tenant-isolation/TC-002/<run-id>
# TC-003 も同じ（--engine all）
```

- 凍結は「snapshot 方式」とした。基盤（12_poc/code）は他の試験群が並行して直しているため、凍結時点のコードを byte 複写し（node_modules・data・tools は junction）、測定はその複写から起動する。起動時に自分の木の manifest を凍結時の manifest と照合し、一致しなければ C-2 で起動しない。
- 秘密鍵・HMAC 鍵は実行ごとに `.run/` に生成する（git 管理外）。生データに token の全文は書かない。

## 3. ポート割当（固定）

`config/ports.js` の区画をそのまま使う。部品のオフセットは README（12_poc/code/README.md）§5 の表と同じ。

| 実行 | 区画 | 備考 |
|---|---|---|
| TC-002（全構成・全変異体、順に起動・停止） | 42040〜42059 | 構成ごとに全部品を起動し、終わると停止してから次を起動する |
| TC-003（openfga → cedar の順） | 42060〜42079 | 同上 |
| harness-check.js | 42040〜42059 | TC-002 と同時には動かさない |
