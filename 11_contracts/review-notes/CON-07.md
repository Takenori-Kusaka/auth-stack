# CON-07 SCIM API profile 独立レビュー記録

> 文書ID: CON-07（レビュー記録）/ 版: 0.1 / 状態: review / 最終更新: 2026-10-15
> 対応要求: R-040, R-132（主）、R-039, R-044, R-047, R-172, G-118, G-119, G-137（関連）（DL-76）
> 依存文書: 11_contracts/scim.openapi.yaml, CONVENTIONS.md, traceability/deliverables.md（DL-76 行）, 05_adr/ADR-004, ADR-005, ADR-016, ADR-021, ADR-022, ADR-023, 02_requirements/identity-lifecycle.md（DL-08 §15）, 04_architecture/reference-architecture-v2.md（ARC-01）, 04_architecture/revocation-continuous-evaluation.md（ARC-09）, research/RS-03, RS-14, standards-status.md

## 1. レビューの範囲と方法

- 対象は `11_contracts/scim.openapi.yaml`（CON-07、版 0.1.0）である。レビュー者は作成者とは別のエージェント（Claude）であり、人による照合はまだ行っていない。本記録は自己レビューの一種であって、決裁ではない。
- 観点は次の 5 つである。(1) 準拠標準の項目名・必須性・意味を正しく写しているか、(2) ADR と 04_architecture に整合しているか、(3) 機械検証、(4) example と負例の妥当性、(5) モック生成とコード生成に使えるか。
- 原典は 2026-10-15 に RFC Editor から取得し、本文と照合した。対象は RFC 7644 §3.3, §3.4.2.1, §3.4.2.2, §3.4.2.4（Table 6）, §3.4.3, §3.5.1, §3.5.2, §3.6, §3.12（Table 8, Table 9）, §3.13, §3.14, §4, §7.2, §7.5.2[^1]、RFC 7643 §2.3, §3.1, §3.3, §4.2, §5, §7, §8.5, §8.7.1[^2]、RFC 6585 §4[^3]、RFC 6963 §3.6[^4] である。RS-14#10, #31〜#38 と RS-03#75〜#78 の検証済み項目にも照らした。RFC 7644 §3.7.4 と RFC 7643 §2.2 は再照合していない。
- DL-76 行の要点は 5 つあり、いずれも定義されていることを確かめた。User・Group と拡張属性、テナントスコープ（§2）、JIT との衝突解決（§3、C1〜C10）、deprovision（§4）である。

## 2. 指摘と処置（修正 13 件）

| # | 区分 | 指摘 | 処置 |
|---|---|---|---|
| 1 | 標準の写し（重） | POST で readOnly 属性を拒否していた。`id` には 400 invalidValue、`upstreamIdpIdentifier` には 400 mutability を返す負例になっていた。RFC 7644 §3.3 は、POST 本文の readOnly 属性を無視しなければならない（SHALL be ignored）とする [N][^1]。RFC 7643 §3.1 にある「client は id を指定してはならない（MUST NOT）」は client 側の義務で、server が拒否してよい根拠にはならない [N][^2] | 2 件の負例を「201、値は無視し、無視した属性名を `scim.received` に記録」に直した。説明に §3.1「属性の mutability の扱い」を新設した。createUser の説明と User スキーマの説明にも同じ規則を書いた |
| 2 | 標準の写し | PUT で readOnly 属性をどう扱うか書いていなかった。RFC 7644 §3.5.1 は readOnly 属性の値を無視する（SHALL）と定め、§3.1 は client が readOnly 属性を除かずに PUT してよいとする [N][^1]。GET で得た表現を PUT する IdP を拒否するおそれがあった | replaceUser と replaceGroup に無視の規則を書いた。replaceUser に正例の負例欄を加えた（readOnly 属性を含む PUT は 200） |
| 3 | 標準の写し・ADR 整合 | `federatedSubject`（immutable）の PATCH を定めていなかった。RFC 7644 §3.5.2 は、値のない immutable 属性への `add` を許す（MAY）[N][^1]。結合待ちから結合済への遷移、`scim.bound`、C4' の 409 が PUT・PATCH の x- 欄に出ていなかった | patchUser に add の条件と、replace・remove の 400 mutability を書いた。負例を 1 件追加した。PUT と PATCH の `x-audit-events` に `scim.bound`・`scim.conflict` を、`x-state-transitions` に Y-02・Y-04 を、`x-conflict-rules` に C4' を加えた。PUT の immutable 不一致は RFC では SHOULD であり、本基盤はこれを必須にすることを [D] として明記した |
| 4 | 標準の写し | discovery の endpoint にも認証を求めていたが、それが逸脱であることを書いていなかった。RFC 7643 §5 は `authenticationSchemes` を事前認証なしで取得できるようにすべき（SHOULD）とする [N][^2] | 現状（認証必須）は変えていない。§7 と getServiceProviderConfig に、SHOULD からの逸脱であることを明記した。公開にするかは §11 の未決事項に加え、DL-26 の受容票候補として申し送った。攻撃面が変わる判断なので、レビュー者は決めていない |
| 5 | ADR・ARC 整合 | ADR-023 L23-3 と ARC-01 C20 は「作成系が止まっても無効化・削除は Tier 0 の入力で受ける」ことを DL-76 に申し送っている。本契約には反映がなかった | §8 と §11 に未決（ADR-023 L23-3、CTO＋CISO、G4）として記した。決裁後に作成系停止時の応答（503 等）を追加すると書いた。`x-traceability.handoffs` と `x-depends-on` にも ADR-023・ARC-01・ARC-09 を加えた |
| 6 | 標準の写し | `ScimSchemaDefinition` の `type` の列挙に binary がなかった。RFC 7643 §7 の列挙は binary を含まない。一方で §2.3.6 は binary 型を定め、§8.7.1 の User スキーマ表現も "binary" を使う [N][^2] | 受信側の互換のために binary を加え、原典の不整合を description に記した |
| 7 | 標準の写し | replaceUser、createGroup、replaceGroup、patchGroup に `attributes`・`excludedAttributes` がなかった。RFC 7644 §3.5.2 は、`attributes` を指定された PATCH には 200 を返さなければならない（MUST）とする [N][^1] | 4 操作に 2 つのパラメータを加えた。patchGroup に 200 と 204 の条件を書いた |
| 8 | モック生成 | 400 の共有応答 `BadRequest` は、先頭の example が invalidFilter だった。Prism 5.12.0 で `POST /Users`（password を含む）を投げると、`invalidFilter` の本文が返った [M]（下の §4） | 照会用の `QueryBadRequest`（invalidFilter・tooMany）と、書き込み用の `BadRequest`（先頭は invalidValue）に分けた。example `ErrorInvalidValue` を追加し、C10 の body 参照と非対応属性の負例に使えるようにした |
| 9 | モック生成・コード生成 | 非対応属性（password・roles など 6 個）を `properties` の中に `not: {}` で置いていた。このため Prism の動的応答に `"password":null` などの欄が出た [M]。型生成でも、存在しない欄（never）が並んでいた | `propertyNames.not.enum` による属性名の禁止に置き換え、`x-rejected-attributes` を加えた。jsonschema で 6 属性がすべて不合格になり、基本形が合格することを確かめた [M] |
| 10 | example | `UserCreatedBound`（作成応答）が、要求 `UserCreateBound` に含まれる enterprise 拡張・name・emails を落としていた。いずれも returned=default の属性であり、応答は service provider が解釈した資源の状態を表す（RFC 7644 §3.1 の SHALL）[N][^1] | schemas に enterprise 拡張を加え、name・emails・enterprise 属性を応答 example に入れた |
| 11 | 内部整合 | §6 本文で拒否する演算子の列挙に ne・lt・le がなく、`x-filter-profile.rejected` と食い違っていた | 本文の列挙を x-filter-profile にそろえた |
| 12 | メタ情報 | description の「対応要求」が `x-requirements.related` と食い違っていた（R-109・G-120・G-134 が欠けていた） | 対応要求をそろえた |
| 13 | 照合記録 | 「作成者以外の照合は未了」とする記述が 4 か所あった。§6 の MUST の写しは「未対応の演算子」になっていたが、原典の文言は「認識しない（not recognized）filter 演算」である [N][^1] | 再照合の範囲を脚注 [^1][^2][^8][^9]、§6、冒頭の注記、`x-traceability` に書き分けた。§3.7.4 と RFC 7643 §2.2 は未再照合として残した。§6 の文言は原典どおりに直した |

## 3. 確認して変更しなかった点

| ID | 内容 | 扱い |
|---|---|---|
| R-01 | ServiceProviderConfig の必須項目（patch, bulk（supported, maxOperations, maxPayloadSize）, filter（supported, maxResults）, changePassword, sort, etag, authenticationSchemes（type, name, description））と `oauthbearertoken` の値は、RFC 7643 §5 に一致する [N][^2] | 適合 |
| R-02 | ResourceType（name, endpoint, schema と、schemaExtensions の schema・required が必須）は RFC 7643 §6 に、Schema 表現の mutability・returned・uniqueness の列挙は §7 に一致する [N][^2] | 適合 |
| R-03 | Error 形式（`status` は文字列で必須）と、scimType の 10 値は RFC 7644 §3.12 の Table 9 に一致する [N][^1]。§3.12 には、PUT の `id` に 400 mutability を返す非規範の例がある。これは §3.5.1 の規範文（readOnly は SHALL be ignored）と食い違うため、本契約は規範文に従う [D] | 適合（修正 1・2 は規範文に従った） |
| R-04 | 版の不一致について。RFC 7644 Table 8 は 409 と 412 の両方を定める [N][^1]。本契約は 412 に統一しており、ADR-004 D04-42 の「412 または 409」の範囲内である | 変更なし |
| R-05 | 削除後の扱い（全操作に 404 を返す MUST、照会結果から除く MUST、成功時 204 の SHALL、衝突の判定に含めない SHOULD NOT）は RFC 7644 §3.6 に一致する [N][^1]。C5 を必須にしたのは ADR-004 D04-42 による [D] | 適合 |
| R-06 | paging の写し（startIndex が 1 未満なら 1、count が負なら 0 とする SHALL、count を超えて返さない MUST NOT）は Table 6 に一致する [N][^1] | 適合 |
| R-07 | tooMany の SHALL（§3.4.2.1）と invalidFilter の MUST（§3.4.2.2）は原典どおりである [N][^1]。ただし深い paging（10,000 件目を超える要求）に tooMany を使うのは、Table 9 の意味（filter の結果が多すぎる）を広げた本契約の判断である [D] | 変更なし。DL-20 で上限値を決めるときに再確認する |
| R-08 | §7.5.2 の写し（client は POST を使うべき、server は 403 で拒否すべき、いずれも SHOULD）は原典どおりである。GET の userName eq を受け付ける逸脱は DL-26 に申し送り済みである [N][^1] | 変更なし |
| R-09 | base URL の `/v1/scim/v2` は、SCIM の版識別子を資源 endpoint の直前に置く MUST（RFC 7644 §3.13）[N][^1] と ADR-016 D16-01 の両方を満たす | 適合 |
| R-10 | ADR-004 D04-38〜D04-47 と D04-49・D04-51、DL-08 §15.2 の C1〜C10、Y-01〜Y-09 の写しを照合し、矛盾はなかった。下流配信をライフサイクルイベントで行うこと（ADR-022 D-2、G-137）と、外部 M2M の mTLS 既定・DPoP＋nonce 例外（ADR-005）も一致する | 変更なし |
| R-11 | `ResourceId` の pattern は小文字英数字とハイフンに限っている。ADR-021 D21-14（122 bit 以上の乱数、テナント ID・個人情報を含めない）とは矛盾しない。ただし CON-02 の払い出し形式（`IssuedOpaqueId`）と合わせるかは、DL-69 の契約間統一で扱う | 申し送り（DL-69） |
| R-12 | SCIM の `"$ref"` 属性は `patternProperties` で表している。openapi-typescript 7.4.4 の型生成ではこの欄に型が付かない [M] | 変更なし。OpenAPI の参照記法と衝突するのを避ける妥当な表し方であり、生成コード側で補う |
| R-13 | `x-negative-examples` は機械可読だが、Prism のモックはこれを実行しない（filter の意味を検査しないため、`userName pr` にも 200 を返す）[M] | 変更なし。負例は契約試験（DL-80、TC-004-12〜17）で実行する |

## 4. 機械検証の結果（2026-10-15、修正後）

| 検証 | 結果 |
|---|---|
| YAML→JSON 変換と `python -m json.tool` | エラー 0 [M] |
| `npx --yes @redocly/cli@latest lint`（recommended 設定） | エラー 0、警告 3 [M]。警告の内訳は operation-2xx-response 2 件（/Bulk と /Me。501 だけを意図して返す）と no-unused-components 1 件（staticBearerException。例外専用）。どちらも `x-lint-notes` に理由が記載済み。修正の途中で一時 9 件に増えたが、修正 9 の表し方を変えて 3 件に戻した |
| 全 example とそれぞれのスキーマの照合（jsonschema 4.26.0、Draft 2020-12、format 検査あり） | 不合格 0 [M] |
| 非対応属性 6 個の拒否と基本形の合格 | 期待どおり [M] |
| 型生成（openapi-typescript 7.4.4） | 成功 [M] |
| モック（@stoplight/prism-cli 5.12.0） | GET /ServiceProviderConfig は 200。readOnly 属性を含む POST・PUT は 201・200。roles を含む POST は 400 invalidValue。PUT の動的応答に null の欄は出なかった [M]。Prism は servers の base path（`/v1/scim/v2`）を付けずに path を提供する |

検証用のスクリプトと生成物はレビュー者の scratchpad に置いた一時ファイルであり、リポジトリには加えていない。

## 5. 残る未決と申し送り（本レビューで追加・確認したもの）

- discovery の endpoint を認証なしで公開するか（修正 4）。DL-26 の受容票候補。
- control plane の停止中に無効化・削除を受け付けるか（修正 5）。未決（ADR-023 L23-3）。
- RFC 7644 §3.7.4 と RFC 7643 §2.2 の再照合。
- 本契約の openapi 欄の値（3.1.0）。DL-69 で統一する（作成者の申し送りのまま）。

## 参考文献

[^1]: P. Hunt ほか『RFC 7644 System for Cross-domain Identity Management: Protocol』Proposed Standard, 2015-09（RFC 9865・9967 により更新）. https://www.rfc-editor.org/rfc/rfc7644 （参照箇所: §3.1, §3.3, §3.4.2.1, §3.4.2.2, §3.4.2.4 Table 6, §3.4.3, §3.5.1, §3.5.2, §3.6, §3.12 Table 8・Table 9, §3.13, §3.14, §4, §7.2, §7.5.2、確認日: 2026-10-15。RS-14#10, #31〜#33、RS-03#75, #76 と重なる箇所はそれと一致）
[^2]: P. Hunt ほか『RFC 7643 System for Cross-domain Identity Management: Core Schema』Proposed Standard, 2015-09（RFC 9865・9967 により更新）. https://www.rfc-editor.org/rfc/rfc7643 （参照箇所: §2.3.6, §3.1, §3.3, §4.2, §5, §6, §7, §8.5, §8.7.1、確認日: 2026-10-15。RS-14#33, #34、RS-03#75 と重なる箇所はそれと一致）
[^3]: M. Nottingham, R. Fielding『RFC 6585 Additional HTTP Status Codes』Proposed Standard, 2012-04. https://www.rfc-editor.org/rfc/rfc6585 （参照箇所: §4、確認日: 2026-10-15）
[^4]: P. Saint-Andre『RFC 6963 A Uniform Resource Name (URN) Namespace for Examples』BCP 183, 2013-05. https://www.rfc-editor.org/rfc/rfc6963 （参照箇所: §3.6、確認日: 2026-10-15）
