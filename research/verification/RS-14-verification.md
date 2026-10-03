# RS-14 独立検証記録（脚注の原典照合）

> 文書ID: RS-14-V / 版: 0.1 / 状態: review / 最終更新: 2026-10-03
> 対応要求: R-013, R-129〜R-135（RS-14 の対応要求に準ずる）
> 依存文書: CONVENTIONS.md, research/RS-14-b2b-customer-identity.md（検証対象。検証後に版 0.1 から 0.2 へ改訂）

本記録は、RS-14 の作成者とは別の AI エージェント（Claude）が 2026-10-03 に行った脚注の原典照合のログである。検証者も AI であり、人間のレビュアによる照合ではない。判定は検証者の読解によるもので、CTO/CISO の決裁ではない。

---

## 1. 検証の方法

| 項目 | 内容 |
|---|---|
| 対象 | RS-14 版 0.1 の全脚注 [^1]〜[^52]（52 件）と、各脚注が付いた本文の主張（§2 結論サマリ、§3 調査結果 RS-14#1〜#75、§4 ステータス表） |
| 取得 | 全 52 脚注の URL を 2026-10-03 に curl で取得した（全て HTTP 200）。HTML はテキスト化し、PDF は pdftotext で抽出して、引用文・数値・規範語を全文検索で逐語照合した。WebFetch は小型モデルの要約を返すため照合には使わなかった（Slack の英語版取得に 1 回試行し、転送過多で失敗） |
| 節番号 | SP 800-63C-4 の HTML は節番号を CSS で描画するため、見出し要素の順序から節番号を再構成し、引用文がどの節にあるかを確認した。RFC と Internet-Draft はテキスト版の節見出しで確認した |
| 補助確認 | RFC の状態・更新関係は RFC Editor の JSON メタデータ（rfc7643/7644/9865/9967.json）、SP 800-63C-4 の公表日は CSRC の出版ページ、Internet-Draft の状態は datatracker と ietf.org/archive の -13 テキスト、CVE は CVE Services API と MSRC の公開 API、個人情報保護法は e-Gov 法令 API v2（law_data・law_revisions）、CSA SSCF は CSA の配布 bundle（zip、Introduction・Implementation Guidelines の PDF と SSCF-simple.json）で確認した |
| 転送 | [^13] と [^29] の support.google.com の URL は knowledge.workspace.google.com へ転送された（同一文書）。[^43] と [^44] の slack.com のヘルプは、Accept-Language を英語にしても地域判定で日本語版（/intl/ja-jp/）へ転送され、英語原文は取得できなかった。同一記事の日本語版で照合した |
| 判定区分 | 支持: 脚注の参照箇所が主張を全て裏付ける。部分支持: 主張の核心は裏付けられるが、限定条件・版・日付・帰属・用語のいずれかが原典とずれる。不支持: 原典が主張を裏付けない、または反する。検証不能: 原典を取得できない、または該当箇所が見つからない |
| 規範強度 | SP 800-63C-4（SHALL/SHOULD/MAY）、RFC 7643/7644/9967、OIDC Core、SAML Profiles、IETF 草案（MUST/SHOULD/MAY）、IPSIE 草案（MUST/SHOULD/SHALL、SL1 は小文字 shall）、SSCF（小文字 must）、RFC 7644 §6.1 の小文字 should を、該当文と 1 文ずつ照合した |

## 2. 判定の集計

| 判定 | 件数 | 脚注 |
|---|---|---|
| 支持 | 46 | 下表の「支持」 |
| 部分支持 | 6 | [^4], [^6], [^13], [^30], [^33], [^42] |
| 不支持 | 0 | — |
| 検証不能 | 0 | — |

部分支持の 6 件は、いずれも RS-14 版 0.2 で修正した（§4）。このほか、脚注単位では支持だが、結論サマリでの言い換えが原典とずれていた 2 件（§2-2、§2-12）を修正した。新たに原典脚注 [^53]〜[^56] の 4 件を追加した（版 0.1 で「未確認」「推定」としていた事項の解消と、版・状態の補強のため）。規範語の強度の誤写は見つからなかった。

## 3. 脚注ごとの判定表

凡例: 「主張」は脚注が付いた RS-14 の項目番号（#n）、結論サマリの番号（§2-n）、ステータス表（§4）。

| 脚注 | 原典（取得先） | 主張 | 判定 | 照合結果（原典の該当箇所） | 修正 |
|---|---|---|---|---|---|
| [^1] | OIDC Core 1.0 errata set 2（openid.net） | #1, §2-2 | 支持 | 表題 "Final: OpenID Connect Core 1.0 incorporating errata set 2"、December 15, 2023。§5.7 の "MUST NOT be used as unique identifiers"、"an Issuer MAY re-use an email Claim Value"、"MAY change over time"。§5.1 email の "The RP MUST NOT rely upon this value being unique" | なし（§2-2 の文構成のみ修正） |
| [^2] | SP 800-63C-4（pages.nist.gov）、CSRC 出版ページ | #2, #4, #11〜#18, #38, #41, #60, #61, §2-4, §2-5, §2-10 | 支持 | CSRC: Date Published July 2025、07/31/25 Final、DOI 10.6028/NIST.SP.800-63c-4。全引用文が記載の節に存在（§2.4, §3.3.2, §3.3.3, §3.4, §3.5, §3.6.1, §3.8, §3.8.1, §4.3.1, §4.6.2.1, §4.6.5, §4.8, §6.1）。強度: §3.8.1 SHALL/SHOULD/SHALL、§3.8.2 SHALL×2、§3.5 SHALL（母集団・xAL・redress・データ保持）、§4.3.1 SHALL、§4.6.2.1 SHALL/SHALL NOT/SHOULD、§3.6.1 SHALL、§3.6 共通鍵 SHALL、§2.4 SHALL、§3.16 SHALL/SHOULD、§3.16.2 5 分 SHALL、§4.6.5 SHALL NOT/SHALL、§4.6.4 SHALL、§4.6.7 MAY/SHALL、§3.11.3 SHALL、§4.8 SHALL/SHALL NOT。§3.11.1 は "recommended/required"（小文字）で、ノートも SHALL とは書いていない。§6 と §9 は informative と明記 | 補強: §2.3（FAL2 で injection 対策と RP 開始が SHALL）と §3.11.1 の IdP-initiated 禁止の例外を #18・§2-10・§5.1 に追加。脚注の参照箇所に §2.3 を追加 |
| [^3] | Microsoft Learn claims-validation | #3, §2-2 | 支持 | ms.date 2025-03-21、updated_at 2026-06-15。"Always check that the tid ... matches"、"Never allow data in one tenant to be accessed from another tenant"、"use the immutable claim values tid and oid as a combined key"、Warning の引用文 | なし |
| [^4] | Okta Developer Okta-to-Okta | #5 | 部分支持 | AUTO linking は "IdP username value (email) ... matches the Match against value (username)"。Exclude admins は "Auto-link filters ... Early Access" と表示。linking 無効化は "consider disabling account linking"（推奨ではなく検討の勧め）。B2B・マルチテナントでは RegEx フィルタを選ぶよう Note で案内 | #5 に Early Access と「無効化を検討するよう勧めている」を反映 |
| [^5] | CISA AA23-320A | #6, §2-1 | 支持 | Last Revised July 29, 2025、"November 16, 2023: Initial version"。引用文は原文どおり。同じ段落に "While the threat actors may still be using this tactic, it has not been identified as a current TTP." | 補強: 現行 TTP としては確認されていないとの付記を #6 に追加 |
| [^6] | Okta Security 2023-08 Cross-Tenant Impersonation | #7, #8, §2-1, §2-3 | 部分支持 | 攻撃の記述・引用文は原文どおり。Prevention・Detection の項目も一致。ただし Change Log によると、Protected Actions と ASN/IP Session Binding の推奨は 1.2（Mar 8, 2024）で追加された（1.0 は Sep 1, 2023 公開）。脚注は 2023-08-31 の日付だけで、引いた推奨の版を示していなかった | #8 に改訂 1.2（2024-03-08）を明記し、脚注 6 に Change Log を追記 |
| [^7] | OpenID RISC 1.0 final | #9, #62 | 支持 | Published 29 August 2025。§2.6 Identifier Recycled の引用文、"The subject type MUST be either email or phone" | なし |
| [^8] | RFC 7644（テキスト版）、RFC Editor JSON | #10, #31〜#33, §2-2, §2-7 | 支持 | Proposed Standard、2015-09、updated_by RFC 9865・9967。§3.6 SHOULD NOT（409）、§3.3 MUST（409 uniqueness）、§7.2 MUST（transport 保護・TLS 1.2）、§2 SHOULD NOT（弱い認証の token）、§3.14 MAY（ETag）・MAY（If-Match）、§3.12 表に 409・412、§6 "Multi-tenancy is OPTIONAL"、§6.1 小文字 should と 3 方式、§6.2 externalId はテナント内で一意 | なし |
| [^9] | RFC 7643（テキスト版）、RFC Editor JSON | #33, #34 | 支持 | §3.1 externalId "MUST NOT be specified by the service provider"、"MUST always interpret the externalId as scoped to the provisioning domain"。§4.1.1 active の引用文 | なし |
| [^10] | IPSIE AL SCIM 2.0 Profile Draft 00 | #10, #36, #37, §2-8 | 支持 | Published 8 September 2026、Informational、J. Schreiber・D. Zollner。§4.1 MUST（client_credentials と JWT client 認証、scim scope）、§4.2 "Local modifications ... are prohibited"、§4.3 25 req/s MUST（per-tenant）、§5.1 SHOULD 5 分×2・MUST 全アクセス手段、§5.2 MUST（同じ username の再作成）、§8 SHALL（監査記録） | なし（草案内の不整合を §6 に記載） |
| [^11] | SAML V2.0 Profiles（OASIS PDF） | #19, §2-10 | 支持 | OASIS Standard, 15 March 2005。§4.1.5 MAY（unsolicited）と MUST NOT（InResponseTo）、§4.1.4.5 MUST（POST での署名）と MUST（bearer assertion の再利用防止） | なし |
| [^12] | CSA SSCF bundle（Introduction PDF、SSCF-simple.json、Implementation Guidelines） | #20, #21, #40, #50〜#52, #57〜#59, §2-9, §2-10 | 支持 | 版履歴: 1.0.0 2025-09-24、1.0.1 2026-04-09（CAIQ と実装ガイドを追加）。JSON の計数で 6 領域 36 統制（IAM 21、LOG 7、CCC 4、IPY 2、DSP 1、SEF 1）。IAM-SaaS-03〜05, 09, 10, 12〜19, 21、IPY-SaaS-02、LOG-SaaS-01〜07、CCC-SaaS-01、SEF-SaaS-01 の must と実装ガイド（break-glass、30 日、SMS 不許可）は記載どおり。§1.4 の認証制度の引用文、§1.9 の引用文も一致。#58 の「IAM 設定は顧客の責任」は §1.9 の "managing user accounts and access, and correctly configuring the security settings" の要約 | #58 を §1.9 の文言に沿って言い直した（判定は支持のまま） |
| [^13] | Google Setting up SSO（knowledge.workspace.google.com へ転送） | #22 | 部分支持 | 1,000 profiles、2 証明書の引用文、組織部門・グループ単位の割当ては一致。super admin については "If your organization needs ... SSO for super admins, you also have the option to configure the legacy SSO profile" であり、「必要とされている」は本文献単独では言い過ぎ | Google の「Super administrator SSO」（新規 [^53]）の直接記述で補強し、#22 と §6 を修正 |
| [^14] | IPSIE SL1 OIDC Profile Draft 00、editor's draft | #23 | 支持 | Published 18 April 2025、Expires 20 October 2025、Informational。OP: 事前登録 shall、DPoP shall、ID token の audience を単一文字列 shall。RP: RFC 9207 の iss 検査 shall（引用文一致）。editor's draft は 29 September 2026 付 | ステータス表に表示上の失効日と WG ページ（新規 [^54]）の状態を追記 |
| [^15] | datatracker、draft -13 テキスト | #24〜#27, §2-6 | 支持 | -13、22 June 2026、Expires 24 December 2026、Intended BCP、WG state "Waiting for WG Chair Go-Ahead"・"Revised I-D Needed"、IESG state "I-D Exists"。§3 引用文、§6.3 MUST/MAY、§9.7 MUST/SHOULD/MAY、§9.9 SHOULD NOT（ICANN division）、§9.11、§9.13 引用文 | なし（datatracker の Last updated は 2026-06-21 と表示されるが、草案の日付は 2026-06-22） |
| [^16] | Atlassian Verify a domain | #28, §2-6 | 支持 | "After verification is successful, we'll periodically check your DNS host for the txt record"、期限付きのメール通知と検証状態の喪失 | なし |
| [^17] | Google Verify your domain with a TXT record | #29 | 支持 | "Once verified, the TXT record can be safely removed."。定期再確認の記載なし | なし |
| [^18] | GitHub Verifying or approving a domain | #29 | 支持 | "Optionally, after the "Verified" badge is visible ..., delete the TXT entry"。定期再確認の記載なし | なし |
| [^19] | Microsoft Learn Add your custom domain | #30 | 支持 | ms.date 2026-06-18。"A domain name can only be verified in one directory." | なし |
| [^20] | Microsoft Learn Admin takeover | #30 | 支持 | ms.date 2026-06-18、updated 2026-06-19。引用文、Users・Subscriptions・License assignments の移動、forceTakeover 後 10 日で削除 | なし |
| [^21] | RFC 9967（テキスト版）、RFC Editor JSON | #35 | 支持 | Proposed Standard、May 2026、Updates 7643・7644。§5 の MUST（JWS 検証、永続化、結果 URI の保護）は記載どおり | なし |
| [^22] | Microsoft Learn cross-tenant synchronization | #39, #68, §2-11 | 支持 | ms.date 2026-05-29、updated 2026-07-02。push 型、"currently fixed to start at 40-minute intervals"、sign-in block の再有効化、severed の引用文、同一組織内の意図・コンプライアンス責任・同意を支援しない旨、"no plan to extend support for B2B direct connect beyond Teams Connect shared channels" | なし |
| [^23] | GDPR（EUR-Lex） | #42, #64, §2-12 | 支持 | Art. 28(3)(g)(h)、Art. 33(2) の文言一致。Art. 99(2) "It shall apply from 25 May 2018" | §2-12 の言い換えを修正（下記 §4）。ステータス表の適用開始日を原文から確定 |
| [^24] | DORA（EUR-Lex） | #43, #66, §2-12 | 支持 | Art. 30(1) 引用文、30(2)(f)(h)、30(3)(f) の引用文、Art. 64 "It shall apply from 17 January 2025" | §2-12 の言い換えを修正（下記 §4） |
| [^25] | Microsoft Learn protected actions | #44, §2-3 | 支持 | ms.date 2025-11-03、updated 2026-02-19。引用文、対象領域（CA policy 管理、cross-tenant access settings 管理、一部オブジェクトの hard delete、network location） | なし |
| [^26] | Microsoft Learn administrative units | #45 | 支持 | ms.date 2024-10-29、updated 2026-02-19。入れ子不可、グループのメンバーは範囲外、非メンバーへの割当てはテナント全体 | なし |
| [^27] | Microsoft Learn Default user permissions | #45 | 支持 | ms.date 2026-06-18、updated 2026-06-23。引用文（Guest user access restrictions の説明） | なし |
| [^28] | Microsoft Partner Center GDAP introduction | #46 | 支持 | ms.date 2026-04-28、updated 2026-05-27。"granular and time-bound access"、引用文 | なし |
| [^29] | Google Domain-wide delegation best practices（転送） | #47 | 支持 | 引用文、"Avoid using domain-wide delegation if you can ..."、鍵作成・アップロードの制限 | 脚注に転送先を追記 |
| [^30] | Okta Security 2023-11-03 Root Cause | #48, §2-13 | 部分支持 | 期間、134 社、HAR 内 session token、5 社の session 乗っ取り、network location による session token binding は一致。ただし資格情報の露出について Okta は "The most likely avenue for exposure ... is the compromise of the employee's personal Google account or personal device" としており、ノートの「原因は … 保存されていたことである」は断定が強すぎる | #48 を「保存されていた事実」と「Okta が最も可能性が高いとする露出経路」に分けて記述 |
| [^31] | Microsoft Security Blog 2024-01-25 Midnight Blizzard | #49 | 支持 | 引用文、legacy test OAuth application による full_access_as_app ロールの付与 | なし |
| [^32] | CSRB 報告 PDF | #53, §2-9 | 支持 | March 20, 2024。RECOMMENDATION 4（有料ログの慣行を止める）、§2.1.3 Audit Logging Norms の RECOMMENDATION 10 の引用文 | なし |
| [^33] | CISA Product Security Bad Practices | #54, §2-9 | 部分支持 | Revision Date January 17, 2025、Version 2.0。6 か月保持の文言と "dangerous" は一致するが、どちらも重要インフラ・NCF に使われる製品を対象とする bad practice（9 と 10）の文脈であり、MFA の項には 2028-01-01 前のサポート終了告知製品の除外がある。文書は "voluntary guidance"。ノートは対象範囲を省いていた | #54 に対象範囲、should、除外条件、voluntary を明記 |
| [^34] | GitHub About the audit log for your enterprise | #55 | 支持 | 180 日・Git イベント 7 日の引用文、Audit log API、streaming | なし |
| [^35] | Slack Developer Docs Audit Logs API | #55 | 支持 | Enterprise プラン限定、"Apps requesting the auditlogs:read scope must be installed by the Owner of an Enterprise organization"、"read only" | なし |
| [^36] | Microsoft Learn Cross-tenant access overview | #56, #69, §2-11 | 支持 | ms.date 2025-03-28、updated 2026-03-27。既定値の引用文、MFA・device claim の非信頼、trust settings、自動受諾は双方設定時のみ、CrossTenantAccessSettings の引用文、cross-tenant 設定の変更は protected actions | なし |
| [^37] | OpenID SSF 1.0 final | #62 | 支持 | Published 29 August 2025。§2 Subject Principals の引用文、complex subject の tenant メンバー | なし |
| [^38] | OpenID CAEP 1.0 final | #62 | 支持 | Published 29 August 2025。§3.1〜§3.8（Session Revoked、Credential Change、Assurance Level Change ほか） | なし |
| [^39] | Microsoft Learn Shared responsibility | #63, §2-12 | 支持 | ms.date 2026-08-24。表で SaaS の Customer data・Configurations and settings・Identities and users が Customer。"For all cloud deployment types, you own your data and identities."。Accounts と Access management（RBAC、MFA、CA）の常時保持。法的結論でない旨の注記 | なし |
| [^40] | 個人情報保護法（e-Gov 法令 API v2） | #65, §2-12 | 支持 | 2026-10-01 施行版（令和 7 年法律第 70 号反映）で第 25 条の引用文と第 26 条第 1 項ただし書が一致。公布日 2003-05-30 | 補強: 令和 8 年改正の状態と条文の不変を新規 [^55] で追記。ステータス表を更新 |
| [^41] | Microsoft Learn External ID overview | #67, #68, §2-11 | 支持 | ms.date 2026-04-24、updated 2026-06-15。workforce／external テナント、2 つの引用文、相互有効化と home での認証・resource 側からの token | なし |
| [^42] | Microsoft Learn tenant restrictions v2 | #70 | 部分支持 | ms.date 2026-03-20、updated 2026-06-11。authentication plane と data plane の区別、proxy の引用文は一致。ただし data plane protection は "Data plane protection (preview)" と表示されており、状態の記載が欠けていた | #70 に preview 表示を追記 |
| [^43] | Slack Connect guide（日本語版へ転送） | #71, §2-11 | 支持 | 日本語版「チャンネルのオーナーの権限」: 自分のワークスペースで作成したチャンネルは自分のオーガナイゼーションがオーナー、オーナーだけが招待・外す・投稿権限の管理などを行える。「アプリとワークフローの使用」: アプリを追加したオーガナイゼーションのメンバーのみがアプリを外せる | 脚注に照合した言語版を追記（英語の引用文は逐語照合できていない） |
| [^44] | Slack approval settings（日本語版へ転送） | #71, §2-11 | 支持 | 日本語版「オーガナイゼーションごとに承認設定を管理する」: OrG オーナーと OrG 管理者は特定のオーガナイゼーションにカスタム承認・承諾設定を適用できる（Enterprise）。Pro・Business+ ではワークスペースのオーナー・管理者 | 脚注に照合した言語版を追記 |
| [^45] | Google trust rules for Drive sharing | #72 | 支持 | "The organization must have a domain-verified Google Workspace account, unless you're using visitor or guest sharing." | なし |
| [^46] | GitHub About Enterprise Managed Users | #73 | 支持 | IdP による provisioning、username・プロフィール・組織所属・リポジトリアクセスの IdP 管理、引用文、OIDC と CAP | なし |
| [^47] | GitHub Abilities and restrictions of managed user accounts | #73 | 支持 | repository collaborator、guest collaborator ロール（internal リポジトリへのアクセス制限） | なし |
| [^48] | Okta Help Center Org2Org | #74 | 支持 | source 側に設置、hub-and-spoke（spoke が source）、OAuth 2.0 の方が安全との引用文、SAML assertion 暗号化の非対応 | なし |
| [^49] | CVE Services API（CVE-2025-55241） | #75 | 支持 | assigner microsoft、datePublished 2025-09-04、dateUpdated 2026-02-26、CVSS 3.1 10.0 CRITICAL、CWE-287、title。攻撃手順の記載なし | 補強: MSRC の表示を新規 [^56] で追記 |
| [^50] | RFC 9865（テキスト版）、RFC Editor JSON | §4 | 支持 | Proposed Standard、October 2025、Updates 7643・7644 | なし |
| [^51] | OIDF プレスリリース 2025-09-16 | #62 | 支持 | Published September 16, 2025。3 仕様を Final Specifications として承認 | なし |
| [^52] | Google Allow external sharing with only trusted domains | #72 | 支持 | "Users don't get a notification about the change. When a domain is removed, users in that domain lose access to any shared files." | なし |

### 3.1 追加した原典脚注

| 脚注 | 原典 | 追加理由 |
|---|---|---|
| [^53] | Google『Super administrator SSO』 | [^13] 単独では「選択肢がある」としか言えず、版 0.1 §6 で「推定」としていた点を、"It's not supported by the newer SSO profiles" の直接記述で確定するため |
| [^54] | OpenID Foundation『IPSIE Working Group - Specifications』 | 版 0.1 で「Implementer's Draft 承認は未確認」としていた状態を確認するため。Implementer's Drafts・Final Specifications ともに「None yet」 |
| [^55] | e-Gov 法令 API v2 law_revisions（個人情報保護法） | 版 0.1 で原文未確認としていた令和 8 年改正（令和 8 年法律第 56 号）の公布日・施行日・施行状態と、引用条文が改正後も変わらないことを原文で確認するため |
| [^56] | MSRC Security Update Guide（CVE-2025-55241） | 版 0.1 §6 で「MSRC の詳細文書は未取得」としていた点を確認するため。緩和済み・利用者対応不要・Exploited No・改訂 1.1 の CVSS 変更までは確認できたが、機序の記載はない |

## 4. 修正内容（RS-14 版 0.1 → 0.2）

| # | 箇所 | 修正前の要旨 | 修正後の要旨 | 根拠 |
|---|---|---|---|---|
| 1 | §2-2 | email・preferred_username・userName を使わない設計を [N][^1][V][^3] で裏付け | 原典ごとの事実（OIDC の MUST NOT、Microsoft の tid＋oid 推奨、userName 再利用は RFC 7644・IPSIE）を分けて書き、設計判断は [D] に分離 | userName は [^1][^3] に記載がない |
| 2 | §2-10 | SP 800-63C-4 は FAL2 以上で assertion injection 対策を必須 | §2.3 で injection 対策と RP 開始がともに SHALL、§3.11.1 の IdP-initiated 禁止と例外（外部当事者が RP に開始を促す処理）を追記 | [^2] §2.3, §3.11.1 |
| 3 | §2-12 | GDPR・個人情報保護法・DORA は処理者・委託先・ICT 事業者に通知・協力・監査受入・出口の義務を課す | 法令ごとに義務の名宛人を区別（GDPR は契約条項と処理者の通知義務、DORA は金融機関の契約要件、個人情報保護法は委託元の監督義務と委託先通知による例外） | [^23][^24][^40]。DORA 第 30 条と個人情報保護法第 25 条は事業者に直接義務を課す条文ではない |
| 4 | #5 | 管理者除外フィルタを提供、自動 linking の無効化を推奨 | Auto-link filters は Early Access と表示、無効化は「検討を勧める」 | [^4] |
| 5 | #6 | — | 2025-07-29 更新で、IdP 追加と自動 linking は現行 TTP としては確認されていないと付記 | [^5] |
| 6 | #8・脚注 6 | 2023-08-31 の報告として予防策を列挙 | 予防策は改訂 1.2（2024-03-08）版のもの、Protected Actions と ASN/IP binding は 1.2 で追加と明記 | [^6] Change Log |
| 7 | #18 | 推奨・必須と具体策 | §3.11.1 の IdP-initiated 禁止とその例外、§2.3 の SHALL を追加 | [^2] |
| 8 | #22 | super admin に SSO を適用するには legacy SSO profile が必要 | [^13] は「選択肢」、[^53] で新しい SSO profile は非対応と直接確認、IdP 侵害時のリスクの記述も追加 | [^13][^53] |
| 9 | #48 | 原因は資格情報が個人 Google アカウントに保存されていたこと | 保存の事実と、Okta が「最も可能性が高い」とした露出経路を分けて記述 | [^30] |
| 10 | #54 | クラウド・SaaS 事業者は 6 か月保持すべき、管理者 MFA を既定で無効にする製品は dangerous | 重要インフラ・NCF 向け製品の bad practice の文脈、should、2028-01-01 前のサポート終了告知製品の除外、voluntary を明記 | [^33] |
| 11 | #58 | IAM 設定は顧客の責任 | §1.9 の文言（アカウントとアクセスの管理、セキュリティ設定の正しい構成）に沿って言い直し | [^12] |
| 12 | #65 | 第 25 条・第 26 条第 1 項ただし書 | 令和 8 年法律第 56 号の段階施行（2026-07-17 公布、2027-01-17・2028-07-16 施行分は未施行）と、引用条文が改正後も同一であること、第 26 条第 2 項ただし書の変更を追記 | [^55] |
| 13 | #70 | authentication plane と data plane の区別 | data plane protection は preview と表示 | [^42] |
| 14 | #75 | CVE レコードの CVSS・CWE のみ | MSRC の表示（緩和済み、対応不要、Exploited No、改訂 1.1 で AC を High→Low）を追記。機序は引き続き未確認 | [^56] |
| 15 | §4 ステータス表 | IPSIE 2 件は「Implementer's Draft 承認は未確認」、GDPR は適用開始日未確認、個人情報保護法は令和 8 年改正を原文未確認 | IPSIE は WG ページで Implementer's Drafts「None yet」、SL1 Draft 00 の表示上の失効日、GDPR は 2018-05-25 適用開始（第 99 条第 2 項）・採択 2016-04-27、個人情報保護法は公布 2003-05-30 と令和 8 年改正の状態 | [^54][^23][^40][^55] |
| 16 | §5.1 ADR-004 行 | IdP-initiated の①②案 | ②が SP 800-63C-4 §3.11.1 の例外と §2.3 に整合しやすい旨を [D] で追記 | [^2] |
| 17 | §6 | CVE・IPSIE・Google super admin・法令を未確認・推定として記載 | 確認できた範囲を反映。IPSIE AL SCIM Draft 00 §4.1 の client 認証規定の不整合（JWT client 認証の MUST と HTTP Basic の MUST）を新たに記載。Slack の言語版照合を記載。CVE の機序は未確認のまま結論から外す | [^10][^53]〜[^56] |
| 18 | 脚注 2, 13, 23, 29, 43, 44 | — | 参照箇所の追加（§2.3、Art. 99(2)）、転送先の注記、照合した言語版の注記 | — |
| 19 | メタ情報 | 版 0.1 | 版 0.2、注記 4（独立検証の反映）を追加 | — |

## 5. 検証不能・照合の限界

- 検証不能とした脚注はない。全 52 件の原典を取得し、該当箇所を確認した。
- [^43][^44]（Slack ヘルプ）は、英語版が地域判定で日本語版に転送されたため、英語の原文とは逐語照合していない。同一記事の日本語版で主張の内容を照合し、支持と判定した。英語版の文言が日本語版と異なる可能性は残る。
- [^12]（CSA SSCF）は、ログインなしの配布 URL から取得した bundle（zip）で照合した。SSCF-simple.json のメタデータは version "1.0" と表示されるが、同梱の Introduction の版履歴と表計算ファイル名は v1.0.1 である。統制の文言は JSON で照合した。
- [^49] と [^56] は、ブラウザ表示ページではなく CVE Services と MSRC の公開 API の JSON で照合した。
- [^40] と [^55] は、e-Gov のブラウザ表示（JavaScript 描画）ではなく法令 API v2 の JSON で照合した。API の current_revision_status は 2026-10-01 施行版を "PreviousEnforced" と表示しており、"CurrentEnforced" の版は一覧になかった。施行日の並びから 2026-10-01 施行版を 2026-10-03 時点の現行と判断した。
- CVE-2025-55241 のテナント越えの機序は、MSRC・CVE のいずれの原典にも記載がなく、未確認のままである（ノートの結論には使われていない）。
- 本検証は脚注が付いた主張の照合であり、[D] の設計推論の妥当性（§5 の ADR 入力・契約条項案）は評価の対象外である。
