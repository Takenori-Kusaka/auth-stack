# 種資料02: CTO／プリンシパルアーキテクト観点の研究課題設計（計画段階 Plan agent 出力）

> 位置付け: 2026-10-03 の計画段階で、CTO・20年持続性のレンズを与えた計画エージェントが作成した研究課題設計。標準ステータスはWeb調査に基づくが一部二次情報を含む。Phase 2 で一次資料により再検証し `research/standards-status.md` に確定版を置く。本書を直接の根拠として引用してはならない。

凡例: 【確】RFC/OpenID Final/W3C Rec/FIPS等の確定版、【草】Internet-Draft/NIST ipd、【要】未確認。

## ADR一覧（研究課題が供給する設計判断）
| ID | 決める内容 |
|---|---|
| A01 | managed IdPか自営ASか（build/buy） |
| A02 | 主体種別×操作リスク階層ごとのIAL/AAL/FAL |
| A03 | アカウント回復と認証器ライフサイクル |
| A04 | B2B federation、account linking、domain検証、SCIM |
| A05 | token profile |
| A06 | 失効と継続評価 |
| A07 | 鍵階層とKMS/HSM |
| A08 | 管理面とCI/CDの保護 |
| A09 | workload identityと委任の伝搬 |
| A10 | 認可エンジンとストア、整合性モデル |
| A11 | policy言語とPEP–PDP間API |
| A12 | PEP coverageとストレージ側防御 |
| A13 | cell分割とfail-mode |
| A14 | 監査データ |
| A15 | crypto agilityとPQC移行 |
| A16 | versioningとdeprecation方針 |
| A17 | 非人間ID、AIエージェント |
| A18 | 出口戦略 |
| A19 | 侵害時runbook |

## 1. 認証ライフサイクル
| # | 答えるべき問い | 一次資料（ステータス） | ADR | 机上/PoC |
|---|---|---|---|---|
| 1-1 | 主体×操作階層ごとのIAL/AAL/FAL。同期passkey受入範囲（63B-4ではAAL2まで、AAL3は鍵非エクスポート認証器） | NIST SP 800-63-4/63A-4/63B-4/63C-4【確】2025-07最終版、デジタル庁DS-511【要:版】 | A02 | 表は机上、passkey登録率・回復発生率はPoC |
| 1-2 | passkeyのRP ID設計、related origin requests、attestation、hybrid。IdP乗換後もRP IDを自社ドメインで保持できるか | W3C WebAuthn Level 3【確】2026-08-25 Rec、FIDO passkey guidance【要】 | A02,A03,A18 | 方針机上、互換性PoC |
| 1-3 | 回復手順（回復要素、helpdesk本人確認、回復後の待機・通知・権限制限、管理者回復の二者承認） | 63B-4 Account Recovery【確】、CISA AA23-320A（Scattered Spider）【確】 | A03 | 机上＋SE red team |
| 1-4 | 不変識別子とaccount linking（iss+sub、Entraはtid+oid）、email再利用、自動linking条件 | OIDC Core 1.0（ISO/IEC 26131:2024）【確】、Microsoft claims検証、Semperis nOAuth再調査(2025) | A04 | 机上＋nOAuth再現試験 |
| 1-5 | B2BマルチIdP（home realm discovery、SAML/OIDC併存、IdP鍵更新、顧客IdP停止・侵害時の切離し、OpenID Federation採否） | 63C-4 FAL1〜3【確】、SAML 2.0、OpenID Federation 1.0【確】2026-02 Final、IPSIE WG【要】 | A04 | 2テナント×2IdP PoC |
| 1-6 | IdP mix-up / assertion injection（RP起点必須、IdP起点SAML禁止、テナント別redirect URI、iss/aud/InResponseTo検証） | RFC 9700 §4.4【確】、RFC 9207【確】、63C-4、MCP 2026-07-28【確】 | A04,A05 | 机上＋conformance・負例試験 |
| 1-7 | SCIMとJIT衝突解決、deprovision SLO、DNS TXT domain検証と失効時再検証 | RFC 7643/7644【確】、SCIM agent草案【草】、RISC 1.0【確】 | A04 | SCIM遅延・競合PoC |
| 1-8 | step-upとセッション（acr/amr/auth_time、再認証間隔） | RFC 9470【確】、63B-4 | A02,A05 | 机上 |

## 2. OAuth/OIDC token profile
| # | 問い | 一次資料 | ADR | 机上/PoC |
|---|---|---|---|---|
| 2-1 | RFC 9700 MUST/SHOULD採否表、逸脱理由 | RFC 9700（BCP 240, 2025-01）【確】、OAuth 2.1 draft【草】、RFC 10017 Browser-Based Apps【確:要再検証】 | A05 | 机上 |
| 2-2 | FAPI 2.0必須範囲、DPoP vs mTLS、DPoP nonce運用 | FAPI 2.0 Security Profile/Attacker Model【確】、Message Signing【確:要再検証】、RFC 9126/9449/8705【確】、OIDF conformance | A05 | 範囲机上、conformance・性能PoC |
| 2-3 | opaque/JWT境界、introspection負荷 vs 即時失効 | RFC 9068/7662/9701【確】 | A05,A06 | PoC |
| 2-4 | JWT検証規則（typ分離、alg allowlist、JWE/JWS取違え、展開サイズ上限） | RFC 8725【確】、8725bis【草】 | A05,A07 | 机上＋fuzz |
| 2-5 | 委任（actチェーン上限、may_act、resource indicator、RAR） | RFC 8693/8707/9396【確】 | A09 | 机上＋PoC |
| 2-6 | 失効と継続評価（剥奪・テナント停止・セッション失効ごとの反映SLO、SSF受信義務範囲） | RFC 7009【確】、SSF 1.0/CAEP 1.0/RISC 1.0【確:要再検証】、Token Status List【草】 | A06 | PoC |
| 2-7 | refresh token rotation vs sender constraint、第三者grantの寿命と棚卸し（Drift教訓） | RFC 9700 §4.14 | A05 | 机上 |

## 3. root of trustと鍵管理
| # | 問い | 一次資料 | ADR | 机上/PoC |
|---|---|---|---|---|
| 3-1 | 鍵階層（offline root→issuer署名鍵、用途別分離、issuer共通/テナント別） | SP 800-57 Pt1 Rev5【確】、Rev6 ipd【草】、SP 800-130/152【確】、FIPS 140-3 | A07 | 机上 |
| 3-2 | KMS vs 専用HSM（FIPSレベル、署名QPS/p99、リージョン障害、PQC対応） | AWS KMS ML-DSA【確:要再検証】、GCP KMS PQ署名【要】 | A07,A15 | PoC |
| 3-3 | key ceremonyとrotation（旧鍵併存、JWKS cache最大齢、鍵年齢アラート、緊急失効時間） | CSRB Storm-0558報告(2024-03)【確】、Microsoft SFI進捗【確】、RFC 7517 | A07,A19 | 演習 |
| 3-4 | 鍵→issuer→テナント→token種別の結合検証層 | CSRB、MSRC CVE-2025-55241【確:要再検証】、8725bis | A05,A07 | 負例試験 |
| 3-5 | 管理面保護（二者承認・JIT・専用端末、自社IdPで自社IdP管理者を認証する循環依存の切断） | SP 800-207【確】、Okta 2023 RCA | A08 | 机上 |
| 3-6 | CI/CD保護（SLSAレベル、policy bundle署名、policyリポジトリ二者レビュー） | SLSA v1.2【確】、SSDF SP 800-218 | A08 | PoC |
| 3-7 | 署名鍵漏洩runbook（全token失効、JWKS差替え、下流cache強制更新、顧客通知） | SP 800-61r3【確】 | A19 | 演習 |

## 4. workload identity
| # | 問い | 一次資料 | ADR | 机上/PoC |
|---|---|---|---|---|
| 4-1 | SPIFFE/SPIRE vs クラウドネイティブworkload ID、trust domain単位 | SPIFFE、SPIRE(CNCF Graduated)【確】、SP 800-207A【確】 | A09 | PoC |
| 4-2 | WIMSE草案への依存度 | WIMSE arch/workload-creds/mutual-tls【草】 | A09,A16 | 机上 |
| 4-3 | 署名付き内部contextを自作せずTransaction Tokensに寄せるか | draft-ietf-oauth-transaction-tokens【草】 | A09 | PoC |
| 4-4 | trust domain越え委任 | RFC 8693【確】、ID-JAG【草】、identity-chaining【要】 | A09,A17 | 机上 |

## 5. 認可エンジン
| # | 問い | 一次資料 | ADR | 机上/PoC |
|---|---|---|---|---|
| 5-1 | 整合性モデル（new enemy防止要求範囲。OpenFGA HIGHER_CONSISTENCY、SpiceDB ZedToken/fully_consistent、Cedar/AVP stateless、OPA bundle結果整合） | Zanzibar(USENIX ATC 2019)【確】、各公式consistency文書 | A10 | 分類机上、stale allow継続時間PoC |
| 5-2 | 自社モデル・データ分布でのCheck p99/p99.9、ListObjects/LookupResources、深いネスト、巨大テナント | 同上 | A10,A13 | PoC必須 |
| 5-3 | ReBAC×ABAC合成（conditions/caveats/Cedar/Rego）、deny semantics、自動解析可能性 | Cedar論文(OOPSLA 2024)【確】 | A11 | 机上＋analyzer PoC |
| 5-4 | プロジェクト健全性（単一企業依存、LTS、CVE、license） | OpenFGA CNCF Incubating、Cedar CNCF Sandbox、OPA Graduated（maintainer移籍）、SpiceDB AuthZed単独、Aserto事業終了、Permify買収【確:要再検証】 | A10,A18 | 机上 |
| 5-5 | PEP–PDP APIをAuthZEN準拠にしエンジン差替可能にするか | AuthZEN Authorization API 1.0【確:要再検証】 | A11,A18 | adapter PoC |
| 5-6 | 出口戦略（tuple/policy export、DSL変換、dual-run移行） | 各公式 | A18 | 移行演習 |
| 5-7 | managed vs self-host、policy storeテナント別/共有 | AVP料金・quota【確:要再検証】、AWS Prescriptive Guidance per-tenant store【確】 | A10,A13 | 費用机上、quota PoC |

## 6. PEP完全性
| # | 問い | 一次資料 | ADR | 机上/PoC |
|---|---|---|---|---|
| 6-1 | 全entry point棚卸し（HTTP/gRPC/GraphQL resolver/webhook/queue consumer/batch/管理コンソール/export/support tool/ETL/DB直）、IDL静的抽出×実行時トレース突合 | ASVS 5.0 V8【確】、API Top 10 2023【確】、SP 800-53r5 AC-3/AC-25 | A12 | 机上＋PoC |
| 6-2 | coverage機械検証（Semgrep/CodeQLルール、全レスポンスdecision_id実行時検査、deny-by-default強制） | 同上、GitHubのendpoint別permission宣言 | A12 | KRI化 |
| 6-3 | DB RLSとストレージ防御（接続プールのテナントcontext漏れ、RLS性能、object storage prefix/IAM条件） | PostgreSQL RLS公式、AWS SaaS tenant isolation【要】 | A12,A13 | PoC |
| 6-4 | 非同期経路（enqueue時か実行時か、consumer再認可、outbox） | — | A09,A12 | PoC |
| 6-5 | cross-tenant property test/fuzzingのCI必須化 | ASVS | A12 | PoC |

## 7. blast radius
| # | 問い | 一次資料 | ADR | 机上/PoC |
|---|---|---|---|---|
| 7-1 | cell単位とcell内部品、global部（directory、routing、鍵root）の最小化 | AWS cell-based architecture whitepaper【確】、Builders' Library（static stability、shuffle sharding） | A13 | PoC |
| 7-2 | fail-mode matrix（操作階層×障害種別: PDP timeout、replica遅延、IdP停止、KMS停止、監査sink停止、JWKS取得失敗）→ deny/上限付き署名済み既知良好判定/queue/縮退 | 既存標準なし（自社判断） | A13 | chaos試験 |
| 7-3 | policy/model/schema変更のcell単位canary、緊急freeze、既知良好版復帰時間 | CrowdStrike PIR(2024-08)【確】 | A13,A16 | 演習 |
| 7-4 | IdP/AS停止中の既存session継続時間 | — | A01,A13 | PoC |

## 8. 監査とプライバシー
| # | 問い | 一次資料 | ADR | 机上/PoC |
|---|---|---|---|---|
| 8-1 | decision eventスキーマ、trace分離、decision_id↔trace_id | OCSF【要:最新版】、DMTF CADF【確】、OpenTelemetry | A14 | 机上 |
| 8-2 | 100%記録対象と集約可対象、欠損検知、backpressure | — | A14,A13 | PoC |
| 8-3 | WORMと改ざん検知（Object Lock、hash chain/Merkle、監査用鍵分離） | RFC 9162(CT v2)【確】 | A14,A07 | PoC |
| 8-4 | 保持・所在地・削除、匿名化と調査可能性の両立、顧客監査API | GDPR、個人情報保護法、SP 800-92r1【要】 | A14 | 机上（法務） |
| 8-5 | コストモデル（decision件数/日×size×保持年数） | — | A14 | PoC必須 |

## 9. 20年の進化
| # | 問い | 一次資料 | ADR | 机上/PoC |
|---|---|---|---|---|
| 9-1 | token種別ごとalg識別子、複数alg JWKS、hybrid/composite署名、ML-DSA-44署名約2.4KBでのサイズ上限 | RFC 9964(ML-DSA for JOSE/COSE)【確:要再検証】、SLH-DSA JOSE/COSE【草】、RFC 7696(BCP 201)【確】 | A15 | PoC |
| 9-2 | 移行期限と順序（TLS KEM先行、署名は長寿命root/SAML/VCから） | FIPS 203/204/205【確】、FIPS 206【草】、NIST IR 8547【草: 2030年112-bit非推奨、2035年使用不可】、OMB M-26-15【確:要再検証】、CNSA 2.0【確】、RFC 10024【確:要再検証】 | A15 | 机上 |
| 9-3 | versioning/deprecation（claim ver、model version、SDKサポート期間、未移行consumer数） | Kubernetes deprecation policy【確】、Azure AD Graph退役長期化 | A16 | 机上 |
| 9-4 | 歴史的教訓: 20年保つもの（識別子、データモデル、監査記録、境界原則）と入替前提のもの（プロトコル、暗号、ライブラリ） | SAML 2.0(2005)とXML署名ラッピング、OAuth 1.0→2.0、implicit非推奨化、OpenID 2.0→OIDC、SHA-1(2030廃止告知)、SP 800-131A Rev2 | A15,A16 | 机上 |
| 9-5 | AIエージェントを独立主体にするかuser委任+actか、tool呼出単位認可、人による確認のstep-up | MCP 2026-07-28認可【確:要再検証】、ID-JAG【草】、NIST NCCoE concept paper(2026-02)【確:要再検証】、SCIM Agent【草】 | A17 | PoC |
| 9-6 | VC/walletの本人確認・属性証明利用時期 | OpenID4VP 1.0/OpenID4VCI 1.0【確】、SD-JWT RFC 9901【確:要再検証】、W3C VC DM 2.0【要】、EUDI Wallet【要】 | A02,A16 | 机上 |

## 10. 実事故と設計要件の対応表
| 事故 | 破られた前提 | 対応要件・統制 | ADR | 検証/KRI |
|---|---|---|---|---|
| Storm-0558(2023) | 2016年発行のconsumer鍵が有効のまま、rotation・鍵年齢監視なし、enterprise tokenとして受理 | 鍵とissuer/テナントのスコープ結合、HSM非エクスポート、自動rotation | A07 | 最長鍵年齢、負例試験 |
| CVE-2025-55241(2025) | 未署名・未文書化の内部actor tokenをレガシーAPIがテナント未検証で受理、ログなし | 内部tokenもprofile化、レガシーAPI期限付き廃止、全API監査 | A09,A14,A16 | 内部token棚卸し |
| Okta support(2023) | service account資格情報が個人Googleプロファイルに保存、HAR内session token流用 | support経路分離、アップロード物サニタイズ、sessionのデバイス束縛（DBSC） | A08,A05 | session再利用試験 |
| Cloudflare(2023) | Okta侵害後に4資格情報を未使用と誤認しrotateせず | 資格情報棚卸し、侵害時全件rotation、未使用資格情報自動失効 | A19,A07 | rotation漏れ率 |
| Midnight Blizzard(2024) | MFAなしレガシーテストテナント、テストOAuth appが本番で高権限 | 非本番と本番の信頼分離、OAuth app/consent棚卸し | A04,A08 | 高権限app数 |
| Snowflake(2024) | MFA未強制、infostealer由来資格情報 | AAL2をプラットフォームデフォルト、単一要素service user禁止 | A02 | MFA率 |
| Salesloft Drift(2025) | 第三者連携のOAuth token窃取、大量export | 第三者grantのsender constraint、scope最小化、bulk read検知、SSF/RISC失効連携 | A05,A06 | 異常export検知時間 |
| nOAuth(2023/2025) | 可変email claimで既存アカウントにlink | iss+sub（tid+oid）限定 | A04 | 攻撃再現試験 |
| CircleCI(2023) | 2FA済みSSO session cookieがmalwareに窃取 | session束縛、本番アクセスJIT・step-up | A05,A08 | — |
| MGM/Scattered Spider(2023) | helpdesk経由MFAリセット | 回復手順高保証化、管理者回復の二者承認と待機時間 | A03 | SE演習 |

## 11. build/buy/managedと大規模事例
| # | 問い | 一次資料 | ADR | 机上/PoC |
|---|---|---|---|---|
| 11-1 | 評価軸（OIDF認証、脆弱性対応SLA、cell/region構成、data residency、エクスポート（password hash、passkey RP ID）、料金モデル、要員、bus factor） | OIDF certification一覧、各契約書 | A01,A18 | 机上 |
| 11-2 | 自作しない: 暗号、WebAuthn検証、password保管と回復、AS core、HSM。自作する: domain認可model、PEP SDK、tenant context、監査schema、policy統治、fail-mode。両論: 認可エンジンself-host | レビュー意思決定マトリクス | A01,A10 | 机上 |
| 11-3 | AS候補比較（Keycloak CNCF Incubating、Ory等 self-host vs managed） | conformance結果 | A01 | PoC |
| 11-4 | 公開事例の数値と前提（Zanzibar: 数兆ACL・毎秒数百万req・p95<10ms・99.999%超を3年、Spannerと専用運用前提【確】。Airbnb Himeji: p99 12ms・99.999%（二次資料、一次【要】）。Carta【要】）→自社規模推定と比較 | Zanzibar論文、Airbnb Tech Blog | A10,A01 | 規模推定机上、性能PoC |

## 12. 進め方
1. 机上で先に決める: 標準ステータス台帳（四半期更新）、操作リスク階層表、A02/A04/A05/A07/A16草案。
2. PoCで実測: 2〜3エンジン同一モデル・同一データ比較、stale allow継続時間、Check p99.9、cross-tenant fuzzing、chaos、緊急鍵rotation演習、FAPI conformance、監査コスト、AuthZEN adapter。
3. 独立評価: PoC結果とADRを外部評価者へ。

## 参考（計画段階で参照された情報源、要一次資料再確認）
NIST SP 800-63-4改訂告知(csrc.nist.gov)、OpenID SSF/CAEP/RISC承認報道、AuthZEN 1.0 Final告知(openid.net)、OpenID Federation 1.0 Final告知(openid.net)、FAPI 2.0 Message Signing Final告知(openid.net)、draft-ietf-oauth-transaction-tokens、draft-ietf-wimse-arch、draft-ietf-wimse-workload-creds、draft-ietf-oauth-v2-1、draft-ietf-oauth-rfc8725bis、RFC 10017、draft-ietf-oauth-status-list、RFC 9901、RFC 9964、RFC 10024、draft-ietf-oauth-identity-assertion-authz-grant、WebAuthn L3 Rec告知(FIDO)、NIST IR 8547 ipd、OMB M-26-15、SP 800-57 Pt1 Rev6 ipd、SLSA v1.2告知、MCP 2026-07-28 authorization、NIST NCCoE agent identity concept paper、draft-wzdk-scim-agent-resource、OpenID4VP/VCI、OpenFGA CNCF Incubating告知、Cedar CNCF Sandbox告知、OPA maintainer移籍報道、SpiceDB v1.54、Keycloak CNCF、Permify/FusionAuth、AVP pricing/quotas、AWS KMS ML-DSA告知、Microsoft SFI 2025-04報告、CSRB Storm-0558報道、CVE-2025-55241報道、Salesloft Drift(UNC6395)報道、Semperis nOAuth、Cloudflare Thanksgiving 2023 blog、CircleCI incident report、Okta 2023 support breach、Midnight Blizzard報道、Snowflake UNC5537報道、MITRE G1015、DBSC GA告知(Google Workspace Updates 2026-05)、Zanzibar(research.google)、Airbnb Himeji(InfoQ)、DS-511解説(PwC)。
