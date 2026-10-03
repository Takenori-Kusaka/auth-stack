# RS-09 レジリエンス・cell・fail mode（一次資料調査ノート）

> 文書ID: RS-09 / 版: 0.2 / 状態: draft / 最終更新: 2026-10-03
> 対応要求: R-077〜R-087（操作階層別の数値・整合性・PDP不達時挙動・監査不能時挙動・代替経路・限定grace・一律値撤回）, R-099（PDP topology・cell・fault domain）, R-111（kill switch）, R-116（PDP隔離）, R-149〜R-157（段階展開・tenant/domain封じ込め・per-tenant store・quota・cell・段階rollout・緊急freeze・既知良好版復帰・global集約時の実証）, R-174（障害注入）, R-179・R-180（導入順序・自動rollback条件）, R-192・R-194（可用性・変更の数値契約）, R-207（被害を1テナント/1サービス/1期間に封じ込める論証）, R-210（安全な縮退・復旧・rollback）
> 依存文書: CONVENTIONS.md, traceability/seed/seed-01-ciso-assurance.md, traceability/seed/seed-02-cto-technical.md（§7 blast radius）, traceability/seed/seed-03-redteam-decision.md（D1）, traceability/deliverables.md（DL-18, DL-19, DL-53, DL-63 の定義参照のみ）
> 調査方法: AI エージェント（Claude）が WebSearch・WebFetch・Tavily extract・curl（Wayback Machine を含む）・pdftotext で原典本文を取得し、本文中の該当箇所を照合した。種資料は手掛かりとしてのみ使い、根拠には使っていない。
> 独立検証: 作成者以外のエージェントが全 37 脚注の原典を再取得して照合し、v0.2 で修正した（記録: research/verification/RS-09-verification.md、2026-10-03）。

本ノートでは、事実・判断を述べる文の文末に主張タグを付ける。AWS Builders' Library、Google SRE 本、Google『Building Secure and Reliable Systems』（以下 SRS）、Microsoft Learn はベンダーが公式に公開した設計実践の文書であり、`[V]` で扱う（規範ではない）。事故の当事者報告は `[I]`、NIST・OWASP の要求は `[N]`、本ノートの推論は `[D]` とする。

## 1. 調査の問い

種資料由来の問い（seed-02 §7、seed-01 §2.6・§2.12、seed-03 D1）:

1. 認証・認可基盤が約300サービスの共通依存になるとき、cell 単位と cell 内部品をどう決め、global に残る部品（directory、routing、鍵 root）をどう最小化するか（seed-02 7-1、R-153）。
2. 操作階層×障害種別（PDP timeout、replica 遅延、IdP 停止、KMS 停止、監査 sink 停止、JWKS 取得失敗）ごとに、deny／上限付き既知良好判定／queue／縮退のどれを選ぶか。その選択基準は何か（seed-02 7-2、R-079〜R-087）。
3. policy・model・schema 変更の cell 単位 canary、緊急 freeze、既知良好版への復帰時間をどう設計・計測するか（seed-02 7-3、R-149, R-154〜R-156）。
4. IdP/AS 停止中に既存 session をどれだけ継続させるか（seed-02 7-4）。
5. 「この基盤に依存してはならないもの」（復旧ツール、break-glass、障害時連絡手段）は何か。データプレーンの静的安定性と剥奪反映のトレードオフをどう扱うか（seed-03 D1）。
6. 実事故（Google 2020-12、Azure AD 2021-03、Atlassian 2022-04、CrowdStrike 2024-07、Okta・Auth0 等）で、何が起き、影響時間はどれだけで、根本原因と当事者が挙げた教訓は何か（seed-03 D1）。

本ノートで追加した問い:

7. fallback（キャッシュ迂回、バックアップ認証系）は相関障害を抑えるのか、増幅するのか。どの条件なら使ってよいか。
8. 署名鍵 metadata（JWKS 等）の削除・差替えが relying party のキャッシュを通じてどう波及し、復帰をどう遅らせるか。
9. 認可 policy の「既知良好版への rollback」が、取り消したはずの権限を復活させる危険をどう扱うか。
10. 障害時の連絡・サポート・ステータス表示が、落ちた基盤自身に依存していないか。
11. 「失敗」ではなく「誤った応答」を返す gray failure のとき、fail mode の切替えは正しく発動するか。
12. 復旧時の再試行・自動スケール・キャッシュ再充填による二次障害（herd effect）をどう抑えるか。
13. global endpoint や単一リージョンの control plane に、表に出ない依存が残っていないか。

## 2. 結論サマリ

1. 共通の認証基盤の障害は、依存する全サービスの同時停止として実際に起きている [I][^24][^25][^26][^34]。Google 2020-12-14 は 47 分間「virtually all authenticated traffic」に 5xx を返し[^24]、Azure AD は 2020-09-28 と 2021-03-15 に Azure AD に依存する Microsoft・第三者アプリの認証を広く止め[^25][^26]、Cloudflare Access は 2025-06-12 に identity-based login の 100% を失敗させた[^34] [I]。
2. 主要事故の引き金の多くは、設定・鍵 metadata・policy データ・quota の変更が全域に同時に届いたことである[^24][^26][^31][^33][^36] [I]。Azure AD 2020-09-28 は設定ではなく service update が、配備系の欠陥で全 ring に同時に届いた例である[^25] [I]。Google の事後分析では、2010〜2017 年の障害の引き金の上位は binary push 37%、configuration push 31% である[^19] [M]。したがって policy bundle・鍵 metadata・設定は、binary と同等以上に cell 単位で段階展開し、データプレーン側で検証してから適用する設計にする（根拠: RS-09#29〜#33, #51, #54, #67, #73）[D]。
3. cell は「独立し、他 cell と状態を共有しない」単位であり、全 cell の共有状態を持つ cell router は単一障害点になるため、最も薄く作り cell 化する必要がある[^1] [V]。ただし Google 2025-06 では、regional service でも globally replicated な policy データが全リージョンを同時に落とした[^33] [I]。cell 境界は計算資源だけでなく、policy・設定・鍵 metadata の配布経路まで分けなければ封じ込めにならない（根拠: RS-09#1, #3, #67）[D]。
4. 静的安定性（control plane 障害中もデータプレーンは最後の状態で動き続ける）は、AWS IAM が「existing principals」の認証・認可を継続する設計として示している[^6][^5] [V]。Cloudflare 2025-11-18 では既存の Access session は影響を受けず[^36]、Google 2020-12-14 では既に認証済みの Cloud Console 利用者は使い続けられた可能性がある[^24] [I]。PEP・PDP・token 検証は control plane なしで動くことを要件とし、その代償として剥奪反映が遅れる時間を操作階層ごとに上限化する（根拠: RS-09#10, #13, #49, #73）[D]。
5. fail mode は fail-closed と fail-open の二択ではない [V][^11][^12]。SRS は「Security-critical operations should not fail open.」とし[^4]、失効情報は timeout 時に fail-open せず、既知良好な失効リストをノードに配って局所キャッシュさせる方式を推奨し[^11]、制御系の故障時に policy を変えない「fail static」を示す[^12] [V]。NIST SP 800-53 SC-24 は、組織が定めた既知の状態へ失敗することを求める[^13] [N]。本基盤では、認可判定は fail-open を禁止し、署名付きの既知良好 policy・判定を最大齢付きで使う fail-static を低リスク階層に限って許し、quota・rate limit・telemetry など保護機能でないものだけ fail-open を許す三分法を提案する（根拠: RS-09#19〜#24）[D]。
6. fallback は相関障害を増幅しうる [V][^7]。Auth0 2021-04-20 では、設定用 feature flag サービスのキャッシュが応答しなくなると各ノードが直接問い合わせに切り替わり、DB 過負荷と再試行・自動スケール（37→100 ノード）で US-1 全体が約 4 時間 20 分止まった[^27] [I]。AWS は分散 fallback が「often make the outage worse」とし、データの事前 push や、常時両系を動かす failover への転換を勧める[^7] [V]。バックアップ経路は常時実トラフィックで動かすか、そうでなければ採用しない（根拠: RS-09#14, #15, #57）[D]。
7. バックアップ認証系は、対応範囲を列挙しない限り効くと仮定できない（根拠: RS-09#27, #28, #55）[D]。Azure AD 2021-03-15 では、バックアップ認証の対象は token 発行だけで、metadata endpoint に依存する token 検証は対象外だったため、この障害には効かなかった[^26] [I]。Microsoft Entra のバックアップ系も、対象は直近 3 日・同一端末・非対話・home tenant 等の条件を満たす利用者に限られる[^15] [V]。また証明書失効については fresh な失効確認（CRL 照会）を行わず、session をバックアップした時点の CRL 確認結果に依存する[^15] [V]。
8. 署名鍵 metadata の削除は全 relying party に波及する高 blast radius 操作である（根拠: RS-09#54）[D]。Azure AD 2021-03-15 では鍵の誤削除が global metadata に載った時点で利用側が token を信頼しなくなり、metadata の rollback 後も利用側キャッシュの差で一部が翌日まで回復しなかった[^26] [I]。鍵の追加と削除は別の段階展開・承認経路に分け、鍵削除には cell 単位の canary と待機を置く（根拠: RS-09#53〜#55）[D]。
9. 既知良好版への復帰は「戻す機構」と「戻した後に利用側が追随する時間」の両方で決まる（根拠: RS-09#51, #54, #74）[D]。Azure AD 2020-09-28 は自動 rollback が配備 metadata 破損で使えず手動に頼り、事後に「last known-good metadata」へ戻せるよう rollback 系を直した[^25] [I]。Cloudflare 2025-11-18 は既知良好な file を配布 queue に手で差し込んで復旧した[^36] [I]。復帰時間 SLO は、利用側キャッシュの更新と再起動後の負荷集中を含めて実測で決める（根拠: RS-09#51〜#54, #67, #74）[D]。
10. 認可 policy の rollback は取り消した権限を復活させうる（根拠: RS-09#35）[D]。SRS は、rollback は信頼性の基本だが脆弱性を再導入しうるため deny list や最低許容版（MASVN）で制御すると述べる[^11] [V]。剥奪・失効の状態は policy 版から切り離し、版を戻しても単調に保たれる別状態として配布する（根拠: RS-09#35）[D]。
11. break-glass 経路と障害時連絡手段は、本基盤と依存を共有してはならない（根拠: RS-09#41〜#44, #69）[D]。Cloudflare 2025-06-12 では WARP の緊急切断機能が同じ Workers KV 依存で使えず、管理画面の SSO login も自社 Access への全面依存で失敗した[^34] [I]。SRS は緊急アクセスの資格情報を SSO や federated IdP から導出してはならないとし（低依存の代替がある場合を除く）[^11]、AWS は break-glass 利用者を権限付きで事前作成し金庫に保管する設計を静的に安定な例とし[^6]、Microsoft は緊急アカウントの 90 日以内ごとの検証を求める[^23] [V]。
12. 障害時の連絡・サポート・顧客識別は、障害を起こした基盤と運命共同体になりやすい（根拠: RS-09#49, #55, #58, #62, #68）[D]。当事者報告は、同じ障害の最中に連絡・サポート系が損なわれたことをそれぞれ記す [I]。Google 2020 では Cloud Support の内部工具が影響を受けて告知が遅れた[^24] [I]。Google 2025 では Cloud Service Health 自体が落ちて最初の告知が約 1 時間後になった[^33] [I]。Auth0 2021 では status page が応答せず、Support Center の offline ticket 送信も期待どおり動かなかった[^27] [I]。Atlassian 2022 では顧客連絡先と Cloud URL が削除され、当初は顧客を特定・連絡できなかった[^29] [I]。Azure AD 2021 では下流サービスの利用者へ Service Health で伝えきれず、工具の不備を認めた[^26] [I]。
13. 復旧時の増幅を抑える仕組みは設計要件である（根拠: RS-09#37〜#39, #66）[D]。SRE 本は、再試行にランダム化した指数 backoff を必ず使うこと、request 単位の再試行回数の制限、deadline 伝播を求め、サーバ単位の再試行予算は検討事項として挙げる[^9] [V]。Google 2025-06 は restart 時に randomized exponential backoff がなく us-central1 の復旧が最長約 2 時間 40 分に延びた[^33] [I]。認可要求には操作階層を criticality として載せ、過負荷時は低い階層から落とす（根拠: RS-09#38, #39, #66）[D]。
14. 表に出ない global 依存は、地域を分けても残る（根拠: RS-09#13, #71）[D]。AWS 2025-10-19/20 では us-east-1 の DynamoDB 障害で、us-east-1 以外のリージョンでも root 資格情報や signin.aws.amazon.com 経由の federation による console login がエラーになった[^35] [I]。cell・リージョンごとに login・token 発行・JWKS 配布の endpoint を持ち、依存グラフを機械的に棚卸しする（根拠: RS-09#71）[D]。

## 3. 調査結果

### 3.1 cell・blast radius・shuffle sharding

- **RS-09#1** AWS の cell 定義では、各 cell は独立し、他 cell と状態を共有せず、全体の要求の一部を処理する [V][^1]。原文: "Each cell is independent, does not share state with other cells, and handles a subset of the overall workload requests." 分割キーは顧客 ID・リソース ID など API 呼出しで得やすい値とし、cell routing 層が単一 endpoint を提供する [V][^1]。
- **RS-09#2** 構成要素は cell router（要求を正しい cell に送ることだけを担う最も薄い層）、cell（独立に動く完全な workload）、control plane（cell の作成・廃止・顧客移動）の三つである [V][^1]。
- **RS-09#3** 全 cell の共有状態を持つ唯一の部品は cell router であり、単一障害点になるため、最大限の信頼性で、かつ cell 化された部品として作る必要がある [V][^1]。原文: "the only component that has the shared state of all cells is the cell router. It presents itself as a single point of failure." [V][^1]
- **RS-09#4** 同白書は cell が向く workload の特徴として、停止の影響が極めて大きいもの、金融機関の重要 workload、RPO 5 秒未満・RTO 30 秒未満、専用 cell を要するテナントを含む multi-tenant などを挙げ、欠点として構成の複雑化、費用、専用の運用工具、routing 層への投資を挙げる [V][^1]。判断の問いとして "Is it better for 100% of customers to experience a 5% failure rate, or 5% of customers to experience a 100% failure rate?" を示す [V][^1]。これらは適用の目安であり要求ではない [D]。
- **RS-09#5** 配備は cell ごと（または cell の組ごと）の wave で行い、最初の cell を canary cell にできる [V][^1]。全ての mapping 方式で、特定キーを特定 cell に固定する override table（試験、隔離、重いキーの特別扱い用）を併用し、新顧客の cell 割当と router 登録は control plane の仕事である [V][^1]。
- **RS-09#6** ベストプラクティスとして、初日から複数 cell で始めること、初日から cell 移動の仕組みを持つこと、cell の故障モード分析（部品・原因・確率・緩和の表）を行うことを挙げる [V][^1]。状態を持つ cell の移動は「非正本として複製→新側を正本化→旧側から転送→旧側を忘れる」の段階で行う [V][^1]。
- **RS-09#7** shuffle sharding では、8 worker を 2 worker ずつの仮想 shard に割り当てると 28 通りの組合せができ、1 顧客起因の問題の影響は 1/28 に下がる（通常の 4 分割 sharding では 1/4）[V][^2]。Route 53 は 2048 個の仮想 name server から 4 個ずつを各 domain に割り当て（約 7,300 億通り）、どの 2 domain も 3 個以上を共有しないようにしている [V][^2]。この効果は要求側が他の shard 構成員へ再試行できる fault tolerant な client であることが前提である（"If the requestors are fault tolerant and can work around this (with retries for example)"）[V][^2]。cell 白書は shuffle sharding を cell 内では使えるが cell をまたいで使ってはならないとする [V][^1]。
- **RS-09#8** AWS は相関障害の低減策として、cell 化した上で運用工具が「複数 cell に同時に触れない」ようにすること、変更を複数 AZ に同時配備しないこと、短命な資格情報・秘密の有効期限やキャッシュ TTL に揺らぎ（jitter）を入れることを挙げる [V][^3]。原文: "Varying expiration times of short-term credentials and secrets." [V][^3]
- **RS-09#9** SRS は、役割・場所・時間で区画化（compartmentalization）し、例えば証明書をデータセンターごとに分けておけば 1 拠点の侵害時にその拠点分だけを失効できると述べる [V][^4]。failure domain は各 domain が自分のデータ複製を持つ（data isolation）ことで初めて独立し、区画をまたぐ禁止操作が実際に失敗することを継続検証すべきとする [V][^4]。

### 3.2 静的安定性・control/data plane・依存の階層化

- **RS-09#10** 静的安定な設計では、依存先が劣化しても全体は動き続ける [V][^5]。原文: "The data plane might not get updates during the period of impairment, but everything that had been working before continues to work." [V][^5]
- **RS-09#11** AZ 障害時に新インスタンスを起動して回復する方式が劣るのは、起動できないからではなく、回復経路に EC2 control plane とアプリ固有の起動依存を即座に抱え込むからである [V][^5]。EC2 は配備を AZ ごとの日程で行い、同一リージョンの 2 AZ は同じ配備を別の日に受け取る [V][^5]。
- **RS-09#12** cell 白書は、control plane はデータプレーンより統計的に故障しやすく、control plane は誤情報を出すより失敗するよう（CAP の CP）、データプレーンは古い情報に基づいてでも可用性を保つよう（AP）設計すると述べる [V][^1]。例として、router が cell への経路を S3 から読み込んでメモリに持ち、control plane・S3・AZ が使えなくても転送を続ける構成を挙げる [V][^1]。
- **RS-09#13** AWS IAM の control plane は us-east-1 にあり、データプレーンは各リージョンに分離されている [V][^6]。原文: "During a control plane impairment, CRUDL type operations for IAM may not work, but authentication and authorization for existing principals will continue to work." STS はデータプレーンのみのサービスで IAM control plane に依存しない [V][^6]。同白書は "Do not rely on the control planes of partitional services in your recovery path." と述べる [V][^6]。
- **RS-09#14** AWS は分散 fallback を避ける [V][^7]。原文: "Distributed fallback strategies often make the outage worse. In our experience, fallback strategies increase the scope of impact of failures as well as increasing recovery times." 2001 年頃の Amazon retail では、キャッシュ故障時に DB へ直接問い合わせる fallback が、全キャッシュの同時故障で DB を止め、配送速度表示の部分障害を全サイト停止と全世界の物流停止に広げた [V][^7]。代替策は、主系を強くする、呼出し側に任せる、データを事前に push する、fallback を常時両系を動かす failover に変える（"A service must run both the fallback and the non-fallback logic continuously."）、再試行が fallback 化しないよう監視する、である [V][^7]。データ事前 push の例として、EC2 の IAM role 資格情報は各インスタンスへ事前に push され「remain valid for many hours」とされる [V][^7]。
- **RS-09#15** AWS Well-Architected REL11-BP05 は、平常時と障害時で挙動が変わる bimodal behavior を避けるよう求め、静的安定な設計は一定周期で設定を更新し、取得に失敗したら前回のキャッシュ値を使って警報を出すとする [V][^8]。原文: "Another example of bimodal behavior is allowing clients to bypass your workload cache when failures occur." [V][^8]
- **RS-09#16** SRS は部品を high-capacity、high-availability、low-dependency に分け、high-availability 部品は「Use data cached on local storage to avoid depending on a remote database.」とする [V][^4]。low-dependency 部品は主系と failure domain を共有しない代替実装であり、"the success of redundancy is inversely proportional to the probability of the same root cause affecting both components" と述べる [V][^4]。
- **RS-09#17** SRE 本は、利用者要求の経路で同一層内の通信（循環）を避けること、非重要 backend が止まっても重要部品が影響を受けないことを試験することを勧め、"Remember that the code path you never use is the code path that (often) doesn’t work." と述べる [V][^9]。
- **RS-09#18** NIST SP 800-207 §5.2 は、PEP や PE/PA が妨害されると業務に悪影響が出ること、複数拠点への複製で緩和できるが "This mitigates the risk but does not eliminate it." であること、運用ミスで PE/PA に到達できなくなると企業全体が機能しなくなりうることを記す [N][^10]。付録 B.4.7 は、複数製品の依存の網のうち 1 部品の停止が業務の連鎖障害を起こしうると述べる [N][^10]。規範強度: いずれも記述的指摘であり shall/should の要求文ではない [N][^10]。

### 3.3 fail-open / fail-closed / fail-static の選択基準

- **RS-09#19** SRS は、信頼性を優先して不確実時にも可能な範囲で提供する fail open（safe）と、安全性を優先して不確実時に閉じる fail closed（secure）の間で均衡を取る必要があるとし、ACL を読めないとき前者は "allow all"、後者は "deny all" を既定とすると説明する [V][^4]。両者の緊張を解くには、組織がまず譲れない最低限の security posture を決め、その上で security サービスの重要機能に必要な信頼性を与えるとする [V][^4]。
- **RS-09#20** SRS は "Security-critical operations should not fail open." とし、fail open は DoS だけで安全性を下げる手段を攻撃者に与えると述べる [V][^4]。ただし security-critical な操作でも、より強い統制を持つ低コストの代替部品への縮退は認める [V][^4]。同章の注記は "Systems using ACLs must fail closed (secure)" と述べる [V][^4]。
- **RS-09#21** SRS は、集中型の証明書有効性 DB が止まると依存系が全て止まるため fail open の誘惑が強いが、時刻・epoch サービスへの DoS だけで失効済み資格情報が有効に戻る例を挙げて危険を示す [V][^11]。原文: "Instead of failing open, you may want to distribute known good data from the revocation service to individual servers in the form of a revocation list, which nodes can cache locally. ... This choice is far more secure than a time-out-and-fail-open policy." [V][^11]
- **RS-09#22** SRS は DoS 防御の中央制御器が故障したとき、fail closed（全トラフィック遮断）も fail open（攻撃通過）も取らず、"we fail static, meaning the policy does not change" とし、そのため制御系はフロントエンドほど高可用でなくてよいと述べる [V][^12]。
- **RS-09#23** SRS は、自動化に大きな規模や広い範囲の policy 変更を無監督で行わせず、変更予算（change budget）を設けること、復旧用サービスを自動化が止められないようにすること、攻撃者が偽装しうる外部信号でなく自己完結の検知で縮退することを勧める [V][^4]。
- **RS-09#24** NIST SP 800-53 Rev.5 SC-24 は、組織が定めた故障について組織が定めた既知の状態へ失敗し、組織が定めた状態情報を保持することを求める [N][^13]。規範強度: 組織定義パラメータ付きの統制文であり、どの状態（deny／縮退）に落ちるかは規定しない [N][^13]。SC-7(18) は境界防御装置の故障時に安全でない状態に入らないこと、CP-12 は所定条件で制限された safe mode に入ること、SI-17 は所定故障時に fail-safe 手順を実施すること、CP-10 は中断・侵害・故障後に既知の状態へ回復・再構成することを求める [N][^13]。
- **RS-09#25** SP 800-53 SA-8(24) の解説は、機能の故障もその回復動作も security policy 違反を招かないこと（secure failure and recovery）を原則とし、故障した security 機能を迂回して再構成するか、完全に停止するかを示す [N][^13]。SA-8(19) の解説は、通常・縮退・代替の各運用形態へ回復する間も安全な状態を保つことを continuous protection の一部とする [N][^13]。
- **RS-09#26** OWASP ASVS 5.0.0 は、外部資源へのアクセス失敗時も circuit breaker や graceful degradation で安全に動き続けること（16.5.2, L2）、検証ロジックのエラーにもかかわらず処理を進めるような fail-open 状態を防ぐこと（16.5.3, L2）、全ての未処理例外を捕捉する最終エラーハンドラを持つこと（16.5.4, L3）を検証要件とする [N][^14]。原文（16.5.3）: "Verify that the application fails gracefully and securely, including when an exception occurs, preventing fail-open conditions such as processing a transaction despite errors resulting from validation logic." [N][^14]
- **RS-09#27** Microsoft Entra のバックアップ認証系は、(1) 同じアプリ・端末で直近 3 日以内に認証成功、(2) 対話認証不要、(3) home tenant の利用（B2B/B2C でない）、(4) バックアップ系を制限する Conditional Access がない、(5) 前回認証以降に資格情報変更等の失効事象がない、を満たす利用者だけを扱う [V][^15]。リアルタイムに評価できない一部の Conditional Access policy は、障害時に既定で前回の評価結果に基づいて扱われ、tenant 管理者は resilience defaults を無効化して厳格評価を選べる（その場合その利用者はバックアップ系を使えない）[V][^15]。証明書失効については、原文は "the backup authentication system can't perform fresh revocation checks. Instead, it relies on the state of the certificate revocation list (CRL) check that's performed when the session was last backed up." と記す [V][^15]。access token を要求する OIDC Web アプリと SP-initiated SAML は対象外である [V][^15]。
- **RS-09#28** Azure AD バックアップ認証サービスは "on separate and decorrelated systems and network paths from the primary Azure AD system" で動き、成功した認証の session 固有データを最大 3 日保存し、障害時は保存データとの厳密一致で応答する [V][^16]。同記事は Azure AD への要求の 93% が直近に許可済みの種類であるとし、3 日を超える新規認証は障害中に対応しないこと、Continuous Access Evaluation で無効になった session を失効させることを述べる [V][^16]。

### 3.4 設定・policy 配布の段階展開と既知良好版への復帰

- **RS-09#29** Google の事後分析（2010〜2017 年、数千件の postmortem の標本）では、障害の引き金の上位は binary push 37%、configuration push 31%、user behavior change 9% である [M][^19]。測定条件: Google 社内の postmortem テンプレートに基づく集計で、他組織への外挿は未検証 [M][^19]。
- **RS-09#30** SRE Workbook は、設定変更が安全であるための 3 性質として、段階的に配備できること、危険なら rollback できること、運用者の制御を失う変更なら自動 rollback（少なくとも進行停止）できることを挙げ、"it is important to avoid a global all-at-once push" と述べる [V][^17]。rollback は一時修正を当てるより早く障害を緩和できるとする [V][^17]。
- **RS-09#31** SRE Workbook は canarying を「変更の部分的かつ時間を限った配備と、その評価」と定義し、"If a release deploys instantly everywhere, any defects will deploy in the same way." と述べる [V][^18]。20% の要求を失敗させる欠陥でも 5% の canary なら全体の誤り率は 1% にとどまり、error budget の消費は露出したトラフィック量に比例するとする [V][^18]。
- **RS-09#32** SRE 本は、新 binary や設定の変更が多数の task に同時に及ぶとカスケード障害の引き金になりうること、カスケード障害中は直近の変更を確認し戻すことを検討すべきことを述べる [V][^9]。縮退設定を各サーバが監視する一貫性ストアに置くと配備は速くなるが "introduces its own risks of synchronized failure" とも述べる [V][^9]。
- **RS-09#33** AWS の自動配備では、各本番 wave を one-box（通常リージョンまたは AZ の要求の最大 10%）から始め、最初の 2 wave では 1 リージョン内を 1 AZ（または cell）ずつ配備する [V][^20]。典型的な待機（bake time）は one-box 後 1 時間以上、最初のリージョン wave 後 12 時間以上、以降の wave 後 2〜4 時間以上であり、待機中に高重大度の集約 alarm が鳴れば自動 rollback し、要求数がゼロに落ちる等の標準メトリクス異常でも自動 rollback する [V][^20]。
- **RS-09#34** AWS は rollback 安全性のため、形式・protocol の変更を「読めるようにする Prepare」と「書き始める Activate」の 2 段階に分けて配備する [V][^21]。原文: "While each of the two phases is safe for rolling back, we can’t roll back both changes." 両段階の間には通常数日の bake period を置き、旧形式の読取り能力は全データの書換え（backfilling）後にしか外せない [V][^21]。
- **RS-09#35** SRS は、緊急 push の仕組みは通常 push を最大速度にしたものとし、通常の rollout と緊急 rollback を同じ系にすべきだとする（"untested emergency practices won’t work when you need them"）[V][^11]。rollback で直近の既知良好状態に戻すことは信頼性の基本だが、脆弱性を再導入しうるため、不良版の deny list、security version number（SVN）と最低許容版（MASVN）、署名鍵の rotation で戻せる範囲を制御すると述べる [V][^11]。
- **RS-09#36** SRS は、wall-clock 時刻への依存が復旧を妨げうること、短命資格情報の強制は障害が資格情報の寿命を超えると「時限爆弾」になること、時刻の代わりに停止可能な epoch の前進を使えることを述べる [V][^11]。

### 3.5 カスケード障害・過負荷・復旧時の増幅

- **RS-09#37** SRE 本はカスケード障害を "a failure that grows over time as a result of positive feedback" と定義し、最も多い原因は過負荷とする [V][^9]。一度始まると負荷を少し下げても止まらず、例えば健全な server が 10% しか残らなければ要求率を約 1/10 まで下げる必要がある [V][^9]。
- **RS-09#38** SRE 本は、再試行にはランダム化した指数 backoff を必ず使い、request ごとの再試行回数を制限し、サーバ全体の再試行予算（例: 1 プロセス毎分 60 回）を検討し、再試行可能と不可能の応答を分け、過負荷時には client が再試行しない専用の status を返すよう求める [V][^9]。deadline を伝播し、backend が使えないときは待たずに早く失敗させる（fail-fast）ことを勧める [V][^9]。
- **RS-09#39** SRE 本は、要求に CRITICAL_PLUS、CRITICAL、SHEDDABLE_PLUS、SHEDDABLE の 4 段階の criticality を付け、顧客が global quota を使い切ったとき、backend はより低い criticality の要求を全て拒否している場合に限ってその criticality の要求を拒否し、criticality は下流呼出しへ自動伝播させると述べる [V][^22]。
- **RS-09#40** SRE 本は、cold cache 状態で要求を捌けるように用意されていないサービスは障害の危険が高いとし、大規模再起動後の挙動を試験するよう求める [V][^9]。

### 3.6 break-glass・緊急アクセス・障害時連絡

- **RS-09#41** SRS は、組織のアクセス制御サービスが全リモートアクセスの単一障害点になってはならないとする [V][^11]。原文: "you can’t derive access credentials from the dynamic components of access infrastructure, like single sign-on (SSO) or federated identity providers, unless you can replace those components with low-dependency implementations." 緊急用資格情報の寿命は、短くすれば障害が長引いたとき使えなくなり、長くすれば危険が増すというトレードオフになる [V][^11]。
- **RS-09#42** SRS は Google 社内の例として、端末信頼評価・SSO 短命資格情報・多者承認のいずれかが止まると対応者も入れなくなるため、オフラインで使える代替資格情報と依存の少ない代替の認証・認可アルゴリズムを用意し、即時アクセスが必要な人に限定したと記す [V][^11]。人が普段使わない break-glass 工具を使いこなせないこと自体が障害になるため、平常と緊急の手順の差を小さくし、定期的な演習を義務化するよう勧める [V][^11]。
- **RS-09#43** AWS は IAM の break-glass 管理者について、権限を付与済みで password・access key を発行した利用者を事前に作り、資格情報を物理または仮想の金庫に保管する設計を静的に安定とし、障害時に利用者を作る・障害時に管理 policy を付ける設計は IAM control plane に依存するため静的に安定でないとする [V][^6]。
- **RS-09#44** Microsoft は Entra ID の緊急アクセス用アカウントについて、2 個以上、cloud-only（federate・同期しない）、passkey（FIDO2）推奨または証明書認証で通常管理者と異なる方式、sign-in を阻止・制限する Conditional Access からの除外、PIM で常時有効の Global Administrator、別々の耐火金庫での保管、全 sign-in の警報、使用ごとの事後レビュー、少なくとも 90 日ごとの検証を求める [V][^23]。端末を使う場合は共通の故障要因を持たない 2 つ以上のネットワーク経路を持つことも求める [V][^23]。
- **RS-09#45** NIST SP 800-53 AC-2(2) は、一時アカウントと緊急アカウントを組織が定めた期間の後に自動で削除または無効化することを求める [N][^13]。規範強度: 統制文（期間と処置は組織定義）[N][^13]。RS-09#43・#44 の「事前作成して常時有効」の break-glass とは緊張関係があり、本基盤では「障害時に作成する緊急アカウント」と「封緘して常設する break-glass」を区別し、後者には常時監視・定期演習・使用後の資格情報更新を補完統制として置く必要がある（根拠: RS-09#41〜#45）[D]。
- **RS-09#46** SRS は DoS 防御系は DoS の影響を受けうる本番基盤への依存を避けるべきとし、Google は Gmail や Google Docs が影響を受けうるため予備の連絡手段と playbook の保管場所を持つと記す [V][^12]。

### 3.7 事故の一次報告

| 事故 | 影響時間（当事者記述） | 何が起きたか | 根本原因（当事者記述） | 当事者が挙げた教訓・是正 | 項目 |
|---|---|---|---|---|---|
| Google User ID Service 2020-12-14 | 47 分（03:46〜04:33 PT）、一部サービスは 05:21 まで | Google OAuth を要する顧客向けサービスが停止、認証付きトラフィックのほぼ全てに 5xx | quota 移行で旧系が使用量 0 を報告、猶予期間切れで自動的に quota 削減、Paxos leader が書込み不能、古いデータを拒否する設計で認証照会が失敗 | global 変更の急速適用防止、誤設定の早期検知、障害時連絡の信頼性、データプレーンへの影響限定 | #47〜#49 |
| Azure AD 2020-09-28 | 21:25〜00:23 UTC（残余 02:25） | Azure AD 依存の全 Microsoft・第三者アプリで認証エラー | SDP の潜在欠陥で検証 ring 向け更新が全 ring に同時配備、自動 rollback も metadata 破損で失敗 | last known-good metadata への復帰、rollback 演習拡大、バックアップ認証展開 | #50〜#52 |
| Azure AD 2021-03-15 | 19:00 UTC〜翌 09:37 UTC（Azure AD 自体は 21:05 緩和） | Azure AD 依存アプリが token/assertion を信頼しなくなり利用不能 | 時間起動の鍵削除自動化が "retain" 状態を無視して retain 指定の署名鍵を削除し、global metadata に反映（その鍵で署名された token が不信任に） | 鍵削除の SDP 保護、バックアップ認証は token 検証を対象としておらず効かなかった | #53〜#55 |
| Auth0 US-1 2021-04-20 | 15:27〜19:47 UTC（周辺機能は 23:25 まで） | US-1 で認証フロー完了不能、全リージョンの管理画面も劣化 | 設定用 feature flag サービスのキャッシュ容量超過→直接問合せ→DB 過負荷、再試行と自動スケールで増幅 | 負荷削減 playbook、キャッシュ増強、status page のキャッシュ化 | #56〜#58 |
| Meta 2021-10-04 | 未確認（本調査で取得した本文に総時間の記載を確認できず） | backbone 全断で DNS が BGP 広告を撤回、全サービス到達不能 | 容量確認コマンドが backbone 接続を全て切断、監査ツールの bug で阻止できず | 物理・システムの高い保護が復旧を遅らせたとの評価 | #59 |
| Atlassian 2022-04-05 | 最長 14 日（4/8 から順次、4/18 全復旧） | 775 顧客・883 サイトを削除 | app ID でなく site ID を渡し、両方を受け付ける API が入力を正と仮定 | soft delete の全面化、大規模復旧の自動化、連絡先のバックアップ | #60〜#62 |
| CrowdStrike 2024-07-19 | 配信 04:09〜05:27 UTC（端末の回復は別途） | Windows sensor 7.11 以上の受信端末が BSOD | 21 入力定義と 20 入力供給の不一致、Content Validator の bug、境界検査欠如 | content の段階展開・canary、顧客による配信制御 | #63〜#65 |
| Google Service Control 2025-06-12 | red-button 展開まで約 40 分、us-central1 は最長約 2 時間 40 分（Mini Incident Report は 10:49〜13:49 PDT、3 時間） | API 要求の認可・policy・quota 検査を行う Service Control が全リージョンで crash loop | feature flag なし・エラー処理なしの新コードに、空欄を含む policy データが数秒で global 複製 | 機能の隔離と fail open、global 複製データの段階伝播、feature flag 既定無効 | #66〜#68 |
| Cloudflare Workers KV 2025-06-12 | 2 時間 28 分 | Access が identity-based login を 100% 失敗、WARP 新規接続不可 | Workers KV の中央データストア（一部第三者クラウド）の障害 | 単一ストア依存の除去、namespace の段階的再有効化 | #69〜#70 |
| AWS us-east-1 2025-10-19/20 | DynamoDB 23:48〜02:40 PDT、STS 23:51〜09:59 PDT | IAM user の console sign-in 失敗、他リージョンでも root・federation login 失敗 | DynamoDB DNS 管理自動化の潜在 race condition で空の DNS record | 自動化の世界的停止と保護追加、NLB の速度制御 | #71〜#72 |
| Cloudflare 2025-11-18 | 11:20〜14:30 UTC（全面正常化 17:06） | core proxy が 5xx、Access 認証失敗（既存 session は無影響） | DB 権限変更で feature file が倍増し全マシンへ配布、上限 200 超過で panic | 自社生成設定を利用者入力と同様に検証、global kill switch 拡充 | #73〜#74 |
| Okta OK11 custom domain 2026-06-26（I-10874） | 53 分（7:00〜7:53 PT） | OK11 に限定して custom domain への接続リセット・認証失敗 | 前日の custom domain traffic 移行後、新しい routing 基盤が traffic 増で資源不足 | 旧基盤への切戻し、routing 基盤の増強、監視・auto-scaling 方針の更新 | #75 |

#### Google User ID Service（2020-12-14）

- **RS-09#47** 2020-12-14 の 47 分間、Google OAuth を要する顧客向けサービスが使えず、03:46〜04:33 PT に全 Google アカウントの資格情報発行とアカウント metadata 照会が失敗し、"served 5xx errors on virtually all authenticated traffic" となった [I][^24]。認証付きの Google Workspace アプリは全て停止した [I][^24]。当日の速報（Preliminary Incident Statement）は 03:45〜04:35 の 50 分としており、後の Issue Summary と数値が異なる [I][^24]。
- **RS-09#48** 根本原因は、User ID Service を新 quota 系へ登録した際に旧 quota 系の一部が残り使用量を 0 と誤報告し、既存の猶予期間が切れた時点で自動化が quota を削減したことで、account DB の quota 不足により Paxos leader が書込めず、読取りが古くなって認証照会が失敗したことである [I][^24]。報告は "For security reasons, this service will reject requests when it detects outdated data." と記し、既存の安全検査は「単一サービスの報告負荷ゼロ」の場合を網羅していなかった [I][^24]。
- **RS-09#49** 既に認証済みの Cloud Console 利用者は機能低下しつつ使えた可能性があり、VPC の既存データプレーン設定は動き続けた [I][^24]。復旧後に Calendar と Admin Console は traffic spike で 05:21 まで error を返し、一部の Gmail 利用者は identity サービスの error がキャッシュされたため最大 1 時間 error を受けた [I][^24]。Cloud Support の内部工具も影響を受け、顧客への告知が遅れた [I][^24]。2020-12-18 の Issue Summary は Cloud service account は影響なしとしたが、2020-12-22 の訂正で "Some operations with Cloud service accounts experienced elevated error rates" と改めた [I][^24]。是正策は quota 自動化の global 変更の急速適用防止、誤設定の早期検知、障害時連絡の信頼性、User ID DB の書込み障害耐性、User ID Service 障害時のデータプレーン影響の限定の 5 点である [I][^24]。

#### Azure AD（2020-09-28, Tracking ID SM79-F88）

- **RS-09#50** 2020-09-28 21:25 UTC から 09-29 00:23 UTC（残余は 02:25 まで）、Azure AD に依存する全 Microsoft・第三者アプリと Azure AD B2C で認証エラーが起き、期間中の認証成功率は欧州 81%、米州 17%（緩和直前 37%）、アジアは最初の 120 分が 72% で業務時間帯のピークに最低 32%、豪州 37% であった [I][^25]。障害前に認証済みの利用者は影響を受けにくく、VM・VMSS・AKS の Managed Identities は既存の resilience 策により平均 99.8% の可用性を保った [I][^25]。
- **RS-09#51** 根本原因は、内部検証 ring 向けの service update が、Azure AD backend の Safe Deployment Process（SDP）の潜在欠陥により全 ring へ同時に配備されたことである [I][^25]。平常時は顧客データのない検証 ring、Microsoft 利用者のみの内側 ring、本番の順に 5 ring を数日かけて配備する [I][^25]。自動 rollback は SDP metadata の破損で失敗し、SDP を迂回する手動の設定更新（22:47 開始、23:59 完了）に頼った [I][^25]。
- **RS-09#52** 是正済み事項は SDP 欠陥の修正、"Fixed the existing rollback system to allow restoring the last known-good metadata to protect against corruption."、rollback 演習の範囲と頻度の拡大であり、残課題は SDP への追加保護、Azure AD バックアップ認証系の主要サービスへの展開、15 分以内の自動告知である [I][^25]。障害中には一部 workload をバックアップ認証系へ failover した [I][^25]。

#### Azure AD（2021-03-15, Tracking ID LN01-P8Z）

- **RS-09#53** 2021-03-15 19:00 UTC から 03-16 09:37 UTC まで、Azure AD に認証を依存する Microsoft・第三者アプリで認証エラーが起き、Azure AD 自体の緩和は 21:05 UTC に完了したが、ARM 22:39、Key Vault 01:00（一部リージョン 04:30）、Portal 01:50、Storage 09:25 と依存サービスの回復は遅れた [I][^26]。同じ RCA 内で Storage の完全緩和を 09:25 と 09:37 の両方で記しており、本ノートでは終了時刻を 09:37 と扱う [I][^26]。
- **RS-09#54** 根本原因は、使われなくなった鍵を時間起動で削除する自動化が、cross-cloud 移行のため "retain" と印を付けた鍵の状態を無視して削除した bug である [I][^26]。原文: "Once the public metadata was changed at 19:00 UTC on 15 March 2021, applications using these protocols with Azure AD began to pick up the new metadata and stopped trusting tokens/assertions signed with the key that was removed." 鍵 metadata は 21:05 に元へ戻したが、利用側の実装ごとにキャッシュの扱いが異なるため回復時間が分かれ、Storage の一部はキャッシュ無効化の更新配備を要した [I][^26]。
- **RS-09#55** Azure AD の SDP 保護は第 1 段階で鍵の追加を、第 2 段階（当時未完了）で鍵の削除を対象としていた [I][^26]。原文: "it did not help in this case as it provided coverage for token issuance but did not provide coverage for token validation as that was dependent on the impacted metadata endpoint." 告知については、下流サービスの利用者に Service Health で伝えきれず、工具の不備を認めている [I][^26]。

#### Auth0 US-1（2021-04-20）

- **RS-09#56** US-1 Production は 15:27〜19:47 UTC、Preview は 20:04 まで全面停止し、通過した要求も平均で最大 100 倍の遅延を示した [I][^27]。影響表は全リージョンの管理画面について 15:27〜18:18 を「Degraded」、18:18〜20:04 を「Management Dashboard」の影響として記し、User Import/Export と User Search は 23:25 まで止まり、status.auth0.com も 15:48〜16:50 に応答しなかった [I][^27]。
- **RS-09#57** 引き金は、front-end API ノードへテナント設定を供給する feature flag サービスのキャッシュ容量を traffic 増が超え、各ノードの client がキャッシュを迂回してサービスへ直接問い合わせ、サービスが primary DB を直接照会したことである [I][^27]。3 つの低性能 query が重なって DB の disk I/O を超え、timeout 後の再試行と自動スケール（37→100 ノード）が負荷を増幅し、19:25 にノードを 100 から 45 へ減らしたことが回復の決め手になった [I][^27]。
- **RS-09#58** 是正には、負荷削減時に feature flag サービスを止める playbook、キャッシュの増強、重いが重要でない処理の分離、障害時 error page の改善が含まれる [I][^27]。status page は表示のたびに提供者 API を呼んで rate limit を受けていたため、キャッシュ化した [I][^27]。

#### Meta（2021-10-04）

- **RS-09#59** backbone 容量の確認を意図したコマンドが backbone の全接続を切断し、本来止めるはずの監査ツールが bug で止められず、データセンターに到達できなくなった DNS server が BGP 広告を撤回したため外部から到達不能になった [I][^28]。技術者は通常手段でデータセンターに入れず、物理・システムの高い保護が現地作業を遅らせ、報告者は "greatly increased day-to-day security vs. a slower recovery from a hopefully rare event like this" のトレードオフを受け入れる価値があると述べた [I][^28]。

#### Atlassian（2022-04-05）

- **RS-09#60** 2022-04-05 07:38 UTC から 775 顧客がサービスにアクセスできなくなり、一部顧客では最長 14 日に及び、4/8 から順次、4/18 に全顧客が復旧した [I][^29]。883 サイトが 07:38〜08:01 UTC に削除され、データ損失は削除 5 分前までに抑えられ（初期に復旧した 57 顧客の一部 DB は例外で後に回収）、99.6% を超える顧客は影響を受けず、RPO（1 時間）は満たしたが RTO は満たせなかった [I][^29]。
- **RS-09#61** 根本原因は、削除を依頼したチームと実行したチームの間の伝達の誤りで app ID でなく site ID を渡したこと、削除 API が site と app の両 ID を受け付け "assumes the input is correct" であったこと、種類の確認警告がなかったことである [I][^29]。peer review は呼ぶ endpoint に注目しており、staging には当該 ID が存在しないため試験でも検出できず、最初の本番実行（30 サイト）は正しい ID で成功していた [I][^29]。
- **RS-09#62** 教訓は、soft delete の全面化（"staged rollout and tested rollback plan for “soft deletes”"）、多サイト・多製品の復旧自動化、大規模障害の連絡 playbook である [I][^29]。同じスクリプトが Cloud URL や site System Admin 連絡先も削除し、サポート・ライセンス・課金がこれを主識別子にしていたため、当初は顧客を特定・連絡できなかった [I][^29]。復旧の高速化では DB 復元と「Identity synchronizations」を前倒し・並列化した [I][^29]。

#### CrowdStrike（2024-07-19）

- **RS-09#63** 2024-07-19 04:09 UTC に配信された Windows sensor 向け content 更新により、sensor 7.11 以上で 05:27 UTC の差戻しまでに更新を受信した Windows host が crash（BSOD）し、Mac と Linux は影響を受けなかった [I][^30]。RCA は 7/29 時点で Windows sensor の約 99% が更新前と比べて online に戻ったと記す [I][^31]。Microsoft は影響端末を約 850 万台（全 Windows 機の 1% 未満）と推計した [I][^32]。
- **RS-09#64** 根本原因は、IPC Template Type が 21 個の入力欄を定義したのに統合コードが 20 個しか渡さなかった不一致、21 番目の欄に初めて wildcard でない条件を使った Template Instance、Content Interpreter の実行時境界検査の欠如、Content Validator の bug の重なりである [I][^31][^30]。PIR は、Content Validator の検査と過去の IPC Template Instance 配備の成功を信頼して本番配備したと記す [I][^30]。
- **RS-09#65** RCA は "Each Template Instance should be deployed in a staged rollout." と認め、canary 試験を通過した Template Instance を段階的に広い ring へ昇格させ、各昇格後に bake-in 時間を置き、問題があれば rollback する方式に改めた [I][^31]。顧客が Rapid Response Content の配備先と時期を選べるようにし、独立した第三者 2 社による sensor コードと品質工程のレビューを開始した [I][^31]。

#### Google Cloud Service Control（2025-06-12）

- **RS-09#66** Service Control は API 要求ごとに認可・policy・quota 等の検査を行う regional service であり、2025-06-12 に全リージョンで crash loop に陥った [I][^33]。red-button（当該経路の無効化）は約 25 分で準備され約 40 分で展開を終えたが、us-central1 では task 再起動が依存先 Spanner table に herd effect を起こし、randomized exponential backoff がなかったため完全回復まで最長約 2 時間 40 分かかった [I][^33]。同じ status page 上で、2025-06-12 23:34 PDT 掲載の Mini Incident Report は Incident Start 10:49、us-central1 以外の緩和 12:48、Incident End 13:49、「Duration: 3 hours」とし、一部製品は主障害の緩和後も最大 1 時間程度の残余影響があり少数はさらに後に回復したと記す [I][^33]。上記の詳細は 2025-06-13 16:45 PDT 掲載の Incident Report による [I][^33]。status page の incident 記録は 10:51〜18:18 PDT である [I][^33]。18:18 が製品ごとの残余影響の回復を含むかは報告に明記がなく、未確認である [D]。
- **RS-09#67** 2025-05-29 に追加された quota policy 検査のコードは region ごとの rollout を経たが、発動に policy 変更を要するため rollout 中に一度も実行されず、エラー処理も feature flag 保護もなかった [I][^33]。2025-06-12 に空欄を含む policy 変更が regional Spanner table へ挿入され、"this metadata was replicated globally within seconds" となり、各リージョンの Service Control が null pointer で crash した [I][^33]。
- **RS-09#68** 是正策は、Service Control の機能を隔離して "fails open" にし検査失敗時も API 要求を処理できるようにすること、global 複製データを消費する全系を監査し "data replication needs to be propagated incrementally with sufficient time to validate and detect issues" とすること、重要 binary の変更を既定無効の feature flag で守ること、randomized exponential backoff の徹底、監視・連絡基盤の稼働確保である [I][^33]。最初の告知は Cloud Service Health 自体の障害で約 1 時間後になった [I][^33]。ここで fail open にするのは quota 等の検査機能であり、認証・認可の判定を fail open にする趣旨は報告に書かれていない [D]。

#### Cloudflare Workers KV・Access（2025-06-12）

- **RS-09#69** 障害は 2 時間 28 分続き、Workers KV の基盤ストレージ（一部は第三者クラウドが提供）の障害が原因で、設定・認証・配信に KV を使う製品が世界的に影響を受けた [I][^34]。Access は identity-based login の 100% を失敗させ、報告は "Access is designed to fail closed when it cannot successfully fetch policy configuration or a user’s identity." と記す [I][^34]。WARP は新規 client の接続・登録ができず、"the WARP emergency disconnect override was rendered unavailable because of a failure in its underlying dependency, Workers KV" となり、Cloudflare 管理画面の SSO login も Access への全面依存で失敗した [I][^34]。
- **RS-09#70** Workers KV は各拠点で独立に動く「coreless」設計だったが、正本としての中央データストアに依存しており、自社基盤上に製品を作る方針のために KV 障害の blast radius が広がったと報告は述べる [I][^34]。障害中は Access と Device Posture が KV の負荷を下げるため要求を強制的に落とし、是正策は単一ストレージ提供者への依存除去、製品ごとの blast radius 対策、キャッシュ再充填で自社基盤を DoS しないよう namespace を段階的に再有効化する工具である [I][^34]。

#### AWS us-east-1（2025-10-19/20）

- **RS-09#71** DynamoDB の DNS 管理自動化の潜在 race condition で regional endpoint の DNS record が空になり、DynamoDB は 23:48〜02:40 PDT に API エラーを出した [I][^35]。STS は 23:51〜09:59 PDT に API エラーと遅延を示し（01:19 に一度回復、08:31〜09:59 に NLB health check 障害で再発）、IAM user の console sign-in は 23:51〜01:25 PDT に失敗が増え、us-east-1 の IAM Identity Center も sign-in できなかった [I][^35]。原文: "Customers using their root credential, and customers using identity federation configured to use signin.aws.amazon.com experienced errors when trying to log into the AWS Management Console in regions outside of the N. Virginia (us-east-1) Region." 起動済みの EC2 インスタンスは期間中健全なままだった [I][^35]。
- **RS-09#72** AWS は DynamoDB の DNS Planner と DNS Enactor の自動化を世界的に停止し、race condition の修正と誤った DNS 計画の適用防止を再有効化の条件とし、NLB には health check 失敗時に除去できる容量の速度制御を加える [I][^35]。Support Center は設計上、応答が失敗した場合に account metadata 系を迂回するはずだったが、同系が不正な応答を返したため迂回が働かず正当な利用者を遮断した [I][^35]。

#### Cloudflare core proxy・Access（2025-11-18）

- **RS-09#73** 11:20 UTC から core proxy が 5xx を返し、原因は DB 権限の変更で Bot Management の feature file に重複行が入り倍の大きさになったものが全マシンに配布され、実行時上限（200 feature）を超えて panic したことである [I][^36]。core traffic は 14:30 にほぼ正常化し、全系は 17:06 に正常化した [I][^36]。Access は開始から rollback 開始の 13:05 まで大半の利用者で認証に失敗したが、原文は "Any existing Access sessions were unaffected." と記し、障害中の Access 設定更新は失敗または極めて遅く伝播した [I][^36]。
- **RS-09#74** 復旧は不良 file の生成・配布を止め、"manually inserting a known good file into the feature file distribution queue" の上で core proxy を強制再起動して行った [I][^36]。是正策は、自社生成の設定 file の取込みを利用者生成入力と同様に堅牢化すること、機能ごとの global kill switch を増やすこと、core dump 等が資源を食い潰さないようにすること、全 core proxy module のエラー時故障モードを見直すことである [I][^36]。

#### Okta

- **RS-09#75** Okta の status page は US の OK1・OK2 … OK23 等の cell（ページ内データ上の識別子は okta.com:1〜23、欠番あり）、EMEA cell（okta-emea.com:1）、OP1〜OP3（preview、oktapreview.com:1〜3）ごとに状態と障害を表示している [V][^37]。同ページは多くの障害で RCA を 5 営業日以内（一部は 7・10 営業日）に提供すると記し、RCA 要約を別リンクではなく各 incident の更新欄に掲載している [V][^37]。例えば I-10874（2026-06-26）の RCA 要約（2026-07-06 掲載）は、custom domain への接続リセットと認証失敗を OK11 に限定された事象とし、総時間 53 分（7:00〜7:53 PT）、根本原因を前日の custom domain traffic 移行後に新しい routing 基盤が traffic 増で資源不足になったこと、緩和を旧基盤への切戻し、再発防止を routing 基盤の増強と監視・auto-scaling 方針の更新としている [I][^37]。本調査で本文を読んだ Okta の RCA 要約はこの 1 件（および第三者起因の要約数件の存在確認）に限られ、複数 cell に及ぶ大規模な可用性障害の RCA は確認していない [D]。

## 4. 標準・文書ステータス表

| 名称 | 版 | 状態 | 公表日 | 確認日 | URL |
|---|---|---|---|---|---|
| AWS Well-Architected『Reducing the Scope of Impact with Cell-Based Architecture』 | 初版（改訂履歴なし） | 公開済み whitepaper（非規範） | 2023-09-20 | 2026-10-03 | https://docs.aws.amazon.com/wellarchitected/latest/reducing-scope-of-impact-with-cell-based-architecture/reducing-scope-of-impact-with-cell-based-architecture.html |
| AWS『AWS Fault Isolation Boundaries』 | 2023-02-09 小改訂 | 公開済み whitepaper（非規範） | 2022-11-16 | 2026-10-03 | https://docs.aws.amazon.com/whitepapers/latest/aws-fault-isolation-boundaries/abstract-and-introduction.html |
| AWS Well-Architected Reliability Pillar REL11-BP05 | 版番号表示なし（随時更新） | 公開中（非規範） | 未確認 | 2026-10-03 | https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_withstand_component_failures_static_stability.html |
| Amazon Builders' Library: Static stability using Availability Zones | — | 公開中（aws.amazon.com で 200 応答） | 未確認 | 2026-10-03 | https://aws.amazon.com/builders-library/static-stability-using-availability-zones/ |
| Amazon Builders' Library: Workload isolation using shuffle-sharding | Builder Center 版 | 公開中（旧 URL は Builder Center へ 301） | Builder Center 掲載 2026-06-12（最終更新 2026-06-15）、原掲載日は未確認 | 2026-10-03 | https://builder.aws.com/content/3F06NpJ8YeoIGP8VHTw4n81pFn8/workload-isolation-using-shuffle-sharding |
| Amazon Builders' Library: Avoiding fallback in distributed systems | 旧 aws.amazon.com 版（Wayback 2024-08-16 取得） | 公開中（旧 URL は Builder Center へ 301、Builder Center 版は本文が動的描画で取得不可） | 未確認 | 2026-10-03 | https://web.archive.org/web/20240816011626/https://aws.amazon.com/builders-library/avoiding-fallback-in-distributed-systems/ |
| Amazon Builders' Library: Automating safe, hands-off deployments | Builder Center 版 | 公開中 | Builder Center 掲載 2026-06-12（最終更新 2026-07-07）、原掲載日は未確認 | 2026-10-03 | https://builder.aws.com/content/3ErTKQOTKc5NIw031UePBPxTQ6I/automating-safe-hands-off-deployments |
| Amazon Builders' Library: Ensuring rollback safety during deployments | Builder Center 版 | 公開中 | 未確認 | 2026-10-03 | https://builder.aws.com/content/3F04j2yRAAMBuPSPs50xwXZqg01/ensuring-rollback-safety-during-deployments |
| Amazon Builders' Library: Minimizing correlated failures in distributed systems | Builder Center 版 | 公開中 | 未確認 | 2026-10-03 | https://builder.aws.com/content/3Ev2H7t3l2eZa9xBXiZcAjz12JK/minimizing-correlated-failures-in-distributed-systems |
| Google『Site Reliability Engineering』ch.21, ch.22 | 書籍オンライン版 | 公開中（非規範） | 書籍 2016（オンライン版の更新日は未確認） | 2026-10-03 | https://sre.google/sre-book/addressing-cascading-failures/ |
| Google『The Site Reliability Workbook』ch.14, ch.16, App.C | 書籍オンライン版 | 公開中（非規範） | 書籍 2018（オンライン版の更新日は未確認） | 2026-10-03 | https://sre.google/workbook/canarying-releases/ |
| Google『Building Secure and Reliable Systems』ch.8〜10 | 書籍オンライン版 | 公開中（非規範） | 書籍 2020 | 2026-10-03 | https://google.github.io/building-secure-and-reliable-systems/raw/ch08.html |
| NIST SP 800-53 Rev. 5 | Release 5.2.0 | final | 2020-09（Release 5.2.0: 2025-08-27） | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final |
| NIST SP 800-207 Zero Trust Architecture | 初版 | final | 2020-08 | 2026-10-03 | https://doi.org/10.6028/NIST.SP.800-207 |
| OWASP ASVS | 5.0.0（release tag v5.0.0_release。master は "Bleeding Edge" で 5.0.0 と異なり得る） | final | 2025-05-30 | 2026-10-03 | https://github.com/OWASP/ASVS/tree/v5.0.0_release/5.0 |
| Microsoft Learn: Backup Authentication System for Microsoft Entra ID | ms.date 2025-07-22 | 公開中（製品文書） | 2025-07-22（更新 2026-09-28） | 2026-10-03 | https://learn.microsoft.com/en-us/entra/architecture/backup-authentication-system |
| Microsoft Learn: Manage emergency access admin accounts | ms.date 2026-06-04 | 公開中（製品文書） | 2026-06-04 | 2026-10-03 | https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/security-emergency-access |
| Google Cloud Incident #20013 | Issue Summary 2020-12-18、訂正 2020-12-22 | 公表済み（当事者報告） | 2020-12-18 | 2026-10-03 | https://status.cloud.google.com/incident/zall/20013 |
| Azure RCA SM79-F88 | 最終 RCA | 公表済み（現行 status history には非掲載、Wayback 2020-10-15 取得） | 未確認（2020-10-15 以前） | 2026-10-03 | https://web.archive.org/web/20201015125110/https://status.azure.com/en-us/status/history/ |
| Azure RCA LN01-P8Z | 最終 RCA | 公表済み（現行 status history には非掲載、Wayback 2021-04-02 取得） | 未確認（2021-04-02 以前） | 2026-10-03 | https://web.archive.org/web/20210402023547/https://status.azure.com/en-us/status/history/ |
| Auth0 Detailed RCA 2021-04-20 | 2021-07-01 更新（最終） | 公表済み | 2021-07-01 | 2026-10-03 | https://cdn.auth0.com/blog/Detailed_Root_Cause_Analysis_(RCA)_4-2021.pdf |
| Atlassian Post-Incident Review April 2022 | 2024-11-18 更新 | 公表済み（旧 URL /engineering/... は下記へ転送） | 2022-04-30 | 2026-10-03 | https://www.atlassian.com/blog/how-we-build/post-incident-review-april-2022-outage |
| CrowdStrike Preliminary Post Incident Review | 2024-07-25 19:00 UTC 更新 | 公表済み | 2024-07-24 | 2026-10-03 | https://www.crowdstrike.com/en-us/blog/falcon-content-update-preliminary-post-incident-report |
| CrowdStrike External Technical RCA (Channel File 291) | — | 公表済み | 2024-08-06 | 2026-10-03 | https://www.crowdstrike.com/wp-content/uploads/2024/08/Channel-File-291-Incident-Root-Cause-Analysis-08.06.2024.pdf |
| Google Cloud Service Health incident（Service Control） | Mini Incident Report 2025-06-12 23:34 PDT、Incident Report 2025-06-13 16:45 PDT | 公表済み | 2025-06-13（Incident Report） | 2026-10-03 | https://status.cloud.google.com/incidents/ow5i3PPK96RduMcb1SsW |
| Cloudflare: Cloudflare service outage June 12, 2025 | — | 公表済み | 2025-06-12 | 2026-10-03 | https://blog.cloudflare.com/cloudflare-service-outage-june-12-2025/ |
| AWS: Summary of the Amazon DynamoDB Service Disruption（us-east-1） | — | 公表済み | 未確認（事象 2025-10-19/20） | 2026-10-03 | https://aws.amazon.com/message/101925/ |
| Cloudflare: Cloudflare outage on November 18, 2025 | — | 公表済み | 2025-11-18 | 2026-10-03 | https://blog.cloudflare.com/18-november-2025-outage/ |
| Okta Status（incident I-10874 の RCA 要約） | RCA 要約 2026-07-06 掲載 | 公表済み（status page の incident 更新欄） | 2026-07-06 | 2026-10-03 | https://status.okta.com/ |

## 5. 設計への含意と PoC で実測すべきこと

### 5.1 ADR・設計文書への入力

ADR 番号は seed-02 の A01〜A19 を ADR-001〜ADR-019 と読み替えたものである。traceability/deliverables.md（TRC-03）が追加定義する ADR-023・ADR-027・ADR-029 と DL 番号も、入力先として併記する [D]。

| 入力先 | 入力する内容 | 根拠 |
|---|---|---|
| ADR-013（cell 分割と fail-mode） | (a) 分割キーはテナント ID を基本とし、データ所在地要件ごとの cell 群に分ける。(b) global に残す部品を cell router・テナント→cell 対応表・鍵 root に限定し、router は対応表をローカルに保持して control plane 停止中も転送を続ける。(c) 操作階層ごとに fail-closed／fail-static（署名付き既知良好 policy・判定を最大齢付きで使用）／fail-open（quota・rate limit・telemetry 等の非保護機能のみ）を割り当て、認可判定の fail-open は禁止する。(d) 初日から複数 cell と cell 移動手段を持ち、cell ごとに故障モード分析表を作る [D][A-未採番: CONVENTIONS §7 の暫定前提] | RS-09#1〜#6, #12, #19〜#24, #67 |
| DL-19（fail-mode matrix） | 行（操作 5 分類）×列（PDP timeout、replica 遅延、IdP 停止、KMS 停止、監査 sink 停止、JWKS 取得失敗、設定配布停止、誤った応答）の各セルに、上記三分法のどれか、最大齢、剥奪反映の上限時間、警報条件を書く。「誤った応答」列を独立に置く [D] | RS-09#21, #22, #24, #72 |
| ADR-001（managed IdP か自営 AS か） | 評価軸に、提供者の cell 構成と cell 単位の障害公表、バックアップ認証系の対象範囲（新規 login・token 検証・SP-initiated SAML・B2B を含むか）、RCA の公開・顧客提供方針、global endpoint の有無を加える [D] | RS-09#27, #28, #55, #71, #75 |
| ADR-005（token profile） | access token・session の寿命と IdP 停止時の継続時間を、同一の数値契約で決める（短命化は剥奪を早めるが停止耐性を下げる）。資格情報の有効期限・キャッシュ TTL に jitter を入れる [D] | RS-09#8, #14, #36, #41 |
| ADR-006（失効と継続評価） | 失効情報は pull 照会でなく、署名付き失効リスト（または状態）として各 cell・PEP へ push し、ローカルキャッシュで評価する。PDP・失効源の不達時に失効確認を省く fail-open は取らない。失効状態は policy 版と独立に単調増加させ、policy rollback で戻らないようにする [D] | RS-09#21, #27, #35 |
| ADR-007（鍵階層と KMS/HSM） | 署名鍵は cell ごとに分け、侵害時に cell 単位で失効できるようにする。鍵の追加と削除を別の承認・段階展開経路にし、削除は canary cell と待機時間の後に行う。JWKS の利用側には、鍵が metadata から消えたときの扱い（直ちに不信任か猶予か）と、緊急失効の別経路を規定する [D] | RS-09#9, #53〜#55 |
| ADR-008（管理面と CI/CD） | policy bundle・tenant 設定・鍵 metadata の配布 pipeline を binary と同じ wave・bake time・自動 rollback に載せ、global 複製を禁止する。データプレーンは自前生成の設定も利用者入力と同様に検証（schema、サイズ上限、空欄）し、不合格なら既知良好版を保持する。管理面の login を本基盤だけに依存させない [D] | RS-09#30〜#33, #67, #69, #73, #74 |
| ADR-010・ADR-011（認可エンジン、PEP–PDP API） | PDP はローカルの policy・関係データで評価できる配置を基本とし、判定応答に policy 版・データ版・判定時刻を含める。PEP–PDP 要求に操作階層を criticality として載せ、過負荷時は低階層から shed する。キャッシュ不達時に正本ストアへ直接問い合わせる迂回を禁止する [D] | RS-09#14, #15, #39, #57 |
| ADR-014（監査データ） | 監査 sink 停止時の挙動を操作階層ごとに fail-mode matrix に載せる（例: privileged 操作は監査不能なら拒否、低リスク read はローカル耐久 buffer に蓄積）。値は PoC で決める [D] | RS-09#24, #26 |
| ADR-016（versioning・deprecation） | policy・schema・token 形式の変更は Prepare/Activate の 2 段階で行い、段階間に bake period を置く。旧形式の読取り削除は backfill 完了後とする [D] | RS-09#34 |
| ADR-019（侵害時 runbook）・ADR-027（rollback） | 機能単位の kill switch（red-button）と緊急 freeze、既知良好版を配布 queue へ差し込む手順、復旧時の段階的再有効化（cache 再充填で自壊しない速度制御）を runbook 化し、緊急 push は通常 push の最大速度版として同じ系で演習する [D] | RS-09#35, #66, #70, #74 |
| ADR-023（依存階層）・DL-63 | 「本基盤に依存してはならないもの」に、break-glass 経路、本基盤の管理面 login、status page・障害告知・サポート受付、顧客連絡先台帳、復旧工具、監視基盤を入れる。本基盤の control plane に回復経路を依存させない [D] | RS-09#13, #41〜#46, #49, #58, #62, #69 |
| ADR-029（特権・support アクセス、break-glass） | break-glass は「事前作成・権限付与済み・封緘保管」とし、障害時作成・障害時権限付与の方式は採らない。2 個以上、通常管理者と異なる phishing 耐性方式、Conditional Access 等の動的条件からの除外、全使用の警報と事後レビュー、90 日以内ごとの演習を最低線とする。AC-2(2) との関係は補完統制で説明する [D] | RS-09#42〜#45 |
| DL-18（cell・blast radius 分析）・DL-53（事故ケースブック） | §3.7 の事故 12 件（Okta I-10874 を含む）を「破られた前提→対応要件→統制→検証」に写像する入力とする。特に「regional でも global 複製データで全域停止」（Google 2025）、「global endpoint の単一リージョン依存」（AWS 2025）、「バックアップ系の対象外経路」（Azure 2021）を DL-18 の global 部品棚卸しの観点に加える [D] | RS-09#47〜#74 |

### 5.2 PoC で実測すべきこと（閉じ方区分 C）

試験 ID（TC-xxx）は 12_poc/ で採番する。以下は測定対象の候補であり、合否基準の数値は BIA と事業オーナーの決定を待つ（TBD）[D]。

1. **cell 封じ込め率**: 1 cell に不良 policy bundle（空欄、サイズ超過、型不一致）を投入し、影響を受けたテナント数／全テナント数と、他 cell の誤り率変化を測る [D]（根拠: RS-09#1, #67, #73）。
2. **control plane 停止中の継続時間と剥奪遅延**: policy 管理 API・tenant 管理・IdP 管理面を止めた状態で、PEP/PDP・token 検証が既知良好状態で動き続ける時間と、その間に行った剥奪が反映されない時間（stale allow 継続時間）を操作階層別に測る [D]（根拠: RS-09#10, #13, #21）。
3. **IdP/AS 停止時の既存 session 継続**: AS を停止し、既存 session・refresh・新規 login・step-up がそれぞれ何分成功し続けるかを測る [D]（根拠: RS-09#27, #49, #73）。
4. **署名鍵 metadata の誤削除と復帰**: 使用中鍵を JWKS から外し、利用側実装ごとの不信任開始時間、復帰後の回復時間の分布（最遅値）を測る [D]（根拠: RS-09#53, #54）。
5. **キャッシュ不達時の正本ストア負荷**: 判定キャッシュ・設定キャッシュを全ノード同時に落とし、正本ストアへの要求率、自動スケールの挙動、誤り率を測る（迂回が無効化されていることの確認を含む）[D]（根拠: RS-09#14, #15, #57）。
6. **再試行・再起動の増幅**: PDP 群を一斉再起動し、cold cache 状態での要求成功率、依存ストアへの herd 負荷、retry budget と jitter 付き backoff の効果を測る [D]（根拠: RS-09#38, #40, #66）。
7. **段階展開と自動 rollback**: canary cell→wave の各段で bake time と自動 rollback 条件を設定し、不良変更の検知時間・rollback 完了時間・既知良好版復帰時間（R-156）を測る [D]（根拠: RS-09#30〜#33）。
8. **policy rollback と剥奪の単調性**: 権限剥奪の後に policy 版を一つ前へ戻し、剥奪済み権限が復活しないことを確認する [D]（根拠: RS-09#35）。
9. **誤った応答（gray failure）**: PDP・失効源が誤応答（全 deny、全 allow、古い版）を返す状況を注入し、fail-mode の切替えと警報が働くかを測る [D]（根拠: RS-09#72）。
10. **break-glass 演習**: IdP・SSO・MFA・KMS・本基盤管理面を同時に止めた状態で break-glass 経路が使えるか、所要時間、警報発報、事後レビュー記録を測る [D]（根拠: RS-09#41〜#44）。
11. **監査 sink 停止**: 監査経路を止め、階層別の拒否・buffer 挙動、buffer 上限到達時間、欠損検知までの時間を測る [D]（根拠: RS-09#24）。
12. **global 依存の棚卸し**: 1 リージョンを遮断し、他リージョンの login・token 発行・JWKS 取得・管理面が影響を受けないかを測る [D]（根拠: RS-09#13, #71）。

## 6. 調査の限界と未確認事項

- **文書番号の不一致**: traceability/deliverables.md（TRC-03）は RS-09 を「セキュリティ侵害事故の一次報告」（research/RS-09-security-incident-reports.md）とし、cell・blast radius を RS-10、可用性障害の一次報告を RS-12 に割り当てている。本ノートは指示どおり RS-09「レジリエンス・cell・fail mode」として作成し、内容は TRC-03 の RS-10 と RS-12 の範囲に重なる。番号と範囲の整理は TRC-03 の所有者が行う必要がある（本ノートでは TRC-03 を編集していない）[D]。
- **Okta**: status page は RCA 要約を別ページへのリンクではなく各 incident の更新欄に掲載している（v0.1 の「公開リンクを確認できず RCA 本文は未確認」は独立検証で訂正）。本ノートで本文を読んだのは OK11 の I-10874（2026-06-26、53 分）1 件であり、複数 cell に及ぶ大規模障害の RCA は未確認である。Okta 2023 のサポートシステム侵害は可用性ではなく侵害事故であり、本ノートの対象外とした。
- **Auth0**: 2021-04-20 以外の障害 RCA は調べていない。
- **Azure AD の RCA**: 2020-09・2021-03 の RCA は現行の Azure status history に掲載がなく、Wayback Machine に保存された status.azure.com の写しで本文を確認した。Microsoft Q&A に転載された同文は根拠に使っていない。2021-03 の RCA は完全緩和時刻を 09:25 と 09:37 の両方で記しており、どちらが正しいかは未確認である。
- **Meta 2021-10-04**: 影響の総時間は、本調査で取得した本文から確認できず未確認とした。
- **Google 2025-06-12**: 「Duration: 3 hours」は Incident Report（2025-06-13 16:45 PDT）の要約ではなく、Mini Incident Report（2025-06-12 23:34 PDT、10:49〜13:49 PDT）の記載である（v0.1 の帰属を独立検証で訂正）。status page 記録の終了 18:18 PDT が製品ごとの残余影響の回復を含むかは報告に明記がなく、未確認である。
- **Google 2020-12-14**: 当初の「Cloud service account は影響なし」は 2020-12-22 に訂正されており、workload 用資格情報経路の独立性の根拠には使えない。
- **CrowdStrike**: 影響端末 850 万台は Microsoft の推計であり、CrowdStrike 自身の数値ではない。端末側の回復に要した時間の全体像は当事者報告から確認していない。
- **Cloudflare 2025-06-12**: 障害中に既存の Access session が継続したかは、取得した本文から確認できなかった（2025-11-18 については「unaffected」と明記）。
- **Microsoft Entra バックアップ認証系**: 平常時に実トラフィックで常時動かして検証しているか（RS-09#14 の「failover への転換」に当たるか）は公開資料で確認できず、未確認である。
- **Builders' Library**: 多くの記事が Builder Center へ移設され、本文が動的描画のため一部は Tavily の抽出結果または Wayback の旧版で確認した。原掲載日は未確認である（hands-off deployments の著者 Clare Liguori、rollback safety の著者 Sandeep Pokkunuri は、独立検証で各 Builder Center ページの著者表記として確認した）。
- **規範の空白**: 認可判定の fail-open/fail-closed/fail-static の選択を具体的に規定する標準は見つからなかった。SP 800-53 SC-24 は落ちる先の状態を組織定義に委ね、ASVS 5.0.0 16.5.3 は fail-open 状態の防止を求めるにとどまる。§2 の三分法は RS-09#19〜#26 からの設計推論である。SP 800-53 の各統制がどの baseline（Low/Moderate/High）に含まれるかは SP 800-53B を確認しておらず未確認である。
- **数値の外挿**: AWS 白書の「RPO 5 秒未満・RTO 30 秒未満」、Google の postmortem 比率（37%・31%）、AWS の bake time は各社の文脈での値であり、本基盤の目標値として使っていない。
- **対象外**: EU DORA の ICT 第三者集中リスク、FISC 等の業界別レジリエンス要件は本ノートでは調べていない（RS-16 等の範囲）。
- **種資料との差分**: seed-02 7-3 は「CrowdStrike PIR(2024-08)」とするが、PIR は 2024-07-24、External Technical RCA は 2024-08-06 である。seed-03 D1 の Google（約 47 分、認証付きトラフィックのほぼ全てで 5xx）、Azure AD（保持指定を無視した鍵削除）、Atlassian（883 サイト、最長 14 日）の記述は一次報告と一致した。
- **前提台帳**: 01_governance/assumptions-register.md が未作成のため、仮定には A-ID を付けられず「A-未採番」と記した。

## 参考文献

[^1]: Amazon Web Services『Reducing the Scope of Impact with Cell-Based Architecture』AWS Well-Architected whitepaper, 2023-09-20. https://docs.aws.amazon.com/wellarchitected/latest/reducing-scope-of-impact-with-cell-based-architecture/reducing-scope-of-impact-with-cell-based-architecture.html （参照箇所: What is a cell-based architecture? / Why use / When to use / Control plane and data plane / About resilience of the cell router / A warning for all mapping approaches / Cell migration / Cell deployment / Best practices / FAQ、確認日: 2026-10-03）
[^2]: Amazon Web Services（著者表記 Colm）『Workload isolation using shuffle-sharding』Amazon Builders' Library（AWS Builder Center 掲載 2026-06-12、最終更新 2026-06-15）. https://builder.aws.com/content/3F06NpJ8YeoIGP8VHTw4n81pFn8/workload-isolation-using-shuffle-sharding （参照箇所: What is shuffle sharding? / Amazon Route 53 and shuffle sharding、確認日: 2026-10-03）
[^3]: Joe Magerramov（Amazon Web Services）『Minimizing correlated failures in distributed systems』Amazon Builders' Library（AWS Builder Center）. https://builder.aws.com/content/3Ev2H7t3l2eZa9xBXiZcAjz12JK/minimizing-correlated-failures-in-distributed-systems （参照箇所: cellular architectures の段落、Reducing correlated behaviors の jitter 列挙、確認日: 2026-10-03）
[^4]: Vitaliy Shipitsyn, Mitch Adler, Zoltan Egyed, Paul Blankinship（Google）『Building Secure and Reliable Systems』Chapter 8 "Design for Resilience", 2020. https://google.github.io/building-secure-and-reliable-systems/raw/ch08.html （参照箇所: Failing safe versus failing secure / Security and Reliability Tradeoff: Response Mechanisms / A foothold for humans / Controlling the Blast Radius / Failure Domains and Redundancies / Component Types / 注 6・注 11、確認日: 2026-10-03）
[^5]: Becky Weiss, Mike Furr（Amazon Web Services）『Static stability using Availability Zones』Amazon Builders' Library. https://aws.amazon.com/builders-library/static-stability-using-availability-zones/ （参照箇所: 導入、Static stability 節、Availability Zone independence 節、確認日: 2026-10-03）
[^6]: Amazon Web Services『AWS Fault Isolation Boundaries』whitepaper, 2022-11-16（2023-02-09 改訂）. https://docs.aws.amazon.com/whitepapers/latest/aws-fault-isolation-boundaries/global-services.html （参照箇所: Global services、Appendix A - Partitional service guidance の AWS IAM 節、確認日: 2026-10-03）
[^7]: Jacob Gabrielson（Amazon Web Services）『Avoiding fallback in distributed systems』Amazon Builders' Library（Wayback Machine 2024-08-16 取得の aws.amazon.com 版。現行は https://builder.aws.com/content/3EuS9Sakq7L3VLQIF3qzfMfke1Y/avoiding-fallback-in-distributed-systems ）. https://web.archive.org/web/20240816011626/https://aws.amazon.com/builders-library/avoiding-fallback-in-distributed-systems/ （参照箇所: Distributed fallback / How Amazon avoids fallback の各小節 / Conclusion、確認日: 2026-10-03）
[^8]: Amazon Web Services『REL11-BP05 Use static stability to prevent bimodal behavior』AWS Well-Architected Framework Reliability Pillar. https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_withstand_component_failures_static_stability.html （参照箇所: 冒頭定義、Implementation guidance、確認日: 2026-10-03）
[^9]: Mike Ulrich（Google）『Site Reliability Engineering』Chapter 22 "Addressing Cascading Failures", 2016. https://sre.google/sre-book/addressing-cascading-failures/ （参照箇所: 冒頭定義、Server Overload、Load Shedding and Graceful Degradation、Retries、Latency and Deadlines、Slow Startup and Cold Caching、Triggering Conditions、Testing for Cascading Failures、確認日: 2026-10-03）
[^10]: NIST『SP 800-207 Zero Trust Architecture』final, 2020-08. https://doi.org/10.6028/NIST.SP.800-207 （参照箇所: §5.2 Denial-of-Service or Network Disruption、Appendix B.4.7、確認日: 2026-10-03）
[^11]: Google『Building Secure and Reliable Systems』Chapter 9 "Design for Recovery", 2020. https://google.github.io/building-secure-and-reliable-systems/raw/ch09.html （参照箇所: 緊急 push の段落、Time 節、Rollbacks Represent a Tradeoff Between Security and Reliability、Use an Explicit Revocation Mechanism（Failing open）、Emergency Access（Access Controls / Google's Fallback for Access Control / Responder Habits）、確認日: 2026-10-03）
[^12]: Google『Building Secure and Reliable Systems』Chapter 10 "Mitigating Denial-of-Service Attacks", 2020. https://google.github.io/building-secure-and-reliable-systems/raw/ch10.html （参照箇所: DoS mitigation system の依存と fail static の段落、確認日: 2026-10-03）
[^13]: NIST『SP 800-53 Rev. 5 Security and Privacy Controls for Information Systems and Organizations』final, Release 5.2.0（2025-08-27）. https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final （本文は NIST 公式 OSCAL カタログ 5.2.0 https://github.com/usnistgov/oscal-content で照合。参照箇所: SC-24, SC-7(18), CP-10, CP-12, SI-17, SA-8(19), SA-8(24), AC-2(2)、確認日: 2026-10-03）
[^14]: OWASP Foundation『Application Security Verification Standard』5.0.0（release tag v5.0.0_release）, 2025-05-30. https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/en/0x25-V16-Security-Logging-and-Error-Handling.md （参照箇所: V16.5 Error Handling 16.5.2〜16.5.4、確認日: 2026-10-03。master ブランチ版の同箇所も 2026-10-03 時点で同文）
[^15]: Microsoft『Backup Authentication System for Microsoft Entra ID』Microsoft Learn, ms.date 2025-07-22（更新 2026-09-28）. https://learn.microsoft.com/en-us/entra/architecture/backup-authentication-system （参照箇所: What makes a user supportable by the backup authentication system? / How do Conditional Access policies affect resilience? / Certificate revocation and the backup authentication system / Non-Microsoft application types that aren't protected、確認日: 2026-10-03）
[^16]: Mark Russinovich（Microsoft Azure、本文は Nadim Abdo による更新）『Advancing service resilience in Azure Active Directory with its backup authentication service』Azure Blog, 2021-11-22. https://azure.microsoft.com/en-us/blog/advancing-service-resilience-in-azure-active-directory-with-its-backup-authentication-service/ （参照箇所: How does the service work? / How are security policies ... enforced、確認日: 2026-10-03）
[^17]: Štěpán Davidovič（Google）『The Site Reliability Workbook』Chapter 14 "Configuration Design and Best Practices", 2018. https://sre.google/workbook/configuration-design/ （参照箇所: Safe Configuration Change Application、確認日: 2026-10-03）
[^18]: Alec Warner, Štěpán Davidovič（Google）『The Site Reliability Workbook』Chapter 16 "Canarying Releases", 2018. https://sre.google/workbook/canarying-releases/ （参照箇所: 冒頭定義、Release Engineering Principles、Canarying、Error budget の段落、確認日: 2026-10-03）
[^19]: Google『The Site Reliability Workbook』Appendix C "Results of Postmortem Analysis", 2018. https://sre.google/workbook/postmortem-analysis/ （参照箇所: Table C-1 Top eight outage triggers, 2010–2017、確認日: 2026-10-03）
[^20]: Clare Liguori（Amazon Web Services）『Automating safe, hands-off deployments』Amazon Builders' Library（AWS Builder Center 掲載 2026-06-12、最終更新 2026-07-07。著者表記は同ページで確認）. https://builder.aws.com/content/3ErTKQOTKc5NIw031UePBPxTQ6I/automating-safe-hands-off-deployments （参照箇所: production waves、One-box and rolling deployments、Bake time、自動 rollback の段落、確認日: 2026-10-03）
[^21]: Sandeep Pokkunuri（Amazon Web Services）『Ensuring rollback safety during deployments』Amazon Builders' Library（AWS Builder Center。掲載日は未確認）. https://builder.aws.com/content/3F04j2yRAAMBuPSPs50xwXZqg01/ensuring-rollback-safety-during-deployments （参照箇所: two-phase deployment、Precautions with two-phase deployments、確認日: 2026-10-03）
[^22]: Alejandro Forero Cuervo（Google）『Site Reliability Engineering』Chapter 21 "Handling Overload", 2016. https://sre.google/sre-book/handling-overload/ （参照箇所: Criticality、確認日: 2026-10-03）
[^23]: Microsoft『Manage emergency access admin accounts - Microsoft Entra ID』Microsoft Learn, ms.date 2026-06-04. https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/security-emergency-access （参照箇所: Why use / Create / Configuration requirements / Conditional Access considerations / Security guardrails summary / Validate accounts regularly、確認日: 2026-10-03）
[^24]: Google Cloud『Google Cloud Infrastructure Components Incident #20013』Google Cloud Status Dashboard, Preliminary Statement 2020-12-14, Issue Summary 2020-12-18, 訂正 2020-12-22. https://status.cloud.google.com/incident/zall/20013 （参照箇所: ISSUE SUMMARY / ROOT CAUSE / REMEDIATION AND PREVENTION / DETAILED DESCRIPTION OF IMPACT / 2020-12-22 訂正 / Preliminary Incident Statement、確認日: 2026-10-03）
[^25]: Microsoft Azure『RCA - Authentication errors across multiple Microsoft services and Azure Active Directory integrated applications (Tracking ID SM79-F88)』Azure status history, 2020-09-28 事象（Wayback Machine 2020-10-15 取得）. https://web.archive.org/web/20201015125110/https://status.azure.com/en-us/status/history/ （参照箇所: Summary of Impact / Root Cause / Mitigation / Next Steps、確認日: 2026-10-03）
[^26]: Microsoft Azure『RCA - Authentication errors across multiple Microsoft services (Tracking ID LN01-P8Z)』Azure status history, 2021-03-15 事象（Wayback Machine 2021-04-02 取得）. https://web.archive.org/web/20210402023547/https://status.azure.com/en-us/status/history/ （参照箇所: Summary of Impact / Root Cause and Mitigation / Next Steps、確認日: 2026-10-03）
[^27]: Auth0『2021-04-20 - US-1 Full Service Disruption: Detailed Root Cause Analysis (RCA)』2021-07-01 更新. https://cdn.auth0.com/blog/Detailed_Root_Cause_Analysis_(RCA)_4-2021.pdf （参照箇所: Summary（影響時刻表）/ What Happened / How We Responded / Status Page Failure / Mitigation Actions、pp.1–7、確認日: 2026-10-03）
[^28]: Santosh Janardhan（Meta）『More details about the October 4 outage』Engineering at Meta, 2021-10-05. https://engineering.fb.com/2021/10/05/networking-traffic/outage-details/ （参照箇所: 原因、DNS と BGP、復旧の障害と security のトレードオフの段落、確認日: 2026-10-03）
[^29]: Atlassian『Post-Incident Review on the Atlassian April 2022 outage』2022-04-30（2024-11-18 更新）. https://www.atlassian.com/blog/how-we-build/post-incident-review-april-2022-outage （旧 URL https://www.atlassian.com/engineering/post-incident-review-april-2022-outage は 2026-10-03 時点で同ページへ転送。参照箇所: Executive summary / What happened / Restoration / Support experience & customer outreach / Learning 1〜4、確認日: 2026-10-03）
[^30]: CrowdStrike『Preliminary Post Incident Review (PIR): Content Configuration Update Impacting the Falcon Sensor and the Windows Operating System (BSOD)』（HTML title: Falcon Content Update Preliminary Post Incident Report）2024-07-24（2024-07-25 19:00 UTC 更新）. https://www.crowdstrike.com/en-us/blog/falcon-content-update-preliminary-post-incident-report （参照箇所: What Happened? / What Went Wrong and Why? / How Do We Prevent This From Happening Again?、確認日: 2026-10-03）
[^31]: CrowdStrike『External Technical Root Cause Analysis — Channel File 291』2024-08-06. https://www.crowdstrike.com/wp-content/uploads/2024/08/Channel-File-291-Incident-Root-Cause-Analysis-08.06.2024.pdf （参照箇所: Introduction・What Happened pp.1–2、Findings and Mitigations 1〜6 pp.3–6、Independent Third-Party Review p.6、確認日: 2026-10-03）
[^32]: David Weston（Microsoft）『Helping our customers through the CrowdStrike outage』Official Microsoft Blog, 2024-07-20. https://blogs.microsoft.com/blog/2024/07/20/helping-our-customers-through-the-crowdstrike-outage/ （参照箇所: 影響端末数の推計の文、確認日: 2026-10-03）
[^33]: Google Cloud『Incident details（Service Control, 2025-06-12）』Google Cloud Service Health, Mini Incident Report 2025-06-12 23:34 PDT, Incident Report 2025-06-13 16:45 PDT. https://status.cloud.google.com/incidents/ow5i3PPK96RduMcb1SsW （参照箇所: Incident Report の Summary / What happened? / What is our immediate path forward? / How did we communicate? / What's our approach moving forward?、Mini Incident Report の Incident Start/End・Duration・Description、ページ冒頭の incident 記録、確認日: 2026-10-03）
[^34]: Cloudflare『Cloudflare service outage June 12, 2025』The Cloudflare Blog, 2025-06-12. https://blog.cloudflare.com/cloudflare-service-outage-june-12-2025/ （参照箇所: 冒頭要約、影響表の Access・WARP・Dashboard 行、Background（coreless）、Timeline、Remediation and follow-up steps、確認日: 2026-10-03）
[^35]: Amazon Web Services『Summary of the Amazon DynamoDB Service Disruption in the Northern Virginia (US-EAST-1) Region』. https://aws.amazon.com/message/101925/ （参照箇所: 冒頭、DynamoDB 節、EC2 節、STS・IAM sign-in・Support Center の段落、是正策の段落、確認日: 2026-10-03）
[^36]: Matthew Prince（Cloudflare）『Cloudflare outage on November 18, 2025』The Cloudflare Blog, 2025-11-18. https://blog.cloudflare.com/18-november-2025-outage/ （参照箇所: 冒頭、影響表の Access 行、Memory preallocation、Remediation and follow-up steps、確認日: 2026-10-03）
[^37]: Okta『Okta Status』status.okta.com. https://status.okta.com/ （参照箇所: cell 別の状態表示、障害一覧と RCA 提供の記載、incident I-10874（2026-06-26、OK11）の更新欄に 2026-07-06 掲載の RCA 要約。ページ本文は動的描画で、ページ内に埋め込まれた incident データで照合、確認日: 2026-10-03）
