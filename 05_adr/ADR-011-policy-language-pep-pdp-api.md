# ADR-011 policy 言語・deny semantics・PEP–PDP API

> 文書ID: ADR-011 / 版: 0.1 / 状態: draft（ADR 状態: proposed＝決裁前）/ 最終更新: 2026-10-03
> 可逆性: 部分的に不可逆（非対称）。可逆なのは、engine、engine の DSL、G 段（基盤ガードレール）の評価器、facade の内部実装である。不可逆側に属するのは 4 点ある。(1) PEP–PDP 契約のうち AuthZEN 1.0 準拠部分と自社 profile の拡張キー名・意味（DEC-8 で凍結した後は追加だけ可）。(2) type・relation・permission・profile キーの名前空間（ADR-021）。(3) 公開した deny semantics の基本規則（既定拒否、deny 優先、評価不能は deny）。緩める変更は破壊的変更になる。(4) 監査記録に残る decision_id と model_revision の形式（§2.8、ADR-014）
> DEC-3 対象: いいえ（traceability/deliverables.md §5 の ADR-011 行で DEC-3 列は「—」）。ただし依存先の ADR-013・ADR-021・ADR-022 は DEC-3 対象で、PEP–PDP 契約の凍結は DEC-8 に従う
> 対応要求: R-098, R-204（R-requirements.md で本書を対応成果物に含む行）／G-066, G-109（G-goal-criteria.md で本書を対応成果物に含む行）／R-205（deliverables.md の ADR 表で本書の対応要求に挙がる行。R-requirements.md の R-205 行の主管は 12_poc と 04_architecture）。関連: R-087, R-090, R-091, R-093, R-097, R-099, R-103, R-109, R-127, R-133, R-142〜R-149, R-168, R-171, R-172, R-175, R-177, R-178, R-208, R-250, R-252〜R-254, R-261, R-262, R-280／G-069, G-070, G-072, G-083, G-107, G-108, G-115, G-121, G-123, G-147（全件と閉じ方は末尾の対応表）
> 依存文書: CONVENTIONS.md, traceability/deliverables.md, traceability/R-requirements.md, traceability/G-goal-criteria.md, traceability/claims-ledger.md（CL-0002, CL-0106, CL-0108, CL-0156, CL-0180〜CL-0182, CL-0254）, traceability/dissent-log.md, 01_governance/assumptions-register.md, 03_threat-model/attacker-model.md, 02_requirements/customer-admin-responsibility.md, 05_adr/ADR-005-token-profile.md, research/RS-04, RS-06, RS-07, RS-08, RS-09, RS-10, RS-16, RS-17（各 verification 記録を含む）, research/standards-status.md
> 作成方法: 3 つの起草レンズ（sec: セキュリティ・保証、ops: 運用性・費用・組織実現性、evo: 20 年の進化・退出）の提案と判定者 3 名の採点をもとに、AI エージェント（Claude）が最終起草した。判定者も AI エージェントであり、本書の採点と判定は模擬パネルの自己レビューで、実在する CTO/CISO の決裁ではない（CONVENTIONS §8）[D]。

**要旨（結論）**

- 認可モデルの正本は特定 engine の DSL にせず、基盤所有の正規認可モデル（CAM: Canonical Authorization Model）とする [D][A-104]。CAM の表現力は OpenFGA と SpiceDB の両方へ変換できる共通部分に限り、OpenFGA DSL→CAM の逆変換と往復試験を CI で常時回して、R-208 の「独自言語依存」を統制する [D]（RS-07 結論 13）。判定集計の勝者 evo 案を土台にし、sec 案の G 段（基盤ガードレール）と型付き例外、ops 案の固定カタログ・閉じた reason・SDK ヘルパを取り込んだ [D]。
- 判定は「L0（PEP SDK のテナント照合）・G 段（基盤所有の deny、固定カタログ×テナント設定値）・R 段（typed ReBAC＋CEL カタログ条件）」の論理積で行い、既定拒否・deny 優先・評価不能は deny とする [D]（RS-17#90・#91・#96）。PDP や engine に届かない場合は deny とは別の理由コードで返し、操作階層別の fail-mode（DL-19）で扱う [D]（R-262、CL-0108）。正当な例外（越境共有・特権・break-glass）は G 段 deny に付く型付き例外主体として基盤が所有し、期限と監査を必須にする [D]。
- PEP–PDP 契約は OpenID AuthZEN Authorization API 1.0（Final）の evaluation / evaluations とし、consistency・model_revision・decision_id・reason は版付きの自社 profile として `context` で運ぶ [N][^1][^4][D]（RS-07#60〜#66）。relationship の書込・削除・変更購読は AuthZEN の範囲外なので、DL-73 の書込契約として別に定め、書込応答で consistency_token を返す [D]。
- 事前相談への回答（§2.8・§2.9）: 要求ごとの trace id は access token の claim に入れない [D]。「共通の認証認可を通った」ことの証跡は、相関 ID ではなく、署名付き token（`jti`）・Txn-Token（`txn`、採用時）・facade が全件出力する decision event（decision_id）の組合せに置く [D]（RS-10#17）。所属以外の claim 候補（`acr`/`auth_time`、`act`、`cnf`、`authorization_details`、`status`、版識別）は規範の強度付きで ADR-005/DL-75 へ渡し、認可に使う属性は token ではなく、W3C VC Data Model 2.0 の構造（発行者・有効期間・状態）に倣った出所メタデータ付きの属性辞書で PDP 側が扱う [D][N][^42]。
- 本決定は 3 条件で ops 案（engine DSL の可搬サブセット正本＋manifest）に切り替える。CAM の往復試験・表現率が PoC で不合格、CAM 要員を A-054 の枠で確保できない、A-104 が決裁で否定される、のいずれかである（§4.4・§8）[D][A-054, A-104]。

---

## 1. 文脈

### 1.1 解くべき問題

旧提案は「PDP は所属・relation・role・条件・deny を評価する」と書いたが、deny の意味論と衝突解決を定義していなかった（CL-0156、処置「維持」、定義先は本 ADR）[D]。中核トポロジーも「各リソースサービス『または』共通 PDP」と未決定だった（CL-0002、処置「修正」）[D]。レビューは policy 言語・schema・deny semantics・conflict resolution を ADR として分けるよう求め（R-098）、typed ReBAC＋限定 ABAC の方向性は実証で裏付けるよう求めた（R-205、R-252、CL-0254）[D]。

| # | 問い | 主な R/G |
|---|---|---|
| Q1 | ReBAC と ABAC をどう合成するか | R-205, R-252, G-109 |
| Q2 | policy 言語の正本を engine の DSL（OpenFGA DSL / SpiceDB schema / Cedar / Rego）にするか、中立な中間表現にするか | R-098, R-208, R-280, G-109 |
| Q3 | deny semantics と conflict resolution、例外の表し方 | R-098, R-262, G-109 |
| Q4 | テナント管理者の custom role をどう表すか | R-133, R-171, G-107③, G-115 |
| Q5 | PEP–PDP API を AuthZEN 1.0 に準拠させるか | R-098, R-204, R-254, G-066 |
| Q6 | decision_id・model revision・consistency 指定をどう拡張するか | R-127, R-144, R-147, G-069 |
| Q7 | engine を差し替えても利用側を改修しなくて済む条件 | R-090, R-091, R-208, G-066, G-070 |
| Q8（事前相談） | 認可後の claim に trace id 的な ID を付けるか。W3C の claim 群を踏まえ、所属以外に付加を検討すべき claim は何か | R-127（claim の決定自体は ADR-005・DL-75） |

### 1.2 制約

**規範・標準（強度は原文どおり）**

| # | 内容 | 強度・状態 | 根拠 |
|---|---|---|---|
| N-1 | Authorization API 1.0 は OpenID Final Specification（発行 2026-01-11、承認告知 2026-01-12）。告知は "not subject to further revision" とする | Final | [N][^1][^4]（RS-07#60） |
| N-2 | policy 言語・アーキテクチャ・PDP の状態管理は範囲外。整合性トークンや鮮度指定の parameter の定義は見当たらない | 範囲外 | [N][^1]（RS-07#61） |
| N-3 | 後続改訂は API を augment してよい（MAY）が modify してはならない（MUST NOT）。エンドポイント識別子に v1 を含める（SHOULD） | MAY / MUST NOT / SHOULD | [N][^1]（RS-07#62） |
| N-4 | Subject・Resource は type と id が REQUIRED、properties は OPTIONAL。decision が false なら要求を進めてはならない（MUST NOT）。PEP が理解できない context があれば true でも拒否してよい（MAY） | REQUIRED / MUST NOT / MAY | [N][^1]（RS-07#63） |
| N-5 | evaluations の意味論は `execute_all`（既定）、`deny_on_first_deny`、`permit_on_first_permit` | 規定 | [N][^2]（RS-07#64） |
| N-6 | search の結果を evaluation にかけると true に SHOULD なるが保証はない。ページングは MAY で原子的スナップショットを保証しない | SHOULD / MAY | [N][^2]（RS-07#65） |
| N-7 | 要求 ID が付いていれば PDP は PEP が指定した値を応答に含める。HTTPS JSON binding を実装する。PEP–PDP 間の通信を保護する。PDP による PEP の認証は SHOULD、応答署名は PDP の MAY。メタデータの `policy_decision_point` が取得識別子と一致しなければ使ってはならない | MUST / SHOULD / MAY / MUST NOT | [N][^3]（RS-07#66） |
| N-8 | JWT の受信者は理解できない claim を無視しなければならない。理解必須の拡張は JWS の `crit` で表せる | MUST / OPTIONAL | [N][^45][^46]（RS-16#14, #16） |
| N-9 | Trace Context の traceparent・tracestate に個人識別情報を入れてはならない。目的は相関だけ。外部の trace を素直に継続すると trace-id 衝突を偽造され得る | MUST NOT | [N][^39]（RS-10#16, #17） |
| N-10 | ASVS 5.0 16.3.2 は L3 で全認可判断の記録を求める | L3 要件 | [N][^38]（RS-08#34） |
| N-11 | OWASP API5:2023 は強制機構が既定で全拒否であるべきとする | 推奨 | [N][^37]（RS-08#11） |

**engine 側の事実（意味論に効くもの）**

| 事実 | 根拠 |
|---|---|
| OpenFGA の AuthZEN エンドポイントは experimental。ページング非対応、モデル ID の固定は独自ヘッダ、クライアント指定の要求 ID を返さない（N-7 と不一致） | [V][^5]（RS-07#23, #68） |
| SpiceDB の公式な AuthZEN 対応は公式文書で確認できない（未確認） | RS-07#68 |
| SpiceDB は ZedToken と `at_least_as_fresh` を持つ。OpenFGA は同等機能を「検討中」とし、HIGHER_CONSISTENCY（キャッシュ回避・primary 読取）だけを提供する | [V][^11][^6]（RS-07#13, #14, #26, #27, #76） |
| OpenFGA は非同期レプリカ構成で通常読取がレプリカに向かい、HIGHER_CONSISTENCY は primary に回る | [V][^7]（RS-07#16） |
| SpiceDB の CockroachDB 上では `fully_consistent` でも read-after-write を保証しない。別ページの比較表は datastore の条件なしに "Guaranteed read-after-write" とする（文書間の前提の不揃い） | [V][^11]（RS-07#29） |
| OpenFGA conditions と SpiceDB caveats はどちらも CEL。OpenFGA の CEL コスト上限の既定は 100、tuple 保存 context は 32KB、要求時 context に個別上限はなくサーバ全体の要求上限 512KB。SpiceDB の要求 caveat context は既定 4,096 バイト。context 不足時 SpiceDB は CONDITIONAL を返す | [V][^10][^12][^13]（RS-07#22, #32） |
| 解決深さの既定上限は OpenFGA `resolveNodeLimit` 25、SpiceDB `--dispatch-max-depth` 50 | [V][^8][^13]（RS-07#19, #35） |
| Cedar は既定拒否・forbid 優先・評価 error の policy は skip。schema 検証は entity の存在を確認しない | [V][^14][^15]（RS-07#39〜#41） |
| Cedar は主要性質の Lean 証明と SMT 符号化の健全性・完全性（紙上の証明。Lean 証明は論文時点で進行中）を示す | [V][^16][^17]（RS-07#39, #42） |
| CNCF 成熟度: OPA Graduated（2021-01-29）、OpenFGA Incubating（2025-10-28）、Cedar Sandbox（2025-10-08）。OPA 創設者らは 2025-08-20 に Apple へ移籍（OPA は Graduated のまま）。Aserto は営利事業を終了 | [V][^19][^20][^21][^22][^23]（RS-07#57, #69, #71） |
| engine の DSL を相互につなぐ標準はない | [D]（RS-07 結論 13） |

**規模・組織（仮定）**

| 項目 | 値 | 出典 |
|---|---|---|
| 認可 Check | 基準ピーク 42,009/秒、成長 169,333/秒。最大テナント単独 5,266/秒（台帳 §12.6 の導出） | [A-045][A-009] |
| ListObjects | 840/秒 | [A-046] |
| 認可 graph | 最大深度 8・最大 fanout 10 万（範囲の下限は深度 4・fanout 25） | [A-036] |
| tuple 総数 | 7.55 億 | [A-049] |
| 依存サービス・ドメイン・開発者 | 300・30・1,500 人（25 組織・60 チーム） | [A-050][A-051][A-052][A-053] |
| 認証・認可プラットフォーム | 24 FTE（範囲 15〜40）。うち認可・PDP 5、PEP SDK・開発者支援 4 | [A-054] |
| 既存認可実装 | 自前実装 240 サービス、role モデル 20 種 | [A-112] |
| edge 呼出 1 件あたりの Check | 2.5 | [A-025] |
| access token 寿命（容量計算用の仮置き） | 10 分 | [A-027] |
| decision event | 平均 1KB・記録率 100%（容量上限の計算用） | [A-037] |
| 判定系の可用性帯 | 99.95〜99.99% | [A-090] |
| 計画期間・再決裁・engine 置換 | 20 年、初回は G6 開始から 3 年以内・以後 5 年以内に再決裁、認可 engine を 1 回以上置換 | [A-100][A-101][A-104] |

### 1.3 攻撃者モデルと本書の統制

FAPI 2.0 Attacker Model は内部アーキテクチャを範囲外としているため、PDP 内部は自社の攻撃者類型で扱う [N][^41][D]（RS-04#50）。

| 類型（03_threat-model/attacker-model.md） | ADR-011 で効く能力 | 本書の統制 | 強制の場所 |
|---|---|---|---|
| ATK-02 悪意あるテナント管理者 | custom role による昇格、他テナントへの波及 | §2.4 委譲可カタログの部分集合、作成者が持たない permission の束ね禁止、G 段のテナント照合 | facade・管理 API（設計上強制） |
| ATK-06 侵害された microservice | 属性の偽注入、要求 ID 偽造、別 PDP への誘導（mix-up） | §2.5 PEP の mTLS 認証、メタデータ照合、§2.9 属性は PDP 側 PIP で取得し出所を検証 | facade（設計上強制） |
| ATK-10 policy author | 特定主体への allow 埋込み、全域 allow、旧版の再配布 | §2.2 CAM の no-new-access 検査・往復試験・model pin、G 段を domain に書かせない | CI・registry（設計上強制） |
| ATK-11 DB read 権限者 | decision log からの属性・個人情報の読出し | §2.8 decision event の最小化、trace に PII を載せない、jti はハッシュで記録 | facade・ADR-014 |
| ATK-17 内部不正の開発者 | PEP での握りつぶし、fail-open の実装 | §2.5 SDK 既定拒否、engine client import の CI 禁止、decision event と span の突合（RS-08#35） | SDK・CI（一部は ADR-012 の実行時検査に依存） |
| ATK-19 変更と自動化の誤り | 空欄を含む policy 変更の全域複製 | §2.3 評価不能 deny、§2.2 段階展開と model pin、G 段カタログの版固定と緊急 freeze | facade・registry |

ATK-19 の参考事例として、Google の 2025-06-12 の障害では、空欄を含む policy データが数秒で全世界に複製され、Service Control が全リージョンで crash loop に陥った [I][^43]（RS-09#66〜#68）。

### 1.4 前提と新規仮定

- 依存する前提: A-009, A-025, A-027, A-036, A-037, A-045, A-046, A-049, A-050〜A-054, A-090, A-100, A-101, A-104, A-112 [D]。
- 新規仮定（前提台帳へ追加要）NA-011-1: CAM の変換器・逆変換・適合試験の初期構築に 2〜3 FTE×12 か月、維持に 1〜2 FTE/年を要する（evo 案の見積り。A-054 の認可 5 FTE・SDK 4 FTE の内数か外数かは未定）[D]。
- 新規仮定（前提台帳へ追加要）NA-011-2: PDP facade の構築に 2〜4 人×6〜9 か月、運用に 1〜2 FTE を要する（ops 案・sec 案の見積り）[D]。
- 新規仮定（前提台帳へ追加要）NA-011-3: 外部機関が発行する検証可能な属性（VC 由来の資格・所属証明など）を受け入れる業務が計画期間内に生じる [D]。

### 1.5 関連研究

RS-07#12〜#29, #32, #35, #39〜#59, #60〜#79。RS-17#84〜#96。RS-16#14〜#16, #22 と結論 1・4。RS-08#11, #34, #35。RS-04#50, #60, #64, #66, #72, #80。RS-06#30, #31, #36, #49。RS-10#16, #17。RS-09#66〜#68。研究ノートにない原典として、W3C VC Data Model 2.0 [^42] と OpenFGA『Custom Roles』[^36] を本書の起草者が取得して確認した（独立検証は未実施。§残課題）。

---

## 2. 決定

### 2.1 合成方式（Q1）

- **D1-1** 認可判定は 3 層の論理積とする [D]（RS-07#79 の (a) に (c) の deny を限定して加える形、RS-17#96 項 2）。
  - L0: PEP SDK が token のテナントと resource 側テナント（resource-derived tenant）をローカルで照合する（多層防御。R-250）[D]。
  - G 段: 基盤チームだけが所有する deny 層を facade で評価する [D]。
  - R 段: ドメインの typed ReBAC と、関係に付ける CEL 条件を engine で評価する [D]。
  - 最終判定は「L0 と G 段で拒否されず、かつ R 段が許可」の場合だけ許可とする [D]。
- **D1-2** G 段は固定カタログ×テナント設定値のデータ駆動にする [D]。v1 のカタログは次の 6 規則とする [D]。
  1. テナント不一致（例外は §2.3 D3-5 の型だけ）
  2. 主体の停止・無効化
  3. テナントの停止
  4. 操作階層ごとの最低認証強度の不足（ADR-002）
  5. 接続元・端末の条件（テナント設定。G-115 の最低基準より緩い値は受け付けない）
  6. データ所在地・cell の不一致、および緊急 freeze
  - 規則の追加は基盤の変更審査（二者承認）を通す。規則 ID を reason に出す [D]。
- **D1-3** R 段の ABAC は、要求 context（時刻、接続元、認証強度、端末状態、データ区分）を入力とする CEL 部分集合の条件に限る [D]。使える関数は基盤の条件カタログに限り、CEL コストと context の上限はカタログ側で engine の既定値（OpenFGA の CEL コスト 100、SpiceDB の context 4,096 バイト）以下に保つ [V][^10][^13][D]（RS-07#22, #32）。資源属性に基づく条件は関係か型に写して表す [D]。任意 script や汎用 policy（Rego の汎用ルールなど）の持込みは例外承認制とする（CL-0254 を維持）[D]。
- **D1-4** entity の階層を呼出側が要求ごとに組み立てる方式（RS-07#79 の (b)）は主経路にしない [D]。深度 8・fanout 10 万の階層を PEP が毎回用意する必要が生じ、Cedar の skip-on-error と組み合わさると entity の欠落が許可に変わり得るからである [D][A-036]（RS-07#41, #44）。

### 2.2 正本（CAM）と変更管理（Q2）

- **D2-1** 認可モデルの正本は CAM とし、OpenFGA DSL・SpiceDB schema・Cedar・Rego のどれも正本にしない [D][A-104]（RS-07 結論 13、R-208）。CAM は JSON Schema で検証できる宣言データで、内容は次に限る [D]。
  - 型、relation、permission（union / intersection / exclusion / 親関係の継承。Zanzibar の userset rewrite で表せる範囲 [V][^44]（RS-07#12））
  - カタログの CEL 条件
  - G 段の規則・テナント設定項目・例外型（D3-5）
  - permission catalog（custom role が参照できる委譲可 permission の一覧）
- **D2-2** CAM の表現力は、OpenFGA と SpiceDB の両方へ変換できる共通部分に限る [D]。共通部分の外にある engine 固有機能は、例外審査と差分試験ケースの追加を条件にする [D]。
- **D2-3** R-208 への統制として次の 3 つを保つ [D]。
  - CAM から各 DSL への変換に加え、OpenFGA DSL→CAM の逆変換を維持し、往復試験（OpenFGA DSL→CAM→SpiceDB schema→判定差分）を CI で常時回す。
  - CAM 仕様を、作成者以外が実装できる程度に社外公開可能な形で書く（第三者レビュー対象、§7.2）。
  - engine の DSL は CAM から生成し、人が DSL を直接編集した結果は本番に配布しない。
- **D2-4** 開発者向けの検証は、CAM から生成した DSL に engine 公式ツール（OpenFGA の `fga model test`、SpiceDB の `zed validate` と assertion）を流す CI 経路で行い、自作ツールの範囲を変換器・往復試験・差分検査に限る [V][^33][^34][D]（RS-17#86, #87）。
- **D2-5** CAM の変更は CI で次の検査に通す [D]（RS-17#96 項 3〜5、R-147〜R-149、R-175）。
  1. 全 relation の肯定・否定テストとテナント越えの否定テスト
  2. 破壊的変更の自動拒否 [V][^35]（RS-17#88）
  3. 権限が広がる差分の検出と追加承認（AWS の CheckNoNewAccess と同じ考え方 [V][^30]（RS-17#92））。全件を記号的に解析できる保証はないため、新旧モデルの shadow check で補う（R-148）
  4. 生成した 2 種の DSL を 2 engine で評価する差分試験
- **D2-6** 所有の境界は、横断型（user、tenant、group、role）・G 段・permission catalog を基盤が、ドメインの型・関係・権限を各ドメインが所有し、CAM モジュールと code owners でレビュー境界を表す [V][^32][D]（RS-17#85, #96 項 1）。
- **D2-7** 配布する model には基盤 registry（DL-73）が不変の model_revision を採番し、facade が engine 固有のモデル ID（OpenFGA の ULID など）に対応付ける [V][^9][D]（RS-07#18）。revision は shadow check と段階展開を経て切り替える [D]。
- **D2-8** Cedar は v1 の正本にも本番評価にも使わない [D]。CAM から Cedar を検証専用の生成先として出力し、permission 差分を SMT 解析で検査する折衷を PoC の比較対象に残す（TC-011-21）[D]（RS-07#42）。

### 2.3 deny semantics と conflict resolution（Q3）

- **D3-1（既定拒否）** permit が一つも成立しなければ拒否する [D]。AWS IAM・Cedar と同じ構造である [V][^29][^14]（RS-17#91, RS-07#39）。
- **D3-2（優先順位）** 優先順位は次の 3 段とする [D]（RS-17#90, #91）。
  1. L0 と G 段の deny（成立すれば R 段の結果に関わらず拒否）
  2. R 段の exclusion（基盤が提供する「制限付き型」による縮小）
  3. R 段の permit
- **D3-3（評価不能は deny）** 次の場合は評価不能とし、decision=false、reason=`deny_indeterminate` を返す [D]。Google Cloud IAM が評価できない deny rule を適用するのと同じ向きである [V][^28]（RS-17#90）。
  - 必要な属性・entity・context の欠落、条件の型誤り・評価 error
  - SpiceDB の CONDITIONAL 応答（context 不足）[V][^12]
  - 要求された鮮度を engine が満たせず、格上げもできない場合（D6-3）
  - facade が理解できない profile の major 版
  - Cedar を生成先・置換先として使う場合に応答の `errors` が空でない場合（skip-on-error の打消し。schema 検証と entity 完全性検査も必須）[V][^14][^15][D]（RS-07#41）
- **D3-4（ドメインに forbid を書かせない）** ドメインのモデルで各チームが独自の forbid を書くことは認めない。縮小は基盤の exclusion 型だけで表す [D]（RS-17#93, #94, #96 項 7）。
- **D3-5（型付き例外）** ドメインの permit で G 段の deny を打ち消す経路は作らない [D]。正当な例外は次の型に限り、G 段の deny 規則に付く型付きの例外主体・例外型として基盤が所有する [D]（Google Cloud の exception principals と同型 [V][^28]）。
  - 越境共有（ADR-024）、特権アクセス（ADR-029）
  - 期限（必須）、付与者と承認者、監査イベントの出力（必須）を例外ごとに持つ。期限切れの例外は評価不能ではなく無効として扱い、deny 規則が適用される [D]。
  - break-glass は BIA・REQ-03 の方針どおり基盤に依存させない経路を主とし、本基盤上の例外型はその記録と事後審査の連携に限る（ADR-029 で確定）[D]。
- **D3-6（届かない場合は意味論から分離）** engine の停止・timeout と facade への不達は、PDP の意味論上の判定ではない [D]（R-262、CL-0108「要実測」）。facade は engine に届かない場合に decision=false、reason=`deny_unavailable` を返し、PEP SDK は facade 不達と同じく操作階層ごとの fail-mode（DL-19）を適用する [D]。fail-mode の既定は拒否で、既知良好キャッシュによる許可は DL-19 が上限を定めた操作階層と時間の範囲に限る [D]。評価不能（D3-3）を既知良好キャッシュで許可に変えることはしない [D]。
- **D3-7（evaluations の意味論）** PEP SDK の「全て必要」ヘルパは `deny_on_first_deny`、「いずれか」ヘルパは `permit_on_first_permit` に固定する [N][^2][D]。`permit_on_first_permit` は privileged 以上の操作で使えないようにする [D]。既定の `execute_all` は一覧の後段 Check に使う [D]。

### 2.4 custom role（Q4）

- **D4-1** custom role は policy ではなくデータで表す [D]。`role` 型と `assignee` 関係を置き、利用者と role の結び付き、role と資源上の permission の結び付きを tuple で書く [V][^36][D]。OpenFGA の公式文書は、役割が動的で頻繁に変わり得るため別の型として表すと説明している [V][^36]。新しい種類の permission を role に開放する場合に該当 relation へ `role#assignee` を宣言するモデル変更が要るかは、公式文書に明記がなく、モデル構造からの推論である [D]。
- **D4-2** custom role に入れられる permission は、permission catalog のうち「テナント委譲可」と印を付けたものの部分集合に限る [D]（DL-26、G-115）。基盤予約の permission（テナント設定の最低基準の変更、他テナントへの共有、監査の無効化など）は含められない [D]。
- **D4-3** 全権的な basic role に相当する役割は作らせない。作成者が持たない permission を含む role は作らせない（ATK-02 の昇格防止）。catalog に permission を追加しても既存の custom role は自動では広がらない [V][^31][D]（RS-17#89）。
- **D4-4** custom role で G 段の deny を外すことはできない [D]。保護操作の権限を custom role に加える変更は、それ自体を保護操作とする（02_requirements/customer-admin-responsibility.md）[D]。
- **D4-5** テナント管理者の変更は管理 API を通じたデータ書込みで行い監査する。1 万テナントにモデル配備やパイプラインを持たせない [D][A-007]。テナントあたりの custom role 数の上限は TBD（所有者: プロダクト責任者＋CTO、期限: G4、決め方: TC-011-09 の遅延・隔離の実測）[D]。

### 2.5 PEP–PDP API とトポロジー（Q5）

- **D5-1** PEP–PDP 契約（DL-72）の基本は AuthZEN 1.0 の HTTPS JSON binding による evaluation と evaluations とし、版付きで凍結する [N][^1][^3][D]（RS-16#22）。
- **D5-2** search API は PEP が直接呼ぶ契約にしない [D]。SDK の一覧ヘルパ（ADR-025）の内部でだけ resource search を使い、返却前に evaluations で後段 Check することを必須にする [D]（N-6、RS-07#78）。総件数は権限で絞った後の結果からだけ算出する [D]。subject search は v1 では公開しない（OpenFGA の AuthZEN 実装にページングがなく、SpiceDB の LookupSubjects はカーソル非対応）[V][^5][D]（RS-07#33）。
- **D5-3** PEP は engine を直接呼ばず、cell ごとに置く基盤所有の stateless な PDP facade だけを呼ぶ（ADR-013）[D]。facade の仕事は次の 6 つに限る [D]。AuthZEN と自社 profile の実装、G 段の評価、tenant から store・cell への routing、engine ネイティブ API への変換と応答の正規化（CONDITIONAL・errors など）、decision_id の採番、decision event の出力。
- **D5-4** PEP は言語別の薄い SDK を通してだけ PDP を呼ぶ。依存サービスが engine の client ライブラリを import することは CI の静的検査で拒否する（G-072）[D]。
- **D5-5** facade は PEP が付けた X-Request-ID を必ず応答に返す。engine がこれを返さない場合（OpenFGA の AuthZEN 実装）も facade が補う [N][^3][V][^5][D]。
- **D5-6** facade は `/.well-known/authzen-configuration` を公開し、PEP SDK は `policy_decision_point` が取得識別子と一致しないメタデータを使わない [N][^3]（RS-07#66）。
- **D5-7** PEP の認証は workload ID の mTLS（ADR-009）で必須とする（AuthZEN では SHOULD）[N][^3][D]。応答署名（PDP の MAY）は v1 では採らず、§8 の再検討トリガーに置く [D]。**未決の論点（整合調整で明記）**: ADR-013 D13-26 は read-sensitive の fail-static に「PDP が署名した判定記録」を要件とし、ADR-010 D-53 は署名を PoC 項目（H-16）としている。ADR-013 KD13-6 で read-sensitive の fail-static を許すと決まった場合は、read-sensitive の判定記録への署名を自社 profile の要件に加える（その他の応答の署名は本項どおり採らない）。許さないと決まった場合は本項のままとする（reconciliation-notes U-04）[D]。
- **D5-8** PEP SDK は既定で拒否し、enforcement の結果を記録する（ADR-012 の coverage 検査用）[N][^37][D]。判定の正本の記録（decision event）は facade が出す（§2.8）[D]。
- **D5-9（R-204）** 認可 domain model（CAM）、facade、PEP SDK は自社開発の候補とする。engine と store の自作は本書の範囲外で、ADR-010 の別審査に委ねる [D]。

### 2.6 自社 profile（Q6）

- **D6-1** 標準外の項目は、要求・応答の `context` に名前空間付きのキー（名前は ADR-021 で確定）で運び、DL-72 に「AuthZEN 1.0 外」と明記する [D]（RS-07#61, #68）。テナントは `subject.properties` と `resource.properties` の両方に入れる [D]。

| 方向 | 項目 | 意味 | 欠けた／理解できない場合 |
|---|---|---|---|
| 要求 | `profile_version` | profile の版（major.minor） | facade が未対応の major なら decision=false、reason=`unsupported_profile` [D] |
| 要求 | `consistency.mode` | `minimize_latency`／`at_least_as_fresh`／`fully_consistent` | 欠ければ操作階層ごとの既定（DL-17）[D] |
| 要求 | `consistency.token` | facade が発行する不透明文字列（engine 種別・版の接頭辞付き） | 解釈できない場合（engine 差替え後など）はエラーにせず `fully_consistent` に格上げ [D] |
| 要求 | `model.pin` | registry の model_revision | 欠ければそのテナントの現行固定版。最新版にはしない [D]（RS-07#18） |
| 要求 | X-Request-ID（ヘッダ） | PEP が採番する要求 ID | 応答で同じ値を返す [N][^3] |
| 応答 | `decision_id` | facade が採番する推測困難で一意な ID（監査の主キー） | 必須 [D] |
| 応答 | `model_revision` | 評価した model_revision と G 段カタログの版 | 必須 [D] |
| 応答 | `consistency` | 実効モードと、engine が返せる場合の consistency_token | 実効モードは必須、token は任意 [D] |
| 応答 | `reason` | 閉じた列挙: `allow`, `deny_guardrail:<規則ID>`, `deny_no_relation`, `deny_indeterminate`, `deny_unavailable`, `unsupported_profile` | 必須。エンドユーザーには返さない [D] |

- **D6-2（互換規則）** 後方互換な追加だけを minor で許す（AuthZEN の augment-only に揃える）[N][^1][D]。制約を強める変更は、受信者が無視しても気付かない形では追加しない。JWT と同じく理解できない項目は黙って無視され得るからである [N][^45][D]（RS-16#14〜#16）。強める変更は `profile_version` の major を上げ、未対応の facade・PEP が拒否する形で表す [D]。
- **D6-3（consistency は格上げ可・格下げ不可）** engine が要求モードを満たせない場合、facade はより強いモードで評価するか、評価不能として deny にする。黙って弱いモードで評価しない [D]（RS-07#76）。OpenFGA では `at_least_as_fresh` を HIGHER_CONSISTENCY に格上げする [V][^6][D]。ただし HIGHER_CONSISTENCY が「token の時点以降の状態」を保証するかは公式文書で確認できていない。primary 読取に回る構成（RS-07#16）で剥奪直後の new enemy を防げるかを TC-011-04 で実測するまでは、等価な保証として扱わない [D]。**未決の論点（整合調整で明記）**: ADR-010 D-13 は OpenFGA の read-sensitive を「下限の発行時刻から窓 W の間は HIGHER_CONSISTENCY、W を過ぎたら MINIMIZE_LATENCY」とする窓方式を採っており、W 経過後は本項の「格下げ不可」と対立する。窓方式を許すかは ADR-010 §2.12 決裁案 2（H-05 の後、CISO の受容）で決める。許さない場合は本項の常時格上げを採る（reconciliation-notes U-03）[D]。
- **D6-4** consistency_token の契約上の最大長は TBD（所有者: 認可・PDP チーム、期限: DL-72 凍結前、決め方: 候補 engine の実 token 長の実測と ADR-016 の互換方針）とする [D]。初期案は ADR-010 D-14・NA-010-2 の 1,024 バイトとし、facade が自社形式（版‖engine 識別‖engine 固有値または書込時刻‖MAC）で上限を守る。engine 固有値が上限を超える場合は facade 内の参照に置き換える（ADR-010 と揃えた。整合調整で修正）[D]。SpiceDB の文書が示す Postgres の保存型 varchar(1024) は保存例であり、token 長の上限を保証する記述ではない [V][^11][D]（RS-07#27）。

### 2.7 relationship 書込契約

- **D7-1** AuthZEN は PDP の状態管理を範囲外にしている [N][^1]（RS-07#61）。relationship（tuple）の書込・削除・変更購読は、基盤所有の書込契約として DL-73（11_contracts/relationship-model-registry.openapi.yaml）に別に定める [D]。
- **D7-2** 書込応答は consistency_token を返し、利用側は内容と一緒に保存して後続の判定で `at_least_as_fresh` に渡す（zookie の方式: RS-07#5, #27）[V][^11][D]。変更購読は索引の後段補正（ADR-025）と dual-run に使う [D]。
- **D7-3** 書込契約も engine 非依存とし、engine の書込 API を依存サービスが直接呼ぶことは D5-4 と同じ CI 検査で拒否する [D]。

### 2.8 相関 ID と証跡（事前相談への回答 1）

- **D8-1** trace id 的な要求単位の ID を access token の claim には付けない [D]。理由は 3 つある。
  - 粒度が合わない。access token は寿命の間（仮置き 10 分）に多数の要求で使い回され、1 呼出しで Check は平均 2.5 件生じるので、token に付けた ID では個々の判定を特定できない [D][A-027, A-025]。
  - trace id は証拠にならない。Trace Context は traceparent の目的を相関だけとし、外部から来た trace を素直に継続すると攻撃者が trace-id の衝突を偽造し得ると述べている [N][^39]（RS-10#16, #17）。
  - token を要求ごとに再発行すると、発行・署名の負荷が要求数に比例して増える [D][A-027]。
- **D8-2** 相関は次の 4 層の ID で行い、どの ID も facade の decision event に記録する [D]。

| 層 | ID | 発行者 | 置き場所 | 根拠・状態 |
|---|---|---|---|---|
| token | `jti` | AS | access token の claim | RFC 9068 で REQUIRED [N][^47]（RS-04#60）。RFC 7519 単体では OPTIONAL [N][^45] |
| 取引（呼出し連鎖） | `txn`（採用時） | 取引 token サービス（ADR-009） | Txn-Token の claim | Transaction Tokens draft-11 で必須 claim。Internet-Draft（IESG 未提出、確認日 2026-10-03）[N][^40]（RS-06#31） |
| 要求 | traceparent の trace-id、X-Request-ID | 入口 gateway、PEP | HTTP ヘッダ。claim には入れない | [N][^39][^3] |
| 判定 | `decision_id`、`model_revision`、consistency の実効モード | PDP facade | AuthZEN 応答の `context`、decision event | 本書 D6-1 |
| session・grant | `sid`、grant 参照 | AS | 内部 access token の claim、introspection 応答 | ADR-005 D9-2 の L2 層。8 本の ADR で揃えた統一モデルは 05_adr/reconciliation-notes.md §3（整合調整で追加）[D] |

- **D8-3** 「共通の認証認可を通った一貫性のある要求」であることの証跡は、相関 ID だけでは成立しない [D]。証跡の根拠は、次の署名付き・改ざん検知可能な記録の組合せに置く（保持・改ざん検知は ADR-014）[D]。
  - AS が署名した access token（`jti`、iss、sub、client_id、テナント）
  - 取引 token サービスが署名した Txn-Token（`txn`。採用時）
  - facade が出す decision event（decision_id、X-Request-ID、trace-id、`jti` のハッシュ、`txn`、テナント、model_revision と G 段カタログの版、実効 consistency、reason、engine 識別子と版）
  - 「認可判断のない入口」は、SERVER / CONSUMER span と decision event の突合で数える（RS-08#35、ADR-012）。この突合が「共通の認可を通った」ことを機械的に示す [D]。
- **D8-4** decision event は trace のサンプリングから独立した経路で 100% 出力し、engine 内蔵の decision log には依存しない（OPA の decision log は上限設定時に捨てる [V][^25]（RS-07#56））[D][A-037]。外部から来た sampled flag で記録の有無を変えない [N][^39][D]。trace-id・tracestate・baggage に subject やテナントなどの識別情報を載せない [N][^39][D]。この記録は ASVS 16.3.2 L3 の全認可判断の記録を兼ねる [N][^38][D]。
- **D8-5** Txn-Token は replay への耐性がなく短寿命が MUST とされ、草案である [N][^40]（RS-06#36）。`txn` の採否は ADR-009 で決め、RFC 化までは候補にとどめる [D]。

### 2.9 付加を検討すべき claim と属性辞書（事前相談への回答 2）

- **D9-1** token は「主体・テナント・client・粗い scope と authorization_details・act を運ぶ封筒」にとどめ、権限や role の一覧を載せない（ADR-005 V10）[D]。Carta は JWT に権限を埋め込む方式で token が 1MB 近くまで膨らんだと述べている [M][^53]（RS-07#74。当事者の公開記事で測定条件の記載はない）。token に載せた属性は寿命の間古いまま残り、剥奪の反映が token 寿命に縛られる [D][A-027]。
- **D9-2** ADR-005／DL-75 へ渡す claim 候補を規範の強度付きで示す（採否は ADR-005 で決める）[D]。

| 候補 | 目的 | 規範の強度・状態 | 根拠 |
|---|---|---|---|
| `iss`・`sub`・`aud`・`exp`・`iat`・`jti`・`client_id` | JWT access token の必須集合。`jti` は token 層の相関キー | RFC 9068 で REQUIRED | [N][^47]（RS-04#60） |
| `auth_time`・`acr`（・`amr`） | 認証の時点と強度。G 段の最低認証強度と step-up | RFC 9470 §6.1: JWT access token の auth_time と acr は token を更新しても変わらない | [N][^50]（RS-04#72） |
| `act` | 委任連鎖（AI エージェント、サービスの代理） | RFC 8693: アクセス制御に使えるのは top-level claim と現在の actor だけ（MUST） | [N][^48]（RS-04#66） |
| `cnf` | sender constraint の鍵束縛 | ADR-005 は内部 cnf（I1）を既定とし、H-16 の実測で I2 に切り替える条件を残している（未確定） | ADR-005 |
| `authorization_details` | 操作単位の細粒度な付与（RAR） | RFC 9396: AS は未知の type を処理してはならない（MUST） | [N][^49]（RS-04#64） |
| テナント（内部 token の名前は `tid`。ADR-021 D21-38・ADR-022 D-9-1。整合調整で修正） | テナント文脈 | ID-JAG draft-04 の `tenant` は OPTIONAL。access token の標準 claim ではない（Internet-Draft） | [N][^52]（RS-06#49） |
| `status` | token 単位の失効参照 | Token Status List draft-21（IESG 状態 RFC Ed Queue、確認日 2026-10-03） | [N][^51]（RS-04#80） |
| 版識別（`typ` または `crit`） | claim の意味を将来強めるための版 | 旧 PEP は未知 claim を無視する（MUST）ため、強める変更は typ / crit で表す | [N][^45][^46]（RS-16#14, #16） |

- **D9-3（W3C の claim 群との関係）** W3C Verifiable Credentials Data Model v2.0（W3C Recommendation、2025-05-15）は claim を "An assertion made about a subject" と定義する [N][^42]。本書の起草者が §4.7〜§4.11 の規範本文を確認した範囲では次のとおりである [N][^42]。
  - `issuer` は MUST（URL または URL の id を持つ object）。
  - `credentialSubject` は MUST で、各 object は 1 つ以上の claim の subject でなければならない。
  - `validFrom`・`validUntil` は「存在する場合」の形式（dateTimeStamp）だけを MUST で定める。存在自体は任意である。
  - `credentialStatus` も存在は任意で、存在する場合は `type` が REQUIRED。状態の仕様は個人の追跡を可能にしてはならない（MUST NOT）。
  - `credentialSchema` は存在の要否を定めず、値の形式（type の指定、id は URL）を MUST で定める。
  - VC DM は第三者が発行し所持者が提示する資格情報のデータモデルであり、access token の claim 集合を定める仕様ではない [D]。将来性の観点で学ぶべきものは属性の種類ではなく構造である。すなわち、発行者（信頼の起点）を属性ごとに区別すること、有効期間と状態参照（失効）を第一級の要素として持つこと、schema（版）を参照できることである [D]。
- **D9-4（属性辞書）** 認可に使う属性は token の claim として増やさず、PDP 側の PIP が正規の属性源から取得する属性として、基盤が「属性辞書」で管理する [D]。辞書は各属性に値のほか次の出所メタデータを持たせる [D]。
  - 出所（`source`。発行者・権威あるシステム）、確認時刻（`verified_at`）、有効期間、失効の参照先、保証の強さ（IAL・AAL 相当）、データ分類（ADR-014 での記録可否）
  - 属性が古い・出所を検証できない場合は D3-3 の評価不能として扱う [D]。
- **D9-5** 属性辞書 v1 の候補区分を次に示す。各項目を token claim にするか PIP で取得するかは ADR-005・ADR-009 で決める [D]。

| 区分 | 属性 | 用途 | 関連 |
|---|---|---|---|
| 所属 | テナント、所属組織・部門、複数テナント所属時の現在 context | G 段のテナント照合 | ADR-004、[A-015] |
| 主体種別 | 人間／workload／AI エージェント／service account | 主体種別ごとの permission catalog | ADR-017 |
| 認証の文脈 | 認証強度（acr/amr）、認証時刻、session ID | 最低認証強度、session 失効との突合 | ADR-002、ADR-006 |
| 委任 | 現在の actor と委任連鎖、委任の範囲 | 代理操作の認可 | ADR-017、RS-06 |
| 送信者束縛 | client_id、sender constraint の有無と方式 | 高リスク操作の前提条件 | ADR-005 |
| 法域・所在地 | 主体の法域、データ所在地の制約 | 所在地ガードレール | ADR-013、[A-062] |
| 目的・同意 | 利用目的、同意の有無と範囲 | 目的・同意に基づく制御（G-108） | ADR-014 |
| 外部検証済み属性（将来） | 資格・年齢区分・職能など第三者が発行する属性 | 規制業務での資格確認 | NA-011-3（新規仮定） |

- **D9-6** 外部検証済み属性（VC 由来など）は、PDP より前段（ADR-004 の認証・属性取得段または PIP）で署名・発行者の信頼・有効期間・失効状態を検証し、PDP には検証結果と出所メタデータだけを渡す [D]。access token の claim として再発行しない [D]。VC の提示プロトコルを本基盤で採るかは本書では決めず、§8 のトリガーに置く [D]。

### 2.10 engine 差替え時に利用側を改修しない条件（Q7）

- **D10-1** 「利用側無改修」は依存サービスのコードと SDK 設定に差分がないことと定義し、次の 10 条件を契約と CI 検査で強制する [D]（G-066）。
  - C-1: 利用側は AuthZEN profile（DL-72）と書込契約（DL-73）だけを呼ぶ。engine の SDK・API・ヘッダを import していれば CI で拒否する（G-072）。
  - C-2: type・id・relation・permission 名は ADR-021 の名前空間にある自社識別子で、engine 内部 ID ではない。
  - C-3: consistency_token と model_revision は不透明文字列として保存・返送するだけで、利用側は解釈しない。
  - C-4: engine 固有の応答（CONDITIONAL、determiningPolicies、errors）は facade が正規化し、利用側には decision と reason だけを返す。
  - C-5: 評価不能は常に decision=false と `deny_indeterminate` で返す（D3-3）。
  - C-6: 一覧は SDK ヘルパ経由に限り、後段の Check がある（D5-2）。
  - C-7: 利用側の試験は基盤のモックと契約試験キット（DL-80）だけで閉じる（G-121）。
  - C-8: 新 engine の解決深さの上限が A-036 の深度 8 を下回らない（OpenFGA 既定 25、SpiceDB 既定 50 [V][^8][^13]（RS-07#19, #35））[A-036]。
  - C-9: 切替え前に新旧 engine を dual-run し、allow が広がる差分 0 件を条件にする（R-177、R-178、ADR-027）。
  - C-10: 移行窓の期間に限り、旧 engine の consistency_token は新 engine で `fully_consistent` 要求として読み替える。移行窓の期限と遅延増の予算は ADR-027 と DL-20 で定める（D6-3 の格上げ規則の適用）。
- **D10-2** ドメインの CAM モジュールは利用側のコードではなくドメインが所有する設定物と扱う [D]。G-066 の「利用側コードの差分 0」をこの範囲で解釈してよいか、また書込経路（DL-73 呼出し）を利用側コードに含めるかは、判定者（CTO と独立立会人）の事前合意が必要な解釈である [D]。本書は書込経路を含める解釈でも成り立つように C-1 に DL-73 を含めた [D]。

---

## 3. 検討した選択肢

費用・要員の桁は A-054 の認可・PDP 5 FTE と PEP SDK 4 FTE を基準にした概算で、CAM と facade の要員は新規仮定 NA-011-1・NA-011-2 による [D][A-054]。

### 案A（採用）: CAM 正本＋3 層評価（L0・G 段・R 段）＋AuthZEN 1.0＋自社 profile＋基盤 facade

| 項目 | 内容 |
|---|---|
| 概要 | §2 の D1〜D10（evo 案を土台に、sec 案の G 段・型付き例外・証跡設計、ops 案の固定カタログ・閉じた reason・SDK ヘルパ・L0 を統合）[D] |
| 利点 | API の層は Final 標準で改訂は augment のみ [N][^1]。モデルの層を特定 engine の寿命から切り離し、置換（A-104）を定常機能にできる [D][A-104]。G 段と評価不能 deny を facade の一点で強制し、engine の意味論差（Cedar の skip-on-error、OpenFGA の consistency）が誤 allow になる経路を閉じる [D]（RS-07#41, #76）。逆変換と往復試験で変換の正しさを独立に検証できる [D] |
| 欠点 | CAM 自体が自社の独自表現になる（R-208 と同じ形の懸念）[D]。表現力が 2 engine の共通部分に制限され、Cedar への置換は CAM の射程外になり得る [D]。facade が判定経路に 1 hop 加わる [D][A-090] |
| 主要リスク | 変換器の誤りが全 engine に同じ誤りを配る共通原因故障（逆変換と往復試験で一部を検出、残余は §6.3）[D]。共通部分を守る規律が崩れて CAM が肥大化する [D]。facade 障害の全テナント波及（R-261）[D] |
| 費用・要員の桁 | CAM: 初期 2〜3 FTE×12 か月、維持 1〜2 FTE/年（NA-011-1）。facade: 構築 2〜4 人×6〜9 か月、運用 1〜2 FTE（NA-011-2）。合計で A-054 の認可・PDP 5 FTE と同じ桁の増分になり得るため、DL-27 で枠内か外数かを決める [D][A-054] |
| 可逆性 | API 契約と名前空間は凍結後に不可逆（追加のみ）。CAM の構文は版付きで可逆。engine は可逆。facade と CAM は外せば案B・案E に戻る [D] |
| 勝つ条件 | 計画期間中に engine 置換が 1 回以上ある [A-104]。主要 engine の健全性指標が 20 年は安定しない（RS-07#57, #69〜#72）。CAM 要員を確保できる [D] |

### 案B: engine DSL の可搬サブセットを正本＋manifest＋固定 deny 層＋AuthZEN facade（ops 案）

| 項目 | 内容 |
|---|---|
| 概要 | ADR-010 で採用する OpenFGA または SpiceDB の DSL を、基盤が定める可搬サブセットに限って正本にする。中立表現は書く言語にせず、DSL から機械抽出する manifest（JSON）として差分検査・出口変換に使う [D] |
| 利点 | 開発者が覚える言語は採用 engine の DSL 1 つと CEL カタログだけ [D]。公式のモデリング手順・テスト・移行手順をそのまま使える [V][^32][^33][^34][^35]。障害時に読む層が少ない [D] |
| 欠点 | 出口時に manifest から変換先 DSL を生成するツールが要り、結局は変換器を持つ [D]。その正しさを独立に検証する基準が平時にない [D]。ADR-010 が Zanzibar 系 engine を選ぶことが前提で、ADR 間の順序依存が強い [D] |
| 主要リスク | 30 ドメイン分のモデルが engine 固有構文に寄り、出口費用が年々増える [D][A-051]。出口時に変換器を急いで作り dual-run の検証期間が短くなる [D] |
| 費用・要員の桁 | facade は案A と同じ（NA-011-2）。CAM の常時保守（NA-011-1）は不要だが、出口時に 2〜3 FTE×6〜12 か月の変換器作業を見込む（evo 案の見積り、新規仮定）[D] |
| 可逆性 | 後から CAM を導入できる（既存 DSL の逆変換が要る）。モデル資産の移植性は時間とともに下がる [D] |
| 勝つ条件 | §4.4 の切替条件（往復試験・表現率の不合格、要員確保不能、A-104 の否定）のいずれか [D] |

### 案C: Cedar を単一の正本にする（AVP または self-host）

| 項目 | 内容 |
|---|---|
| 概要 | RBAC・ABAC・ReBAC を Cedar の permit / forbid で表し、entity の階層は呼出側が渡す [V][^14] |
| 利点 | forbid 優先・既定拒否・validation soundness が Lean で証明され、等価性・包含の自動解析の根拠が調べた候補で最も厚い [V][^16][^17][D]（RS-07 結論 9） |
| 欠点 | skip-on-error により entity が欠けると forbid ガードレールが無効になり得る [V][^14][D]（RS-07#41）。深度 8 の階層を PEP が毎回組み立てる必要がある [D][A-036]。一覧（`tpe`、`partial-eval`）は v4.13.0 でも experimental [V][^18]（RS-07#45）。CNCF Sandbox [V][^20] |
| 主要リスク | PEP 側の entity 組立ての誤りが誤 allow になる（ATK-06・ATK-17）[D]。AVP の推移的な親 100 は引上げ不可 [V][^27]（RS-07#48） |
| 費用の桁（AVP） | 基準ピーク 42,009/秒を A-020 のピーク係数 4 で割った平均約 10,500/秒に、単発 IsAuthorized の単価 $0.000005 と 30 日（2.592×10⁶ 秒）を掛けて約 $136,000/月 [V][^26][D][A-045, A-020]（RS-07#47, #54 の試算と整合）。成長シナリオでは約 4 倍 [D][A-045]。1 万 store の作成は CreatePolicyStore 1 RPS（引上げ不可）で少なくとも約 2.8 時間 [V][^27][D]（RS-07#53）。出口・再評価時の比較基準として保持する [D] |
| 可逆性 | policy は export できるが、ReBAC を entity 階層で表した設計は関係ストア型へ戻しにくい [D] |
| 勝つ条件 | as-is 棚卸し（A-112 の置換）で要件の大半が属性条件で graph が浅い（深度 3〜4 以下）と判明した場合。規制顧客が policy の形式解析の証跡を契約で求める場合は、G 段または検証専用生成先としての部分採用（D2-8）を優先度高で採る [D] |

### 案D: Rego（OPA）を正本にし、関係データを bundle で配る

| 項目 | 内容 |
|---|---|
| 概要 | 全認可を Rego で書き、関係データを bundle または外部データで供給する [D] |
| 利点 | 表現力が最も高い。CNCF Graduated で外部統治の実績が最も長い [V][^21] |
| 欠点 | bundle は結果整合でポーリング既定 60〜120 秒、整合性トークンがない [V][^24][^25][D]（RS-07#55, #59）。7.55 億 tuple を配る設計は成り立たないと見る [D][A-049]。decision log は上限設定時に捨てる [V][^25]（RS-07#56）。汎用言語で no-new-access の判定が難しい [D] |
| 主要リスク | 剥奪の反映遅延（R-143）、ATK-10 による任意ロジックの埋込み [D] |
| 費用・要員の桁 | 1,500 人・30 ドメインへの Rego 教育と審査費。関係ストアを別に持てば言語が 2 つになる [D][A-051, A-053] |
| 可逆性 | 任意ロジックは他 engine に変換できない [D] |
| 勝つ条件 | 認可がほぼ要求属性だけで決まり、関係の鮮度要件が分単位で足りる事業構成に変わった場合。G 段の実装手段としての部分採用は棄却していない（§8）[D] |

### 案E: AuthZEN を採らず、engine 独自 API を SDK で包む

| 項目 | 内容 |
|---|---|
| 概要 | SDK が engine の gRPC / HTTP API を直接呼ぶ [D] |
| 利点 | facade 不要で 1 hop 少ない。ZedToken や CONDITIONAL を変換なしで使える [V][^11][^12][D] |
| 欠点 | 差替えのたびに SDK 内部が大きく変わり、300 サービスに許容版差の範囲で SDK 更新が要る [D][A-050]（RS-16 結論 15）。G-066 を外部標準で示せない [D] |
| 可逆性 | 実質的に不可逆（SDK の公開 I/F に engine 固有概念が漏れやすい）[D] |
| 勝つ条件 | facade の上乗せ遅延（TC-011-12）が DL-20 の予算を超え最適化で解消しない場合。その場合も同一 cell 内直結の部分採用に留め、SDK の公開 I/F は AuthZEN の情報モデルに揃える [D] |

### 案F: 自社独自の PEP–PDP API

| 項目 | 内容 |
|---|---|
| 概要 | 自社設計の API を契約にする [D] |
| 利点 | 整合性・モデル版を一級項目として設計できる [D] |
| 欠点 | 外部 engine・製品の準拠実装を使えない。多ベンダー間で解釈がずれる（RS-16 結論 14）[D] |
| 勝つ条件 | AuthZEN の後続版が 1.0 と非互換の方向に分岐した場合（N-3 に反する事態）[D] |

---

## 4. 評価

### 4.1 評価軸

判定者 3 名は共通の 6 軸（各 5 点満点）で 3 提案を採点した [D]。要求網羅（requirement_coverage）、リスク低減（risk_reduction）、規模での実現性（feasibility_at_scale）、進化・出口（evolvability_exit）、根拠の質（evidence_quality）、可逆性・費用（reversibility_cost）である。

### 4.2 採点表（判定者×提案×6 軸）

| 判定者 | 提案 | 要求網羅 | リスク低減 | 規模実現性 | 進化・出口 | 根拠の質 | 可逆性・費用 | 合計（30） | 判定者の勝者 |
|---|---|---|---|---|---|---|---|---|---|
| 判定者1 | sec | 5 | 5 | 3 | 4 | 3 | 3 | 23 | |
| 判定者1 | ops | 3 | 3 | 5 | 3 | 3 | 4 | 21 | |
| 判定者1 | evo | 5 | 4 | 3 | 5 | 4 | 4 | 25 | evo |
| 判定者2 | sec | 5 | 5 | 3 | 4 | 4 | 3 | 24 | sec |
| 判定者2 | ops | 3 | 3 | 5 | 3 | 4 | 4 | 22 | |
| 判定者2 | evo | 4 | 4 | 3 | 5 | 3 | 3 | 22 | |
| 判定者3 | sec | 5 | 5 | 3 | 4 | 4 | 2 | 23 | |
| 判定者3 | ops | 4 | 4 | 5 | 3 | 4 | 4 | 24 | ops |
| 判定者3 | evo | 5 | 4 | 3 | 5 | 4 | 3 | 24 | |

集計: 合計点は sec 70、ops 67、evo 71。票は sec・ops・evo が各 1 票で並び、合算で evo が最上位になった [D]。sec と evo の差は 1 点で、勝敗は僅差である [D]。本書は evo を土台にしつつ、sec と ops の要素を判定者の grafts に従って取り込んだ（§4.5）[D]。

### 4.3 判定者間の不一致

| 論点 | 判定者1 | 判定者2 | 判定者3 | 本書の扱い |
|---|---|---|---|---|
| 勝者 | evo（逆変換・書込契約・相談回答の正確さ） | sec（攻撃者モデル対応、G 段の一点強制） | ops（費用の再現性、fail-mode の現実性） | 合算の evo を土台に、sec の G 段・例外・証跡と ops の運用形態を統合 [D] |
| IR／CAM の費用 | sec の IR 1.5〜3 FTE＋facade は最も重い | 新規仮定で A-054 枠内か未検証 | sec は最大 5 FTE 増で認可 5 FTE がほぼ倍になり得る | NA-011-1・2 として明記し、A-054 下限側での切替条件（§4.4）に置いた [D] |
| fail-mode | 言及なし | ops の既知良好キャッシュは fail-open 経路を残す | sec・evo は facade 停止＝全 deny の具体策がない | 評価不能（常に deny）と不達（DL-19 の操作階層別 fail-mode）を reason で分離（D3-3・D3-6）[D] |
| 例外の表現 | sec の型付き例外を評価、ops の「例外なし」より現実的 | ops・evo の例外は所有・期限・監査が弱い | 同左 | 型付き例外を採用（D3-5）[D] |
| sec の可逆性・費用 | 3 | 3 | 2 | 要員の確保を DL-27 の決裁事項にした（§残課題）[D] |
| evo の根拠の質 | 4（相談回答の根拠が厚い） | 3（計算誤り、cnf の表現過剰） | 4 | 計算を再計算し、cnf を「未確定」に修正（§4.6）[D] |
| ops の相談回答 | W3C の claim 群に未回答 | 根拠収集の不足 | 要求網羅で劣る | VC DM 2.0 の規範本文を起草者が確認して回答（D9-3）[D] |

### 4.4 判定が覆る条件（§7・§8 に反映）

| # | 条件 | 勝つ案 | 確認手段 |
|---|---|---|---|
| K-1 | CAM の往復試験（TC-011-07）で判定差が 0 にならない、または CAM の共通部分で認可要件カタログ（G-108）の表現率が G-147 の目標を下回る | 案B | TC-011-07・08 |
| K-2 | A-054 が下限 15 FTE 側で確定する、または NA-011-1 の CAM 要員を DEC-4／DL-27 で確約できない | 案B | DL-27 |
| K-3 | A-104（計画期間内に engine を 1 回以上置換）が決裁で否定される | 案B（または案E） | 決裁 |
| K-4 | OpenFGA が Graduated に進み、DSL 仕様が版付きで公開され、複数企業がメンテナに参加する | 案B（OpenFGA DSL 正本）を再評価 | standards-status.md の四半期確認 |
| K-5 | facade の追加遅延（TC-011-12）が DL-20 の予算を超え最適化で解消しない | 案E の部分採用（同一 cell 内直結）。A-090 への影響も同時確認 | TC-011-12 |
| K-6 | ADR-010 が Zanzibar 系 engine ではなく Cedar/AVP 中心を選ぶ、または as-is 棚卸しで graph が浅い（深度 3〜4 以下）と判明 | CAM の射程を見直し、案C の部分採用を検討 | ADR-010、as-is 棚卸し |
| K-7 | 規制顧客が policy の形式解析の証跡を契約で求める | Cedar を G 段または検証専用生成先として採る（D2-8）| DL-34 |
| K-8 | G-066 の判定者が書込経路やモデルファイルを利用側コードに含める解釈を採る | 案A のまま（D10-2 で両解釈に対応済み）。案B は不利になる | 判定者の事前合意 |
| K-9 | AuthZEN の後続版または関連 profile が整合性トークン・model revision を標準化する | 自社 profile の項目を標準へ移す（全案共通） | standards-status.md |
| K-10 | Transaction Tokens が大きく変更される、または RFC 化しない | 取引層相関の `txn` を ADR-009 で再設計（全案共通） | standards-status.md |

### 4.5 取り込んだ要素（grafts）

| 出典 | 取り込んだ内容 | 本書の箇所 |
|---|---|---|
| sec D3-4 | G 段 deny に付く型付き例外主体（期限・監査必須） | D3-5 |
| sec D3-3/D3-5、evo D-4 | 評価不能の列挙（CONDITIONAL、鮮度不充足、未知 profile、Cedar errors） | D3-3 |
| sec D7-3/D7-4 | 証跡は署名付き記録の組合せ。decision event をサンプリング非依存で 100% 出力 | D8-3・D8-4 |
| sec D8-2〜D8-4 | 出所メタデータ付き属性辞書、VC 由来属性の PIP 前段検証 | D9-4〜D9-6 |
| sec §5.3 | Cedar を検証専用生成先とする折衷を PoC 比較対象に残す | D2-8、TC-011-21 |
| sec §1.3・§7.1 | 攻撃者類型との対応表、TC-011-01〜13 | §1.3、§7.1 |
| evo D-7・D-10・D-8・§1.6 | 逆変換と往復試験、書込契約、作成者が持たない permission の束ね禁止、規範強度付き claim 候補表、jti ハッシュの記録 | D2-3、D7、D4-3、D9-2、D8-3 |
| ops §2.3-9 | G 段の固定カタログ×テナント設定値、二者承認、規則 ID を reason に出す | D1-2 |
| ops §2.6-19/20 | 閉じた reason、unsupported_profile、model.pin 欠落時は現行固定版、制約強化は major | D6-1・D6-2 |
| ops §2.3-12 | evaluations ヘルパの意味論固定 | D3-7 |
| ops §2.2-6 | engine 公式ツールを生成 DSL に流す CI 経路 | D2-4 |
| ops L0、§2.5-18 | PEP SDK のローカルなテナント照合、engine client import の CI 禁止 | D1-1、D5-4 |
| ops §2.3-11 | 不達・timeout は PEP の操作階層別 fail-mode（評価不能とは分離） | D3-6 |
| ops §2.4-15・§6.5 | custom role のテナントあたり上限（PoC で決定）、要員の割付け | D4-5、§6.5 |
| ops §3 案C | AVP 従量費の再現可能な試算 | §3 案C |

### 4.6 起草案の誤りと本書での修正

判定者が指摘した誤りを原典・台帳で確認し、次のとおり修正した [D]。

| 指摘 | 確認結果 | 本書での扱い |
|---|---|---|
| sec §4.2 の加重計算 | 案E は 5×0.30＋4×0.20＋4×0.15＋5×0.15＋3×0.10＋2×0.10＝4.15（記載 4.05）。案A 2.20（記載 2.25）、案D 2.60（記載 2.55）。順位は不変 | 起草案の自己採点は本書の評価に使わない。再計算値を記録として残す |
| ops §4.1 の加重合計（満点 85） | 案B 48（記載 47）、案C 46〜49（記載 45〜48）、案D 40（記載 38）、案E 58（記載 59）。案A 66 は正しい | 同上 |
| evo §4.1 の加重合計（満点 75） | 案A 61（記載 63）、案B 45（記載 47）、案C 38（記載 37）、案D 39（記載 40）、案F 46（記載 45）。案A が最上位なのは不変で、案F と案B の 2 位・3 位が逆転 | 同上 |
| 対応要求の R-205 | R-requirements.md の R-205 行の対応成果物は 12_poc/preregistered-test-plan.md と 04_architecture/authorization-model.md で、本書を含むのは R-098 と R-204 の行。deliverables.md の ADR 表は R-098, R-205 | メタ情報で出所ごとに区別して記載 |
| OpenFGA 深度既定 25 の出典 | 原典は OpenFGA『Configuration』（v1.20.0 表示）の resolveNodeLimit（RS-07#19） | 脚注 [^8] として独立させた |
| VC DM の validFrom 等 | §4.9・§4.10 で存在は任意、存在時の形式だけが MUST（起草者が規範本文を確認） | D9-3 で必須と読めない記述にした |
| ops の AVP ライセンス脚注 | OpenFGA の Apache-2.0 は RS-07#25 のリリースページ（RS-07 の [^20]）による。CNCF ページはライセンスの典拠ではない | 脚注 [^54] をライセンスの典拠にした |
| ops の「差替えの頻度（3〜5 年ごとの再決裁）」 | 再決裁周期（A-101）と engine 置換回数（A-104、計画期間で 1 回以上）の混同 | §5 の棄却理由で両者を区別 |
| ops の OpenFGA custom role の「モデル変更が必要」[V] | 公式文書に明記はない（起草者が原典を確認） | D4-1 で [D] に改めた |
| evo の Cedar「主たる開発企業は 1 社」[V] | RS-07#46・#71 に記述がない | 削除 |
| evo の consistency_token 1024 bytes | RS-07#27 は Postgres の保存型の例で、token 長の上限保証ではない | D6-4 で TBD とした |
| evo の cnf「決定済みの方向」 | ADR-005 は I1 を既定とし H-16 で I2 へ切り替える条件を残す | D9-2 で「未確定」と記載 |
| evo の decision event 発行主体の揺れ | — | facade が発行、PEP SDK は enforcement 記録（D5-8・D8-3）に統一 |
| sec の HIGHER_CONSISTENCY と at_least_as_fresh | 格上げとしては成り立つが、token 時点以降の状態の保証は RS-07 で確認されていない | D6-3 で等価扱いせず TC-011-04 で実測 |
| sec の最大テナント 5,266/秒の出典 | A-045 の導出（台帳 §12.6）で A-009 を入力とする | §1.2 で A-045・A-009 を併記 |
| sec §6.3「公式文書には矛盾」 | RS-07#29 と #16 はストア構成によって保証範囲が異なることを示す。RS-07#29 内の 2 ページ間の前提の不揃いはある | §1.2・§6.3 で「構成依存」と「文書間の前提の不揃い」に分けて記載 |
| sec の未使用脚注・欠番 | — | 本書の脚注を振り直した |

---

## 5. 決定理由と棄却理由

### 5.1 決定理由（案A）

1. 20 年の間に engine 置換が 1 回以上ある前提で [A-104]、engine の健全性は数年単位で変わってきた（OPA 創設者の移籍、Aserto の事業終了）[V][^22][^23]（RS-07#57, #69）。利用側が依存する面を「Final の標準 API と基盤所有のモデル表現」に限ることが、置換費用を最小にする [D]。
2. AuthZEN 1.0 準拠を公式に確認できる engine は現時点でない（OpenFGA は experimental で MUST と不一致、SpiceDB は未確認）[V][^5][D]（RS-07#68）。G-066 を満たすには facade で準拠を実装する必要がある [D]。
3. G 段を domain の author が編集できない場所に置き、評価不能 deny を facade で強制すると、ATK-10・ATK-19 への統制を「書かせない構造」で実現でき、engine の意味論差を一点で閉じられる [D]（RS-07#41, #76、RS-17#90）。
4. R-208 の懸念には、CAM の表現力を 2 OSS engine の共通部分に限る、逆変換と往復試験を常時保つ、仕様を公開可能な形で書く、の 3 点で対処する [D]。

### 5.2 棄却理由（traceability/rejected-hypotheses.md へ集約予定）

| ID | 棄却した仮説 | 棄却理由 | 再浮上の条件 |
|---|---|---|---|
| ADR-011/RH-01 | 案B: engine DSL の可搬サブセットを正本にし manifest を持てば、変換器を常時保守せずに出口費用を下げられる | 出口時に manifest から変換先 DSL を生成する変換器が結局要り、その正しさを平時に独立検証する基準がない [D]。置換は計画期間で 1 回以上（A-104）であり、再決裁周期（A-101、初回 3 年以内・以後 5 年以内）とは別の量である。置換 1 回の前提でも、30 ドメイン分のモデルが engine 固有構文に寄る費用は年々増える [D][A-051, A-104] | §4.4 の K-1〜K-4 |
| ADR-011/RH-02 | 案C: Cedar 単一言語で RBAC・ABAC・ReBAC を統一できる | skip-on-error が評価不能 deny と逆向き。entity 階層を呼出側が渡すため 300 サービスの PEP 負荷が大きい。一覧が experimental。AVP 従量費は基準ピークで約 $136,000/月 [V][^14][^18][^26][D] | K-6・K-7（部分採用） |
| ADR-011/RH-03 | 案D: Rego で全認可を書ける | 結果整合で整合性トークンがなく、剥奪の反映が bundle 周期に縛られる。7.55 億 tuple の配布が成り立たない [V][^24][D][A-049] | 関係判定の比率が小さいと判明した場合。G 段の実装手段としては棄却しない |
| ADR-011/RH-04 | 案E: 標準化しないほうが速く安い | 差替えのたびに 300 サービスの SDK 更新が要り、G-066 を外部標準で示せない [D][A-050] | K-5（部分採用） |
| ADR-011/RH-05 | 案F: 独自 API | 準拠実装を使えず解釈がずれる [D] | AuthZEN が非互換の方向に分岐した場合 |
| ADR-011/RH-06 | trace id を access token の claim に入れれば一貫性の証跡になる | token は複数要求で再利用され粒度が合わない。trace-id は相関専用で衝突を偽造され得る [N][^39][D][A-027] | なし（D8 の 4 層相関で代替） |
| ADR-011/RH-07 | 所属などの属性や権限を token claim に載せて PDP 照会を省く | 剥奪が token 寿命に縛られ、token が肥大化する [M][^53][D] | 属性の変更頻度と剥奪 SLO の実測が token 寿命内の陳腐化を許す場合 |
| ADR-011/RH-08 | engine が AuthZEN に準拠するまで待てばよい | 準拠の時期を確認できない（RS-07#68）[D] | 2 つ以上の engine が Final 準拠と interop 結果を公式に公表した場合（facade の薄型化） |
| ADR-011/RH-09 | allow が deny を覆す規則を v1 に置かない（ops R5）だけで例外を扱える | 越境共有・特権・break-glass の例外経路が未定義のままになり、運用で抜け道が生じやすい [D] | なし（D3-5 の型付き例外で代替） |
| ADR-011/RH-10 | PDP・engine 不達も一律に評価不能 deny とすればよい | 一律 fail-closed はレビューが未承認とした（R-087、CL-0108「要実測」）。不達は操作階層別 fail-mode で調停する（R-262）[D] | なし（D3-6） |

---

## 6. 帰結

### 6.1 良い帰結

- PDP を差し替えても利用側の改修 0 件を契約で目標にでき、その条件（D10-1）が CI で機械的に検査される [D]。
- 横断ガードレールがドメインのモデル変更で破られない構造になる [D]（RS-17#96 項 2）。
- decision_id を軸に、PEP coverage の実行時検査（RS-08#35）、監査（ADR-014）、dual-run の差分（R-177）を同じキーで突き合わせられる [D]。
- 障害時は reason の規則 ID、decision_id、model_revision で判定根拠を 1 件ずつ辿れる [D]。
- custom role の変更はデータ書込みとして監査され、モデル配備なしに反映される [D]。

### 6.2 悪い帰結

- facade が判定経路に 1 hop 加わり、遅延と可用性の予算を分け合う。増分は未測定で TBD [D][A-090]。
- CAM の変換器・逆変換・適合試験の維持要員が恒常的に要る（NA-011-1）[D]。
- 共通部分の外にある engine 固有機能（CONDITIONAL の部分応答、SpiceDB の `at_exact_snapshot` など）を利用側が直接使えない [D]。
- 自社 profile は標準外で、他社製 PEP・PDP との相互運用では profile 部分を使えない。AuthZEN に同等機能が入れば移行の手間が生じる [D]。
- OpenFGA を採る場合、`at_least_as_fresh` の格上げで遅延が増える [D]。

### 6.3 残余リスクと受容者案

| 残余リスク | 統制後に残るもの | 受容者案 |
|---|---|---|
| CAM 変換器の共通原因故障 | 逆変換と往復試験は「両 DSL に同じ誤りを生成する」誤りの一部を検出するが、CAM の意味論自体の誤りは検出できない | CISO（技術）、CTO（費用）[D] |
| CAM の肥大化 | 共通部分外の要求が例外審査に集まる | CTO（アーキテクチャ審査会）[D] |
| facade 障害の全テナント波及（R-261） | cell 単位配置・段階展開・G 段カタログの版固定と緊急 freeze で範囲を限るが、cell 内では全判定が fail-mode に入る。fail-mode は DL-19・ADR-013・ADR-023 で決める | CTO＋CISO＋SRE 責任者 [D] |
| engine の consistency の実保証範囲 | 格下げ不可は facade が強制するが、保証範囲はストア構成に依存し（RS-07#16, #29）、SpiceDB の文書間には前提の不揃いがある。PoC 実測まで不明 | CISO [D] |
| 属性の出所の偽装（ATK-06） | 出所メタデータの検証は PIP に依存する | CISO [D] |
| VC DM 2.0 と OpenFGA Custom Roles の原典確認が起草者 1 名の確認にとどまる | 独立検証は未実施 | 本書の作成者以外のレビュアー（§残課題）[D] |
| profile が標準外 | 相互運用で profile 部分は使えない | CTO [D] |

### 6.4 依存サービス・連携開発者への影響

- 利用側は PEP SDK（または AuthZEN の HTTP API）と書込契約だけを使う。engine の SDK・client の import は CI で拒否される [D]。
- SDK の必須呼出しは evaluation 系と一覧ヘルパの 2 つ。consistency は操作階層ごとの既定値で SDK が自動指定する [D]。
- 内容と一緒に書込応答の consistency_token を保存する必要がある（D7-2）[D]。
- 開発者が書くのは CAM のドメインモジュール（型・relation・permission・カタログ条件）だけで、G 段は書けない [D]。変更は PR、CI のテスト、破壊的変更の自動拒否、権限拡大の差分承認を通す [D]。
- 一度公開した deny semantics を緩める変更は破壊的変更として扱う（ADR-016）[D]。
- モック・契約試験キット（DL-80）は AuthZEN profile の負例（`deny_guardrail`、`deny_indeterminate`、`deny_unavailable`、`unsupported_profile`、timeout、consistency 格下げ拒否、cross-tenant、要求 ID 不一致）を再現する（G-121）[D]。

### 6.5 運用・要員への影響

- 認可チームの職務に、CAM 仕様の保守、変換器・逆変換・適合試験キット、facade の運用、G 段カタログの変更審査が加わる [D][A-054]。認可・PDP 5 FTE と PEP SDK 4 FTE への割付けと、NA-011-1・NA-011-2 の増分を枠内とするか外数とするかは DL-27 で決める（決裁案は §残課題）[D][A-054]。
- 30 ドメインの author への教育対象は、CAM のドメインモジュールと条件カタログだけである [D][A-051]。
- engine 置換の演習（export / import と dual-run）を再決裁（A-101）の前に行う [D][A-101]。

---

## 7. 検証

### 7.1 PoC で確かめる仮説と TC 案（TC 番号は DL-22 で採番。ここでは仮番号）

| 仮番号 | 仮説 | 手順 | 合否基準 |
|---|---|---|---|
| TC-011-01 | G 段の deny は R 段のどの permit でも打ち消せない（R-172） | 全域 permit の誤ったドメインモデルを投入し、テナント越え要求を property test で生成 | テナント越え許可 0 件 |
| TC-011-02 | 評価不能は全件 deny | 属性欠落、CEL error、CONDITIONAL、鮮度不充足、未知 profile major を注入 | 全件 decision=false・`deny_indeterminate`、decision event に記録 |
| TC-011-03 | 不達は評価不能と区別され、操作階層別 fail-mode に入る | engine 停止・facade 停止を注入 | `deny_unavailable` で返る。PEP の挙動が DL-19 の表と一致。評価不能が許可に変わる件数 0 |
| TC-011-04 | consistency の格下げをしない。OpenFGA の HIGHER_CONSISTENCY 格上げで剥奪直後の new enemy（RS-07#4 の例 A・B）を防げる | OpenFGA（レプリカ有無の 2 構成）と SpiceDB で `at_least_as_fresh` を要求し、剥奪直後に判定 | 弱いモードで評価 0 件、漏洩 0 件。遅延増分は DL-20 の予算内（TBD） |
| TC-011-05 | 要求 ID 返却と mix-up 対策 | X-Request-ID 返却、メタデータ不一致時の利用拒否 | AuthZEN §9・§10.1.3 の MUST を全件満たす |
| TC-011-06 | engine 差替えで利用側差分 0（G-066） | 参照サービス 2〜3 本を OpenFGA と SpiceDB の facade に向ける | 利用側コード差分 0、契約試験全件合格 |
| TC-011-07 | CAM の往復変換で意味が保たれる（K-1） | OpenFGA DSL→CAM→SpiceDB schema→判定差分 | 全関係の肯定・否定テストで判定差 0 |
| TC-011-08 | CAM の表現率（K-1、G-108） | 認可要件カタログを CAM で記述し 2 engine で評価 | 表現率が G-147 の目標以上（目標値 TBD: DL-65）。allow が広がる差分 0、狭まる差分は全件説明可能 |
| TC-011-09 | custom role の昇格負例と規模（G-115） | 予約 permission・作成者が持たない permission・他テナント role の割当て。テナントあたり role 数を変えて遅延測定 | 全件拒否。遅延は DL-20 の予算内。上限値を決定 |
| TC-011-10 | no-new-access 検査（ATK-10） | 権限拡大のモデル変更を CI に投入 | 全件検出、追加承認なしでは配布されない |
| TC-011-11 | decision event の完全性（R-127） | trace サンプリング率 0% で負荷 [A-045]、監査経路停止を注入 | 記録率 100%（[A-037]）、欠落を検知できる |
| TC-011-12 | facade の追加遅延（K-5） | 最大テナント 5,266/秒と基準ピーク 42,009/秒で facade 有無を比較 [A-045] | 上乗せ p99 ≤ TBD（DL-20 と BIA で決める） |
| TC-011-13 | 4 層相関 | token→`txn`→trace-id→decision_id を 1 業務取引で辿る | 全 hop で連結できる。trace・baggage の識別情報 0 件 |
| TC-011-14 | search の非原子性 | ページング中に剥奪 | 剥奪済み資源の返却 0 件 |
| TC-011-15 | 型付き例外の期限と監査 | 期限切れ例外、監査出力停止時の例外利用 | 期限切れで deny、例外利用の監査欠落 0 件 |
| TC-011-16 | 書込契約の consistency_token | 書込応答の token を後続判定に渡す | read-after-write 不整合 0 件（ストア構成ごと） |
| TC-011-17 | dual-run の差分分類（R-178） | export / import と dual-run | allow が広がる差分 0 件 |
| TC-011-18 | 移行窓の token 読替え（C-10） | 旧 engine の token を新 engine に渡す | 全件 `fully_consistent` で評価、エラー 0 件 |
| TC-011-19 | CI ガード（C-1） | engine client を import するサービスを投入 | 全件拒否 |
| TC-011-20 | Cedar errors→deny（Cedar を生成先・置換先にする場合） | forbid が参照する entity を欠落させる | 全件 deny |
| TC-011-21 | Cedar 検証専用生成先の効果（D2-8） | CAM の permission 差分を Cedar の SMT 解析にかける | TC-011-10 で検出できない差分の検出件数を記録（採否判断の入力） |

### 7.2 第三者評価で確かめること

- facade の AuthZEN 1.0 準拠。OIDF の適合試験・interop が提供されていればそれを使い（提供の有無は未確認）、なければ作成者以外による契約試験の再実行で確かめる（G-123）[D]。
- CAM 仕様書が作成者以外でも実装できる程度に書かれていること、変換器の意味保存（差分試験と抜取り）[D]。
- G 段・facade・PEP の bypass と cross-tenant の侵入試験（テナント越え、custom role 昇格、profile 偽装、型付き例外の悪用）（G-083、R-168）[D]。
- 本書が依拠した原典のうち研究ノート外の 2 件（VC DM 2.0、OpenFGA Custom Roles）の独立照合 [D]。

---

## 8. 再検討トリガーと見直し時期

| 種別 | トリガー | 見直す決定 |
|---|---|---|
| 標準 | AuthZEN の後続版、または整合性・モデル版・obligation を扱う profile（SS-C15〜SS-C18 の WG draft 等）が Final になる | D6 の profile 項目を標準へ移す（K-9） |
| 標準 | Transaction Tokens が RFC になる、または大きく変更・廃案になる | D8-2 の取引層（K-10、ADR-009 と共同） |
| 標準 | Token Status List が RFC になる | D9-2 の `status`（ADR-005 で再判断） |
| 標準 | 利用者・規制が VC の提示プロトコルを要求する | D9-3〜D9-6 の外部検証済み属性（NA-011-3） |
| 製品 | OpenFGA が内容と結び付く整合性トークンを提供する、または AuthZEN 実装が experimental でなくなる | D6-3、案B の再評価 |
| 製品 | OpenFGA が Graduated に進み DSL 仕様が版付き公開・複数企業参加になる | 案B（K-4） |
| 製品 | 候補 engine の CNCF 成熟度・ライセンス・主たる開発企業・メンテナの変化 | ADR-010・ADR-018 と連動した engine の選び直し |
| 製品 | 2 つ以上の engine が AuthZEN 1.0 Final 準拠と interop 結果を公式に公表する | facade の薄型化（RH-08） |
| 製品 | Cedar の `tpe` が GA になる、Lean による符号化の証明が完了する | 案C の再評価、D2-8 の折衷 |
| 実測 | TC-011-07・08 不合格 | 案B へ切替（K-1） |
| 実測 | TC-011-12 が DL-20 の予算超過 | 案E の部分採用（K-5） |
| 実測 | TC-011-04 で HIGHER_CONSISTENCY が new enemy を防げない | D6-3 の格上げ規則と ADR-010 の engine 選定 |
| 実測 | 剥奪→拒否の実測値が R-143 の上限を超える | consistency の操作階層別既定値 |
| 実測 | G 段カタログが目安（10 前後、TBD）を超える、または固定カタログで表しきれない | G 段だけを Cedar（解析性優先）または Rego（社内知見優先）へ部分移行。Cedar の場合は D3-3 の errors→deny を前提条件にする |
| 組織 | A-054 の確定値、DL-27 の要員決定、A-104 の決裁 | K-2・K-3 |
| 規制 | 認可判定の記録・説明に関する規制変更、policy 形式解析の証跡要求（DL-34） | D8-4、K-7 |
| 定期 | 初回は G6 開始から 3 年以内、以後 5 年以内 [A-101]。標準の状態は四半期ごと（standards-status.md） | 全体 |

---

## 9. 依存関係

| 種別 | 対象 | 依存の内容 |
|---|---|---|
| ADR | ADR-002 | G 段の最低認証強度 |
| ADR | ADR-004 | 外部検証済み属性の取得段 |
| ADR | ADR-005 | token に載せる claim の範囲（V10）、`jti`、D9-2 の候補の採否、`cnf` |
| ADR | ADR-006 | session 失効と decision の突合 |
| ADR | ADR-009 | PEP の mTLS 認証、Txn-Token と `txn` の採否 |
| ADR | ADR-010 | engine と store、consistency の実保証範囲（K-6） |
| ADR | ADR-012 | PEP coverage と decision event の突合 |
| ADR | ADR-013・ADR-023 | facade の cell 配置と fail-mode（DEC-3 対象） |
| ADR | ADR-014 | decision event のスキーマ・保持・所在地・改ざん検知 |
| ADR | ADR-016 | profile・CAM の versioning と破壊的変更の定義 |
| ADR | ADR-017 | 主体種別と委任連鎖の属性 |
| ADR | ADR-018・ADR-027 | 出口戦略、dual-run、移行窓の token 読替え |
| ADR | ADR-021 | 名前空間 URI、profile キー名（不可逆、DEC-3 対象） |
| ADR | ADR-022 | AuthZEN を連携契約の標準に含めること（DEC-3 対象） |
| ADR | ADR-024・ADR-025・ADR-029 | 型付き例外（越境共有・特権）、一覧の後段補正 |
| 設計文書 | DL-17 04_architecture/authorization-model.md | CAM の型・relation・deny semantics の詳細、操作階層別 consistency 既定 |
| 設計文書 | DL-19 04_architecture/fail-mode-matrix.md | `deny_unavailable` の操作階層別扱い |
| 設計文書 | DL-20 07_slo/numeric-contracts.md | facade の遅延予算、剥奪 SLO |
| 設計文書 | DL-26 02_requirements/customer-admin-responsibility.md | custom role の委譲範囲 |
| 設計文書 | DL-27 08_operations/operating-model.md | CAM・facade の要員 |
| 設計文書 | DL-65 10_integration/authz-modeling-guide.md | モデリング規約、G-147 の表現率目標 |
| 契約 | DL-71 11_contracts/schemas/common.schema.json | decision_id の形式 |
| 契約 | DL-72 11_contracts/authorization-api.openapi.yaml | AuthZEN＋自社 profile |
| 契約 | DL-73 11_contracts/relationship-model-registry.openapi.yaml | 書込契約、model_revision の registry |
| 契約 | DL-75 11_contracts/schemas/access-token-claims.schema.json | D9-2 の claim 候補 |
| 契約 | DL-80 11_contracts/mock-contract-test-kit.md | profile の負例 |
| 試験 | DL-22 12_poc/preregistered-test-plan.md | §7 の TC |
| 決裁 | DEC-8 | PEP–PDP API の凍結 |

---

## 対応表（R/G）

閉じ方は CONVENTIONS §6（A 机上、B 組織決定、C 実測、D 第三者）[D]。

| ID | 内容（要約） | 本書の箇所 | 閉じ方 | 状態 |
|---|---|---|---|---|
| R-098 | policy 言語、schema、deny semantics、conflict resolution | §2.1〜§2.4 | A | 本書で閉じた（決裁前の proposed） |
| R-204 | 認可 domain model と PEP 統合は自社開発候補、engine/store 自作は別審査 | D5-9、§3 | B | 決裁案まで（ADR-010 と共同） |
| G-109 | 型・relation・permission・deny semantics・conflict resolution・policy 言語・自動解析の可能性の定義 | §2.1〜§2.4、D2-5、D2-8 | A | 本書で閉じた（作成者以外の確認待ち） |
| G-066 | PDP 2 種の差替えで利用側差分 0 | §2.10、TC-011-06 | C | 要実測（解釈は D10-2 で要合意） |
| R-205 | typed ReBAC＋限定 ABAC の実証（deliverables.md の ADR 表で本書の対応要求） | §2.1、TC-011-01・02・08 | C | 要実測（主管は DL-22・DL-17） |
| R-252 | 巨大ロール表を避ける細粒度認可 | §2.1、§2.4 | A | 本書で閉じた（DL-17・DL-65 と分担） |
| R-253・R-254 | 一貫性認識、PEP/PDP 分離・bypass 不能 | D5-3・D5-4・D5-8、D6-3 | A | 本書で閉じた（ADR-012 と分担） |
| R-250 | テナント境界の多層化 | D1-1 L0・G 段 | A | 本書で閉じた（pep-contract と分担） |
| R-262 | 既定 deny の維持と fail-mode による調停 | D3-3、D3-6 | A | 本書で閉じた（値は DL-19） |
| R-087 | 一律値の撤回 | D3-6 | A | 本書で閉じた |
| R-208 | 独自言語・特定製品への過度依存の回避 | D2-1〜D2-3、§5.1 | A | 本書で閉じた（第三者レビュー §7.2） |
| R-093・R-280 | 選定評価軸、意味論の比較 | §3、§4 | C | 要実測 |
| R-097・R-142・R-144 | engine と consistency mode、実保証範囲の明記 | §1.2、D6-3（ADR-010 と分担） | C | 要実測（TC-011-04） |
| R-143 | 剥奪→拒否の最大時間 | §8 | C | 要実測（DL-17・DL-20） |
| R-147〜R-149 | model ID の pin、shadow、段階展開 | D2-5、D2-7、D6-1 | C | 要実測 |
| R-109 | versioning・後方互換 | D6-2 | C | 要実測（ADR-016） |
| R-127 | 記録率・欠損検知 | D8-4、TC-011-11 | C | 要実測 |
| R-133 | delegated admin と顧客管理者の攻撃面 | §2.4 | C | 要実測（TC-011-09） |
| R-168 | 具体脅威（tenant confusion、policy rollback、stale allow） | §1.3、§7 | D | 要第三者（§7.2） |
| R-171・R-172 | graph PoC、cross-tenant property test | TC-011-01・09 | C | 要実測 |
| R-175・R-177・R-178 | 差分試験、dual-run、allow 拡大差分の調査 | D2-5、D10-1 C-9、TC-011-17 | C | 要実測 |
| R-090・R-091・R-103 | 置換・出口の前提 | D2-3、§2.10 | A・C | 決裁案まで（ADR-018 と分担）／要実測 |
| R-099 | PDP topology | D5-3（ADR-013 と分担） | C | 要実測 |
| R-261 | 共有 PDP の全体波及 | §6.3 | C | 要実測（ADR-013） |
| G-069 | versioning | D6-2 | C | 要実測（ADR-016） |
| G-070 | export / import 演習 | TC-011-17、§6.5 | C | 要実測（ADR-018） |
| G-072 | アーキテクチャ性質の CI 常時検査 | D5-4、D10-1 C-1、TC-011-19 | C | 要実測 |
| G-083 | 独立評価者による bypass・cross-tenant の侵入試験 | §7.2 | D | 要第三者 |
| G-107・G-147 | 柔軟性 4 指標と目標値 | D2-5（④）、D4（③）、TC-011-08（①） | A・C | 一部（目標値 TBD: DL-65） |
| G-108 | 認可要件カタログの表現可否 | TC-011-08 | C | 要実測 |
| G-115 | 顧客管理者の設定範囲と負例 | §2.4、D1-2 規則 5、TC-011-09 | C | 要実測 |
| G-121 | モックで負例を再現 | §6.4 | C | 要実測（DL-80） |
| G-123 | 作成者以外による契約・モックだけでの連携 | §7.2 | D | 要第三者 |
| CL-0002・CL-0156・CL-0180〜CL-0182・CL-0254・CL-0106・CL-0108 | 旧提案の主張の処置 | §2.1、§2.3、§2.5 | A | 処置を本書に反映（CL-0106・0108・0182 の値は DL-19 で要実測） |

---

## 残課題

| # | 本書で閉じないもの | 担当 | 閉じるゲート |
|---|---|---|---|
| 1 | 決裁案: CAM・facade の要員（NA-011-1・NA-011-2）を A-054 の内数とするか外数とするか。選択肢は (a) 内数（認可 5・SDK 4 FTE の再配分）、(b) 外数で 3〜5 FTE 増、(c) 確保できなければ案B に切替（K-2）。推奨は (b) を G3 で暫定確保し DL-27 で確定。帰結: (a) は facade 運用と CAM 保守が兼務になり bus factor が下がる、(c) は出口費用が年々増える。決める人: CTO＋CFO | CTO | G3（DL-27・DEC-4） |
| 2 | 決裁案: A-104（engine 置換 1 回以上）の扱い。否定されれば案B が勝つ（K-3）。決める人: CTO | CTO | G3 |
| 3 | G-066 の「利用側コード」の解釈（書込経路・モデルファイルを含めるか）の事前合意 | CTO と独立立会人 | G4 前 |
| 4 | 新規仮定 NA-011-1〜3 の前提台帳への追加 | 前提台帳の所有者 | G3 |
| 5 | VC DM 2.0（§4.7〜§4.11）と OpenFGA Custom Roles の原典の独立照合 | 本書の作成者以外のレビュアー | G3 |
| 6 | D9-2 の claim 候補の採否 | ADR-005／DL-75 の担当 | G3 |
| 7 | `txn` の採否と取引 token サービスの設計 | ADR-009 の担当 | G3 |
| 8 | `deny_unavailable` の操作階層別 fail-mode と既知良好キャッシュの上限 | DL-19 の担当（SRE 責任者＋CISO） | G4 |
| 9 | TBD 値: facade 遅延予算（DL-20）、consistency_token 最大長（D6-4）、custom role 上限（D4-5）、G-147 の表現率目標（DL-65）、G 段カタログ規模の目安 | 各所有者（§2 に記載） | G4 |
| 10 | §7.1 の TC の採番と事前登録 | DL-22 の担当 | G4 |
| 11 | 第三者評価（§7.2）の実施 | CISO（評価者の手配） | G5 |
| 12 | 棄却仮説 RH-01〜RH-10 の traceability/rejected-hypotheses.md への集約 | traceability の担当 | Phase 4 |

---

## 参考文献

[^1]: O. Gazitt, D. Brossard, A. Tulshibagwale (Eds.), OpenID AuthZEN WG『Authorization API 1.0』Final, 2026-01-11. https://openid.net/specs/authorization-api-1_0.html （参照箇所: §1, §2, §4, §5（5.1, 5.5）, §11.1〜11.2、確認日: 2026-10-03。RS-07#61〜#63）
[^2]: O. Gazitt, D. Brossard, A. Tulshibagwale (Eds.), OpenID AuthZEN WG『Authorization API 1.0』Final, 2026-01-11. https://openid.net/specs/authorization-api-1_0.html （参照箇所: §6, §7（7.1.1, 7.1.2.1, 7.2）, §8（8.1, 8.2, 8.4〜8.6）、確認日: 2026-10-03。RS-07#64, #65）
[^3]: O. Gazitt, D. Brossard, A. Tulshibagwale (Eds.), OpenID AuthZEN WG『Authorization API 1.0』Final, 2026-01-11. https://openid.net/specs/authorization-api-1_0.html （参照箇所: §9（9.2.3）, §10（10.1, 10.1.3）, §11.6, §11.7、確認日: 2026-10-03。RS-07#66）
[^4]: OpenID Foundation『Authorization API 1.0 Final Specification Approved』2026-01-12. https://openid.net/authorization-api-1-0-final-specification-approved （参照箇所: 告知本文と投票結果、確認日: 2026-10-03。RS-07#60、RS-16#22）
[^5]: OpenFGA『AuthZEN API (Experimental)』web 文書（ページ表示の最終更新 2026-09-28）. https://openfga.dev/docs/interacting/authzen （参照箇所: Enabling AuthZEN, Implementation Notes（Pagination, Authorization model selection extension, X-Request-ID header）、確認日: 2026-10-03。RS-07#23, #68）
[^6]: OpenFGA『Query Consistency Modes』web 文書（版表記なし）. https://openfga.dev/docs/interacting/consistency （参照箇所: Background, When to use higher consistency, Future work、確認日: 2026-10-03。RS-07#13〜#15）
[^7]: OpenFGA『Configuring OpenFGA』web 文書（版表記なし）. https://openfga.dev/docs/getting-started/setup-openfga/configure-openfga （参照箇所: read replicas（Synchronous vs Asynchronous Replication, Higher Consistency Mode）、確認日: 2026-10-03。RS-07#16）
[^8]: OpenFGA『Configuration』（ページ表示 v1.20.0）. https://openfga.dev/docs/getting-started/setup-openfga/configuration （参照箇所: resolveNodeLimit, check query cache TTL、確認日: 2026-10-03。RS-07#15, #19）
[^9]: OpenFGA『Immutable Authorization Models』web 文書（版表記なし）. https://openfga.dev/docs/getting-started/immutable-models （参照箇所: How to target a particular model, Progressively rollout changes、確認日: 2026-10-03。RS-07#18）
[^10]: OpenFGA『Conditions』web 文書（版表記なし）. https://openfga.dev/docs/modeling/conditions （参照箇所: Queries with condition context, Limitations、確認日: 2026-10-03。RS-07#22）
[^11]: AuthZed『Consistency』SpiceDB 文書（版表記なし）. https://authzed.com/docs/spicedb/concepts/consistency （参照箇所: Levels, ZedTokens, Storing ZedTokens、確認日: 2026-10-03。RS-07#26〜#29）
[^12]: AuthZed『Caveats』SpiceDB 文書（版表記なし）. https://authzed.com/docs/spicedb/concepts/caveats （参照箇所: CheckPermission の CONDITIONAL 応答、確認日: 2026-10-03。RS-07#32）
[^13]: AuthZed『SpiceDB Commands & Parameters』SpiceDB 文書（版表記なし）. https://authzed.com/docs/spicedb/concepts/commands （参照箇所: --dispatch-max-depth, --max-caveat-context-size、確認日: 2026-10-03。RS-07#32, #35）
[^14]: Cedar Policy『Authorization』Cedar Policy Language Reference Guide（版表記なし）. https://docs.cedarpolicy.com/auth/authorization.html （参照箇所: default deny / forbid overrides permit / skip on error、関連 policy と entity データの決定、確認日: 2026-10-03。RS-07#39, #44）
[^15]: Cedar Policy『Policy validation』Cedar Policy Language Reference Guide（版表記なし）. https://docs.cedarpolicy.com/policies/validation.html （参照箇所: validation soundness, 検出されない誤り（missing entities）, strict mode、確認日: 2026-10-03。RS-07#40）
[^16]: J. W. Cutler et al.『Cedar: A New Language for Expressive, Fast, Safe, and Analyzable Authorization (Extended Version)』arXiv:2403.04651v2, 2024-03-08. https://arxiv.org/abs/2403.04651 （参照箇所: §3.5 Properties, §3.6 Full Cedar、確認日: 2026-10-03。RS-07#39）
[^17]: J. W. Cutler et al.『Cedar: A New Language for Expressive, Fast, Safe, and Analyzable Authorization (Extended Version)』arXiv:2403.04651v2, 2024-03-08. https://arxiv.org/abs/2403.04651 （参照箇所: §4 冒頭, §4.4 Soundness and completeness、確認日: 2026-10-03。RS-07#42）
[^18]: cedar-policy『cedar-policy/CHANGELOG.md』GitHub（最新記載版 4.13.0, 2026-09-15）. https://github.com/cedar-policy/cedar/blob/main/cedar-policy/CHANGELOG.md （参照箇所: [4.13.0] Changed, [4.6.0] Added、確認日: 2026-10-03。RS-07#45）
[^19]: Cloud Native Computing Foundation『OpenFGA』プロジェクトページ. https://www.cncf.io/projects/openfga/ （参照箇所: 成熟度と受理日・Incubating 移行日、確認日: 2026-10-03。RS-07#25, #71）
[^20]: Cloud Native Computing Foundation『Cedar』プロジェクトページ. https://www.cncf.io/projects/cedar/ （参照箇所: Sandbox としての受理日、確認日: 2026-10-03。RS-07#46, #71）
[^21]: Cloud Native Computing Foundation『Open Policy Agent (OPA)』プロジェクトページ. https://www.cncf.io/projects/open-policy-agent-opa/ （参照箇所: 受理・Incubating・Graduated の各日付、確認日: 2026-10-03。RS-07#57, #71）
[^22]: Open Policy Agent『Note from Teemu, Tim, and Torin to the Open Policy Agent community』Open Policy Agent Blog, 2025-08-20. https://www.openpolicyagent.org/blog/note-from-teemu-tim-and-torin-to-the-open-policy-agent-community-2dbbfe494371 （参照箇所: 冒頭の告知, FAQ、確認日: 2026-10-03。RS-07#57）
[^23]: O. Gazitt, G. Drapers (Aserto)『The final chapter for Aserto』Aserto Blog, 2025-04-27. https://www.aserto.com/blog/the-final-chapter-for-aserto （参照箇所: SaaS control plane の停止日, 営利事業の終了、確認日: 2026-10-03。RS-07#69）
[^24]: Open Policy Agent『Bundles』OPA 文書（版表記なし）. https://www.openpolicyagent.org/docs/management-bundles （参照箇所: 概要（eventually consistent）, Signing、確認日: 2026-10-03。RS-07#55）
[^25]: Open Policy Agent『Configuration』OPA 文書（版表記なし）. https://www.openpolicyagent.org/docs/configuration （参照箇所: Bundles の polling, Decision Logs の reporting.buffer_*・max_decisions_per_second、確認日: 2026-10-03。RS-07#55, #56）
[^26]: Amazon Web Services『Amazon Verified Permissions pricing』web ページ（改定日表記なし）. https://aws.amazon.com/verified-permissions/pricing/ （参照箇所: Single Authorization Requests、確認日: 2026-10-03。RS-07#47）
[^27]: Amazon Web Services『Quotas for Amazon Verified Permissions』User Guide. https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/quotas.html （参照箇所: Quotas for resources, Quotas for hierarchies, Quotas for operations per second、確認日: 2026-10-03。RS-07#48, #53）
[^28]: Google Cloud『Deny policies』IAM 文書, 2026-09-30 更新. https://docs.cloud.google.com/iam/docs/deny-overview （参照箇所: Policy evaluation, Deny rules（denial conditions, exception principals）、確認日: 2026-10-03。RS-17#90）
[^29]: Amazon Web Services『How AWS enforcement code logic evaluates requests to allow or deny access』IAM User Guide. https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic_policy-eval-denyallow.html （参照箇所: 要約の 3 項目, 評価手順、確認日: 2026-10-03。RS-17#91）
[^30]: Amazon Web Services『Validate policies with IAM Access Analyzer custom policy checks』IAM User Guide. https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-custom-policy-checks.html （参照箇所: 冒頭, CLI / API の 3 種のチェック、確認日: 2026-10-03。RS-17#92）
[^31]: Google Cloud『Roles and permissions』IAM 文書, 2026-09-30 更新. https://docs.cloud.google.com/iam/docs/roles-overview （参照箇所: Role types, Basic roles の注意, Custom roles の保守責任、確認日: 2026-10-03。RS-17#89）
[^32]: OpenFGA『Modular Models』web 文書（版表記なし）. https://openfga.dev/docs/modeling/modular-models （参照箇所: 冒頭の課題記述, code owners, Type extensions の制約、確認日: 2026-10-03。RS-17#85）
[^33]: OpenFGA『Testing Models』web 文書（版表記なし）. https://openfga.dev/docs/modeling/testing （参照箇所: 冒頭, CI/CD integration、確認日: 2026-10-03。RS-17#86）
[^34]: AuthZed『Validation, Testing, Debugging SpiceDB Schemas』SpiceDB 文書（版表記なし）. https://authzed.com/docs/spicedb/modeling/validation-testing-debugging （参照箇所: zed validate, Assertions, GitHub Actions、確認日: 2026-10-03。RS-17#87）
[^35]: AuthZed『Updating and Migrating Schema in SpiceDB』SpiceDB 文書（版表記なし）. https://authzed.com/docs/spicedb/modeling/migrating-schema （参照箇所: 許される変更と拒否される変更, 複数段階の移行手順、確認日: 2026-10-03。RS-17#88）
[^36]: OpenFGA『Custom Roles』web 文書（版表記なし）. https://openfga.dev/docs/modeling/custom-roles （参照箇所: role 型と assignee 関係の追加、assignee tuple と role#assignee による permission の結び付け、別の型にする理由 "Because our roles are going to be dynamic and might change frequently, we represent them in a new type"、確認日: 2026-10-03。research ノートにない原典のため本書の起草者が取得して確認した。独立検証は未実施）
[^37]: OWASP『API5:2023 Broken Function Level Authorization』API Security Top 10 2023. https://github.com/OWASP/API-Security/blob/master/editions/2023/en/0xa5-broken-function-level-authorization.md （参照箇所: How To Prevent、確認日: 2026-10-03。RS-08#11）
[^38]: OWASP『ASVS 5.0.0 — V16 Security Logging and Error Handling』v5.0.0, 2025-05-30. https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/en/0x25-V16-Security-Logging-and-Error-Handling.md （参照箇所: 16.3.2、確認日: 2026-10-03。RS-08#34）
[^39]: W3C『Trace Context』W3C Recommendation, 2021-11-23. https://www.w3.org/TR/trace-context/ （参照箇所: §6, §6.1, §6.2, §7.2, §8、確認日: 2026-10-03。RS-10#16, #17）
[^40]: A. Tulshibagwale, G. Fletcher, P. Kasselman / IETF『Transaction Tokens』draft-ietf-oauth-transaction-tokens-11（Internet-Draft、IESG 未提出）, 2026-07-30. https://datatracker.ietf.org/doc/html/draft-ietf-oauth-transaction-tokens-11 （参照箇所: §1, §9.1, §9.2, §13.1, §13.2、確認日: 2026-10-03。RS-06#30, #31, #36）
[^41]: OpenID Foundation FAPI WG (D. Fett)『FAPI 2.0 Attacker Model』Final, 2025-02-22. https://openid.net/specs/fapi-attacker-model-2_0-final.html （参照箇所: §5, §6, §8.4、確認日: 2026-10-03。RS-04#50）
[^42]: W3C『Verifiable Credentials Data Model v2.0』W3C Recommendation, 2025-05-15. https://www.w3.org/TR/vc-data-model-2.0/ （参照箇所: Status of This Document、§2 Terminology（claim の定義）、§4.7 Issuer、§4.8 Credential Subject、§4.9 Validity Period、§4.10 Status、§4.11 Data Schemas の規範本文、確認日: 2026-10-03。research ノートにない原典のため本書の起草者が取得して確認した。独立検証は未実施）
[^43]: Google Cloud『Incident details（Service Control, 2025-06-12）』Google Cloud Service Health, Incident Report 2025-06-13. https://status.cloud.google.com/incidents/ow5i3PPK96RduMcb1SsW （参照箇所: Summary / What happened?、確認日: 2026-10-03。RS-09#66〜#68）
[^44]: R. Pang et al. (Google)『Zanzibar: Google's Consistent, Global Authorization System』USENIX ATC 2019. https://www.usenix.org/system/files/atc19-pang.pdf （参照箇所: §2.1 Relation Tuples, §2.3, §2.4、確認日: 2026-10-03。RS-07#12）
[^45]: M. Jones, J. Bradley, N. Sakimura『JSON Web Token (JWT)』RFC 7519, 2015-05. https://www.rfc-editor.org/rfc/rfc7519 （参照箇所: §4 JWT Claims, §4.1.7 "jti" Claim、確認日: 2026-10-03。RS-16#14）
[^46]: M. Jones, J. Bradley, N. Sakimura『JSON Web Signature (JWS)』RFC 7515, 2015-05. https://www.rfc-editor.org/rfc/rfc7515 （参照箇所: §4.1.11 "crit"、確認日: 2026-10-03。RS-16#16）
[^47]: IETF (V. Bertocci)『RFC 9068: JSON Web Token (JWT) Profile for OAuth 2.0 Access Tokens』2021-10. https://www.rfc-editor.org/rfc/rfc9068 （参照箇所: §2.1, §2.2, §4、確認日: 2026-10-03。RS-04#60）
[^48]: IETF (M. Jones, A. Nadalin, B. Campbell, J. Bradley, C. Mortimore)『RFC 8693: OAuth 2.0 Token Exchange』2020-01. https://www.rfc-editor.org/rfc/rfc8693 （参照箇所: §4.1, §4.4、確認日: 2026-10-03。RS-04#66）
[^49]: IETF (T. Lodderstedt, J. Richer, B. Campbell)『RFC 9396: OAuth 2.0 Rich Authorization Requests』2023-05. https://www.rfc-editor.org/rfc/rfc9396 （参照箇所: §2, §5、確認日: 2026-10-03。RS-04#64）
[^50]: IETF (V. Bertocci, B. Campbell)『RFC 9470: OAuth 2.0 Step Up Authentication Challenge Protocol』2023-09. https://www.rfc-editor.org/rfc/rfc9470 （参照箇所: §6.1、確認日: 2026-10-03。RS-04#72）
[^51]: IETF OAuth WG (T. Looker, P. Bastian, C. Bormann)『Token Status List (TSL)』draft-ietf-oauth-status-list-21（Internet-Draft、IESG 状態 RFC Ed Queue）, 2026-06-21. https://www.ietf.org/archive/id/draft-ietf-oauth-status-list-21.txt （参照箇所: Abstract, §1.1、確認日: 2026-10-03。RS-04#80）
[^52]: A. Parecki, K. McGuinness, B. Campbell / IETF『Identity Assertion JWT Authorization Grant』draft-ietf-oauth-identity-assertion-authz-grant-04（Internet-Draft）, 2026-05-21. https://datatracker.ietf.org/doc/html/draft-ietf-oauth-identity-assertion-authz-grant-04 （参照箇所: §3.1、確認日: 2026-10-03。RS-06#49）
[^53]: A. Tainter (Carta)『AuthZ: Carta's highly scalable permissions system』Building Carta, 2021-06-11. https://medium.com/building-carta/authz-cartas-highly-scalable-permissions-system-782a7f2c840f （参照箇所: Experimenting with tokens、確認日: 2026-10-03。RS-07#74。当事者による公開記事で、測定条件の記載はない）
[^54]: OpenFGA『Release v1.21.0』GitHub, 2026-09-20. https://github.com/openfga/openfga/releases/tag/v1.21.0 （参照箇所: リリース日、リポジトリのライセンス表示 Apache-2.0、確認日: 2026-10-03。RS-07#25）
