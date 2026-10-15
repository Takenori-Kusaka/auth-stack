# CON-04 Relationship/Model Registry API 独立レビュー記録

> 文書ID: CON-04-RV（レビュー記録）/ 版: 0.1 / 状態: review / 最終更新: 2026-10-15
> 対応要求: R-091, R-145, R-147, R-148（DL-73）
> 依存文書: 11_contracts/relationship-model-registry.openapi.yaml, CONVENTIONS.md, traceability/deliverables.md（DL-73）, 05_adr/ADR-010, ADR-011, ADR-016, ADR-021, ADR-022, 04_architecture/authorization-model.md, 11_contracts/authorization-api.openapi.yaml（CON-03/DL-72）, 11_contracts/schemas/common.schema.json（CON-02）

## 1. レビューの範囲と方法

- 対象: `11_contracts/relationship-model-registry.openapi.yaml`（版 0.1.0 → 0.1.1）。レビュー者は作成者とは別のエージェント（Claude）である。人による照合はまだ行っていない [D]。
- 観点: (1) 準拠標準の項目名・必須性・意味の写し、(2) ADR・04_architecture・他契約との整合、(3) 機械検証、(4) example と負例の妥当性、(5) モック生成・コード生成への適性。
- DL-73 行の要点（tuple の書込み・読取り・削除、consistency token、model 版の登録・pin・shadow・rollback、export/import）は全て operation として存在することを確かめた [D]。
- ADR-022 D-2 の DL-73 行は「標準なし（D-1-1(b)）」であり、本契約が写す外部標準は RFC 9457（エラー形式）と、HTTP の状態コード（RFC 9110）に限られる [D]。エンジンの識別子規則は標準ではないが、エンジン差替え（ADR-010・ADR-011 D10-1）の前提になるため原典で照合した [D]。
- 原典の再確認（2026-10-15 取得）: RFC 9110 §15.5.10・§15.5.13[^1]、authzed/api `core.proto` の validate rules[^2]。RFC 9457 §3.2（RS-16#12）、SpiceDB の既定上限（RS-07#32・#35）、AuthZEN の状態（standards-status SS-C13）、RFC 9457 の状態（SS-A47）は research の記載と一致した。

## 2. 指摘と処置（修正 12 件）

| # | 区分 | 指摘 | 処置 |
|---|---|---|---|
| 1 | 標準の写し | `writeRelationships` の body の `preconditions` 不成立を 412 で返していた。RFC 9110 §15.5.13 の 412 は「要求ヘッダの条件が偽と評価された」場合の状態コードであり[^1]、body の条件には当たらない | 409 `precondition_failed`（RFC 9110 §15.5.10 の「対象資源の現在の状態との競合」[^1]）に改め、同 operation から 412 応答を削除した。`PreconditionFailed` 応答の説明を If-Match 専用に、`Conflict` の説明に preconditions を追記した。原典を `x-references` ^15 に追加した |
| 2 | ADR 整合 | example の ID が全て ULID（先頭 48 bit が時刻、大文字）だった。ADR-021 D21-09・D21-12 は tid・sub に時刻を含めず小文字英数字で払い出すとし、D21-14 は時刻順 ID を外部に出ない内部 DB キーに限る。tuple の ID は契約を越えて渡る値である | 12 種の値（tenant・user・group・folder・document・job・shadow・rollout・rollback・namespace request）を、時刻を含まない小文字英数字 26 文字の値に置き換えた |
| 3 | エンジン可搬性 | `ObjectId` が `.`・`~` を許していた。SpiceDB の `object_id` の文字種は `[a-zA-Z0-9/_|\-=+]` で[^2]、`.`・`~` を含む ID はエンジン差替え（ADR-011 D10-1）後に書けなくなる | 文字種を英数字・`_`・`-` に絞り、根拠と、`/`・`|`・`=`・`+` を含めない理由（OpenFGA 側の規則が未確認、authorization-model.md §3.3 X-2）を description に書いた。原典を ^16 に追加した |
| 4 | 契約間整合 | `ObjectId` の最大長 256 が、CON-02 `ResourceId`（受信側の上限 128）を超えていた。DL-73 で書けても DL-72 で判定要求に載せられない ID が生じ得る | 最大長を 128 に揃えた（CON-02 と同じく DL-73 凍結前に確定の仮置き） |
| 5 | ADR 整合 | `TenantId` が 128 文字・`.`・`~` を許していた。ADR-021 D21-09・D21-12 は 64 文字以下の ASCII 不透明文字列とする | 64 文字以下・ObjectId と同じ文字種にし（`core/tenant` の object ID として tuple に現れるため）、符号化の候補が未決（ADR-021 D21-09）であることを明記した |
| 6 | エンジン可搬性 | 名前空間コードを 3〜64 文字としていたため、型名 `<ns>/<type>` が最大 129 文字になっていた。SpiceDB の `object_type` は接頭辞部分が 3〜63 文字、全体 128 バイト以下である[^2] | `NamespaceCode` と、型名を含む 4 つの pattern の接頭辞部分を 3〜63 文字にした。X-2 案（各 3〜64 文字）との差と、X-2 確定時に見直すこと（未決）を description に書いた |
| 7 | 契約間整合 | 読取り応答の実効モードの項目名が `consistency.effective_mode` で、DL-72 の応答 `consistency.mode`（実効モード）と違っていた。生成コードで同じ型を共有できない | `consistency.mode` に改め、operation の説明・負例・example を合わせた |
| 8 | 引用誤り | info §4 で、検証できない token の格上げの根拠に ADR-011 D6-1 を挙げていた。D6-1 は標準外項目を `context` で運ぶ規則であり、格上げは D6-3、移行窓の token の読替えは D10-1 C-10 にある | 根拠を「ADR-010 D-15、ADR-011 D6-3・D10-1 C-10」に改めた |
| 9 | 負例 | `startShadowRun` の負例が `state=registered（検証未合格）` を前提にしていたが、`ModelRevisionState` に `registered` はなく、検証不合格の変更は登録されない（`registerModel` の説明、authorization-model.md §12.1） | 負例を「`review_status=under_review`（段 2 の追加承認が未了）の revision で開始 → 409 `stage_gate_not_met`」に改めた |
| 10 | 負例 | `registerModel` の負例の名前空間 `hr` は 2 文字で、`NamespaceCode` の pattern に合わず、期待する 403 `namespace_not_owned` の前にスキーマで 400 になる | `hrm` に改めた |
| 11 | 負例 | 識別子規則の負例 `tenantA-yamada-taro-report.pdf` は、#3 の修正後は `.` のため façade の検査より先にスキーマで 400 `invalid_request` になる | 値を `tenantA-yamada-taro-report` にし、`.pdf` 付きはスキーマで先に拒否されることを併記した |
| 12 | モック・コード生成 | `info` の `RequestId` パラメータは「応答で同じ値を返す」としているのに、12 の成功応答（GET 系と `updateTenantModelPin`）が `X-Request-ID` ヘッダを宣言していなかった。`getRollout`・`listModels`・`updateTenantModelPin` の 200 には example がなく、モックが空の応答を返す。`listModels` は不正な `page_token` に対する 400 がなかった | 12 応答に `X-Request-ID` ヘッダを追加し、3 応答に example を追加し、`listModels` に 400 を追加した。版を 0.1.1 にした |

## 3. 機械検証の結果

| 検証 | 結果 |
|---|---|
| `npx --yes @redocly/cli@latest lint`（recommended 構成） | エラー 0・警告 0（修正前・修正後とも）[M] |
| YAML→JSON 変換後の `python -m json.tool` | 成功 [M] |
| 全 example（66 件。`components/examples` の参照を含む）を各 media type の schema で JSON Schema 2020-12 検証（jsonschema、format 検査あり） | 不合格 0 [M] |
| 負例・境界値 18 件のスキーマ判定（ワイルドカード ID、resource_type なし、token なしの at_least_as_fresh、`.` を含む ID、writes 80＋deletes 30、空の書込要求、`hr`/`hrm`、dry-run なしの apply、import の tenant_ids 省略、wave_number なしの wave、鍵なし export、allocate の proposed_code なし、型名 128/129 文字） | 期待どおり 18/18。スキーマで通る負例（件数超過、全域一斉など）は façade の検査で拒否すると契約に書かれている [M] |
| コード生成（`openapi-typescript@7.4.4`） | 成功（1,964 行の型定義）[M] |

検証用スクリプトと生成物はレビュー者の作業領域に置き、リポジトリには加えていない（多数のエージェントが並行作業中のため）[D]。

## 4. 確認して変更しなかった点

- RFC 9457: `Problem` の `type`（URI reference）・`title`・`status`・`detail`・`instance` の写しと、拡張メンバを未知なら無視する MUST（§3.2、RS-16#12）の扱いは原典と一致した。`type`・`title`・`status`・`code` の必須化は RFC より狭い自社 profile の制約であり、RFC の意味は変えていない [D]。
- AuthZEN 1.0 が PDP の状態管理を範囲外とすること（RS-07#61）、および `type`/`id` の値の体系を Subject/Resource と揃える方針は ADR-011 D7-1・ADR-021 D21-26 と一致した [D]。
- 1 書込要求 100 件（OpenFGA `maxTuplesPerWrite` 既定 100、SpiceDB 既定 1,000 の小さい方。RS-07#19・#35）、条件 context 4,096 バイト（RS-07#32、ADR-010 D-31）は research と一致した [D]。
- consistency token の形式・1,024 バイト初期案・検証不能時の格上げ（ADR-010 D-14・D-15、ADR-011 D6-4）、model revision の不変性と pin（ADR-011 D2-7、ADR-016 D16-30）、6 段の展開（D16-31）、shadow の合格条件（D16-32）、指示子の単調増加による rollback（D16-03・D16-34）、剥奪の版からの切離し（D16-35）、freeze 中に止めないもの（D16-36）は ADR と一致した [D]。
- `ConsistencyRequest`・`ImportJobRequest`・`RolloutRequest`・`NamespaceRequestInput` の `anyOf` による条件付き必須は、意図どおりに判定されることを §3 の負例で確かめた [D]。
- 条件名 `c.` 接頭辞は SpiceDB の caveat 名の文字種（`.` を含まない）[^2] に合わないが、authorization-model.md §3.5 が「CAM 上の名前で、生成器がエンジンの識別子に写す」としているため変更しなかった。その旨を `Condition` の description に追記した（#3 と同じ原典）[D]。

## 5. 残る課題（本レビューでは直さなかったもの）

| # | 内容 | 扱い |
|---|---|---|
| 1 | `x-references` の ^13・^14（作成者が取得）と ^15・^16（本レビューで取得）は research ノートに未収載である | research/RS-07 等への収載が要る。収載までは作成者以外による照合済みの扱いにしない |
| 2 | `openapi: 3.1.0` と ADR-022 D-2 の 3.1.2 の差 | 契約本文に「未決（ADR-022）」として既に記載。DL-69 で確認 |
| 3 | `listModels`・`listNamespaces` の 200 応答の schema が inline で、生成コードの型名が匿名になる | 機能上の影響はない。凍結前に名前付き schema（例 `ModelRevisionPage`）へ移すことを推奨 |
| 4 | `listRelationshipChanges`・bulk 系に 429/503 がない | 運用上は返し得る。preview の間に追加するかを契約所有者が判断 |
| 5 | OpenFGA の識別子規則（`/` を含む型名、ID の文字種）が未確認 | authorization-model.md §3.3 X-2・TC-ARC05-10 のとおり未決。確定時に #3・#6 の pattern を見直す |

## 6. 他の文書の所有者への申し送り

| 宛先 | 内容 |
|---|---|
| CON-02（common.schema.json）所有者 | `ResourceType` は接頭辞部分を 3〜64 文字・最大 129 文字としているが、SpiceDB の `object_type` は接頭辞 3〜63 文字・128 バイト以下である[^2]。受信側の形として残すか、CON-04 と揃えるかの判断を依頼する |
| CON-03（authorization-api.openapi.yaml）所有者 | `ConsistencyToken` の description が格上げの根拠に ADR-011 D6-1 を挙げている。D6-1 は標準外項目の運び方の規則であり、格上げは D6-3・D10-1 C-10 にある（本契約の #8 と同じ） |
| 04_architecture/authorization-model.md 所有者 | X-2 案の「各 3〜64 文字」は、名前空間コードを型名の接頭辞に使う場合 SpiceDB の接頭辞の上限 63 文字を超える[^2]。X-2 の確定時に考慮を依頼する |

## 参考文献

[^1]: R. Fielding, M. Nottingham, J. Reschke (Eds.)『HTTP Semantics』RFC 9110 (STD 97), 2022-06. https://www.rfc-editor.org/rfc/rfc9110 （参照箇所: §15.5.10 409 Conflict, §15.5.13 412 Precondition Failed、確認日: 2026-10-15）
[^2]: AuthZed『authzed/api: authzed/api/v1/core.proto』GitHub（main ブランチ）. https://github.com/authzed/api/blob/main/authzed/api/v1/core.proto （参照箇所: ObjectReference.object_type（pattern `^([a-z][a-z0-9_]{1,61}[a-z0-9]/)*[a-z][a-z0-9_]{1,62}[a-z0-9]$`、max_bytes 128）, ObjectReference.object_id（pattern `^(([a-zA-Z0-9/_|\-=+]{1,})|\*)$`、max_bytes 1024）, Relationship.relation, ContextualizedCaveat.caveat_name、確認日: 2026-10-15）
