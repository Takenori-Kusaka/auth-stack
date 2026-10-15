# ADR-006 失効・継続評価（剥奪・停止・session 失効・資格情報侵害・鍵失効の伝播方式と送受信義務）

> 文書ID: ADR-006 / 版: 0.2 / 状態: draft（ADR 状態: proposed＝決裁前）/ 最終更新: 2026-10-15（0.2（PoC/R7反映）: PoC 実測レポート POC-02 と独立再現ログ、模擬パネル ラウンド 7 の指摘により、§7.1.1（PoC 系統 1 の結果）、§8 の実測トリガー、残課題、レビュー記録を加えた。PoC の値は自己実行の参考値で Gate 4 の証拠ではない）
> 可逆性: **可逆（条件付き）**。伝播の機構（失効状態の配布方式、cache の最大齢、接続の再確認間隔、Token Status List の採否）は、強制点（edge・PDP facade・PEP SDK・接続ゲートウェイ・STS）の内側で差し替えられる [D]。戻しにくいのは次の 3 点である。(1) 外部と契約する SSF/CAEP/RISC のイベント種別・SET の形式・受信義務（ADR-022 で GA に置く範囲。DL-78・DL-79）、(2) 依存サービスに課す「認可の allow を SDK の外で cache しない」「長時間接続・非同期ジョブを再確認する」義務（約 300 サービスの実装に入る）、(3) 失効記録の識別子（revocation_id・失効 epoch）を監査証跡に残す意味（ADR-014）[D]。
> DEC-3 対象: いいえ（traceability/deliverables.md §5 の ADR-006 行で DEC-3 列は「—」）。依存先の ADR-007・ADR-013・ADR-021・ADR-022 は DEC-3 対象である [D]。
> 対応要求: R-112, R-143, R-191（deliverables.md §5 の ADR-006 行）／G-111（本書を対応成果物に名指し）、G-020（05_adr の全 ADR を対象）。関連: R-044, R-052, R-086, R-087, R-111, R-113, R-144, R-145, R-146, R-168, R-171, R-238, R-282, R-189.5, R-189.6, R-191.1〜R-191.3, R-195.3, R-206, R-253, R-262, R-271, R-275／G-055, G-059, G-078, G-084, G-093, G-099, G-102, G-103, G-110, G-118, G-121, G-136, G-137, G-138（全件と閉じ方は末尾の対応表）
> 依存文書: CONVENTIONS.md, traceability/deliverables.md, traceability/R-requirements.md, traceability/G-goal-criteria.md, traceability/claims-ledger.md（CL-0133, CL-0169, CL-0200, CL-0241, CL-0255, CL-0262, CL-0279）, traceability/dissent-log.md, 01_governance/assumptions-register.md, 01_governance/business-impact-analysis.md, 01_governance/stop-authority.md, 01_governance/kri.md（K-15, K-17）, 02_requirements/operation-risk-tiers-assurance.md（REQ-03 §3.1）, 02_requirements/principal-catalog.md, 02_requirements/identity-lifecycle.md（INV-6, S-07, §15.3）, 02_requirements/tenant-lifecycle.md（§3.8, §7.3, TL-5）, 03_threat-model/attacker-model.md, 03_threat-model/threat-catalog.md（T-019, T-024, T-032, T-035, T-036, T-038, T-039, T-044, T-059, T-069, TD-3）, 03_threat-model/incident-casebook.md（CB-REQ-04, -11, -15）, 05_adr/ADR-001, ADR-005, ADR-007, ADR-010, ADR-011, ADR-013, ADR-021, ADR-022, 05_adr/reconciliation-notes.md, research/RS-03, RS-04, RS-06, RS-07, RS-08, RS-09, RS-12, RS-14, RS-17（各 verification 記録を含む）, research/standards-status.md
> 作成方法: AI エージェント（Claude）が起草した。主要 ADR 8 本と Wave A 文書を通読し、それらの決定を前提として本書の決定を組み立てた。判断は自己レビューであり、実在する CTO/CISO の決裁ではない（CONVENTIONS §8）[D]。research ノートにない原典（OpenID Connect Back-Channel Logout 1.0、Token Status List の 2026-10-15 時点の Datatracker 状態）は起草者が取得して照合した。作成者以外のレビュー（2026-10-15、末尾の「レビュー記録」）で主要 ADR との整合、脚注、対応表を照合し修正した。traceability/ の照合ログへの追記は要対応である（本書からは編集していない）[D]。
> 表記: 決定 D6-xx、決裁案 K6-x、PoC 仮説 H6-xx（TC-ID は 12_poc で採番）、残余リスク RR6-xx、新規仮定 NA-006-x、主要 ADR との論点 L6-x と書く。表のセルのうちタグのないものは設計推論 [D] であり、この注記で個別のタグに代える。事実を述べるセルには個別にタグと脚注を付けた。

**要旨（結論）**

- **伝播の原則**: 失効の効力は、基盤が所有する少数の強制点（edge の状態照会、PDP facade の G 段、PEP SDK、接続ゲートウェイ、STS・TTS、AS）で中央強制し、約 300 の依存サービスがイベントを受け取れたかどうかに依存させない [D]。強制点には、cell ごとに署名付き・単調増加の「失効状態」を push で配り、局所で評価する（pull 照会の timeout で失効確認を省く fail-open はしない）[D]（RS-09#21）。失効状態は policy・model の版と切り離し、control plane の停止や緊急 freeze の間も配る（ADR-013 D13-35、ADR-010 D-20 と同じ原則）[D]。
- **送受信義務の範囲**: SSF/CAEP/RISC は組織の境界でだけ使う。顧客 IdP からは受信し（基盤が受信者）、trust agreement を結んだ外部の受信者（顧客の自社システム、外部連携アプリ）へは送信する（基盤が送信者）[D]。内部の依存サービスは SSF の受信者にせず、自らが持つ派生状態（独自 session、長時間接続、非同期ジョブ、署名付き URL、データの複製）だけをライフサイクル事象（ADR-022 のイベント配送契約、G-137）で更新する義務を負う [D]。外部連携アプリの API 利用は edge の照会で止めるので、アプリ側の受信は「アプリ内に残る session・データの後始末」の義務になる [D]。
- **剥奪 SLO の分解**: 剥奪反映時間 R(t, c)（操作階層 t × 失効の区分 c）を「正本への確定書込 D_w」＋経路ごとの「配布遅延 Δ＋強制点の cache 最大齢 C＋再確認間隔または bearer の残存寿命 Z」の最大値に分解し、各項を構成要素の遅延予算として数値契約（DL-20）に載せる [D]。顧客 IdP 側の同期遅延 U は基盤の SLO と分けて計上し、G-111 の「端から端」の実測には含める [D]。数値はすべて TBD（所有者・期限・決め方を §2.10 に記す）で、BIA の R(t)・E(t)（ADR-005 K-2）と PoC 実測から決める [D]。

---

## 1. 文脈

### 1.1 解くべき問題

1. 旧提案のレビューは、権限剥奪の直後に何ミリ秒以内で拒否するかを操作単位で答えるよう求め（R-143）、通常・高権限・tenant 停止ごとの最大反映時間、stale allow の最大継続、cache invalidation の成功率を数値契約として要求した（R-191.1〜R-191.3）[D]（traceability/R-requirements.md）。全 session 失効（R-112）は演習の対象でもある（R-275）[D]。
2. 旧提案は「deny cache は短くし、剥奪・tenant 停止・MFA 要求の変更は push invalidation 等で即時に無効化する」（CL-0169）、「剥奪が token 期限まで残らない」（CL-0279）と述べたが、数値も実測もなく、主張台帳で「要実測」とされた [D]（traceability/claims-ledger.md）。
3. 失効の対象は token だけではない。主体・所属の停止では web session、refresh token、access token、PAT、API 鍵、SSH 鍵、端末の資格情報、委任ジョブ、OAuth grant、エージェントへの委任をまとめて失効させる必要がある（02_requirements/identity-lifecycle.md INV-6）[D]。テナントの強制停止（T06）では API client の資格情報と委任ジョブも失効させる（02_requirements/tenant-lifecycle.md §3.8）[D]。
4. 経路も HTTP の要求・応答だけではない。WebSocket・SSE・gRPC stream の長時間接続（T-019）、ネイティブアプリ・CLI、AI エージェント、バッチ・非同期ジョブ（T-024、T-039）、token exchange で派生した token（T-038）、署名付き URL（G-136 (a)）に、剥奪が届く必要がある [D]（03_threat-model/threat-catalog.md）。
5. 本書は deliverables.md §5 の ADR-006 行が定める「剥奪・テナント停止・session 失効ごとの伝播方式、SSF/CAEP の送受信義務範囲」を決める [D]。伝播経路の詳細設計と遅延予算の表は DL-56（04_architecture/revocation-continuous-evaluation.md）、SSF の stream profile は DL-78、SET の payload profile は DL-79 に置く [D]。

### 1.2 制約（規範。強度は原文どおり）

| # | 規範 | 強度 | 出典 |
|---|---|---|---|
| N-1 | introspection エンドポイントは何らかの認可を要求しなければならない。RS は応答を cache してよいが、設計者は性能とセキュリティのトレードオフを検討しなければならない。cache の間は失効した token が使われ得る。応答の exp を超えて cache してはならない | MUST / MAY / MUST / MUST NOT | RFC 7662 [N][^1]（RS-04#67） |
| N-2 | refresh token の失効を支援しなければならず、access token の失効も支援すべきである。refresh token を失効させ access token の失効も支援する場合、同じ grant の access token も無効化すべきである。一部のサーバだけが失効を知る伝播遅延が起こり得る。self-contained な access token の即時失効には AS–RS 間の連携か、短命化で失効後の使用時間を制限する設計を挙げる（唯一の選択肢ではない） | MUST / SHOULD / SHOULD | RFC 7009 [N][^2]（RS-04#69） |
| N-3 | FAPI 2.0 の RS は access token の validity・integrity・expiration に加えて revocation status を検証しなければならない | shall | FAPI 2.0 Security Profile [N][^3]（RS-04#45） |
| N-4 | SSF はイベント処理の振る舞いを配備・連携ごとに「情報提供」から「強制執行」まで定めてよい。SET は typ: secevent+jwt で明示的に型付けしなければならない。配信は push（RFC 8935）と poll（RFC 8936） | 配備に委任 / MUST | SSF 1.0 [N][^4]（RS-04#77） |
| N-5 | CAEP 1.0 は session-revoked、token-claims-change、credential-change、assurance-level-change、device-compliance-change、session-established、session-presented、risk-level-change を定義する。CAEP のイベントを実装する場合は SSF に準拠すべきである | SHOULD | CAEP 1.0 [N][^5]（RS-04#78） |
| N-6 | RISC 1.0 は account-disabled、account-enabled、account-purged、credential-compromise、identifier-changed、identifier-recycled、recovery-activated などを定義する。RISC の sessions-revoked は非推奨で、新しい実装は CAEP の session-revoked を使わなければならない | MUST | RISC 1.0 [N][^6]（RS-04#78、RS-03#66） |
| N-7 | IdP から RP へ signal を送るには事前に trust agreement を結んでいなければならない。IdP は account の停止、侵害の疑い、属性変更、xAL の範囲の変更、認証器の更新を RP に送るべきである。侵害を確認した IdP は、その期間に使われた他の RP にも知らせなければならない。shared signaling の全用途を trust agreement に記載し、signal に対象アカウントの特定に必要な範囲を超える個人情報を含めてはならない。状態変化の通知を受けた RP は federated identifier の結合を外さなければならない | SHALL / SHOULD / SHALL / SHALL NOT / SHALL | SP 800-63C-4 [N][^7]（RS-03#72、RS-14#38、RS-14#61） |
| N-8 | token exchange は入力 token と出力 token の間に強い結び付きを作らず、失効の伝播は STS プロトコルの一般的性質ではない | 記述 | RFC 8693 [N][^8]（RS-06#44） |
| N-9 | Txn-Token は replay に耐性がなく短命でなければならない。提示 token が期限切れなら TTS は発行してはならないが、Txn-Token の寿命が提示 token の期限を超えることは TTS の方針で許される。置換で寿命を延ばすなら置換回数を制限すべきである | MUST / MUST NOT / MAY / SHOULD（Internet-Draft） | Transaction Tokens draft-11 [N][^9]（RS-06#36, #37, #40） |
| N-10 | workload の token の寿命は workload インスタンスの寿命を超えてはならず（発行基盤が寿命を判定できない場合を除く）、インスタンス停止時に発行元は資格情報を無効化しなければならない（残余期間が許容できるほど短い場合を除く） | MUST NOT / MUST（Internet-Draft） | Workload Identity Practices draft-07 [N][^10]（RS-06#26） |
| N-11 | AI エージェントの配備で、失効・格下げの通知を受けた受信者は、無効になった認可判定や token を使い続けてはならない | MUST NOT（Internet-Draft） | AIMS draft-00 [N][^11]（RS-06#73） |
| N-12 | OIDC Back-Channel Logout の Logout Token は sub か sid のどちらかを含まなければならない。RP は iss と sub・sid で対象 session を特定して状態を消す（方法は実装依存）。logout される session に offline_access なしで発行された refresh token は失効させるべきで、offline_access 付きのものは通常失効させるべきでない。Logout Token の明示的な型付け（logout+jwt）を推奨する。再送は回復可能な失敗が疑われる場合に限り、それ以外は再送すべきでない | MUST / SHOULD / SHOULD NOT / RECOMMENDED | OIDC Back-Channel Logout 1.0（errata set 1, Final）[N][^12]（research ノート外。起草者が 2026-10-15 に確認） |
| N-13 | WebSocket の handshake で server がクライアントを認証する方法は規定されない。特定サイトからの入力だけを処理するサーバーは Origin を検証すべきである | SHOULD | RFC 6455 [N][^13]（RS-17#51） |
| N-14 | 全 WebSocket 接続で WSS を使う（L1）。handshake で Origin を許可リストと照合する（L2）。標準の session 管理を使えない場合は専用 token を認証済み HTTPS session 経由で取得・検証する（L2） | 検証要件 | OWASP ASVS 5.0.0 V4.4 [N][^14]（RS-17#52） |

- **製品・公開事実の制約** [V]: ASP.NET Core SignalR は接続の間に利用者を自動で再検証せず、token が接続中に期限切れになっても既定では接続が続く [V][^15]（RS-17#53）。Amazon API Gateway の WebSocket API の接続時間の上限は 2 時間で引き上げできない [V][^16]（RS-17#55）。Amazon S3 の presigned URL は所持者にアクセスを与える bearer で、期限まで何度でも使え、CLI/SDK では最長 7 日に設定できる [V][^17]（RS-17#47、RS-08#81）。Google Cloud Storage の signed URL は期限が来るか署名鍵が rotate されるまで使える [V][^18]（RS-17#48）。
- **認可エンジンの鮮度窓** [V]: 調べた公式文書には剥奪から拒否までの上限を保証する記述がない [D]（RS-07 §2 第 2 項）。SpiceDB の既定 `minimize_latency` は単独で使うと new enemy 問題が起こり得る窓を作ると述べる [V][^19]（RS-07#26）。
- **障害時の失効** [V]: Google SRS は、失効確認を timeout で省く fail-open ではなく、既知良好な失効リストを各サーバへ配ってローカルに cache するほうが安全だと述べる [V][^20]（RS-09#21）。緊急 push は通常 push を最大速度にしたものにすべきとも述べる [V][^20]（RS-09#35）。AWS は分散 fallback が障害を悪化させることが多いとし、データの事前 push を代替策に挙げる [V][^21]（RS-09#14）。

### 1.3 前提（A-ID）

| A-ID | 値（基準） | 本書での使い方 |
|---|---|---|
| A-001 | 登録 100 万人 | 主体単位の失効記録の上限件数 [A-001] |
| A-005 / A-006 | 同時アクティブ session 11.1 万、有効 session 保持数（MAU×1.5） | 全 session 失効の対象件数、接続ゲートウェイの規模 [A-005, A-006] |
| A-007 | テナント 1 万 | テナント単位の失効境界の件数 [A-007] |
| A-013 | 外部 client 800・grant 3 万 | SSF 送信先の上限、一括失効の単位 [A-013] |
| A-014 | AI エージェント ID 1 万 | 委任 grant の件数 [A-014] |
| A-027 | access token 寿命 10 分（容量計算用の仮置き、決定値ではない） | bearer 残存寿命 Z の感度計算にだけ使う [A-027] |
| A-030 / A-044 | opaque 比率と introspection の cache miss、introspection 2,521/秒 | edge 照会の負荷。ADR-005 D1-7 で BFF 経路も opaque にした場合は 8,402/秒 [A-030, A-044] |
| A-033 / A-048 | 全 session 失効後の再ログイン集中 556/秒 | 段階的失効と再有効化 [A-033, A-048] |
| A-047 | relationship 書込 354＋278/秒 | 剥奪書込の上限側の桁（削除の比率は未定）[A-047] |
| A-052 / A-054 | 25 組織・60 チーム、プラットフォームチーム 24 FTE | 依存サービス側の義務の実装負担、要員 [A-052, A-054] |
| A-082 | 顧客 IdP 連携 2,000、SCIM 800 | SSF 受信 stream の上限件数 [A-082] |
| A-090 / A-092 | 判定系 99.95〜99.99%、管理系 99.5〜99.9% | 失効配布を判定系の可用性帯で動かし、管理系に依存させない [A-090, A-092] |
| A-093 | RPO 5 分 | 剥奪書込の消失（T-035）。BIA 決裁案 3 に従う [A-093] |
| A-028 | token exchange の下流 audience 数 6 | 案A の寿命短縮時の exchange 負荷（ADR-005 D3 の感度表）[A-028] |
| A-040 | edge API 呼出 16,804/秒 | 案B の照会量の基礎 [A-040] |
| A-110 | 独自セッションを持つ既存サービス 105 | 受信義務を負う依存サービスの下限の手掛かり [A-110] |
| A-112 | 自前の認可実装 240 サービス | allow cache 禁止の移行対象（K6-4）、案D の勝つ条件 [A-112] |

**新規仮定（前提台帳へ追加要）**

| ID | 内容 | 使い方 |
|---|---|---|
| NA-006-1 | 失効状態の更新率は「relationship 剥奪書込＋session 失効＋主体・テナント停止＋grant 失効」の和で、平常時は relationship 書込（A-047）の桁を超えないと仮置きする。全 session 失効（S4）時は個別 session を列挙せず範囲境界（D6-06）で表すため、配布件数は範囲の数で決まる | 失効配布の容量。値は H6-02 で実測 [D][A-047] |
| NA-006-2 | 依存サービスのうち、独自 session・長時間接続・非同期ジョブ・署名付き URL・認可結果の自前 cache のいずれかを持ち、受信義務（D6-21）の対象になるサービスの比率。A-110 の独自セッション 105 を下限の手掛かりとし、上限は TBD | 依存サービス側の実装負担、接続ゲートウェイの採用範囲。値は G1 の As-Is 棚卸し（DL-37 系）で確定（所有者: プラットフォームチーム長） |
| NA-006-3 | 本書の実装（失効配布、接続ゲートウェイ参照実装、SSF の送受信、canary 計測）に伴う要員の増分は、ADR-005 NA-08（状態ストア＋1〜2 FTE）とは別に＋2〜3 FTE の桁と仮置きする。根拠は部品数（配布 1 系統、ゲートウェイ 1、SSF 送受信 1、計測 1）×cell 共通の運用で、弱い | H6-10 で A-054 と比べる [D][A-054] |
| NA-006-4 | 外部連携アプリのうち、SSF の受信または Back-Channel Logout に対応できる比率 | 外部連携の受信義務の段階化（D6-23）。TBD（所有者: プロダクト責任者、G1 の連携事業者調査） |
| NA-006-5 | 案D（全依存サービスを SSF 受信者にする）の初期実装費は 1 サービスあたり 1〜4 人週の桁と仮置きする。根拠は SET 検証・stream 管理・冪等処理・試験の作業項目数からの推定で、実測値ではない | §3 の費用比較にだけ使う [D] |

### 1.4 関連 R/G

- 本書を対応成果物とする行: R-112、R-143、R-191（deliverables.md §5 の主な対応要求）、G-111（DL-12 05_adr/ADR-006 を名指し）、G-020 [D]。
- 内容上関係する行: R-044、R-052、R-086、R-087、R-111、R-113、R-144、R-145、R-146、R-168、R-171、R-238、R-282、R-189.5、R-189.6、R-191.1〜R-191.3、R-195.3、R-206、R-253、R-262、R-271、R-275、G-055、G-059、G-078、G-084、G-093、G-099、G-102、G-103、G-110、G-118、G-121、G-136、G-137、G-138 [D]。全件の閉じ方は末尾の対応表に示す。

### 1.5 関連研究（独立検証済みの調査ノート）

| ノート | 本書で使う項目 |
|---|---|
| RS-04 | #45（FAPI の失効状態検証）、#66（RFC 8693）、#67（RFC 7662）、#69（RFC 7009）、#77〜#80（SSF・CAEP・RISC、CAEP Interop、Token Status List）、§5.3 の 7（失効伝播の実測） |
| RS-03 | #66（RISC と非推奨の sessions-revoked）、#72（SP 800-63C-4 の shared signaling）、#79（SCIM 同期 40 分）、§5.1 の ADR-006 行 |
| RS-06 | #26（workload 資格情報の寿命）、#36・#37・#40（Txn-Token の寿命と置換）、#44（派生 token の失効非連動）、#73（AIMS の MUST NOT）、§5 の ADR-006 行 |
| RS-07 | #4・#5（new enemy と zookie）、#26・#27（SpiceDB の consistency と ZedToken）、§2 第 2 項（上限保証の不在）、§5.2 の 1（stale allow の実測） |
| RS-08 | #61（非同期経路の再認可）、#81（署名付き URL） |
| RS-09 | #14（分散 fallback）、#15（bimodal）、#21（失効リストの配布）、#35（緊急 push と rollback）、#36（短命資格情報の時限爆弾と epoch） |
| RS-12 | #25（Okta の管理者 session のネットワーク束縛）、#37・#38（Salesloft Drift の token 一括失効） |
| RS-14 | #37（IPSIE AL SCIM 草案の 5 分 SHOULD と全手段失効の MUST）、#38・#61（SP 800-63C-4）、#40（SSCF）、#62（SSF の complex subject の tenant） |
| RS-17 | #47〜#50（署名付き URL）、#51〜#56（ストリーム接続の再認可） |

### 1.6 脅威と攻撃者

| 脅威（T-ID） | 主な攻撃者（ATK-ID） | 本書の統制 |
|---|---|---|
| T-019 長時間接続の失効未反映 | ATK-05, ATK-03 | D6-14 |
| T-024 enqueue 時判断だけによる実行 | ATK-03, ATK-06 | D6-17 |
| T-032 stale allow | ATK-03, ATK-12 | D6-09, D6-10, D6-30 |
| T-035 RPO 内の剥奪の消失 | ATK-12 | D6-07 |
| T-036 テナント移動での剥奪の復活 | ATK-19 | D6-05（単調性） |
| T-038 派生 token の失効非連動 | ATK-05, ATK-03 | D6-16 |
| T-039 長時間ジョブの委任 | ATK-03, ATK-06 | D6-17 |
| T-044 緊急失効の遅れ | ATK-01, ATK-08 | D6-20 |
| T-059 deprovision の遅延・上書き | ATK-03 | D6-12, D6-22 |
| T-069 連携事業者に保存された token の大量窃取 | ATK-15 | D6-19 |
| T-011 / T-014 session theft・token replay | ATK-14, ATK-05 | D6-18, D6-13 |

- ATK-12（リージョン障害）は非敵対であり、失効配布の停止と剥奪書込の消失を通じて stale allow を生む [D]（03_threat-model/attacker-model.md）。
- 本書が対象外とするもの: 検知までの時間（MTTD、R-195.1）は本書の R に含めない [D]。R は「剥奪を決めて正本に書いた時点」からの時間であり、侵害に気付くまでの時間は ADR-019・DL-24 で扱う [D]。

---

## 2. 決定

本節はすべて決裁前の提案である [D]。経営・事業・リスク受容の判断が要る点は §2.11 に決裁案としてまとめる [D]。

### 2.1 失効の区分と正本

- **D6-01** 失効を次の 7 区分 c で扱い、区分ごとに正本・強制点・SLO を定める [D]。

| c | 区分 | 例 | 正本 | R-191.1 の区分 |
|---|---|---|---|---|
| RC-1 | 権限剥奪 | relationship・role の削除、所属変更による縮小、共有の解除 | relationship store（ADR-010） | 通常（privileged 権限の剥奪は高権限） |
| RC-2 | 主体の停止・削除 | 利用者・service account・workload・AI エージェントの停止（INV-6） | 主体台帳（ADR-001 D3）・ID ライフサイクル | 通常（管理者・特権運用者は高権限） |
| RC-3 | テナント停止 | T05 一時停止、T06 強制停止 | テナント状態（tenant-lifecycle） | tenant 停止 |
| RC-4 | session 失効 | 個別 sid、利用者の全 session、範囲指定の全 session（S4） | AS の session store | 通常（管理者 session は高権限） |
| RC-5 | grant・client の失効 | 第三者 grant、委任 grant（エージェント・ジョブ）、client の無効化 | grant 台帳（ADR-005 D7-3） | 通常（テナント管理者同意の grant は高権限） |
| RC-6 | 資格情報侵害 | password・認証器・refresh token・PAT・API 鍵・client 秘密の侵害 | AS・資格情報台帳 | 高権限（侵害対応として扱う） |
| RC-7 | 鍵失効 | 署名鍵 kid の緊急失効 | 鍵台帳（ADR-007） | 高権限（R-189.5 の緊急失効完了時間） |

- **D6-02** 権限を減らす遷移は増やす遷移と競合したときに優先する（identity-lifecycle INV-7）。失効の記録を先に書き、伝播の一部が失敗しても失効は維持して再試行と警報を続ける（同 §2.4、S-07）[D]。

### 2.2 伝播の原則（中央強制と失効状態の配布）

- **D6-03（中央強制）** 失効の効力は次の強制点で生じさせる。依存サービスがイベントを受信したかどうかに効力を依存させない [D]。tenant-lifecycle の結論 7（停止の効力は事象の受信に依存させず、token 検証と PDP のテナント状態ガードで中央強制する）を、全区分に広げたものである [D]。

| 強制点 | 何を拒否するか | 根拠となる既決定 |
|---|---|---|
| E1 edge（cell ごとの gateway 型 PEP） | 外部 opaque token・PAT・API 鍵の要求を、状態ストアの照会で拒否する（RC-2〜RC-6） | ADR-005 D1-2・D1-5 |
| E2 PDP facade の G 段 | 主体の停止、テナントの停止、緊急 freeze を判定で拒否する（RC-2, RC-3）。relationship の剥奪は fresh 判定・整合性トークン・剥奪フェンスで反映する（RC-1） | ADR-011 D1-2 規則 2・3・6、ADR-010 D-13・D-18 |
| E3 PEP SDK | 内部 JWT の検証で失効 kid を拒否する（RC-7）。privileged 以上では jti・sid を状態ストアと毎要求照合する（RC-4〜RC-6） | ADR-007 D7-36、ADR-005 D1-6 |
| E4 接続ゲートウェイ | 長時間接続を、失効状態に該当した時点で切断する | 本書 D6-14 |
| E5 STS・TTS | 失効した親 token・session・grant からの exchange と Txn-Token の発行・置換を拒否する | 本書 D6-16、ADR-005 D1-4・D9-3 |
| E6 AS | 失効した session・grant・資格情報からの refresh・新規発行を拒否する | ADR-005 D4、RFC 7009 |

- **D6-04（失効状態の配布）** 各 cell に「失効状態」を置き、AS・主体台帳・テナント管理・鍵台帳の失効を、cell 内の強制点（E1〜E6）へ push で配る [D]。強制点は配られた失効状態を局所で評価し、評価のために正本や AS 本体へ同期照会しない [D]。SRS が timeout での fail-open の代わりに挙げる既知良好な失効リストの配布と局所 cache [V][^20]（RS-09#21）、AWS のデータ事前 push [V][^21]（RS-09#14）に合わせた [D]。cell 間では失効状態を同期呼出しで参照せず、配布された署名付きデータで解決する（ADR-013 D13-13）[D]。
- **D6-05（単調性と版の分離）** 失効状態は、cell ごとに単調増加する失効 epoch を持つ署名付きの配布物とする [D]。強制点は自分の持つ epoch より古い配布物を受け付けない [D]。失効状態は policy・model の版と独立させ、policy の rollback、テナントの cell 間移動の中止、障害からの復元で失効が戻らないようにする（ADR-013 D13-35、ADR-010 D-20、tenant-lifecycle INV-5）[D]。rollback は脆弱性を再導入し得る [V][^20]（RS-09#35）。ADR-013 の「失効 epoch」は本書のこの値を指す（ADR-013 D13-26 の用語の対応、ADR-010 §2.12 後の注記）[D]。失効 epoch は ADR-010 の「テナント剥奪フェンス」（relationship store のスナップショットの下限）とは別の検査であり、read-sensitive の known-good は両方の条件を満たす必要がある（reconciliation-notes C-35）[D]。
- **D6-06（範囲境界による表現）** 失効状態は個々の token を列挙せず、「範囲 × 失効時刻」の境界で表す [D]。範囲は主体（sub）、session（sid）、grant 参照、client、テナント（tid）、cell の 6 種とし、強制点は token の発行時刻・session の確立時刻が境界より前なら拒否する [D]。これにより、全 session 失効（S4）や T06 でも配布件数は範囲の数で決まる [D]。上限は、主体（人間 100 万＋AI エージェント 1 万。workload の主体数は前提台帳にない）＋テナント 1 万＋grant 3 万＋client 800 の桁に、個別 sid の境界（最大で有効 session 保持数 86.5 万の桁。session の満了で消せる）を加えた桁になる [D][A-001, A-006, A-007, A-013, A-014]。token 単位の失効（jti）は privileged の stateful 照合（E3）と外部 opaque の状態ストア（E1）にだけ持つ [D]。
- **D6-07（失効の耐久性）** 剥奪・失効の書込は、BIA 決裁案 3 の選択に従って復元点に含める [D]。本書は BIA の推奨（A: 最大許容データ損失 0）を支持し、relationship の剥奪書込を同期レプリカで RPO 0 にする構成は ADR-010 H-12 の実測で採否を決める [D][A-093]。失われた剥奪は復旧後に権限を復活させるからである（T-035、ADR-010 D-21）[D]。
- **D6-08（配布の静的安定性）** 失効状態の配布は判定系の可用性帯（A-090）で動かし、control plane（管理系、A-092）の停止とも緊急 freeze とも独立させる（ADR-013 D13-35、stop-authority.md の S2・P4）[D][A-090, A-092]。各強制点は配布の heartbeat から失効状態の齢を測り、齢が上限 M_rev を超えたら、read-sensitive 以上の要求を拒否する（ADR-013 D13-25 の「失効状態が最大齢を超えた」列）[D]。緊急の失効は通常の配布系を最大速度で使い、別系統を持たない [V][^20]（RS-09#35）[D]。

### 2.3 伝播方式の採否（短命 token、introspection、RFC 7009、SSF/CAEP/RISC、consistency token、push invalidation、Token Status List）

- **D6-09** 各方式の採否と役割を次のとおりにする [D]。

| 方式 | 採否 | 本書での役割 | 根拠 |
|---|---|---|---|
| 短命 token | 採用（上限を与える手段として） | 再確認されない経路の残存時間 Z の上限。単独では剥奪の速さを保証しない（ADR-005 U2） | RFC 7009 の短命化 [N][^2]（RS-04#69） |
| introspection（RFC 7662） | 採用（外部 opaque） | E1 が状態ストアに照会する。cache は C_edge(t) かつ応答の exp 以下 | RFC 7662 [N][^1]（RS-04#67）、ADR-005 D1-2 |
| RFC 7009 revocation endpoint | 採用 | client（ネイティブ・CLI・BFF・第三者）が logout・アンインストール時に refresh token と access token を失効させる経路。refresh token の失効時は同じ grant の access token も無効化する（SHOULD を採用） | RFC 7009 [N][^2]（RS-04#69） |
| SSF/CAEP/RISC | 採用（組織の境界だけ） | 顧客 IdP からの受信と、trust agreement のある外部受信者への送信（§2.6） | SSF・CAEP・RISC 1.0 Final [N][^4][^5][^6]（RS-04#77, #78） |
| OIDC Back-Channel Logout | 採用（OIDC RP への session 終了通知） | SSF を受信しない OIDC RP への session 失効の通知（§2.6 D6-24） | OIDC Back-Channel Logout 1.0 [N][^12] |
| relationship 変更の consistency token | 採用（ADR-010・ADR-011 に従う） | RC-1 の反映。write 以上は fresh、read-sensitive は max(内容トークン, 剥奪フェンス)（ADR-010 D-13・D-18） | Zanzibar の zookie [V][^22]（RS-07#5）、SpiceDB ZedToken [V][^19]（RS-07#27） |
| push invalidation | 採用（基盤所有の強制点へ。依存サービスの任意の cache へは配らない） | D6-04 の失効状態配布。依存サービスに allow の cache を持たせない（D6-10）ので、サービスごとの cache 無効化を前提にしない | RS-09#21 [V][^20]、ADR-010 D-18（フェンスを PEP へ push しない判断） |
| Token Status List | 採らない（RFC 化まで候補） | 内部 JWT の失効表現の将来候補。`status` claim は ADR-021 で予約済み | draft-ietf-oauth-status-list-21、RFC Ed Queue、RFC 番号は未付与（2026-10-15 確認）[N][^23][^24]（RS-04#80） |
| CAEP Interoperability Profile | 依存しない | Final になるまで準拠表明は preview（ADR-022 D-2） | Implementer's Draft 1、Final 化のレビューやり直し [N][^25]（RS-04#79） |

- **D6-10（allow の cache の上限）** 依存サービスは、認可の allow を PEP SDK の外で cache してはならない [D]。PEP SDK の判定 cache は read-sensitive に限り、最大齢を REQ-03 §3.1・ADR-010 の上限 B 以内とし、局所の失効 epoch が判定時の epoch より進んだら破棄する [D]。この cache の再利用条件は ADR-013 D13-24 の known-good の 4 条件（有効期限 ≤ B_rs、policy の最低許容版、失効 epoch、局所の失効状態で否定されていないこと）と同じにし、平常時と PDP 不達時で別の条件を持たない [D]。B と B_rs は別の決裁値（ADR-010 決裁案 5、ADR-013 KD13-6）なので、SDK は小さい方を最大齢に使う [D]。write・privileged・break-glass では判定 cache を使わない（REQ-03 §3.1「allow の再利用」行）[D]。SDK の外の cache は CI の静的検査と coverage 検査（ADR-012）の対象にし、違反を KRI に載せる [D]。これは ADR-010 D-19 が本書に委ねた「PEP decision cache の最大齢」の決定である [D]。
- **D6-11（操作階層ごとの失効状態確認）** REQ-03 §3.1 の「token の失効状態確認」行を次の方式で満たす [D]。

| 階層 | 方式 | 再確認されない残存 Z |
|---|---|---|
| public | 不要 | — |
| read-sensitive | E1 の照会（cache C_edge(rs)）、または内部 JWT の寿命内の遅延を許容。PDP の bounded 判定（ADR-010 D-13）と SDK 判定 cache（≤ B、D6-10） | 内部 hop は L_int、判定 cache は B |
| write | E1 で外部 token を毎要求照会（cache C_edge(w)）。PDP は fresh＋G 段。内部 hop は要求ごとの Txn-Token（ADR-005 D9-3） | Txn-Token の寿命 |
| privileged | write に加え、内部 RS が jti・sid を状態ストアと毎要求照合（ADR-005 D1-6）。判定 cache なし | 0（配布遅延 Δ だけ） |
| break-glass | 基盤の PDP に依存しない別経路（ADR-029）。発動窓の満了で自動失効 | 発動窓 |

  - FAPI 範囲の RS は失効状態を検証しなければならない（shall）[N][^3]（RS-04#45）。本表では FAPI 範囲を privileged と同じ扱いにする（ADR-005 D1-6 と同じ）[D]。

### 2.4 区分ごとの伝播経路

- **D6-12（RC-1 権限剥奪・RC-2 主体停止・RC-3 テナント停止）** 剥奪は facade 経由で書き、E2 が次の要求から反映する（ADR-010 D-13・D-18）[D]。主体とテナントの停止は、G 段の規則 2・3（ADR-011 D1-2）が参照する状態として失効状態に載せ、E1 にも同じ境界（sub・tid）を配る [D]。主体の停止は INV-6 の全手段（session、refresh token、PAT、API 鍵、SSH 鍵、端末資格情報、委任ジョブ、grant、エージェントへの委任）を範囲境界で同時に失効させる [D]。IPSIE AL SCIM 草案は無効化時の全アクセス手段の失効を MUST とし、受信後 5 分以内の失効を SHOULD とする [N][^26]（RS-14#37）。同草案は Draft 00 なので、失効対象の一覧の参照に使い、数値契約の根拠にはしない [D]。SSCF は session の programmatic かつ real-time の失効と、session 失効を伴う一時停止を求める（must）[N][^27]（RS-14#40）。SSCF は拘束力のない業界の枠組みで認証制度も整っていない（standards-status.md SS-I13）ので、顧客が求める機能の比較軸として使う [D]。
- **D6-13（RC-4 session 失効）** session 失効は sid の範囲境界として配り、E1（introspection 応答の sid）、E3（privileged の sid 照合）、E4（接続の sid）、E5（派生 token の sid）、E6（refresh 拒否）で効かせる [D]。全 session 失効（S4）は cell 順・テナント順に段階化し、再ログイン集中（556/秒）を AS の admission control の範囲に収める（ADR-013 D13-35、stop-authority.md §4.4）[D][A-033, A-048]。管理者・特権 session はネットワークと端末に束縛し、変化時に再認証させる（CB-REQ-11）[D]。Okta は管理者 session token をネットワーク位置に束縛し、ネットワークが変わると再認証を求める是正をとった [I][^28]（RS-12#25）。
- **D6-14（長時間接続: WebSocket・SSE・gRPC stream・長時間 download）** 長時間接続は「接続時の認可」と「接続中の再確認」を分け、接続中は次の 3 つを組み合わせる [D]（RS-17#56 の設計推論を採る）。
  1. 最大存続時間: 接続は token の exp と L_conn(t) の早い方で切断し、再接続で再認証・再認可させる [D]。ASP.NET Core SignalR は既定で接続中に利用者を再検証しない [V][^15]（RS-17#53）ので、SDK の既定で期限切断を有効にする [D]。
  2. 失効による切断: 接続を終端する要素（基盤の接続ゲートウェイ E4 か、終端する依存サービスの SDK）は失効状態を購読し、sid・sub・tid・grant が境界に該当したら Δ_conn 以内に切断する [D]。
  3. メッセージ単位の再認可: write 以上のメッセージ・購読開始は PDP の fresh 判定を通す [D]。read-sensitive の配信は再確認間隔 I_conn(rs) ごとに PDP で再判定する [D]。
  - ブラウザからの接続は BFF 経由にし、token を URL の query に載せない [D]。ブラウザの WebSocket API と SSE API は Authorization ヘッダを設定できず、query string は多くのサーバーで記録される [V][^15]（RS-17#54）。
  - handshake では WSS と Origin の許可リスト照合を必須にする [N][^13][^14]（RS-17#51, #52）。
  - 製品の上限（API Gateway の 2 時間）は剥奪の上限として当てにしない [V][^16][D]（RS-17#55）。
- **D6-15（署名付き URL・export）** 署名付き URL は発行後に個別失効できない bearer として扱い、発行直前に PEP で認可し、発行を監査に記録する [D]（RS-17#50）。寿命の上限は、その資源の操作階層の R(t) から Δ と C を引いた残り以下にする（G-136 (a)）[D]。この上限を満たせない要配慮データは BFF・proxy 経由の配信にする [D]。S3 の presigned URL は生成に使った一時資格情報が失効すると失効する [V][^17]（RS-17#47）ので、可能な場合は URL を短命の生成用資格情報で作り、主体・テナントの停止でその資格情報を失効させる [D]。
- **D6-16（派生 token: token exchange・Txn-Token）** 派生 token の寿命は親の残り寿命と L_der(t) の小さい方以下にする [D]。STS・TTS（E5）は発行・置換の前に親の jti・sid・grant 参照を失効状態と照合し、失効していれば拒否する [D]。派生 token には親の sid・grant 参照を引き継ぎ（ADR-005 D9-2 の L2）、範囲境界で一括拒否できるようにする [D]。RFC 8693 は失効の伝播を一般的性質としない [N][^8]（RS-06#44）ので、この連動は自社の設計であり実測で確かめる（H6-05）[D]。Txn-Token は提示 token の期限を超える寿命を方針で許され得る [N][^9]（RS-06#37）が、本基盤では超えさせない [D]。置換による寿命延長は回数の上限を設ける（SHOULD を採用）[N][^9]（RS-06#40）[D]。
- **D6-17（非同期・バッチ・長時間ジョブ）** ジョブは enqueue 時に起点主体・テナント・整合性トークンを付け、実行時に起点主体で再認可する（write 以上は fresh）[D]（RS-08#61）。実行が R(t) より長いジョブは、段ごとまたは I_job(t) ごとに再認可し、起点主体・委任 grant・テナントのいずれかが失効したら以降の段を止める [D]（T-039）。ジョブ実行基盤はライフサイクル事象で待ち行列中のジョブを取り消すが、効力は E2 の拒否に置く [D]。委任の主体モデルと再認可の詳細は ADR-026（未起草）で決め、本書はその上限 I_job(t) ≤ R(t) を制約として渡す [D]。
- **D6-18（ネイティブアプリ・CLI）** ネイティブアプリ・CLI に渡す access token・refresh token は opaque で、E1 と E6 が拒否する（ADR-005 D1-1・D4）[D]。PAT・API 鍵も opaque として状態ストアに置き、E1 が毎要求照会する [D]。SDK は logout・アカウント切替・アンインストール時に RFC 7009 で refresh token を失効させることを既定にする [N][^2][D]。端末内に長く残る refresh token は DPoP 鍵に束縛され（ADR-005 D4）、失効後は refresh を AS が拒否する [D]。device authorization grant は業務 API で既定無効のままにする（ADR-005 D7-7）[D]。
- **D6-19（RC-5 grant・client の失効と第三者連携）** grant ID・client_id・publisher・テナント・scope の各単位で一括失効できるようにし（ADR-005 D7-6）、範囲境界として配る [D]。外部 token は opaque なので、外部連携アプリの API 利用は E1 で止まる [D]。Salesloft Drift の事案では、連携アプリの全 access token と refresh token の失効が是正に含まれ、GTIG は Drift に保存・接続された全 token を侵害済みとして扱うよう勧告した [I][^29]（RS-12#37, #38）。
- **D6-20（RC-7 鍵失効）** 鍵の緊急失効は ADR-007 D7-37 の手順に従い、失効 kid リストを本書の失効状態配布（D6-04）に載せて JWKS 取得とは独立に E3 へ配る [D]。SDK は JWKS からの「欠落」（last known good を上限時間まで継続）と失効リストによる「失効」（即時拒否）を区別する（ADR-007 D7-36）[D]。その kid で署名された token に由来する session は cell 範囲の境界で失効させる [D]。外部 RP の JWKS cache は本基盤から制御できない（ADR-007 RR7-02）。外部に渡す access token は opaque なので（ADR-005 D1-1）、外部 RP が鍵を検証するのは ID Token と Logout Token・SET に限られる [D]。外部 RP への鍵失効の通知は SSF の標準イベントにないため、連携契約の通知経路（ADR-022・G-106）で行う [D]。
- **D6-21（RC-6 資格情報侵害）** 侵害が確定または疑われた資格情報について、その資格情報で確立した session、束縛した refresh token、発行した PAT・API 鍵を範囲境界で失効させ、再認証と認証器の健全性確認を求める（identity-lifecycle P-06 の SEC 解除条件）[D]。client 秘密の侵害は client の無効化と grant の一括失効（D6-19）にする [D]。侵害を確認した場合は、trust agreement に従いその期間に使われた RP に知らせる（SP 800-63C-4 の SHALL）[N][^7]（RS-03#72）[D]。

### 2.5 AI エージェント

- **D6-22** AI エージェント（PC-16）への失効の伝播は、ADR-017（未起草）が独立主体か委任＋act のどちらを採っても、次を満たすことを制約とする [D]。
  1. エージェントの tool・API 呼出しは必ず E1 または E3＋E2 を通り、受け取った token を tool や下流へ素通しさせない（T-073）[D]。
  2. 利用者からエージェントへの委任は grant 参照を持つ委任 grant とし、RC-5 で失効させる [D]。
  3. 委任呼出しでは、委任元（sub）とエージェント（act）の両方の停止を G 段で確認する [D]。ADR-011 D1-2 規則 2「主体の停止・無効化」を act 連鎖の全主体に適用する解釈を求める（§2.12 L6-4）[D]。
  4. エージェントが長時間動く場合は、長時間接続（D6-14）とジョブ（D6-17）の規則を適用し、write 以上の tool 呼出しは呼出しごとに fresh 判定とする [D]。
  5. エージェントが受け取る派生 token は D6-16 に従う [D]。AIMS 草案は失効・格下げの通知を受けた受信者に無効な判定・token の使用継続を禁じる（MUST NOT）[N][^11]（RS-06#73）。草案であるため規範根拠にはせず、エージェント実行基盤（SDK）が失効状態を購読して進行中の計画を止める設計の参照にとどめる [D]。

### 2.6 送受信義務の範囲

- **D6-23（基盤が SSF の受信者になる範囲）** 顧客 IdP・外部 IdP からの SSF stream を受信する [D]。push（RFC 8935）と poll（RFC 8936）の両方を受け付ける [N][^4]（RS-04#77）[D]。受信するイベントと処理は次のとおりとし、受信から失効状態への書込（D_in）を基盤の SLO に含める [D]。

| 受信イベント | 処理 | 区分 |
|---|---|---|
| CAEP session-revoked | 対象 sid・sub の session を失効（RISC sessions-revoked は互換のためだけに同じ処理で受ける）[N][^6]（RS-03#66） | RC-4 |
| CAEP credential-change | 当該認証器・資格情報に束縛した session と refresh token を失効し再認証を求める | RC-6 |
| CAEP assurance-level-change | 低下した場合、必要 AAL を満たさない session を step-up 待ちにする（G 段規則 4） | RC-4 |
| CAEP token-claims-change | 該当主体の introspection 結果と内部 token を再発行させる（範囲境界） | RC-1 |
| RISC account-disabled | 当該テナント文脈の所属を停止（identity-lifecycle M-03）し、INV-6 の全手段を失効 | RC-2 |
| RISC credential-compromise | D6-21 | RC-6 |
| RISC identifier-recycled | その識別子に結び付く回復先・通知先・未受諾の招待を凍結（identity-lifecycle §9、ADR-021 D21-14c）| — |

  - 受信イベントの処理は、SSF が配備ごとに定めてよいとする「強制執行」として定義する [N][^4][D]（RS-04#77）。受信した SET は typ: secevent+jwt と送信者の iss・鍵の結合を検証し、検証できない SET は処理しない [N][^4][D]。
  - 顧客 IdP がテナントの他の所属に影響しないよう、受信イベントの効果はその IdP に結合したテナント文脈に限る（identity-lifecycle M-03）[D]。
  - SSF を送れない顧客 IdP では SCIM の無効化を待つ。Entra の非ギャラリー SCIM アプリの同期は約 40 分ごとである [V][^30]（RS-03#79）。この上流遅延 U は顧客側の責任分界として DL-26 に記し、基盤の R とは分けて計上する [D]。
- **D6-24（基盤が送信者になる範囲）** 次の受信者に限り送信する [D]。
  1. trust agreement で合意した顧客の受信者（顧客の SIEM・自社アプリ）[D]。SP 800-63C-4 は signal の送信に事前の trust agreement を求め（SHALL）、全用途の記載（SHALL）と個人情報の最小化（SHALL NOT）を求める [N][^7]（RS-03#72、RS-14#61）。
  2. SSF stream を登録した外部連携アプリ（PC-15）[D]。
  3. 本基盤を OP とする OIDC RP のうち SSF を受信しないもの: Back-Channel Logout で session の終了を通知する [N][^12][D]。
  - 送るイベントは ADR-022 D-2 の v1 範囲（CAEP session-revoked・credential-change・token-claims-change・assurance-level-change、RISC account-disabled・credential-compromise・identifier-recycled）とする [D]。主体は SSF の complex subject で表し、テナントを主体に含められる [N][^4]（RS-14#62）。識別子は ADR-021 の sub_id（RFC 9493）表現に従う [D]。
  - 送信は best-effort ではなく、stream ごとに送信済み・確認済みの記録を持つ [D]。ただし送信の成否は基盤の強制（D6-03）に影響させない [D]。Back-Channel Logout は回復可能な失敗が疑われる場合だけ再送し、それ以外は再送しない（SHOULD NOT）[N][^12]。到達を前提にしない [D]。
- **D6-25（内部の依存サービスの受信義務）** 内部の依存サービスは SSF の受信者にしない [D]。依存サービスが次の派生状態を持つ場合に限り、ライフサイクル事象（ADR-022 のイベント配送契約、G-137）または失効状態の購読（SDK）で受信する義務を負う [D][NA-006-2]。
  - 独自 session（A-110 の独自セッション 105 サービスを含む）: 受信から D_svc(t) 以内に session を無効化する [D][A-110]。
  - 長時間接続: D6-14 の Δ_conn 以内に切断する [D]。
  - 非同期ジョブ: 待ち行列中のジョブを取り消す（効力は D6-17 の実行時再認可）[D]。
  - 署名付き URL・共有リンク: 発行済みのものの残存を D6-15 の寿命上限で抑え、生成用資格情報を失効させる [D]。
  - データの複製・索引（PEP 外データ、ADR-012・ADR-025）: 剥奪を索引に反映するまでの時間を DL-57 で定める [D]。
  - 上のいずれも持たないサービスは受信義務を負わない [D]。効力は E1〜E3 で生じるからである [D]。
  - 受信の遅延・失敗は効力に影響しないが、受信義務を負うサービスの未処理件数と滞留時間を K-17 (b) で計測する [D]（01_governance/kri.md）。
- **D6-26（外部連携アプリの受信義務）** 外部連携アプリの受信は契約上の義務として段階化する [D][NA-006-4]。
  - テナント管理者の同意を要する scope（privileged 扱い、ADR-005 D7-2）を持つアプリ、または利用者の session を自ら保持するアプリ: SSF の session-revoked・account-disabled か Back-Channel Logout の受信を連携契約（11_contracts の第三者向け規約）の条件にする [D]。
  - それ以外のアプリ: 受信は任意とする [D]。API 利用は E1 で止まるので、受信しない場合に残るのはアプリ内の session とアプリが保存したデータであり、その扱いは連携契約の保管・削除条項で扱う [D]。
  - SSF は処理の義務を配備ごとに定めてよいとするので、受信側が何秒以内に何をするかは本書と DL-78・DL-79 の受信プロファイルで定める [N][^4][D]（RS-04#77）。
- **D6-27（顧客管理者向けの失効 API）** テナント管理者が利用者単位・テナント単位の session と資格情報を programmatic に失効させる API を提供する（customer-admin-responsibility の IAM-SaaS-07・-15）[D]。非人間主体の失効も同じ API で行う [D]。反映時間は R(t, c) と同じ数値契約に載せる [D]。

### 2.7 剥奪 SLO の分解方法

- **D6-28（定義）** 剥奪反映時間 R(t, c) を「区分 c の失効が正本に確定書込された時刻 T0 から、その主体・範囲に対する操作階層 t の要求が全経路 p で拒否されるまでの最大時間」と定義する [D]。経路 p は「外部 HTTP（edge）」「内部 hop」「長時間接続」「非同期ジョブ」「派生 token」「署名付き URL」「PDP 判定（relationship）」「外部連携アプリ」の 8 種を初期値とする [D]。
- **D6-29（分解式）** 次の式で各項を構成要素の遅延予算にする [D]。

  R(t, c) = D_w(c) ＋ max_p [ Δ_p ＋ C_p(t) ＋ Z_p(t) ]

| 記号 | 意味 | 所有する ADR・文書 | 実測 |
|---|---|---|---|
| D_w(c) | 失効の決定から正本への確定書込まで（SSF 受信なら受信から書込まで＝D_in） | 本書、ADR-010（RC-1） | H6-01 |
| Δ_p | 失効状態が経路 p の強制点に届くまでの配布遅延（ADR-005 の Δprop） | 本書 D6-04 | H6-02 |
| C_p(t) | 強制点の cache の最大齢。edge の introspection cache C_edge(t)、SDK 判定 cache（≤ B）、エンジンの鮮度窓（SpiceDB の量子化、OpenFGA の窓 W またはキャッシュ TTL）、剥奪フェンスの反映遅延 | ADR-005 D1-2、ADR-010 D-13・D-18・D-19、本書 D6-10 | H6-03（ADR-010 H-02・H-05 と共有） |
| Z_p(t) | 毎要求確認なら 0、周期確認なら再確認間隔 I_p(t)、確認しない bearer なら残存寿命 L_p(t)（内部 JWT、派生 token、Txn-Token、署名付き URL、長時間接続の最大存続時間） | ADR-005 D3（U2）、本書 D6-14〜D6-17 | H6-04〜H6-07 |

  - 確認しない bearer の項は、ADR-005 の U2「L＋C(t)＋Δprop ≤ R(t)」と同じ形である [D]。失効直前に発行された token は、発行時の照会が Δ＋C だけ古い状態に基づき得るので、残存は Δ＋C＋L になる [D]。
  - 端から端の値（G-111）は、上流の遅延 U(c)（顧客 IdP の検知から送信まで、SCIM の同期間隔）を加えた R_e2e(t, c) = U(c) ＋ R(t, c) で測り、U と R を分けて報告する [D]。基盤が SLO として約束するのは R だけで、U は責任分界（DL-26）で顧客の項目にする [D]。
  - 外部連携アプリ内の session（経路「外部連携アプリ」）は、送信までの時間だけを基盤の R に含め、受信後の処理時間は契約上の義務（D6-26）として別に計る [D]。
- **D6-30（予算の割り付けの規則）** 値は TBD のまま、割り付けの規則を次のとおり決める [D]。
  1. R の値は「操作階層 t × R-191.1 の 3 区分（通常・高権限・tenant 停止）」の表で決める [D]。同じ区分では R(privileged) ≤ R(write) ≤ R(read-sensitive) とする [D]。T06（強制停止）と RC-6・RC-7 は侵害対応なので、高権限の値以下にする [D]。
  2. 各経路の Δ＋C＋Z が R − D_w を超えないように、C と Z の上限を逆算する [D]。逆算した L_p が ADR-005 D3 の他の上限（U1・U3〜U5）や下限 Lmin と衝突した場合、寿命を延ばさず、その経路の確認方式を一段強くする（bearer を周期確認に、周期確認を毎要求確認に）[D]。ADR-005 D3 の「下限が上限を上回っても寿命は延ばさない」に合わせた [D]。
  3. 予算は p99 と最大の両方で定める [D]。stale allow の最大継続（R-191.2）は最大値、cache invalidation の成功率（R-191.3）は D6-10 の破棄と D6-14 の切断が予算内に完了した比率として測る [D]。
  4. 感度の例（決定値ではない）: 内部 JWT の寿命を A-027 の 10 分とし、read-sensitive の内部 hop を再確認しない場合、その経路だけで R(rs) は 10 分＋Δ＋C を下回れない [D][A-027]。write 以上を edge の毎要求照会と G 段で確認すれば、外部経路の R(w) は D_w＋Δ＋C_edge(w) で決まり、寿命に縛られない [D]。
- **D6-31（数値の決め方）** 値は R(t, c)・M_rev・L_conn(t)・I_conn(rs)・I_job(t)・L_der(t)・署名付き URL の寿命上限・D_svc(t)・Δ_conn のすべてを TBD とする [D]。所有者は CTO＋CISO、R の決裁は事業責任者（BIA）を含む、期限は G4、決め方は BIA の R(t)・E(t)（ADR-005 K-2、threat-catalog TD-3 の選択肢 B）と H6-01〜H6-08 の実測、DL-20 での決裁とする [D]。IPSIE AL SCIM 草案の 5 分（RS-14#37）は候補値の比較対象に使うが、Draft 00 なので根拠にしない [D]。

### 2.8 監査と計測

- **D6-32** 失効ごとに revocation_id、区分 c、範囲、T0、配布した失効 epoch を記録し、強制点の判定記録には評価時の失効 epoch を記録する（ADR-013 D13-26 の判定記録の項目）[D]。監査イベントの欄は reconciliation-notes §3.2 の 8 欄に従い、revocation_id と epoch は ADR-014・DL-77 で欄を追加する [D]。
- **D6-33** 合成の剥奪事象（canary）を定期に各 cell へ投入し、全経路の拒否時刻を測って K-17 (a) を算出する [D]（01_governance/kri.md K-17）。本番の剥奪と判定記録を突合し、失効 epoch より後に allow された要求を stale allow として数える（T-032 の検知）[D]。

### 2.9 依存関係の上限（障害時の扱い）

- **D6-34** 失効状態の正本（AS・主体台帳・テナント管理）が止まって新しい失効を書けない場合、侵害対応に要る停止は stop-authority.md の遮断系（S4・S5 と break-glass 経路）で行う（BIA の E03 の前提）[D]。失効状態の配布だけが止まった場合は、D6-08 の M_rev を過ぎた時点で read-sensitive 以上を拒否する [D]。状態ストア・配布系の障害時に AS 本体や正本へ迂回しない（ADR-005 D1-3、ADR-013 D13-15）[D]。AWS は障害時に cache を迂回する挙動を bimodal behavior の例に挙げる [V][^31]（RS-09#15）。

### 2.10 TBD の一覧（所有者・期限・決め方）

| 値 | 所有者 | 期限 | 決め方 |
|---|---|---|---|
| R(t, c)（階層×3 区分）、R-191.2 の最大値、R-191.3 の成功率 | CTO＋CISO（SLO）、事業責任者（BIA） | G4 | BIA の R(t)・E(t)、H6-01〜H6-08、DL-20 |
| M_rev（失効状態の最大齢） | CTO＋SRE 責任者 | G4 | H6-02、ADR-013 TC-13-02 |
| C_edge(t)、SDK 判定 cache の最大齢（≤ B） | CTO | G4 | ADR-005 H-02、H6-03 |
| L_conn(t)、I_conn(rs)、Δ_conn | CTO＋プロダクト責任者 | G4 | H6-04 |
| L_der(t)、Txn-Token の置換回数の上限 | プラットフォームチーム長 | G4 | ADR-005 D3、H6-05 |
| I_job(t) | ドメイン責任者＋プラットフォームチーム長 | G4 | ADR-026、H6-06 |
| 署名付き URL の寿命上限 | プロダクト責任者＋CISO | G4 | H6-07、G-136 |
| D_svc(t)（依存サービスの受信義務の期限） | プラットフォームチーム長 | G3（契約凍結 DEC-8 の前） | H6-08、ADR-022 |
| 外部連携アプリの受信義務の対象範囲 | プロダクト責任者＋CISO | G3 | NA-006-4 の調査、K6-3 |

### 2.11 決裁案（経営・事業・リスク受容の判断が要る点）

| # | 論点 | 選択肢 | 推奨 | 帰結 | 決める人 |
|---|---|---|---|---|---|
| K6-1 | 剥奪反映 SLO の構造 | (a) 一律値／(b) 階層×区分の表（TD-3 の B）／(c) 製品の既定値に任せる | (b) | (a) は R-087 に反する。(c) は上限を説明できない（RS-07 §2 第 2 項） | CTO＋CISO（構造）、事業責任者（値）。G4 |
| K6-2 | read-sensitive の内部 hop を寿命内の遅延で許すか | (a) 許す（Z＝L_int）／(b) 内部 hop も周期確認にする | (a)。ただし BIA の E(rs) が L_int＋Δ＋C を下回る場合は (b) | (a) は read-sensitive の stale allow が L_int の桁で残る。(b) は状態照会が内部 hop 倍率 k（ADR-005 NA-05）で増える | 事業責任者（BIA）＋CISO（受容）。G4 |
| K6-3 | 外部連携アプリの受信義務 | (a) 全アプリ必須／(b) 高リスク scope と session 保持アプリだけ必須（D6-26）／(c) 全アプリ任意 | (b) | (a) は参入障壁が高く NA-006-4 次第で達成不能。(c) はアプリ内に残る session とデータの後始末を連携事業者に委ねる | プロダクト責任者＋CISO。G3 |
| K6-4 | 依存サービスの allow cache の禁止（D6-10）の適用時期 | (a) GA で全サービス／(b) 新規は GA、既存は移行計画（ADR-027）の段階で | (b) | (a) は 240 の自前認可サービス（A-112）の改修を GA に集中させる。(b) は移行期間中の stale allow を受容票で扱う | CTO（技術）＋CISO（受容）。G3 |
| K6-5 | 剥奪書込の RPO | BIA 決裁案 3 の A／B／C | A（BIA の推奨に合わせる）。採否は ADR-010 H-12 の後 | ADR-010 §2.12 決裁案 4 と同じ | 事業責任者＋CISO。G4 |

### 2.12 主要 ADR との論点

主要 ADR は編集していない。次の論点は矛盾ではなく、主要 ADR の決定を前提にした解釈・追加の要請であり、関係する ADR の改版時に扱うことを求める [D]。

| ID | 主要 ADR | 論点 | 本書の扱い | 決める場 |
|---|---|---|---|---|
| L6-1 | ADR-022 D-2（SSF/CAEP/RISC の GA 範囲） | v1 の GA イベントに RISC account-enabled・account-purged がない。顧客 IdP が account-purged を送った場合の処理が契約上未定義になる | 受信では account-purged を account-disabled と同じ処理（RC-2）で受け、削除はライフサイクル事象で行う案を DL-79 の preview に置くよう求める。再有効化は SSF でなく管理操作で行うので account-enabled は送受信しない [D] | ADR-022 の改版（DEC-8 前） |
| L6-2 | ADR-022 D-2（OIDC/OAuth profile の GA 範囲） | OIDC Back-Channel Logout が契約の一覧にない | D6-24 の通知経路として OIDC profile の preview に加えるよう求める [D] | 同上 |
| L6-3 | ADR-005 D1-6 と REQ-03 §3.1 | REQ-03 は write に「token の失効状態確認 必須」を課すが、ADR-005 D1-6 の内部 RS の毎要求 jti 照合は privileged 以上に限る | 矛盾ではない。write の失効状態確認は E1 の毎要求照会＋G 段＋要求ごとの Txn-Token で満たすと解釈した（D6-11）。内部 RS での照合は privileged 以上に限る [D] | 本書で閉じる（REQ-03 の注記の改版時に反映を申し送る） |
| L6-4 | ADR-011 D1-2（G 段の規則 2） | 「主体の停止・無効化」が act 連鎖の主体（委任元とエージェント）の両方を含むか明記されていない | 両方に適用する解釈を求める（D6-22）[D] | ADR-011 の改版、ADR-017 の起草時 |
| L6-5 | ADR-010 D-13（U-03） | 窓 W 方式を採るかで RC-1 の C_p（PDP 判定）が変わる | U-03 の結論を C_p の値として受け取る。どちらの結論でも本書の式は変わらない [D] | reconciliation-notes U-03（CISO、Gate 3） |
| L6-6 | ADR-013 D13-26（U-04） | read-sensitive の known-good・SDK 判定 cache に PDP 署名を要するか | SDK 判定 cache（D6-10）は平常時の cache で、失効 epoch の条件は U-04 の結論によらず課す。署名の要否は U-04 に従う [D] | reconciliation-notes U-04（KD13-6 と同時） |
| L6-8 | ADR-022 D-2 と identity-lifecycle §16.3 | identity-lifecycle §16.3 は組織外との送受信に使うセキュリティ事象に RISC recovery-activated を挙げるが、ADR-022 D-2 の v1 GA 範囲と本書 D6-23・D6-24 の一覧にはない | 本書は v1 では送受信しない。受信する場合は RC-6 の疑い（再認証と認証器の健全性確認）として扱う案を DL-79 の preview に置くよう求める [D]（レビューで追加） | ADR-022 の改版と identity-lifecycle の改版（DEC-8 前） |
| L6-7 | ADR-007・ADR-021（U-01 issuer の粒度） | SET の iss（送信者）と Back-Channel Logout の iss の数が issuer の粒度で変わる（テナント別なら約 1 万） | 本書の決定は U-01 のどちらでも成り立つ。送信者 metadata の件数と外部受信者の設定負担だけが変わる [D] | DEC-3（U-01） |

---

## 3. 検討した選択肢

### 案A: 短命 token だけで失効を表す（自己完結 JWT、照会なし）

- **概要**: 全 token を自己完結の JWT にし、失効は寿命切れで反映する。session・grant の失効は refresh の拒否だけで行う [D]。
- **利点**: 照会が 0/秒で、AS・状態ストアの停止に強い [D][A-044]。依存サービスの義務が最小になる [D]。
- **欠点**: R は L＋Δ＋C を下回れず、寿命の値が剥奪の速さを決める [D]。FAPI 範囲の失効状態検証（shall）[N][^3]（RS-04#45）を満たさない [D]。外部に JWT を出すと ADR-005 D1-1 と衝突する [D]。
- **主要リスク**: 寿命を短くすると AS・STS の発行負荷が増え（ADR-005 D3 の感度: 2 分で exchange 5,560/秒）、障害が寿命を超えると全利用者が止まる「時限爆弾」になる [D][A-028][V][^20]（RS-09#36）。
- **費用・要員**: 状態ストアと失効配布が不要で、本書の増分は ＋0〜1 FTE の桁 [D][NA-006-3]。
- **可逆性**: 外部に JWT を出すと、外部 client が内容の解析に依存するため不可逆寄りになる（ADR-005 §3.1 案A）[D]。
- **勝つ条件**: BIA の R(t) がどの階層でも寿命（分単位）を許し、FAPI 範囲がなく、外部 client がほぼ第一者だけの場合 [D]。

### 案B: 全 RS が毎要求 introspection する（集中照会）

- **概要**: 内部 hop を含む全 RS が、毎要求で AS（または状態ストア）に照会する [D]。
- **利点**: 全経路で Z＝0 になり、R は D_w＋C で決まる [D]。概念が単純で説明しやすい [D]。
- **欠点**: 照会量が 16,804/秒×(1＋内部 hop 倍率 k)×cache miss（ADR-005 §3.1 案D の式、NA-05）になり、状態ストアが全依存サービスの同期依存になる [D][A-040]。状態ストアの停止がそのまま全判定の停止になり、静的安定性（ADR-013 D13-14）に反する [D]。
- **主要リスク**: 障害時に AS 本体へ迂回する bimodal 動作の誘惑 [V][^31]（RS-09#15）、照会の timeout での fail-open [V][^20]（RS-09#21）[D]。
- **費用・要員**: 照会系の容量が案C の k 倍。要員は ADR-005 NA-08 の＋1〜2 FTE の数倍の桁と見込むが、根拠は弱い [D][A-054]。
- **可逆性**: 可逆 [D]。
- **勝つ条件**: 規制業種比率が上がり、全操作で即時失効が求められ（ADR-005 §8 の規制変更トリガー）、かつ H-02 で状態ストアが k 倍の照会を判定系の可用性帯で処理できると実測された場合 [D]。

### 案C（採用）: 中央強制点＋失効状態の push 配布＋階層別予算＋境界でだけ SSF/CAEP

- **概要**: §2 のとおり [D]。
- **利点**: write 以上の外部経路で R が寿命に縛られない [D]。依存サービスの受信成否に効力が依存しない [D]。失効状態の局所評価で、control plane 停止中も失効が効き続ける [D]。標準（RFC 7662・7009、SSF・CAEP・RISC 1.0 Final）を組織の境界で使い、draft（Token Status List、CAEP Interop）に依存しない [D]。
- **欠点**: 失効状態の配布系・接続ゲートウェイという自社部品が増える [D]。read-sensitive の内部 hop は寿命内の遅延が残る（K6-2）[D]。依存サービスへの義務（allow cache の禁止、長時間接続とジョブの再確認）が約 300 サービスの実装に入る [D][A-052]。
- **主要リスク**: 配布系の不具合で失効状態が古くなると、M_rev 経過後に read-sensitive 以上が拒否され可用性に影響する（意図した安全側の倒れ方だが業務影響がある）[D]。範囲境界の誤設定で過大な失効が起き得る [D]。
- **費用・要員**: ＋2〜3 FTE の桁（NA-006-3）に、ADR-005 NA-08 の状態ストア分を加える [D][NA-006-3, A-054]。依存サービス側は受信義務を負うサービス（NA-006-2）に限って実装が要る [D]。
- **可逆性**: 可逆（条件付き）。配布方式や cache 齢は強制点の内側で変えられる [D]。
- **勝つ条件**: R(t) が階層ごとに異なり、高リスク操作だけ短い窓が要る場合（TD-3 の B）[D]。

### 案D: 全依存サービスを SSF/CAEP の受信者にする（内部も SET push）

- **概要**: 300 の依存サービスがそれぞれ SSF stream を受信し、自前の session・cache・判定を無効化する [D]。
- **利点**: 標準形式で内外の伝播を統一できる [D]。サービス固有の派生状態まで同じ仕組みで届く [D]。
- **欠点**: 効力が各サービスの受信と処理の正しさに依存し、R が最も遅いサービスで決まる [D]。SSF は処理の義務を配備ごとに定めてよいとするので、受信者ごとの処理の正しさを規範から得られない [N][^4]（RS-04#77）。SET の検証・stream 管理を 60 チームが個別に実装する [D][A-052]。
- **主要リスク**: 1 サービスの受信漏れが stale allow になり、検知が難しい [D]。
- **費用・要員**: 初期実装だけで 300 サービス×1〜4 人週＝300〜1,200 人週の桁 [D][NA-006-5]。ただし案C でも受信義務を負うサービス（NA-006-2、下限の手掛かり 105）はライフサイクル事象の受信を実装するので、案C との差は「SSF 固有の作業（SET 検証・stream 管理）」と「受信義務を負わないサービスの分」である [D][A-110, NA-006-2]。運用（stream の監視、再送、未処理の滞留）がサービス数に比例する [D]。
- **可逆性**: 可逆だが、全サービスに入った受信実装を撤去する費用が大きい [D]。
- **勝つ条件**: 依存サービスの大半が独自 session・自前 cache を持ち続け、中央強制点（edge・facade）を経由しない経路が移行期間後も残る場合 [D][A-110, A-112]。

### 案E: Token Status List で内部 JWT の失効を配る

- **概要**: 内部 JWT に `status` claim を入れ、圧縮ビット列の状態リストを RS が取得する [D]。
- **利点**: introspection より Issuer への問い合わせを減らし、herd privacy を得られると説明されている [N][^23]（RS-04#80）。標準形式で外部の検証者にも使える [D]。
- **欠点**: 2026-10-15 時点で RFC 化されておらず（draft-21、RFC Ed Queue）[N][^24]、ADR-005 D8-5 は draft を規範根拠に使わないとしている [D]。キャッシュは exp・ttl で制御され、値の妥当な範囲は用途に強く依存する [N][^23]（RS-04#80）ので、R の分解では C の一項になるだけで案C と本質的に同じ構造になる [D]。
- **主要リスク**: draft の変更が契約の破壊的変更になる（ADR-022 案A の棄却理由と同じ）[D]。
- **費用・要員**: 状態リストの発行系が案C の配布系に置き換わる程度の桁 [D]。
- **可逆性**: 内部に限れば可逆 [D]。
- **勝つ条件**: RFC が発行され、外部の検証者（第三者 RS）に失効を配る要件が生じた場合 [D]。

---

## 4. 評価

### 4.1 評価軸

| 軸 | 内容 | 重み（案） |
|---|---|---|
| E1 上限の説明可能性 | R(t, c) を構成要素の和で示し、実測で埋められるか（R-143、R-191、G-111） | 高 |
| E2 静的安定性・可用性 | 部品停止時に判定を止めず、かつ fail-open しないか（ADR-013、A-090） | 高 |
| E3 依存サービスの負担 | 約 300 サービス・60 チームに課す実装と運用（A-052） | 高 |
| E4 標準準拠と 20 年の進化 | Final の標準に載り、draft に依存しないか。差し替え可能か | 中 |
| E5 費用・要員 | 部品数と要員（A-054） | 中 |
| E6 外部連携への適用 | 外部連携アプリ・顧客 IdP との間で失効が届くか | 中 |

### 4.2 比較表

| 案 | E1 | E2 | E3 | E4 | E5 | E6 |
|---|---|---|---|---|---|---|
| A 短命 token のみ | 低（寿命が下限） | 高 | 高（負担小） | 中（FAPI の shall を満たさない） | 高 | 低 |
| B 全 RS 集中照会 | 高 | 低（同期依存） | 中 | 高 | 低 | 中 |
| C 中央強制＋配布（採用） | 高（write 以上）／中（rs の内部 hop） | 高 | 中（義務は派生状態を持つサービスに限定） | 高 | 中 | 高 |
| D 全サービス SSF 受信 | 低（最も遅い受信者で決まる） | 中 | 低（負担大） | 高 | 低 | 高 |
| E Token Status List | 中 | 中〜高 | 中 | 低（draft） | 中 | 中 |

- 比較表の評価は起草者の設計推論であり、模擬パネルの採点は行っていない [D]。主要 ADR が用いた 3 レンズ×判定者 3 名の手続きは本書では未実施で、Phase 4 の模擬パネルで実施する必要がある [D]。

---

## 5. 決定理由と棄却理由

- **案C を採る理由**: E1 と E2 を同時に満たすのは案B と案C だけであり、案B は全判定を状態ストアの同期依存にして ADR-013 の静的安定性の原則と衝突する [D]。案C は ADR-005（外部 opaque と edge 照会）、ADR-010（facade の整合性トークンとフェンス）、ADR-011（G 段の停止規則）、ADR-013（失効 epoch と単調配布）、ADR-007（失効 kid の push）の既決定を組み合わせて成り立ち、新しく作る部品を配布系と接続ゲートウェイに限れる [D]。
- **案A の棄却理由**: 剥奪の速さが寿命で決まり、R を短くするには寿命を短くするしかない [D]。FAPI 範囲の失効状態検証を満たさず [N][^3]、寿命の短縮は障害耐性と発行負荷を悪化させる [V][^20][D]。勝つ条件（全階層で分単位の R を受容、FAPI 範囲なし）が BIA で示されれば再評価する [D]。
- **案B の棄却理由**: 照会量が内部 hop 倍率 k で増え、状態ストアの停止が全判定の停止になる [D]。失効の確認を pull 照会に頼ると、timeout 時の fail-open の誘惑が生じる [V][^20]（RS-09#21）。案C でも privileged 以上は毎要求照会する（D6-11）ので、案B の利点は高リスク操作に限って取り込んでいる [D]。
- **案D の棄却理由**: 効力が最も遅い受信者に依存し、R を説明できなくなる [D]。初期費用が 300〜1,200 人週の桁になる [D][NA-006-5]。案C は派生状態を持つサービスにだけ受信義務を課し（D6-25）、案D の利点（サービス固有状態への到達）をその範囲で取り込む [D]。
- **案E の棄却理由**: draft であり ADR-005 D8-5 の方針に反する [D]。構造上は案C の配布系の一形式なので、RFC 化後に配布形式として再評価する（§8）[D]。

---

## 6. 帰結

### 6.1 良い帰結

- write 以上の外部経路では、剥奪反映時間が token 寿命から切り離され、D_w＋Δ＋C_edge で決まる [D]。
- テナント停止・主体停止は、依存サービスの実装の正しさに依存せず、E1・E2 の 2 か所で効く [D]。
- 失効状態が policy の版と独立しているので、policy の rollback・緊急 freeze・cell 間移動の中止で剥奪が戻らない [D]。
- SSF/CAEP/RISC を組織の境界に限るので、内部 300 サービスに SET の検証・stream 管理を実装させずに済む [D]。

### 6.2 悪い帰結

- 配布系・接続ゲートウェイ・SSF の送受信が基盤の Tier-0 に近い部品になり、運用負荷が増える [D][NA-006-3]。
- read-sensitive の内部 hop は寿命内の遅延が残る（K6-2）[D]。
- 依存サービスに allow cache の禁止と長時間接続・ジョブの再確認を課すので、既存の自前認可サービス（A-112 の 240）は移行時に改修が要る [D][A-112]。
- M_rev を過ぎると read-sensitive 以上が拒否されるので、配布系の障害が可用性に表れる [D]。

### 6.3 残余リスクと受容者案

| ID | 残余リスク | 補完統制 | 受容者案 |
|---|---|---|---|
| RR6-01 | 予算として定めた窓 R(t, c) の間は、剥奪済みの主体が許可され得る（T-032） | canary 計測（D6-33）、判定記録との突合、侵害時の範囲境界による一括失効 | 段2 案（CEO・経営会議、threat-catalog TD-3）。期限 G4 |
| RR6-02 | 顧客 IdP 側の同期遅延 U の間は、基盤に停止が届かない（T-059） | SSF 受信の推奨、顧客管理者向け失効 API（D6-27）、責任分界（DL-26） | 事業責任者（顧客との契約） |
| RR6-03 | 外部連携アプリ内の session・保存データは、アプリの受信処理に依存する（T-069） | E1 での API 遮断、受信義務の契約化（D6-26）、大量取得の検知（P-10） | B2B 事業責任者＋CISO |
| RR6-04 | 外部 RP の JWKS cache の間は、失効鍵で署名された ID Token 等が受理され得る（T-044、ADR-007 RR7-02） | 外部 access token の opaque 化、通知経路 | 事業責任者＋CISO（ADR-007 と同じ） |
| RR6-05 | 発行済みの署名付き URL は寿命の間は使える | 寿命上限（D6-15）、生成用資格情報の失効、proxy 配信 | プロダクト責任者＋CISO |
| RR6-06 | 移行期間中の既存サービス（独自 session・自前 cache）の stale allow | K6-4 の移行計画、受容票 | CISO（受容票、期限付き） |

### 6.4 依存サービス・連携開発者への影響

- 依存サービスは PEP SDK を使い、SDK の外で allow を cache しない [D]。違反は CI で拒否される [D]。
- 長時間接続を終端するサービスは、基盤の接続ゲートウェイを使うか、SDK の失効購読・期限切断・メッセージ単位の再認可を実装する [D]。
- 非同期ジョブを持つサービスは、enqueue 時の context の付与と実行時の再認可を実装する（ADR-026）[D]。
- 外部連携開発者は、opaque token の解析をせず、401 と RFC 7009 の失効を想定した再認可の処理を実装する [D]。高リスク scope を使う場合は SSF か Back-Channel Logout の受信が契約条件になる（D6-26）[D]。
- モックと契約試験キット（DL-80）に「失効」の負例（失効後の token、失効後の接続継続、失効後のジョブ実行）を入れ、実基盤なしで受信義務を試せるようにする（G-121）[D]。

### 6.5 運用・要員への影響

- 失効配布系・接続ゲートウェイ・SSF 送受信の運用を SRE の内数で持ち、増分は NA-006-3 の桁と見込む（H6-10 で A-054 と比べる）[D][NA-006-3, A-054]。
- 全 session 失効・テナント強制停止・鍵の緊急失効の手順は、通常の配布系の最大速度版とし、演習（R-275、G-093）の対象にする [D]。
- 失効の誤設定（範囲境界の誤り）は大量の誤 deny を起こし得るので、範囲がテナント以上の失効は stop-authority.md の遮断系の権限と記録に従わせる [D]。

---

## 7. 検証

### 7.1 PoC の仮説と TC 案（TC-ID は 12_poc で採番する）

| H | 仮説 | 合否基準 | 関係する既存の試験 |
|---|---|---|---|
| H6-01 | 正本への確定書込 D_w（SSF 受信からの D_in を含む）が区分ごとに予算内 | p99・最大が TBD（DL-20）以内 | TL-5、IL-TC13 |
| H6-02 | 失効状態の配布 Δ が、平常時と全 session 失効時（範囲境界）に予算内で、NA-006-1 の更新率で配布系が飽和しない。M_rev を超えたら read-sensitive 以上が拒否される | Δ の p99・最大が TBD 以内。M_rev 超過後の allow 0 件 | ADR-013 TC-13-02、TC-13-24 |
| H6-03 | 階層ごとの stale allow の継続時間（edge cache、SDK 判定 cache、エンジンの鮮度窓、フェンス）が予算内 | write 以上の stale allow が Δ＋C_edge を超えない。read-sensitive は R(rs) 以内 | ADR-010 H-02・H-05、RS-07 §5.2 の 1、TH-TC-032 |
| H6-04 | 長時間接続（WebSocket・SSE・gRPC stream・長時間 download）で、接続中の剥奪・session 失効・テナント停止から切断・拒否まで | Δ_conn・L_conn の予算内。予算経過後の配信 0 件 | TH-TC-019 |
| H6-05 | 親の session・grant の失効から、派生 token（exchange 後 token、Txn-Token、置換 Txn-Token）の拒否まで | L_der の予算内。失効後の新規派生 0 件 | TH-TC-038、RS-04 §5.3 の 7 |
| H6-06 | 実行中ジョブへの起点主体の剥奪・テナント停止の注入で、次の段が拒否される | I_job 以内。剥奪後の段の実行 0 件 | TH-TC-039 |
| H6-07 | 署名付き URL・export が剥奪後に R(t) を超えて使えない | 剥奪後の取得成功は寿命上限内に限られる | G-136 (a) の負例 |
| H6-08 | 受信義務を負う依存サービスの代表（独自 session、ジョブ）がライフサイクル事象を D_svc 以内に処理し、受信を止めても E1・E2 で拒否される | 受信停止時も予算内に拒否。D_svc の p99 が TBD 以内 | G-137、G-121 |
| H6-09 | SSF の受信（顧客 IdP 役のモック）と送信（外部受信者役のモック）、Back-Channel Logout が DL-78・DL-79 の profile で相互運用し、検証できない SET を処理しない | 契約試験の全件合格。不正 SET の処理 0 件 | DL-80、G-118 |
| H6-10 | 要員の増分が A-054 の内数に収まる | NA-006-3 の桁以内 | ADR-005 H-18 |
| H6-11 | ネイティブアプリ・CLI・AI エージェントの経路で、logout（RFC 7009）・委任 grant の失効・委任元の停止から拒否まで | 予算内。失効後の tool 呼出し成功 0 件 | G-111 の全経路 |
| H6-12 | 鍵の緊急失効から全内部検証点が旧 kid を拒否するまで | R-189.5（TBD）以内 | ADR-007 TC-07-03、CB-TC-20 |
| H6-13 | policy の rollback・cell 間移動の中止・障害からの復元の後に、剥奪済みの権限が復活しない | 復活 0 件 | ADR-013 TC-13-09、ADR-010 H-12、TL 系 |

- 合否の数値はすべて BIA の R(t)・E(t) と DL-20 の決裁に紐付け、決裁前は TBD とする [D]。事前登録（DL-22）で測定条件（負荷、cell 数、配布の経路）を固定してから測る [D]。

### 7.1.1 PoC 系統 1 の結果と本書への含意（PoC/R7反映、版 0.2）

以下の値はすべて PoC 系統 1 の自己実行（実施者は AI エージェント、立会人なし、凍結タグなし、`git_dirty`）の参考値であり、POC-01 §2.2.1 の W-1〜W-4 を満たさないため Gate 4 の証拠ではない。原因区分は実施者の記録で、作成者以外は確かめていない。独立再現（reproduction-log）も同じ機械で別の AI エージェントが行ったもので、立会人による再実行ではない [D][^32][^33]。系統 1 の秒未満の時間は、測定系の分解能（ε 16.3 ms と probe 間隔 q の和）に近く、並行負荷で数倍変わったので、R(t)・Δ などの予算の根拠に使わない [D][^32][^33]。

| POC-01 の TC | 本書の仮説 | 観測（参考値） | 本書の決定への影響 |
|---|---|---|---|
| TC-008 | H6-03 | write・privileged の stale allow 0。read-sensitive は PEP SDK cache の層で最大 1,773 ms（構成した上限内）。OpenFGA の Check cache を有効にしても stale を再現できなかった [D][^32][^33] | エンジンの鮮度窓の項は系統 1 で測れていない。H6-03 の判定は系統 2 の TC-103・TC-104 に残す。再現できなかったことを stale がない証拠にしない [D] |
| TC-014 | H6-12 | 緊急失効の宣言から最後の受理まで、失効状態の配布ありで最大 182 ms（実 PEP 134 ms）、配布なし（JWKS の再取得だけ）で最大 14,066 ms。配布ありは配布なしより 1 桁以上速い [D][^32][^33] | D6-20（失効 kid を JWKS と独立に失効状態で配る）を外さない根拠の補強になる。外部 RP のように失効状態を受けない検証点は JWKS の再取得に依存するので、ADR-007 RR7-02 の残余はそのまま残る。値は TC-109 の本番相当で取る [D] |
| TC-023 | H6-06 | 剥奪後の段の実行 0。剥奪から最初の拒否まで 300〜309 ms（I_job=300 ms の構成）。STS の内部開始の受付記録はメモリにしかなく、再起動で失われた（待ち行列の run は拒否、fail-closed）[D][^32] | 決定は変えない。受付記録の永続化は ADR-026 の実装事項 [D] |
| TC-024 | H6-07 | 剥奪後の署名付き URL の取得成功は、発行後 1,883 ms まで（構成した TTL 2,000 ms 以内）[D][^32] | 剥奪後も TTL の間は使えることは設計どおりの残余。L_url が TBD のため判定保留 [D] |
| TC-028 | H6-04 | 正式な実行（v1）は評価器の欠陥で P-14 の予算後の配信を数えられず不合格。修正後の参考実行で予算後の配信 0（剥奪から切断まで 239 ms、session 失効から切断まで 120 ms）[D][^32] | 正式な結果からは H6-04 について何も言えない。立会い下の再実行で確かめる [D] |
| TC-018・TC-019 | H6-08 | 退職から全経路の拒否まで 82 ms、SCIM の active=false から全拒否まで 13 ms。参照 broker の JIT 経路は SCIM の active を見ず、基盤の AS の拒否だけに依存していた（F-10）[D][^32] | 試験群が作った参照実装での確認で、依存サービスの受信義務（D_svc）の証拠ではない。単一の層への依存は H6-08 の手順で確かめる [D] |

### 7.2 第三者評価で確かめること

- 独立立会人の下で、G-111 の全経路（ストリーム接続・非 HTTP・ネイティブ／CLI・AI エージェント）の端から端の実測を行い、U と R を分けた報告を確認する [D]。
- pentest の範囲に、失効状態配布の抑止・巻戻し（古い epoch の再提示）、範囲境界の回避（発行時刻の偽装）、長時間接続の切断回避、派生 token による失効の迂回、SSF 受信口への偽造 SET の投入を含める [D]。
- 全 session 失効・テナント強制停止・鍵の緊急失効を含む演習（R-275、G-093）を、独立立会人が確認する [D]。

---

## 8. 再検討トリガーと見直し時期

- **定期見直し**: G3・G4 の各ゲート、標準ステータス台帳の四半期更新、再決裁の周期（3〜5 年）で見直す [D]。
- **実測値の逸脱**:
  - H6-02 で配布系が飽和する、または Δ が予算を超える場合は、範囲境界の粒度と配布の分割（cell 内の shard）を見直す [D]。
  - H6-03 で read-sensitive の stale allow が R(rs) を超える場合は、K6-2 を (b) に切り替える [D]。
  - **PoC/R7反映（版 0.2）**: 系統 2 の TC-103・TC-104 でも、エンジン cache・レプリカ由来の stale を注入で作れない場合は、H6-03 の測定方法（注入の手段）を見直し、R(t) の分解式のエンジンの鮮度窓の項を構成値の上限で置き続ける [D]。
  - **PoC/R7反映（版 0.2）**: TC-109 で、失効状態の配布がある検証点でも宣言から最後の受理までが R-189.5 の予算を超えた場合は、D6-20 の配布経路と M_rev を見直す [D]。
  - H6-08 で受信義務を負うサービスの処理が D_svc を満たせない場合は、該当機能を基盤の接続ゲートウェイ・ジョブ基盤に寄せる [D]。
  - H6-10 で要員が A-054 に収まらない場合は、接続ゲートウェイの提供をやめて SDK の実装義務に寄せる [D]。
- **前提の変化**:
  - BIA が全操作で秒未満の R を求めた場合、または規制変更で即時失効が全操作に求められた場合は、案B を再評価する [D]。
  - NA-006-2 が上端（大半のサービスが独自 session・自前 cache を持ち続ける）と判明した場合は、案D の勝利条件に近づくので再評価する [D]。
  - NA-006-4 で外部連携アプリの受信対応率が高い場合は、K6-3 を (a) へ寄せる [D]。
- **標準の状態変化**:
  - Token Status List が RFC になったとき（案E を配布形式として再評価、ADR-021 の `status` 予約の扱い）[D]。
  - CAEP Interoperability Profile が Final になったとき（準拠表明を GA へ）[D]。
  - Transaction Tokens の RFC 化または失効（2027-01-31 失効予定）[N][^9]（D6-16 の再確認）[D]。
  - AIMS など AI エージェントの失効に関する WG 文書が RFC になったとき（D6-22 の再確認）[D]。
  - SSF・CAEP・RISC の改版、RISC sessions-revoked の削除 [D]。
- **事故**: 自社または公表事案で、剥奪後の長時間接続・派生 token・連携事業者の token による被害が報告された場合 [D]。

---

## 9. 依存関係

| 依存先 | 内容 |
|---|---|
| ADR-001 | AS 製品の必須機能（RFC 7662・7009、opaque 状態の外部 push、SSF の送信、Back-Channel Logout）。SSF 受信の実装場所（製品か自社 adapter か） |
| ADR-005 | U2 の R(t)、C(t)、Δprop。opaque 境界と edge 照会（D1）、privileged の stateful 照合（D1-6）、refresh token の保護（D4）、grant の一括失効（D7-6） |
| ADR-007 | 失効 kid の push と欠落・失効の区別（D7-36・D7-37）、外部 RP の JWKS cache（RR7-02） |
| ADR-009（未起草） | 派生 token の寿命と sid・grant の引継ぎ、Txn-Token の置換回数 |
| ADR-010 | relationship の整合性トークン・剥奪フェンス（D-13・D-18）、D-19 の和の各項、RPO 0（D-21・H-12） |
| ADR-011 | G 段の停止規則（D1-2）、fail-mode の reason（D3-6）、判定 cache の契約 |
| ADR-012（未起草） | SDK 外の allow cache と PEP 外データの検査 |
| ADR-013 | 失効 epoch・単調配布・M_rev 超過時の拒否（D13-25・D13-35）、静的安定性（D13-14） |
| ADR-014（未起草） | revocation_id・失効 epoch の監査欄 |
| ADR-017（未起草） | AI エージェントの主体モデル（D6-22 の制約を満たすこと） |
| ADR-019（未起草） | 全 session 失効・鍵切替・kill switch の侵害時手順 |
| ADR-021 | sub_id による主体表現、`status` の予約 |
| ADR-022 | SSF/CAEP/RISC の GA 範囲（L6-1・L6-2）、イベント配送契約（G-137）、派生 token の寿命の値 |
| ADR-026（未起草） | 非同期・長時間ジョブの再認可（I_job） |
| ADR-029（未起草） | break-glass の発動窓 |
| DL-56 | 経路ごとの遅延予算表と伝播経路の詳細 |
| DL-78 / DL-79 | SSF stream profile と SET payload profile、受信義務 |
| DL-20 | R(t, c) と各予算の数値契約 |
| DL-26 | 顧客との責任分界（上流遅延 U、顧客管理者の失効 API） |
| DL-80 | 失効の負例を含むモック・契約試験キット |
| 契約（11_contracts の第三者向け規約） | 外部連携アプリの受信義務（D6-26）、保管・削除条項 |

---

## 対応表（R/G）

閉じ方は CONVENTIONS §6（A 机上／B 組織決定／C 実測／D 第三者）。状態は「本書で閉じた」「決裁案まで」「要実測」「要第三者」のいずれか [D]。抽出は traceability/R-requirements.md と traceability/G-goal-criteria.md を「ADR-006」「DL-12」「DL-56」「DL-78」「DL-79」「剥奪」「失効」で検索し、内容上関係する行を加えた [D]。R-requirements.md には対応成果物欄に本書のファイル名・ADR-ID を含む行がなく、本書が応える R は deliverables.md §5 の主な対応要求（R-112・R-143・R-191）と、対応成果物が DL-56 の行である [D]。

| ID | 本書の節 | 閉じ方 | 状態・残課題 |
|---|---|---|---|
| **R-112** 全 session 失効（deliverables §5 の主な対応要求） | D6-06、D6-13、§2.12 | C | 方式は本書で閉じた。完了時間は要実測（H6-02、演習 R-275・G-093、DL-24） |
| **R-143** 剥奪→拒否の最大時間（同） | D6-28〜D6-31、§2.10 | C | 分解方法は本書で閉じた。値は要実測（H6-01〜H6-07）と決裁（DL-20、G4） |
| **R-191** 数値契約: 剥奪（同） | D6-30、D6-31、K6-1 | C | 決裁案まで（構造）。値は要実測 |
| R-191.1 通常・高権限・tenant 停止の最大反映時間 | D6-01（区分の対応）、D6-30 | C | 要実測（H6-03、TL-5） |
| R-191.2 stale allow の最大継続 | D6-30 項 3、D6-33 | C | 要実測（H6-03） |
| R-191.3 cache invalidation 成功率 | D6-10、D6-30 項 3 | C | 要実測（H6-03、H6-04） |
| **G-111**（DL-12 05_adr/ADR-006 を名指し） | D6-14〜D6-18、D6-22、D6-28〜D6-31、§7 | C（B 併用） | 分解と経路は本書で閉じた。SLO の決裁（B）と全経路の端から端の実測（C、独立立会人）は未達 |
| **G-020**（05_adr の全 ADR） | 本書の構成（文脈・選択肢・棄却・決定・帰結・可逆性・再検討トリガー・証拠） | A | 本書で閉じた（ADR-006 分）。模擬パネルの採点は未実施（§4.2） |
| R-044 退職・削除 | D6-12、D6-25 | C | 要実測（IL-TC13・H6-01） |
| R-052 鍵の失効 | D6-20 | C | 要実測（H6-12。正本は ADR-007） |
| R-086 高リスクは fresh decision 必須 | D6-11 | B | 決裁案まで（fail-mode は ADR-013・DL-19） |
| R-087 一律値の撤回 | D6-30、K6-1 | B | 決裁案まで |
| R-111 kill switch | D6-34 | C | 要実測（ADR-019・DL-24 の演習） |
| R-113 鍵切替 | D6-20 | C | 要実測（ADR-007） |
| R-145 コンテンツ更新と relation 更新の原子的結合 | D6-09（consistency token 行） | C | 要実測（正本は ADR-010） |
| R-146 cache/replica 由来 staleness の測定 | D6-29 の C_p、H6-03 | C | 要実測 |
| R-189.5 緊急失効完了時間 | D6-20、H6-12 | C | 要実測 |
| R-189.6 JWKS cache 最大齢 | D6-20 | C | 要実測（正本は ADR-007・DL-20） |
| R-195.3 全 session 失効時間 | D6-13、H6-02 | C | 要実測（演習） |
| R-206 service 別 aud・token exchange の実証 | D6-16 | C | 要実測（H6-05、ADR-009） |
| R-253 一貫性認識（剥奪、revision-aware cache） | D6-05、D6-10 | A | 本書で閉じた（方針） |
| R-262 既定 deny と階層別の失敗モード | D6-08、D6-34 | A | 本書で閉じた（方針。表は DL-19） |
| R-271 承認条件 6（剥奪 SLO の充足） | §7 | C | 要実測 |
| R-275 承認条件 10（全 session 失効を含む演習） | D6-13、§7.2 | C | 要実測（演習） |
| G-059 全 session 失効後の一斉再認証の過負荷制御 | D6-13 | C | 要実測（DL-58・DL-24） |
| G-078 脅威カタログの網羅 | §1.6 | A | 本書の範囲は対応付けまで（正本は DL-11） |
| G-084 鍵の緊急失効の演習 | D6-20 | C | 要実測（ADR-007） |
| G-093 侵害別 runbook と演習 | D6-13、D6-20、D6-34 | C | 要実測（ADR-019・DL-24） |
| G-099 P-xx の「失効の反映」記載 | D6-14〜D6-19 | A | 申し送り（DL-64 の各 P-xx に転記） |
| G-103 リファレンス実装の失効後負例（P-07・P-14 を含む） | §7 H6-04、H6-11 | C | 要実測 |
| G-110 剥奪から拒否までの最大時間（engine 側） | D6-29 の C_p | C | 要実測（正本は ADR-010） |
| G-121 モックで失効の負例を再現 | §6.4 | C | 要実測（DL-80） |
| G-136 署名付き URL・outbound 資格情報の失効 | D6-15、D6-19 | C | 要実測（H6-07）。outbound 資格情報の全件失効は DL-64 へ申し送り |
| G-137 ライフサイクル事象と SSF/CAEP の役割分担 | D6-25 | A | 本書で閉じた（役割分担）。契約ファイルは 11_contracts（DL 未登録） |
| G-138 パターン×インタフェース×契約（失効・継続評価） | D6-23〜D6-26 | A | 申し送り（DL-64 の行列で DL-78・DL-79 を参照） |
| R-144 変更直後読取の consistency mode（レビューで追加） | D6-09（consistency token 行）、D6-11 | C | 要実測（正本は ADR-010 D-13） |
| R-168 具体脅威 10 のうち session theft・token replay・policy rollback・stale allow（同） | D6-05、D6-13、D6-18、D6-33、H6-03、H6-13 | C | 要実測（正本は DL-11・DL-22） |
| R-171 PoC の剥奪直後（同） | H6-03 | C | 要実測（正本は ADR-010・DL-22） |
| R-238 SP 800-207 の継続的評価（同） | D6-03〜D6-08 | A | 本書の範囲（失効の継続評価）は方針まで閉じた。準拠対応表は DL 側 |
| R-282 非人間主体の状態遷移（同） | D6-01 RC-2、D6-22 | A | 失効の伝播だけ本書で扱う。状態遷移の正本は identity-lifecycle・ADR-017 |
| G-055 全 session 失効後の一斉再認証 QPS（同） | D6-13 | A | 申し送り（DL-58。値は A-048 の 556/秒） |
| G-102 非同期・長時間ジョブと AI エージェントの委任の負例（同） | D6-16、D6-17、D6-22、H6-05、H6-06、H6-11 | C | 要実測（正本は ADR-009・DL-55） |
| G-118 SSF/CAEP の stream と SET の契約（同） | D6-23、D6-24、§2.12 L6-1・L6-2・L6-8 | A | 申し送り（DL-78・DL-79 の作成） |

---

## 残課題

- 数値（§2.10）はすべて TBD であり、BIA と PoC 実測の後に DL-20 で決裁する [D]。
- 主要 ADR への論点 L6-1・L6-2・L6-4・L6-8 は、関係する ADR の改版で扱う必要がある（本書からは編集していない）[D]。
- 新規仮定 NA-006-1〜NA-006-5 の前提台帳への登録は未了である [D]。
- research ノート外の原典（OIDC Back-Channel Logout 1.0、Token Status List の 2026-10-15 時点の状態）は、レビュー担当（作成者以外）が 2026-10-15 に再照合した。traceability/ の照合ログへの追記は未了である [D]。
- 主要 ADR が用いた 3 レンズ・判定者 3 名の手続きは本書では行っていない。Phase 4 の模擬パネルで評価する必要がある [D]。
- PoC/R7反映（版 0.2）: 系統 1 の時間の値は予算の根拠に使えない。H6-03・H6-04・H6-12 は、立会い下の系統 1 の再実行（POC-02 §7.1 R-1）と系統 2 の TC-103・TC-104・TC-109 で確かめる（所有者 PoC リード、期限 G4）[D]。

---

## 参考文献

[^1]: IETF (J. Richer, Ed.)『RFC 7662: OAuth 2.0 Token Introspection』2015-10. https://www.rfc-editor.org/rfc/rfc7662 （参照箇所: §2.1, §2.2, §4、確認日: 2026-10-03。RS-04#67）
[^2]: IETF (T. Lodderstedt, Ed., S. Dronia, M. Scurtescu)『RFC 7009: OAuth 2.0 Token Revocation』2013-08. https://www.rfc-editor.org/rfc/rfc7009 （参照箇所: §2, §2.1, §3（Implementation Note）、確認日: 2026-10-03。RS-04#69）
[^3]: OpenID Foundation FAPI WG (D. Fett, D. Tonge, J. Heenan)『FAPI 2.0 Security Profile』Final, 2025-02-22. https://openid.net/specs/fapi-security-profile-2_0-final.html （参照箇所: RS の access token 検証要件（RS-04#45 が引く節）、確認日: 2026-10-03。RS-04#45）
[^4]: OpenID Foundation Shared Signals WG『OpenID Shared Signals Framework Specification 1.0』Final, 2025-08-29. https://openid.net/specs/openid-sharedsignals-framework-1_0-final.html （参照箇所: Abstract, §4.1.1, §4.1.5, §6.1.1, §6.1.2、complex subject の tenant メンバー、確認日: 2026-10-03。RS-04#77、RS-14#62）
[^5]: OpenID Foundation Shared Signals WG (T. Cappalli, A. Tulshibagwale)『OpenID Continuous Access Evaluation Profile 1.0』Final, 2025-08-29. https://openid.net/specs/openid-caep-1_0-final.html （参照箇所: §1, §3.1〜§3.8, §4、確認日: 2026-10-03。RS-04#78）
[^6]: OpenID Foundation Shared Signals WG『OpenID RISC Profile Specification 1.0』Final, 2025-08-29. https://openid.net/specs/openid-risc-1_0-final.html （参照箇所: §2（イベント種別）, §2.6, §2.11、確認日: 2026-10-03。RS-04#78、RS-03#66）
[^7]: NIST (D. Temoshok ほか)『SP 800-63C-4 Digital Identity Guidelines: Federation and Assertions』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63c.html （参照箇所: §4.6.5, §4.8 Shared Signaling、確認日: 2026-10-03。RS-03#72、RS-14#38, #61）
[^8]: IETF (M. Jones ほか)『RFC 8693: OAuth 2.0 Token Exchange』2020-01. https://www.rfc-editor.org/rfc/rfc8693 （参照箇所: §2.1、確認日: 2026-10-03。RS-06#44）
[^9]: IETF OAuth WG (A. Tulshibagwale, G. Fletcher, P. Kasselman)『Transaction Tokens』draft-ietf-oauth-transaction-tokens-11, 2026-07-30（Internet-Draft、IESG 未提出、2027-01-31 失効予定）. https://datatracker.ietf.org/doc/html/draft-ietf-oauth-transaction-tokens-11 （参照箇所: §6, §13.1, §13.15、確認日: 2026-10-03。RS-06#36, #37, #40）
[^10]: IETF (A. Schwenkschuster, Y. Rosomakho)『Workload Identity Practices』draft-ietf-wimse-workload-identity-practices-07, 2026-09-22（Internet-Draft、Informational 予定、IESG 提出済み・AD Evaluation。standards-status.md SS-B16）. https://datatracker.ietf.org/doc/html/draft-ietf-wimse-workload-identity-practices-07 （参照箇所: §5.4, §5.5、確認日: 2026-10-03。RS-06#26）
[^11]: IETF (P. Kasselman ほか)『AI Identity Management System』draft-ietf-wimse-aims-00, 2026-09-15（Internet-Draft、WG Document、Informational 予定。standards-status.md SS-B17）. https://datatracker.ietf.org/doc/html/draft-ietf-wimse-aims-00 （参照箇所: §11、確認日: 2026-10-03。RS-06#73）
[^12]: OpenID Foundation (M. Jones, J. Bradley)『OpenID Connect Back-Channel Logout 1.0 incorporating errata set 1』Final, 2023-12-15. https://openid.net/specs/openid-connect-backchannel-1_0.html （参照箇所: §1, §2.4, §2.5, §2.6, §2.7, §4.1、確認日: 2026-10-15。research ノート外。起草者が原典を取得して確認し、レビュー担当（作成者以外）が 2026-10-15 に §2.4・§2.5・§2.7 の該当文と強度を再照合した。照合ログへの追記は未了）
[^13]: IETF (I. Fette, A. Melnikov)『RFC 6455: The WebSocket Protocol』2011-12. https://www.rfc-editor.org/rfc/rfc6455 （参照箇所: §10.2, §10.5、確認日: 2026-10-03。RS-17#51）
[^14]: OWASP『Application Security Verification Standard 5.0.0』V4 API and Web Service. https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/en/0x13-V4-API-and-Web-Service.md （参照箇所: V4.4 WebSocket（4.4.1〜4.4.4）、確認日: 2026-10-03。RS-17#52。Release tag は v5.0.0_release（2025-05-30）で、RS-17 が参照した branch v5.0.0 と同じ版である。standards-status.md SS-I04・Δ-16）
[^15]: Microsoft『SignalR authentication and authorization』ASP.NET Core, Microsoft Learn, ms.date 2026-09-20. https://learn.microsoft.com/en-us/aspnet/core/signalr/authn-and-authz （参照箇所: User and role changes during the connection lifetime, Bearer token authentication, Authentication refresh（.NET 11）、確認日: 2026-10-03。RS-17#53, #54）
[^16]: Amazon Web Services『Quotas for configuring and running a WebSocket in API Gateway』API Gateway Developer Guide. https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-execution-service-websocket-limits-table.html （参照箇所: Connection duration for WebSocket API（2 hours、引上げ不可）、確認日: 2026-10-03。RS-17#55）
[^17]: Amazon Web Services『Download and upload objects with presigned URLs』Amazon S3 User Guide. https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html （参照箇所: 冒頭, Expiration time for presigned URLs、確認日: 2026-10-03。RS-17#47、RS-08#81）
[^18]: Google Cloud『Signed URLs』Cloud Storage 文書, 2026-09-30 更新. https://docs.cloud.google.com/storage/docs/access-control/signed-urls （参照箇所: 冒頭, Overview、確認日: 2026-10-03。RS-17#48）
[^19]: AuthZed『Consistency』SpiceDB 文書（版表記なし）. https://authzed.com/docs/spicedb/concepts/consistency （参照箇所: Defaults, Levels, ZedTokens, Storing ZedTokens、確認日: 2026-10-03。RS-07#26, #27）
[^20]: Google『Building Secure and Reliable Systems』Chapter 9 "Design for Recovery", 2020. https://google.github.io/building-secure-and-reliable-systems/raw/ch09.html （参照箇所: 緊急 push の段落、Time 節、Rollbacks Represent a Tradeoff Between Security and Reliability、Use an Explicit Revocation Mechanism（Failing open）、確認日: 2026-10-03。RS-09#21, #35, #36）
[^21]: Jacob Gabrielson（Amazon Web Services）『Avoiding fallback in distributed systems』Amazon Builders' Library（Wayback Machine 2024-08-16 取得版）. https://web.archive.org/web/20240816011626/https://aws.amazon.com/builders-library/avoiding-fallback-in-distributed-systems/ （参照箇所: 分散 fallback の段落と代替策（データの事前 push）、確認日: 2026-10-03。RS-09#14）
[^22]: R. Pang et al. (Google)『Zanzibar: Google's Consistent, Global Authorization System』USENIX ATC 2019. https://www.usenix.org/system/files/atc19-pang.pdf （参照箇所: §2.2 Consistency Model、確認日: 2026-10-03。RS-07#4, #5）
[^23]: IETF OAuth WG (T. Looker, P. Bastian, C. Bormann)『Token Status List (TSL)』draft-ietf-oauth-status-list-21, 2026-06-21（Internet-Draft）. https://www.ietf.org/archive/id/draft-ietf-oauth-status-list-21.txt （参照箇所: Abstract, §1.1, §1.2, §11.5、確認日: 2026-10-03。RS-04#80）
[^24]: IETF Datatracker『draft-ietf-oauth-status-list』文書状態. https://datatracker.ietf.org/doc/draft-ietf-oauth-status-list/ （参照箇所: rev 21、IESG 状態 RFC Ed Queue、RFC Editor 状態 Awaiting First editor、RFC 番号なし、確認日: 2026-10-15。起草者が再確認し、レビュー担当（作成者以外）が同日に rev 21・RFC Ed Queue・Awaiting First editor・RFC 番号なし・Proposed Standard 予定を再照合した。2026-10-03 時点の状態は RS-04#80 と research/standards-status.md SS-B03）
[^25]: OpenID Foundation『Public Review Period for Proposed OpenID CAEP Interoperability Profile Final Specification』2026-07-27（2026-09-12 と 2026-09-15 に UPDATE 追記）. https://openid.net/public-review-period-for-proposed-openid-caep-interoperbility-profile-final-specification/ （参照箇所: 冒頭の UPDATE 2 件、確認日: 2026-10-03。RS-04#79）
[^26]: OpenID Foundation IPSIE WG (J. Schreiber, D. Zollner)『IPSIE AL SCIM 2.0 Profile Draft 00』2026-09-08. https://openid.net/specs/ipsie-al-scim-profile-1_0.html （参照箇所: AL1 User Deprovisioning、確認日: 2026-10-03。RS-14#37）
[^27]: Cloud Security Alliance『SaaS Security Capability Framework (SSCF)』v1.0.1, 2026-04-09. https://cloudsecurityalliance.org/artifacts/saas-security-capability-framework-sscf （参照箇所: IAM-SaaS の session 失効・一時停止の統制、確認日: 2026-10-03。RS-14#40）
[^28]: Okta Security (D. Bradbury)『Unauthorized Access to Okta's Support Case Management System: Root Cause and Remediation』2023-11-03. https://sec.okta.com/articles/2023/11/unauthorized-access-oktas-support-case-management-system-root-cause/ （参照箇所: Remediation 1〜4、確認日: 2026-10-03。RS-12#25）
[^29]: Google Threat Intelligence Group (A. Larsen ほか)『Widespread Data Theft Targets Salesforce Instances via Salesloft Drift』2025-08-26（2025-08-28 追記）. https://cloud.google.com/blog/topics/threat-intelligence/data-theft-salesforce-instances-via-salesloft-drift （参照箇所: 冒頭の Update 段落、Overview、Recommendations、確認日: 2026-10-03。RS-12#37, #38）
[^30]: Microsoft Learn『Tutorial - Develop a SCIM endpoint for user provisioning to apps from Microsoft Entra ID』ms.date 2026-09-15. https://learn.microsoft.com/en-us/entra/identity/app-provisioning/use-scim-to-provision-users-and-groups （参照箇所: 非ギャラリーアプリとして接続した場合の同期（"The process runs every 40 minutes"）、確認日: 2026-10-03。RS-03#79）
[^31]: Amazon Web Services『REL11-BP05 Use static stability to prevent bimodal behavior』AWS Well-Architected Framework Reliability Pillar. https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_withstand_component_failures_static_stability.html （参照箇所: 冒頭定義、Implementation guidance、確認日: 2026-10-03。RS-09#15）
[^32]: 本リポジトリ『高保証 PoC 実測レポート（系統 1）』POC-02 版 0.1（draft）. 12_poc/measurement-report.md （参照箇所: §2.3、§4.1 の TC-008・014・018・019・023・024・028 行、§6.3 の TC-028 行、§6.4、§8 の 5、確認日: 2026-10-15。AI エージェントによる自己実行の報告で、独立立会人・作成者以外の確認を経ていない。Gate 4 の証拠ではない）
[^33]: 本リポジトリ『高保証 PoC 系統 1 独立再現ログ』POC-04（仮）版 0.1（draft）. 12_poc/reproduction-log.md （参照箇所: §3 の TC-008・TC-014 行、§3.1、確認日: 2026-10-15。実装者と別の AI エージェントが同じ機械で再実行した記録で、独立立会人による再実行ではない。Gate 4 の証拠ではない）
[^34]: 本リポジトリ『模擬パネル報告』TRC-10 版 0.4. traceability/mock-panel-report.md （参照箇所: §4.2 ラウンド 7、§5.1、確認日: 2026-10-15。模擬パネルは AI エージェントによる自己レビューであり、実在の CTO/CISO の決裁ではない）

---

## レビュー記録

> 実施: 2026-10-15。AI エージェント（Claude）による作成者以外の独立レビューであり、実在する CTO/CISO の決裁ではない（CONVENTIONS §8）[D]。
> 観点: (1) 主要 ADR・reconciliation-notes との整合、(2) 脚注の主張と原典（規範の強度、版・状態）、(3) 対応表の網羅、(4) 選択肢が藁人形でないか、(5) 根拠のない数値・禁止表現・主張タグ。

### 確認した範囲

- 主要 ADR の参照先を原文で照合した: ADR-005（D1-1〜D1-7、D3 の U2・Lmin・感度表、D4、D7-2・D7-3・D7-6・D7-7、D8-5、D9-2〜D9-4、NA-05・NA-08、§3.1）、ADR-007（D7-36・D7-37・D7-39、RR7-02、TC-07-03）、ADR-010（D-13〜D-21、決裁案 4・5、H-05・H-12）、ADR-011（D1-2 の 6 規則、D3-6）、ADR-013（D13-13〜D13-15、D13-24〜D13-26、D13-35、KD13-6、TC-13-02・-09・-24）、ADR-021（D21-14c、`status` 予約、`sub_id`）、ADR-022（D-2 の SSF/CAEP/RISC 行と OIDC/OAuth profile 行）、ADR-001（D3 主体台帳）、reconciliation-notes（C-35、U-01・U-03・U-04、§3.2）[D]。
- 02_requirements（REQ-03 §3.1 の「allow の再利用」「token の失効状態確認」行、identity-lifecycle の INV-6・INV-7・M-03・P-06・S-07・§9.3・§16.3）、01_governance（stop-authority の S2・S4・S5・P4・§4.4、kri の K-17）、03_threat-model（T-ID・ATK-ID の存在と名称）を照合した [D]。
- 脚注は RS-03・RS-04・RS-06・RS-07・RS-08・RS-09・RS-12・RS-14・RS-17 の該当項目と standards-status.md で照合した [D]。research ノート外の 2 件は原典を取得した。OIDC Back-Channel Logout 1.0（Final, errata set 1, 2023-12-15）の §2.4（sub か sid を MUST、logout+jwt の型付けを RECOMMENDED）、§2.5（回復可能な失敗が疑われる場合以外は再送 SHOULD NOT）、§2.7（offline_access なしの refresh token は失効 SHOULD、ありは通常失効 SHOULD NOT、session の特定方法は実装依存）は N-12 の記述と一致した [N][^12]。Token Status List の Datatracker は rev 21・RFC Ed Queue・Awaiting First editor・RFC 番号なしで、[^24] と一致した [N][^24]。
- 禁止表現は検出されなかった [D]。

### 修正した事項（13 件）

| # | 箇所 | 指摘 | 修正 |
|---|---|---|---|
| 1 | D6-05 | 「失効 epoch」の同定根拠に reconciliation-notes C-35 を挙げていたが、C-35 は失効 epoch とテナント剥奪フェンスが別の検査であることを定めた項目である | 同定根拠を ADR-013 D13-26 の用語の対応と ADR-010 の注記に改め、フェンスとの区別（C-35）を追記した |
| 2 | D6-10 | SDK 判定 cache の再利用条件が ADR-013 D13-24 の known-good の条件（policy の最低許容版を含む 4 条件）と揃っておらず、上限 B と B_rs の関係も未記載だった | known-good の 4 条件と同じにし、B と B_rs の小さい方を最大齢にすると明記した |
| 3 | D6-04 | SRS の "you may want to" を「推奨する」と強めて書いていた（RS-09#21） | 「timeout での fail-open の代わりに挙げる」に改めた |
| 4 | D6-06 | 範囲境界の件数の上限が人間の主体だけで、AI エージェント（A-014）と個別 sid の境界を数えていなかった | A-014 と A-006（86.5 万）の桁を加え、workload の主体数が前提台帳にないことを明記した |
| 5 | 案B 欠点 | 照会量の式が ADR-005 §3.1 案D の式「16,804×(1＋k)×miss」と違っていた | ADR-005 の式に合わせた |
| 6 | 案A 可逆性 | 「事実上不可逆」は ADR-005 §3.1 案A の「不可逆寄り」より強かった | ADR-005 の表現と理由に揃えた |
| 7 | 案D 費用 | 案C でも受信義務を負うサービスがあるのに、案D の費用だけを全数で示し比較が偏っていた（藁人形の疑い） | 案C との差分が SSF 固有の作業と義務のないサービスの分であることを追記した |
| 8 | §1.3 | 本文で使う A-028・A-040・A-112 が前提表になかった | 3 行を追加した |
| 9 | N-10 | MUST NOT 側の例外（発行基盤が寿命を判定できない場合）が欠落していた（RS-06#26） | 例外を追記し、MUST 側の例外の文言を原文の趣旨に合わせた |
| 10 | D6-12 | SSCF を [N] で引くが、拘束力のない枠組みであることの記載がなかった（SS-I13） | 拘束力がなく比較軸として使う旨を追記した |
| 11 | [^10]・[^11]・[^14] | Internet-Draft の状態（CONVENTIONS §3 の必須事項）と ASVS の Release tag が未記載だった | SS-B16・SS-B17 の状態と、ASVS の tag v5.0.0_release を記した |
| 12 | §2.12 | identity-lifecycle §16.3 が送受信の対象に挙げる RISC recovery-activated が ADR-022 v1 と本書の一覧にない不整合を記していなかった | L6-8 を追加し、残課題に加えた |
| 13 | 対応表・メタ情報・§1.4 | 失効・剥奪に関係する R-144・R-168・R-171・R-238・R-282、G-055・G-102・G-118 が漏れていた | 対応表に 8 行を追加し、メタ情報と §1.4 の関連一覧を更新した。あわせて [^12]・[^24]・作成方法・残課題の独立検証の記載を更新した |

### 修正しなかった事項（未解決・申し送り）

- U1 RFC 7009 の脚注 [^2] の参照節「§3（Implementation Note）」は RS-04#69 の範囲で妥当と判断したが、節番号は原典で再照合していない [D]。
- U2 NA-006-3（＋2〜3 FTE）と NA-006-5（1〜4 人週）は根拠が弱い仮置きのままであり、前提台帳への登録と H6-10 での実測が要る [D]。
- U3 §4.2 の比較表は起草者の推論であり、主要 ADR と同じ 3 レンズ×判定者 3 名の採点は未実施である（Phase 4）[D]。
- U4 SDK 判定 cache への PDP 署名の要否は U-04（ADR-013 KD13-6）の決裁待ちである（L6-6）[D]。
- U5 L6-1・L6-2・L6-4・L6-8 は主要 ADR・identity-lifecycle の改版を要し、本書からは編集していない [D]。
- U6 SSF 1.0 等の Final 承認の告知日は RS-04#77（2025-09-02）と RS-14#62（2025-09-16）で食い違う。本書は Published 日付（2025-08-29）だけを使うので結論に影響しないが、research 側での整理が要る [D]。

### PoC/R7反映（版 0.2）

> 模擬パネルは AI エージェントによる自己レビューであり、実在の CTO/CISO の決裁ではない [D]。

| 指摘・入力 | 対応 |
|---|---|
| 模擬パネル ラウンド 7（cto・ciso・sre）: POC-02 の結果が設計文書に入っていない [D][^34]。POC-02 §4.1、§6.3 の TC-028 行、§6.4 の TC-008・TC-014・TC-019・TC-023・TC-024 行、§8 の 5。独立再現ログ §3・§3.1 | §7.1.1 に結果と含意の表、§8 に 2 項目、残課題に 1 項目を加えた。PoC の値は自己実行の参考値で、Gate 4 の証拠にしていない |
