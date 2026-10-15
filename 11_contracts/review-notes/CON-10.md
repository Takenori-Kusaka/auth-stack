# CON-10 独立レビュー記録（SSF/CAEP SET スキーマ）

> 文書ID: CON-10-RV / 版: 0.1 / 状態: review / 最終更新: 2026-10-15
> 対応要求: R-112, R-143, R-191 ／ G-111, G-118, G-121, G-138
> 依存文書: 11_contracts/schemas/ssf-caep-set.schema.json（CON-10 / DL-79）、11_contracts/ssf-caep.openapi.yaml（CON-09 / DL-78）、05_adr/ADR-006-revocation-continuous-evaluation.md、05_adr/ADR-021-irreversible-identifiers.md、05_adr/ADR-022-integration-contract-standards.md、04_architecture/revocation-continuous-evaluation.md（§5）

レビュー者は CON-10 の作成者ではない。本記録は AI エージェント（Claude）による独立レビューであり、実在の CTO/CISO・第三者の評価ではない [D]。

## 1. 観点と方法

| 観点 | 方法 |
|---|---|
| 標準の項目名・必須性・意味 | RFC 8417[^1]、SSF 1.0[^2]、CAEP 1.0[^3]、RISC 1.0[^4]、RFC 9493[^5] の原典を 2026-10-15 に取得し、スキーマの各 field・節番号・MUST/SHOULD の強度と照合した。research で検証済みの主張は RS-04#77〜#79、RS-03#66・#72、RS-14#61・#62 と突き合わせた |
| ADR・04_architecture との整合 | ADR-006 D6-23〜D6-26・L6-1・L6-7・L6-8・K6-3、ADR-021（issuer・sub_id）、ADR-022 D-2（v1 GA 7 種）、ARC §5、CON-09 の transmitter／receiver profile と照合した |
| 機械検証 | `python -m json.tool`、jsonschema 4.26.0（Draft 2020-12 の check_schema と FormatChecker）で examples と x-negative-examples を検証し、負例ごとに失敗した keyword を確認した |
| モック・コード生成 | examples をモックの応答に使えるか確認し、json-schema-to-typescript 15.0.4 で型を生成した |

## 2. 指摘と修正（9 件、すべてスキーマへ反映済み）

| # | 区分 | 指摘 | 根拠 | 修正 |
|---|---|---|---|---|
| 1 | 標準の写し | `critical_subject_members` を SSF §3.6 の定義としていたが、§3.6 は破棄の規則（MUST）で、メンバー名の一覧は送信者 metadata の §7.1 で定義される | SSF 1.0 §3.6、§7.1 [N][^2] | `x-unknown-members` を「§3.6 の規則、一覧は §7.1」に改めた |
| 2 | 標準の写し | SSF §3.5 の jwt_id・saml_assertion_id・ip-addresses に `additionalProperties: false` がなく、「既知の識別子形式にだけ additionalProperties: false を置く」という自らの方針、および RFC 9493 §3 の MUST NOT（形式に記述のないメンバーを含めない）と食い違っていた | RFC 9493 §3 [N][^5]、SSF 1.0 §3.5.1〜§3.5.3 [N][^2] | 3 形式に `additionalProperties: false` を追加した。負例 NEG-14 を追加した |
| 3 | 標準の写し | recovery-activated の節番号を「未照合」としていた | RISC 1.0 §2.9 Recovery Activated（属性なし）[N][^4] | §2.9 と明記し、x-references [4] の参照箇所に §2.2・§2.4・§2.9 を追加した |
| 4 | 主張タグ | `toe` の説明で「CAEP・RISC のイベントでは各イベント内の event_timestamp を使う [N]」としていたが、toe と event_timestamp の関係を定める規範は SSF・CAEP の本文に見当たらない。SSF で event_timestamp は例示の payload にだけ現れる | CAEP 1.0 §2（event_timestamp は OPTIONAL）[N][^3]、RISC 1.0 §2.7 [N][^4] | 「CAEP §2・RISC §2.7 は event_timestamp を OPTIONAL として定める [N]。両者の関係の規定は未確認」に改めた。優先順位は [D] のまま |
| 5 | CON-09 との整合 | 送信の `aud` が文字列と配列の両方を許し、example[1] が配列だった。CON-09 の transmitter profile は「受信者の client_id の単一文字列」とする | CON-09 `transmitter` の規則 [D]、SSF 1.0 §4.1.8 [N][^2] | outboundProfile で `aud` を文字列に限定し、example[1] の aud を単一文字列にした。ルートの受信基準は §4.1.8 どおり両方を許す。負例 NEG-13 を追加した |
| 6 | 標準の写し | joseHeader の注記が「RFC 8417 §2.3 自体は SHOULD」としていた。§2.3 は typ の使用を MAY（混同し得る文脈では MUST）、値を secevent+jwt にすべき（SHOULD）、application/ 接頭辞の省略を RECOMMENDED とする | RFC 8417 §2.3 [N][^1]、SSF 1.0 §4.1.1 [N][^2] | 強度を原典どおりに書き分け、受信でも `application/secevent+jwt` を受理しない設計判断（CON-09 の受信規則と同じ）を [D] で明記した |
| 7 | ADR・CON-09 との整合 | 送信 `iss` の pattern（https・path なし）は ADR-021 の issuer 規則に従うが、ADR-021 自身が ADR-007 のテナント別 issuer と対立し KD7-1 と同時決裁であること、CON-09 が `/.well-known/ssf-configuration/{issuer_path}` でテナント別 issuer も表せることが注記されていなかった | ADR-021 §要旨（issuer）、CON-09 の未決表 [D] | outboundProfile の `$comment` と x-open-items に、U-01 で path 型 issuer を採る場合は pattern を改めることを追記した（未決（ADR-006 L6-7、DEC-3 の U-01）） |
| 8 | 受信義務 | RISC identifier-recycled は subject を email または phone に限る（MUST）が、ルートはこれを強制せず、他形式の SET を受けた場合の処理が書かれていなかった | RISC 1.0 §2.6 [N][^4] | x-profile.inbound に「email・phone_number 以外は検証と記録だけで凍結しない」を [D] で追記した。RISC の `phone` は RFC 9493 の登録名 `phone_number` と一致しないので、ルートでは拒否しない |
| 9 | 記録 | `$comment` からレビュー記録への参照がなかった | CONVENTIONS §4（作成者以外の検証） | `$comment` に本記録への参照を追加した |

## 3. 照合して誤りがなかった項目

- RFC 8417 §2.2: iss・iat・jti は REQUIRED、aud は RECOMMENDED、sub・toe・txn は OPTIONAL、events は 1 つ以上のメンバーを持つ JSON object で値は空 object でもよい [N][^1]。スキーマの記載と一致する。
- SSF 1.0: top-level の sub_id（§3.1・§3.1.1 の MUST）、新しいイベント種別で subject を使わない（§3.1.2 の MUST NOT）、sub と exp の禁止（§4.1.2・§4.1.3・§4.1.7）、iss の一致（§4.1.6）、aud の型（§4.1.8）、txn（§4.1.9 の SHOULD と、同じ原因の SET 間の再利用）、1 SET 1 イベント（§4.2.1 の SHOULD）、未知の field の無視（§4.2.3 の MUST）、verification（§8.1.4.1、sub_id は opaque で stream ID）、stream-updated（§8.1.5、status は REQUIRED）、stream status の 3 値（§8.1.2.1）[N][^2]。
- CAEP 1.0 §2 の 4 claim と initiating_entity の 4 値、§3.1〜§3.8 のイベント URI・field 名・必須性・列挙値（credential_type 10 値、change_type 4 値、namespace 6 値、change_direction、compliant／not-compliant、risk-level の LOW／MEDIUM／HIGH、principal）[N][^3]。
- RISC 1.0 §2.3 の reason（hijacking・bulk-account）、§2.7 の credential_type（REQUIRED、CAEP Credential Change の値）と reason_admin・reason_user（型の定めなし）、§2.11 の非推奨と CAEP session-revoked の使用（MUST）[N][^4]。
- RFC 9493 §3.2.1〜§3.2.8 の 8 形式のメンバー名、§3.2.8 の aliases の入れ子禁止（MUST NOT）、§3.2.5 の E.164 [N][^5]。
- v1 GA 7 種（ADR-022 D-2）、受信処理と区分 RC（ADR-006 D6-23、ARC §5.2）、送信範囲（D6-24）、外部連携アプリの受信義務（D6-26、未決（ADR-006 K6-3））、L6-1・L6-8 の preview は、スキーマの x-profile・x-receive-obligations と一致する [D]。CON-09 の events_supported_v1・events_always_possible・events_not_sent とも一致する [D]。

## 4. 機械検証の結果（修正後）

| 検査 | 結果 |
|---|---|
| `python -m json.tool` | エラー 0 |
| Draft 2020-12 の check_schema | エラー 0 |
| examples[0]〜[3]（ルートと outboundProfile） | 全件 valid |
| examples[4]（ルート） | valid |
| joseHeader の example | valid |
| x-negative-examples NEG-01〜NEG-14 | 全件 invalid（期待どおり）。各負例は意図した 1 つの規則だけで失敗する（NEG-08 は主体表現の規則、NEG-11 は aud・txn の 2 件の required）。NEG-07・NEG-13 はルートでは valid（互換受信と受信基準の許容を確認） |
| json-schema-to-typescript 15.0.4 | 生成成功（267 行） |

## 5. 残る指摘（修正せず申し送り）

| # | 内容 | 扱い |
|---|---|---|
| R1 | コード生成では `subjectIdentifierSimple` の if/then による形式別の必須メンバーが型に現れず、`format: string` と任意メンバーの型になる。outboundProfile の allOf と if/then も型には反映されない | 生成した型は形の目安に使い、検証は本スキーマの validator で行う [D]。形式別の discriminated union の型が必要なら、生成専用の派生スキーマを DL-80 の SDK 側で持つ案 |
| R2 | 受信の `typ` を `secevent+jwt` に限る判断は、RFC 7515 の typ の扱い（接頭辞を省いた表記と完全表記の同一視）より厳しい。顧客 IdP が `application/secevent+jwt` を送ると処理しない | CON-09 と同じ判断なので本レビューでは変えない。受信互換性の試験（DL-80）で実在の送信者の値を確認する [D] |
| R3 | RFC 8417 と RFC 9493 は standards-status.md に未登録 | 前提台帳へ追加要（x-open-items に既載） |
| R4 | 送信 iss の形（path なし）は U-01 の決裁に依存する | 未決（ADR-006 L6-7、DEC-3 の U-01） |

## 参考文献

[^1]: IETF (P. Hunt, Ed., M. Jones, W. Denniss, M. Ansari)『RFC 8417: Security Event Token (SET)』2018-07. https://www.rfc-editor.org/rfc/rfc8417 （参照箇所: §2.2, §2.3、確認日: 2026-10-15。research 未収録）
[^2]: OpenID Foundation Shared Signals WG『OpenID Shared Signals Framework Specification 1.0』Final, 2025-08-29. https://openid.net/specs/openid-sharedsignals-framework-1_0-final.html （参照箇所: §3.1〜§3.1.2, §3.3, §3.5.1〜§3.5.3, §3.6, §4.1.1〜§4.1.9, §4.2.1〜§4.2.3, §7, §7.1, §8.1.2.1, §8.1.4.1, §8.1.5、確認日: 2026-10-15。RS-04#77）
[^3]: OpenID Foundation Shared Signals WG『OpenID Continuous Access Evaluation Profile 1.0』Final, 2025-08-29. https://openid.net/specs/openid-caep-1_0-final.html （参照箇所: §2, §3.1〜§3.8、確認日: 2026-10-15。RS-04#78、RS-03#66）
[^4]: OpenID Foundation Shared Signals WG『OpenID RISC Profile Specification 1.0』Final, 2025-08-29. https://openid.net/specs/openid-risc-1_0-final.html （参照箇所: §2.2〜§2.4, §2.6, §2.7, §2.9, §2.11、確認日: 2026-10-15。RS-04#78、RS-03#66）
[^5]: IETF (A. Backman, M. Scurtescu, P. Jain)『RFC 9493: Subject Identifiers for Security Event Tokens』2023-12. https://www.rfc-editor.org/rfc/rfc9493 （参照箇所: §3, §3.2.1〜§3.2.8, §4.1、確認日: 2026-10-15。ADR-021 [^38] と同じ原典）
