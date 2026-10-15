# 基盤への変更記録（試験群 engine-swap-perf-audit）

> 対象: 12_poc/code（POC-03）の基盤。試験群 engine-swap-perf-audit（TC-001・TC-013・TC-016・TC-017・TC-018・TC-019・TC-020・TC-022・TC-023・TC-026・TC-027・TC-028）の実装・実行中に行った最小限の変更。
> 方針: 故障注入・設定値で有効になる分岐の追加を基本とし、既定の挙動を変えるのは明らかな不具合の修正だけに限る（該当行の「既定の挙動への影響」欄に明記）。

| # | ファイル | 変更 | 理由 | 既定の挙動への影響 |
|---|---|---|---|---|
| CH-ESPA-01 | `pdp/facade.js` `echoHeaders()` | 故障注入モード `drop_request_id` を追加（`/admin/fault {mode:'drop_request_id'}` のとき応答に X-Request-ID を付けない） | TC-013 手順 (4)「要求 ID の欠落」の注入。既存の `wrong_request_id` は「不一致」だけを模していた | なし（`POC_FAULT_ADMIN=1` かつ当該モード指定時のみ） |
| CH-ESPA-02 | `pep/sdk.js` `guard()` | entry point の種類が `COLLECTION`（`file.search`）のとき、入口の判定を `core/tenant:<tid>#belongs`（read-sensitive）で行い、E2 の action も `belongs` にする。各資源の判定は従来どおり一覧ヘルパ（façade search＋evaluations `execute_all` の後段 Check）が行う | 変更前は `resource.id` が undefined の evaluation を送り、façade が 400 を返すため `file.search` が常に 503 だった（pep-contract §3.3 の L0 擬似コードでは COLLECTION は一覧ヘルパへ回す）。TC-013 の契約試験・TC-027 の一覧試験の前提 | `COLLECTION` の entry point だけ。他の種類の判定は不変 |
| CH-ESPA-03 | `sts/server.js` `txnToken()` | 設定 `txnIdFormat: 'inhouse'`（`POST /admin/settings` で実行時に変更可）のとき、`txn` を自社形式の取引 ID（UUIDv4 小文字 36 文字。access-token-claims.schema.json の `opaqueId` が発行側に許す 2 形式の一方で、時刻・ホスト名を含まない）で採番する。初版は `txn-`＋16 進 32 文字としたが、契約の発行形式に反し PEP の claim 検査で拒否されたため（TC-016 の v1 実行）UUIDv4 に直した | TC-016 手順 (6)「Txn-Token adapter を自社形式の取引 ID に差し替える」（ADR-009 D09-26・H09-08、ADR-022 D-8-5）。依存サービス（参照サービス・PEP SDK）の差分 0 を確かめるため、差替えを TTS 側の設定だけで行えるようにした | なし（設定値を指定したときだけ。既定は従来の不透明 base32） |
| CH-ESPA-04 | `services/file-service.js` `folder.list` | `?limit=`（上限 100）を付けた要求に頁送りを追加。`next_cursor` は主体・テナント・フォルダ・limit・寿命 60 秒に束縛し HMAC（`kCursor`）で保護。`limit` なしの要求は従来どおり全件を返す | TC-027 の v1 実行で、10,000 件のフォルダの一覧（索引＋後段 Check）が 1 応答で edge の 10 秒 timeout を超え 503 になった（安全側の失敗だが「欠落 0」を満たさない）。ADR-025 D25-15・D25-17（頁 100 件以下、主体に束縛した cursor）に合わせた最小の修正 | `limit` を付けた要求だけ。既定（`limit` なし）は不変 |
| CH-ESPA-05 | `as/server.js` | 管理 API `POST /admin/revoke-account-grants {sub, tid?, reason?}` を追加。ログイン時に主体ごとの grant ID を記録し、主体の全 grant（`tid` 指定時はその作用中テナントの grant だけ）について grant・access token・refresh token を失効させ、gref を失効状態に配布する | TC-018 の退職・停止・所属除去で INV-6（全手段の失効）と MT-6（所属の除去はそのテナント文脈だけを失効）を参照実装から実行するため。既存の `/admin/revoke-grant` は grant ID を知っている場合しか使えず、利用者の全 grant を列挙する手段がなかった | 追加の管理 API だけ（admin・harness の mTLS のみ）。既存の挙動は不変 |

## 事前登録との関係（申し送り H-POC-5 への対応）

- CH-ESPA-03 は TC-016 の v1 実行（`20261015T022624Z-402d43`、不合格）の結果を見た後の試験対象（STS）の変更、CH-ESPA-04 は TC-027 の v1 実行（`20261015T023956Z-973a7e`、不合格）の結果を見た後の試験対象（file-service）の変更である。いずれも §2.4 の「当該 TC のデータを見た後の変更」に当たり、両 TC の正式な結果は v1 の結果（不合格）、v2 の結果は参考として扱う（tests/engine-swap-perf-audit/README.md の逸脱一覧 DEV-ESPA-04）。
- CH-ESPA-01・CH-ESPA-02 は当該 TC の初回凍結（TC-013 v1）の前、CH-ESPA-05 は TC-018 の初回凍結の前の変更である。
- 他の試験群の試験への影響: CH-ESPA-02（COLLECTION の入口判定）は `file.search` の既定の挙動を変える（変更前は常に 503）。他の変更は追加の分岐・管理 API・設定値だけで、既定の挙動を変えない。
