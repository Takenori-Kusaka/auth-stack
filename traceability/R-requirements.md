# 原子要求追跡表（レビュー指摘の原子化）

> 文書ID: TRC-01 / 版: 0.2 / 状態: draft / 最終更新: 2026-10-03
> 対応要求: R-001〜R-283（本書が定義場所）。G-xxx は traceability/G-goal-criteria.md の確定後に追記
> 依存文書: 20年運用を前提とした認証・認可基盤提案のCTO CISOレビュー.md, traceability/seed/seed-01-ciso-assurance.md, traceability/deliverables.md, CONVENTIONS.md

## 1. 本書の位置付け

- 本書は、CTO/CISO レビュー[^1]の指摘を原子要求 R-xxx に分解した正式な定義場所（DL-101）である [D]。
- R-001〜R-210 は種資料 seed-01 §2[^2] の暫定分解を、レビュー原文と 1 件ずつ突き合わせて確定したものである。種資料の項目は削除していない [D]。
- R-211〜R-277 は、原文を先頭から末尾まで 1 行ずつ走査して見つけた漏れを、原文の出現順に採番して追加したものである。走査の結果は §5 の逆引き索引に全行分を示す [D]。
- R-278〜R-283 は、作成者とは別のエージェントによる網羅性批評（traceability/phase1-critique-R.md、DL-114）[^5]が要素単位の照合で見つけた漏れを、§6 に原文の出現順で追加したものである。同じ批評で区分を直した 4 件（R-043・R-054・R-071・R-104）は、該当行の備考に「critic修正」と記した [D]。
- 要求の根拠は原文の行番号と 30 字以内の引用で示す。種資料は分解の入力としてのみ使い、根拠には使わない（種資料自身が「直接の根拠として引用してはならない」と明記している）[^2]。
- 区分・対応成果物・証拠種別・関連ゲート・机上準備の割当は、原文[^1]・種資料[^2]・成果物計画[^3]・執筆規約[^4]から導いた設計推論である。表のセルごとのタグは省略し、本注記で代える [D]。
- 突合と走査は AI エージェント（Claude）が行った。作成者以外による検証は traceability/phase1-critique-R.md（DL-114）、00_decision/02-prior-findings-crosswalk.md（DL-38）、traceability/traceability-matrix.md（DL-104）で行う。検証が済むまで本書は draft とする [D]。
- 本書が扱うのは、R の定義と閉じ方の割当までである。R→C-xxx→TC/RB→証跡の双方向追跡は traceability/traceability-matrix.md に置き、原文の解釈やレビュー側の誤りに関する相違は traceability/dissent-log.md に記録する [D]。

## 2. 集計

### 2.1 総数

| 項目 | 件数 |
|---|---|
| 親 ID（R-001〜R-283） | 283 |
| うち種資料由来（R-001〜R-210） | 210 |
| うち走査による追加（R-211〜R-277） | 67 |
| うち批評による追加（R-278〜R-283） | 6 |
| 枝番（数値契約の個別指標 R-188.1〜R-195.5） | 43 |
| 表の行数（親 ID＋枝番） | 326 |
| 状態 open | 326 |
| 批評による区分修正（critic修正） | 4（R-043, R-054, R-071, R-104） |
| 根拠薄（原文に根拠が見当たらない） | 0 |
| 一部根拠薄（要求の一部が原文の外にある） | 3（R-042, R-055, R-114） |

件数はすべて本書の表から機械的に数えた値である [D]。

### 2.2 区分別件数

| 区分 | 意味 | R-001〜R-210 | R-211〜R-277 | R-278〜R-283 | 枝番 | 親 ID 計 | 全行計 |
|---|---|---|---|---|---|---|---|
| A | 机上 | 42 | 33 | 2 | 0 | 77 | 77 |
| B | 組織決定 | 54 | 21 | 1 | 7 | 76 | 83 |
| C | 実測 | 97 | 11 | 3 | 36 | 111 | 147 |
| D | 第三者 | 17 | 2 | 0 | 0 | 19 | 19 |
| 計 | | 210 | 67 | 6 | 43 | 283 | 326 |

R-001〜R-210 の区分別件数は、批評による区分修正の前は種資料 seed-01 §0 の集計（A 44／B 54／C 96／D 16、B+C の 8 件を C に含む）と一致していた。修正 4 件（R-043 A→B、R-054 B→C、R-071 C→D、R-104 A→C）の後は A 42／B 54／C 97／D 17 である [D]。

### 2.3 章別件数

| 節 | 章 | 主な原文箇所 | 親 ID | 枝番 | A | B | C | D |
|---|---|---|---|---|---|---|---|---|
| 4.1 | 統治・リスク・責任 | 重大な不足（Critical 1）、Gate 0、CISOの責務、エグゼクティブ判断 | 28 | 0 | 5 | 23 | 0 | 0 |
| 4.2 | 認証ライフサイクル | 重大な不足（Critical 2）、63B-4段落、認証と認可の非対称、Gate 1 | 23 | 0 | 4 | 4 | 13 | 2 |
| 4.3 | root of trust（鍵・管理面） | 重大な不足（Critical 3）、承認条件3 | 9 | 0 | 2 | 0 | 6 | 1 |
| 4.4 | PEP 完全性 | 重大な不足（Critical 4）、承認条件4 | 5 | 0 | 0 | 0 | 4 | 1 |
| 4.5 | 独立保証 | 重大な不足（Critical 5）、Gate 5、承認条件8 | 14 | 0 | 0 | 4 | 0 | 10 |
| 4.6 | 可用性・整合性・失敗モード | 重大な不足（High 6・7）、fail-closedの扱い | 12 | 0 | 3 | 4 | 5 | 0 |
| 4.7 | 製品・運用モデルと ADR | 重大な不足（High 8）、Gate 3 | 16 | 0 | 9 | 2 | 5 | 0 |
| 4.8 | 20 年の進化 | 重大な不足（High 9）、承認条件7 | 6 | 0 | 0 | 1 | 5 | 0 |
| 4.9 | インシデント対応 | 重大な不足（High 10）、承認条件10 | 8 | 0 | 1 | 1 | 6 | 0 |
| 4.10 | 証跡・プライバシー | 重大な不足（High 11）、数値契約後段 | 11 | 0 | 3 | 3 | 5 | 0 |
| 4.11 | 顧客管理機能・人材 | 重大な不足（Medium 12・13）、承認条件9 | 13 | 0 | 2 | 6 | 5 | 0 |
| 4.12 | 認可整合性・共有 PDP・OAuth/JWT | 技術上の危険点（Zanzibar系、共有PDP、JWT・OAuth）、Gate 4 末尾 | 23 | 0 | 4 | 1 | 17 | 1 |
| 4.13 | Gate 1〜6 の工程要求 | 進め方の再設計 Gate 1〜6 | 25 | 0 | 5 | 2 | 16 | 2 |
| 4.14 | 必須の数値契約 | 必須の数値契約（8分類の全指標を枝番で展開） | 9 | 43 | 0 | 8 | 44 | 0 |
| 4.15 | 文書品質 | 文書品質の問題 | 6 | 0 | 6 | 0 | 0 | 0 |
| 4.16 | 意思決定マトリクス | 意思決定マトリクス9行 | 7 | 0 | 1 | 4 | 2 | 0 |
| 4.17 | CTO/CISO の視座（責務と CTO の問い） | CTOの責務、CTOの問い5項、CISOの責務 | 15 | 0 | 4 | 8 | 3 | 0 |
| 4.18 | 最重要原則 | 最重要原則7つ | 8 | 0 | 2 | 2 | 3 | 1 |
| 4.19 | 適用すべき基準 | 適用すべき基準表10行 | 13 | 0 | 9 | 2 | 2 | 0 |
| 4.20 | 維持すべき方向性（高く評価できる点） | 高く評価できる点10行と直後の段落、最終所見の前段 | 11 | 0 | 11 | 0 | 0 | 0 |
| 4.21 | 承認条件（本番設計審査への最低条件） | 承認条件10項 | 10 | 0 | 2 | 4 | 3 | 1 |
| 4.22 | エグゼクティブ判断・最終所見 | エグゼクティブ判断、最終所見 | 5 | 0 | 2 | 3 | 0 | 0 |
| 6 | 批評による追加 | 適用すべき基準（L49）、重大な不足（L92・L93）、認証と認可の非対称（L105）、Gate 1（L151）、Gate 4（L182） | 6 | 0 | 2 | 1 | 3 | 0 |
| 計 | | | 283 | 43 | 77 | 83 | 147 | 19 |

A〜D 列は親 ID と枝番の合計である。章は主題で分けており、1 件の R が複数の原文箇所に由来する場合は主な出典の章に置く [D]。

### 2.4 関連ゲート別件数（重複計上）

| ゲート | レビュー上の名称 | 関連する行数 |
|---|---|---|
| G0 | Gate 0: 統治 | 94 |
| G1 | Gate 1: 要件 | 48 |
| G2 | Gate 2: 攻撃者モデル | 11 |
| G3 | Gate 3: ADRと選定 | 103 |
| G4 | Gate 4: 高保証PoC | 143 |
| G5 | Gate 5: 独立保証 | 29 |
| G6 | Gate 6: 段階導入・継続 | 42 |

1 行が複数のゲートに関わる場合はそれぞれに計上するため、合計は行数と一致しない [D]。

### 2.5 突合の結果

- 原文に根拠が見当たらない種資料項目は 0 件だった。R-001〜R-210 の全件について、原文の行と引用を特定した [D]。
- 要求の一部が原文の外にある項目は 3 件で、備考に「一部根拠薄」と記した。R-042（ソーシャルエンジニアリング対策）、R-055（鍵 ceremony への第三者立会い）、R-114（法定報告との連動）である。いずれも原文の別の箇所から推論できるため削除しないが、決裁資料では原文の要求と種資料の補足を区別して扱う [D]。
- 種資料の出典表記と原文が食い違ったものは、原文の行を根拠に置き換えた。R-025 は種資料の出典のうち「最終所見」（L256、内容は R-026）を外して L60 だけとし、R-034 は招待の語がない「不足2」（L86）に代えて L105・L182 とした [D]。
- 作成時に区分を種資料から変えたのは R-188〜R-195 の 8 件だけである。種資料の「B+C」を、最も重い手段である C に正規化した。B の併用は備考に記した [D]。その後、網羅性批評[^5]により R-043・R-054・R-071・R-104 の 4 件の区分を修正した（§6.2）[D]。
- 成果物の割当は、種資料の D01〜D34 を deliverables.md の分割・追加に合わせて読み替えた。主な読み替えは次のとおりである。停止権限系の R-017・R-022・R-074 は DL-46、主体カタログの R-029 は DL-48、攻撃者モデルの R-002・R-166 は DL-51、操作 5 分類の R-079 は DL-09 に割り当てた。種資料で「—」だった R-076 には DL-110・DL-59 を、引用監査の R-197・R-198 には分割後の traceability/citation-audit-proposal.md を割り当てた [D][^3]。
- 走査で追加した主な漏れは次のとおりである [D]。
  - CTO の問い 2（可用性・遅延・整合性・変更安全性の数値保証、R-220）
  - CTO・CISO の責務（R-217〜R-219、R-221〜R-227）
  - 最重要原則 7 つ（R-228〜R-235）と、適用すべき基準表の各行（R-236〜R-248）
  - 高く評価された方向性の維持（R-249〜R-259）
  - 意思決定マトリクスの 1 行目と 5 行目（R-264、R-265）
  - 承認条件 10 項の充足判定（R-266〜R-275）
  - 「最大の問題」とされた連鎖の閉鎖（R-214）
- 原文の参考文献（L258〜L363）は要求を含まないため分解の対象外とした。レビュー側の引用の検証は traceability/citation-audit-review.md と traceability/dissent-log.md で扱う [D]。

## 3. 表の読み方

| 列 | 内容 |
|---|---|
| R-ID | 原子要求の ID。枝番 `R-1xx.n` は数値契約の個別指標である。原文表の読点「、」で区切られた 1 項目を 1 指標とし、種資料の例示「R-189.6＝JWKS cache最大齢」と番号を合わせた。`access/refresh寿命` のように 1 項目に複数の対象を含む指標は 1 行とし、別の値を定めることを要求文に明記した |
| 原子要求 | 閉じる対象を 1 つだけ含む要求文。R-001〜R-210 は種資料の文言を基本とし、R-170・R-173・R-174 は原文の列挙を括弧で補い、R-188〜R-195 は枝番の範囲を書き加えた |
| 原文行 | レビュー原文ファイルの行番号（2026-10-03 確認版、SHA-256 先頭 16 桁 `46a8d7be41761676`）。太字は引用を取った行、その他は同じ要求の根拠になる行である |
| 原文引用 | 太字の行から取った 30 字以内の抜粋（原文どおり）。全件について、該当行に文字列として存在することと 30 字以内であることを機械照合した |
| 区分 | CONVENTIONS §6 の A 机上／B 組織決定／C 実測／D 第三者[^4]。1 要求に 1 区分とし、閉じるのに必要な手段のうち最も重いもの（A＜B＜C＜D）を記す。承認条件の行（R-266〜R-275）だけは、条件文の字義で区分を付けた。「ある」は A、「決まっている」「承認されている」は B、「実測し」「検証でき」「合格」は C、「第三者評価で閉じている」は D である |
| 対応成果物 | traceability/deliverables.md §8 のファイルパス[^3]。PoC 計画（12_poc/preregistered-test-plan.md）に載る要求の実測結果は 12_poc/measurement-report.md に記録するため、表では省略した |
| 証拠 | seed-01 §1 の E1〜E11[^2]。E1 経営会議・取締役会決議／E2 版管理された承認済み文書／E3 双方向トレーサビリティ／E4 再現可能な自動試験結果／E5 実測生データと測定条件／E6 第三者報告書／E7 OIDF 適合試験ログまたは認定／E8 演習記録／E9 リスク受容記録／E10 IaC/policy 署名付きスナップショット／E11 是正追跡（POA&M）。「＋」は両方が必要なこと、「/」はどちらかでよいことを示す |
| ゲート | G0〜G6 はレビューの Gate 0〜6 を指す（G0 統治／G1 要件／G2 攻撃者モデル／G3 ADR と選定／G4 高保証 PoC／G5 独立保証／G6 段階導入と継続保証）。受入基準の ID である G-xxx とは別物である。「/」は複数のゲートに関わることを示す |
| 机上準備 | 本リポジトリ内で作る準備物。案＝決裁用ドラフト（選択肢・推奨・帰結付き）／計＝試験計画＋合否基準＋測定設計／自＝自己評価・事前実行／RFP＝第三者評価の SOW／様＝記録様式／—＝机上で閉じる |
| 状態 | 本書作成時点では全件が open である。状態の遷移と証跡の所在は traceability/traceability-matrix.md で管理する |
| 備考 | 根拠薄・一部根拠薄の注記、種資料との差分、関連する R |

## 4. 原子要求一覧（章別）

### 4.1 統治・リスク・責任

親 ID 28 件（A 5／B 23／C 0／D 0）。主な原文箇所: 重大な不足（Critical 1）、Gate 0、CISOの責務、エグゼクティブ判断。

| R-ID | 原子要求 | 原文行 | 原文引用（30字以内） | 区分 | 対応成果物 | 証拠 | ゲート | 机上準備 | 状態 | 備考 |
|---|---|---|---|---|---|---|---|---|---|---|
| R-001 | 保護対象（資産・データ・業務）の定義 | **L145**, L7, L85 | 「保護対象、最大許容損失、最大停止時間」 | B | 02_requirements/data-classification.md | E2 | G0 | 案 | open | L85 は「何をどこまで防ぐか」として間接的に要求 |
| R-002 | 脅威主体の定義 | **L85**, L7 | 「損失シナリオ、脅威主体、データ分類」 | A | 03_threat-model/attacker-model.md<br>03_threat-model/threat-catalog.md | E2 | G0/G2 | — | open |  |
| R-003 | 重大損失シナリオの確定 | **L239**, L85, L147 | 「データ分類、重大損失シナリオがある」 | B | 01_governance/loss-scenarios.md | E2（上位はE1） | G0 | 案 | open |  |
| R-004 | データ分類の確定 | **L85**, L239 | 「脅威主体、データ分類、リスク許容度」 | B | 02_requirements/data-classification.md | E2 | G0/G1 | 案 | open |  |
| R-005 | リスク許容度の経営承認 | **L239**, L85, L145 | 「経営承認済みのrisk appetite」 | B | 01_governance/risk-appetite-draft.md | E1 | G0 | 案（3選択肢） | open |  |
| R-006 | KRI定義と四半期報告 | **L147**, L85, L202 | 「停止権限、四半期報告KRI」 | B | 01_governance/kri.md | E2 | G0/G6 | 案・様 | open |  |
| R-007 | 残余リスク受容者の指名 | **L85**, L145 | 「KRI、残余リスク受容者を確定」 | B | 01_governance/raci-governance.md<br>01_governance/exception-risk-acceptance.md<br>00_decision/05-residual-risk-register.md | E9 | G0 | 案 | open |  |
| R-008 | 最大許容損失 | **L145** | 「保護対象、最大許容損失」 | B | 01_governance/risk-appetite-draft.md<br>01_governance/business-impact-analysis.md | E1 | G0 | 様（損失形態・BIA票） | open |  |
| R-009 | 最大停止時間 | **L145** | 「最大許容損失、最大停止時間」 | B | 01_governance/risk-appetite-draft.md<br>01_governance/business-impact-analysis.md | E1 | G0 | 様 | open |  |
| R-010 | 規制・契約要件と対象法域 | **L145**, L239 | 「最大停止時間、規制・契約要件」 | B | 06_controls/applicability.md | E2（法務署名） | G0 | 案 | open |  |
| R-011 | テナント間漏えい許容ゼロの承認と測定可能な定義 | **L145** | 「テナント間漏えいの許容度ゼロ」 | B | 01_governance/risk-appetite-draft.md | E1 | G0 | 案 | open | 「測定可能な定義」は種資料の補足（原文は許容度ゼロの承認まで） |
| R-012 | 特権濫用リスクの許容方針 | **L145** | 「許容度ゼロ、特権濫用」 | B | 01_governance/risk-appetite-draft.md | E1 | G0 | 案 | open |  |
| R-013 | 顧客IdP侵害時の責任境界 | **L145** | 「顧客IdP侵害時の責任境界を承認する」 | B | 02_requirements/customer-admin-responsibility.md<br>06_controls/applicability.md | E2（法務署名） | G0 | 案（契約条項） | open |  |
| R-014 | 役割分担: CISO=リスク提示、CTO=実現性・費用・可用性、事業責任者=残余リスク受容 | **L145** | 「CISOはリスクを提示し、CTOは実現性」 | B | 01_governance/raci-governance.md | E1 | G0 | 案 | open |  |
| R-015 | RACI | **L147** | 「重大損失シナリオ、RACI、例外承認手順」 | B | 01_governance/raci-governance.md | E1 | G0 | 案 | open |  |
| R-016 | 例外承認手順 | **L147** | 「RACI、例外承認手順、停止権限」 | B | 01_governance/exception-risk-acceptance.md | E9 | G0 | 案・様 | open |  |
| R-017 | 停止権限 | **L147**, L31 | 「例外承認手順、停止権限」 | B | 01_governance/stop-authority.md | E1 | G0 | 案 | open |  |
| R-018 | 独立保証計画 | **L147**, L15 | 「四半期報告KRI、独立保証計画」 | B | 09_assurance/independent-assurance-plan.md | E1 | G0 | 案 | open | L15（CTOの責務）の「独立リスク評価」も本要求で受ける |
| R-019 | 責任と対になる決裁権・予算・人員・独立監査経路 | **L31**, L29 | 「責任だけでなく決裁権、予算、人員」 | B | 01_governance/raci-governance.md | E1 | G0 | 案 | open | L29 の「CISOには影響力と資源を与えるべき」を含む |
| R-020 | 故意・虚偽・重大な管理不履行と、合理的統制後の残余リスクとを区別（辞任型にしない） | **L31** | 「意図的な無視、虚偽報告、重大な管理不履行」 | B | 01_governance/raci-governance.md | E1 | G0 | 案 | open |  |
| R-021 | セキュリティを劣後させる判断はCEO/取締役会が透明に所有 | **L29** | 「CEO・取締役会が透明に所有すべき」 | B | 01_governance/exception-risk-acceptance.md | E9 | G0/G5 | 様 | open |  |
| R-022 | 退出基準充足まで不可逆な標準化・強制移行・対外的安全性表明を凍結 | **L9**, L256 | 「不可逆な標準化、既存システムの強制移行」 | B | 01_governance/stop-authority.md<br>00_decision/03-decision-items.md | E1 | G0/G6 | 決裁文案 | open |  |
| R-023 | 残余リスクの受容理由と検証可能性を記録 | **L7** | 「残余リスクの受容理由と検証可能性を記録」 | A | 03_threat-model/threat-catalog.md<br>00_decision/05-residual-risk-register.md | E2 | G2/G5 | — | open |  |
| R-024 | 適用基準ごとの適用可能性判定（全部取るではない） | **L60** | 「「全部の認証を取る」という意味ではない」 | B | 06_controls/applicability.md | E2（法務署名） | G0 | 案 | open |  |
| R-025 | 全要求を単一統制台帳へ載せ証跡所有者を割当 | **L60** | 「各要求を一つの統制台帳へマッピング」 | A | 06_controls/control-mapping-ledger.md | E3 | G1 | — | open | 種資料の出典「最終所見」は L256（R-026）の内容のため、根拠を L60 とした |
| R-026 | FAPI 2.0/800-63-4/SSDF/ASVS 5/CSF 2.0への明示マッピング | **L256** | 「CSF 2.0へ明示的にマッピング」 | A | 06_controls/control-mapping-ledger.md | E3 | G1/G5 | — | open |  |
| R-214 | 保護対象→脅威主体→損失シナリオ→リスク許容度→制御要件→検証方法→合格値→残余リスク受容者の連鎖を要求ごとに双方向に閉じる | **L7** | 「残余リスク受容者の連鎖が閉じていない」 | A | traceability/traceability-matrix.md<br>06_controls/control-mapping-ledger.md | E3 | G0/G5 | — | open | 原文が「最大の問題」とする指摘。種資料は個別要素（R-001〜R-007）に分解したが連鎖の閉鎖自体は未分解 |
| R-216 | 退出基準（Gate ごとの合格・中止基準）を明文化し、充足判定を記録する | **L9**, L237 | 「後述する退出基準を満たすまで」 | B | 00_decision/06-gate-plan-and-plan-b.md | E1 | G0 | 案 | open | 承認条件10項（R-266〜R-275）を本番設計審査への退出基準とする |

### 4.2 認証ライフサイクル

親 ID 23 件（A 4／B 4／C 13／D 2）。主な原文箇所: 重大な不足（Critical 2）、63B-4段落、認証と認可の非対称、Gate 1。

| R-ID | 原子要求 | 原文行 | 原文引用（30字以内） | 区分 | 対応成果物 | 証拠 | ゲート | 机上準備 | 状態 | 備考 |
|---|---|---|---|---|---|---|---|---|---|---|
| R-027 | ユースケース別IAL/AAL/FAL | **L86**, L240, L151 | 「IAL/AAL/FALをユースケース別に決め」 | B | 02_requirements/operation-risk-tiers-assurance.md<br>05_adr/ADR-002-assurance-levels-by-tier.md | E2＋E9 | G1 | 案 | open |  |
| R-028 | 認証全イベント（登録〜削除）の状態機械 | **L86**, L151 | 「全イベントを状態機械化」 | A | 02_requirements/identity-lifecycle.md | E2 | G1 | — | open |  |
| R-029 | 主体8類型カタログ（ユーザー、人事ID、顧客管理者、support、service account、workload、外部integration、agent/AI） | **L151** | 「ユーザー、人事ID、顧客管理者、support」 | A | 02_requirements/principal-catalog.md | E2 | G1 | — | open |  |
| R-030 | 操作ごとの保証要件割当（IAL/AAL/FAL、step-up、SoD、最大session、再認証、回復、監査、データ分類） | **L151** | 「各業務操作に対して、必要IAL/AAL/FAL」 | B | 02_requirements/operation-risk-tiers-assurance.md | E2＋E9 | G1 | 案 | open |  |
| R-031 | フィッシング耐性要求範囲（手入力OTPは耐性なし） | **L99**, L50 | 「OTPの手入力はフィッシング耐性とは見なされず」 | B | 02_requirements/operation-risk-tiers-assurance.md<br>05_adr/ADR-002-assurance-levels-by-tier.md | E2＋E9 | G1 | 案 | open |  |
| R-032 | AAL2回復要件（異なる2回復要素/既存認証器組合せ/再本人確認） | **L99** | 「二つの異なる回復要素」 | C | 02_requirements/identity-lifecycle.md<br>05_adr/ADR-003-account-recovery-authenticators.md<br>12_poc/preregistered-test-plan.md | E4 | G1/G4 | 計 | open |  |
| R-033 | 本人確認(identity proofing)手順 | **L86** | 「登録、本人確認、IdP連携」 | A | 02_requirements/identity-lifecycle.md | E2 | G1 | — | open |  |
| R-034 | 招待 | **L105**, L182 | 「ユーザー登録、招待、所属変更」 | C | 02_requirements/identity-lifecycle.md<br>12_poc/preregistered-test-plan.md | E4 | G1/G4 | 計 | open | 種資料の出典「不足2」（L86）に招待の語はない。L105・L182 を根拠とした |
| R-035 | 所属変更 | **L105**, L182 | 「招待、所属変更、IdP発見」 | C | 02_requirements/identity-lifecycle.md<br>12_poc/preregistered-test-plan.md | E4 | G1/G4 | 計 | open |  |
| R-036 | IdP発見・複数IdP | **L105**, L182 | 「IdP発見、複数IdP」 | C | 02_requirements/identity-lifecycle.md<br>05_adr/ADR-004-b2b-federation-linking-scim.md<br>12_poc/preregistered-test-plan.md | E4 | G1/G4 | 計 | open |  |
| R-037 | メール再利用とaccount linking | **L105**, L182 | 「メールアドレス再利用、同一人物の」 | C | 02_requirements/identity-lifecycle.md<br>05_adr/ADR-004-b2b-federation-linking-scim.md<br>12_poc/preregistered-test-plan.md | E4 | G1/G4 | 計 | open |  |
| R-038 | SAML署名鍵更新 | **L105** | 「SAML署名鍵更新」 | C | 02_requirements/identity-lifecycle.md<br>05_adr/ADR-004-b2b-federation-linking-scim.md<br>12_poc/preregistered-test-plan.md | E4 | G1/G4 | 計 | open |  |
| R-039 | IdP停止時の回復 | **L105** | 「IdP停止時の回復」 | C | 02_requirements/identity-lifecycle.md<br>12_poc/preregistered-test-plan.md | E4 | G1/G4 | 計 | open |  |
| R-040 | SCIM競合・遅延 | **L105**, L182 | 「SCIM競合」 | C | 02_requirements/identity-lifecycle.md<br>11_contracts/scim.openapi.yaml<br>12_poc/preregistered-test-plan.md | E4 | G1/G4 | 計 | open | 遅延は L182「SCIM遅延」 |
| R-041 | 認証器の紛失・変更 | **L105**, L86 | 「SCIM競合、認証器紛失」 | C | 02_requirements/identity-lifecycle.md<br>05_adr/ADR-003-account-recovery-authenticators.md<br>12_poc/preregistered-test-plan.md | E4 | G1/G4 | 計 | open | 変更は L86「認証器変更」 |
| R-042 | support経由の回復（ソーシャルエンジニアリング対策） | **L105**, L157, L194 | 「supportによる回復」 | D | 02_requirements/identity-lifecycle.md<br>05_adr/ADR-003-account-recovery-authenticators.md<br>09_assurance/rfp-sow.md | E6 | G2/G5 | 計・RFP | open | 一部根拠薄: 「ソーシャルエンジニアリング」の語は原文になく、L157 内部support・L194 red team からの推論 |
| R-043 | passkey同期の扱い | **L105** | 「passkey同期」 | B | 02_requirements/identity-lifecycle.md<br>05_adr/ADR-002-assurance-levels-by-tier.md | E2＋E9 | G1/G3 | 案 | open | critic修正: A→B。同期 passkey を受け入れる操作階層の決定はリスク受容を伴い、同種の R-031（フィッシング耐性要求範囲）と同じく B で閉じる（traceability/phase1-critique-R.md §5.1） |
| R-044 | 退職・削除 | **L86**, L182 | 「退職・削除が設計されていない」 | C | 02_requirements/identity-lifecycle.md<br>12_poc/preregistered-test-plan.md | E4 | G1/G4 | 計 | open |  |
| R-045 | step-upの鮮度（auth_time/max_age） | **L105** | 「step-upの鮮度」 | C | 02_requirements/identity-lifecycle.md<br>12_poc/preregistered-test-plan.md | E4 | G1/G4 | 計 | open | auth_time/max_age は実現手段の例示で原文外 |
| R-046 | FAL2 assertion injection対策（RP起点、期待IdP・audience厳格検証） | **L107** | 「FAL2ではassertion injection」 | D | 04_architecture/token-profile.md<br>09_assurance/oidf-conformance-plan.md<br>09_assurance/rfp-sow.md | E6/E7 | G2/G5 | 計・RFP | open |  |
| R-047 | 「どのテナントのどのIdPがこの主体を保証したか」の結合 | **L107** | 「どのテナントの、どのIdPが、この主体を保証したか」 | C | 02_requirements/identity-lifecycle.md<br>05_adr/ADR-004-b2b-federation-linking-scim.md | E4 | G1/G4 | 計 | open |  |
| R-048 | federation・SCIM・session lifecycleのユースケース別定義 | **L240** | 「session lifecycleがユースケース別」 | A | 02_requirements/identity-lifecycle.md | E2 | G1 | — | open |  |
| R-260 | アカウント乗っ取りの主要経路のうちIdP再連携（既存アカウントへのIdP付替え・再federation）を統制する | **L99** | 「回復・認証器変更・IdP再連携を統制」 | C | 02_requirements/identity-lifecycle.md<br>05_adr/ADR-004-b2b-federation-linking-scim.md<br>12_poc/preregistered-test-plan.md | E4 | G1/G4 | 計 | open | 回復は R-032、認証器変更は R-041 |

### 4.3 root of trust（鍵・管理面）

親 ID 9 件（A 2／B 0／C 6／D 1）。主な原文箇所: 重大な不足（Critical 3）、承認条件3。

| R-ID | 原子要求 | 原文行 | 原文引用（30字以内） | 区分 | 対応成果物 | 証拠 | ゲート | 机上準備 | 状態 | 備考 |
|---|---|---|---|---|---|---|---|---|---|---|
| R-049 | 鍵階層 | **L87** | 「鍵階層、生成・保管・rotation」 | A | 04_architecture/root-of-trust.md<br>05_adr/ADR-007-key-hierarchy-kms-hsm.md | E2 | G3 | — | open |  |
| R-050 | 鍵の生成・保管 | **L87** | 「生成・保管・rotation・失効」 | C | 04_architecture/root-of-trust.md<br>12_poc/preregistered-test-plan.md | E4 | G3/G4 | 計 | open |  |
| R-051 | rotation | **L87** | 「rotation・失効・災害復旧」 | C | 04_architecture/root-of-trust.md<br>12_poc/preregistered-test-plan.md | E4 | G3/G4 | 計 | open |  |
| R-052 | 失効 | **L87** | 「rotation・失効・災害復旧」 | C | 04_architecture/root-of-trust.md<br>12_poc/preregistered-test-plan.md | E4 | G3/G4 | 計 | open |  |
| R-053 | 災害復旧 | **L87** | 「失効・災害復旧、二者統制」 | C | 04_architecture/root-of-trust.md<br>12_poc/preregistered-test-plan.md | E8 | G3/G4 | 計 | open |  |
| R-054 | 二者統制 | **L87** | 「二者統制、オフラインroot」 | C | 01_governance/raci-governance.md<br>04_architecture/root-of-trust.md<br>05_adr/ADR-008-control-plane-cicd-protection.md<br>12_poc/preregistered-test-plan.md | E1＋E8 | G0/G3/G4 | 案・計 | open | critic修正: B→C。鍵操作を 1 名では実行できないことを試験または ceremony 記録で示すまで閉じない。担い手の指名（B）は併用する（traceability/phase1-critique-R.md §5.1） |
| R-055 | オフラインroot（ceremonyに第三者立会い） | **L87** | 「オフラインroot、侵害runbook」 | D | 04_architecture/root-of-trust.md<br>09_assurance/rfp-sow.md | E6＋E8 | G3/G5 | 手順書・RFP | open | 一部根拠薄: 原文はオフラインrootの設計まで。D区分の理由である第三者立会いは種資料の追加 |
| R-056 | 対象範囲 AS/PAP/CI-CD/KMS/HSM/JWKS | **L241**, L87 | 「AS/PAP/CI/CD/KMS/HSM/JWKSを含む」 | A | 04_architecture/root-of-trust.md | E2 | G3 | — | open |  |
| R-057 | 構成要素ごとの侵害runbook | **L87**, L241 | 「侵害runbookを設計」 | C | 08_operations/compromise-runbooks.md | E8 | G3/G4 | 計 | open |  |

### 4.4 PEP 完全性

親 ID 5 件（A 0／B 0／C 4／D 1）。主な原文箇所: 重大な不足（Critical 4）、承認条件4。

| R-ID | 原子要求 | 原文行 | 原文引用（30字以内） | 区分 | 対応成果物 | 証拠 | ゲート | 机上準備 | 状態 | 備考 |
|---|---|---|---|---|---|---|---|---|---|---|
| R-058 | 全entry point inventory（batch/queue/内部API/データ直アクセス含む） | **L88** | 「batch、queue、内部API、データ直アクセス」 | C | 03_threat-model/dfd-entry-points.md<br>02_requirements/as-is-inventory.md | E4 | G1/G4 | 手作業棚卸＋計 | open |  |
| R-059 | enforcement coverageの機械的検証 | **L88**, L242 | 「enforcement coverage」 | C | 04_architecture/pep-contract.md | E4 | G4 | 計 | open |  |
| R-060 | bypass test | **L88** | 「bypass test」 | D | 04_architecture/pep-contract.md<br>09_assurance/pentest-redteam-plan.md<br>09_assurance/rfp-sow.md | E6 | G4/G5 | 計・RFP | open |  |
| R-061 | DB/storage側tenant guardrail（RLS等） | **L88**, L242 | 「DB/storage側guardrailを自動検証」 | C | 04_architecture/pep-contract.md<br>04_architecture/data-outside-pep.md | E4 | G3/G4 | 設計案 | open | RLS は例示で原文外 |
| R-062 | 上記のCI継続自動検証 | **L88** | 「guardrailを自動検証」 | C | 04_architecture/pep-contract.md<br>11_contracts/mock-contract-test-kit.md | E4 | G4/G6 | 計 | open | 「CI継続」は原文「自動検証」の実現形態としての補足 |

### 4.5 独立保証

親 ID 14 件（A 0／B 4／C 0／D 10）。主な原文箇所: 重大な不足（Critical 5）、Gate 5、承認条件8。

| R-ID | 原子要求 | 原文行 | 原文引用（30字以内） | 区分 | 対応成果物 | 証拠 | ゲート | 机上準備 | 状態 | 備考 |
|---|---|---|---|---|---|---|---|---|---|---|
| R-063 | 外部アーキテクチャレビュー | **L89**, L194, L246 | 「外部アーキテクチャレビュー」 | D | 09_assurance/independent-assurance-plan.md<br>09_assurance/rfp-sow.md | E6 | G5 | RFP | open |  |
| R-064 | OAuth/OIDC/FAPI適合試験 | **L89**, L194, L125 | 「OAuth/OIDC適合試験」 | D | 09_assurance/oidf-conformance-plan.md<br>09_assurance/rfp-sow.md | E7 | G5 | 自（OIDF suite自前実行） | open |  |
| R-065 | 独立pentest（cross-tenant含む） | **L194**, L89, L246 | 「cross-tenant pentest」 | D | 09_assurance/pentest-redteam-plan.md<br>09_assurance/rfp-sow.md | E6 | G5 | RFP | open |  |
| R-066 | red team | **L89**, L194, L246 | 「独立侵入試験、red team」 | D | 09_assurance/pentest-redteam-plan.md<br>09_assurance/rfp-sow.md | E6 | G5 | RFP | open |  |
| R-067 | 独立保証のgate化 | **L89** | 「red teamをgate化」 | B | 09_assurance/independent-assurance-plan.md<br>00_decision/06-gate-plan-and-plan-b.md | E1 | G0/G5 | 案 | open |  |
| R-068 | 評価者の報告系統を実装チームから分離 | **L194** | 「実装チームと報告系統を分けた評価者」 | B | 09_assurance/independent-assurance-plan.md | E1 | G5 | 案 | open |  |
| R-069 | 評価範囲: 設計・コード・IaC・policy・鍵管理・CI/CD・runbook | **L194** | 「設計、コード、IaC、policy、鍵管理」 | D | 09_assurance/rfp-sow.md | E6 | G5 | RFP | open |  |
| R-070 | ASVS 5.0ベース検証 | **L194**, L54 | 「ASVSベースの検証」 | D | 09_assurance/self-assessments.md<br>09_assurance/rfp-sow.md | E6 | G5 | 自（ASVS L2/L3自己評価） | open |  |
| R-071 | API Top 10負例試験 | **L194**, L55 | 「ASVSベースの検証、API Top 10」 | D | 09_assurance/self-assessments.md<br>12_poc/preregistered-test-plan.md<br>09_assurance/rfp-sow.md | E4＋E6 | G4/G5 | 計・RFP | open | critic修正: C→D、太字行を L55→L194 に変更。L194 は API Top 10 を独立評価者の検証に含める。自前の負例試験（L55）は R-242（C）が受けるため、本行は独立評価で閉じる（traceability/phase1-critique-R.md §5.1） |
| R-072 | クラウド設定レビュー | **L194** | 「クラウド設定レビュー」 | D | 09_assurance/rfp-sow.md | E6 | G5 | RFP | open |  |
| R-073 | 供給網レビュー（SLSA 1.2: 来歴・署名・隔離ビルド） | **L194**, L57 | 「クラウド設定レビュー、供給網レビュー」 | D | 09_assurance/self-assessments.md<br>09_assurance/rfp-sow.md | E6 | G5 | 自 | open |  |
| R-074 | Critical/High未解決なら本番移行停止 | **L196** | 「未解決事項は原則として本番移行を止める」 | B | 01_governance/stop-authority.md | E1 | G5 | 案 | open |  |
| R-075 | 例外は期限・補完統制・影響範囲・責任者・失効条件付きの経営承認のみ（CISO単独不可） | **L196** | 「期限、補完統制、影響範囲、責任者、失効条件」 | B | 01_governance/exception-risk-acceptance.md | E9 | G5 | 様 | open |  |
| R-076 | Critical/High closureの証跡 | **L246** | 「Critical/Highが閉じている」 | D | traceability/open-items.md<br>09_assurance/pentest-redteam-plan.md | E6＋E11 | G5 | E6＋E11 の様式 | open | 種資料は成果物「—」。deliverables.md の DL-110・DL-59 を割り当てた |

### 4.6 可用性・整合性・失敗モード

親 ID 12 件（A 3／B 4／C 5／D 0）。主な原文箇所: 重大な不足（High 6・7）、fail-closedの扱い。

| R-ID | 原子要求 | 原文行 | 原文引用（30字以内） | 区分 | 対応成果物 | 証拠 | ゲート | 机上準備 | 状態 | 備考 |
|---|---|---|---|---|---|---|---|---|---|---|
| R-077 | 操作リスク階層ごとの数値決裁 | **L90** | 「操作リスク階層ごとに数値を決裁」 | B | 07_slo/numeric-contracts.md | E1 | G0/G4 | 案 | open |  |
| R-078 | 負荷・障害・分断試験で証明 | **L90** | 「負荷・障害・分断試験で証明」 | C | 12_poc/preregistered-test-plan.md | E5 | G4 | 計 | open |  |
| R-079 | 操作5分類（public/read-sensitive/write/privileged/break-glass） | **L131** | 「write/privileged/break-glass」 | A | 02_requirements/operation-risk-tiers-assurance.md | E2 | G1 | — | open | 種資料の D19 ではなく、操作5分類の定義場所である DL-09 に割り当てた |
| R-080 | 分類ごとのキャッシュ最大齢 | **L131** | 「キャッシュ最大齢、必要整合性」 | C | 04_architecture/fail-mode-matrix.md<br>12_poc/preregistered-test-plan.md | E5 | G3/G4 | 計 | open |  |
| R-081 | 分類ごとの必要整合性 | **L131** | 「必要整合性、PDP不達時挙動」 | C | 04_architecture/fail-mode-matrix.md<br>12_poc/preregistered-test-plan.md | E5 | G3/G4 | 計 | open |  |
| R-082 | 分類ごとのPDP不達時挙動 | **L131** | 「PDP不達時挙動、監査不能時挙動」 | C | 04_architecture/fail-mode-matrix.md<br>12_poc/preregistered-test-plan.md | E5 | G3/G4 | 計 | open |  |
| R-083 | 分類ごとの監査不能時挙動 | **L131** | 「監査不能時挙動」 | C | 04_architecture/fail-mode-matrix.md<br>12_poc/preregistered-test-plan.md | E5 | G3/G4 | 計 | open |  |
| R-084 | 分類ごとの代替経路 | **L131** | 「利用可能な代替経路」 | A | 04_architecture/fail-mode-matrix.md | E2 | G3 | — | open |  |
| R-085 | read/write/admin/緊急業務ごとの安全な失敗モードと限定grace | **L91** | 「安全な失敗モードと限定grace」 | B | 04_architecture/fail-mode-matrix.md<br>05_adr/ADR-013-cell-partitioning-fail-mode.md | E2＋E9 | G3 | 案 | open |  |
| R-086 | 高リスクはfresh decision必須、低リスクreadのみ署名済み既知良好decision許容の判断明示 | **L131** | 「高リスク操作はfresh decision必須」 | B | 04_architecture/fail-mode-matrix.md<br>01_governance/exception-risk-acceptance.md | E9 | G3 | 案 | open |  |
| R-087 | 一律値（5〜15分token、全fail-closed）を撤回しリスク階層と実測で決定 | **L232** | 「5〜15分token、全fail-closed等の一律値」 | B | 07_slo/numeric-contracts.md<br>04_architecture/fail-mode-matrix.md | E1 | G3/G4 | 案 | open | 意思決定マトリクス8行目 |
| R-262 | 既定deny（不明ならdeny）を認可の安全側原則として維持し、可用性との調停は操作階層ごとの失敗モードで行う | **L129** | 「「不明ならdeny」は認可の安全側原則」 | A | 04_architecture/pep-contract.md<br>04_architecture/fail-mode-matrix.md | E2 | G3 | — | open |  |

### 4.7 製品・運用モデルと ADR

親 ID 16 件（A 9／B 2／C 5／D 0）。主な原文箇所: 重大な不足（High 8）、Gate 3。

| R-ID | 原子要求 | 原文行 | 原文引用（30字以内） | 区分 | 対応成果物 | 証拠 | ゲート | 机上準備 | 状態 | 備考 |
|---|---|---|---|---|---|---|---|---|---|---|
| R-088 | build/buy/managed比較 | **L92** | 「build/buy/managed比較」 | A | 04_architecture/product-evaluation-exit.md<br>00_decision/08-alternatives-comparison.md | E2 | G3 | — | open |  |
| R-089 | engine候補PoC | **L92** | 「build/buy/managed比較、PoC」 | C | 12_poc/preregistered-test-plan.md | E5 | G4 | 計 | open |  |
| R-090 | 出口戦略 | **L92** | 「PoC、出口戦略、データ移行可能性」 | A | 04_architecture/product-evaluation-exit.md<br>05_adr/ADR-018-exit-strategy.md | E2 | G3 | — | open |  |
| R-091 | データ移行可能性 | **L92** | 「データ移行可能性、必要要員」 | C | 04_architecture/product-evaluation-exit.md<br>12_poc/preregistered-test-plan.md | E5 | G3/G4 | 計 | open |  |
| R-092 | 必要要員 | **L92** | 「必要要員を評価」 | B | 08_operations/operating-model.md | E1 | G0/G3 | 案 | open |  |
| R-093 | 選定評価軸13項目（整合性、最大深度、tail latency、障害モード、multi-region、バックアップ復旧、運用人員、ライセンス、価格変動、データ移出、schema portability、CVE対応、LTS） | **L176** | 「整合性、最大深度、tail latency、障害モード」 | C | 04_architecture/product-evaluation-exit.md | E2＋E5 | G3/G4 | 評価表 | open |  |
| R-094 | ADR: managed IdPか自営ASか（認証プロトコル・認証器・回復は自作しない） | **L165** | 「原則として認証プロトコル・認証器・回復を自作しない」 | A | 05_adr/ADR-001-build-buy-identity-provider.md | E2 | G3 | — | open |  |
| R-095 | ADR: opaque/JWT境界 | **L166** | 「access tokenはopaqueかJWTか」 | A | 05_adr/ADR-005-token-profile.md | E2 | G3 | — | open |  |
| R-096 | ADR: FAPI 2.0必須API範囲 | **L167** | 「FAPI 2.0を必須にするAPI範囲」 | A | 05_adr/ADR-020-fapi2-applicability.md | E2 | G3 | — | open |  |
| R-097 | ADR: engine/store、整合性モデル、tenant/domain分割 | **L168** | 「authorization engineとstoreの選定」 | C | 05_adr/ADR-010-authz-engine-store-consistency.md<br>12_poc/preregistered-test-plan.md | E2＋E5 | G3/G4 | 計 | open |  |
| R-098 | ADR: policy language、schema、deny semantics、conflict resolution | **L169** | 「policy language、schema」 | A | 05_adr/ADR-011-policy-language-pep-pdp-api.md | E2 | G3 | — | open |  |
| R-099 | ADR: PDP topology、cell・fault domain | **L170** | 「PDP topologyとcell/fault domain」 | C | 05_adr/ADR-013-cell-partitioning-fail-mode.md<br>04_architecture/cell-blast-radius.md | E2＋E5 | G3/G4 | 計 | open |  |
| R-100 | ADR: workload identityとtoken exchange | **L171** | 「identityとtoken exchange」 | A | 05_adr/ADR-009-workload-identity-token-exchange.md | E2 | G3 | — | open |  |
| R-101 | ADR: 鍵管理・crypto agility・PQC移行の抽象境界 | **L172** | 「鍵管理、暗号俊敏性、量子耐性移行の抽象境界」 | A | 05_adr/ADR-015-crypto-agility-pqc.md<br>05_adr/ADR-007-key-hierarchy-kms-hsm.md | E2 | G3 | — | open |  |
| R-102 | ADR: 監査データモデル・保持・所在地・顧客開示 | **L173** | 「監査データモデル、保持、データ所在地」 | B | 05_adr/ADR-014-audit-data.md<br>04_architecture/audit-privacy.md | E2 | G3 | 案（法務） | open |  |
| R-103 | ADR: migration・dual-write・shadow・rollback・vendor exit | **L174** | 「dual-write、shadow、rollback」 | A | 05_adr/ADR-027-migration-dual-run-rollback.md<br>05_adr/ADR-018-exit-strategy.md | E2 | G3 | — | open |  |

### 4.8 20 年の進化

親 ID 6 件（A 0／B 1／C 5／D 0）。主な原文箇所: 重大な不足（High 9）、承認条件7。

| R-ID | 原子要求 | 原文行 | 原文引用（30字以内） | 区分 | 対応成果物 | 証拠 | ゲート | 机上準備 | 状態 | 備考 |
|---|---|---|---|---|---|---|---|---|---|---|
| R-104 | crypto agility | **L93** | 「crypto agility」 | C | 04_architecture/evolution-pqc.md<br>05_adr/ADR-015-crypto-agility-pqc.md<br>12_poc/preregistered-test-plan.md | E4 | G3/G4 | 計 | open | critic修正: A→C。抽象境界の設計（L172）は R-101（A）が受ける。本行は、署名アルゴリズムや鍵種別を利用側の停止なしに切り替えられることを試験で示して閉じる（traceability/phase1-critique-R.md §5.1） |
| R-105 | version negotiation | **L93** | 「version negotiation」 | C | 04_architecture/evolution-pqc.md<br>11_contracts/compatibility-deprecation-policy.md | E4 | G3/G4 | 計 | open |  |
| R-106 | schema migration | **L93** | 「schema migration、dual-run」 | C | 04_architecture/evolution-pqc.md<br>05_adr/ADR-016-versioning-deprecation.md | E4 | G4/G6 | 計 | open |  |
| R-107 | dual-run | **L93**, L256 | 「schema migration、dual-run」 | C | 04_architecture/evolution-pqc.md<br>08_operations/phased-rollout.md | E5 | G4/G6 | 計 | open | L256「移行を実証」を含む |
| R-108 | deprecation policy | **L93** | 「deprecation policyを設計」 | B | 04_architecture/evolution-pqc.md<br>11_contracts/compatibility-deprecation-policy.md | E2 | G3 | 案 | open |  |
| R-109 | policy/model/schema/token/auditのversioning・後方互換・rollback方式 | **L245**, L93 | 「versioningと後方互換・rollback方式」 | C | 04_architecture/evolution-pqc.md<br>05_adr/ADR-016-versioning-deprecation.md | E4 | G3/G4 | 計 | open |  |

### 4.9 インシデント対応

親 ID 8 件（A 1／B 1／C 6／D 0）。主な原文箇所: 重大な不足（High 10）、承認条件10。

| R-ID | 原子要求 | 原文行 | 原文引用（30字以内） | 区分 | 対応成果物 | 証拠 | ゲート | 机上準備 | 状態 | 備考 |
|---|---|---|---|---|---|---|---|---|---|---|
| R-110 | 侵害対象別runbook（token/鍵/IdP/PDP/監査基盤） | **L94** | 「token・鍵・IdP・PDP・監査基盤ごとの侵害時」 | A | 08_operations/compromise-runbooks.md<br>05_adr/ADR-019-compromise-response.md | E2 | G2/G4 | — | open |  |
| R-111 | kill switch | **L94**, L248 | 「kill switch、全session失効、鍵切替」 | C | 08_operations/compromise-runbooks.md | E8 | G4 | 計 | open |  |
| R-112 | 全session失効 | **L248**, L94 | 「全session失効、鍵交換」 | C | 08_operations/compromise-runbooks.md<br>04_architecture/revocation-continuous-evaluation.md | E8 | G4 | 計 | open |  |
| R-113 | 鍵切替 | **L94**, L248 | 「全session失効、鍵切替」 | C | 08_operations/compromise-runbooks.md | E8 | G4 | 計 | open |  |
| R-114 | 顧客通知（判断基準と法定報告連動） | **L94**, L248 | 「顧客通知、証拠保全演習」 | B | 08_operations/compromise-runbooks.md<br>06_controls/applicability.md | E1 | G0/G4 | 案 | open | 一部根拠薄: 「法定報告連動」は原文になく種資料の補足（法域要件 R-010 からの推論） |
| R-115 | 証拠保全 | **L94**, L248 | 「鍵切替、顧客通知、証拠保全演習」 | C | 08_operations/compromise-runbooks.md | E8 | G4 | 計 | open |  |
| R-116 | PDP隔離 | **L248** | 「鍵交換、PDP隔離」 | C | 08_operations/compromise-runbooks.md | E8 | G4 | 計 | open |  |
| R-117 | 上記演習の合格 | **L248** | 「演習に合格している」 | C | 08_operations/compromise-runbooks.md | E8 | G4/G6 | 演習計画 | open |  |

### 4.10 証跡・プライバシー

親 ID 11 件（A 3／B 3／C 5／D 0）。主な原文箇所: 重大な不足（High 11）、数値契約後段。

| R-ID | 原子要求 | 原文行 | 原文引用（30字以内） | 区分 | 対応成果物 | 証拠 | ゲート | 机上準備 | 状態 | 備考 |
|---|---|---|---|---|---|---|---|---|---|---|
| R-118 | 監査ログの目的 | **L95** | 「目的、最小化、保持、地域」 | A | 04_architecture/audit-privacy.md<br>05_adr/ADR-014-audit-data.md | E2 | G3 | — | open |  |
| R-119 | 最小化 | **L95** | 「目的、最小化、保持、地域」 | A | 04_architecture/audit-privacy.md<br>11_contracts/schemas/audit-event.schema.json | E2 | G3 | — | open |  |
| R-120 | 保持期間 | **L95** | 「保持、地域、アクセス」 | B | 04_architecture/audit-privacy.md<br>06_controls/applicability.md | E2（法務署名） | G0/G3 | 案（法務） | open | 数値は R-193.4 |
| R-121 | 保存地域 | **L95** | 「保持、地域、アクセス」 | B | 04_architecture/audit-privacy.md<br>06_controls/applicability.md | E2（法務署名） | G0/G3 | 案 | open |  |
| R-122 | アクセス統制 | **L95** | 「地域、アクセス、WORM」 | A | 04_architecture/audit-privacy.md | E2 | G3 | — | open |  |
| R-123 | WORM | **L95** | 「WORM、削除、コスト」 | C | 04_architecture/audit-privacy.md | E5 | G3/G4 | 計 | open |  |
| R-124 | 削除 | **L95** | 「WORM、削除、コスト」 | B | 04_architecture/audit-privacy.md<br>06_controls/applicability.md | E2（法務署名） | G0/G3 | 案 | open |  |
| R-125 | コスト | **L95** | 「全decision監査は大量・高コスト」 | C | 04_architecture/audit-privacy.md<br>04_architecture/capacity-model.md | E5 | G3/G4 | 計 | open |  |
| R-126 | SIEM障害時挙動 | **L95** | 「SIEM障害時挙動を確定」 | C | 04_architecture/audit-privacy.md<br>12_poc/preregistered-test-plan.md | E5 | G4 | 計 | open |  |
| R-127 | 記録率・欠損検知・backpressure・監査経路停止時挙動の定義 | **L219** | 「記録率、欠損検知、backpressure」 | C | 04_architecture/audit-privacy.md<br>11_contracts/schemas/audit-event.schema.json | E5 | G4 | 計 | open |  |
| R-128 | 監査をtrace samplingに依存させず独立経路 | **L219** | 「trace samplingへ依存させず」 | C | 04_architecture/audit-privacy.md | E5 | G3/G4 | 計 | open | 原文は「維持すべき」方針として記載 |

### 4.11 顧客管理機能・人材

親 ID 13 件（A 2／B 6／C 5／D 0）。主な原文箇所: 重大な不足（Medium 12・13）、承認条件9。

| R-ID | 原子要求 | 原文行 | 原文引用（30字以内） | 区分 | 対応成果物 | 証拠 | ゲート | 机上準備 | 状態 | 備考 |
|---|---|---|---|---|---|---|---|---|---|---|
| R-129 | federation onboarding | **L96** | 「onboarding/offboarding」 | C | 02_requirements/customer-admin-responsibility.md<br>05_adr/ADR-004-b2b-federation-linking-scim.md | E4 | G1/G4 | 計 | open |  |
| R-130 | offboarding | **L96** | 「onboarding/offboarding」 | C | 02_requirements/customer-admin-responsibility.md | E4 | G1/G4 | 計 | open |  |
| R-131 | domain verification | **L96** | 「domain verification、SCIM」 | C | 02_requirements/customer-admin-responsibility.md<br>05_adr/ADR-004-b2b-federation-linking-scim.md | E4 | G1/G4 | 計 | open |  |
| R-132 | SCIM | **L96** | 「SCIM、顧客監査APIを設計」 | C | 02_requirements/customer-admin-responsibility.md<br>11_contracts/scim.openapi.yaml | E4 | G1/G4 | 計 | open |  |
| R-133 | delegated admin | **L96** | 「domain claim、delegated admin」 | C | 02_requirements/customer-admin-responsibility.md | E4 | G1/G4 | 計 | open | 原文では「問題になる理由」欄に攻撃面として記載 |
| R-134 | 顧客向け監査API | **L96** | 「顧客監査APIを設計」 | A | 02_requirements/customer-admin-responsibility.md | E2 | G3 | — | open |  |
| R-135 | 顧客管理者・SAML/OIDC設定を攻撃面として脅威モデル化 | **L96** | 「顧客管理者、SCIM、SAML/OIDC設定」 | A | 03_threat-model/threat-catalog.md | E2 | G2 | — | open |  |
| R-136 | platform/domain/security/SREの責任分界 | **L97** | 「security/SREの責任分界」 | B | 08_operations/operating-model.md | E1 | G0 | 案 | open |  |
| R-137 | on-call | **L97**, L247 | 「on-call、教育、bus factor」 | B | 08_operations/operating-model.md | E1 | G0/G6 | 案 | open |  |
| R-138 | 教育 | **L97**, L247 | 「on-call、教育、bus factor」 | B | 08_operations/operating-model.md<br>10_integration/developer-faq.md | E1 | G0/G6 | 案 | open |  |
| R-139 | bus factor | **L97**, L247 | 「on-call、教育、bus factor」 | B | 08_operations/operating-model.md | E1 | G0/G6 | 案 | open |  |
| R-140 | 変更承認 | **L97** | 「bus factor、変更承認を定義」 | B | 08_operations/operating-model.md<br>10_integration/onboarding.md | E1 | G0/G6 | 案 | open |  |
| R-141 | 24/365運用責任・SRE容量・vendor support・TCO承認 | **L247** | 「24時間365日の運用責任、SRE容量」 | B | 08_operations/operating-model.md<br>08_operations/tco-vendor-lts.md | E1 | G0/G6 | 案 | open |  |

### 4.12 認可整合性・共有 PDP・OAuth/JWT

親 ID 23 件（A 4／B 1／C 17／D 1）。主な原文箇所: 技術上の危険点（Zanzibar系、共有PDP、JWT・OAuth）、Gate 4 末尾。

| R-ID | 原子要求 | 原文行 | 原文引用（30字以内） | 区分 | 対応成果物 | 証拠 | ゲート | 机上準備 | 状態 | 備考 |
|---|---|---|---|---|---|---|---|---|---|---|
| R-142 | 「Zanzibar相当」と主張せず採用engineの実保証範囲を明記 | **L111** | 「Zanzibar相当の保証を得ることは同義ではない」 | A | 04_architecture/authorization-model.md | E2 | G3 | — | open |  |
| R-143 | 剥奪→拒否の最大時間（操作単位） | **L113** | 「権限剥奪直後に何ミリ秒以内で拒否するか」 | C | 04_architecture/authorization-model.md<br>04_architecture/revocation-continuous-evaluation.md<br>12_poc/preregistered-test-plan.md | E5 | G4 | 計 | open |  |
| R-144 | 変更直後読取のconsistency mode | **L113**, L111 | 「どのconsistency modeを使うか」 | C | 04_architecture/authorization-model.md<br>05_adr/ADR-010-authz-engine-store-consistency.md<br>12_poc/preregistered-test-plan.md | E5 | G3/G4 | 計 | open |  |
| R-145 | コンテンツ更新とrelation更新の原子的結合 | **L113**, L79 | 「relation更新をどう原子的に結び付ける」 | C | 04_architecture/authorization-model.md<br>12_poc/preregistered-test-plan.md | E5 | G4 | 計 | open | L79 の consistency token による因果順序の認識を含む |
| R-146 | cache/replica由来stalenessの測定 | **L111** | 「キャッシュがstalenessを増やすこと」 | C | 04_architecture/authorization-model.md<br>12_poc/preregistered-test-plan.md | E5 | G4 | 計 | open |  |
| R-147 | model ID pin | **L113** | 「特定model IDをpinし」 | C | 04_architecture/authorization-model.md<br>11_contracts/relationship-model-registry.openapi.yaml | E4 | G4/G6 | 計 | open |  |
| R-148 | 新旧モデルshadow check | **L113** | 「新旧モデルのshadow check」 | C | 04_architecture/authorization-model.md<br>12_poc/preregistered-test-plan.md | E4 | G4/G6 | 計 | open |  |
| R-149 | 段階展開 | **L113** | 「shadow check、段階展開は必須」 | C | 04_architecture/authorization-model.md<br>08_operations/phased-rollout.md | E5 | G6 | 計 | open |  |
| R-150 | tenant/domain単位の障害封じ込め | **L119** | 「domainごとのfault containment」 | C | 04_architecture/cell-blast-radius.md<br>12_poc/preregistered-test-plan.md | E5 | G3/G4 | 計 | open |  |
| R-151 | policy store分割（per-tenant store検討） | **L119**, L117 | 「policy store分割、quota」 | A | 04_architecture/cell-blast-radius.md<br>05_adr/ADR-010-authz-engine-store-consistency.md | E2 | G3 | — | open |  |
| R-152 | quotaによるnoisy neighbor対策 | **L119**, L117 | 「quota、cell architecture」 | C | 04_architecture/cell-blast-radius.md<br>12_poc/preregistered-test-plan.md | E5 | G4 | 計 | open |  |
| R-153 | cell architecture | **L119** | 「cell architecture、段階rollout」 | A | 04_architecture/cell-blast-radius.md<br>05_adr/ADR-013-cell-partitioning-fail-mode.md | E2 | G3 | — | open |  |
| R-154 | 段階rollout | **L119** | 「段階rollout、緊急freeze」 | C | 04_architecture/cell-blast-radius.md<br>08_operations/phased-rollout.md | E5 | G6 | 計 | open |  |
| R-155 | 緊急freeze | **L119** | 「緊急freeze、既知良好版」 | C | 04_architecture/cell-blast-radius.md<br>01_governance/stop-authority.md | E4 | G4/G6 | 計 | open |  |
| R-156 | 既知良好版への即時復帰 | **L119** | 「既知良好版への即時復帰」 | C | 04_architecture/cell-blast-radius.md<br>12_poc/preregistered-test-plan.md | E5 | G4/G6 | 計 | open |  |
| R-157 | global store/PDP集約時はblast radius・noisy neighbor抑制を実証 | **L229** | 「noisy neighborを実証的に抑えられる場合」 | D | 04_architecture/cell-blast-radius.md<br>09_assurance/rfp-sow.md | E5＋E6 | G4/G5 | 計・RFP | open | 意思決定マトリクス5行目（既定構成は R-265） |
| R-158 | RFC 9700を明示準拠基準化（implicit廃止、PKCE、redirect完全一致、refresh保護、issuer binding、非対称クライアント認証） | **L123**, L79 | 「RFC 9700を明示的な準拠基準としていない」 | C | 04_architecture/token-profile.md<br>05_adr/ADR-005-token-profile.md | E4 | G3 | 準拠表 | open |  |
| R-159 | OAuth Security BCP準拠profileの文書化 | **L243** | 「Security BCP準拠profile」 | A | 04_architecture/token-profile.md | E2 | G3 | — | open |  |
| R-160 | 高価値APIへのFAPI 2.0採否 | **L243**, L125 | 「高価値APIに対するFAPI 2.0採否」 | B | 04_architecture/token-profile.md<br>05_adr/ADR-020-fapi2-applicability.md | E2 | G3 | 案 | open |  |
| R-161 | JWT厳格検証（alg allowlist、typ、iss、aud、時刻、鍵-issuer結合） | **L190** | 「署名鍵とissuerの結合を厳格に検証」 | C | 04_architecture/token-profile.md<br>11_contracts/schemas/access-token-claims.schema.json | E4 | G4 | 計 | open |  |
| R-162 | 種類の異なるJWT間で相互排他的検証規則 | **L190** | 「相互排他的な検証規則を持たせる」 | C | 04_architecture/token-profile.md<br>11_contracts/schemas/access-token-claims.schema.json | E4 | G4 | 計 | open |  |
| R-163 | DPoPの限界明記とBFF・CSP・短命化・鍵保護の併用 | **L190** | 「BFF、CSP、短命化、鍵保護と併用する」 | C | 04_architecture/token-profile.md | E4 | G3/G4 | 計 | open |  |
| R-261 | 共有PDPの全体波及シナリオ（誤ったglobal deny/allow、schema移行、キャッシュ汚染、tenant routing不具合）をblast radius分析と障害注入の対象にする | **L117** | 「キャッシュ汚染、tenant routing不具合」 | C | 04_architecture/cell-blast-radius.md<br>12_poc/preregistered-test-plan.md | E5 | G3/G4 | 計 | open |  |

### 4.13 Gate 1〜6 の工程要求

親 ID 25 件（A 5／B 2／C 16／D 2）。主な原文箇所: 進め方の再設計 Gate 1〜6。

| R-ID | 原子要求 | 原文行 | 原文引用（30字以内） | 区分 | 対応成果物 | 証拠 | ゲート | 机上準備 | 状態 | 備考 |
|---|---|---|---|---|---|---|---|---|---|---|
| R-164 | DFD（全entry point、trust boundary、非同期経路、管理面、緊急経路） | **L153** | 「trust boundary、データフロー、非同期経路」 | A | 03_threat-model/dfd-entry-points.md | E2 | G1 | — | open |  |
| R-165 | ASVSで受入基準化（アーキ・認証・session・アクセス制御） | **L153** | 「この粒度を受入基準へ落とし込める」 | A | 06_controls/control-mapping-ledger.md<br>09_assurance/self-assessments.md | E3 | G1 | — | open |  |
| R-166 | 攻撃者12類型（外部攻撃者、悪意あるテナント管理者、侵害された一般ユーザー、侵害された顧客IdP、盗まれたtoken、侵害されたmicroservice、CI/CD侵害、クラウド管理者、内部support、policy author、DB read権限者、リージョン障害） | **L157** | 「外部攻撃者、悪意あるテナント管理者」 | A | 03_threat-model/attacker-model.md | E2 | G2 | — | open |  |
| R-167 | 各脅威に予防・検知・封じ込め・復旧・証拠を記載 | **L159** | 「予防、検知、封じ込め、復旧、証拠を記載」 | A | 03_threat-model/threat-catalog.md | E2 | G2 | — | open |  |
| R-168 | 具体脅威10（フィッシング耐性、recovery bypass、session theft、token replay、IdP mix-up、JWKS差替え、tenant confusion、BOLA、policy rollback、stale allow）の検証 | **L159** | 「recovery bypass、session theft」 | C | 03_threat-model/threat-catalog.md<br>12_poc/preregistered-test-plan.md | E4 | G2/G4 | 計 | open | 原文 L159 は脅威記述の具体化を求める。実測検証は L182〜L188 の PoC 項目と重なる |
| R-169 | PoCはhappy pathでなく攻撃・障害主目的 | **L180**, L256 | 「攻撃と障害を主目的にする」 | C | 12_poc/preregistered-test-plan.md | E4/E5 | G4 | 計 | open |  |
| R-170 | PoC: ID・所属シナリオ群（2テナント、複数IdP、同一メール、複数所属、招待、退職、SCIM遅延、account recovery） | **L182** | 「2テナント、複数IdP、同一メール、複数所属」 | C | 12_poc/preregistered-test-plan.md | E4 | G4 | 計 | open |  |
| R-171 | PoC: 認可graph（folder移動・外部共有・nesting・custom role・剥奪直後・同時更新） | **L183** | 「folder移動、外部共有、group nesting」 | C | 12_poc/preregistered-test-plan.md | E4 | G4 | 計 | open |  |
| R-172 | PoC: cross-tenant property test | **L184** | 「cross-tenant property test」 | C | 12_poc/preregistered-test-plan.md<br>11_contracts/mock-contract-test-kit.md | E4 | G4 | 計 | open |  |
| R-173 | PoC: token誤用（API A用tokenのAPI B提示、redirect URI差異、issuer mix-up、stolen refresh token、DPoP replay） | **L185** | 「API A用tokenをAPI Bへ提示」 | C | 12_poc/preregistered-test-plan.md | E4 | G4 | 計 | open |  |
| R-174 | PoC: 障害注入（PDP timeout、全断、片リージョン断、read replica lag、古いpolicy bundle、鍵rotation、JWKS障害） | **L186** | 「PDP timeout、全断、片リージョン断」 | C | 12_poc/preregistered-test-plan.md | E5 | G4 | 計 | open |  |
| R-175 | PoC: differential test・shadow・rollback | **L187** | 「旧版・新版differential test」 | C | 12_poc/preregistered-test-plan.md | E4 | G4 | 計 | open |  |
| R-176 | PoC: 特権操作・監査改ざん・監査基盤停止 | **L188** | 「監査改ざん・監査基盤停止」 | C | 12_poc/preregistered-test-plan.md<br>03_threat-model/fraud-abuse-controls.md | E4 | G4 | 計 | open |  |
| R-177 | 新旧認可のdual-runと差分記録 | **L200** | 「旧判定と新判定の差分を記録する」 | C | 08_operations/phased-rollout.md<br>05_adr/ADR-027-migration-dual-run-rollback.md | E5 | G6 | 計 | open |  |
| R-178 | 新基盤allowが広い差分は即時調査、deny差分は業務影響確認 | **L200** | 「allowが旧基盤より広い差分は即時調査」 | C | 08_operations/phased-rollout.md | E5 | G6 | 計 | open |  |
| R-179 | 導入順序（read-only→低リスクtenant→限定resource type→cell単位拡大） | **L200**, L256 | 「read-only、低リスクtenant」 | B | 08_operations/phased-rollout.md | E2 | G6 | 案 | open | L256「限定スコープの本番導入」を含む |
| R-180 | 各段階の自動rollback条件 | **L200** | 「各段階に自動rollback条件を置く」 | C | 08_operations/phased-rollout.md | E5 | G6 | 計 | open |  |
| R-181 | 四半期KRI | **L202** | 「四半期ごとにKRI」 | B | 09_assurance/continuous-assurance-plan.md<br>01_governance/kri.md | E2 | G6 | 様 | open |  |
| R-182 | 年次独立評価 | **L202** | 「年次独立評価、定期red team」 | D | 09_assurance/continuous-assurance-plan.md<br>09_assurance/rfp-sow.md | E6 | G6 | RFP | open |  |
| R-183 | 定期red team | **L202** | 「年次独立評価、定期red team」 | D | 09_assurance/continuous-assurance-plan.md<br>09_assurance/rfp-sow.md | E6 | G6 | RFP | open |  |
| R-184 | 鍵・IdP・PDP侵害演習 | **L202** | 「鍵・IdP・PDP侵害演習」 | C | 08_operations/compromise-runbooks.md<br>09_assurance/continuous-assurance-plan.md | E8 | G6 | 計 | open |  |
| R-185 | schema migration演習 | **L202** | 「schema migration演習」 | C | 08_operations/compromise-runbooks.md<br>09_assurance/continuous-assurance-plan.md | E8 | G6 | 計 | open |  |
| R-186 | vendor exit演習 | **L202** | 「vendor exit演習」 | C | 08_operations/compromise-runbooks.md<br>09_assurance/continuous-assurance-plan.md | E8 | G6 | 計 | open |  |
| R-187 | 脆弱性根本原因の将来開発への反映（SSDF RV.3） | **L202** | 「脆弱性の根本原因を将来の開発へ反映する」 | C | 09_assurance/continuous-assurance-plan.md<br>traceability/open-items.md | E11 | G6 | 様 | open | 「RV.3」は種資料の付記（原文は SSDF まで） |
| R-215 | 脅威モデリングを反復可能な工程（対象の分解→脅威の特定・順位付け→緩和→レビュー・検証）として実施し、完了した成果物にする | **L7** | 「脅威の特定・順位付け、緩和、レビュー・検証」 | A | 03_threat-model/threat-catalog.md<br>03_threat-model/dfd-entry-points.md | E2 | G2 | — | open | 原文は Phase 0 の脅威モデルが未完了と指摘。外部レビューは R-063 |

### 4.14 必須の数値契約

親 ID 9 件、枝番 43 件（A 0／B 8／C 44／D 0）。主な原文箇所: 必須の数値契約（8分類の全指標を枝番で展開）。

| R-ID | 原子要求 | 原文行 | 原文引用（30字以内） | 区分 | 対応成果物 | 証拠 | ゲート | 机上準備 | 状態 | 備考 |
|---|---|---|---|---|---|---|---|---|---|---|
| R-188 | 数値契約: 認証（指標は R-188.1〜R-188.7） | **L210**, L206 | 「login成功率、p95/p99」 | C | 07_slo/numeric-contracts.md<br>01_governance/business-impact-analysis.md | E1＋E5 | G0/G4 | 指標定義・測定設計 | open | 種資料の B+C を最重区分 C に正規化（数値の決裁 B を併用） |
| R-188.1 | 認証: login成功率 | **L210** | 「login成功率」 | C | 07_slo/numeric-contracts.md<br>12_poc/preregistered-test-plan.md | E5 | G0/G4 | 測定設計 | open |  |
| R-188.2 | 認証: login 遅延 p95/p99 | **L210** | 「p95/p99」 | C | 07_slo/numeric-contracts.md<br>12_poc/preregistered-test-plan.md | E5 | G0/G4 | 測定設計 | open |  |
| R-188.3 | 認証: IdP障害時挙動（挙動の定義と復帰・縮退の数値） | **L210** | 「IdP障害時挙動」 | C | 07_slo/numeric-contracts.md<br>04_architecture/fail-mode-matrix.md | E5 | G3/G4 | 測定設計 | open |  |
| R-188.4 | 認証: session最大時間 | **L210** | 「session最大時間」 | B | 07_slo/numeric-contracts.md<br>02_requirements/operation-risk-tiers-assurance.md | E1 | G0/G1 | 案 | open | 操作リスク階層ごとの設定値 |
| R-188.5 | 認証: 再認証間隔 | **L210** | 「再認証間隔」 | B | 07_slo/numeric-contracts.md<br>02_requirements/operation-risk-tiers-assurance.md | E1 | G0/G1 | 案 | open | 操作リスク階層ごとの設定値 |
| R-188.6 | 認証: 回復完了SLO | **L210** | 「回復完了SLO」 | C | 07_slo/numeric-contracts.md<br>02_requirements/identity-lifecycle.md | E5 | G0/G4 | 測定設計 | open |  |
| R-188.7 | 認証: 不正回復検知時間 | **L210** | 「不正回復検知時間」 | C | 07_slo/numeric-contracts.md<br>03_threat-model/fraud-abuse-controls.md | E5 | G4 | 測定設計 | open |  |
| R-189 | 数値契約: token（指標は R-189.1〜R-189.6） | **L211**, L206 | 「access/refresh寿命、clock skew」 | C | 07_slo/numeric-contracts.md<br>04_architecture/token-profile.md | E1＋E5 | G0/G4 | 指標定義・測定設計 | open | 種資料の B+C を最重区分 C に正規化 |
| R-189.1 | token: access/refresh寿命（access と refresh を別値で定める） | **L211**, L232 | 「access/refresh寿命」 | C | 07_slo/numeric-contracts.md<br>04_architecture/token-profile.md | E5 | G3/G4 | 測定設計 | open | 一律値は不可（R-087）。リスク階層と実測で決める |
| R-189.2 | token: clock skew | **L211** | 「clock skew」 | C | 07_slo/numeric-contracts.md<br>04_architecture/token-profile.md | E4 | G3/G4 | 測定設計 | open |  |
| R-189.3 | token: 鍵rotation周期 | **L211** | 「鍵rotation周期」 | B | 07_slo/numeric-contracts.md<br>04_architecture/root-of-trust.md | E1 | G0/G3 | 案 | open |  |
| R-189.4 | token: 旧鍵併存時間 | **L211** | 「旧鍵併存時間」 | C | 07_slo/numeric-contracts.md<br>04_architecture/root-of-trust.md | E5 | G3/G4 | 測定設計 | open |  |
| R-189.5 | token: 緊急失効完了時間 | **L211** | 「緊急失効完了時間」 | C | 07_slo/numeric-contracts.md<br>08_operations/compromise-runbooks.md | E8 | G4 | 測定設計 | open |  |
| R-189.6 | token: JWKS cache最大齢 | **L211** | 「JWKS cache最大齢」 | C | 07_slo/numeric-contracts.md<br>04_architecture/token-profile.md | E5 | G3/G4 | 測定設計 | open |  |
| R-190 | 数値契約: 認可（指標は R-190.1〜R-190.6） | **L212**, L206 | 「Check p95/p99/p99.9」 | C | 07_slo/numeric-contracts.md<br>04_architecture/capacity-model.md | E1＋E5 | G0/G4 | 指標定義・測定設計 | open | 種資料の B+C を最重区分 C に正規化 |
| R-190.1 | 認可: Check p95/p99/p99.9 | **L212** | 「Check p95/p99/p99.9」 | C | 07_slo/numeric-contracts.md<br>12_poc/preregistered-test-plan.md | E5 | G0/G4 | 測定設計 | open |  |
| R-190.2 | 認可: availability | **L212** | 「availability」 | C | 07_slo/numeric-contracts.md<br>12_poc/preregistered-test-plan.md | E5 | G0/G4 | 測定設計 | open |  |
| R-190.3 | 認可: 最大graph depth/fanout | **L212** | 「最大graph depth/fanout」 | C | 07_slo/numeric-contracts.md<br>04_architecture/capacity-model.md | E5 | G3/G4 | 測定設計 | open |  |
| R-190.4 | 認可: query budget | **L212** | 「query budget」 | C | 07_slo/numeric-contracts.md<br>04_architecture/capacity-model.md | E5 | G3/G4 | 測定設計 | open |  |
| R-190.5 | 認可: 誤allow許容値 | **L212** | 「誤allow許容値」 | C | 07_slo/numeric-contracts.md<br>01_governance/risk-appetite-draft.md | E5 | G0/G4 | 測定設計 | open | 許容値は経営決裁（R-011）、実測は differential test（R-175） |
| R-190.6 | 認可: 誤deny予算 | **L212** | 「誤deny予算」 | C | 07_slo/numeric-contracts.md<br>01_governance/business-impact-analysis.md | E5 | G0/G4 | 測定設計 | open |  |
| R-191 | 数値契約: 剥奪（指標は R-191.1〜R-191.3） | **L213**, L206 | 「通常・高権限・tenant停止ごとの最大反映時間」 | C | 07_slo/numeric-contracts.md<br>04_architecture/revocation-continuous-evaluation.md | E1＋E5 | G0/G4 | 指標定義・測定設計 | open | 種資料の B+C を最重区分 C に正規化 |
| R-191.1 | 剥奪: 通常・高権限・tenant停止ごとの最大反映時間（3区分で別値） | **L213** | 「通常・高権限・tenant停止ごとの最大反映時間」 | C | 07_slo/numeric-contracts.md<br>04_architecture/revocation-continuous-evaluation.md | E5 | G0/G4 | 測定設計 | open |  |
| R-191.2 | 剥奪: stale allowの最大継続 | **L213** | 「stale allowの最大継続」 | C | 07_slo/numeric-contracts.md<br>04_architecture/revocation-continuous-evaluation.md | E5 | G4 | 測定設計 | open |  |
| R-191.3 | 剥奪: cache invalidation成功率 | **L213** | 「cache invalidation成功率」 | C | 07_slo/numeric-contracts.md<br>04_architecture/authorization-model.md | E5 | G4 | 測定設計 | open |  |
| R-192 | 数値契約: 可用性（指標は R-192.1〜R-192.5） | **L214**, L206 | 「control/decision plane別SLO」 | C | 07_slo/numeric-contracts.md<br>01_governance/business-impact-analysis.md | E1＋E5 | G0/G4 | 指標定義・測定設計 | open | 種資料の B+C を最重区分 C に正規化 |
| R-192.1 | 可用性: control/decision plane別SLO（2面で別値） | **L214** | 「control/decision plane別SLO」 | C | 07_slo/numeric-contracts.md<br>04_architecture/cell-blast-radius.md | E5 | G0/G4 | 測定設計 | open |  |
| R-192.2 | 可用性: RTO | **L214** | 「RTO、RPO、リージョン切替時間」 | C | 07_slo/numeric-contracts.md<br>01_governance/business-impact-analysis.md | E8 | G0/G4 | 測定設計 | open |  |
| R-192.3 | 可用性: RPO | **L214** | 「RTO、RPO、リージョン切替時間」 | C | 07_slo/numeric-contracts.md<br>01_governance/business-impact-analysis.md | E8 | G0/G4 | 測定設計 | open |  |
| R-192.4 | 可用性: リージョン切替時間 | **L214** | 「リージョン切替時間」 | C | 07_slo/numeric-contracts.md<br>12_poc/preregistered-test-plan.md | E5 | G4 | 測定設計 | open |  |
| R-192.5 | 可用性: dependency budget | **L214** | 「dependency budget」 | C | 07_slo/numeric-contracts.md<br>10_integration/dependency-tiers.md | E5 | G3/G4 | 測定設計 | open |  |
| R-193 | 数値契約: 監査（指標は R-193.1〜R-193.6） | **L215**, L206 | 「重要decision記録率、欠損検知時間」 | C | 07_slo/numeric-contracts.md<br>04_architecture/audit-privacy.md | E1＋E5 | G0/G4 | 指標定義・測定設計 | open | 種資料の B+C を最重区分 C に正規化 |
| R-193.1 | 監査: 重要decision記録率 | **L215** | 「重要decision記録率」 | C | 07_slo/numeric-contracts.md<br>04_architecture/audit-privacy.md | E5 | G4 | 測定設計 | open |  |
| R-193.2 | 監査: 欠損検知時間 | **L215** | 「欠損検知時間」 | C | 07_slo/numeric-contracts.md<br>04_architecture/audit-privacy.md | E5 | G4 | 測定設計 | open |  |
| R-193.3 | 監査: WORM転送遅延 | **L215** | 「WORM転送遅延」 | C | 07_slo/numeric-contracts.md<br>04_architecture/audit-privacy.md | E5 | G4 | 測定設計 | open |  |
| R-193.4 | 監査: 保持期間 | **L215** | 「保持期間」 | B | 07_slo/numeric-contracts.md<br>04_architecture/audit-privacy.md<br>06_controls/applicability.md | E2（法務署名） | G0/G3 | 案（法務） | open | R-120 の数値面 |
| R-193.5 | 監査: 検索SLO | **L215** | 「検索SLO」 | C | 07_slo/numeric-contracts.md<br>04_architecture/audit-privacy.md | E5 | G4 | 測定設計 | open |  |
| R-193.6 | 監査: 時刻同期精度 | **L215** | 「時刻同期精度」 | C | 07_slo/numeric-contracts.md<br>04_architecture/audit-privacy.md | E5 | G3/G4 | 測定設計 | open |  |
| R-194 | 数値契約: 変更（指標は R-194.1〜R-194.5） | **L216**, L206 | 「policy/model canary期間」 | C | 07_slo/numeric-contracts.md<br>08_operations/phased-rollout.md | E1＋E5 | G0/G4 | 指標定義・測定設計 | open | 種資料の B+C を最重区分 C に正規化 |
| R-194.1 | 変更: policy/model canary期間 | **L216** | 「policy/model canary期間」 | B | 07_slo/numeric-contracts.md<br>08_operations/phased-rollout.md | E1 | G3/G6 | 案 | open |  |
| R-194.2 | 変更: diff許容条件 | **L216** | 「diff許容条件」 | B | 07_slo/numeric-contracts.md<br>08_operations/phased-rollout.md | E1 | G6 | 案 | open | R-178 と連動 |
| R-194.3 | 変更: rollback時間 | **L216** | 「rollback時間」 | C | 07_slo/numeric-contracts.md<br>12_poc/preregistered-test-plan.md | E5 | G4/G6 | 測定設計 | open |  |
| R-194.4 | 変更: schema互換期間 | **L216** | 「schema互換期間」 | B | 07_slo/numeric-contracts.md<br>11_contracts/compatibility-deprecation-policy.md | E2 | G3 | 案 | open |  |
| R-194.5 | 変更: 未移行consumer数 | **L216** | 「未移行consumer数」 | C | 07_slo/numeric-contracts.md<br>11_contracts/compatibility-deprecation-policy.md | E4 | G6 | 測定設計 | open |  |
| R-195 | 数値契約: インシデント（指標は R-195.1〜R-195.5） | **L217**, L206 | 「MTTD、封じ込め時間、全session失効時間」 | C | 07_slo/numeric-contracts.md<br>08_operations/compromise-runbooks.md | E1＋E8 | G0/G4 | 指標定義・測定設計 | open | 種資料の B+C を最重区分 C に正規化 |
| R-195.1 | インシデント: MTTD | **L217** | 「MTTD」 | C | 07_slo/numeric-contracts.md<br>08_operations/compromise-runbooks.md | E8 | G4/G6 | 測定設計 | open |  |
| R-195.2 | インシデント: 封じ込め時間 | **L217** | 「封じ込め時間」 | C | 07_slo/numeric-contracts.md<br>08_operations/compromise-runbooks.md | E8 | G4/G6 | 測定設計 | open |  |
| R-195.3 | インシデント: 全session失効時間 | **L217** | 「全session失効時間」 | C | 07_slo/numeric-contracts.md<br>08_operations/compromise-runbooks.md | E8 | G4 | 測定設計 | open |  |
| R-195.4 | インシデント: 鍵差替え時間 | **L217** | 「鍵差替え時間」 | C | 07_slo/numeric-contracts.md<br>08_operations/compromise-runbooks.md | E8 | G4 | 測定設計 | open |  |
| R-195.5 | インシデント: 顧客通知判断時間 | **L217** | 「顧客通知判断時間」 | C | 07_slo/numeric-contracts.md<br>08_operations/compromise-runbooks.md | E8 | G4 | 測定設計 | open | 判断基準そのものは R-114（B） |
| R-196 | 数値はBIAと実測で決め任意値を置かない、空欄の本番承認不可 | **L206** | 「空欄のまま本番承認してはならない」 | B | 07_slo/numeric-contracts.md<br>01_governance/business-impact-analysis.md | E1 | G0/G4 | 様 | open |  |

### 4.15 文書品質

親 ID 6 件（A 6／B 0／C 0／D 0）。主な原文箇所: 文書品質の問題。

| R-ID | 原子要求 | 原文行 | 原文引用（30字以内） | 区分 | 対応成果物 | 証拠 | ゲート | 机上準備 | 状態 | 備考 |
|---|---|---|---|---|---|---|---|---|---|---|
| R-197 | 引用番号と主張の不一致を全件是正 | **L135** | 「引用索引が崩れている」 | A | traceability/citation-audit-proposal.md | E3 | G0 | 是正候補（seed-01 §2 末尾） | open | 原文の例示は DPoP（別製品の説明を指す）と JWT BCP（認可サーバー作成ガイドを指す）の2件 |
| R-198 | Q&A等二次情報を一次仕様へ差替 | **L135** | 「Q&Aページを一次仕様の代替にしている」 | A | traceability/citation-audit-proposal.md<br>traceability/claims-ledger.md | E3 | G0 | — | open |  |
| R-199 | 主張を6区分（規範RFC、NIST/ISO、ベンダー正式仕様、適合試験結果、実測、設計推論） | **L137** | 「規範RFC、NIST/ISO、ベンダー正式仕様」 | A | traceability/claims-ledger.md | E3 | G0 | — | open | CONVENTIONS §3 の主張タグで実装する。6区分とタグの対応は claims-ledger で確定 |
| R-200 | 「非常に高い」自己評価削除、「高セキュリティを目標とする設計候補」と表記 | **L139**, L233 | 「自己評価は削除すべきである」 | A | 00_decision/01-executive-summary.md<br>04_architecture/reference-architecture-v2.md | E2 | G0 | — | open | 意思決定マトリクス9行目 |
| R-201 | 評価は実装証拠・適合性・攻撃試験・運用実績・SLO・監査結果でのみ上げる | **L139**, L254 | 「評価は制御の実装証拠、適合性、攻撃試験」 | A | traceability/claims-ledger.md<br>traceability/mock-panel-report.md | E3 | G0 | — | open |  |
| R-263 | 主張ごとに原典と参照箇所を記録し、作成者以外が「標準が要求する事項」「ベンダー実装の事実」「提案者の設計判断」を追跡・検証できる状態にする | **L137** | 「保証証跡として利用できない」 | A | traceability/claims-ledger.md | E3 | G0 | — | open |  |

### 4.16 意思決定マトリクス

親 ID 7 件（A 1／B 4／C 2／D 0）。主な原文箇所: 意思決定マトリクス9行。

| R-ID | 原子要求 | 原文行 | 原文引用（30字以内） | 区分 | 対応成果物 | 証拠 | ゲート | 机上準備 | 状態 | 備考 |
|---|---|---|---|---|---|---|---|---|---|---|
| R-202 | 決裁依頼をPhase 0〜高保証PoCの条件付き承認に限定 | **L226**, L5, L9 | 「方向性としてPhase 0〜高保証PoCへ進める」 | B | 00_decision/03-decision-items.md<br>00_decision/00-cover.md | E1 | G0 | 決裁文案 | open | 意思決定マトリクス2行目（1行目は R-264） |
| R-203 | 認証器・password・回復・AS全面自作は原則しない、例外審査要件を明記 | **L227** | 「OAuth ASを全面自作」 | B | 05_adr/ADR-001-build-buy-identity-provider.md | E2 | G3 | 案 | open | 意思決定マトリクス3行目 |
| R-204 | 認可domain modelとPEP統合は自社開発候補、engine/store自作は別審査 | **L228** | 「engine/store自作は別審査」 | B | 05_adr/ADR-010-authz-engine-store-consistency.md<br>05_adr/ADR-011-policy-language-pep-pdp-api.md | E2 | G3 | 案 | open | 意思決定マトリクス4行目 |
| R-205 | typed ReBAC＋限定ABAC＋resource-local PEPの方向性を実証で裏付け | **L230**, L71 | 「typed ReBAC + 限定ABAC」 | C | 12_poc/preregistered-test-plan.md<br>04_architecture/authorization-model.md | E5 | G4 | 計 | open | 意思決定マトリクス6行目 |
| R-206 | service別aud・token exchange・workload identityの方向性を実証で裏付け | **L231**, L70, L74 | 「service別audience」 | C | 12_poc/preregistered-test-plan.md<br>04_architecture/workload-identity-delegation.md | E5 | G4 | 計 | open | 意思決定マトリクス7行目 |
| R-264 | 現提案を完成アーキテクチャとして扱わない（次回決裁で完成扱い・即時承認を求めない） | **L225**, L256 | 「現提案を完成アーキテクチャとして即時承認」 | B | 00_decision/03-decision-items.md<br>00_decision/01-executive-summary.md | E1 | G0 | 決裁文案 | open | 意思決定マトリクス1行目 |
| R-265 | 単一のglobal policy store/PDPへ全テナントを集約しない構成を既定とする（集約は R-157 の実証を条件とする限定採用） | **L229** | 「global policy store/PDPへ全テナント」 | A | 05_adr/ADR-010-authz-engine-store-consistency.md<br>04_architecture/cell-blast-radius.md | E2 | G3 | — | open | 意思決定マトリクス5行目 |

### 4.17 CTO/CISO の視座（責務と CTO の問い）

親 ID 15 件（A 4／B 8／C 3／D 0）。主な原文箇所: CTOの責務、CTOの問い5項、CISOの責務。

| R-ID | 原子要求 | 原文行 | 原文引用（30字以内） | 区分 | 対応成果物 | 証拠 | ゲート | 机上準備 | 状態 | 備考 |
|---|---|---|---|---|---|---|---|---|---|---|
| R-207 | 被害を1テナント/1サービス/1期間に封じ込められることの論証 | **L19** | 「被害を一つのテナント、一つのサービス」 | C | 04_architecture/cell-blast-radius.md<br>10_integration/dependency-tiers.md | E5 | G3/G4 | 計 | open | CTOの問い1 |
| R-208 | 特定製品・クラウド・少数専門家・独自言語への過度依存回避 | **L21** | 「独自ポリシー言語へ過度に依存しないか」 | A | 04_architecture/product-evaluation-exit.md<br>01_governance/durability-charter-20y.md | E2 | G3 | — | open | CTOの問い3 |
| R-209 | 組織再編・M&A・データ所在地規制・非人間ID増加・暗号移行への互換性 | **L22** | 「M&A、データ所在地規制、非人間ID増加」 | A | 04_architecture/evolution-pqc.md<br>01_governance/durability-charter-20y.md | E2 | G3 | — | open | CTOの問い4 |
| R-210 | 安全な縮退・復旧・rollback・証拠保全 | **L23** | 「安全な縮退、復旧、ロールバック、証拠保全」 | C | 08_operations/compromise-runbooks.md<br>04_architecture/fail-mode-matrix.md | E8 | G4/G6 | 計 | open | CTOの問い5 |
| R-217 | 事業戦略を技術戦略へ変換し、本基盤の目的・範囲・非目標を事業戦略と紐付けて示す | **L15** | 「事業戦略を技術戦略へ変換し」 | B | 00_decision/04-program-charter.md | E1 | G0 | 案 | open | CTOの責務 |
| R-218 | CTOが引き受ける技術リスク（可用性、変更容易性、運用能力、供給者依存、総所有コスト、人材継続性）をリスク台帳に登録し所有者を明示 | **L15** | 「可用性、変更容易性、運用能力、供給者依存」 | B | 00_decision/05-residual-risk-register.md<br>01_governance/raci-governance.md | E9 | G0 | 案 | open | CTOの責務 |
| R-219 | レジリエンスを売上継続・信頼・規制対応へ結び付けて評価する（BIA で事業影響と接続） | **L15** | 「レジリエンスを売上継続・信頼・規制対応へ」 | B | 01_governance/business-impact-analysis.md | E2（事業責任者署名） | G0 | 様（BIA票） | open | CTOの責務 |
| R-220 | 認可判断の正しさに加え、可用性・遅延・整合性・変更安全性を数値で保証する | **L20** | 「可用性、遅延、整合性、変更安全性を数値で保証」 | C | 07_slo/numeric-contracts.md<br>12_poc/preregistered-test-plan.md | E5 | G0/G4 | 計 | open | CTOの問い2（種資料に未分解）。指標は R-188〜R-195 |
| R-221 | サイバーリスクを経営が理解できる損失シナリオ（損失額・停止時間等）へ翻訳する | **L27** | 「経営が理解できる損失シナリオへ翻訳し」 | A | 01_governance/loss-scenarios.md | E2 | G0 | — | open | CISOの責務。シナリオの確定（経営承認）は R-003 |
| R-222 | 統制・監視・対応・保証を継続的に成立させる体制と周期を定める | **L27** | 「統制、監視、対応、保証を継続的に成立させる」 | B | 09_assurance/continuous-assurance-plan.md<br>08_operations/operating-model.md | E1 | G0/G6 | 案 | open | CISOの責務 |
| R-223 | 経営への報告にリスク許容度・脅威規模・緩和費用の3点を含める | **L27** | 「リスク許容度、脅威規模、緩和費用を経営へ伝える」 | B | 01_governance/kri.md<br>00_decision/01-executive-summary.md | E2 | G0/G6 | 様 | open | CISOの責務 |
| R-224 | CISOの責務範囲（セキュリティアーキテクチャ、運用、ガバナンス、リスク、コンプライアンス）をRACIに反映する | **L27** | 「運用、ガバナンス、リスク、コンプライアンス」 | B | 01_governance/raci-governance.md | E1 | G0 | 案 | open | CISOの責務 |
| R-225 | 事故ゼロを約束・前提にせず、残余リスクの存在を前提に説明する | **L27** | 「「事故をゼロにする人」ではなく」 | A | 01_governance/durability-charter-20y.md<br>00_decision/01-executive-summary.md | E2 | G0 | — | open | CISOの責務 |
| R-226 | サイバーリスクの最終所有者をCISO個人に帰属させない（経営・事業責任者が所有） | **L29** | 「最終所有者をCISO個人へ押し付けてはならない」 | B | 01_governance/raci-governance.md | E1 | G0 | 案 | open | R-021・R-075 と連動 |
| R-227 | 取締役会がリスク許容度を定め、経営が継続評価と透明な報告を伴うリスクベースのプログラムを実行する分担を規程化する | **L29** | 「取締役会がリスク許容度を定め」 | B | 01_governance/raci-governance.md<br>01_governance/risk-appetite-draft.md | E1 | G0 | 案 | open |  |

### 4.18 最重要原則

親 ID 8 件（A 2／B 2／C 3／D 1）。主な原文箇所: 最重要原則7つ。

| R-ID | 原子要求 | 原文行 | 原文引用（30字以内） | 区分 | 対応成果物 | 証拠 | ゲート | 机上準備 | 状態 | 備考 |
|---|---|---|---|---|---|---|---|---|---|---|
| R-228 | 原則1 経営リスクとして扱う: サイバーリスクを財務・評判等と並ぶ企業リスクとし、CSF 2.0 の Govern・Identify・Protect・Detect・Respond・Recover を同時並行で運用する | **L37** | 「財務・評判等と並ぶ企業リスクとして扱い」 | B | 01_governance/risk-appetite-draft.md<br>06_controls/control-mapping-ledger.md | E1 | G0 | 案 | open |  |
| R-229 | 原則2 リスク許容度から制御を導く: 組織の文脈に即したリスク評価・処置から統制を導出し、ISMSの継続的改善に組み込む | **L38** | 「リスク評価・処置と、ISMSの継続的改善」 | A | 06_controls/control-mapping-ledger.md<br>01_governance/loss-scenarios.md | E3 | G0/G1 | — | open |  |
| R-230 | 原則3 暗黙の信頼を置かない: ネットワーク位置・資産所有で信頼せず、主体・端末を認証・認可してから資源アクセスを確立し、資源を保護対象とする | **L39** | 「ネットワーク位置や資産所有だけで信頼せず」 | A | 04_architecture/reference-architecture-v2.md<br>04_architecture/workload-identity-delegation.md | E2 | G3 | — | open |  |
| R-231 | 原則4 最小権限と職務分離を証明する: MFA・JIT・PBAC/ABAC・ライフサイクル管理を適用し、証拠で示す | **L40** | 「最小権限と職務分離を証明する」 | C | 02_requirements/operation-risk-tiers-assurance.md<br>05_adr/ADR-029-privileged-support-access.md<br>12_poc/preregistered-test-plan.md | E4 | G1/G4 | 計 | open |  |
| R-232 | 全IAM変更（権限・ロール・relation・設定の変更）を監視する | **L40** | 「全IAM変更の監視が基本であり」 | C | 04_architecture/audit-privacy.md<br>11_contracts/schemas/audit-event.schema.json | E4 | G3/G4 | 計 | open | 原則4の構成要素で他Rに未分解 |
| R-233 | 原則5 Secure by DesignをSDLCへ埋め込む: SSDFの組織準備・ソフトウェア保護・安全な生成・脆弱性対応を既存SDLC（全開発チーム・ベンダー）へ統合し、設計で緩和する | **L41**, L15 | 「Secure by DesignをSDLCへ埋め込む」 | B | 06_controls/control-mapping-ledger.md<br>10_integration/definition-of-ready.md<br>09_assurance/self-assessments.md | E2 | G1/G6 | 案 | open | L15（CTOの責務）の「セキュリティとコンプライアンスを製品ライフサイクルへ組み込み」を含む |
| R-234 | 原則6 独立した保証を得る: 独立評価者による統制評価（CA-2）と独立侵入試験（CA-8）を受ける | **L42** | 「CA-2の独立評価、CA-8の独立侵入試験」 | D | 09_assurance/independent-assurance-plan.md<br>09_assurance/rfp-sow.md | E6 | G5 | RFP | open | 個別要求は R-063・R-065 |
| R-235 | 原則7 侵害を前提に検知・封じ込め・復旧する: インシデント対応をCSF 2.0の全6機能へ統合し、予防・準備・検知・封じ込め・復旧・教訓反映を一体化する | **L43** | 「予防、準備、検知、封じ込め、復旧、教訓反映」 | C | 08_operations/compromise-runbooks.md<br>09_assurance/continuous-assurance-plan.md | E8 | G4/G6 | 計 | open |  |

### 4.19 適用すべき基準

親 ID 13 件（A 9／B 2／C 2／D 0）。主な原文箇所: 適用すべき基準表10行。

| R-ID | 原子要求 | 原文行 | 原文引用（30字以内） | 区分 | 対応成果物 | 証拠 | ゲート | 机上準備 | 状態 | 備考 |
|---|---|---|---|---|---|---|---|---|---|---|
| R-236 | 経営・統治: NIST CSF 2.0・ISO/IEC 27001:2022 を、リスク許容度・役割・サプライチェーン・指標・継続改善・取締役会報告の骨格として適用する | **L49** | 「サプライチェーン、指標、継続改善、取締役会報告」 | A | 06_controls/control-mapping-ledger.md<br>06_controls/applicability.md | E3 | G0 | — | open | サプライチェーンと取締役会報告は他Rで未分解の要素 |
| R-237 | デジタルID: NIST SP 800-63-4・63B-4・63C-4 を IAL/AAL/FAL・認証器・フィッシング耐性・アカウント回復・再認証・連携保証の基準として適用する | **L50** | 「IAL/AAL/FAL、認証器、フィッシング耐性」 | A | 02_requirements/operation-risk-tiers-assurance.md<br>06_controls/control-mapping-ledger.md | E3 | G1 | — | open |  |
| R-238 | Zero Trust: NIST SP 800-207 を人・端末・ワークロード・資源単位の継続的評価と、制御面とデータ面の分離の基準として適用する | **L51** | 「制御面とデータ面の分離」 | A | 04_architecture/reference-architecture-v2.md<br>04_architecture/revocation-continuous-evaluation.md | E2 | G3 | — | open |  |
| R-239 | OAuth/OIDC: RFC 9700・RFC 9068・RFC 8725・RFC 9449 を PKCE、redirect URI完全一致、refresh rotation または sender constraint、JWT厳格検証、DPoP の準拠基準として適用する | **L52** | 「PKCE、redirect URI完全一致」 | A | 04_architecture/token-profile.md | E2 | G3 | — | open |  |
| R-240 | 高保証API: FAPI 2.0 Security Profile を金融に限らない高価値APIの攻撃者モデル・PAR・mTLS/DPoP・非対称クライアント認証・適合性試験の比較基準profileとする | **L53**, L125 | 「金融に限らない高価値APIの攻撃者モデル」 | A | 04_architecture/token-profile.md<br>03_threat-model/attacker-model.md | E2 | G2/G3 | — | open | 採否そのものは R-160 |
| R-241 | セキュア開発: NIST SSDF 1.1・OWASP ASVS 5.0 を要件・設計・認証・セッション・アクセス制御・暗号・APIの検証可能なチェックリストとして適用する | **L54** | 「暗号、APIの検証可能なチェックリスト」 | A | 09_assurance/self-assessments.md<br>06_controls/control-mapping-ledger.md | E3 | G1/G5 | — | open |  |
| R-242 | API脅威: OWASP API Security Top 10 のBOLA・認証不備・オブジェクト属性レベル認可不備・機能レベル認可不備を負例試験へ組み込む | **L55** | 「BOLA、認証不備、オブジェクト属性」 | C | 12_poc/preregistered-test-plan.md<br>11_contracts/mock-contract-test-kit.md | E4 | G4 | 計 | open | R-071 の対象項目を原文どおり特定 |
| R-243 | クラウド統制: CSA Security Guidance v5・CCM をIAM統制の基準として適用・マッピングする | **L56** | 「CSA Security Guidance v5、CCM」 | A | 06_controls/control-mapping-ledger.md | E3 | G1 | — | open |  |
| R-244 | SaaS提供者・顧客の責任分界（共有責任）を明文化する | **L56**, L40 | 「SaaS提供者・顧客の責任分界」 | B | 02_requirements/customer-admin-responsibility.md<br>06_controls/applicability.md | E2（法務署名） | G0/G1 | 案（契約条項） | open | L40（原則4）の「提供者と利用者の責任分界」を含む |
| R-245 | 顧客向け設定可能なセキュリティ機能を CSA SSCF を基準に設計する | **L56** | 「顧客向け設定可能なセキュリティ機能の基準」 | A | 02_requirements/customer-admin-responsibility.md | E2 | G1/G3 | — | open |  |
| R-246 | ソフトウェア供給網: SLSA 1.2 をビルド来歴・署名・隔離されたビルド基盤・成果物改ざん防止の基準として CI/CD・policy bundle に適用する | **L57** | 「ビルド来歴、署名、隔離されたビルド基盤」 | C | 05_adr/ADR-008-control-plane-cicd-protection.md<br>09_assurance/self-assessments.md | E10 | G3/G5 | 計 | open | 供給網レビュー（D）は R-073 |
| R-247 | 監査・保証: SOC 2 Trust Services Criteria（Security/Availability/Confidentiality 等）に対する統制証跡を設計・マッピングする | **L58** | 「SOC 2 Trust Services Criteria」 | A | 06_controls/control-mapping-ledger.md | E3 | G1/G5 | — | open | 報告書の取得は L60 により必須とされていない |
| R-248 | PCI DSS: 決済対象時の適用判定と、アカウント・MFA・ログ要件の適用 | **L58** | 「決済対象時のアカウント・MFA・ログ要件」 | B | 06_controls/applicability.md | E2（法務署名） | G0 | 案 | open |  |

### 4.20 維持すべき方向性（高く評価できる点）

親 ID 11 件（A 11／B 0／C 0／D 0）。主な原文箇所: 高く評価できる点10行と直後の段落、最終所見の前段。

| R-ID | 原子要求 | 原文行 | 原文引用（30字以内） | 区分 | 対応成果物 | 証拠 | ゲート | 机上準備 | 状態 | 備考 |
|---|---|---|---|---|---|---|---|---|---|---|
| R-249 | 維持: 万能JWTの否定（JWTを権限DBにせず、主体・テナント・API能力の封筒として扱う） | **L68**, L5 | 「JWTを権限DBにせず」 | A | 04_architecture/token-profile.md<br>11_contracts/schemas/access-token-claims.schema.json | E2 | G3 | — | open | 評価「強い」 |
| R-250 | 維持: テナント境界の多層化（tokenのtidに加え、resource-derived tenant、ストレージ境界、サービス認可を重ねる） | **L69**, L252 | 「resource-derived tenant」 | A | 04_architecture/pep-contract.md<br>04_architecture/authorization-model.md | E2 | G3 | — | open | 評価「強い」。検証は R-172 |
| R-251 | 維持: 宛先限定（サービス別aud、token exchange、subとactの分離によるconfused deputy・横流し対策） | **L70**, L252 | 「`sub`と`act`の分離」 | A | 04_architecture/workload-identity-delegation.md<br>04_architecture/token-profile.md | E2 | G3 | — | open | 評価「強い」。実証は R-206 |
| R-252 | 維持: 細粒度認可（typed ReBACを中核に固定RBACと限定ABACを合成し、巨大ロール表を避ける） | **L71** | 「巨大ロール表を避ける設計」 | A | 04_architecture/authorization-model.md<br>10_integration/authz-modeling-guide.md | E2 | G3 | — | open | 評価「強い」。実証は R-205 |
| R-253 | 維持: 一貫性認識（権限剥奪、新旧ACL、transactional outbox、revision-aware cache） | **L72**, L252 | 「revision-aware cacheまで認識している」 | A | 04_architecture/authorization-model.md | E2 | G3 | — | open | 評価「強い」 |
| R-254 | 維持: PEP/PDP分離（判定と強制を分け、各サービスでbypass不能にする） | **L73** | 「各サービスでbypass不能にする思想」 | A | 04_architecture/pep-contract.md | E2 | G3 | — | open | 評価「強い」。検証は R-059・R-060 |
| R-255 | 維持: 非人間IDの分離（ユーザーJWT流用ではなく、workload identity、mTLS、委任を分離） | **L74** | 「ユーザーJWT流用ではなく」 | A | 04_architecture/workload-identity-delegation.md | E2 | G3 | — | open | 評価「強い」 |
| R-256 | 維持: 変更統制（schema-first、policy-as-code、revision pinning、shadow判定、canary、rollback） | **L75**, L252 | 「schema-first、policy-as-code」 | A | 11_contracts/compatibility-deprecation-policy.md<br>10_integration/authz-modeling-guide.md | E2 | G3/G6 | — | open | 評価「良い」 |
| R-257 | 維持: 監査の追跡項目（decision ID、policy/model revision、actor chain、resource、理由） | **L76**, L252 | 「actor chain、resource、理由」 | A | 11_contracts/schemas/audit-event.schema.json<br>04_architecture/audit-privacy.md | E2 | G3 | — | open | 評価「良い」 |
| R-258 | 維持: 特権アクセスの分離（JIT、MFA、二者承認、理由、セッション記録、break-glassを通常権限から分離） | **L77** | 「break-glassを通常権限から分離」 | A | 05_adr/ADR-029-privileged-support-access.md | E2 | G3 | — | open | 評価「良い」。検証は R-176 |
| R-259 | 維持: 宛先限定・短命化・DPoP/mTLSの方向。RFC 9700 の public client 要件（PKCE必須、refresh tokenのsender constraintまたはrotation）と end-to-end TLS を token profile に明記する | **L79** | 「end-to-end TLSを推奨・要求」 | A | 04_architecture/token-profile.md | E2 | G3 | — | open | end-to-end TLS は他Rで未分解 |

### 4.21 承認条件（本番設計審査への最低条件）

親 ID 10 件（A 2／B 4／C 3／D 1）。主な原文箇所: 承認条件10項。

| R-ID | 原子要求 | 原文行 | 原文引用（30字以内） | 区分 | 対応成果物 | 証拠 | ゲート | 机上準備 | 状態 | 備考 |
|---|---|---|---|---|---|---|---|---|---|---|
| R-266 | 承認条件1: 経営承認済みのrisk appetite、対象法域、データ分類、重大損失シナリオがある（構成: R-003, R-004, R-005, R-010） | **L239** | 「経営承認済みのrisk appetite、対象法域」 | B | 00_decision/03-decision-items.md<br>01_governance/risk-appetite-draft.md | E1 | G0 | 案 | open |  |
| R-267 | 承認条件2: IAL/AAL/FAL、認証器、account recovery、federation、SCIM、session lifecycleがユースケース別に定義されている（構成: R-027, R-028, R-032, R-041, R-048） | **L240** | 「認証器、account recovery」 | B | 02_requirements/identity-lifecycle.md<br>02_requirements/operation-risk-tiers-assurance.md | E2＋E9 | G1 | 案 | open |  |
| R-268 | 承認条件3: AS/PAP/CI/CD/KMS/HSM/JWKSを含むroot of trustと侵害runbookがある（構成: R-049〜R-057） | **L241** | 「侵害runbookがある」 | A | 04_architecture/root-of-trust.md<br>08_operations/compromise-runbooks.md | E2 | G3 | — | open | 条件文は「ある」まで。構成要求には C/D を含む |
| R-269 | 承認条件4: 全entry pointのPEP coverageを機械的に検証でき、DB/storageにもtenant guardrailがある（構成: R-058〜R-062） | **L242** | 「PEP coverageを機械的に検証でき」 | C | 04_architecture/pep-contract.md<br>03_threat-model/dfd-entry-points.md | E4 | G4 | 計 | open |  |
| R-270 | 承認条件5: OAuth 2.0 Security BCP準拠profileと、高価値APIに対するFAPI 2.0採否が決まっている（構成: R-096, R-158〜R-160） | **L243** | 「FAPI 2.0採否が決まっている」 | B | 04_architecture/token-profile.md<br>05_adr/ADR-020-fapi2-applicability.md | E2 | G3 | 案 | open |  |
| R-271 | 承認条件6: authorization engine/storeの整合性・分割・障害モデルを実測し、権限剥奪SLOを満たしている（構成: R-097, R-143〜R-146, R-150, R-191） | **L244** | 「権限剥奪SLOを満たしている」 | C | 04_architecture/authorization-model.md<br>12_poc/preregistered-test-plan.md<br>07_slo/numeric-contracts.md | E5 | G4 | 計 | open | 種資料は承認条件6を出典に挙げていない。「実測して剥奪SLOを満たす」は本行で新規に要求化 |
| R-272 | 承認条件7: policy/model/schema/token/auditのversioningと後方互換・rollback方式がある（構成: R-109） | **L245** | 「後方互換・rollback方式がある」 | A | 04_architecture/evolution-pqc.md | E2 | G3 | — | open |  |
| R-273 | 承認条件8: 独立設計レビュー、conformance、cross-tenant pentest、red teamでCritical/Highが閉じている（構成: R-063〜R-066, R-074, R-076） | **L246** | 「red teamでCritical/Highが閉じている」 | D | 09_assurance/independent-assurance-plan.md<br>traceability/open-items.md | E6＋E11 | G5 | RFP | open |  |
| R-274 | 承認条件9: 24時間365日の運用責任、SRE容量、on-call、教育、bus factor、vendor support、TCOが承認されている（構成: R-136〜R-141） | **L247** | 「bus factor、vendor support、TCO」 | B | 08_operations/operating-model.md<br>08_operations/tco-vendor-lts.md<br>00_decision/07-organization-and-tco.md | E1 | G0/G6 | 案 | open |  |
| R-275 | 承認条件10: 顧客通知、全session失効、鍵交換、PDP隔離、監査証拠保全を含む演習に合格している（構成: R-111〜R-117） | **L248** | 「監査証拠保全を含む演習に合格」 | C | 08_operations/compromise-runbooks.md | E8 | G4/G5 | 演習計画 | open |  |

### 4.22 エグゼクティブ判断・最終所見

親 ID 5 件（A 2／B 3／C 0／D 0）。主な原文箇所: エグゼクティブ判断、最終所見。

| R-ID | 原子要求 | 原文行 | 原文引用（30字以内） | 区分 | 対応成果物 | 証拠 | ゲート | 机上準備 | 状態 | 備考 |
|---|---|---|---|---|---|---|---|---|---|---|
| R-211 | 次回提出物を「有望な参照アーキテクチャと論点集」から、20年の経営リスクを判断できる承認資料（決裁パッケージ）へ引き上げる | **L5** | 「有望な参照アーキテクチャと論点集」 | B | 00_decision/00-cover.md<br>00_decision/03-decision-items.md | E1 | G0 | 決裁文案 | open |  |
| R-212 | 参照アーキテクチャを実装仕様（連携契約・profile・スキーマ）へ具体化する | **L5** | 「承認資料、実装仕様、保証証跡」 | A | 11_contracts/README.md<br>04_architecture/reference-architecture-v2.md | E2 | G3 | — | open |  |
| R-213 | 保証証跡を要求単位で収集・追跡する仕組み（追跡表と是正追跡）を備える | **L5** | 「保証証跡には到達していない」 | A | traceability/traceability-matrix.md<br>traceability/open-items.md | E3＋E11 | G0 | — | open | 証跡そのものの取得は各 C/D 要求で閉じる |
| R-276 | 「この設計なら20年戦える」と署名しない。20年の約束を検証可能な性質・証拠・継続指標へ再定義して決裁する | **L254** | 「「この設計なら20年戦える」と署名する」 | B | 01_governance/durability-charter-20y.md | E1 | G0 | 案 | open |  |
| R-277 | Phase 0を経営リスク定義からやり直し、Gate 0を起点に順に進める（旧提案書のPhaseとGateの対応を示す） | **L256** | 「Phase 0を経営リスク定義からやり直し」 | B | 00_decision/06-gate-plan-and-plan-b.md | E1 | G0 | 案 | open |  |

## 5. 原文行→R-ID 逆引き索引

原文の L1〜L256 の非空行をすべて並べ、各行を根拠とする R-ID を示す。見出し・表頭・導入文以外で R を持たない行はない [D]。批評による追加（R-278〜R-283）と R-071 の根拠行の変更を反映した。本索引は行ごとに 1 件以上の R があることを示すもので、行内の全要素の対応までは示さない（要素単位の照合は traceability/phase1-critique-R.md §3）[D]。

| 行 | 原文（冒頭） | R-ID |
|---|---|---|
| 1 | # 20年運用を前提とした認証・認可基盤提案のC… | —（見出し） |
| 3 | ## エグゼクティブ判断 | —（見出し） |
| 5 | 現時点の判定は「本番基盤としては不承認、Phas… | R-202, R-211, R-212, R-213, R-249 |
| 7 | 最大の問題は、採るべき技術要素を広く列挙している… | R-001, R-002, R-023, R-214, R-215 |
| 9 | したがって、CTO/CISOが承認すべき対象は「… | R-022, R-202, R-216 |
| 11 | ## CTO/CISOの視座 | —（見出し） |
| 13 | ### CTOの責務 | —（見出し） |
| 15 | CTOは技術選定者に留まらず、事業戦略を技術戦略… | R-018, R-217, R-218, R-219, R-233, R-278 |
| 17 | 本件でCTOが最も重視すべき問いは次の通りである… | —（導入文。CTO の問い 5 項は L19〜L23 で R-207〜R-210・R-220） |
| 19 | - 障害・侵害・誤設定が起きても、被害を一つのテ… | R-207 |
| 20 | - 認可判断の正しさだけでなく、可用性、遅延、整… | R-220 |
| 21 | - 特定製品、特定クラウド、少数の専門家、独自ポ… | R-208 |
| 22 | - 5年後の組織再編、M&A、データ所在地規制、… | R-209 |
| 23 | - 事故時に安全な縮退、復旧、ロールバック、証拠… | R-210 |
| 25 | ### CISOの責務 | —（見出し） |
| 27 | CISOは「事故をゼロにする人」ではなく、企業の… | R-221, R-222, R-223, R-224, R-225 |
| 29 | ただし、サイバーリスクの最終所有者をCISO個人… | R-019, R-021, R-226, R-227 |
| 31 | 従って「瑕疵があればCTO/CISOが辞任」とい… | R-017, R-019, R-020 |
| 33 | ## 最重要原則 | —（見出し） |
| 35 | 世界的な枠組みから抽出すると、CTO/CISOが… | —（導入文。原則 7 つは L37〜L43 で R-228〜R-235） |
| 37 | 1. 経営リスクとして扱う — NIST CSF… | R-228 |
| 38 | 2. リスク許容度から制御を導く — ISO/I… | R-229 |
| 39 | 3. 暗黙の信頼を置かない — NIST SP … | R-230 |
| 40 | 4. 最小権限と職務分離を証明する — クラウド… | R-231, R-232, R-244 |
| 41 | 5. Secure by DesignをSDLC… | R-233 |
| 42 | 6. 独立した保証を得る — 高影響システムでは… | R-234 |
| 43 | 7. 侵害を前提に検知・封じ込め・復旧する — … | R-235 |
| 45 | ## 適用すべき基準 | —（見出し） |
| 47 | 層 / 基準・規格 | —（表頭） |
| 48 | （表の区切り行） | — |
| 49 | 経営・統治 / NIST CSF 2.0、ISO… | R-236, R-278 |
| 50 | デジタルID / NIST SP 800-63-… | R-031, R-237 |
| 51 | Zero Trust / NIST SP 800… | R-238 |
| 52 | OAuth/OIDC / RFC 9700、RF… | R-239 |
| 53 | 高保証API / FAPI 2.0 Securi… | R-240 |
| 54 | セキュア開発 / NIST SSDF 1.1、O… | R-070, R-241 |
| 55 | API脅威 / OWASP API Securi… | R-071, R-242 |
| 56 | クラウド統制 / CSA Security Gu… | R-243, R-244, R-245 |
| 57 | ソフトウェア供給網 / SLSA 1.2 | R-073, R-246 |
| 58 | 監査・保証 / SOC 2 Trust Serv… | R-247, R-248 |
| 60 | この一覧は「全部の認証を取る」という意味ではない… | R-024, R-025 |
| 62 | ## 提案の評価 | —（見出し） |
| 64 | ### 高く評価できる点 | —（見出し） |
| 66 | 項目 / 評価 | —（表頭） |
| 67 | （表の区切り行） | — |
| 68 | 万能JWTの否定 / 強い | R-249 |
| 69 | テナント境界 / 強い | R-250 |
| 70 | 宛先限定 / 強い | R-206, R-251 |
| 71 | 細粒度認可 / 強い | R-205, R-252 |
| 72 | 一貫性認識 / 強い | R-253 |
| 73 | PEP/PDP分離 / 強い | R-254 |
| 74 | 非人間ID / 強い | R-206, R-255 |
| 75 | 変更統制 / 良い | R-256 |
| 76 | 監査 / 良い | R-257 |
| 77 | 特権アクセス / 良い | R-258 |
| 79 | OAuth 2.0 Security BCPはp… | R-145, R-158, R-259 |
| 81 | ### 重大な不足 | —（見出し） |
| 83 | 重大度 / 不足 | —（表頭） |
| 84 | （表の区切り行） | — |
| 85 | Critical / リスク定義と承認基準がない | R-001, R-002, R-003, R-004, R-005, R-006, R-007 |
| 86 | Critical / 認証ライフサイクルが薄い | R-027, R-028, R-033, R-041, R-044, R-279 |
| 87 | Critical / 管理面・鍵のroot of… | R-049, R-050, R-051, R-052, R-053, R-054, R-055, R-056, R-057 |
| 88 | Critical / PEP完全性の証明がない | R-058, R-059, R-060, R-061, R-062 |
| 89 | Critical / 独立保証がない | R-063, R-064, R-065, R-066, R-067 |
| 90 | High / 可用性・整合性の合格値が空欄 | R-077, R-078 |
| 91 | High / fail-closedが粗い | R-085 |
| 92 | High / 製品・運用モデル未決定 | R-088, R-089, R-090, R-091, R-092, R-280 |
| 93 | High / 20年の進化設計がない | R-104, R-105, R-106, R-107, R-108, R-109, R-281 |
| 94 | High / インシデント運用が不足 | R-110, R-111, R-112, R-113, R-114, R-115 |
| 95 | High / 証跡・プライバシー設計が未完 | R-118, R-119, R-120, R-121, R-122, R-123, R-124, R-125, R-126 |
| 96 | Medium / 顧客管理機能が弱い | R-129, R-130, R-131, R-132, R-133, R-134, R-135 |
| 97 | Medium / 人材・所有権モデルがない | R-136, R-137, R-138, R-139, R-140 |
| 99 | NIST 800-63B-4では、OTPの手入力… | R-031, R-032, R-260 |
| 101 | ### 技術上の危険点 | —（見出し） |
| 103 | #### 認証と認可の非対称 | —（見出し） |
| 105 | 提案書の技術的厚みは認可に偏っている。認証局面で… | R-034, R-035, R-036, R-037, R-038, R-039, R-040, R-041, R-042, R-043, R-045, R-279 |
| 107 | FAL2ではassertion injectio… | R-046, R-047 |
| 109 | #### Zanzibar系の過信 | —（見出し） |
| 111 | Zanzibarの論文は、関係タプルだけでなく、… | R-142, R-144, R-146 |
| 113 | よって「権限剥奪直後に何ミリ秒以内で拒否するか」… | R-143, R-144, R-145, R-147, R-148, R-149 |
| 115 | #### 共有PDPのblast radius | —（見出し） |
| 117 | 共通PDPは統制を強くする一方、誤ったgloba… | R-151, R-152, R-261 |
| 119 | 従って「control plane中央、deci… | R-150, R-151, R-152, R-153, R-154, R-155, R-156 |
| 121 | #### JWT・OAuthの更新不足 | —（見出し） |
| 123 | 提案書はRFC 9068、JWT BCP、DPo… | R-158 |
| 125 | 高価値APIではFAPI 2.0 Securit… | R-064, R-160, R-240 |
| 127 | #### fail-closedの扱い | —（見出し） |
| 129 | 「不明ならdeny」は認可の安全側原則として正し… | R-262 |
| 131 | 操作を少なくとも `public/read-se… | R-079, R-080, R-081, R-082, R-083, R-084, R-086 |
| 133 | ### 文書品質の問題 | —（見出し） |
| 135 | 提案書の参考文献番号には、本文の主張と参照先が一… | R-197, R-198 |
| 137 | これは単なる体裁問題ではない。安全性判断では、規… | R-199, R-263 |
| 139 | また「推奨自社基盤＝柔軟性・セキュリティとも非常… | R-200, R-201 |
| 141 | ## 進め方の再設計 | —（見出し） |
| 143 | ### Gate 0: 統治 | —（見出し） |
| 145 | 経営会議または取締役会が、保護対象、最大許容損失… | R-001, R-005, R-007, R-008, R-009, R-010, R-011, R-012, R-013, R-014 |
| 147 | 成果物は、risk appetite state… | R-003, R-006, R-015, R-016, R-017, R-018 |
| 149 | ### Gate 1: 要件 | —（見出し） |
| 151 | ユーザー、人事ID、顧客管理者、support、… | R-027, R-028, R-029, R-030, R-282 |
| 153 | 同時に全entry point、trust bo… | R-164, R-165 |
| 155 | ### Gate 2: 攻撃者モデル | —（見出し） |
| 157 | 最低限、外部攻撃者、悪意あるテナント管理者、侵害… | R-042, R-166 |
| 159 | 各脅威について、予防、検知、封じ込め、復旧、証拠… | R-167, R-168 |
| 161 | ### Gate 3: ADRと選定 | —（見出し） |
| 163 | 少なくとも次をArchitecture Deci… | —（導入文。各 ADR は L165〜L174 で R-094〜R-103） |
| 165 | - managed IdPか自営ASか。原則とし… | R-094 |
| 166 | - access tokenはopaqueかJW… | R-095 |
| 167 | - FAPI 2.0を必須にするAPI範囲 | R-096 |
| 168 | - authorization engineとs… | R-097 |
| 169 | - policy language、schema… | R-098 |
| 170 | - PDP topologyとcell/faul… | R-099 |
| 171 | - workload identityとtoke… | R-100 |
| 172 | - 鍵管理、暗号俊敏性、量子耐性移行の抽象境界 | R-101 |
| 173 | - 監査データモデル、保持、データ所在地、顧客へ… | R-102 |
| 174 | - migration、dual-write、s… | R-103 |
| 176 | 選定表には機能だけでなく、整合性、最大深度、ta… | R-093 |
| 178 | ### Gate 4: 高保証PoC | —（見出し） |
| 180 | happy pathのデモではなく、攻撃と障害を… | R-169 |
| 182 | - 2テナント、複数IdP、同一メール、複数所属… | R-034, R-035, R-036, R-037, R-040, R-044, R-170, R-283 |
| 183 | - folder移動、外部共有、group ne… | R-171 |
| 184 | - 他テナントIDをURL/body/heade… | R-172 |
| 185 | - API A用tokenをAPI Bへ提示、r… | R-173 |
| 186 | - PDP timeout、全断、片リージョン断… | R-174 |
| 187 | - policy/modelの旧版・新版diff… | R-175 |
| 188 | - 管理者・supportのJIT、二者承認、b… | R-176 |
| 190 | JWTはalgorithm allowlist、… | R-161, R-162, R-163 |
| 192 | ### Gate 5: 独立保証 | —（見出し） |
| 194 | 実装チームと報告系統を分けた評価者が、設計、コー… | R-042, R-063, R-064, R-065, R-066, R-068, R-069, R-070, R-071, R-072, R-073 |
| 196 | Critical/Highの未解決事項は原則とし… | R-074, R-075 |
| 198 | ### Gate 6: 段階導入 | —（見出し） |
| 200 | 新旧認可を同時実行し、旧判定と新判定の差分を記録… | R-177, R-178, R-179, R-180 |
| 202 | 本番後も四半期ごとにKRI、年次独立評価、定期r… | R-006, R-181, R-182, R-183, R-184, R-185, R-186, R-187 |
| 204 | ## 必須の数値契約 | —（見出し） |
| 206 | 数値自体は事業影響分析とPoC実測で決めるべきで… | R-188, R-189, R-190, R-191, R-192, R-193, R-194, R-195, R-196 |
| 208 | 分類 / 必須指標 | —（表頭） |
| 209 | （表の区切り行） | — |
| 210 | 認証 / login成功率、p95/p99、Id… | R-188, R-188.1, R-188.2, R-188.3, R-188.4, R-188.5, R-188.6, R-188.7 |
| 211 | token / access/refresh寿命… | R-189, R-189.1, R-189.2, R-189.3, R-189.4, R-189.5, R-189.6 |
| 212 | 認可 / Check p95/p99/p99.9… | R-190, R-190.1, R-190.2, R-190.3, R-190.4, R-190.5, R-190.6 |
| 213 | 剥奪 / 通常・高権限・tenant停止ごとの最… | R-191, R-191.1, R-191.2, R-191.3 |
| 214 | 可用性 / control/decision p… | R-192, R-192.1, R-192.2, R-192.3, R-192.4, R-192.5 |
| 215 | 監査 / 重要decision記録率、欠損検知時… | R-193, R-193.1, R-193.2, R-193.3, R-193.4, R-193.5, R-193.6 |
| 216 | 変更 / policy/model canary… | R-194, R-194.1, R-194.2, R-194.3, R-194.4, R-194.5 |
| 217 | インシデント / MTTD、封じ込め時間、全se… | R-195, R-195.1, R-195.2, R-195.3, R-195.4, R-195.5 |
| 219 | 「全decisionを監査する」は目標としては良… | R-127, R-128 |
| 221 | ## 意思決定マトリクス | —（見出し） |
| 223 | 選択肢 / 判断 | —（表頭） |
| 224 | （表の区切り行） | — |
| 225 | 現提案を完成アーキテクチャとして即時承認 / 不… | R-264 |
| 226 | 現提案を方向性としてPhase 0〜高保証PoC… | R-202 |
| 227 | 認証器・password・account rec… | R-203 |
| 228 | 認可domain modelとPEP統合を自社開… | R-204 |
| 229 | 一つのglobal policy store/P… | R-157, R-265 |
| 230 | typed ReBAC + 限定ABAC + r… | R-205 |
| 231 | service別audience、token e… | R-206 |
| 232 | 5〜15分token、全fail-closed等… | R-087, R-189.1 |
| 233 | 「非常に高いセキュリティ」という自己評価 / 削… | R-200 |
| 235 | ## 承認条件 | —（見出し） |
| 237 | 本番設計審査へ進む最低条件は以下である。 | R-216 |
| 239 | - 経営承認済みのrisk appetite、対… | R-003, R-004, R-005, R-010, R-266 |
| 240 | - IAL/AAL/FAL、認証器、accoun… | R-027, R-048, R-267 |
| 241 | - AS/PAP/CI/CD/KMS/HSM/J… | R-056, R-057, R-268 |
| 242 | - 全entry pointのPEP cover… | R-059, R-061, R-269 |
| 243 | - OAuth 2.0 Security BCP… | R-159, R-160, R-270 |
| 244 | - authorization engine/s… | R-271 |
| 245 | - policy/model/schema/to… | R-109, R-272 |
| 246 | - 独立設計レビュー、conformance、c… | R-063, R-065, R-066, R-076, R-273 |
| 247 | - 24時間365日の運用責任、SRE容量、on… | R-137, R-138, R-139, R-141, R-274 |
| 248 | - 顧客通知、全session失効、鍵交換、PD… | R-111, R-112, R-113, R-114, R-115, R-116, R-117, R-275 |
| 250 | ## 最終所見 | —（見出し） |
| 252 | 提案チームは、認証・認可を単なるJWTとrole… | R-250, R-251, R-253, R-256, R-257 |
| 254 | しかし、高度な用語と技術要素が揃っていることと、… | R-201, R-276 |
| 256 | 適切な決裁は、方向性を評価しつつ完成扱いを拒み、… | R-022, R-026, R-107, R-169, R-179, R-264, R-277 |
| 258〜363 | --- / References | —（参考文献一覧。要求を含まない） |

## 6. 批評による追加

作成者とは別のエージェントが、原文の段落・表行・箇条書きを要素単位で R と照合した結果である。照合の方法、対応表、粒度と索引の指摘は traceability/phase1-critique-R.md[^5] に置く。批評も AI エージェント（Claude）が行っており、人による検証ではない [D]。

### 6.1 追加した原子要求（R-278〜R-283）

親 ID 6 件（A 2／B 1／C 3／D 0）。原文の出現順に採番した。

| R-ID | 原子要求 | 原文行 | 原文引用（30字以内） | 区分 | 対応成果物 | 証拠 | ゲート | 机上準備 | 状態 | 備考 |
|---|---|---|---|---|---|---|---|---|---|---|
| R-278 | 供給者（サプライチェーン）リスクを統治の骨格に含め、本基盤の供給者（外部 IdP、クラウド、認可 engine・製品の提供者、開発・運用の委託先）ごとに重要度・責任者・評価周期を定める | **L49**, L15 | 「役割、サプライチェーン、指標」 | B | 08_operations/tco-vendor-lts.md<br>06_controls/control-mapping-ledger.md<br>00_decision/05-residual-risk-register.md | E2（調達・法務署名） | G0/G3 | 案 | open | critic追加。R-236 の備考で「他Rで未分解」とされた要素。重要度・責任者・評価周期という項目立ては批評者の設計推論で、原文は「サプライチェーン」の語まで。ソフトウェア供給網は R-073・R-246、供給者依存のリスク登録は R-218 が受ける |
| R-279 | ユーザー登録（利用者の初回登録）の手順と統制を定義し、PoC で検証する | **L105**, L86 | 「認証局面では、ユーザー登録」 | C | 02_requirements/identity-lifecycle.md<br>12_poc/preregistered-test-plan.md | E4 | G1/G4 | 計 | open | critic追加。L105 の列挙のうち「ユーザー登録」だけが単独の R を持たず、R-028 の状態機械に含まれるだけだった。L86 は「登録、本人確認」。初回の認証器結合は範囲の例示（原文外） |
| R-280 | 製品比較の対象に、原文が挙げる候補（OpenFGA、Cedar、OPA、AVP、独自実装）を含め、意味論の違いを比較軸に加える | **L92** | 「意味論・整合性・運用負荷が異なる」 | C | 04_architecture/product-evaluation-exit.md<br>12_poc/preregistered-test-plan.md | E2＋E5 | G3/G4 | 評価表・計 | open | critic追加。R-093 の 13 軸（L176）に「意味論」がなく、R-088 は比較対象を特定していない。整合性は R-093・R-097、運用負荷は R-093 の「運用人員」が受ける。意味論の比較には自社の認可モデルを各候補で記述する試験（R-089）を用いる |
| R-281 | 標準と法規制の変化（標準の改版・状態変更、法令の改正・施行）を継続的に追跡し、準拠基準と適用性判定を見直す仕組み（所有者、周期、見直しの起点）を定める | **L93** | 「暗号、標準、クラウド、組織、法規制」 | A | research/standards-status.md<br>06_controls/applicability.md | E3 | G3/G6 | — | open | critic追加。L93 が挙げる変化要因 6 つのうち、暗号（R-101・R-104）、クラウド（R-208）、組織・ID種別（R-209）は分解済みで、標準と法規制への追随だけが R を持たなかった。成果物 DL-84 は計画済み。見直し結果の法務判断は R-024（B）で閉じる |
| R-282 | 非人間主体（service account、workload、外部integration、agent/AI）について、登録から削除までの状態遷移を定義する | **L151** | 「登録から削除までの状態遷移を定義する」 | A | 02_requirements/identity-lifecycle.md<br>02_requirements/principal-catalog.md<br>05_adr/ADR-017-non-human-ai-agent-identity.md | E2 | G1 | — | open | critic追加。R-028 は L86（利用者の認証イベント）を主な根拠とし、要求文に非人間主体を含まない。所有者の割当、資格情報の発行・rotation・失効、所有者不在時の扱い、廃止は人間主体と遷移が異なるため分離した（項目は例示、原文外） |
| R-283 | 複数所属（1 主体が複数のテナントに同時に所属する場合）の扱いを定義し、PoC で検証する | **L182** | 「同一メール、複数所属、招待」 | C | 02_requirements/identity-lifecycle.md<br>04_architecture/token-profile.md<br>12_poc/preregistered-test-plan.md | E4 | G1/G4 | 計 | open | critic追加。PoC 群 R-170 に含まれるだけで、設計側の R がなかった。§5 の旧版は L182 を R-035（所属変更）に対応させていたが、原文の語は「複数所属」で別の論点である。テナント文脈の選択、token の tid・session との結合は論点の例示（原文外） |

### 6.2 区分の修正（critic修正）

該当行（§4）を直接修正し、備考に「critic修正」と記した。理由の詳細は traceability/phase1-critique-R.md §5.1 にある [D]。

| R-ID | 要求 | 旧区分 | 新区分 | 修正の理由（要約） |
|---|---|---|---|---|
| R-043 | passkey同期の扱い | A | B | 受け入れる操作階層の決定はリスク受容を伴う。同種の R-031 は B |
| R-054 | 二者統制 | B | C | 鍵操作を 1 名で実行できないことは試験・ceremony 記録で示す必要がある |
| R-071 | API Top 10負例試験 | C | D | L194 は独立評価者の検証に API Top 10 を含める。自前の負例試験は R-242 が受ける |
| R-104 | crypto agility | A | C | 設計は R-101 が受ける。切替可能性は試験でしか示せない |

## 参考文献

[^1]: 著者表記なし『20年運用を前提とした認証・認可基盤提案のCTO/CISOレビュー』2026-10-03 時点の版（SHA-256: 46a8d7be41761676a956b81a158a278a1b147a6df7543e34a0a7b0a1270f7fff）. 20年運用を前提とした認証・認可基盤提案のCTO CISOレビュー.md （参照箇所: L1〜L363 の全行、確認日: 2026-10-03）
[^2]: 計画エージェント（CISO・内部監査・独立保証レンズ）『種資料01: CISO／内部監査／独立保証の観点による指摘分解』2026-10-03. traceability/seed/seed-01-ciso-assurance.md （参照箇所: 冒頭注記, §0, §1, §2、確認日: 2026-10-03）
[^3]: 本リポジトリ『成果物計画（マスターファイル計画）』版 0.1, 2026-10-03. traceability/deliverables.md （参照箇所: §3, §4, §5, §8、確認日: 2026-10-03）
[^4]: 本リポジトリ『執筆規約（全成果物共通）』2026-10-03. CONVENTIONS.md （参照箇所: §2, §3, §6, §8、確認日: 2026-10-03）
[^5]: 本リポジトリ『Phase 1 網羅性批評（R 分解）』版 0.1, 2026-10-03. traceability/phase1-critique-R.md （参照箇所: §3〜§7、確認日: 2026-10-03）
