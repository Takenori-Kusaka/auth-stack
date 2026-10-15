# 基盤への変更記録（試験群 revocation-consistency）

> 対象: 12_poc/code（POC-03）の基盤。試験群 revocation-consistency（TC-008・TC-009・TC-012）の実装・実行中に行った最小限の変更。
> 方針: 試験条件として必要な機能は環境変数で有効にする分岐として追加し、既定の挙動は変えない。既定の挙動を変えたのは、不具合の修正（RC-CH-01）と設計（authorization-model.md §11.1 K-3）との不一致の修正（RC-CH-04）の 2 件だけである。
> 作成: AI エージェント（Claude）。自己レビューのみで、独立レビューを経ていない [D]。

| # | ファイル | 変更 | 理由 | 既定の挙動への影響 |
|---|---|---|---|---|
| RC-CH-01 | `as/server.js` | node-oidc-provider の adapter を、上限なしの Map（有効期限だけで削除、30 秒ごとに掃除）に差し替えた（`MapAdapter`） | ライブラリ既定の開発用 adapter は 1,000 件の LRU である。edge の introspection は private_key_jwt で client 認証するため、要求ごとに replay 検出用の記録が 1 件増える。約 1,000 要求の後、使われていない session の access token が LRU から追い出され、introspection で `inactive`（401）になっていた（TC-008 の凍結前の動作確認で、ログイン後しばらく使わなかった利用者の要求がすべて 401 になったことで発見） | あり（不具合の修正）。長い試験で 401 が出なくなる。token の寿命・失効の扱いは変えていない |
| RC-CH-02 | `pep/sdk.js` `authorize()`・`guard()` | 任意の PEP 判定 cache を追加した。`PEP_DECISION_CACHE_MS`（既定 0＝無効）が正のときだけ、read-sensitive の判定を最大齢まで再利用する。整合性トークン付き・model pin 付きの要求、write 以上には使わない。失効 epoch が進んだら使わない（ADR-006 D6-10、authorization-model.md §9.1）。`guard()` は `tier` を渡し、cache 命中を PEP の局所記録に `decision_cache: 'hit'` として残す | TC-008 の層条件「SDK cache の有無」。基盤に PEP 判定 cache がなかった | なし（環境変数を設定したときだけ） |
| RC-CH-03 | `pdp/facade.js` | テナント剥奪フェンス（ADR-010 D-18）を追加した。`PDP_REVOCATION_FENCE=1` のとき、権限を狭める関係書込（削除、`restricted_external` の書込）でテナントのフェンスを書込の consistency token の版まで前進させ、そのテナントの read-sensitive 評価を `at_least_as_fresh`（OpenFGA では HIGHER_CONSISTENCY に格上げ）で行う。`PDP_FENCE_WINDOW_MS`（既定 0＝期限なし）。フェンスは MAC 付きトークンで単調にだけ前進し、ファイルに永続化する。cell 内の交換用 API `POST/GET /v1/tenants/{tid}/revocation-fence`（古い値は 409、MAC 不一致は 400、記録は `pdp/fence.jsonl`）。判定記録に `fence_seq` を追加 | TC-008 の層条件「façade のフェンスの有無」と注入「フェンスの巻戻し」。基盤にフェンスがなかった | なし（環境変数を設定したときだけ。無効時は API が 404） |
| RC-CH-04 | `services/file-service.js` `file.write` | 内容の更新と同じ SQL 文で、write 判定（最新で評価）の consistency token を `ctoken` 列に保存するようにした（K-3 content-change check） | authorization-model.md §11.1 K-3・§11.2 例 B は「内容の変更の直前に最新で write を判定し、返されたトークンを内容と同じトランザクションで保存する」と定める。基盤は作成・共有・移動（outbox 経由）では保存していたが、更新では保存していなかった。このままでは例 B（剥奪後の追記）で、追記後の読取がトークンなし（`minimize_latency`）で評価される | あり（設計との不一致の修正）。更新された文書の以後の読取は `fully_consistent` で評価される（安全側） |
| RC-CH-05 | `services/file-service.js` 障害注入 | `/admin/fault` に `crashBeforeCommit`（トランザクション内で停止）と `crashAfterDeliver`（façade への配送の成功後、outbox 行の記録前に停止）を追加した | TC-009 手順「更新の途中でプロセスを停止する」「二重配送」。既存の `crashAfterCommit` だけでは途中停止と配送後停止を作れなかった | なし（harness・admin が指定したときだけ） |
| RC-CH-06 | `pdp/facade.js`、`model/diff.js`（新規） | モデル登録ゲートを追加した。`PDP_MODEL_GATE=1` のとき `POST /v1/models` は、CAM の検証（不合格 422）、`base_revision` の一致（不一致 409 `base_revision_conflict`）、権限が広がる差分の検出（`model/diff.js`）を行い、広がる差分・証明できない変更・追加のある変更は、候補 revision に束縛された 2 名・2 役割の承認がなければ 403 `approval_required` を返す（relationship-model-registry.openapi.yaml registerModel、ADR-016 D16-31 段 2）。結果は `pdp/model-gate.jsonl`。`registry.latest`（直近の登録 revision）を追加。`model/diff.js` は参照評価器（ref/ref_eval.py）と同じ意味論の JS 評価器と、両スキーマの和から作る小さな無作為世界での差分探索 | TC-012 手順 (4)「権限拡大のモデル変更を CI に投入する」と合否「追加承認なしの配布 0 件」。基盤の登録 API は承認を確かめていなかった | なし（環境変数を設定したときだけ。TC-002 等が使う無承認の `POST /v1/models` は既定のまま） |

## 他の試験群への影響の確認

- RC-CH-01・RC-CH-04 の後に `npm run smoke`（OpenFGA 構成）を実行し、全段階 OK を確認した（`12_poc/data/_prefreeze/smoke/` の 2026-10-15T02:2x の実行）[M]。
- RC-CH-02・RC-CH-03・RC-CH-05・RC-CH-06 は環境変数・管理 API で有効にしたときだけ動く。
