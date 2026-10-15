# CON-02 共通スキーマ 独立レビュー記録

> 文書ID: CON-02-RV（レビュー記録）/ 版: 0.1 / 状態: review / 最終更新: 2026-10-15
> 対応要求: R-109, R-161（DL-71）
> 依存文書: 11_contracts/schemas/common.schema.json, CONVENTIONS.md, traceability/deliverables.md（DL-71）, 05_adr/ADR-005, ADR-009, ADR-011, ADR-014, ADR-021, ADR-022, 02_requirements/operation-risk-tiers-assurance.md, 04_architecture/claims-catalog.md, 11_contracts/schemas/audit-event.schema.json（CON-08）

## 1. レビューの範囲と方法

- 対象: `11_contracts/schemas/common.schema.json`（43 個の `$defs`）。レビュー者は作成者とは別のエージェント（Claude）である。人による照合はまだ行っていない。
- 観点: (1) 準拠標準の項目名・必須性・意味の写し、(2) ADR・04_architecture との整合、(3) 機械検証、(4) 正例と負例の妥当性、(5) モック生成・コード生成への適性。
- 原典の再確認（2026-10-15 取得）: RFC 9457 §3.1〜§3.2[^1]、OpenID AuthZEN Authorization API 1.0 §5.1〜§5.5・§10.1.3[^2]（RS-07#63, #66）、W3C Trace Context Level 1 §3.2.2[^3]（RS-10#16）。版と状態は standards-status の SS-A47・SS-C13・SS-D02 と一致する。

## 2. 指摘と処置（修正 11 件）

| # | 区分 | 指摘 | 処置 |
|---|---|---|---|
| 1 | 標準の写し | `RequestId`: AuthZEN §10.1.3 では、要求 ID を付けるのは MAY、付ける場合に X-Request-ID ヘッダを使うのが RECOMMENDED である。元の記述はこれを「PEP が採番しヘッダで送るのが RECOMMENDED」とまとめていた。また原典は値を「任意の文字列」と定めているが、本書は印字可能 ASCII 128 文字以下に制約しており、この差を明記していなかった | 強度を原典どおりに書き分けた。自社 profile の制約が AuthZEN より狭いことを明記した。profile 外の値を受けたときの扱い（拒否するか、改変せずに echo するか）を「未決（DL-72 凍結前）」とした。切り詰めて echo する方式は、同じ値を返す MUST に反するため採らないと書いた |
| 2 | 標準の写し | `Problem`: 本スキーマは生成側の検査用である。しかし受信側は、型の合わないメンバ（§3.1）と未知の拡張メンバ（§3.2）を無視しなければならず（MUST）、この向きが書かれていなかった。このため受信側がスキーマ違反を理由に Problem 全体を拒否する実装を誘いかねなかった | 「生成側の適合検査用で、受信側は Problem 全体を拒否しない」と明記した。§3.1.1 の「type は絶対 URI を推奨（RECOMMENDED）」も追記した |
| 3 | 引用誤り | `Problem`: 「txn・decision_id を外部応答に出さない」の根拠に挙げていた ADR-022 D-9-5 は、VC 2.0 の property 対応表であり、この主張とは関係しない | 根拠を「本書の提案。ADR-021 D21-08 と ADR-011 D6-1 の考え方から導いた [D]」に改めた |
| 4 | 引用誤り | `TransactionId`: 「RFC 8417 §2.2 の IANA 登録」に RS-06#31 を付けていた。RS-06#31 は Transaction Tokens 草案で txn が必須であることの項目で、RFC 8417 の根拠ではない | RFC 8417 §2.2 の定義と IANA JWT Claims 登録（ADR-021 D21-35, D21-36）と、草案で必須であること（RS-06#31）を別々の文に分けた |
| 5 | REQ-03 整合 | `OperationTier`: break-glass/B を「基盤上の型付き例外」、/P を「本基盤の PDP に依存しない別経路」と書いていた。REQ-03 §2.1 の定義（/B はテナント内の業務上の緊急アクセス、/P は基盤の緊急経路）と読みが違う。また break-glass の判定規則は J1 なのに、J2 だけを挙げていた | REQ-03 §2.1 の定義に合わせ、ADR-029 D29-80（/B を core/exception で表す）を添えた。判定規則の出典を J1・J2 に直した |
| 6 | ADR 整合 | `CorrelationSet`: 「Txn-Token は write 以上に限る」という要約が、ADR-005 D9-3 の範囲（write・privileged・break-glass/B・FAPI）と合っていなかった。また txn がない要求の相関欄から (iss)・sid が抜け、ADR-021 D21-35 と一致していなかった | D9-3 の範囲を正確に写した。相関欄を D21-35 どおり (iss, jti_ref)・sid・decision_id・request_id にした |
| 7 | 契約間整合 | `CorrelationSet.gref`: 欄名の正本は DL-77 と自ら書いているのに、CON-08 の監査欄名 `grant_ref` と違う名前（token claim 名の案 `gref`）を使っていた | 欄名を `grant_ref` に改めた（description で token claim 名とは別だと明記）。負例を 1 件追加した |
| 8 | 契約間整合 | `CorrelationSet.jti_ref`: 形式の制約がなく、正例も HMAC-SHA-256 の長さ（base64url で 43 文字）に合っていなかった。CON-08 の KeyedRef（`k<鍵版>.<43 文字>`）とも食い違っていた | CON-08 の KeyedRef と同じ pattern を付け、正例を 43 文字の値に差し替えた。旧正例を負例に移した。DL-77 の凍結時に KeyedRef を本書へ移すと注記した |
| 9 | コード生成 | `TraceId`・`Traceparent` の pattern が先読み（`(?!…)`）を使っていた。RE2 系の正規表現エンジン（Go の regexp、Rust の regex など）は先読みに対応しないため、生成した検証コードが動かない | 全ゼロの拒否を `not`（const／pattern）に移し、pattern 本体から先読みを除いた。判定結果は変わらない。trace-id が全ゼロの traceparent を負例に追加した |
| 10 | コード生成 | `VersionInfo` の `if`/`then` について、Redocly lint が警告を出した（then.required の項目が未定義）。then に properties を足した版でも、Redocly は正例を誤って不合格にした | 同じ意味の `anyOf`［status≠preview］／［preview_expires 必須］に書き換えた。jsonschema と Redocly の両方で警告 0 になった |
| 11 | メタ情報 | 冒頭の `$comment` に「作成者以外による照合は未実施」とあった | 独立レビューを実施したこと、原典を再取得して照合したこと、本記録の所在を追記した。人による照合が未実施であることは残した |

## 3. 確認して変更しなかった点

- AuthZEN の Subject・Resource（type・id は REQUIRED、properties は OPTIONAL）、Action（name は REQUIRED）、Decision（decision は REQUIRED の boolean、context は OPTIONAL）の写しは原典と一致した[^2]。本書が追加した制約は値の制約だけで、項目名と意味は変えていない。
- RFC 9457 の各メンバ（type の既定値 about:blank、status の同値 MUST、title の SHOULD NOT、detail の解析 SHOULD NOT、instance）の写しは原典と一致した[^1]。
- Trace Context の HEXDIGLC、version ff の禁止、trace-id と parent-id の全ゼロ無効の写しは原典と一致した[^3]。
- ADR-011 D6-1 の profile 項目（profile_version、consistency.mode／token、model.pin、decision_id、model_revision、consistency、reason の閉じた列挙）と D6-4（初期案 1,024）の写しは一致した。
- ADR-021 の D21-03・D21-06・D21-09・D21-12・D21-14・D21-14b・D21-23・D21-26・D21-28 と、各定義の長さ上限（261・129・194）の算出は一致した。
- 未決事項は「未決（ADR-xxx）」の形で明記されている（K21-1、K21-6、D21-09 の符号化、D21-23、U-02、U-03、U-04、ADR-011 D6-4、ADR-017、ADR-016 P16-2、KC-1）。

## 4. 本書の範囲外の申し送り（他の文書の所有者へ）

| # | 宛先 | 内容 |
|---|---|---|
| H-1 | CON-08（audit-event.schema.json） | CON-08 は独自の `OpaqueId` を持ち、pattern を `^[a-z0-9][a-z0-9-]{15,63}$` としている。これは CON-02 の受信側契約（ADR-021 D21-09: 64 文字以下の ASCII を不透明に扱い、大文字と小文字を区別する）より狭い。候補 2（UUIDv4）は受理できるが、符号化方式を変えたときや上流由来の値が来たときに、監査記録が欠けるおそれがある。CON-02 の `OpaqueId` を `$ref` で参照する形に寄せることを推奨する。`KeyedRef` は CON-02 へ移すことを推奨する |
| H-2 | ADR-021 所有者 | D21-09 は「小文字の英数字だけ」と書いているが、候補 2（UUIDv4）はハイフンを含む。作成者がすでに指摘しており、レビュー者も同じ意見である（TC-021-08 の後に文言を改める） |
| H-3 | CON-03（DL-72） | RequestId が profile 外の値だった場合の扱い（指摘 1）と、PepPdpProfile を置く context キー名（未決）を凍結前に決める |
| H-4 | 前提台帳 | 新しい A-ID は不要（本レビューで新しい仮定は置いていない） |

## 5. 機械検証の結果（修正後）

| 検証 | 結果 |
|---|---|
| `python -m json.tool` | エラー 0 |
| jsonschema 4.26.0 `Draft202012Validator.check_schema` | エラー 0 |
| 正例 67 件を各 `$defs` で検証（format checker 有効） | 不合格 0。不透明 ID 系の 8 型の正例は、すべて IssuedOpaqueId にも適合した |
| 負例 64 件 | 拒否される負例は全件拒否された。理由欄に「スキーマ上は受理」「CI で拒否」などと書いた負例は全件受理された。理由欄と実際の判定の不一致は 0 件 |
| `npx --yes @redocly/cli@latest lint`（全 `$defs` を `components.schemas` から `$ref` する OpenAPI 3.1 の検証用ラッパーで実施） | エラー 0。本ファイル由来の警告 0（残る 2 件はラッパー自体の警告: server URL と 4XX 応答） |
| 先読みを使う正規表現 | 0 件（RE2 互換） |

## 参考文献

[^1]: M. Nottingham, E. Wilde, S. Dalal『Problem Details for HTTP APIs』RFC 9457, 2023-07. https://www.rfc-editor.org/rfc/rfc9457 （参照箇所: §3.1〜§3.2、確認日: 2026-10-15）（RS-16#12）
[^2]: OpenID Foundation『Authorization API 1.0』Final, 2026-01-11. https://openid.net/specs/authorization-api-1_0.html （参照箇所: §5.1〜§5.5、§10.1.3、確認日: 2026-10-15）（RS-07#63, #66）
[^3]: W3C『Trace Context Level 1』W3C Recommendation, 2021-11-23. https://www.w3.org/TR/trace-context/ （参照箇所: §3.2.2、確認日: 2026-10-15）（RS-10#16）
