# 汎用共通認証・認可基盤 再提案プログラム

> 文書ID: GEN-01 / 版: 0.1 / 状態: draft / 最終更新: 2026-10-15
> 対応要求: R-197, R-198, R-199, R-202（DL-35 の対応要求）。G-001, G-002, G-016, G-025（主なもの）
> 依存文書: CONVENTIONS.md, traceability/deliverables.md, traceability/G-goal-criteria.md, research/README.md, 00_decision/00-cover.md, traceability/change-log.md
> 作成方法: AI エージェント（Claude）が、2026-10-15 時点のリポジトリ全体（各文書の冒頭メタ情報、成果物計画、調査総覧、ワークフロー定義 .workflows/、git 履歴）を読み、案内用にまとめた。新しい原典調査は行っていない。状態一覧は各文書の冒頭メタ情報の転記である。本書の記述は自己レビューであり、作成者以外による照合は未実施である。
> 表の注記: 表のセルでタグのないものは、各文書の記載の転記・集計（設計推論 [D]）であり、この注記で個別のタグに代える。

---

## 1. 目的

- 本リポジトリは、汎用の共通認証・認可基盤を再提案するための検討一式である [D][^1]。
- 旧提案書[^2]は CTO/CISO レビュー[^3]で「本番基盤としては不承認、Phase 0 の高保証設計・実証だけ条件付き承認」と判定された。本プログラムは、そのレビューの指摘を要求 R-001〜R-283 に原子化し、全件に閉じ方（机上・組織決定・実測・第三者）を割り当てて応える [D][^3][^4]。
- 次回決裁で求めるのは、Gate 0（統治）の決裁、不可逆 ADR v1 の承認、Gate 4 高保証 PoC への条件付き入場、連携契約 v1 の条件付き凍結、Plan B の事前承認（DEC-1〜DEC-9）までである。本番化・全社標準化・移行強制・対外的な安全性表明は求めない [D][^5]。
- 2026-10-15 時点で、決議済みの DEC は 0 件である [D][^5]。本リポジトリのどの文書も、実在の経営・CTO・CISO の承認を得ていない [D]。

### 1.1 前提（汎用・仮置き）

前提はすべて仮定であり、差し替えられるように前提台帳（A-001〜A-079）に登録している [D][^1][^6]。

| 項目 | 基準シナリオの暫定値 |
|---|---|
| 事業規模 | 1000億円規模のシステム群（複数事業ドメイン、複数開発ベンダーによる並行開発） |
| 利用者 | 登録 100万人（B2B 顧客企業ユーザー、一般利用者、社内従業員の混在） |
| テナント | B2B 顧客組織 約1万、最大テナント 約10万ユーザー |
| 依存サービス | 約300 マイクロサービス／約30 事業ドメイン／開発チーム・ベンダー 約20〜30 |
| 法域 | 日本（主）、EU/英国、米国。業界規制（金融・医療・決済）を持つ顧客を含み得る |
| 計画期間 | 20年（3〜5年ごとに継続・置換を再決裁） |

## 2. ゴール

### 2.1 ゴール原文

以下は受領したゴールの原文であり、改変せずに転記する（受領日: 2026-10-03）[D][^7]。

> 20年戦っている完全無欠の汎用共通認証認可基盤を検討し、その検討手法や調査範囲、どのようにその設計方針としたのか、など設計妥当性についてCTO/CISOレベルが納得し、1000億円規模の超大規模システムと100万人が利用する超高度な認証認可基盤として成立すると認められる状態。この認証認可基盤とこの基盤に依存するあらゆるサービスやマイクロサービス、システムが、どのように認証認可基盤と連携すればそのサービスがやりたいことを実現でき、柔軟にアクセスコントロールできるかが示されており、同時並行的に他システムの開発も進められる状態であること

### 2.2 再定義の考え方

- 原文には、そのままでは誰も合否を判定できない表現（「20年戦っている」「完全無欠」「あらゆる」「超大規模」「納得し」「成立すると認められる」など）が含まれる。判定できない基準には判定者が署名できず、決裁に使えない [D][^7]。
- そこで、原文の意図を先に書き、その意図を満たす観測可能な状態へ言い換えた。言い換えはゴールの縮小ではなく、判定が厳しくなる側に寄せる。たとえば「完全無欠」という自己評価は文書を書くだけで主張できるが、言い換え後の基準は第三者評価と実測の証拠を要する [D][^7]。
- 言い換えの全表（10 表現）、約束しないもの（事故ゼロ、特定製品の 20 年継続使用、費用一定、次回決裁での本番承認など）、受入基準 G-001〜G-151 は traceability/G-goal-criteria.md にある [D][^7]。

### 2.3 再定義後のゴール

traceability/G-goal-criteria.md §2.4 の再定義を転記する [D][^7]。

> 認証認可基盤の検討手法、調査範囲とその限界、設計判断の導出過程が第三者に追跡でき、定義した攻撃者モデルと脅威の全件について統制・証拠・残余リスクの受容者が示されている。1000億円規模・利用者100万人の定量前提に対して、容量・可用性・費用・体制・移行が成り立つことが数値契約と実測で示されている。20年の計画期間にわたって構成要素を置換・移行・撤退できる構造と、それを定期的に証明し直す統治がある。基盤に依存するサービスは、固定したサービス種別一覧の全種別について連携方法が示され、連携パターン・契約・モック・試験キット・共有 sandbox・オンボーディング手順・問い合わせ体制によって、基盤の完成を待たずに複数のチームが並行して開発と適合判定ができ、アクセス制御の柔軟性は4つの指標の目標値と実測で測られている。そのうえで、実在の経営・CTO・CISOがこれらを根拠に段階ごとの決裁を行い、その記録が残っている。

### 2.4 到達段階と本リポジトリで到達できる範囲

- G は到達段階を 3 つに分けて判定する。次回決裁で認められ得るのは段階1（決裁可能）までであり、段階2（PoC・独立保証による実証）と段階3（本番運用実績）は後続のゲートで判定する [D][^7]。
- 本リポジトリ内で閉じられるのは区分 A（机上）までである。区分 B（組織決定）は決裁案・選択肢・様式まで、区分 C（実測）は事前登録した試験計画と PoC 系統1の実測まで、区分 D（第三者）は計画と RFP/SOW までを置く [D][^1][^4]。
- 経営承認・第三者評価・本番運用実績が必要な事項は「未達」として残課題台帳（traceability/open-items.md、POA&M 127 行）に載せており、達成済みとは書いていない [D][^1][^8]。

## 3. ディレクトリ構成

成果物の DL-ID・文書ID・作成 Phase の正本は traceability/deliverables.md（DL-01〜DL-115、計画ファイル 141）である [D][^4]。

| ディレクトリ | 内容 | 主な ID の定義場所 |
|---|---|---|
| （ルート） | 本書、執筆規約 CONVENTIONS.md、旧提案書とレビュー原文（baseline、編集しない） | — |
| 00_decision/ | 決裁パッケージ（表紙、エグゼクティブ要約、旧指摘対照、決裁事項、憲章、残余リスク、ゲート計画と Plan B、体制と TCO、代替案比較） | DEC-1〜DEC-9（03-decision-items.md） |
| 01_governance/ | 前提台帳、リスク選好案、損失シナリオ、BIA、RACI、停止権限、例外・リスク受容、KRI、20年耐久性憲章 | A-xxx、S-xx、K-xx |
| 02_requirements/ | 主体目録、ID ライフサイクル、操作リスク階層と保証水準、データ分類、テナントライフサイクル、顧客管理者の責任分界、現状棚卸し | 操作 5 分類 |
| 03_threat-model/ | DFD と入口、攻撃者モデル、脅威カタログ、不正利用対策、事故事例集 | ATK-xx、T-xxx |
| 04_architecture/ | 参照アーキテクチャ v2 と詳細 14 文書（token profile、信頼の起点、workload identity、認可モデル、PEP 契約、cell、fail-mode、失効、監査、PEP 外データ、進化と PQC、容量、製品評価と出口、claim 目録）、整合調整記録 | — |
| 05_adr/ | ADR 索引（README.md）と ADR-001〜ADR-029、整合調整記録 | ADR-0xx |
| 06_controls/ | 統制対応台帳、適用性、枠組み別の対応（mappings/） | C-xxx |
| 07_slo/ | 数値契約（BIA→許容度→SLO→実測の導出の鎖） | SLI-xxx |
| 08_operations/ | 侵害対応 runbook、運用モデル、TCO・ベンダー・LTS、段階導入計画 | RB-xx |
| 09_assurance/ | 独立保証計画、pentest・red team 計画、OIDF 適合試験計画、自己評価、RFP/SOW、継続的保証計画 | — |
| 10_integration/ | 連携ハンドブック（依存階層、連携パターン、認可モデリングガイド、オンボーディング、Definition of Ready、FAQ） | P-xx |
| 11_contracts/ | 連携契約（OpenAPI・JSON Schema）、互換・非推奨方針、モック・契約試験キット、独立レビュー記録（review-notes/） | CON-xx |
| 12_poc/ | 事前登録した PoC 試験計画、PoC コード（code/）、実測レポート（予定） | TC-xxx |
| research/ | 調査総覧、標準ステータス台帳、調査ノート RS-01〜RS-18、独立検証記録（verification/） | RS-xx |
| research_notes/、reports/ | RS-18 の deep research の作業メモと、RS-18 本文と同一内容の報告書 | — |
| traceability/ | 要求 R、受入基準 G、成果物計画、追跡表、主張台帳、引用監査、見解相違、棄却仮説、残課題、変更履歴、Phase 1 批評、種資料（seed/） | R-xxx、G-xxx、DL-xx、CL-xxxx |
| .workflows/ | Phase 3〜5 のワークフロー定義（エージェントへの指示と工程の記録） | — |

## 4. 読む順番（ペルソナ別）

各ペルソナの順番は、旧レビューの承認条件[^3]と各文書の依存関係から組んだ設計推論である [D]。

### 4.1 決裁者（経営、CTO、CISO、CFO）

| 順 | 文書 | 目的 |
|---|---|---|
| 1 | 00_decision/00-cover.md | 決裁事項の 1 行要約、承認者、付属 A〜L の索引 |
| 2 | 00_decision/01-executive-summary.md | 1 枚で判断するための要約（全文に主張タグ） |
| 3 | 00_decision/03-decision-items.md | DEC-1〜DEC-9 の選択肢・推奨・帰結・可逆性・承認者 |
| 4 | 00_decision/02-prior-findings-crosswalk.md | 旧レビューの指摘 R 全件がどう閉じたか、何が未達か |
| 5 | 00_decision/05-residual-risk-register.md | 受容を求める残余リスクと受容者案 |
| 6 | 00_decision/06-gate-plan-and-plan-b.md、07-organization-and-tco.md、08-alternatives-comparison.md | ゲートと中止基準、Plan B、費用と要員、代替案 |
| 7 | traceability/open-items.md | 未達事項（経営承認・実測・第三者評価・本番実績） |
| 8 | traceability/mock-panel-report.md（Phase 4 で作成予定） | 模擬パネルの判定。自己レビューであり実在の決裁ではない |

### 4.2 アーキテクト・セキュリティ担当

| 順 | 文書 | 目的 |
|---|---|---|
| 1 | CONVENTIONS.md | 主張タグ、二次情報の扱い、禁止表現、閉じ方の区分 |
| 2 | 01_governance/assumptions-register.md、loss-scenarios.md、02_requirements/operation-risk-tiers-assurance.md | 前提、守るもの、操作階層 |
| 3 | 03_threat-model/（attacker-model → threat-catalog → dfd-entry-points → fraud-abuse-controls → incident-casebook） | 攻撃者モデルと脅威 |
| 4 | 04_architecture/reference-architecture-v2.md、続いて詳細文書 | 構成と各性質の設計 |
| 5 | 05_adr/README.md、続いて不可逆決定（DEC-3 対象: ADR-001・007・013・021・022）から各 ADR | 判断、却下案、可逆性、再検討トリガー |
| 6 | 06_controls/、07_slo/numeric-contracts.md、08_operations/compromise-runbooks.md | 統制・数値契約・侵害対応 |
| 7 | 12_poc/preregistered-test-plan.md | 何を実測で確かめるか（事前登録した合否基準） |
| 8 | research/README.md と該当する RS-xx・検証記録 | 設計判断の原典をたどる |
| 9 | traceability/rejected-hypotheses.md、dissent-log.md | 棄却した案 215 件と見解相違 |

### 4.3 連携開発者（依存サービスのチーム・ベンダー）

| 順 | 文書 | 目的 |
|---|---|---|
| 1 | 10_integration/README.md | ハンドブック総覧、依存してよい契約と依存してはならない実装、問合せ経路 |
| 2 | 10_integration/dependency-tiers.md、integration-patterns.md | 自サービスの依存階層と連携パターン（P-xx）を決める |
| 3 | 10_integration/authz-modeling-guide.md | 自サービスのアクセス制御モデルを設計する（階層・グループ・管理範囲の型） |
| 4 | 11_contracts/README.md と該当する契約（authorization-api、token-exchange、access-token-claims、scim、audit-event、ssf-caep など） | 依存してよい唯一の面 |
| 5 | 11_contracts/mock-contract-test-kit.md | 基盤の完成を待たずにモックで開発・適合判定する |
| 6 | 10_integration/onboarding.md、definition-of-ready.md、developer-faq.md | 着手条件、手順、よくある疑問 |
| 7 | 04_architecture/claims-catalog.md、pep-contract.md | claim の意味と PEP の義務の詳細 |

### 4.4 監査人（内部監査、独立評価者）

| 順 | 文書 | 目的 |
|---|---|---|
| 1 | CONVENTIONS.md §3〜§8 | 主張の根拠条件と誠実性の規則 |
| 2 | traceability/R-requirements.md、G-goal-criteria.md、deliverables.md | 要求・受入基準・成果物の定義 |
| 3 | traceability/traceability-matrix.md、00_decision/02-prior-findings-crosswalk.md | R/G から成果物・証拠への追跡と、検証者の記録 |
| 4 | traceability/claims-ledger.md、citation-audit-proposal.md、citation-audit-review.md | 旧提案書・レビューの主張と引用の照合結果 |
| 5 | research/README.md §1・§2.2・§3、research/verification/ | 調査手法、原典照合の結果、限界 |
| 6 | 各文書末尾の「レビュー記録」、11_contracts/review-notes/、05_adr/reconciliation-notes.md、04_architecture/architecture-reconciliation-notes.md | 作成者以外による是正の記録 |
| 7 | traceability/dissent-log.md、rejected-hypotheses.md、open-items.md | 相違・棄却・未達の開示 |
| 8 | 09_assurance/ | 独立保証・適合試験の計画と RFP/SOW |
| 9 | traceability/change-log.md、git 履歴 | 版と変更の追跡 |

## 5. 各文書の状態一覧（2026-10-15 時点）

- 状態は CONVENTIONS §1 の区分（draft / review / frozen）である。frozen の文書はまだない [D]。ADR の状態欄の「proposed」は決裁前を意味し、CONVENTIONS の区分では draft にあたる [D]。
- 「review」は、作成者以外のエージェントによるレビュー・検証を経た版を示す記載であり、人による確認を意味しない [D]。
- 「未コミット」は 2026-10-15 時点で作業ツリーにあり、git に記録されていないもの、「未作成」は計画にあるがまだ存在しないものを示す [D]。

### 5.1 00_decision/〜03_threat-model/

| ファイル | 文書ID | 版 | 状態 | 最終更新 |
|---|---|---|---|---|
| 00_decision/00-cover.md 〜 08-alternatives-comparison.md（9 文書） | DCS-00〜DCS-08 | 0.1 | draft（未コミット、Phase 4 で作成中） | 2026-10-15 |
| 01_governance/（9 文書） | GOV-01〜GOV-09 | 0.1 | draft | 2026-10-03 |
| 02_requirements/principal-catalog.md | REQ-01 | 0.2 | draft（RS-18 反映、未コミット） | 2026-10-15 |
| 02_requirements/ のその他 6 文書 | REQ-02〜REQ-07 | 0.1 | draft | 2026-10-03 |
| 03_threat-model/dfd-entry-points.md | THR-01 | 0.1 | draft | 2026-10-15 |
| 03_threat-model/ のその他 4 文書 | THR-02〜THR-05 | 0.1 | draft | 2026-10-03 |

### 5.2 04_architecture/

| ファイル | 文書ID | 版 | 状態 |
|---|---|---|---|
| reference-architecture-v2.md | ARC-01 | 0.2 | review |
| token-profile.md | ARC-02 | 0.2 | review |
| root-of-trust.md | ARC-03 | 0.2 | review |
| workload-identity-delegation.md | ARC-04 | 0.2 | review |
| authorization-model.md | ARC-05 | 0.3 | review（RS-18 反映、未コミット） |
| pep-contract.md | ARC-06 | 0.2 | review |
| cell-blast-radius.md | ARC-07 | 0.2 | review |
| fail-mode-matrix.md | ARC-08 | 0.2 | draft |
| revocation-continuous-evaluation.md | ARC-09 | 0.2 | draft |
| audit-privacy.md | ARC-10 | 0.2 | draft |
| data-outside-pep.md | ARC-11 | 0.2 | review |
| evolution-pqc.md | ARC-12 | 0.2 | review |
| capacity-model.md | ARC-13 | 0.2 | review |
| product-evaluation-exit.md | ARC-14 | 0.2 | review |
| claims-catalog.md | ARC-15 | 0.3 | draft（独立レビュー反映済み、RS-18 反映、未コミット） |
| architecture-reconciliation-notes.md | ARC-RN | 0.1 | draft |

最終更新はいずれも 2026-10-15 である [D]。

### 5.3 05_adr/

| 区分 | ADR | 版 | 状態 |
|---|---|---|---|
| 索引・整合調整 | ADR-000（README.md）、ADR-RN（reconciliation-notes.md） | 0.1 | draft |
| 主要 ADR（Wave A、3 レンズ起草＋judge panel） | ADR-001, 005, 007, 010, 011, 013, 021, 022 | 0.1 | proposed（決裁前）。ADR-011・ADR-021 は RS-18 反映の追記あり（未コミット） |
| 残りの ADR（Wave B、単独起草＋独立レビュー） | ADR-002〜004, 006, 008, 009, 012, 014〜020, 023〜029 | 0.1〜0.2 | proposed（決裁前） |
| DEC-3 対象（不可逆） | ADR-001, 007, 013, 021, 022 | — | 決裁前 |

### 5.4 06_controls/〜12_poc/

| ファイル | 文書ID | 版 | 状態 |
|---|---|---|---|
| 06_controls/control-mapping-ledger.md | CTL-01 | 0.1 | draft |
| 06_controls/applicability.md | CTL-02 | 0.1 | draft |
| 06_controls/mappings/（4 文書） | CTL-03〜CTL-06 | 0.1 | draft |
| 07_slo/numeric-contracts.md | SLO-01 | 0.1 | draft（数値の多くは TBD と所有者・決め方を記載） |
| 08_operations/（4 文書） | OPS-01〜OPS-04 | 0.1 | draft（作成者以外のレビュー記録なし） |
| 09_assurance/（5 文書） | ASR-01, ASR-03〜ASR-06 | 0.1 | draft |
| 09_assurance/pentest-redteam-plan.md | ASR-02 | — | 未作成 |
| 10_integration/README.md、onboarding.md、definition-of-ready.md、developer-faq.md | INT-00, INT-04〜INT-06 | 0.1 | draft（作成者以外のレビュー記録なし） |
| 10_integration/dependency-tiers.md、integration-patterns.md | INT-01, INT-02 | 0.2 | draft（独立レビュー反映） |
| 10_integration/authz-modeling-guide.md | INT-03 | 0.3 | draft（RS-18 反映、未コミット） |
| 11_contracts/README.md、mock-contract-test-kit.md | CON-00, CON-11 | 0.2 | draft |
| 11_contracts/compatibility-deprecation-policy.md | CON-01 | 0.2 | review |
| 11_contracts/ の契約 9 ファイル（OpenAPI 5・JSON Schema 4） | CON-02〜CON-10 | 0.1〜0.2 | draft（各 review-notes/CON-xx.md に独立レビュー記録） |
| 12_poc/preregistered-test-plan.md | POC-01 | 0.1 | draft（系統1 TC-001〜TC-028 をコミット 151940a で凍結扱い。Phase 5 ワークフロー定義による） |
| 12_poc/code/ | POC-03 | — | 作成中（未コミット、README.md 未作成） |
| 12_poc/measurement-report.md、12_poc/data/ | POC-02 | — | 未作成（Phase 5） |

### 5.5 research/ と traceability/

| ファイル | 文書ID | 版 | 状態 | 最終更新 |
|---|---|---|---|---|
| research/README.md | RES-00 | 0.1 | draft | 2026-10-03 |
| research/standards-status.md | RES-01 | 0.1 | draft | 2026-10-03 |
| research/RS-01〜RS-17 | RS-01〜RS-17 | 0.2 | review 5 件（RS-02・03・06・10・13）、draft 12 件 | 2026-10-03 |
| research/verification/（17 文書） | RS-xx-V 等 | 0.1〜1.0 | review | 2026-10-03 |
| research/RS-18-hierarchy-modeling.md | （メタ情報なし） | — | 独立検証記録なし（§6.3） | 2026-10-15 |
| traceability/R-requirements.md、G-goal-criteria.md | TRC-01, TRC-02 | 0.2 | draft | 2026-10-03 |
| traceability/deliverables.md、claims-ledger.md、citation-audit-proposal.md、citation-audit-review.md、dissent-log.md、phase1-critique-G.md | TRC-03, 05, 06, 06-R, 07, 15 | 0.1 | draft | 2026-10-03 |
| traceability/phase1-critique-R.md | TRC-14 | 0.1 | review | 2026-10-03 |
| traceability/rejected-hypotheses.md | TRC-08 | 0.1 | draft | 2026-10-15 |
| traceability/traceability-matrix.md、open-items.md | TRC-04, TRC-11 | 0.1 | draft（未コミット） | 2026-10-15 |
| traceability/change-log.md | TRC-13 | 0.1 | draft | 2026-10-15 |
| traceability/independent-challenge-review.md、mock-panel-report.md、consistency-checks.md | TRC-09, TRC-10, TRC-12 | — | 未作成（Phase 4 で作成予定） | — |

## 6. 検討手法

### 6.1 工程（Phase 1〜6）

本プログラムの Phase は作業工程の番号であり、旧提案書の Phase 0〜3 やレビューの Gate 0〜6 とは別の体系である。対応表は 00_decision/06-gate-plan-and-plan-b.md に置く [D][^4]。

| Phase | 名称 | 主な作業 | 2026-10-15 時点の状況 |
|---|---|---|---|
| 1 | 準備・分解 | 執筆規約、種資料 3 点（CISO・CTO・レッドチームの各レンズ）、レビュー指摘の原子化（R-001〜R-283）、ゴールの受入基準化（G-001〜G-151）、前提台帳、成果物計画、旧提案書とレビューの引用監査、主張台帳（CL-0001〜CL-0287）、見解相違ログ。R・G の分解は作成者以外のエージェントが網羅性を批評し、漏れを追加した（TRC-14、TRC-15） | 完了（2026-10-03） |
| 2 | 一次資料調査 | 調査ストリーム RS-01〜RS-17 と独立検証、標準ステータス台帳 | 完了（2026-10-03）。RS-18 を 2026-10-15 に追加 |
| 3 | 設計・起草 | Wave A: 主要 ADR 8 本（3 レンズ起草＋judge panel）、統治・要件・脅威・適用性文書。Wave B: 残り ADR 21 本（単独起草＋独立レビュー）、ADR 索引、棄却仮説ログ。Wave C: アーキテクチャ 15 文書と整合調整、連携契約と独立レビュー、連携ハンドブック、統制台帳、数値契約、運用、保証、PoC 試験計画 | 完了（2026-10-15、コミット 151940a） |
| 4 | 検証 | RS-18 の反映、決裁パッケージ・追跡表・残課題・本書の起草、自動整合検査、8 視点の模擬パネル（最大 3 ラウンド）と指摘の独立検証・是正、独立反証レビュー（pre-mortem、代替案の steelman、主要数値への攻撃） | 進行中 |
| 5 | 実測・是正 | 事前登録した PoC 系統1（TC-001〜TC-028）の実装・実行・実測レポートと独立再現 | 進行中（PoC コードを作成中、実測結果なし） |
| 6 | 凍結・提出準備 | 決裁パッケージ凍結、完了定義の確認、残課題台帳の確定 | 未着手 |

- 工程ごとのエージェントへの指示は .workflows/（phase3b.js、phase3c.js、phase4.js、phase5.js）に残している。Phase 1・2 と Phase 3 Wave A のワークフロー定義はリポジトリに保存していない [D]。

### 6.2 一次資料調査（17＋1 ストリーム）と独立検証

- RS-01〜RS-17 の 17 ストリームは、統治・リスク、規制適用、ID ライフサイクル、OAuth/OIDC profile、信頼の起点と供給網、workload identity と AI エージェント、認可エンジンと整合性、PEP の網羅とテナント分離、耐障害性と cell、監査・プライバシー・所在地、20 年の進化と PQC、事故事例、不正利用、B2B 顧客 ID、build/buy と TCO、並行開発の統治、連携パターンとモデリングを扱う [D][^9]。
- 各ストリームは、問いの設定 → 原典の取得と起草（版 0.1）→ 作成者とは別のエージェントによる全脚注の独立検証 → 是正（版 0.2）の順で進めた [D][^9]。
- 独立検証では 1,033 件の脚注を原典と照合し、支持 881 件、部分支持 151 件、不支持 1 件、検証不能 0 件だった。部分支持と不支持はすべて版 0.2 で修正した（是正 362 件）[D][^9]。
- 二次情報（報道、解説記事、ブログ、AI 要約）は根拠に使わず、原典を探す手掛かりにだけ使った。原典を確認できない事項は「未確認」と記し、結論に使っていない [D][^1][^9]。
- RS-18（テナント配下の階層モデリング）は 2026-10-15 に追加した 18 本目の調査である。RS-01〜RS-17 と異なり deep research の手法で作成し、本文は脚注ではなく文中リンクで出典を示す。作業メモは research_notes/、同一内容の報告書は reports/ にある [D]。RS-18 には独立検証記録がなく、モデル例は各認可エンジンの検証器を通していない（§7.2）[D]。

### 6.3 judge panel（主要 ADR 8 本）

- 主要 ADR 8 本（ADR-001・005・007・010・011・013・021・022）は、3 つの起草レンズ（sec: セキュリティ・保証、ops: 運用性・費用・組織実現性、evo: 20 年の進化・退出）が別々に案を作り、判定者 3 名が 6 軸（要求網羅、リスク低減、規模での実現性、進化・出口など）で採点し、取込み（graft）を加えて統合した [D][^10]。
- 判定者もすべて AI エージェントである。採点は案の比較であり、R への対応を作成者以外が照合した記録ではない [D][^11]。
- 残り 21 本の ADR は単独起草のうえ、作成者とは別のエージェントがレビューし、各 ADR 末尾の「レビュー記録」に残した [D][^11]。

### 6.4 作成者以外のレビューと整合調整

- Wave B・C の文書は、作成者とは別のレビューエージェントが修正し、末尾の「レビュー記録」節に記録した。契約ファイルは機械検証（JSON 構文、OpenAPI lint）を含む独立レビューを行い、11_contracts/review-notes/ に記録した [D][^11]。
- 08_operations/ と 10_integration/ の INT-00・INT-04〜INT-06 は、ワークフロー上レビュー担当が置かれておらず、作成者以外のレビュー記録がない [D][^11]。
- ADR 間、アーキテクチャ文書間の不一致は、05_adr/reconciliation-notes.md と 04_architecture/architecture-reconciliation-notes.md に検出・修正・未決（U-01〜U-04）として記録した [D]。

### 6.5 模擬パネル（Phase 4）

- 模擬パネルは CTO、CISO、超大規模 SRE、プライバシー・法務（多法域）、内部監査、レッドチーム、連携サービス開発リーダー、CFO/PMO の 8 視点で「決裁可能か」を判定し、指摘を出す。指摘は別のエージェントが実在性を検証してから是正し、新たな Critical/High が 2 ラウンド続けて出なくなるか 3 ラウンドで終える [D][^12]。
- **模擬パネルは AI エージェントによる自己レビューであり、実在の CTO/CISO の決裁ではない。** 模擬パネルが「承認可」と判定しても、それは次回決裁の承認を意味しない [D][^1]。
- 経営判断・実測・第三者評価でしか閉じない指摘は、残課題・決裁案として開示されているかだけを確かめ、机上で閉じたとは扱わない [D][^12]。結果は traceability/mock-panel-report.md（Phase 4 で作成予定）に記録する [D]。

## 7. 調査範囲と限界

### 7.1 調査範囲

- 調査範囲は、レビュー原文と種資料 3 点から立てた問い（RS-01〜RS-17 の合計 233 問、うち種資料由来 131 問、追加 102 問）と、RS-18 の問いである [D][^9]。
- 対象外とした領域（例: EU AI 法・サイバーレジリエンス法・中国その他のアジア法域、DORA の統治規律、CCPA 以外の米国州法と NYDFS Part 500、eIDAS LoA・UK DIATF、一部の認可製品）は research/README.md §3.4 に一覧がある [D][^9]。

### 7.2 主な限界

| 限界 | 結論への影響 | 所在 |
|---|---|---|
| 調査・検証・起草・レビュー・judge panel・模擬パネルのすべてを AI エージェントが行い、人による照合は未実施である | 規範強度の対応付け、[D] の推論、法令の解釈は人による確認が必要 | research/README.md §3.1 L-01、traceability/open-items.md |
| 有償・会員制の原典（ISO/IEC 27001・27005、PCI DSS v4.0.1 本体、FISC など）を取得していない | これらの条文に依拠した主張はなく、網羅を確認していない | research/README.md §3.1 L-02、§3.3 |
| 原典の状態は確認日（主に 2026-10-03）以降に変わり得る（Internet-Draft、NIST ipd、未施行の法令など） | 状態の変化で設計の前提が変わり得る | research/standards-status.md、research/README.md §3.1 L-06 |
| 自前の実測がない（2026-10-15 時点）。[M] は公開値だけである | 剥奪反映時間・遅延・容量などの値は未決で、数値契約の多くは TBD | 07_slo/numeric-contracts.md、12_poc/preregistered-test-plan.md |
| 汎用・仮置きの前提で設計している | 実在の事業・法域・規模に当てはめるには前提の差し替えと再評価が必要 | 01_governance/assumptions-register.md |
| RS-18 は独立検証記録がなく、モデル例は認可エンジンの検証器を通していない | 階層モデルの型と規約は検証待ちの設計案である | research/RS-18-hierarchy-modeling.md、traceability/open-items.md |
| 一部の文書（運用・連携ハンドブックの一部）に作成者以外のレビュー記録がない | 当該文書の主張は作成者の自己確認のみ | 00_decision/02-prior-findings-crosswalk.md §2.4 |

## 8. AI エージェント使用の開示と原典照合ログの所在

### 8.1 開示

- 本リポジトリの調査・起草・レビュー・整合調整・模擬パネルには、AI エージェント（Claude）を用いた [D][^1]。
- 「独立検証」「独立レビュー」「判定者」「模擬パネル」は、いずれも作成者とは別の AI エージェントが行ったものであり、人間のレビュア、第三者評価機関、実在の CTO/CISO によるものではない [D][^9][^11]。
- 人による照合の範囲と担当（案）は research/README.md §1.6 と traceability/open-items.md にあり、未実施である [D][^8][^9]。
- 本書を含む全文書の記述は、実在の CTO/CISO・経営の承認を受けていない。承認が必要な事項は 00_decision/03-decision-items.md に決裁案として置いている [D][^5]。

### 8.2 原典照合ログの所在

| 照合の対象 | 記録の所在 |
|---|---|
| 調査ノートの全脚注と原典の照合（脚注ごとの判定、修正一覧、未確認事項） | research/verification/RS-01-verification.md 〜 RS-17-verification.md |
| 照合結果の集計、照合手順、採否基準、二次情報の扱い | research/README.md §1.3〜§1.5、§2.2〜§2.3 |
| 標準・文書の版と状態、確認日 | research/standards-status.md |
| 旧提案書の引用と原典の照合 | traceability/citation-audit-proposal.md |
| レビュー原文の引用と原典の照合 | traceability/citation-audit-review.md |
| 旧提案書の主張ごとの処置（維持・原典差替・修正・削除・要実測） | traceability/claims-ledger.md |
| 契約ファイルの準拠標準との照合と機械検証 | 11_contracts/review-notes/CON-02.md 〜 CON-10.md |
| 各文書の作成者以外によるレビューと是正 | 各文書末尾の「レビュー記録」節 |
| R の閉じ方と検証者 | 00_decision/02-prior-findings-crosswalk.md、traceability/traceability-matrix.md |
| 変更の履歴 | traceability/change-log.md、git 履歴 |

## 参考文献

[^1]: 本リポジトリ『執筆規約（全成果物共通）』. CONVENTIONS.md （参照箇所: §1, §3, §6, §7, §8、確認日: 2026-10-15）
[^2]: 『マルチテナントSaaS認証・認可基盤の比較調査と設計指針』（旧提案書）. マルチテナントSaaS認証・認可基盤の比較調査と設計指針.md （参照箇所: 全体、確認日: 2026-10-15）
[^3]: 『20年運用を前提とした認証・認可基盤提案のCTO/CISOレビュー』. 20年運用を前提とした認証・認可基盤提案のCTO CISOレビュー.md （参照箇所: 判定、承認条件、Gate 0〜6、確認日: 2026-10-15）
[^4]: 本リポジトリ『成果物計画（マスターファイル計画）』TRC-03 版 0.1. traceability/deliverables.md （参照箇所: §2.1, §2.2, §7, §8、確認日: 2026-10-15）
[^5]: 本リポジトリ『決裁パッケージ表紙』DCS-00 版 0.1. 00_decision/00-cover.md （参照箇所: §1, §2, §3、確認日: 2026-10-15）
[^6]: 本リポジトリ『前提台帳』GOV-01 版 0.1. 01_governance/assumptions-register.md （参照箇所: 全体、確認日: 2026-10-15）
[^7]: 本リポジトリ『/goal 受入基準（G-001〜G-151）』TRC-02 版 0.2. traceability/G-goal-criteria.md （参照箇所: §1, §2.1〜§2.4、確認日: 2026-10-15）
[^8]: 本リポジトリ『残課題・是正追跡（POA&M）』TRC-11 版 0.1. traceability/open-items.md （参照箇所: 要旨、確認日: 2026-10-15）
[^9]: 本リポジトリ『調査ノート総覧と調査手法』RES-00 版 0.1. research/README.md （参照箇所: §1.1, §1.2, §1.5, §2.2, §3.1, §3.4、確認日: 2026-10-15）
[^10]: 本リポジトリ『ADR-001 認証基盤（IdP/AS）の build/buy/managed』版 0.1. 05_adr/ADR-001-build-buy-identity-provider.md （参照箇所: 冒頭メタ情報「作成方法」, §4.4、確認日: 2026-10-15）。同様の記載が ADR-005・007・010・011・013・021・022 の冒頭にある
[^11]: 本リポジトリ『前回指摘対照表』DCS-02 版 0.1. 00_decision/02-prior-findings-crosswalk.md （参照箇所: §2.4、確認日: 2026-10-15）
[^12]: 本リポジトリ『Phase 4 ワークフロー定義』. .workflows/phase4.js （参照箇所: Panel 段の PERSONAS と判定規則、確認日: 2026-10-15）
