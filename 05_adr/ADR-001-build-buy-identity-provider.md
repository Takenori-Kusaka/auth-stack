# ADR-001 認証基盤（IdP/AS）の build/buy/managed

> 文書ID: ADR-001 / 版: 0.1 / 状態: draft（ADR 状態: proposed＝決裁前）/ 最終更新: 2026-10-03
> 可逆性: **部分的に不可逆**。不可逆とするのは次の 4 つで、DEC-3 の決裁対象として提案する。(1) D1 自作しない原則、(2) D2 外部に見える識別子と endpoint を自社ドメインの製品非依存 path に固定すること、(3) D3 主体台帳の正本を自社に置くこと、(4) D4 依存サービスと外部 client が信頼する issuer を cell 内の自社 AS に限ること。製品の選択（D6〜D7）と、資格情報層を managed にするか self-host にするか（D9、D17）は、D2・D3 があればテナント単位で戻せる（§3.6）。
> DEC-3 対象: はい（traceability/deliverables.md §5 の ADR-001 行「対象（自作しない方針）」）
> 対応要求: R-094, R-203（本書を対応成果物とする行）／G-074, G-020（同）。関連: R-046, R-047, R-049〜R-056, R-088〜R-093, R-096, R-137, R-139, R-141, R-150, R-161, R-208, R-209／G-005, G-065, G-070, G-071, G-077, G-079, G-083〜G-085, G-087〜G-089, G-120（全件と閉じ方は末尾の対応表）
> 依存文書: CONVENTIONS.md, traceability/deliverables.md, traceability/R-requirements.md, traceability/G-goal-criteria.md, traceability/claims-ledger.md（CL-0099, CL-0232, CL-0263）, 01_governance/assumptions-register.md, 01_governance/durability-charter-20y.md, 01_governance/exception-risk-acceptance.md, 03_threat-model/attacker-model.md, 05_adr/ADR-005-token-profile.md, 05_adr/ADR-007-key-hierarchy-kms-hsm.md, research/RS-03, RS-04, RS-05, RS-06, RS-09, RS-10, RS-11, RS-12, RS-14, RS-15（各 research/verification/ の検証記録を含む）
> 作成方法: 3 つの起草レンズ（sec＝セキュリティ・保証優先、ops＝運用性・費用・組織実現性優先、evo＝20 年の進化可能性・退出可能性優先）の提案を、AI エージェント（Claude）による 3 名の判定者が採点し、集計上の勝者 evo を土台に判定者の指摘（grafts）を取り込んで統合した。判定と採点は自己レビューであり、実在する CTO/CISO の決裁ではない（CONVENTIONS §8）[D]。判定者が指摘した事実誤りは原典と research ノートで確認して修正した（§4.6）。表のセルでタグがないものは設計推論 [D] である。

## 要旨（結論）

- **自社が 20 年持ち続けるのは製品ではなく、識別子・鍵・主体台帳である** [D][A-100, A-104]。issuer、OAuth/OIDC endpoint、WebAuthn RP ID、SAML entityID/ACS、redirect URI を自社ドメインの製品非依存 path に置き（D2）、`sub`・テナント ID・linking の正本を自社の主体台帳に置き（D3）、署名鍵を cell の KMS に置く（D11、ADR-007）[D]。
- **依存サービス 300 と外部 client 800 が信頼する issuer は、cell ごとに self-host する自社 AS だけにする**（D4）[D][A-050, A-013]。managed IdP・顧客 IdP・社内 workforce IdP は、その AS が broker する「上流 IdP」にとどめる [D]。B2B federation（SAML 1,800／OIDC 200）も AS 層で終端する（D5）[D][A-114]。
- **AS core と資格情報層（password・passkey・OTP・回復）は、cell ごとの self-host OSS 製品（第一候補 Red Hat build of Keycloak、対抗 Ory Enterprise License）で実現し、自作しない**（D1、D6、D7）[D]。FAPI 2.0 の範囲は採用版の conformance を自社で実行し、不合格なら OpenID 認定ライブラリ（node-oidc-provider）をその範囲だけの AS core にする（D12）[D][A-081]。
- **この案（案E）が成り立つ条件は、SRE を単一 on-call 系統 8 名以上（または 2 系統で各 6 名以上）にすることが G3 までに確約されることである**（D17）[D][A-054]（RS-15#70, #71）。確約されない場合は、資格情報層だけを managed にする案D に切り替える。D2・D3 を先に作るので、切替えも戻しもテナント単位で行える [D]。
- **利用者からの相談（認可を通った証跡としての trace id 相当の claim、将来の claim）への答え**: trace id（W3C `traceparent`）は token に入れない。署名されておらず外部から注入できるため、認可を通った証拠にならないからである [D]（RS-10#16〜#18）。証跡は、token 1 件の識別子（`jti`）、取引単位の署名付き識別子（Transaction Token の `txn`。draft の間は社内 profile）、認可判定記録の識別子の 3 層で残し、監査記録の中で trace-id と対応付ける [D]。所属以外に検討すべき claim は §1.7 の表に示す。claim の意味は ADR-005・ADR-009・ADR-022 と claim 目録（DL-115）で決める。本書では、製品がそれらを発行できることを選定の足切り条件にする（D13）[D]。8 本の ADR で揃えた相関 ID の統一モデル（token・session/grant・取引・判定の 4 層と、補助の trace-id）は 05_adr/reconciliation-notes.md §3 に置く [D]（整合調整で修正）。

---

## 1. 文脈

### 1.1 解くべき問題

旧提案は、IdP/AS が人・アプリ・workload の認証と token の発行・交換・失効を担うとした（CL-0099）[D]。しかし build/buy を決めないまま、Phase 1 で OIDC AS を実装する計画を置いた（CL-0263。主張台帳の処置は「修正」）[D]。レビューは Gate 3 で「managed IdP か自営 AS か。原則として認証プロトコル・認証器・回復を自作しない」を独立した ADR にするよう求めた [D][^1]（L165）。意思決定マトリクスは「OAuth AS を全面自作」を原則不承認とし、例外審査要件を求めた [D][^1]（L227）。

| # | 問い | 主な R/G |
|---|---|---|
| Q1 | 何を自作せず、何を自作するか。例外審査の要件は何か | R-094, R-203, G-074 |
| Q2 | 人間の利用者（B2B 顧客企業ユーザー・B2C・従業員）の認証と OAuth/OIDC AS を、(a) managed、(b) self-host OSS、(c) 認定ライブラリ上の自社 AS、(d) 組合せ、のどれで実現するか | R-088, R-093, G-005 |
| Q3 | 日本・EU・米国の cell、1 万テナントの B2B federation、FAPI 2.0 の範囲、cell 別の鍵をどう満たすか | R-096, R-150, R-049〜R-056 |
| Q4 | 出口（passkey の RP ID、password hash の移出）と、20 年のうちに 1 回以上ある置換にどう備えるか | R-090, R-091, R-208, R-209, G-070, G-071 |
| Q5 | 要員・TCO はどの桁か。24 FTE（SRE 6）の体制で運用できるか。どの条件なら判断が覆るか | R-092, R-137, R-139, R-141 |
| Q6 | 攻撃者モデル（FAPI 2.0 Attacker Model と ATK-01〜ATK-19）に照らした案ごとの残余リスクと、それを自社が独立に検証できるか | G-077, G-079, G-089 |

### 1.2 制約（規範・法令）

| # | 内容 | 強度 | 根拠 |
|---|---|---|---|
| N-a | public key credential は、登録時と同じ RP ID の RP でしか認証に使えない。authenticator は rpId の完全一致を検証する | MUST | WebAuthn L3 [N][^38]（RS-03#29、RS-15#59） |
| N-b | password は offline 攻撃に耐える形で、salt 付きの password hashing scheme で保存する。cost factor は計算性能の向上に合わせて引き上げる | SHALL / SHOULD | SP 800-63B-4 §3.1.1.2 [N][^37]（RS-15#58） |
| N-c | 同期型認証器を AAL3 で使ってはならない | SHALL NOT | SP 800-63B-4 §2.3 [N][^37]（RS-03#15） |
| N-d | 安定した利用者識別子は `iss` と `sub` の組だけである。subject を IdP をまたいで一意と扱ってはならない | 規定（§5.7）／SHALL NOT | OIDC Core [N][^39]、SP 800-63C-4 [N][^70]（RS-03#57） |
| N-e | FAPI 2.0 の AS は confidential client だけを支援し、RS は失効状態を検証する。準拠を名乗るプロファイルは mandatory な振る舞いを除去・上書きしてはならない | shall / shall not | FAPI 2.0 Security Profile [N][^40]（RS-04#41, #45, §2-3, §2-4） |
| N-f | FAPI 2.0 Attacker Model は、AS への RCE や DB 設定不備による資格情報の露出をモデルの範囲外とする | 記述 | FAPI 2.0 AM [N][^41]（RS-04#50） |
| N-g | JWT の検証者は、鍵が issuer に属することを検証しなければならない | MUST | RFC 8725 [N][^42]（RS-05 §2-1） |
| N-h | token exchange は入力 token と出力 token を強く結び付けない。失効の伝播は一般的な性質ではない。アクセス制御に使えるのは top-level claim と現在の actor だけである | 記述／MUST | RFC 8693 [N][^44]（RS-04#66） |
| N-i | データ処理サービスの契約に乗換えの権利を書面で定める（予告 2 か月以下、移行 30 暦日以内（技術的に不可能なら最大 7 か月）、取得 30 暦日以上、export 可能データの全分類の網羅的特定） | shall | EU Data Act 第 25 条 [N][^55]（RS-15#64） |
| N-j | 2027-01-12 以降、乗換え費用を課してはならない | shall not | EU Data Act 第 29 条 [N][^55]（RS-15#65） |
| N-k | 完全性・セキュリティに関わるデータは export 可能データから除くべきとしつつ、その除外が乗換えを妨げるべきでないとする | should / should not | EU Data Act 前文 (82) [N][^55]（RS-15#66） |
| N-l | EU の金融機関は、重要な機能を支える ICT サービスについて試験済みの出口計画を持つ | shall | DORA 第 28 条(8) [N][^56]（RS-15#67） |

### 1.3 製品・標準の事実（判断に効くもの）

| 論点 | 事実 | 根拠 |
|---|---|---|
| OIDF の OP 認定の版 | 確認できる最新記録は Keycloak 18.0.0（2022-05-19）、ORY Hydra v1.0.0（2018-07-14）、ZITADEL 1.53.1（2021-11-04）。Cognito の行はない | [N][^2]（RS-15#3） |
| FAPI 2.0 Final の認定 | 7 列すべてで認定があるのは node oidc-provider >= 9.2.0（2025-07-10）だけ。Auth0 Highly Regulated Identity は MTLS 送信者制約の試験計画の列だけ（2025-07-09）。Keycloak、Ory、ZITADEL、Microsoft、Amazon、Google の行はない | [N][^3]（RS-15#4〜#6） |
| 認定の意味 | 認定は特定の版・deployment が特定の日に試験に通った記録であり、その後の版の適合を示さない | [D]（RS-15#8） |
| Keycloak の機能 | 26.8.0 では organization、SCIM API、standard token exchange v2、DPoP、PAR、passkeys が supported で既定有効。SPIFFE と旧方式の token exchange は preview | [V][^4]（RS-15#10） |
| Keycloak の FAPI 2.0 | client policy で FAPI 2.0 Security Profile・Message Signing（Final）を支援すると記載するが、FAPI 2.0 の認定一覧にはない | [V][^5][N][^3]（RS-15#6, #11） |
| Keycloak の多拠点構成 | multi-cluster v2 は単一リージョンか同等の低遅延環境に限られ、DB コミット遅延 10ms 未満が必須 | [V][^9]（RS-15#16） |
| Keycloak の健全性 | CNCF Incubating、Apache-2.0。minor は年 4 回。コミュニティ版は修正期限を定めない。Red Hat build は 26.x で最低 2 年、27.x 以降で 3 年のサポート | [V][^11][^6][^7][^8]（RS-15#9, #12〜#14） |
| Keycloak の export | CLI export に password hash と WebAuthn credential が含まれるかは公式文書から確定できない | [V][^10]（RS-15#17） |
| Ory | 多リージョン・B2B organization は OEL の機能。Apache 2.0 版はセキュリティ SLA がなく修正は現行リリースだけ。OEL は Critical を 14 日で解決する方針。hash 付き export と passkey の import ができる | [V][^12][^13][^14][^15]（RS-15#21〜#23） |
| ZITADEL | v3 から AGPL-3.0 | [V][^16]（RS-15#28） |
| node-oidc-provider | DPoP・PAR・mTLS・JAR・JARM・RAR・FAPI 1.0/2.0 に対応。MIT。サポート対象は v9.x だけ。認定の名義は個人 | [V][^17][^18][N][^3]（RS-15#32, #33） |
| 所在地 | Entra External ID はテナント所在地を作成後に変更できない。Cognito MRR は副リージョン 1 つまでで、副リージョンでは利用者作成と password reset ができない | [V][^19][^29]（RS-15#36, #51） |
| hash の export | Ory は Admin API で出せる。Firebase CLI は scrypt 化済みの hash だけ。Auth0 は support ticket 経由で適格性審査があり ETA を示さない。Cognito と Entra External ID は公式手段を確認できない（未確認） | [V][^14][^36][^24][^31][^20]（RS-15#23, #39, #44, #53, #57） |
| hash の import 上限 | Cognito は BCRYPT cost 12、PBKDF2_SHA256 反復 600,000 が上限 | [V][^30]（RS-15#52） |
| passkey と RP ID | Auth0 では RP ID を変えると他ドメインの passkey がすべて使えなくなる。Cognito は custom domain 利用時に RP ID をその FQDN にする | [V][^26][^32]（RS-15#46, #54） |
| passkey の移送標準 | CXF 1.0 は Proposed Standard、CXP 1.0 は Working Draft | [N][^53][^54]（RS-03#30） |
| managed の鍵 rotation | Okta は鍵 rotation を「four times a year, but can change without notice」とし、org authorization server の鍵は手動 rotation できない | [V][^50]（RS-05#41） |
| amr の粒度 | Entra の amr は同期 passkey とデバイス固定 passkey をどちらも `fido, mfa` と表す | [V][^49]（RS-03#27） |
| SLA の約束値 | Cognito はリージョンごと 99.9%、Google Identity Platform 99.95%、Auth0 Platform（Core Services）99.99%。救済は原則サービスクレジットで上限がある（Auth0・Google は月額の 50%） | [V][^28][^35][^23]（RS-15 結論 7、RS-15#42, #50, #56） |
| SLA の実績 | Entra ID の月次 SLA 達成値は 2021-02〜2026-08 の大半の月で 99.998〜99.999%（全顧客・全地域の合算。External ID 固有の値ではない） | [M]（RS-15#38） |
| 通知期間 | AWS は値上げを 30 日以上前、SLA の不利な変更を 90 日以上前、重要機能の廃止を 12 か月以上前に通知する | [V][^33]（RS-15#55） |
| CVE 方針 | MSRC は、利用者の対処が不要な場合も含め、クラウドサービスの重大な脆弱性に CVE を発行すると表明した | [V][^22]（RS-15#40） |

### 1.4 攻撃者モデルの範囲と事故の一次報告

| 類型 | 本 ADR の選択に効く点 |
|---|---|
| FAPI A1/A1a/A2/A3a/A5 | AS core のプロトコル実装の正しさ。conformance suite で検証できる範囲 [N][^41]（RS-04#50） |
| FAPI AM の範囲外（AS への RCE、DB 設定不備） | 自社の運用統制か製品ベンダーの統制で扱う（N-f） |
| ATK-02 悪意あるテナント管理者、ATK-04 侵害された顧客 IdP | 期待 IdP の allowlist、IdP 追加を保護操作にすること、高リスク操作での step-up（RS-14 §2-1, §2-3, §2-4） |
| ATK-05 盗まれた token | sender constraint と発行状態（ADR-005） |
| ATK-08 クラウド管理者、ATK-09 内部 support | managed を選ぶと、ベンダー側の同類型が自社では予防も検証もできない残余になる |
| ATK-12 リージョン障害 | cell の独立性、global 依存の棚卸し（RS-09 §2-14） |
| ATK-18 供給網の侵害、ATK-19 変更・自動化の誤り | self-host では自社の更新追随と変更管理の責任。managed では全顧客に同時に効く変更として現れる（RS-09 §2-2） |

- **ベンダーの鍵スコープの誤り**: Storm-0558 では、2016 年作成の consumer 用鍵が 2023 年まで有効で、enterprise 向け token の署名としても受理された [I][^59]（RS-05#21, #22、RS-12#3〜#6）。managed の顧客はベンダー内部の鍵スコープを検証できない [D]。
- **ベンダー内部 token のテナント越境**: CVE-2025-55241 について、発見者は未署名の Actor token をレガシー API がテナント不一致のまま受理したと報告し [I][^60]、MSRC は CVSS 3.1 基本値 10.0 と評価した [I][^61]（RS-05 §2-9、RS-12 §2-10）。
- **ベンダーの support 経路**: Okta の顧客サポートシステムへの不正アクセスで 134 顧客に関係するファイルが閲覧され、HAR ファイル内の session token で 5 顧客の session が乗っ取られた [I][^62]（RS-12#22、RS-14#48）。
- **全域障害**: Auth0 US-1 は 2021-04-20 に約 4 時間 20 分止まった [I][^63]（RS-09#57）。Azure AD は 2021-03-15 に鍵 metadata の誤削除で依存アプリが token を信頼しなくなった [I][^64]（RS-09#54, §2-8）。managed でも self-host でも cell 分割と静的安定性は要る [D]。
- **管理者権限による IdP 追加と自動 linking**: Scattered Spider は federated IdP の追加と自動 account linking を悪用した [I][^67][^68]（RS-14#6〜#8）。製品の選択ではなく構成と統制で防ぐ必要がある [D]。

### 1.5 前提（A-ID）

| A-ID | 値（基準） | 本 ADR での使い方 |
|---|---|---|
| A-001 / A-002 / A-004 | 登録 100 万（B2B 70 万／B2C 27 万／従業員 3 万）、MAU 57.7 万 | MAU 課金の桁（§3） |
| A-007 / A-009 | テナント 1 万、最大テナント 10 万人 | issuer の粒度と製品のテナント上限（TC-01-12） |
| A-013 | 外部 OAuth client 800、有効 grant 3 万 | 信頼する issuer の範囲（D4） |
| A-029 / A-043 | M2M ピーク 25.3/秒、token 発行ピーク 1,374/秒（うち token exchange 1,112） | 内部 token を managed に載せない理由（D10） |
| A-050 / A-052 | 依存サービス 300、開発組織 25 | 依存側が学ぶ契約の数 |
| A-054 | プラットフォームチーム 24 FTE（認証・IdP 5、SRE 6 で 2 系統の on-call）。範囲 15〜40 | 要員ゲート（D17） |
| A-061 / A-063 | 日本 85%。リージョンは日本（主・副）・EU・米国の 4 | cell ごとの独立 deployment |
| A-081 | 高保証要求テナント 50（AAL3、FAPI 2.0、専用 cell、顧客管理鍵のいずれか）。範囲 10〜200 | FAPI 2.0 conformance を足切りにする |
| A-082 / A-114 | 顧客 IdP 連携 2,000 テナント（B2B 利用者の 75%）、SAML 1,800・OIDC 200 接続 | 識別子を変えた場合の顧客側再設定件数 |
| A-090 / A-091 | 判定系 99.95〜99.99%、認証系 99.9〜99.95% | 静的安定性と 2 層直列の評価 |
| A-100 / A-101 / A-104 | 20 年。再決裁は初回 G6 から 3 年以内、以後 5 年以内。AS/IdP 製品の置換 1 回以上 | 置換を定常機能にする（D16） |
| A-115 | 自社で認証する人間 47.5 万人（password のみ 55%） | 資格情報層の移出対象 |

**新規仮定（前提台帳へ追加要）**

- NA-001-1: 1 ドル 150 円（RS-15#72 で未登録の仮定として提案済み）。
- NA-001-2: 要員単価 1 人年 1,000 万〜2,000 万円（RS-15#76 で未登録として提案済み）。
- NA-001-3: SRE は単一 on-call 系統 8 名以上（2 系統なら各 6 名以上）とする。RS-15#70 の目安に合わせた値で、A-054 の 6 名から最低 +2 名になる [D][A-054]。認証・IdP 担当と、識別子外皮・主体台帳の開発保守の増員数は TBD（所有者: プラットフォームチーム長、期限: G3、決め方: TC-01-08 の実測と DL-27）。
- NA-001-4: 外部に見える識別子と endpoint を 1 回変えるときの顧客側再設定は、A-114 の接続数（2,000）と同数と置く。
- NA-001-5: 従業員 3 万人は社内 workforce IdP から federation し、資格情報層には載せない。
- NA-001-6: AS が業務 API 向けに発行する token の署名鍵は、すべて cell の KMS/HSM（ADR-007）の非エクスポート鍵にできる。製品の対応は TC-01-05 で確かめる。

### 1.6 関連 R/G と関連研究

- R: R-094, R-203（主）。R-046, R-047, R-049〜R-056, R-088〜R-093, R-096, R-137, R-139, R-141, R-150, R-161, R-208, R-209（関連）。
- G: G-074, G-020（主）。G-005, G-065, G-070, G-071, G-077, G-079, G-083〜G-085, G-087〜G-089, G-120（関連）。
- RS: RS-15#2〜#79（主）。RS-03#15, #27, #29, #30, #57。RS-04#41, #45, #50, #60, #64, #66。RS-05#21, #22, #41, #63。RS-06#30, #31, #36, #38。RS-09#14, #27, #54, #57。RS-10#16〜#19。RS-11#8, #68〜#72。RS-12#3〜#6, #22。RS-14#1〜#3, #6〜#8, #48。

### 1.7 自社 AS が発行する claim と相関 ID（利用者からの相談事項）

「共通の認証認可を通った一貫性のあるリクエストである」ことを証跡に残す方法について、claim の意味と契約は ADR-005（token profile）、ADR-009（内部 context、Txn-Token）、ADR-022（契約標準）、DL-115（04_architecture/claims-catalog.md）で決める [D]。本書では、AS が自社の定義どおりに claim を発行できることを製品選定の条件として固定する（D13）[D]。

**相関 ID の 3 層** [D]

| 層 | 識別子 | 何を示すか | 規範上の位置付け |
|---|---|---|---|
| 1. token | `jti`（JWT access token）。外部向け opaque token では状態ストアの発行記録キー | AS が発行した token 1 件。発行記録にない `jti` を持つ署名済み token は偽造として検知できる（ADR-005 D1-6・H-09。整合調整で修正） | RFC 9068 の JWT access token で REQUIRED [N][^43]（RS-04#60）。外部 client 向けは opaque（ADR-005 D1） |
| 2. 取引 | `txn`（Transaction Token） | edge で access token から交換した内部 Txn-Token に載る、呼出し連鎖全体の取引の一意識別子。署名付き | draft-ietf-oauth-transaction-tokens-11 の必須 claim。`tctx`・`rctx` は RECOMMENDED [N][^46]（RS-06#31）。Internet-Draft で RFC ではない |
| 3. 判定 | 認可判定記録の識別子（`decision_id` 等、DL-71） | PDP の判定 1 件 | ADR-011・ADR-014 で決める |
| 監査上の結合 | W3C Trace Context の trace-id | 分散トレースの相関だけ | token には入れず、監査記録の中で 1〜3 層と対応付ける（ADR-014） |
| （補）session・grant | `sid`、grant 参照 | どのログイン session・どの同意から発行されたか | ADR-005 D9-2 の L2 層。本表の 3 層に加えて監査で結合する（整合調整で修正）[D] |

- Txn-Token は replay に耐性がなく、OAuth access token として使ってはならない（MUST NOT）[N][^46]（RS-06#36）。多数の要求で使い回す access token に要求単位の識別子を入れると意味が合わないので、取引識別子は edge で交換する内部 Txn-Token に載せる [D]。
- Txn-Token を使う trust domain ごとに、論理的にちょうど 1 つの発行者（TTS）を置く（MUST）[N][^46]（RS-06#38）。発行者は cell 内の自社 STS になる（D10）[D]。
- `traceparent` を token に入れない理由: trace-id は署名されておらず外部から注入できる。外部から来た trace を素直に継続すると trace-id の衝突を偽造され得る [N][^47]（RS-10#17）。したがって認可を通った証拠にならない [D]。また trace 系 field には PII や機微情報を入れてはならない（MUST NOT）[N][^47]（RS-10#16）。

**所属以外に検討すべき claim（ADR-005／ADR-009／ADR-022／DL-115 への入力）** [D]

| 目的 | 候補 | 規範上の位置付け | 本書の要件・判断 |
|---|---|---|---|
| 主体の安定識別 | `iss`＋`sub`（自社主体台帳の不透明 ID） | OIDC Core §5.7 [N][^39]（RS-03#57） | 製品の内部 ID を出さない（D3）。email や表示名を所属・同一性の根拠にしない（RS-14 §2-2） |
| 所属・テナント | 自社が採番した不変のテナント ID。上流 IdP の (iss, sub) は台帳で linking | 02_requirements/tenant-lifecycle.md の INV-1・INV-2（テナント ID は不透明・不変、cell 移動で (iss, sub) を変えない）。ADR-007 も同じ前提を置く（整合調整で修正） | cell や地域を所属 claim に埋め込まない [D] |
| 主体種別 | 人・workload・AI エージェントの区別 | ADR-017 で決める | 発行時に設定とテストで制御できることを要件にする |
| 委任 | `act`、`may_act` | RFC 8693。アクセス制御に使えるのは top-level claim と現在の actor だけ（MUST）[N][^44]（RS-04#66） | ADR-009・ADR-017 で決める |
| 鍵束縛 | `cnf` | DPoP・mTLS（ADR-005） | AS が発行できることを必須にする |
| 保証の文脈 | `acr`、`amr`、`auth_time` | RFC 9068 の任意 claim [N][^43]。Entra の amr は同期／デバイス固定 passkey を区別しない [V][^49]（RS-03#27） | 上流 IdP の値を転記せず、自社 AS の検証結果で上書きする（D8） |
| 構造化された許可 | `authorization_details` | RFC 9396。JWT の場合 audience ごとに絞った値を top-level claim にすることが RECOMMENDED [N][^45]（RS-04#64） | FAPI 範囲で使えることを要件にする |
| 呼出し連鎖の文脈 | `tctx`（不変 context）、`rctx`（要求環境） | Txn-Token 草案で RECOMMENDED [N][^46]（RS-06#31） | ADR-009 で採否を決める。draft の間は版を固定した社内 profile |
| profile の版 | token profile の版識別 | 版の運用規則は ADR-016、claim 名は DL-75 で確定する（整合調整で修正） | 20 年の互換のため、版を判別できることを ADR-016 に要求する [D] |
| 外部発行の属性証明（資格・雇用関係など） | W3C の Verifiable Credentials 系仕様 | research（RS-01〜RS-17）に未収載。W3C VC Data Model 2.0（Recommendation、2025-05-15）の原典は ADR-005 D9-6・ADR-021 D21-40・ADR-022 D-9-5 の起草者が取得して照合したが、独立検証は未了である。本書は仕様の内容を結論に使わない（整合調整で修正） | AS に組み込まず、検証済み属性を受け取る口（claim mapping の拡張点）を持つことだけを要件にする。対応は DL-115 と新規の調査項目で扱う（前提台帳と RS への追加要） |

- W3C の仕様のうち research で検証済みなのは WebAuthn L3（RS-03#29）、Trace Context（RS-10#16〜#18）、Baggage（RS-10#19）である。Baggage については、利用者を識別できるデータが入り得ることを仕様が認めたうえで、header の濫用リスクを評価すること（MUST）を求めている [N][^48]（RS-10#19）。そのため、テナントや主体の情報を baggage で運んで認可の根拠にしない [D]。
- 以上から選定要件を 3 つ導く [D]。(i) 採用する claim profile を、発行時に設定とテストで制御できる。(ii) 上流 IdP 由来の値を検証済みの値で上書きできる。(iii) 発行ログに `jti`（opaque では発行記録キー）を必ず記録できる。

---

## 2. 決定

### D1 自作しない領域・自作する領域・例外審査（不可逆、DEC-3）

- D1-1 次は自作しない [D]（RS-15#78）。OAuth/OIDC/SAML のプロトコル処理と AS core（認可・token endpoint、PAR、DPoP、mTLS、FAPI 2.0 の検査）、WebAuthn の登録・検証、password hashing、MFA 要素（TOTP・OOB）の検証、回復の基本手順の実装（回復コードの生成・検証）、暗号ライブラリ、HSM/KMS。
- D1-2 自作するのは次に限る [D]（RS-15#78）。主体台帳（D3）、識別子外皮（D2 の edge 写像）、Signer 抽象（ADR-007）、claim の契約変換層、テナント context、PEP SDK、監査 schema、fail-mode、移行・出口のツール群（export/import 変換、JIT 移行、dual-run）、契約試験キット、上流 IdP の broker 設定と統制。
- D1-3 回復の業務フロー（helpdesk の本人確認、二者承認、待機時間）は ADR-003 で設計し、回復に使う認証器の検証と credential の保管は D1-1 の製品機能を使う [D]。
- D1-4 製品の拡張点（Keycloak SPI、Actions、hook、Lambda trigger など）に書くコードのうち、プロトコルメッセージ、token の署名・検証、credential の保管に触れるものは「自作の例外」として D1-5 の審査にかける [D]。それ以外の拡張コード（claim 写像、属性写像、台帳同期）は D15 の拡張予算に従わせる [D]。
- D1-5 D1-1 の例外は、次をすべて満たす場合だけ認める（様式は 01_governance/exception-risk-acceptance.md）[D]。
  1. 差別化要因か法的必要性を文書で示し、採用候補がすべて規範要求を満たせないことを OIDF conformance suite の自社実行結果（TC の不合格記録）で示す。
  2. 該当する規範（RFC・OIDF・NIST）の条項の一覧と、適合試験の実行ログを残す。
  3. 攻撃者類型（§1.4）ごとに脅威を追加分析する。
  4. 第三者のコードレビューか pentest を行う（D 区分）。
  5. 所有者と bus factor 2 名以上（R-139）、CVE の受付窓口と修正期限を定める。
  6. 範囲を 1 機能に限り、終了日か再審査の期日と、A-101 の再決裁で撤去する条件を置く。出口（D2 の識別子と export 形式）を先に決める。
  7. CTO と CISO が承認し、例外とリスク受容の台帳に記録する。

### D2 外部に見える識別子と endpoint の外皮（不可逆、DEC-3）

- D2-1 issuer URL、discovery、authorize・token・PAR・JWKS・introspection・revocation・userinfo の各 endpoint、WebAuthn RP ID、SAML SP の entityID と ACS、顧客 IdP に登録してもらう OIDC redirect URI は、すべて自社所有の registrable domain に置く [D]（RS-03#29、RS-15#46, #54, #60）。path は製品に依存しない形にする [D]。
- D2-2 cell ごとの edge が、自社の path から製品固有の path へ写像する [D]。discovery 文書、SAML metadata、redirect、エラー応答のどこにも、製品固有の path・ホスト名を外部の RP、顧客 IdP、利用者の authenticator に見せない [D]。edge 写像は cell ごとに置き、全テナントに効く単一の部品にしない（ADR-013）[D]。
- D2-3 写像は DPoP の `htu`、mTLS の証明書束縛、PAR の `request_uri`、issuer の一致（ADR-005 D8-2 の表で採用する RFC 9207。整合調整で修正）と矛盾してはならない [D]。PoC（TC-01-02）で確認できない場合は、外皮を「識別子を自社ドメインに置く」水準に縮め、path の写像はやめる（§8 T-03）[D]。
- D2-4 理由: 識別子を変えるたびに相手側の作業が要る。A-114 の基準では顧客 IdP 2,000 接続の再設定になる [D][A-114]。OpenID 2.0 から OIDC への移行では、識別子を移すための専用標準が要った [N][^69]（RS-11#68〜#72）。
- D2-5 識別子の形式（テナント別 issuer の粒度、`sub` の形式）は ADR-021 で決める [D]。本書は、採用製品が任意の issuer 文字列と自社 endpoint の写像を受け入れることを受入条件にする（TC-01-01）[D]。

### D3 主体台帳の正本を自社に置く（不可逆、DEC-3）

- D3-1 `sub`（不透明 ID）、テナント ID、cell 割当、上流 IdP の (iss, sub) との linking の正本は、製品の外の自社主体台帳に置く [D]（RS-03#57、RS-14#1〜#3）。製品の内部 ID は AS の境界の外に出さない [D]。
- D3-2 credential（password hash、passkey の公開鍵記録、TOTP secret）は製品の利用者ストアに置いてよいが、D7-3 の export 経路を受入条件にする [D]。
- D3-3 主体台帳は cell ごとに置き、台帳が止まっても既存 session と token 検証が続く構成にする（静的安定性、D14）[D]。台帳停止中は新規登録と linking 変更ができなくなる。これを残余リスクとして扱う（§6.3）[D]。

### D4 信頼する issuer の範囲と上流 IdP（不可逆、DEC-3）

- D4-1 依存サービス（約 300）と外部 client（800）が受け付ける access token と内部 token の issuer は、各 cell に置く自社 AS だけとする [D][A-050, A-013, A-063]。cell の定義と数は ADR-013 に従う（法域パーティション×規制スコープ×テナント群。試算 9。日本副リージョンは独立した cell ではなく日本の各 cell の待機 cell、ADR-013 D13-20）[D]。issuer の「値」の粒度（信頼区画別か、テナント／realm 別か）は ADR-021 K21-1 と ADR-007 KD7-1 で DEC-3 にかけ、本書は決めない。issuer の値と cell は 1 対 1 にしない（ADR-021 D21-06、ADR-013 D13-42）[D]（整合調整で修正）。
- D4-2 managed IdP、顧客 IdP、社内 workforce IdP、将来の外部属性発行者は「上流 IdP」として扱う [D]。その assertion・token は cell の AS（broker）だけが受け取り、業務 API には届けない [D]（N-d、RS-03 §2-9）。managed の SDK や hosted UI を依存サービスに直接組み込むことは連携規約（10_integration/）で禁止し、CI で検出する（G-072）[D]。
- D4-3 上流 IdP はテナントごとの「期待 IdP」allowlist で受け入れる。IdP の追加・変更、証明書の更新、linking 規則の変更は保護操作とする（ADR-004、ADR-008）[D]（RS-14 §2-3）。上流 IdP 単位の遮断機能を AS に持たせる [D]。

### D5 B2B federation の終端

- D5-1 顧客 IdP（SAML 1,800・OIDC 200 接続）の federation は、資格情報層ではなく cell の AS 層で終端する [D][A-114]。SP entityID・ACS URL・redirect URI は D2 の自社ドメインに置く [D]。
- D5-2 理由: 終端を managed ベンダーのテナントに置くと、乗換えのたびに約 2,000 の顧客側で再設定が要り、entityID の形式も製品ごとに異なる [D][A-114]。federation 利用者（B2B の 75%）を資格情報層に通さないことで、MAU 課金と障害影響範囲も小さくなる [D][A-082]。
- D5-3 SAML の解析は自作せず、製品の federation 機能を使う（D1-1）。詳細な規則は ADR-004 に委ねる [D]。

### D6 AS core: cell ごとに self-host する OSS 製品

- D6-1 AS core は OSS 製品を cell ごとに独立して self-host する。cell をまたいで DB を共有せず、cell をまたぐクラスタ（Keycloak multi-cluster など）も使わない [D][A-063]。根拠は multi-cluster v2 が単一リージョンに限られることである [V][^9]（RS-15#16）。
- D6-2 第一候補は Red Hat build of Keycloak（26.x 系）、対抗は Ory Enterprise License（Hydra＋Kratos）、比較候補は ZITADEL（AGPL-3.0 の法務確認が条件）とする [D]（RS-15#9, #10, #14, #21, #22, #28）。
- D6-3 コミュニティ版 Keycloak と Ory の Apache 2.0 版は本番候補にしない [D]。前者は修正期限を定めず [V][^7]（RS-15#13）、後者はセキュリティ SLA を設けず修正を現行リリースにしか出さない [V][^13]（RS-15#22）。
- D6-4 最終選定は G3 で、D13 の足切り条件と §7 の TC に合格した候補から DL-13 で行う [D]。認定ロゴの有無ではなく、採用版での自社 conformance 実行結果を判断材料にする [D]（RS-15#8）。

### D7 資格情報層（password・passkey・OTP・回復）

- D7-1 自社で認証する利用者（基準 47.5 万人）の資格情報層は、D6 と同じ製品で同じ cell に置くことを既定にする [D][A-115]。
- D7-2 passkey の RP ID は D2-1 の自社ドメインにする [D]（RS-03#29）。CXP は Working Draft なので、プロバイダ間の passkey 移送を 20 年の前提にしない [D][^54]（RS-03#30）。
- D7-3 受入条件: (a) password hash をアルゴリズムとパラメータ付きで、文書化された API か CLI で export できる。(b) passkey の公開鍵 credential 記録（credential ID、公開鍵、署名カウンタ）と TOTP secret を export できる [D]。Keycloak は公式文書で確定できないため TC-01-04 で確かめる（RS-15#17）[D]。
- D7-4 hash の方式とパラメータは、移行先候補の import 上限と合わせて ADR-018 に記録する [D]。SP 800-63B-4 は cost の引上げを求める（SHOULD）一方で、Cognito には import 上限がある [N][^37][V][^30]（RS-15#52, #58, #60）。

### D8 最上位保証階層の認証器

- D8-1 AAL3 相当の階層（顧客管理者、運用者、高保証テナント 50）では、cell の AS が自ら WebAuthn RP として device-bound 認証器を検証する（BE フラグ、attestation）[D][A-081]。上流 IdP が返す `amr` に頼らない [D]。
- D8-2 根拠: 同期型認証器は AAL3 で SHALL NOT である [N][^37]（RS-03#15）。Entra の amr は同期とデバイス固定を区別しない [V][^49]（RS-03#27）。
- D8-3 発行する token の `acr`・`amr` は、上流の値を転記せず AS の検証結果で上書きする（§1.7）[D]。

### D9 managed IdP の位置付け

- D9-1 managed IdP は上流 IdP（D4-2）として使ってよい [D]。従業員は社内 workforce IdP を上流として federate し、顧客 IdP と同じ扱いにする [D]。上流 IdP の侵害の影響は、その上流の母集団の認証に限られる [D]。
- D9-2 managed を資格情報層（D7）の代替にしてよいのは、次の M1〜M8 を契約と実測で満たした場合だけである [D]。2026-10-03 時点の公式文書では、M1 と M2 を満たすと確認できた候補はない [D]（RS-15#44, #53, #60）。
  - M1: password hash をアルゴリズム・パラメータ付きで API から export でき、期日が契約で保証されている。Auth0 の ticket 方式は審査で拒否され得て ETA を示さないため満たさない [V][^24]（RS-15#44）。
  - M2: passkey の公開鍵 credential 記録と MFA secret を export できる（全候補で未確認）。
  - M3: RP ID、login ドメイン、SAML entityID/ACS を自社ドメインに置ける。
  - M4: 退出条項が Data Act 第 25 条の水準を満たし、hash・MFA secret・passkey 記録を export 可能データとして明記し、前文 (82) による除外を契約で外す [N][^55]（RS-15#64, #66, #68）。
  - M5: 日本・EU・米国にそれぞれ独立したテナントを置け、所在地を固定できる。
  - M6: 内部 token（M2M・token exchange）を載せない。
  - M7: クラウドサービスの脆弱性を CVE として公開する方針がある（MSRC は表明済み [V][^22]（RS-15#40））。
  - M8: 自社の合成監視で可用性を独立に測れる。

### D10 内部 STS は cell 内で self-host する

- D10-1 token exchange、Txn-Token、M2M、workload credential の発行は cell 内の自社 STS で行い、token 単位で課金する managed サービスには載せない [D][A-043]。token exchange のピーク 1,112/秒を token 単位で課金すると、Entra の M2M 単価を当てた場合でも月約 288 万ドルになる [D][A-043]（RS-15#75）。
- D10-2 STS は D6 の製品の standard token exchange か、OIDF の FAPI 2.0 全構成で認定のあるライブラリ（node-oidc-provider）を基盤にする [D][N][^3]（RS-15#4, #33）。プロトコル処理は自作しない（D1-1）[D]。
- D10-3 Txn-Token は草案なので、版を固定した社内 profile として ADR-009 で扱う。TTS は trust domain ごとに論理的に 1 つとする [N][^46][D]（RS-06#31, #38）。

### D11 鍵の主権と暗号の俊敏性

- D11-1 token 署名は、cell の KMS の非エクスポート鍵を ADR-007 の Signer 抽象を通して使うことを受入条件にする（TC-01-05、NA-001-6）[D]。署名鍵は cell ごと・token 種別ごとに分け、検証側は (iss, kid, typ) と許可鍵集合を結合して検証する [N][^42][D]（ADR-005、ADR-007）。
- D11-2 製品が外部 Signer を使えない場合: (a) 製品内の鍵を KMS envelope で保護し、rotation を自動化して TC-01-05 の代替条件に合格する。(b) (a) も不合格なら、その機能の AS を node-oidc-provider 系に替える。(a)(b) のどちらもとれない場合は CISO の例外受容を必須にする [D]。
- D11-3 製品は ES256・PS256・EdDSA と 3072 bit 以上の RS256 を設定で切り替えられることを必須とする [D]。ML-DSA（RFC 9964 が JOSE/COSE 用に ML-DSA-44/65/87 を定める [N][^51]（RS-05#63））を製品の更新か Signer 側で追加できることは評価軸にする [D]。NIST IR 8547 ipd は、112-bit 強度の ECDSA・RSA 署名を 2030 年より後は deprecated、2035 年より後は不許可とする案を示している（Initial Public Draft）[N][^52]（RS-11#8）。
- D11-4 製品の設定変更と鍵 metadata の変更は cell 単位で段階展開する [D]（RS-09 §2-2, §2-8）。

### D12 FAPI 2.0 の範囲

- D12-1 FAPI 2.0 の範囲（ADR-020）を受け持つ AS は、採用版で FAPI 2.0 Security Profile（mTLS 構成と DPoP 構成）と Message Signing の conformance suite を自社で実行し、全試験に合格することを条件にする [D][A-081]（RS-15#8、G-089）。
- D12-2 Keycloak（または対抗）が不合格の場合は、FAPI 範囲のテナント（基準 50）の issuer に限り、node-oidc-provider 系の AS を同じ cell に置く [N][^3][D][A-081]（RS-15#4, #32, #33）。利用者ストアと回復は自作せず、D6 の製品を上流として使う [D]。D2 の写像により、外部から見た endpoint の形式は変えない [D]。この併用部分は D1-5 の例外審査の対象とする [D]。

### D13 製品選定の足切り条件

- D13-1 次のいずれかに不合格の候補は採らない [D]。
  1. D12-1 の conformance（FAPI 範囲を受け持つ場合）と、OIDC（Basic、Config、Form Post）の conformance（TC-01-06）。
  2. 非エクスポート KMS 鍵での署名（D11-1、TC-01-05）。
  3. hash・passkey・TOTP secret の export（D7-3、TC-01-04）。
  4. opaque token の発行・失効状態を cell 内の状態ストアへ push できること（ADR-005 D1-2、TC-01-07。整合調整で修正）。
  5. §1.7 の claim 要件 (i)〜(iii) を、AS core を改変せず、D1-4 の例外なしで満たせること（TC-01-11）。
  6. 任意の issuer 文字列と自社 endpoint 写像の受入れ（D2-5、TC-01-01）。
- D13-2 DL-13 の評価軸は、RS-15#77 の 13 軸に次を加える [D]。ADR-005 §9（ADR-001 行）が挙げる必須機能（PAR、DPoP の nonce と dpop_jkt、mTLS、RFC 9207・9068・7662・9701・7009・8693・8707、SSF の送信）、grant と refresh token の export/import（ADR-005 D11-1・K-5 の必須評価項目）、federation 接続数の上限と管理 API、更新時の停止の要否、ベンダー応答時間、発行時の claim 拡張、署名 alg の切替と PQC の追加可能性（D11-3）。参照先の節番号と grant export の追加は整合調整で修正した [D]。

### D14 静的安定性と fallback

- D14-1 上流 IdP、資格情報層、主体台帳のいずれかが止まっても、AS は既存 session と refresh を継続する（静的安定性。session の最大寿命は ADR-005）[D]。
- D14-2 第 2 の managed IdP へ自動で fallback する経路は作らない [D]。AWS は分散 fallback が「often make the outage worse」とし、使うなら常時両系を動かす構成を求めている [V][^65]（RS-09#14）。

### D15 製品拡張の予算

- D15-1 製品固有の拡張コードは adapter（claim 写像、上流 IdP の属性写像、主体台帳との同期）に限り、業務ロジックは製品の外の標準 interface（token exchange、SCIM、SSF）に置く [D]。
- D15-2 拡張点の数とコード量を台帳に記録し、上限（TBD。所有者: プラットフォームチーム長、決め方: TC-01-08 の実測）を置く。拡張点ごとに契約試験を付ける [D]。

### D16 置換を定常機能にする

- D16-1 計画期間中に AS/IdP 製品を 1 回以上置換する前提で設計する [D][A-104]。
- D16-2 置換はテナント単位で行う（ADR-027）[D]。issuer の粒度は未決である（§2.18a の未決の論点 U1）。テナント別 issuer（ADR-007 KD7-1 の推奨）なら issuer 単位で新旧製品を並行させられる。信頼区画 issuer（ADR-021 K21-1 の推奨）なら、同じ issuer のもとで edge がテナントごとに新旧製品へ振り分け、両製品が D11-1 の Signer 抽象で同じ区画の JWKS に載る鍵を使うことが条件になる [D]（整合調整で修正）。
- D16-3 出口演習（export・import の往復）を年 1 回行い、独立した立会人を置く。撤退の期間と費用の見積りを毎年更新する [D]（G-070）。上流の managed IdP と製品ベンダーとの契約には、Data Act 第 25 条(2) の項目を最低線として入れる [N][^55][D]（RS-15#68）。

### D17 要員ゲートと fallback

- D17-1 D6・D7 の self-host を採る条件は、DEC-4 で SRE を単一 on-call 系統 8 名以上（2 系統なら各 6 名以上）とすることが確約されることである（NA-001-3）[D][A-054]。根拠は、on-call の最少人数を単一拠点 8 名、2 拠点なら各 6 名とする目安である [V][^57]（RS-15#70, #71）。managed 側の障害対応（ベンダーへのエスカレーション、顧客連絡、切替え判断）も同じ系統で受ける [D]（RS-15#71）。
- D17-2 G3 までに確約が得られない場合は、案D（資格情報層を managed にし、M1〜M8 を満たす候補に限る。AS・STS・鍵・識別子・主体台帳は自社）に切り替える [D]。M1〜M8 を満たす候補もない場合は、DEC-4 と DL-42（Plan B）で再決裁する [D]。

### 2.18 決裁案（経営・事業・法務の決定が要る点。決定済みではない）

| # | 決裁事項 | 選択肢 | 推奨 | 帰結 | 決める人（案） | 期限 |
|---|---|---|---|---|---|---|
| K1-1 | D1〜D4 を不可逆原則として承認する | (a) 承認 (b) D1 だけ承認し D2〜D4 は製品選定後 | (a) | (b) では選定後に識別子が製品に結び付き、置換時に顧客 IdP 2,000 接続の再設定が残る [D][A-114] | CTO（DEC-3）＋CISO 同意 | G3 |
| K1-2 | SRE を単一系統 8 名以上（または 2 系統各 6 名以上）にする | (a) 確約 (b) 不承認 | (a) | (b) なら D17-2 により案D | 経営会議（DEC-4）＋人事責任者 | G3 |
| K1-3 | 有償サポート（RHBK または OEL）を契約する | (a) 契約 (b) コミュニティ版＋自社の追随 SLO | (a) | (b) では修正期限がなく、露出期間を CISO が受容する必要がある | CTO＋調達責任者 | G3（RFP） |
| K1-4 | AGPL-3.0（ZITADEL）を比較候補に残すか | (a) 残す (b) 外す | 法務判断 | (b) なら候補は 2 製品 | 法務責任者 | G3 |
| K1-5 | managed・製品ベンダー契約の退出条項（M4、D16-3）を必須条件にする | (a) 必須 (b) 交渉事項 | (a) | (b) では EU Data Act 前文 (82) により hash を持ち出せないおそれが残る | 法務責任者＋調達責任者 | G3 |

### 2.18a 未決の論点（整合調整で追加）

| # | 論点 | 対立している記述 | 本書への影響 | 決める場 |
|---|---|---|---|---|
| U1 | issuer の粒度 | ADR-007 KD7-1（テナント／realm 別）と ADR-021 K21-1（信頼区画別＋cell 別鍵＋専用 issuer 枠） | D4-1 の issuer の値、D16-2 の置換単位、TC-01-12 の評価対象 | DEC-3（CTO＋CISO）。05_adr/reconciliation-notes.md の U-01 |

- U1 がどちらに決まっても、本書の不可逆原則（D2 の自社ドメイン、D3 の主体台帳、D4 の信頼する issuer を自社 AS に限ること）は変わらない [D]。

### 2.19 TBD 一覧

| 項目 | 所有者 | 期限 | 決め方 |
|---|---|---|---|
| 認証・IdP、外皮・台帳の増員数（NA-001-3） | プラットフォームチーム長 | G3 | TC-01-08 の実測と DL-27 |
| 拡張予算の上限（D15-2） | プラットフォームチーム長 | G3 | TC-01-08 の実測 |
| 出口演習の合格基準（所要日数） | CTO | G3 | Data Act の移行期間 30 日を上限の参考にし、BIA と照合 |
| 1 万テナントでの issuer 粒度の実現性 | CTO | G3 | TC-01-12（ADR-021 と連動） |
| RHBK・OEL の費用と TCO の幅 | 調達責任者 | G3 | RFP の同一条件見積り（RS-15#74）。点推定だけを決裁資料に載せず、3 段の幅で示す [N][^58]（RS-15#69, #79） |

---

## 3. 検討した選択肢

各提案の案名の対応: 案D＝ops 提案の「案D（推奨）」＝sec 提案の「(d′)」＝evo 提案の「D1（fallback）」。案E＝evo 提案の「D2」に sec 提案の (d-sec) の統制と ops 提案の D1-06・D1-07・D1-11 を加えたもの [D]。

### 3.1 案A: managed 全面（人の認証と外部向け AS を managed。内部 STS だけ self-host）

| 項目 | 内容 |
|---|---|
| 概要 | managed CIAM（Entra External ID、Auth0 Enterprise＋HRI、Cognito、Google Identity Platform）を地域ごとのテナントで使い、外部 client への token 発行も任せる。内部 STS は従量課金のため self-host（D10） |
| 利点 | password・passkey・MFA・回復・bot 対策・SAML 解析の運用と脆弱性対応をベンダーが負う [D]。SLA の約束値は Cognito 99.9%、Google 99.95%、Auth0 Platform 99.99% [V][^28][^35][^23]（RS-15 結論 7、#42, #50, #56）。Entra ID の SLA 実績は大半の月で 99.998〜99.999%（全顧客合算）[M]（RS-15#38）。MSRC はクラウド脆弱性に CVE を発行する方針 [V][^22]（RS-15#40） |
| 欠点 | FAPI 2.0 の認定記録は Auth0 HRI の mTLS 列だけで、DPoP・Message Signing の列はない [N][^3][V][^25]（RS-15#5, #45）。所在地は作成時に固定 [V][^19]（RS-15#36）。hash の export は Auth0 が審査付き・ETA なし、Cognito と Entra は未確認 [V][^24]（RS-15#39, #44, #53）。ベンダーが鍵 rotation を主導し [V][^50]（RS-05#41）、cell 別 KMS 鍵・テナント別 issuer（ADR-007）と opaque 状態 push（ADR-005 D1-3）を満たせるかは未確認。SLA の救済はサービスクレジットで上限がある [V][^23]（RS-15#42） |
| 主要リスク | ATK-08・ATK-09・ベンダーの鍵スコープの誤りが、自社では予防も検証もできない残余になる（§1.4 の Storm-0558、CVE-2025-55241、Okta support）[I][^59][^60][^62]。1 ベンダーの障害で全利用者の新規ログインが止まる [I][^63]。Entra のバックアップ認証系は home tenant の利用者だけが対象で B2B/B2C は対象外 [V][^66]（RS-09#27） |
| 費用・要員の桁 | MAU 課金は federation 分を含め年 5.4 万〜39.0 万ドル（基準: Google 7.2 万、Cognito Essentials 10.2 万、Entra 19.0 万、Entra＋Go-Local 30.7 万）[D][A-004, A-082]（RS-15#73）。内部 token を token 単位課金に載せると token exchange だけで月約 288 万ドル（RS-15#75）なので D10 で self-host。要員の削減は主に認証・IdP 5 名分とその on-call の範囲 [D][A-054]（RS-15#76） |
| 可逆性 | 低い。issuer がベンダードメインだと 300 サービスの検証設定が変わる。hash を出せない製品からは JIT 移行になり、全員が一度サインインするまで旧系を止められない [D]（RS-15#60） |
| 勝つ条件 | (1) 要員を確約できない（A-054 の低値 15）、(2) FAPI 2.0 の対象がない（A-081 が 0）、(3) 候補が M1〜M8 と顧客管理鍵・テナント別鍵スコープ・cell 別署名鍵を契約で満たす、の 3 つが同時に成り立つ場合 [D]。§4.3 の「要員最優先」の重みでは首位になる |

### 3.2 案B: self-host OSS 全面（識別子は自社ドメイン、外皮と主体台帳は持たない）

判定者の指摘を受け、evo 提案の「製品の既定のまま運用」から、識別子を自社ドメインに置く公正な案に書き直した [D]。

| 項目 | 内容 |
|---|---|
| 概要 | Keycloak（RHBK）などを cell ごとに self-host し、資格情報・federation・AS・token exchange を 1 製品で賄う。issuer と RP ID は自社ドメインに置くが、path・`sub`・利用者 ID は製品の形式に従い、製品の利用者ストアを正本にする |
| 利点 | 1 製品・1 スキルセットで済み、依存側が学ぶ対象が 1 つ [D]。鍵・資格情報・監査・claim の意味を自社で統制でき、conformance・pentest・ソース監査を自社と第三者が実行できる [D]。Ory は hash と passkey の import/export がそろう [V][^14][^15]（RS-15#23）。外皮・台帳の自作がない分、案E より作る部品が少ない [D] |
| 欠点 | FAPI 2.0 の認定記録がない [N][^3]。修正期限・多リージョンは有償版だけ [V][^8][^12]（RS-15#14, #21）。年 4 回の minor 更新への追随 [V][^6]（RS-15#12）。製品固有の path（issuer の path、SAML metadata 内の URL）と内部 ID が外に出るため、製品を置換すると issuer の path や `sub` が変わり、RP と顧客 IdP の再設定が要り得る [D][A-114] |
| 主要リスク | FAPI AM の範囲外と ATK-18・ATK-19 を自社の運用で負う（N-f）。login 面（credential stuffing、SMS、回復の悪用）を自社 on-call が直接受ける。SRE 6 名・2 系統は RS-15#70 の目安を下回る [D][A-054]（RS-15#71） |
| 費用・要員の桁 | ライセンスは RHBK・OEL の非公開価格（RS-15#14, #74）。インフラは 4 cell×本番・非本番 [D][A-063]。SRE は単一系統 8 名以上（NA-001-3）。要員費は A-054 全体で年 2.4 億〜4.8 億円の桁で、MAU 課金より 1 桁大きい [D][A-054]（RS-15#76） |
| 可逆性 | 中程度。データは手元にあるが、識別子の path と `sub` が製品に結び付く [D] |
| 勝つ条件 | TC-01-01・TC-01-02 で外皮の前提（任意 issuer 文字列、製品 URL の非露出、DPoP/mTLS/PAR との整合）が崩れた場合、または外皮・台帳の開発保守費が置換 1 回分の再設定費を上回ると見積もられた場合 [D]。§4.3 の ops 寄りの重みでは案E と 1 点差 |

### 3.3 案C: OpenID 認定ライブラリ上の自社 AS（node-oidc-provider 等）

| 項目 | 内容 |
|---|---|
| 概要 | 認定ライブラリを AS core とし、管理面・利用者ストア・回復・多リージョンを自社で作る |
| 利点 | FAPI 2.0 の全 7 構成で認定記録を持つ唯一の候補 [N][^3]（RS-15#4）。DPoP、PAR、mTLS、JAR、JARM、RAR に対応 [V][^17]（RS-15#32）。issuer・Signer・claim を最も自由に制御できる [D] |
| 欠点 | password 保管と回復を自作に近い形で持ち、D1（R-203）とレビューの原則不承認に当たる [D][^1]（L227）。認定の名義は個人で、サポート対象は v9.x だけ [V][^18][N][^3]（RS-15#32, #33） |
| 主要リスク | bus factor（R-139）が上流の個人と自社の少数専門家の二重にかかる。自作の回復・資格情報ストアが ATK-09・ATK-13 の主な攻撃面になる [D]（RS-12 §2-6） |
| 費用・要員の桁 | ライセンス費 0（MIT）[V]（RS-15#74）。管理面・回復・ストアの開発保守と第三者評価が加わり、桁は TBD（DL-33）[D] |
| 可逆性 | 識別子は自社で持てるが、自作したストアの移行ツールも自作になる [D] |
| 勝つ条件 | FAPI 2.0 の DPoP 構成と Message Signing が多数の顧客の契約要件になり（A-081 が高側 200 以上）、OSS 製品がすべて conformance に不合格の場合。その場合も範囲を FAPI 範囲の AS と STS に限り、D1-5 の例外審査を通す（本書では D10-2・D12-2 として部分的に取り込む）[D][A-081] |

### 3.4 案D（fallback）: 資格情報層は managed、AS・STS・識別子外皮・主体台帳は自社

| 項目 | 内容 |
|---|---|
| 概要 | 自社で認証する利用者の password・passkey（AAL2 まで）・MFA・回復・bot 対策を managed CIAM（地域ごとの独立テナント）に任せ、cell の自社 AS がそれを上流 IdP として broker する。D2〜D5、D8、D10、D11、D14 は案E と同じ |
| 利点 | 攻撃にさらされる login 面と回復の運用をベンダーが負う [D]。managed 側の障害・侵害・乗換えの影響は、自社で認証する 47.5 万人の新規ログインと回復、AS の上流設定 1 か所に限られ、federation 利用者（B2B の 75%）と従業員は影響を受けない [D][A-115, A-082] |
| 欠点 | ログイン経路が 2 hop の直列になり、新規ログインの可用性が A-091 の上側（99.95%）を下回り得る（managed の SLA 99.9〜99.95% と AS 層の積）[D][A-091]（RS-15#50, #56）。passkey が 2 か所（AAL2 は managed、AAL3 は AS）に分かれる。製品・契約・脆弱性監視が 2 系統になる [D] |
| 主要リスク | password hash が managed に残り、出口が M1・M2 に依存する。EU Data Act 前文 (82) により、契約で明示しなければ持ち出せないおそれ [N][^55]（RS-15#66, #68）。ATK-08・ATK-09 が資格情報と回復について自社では検証できない残余として残る（補完統制は影響範囲の限定が中心）[D] |
| 費用・要員の桁 | 資格情報層の MAU 課金は、federation 利用者を除く直接認証 MAU 235,250 [D][A-004, A-082]（RS-15#72）に単価を当てて、Google 月約 897 ドル（年約 1.1 万）、Cognito Essentials 月約 3,379 ドル（年約 4.1 万）、Entra Basic 月約 5,558 ドル（年約 6.7 万）、Entra＋Go-Local（日本 85% 分）年約 11.5 万ドル。年約 1.1 万〜11.5 万ドル（NA-001-1 で約 160 万〜1,720 万円）の桁 [D][V][^34][^27][^21]（RS-15#35, #48, #56）。Auth0 は定価非公開（RS-15#41）。SRE は単一系統 8 名（案E と同じ水準）[D]（RS-15#70）。案E との要員差は「managed が減らす on-call と運用作業」で決まり、TC-01-08 で実測する（NA-001-2 なら 1 名あたり年 0.1 億〜0.2 億円）[D] |
| 可逆性 | 高い。D2・D3 があれば資格情報層の切替えも戻しもテナント単位で行え、300 サービスと外部 client は影響を受けない [D] |
| 勝つ条件 | (1) K1-2（SRE 確約）が不承認、(2) TC-01-08 で managed が減らす on-call が 2 名分以上、(3) managed 候補が M1〜M8 を契約で満たす、のいずれか（(3) は (1) か (2) と併せて）[D] |

### 3.5 案E（採用）: 識別子外皮＋主体台帳＋cell 内 self-host OSS（AS・資格情報層）＋認定ライブラリによる FAPI・STS の補助

| 項目 | 内容 |
|---|---|
| 概要 | §2 の D1〜D17 |
| 利点 | 業務 API の信頼の起点（鍵、issuer、claim の意味）を自社が持ち、独立に検証できる [D]。上流 IdP（managed を含む）が侵害されても allowlist、step-up、IdP 単位の遮断で封じ込められる [D]（RS-14 §2-4）。製品を置換しても外部の RP、顧客 IdP、利用者の passkey に変更を求めない見込み（TC-01-01〜03 で確認）[D]。hash・passkey の export 可否と資格情報ストアの監査可否を自社で確かめられる [D] |
| 欠点 | 運用対象が最も多い（4 cell×（AS＋資格情報層＋STS＋edge 写像＋主体台帳）。FAPI 範囲で 2 製品を併用する場合はさらに増える）[D]。edge 写像と主体台帳という自作部品が増え、cell 化しなければ全テナントに効く単一障害点になる [D] |
| 主要リスク | FAPI AM の範囲外と ATK-19 を自社で負う。外皮の写像が新たな攻撃面（issuer の混同）になり得る（TC-01-02、第三者 pentest）[D] |
| 費用・要員の桁 | 有償サポート（RHBK/OEL）は RFP で見積り（TBD）。インフラ 4 cell。SRE 単一系統 8 名以上（NA-001-3）。外皮・台帳の開発保守と認証・IdP の増員は TBD（NA-001-3）。要員費は A-054 全体で年 2.4 億〜4.8 億円の桁＋増員分 [D][A-054]（RS-15#76） |
| 可逆性 | D1〜D4 は不可逆。製品の選択はテナント単位で戻せる（§3.6） |
| 勝つ条件 | K1-2 の確約、D13 の足切りに合格する候補の存在、TC-01-01・02 で外皮の前提が成り立つこと [D] |

### 3.6 比較の要約と可逆性

| 案 | 識別子・台帳 | 資格情報層 | AS・STS | 自社で作る追加部品 | 追加費用の主項目 |
|---|---|---|---|---|---|
| A | ベンダー（自社 custom domain は可） | managed | managed（STS は自社） | なし | MAU 年 5.4 万〜39.0 万ドル |
| B | 自社ドメイン、path・ID は製品依存 | self-host | self-host | なし | SRE +2 名以上、更新追随、有償サポート |
| C | 自社 | 自作 | 認定ライブラリ | 管理面・ストア・回復 | 開発保守（TBD）、第三者評価 |
| D | 自社（外皮＋台帳） | managed | self-host | edge 写像、主体台帳 | MAU 年 1.1 万〜11.5 万ドル、外皮・台帳の開発保守（TBD）、SRE 8 名 |
| E（採用） | 自社（外皮＋台帳） | self-host | self-host（FAPI・STS は認定ライブラリで補助） | edge 写像、主体台帳 | 外皮・台帳の開発保守（TBD）、cell 化、SRE +2 名以上、有償サポート |

| 決定 | 可逆性 | 理由 |
|---|---|---|
| D1 自作しない原則 | 不可逆（原則） | 例外は D1-5 で個別に扱う |
| D2 識別子外皮 | 不可逆 | 一度相手に配った識別子は 20 年残る [D][A-100] |
| D3 主体台帳 | 不可逆 | `sub` の再発行は全 RP の再 linking を伴う [D] |
| D4 信頼する issuer の範囲 | 不可逆 | 300 サービスの検証規則と SDK の前提になる [D] |
| D6〜D7 製品の選択、D9・D17 の managed 配分 | 可逆（テナント単位） | D2・D3 を前提に D16 の方法で移す [D] |
| D12-2 FAPI 範囲の AS の分離 | 可逆 | issuer 単位で切り替える [D] |

---

## 4. 評価

### 4.1 評価軸（evo レンズの重みを基準にする）

| # | 軸 | 重み | 何で測るか（RS-15#77 と対応） |
|---|---|---|---|
| E1 | 置換可能性・退出可能性 | 20 | hash・passkey・MFA の export、テナント単位の移行 |
| E2 | 識別子の永続性 | 15 | issuer・RP ID・entityID・redirect URI・path を製品に依存させずに置けるか |
| E3 | 鍵の主権・暗号の俊敏性 | 15 | cell KMS での署名、alg の切替、PQC |
| E4 | 単一企業依存の回避・標準の寿命 | 10 | ライセンス、財団、fork 可能性 |
| E5 | プロトコル適合 | 10 | 採用版での OIDF/FAPI 2.0 conformance |
| E6 | 所在地・cell 適合 | 10 | 所在地の固定、cell 独立 |
| E7 | 要員・運用負荷 | 10 | A-054 と RS-15#70 の差、自社 on-call が受ける部品数 |
| E8 | 費用 | 5 | RS-15#73〜#76、自作部品の開発保守 |
| E9 | 自作量（R-203） | 5 | D1 との適合 |
| 足切り | D1 の原則を守れるか | — | 案C は password 保管と回復の自作で不適合 |

### 4.2 採点（統合起草者の採点。1〜5、100 点換算＝Σ(重み×点)/5）

| 軸（重み） | A | B | C | D | E |
|---|---|---|---|---|---|
| E1（20） | 1 | 3 | 4 | 3 | 4 |
| E2（15） | 2 | 3 | 5 | 4 | 4 |
| E3（15） | 1 | 4 | 5 | 4 | 4 |
| E4（10） | 1 | 4 | 1 | 2 | 4 |
| E5（10） | 2 | 3 | 5 | 3 | 3 |
| E6（10） | 3 | 4 | 4 | 3 | 4 |
| E7（10） | 5 | 2 | 1 | 3 | 2 |
| E8（5） | 3 | 4 | 3 | 4 | 3 |
| E9（5） | 5 | 4 | 1 | 4 | 3 |
| 合計（100 点換算） | 43 | 67 | 72（足切りで除外） | 66 | 72 |

- 採点は §1.3 と §3 による [D]。案E の E5 が 3 なのは、Keycloak に FAPI 2.0 の認定記録がないためである（RS-15#6）[D]。案E の E8・E9 は、edge 写像と主体台帳を自作する分だけ案B より低くした（判定者の指摘による）[D]。
- 案B を公正な案に書き直したので、案B と案E の差は 5 点になった。差は E1（テナント単位の置換）と E2（path・`sub` の製品非依存）から生じている [D]。

### 4.3 感度（重みの合計はいずれも 100）

| 重みの設定 | E1 | E2 | E3 | E4 | E5 | E6 | E7 | E8 | E9 | A | B | D | E | 首位 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| evo（基準） | 20 | 15 | 15 | 10 | 10 | 10 | 10 | 5 | 5 | 43 | 67 | 66 | 72 | E |
| ops 寄り | 10 | 10 | 10 | 10 | 10 | 10 | 25 | 10 | 5 | 56 | 64 | 65 | 65 | D・E 同点 |
| 要員最優先 | 5 | 5 | 5 | 10 | 10 | 10 | 35 | 10 | 10 | 67 | 62 | 64 | 60 | A |

- 要員の重みを 35 にした設定で案A が首位になる [D]。これは D17 の要員ゲートが判断を左右することを示す [D]。
- ops 寄りの重みでは案D と案E が同点になる。差をつけるのは TC-01-08（managed が減らす on-call の実測）である [D]。

### 4.4 judge panel の採点（判定者×提案×6 軸、各 1〜5）

判定者は AI エージェント 3 名で、実在の CTO/CISO ではない（CONVENTIONS §8）[D]。

| 判定者 | 提案 | 要求網羅 | リスク低減 | 規模での実現性 | 進化・出口 | 証拠の質 | 可逆性・費用 | 計 | 判定者の勝者 |
|---|---|---|---|---|---|---|---|---|---|
| J1 | sec | 4 | 5 | 3 | 4 | 3 | 3 | 22 | evo |
| J1 | ops | 4 | 4 | 5 | 3 | 5 | 4 | 25 | |
| J1 | evo | 5 | 4 | 3 | 5 | 4 | 4 | 25 | |
| J2 | sec | 5 | 5 | 3 | 4 | 4 | 3 | 24 | sec |
| J2 | ops | 4 | 3 | 4 | 3 | 5 | 4 | 23 | |
| J2 | evo | 4 | 4 | 3 | 5 | 3 | 4 | 23 | |
| J3 | sec | 4 | 5 | 2 | 4 | 3 | 3 | 21 | ops |
| J3 | ops | 4 | 4 | 4 | 3 | 4 | 4 | 23 | |
| J3 | evo | 5 | 4 | 3 | 5 | 4 | 4 | 25 | |
| **合計** | sec | 13 | 15 | 8 | 12 | 10 | 9 | **67** | 1 票 |
| | ops | 12 | 11 | 13 | 9 | 14 | 12 | **71** | 1 票 |
| | evo | 14 | 12 | 9 | 15 | 11 | 12 | **73** | 1 票 |

票は 1 票ずつに割れ、得点の合計で evo が勝者になった [D]。

### 4.5 判定者間の不一致

| 論点 | 不一致の内容 | 本書での扱い |
|---|---|---|
| 何を最重視するか | J1 は進化・出口（evo）、J2 はリスク低減と攻撃者モデルの網羅（sec）、J3 は規模での実現性と運用（ops）を勝者の理由にした | 勝者 evo を土台にし、sec の統制（D1-4・D1-5、D4-3、D13、TC-01-13・14）と ops の運用設計（D5、D8、D14、D17）を取り込んだ |
| sec の実現性 | J1・J2 は 3、J3 は 2。運用対象の多さと、E7 の重み 7 の低さの評価が分かれた | E7 を 10 とし、要員ゲート D17 を判定条件にした |
| ops のリスク低減 | J1・J3 は 4、J2 は 3。password hash と回復を managed に置く残余（ATK-08/09）の重さで分かれた | 案D を fallback とし、M1〜M8 を足切りにした |
| evo の証拠の質 | J1・J3 は 4、J2 は 3。RS 番号の誤参照と脚注の不備の重さで分かれた | §4.6 で修正した |
| 案B の扱い | 3 名とも evo の案B が藁人形であると指摘した | 識別子を自社ドメインに置く公正な案に書き直し、外皮・台帳の追加費用を §3.6 に明示した |
| 外皮・台帳の単一障害点 | J1・J2・J3 とも、全テナントに効く自作部品になり得ると指摘した | cell ごとに置くこと（D2-2、D3-3）、TC-01-09・TC-01-19、T-09 を追加した |

### 4.6 判定者が指摘した事実誤りと修正

| 提案 | 指摘 | 確認結果と本書の扱い |
|---|---|---|
| sec §4.2 | 加重合計の計算誤り | 表の点数から再計算すると (a) 197、(b) 326、(c) 316、(d-sec) 386、(d′) 325 になる（記載は 189／323／314／383／323）。順位は変わらない。本書は §4.2 の統合採点を使う |
| sec §4.4 | 感度の計算誤り | E7 を 20 にして E1 から差し引くと (d-sec) 360、(a) 223、(d′) 325（記載 357／213／323）。E1 で (a) を 4 にすると 247（記載 239） |
| sec §3.1 | token exchange の課金を「月 100 万ドル級」と過小に記載 | RS-15#75 は Entra の M2M 単価を当てて月約 288 万ドルとしている。D10-1 と §3.1 で修正した |
| sec 脚注 [^42] | W3C VC 2.0 の確認日が文書の最終更新日より後で、research に未収載・独立検証なし | 本書では VC 系仕様の状態を主張せず、未確認・新規調査項目として DL-115 に回した（§1.7） |
| evo §3.1 | SLA の根拠を RS-15#7 と誤参照 | RS-15#7 は FAPI1 Advanced の認定一覧の項目である。SLA の根拠は RS-15 結論 7、#42（Auth0）、#50（Cognito）、#56（Google）に修正した |
| evo D6-2 M7 | MSRC 方針の脚注がプレースホルダ | RS-15#40 の原典に正式な脚注番号（[^22]）を付けた |
| evo D8-3 | ML-DSA（RFC 9964）の根拠表示がない | RS-05#63 と脚注 [^51] を付けた |
| evo §4.3 | 感度表の重みの扱いが 100 点換算と並べにくい | 重みの合計を 100 にそろえ、全案を再計算した（§4.3） |
| evo §3.1 | 「要員の重みが 35 を超えると首位」と表の記述が不一致 | 「35 にした設定で首位」と記述を合わせた |
| ops RH-001-B | 要員費の増分「年 0.3 億〜1.0 億円」が本文の人数差と合わない | 本書では案間の要員差を数値で置かず、TC-01-08 の実測で決める（§3.4、NA-001-3）とした |
| ops §1.1 | Okta の鍵 rotation の性質を managed 全般に一般化 | 本書では Okta の事実として記載し（§1.3）、他ベンダーは未確認として扱う |

---

## 5. 決定理由と棄却理由

**案E を採る理由**: 20 年で置換が 1 回以上起きる前提（A-104）では、置換の費用を決めるのは製品より識別子・鍵・主体台帳の所有である [D][A-104]。D2・D3 を自社が持てば、製品の選択と managed の配分をテナント単位で戻せる [D]。業務 API の信頼の起点を自社 cell の AS に固定すると、次の 3 つが同時に成り立つ [D]。(1) Storm-0558 型の鍵スコープの誤りと CVE-2025-55241 型の内部 token の越境を、自社の検証規則（D11-1）と第三者評価で検証できる。(2) 上流 IdP（managed を含む）の侵害を broker の統制で封じ込められる。(3) 出口で業務 API 側を改修しなくて済む。資格情報層も self-host にするのは、2026-10-03 時点で M1・M2 を満たす managed 候補を確認できず、hash と passkey の export 可否と資格情報ストアの監査可否を自社で確かめられるからである [D]（RS-15#44, #53, #60）。

**棄却した案（traceability/rejected-hypotheses.md へ集約する）**

| ID（仮） | 棄却した仮説 | 理由 | 再評価の条件 |
|---|---|---|---|
| RH-001-A | managed を AS・IdP として全面採用すれば、保証と運用の両面で最も有利 | ベンダー内部の鍵スコープ、内部 token、support 経路の誤りが自社では検証できない残余になる [I][^59][^60][^62]。FAPI 2.0 の DPoP 構成の認定記録がない [N][^3]。hash の export が審査付きか未確認 [V][^24]（RS-15#39, #53）。ADR-007 の cell 別鍵・テナント別 issuer と ADR-005 の状態 push を満たせるか未確認 [D] | §3.1 の 3 条件が同時に成り立つ（T-01、T-05） |
| RH-001-B | self-host OSS を製品の識別子・ID 体系のまま全面採用すれば十分 | 識別子の path と `sub` が製品に結び付き、置換時に RP・顧客 IdP の再設定が残る [D][A-114]。外皮・台帳を足せば案E になる | 外皮の前提が崩れた場合（T-03） |
| RH-001-C | 認定ライブラリの上で利用者ストアと回復まで自社で作る | D1（R-203）とレビューの原則不承認に当たる [D][^1]（L227）。bus factor が二重にかかる（RS-15#33） | FAPI 範囲と STS に限り D1-5 を通る部品だけ（D10-2、D12-2） |
| RH-001-D | 資格情報層を managed にする 2 層構成を第一案にする | M1・M2 を満たす候補を確認できず、出口が契約と JIT 移行に依存する（RS-15#44, #53, #60）。2 層直列で新規ログインの可用性が A-091 の上側を下回り得る [D][A-091] | D17-2 の要員ゲート不成立、TC-01-08 で on-call 削減が 2 名分以上、M1〜M8 を満たす候補の出現（T-01、T-06、T-05） |
| RH-001-D″ | managed AS の token を自社 STS で交換すれば十分 | 外部境界の issuer がベンダーのままで、§3.1 の主要リスクが残る [D] | T-05 |
| RH-001-F | B2B federation を managed 側で終端する | 約 2,000 接続の顧客側の設定がベンダーの entityID 形式に結び付き、乗換えのたびに再設定が要る [D][A-114] | managed が自社ドメインの entityID・ACS を任意に設定でき、その設定の export も契約で保証される場合 |
| RH-001-G | 第 2 の managed IdP へ自動 fallback する | 分散 fallback は障害を悪化させる [V][^65]（RS-09#14） | — |
| RH-001-H | OIDF 認定のロゴがあれば採用版の適合を示せる | 認定は特定の版と日付の記録で、現行版の適合を示さない [D]（RS-15#8） | — |
| RH-001-I | 認可を通った証拠として `traceparent` を token に入れる | 署名されておらず外部から注入でき、trace-id の衝突を偽造され得る [N][^47]（RS-10#17）。`jti`・`txn`・判定記録 ID と監査記録で代える [D] | — |
| RH-001-J | 上流 IdP が返す `amr` をそのまま AAL3 の根拠にする | 同期型認証器は AAL3 で SHALL NOT [N][^37]。Entra の amr は同期とデバイス固定を区別しない [V][^49]（RS-03#15, #27） | — |

---

## 6. 帰結

### 6.1 良い帰結

- 製品を置換するとき、外部の RP、顧客 IdP、利用者の passkey に変更を求めずに済む見込みがある（TC-01-01・03・04 で確かめる）[D]。
- 業務 API の検証規則（iss、kid、typ の結合）を cell の AS の鍵に限って固定でき、cell 別鍵（ADR-007）と所在地（A-063）を製品に依存せず満たせる [D]。
- conformance（G-089）、pentest（G-083）、鍵の ceremony（G-085）を自社の資産として実施し、証拠を残せる [D]。
- claim profile（§1.7）を自社の契約標準（ADR-022、DL-115）として管理でき、相関 ID の 3 層を監査記録で結合できる [D]。
- ベンダーの価格改定や SLA の不利な変更に対して交渉の余地が残る [D]。

### 6.2 悪い帰結

- SRE の増員（最低 +2 名）と、年 4 回の minor 更新を 4 cell×本番・非本番で追随する工数が要る [D][A-054]（RS-15#12, #70）。
- edge 写像と主体台帳という自作部品が増え、cell 化と pentest の対象が増える [D]。
- FAPI 範囲で 2 製品を併用する場合、攻撃面と試験の対象が増える [D]。
- managed の SLA とクレジットの枠組みがなく、可用性の責任をすべて自社が負う [D][A-091]。
- Keycloak の FAPI 2.0 認定がないため、自社で conformance を回す費用がかかる（OIDF の FAPI 認定料は非会員 5,000 ドル）[N]（RS-15#2）[D]。

### 6.3 残余リスクと受容者案

| # | 残余リスク | 補完統制 | 受容者案 |
|---|---|---|---|
| RR-01 | FAPI AM の範囲外（AS への RCE、DB 設定不備）[N][^41] | 有償サポートの修正期限、WAF、DB の暗号化と最小権限、第三者 pentest | CISO |
| RR-02 | self-host の変更による停止（ATK-19） | cell 単位の段階展開（D11-4）、既知良好版への復帰（ADR-013、ADR-023） | CTO＋事業責任者（BIA） |
| RR-03 | 上流 IdP の侵害（ATK-04）によるそのテナント内のなりすまし | 期待 IdP の allowlist、高リスク操作での step-up、IdP 単位の遮断（D4-3） | CISO＋顧客（責任分界 DL-50） |
| RR-04 | OSS の供給網侵害（ATK-18） | SBOM、署名検証、有償版の配布経路、更新の遅延窓 | CISO |
| RR-05 | コミュニティ版の修正期限がない（K1-3 で (b) を選んだ場合） | 自社の追随 SLO | CISO |
| RR-06 | 主体台帳・edge 写像の障害 | cell 化、静的安定性（D14）。台帳停止中は新規登録・linking 変更ができない | CTO |
| RR-07 | 外皮の写像による issuer の混同 | TC-01-02、第三者 pentest | CISO |
| RR-08 | 拡張コードによる lock-in | D15 の予算と契約試験。予算内の拡張は移行時に書き直しが要る | プラットフォームチーム長 |
| RR-09 | 要員不足による on-call の破綻（A-054） | D17 のゲートと案D への切替え | 経営会議（DEC-4）＋人事責任者 |
| RR-10 | 案D に切り替えた場合の managed からの hash 持出し不能と support 経路の漏えい [I][^62] | M1〜M8、JIT 移行の準備、managed の session を AS の session と分ける | CTO＋法務責任者／CISO |

### 6.4 依存サービス・連携開発者への影響

- 依存サービス（約 300）は D2 の自社 endpoint、ADR-005 の検証規則、共通 PEP SDK だけに依存し、製品名を知らない [D][A-050]。製品の差替えは連携契約を変えない（G-120）[D]。
- 上流 IdP の token を直接受け付けるコードと、managed の SDK・hosted UI の直接組込みは禁止し、CI で検出する（D4-2、G-072）[D]。
- 連携開発者向けの契約には issuer、JWKS、claim profile を版付きで載せる（ADR-022、DL-75、DL-115）[D]。
- 顧客 IdP の管理者は、自社ドメインの entityID・ACS・redirect URI を一度だけ登録する [D][A-114]。
- 既存の 12 ユーザーストア（A-111）の移行は ADR-027 と DL-31 に委ねる。hash の import には製品ごとの上限がある [V][^30]（RS-15#52）[D]。

### 6.5 運用・要員への影響

- on-call は単一系統 8 名以上（または 2 系統で各 6 名以上）とし、cell ごとに AS・資格情報層・STS・edge 写像・主体台帳を受け持つ [D]（RS-15#70）。1 シフトあたりのインシデント件数を RS-15#70 の「最大 2 件」と比べて DL-27 に反映する [D]。
- 年 4 回の minor 更新（RS-15#12）を DL-33 の費目「更新追随」に、年 1 回の出口演習を運用の年間計画に入れる [D]。
- 障害時の連絡経路と break-glass は AS にも資格情報層にも依存させない（ADR-008、RS-09 §2-11）[D]。
- 有償サポートの契約と、ベンダーへのエスカレーション手順が要る [D]。

---

## 7. 検証

### 7.1 PoC で確かめる仮説と TC 案

TC 番号は仮番で、DL-22 で採番する。判定者の条件に出る各提案の仮番（TC-001-xx、TC-ADR001-xx）は本書の TC-01-xx に読み替えた [D]。

| TC（仮番） | 仮説 | 合否基準 | 根拠・連動 |
|---|---|---|---|
| TC-01-01 | Keycloak と node-oidc-provider を同じ issuer 文字列・同じ自社 endpoint の背後で差し替えても、RP は設定を変えずに動く。discovery、SAML metadata、redirect、エラー応答に製品固有の URL が出ない | RP 側の設定差分 0 件、製品固有 URL の露出 0 件、OIDC conformance の RP 試験が全件合格 | D2、D13-1-6 |
| TC-01-02 | edge 写像が DPoP の `htu`、mTLS の証明書束縛、PAR の `request_uri`、issuer の一致（RFC 9207）と矛盾しない | 正例の失敗 0 件。issuer の混同・別 cell の issuer を使う負例の受理 0 件 | D2-3、ADR-005 D11-4 |
| TC-01-03 | SAML/OIDC の broker 製品を差し替えても、顧客 IdP（Entra、Okta、ADFS、Google）の再設定が要らない | 再設定 0 件 | D5、A-114 |
| TC-01-04 | 合成 100 万人（hash、TOTP、passkey 記録、federation の linking）を Keycloak・Ory で往復 export・import できる | hash の互換率、同じ RP ID での passkey の継続利用率、所要時間を記録。目標値は TBD（ADR-018、BIA に紐付け） | D7-3、RS-15 §5.2-2、G-070 |
| TC-01-05 | AS が cell KMS の非エクスポート鍵で署名でき、cell 別・種別別に分けられる | 鍵材料がプロセスのメモリ・ディスクに平文で出ない。署名の p99 と QPS を A-043 と照合（閾値 TBD、ADR-007 と連動）。不合格なら D11-2 | D11、ADR-007 |
| TC-01-06 | 採用版で OIDC（Basic、Config、Form Post）と FAPI 2.0 SP（mTLS・DPoP）・Message Signing に合格する | 全プロファイル合格。ログを証拠（E7）として保存。node-oidc-provider を対照に置く | D12、G-089 |
| TC-01-07 | AS が opaque token の発行・失効状態を cell 内ストアへ push できる | ADR-005 H-02・H-04 の基準（整合調整で修正） | ADR-005 D1-2 |
| TC-01-08 | on-call 負荷と更新追随の工数を系統別に実測する。案D 構成（資格情報層 managed）と案E 構成の差を比べる | PoC 期間の alert・インシデントを系統別に記録し、RS-15#70 の「1 シフト 2 件」と比べる。差が 1 名分未満なら案E、2 名分以上なら案D を強める（T-06） | D17、RS-15#70 |
| TC-01-09 | 上流 IdP・資格情報層・主体台帳・edge 写像のいずれかを止めても、既存 session、refresh、token 検証が続く | 停止注入中の既存 session の失敗 0 件。判定系の停止時間が A-090 の帯に収まる | D14、RS-09#10 |
| TC-01-10 | AAL3 階層で AS が device-bound WebAuthn を検証する（BE フラグ、attestation） | 同期 passkey による AAL3 step-up が拒否される | D8、RS-03#15, #27 |
| TC-01-11 | §1.7 の claim 要件（`jti` の発行記録、`txn`、`cnf`、上流 `amr` の上書き、テナント context）を、AS core を改変せず D1-4 の例外なしで満たす | 要件の未充足 0 件 | D13-1-5、RS-04#60、RS-06#31 |
| TC-01-12 | 1 万テナントのテナント別 issuer（ADR-021）と 2,000 federation 接続を管理 API で運用できる | 接続の追加・証明書の更新・切離しを API で行え、性能劣化が TBD 以内（DL-58） | A-007、A-082、A-114 |
| TC-01-13 | 他 cell の鍵・別の typ・別の issuer の token を、全 SDK が拒否する（Storm-0558 型の負例） | 負例の受理 0 件 | D11-1、G-088 |
| TC-01-14 | 上流 managed IdP の侵害を想定し、IdP の遮断、allowlist 外の発行者の拒否、高リスク操作での step-up が効く | 拒否・遮断の欠落 0 件。遮断までの時間は TBD（BIA） | D4-3、ATK-04 |
| TC-01-15 | 日本 cell の停止が EU cell のログインに影響しない | 影響 0 件 | D6-1、ATK-12 |
| TC-01-16 | AS の minor 更新を cell 単位で段階的に行える | 停止時間が A-091 の月間予算の TBD% 以内。工数を DL-33 の費目 (5) に入れる | RS-15#12, #16 |
| TC-01-17 | managed 候補（案D 用）が M1・M2 を満たす | 契約環境で実際に export を依頼し、所要日数と内容を記録 | D9-2 |
| TC-01-18 | 案D に切り替える場合の 2 層直列の新規ログイン可用性と p99 遅延 | 実測可用性が A-091 の下側（99.9%）以上、p99 は TBD | §3.4、T-08 |
| TC-01-19 | 主体台帳と edge 写像を cell 化した構成で、A-091 の可用性帯を満たす | cell をまたぐ単一障害点 0 件。実測可用性が A-091 の帯 | D2-2、D3-3、T-09 |

### 7.2 第三者評価で確かめること

- AS・IdP の設定、拡張点のコード、識別子外皮、主体台帳に対するコードレビューと pentest（cross-tenant、IdP mix-up、issuer の混同、assertion injection、linking の乗っ取り）（G-083、DL-59）。
- 採用版の OIDF conformance ログの独立確認と、FAPI 範囲で OIDF 認定を取得するかの判断（RS-15#2、G-089）。
- 鍵の ceremony への立会い（G-085）。
- 出口演習（D16-3）への独立立会人（G-070）。
- 案D に切り替える場合: managed ベンダーの第三者監査報告（SOC 2 Type II 等）と、契約条項（M4）の法務確認。

---

## 8. 再検討トリガーと見直し時期

- **定期見直し**: G3（PoC の結果確定時）。以後は A-101 の再決裁周期（初回 G6 開始から 3 年以内、以後 5 年以内）[D][A-101]。

| ID | 区分 | トリガー | 見直す決定・行き先 |
|---|---|---|---|
| T-01 | 組織 | G3 までに SRE 単一系統 8 名以上（または 2 系統各 6 名以上）が DEC-4 で確約されない | D17-2 により案D。AS・STS はどの案でも self-host になる（RS-15#75）ため、行き先は案A ではない。M1〜M8 を満たす候補もなければ DL-42 で再決裁 |
| T-02 | 実測 | 第一候補と対抗がどちらも D13 の足切り（FAPI 2.0 conformance、非エクスポート鍵署名、hash・passkey export、状態 push）に不合格 | 案D、または FAPI 範囲を node-oidc-provider 系に分ける（D12-2）。案C の限定採用は D1-5 の例外審査を通す |
| T-03 | 実測 | TC-01-01・TC-01-02 で、任意 issuer 文字列の受入れ、製品 URL の非露出、DPoP/mTLS/PAR との整合のいずれかが成り立たない | 外皮を「自社ドメインに置く」水準に縮め、案B・案D との差を再評価する |
| T-04 | 実測 | TC-01-04 で Keycloak の export に、アルゴリズム・パラメータ付きの hash と passkey 公開鍵 credential が含まれない | 対抗（Ory OEL）の比重を上げる。両方不合格なら T-02 |
| T-05 | managed の変化 | managed ベンダーが M1〜M8 に加え、顧客管理鍵、テナント別鍵スコープ、BYO 署名鍵、資格情報ストアの第三者監査報告と自社 pentest の許可を契約で保証する。または FAPI 2.0 の DPoP 構成の認定を取得する | 案D と案A を再評価し、E1・E3 を採点し直す |
| T-06 | 実測 | TC-01-08 で managed が減らす on-call が 2 名分以上（案D を強める）、1 名分未満（案E を強める） | D7、D17 |
| T-07 | 実測 | TC-01-05 で非エクスポート鍵署名ができず、D11-2 の代替もとれない | 鍵の主権の前提（ADR-007）を見直す。CISO の例外受容 |
| T-08 | 実測 | 案D に切り替えた後、新規ログインの実測可用性が A-091 の下側（99.9%）を下回るか、2 hop の p99 遅延が許容を超える | 資格情報層を cell 内 self-host に戻す（案E） |
| T-09 | 実測 | 主体台帳と edge 写像を cell 化しても A-091 の可用性帯を満たせない（TC-01-19） | D2・D3 の実装方式を見直す |
| T-10 | 前提 | A-081（高保証テナント）が 200 を超え DPoP 構成と Message Signing が広く契約要件になる、または 0 になる | 前者は FAPI 専用 AS core の比重を上げる。後者は D12-2 の併用をやめる |
| T-11 | 前提 | A-054 が低値 15 に近づく、A-063 にリージョンが増える、成長シナリオ（A-102）で規模が変わる | D17、D6-1 |
| T-12 | 標準の状態 | Transaction Tokens が RFC になる（`txn` の claim 名を固定し直す）。OAuth 2.1 が RFC になる。FAPI 2.0 の改版。CXP が Final になる（passkey の移送を前提にできる）。NIST IR 8547・SP 800-131A Rev.3 が final になる（D11-3）。OAuth/OIDC の後継標準が RFC/Final になる（RS-11#68〜#72） | D7-2、D10-3、D11-3、§1.7 |
| T-13 | 標準・顧客要求 | 外部発行の属性証明（W3C の Verifiable Credentials 系）を契約で求める顧客が現れる | §1.7。DL-115 と新規調査を起こす |
| T-14 | 製品の健全性 | 候補の OIDF 認定の取得・失効、CNCF での段階変更やアーカイブ、ライセンス変更（ZITADEL の AGPL 化と同種 [V][^16]（RS-15#28））、Red Hat・Ory のサポート方針の変更、Keycloak preview 機能の GA 化、修正期限のない Critical CVE が TBD 日を超えて未修正 | D6、D13 |
| T-15 | 契約 | managed の価格改定（AWS は 30 日前通知）、SLA の不利な変更（AWS は 90 日前通知）、機能廃止の通知 [V][^33]（RS-15#55） | 案D 採用時の資格情報層の製品 |
| T-16 | 規制 | EU Data Act 第 29 条の乗換え費用ゼロ化（2027-01-12）[N][^55]、DORA の出口要件の運用指針の改定、日本・米国の所在地規制の変更（A-062、A-063） | D9-2 M4、D16-3、D6-1 |

---

## 9. 依存関係

| 種類 | 対象 | 本書との関係 |
|---|---|---|
| ADR | ADR-002（保証レベル） | AAL3 階層は AS が検証（D8） |
| ADR | ADR-003（回復） | 回復の業務フロー（D1-3） |
| ADR | ADR-004（B2B federation） | AS 層での終端（D5）、期待 IdP、linking（D4-3） |
| ADR | ADR-005（token profile） | opaque と状態 push（D13-1-4）、D11-4 の必須機能（D13-2）、claim、sender constraint |
| ADR | ADR-007（鍵階層、DEC-3） | cell 別 KMS 鍵と Signer 抽象（D11）、テナント別 issuer、INV-1・INV-2 |
| ADR | ADR-008（管理面） | IdP 追加の保護操作、AS 管理者認証の循環依存 |
| ADR | ADR-009（workload・token exchange） | 内部 STS、Txn-Token の社内 profile（D10） |
| ADR | ADR-011・ADR-014（判定 API・監査） | 判定記録 ID、`jti`・`txn`・trace-id の対応付け（§1.7） |
| ADR | ADR-013・ADR-023（cell・静的安定性） | cell 独立（D6-1）、静的安定性（D14） |
| ADR | ADR-016（versioning） | claim profile の版 |
| ADR | ADR-017（非人間 ID） | 主体種別、委任の claim |
| ADR | ADR-018（出口） | export 形式、hash 方式（D7-3、D7-4、D16） |
| ADR | ADR-020（FAPI 適用範囲） | D12 の対象 |
| ADR | ADR-021（識別子、DEC-3） | D2・D3 の識別子形式 |
| ADR | ADR-022（契約標準、DEC-3） | claim の意味、G-120 |
| ADR | ADR-027（dual-run 移行） | テナント単位の置換（D16-2） |
| 設計文書 | DL-13（製品評価・出口）、DL-27（運用・要員）、DL-33（TCO）、DL-42（Plan B）、DL-115（claim 目録） | 評価表、要員、TCO の 3 段の幅、fallback、claim |
| 契約 | 11_contracts/ | 退出条項（M4、D16-3）、上流 IdP との trust agreement、有償サポート |
| 統制 | 01_governance/exception-risk-acceptance.md | D1-5 の例外記録 |
| 前提台帳 | 01_governance/assumptions-register.md | NA-001-1〜NA-001-6 の登録（本書では編集しない） |

---

## 対応表（R/G）

| ID | 内容 | 本書の節 | 閉じ方 | 状態 |
|---|---|---|---|---|
| R-094 | managed IdP か自営 AS か（認証プロトコル・認証器・回復は自作しない） | 要旨、§2（D1〜D17）、§3、§4 | A | 本書で閉じた（決裁前。選定は DL-13） |
| R-203 | 認証器・password・回復・AS 全面自作の原則禁止と例外審査要件 | D1-1〜D1-5、§2.18 K1-1 | B | 決裁案まで（DEC-3） |
| G-020 | ADR の必須節（文脈、選択肢、却下案と理由、決定、帰結、可逆性、再検討トリガー、証拠） | 本書全体（§1〜§9、メタ情報の可逆性） | A | 本書で閉じた（本 ADR 分。全 ADR は DL-12） |
| G-074 | 自作しない原則と例外審査要件の承認、候補ごとの適合認定・脆弱性対応・LTS・健全性の評価 | D1、D6、D13、§1.3、§3 | B | 決裁案まで（承認記録なし。候補全件の評価表は DL-13） |
| R-088 / G-005 | build/buy/managed の比較、代替案と勝つ条件 | §3、§4 | A | 本書で閉じた（評価表は DL-13） |
| R-089 | PoC | §7.1 | C | 要実測 |
| R-090 / R-091 / R-208 / G-070 | 出口戦略、データ移行可能性、過度依存の回避、export/import 演習 | D2、D3、D7-3、D9-2、D16、TC-01-04、TC-01-17 | A・C | 方針は本書で閉じた／演習は要実測 |
| R-092 / R-137 / R-139 / R-141 | 要員、on-call、bus factor、TCO | D17、§3、§6.5、NA-001-3 | B | 決裁案まで（DEC-4） |
| R-093 | 13 の評価軸 | §4.1、D13-2 | C | 軸の定義まで（実測は DL-13） |
| R-096 / G-087 / G-089 | FAPI 2.0 の範囲と conformance | D12、TC-01-06 | A・D | 方針は本書／適合は要第三者 |
| R-046 / R-047 | 上流 IdP の統制、linking | D3、D4-3、TC-01-14 | C・D | 要実測（詳細は ADR-004） |
| R-049〜R-056 / G-084 | 鍵階層、cell 別鍵 | D11、TC-01-05、TC-01-13 | C | 要実測（詳細は ADR-007） |
| R-150 | cell 分割 | D6-1、D2-2、D3-3、TC-01-15 | C | 要実測 |
| R-161 | token の claim と検証 | §1.7、D13-1-5 | A | 要件まで（claim の意味は ADR-005・DL-115） |
| R-209 / G-065 / G-071 | 進化への互換、置換可能性、定期見直し | D2、D3、D11-3、D16、§8 | A・B | 方針は本書／見直しの運用は決裁案まで |
| G-077 / G-079 | 攻撃者モデルと残余リスクの受容者 | §1.4、§6.3 | A・B | 受容者は決裁案まで |
| G-083 / G-085 / G-088 | pentest、鍵 ceremony、負例試験 | §7.2、TC-01-13 | C・D | 要第三者／要実測 |
| G-120 | 連携契約の製品独立 | D2、§6.4 | A | 本書で閉じた（契約は ADR-022） |
| CL-0099 / CL-0232 / CL-0263 | 主張台帳で本書を処置先とする主張 | §1.1、D1、D6、D7 | A | 本書で閉じた |

## 残課題

| # | 本書で閉じないもの | 担当（案） | 閉じるゲート |
|---|---|---|---|
| 1 | D1〜D4 の DEC-3 承認（R-203、G-074） | CTO＋CISO | G3 |
| 2 | SRE 増員の確約（K1-2）と NA-001-3 の確定値 | 経営会議（DEC-4）、プラットフォームチーム長 | G3 |
| 3 | PoC（TC-01-01〜19）の実施と合否、製品の最終選定（DL-13） | プラットフォームチーム、SRE 責任者 | G3 |
| 4 | 有償サポート・managed 契約の退出条項（K1-3、K1-5）と RFP 見積り | 調達責任者＋法務責任者 | G3 |
| 5 | AGPL-3.0 の扱い（K1-4） | 法務責任者 | G3 |
| 6 | claim の意味と相関 ID の 3 層の確定（ADR-005、ADR-009、ADR-014、ADR-022、DL-115） | 各 ADR・DL の所有者 | G3 |
| 7 | W3C の Verifiable Credentials 系仕様の調査（research 未収載。新規 RS と前提台帳への追加要） | 調査担当 | DL-115 の版 0.1 |
| 8 | 新規仮定 NA-001-1〜NA-001-6 の前提台帳への登録 | 前提台帳の所有者 | 次回の前提台帳改訂 |
| 9 | 第三者評価（pentest、conformance の独立確認、鍵 ceremony 立会い、出口演習立会い） | CISO | G4 以降（未達） |
| 10 | 棄却仮説 RH-001-A〜J の traceability/rejected-hypotheses.md への集約 | traceability 担当 | Phase 4 |

## 参考文献

[^1]: 本リポジトリ『20年運用を前提とした認証・認可基盤提案のCTO CISOレビュー.md』（baseline コミット a218f24）. （参照箇所: L165, L227、確認日: 2026-10-03）
[^2]: OpenID Foundation『Certified OpenID Providers & Profiles』公開一覧（随時更新）. https://openid.net/certification/certified-openid-providers-profiles/ （参照箇所: Red Hat/Keycloak、ORY、CAOS/ZITADEL、Filip Skokan の各行と Amazon の行の有無、確認日: 2026-10-03）（RS-15#3）
[^3]: OpenID Foundation『Certified FAPI 2.0 OP Security Profile Final & Message Signing Final』公開一覧（随時更新）. https://openid.net/certification/certified-fapi-2-0-op-security-profile-final-message-signing-final/ （参照箇所: node oidc-provider >= 9.2.0 行、Okta / Auth0 – Highly Regulated Identity – 202527 行、他社行の有無、確認日: 2026-10-03）（RS-15#4〜#6）
[^4]: Keycloak『Enabling and disabling features』server guide（26.8.0 版の文書）. https://www.keycloak.org/server/features （参照箇所: Supported features, Preview features、確認日: 2026-10-03）（RS-15#10）
[^5]: Keycloak『Securing applications and services with OpenID Connect』（26.8.0 版の文書）. https://www.keycloak.org/securing-apps/oidc-layers （参照箇所: Financial-grade API (FAPI) Support、確認日: 2026-10-03）（RS-15#11）
[^6]: S. Thorgersen (Keycloak)『Backwards compatibility in Keycloak releases』Keycloak blog, 2024-10-08. https://www.keycloak.org/2024/10/release-updates （参照箇所: リリース周期、確認日: 2026-10-03）（RS-15#12）
[^7]: Keycloak『Security Policy』GitHub keycloak/keycloak. https://github.com/keycloak/keycloak/security/policy （参照箇所: Supported versions, Reporting、確認日: 2026-10-03）（RS-15#13）
[^8]: Red Hat『Red Hat build of Keycloak Life Cycle and Support Policies』. https://access.redhat.com/support/policy/updates/red_hat_build_of_keycloak_notes （参照箇所: Full Support / Maintenance Support の期間、確認日: 2026-10-03）（RS-15#14）
[^9]: Keycloak『Multi-cluster deployments (v2)』high availability guide（26.8.0 版の文書）. https://www.keycloak.org/high-availability/multi-cluster-v2/introduction （参照箇所: infrastructure requirements, Limitations、確認日: 2026-10-03）（RS-15#16）
[^10]: Keycloak『Importing and exporting realms』server guide（26.8.0 版の文書）. https://www.keycloak.org/server/importExport （参照箇所: export の対象と除外、確認日: 2026-10-03）（RS-15#17）
[^11]: Cloud Native Computing Foundation『Keycloak』プロジェクトページ. https://www.cncf.io/projects/keycloak/ （参照箇所: 成熟度と受理日、確認日: 2026-10-03）（RS-15#9）
[^12]: Ory『Introduction to Ory Enterprise License』Ory docs. https://www.ory.com/docs/oel/getting-started （参照箇所: Unlocked enterprise features, Multi-region deployments、確認日: 2026-10-03）（RS-15#21）
[^13]: Ory『Security policy』Ory docs. https://www.ory.com/docs/security-compliance/security （参照箇所: OEL・Ory Network の解決期限、Apache 2.0 利用者の扱い、確認日: 2026-10-03）（RS-15#22）
[^14]: Ory『Export identities』Ory docs. https://www.ory.com/docs/kratos/manage-identities/export-user-accounts-identities （参照箇所: include_credential、確認日: 2026-10-03）（RS-15#23）
[^15]: Ory『Import identities』Ory docs. https://www.ory.com/docs/kratos/manage-identities/import-user-accounts-identities （参照箇所: 対応 hash アルゴリズム、passkey の import、確認日: 2026-10-03）（RS-15#23）
[^16]: ZITADEL『Zitadel v3: AGPL License, Streamlined Releases, and Platform Updates』ZITADEL blog, 2025-03-13. https://zitadel.com/blog/zitadel-v3-announcement （参照箇所: ライセンス変更、確認日: 2026-10-03）（RS-15#28）
[^17]: F. Skokan『node-oidc-provider』GitHub README（v9.12.2）. https://github.com/panva/node-oidc-provider （参照箇所: Certification、対応仕様一覧、License、確認日: 2026-10-03）（RS-15#32）
[^18]: F. Skokan『Security Policy』GitHub panva/node-oidc-provider. https://github.com/panva/node-oidc-provider/security/policy （参照箇所: Supported Versions、確認日: 2026-10-03）（RS-15#32, #33）
[^19]: Microsoft『Microsoft Entra ID and data residency』Microsoft Learn, ms.date 2025-11-06. https://learn.microsoft.com/en-us/entra/fundamentals/data-residency （参照箇所: tenant location の変更不可、Go-Local add-on、確認日: 2026-10-03）（RS-15#36）
[^20]: Microsoft『Migrate users and credentials to Microsoft Entra External ID』Microsoft Learn, ms.date 2026-03-16. https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-migrate-users （参照箇所: Stage 1〜Stage 3、確認日: 2026-10-03）（RS-15#39）
[^21]: Microsoft『Azure Retail Prices API』（productName に External ID を含むメータ）. https://prices.azure.com/api/retail/prices?$filter=contains(productName,%27External%20ID%27) （参照箇所: Basic Monthly Active Users、Go-Local Add-on、M2M Authentication Token、確認日: 2026-10-03）（RS-15#35）
[^22]: Microsoft Security Response Center『Toward greater transparency: Unveiling Cloud Service CVEs』2024-06-27. https://www.microsoft.com/en-us/msrc/blog/2024/06/toward-greater-transparency-unveiling-cloud-service-cves （参照箇所: クラウドサービス CVE の発行方針、確認日: 2026-10-03）（RS-15#40）
[^23]: Okta『Auth0 Platform Service Level Agreement』Rev 4.5.2, 2022-02-01. https://www.okta.com/sites/default/files/2022-02/ServiceLevelAgreement-for-Auth0-Platform-02-7-22.pdf （参照箇所: §2.1〜§2.4、確認日: 2026-10-03）（RS-15#42）
[^24]: Okta (Auth0)『Export Password Hashes and MFA Secrets』Auth0 Docs. https://auth0.com/docs/manage-users/user-migration/export-password-hashes-and-mfa-secrets （参照箇所: 依頼手順、Wait for eligibility review（ETA）、確認日: 2026-10-03）（RS-15#44）
[^25]: Okta (Auth0)『Configure FAPI Compliance』Auth0 Docs. https://auth0.com/docs/get-started/applications/configure-fapi-compliance （参照箇所: プランの要件、選択できる準拠レベル、確認日: 2026-10-03）（RS-15#45）
[^26]: Okta (Auth0)『Enable and Configure Passkey Authentication for Database Connections』Auth0 Docs. https://auth0.com/docs/authenticate/database-connections/passkeys/configure-passkey-policy （参照箇所: custom domain と RP ID の注意、確認日: 2026-10-03）（RS-15#46）
[^27]: Amazon Web Services『Amazon Cognito Pricing』. https://aws.amazon.com/cognito/pricing/ （参照箇所: Lite / Essentials / Plus の MAU 単価、無料枠、federation 単価、確認日: 2026-10-03）（RS-15#48）
[^28]: Amazon Web Services『Amazon Cognito Service Level Agreement』最終更新 2022-05-04. https://aws.amazon.com/cognito/sla/ （参照箇所: Service Commitment, Service Credits、確認日: 2026-10-03）（RS-15#50）
[^29]: Amazon Web Services『Multi-Region replication for user pools』Amazon Cognito Developer Guide. https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-multi-region.html （参照箇所: Things to know, Limitations、確認日: 2026-10-03）（RS-15#51）
[^30]: Amazon Web Services『Importing users into user pools from a CSV file』Amazon Cognito Developer Guide. https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-using-import-tool.html （参照箇所: Supported password hashing algorithms、確認日: 2026-10-03）（RS-15#52）
[^31]: Amazon Web Services『Guidance for User Profiles Export with Amazon Cognito』実装ガイド. https://docs.aws.amazon.com/solutions/latest/cognito-user-profiles-export-reference-architecture/overview.html （参照箇所: Limitations、確認日: 2026-10-03）（RS-15#53）
[^32]: Amazon Web Services『WebAuthnConfigurationType』Amazon Cognito User Pools API Reference. https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_WebAuthnConfigurationType.html （参照箇所: RelyingPartyId、確認日: 2026-10-03）（RS-15#54）
[^33]: Amazon Web Services『AWS Customer Agreement』Last Updated: 2026-08-14. https://aws.amazon.com/agreement/ （参照箇所: §1.5, §1.6, §3.1, §5.3(b)、確認日: 2026-10-03）（RS-15#55）
[^34]: Google Cloud『Identity Platform pricing』. https://cloud.google.com/identity-platform/pricing （参照箇所: Tier 1 providers, Tier 2 providers、確認日: 2026-10-03）（RS-15#56）
[^35]: Google Cloud『Identity Platform Service Level Agreement (SLA)』. https://cloud.google.com/identity-platform/sla （参照箇所: SLO とクレジット表、確認日: 2026-10-03）（RS-15#56）
[^36]: Google (Firebase)『auth:import and auth:export』Firebase Documentation. https://firebase.google.com/docs/cli/auth （参照箇所: auth:export の Note、確認日: 2026-10-03）（RS-15#57）
[^37]: NIST『SP 800-63B-4: Digital Identity Guidelines — Authentication and Authenticator Management』Final, 2025-07-31. https://pages.nist.gov/800-63-4/sp800-63b.html （参照箇所: §2.3（AAL3）、§3.1.1.2 Password Verifiers、確認日: 2026-10-03）（RS-03#15、RS-15#58）
[^38]: W3C『Web Authentication: An API for accessing Public Key Credentials - Level 3』W3C Recommendation, 2026-08-25. https://www.w3.org/TR/webauthn-3/ （参照箇所: §1 RP ID scope、§5.5 rpId、確認日: 2026-10-03）（RS-03#29、RS-15#59）
[^39]: OpenID Foundation『OpenID Connect Core 1.0 incorporating errata set 2』2023-12-15. https://openid.net/specs/openid-connect-core-1_0.html （参照箇所: §5.7、確認日: 2026-10-03）（RS-03#57）
[^40]: OpenID Foundation FAPI WG『FAPI 2.0 Security Profile』Final, 2025-02-22. https://openid.net/specs/fapi-security-profile-2_0-final.html （参照箇所: Introduction, §5.2, §5.3.2.1, §5.3.4、確認日: 2026-10-03）（RS-04#41, #45）
[^41]: OpenID Foundation FAPI WG『FAPI 2.0 Attacker Model』Final, 2025-02-22. https://openid.net/specs/fapi-attacker-model-2_0-final.html （参照箇所: §5〜§8、確認日: 2026-10-03）（RS-04#50）
[^42]: Y. Sheffer, D. Hardt, M. Jones『RFC 8725: JSON Web Token Best Current Practices』2020-02. https://www.rfc-editor.org/rfc/rfc8725.html （参照箇所: §3.8〜§3.12、確認日: 2026-10-03）（RS-05 §2-1）
[^43]: V. Bertocci『RFC 9068: JSON Web Token (JWT) Profile for OAuth 2.0 Access Tokens』2021-10. https://www.rfc-editor.org/rfc/rfc9068 （参照箇所: §2.1, §2.2、確認日: 2026-10-03）（RS-04#60）
[^44]: M. Jones ほか『RFC 8693: OAuth 2.0 Token Exchange』2020-01. https://www.rfc-editor.org/rfc/rfc8693 （参照箇所: §2.1, §4.1, §4.4, §5、確認日: 2026-10-03）（RS-04#66）
[^45]: T. Lodderstedt, J. Richer, B. Campbell『RFC 9396: OAuth 2.0 Rich Authorization Requests』2023-05. https://www.rfc-editor.org/rfc/rfc9396 （参照箇所: §2, §5、確認日: 2026-10-03）（RS-04#64）
[^46]: A. Tulshibagwale, G. Fletcher, P. Kasselman『Transaction Tokens』draft-ietf-oauth-transaction-tokens-11（Internet-Draft、IESG 未提出）, 2026-07-30. https://datatracker.ietf.org/doc/html/draft-ietf-oauth-transaction-tokens-11 （参照箇所: §1, §3, §9.1, §9.2, §10, §13.1, §13.12, §13.13、確認日: 2026-10-03）（RS-06#30, #31, #36, #38）
[^47]: W3C『Trace Context』W3C Recommendation, 2021-11-23. https://www.w3.org/TR/trace-context/ （参照箇所: §6, §6.1, §7.2, §8、確認日: 2026-10-03）（RS-10#16〜#18）
[^48]: W3C『Propagation format for distributed context: Baggage』W3C Candidate Recommendation Snapshot, 2024-05-30. https://www.w3.org/TR/baggage/ （参照箇所: Privacy Considerations、Security Considerations、確認日: 2026-10-03）（RS-10#19）
[^49]: Microsoft『Optional claims reference』Microsoft Learn, ms.date 2026-07-22. https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims-reference （参照箇所: amr の対応表、確認日: 2026-10-03）（RS-03#27）
[^50]: Okta Developer『Key rotation』. https://developer.okta.com/docs/concepts/key-rotation/ （参照箇所: rotation 頻度の Note、org authorization server、確認日: 2026-10-03）（RS-05#41）
[^51]: M. Prorock, O. Steele『RFC 9964: ML-DSA for JSON Object Signing and Encryption (JOSE) and CBOR Object Signing and Encryption (COSE)』Standards Track（Proposed Standard）, 2026-05. https://www.rfc-editor.org/rfc/rfc9964.html （参照箇所: Abstract、§5、確認日: 2026-10-03）（RS-05#63）
[^52]: NIST『IR 8547 ipd Transition to Post-Quantum Cryptography Standards』Initial Public Draft, 2024-11-12. https://csrc.nist.gov/pubs/ir/8547/ipd （参照箇所: §4.1.1 Table 2、確認日: 2026-10-03）（RS-11#8）
[^53]: FIDO Alliance『Credential Exchange Format』v1.0 Proposed Standard (errata), 2026-03-09. https://fidoalliance.org/specs/cx/cxf-v1.0-ps-errata-20260309.html （参照箇所: Status of This Document、確認日: 2026-10-03）（RS-03#30）
[^54]: FIDO Alliance『Download Credential Exchange Specifications』. https://fidoalliance.org/download-credential-exchange-specifications/ （参照箇所: CXP の版・成熟度、確認日: 2026-10-03）（RS-03#30）
[^55]: European Union『Regulation (EU) 2023/2854 (Data Act)』OJ 掲載版. https://eur-lex.europa.eu/eli/reg/2023/2854/oj/eng （参照箇所: Article 2(38), Article 25(1)(2)(4), Article 29, recital (82)、確認日: 2026-10-03）（RS-15#64〜#66）
[^56]: European Union『Regulation (EU) 2022/2554 (DORA)』OJ L 333, 2022-12-27. https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32022R2554 （参照箇所: Article 28(8)、確認日: 2026-10-03）（RS-15#67）
[^57]: Google『Site Reliability Engineering』Chapter 11 "Being On-Call". https://sre.google/sre-book/being-on-call/ （参照箇所: on-call の最少人数、1 シフトのインシデント件数、確認日: 2026-10-03）（RS-15#70）
[^58]: U.S. Government Accountability Office『Cost Estimating and Assessment Guide』GAO-20-195G, 2020-03-12. https://www.gao.gov/assets/gao-20-195g.pdf （参照箇所: 4 特性、Chapter 3 の 12 手順（p.35）、確認日: 2026-10-03）（RS-15#69）
[^59]: Cyber Safety Review Board『Review of the Summer 2023 Microsoft Exchange Online Intrusion』2024-03-20. https://www.cisa.gov/sites/default/files/2025-03/CSRBReviewOfTheSummer2023MEOIntrusion508.pdf （参照箇所: Executive Summary, §1.2.3, §2.1、確認日: 2026-10-03）（RS-05#21, #22、RS-12#3〜#6）
[^60]: Dirk-jan Mollema『One Token to rule them all - obtaining Global Admin in every Entra ID tenant via Actor tokens』2025-09-17. https://dirkjanm.io/obtaining-global-admin-in-every-entra-id-tenant-with-actor-tokens/ （参照箇所: Actor token、Azure AD Graph の検証不備、確認日: 2026-10-03）（RS-05 §2-9）
[^61]: Microsoft Security Response Center『CVE-2025-55241 Azure Entra ID Elevation of Privilege Vulnerability』2025-09-04（rev 1.1 2025-09-18）. https://msrc.microsoft.com/update-guide/vulnerability/CVE-2025-55241 （参照箇所: severity、CVSS baseScore、確認日: 2026-10-03）（RS-05 §2-9、RS-12 §2-10）
[^62]: Okta Security『Unauthorized Access to Okta's Support Case Management System: Root Cause and Remediation』2023-11-03. https://sec.okta.com/articles/2023/11/unauthorized-access-oktas-support-case-management-system-root-cause/ （参照箇所: 冒頭 3 段落、確認日: 2026-10-03）（RS-12#22、RS-14#48）
[^63]: Auth0『2021-04-20 - US-1 Full Service Disruption: Detailed Root Cause Analysis (RCA)』2021-07-01 更新. https://cdn.auth0.com/blog/Detailed_Root_Cause_Analysis_(RCA)_4-2021.pdf （参照箇所: Summary, What Happened、確認日: 2026-10-03）（RS-09#57）
[^64]: Microsoft Azure『RCA - Authentication errors across multiple Microsoft services (Tracking ID LN01-P8Z)』2021-03-15 事象（Wayback Machine 2021-04-02 取得）. https://web.archive.org/web/20210402023547/https://status.azure.com/en-us/status/history/ （参照箇所: Root Cause and Mitigation、確認日: 2026-10-03）（RS-09#54, §2-8）
[^65]: Jacob Gabrielson (Amazon Web Services)『Avoiding fallback in distributed systems』Amazon Builders' Library（Wayback Machine 2024-08-16 取得版）. https://web.archive.org/web/20240816011626/https://aws.amazon.com/builders-library/avoiding-fallback-in-distributed-systems/ （参照箇所: 分散 fallback の記述と代替策、確認日: 2026-10-03）（RS-09#14）
[^66]: Microsoft『Backup Authentication System for Microsoft Entra ID』Microsoft Learn, ms.date 2025-07-22（更新 2026-09-28）. https://learn.microsoft.com/en-us/entra/architecture/backup-authentication-system （参照箇所: What makes a user supportable by the backup authentication system?、確認日: 2026-10-03）（RS-09#27）
[^67]: CISA, FBI ほか『Scattered Spider（AA23-320A）』初版 2023-11-16, 更新 2025-07-29. https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-320a （参照箇所: Execution, Persistence, and Privilege Escalation、確認日: 2026-10-03）（RS-14#6〜#8）
[^68]: Okta Defensive Cyber Operations『Cross-Tenant Impersonation: Prevention and Detection』2023-08-31（1.2 改訂 2024-03-08）. https://sec.okta.com/articles/2023/08/cross-tenant-impersonation-prevention-and-detection （参照箇所: Prevention、確認日: 2026-10-03）（RS-14#6〜#8）
[^69]: OpenID Foundation『OpenID 2.0 to OpenID Connect Migration 1.0』Final, 2015-04-16. https://openid.net/specs/openid-connect-migration-1_0.html （参照箇所: Abstract、確認日: 2026-10-03）（RS-11#68〜#72）
[^70]: NIST『SP 800-63C-4: Digital Identity Guidelines — Federation and Assertions』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63c.html （参照箇所: §2.3, §2.4、確認日: 2026-10-03）（RS-03 §2-9、RS-03#57）
