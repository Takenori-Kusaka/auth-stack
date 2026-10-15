# RS-09 独立検証記録（レジリエンス・cell・fail mode）

> 文書ID: RS-09-VER / 版: 1.0 / 状態: review / 最終更新: 2026-10-03
> 対応要求: RS-09 と同じ（R-077〜R-087（操作階層別の数値・整合性・PDP不達時挙動・監査不能時挙動・代替経路・限定grace・一律値撤回）, R-099（PDP topology・cell・fault domain）, R-111（kill switch）, R-116（PDP隔離）, R-149〜R-157（段階展開・tenant/domain封じ込め・per-tenant store・quota・cell・段階rollout・緊急freeze・既知良好版復帰・global集約時の実証）, R-174（障害注入）, R-179・R-180（導入順序・自動rollback条件）, R-192・R-194（可用性・変更の数値契約）, R-207（被害を1テナント/1サービス/1期間に封じ込める論証）, R-210（安全な縮退・復旧・rollback））
> 対象: research/RS-09-resilience-cell-failmode.md（検証前 v0.1 → 検証後 v0.2）
> 依存文書: CONVENTIONS.md, research/RS-09-resilience-cell-failmode.md
> 検証者: AI エージェント（Claude）。RS-09 の作成者とは別のエージェントが実施した。人間による検証ではない。

## 1. 検証方法

- 全 37 脚注について、脚注の URL（または同一原典の公式な別所在）から本文を取得し、脚注が付いた各文（§2 結論サマリ、§3 の RS-09#1〜#75、§3.7 事故表、§4 ステータス表）を原典の該当箇所と照合した [D]。
- 取得手段: curl で HTML/PDF を保存し、HTML はテキスト化、PDF は pdftotext で抽出して、引用句を文字列検索で照合した [D]。AWS Builder Center の 4 記事（[^2][^3][^20][^21]）は本文が動的描画のため Tavily extract（advanced）で取得した [D]。Wayback Machine（[^7][^25][^26]）は 429 応答のため間隔を空けて `id_` 形式で再取得した [D]。NIST SP 800-53 は CSRC の掲載ページで版を確認し、本文は NIST 公式 OSCAL カタログ（version 5.2.0、usnistgov/oscal-content）で統制文と解説を照合した [D]。
- 判定基準: 「支持」は主張の内容・数値・日付・規範強度が原典と一致するもの。「部分支持」は主旨は原典にあるが、一般化・強度・帰属・範囲のいずれかが原典とずれる文を含むもの。「不支持」は原典に根拠がないもの。「検証不能」は原典を取得できないもの [D]。1 つの脚注を複数の文が引く場合、1 文でもずれがあれば部分支持とした [D]。
- 規範強度: `[N]` の脚注（[^10][^13][^14]）は、原典の要求文の形（shall/should、統制文、検証要件とレベル）まで照合した [D]。

## 2. 判定サマリ

| 区分 | 件数 | 脚注 |
|---|---|---|
| 脚注総数 | 37 | [^1]〜[^37] |
| 原典本文を取得 | 37 | 全件 |
| 支持 | 31 | 下表参照 |
| 部分支持（修正済み） | 6 | [^9], [^15], [^25], [^26], [^33], [^37] |
| 不支持 | 0 | — |
| 検証不能 | 0 | — |

判定とは別に、所在・版・日付・節名の記載を正した脚注が 7 件ある [D]。内容が支持されたもののうち 5 件（[^14] 版を固定した URL、[^20][^21] 著者・日付、[^29] URL 移転、[^30] 更新日）と、部分支持の修正と同時に直した 2 件（[^15] 参照節名、[^33] 掲載日時）である [D]。

## 3. 脚注ごとの判定表

| 脚注 | 原典（取得先） | 照合した主張 | 判定 | 版・状態・日付・強度の確認 | 備考 |
|---|---|---|---|---|---|
| [^1] | AWS『Reducing the Scope of Impact with Cell-Based Architecture』全 38 節（docs.aws.amazon.com） | #1〜#7（cell 定義、分割キー、router・cell・control plane、router の SPOF と cell 化、適用目安と欠点、100%/5% の問い、wave 配備と canary cell、override table、初日から複数 cell・移動・故障モード表、移動 4 段階、shuffle sharding は cell 内のみ）、#12（control plane は CP、data plane は AP、S3 から読み込んだ経路で転送継続）、§2-3 | 支持 | Document history: Initial publication 2023-09-20、改訂なし。非規範の whitepaper | canary cell の記述は「Why use」節にある |
| [^2] | Builder Center『Workload isolation using shuffle-sharding』（Tavily） | #7（8 worker・28 通り・1/28、通常 sharding 1/4、Route 53 の 2048 仮想 NS・4 個・7,300 億通り・2 個を超えて共有しない、fault tolerant な client が前提の原文） | 支持 | 著者表記 Colm。Published 2026-06-12、Last modified 2026-06-15 | — |
| [^3] | Builder Center『Minimizing correlated failures in distributed systems』（Tavily） | #8（運用工具が複数 cell に同時に触れない、複数 AZ へ同時配備しない、資格情報・秘密の有効期限と cache TTL に jitter。原文 "Varying expiration times of short-term credentials and secrets."） | 支持 | 著者 Joe Magerramov | — |
| [^4] | SRS ch.8（google.github.io） | #9（データセンターごとの証明書で 1 拠点分だけ失効、failure domain ごとのデータ複製、境界越え操作の失敗を継続検証）、#16（high-availability の例 "Use data cached on local storage..."、low-dependency と "inversely proportional"）、#19（allow all / deny all、最低限の security posture）、#20（"Security-critical operations should not fail open."、強い統制を持つ低コスト代替、注 11 "Systems using ACLs must fail closed (secure)"）、#23（自動化に大規模・広範囲の policy 変更をさせない、change budget、復旧用サービスを自動化が止めない、自己完結の検知）、§2-5 | 支持 | 書籍 2020。著者表記を確認 | — |
| [^5] | Amazon Builders' Library『Static stability using Availability Zones』（aws.amazon.com） | #10（原文 "The data plane might not get updates ... continues to work."）、#11（回復経路に control plane を抱え込む、zonal deployment calendar で 2 AZ は別日に配備）、§2-4 | 支持 | 著者 Becky Weiss, Mike Furr。掲載日は未確認のまま | — |
| [^6] | AWS『AWS Fault Isolation Boundaries』Global services・Appendix A | #13（IAM control plane は us-east-1、data plane は各リージョン、"authentication and authorization for existing principals will continue to work"、STS は data plane のみ、"Do not rely on the control planes of partitional services in your recovery path."）、#43（break-glass 利用者の事前作成と金庫保管は静的に安定、障害時作成・障害時 policy 付与は不安定）、§2-4・§2-11 | 支持 | Initial publication 2022-11-16、Minor revision 2023-02-09 | — |
| [^7] | 『Avoiding fallback in distributed systems』Wayback 2024-08-16 | #14（"often make the outage worse" の原文、2001 年頃の retail 障害と全世界の fulfillment 停止、代替策 5 種、"A service must run both ..."、IAM role 資格情報の事前 push "remain valid for many hours"）、§2-6 | 支持 | 著者 Jacob Gabrielson | — |
| [^8] | AWS Well-Architected REL11-BP05 | #15（bimodal behavior の回避、一定周期で設定を更新し失敗時は前回キャッシュ値と警報、"Another example of bimodal behavior is allowing clients to bypass your workload cache when failures occur."） | 支持 | 版番号表示なし | — |
| [^9] | SRE 本 ch.22（sre.google） | #17、#32、#37（定義、最多原因は過負荷、10,000→1,000 QPS の例）、#38、#40、§2-13 | 部分支持 | 書籍 2016、著者 Mike Ulrich | §2-13 が「サーバ単位の再試行予算を求め」としていたが、原文は "Consider having a server-wide retry budget." で検討事項。#38 の記述（検討し）は正しい。§2-13 を修正 |
| [^10] | NIST SP 800-207（nvlpubs PDF） | #18（§5.2 の PEP・PE/PA 妨害、"This mitigates the risk but does not eliminate it."、運用ミスで企業全体が機能しなくなりうる、B.4.7 の依存の網と連鎖障害） | 支持 | final、2020-08。記述的指摘であり shall/should の要求文ではない、というノートの強度注記も正しい | — |
| [^11] | SRS ch.9 | #21（時刻・epoch サービスへの DoS で失効済み資格情報が再び有効になる例、失効リストの配布と "far more secure than a time-out-and-fail-open policy"）、#35（緊急 push は通常 push の最大速度版、"untested emergency practices won't work when you need them"、deny list・SVN/MASVN・署名鍵 rotation）、#36（時限爆弾、epoch の停止）、#41（アクセス制御サービスを全リモートアクセスの SPOF にしない、SSO 等から緊急資格情報を導出できない原文、寿命のトレードオフ）、#42（オフラインの代替資格情報、即時アクセスが必要な人に限定、平常と緊急の差の最小化、演習間隔の強制）、§2-5・§2-10・§2-11 | 支持 | 書籍 2020 | — |
| [^12] | SRS ch.10 | #22（"we fail static, meaning the policy does not change"、制御系はフロントエンドほど高可用でなくてよい）、#46（Gmail・Docs が DoS の影響を受けうるため予備の連絡手段と playbook 保管場所） | 支持 | 書籍 2020 | — |
| [^13] | NIST SP 800-53 Rev.5 Release 5.2.0（CSRC 掲載ページ＋公式 OSCAL カタログ 5.2.0） | #24（SC-24 の 3 つの組織定義パラメータ、SC-7(18)、CP-12、SI-17、CP-10）、#25（SA-8(24) 解説の secure failure and recovery と迂回再構成または停止、SA-8(19) 解説の通常・縮退・代替への回復中の安全状態）、#45（AC-2(2) の remove/disable の選択と期間）、§2-5 | 支持 | final。CSRC の Planning Note で Release 5.2.0 = 2025-08-27 を確認。統制文は命令形の組織定義パラメータ付きで、ノートの「統制文」という強度注記と一致 | 2026-10-03 時点で 5.2.0 より新しい Release の告知は CSRC ページに見当たらない |
| [^14] | OWASP ASVS 5.0.0 V16（release tag v5.0.0_release の raw と master を比較） | #26（16.5.2 L2、16.5.3 L2 と原文、16.5.4 L3） | 支持（URL 修正） | 5.0.0 の公開は 2025-05-30（GitHub Release）。脚注 URL が master（"Bleeding Edge"）を指していたため、release tag に差し替えた。同箇所の文言は両者で同一 | ノートは 16.5.2 を「検証要件」とし、レベルも原典どおり |
| [^15] | Microsoft Learn『Backup Authentication System for Microsoft Entra ID』 | #27、§2-7 | 部分支持 | ms.date 2025-07-22、updated_at 2026-09-28 を確認 | (1) 原文 "can't perform fresh revocation checks" は証明書失効（CRL）の節の文であり、§2-7 の「fresh な失効確認を行わない」は一般化しすぎ。原文は資格情報変更等の失効事象があった利用者をそもそも対象外とする。(2) #27 の「Conditional Access を既定で前回評価に基づいて扱い」は、原文では「リアルタイム評価できない一部の policy」に限る。両方を修正し、節名も原文どおりに直した |
| [^16] | Azure Blog『Advancing service resilience in Azure Active Directory with its backup authentication service』 | #28（"separate and decorrelated systems and network paths"、最大 3 日の保存、strict session match、93%、3 日超の新規認証は非対応、CAE による失効） | 支持 | 2021-11-22、Mark Russinovich 名義で本文は Nadim Abdo の更新 | ベンダー自身の公式ブログであり転載ではないため [V] として許容した。製品文書（[^15]）と内容は整合 |
| [^17] | SRE Workbook ch.14 | #30（3 性質、"avoid a global all-at-once push"、rollback は一時修正より早く緩和） | 支持 | 書籍 2018、著者 Štěpán Davidovič ほか | — |
| [^18] | SRE Workbook ch.16 | #31（canarying の定義、"If a release deploys instantly everywhere..."、20%×5%=1%、error budget の消費は露出量に比例） | 支持 | 書籍 2018、著者 Alec Warner, Štěpán Davidovič | — |
| [^19] | SRE Workbook App.C | #29、§2-2（Table C-1: binary push 37%、configuration push 31%、user behavior change 9%、2010–2017、数千件の postmortem の標本、標準 postmortem テンプレート） | 支持 | 書籍 2018 | `[M]` は公開値として出典と測定条件を記しており CONVENTIONS に適合 |
| [^20] | Builder Center『Automating safe, hands-off deployments』（Tavily） | #33（one-box は最大 10%、最初の 2 wave は 1 AZ（または cell）ずつ、bake time 1 時間以上・12 時間以上・2〜4 時間以上、集約 alarm での自動 rollback、要求数ゼロ等の標準メトリクス異常での自動 rollback） | 支持（日付・著者を追記） | ページに著者 Clare Liguori、Published 2026-06-12、Last modified 2026-07-07 | v0.1 は「著者は別記事の言及でのみ確認」としていたが、ページ自体に著者表記があった。§4・§6・脚注を更新 |
| [^21] | Builder Center『Ensuring rollback safety during deployments』（Tavily） | #34（Prepare/Activate、"While each of the two phases is safe for rolling back, we can't roll back both changes."、数日の bake period、backfilling 後にのみ旧形式の読取り削除） | 支持（著者を追記） | 著者表記 Sandeep Pokkunuri。掲載日は取得結果に表示なし | 脚注に著者を追記 |
| [^22] | SRE 本 ch.21 | #39（4 段階の criticality、global quota 枯渇時はより低い criticality を全て拒否している場合に限り拒否、下流への自動伝播） | 支持 | 書籍 2016、著者 Alejandro Forero Cuervo | — |
| [^23] | Microsoft Learn『Manage emergency access admin accounts』 | #44、§2-11（2 個以上、cloud-only、passkey（FIDO2）推奨または CBA で通常管理者と異なる方式、CA 除外、PIM で active permanent、別々の耐火金庫、全 sign-in の警報、使用後レビュー、90 日以内ごとの検証、共通の故障要因を持たない 2 つ以上のネットワーク経路） | 支持 | ms.date 2026-06-04 | — |
| [^24] | Google Cloud Incident #20013 | #47〜#49、§2-1・§2-4・§2-12、事故表（47 分、03:46〜04:33 PT、"virtually all authenticated traffic"、Preliminary の 03:45〜04:35・50 分、usage 0 の誤報告と猶予期間切れ、Paxos leader、"For security reasons..."、既認証の Cloud Console、VPC 既存設定、05:21、Gmail のエラーキャッシュ最大 1 時間、Cloud Support の内部工具、2020-12-22 の訂正、是正 5 点） | 支持 | Preliminary 2020-12-14 12:17、Issue Summary 2020-12-18 11:37、訂正 2020-12-22 16:49（US/Pacific 表示）を確認 | — |
| [^25] | Azure status history（Wayback 2020-10-15）SM79-F88 | #50〜#52、§2-1・§2-9、事故表、§2-2 | 部分支持 | 最終 RCA 本文を確認。掲載日は未確認のまま | #50〜#52 は数値（成功率、99.8%、21:25〜00:23、残余 02:25、22:47〜23:59 の手動更新、5 ring）まで一致。ただし §2-2 は本件を「設定・鍵 metadata・policy データ・quota の変更」の例として引いていたが、原文は service update（配備系の欠陥で全 ring に同時配備）。§2-2 で別扱いに修正 |
| [^26] | Azure status history（Wayback 2021-04-02）LN01-P8Z | #53〜#55、§2-1・§2-7・§2-8・§2-12、事故表 | 部分支持 | 最終 RCA 本文を確認。09:25 と 09:37 の併記も原文どおり | (1) §2-7 の「バックアップ認証は token 発行を守った」は過大。原文は "it did not help in this case as it provided coverage for token issuance but did not provide coverage for token validation" で、対象範囲の記述にとどまる。(2) 事故表の「使用中の署名鍵」は原文にない推論で、原文は「retain 指定の鍵」。(3) §2-12 の「いずれも...使えなくなった」は本件について過大で、原文は Service Health で下流利用者へ伝えきれず工具に不備があったという内容。いずれも修正 |
| [^27] | Auth0 Detailed RCA（PDF、2021-07-01 更新） | #56〜#58、§2-6・§2-12、事故表（15:27〜19:47、Preview 20:04、最大 100 倍の遅延、影響表の各行、status page 15:48〜16:50、feature flag キャッシュ容量超過と直接照会、3 つの低性能 query と disk I/O、37→100 ノード、19:25 に 100→45、是正策） | 支持 | 2021-07-01 の最終更新を確認 | — |
| [^28] | Engineering at Meta『More details about the October 4 outage』 | #59（容量確認コマンド、監査ツールの bug、DNS の BGP 広告撤回、物理・システム保護による遅延、トレードオフの原文） | 支持 | 2021-10-05、著者 Santosh Janardhan | 総時間の記載がないこと（ノートの「未確認」）も確認 |
| [^29] | Atlassian PIR（転送先 /blog/how-we-build/...） | #60〜#62、§2-12、事故表（07:38 UTC、775 顧客、最長 14 日、4/8〜4/18、883 サイト 07:38〜08:01、5 分、57 顧客、99.6%、RPO 1 時間は満たし RTO は満たさず、"assumes the input is correct"、peer review、staging に ID なし、最初の 30 サイト、soft delete の原文、Cloud URL・System Admin 連絡先、Identity synchronizations、連絡先のバックアップ） | 支持（URL 修正） | datePublished 2022-04-30、dateModified 2024-11-18 を確認 | 脚注 URL が転送されるため新 URL に差し替え、旧 URL を併記 |
| [^30] | CrowdStrike Preliminary PIR | #63・#64（04:09〜05:27 UTC、sensor 7.11 以上、Mac・Linux は無影響、Content Validator の bug、Content Validator の検査と過去配備の成功への信頼）、事故表 | 支持（更新日を追記） | 2024-07-24、"Updated 2024-07-25 1900 UTC" を確認 | ページ上の題名を脚注に併記 |
| [^31] | CrowdStrike External Technical RCA（PDF） | #63〜#65（7/29 時点で約 99%、21 欄定義と 20 値供給、21 番目の非 wildcard 条件、境界検査欠如、"Each Template Instance should be deployed in a staged rollout."、canary・ring・bake-in・rollback、顧客による配備制御、独立第三者 2 社） | 支持 | PDF の作成日 2024-08-06 を確認 | — |
| [^32] | Official Microsoft Blog（David Weston） | #63（約 850 万台、全 Windows 機の 1% 未満） | 支持 | 2024-07-20 | Microsoft 自身の推計であり CrowdStrike の数値ではない、というノートの注記も正しい |
| [^33] | Google Cloud Service Health（Service Control） | #66〜#68、§2-2・§2-3・§2-12・§2-13、事故表 | 部分支持 | Incident Report 2025-06-13 16:45 PDT、Mini Incident Report 2025-06-12 23:34 PDT、incident 記録 10:51〜18:18 PDT を確認 | 技術的な記述（regional service、全リージョンの crash loop、約 25 分・約 40 分、herd effect、最長約 2 時間 40 分、2025-05-29 の追加、"replicated globally within seconds"、fails open、incremental propagation、約 1 時間後の告知）は一致。ただし #66 の「報告の要約は影響時間を 3 hours とし」は帰属の誤りで、"Duration: 3 hours" は Incident Report の Summary ではなく Mini Incident Report（10:49〜13:49）の記載。#66・事故表・§4・§6・脚注を修正し、§4 の「公表日 未確認」を掲載日時に置換 |
| [^34] | Cloudflare『Cloudflare service outage June 12, 2025』 | #69・#70、§2-1・§2-11、事故表（2 時間 28 分、第三者クラウドを含む基盤ストレージ、Access の 100% 失敗と fail closed の原文、WARP 緊急切断の原文、Dashboard の SSO login は Access への全面依存、coreless と中央データストア、自社基盤上に作る方針、19:32 の force drop、是正策） | 支持 | 2025-06-12 | — |
| [^35] | AWS『Summary of the Amazon DynamoDB Service Disruption ...』 | #71・#72、§2-14、事故表（race condition と空の DNS record、DynamoDB 23:48〜02:40、STS 23:51〜09:59・01:19 回復・08:31〜09:59 再発、IAM user の console sign-in 23:51〜01:25、Identity Center、root と signin.aws.amazon.com の原文、既存 EC2 は健全、自動化の世界的停止、NLB の velocity control、Support Center の迂回不発） | 支持 | 公表日はページから確認できず（ノートの「未確認」どおり） | §2-14 の「login が失敗した」を原文の "experienced errors" に合わせ「エラーになった」に調整（判定には影響しない語の精度修正） |
| [^36] | Cloudflare『Cloudflare outage on November 18, 2025』 | #73・#74、§2-4・§2-9、事故表（11:20、DB 権限変更と feature file の倍増、上限 200 と panic、14:30、17:06、Access は 13:05 まで認証失敗、"Any existing Access sessions were unaffected."、設定更新の失敗・遅延、既知良好 file の手動投入、是正 4 点） | 支持 | 2025-11-18、著者 Matthew Prince | 原文の時系列表は影響開始を 11:28 とし、本文冒頭は 11:20 とする。ノートは本文冒頭の値を使っており誤りではない |
| [^37] | Okta Status（status.okta.com。本文は動的描画で、ページ内の incident データを照合） | #75、§5.1 ADR-001 行、事故表の Okta 行 | 部分支持 | ページ内データで okta.com:1〜23（欠番あり）、okta-emea.com:1、oktapreview.com:1〜3 を確認 | cell 表示と「多くの障害で RCA を 5 営業日以内」は支持（一部は 7・10 営業日）。ただし「公開リンクは確認できず、個別障害の RCA 本文は未確認」は不正確。RCA 要約は各 incident の更新欄に掲載されており、例として I-10874（2026-06-26、OK11 に限定、53 分）の RCA 要約（2026-07-06 掲載）を確認した。#75・事故表・§4・§5.1・§6・脚注を修正 |

## 4. ノートへの修正内容

| # | 箇所 | 修正前（要旨） | 修正後（要旨） | 理由（脚注） |
|---|---|---|---|---|
| 1 | §2-2 | 引き金の例として [^25] を「設定・鍵 metadata・policy データ・quota の変更」に含めていた | [^25] を外し、「Azure AD 2020-09-28 は service update が全 ring に同時に届いた例」と別文にした | 原文は service update（[^25]） |
| 2 | §2-7 | バックアップ認証は token 発行を「守った」 | 対象範囲が token 発行だけで、token 検証は対象外だったため効かなかった | 原文 "did not help in this case"（[^26]） |
| 3 | §2-7・#27 | Entra バックアップ系は「fresh な失効確認を行わない」（一般化） | 証明書失効（CRL）については fresh な確認をせずバックアップ時点の CRL 確認結果に依存、と範囲を限定し原文を併記 | 原文は CRL の節（[^15]） |
| 4 | #27 | 障害時は Conditional Access を既定で前回評価に基づいて扱う | リアルタイム評価できない一部の policy に限る | 原文 "Certain policies can't be evaluated in real-time"（[^15]） |
| 5 | §2-12 | 5 社の報告が「いずれも status 表示・サポート工具・顧客連絡先が使えなくなった」 | 各社で何が損なわれたかを個別に記述し、各文にタグを付与 | Azure 2021 は「伝えきれなかった・工具の不備」であり使用不能ではない（[^26]）。他は各原文に合わせて具体化（[^24][^27][^29][^33]） |
| 6 | §2-13 | SRE 本は「request 単位とサーバ単位の再試行予算」を求める | サーバ単位の再試行予算は検討事項。タグを [V] と [I] に分けた | 原文 "Consider having a server-wide retry budget."（[^9]） |
| 7 | §2-14 | console login が「失敗した」 | 「エラーになった」 | 原文 "experienced errors"（[^35]）。語の精度修正 |
| 8 | §3.7 事故表 Azure 2021 行 | 「使用中の署名鍵を削除」「token 検証を守れなかった」 | 「retain 指定の署名鍵を削除（その鍵で署名された token が不信任に）」「token 検証を対象としておらず効かなかった」 | 原文に「使用中」の語はない（[^26]） |
| 9 | #66・事故表 Google 2025 行・§4・§6・[^33] | 「報告の要約は影響時間を 3 hours とし」、公表日 未確認 | 3 hours は Mini Incident Report（2025-06-12 23:34 PDT、10:49〜13:49）の記載、詳細は Incident Report（2025-06-13 16:45 PDT）。18:18 との関係は未確認のまま残した | 帰属の誤り（[^33]） |
| 10 | #75・事故表 Okta 行・§4・§5.1 DL-18 行・§6・[^37] | 個別の Okta 障害の RCA は「公開リンクは確認できず未確認」 | RCA 要約は incident の更新欄に掲載。I-10874（OK11、53 分）の要約内容を [I] で追記。大規模障害の RCA は未確認と明記。DL-18 行の事故件数を 11→12 件に | status page 内データで確認（[^37]） |
| 11 | §4・[^14] | URL が ASVS master（Bleeding Edge）、公表 2025-05 | release tag v5.0.0_release の URL、公表 2025-05-30 | 版の固定（[^14]）。文言は同一 |
| 12 | §4・[^29] | 旧 URL /engineering/... | 転送先 /blog/how-we-build/... に差し替え、旧 URL を併記 | URL 移転（[^29]） |
| 13 | §4・§6・[^20][^21] | hands-off の公表日 未確認・著者は別記事でのみ確認、rollback safety は著者なし | hands-off: Builder Center 掲載 2026-06-12・最終更新 2026-07-07、著者はページで確認。rollback safety: 著者 Sandeep Pokkunuri | ページの著者・日付表記（[^20][^21]） |
| 14 | §4・[^30] | 版 — | 2024-07-25 19:00 UTC 更新と、ページ上の正式題名を併記 | ページ表記（[^30]） |
| 15 | [^15] | 参照節名が略記 | 原文の節名に合わせた | 照合の再現性 |
| 16 | 冒頭メタ情報 | 版 0.1 | 版 0.2、独立検証の記録先を追記 | 追跡可能性 |

§2 結論サマリの結論そのもの（三分法、cell 境界に配布経路を含める、鍵削除の分離、break-glass の非依存など）は、修正後も RS-09#1〜#75 の支持された記述から導けるため、変更していない [D]。

## 5. 検証不能・未確認として残した事項

脚注単位の検証不能はない [D]。原典を取得したうえで、原典に記載がないため「未確認」のまま残した事項は次のとおり [D]。

| 事項 | 理由 |
|---|---|
| Amazon Builders' Library 各記事の原掲載日（[^2] 以外は Builder Center 掲載日も一部不明）、[^5] の掲載日 | Builder Center 版は移設後の掲載日のみ表示し、旧 aws.amazon.com 版の掲載日はページに表示されない |
| Azure RCA SM79-F88・LN01-P8Z の公表日 | Wayback の status history 写しには掲載日時の表示がない（取得日以前であることのみ確認） |
| AWS us-east-1 2025-10 summary の公表日 | ページ本文に日付の表示がない |
| Google 2025-06-12 の status 記録終了 18:18 PDT の意味 | Mini Incident Report の 13:49 との差が製品ごとの残余影響の回復によるかは、報告に明記がない |
| Meta 2021-10-04 の総時間 | 当事者報告に総時間の記載がない |
| Okta の複数 cell に及ぶ大規模障害の RCA | 本検証で本文を読んだのは I-10874 の 1 件と、第三者起因の要約の存在のみ |
| Cloudflare 2025-06-12 中の既存 Access session の継続 | 原文に記載がない（2025-11-18 は "unaffected" と明記） |
| Microsoft Entra バックアップ系を平常時に実トラフィックで常時動かしているか | 製品文書・ブログに記載がない |

## 6. 二次情報・種資料の扱い

- ノートの根拠に報道・解説記事・AI 要約は使われていない。各主張は当事者報告・公式文書・標準原典に付いている [D]。
- [^32]（Microsoft の 850 万台推計）は CrowdStrike 事故の当事者報告ではないが、推計した Microsoft 自身の公式ブログであり、ノートは「Microsoft の推計」と明記している。結論には使われていないため、そのまま残した [D]。
- [^16]（Azure Blog）はベンダー自身の公式ブログで、転載や第三者解説ではない。同内容の製品文書（[^15]）と整合するため [V] として許容した [D]。
- 種資料（seed-02 7-3 の「CrowdStrike PIR(2024-08)」、seed-03 D1 の Google・Azure AD・Atlassian の記述）とノート §6 の差分記述は、種資料の該当行と原典で再確認し、ノートの記述どおりであった [D]。

## 7. 参考（取得記録）

- 取得日: 2026-10-03。取得物は検証者のスクラッチパッドに保存した（リポジトリには含めない）[D]。
- 取得に失敗して代替手段を使ったもの: Builder Center 4 記事（curl では本文なし → Tavily extract）、Wayback 3 件（429 → 時間を空けて再取得、1 件は gzip を展開）、Okta status page（本文は動的描画 → ページ内の incident データを照合）[D]。
