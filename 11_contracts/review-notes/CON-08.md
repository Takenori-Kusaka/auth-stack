# CON-08 監査イベントスキーマ 独立レビュー記録

> 文書ID: CON-08（レビュー記録）/ 版: 0.1 / 状態: review / 最終更新: 2026-10-15
> 対応要求: R-118, R-119, R-127, R-232, R-257（DL-77）
> 依存文書: 11_contracts/schemas/audit-event.schema.json, CONVENTIONS.md, traceability/deliverables.md（DL-77）, 05_adr/ADR-005, ADR-009, ADR-011, ADR-014, ADR-021, 02_requirements/operation-risk-tiers-assurance.md, 04_architecture/audit-privacy.md, 04_architecture/claims-catalog.md, 11_contracts/schemas/common.schema.json（CON-02）, 11_contracts/scim.openapi.yaml, 11_contracts/ssf-caep.openapi.yaml

## 1. レビューの範囲と方法

- 対象: `11_contracts/schemas/audit-event.schema.json`（版 0.1 → 0.2）。レビュー者は作成者とは別のエージェント（Claude）である。人による照合はまだ行っていない（CONVENTIONS §8）。
- 観点: (1) 準拠標準の項目名・必須性・意味の写し、(2) ADR・04_architecture・上流文書との整合、(3) 機械検証、(4) 正例と負例の妥当性、(5) モック生成・コード生成への適性。
- 照合に使った資料: RS-10#3〜#9, #12, #13, #15, #16, #23, #33, #42, #57, #60、RS-06#41, #45, #73、RS-07#66, #68、RS-16#4、standards-status SS-I17・SS-I24・SS-C13・SS-A09・SS-B04。research にない原典は次の 3 件をレビュー時（2026-10-15）に取得した。RFC 7396 §2[^1]、RFC 6901 §3[^2]、W3C Trace Context §3.2.2.3[^3]。

## 2. 機械検証の結果

| 検証 | 方法 | 修正前 | 修正後 |
|---|---|---|---|
| JSON 構文 | `python -m json.tool` | エラー 0 | エラー 0 |
| メタスキーマ | jsonschema 4.26.0 `Draft202012Validator.check_schema` | 合格 | 合格 |
| 正例 | 同 validator（FormatChecker あり） | 2/2 合格 | 5/5 合格 |
| 負例 | 基底の正例に patch を当てて検証 | 12 件すべて不合格。ただし #3・#8・#9 は基底の例を決めないと受理される。#10・#11 は意図と違う理由で不合格になる | 20/20 が意図した理由で不合格 |
| 別実装 | Ajv 8.17.1（ajv/dist/2020、ajv-formats 3.0.1、strict:false） | — | compile 成功、正例 5/5 合格、負例 0/20 受理 |
| コード生成 | quicktype 23（TypeScript） | 生成できるが `detail` が `{[key: string]: any}` になる | `detail` に Detail* を合わせた型が生成される |
| OpenAPI lint | `@redocly/cli lint` | 対象外（OpenAPI 文書ではなく JSON Schema 単体） | 対象外 |

- Ajv を既定の strict モードで使うと、`x-` で始まる注釈 keyword で compile が止まる。また if/then 内の `properties`・`required` に `type` を書いていないため、strictTypes の警告が出る（検証結果は変わらない）。利用方法を `$comment` に追記した。

## 3. 指摘と処置（修正 14 件）

| # | 区分 | 指摘 | 処置 |
|---|---|---|---|
| RV-01 | ADR 整合（決定違反） | `resource.type` の pattern が `/` を受理しなかった。このため、ADR-021 D21-26 が定める正規名 `<名前空間コード>/<型名>` を記録できなかった。D21-26 は、監査の resource 型を AuthZEN の Resource.type と同じ値で揃えるとしている。CON-02 ResourceType とも合っていなかった。正例の値も `order` だった | pattern を CON-02 ResourceType と同じにした。正例を `commerce/order`・`can_update` に改めた。名前空間のない型名を負例に加えた |
| RV-02 | 上流文書整合 | `tier` が 5 分類しか持たず、REQ-03 §2.1 の副区分（privileged/T・/P、break-glass/B・/P）を記録できなかった。CON-02 OperationTier は 7 値で表しており、契約間で対応が取れなかった | `tier_sub`（T・P・B）を追加した。privileged は T・P、break-glass は B・P を必須にし、それ以外の階層では禁止した。正例 1 に `T` を付け、負例を 2 件追加した |
| RV-03 | 契約間整合 | `reason` の `deny_guardrail:<規則ID>` の規則 ID が大文字を受理し、CON-02 DecisionReason（小文字英数字で始まる）より広かった | 最上位の `reason_code` 条件と `DetailDecision.reason` の 2 箇所を CON-02 に揃えた |
| RV-04 | 契約間整合 | `profile_version` の pattern（`^[0-9]+\.[0-9]+$`）が、CON-02 ProfileVersion（先頭 0 なし・各 4 桁以下）より広かった | CON-02 と同じ pattern にした |
| RV-05 | 契約間整合 | `model_revision` を 128 文字まで受理していた。CON-02 ModelRevision（OpaqueId）は 64 文字以下である | 64 文字以下にした |
| RV-06 | ADR 整合（決定違反） | txn の必須条件が write・privileged だけだった。ADR-005 D9-3 は、要求 context を write・privileged・break-glass/B・FAPI 範囲で発行するとしており、break-glass/B が抜けていた | E1・E2 で break-glass/B のときに `corr.txn` を必須にした（RV-02 の `tier_sub` を使う）。負例を追加した。FAPI 範囲は監査欄で判別できないため対象外とし、§5 に残した |
| RV-07 | ADR 整合 | ADR-014 D14-12 は、AI エージェントが関わるイベントで委任元主体を必須にしている。しかしスキーマは mode=delegated のときしか `on_behalf_of` を求めず、自律動作のエージェントでは委任元を欠いたまま受理していた | `actor.chain` に `ai_agent` を含む場合は `on_behalf_of` を必須にした（`contains` を使用）。負例を追加した |
| RV-08 | ADR 整合 | ADR-009 D09-35 は、STS の交換台帳に出力 token の (iss, jti) を置くとしている。ADR-014 D14-20 は、TTS が txn を記録するとしている。しかし E4 の相関欄で必須だったのは iss だけだった | `ledger=sts` のときは `corr.iss`・`corr.jti_ref` を、`ledger=tts` のときは `corr.txn` を必須にした。TTS の正例（例 3）と負例を追加した |
| RV-09 | 上流文書整合 | REQ-03 §3.7 AU-2 は、判定記録に `acr`・`auth_time` を含めるとしている。しかし E1 にはこれらの欄がなく、`unevaluatedProperties=false` のため記録すらできなかった | `DetailDecision` に `acr`・`auth_time`（UtcTime）を追加し、自然人主体の E1 で必須にした。負例を追加した |
| RV-10 | コード生成・引用 | `corr.trace_id` の pattern が先読み `(?!0{32}$)` を使っていた。RE2 系の正規表現エンジン（Go・Rust など）では動かない。また全ゼロを無効とする根拠が書かれていなかった | pattern から先読みを除き、`not: {const: 0×32}` で拒否する形にした（CON-02 TraceId と同じ書き方）。根拠に W3C Trace Context §3.2.2.3 の原文を引いた[^3]。負例を追加した。スキーマ内の先読みは 0 件になった |
| RV-11 | 04_architecture 整合 | ARC-10 §2.2 の欄名（producer_id、actor.client_id、actor.act_chain、target.res_type、purpose_code など）が、本スキーマの位置（integrity.*、subject.client_id、actor.chain、resource.type、purpose.code）と違っていた。ARC-10 は欄名を「仮名」としている。しかし対応表がなく、実装者がどちらを使うべきか読み取れなかった | `x-arc10-name-map` を追加した。正本が本スキーマであることと、ARC-10 側の改訂が要ることを明記した |
| RV-12 | 負例の妥当性 | 負例に基底の例と patch の意味が書かれておらず、機械的に再現できなかった。#3・#8・#9 は基底の例によって受理された。#10（prev_fp=null）は、merge patch では null が「欄の削除」を意味するため、意図と違う理由（prev_fp 欠落）で不合格になっていた。#11（集約に subject）は判定の正例を基底にしており、detail の不一致で不合格になるだけで、`not anyOf` の検査になっていなかった | 各負例に `base` を付けた。`x-negative-examples-semantics` を追加し、RFC 7396 の merge patch[^1] のあと RFC 6901 の pointer[^2] で欄を削除すると定めた。#10 は例 1（producer_seq=1、prev_fp=null）を基底にして producer_seq だけを 2 に変える形にした。#11 は E10 の正例（例 4）を基底にした。#2 は subj_ref を null で削除する形にした |
| RV-13 | モック・コード生成 | 正例は E1 と E7 の 2 族だけだった。最上位の `detail` は `type: object` だけで、型生成ツールが Detail* の型を生成しなかった | E2（例 2）・E4 の TTS（例 3）・E10（例 4、tid=~platform、sealed）の正例を追加した。`detail` に Detail* の `anyOf` を付けた。族との対応は従来どおり allOf で検査する。quicktype で Detail 型が生成されることを確認した |
| RV-14 | 契約間整合・メタ | CON-05（ssf-caep）は stream 設定の変更を監査に残すとするが、E6 の `object_type` に対応する値がなかった。`$comment` は版 0.1 のままで、CON-02 が作成済みであることも反映していなかった | `object_type` に `ssf_stream` を追加した（minor 相当）。版を 0.2 にし、レビューの反映と機械利用の注意を追記した。`x-open-issues` を更新した（CON-02 との $id host の不一致、request_id の値域、修飾子の欄、SCIM の監査イベント名の写像） |

## 4. 確認して変更しなかった点

| 項目 | 確認内容 | 結果 |
|---|---|---|
| CADF の写し | outcome の root 値（success・failure・unknown・pending、SHALL）、REASON の "must be included"、observer モデル（RS-10#12, #13） | 一致 |
| RFC 8693 §4.1 | 最上位 claim と現在の actor だけをアクセス制御に使う（MUST）、入れ子の過去 actor は情報扱い（RS-06#45） | 一致。`actor.chain[0]` を現在の actor とする定義も矛盾しない |
| OCSF 1.9.0 の写像 | metadata.version は required、tenant_uid は recommended、sequence は optional、authorization の decision に列挙型がないこと、policy.version、record_integrity の prev_event、delegation・ai_agent オブジェクト（RS-10#3〜#9, #42） | 一致。RS-10 で確認していない属性を「写像表で確認」と書き分けている点も適切 |
| AuthZEN 1.0 の要求 ID | 要求 ID が付いていれば、PDP は同じ値を応答に含める（MUST）。OpenFGA の実装は返さない（RS-07#66, #68） | 一致。`request_id_echo` の設計は ADR-011 D5-5 と整合する |
| Transaction Tokens | Txn-Token の全文をログに残してはならない（MUST NOT、§15.2、RS-06#41）。版は draft-11（SS-B04） | 一致。全文を置く欄がなく、hash だけを持つ |
| SP 800-53 | AU-3(3)（PII 要素の限定、RS-10#15）、AU-8（UTC またはオフセット付きの時刻印、RS-10#33） | 一致 |
| PCI DSS v4.0 | 10.2.1.3〜10.2.1.6 と E3・E9 の対応（RS-10#23） | 一致 |
| txn の意味 | RFC 8417 の IANA 登録で固定されている（ADR-021 D21-36） | 一致 |
| 最小化 | token・資格情報・生の jti・平文 IP を置く欄がない。`unevaluatedProperties=false` を全階層に付けている | 負例で拒否されることを確認した |
| 族・必須欄 | D14-08 の 10 族、D14-09 の 4 区分、D14-23 の段階、D14-27 の時刻、D14-29 の L1/L2、D14-54 の tenant_seq | 一致 |

## 5. 残課題（本ファイル外、または決裁待ち）

| # | 内容 | 所有者（案） | 期限 |
|---|---|---|---|
| 1 | ARC-10 §2.2 の欄名を本スキーマに合わせる。「actor.* を全族で必須」は、E10 に actor がないこと（D14-16）と、E3・E4・E8・E9 の扱いに合わせて直す | ARC-10 の所有者 | DL-77 凍結前 |
| 2 | CON-02 と本スキーマの `$id` の host（.invalid と .example）を統一し、`$defs` を CON-02 への `$ref` に置き換える（ADR-021 K21-6） | DL-71・DL-77 の所有者 | K21-6 の決裁後 |
| 3 | `corr.request_id` の値域。CON-02 は ASCII 1〜128 文字、本スキーマは OpaqueId である。PEP SDK 以外が採番した値が検証で拒否されると、監査欠損になる | DL-72・DL-77 の所有者 | DL-77 凍結前 |
| 4 | SCIM の `x-audit-events`（scim.received 等）から family・event_type への写像。E6 の event_type は `admin.change` だけである | CON-04・DL-77 の所有者 | DL-77 凍結前 |
| 5 | E2 の reason_code の列挙（degraded・spool 拒否の理由）。E1 のように閉じた条件になっていない | DL-77 の所有者 | 族ごとの登録簿（DL-69）と同時 |
| 6 | E4 で ledger=as のとき jti_ref を必須にするか。refresh token のように jti を持たない token があるため、本レビューでは必須にしなかった | DL-77・ADR-007 の所有者 | DL-77 凍結前 |
| 7 | FAPI 範囲（ADR-005 D9-3）を txn 必須の条件にどう入れるか。現状の監査欄では FAPI 範囲を判別できない | ADR-005・ADR-020 の所有者 | U-02 の決裁と同時 |
| 8 | REQ-03 §2.3 の修飾子（+AGT など）を記録する欄 | REQ-03・DL-77 の所有者 | DL-77 凍結前 |

## 参考文献

[^1]: IETF『RFC 7396 JSON Merge Patch』Proposed Standard, 2014-10. https://www.rfc-editor.org/rfc/rfc7396 （参照箇所: §2、確認日: 2026-10-15）
[^2]: IETF『RFC 6901 JavaScript Object Notation (JSON) Pointer』Proposed Standard, 2013-04. https://www.rfc-editor.org/rfc/rfc6901 （参照箇所: §3、確認日: 2026-10-15）
[^3]: W3C『Trace Context』Recommendation, 2021-11-23. https://www.w3.org/TR/trace-context/ （参照箇所: §3.2.2.3、確認日: 2026-10-15）
