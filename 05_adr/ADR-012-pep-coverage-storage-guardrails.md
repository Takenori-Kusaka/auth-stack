# ADR-012 PEP の配置・enforcement coverage の機械検証・ストレージ側 tenant guardrail・非同期経路の再認可

> 文書ID: ADR-012 / 版: 0.1 / 状態: draft（ADR 状態: proposed＝決裁前）/ 最終更新: 2026-10-15
> 可逆性: **可逆（条件付き・非対称）**。可逆なのは、強制点の実装（gateway 製品、mesh 製品、sidecar の有無）、静的解析ツールとルール、実行時突合の集計基盤、KRI の閾値、検索・キャッシュ・object storage の製品である。不可逆側に属するのは次の 4 点で、変更すると 300 サービス・約 1.2 万 entry point の改修になる [D][A-050, A-055]。(1) entry point 台帳の宣言形式（IDL の拡張属性の名前と意味。DL-70・ADR-021 の名前空間に従う）。(2) PEP が出す enforcement 記録と span 属性の欄（decision_id との結合キー。ADR-011 D8・ADR-014）。(3) 非同期メッセージの認可 envelope の欄（起点主体・tid・一貫性トークン・enqueue 時 decision_id）。メッセージは滞留・再処理されるため、旧形式の読取りを長期に残す必要がある。(4) テナント表の tenant 列と DB 側テナント文脈の規約（列名、`SET LOCAL` で設定する変数名、RLS ポリシーの形）。緩める方向の変更（deny-by-default を外す、RLS を外す）は破壊的変更として扱う。
> DEC-3 対象: いいえ（traceability/deliverables.md §5 の ADR-012 行で DEC-3 列は「—」）。ただし不可逆側 (1)〜(3) は連携契約の一部として DEC-8 の凍結対象に含める提案とする（§9）。依存先の ADR-013・ADR-021・ADR-022 は DEC-3 対象である。
> 対応要求: R-059, R-060, R-061, R-062（deliverables.md §5 の ADR-012 行）／R-250, R-254, R-262, R-269（R-requirements.md で 04_architecture/pep-contract.md を対応成果物に含む行。本 ADR は DL-15 の設計判断を記録する）、R-058（対応成果物は DL-10 dfd-entry-points.md と as-is-inventory.md。本書は棚卸しの方式を供給する）／G-082, G-072, G-105, G-136（DL-15・DL-57 を対応成果物に含む行）、G-020（全 ADR の必須節）。関連: R-011, R-065, R-071, R-143, R-164, R-168, R-172, R-205, R-242, R-253, R-273／G-050, G-078, G-080, G-083, G-099, G-102, G-103, G-114, G-121, G-122, G-124, G-125, G-128, G-129, G-135, G-140, G-142（全件と閉じ方は末尾の対応表。独立レビューで R-205・R-242・R-273・G-080・G-102・G-124・G-128・G-129・G-140 を追加）
> 依存文書: CONVENTIONS.md, traceability/deliverables.md, traceability/R-requirements.md, traceability/G-goal-criteria.md, traceability/claims-ledger.md（CL-0109, CL-0110, CL-0155, CL-0157, CL-0197, CL-0241, CL-0252）, traceability/dissent-log.md（DS-11）, 01_governance/assumptions-register.md, 01_governance/kri.md（K-01, K-03, K-05, K-06）, 01_governance/stop-authority.md（S1, S3）, 01_governance/business-impact-analysis.md（B13）, 02_requirements/operation-risk-tiers-assurance.md（REQ-03 §2・§3.6・§3.7）, 02_requirements/principal-catalog.md（PC-14）, 02_requirements/identity-lifecycle.md（INV-6）, 02_requirements/tenant-lifecycle.md（INV-1）, 03_threat-model/attacker-model.md, 03_threat-model/threat-catalog.md, 05_adr/ADR-005, ADR-010, ADR-011, ADR-013, ADR-021, ADR-022, 05_adr/reconciliation-notes.md, research/RS-07, RS-08, RS-12, RS-17（各 verification 記録を含む）, research/standards-status.md
> 作成方法: AI エージェント（Claude）が上記の文書と調査ノートを読み、単独で起草した。主要 ADR 8 本のような起草レンズ 3 本と判定者 3 名の模擬パネルは本書では行っていない。本書の評価（§4）は起草者の自己評価であり、実在の CTO/CISO の判定・決裁ではない（CONVENTIONS §8）[D]。
> 表記: 決定 D12-xx、新規仮定 NA-012-x、試験案 TC-012-xx（仮番。DL-22 で採番）、残余リスク RR12-xx、主要 ADR との論点 L-xx と書く。表のセルのうちタグのないものは設計推論 [D] であり、この注記で個別のタグに代える。事実を述べるセルには個別にタグと脚注を付けた。

**要旨（結論）**

- **PEP の配置**: 強制点を 3 層に分け、object 単位の判定（BOLA 対策）はリソースを知るサービス内の PEP だけが担う [D]（RS-08#38）。edge gateway は外部 token の検証・信頼ヘッダの除去・登録済み route だけを通す既定拒否を、mesh（sidecar）は workload の相互認証と allow-nothing 既定を担い、どちらも object 単位の coverage には数えない [D]。sidecar を PEP にする構成は、SDK を入れられないレガシーへの期限付きの例外に限る [D]。
- **deny-by-default**: gateway の route、mesh の AuthorizationPolicy、PEP SDK、DB の RLS、共有キャッシュの ACL のすべてで既定を拒否にし、その設定の存在を CI と本番構成の走査で検査する [D]。Istio は ALLOW ポリシーが 1 つもない workload への要求を許可し [V][^29]（RS-08#36）、Redis の既定ユーザーは全キー・全コマンドに到達できる [V][^45] ため、既定値に任せない [D]。
- **全 entry point の機械的棚卸し**: IDL（OpenAPI・proto・GraphQL・AsyncAPI・ジョブ定義）から静的に抽出した宣言集合と、SERVER／CONSUMER span と sampling から独立した計数で得た観測集合を突き合わせ、DB 直接接続は DB 側の接続元ロールで別系統に数える [D]（RS-08#27）。未宣言で観測された入口と台帳にない DB 直接接続を K-01(a) とし（kri.md の K-01(a) の定義）、配備ゲートと本番の日次走査で 0 件を条件にする [D]。宣言済みで未観測の入口は K-01(a) に数えず、期限付きで合成試験による観測か廃止を求める [D]。
- **coverage の CI 自動検証**: 自社 PEP 契約の呼出し規約に合わせたカスタム静的ルールを CI の必須ゲートにし、ルールの検出力は変異体で測る [D]（RS-08#32）。実行時は、入口ごとに「認可判断（decision_id）なしで完了した処理」を数え、K-01(b) として 0 件を目標にする [D]（RS-08#35）。判定は SDK に依存させず契約（enforcement 記録）で定義し、SDK を提供しない言語のサービスにも同じ検査を課す [D]（ADR-022 G-140）。
- **ストレージ側 tenant guardrail（二重防御）**: 責任を「ストレージはテナント境界だけ、PEP は object・field 単位」と分ける [D]（RS-08#43）。PostgreSQL は ENABLE＋FORCE RLS、非 owner かつ NOBYPASSRLS のアプリロール、security_invoker の view、`SET LOCAL` だけのテナント文脈を必須にする [V][^11][^12][^13][^14][^15][D]（RS-08#40〜#51）。object storage は IAM 条件付きの短命資格情報で区画を二重化し、検索インデックスとベクトルストアはテナント間を index（または cluster）の分離で担い、DLS はテナント内に限る [D]（RS-08#55, #56, #63, #75）。キャッシュはテナント区画をキーに含める規約を共通ライブラリと静的ルールで強制する [D]。
- **非同期経路の再認可**: queue consumer・batch・webhook 配信は独立した entry point として PEP を持ち、実行時に起点主体の権限で再 Check する [N][^1][D]（RS-08#57, #61、RS-17#35）。write 以上は最新強制、read-sensitive は ADR-010 D-13 の下限（内容トークンと剥奪フェンスの新しい方）以降で評価する [D]。滞留中に剥奪されたメッセージは拒否してデッドレターへ送り、監査に記録する [D]。
- **bypass 試験**: entry point 台帳から生成する cross-tenant property test を CI の必須ゲートにし、ネットワーク・ヘッダ・ストレージ・非同期の迂回を本番相当環境で試し、独立評価者の pentest（DL-59）で内部の位置（ATK-06）からも試す [D]（RS-08#39）。
- **主要 ADR との論点**: 7 件ある（§9.2。L-07 は独立レビューで追加）。主なものは、ADR-011 D5-4「PEP は SDK を通してだけ PDP を呼ぶ」と ADR-022 D-4・G-140「SDK なしで契約だけで連携できる」の食い違い（L-01）と、REQ-03 J10「未分類の操作は拒否」と ADR-013 D13-28「宣言のない entry point は privileged として扱う」の読み分け（L-02）である [D]。

---

## 1. 文脈

### 1.1 解くべき問題

- 旧提案は「PEP は bypass 不能であり、既定で deny とする」と書いたが、証明のない性質の主張であった（CL-0110、処置「要実測」）[D]。主張台帳は「全 entry point の inventory、coverage の機械的検証、bypass test で示すまで目標として書く」とした [D]。
- レビューは承認条件 4 として「全 entry point の PEP coverage を機械的に検証でき、DB/storage にも tenant guardrail がある」ことを求めた（R-269、構成要素は R-058〜R-062）[D]。テナント境界を tid・resource-derived tenant・ストレージ境界・サービス認可で多層化する方針は「強い」と評価されており維持する（R-250、CL-0252）[D]。
- 想定規模では entry point が約 1.2 万あり、手作業の棚卸しは変更に追随できない [D][A-055]。既存サービスの 70% はテナント分離をアプリ層の検索条件だけで行っていると仮置きされている [D][A-112]。

| # | 問い | 主な R/G |
|---|---|---|
| Q1 | PEP をどこに置くか（gateway／サービス内 SDK／sidecar）。deny-by-default をどの層で担保するか | R-254, R-262, R-250 |
| Q2 | 全 entry point をどう機械的に棚卸しするか（IDL の静的抽出×実行時トレースの突合、DB 直接接続） | R-058, R-164, G-082, G-050 |
| Q3 | enforcement coverage を CI でどう自動検証するか（静的ルール、decision_id の実行時検査） | R-059, R-062, G-072, G-082 |
| Q4 | DB RLS と object storage・検索インデックス・キャッシュの tenant guardrail をどう二重化するか | R-061, R-062, G-082, G-105 |
| Q5 | 非同期経路（queue、batch、webhook、長時間ジョブ）でいつ・誰の権限で再認可するか | R-058, R-143, G-136 |
| Q6 | bypass をどう試験するか（自前と第三者） | R-060, R-065, R-172, G-083 |

### 1.2 制約

**規範・標準（強度は原文どおり）**

| # | 内容 | 強度・状態 | 根拠 |
|---|---|---|---|
| N-1 | 機能・データ単位の明示許可（ASVS v5.0.0-8.2.1、8.2.2）。8.2.2 は IDOR・BOLA の緩和を目的に挙げる | L1 | [N][^1]（RS-08#3） |
| N-2 | 認可規則は信頼できるサービス層で強制し、改ざん可能なクライアント側の制御に依存しない（8.3.1） | L1 | [N][^1]（RS-08#4） |
| N-3 | マルチテナントのアプリは cross-tenant 統制を使う（8.4.1） | L2 | [N][^1]（RS-08#5） |
| N-4 | 中継サービスではなく起点主体の権限で判断する（8.3.3）。即時反映できない場合の代替策は情報漏えいを緩和しない（8.3.2） | L3 | [N][^1]（RS-08#57） |
| N-5 | 確認とそれに依存する動作を原子的に行う（15.4.2、TOCTOU） | L3 | [N][^4]（RS-08#58） |
| N-6 | 失敗した認可試行の記録（L2）。L3 では全認可判断の記録 | L2／L3 | [N][^2]（RS-08#34） |
| N-7 | 中間層が設定する HTTP ヘッダをエンドユーザーが上書きできない（4.1.3） | L2 | [N][^3]（RS-08#22） |
| N-8 | ASVS V8 には entry point の棚卸しや enforcement coverage の自動検証を直接求める要件がない | 当方の全文確認 | [N][^1]（RS-08#6） |
| N-9 | 強制機構は既定で全拒否であるべき（should）。全業務機能から呼ばれる一貫した認可モジュールを持つべき | 推奨（小文字 should） | [N][^6]（RS-08#11） |
| N-10 | API ホストと連携サービス・データフローの棚卸し。文書の自動生成を CI/CD に組み込む | 推奨 | [N][^7]（RS-08#21） |
| N-11 | AC-25（参照モニタ）は「常に呼び出され、改ざんされず、完全性を保証できるほど小さい」機構を求める。SP 800-53B の LOW・MODERATE・HIGH のどのベースラインにも含まれない | 統制カタログ（tailoring で追加） | [N][^8][^9]（RS-08#13, #14） |
| N-12 | AC-4 は情報の流れの統制、AC-3(9) は外部への放出条件。検索・DWH・ML への複製はこの領域 | 統制カタログ | [N][^8]（RS-08#15） |
| N-13 | SA-11(1) 静的解析はどのベースラインにも含まれない | 統制カタログ | [N][^8][^9]（RS-08#18） |
| N-14 | PDP/PEP はトラフィック上の自らの位置より先では追加の方針を適用できず、暗黙の信頼ゾーンはできる限り小さくしなければならない（must） | final | [N][^10]（RS-08#19） |
| N-15 | OpenAPI 3.2.1: operation の `security` に空 requirement `{}` を含めると任意になり、空配列にすると top-level の宣言が外れる | final（2026-09-10） | [N][^27]（RS-08#23） |
| N-16 | OpenTelemetry Trace API の SpanKind: SERVER と CONSUMER は外部から開始された入来要求の処理を表す | Stable（v1.61.0） | [N][^28]（RS-08#26） |
| N-17 | Sampler が DROP を返すと span は記録されない | 規定 | [N][^43]（RS-10#22） |
| N-18 | CloudEvents 1.0.2: context attributes に機微情報を載せるべきでない（SHOULD NOT）。Auth Context 拡張は「純粋に情報提供で CloudEvents を保護する目的ではない」 | SHOULD NOT／拡張は 1.0.3-wip | [N][^39][^40]（RS-17#32, #33） |
| N-19 | Transaction Tokens は Internet-Draft（-11、WG Consensus: Waiting for Write-Up、IESG 未提出、確認日 2026-10-03）。Txn-Token は短命で、batch・オフライン処理でも短命のまま | draft | [N][^33]（RS-08#59、standards-status SS-B04） |
| N-20 | AuthZEN 1.0: decision が false なら要求を進めてはならない（MUST NOT）。PEP が付けた要求 ID を PDP は応答に含める | Final（2026-01-11） | [N][^48]（RS-07#63, #66） |

- OWASP 文書（ASVS、API Top 10、Cheat Sheet、WSTG、LLM Top 10）はコミュニティ文書であり、ISO・RFC・NIST と同等の規範ではない（RS-08 §6-2）[D]。本書は強度を原文の表現のまま写した [D]。
- 棚卸しと coverage 検証を ASVS で受入基準にするには V8 と V13・V16 の組合せと自社の追加要件が要り（RS-08#6）、AC-25・SA-11(1) を採るかは当社の tailoring 判断である [D]（RS-08#14, #18）。したがって K-01 を許容度の指標にするのは規範の写しではなく当社の設計判断である（01_governance/kri.md §4.2 と同じ立場）[D]。

**製品・基盤の事実（設計に効くもの）**

| 事実 | 根拠 |
|---|---|
| Istio の AuthorizationPolicy は CUSTOM→DENY→ALLOW の順に評価し、ALLOW ポリシーが 1 つもない workload への要求は許可する。公式文書は allow-nothing から始めて ALLOW を段階的に追加することを良い慣行とする | [V][^29][^52]（RS-08#36） |
| Envoy の ext_authz フィルタは、`failure_mode_allow` が true だと認可サービスとの通信失敗・5xx でも要求を受け入れ、false だと Forbidden で拒否する。既定は false | [V][^44]（research 外。起草者が 2026-10-15 に確認し、独立レビューで同日に原典を再確認） |
| CodeQL の標準クエリで Web endpoint の認可欠落そのものを対象とするのは C# の 2 件だけ（precision medium）で、Semgrep の公式例・登録ルールもデコレータ・属性の欠落や unscoped find に留まる | [V][^25][^24]（RS-08#28〜#31） |
| PostgreSQL 18: RLS を有効にした表にポリシーがなければ既定拒否。superuser と BYPASSRLS ロールは常に迂回し、table owner は FORCE しない限り迂回する。参照整合性検査は常に RLS を迂回し covert channel に注意が要る | [V][^11]（RS-08#40, #44） |
| FORCE ROW LEVEL SECURITY は既定で無効。CREATE ROLE の既定は NOBYPASSRLS | [V][^12][^13]（RS-08#41） |
| view は既定で view owner のポリシーと権限で評価され、`security_invoker = true` で呼出し元で評価される | [V][^14]（RS-08#45） |
| `SET` は session 終了まで残り、`SET LOCAL` はトランザクションの終わりまで。`set_config(..., true)` は現在のトランザクションだけ。`current_setting` は設定が存在しなければエラー（missing_ok を渡した場合だけ NULL） | [V][^15][^16]（RS-08#48） |
| PgBouncer の transaction pooling では SET/RESET が非対応で、`server_reset_query` は使われない | [V][^18][^19]（RS-08#49） |
| あるロールで計画したクエリを別ロールで再利用すると RLS が誤適用される CVE が修正されている（CVE-2024-10976、CVE-2023-2455、先行の CVE-2016-2193） | [V][^17][^49]（RS-08#46, #47） |
| AWS の PostgreSQL マルチテナント指針の例は ENABLE だけで FORCE を含まない | [V][^20]（RS-08#42） |
| pg_dump は既定で `row_security` を off にし、権限が足りなければエラーにする。完全なバックアップを取る主体は RLS を迂回できる特権ロールになる | [V][^38][D]（RS-08#76） |
| AWS IAM はプリンシパルのタグをリソース条件に使える。セッションタグを渡すには `sts:TagSession` の許可が要る | [V][^21][^22]（RS-08#55） |
| S3 の署名付き URL は保持者にアクセスを与えるベアラトークンで、有効期限まで何度でも使え、CLI/SDK では最長 7 日 | [V][^23]（RS-08#81） |
| Elastic の DLS は許可外文書を返さないが、件数・語彙・関連度スコアの統計から許可外文書の情報を知り得る | [V][^35]（RS-08#62） |
| BigQuery は行レベルアクセスポリシーがクエリ実行時間の side channel を受け得るとし、総行数を秘匿すべき場合は分離テーブルを推奨する | [V][^36]（RS-08#69） |
| Redis の既定構成では既定ユーザーが `nopass ~* &* +@all` で、新しい接続は自動で既定ユーザーとして認証される。key pattern は引数に key を取らないコマンド（FLUSHALL 等）を制限しない。読取り権限の評価では side channel は考慮されない | [V][^45]（research 外。起草者が 2026-10-15 に確認し、独立レビューで同日に原典を再確認） |
| SpiceDB の `at_least_as_fresh` は指定した ZedToken の時点以上に新しいデータで計算することを保証する。enqueue 時点の ZedToken を渡すだけでは enqueue 後の剥奪の反映は保証されない | [V][^34][D]（RS-08#60, #61） |

**規模・組織（仮定）**

| 項目 | 値 | 出典 |
|---|---|---|
| 依存サービス・ドメイン・開発組織・開発者 | 300・30・25 組織 60 チーム・1,500 人 | [A-050][A-051][A-052][A-053] |
| entry point 総数 | 1.2 万（範囲 4,500〜3 万） | [A-055] |
| 既存の認可実装 | 自前 240 サービス（80%）、テナント分離をアプリ層の検索条件だけで行うサービス 70% | [A-112] |
| 認証・認可プラットフォーム | 24 FTE。うち PEP SDK・開発者支援 4、SRE 6 | [A-054] |
| テナント数・最大テナント | 1 万・10 万ユーザー | [A-007][A-009] |
| 認可 Check | 基準ピーク 42,009/秒 | [A-045] |
| edge 呼出 1 件あたりの Check | 2.5（gateway 段の粗い判定 1＋resource-local PEP 1＋子リソース・フィールド 0.5） | [A-025] |
| decision event | 平均 1KB・記録率 100%（容量上限の計算用） | [A-037] |

### 1.3 攻撃者モデル・脅威と本書の統制

| 類型（attacker-model.md） | ADR-012 で効く能力 | 本書の統制 | 強制の場所 |
|---|---|---|---|
| ATK-03 侵害された一般ユーザー | 他テナント・他利用者の ID を指定した要求（BOLA） | D12-04 三者一致、D12-21 RLS、D12-41 cross-tenant property test | サービス内 PEP・DB |
| ATK-02 悪意あるテナント管理者 | 自テナントの権限からの越境、テナント文脈ヘッダの偽装 | D12-02 信頼ヘッダの除去、D12-04 resource-derived tenant | edge・PEP |
| ATK-06 侵害された microservice | gateway を迂回した直接到達、全テナント権限の DB 接続、任意テナントのタグでの資格情報取得 | D12-03 mesh の allow-nothing、D12-21 非 owner・NOBYPASSRLS、D12-24 タグ付与主体の最小化 | mesh・DB・token vending |
| ATK-11 DB read 権限者 | バックアップ・レプリカ・DWH からの全テナント読取 | D12-30 特権データ経路の棚卸しと KRI（統制の本体は DL-57） | DB・データ基盤 |
| ATK-17 内部不正の開発者 | PEP 呼出しの削除、fail-open 実装、静的ルールの無効化 | D12-15 必須静的ルール、D12-17 実行時突合、D12-19 ルール変更の二者レビュー | CI・実行時 |
| ATK-19 変更と自動化の誤り | mesh ポリシーの削除、RLS の無効化を含む migration の全域配備 | D12-19 本番構成の定期走査、ADR-013 D13-30 の wave 配布 | CI・走査 |

| 脅威（threat-catalog.md） | 本書の主な応答 |
|---|---|
| T-018 gateway・PEP の迂回 | D12-08〜D12-12（棚卸しと差分）、D12-03（mesh 既定拒否）、TC-012-01・TC-012-10・TC-012-15 |
| T-020 BOLA／IDOR | D12-01・D12-04（サービス内 PEP と三者一致）、D12-21（RLS）、TC-012-08 |
| T-021 tenant confusion | D12-04（resource-derived tenant）、D12-33（consumer での tid と資源テナントの照合） |
| T-022 PEP の欠落 | D12-13〜D12-19（静的ルール・実行時突合・本番走査） |
| T-023 PEP の fail-open | D12-06・D12-07（既定拒否と `failure_mode_allow` の検査）。fail-mode の意味は ADR-013 D13-23〜D13-28 に従う |
| T-024 非同期処理の enqueue 時判断だけによる実行 | D12-31〜D12-36 |
| T-026 プロパティ・子リソース単位の認可漏れ | D12-01（field 単位は PEP の責任）、D12-15 ルール R-08 |
| T-030 判定記録の欠落 | D12-17（PEP 記録と facade の decision event の両方向突合） |
| T-076 一覧・検索からの漏えい | D12-26（テナント間は index 分離）。一覧の方式は ADR-025 |
| T-077 PEP 外データからの漏えい | D12-25（署名付き URL）、D12-30（特権データ経路）。統制の本体は DL-57 |
| T-078 RAG・ベクトル DB からの漏えい | D12-28 |

### 1.4 前提と新規仮定

- 依存する前提: A-007, A-009, A-025, A-037, A-045, A-050〜A-055, A-062, A-081, A-101, A-104, A-110, A-112 [D]。01_governance/kri.md の KA-1（依存サービスは PEP SDK の導入と同時に SERVER/CONSUMER span を出す計装を導入できる）にも依存する [D]。
- 新規仮定（前提台帳へ追加要）NA-012-1: coverage 検証の基盤側工具（IDL 抽出器、実行時突合の集計、静的ルール群、例外台帳、本番構成の走査器）の構築に 3〜5 FTE×12〜18 か月、維持に 2〜3 FTE/年を要する [D]。A-054 の PEP SDK・開発者支援 4 FTE の外数と置く。RS-08#29 が示すとおり既製ルールでは足りずカスタムルールが前提になること、対象言語が NA-022-1 の 3 言語＋SDK のない言語であることからの起草者の見積りで、外部の実測値ではない [D]。
- 新規仮定（前提台帳へ追加要）NA-012-2: アプリ層の検索条件だけでテナント分離を行うサービス（A-112 の 70%、約 210 サービス）への DB 側 guardrail の後付けは、1 サービスあたり 0.5〜2 人月（合計 105〜420 人月）を要する [D][A-050, A-112]。表の tenant 列の有無、ORM の種類、接続プールの方式で幅が出る。DL-50 の As-Is 棚卸しで置き換える [D]。
- 新規仮定（前提台帳へ追加要）NA-012-3: 依存サービスの業務データの主たる関係 DB は PostgreSQL 系である。他の DB を使うサービスは D12-21 の同等性評価の対象になる [D]。比率は DL-50 で測る。
- 新規仮定（前提台帳へ追加要）NA-012-4: テナント別の検索 index（または index 群）を、1 cell あたりの収容テナント数（A-007 を ADR-013 の cell 数で割った値）で運用できる [D]。運用可能性は TC-012-12 で確かめる。
- 新規仮定（前提台帳へ追加要）NA-012-5: 実行時観測の窓（N 日）の間に一度も呼ばれない entry point（break-glass・年次バッチ等）は全体の一部に限られ、それらには合成試験で観測を作れる [D]。比率は TC-012-01 で測る。
- 新規仮定（前提台帳へ追加要）NA-012-6: 300 サービス [A-050] のうちテナントデータを持つサービスは半数（150）とする [D]。案D の物理単位の試算（1 万テナント [A-007] × 150 ＝ 150 万単位）だけに使う。DL-50 の As-Is 棚卸しで置き換える [D]（独立レビューで仮定として明示）。
- 新規仮定（前提台帳へ追加要）NA-012-7: §3 の比較用の費用概算（案A の IDL 拡張属性の付与を 1 entry point あたり数分〜数十分、案B の基盤側 2〜3 FTE と依存サービス側 1 サービスあたり数人日、案C の基盤側 1〜2 FTE と依存サービス側 1 サービスあたり 0.2〜0.5 人月）は起草者の見積りで、外部の実測値も前提台帳の値もない [D]。選択肢の順位付けは費用の桁にだけ使い、DL-43・DL-50 の見積りで置き換える [D]（独立レビューで仮定として明示）。

### 1.5 関連研究

RS-08#1〜#82（とくに #3〜#6, #11, #13〜#19, #21〜#27, #28〜#39, #40〜#56, #57〜#61, #62〜#64, #69〜#72, #75, #76, #79, #81, #82）と §5.1・§5.2。RS-17#32〜#40, #47〜#50, #79〜#80 と §5.1 の P-04・P-10・P-15・P-12 派生行、§5.2 の ADR-012 行。RS-07#4, #5, #26, #27, #63, #66, #76, #78。RS-12#53。RS-10#22。研究ノートにない原典として、Envoy ext_authz の `failure_mode_allow` [^44] と Redis ACL [^45] を本書の起草者が 2026-10-15 に取得して確認し、独立レビューで同日に原典を再確認した（research ノートへの収録と照合ログへの記録は未了。§残課題）。Istio の allow-nothing の慣行は RS-08#36 が引く Security concepts の頁 [^52] による。

---

## 2. 決定

### 2.1 PEP の配置と deny-by-default（Q1）

- **D12-01（強制点の 3 層と責任分担）** 強制点を次の 3 層に分け、責任を重ねない [D]（RS-08#38）。
  - 層 E（edge gateway、cell ごと。ADR-005 D1-2）: 外部 token の検証、信頼ヘッダの除去と付与、登録済み route だけを通す既定拒否、機能単位（BFLA 寄り）の粗い判定。
  - 層 M（mesh・sidecar）: workload の相互認証（ADR-009）、呼出し元 workload の許可リスト、allow-nothing の既定。
  - 層 S（サービス内 PEP）: L0 のテナント照合（ADR-011 D1-1）、object・field 単位の判定、PDP facade の呼出し、enforcement 記録の出力。
  - object 単位の判定はリソースを知る層 S だけが担い、層 E・層 M の判定は object 単位の coverage に数えない [D]。ASVS 8.2.2（L1）と API1:2023 が object 単位の判定を求め、API1:2023 は token から取り出した利用者 ID と ID パラメータの比較だけでは不十分と明記するからである [N][^1][^5]（RS-08#3, #8）。API Security Top 10 は awareness 文書で、規範語は小文字の should である（RS-08#7）[D]。
- **D12-02（層 E の必須事項）** edge は次を行う [D]。
  - 中間層が付けるテナント文脈・利用者ヘッダ（例: X-Tenant-ID）を外部から受け取った場合は除去し、自ら付け直す [N][^3][D]（RS-08#22）。
  - 後段へ渡す主体・テナントの情報は署名付き token（内部 token・Txn-Token。ADR-005・ADR-009）で渡し、未署名ヘッダを後段の判定根拠にしない [D]。IAP・ALB の公式文書も、迂回された場合に未署名の ID ヘッダが偽造され得るため署名付きヘッダの検証を求めている [V][^47]（RS-17#79, #80）。
  - 台帳（D12-08）に登録された route（method＋path template、gRPC method、GraphQL operation）以外は 404 で拒否する。
- **D12-03（層 M の必須事項）** mesh を使う workload は namespace 単位で allow-nothing の AuthorizationPolicy を持ち、呼出し元 workload ごとの ALLOW を追加する方式にする [V][^29][D]（RS-08#36）。allow-nothing の不在、ALLOW のない workload、mesh 外から到達できる Service を CI と本番構成の走査で検出する（ルール R-06）[D]。mesh を使わない基盤（VM・PaaS）では、ネットワーク層の既定拒否と mTLS で同等の性質を示し、同じ走査対象にする [D]。
- **D12-04（三者一致）** 層 S は、token の `tid`、資源の正本（業務 DB・資源レジストリ）から導いた資源のテナント、PDP への要求の `resource.properties` のテナントの三者一致を、PDP 呼出しの前に照合する（ADR-011 D1-1 の L0、ADR-005 V9、ADR-021 D21-14）[D]。資源のテナントを導けない場合は評価不能として拒否する（ADR-011 D3-3 と同じ扱い）[D]。資源 ID にテナント ID を埋め込まない（INV-1）ため、資源のテナントは ID から推測せず正本を引く [D]。越境共有の例外は ADR-024 の型付き例外（ADR-011 D3-5）に限る [D]。
- **D12-05（認可関数への収束）** REST・gRPC・GraphQL・queue consumer・batch は、同じ業務層の認可関数を経由する [V][^30][D]（RS-08#37, #38）。GraphQL では resolver 内の判定だけで済ませず、業務層で判定する [V][^30]。1 つの要求が複数の操作を含む場合は、含まれる最上位の階層で分類する（REQ-03 J6）[D]。
- **D12-06（sidecar を PEP とする例外）** SDK も契約適合の自前実装も入れられないレガシー（A-110 の LDAP 直結・共有シークレットのみのサービスなど）に限り、sidecar（ext_authz 型）を層 S の代わりに置くことを、期限付きの例外として認める [D]。条件は次のとおりである [D]。
  - 判定できるのは path・method・ヘッダから決まる機能単位だけであり、object 単位は未網羅として例外台帳（D12-40）に載せる。
  - `failure_mode_allow` を true にしない。Envoy の既定は false である [V][^44]。設定値を CI で検査する（ルール R-07）。
  - 期限（廃止計画）と受容者を持つ。read-sensitive 以上のテナントデータを扱う入口では、期限は CISO が決める（TBD、所有者 CISO、期限 G3、決め方: DL-31 の移行計画と K-01 の推移）。
- **D12-07（deny-by-default の層ごとの実現）** 既定拒否を次の対応で実現し、それぞれの存在を検査する [D]。

| 層 | 既定拒否の実現 | 既定値の事実 | 検査 |
|---|---|---|---|
| edge | 台帳外 route を 404 | — | ルール R-05（route 表と台帳の一致） |
| mesh | allow-nothing＋明示 ALLOW | ALLOW がなければ許可 [V][^29] | ルール R-06 |
| sidecar | `failure_mode_allow=false` | 既定 false [V][^44] | ルール R-07 |
| PEP SDK・自前実装 | 判定が得られなければ拒否（ADR-011 D5-8、ADR-013 D13-23）。read-sensitive だけは ADR-013 D13-24〜D13-26 の条件を満たす known-good を使える（KD13-6・U-04 の決裁に従う） | — | ルール R-01・R-02、TC-012-05 |
| PostgreSQL | ENABLE＋FORCE、ポリシーなしは拒否 | FORCE は既定で無効 [V][^12]、ポリシーなしは既定拒否 [V][^11] | ルール R-10〜R-13 |
| 共有キャッシュ（Redis 等） | 既定ユーザーを無効化し、サービスごとの ACL ユーザー | 既定ユーザーは全キー・全コマンド [V][^45] | ルール R-15 |
| object storage | bucket policy の既定拒否と IAM 条件 | — | ルール R-14 |

- 認可判定の fail-open はどの層でも禁止する（ADR-013 D13-23 の不可逆原則）[D]。本書は fail-mode の値と階層別の挙動を新たに決めず、ADR-013 D13-25 と DL-19 に従う [D]。

### 2.2 entry point の機械的棚卸し（Q2）

- **D12-08（entry point 台帳）** entry point 台帳（DL-10 の inventory と DL-15 の検査入力を兼ねる）を機械可読な正本として置く [D]。1 行は 1 entry point とし、次の欄を必須にする [D]。
  - entry point ID（サービス ID＋種別＋宣言上の識別子。名前空間は ADR-021）
  - 種別: HTTP、gRPC、GraphQL operation、webhook 受信、queue consumer、cron・batch、ストリーム（WebSocket・SSE・gRPC streaming）、管理画面、export、support tool、ETL、DB 直接接続、break-glass（G-082 の列挙と同じ）
  - 操作階層・副区分・修飾子・扱うデータ分類（REQ-03 §2.4。ADR-013 D13-28 の fail-mode はこの宣言から決まる）
  - PEP の配置（層 S／例外としての sidecar／public の静的規則）と、例外台帳の参照
- **D12-09（宣言の正本）** 台帳は手書きせず、各サービスの IDL から生成する [D]（RS-08#21、API9:2023 の文書自動生成 [N][^7]）。

| 種別 | 宣言の正本 | 宣言する内容 |
|---|---|---|
| HTTP | OpenAPI 3.2.1（DL-70 の準拠基準）の operation と拡張属性 | 階層・修飾子・データ分類・`security` |
| gRPC | proto の method option | 同上 |
| GraphQL | schema の directive（operation と field） | 同上。field 単位の分類を含む |
| queue consumer・webhook・イベント | AsyncAPI 3.1.0 の operation と拡張属性 | 同上と envelope の版（D12-31） |
| cron・batch・長時間ジョブ | ジョブ基盤のジョブ定義（PC-14 の登録） | 同上と実行主体・代理される利用者 |
| 管理画面・support tool・ETL・DB 直接接続・break-glass | 基盤の登録 API（自由記述にしない） | 同上と接続ロール |

  - 拡張属性・option・directive の名前は ADR-021 の名前空間で DL-70 と同時に決める（TBD、所有者 CTO、期限 DEC-8 前）[D]。
- **D12-10（OpenAPI の宣言の lint）** operation 単位の `security` に空 requirement `{}` を含めること、空配列で top-level の宣言を外すことを lint で禁止し、public 階層の entry point に限って例外台帳に登録して許す [N][^27][D]（RS-08#23）。宣言があることだけでは保護の証拠にしない [D]。
- **D12-11（静的抽出×実行時観測の突合）** 突き合わせる集合を次の 3 つとする [D]（RS-08#27）。
  - S（宣言集合）: IDL から抽出した entry point に、フレームワークのルーティング表をビルド時に列挙した結果を加えた集合。IDL にない handler をルーティング表から拾う。
  - O（観測集合）: 本番と本番相当環境で、SERVER・CONSUMER span（[N][^28]、RS-08#26）と D12-12 の計数から得た entry point。
  - B（DB 側集合）: DB の接続元ロールと監査ログから得た、アプリ経由でない接続（ETL、support tool、手作業 SQL）。アプリ側の trace には現れないからである（RS-08#27）[D]。
  - 差分 O∖S（未宣言で観測された入口）は配備ゲートで拒否し、本番では検知から封じ込め（S3 kill switch の範囲指定、または edge・mesh での遮断）までを runbook にする [D]。S∖O（宣言済みで未観測）は、期限内に合成試験で観測を作るか、廃止する [D][NA-012-5]。B は種別「DB 直接接続」として台帳に登録し、privileged 以上に分類する（REQ-03 J1・J2）[D]。
  - K-01(a)（01_governance/kri.md §4.2 の定義「機械列挙した入口のうち台帳にないもの、または PEP を経由しないもの」）には、O∖S と台帳未登録の B を数える [D]。S∖O は未網羅ではなく観測の欠落なので K-01(a) に数えず、件数と期限超過件数を別掲して RR12-01 の監視に使う [D]（独立レビューで修正。旧記述は 3 つの差分すべてを K-01(a) としていた）。
- **D12-12（sampling から独立した観測）** 実行時観測と coverage の計数は trace の sampling に依存させない [D]。Sampler が DROP を返すと span は記録されないからである [N][^43]（RS-10#22、reconciliation-notes §3.1）。PEP（SDK または契約適合の自前実装、sidecar）は entry point ID ごとに「処理した要求数」と「認可判断を伴った要求数」を sampling なしの計数（metrics）で出す [D]。span は sampling された範囲の詳細調査に使う [D]。
- **D12-13（配備ゲート）** 次のいずれかに当たる変更は配備しない（S1 本番移行停止と同じ扱いで、例外は例外台帳の承認を要する）[D]。
  - 台帳に階層の宣言がない entry point がある（REQ-03 J10）
  - 本番相当環境での O∖S が 1 件以上
  - D12-15 の必須静的ルールの違反
  - D12-41 の cross-tenant property test の失敗（K-03(a)）

### 2.3 enforcement coverage の CI 自動検証（Q3）

- **D12-14（判定基準を契約で定義する）** 「entry point が PEP を経由する」ことを、SDK の使用ではなく契約上の enforcement 記録で定義する [D]。
  - enforcement 記録は、entry point ID、X-Request-ID、PDP から得た decision_id（複数可）、L0 照合の結果、適用した fail-mode（ADR-013）、鮮度区分（fresh か known-good か。ADR-013 D13-26）、`txn`（Txn-Token を受けた場合。発行範囲は ADR-005 D9-3 の write 以上で、全要求に広げるかは reconciliation-notes U-02）、trace_id を持つ。欄は reconciliation-notes §3.2 の統一モデルに揃える [D]。
  - read-sensitive で known-good を使った要求は、元の判定記録の decision_id と鮮度区分 known-good を記録し、「認可判断を伴った要求」に数える [D]（独立レビューで追加。ADR-013 D13-25 の read-sensitive 行と K-01(b) の計数を両立させるため）。
  - public 階層の entry point は、SDK 内の静的規則で判定した旨（reason）を記録し、decision_id の欠落とは区別する（ADR-013 D13-25 の public 行）[D]。
  - SDK を提供しない言語（ADR-022 NA-022-1 の 3 言語以外）のサービスは、契約（DL-72・DL-75）どおりの自前実装で同じ記録を出し、同じ負例ベクタ（DL-80）と D12-17 の実行時検査に合格することで coverage を満たす [D]（G-140）。ADR-011 D5-4 との食い違いは §9.2 L-01 に記す。
- **D12-15（必須静的ルール）** 次のルールを基盤所有のリポジトリで管理し、全サービスの CI の必須ゲートにする [D]（RS-08#32）。ルールは CWE-862・CWE-639・CWE-566 に紐付け、統制台帳（DL-28）でツール間の対応を取る [N][^26][D]（RS-08#20）。

| ID | 検査内容 | 対象 | 根拠 |
|---|---|---|---|
| R-01 | 台帳に載る全 handler（ルーティング表・consumer 登録・ジョブ定義）が、データアクセスより前に認可関数（SDK、または契約適合の自前実装として台帳に登録した関数）を経由する | アプリコード | RS-08#32 |
| R-02 | 認可関数の結果を握りつぶす実装（例外の捕捉で許可へ進む、判定不能時の許可）がない | アプリコード | ADR-011 D3-6、ATK-17 |
| R-03 | repository 層・クエリビルダの呼出しがテナント文脈（D12-20 の helper）を必須引数として受け取る。テナント文脈なしの生 SQL を禁止する | アプリコード | RS-08#31, #32 |
| R-04 | engine の client ライブラリ・API・ヘッダの import と直接呼出しがない | アプリコード | ADR-011 D5-4・D7-3 |
| R-05 | OpenAPI の空 `{}`・空配列の禁止（D12-10）、edge の route 表と台帳の一致 | IDL・edge 設定 | N-15 |
| R-06 | mesh の allow-nothing の存在、ALLOW のない workload、mesh 外から到達できる Service | IaC・mesh 設定 | RS-08#36 |
| R-07 | sidecar・gateway の外部認可で `failure_mode_allow` が true でない | IaC | [V][^44] |
| R-08 | 返却・更新できるフィールドの allowlist が schema にあり、汎用シリアライザで業務オブジェクト全体を返していない | IDL・アプリコード | ASVS 8.2.3・API3:2023（RS-08#3, #10）、T-026 |
| R-09 | 未署名ヘッダ（テナント・利用者）を判定の入力に使っていない | アプリコード | N-7、RS-17#79 |
| R-10〜R-13 | DB guardrail（D12-20 の 4 条件） | migration・DB カタログ | RS-08#43, #45, #50 |
| R-14 | object storage の bucket policy の既定拒否、署名付き URL の TTL 上限（D12-25） | IaC・アプリコード | RS-08#81 |
| R-15 | 共有キャッシュの既定ユーザー無効化、キー生成の共通ライブラリ経由（D12-27） | IaC・アプリコード | [V][^45] |
| R-16 | consumer が envelope の起点主体で再認可し、message payload 内の主体・権限を判定に使っていない（D12-32） | アプリコード | N-4、N-18 |

  - 既製の CodeQL・Semgrep ルールは補助として併用するが、それだけで coverage を主張しない [V][^25][^24][D]（RS-08#28〜#31）。
- **D12-16（ルールの検出力の実測）** ルールの検出率と誤検知率を、PEP 呼出しを除去した変異体とテナント scope を外した変異体を各言語のサンプルに k 件ずつ埋め込んで測る（RS-08 M-02、TC-012-03）[D]。合格の閾値は TBD（所有者 CISO＋プラットフォームチーム長、期限 G4、決め方: TC-012-03 の初回実測と K-06(c)「意図的に混入させた違反の検出率 100%」との整合）[D]。G-072 の合格条件「意図的に混入させた違反をすべて検出する」は、混入させる違反の集合を事前登録したうえで判定する [D]。
- **D12-17（実行時 coverage 検査）** 実行時は次の 2 種類で検査する [D]（RS-08#35）。
  - 計数による検査: D12-12 の計数で、entry point ごとに「処理した要求数 − 認可判断を伴った要求数」を求める。public 以外で 1 以上なら K-01(b) に数える。
  - 要求単位の突合: enforcement 記録の decision_id と、facade が出す decision event（ADR-011 D8-3・D8-4）の decision_id・X-Request-ID を双方向に突き合わせる。PEP 側にあって facade 側にない、または facade 側にあって PEP 側にない記録を coverage 欠落と偽装の候補にする（ADR-013 D13-26 末尾、T-030）[D]。known-good による要求は、facade 側に同じ X-Request-ID の decision event がないので、decision_id と判定記録の有効期限・失効 epoch（ADR-013 D13-24）で突き合わせ、X-Request-ID の不一致だけで候補にしない [D]（独立レビューで追加）。
  - decision event は ASVS 16.3.2 の L3 の全認可判断の記録を兼ねる [N][^2][D]（ADR-011 D8-4）。allow の記録率を 100% より下げる決定が ADR-014 で行われた場合も、計数による検査は影響を受けないように計数を記録と別経路にする（§9.2 L-03）[D]。
- **D12-18（違反時の扱い）** 本番で K-01(a)(b) を検知したら、entry point の階層に応じて次の既定で扱う [D]。
  - write・privileged・break-glass、または要配慮個人情報・決済関連情報・顧客機密を返す read-sensitive: 当該 entry point を遮断する（S3 kill switch。範囲は entry point 単位とし、最小の範囲から始める。stop-authority P3）。遮断による誤 deny の業務影響は BIA の B13 と照合する [D]。
  - それ以外の read-sensitive: 是正期限付きのチケットと K-01 への計上。期限は TBD（所有者 CISO、期限 G3、決め方: GOV-02 Z5 と K-01 の限度）[D]。
  - 欠落期間のアクセスは監査記録から影響範囲を特定する（T-022 の復旧）[D]。
- **D12-19（継続実行と改ざん防止）** D12-15 のルールと D12-11 の突合を、各サービスの変更ごと（CI）と、本番構成・DB カタログ・IaC の日次走査の両方で実行する [D]。CI を通った後の手作業の変更（drift）を走査で捕らえ、K-06(b) に数える [D]。ルール・台帳 schema・例外台帳の変更は基盤所有のリポジトリで二者レビューを必須にする（ADR-008、ATK-17）[D]。

### 2.4 ストレージ側の tenant guardrail（Q4）

- **D12-20（責任分担）** ストレージ側の guardrail はテナント境界だけを担い、object・field 単位の判定は層 S の PEP が担う [D]（RS-08#43、RS-17#40）。ストレージ側の guardrail は二層目の防御であり、PEP の代わりにしない [D]。AWS の現行の SaaS Lens は「すべてのテナント資源を分離する」を設計原則に置き、pool モデルの難しさは分離要件を緩める理由にならないとしている [V][^50]（RS-08#54）。
- **D12-21（PostgreSQL の必須条件）** PostgreSQL（NA-012-3）でテナントデータを持つ表には、次の 4 条件を課し、ルール R-10〜R-13 で migration と DB カタログを検査する [D]（RS-08#43, #45, #50, #51）。
  1. テナント列を持つ全表を `ENABLE` かつ `FORCE ROW LEVEL SECURITY` にする（R-10）。owner は FORCE しない限り RLS を迂回するからである [V][^11][^12]。
  2. migration 用の owner ロールとアプリ実行ロールを分け、アプリ実行ロールは非 owner かつ NOBYPASSRLS とする。superuser・BYPASSRLS・owner でのアプリ接続を 0 件にする（R-11）[V][^11][^13]。
  3. テナント表を参照する view は `security_invoker = true` にする（R-12）[V][^14]。
  4. テナント文脈は、トランザクション内の `SET LOCAL` または `set_config(..., true)` だけで設定し、session 単位の `SET` を禁止する（R-13）[V][^15][^16]。transaction pooling では session 状態が後続のクライアントに残り得るからである [V][^18][^19][D]（RS-08#50）。値は D12-04 の照合を通ったテナントだけから設定する [D]。
  - ポリシーは `current_setting` を missing_ok なしで呼ぶ [V][^16]。ただし、同じ session で一度 `SET LOCAL` した変数がトランザクション終了後に「存在しない」状態へ戻るかは原典で確認できていない（RS-08#50、未確認）[D]。fail-closed の成否は TC-012-09 で実測するまで結論に使わない [D]。
  - テナント別 DB ロールの切替え（SET ROLE）方式は採らない [D]。ロールをまたぐ計画の再利用で RLS が誤適用される CVE が繰り返し修正されているからである [V][^17][^49]（RS-08#46, #47, #51）。PostgreSQL のマイナー版の追随期限をパッチ SLA（DL-32）に含める [D]。
  - 参照整合性検査は RLS を迂回し covert channel になり得る [V][^11]（RS-08#44）。一意制約は（テナント列, 業務キー）の複合にし、テナントを越えた一意性で存在を推測させない [D]。
  - AWS の指針の例は FORCE を含まないため、その例をそのまま写した構成は不合格とする [V][^20][D]（RS-08#42, #43）。
- **D12-22（他の DB・DWH）** PostgreSQL 以外の関係 DB・DWH は、(a) 迂回できる特権主体、(b) 既定値（有効化しないと効かないか）、(c) 非対応のアクセス経路、(d) side channel の 4 点を製品の公式文書で評価し、同等の guardrail を持たない場合はテナント別のスキーマ・DB・dataset に分ける [D]（RS-17#40）。製品ごとの限界の例として、BigQuery は行ポリシーが実行時間の side channel を受け得るとし分離テーブルを推奨する [V][^36]（RS-08#69）。Snowflake の row access policy は行の INSERT を防がない [V][^41]（RS-17#38）。Databricks の row filter は一部のアクセス経路で使えない [V][^42]（RS-17#39）。DWH のテナント間は dataset・table で分け、行・列ポリシーはテナント内に限る [D]（RS-08#72）。
- **D12-23（後付けの順序）** A-112 の 70% のサービスへの guardrail の後付けは、扱うデータの最高分類と階層（REQ-03 §3.8）の高い順に行い、DL-31 の移行計画に載せる [D][NA-012-2]。未移行の間は K-05(b) と K-01 の「未移行サービス分」に計上する（kri.md §5 の K-01 の限度）[D]。
- **D12-24（object storage）** object storage は次の二重化を行う [D]（RS-08#55, #56）。
  - object のキーは不透明な object ID とし、その上位に区画キーを置く。区画キーは区画レジストリが割り当てる内部値で、テナント ID そのものではない（INV-1、ADR-010 D-12 の区画キーと同じ考え方）[D]。テナントの統合・分割では区画の付け替え（object の複製を伴い得る）で対応する（ADR-028）[D]。
  - 依存サービスは、区画に限った IAM 条件付きの短命資格情報を token vending（基盤所有）から取得して object storage にアクセスする [V][^21][D]。セッションタグは検証済みのテナント文脈（署名検証済み token と D12-04 の照合結果）からだけ導き、タグを付与できる主体（`sts:TagSession` を持つ主体）を token vending に限って監査する [V][^22][D]（RS-08#56）。共有サービスが任意テナントのタグで資格情報を得られる構成では、侵害されたサービスが全テナントに到達し得るからである [D]。
  - クラウド事業者ごとの機構の違いは token vending の内側に閉じ込める [D]。
- **D12-25（署名付き URL・export）** 署名付き URL と export は「発行時の 1 回」で判定が固定されるベアラ型の経路として扱う [V][^23][D]（RS-08#81, #82、RS-17#50）。
  - 発行は層 S の PEP で認可した直後に限り、発行を認可イベントとして記録する（entry point 種別 export として台帳に登録）[D]。
  - TTL の上限を操作階層ごとに置き、剥奪反映 SLO（ADR-006、R-143）に URL の残り寿命を含める。上限値は TBD（所有者 CISO＋SRE 責任者、期限 G4、決め方: ADR-006 の遅延予算と TC-012-13）[D]。
  - 要配慮個人情報・決済関連情報・+REG のデータは、署名付き URL を発行せず BFF・proxy 経由で配信する [D]。発行件数と最大 TTL を K-05(d) で報告する [D]。
- **D12-26（検索インデックス）** テナント間の境界は index（または cluster・cell）の分離で担い、DLS・ACL フィルタはテナント内の細粒度制御に限る [D]（RS-08#63）。共有 index と DLS だけでテナント間を分けると、件数・語彙・スコアから他テナントの情報を知り得るからである [V][^35]（RS-08#62）。
  - 検索 client は基盤の共通ライブラリを使い、要求のテナントから index を選ぶ。他テナントの index 名を指定できる API を依存サービスに開かない [D]。
  - テナント別 index の運用可能性（NA-012-4）が TC-012-12 で不合格の場合も、共有 index＋DLS をテナント間の境界にすることは採らず、§8 のトリガーで再検討する [D]。threat-catalog の T-076 もテナント間は受容しないことを推奨している [D]。
  - 一覧・検索の結果の後段 Check、件数とページングの扱いは ADR-025 で決める（RS-08#68、ADR-011 D5-2）[D]。索引への ACL 反映の遅延と削除の伝播は DL-57 で扱う [D]。
- **D12-27（キャッシュ）** キャッシュは次のとおりにする [D]。
  - アプリケーションキャッシュのキーには、区画キー（テナント）と、応答が主体・権限に依存する場合は主体または判定範囲を必ず含める。キーは基盤の共通ライブラリで生成し、手書きのキー生成を R-15 で検出する [D]。
  - 共有キャッシュ（Redis 等）は既定ユーザーを無効化し、サービスごとの ACL ユーザーにそのサービスのキー接頭辞だけを許す [V][^45][D]。key pattern は FLUSHALL などキー引数を取らないコマンドを制限しないため、これらのコマンドを明示的に外す [V][^45]。ACL はサービス単位の境界であり、テナント単位の境界にはならない（1 万テナント分の ACL ユーザーは置かない）[D][A-007]。テナント間の分離は共通ライブラリのキー規約と R-15 に依存し、この点は残余リスク RR12-05 とする [D]。
  - 認可判定そのもののキャッシュ（既知良好判定）は ADR-013 D13-24〜D13-26 の条件だけで許し、依存サービスが独自に判定をキャッシュすることは禁じる（ADR-022 D-4-2）[D]。
  - HTTP・CDN のキャッシュに read-sensitive 以上の応答を載せる場合は、キャッシュキーにテナントと主体を含める構成に限る。含められない構成では共有キャッシュに載せない [D]。
- **D12-28（ベクトルストア・RAG）** ベクトルストアはテナント間を index・collection・cluster の分離で担い、リトリーバ段で層 S の PEP を通す [N][^37][D]（RS-08#74, #75）。複数テナントのデータで学習した共有モデルを使うかは R-011 の例外として経営判断の対象にし（threat-catalog TD-2）、本書では決めない [D]。
- **D12-29（storage guardrail の負例試験）** 各 guardrail に負例試験を置き、CI と本番相当環境で実行する [D]。誤ったテナント文脈での読書きが 0 行または拒否になること、owner 接続・BYPASSRLS 接続が検出されること、security_invoker のない view が検出されること、他区画の object への資格情報の取得が拒否されること、他テナント index の指定が拒否されることを含める（TC-012-09〜TC-012-12）[D]。
- **D12-30（PEP 外の特権データ経路）** バックアップ・レプリカ・CDC・DWH 抽出・ETL・export を「全テナント入りの特権データ経路」として台帳（種別 DB 直接接続・ETL・export）に登録し、その主体（BYPASSRLS・superuser・owner・抽出ロール）の数を K-05(b) と別掲の「迂回主体数」で報告する [D]（RS-08#72, #79、RS-17#40）。これらの経路は AC-4・AC-3(9) の領域として扱い [N][^8][D]（RS-08#15）、持出し条件・ACL 反映・削除伝播・監査は DL-57 で決める [D]。復元と閲覧は特権機能として扱い（AC-6(9)・AC-6(10)、ADR-008・ADR-029）、テナント単位の復元・抽出ではテナントの照合を必須にする [N][^8][D]（RS-08#79）。

### 2.5 非同期経路の再認可（Q5）

- **D12-31（認可 envelope）** 非同期メッセージ・ジョブ投入には、次の欄からなる認可 envelope を付け、AsyncAPI の契約（DL-70）に版付きで定める [D]（RS-08#61、RS-17#35）。
  - 起点主体（`sub` と主体類型。委任の場合は `act`）、`tid`、操作（entry point ID）、対象資源の参照、enqueue 時の decision_id、一貫性トークン（facade が発行する版付きの不透明値。ADR-010 D-14、ADR-011 §2.6 の `consistency.token`）、`txn`（Txn-Token を受けた要求から enqueue した場合。ADR-005 D9-3・ADR-009・reconciliation-notes U-02）
  - token・権限・role の一覧、再利用できる資格情報は入れない [D]。CloudEvents は context attributes に機微情報を載せるべきでない（SHOULD NOT）とし、Auth Context 拡張は保護目的ではないとしている [N][^39][^40]（RS-17#32, #33）。Txn-Token は短命が前提であり（草案）、滞留するメッセージには載せない [N][^33][D]。
- **D12-32（consumer での再認可）** queue consumer・batch の各実行単位・webhook 配信は、それぞれ独立した entry point（台帳の種別 consumer・cron/batch・webhook）として層 S の PEP を持ち、実行の直前に起点主体の権限で PDP に再 Check する [N][^1][D]（ASVS 8.3.3、RS-08#57, #61）。envelope の起点主体・`tid` は判定の入力であって判定の根拠ではない [D]。一貫性の指定は操作階層ごとに次のとおりにする [D]（REQ-03 §3.6、ADR-010 D-13）。

| 階層 | consumer での再認可の一貫性 | 理由 |
|---|---|---|
| public | 判定しない（静的規則） | REQ-03 §3.6 |
| read-sensitive | ADR-010 D-13 の下限（max(内容トークン, テナント剥奪フェンス)）以降。enqueue 時のトークンだけを下限にしない。剥奪フェンス（ADR-010 D-18）は PoC 合格を有効化の条件とする採用候補なので、有効化されるまでは consumer の read-sensitive も最新を強制する（ADR-011 D6-3 の格上げ） | enqueue 時のトークンは enqueue 時点以上の鮮度しか保証しない [V][^34][D]（RS-08#60, #61）。enqueue 後の剥奪を確実に反映するには最新強制か剥奪書込みで得たトークン以降の指定が要る（RS-08#61 (b)）[D] |
| write | 最新を強制（`fully_consistent` 相当。OpenFGA は HIGHER_CONSISTENCY） | REQ-03 §3.6、ASVS 15.4.2（確認と実行の原子性）[N][^4] |
| privileged | 最新を強制し、内容版トークンだけに頼らない。起点主体の session の状態照合を含める | REQ-03 §3.6 |
| break-glass | 非同期で実行しない。必要な場合は同期の緊急経路（ADR-029） | 本書の判断 [D]。ADR-013 D13-25 の break-glass 行（基盤の PDP に依存しない別経路）と ADR-010 D-13 の判定記録必須から導いた。ADR-013 は非同期実行の可否を直接は定めていない |

  - OpenFGA を採る場合の read-sensitive の扱いは reconciliation-notes U-03 の決裁に従う [D]（§9.2 L-06）。
- **D12-33（consumer のテナント文脈）** consumer は envelope の `tid` と、payload の対象資源の正本から導いたテナントを照合し（D12-04 と同じ三者一致）、一致した場合だけ DB のテナント文脈を `SET LOCAL` で設定する [D]（RS-08#61 (c)）。
- **D12-34（滞留中の剥奪）** 再 Check で拒否されたメッセージは、黙って捨てず、黙って再試行もしない [D]（RS-17#35）。デッドレターへ送り、監査に記録し、業務側へ通知する [D]。剥奪・テナント停止を受けたとき、該当主体・テナントのキュー内メッセージを破棄または保留する機能を consumer の基盤ライブラリに持たせる（T-024 の封じ込め）[D]。
- **D12-35（長時間ジョブ・batch）** 長時間ジョブの実行主体はジョブ用の非人間 ID（PC-14）とし、利用者の名で処理する場合は登録時の同意を記録し、実行のたびに利用者の状態を再評価する（RS-17#31、principal-catalog PC-14）[D]。再認可の粒度は、write 以上は処理項目ごと、read-sensitive は処理単位（件数上限または時間上限のいずれか早い方）ごととし、上限値は TBD（所有者 CTO＋各ドメイン責任者、期限 G4、決め方: TC-012-07 の剥奪反映時間と処理性能）[D]。所有者・利用者の退職・停止を契機にジョブを止める既定は INV-6 と principal-catalog の決裁案 3 に従い、委任の伝搬は ADR-026・ADR-009 で決める [D]。
- **D12-36（webhook・ストリーム）** webhook の受信は署名検証の後に層 S の PEP を通す entry point とする [D]。webhook の送信（配信）は、購読の所有者が配信時点でも当該資源のイベントを受け取る権限を持つかを配信直前に再 Check する [D]。ストリーム接続（WebSocket・SSE・gRPC streaming）は、接続確立と購読をそれぞれ entry point として台帳に載せ、接続中の再認可（期限での切断、剥奪イベントでの切断、メッセージ単位の確認）の方式は ADR-006 で決める [D]（RS-17#56）。

### 2.6 bypass 試験（Q6）

- **D12-37（試験の 3 段）** bypass 試験を次の 3 段で行う [D]。
  1. CI（変更ごと、必須ゲート）: D12-41 の cross-tenant property test、D12-16 の変異体による検出力試験、D12-29 の storage guardrail の負例。
  2. 本番相当環境（配備前と定期）: ネットワーク・ヘッダ・ストレージ・非同期の迂回（D12-38）。
  3. 独立評価（DL-59、R-060・R-065）: 外部の位置（ATK-01・ATK-03）と内部の位置（ATK-06：侵害された microservice の権限）からの PEP bypass と cross-tenant の侵入試験 [D]。OWASP Authorization Cheat Sheet は、認可ロジックの単体・結合試験は専門の試験や pentest の代替にならないとしている [N][^31]（RS-08#39）。
- **D12-38（本番相当環境の迂回試験）** 次の注入を事前登録した手順で行い、拒否されるか検知されることを確かめる [D]。
  - gateway を通らない pod・Service への直接到達、mesh の ALLOW の削除（T-018、T-022）
  - 外部から注入したテナント・利用者ヘッダ、未署名ヘッダ（T-016、N-7）
  - 台帳にない handler を持つ変異版の配備（O∖S の検知と配備拒否）
  - owner 接続・BYPASSRLS 接続・session 単位の `SET`・security_invoker のない view・transaction pooling での文脈の混線（RS-08 M-05）
  - 他区画のタグでの資格情報の取得、他テナント index の指定
  - envelope の `tid` の改ざん、enqueue 後の剥奪（T-024）
  - sidecar の外部認可サービスの停止（`failure_mode_allow` の確認）、PDP facade の停止（ADR-013 の階層別挙動）
- **D12-39（応答の非区別）** 他テナントの資源と存在しない資源への要求には同じ応答（状態コード・本文・時間の差を設計上つくらない）を返す [D]。存在・件数・エラー応答の差による推測も read-sensitive の「返す」に含まれるからである（REQ-03 J4）[D]。
- **D12-40（例外台帳）** 次のものは例外台帳に登録して初めて検査から外す [D]。意図的な公開 endpoint（public）、sidecar だけの PEP（D12-06）、未観測の稀な経路（D12-11）、ストレージ guardrail を持たない DB（D12-22 の評価待ち）。各例外は、所有者、期限、補償統制、承認者（privileged 以上とテナントデータを返す read-sensitive は CISO、それ以外はプラットフォームチーム長）を持ち、期限切れの例外は違反として K-01 に戻す [D]。例外の受容は DL-05 の受容票に従う [D]。
- **D12-41（cross-tenant property test）** 台帳の全 entry point について、2 テナント以上×複数ロール×（他テナントの実在 ID、存在しない ID、自テナントの ID）の要求を生成し、他テナントへの許可件数が 0 であることを性質として検査する [N][^32][D]（RS-08#39）。WSTG-ATHZ-04 は、異なるオブジェクトを所有する 2 人以上の利用者を用いることを最善としている [N][^32]。生成器は台帳と IDL から要求を組み立て、DL-80 の試験キットとモックで依存サービスの CI でも動かせるようにする（G-121・G-122）[D]。越境共有（ADR-024）のケースを含める（G-114）[D]。試験の失敗件数と、変異体に対する検出力を K-03 で報告する [D]。
- **D12-42（R-011 との関係）** テナント間漏えい許容ゼロ（R-011）は、文書でも有限回の試験でも証明できない [D]（RS-08 §2-15）。本書の統制は、K-01（未網羅の入口）、K-03（負例試験の失敗と検出力）、K-05（PEP 外経路の統制未付与と迂回主体）、K-06（CI 違反）を「既知の未緩和経路 0 件」の測定手段として供給するにとどまる [D]。

---

## 3. 検討した選択肢

### 案A（採用）: 多層の強制点（サービス内 PEP 必須）＋宣言×観測の突合＋契約で定義した coverage 検査＋ストレージ側 guardrail＋consumer 再認可

- **概要**: §2 のとおり。object 単位の判定はサービス内 PEP、edge・mesh は既定拒否と粗い判定。coverage は SDK ではなく enforcement 記録で定義し、静的ルール・計数・要求単位の突合の 3 つで検査する。ストレージ側はテナント境界だけを担う [D]。
- **利点**: ASVS 8.2.2・8.4.1・8.3.3 と API1:2023 の要求に、強制点の位置で応える [N][^1][^5][D]。PEP の欠落（T-022）と DB 直接アクセス（T-018 の B 集合）の両方を機械的に数えられ、K-01・K-03・K-05・K-06 の測定源になる [D]。PEP が欠落しても RLS が他テナント行を返さず、RLS が誤設定でも PEP が拒否する二重化になる [D]。製品（gateway・mesh・DB・検索）を替えても、台帳・enforcement 記録・envelope の契約は残る [D][A-104]。
- **欠点**: 依存サービスの改修量が最も大きい（NA-012-2 の 105〜420 人月）[D]。基盤側の工具の構築・維持（NA-012-1）が A-054 の外数で要る [D]。検索 index のテナント別化は index 数が増える（NA-012-4）[D]。
- **主要リスク**: 稀にしか動かない経路が観測から漏れる（RR12-01）。カスタムルールの検出力が低い言語が残る（RR12-02）。後付けの間、K-01・K-05 の未移行分が長く残る [D]。
- **費用・要員の桁**: 基盤側 3〜5 FTE×12〜18 か月＋維持 2〜3 FTE/年（NA-012-1）。依存サービス側 105〜420 人月（NA-012-2）に、IDL の拡張属性の付与（1.2 万 entry point [A-055] × 1 件あたり数分〜数十分の見積りで数百〜数千人時 [NA-012-7]）を加える。いずれも起草者の見積りで、DL-50 と TC-012-01〜TC-012-03 の実測で置き換える [D]。
- **可逆性**: 条件付きで可逆（冒頭の 4 点を除く）[D]。
- **この案が勝つ条件**: テナント間漏えいの許容度が GOV-02 の T3（ゼロ）で決裁され、pool 型（テナント共有の DB・index）を主に使う場合 [D]。

### 案B: gateway・sidecar への集中 PEP（path の資源 ID で ReBAC 判定。サービスは署名付き文脈を検証するだけ）

- **概要**: 認可判定を edge と sidecar（ext_authz）に集約する。gateway・sidecar は route 定義から path・gRPC method の資源 ID を取り出し、PDP（ADR-010 の relationship store）に object 単位の Check を行う。サービスは gateway が付けた署名付き token（内部 token・Txn-Token）を検証して主体・テナントを読み、自らは PDP を呼ばない。DB 側 guardrail は任意とする [D]（独立レビューで、未署名ヘッダを信頼する弱い形から、署名付き文脈と ReBAC 判定を持つ最も強い形へ書き直した）。
- **利点**: 依存サービスの改修が小さく、言語に依存しない [D]。強制点の数が少なく、AC-25 の「解析できるほど小さい」機構に近い形で棚卸しできる [N][^8][D]。path に資源 ID が現れる REST・gRPC の単一資源操作では、relationship store が資源の関係を持つ限り、gateway でも object 単位の判定ができる [D]。
- **欠点**: gateway が見られるのは要求の外形だけである。本文・GraphQL の入れ子 resolver・batch/bulk API に含まれる資源 ID、サービスが処理中に読み出す子資源・フィールド、一覧・検索の返却集合には判定が及ばない [D]（RS-08#38）。資源のテナントを業務 DB の正本ではなく relationship store から得るため、両者の食い違い（ADR-011 D1-1 の L0 が防ぐ型）を検出できない [D]。ASVS 8.2.2・API1:2023 の object 単位の要求を満たせるのは path 型の入口に限られる [N][^1][^5][D]。PDP/PEP は自らの位置より先では方針を適用できず [N][^10]、サービス内のバッチ・consumer・DB 直接接続が暗黙の信頼ゾーンに残る [D]。
- **主要リスク**: gateway を迂回されると、署名付き文脈を検証しても object 単位の判定は行われない [D]。未署名ヘッダに退行した構成では偽造され得る [V][^47]（RS-17#79）。CVE-2025-55241 では送信元テナントを検証しないレガシー API の組合せでテナント越えのなりすましが可能だったと発見者が開示している [I][^46]（RS-12#53）。サービス側でテナントを検証しない構造はこの型に当たる [D]。
- **費用・要員の桁**: 基盤側 2〜3 FTE（gateway・sidecar の policy 運用）[NA-012-7]。依存サービス側は署名付き文脈の検証への置換で 1 サービスあたり数人日 [D][NA-012-7]。
- **可逆性**: 可逆。ただし後で案A へ移ると、サービス内 PEP と RLS の改修を改めて行う [D]。
- **この案が勝つ条件**: 資源がテナントごとに物理分離され（silo）、object 単位の認可が不要な読み取り専用の公開 API に限る場合、または全入口が path 型の単一資源操作で、本文・一覧・非同期の入口がない場合 [D]。案A でも、SDK を入れられないレガシーには期限付きでこの形（D12-06）を使う [D]。

### 案C: PEP SDK の必須化と静的解析だけ（実行時突合・ストレージ側 guardrail なし）

- **概要**: SDK の導入と SDK 呼出し規約のカスタムルールを CI で強制し、実行時の突合と DB 側 guardrail は置かない [D]。
- **利点**: 基盤側の工具が小さい（1〜2 FTE）[D][NA-012-7]。ADR-011 D5-4 を文字どおりに読んだ形であり、SDK のある 3 言語（NA-022-1）では最も早く始められる [D]。依存サービスの DB 改修が要らない [D]。
- **欠点**: 静的ルールは宣言・登録された handler しか見ず、未登録 handler・DB 直接接続・稀な経路を逃す（RS-08#27）[D]。既製 SAST の範囲は狭く [V][^25]（RS-08#29）、カスタムルールの検出力を実行時に裏付ける手段がない [D]。PEP が欠落したとき、DB は他テナント行を返す [D]。SDK のない言語では成り立たず、ADR-022 の G-140（SDK なしの連携）と衝突する [D]。
- **主要リスク**: ATK-17（PEP 呼出しの削除・握りつぶし）と ATK-19（設定の誤り）に対し、検知の手段が CI だけになる [D]。
- **費用・要員の桁**: 基盤側 1〜2 FTE。依存サービス側は SDK 導入のみで 1 サービスあたり 0.2〜0.5 人月 [D][NA-012-7]。
- **可逆性**: 可逆。案A の部分集合であり、後で突合と guardrail を足せる [D]。
- **この案が勝つ条件**: サービス数と entry point 数が小さく（例: 数十サービス）、DB 直接接続がない場合 [D]。

### 案D: テナント別の物理分離（silo）を既定にし、RLS を使わない

- **概要**: テナントごとに DB（またはスキーマ）・bucket・index を分け、接続先の選択（routing）でテナント境界を担う [D]。
- **利点**: 行レベルの迂回経路（owner、BYPASSRLS、参照整合性の covert channel、RLS の CVE 類型）が構造的に生じない [D]。AWS SaaS Lens SEC 2 の Improvement Plan も厳格な分離が要る資源には silo を挙げる [V][^51]（RS-08#54）。
- **欠点**: 1 万テナント [A-007] × テナントデータを持つサービス数で DB・スキーマの数が増え、migration・バックアップ・監視の単位が桁で増える [D]。routing の誤り（接続先の取違え）が新しい越境経路になり、その検査が別途要る [D]。
- **主要リスク**: 運用の自動化が追いつかず、手作業の migration が ATK-19 の型の事故を増やす [D]。
- **費用・要員の桁**: 300 サービスのうちテナントデータを持つサービスが半数と置くと、テナント×サービスで 150 万単位のスキーマ・DB になる [D][A-007, NA-012-6]。
- **可逆性**: 部分的に不可逆（データ配置の全面移動を伴う）[D]。
- **この案が勝つ条件**: テナント数が数百以下、または契約で専用 cell・物理分離を求める高保証テナント（A-081 の 50）に限る場合 [D][A-081]。案A はこの範囲で案D を併用する（ADR-013 の専用 cell・専用区画）[D]。所在地の指定を受けるテナント（A-062 の 500）は、法域別の cell 割当（ADR-013）で扱い、それだけでは silo の理由にしない [D]（独立レビューで修正。旧記述は A-062 を物理分離の要求と読んでいた）。

### 案E: DB を主たる PEP にする（RLS で object 単位まで判定する）

- **概要**: 認可の判定を DB の RLS ポリシー（関係・役割を DB 内で参照）に寄せ、アプリ側の PEP を薄くする [D]。
- **利点**: DB を経由するアクセスは経路にかかわらず判定される [D]。
- **欠点**: 判定の正本が PDP（ADR-010・ADR-011 の CAM・engine）と DB ポリシーに二重化し、PEP–PDP 契約（AuthZEN、DL-72）の外に認可意味論が生じる [D]。検索 index・object storage・キャッシュ・外部 API には効かない [D]。ポリシー式の副問合せは競合状態で情報漏えいを生じ得ると公式文書が明記している [V][^11]（RS-08#44）。
- **主要リスク**: 300 サービスの DB ポリシーが個別に分岐し、ADR-011 D3-4（ドメインに forbid を書かせない）を守れない [D]。
- **費用・要員の桁**: 依存サービス側で認可ロジックの DB 移植が要り、案A の後付け（NA-012-2）を上回る [D]（起草者の見積り）。
- **可逆性**: 部分的に不可逆（DB ポリシーへの依存が業務ロジックに浸透する）[D]。
- **この案が勝つ条件**: 単一 DB に閉じた少数のアプリで、PDP を置かない場合 [D]。

---

## 4. 評価

### 4.1 評価軸

| 軸 | 内容 |
|---|---|
| 防御の深さ | ATK-03・ATK-06・ATK-17・ATK-19 に対し、1 層が欠けても他層で止まるか |
| 検証可能性 | coverage と guardrail の状態を機械的な証跡（E4）で示せるか。K-01・K-03・K-05・K-06 を測れるか |
| 規範との整合 | ASVS 8.2.2・8.3.3・8.4.1、API1・API5・API9、AC-3・AC-4 への応答 |
| 規模での実現性 | 300 サービス・1.2 万 entry point・1 万テナント・A-054 の要員で回るか |
| 契約・置換との整合 | ADR-011・ADR-022 の契約層と、製品置換（A-104）で検査が残るか |
| 可用性・性能 | 追加の判定・RLS・再認可が遅延と誤 deny に与える影響 |

### 4.2 比較表

記号は起草者の自己評価で、◎ 強い、○ 足りる、△ 条件付き、× 足りない [D]。

| 軸 | 案A | 案B | 案C | 案D | 案E |
|---|---|---|---|---|---|
| 防御の深さ | ◎（PEP×RLS の二重化） | ×（object 単位は path 型の入口だけ） | △（PEP 欠落時に DB が守らない） | ○（境界は強いが routing 誤りが残る） | △（DB 外の経路は無防備） |
| 検証可能性 | ◎（宣言×観測×計数×突合） | ○（強制点が少なく数えやすい） | △（実行時の裏付けなし） | ○（構成の走査で数えられる） | △（ポリシー式の正しさの検証が別に要る） |
| 規範との整合 | ◎ | ×（8.2.2・API1 は path 型の入口だけ） | ○ | ○ | △（PEP–PDP 契約の外） |
| 規模での実現性 | △（NA-012-1・NA-012-2 の要員） | ◎ | ○ | ×（150 万単位） | × |
| 契約・置換との整合 | ◎（契約で定義） | ○ | △（SDK 依存、G-140 と衝突） | ○ | ×（認可意味論の二重化） |
| 可用性・性能 | △（RLS と再認可の遅延は TC-012-08・TC-012-07 で測る） | ◎ | ○ | ○ | △ |

- 案A は「規模での実現性」と「可用性・性能」で劣る [D]。前者は NA-012-1・NA-012-2 の要員と期間を DL-31 の移行計画で受けられるかに依存し、後者は RLS の性能影響に公開の一次測定値がない（RS-08 §6-8）ため TC-012-08 で実測する [D]。
- 判定が覆る条件は §8 に置いた [D]。

---

## 5. 決定理由と棄却理由

### 5.1 決定理由（案A）

- 承認条件 4（R-269）は「全 entry point の PEP coverage を機械的に検証でき、DB/storage にも tenant guardrail がある」ことであり、検証可能性と二重化の両方を要する [D]。5 案のうち両方を満たすのは案A だけである [D]（§4.2）。
- 想定規模（1.2 万 entry point [A-055]、アプリ層だけでテナント分離を行うサービス 70% [A-112]）では、PEP の欠落を前提に置いた二層目が要る [D]。ATK-17 と ATK-19 は PEP の欠落を正規の変更経路から起こし得るからである（03_threat-model/attacker-model.md の ATK-17・ATK-19 行）[D]。
- coverage を SDK でなく契約（enforcement 記録）で定義することで、ADR-022 の「契約だけで連携できる」（G-140）と、ADR-011 の「PEP SDK 既定拒否・decision event と span の突合」（D5-8、D8-3）の両方に整合させられる [D]。

### 5.2 棄却理由

| 案 | 棄却理由 | この理由が成り立たなくなる条件 |
|---|---|---|
| 案B | gateway・sidecar の object 単位の判定は path 型の入口に限られ、本文・入れ子・子資源・一覧・非同期の入口と、業務 DB の正本との三者一致に及ばない。サービス側でテナントを検証しない構造は CVE-2025-55241 型の越境経路になる [N][^1][^5][I][^46][D] | 全資源がテナント別に物理分離され object 単位の認可が要らない場合、または全入口が path 型の単一資源操作の場合 |
| 案C | 未登録 handler・DB 直接接続・稀な経路を逃し、PEP 欠落時に DB が他テナント行を返す。SDK のない言語で成り立たない [D] | サービス数が小さく DB 直接接続がない場合。案A の段階導入の初期形としては使う（§6.4） |
| 案D | 1 万テナント×サービスで物理単位が桁で増え、運用の自動化が追いつかない [D][A-007] | テナント数が数百以下、または物理分離を契約で求めるテナント（案A で併用） |
| 案E | 認可意味論が PDP と DB に二重化し、DB 外の経路に効かない [D] | PDP を置かない小規模の単一アプリ |

棄却仮説は traceability/rejected-hypotheses.md へ集約する予定である（本作業では編集していない）[D]。

---

## 6. 帰結

### 6.1 良い帰結

- PEP の欠落・迂回を、宣言×観測の差分（K-01(a)）と判断のない処理（K-01(b)）の 2 つの数で示せるようになる [D]。CL-0110 の「bypass 不能」は、この数と bypass 試験の結果で置き換えられる [D]。
- PEP が欠けた場合も RLS がテナント間の行を返さず、RLS が誤設定の場合も PEP が拒否するため、1 層の誤りだけではテナント間漏えいに至らない構成になる [D]。ただし両層が同時に誤る経路（例: 資源のテナント属性そのものの誤記録）は残る（RR12-06）[D]。
- 非同期経路が entry point として台帳・coverage・負例試験の対象に入り、enqueue 時の判断だけでの実行（T-024）を構造的に減らせる [D]。
- 製品を替えても、台帳・enforcement 記録・envelope・テナント文脈の規約は残り、置換時の検査を再利用できる [D][A-104]。

### 6.2 悪い帰結

- 依存サービスの改修量が大きく（NA-012-2）、移行期間中は K-01・K-05 の未移行分が残る [D]。
- read-sensitive 以上のクエリに RLS の評価が加わり、consumer に再 Check が加わる。遅延と PDP 負荷（A-045 に consumer 分が上乗せ）が増える [D]。
- テナント別 index は index 数と運用の負荷を増やす（NA-012-4）[D]。
- 例外台帳の運用（承認・期限管理）が CISO とプラットフォームチームの定常業務になる [D]。

### 6.3 残余リスクと受容者案

| ID | 残余リスク | 関係する脅威・攻撃者 | 緩和 | 受容者案 | 期限案 |
|---|---|---|---|---|---|
| RR12-01 | 実行時に一度も呼ばれない入口は観測による差分検出から漏れる | T-018、ATK-06 | 合成試験での観測（D12-11）、静的抽出（S 集合） | 段2 案（CEO・経営会議。threat-catalog T-018 と同じ） | G4 |
| RR12-02 | span・計数を出さない経路（独自プロトコル、計装のないレガシー）は実行時検査から漏れ、カスタムルールの検出力は言語ごとに異なる。SDK のない言語では静的検査が弱い | T-022、ATK-17 | 例外台帳と sidecar（D12-06）、ネットワーク層の遮断、kri.md KA-1 の測定 | 段2 案（CEO・経営会議） | G4 |
| RR12-03 | バックアップ・DWH 抽出の特権ロールの濫用は予防できず、検知に頼る | T-077、ATK-11、ATK-08 | JIT・全件監査（D12-30、DL-57） | 段2 案（CEO・経営会議。T-077 と同じ） | G5 |
| RR12-04 | 再認可から実行までの間の剥奪は反映されない。署名付き URL は残り寿命の間有効 | T-024、T-077、ATK-03 | 再認可の粒度（D12-35）、TTL 上限（D12-25） | 段1（事業責任者。T-024 と同じ） | G4 |
| RR12-05 | 共有キャッシュのテナント間分離はキー規約に依存し、DB のような二層目がない | T-020、ATK-17 | 共通ライブラリ、R-15、負例試験 | 段2 案（CEO・経営会議） | G4 |
| RR12-06 | 資源のテナント属性そのものが誤って記録されている場合、三者一致も RLS も通る | T-021 | 資源レジストリの書込経路の統制（ADR-010、DL-73）、テナント移動時の差分検査（ADR-028） | 段2 案（CEO・経営会議。T-021 と同じ） | G5 |
| RR12-07 | RLS 自体の不具合（CVE 類型）と、参照整合性の covert channel | T-020 | SET ROLE 方式の不採用、パッチ SLA、複合一意制約（D12-21） | 段1（CISO） | G4 |
| RR12-08 | テナント内の共有 index では、集計による許可外文書の推測が残る | T-076 | テナント内は ADR-025 の後段 Check | 段1（事業責任者。T-076 と同じ） | G4 |

- テナント間の経路（RR12-01・RR12-02・RR12-05・RR12-06）は、threat-catalog の推奨と同じく受容ではなく是正を前提にし、受容は期限付きにする案とする [D]。受容者の階層は GOV-02・DL-05 の決裁で確定する（本書は案まで）[D]。

### 6.4 依存サービス・連携開発者への影響

- 各サービスは、IDL に階層・修飾子・データ分類を宣言し（D12-09）、PEP（SDK または契約適合の自前実装）を全 handler に通し（D12-14）、テナント表に RLS の 4 条件を満たす（D12-21）[D]。連携開始前の条件（DL-67、G-125）に、台帳への登録と静的ルールの合格を加える [D]。
- 段階導入は、(1) 台帳の登録と静的ルール（案C 相当）、(2) 計数による実行時検査、(3) DB 側 guardrail、(4) consumer の再認可と envelope の順に進め、各段の完了を K-01・K-05 で追う案とする [D]。順序と期限は DL-31 で決める [D]。
- SDK を提供しない言語のチームは、契約からの自前実装に enforcement 記録と計数を含める必要がある [D]（ADR-022 §6 の悪い帰結と同じ型の負担）。
- 非同期の producer は envelope（D12-31）を付け、consumer は再 Check とデッドレター処理を実装する（基盤ライブラリを提供）[D]。

### 6.5 運用・要員への影響

- 基盤側に coverage 工具の構築・維持の要員（NA-012-1）が A-054 の外数で要る [D]。A-054 の内側で賄う場合は、PEP SDK・開発者支援 4 FTE の業務と競合する [D]。
- 例外台帳の審査、K-01・K-03・K-05・K-06 の報告（kri.md の層 B・M）、本番走査の当番（違反時の遮断判断）が定常業務になる [D]。
- 遮断（S3）を entry point 単位で行う runbook と、誤 deny の業務影響の照合（B13）を DL-24 に加える [D]。

---

## 7. 検証

### 7.1 PoC で確かめる仮説と TC 案（TC 番号は DL-22 で採番。ここでは仮番号）

合否基準の値は、別に記したものを除き TBD とし、所有者・期限・決め方を併記する [D]。RS-08 §5.2 の M 番号との対応を示す [D]。

| TC | 仮説 | 方法 | 合否基準 | 対応 |
|---|---|---|---|---|
| TC-012-01 | 静的宣言（S）と実行時観測（O）と DB 側（B）の差分で、未宣言の入口と DB 直接接続を列挙できる。未観測の比率は NA-012-5 の範囲に入る | パイロット 2〜3 サービスで N 日分の計数と span を集め、意図的に未宣言 handler と DB 直接接続を混入する（M-01） | 混入した未宣言入口・DB 直接接続をすべて検出。未観測比率の上限は TBD（所有者 プラットフォームチーム長、期限 G4、決め方: 初回実測と A-055） | R-058, R-164, G-082, G-050, TH-TC-018 |
| TC-012-02 | 計数による検査で、判断のない処理を sampling に関係なく数えられる | sampling 率 1% の条件で PEP を外した handler を混入し、計数と span の両方で検出を比べる（M-03） | 計数で混入をすべて検出 | R-059, G-082, K-01(b) |
| TC-012-03 | カスタム静的ルールの検出率・誤検知率が実用範囲にある | 3 言語＋SDK なしの 1 言語で、PEP 除去・テナント scope 除去・結果の握りつぶしの変異体を k 件ずつ埋め込む（M-02） | 事前登録した違反集合の検出率 100%（G-072・K-06(c)）。誤検知率は TBD（所有者 CISO、期限 G4） | R-059, R-062, G-072 |
| TC-012-04 | PEP 記録と facade の decision event の双方向突合で、欠落と偽装を検出できる | decision_id の欠落、facade を経ない偽の decision_id、facade 側だけの記録を注入する | 注入をすべて検出 | R-059, T-030, TH-TC-030 |
| TC-012-05 | PDP facade の停止・timeout・誤応答で、PEP が階層別の fail-mode どおりに動き、fail-open しない | ADR-013 TC-13 系と共同で注入する | write 以上の許可 0 件。read-sensitive は ADR-013 D13-25 どおり | R-262, T-023, TH-TC-023 |
| TC-012-06 | mesh・gateway・sidecar の既定拒否が設定の欠落を検出・拒否する | allow-nothing の削除、`failure_mode_allow=true`、台帳外 route の追加を IaC に混入する | すべて CI か走査で検出 | R-059, T-022, TH-TC-022 |
| TC-012-07 | consumer の再認可で、滞留中の剥奪が拒否される | enqueue 後に剥奪・テナント停止を注入し、剥奪から consumer 拒否までの時間分布と、剥奪後に実行された割合を測る（M-07）。階層別の一貫性指定ごとに比べる | 剥奪後に実行された write 以上 0 件。read-sensitive の時間上限は TBD（所有者 CTO＋CISO、期限 G4、決め方: ADR-010 の上限 B と BIA） | R-058, R-143, T-024, TH-TC-024 |
| TC-012-08 | RLS（FORCE を含む）の性能影響が数値契約の範囲に入る | 代表クエリの p50／p99／p99.9 を RLS の有無で比べる。最大テナント規模と全テナント数のデータ、コールドキャッシュを含める（M-04） | 遅延増の上限は TBD（所有者 CTO、期限 G4、決め方: DL-20 の R-190 系） | R-061, A-009 |
| TC-012-09 | transaction pooling 越しでテナント文脈が混線しない。未設定時に fail-closed になるかを確かめる | PgBouncer の transaction pooling で、`SET` と `SET LOCAL` を高並行・長時間で比べ、他テナント行の取得件数と、`SET LOCAL` 後の未設定トランザクションでの `current_setting` の挙動を測る（M-05） | `SET LOCAL` 方式で他テナント行 0 件。fail-closed が成り立たない場合はポリシー側で既定値を拒否する形に改める | R-061, RS-08#50 |
| TC-012-10 | DB ロールと表設定の監査が自動で取れる | RLS 無効表・FORCE 未設定表・BYPASSRLS ロール・owner 接続・security_invoker のない view を混入し、走査で数える（M-06） | 混入をすべて検出（K-05(b)） | R-061, R-062, G-082 |
| TC-012-11 | object storage の区画が IAM 条件で二重化され、他区画への資格情報の取得が拒否される | 侵害された workload を想定し、他区画のタグでの資格情報の取得、区画外 object の読取を試す | すべて拒否され、試行が監査に残る | R-061, ATK-06 |
| TC-012-12 | テナント別 index を 1 cell 分のテナント数で運用でき、件数・集計・スコアから他テナントの情報が出ない | テナント別 index と共有 index＋DLS を比べ、側路の推測可否と運用負荷（index 数、更新遅延）を測る（M-08） | テナント別 index で他テナント情報の推測 0 件。運用負荷の上限は TBD（所有者 SRE 責任者、期限 G4） | R-061, G-105, T-076, NA-012-4 |
| TC-012-13 | 署名付き URL・export の発行が認可と記録に結ばれ、TTL 上限を超えない | 剥奪後の新規発行、TTL 上限超の発行、記録のない発行を試す（M-11） | すべて拒否または検出 | R-061, R-143, G-136(a), T-077 |
| TC-012-14 | cross-tenant property test が全 entry point に生成でき、PEP 変異体を検出する | 台帳から要求を生成し、PEP 変異体と RLS 変異体で検出力を測る（M-10） | 他テナントへの許可 0 件（K-03(a)）。検出力の下限は TBD（所有者 CISO、期限 G4、決め方: K-03(b)） | R-172, R-060, G-083 の前段、TH-TC-020, TH-TC-021 |
| TC-012-15 | 本番相当環境の迂回試験（D12-38）がすべて拒否・検知される | 事前登録した注入手順 | すべて拒否または検知 | R-060, T-016, T-018 |

- 合否基準のうち BIA に紐付けるもの（遮断時の誤 deny、再認可の遅延）は、BIA の B13 と DL-20 の数値契約に結び付ける [D]。A-ID に紐付くもの（TC-012-01 の A-055、TC-012-12 の NA-012-4）は、実測で前提台帳の値を置き換える [D]。

### 7.2 第三者評価で確かめること

- 独立評価者による PEP bypass と cross-tenant の侵入試験（DL-59、G-083）。範囲に、外部の位置からの BOLA・テナント文脈ヘッダの偽装、内部の位置（ATK-06）からの gateway 迂回・DB 直接接続・他区画資格情報の取得・envelope の改ざんを含める [D]。合格は G-083 の「未解決の Critical/High 0 件」とする [D]。
- 静的ルールと台帳生成器の独立レビュー（ルールが自社 PEP 契約の呼出し規約を網羅しているか、例外台帳の承認が規則どおりか）[D]。
- RLS 構成と DB ロールの設計レビュー（DB・バックアップのアクセスレビュー。threat-catalog T-077 の E6）[D]。
- K-01・K-03・K-05・K-06 の計測方法が操作されにくいこと（計数の改ざん、例外台帳への恣意的な登録）の監査 [D]。

---

## 8. 再検討トリガーと見直し時期

| トリガー | 見直す決定 |
|---|---|
| TC-012-01 で未観測の entry point の比率が上限を超える、または合成試験で観測を作れない経路が多い | D12-11（宣言×観測の方式）。ネットワーク層の遮断を主にする方式との比較 |
| TC-012-03 でカスタムルールの検出率が 100% に届かない言語がある | D12-15、D12-14（その言語では SDK 必須にするか、sidecar 例外に寄せるか）。§9.2 L-01 の扱い |
| TC-012-08 で RLS の遅延増が数値契約を超える | D12-21（RLS の範囲を read-sensitive 以上の表に限る、または案D の分離を広げる） |
| TC-012-09 で `SET LOCAL` 方式でも混線が出る、または fail-closed が成り立たない | D12-21 の文脈設定方式 |
| TC-012-12 でテナント別 index が運用できない（NA-012-4 が否定される） | D12-26（cluster・cell 単位の分離、または検索機能の範囲縮小）。共有 index＋DLS をテナント間境界にすることは引き続き採らない |
| NA-012-1・NA-012-2 の要員が DL-31 の計画で確保できない | 段階導入の順序（§6.4）と、案C 相当で止める範囲の決裁（DL-42 の PEP 整備を独立プロジェクトにする判断。A-055 の影響欄） |
| PostgreSQL で RLS 関連の新しい CVE 類型が公表される | D12-21（文脈設定の方式、パッチ SLA） |
| Transaction Tokens が RFC になる、または失効・大きく変わる | D12-31（envelope の `txn`）。standards-status SS-B04 の監視 |
| AuthZEN の後続仕様（Obligations、search 等）が Final になる | D12-14（enforcement 記録の欄）、ADR-011 と同時 |
| 実事故（自社・他社の一次報告）で、本書の層を迂回した型のテナント間漏えいが報告される | 該当する D と TC |
| ADR-011・ADR-022 が L-01 を解消する改訂を行う、または U-03・U-04 が決裁される | D12-14、D12-32 |

- 定期の見直しは、Gate 4（PoC の事前登録）前と、段階導入（G6）開始後は年 1 回、加えて A-101 の再決裁（初回 G6 開始から 3 年以内）に合わせて行う案とする [D][A-101]。

---

## 9. 依存関係

### 9.1 他 ADR・設計文書・契約

| 種別 | 文書 | 依存の内容 |
|---|---|---|
| ADR | ADR-005 token profile | edge の外部 token 検証（D1-2）、`tid` の照合（V9）、内部 token |
| ADR | ADR-006 失効と継続評価（未起草） | 署名付き URL の残り寿命と剥奪 SLO、ストリーム接続の再認可方式 |
| ADR | ADR-008 管理面・CI/CD（未起草） | ルール・台帳の二者レビュー、特権ロール（BYPASSRLS・ETL）の扱い |
| ADR | ADR-009 workload identity・Txn-Token（未起草） | mesh の相互認証、`txn` の採否、委任の伝搬 |
| ADR | ADR-010 認可エンジン・整合性 | read-sensitive の評価下限（D-13）、剥奪フェンス（D-18）、区画キー（D-12） |
| ADR | ADR-011 policy 言語・PEP–PDP API | L0 照合（D1-1）、評価不能 deny（D3-3）、facade 不達の扱い（D3-6）、SDK 既定拒否（D5-8）、decision event（D8-3・D8-4） |
| ADR | ADR-013 cell・fail-mode | fail-open 禁止（D13-23）、階層別挙動（D13-25）、判定記録（D13-26）、entry point ごとの階層宣言（D13-28）、配布物の wave（D13-30） |
| ADR | ADR-014 監査データ（未起草） | enforcement 記録・decision event の欄と記録率、改ざん検知 |
| ADR | ADR-021 不可逆識別子 | entry point ID・拡張属性の名前空間、資源 ID にテナントを埋め込まない（D21-14） |
| ADR | ADR-022 連携契約 | SDK の責務の上限（D-4）、SDK なしの連携（G-140）、契約試験キット |
| ADR | ADR-024・ADR-025・ADR-026・ADR-028・ADR-029（未起草） | 越境共有の例外、一覧・検索、非同期・長時間委任、テナントの統合・分割と区画、特権・break-glass |
| 設計文書 | DL-10 03_threat-model/dfd-entry-points.md | entry point 台帳の DFD 上の位置づけ、差分レポートの様式 |
| 設計文書 | DL-15 04_architecture/pep-contract.md | 本書の決定の仕様化（台帳 schema、enforcement 記録、ルール R-01〜R-16、TC） |
| 設計文書 | DL-57 04_architecture/data-outside-pep.md | PEP 外データ経路の統制の本体 |
| 設計文書 | DL-19・DL-20 | fail-mode の値、数値契約 |
| 設計文書 | DL-31 段階導入、DL-50 As-Is 棚卸し | 後付けの順序と実データ |
| 契約 | DL-70（OpenAPI・AsyncAPI の拡張属性）、DL-72（AuthZEN profile）、DL-75（検証規則）、DL-80（試験キット） | 宣言形式、enforcement 記録、envelope、負例ベクタ。不可逆側 (1)〜(3) を DEC-8 の凍結対象に含める提案 |
| 統治 | 01_governance/kri.md（K-01・K-03・K-05・K-06）、stop-authority.md（S1・S3）、DL-05 受容票 | 指標、停止、例外の受容 |

### 9.2 主要 ADR との論点

本書は主要 ADR を編集していない。次の論点は、関係 ADR の起草者と整合調整（reconciliation-notes の追補）で扱うよう申し送る [D]。

| ID | 論点 | 本書の扱い | 関係 |
|---|---|---|---|
| L-01 | ADR-011 D5-4 は「PEP は言語別の薄い SDK を通してだけ PDP を呼ぶ」とし、ADR-022 D-4・G-140 は「SDK を使わずに契約と負例ベクタだけで適合できる」ことを凍結の承認条件にしている。SDK を提供しない言語のサービスは ADR-011 D5-4 を文字どおりには満たせない | coverage を SDK ではなく enforcement 記録で定義し（D12-14）、SDK のない言語も契約適合の自前実装で同じ検査に合格すれば coverage を満たすとした。ADR-011 D5-4 を「SDK または契約適合の自前実装を通してだけ」と読む改訂を提案する。静的ルールの強さが言語で異なる点は RR12-02 | ADR-011、ADR-022 |
| L-02 | REQ-03 J10 は「未分類の操作は本番に出さず、PEP の coverage 検査で未登録の操作を拒否する」とし、ADR-013 D13-28 は「宣言のない entry point は privileged として扱う」とする。実行時に未登録の入口へ要求が届いた場合の挙動が 2 通りに読める | 配備前は J10 どおり配備ゲートで拒否する（D12-13）。実行時は、台帳にない入口は edge で 404、mesh・PEP でも拒否する（D12-02、D12-07）。ADR-013 D13-28 は「台帳に登録済みだが fail-mode 設定を取得できない entry point」に適用すると読み、ADR-013 の注記での明確化を提案する | ADR-013、REQ-03 |
| L-03 | REQ-03 §3.7 は read-sensitive の allow の記録率を ADR-014 に委ね、ADR-011 D8-4 は decision event の 100% 出力を決めている。記録率が 100% より下がると、要求単位の突合（D12-17）は抽出になる | coverage の計数（D12-12）を監査記録と別経路にし、記録率の決定に影響されないようにした。要求単位の突合の範囲は ADR-014 の決定に従う | ADR-011、ADR-014、REQ-03 |
| L-04 | INV-1・ADR-021 D21-14 は資源 ID にテナント ID を埋め込まないとする。object storage の prefix 分離（RS-08#55）はキーにテナントを表す値を置く | prefix には区画レジストリの内部値（区画キー）を使い、テナント ID そのものは使わない（D12-24）。署名付き URL の path に区画キーが現れる点は、区画キーがテナント ID でないことと、要配慮データを BFF 配信にすること（D12-25）で扱う | ADR-021、ADR-010 D-12 |
| L-05 | ADR-010 の棄却案（§3、テナントのガードレールを PEP 側で評価）と、採用された ADR-011 の分担（L0 は PEP SDK、G 段は facade）の間で、テナント照合が 2 か所にある | 両方を維持する。PEP の L0（三者一致）は PDP 呼出し前の局所照合、facade の G 段規則 1 はテナント不一致の決定論的 deny で、二重化として扱う（D12-04）。矛盾ではないが、L0 の照合失敗は PEP 側の拒否で PDP の応答ではないため、ADR-011 §2.6 の閉じた reason 列挙（`allow`, `deny_guardrail:<規則ID>` ほか）には該当する値がない。enforcement 記録側の拒否理由として DL-72 で別に定める必要がある | ADR-010、ADR-011 |
| L-06 | reconciliation-notes U-03（OpenFGA の窓 W 方式）と U-04（判定記録への署名）が未決であり、consumer の read-sensitive の再認可の鮮度（D12-32）と、要求単位の突合での判定記録の真正性（D12-17）がその決裁に依存する | read-sensitive は ADR-010 D-13 に従うとし、U-03 の決裁で読み替える。判定記録の署名は U-04 の決裁に従い、署名がない場合の突合は facade の decision event と監査の改ざん検知（ADR-014）に依存する | ADR-010、ADR-011、ADR-013 |
| L-07 | ADR-022 D-4-1 は SDK の責務を 5 つ（token 検証、AuthZEN 呼出しのラッパ、Txn-Token と traceparent の伝播、監査イベントの共通項目、非推奨警告と利用計測）に限り、D-4-2 は契約にない意味論を SDK に持たせない。本書は SDK（と契約適合の自前実装）に、enforcement 記録（D12-14）、sampling から独立した計数（D12-12）、L0 の三者一致（D12-04。ADR-011 D1-1）を求める | これらを (2) AuthZEN ラッパと (4) 監査イベントの責務の内側と読み、D-4-3 に従って契約（DL-72・DL-75）に規範として書く。SDK 独自の挙動にはしない。ADR-022 D-4-1 の列挙にこの 3 点を明記する改訂を提案する（独立レビューで追加） | ADR-011、ADR-022 |

---

## 対応表

R-requirements.md と G-goal-criteria.md から、対応成果物欄に本書（05_adr/ADR-012-pep-coverage-storage-guardrails.md、ADR-012、DL-12）を含む行を Grep で抽出した結果、R・G のどちらにも本書を名指しする行はなかった [D]。deliverables.md §5 の ADR-012 行の対応要求（R-059〜R-062）、本書が設計判断を記録する DL-15（04_architecture/pep-contract.md）・DL-57（04_architecture/data-outside-pep.md）を対応成果物に含む行、および内容上関係する行を対象にした [D]。G-020 は全 ADR を対象とする行である [D]。閉じ方の区分は R・G の定義に従い、本書の範囲で閉じたもの以外は残課題を書いた [D]。

| R/G | 要求の要旨 | 本書の応答 | 区分 | 本書での状態と残課題 |
|---|---|---|---|---|
| R-058 | 全 entry point inventory（batch／queue／内部 API／データ直アクセス含む） | D12-08〜D12-12、D12-30、D12-32、TC-012-01 | C | 方式は決定。実データの棚卸しと差分 0 件の実測は未達（DL-10、DL-50、TC-012-01） |
| R-059 | enforcement coverage の機械的検証 | D12-14〜D12-19、TC-012-02〜TC-012-04、TC-012-06 | C | 方式は決定。カスタムルールの実装と検出力の実測は未達 |
| R-060 | bypass test | D12-37〜D12-39、TC-012-15、§7.2 | D | 試験の設計まで。独立評価者の実施（DL-59）は未達 |
| R-061 | DB/storage 側 tenant guardrail（RLS 等） | D12-20〜D12-30、TC-012-08〜TC-012-13 | C | 方式は決定。後付けと性能・混線の実測は未達。PEP 外データの統制本体は DL-57 |
| R-062 | 上記の CI 継続自動検証 | D12-13、D12-15、D12-19、D12-29、D12-41 | C | 方式は決定。CI 上での稼働（G-072）は未達 |
| R-269 | 承認条件 4: 全 entry point の PEP coverage を機械検証でき、DB/storage にも guardrail | R-058〜R-062 の行のとおり | C | 未達（PoC と段階導入の実測が必要） |
| R-250 | テナント境界の多層化（tid＋resource-derived tenant＋ストレージ境界＋サービス認可） | D12-01、D12-04、D12-20、D12-24 | A | 本書で設計を閉じた。検証は R-172 |
| R-254 | PEP/PDP 分離（各サービスで bypass 不能にする） | D12-01、D12-05、D12-14〜D12-17（ADR-011 D5-3・D5-4・D5-8 と分担） | A | 設計は閉じた。「bypass 不能」は性質の主張として書かず、K-01・K-03 の値と bypass 試験の結果で示す（CL-0110） |
| R-262 | 既定 deny を維持し、可用性との調停は操作階層ごとの失敗モードで行う | D12-07、D12-06、TC-012-05（fail-mode の値は ADR-013・DL-19） | A | 本書の範囲（各層の既定拒否）は閉じた |
| R-164 | DFD（全 entry point、trust boundary、非同期経路、管理面、緊急経路） | D12-08 の種別、D12-11 の B 集合 | A | DFD 本体は DL-10。本書は入力を供給 |
| R-168 | 具体脅威 10 の検証（tenant confusion、BOLA、stale allow を含む） | D12-04、D12-32、TC-012-07・TC-012-14 | C | tenant confusion・BOLA の TC 案まで。他の脅威は各 ADR |
| R-172 | PoC: cross-tenant property test | D12-41、TC-012-14 | C | 未達（実測） |
| R-065 | 独立 pentest（cross-tenant 含む） | §7.2 | D | 範囲の提案まで。実施は DL-59・DL-30 |
| R-071 | API Top 10 負例試験 | D12-15 R-08、D12-41、§7.2 | D | 自前の負例は TC-012-14、独立評価は DL-59 |
| R-011 | テナント間漏えい許容ゼロの承認と測定可能な定義 | D12-42（K-01・K-03・K-05・K-06 を測定手段として供給） | B | 承認は GOV-02 と経営決裁。本書は測定手段まで |
| R-143 | 剥奪→拒否の最大時間（操作単位） | D12-25、D12-32、D12-34、TC-012-07・TC-012-13 | C | 非同期経路と署名付き URL の分を供給。値は ADR-006・DL-20 |
| R-253 | 一貫性認識（剥奪、新旧 ACL、outbox、revision-aware cache） | D12-27（判定キャッシュの禁止）、D12-31・D12-32（envelope の一貫性トークン） | A | 本書の範囲は閉じた。本体は ADR-010 |
| G-082 | 全 entry point の棚卸し（差分 0 件）、coverage の機械検証、DB/storage guardrail、CI 継続実行 | D12-08〜D12-30 | C | 未達（判定者: CISO と独立立会人、CI ログ E4） |
| G-072 | アーキテクチャ性質を CI で常時検査し違反件数を KRI に | D12-15、D12-16、D12-19、TC-012-03 | C | 未達（PoC 環境での稼働と混入違反の全検出） |
| G-083 | 独立評価者の PEP bypass と cross-tenant 侵入試験で Critical/High が閉じている | §7.2、D12-37 | D | 未達（DL-59） |
| G-105 | 検索・DWH・ML・export・バックアップ・ログの持出し統制、PoC で ACL 反映遅延と削除伝播 | D12-25、D12-26、D12-28、D12-30、TC-012-12・TC-012-13 | C | テナント分離の方式まで。持出し条件・ACL 反映・削除伝播・監査の本体は DL-57、実測は未達 |
| G-099 | 各 P-xx に PEP の配置・テナント context の伝搬・キャッシュ可否等 | D12-01、D12-06、D12-27、D12-31 | A | 配置の原則を供給。各 P-xx の記述は DL-64 |
| G-125 | 連携開始前の条件（操作階層の割当、DFD 登録等）のチェックリスト | §6.4（台帳登録と静的ルール合格を条件に追加） | A | チェックリスト本体は DL-67 |
| G-136 | 署名付き URL・レガシー proxy・outbound・device の統制と負例 | D12-25（(a)）、D12-02・D12-06（(b) のヘッダ偽装と proxy 迂回）、TC-012-13・TC-012-15 | C | (a)(b) の方式を供給。(c)(d) は DL-64・ADR-005。実測は未達 |
| G-050 | 現行の入口を含む棚卸しを実データで行う | D12-11 の方式を As-Is にも適用 | C | 実データの棚卸しは DL-50 で未達 |
| G-078 | 攻撃者×資産×entry point から T を導出 | §1.3 で T-018〜T-030・T-076〜T-078 に応答 | A | 脅威カタログ本体は DL-11 |
| G-103 | P-04 等のリファレンス実装で cross-tenant 等の負例を確認 | D12-32〜D12-34、TC-012-07・TC-012-14 | C | 未達（DL-22・DL-82） |
| G-114 | 越境共有と resource-derived tenant 照合規則の例外、cross-tenant property test に越境を含める | D12-04（例外は ADR-024 の型だけ）、D12-41 | C | 例外モデルは ADR-024。試験は未達 |
| G-121・G-122・G-142 | モックで負例（deny、cross-tenant 等）を再現、consumer の CI で自己判定、基盤側 CI で全 consumer 試験 | D12-41（生成器を DL-80 に載せる） | C | 試験キット本体は DL-80。未達 |
| G-135 | 27 種別に P-xx を割り当てる | D12-08 の種別は G-082・G-135 の列挙と対応させた | A | 割当本体は DL-64 |
| R-205 | typed ReBAC＋限定 ABAC＋resource-local PEP の方向性を実証で裏付け | D12-01（object 単位はサービス内 PEP）、TC-012-08・TC-012-14 | C | resource-local PEP の配置は本書で決定。実証は DL-22 の PoC で未達（ReBAC 側は ADR-010・ADR-011） |
| R-242 | API Top 10 の BOLA・認証不備・BOPLA・BFLA を負例試験へ組み込む | D12-15 R-08（BOPLA）、D12-07 edge の route 既定拒否（BFLA）、D12-41（BOLA・cross-tenant）、TC-012-14 | C | 負例の設計まで。試験キット（DL-80）と PoC での実施は未達 |
| R-273 | 承認条件 8: 独立設計レビュー、conformance、cross-tenant pentest、red team で Critical/High が閉じている | §7.2（cross-tenant pentest と PEP bypass の範囲） | D | 本書は cross-tenant 部分の範囲提案まで。実施は DL-59 で未達 |
| G-080 | テナント間漏えい許容ゼロの運用定義を経営が承認 | D12-42（K-01・K-03・K-05・K-06 を「既知の未緩和経路 0 件」の測定手段として供給） | B | 承認は GOV-02 と経営決裁で未達 |
| G-102 | 非同期・長時間ジョブの委任（ジョブ所有者の退職・権限喪失時を含む） | D12-31〜D12-35 | C | 再認可と停止の既定まで。委任の伝搬は ADR-009・ADR-026、負例の実測（TC-012-07）は未達 |
| G-124 | 参加の手順（PEP の組込み、契約試験の合格等） | §6.4（台帳登録・静的ルール合格・enforcement 記録） | A | 手順本体は DL-67 等 |
| G-128 | テナント context・キャッシュの可否・非同期処理の問いと答え | D12-04、D12-27、D12-31〜D12-34 | A | FAQ 本体は 10_integration の該当成果物 |
| G-129 | 委託契約・発注仕様の連携要件（PEP coverage を含む） | D12-13・D12-14（coverage の判定基準を契約で定義）、§6.4 | B | 条項案と採否は調達部門・法務で未達 |
| G-140 | SDK 方針（責務の上限、SDK なしの連携） | D12-14（coverage を SDK でなく enforcement 記録で定義）、§9.2 L-01・L-07 | A | 方針の正本は ADR-022 D-4。本書は coverage 判定との整合を供給 |
| G-020 | 全 ADR に文脈・選択肢・却下案と理由・決定・帰結・可逆性・再検討トリガー・証拠がある | 本書 §1〜§9、冒頭の可逆性、§7 | A | 作成者以外の自動検査・レビューは未実施 |

---

## 残課題

- 本書は単一の AI エージェントによる起草で、主要 ADR のような模擬パネル（起草レンズ 3 本と判定者 3 名）を経ていない。§4 の評価は自己評価である [D]。
- Envoy ext_authz の `failure_mode_allow` [^44] と Redis ACL [^45] は research ノートにない原典である。起草者と独立レビュー者が 2026-10-15 に原文を確認したが、research ノートへの収録と traceability/ の照合ログへの追記は行っていない（本作業では指示外）[D]。
- 新規仮定 NA-012-1〜NA-012-7 を前提台帳へ登録する必要がある [D]。
- §9.2 の L-01〜L-07 は、関係 ADR の改訂または reconciliation-notes の追補で解消する必要がある [D]。
- 拡張属性・span 属性・envelope 欄の名前は ADR-021 と DL-70 で確定する（TBD、所有者 CTO、期限 DEC-8 前）[D]。
- 合否基準の TBD（§7.1）は DL-22 の事前登録で確定する [D]。

## レビュー記録

> 独立レビュー（作成者以外の AI エージェント Claude による。2026-10-15）。実在の CTO/CISO の判定・決裁ではない（CONVENTIONS §8）[D]。主要 ADR と reconciliation-notes.md は編集していない。

**照合の範囲**: ADR-005（D1-2・V9・D9-3）、ADR-010（D-12〜D-14・D-18）、ADR-011（D1-1・D3-3〜D3-6・D5-2〜D5-8・D6-3・§2.6・D8-3・D8-4）、ADR-013（D13-23〜D13-30）、ADR-021（D21-14）、ADR-022（D-4・NA-022-1・G-140）、reconciliation-notes（§3.2・U-02〜U-04）、kri.md（K-01・K-03・K-05・K-06 の定義）、threat-catalog（T-016〜T-030・T-076〜T-078）、attacker-model（ATK-ID）、stop-authority（S1・S3・P3）、assumptions-register（引用した A-ID の値）、RS-08#1〜#68 の本文と脚注、standards-status（SS-B04・SS-C13・SS-I14・SS-I18・SS-I20・SS-I21）[D]。research 外の原典 3 件（Envoy ext_authz、Redis ACL、Istio Security concepts）は 2026-10-15 に原文を取得して照合した [D]。

**修正（18 件）** [D]

| # | 観点 | 箇所 | 内容 |
|---|---|---|---|
| 1 | (3) 対応表 | 冒頭の対応要求 | R-058 の対応成果物は pep-contract.md ではなく dfd-entry-points.md・as-is-inventory.md なので記述を直した。G-083 を DL-15・DL-57 の行から関連へ、G-136 を DL-57 の行へ移した |
| 2 | (3) 対応表 | 対応表 | R-205、R-242、R-273、G-080、G-102、G-124、G-128、G-129、G-140 の 9 行を追加した（キーワード Grep で検出した漏れ。G-140 は本文で引きながら表になかった） |
| 3 | (1) 整合 | 要旨・D12-11 | 宣言済みで未観測の入口（S∖O）を K-01(a) に数えていた。kri.md §4.2 の K-01(a) の定義（台帳にない、または PEP を経由しない入口）に合わせ、S∖O を別掲にした |
| 4 | (1) 整合 | D12-07・D12-14・D12-17 | ADR-013 D13-25 は read-sensitive に known-good を許すが、本書は「判定が得られなければ拒否」とだけ書き、known-good の要求が K-01(b) と双方向突合で欠落・偽装に誤検出され得た。鮮度区分の欄と突合規則を加えた |
| 5 | (1) 整合 | D12-32 表 read-sensitive 行 | ADR-010 D-18 の剥奪フェンスは PoC 合格を有効化の条件とする採用候補であり、未有効の間は enqueue 後の剥奪が反映されない。有効化までは最新強制とした（ADR-011 D6-3 の格上げ、RS-08#61 (b)） |
| 6 | (1) 整合 | D12-32 表 break-glass 行 | 根拠を ADR-013 D13-25 としていたが、同表は非同期実行を直接定めていない。本書の判断 [D] と明記した |
| 7 | (1) 整合 | D12-14・D12-31 | `txn` を「採用時」としていたのを、ADR-005 D9-3（write 以上で発行）と U-02 に合わせて書き直した |
| 8 | (1) 整合 | D12-31 | 一貫性トークンの参照先 ADR-011 D6-1（context の名前空間の規則）を、ADR-010 D-14 と ADR-011 §2.6 の `consistency.token` に直した |
| 9 | (1) 整合 | §9.2 L-05 | reason の列挙は D6-1 ではなく §2.6 の表にあり、L0 の照合失敗に当たる値がないことを明記した |
| 10 | (1) 整合 | §9.2 L-07（新設） | ADR-022 D-4-1 の SDK 責務 5 つに、本書が求める enforcement 記録・計数・L0 が明示されていない論点を追加した。要旨の論点数を 7 件にした |
| 11 | (2) 脚注 | §1.2 Istio 行・[^52] 新設 | 「allow-nothing から始める慣行」は [^29]（reference の頁）ではなく Security concepts の頁にある（RS-08#36 の [^51]）。原典を再確認し脚注を追加した |
| 12 | (2) 脚注 | [^44]・[^45]・§1.2・§1.5・残課題 | Envoy・Redis の記述を原文で再確認し、主張と一致することを記録した。research ノートへの収録は未了のまま残した |
| 13 | (2) 脚注 | [^33] | 日付を standards-status SS-B04 と reconciliation-notes に合わせ 2026-07-30 とした |
| 14 | (2) 強度 | D12-01 | API1:2023 は awareness 文書で小文字の should である旨（RS-08#7）を加えた |
| 15 | (4) 藁人形 | 案B・比較表・棄却理由 | 案B は「未署名ヘッダを信頼し DB guardrail なし」の弱い形だった。署名付き文脈と、path の資源 ID による PDP の ReBAC 判定を持つ最も強い形に書き直し、欠点を「本文・入れ子・子資源・一覧・非同期と業務 DB の正本との照合に及ばない」に絞った。案C に ADR-011 D5-4 を文字どおり読んだ形である利点を加えた |
| 16 | (5) 前提 | 案D | A-062（所在地の指定を受けるテナント 500）を物理分離の要求と読んでいた。所在地は ADR-013 の cell 割当で扱うとし、silo の条件を A-081 に限った |
| 17 | (5) 根拠のない数値 | §1.4・§3 | 案D の 150 万単位の前提（テナントデータを持つサービス半数）を NA-012-6、各案の費用概算を NA-012-7 として新規仮定に登録要とした |
| 18 | (5) その他 | §1.3・§1.4 | T-026 の行の「D12-13 ルール R-08」を D12-15 に、T-018 の行に TC-012-15 を加えた。本文で使っている A-101・A-110 を依存前提に加えた |

**確認して修正不要としたもの** [D]: N-1〜N-20 の強度・版・状態（ASVS の L 区分、SP 800-53B のベースライン非収録、SP 800-207 の must、OpenAPI 3.2.1 の空 requirement、OTel SpanKind の Stable、AuthZEN 1.0 Final、CloudEvents の SHOULD NOT と Auth Context の 1.0.3-wip、Transaction Tokens の draft-11）は RS-08・RS-07・RS-17 と standards-status に一致した。PostgreSQL・PgBouncer・AWS・Elastic・BigQuery・SpiceDB の行は RS-08#40〜#62・#69 に一致した。禁止表現は検出されなかった。

**未解決（本レビューで閉じないもの）** [D]

- L-01・L-02・L-07 は ADR-011・ADR-013・ADR-022 の改訂提案であり、主要 ADR の側は編集していない。reconciliation-notes の追補で扱う必要がある。
- 修正 5（フェンス未有効時の最新強制）は consumer の PDP 負荷を増やす。ADR-010 H-02 と TC-012-07 の結果で見直す。
- research 外の 3 原典（[^44][^45][^52] のうち [^44][^45]）の research ノート収録と照合ログ記録は未了。
- 案A〜E の比較（§4）は依然として起草者の自己評価で、判定者パネルを経ていない。
- NA-012-1〜NA-012-7 の前提台帳への登録は未了。

## 参考文献

[^1]: OWASP『ASVS 5.0.0 — V8 Authorization』v5.0.0, 2025-05-30. https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/en/0x17-V8-Authorization.md （参照箇所: 8.2.1〜8.2.3, 8.3.1〜8.3.3, 8.4.1、確認日: 2026-10-03。RS-08#3〜#6, #57）
[^2]: OWASP『ASVS 5.0.0 — V16 Security Logging and Error Handling』v5.0.0, 2025-05-30. https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/en/0x25-V16-Security-Logging-and-Error-Handling.md （参照箇所: 16.3.2、確認日: 2026-10-03。RS-08#34）
[^3]: OWASP『ASVS 5.0.0 — V4 API and Web Service』v5.0.0, 2025-05-30. https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/en/0x13-V4-API-and-Web-Service.md （参照箇所: 4.1.3、確認日: 2026-10-03。RS-08#22）
[^4]: OWASP『ASVS 5.0.0 — V15 Secure Coding and Architecture』v5.0.0, 2025-05-30. https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/en/0x24-V15-Secure-Coding-and-Architecture.md （参照箇所: 15.4.2、確認日: 2026-10-03。RS-08#58）
[^5]: OWASP『API1:2023 Broken Object Level Authorization』API Security Top 10 2023. https://github.com/OWASP/API-Security/blob/master/editions/2023/en/0xa1-broken-object-level-authorization.md （参照箇所: Is the API Vulnerable?, How To Prevent、確認日: 2026-10-03。RS-08#8, #9）
[^6]: OWASP『API5:2023 Broken Function Level Authorization』API Security Top 10 2023. https://github.com/OWASP/API-Security/blob/master/editions/2023/en/0xa5-broken-function-level-authorization.md （参照箇所: How To Prevent、確認日: 2026-10-03。RS-08#11）
[^7]: OWASP『API9:2023 Improper Inventory Management』API Security Top 10 2023. https://github.com/OWASP/API-Security/blob/master/editions/2023/en/0xa9-improper-inventory-management.md （参照箇所: How To Prevent、確認日: 2026-10-03。RS-08#21）
[^8]: NIST『Electronic (OSCAL) Version of NIST SP 800-53 Rev 5.2.0 Controls and SP 800-53A Rev 5.2.0 Assessment Procedures』version 5.2.0. https://github.com/usnistgov/oscal-content/blob/main/nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_catalog.json （参照箇所: AC-3, AC-3(9), AC-4, AC-6(9), AC-6(10), AC-25, SA-11(1) の statement / discussion、確認日: 2026-10-03。RS-08#12, #13, #15, #16, #18）
[^9]: NIST『SP 800-53B Control Baselines（OSCAL profiles: LOW / MODERATE / HIGH）』version 5.2.0. https://github.com/usnistgov/oscal-content/tree/main/nist.gov/SP800-53/rev5/json （参照箇所: 各 baseline profile の include-controls、確認日: 2026-10-03。RS-08#14, #18）
[^10]: NIST『SP 800-207 Zero Trust Architecture』2020-08. https://doi.org/10.6028/NIST.SP.800-207 （参照箇所: §2 p.5（implicit trust zone）, §3 p.10、確認日: 2026-10-03。RS-08#19）
[^11]: PostgreSQL Global Development Group『PostgreSQL 18 Documentation §5.9 Row Security Policies』18. https://www.postgresql.org/docs/18/ddl-rowsecurity.html （参照箇所: 冒頭の概説（default-deny、BYPASSRLS、table owner、FORCE）, 参照整合性と covert channel の段落, 副問合せと競合状態の例、確認日: 2026-10-03。RS-08#40, #44）
[^12]: PostgreSQL Global Development Group『PostgreSQL 18 Documentation — ALTER TABLE』18. https://www.postgresql.org/docs/18/sql-altertable.html （参照箇所: NO FORCE / FORCE ROW LEVEL SECURITY、確認日: 2026-10-03。RS-08#41）
[^13]: PostgreSQL Global Development Group『PostgreSQL 18 Documentation — CREATE ROLE』18. https://www.postgresql.org/docs/18/sql-createrole.html （参照箇所: BYPASSRLS / NOBYPASSRLS、確認日: 2026-10-03。RS-08#41）
[^14]: PostgreSQL Global Development Group『PostgreSQL 18 Documentation — CREATE VIEW』18. https://www.postgresql.org/docs/18/sql-createview.html （参照箇所: security_invoker パラメータ, Notes、確認日: 2026-10-03。RS-08#45）
[^15]: PostgreSQL Global Development Group『PostgreSQL 18 Documentation — SET』18. https://www.postgresql.org/docs/18/sql-set.html （参照箇所: Description（SET / SET LOCAL の有効範囲）、確認日: 2026-10-03。RS-08#48）
[^16]: PostgreSQL Global Development Group『PostgreSQL 18 Documentation §9.28.1 Configuration Settings Functions』18. https://www.postgresql.org/docs/18/functions-admin.html （参照箇所: current_setting, set_config、確認日: 2026-10-03。RS-08#48, #50）
[^17]: PostgreSQL Global Development Group『CVE-2024-10976: PostgreSQL row security below e.g. subqueries disregards user ID changes』2024-11-14. https://www.postgresql.org/support/security/CVE-2024-10976/ （参照箇所: 説明文, Version Information、確認日: 2026-10-03。RS-08#46）
[^18]: PgBouncer project『PgBouncer features』（確認日時点の最新リリース 1.26.0, 2026-09-23）. https://www.pgbouncer.org/features.html （参照箇所: Transaction pooling の説明, 機能対応表（SET/RESET）、確認日: 2026-10-03。RS-08#49）
[^19]: PgBouncer project『PgBouncer configuration』（確認日時点の最新リリース 1.26.0）. https://www.pgbouncer.org/config.html （参照箇所: server_reset_query、確認日: 2026-10-03。RS-08#49）
[^20]: Amazon Web Services『AWS Prescriptive Guidance — Implementing managed PostgreSQL for multi-tenant SaaS applications on AWS』2021-09-30（更新 2024-04-29）. https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/rls.html （参照箇所: Row-level security recommendations、確認日: 2026-10-03。RS-08#42）
[^21]: Amazon Web Services『IAM User Guide — IAM policy elements: Variables and tags』. https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_variables.html （参照箇所: aws:PrincipalTag を Resource に用いる例、確認日: 2026-10-03。RS-08#55）
[^22]: Amazon Web Services『IAM User Guide — Pass session tags in AWS STS』. https://docs.aws.amazon.com/IAM/latest/UserGuide/id_session-tags.html （参照箇所: session tags の概要, sts:TagSession、確認日: 2026-10-03。RS-08#55）
[^23]: Amazon Web Services『Amazon S3 User Guide — Download and upload objects with presigned URLs』. https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html （参照箇所: Expiration time for presigned URLs, presigned URL がベアラトークンである旨の段落、確認日: 2026-10-03。RS-08#81）
[^24]: Semgrep『Rule ideas — Enforce authentication patterns』semgrep.dev docs. https://semgrep.dev/docs/writing-rules/rule-ideas （参照箇所: Enforce authentication patterns、確認日: 2026-10-03。RS-08#30）
[^25]: GitHub『CodeQL CWE coverage』. https://codeql.github.com/codeql-query-help/full-cwe/ （参照箇所: CWE-285, CWE-639, CWE-862 の行、確認日: 2026-10-03。RS-08#28, #29）
[^26]: MITRE『CWE List』version 4.20, 2026-04-30. https://cwe.mitre.org/data/definitions/862.html （参照箇所: CWE-862, CWE-639, CWE-566 の Description、確認日: 2026-10-03。RS-08#20）
[^27]: OpenAPI Initiative『OpenAPI Specification v3.2.1』2026-09-10. https://spec.openapis.org/oas/v3.2.1.html （参照箇所: §4.10 Operation Object の security フィールド, §4.30 Security Requirement Object、確認日: 2026-10-03。RS-08#23）
[^28]: OpenTelemetry Authors『OpenTelemetry Specification — Tracing API』v1.61.0, 2026-09-14. https://github.com/open-telemetry/opentelemetry-specification/blob/v1.61.0/specification/trace/api.md （参照箇所: SpanKind（Status: Stable）、確認日: 2026-10-03。RS-08#26）
[^29]: Istio Authors『Authorization Policy（reference）』latest（確認日時点の最新リリース 1.31.1）. https://istio.io/latest/docs/reference/config/security/authorization-policy/ （参照箇所: 評価規則（CUSTOM / DENY / ALLOW）、確認日: 2026-10-03。RS-08#36）
[^30]: GraphQL Foundation『Authorization』graphql.org. https://graphql.org/learn/authorization/ （参照箇所: Delegate authorization logic to the business logic layer、確認日: 2026-10-03。RS-08#37）
[^31]: OWASP『Authorization Cheat Sheet』master. https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html （参照箇所: Validate the Permissions on Every Request, Create Unit and Integration Test Cases for Authorization Logic、確認日: 2026-10-03。RS-08#33, #39）
[^32]: OWASP『Web Security Testing Guide v4.2 — WSTG-ATHZ-04 Testing for Insecure Direct Object References』v4.2, 2020-12-03. https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/05-Authorization_Testing/04-Testing_for_Insecure_Direct_Object_References （参照箇所: How to Test、確認日: 2026-10-03。RS-08#39）
[^33]: A. Tulshibagwale et al.『Transaction Tokens』draft-ietf-oauth-transaction-tokens-11, Internet-Draft, 2026-07-30（Expires 2027-01-31）. https://datatracker.ietf.org/doc/draft-ietf-oauth-transaction-tokens/ （参照箇所: §6 Txn-Token Lifetime、WG / IESG 状態表示、確認日: 2026-10-03。RS-08#59、standards-status SS-B04）
[^34]: AuthZed『SpiceDB Concepts — Consistency』（確認日時点の最新リリース v1.56.2）. https://authzed.com/docs/spicedb/concepts/consistency （参照箇所: Levels（minimize_latency, at_least_as_fresh, fully_consistent）, ZedTokens、確認日: 2026-10-03。RS-08#60）
[^35]: Elastic『Controlling access at the document and field level』Elastic Docs（current）. https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/controlling-access-at-document-field-level （参照箇所: Document level security limitations と Note、確認日: 2026-10-03。RS-08#62）
[^36]: Google Cloud『Introduction to BigQuery row-level security』最終更新 2026-09-30. https://cloud.google.com/bigquery/docs/row-level-security-intro （参照箇所: Comparison of authorized views, row-level security, and separate tables、side-channel の記述、確認日: 2026-10-03。RS-08#69）
[^37]: OWASP『LLM08:2025 Vector and Embedding Weaknesses』OWASP Top 10 for LLM Applications 2025. https://github.com/OWASP/www-project-top-10-for-large-language-model-applications/blob/main/2_0_vulns/LLM08_VectorAndEmbeddingWeaknesses.md （参照箇所: Prevention and Mitigation Strategies 1、確認日: 2026-10-03。RS-08#74）
[^38]: PostgreSQL Global Development Group『PostgreSQL 18 Documentation — pg_dump』18. https://www.postgresql.org/docs/18/app-pgdump.html （参照箇所: --enable-row-security、確認日: 2026-10-03。RS-08#76）
[^39]: CNCF CloudEvents『CloudEvents - Version 1.0.2』2022-02-06（GitHub Release `ce@v1.0.2`）. https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md （参照箇所: Privacy and Security、確認日: 2026-10-03。RS-17#32）
[^40]: CNCF CloudEvents『Auth Context』拡張（main ブランチ、1.0.3-wip）. https://github.com/cloudevents/spec/blob/main/cloudevents/extensions/authcontext.md （参照箇所: 冒頭, authclaims、確認日: 2026-10-03。RS-17#33）
[^41]: Snowflake『Understanding row access policies』Snowflake Documentation（版表記なし）. https://docs.snowflake.com/en/user-guide/security-row-intro （参照箇所: 挿入を防がない旨の注記、確認日: 2026-10-03。RS-17#38）
[^42]: Databricks『Row filters and column masks』Databricks on AWS 文書, 2026-09-24 更新. https://docs.databricks.com/aws/en/data-governance/unity-catalog/filters-and-masks （参照箇所: Limitations、確認日: 2026-10-03。RS-17#39）
[^43]: OpenTelemetry『Tracing SDK』specification. https://opentelemetry.io/docs/specs/otel/trace/sdk/ （参照箇所: Sampler の DROP、確認日: 2026-10-03。RS-10#22）
[^44]: Envoy Project『ext_authz（proto）— extensions.filters.http.ext_authz.v3.ExtAuthz』latest（確認時の表示 1.41.0-dev）. https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/ext_authz/v3/ext_authz.proto （参照箇所: failure_mode_allow の説明と既定値、確認日: 2026-10-15。research ノート外。本書の起草者が確認し、独立レビューで同日に failure_mode_allow の true/false の挙動と既定 false を原文で再確認）
[^45]: Redis『ACL』Redis Docs（latest）. https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/ （参照箇所: 冒頭（default user）, Configure ACLs with the ACL command（`user default on nopass ~* &* +@all`）, ACL rules（`~<pattern>`）, Key permissions の Note（key pattern がキー引数のないコマンドを制限しない旨、side channel の扱い）、確認日: 2026-10-15。research ノート外。本書の起草者が確認し、独立レビューで同日に `user default on nopass ~* &* +@all`、nopass の既定ユーザーへの自動認証、key pattern が FLUSHALL・FLUSHDB・SWAPDB を制限しない旨、side channel を読取り権限の評価で考慮しない旨を原文で再確認）
[^46]: Dirk-jan Mollema『One Token to rule them all - obtaining Global Admin in every Entra ID tenant via Actor tokens』2025-09-17. https://dirkjanm.io/obtaining-global-admin-in-every-entra-id-tenant-with-actor-tokens/ （参照箇所: 「The fatal flaw leading to cross-tenant compromise」、確認日: 2026-10-03。RS-12#53）
[^47]: Google Cloud『Securing your app with signed headers』Identity-Aware Proxy 文書, 2026-09-30 更新. https://docs.cloud.google.com/iap/docs/signed-headers-howto （参照箇所: 冒頭（secondary security）, Verifying the JWT header / payload、確認日: 2026-10-03。RS-17#79）
[^48]: OpenID Foundation AuthZEN WG『Authorization API 1.0』Final Specification, 2026-01-11. https://openid.net/specs/authorization-api-1_0.html （参照箇所: Decision の意味論（false なら MUST NOT be permitted to go forward）, 要求 ID（X-Request-ID）の応答への包含、確認日: 2026-10-03。RS-07#63, #66、standards-status SS-C13）
[^49]: PostgreSQL Global Development Group『CVE-2023-2455: Row security policies disregard user ID changes after inlining』2023-05-11. https://www.postgresql.org/support/security/CVE-2023-2455/ （参照箇所: 説明文, Version Information、確認日: 2026-10-03。RS-08#47）
[^50]: Amazon Web Services『AWS Well-Architected Framework — SaaS Lens』2023-04-04. https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/saas-lens.html （参照箇所: General design principles（Isolate all tenant resources）, Pool isolation、確認日: 2026-10-03。RS-08#54）
[^51]: Amazon Web Services『SaaS Lens SEC 2: How are you ensuring that tenant resources are protected from cross-tenant access?』Well-Architected Tool. https://wa.aws.amazon.com/saas.question.SEC_2.en.html （参照箇所: Best Practices, Improvement Plan、確認日: 2026-10-03。RS-08#54）
[^52]: Istio Authors『Security（concepts）』latest. https://istio.io/latest/docs/concepts/security/ （参照箇所: Authorization — allow-nothing, deny-all and allow-all policy（"It is a good security practice to start with the allow-nothing policy"）、確認日: 2026-10-03（RS-08#36 の [^51]）。独立レビューで 2026-10-15 に再確認）
