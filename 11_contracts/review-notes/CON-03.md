# CON-03 Authorization API 独立レビュー記録

> 文書ID: CON-03（レビュー記録）/ 版: 0.1 / 状態: review / 最終更新: 2026-10-15
> 対応要求: R-098, R-144, R-205（DL-72）、G-066, G-120, G-121
> 依存文書: 11_contracts/authorization-api.openapi.yaml, CONVENTIONS.md, traceability/deliverables.md（DL-72）, 05_adr/ADR-010, ADR-011, ADR-013, ADR-016, ADR-021, ADR-022, ADR-025, 04_architecture/authorization-model.md（ARC-05）, 04_architecture/pep-contract.md（ARC-06）, 11_contracts/schemas/common.schema.json（CON-02）, research/RS-07-authz-engines-consistency.md, research/standards-status.md

## 1. レビューの範囲と方法

- 対象: `11_contracts/authorization-api.openapi.yaml`（OpenAPI 3.1.2）。レビュー者は作成者とは別のエージェント（Claude）である。人による照合はまだ行っていない [D]。
- 観点: (1) 準拠標準の項目名・必須性・意味の写し、(2) ADR・04_architecture・CON-02 との整合、(3) 機械検証、(4) 正例と負例の妥当性、(5) モック生成・コード生成への適性。
- 原典の再確認: OpenID AuthZEN Authorization API 1.0 Final（2026-01-11）の全文を 2026-10-15 に取得し、§4〜§10.1.3 と §12.1.3 を照合した [N][^1]（RS-07#60〜#66）。版と状態は standards-status SS-C13（final、確認日 2026-10-03）と一致する [D]。

## 2. 指摘と処置（修正 19 件）

| # | 区分 | 指摘 | 処置 |
|---|---|---|---|
| 1 | 標準の写し | `EvaluationsRequest`: AuthZEN §7.1 では、`evaluations` が無いか空の要求は単一の Access Evaluation 要求（§6.1）と同じに振る舞う [N][^1]。このとき上位の subject・action・resource は必須になるが、スキーマはどれも必須にしていなかった。そのため、空の `evaluations` だけを持つ要求がスキーマ上は妥当になっていた | `anyOf`［evaluations が 1 件以上］／［上位の subject・action・resource が揃う］を追加した。要素ごとの補完後の充足は façade が検査して 400 にすると明記した（§7.1.1・§10.1.1）。負例 `emptyWithoutDefaults` を `x-negative-examples` に追加した |
| 2 | 標準の写し | `EvaluationsResponse`: `evaluations` を必須にしていたため、上の後方互換の要求に対する §6.2 形式の応答（上位の `decision`）を表せなかった | `anyOf`［evaluations］／［decision］とし、上位の `decision` を定義した。上位の profile は `ProfileBatch`（batch_decision_id）か `ProfileDecision` とした。正例 `singleCompat` を追加した。PEP SDK は evaluations が 1 件以上の場合にだけ呼ぶ、という規則を本契約の SDK 規則として [D] で明記した |
| 3 | 引用誤り | §2 の表は `reason` を「GA（ADR-022 D-2 の DL-72 行）」としていた。しかし ADR-022 D-2 の DL-72 行が GA に挙げるのは、evaluation・evaluations、metadata、X-Request-ID、`decision_id`、不透明な consistency token だけである | `reason` を `consistency.mode`・`model.pin`・`profile_version` と同じ「GA 候補（区分は未決（ADR-022））」に移した |
| 4 | ADR 整合 | `txn` が「GA 候補」になっていた。しかし ADR-022 D-1-1 は、Internet-Draft に依存する要素を preview 以下に置くと定めている。Transaction Tokens は Internet-Draft（SS-B04）である | §2 の表で preview に移し、スキーマに `x-maturity: preview` を付けた |
| 5 | ADR 整合 | `Reason` の説明は「値の追加は minor（後方互換）」と断定していた。ADR-016 P16-2 はこれを未決としており、ADR-016 の現行定義では閉じた enum への値の追加は破壊的変更になる | 「未決（ADR-016 P16-2）」に改めた。PEP が未知の値を拒否として扱う規則は残した |
| 6 | 契約間整合 | `ModelRevision` の項目名が `model`・`guardrail_catalog` で、CON-02 `ModelRevision` と CON-08 監査イベントの `model_revision`・`guardrail_catalog_version` と違っていた。値の制約（128 文字、文字種なし）も CON-02（OpaqueId、64 文字）と違っていた | 項目名を CON-02・CON-08 に揃え、全 example を直した。形式は印字可能 ASCII で 1〜64 文字にした |
| 7 | 契約間整合 | `Reason` の規則 ID の pattern `[a-z0-9_.-]{1,64}` が、先頭の `_`・`.`・`-` を許していた。CON-02 `DecisionReason` の `[a-z0-9][a-z0-9._-]{0,63}` と違う | CON-02 の pattern に揃えた |
| 8 | 意味の誤り | `ConsistencyToken` の上限は「1,024 バイト」と書いているが、JSON Schema の `maxLength` は文字数を数える。非 ASCII の文字を含めると 1,024 バイトを超えられた | 印字可能 ASCII の pattern を付け、文字数とバイト数を一致させた（CON-02 と同じ） |
| 9 | 契約間整合 | `TenantId` に文字種の制約がなかった（CON-02 `TenantId` は OpaqueId で印字可能 ASCII） | CON-02 と同じ pattern を付けた |
| 10 | ADR 整合 | `txn` の上限が 256 文字だった。ADR-021 D21-36 は txn を D21-09 と同じ不透明な乱数形式とし、CON-02 `TransactionId` は OpaqueId（1〜64 文字）である | 印字可能 ASCII で 1〜64 文字にした |
| 11 | 標準の写し・内部矛盾 | 負例 `foreignToken` は「別の主体・テナント・条件に束縛された token は 403」としていた。一方 `Forbidden` の説明は「他主体・他テナント」だけを挙げており、食い違っていた。AuthZEN §8.2 は、続きのページで entity とパラメータを変えることを MUST で禁じ、変更時に PDP がエラーを返すことを SHOULD としている [N][^1]。これに対応する応答もなかった | 他の主体・テナントの token は 403、同じ主体で条件や `limit` を変えた要求と期限切れの token は 400 とした（状態コードは本契約の選択 [D]）。`BadRequest`・§3・負例の説明を揃え、脚注 [^2] の参照箇所に §8.2 を追加した |
| 12 | 標準の写し | `getPdpMetadata` は応答で X-Request-ID を echo すると定めながら、要求側のパラメータを宣言していなかった。AuthZEN §10.1.3 の要求 ID は全要求が対象である [N][^1] | `XRequestId` パラメータを追加した |
| 13 | 標準の写し | `policy_decision_point` に、§9.1.1 の「https scheme で query・fragment を持たない URL」という制約がなかった [N][^1] | pattern `^https://[^?#]+$` と説明を追加した |
| 14 | 標準の写し（注記） | AuthZEN §8.2.1 の本文は capability の metadata を `supported_capabilities` と呼んでいる。一方、§9.1.2 の定義と §12.1.3 の IANA 初期登録は `capabilities` である [N][^1]。契約は `capabilities` で正しいが、読み手が迷う | 説明に原典の不一致と、`capabilities` を採る理由を書いた |
| 15 | example の妥当性 | consistency token の例 `v1.ofga.AAAAB3NzaC1yc2E…` の後半は、SSH の RSA 公開鍵の base64 の先頭（"ssh-rsa"）だった。また製品名の略号を含んでいた（G-120 は契約の製品非依存を求める）。要求と応答で同じ値を使っていたため、応答の token が「engine が返した新しい値」であることも読み取れなかった | 製品名を含まない値（`v1.e1.…`）に替え、応答側は要求と別の値にした |
| 16 | モック適性 | 応答の例に評価不能（`deny_indeterminate`）と未対応 profile（`unsupported_profile`）がなく、要求側の負例 `missingTenant`・`unsupportedProfile` に対応する応答をモックが返せなかった | 応答の例 `indeterminate`・`unsupportedProfile` を追加した |
| 17 | 機械検証 | `info.x-last-updated: 2026-10-15` が引用符なしだった。YAML 1.1 の読込器はこれを date 型にするため、JSON へ変換すると失敗した（PyYAML で再現） | 文字列にした |
| 18 | ADR 整合・コード生成 | `Completeness` は、`incomplete` に理由が必須であることをスキーマで表していなかった（ADR-025 D25-07・D25-21）。if/then/else で表すと、Redocly の example 検査が正例を誤って不合格にした | `x-constraint` で規則を宣言し、契約試験キット（DL-80）で検査する形にした |
| 19 | メタ情報 | `x-depends-on` に「common.schema.json は未作成」とあったが、CON-02 はすでに作成されている。冒頭のメタ情報には独立レビューの記録がなかった | CON-02 と揃えた項目と、残る差分の所在（本書 §4）を書いた。冒頭にレビュー実施の行を追加した |

## 3. 確認して変更しなかった点

- 情報モデル（Subject・Resource の `type`・`id` が REQUIRED、`properties` が OPTIONAL、Action の `name`、Decision の `decision`）は、§5.1〜§5.5 と一致する [N][^1]（RS-07#63）。
- `evaluations_semantic` の 3 値と既定値 `execute_all`、上位の `decision` の省略（RECOMMENDED）は、§7.1.2.1・§7.2 と一致する [N][^1]（RS-07#64）。
- Search の要求（`resource.id` は SHOULD で省略、含まれていても MUST で無視）と応答（`results` が REQUIRED）、page の各項目（`token`・`limit`・`properties`、`next_token` が REQUIRED、続きがなければ空文字列）は、§8.2.1〜§8.5.1 と一致する [N][^1]（RS-07#65）。
- PDP metadata の項目名と必須性（`policy_decision_point`・`access_evaluation_endpoint` が REQUIRED）、§9.2.3 の不一致時の MUST NOT は、原典と一致する [N][^1]（RS-07#66）。
- エラー（400・401・403・500 の本文は「エラーメッセージ文字列」、拒否は 200 と `decision: false`）は §10.1.2 と一致する [N][^1]。429・503 は AuthZEN の表にない追加であり、契約自身が profile の追加と明記している [D]。本文の media type を `text/plain` にしたのは、原典が media type を定めていないことに基づく本契約の選択である [D]。
- subject search を公開しないことは ADR-011 D5-2・ADR-025 D25-03 の決定である。DL-72 の行は「search（subject/resource/action）の profile」を求めているが、この点は決定済み ADR に従っている [D]。action search の扱いは ADR に明記がなく、契約は「未決（ADR-011／ADR-025）。暫定で公開しない」と書いている。この書き方を維持した [D]。
- tid の欠落を 400 にせず `deny_indeterminate` にすること（ADR-011 D3-3）、テナント不一致を G 段規則で deny にすること（ADR-010 D-28）、engine 不達を 200・`deny_unavailable` で返すこと（ADR-011 D3-6）は、いずれも ADR と ARC-05 §4.1・ARC-06 §3.5 に一致する [D]。
- `page.total` に `not: {}` を課す書き方は、openapi-typescript で `total?: unknown` として生成される。生成は妨げないので維持した [D]。

## 4. 残る論点（本書では直さず申し送る）

| # | 論点 | 申し送り先 |
|---|---|---|
| L-1 | ADR-011 D3-3 は「facade が理解できない profile の major 版」を評価不能（`deny_indeterminate`）の列挙に含める。一方、D6-1 の表は `unsupported_profile` を返すとしている。契約は D6-1 と ARC-06 §3.5 に従った | ADR-011 の所有者（ADR 内の記述の統一） |
| L-2 | CON-02 `PepPdpProfileRequest` は `profile_version` を必須にしている。CON-03 は「欠ければ 1.0」としている。CON-02 にある `operation_tier` は CON-03 にない。CON-02 `ConsistencyRequest` には `dependentRequired`（token→mode）と `additionalProperties: false` があるが、CON-03 にはない | CON-02・CON-03 の所有者（CON-02 review-notes H-3 と同時に DL-72 凍結前に決める） |
| L-3 | 型名の pattern が違う。CON-02 `ResourceType` は pattern を課すが、CON-03 `EntityType` は「未決（ADR-021）」として課さない。このほか、CON-02 は `DecisionId` の最小長が 1、`RequestId` が印字可能 ASCII、`Traceparent` が version 00 だけである。action 名の例も違う（CON-02 は `read`、CON-03 は `can_read`） | 同上（共通型を CON-02 へ移すときに一本化する） |
| L-4 | OpenFGA で暫定の常時格上げ（U-03）を使う場合に、応答の `consistency.mode` に何を返すかが決まっていない。ADR-011 D6-3 は、HIGHER_CONSISTENCY を TC-011-04 の実測まで等価な保証として扱わないとしている | 未決（ADR-010 §2.12 決裁案 2、ADR-011 D6-3） |
| L-5 | GA の Decision 応答は、表現が preview の `model_revision` を必須で含む。ADR-022 D-1-1 の「GA から preview への必須依存を作らない」との関係が決まっていない。契約の §2 に注記を置いた | 未決（ADR-022） |
| L-6 | モックサーバー（Prism 等）での起動は試していない。コード生成は openapi-typescript 7.4.4 で成功した | DL-80（契約試験キット）で確認する |

## 5. 機械検証の結果（修正後）

| 検査 | 結果 |
|---|---|
| `npx --yes @redocly/cli@latest lint`（2.63.0、recommended 規則） | エラー 0、警告 0 |
| YAML から JSON への変換と `python -m json.tool` | 成功 |
| example の検査（jsonschema 4.26、Draft 2020-12、`$ref` 解決込み） | 正例 24 件はすべて適合した。`x-negative-examples` の 3 件（subject.id の欠落、空の evaluations で既定値がない要求、limit 超過）はすべて不適合と判定された |
| コード生成（openapi-typescript 7.4.4） | 成功 |

## 参考文献

[^1]: O. Gazitt, D. Brossard, A. Tulshibagwale (Eds.), OpenID AuthZEN WG『Authorization API 1.0』Final, 2026-01-11. https://openid.net/specs/authorization-api-1_0.html （参照箇所: §4, §5.1〜§5.5, §6.1〜§6.2, §7.1〜§7.2.1, §8.1〜§8.5.1, §9.1〜§9.2.3, §10.1〜§10.1.3, §12.1.3、確認日: 2026-10-15）（RS-07#60〜#66）
