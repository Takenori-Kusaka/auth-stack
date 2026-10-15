# CON-06 Access token claims スキーマ 独立レビュー記録

> 文書ID: CON-06-RV（レビュー記録）/ 版: 0.1 / 状態: review / 最終更新: 2026-10-15
> 対応要求: R-161, R-162, R-249, R-250, R-283（DL-75）
> 依存文書: 11_contracts/schemas/access-token-claims.schema.json, CONVENTIONS.md, traceability/deliverables.md（DL-75）, 05_adr/ADR-005, ADR-009, ADR-016, ADR-017, ADR-021, 04_architecture/claims-catalog.md（ARC-15）, 04_architecture/token-profile.md（ARC-02）, 11_contracts/schemas/common.schema.json（CON-02）, 11_contracts/token-exchange.openapi.yaml, research/RS-04, RS-06

## 1. レビューの範囲と方法

- 対象: `11_contracts/schemas/access-token-claims.schema.json`。対象範囲はルート（内部 access token の claim セット）と、`$defs` にある JOSE header、introspection 応答、外部 ID Token の基盤固有 claim、Txn-Token（txn-v1）である。レビュー者は作成者とは別のエージェント（Claude）であり、人による照合はまだ行っていない。
- 観点: (1) 準拠標準の項目名・必須性・意味の写し、(2) ADR・04_architecture・他の契約との整合、(3) 機械検証、(4) example と負例の妥当性、(5) モック生成・コード生成への適性。
- 原典の再確認（2026-10-15 取得）: RFC 9068 §2.1・§2.2・§2.2.3.1・§5[^1]（RS-04#60, #61）、RFC 9701 §5[^2]（RS-04#68）。Transaction Tokens draft-11 は RS-06#31〜#42 の検証済み項目と照合した[^3]。
- DL-75 行の要点（iss、sub、aud、tid、client_id、scope、cnf、act、auth_time、acr、版の claim と、種別ごとの typ）は、すべて定義されていることを確かめた。

## 2. 指摘と処置（修正 13 件）

| # | 区分 | 指摘 | 処置 |
|---|---|---|---|
| 1 | 標準の写し | `accessTokenJwsHeader` で「typ は RFC 9068 §2.1 の MUST」と書いていた。原典で MUST なのは typ に media type を入れることで、値を `at+jwt` にするのは SHOULD である[^1]（RS-04#60） | 強度を原典どおりに書き分けた。本 profile が発行値を `at+jwt` に固定することは [D] と明記した |
| 2 | 引用誤り | `serviceAudience` で「resource ごとに異なる aud（MUST）」の出典を RFC 9068 §3 としていた。この規定は §5（Security Considerations）にある[^1]（RS-04#61） | §5 に直し、脚注 [^1] の参照箇所に §5 を加えた |
| 3 | 引用の精度 | 脚注 [^8]（RFC 9701）の参照箇所が粗かった | §5 の iss・aud・iat・token_introspection（MUST）と、sub・exp を入れないこと（SHOULD NOT）を参照箇所として書いた[^2]。`introspectionJwtClaims` は追加の claim を許さないので、SHOULD NOT より強い形で満たしている |
| 4 | 引用の精度 | 本文では draft-11 の §11.3・§13.12・§13.13・§13.15 を引いているのに、脚注 [^11] の参照箇所に載っていなかった | 参照箇所に追加した（RS-06#33, #36, #40） |
| 5 | 契約間整合 | `opaqueId` の pattern `^[a-z0-9][a-z0-9-]{15,63}$` は、CON-02 の `IssuedOpaqueId` が定める 2 候補（小文字 base32 26 文字、UUIDv4 小文字 36 文字。ADR-021 D21-09）のどちらにも当たらない値を通していた。例として `usr-7f4c9e2a` や `aaaaaaaaaaaaaaaa-` がある。本 schema は発行側の検査（D21-42 (c)）用なので、払い出し規則で検査するのが筋である | CON-02 `IssuedOpaqueId` と同じ `anyOf` の 2 pattern に改めた。`$id` の基底が異なり相対 `$ref` では解決できないため、pattern を複製して持つ形にし、そのことを注記した。受信側は CON-02 の `OpaqueId` を使い、本 pattern では拒否しないとも書いた（ARC-02 TP-08） |
| 6 | ADR 整合 | token の `iss` の形の制約が `https://` + path 可だけだった。また example が `https://iss.id-domain.example/i/q7k2` のように path を持っていた。これは ADR-021 D21-03 の `https://<p>.<id-domain>`（path なし）にも、CON-02 の `Issuer` にも、token-exchange 契約の例（`https://sts.<label>.id-domain.example`）にも合わない | `issuerId`（CON-02 `Issuer` と同じ pattern）を新設し、AT・IR・TX・RFC 9701 応答の `iss` に適用した。example の iss は path なしの形に直した。`act.iss` だけは他の issuer を指し得るので、従来の `httpsUrl` のままにした。粒度（U-01）は未決のまま残した |
| 7 | ADR 整合 | ADR-017 D17-50 は、委任時の `act` の現在の actor にも主体種別を入れると決めている。しかし `actor` は `sub`・`iss` だけを許し、主体種別を入れると不合格にしていた | 最外の `act` で `ptype` を必須にし、入れ子では任意にした。examples[2] に `ptype: ai_agent` を加えた。NE-11（深さ超過）は不合格の原因を 1 つに保つため、最外に `ptype` を加えた |
| 8 | ADR 整合 | ADR-021 D21-23 は client_id の値域を sub と分けると決めている。ところが examples[1] は `client_id` と `sub` が同じ値で、examples[2] は `client_id` と `act.sub` が同じ値だった（説明文でも「同じ値」と明記していた）。負例 8 件も `client_id`＝`sub` だったため、意図した原因とは別に NV-38 違反を含んでいた | 値を分けた。examples[1] では sub を workload の主体 ID、client_id を別の値にした。examples[2] では act.sub をエージェント主体、client_id を委任用 client にした。説明文を直し、負例の client_id も差し替えた |
| 9 | 内部整合 | `introspectionActive` は、利用者主体に必須の項目は内部 access token と同じにしていた。一方で、非人間主体に認証文脈（acr・amr・auth_time・sid）を載せない規則は持っていなかった | 内部 access token と同じ `if`/`then` を追加した |
| 10 | コード生成 | 禁止 claim を `false` schema で表していたため、quicktype 23.0.170 が `Schema "false" is not supported` で停止した | 52 か所を同じ意味の `{ "not": {} }` に置き換え、理由を `$comment` に記した。`additionalProperties`・`unevaluatedProperties` の `false` は、生成器が扱えるので変えていない |
| 11 | 未決の明示 | 契約間と上流文書間の差が x-open-issues に載っていなかった（§3 の R-07・R-08） | 2 項目を追加した |
| 12 | 負例 | 修正 5〜9 で加えた規則に負例がなかった | NE-22 を追加した（最外 act に ptype なし）。同じく NE-23（iss に path）、NE-24（sub・client_id が払い出し形式でない）、NE-25（workload の introspection 応答に acr・amr）を追加した |
| 13 | メタ情報 | `$comment` に「自己レビュー」とだけ書かれていた | 独立レビューを実施したことと本記録の所在を追記した。AI によるレビューであり、決裁ではないことは残した |

## 3. 確認して変更しなかった点・作成者以外への指摘

| ID | 内容 | 扱い |
|---|---|---|
| R-01 | RFC 9068 §2.2 の REQUIRED（iss, exp, aud, sub, client_id, iat, jti）がルートで必須になっている[^1]（RS-04#60） | 適合。変更なし |
| R-02 | RFC 9068 §2.1 の RS256 MUST から逸脱して ES256 だけを発行している | ARC-02 X-01 に記録済みの逸脱で、受容票は ADR-005 K-4 にある。変更なし |
| R-03 | `act` を判定に使う範囲（最上位 claim と現在の actor だけ。RFC 8693 §4.1 の MUST、RS-04#66）は記述どおりである。入れ子の深さ 3 は N_act の初期案（前提台帳へ追加要） | 変更なし |
| R-04 | Txn-Token の必須 claim（iat, aud, exp, txn, sub, scope, req_wl）と、txn-v1 で必須に格上げした iss・tctx は RS-06#31 と ARC-15 §3.5 に一致する。rctx・purp の不発行（ADR-009 D09-30, D09-31）も一致する | 変更なし |
| R-05 | `acrInternal` に L0 がない。ARC-15 の acr 行は L0〜L3 を挙げているが、L0 で access token を発行するかは ADR-002 の所有者が決める（KC-7）。x-open-issues に記載済み | 変更なし |
| R-06 | `scopeString` の文字種は RFC 6749 §3.3 の scope-token と同じである。`spiffeId` の文字種は SPIFFE-ID §2 と同じである | 変更なし |
| R-07 | **他の契約への指摘**: `11_contracts/token-exchange.openapi.yaml` の内部 access token の payload 例が、本 schema と食い違っている。食い違いは 4 点ある。(a) `act.sub` に SPIFFE ID を入れている。(b) sub・tid・client_id・jti に払い出し規則外の値（`usr-7f4c9e2a`、`cl-web-01` 等）を使っている。(c) Txn-Token 例の txn（`tx_k7Qp…`）は大文字と `_` を含む。(d) act.sub に何を書くかは ADR-009 D09-14・ADR-021 D21-10 から一意に決まらない | (d) は本 schema の x-open-issues に「未決（DL-74）」として記載した。(a)〜(c) は token-exchange 契約の担当者に修正を求める（本レビューでは他ファイルを編集しない） |
| R-08 | **上流文書への指摘**: 内部 access token の scope は、ARC-02 §4.3 の判別表では「必須」、ARC-15 §3.3 では「条」になっている。sid は、ADR-005 D9-4 では利用者主体で必須、ARC-15 §3.4 では「条（利用者 session 由来）」になっている。ARC-15 §3.2 の typ 行も「`at+jwt` を MUST」と書いており、#1 と同じく強度の写しが不正確である | 本 schema は scope を ARC-15（採用区分の正本）に、sid を ADR-005（決定の正本）に従わせた。ARC-02・ARC-15 の所有者に、表記を揃えるよう求める |
| R-09 | `$id` の host と版の表し方が契約ごとに違う。CON-02 は `contracts.id-domain.invalid/schemas/v1/`、CON-06 は `id-domain.example/contracts/schemas/…/0.1.0/`、SSF は `contracts.id-domain.example/schemas/…/0.1.0/` である | `$id` を変えると参照側に影響するので変えなかった。契約全体の命名規則として DL-71 の所有者に揃えるよう求める（K21-6 の決裁時） |
| R-10 | JSON Schema では検査できない規則がある。exp > iat、寿命の上限、aud が共通 aud でないこと、tid と資源テナントの一致、sub と client_id の値域分離、token サイズ 6,144 byte、署名と鍵の結合である | x-negative-examples-outside-schema に従い、SDK と契約試験（DL-80）で確かめる。拒否率 100% の実測（R-161・R-162・G-088 の区分 C）は未達のまま |

## 4. 機械検証の結果

| 検査 | 結果 |
|---|---|
| `python -m json.tool` | エラー 0 |
| `jsonschema` 4.26.0 `Draft202012Validator.check_schema` | エラー 0 |
| ルート examples 3 件と `txnTokenClaims` の example 1 件の検証 | 4 件とも合格 |
| x-negative-examples 25 件（NE-01〜NE-25）を、それぞれの `target` に対して検証 | 25 件とも期待どおり不合格。NE-25 は acr・amr を除くと合格することを確かめ、原因が 1 つであることを確認した |
| quicktype 23.0.170（`--lang typescript --just-types`） | 修正前: `false` schema で停止。修正後: 生成に成功し、最外 act の `ptype` は必須、入れ子は任意として出力された。quicktype はルートから辿れる型しか出さないので、Txn-Token や introspection の型は `-s schema` に `#/$defs/txnTokenClaims` などの定義を指定して個別に生成する |

検証に使ったスクリプトと生成物はレビュー者の作業領域に置いた一時ファイルで、成果物には含めない。`format: uri` は、検証環境に URI 形式のチェッカがないため注釈としてだけ扱われる。iss の形は pattern で検査している。

## 参考文献

[^1]: IETF (V. Bertocci)『RFC 9068: JSON Web Token (JWT) Profile for OAuth 2.0 Access Tokens』2021-10. https://www.rfc-editor.org/rfc/rfc9068 （参照箇所: §2.1 typ、§2.2 REQUIRED claim と client credentials 時の sub、§2.2.3.1、§5 aud の区別、確認日: 2026-10-15）RS-04#60, #61
[^2]: IETF『RFC 9701: JSON Web Token (JWT) Response for OAuth Token Introspection』2025-01. https://www.rfc-editor.org/rfc/rfc9701 （参照箇所: §5、確認日: 2026-10-15）RS-04#68
[^3]: A. Tulshibagwale, G. Fletcher, P. Kasselman / IETF『Transaction Tokens』draft-ietf-oauth-transaction-tokens-11, 2026-07-30（Internet-Draft、状態: draft、IESG 未提出。standards-status SS-B04）. https://www.ietf.org/archive/id/draft-ietf-oauth-transaction-tokens-11.txt （参照箇所: §9.1, §9.2, §11.3, §13.12, §13.13, §13.15, §15.2、確認日: 2026-10-03）RS-06#31〜#42
