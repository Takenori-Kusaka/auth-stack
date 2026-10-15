# CON-09 独立レビュー記録（SSF/CAEP stream API profile）

> 文書ID: CON-09-RV / 版: 0.1 / 状態: review / 最終更新: 2026-10-15
> 対応要求: R-112, R-143, R-109, G-118, G-121, G-138
> 依存文書: 11_contracts/ssf-caep.openapi.yaml（CON-09、DL-78）、11_contracts/schemas/ssf-caep-set.schema.json（CON-10、DL-79）、05_adr/ADR-005・ADR-006・ADR-021・ADR-022、04_architecture/revocation-continuous-evaluation.md（ARC-09）、research/RS-04・RS-14・standards-status.md

## 1. レビューの範囲と方法

- 対象は 11_contracts/ssf-caep.openapi.yaml の版 0.1.0 である。レビュー者は作成者ではない。本記録は AI エージェント（Claude）による自己レビューであり、実在の CTO/CISO の決裁ではない（CONVENTIONS §8）[D]。
- 準拠標準は原典を 2026-10-15 に取得して照合した。照合した節は SSF 1.0 Final の §3.3・§3.6・§4.1〜§4.2・§6〜§10[^ssf]、RFC 8935 の §2〜§4[^8935]、RFC 8936 の §2〜§3[^8936]、RISC 1.0 Final の §2.6・§2.11[^risc]、OpenAPI 3.1.0 の Parameter Object[^oas] である [D]。
- SSF・CAEP・RISC の状態（Final、Published 2025-08-29）と CAEP Interoperability Profile の状態（Implementer's Draft 1）は standards-status.md の SS-C09〜SS-C12 と一致している（RS-04#77、#79）[D]。
- ADR との整合は ADR-006 D6-23〜D6-27・L6-1〜L6-8、ADR-005 D1-1・D5、ADR-021 D21-28、ADR-022 D-2、ARC-09 §5 と照らした [D]。

## 2. 機械検証の結果

| 検査 | 結果 |
|---|---|
| `npx --yes @redocly/cli@latest lint 11_contracts/ssf-caep.openapi.yaml`（recommended 規則） | 修正前・修正後とも valid（error 0、warning 0）[M] |
| `python -m json.tool 11_contracts/schemas/ssf-caep-set.schema.json`（DL-79 の JSON 構文） | OK [M] |
| YAML を JSON に変換し、全 example（要求・応答・parameter・schema の examples）を JSON Schema 2020-12 で検証 | 33 件中 33 件適合（修正後）[M] |
| push・poll・受信口の compact JWS example の payload を復号し DL-79 で検証（送信側は outboundProfile も適用） | 適合（修正後）。poll 応答のキーと payload の jti の一致も確認 [M] |
| 負例の schema 判定（NEG-SUB-02、tenant が opaque でない主体、NEG-STS-01、メンバーのない complex、http の endpoint_url） | いずれも schema で不適合と判定された [M] |
| コード生成（`npx openapi-typescript@7.4.4`） | 成功（型定義 1,155 行）[M] |
| モックサーバー（Prism 等）の起動試験 | 未実施 [D] |

検証の作業ファイルはセッションの scratchpad にだけ置き、リポジトリには残していない [D]。

## 3. 指摘と処置（17 件、すべて本ファイルで修正済み）

| # | 重大度 | 箇所 | 指摘 | 根拠 | 処置 |
|---|---|---|---|---|---|
| 1 | High | x-ssf-profile.transmitter.subject_formats_* | v1 で送る RISC identifier-recycled の主体は email か phone でなければならない（MUST）のに、本契約は「complex だけを送り、email・phone_number は送らない」としていた。DL-79 の outboundProfile（identifier-recycled は email・phone_number）とも矛盾していた | RISC §2.6 [N][^risc] | identifier-recycled だけ単純主体で送ると明記した。tenant 主体との照合が SSF の照合規則では成り立たないため、送信先の決め方を profile 追加として書き、受信者に未知の識別子は送らないことにした（SSF §10.1）。verification・stream-updated の opaque 主体も明記した [D] |
| 2 | Medium | critical_subject_members_rationale、x-ssf-receiver-profile.receiver_authentication | 解釈できない critical member を持つ SET を受信者が破棄しなければならない（MUST）ことが書かれていなかった | SSF §3.6 [N][^ssf] | 送信側の説明と受信側の検査項目に追加した |
| 3 | Medium | receivePushedSet と webhooks.setPushDelivery の parameters | header parameter の Accept・Authorization は OpenAPI 3.1 では無視される（SHALL be ignored）ため、コード生成・モックに伝わらない | OpenAPI 3.1.0 Parameter Object [N][^oas] | parameter から外し、Accept は本文に、Authorization は新しい securityScheme `receiverSuppliedAuthorization`（任意の `{}` 併記）に移した。webhook に Accept-Language（MAY）を加えた |
| 4 | Medium | components.responses.Unauthorized、受信口の 401 | 401 に WWW-Authenticate がない。poll 配送の endpoint は HTTP 認証を使う場合に認証方式を WWW-Authenticate で示さなければならない（SHALL） | RFC 8936 §3 [N][^8936] | 必須 header として追加した（管理 API と受信口への適用は [D]） |
| 5 | Medium | pollSets、webhook 400、受信口 400 の説明 | setErrs を送る poll 要求の Content-Language、webhook 400 の Content-Language（MUST）、Accept-Language に合わない場合の英語での説明（MUST）が欠けていた | RFC 8936 §2.6、RFC 8935 §2.3 [N][^8935][^8936] | header と説明を追加した。RFC 8936 §2.6 の must は小文字で規範語でないことも明記した |
| 6 | Medium | x-ssf-transmitter-delivery.push_retry | RFC 8935 §4 が再送しても成功しにくい例に挙げるのは invalid_request だけで、回復し得る例は access_denied だけである。invalid_key・invalid_issuer・invalid_audience と authentication_failed の分類を [N] として書いていた | RFC 8935 §4 [N][^8935] | 原典が述べる部分を [N]、本基盤の拡張を [D] に分けた |
| 7 | Low | updateStreamStatus の説明 | disabled の「保持しない」を MUST NOT としていたが、原典で MUST NOT なのは送信だけで、保持しないことは規範語のない記述である | SSF §8.1.2.1 [N][^ssf] | 強度を原典どおりに直した |
| 8 | Low | addSubject の説明 | 存在しない主体に 200 を返す根拠を §9.1 としていた。200 を許すのは §8.1.3.2 Table 8 であり、§9.1 は 204 と書いていて原典の中で食い違っている | SSF §8.1.3.2、§9.1 [N][^ssf] | 根拠を Table 8 に直し、§9.1 の 204 を 200 と読み替えることを明記した |
| 9 | Low | NEG-SUB-03、NEG-STR-03 | NEG-SUB-03 の入力（iss_sub の単純主体）は本 profile の schema（tenant 必須の complex）では 400 になり、期待結果（200）と矛盾していた。NEG-STR-03 は Transmitter 側の項目を無視することを [N] としていたが、作成要求での扱いを原典は定めていない | SSF §8.1.1、§8.1.1.1 [N][^ssf] | 入力を complex（user＋tenant）に直した。無視は本 profile の選択 [D] とした |
| 10 | Low | requestVerification の 403 | SSF §8.1.4.2 の Table 10 に 403 はない。一方、本契約の説明は「状態コードは変えない」としていた | SSF §8.1.4.2 [N][^ssf] | scope 不足に 403 を返すことを profile 追加として明記した |
| 11 | Low | StreamCreate・Update・Replace の events_requested | minItems: 1 で空配列を 400 にしていたが、原典は空配列にすべきでない（SHOULD NOT）とするだけである | SSF §8.1.1、§8.1.1.3、§8.1.1.4 [N][^ssf] | minItems を外し、空配列は受理して events_delivered を空にすると明記した |
| 12 | Low | ComplexSubject | format だけの complex subject を受理していた。complex subject は 1 つ以上の単純主体メンバーを持つ | SSF §3.3 [N][^ssf] | minProperties: 2 を加えた |
| 13 | Low | TenantScopedSubject | 説明は「tenant は opaque」だが、schema は format を制約していなかった | 本契約の説明との不整合 [D] | tenant に format=opaque と id を必須にした |
| 14 | Low | security（全体・read・poll） | ADR-005 D5 は外部 M2M で mTLS を既定とし、end-to-end mTLS を張れない相手に限り DPoP＋nonce を許すが、security 要件は mTLS だけで、ssfOAuth の説明と食い違っていた | ADR-005 D5 [D] | `dpopProof` scheme を加え、ssfOAuth＋mTLS か ssfOAuth＋DPoP の二択にした |
| 15 | Low | JWS の example 4 件 | payload が `{"example":"true"}` で SET として不適合だったため、モックと契約試験（G-121）の正例に使えなかった | DL-79 [D] | x-example と同じ payload を符号化した値に差し替え、poll 応答のキーと jti を揃えた。署名部はダミーと明記した |
| 16 | Low | SetDeliveryError、PollRequest | 受信者が作る本文に additionalProperties: false を課していたため、第三者の受信者が拡張メンバーを付けると 400 になり、相互運用を損なう | RFC 8935 §2.3、RFC 8936 §2.2 はメンバーを定義するが追加を禁じない [N][^8935][^8936] | true に緩めた（本基盤が作る PollResponse は false のまま） |
| 17 | Info | info、x-references.risc | 版、照合範囲、RISC §2.6 の参照が反映されていなかった | CONVENTIONS §4 [D] | 版を 0.1.1 にし、独立レビューの照合範囲と照合ログの追記が未了であることを記した |

## 4. 修正しなかった点と申し送り

| # | 内容 | 申し送り先 |
|---|---|---|
| U-1 | identifier-recycled の主体を単純主体で送ることは、ADR-006 D6-24 の「主体は SSF の complex subject で表す」の例外になる。ADR の改版時に例外を注記する必要がある（本レビューでは ADR を編集していない）[D] | ADR-006 の改版（L6 系の論点に追加） |
| U-2 | x-example の `user.iss` に SSF Transmitter の issuer を入れている。ADR-021 では受信者に払い出した `sub` の `iss` は OIDC の issuer であり、SSF の issuer と同じとは限らない。issuer の粒度は未決（ADR-006 L6-7、DEC-3 の U-01）[D] | U-01 の決裁後に CON-09・CON-10 の example を揃える |
| U-3 | NEG-POL-02 は setErrs で処理失敗を報告された SET を「確認済みとして扱わない」としている。その結果、その SET は R_ret まで再配送され続ける。RFC 8936 は受信者に確認（ack）を求め（MUST）、setErrs を確認のパラメータとして定めている。再配送を止めるか続けるかの判断が契約上は未定である [D] | DL-80（契約試験）と DL-20（R_ret） |
| U-4 | OpenAPI の版（ADR-022 D-2 は 3.1.2 を凍結版とする。本ファイルは 3.1.0）は作成者が既に未決事項に載せている | 11_contracts/README.md（DL-69） |
| U-5 | SSF §9.1 の 204 と §8.1.3.2 の 200 が原典の中で食い違っている。本 profile は 200 と読み替えた。OIDF の errata の有無は確認していない（未確認）[D] | standards-status.md の監視項目 |
| U-6 | RFC 8935・RFC 8936・SSF §6〜§10 の照合は research ノートの範囲外である。traceability/ の照合ログへの追記は、本レビューでは編集権限の範囲外のため行っていない [D] | traceability/ の照合ログ担当 |
| U-7 | モックサーバーの起動試験は行っていない。コード生成は 1 種類（TypeScript の型）でだけ確認した [D] | DL-80、PoC（TC-ARC09-11） |
| U-8 | example の alg（ES256）は例示である。実際の alg は ADR-015 の暗号 profile が割り当てる（本文の set_header に記載済み）[D] | なし（記載済み） |

## 5. 結論

- 機械検証のエラーは 0 件である（lint、JSON 構文、example 33 件、SET payload の DL-79 適合）[M]。
- 準拠標準の写しに 1 件の High（RISC identifier-recycled の主体種別）と 5 件の Medium があったが、すべて修正した [D]。
- ADR と 04_architecture に反する設計は、ADR-005 D5（DPoP の代替経路）との不足 1 件を除いて見つからなかった。その 1 件も修正した。ADR-006 D6-24 に対する例外 1 件（U-1）は ADR の改版へ申し送る [D]。

## 参考文献

[^ssf]: OpenID Foundation Shared Signals WG『OpenID Shared Signals Framework Specification 1.0』Final, 2025-08-29. https://openid.net/specs/openid-sharedsignals-framework-1_0-final.html （参照箇所: §3.3, §3.6, §4.1.1〜§4.1.9, §4.2.1, §4.2.3, §6.1.1, §6.1.2, §7.1, §7.1.1, §7.2〜§7.2.4, §8, §8.1.1〜§8.1.5, §9.1〜§9.3, §10.1、確認日: 2026-10-15）（RS-04#77、RS-14#62）
[^8935]: IETF (A. Backman, Ed., M. Jones, Ed., M. Scurtescu, M. Ansari, A. Nadalin)『RFC 8935 Push-Based Security Event Token (SET) Delivery Using HTTP』2020-11. https://www.rfc-editor.org/rfc/rfc8935 （参照箇所: §2, §2.1〜§2.4, §3, §4、確認日: 2026-10-15）
[^8936]: IETF (A. Backman, Ed., M. Jones, Ed., M. Scurtescu, M. Ansari, A. Nadalin)『RFC 8936 Poll-Based Security Event Token (SET) Delivery Using HTTP』2020-11. https://www.rfc-editor.org/rfc/rfc8936 （参照箇所: §2, §2.1〜§2.6, §3、確認日: 2026-10-15）
[^risc]: OpenID Foundation Shared Signals WG『OpenID RISC Profile Specification 1.0』Final, 2025-08-29. https://openid.net/specs/openid-risc-1_0-final.html （参照箇所: §2.6 Identifier Recycled, §2.11 Sessions Revoked、確認日: 2026-10-15）（RS-04#78、RS-03#66）
[^oas]: OpenAPI Initiative『OpenAPI Specification v3.1.0』2021-02-15. https://spec.openapis.org/oas/v3.1.0 （参照箇所: §4.8.12 Parameter Object の Fixed Fields（name）、確認日: 2026-10-15）
