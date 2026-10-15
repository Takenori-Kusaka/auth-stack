# 並行開発可能性の実地検証（連携チーム模擬）: 経費精算サービス

> 文書種別: 検証記録 / 作成日: 2026-10-15 / 対象: 10_integration（INT-00〜INT-06）と 11_contracts（CON-00〜CON-15）の git HEAD `664a5ed`
>
> **これは AI エージェント（Claude）が「認証認可基盤にこれから依存する新規サービスの開発チーム」の役を演じた模擬検証である。実在の連携チームが行った検証ではなく、所要時間・詰まり方は人のチームとは異なる。結果を実在チームの受入れ証拠（Gate・DoR・DoD）に使ってはならない。**
>
> 制約: 12_poc/code の実装、04_architecture、05_adr は読んでいない。連携チームが受け取る資料（10_integration と 11_contracts）だけを使った。10_integration と 11_contracts は編集していない（改善提案は §8）。
>
> 注記: 検証エージェントの報告ファイル書込みが実行環境に止められたため、本書は同エージェントの最終報告本文をオーケストレータが転記した。成果物（実装・試験・モデル・結果）は `expense-service/` にある。

## 0. 結論

| 項目 | 結果 |
|---|---|
| 判定 | **条件付きで「はい」**。基盤（AS・PDP・STS・Registry・キット）が 1 つも動いていない状態で、設計・認可モデル・実装・単体試験・契約の形の試験まで進められた。自前試験 83 件のうち 81 件合格・2 件は対象外で skip、失敗 0。モデル試験は `fga model test` で check 21 件・ListObjects 2 件がすべて合格 |
| ただし | (1) 文書どおりに汎用モック（Prism）で正例の形の結合確認をすると、契約に忠実な PEP は全件 fail-closed（503）になる。試験側に 2 つの迂回（W-1・W-2）を入れて初めて正例の流れを通せた。(2) 署名付き token・PDP 失敗時の結合確認は、12_poc/code を使えない条件では自前の IdP・PDP スタブが要った。(3) 監査イベント（CON-08）の必須欄を依存サービスが埋められない場合があり、正例の流れでも 6 件中 3 件が不適合。(4) 部署階層で承認者が決まる要件は、決裁待ちの `core/unit` に依存し、文書だけではモデルを確定できなかった |
| 詰まった点 | **26 件**（重大 5・中 13・小 8） |

## 1. 使った文書と節

INT-00（§0・§2・§3・§5.2・§5.4・§6.1〜§6.4）、INT-02（§2.1〜§2.3、§3.1〜§3.5、P-01・P-03・P-04・P-09・P-19・P-24、§10）、INT-03（§0、§1.2〜§4、§7.3、§9.2、§9.5、§15）、INT-06（FQ-04、FQ-42〜44、FQ-57）、CON-00（§2.3・§2.5・§4.6・§4.9）、CON-11（§3・§4.4・§4.10・§6.1〜§6.2・§7.2・§8・§11.4・§16）、CON-03、CON-05、CON-04、CON-12/CON-15、schemas（CON-02・CON-06・CON-08・CON-13）。INT-01・INT-04・INT-05 は見出しと参照箇所のみ（Tier 申告・DoR・本番オンボーディングは範囲外）。

## 2. パターン選択

主パターン P-01（人がブラウザで使う業務 API、PP-2 の自前 PEP）。一覧に P-09、承認通知の発行に P-24、通知の consumer に P-04、最終承認後の支払サービス呼出しに P-03、ライフサイクル事象の受信に CR-9 を重ねた。メール承認リンク（P-19）は採らず通知（P-24）に留めた。役割は CR-1・CR-2・CR-3・CR-5・CR-8・CR-9。

## 3. 認可モデル草案（名前空間 `expense`）

```
type expense/book                        # テナントに 1 つの経費台帳
  relations
    member:     [core/user, core/group#member]
    accountant: [core/user, core/group#member, core/role#assignee]
  permissions
    file_report = member | accountant
    process     = accountant

type expense/report
  relations
    book:        [expense/book]
    unit:        [core/unit]              # 申請時の所属部署（現状未使用）
    requester:   [core/user]
    approver:    [core/user]              # 承認 workflow の workload だけが書く
    approved_in: [expense/book]           # 最終承認で workflow が書く
  permissions
    view    = requester | approver | book->process
    edit    = requester
    submit  = requester
    approve = approver                    # 自己承認禁止・定足数は workflow
    pay     = approved_in->process
```

承認者の解決（部署長・閾値による上位承認）は workflow が行い、結果を `approver` tuple として書く。自己承認禁止・同一人物二重承認禁止・内容変更後の再承認は workflow で強制。「部署長は配下部署の申請を閲覧できる」（E-8）は `core/unit` の公開 permission が文書から分からず未確定。

## 4. 実装（`expense-service/`、Node.js 22）

`src/token.js`（token 検証）、`src/pdp.js`（AuthZEN 呼出し、締切・echo・decision_id・整合性の格下げ拒否）、`src/sts.js`（RFC 8693 exchange、Txn-Token）、`src/audit.js`（CON-08 監査、ハッシュ連鎖）、`src/app.js`（PEP と workflow、一覧、outbox）、`src/consumer.js`（P-04）、`src/lifecycle.js`（CR-9、CON-15 照会）、`src/config.js`、`src/contracts.js`、`CONTRACTS.lock.json`（契約を `664a5ed` に固定し SHA-256 記録）。

## 5. 実行

```
cd 13_integration-trial/expense-service
npm install
npm run extract-con15
npm run mocks        # Prism 5.12.0: CON-03(4010) CON-05(4011) CON-15(4012) CON-04(4013)
npm test             # 6 ファイル、83 件
fga model test --tests model/expense.fga.yaml
```

試験側だけの迂回とスタブ: W-1（X-Request-ID の echo shim）、W-2（allow 例の consistency を要求モードへ引上げ）、自前 IdP スタブ、16 注入の PDP スタブ、TTS/STS/照会スタブ、accept 遅延中継。

## 6. 試験結果

| ファイル | 件数 | 合格 | skip | 失敗 |
|---|---|---|---|---|
| 01-model-and-schemas | 9 | 9 | 0 | 0 |
| 02-positive-generic-mock | 12 | 12 | 0 | 0 |
| 03-token-vectors | 15 | 14 | 1（DPoP 非使用） | 0 |
| 04-pdp-vectors | 22 | 21 | 1（mTLS 再現不可） | 0 |
| 05-lifecycle | 16 | 16 | 0 | 0 |
| 06-sts-and-consumer | 10 | 10 | 0 | 0 |
| **計** | **83** | **81** | **2** | **0** |

PDP 注入 16 種中 15 種を流し、read・write とも 503（Retry-After 付き）、write の allow 0 件（締切 300 ms に対し接続遅延 700 ms でも打切り）。CV-001〜014 の該当分、CON-06 NE、LC-NE-01〜11、RO、LQN 7 件、INT-02 NPxx、workflow 負例はすべて期待どおり。結果ファイルは `expense-service/results/`。

## 7. 詰まった点（26 件）

### 重大（5 件）
- **P-01** 汎用モックの正例が契約に忠実な PEP を通らない（X-Request-ID が "string"、allow 例が `at_least_as_fresh` のみで write が格下げ判定、evaluations 件数固定、metadata 不一致、`Deprecation: string`）。INT-00 §6.3、CON-00 §2.5、FQ-43。
- **P-02** 引渡し資料が自己完結しない（結合確認と暫定 workload 登録が 12_poc/code 前提。SDK なし実装の正本 V1〜V14・11 関数・core 型が 04_architecture にのみ。INT-00 に ADR・ARC 参照 96 行）。
- **P-03** CON-08 の必須欄を依存サービスが埋められない場合がある（PDP 不達・L0 拒否時の decision_id、Txn-Token のない write の txn、prev_fp 初期値、参照値の鍵、監査送信先 API が未定義）。
- **P-04** 部署階層による承認者決定のモデル化指針がない（core/unit の公開 permission 一覧なし、部署長と unit#admin の意味の違い、矢印連鎖不可、所属部署を引く API なし。INT-02 §2.2 が経費精算を代表例に挙げるのに §9 に例なし）。
- **P-05** `action.name` の書き方が 3 通り（`can_read`／`docs.document.read`／`read`）。caller_scope 規則により取違えは本番で全件 deny、モックでは検出不可。

### 中（13 件）
P-06 subject.type の値の不一致（`core/user` と `human`）／P-07 PP-2 が searchResources を呼んでよいか不明／P-08 凍結区分キーが契約ごとに違う（`x-maturity`・`ga`・GA候補）／P-09 tid 形式と tier 表記が契約ごとに違う／P-10 fail-mode 設定文書・aud・alg・profile 版・env の差替え点がない／P-11 受付記録登録 API と TTS の JWKS がない、Prism の Txn-Token に tctx がない／P-12 CON-15 が拡張内にあり Prism に渡せない／P-13 CON-15 の不適合応答・4xx・未知 verdict の扱い未定義／P-14 負例の機械可読配布物がなく形式も不統一／P-15 lifecycle 正例の lcsig がダミーで再署名手順がない／P-16 承認依頼通知の送り先契約がない／P-17 手写し DSL に要る core 型定義がない／P-18 分量と密度（10_integration 約 1.0 MB、11_contracts 約 1.8 MB）。

### 小（8 件）
P-19 CON-05 例の scope 固定／P-20 search 例の型固定／P-21 base_revision 初回値不明／P-22 自サービスの SPIFFE ID 未払出し／P-23 MK-01 なしで CV-011 と CV-003 を区別できない／P-24 fga CLI の入手方法・版が未記載／P-25 401 応答の形が契約にない／P-26 責任者指名・Tier 仮申告は模擬では実施不可。

## 8. 改善提案（I-1〜I-14）

I-1 write の allow 例と件数連動の evaluations 例を CON-03 に追加し、汎用モックの制約と echo proxy を INT-00 §6.3・FQ-43 に明記して同梱／I-2 V1〜V14・11 関数・core 型の連携向け抜粋を 11_contracts に置き、スタブの最小構成を示す／I-3 CON-08 の decision_id 不在時・txn 不在 write・prev_fp 初期値・参照鍵・送信 API を定める／I-4 INT-03 §9 に承認経路（組織階層）の通し例と所属部署の取得手段を追加／I-5 action.name を動詞 permission 名に統一、subject.type の写像を 1 か所に／I-6 PP-2 の一覧候補生成の可否と NP09-4 の判定方法を明記／I-7 凍結区分キーの読替え表、tid・tier 表記を CON-02 に一本化／I-8 §11.4 に差替え点を追加し fail-mode 設定文書のスキーマを定める／I-9 受付記録登録 API と TTS JWKS を CON-05 に、subject_token_type を domain 非依存の URN に／I-10 CON-15 を単独ファイルに切出し、QC に不適合応答の扱いを追加／I-11 負例形式の統一、再署名手順、CV JSON の先行配布／I-12 業務通知の送信経路を INT-02 に／I-13 実装者向けの 1 枚の入口、改版履歴を末尾へ／I-14 base_revision 初回値、CLI の版と入手方法、401 の形。

## 9. 所要時間の目安

AI の壁時計で約 25 分。人のチーム（2 名）なら約 14〜22 人日（1.5〜2.5 週間）と推定（作業量からの推定で実測ではない。疑義窓口の往復時間は含まない）。

## 10. 判定: 基盤の完成を待たずに開発・試験を始められたか

**条件付きで「はい」。**
1. 始められたこと: パターン選定、モデル草案と fga 試験、契約適合した要求、token 負例・PDP 注入での fail-closed・ライフサイクル受信を、基盤の部品なしで実装・試験できた。
2. 文書の予告どおり始められなかったこと: キットによる CI 判定、署名検証の正例試験（自前鍵で代用）、mTLS を含む試験。
3. 文書と食い違ったこと: 汎用モックの正例確認は迂回なしでは成り立たない（P-01）。12_poc を使わない場合は自前スタブ一式が要る（P-02）。
4. 設計の確定を止めたこと: 部署階層による承認者決定（P-04）と監査イベントの一部（P-03）。実装開始は止めないが、DEC-8 後の再判定で手戻りの可能性が高い。

## 付録 A. 成果物の所在（`13_integration-trial/expense-service/`）

src/、test/（6 ファイルと harness）、model/（CON-04 形式と OpenFGA DSL）、scripts/、results/、contract-kit.manifest.yaml、CONTRACTS.lock.json
