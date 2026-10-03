# RS-15 build/buy/managed・TCO・要員（一次資料調査ノート）

> 文書ID: RS-15 / 版: 0.2 / 状態: draft / 最終更新: 2026-10-03
> 対応要求: R-088, R-090, R-091, R-092, R-093, R-094, R-141, R-208（主）／R-089, R-137, R-139, R-209（従）
> 依存文書: CONVENTIONS.md, traceability/seed/seed-01-ciso-assurance.md（§2.7, §2.11）, traceability/seed/seed-02-cto-technical.md（§11）, traceability/seed/seed-03-redteam-decision.md（A5, C1, §2）, 01_governance/assumptions-register.md, research/RS-07-authz-engines-consistency.md
> 注記1: 種資料（seed-01〜03）は問いの手掛かりとしてのみ使い、本文の根拠には使っていない。根拠はすべて末尾の原典脚注である。
> 注記2: 本ノートの調査・起草には AI エージェント（Claude）を用いた。原典は 2026-10-03 に取得し、規範文の強度（MUST/SHOULD/SHALL）は原文から写した。2026-10-03 に、作成者とは別の AI エージェント（Claude）が全 74 脚注の原典を取得して照合し、部分支持だった脚注に関わる記述を修正した（版 0.2。新規脚注 [^75] を追加）。脚注ごとの判定と修正内容は research/verification/RS-15-verification.md に記録した。検証者も AI であり、人間のレビュアによる照合はまだ実施していない。
> 注記3: traceability/deliverables.md は RS-15 を「統制枠組み・リスク手法」（DL-99）、build/buy を RS-14（DL-98）に割り当てている。本ノートは作業指示どおり RS-15 を「build/buy/managed・TCO・要員」として作成した。ID の整合は §6 に記載する。

凡例: 主張タグは CONVENTIONS §3 に従う。OpenID Foundation（OIDF）の認定一覧・料金表は規範要求ではないが、原典が OIDF の公開記録であるため `[N]` の根拠条件で扱い、強度語（MUST 等）は持たないものとして読む。各社の料金・SLA・契約条項は公式ページの確認日時点の表示値であり `[V]` とする。料金はすべて米ドル・税抜・定価（割引なし）である。前提台帳の値に依存する推論は `[D][A-xxx]` とし、台帳に未登録の仮定は本文に「未登録の仮定」と明記して §6 で登録を提案する。

---

## 1. 調査の問い

種資料由来の問い（括弧内は対応 R-ID または種資料の箇所）:

1. managed IdP と自営 AS（self-host）のどちらを採るか。その判断に使う評価軸は何か（seed-02 11-1、R-088、R-093、R-094）。
2. 自作しない領域と自作する領域の線引きはどこか。認可エンジンの self-host はどちらに入るか（seed-02 11-2、R-094）。
3. AS 候補（Keycloak、Ory、ZITADEL、authentik、node-oidc-provider、Microsoft Entra External ID、Okta Auth0、Amazon Cognito、Google Identity Platform）の OpenID 認定、FAPI 2.0・DPoP・PAR 対応は、公式記録でどうなっているか（seed-02 11-3、2-2）。
4. 各候補のマルチリージョン構成とデータ所在地の選択肢は何か（seed-02 11-1、A-063）。
5. password hash と passkey を含むデータは export できるか。出口戦略はどう組むか（R-090、R-091、seed-03 §2「撤退可能性」）。
6. 料金モデル（MAU 課金等）と SLA は何か。100万人規模で費用はどの桁になるか（R-141、seed-03 A5）。
7. 脆弱性対応方針（報告窓口、修正期限、サポート対象版、LTS）は何か（R-093「CVE 対応」「LTS」）。
8. 必要要員はどれだけか。認証認可プラットフォームの運用体制の公開事例はあるか（R-092、R-137、R-139、seed-03 C1）。
9. 特定製品・クラウドへの過度依存をどう避けるか。ベンダーロックインと退出条項をどう扱うか（R-208、R-090）。

本ストリームで追加した問い:

10. OIDF の認定は「どの版」を対象にしたものか。現行版でも同じ主張ができるか。
11. MAU 以外の従量課金（M2M token、認可 check、SMS、所在地 add-on、マルチリージョン add-on）は、前提台帳のトラフィック量でどの桁になるか（A-043、A-045）。
12. 法令（EU Data Act、DORA）は、クラウド事業者との契約の退出条項に何を求めているか。それは export できるデータの範囲にどう効くか。
13. TCO の見積りに使える公的な方法論は何か。費目と幅はどう出すか。
14. 前提台帳の要員前提（A-054）は、公開されている on-call 体制の目安と整合しているか。
15. OSS の self-host は、本基準シナリオの要件（マルチリージョン、SCIM、マルチテナント、セキュリティ修正の期限）を無償版だけで満たせるか。

---

## 2. 結論サマリ（設計への含意）

1. OIDF の認定は版と時点に結び付いた記録であり、候補の多くは現行版で再認定されていない [D]（RS-15#8）。OP 認定一覧の最新記録は Keycloak が 18.0.0（2022-05-19）、ORY Hydra が v1.0.0（2018-07-14）、ZITADEL が 1.53.1（2021-11-04）である [N][^2]。現行版は Keycloak 26.8.0、Hydra v26.2.0、ZITADEL v4.19.4 である [V][^17][^24][^27]。Amazon Cognito は OP 認定一覧に記載がない [N][^2]。評価軸は「認定ロゴの有無」ではなく「採用する版で OIDF conformance suite を自社が実行した結果」に置く [D]。
2. FAPI 2.0 Security Profile Final・Message Signing Final の OP 認定一覧に載る候補は、node oidc-provider（7 列すべて 2025-07-10）と Auth0 Highly Regulated Identity（MTLS 送信者制約の試験計画、2025-07-09）だけである [N][^3]。Keycloak は client policy で FAPI 2.0 Security Profile（Final）と Message Signing（Final）に対応すると公式文書に記している [V][^9]。しかし Keycloak は FAPI 2.0 の認定一覧（Final と Implementer's Draft の両方）に載っていない [N][^3][^4]。FAPI 2.0 を契約で求める顧客（A-081）がいる限り、ADR-005（token profile）と ADR-001 の比較では FAPI 2.0 conformance の実測を選定の前提にする [D][A-081]（RS-15#4〜#7, #11）。
3. 候補はいずれも「1 テナント（または 1 プロジェクト）＝1 つの所在地」を基本にしている [D]（RS-15#16, #24, #36, #43, #51）。Keycloak の multi-cluster は単一リージョン（DB コミット遅延 10ms 未満が必須）に限られる [V][^13][^14]。Entra External ID のテナント所在地は作成後に変更できない [V][^37]。Cognito の multi-Region replication は副リージョンを 1 つまでしか持てず、副リージョンでは利用者作成と password reset ができない [V][^53]。したがって日本・EU・米国の所在地要件（A-063）は、リージョンごとに独立したテナント（cell）と、グローバルな振り分け部品で満たす設計になる [D][A-063]。
4. password hash の取り込み（import）は広く対応しているが、取り出し（export）は製品によって大きく異なる [D]（RS-15#17, #23, #39, #44, #52, #53, #57）。Ory は Admin API で hash 付き export ができる [V][^21]。Firebase CLI の export は scrypt の hash と salt を出力し、hash パラメータは Firebase console から別に取得する。scrypt 以外の方式で保管中の hash は空欄で出力される [V][^60]。Auth0 は有償プランだけが support ticket 経由で出せる。依頼は適格性の審査を受け、すべてが認められるわけではなく、期日も保証されない [V][^46][^47]。Cognito と Entra External ID では、公式文書に hash の export 手段を確認できなかった（未確認）。passkey は RP ID に束縛される [N][^62]。そのため出口戦略（ADR-018）の前提は、RP ID を自社ドメインに固定すること、公開鍵 credential の記録を export させる契約条項を置くこと、hash を出せない製品からは JIT 移行（利用者のサインイン時に移す方式）で出ることの 3 点になる [D]（RS-15#60）。
5. 100万人規模の MAU 課金は、公開定価で年 5.4万〜39.0万ドルの範囲に収まる（基準シナリオでは Google 7.2万、Cognito Essentials 10.2万、Entra External ID 19.0万ドル/年）[D][A-002, A-004, A-082]（RS-15#73）。この値は MAU 57.7万（A-004）、B2B 利用者の 75% が顧客 IdP 経由（A-082）という前提で計算した [D][A-004, A-082]。Auth0 Enterprise、Ory Enterprise、ZITADEL Enterprise、Red Hat build of Keycloak は定価を公開していない [V][^42][^18][^25][^12]。
6. 費用の桁を決めるのは MAU よりも、token 単位や check 単位の従量課金である [D][A-043, A-045]（RS-15#63, #75）。前提台帳の M2M 発行量（ピーク 25.3/秒、A-029）が月間続くと、Cognito では最大で月 14.8万ドル、Entra では月 6.6万ドルになる [D][A-029][V][^51][^36]。token exchange（ピーク 1,112/秒、A-043）や認可 check（日平均約 1.05万/秒、A-045）を token 単位・check 単位で課金する managed サービスに載せると、月 10万〜数百万ドルの桁になる [D][A-043, A-045]。したがって内部の STS（token exchange、workload credential）と PDP は self-host を前提とし、managed の候補は人間の利用者の認証に絞って比較する [D]。
7. SLA の約束値は製品ごとに 99.9%〜99.99% に分かれる。Cognito はリージョンごとに 99.9%、Google Identity Platform は 99.95%、Entra ID Basic/Premium は 99.99% を下回るとサービスクレジット、Auth0 Enterprise・Ory Enterprise・ZITADEL Enterprise は 99.99% である [V][^52][^59][^38][^43][^18][^25]。ただし ZITADEL の詳細料金表は Enterprise Cloud の可用性 SLA を「up-to 99.99%」と表示している [V][^75]。SLA の救済は原則としてサービスクレジットに限られる。AWS はクレジットを将来の支払いに充当するだけで返金はしないと明記している [V][^52]。Auth0 は契約終了時に未使用のクレジットを支払う [V][^43]。クレジットには上限がある（例: Auth0 と Google は月額料金の 50%）[V][^43][^59]。A-091（認証系 99.9〜99.95%）の上側を満たすことは、SLA の数値だけでは示せない [D][A-091]。cell 分割と静的安定性（ADR-013）は、managed を選んでも必要である [D]。
8. OSS の無償版は、現行版にしかセキュリティ修正を出さないことが多い [D]（RS-15#13, #22, #31, #32）。Keycloak は現行の major.minor か次の版で直し、Ory の Apache 2.0 版は現行リリースだけに修正を出して SLA を設けず、node-oidc-provider は v9.x だけをサポートする [V][^11][^19][^34]。Keycloak は年 4 回の minor リリースを出す [V][^10]。self-host の TCO には四半期ごとの追随作業を費目として入れる [D]。修正期限や長期サポートは有償契約でしか得られない（Ory OEL の Critical 14 日、Red Hat build of Keycloak 26.x の最低 2 年）[V][^19][^12]。
9. Ory の OSS 版では、本シナリオに要る機能のうち Kratos の B2B organization とマルチテナントが Enterprise License（OEL）限定であり、CockroachDB によるマルチリージョン構成も OEL の機能として示されている [V][^20]。SCIM は Ory Network では Enterprise だけの機能である [V][^18]。self-host で SCIM が OEL 限定かは、OEL の文書に明記がなく未確認である（§6）。ZITADEL は v3 から AGPL-3.0 に変わった [V][^26]。authentik は enterprise ディレクトリだけ別ライセンスである [V][^31]。「OSS だから無償で self-host できる」という前提は、本シナリオでは成り立たない [D]（RS-15#26）。ライセンスと機能の有償化範囲を、評価軸に独立に入れる [D]。
10. EU Data Act は、データ処理サービスの契約に退出条項を義務付けている [N][^65]。義務の内容は、移行開始の予告期間を最大 2 か月、移行期間を最大 30 日（技術的に不可能な場合は最大 7 か月）、データ取得期間を最低 30 日とすること、export 可能データを網羅的に特定することである [N][^65]。2027-01-12 からは移行費用を請求できなくなる [N][^66]。ただし前文 (82) は、サービスの完全性・セキュリティに関わるデータを export 可能データから除くべき（should）としている [N][^67]。password hash や MFA secret が除外扱いにされ得るので、契約で明示的に対象に含める [D]（RS-15#64〜#68）。EU の金融顧客には DORA 第 28 条(8) により試験済みの出口計画が要る [N][^69]。そのため本基盤の側にも、顧客の出口を支える契約と export 機能が要る [D]。
11. 前提台帳の要員前提 A-054（24 FTE。うち SRE 6 名で 24/365 on-call を 2 系統）は、Google SRE 本の目安と比べて SRE が少ない [D][A-054]。同書の目安は、単一拠点なら 1 系統 8 名、2 拠点なら各拠点 6 名である [V][^72]（RS-15#70, #71）。自営 AS を選ぶ場合は SRE を増やすか、on-call を 1 系統にまとめる必要がある [D][A-054]。managed を選ぶ場合も、障害対応・顧客連絡・設定変更の on-call は残る [D]。認証認可プラットフォームの体制規模を当事者が公表した一次資料は見つからなかった（§6、未確認）。
12. TCO は GAO の方法に従い、費目の網羅（WBS）、前提の文書化、感度分析、リスク・不確実性分析による幅で示す [N][^71]（RS-15#69, #79）。単一の点推定は意思決定に不十分だと GAO 自身が述べている [N][^71]。本ノートの試算は定価と前提台帳の値による感度計算にとどまり、信頼水準付きの幅ではない [D]。
13. 自作しない領域は、プロトコル実装（AS core）、WebAuthn 検証、password 保管、暗号、HSM/KMS である [D]（RS-15#78）。自作する領域は、ドメインの認可モデル、PEP SDK、テナント context、監査 schema、policy の統治、fail-mode、移行・出口のツール群である [D]。両論があるのは人間の利用者向け AS（managed か self-host か）である [D]。内部 STS と PDP は、上の 6 の費用構造と遅延の理由から OSS の self-host 側に寄せる [D]。

---

## 3. 調査結果

### 3.1 OpenID 認定（OIDF の公開記録）

- **RS-15#1** OIDF の認定は、OIDF の conformance test を使う self-certification（自己認定）である [N][^1]。認定を受けた実装は「OpenID Certified」マークを使える [N][^1]。OIDF は認定監査人と試験サービス事業者の網を整備中としており、独立認定の仕組みは発展途上である [N][^1]。
- **RS-15#2** 自己認定の料金は、OpenID Connect が会員 700 ドル・非会員 3,500 ドル、FAPI 1/FAPI 2 が会員 1,000 ドル・非会員 5,000 ドルで、いずれも「新しい deployment ごと」である [N][^6]。OP と RP は別々に支払う [N][^6]。OpenID Connect では、1 回の支払いで暦年内に同じ deployment を複数のプロファイルで認定できる（原文は "participants" で、会員に限らない）[N][^6]。FAPI も 1 回の料金で複数のプロファイルを認定できる [N][^6]。OSS の実装は、OSS 認定方針により料金の免除を受けられる場合がある [N][^6]。料金表は予告なく変わり得ると記されている [N][^6]。
- **RS-15#3** OpenID Providers & Profiles の認定一覧（確認日 2026-10-03）では、候補の行と認定日が次のとおりである [N][^2]。Red Hat Keycloak 18.0.0（2022-05-19）・Keycloak 2.3.0（2016-10-31）、ORY GmbH ORY Hydra v1.0.0（2018-07-14）、CAOS ZITADEL 1.53.1（2021-11-04）、Authentik Security Inc authentik 2026.8.0（2026-07-07）、Filip Skokan node oidc-provider（2020-07-29）、Microsoft Azure Active Directory V2（2019-01-15）、Okta Okta OP（2016-05〜2018-07）、Auth0 Auth0（2016-05〜2018-08）、Matias Woloski Auth0（2016-02）、Google Google Federated Identity（2015-04）。Amazon と Cognito の行はない [N][^2]。行ごとのプロファイル別内訳は、表の HTML を列単位で解析すると次のとおりである [N][^2]。Keycloak 18.0.0 は Basic・Implicit・Hybrid・Config・Dynamic・Form Post。Keycloak 2.3.0 と ORY Hydra v1.0.0 は Basic・Implicit・Hybrid・Config・Dynamic。ZITADEL 1.53.1 は Basic だけ。authentik 2026.8.0 は Basic・Implicit・Hybrid・Config・Form Post。node oidc-provider は Basic・Implicit・Hybrid・Config・Form Post・3rd Party-Init。Azure Active Directory V2 は Basic・Implicit・Config・Form Post。Okta OP は Basic・Implicit・Hybrid・Config（2016-05）と Form Post（2018-07-16）。Auth0 は Basic・Config（2016-05-24）、Implicit・Hybrid（2017-02-15）、Form Post（2018-08-13）。Google Federated Identity は Basic・Implicit・Hybrid・Config。
- **RS-15#4** FAPI 2.0 Security Profile Final & Message Signing Final の OP 認定一覧では、「Filip Skokan / node oidc-provider >= 9.2.0」が 7 列すべてで 2025-07-10 付の認定を持つ [N][^3]。7 列は MTLS＋MTLS、MTLS＋DPoP、private key＋MTLS、private key＋DPoP、OpenID Connect、Message Signing の JAR、JARM である [N][^3]。
- **RS-15#5** 同じ一覧に「Okta / Auth0 – Highly Regulated Identity – 202527」が 2025-07-09 付で載っている [N][^3]。添付された試験結果のファイル名は「FAPI2SPFinal_OpenID_OP_w_MTLS_-MTLS_constrain」「…w_PK_-MTLS_constrain」である [N][^3]。ファイル名からは、mTLS で送信者制約する試験計画（クライアント認証は mTLS と private key JWT）と読める [D]。この一覧では、Auth0 の DPoP 列と Message Signing 列の認定は確認できなかった [N][^3]。
- **RS-15#6** FAPI 2.0 Final の一覧にも、FAPI 2.0（Second Implementer's Draft と Message Signing First Implementer's Draft）の一覧にも、Red Hat/Keycloak、Ory、ZITADEL、Microsoft、Amazon、Google の行はない [N][^3][^4]。
- **RS-15#7** FAPI1 Advanced の OP 認定一覧には、Red Hat Keycloak 15.0.2（2021-10-08〜11、8 列すべて）と node oidc-provider 7.4.0（2021-06〜07、8 列すべて）がある [N][^5]。同じ一覧に「Okta / CIC – Highly Regulated Identity 1.0」もあり、MTLS＋PAR（2023-09-11）と Private Key＋PAR（2023-09-12）の 2 列だけが認定されている [N][^5]。
- **RS-15#8** RS-15#3〜#7 から言えるのは次のことである [D]。認定は特定の版・deployment が特定の日に試験に通ったという記録であり、その後の版の適合を示すものではない。候補の現行版（RS-15#9, #25, #28）は認定版より大幅に新しい。評価軸は「採用予定の版で、必要なプロファイル（FAPI 2.0 の DPoP 構成を含む）の conformance suite を自社が実行し、結果を保存したか」とする（R-093、ADR-001、ADR-005）。

### 3.2 Keycloak（self-host、CNCF）

- **RS-15#9** Keycloak は 2023-04-10 に CNCF の Incubating 段階で受理された [V][^7]。最新リリースは 26.8.0（2026-10-01）、ライセンスは Apache-2.0 である [V][^17]。
- **RS-15#10** 機能一覧（26.8.0 版の文書）の「既定で有効な supported 機能」に、`dpop:v1`、`par:v1`、`passkeys:v1`、`web-authn:v1`、`client-policies:v1`、`organization:v1`、`step-up-authentication:v1`、`scim-api:v1`、`token-exchange-standard:v2` がある [V][^8]。`fips:v1` と `stateless:v1` は「supported だが既定で無効」である [V][^8]。`token-exchange:v1`（旧方式）、`token-exchange-delegation:v1`、`spiffe:v1` は preview である [V][^8]。`multi-site:v1`（multi-cluster v1）は deprecated であり、将来の版で削除される [V][^8]。preview について公式文書は次のように書いている [V][^8]。原文: "Preview features are disabled by default and are not recommended for use in production."
- **RS-15#11** 公式文書は、client policy の global client profile として `fapi-2-security-profile`、`fapi-2-dpop-security-profile`、`fapi-2-message-signing`、`fapi-2-dpop-message-signing` を挙げている [V][^9]。そのうえで、FAPI 1 Baseline/Advanced、FAPI CIBA、FAPI 2.0 Security Profile（Final）、FAPI 2.0 Message Signing（Final）への適合を管理者が確保しやすくすると述べる [V][^9]。同じ文書は、Keycloak の adapter には FAPI の固有支援がなく、クライアント側の検証は手作業か第三者製品で行う必要があるとしている [V][^9]。
- **RS-15#12** Keycloak のリリース方針（2024-10-08）は「minor リリースを年 4 回、major を 2〜3 年ごと」としている [V][^10]。破壊的変更は版付けで opt-in にし、Feature や API の既定版は minor リリースでは変えない [V][^10]。原文: "the currently default version for a Feature or an API can not change in a minor release."
- **RS-15#13** コミュニティ版のセキュリティ方針は、深刻度に応じて現行の `major.minor` で直すか、低深刻度や hardening は次の `major.minor` で直すとしている [V][^11]。報告の受領確認は 7 営業日以内で、修正期限は定めていない [V][^11]。定期的に更新できない利用者には、長期サポートのある Red Hat build of Keycloak を勧めている [V][^11]。
- **RS-15#14** Red Hat build of Keycloak は、常に 2 つ以上の `major.minor` 版をサポートする [V][^12]。サポート期間は 26.x が full と maintenance を合わせて最低 2 年、27.x 以降が 3 年である [V][^12]。次の major が出ると、前の major は最低 6 か月の maintenance に入る [V][^12]。版ごとの GA・終了日の一覧と価格は、このページでは確認できなかった（§6）。
- **RS-15#15** 高可用性の概要（26.8.0 版の文書）は、multi-cluster v1 を deprecated とし、v2 を勧めている [V][^74]。v1 は「同一 AWS リージョン内の単一 AZ クラスタ 2 つ」で試験した構成であり、単一リージョンか同等の低遅延環境に限られる [V][^15]。障害の種類によっては最大 5 分程度の停止があり得るとしている [V][^15]。
- **RS-15#16** multi-cluster v2 は、2 つ以上の独立した Keycloak クラスタを、外部 Infinispan なしに同期複製した DB だけで結ぶ構成である [V][^13][^14]。DB の読み書き・コミット遅延は 5ms 未満を推奨、10ms 未満を必須としている [V][^13]。対象は「単一リージョンまたは同等の低遅延環境」で、計画停止を許容でき、定義した利用者数・要求数の範囲に収まる用途である [V][^13]。2026-07-17 の告知では、v2 の前提となる stateless 機能は Keycloak 26.7 の preview であり、制約として次を挙げている [V][^14]。同期複製 DB は一般に複数リージョンでは提供されないため単一リージョンに限ること、patch は無停止だが minor・major の更新では 1 拠点を残して他の全拠点を止める必要があること。同じ告知は、stateless モードでは認証のやり取り 1 回あたり約 8〜10ms の遅延が増え、DB の CPU と IOPS が約 2 倍になり得るとしている [V][^14]。なお 26.8.0 の機能一覧では、`stateless:v1` は「supported だが既定で無効」に分類されている [V][^8]（RS-15#10）。26.8.0 版の multi-cluster v2 の文書にも preview の表記はない [V][^13]。
- **RS-15#17** realm の export について、公式文書は次のように区別している [V][^16]。管理コンソールからの export は password や client secret を `*` で伏せるため、バックアップやサーバ間のデータ移行には使えない。CLI の export だけがその用途に適する。CLI の export は realm 設定と利用者を含むが、利用者・管理者の event、永続化した session、workflow の状態、失効済み token は含まない [V][^16]。整合性のため、export 前に全ノードを止めることを推奨している [V][^16]。CLI export に hash 化済み password と WebAuthn credential が含まれるかは、公式文書の記述では確定できず、PoC で確認する（§6）。
- **RS-15#18** RS-15#10〜#17 から次のことが言える [D]。(a) Keycloak で日本・EU・米国の所在地要件を満たすには、リージョンごとに独立した deployment と利用者ストアを置き、利用者をリージョンに振り分ける global 部品を別に設ける必要がある（RS-15#15, #16、A-063）。(b) FAPI 2.0 の機能は製品にあるが認定の記録がないため、conformance の実行を PoC の合格条件にする（RS-15#6, #11）。(c) セキュリティ修正を受けるには、年 4 回の minor 更新に追随し続けるか、Red Hat の有償サポートを契約する必要がある（RS-15#12〜#14）。26.8.0 では SCIM API（`scim-api:v1`）と standard token exchange（`token-exchange-standard:v2`）が supported・既定で有効である。一方、旧方式の token exchange（`token-exchange:v1`、delegation を含む）と SPIFFE 連携は preview であり、本番の前提にはしない（RS-15#10）。stateless は 26.7 では preview だった（RS-15#16）。stateless と SCIM API は、PoC で挙動を確かめてから前提にする。

### 3.3 Ory（Hydra / Kratos / Keto、Ory Network・Ory Enterprise License）

- **RS-15#19** Ory Network の料金は次のとおりである [V][^18]。Production は年 770 ドルで、月 21 ドル分の利用枠を含み、aDAU 1 件あたり月 0.14 ドル、M2M token 1 件あたり 0.007 ドル、permission check 1 件あたり 0.000090 ドルである。Growth は年 9,350 ドルで、月 255 ドル分の利用枠を含み、aDAU が月 0.12 ドル、M2M token が 0.006 ドル、permission check が 0.000085 ドルである。Enterprise は個別見積りである。
- **RS-15#20** aDAU（average Daily Active Users）は、登録・ログイン・回復などで Ory Identities API を使った一意の利用者を日ごとに数え、その月の日数で割った値と定義されている [V][^18]。Enterprise の項目には「Multi-region deployments with data residency」「Multi-tenancy」「99.99% uptime SLA」がある [V][^18]。比較表では Production と Growth の SLA は「No」、Multi-Region Failover は Enterprise だけ「Yes」である [V][^18]。
- **RS-15#21** Ory Enterprise License（OEL）は、同じ OSS を最適化した build に、企業向け機能、保証付きサポート、適時のセキュリティ修正を加えた self-host 版である [V][^20]。OSS 版にない機能（"not available in the open source builds"）として、Kratos の B2B organization とマルチテナント、Hydra の ROPC grant を挙げている [V][^20]。そのほか OEL の利点として、CockroachDB によるマルチリージョン構成（HA、DR、データ所在地の固定）と、無停止の upgrade・schema migration を挙げている [V][^20]。コミュニティ版の更新は「遅れることがあり、同じ規模で試験されていない」と書いている [V][^20]。この文書は SCIM を OEL 限定の機能として挙げていない [V][^20]。Ory Network の料金比較表では、SCIM と Directory Sync は Enterprise だけで提供される [V][^18]。
- **RS-15#22** Ory のセキュリティ方針では、OEL と Ory Network について、Critical を 14 日、High を 30 日、Medium を 90 日、Low を 180 日で解決するとしている [V][^19]。Apache 2.0 ライセンスの利用者にはセキュリティ SLA を設けず、修正は現行リリースだけに出す [V][^19]。原文: "Security patches are only provided for the current release version." Ory Network は常に最新版で動く [V][^19]。料金ページの FAQ は「セキュリティ修正は公表後 48 時間以内に merge・リリースする」と書いており、方針文書の期限とは測り方が異なる [V][^18]。
- **RS-15#23** Ory Identities では、getIdentity の `include_credential` 属性を使って、hash 化済みの credential を含めた identity の export ができる [V][^21]。import では、BCrypt、Argon2、MD5、SHA、SSHA、SSHA256、SSHA512、PBKDF2、SCrypt、Firebase SCrypt、crypt(3)、HMAC の hash を受け付ける [V][^22]。passkey も、credential ID、公開鍵、authenticator のメタデータを渡して import できる [V][^22]。
- **RS-15#24** Ory Network では、プロジェクト作成時に個人データの保管場所を選ぶ [V][^23]。この選択はプロジェクトに対して恒久的であり、範囲内であれば identity ごとの region を Admin API で変えられる [V][^23]。EU と US が選べ、「Global」と「US Continental」は Enterprise 顧客だけが選べる [V][^23]。個人データ以外の運用データは全世界に複製する [V][^23]。日本リージョンを個人データの保管場所に選べるかは、本稿では確認できなかった（§6）。
- **RS-15#25** GitHub の公式リポジトリで確認日時点の最新リリースは、ory/hydra と ory/kratos がともに v26.2.0（2026-03-20）である [V][^24]。
- **RS-15#26** RS-15#19〜#25 から次のことが言える [D]。(a) 本シナリオに要るマルチリージョン HA とマルチテナントは OEL か Enterprise の契約が前提になる。SCIM も Ory Network では Enterprise 限定であり、self-host での扱いは未確認である（§6）。セキュリティ修正の期限も有償版にしかない。したがって Ory を「無償の OSS」として TCO に入れることはできない（RS-15#21, #22）。(b) export・import の機能は候補の中で最も揃っており、出口側の移行先候補にもなる（RS-15#23）。(c) OSS 版の最終リリースから確認日まで 6 か月以上空いている（RS-15#25）。OSS 版を使うと、修正の入手が OEL より遅れ得る（RS-15#21）。

### 3.4 ZITADEL

- **RS-15#27** ZITADEL の料金は次のとおりである [V][^25]。FREE は月 0 ドルで 100 DAU まで。PRO は月 100 ドルで、月 25,000 DAU を含む。PRO の欄には「99.5% uptime guarantee」と「99.95% uptime guarantee」が並んで記載されている。ENTERPRISE は個別見積りで、DAU は無制限、「99.99% uptime guarantee」、商用ライセンス、Cloud と自社インフラのどちらでも使える。データ所在地は EU、US、Switzerland、Australia と表示されている [V][^25]。PRO の超過単価はこのページには表示されていない [V][^25]。詳細料金表（pricing/detail）では、可用性 SLA を PRO は「99.5% (add-on)」、Enterprise Cloud は「up-to 99.99%」と表示している [V][^75]。同じページの PRO 料金計算機は、DAU の超過分を「Priced Units」1 単位あたり 50 ドルと表示するが、1 単位が何 DAU かは表示されていない [V][^75]。
- **RS-15#28** ZITADEL v3 の告知（2025-03-13）は、ライセンスを Apache 2.0 から AGPL-3.0 に変え、例・ライブラリ・SDK・API は従来のライセンスを維持するとした [V][^26]。リリース周期は、major を 3 か月ごと、minor を 2 週間ごと、patch を随時とした [V][^26]。GitHub のリポジトリはライセンスを AGPL-3.0 と表示し、確認日時点の最新リリースは v4.19.4（2026-10-01）である [V][^27]。README は「OpenID Connect certified」と記載している [V][^27]。一方、OIDF の一覧で確認できた ZITADEL の認定は 1.53.1（2021-11-04）だけである（RS-15#3）[N][^2]。
- **RS-15#29** ZITADEL のナレッジベースは、サポートの対象を General Availability の機能に限るとしている [V][^29]。ZITADEL Cloud は 2 週間ごとにデプロイし、停止の危険がある release は最低 5 営業日前に status page で告知する [V][^29]。GitHub のセキュリティ方針は報告窓口（zitadel.com/vulnerability）を示すが、サポート対象版と対応期限は記載していない [V][^28]。各 major 版のサポート期間は、本稿では公式文書で確認できなかった（§6）。

### 3.5 authentik

- **RS-15#30** authentik の Enterprise の料金は、internal user が 1 人月 5 ドル、external user が 1 人月 0.02 ドルで、年払いである [V][^30]。external user は、顧客・取引先などで、アプリのダッシュボードにアクセスできず、裏側の SSO だけに authentik を使う利用者と定義されている [V][^30]。service account は無料である [V][^30]。Enterprise Plus は年 2 万ドルからで、個別のサポートと SLA、multi-instance 構成、FedRAMP 向けの FIPS 準拠を含む [V][^30]。課金対象が登録数か月間の活動数かは、料金ページでは明示されていない（§6）。
- **RS-15#31** authentik のライセンスは、`authentik/enterprise/` 配下が別ライセンス、`website/` 配下が CC BY-SA 4.0、それ以外が MIT である [V][^31]。セキュリティ方針がサポート対象とするのは 2026.5.x と 2026.8.x の 2 系列である [V][^32]。CVE ID は GitHub（CNA）から受け、金銭的な報奨金は出していない [V][^32]。

### 3.6 node-oidc-provider

- **RS-15#32** node-oidc-provider の README は、DPoP（RFC 9449）、PAR（RFC 9126）、mTLS（RFC 8705）、JAR（RFC 9101）、JARM、RAR（RFC 9396）、FAPI 1.0/2.0 への対応と MIT ライセンスを記載している [V][^33]。セキュリティ方針のサポート対象は v9.x だけで、終了日は後継版を出す前に決めるとしている [V][^34]。確認日時点の最新リリースは v9.12.2（2026-09-05）である [V][^33]。
- **RS-15#33** RS-15#4 と #32 から次のことが言える [D]。node-oidc-provider は FAPI 2.0 の全構成で認定記録を持つ唯一の候補である。ただし、製品ではなくライブラリであり、認定の名義も個人（Filip Skokan）である（RS-15#3, #4）。採用する場合は、管理面、利用者ストア、回復、マルチリージョンを自社で作り、bus factor（R-139）を自社の要員で補う必要がある。FAPI 2.0 の conformance を検証する参照実装として PoC に入れる価値はある。

### 3.7 Microsoft Entra External ID

- **RS-15#34** External ID の基本課金は MAU（暦月内に認証した一意の外部利用者）である。subscription に紐付く workforce テナントと external テナントの MAU を合算して数える [V][^35]。external テナントでは、directory role を持つ管理者も MAU に数える [V][^35]。有償 add-on として、M2M Authentication（取引単位）、SMS Phone Authentication（取引単位）、Go-Local（MAU 単位、オーストラリアと日本のみ）などがある [V][^35]。
- **RS-15#35** Azure Retail Prices API（Microsoft の公式価格 API、確認日 2026-10-03）が返す Microsoft Entra External ID の価格は次のとおりである [V][^36]。「Basic Monthly Active Users」は 0〜50,000 MAU が 0 ドル、50,000 MAU 超が 1 MAU あたり 0.03 ドル（2025-07-01 発効）。「Go-Local Add-on」は 1 MAU あたり 0.02 ドル。「M2M Authentication Token」は 1 token あたり 0.001 ドル。Phone Authentication は 1 取引あたり 0.03〜0.35 ドル（地域区分による）。同じ API には「Core Monthly Active Users」（50,000 超で 0.01625 ドル、2025-05-01 発効）も残っており、どの契約に適用されるかは確認できなかった（§6）。
- **RS-15#36** テナントの所在地は作成時に選んだ国・地域で決まり、geo-location に割り当てられる。所在地は作成後に変更できない [V][^37]。原文: "Tenant location can't be changed after it's set." geo-location は Australia、Asia/Pacific、EMEA、Japan、North America、Worldwide である [V][^37]。このうち Australia と Japan は、external テナントでは Go-Local add-on を付けた場合に使える [V][^37]。US government クラウドと China クラウドは、現時点で external テナントに使えない [V][^37]。
- **RS-15#37** Microsoft の Online Services SLA（2026 年 10 月版）では、「Microsoft Entra ID Basic and Microsoft Entra ID Premium」の項で、月間稼働率が 99.99% 未満なら 10%、99.9% 未満なら 25%、99% 未満なら 50%、95% 未満なら 100% のサービスクレジットとしている [V][^38]。停止時間は「影響を受けた利用者数 × 分」で数える [V][^38]。同文書の目次と本文に External ID 独自の項は見つからなかった。External ID がこの項の対象になるかは契約で確認する（§6）。
- **RS-15#38** Microsoft が公表する Entra ID の月次 SLA 達成値は、2021-02〜2026-08 の大半の月で 99.998〜99.999% である。最低は 2021-03 の 99.568% である [M][^39]。測定条件: 全顧客・全地域の認証を合算した値で、各分に sign-in して token（またはエラー応答）を受け取れた利用者を成功 user-minute として数える。値は小数第 3 位で切り捨てている。2025-04 からは、バックアップ認証系の成功も成功に含めるよう計算を変えた [M][^39]。月 5,000 MAU 以上のテナントには、テナント単位の SLA 達成値も提供する [V][^39]。
- **RS-15#39** External ID への移行手順は、平文 password が手元にあればそれを設定し、なければ一時的な乱数 password を設定したうえで、次のどちらかで credential を移すとしている [V][^40]。サインイン時に旧 IdP で検証して書き込む JIT 移行（`OnPasswordSubmit` カスタム拡張）か、旧 IdP 側で利用者の credential を収集する方式である [V][^40]。password hash の import 手順は記載されていない [V][^40]。External ID から hash を export する手段も、本稿では公式文書で確認できなかった（§6）。
- **RS-15#40** Microsoft（MSRC）は 2024-06-27 に、利用者の対処が不要な場合も含めて、クラウドサービスの重大な脆弱性に CVE を発行すると表明した [V][^41]。原文: "we will issue CVEs for critical cloud service vulnerabilities, regardless of whether customers need to install a patch or to take other actions to protect themselves."

### 3.8 Okta Auth0

- **RS-15#41** Auth0 の料金ページは、Free を月 25,000 MAU まで、Essentials と Professional を「Up to 500 monthly active users」から始まる段階制、Enterprise を問い合わせとしている [V][^42]。Enterprise の項目は「Top-tier SLAs」を挙げ、Enterprise 欄と比較表には「99.99% SLA」と記載している [V][^42]。FAQ では、Auth0 の稼働率は「大半のリージョンで月 99.99% 超」と書いているが、これは実績の記述であり契約上の約束ではない [V][^42]。100万人規模に当たる価格表は公開されていない [V][^42]。
- **RS-15#42** Okta の「Auth0 Platform Service Level Agreement」（Rev 4.5.2、2022-02-01）は、Core Services（User Authentication と Machine to Machine Authentication）の月平均可用性を 99.99% 以上とする [V][^43]。次は停止時間から除く: 緊急保守、不可抗力、顧客の負荷試験・侵入試験、alpha・beta 機能 [V][^43]。custom database、外部 IdP、Rules・Hooks・Actions の呼出しに起因する失敗も、失敗した API 呼出しに数えない [V][^43]。クレジットは 99.99% 未満で 5%、99.9% 未満で 10%、99.0% 未満で 20%、95% 未満で 50% で、上限は月額料金の 50% である [V][^43]。対象は本番テナントだけで、請求は事象から 5 営業日以内に書面で行う [V][^43]。一方、Auth0 Docs の「Service Level Agreements」は、可用性 99.99% の約束は同じだが、クレジットの段階を 98.50〜99.98% で 5%、97.00〜98.49% で 10%、97.00% 未満で 20% と別の表で示している [V][^44]。どちらが現行契約に適用されるかは、契約書で確認する（§6）。
- **RS-15#43** Auth0 の public cloud では、テナント作成時に Australia（AU）、Canada（CA）、Europe（EU、EU-2）、Japan（JP）、United Kingdom（UK）、United States（US、US-3〜US-5）から地域を選ぶ [V][^45]。この選択が、テナントのドメインとデータのホスト地域を決める [V][^45]。
- **RS-15#44** Auth0 の API で取得できない情報は、Auth0 が保管する database 利用者の password hash と private key だけであり、どちらも support ticket で依頼する [V][^46]。この依頼は Free プランでは受け付けない [V][^46]。依頼にはテナント名と PGP 公開鍵（RSA 4096 bit の暗号用 subkey を含むもの）が要る [V][^47]。Auth0 は依頼の適格性を審査し、すべての依頼が export の対象になるわけではない [V][^47]。承認後は、書面の承認、他のテナント管理者の確認、CISO・CSO または VP 以上の署名した確認書の提出を求める [V][^47]。Auth0 は完了予定日（ETA）を示さず、受け取ったダウンロードリンクは 3 日で失効する [V][^47]。原文: "Auth0 does not provide ETAs for eligible exports because fulfillment depends on resource and access availability."
- **RS-15#45** Highly Regulated Identity の機能を使うには、Enterprise プランと Highly Regulated Identity add-on が要る [V][^48]。FAPI 準拠設定として示されているのは、FAPI1 Advanced（mTLS＋PAR、Private Key JWT＋PAR）と、FAPI 2.0 Security Profile（Private Key JWT か mTLS のクライアント認証に、mTLS の送信者制約を組み合わせる 2 構成）である [V][^48]。この設定ページには DPoP を使う FAPI 2.0 構成と Message Signing は記載されていない [V][^48]。これは OIDF の一覧の記録（RS-15#5）と一致する [D]。
- **RS-15#46** Auth0 の passkey 設定文書は、ドメイン名が変わると旧ドメインに紐付いた passkey は無効になるとしている [V][^49]。また、Dashboard や Management API で RP ID を変えると他ドメインの passkey はすべて使えなくなり、利用者は再登録が必要だとしている [V][^49]。passkey を有効にする前に custom domain を設定するよう勧めている [V][^49]。
- **RS-15#47** Okta の脆弱性報告方針は、窓口を psirt@okta.com とし、受領を適時に確認して対応見込み時期を示すとしている [V][^50]。受領確認の期限（時間・日数）は定めていない [V][^50]。原文: "Okta generally does not disclose, discuss, or confirm security issues until a full investigation is complete and any necessary patches or releases are available."

### 3.9 Amazon Cognito

- **RS-15#48** Cognito user pool の MAU 料金は次のとおりである [V][^51]。Lite は 10,001〜100,000 MAU が 0.0055 ドル、100,001 MAU 以上が 0.0046 ドルの段階制。Essentials は 0.015 ドル、Plus は 0.020 ドルの均一料金。直接サインインとソーシャルログインの利用者には、Lite と Essentials に限り、アカウントか AWS Organization あたり月 10,000 MAU の無料枠がある。Plus には無料枠がない。SAML/OIDC で federate した利用者は、どの tier でも 50 MAU の無料枠を超えた分が 1 MAU あたり 0.015 ドルである [V][^51]。料金ページの計算例は US East（N. Virginia）を前提にしている [V][^51]。
- **RS-15#49** M2M 認可は、成功した token 応答 1 件ごとに課金し、app client の数には課金しない [V][^51]。計算例から逆算した単価は、通常が 1 token 0.00225 ドル、multi-Region replication を有効にした app client が 0.002925 ドルである [V][^51]。app client が 2,500 を超える場合は account team への連絡を求めている [V][^51]。multi-Region replication の add-on は、Essentials tier で 1 MAU あたり 0.0045 ドルである（計算例: 500,000 MAU で月 2,250 ドル）[V][^51]。
- **RS-15#50** Cognito の SLA（最終更新 2022-05-04）は、リージョンごとの月間稼働率 99.9% 以上を「商業的に合理的な努力」で提供するとしている [V][^52]。クレジットは 99.9% 未満で 10%、99.0% 未満で 25%、95.0% 未満で 100% である [V][^52]。
- **RS-15#51** multi-Region replication（MRR）は、共有の user pool ID を持つ副 user pool を別リージョンに作る機能である [V][^53]。管理設定と書込み（password reset、sign-up）の正本は主 user pool で、副 user pool への同期は結果整合である [V][^53]。副リージョンは user directory あたり 1 つまでである [V][^53]。副 user pool では、新しい利用者を作れず、password reset もプロファイル変更もできない [V][^53]。federate した利用者は、主 user pool に一度サインインしたことがある場合に限り、failover 中の副 user pool にサインインできる [V][^53]。TOTP MFA も副 user pool では使えない [V][^53]。ロックアウトまでの失敗回数はリージョン間で同期しない [V][^53]。MRR を使うには Essentials 以上の tier と、全リージョンで使える multi-Region の customer managed KMS key が要る [V][^53]。旧基盤上の user pool では、まだ使えない場合がある [V][^53]。
- **RS-15#52** CSV import は、hash を指定しなければ password 以外の属性を取り込み、利用者を `RESET_REQUIRED` 状態にする [V][^54]。hash 付き import では BCRYPT（cost は最大 12）、SCRYPT（N は最大 65536、r=8、p=1）、ARGON2ID（m は最大 19456 KiB、t は最大 2、p=1）、PBKDF2_SHA256（反復は最大 600,000）を受け付ける [V][^54]。上限を超えるパラメータの hash は取り込めない [V][^54]。取り込んだ hash は、初回サインインで検証に成功すると Cognito の native 方式（SRP）に移す [V][^54]。CSV 1 ファイルの上限は 500,000 行で、同時に動かせる import job はアカウントあたり 1 つである [V][^54]。
- **RS-15#53** AWS の「Guidance for User Profiles Export with Amazon Cognito」は、password などの機微情報を export しないこと、MFA を有効にした user pool には対応しないことを制約として明記している [V][^55]。Cognito から password hash を export する公式手段は、本稿では確認できなかった（§6）。
- **RS-15#54** Cognito の WebAuthn 設定（passkey）には Essentials 以上の tier が要る [V][^56]。passkey 認証を使い、user pool に custom domain があり、managed login か classic hosted UI で認証する場合は、RP ID を custom domain の FQDN にしなければならない [V][^56]。
- **RS-15#55** AWS Customer Agreement（Last Updated 2026-08-14）は、AWS が提供中で顧客が利用中の一般提供サービスについて、重要な機能を廃止する場合は 12 か月以上前に通知するとしている（緊急時、知的財産の請求、法令遵守の場合を除く）[V][^57]。契約終了後 30 日間は、終了を理由に顧客コンテンツを削除しない。未払いがなければ顧客はその間にコンテンツを取り出せる（AWS が §5.2(b) により解除した場合を除く）[V][^57]。SLA の不利な変更は 90 日以上前に通知し（§1.6）、既存サービスの値上げや新しい料金は 30 日以上前に通知する（§3.1）[V][^57]。

### 3.10 Google Identity Platform

- **RS-15#56** Identity Platform は、大半のサインイン方式を MAU（その月にサインインしたアカウント）で課金する [V][^58]。Tier 1（Email、Phone、Anonymous、Social）は、50,000 MAU まで無料、50,000〜100,000 が 0.0055 ドル、100,000〜1,000,000 が 0.0046 ドル、1,000,000〜10,000,000 が 0.0032 ドル、10,000,000 以上が 0.0025 ドルである [V][^58]。Tier 2（OIDC、SAML）は、50 MAU まで無料、それを超えると 1 MAU あたり 0.015 ドルである [V][^58]。電話認証と MFA の SMS は 1 通ごとに課金し、1 日 10 通までは無料である。1 通の単価は、日本 0.03 ドル、米国 0.01 ドル、英国 0.04 ドル、ドイツ 0.10 ドルである [V][^58]。SLA は月間稼働率 99.95% で、クレジットは 99.95% 未満で 10%、99.00% 未満で 25%、95.00% 未満で 50% である [V][^59]。
- **RS-15#57** Firebase CLI の `auth:export` は、利用者アカウントを JSON か CSV に出力し、出力には `passwordHash` と `salt` の欄がある [V][^60]。ただし export されるのは Firebase の backend が使う scrypt で hash 化された password だけである。他の方式の hash のまま保管されているアカウント（import 後にまだサインインしていない利用者）は、`passwordHash` と `salt` が空欄で出力される [V][^60]。hash のパラメータ（多くのプロジェクトの既定は、scrypt を改変した `SCRYPT`。signer key、salt separator、rounds、mem_cost）は Firebase console から取得する [V][^60]。`auth:import` は、BCRYPT、SCRYPT、STANDARD_SCRYPT、HMAC 系、MD5、SHA 系、PBKDF_SHA1、PBKDF2_SHA256 を受け付ける [V][^60]。この手順が Identity Platform のプロジェクトにそのまま使えるかは、PoC で確認する（§6）。

### 3.11 password 保管と passkey 束縛の規範

- **RS-15#58** NIST SP 800-63B-4（Final、2025-07-31）§3.1.1.2 は、verifier は password を offline 攻撃に耐える形で保存しなければならない（SHALL）とする [N][^61]。password は適切な password hashing scheme で salt を付けて hash 化しなければならない（SHALL）[N][^61]。cost factor は検証性能を損なわない範囲でできるだけ高くすべきであり（SHOULD）、計算性能の向上に合わせて引き上げるべきである（SHOULD）[N][^61]。
- **RS-15#59** W3C Web Authentication Level 3（Recommendation、2026-08-25）は、public key credential は登録時と同じ RP ID の主体に対する認証にしか使えないとしている [N][^62]。authenticator は、RP ID が使う credential の rpId と完全に一致することを検証しなければならない（MUST）[N][^62]。client は RP の origin が RP ID の範囲に合うことを検証しなければならない（MUST）[N][^62]。
- **RS-15#60** RS-15#17, #23, #39, #44, #46, #52〜#54, #57〜#59 から、出口と移行について次のことが言える [D]。(a) passkey の秘密鍵は authenticator 側にあり、移行で運べるのは RP 側の公開鍵 credential の記録（credential ID、公開鍵、署名カウンタ等）だけである。RP ID が同じであれば、移行先でその記録を使える可能性がある（RS-15#23 の Ory の passkey import がその例）。RP ID がベンダーのドメインなら passkey は運べない（RS-15#46, #54, #59）。よって RP ID は自社所有ドメイン（例: auth.<自社ドメイン>）に固定し、ADR-021（識別子の永続性）の対象にする。(b) password hash は、export できる製品（Ory、Firebase 系は scrypt 化済みの hash に限る、Auth0 は審査と書類を条件とする）と、export を確認できなかった製品（Cognito、Entra External ID）に分かれる。後者から出るには、移行先側の JIT 移行（旧 IdP で password を検証して書き込む方式）が要り、全利用者が一度サインインするまで旧 IdP を止められない。(c) SP 800-63B-4 は cost factor の引上げを SHOULD としている（RS-15#58）。一方、Cognito の import には cost の上限がある（RS-15#52）。そのため、cost を上げ続けた hash は Cognito に取り込めなくなる。hash の方式とパラメータは、移行先候補の上限と合わせて ADR-018 に記録する。

### 3.12 認可エンジンの運用・費用（RS-07 と重ならない範囲）

- **RS-15#61** AuthZed（SpiceDB の提供元）の料金ページは、Cloud を「$2/hr」からの従量制、Self-Hosted をリージョンと vCPU 単位の年間ライセンス、Dedicated Cloud を予約 vCPU の個別見積り（専用インフラ、マルチリージョン）としている [V][^63]。サポートは Standard（メール、P3 は 1 営業日）、Premium（Slack、P1/P2 は 12 時間）、Enterprise（専任チーム、P1 は 1 時間）の 3 段である [V][^63]。
- **RS-15#62** Auth0 FGA（OpenFGA のマネージド版）の Enterprise の上限は store あたり、Check・BatchCheck が毎秒 500 要求、Write が毎秒 150、ListObjects が毎秒 20、Read が毎秒 100 である [V][^64]。tuple 数は 1,000 万（拡張可）、提供地域は US・Europe・Australia で、Private Cloud add-on なら日本を含む 10 の AWS リージョンで使える [V][^64]。Free Trial に SLA はない [V][^64]。
- **RS-15#63** 前提台帳と公開単価から、managed の認可サービスの費用と上限について次のことが言える [D][A-020, A-045]。A-045 の Check はピーク 42,009/秒で、ピーク係数 4（A-020）で割った日平均は約 10,502/秒、月 30 日で約 2.72×10¹⁰ 件になる。check 単位で課金すると、Ory Network（Production）は月約 245 万ドル、AVP の単発要求（RS-07#47、[^73]）は月約 13.6 万ドルになる。Auth0 FGA の Enterprise の上限は store あたり Check 毎秒 500（RS-15#62）で、最大テナント単独のピーク 5,266/秒（A-045 の注記）に届かない。したがって、managed の認可サービスを採るには、store の分割と上限引上げを契約で確保する必要がある。PDP は self-host にし、managed は比較の参照に回すのが妥当である（RS-07 の性能比較と併せて ADR-010 で決める）。

### 3.13 ベンダーロックインと退出条項（法令・契約）

- **RS-15#64** EU Data Act（Regulation (EU) 2023/2854）第 25 条(1) は、データ処理サービス間の乗換え（switching）に関する顧客の権利と事業者の義務を、書面の契約に明記しなければならない（shall）とする [N][^65]。第 25 条(2) は、契約に次を含めなければならない（shall）とする [N][^65]。
  - (a) 顧客の求めにより、他の事業者への乗換えか、オンプレミスへの全 export 可能データの移転を、不当な遅延なく、遅くとも予告期間後に始まる最大 30 暦日の移行期間内に行えること。その間、事業者は合理的な支援と事業継続を提供する。
  - (d) 乗換え開始の予告期間は 2 か月を超えないこと。
  - (e) 乗換えで移せるデータとデジタル資産の全分類を網羅的に特定すること（少なくとも全 export 可能データを含む）。
  - (f) 事業者の営業秘密の侵害のおそれがある場合に除外する、内部機能に固有のデータ分類を網羅的に特定すること。ただし、その除外が乗換えを妨げ遅らせないこと。
  - (g) 移行期間の終了後、最低 30 暦日のデータ取得期間を設けること。
  - (h) 乗換え完了後に、export 可能データを完全消去すること。

  第 25 条(4) は、30 日の移行期間が技術的に不可能な場合、事業者は乗換え要求から 14 営業日以内に理由を付けて通知し、7 か月を超えない代替の移行期間を示さなければならない（shall）とする [N][^65]。
- **RS-15#65** 同法第 29 条は、2027-01-12 以降、事業者は乗換えに乗換え費用を課してはならない（shall not）とする [N][^66]。2024-01-11〜2027-01-12 の間は、乗換えに直接要した費用を超えない範囲で減額した費用を課すことができる [N][^66]。同法は 2025-09-12 から適用されている（第 50 条）[N][^66]。第 31 条(1) は、主要機能の大半を個別顧客向けに作り込み、広く商業的に提供していないサービスについて、第 23 条(d)、第 29 条、第 30 条(1)(3) の義務を適用しない [N][^68]。第 31 条(2) は、期間限定の試験・評価用の非本番版には同章の義務を適用しない [N][^68]。
- **RS-15#66** 同法第 2 条(8) は、データ処理サービスを、構成可能で拡張可能な共有計算資源への、遍在的でオンデマンドなネットワークアクセスを可能にするデジタルサービスと定義している [N][^67]。前文 (80) は、その計算資源に software、applications、services を含むとしている [N][^67]。第 2 条(38) は、export 可能データを、顧客の利用により生成された入力・出力データ（メタデータを含む）とし、事業者や第三者の知的財産・営業秘密を除くと定義している [N][^67]。export 可能データの範囲を説明する前文 (82) は、さらに「サービスの完全性とセキュリティに関わるデータで、その export が事業者をサイバーセキュリティ上の脆弱性にさらすもの」を除くべき（should）としている [N][^67]。同じ前文は、これらの除外が乗換えを妨げたり遅らせたりすべきでない（should not）としている [N][^67]。
- **RS-15#67** DORA（Regulation (EU) 2022/2554）第 28 条(8) は、金融機関に、重要・重大な機能を支える ICT サービスについて出口戦略を整備しなければならない（shall）とする [N][^69]。金融機関は、事業の中断、規制遵守の制約、顧客へのサービスの継続性と品質の毀損を招かずに契約から退出できるようにしなければならない（shall）[N][^69]。出口計画は包括的で、文書化され、十分に試験され、定期的に見直されなければならない（shall）[N][^69]。金融機関は代替策を特定し、契約した ICT サービスと関連データを第三者事業者から引き上げ、他の事業者か自社に安全かつ完全に移す移行計画を作らなければならない（shall）[N][^69]。第 30 条(3)(f) は、重要・重大な機能を支える契約に、事業者がサービスを続ける義務的な移行期間を含む出口戦略を入れることを求める [N][^70]。DORA は 2025-01-17 から適用されている（第 64 条）[N][^70]。
- **RS-15#68** RS-15#44, #53, #55, #64〜#67 から、退出条項について次のことが言える [D]。(a) Data Act の義務は、EU 法の適用を受ける契約での最低線として使える。適用の有無は契約主体と提供地による法務判断が要る（§6、RS-16 と連携）。(b) Data Act の前文 (82) はセキュリティ関連データの除外を認めている（除外は乗換えを妨げるべきでないとの限定付き。RS-15#66）。そのため password hash、MFA secret、passkey の公開鍵 credential は、「export 可能データの網羅的特定」（第 25 条(2)(e)）の対象として契約に明示的に書く。書かなければ除外として扱われ得る。(c) 実際の各社の条件は法定の最低線より弱い場合がある（Auth0 は期日を保証せず審査で拒否され得る、AWS Customer Agreement の取得期間は契約終了後 30 日だけで移行期間の定めがない、Cognito は hash の export 手段を確認できない）（RS-15#44, #53, #55）。AWS などが EU Data Act 向けに別の契約条項を用意しているかは、本稿では確認していない（§6）。退出条項の様式（11_contracts/）では、予告期間 2 か月以下、移行期間 30 日（最大 7 か月）、取得期間 30 日以上、データ分類の網羅表、export 形式、hash のアルゴリズムとパラメータの開示、完全消去の証明を必須項目にする。(d) 本基盤が EU の金融顧客に ICT サービスを提供する場合、本基盤の側が DORA 第 30 条の出口条項を求められる側になる。そのため、顧客テナント単位の export 機能（利用者、関係データ、監査ログ）を定常機能として設計する（ADR-018、DL-31）。

### 3.14 TCO の方法論と要員

- **RS-15#69** GAO の「Cost Estimating and Assessment Guide」（GAO-20-195G、2020-03）は、信頼できる費用見積りの 4 特性を、comprehensive（網羅的）、well documented（文書化）、accurate（正確）、credible（信頼性）とする [N][^71]。網羅的な見積りは、費目の欠落と二重計上がなく、前提と除外を明記する [N][^71]。信頼性のある見積りは、感度分析とリスク・不確実性分析を取り込み、独立見積りと照合する [N][^71]。手順 12 のうち、手順 5 で前提（ground rules and assumptions）を定め、手順 7 で点推定を作って独立見積りと比べ、手順 8 で前提や cost driver を 1 つずつ変える感度試験を行う（p.35）[N][^71]。点推定だけでは見積りの不確実性について何も分からず、意思決定に不十分だとしている [N][^71]。原文: "a point estimate by itself provides no information about the underlying uncertainty of the estimate and is insufficient for making good decisions about the program." 感度分析は 1 変数ずつ変え、リスク・不確実性分析は多数の変数を同時に変えるという違いも明記している [N][^71]。
- **RS-15#70** Google の SRE 本「Being On-Call」は、単一拠点のチームで on-call を回すのに要る最少人数を 8 名、2 拠点のチームでは各拠点の妥当な最少人数を 6 名としている [V][^72]。SRE の業務時間のうち on-call に充てるのは 25% 以下とし、12 時間の on-call 1 シフトで扱うインシデントは最大 2 件としている（1 件あたり、根本原因分析・是正・事後レビューに平均 6 時間かかるとする）[V][^72]。
- **RS-15#71** 前提台帳 A-054 は、認証・認可プラットフォームチームを 24 FTE と置き、そのうち SRE を 6 名（24/365 の on-call を 2 系統で回す想定）としている [A-054]。RS-15#70 の目安を当てはめると、2 系統を別々に回すなら 1 系統 3 名になり、単一拠点 8 名・2 拠点各 6 名のいずれも下回る [D][A-054]。自営 AS と self-host の PDP を両方持つ場合は、(a) SRE を増やす、(b) 開発チームも on-call に入れて 1 系統の人数を確保する、(c) 人間の利用者の認証を managed に移して on-call の範囲を狭める、のいずれかを要員計画（DL-27）で決める必要がある [D][A-054]。managed を選んでも、障害時の切替え、顧客への連絡、設定変更、ベンダーへのエスカレーションのための on-call は残る [D]。

### 3.15 100万人規模の費用の桁（公開定価からの試算）

- **RS-15#72** 試算の前提は次のとおりである [D][A-002, A-004, A-029, A-043, A-045, A-061, A-082]。
  - MAU は A-004 の区分別比率（B2B 65%、B2C 35%、従業員 90%）を A-002 の登録数に掛け、基準 576,500 とした（低 428,000、高 723,500）。
  - 顧客 IdP 経由の federate 利用者は、B2B MAU の 75%（A-082）とした。基準 341,250、直接認証 235,250 である。
  - 日本の利用者比率は 85%（A-061）とした。
  - 料金は確認日の定価・米ドル・税抜で、割引、サポート契約、SMS、M2M、add-on は別に扱う。
  - 次の 3 つは前提台帳に未登録の仮定であり、§6 で登録を提案する。(i) 日本円換算は 1 ドル 150 円。(ii) Ory の aDAU は DAU（A-003、29.3 万）と等しい。(iii) M2M のピーク値（A-029）が月間続く場合を上限とする。
- **RS-15#73** MAU 課金の試算（月額、ドル）は次のとおりである [D][A-004, A-082]（単価は RS-15#35, #48, #56）。

  | 製品・tier | 低（MAU 42.8万） | 基準（57.7万） | 高（72.4万） | 年額（基準） | 備考 |
  |---|---|---|---|---|---|
  | Google Identity Platform（Tier 1＋Tier 2） | 4,513 | 6,015 | 7,510 | 72,182 | federate 分（0.015）が 85% を占める |
  | Amazon Cognito Lite（＋federate） | 4,733 | 6,235 | 7,730 | 74,820 | Lite では passkey と MRR を使えない（RS-15#51, #54） |
  | Amazon Cognito Essentials（＋federate） | 6,269 | 8,497 | 10,702 | 101,961 | MRR を付けると 0.0045×MAU を加算（基準で約 2,594） |
  | Microsoft Entra External ID（Basic） | 11,340 | 15,795 | 20,205 | 189,540 | federate の有無で単価は変わらない |
  | 同上＋Go-Local（日本 85% 分） | 18,616 | 25,596 | 32,504 | 307,152 | 日本に所在地を固定する場合 |

  登録者全員（100 万）が毎月活動する上限ケースでは、Entra が月 28,500 ドル（年 34.2 万）、Cognito Essentials が月約 14,850 ドル（年 17.8 万）になる [D][A-001]。以上から、managed の MAU 課金の桁は年約 5.4 万〜39.0 万ドルである [D]。1 ドル 150 円の未登録の仮定では、年約 800 万〜5,900 万円になる [D]。
- **RS-15#74** 定価から試算できないもの、または参考値にとどまるものは次のとおりである [D]。
  - Auth0（Enterprise）、Ory Network Enterprise、ZITADEL Enterprise（PRO の超過単価も、詳細料金表の計算機に「1 単位 50 ドル」とあるだけで 1 単位の DAU 数が不明）、Red Hat build of Keycloak、AuthZed Self-Hosted/Dedicated は、定価を公開していない（RS-15#19, #27, #41, #14, #61）。RFP で同一条件の見積りを取る必要がある。
  - 参考値として、Ory Network Growth を aDAU＝29.3 万（未登録の仮定）で計算すると、月約 34,905 ドル（年約 41.9 万ドル）になる [D][A-003]。ただし Growth には SLA とマルチリージョンがないため、本シナリオの比較対象にはならない（RS-15#20）。
  - authentik Enterprise は、external user 97 万人（B2B＋B2C の登録数）が課金対象なら月 19,400 ドルになる [D][A-002]。従業員 3 万人を internal user として数えると月 150,000 ドルが加わる。従業員を external と internal のどちらに分類するかで、費用が 1 桁変わる（RS-15#30）。
  - Keycloak（コミュニティ版）、node-oidc-provider、ZITADEL・Ory の OSS 版はライセンス費が 0 である。費用はインフラ、要員、更新追随、修正期限のない危険の受容（RS-15#13, #22, #26）に移る。
- **RS-15#75** 従量課金の M2M と token exchange について、次の試算になる [D][A-029, A-043]（単価は RS-15#19, #35, #49）。
  - M2M token のピーク 25.3/秒（A-029）が月間続くと、月約 6,558 万件になる。これを Cognito で発行すると月約 14.8 万ドル、Entra で月約 6.6 万ドル、Ory Production で月約 45.9 万ドルである。いずれも MAU 課金（RS-15#73）を上回り得る。
  - token exchange のピーク 1,112/秒（A-043）を token 単位で課金すると、仮に Entra の M2M 単価を当てても月約 288 万ドルになる。token exchange の価格を公開している候補は見つからなかった。
  - 以上から、内部の token 発行（M2M、token exchange、workload credential）は、token 単位課金の managed IdP に載せない [D]。自社の STS（RS-06 の領域）で発行し、cache で発行数を抑える方針を ADR-009 に入れる。
- **RS-15#76** 費用の桁を比べると次のようになる [D][A-054]。
  - A-054 の 24 FTE に、未登録の仮定である 1 人年 1,000 万〜2,000 万円を掛けると、要員費は年 2.4 億〜4.8 億円である。managed の MAU 課金（RS-15#73、年約 0.08 億〜0.59 億円）より 1 桁大きい。
  - よって、人間の利用者の認証を managed にしても、TCO の主項目は要員とインフラのままである。managed の効果は、主に要員のうち認証・IdP の 5 名分と、その on-call の範囲の削減として評価する [D][A-054]。
  - 一方、M2M や check の従量課金を managed に載せた場合（RS-15#63, #75）は、要員費と同じ桁か、それ以上になる。

### 3.16 比較評価軸・build/buy の線引き・TCO の組み方（設計推論）

- **RS-15#77** 比較評価軸（R-093 の 13 軸と seed-02 11-1 を、本調査で測れる形にしたもの）[D]:

  | 軸 | 何で測るか | 本調査で得た手掛かり |
  |---|---|---|
  | プロトコル適合 | 採用版での OIDF conformance の自社実行結果（FAPI 2.0 の DPoP/mTLS、Message Signing を含む） | RS-15#3〜#8 |
  | 所在地・マルチリージョン | テナント/プロジェクトの所在地の固定性、提供地域（日本・EU・米国）、副リージョンでの書込み可否、同期遅延の制約 | RS-15#16, #24, #27, #36, #43, #51 |
  | 可用性の約束 | SLA の数値、停止の定義、除外事項、クレジットの上限、公開された実績値 | RS-15#37, #38, #42, #50, #56 |
  | export 可能性 | password hash（アルゴリズム・パラメータ付き）、passkey の公開鍵 credential、MFA secret、関係データ、監査ログ。経路（API か ticket か）と期日の保証 | RS-15#17, #23, #39, #44, #52, #53, #57 |
  | import 可能性 | 受け付ける hash の方式と上限、JIT 移行の仕組み | RS-15#23, #39, #52, #57 |
  | 識別子の可搬性 | RP ID・issuer・entityID を自社ドメインに固定できるか | RS-15#46, #54, #59 |
  | 料金構造 | 課金単位（MAU、aDAU、登録者、vCPU、token、check）、無料枠、add-on、価格改定の通知条項 | RS-15#19, #30, #35, #48, #49, #56 |
  | 脆弱性対応 | サポート対象版、修正期限の有無と日数、CVE の公開方針 | RS-15#13, #22, #31, #32, #40, #47 |
  | 更新追随の負荷 | release 周期、破壊的変更の扱い、LTS の有無 | RS-15#12, #14, #28 |
  | ライセンスと機能の有償化 | OSS ライセンス、有償版だけにある必須機能 | RS-15#21, #28, #31 |
  | 単一主体への依存（bus factor） | 認定名義、主たる開発企業、CNCF 成熟度 | RS-15#3, #9, #33 |
  | 退出条件 | 予告期間、移行期間、取得期間、消去、乗換え費用 | RS-15#55, #64〜#68 |
  | 要員 | on-call の系統数と人数、ベンダーサポートの応答時間 | RS-15#61, #70, #71 |
- **RS-15#78** build/buy の線引き（R-094 の「認証プロトコル・認証器・回復は自作しない」を、本調査の結果で具体化したもの）[D]:

  | 区分 | 対象 | 理由（RS-15#） |
  |---|---|---|
  | 自作しない（既製品・OSS を使う） | OAuth/OIDC の AS core、FAPI 2.0 の実装、WebAuthn の検証、password hashing、暗号ライブラリ、HSM/KMS | 適合の証拠を conformance suite で得られ、規範要求（#58, #59）の実装誤りの危険を自社で負わない（#4, #11） |
  | 自作する | ドメインの認可モデル、PEP SDK、テナント context、監査 schema、policy の統治、fail-mode、移行・出口のツール群（export/import 変換、JIT 移行、dual-run） | どの製品にもない、または製品ごとに異なり出口の可否を左右する（#17, #23, #39, #44, #60） |
  | self-host の OSS を採る（自作はしない） | 内部 STS（token exchange、M2M、workload credential）、PDP | 従量課金では費用の桁が変わり（#63, #75）、遅延と cell 配置を自社で制御する必要がある |
  | 両論（PoC で決める） | 人間の利用者向けの AS / IdP（managed か self-host か） | 所在地（#36, #43）、FAPI 2.0（#5, #6）、export（#44, #53）、要員（#71）、SLA（#37, #42, #50）の各軸で優劣が入れ替わる |
- **RS-15#79** TCO の組み方（RS-15#69 の GAO の方法を本件に当てはめたもの）[D]:
  - 費目（WBS）は次の 9 つとする。(1) ライセンス・サブスクリプション（MAU/aDAU/user/vCPU）。(2) 従量課金（M2M、token、check、SMS、所在地 add-on、MRR）。(3) インフラ（計算、DB、KMS/HSM、ネットワーク、リージョンごとの最小構成）。(4) 要員（SRE、IdP、PDP、SDK、セキュリティ、統制）。(5) 更新追随（minor・major の検証と移行）。(6) 保証（OIDF 認定料 RS-15#2、pentest、第三者評価）。(7) 移行（credential 移行、passkey の再登録、顧客側 federation の再設定 A-114）。(8) 退出（export 変換、dual-run、旧系の並行運用）。(9) リスク（SLA 違反時のクレジットを超える損失、修正期限のない脆弱性の受容）。
  - 幅の出し方は 3 段とする。(a) 前提台帳の低・基準・高のシナリオ。(b) cost driver を 1 つずつ動かす感度試験（MAU 比率、federate 比率、M2M 発行率、Check 率、要員単価、為替）。(c) 主要 driver を同時に動かすリスク・不確実性分析で、信頼水準付きの範囲を出す。
  - 点推定だけを決裁資料に載せない（RS-15#69）。
  - 期間は 3〜5 年の再決裁周期（A-101）ごとに区切る。20 年の総額は、置換 1 回以上（A-104）を含むシナリオとして別に示す。

---

## 4. 標準・文書ステータス表

| 名称 | 版 | 状態 | 公表日 | 確認日 | URL |
|---|---|---|---|---|---|
| OIDF Certified OpenID Providers & Profiles | 公開一覧（随時更新） | 公開記録 | 記載なし | 2026-10-03 | https://openid.net/certification/certified-openid-providers-profiles/ |
| OIDF Certified FAPI 2.0 OP Security Profile Final & Message Signing Final | 公開一覧（随時更新） | 公開記録 | 記載なし | 2026-10-03 | https://openid.net/certification/certified-fapi-2-0-op-security-profile-final-message-signing-final/ |
| FAPI 2.0 Security Profile / Message Signing | Final | final（OIDF） | 本稿では未確認（RS-04 を参照） | 2026-10-03 | https://openid.net/certification/all-certified-implementations/ （一覧の名称で状態を確認） |
| OIDF Self-Certification Fees | 版表記なし | 公開（随時改定） | 記載なし | 2026-10-03 | https://openid.net/certification/fees/ |
| W3C Web Authentication Level 3 | Level 3 | W3C Recommendation | 2026-08-25 | 2026-10-03 | https://www.w3.org/TR/webauthn-3/ |
| NIST SP 800-63B-4 | Rev.4 | final | 2025-07-31 | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/63/b/4/final |
| EU Data Act（Regulation (EU) 2023/2854） | OJ L, 2023/2854, 22.12.2023 | 公布済・適用中（2025-09-12 適用。第 29 条の乗換え費用ゼロは 2027-01-12 から） | 2023-12-22（OJ 掲載。採択 2023-12-13） | 2026-10-03 | https://eur-lex.europa.eu/eli/reg/2023/2854/oj/eng |
| DORA（Regulation (EU) 2022/2554） | OJ L 333, 27.12.2022 | 公布済・適用中（2025-01-17 適用） | 2022-12-27 | 2026-10-03 | https://eur-lex.europa.eu/eli/reg/2022/2554/oj/eng |
| GAO Cost Estimating and Assessment Guide | GAO-20-195G | final | 2020-03-12 | 2026-10-03 | https://www.gao.gov/products/gao-20-195g |
| Google SRE book「Being On-Call」 | web 版 | 公開 | 本稿では未確認 | 2026-10-03 | https://sre.google/sre-book/being-on-call/ |
| Keycloak | 26.8.0 | release（CNCF Incubating） | 2026-10-01 | 2026-10-03 | https://github.com/keycloak/keycloak/releases |
| Red Hat build of Keycloak Life Cycle and Support Policies | 版表記なし | 公開 | 記載なし | 2026-10-03 | https://access.redhat.com/support/policy/updates/red_hat_build_of_keycloak_notes |
| Keycloak 文書（features、high availability、importExport、oidc-layers） | 26.8.0 版の文書（版選択で 26.8.0 が選択済み。Nightly ではない） | 公開 | 記載なし | 2026-10-03 | https://www.keycloak.org/server/features ほか |
| Ory Hydra / Ory Kratos | v26.2.0 | release（Apache-2.0） | 2026-03-20 | 2026-10-03 | https://github.com/ory/hydra/releases |
| ZITADEL | v4.19.4 | release（AGPL-3.0） | 2026-10-01 | 2026-10-03 | https://github.com/zitadel/zitadel/releases |
| authentik | 2026.8.3 | release（MIT＋enterprise 別ライセンス） | 2026-09-17 | 2026-10-03 | https://github.com/goauthentik/authentik/releases |
| node-oidc-provider | v9.12.2 | release（MIT） | 2026-09-05 | 2026-10-03 | https://github.com/panva/node-oidc-provider |
| Microsoft Online Services SLA | 2026 年 10 月版（WW English、文書日付 2026-10-01） | 公開 | 2026-10-01 | 2026-10-03 | https://www.microsoft.com/licensing/docs/view/Service-Level-Agreements-SLA-for-Online-Services |
| Microsoft Entra External ID 料金（Learn／Retail Prices API） | ms.date 2026-06-22／Basic MAU は 2025-07-01 発効 | 公開（随時改定） | 2026-06-22 | 2026-10-03 | https://learn.microsoft.com/en-us/entra/external-id/external-identities-pricing |
| Auth0 Platform Service Level Agreement | Rev 4.5.2 | 公開（現行契約への適用は未確認） | 2022-02-01 | 2026-10-03 | https://www.okta.com/sites/default/files/2022-02/ServiceLevelAgreement-for-Auth0-Platform-02-7-22.pdf |
| Amazon Cognito SLA | 版表記なし | 公開 | 2022-05-04（最終更新） | 2026-10-03 | https://aws.amazon.com/cognito/sla/ |
| Amazon Cognito 料金 | 版表記なし | 公開（随時改定） | 記載なし | 2026-10-03 | https://aws.amazon.com/cognito/pricing/ |
| Google Identity Platform 料金・SLA | 版表記なし | 公開（随時改定） | 記載なし | 2026-10-03 | https://cloud.google.com/identity-platform/pricing , https://cloud.google.com/identity-platform/sla |
| AWS Customer Agreement | Last Updated: 2026-08-14 | 公開（随時改定） | 2026-08-14（最終更新） | 2026-10-03 | https://aws.amazon.com/agreement/ |

---

## 5. 設計への含意（ADR・設計文書への入力）と PoC で実測すべきこと

### 5.1 ADR・設計文書への入力

| 入力先 | 入力する内容 | 根拠（RS-15#） | 対応 R-ID |
|---|---|---|---|
| ADR-001（managed IdP か自営 AS か） | 人間の利用者向け AS を「両論」とし、RS-15#77 の 13 軸で比較する。内部 STS と PDP は self-host を前提にする。FAPI 2.0 の対象顧客（A-081）がいる場合、FAPI 2.0 の conformance 実測を候補の足切り条件にする | #4〜#8, #73〜#78 | R-088, R-094 |
| ADR-018（出口戦略） | RP ID を自社ドメインに固定する。hash のアルゴリズム・パラメータを移行先候補の上限と合わせて記録する。export が不可の製品からは JIT 移行で出る。passkey の公開鍵 credential の export を必須とする | #17, #23, #39, #44, #52〜#60 | R-090, R-091, R-208 |
| ADR-021（識別子の永続性） | WebAuthn の RP ID、issuer URL、SAML entityID を、ベンダーのドメインでなく自社ドメインに置く | #46, #54, #59 | R-208 |
| ADR-013（cell 分割と fail-mode） | 候補はいずれも「テナント＝1 所在地」であることを前提に、所在地ごとの cell と global の振り分け部品を設計する。Cognito の MRR は副リージョンで書込みができないことを fail-mode 表に入れる | #16, #24, #36, #43, #51 | R-150〜R-157（RS-09 と連携） |
| ADR-009（workload identity と委任） | M2M と token exchange を token 単位課金の managed IdP に載せない。自社の STS で発行し、cache で発行数を抑える | #49, #75 | R-206 |
| ADR-010（認可エンジン） | check 単位課金と store あたりの上限（Auth0 FGA の毎秒 500）を、RS-07 の性能比較に費用軸として加える | #61〜#63 | R-093, R-097 |
| ADR-005 / ADR-020（token profile、FAPI 2.0 の適用範囲） | Auth0 の FAPI 2.0 認定と設定は mTLS 送信者制約だけで、DPoP は記録にない。Keycloak は機能を記載しているが認定がない。DPoP を必須にするかどうかで候補が変わる | #4〜#6, #11, #45 | R-096 |
| ADR-016（versioning と deprecation） | self-host の更新追随周期（Keycloak は年 4 回の minor、ZITADEL は 3 か月ごとの major、authentik は 2 系列サポート）を、PEP SDK や依存先の追随計画に入れる | #12, #28, #31 | R-209 |
| DL-13（製品選定評価・出口戦略） | RS-15#77 の評価表と、RS-15#68 の退出条項の必須項目 | #68, #77 | R-088, R-090, R-093 |
| DL-27（運用・要員モデル） | A-054 の SRE 人数を、RS-15#70 の目安と on-call の系統数で見直す。managed を選んでも残る on-call を明記する | #70, #71 | R-092, R-137, R-139, R-141 |
| DL-33（TCO・vendor support・LTS 評価） | RS-15#79 の 9 費目と 3 段の幅の出し方、RS-15#73〜#76 の試算、非公開価格の RFP 項目 | #69, #72〜#76, #79 | R-141 |
| 11_contracts/（退出条項の様式） | Data Act 第 25 条の各項（予告 2 か月以下、移行 30 日・最大 7 か月、取得 30 日以上、データの網羅表、消去）、hash・MFA secret・passkey 公開鍵の明示、SLA の除外事項とクレジット上限、価格改定・SLA の不利な変更・機能廃止の通知期間（AWS は値上げ 30 日、SLA の不利な変更 90 日、機能廃止 12 か月） | #42, #55, #64〜#68 | R-090, R-208 |
| 01_governance/assumptions-register.md | 未登録の仮定（為替、要員単価、aDAU と DAU の比、M2M の平均とピークの比）を A-120 以降に登録する | #72 | R-092, R-141 |

### 5.2 PoC で実測すべきこと

1. **OIDF conformance の自社実行**（R-089、R-096）: 候補の採用予定版（Keycloak 26.8.x、Ory Hydra の OEL 版、ZITADEL v4.x、node-oidc-provider v9.x、Auth0 HRI の契約環境）で、OIDC Basic/Config と FAPI 2.0 Security Profile（mTLS と DPoP の両構成）、Message Signing を実行し、ログを保存する（RS-15#4〜#8）。
2. **出口の往復試験**（R-091）: 合成した 100 万人分の利用者（password hash、TOTP、passkey の公開鍵 credential、federation の紐付けを含む）を、候補 A から B へ export・import し、所要時間、hash の互換性（Cognito のパラメータ上限）、passkey の継続利用率、失敗件数を測る（RS-15#17, #23, #44, #52, #57, #60）。Cognito は 1 ファイル 50 万行・同時 1 job の制約下で実測する。
3. **JIT 移行の期間**: hash を出せない製品からの移行で、利用者の何%がサインインするまでに何日かかるかを、As-Is のログ（A-111、A-115）から推定し、旧 IdP の並行運用期間と費用を出す（RS-15#39, #53）。
4. **Keycloak multi-cluster v2 の挙動**: DB コミット遅延 5ms と 10ms でのログイン・token 発行の p99 と、拠点障害時の停止時間・データ損失を測る。minor 更新時の停止手順の所要時間を測る（RS-15#16）。
5. **Cognito MRR の failover**: 副リージョンへの切替え時間、切替え中に失敗する操作（sign-up、reset、TOTP）の件数、主への切戻しの挙動を測る（RS-15#51）。
6. **課金単位の実測**: PoC の負荷で、各製品の課金メータ（MAU、aDAU、M2M token、check）が自社ログの数とどれだけずれるかを測り、RS-15#73〜#75 の試算を補正する。
7. **更新追随の工数**: Keycloak の minor 1 回分（例: 26.7→26.8）と ZITADEL の major 1 回分の検証・適用工数を測り、年間の費目（RS-15#79 の (5)）を出す。
8. **on-call の負荷**: PoC 期間中の alert とインシデントの件数を系統別に記録し、RS-15#70 の「1 シフト 2 件」の目安と比べて SRE 人数（A-054）を見直す。
9. **SLA の独立計測**: managed 候補に対して自社の合成監視で可用性を測り、ベンダーの公表値（RS-15#38）と比べる。

---

## 6. 調査の限界と未確認事項

- **ID の不一致**: traceability/deliverables.md は RS-15 を「統制枠組み・リスク手法」（DL-99）、build/buy を RS-14（DL-98）としている。research/ には別の番号体系のノート（例: RS-14 は B2B 顧客向け ID 機能）が並んでいる。本ノートは作業指示に従った。DL-83（調査ノート総覧）で対応表を作る必要がある。
- **OIDF 一覧の列の対応**: 版 0.2 の検証で、OP 認定一覧と FAPI 2.0 Final 一覧の表を HTML の列単位で解析し、行ごとのプロファイル別内訳を RS-15#3 に記載した。Auth0 の FAPI 2.0 の行（RS-15#5）は、MTLS＋MTLS、private key＋MTLS、OpenID Connect の 3 列に認定があり、DPoP の 2 列と Message Signing の 2 列は空欄であることを列単位で確認した。各試験計画の内容（plan-detail）は個別には開いていない。
- **FAPI 2.0・DPoP・PAR の対応（認定以外）**: Ory Hydra の PAR と DPoP、ZITADEL の PAR と DPoP、Entra External ID、Cognito、Google Identity Platform の PAR・DPoP・FAPI 2.0 対応は、公式文書で確認できなかった（未確認）。「対応しない」と確認したのではない。Auth0 の DPoP 文書は存在するが、提供状態（GA か Early Access か）と必要プランは確認できなかった。
- **Keycloak**: CLI export に hash 化済み password と WebAuthn credential が含まれるかは、公式文書の記述では確定できなかった（PoC 2 で確認）。Red Hat build of Keycloak の価格と、版ごとのサポート終了日の一覧は未確認である。multi-cluster と機能一覧の文書は、版選択で 26.8.0 が選ばれたリリース版の文書である（版 0.1 の「Nightly の表示」は誤読で、版 0.2 で訂正した）。stateless は 2026-07-17 の告知（26.7）では preview、26.8.0 の機能一覧では supported（既定で無効）であり、移行の経緯を示す公式のリリースノートは本稿では確認していない。
- **Ory**: 日本リージョンを個人データの保管場所に選べるかは未確認である。self-host（OSS 版・OEL）で SCIM が使えるか、OEL 限定かは、OEL の文書に記載がなく未確認である（Ory Network では Enterprise 限定）。料金ページの「48 時間」と方針文書の「Critical 14 日」の関係（測り方の違い）は、Ory の公式説明を確認していない。
- **ZITADEL**: 各 major 版のサポート期間とセキュリティ修正の backport の範囲、PRO プランの SLA 条件（料金ページは 99.5% と 99.95% を併記し、詳細料金表は「99.5% (add-on)」と表示）と、超過単価の 1 単位あたりの DAU 数は未確認である。AGPL-3.0 の義務の範囲（改変して network 経由で提供する場合の扱い）は法務確認が要り、本稿では判断していない。
- **authentik**: external user の課金単位が登録数か活動数か、従業員をどちらに分類できるかは未確認である。
- **Entra External ID**: Online Services SLA の Entra ID の項が External ID に適用されるか、Retail Prices API の「Core」メータがどの契約に適用されるか、External ID から password hash や passkey の記録を export する手段の有無、契約終了後のデータ保持期間は、いずれも未確認である。passkey の RP ID を自社ドメインにできるかも確認していない。
- **Auth0**: 料金ページの段階制の具体的な価格は、取得したテキストに表示されなかった（動的表示のため）。現行の Enterprise 契約に適用される SLA の版（Rev 4.5.2 か Docs の表か）、契約終了時のデータ返却条件、passkey の公開鍵 credential を export できるかは未確認である。
- **Cognito**: password hash の export 手段がないことは「公式文書に手段を確認できなかった」ことにとどまり、AWS が不可と明記した文書は見つけていない。MRR を使った場合のデータ所在地（副リージョンへの複製）と、日本・EU・米国の各リージョンで Essentials と MRR が提供されているかは未確認である。料金はリージョンで変わり得るが、確認したのは US East の計算例だけである。
- **Google Identity Platform**: 利用者データの保管場所（リージョンを選べるか）、Firebase CLI の `auth:export` が Identity Platform のプロジェクトとマルチテナントにそのまま使えるか、OIDF 認定の有無（一覧の「Google Federated Identity」は Google 自身の OP であり Identity Platform ではない）、脆弱性の公開方針は未確認である。
- **脆弱性対応**: AWS と Google の、managed サービスの脆弱性公開方針は調べていない。
- **要員の公開事例**: 認証・認可プラットフォームの体制規模や on-call 体制を当事者が一次資料で公表した事例は見つけられなかった。検索で見つかったのはベンダー・人材会社の記事（二次情報）だけで、根拠には使っていない。RS-15#70 の Google SRE 本は Google 社内の実践の記述であり、規範でも本件規模での実測でもない。
- **法令の適用**: Data Act が本基盤と各ベンダーの契約に適用されるか（契約主体、提供地、第 31 条の例外）、DORA の ICT 第三者事業者としての扱い、日本の金融分野のガイドライン（FISC 安全対策基準等）の退出条項の要求は、法務確認と RS-16 の結果待ちである。export 可能データの除外を述べた Data Act の前文は、版 0.2 の検証で前文 (82) と特定した。AWS Customer Agreement には乗換え（switching）や移行期間の条項が見当たらないが、各ベンダーが Data Act 向けに別の契約条項（service terms 等）を用意しているかは確認していない（RS-15#68）。
- **未登録の仮定**: 1 ドル 150 円、要員単価 1 人年 1,000 万〜2,000 万円、aDAU＝DAU、M2M のピークの月間継続（RS-15#72）は前提台帳に未登録である。台帳の A-120 以降に登録し、確定責任者（CFO、人事責任者、SRE 責任者）を決める必要がある。
- **試算の性格**: RS-15#73〜#76 は定価と仮定による感度計算であり、GAO のいう信頼水準付きの範囲（リスク・不確実性分析）にはなっていない。割引、為替変動、価格改定、税、サポート契約費は含まない。
- **照合**: 2026-10-03 に、作成者とは別の AI エージェントが全 74 脚注を原典と照合した（research/verification/RS-15-verification.md）。検証者も AI であり、人間のレビュアによる照合はまだ実施していない。

---

## 参考文献

[^1]: OpenID Foundation『OpenID Certification』web ページ（版表記なし）. https://openid.net/certification/ （参照箇所: Self-Certification, Independent Certification の説明、確認日: 2026-10-03）
[^2]: OpenID Foundation『Certified OpenID Providers & Profiles』公開一覧（随時更新）. https://openid.net/certification/certified-openid-providers-profiles/ （参照箇所: 一覧表の Red Hat/Keycloak, ORY GmbH, CAOS/ZITADEL, Authentik Security Inc, Filip Skokan, Microsoft, Okta, Auth0, Matias Woloski, Google の各行と列見出し（Basic OP〜3rd Party-Init OP）、Amazon の行の有無、確認日: 2026-10-03）
[^3]: OpenID Foundation『Certified FAPI 2.0 OP Security Profile Final & Message Signing Final』公開一覧（随時更新）. https://openid.net/certification/certified-fapi-2-0-op-security-profile-final-message-signing-final/ （参照箇所: 一覧表の Filip Skokan / node oidc-provider >= 9.2.0 行、Okta / Auth0 – Highly Regulated Identity – 202527 行と添付ファイル名、確認日: 2026-10-03）
[^4]: OpenID Foundation『Certified FAPI 2.0 OP Security Profile Second Implementer's Draft & Message Signing First Implementer's Draft』公開一覧. https://openid.net/certification/certified-fapi-2-0-op-security-profile-second-implementers-draft-message-signing-first-implementers-draft/ （参照箇所: 一覧表の全行、確認日: 2026-10-03）
[^5]: OpenID Foundation『Certified FAPI1 Adv. OpenID Providers & Profiles』公開一覧. https://openid.net/certification/certified-fapi1-adv-openid-providers-profiles/ （参照箇所: Red Hat / Keycloak 15.0.2 行、Filip Skokan / node oidc-provider 7.4.0 行、Okta / CIC – Highly Regulated Identity 1.0 行、確認日: 2026-10-03）
[^6]: OpenID Foundation『Self-Certification Fees』web ページ（版表記なし）. https://openid.net/certification/fees/ （参照箇所: OpenID Connect、FAPI 1 & FAPI 2、OP/RP の別払い、改定の注記、OSS の料金免除、確認日: 2026-10-03）
[^7]: Cloud Native Computing Foundation『Keycloak』プロジェクトページ. https://www.cncf.io/projects/keycloak/ （参照箇所: 成熟度と受理日、確認日: 2026-10-03）
[^8]: Keycloak『Enabling and disabling features』server guide（26.8.0 版の文書）. https://www.keycloak.org/server/features （参照箇所: Supported features, Disabled by default, Preview features、確認日: 2026-10-03）
[^9]: Keycloak『Securing applications and services with OpenID Connect』securing apps guide（26.8.0 版の文書）. https://www.keycloak.org/securing-apps/oidc-layers （参照箇所: Financial-grade API (FAPI) Support, FAPI client profiles、確認日: 2026-10-03）
[^10]: S. Thorgersen (Keycloak)『Backwards compatibility in Keycloak releases』Keycloak blog, 2024-10-08. https://www.keycloak.org/2024/10/release-updates （参照箇所: リリース周期と後方互換の方針、確認日: 2026-10-03）
[^11]: Keycloak『Security Policy』GitHub keycloak/keycloak. https://github.com/keycloak/keycloak/security/policy （参照箇所: Supported versions, Reporting, 受領確認の期限、確認日: 2026-10-03）
[^12]: Red Hat『Red Hat build of Keycloak Life Cycle and Support Policies』Red Hat Customer Portal（版表記なし）. https://access.redhat.com/support/policy/updates/red_hat_build_of_keycloak_notes （旧 URL https://access.redhat.com/node/7092877 から転送）（参照箇所: Full Support / Maintenance Support、major 版ごとの期間、同時サポート版数、確認日: 2026-10-03）
[^13]: Keycloak『Multi-cluster deployments (v2)』high availability guide（26.8.0 版の文書）. https://www.keycloak.org/high-availability/multi-cluster-v2/introduction （参照箇所: infrastructure requirements, When to use a multi-cluster setup, Limitations、確認日: 2026-10-03）
[^14]: A. Schwartz (Keycloak)『Multi-Cluster v2 and Stateless Mode now in Preview』Keycloak blog, 2026-07-17. https://www.keycloak.org/2026/07/multi-cluster-v2-and-stateless-mode （参照箇所: 冒頭（Keycloak 26.7 で preview）, Current limitations, Single cluster の trade-off, Feedback welcome、確認日: 2026-10-03）
[^15]: Keycloak『Multi-cluster deployments (v1)』high availability guide（26.8.0 版の文書）. https://www.keycloak.org/high-availability/multi-cluster/introduction （参照箇所: 試験した構成、単一リージョンの制約、停止時間、確認日: 2026-10-03）
[^16]: Keycloak『Importing and exporting realms』server guide（26.8.0 版の文書）. https://www.keycloak.org/server/importExport （参照箇所: export の対象と除外、--users の選択肢、Admin Console export の注意、確認日: 2026-10-03）
[^17]: Keycloak『Releases』GitHub keycloak/keycloak. https://github.com/keycloak/keycloak/releases （参照箇所: 26.8.0（2026-10-01）、リポジトリのライセンス表示 Apache-2.0、確認日: 2026-10-03）
[^18]: Ory『Pricing』web ページ（版表記なし）. https://www.ory.com/pricing （参照箇所: Ory Network Production / Growth / Enterprise、Ory Enterprise License、Compare pricing 表（SLA、Multi-Region Failover、SCIM、Directory Sync の行）、FAQ（aDAU の定義、セキュリティ修正）、確認日: 2026-10-03）
[^19]: Ory『Security policy』Ory docs. https://www.ory.com/docs/security-compliance/security （旧 URL https://www.ory.com/docs/ecosystem/security から転送）（参照箇所: 報告窓口、Ory Enterprise License & Ory Network の解決期限、Apache 2.0 利用者の扱い、確認日: 2026-10-03）
[^20]: Ory『Introduction to Ory Enterprise License』Ory docs. https://www.ory.com/docs/oel/getting-started （旧 URL https://www.ory.com/docs/self-hosted/oel から転送）（参照箇所: OEL の定義、Frequent, tested releases、Zero-downtime migrations、Multi-region deployments、Unlocked enterprise features、When to choose OEL、確認日: 2026-10-03）
[^21]: Ory『Export identities』Ory docs. https://www.ory.com/docs/kratos/manage-identities/export-user-accounts-identities （参照箇所: include_credential による export、確認日: 2026-10-03）
[^22]: Ory『Import identities』Ory docs. https://www.ory.com/docs/kratos/manage-identities/import-user-accounts-identities （参照箇所: 対応 hash アルゴリズム、passkey / WebAuthn credential の import、確認日: 2026-10-03）
[^23]: Ory『Personal data location and homing』Ory docs. https://www.ory.com/docs/security-compliance/personal-data-location （参照箇所: 保管場所の選択と恒久性、Enterprise 限定の Global / US Continental、運用データの複製、確認日: 2026-10-03）
[^24]: Ory『Releases』GitHub ory/hydra（ory/kratos も同日確認）. https://github.com/ory/hydra/releases （参照箇所: v26.2.0（2026-03-20）、ライセンス表示 Apache-2.0、確認日: 2026-10-03）
[^25]: ZITADEL『Pricing』web ページ（版表記なし）. https://zitadel.com/pricing （参照箇所: FREE / PRO / ENTERPRISE の各欄、Data Residency、確認日: 2026-10-03）
[^26]: ZITADEL『Zitadel v3: AGPL License, Streamlined Releases, and Platform Updates』ZITADEL blog, 2025-03-13. https://zitadel.com/blog/zitadel-v3-announcement （参照箇所: ライセンス変更、リリース周期、確認日: 2026-10-03）
[^27]: ZITADEL『zitadel/zitadel』GitHub リポジトリ（README、LICENSE、Releases）. https://github.com/zitadel/zitadel （参照箇所: README の License と機能一覧、最新リリース v4.19.4（2026-10-01）、確認日: 2026-10-03）
[^28]: ZITADEL『Security Policy』GitHub zitadel/zitadel. https://github.com/zitadel/zitadel/security/policy （参照箇所: 報告窓口、記載項目、確認日: 2026-10-03）
[^29]: ZITADEL『ZITADEL Software Release Cycle』ZITADEL Knowledge Base. https://help.zitadel.com/zitadel-software-release-cycle （参照箇所: General Availability, Maintenance, Release deployment with risk of downtime、確認日: 2026-10-03）
[^30]: Authentik Security『Pricing』web ページ（版表記なし）. https://goauthentik.io/pricing/ （参照箇所: Enterprise / Enterprise Plus、internal / external user の定義、確認日: 2026-10-03）
[^31]: Authentik Security『LICENSE』GitHub goauthentik/authentik（main）. https://github.com/goauthentik/authentik/blob/main/LICENSE （参照箇所: ディレクトリ別のライセンス、確認日: 2026-10-03）
[^32]: Authentik Security『SECURITY.md』GitHub goauthentik/authentik（main）. https://github.com/goauthentik/authentik/blob/main/SECURITY.md （参照箇所: Supported Versions, Our CNA, Researcher Recognition、確認日: 2026-10-03）
[^33]: F. Skokan『node-oidc-provider』GitHub README. https://github.com/panva/node-oidc-provider （参照箇所: Certification、対応仕様一覧、License、最新リリース v9.12.2（2026-09-05）、確認日: 2026-10-03）
[^34]: F. Skokan『Security Policy』GitHub panva/node-oidc-provider. https://github.com/panva/node-oidc-provider/security/policy （参照箇所: Supported Versions, Reporting、確認日: 2026-10-03）
[^35]: Microsoft『External ID Pricing - Microsoft Entra External ID』Microsoft Learn, ms.date 2026-06-22. https://learn.microsoft.com/en-us/entra/external-id/external-identities-pricing （参照箇所: External ID billing model, Premium add-ons、確認日: 2026-10-03）
[^36]: Microsoft『Azure Retail Prices API』（productName に External ID を含むメータの照会結果）. https://prices.azure.com/api/retail/prices?$filter=contains(productName,%27External%20ID%27) （参照箇所: Basic / Core Monthly Active Users、Go-Local Add-on、M2M Authentication Token、Phone Authentication の各メータと effectiveStartDate、確認日: 2026-10-03）
[^37]: Microsoft『Microsoft Entra ID and data residency』Microsoft Learn, ms.date 2025-11-06. https://learn.microsoft.com/en-us/entra/fundamentals/data-residency （参照箇所: Core Store, cloud solution models 表, Go-Local add-on、確認日: 2026-10-03）
[^38]: Microsoft『Service Level Agreements (SLA) for Online Services』2026 年 10 月版（WW English, docx）. https://www.microsoft.com/licensing/docs/view/Service-Level-Agreements-SLA-for-Online-Services （参照箇所: Microsoft Azure Services and Plans > Microsoft Entra ID（Microsoft Entra ID Basic and Microsoft Entra ID Premium）の定義とサービスクレジット表、確認日: 2026-10-03）
[^39]: Microsoft『Service Level Agreement performance for Microsoft Entra ID』Microsoft Learn, ms.date 2026-01-06. https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-sla-performance （参照箇所: How is SLA measured（"issued a token or an error response"）, Recent worldwide SLA performance 表と注記, SLA attainment、確認日: 2026-10-03）
[^40]: Microsoft『Migrate users and credentials to Microsoft Entra External ID』Microsoft Learn, ms.date 2026-03-16. https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-migrate-users （参照箇所: Stage 1〜Stage 3、確認日: 2026-10-03）
[^41]: Microsoft Security Response Center『Toward greater transparency: Unveiling Cloud Service CVEs』MSRC blog, 2024-06-27. https://www.microsoft.com/en-us/msrc/blog/2024/06/toward-greater-transparency-unveiling-cloud-service-cves （参照箇所: クラウドサービス CVE の発行方針、確認日: 2026-10-03）
[^42]: Okta (Auth0)『Pricing - Auth0』web ページ（版表記なし）. https://auth0.com/pricing （参照箇所: Free / Essentials / Professional / Enterprise の欄（Enterprise の「99.99% SLA」）、Compare Plans の SLA 行、FAQ の稼働率の記述、確認日: 2026-10-03）
[^43]: Okta『Auth0 Platform Service Level Agreement』Rev 4.5.2, 2022-02-01（PDF）. https://www.okta.com/sites/default/files/2022-02/ServiceLevelAgreement-for-Auth0-Platform-02-7-22.pdf （参照箇所: §1 Definitions, §2.1〜§2.4、確認日: 2026-10-03）
[^44]: Okta (Auth0)『Service Level Agreements』Auth0 Docs. https://auth0.com/docs/troubleshoot/customer-support/services-level-descriptions （旧 URL https://auth0.com/docs/support/services-level-descriptions から転送）（参照箇所: 可用性の約束とサービスレベルクレジットの表、確認日: 2026-10-03）
[^45]: Okta (Auth0)『Create Tenants』Auth0 Docs. https://auth0.com/docs/get-started/auth0-overview/create-tenants （参照箇所: 地域と locality の表、確認日: 2026-10-03）
[^46]: Okta (Auth0)『Export Data』Auth0 Docs. https://auth0.com/docs/troubleshoot/customer-support/manage-subscriptions/export-data （参照箇所: API で取得できない情報、support ticket、Free プランの扱い、確認日: 2026-10-03）
[^47]: Okta (Auth0)『Export Password Hashes and MFA Secrets』Auth0 Docs. https://auth0.com/docs/manage-users/user-migration/export-password-hashes-and-mfa-secrets （参照箇所: 依頼手順、PGP 鍵の要件、Wait for eligibility review（ETA）、Provide the required documentation、リンクの有効期限、確認日: 2026-10-03）
[^48]: Okta (Auth0)『Configure FAPI Compliance』Auth0 Docs. https://auth0.com/docs/get-started/applications/configure-fapi-compliance （参照箇所: プランの要件、選択できる準拠レベル、確認日: 2026-10-03）
[^49]: Okta (Auth0)『Enable and Configure Passkey Authentication for Database Connections』Auth0 Docs. https://auth0.com/docs/authenticate/database-connections/passkeys/configure-passkey-policy （参照箇所: custom domain と RP ID の注意、確認日: 2026-10-03）
[^50]: Okta『Vulnerability Reporting Policy』web ページ. https://www.okta.com/legal/vulnerability-reporting-policy/ （旧 URL https://www.okta.com/vulnerability-reporting-policy/ から転送）（参照箇所: 報告窓口、対応の約束、開示方針、確認日: 2026-10-03）
[^51]: Amazon Web Services『Amazon Cognito Pricing』web ページ（版表記なし）. https://aws.amazon.com/cognito/pricing/ （参照箇所: 無料枠の注記 1〜3、Lite / Essentials / Plus の MAU 単価、federation の単価、M2M の計算例 1・2、multi-Region replication の add-on の計算例、確認日: 2026-10-03）
[^52]: Amazon Web Services『Amazon Cognito Service Level Agreement』最終更新 2022-05-04. https://aws.amazon.com/cognito/sla/ （参照箇所: Service Commitment, Service Credits, Exclusions、確認日: 2026-10-03）
[^53]: Amazon Web Services『Multi-Region replication for user pools』Amazon Cognito Developer Guide. https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-multi-region.html （参照箇所: 冒頭, Things to know, Limitations（federate 利用者の制約を含む）, Failover、確認日: 2026-10-03）
[^54]: Amazon Web Services『Importing users into user pools from a CSV file』Amazon Cognito Developer Guide. https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-using-import-tool.html （参照箇所: 冒頭, Formatting the CSV file, Starting a user import job, Importing users with password hashes（Supported password hashing algorithms を含む）、確認日: 2026-10-03）
[^55]: Amazon Web Services『Build a framework for exporting user profile and group information from your Amazon Cognito user pools』Guidance for User Profiles Export with Amazon Cognito 実装ガイド. https://docs.aws.amazon.com/solutions/latest/cognito-user-profiles-export-reference-architecture/overview.html （参照箇所: Limitations、確認日: 2026-10-03）
[^56]: Amazon Web Services『WebAuthnConfigurationType』Amazon Cognito User Pools API Reference. https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_WebAuthnConfigurationType.html （参照箇所: 型の説明, RelyingPartyId、確認日: 2026-10-03）
[^57]: Amazon Web Services『AWS Customer Agreement』Last Updated: 2026-08-14. https://aws.amazon.com/agreement/ （参照箇所: §1.5 Notice of Changes to the Services、§1.6 Notice of Changes to the Service Level Agreements、§3.1 Service Fees、§5.3(b) Post-Termination、確認日: 2026-10-03）
[^58]: Google Cloud『Identity Platform pricing』web ページ（版表記なし）. https://cloud.google.com/identity-platform/pricing （参照箇所: Tier 1 providers, Tier 2 providers, For phone authentication and multi-factor authentication、確認日: 2026-10-03）
[^59]: Google Cloud『Identity Platform Service Level Agreement (SLA)』web ページ. https://cloud.google.com/identity-platform/sla （参照箇所: SLO とクレジット表, 定義、確認日: 2026-10-03）
[^60]: Google (Firebase)『auth:import and auth:export』Firebase Documentation. https://firebase.google.com/docs/cli/auth （参照箇所: Password hash parameters, auth:export（scrypt 以外の hash は空欄で出力される旨の Note を含む）, auth:import の hash-algo、確認日: 2026-10-03）
[^61]: NIST『SP 800-63B-4: Digital Identity Guidelines — Authentication and Authenticator Management』Final, 2025-07-31. https://pages.nist.gov/800-63-4/sp800-63b.html （参照箇所: §3.1.1.2 Password Verifiers、確認日: 2026-10-03）
[^62]: W3C『Web Authentication: An API for accessing Public Key Credentials - Level 3』W3C Recommendation, 2026-08-25. https://www.w3.org/TR/webauthn-3/ （This version: https://www.w3.org/TR/2026/REC-webauthn-3-20260825/）（参照箇所: Status of this document、§1 の RP ID scope の説明、§5.5 PublicKeyCredentialRequestOptions の rpId メンバ、確認日: 2026-10-03）
[^63]: AuthZed『Pricing』web ページ（版表記なし）. https://authzed.com/pricing （参照箇所: Open Source / Cloud / Self-Hosted / Dedicated Cloud、Support Tiers、確認日: 2026-10-03）
[^64]: Okta (Auth0)『Subscription Plans』Auth0 FGA docs. https://docs.fga.dev/subscription-plans （参照箇所: Free Trial / Enterprise、rate limits 表、regions、data limits、確認日: 2026-10-03）
[^65]: European Union『Regulation (EU) 2023/2854 (Data Act)』OJ 掲載版. https://eur-lex.europa.eu/eli/reg/2023/2854/oj/eng （参照箇所: Article 25(1), (2)(a)(d)(e)(f)(g)(h), (4)、確認日: 2026-10-03）
[^66]: European Union『Regulation (EU) 2023/2854 (Data Act)』OJ 掲載版. https://eur-lex.europa.eu/eli/reg/2023/2854/oj/eng （参照箇所: Article 29(1)〜(3), Article 50、確認日: 2026-10-03）
[^67]: European Union『Regulation (EU) 2023/2854 (Data Act)』OJ 掲載版. https://eur-lex.europa.eu/eli/reg/2023/2854/oj/eng （参照箇所: Article 2(8), 2(38), recital (80), recital (82)、確認日: 2026-10-03）
[^68]: European Union『Regulation (EU) 2023/2854 (Data Act)』OJ 掲載版. https://eur-lex.europa.eu/eli/reg/2023/2854/oj/eng （参照箇所: Article 31(1)(2)、確認日: 2026-10-03）
[^69]: European Union『Regulation (EU) 2022/2554 (DORA)』OJ L 333, 2022-12-27. https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32022R2554 （参照箇所: Article 28(8)、確認日: 2026-10-03）
[^70]: European Union『Regulation (EU) 2022/2554 (DORA)』OJ L 333, 2022-12-27. https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32022R2554 （参照箇所: Article 30(3)(f), recital (74), Article 64、確認日: 2026-10-03）
[^71]: U.S. Government Accountability Office『Cost Estimating and Assessment Guide: Best Practices for Developing and Managing Program Costs』GAO-20-195G, 2020-03-12. https://www.gao.gov/assets/gao-20-195g.pdf （参照箇所: 信頼できる見積りの 4 特性、Chapter 3 の 12 手順（p.35）、感度分析とリスク・不確実性分析の章の記述、確認日: 2026-10-03）
[^72]: Google『Site Reliability Engineering』Chapter 11 "Being On-Call"（web 版）. https://sre.google/sre-book/being-on-call/ （参照箇所: on-call の最少人数、on-call 時間の上限、1 シフトあたりのインシデント数、確認日: 2026-10-03）
[^73]: Amazon Web Services『Amazon Verified Permissions pricing』web ページ（改定日表記なし。RS-07#47 で検証済み）. https://aws.amazon.com/verified-permissions/pricing/ （参照箇所: Single Authorization Requests の単価、確認日: 2026-10-03（RS-07 の確認日））
[^74]: Keycloak『High availability overview』high availability guide（26.8.0 版の文書）. https://www.keycloak.org/high-availability/introduction （参照箇所: multi-cluster v1 の deprecated 表記と v2 の推奨、確認日: 2026-10-03）
[^75]: ZITADEL『Pricing』詳細ページ（見出し "Explore our pricing options in detail."、版表記なし）. https://zitadel.com/pricing/detail （参照箇所: 比較表の Availability SLA・Support SLO 行、Zitadel Cloud Pro Calculator の Daily Active Users 行、確認日: 2026-10-03）
