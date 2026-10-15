# 成果物計画（マスターファイル計画）

> 文書ID: TRC-03 / 版: 0.6 / 状態: draft / 最終更新: 2026-10-15（0.6（PoC/R7反映）: §4.6 の DL-81 行に、git の追跡状態（コミット d6af03e で追跡）と関連ファイルの独立再現ログ（12_poc/reproduction-log.md）を記し、§8 に同ファイルの行を加えた（計画ファイル数 172）。同ファイルは本文で文書ID を「POC-04（仮）」としているが、§8 で POC-04 は DL-120（契約試験キット本体）に割り当て済みであり衝突するので、本書では POC-05（案）として登録し、改番を申し送った。§4.8 の DL-109 行に TRC-10 版 0.4（ラウンド 1〜7）の状態を記した（TRC-10 申し送り 4）。§6.1 に DEC-10 と将来の決裁単位 DEC-11（仮）を加えた（模擬パネル ラウンド 7 の MP-7-30）。DL の定義・件数（121）は変えていない。脚注 14〜15、末尾「レビュー記録」PoC/R7反映 を加えた。0.5 追補（模擬パネル ラウンド 7 の sre 指摘）: §4.6 の DL-81 行と §8 の 12_poc/measurement-report.md 行に、作成済み（POC-02 版 0.1、draft、作成者以外の確認未実施）の状態を記した。DL の定義・件数・ファイル数は変えていない。末尾「レビュー記録」ラウンド 7（sre）。0.5: 模擬パネル（自己レビューであり、実在の CTO/CISO の決裁ではない）ラウンド 7 の devlead 指摘により、§4.6 の DL-120 の受入れ基準に (4)（sandbox の workload・交換可能な組の登録が MK-02 で動き CRN-28 を再現した記録）と DCS-06 §5.2.2 のキット費目との関係の注記を加えた。末尾「レビュー記録」ラウンド 7）
> 対応要求: R-025（全要求を単一台帳へ載せ所有者を割当）、R-197〜R-202（追跡可能性と決裁範囲）、ほか R-001〜R-210 全件の成果物割当。G-xxx は未確定（traceability/G-goal-criteria.md の確定後に追記）
> 依存文書: CONVENTIONS.md, traceability/seed/seed-01-ciso-assurance.md, traceability/seed/seed-02-cto-technical.md, traceability/seed/seed-03-redteam-decision.md, 20年運用を前提とした認証・認可基盤提案のCTO CISOレビュー.md

## 1. 本書の位置付けと使い方

- 本書は再提案プログラムの全成果物に DL-ID・ファイルパス・文書ID・作成 Phase・閉じ方区分・証拠種別を割り当てる台帳であり、後続の全エージェントは §8 のファイル名と文書IDに従って書く。
- DL-01〜DL-34 は seed-01 §1 の成果物カタログ D01〜D34 の読み替えであり[^2]、DL-35 以降は種資料にない成果物（決裁パッケージ、連携ハンドブック、連携契約、調査ノート、追跡台帳ほか）の追加である [D]。
- 割当・分類・Phase・区分はすべて種資料 3 点[^2][^3][^4]とレビュー原文[^5]から導いた設計推論 [D] である。表中セルへの個別タグは省略し、本注記で代える。
- 種資料は成果物構成の入力として参照するのみで、技術的主張の根拠には使わない（種資料自身が「直接の根拠として引用してはならない」と明記している）[^2][^3][^4]。
- 本書にないファイルを作る場合は、先に本書へ DL を追加する（末尾採番、欠番は再利用しない、廃止は行を消さず「廃止」と記す）。他エージェントが並行して書いているため、本書の変更は追記を原則とする。

## 2. 凡例

### 2.1 作成 Phase（本プログラムの作業工程）

本書の Phase は再提案プログラムの作業工程であり、旧提案書の Phase 0〜3[^6] やレビューの Gate 0〜6[^5] とは別の番号体系である。両者の対応は DL-42（ゲート計画）に置く。

| Phase | 名称 | 主な作業 | 定義の出所 |
|---|---|---|---|
| 1 | 準備・分解 | 規約、指摘の原子化（R/G）、成果物計画、前提台帳初版 | 本書による定義 [D] |
| 2 | 一次資料調査 | research/ RS-01〜RS-16、標準ステータス台帳、主張台帳・引用監査の初期登録 | seed-01・seed-02 冒頭注記の「Phase 2 で一次資料により再検証」[^2][^3] |
| 3 | 設計・起草 | 01〜11 の本体、ADR、PoC 試験計画（事前登録案）、決裁パッケージ初版 | 本書による定義 [D] |
| 4 | 検証 | 自動検査、引用監査全件、独立反証レビュー、模擬パネル、PoC 事前登録の凍結 | CONVENTIONS 冒頭・§8 の「Phase 4 の自動検査」「模擬パネル（Phase 4）」[^1] |
| 5 | 実測・是正 | PoC 実行と実測レポート、数値契約・容量モデルへの実測反映、Phase 4 指摘の是正 | 本書による定義 [D] |
| 6 | 凍結・提出準備 | 決裁パッケージ凍結、完了定義の確認、残課題台帳の確定 | 本書による定義 [D] |

- 表の「作成Phase」は初版を作る Phase を示す。`3→5` は「Phase 3 で初版、Phase 5 で必須改訂（実測反映等）」を示す。全文書は Phase 6 で凍結する。
- PoC 試験計画は Phase 3 で起草し、Phase 4 の検証を経て凍結（事前登録）してから Phase 5 で実行する。事前登録前の実測は合否判定に使わない [D]。

### 2.2 区分（閉じ方）と証拠種別

- 区分は CONVENTIONS §6 の A 机上／B 組織決定／C 実測／D 第三者[^1]を、当該成果物が担う要求の閉じ方として列挙する（例 `A・C`）。本リポジトリ内で閉じるのは A のみであり、B は決裁案・選択肢・様式まで、C は事前登録計画と 12_poc の実測まで、D は RFP/SOW と自己評価までを作る [D]。
- 証拠種別は seed-01 §1 の E1〜E11[^2]を使う。E1・E6・E7・E9 は本リポジトリ内では得られないため、該当成果物は様式と計画を作り、取得は DL-110（残課題）で追跡する [D]。

| E | 意味 |
|---|---|
| E1 | 経営会議・取締役会決議と議事録 |
| E2 | 版管理された承認済み文書（作成者・第2線レビュー者・承認者明記） |
| E3 | 双方向トレーサビリティ（要求→統制→試験→証跡） |
| E4 | 再現可能な自動試験結果（CI ログ・コミットハッシュ） |
| E5 | 実測生データと測定条件 |
| E6 | 第三者報告書 |
| E7 | OIDF 適合試験ログまたは認定 |
| E8 | 演習記録 |
| E9 | リスク受容記録 |
| E10 | IaC/policy 署名付きスナップショット |
| E11 | 是正追跡（POA&M） |

### 2.3 命名規約

- ファイル名は英小文字 kebab-case。文書は `.md`、OpenAPI は `*.openapi.yaml`、JSON Schema は `*.schema.json`。
- 00_decision は読む順を示す 2 桁接頭辞（`00-`〜`08-`）を付ける。
- ADR は `05_adr/ADR-0xx-<slug>.md`、調査ノートは `research/RS-xx-<slug>.md`。
- YAML/JSON の契約ファイルは Markdown のメタ情報ブロックを置けないため、OpenAPI は `info.version` と `info.x-document-id`・`info.x-status`・`info.x-depends-on` に、JSON Schema は `$id`・`$comment` に同等の情報を書く。
- 12_poc のコード本体は `12_poc/code/` 配下、生データは `12_poc/data/` 配下に置き、DL-81・DL-82 から参照する（個別ファイルは DL 対象外）。例外として、契約試験キット本体の `12_poc/code/contract-kit/README.md` は DL-120 の本体文書とし、§8 に行を置く（連携側へ配布する成果物であり、所有者と期限を追跡するため。CON-11 §11・§14.2[^7]）。

## 3. seed-01 由来の成果物（DL-01〜DL-34）

| DL-ID | 成果物名 | ファイルパス | 内容の要点 | 主な対応要求（seed-01 R-ID／目的） | 作成Phase | 区分 | 証拠種別 |
|---|---|---|---|---|---|---|---|
| DL-01 | リスク選好・許容度ステートメント（草案） | 01_governance/risk-appetite-draft.md | 3 つの選択肢ごとに appetite（定性）と tolerance（最大許容損失、最大停止時間、テナント間漏えいゼロの運用定義、特権濫用方針）の決裁案を示す。金額パラメータは「TBD＋所有者＋期限」とし、技術側は選択肢と帰結の提示に留める。 | R-005, R-008, R-009, R-011, R-012／経営が受容するリスク水準を測定可能な形で決める | 3 | B | E1 |
| DL-02 | 重大損失シナリオ登録簿（FAIR 形式） | 01_governance/loss-scenarios.md | S-01〜S-13 の初期案を「脅威コミュニティ×手法×資産×影響」で記述し、上位 10 件前後に LEF×LM の校正済み推定枠を置く。各 S-xx から T-xxx・統制・KRI を参照する。 | R-003／経営が順位付けできる損失シナリオを確定 | 3 | B | E2（上位シナリオは E1） |
| DL-03 | 資産・データ分類台帳 | 02_requirements/data-classification.md | 保護対象（資産・データ・業務）とデータ分類（個人情報、要配慮、決済、顧客機密、認証秘密、監査記録）を定義する。分類ごとに所在地・保持・PEP 外持出し可否の既定値を置く。 | R-001, R-004／保護対象の範囲と分類を確定 | 3 | B | E2 |
| DL-04 | ガバナンス規程・RACI | 01_governance/raci-governance.md | CISO＝リスク提示、CTO＝実現性・費用・可用性、事業責任者＝残余リスク受容の分担と、決裁権・予算・人員・独立監査経路を RACI で定める。故意・虚偽・重大な管理不履行と合理的統制後の残余リスクを区別する説明責任条項を置く。停止権限は DL-46 に分離。 | R-007, R-014, R-015, R-019, R-020, R-054／責任と対になる権限を明文化 | 3 | B | E1 |
| DL-05 | 例外・リスク受容手順と受容票様式 | 01_governance/exception-risk-acceptance.md | 例外申請→第2線レビュー→経営承認の手順と、受容票（期限、補完統制、影響範囲、責任者、失効条件）の様式。セキュリティを劣後させる判断を CEO/取締役会が所有する経路と CISO 単独承認の禁止を定める。 | R-007, R-016, R-021, R-075, R-086／残余リスク受容を記録可能にする | 3 | B | E9 |
| DL-06 | KRI 定義・四半期報告様式 | 01_governance/kri.md | K-xx として KRI（例: PEP 未網羅 entry point 数、最長鍵年齢、stale allow 継続時間、未解決 Critical/High 数、属人化指標）を閾値「TBD＋所有者＋期限」で定義する。取締役会向け四半期報告の様式を付す。 | R-006, R-181／リスク状態を継続報告する | 3 | B | E2 |
| DL-07 | 独立保証計画 | 09_assurance/independent-assurance-plan.md | 評価者の独立性要件（報告系統の分離、利益相反申告）、範囲（設計・コード・IaC・policy・鍵管理・CI/CD・runbook）、Gate 2/4/5 での関与時期と立会い範囲を定める。DEC-5 の決裁対象。 | R-018, R-067, R-068／独立保証を gate 化する | 3 | B・D | E1/E2 |
| DL-08 | ID ライフサイクル仕様（状態機械） | 02_requirements/identity-lifecycle.md | 登録、本人確認、招待、所属変更、IdP 発見、account linking、回復、認証器変更、SCIM 同期、退職・削除を主体類型別の状態機械で定義する。各遷移に保証要件・監査イベント・失敗時挙動を付す。主体カタログは DL-48 に分離。 | R-028, R-032〜R-045, R-047, R-048／認証ライフサイクル全イベントの統制 | 3 | A・C・D | E2＋E4 |
| DL-09 | 操作リスク階層×保証レベル割当表 | 02_requirements/operation-risk-tiers-assurance.md | 操作 5 分類（public/read-sensitive/write/privileged/break-glass）を定義し、業務操作ごとに IAL/AAL/FAL、step-up、SoD、最大 session、再認証、回復、監査、データ分類を割り当てる。フィッシング耐性を要する範囲を決裁案として示す。 | R-027, R-030, R-031, R-079／操作単位の保証要件を確定 | 3 | A・B | E2＋E9 |
| DL-10 | DFD・entry point inventory | 03_threat-model/dfd-entry-points.md | HTTP/gRPC/GraphQL/webhook/queue/batch/管理面/export/support tool/ETL/DB 直/緊急経路を含む DFD と trust boundary を示す。手作業棚卸しと IDL 静的抽出・実行時トレース突合の差分管理手順（自動発見との差分 0 件を受入条件）を定める。 | R-058, R-164／全入口の把握 | 3 | A・C | E2＋E4 |
| DL-11 | 脅威カタログ・残余リスク記録 | 03_threat-model/threat-catalog.md | T-xxx ごとに攻撃者類型（ATK-xx）、予防・検知・封じ込め・復旧・証拠、残余リスクと受容理由を記載する。顧客管理者・SAML/OIDC 設定の攻撃面と、具体脅威 10 件（recovery bypass、IdP mix-up、JWKS 差替え、tenant confusion、BOLA、stale allow 等）を含める。 | R-002, R-023, R-135, R-167, R-168／脅威ごとの統制と残余リスクを記録 | 3 | A・D | E2（外部レビューで補強） |
| DL-12 | ADR 集（索引・様式＋個別 ADR） | 05_adr/README.md ＋ 05_adr/ADR-001〜ADR-029（§5） | ADR 索引、様式（文脈、選択肢、却下案と理由、決定、帰結、可逆性、再検討トリガー、証拠）、状態一覧を置く。不可逆決定（DEC-3 対象）を区別する。1 DL に 30 ファイルを対応させる例外。 | R-094〜R-103, R-203, R-204／Gate 3 の設計判断を分離記録 | 3 | A・B・C | E2 |
| DL-13 | 製品選定評価・出口戦略 | 04_architecture/product-evaluation-exit.md | build/buy/managed 比較と 13 評価軸（整合性、最大深度、tail latency、障害モード、multi-region、復旧、要員、ライセンス、価格変動、データ移出、schema portability、CVE 対応、LTS）の評価表。データ移出の演習計画と、特定製品・クラウド・少数専門家への依存回避策を含める。製品の最終選定は行わない。 | R-088, R-090, R-091, R-093, R-208／比較可能な選定根拠と撤退可能性 | 3 | A・C | E2＋E5 |
| DL-14 | root of trust・鍵管理設計と鍵 ceremony 手順 | 04_architecture/root-of-trust.md | 鍵階層（offline root→issuer 署名鍵、用途別・cell 別分離）、生成・保管・rotation・失効・DR、二者統制、対象範囲（AS/PAP/CI-CD/KMS/HSM/JWKS）を定める。第三者立会い付き鍵 ceremony 手順を付録に置く（設計と手順を同一ファイルに統合）。 | R-049〜R-056／全テナントに波及する信頼の起点を統制 | 3 | A・B・C・D | E2＋E8 |
| DL-15 | PEP 契約・coverage・storage guardrail 検証仕様 | 04_architecture/pep-contract.md | PEP が満たす契約（deny-by-default、resource-derived tenant 照合、decision_id 付与、監査送出）を定める。coverage の機械検証（静的ルール、実行時 decision_id 検査、CI 継続実行）、bypass test、DB RLS・object storage 側 tenant guardrail を同一ファイルで扱う。 | R-059〜R-062／認可を通らない経路を機械的に検出 | 3 | C・D | E4 |
| DL-16 | OAuth/OIDC セキュリティ profile（token profile） | 04_architecture/token-profile.md | RFC 9700 の要求ごとの準拠表（採否・逸脱理由）、token 種別ごとの JWT 検証規則（alg allowlist、typ、iss、aud、時刻、鍵-issuer 結合、種別間の相互排他）、opaque/JWT 境界を定める。DPoP の限界と BFF・CSP・短命化・鍵保護の併用を示し、FAPI 2.0 採否は ADR-020 と連動させる。 | R-046, R-158〜R-163／標準準拠を検証可能な profile にする | 3 | A・B・C・D | E2＋E7 |
| DL-17 | 認可モデル・整合性・剥奪仕様 | 04_architecture/authorization-model.md | typed ReBAC＋限定 ABAC の型・deny semantics・conflict resolution（認可モデル本体を同一ファイルに統合）と、操作単位の consistency mode、剥奪→拒否の最大時間、コンテンツ更新と relation 更新の原子的結合、model ID pin・shadow check・段階展開を定める。採用 engine の実保証範囲を明記し、Zanzibar 論文との同等性は主張しない。 | R-142〜R-149, R-205／整合性の保証範囲を操作単位で確定 | 3 | A・C | E2＋E5 |
| DL-18 | PDP topology・cell・blast radius 分析 | 04_architecture/cell-blast-radius.md | cell 単位と global 部品（directory、routing、鍵 root）の最小化、policy store 分割、quota、段階 rollout、緊急 freeze、既知良好版への復帰を定める。単一障害・単一侵害の影響テナント割合を見積もり、事業側が決める blast radius 予算と照合する。 | R-099, R-150〜R-157, R-207／被害を 1 テナント・1 サービス・1 期間に封じ込める論証 | 3 | A・C・D | E2＋E5 |
| DL-19 | 失敗モード表（fail-mode matrix） | 04_architecture/fail-mode-matrix.md | 操作 5 分類（DL-09）×障害種別（PDP timeout、replica 遅延、IdP 停止、KMS 停止、監査 sink 停止、JWKS 取得失敗等）ごとに、キャッシュ最大齢、必要整合性、PDP 不達時挙動、監査不能時挙動、代替経路を定める。高リスクは fresh decision 必須、低リスク read のみ限定 grace とする判断を決裁案で示す。 | R-080〜R-086／一律 fail-closed を操作別の失敗モードへ置換 | 3 | A・B・C | E2＋E9 |
| DL-20 | 数値契約台帳（SLI/SLO） | 07_slo/numeric-contracts.md | 認証・token・認可・剥奪・可用性・監査・変更・インシデントの 8 分類で SLI-xxx を定義し、導出の鎖（事業影響→操作階層→目標値→測定方法→実測値→差分）と状態（仮置き/導出済/実測済/決裁済）を付す。根拠のない数値は置かず「TBD＋所有者＋期限」とする。 | R-077, R-087, R-188〜R-196／任意値を排し BIA と実測で数値を決める | 3→5 | B・C | E1＋E5 |
| DL-21 | BIA（事業影響分析）票 | 01_governance/business-impact-analysis.md | 業務・操作階層ごとの最大許容停止時間、最大許容損失、損失形態（一次/二次）を記入する BIA 票テンプレートと、汎用前提による仮置き例を示す。事業責任者の署名欄を設け、DL-20 への入力とする。 | R-008, R-009, R-196／数値契約の根拠を事業影響から導く | 3 | B | E2（事業責任者署名） |
| DL-22 | 高保証 PoC 試験計画（事前登録） | 12_poc/preregistered-test-plan.md | TC-xxx ごとに仮説、攻撃・障害注入、測定点、合否基準（数値は TBD:BIA 可）、中止基準、生データ保存方式を事前登録する。対象は ID・所属、認可 graph、cross-tenant property test、token 誤用、障害注入、differential/shadow/rollback、特権・監査改ざん。結果は DL-81、コードは DL-82。 | R-032, R-034〜R-041, R-044, R-050〜R-053, R-071, R-078, R-080〜R-083, R-089, R-143〜R-150, R-152, R-154〜R-156, R-168〜R-176, R-205, R-206／攻撃・障害を主目的とする実証計画 | 3 | C | E4/E5 |
| DL-23 | 進化・互換方針（versioning・crypto agility・deprecation） | 04_architecture/evolution-pqc.md | policy/model/schema/token/audit の versioning・後方互換・rollback 方式、version negotiation、schema migration、dual-run、deprecation policy を定める。alg 識別子と複数 alg JWKS、PQC 署名サイズ上限、組織再編・M&A・所在地規制・非人間 ID 増加への互換性を扱う。 | R-104〜R-109, R-209／20 年の計画期間に置換・移行できる構造 | 3 | A・B・C | E2＋E4 |
| DL-24 | 侵害別 runbook・演習計画 | 08_operations/compromise-runbooks.md | RB-xx を侵害対象別（token、署名鍵、IdP、PDP、監査基盤、CI/CD、support 経路）に定め、kill switch、全 session 失効、鍵切替、PDP 隔離、証拠保全、顧客通知判断を含める。鍵・IdP・PDP 侵害、schema migration、vendor exit の演習計画と記録様式を同一ファイルに置く。 | R-057, R-110〜R-117, R-184〜R-186, R-210／侵害時の止め方と復旧を演習で示せるようにする | 3 | A・B・C | E8 |
| DL-25 | 監査ログ設計・PIA | 04_architecture/audit-privacy.md | 監査の目的、最小化、保持、保存地域、アクセス統制、WORM、削除、コスト、SIEM 障害時挙動を定める。記録率・欠損検知・backpressure・監査経路停止時挙動、trace sampling に依存しない独立経路、WORM と削除権の調停（仮名化、crypto-shredding）を含め、PIA を同一ファイルに付す。 | R-102, R-118〜R-128／説明責任とプライバシーの両立 | 3 | A・B・C | E2＋E5 |
| DL-26 | 顧客管理機能設計・責任分界条項案 | 02_requirements/customer-admin-responsibility.md | federation onboarding/offboarding、domain verification と失効時再検証、SCIM、delegated admin、顧客向け監査 API を設計する。顧客 IdP 侵害時の責任境界を契約条項案として示す（採否は法務決定）。 | R-013, R-129〜R-134／B2B の主要攻撃面である顧客管理機能の統制 | 3 | A・B・C | E2＋E4 |
| DL-27 | 運用・要員モデル | 08_operations/operating-model.md | platform/domain/security/SRE の責任分界、24/365 on-call、教育、bus factor、変更承認、必要 FTE と採用計画をライン長確約欄付きで示す。要員を確保できない場合のゲート条件（Plan B 移行）を定める。 | R-092, R-136〜R-141／組織・人の課題を組織決定で閉じる | 3 | B | E1（予算・人員承認） |
| DL-28 | 統制マッピング台帳 | 06_controls/control-mapping-ledger.md | seed-01 §4 の 17 列構造で R-ID→C-xxx→外部枠組み（CSF 2.0、ISO/IEC 27001、SP 800-63-4、ASVS 5.0、API Top 10、CCM、SSDF、SLSA、日本の枠組み）→試験→証跡を多対多で結ぶ。孤児要求・孤児統制・統制なしの「適用」要件を各 0 件とする健全性ルールを持つ。 | R-025, R-026, R-165／単一統制台帳での証跡所有者割当 | 3 | A | E3 |
| DL-29 | 引用監査（引用トレーサビリティ索引・全引用検証ログ） | traceability/citation-audit-proposal.md, traceability/citation-audit-review.md | 旧提案書・レビュー・本リポジトリ全文書の引用を、主張と参照箇所の一致、一次/二次の別、版・状態・確認日で照合し、不一致と差替先を記録する。D29 のうち「改訂提案書」本体は 00_decision 一式と DL-54 が担う（分割）。 | R-197〜R-202／引用と主張の一致を第三者が検証できる状態にする | 2→4 | A | E3（全引用検証ログ） |
| DL-30 | 独立評価 RFP/SOW 群 | 09_assurance/rfp-sow.md | 外部アーキテクチャレビュー、cross-tenant pentest、red team、クラウド設定レビュー、供給網レビュー、OIDF 認定の RFP/SOW を作る。独立性要件、利益相反申告、範囲、手法（ASVS L3、OIDF suite、API Top 10）、成果物形式（E6）、再試験条件を定める。 | R-042, R-046, R-060, R-063〜R-066, R-069, R-070, R-072, R-073, R-157／第三者でしか閉じない要求の調達準備 | 3 | D | E2（評価結果は E6/E7） |
| DL-31 | 段階導入計画 | 08_operations/phased-rollout.md | 新旧認可の dual-run と差分記録（allow 拡大差分は即時調査、deny 差分は業務影響確認）、導入順序（read-only→低リスク tenant→限定 resource type→cell 単位）、各段階の自動 rollback 条件を定める。顧客側作業（SAML/OIDC 再設定、再同意、passkey 再登録）を移行コストに含める。 | R-177〜R-180／本番導入時の差分管理と rollback | 3 | B・C | E2＋E5 |
| DL-32 | 継続保証計画 | 09_assurance/continuous-assurance-plan.md | 本番後の四半期 KRI、年次独立評価、定期 red team、侵害・schema migration・vendor exit 演習の周期と、脆弱性根本原因の開発への反映（SSDF RV.3）を定める。3〜5 年ごとの継続/置換再決裁と接続する。 | R-181〜R-187／運用の有効性を継続的に示す | 3 | B・C・D | E1/E2 |
| DL-33 | TCO・vendor support・LTS 評価 | 08_operations/tco-vendor-lts.md | 構築・運用・要員・監査保管・第三者評価・移行・撤退の費用を幅で示し、vendor support・LTS・価格変動リスクを評価する。全サービス同時 SLA 違反・全顧客一斉通知時の財務影響試算を含める。 | R-141／費用と供給者依存を決裁可能にする | 3 | B | E2（財務レビュー） |
| DL-34 | 法域・規制・契約適用性判定表 | 06_controls/applicability.md | 日本・EU/英国・米国・業界規制（金融・医療・決済）の枠組み・法令ごとに適用/非適用（理由）/条件付きを判定する。保持・所在地・削除・法定報告の要件を DL-25・DL-24 へ渡す。 | R-010, R-013, R-024, R-114, R-120, R-121, R-124／全部取るのでなく適用可能性を決める | 3 | B | E2（法務署名） |

seed-01 の D との対応で 1 成果物＝1 ファイルの原則から外れるものは次のとおり [D]。

| 種別 | 対象 | 内容 |
|---|---|---|
| 分割 | D04 → DL-04＋DL-46 | 停止権限・凍結規程を独立ファイルにした（Gate 0 成果物として単独で決裁対象になるため） |
| 分割 | D08 → DL-08＋DL-48 | 主体カタログを独立ファイルにした（ADR-002・ADR-017 から直接参照されるため） |
| 分割 | D22 → DL-22＋DL-81＋DL-82 | 事前登録計画・実測レポート・コードを分けた（事前登録の凍結と実測を時点で分離するため） |
| 分割 | D29 → DL-29＋00_decision 一式＋DL-54 | 引用監査は traceability、改訂提案書本体は決裁パッケージと参照アーキテクチャ v2 が担う |
| 統合 | D14 | root of trust 設計と鍵 ceremony 手順を同一ファイル |
| 統合 | D15 | PEP 契約と coverage・guardrail 検証仕様を同一ファイル |
| 統合 | D17 | 認可モデル本体と整合性・剥奪仕様を同一ファイル |
| 統合 | D24 | runbook と演習計画・記録様式を同一ファイル |
| 統合 | D25 | 監査ログ設計と PIA を同一ファイル |
| 1 対多 | D12 | ADR 集は 05_adr/README.md と ADR 29 件（§5） |

## 4. 追加成果物（DL-35〜DL-121）

### 4.1 リポジトリ全体・決裁パッケージ（00_decision）

| DL-ID | 成果物名 | ファイルパス | 内容の要点 | 主な対応要求（seed-01 R-ID／目的） | 作成Phase | 区分 | 証拠種別 |
|---|---|---|---|---|---|---|---|
| DL-35 | リポジトリ案内 | README.md | 再提案プログラムの目的、ディレクトリ構成、読む順番（決裁者・技術者・連携開発者別）、各文書の状態一覧を示す。AI エージェント使用の開示と原典照合ログの所在を明記する。 | R-197〜R-199／seed-03 D4／出所と状態をたどれるようにする | 1→6 | A | E2 |
| DL-36 | 決裁パッケージ表紙 | 00_decision/00-cover.md | 決裁事項 1 行、決裁期限、承認者、版、前版（旧提案書）との差分要約、付属資料 A〜L の索引（§7）を置く。 | R-202／決裁対象を一目で特定する | 3→6 | B | E2（承認後 E1） |
| DL-37 | エグゼクティブ 1 枚 | 00_decision/01-executive-summary.md | 現状、前回からの変化、DEC-1〜DEC-9、今回求めない事項、費用・期間・要員、残余リスク上位 5 件と受容者、次ゲート日付と中止基準、代替案比較の要約を 1 枚に収める。全文に主張タグを付す。 | R-022, R-202／seed-03 §4-2／決裁者が 1 枚で判断できる | 3→6 | B | E1（決裁時） |
| DL-38 | 前回指摘対照表 | 00_decision/02-prior-findings-crosswalk.md | レビュー指摘ごとに原文引用と位置、R-ID、閉じ方区分（A/B/C/D・繰延べ）、証拠参照、検証者（作成者以外）、状態を対照する。繰延べ件数と未解決件数を開示する。 | R-001〜R-210 全件／seed-03 A2・A4／指摘を黙って落とさない | 3→6 | A・B | E3 |
| DL-39 | 決裁事項詳細（DEC-1〜DEC-9） | 00_decision/03-decision-items.md | DEC ごとに選択肢、推奨、帰結、可逆性、承認者、見直し日、決議文案を示す。今回求めない事項（本番化、全社標準化、移行強制、対外安全性表明、製品最終選定）を明記する。DEC の正式定義の場所。 | R-005, R-018, R-022, R-075, R-202／決定の連鎖を閉じる | 3→6 | B | E1 |
| DL-40 | プログラム憲章・スコープ・非目標 | 00_decision/04-program-charter.md | 目的、対象範囲（顧客向け ID・社員 ID・workload ID のどこまでか）、パイロット候補サービスと参加確約、非目標を定め、20 年耐久性憲章（DL-47）を参照する。DEC-2 の決裁対象。 | R-022, R-202／seed-03 §3 D2・C3／何をやり何をやらないかを確定 | 3 | B | E1/E2 |
| DL-41 | 残余リスク台帳 | 00_decision/05-residual-risk-register.md | S-xx・T-xxx から集約した残余リスクごとに受容者、期限、補完統制、失効条件、受容票 ID を記録し、上位 5 件を DL-37 へ渡す。PoC 期間限定の受容（DEC-6）を含める。 | R-007, R-023, R-075／全残余リスクに受容者と期限を付ける | 3→6 | B | E9 |
| DL-42 | ゲート計画と Plan B | 00_decision/06-gate-plan-and-plan-b.md | Gate 0〜6 と継続ゲートの承認者、合格基準、中止・方針転換基準、予算と期間上限を定め、旧提案書 Phase 0〜3 および本プログラム Phase 1〜6 との対応表を付す。Plan B（マネージド IdP＋サービス内認可ライブラリ＋共通契約）を中止時の既定経路として示す。 | R-022, R-074, R-202／seed-03 §3／中止を予定された判断にする | 3→6 | B | E1/E2 |
| DL-43 | 体制と TCO（決裁要約） | 00_decision/07-organization-and-tco.md | DL-04・DL-27・DL-33 から RACI、FTE、採用計画、on-call、TCO 幅を要約し、PoC 期間の予算上限と要員稼働率（DEC-4）を示す。 | R-092, R-141／seed-03 C1／費用と人員の確約を決裁に載せる | 3→6 | B | E1 |
| DL-44 | 代替案比較 | 00_decision/08-alternatives-comparison.md | ①現状維持 ②マネージド IdP＋サービス内認可ライブラリ ③共通契約だけの連邦型 ④本案を、リスク・費用・要員・可逆性・移行コストの同一基準で比較し、どの条件なら代替案が勝つかを明記する。 | R-088, R-208／seed-03 A5／藁人形でない代替案比較 | 3 | A・B | E2 |

### 4.2 統治（01_governance）・要件（02_requirements）・脅威モデル（03_threat-model）

| DL-ID | 成果物名 | ファイルパス | 内容の要点 | 主な対応要求（seed-01 R-ID／目的） | 作成Phase | 区分 | 証拠種別 |
|---|---|---|---|---|---|---|---|
| DL-45 | 前提台帳 | 01_governance/assumptions-register.md | A-xxx ごとに仮定内容、暫定値、責任者、検証ゲート、外れた場合の影響、差替え手順を記録する。CONVENTIONS §7 の主要前提（規模、利用者、テナント、依存サービス、法域、リージョン、データ、計画期間）を初期登録する。 | B/C 区分の全要求の前提／seed-03 §6（仮定タグ規則）／仮定依存の推論を追跡可能にする | 1→3 | A・B | E2 |
| DL-46 | 停止権限・凍結規程 | 01_governance/stop-authority.md | 本番移行停止、緊急 freeze、kill switch 発動、不可逆標準化の凍結について、権限者、発動条件、解除条件、記録を定める（DL-04 から分離）。Critical/High 未解決時の本番移行停止を含める。 | R-017, R-022, R-074／止める権限の明文化 | 3 | B | E1 |
| DL-47 | 20 年耐久性憲章 | 01_governance/durability-charter-20y.md | 「20 年戦える」を、置換可能性、識別子の永続性、暗号の俊敏性、撤退可能性、障害の封じ込め、統治の継続性、劣化の自動検知の 7 性質と、それぞれの証拠・継続指標で再定義する。約束しないもの（特定製品の 20 年使用、費用一定、事故ゼロ）とサンセット条項（3〜5 年ごとの再決裁）を明記する。 | R-104, R-208, R-209／seed-03 §2・D2／20 年の約束を検証可能な性質へ置換 | 3 | B | E1/E2 |
| DL-48 | 主体カタログ | 02_requirements/principal-catalog.md | 主体 8 類型（ユーザー、人事 ID、顧客管理者、support、service account、workload、外部 integration、agent/AI）ごとに識別子、発行者、認証方式、委任可否、ライフサイクル所有者を定義する（DL-08 から分離）。 | R-029／主体の網羅 | 3 | A | E2 |
| DL-49 | テナントライフサイクル | 02_requirements/tenant-lifecycle.md | テナントの作成、停止、統合、分割、cell 間移動、解約時エクスポートと削除を状態遷移で定め、各遷移での識別子・鍵・tuple・監査記録の扱いを示す。 | R-011, R-150／seed-03 §7-12／テナント境界が変わる操作の統制 | 3 | A・C | E2＋E4 |
| DL-50 | As-Is 棚卸し（様式と仮置き） | 02_requirements/as-is-inventory.md | 現行の認証方式、ユーザーストア、顧客側 federation 設定、セッション、認可実装、入口の棚卸し様式と、汎用前提による仮置き値を示す。実データでの棚卸しは未達として DL-110 に載せる。 | R-058, R-177／seed-03 C4・§7-2／移行コストと新旧差分の基準点 | 3 | A・C | E2＋E4 |
| DL-51 | 攻撃者モデル | 03_threat-model/attacker-model.md | ATK-01〜ATK-12（外部攻撃者、悪意あるテナント管理者、侵害された一般ユーザー、侵害された顧客 IdP、盗まれた token、侵害された microservice、CI/CD 侵害、クラウド管理者、内部 support、policy author、DB read 権限者、リージョン障害）の能力・前提・目的を定義する。FAPI 2.0 Attacker Model との対応を示す。 | R-002, R-166／脅威の主体を確定 | 3 | A | E2 |
| DL-52 | 不正・濫用対策 | 03_threat-model/fraud-abuse-controls.md | 正規の資格情報による濫用（大量 export、招待スパム、回復濫用、第三者 grant の過剰権限、break-glass 濫用）を抑止・検知する統制と検知指標を定める。 | R-012, R-042, R-176／seed-02 §10／脆弱性ではない濫用経路の統制 | 3 | A・C | E2＋E4 |
| DL-53 | 実事故ケースブック | 03_threat-model/incident-casebook.md | 侵害事故と可用性事故を、当事者・公的機関の一次報告（[I]）に基づき「破られた前提→対応要件→統制→検証/KRI」に写像する。数値・経緯は RS-09・RS-12 で一次報告と照合済みのものだけを使う。 | R-002, R-003, R-166／seed-02 §10・seed-03 B4・D1／損失シナリオに失敗事例の一次報告を与える | 3 | A | E2（[I] 一次報告） |

### 4.3 アーキテクチャ（04_architecture）・保証（09_assurance）

| DL-ID | 成果物名 | ファイルパス | 内容の要点 | 主な対応要求（seed-01 R-ID／目的） | 作成Phase | 区分 | 証拠種別 |
|---|---|---|---|---|---|---|---|
| DL-54 | 参照アーキテクチャ v2 | 04_architecture/reference-architecture-v2.md | 旧提案書の参照アーキテクチャを、control/decision plane 分離、cell、PEP 契約、token profile、root of trust、監査独立経路を統合した改訂版として示す。中核トポロジーの未決定箇所を ADR 参照で明示し、各構成要素に担当 ADR・DL を付す。 | R-200, R-201, R-205, R-206／seed-03 §7-1・§7-17／改訂提案の技術本体 | 3 | A | E2 |
| DL-55 | workload ID・委任 | 04_architecture/workload-identity-delegation.md | workload identity 方式、service 別 aud、token exchange、act チェーン上限、resource indicator、trust domain 越え委任を定める。非同期・長時間ジョブの委任と AI エージェントの委任を含める。 | R-100, R-206／seed-02 §4・§9-5、seed-03 §7-7／confused deputy と横流しの防止 | 3 | A・C | E2＋E5 |
| DL-56 | 失効・継続評価 | 04_architecture/revocation-continuous-evaluation.md | 権限剥奪、テナント停止、session 失効、鍵失効の伝播経路（introspection、短命化、SSF/CAEP/RISC、ストリーム接続・非 HTTP・ネイティブ/CLI・AI エージェント）を定める。剥奪 SLO を構成要素ごとの遅延予算へ分解する。 | R-112, R-143, R-146, R-191／seed-02 2-6、seed-03 §7-10／剥奪の端から端までの最大時間を示せるようにする | 3 | A・C | E2＋E5 |
| DL-57 | PEP 外データの統制 | 04_architecture/data-outside-pep.md | 検索インデックス、DWH、ML、エクスポート、バックアップ、ログなど PEP を経由しないデータ経路について、持出し条件、ACL 反映、テナント分離、削除伝播、監査を定める。 | R-058, R-061／seed-03 §7-9／PEP の外での漏えい経路を塞ぐ | 3 | A・C | E2＋E4 |
| DL-58 | 容量モデル | 04_architecture/capacity-model.md | 前提台帳の規模（利用者 100 万、テナント約 1 万、約 300 サービス）から、認証 QPS、Check QPS、tuple 数、graph 深度・fanout、監査イベント量と保管量、鍵操作 QPS を導出する。PoC 負荷条件と TCO の入力にする。 | R-125, R-190, R-192／seed-02 §5-2・§8-5・§11-4／性能・費用主張の前提を明示 | 3→5 | A・C | E5 |
| DL-59 | pentest・red team 計画 | 09_assurance/pentest-redteam-plan.md | cross-tenant pentest と、ソーシャルエンジニアリングを含む red team の範囲、攻撃シナリオ（ATK-xx 対応）、交戦規則、成果物、再試験条件を定める。Critical/High closure の証跡（E6＋E11）の扱いを含める。 | R-042, R-060, R-065, R-066, R-076／独立攻撃試験の設計 | 3 | D | E6（計画時は E2）、E11 |
| DL-60 | OIDF conformance 計画 | 09_assurance/oidf-conformance-plan.md | OAuth/OIDC/FAPI 2.0 の conformance suite 自前実行計画（対象 profile、構成、合否、ログ保存）と、認定取得の条件・時期を定める。 | R-046, R-064, R-160／適合性の機械検証 | 3 | C・D | E7 |
| DL-61 | 自己評価（ASVS 5.0・API Top 10・SLSA 1.2） | 09_assurance/self-assessments.md | ASVS 5.0 L2/L3、OWASP API Top 10 負例試験、SLSA 1.2 供給網の自己評価計画と結果記録様式を定め、第三者評価（DL-30）の前提とする。自己評価であることを明記する。 | R-070, R-071, R-073, R-165／第三者評価前の自己評価 | 3 | C・D | E4／E2 |

### 4.4 連携ハンドブック（10_integration）

| DL-ID | 成果物名 | ファイルパス | 内容の要点 | 主な対応要求（seed-01 R-ID／目的） | 作成Phase | 区分 | 証拠種別 |
|---|---|---|---|---|---|---|---|
| DL-62 | 連携ハンドブック総覧 | 10_integration/README.md | 連携開発者（約 20〜30 チーム・ベンダー）向けに、各文書の読む順番、依存してよい契約（11_contracts）と依存してはならない実装、問合せ・例外申請経路を示す。 | R-136, R-140／seed-03 C3・§2（置換可能性）／使う側が自律的に正しく連携できる | 3 | A | E2 |
| DL-63 | 依存階層 | 10_integration/dependency-tiers.md | サービスを依存階層（Tier）に分類し、各 Tier が基盤に依存してよい範囲、静的安定性要件、障害時の挙動を定める。「この基盤に依存してはならないもの」（復旧ツール、break-glass、障害時連絡手段）を列挙する。 | R-207, R-210／seed-03 D1／相関障害と循環依存の回避 | 3 | A・B | E2 |
| DL-64 | 連携パターン集 | 10_integration/integration-patterns.md | P-xx（§6 の初期割当）ごとに適用条件、token・委任・PEP 配置、失敗モード、監査イベント、契約試験、アンチパターンを示す。 | R-059, R-100, R-163, R-206／seed-03 §7-6〜§7-10／典型連携を誤りにくい既定形にする | 3 | A・C | E2＋E4 |
| DL-65 | 認可モデリングガイド | 10_integration/authz-modeling-guide.md | 業務ドメインの resource type・relation・permission の設計手順、命名・名前空間規約、巨大ロール表を避ける指針、越境共有・一覧検索の表現、モデル変更のレビューと shadow 手順を示す。 | R-098, R-147, R-148, R-205／中央スキーマ審査のボトルネックと誤モデル化の防止 | 3 | A | E2 |
| DL-66 | オンボーディング手順 | 10_integration/onboarding.md | サービスが基盤へ参加する手順（登録、workload ID 発行、モデル登録、PEP 組込み、契約試験合格、shadow 期間、本番切替）と、各段階の承認者・所要期間・費用配賦を示す。 | R-140, R-179／seed-03 C3・§7-15／参加コストと手順の見える化 | 3 | A・B | E2 |
| DL-67 | Definition of Ready | 10_integration/definition-of-ready.md | 連携開始前に満たす条件（操作階層の割当、DFD 登録、モデル草案、契約試験キット導入、監査イベント定義、責任者指名）をチェックリスト化し、未充足時の扱いを定める。 | R-058, R-059, R-164／連携の前提漏れ防止 | 3 | A・B | E2 |
| DL-68 | 開発者 FAQ | 10_integration/developer-faq.md | token の扱い、テナント context、キャッシュ可否、非同期処理、エラー時挙動、ローカル開発とモックの使い方等の問いと答えを、根拠文書への参照付きで示す。 | R-138／seed-03 §7-15／教育と問合せ負荷の低減 | 3 | A | E2 |

### 4.5 連携契約（11_contracts）

| DL-ID | 成果物名 | ファイルパス | 内容の要点 | 主な対応要求（seed-01 R-ID／目的） | 作成Phase | 区分 | 証拠種別 |
|---|---|---|---|---|---|---|---|
| DL-69 | 契約一覧・規約 | 11_contracts/README.md | 11_contracts の全契約の一覧、版、状態、準拠標準と準拠範囲、命名・版付け規約、変更提案手順を示す。 | R-109／seed-03 §2（置換可能性）／契約を単一の入口から辿れるようにする | 3 | A | E2 |
| DL-70 | 互換性・非推奨ポリシー（SLA） | 11_contracts/compatibility-deprecation-policy.md | 契約ごとの互換性区分（後方互換/破壊的）、版の併存期間、非推奨告知から廃止までの最短期間、未移行 consumer の扱い、例外承認を SLA として定める。 | R-105, R-108, R-109, R-194／利用側を壊さない変更規律 | 3 | A・B | E2 |
| DL-71 | 共通スキーマ | 11_contracts/schemas/common.schema.json | 主体・テナント・リソース識別子、tenant context、decision_id、エラー形式、版情報など全契約が共有する定義（ADR-021 の識別子戦略に従う）。 | R-109, R-161／seed-03 §2（識別子の永続性）／契約間の識別子不整合の防止 | 3 | A・C | E4 |
| DL-72 | Authorization API（AuthZEN 準拠） | 11_contracts/authorization-api.openapi.yaml | AuthZEN Authorization API に準拠した evaluation、batch evaluation、search（subject/resource/action）の profile と、decision_id・model/policy revision・consistency 指定の拡張を定義する。準拠版と状態は research/standards-status.md で確認したものを記す。 | R-098, R-144, R-205／seed-02 5-5／PDP 実装を差し替え可能な PEP–PDP 契約 | 3 | A・C | E4 |
| DL-73 | Relationship/Model Registry API | 11_contracts/relationship-model-registry.openapi.yaml | relation tuple の書込み・読取り・削除、consistency token、model 版の登録・pin・shadow・rollback、export/import を定義する。 | R-091, R-145, R-147, R-148／seed-02 5-6／モデル・関係データの変更統制と移出可能性 | 3 | A・C | E4 |
| DL-74 | Token Exchange API | 11_contracts/token-exchange.openapi.yaml | RFC 8693 に基づく token exchange の profile（subject/actor token 種別、audience/resource、act チェーン上限、may_act、エラー）を定義する。 | R-100, R-206／seed-02 2-5／委任と宛先限定の契約化 | 3 | A・C | E4 |
| DL-75 | Access token claims スキーマ | 11_contracts/schemas/access-token-claims.schema.json | RFC 9068 系 access token の claim セット（iss、sub、aud、tid、client_id、scope、cnf、act、auth_time、acr、版）と種別ごとの typ を定義する。 | R-161, R-162／token profile の機械検証 | 3 | A・C | E4 |
| DL-76 | SCIM API profile | 11_contracts/scim.openapi.yaml | SCIM 2.0（RFC 7643/7644）の User/Group と拡張属性、テナントスコープ、JIT との衝突解決、deprovision の扱いを定義する。 | R-040, R-132／seed-02 1-7／プロビジョニング契約 | 3 | A・C | E4 |
| DL-77 | 監査イベントスキーマ | 11_contracts/schemas/audit-event.schema.json | decision event・管理操作 event・認証 event の共通フィールド（decision_id、trace_id、actor chain、resource、policy/model revision、理由、テナント、データ分類）と最小化方針を定義する。 | R-118, R-119, R-127／seed-02 8-1／監査証跡の形式統一 | 3 | A・C | E4 |
| DL-78 | SSF/CAEP stream API profile | 11_contracts/ssf-caep.openapi.yaml | SSF の stream 構成、push/poll 配送、検証エンドポイントについて、本基盤が送受信する範囲の profile を定義する。 | R-112, R-143／seed-02 2-6／失効・継続評価の伝播契約 | 3 | A・C | E4 |
| DL-79 | SSF/CAEP イベント（SET）スキーマ | 11_contracts/schemas/ssf-caep-set.schema.json | session 失効、資格情報変更、token claims 変更等の CAEP/RISC イベントの SET payload profile と、受信義務の範囲を定義する。 | R-112, R-191／seed-02 2-6／失効イベントの機械検証 | 3 | A・C | E4 |
| DL-80 | モック・契約試験キット仕様 | 11_contracts/mock-contract-test-kit.md | 各契約のモックサーバ、consumer-driven contract test、負例ベクタ（cross-tenant、alg 混同、aud 誤り等）、CI 組込み手順、合格判定を定める。 | R-062, R-071, R-172／連携側が契約適合を自動検証できるようにする | 3 | C | E4 |
| DL-117 | ライフサイクルイベント契約（AsyncAPI） | 11_contracts/lifecycle-events.asyncapi.yaml | 依存サービスへ送るテナント・利用者のライフサイクル事象と大規模な権限剥奪の一覧、配送の保証（at-least-once、冪等キー、順序キー、再送、dead letter、replay）、受信側の義務、完了報告、SSF/CAEP との分担、凍結区分を定める。2026-10-15 の模擬パネル（自己レビュー）ラウンド 1 の指摘への是正として先に作成され、ラウンド 2 で本行を追加した（CON-00 §4.1 N-2 の順序を守れなかった。末尾「レビュー記録」）。 | R-044, R-109／G-137, G-118, G-138／DL-49 §7・DL-08 §16.3 の義務を契約にする | 5 | A・C | E4 |
| DL-118 | ライフサイクル事象スキーマ | 11_contracts/schemas/lifecycle-event.schema.json | DL-117 の事象の封筒（CloudEvents 1.0.2）と type ごとの data、完了報告・replay 要求の形、正例・負例を JSON Schema 2020-12 で定義する。事象の一覧・配送の保証・受信側の義務の正本は DL-117。追加の経緯は DL-117 と同じ。 | R-044, R-109／G-137, G-118, G-138／事象の機械検証 | 5 | A・C | E4 |
| DL-119 | Client Registration API | 11_contracts/client-registration.openapi.yaml | sandbox の RFC 7591/7592 profile によるセルフ登録（preview）と、本番の承認付き登録申請 API（preview）を定義し、ARC-02 §6 の client 種別ごとの必須項目・禁止項目（GA）を機械可読にする。承認者案、理由コード、負例、モックの振る舞いを含む。2026-10-15 の模擬パネル（自己レビュー）ラウンド 1 の指摘への是正として仮番「CON-13」で先に作成され、ラウンド 2 で CON-14 として本行を追加した（末尾「レビュー記録」）。 | R-158, R-255／G-138（I-01）, G-141(c), G-118, G-119, G-124／client 登録の手段を契約にする | 5 | A・C | E4 |
| DL-121 | ライフサイクル状態の照会 API（CON-15） | 11_contracts/lifecycle-state.openapi.yaml | CON-12（DL-117）の RO-9（W_replay を超えた停止の後の全件突合）と RO-12（破壊的・不可逆な処理の直前の正本照会）で受信側が呼ぶ読取り専用 API を OpenAPI 3.1.2 で定義する。tenant・principal・membership の現在状態、request_id・hold_ref・mapping_ref と事象の照合（verifyLifecycleAction）、撤回の有無、全件突合の一覧（listReconciliationSnapshot）、相互 TLS、理由コード LQ00〜LQ11・LQ20〜LQ24、正例と負例 LQN-01〜LQN-19 を含む。版 0.1.0 は全 operation が preview で、GA への昇格は CON-12 §4.1 Q-5 による。所有者: DL-49 の所有者＋プラットフォームチーム長（CON-12 LC-OI-3）。期限: DEC-8 第 1 段の付議前（CON-12 §4.1）。受入れ基準: (1) CON-12 の拡張 `x-state-query-api` の値を内容を変えずに本ファイルへ切り出し、CON-12 には参照だけを残す（CON-12 §10 H5-1）、(2) 本ファイル単独で Redocly lint・examples の検証・Prism による起動ができた記録（E4。連携開発者が codegen・モック・lint を単独ファイルに直接使えるようにするため）、(3) 作成者以外の独立レビュー。現状: 契約本体は 2026-10-15 に CON-12 版 0.4.0 の拡張 `x-state-query-api` に起草され、ファイルは未作成。CON-00 §2.3 の機械検査（lint・Prism）は、作成者が一時的に切り出したファイルで行ったもので、本ファイルの記録ではない。2026-10-15 の模擬パネル（自己レビュー）ラウンド 6 の指摘への是正として、CON-00 §9 申し送り 14・CON-12 §10 H5-1 の案（DL-121 案）を採番して追加した（末尾「レビュー記録」）[^8][^9]。 | R-044, R-109／G-137, G-118, G-138／RO-9・RO-12 の照会を契約にし、削除経路の実装と単体試験の入出力を書けるようにする | 5 | A・C | E4 |

### 4.6 PoC（12_poc）

| DL-ID | 成果物名 | ファイルパス | 内容の要点 | 主な対応要求（seed-01 R-ID／目的） | 作成Phase | 区分 | 証拠種別 |
|---|---|---|---|---|---|---|---|
| DL-81 | PoC 実測レポート | 12_poc/measurement-report.md | 事前登録（DL-22）に対する TC-xxx ごとの実測値、合否、逸脱、生データ（12_poc/data/）のハッシュと測定条件を報告する。事前登録からの変更は理由付きで開示する。**状態（2026-10-15T04:45Z（UTC）の確認）: draft（POC-02 版 0.1。作成済み、作成者以外の確認は未実施。12_poc/measurement-report.md は git 未追跡）**。版 0.1 は系統 1 の凍結後の実行 50 件（集約ハッシュ `401e8671b4fc7102f14de3342b6089fdc21fa02940d09de37f083e5f5c90e5df`、04:14Z）の区分・判定・逸脱を報告する。全件に立会人がいないため、合否の確定と Gate 4 の証拠には使わない。Gate 4 の実測（系統 2 と系統 1 の再実行）は本 DL の改版で報告する[^13]。**PoC/R7反映（2026-10-15T08:17Z の確認）**: 12_poc/measurement-report.md はコミット d6af03e で git に追跡された（生データは要約とハッシュだけを版管理）。関連ファイルとして独立再現ログ（12_poc/reproduction-log.md、版 0.1、draft。実装者と別の AI エージェントによる同じ機械での再実行で、独立立会人ではない）がある。23 TC の再実行で TC 単位の一致 16・不一致 7、正式な不合格 5 件は凍結時のコードの消失で再現できない（RL-P1）。再現も Gate 4 の証拠ではない[^14]。 | DL-22 と同じ R-ID／seed-03 B2／実測を再現可能な証拠にする | 5 | C | E5（＋E4） |
| DL-82 | PoC コードと再現手順 | 12_poc/code/README.md | PoC 実装の構成、合成データ生成、試験ハーネス、障害注入、実行・再現手順、コミットハッシュとの対応を示す。コード本体は 12_poc/code/ 配下、生データは 12_poc/data/ 配下に置く。 | R-169, R-205, R-206／seed-03 B2／第三者が再実行できる | 3→5 | C | E4／E10 |
| DL-120 | 契約試験キット本体 | 12_poc/code/contract-kit/README.md | CON-11（DL-80）§11.1 の配置（モック MK-01〜MK-08、契約試験ドライバ、負例ベクタ、契約の凍結写し、制御 API の OpenAPI、kit.config.yaml）と §11.2〜§11.4 の起動仕様を実装し、起動・CI 組込みの手順を本体文書に書く。DL-82（PoC 基盤。納品済み）とは別の DL で、DL-82 はキットを含まない。所有者: PEP SDK・開発者支援チーム（案）。期限: G3。受入れ基準: (1) MK-01〜MK-08 の全モックが 1 コマンドで起動した記録（E4）、(2) G-121 の 4 種の負例（deny、timeout、失効、cross-tenant）を再現したログ、(3) CON-11 §10.1 の合否判定を模擬 consumer で 1 回再現した CI ログ（G-122）、(4) sandbox の workload（SVID 登録エントリ）と交換可能な組の登録（CON-14（DL-119）版 0.2.0 §4A の `registerSandboxWorkload`・`deleteSandboxWorkload`・`registerExchangePair`・`decideSandboxExchangePair`・`deleteExchangePair` の 5 operation、preview）が MK-02（STS 役）で動き、登録簿で有効でない組の exchange を STS が拒否すること（CON-14 の負例 CRN-28。ADR-009 D09-13）を再現した記録（E4。CON-11 §4.3・§6.3 の CV-022）[^10][^12]。(4) はラウンド 7 で加えた。P-03 などサービス間同期呼出しで token exchange を使うチームは、登録簿にない exchange を STS が拒否するため（ADR-009 D09-13）、(4) がないと sandbox で exchange の結合試験に進めない [D][^12]。DCS-06（版 0.5）§5.2.2 のキット費目（NA-DCS06-11。G0〜G2 のキットの実装 2〜3 FTE、G3 の保守 1〜2 FTE）は、本書 版 0.3 の DL-120 の定義（MK-01〜MK-08 ほか）を範囲として積まれた（同書 脚注 88）。MK-02 はその範囲に入っているので (4) のモック側の実装は同費目の内数と扱うが、§4A が加わった後の工数がこの幅に収まるかは確認していない。共有 sandbox 上の実際の登録 API（CON-14 §4A.5。所有者 PEP SDK・開発者支援チーム、期限 DEC-8 第 1 段の前）は本 DL ではなく共有 sandbox の構築（同費目の sandbox 0.5〜1 FTE）の側の作業であり、同費目に含まれるかも明記されていない [D][^11]。DCS-06 への注記は下の「レビュー記録」ラウンド 7 の申し送りとした。DEC-8 第 1 段（rc 凍結と告知期間）は G3 でのキット・sandbox 提供を前提とするため、本 DL の受入れが DEC-8 第 1 段の入力になる（DCS-03 の DEC-8 行）。2026-10-15 の模擬パネル（自己レビュー）ラウンド 4 の指摘への是正として、CON-11 版 0.4 の申し送り（§14.2）の案を採番して追加した（末尾「レビュー記録」）[^7]。 | R-062, R-071, R-172／G-121, G-122, G-141(c)／連携側が実基盤なしで負例を再現し、自チームの CI で適合を自己判定できるようにする | 3→5 | C | E4 |

### 4.7 調査（research）

| DL-ID | 成果物名 | ファイルパス | 内容の要点 | 主な対応要求（seed-01 R-ID／目的） | 作成Phase | 区分 | 証拠種別 |
|---|---|---|---|---|---|---|---|
| DL-83 | 調査ノート総覧・調査手法 | research/README.md | RS-01〜RS-16 の範囲・担当・状態、一次資料の採否基準、確認日の記録方法、使用ツール（AI を含む）の開示、主張台帳への登録手順を示す。 | R-197〜R-199／seed-03 D4／調査の出所をたどれるようにする | 2 | A | E2 |
| DL-84 | 標準ステータス台帳 | research/standards-status.md | 参照する標準・規格・法令ごとに版、状態（RFC/Final/draft/ipd/公布済み未施行等）、確認日、原典 URL、次回確認日を記録し、四半期更新する。 | R-026, R-198／seed-02 §12-1／版・状態の変化を追跡する | 2 | A | E3 |
| DL-85 | RS-01 統治・リスク定量化 | research/RS-01-governance-risk.md | CSF 2.0、ISO/IEC 27001・27005、NIST IR 8286 系、FAIR、NACD、経産省ガイドライン、IIA Topical Requirement、SEC 開示規則を一次資料で確認する。 独立検証記録は research/verification/RS-01-verification.md。 | R-005, R-006, R-014, R-019〜R-021／DL-01・DL-02・DL-04・DL-06 へ供給 | 2 | A | E3 |
| DL-86 | RS-02 規制・法域の適用性 | research/RS-02-regulatory-applicability.md | 日本・EU/英国・米国・業界規制（金融・医療・決済）が認証・認可・監査ログ・所在地・本人確認・侵害通知に課す具体要件と適用条件を原文で確認する。 独立検証記録は research/verification/RS-02-verification.md。 | R-010, R-024, R-114, R-120, R-121, R-124／DL-34 へ供給 | 2 | A | E3 |
| DL-87 | RS-03 デジタル ID ライフサイクル | research/RS-03-identity-lifecycle.md | SP 800-63-4（63A/63B/63C）、WebAuthn L3、OIDC Core、OpenID Federation、SCIM、account linking・nOAuth、domain 検証、DS-511 を確認する。 独立検証記録は research/verification/RS-03-verification.md。 | R-027〜R-048／ADR-002〜ADR-004 へ供給 | 2 | A | E3 |
| DL-88 | RS-04 OAuth/OIDC token profile | research/RS-04-oauth-oidc-profile.md | RFC 9700 の MUST/SHOULD 一覧、FAPI 2.0、PAR、DPoP、mTLS、RAR、RFC 9068/8725/8693/7662/9207/9470、Browser-Based Apps、OAuth 2.1、SSF/CAEP/RISC、Token Status List を確認する。 独立検証記録は research/verification/RS-04-verification.md。 | R-158〜R-163, R-112／ADR-005・ADR-006・ADR-020 へ供給 | 2 | A | E3 |
| DL-89 | RS-05 root of trust・鍵管理・供給網 | research/RS-05-root-of-trust-keys-supply-chain.md | SP 800-57/130/152、FIPS 140-3、クラウド KMS/HSM、key ceremony、JWKS rotation、CSRB Storm-0558 報告、CVE-2025-55241、SLSA 1.2、SSDF を確認する。 独立検証記録は research/verification/RS-05-verification.md。 | R-049〜R-057, R-073／ADR-007・ADR-008 へ供給 | 2 | A | E3 |
| DL-90 | RS-06 workload ID・委任・AI エージェント | research/RS-06-workload-identity-delegation-agents.md | SPIFFE/SPIRE、SP 800-207A、WIMSE、Transaction Tokens、ID-JAG、RFC 8693、MCP 認可仕様、エージェント ID 関連文書を確認する。 独立検証記録は research/verification/RS-06-verification.md。 | R-100, R-206, R-209／ADR-009・ADR-017・ADR-026 へ供給 | 2 | A | E3 |
| DL-91 | RS-07 認可エンジンと整合性 | research/RS-07-authz-engines-consistency.md | Zanzibar、OpenFGA、SpiceDB、Cedar/AVP、OPA、AuthZEN 1.0、プロジェクト健全性、公開大規模事例を確認する。 独立検証記録は research/verification/RS-07-verification.md。 | R-093, R-097, R-142〜R-149／ADR-010・ADR-011・ADR-025 へ供給 | 2 | A | E3 |
| DL-92 | RS-08 PEP 完全性とテナント分離 | research/RS-08-pep-completeness-tenant-isolation.md | ASVS 5.0、API Top 10 2023、SP 800-53r5 AC 系、PostgreSQL RLS、SaaS tenant isolation、entry point 自動抽出、ACL 反映検索、データ基盤の行・列制御を確認する。 独立検証記録は research/verification/RS-08-verification.md。 | R-058〜R-062／ADR-012 へ供給 | 2 | A | E3 |
| DL-93 | RS-09 レジリエンス・cell・fail mode | research/RS-09-resilience-cell-failmode.md | cell-based architecture、static stability、shuffle sharding、Google 2020-12・Azure AD 2021-03・Atlassian 2022・CrowdStrike 2024 等の一次報告を確認する。 独立検証記録は research/verification/RS-09-verification.md。 | R-150〜R-157, R-207, R-210／ADR-013・ADR-023 へ供給 | 2 | A | E3 |
| DL-94 | RS-10 監査・プライバシー・所在地 | research/RS-10-audit-privacy-residency.md | OCSF・CADF・OpenTelemetry、WORM、RFC 9162、crypto-shredding、GDPR・個人情報保護法の保持・削除・越境移転、PCI DSS 要件 10 を確認する。 独立検証記録は research/verification/RS-10-verification.md。 | R-118〜R-128／ADR-014 へ供給 | 2 | A | E3 |
| DL-95 | RS-11 20 年の進化・PQC・deprecation | research/RS-11-twenty-year-evolution-pqc.md | FIPS 203/204/205/206、IR 8547、SP 800-131A、RFC 7696、JOSE/COSE PQC、TLS ハイブリッド、CNSA 2.0、標準の寿命の歴史、deprecation policy を確認する。 独立検証記録は research/verification/RS-11-verification.md。 | R-101, R-104〜R-109, R-209／ADR-015・ADR-016 へ供給 | 2 | A | E3 |
| DL-96 | RS-12 実事故ケーススタディ | research/RS-12-incident-casebook.md | Storm-0558、Midnight Blizzard、Okta 2023、Cloudflare 2023、Snowflake 2024、Salesloft Drift 2025、nOAuth、CircleCI、MGM、CVE-2025-55241 等の一次報告を確認する。 独立検証記録は research/verification/RS-12-verification.md。 | R-002, R-003, R-166／DL-53・DL-02 へ供給 | 2 | A | E3 |
| DL-97 | RS-13 不正・濫用対策 | research/RS-13-fraud-abuse.md | ATO、credential stuffing、AiTM、MFA 疲労、ヘルプデスク攻撃、device code、consent phishing、DBSC、bot、ITDR、ATT&CK 該当技術を確認する。 独立検証記録は research/verification/RS-13-verification.md。 | R-031, R-042, R-168／DL-52 へ供給 | 2 | A | E3 |
| DL-98 | RS-14 B2B 顧客向け ID 機能 | research/RS-14-b2b-customer-identity.md | SSO/SCIM オンボーディング、domain 検証、委任管理、顧客監査 API、CSA SSCF、顧客 IdP 侵害時の責任分界、ゲスト・越境共有を確認する。 独立検証記録は research/verification/RS-14-verification.md。 | R-013, R-129〜R-135／DL-26・ADR-024 へ供給 | 2 | A | E3 |
| DL-99 | RS-15 build/buy/managed・TCO・要員 | research/RS-15-build-buy-tco.md | IdP 候補の公式仕様・OIDF 認定・FAPI 2.0 対応・export 可否・料金、TCO 見積り方法、要員モデルを確認する。 独立検証記録は research/verification/RS-15-verification.md。 | R-088〜R-093, R-141, R-208／ADR-001・ADR-018・DL-13・DL-33 へ供給 | 2 | A | E3 |
| DL-100 | RS-16 超大規模並行開発の統治 | research/RS-16-parallel-development-governance.md | OpenAPI 3.1、JSON Schema、AsyncAPI、CloudEvents、consumer-driven contract testing、Sunset/Deprecation header、API 互換性ポリシー、platform engineering を確認する。 独立検証記録は research/verification/RS-16-verification.md。 | R-105, R-108, R-109／ADR-022・DL-62〜DL-80 へ供給 | 2 | A | E3 |
| DL-113 | RS-17 連携パターンと認可モデリングの先行事例 | research/RS-17-integration-patterns-modeling.md | サービス種別ごとの標準連携方式（BFF、ネイティブ、デバイス、M2M、バッチ、イベント、データ基盤、検索、署名 URL、ストリーム、外部アプリ、AI エージェント、管理、レガシー）と、主要 IAM・共有モデルのモデリング方式を確認する。 独立検証記録は research/verification/RS-17-verification.md。 | R-059, R-100, R-205, R-206／DL-64・DL-65・ADR-024〜ADR-026 へ供給 | 2 | A | E3 |

### 4.8 追跡台帳（traceability）

| DL-ID | 成果物名 | ファイルパス | 内容の要点 | 主な対応要求（seed-01 R-ID／目的） | 作成Phase | 区分 | 証拠種別 |
|---|---|---|---|---|---|---|---|
| DL-101 | 原子要求一覧 | traceability/R-requirements.md | レビュー指摘を R-001〜R-210 に原子化した正式版（出典位置、閉じ方、対応 DL、机上準備）。seed-01 §2 を検証・確定し、解釈の相違は DL-106 へ記録する。 | R-001〜R-210／指摘の網羅 | 1 | A | E3 |
| DL-102 | ゴール受入基準 | traceability/G-goal-criteria.md | G-xxx として再提案プログラムの受入基準（seed-01 §6 の 15 項、seed-03 §6 の提出前完了定義を含む）と、判定方法・判定者を定める。 | R-197〜R-202／完了の定義 | 1 | A | E3 |
| DL-103 | 成果物計画（本書） | traceability/deliverables.md | DL-ID・ファイルパス・文書ID・Phase・区分・証拠種別の割当と、ディレクトリごとのファイル一覧。 | R-025／成果物の網羅と並行作業の衝突回避 | 1 | A | E2 |
| DL-104 | R/G 追跡表 | traceability/traceability-matrix.md | R-ID→G-ID→DL→C-xxx→TC/RB→証跡（E 種別・所在）の双方向追跡表。孤児 R・孤児 DL を 0 件にする。 | R-025, R-197／seed-01 §6-6／双方向トレーサビリティ | 3→4 | A | E3 |
| DL-105 | 主張台帳 | traceability/claims-ledger.md | CL-xxxx ごとに主張文、タグ、出典、該当箇所と抜粋、版、取得日、スナップショットハッシュ、前提 CL/A、検証者、判定（支持/部分支持/不支持/矛盾）を記録する。 | R-197, R-199／seed-03 §6／主張を第三者が検証できる | 2→4 | A | E3 |
| DL-106 | 見解相違ログ | traceability/dissent-log.md | レビュー側の参照誤り（旧版参照、参照文書の取り違え等）、解釈の相違、未解決の異論を記録し、決裁事項への持込み先を示す。 | R-197, R-198／seed-03 D3／レビューの誤りまで継承しない | 2→6 | A | E3 |
| DL-107 | 棄却仮説ログ | traceability/rejected-hypotheses.md | 検討して棄却した仮説・設計案・数値と、棄却理由、証拠、変えた設計を記録する。 | R-201／seed-03 §5／判断過程の透明化 | 2→6 | A | E3 |
| DL-108 | 独立反証レビュー記録 | traceability/independent-challenge-review.md | pre-mortem、代替案の steelman、数値への攻撃、「推奨が正しいために真でなければならないこと」の列挙と、各指摘への回答を原文で記録する。本リポジトリ内のものは AI による自己反証であり、報告系統外の独立反証は未達として扱う。 | R-063, R-201／seed-03 §6／推奨の弱点を先に洗い出す | 4 | A（独立反証は D） | E2（独立実施時は E6） |
| DL-109 | 模擬パネル判定記録 | traceability/mock-panel-report.md | Phase 4 の模擬 CTO/CISO パネルによる判定・指摘・是正状況を記録する。実在の CTO/CISO の決裁ではない自己レビューであることを冒頭に明記する。**状態（PoC/R7反映）**: draft（TRC-10 版 0.4。ラウンド 1〜7 を記録し、最新の判定済みラウンドはラウンド 7。作成者以外の照合は未実施）[^15]。 | R-201, R-202／CONVENTIONS §8／提出前の自己検証 | 4 | A | E2 |
| DL-110 | 残課題・是正追跡（POA&M） | traceability/open-items.md | 未達（経営承認、第三者評価、実測、本番運用実績待ち）と是正項目を、担当・期限・依存ゲート・状態で追跡する。Critical/High closure の証跡所在を含める。 | R-076, R-187／CONVENTIONS §8／未達を達成済みと書かない | 4→6 | A | E11 |
| DL-111 | 自動検査仕様と結果 | traceability/consistency-checks.md | 規約違反（主張タグ欠落、禁止表現、メタ情報欠落）、ID 整合（未定義参照、重複）、孤児 R/DL、§8 ファイル一覧との差分、リンク切れの検査仕様と実行結果を記録する。 | R-197, R-199, R-200／CONVENTIONS 冒頭（Phase 4 自動検査）／規約遵守の機械確認 | 4 | A・C | E4 |
| DL-112 | 変更履歴 | traceability/change-log.md | 版ごとの変更点、旧提案書からの主要変更、決裁パッケージの版間差分を記録する。 | R-202／seed-03 §4 付属 L／版管理 | 1→6 | A | E2 |
| DL-114 | Phase 1 網羅性批評 | traceability/phase1-critique-R.md, traceability/phase1-critique-G.md | R/G 分解に対する独立の completeness critic の記録。 | R-197／分解漏れの検出 | 1 | A | E3 |
| DL-115 | claim 目録 | 04_architecture/claims-catalog.md | access token・Transaction Token・認可判定記録の3層識別子体系と trace_id との監査上の結合、claim ごとの採用区分・規格・状態・PII・理由、W3C VC Data Model 2.0 との対応と VC 受入れの将来設計、claim 追加審査のガードレール。2026-10-15 ユーザー要望で追加。 | R-161, R-162, R-118／G（将来性・証跡） | 3 | A | E2 |
| DL-116 | RS-18 テナント配下の階層モデリング（deep research） | research/RS-18-hierarchy-modeling.md, reports/テナント配下の階層モデリング.md, research_notes/テナント配下の階層モデリング/ | containment・membership・管理委任範囲の 3 関係の分離と、主要基盤・認可エンジンの階層表現を調べた報告と作業メモ。reports/ は報告の原稿（RS-18 と同文）、research_notes/ は作業メモ。独立検証記録は未作成（open-items OI-V04）。2026-10-15 の DL-111 自動検査で未登録ファイルとして検出し追記した。 | R-142〜R-149, R-205／DL-17・DL-48 へ供給 | 2 | A | E3 |

## 5. ADR ファイル名（05_adr、DL-12）

ADR-001〜ADR-019 は seed-02 の A01〜A19 の読み替えであり[^3]、ADR-020〜ADR-029 は追加である [D]。ADR-020 と ADR-027 はレビュー Gate 3 が「分離せよ」と挙げた判断のうち A01〜A19 で独立していないもの、ADR-021〜ADR-026・ADR-028・ADR-029 は seed-03 §7 の未指摘弱点と本プログラムの連携契約・依存階層の判断を受ける [D]。「DEC-3」列の「対象」は不可逆決定として DEC-3 で決裁する ADR を示す（seed-03 §3 の D3 に基づく暫定）[^4]。

| ADR | 種資料 | ファイル | 決める内容 | 主な対応要求 | 主な関連 DL | DEC-3 |
|---|---|---|---|---|---|---|
| ADR-001 | A01 | 05_adr/ADR-001-build-buy-identity-provider.md | managed IdP か自営 AS か。認証プロトコル・認証器・password・回復・AS core を自作しない原則と例外審査要件 | R-088, R-094, R-203 | DL-13, DL-44 | 対象（自作しない方針） |
| ADR-002 | A02 | 05_adr/ADR-002-assurance-levels-by-tier.md | 主体種別×操作リスク階層ごとの IAL/AAL/FAL、同期 passkey の受入範囲 | R-027, R-030, R-031 | DL-09, DL-48 | — |
| ADR-003 | A03 | 05_adr/ADR-003-account-recovery-authenticators.md | アカウント回復と認証器ライフサイクル、helpdesk 本人確認、管理者回復の二者承認と待機時間 | R-032, R-041〜R-043 | DL-08 | — |
| ADR-004 | A04 | 05_adr/ADR-004-b2b-federation-linking-scim.md | B2B federation（home realm discovery、RP 起点、IdP 鍵更新、切離し）、不変識別子による account linking、domain 検証、SCIM と JIT の衝突解決 | R-036〜R-040, R-046, R-047, R-131, R-132 | DL-08, DL-26, DL-76 | — |
| ADR-005 | A05 | 05_adr/ADR-005-token-profile.md | opaque/JWT 境界、token 種別と typ 分離、寿命の決め方、refresh 保護、DPoP/mTLS の選択 | R-095, R-158, R-161〜R-163 | DL-16, DL-75 | — |
| ADR-006 | A06 | 05_adr/ADR-006-revocation-continuous-evaluation.md | 剥奪・テナント停止・session 失効ごとの伝播方式、SSF/CAEP の送受信義務範囲 | R-112, R-143, R-191 | DL-56, DL-78, DL-79 | — |
| ADR-007 | A07 | 05_adr/ADR-007-key-hierarchy-kms-hsm.md | 鍵階層、用途別・cell 別分離、KMS か専用 HSM か、鍵と issuer・テナントの結合 | R-049〜R-056 | DL-14 | 対象（鍵階層の原則） |
| ADR-008 | A08 | 05_adr/ADR-008-control-plane-cicd-protection.md | 管理面（二者承認、JIT、専用端末、自社 IdP 管理者認証の循環依存の切断）と CI/CD・policy bundle 署名 | R-054, R-056, R-073 | DL-14, DL-46 | — |
| ADR-009 | A09 | 05_adr/ADR-009-workload-identity-token-exchange.md | workload identity 方式、trust domain 単位、token exchange と委任の伝搬、内部 context の方式 | R-100, R-206 | DL-55, DL-74 | — |
| ADR-010 | A10 | 05_adr/ADR-010-authz-engine-store-consistency.md | 認可 engine/store（managed/self-host）、整合性モデル、tenant/domain 分割、policy store のテナント別/共有 | R-097, R-144, R-151 | DL-17, DL-13 | — |
| ADR-011 | A11 | 05_adr/ADR-011-policy-language-pep-pdp-api.md | policy 言語、schema、deny semantics、conflict resolution と PEP–PDP 間 API（AuthZEN 準拠の採否） | R-098, R-205 | DL-17, DL-72 | — |
| ADR-012 | A12 | 05_adr/ADR-012-pep-coverage-storage-guardrails.md | PEP coverage の機械検証方式、DB RLS・storage 側 guardrail、非同期経路の再認可 | R-059〜R-062 | DL-15, DL-57 | — |
| ADR-013 | A13 | 05_adr/ADR-013-cell-partitioning-fail-mode.md | cell 分割単位、global 部品の最小化、静的安定性、操作階層別 fail-mode の原則 | R-085, R-099, R-150〜R-156 | DL-18, DL-19 | 対象（cell の原則） |
| ADR-014 | A14 | 05_adr/ADR-014-audit-data.md | 監査データモデル、全件記録対象、保持・所在地・削除、WORM と削除権の調停、顧客開示 | R-102, R-118〜R-128 | DL-25, DL-77 | — |
| ADR-015 | A15 | 05_adr/ADR-015-crypto-agility-pqc.md | alg 識別子と版付き profile、複数 alg JWKS、PQC 移行の順序と抽象境界 | R-101, R-104 | DL-23 | — |
| ADR-016 | A16 | 05_adr/ADR-016-versioning-deprecation.md | policy/model/schema/token/audit の versioning、互換期間、deprecation 方針 | R-105〜R-109 | DL-23, DL-70 | — |
| ADR-017 | A17 | 05_adr/ADR-017-non-human-ai-agent-identity.md | 非人間 ID と AI エージェントを独立主体とするか委任＋act とするか、tool 呼出し単位の認可、人による確認 | R-029, R-209 | DL-48, DL-55 | — |
| ADR-018 | A18 | 05_adr/ADR-018-exit-strategy.md | 製品・クラウドからの出口（export 形式、DSL 変換、dual-run 移行、契約条項） | R-090, R-091, R-208 | DL-13, DL-73 | — |
| ADR-019 | A19 | 05_adr/ADR-019-compromise-response.md | 侵害時対応の設計原則（kill switch、全 session 失効、鍵切替、PDP 隔離、証拠保全の方式） | R-110〜R-116 | DL-24 | — |
| ADR-020 | 追加 | 05_adr/ADR-020-fapi2-applicability.md | FAPI 2.0 を必須とする API 範囲と sender constraint 方式（レビュー Gate 3 の分離要求） | R-096, R-160 | DL-16, DL-60 | — |
| ADR-021 | 追加 | 05_adr/ADR-021-irreversible-identifiers.md | 不可逆識別子（issuer URL、sub/tid 形式、WebAuthn RP ID、SAML entityID/ACS、resource type 名前空間）を自社所有ドメインと不透明 ID で固定する | R-037, R-047, R-209／seed-03 §7-13 | DL-71, DL-48 | 対象 |
| ADR-022 | 追加 | 05_adr/ADR-022-integration-contract-standards.md | 連携契約の標準（OIDC/OAuth profile、RFC 9068、AuthZEN、SSF/CAEP、SCIM）、contract-first、薄い SDK、契約外依存の禁止 | R-105, R-109, R-208／seed-03 §7-14 | DL-62, DL-69〜DL-80, DL-117〜DL-119, DL-121 | 対象 |
| ADR-023 | 追加 | 05_adr/ADR-023-dependency-tiers.md | 依存階層と「この基盤に依存してはならないもの」、データプレーンの静的安定性と剥奪反映のトレードオフ | R-207, R-210／seed-03 D1 | DL-63, DL-18 | — |
| ADR-024 | 追加 | 05_adr/ADR-024-cross-tenant-sharing.md | 外部共有・ゲスト・テナント越え権限付与のモデルと、resource-derived tenant 照合規則の例外の扱い | R-011, R-172／seed-03 §7-8 | DL-17, DL-65 | — |
| ADR-025 | 追加 | 05_adr/ADR-025-list-search-authorization.md | 一覧・検索の認可（ListObjects/LookupResources、ACL 反映インデックス、件数・ページングからの情報漏えい対策） | R-190／seed-03 §7-6 | DL-17, DL-57, DL-64 | — |
| ADR-026 | 追加 | 05_adr/ADR-026-async-long-running-delegation.md | 非同期・長時間・定期ジョブの委任（enqueue 時/実行時の再認可、ジョブ所有者の退職・権限喪失時の扱い） | R-044, R-100／seed-03 §7-7、seed-02 6-4 | DL-55, DL-64 | — |
| ADR-027 | 追加 | 05_adr/ADR-027-migration-dual-run-rollback.md | migration・dual-write・shadow・rollback の方式と新旧判定差分の扱い（レビュー Gate 3 の分離要求） | R-103, R-177〜R-180 | DL-31, DL-73 | — |
| ADR-028 | 追加 | 05_adr/ADR-028-tenant-lifecycle-operations.md | テナント統合・分割・cell 間移動・解約時エクスポートの方式 | R-150／seed-03 §7-12 | DL-49 | — |
| ADR-029 | 追加 | 05_adr/ADR-029-privileged-support-access.md | 特権・support アクセス（JIT、二者承認、セッション記録、support 経路分離、break-glass） | R-042, R-054, R-176 | DL-46, DL-52, DL-24 | — |

## 6. 決裁事項・付属資料・連携パターンの暫定対応

### 6.1 DEC-1〜DEC-10・DEC-11（仮）と成果物（暫定）

DEC の正式な定義・文言・承認者は DL-39（00_decision/03-decision-items.md）が持つ。下表は成果物割当のための暫定対応であり、DEC-1〜DEC-7 は seed-03 §3 の D1〜D7 を、DEC-8 は再提案計画で追加した「連携契約 v1 の凍結」、DEC-9 は同 §3 末尾の「Plan B を最初に承認しておく」提案を読み替えた [D][^4]。DL-39 の確定時に本表を更新する。

| DEC | 承認者（暫定） | 決裁内容（暫定） | 主な成果物 |
|---|---|---|---|
| DEC-1 | 経営会議/取締役会（起案: CISO・CTO・事業責任者） | リスク選好、重大損失シナリオ、データ分類、対象法域（未完成部分は策定責任者と期限） | DL-01, DL-02, DL-03, DL-21, DL-34, DL-45 |
| DEC-2 | CTO＋CISO | プログラム憲章（目的、スコープ、パイロット、非目標、20 年耐久性憲章） | DL-40, DL-47, DL-44 |
| DEC-3 | CTO（アーキテクチャ審査会経由）＋CISO 同意 | 不可逆決定の ADR v1 | DL-12（ADR-001, ADR-007, ADR-013, ADR-021, ADR-022） |
| DEC-4 | CTO＋CISO＋CFO | Gate 4 PoC 入場（予算上限、要員と稼働率、期間上限、事前登録仮説と合否・中止基準、合成データ限定、パイロット参加確約） | DL-22, DL-42, DL-43, DL-27, DL-58 |
| DEC-5 | CISO | 独立保証計画（評価者の任命・調達、Gate 4 立会い範囲） | DL-07, DL-30, DL-59, DL-60, DL-61 |
| DEC-6 | 事業責任者 | PoC 期間限定の残余リスク受容 | DL-05, DL-41 |
| DEC-7 | CTO＋CISO | 前回指摘のうち検証済み項目のクローズと繰延べ項目のゲート割当 | DL-38, DL-101, DL-104, DL-110 |
| DEC-8 | CTO＋CISO | 連携契約 v1 の凍結（他システムがモック・契約試験キットで並行開発を開始できる状態の承認） | DL-62〜DL-80, DL-117〜DL-121, ADR-022 |
| DEC-9 | CTO＋CISO（経営へ報告） | Plan B（中止・方針転換時の既定経路）の事前承認 | DL-42, DL-44 |
| DEC-10 | CFO＋CTO＋CISO（上限の合計が付議基準額を超えれば経営会議） | G0〜G3 の段階予算（PoC/R7反映 で本表に追加。DL-39 の §4.10 が正本） | DL-42, DL-43 |
| DEC-11（仮） | 経営会議＋CFO（起案: CTO・人事責任者） | G3 の要員確約と G3〜本番設計審査の予算。G3 判定時に付議する将来の決裁単位（PoC/R7反映 で本表に追加。DL-39 の §4.11 が正本） | DL-43, DL-27, DL-42 |

- PoC/R7反映: 本節の見出しと表は版 0.5 まで DEC-1〜DEC-9 だけを持っていた（模擬パネル ラウンド 7 の MP-7-30。ラウンド 2 以来の申し送り C-7・TR-17・R3S-6）。DEC-10 と DEC-11（仮）の行を加えた。CONVENTIONS.md §2 の DEC の範囲（DEC-1〜DEC-9）の改訂は本書の編集範囲の外であり、申し送る（レビュー記録 PoC/R7反映 の申し送り 1）[D]。

### 6.2 決裁資料の付属 A〜L の所在

seed-03 §4 の付属構成[^4]を次のファイルで充足する [D]。保証計画（同 §4 の 9）は DL-07 を直接参照する。

| 付属 | 内容 | 成果物 |
|---|---|---|
| A | 主張台帳と検証ログ | DL-105, DL-29 |
| B | As-Is 棚卸し | DL-50 |
| C | 脅威モデル・DFD・攻撃者モデル | DL-10, DL-11, DL-51, DL-52, DL-53 |
| D | 認証要件と状態遷移 | DL-08, DL-09, DL-48 |
| E | ADR 群（可逆/不可逆の区別） | DL-12 |
| F | 統制台帳 | DL-28, DL-34 |
| G | 数値契約（導出鎖と状態） | DL-20, DL-21 |
| H | PoC 試験計画（事前登録） | DL-22, DL-81 |
| I | 代替案比較 | DL-44 |
| J | 独立反証レビュー報告と回答 | DL-108 |
| K | 見解相違ログ | DL-106 |
| L | 変更履歴と棄却仮説 | DL-112, DL-107 |

### 6.3 連携パターン P-xx の初期割当（暫定）

P-ID の正式定義は DL-64 が持つ。並行作業での ID 衝突を避けるため初期割当を置く。追加は末尾採番、欠番は再利用しない。

| P | パターン | 主な関連 ADR |
|---|---|---|
| P-01 | ブラウザ利用者→BFF→業務 API | ADR-005 |
| P-02 | ネイティブアプリ・CLI クライアント | ADR-005, ADR-020 |
| P-03 | サービス間の同期呼出し（workload ID＋token exchange） | ADR-009 |
| P-04 | 非同期メッセージの consumer | ADR-012, ADR-026 |
| P-05 | 長時間・定期ジョブ | ADR-026 |
| P-06 | Webhook の送受信 | ADR-009, ADR-012 |
| P-07 | 第三者連携アプリ（外部 OAuth client） | ADR-005, ADR-006 |
| P-08 | AI エージェント・tool 呼出し | ADR-017 |
| P-09 | 一覧・検索 | ADR-025 |
| P-10 | エクスポート・大量読取り | ADR-012, ADR-014 |
| P-11 | 管理コンソール・support tool | ADR-008, ADR-029 |
| P-12 | B2B 顧客 IdP との federation | ADR-004 |
| P-13 | SCIM による provisioning/deprovisioning | ADR-004 |
| P-14 | ストリーム接続（WebSocket・gRPC streaming）での失効反映 | ADR-006 |
| P-15 | データ基盤への持出し（DWH・ML・検索インデックス） | ADR-012, ADR-025 |
| P-16 | テナント越境共有・ゲスト | ADR-024 |
| P-17 | break-glass・緊急経路 | ADR-029, ADR-023 |

## 7. 件数

| 区分 | 件数 |
|---|---|
| DL（DL-01〜DL-121） | 121 |
| うち seed-01 由来（DL-01〜DL-34） | 34 |
| うち追加（DL-35〜DL-121） | 87 |
| 計画ファイル数（§8、既存ファイルと 12_poc/code・data 配下の個別ファイルを除く） | 172（PoC/R7反映 で 12_poc/reproduction-log.md の 1 行を加えた。それまでは 171。2026-10-15 の DL-111 自動検査で §8 の行から再計数した 166 に、模擬パネル ラウンド 2 の是正で 11_contracts の 3 行（DL-117〜DL-119）を、ラウンド 4 の是正で 12_poc の 1 行（DL-120）を、ラウンド 6 の是正で 11_contracts の 1 行（DL-121）を加えた。旧値 141・169・170） |
| うち ADR（ADR-001〜ADR-029） | 29 |

## 8. ディレクトリごとのファイル一覧

後続の全エージェントはこのファイル名と文書IDに従って書く。既に別の名前・IDで書かれた文書は、Phase 4 の自動検査（DL-111）で本表に揃える。「既存」は本プログラム開始前からあるファイルで、編集しない。

### ルート

| パス | 文書ID | DL | 備考 |
|---|---|---|---|
| README.md | GEN-01 | DL-35 | |
| CONVENTIONS.md | — | — | 既存（執筆規約） |
| マルチテナントSaaS認証・認可基盤の比較調査と設計指針.md | — | — | 既存（旧提案書、baseline） |
| 20年運用を前提とした認証・認可基盤提案のCTO CISOレビュー.md | — | — | 既存（レビュー原文、baseline） |

### 00_decision/（決裁パッケージ）

| パス | 文書ID | DL | 備考 |
|---|---|---|---|
| 00_decision/00-cover.md | DCS-00 | DL-36 | 付属 A〜L 索引を含む |
| 00_decision/01-executive-summary.md | DCS-01 | DL-37 | 全文に主張タグ |
| 00_decision/02-prior-findings-crosswalk.md | DCS-02 | DL-38 | |
| 00_decision/03-decision-items.md | DCS-03 | DL-39 | DEC-n の定義場所 |
| 00_decision/04-program-charter.md | DCS-04 | DL-40 | |
| 00_decision/05-residual-risk-register.md | DCS-05 | DL-41 | |
| 00_decision/06-gate-plan-and-plan-b.md | DCS-06 | DL-42 | Phase/Gate 対応表を含む |
| 00_decision/07-organization-and-tco.md | DCS-07 | DL-43 | |
| 00_decision/08-alternatives-comparison.md | DCS-08 | DL-44 | |

### 01_governance/

| パス | 文書ID | DL | 備考 |
|---|---|---|---|
| 01_governance/assumptions-register.md | GOV-01 | DL-45 | A-xxx の定義場所 |
| 01_governance/risk-appetite-draft.md | GOV-02 | DL-01 | |
| 01_governance/loss-scenarios.md | GOV-03 | DL-02 | S-xx の定義場所 |
| 01_governance/business-impact-analysis.md | GOV-04 | DL-21 | |
| 01_governance/raci-governance.md | GOV-05 | DL-04 | |
| 01_governance/stop-authority.md | GOV-06 | DL-46 | |
| 01_governance/exception-risk-acceptance.md | GOV-07 | DL-05 | |
| 01_governance/kri.md | GOV-08 | DL-06 | K-xx の定義場所 |
| 01_governance/durability-charter-20y.md | GOV-09 | DL-47 | |

### 02_requirements/

| パス | 文書ID | DL | 備考 |
|---|---|---|---|
| 02_requirements/principal-catalog.md | REQ-01 | DL-48 | |
| 02_requirements/identity-lifecycle.md | REQ-02 | DL-08 | |
| 02_requirements/operation-risk-tiers-assurance.md | REQ-03 | DL-09 | 操作 5 分類の定義場所 |
| 02_requirements/data-classification.md | REQ-04 | DL-03 | |
| 02_requirements/tenant-lifecycle.md | REQ-05 | DL-49 | |
| 02_requirements/customer-admin-responsibility.md | REQ-06 | DL-26 | |
| 02_requirements/as-is-inventory.md | REQ-07 | DL-50 | |

### 03_threat-model/

| パス | 文書ID | DL | 備考 |
|---|---|---|---|
| 03_threat-model/dfd-entry-points.md | THR-01 | DL-10 | |
| 03_threat-model/attacker-model.md | THR-02 | DL-51 | ATK-xx の定義場所 |
| 03_threat-model/threat-catalog.md | THR-03 | DL-11 | T-xxx の定義場所 |
| 03_threat-model/fraud-abuse-controls.md | THR-04 | DL-52 | |
| 03_threat-model/incident-casebook.md | THR-05 | DL-53 | |

### 04_architecture/

| パス | 文書ID | DL | 備考 |
|---|---|---|---|
| 04_architecture/reference-architecture-v2.md | ARC-01 | DL-54 | |
| 04_architecture/token-profile.md | ARC-02 | DL-16 | |
| 04_architecture/root-of-trust.md | ARC-03 | DL-14 | 鍵 ceremony 手順を含む |
| 04_architecture/workload-identity-delegation.md | ARC-04 | DL-55 | |
| 04_architecture/authorization-model.md | ARC-05 | DL-17 | 整合性・剥奪仕様を含む |
| 04_architecture/pep-contract.md | ARC-06 | DL-15 | coverage・guardrail 検証を含む |
| 04_architecture/cell-blast-radius.md | ARC-07 | DL-18 | |
| 04_architecture/fail-mode-matrix.md | ARC-08 | DL-19 | |
| 04_architecture/revocation-continuous-evaluation.md | ARC-09 | DL-56 | |
| 04_architecture/audit-privacy.md | ARC-10 | DL-25 | PIA を含む |
| 04_architecture/data-outside-pep.md | ARC-11 | DL-57 | |
| 04_architecture/evolution-pqc.md | ARC-12 | DL-23 | |
| 04_architecture/capacity-model.md | ARC-13 | DL-58 | |
| 04_architecture/product-evaluation-exit.md | ARC-14 | DL-13 | |
| 04_architecture/claims-catalog.md | ARC-15 | DL-115 | ユーザー要望で追加 |
| 04_architecture/architecture-reconciliation-notes.md | ARC-RN | DL-54 | 補助文書（04_architecture 15 文書の整合調整記録）。DL-111 で検出し追記 |

### 05_adr/（DL-12）

| パス | 文書ID | DL | 備考 |
|---|---|---|---|
| 05_adr/README.md | ADR-000 | DL-12 | 索引・様式 |
| 05_adr/ADR-001-build-buy-identity-provider.md | ADR-001 | DL-12 | DEC-3 |
| 05_adr/ADR-002-assurance-levels-by-tier.md | ADR-002 | DL-12 | |
| 05_adr/ADR-003-account-recovery-authenticators.md | ADR-003 | DL-12 | |
| 05_adr/ADR-004-b2b-federation-linking-scim.md | ADR-004 | DL-12 | |
| 05_adr/ADR-005-token-profile.md | ADR-005 | DL-12 | |
| 05_adr/ADR-006-revocation-continuous-evaluation.md | ADR-006 | DL-12 | |
| 05_adr/ADR-007-key-hierarchy-kms-hsm.md | ADR-007 | DL-12 | DEC-3 |
| 05_adr/ADR-008-control-plane-cicd-protection.md | ADR-008 | DL-12 | |
| 05_adr/ADR-009-workload-identity-token-exchange.md | ADR-009 | DL-12 | |
| 05_adr/ADR-010-authz-engine-store-consistency.md | ADR-010 | DL-12 | |
| 05_adr/ADR-011-policy-language-pep-pdp-api.md | ADR-011 | DL-12 | |
| 05_adr/ADR-012-pep-coverage-storage-guardrails.md | ADR-012 | DL-12 | |
| 05_adr/ADR-013-cell-partitioning-fail-mode.md | ADR-013 | DL-12 | DEC-3 |
| 05_adr/ADR-014-audit-data.md | ADR-014 | DL-12 | |
| 05_adr/ADR-015-crypto-agility-pqc.md | ADR-015 | DL-12 | |
| 05_adr/ADR-016-versioning-deprecation.md | ADR-016 | DL-12 | |
| 05_adr/ADR-017-non-human-ai-agent-identity.md | ADR-017 | DL-12 | |
| 05_adr/ADR-018-exit-strategy.md | ADR-018 | DL-12 | |
| 05_adr/ADR-019-compromise-response.md | ADR-019 | DL-12 | |
| 05_adr/ADR-020-fapi2-applicability.md | ADR-020 | DL-12 | |
| 05_adr/ADR-021-irreversible-identifiers.md | ADR-021 | DL-12 | DEC-3 |
| 05_adr/ADR-022-integration-contract-standards.md | ADR-022 | DL-12 | DEC-3 |
| 05_adr/ADR-023-dependency-tiers.md | ADR-023 | DL-12 | |
| 05_adr/ADR-024-cross-tenant-sharing.md | ADR-024 | DL-12 | |
| 05_adr/ADR-025-list-search-authorization.md | ADR-025 | DL-12 | |
| 05_adr/ADR-026-async-long-running-delegation.md | ADR-026 | DL-12 | |
| 05_adr/ADR-027-migration-dual-run-rollback.md | ADR-027 | DL-12 | |
| 05_adr/ADR-028-tenant-lifecycle-operations.md | ADR-028 | DL-12 | |
| 05_adr/ADR-029-privileged-support-access.md | ADR-029 | DL-12 | |
| 05_adr/reconciliation-notes.md | ADR-RN | DL-12 | 補助文書（主要 ADR 8 本の整合調整記録）。DL-111 で検出し追記 |

### 06_controls/

| パス | 文書ID | DL | 備考 |
|---|---|---|---|
| 06_controls/control-mapping-ledger.md | CTL-01 | DL-28 | C-xxx の定義場所 |
| 06_controls/applicability.md | CTL-02 | DL-34 | |
| 06_controls/mappings/nist-csf-iso27001.md | CTL-03 | DL-28 | DL-28 の分冊（CSF 2.0 / ISO/IEC 27001）。DL-111 で検出し追記 |
| 06_controls/mappings/identity-appsec.md | CTL-04 | DL-28 | DL-28 の分冊（SP 800-63-4 / ASVS / API Top 10 / RFC 9700 / FAPI 2.0）。DL-111 で検出し追記 |
| 06_controls/mappings/cloud-supplychain.md | CTL-05 | DL-28 | DL-28 の分冊（CCM / SSDF / SLSA / SOC 2）。DL-111 で検出し追記 |
| 06_controls/mappings/regulations.md | CTL-06 | DL-28 | DL-28 の分冊（日本・EU/英国・米国・業界規制）。DL-111 で検出し追記 |

### 07_slo/

| パス | 文書ID | DL | 備考 |
|---|---|---|---|
| 07_slo/numeric-contracts.md | SLO-01 | DL-20 | SLI-xxx の定義場所 |

### 08_operations/

| パス | 文書ID | DL | 備考 |
|---|---|---|---|
| 08_operations/compromise-runbooks.md | OPS-01 | DL-24 | RB-xx の定義場所、演習計画を含む |
| 08_operations/operating-model.md | OPS-02 | DL-27 | |
| 08_operations/tco-vendor-lts.md | OPS-03 | DL-33 | |
| 08_operations/phased-rollout.md | OPS-04 | DL-31 | |

### 09_assurance/

| パス | 文書ID | DL | 備考 |
|---|---|---|---|
| 09_assurance/independent-assurance-plan.md | ASR-01 | DL-07 | |
| 09_assurance/pentest-redteam-plan.md | ASR-02 | DL-59 | |
| 09_assurance/oidf-conformance-plan.md | ASR-03 | DL-60 | |
| 09_assurance/self-assessments.md | ASR-04 | DL-61 | |
| 09_assurance/rfp-sow.md | ASR-05 | DL-30 | |
| 09_assurance/continuous-assurance-plan.md | ASR-06 | DL-32 | |

### 10_integration/（連携ハンドブック）

| パス | 文書ID | DL | 備考 |
|---|---|---|---|
| 10_integration/README.md | INT-00 | DL-62 | |
| 10_integration/dependency-tiers.md | INT-01 | DL-63 | |
| 10_integration/integration-patterns.md | INT-02 | DL-64 | P-xx の定義場所 |
| 10_integration/authz-modeling-guide.md | INT-03 | DL-65 | |
| 10_integration/onboarding.md | INT-04 | DL-66 | |
| 10_integration/definition-of-ready.md | INT-05 | DL-67 | |
| 10_integration/developer-faq.md | INT-06 | DL-68 | |

### 11_contracts/（連携契約）

| パス | 文書ID | DL | 備考 |
|---|---|---|---|
| 11_contracts/README.md | CON-00 | DL-69 | |
| 11_contracts/compatibility-deprecation-policy.md | CON-01 | DL-70 | |
| 11_contracts/schemas/common.schema.json | CON-02 | DL-71 | |
| 11_contracts/authorization-api.openapi.yaml | CON-03 | DL-72 | AuthZEN 準拠 |
| 11_contracts/relationship-model-registry.openapi.yaml | CON-04 | DL-73 | |
| 11_contracts/token-exchange.openapi.yaml | CON-05 | DL-74 | |
| 11_contracts/schemas/access-token-claims.schema.json | CON-06 | DL-75 | |
| 11_contracts/scim.openapi.yaml | CON-07 | DL-76 | |
| 11_contracts/schemas/audit-event.schema.json | CON-08 | DL-77 | |
| 11_contracts/ssf-caep.openapi.yaml | CON-09 | DL-78 | |
| 11_contracts/schemas/ssf-caep-set.schema.json | CON-10 | DL-79 | |
| 11_contracts/mock-contract-test-kit.md | CON-11 | DL-80 | |
| 11_contracts/lifecycle-events.asyncapi.yaml | CON-12 | DL-117 | AsyncAPI 3.1.0。G-137 のライフサイクルイベント契約（事象一覧・配送の保証・受信側の義務）。2026-10-15 ラウンド 2 で追加（ファイルが先に作られた） |
| 11_contracts/schemas/lifecycle-event.schema.json | CON-13 | DL-118 | CON-12 の封筒と data の JSON Schema。2026-10-15 ラウンド 2 で追加（同上） |
| 11_contracts/client-registration.openapi.yaml | CON-14 | DL-119 | client 登録（sandbox セルフ登録と本番の登録申請）。旧仮番 CON-13 は CON-13（DL-118）と衝突したため CON-14 とした。2026-10-15 ラウンド 2 で追加（同上） |
| 11_contracts/lifecycle-state.openapi.yaml | CON-15 | DL-121 | OpenAPI 3.1.2、preview。CON-12 の RO-9・RO-12 が呼ぶ照会 API。未作成（本体は CON-12 の拡張 `x-state-query-api` にあり、内容を変えずに切り出す。CON-12 §10 H5-1）。期限 DEC-8 第 1 段の付議前。2026-10-15 ラウンド 6 で追加 |
| 11_contracts/review-notes/CON-02.md | CON-02-RV | DL-71 | CON-02 の独立レビュー記録。DL-111 で検出し追記 |
| 11_contracts/review-notes/CON-03.md | CON-03-RV | DL-72 | CON-03 の独立レビュー記録。DL-111 で検出し追記 |
| 11_contracts/review-notes/CON-04.md | CON-04-RV | DL-73 | CON-04 の独立レビュー記録。DL-111 で検出し追記 |
| 11_contracts/review-notes/CON-05.md | CON-05-RV | DL-74 | CON-05 の独立レビュー記録。DL-111 で検出し追記 |
| 11_contracts/review-notes/CON-06.md | CON-06-RV | DL-75 | CON-06 の独立レビュー記録。DL-111 で検出し追記 |
| 11_contracts/review-notes/CON-07.md | CON-07-RV | DL-76 | CON-07 の独立レビュー記録。DL-111 で検出し追記 |
| 11_contracts/review-notes/CON-08.md | CON-08-RV | DL-77 | CON-08 の独立レビュー記録。DL-111 で検出し追記 |
| 11_contracts/review-notes/CON-09.md | CON-09-RV | DL-78 | CON-09 の独立レビュー記録。DL-111 で検出し追記 |
| 11_contracts/review-notes/CON-10.md | CON-10-RV | DL-79 | CON-10 の独立レビュー記録。DL-111 で検出し追記 |

### 12_poc/

| パス | 文書ID | DL | 備考 |
|---|---|---|---|
| 12_poc/preregistered-test-plan.md | POC-01 | DL-22 | TC-xxx の定義場所 |
| 12_poc/measurement-report.md | POC-02 | DL-81 | draft（版 0.1。作成済み、作成者以外の確認未実施、git 未追跡。2026-10-15 ラウンド 7 で状態を記入）[^13] |
| 12_poc/reproduction-log.md | POC-05（案。本文の表記は「POC-04（仮）」で、DL-120 の POC-04 と衝突する） | DL-81 | draft（版 0.1。独立再現ログ。作成済み、作成者以外（人）の確認未実施。実装者と別の AI エージェントによる同じ機械での再実行で、独立立会人ではない。PoC/R7反映 で追加）[^14] |
| 12_poc/code/README.md | POC-03 | DL-82 | コード本体は 12_poc/code/ 配下。契約試験キット本体（contract-kit/）を含まない |
| 12_poc/code/contract-kit/README.md | POC-04 | DL-120 | 契約試験キット本体の文書。キットのコード・ベクタ・設定は 12_poc/code/contract-kit/ 配下（§2 の例外）。未作成、期限 G3。2026-10-15 ラウンド 4 で追加。受入れ基準 (4)（MK-02 の workload・交換可能な組の登録）はラウンド 7 で追加 |
| 12_poc/data/ | — | DL-81 | 生データ置き場（ディレクトリ） |

### research/

| パス | 文書ID | DL | 備考 |
|---|---|---|---|
| research/README.md | RES-00 | DL-83 | |
| research/standards-status.md | RES-01 | DL-84 | |
| research/RS-01-governance-risk.md | RS-01 | DL-85 | |
| research/RS-02-regulatory-applicability.md | RS-02 | DL-86 | |
| research/RS-03-identity-lifecycle.md | RS-03 | DL-87 | |
| research/RS-04-oauth-oidc-profile.md | RS-04 | DL-88 | |
| research/RS-05-root-of-trust-keys-supply-chain.md | RS-05 | DL-89 | |
| research/RS-06-workload-identity-delegation-agents.md | RS-06 | DL-90 | |
| research/RS-07-authz-engines-consistency.md | RS-07 | DL-91 | |
| research/RS-08-pep-completeness-tenant-isolation.md | RS-08 | DL-92 | |
| research/RS-09-resilience-cell-failmode.md | RS-09 | DL-93 | |
| research/RS-10-audit-privacy-residency.md | RS-10 | DL-94 | |
| research/RS-11-twenty-year-evolution-pqc.md | RS-11 | DL-95 | |
| research/RS-12-incident-casebook.md | RS-12 | DL-96 | |
| research/RS-13-fraud-abuse.md | RS-13 | DL-97 | |
| research/RS-14-b2b-customer-identity.md | RS-14 | DL-98 | |
| research/RS-15-build-buy-tco.md | RS-15 | DL-99 | |
| research/RS-16-parallel-development-governance.md | RS-16 | DL-100 | |
| research/RS-17-integration-patterns-modeling.md | RS-17 | DL-113 | |
| research/RS-18-hierarchy-modeling.md | RS-18 | DL-116 | 2026-10-15 追加。独立検証記録は未作成。DL-111 で検出し追記 |
| research/verification/RS-xx-verification.md | — | DL-85〜DL-100, DL-113 | 各ストリームの独立検証記録 |

### reports/・research_notes/（RS-18 の報告原稿と作業メモ）

| パス | 文書ID | DL | 備考 |
|---|---|---|---|
| reports/テナント配下の階層モデリング.md | RS-18-RPT | DL-116 | RS-18 と同文の報告原稿。DL-111 で検出し追記 |
| research_notes/テナント配下の階層モデリング/authz_engine_hierarchy.md | — | DL-116 | 作業メモ（メタ情報ブロックの対象外） |
| research_notes/テナント配下の階層モデリング/cloud_platform_hierarchies.md | — | DL-116 | 作業メモ（メタ情報ブロックの対象外） |
| research_notes/テナント配下の階層モデリング/saas_identity_org_models.md | — | DL-116 | 作業メモ（メタ情報ブロックの対象外） |

### traceability/

| パス | 文書ID | DL | 備考 |
|---|---|---|---|
| traceability/R-requirements.md | TRC-01 | DL-101 | R-xxx の定義場所 |
| traceability/G-goal-criteria.md | TRC-02 | DL-102 | G-xxx の定義場所 |
| traceability/deliverables.md | TRC-03 | DL-103 | 本書。DL-xx の定義場所 |
| traceability/traceability-matrix.md | TRC-04 | DL-104 | |
| traceability/claims-ledger.md | TRC-05 | DL-105 | CL-xxxx の定義場所 |
| traceability/citation-audit-proposal.md | TRC-06 | DL-29 | 旧提案書の引用監査 |
| traceability/citation-audit-review.md | TRC-06-R | DL-29 | レビュー側の引用監査（旧計画 ID TRC-06b。既発行文書と参照元の表記 TRC-06-R に揃えた） |
| traceability/phase1-critique-R.md | TRC-14 | DL-114 | R 分解の網羅性批評 |
| traceability/phase1-critique-G.md | TRC-15 | DL-114 | G 分解の網羅性批評 |
| traceability/dissent-log.md | TRC-07 | DL-106 | 見解相違ログ（DS-xx） |
| traceability/rejected-hypotheses.md | TRC-08 | DL-107 | |
| traceability/independent-challenge-review.md | TRC-09 | DL-108 | |
| traceability/mock-panel-report.md | TRC-10 | DL-109 | |
| traceability/open-items.md | TRC-11 | DL-110 | |
| traceability/consistency-checks.md | TRC-12 | DL-111 | |
| traceability/change-log.md | TRC-13 | DL-112 | |
| traceability/seed/seed-01-ciso-assurance.md | — | — | 既存（種資料、編集しない） |
| traceability/seed/seed-02-cto-technical.md | — | — | 既存（種資料、編集しない） |
| traceability/seed/seed-03-redteam-decision.md | — | — | 既存（種資料、編集しない） |

## 参考文献

[^1]: 本リポジトリ『執筆規約（全成果物共通）』2026-10-03. CONVENTIONS.md （参照箇所: 冒頭, §2, §6, §7, §8、確認日: 2026-10-03）
[^2]: 計画エージェント（CISO・内部監査・独立保証レンズ）『種資料01: CISO／内部監査／独立保証の観点による指摘分解』2026-10-03. traceability/seed/seed-01-ciso-assurance.md （参照箇所: 冒頭注記, §1, §2, §4.2, §6、確認日: 2026-10-03）
[^3]: 計画エージェント（CTO・プリンシパルアーキテクトレンズ）『種資料02: CTO／プリンシパルアーキテクト観点の研究課題設計』2026-10-03. traceability/seed/seed-02-cto-technical.md （参照箇所: 冒頭注記, ADR 一覧, §1〜§12、確認日: 2026-10-03）
[^4]: 計画エージェント（レッドチームレンズ）『種資料03: 決裁パッケージに対するレッドチーム分析』2026-10-03. traceability/seed/seed-03-redteam-decision.md （参照箇所: §1〜§7、確認日: 2026-10-03）
[^5]: 『20年運用を前提とした認証・認可基盤提案のCTO/CISOレビュー』. 20年運用を前提とした認証・認可基盤提案のCTO CISOレビュー.md （参照箇所: 重大な不足, 進め方の再設計 Gate 0〜6, 必須の数値契約, 承認条件、確認日: 2026-10-03）
[^6]: 『マルチテナントSaaS認証・認可基盤の比較調査と設計指針』（旧提案書）. マルチテナントSaaS認証・認可基盤の比較調査と設計指針.md （参照箇所: 導入ロードマップ Phase 0〜3、確認日: 2026-10-03）
[^7]: 本リポジトリ『モック・契約試験キット仕様』（CON-11、版 0.4 draft。ラウンド 7 の追記は版 0.7 draft）2026-10-15. 11_contracts/mock-contract-test-kit.md （参照箇所: 要旨 7, §11 冒頭, §11.1, §14.2 の traceability/deliverables.md 行, 「残課題」表の 1。版 0.7 では §4.3 MK-02 の登録の行, §5.2 (c), §6.3 の CV-015〜CV-024、確認日: 2026-10-15）
[^8]: 本リポジトリ『契約一覧・規約』（CON-00、版 0.6 draft）2026-10-15. 11_contracts/README.md （参照箇所: 要旨 1, §2.1 の CON-12・CON-15 行, §2.3 の CON-15 行, §2.6.4, §9 申し送り 14、確認日: 2026-10-15）
[^9]: 本リポジトリ『ライフサイクルイベント契約』（CON-12、版 0.4.0 draft）2026-10-15. 11_contracts/lifecycle-events.asyncapi.yaml （参照箇所: §4 RO-9・RO-12, §4.1, §10 H5-1, x-open-issues LC-OI-3, x-state-query-api、確認日: 2026-10-15）
[^10]: 本リポジトリ『Client Registration API』（CON-14、版 0.2.0 draft）2026-10-15. 11_contracts/client-registration.openapi.yaml （参照箇所: description §4A.1〜§4A.5, x-negative-examples の CRN-21〜CRN-30, x-mock の MK-02, §9 H-12, paths /v1/sandbox/workloads・/v1/sandbox/exchange-pairs 配下の 5 operation、確認日: 2026-10-15）
[^11]: 本リポジトリ『ゲート計画と Plan B』（DCS-06、版 0.5 draft）2026-10-15. 00_decision/06-gate-plan-and-plan-b.md （参照箇所: §5.2.1 NA-DCS06-11, §5.2.2 の G0〜G2・G3 のキット・sandbox の行, 脚注 88、確認日: 2026-10-15）
[^12]: 本リポジトリ『ADR-009 workload identity・token exchange・委任の伝搬・内部取引 context』（版 0.1 draft、proposed）2026-10-15. 05_adr/ADR-009-workload-identity-token-exchange.md （参照箇所: D09-13（交換可能な組の登録簿。登録簿にない exchange を STS は拒否する）、確認日: 2026-10-15）
[^13]: 本リポジトリ『高保証 PoC 実測レポート（系統 1）』（POC-02、版 0.1 draft）2026-10-15. 12_poc/measurement-report.md （参照箇所: 冒頭の文書ID・版・状態・対応成果物（DL-81）・作成方法（作成者以外の確認なし）, 要旨 1・2, §3.1（凍結実行 50 件、2026-10-15T04:14Z の集約ハッシュ）, §7, §9 MR-11、確認日: 2026-10-15）
[^14]: 本リポジトリ『高保証 PoC 系統 1 独立再現ログ』（文書ID の表記は POC-04（仮）、版 0.1 draft）2026-10-15. 12_poc/reproduction-log.md （参照箇所: 冒頭の文書ID・作成方法（実装者と別の AI エージェント、独立立会人ではない）, 要旨 1〜6, §4 RL-P1, §7 生データの所在、確認日: 2026-10-15）
[^15]: 本リポジトリ『模擬パネル判定記録』TRC-10（DL-109）版 0.4（draft）. traceability/mock-panel-report.md （参照箇所: 冒頭の版・状態, §0, §4.2 MP-7-30, §7 申し送り 4、確認日: 2026-10-15）

---

## レビュー記録

### ラウンド 2（模擬パネル、2026-10-15、版 0.1 → 版 0.2）

> 模擬パネルは AI エージェントによる自己レビューであり、実在の CTO/CISO の決裁ではない（CONVENTIONS §8）[^1]。本節は本書のうち 11_contracts の採番に関わる是正だけを記録する。本書のそれ以外の変更（DL-115・DL-116 の追加ほか）は各行の備考に経緯がある [D]。

| # | 重大度・指摘者 | 指摘（要旨） | 対応 | 箇所 |
|---|---|---|---|---|
| R2-1 | High・devlead | §8 に CON-12・CON-13・client 登録の行がない。このため G-118（11_contracts 一式）と G-131（§8 のファイル一覧との差分 0 件）の確認対象から漏れている。文書ID「CON-13」を client 登録（仮番）とライフサイクル事象のスキーマ（案）の 2 ファイルが同時に名乗っている | **対応**。(1) §4.5 に DL-117（lifecycle-events.asyncapi.yaml）・DL-118（schemas/lifecycle-event.schema.json）・DL-119（client-registration.openapi.yaml）の行を加えた。(2) §8 の 11_contracts 表に CON-12／DL-117、CON-13／DL-118、CON-14／DL-119 の 3 行を加えた。CON-12・CON-13 は両ファイルが自称していた番号をそのまま確定し、client 登録は衝突を避けて CON-14 にした。(3) §6.1 の DEC-8 行と §5 の ADR-022 行の対応 DL に DL-117〜DL-119 を加えた（3 ファイルは連携契約 v1 の凍結の束に入るため。CON-00 §6.1）。(4) §7 の件数を DL 119 件・追加 85 件・計画ファイル数 169 に直した。(5) 3 ファイルとも、本書 §1 の「本書にないファイルを作る場合は、先に本書へ DL を追加する」と CON-00 §4.1 N-2 の順序を守らずに作られた。各行の内容欄にその経緯を残した [D] | §4（見出し）、§4.5、§5 の ADR-022 行、§6.1 の DEC-8 行、§7、§8 の 11_contracts 表、冒頭のメタ情報 |

**他文書への申し送り** [D]

| # | 対象文書 | 申し送る内容 |
|---|---|---|
| 1 | traceability/consistency-checks.md（DL-111） | G-131 の §8 差分検査を、本版の §8（169 行）に対して再実行する |
| 2 | traceability/traceability-matrix.md（DL-104） | DL-117〜DL-119 を R/G の追跡表に加え、孤児 DL にしない |
| 3 | 11_contracts/lifecycle-events.asyncapi.yaml（CON-12） | `x-document-id` と `x-deliverable` と description 冒頭の「（案）」を外す（本書で確定した） |
| 4 | traceability/G-goal-criteria.md | G-118・G-137 の申し送り行（458 行付近）の「例」を、確定した CON-12／DL-117・CON-13／DL-118 に更新する |

### ラウンド 4（模擬パネル、2026-10-15、版 0.2 → 版 0.3）

> 模擬パネルは AI エージェントによる自己レビューであり、実在の CTO/CISO の決裁ではない（CONVENTIONS §8）[^1]。

| # | 重大度・指摘者 | 指摘（要旨） | 対応 | 箇所 |
|---|---|---|---|---|
| R4-1 | High・devlead | CON-11 版 0.4 はキット本体を DL-82（PoC 基盤、納品済み）から分けて「DL-120 案」としたが、本書は DL-119 までしか定義せず、所有者・受入れ基準・期限を持つ DL がない（consistency-checks.md の未定義 ID）。並行開発の可否を決める成果物を、誰がいつ配布するか追跡できない | **対応**。(1) §4.6 に DL-120「契約試験キット本体」を加えた。パス 12_poc/code/contract-kit/README.md、所有者 PEP SDK・開発者支援チーム（案）、期限 G3、受入れ基準は MK-01〜MK-08 の起動記録・G-121 の 4 種の負例の再現ログ・§10.1 の判定の模擬 consumer での再現、DEC-8 第 1 段の入力であることを明記した。内容は CON-11 §14.2 の申し送り案に従い、原文を 2026-10-15 に確認した[^7]。(2) §2.3 に contract-kit の README を §8 の行に置く例外を書いた。(3) §6.1 の DEC-8 行の対応 DL を DL-117〜DL-120 にした。(4) §7 の件数を DL 120 件・追加 86 件・計画ファイル数 170 にした。(5) §8 の 12_poc 表に POC-04／DL-120 の行を加え、DL-82 の行に「キットを含まない」と書いた [D] | 冒頭のメタ情報、§2.3、§4（見出し）、§4.6、§6.1、§7、§8 の 12_poc 表、[^7] |

**他文書への申し送り（ラウンド 4）** [D]

| # | 対象文書 | 申し送る内容 |
|---|---|---|
| 1 | 11_contracts/mock-contract-test-kit.md（CON-11） | 「DL-120 案」「キット DL（DL-120 案）」を「DL-120」に改め、「残課題」表 1 の「前提としてキット DL（DL-120 案）を deliverables.md に登録する」を済とする（本書 版 0.3 で採番した） |
| 2 | 12_poc/code/README.md（POC-03） | キット本体（DL-120、12_poc/code/contract-kit/）を含まないことを一言記載する（CON-11 §14.2 の DL-82 行） |
| 3 | traceability/consistency-checks.md（DL-111） | DL-120 の未定義 ID の検出を再検査し、§8 の 170 行に対して G-131 の差分検査を再実行する |
| 4 | traceability/traceability-matrix.md（DL-104）・traceability/G-goal-criteria.md | DL-120 を R-062・R-071・R-172 と G-121・G-122 の追跡に加える（G-121・G-122 の確認対象が DL-80 の仕様だけになっている） |
| 5 | 00_decision/03-decision-items.md（DCS-03） | DEC-8 行の対象成果物に DL-120 を加える |
| 6 | 10_integration/onboarding.md（INT-04） | CON-11 §14.2 に挙がる「キット本体（DL-82）は未実装」の類を「DL-82（PoC 基盤）は納品済み。キット本体 DL-120 は未実装（期限 G3）」に改める（本ラウンドの担当外） |

### ラウンド 6（模擬パネル、2026-10-15、版 0.3 → 版 0.4）

> 模擬パネルは AI エージェントによる自己レビューであり、実在の CTO/CISO の決裁ではない（CONVENTIONS §8）[^1]。

| # | 重大度・指摘者 | 指摘（要旨） | 対応 | 箇所 |
|---|---|---|---|---|
| R6-1 | High・devlead | CON-15（案）は照会 API の契約本体として CON-12 §4.1 で起票され、CON-00 §2.1・§3 にも行があるが、DL-121（案）が本書に未登録で、consistency-checks（DL-111）では未定義 ID となり、G-118・G-131 の確認対象から漏れる。DEC-8 行の対象成果物も DL-117〜DL-120 で止まっている。契約本体が AsyncAPI の `x-` 拡張欄の中にあり、連携開発者は OpenAPI の codegen・Prism・lint を単独ファイルとして直接使えない。CON-00 §2.3 の起動記録は作成者が一時的に切り出したファイルによる | **対応（本書の担当分）**。(1) §4.5 に DL-121「ライフサイクル状態の照会 API（CON-15）」を加えた。パス 11_contracts/lifecycle-state.openapi.yaml、R-044・R-109／G-137・G-118・G-138、所有者 DL-49 の所有者＋プラットフォームチーム長、期限 DEC-8 第 1 段の付議前、受入れ基準（内容を変えない切出し、単独ファイルでの lint・examples 検証・Prism 起動の記録、独立レビュー）を書いた。パス・所有者・期限・切出しの方針は CON-00 §2.1・§9 申し送り 14 と CON-12 §4.1・§10 H5-1・LC-OI-3 の原文を 2026-10-15 に確認して写した[^8][^9]。DL-121 が本書と 11_contracts 以外の全文書で未使用であることを同日にリポジトリ検索で確かめた [D]。(2) §6.1 の DEC-8 行を DL-117〜DL-121 に、§5 の ADR-022 行に DL-121 を加えた（ラウンド 2 と同じく、連携契約 v1 の凍結の束に入るため）。(3) §7 を DL 121 件・追加 87 件・計画ファイル数 171 にした。(4) §8 の 11_contracts 表に CON-15／DL-121 の行を加え、「未作成」と明記した。(5) CON-00 §2.3 の Prism・lint の記録は単独ファイルの記録ではないことを DL-121 の行に書き、受入れ基準 (2) で単独ファイルでの再取得を求めた。(6) 単独ファイルへの切出しは本書の担当外のため、下の申し送り 1 にした [D] | 冒頭のメタ情報、§4（見出し）、§4.5、§5 の ADR-022 行、§6.1 の DEC-8 行、§7、§8 の 11_contracts 表、[^8]・[^9] |

**他文書への申し送り（ラウンド 6）** [D]

| # | 対象文書 | 申し送る内容 |
|---|---|---|
| 1 | 11_contracts/lifecycle-events.asyncapi.yaml（CON-12） | `x-state-query-api` の値を内容を変えずに 11_contracts/lifecycle-state.openapi.yaml へ切り出し、CON-12 には参照（パスと版）だけを残す。H5-1 (b) の「DL-121 を確定する」を済とし、§4.1・LC-OI-3・x-state-query-api 内の「CON-15（案）・DL-121（案）」の「案」を外す（本書 版 0.4 で採番した） |
| 2 | 11_contracts/lifecycle-state.openapi.yaml（CON-15、新規） | 冒頭に文書ID CON-15・成果物 DL-121 を置き、単独ファイルで Redocly lint・examples と負例の検証・Prism 起動を再実行して記録する（DL-121 受入れ基準 (2)） |
| 3 | 11_contracts/README.md（CON-00） | §2.1 の CON-15 行の所在を単独ファイルに改め、SHA-256 を別に取る。§2.3 の CON-15 行を単独ファイルでの検査結果に置き換える。§9 申し送り 14 を済とする |
| 4 | traceability/consistency-checks.md（DL-111） | DL-121 の未定義 ID の検出を再検査し、§8 の 171 行に対して G-131 の差分検査を再実行する（lifecycle-state.openapi.yaml の作成前は「計画済み・未作成」として扱う） |
| 5 | traceability/traceability-matrix.md（DL-104）・traceability/G-goal-criteria.md | DL-121 を R-044・R-109 と G-137・G-118・G-138 の追跡に加える |
| 6 | 00_decision/03-decision-items.md（DCS-03） | DEC-8 行の対象成果物に DL-121 を加える（CON-12 §10 H3-2 の前提条件の明記と合わせる） |

### ラウンド 7（模擬パネル、2026-10-15、版 0.4 → 版 0.5）

> 模擬パネルは AI エージェントによる自己レビューであり、実在の CTO/CISO の決裁ではない（CONVENTIONS §8）[^1]。是正は本書と CON-11（11_contracts/mock-contract-test-kit.md）の 2 ファイルだけで行い、他文書の修正は下の申し送りにした [D]。

| # | 重大度・指摘者 | 指摘（要旨） | 対応 | 箇所 |
|---|---|---|---|---|
| R7-1 | High・devlead | CON-14 版 0.2.0 §4A で、C7 の workload（SVID 登録エントリ）と交換可能な組の sandbox セルフ登録の契約（5 operation、x-mock の MK-02 案、負例 CRN-21〜CRN-30）が preview で作られたが、CON-11 v0.6 §5.2 (c) は「workload のセルフ登録の契約はまだない」のままで、§4.0 には解消済みの仮番の記述が残り、MK-02 は登録を持たず、CON-14 §9 H-12 は未適用である。DL-120 の受入れ基準 (1)〜(3) にも workload・組の登録がない。このまま G3 でキットを受け入れると、P-03 を使う大多数のチームが sandbox で exchange の結合試験に進めない（ADR-009 D09-13）。DEC-10 で承認するキットの費目の範囲と、DEC-8 第 1 段の入力の範囲が食い違う | **対応（本書の担当分）**。(1) §4.6 の DL-120 の受入れ基準に (4)「sandbox の workload・交換可能な組の登録（CON-14 §4A の 5 operation）が MK-02 で動き、CRN-28 を再現した記録」を加え、対応 G に G-141(c) を加えた。5 operation の名前、CRN-28 の期待結果（202 pending_callee_approval の間 MK-02 は exchange を拒否）、x-mock の MK-02 案、H-12 は CON-14 の原文を、登録簿にない exchange の拒否は ADR-009 D09-13 の原文を、2026-10-15 に確認して写した[^10][^12]。(2) DCS-06 §5.2.2 のキット費目（NA-DCS06-11）との関係を同じ行に注記した。同費目は本書 版 0.3 の DL-120 の定義を範囲として積まれ（DCS-06 脚注 88）、MK-02 は範囲内なのでモック側の (4) は内数と扱うが、工数の幅に収まるかは未確認であり、共有 sandbox 上の実際の登録 API（CON-14 §4A.5）が同費目に入るかも明記されていないことを書いた。値は DCS-06 版 0.5 の原文を 2026-10-15 に確認した[^11]。費目の範囲の確定は DCS-06 の担当の判断なので、下の申し送り 1 にした。(3) §8 の 12_poc 表の DL-120 行に (4) の追加を記した。(4) CON-11 の §4.3・§5.2 (c)・§4.0・§6.3 の是正は同じラウンドで CON-11 版 0.7 として行った（同書「レビュー記録」ラウンド 7）[^7] [D] | 冒頭のメタ情報、§4.6 の DL-120 行、§8 の 12_poc 表、[^7]・[^10]〜[^12] |

- 新たに確認した外部原典: なし。根拠はいずれもリポジトリ内の文書（CON-14 版 0.2.0、ADR-009、DCS-06 版 0.5）の原文である [D]。
- 未解決として残すもの: (1) (4) の工数がキット費目の幅に収まるか、共有 sandbox の登録 API が同費目に入るかの判定（申し送り 1）。(2) CRN-21〜CRN-30 の TC-ID（申し送り 3）。(3) MK-02 と共有 sandbox の登録 API・PoC の STS の一致（TC-026）は未測定 [D]。
- 対応件数: 1 件（対応済み 1、他文書への申し送り 4 項目）[D]。

**他文書への申し送り（ラウンド 7）** [D]

| # | 対象文書 | 申し送る内容 |
|---|---|---|
| 1 | 00_decision/06-gate-plan-and-plan-b.md（DCS-06）§5.2.1 NA-DCS06-11・§5.2.2 のキット・sandbox の 2 行 | キット費目が DL-120 の受入れ基準 (4)（MK-02 の workload・交換可能な組の登録と CRN-28 の再現）を含むか、共有 sandbox の構築の費目が CON-14 §4A.5 の実際の登録 API の実装を含むかを注記する。含まない場合は、幅の見直しを DEC-10 の決議文案に反映するか、範囲外の費用の扱い（DEC-11（仮）か Plan）を書く。脚注 88 の参照先を TRC-03 版 0.5 に改める |
| 2 | 00_decision/03-decision-items.md（DCS-03）DEC-8・DEC-10 の行 | DEC-8 第 1 段の入力（DL-120 の受入れ）に (4) が加わったことを、DEC-10 で承認するキット費目の範囲と同じ記述にそろえる（申し送り 1 の結果に従う） |
| 3 | 12_poc/preregistered-test-plan.md（DL-22） | CON-14 の CRN-21〜CRN-30（CON-11 の CV-015〜CV-024）の TC-ID を採番し、TC-026（モックと PoC 基盤の一致）の対象に MK-02 の登録簿の照合を含める。PoC の STS は `config/ledger.json` の `exchange_registry` を起動時に読むだけで登録 API がない（CON-14 §4A.5）ことを前提に書く |
| 4 | traceability/traceability-matrix.md（DL-104）・traceability/G-goal-criteria.md | DL-120 を G-141(c) の追跡に加える |

### ラウンド 7 sre（模擬パネル、2026-10-15、版 0.5 追補）

> 模擬パネルは AI エージェントによる自己レビューであり、実在の CTO/CISO の決裁ではない（CONVENTIONS §8）[^1]。上の devlead の節とは別の担当による是正である。

| # | 重大度・指摘者 | 指摘（要旨） | 対応 | 箇所 |
|---|---|---|---|---|
| R7-S1 | High・sre | ラウンド 3 の重点論点「状態表示の陳腐化」が再発している。作業ツリーには 12_poc/measurement-report.md（POC-02 版 0.1、draft）があり、凍結実行 50 件・集約ハッシュ `401e8671…`（04:14Z）・28 TC の内訳（合格 12・不合格 5・判定保留 4・中止 2・未実施 5）を報告しているのに、表紙・要約・POA&M は DL-81 を未作成として扱っている。本書の DL-81 行の状態を draft にすることを求める | **対応**。12_poc/measurement-report.md を直接読み、冒頭の文書ID POC-02・版 0.1・状態 draft・対応成果物 DL-81 と、§3.1 の 50 件・集約ハッシュを確かめた。2026-10-15T04:45Z に 12_poc/data/ から POC-02 §3.1 と同じ手順で集約ハッシュを再計算し、一致を確かめた（50 件、`401e8671…`）[D][^13]。§4.6 の DL-81 行に状態（draft、版 0.1、作成者以外の確認未実施、git 未追跡）と Gate 4 の証拠にしないことを加え、§8 の行の備考に状態を記した。DL の定義と件数は変えていない。表紙（DCS-00 §6 付属 H・§8 の 2）、要約（DCS-01 §10.1）、POA&M（TRC-11 の要旨・OI-C18・OI-M02）は同じラウンドで改めた | §4.6 DL-81 行、§8 の 12_poc/ |

- 新たに確認した外部原典: なし。根拠はリポジトリ内の POC-02 と 12_poc/data/ の生データである [D]。
- 対応件数: 1 件（対応済み 1、他文書への申し送り 2 項目）[D]。

**他文書への申し送り（ラウンド 7 sre）** [D]

| # | 対象文書 | 申し送る内容 |
|---|---|---|
| 1 | traceability/traceability-matrix.md（DL-104） | 「計画済みで未作成の DL」（2 件）、未作成 DL の記述、DL-81 の行（「**未作成**（… measurement-report.md は未作成）」）を、DL-81 は作成済み（POC-02 版 0.1、draft、作成者以外の確認未実施。Gate 4 の実測は未了）に改め、未作成 DL を DL-59 の 1 件にする。2026-10-15T04:45Z の確認では同書の 116 行・138 行・992 行が「未作成」のままである |
| 2 | traceability/consistency-checks.md（DL-111） | §8 にあって未作成のファイルの検査を再実行し、12_poc/measurement-report.md を未作成から外す。あわせて、本書 §8 にあり作業ツリーに存在するファイルを表紙・要約・POA&M が「未作成」と書く場合を不一致として出す検査を常設する（DCS-00 C-12・C4-9・C7-6 と同件） |
### PoC/R7反映（2026-10-15、版 0.5 → 版 0.6）

> 作業担当の AI エージェント（Claude）による反映であり、模擬パネルの判定でも実在の CTO/CISO の決裁でもない（CONVENTIONS §8）[^1]。

| # | 契機 | 対応 | 箇所 |
|---|---|---|---|
| PR7-1 | 独立再現ログ（12_poc/reproduction-log.md）の作成 | §8 に行を加え、§4.6 の DL-81 行に関連ファイルとして記した。本文の文書ID「POC-04（仮）」は §8 の DL-120（12_poc/code/contract-kit/README.md）の POC-04 と衝突するため、本書では POC-05（案）とした | §4.6、§7、§8 |
| PR7-2 | TRC-10 申し送り 4（DL-109 の版） | DL-109 行に TRC-10 版 0.4 の状態を記した | §4.8 |
| PR7-3 | 模擬パネル ラウンド 7 の MP-7-30（Low、cfo。DEC の範囲が DEC-1〜DEC-9 のまま） | §6.1 の見出しと表に DEC-10・DEC-11（仮）を加えた。CONVENTIONS.md は申し送り 1 とした | §6.1 |

- DL の定義・件数（121）は変えていない [D]。作成者以外の確認は未実施である [D]。

**他文書への申し送り（PoC/R7反映）** [D]

| # | 対象文書 | 申し送る内容 |
|---|---|---|
| 1 | CONVENTIONS.md §2 | DEC-n の定義場所の行の範囲「DEC-1〜DEC-9」を「DEC-1〜DEC-10、将来の決裁単位 DEC-11（仮）」に改める（MP-7-30、C-7・TR-17・R3S-6） |
| 2 | 12_poc/reproduction-log.md | 冒頭の文書ID「POC-04（仮）」を、DL-120 の POC-04 と衝突しない ID（案: POC-05）に改める。改めた後に、引用する文書（DCS-00・DCS-01・DCS-03・DCS-05・TRC-11 ほか）の表記を揃える（POA&M の OI-C40） |
| 3 | traceability/consistency-checks.md（DL-111） | §8 の文書ID 列の重複を検出する検査を加える（POC-04 の衝突の再発防止） |
