# RS-15 独立検証記録（脚注の原典照合）

> 文書ID: RS-15-V / 版: 0.1 / 状態: review / 最終更新: 2026-10-03
> 対応要求: R-088, R-090, R-091, R-092, R-093, R-094, R-141, R-208（RS-15 の対応要求に準ずる）
> 依存文書: CONVENTIONS.md, research/RS-15-build-buy-tco.md（検証対象。検証後に版 0.1 から 0.2 へ改訂）

本記録は、RS-15 の作成者とは別の AI エージェント（Claude）が 2026-10-03 に行った脚注の原典照合のログである。検証者も AI であり、人間のレビュアによる照合ではない。判定は検証者の読解によるもので、CTO/CISO の決裁ではない。

---

## 1. 検証の方法

| 項目 | 内容 |
|---|---|
| 対象 | RS-15 版 0.1 の全脚注 [^1]〜[^74]（74 件）と、各脚注が付いた本文の主張（§2 結論サマリ、§3 調査結果、§4 ステータス表） |
| 取得 | 全 74 脚注の原典を 2026-10-03 に取得した。逐語で照合するため、原則として curl で原文を取得し、HTML はテキスト化、PDF は pdftotext で抽出し、全文検索した。表（OIDF の認定一覧、各社の料金比較表）は HTML の `<tr>/<td>` を列単位で解析した。GitHub のリリース日とライセンスは GitHub API（gh api）で確認した |
| 取得経路の例外 | 次の脚注は記載 URL への curl がボット対策で拒否されたため、同一文書を別経路で取得した。(1) [^62] W3C（Cloudflare の 403）: WebFetch と Tavily Extract で /TR/webauthn-3/、日付付きの REC 版 URL、publication history を取得した。(2) [^65]〜[^70] EUR-Lex（WAF の 202）: 欧州連合出版局の cellar（CELEX 32023R2854 / 32022R2554）から OJ 掲載版の XHTML を取得した。(3) [^71] GAO（Akamai の 403）: Tavily Extract で同じ PDF の該当箇所を取得し、公表日は WebFetch で製品ページから確認した。(4) [^36] Azure Retail Prices API: 記載 URL は空白と引用符が未エンコードで HTTP 400 になるため、エンコードして照会した。(5) [^38] Microsoft SLA: web ページから 2026 年 10 月版の docx を取得し、本文を抽出した |
| 転送 | [^12]、[^19]、[^20]、[^44]、[^50] は記載 URL から別 URL へ転送された。内容は同じ文書（[^20] は改題後の同じ OEL 紹介文書）であり、脚注の URL を転送先に更新した |
| 判定区分 | 支持: 脚注の参照箇所が主張を全て裏付ける。部分支持: 主張の核心は裏付けられるが、限定条件・版・日付・帰属・用語・引用先のいずれかが原典とずれる。不支持: 原典が主張を裏付けない、または反する。検証不能: 原典を取得できない、または該当箇所が見つからない |
| 規範強度 | NIST SP 800-63B-4 §3.1.1.2（SHALL / SHOULD）、W3C WebAuthn Level 3 §5.5（MUST）、EU Data Act 第 25 条・第 29 条（shall / shall not）、前文 (82)（should / should not）、DORA 第 28 条(8)・第 30 条(3)(f)（shall）を、原文の該当文と 1 文ずつ照合した |
| 版・状態・日付 | 版や状態が変わり得るもの（W3C の成熟度、NIST の final、Keycloak 文書の版、Keycloak の機能の supported / preview 区分、各社の最新リリース、SLA の版、契約の最終更新日、OJ 掲載日）を個別に確認した |
| 試算 | §3.15（RS-15#72〜#76）の数値を、前提台帳（01_governance/assumptions-register.md）の A-002・A-003・A-004・A-020・A-029・A-043・A-045・A-054・A-061・A-082 と各社の単価から再計算した |

## 2. 判定の集計

| 判定 | 件数 | 脚注 |
|---|---|---|
| 支持 | 63 | 下表の「支持」（書誌・URL の補正だけのものを含む） |
| 部分支持 | 11 | [^2], [^6], [^8], [^13], [^15], [^20], [^38], [^39], [^60], [^70], [^74] |
| 不支持 | 0 | — |
| 検証不能 | 0 | — |

部分支持の 11 件は、いずれも RS-15 版 0.2 で修正した（§4）。このうち影響が大きいのは次の 4 点である。

1. **Keycloak の機能区分の誤り（[^8]）**: 版 0.1 は `scim-api:v1` と `stateless:v1` を preview、`multi-site:v1` を「supported だが既定で無効」としていた。26.8.0 版の文書では、`scim-api:v1` は supported・既定で有効、`stateless:v1` は supported・既定で無効、`multi-site:v1` は deprecated である。また `token-exchange-standard:v2` が supported・既定で有効であることが抜けていた。これにより RS-15#18 の「SCIM と token exchange の新方式は preview であり、本番の前提にはしない」は誤りとなり、修正した。
2. **Keycloak 文書の版の誤読（[^13], [^15], [^74]）**: 版 0.1 は「ページ表示 Nightly 26.8.0」としていた。HTML の版選択は Nightly と 26.8.0 の 2 択で、26.8.0 が選択済み（`selected="selected"`）のリリース版文書だった。§6 の「Nightly とリリース版の差は未確認」も不要になった。
3. **引用先の誤り（[^70]）**: §2-11 は Google SRE 本の目安に [^70]（DORA）を付けていた。正しくは [^72] である。対応する項目番号も RS-15#71 から RS-15#70 に直した。
4. **Ory の OEL 限定機能（[^20]）**: 版 0.1 は SCIM を OEL 限定機能に含めていた。現行の OEL 文書（旧 URL からの転送先）は、OSS 版にない機能として Kratos の B2B organization・マルチテナントと Hydra の ROPC grant だけを挙げ、SCIM は挙げていない。SCIM が Enterprise 限定であることは Ory Network の料金比較表（[^18]）でだけ確認できたため、self-host での扱いは「未確認」とした（§2-9 も修正）。

## 3. 脚注ごとの判定表

凡例: 「主張」は脚注が付いた RS-15 の項目番号（#n）と結論サマリの番号（§2-n）。

| 脚注 | 原典（取得先） | 主張 | 判定 | 照合結果（原典の該当箇所） | 修正 |
|---|---|---|---|---|---|
| [^1] | openid.net/certification | #1 | 支持 | "Self-Certification: Using the OpenID Foundation's conformance tests, implementers can follow a self-certification process. Once complete, Certified implementations can use the "OpenID Certified" certification mark."、"the OpenID Foundation is developing a network of third-parties who will act as Authorized Auditors and Testing Service Providers" | なし |
| [^2] | OIDF Certified OpenID Providers & Profiles | #3, #28, §2-1 | 部分支持 | 表を列単位で解析した（列: Basic / Implicit / Hybrid / Config / Dynamic / Form Post / 3rd Party-Init）。Keycloak 18.0.0（19-May-2022）、Keycloak 2.3.0（31-Oct-2016）、ORY Hydra v1.0.0（14-Jul-2018）、ZITADEL 1.53.1（04-Nov-2021、Basic のみ）、authentik 2026.8.0（07-Jul-2026）、node oidc-provider（29-Jul-2020）、Azure AD V2（15-Jan-2019）、Okta OP（25-May-2016〜16-Jul-2018）、Google Federated Identity（15〜23-Apr-2015）は一致。Amazon・Cognito の行なし。ずれ: Auth0 の行は Form Post 列が 13-Aug-2018 で、範囲は「2016-05〜2017-02」でなく「2016-05〜2018-08」。別に「Matias Woloski / Auth0」行（2016-02）がある | #3 の Auth0 の範囲を訂正し、Matias Woloski 行と行ごとのプロファイル内訳を追記。§6 の「列を確定できなかった」を解消 |
| [^3] | OIDF FAPI 2.0 Final & Message Signing Final 一覧 | #4, #5, #6, §2-2 | 支持 | node oidc-provider >= 9.2.0 は 7 列すべて 10-Jul-2025。Okta / Auth0 – Highly Regulated Identity – 202527 は列 1（MTLS＋MTLS）・列 3（private key＋MTLS）・列 5（OpenID Connect）が 09-Jul-2025、DPoP の 2 列と Message Signing の 2 列は空欄。添付名 "FAPI2SPFinal_OpenID_OP_w_MTLS_-MTLS_constrain" / "…w_PK_-MTLS_constrain" も一致。Red Hat、Ory、ZITADEL、Microsoft、Amazon、Google の行なし | 列単位の確認結果を §6 に記載 |
| [^4] | OIDF FAPI 2.0 ID2 & MS ID1 一覧 | #6, §2-2 | 支持 | 一覧は Authlete、Celcoin、Cloudentity、Curity、Duende、Filip Skokan（>= 8.5.0）、Luiky Vasconcelos、PayPal、Sirius、SYMCOR、Transmit Security、Zerobank の各行で、Red Hat/Keycloak、Ory、ZITADEL、Microsoft、Amazon、Google の行はない | なし |
| [^5] | OIDF FAPI1 Adv. 一覧 | #7 | 支持 | Red Hat / Keycloak 15.0.2 は 8 列すべて（08〜11-Oct-2021）、node oidc-provider 7.4.0 は 8 列すべて（11-Jun〜01-Jul-2021）。補記: 同一覧に「Okta / CIC – Highly Regulated Identity 1.0」（MTLS＋PAR 11-Sep-2023、Private Key＋PAR 12-Sep-2023）がある | #7 に Okta CIC の行を追記 |
| [^6] | openid.net/certification/fees | #2 | 部分支持 | 金額（OIDC 会員 700 / 非会員 3,500、FAPI 1・FAPI 2 会員 1,000 / 非会員 5,000、"per new deployment"）、OP と RP の別払い、"subject to change at any time" は一致。ずれ: 複数プロファイルを 1 回の支払いで認定できるのは "participants"（会員に限らない）。補記: OSS の料金免除（open source project certification policy）がある | #2 を修正・補記 |
| [^7] | cncf.io/projects/keycloak | #9 | 支持 | "Keycloak was accepted to CNCF on April 10, 2023 at the Incubating maturity level." | なし |
| [^8] | keycloak.org/server/features（26.8.0 が選択済み） | #10, #16, #18 | 部分支持 | supported・既定で有効に dpop:v1、par:v1、passkeys:v1、web-authn:v1、client-policies:v1、organization:v1、step-up-authentication:v1 があることは一致。ずれ: scim-api:v1 と token-exchange-standard:v2 も supported・既定で有効。stateless:v1 は "Disabled by default"（supported）で preview ではない。multi-site:v1 は "Deprecated features" であり「supported だが既定で無効」ではない。preview は token-exchange:v1、token-exchange-delegation:v1、spiffe:v1 ほか。preview の原文 "Preview features are disabled by default and are not recommended for use in production." は一致 | #10 を全面修正、#16・#18 を修正 |
| [^9] | keycloak.org/securing-apps/oidc-layers（26.8.0） | #11, §2-2 | 支持 | FAPI 1 Baseline / Advanced、FAPI CIBA、"FAPI 2.0 Security Profile (Final)"、"FAPI 2.0 Message Signing (Final)"。fapi-2-security-profile、fapi-2-dpop-security-profile、fapi-2-message-signing、fapi-2-dpop-message-signing。"Keycloak adapters do not have any specific support for the FAPI" | 脚注の版表記を「26.8.0 版の文書」に |
| [^10] | keycloak.org/2024/10/release-updates | #12, §2-8 | 支持 | "Keycloak server will have 4 minor releases every year, and a major release every 2-3 years"、"the currently default version for a Feature or an API can not change in a minor release"。書誌のずれ: 記事の題名は「Backwards compatibility in Keycloak releases」（2024-10-08、Stian Thorgersen） | 脚注の題名を訂正 |
| [^11] | GitHub keycloak/keycloak security policy | #13, §2-8 | 支持 | "acknowledge your report within 7 business days"、"fixed in the current major.minor release ... or for lower severity vulnerabilities or hardening in the following major.minor release"、Red Hat build of Keycloak の "long term support" の推奨。修正期限の記載なし | なし |
| [^12] | access.redhat.com（/node/7092877 → red_hat_build_of_keycloak_notes に転送） | #14, §2-5, §2-8 | 支持 | "at least two (2) major.minor release versions ... are supported at any time"、"a minimum of 2 years (for 26.x) or 3 years (for the following 27.x and onwards)"、"the previous major version goes into maintenance for at least six months"。日付一覧の表は取得したテキストに出ない（RS-15 の記載どおり） | URL を転送先に更新 |
| [^13] | keycloak.org/high-availability/multi-cluster-v2/introduction | #16, §2-3 | 部分支持 | "A commit latency of less than 5 ms is suggested, and below 10 ms is required."、"Are constrained to a single region or an equivalent low-latency setup."、計画停止の許容、利用者数・要求数の範囲。ずれ: 版選択は 26.8.0 が選択済みのリリース版文書で、「ページ表示 Nightly 26.8.0」は誤読。preview の表記はない | 版表記を訂正、#16 に 26.8.0 での状態を追記 |
| [^14] | keycloak.org/2026/07/multi-cluster-v2-and-stateless-mode | #16, §2-3 | 支持 | 2026-07-17、Alexander Schwartz。"Starting with Keycloak 26.7, the stateless feature is available as a preview."、"Single-region only"、"Minor and major upgrades require shutting down all sites except one"、"Approximately 8-10 milliseconds of additional latency"、"roughly a factor of two"。補記: 26.8.0 の機能一覧では stateless:v1 は supported（既定で無効）に移っている（[^8]） | 脚注に日付と著者を補記、#16 に状態の変化を追記 |
| [^15] | keycloak.org/high-availability/multi-cluster/introduction | #15 | 部分支持 | "Two OpenShift single-AZ clusters, in the same AWS Region"、"constrained to a single AWS Region or an equivalent low-latency setup"、"downtime of up to 5 minutes"、v1 は deprecated。ずれ: 版表記（Nightly ではなく 26.8.0 のリリース版文書） | 版表記を訂正 |
| [^16] | keycloak.org/server/importExport（26.8.0） | #17 | 支持 | "Exported data does not include user and admin events, persisted sessions, workflow state or revoked tokens."、全ノード停止の推奨、Admin Console の export は "masked with * symbols"、"Only CLI exports are suitable for backups or data transfer between servers." | 脚注の版表記を「26.8.0 版の文書」に |
| [^17] | GitHub keycloak/keycloak releases | #9, §2-1, §4 | 支持 | gh api: latest 26.8.0（2026-10-01T05:57:20Z）、license Apache-2.0 | なし |
| [^18] | ory.com/pricing | #19, #20, #21, #22, §2-5, §2-7, §2-9 | 支持 | Production $770/year・月 $21 枠・aDAU $0.14・M2M $0.007・check $0.000090、Growth $9,350/year・$255・$0.12・$0.006・$0.000085、Enterprise は "Talk to us"。aDAU の定義、Enterprise の "Multi-region deployments with data residency"・"Multi-tenancy"・"99.99% uptime SLA"、比較表の SLA（Production・Growth は No）と Multi-Region Failover（Enterprise のみ Yes）、FAQ の "merged and released within 48 hours after disclosure"。補記: 比較表で SCIM と Directory Sync は Enterprise のみ | §2-9・#21・#26 で SCIM の根拠として追加引用 |
| [^19] | ory.com/docs/security-compliance/security（旧 URL から転送） | #22, §2-8 | 支持 | Apache 2.0 利用者 "No security Service Level Agreement (SLA) is provided."・"Security patches are only provided for the current release version."、OEL と Ory Network の Critical 14 / High 30 / Medium 90 / Low 180 日、"Ory Network always runs the most current version." | URL を転送先に更新 |
| [^20] | ory.com/docs/oel/getting-started（旧 URL /docs/self-hosted/oel から転送） | #21, #26, §2-9 | 部分支持 | OEL の定義（"optimized builds of the same open source ... with enterprise features, guaranteed support, and timely security patching"）、"Community-only updates can lag and are not tested at the same scale."、CockroachDB による multi-region、zero-downtime migration は一致。"not available in the open source builds" として挙がるのは Kratos の B2B organization・multi-tenancy と Hydra の ROPC grant。ずれ: SCIM は OEL 限定機能として挙がっていない | #21・#26・§2-9・§6 を修正、URL と題名を更新 |
| [^21] | Ory Export identities | #23, §2-4 | 支持 | "export identities including their hashed credentials using the include_credential attribute" | なし |
| [^22] | Ory Import identities | #23 | 支持 | BCrypt、Argon2、MD5、SHA、SSHA・SSHA256・SSHA512、PBKDF2、SCrypt、Firebase SCrypt、crypt(3)、HMAC。passkey は "credential ID, public key, and authenticator metadata" で import。RP ID が変わると passkey は使えない旨の注意もある | なし |
| [^23] | Ory Personal data location and homing | #24 | 支持 | "This choice sets the project's home_region and is permanent for that project."、identity ごとの region 変更、"For enterprise customers, Ory offers the "Global" and "US Continental""、運用データの全世界複製 | なし |
| [^24] | GitHub ory/hydra releases（ory/kratos も） | #25, §2-1, §4 | 支持 | gh api: hydra v26.2.0（2026-03-20T13:23Z）、kratos v26.2.0（2026-03-20T14:10Z）、いずれも Apache-2.0 | なし |
| [^25] | zitadel.com/pricing | #27, §2-5, §2-7 | 支持 | FREE US$0・100 DAU、PRO US$100・"25'000 Daily Active Users per month included"・"99.5% uptime guarantee" と "99.95% uptime guarantee" の併記、ENTERPRISE は Custom・Unlimited DAU・"99.99% uptime guarantee"・Commercial license・Cloud or own infrastructure、Data Residency: EU, US, Switzerland, Australia。補記: 詳細料金表 /pricing/detail に SLA と計算機の記載がある（新規脚注 [^75]） | #27・§2-7・#74 に [^75] を追記 |
| [^26] | zitadel.com/blog/zitadel-v3-announcement | #28, §2-9 | 支持 | dateTime 2025-03-13。"transitioning from Apache 2.0 to ... AGPL-3.0"、Examples・Libraries・SDKs・APIs は既存ライセンス維持、major 3 か月ごと・minor 2 週間ごと・patch 随時 | なし |
| [^27] | GitHub zitadel/zitadel | #28, §2-1, §4 | 支持 | README "OpenID Connect certified"、AGPL-3.0（特定ディレクトリに Apache 2.0・MIT の例外）。gh api: v4.19.4（2026-10-01T13:03Z） | なし |
| [^28] | GitHub zitadel security policy | #29 | 支持 | 報告窓口 zitadel.com/vulnerability。サポート対象版と期限の記載なし | なし |
| [^29] | help.zitadel.com release cycle | #29 | 支持 | "Only features in General Availability will be covered by support services."、2 週間ごとのデプロイ、"a minimum notice period of five working days" | なし |
| [^30] | goauthentik.io/pricing | #30, #74 | 支持 | "$5 / user / month"、"$0.02 / external user* / month"、"Billed annually. No cost for service accounts."、external user の定義、Enterprise Plus "Starting at $20k annually"・multi-instance・FIPS | なし |
| [^31] | GitHub goauthentik LICENSE | #31, §2-9 | 支持 | website/ は CC BY-SA 4.0、authentik/enterprise/ は別ライセンス、それ以外は MIT（client-side JS は MIT Expat） | なし |
| [^32] | GitHub goauthentik SECURITY.md | #31 | 支持 | Supported: 2026.5.x、2026.8.x。GitHub が CNA。"we do not currently offer monetary bounties" | なし |
| [^33] | GitHub panva/node-oidc-provider | #32 | 支持 | RFC8705・RFC9101・RFC9126・RFC9396・RFC9449、JARM、FAPI 1.0 / 2.0、MIT。gh api: v9.12.2（2026-09-05T12:41Z） | なし |
| [^34] | GitHub node-oidc-provider security policy | #32, §2-8 | 支持 | v9.x のみ。"End-of-life for the current release will be determined prior to the release of its successor." | なし |
| [^35] | Learn External ID pricing（ms.date 2026-06-22） | #34 | 支持 | MAU の定義と workforce・external の合算、"Admins (users with directory roles)"、add-on 表（M2M・SMS は Transaction-based、Go-Local は MAU-based・"Currently available only in Australia and Japan"） | なし |
| [^36] | Azure Retail Prices API（エンコード済み URL で照会） | #35, #75, §2-6 | 支持 | Basic MAU 0（0〜50,000）/ 0.03（50,000 超、2025-07-01）、Core MAU 0.01625（2025-05-01）、Go-Local 0.02（2025-09-01）、M2M Authentication Token 0.001（2025-11-01）、Phone 0.03 / 0.07 / 0.15 / 0.35（2024-11-01）。記載 URL は未エンコードで HTTP 400 | URL をエンコード済みに修正 |
| [^37] | Learn Entra data residency（ms.date 2025-11-06） | #36, §2-3 | 支持 | "Tenant location can't be changed after it's set."、geo-location 一覧、"(1) Available for external tenants with the Go-Local add-on."、US government・China は external テナント不可 | なし |
| [^38] | Microsoft Online Services SLA（2026 年 10 月版 docx、文書日付 2026-10-01） | #37, §2-7 | 部分支持 | 「Microsoft Entra ID Basic and Microsoft Entra ID Premium」の項: < 99.99% 10%、< 99.9% 25%、< 99% 50%、< 95% 100%。Downtime は user-minutes。External ID の項は本文になし（Azure AD B2C の項はある）。ずれ: §2-7 は救済を「返金」と書いていたが、原典はサービスクレジット | §2-7 を「サービスクレジット」に修正、§4 の公表日を 2026-10-01 に |
| [^39] | Learn SLA performance for Entra ID（ms.date 2026-01-06） | #38 | 部分支持 | 表（2021-02〜2026-08）、2021-03 99.568%、2025-04 の計算変更、5,000 MAU 以上のテナント単位の値は一致。ずれ: 成功 user-minute は "issued a token or an error response"（エラー応答も成功に数える）。値は小数第 3 位で切り捨て | #38 の測定条件を補正 |
| [^40] | Learn migrate users to External ID（ms.date 2026-03-16） | #39 | 支持 | 平文 password がなければ乱数 password を設定、JIT（OnPasswordSubmit）と legacy IdP-initiated の 2 方式。hash の import 手順の記載なし | なし |
| [^41] | MSRC blog 2024-06-27 | #40 | 支持 | 引用文は原文と一致 | なし |
| [^42] | auth0.com/pricing | #41, §2-5 | 支持 | Free "Up to 25,000 monthly active users"、Essentials・Professional "Up to 500 monthly active users"、Enterprise "Top-tier SLAs"、FAQ "over 99.99% monthly uptime figures for most regions"。補記: Enterprise 欄と比較表に "99.99% SLA" がある | #41 に補記 |
| [^43] | Okta Auth0 Platform SLA PDF（Rev 4.5.2、フッタ "02-01-22"） | #42, §2-7 | 支持 | 99.99%、除外 (a)〜(d)、Failed API Calls の除外（custom database、third-party IdPs、Rules・Hooks・Actions）、クレジット 5 / 10 / 20 / 50%、上限 50%、本番のみ、5 営業日以内の書面請求。未使用クレジットは契約終了時に支払う | §2-7 の記述を原典に合わせた |
| [^44] | auth0.com/docs/troubleshoot/customer-support/services-level-descriptions（旧 URL から転送） | #42 | 支持 | 99.99%、98.50〜99.98% 5%、97.00〜98.49% 10%、< 97.00% 20%。書誌のずれ: ページ題名は「Service Level Agreements」 | 題名と URL を更新 |
| [^45] | Auth0 Create Tenants | #43 | 支持 | 地域・locality 表（AU、CA、EU / EU-2、JP、UK、US / US-3〜US-5）、"control the assigned tenant domain and the region where your data will be hosted" | なし |
| [^46] | Auth0 Export Data | #44, §2-4 | 支持 | "The only information which is not available through the API ... are the password hashes of your Auth0-hosted database users and private keys."、"not available for our Free subscription tier" | なし |
| [^47] | Auth0 Export Password Hashes and MFA Secrets | #44, §2-4 | 支持 | テナント名と PGP 公開鍵（RSA 4096-bit の暗号用 subkey）、ETA の原文、リンクは "Expires after 3 days"。補記: "Not all requests qualify for an export."（適格性審査）、承認後の書面承認・他管理者の確認・CISO / CSO / VP 以上の署名 | #44・§2-4・#60 に補記 |
| [^48] | Auth0 Configure FAPI Compliance | #45 | 支持 | Enterprise Plan と Highly Regulated Identity add-on、compliance_level の 4 値（fapi1_adv_mtls_par、fapi1_adv_pkj_par、fapi2_sp_pkj_mtls、fapi2_sp_mtls_mtls）。DPoP・Message Signing の値はない | なし |
| [^49] | Auth0 passkey policy | #46 | 支持 | "When you customize the RP ID ... all passkeys for other domains will be unusable, and your end users must re-enroll."、"If the domain name changes, any passkeys associated with the old domain become invalid."、custom domain の事前設定の推奨 | なし |
| [^50] | okta.com/legal/vulnerability-reporting-policy（旧 URL から転送） | #47 | 支持 | psirt@okta.com、"Respond in a timely manner, acknowledging receipt"、"Provide an estimated time frame"、引用文は原文と一致 | URL を転送先に更新 |
| [^51] | aws.amazon.com/cognito/pricing | #48, #49, #73, #75, §2-6 | 支持 | 無料枠の注記 1〜3、Lite の計算例（$0.0055 / $0.0046）、Essentials $0.015、Plus $0.020、federation $0.015（50 MAU 超）、M2M "per successful token response"、例 1 $0.00225、例 2・3 $0.002925、2,500 app client、MRR $0.0045（500,000 MAU で $2,250）。MRR の add-on は Essentials・Plus の列だけ | なし |
| [^52] | aws.amazon.com/cognito/sla（Last Updated 2022-05-04） | #50, §2-7 | 支持 | "commercially reasonable efforts ... for each AWS region ... at least 99.9%"、10 / 25 / 100%。"Service Credits will not entitle you to any refund" | §2-7 に返金でない旨の根拠として追加引用 |
| [^53] | Cognito Multi-Region replication | #51, §2-3 | 支持 | 主が "authoritative source"、副は "can't create users"、"at most one secondary replica"、password reset・プロファイル変更不可、TOTP 不可、ロックアウト回数は非同期、Essentials または Plus、multi-Region CMK、旧基盤では不可。補記: federate 利用者は主に一度サインインしたことがある場合だけ副にサインインできる | #51 に補記 |
| [^54] | Cognito CSV import | #52 | 支持 | RESET_REQUIRED、bcrypt cost 最大 12、scrypt N 65536・r 8・p 1、Argon2id m 19456・t 2・p 1、PBKDF2_SHA256 600000、上限超過は失敗、初回サインインで native に移行（SRP は移行後）、500,000 行、"Only one import job can be active at a time per account." | なし |
| [^55] | Guidance for User Profiles Export with Amazon Cognito | #53 | 支持 | "it does not export sensitive information, such as user passwords; that user pools with multi-factor authentication (MFA) enabled are not supported" | なし |
| [^56] | WebAuthnConfigurationType | #54 | 支持 | Essentials 以上、custom domain・managed login / classic hosted UI の条件で "the passkey relying party ID must be the fully-qualified domain name of your custom domain" | なし |
| [^57] | aws.amazon.com/agreement（Last Updated 2026-08-14） | #55, #68 | 支持 | §1.5 の 12 か月前通知と例外 3 つ、§5.3(b) の 30 日。補記: §1.6（SLA の不利な変更は 90 日前通知）、§3.1（値上げは 30 日前通知）。乗換え・移行期間の条項は本文にない | §4 の版・日付を更新、#55・#68・§5.1 に補記 |
| [^58] | cloud.google.com/identity-platform/pricing | #56, #73 | 支持 | Tier 1 の段階単価（0〜50,000 無料、0.0055、0.0046、0.0032、0.0025）、Tier 2 の 50 MAU 無料・$0.015、"The first ten SMS that you send per day are not billed."、JP $0.03・US $0.01・GB $0.04・DE $0.10 | なし |
| [^59] | cloud.google.com/identity-platform/sla | #56, §2-7 | 支持 | SLO 99.95%、99.00〜< 99.95% 10%、95.00〜< 99.00% 25%、< 95.00% 50%、Financial Credit の上限 50% | §2-7 のクレジット上限の例に追加引用 |
| [^60] | firebase.google.com/docs/cli/auth | #57, §2-4 | 部分支持 | passwordHash・salt の欄、hash パラメータは console から取得、SCRYPT が既定、auth:import の hash-algo 一覧は一致。ずれ: (a) §2-4 の「Firebase CLI も hash と hash パラメータを出力する」は誤りで、パラメータは CLI ではなく console から得る。(b) 原典の Note "the auth:export command only exports passwords hashed using the scrypt algorithm ... other algorithms are exported with empty passwordHash and salt fields" が抜けていた | §2-4・#57・#60(b) を修正 |
| [^61] | pages.nist.gov/800-63-4/sp800-63b.html、CSRC 書誌ページ | #58, §4 | 支持 | §3.1.1.2 Password Verifiers: "Verifiers SHALL store passwords in a form that is resistant to offline attacks. Passwords SHALL be salted and hashed ..."、"The chosen cost factor SHOULD be as high as practical ... It SHOULD be increased over time ..."。CSRC: "07/31/25: SP 800-63B-4 (Final)" | なし |
| [^62] | w3.org/TR/webauthn-3/（WebFetch・Tavily）、REC-webauthn-3-20260825、publication history | #59, §2-4, §4 | 支持 | 状態は "W3C Recommendation, 25 August 2026"（history: 2026-08-25 Recommendation、2026-05-26 と 2026-01-13 は CR Snapshot）。§5.5 rpId: "The client MUST verify that the Relying Party's origin matches the scope of this RP ID. The authenticator MUST verify that this RP ID exactly equals the rpId of the credential to be used for the authentication ceremony."。§1: "credentials created by a Relying Party can only be used in operations requested by the same RP ID"。注: Tavily の /TR/webauthn-3/ のキャッシュは古い CR Snapshot の文面を返したため、状態は日付付き URL と history で確定した | 脚注に This version の URL と参照節（§5.5）を補記 |
| [^63] | authzed.com/pricing | #61, #74 | 支持 | Cloud "$2/hr"、Self-Hosted "Annual license per-region and per-vCPU"、Dedicated Cloud "reserved-vCPU capacity"・"Multi-region deployments"。サポート表: Standard はメール・P3 1 営業日、Premium は Slack・P1 / P2 12 時間、Enterprise は P1 1 時間（Premium にも専任チームあり） | なし |
| [^64] | docs.fga.dev/subscription-plans | #62, #63 | 支持 | Enterprise: Check & BatchCheck 500 rps、Read 100、Write 150、ListObjects 20、tuple 1,000 万（追加購入可）、US・Europe・Australia。Private Cloud: US、Australia、Germany、Ireland、UK、France、Japan、India、Singapore、Brazil の 10。Free trial は "It does not have an SLA" | なし |
| [^65] | Data Act（OJ L 2023/2854、出版局 cellar で取得） | #64, §2-10 | 支持 | 第 25 条(1)(2)(a)(d)(e)(f)(g)(h)(4) を逐語照合。(a) "not after the mandatory maximum transitional period of 30 calendar days"、(d) "shall not exceed two months"、(g) "at least 30 calendar days"、(4) "within 14 working days ... shall not exceed seven months"。規範強度（shall）は原文どおり | なし |
| [^66] | 同上 | #65, §2-10 | 支持 | 第 29 条(1) "From 12 January 2027, providers ... shall not impose any switching charges"、(2)(3) の減額費用、第 50 条 "It shall apply from 12 September 2025." | なし |
| [^67] | 同上 | #66, §2-10 | 支持 | 第 2 条(8)・(38)、前文 (80)（software, ... applications and services）。版 0.1 で「番号未特定」だった前文は (82) と特定した: "The exportable data should exclude ... data related to the integrity and security of the service, the export of which will expose the providers of data processing services to cybersecurity vulnerabilities. Those exemptions should not impede or delay the switching process." | 脚注・#66・§2-10・#68(b)・§6 に前文番号と should not を追記 |
| [^68] | 同上 | #65 | 支持 | 第 31 条(1)（第 23 条(d)、第 29 条、第 30 条(1)(3) の不適用）、(2)（非本番版） | なし |
| [^69] | DORA（OJ L 333, 27.12.2022、出版局 cellar で取得） | #67, §2-10 | 支持 | 第 28 条(8) の 4 つの shall（出口戦略の整備、(a)〜(c) なしの退出、"comprehensive, documented and ... sufficiently tested and reviewed periodically"、移行計画）を逐語照合 | なし |
| [^70] | 同上 | #67, §2-11 | 部分支持 | #67 の第 30 条(3)(f)（"exit strategies, in particular the establishment of a mandatory adequate transition period"）、前文 (74)、第 64 条（"It shall apply from 17 January 2025."）は支持。ずれ: §2-11 が Google SRE 本の目安の根拠として [^70] を引いていた（正しくは [^72]） | §2-11 の脚注と項目番号を訂正 |
| [^71] | GAO-20-195G PDF（Tavily で取得）、製品ページ（WebFetch） | #69, §2-12 | 支持 | 表紙 "March 2020"、製品ページ "Published: Mar 12, 2020"。4 特性と各特性の説明、p.35 の手順 5〜8（"7. Develop the point estimate ... compare the overall point estimate to an independent estimate."、"8. Conduct sensitivity testing: examine the effect of changing one assumption or cost driver at a time."）、点推定の原文、"sensitivity analysis tries to isolate the effects of changing one variable at a time, while risk and uncertainty analysis examines the effects of many variables changing all at once" | なし |
| [^72] | sre.google/sre-book/being-on-call | #70, §2-11 | 支持 | "the minimum number of engineers needed for on-call duty from a single-site team is eight"、"For dual-site teams, a reasonable minimum size of each team is six"、"no more than 25% can be spent on-call"、"takes 6 hours"、"2 per 12-hour on-call shift"（primary と secondary の 2 名体制が前提） | §2-11 の引用先を [^72] に |
| [^73] | aws.amazon.com/verified-permissions/pricing | #63 | 支持 | Single Authorization Request "$0.000005 per API request"（RS-07#47 と一致） | なし |
| [^74] | keycloak.org/high-availability/introduction | #15 | 部分支持 | "Multi-cluster v1 (the multi-site feature) is deprecated ... Use Multi-cluster deployments (v2) instead."、v2 の DB 負荷約 2 倍の記載。ずれ: 版表記（Nightly ではなく 26.8.0 のリリース版文書） | 版表記を訂正 |

新規脚注（版 0.2 で追加）:

| 脚注 | 原典 | 主張 | 内容 |
|---|---|---|---|
| [^75] | zitadel.com/pricing/detail | #27, #74, §2-7 | 比較表の Availability SLA: PRO "99.5% (add-on)"、Enterprise Cloud "up-to 99.99%"。Zitadel Cloud Pro Calculator の DAU 行は Unit Price $50（1 単位の DAU 数の表示なし）。[^25] の補足として追加した |

## 4. RS-15 に加えた修正（版 0.1 → 0.2）

| # | 箇所 | 修正内容 | 理由（脚注） |
|---|---|---|---|
| 1 | 冒頭メタ情報・注記 2 | 版を 0.2 にした。「作成者以外の検証は未実施」を、AI による独立照合の実施と本記録の所在に改めた | — |
| 2 | §2-4 | Firebase CLI は scrypt の hash と salt を出力し、パラメータは console から得ること、scrypt 以外は空欄で出力されることに直した。Auth0 の export に適格性審査があることを加えた | [^60], [^47] |
| 3 | §2-7 | Entra の「返金」を「サービスクレジット」に直した。救済は原則クレジットで、AWS は返金しないと明記し、Auth0 は契約終了時に未使用分を支払うことを分けて書いた。クレジット上限の例に Google を加え、ZITADEL の詳細料金表の「up-to 99.99%」を併記した | [^38], [^52], [^43], [^59], [^75] |
| 4 | §2-9, #21, #26(a) | Ory の OEL 限定機能から SCIM を外し、原典の列挙（B2B organization・マルチテナント・ROPC）と OEL の利点（CockroachDB の multi-region、無停止 migration）を分けて書いた。SCIM は Ory Network で Enterprise 限定、self-host は未確認とした | [^20], [^18] |
| 5 | §2-10, #66, #68(b) | Data Act の前文を (82) と特定し、強度（should）と「除外は乗換えを妨げるべきでない（should not）」を追記した | [^67] |
| 6 | §2-11 | 引用先を [^70]（DORA）から [^72]（SRE 本）に、項目番号を RS-15#70, #71 に直した | [^70], [^72] |
| 7 | #2 | 1 回の支払いで複数プロファイルを認定できるのは "participants"（会員に限らない）と直し、FAPI の同様の扱いと OSS の料金免除を加えた | [^6] |
| 8 | #3, §6 | Auth0 の範囲を 2016-05〜2018-08 に直し、Matias Woloski / Auth0 行と、行ごとのプロファイル内訳（列単位の解析結果）を加えた。§6 の「列を確定できなかった」を解消した | [^2], [^3] |
| 9 | #7 | FAPI1 Advanced 一覧の Okta / CIC – Highly Regulated Identity 1.0（PAR 付きの 2 列）を加えた | [^5] |
| 10 | #10 | Keycloak 26.8.0 の機能区分を原典どおりに直した（scim-api:v1・token-exchange-standard:v2 は supported・既定で有効、stateless:v1 は supported・既定で無効、multi-site:v1 は deprecated、preview は token-exchange:v1・token-exchange-delegation:v1・spiffe:v1） | [^8] |
| 11 | #15, §4, §6, 脚注 | Keycloak 文書の版表記「Nightly 26.8.0」を「26.8.0 版の文書」に直した。§4 に Keycloak 文書の行を加え、§6 の Nightly に関する未確認事項を、stateless の状態変化の記述に置き換えた | [^13], [^15], [^74], [^8], [^9], [^16] |
| 12 | #16 | 2026-07-17 の告知は 26.7 時点の preview であり、26.8.0 では stateless:v1 が supported（既定で無効）に分類されていることを加えた。「DB だけで結ぶ」の根拠に [^14] を加えた | [^14], [^8], [^13] |
| 13 | #18 | 「SCIM と token exchange の新方式は preview であり、本番の前提にはしない」を削除し、26.8.0 の区分に基づく推論に書き直した（preview は旧方式 token exchange と SPIFFE、SCIM API と stateless は PoC で確認してから前提にする） | [^8] |
| 14 | #27, #74 | ZITADEL の詳細料金表（SLA の表示と計算機の単価）を新規脚注 [^75] で加え、「超過単価は非公開」を「1 単位の DAU 数が不明」に直した | [^25], [^75] |
| 15 | #38 | 成功 user-minute に「エラー応答」を含むこと、値が切り捨てであることを加えた | [^39] |
| 16 | #41 | Enterprise 欄と比較表の「99.99% SLA」を加えた | [^42] |
| 17 | #42 | Auth0 Docs のページ名を「Service Level Agreements」に直した | [^44] |
| 18 | #44 | 適格性審査（すべての依頼が対象になるわけではない）と、承認後の書類（書面承認、他管理者の確認、CISO・CSO・VP 以上の署名）を加えた | [^47] |
| 19 | #51 | federate 利用者は主 user pool にサインイン済みの場合だけ副にサインインできることを加えた | [^53] |
| 20 | #55, §4, §5.1 | AWS Customer Agreement の版（Last Updated 2026-08-14）、§5.2(b) の例外、§1.6（SLA の不利な変更 90 日前）と §3.1（値上げ 30 日前）を加えた。§5.1 の 11_contracts 行の通知期間を更新した | [^57] |
| 21 | #57, #60(b) | Firebase の export が scrypt の hash に限られ、他方式は空欄になることを加えた | [^60] |
| 22 | #68(c), §6 | 「AWS の取得期間は 30 日」「Cognito は hash を出せない」を、「Customer Agreement の取得期間は契約終了後 30 日だけで移行期間の定めがない」「Cognito は hash の export 手段を確認できない」に直した。ベンダーの Data Act 向け別条項の有無は未確認と §6 に加えた | [^57], [^53] |
| 23 | §4 | Data Act の OJ 掲載日（2023-12-22、採択 2023-12-13）、Microsoft SLA の文書日付（2026-10-01）、Red Hat の URL（転送先）を更新した | [^65], [^38], [^12] |
| 24 | §6 | Ory（self-host の SCIM は未確認）、ZITADEL（PRO の SLA 表示と単価）、法令（前文 (82) を特定）、照合（独立照合の実施）の各項を更新した | 上記 |
| 25 | 参考文献 | [^10] の題名、[^14] の日付と著者、[^20] と [^44] の題名を訂正した。[^12]・[^19]・[^20]・[^44]・[^50] の URL を転送先に、[^36] の URL をエンコード済みに更新した。[^2]・[^5]・[^6]・[^18]・[^39]・[^42]・[^47]・[^53]・[^57]・[^60]・[^62]・[^67] の参照箇所を補記した。[^8]・[^9]・[^13]・[^15]・[^16]・[^74] の版表記を「26.8.0 版の文書」に統一した。新規脚注 [^75] を追加した | 上記 |

## 5. 検証不能・二次情報の扱い

- **検証不能の脚注**: 0 件。全 74 脚注の原典を取得し、該当箇所を確認できた。取得経路を変えたもの（W3C、EUR-Lex、GAO、Azure Retail Prices API、Microsoft SLA）は §1 に記した。
- **取得経路の信頼性に関する注記**: [^62] の状態は、WebFetch（小型モデルによる要約）と Tavily Extract（原文抽出）の 2 経路で確認した。Tavily の /TR/webauthn-3/ は古い CR Snapshot の文面を返したが、日付付き URL（REC-webauthn-3-20260825）の原文と publication history の表がいずれも Recommendation（2026-08-25）を示したため、状態は確定とした。[^71] の公表日（2020-03-12）は WebFetch の要約で確認した値であり、PDF の表紙（March 2020）とは整合している。
- **二次情報だけを根拠にした主張**: 本文の結論に使われているものは見つからなかった。§6 の「要員の公開事例」は、二次情報を根拠に使わず「未確認」としており、妥当である。
- **一次性の注記（判定は変えていない）**: [^10]・[^14]（Keycloak 公式ブログ）、[^26]（ZITADEL 公式ブログ）、[^41]（MSRC ブログ）は当事者自身の発表であり、CONVENTIONS §3 が禁じる「ブログ転載」には当たらないと判断した。[^18] と [^42] の FAQ は各社の公式料金ページ上の記述であり、RS-15 は Auth0 の稼働率の記述を「契約上の約束ではない」と区別している。[^72]（Google SRE 本）は Google の社内実践の記述であり、RS-15 §6 は規範でも本件規模の実測でもないと既に明記している。

## 6. 試算（§3.15）の再計算

- MAU（基準 576,500・低 428,000・高 723,500）、federate（341,250）、直接認証（235,250）は、A-002・A-004・A-082 の値から再計算して一致した。
- RS-15#73 の表の月額 15 セル（Google、Cognito Lite、Cognito Essentials、Entra、Entra＋Go-Local の各 3 列）は、単価（[^36]・[^51]・[^58]）から再計算して ±1 ドル以内で一致した。年額は Cognito Lite（再計算 74,822 に対し 74,820）と Entra＋Go-Local（月額を丸めてから 12 倍）で 2〜6 ドルの丸め差があるが、桁と結論に影響しない。
- RS-15#63（Check 2.72×10¹⁰ 件 / 月、Ory 約 245 万ドル、AVP 約 13.6 万ドル）、RS-15#74（Ory Growth 34,905 ドル、authentik 19,400 / 150,000 ドル）、RS-15#75（M2M 6,558 万件、Cognito 14.8 万・Entra 6.6 万・Ory 45.9 万ドル、token exchange 288 万ドル）、RS-15#76（要員費 2.4 億〜4.8 億円）も再計算して一致した。
- 試算は未登録の仮定（為替、要員単価、aDAU＝DAU、M2M ピークの月間継続）に依存する。この点は RS-15 §6 に既に記載されており、妥当である。

## 7. 検証の限界

- 照合は 2026-10-03 時点で各ページが表示した内容に対して行った。料金ページ、SLA、Keycloak 文書、OIDF の認定一覧は随時更新され、後日の改訂で記述が変わり得る。
- Keycloak の機能区分は 26.8.0 版の文書で確認した。stateless や SCIM API が supported に移った時期と経緯（リリースノート）は確認していない。
- OIDF の認定一覧は表の HTML を列単位で解析した。各試験計画の内容（plan-detail と添付の試験ログ）は開いていない。
- Data Act と DORA は出版局の cellar から取得した OJ 掲載版の XHTML で照合した。EUR-Lex の表示ページそのものは WAF のため取得できなかったが、同じ CELEX 番号の同じ OJ 文書である。
- 検証者は AI エージェントであり、規範文の解釈、法令の適用判断、[D] で書かれた推論の妥当性については、人間のレビュア（法務を含む）による確認が別途必要である。
