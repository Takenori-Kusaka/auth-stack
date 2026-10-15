# R/G 追跡表（双方向トレーサビリティ）

> 文書ID: TRC-04 / 版: 0.5 / 状態: draft / 最終更新: 2026-10-15（0.5: 続行ワークフローの報告段の最終整合（模擬パネル ラウンド 7 の後）で、作業ツリーの変化（PoC 実測レポート POC-02 版 0.1 の作成、TRC-09 版 0.3、TRC-10 版 0.4、自動検査の再実行 TRC-12 §10、DL-120・DL-121 の追加）に状態欄を合わせた。G の現状の区分は変わらない。§0 の 3・5、§3.3、§4.2 の注記、§4.3・§5 の DL-81 の × 印、§6.1 の DL-81 の状態、残課題 6・12・13 を更新した。再抽出はしていない。0.4: 模擬パネル ラウンド 6（audit）の指摘で、§2.4 に「未達（成果物内で開示）」の区分を加え、対応成果物が合格条件の未達を明記している G-012・G-018・G-019・G-022 を「充足」から移した。§0 の 5、§4.2、§4.3 を更新した。0.3: 模擬パネル ラウンド 4（cto）の指摘で、承認条件 4 の R 5 行（R-058・R-059・R-061・R-062・R-269）に TC-121 を割り当てた。再抽出ではなく POC-01 版 0.3 の対応表に合わせた手作業の更新である。0.2: Phase 4 の最終整合で、抽出後に作成された DL と自動検査・模擬パネル・独立反証の記録に合わせて G の現状と未作成 DL を更新した。R→G・R→DL→C の再抽出はしていない。末尾「レビュー記録」）
> 対応要求: R-025, R-213, R-214, R-197, G-003, G-021（主なもの）。R-001〜R-283（枝番を含む 326 行）と G-001〜G-151 の全件を追跡対象とする
> 依存文書: traceability/R-requirements.md, traceability/G-goal-criteria.md, traceability/deliverables.md, 06_controls/control-mapping-ledger.md, 12_poc/preregistered-test-plan.md, 08_operations/compromise-runbooks.md, 07_slo/numeric-contracts.md, 01_governance/loss-scenarios.md, 03_threat-model/threat-catalog.md, 01_governance/kri.md, 01_governance/risk-appetite-draft.md, 00_decision/05-residual-risk-register.md, CONVENTIONS.md
> 作成方法: AI エージェント（Claude）が、上記の台帳の表を機械抽出し（抽出時点 2026-10-15 10:32）、突き合わせた結果を表にした。表の値は各台帳の転記と機械照合の結果であり、内容の妥当性の判定ではない。本書の判定は自己レビューであり、実在の CTO/CISO の決裁ではない（CONVENTIONS §8）[D]。
> 表の注記: 表のセルでタグのないものは、各台帳の記述の転記または本書の抽出規則（§2）による設計推論 [D] であり、この注記で個別のタグに代える。

## 0. 結論（CTO/CISO 向け要旨）

1. **R→DL→C の区間は、R 326 行のすべてがつながった。DL または C を欠く孤児 R は 0 件である** [D]。統制台帳の健全性検査（規則 1）の結果[^4]を、本書で R 台帳[^1]から独立に再抽出して確認した [D]。
2. **R→G の区間は閉じていない。G-021 の合格基準（孤児 R・孤児 G・孤児 DL がいずれも 0 件）を満たさないため、G-021 は「不合格（是正中）」とする** [D]。G 台帳の関連 R 欄は種資料 seed-01 の R-ID で書かれており[^2]、R-211〜R-283 は G 台帳の作成後に追加された [D][^1]。全件を対象とする G（G-010, G-022, G-029）を除くと、個別の G に結び付かない R は **78 行**、全件 G を含めても結び付かない R は **6 件**（R-278, R-279, R-280, R-281, R-282, R-283）である [D]。候補 G を §4.4 に示した（未確定。G 台帳の改訂で確定する）[D]。
3. **孤児 DL（R・G・成果物計画の対応要求のいずれからも参照されない DL）は 0 件である** [D]。抽出時点に未作成だった DL 10 件のうち 9 件は、再最終整合（2026-10-15、模擬パネル ラウンド 7 の後）までに作成された（DL-81 の実測レポートは POC-02 版 0.1 として作成済み）。未作成で残るのは **DL-59 の 1 件**である。抽出後に成果物計画へ追加された DL-120（契約試験キット本体）と DL-121（ライフサイクル状態の照会 API）も未作成である（§3.3）[D]。
4. **孤児 G は、関連 R を持たない 4 件（G-043, G-052, G-129, G-133）である** [D]。/goal 原文から導いた基準で、レビュー指摘に対応する R がない [D]。抽出時点にあった「計画上の対応成果物がすべて未作成の G」7 件は、最終整合までに対応成果物が作成され 0 件になった（§3.4）[D]。
5. **G-001〜G-151 の現状は、充足 51、未達（成果物内で開示）4、一部（照合未了）2、決裁案まで 32、要実測 50、要第三者 5、未着手 3（いずれも一部着手）、不合格 4 である（ラウンド 6 で更新。最終整合の時点では充足 55。再最終整合（ラウンド 7 の後）で区分の変更はない）** [D]。未達（成果物内で開示）は G-012・G-018・G-019・G-022 である。いずれも対応成果物が自ら、合格条件の中身を満たしていないと書いている。G-012 は統制台帳が写像の未完成を[^4]、G-018 は主張台帳が版・取得日・スナップショットハッシュ・検証者の列の欠落を[^15]、G-019 は主張台帳が新パッケージの主張（決裁事項・ADR の結論を支える主張）の未登録を[^15]、G-022 は前回指摘対照表が検証記録のない 168 行を[^14]、それぞれ未達の理由として挙げている（§2.4、§4.2 の注記）[D]。一部（照合未了）は G-003 と G-038 である。G-003 は §3.6 の許容度と受容者の照合が終わっていない。G-038 は模擬パネル判定記録が G 全件の判定を持たない [D]。不合格は G-021 に加え、自動検査（DL-111）の再実行で基準を満たさなかった G-017・G-037・G-131 である（§4.2 の注記）[D]。ここでの「充足」は「区分 A の対応成果物がすべて存在する」という机上の準備状態（G-ID を明示した記述が見当たらないものは「充足※」）であり、G 台帳 §4.3 の「達成」（作成者以外の確認済み、B は E1/E2/E9、C は独立立会いの実測、D は E6/E7）に当たるものは **0 件**である [D][^2]。
6. **実測で閉じる区分 C の R 147 行のうち、41 行は TC・RB・演習（EX）のいずれにも割り当てられていない（抽出時点）** [D]。ラウンド 4 で承認条件 4 の 5 行を TC-121 に割り当て、未割当は 36 行になった [D][^5]。統制台帳の試験欄に置かれた脅威由来の試験候補 TH-TC 58 件のうち 47 件は、PoC 試験計画の TC に吸収された記録がない [D]（§3.5）。
7. **証跡は 1 件も取得していない** [D]。R が要求する証拠種別の延べ件数は E1 55、E2 96、E3 17、E4 53、E5 71、E6 18、E7 2、E8 25、E9 12、E10 1、E11 4 である [D]。E1・E6・E7・E9 は本リポジトリ内では得られない [D][^3]。
8. **上位 10 件の損失シナリオ（S-xx）の連鎖は、番号の区間（S→T→C→TC→RB→K）では途切れがない。しかし、許容度と受容者の区間は閉じていない。このため G-003 を「一部（照合未了）」とする**（§3.6）[D]。番号の区間は 10 件すべてで欠落が 0 件である [D]。許容度の区間では、GOV-02 の許容度項目（T1〜T7、Z1〜Z7、P1〜P6、L1〜L4）に照らせない S が 2 件ある（S-18、S-14。T1 以外に該当する項目がない）[D][^13]。受容者の区間では、残余リスク台帳（DCS-05）の受容者の段が 1 シナリオに 1 名とはならない。GOV-03 §7 の受容者案と DCS-05 の段がすべての行で一致する S は S-08 だけである [D][^12][^8]。合格値の多くは TBD であり、受容の記録（E9）は 0 件である [D]。

## 1. 位置付けと範囲

### 1.1 本書が決めること・決めないこと

| 本書が決めること | 本書が決めないこと（正本） |
|---|---|
| R→G→DL→C→TC/RB→証跡の各区間の対応を一つの表にまとめること、逆引きの提供 | R の定義と区分（R-requirements.md、DL-101） |
| 孤児 R・孤児 DL・孤児 G の定義と検査結果 | G の受入基準と最終判定の段階（G-goal-criteria.md、DL-102） |
| G-001〜G-151 の現状（本書 §2.4 の 7 値）と根拠文書 | DL の割当とファイル名（deliverables.md、DL-103） |
| 上位損失シナリオの連鎖の番号記入（loss-scenarios.md §7 の申し送り） | C-xxx の定義・試験手順・証跡の所在（control-mapping-ledger.md、DL-28） |
| 各台帳の食い違いの指摘と是正先 | TC の合否基準（preregistered-test-plan.md、DL-22）、RB の手順（compromise-runbooks.md、DL-24） |

- 本書の表は抽出時点の写しである [D]。Phase 4 の並行作業で 00_decision と traceability の文書が作られている途中であり、ファイルの有無に依存する値（DL の作成状態、G の現状）は抽出時点 2026-10-15 10:32 の値である [D]。
- 本書は台帳を編集しない。食い違いはすべて末尾の残課題に是正先を付けて記録した [D]。

### 1.2 読み手別の入口

| 読み手 | 入口 |
|---|---|
| CTO/CISO・決裁者 | §0、§4.2（G の現状の集計）、§3.1（検査の集計） |
| 内部監査・第三者評価者 | §2（抽出規則）、§3（孤児検査）、§7（再現手順） |
| 統制・試験の所有者 | §5（R 正引き）、§6.2（C→試験→証跡）、§6.3（TC 逆引き） |
| 連携開発チーム | §4.3 の G-098〜G-151（連携・並行開発の基準） |

## 2. 連鎖の定義と抽出規則

### 2.1 区間ごとの正本と抽出規則

| 区間 | 正本 | 抽出規則 |
|---|---|---|
| R の母集団 | R-requirements.md §4・§6 の表[^1] | R-ID で始まる表の行の第 1 列。親 ID 283＋枝番 43＝326 行 |
| G の母集団 | G-goal-criteria.md §6・§9 の表[^2] | G-ID で始まる表の行。151 件 |
| DL の母集団 | deliverables.md §3・§4 の表[^3] | DL-ID で始まる表の行。115 件 |
| R→G | G-goal-criteria.md の関連 R 欄[^2] | 範囲（R-001〜R-007 等）を親 ID に展開する。枝番（R-188.1 等）は親 ID の G を継承する（表では「（親）」と記す） |
| R→DL | R-requirements.md の対応成果物欄[^1] | パスを deliverables.md §8 のパス→DL 表と §5 の ADR ファイル表で DL に読み替える |
| G→DL | G-goal-criteria.md の対応成果物欄[^2] | 欄内の DL-ID |
| R→C | control-mapping-ledger.md §5[^4] | C-ID 列 |
| C→試験・証跡 | control-mapping-ledger.md §4.1[^4] | 試験手順・証跡（E 種別）・証跡の所在の各列 |
| R/G→TC | preregistered-test-plan.md §3.4 の TC 一覧、末尾の対応表、R/G 名を見出しに持つ節[^5]。numeric-contracts.md の対応表（R→SLI）と SLI 行の試験仮番[^7] | SLI 行の仮番（TC-13-04 等）は、試験計画 §6.5 の ADR 仮番割当と各 TC の「吸収した仮番」欄で TC-xxx に読み替える |
| R/G→RB・EX | compromise-runbooks.md 末尾の対応表と R/G 名を見出しに持つ節[^6] | 「本書の該当箇所」欄の RB-xx・EX-xx |
| S→T→C→TC→RB→K | threat-catalog.md 各 T の分類欄[^9]、control-mapping-ledger.md §6[^4]、試験計画の各 TC の関連欄[^5]、compromise-runbooks.md §1.3[^6]、kri.md の主な S 欄[^10] | S を持つ T を集め、T から C・TC を、S から RB・K を引く |
| 証跡 | control-mapping-ledger.md §4.1 の「ハッシュ・取得日」[^4] | 全件「未取得」 |

- 抽出は正規表現による機械照合である。欄の自由記述に書かれた ID（例: 「TC-ARC09 で達成可能性」のような番号のない参照）は拾えない [D]。拾えなかった対応は「未割当」側に数えるので、本書の未割当件数は過大側に誤る [D]。

### 2.2 孤児の定義

G-021 は孤児の定義を置いていない[^2]。本書は次のとおり定義した [D]。

| 種類 | 定義 | 判定に使う区間 |
|---|---|---|
| 孤児 R（下流） | DL または C に結び付かない R | R→DL、R→C |
| 孤児 R（上流） | どの G にも結び付かない R。全件 G（関連 R が 200 行以上の G）だけに結び付く R は「個別 G 未接続」として別に数える | R→G |
| 孤児 DL | R の対応成果物、G の対応成果物、成果物計画の対応要求欄のいずれからも参照されない DL | R→DL、G→DL、DL→R |
| 孤児 G | 関連 R がない G、または計画上の対応成果物（実測成果物 DL-81・DL-82 を除く）がすべて未作成の G | G→R、G→DL |

### 2.3 区分 C・D の R に求める試験の結び付き

- 区分 C（実測）の R は、TC・RB・EX のいずれかに結び付くことを求める。結び付かない R は §3.5 に列挙した [D]。
- 区分 D（第三者）の R は、独立評価の RFP/SOW（DL-30）と独立保証計画（DL-07）で閉じる計画である[^3]。本書の正引き表では、TC がない D の R に「DL-30/DL-07（第三者）」と記した [D]。

### 2.4 G の現状の判定規則

| 現状 | 判定規則 |
|---|---|
| 未着手 | 計画上の対応成果物（DL-81・DL-82 を除く）がすべて未作成 |
| 未着手（一部） | 計画上の対応成果物の一部が未作成。集計では未着手に含めて内数を示す |
| 充足 | 区分 A で、対応成果物がすべて存在する。G-ID を明示参照する既存文書がない場合は「充足※」とし、内容の照合が済んでいないことを示す |
| 未達（成果物内で開示） | 区分 A で対応成果物はすべて存在するが、対応成果物のいずれかが、その G の合格条件の中身（件数・範囲・網羅・記録項目）を満たしていないと明記している（ラウンド 6 で追加。本版では G-012・G-018・G-019・G-022）。判定者（作成者以外）の確認が未実施であることだけを理由に「未達」と書いている場合は、この区分に入れない |
| 一部（照合未了） | 区分 A で対応成果物はすべて存在するが、本書の照合で合格基準の一部の区間が閉じていないことを確認した（本版では G-003・G-038。G-003 は §3.6） |
| 決裁案まで | 区分 B で、対応成果物（決裁案・選択肢・様式）がすべて存在する。経営・法務の決定（E1/E2/E9）は未取得 |
| 要実測 | 区分 C または C（B併用）で、計画文書（事前登録計画・設計）がすべて存在する。実測（DL-81）は未取得 |
| 要第三者 | 区分 D で、計画文書（RFP/SOW・自己評価・保証計画）がすべて存在する。第三者の報告（E6/E7）は未取得 |
| 不合格（是正中） | 判定を行い、合格基準を満たさなかった（G 台帳 §4.3 の「不合格」[^2]）。本版では G-017・G-021・G-037・G-131 |

- 「未達（成果物内で開示）」と「充足」の境界: 作成者以外の確認が未実施であることは、§4.2 の時点のすべての G に共通する（「達成」は 0 件）。そのため、対応成果物が判定者の未実施だけを理由に「未達」と書く G（例: G-008 の rejected-hypotheses.md、G-055 の capacity-model.md）は「充足」に残した。合格条件の中身そのものを満たさないと書く G だけを移した [D]。対応成果物の中に合格条件の外の項目（例: G-049 に対する dependency-tiers.md の「演習による実証」）の未達が書かれている場合も、移していない [D]。
- 「充足」は G 台帳 §4.3 の「準備済」に当たり、「達成」ではない [D][^2]。作成者以外の確認（Phase 4 の独立反証レビュー DL-108、自動検査 DL-111）を経るまで、どの G も達成としない [D]。
- 実測成果物 DL-81（実測レポート）と DL-82（PoC コード）は Phase 5 の成果物である[^3]。これらが未作成であることは「要実測」の定義そのものなので、未着手の判定から除いた [D]。

## 3. 検査結果

### 3.1 集計

| 検査 | 件数 | 判定 |
|---|---|---|
| R の総行数 | 326 | — |
| 孤児 R（下流）: DL なし | 0 | 合格 |
| 孤児 R（下流）: C なし | 0 | 合格 |
| 孤児 R（上流）: G なし（全件 G・親の継承を含めても） | 6 | **不合格** |
| 個別 G 未接続（全件 G G-010, G-022, G-029 だけに結び付く R を含む） | 78 | **要是正** |
| 枝番で親 ID の G を継承した R | 43 | 参考 |
| 対応 DL がすべて未作成の R | 0（なし） | 要作成 |
| 対応 DL の一部が未作成の R | 4（R-060, R-065, R-066, R-076。いずれも DL-59。最終整合で更新） | 要作成 |
| DL の総数 | 115 | — |
| 孤児 DL | 0 | 合格 |
| R・G から直接参照されない DL（計画の対応要求だけで結び付く） | 10（DL-87, DL-88, DL-90, DL-94, DL-97, DL-98, DL-102, DL-103, DL-114, DL-115） | 参考 |
| 計画済みで未作成の DL | 2（DL-59、DL-81 の実測レポート。最終整合で更新） | 要作成 |
| G の総数 | 151 | — |
| 孤児 G: 関連 R なし | 4 | **要是正** |
| 孤児 G: 対応成果物がすべて未作成 | 0（抽出時点 7。最終整合で更新） | 合格 |
| G-ID を明示参照する既存文書がない G | 0（抽出時点は G-131。consistency-checks.md が参照） | 参考 |
| 区分 C の R のうち TC・RB・EX 未割当 | 41／147（抽出時点）。ラウンド 4 の割当後 36／147 | **要是正** |
| 統制の試験欄の TH-TC のうち TC に吸収された記録がないもの | 47／58 | **要是正** |
| TC のうち R に結び付かないもの（G だけに結び付くものを含む） | 8（TC-024, TC-025, TC-026, TC-119, TC-122, TC-123, TC-124, TC-130） | 参考 |
| TC のうち R にも G にも結び付かないもの | 1（TC-130） | 参考 |
| 証跡を取得した R | 0 | 未達 |

- 件数は 2026-10-15 10:32 時点の抽出値である [D]。ただし「対応 DL の一部が未作成の R」「計画済みで未作成の DL」「孤児 G: 対応成果物がすべて未作成」「G-ID を明示参照する既存文書がない G」の 4 行は、最終整合（2026-10-15 12:03 の作業ツリー）でファイルの有無を確かめて更新した [D]。DL の総数 115 は抽出時点の値であり、その後に deliverables.md へ追加された DL-116〜DL-119（RS-18、ライフサイクルイベント契約・スキーマ、Client Registration API）は本書の §5・§6 に入っていない（残課題 12）[D]。R・G・DL の総数は各台帳の集計（R-requirements.md §2.1 の 326 行、G-goal-criteria.md の 151 件、deliverables.md §7 の 115 件）と一致した [D][^1][^2][^3]。

### 3.2 孤児 R

- **下流（DL・C）**: 0 件 [D]。統制台帳 §7.2 の規則 1 の結果（孤児要求 0 件）[^4]と一致した [D]。
- **上流（G）**: 全件 G と親の継承を含めても G に結び付かない R は R-278, R-279, R-280, R-281, R-282, R-283 の 6 件である [D]。いずれも Phase 1 の網羅性批評で追加された R であり[^1]、G 台帳の改訂（§4.5 の規則に従う追記）で関連 R に加える必要がある [D]。
- **個別 G 未接続**: 78 行（R-016, R-077, R-151, R-152, R-170, R-211〜R-283）[D]。主因は、G 台帳の関連 R 欄が seed-01 の R-ID（R-001〜R-210）で書かれ、R-211 以降が全件 G（G-010, G-022, G-029）でしか拾われていないことである [D][^2]。G 台帳 §8 も「R-requirements.md の確定後に DL-104 で再照合する」と申し送っている [D][^2]。対応成果物の重なりから求めた候補 G を §4.4 に示す [D]。

### 3.3 孤児 DL と未作成 DL

- **孤児 DL**: 0 件 [D]。
- **未作成 DL（再最終整合時点。抽出時点の DL では 1 件）**: DL-59（09_assurance/pentest-redteam-plan.md）である [D]。DL-81 の実測レポート（12_poc/measurement-report.md）は POC-02 版 0.1（draft、作成者以外の確認未実施）として作成された。POC-02 の値は立会人のいない自己実行の記録であり、[M] の証拠にはしない（open-items OI-C18・OI-C31）[D]。抽出後に deliverables.md 版 0.5 が追加した DL-120（12_poc/code/contract-kit/README.md）と DL-121（11_contracts/lifecycle-state.openapi.yaml）も未作成である（consistency-checks.md §10.2、open-items OI-M02）[D]。
- **未作成 DL（最終整合時点 2 件。記録として残す）**: DL-59（09_assurance/pentest-redteam-plan.md）と DL-81 の実測レポート（12_poc/measurement-report.md。12_poc/data/ は作成済み）であった [D]。抽出時点の 10 件は次のとおりで、DL-59・DL-81 以外の 8 件は最終整合までに作成された（いずれも draft・作成者以外の検証待ち。open-items OI-M01・OI-M03・OI-M04）[D]。
- **抽出時点の未作成 DL（10 件）**: DL-35（README.md）, DL-36（00_decision/00-cover.md）, DL-37（00_decision/01-executive-summary.md）, DL-59（09_assurance/pentest-redteam-plan.md）, DL-81（12_poc/data/, 12_poc/measurement-report.md）, DL-82（12_poc/code/README.md）, DL-108（traceability/independent-challenge-review.md）, DL-109（traceability/mock-panel-report.md）, DL-111（traceability/consistency-checks.md）, DL-112（traceability/change-log.md） [D]。このうち DL-81・DL-82 は Phase 5 の実測成果物、DL-108〜DL-112 は Phase 4〜6 の検証・凍結成果物であり、作成予定の工程に達していない [D][^3]。00_decision の未作成分は Phase 4 で並行作成中である [D]。
- **計画外ファイル（17 件）**: 抽出時点で、成果物計画のどの DL にも載っていないファイルが次のとおりあった [D]。最終整合時点では、自動検査（DL-111）の是正で 17 件とも deliverables.md §8 に登録済みであり、§8 に未登録のファイルは 0 件である（consistency-checks.md 付録 A.2、§8）[D]。成果物計画 §1 は「本書にないファイルを作る場合は、先に本書へ DL を追加する」と定めている[^3]。

| ファイル | 想定される扱い（案） |
|---|---|
| 04_architecture/architecture-reconciliation-notes.md | DL-12 または DL-54 の付属（整合調整の記録）として追記 [D] |
| 05_adr/reconciliation-notes.md | DL-12 または DL-54 の付属（整合調整の記録）として追記 [D] |
| 06_controls/mappings/cloud-supplychain.md | DL-28 の分冊として DL-28 の行に追記（統制台帳本文は CTL-04〜CTL-06 として参照している） [D] |
| 06_controls/mappings/identity-appsec.md | DL-28 の分冊として DL-28 の行に追記（統制台帳本文は CTL-04〜CTL-06 として参照している） [D] |
| 06_controls/mappings/nist-csf-iso27001.md | DL-28 の分冊として DL-28 の行に追記（統制台帳本文は CTL-04〜CTL-06 として参照している） [D] |
| 06_controls/mappings/regulations.md | DL-28 の分冊として DL-28 の行に追記（統制台帳本文は CTL-04〜CTL-06 として参照している） [D] |
| 11_contracts/review-notes/CON-02.md | DL-69〜DL-79 の付属（契約ごとのレビュー記録）として DL-69 の行に追記 [D] |
| 11_contracts/review-notes/CON-03.md | DL-69〜DL-79 の付属（契約ごとのレビュー記録）として DL-69 の行に追記 [D] |
| 11_contracts/review-notes/CON-04.md | DL-69〜DL-79 の付属（契約ごとのレビュー記録）として DL-69 の行に追記 [D] |
| 11_contracts/review-notes/CON-05.md | DL-69〜DL-79 の付属（契約ごとのレビュー記録）として DL-69 の行に追記 [D] |
| 11_contracts/review-notes/CON-06.md | DL-69〜DL-79 の付属（契約ごとのレビュー記録）として DL-69 の行に追記 [D] |
| 11_contracts/review-notes/CON-07.md | DL-69〜DL-79 の付属（契約ごとのレビュー記録）として DL-69 の行に追記 [D] |
| 11_contracts/review-notes/CON-08.md | DL-69〜DL-79 の付属（契約ごとのレビュー記録）として DL-69 の行に追記 [D] |
| 11_contracts/review-notes/CON-09.md | DL-69〜DL-79 の付属（契約ごとのレビュー記録）として DL-69 の行に追記 [D] |
| 11_contracts/review-notes/CON-10.md | DL-69〜DL-79 の付属（契約ごとのレビュー記録）として DL-69 の行に追記 [D] |
| research/RS-18-hierarchy-modeling.md | DL を末尾採番で追加（調査ストリーム RS-18） [D] |
| reports/テナント配下の階層モデリング.md | RS-18 の調査報告の原稿。DL を追加するか research/ への統合を決める [D] |

### 3.4 孤児 G

| G-ID | 種類 | 内容 | 是正先 |
|---|---|---|---|
| G-043 | 関連 R なし | /goal 原文から導いた基準で、レビュー指摘に対応する R がない [D][^2] | G 台帳で「関連 R なし（/goal 由来）」を正式な値として定義するか、R を割り当てる |
| G-052 | 関連 R なし | /goal 原文から導いた基準で、レビュー指摘に対応する R がない [D][^2] | G 台帳で「関連 R なし（/goal 由来）」を正式な値として定義するか、R を割り当てる |
| G-129 | 関連 R なし | /goal 原文から導いた基準で、レビュー指摘に対応する R がない [D][^2] | G 台帳で「関連 R なし（/goal 由来）」を正式な値として定義するか、R を割り当てる |
| G-133 | 関連 R なし | /goal 原文から導いた基準で、レビュー指摘に対応する R がない [D][^2] | G 台帳で「関連 R なし（/goal 由来）」を正式な値として定義するか、R を割り当てる |
| G-006 | 対応成果物がすべて未作成（解消） | DL-108 が抽出時点で存在しなかった。最終整合時点で作成済み [D] | 解消。現状は §4.3 |
| G-017 | 対応成果物がすべて未作成（解消） | DL-111 が抽出時点で存在しなかった。最終整合時点で作成済み [D] | 解消。現状は §4.3 |
| G-035 | 対応成果物がすべて未作成（解消） | DL-111 が抽出時点で存在しなかった。最終整合時点で作成済み [D] | 解消。現状は §4.3 |
| G-037 | 対応成果物がすべて未作成（解消） | DL-37 が抽出時点で存在しなかった。最終整合時点で作成済み [D] | 解消。現状は §4.3 |
| G-038 | 対応成果物がすべて未作成（解消） | DL-109 が抽出時点で存在しなかった。最終整合時点で作成済み [D] | 解消。現状は §4.3 |
| G-131 | 対応成果物がすべて未作成（解消） | DL-111 が抽出時点で存在しなかった。最終整合時点で作成済み [D] | 解消。現状は §4.3 |
| G-133 | 対応成果物がすべて未作成（解消） | DL-35, DL-112 が抽出時点で存在しなかった。最終整合時点で作成済み [D] | 解消。関連 R なしの孤児としては残る |

- G-021 の合格基準の「孤児 G 0 件」は、関連 R なしの 4 件を孤児とみなすかで結論が変わる [D]。本書は保守側に倒し、孤児として数えた [D]。

### 3.5 試験の未割当

**区分 C の R で TC・RB・EX のいずれにも結び付かないもの（抽出時点 41 行。うち R-058・R-059・R-061・R-062・R-269 の 5 行はラウンド 4 で TC-121 に割当済み）**

| R-ID | 要求（要約） | 対応 DL | 状況 |
|---|---|---|---|
| R-047 | 「どのテナントのどのIdPがこの主体を保証したか」の結合 | DL-08, DL-12 | TC・RB・EX のいずれにも未割当 |
| R-058 | 全entry point inventory（batch/q | DL-10, DL-50 | 抽出時点は未割当。TC-121 に割当済み（POC-01 版 0.3、ラウンド 4）[^5] |
| R-059 | enforcement coverageの機械的検証 | DL-15 | 抽出時点は未割当。TC-121 に割当済み（POC-01 版 0.3、ラウンド 4）[^5] |
| R-061 | DB/storage側tenant guardrail（RL | DL-15, DL-57 | 抽出時点は未割当。TC-121 に割当済み（POC-01 版 0.3、ラウンド 4）[^5] |
| R-062 | 上記のCI継続自動検証 | DL-15, DL-80 | 抽出時点は未割当。TC-121 に割当済み（POC-01 版 0.3、ラウンド 4）[^5] |
| R-093 | 選定評価軸13項目（整合性、最大深度、tail latenc | DL-13 | TC・RB・EX のいずれにも未割当 |
| R-099 | ADR: PDP topology、cell・fault d | DL-12, DL-18 | TC・RB・EX のいずれにも未割当 |
| R-105 | version negotiation | DL-23, DL-70 | TC・RB・EX のいずれにも未割当 |
| R-106 | schema migration | DL-12, DL-23 | TC・RB・EX のいずれにも未割当 |
| R-107 | dual-run | DL-23, DL-31 | TC・RB・EX のいずれにも未割当 |
| R-109 | policy/model/schema/token/audi | DL-12, DL-23 | TC・RB・EX のいずれにも未割当 |
| R-123 | WORM | DL-25 | TC・RB・EX のいずれにも未割当 |
| R-125 | コスト | DL-25, DL-58 | TC・RB・EX のいずれにも未割当 |
| R-127 | 記録率・欠損検知・backpressure・監査経路停止時挙 | DL-25, DL-77 | TC・RB・EX のいずれにも未割当 |
| R-128 | 監査をtrace samplingに依存させず独立経路 | DL-25 | TC・RB・EX のいずれにも未割当 |
| R-129 | federation onboarding | DL-12, DL-26 | TC・RB・EX のいずれにも未割当 |
| R-130 | offboarding | DL-26 | TC・RB・EX のいずれにも未割当 |
| R-131 | domain verification | DL-12, DL-26 | TC・RB・EX のいずれにも未割当 |
| R-132 | SCIM | DL-26, DL-76 | TC・RB・EX のいずれにも未割当 |
| R-133 | delegated admin | DL-26 | TC・RB・EX のいずれにも未割当 |
| R-158 | RFC 9700を明示準拠基準化（implicit廃止、PK | DL-12, DL-16 | TC・RB・EX のいずれにも未割当 |
| R-161 | JWT厳格検証（alg allowlist、typ、iss、 | DL-16, DL-75 | TC・RB・EX のいずれにも未割当 |
| R-162 | 種類の異なるJWT間で相互排他的検証規則 | DL-16, DL-75 | TC・RB・EX のいずれにも未割当 |
| R-163 | DPoPの限界明記とBFF・CSP・短命化・鍵保護の併用 | DL-16 | TC・RB・EX のいずれにも未割当 |
| R-177 | 新旧認可のdual-runと差分記録 | DL-12, DL-31 | TC・RB・EX のいずれにも未割当 |
| R-178 | 新基盤allowが広い差分は即時調査、deny差分は業務影響 | DL-31 | TC・RB・EX のいずれにも未割当 |
| R-180 | 各段階の自動rollback条件 | DL-31 | TC・RB・EX のいずれにも未割当 |
| R-187 | 脆弱性根本原因の将来開発への反映（SSDF RV.3） | DL-32, DL-110 | TC・RB・EX のいずれにも未割当 |
| R-188.6 | 認証: 回復完了SLO | DL-08, DL-20 | TC・RB・EX のいずれにも未割当 |
| R-188.7 | 認証: 不正回復検知時間 | DL-20, DL-52 | TC・RB・EX のいずれにも未割当 |
| R-189.1 | token: access/refresh寿命（access | DL-16, DL-20 | TC・RB・EX のいずれにも未割当 |
| R-189.2 | token: clock skew | DL-16, DL-20 | TC・RB・EX のいずれにも未割当 |
| R-190.5 | 認可: 誤allow許容値 | DL-01, DL-20 | TC・RB・EX のいずれにも未割当 |
| R-190.6 | 認可: 誤deny予算 | DL-20, DL-21 | TC・RB・EX のいずれにも未割当 |
| R-191.2 | 剥奪: stale allowの最大継続 | DL-20, DL-56 | TC・RB・EX のいずれにも未割当 |
| R-194.5 | 変更: 未移行consumer数 | DL-20, DL-70 | TC・RB・EX のいずれにも未割当 |
| R-207 | 被害を1テナント/1サービス/1期間に封じ込められることの論 | DL-18, DL-63 | TC・RB・EX のいずれにも未割当 |
| R-232 | 全IAM変更（権限・ロール・relation・設定の変更）を | DL-25, DL-77 | TC・RB・EX のいずれにも未割当 |
| R-235 | 原則7 侵害を前提に検知・封じ込め・復旧する: インシデント | DL-24, DL-32 | TC・RB・EX のいずれにも未割当 |
| R-246 | ソフトウェア供給網: SLSA 1.2 をビルド来歴・署名・ | DL-12, DL-61 | TC・RB・EX のいずれにも未割当 |
| R-269 | 承認条件4: 全entry pointのPEP covera | DL-10, DL-15 | 抽出時点は未割当。TC-121 に割当済み（POC-01 版 0.3、ラウンド 4）[^5] |

- 数値契約の指標（R-188.x〜R-195.x）のうち、設定上限型の指標（例: R-189.1 の token 寿命）は CI の設定検査で測る設計である[^7]。設定検査を TC として採番するか、C-ID の試験として記録するかを試験計画で決める必要がある [D]。
- PEP 網羅（R-058、R-059、R-061、R-062、R-269）は、POC-01 版 0.3 で TC-121 の対応要求に加わり、承認条件 4 の判定量（未宣言入口の検出率、DB 直接接続の列挙の完全性、変異体の検出力の下限）が合否基準 (7) として凍結対象に書かれた[^5]。本書の 5 行はこれに合わせて TC-121 に割り当てた（ラウンド 4）[D]。property test の検出力の下限は TBD（所有者 CISO、期限 TC-121 の凍結前）であり、TC-121 は未凍結である[^5]。段階導入（R-177、R-178、R-180）は DL-31 の範囲に近いが、試験の割当てはまだない [D]。

**統制の試験欄の TH-TC で、TC に吸収された記録がないもの（47 件）**: TH-TC-002, TH-TC-003, TH-TC-004, TH-TC-006, TH-TC-008, TH-TC-010, TH-TC-015, TH-TC-016, TH-TC-019, TH-TC-023, TH-TC-025, TH-TC-028, TH-TC-029, TH-TC-030, TH-TC-031, TH-TC-035, TH-TC-036, TH-TC-037, TH-TC-038, TH-TC-040, TH-TC-041, TH-TC-043, TH-TC-044, TH-TC-046, TH-TC-048, TH-TC-049, TH-TC-054, TH-TC-055, TH-TC-056, TH-TC-057, TH-TC-058, TH-TC-060, TH-TC-064, TH-TC-065, TH-TC-066, TH-TC-067, TH-TC-068, TH-TC-069, TH-TC-071, TH-TC-072, TH-TC-076, TH-TC-077, TH-TC-079, TH-TC-080, TH-TC-081, TH-TC-082, TH-TC-084 [D]。

- TH-TC-nnn は脅威カタログが T-nnn ごとに DL-22 へ持ち込んだ試験候補である[^4]。試験計画は 13 件の TH-TC だけを「吸収した仮番」に記載している [D][^5]。残りは、既存の TC に吸収したが記載していないのか、未計画なのかを試験計画の側で区別する必要がある [D]。
- 統制 79 件のうち 67 件は、試験欄から TC-xxx へたどれない [D]。統治系の統制（C-001〜C-016 等）は議事録・文書の確認で試験するので TC を持たないのが正常であり、この件数は是正件数ではない [D]。

### 3.6 上位損失シナリオの連鎖（G-003 の本書側の区間）

R-214 と G-003 が求める連鎖は「保護対象→脅威主体→損失シナリオ→リスク許容度→制御要件→検証方法→合格値→残余リスク受容者」である[^1][^2]。本節は、これを番号の区間（§3.6.1）と、許容度・合格値・受容者の区間（§3.6.2）に分けて照合する [D]。

#### 3.6.1 番号の区間（S→T→C→TC→RB→K）

loss-scenarios.md §7 は「T-xxx・C-xxx・TC-xxx・K-xx の番号は採番後に DL-104 で記入する」と申し送った[^8]。上位 10 件について記入した結果が次の表である [D]。

| S | シナリオ | T（脅威カタログの分類欄） | C（T→C 逆引き） | TC（TC の関連欄の T から） | RB | K | 受容者案（GOV-03 §7 の転記。正本ではない。§3.6.2 を参照） |
|---|---|---|---|---|---|---|---|
| S-01 | BOLA・tenant confusion … | T-010, T-015, T-016, T-018, T-020〜T-023, T-025, T-026, T-029, T-033, T-036, T-037, T-039, T-040, T-050, T-058, T-060, T-061, T-070, T-071, T-073, T-076, T-078, T-080 | C-018, C-023, C-024, C-026, C-029, C-031, C-034, C-036〜C-038, C-045, C-047〜C-053, C-056〜C-058, C-065, C-070, C-077 | TC-002, TC-003, TC-004, TC-005, TC-006, TC-010, TC-016, TC-018, TC-019, TC-021, TC-023, TC-024, TC-025, TC-027, TC-028 | RB-05, RB-12 | K-01, K-02, K-03, K-04, K-05, K-06, K-11, K-22, K-26, K-27, K-29 | B2B 事業責任者 |
| S-02 | 署名鍵・JWKS 侵害による token 偽造 | T-015, T-040〜T-045 | C-034, C-036, C-039〜C-043, C-071, C-075, C-079 | TC-004, TC-006, TC-014, TC-028 | RB-01, RB-03, RB-08 | K-02, K-06, K-07, K-08, K-19, K-20, K-27 | 経営会議 |
| S-18 | 大規模アカウント乗っ取り | T-001, T-002, T-004〜T-008, T-010〜T-014, T-057, T-063 | C-018〜C-024, C-028, C-031〜C-033, C-035, C-038, C-047, C-060, C-068, C-070, C-072, C-077, C-078 | TC-005, TC-007, TC-018, TC-019, TC-020 | RB-02 | K-08, K-11, K-28 | 事業責任者 |
| S-05 | policy・model 誤配布による全域 … | T-027, T-028, T-033, T-050 | C-045, C-050, C-056, C-062, C-070, C-071 | TC-010, TC-012, TC-026 | RB-05, RB-06, RB-08 | K-02, K-04, K-07, K-10, K-17, K-18, K-19, K-20 | 経営会議 |
| S-15 | 第三者連携 token の大量窃取 | T-006, T-007, T-014, T-053, T-057, T-069〜T-071, T-079 | C-017, C-020, C-029, C-032, C-033, C-035, C-038, C-046, C-050, C-068, C-077, C-078 | TC-005, TC-007, TC-025 | RB-02, RB-10 | K-02, K-14, K-15 | B2B 事業責任者 |
| S-04 | support・helpdesk 経由の回復… | T-001〜T-003, T-011, T-046, T-049 | C-019〜C-022, C-035, C-045, C-063, C-064, C-072 | TC-020, TC-022 | RB-09 | K-11, K-12, K-28 | 事業責任者 |
| S-06 | PDP・AS 障害による全サービス停止 | T-004, T-009, T-023, T-028, T-031, T-035, T-043, T-047, T-068 | C-016, C-025, C-031, C-041, C-043, C-045, C-049, C-054, C-056〜C-060, C-063, C-071, C-075 | TC-010, TC-012, TC-014, TC-021, TC-022 | RB-03 | K-06, K-18, K-19, K-20, K-27 | 経営会議 |
| S-08 | CI/CD・供給網経由の AS・PDP・SD… | T-046, T-051〜T-053 | C-017, C-045, C-046, C-063, C-078 | TC-022 | RB-08 | K-01, K-03, K-05, K-08, K-09, K-11, K-17, K-29 | 経営会議 |
| S-14 | AI エージェント濫用 | T-037, T-072〜T-075, T-078 | C-036, C-037, C-050 | TC-004 | RB-11 | K-14, K-16 | agent 機能の事業責任者 |
| S-03 | 顧客 IdP 侵害・IdP 追加によるテナン… | T-005, T-058, T-061〜T-067 | C-021, C-024〜C-027, C-029, C-030, C-047, C-070, C-071, C-074, C-077 | TC-005, TC-019, TC-020 | RB-04 | K-02, K-11, K-13 | B2B 事業責任者 |

- T は脅威カタログの各 T の分類欄に S を持つものである[^9]。C は統制台帳 §6 の T→C 逆引き[^4]、TC は試験計画の各 TC の関連欄に T を持つもの[^5]、RB は runbook §1.3[^6]、K は KRI 定義表の主な S 欄[^10]から引いた [D]。
- 10 件すべてで T・C・TC・RB・K の欠落は 0 件である [D]。この区間は閉じている [D]。
- 右端の受容者案は GOV-03 §7 の値の転記である[^8]。受容者の正本は残余リスク台帳（DCS-05）とし、照合の結果は §3.6.2 に示す [D]。DCS-05 は GOV-03・THR-03・各 ADR の残余リスクを集約し、受容者案・期限案・受容票 ID を付ける文書であるため、正本をこちらに置く[^12] [D]。

#### 3.6.2 許容度・合格値・受容者の区間

| S | 許容度項目（GOV-02） | 合格値の出所（SLI-ID。TBD は所有者・期限） | 受容者（正本 DCS-05 の RRG と段） | GOV-03 §7 の受容者案との照合 |
|---|---|---|---|---|
| S-01 | T1、T3（Z1〜Z7）、T4（Z6）。U1 は受容不可 | 負例の受理 0 件（論理条件 [D]）。SLI-038（仮置き。経営会議・CISO、G4）、SLI-101・SLI-102（Z2・Z3。仮置き。経営会議・CISO、G4）。運用上の閾値は TBD（CISO、G0） | 段2: RRG-001, 002, 003, 006, 007, 031, 036, 037, 047, 063, 064。段1: RRG-004, 005, 024, 030（複数ドメインに及ぶ場合は段2）, 035。既知の経路は X-01（受容不可） | **不一致**。GOV-03 は「B2B 事業責任者」（段1）。代表行 RRG-001 は段2 |
| S-02 | T1、T3（Z1〜Z3） | 別鍵 token の受理 0 件（論理条件 [D]）。SLI-023（仮置き。CTO＋CISO）、SLI-025・SLI-104（TBD。CISO、G4）、SLI-026（TBD。CTO＋SRE 責任者、G4） | 段2: RRG-007, 008, 010, 011, 047。段3: RRG-009 | **一部不一致**。GOV-03 は「経営会議」（段2）。RRG-009 は段3（取締役会） |
| S-18 | T1 のみ（選好は「テナント内の不正アクセス」。個別の許容度項目なし） | SLI-011（起点 7% のみ仮置き。目標は TBD、プロダクト責任者＋CISO）、SLI-103（TBD。CISO＋SRE 責任者、G4）。GOV-03 §7 の合格値は TBD（CISO＋プロダクト責任者、G4） | 段1: RRG-012, 013, 015, 016, 018。段2: RRG-045, 046 | **一部不一致**。GOV-03 は「事業責任者」（段1）。RRG-045・046 は段2 |
| S-05 | T1、T3・T4（allow 側。Z6）、T2（deny 側） | 剥奪済み権限の復活 0 件（論理条件 [D]）。SLI-038（仮置き）、SLI-080・SLI-082（TBD。SRE 責任者＋CTO、G4）、SLI-085（TBD。SRE 責任者、G4） | 段2: RRG-032, 033, 034, 036, 037。段1: RRG-035 | **一部不一致**。GOV-03 は「経営会議」（段2）。RRG-035 は段1 |
| S-15 | T1、T3（Z1〜Z3） | SLI-025・SLI-103（TBD。CISO＋SRE 責任者、G4）。検知時間の SLI は未採番（GOV-03 §7: CISO＋プロダクト責任者、G4） | 段2: RRG-043, 044, 045, 046。段1: RRG-004 | **不一致**。GOV-03 は「B2B 事業責任者」（段1）。代表行 RRG-044 は段2 |
| S-04 | T1、T5（P6。support の経路） | SLI-007・SLI-008（TBD。CISO＋プロダクト責任者、G1 で候補・G4 で確定）、SLI-009（TBD。CISO＋事業責任者、G4・G5） | 段2: RRG-014, 017, 019。段1: RRG-016, 051 | **不一致**。GOV-03 は「事業責任者」（段1）。RRG-017 は段2 |
| S-06 | T1、T2 | SLI-060・SLI-061・SLI-063（仮置きの帯。事業責任者＋CTO、G4）、SLI-003（TBD。CTO＋事業責任者） | 段2: RRG-011, 027, 032, 038, 039, 040, 041, 060。段1: RRG-023 | **一部不一致**。GOV-03 は「経営会議」（段2）。RRG-023 は段1（顧客責任を含む） |
| S-08 | T1、T5（P1〜P4） | 改ざん成果物の配備 0 件（論理条件 [D]）。回転完了時間は SLI-104（TBD。CISO、G4） | 段2: RRG-014, 034, 042, 043 | 一致（段2） |
| S-14 | T1 のみ（選好は「テナント内の不正アクセス」。個別の許容度項目なし。X-02 は U1 に当たる可能性） | 他 resource 宛て token の受理 0 件（論理条件 [D]）。grant 寿命の SLI は未採番（GOV-03 §7: CTO＋CISO、G3）。関連 SLI-020（TBD。CTO＋CISO、G4） | 段2: RRG-006, 049。段1: RRG-048 | **不一致**。GOV-03 は「agent 機能の事業責任者」（段1）。RRG-049 は段2 |
| S-03 | T1、T6（他テナントへの波及は U1） | 可変属性による連結 0 件（論理条件 [D]。GOV-02 の T6 KRI も目標 0）。待機時間の SLI は未採番（GOV-03 §7: プロダクト責任者＋CISO、G3） | 段1: RRG-018, 020, 021, 023, 024。段2: RRG-022 | **一部不一致**。GOV-03 は「B2B 事業責任者」（段1）。RRG-022 は段2 |

- 許容度項目は、GOV-02 §2.2 の許容度項目の表（T1〜T7）、§3.1 の選好の表（リスク領域と S の対応）、§3.4（Z1〜Z7）、§3.5（P1〜P6）、§3.6（T6）、§3.7（L1〜L4）から引いた[^13]。T1（最大許容損失）は GOV-03 の上位 10 シナリオ全体に適用される[^13]。S に個別の T 項目を割り当てる表は GOV-02 にないため、選好の表のリスク領域から割り当てた。この割当は設計推論である [D]。
- S-18 と S-14 は、GOV-02 §3.1 で「テナント内の不正アクセス」（選好: 低・低・中）に分類されている[^13]。しかし、§2.2 の T2〜T7 にも、Z・P・L の項目にも、これに対応する許容度がない [D]。このため、この 2 件では、合格値と許容度の対応を追えない [D]。
- 合格値の出所の SLI-ID・状態・所有者・期限は数値契約台帳 §5 から転記した[^7]。S と SLI の対応は、SLO-01 に明記されているもの（SLI-025・SLI-103 の導出の鎖にある S-02・S-15、SLI-100 の S-01、§5.5 の S-06）を除いて、本書の設計推論である [D]。「0 件」の合格値は、GOV-03 §7 のとおり、負例試験の論理的な合否条件である[^8]。
- 受容者の欄は、DCS-05 §4 の各 RRG 行のうち、シナリオ欄に当該 S を含む行を、段ごとに並べたものである[^12]。段は DCS-05 の表記（段1＝該当ドメインの事業責任者、段2＝CEO（経営会議）、段3＝取締役会）による[^12]。
- DCS-05 §6.2 は、RRG-001（S-01）と RRG-044（S-15）の受容者案を段2 としている[^12]。GOV-03 §7 は、どちらのシナリオも「B2B 事業責任者」としている[^8]。DCS-05 §3.1 は、GOV-03 の決裁案 D の考え方（封じ込め単位）を採り、テナント・アカウント単位のシナリオでも、共通部品の欠陥で全テナントに及ぶ経路は段2 にしたとしている[^12]。この読替えの結果は、GOV-03 §7 に反映されていない [D]。
- 1 シナリオに対して 1 名の受容者は定まらない [D]。DCS-05 は 1 票に 1 つの段を置くため、同じ S でも経路（RRG）ごとに段が異なる[^12]。GOV-03 §7 と GOV-03 決裁案 D の受容者の欄は、DCS-05 の RRG-ID と段の並びに置き換えることが要る（他文書への申し送り 1）[D]。
- 受容の記録（E9）は 0 件である [D]。DCS-05 は、受容票はまだ 1 件も起票されていないとしている[^12]。

## 4. G-001〜G-151 の現状

### 4.1 読み方

- 「関連 R」は G 台帳の値を展開したものである。全件 G の関連 R は範囲で示した [D]。
- 「対応成果物」の × は抽出時点で未作成の DL である [D]。
- 「根拠文書」は G-ID を明示的に書いている既存文書で、対応成果物に属するものを先に並べた [D]。G-ID の記載は、その文書が当該 G に応じる記述を持つことの手掛かりであり、合否の判定ではない [D]。

### 4.2 集計

| 現状 | 件数 | G-ID |
|---|---|---|
| 充足 | 51 | G-001, G-002, G-004〜G-006, G-008, G-010, G-013〜G-016, G-020, G-023〜G-027, G-035, G-036, G-042, G-043, G-049, G-055, G-064, G-073, G-077, G-078, G-097〜G-101, G-104, G-107, G-109, G-118〜G-120, G-124, G-125, G-127, G-128, G-130, G-132, G-135, G-137, G-138, G-140, G-143, G-148, G-151 |
| 未達（成果物内で開示） | 4 | G-012, G-018, G-019, G-022 |
| 一部（照合未了） | 2 | G-003, G-038 |
| 決裁案まで | 32 | G-011, G-028〜G-033, G-039〜G-041, G-044〜G-047, G-052〜G-054, G-065, G-067, G-071, G-074, G-079, G-080, G-087, G-094, G-096, G-116, G-126, G-129, G-133, G-134, G-139 |
| 要実測 | 50 | G-009, G-048, G-050, G-051, G-056〜G-060, G-062, G-063, G-066, G-068〜G-070, G-072, G-075, G-081, G-082, G-084, G-086, G-088, G-090, G-092, G-093, G-095, G-102, G-103, G-105, G-106, G-108, G-110〜G-115, G-117, G-121〜G-123, G-136, G-141, G-142, G-144〜G-147, G-149, G-150 |
| 要第三者 | 5 | G-007, G-076, G-085, G-089, G-091 |
| 未着手 | 0 | — |
| 未着手（一部） | 3 | G-034, G-061, G-083 |
| 不合格（是正中） | 4 | G-017, G-021, G-037, G-131 |
| 計 | 151 | — |

| 最終判定の段階 | 充足 | 未達（成果物内で開示） | 一部（照合未了） | 決裁案まで | 要実測 | 要第三者 | 未着手（一部を含む） | 不合格 |
|---|---|---|---|---|---|---|---|---|
| 段階1（86 件） | 51 | 4 | 2 | 23 | 2 | 0 | 0 | 4 |
| 段階2（54 件） | 0 | 0 | 0 | 3 | 45 | 3 | 3 | 0 |
| 段階3（11 件） | 0 | 0 | 0 | 6 | 3 | 2 | 0 | 0 |

- 次回決裁で判定する段階1 の 86 件のうち、机上の準備がそろったもの（充足・決裁案まで）は 74 件である（ラウンド 6 で更新。最終整合の時点は 78 件、抽出時点は 70 件）[D]。残りは、G-012・G-018・G-019・G-022 の未達（成果物内で開示）、G-003・G-038 の一部（照合未了）、G-017・G-021・G-037・G-131 の不合格（是正中）、段階1 で判定する実測（G-121・G-122 の契約試験キットの動作確認）である [D]。
- **最終整合（2026-10-15）での判定の根拠** [D]:
  - G-001・G-008・G-025: 抽出時点で未作成だった DL-35・DL-112・DL-37 が作成され、対応成果物がすべてそろったので §2.4 の規則で「充足」とした。G-025 は模擬パネルが判定者に入るが、パネルは自己レビューであり、作成者以外の確認には当たらない [D]。
  - G-006: DL-108（traceability/independent-challenge-review.md）が作成され、4 手法の記録と ICR-01〜ICR-22 の持込み先 DEC がある。合格判定は作成者以外のレビュアーが行う（ICR-22、未実施）ため「充足」（準備済）にとどめた [D]。
  - G-007: DL-108 は自らを AI 自己反証とし、報告系統外の独立反証は未達と明記している（ICR-21）。区分 D の計画文書（DL-07・DL-108）がそろったので「要第三者」とした [D]。
  - G-035: 自動検査（DL-111）の最終整合での再実行で、禁止表現の出現 36 箇所はすべて引用・否定文・ゴール再定義の文脈であった（consistency-checks.md §8）。文脈の判定は作成者の自己判断であり、作成者以外の確認は未実施のため「充足」にとどめた [D]。
  - G-017・G-037: 再実行で、主張タグ欠落の候補が 00_decision・ADR 本文に 206 箇所あり、エグゼクティブ要約（DL-37）の表を除く本文にタグのない文が 19 文あった。全文タグの対象文書で欠落 0 件という合格基準を満たさないため「不合格（是正中）」とした（検査は文の近似分割による候補であり、確定数ではない）[D]。
  - G-131: 再実行で、未定義 ID 13 種（S-20、T-087〜T-091、RB-13、DL-120、TC-057、P-28〜P-30、R-170.1）と、§8 にあり実ファイルのない 2 件（DL-59、DL-81）が残った。全項目 0 件という合格基準を満たさないため「不合格（是正中）」とした [D]。
  - G-038: DL-109（traceability/mock-panel-report.md）は冒頭に自己レビューであることを明記し、ラウンド別の指摘と是正状況を記録している。ただし G 全件への判定と根拠を持たないため「一部（照合未了）」とした [D]。
  - G-012・G-018・G-019・G-022（ラウンド 6 で「充足」から移した）: 最終整合では対応成果物がそろったことだけで「充足」としていたが、対応成果物が自ら合格条件の未達を明記していた。G-012: 統制台帳（CTL-01）§0 は、残る 5 件の範囲外判断が第2線の承認前であり、ISO/IEC 27001:2022 と SOC 2 の本文が未取得で、SP 800-63-4・ASVS 5.0.0・SSDF・SLSA・CCM の要素単位の写像が完成していないため「G-012 は未達」とする[^4]。G-018: 主張台帳（TRC-05）§4 は、版・取得日・スナップショットハッシュ・検証者の列を含めていないとして「G-018 未達」とする（G-018 の合格条件は版・確認日の照合を含む）[^15][^2]。引用監査（TRC-06）§0 も、作成者以外の照合者 2 名による突合を未実施とする[^16]。G-019: 主張台帳は旧提案書の主張 287 件（CL-0001〜CL-0287）だけを登録し、決裁事項・ADR の結論を支える新パッケージの主張は CL-0288 以降として追記する予定にとどまる。§0 で「G-019 の合格条件に対して未達」と書いている[^15]。G-022: 前回指摘対照表（DCS-02）§1 は「検証記録のない行が 168 件残るため G-022 は未達」とし、§0 の 4 は検証記録のある行を 152 件とする[^14]。G-022 の合格条件「作成者自身が検証者の行 0 件」[^2]を満たさない [D]。
  - **再最終整合（模擬パネル ラウンド 7 の後、2026-10-15）での確認** [D]。区分の変更はない。
    - G-017・G-037: 自動検査の再実行（consistency-checks.md §10）で、主張タグ欠落の候補が 00_decision・ADR 本文に 240 箇所（最終整合は 206）、エグゼクティブ要約の表を除く本文にタグのない文の候補が 111 文（同 19 文）、決裁事項詳細（DCS-03）で 112 文（同 38 文）になった。不合格（是正中）のままとした [D]。
    - G-131: 同じ再実行で、メタ情報ブロック欠落が 1 件（POC-02）に戻り、未定義 ID は 13 種・537 箇所（T-094 が加わり DL-120 が外れた）、§8 にあって実ファイルのないものは 3 件（DL-59、DL-120、DL-121）になった。不合格（是正中）のままとした [D]。
    - G-006: DL-108 は TRC-09 版 0.3 に更新され、82 件の指摘（回答の対象 67 件は回答済 28・部分回答 35・未回答 4）と ICR-01〜ICR-26 の持込み先 DEC がある。合格判定は作成者以外のレビュアー（ICR-22、未実施）が行うため「充足」（準備済）のままとした。未回答 4 件と ICR-23〜ICR-26 は POA&M の OI-J01〜OI-J03・OI-J06・OI-J07 で追う [D]。
    - G-007: TRC-09 版 0.3 も報告系統外の独立反証は未達とし、評価者は未任命である。「要第三者」のままとした [D]。
    - G-038: DL-109 は TRC-10 版 0.4 に更新され、ラウンド 1〜7 の判定・件数・Medium/Low 223 件を記録している。最新の判定済みラウンド 7 は承認可（条件付き）4・差戻し 4 で、ラウンド 7 の是正 25 件は再審査未実施である。G 全件への判定と根拠は依然として持たないため「一部（照合未了）」のままとした [D]。
    - DL-81 を対応成果物に持つ G（G-009 ほか 14 件）: 実測レポート POC-02 版 0.1 が作成されたが、全実行で立会人がおらず、合否に使える実測（[M]）は 0 件である（POC-02、open-items 要旨）。§2.4 の「要実測」の定義（実測は未取得）に当たるため、区分は変えず、§4.3 の × 印だけを外した [D]。
  - G-039・G-040・G-133: 区分 B で対応成果物がそろったので「決裁案まで」とした。内部監査の所見（G-039）、DEC の決議（G-040）、承認記録（G-133）はいずれも未取得である。模擬パネルの内部監査役はラウンド 3 でも差戻しであった [D]。
- 段階2・段階3 の G は、本リポジトリ内では「要実測」「要第三者」「決裁案まで」より先に進めない [D]。CONVENTIONS §8 に従い、達成済みとは書かない [D][^11]。
- 「充足※」は なし である。対応成果物は存在するが、G-ID を明示した記述が見当たらないため、内容の照合が済んでいない [D]。

### 4.3 G ごとの現状と根拠文書

| G-ID | 区分 | 段階 | 現状 | 関連 R | 対応成果物（× は未作成） | TC/RB/EX | 根拠文書（G-ID を明示参照する既存文書） |
|---|---|---|---|---|---|---|---|
| G-001 | A | 段階1 | **充足** | R-197〜R-199 | DL-35, DL-83 | — | research/README.md, 00_decision/05-residual-risk-register.md, 00_decision/06-gate-plan-and-plan-b.md, 01_governance/durability-charter-20y.md ほか 4 件 |
| G-002 | A | 段階1 | **充足** | R-202 | DL-39, DL-83 | — | 00_decision/03-decision-items.md, research/README.md, 00_decision/05-residual-risk-register.md |
| G-003 | A | 段階1 | **一部（照合未了）** | R-001〜R-007, R-023 | DL-02, DL-11, DL-104 | — | 01_governance/loss-scenarios.md, 03_threat-model/threat-catalog.md, 00_decision/05-residual-risk-register.md, 02_requirements/data-classification.md |
| G-004 | A | 段階1 | **充足** | R-002, R-167 | DL-02, DL-10, DL-11 | — | 01_governance/loss-scenarios.md, 03_threat-model/dfd-entry-points.md, 03_threat-model/threat-catalog.md, 00_decision/05-residual-risk-register.md ほか 2 件 |
| G-005 | A | 段階1 | **充足** | R-088, R-208 | DL-44 | — | 00_decision/08-alternatives-comparison.md, 00_decision/05-residual-risk-register.md, 05_adr/ADR-001-build-buy-identity-provider.md |
| G-006 | A | 段階1 | **充足** | R-201 | DL-108 | — | 00_decision/05-residual-risk-register.md, 09_assurance/independent-assurance-plan.md |
| G-007 | D | 段階2 | **要第三者** | R-063, R-201 | DL-07, DL-108 | — | 09_assurance/independent-assurance-plan.md, 00_decision/05-residual-risk-register.md, 01_governance/raci-governance.md, 12_poc/preregistered-test-plan.md |
| G-008 | A | 段階1 | **充足** | R-200, R-201 | DL-107, DL-112 | — | traceability/rejected-hypotheses.md, 00_decision/05-residual-risk-register.md, traceability/open-items.md |
| G-009 | C | 段階2 | **要実測** | R-078, R-169 | DL-22, DL-81 | — | 12_poc/preregistered-test-plan.md, 00_decision/05-residual-risk-register.md, 09_assurance/independent-assurance-plan.md |
| G-010 | A | 段階1 | **充足** | R-001〜R-277 | DL-83, DL-101 | — | research/README.md, 00_decision/05-residual-risk-register.md |
| G-011 | B | 段階1 | **決裁案まで** | R-010, R-024 | DL-34, DL-86 | — | 06_controls/applicability.md, 00_decision/05-residual-risk-register.md, 06_controls/mappings/regulations.md, traceability/open-items.md |
| G-012 | A | 段階1 | **未達（成果物内で開示）** | R-024〜R-026, R-165 | DL-28, DL-85, DL-89, DL-92 | — | 06_controls/control-mapping-ledger.md, 00_decision/02-prior-findings-crosswalk.md, 00_decision/05-residual-risk-register.md, 04_architecture/root-of-trust.md ほか 5 件 |
| G-013 | A | 段階1 | **充足** | R-198 | DL-84 | — | research/standards-status.md, 00_decision/05-residual-risk-register.md, 05_adr/ADR-017-non-human-ai-agent-identity.md, research/README.md |
| G-014 | A | 段階1 | **充足** | R-002, R-003, R-166 | DL-53, DL-93, DL-96 | — | 03_threat-model/incident-casebook.md, 00_decision/05-residual-risk-register.md, 05_adr/ADR-013-cell-partitioning-fail-mode.md, traceability/open-items.md |
| G-015 | A | 段階1 | **充足** | R-142, R-200 | DL-54, DL-58, DL-91, DL-99 | — | 04_architecture/capacity-model.md, 04_architecture/reference-architecture-v2.md, 00_decision/05-residual-risk-register.md, 04_architecture/product-evaluation-exit.md ほか 3 件 |
| G-016 | A | 段階1 | **充足** | R-198, R-199 | DL-45, DL-83, DL-110 | — | research/README.md, traceability/open-items.md, 00_decision/05-residual-risk-register.md |
| G-017 | A | 段階1 | **不合格（是正中）** | R-199 | DL-111 | — | 00_decision/05-residual-risk-register.md, traceability/claims-ledger.md |
| G-018 | A | 段階1 | **未達（成果物内で開示）** | R-197, R-198 | DL-29, DL-105 | — | traceability/citation-audit-proposal.md, traceability/claims-ledger.md, 00_decision/05-residual-risk-register.md |
| G-019 | A | 段階1 | **未達（成果物内で開示）** | R-197, R-199 | DL-45, DL-105 | — | traceability/claims-ledger.md, 00_decision/05-residual-risk-register.md |
| G-020 | A | 段階1 | **充足** | R-094〜R-103 | DL-12 | — | 05_adr/ADR-001-build-buy-identity-provider.md, 05_adr/ADR-002-assurance-levels-by-tier.md, 05_adr/ADR-003-account-recovery-authenticators.md, 05_adr/ADR-004-b2b-federation-linking-scim.md ほか 26 件 |
| G-021 | A | 段階1 | **不合格（是正中）** | R-025 | DL-104 | — | traceability/traceability-matrix.md（本書） |
| G-022 | A | 段階1 | **未達（成果物内で開示）** | R-001〜R-277 | DL-38, DL-101 | — | 00_decision/02-prior-findings-crosswalk.md, 00_decision/05-residual-risk-register.md |
| G-023 | A | 段階1 | **充足** | R-197, R-198 | DL-106 | — | 00_decision/05-residual-risk-register.md |
| G-024 | A | 段階1 | **充足** | R-087, R-196 | DL-20, DL-21 | — | 01_governance/business-impact-analysis.md, 07_slo/numeric-contracts.md, 00_decision/05-residual-risk-register.md, 05_adr/ADR-005-token-profile.md ほか 2 件 |
| G-025 | A | 段階1 | **充足** | R-022, R-202 | DL-37, DL-39 | — | 00_decision/03-decision-items.md, 00_decision/05-residual-risk-register.md, 05_adr/ADR-027-migration-dual-run-rollback.md, 08_operations/phased-rollout.md |
| G-026 | A | 段階1 | **充足** | R-202 | DL-39 | — | 00_decision/03-decision-items.md, 00_decision/05-residual-risk-register.md |
| G-027 | A | 段階1 | **充足** | R-022, R-074, R-202 | DL-42 | — | 00_decision/06-gate-plan-and-plan-b.md, 00_decision/05-residual-risk-register.md |
| G-028 | B | 段階1 | **決裁案まで** | R-202 | DL-42, DL-44 | — | 00_decision/06-gate-plan-and-plan-b.md, 00_decision/08-alternatives-comparison.md, 00_decision/03-decision-items.md, 00_decision/05-residual-risk-register.md |
| G-029 | B | 段階1 | **決裁案まで** | R-001〜R-277 | DL-101, DL-106 | — | 00_decision/05-residual-risk-register.md |
| G-030 | B | 段階1 | **決裁案まで** | R-003〜R-005, R-010 | DL-01, DL-02, DL-03, DL-34 | — | 01_governance/loss-scenarios.md, 01_governance/risk-appetite-draft.md, 02_requirements/data-classification.md, 06_controls/applicability.md ほか 2 件 |
| G-031 | B | 段階1 | **決裁案まで** | R-007, R-014, R-015, R-017, R-019〜R-021 | DL-04, DL-05, DL-46 | — | 01_governance/exception-risk-acceptance.md, 01_governance/raci-governance.md, 01_governance/stop-authority.md, 00_decision/05-residual-risk-register.md |
| G-032 | B | 段階1 | **決裁案まで** | R-007, R-023, R-075 | DL-05, DL-41 | — | 00_decision/05-residual-risk-register.md, 01_governance/exception-risk-acceptance.md, 00_decision/03-decision-items.md, 01_governance/raci-governance.md ほか 7 件 |
| G-033 | B | 段階1 | **決裁案まで** | R-018, R-067, R-068, R-074, R-075 | DL-07, DL-46 | — | 01_governance/stop-authority.md, 09_assurance/independent-assurance-plan.md, 00_decision/03-decision-items.md, 00_decision/05-residual-risk-register.md ほか 4 件 |
| G-034 | D | 段階2 | **未着手（一部）** | R-063〜R-066, R-076 | DL-30, ×DL-59, DL-60, DL-110 | — | 09_assurance/oidf-conformance-plan.md, 09_assurance/rfp-sow.md, traceability/open-items.md, 00_decision/05-residual-risk-register.md ほか 3 件 |
| G-035 | A | 段階1 | **充足** | R-142, R-200, R-201 | DL-111 | — | 00_decision/05-residual-risk-register.md, 05_adr/ADR-010-authz-engine-store-consistency.md, traceability/claims-ledger.md |
| G-036 | A | 段階1 | **充足** | R-202 | DL-38, DL-42 | — | 00_decision/06-gate-plan-and-plan-b.md, 00_decision/05-residual-risk-register.md |
| G-037 | A | 段階1 | **不合格（是正中）** | R-202 | DL-37 | — | 00_decision/05-residual-risk-register.md |
| G-038 | A | 段階1 | **一部（照合未了）** | R-201, R-202 | DL-109 | — | 00_decision/05-residual-risk-register.md |
| G-039 | B | 段階1 | **決裁案まで** | R-018 | DL-07, DL-109 | — | 09_assurance/independent-assurance-plan.md, 00_decision/05-residual-risk-register.md, 01_governance/exception-risk-acceptance.md, 01_governance/raci-governance.md ほか 2 件 |
| G-040 | B | 段階1 | **決裁案まで** | R-202 | DL-36, DL-39 | — | 00_decision/03-decision-items.md, 00_decision/05-residual-risk-register.md |
| G-041 | B | 段階1 | **決裁案まで** | R-022 | DL-40, DL-45 | — | 00_decision/04-program-charter.md, 00_decision/03-decision-items.md, 00_decision/05-residual-risk-register.md, 02_requirements/principal-catalog.md |
| G-042 | A | 段階1 | **充足** | R-150, R-153, R-207 | DL-12, DL-54, DL-63 | — | 04_architecture/reference-architecture-v2.md, 05_adr/ADR-002-assurance-levels-by-tier.md, 05_adr/ADR-003-account-recovery-authenticators.md, 05_adr/ADR-004-b2b-federation-linking-scim.md ほか 15 件 |
| G-043 | A | 段階1 | **充足** | —（/goal 由来） | DL-45 | — | 00_decision/05-residual-risk-register.md |
| G-044 | B | 段階1 | **決裁案まで** | R-008, R-009, R-196 | DL-21 | — | 01_governance/business-impact-analysis.md, 00_decision/05-residual-risk-register.md |
| G-045 | B | 段階1 | **決裁案まで** | R-141 | DL-21, DL-33 | — | 01_governance/business-impact-analysis.md, 08_operations/tco-vendor-lts.md, 00_decision/05-residual-risk-register.md, 00_decision/07-organization-and-tco.md ほか 1 件 |
| G-046 | B | 段階3 | **決裁案まで** | R-141 | DL-33, DL-43 | — | 00_decision/07-organization-and-tco.md, 08_operations/tco-vendor-lts.md, 00_decision/03-decision-items.md, 00_decision/05-residual-risk-register.md ほか 3 件 |
| G-047 | B | 段階3 | **決裁案まで** | R-092, R-136〜R-141 | DL-27, DL-43 | — | 00_decision/07-organization-and-tco.md, 08_operations/operating-model.md, 00_decision/05-residual-risk-register.md |
| G-048 | C（B併用） | 段階2 | **要実測** | R-150, R-157, R-207 | DL-18, DL-63, DL-81 | — | 04_architecture/cell-blast-radius.md, 10_integration/dependency-tiers.md, 00_decision/04-program-charter.md, 00_decision/05-residual-risk-register.md ほか 7 件 |
| G-049 | A | 段階1 | **充足** | R-207, R-210 | DL-12, DL-63 | — | 05_adr/ADR-002-assurance-levels-by-tier.md, 05_adr/ADR-003-account-recovery-authenticators.md, 05_adr/ADR-004-b2b-federation-linking-scim.md, 05_adr/ADR-007-key-hierarchy-kms-hsm.md ほか 15 件 |
| G-050 | C | 段階2 | **要実測** | R-058, R-177 | DL-31, DL-50 | — | 02_requirements/as-is-inventory.md, 08_operations/phased-rollout.md, 00_decision/05-residual-risk-register.md, 00_decision/06-gate-plan-and-plan-b.md ほか 5 件 |
| G-051 | C | 段階2 | **要実測** | R-177〜R-180 | DL-12, DL-31, DL-81 | — | 05_adr/ADR-002-assurance-levels-by-tier.md, 05_adr/ADR-003-account-recovery-authenticators.md, 05_adr/ADR-004-b2b-federation-linking-scim.md, 05_adr/ADR-016-versioning-deprecation.md ほか 10 件 |
| G-052 | B | 段階1 | **決裁案まで** | —（/goal 由来） | DL-40, DL-66 | — | 00_decision/04-program-charter.md, 10_integration/onboarding.md, 00_decision/05-residual-risk-register.md, 00_decision/06-gate-plan-and-plan-b.md ほか 2 件 |
| G-053 | B | 段階3 | **決裁案まで** | R-140 | DL-43, DL-66 | — | 10_integration/onboarding.md, 00_decision/04-program-charter.md, 00_decision/05-residual-risk-register.md, 01_governance/raci-governance.md |
| G-054 | B | 段階2 | **決裁案まで** | R-102, R-120, R-121, R-124 | DL-18, DL-25, DL-34 | — | 04_architecture/audit-privacy.md, 04_architecture/cell-blast-radius.md, 06_controls/applicability.md, 00_decision/05-residual-risk-register.md ほか 7 件 |
| G-055 | A | 段階1 | **充足** | R-125, R-190, R-192 | DL-58 | — | 04_architecture/capacity-model.md, 00_decision/05-residual-risk-register.md, 04_architecture/revocation-continuous-evaluation.md, 04_architecture/root-of-trust.md ほか 6 件 |
| G-056 | C | 段階2 | **要実測** | R-089, R-093, R-205 | DL-22, DL-81, DL-82 | TC-101, TC-102, TC-128 | 12_poc/preregistered-test-plan.md, 00_decision/05-residual-risk-register.md, 04_architecture/capacity-model.md, 05_adr/ADR-010-authz-engine-store-consistency.md ほか 2 件 |
| G-057 | C（B併用） | 段階3 | **要実測** | R-192, R-196 | DL-20, DL-21 | — | 01_governance/business-impact-analysis.md, 07_slo/numeric-contracts.md, 00_decision/05-residual-risk-register.md, 05_adr/ADR-023-dependency-tiers.md ほか 1 件 |
| G-058 | C | 段階2 | **要実測** | R-079〜R-086 | DL-09, DL-19, DL-81 | TC-010, TC-011, TC-014, TC-019, TC-103, TC-104, TC-105, TC-106, TC-109, TC-112, TC-114, TC-115, TC-126, TC-128 | 02_requirements/operation-risk-tiers-assurance.md, 04_architecture/fail-mode-matrix.md, 00_decision/05-residual-risk-register.md, 04_architecture/root-of-trust.md ほか 11 件 |
| G-059 | C | 段階2 | **要実測** | R-112, R-174 | DL-22, DL-24, DL-58 | TC-111, RB-02, RB-03, RB-04, EX-05 | 04_architecture/capacity-model.md, 08_operations/compromise-runbooks.md, 12_poc/preregistered-test-plan.md, 00_decision/05-residual-risk-register.md ほか 7 件 |
| G-060 | C（B併用） | 段階2 | **要実測** | R-027, R-030, R-031, R-188 | DL-09, DL-12, DL-20 | — | 02_requirements/operation-risk-tiers-assurance.md, 05_adr/ADR-002-assurance-levels-by-tier.md, 05_adr/ADR-003-account-recovery-authenticators.md, 05_adr/ADR-004-b2b-federation-linking-scim.md ほか 7 件 |
| G-061 | D | 段階2 | **未着手（一部）** | R-032, R-041〜R-043 | DL-08, DL-12, ×DL-59 | — | 02_requirements/identity-lifecycle.md, 05_adr/ADR-002-assurance-levels-by-tier.md, 05_adr/ADR-003-account-recovery-authenticators.md, 05_adr/ADR-004-b2b-federation-linking-scim.md ほか 8 件 |
| G-062 | C | 段階2 | **要実測** | R-012, R-042, R-176 | DL-52, DL-81 | — | 03_threat-model/fraud-abuse-controls.md, 00_decision/05-residual-risk-register.md, 05_adr/ADR-003-account-recovery-authenticators.md, 05_adr/ADR-005-token-profile.md ほか 4 件 |
| G-063 | C | 段階2 | **要実測** | R-123, R-125〜R-128, R-193 | DL-25, DL-58, DL-81 | — | 04_architecture/audit-privacy.md, 04_architecture/capacity-model.md, 00_decision/05-residual-risk-register.md, 04_architecture/claims-catalog.md ほか 5 件 |
| G-064 | A | 段階1 | **充足** | R-118, R-119, R-122 | DL-25 | — | 04_architecture/audit-privacy.md, 00_decision/05-residual-risk-register.md, 04_architecture/claims-catalog.md, 05_adr/ADR-014-audit-data.md ほか 1 件 |
| G-065 | B | 段階1 | **決裁案まで** | R-104, R-208, R-209 | DL-47 | — | 01_governance/durability-charter-20y.md, 00_decision/03-decision-items.md, 00_decision/05-residual-risk-register.md, 04_architecture/claims-catalog.md ほか 6 件 |
| G-066 | C | 段階2 | **要実測** | R-205, R-208 | DL-12, DL-22, DL-72 | TC-013, TC-102 | 05_adr/ADR-002-assurance-levels-by-tier.md, 05_adr/ADR-003-account-recovery-authenticators.md, 05_adr/ADR-004-b2b-federation-linking-scim.md, 05_adr/ADR-010-authz-engine-store-consistency.md ほか 20 件 |
| G-067 | B | 段階1 | **決裁案まで** | R-037, R-047, R-209 | DL-12, DL-71 | — | 05_adr/ADR-002-assurance-levels-by-tier.md, 05_adr/ADR-004-b2b-federation-linking-scim.md, 05_adr/ADR-007-key-hierarchy-kms-hsm.md, 05_adr/ADR-016-versioning-deprecation.md ほか 7 件 |
| G-068 | C | 段階2 | **要実測** | R-101, R-104 | DL-12, DL-23, DL-95 | — | 04_architecture/evolution-pqc.md, 05_adr/ADR-002-assurance-levels-by-tier.md, 05_adr/ADR-005-token-profile.md, 05_adr/ADR-007-key-hierarchy-kms-hsm.md ほか 12 件 |
| G-069 | C | 段階2 | **要実測** | R-105〜R-109 | DL-12, DL-23, DL-70 | — | 04_architecture/evolution-pqc.md, 05_adr/ADR-002-assurance-levels-by-tier.md, 05_adr/ADR-011-policy-language-pep-pdp-api.md, 05_adr/ADR-014-audit-data.md ほか 8 件 |
| G-070 | C | 段階2 | **要実測** | R-090, R-091, R-186 | DL-12, DL-13, DL-73 | — | 04_architecture/product-evaluation-exit.md, 05_adr/ADR-001-build-buy-identity-provider.md, 05_adr/ADR-002-assurance-levels-by-tier.md, 05_adr/ADR-003-account-recovery-authenticators.md ほか 19 件 |
| G-071 | B | 段階1 | **決裁案まで** | R-181, R-182 | DL-32, DL-47, DL-84 | — | 01_governance/durability-charter-20y.md, 09_assurance/continuous-assurance-plan.md, research/standards-status.md, 00_decision/04-program-charter.md ほか 3 件 |
| G-072 | C | 段階2 | **要実測** | R-006, R-062 | DL-06, DL-15, DL-80 | — | 01_governance/kri.md, 04_architecture/pep-contract.md, 11_contracts/mock-contract-test-kit.md, 01_governance/durability-charter-20y.md ほか 16 件 |
| G-073 | A | 段階1 | **充足** | R-209 | DL-47, DL-53, DL-95 | — | 01_governance/durability-charter-20y.md, 03_threat-model/incident-casebook.md, 04_architecture/evolution-pqc.md, 05_adr/ADR-015-crypto-agility-pqc.md ほか 2 件 |
| G-074 | B | 段階1 | **決裁案まで** | R-093, R-094, R-203 | DL-12, DL-13 | — | 04_architecture/product-evaluation-exit.md, 05_adr/ADR-001-build-buy-identity-provider.md, 05_adr/ADR-002-assurance-levels-by-tier.md, 05_adr/ADR-003-account-recovery-authenticators.md ほか 10 件 |
| G-075 | C | 段階2 | **要実測** | R-150, R-209 | DL-12, DL-23, DL-49 | — | 02_requirements/tenant-lifecycle.md, 04_architecture/evolution-pqc.md, 05_adr/ADR-002-assurance-levels-by-tier.md, 05_adr/ADR-003-account-recovery-authenticators.md ほか 12 件 |
| G-076 | D | 段階3 | **要第三者** | R-181〜R-187 | DL-32 | — | 09_assurance/continuous-assurance-plan.md, 01_governance/durability-charter-20y.md, 01_governance/kri.md, 04_architecture/product-evaluation-exit.md ほか 3 件 |
| G-077 | A | 段階1 | **充足** | R-002, R-166 | DL-51 | — | 03_threat-model/attacker-model.md, 05_adr/ADR-001-build-buy-identity-provider.md, 05_adr/ADR-017-non-human-ai-agent-identity.md, 05_adr/ADR-020-fapi2-applicability.md ほか 1 件 |
| G-078 | A | 段階1 | **充足** | R-135, R-167, R-168 | DL-11 | — | 03_threat-model/threat-catalog.md, 05_adr/ADR-003-account-recovery-authenticators.md, 05_adr/ADR-004-b2b-federation-linking-scim.md, 05_adr/ADR-006-revocation-continuous-evaluation.md ほか 3 件 |
| G-079 | B | 段階3 | **決裁案まで** | R-011, R-023 | DL-11, DL-41 | — | 00_decision/05-residual-risk-register.md, 03_threat-model/threat-catalog.md, 05_adr/ADR-001-build-buy-identity-provider.md, 05_adr/ADR-024-cross-tenant-sharing.md |
| G-080 | B | 段階1 | **決裁案まで** | R-011 | DL-01 | — | 01_governance/risk-appetite-draft.md, 00_decision/03-decision-items.md, 01_governance/kri.md, 04_architecture/pep-contract.md ほか 3 件 |
| G-081 | C | 段階2 | **要実測** | R-168, R-173 | DL-22, DL-53, DL-81 | TC-004, TC-006, TC-007, TC-014, TC-019, TC-020, TC-025, TC-104, TC-105, TC-106, TC-108, TC-109, TC-113, TC-115, TC-116, TC-126, TC-127, TC-128 | 03_threat-model/incident-casebook.md, 12_poc/preregistered-test-plan.md, 05_adr/ADR-003-account-recovery-authenticators.md, 05_adr/ADR-004-b2b-federation-linking-scim.md ほか 4 件 |
| G-082 | C | 段階2 | **要実測** | R-058, R-059, R-061, R-062, R-164 | DL-10, DL-15, DL-57 | — | 03_threat-model/dfd-entry-points.md, 04_architecture/data-outside-pep.md, 04_architecture/pep-contract.md, 05_adr/ADR-012-pep-coverage-storage-guardrails.md ほか 4 件 |
| G-083 | D | 段階2 | **未着手（一部）** | R-060, R-065 | DL-30, ×DL-59 | — | 09_assurance/rfp-sow.md, 04_architecture/pep-contract.md, 05_adr/ADR-001-build-buy-identity-provider.md, 05_adr/ADR-011-policy-language-pep-pdp-api.md ほか 4 件 |
| G-084 | C | 段階2 | **要実測** | R-049〜R-054, R-056, R-057 | DL-12, DL-14, DL-24 | RB-01, RB-08, EX-01, EX-02, EX-03 | 04_architecture/root-of-trust.md, 05_adr/ADR-001-build-buy-identity-provider.md, 05_adr/ADR-002-assurance-levels-by-tier.md, 05_adr/ADR-003-account-recovery-authenticators.md ほか 11 件 |
| G-085 | D | 段階3 | **要第三者** | R-055 | DL-14 | — | 04_architecture/root-of-trust.md, 05_adr/ADR-001-build-buy-identity-provider.md, 05_adr/ADR-007-key-hierarchy-kms-hsm.md, 09_assurance/independent-assurance-plan.md ほか 2 件 |
| G-086 | C | 段階2 | **要実測** | R-028, R-033〜R-041, R-044, R-045, R-047, R-048 | DL-08, DL-22 | TC-018, TC-019, TC-020, TC-112, TC-113 | 02_requirements/identity-lifecycle.md, 12_poc/preregistered-test-plan.md, 05_adr/ADR-003-account-recovery-authenticators.md, 05_adr/ADR-004-b2b-federation-linking-scim.md ほか 3 件 |
| G-087 | B | 段階2 | **決裁案まで** | R-095, R-096, R-158〜R-160 | DL-12, DL-16 | — | 04_architecture/token-profile.md, 05_adr/ADR-001-build-buy-identity-provider.md, 05_adr/ADR-002-assurance-levels-by-tier.md, 05_adr/ADR-003-account-recovery-authenticators.md ほか 9 件 |
| G-088 | C | 段階2 | **要実測** | R-161〜R-163, R-173 | DL-16, DL-22, DL-80 | TC-004, TC-005, TC-006, TC-007 | 04_architecture/token-profile.md, 11_contracts/mock-contract-test-kit.md, 12_poc/preregistered-test-plan.md, 04_architecture/claims-catalog.md ほか 17 件 |
| G-089 | D | 段階2 | **要第三者** | R-046, R-064 | DL-30, DL-60 | TC-118 | 09_assurance/oidf-conformance-plan.md, 09_assurance/rfp-sow.md, 04_architecture/product-evaluation-exit.md, 05_adr/ADR-001-build-buy-identity-provider.md ほか 3 件 |
| G-090 | C | 段階2 | **要実測** | R-070, R-071, R-073 | DL-61 | — | 09_assurance/self-assessments.md, 05_adr/ADR-008-control-plane-cicd-protection.md, 05_adr/ADR-025-list-search-authorization.md, 06_controls/mappings/cloud-supplychain.md ほか 2 件 |
| G-091 | D | 段階2 | **要第三者** | R-054, R-056, R-069, R-072, R-073 | DL-12, DL-14, DL-30 | — | 04_architecture/root-of-trust.md, 05_adr/ADR-002-assurance-levels-by-tier.md, 05_adr/ADR-003-account-recovery-authenticators.md, 05_adr/ADR-004-b2b-federation-linking-scim.md ほか 12 件 |
| G-092 | C | 段階2 | **要実測** | R-042, R-176 | DL-12, DL-22, DL-46 | TC-011, TC-022, TC-115 | 01_governance/stop-authority.md, 05_adr/ADR-002-assurance-levels-by-tier.md, 05_adr/ADR-003-account-recovery-authenticators.md, 05_adr/ADR-008-control-plane-cicd-protection.md ほか 12 件 |
| G-093 | C | 段階2 | **要実測** | R-057, R-110〜R-113, R-115〜R-117, R-195 | DL-12, DL-24 | — | 05_adr/ADR-002-assurance-levels-by-tier.md, 05_adr/ADR-003-account-recovery-authenticators.md, 05_adr/ADR-004-b2b-federation-linking-scim.md, 05_adr/ADR-006-revocation-continuous-evaluation.md ほか 13 件 |
| G-094 | B | 段階3 | **決裁案まで** | R-114 | DL-24, DL-34 | — | 06_controls/applicability.md, 08_operations/compromise-runbooks.md, 05_adr/ADR-019-compromise-response.md, 06_controls/mappings/regulations.md |
| G-095 | C | 段階2 | **要実測** | R-129〜R-135 | DL-12, DL-26 | — | 02_requirements/customer-admin-responsibility.md, 05_adr/ADR-002-assurance-levels-by-tier.md, 05_adr/ADR-003-account-recovery-authenticators.md, 05_adr/ADR-004-b2b-federation-linking-scim.md ほか 8 件 |
| G-096 | B | 段階1 | **決裁案まで** | R-013 | DL-26, DL-34 | — | 02_requirements/customer-admin-responsibility.md, 06_controls/applicability.md, 05_adr/ADR-004-b2b-federation-linking-scim.md, 05_adr/ADR-019-compromise-response.md ほか 1 件 |
| G-097 | A | 段階1 | **充足** | R-187 | DL-11, DL-32, DL-51 | — | 03_threat-model/attacker-model.md, 03_threat-model/threat-catalog.md, 09_assurance/continuous-assurance-plan.md, 03_threat-model/incident-casebook.md |
| G-098 | A | 段階1 | **充足** | R-206 | DL-63, DL-64, DL-113 | — | 10_integration/dependency-tiers.md, 10_integration/integration-patterns.md, 05_adr/ADR-023-dependency-tiers.md, traceability/open-items.md |
| G-099 | A | 段階1 | **充足** | R-059, R-100, R-163, R-206 | DL-64 | — | 10_integration/integration-patterns.md, 04_architecture/workload-identity-delegation.md, 05_adr/ADR-006-revocation-continuous-evaluation.md, 05_adr/ADR-009-workload-identity-token-exchange.md ほか 2 件 |
| G-100 | A | 段階1 | **充足** | R-206 | DL-62, DL-64 | — | 10_integration/README.md, 10_integration/integration-patterns.md, traceability/open-items.md |
| G-101 | A | 段階1 | **充足** | R-029 | DL-48 | — | 02_requirements/principal-catalog.md, 05_adr/ADR-017-non-human-ai-agent-identity.md, 05_adr/ADR-021-irreversible-identifiers.md, 05_adr/ADR-024-cross-tenant-sharing.md ほか 3 件 |
| G-102 | C | 段階2 | **要実測** | R-100, R-206 | DL-12, DL-55, DL-74 | — | 04_architecture/workload-identity-delegation.md, 05_adr/ADR-002-assurance-levels-by-tier.md, 05_adr/ADR-003-account-recovery-authenticators.md, 05_adr/ADR-004-b2b-federation-linking-scim.md ほか 15 件 |
| G-103 | C | 段階2 | **要実測** | R-172, R-205, R-206 | DL-22, DL-80, DL-82 | TC-002, TC-004, TC-005, TC-007, TC-019, TC-021, TC-022, TC-023, TC-024, TC-027, TC-028, TC-104, TC-112, TC-115, TC-117, TC-120, TC-121, TC-125, TC-128 | 11_contracts/mock-contract-test-kit.md, 12_poc/preregistered-test-plan.md, 05_adr/ADR-006-revocation-continuous-evaluation.md, 05_adr/ADR-012-pep-coverage-storage-guardrails.md ほか 2 件 |
| G-104 | A | 段階1 | **充足** | R-207, R-210 | DL-63 | — | 10_integration/dependency-tiers.md, 05_adr/ADR-013-cell-partitioning-fail-mode.md, 05_adr/ADR-023-dependency-tiers.md |
| G-105 | C | 段階2 | **要実測** | R-058, R-061 | DL-57, DL-81 | — | 04_architecture/data-outside-pep.md, 04_architecture/audit-privacy.md, 04_architecture/pep-contract.md, 05_adr/ADR-012-pep-coverage-storage-guardrails.md ほか 4 件 |
| G-106 | C（B併用） | 段階3 | **要実測** | R-189, R-190 | DL-20, DL-64 | — | 07_slo/numeric-contracts.md, 10_integration/integration-patterns.md, 04_architecture/revocation-continuous-evaluation.md, 04_architecture/token-profile.md ほか 6 件 |
| G-107 | A | 段階1 | **充足** | R-205 | DL-17, DL-65, DL-113 | — | 04_architecture/authorization-model.md, 10_integration/authz-modeling-guide.md, 03_threat-model/threat-catalog.md, 05_adr/ADR-010-authz-engine-store-consistency.md ほか 3 件 |
| G-108 | C | 段階2 | **要実測** | R-171, R-205 | DL-17, DL-22, DL-65 | TC-013 | 04_architecture/authorization-model.md, 10_integration/authz-modeling-guide.md, 12_poc/preregistered-test-plan.md, 05_adr/ADR-010-authz-engine-store-consistency.md ほか 5 件 |
| G-109 | A | 段階1 | **充足** | R-098 | DL-12, DL-17 | — | 04_architecture/authorization-model.md, 05_adr/ADR-002-assurance-levels-by-tier.md, 05_adr/ADR-003-account-recovery-authenticators.md, 05_adr/ADR-004-b2b-federation-linking-scim.md ほか 6 件 |
| G-110 | C | 段階2 | **要実測** | R-143〜R-146 | DL-12, DL-17, DL-81 | — | 04_architecture/authorization-model.md, 05_adr/ADR-002-assurance-levels-by-tier.md, 05_adr/ADR-006-revocation-continuous-evaluation.md, 05_adr/ADR-010-authz-engine-store-consistency.md ほか 4 件 |
| G-111 | C（B併用） | 段階3 | **要実測** | R-112, R-143, R-191 | DL-12, DL-56, DL-78, DL-79 | — | 04_architecture/revocation-continuous-evaluation.md, 05_adr/ADR-002-assurance-levels-by-tier.md, 05_adr/ADR-003-account-recovery-authenticators.md, 05_adr/ADR-004-b2b-federation-linking-scim.md ほか 12 件 |
| G-112 | C | 段階2 | **要実測** | R-147〜R-149, R-154〜R-156, R-175 | DL-17, DL-18, DL-73 | — | 04_architecture/authorization-model.md, 04_architecture/cell-blast-radius.md, 11_contracts/relationship-model-registry.openapi.yaml, 05_adr/ADR-008-control-plane-cicd-protection.md ほか 5 件 |
| G-113 | C | 段階2 | **要実測** | R-190 | DL-12, DL-17 | — | 04_architecture/authorization-model.md, 05_adr/ADR-002-assurance-levels-by-tier.md, 05_adr/ADR-003-account-recovery-authenticators.md, 05_adr/ADR-004-b2b-federation-linking-scim.md ほか 8 件 |
| G-114 | C | 段階2 | **要実測** | R-011, R-172 | DL-12, DL-81 | — | 05_adr/ADR-002-assurance-levels-by-tier.md, 05_adr/ADR-003-account-recovery-authenticators.md, 05_adr/ADR-004-b2b-federation-linking-scim.md, 05_adr/ADR-012-pep-coverage-storage-guardrails.md ほか 9 件 |
| G-115 | C | 段階2 | **要実測** | R-133, R-135 | DL-26, DL-65 | — | 02_requirements/customer-admin-responsibility.md, 10_integration/authz-modeling-guide.md, 04_architecture/token-profile.md, 05_adr/ADR-002-assurance-levels-by-tier.md ほか 7 件 |
| G-116 | B | 段階3 | **決裁案まで** | R-140 | DL-65, DL-66 | — | 10_integration/authz-modeling-guide.md, 10_integration/onboarding.md, 01_governance/raci-governance.md, 04_architecture/authorization-model.md ほか 4 件 |
| G-117 | C | 段階2 | **要実測** | R-088, R-089, R-093, R-097 | DL-13, DL-22 | TC-013, TC-102 | 04_architecture/product-evaluation-exit.md, 12_poc/preregistered-test-plan.md, 05_adr/ADR-010-authz-engine-store-consistency.md, 05_adr/ADR-018-exit-strategy.md ほか 2 件 |
| G-118 | A | 段階1 | **充足** | R-109 | DL-69, DL-79 | — | 11_contracts/README.md, 11_contracts/schemas/ssf-caep-set.schema.json, 00_decision/03-decision-items.md, 04_architecture/claims-catalog.md ほか 15 件 |
| G-119 | A | 段階1 | **充足** | R-109 | DL-69, DL-84 | — | 11_contracts/README.md, research/standards-status.md, 05_adr/ADR-016-versioning-deprecation.md, 05_adr/ADR-022-integration-contract-standards.md ほか 4 件 |
| G-120 | A | 段階1 | **充足** | R-208 | DL-12, DL-72 | — | 05_adr/ADR-001-build-buy-identity-provider.md, 05_adr/ADR-002-assurance-levels-by-tier.md, 05_adr/ADR-003-account-recovery-authenticators.md, 05_adr/ADR-004-b2b-federation-linking-scim.md ほか 20 件 |
| G-121 | C | 段階1 | **要実測** | R-062, R-071 | DL-80 | — | 11_contracts/mock-contract-test-kit.md, 04_architecture/pep-contract.md, 04_architecture/revocation-continuous-evaluation.md, 05_adr/ADR-006-revocation-continuous-evaluation.md ほか 11 件 |
| G-122 | C | 段階1 | **要実測** | R-071, R-172 | DL-80 | — | 11_contracts/mock-contract-test-kit.md, 00_decision/03-decision-items.md, 04_architecture/pep-contract.md, 05_adr/ADR-012-pep-coverage-storage-guardrails.md ほか 4 件 |
| G-123 | C | 段階2 | **要実測** | R-205, R-206 | DL-22, DL-80, DL-82 | TC-119 | 11_contracts/mock-contract-test-kit.md, 12_poc/preregistered-test-plan.md, 00_decision/03-decision-items.md, 05_adr/ADR-011-policy-language-pep-pdp-api.md ほか 7 件 |
| G-124 | A | 段階1 | **充足** | R-140, R-179 | DL-66 | — | 10_integration/onboarding.md, 04_architecture/pep-contract.md, 05_adr/ADR-009-workload-identity-token-exchange.md, 05_adr/ADR-012-pep-coverage-storage-guardrails.md ほか 2 件 |
| G-125 | A | 段階1 | **充足** | R-058, R-059, R-164 | DL-67 | — | 10_integration/definition-of-ready.md, 04_architecture/audit-privacy.md, 04_architecture/pep-contract.md, 05_adr/ADR-012-pep-coverage-storage-guardrails.md ほか 2 件 |
| G-126 | B | 段階1 | **決裁案まで** | R-105, R-108, R-109, R-194 | DL-12, DL-70, DL-100 | — | 05_adr/ADR-002-assurance-levels-by-tier.md, 05_adr/ADR-003-account-recovery-authenticators.md, 05_adr/ADR-004-b2b-federation-linking-scim.md, 05_adr/ADR-015-crypto-agility-pqc.md ほか 11 件 |
| G-127 | A | 段階1 | **充足** | R-140 | DL-69 | — | 11_contracts/README.md |
| G-128 | A | 段階1 | **充足** | R-138 | DL-68 | — | 10_integration/developer-faq.md, 05_adr/ADR-012-pep-coverage-storage-guardrails.md, 05_adr/ADR-026-async-long-running-delegation.md, traceability/open-items.md |
| G-129 | B | 段階1 | **決裁案まで** | —（/goal 由来） | DL-66, DL-67 | — | 10_integration/definition-of-ready.md, 10_integration/onboarding.md, 00_decision/03-decision-items.md, 05_adr/ADR-012-pep-coverage-storage-guardrails.md ほか 2 件 |
| G-134 | B | 段階1 | **決裁案まで** | R-109 | DL-12, DL-39, DL-69, DL-80 | — | 00_decision/03-decision-items.md, 05_adr/ADR-002-assurance-levels-by-tier.md, 05_adr/ADR-003-account-recovery-authenticators.md, 05_adr/ADR-004-b2b-federation-linking-scim.md ほか 11 件 |
| G-130 | A | 段階1 | **充足** | R-202 | DL-110 | — | traceability/open-items.md |
| G-131 | A | 段階1 | **不合格（是正中）** | R-197, R-199 | DL-111 | — | traceability/consistency-checks.md |
| G-132 | A | 段階1 | **充足** | R-068, R-069 | DL-30 | — | 09_assurance/rfp-sow.md, traceability/open-items.md |
| G-133 | B | 段階1 | **決裁案まで** | —（/goal 由来） | DL-35, DL-112 | — | 01_governance/raci-governance.md, 03_threat-model/threat-catalog.md, traceability/citation-audit-proposal.md, traceability/open-items.md |
| G-135 | A | 段階1 | **充足** | R-058, R-206 | DL-63, DL-64, DL-113 | — | 10_integration/dependency-tiers.md, 10_integration/integration-patterns.md, 05_adr/ADR-012-pep-coverage-storage-guardrails.md, 05_adr/ADR-017-non-human-ai-agent-identity.md ほか 3 件 |
| G-136 | C | 段階2 | **要実測** | R-058, R-059, R-206 | DL-22, DL-57, DL-64, DL-81 | TC-024, TC-122 | 04_architecture/data-outside-pep.md, 10_integration/integration-patterns.md, 12_poc/preregistered-test-plan.md, 04_architecture/pep-contract.md ほか 7 件 |
| G-137 | A | 段階1 | **充足** | R-044, R-109 | DL-08, DL-49, DL-78 | — | 02_requirements/identity-lifecycle.md, 02_requirements/tenant-lifecycle.md, 11_contracts/ssf-caep.openapi.yaml, 00_decision/06-gate-plan-and-plan-b.md ほか 20 件 |
| G-138 | A | 段階1 | **充足** | R-109, R-206, R-208 | DL-16, DL-64, DL-69 | — | 04_architecture/token-profile.md, 10_integration/integration-patterns.md, 11_contracts/README.md, 05_adr/ADR-005-token-profile.md ほか 10 件 |
| G-139 | B | 段階2 | **決裁案まで** | R-010, R-024 | DL-18, DL-34, DL-64, DL-86 | — | 04_architecture/cell-blast-radius.md, 06_controls/applicability.md, 10_integration/integration-patterns.md, 05_adr/ADR-013-cell-partitioning-fail-mode.md ほか 4 件 |
| G-140 | A | 段階1 | **充足** | R-108, R-208 | DL-12, DL-62, DL-70 | — | 05_adr/ADR-002-assurance-levels-by-tier.md, 05_adr/ADR-003-account-recovery-authenticators.md, 05_adr/ADR-004-b2b-federation-linking-scim.md, 05_adr/ADR-012-pep-coverage-storage-guardrails.md ほか 18 件 |
| G-141 | C | 段階2 | **要実測** | R-062, R-071 | DL-22, DL-66, DL-80 | TC-025, TC-122 | 10_integration/onboarding.md, 11_contracts/mock-contract-test-kit.md, 12_poc/preregistered-test-plan.md, 04_architecture/workload-identity-delegation.md ほか 8 件 |
| G-142 | C | 段階2 | **要実測** | R-071, R-109, R-172 | DL-80, DL-82, DL-100 | TC-026 | 11_contracts/mock-contract-test-kit.md, 00_decision/03-decision-items.md, 00_decision/08-alternatives-comparison.md, 05_adr/ADR-012-pep-coverage-storage-guardrails.md ほか 7 件 |
| G-143 | A | 段階1 | **充足** | R-177, R-179 | DL-31, DL-41, DL-42, DL-62 | — | 00_decision/05-residual-risk-register.md, 00_decision/06-gate-plan-and-plan-b.md, 08_operations/phased-rollout.md, 10_integration/README.md ほか 7 件 |
| G-144 | C（B併用） | 段階2 | **要実測** | R-140 | DL-06, DL-20, DL-66 | TC-119 | 01_governance/kri.md, 07_slo/numeric-contracts.md, 10_integration/onboarding.md, 00_decision/04-program-charter.md ほか 10 件 |
| G-145 | C（B併用） | 段階2 | **要実測** | R-136〜R-138 | DL-27, DL-62, DL-68 | — | 08_operations/operating-model.md, 10_integration/README.md, 10_integration/developer-faq.md, 05_adr/ADR-022-integration-contract-standards.md ほか 2 件 |
| G-146 | C | 段階2 | **要実測** | R-205, R-206 | DL-22, DL-40, DL-81 | TC-119 | 00_decision/04-program-charter.md, 12_poc/preregistered-test-plan.md, 00_decision/03-decision-items.md, 00_decision/08-alternatives-comparison.md ほか 3 件 |
| G-147 | C（B併用） | 段階2 | **要実測** | R-190, R-205 | DL-20, DL-22, DL-65, DL-81 | TC-012, TC-013, TC-119, TC-131 | 07_slo/numeric-contracts.md, 10_integration/authz-modeling-guide.md, 12_poc/preregistered-test-plan.md, 05_adr/ADR-011-policy-language-pep-pdp-api.md ほか 2 件 |
| G-148 | A | 段階1 | **充足** | R-203, R-204 | DL-40, DL-54 | — | 00_decision/04-program-charter.md, 04_architecture/reference-architecture-v2.md, 05_adr/ADR-014-audit-data.md |
| G-149 | C | 段階2 | **要実測** | R-027, R-188 | DL-08, DL-09, DL-34 | TC-123, TC-124 | 02_requirements/identity-lifecycle.md, 02_requirements/operation-risk-tiers-assurance.md, 06_controls/applicability.md, 05_adr/ADR-002-assurance-levels-by-tier.md ほか 6 件 |
| G-150 | C | 段階2 | **要実測** | R-073, R-187 | DL-32, DL-61, DL-89 | TC-123, TC-124 | 09_assurance/continuous-assurance-plan.md, 09_assurance/self-assessments.md, 04_architecture/root-of-trust.md, 05_adr/ADR-016-versioning-deprecation.md ほか 3 件 |
| G-151 | A | 段階1 | **充足** | R-125, R-192, R-209 | DL-18, DL-45, DL-58 | — | 04_architecture/capacity-model.md, 04_architecture/cell-blast-radius.md, 00_decision/06-gate-plan-and-plan-b.md, 01_governance/durability-charter-20y.md ほか 8 件 |

### 4.4 個別 G 未接続の R と候補 G

候補 G は、R の対応 DL と G の対応成果物の重なりが大きい順に 3 件まで挙げたものである [D]。機械的な候補であり、確定は G 台帳の改訂（G-goal-criteria.md §4.5 の規則）で行う [D]。

| R-ID | 区分 | 要求（要約） | 対応 DL | 候補 G（DL の重なりが大きい順、未確定） |
|---|---|---|---|---|
| R-016 | B | 例外承認手順 | DL-05 | G-031, G-032 |
| R-214 | A | 保護対象→脅威主体→損失シナリオ→リスク許容度→制御要件→検 | DL-28, DL-104 | G-003, G-012, G-021 |
| R-216 | B | 退出基準（Gate ごとの合格・中止基準）を明文化し、充足判 | DL-42 | G-027, G-028, G-036 |
| R-260 | C | アカウント乗っ取りの主要経路のうちIdP再連携（既存アカウン | DL-08, DL-12, DL-22 | G-061, G-066, G-086 |
| R-077 | B | 操作リスク階層ごとの数値決裁 | DL-20 | G-024, G-057, G-060 |
| R-262 | A | 既定deny（不明ならdeny）を認可の安全側原則として維持 | DL-15, DL-19 | G-058, G-072, G-082 |
| R-151 | A | policy store分割（per-tenant stor | DL-12, DL-18 | G-020, G-042, G-048 |
| R-152 | C | quotaによるnoisy neighbor対策 | DL-18, DL-22 | G-009, G-048, G-054 |
| R-261 | C | 共有PDPの全体波及シナリオ（誤ったglobal deny/ | DL-18, DL-22 | G-009, G-048, G-054 |
| R-170 | C | PoC: ID・所属シナリオ群（2テナント、複数IdP、同一 | DL-22 | G-009, G-056, G-059 |
| R-215 | A | 脅威モデリングを反復可能な工程（対象の分解→脅威の特定・順位 | DL-10, DL-11 | G-004, G-003, G-078 |
| R-263 | A | 主張ごとに原典と参照箇所を記録し、作成者以外が「標準が要求す | DL-105 | G-018, G-019 |
| R-264 | B | 現提案を完成アーキテクチャとして扱わない（次回決裁で完成扱い | DL-37, DL-39 | G-025, G-002, G-026 |
| R-265 | A | 単一のglobal policy store/PDPへ全テナ | DL-12, DL-18 | G-020, G-042, G-048 |
| R-217 | B | 事業戦略を技術戦略へ変換し、本基盤の目的・範囲・非目標を事業 | DL-40 | G-041, G-052, G-146 |
| R-218 | B | CTOが引き受ける技術リスク（可用性、変更容易性、運用能力、 | DL-04, DL-41 | G-031, G-032, G-079 |
| R-219 | B | レジリエンスを売上継続・信頼・規制対応へ結び付けて評価する（ | DL-21 | G-024, G-044, G-045 |
| R-220 | C | 認可判断の正しさに加え、可用性・遅延・整合性・変更安全性を数 | DL-20, DL-22 | G-147, G-009, G-024 |
| R-221 | A | サイバーリスクを経営が理解できる損失シナリオ（損失額・停止時 | DL-02 | G-003, G-004, G-030 |
| R-222 | B | 統制・監視・対応・保証を継続的に成立させる体制と周期を定める | DL-27, DL-32 | G-047, G-071, G-076 |
| R-223 | B | 経営への報告にリスク許容度・脅威規模・緩和費用の3点を含める | DL-06, DL-37 | G-025, G-037, G-072 |
| R-224 | B | CISOの責務範囲（セキュリティアーキテクチャ、運用、ガバナ | DL-04 | G-031 |
| R-225 | A | 事故ゼロを約束・前提にせず、残余リスクの存在を前提に説明する | DL-37, DL-47 | G-025, G-037, G-065 |
| R-226 | B | サイバーリスクの最終所有者をCISO個人に帰属させない（経営 | DL-04 | G-031 |
| R-227 | B | 取締役会がリスク許容度を定め、経営が継続評価と透明な報告を伴 | DL-01, DL-04 | G-030, G-031, G-080 |
| R-228 | B | 原則1 経営リスクとして扱う: サイバーリスクを財務・評判等 | DL-01, DL-28 | G-012, G-030, G-080 |
| R-229 | A | 原則2 リスク許容度から制御を導く: 組織の文脈に即したリス | DL-02, DL-28 | G-003, G-004, G-012 |
| R-230 | A | 原則3 暗黙の信頼を置かない: ネットワーク位置・資産所有で | DL-54, DL-55 | G-015, G-042, G-102 |
| R-231 | C | 原則4 最小権限と職務分離を証明する: MFA・JIT・PB | DL-09, DL-12, DL-22 | G-060, G-066, G-092 |
| R-232 | C | 全IAM変更（権限・ロール・relation・設定の変更）を | DL-25, DL-77 | G-054, G-063, G-064 |
| R-233 | B | 原則5 Secure by DesignをSDLCへ埋め込む | DL-28, DL-61, DL-67 | G-012, G-090, G-125 |
| R-234 | D | 原則6 独立した保証を得る: 独立評価者による統制評価（CA | DL-07, DL-30 | G-007, G-033, G-034 |
| R-235 | C | 原則7 侵害を前提に検知・封じ込め・復旧する: インシデント | DL-24, DL-32 | G-059, G-071, G-076 |
| R-236 | A | 経営・統治: NIST CSF 2.0・ISO/IEC 27 | DL-28, DL-34 | G-011, G-012, G-030 |
| R-237 | A | デジタルID: NIST SP 800-63-4・63B-4 | DL-09, DL-28 | G-012, G-058, G-060 |
| R-238 | A | Zero Trust: NIST SP 800-207 を人 | DL-54, DL-56 | G-015, G-042, G-111 |
| R-239 | A | OAuth/OIDC: RFC 9700・RFC 9068・ | DL-16 | G-087, G-088, G-138 |
| R-240 | A | 高保証API: FAPI 2.0 Security Prof | DL-16, DL-51 | G-077, G-087, G-088 |
| R-241 | A | セキュア開発: NIST SSDF 1.1・OWASP AS | DL-28, DL-61 | G-012, G-090, G-150 |
| R-242 | C | API脅威: OWASP API Security Top  | DL-22, DL-80 | G-088, G-103, G-123 |
| R-243 | A | クラウド統制: CSA Security Guidance  | DL-28 | G-012 |
| R-244 | B | SaaS提供者・顧客の責任分界（共有責任）を明文化する | DL-26, DL-34 | G-096, G-011, G-030 |
| R-245 | A | 顧客向け設定可能なセキュリティ機能を CSA SSCF を基 | DL-26 | G-095, G-096, G-115 |
| R-246 | C | ソフトウェア供給網: SLSA 1.2 をビルド来歴・署名・ | DL-12, DL-61 | G-020, G-042, G-049 |
| R-247 | A | 監査・保証: SOC 2 Trust Services Cr | DL-28 | G-012 |
| R-248 | B | PCI DSS: 決済対象時の適用判定と、アカウント・MFA | DL-34 | G-011, G-030, G-054 |
| R-249 | A | 維持: 万能JWTの否定（JWTを権限DBにせず、主体・テナ | DL-16, DL-75 | G-087, G-088, G-138 |
| R-250 | A | 維持: テナント境界の多層化（tokenのtidに加え、re | DL-15, DL-17 | G-072, G-082, G-107 |
| R-251 | A | 維持: 宛先限定（サービス別aud、token exchan | DL-16, DL-55 | G-087, G-088, G-102 |
| R-252 | A | 維持: 細粒度認可（typed ReBACを中核に固定RBA | DL-17, DL-65 | G-107, G-108, G-109 |
| R-253 | A | 維持: 一貫性認識（権限剥奪、新旧ACL、transacti | DL-17 | G-107, G-108, G-109 |
| R-254 | A | 維持: PEP/PDP分離（判定と強制を分け、各サービスでb | DL-15 | G-072, G-082 |
| R-255 | A | 維持: 非人間IDの分離（ユーザーJWT流用ではなく、wor | DL-55 | G-102 |
| R-256 | A | 維持: 変更統制（schema-first、policy-a | DL-65, DL-70 | G-069, G-107, G-108 |
| R-257 | A | 維持: 監査の追跡項目（decision ID、policy | DL-25, DL-77 | G-054, G-063, G-064 |
| R-258 | A | 維持: 特権アクセスの分離（JIT、MFA、二者承認、理由、 | DL-12 | G-020, G-042, G-049 |
| R-259 | A | 維持: 宛先限定・短命化・DPoP/mTLSの方向。RFC  | DL-16 | G-087, G-088, G-138 |
| R-266 | B | 承認条件1: 経営承認済みのrisk appetite、対象 | DL-01, DL-39 | G-002, G-025, G-026 |
| R-267 | B | 承認条件2: IAL/AAL/FAL、認証器、account | DL-08, DL-09 | G-149, G-058, G-060 |
| R-268 | A | 承認条件3: AS/PAP/CI/CD/KMS/HSM/JW | DL-14, DL-24 | G-084, G-059, G-085 |
| R-269 | C | 承認条件4: 全entry pointのPEP covera | DL-10, DL-15 | G-082, G-004, G-072 |
| R-270 | B | 承認条件5: OAuth 2.0 Security BCP準 | DL-12, DL-16 | G-087, G-020, G-042 |
| R-271 | C | 承認条件6: authorization engine/st | DL-17, DL-20, DL-22 | G-108, G-147, G-009 |
| R-272 | A | 承認条件7: policy/model/schema/tok | DL-23 | G-068, G-069, G-075 |
| R-273 | D | 承認条件8: 独立設計レビュー、conformance、cr | DL-07, DL-110 | G-007, G-016, G-033 |
| R-274 | B | 承認条件9: 24時間365日の運用責任、SRE容量、on- | DL-27, DL-33, DL-43 | G-046, G-047, G-045 |
| R-275 | C | 承認条件10: 顧客通知、全session失効、鍵交換、PD | DL-24 | G-059, G-084, G-093 |
| R-211 | B | 次回提出物を「有望な参照アーキテクチャと論点集」から、20年 | DL-36, DL-39 | G-040, G-002, G-025 |
| R-212 | A | 参照アーキテクチャを実装仕様（連携契約・profile・スキ | DL-54, DL-69 | G-015, G-042, G-118 |
| R-213 | A | 保証証跡を要求単位で収集・追跡する仕組み（追跡表と是正追跡） | DL-104, DL-110 | G-003, G-016, G-021 |
| R-276 | B | 「この設計なら20年戦える」と署名しない。20年の約束を検証 | DL-47 | G-065, G-071, G-073 |
| R-277 | B | Phase 0を経営リスク定義からやり直し、Gate 0を起 | DL-42 | G-027, G-028, G-036 |
| R-278 | B | 供給者（サプライチェーン）リスクを統治の骨格に含め、本基盤の | DL-28, DL-33, DL-41 | G-012, G-032, G-045 |
| R-279 | C | ユーザー登録（利用者の初回登録）の手順と統制を定義し、PoC | DL-08, DL-22 | G-086, G-009, G-056 |
| R-280 | C | 製品比較の対象に、原文が挙げる候補（OpenFGA、Ceda | DL-13, DL-22 | G-117, G-009, G-056 |
| R-281 | A | 標準と法規制の変化（標準の改版・状態変更、法令の改正・施行） | DL-34, DL-84 | G-011, G-013, G-030 |
| R-282 | A | 非人間主体（service account、workload | DL-08, DL-12, DL-48 | G-061, G-020, G-042 |
| R-283 | C | 複数所属（1 主体が複数のテナントに同時に所属する場合）の扱 | DL-08, DL-16, DL-22 | G-086, G-088, G-009 |

## 5. R 正引き表（326 行）

- G 列は全件 G（G-010, G-022, G-029）を省いた個別 G である。全件 G だけに結び付く R は「全件 G のみ」と記した [D]。
- DL 列の × は抽出時点で未作成の DL である [D]。
- TC/RB/EX 列の「（枝番経由）」は、親 ID が枝番の試験を集めたものである [D]。「**未割当**」は区分 C で試験がない R、「—」は区分 A・B で試験を要しない R である [D]。
- E 列は R 台帳の証拠種別の転記である[^1]。証跡の所在は C ごとに §6.2 に置いた（C-ID から引く）[D]。証跡列は全件「未取得」である [D]。

| R-ID | 区分 | 要求（要約） | G | DL | C | TC/RB/EX | E（証跡種別） | 証跡 |
|---|---|---|---|---|---|---|---|---|
| R-001 | B | 保護対象（資産・データ・業務）の定義 | G-003 | DL-03 | C-002 | — | E2 | 未取得 |
| R-002 | A | 脅威主体の定義 | G-003, G-004, G-014, G-077 | DL-11, DL-51 | C-076 | — | E2 | 未取得 |
| R-003 | B | 重大損失シナリオの確定 | G-003, G-014, G-030 | DL-02 | C-002 | — | E2（上位はE1） | 未取得 |
| R-004 | B | データ分類の確定 | G-003, G-030 | DL-03 | C-002 | — | E2 | 未取得 |
| R-005 | B | リスク許容度の経営承認 | G-003, G-030 | DL-01 | C-001 | — | E1 | 未取得 |
| R-006 | B | KRI定義と四半期報告 | G-003, G-072 | DL-06 | C-006 | — | E2 | 未取得 |
| R-007 | B | 残余リスク受容者の指名 | G-003, G-031, G-032 | DL-04, DL-05, DL-41 | C-004 | — | E9 | 未取得 |
| R-008 | B | 最大許容損失 | G-044 | DL-01, DL-21 | C-001 | — | E1 | 未取得 |
| R-009 | B | 最大停止時間 | G-044 | DL-01, DL-21 | C-001 | — | E1 | 未取得 |
| R-010 | B | 規制・契約要件と対象法域 | G-011, G-030, G-139 | DL-34 | C-008 | — | E2（法務署名） | 未取得 |
| R-011 | B | テナント間漏えい許容ゼロの承認と測定可能な定義 | G-079, G-080, G-114 | DL-01 | C-001 | — | E1 | 未取得 |
| R-012 | B | 特権濫用リスクの許容方針 | G-062 | DL-01 | C-001, C-063, C-064 | — | E1 | 未取得 |
| R-013 | B | 顧客IdP侵害時の責任境界 | G-096 | DL-26, DL-34 | C-030 | — | E2（法務署名） | 未取得 |
| R-014 | B | 役割分担: CISO=リスク提示、CTO=実現性・費… | G-031 | DL-04 | C-003 | — | E1 | 未取得 |
| R-015 | B | RACI | G-031 | DL-04 | C-003 | — | E1 | 未取得 |
| R-016 | B | 例外承認手順 | 全件 G のみ | DL-05 | C-004 | — | E9 | 未取得 |
| R-017 | B | 停止権限 | G-031 | DL-46 | C-005 | — | E1 | 未取得 |
| R-018 | B | 独立保証計画 | G-033, G-039 | DL-07 | C-013 | — | E1 | 未取得 |
| R-019 | B | 責任と対になる決裁権・予算・人員・独立監査経路 | G-031 | DL-04 | C-003 | EX-05, EX-13 | E1 | 未取得 |
| R-020 | B | 故意・虚偽・重大な管理不履行と、合理的統制後の残余リ… | G-031 | DL-04 | C-003 | — | E1 | 未取得 |
| R-021 | B | セキュリティを劣後させる判断はCEO/取締役会が透明… | G-031 | DL-05 | C-003, C-004 | — | E9 | 未取得 |
| R-022 | B | 退出基準充足まで不可逆な標準化・強制移行・対外的安全… | G-025, G-027, G-041 | DL-39, DL-46 | C-005, C-012 | — | E1 | 未取得 |
| R-023 | A | 残余リスクの受容理由と検証可能性を記録 | G-003, G-032, G-079 | DL-11, DL-41 | C-004 | — | E2 | 未取得 |
| R-024 | B | 適用基準ごとの適用可能性判定（全部取るではない） | G-011, G-012, G-139 | DL-34 | C-008 | — | E2（法務署名） | 未取得 |
| R-025 | A | 全要求を単一統制台帳へ載せ証跡所有者を割当 | G-012, G-021 | DL-28 | C-009 | — | E3 | 未取得 |
| R-026 | A | FAPI 2.0/800-63-4/SSDF/ASV… | G-012 | DL-28 | C-009 | — | E3 | 未取得 |
| R-214 | A | 保護対象→脅威主体→損失シナリオ→リスク許容度→制御… | 全件 G のみ | DL-28, DL-104 | C-002, C-009 | — | E3 | 未取得 |
| R-216 | B | 退出基準（Gate ごとの合格・中止基準）を明文化し… | 全件 G のみ | DL-42 | C-012 | — | E1 | 未取得 |
| R-027 | B | ユースケース別IAL/AAL/FAL | G-060, G-149 | DL-09, DL-12 | C-019 | — | E2＋E9 | 未取得 |
| R-028 | A | 認証全イベント（登録〜削除）の状態機械 | G-086 | DL-08 | C-018 | — | E2 | 未取得 |
| R-029 | A | 主体8類型カタログ（ユーザー、人事ID、顧客管理者、… | G-101 | DL-48 | C-017 | — | E2 | 未取得 |
| R-030 | B | 操作ごとの保証要件割当（IAL/AAL/FAL、st… | G-060 | DL-09 | C-019 | — | E2＋E9 | 未取得 |
| R-031 | B | フィッシング耐性要求範囲（手入力OTPは耐性なし） | G-060 | DL-09, DL-12 | C-020 | — | E2＋E9 | 未取得 |
| R-032 | C | AAL2回復要件（異なる2回復要素/既存認証器組合せ… | G-061 | DL-08, DL-12, DL-22 | C-021 | TC-020, TC-113 | E4 | 未取得 |
| R-033 | A | 本人確認(identity proofing)手順 | G-086 | DL-08 | C-023 | — | E2 | 未取得 |
| R-034 | C | 招待 | G-086 | DL-08, DL-22 | C-018 | TC-018 | E4 | 未取得 |
| R-035 | C | 所属変更 | G-086 | DL-08, DL-22 | C-018 | TC-018 | E4 | 未取得 |
| R-036 | C | IdP発見・複数IdP | G-086 | DL-08, DL-12, DL-22 | C-024 | TC-019, TC-112 | E4 | 未取得 |
| R-037 | C | メール再利用とaccount linking | G-067, G-086 | DL-08, DL-12, DL-22 | C-024 | TC-019, TC-112 | E4 | 未取得 |
| R-038 | C | SAML署名鍵更新 | G-086 | DL-08, DL-12, DL-22 | C-025 | TC-112 | E4 | 未取得 |
| R-039 | C | IdP停止時の回復 | G-086 | DL-08, DL-22 | C-025 | TC-019, TC-105, TC-112 | E4 | 未取得 |
| R-040 | C | SCIM競合・遅延 | G-086 | DL-08, DL-22, DL-76 | C-026 | TC-019, TC-112 | E4 | 未取得 |
| R-041 | C | 認証器の紛失・変更 | G-061, G-086 | DL-08, DL-12, DL-22 | C-021 | TC-020, TC-113 | E4 | 未取得 |
| R-042 | D | support経由の回復（ソーシャルエンジニアリング… | G-061, G-062, G-092 | DL-08, DL-12, DL-30 | C-021, C-064 | DL-30/DL-07（第三者） | E6 | 未取得 |
| R-043 | B | passkey同期の扱い | G-061 | DL-08, DL-12 | C-022 | — | E2＋E9 | 未取得 |
| R-044 | C | 退職・削除 | G-086, G-137 | DL-08, DL-22 | C-018, C-026 | TC-018, TC-023 | E4 | 未取得 |
| R-045 | C | step-upの鮮度（auth_time/max_a… | G-086 | DL-08, DL-22 | C-028 | TC-020 | E4 | 未取得 |
| R-046 | D | FAL2 assertion injection対策… | G-089 | DL-16, DL-30, DL-60 | C-024 | DL-30/DL-07（第三者） | E6/E7 | 未取得 |
| R-047 | C | 「どのテナントのどのIdPがこの主体を保証したか」の… | G-067, G-086 | DL-08, DL-12 | C-024 | **未割当** | E4 | 未取得 |
| R-048 | A | federation・SCIM・session li… | G-086 | DL-08 | C-018 | — | E2 | 未取得 |
| R-260 | C | アカウント乗っ取りの主要経路のうちIdP再連携（既存… | 全件 G のみ | DL-08, DL-12, DL-22 | C-024 | TC-019 | E4 | 未取得 |
| R-049 | A | 鍵階層 | G-084 | DL-12, DL-14 | C-039 | — | E2 | 未取得 |
| R-050 | C | 鍵の生成・保管 | G-084 | DL-14, DL-22 | C-040 | TC-109 | E4 | 未取得 |
| R-051 | C | rotation | G-084 | DL-14, DL-22 | C-041 | TC-014, TC-109 | E4 | 未取得 |
| R-052 | C | 失効 | G-084 | DL-14, DL-22 | C-042 | TC-014, TC-109 | E4 | 未取得 |
| R-053 | C | 災害復旧 | G-084 | DL-14, DL-22 | C-043 | TC-109 | E8 | 未取得 |
| R-054 | C | 二者統制 | G-084, G-091 | DL-04, DL-12, DL-14, DL-22 | C-040, C-045 | TC-022, TC-109, TC-127 | E1＋E8 | 未取得 |
| R-055 | D | オフラインroot（ceremonyに第三者立会い） | G-085 | DL-14, DL-30 | C-040 | DL-30/DL-07（第三者） | E6＋E8 | 未取得 |
| R-056 | A | 対象範囲 AS/PAP/CI-CD/KMS/HSM/… | G-084, G-091 | DL-14 | C-039, C-045 | — | E2 | 未取得 |
| R-057 | C | 構成要素ごとの侵害runbook | G-084, G-093 | DL-24 | C-071 | RB-01, RB-02, RB-03, RB-04, RB-05, RB-06, RB-07, RB-08, RB-09, RB-10, RB-11, RB-12 | E8 | 未取得 |
| R-058 | C | 全entry point inventory（bat… | G-050, G-082, G-105, G-125, G-135, G-136 | DL-10, DL-50 | C-048 | TC-121（ラウンド 4 で割当） | E4 | 未取得 |
| R-059 | C | enforcement coverageの機械的検証 | G-082, G-099, G-125, G-136 | DL-15 | C-048 | TC-121（ラウンド 4 で割当） | E4 | 未取得 |
| R-060 | D | bypass test | G-083 | DL-15, DL-30, ×DL-59 | C-051 | DL-30/DL-07（第三者） | E6 | 未取得 |
| R-061 | C | DB/storage側tenant guardrai… | G-082, G-105 | DL-15, DL-57 | C-050 | TC-121（ラウンド 4 で割当） | E4 | 未取得 |
| R-062 | C | 上記のCI継続自動検証 | G-072, G-082, G-121, G-141 | DL-15, DL-80 | C-048, C-051 | TC-121（ラウンド 4 で割当） | E4 | 未取得 |
| R-063 | D | 外部アーキテクチャレビュー | G-007, G-034 | DL-07, DL-30 | C-013 | DL-30/DL-07（第三者） | E6 | 未取得 |
| R-064 | D | OAuth/OIDC/FAPI適合試験 | G-034, G-089 | DL-30, DL-60 | C-033 | DL-30/DL-07（第三者） | E7 | 未取得 |
| R-065 | D | 独立pentest（cross-tenant含む） | G-034, G-083 | DL-30, ×DL-59 | C-051 | DL-30/DL-07（第三者） | E6 | 未取得 |
| R-066 | D | red team | G-034 | DL-30, ×DL-59 | C-014 | DL-30/DL-07（第三者） | E6 | 未取得 |
| R-067 | B | 独立保証のgate化 | G-033 | DL-07, DL-42 | C-013 | — | E1 | 未取得 |
| R-068 | B | 評価者の報告系統を実装チームから分離 | G-033, G-132 | DL-07 | C-013 | — | E1 | 未取得 |
| R-069 | D | 評価範囲: 設計・コード・IaC・policy・鍵管… | G-091, G-132 | DL-30 | C-013 | DL-30/DL-07（第三者） | E6 | 未取得 |
| R-070 | D | ASVS 5.0ベース検証 | G-090 | DL-30, DL-61 | C-078 | DL-30/DL-07（第三者） | E6 | 未取得 |
| R-071 | D | API Top 10負例試験 | G-090, G-121, G-122, G-141, G-142 | DL-22, DL-30, DL-61 | C-051 | TC-003 | E4＋E6 | 未取得 |
| R-072 | D | クラウド設定レビュー | G-091 | DL-30 | C-079 | DL-30/DL-07（第三者） | E6 | 未取得 |
| R-073 | D | 供給網レビュー（SLSA 1.2: 来歴・署名・隔離… | G-090, G-091, G-150 | DL-30, DL-61 | C-046 | DL-30/DL-07（第三者） | E6 | 未取得 |
| R-074 | B | Critical/High未解決なら本番移行停止 | G-027, G-033 | DL-46 | C-005, C-015 | — | E1 | 未取得 |
| R-075 | B | 例外は期限・補完統制・影響範囲・責任者・失効条件付き… | G-032, G-033 | DL-05 | C-004 | — | E9 | 未取得 |
| R-076 | D | Critical/High closureの証跡 | G-034 | ×DL-59, DL-110 | C-015 | DL-30/DL-07（第三者） | E6＋E11 | 未取得 |
| R-077 | B | 操作リスク階層ごとの数値決裁 | 全件 G のみ | DL-20 | C-007 | — | E1 | 未取得 |
| R-078 | C | 負荷・障害・分断試験で証明 | G-009 | DL-22 | C-058, C-077 | TC-017, TC-101, TC-105, TC-106 | E5 | 未取得 |
| R-079 | A | 操作5分類（public/read-sensitiv… | G-058 | DL-09 | C-019 | — | E2 | 未取得 |
| R-080 | C | 分類ごとのキャッシュ最大齢 | G-058 | DL-19, DL-22 | C-058 | TC-008, TC-103 | E5 | 未取得 |
| R-081 | C | 分類ごとの必要整合性 | G-058 | DL-19, DL-22 | C-054 | TC-008, TC-103 | E5 | 未取得 |
| R-082 | C | 分類ごとのPDP不達時挙動 | G-058 | DL-19, DL-22 | C-058 | TC-010, TC-105 | E5 | 未取得 |
| R-083 | C | 分類ごとの監査不能時挙動 | G-058 | DL-19, DL-22 | C-058, C-066 | TC-011, TC-114 | E5 | 未取得 |
| R-084 | A | 分類ごとの代替経路 | G-058 | DL-19 | C-058 | — | E2 | 未取得 |
| R-085 | B | read/write/admin/緊急業務ごとの安全… | G-058 | DL-12, DL-19 | C-058 | — | E2＋E9 | 未取得 |
| R-086 | B | 高リスクはfresh decision必須、低リスク… | G-058 | DL-05, DL-19 | C-004, C-058 | — | E9 | 未取得 |
| R-087 | B | 一律値（5〜15分token、全fail-close… | G-024 | DL-19, DL-20 | C-007, C-035, C-058 | — | E1 | 未取得 |
| R-262 | A | 既定deny（不明ならdeny）を認可の安全側原則と… | 全件 G のみ | DL-15, DL-19 | C-049, C-058 | — | E2 | 未取得 |
| R-088 | A | build/buy/managed比較 | G-005, G-117 | DL-13, DL-44 | C-061 | — | E2 | 未取得 |
| R-089 | C | engine候補PoC | G-056, G-117 | DL-22 | C-061, C-077 | TC-013, TC-101, TC-102 | E5 | 未取得 |
| R-090 | A | 出口戦略 | G-070 | DL-12, DL-13 | C-061 | — | E2 | 未取得 |
| R-091 | C | データ移行可能性 | G-070 | DL-13, DL-22 | C-061 | TC-117 | E5 | 未取得 |
| R-092 | B | 必要要員 | G-047 | DL-27 | C-016 | — | E1 | 未取得 |
| R-093 | C | 選定評価軸13項目（整合性、最大深度、tail la… | G-056, G-074, G-117 | DL-13 | C-061 | **未割当** | E2＋E5 | 未取得 |
| R-094 | A | ADR: managed IdPか自営ASか（認証プ… | G-020, G-074 | DL-12 | C-061 | — | E2 | 未取得 |
| R-095 | A | ADR: opaque/JWT境界 | G-020, G-087 | DL-12 | C-035 | — | E2 | 未取得 |
| R-096 | A | ADR: FAPI 2.0必須API範囲 | G-020, G-087 | DL-12 | C-033 | — | E2 | 未取得 |
| R-097 | C | ADR: engine/store、整合性モデル、t… | G-020, G-117 | DL-12, DL-22 | C-054, C-061 | TC-102, TC-103, TC-106 | E2＋E5 | 未取得 |
| R-098 | A | ADR: policy language、schem… | G-020, G-109 | DL-12 | C-049 | — | E2 | 未取得 |
| R-099 | C | ADR: PDP topology、cell・fau… | G-020 | DL-12, DL-18 | C-057 | **未割当** | E2＋E5 | 未取得 |
| R-100 | A | ADR: workload identityとtok… | G-020, G-099, G-102 | DL-12 | C-036 | — | E2 | 未取得 |
| R-101 | A | ADR: 鍵管理・crypto agility・PQ… | G-020, G-068 | DL-12 | C-039, C-044 | — | E2 | 未取得 |
| R-102 | B | ADR: 監査データモデル・保持・所在地・顧客開示 | G-020, G-054 | DL-12, DL-25 | C-066, C-068, C-069 | — | E2 | 未取得 |
| R-103 | A | ADR: migration・dual-write・… | G-020 | DL-12 | C-061 | — | E2 | 未取得 |
| R-104 | C | crypto agility | G-065, G-068 | DL-12, DL-22, DL-23 | C-044 | TC-006, TC-015, TC-110 | E4 | 未取得 |
| R-105 | C | version negotiation | G-069, G-126 | DL-23, DL-70 | C-062 | **未割当** | E4 | 未取得 |
| R-106 | C | schema migration | G-069 | DL-12, DL-23 | C-062 | **未割当** | E4 | 未取得 |
| R-107 | C | dual-run | G-069 | DL-23, DL-31 | C-056 | **未割当** | E5 | 未取得 |
| R-108 | B | deprecation policy | G-069, G-126, G-140 | DL-23, DL-70 | C-062 | — | E2 | 未取得 |
| R-109 | C | policy/model/schema/token/… | G-069, G-118, G-119, G-126, G-134, G-137, G-138, G-142 | DL-12, DL-23 | C-062 | **未割当** | E4 | 未取得 |
| R-110 | A | 侵害対象別runbook（token/鍵/IdP/P… | G-093 | DL-12, DL-24 | C-071 | RB-01, RB-02, RB-03, RB-04, RB-05, RB-06, RB-07 | E2 | 未取得 |
| R-111 | C | kill switch | G-093 | DL-24 | C-071 | RB-03, RB-10, RB-11, EX-06 | E8 | 未取得 |
| R-112 | C | 全session失効 | G-059, G-093, G-111 | DL-24, DL-56 | C-055, C-072 | RB-02, EX-04, EX-05 | E8 | 未取得 |
| R-113 | C | 鍵切替 | G-093 | DL-24 | C-042 | RB-01, EX-01, EX-03 | E8 | 未取得 |
| R-114 | B | 顧客通知（判断基準と法定報告連動） | G-094 | DL-24, DL-34 | C-074 | — | E1 | 未取得 |
| R-115 | C | 証拠保全 | G-093 | DL-24 | C-073 | EX-13 | E8 | 未取得 |
| R-116 | C | PDP隔離 | G-093 | DL-24 | C-071 | RB-05, EX-10 | E8 | 未取得 |
| R-117 | C | 上記演習の合格 | G-093 | DL-24 | C-075 | EX-18 | E8 | 未取得 |
| R-118 | A | 監査ログの目的 | G-064 | DL-12, DL-25 | C-066 | — | E2 | 未取得 |
| R-119 | A | 最小化 | G-064 | DL-25, DL-77 | C-068 | — | E2 | 未取得 |
| R-120 | B | 保持期間 | G-054 | DL-25, DL-34 | C-068 | — | E2（法務署名） | 未取得 |
| R-121 | B | 保存地域 | G-054 | DL-25, DL-34 | C-069 | — | E2（法務署名） | 未取得 |
| R-122 | A | アクセス統制 | G-064 | DL-25 | C-068 | — | E2 | 未取得 |
| R-123 | C | WORM | G-063 | DL-25 | C-067 | **未割当** | E5 | 未取得 |
| R-124 | B | 削除 | G-054 | DL-25, DL-34 | C-065, C-068 | — | E2（法務署名） | 未取得 |
| R-125 | C | コスト | G-055, G-063, G-151 | DL-25, DL-58 | C-060 | **未割当** | E5 | 未取得 |
| R-126 | C | SIEM障害時挙動 | G-063 | DL-22, DL-25 | C-066 | TC-114 | E5 | 未取得 |
| R-127 | C | 記録率・欠損検知・backpressure・監査経路… | G-063 | DL-25, DL-77 | C-066 | **未割当** | E5 | 未取得 |
| R-128 | C | 監査をtrace samplingに依存させず独立経路 | G-063 | DL-25 | C-066 | **未割当** | E5 | 未取得 |
| R-129 | C | federation onboarding | G-095 | DL-12, DL-26 | C-024 | **未割当** | E4 | 未取得 |
| R-130 | C | offboarding | G-095 | DL-26 | C-026, C-065 | **未割当** | E4 | 未取得 |
| R-131 | C | domain verification | G-095 | DL-12, DL-26 | C-027 | **未割当** | E4 | 未取得 |
| R-132 | C | SCIM | G-095 | DL-26, DL-76 | C-026 | **未割当** | E4 | 未取得 |
| R-133 | C | delegated admin | G-095, G-115 | DL-26 | C-029 | **未割当** | E4 | 未取得 |
| R-134 | A | 顧客向け監査API | G-095 | DL-26 | C-029 | — | E2 | 未取得 |
| R-135 | A | 顧客管理者・SAML/OIDC設定を攻撃面として脅威… | G-078, G-095, G-115 | DL-11 | C-029, C-076 | — | E2 | 未取得 |
| R-136 | B | platform/domain/security/S… | G-047, G-145 | DL-27 | C-003 | — | E1 | 未取得 |
| R-137 | B | on-call | G-047, G-145 | DL-27 | C-016 | — | E1 | 未取得 |
| R-138 | B | 教育 | G-047, G-128, G-145 | DL-27, DL-68 | C-016 | — | E1 | 未取得 |
| R-139 | B | bus factor | G-047 | DL-27 | C-016 | — | E1 | 未取得 |
| R-140 | B | 変更承認 | G-047, G-053, G-116, G-124, G-127, G-144 | DL-27, DL-66 | C-045 | — | E1 | 未取得 |
| R-141 | B | 24/365運用責任・SRE容量・vendor su… | G-045〜G-047 | DL-27, DL-33 | C-010, C-016 | — | E1 | 未取得 |
| R-142 | A | 「Zanzibar相当」と主張せず採用engineの… | G-015, G-035 | DL-17 | C-011 | — | E2 | 未取得 |
| R-143 | C | 剥奪→拒否の最大時間（操作単位） | G-110, G-111 | DL-17, DL-22, DL-56 | C-054, C-055 | TC-008, TC-023, TC-103, TC-104 | E5 | 未取得 |
| R-144 | C | 変更直後読取のconsistency mode | G-110 | DL-12, DL-17, DL-22 | C-054 | TC-008, TC-103 | E5 | 未取得 |
| R-145 | C | コンテンツ更新とrelation更新の原子的結合 | G-110 | DL-17, DL-22 | C-054 | TC-009, TC-103 | E5 | 未取得 |
| R-146 | C | cache/replica由来stalenessの測定 | G-110 | DL-17, DL-22 | C-054 | TC-008, TC-103 | E5 | 未取得 |
| R-147 | C | model ID pin | G-112 | DL-17, DL-73 | C-056 | TC-012 | E4 | 未取得 |
| R-148 | C | 新旧モデルshadow check | G-112 | DL-17, DL-22 | C-056 | TC-012, TC-108 | E4 | 未取得 |
| R-149 | C | 段階展開 | G-112 | DL-17, DL-31 | C-056 | TC-108 | E5 | 未取得 |
| R-150 | C | tenant/domain単位の障害封じ込め | G-042, G-048, G-075 | DL-18, DL-22 | C-057 | TC-106, TC-116 | E5 | 未取得 |
| R-151 | A | policy store分割（per-tenant … | 全件 G のみ | DL-12, DL-18 | C-057 | — | E2 | 未取得 |
| R-152 | C | quotaによるnoisy neighbor対策 | 全件 G のみ | DL-18, DL-22 | C-057 | TC-107 | E5 | 未取得 |
| R-153 | A | cell architecture | G-042 | DL-12, DL-18 | C-057 | — | E2 | 未取得 |
| R-154 | C | 段階rollout | G-112 | DL-18, DL-31 | C-056 | TC-108 | E5 | 未取得 |
| R-155 | C | 緊急freeze | G-112 | DL-18, DL-46 | C-005 | TC-010, TC-108 | E4 | 未取得 |
| R-156 | C | 既知良好版への即時復帰 | G-112 | DL-18, DL-22 | C-056 | TC-012, TC-108 | E5 | 未取得 |
| R-157 | D | global store/PDP集約時はblast … | G-048 | DL-18, DL-30 | C-057 | DL-30/DL-07（第三者） | E5＋E6 | 未取得 |
| R-158 | C | RFC 9700を明示準拠基準化（implicit廃… | G-087 | DL-12, DL-16 | C-032 | **未割当** | E4 | 未取得 |
| R-159 | A | OAuth Security BCP準拠profil… | G-087 | DL-16 | C-032 | — | E2 | 未取得 |
| R-160 | B | 高価値APIへのFAPI 2.0採否 | G-087 | DL-12, DL-16 | C-033 | — | E2 | 未取得 |
| R-161 | C | JWT厳格検証（alg allowlist、typ、… | G-088 | DL-16, DL-75 | C-034 | **未割当** | E4 | 未取得 |
| R-162 | C | 種類の異なるJWT間で相互排他的検証規則 | G-088 | DL-16, DL-75 | C-034 | **未割当** | E4 | 未取得 |
| R-163 | C | DPoPの限界明記とBFF・CSP・短命化・鍵保護の… | G-088, G-099 | DL-16 | C-035 | **未割当** | E4 | 未取得 |
| R-261 | C | 共有PDPの全体波及シナリオ（誤ったglobal d… | 全件 G のみ | DL-18, DL-22 | C-057 | TC-010, TC-106, TC-108 | E5 | 未取得 |
| R-164 | A | DFD（全entry point、trust bou… | G-082, G-125 | DL-10 | C-048, C-076 | — | E2 | 未取得 |
| R-165 | A | ASVSで受入基準化（アーキ・認証・session・… | G-012 | DL-28, DL-61 | C-009, C-078 | — | E3 | 未取得 |
| R-166 | A | 攻撃者12類型（外部攻撃者、悪意あるテナント管理者、… | G-014, G-077 | DL-51 | C-076 | — | E2 | 未取得 |
| R-167 | A | 各脅威に予防・検知・封じ込め・復旧・証拠を記載 | G-004, G-078 | DL-11 | C-076 | — | E2 | 未取得 |
| R-168 | C | 具体脅威10（フィッシング耐性、recovery b… | G-078, G-081 | DL-11, DL-22 | C-020, C-021, C-024, C-031, C-076 | TC-002, TC-003, TC-005, TC-007, TC-008, TC-012, TC-014, TC-018, TC-020, TC-022, TC-103, TC-104, TC-106, TC-108, TC-109, TC-112, TC-113, TC-115, TC-116, TC-118, TC-121, TC-127 | E4 | 未取得 |
| R-169 | C | PoCはhappy pathでなく攻撃・障害主目的 | G-009 | DL-22 | C-077 | TC-001 | E4/E5 | 未取得 |
| R-170 | C | PoC: ID・所属シナリオ群（2テナント、複数Id… | 全件 G のみ | DL-22 | C-018, C-077 | TC-018, TC-019, TC-020 | E4 | 未取得 |
| R-171 | C | PoC: 認可graph（folder移動・外部共有… | G-108 | DL-22 | C-052, C-053, C-077 | TC-008, TC-021 | E4 | 未取得 |
| R-172 | C | PoC: cross-tenant property… | G-103, G-114, G-122, G-142 | DL-22, DL-80 | C-051 | TC-002 | E4 | 未取得 |
| R-173 | C | PoC: token誤用（API A用tokenのA… | G-081, G-088 | DL-22 | C-032, C-034, C-077 | TC-004, TC-005, TC-006, TC-007, TC-125 | E4 | 未取得 |
| R-174 | C | PoC: 障害注入（PDP timeout、全断、片… | G-059 | DL-22 | C-058, C-077 | TC-010, TC-014, TC-105, TC-106, TC-109, TC-126 | E5 | 未取得 |
| R-175 | C | PoC: differential test・sha… | G-112 | DL-22 | C-056 | TC-012, TC-108 | E4 | 未取得 |
| R-176 | C | PoC: 特権操作・監査改ざん・監査基盤停止 | G-062, G-092 | DL-22, DL-52 | C-063, C-067 | TC-011, TC-016, TC-022, TC-114, TC-115 | E4 | 未取得 |
| R-177 | C | 新旧認可のdual-runと差分記録 | G-050, G-051, G-143 | DL-12, DL-31 | C-056 | **未割当** | E5 | 未取得 |
| R-178 | C | 新基盤allowが広い差分は即時調査、deny差分は… | G-051 | DL-31 | C-056 | **未割当** | E5 | 未取得 |
| R-179 | B | 導入順序（read-only→低リスクtenant→… | G-051, G-124, G-143 | DL-31 | C-056 | — | E2 | 未取得 |
| R-180 | C | 各段階の自動rollback条件 | G-051 | DL-31 | C-056 | **未割当** | E5 | 未取得 |
| R-181 | B | 四半期KRI | G-071, G-076 | DL-06, DL-32 | C-006 | — | E2 | 未取得 |
| R-182 | D | 年次独立評価 | G-071, G-076 | DL-30, DL-32 | C-014 | DL-30/DL-07（第三者） | E6 | 未取得 |
| R-183 | D | 定期red team | G-076 | DL-30, DL-32 | C-014 | DL-30/DL-07（第三者） | E6 | 未取得 |
| R-184 | C | 鍵・IdP・PDP侵害演習 | G-076 | DL-24, DL-32 | C-075 | EX-01, EX-02, EX-03, EX-06, EX-07, EX-09, EX-10 | E8 | 未取得 |
| R-185 | C | schema migration演習 | G-076 | DL-24, DL-32 | C-062, C-075 | EX-M1, EX-V1, EX-V2, EX-V3 | E8 | 未取得 |
| R-186 | C | vendor exit演習 | G-070, G-076 | DL-24, DL-32 | C-061, C-075 | EX-M1, EX-V1, EX-V2, EX-V3 | E8 | 未取得 |
| R-187 | C | 脆弱性根本原因の将来開発への反映（SSDF RV.3） | G-076, G-097, G-150 | DL-32, DL-110 | C-015, C-078 | **未割当** | E11 | 未取得 |
| R-215 | A | 脅威モデリングを反復可能な工程（対象の分解→脅威の特… | 全件 G のみ | DL-10, DL-11 | C-076 | — | E2 | 未取得 |
| R-188 | C | 数値契約: 認証（指標は R-188.1〜R-188… | G-060, G-149 | DL-20, DL-21 | C-007, C-060 | TC-017, TC-101, TC-111, TC-131（枝番経由） | E1＋E5 | 未取得 |
| R-188.1 | C | 認証: login成功率 | G-060, G-149（親） | DL-20, DL-22 | C-060 | TC-131 | E5 | 未取得 |
| R-188.2 | C | 認証: login 遅延 p95/p99 | G-060, G-149（親） | DL-20, DL-22 | C-060 | TC-017, TC-101 | E5 | 未取得 |
| R-188.3 | C | 認証: IdP障害時挙動（挙動の定義と復帰・縮退の数… | G-060, G-149（親） | DL-19, DL-20 | C-025, C-058 | TC-111 | E5 | 未取得 |
| R-188.4 | B | 認証: session最大時間 | G-060, G-149（親） | DL-09, DL-20 | C-007, C-019 | — | E1 | 未取得 |
| R-188.5 | B | 認証: 再認証間隔 | G-060, G-149（親） | DL-09, DL-20 | C-007, C-019 | — | E1 | 未取得 |
| R-188.6 | C | 認証: 回復完了SLO | G-060, G-149（親） | DL-08, DL-20 | C-021 | **未割当** | E5 | 未取得 |
| R-188.7 | C | 認証: 不正回復検知時間 | G-060, G-149（親） | DL-20, DL-52 | C-021 | **未割当** | E5 | 未取得 |
| R-189 | C | 数値契約: token（指標は R-189.1〜R-… | G-106 | DL-16, DL-20 | C-007, C-035 | TC-014, TC-106, TC-109, RB-01, EX-01（枝番経由） | E1＋E5 | 未取得 |
| R-189.1 | C | token: access/refresh寿命（ac… | G-106（親） | DL-16, DL-20 | C-035 | **未割当** | E5 | 未取得 |
| R-189.2 | C | token: clock skew | G-106（親） | DL-16, DL-20 | C-035 | **未割当** | E4 | 未取得 |
| R-189.3 | B | token: 鍵rotation周期 | G-106（親） | DL-14, DL-20 | C-041 | — | E1 | 未取得 |
| R-189.4 | C | token: 旧鍵併存時間 | G-106（親） | DL-14, DL-20 | C-041 | TC-014, TC-109 | E5 | 未取得 |
| R-189.5 | C | token: 緊急失効完了時間 | G-106（親） | DL-20, DL-24 | C-042 | TC-014, TC-109, RB-01, EX-01 | E8 | 未取得 |
| R-189.6 | C | token: JWKS cache最大齢 | G-106（親） | DL-16, DL-20 | C-041 | TC-014, TC-106 | E5 | 未取得 |
| R-190 | C | 数値契約: 認可（指標は R-190.1〜R-190… | G-055, G-106, G-113, G-147 | DL-20, DL-58 | C-007, C-060 | TC-010, TC-017, TC-101, TC-102, TC-105, TC-106, TC-107（枝番経由） | E1＋E5 | 未取得 |
| R-190.1 | C | 認可: Check p95/p99/p99.9 | G-055, G-106, G-113, G-147（親） | DL-20, DL-22 | C-060 | TC-010, TC-017, TC-101, TC-102, TC-105, TC-107 | E5 | 未取得 |
| R-190.2 | C | 認可: availability | G-055, G-106, G-113, G-147（親） | DL-20, DL-22 | C-060 | TC-010, TC-101, TC-105, TC-106 | E5 | 未取得 |
| R-190.3 | C | 認可: 最大graph depth/fanout | G-055, G-106, G-113, G-147（親） | DL-20, DL-58 | C-060 | TC-017, TC-101 | E5 | 未取得 |
| R-190.4 | C | 認可: query budget | G-055, G-106, G-113, G-147（親） | DL-20, DL-58 | C-060 | TC-010, TC-017, TC-101, TC-105, TC-107 | E5 | 未取得 |
| R-190.5 | C | 認可: 誤allow許容値 | G-055, G-106, G-113, G-147（親） | DL-01, DL-20 | C-001 | **未割当** | E5 | 未取得 |
| R-190.6 | C | 認可: 誤deny予算 | G-055, G-106, G-113, G-147（親） | DL-20, DL-21 | C-060 | **未割当** | E5 | 未取得 |
| R-191 | C | 数値契約: 剥奪（指標は R-191.1〜R-191… | G-111 | DL-20, DL-56 | C-007, C-054 | TC-008, TC-028, TC-103, TC-104, TC-105（枝番経由） | E1＋E5 | 未取得 |
| R-191.1 | C | 剥奪: 通常・高権限・tenant停止ごとの最大反映… | G-111（親） | DL-20, DL-56 | C-054, C-055 | TC-008, TC-103, TC-105 | E5 | 未取得 |
| R-191.2 | C | 剥奪: stale allowの最大継続 | G-111（親） | DL-20, DL-56 | C-054 | **未割当** | E5 | 未取得 |
| R-191.3 | C | 剥奪: cache invalidation成功率 | G-111（親） | DL-17, DL-20 | C-054 | TC-008, TC-028, TC-104 | E5 | 未取得 |
| R-192 | C | 数値契約: 可用性（指標は R-192.1〜R-19… | G-055, G-057, G-151 | DL-20, DL-21 | C-007, C-060 | TC-010, TC-105, TC-106, TC-114（枝番経由） | E1＋E5 | 未取得 |
| R-192.1 | C | 可用性: control/decision plan… | G-055, G-057, G-151（親） | DL-18, DL-20 | C-060 | TC-010, TC-105, TC-106 | E5 | 未取得 |
| R-192.2 | C | 可用性: RTO | G-055, G-057, G-151（親） | DL-20, DL-21 | C-060 | TC-106 | E8 | 未取得 |
| R-192.3 | C | 可用性: RPO | G-055, G-057, G-151（親） | DL-20, DL-21 | C-060 | TC-114 | E8 | 未取得 |
| R-192.4 | C | 可用性: リージョン切替時間 | G-055, G-057, G-151（親） | DL-20, DL-22 | C-060 | TC-106 | E5 | 未取得 |
| R-192.5 | C | 可用性: dependency budget | G-055, G-057, G-151（親） | DL-20, DL-63 | C-059 | TC-105 | E5 | 未取得 |
| R-193 | C | 数値契約: 監査（指標は R-193.1〜R-193… | G-063 | DL-20, DL-25 | C-007, C-066 | TC-001, TC-104, TC-114（枝番経由） | E1＋E5 | 未取得 |
| R-193.1 | C | 監査: 重要decision記録率 | G-063（親） | DL-20, DL-25 | C-066 | TC-104, TC-114 | E5 | 未取得 |
| R-193.2 | C | 監査: 欠損検知時間 | G-063（親） | DL-20, DL-25 | C-066 | TC-114 | E5 | 未取得 |
| R-193.3 | C | 監査: WORM転送遅延 | G-063（親） | DL-20, DL-25 | C-067 | TC-114 | E5 | 未取得 |
| R-193.4 | B | 監査: 保持期間 | G-063（親） | DL-20, DL-25, DL-34 | C-068 | — | E2（法務署名） | 未取得 |
| R-193.5 | C | 監査: 検索SLO | G-063（親） | DL-20, DL-25 | C-068 | TC-114 | E5 | 未取得 |
| R-193.6 | C | 監査: 時刻同期精度 | G-063（親） | DL-20, DL-25 | C-068 | TC-001, TC-114 | E5 | 未取得 |
| R-194 | C | 数値契約: 変更（指標は R-194.1〜R-194… | G-126 | DL-20, DL-31 | C-007, C-062 | TC-012, TC-106, TC-108（枝番経由） | E1＋E5 | 未取得 |
| R-194.1 | B | 変更: policy/model canary期間 | G-126（親） | DL-20, DL-31 | C-007, C-056 | TC-106, TC-108 | E1 | 未取得 |
| R-194.2 | B | 変更: diff許容条件 | G-126（親） | DL-20, DL-31 | C-007, C-056 | TC-012, TC-108 | E1 | 未取得 |
| R-194.3 | C | 変更: rollback時間 | G-126（親） | DL-20, DL-22 | C-056 | TC-012, TC-108 | E5 | 未取得 |
| R-194.4 | B | 変更: schema互換期間 | G-126（親） | DL-20, DL-70 | C-062 | — | E2 | 未取得 |
| R-194.5 | C | 変更: 未移行consumer数 | G-126（親） | DL-20, DL-70 | C-062 | **未割当** | E4 | 未取得 |
| R-195 | C | 数値契約: インシデント（指標は R-195.1〜R… | G-093 | DL-20, DL-24 | C-007, C-075 | TC-014, TC-109, TC-111, TC-126, EX-01, EX-02, EX-04, EX-06, EX-08（枝番経由） | E1＋E8 | 未取得 |
| R-195.1 | C | インシデント: MTTD | G-093（親） | DL-20, DL-24 | C-075 | EX-02 | E8 | 未取得 |
| R-195.2 | C | インシデント: 封じ込め時間 | G-093（親） | DL-20, DL-24 | C-075 | TC-126, EX-06 | E8 | 未取得 |
| R-195.3 | C | インシデント: 全session失効時間 | G-093（親） | DL-20, DL-24 | C-072 | TC-111, EX-04 | E8 | 未取得 |
| R-195.4 | C | インシデント: 鍵差替え時間 | G-093（親） | DL-20, DL-24 | C-042 | TC-014, TC-109, EX-01 | E8 | 未取得 |
| R-195.5 | C | インシデント: 顧客通知判断時間 | G-093（親） | DL-20, DL-24 | C-074 | TC-126, EX-08 | E8 | 未取得 |
| R-196 | B | 数値はBIAと実測で決め任意値を置かない、空欄の本番… | G-024, G-044, G-057 | DL-20, DL-21 | C-007 | — | E1 | 未取得 |
| R-197 | A | 引用番号と主張の不一致を全件是正 | G-001, G-018, G-019, G-023, G-131 | DL-29 | C-011 | — | E3 | 未取得 |
| R-198 | A | Q&A等二次情報を一次仕様へ差替 | G-001, G-013, G-016, G-018, G-023 | DL-29, DL-105 | C-011 | — | E3 | 未取得 |
| R-199 | A | 主張を6区分（規範RFC、NIST/ISO、ベンダー… | G-001, G-016, G-017, G-019, G-131 | DL-105 | C-011 | — | E3 | 未取得 |
| R-200 | A | 「非常に高い」自己評価削除、「高セキュリティを目標と… | G-008, G-015, G-035 | DL-37, DL-54 | C-011 | — | E2 | 未取得 |
| R-201 | A | 評価は実装証拠・適合性・攻撃試験・運用実績・SLO・… | G-006〜G-008, G-035, G-038 | DL-105, DL-109 | C-011 | — | E3 | 未取得 |
| R-263 | A | 主張ごとに原典と参照箇所を記録し、作成者以外が「標準… | 全件 G のみ | DL-105 | C-011 | — | E3 | 未取得 |
| R-202 | B | 決裁依頼をPhase 0〜高保証PoCの条件付き承認… | G-002, G-025〜G-028, G-036〜G-038, G-040, G-130 | DL-36, DL-39 | C-012 | — | E1 | 未取得 |
| R-203 | B | 認証器・password・回復・AS全面自作は原則し… | G-074, G-148 | DL-12 | C-061 | — | E2 | 未取得 |
| R-204 | B | 認可domain modelとPEP統合は自社開発候… | G-148 | DL-12 | C-049, C-061 | — | E2 | 未取得 |
| R-205 | C | typed ReBAC＋限定ABAC＋resourc… | G-056, G-066, G-103, G-107, G-108, G-123, G-146, G-147 | DL-17, DL-22 | C-049 | TC-002, TC-013, TC-016, TC-021, TC-027, TC-028, TC-101, TC-102, TC-121, TC-128, TC-129 | E5 | 未取得 |
| R-206 | C | service別aud・token exchange… | G-098〜G-100, G-102, G-103, G-123, G-135, G-136, G-138, G-146 | DL-22, DL-55 | C-036 | TC-004, TC-028, TC-120, TC-125 | E5 | 未取得 |
| R-264 | B | 現提案を完成アーキテクチャとして扱わない（次回決裁で… | 全件 G のみ | DL-37, DL-39 | C-012 | — | E1 | 未取得 |
| R-265 | A | 単一のglobal policy store/PDP… | 全件 G のみ | DL-12, DL-18 | C-057 | — | E2 | 未取得 |
| R-207 | C | 被害を1テナント/1サービス/1期間に封じ込められる… | G-042, G-048, G-049, G-104 | DL-18, DL-63 | C-057, C-059 | **未割当** | E5 | 未取得 |
| R-208 | A | 特定製品・クラウド・少数専門家・独自言語への過度依存… | G-005, G-065, G-066, G-120, G-138, G-140 | DL-13, DL-47 | C-010, C-047, C-061 | — | E2 | 未取得 |
| R-209 | A | 組織再編・M&A・データ所在地規制・非人間ID増加・… | G-065, G-067, G-073, G-075, G-151 | DL-23, DL-47 | C-044, C-047 | — | E2 | 未取得 |
| R-210 | C | 安全な縮退・復旧・rollback・証拠保全 | G-049, G-104 | DL-19, DL-24 | C-058, C-071, C-073 | RB-05, RB-06, EX-11, EX-18 | E8 | 未取得 |
| R-217 | B | 事業戦略を技術戦略へ変換し、本基盤の目的・範囲・非目… | 全件 G のみ | DL-40 | C-012 | — | E1 | 未取得 |
| R-218 | B | CTOが引き受ける技術リスク（可用性、変更容易性、運… | 全件 G のみ | DL-04, DL-41 | C-004, C-010 | — | E9 | 未取得 |
| R-219 | B | レジリエンスを売上継続・信頼・規制対応へ結び付けて評… | 全件 G のみ | DL-21 | C-007 | — | E2（事業責任者署名） | 未取得 |
| R-220 | C | 認可判断の正しさに加え、可用性・遅延・整合性・変更安… | 全件 G のみ | DL-20, DL-22 | C-007, C-060 | TC-101, TC-103, TC-105, TC-108 | E5 | 未取得 |
| R-221 | A | サイバーリスクを経営が理解できる損失シナリオ（損失額… | 全件 G のみ | DL-02 | C-002 | — | E2 | 未取得 |
| R-222 | B | 統制・監視・対応・保証を継続的に成立させる体制と周期… | 全件 G のみ | DL-27, DL-32 | C-014, C-016 | — | E1 | 未取得 |
| R-223 | B | 経営への報告にリスク許容度・脅威規模・緩和費用の3点… | 全件 G のみ | DL-06, DL-37 | C-006 | — | E2 | 未取得 |
| R-224 | B | CISOの責務範囲（セキュリティアーキテクチャ、運用… | 全件 G のみ | DL-04 | C-003 | — | E1 | 未取得 |
| R-225 | A | 事故ゼロを約束・前提にせず、残余リスクの存在を前提に… | 全件 G のみ | DL-37, DL-47 | C-004, C-011 | — | E2 | 未取得 |
| R-226 | B | サイバーリスクの最終所有者をCISO個人に帰属させな… | 全件 G のみ | DL-04 | C-003 | — | E1 | 未取得 |
| R-227 | B | 取締役会がリスク許容度を定め、経営が継続評価と透明な… | 全件 G のみ | DL-01, DL-04 | C-001 | — | E1 | 未取得 |
| R-228 | B | 原則1 経営リスクとして扱う: サイバーリスクを財務… | 全件 G のみ | DL-01, DL-28 | C-001, C-006 | — | E1 | 未取得 |
| R-229 | A | 原則2 リスク許容度から制御を導く: 組織の文脈に即… | 全件 G のみ | DL-02, DL-28 | C-002, C-009 | — | E3 | 未取得 |
| R-230 | A | 原則3 暗黙の信頼を置かない: ネットワーク位置・資… | 全件 G のみ | DL-54, DL-55 | C-036, C-049 | — | E2 | 未取得 |
| R-231 | C | 原則4 最小権限と職務分離を証明する: MFA・JI… | 全件 G のみ | DL-09, DL-12, DL-22 | C-020, C-038, C-063 | TC-022, TC-115, TC-127 | E4 | 未取得 |
| R-232 | C | 全IAM変更（権限・ロール・relation・設定の… | 全件 G のみ | DL-25, DL-77 | C-038, C-070 | **未割当** | E4 | 未取得 |
| R-233 | B | 原則5 Secure by DesignをSDLCへ… | 全件 G のみ | DL-28, DL-61, DL-67 | C-046, C-078 | — | E2 | 未取得 |
| R-234 | D | 原則6 独立した保証を得る: 独立評価者による統制評… | 全件 G のみ | DL-07, DL-30 | C-013 | DL-30/DL-07（第三者） | E6 | 未取得 |
| R-235 | C | 原則7 侵害を前提に検知・封じ込め・復旧する: イン… | 全件 G のみ | DL-24, DL-32 | C-031, C-071 | **未割当** | E8 | 未取得 |
| R-236 | A | 経営・統治: NIST CSF 2.0・ISO/IE… | 全件 G のみ | DL-28, DL-34 | C-008, C-009 | — | E3 | 未取得 |
| R-237 | A | デジタルID: NIST SP 800-63-4・6… | 全件 G のみ | DL-09, DL-28 | C-009, C-019 | — | E3 | 未取得 |
| R-238 | A | Zero Trust: NIST SP 800-20… | 全件 G のみ | DL-54, DL-56 | C-055 | — | E2 | 未取得 |
| R-239 | A | OAuth/OIDC: RFC 9700・RFC 9… | 全件 G のみ | DL-16 | C-032 | — | E2 | 未取得 |
| R-240 | A | 高保証API: FAPI 2.0 Security … | 全件 G のみ | DL-16, DL-51 | C-033 | — | E2 | 未取得 |
| R-241 | A | セキュア開発: NIST SSDF 1.1・OWAS… | 全件 G のみ | DL-28, DL-61 | C-009, C-078 | — | E3 | 未取得 |
| R-242 | C | API脅威: OWASP API Security … | 全件 G のみ | DL-22, DL-80 | C-051, C-052 | TC-003 | E4 | 未取得 |
| R-243 | A | クラウド統制: CSA Security Guida… | 全件 G のみ | DL-28 | C-009, C-079 | — | E3 | 未取得 |
| R-244 | B | SaaS提供者・顧客の責任分界（共有責任）を明文化する | 全件 G のみ | DL-26, DL-34 | C-030 | — | E2（法務署名） | 未取得 |
| R-245 | A | 顧客向け設定可能なセキュリティ機能を CSA SSC… | 全件 G のみ | DL-26 | C-029 | — | E2 | 未取得 |
| R-246 | C | ソフトウェア供給網: SLSA 1.2 をビルド来歴… | 全件 G のみ | DL-12, DL-61 | C-046 | **未割当** | E10 | 未取得 |
| R-247 | A | 監査・保証: SOC 2 Trust Service… | 全件 G のみ | DL-28 | C-009 | — | E3 | 未取得 |
| R-248 | B | PCI DSS: 決済対象時の適用判定と、アカウント… | 全件 G のみ | DL-34 | C-008 | — | E2（法務署名） | 未取得 |
| R-249 | A | 維持: 万能JWTの否定（JWTを権限DBにせず、主… | 全件 G のみ | DL-16, DL-75 | C-034 | — | E2 | 未取得 |
| R-250 | A | 維持: テナント境界の多層化（tokenのtidに加… | 全件 G のみ | DL-15, DL-17 | C-050, C-053 | — | E2 | 未取得 |
| R-251 | A | 維持: 宛先限定（サービス別aud、token ex… | 全件 G のみ | DL-16, DL-55 | C-036, C-037 | — | E2 | 未取得 |
| R-252 | A | 維持: 細粒度認可（typed ReBACを中核に固… | 全件 G のみ | DL-17, DL-65 | C-049 | — | E2 | 未取得 |
| R-253 | A | 維持: 一貫性認識（権限剥奪、新旧ACL、trans… | 全件 G のみ | DL-17 | C-054 | — | E2 | 未取得 |
| R-254 | A | 維持: PEP/PDP分離（判定と強制を分け、各サー… | 全件 G のみ | DL-15 | C-049 | — | E2 | 未取得 |
| R-255 | A | 維持: 非人間IDの分離（ユーザーJWT流用ではなく… | 全件 G のみ | DL-55 | C-017, C-036 | — | E2 | 未取得 |
| R-256 | A | 維持: 変更統制（schema-first、poli… | 全件 G のみ | DL-65, DL-70 | C-045, C-056 | — | E2 | 未取得 |
| R-257 | A | 維持: 監査の追跡項目（decision ID、po… | 全件 G のみ | DL-25, DL-77 | C-070 | — | E2 | 未取得 |
| R-258 | A | 維持: 特権アクセスの分離（JIT、MFA、二者承認… | 全件 G のみ | DL-12 | C-063, C-064 | — | E2 | 未取得 |
| R-259 | A | 維持: 宛先限定・短命化・DPoP/mTLSの方向。… | 全件 G のみ | DL-16 | C-032 | — | E2 | 未取得 |
| R-266 | B | 承認条件1: 経営承認済みのrisk appetit… | 全件 G のみ | DL-01, DL-39 | C-001 | — | E1 | 未取得 |
| R-267 | B | 承認条件2: IAL/AAL/FAL、認証器、acc… | 全件 G のみ | DL-08, DL-09 | C-019 | — | E2＋E9 | 未取得 |
| R-268 | A | 承認条件3: AS/PAP/CI/CD/KMS/HS… | 全件 G のみ | DL-14, DL-24 | C-039, C-045, C-071 | RB-01, RB-03, RB-05, RB-08 | E2 | 未取得 |
| R-269 | C | 承認条件4: 全entry pointのPEP co… | 全件 G のみ | DL-10, DL-15 | C-048, C-050 | TC-121（ラウンド 4 で割当） | E4 | 未取得 |
| R-270 | B | 承認条件5: OAuth 2.0 Security … | 全件 G のみ | DL-12, DL-16 | C-032, C-033 | — | E2 | 未取得 |
| R-271 | C | 承認条件6: authorization engin… | 全件 G のみ | DL-17, DL-20, DL-22 | C-054 | TC-102, TC-103, TC-104, TC-106 | E5 | 未取得 |
| R-272 | A | 承認条件7: policy/model/schema… | 全件 G のみ | DL-23 | C-062 | — | E2 | 未取得 |
| R-273 | D | 承認条件8: 独立設計レビュー、conformanc… | 全件 G のみ | DL-07, DL-110 | C-013, C-015 | DL-30/DL-07（第三者） | E6＋E11 | 未取得 |
| R-274 | B | 承認条件9: 24時間365日の運用責任、SRE容量… | 全件 G のみ | DL-27, DL-33, DL-43 | C-016 | — | E1 | 未取得 |
| R-275 | C | 承認条件10: 顧客通知、全session失効、鍵交… | 全件 G のみ | DL-24 | C-075 | EX-01, EX-04, EX-08, EX-10, EX-13, EX-18 | E8 | 未取得 |
| R-211 | B | 次回提出物を「有望な参照アーキテクチャと論点集」から… | 全件 G のみ | DL-36, DL-39 | C-012 | — | E1 | 未取得 |
| R-212 | A | 参照アーキテクチャを実装仕様（連携契約・profil… | 全件 G のみ | DL-54, DL-69 | C-062 | — | E2 | 未取得 |
| R-213 | A | 保証証跡を要求単位で収集・追跡する仕組み（追跡表と是… | 全件 G のみ | DL-104, DL-110 | C-009 | — | E3＋E11 | 未取得 |
| R-276 | B | 「この設計なら20年戦える」と署名しない。20年の約… | 全件 G のみ | DL-47 | C-012 | — | E1 | 未取得 |
| R-277 | B | Phase 0を経営リスク定義からやり直し、Gate… | 全件 G のみ | DL-42 | C-012 | — | E1 | 未取得 |
| R-278 | B | 供給者（サプライチェーン）リスクを統治の骨格に含め、… | **なし** | DL-28, DL-33, DL-41 | C-010 | — | E2（調達・法務署名） | 未取得 |
| R-279 | C | ユーザー登録（利用者の初回登録）の手順と統制を定義し… | **なし** | DL-08, DL-22 | C-018, C-031 | TC-018 | E4 | 未取得 |
| R-280 | C | 製品比較の対象に、原文が挙げる候補（OpenFGA、… | **なし** | DL-13, DL-22 | C-061 | TC-013, TC-102 | E2＋E5 | 未取得 |
| R-281 | A | 標準と法規制の変化（標準の改版・状態変更、法令の改正… | **なし** | DL-34, DL-84 | C-008 | — | E3 | 未取得 |
| R-282 | A | 非人間主体（service account、work… | **なし** | DL-08, DL-12, DL-48 | C-017, C-037 | — | E2 | 未取得 |
| R-283 | C | 複数所属（1 主体が複数のテナントに同時に所属する場… | **なし** | DL-08, DL-16, DL-22 | C-018 | TC-018 | E4 | 未取得 |

## 6. 逆引き

### 6.1 DL→R・G

- 「R」は R 台帳の対応成果物欄から引いた R、「計画上の対応要求のみに載る R」は成果物計画の対応要求欄にだけ現れる R である [D]。後者がある DL は、R 台帳または成果物計画のどちらかの割当の見直し候補である [D]。

| DL | 成果物名 | ファイル | 区分 | E | R（R 台帳の対応成果物から） | G | 計画上の対応要求のみに載る R |
|---|---|---|---|---|---|---|---|
| DL-01 | リスク選好・許容度ステートメント（草案） | 作成済 | B | E1 | 9 件: R-005, R-008, R-009, R-011, R-012, R-190.5, R-227, R-228, R-266 | G-030, G-080 | — |
| DL-02 | 重大損失シナリオ登録簿（FAIR 形式） | 作成済 | B | E2（上位シナリオは E1） | 3 件: R-003, R-221, R-229 | G-003, G-004, G-030 | — |
| DL-03 | 資産・データ分類台帳 | 作成済 | B | E2 | 2 件: R-001, R-004 | G-030 | — |
| DL-04 | ガバナンス規程・RACI | 作成済 | B | E1 | 10 件: R-007, R-014, R-015, R-019, R-020, R-054, R-218, R-224, R-226, R-227 | G-031 | — |
| DL-05 | 例外・リスク受容手順と受容票様式 | 作成済 | B | E9 | 5 件: R-007, R-016, R-021, R-075, R-086 | G-031, G-032 | — |
| DL-06 | KRI 定義・四半期報告様式 | 作成済 | B | E2 | 3 件: R-006, R-181, R-223 | G-072, G-144 | — |
| DL-07 | 独立保証計画 | 作成済 | B・D | E1/E2 | 6 件: R-018, R-063, R-067, R-068, R-234, R-273 | G-007, G-033, G-039 | — |
| DL-08 | ID ライフサイクル仕様（状態機械） | 作成済 | A・C・D | E2＋E4 | 23 件: R-028, R-032〜R-045, R-047, R-048, R-188.6, R-260, R-267, R-279, R-282, R-283 | G-061, G-086, G-137, G-149 | — |
| DL-09 | 操作リスク階層×保証レベル割当表 | 作成済 | A・B | E2＋E9 | 9 件: R-027, R-030, R-031, R-079, R-188.4, R-188.5, R-231, R-237, R-267 | G-058, G-060, G-149 | — |
| DL-10 | DFD・entry point invent… | 作成済 | A・C | E2＋E4 | 4 件: R-058, R-164, R-215, R-269 | G-004, G-082 | — |
| DL-11 | 脅威カタログ・残余リスク記録 | 作成済 | A・D | E2（外部レビューで補強） | 6 件: R-002, R-023, R-135, R-167, R-168, R-215 | G-003, G-004, G-078, G-079, G-097 | — |
| DL-12 | ADR 集（索引・様式＋個別 ADR） | 作成済 | A・B・C | E2 | 46 件: R-027, R-031, R-032, R-036〜R-038, R-041〜R-043, R-047, R-049, R-054, R-085, R-090, R-094〜R-104, R-106, R-109, R-110, R-118, R-129, R-131, R-144, R-151, R-153, R-158, R-160, R-177, R-203, R-204, R-231, R-246, R-258, R-260, R-265, R-270, R-282 | G-020, G-042, G-049, G-051, G-060, G-061, G-066〜G-070, G-074, G-075, G-084, G-087, G-091〜G-093, G-095, G-102, G-109〜G-111, G-113, G-114, G-120, G-126, G-134, G-140 | — |
| DL-13 | 製品選定評価・出口戦略 | 作成済 | A・C | E2＋E5 | 6 件: R-088, R-090, R-091, R-093, R-208, R-280 | G-070, G-074, G-117 | — |
| DL-14 | root of trust・鍵管理設計と鍵 … | 作成済 | A・B・C・D | E2＋E8 | 11 件: R-049〜R-056, R-189.3, R-189.4, R-268 | G-084, G-085, G-091 | — |
| DL-15 | PEP 契約・coverage・storag… | 作成済 | C・D | E4 | 8 件: R-059〜R-062, R-250, R-254, R-262, R-269 | G-072, G-082 | — |
| DL-16 | OAuth/OIDC セキュリティ prof… | 作成済 | A・B・C・D | E2＋E7 | 18 件: R-046, R-158〜R-163, R-189, R-189.1, R-189.2, R-189.6, R-239, R-240, R-249, R-251, R-259, R-270, R-283 | G-087, G-088, G-138 | — |
| DL-17 | 認可モデル・整合性・剥奪仕様 | 作成済 | A・C | E2＋E5 | 14 件: R-142〜R-149, R-191.3, R-205, R-250, R-252, R-253, R-271 | G-107〜G-110, G-112, G-113 | — |
| DL-18 | PDP topology・cell・blas… | 作成済 | A・C・D | E2＋E5 | 13 件: R-099, R-150〜R-157, R-192.1, R-207, R-261, R-265 | G-048, G-054, G-112, G-139, G-151 | — |
| DL-19 | 失敗モード表（fail-mode matri… | 作成済 | A・B・C | E2＋E9 | 11 件: R-080〜R-087, R-188.3, R-210, R-262 | G-058 | — |
| DL-20 | 数値契約台帳（SLI/SLO） | 作成済 | B・C | E1＋E5 | 56 件: R-077, R-087, R-188, R-188.1, R-188.2, R-188.3, R-188.4, R-188.5, R-188.6, R-188.7, R-189, R-189.1, R-189.2, R-189.3, R-189.4, R-189.5, R-189.6, R-190, R-190.1, R-190.2, R-190.3, R-190.4, R-190.5, R-190.6, R-191, R-191.1, R-191.2, R-191.3, R-192, R-192.1, R-192.2, R-192.3, R-192.4, R-192.5, R-193, R-193.1, R-193.2, R-193.3, R-193.4, R-193.5, R-193.6, R-194, R-194.1, R-194.2, R-194.3, R-194.4, R-194.5, R-195, R-195.1, R-195.2, R-195.3, R-195.4, R-195.5, R-196, R-220, R-271 | G-024, G-057, G-060, G-106, G-144, G-147 | — |
| DL-21 | BIA（事業影響分析）票 | 作成済 | B | E2（事業責任者署名） | 9 件: R-008, R-009, R-188, R-190.6, R-192, R-192.2, R-192.3, R-196, R-219 | G-024, G-044, G-045, G-057 | — |
| DL-22 | 高保証 PoC 試験計画（事前登録） | 作成済 | C | E4/E5 | 61 件: R-032, R-034〜R-041, R-044, R-045, R-050〜R-054, R-071, R-078, R-080〜R-083, R-089, R-091, R-097, R-104, R-126, R-143〜R-146, R-148, R-150, R-152, R-156, R-168〜R-176, R-188.1, R-188.2, R-190.1, R-190.2, R-192.4, R-194.3, R-205, R-206, R-220, R-231, R-242, R-260, R-261, R-271, R-279, R-280, R-283 | G-009, G-056, G-059, G-066, G-081, G-086, G-088, G-092, G-103, G-108, G-117, G-123, G-136, G-141, G-146, G-147 | R-147, R-149, R-154, R-155 |
| DL-23 | 進化・互換方針（versioning・cry… | 作成済 | A・B・C | E2＋E4 | 8 件: R-104〜R-109, R-209, R-272 | G-068, G-069, G-075 | — |
| DL-24 | 侵害別 runbook・演習計画 | 作成済 | A・B・C | E8 | 23 件: R-057, R-110〜R-117, R-184〜R-186, R-189.5, R-195, R-195.1, R-195.2, R-195.3, R-195.4, R-195.5, R-210, R-235, R-268, R-275 | G-059, G-084, G-093, G-094 | — |
| DL-25 | 監査ログ設計・PIA | 作成済 | A・B・C | E2＋E5 | 21 件: R-102, R-118〜R-128, R-193, R-193.1, R-193.2, R-193.3, R-193.4, R-193.5, R-193.6, R-232, R-257 | G-054, G-063, G-064 | — |
| DL-26 | 顧客管理機能設計・責任分界条項案 | 作成済 | A・B・C | E2＋E4 | 9 件: R-013, R-129〜R-134, R-244, R-245 | G-095, G-096, G-115 | — |
| DL-27 | 運用・要員モデル | 作成済 | B | E1（予算・人員承認） | 9 件: R-092, R-136〜R-141, R-222, R-274 | G-047, G-145 | — |
| DL-28 | 統制マッピング台帳 | 作成済 | A | E3 | 13 件: R-025, R-026, R-165, R-214, R-228, R-229, R-233, R-236, R-237, R-241, R-243, R-247, R-278 | G-012 | — |
| DL-29 | 引用監査（引用トレーサビリティ索引・全引用検… | 作成済 | A | E3（全引用検証ログ） | 2 件: R-197, R-198 | G-018 | R-199〜R-202 |
| DL-30 | 独立評価 RFP/SOW 群 | 作成済 | D | E2（評価結果は E6/E7） | 17 件: R-042, R-046, R-055, R-060, R-063〜R-066, R-069〜R-073, R-157, R-182, R-183, R-234 | G-034, G-083, G-089, G-091, G-132 | — |
| DL-31 | 段階導入計画 | 作成済 | B・C | E2＋E5 | 10 件: R-107, R-149, R-154, R-177〜R-180, R-194, R-194.1, R-194.2 | G-050, G-051, G-143 | — |
| DL-32 | 継続保証計画 | 作成済 | B・C・D | E1/E2 | 9 件: R-181〜R-187, R-222, R-235 | G-071, G-076, G-097, G-150 | — |
| DL-33 | TCO・vendor support・LTS… | 作成済 | B | E2（財務レビュー） | 3 件: R-141, R-274, R-278 | G-045, G-046 | — |
| DL-34 | 法域・規制・契約適用性判定表 | 作成済 | B | E2（法務署名） | 12 件: R-010, R-013, R-024, R-114, R-120, R-121, R-124, R-193.4, R-236, R-244, R-248, R-281 | G-011, G-030, G-054, G-094, G-096, G-139, G-149 | — |
| DL-35 | リポジトリ案内 | 作成済（最終整合で確認） | A | E2 | 0 件 | G-001, G-118, G-133 | R-197〜R-199 |
| DL-36 | 決裁パッケージ表紙 | 作成済（最終整合で確認） | B | E2（承認後 E1） | 2 件: R-202, R-211 | G-040 | — |
| DL-37 | エグゼクティブ 1 枚 | 作成済（最終整合で確認） | B | E1（決裁時） | 4 件: R-200, R-223, R-225, R-264 | G-025, G-037 | R-022, R-202 |
| DL-38 | 前回指摘対照表 | 作成済 | A・B | E3 | 0 件 | G-022, G-036 | R-001〜R-210 |
| DL-39 | 決裁事項詳細（DEC-1〜DEC-9） | 作成済 | B | E1 | 5 件: R-022, R-202, R-211, R-264, R-266 | G-002, G-025, G-026, G-040, G-134 | R-005, R-018, R-075 |
| DL-40 | プログラム憲章・スコープ・非目標 | 作成済 | B | E1/E2 | 1 件: R-217 | G-041, G-052, G-146, G-148 | R-022, R-202 |
| DL-41 | 残余リスク台帳 | 作成済 | B | E9 | 4 件: R-007, R-023, R-218, R-278 | G-032, G-079, G-143 | R-075 |
| DL-42 | ゲート計画と Plan B | 作成済 | B | E1/E2 | 3 件: R-067, R-216, R-277 | G-027, G-028, G-036, G-143 | R-022, R-074, R-202 |
| DL-43 | 体制と TCO（決裁要約） | 作成済 | B | E1 | 1 件: R-274 | G-046, G-047, G-053 | R-092, R-141 |
| DL-44 | 代替案比較 | 作成済 | A・B | E2 | 1 件: R-088 | G-005, G-028 | R-208 |
| DL-45 | 前提台帳 | 作成済 | A・B | E2 | 0 件 | G-016, G-019, G-041, G-043, G-151 | — |
| DL-46 | 停止権限・凍結規程 | 作成済 | B | E1 | 4 件: R-017, R-022, R-074, R-155 | G-031, G-033, G-092 | — |
| DL-47 | 20 年耐久性憲章 | 作成済 | B | E1/E2 | 4 件: R-208, R-209, R-225, R-276 | G-065, G-071, G-073 | R-104 |
| DL-48 | 主体カタログ | 作成済 | A | E2 | 2 件: R-029, R-282 | G-101 | — |
| DL-49 | テナントライフサイクル | 作成済 | A・C | E2＋E4 | 0 件 | G-075, G-137 | R-011, R-150 |
| DL-50 | As-Is 棚卸し（様式と仮置き） | 作成済 | A・C | E2＋E4 | 1 件: R-058 | G-050 | R-177 |
| DL-51 | 攻撃者モデル | 作成済 | A | E2 | 3 件: R-002, R-166, R-240 | G-077, G-097 | — |
| DL-52 | 不正・濫用対策 | 作成済 | A・C | E2＋E4 | 2 件: R-176, R-188.7 | G-062 | R-012, R-042 |
| DL-53 | 実事故ケースブック | 作成済 | A | E2（[I] 一次報告） | 0 件 | G-014, G-073, G-081 | R-002, R-003, R-166 |
| DL-54 | 参照アーキテクチャ v2 | 作成済 | A | E2 | 4 件: R-200, R-212, R-230, R-238 | G-015, G-042, G-148 | R-201, R-205, R-206 |
| DL-55 | workload ID・委任 | 作成済 | A・C | E2＋E5 | 4 件: R-206, R-230, R-251, R-255 | G-102 | R-100 |
| DL-56 | 失効・継続評価 | 作成済 | A・C | E2＋E5 | 6 件: R-112, R-143, R-191, R-191.1, R-191.2, R-238 | G-111 | R-146 |
| DL-57 | PEP 外データの統制 | 作成済 | A・C | E2＋E4 | 1 件: R-061 | G-082, G-105, G-136 | R-058 |
| DL-58 | 容量モデル | 作成済 | A・C | E5 | 4 件: R-125, R-190, R-190.3, R-190.4 | G-015, G-055, G-059, G-063, G-151 | R-192 |
| DL-59 | pentest・red team 計画 | **未作成** | D | E6（計画時は E2）、E11 | 4 件: R-060, R-065, R-066, R-076 | G-034, G-061, G-083 | R-042 |
| DL-60 | OIDF conformance 計画 | 作成済 | C・D | E7 | 2 件: R-046, R-064 | G-034, G-089 | R-160 |
| DL-61 | 自己評価（ASVS 5.0・API Top … | 作成済 | C・D | E4／E2 | 7 件: R-070, R-071, R-073, R-165, R-233, R-241, R-246 | G-090, G-150 | — |
| DL-62 | 連携ハンドブック総覧 | 作成済 | A | E2 | 0 件 | G-100, G-140, G-143, G-145 | R-136, R-140 |
| DL-63 | 依存階層 | 作成済 | A・B | E2 | 2 件: R-192.5, R-207 | G-042, G-048, G-049, G-098, G-104, G-135 | R-210 |
| DL-64 | 連携パターン集 | 作成済 | A・C | E2＋E4 | 0 件 | G-098〜G-100, G-106, G-135, G-136, G-138, G-139 | R-059, R-100, R-163, R-206 |
| DL-65 | 認可モデリングガイド | 作成済 | A | E2 | 2 件: R-252, R-256 | G-107, G-108, G-115, G-116, G-147 | R-098, R-147, R-148, R-205 |
| DL-66 | オンボーディング手順 | 作成済 | A・B | E2 | 1 件: R-140 | G-052, G-053, G-116, G-124, G-129, G-141, G-144 | R-179 |
| DL-67 | Definition of Ready | 作成済 | A・B | E2 | 1 件: R-233 | G-125, G-129 | R-058, R-059, R-164 |
| DL-68 | 開発者 FAQ | 作成済 | A | E2 | 1 件: R-138 | G-128, G-145 | — |
| DL-69 | 契約一覧・規約 | 作成済 | A | E2 | 1 件: R-212 | G-118, G-119, G-127, G-134, G-138 | R-109 |
| DL-70 | 互換性・非推奨ポリシー（SLA） | 作成済 | A・B | E2 | 5 件: R-105, R-108, R-194.4, R-194.5, R-256 | G-069, G-126, G-140 | R-109, R-194 |
| DL-71 | 共通スキーマ | 作成済 | A・C | E4 | 0 件 | G-067 | R-109, R-161 |
| DL-72 | Authorization API（Auth… | 作成済 | A・C | E4 | 0 件 | G-066, G-120 | R-098, R-144, R-205 |
| DL-73 | Relationship/Model Reg… | 作成済 | A・C | E4 | 1 件: R-147 | G-070, G-112 | R-091, R-145, R-148 |
| DL-74 | Token Exchange API | 作成済 | A・C | E4 | 0 件 | G-102 | R-100, R-206 |
| DL-75 | Access token claims スキ… | 作成済 | A・C | E4 | 3 件: R-161, R-162, R-249 | — | — |
| DL-76 | SCIM API profile | 作成済 | A・C | E4 | 2 件: R-040, R-132 | — | — |
| DL-77 | 監査イベントスキーマ | 作成済 | A・C | E4 | 4 件: R-119, R-127, R-232, R-257 | — | R-118 |
| DL-78 | SSF/CAEP stream API pr… | 作成済 | A・C | E4 | 0 件 | G-111, G-137 | R-112, R-143 |
| DL-79 | SSF/CAEP イベント（SET）スキーマ | 作成済 | A・C | E4 | 0 件 | G-111, G-118 | R-112, R-191 |
| DL-80 | モック・契約試験キット仕様 | 作成済 | C | E4 | 3 件: R-062, R-172, R-242 | G-072, G-088, G-103, G-121〜G-123, G-134, G-141, G-142 | R-071 |
| DL-81 | PoC 実測レポート | 作成済（POC-02 版 0.1、draft、作成者以外の確認未実施。再最終整合で確認。立会人のない自己実行の記録で、[M] の証拠ではない） | C | E5（＋E4） | 0 件 | G-009, G-048, G-051, G-056, G-058, G-062, G-063, G-081, G-105, G-110, G-114, G-136, G-146, G-147 | — |
| DL-82 | PoC コードと再現手順 | 作成済（最終整合で確認） | C | E4／E10 | 0 件 | G-056, G-103, G-123, G-142 | R-169, R-205, R-206 |
| DL-83 | 調査ノート総覧・調査手法 | 作成済 | A | E2 | 0 件 | G-001, G-002, G-010, G-016 | R-197〜R-199 |
| DL-84 | 標準ステータス台帳 | 作成済 | A | E3 | 1 件: R-281 | G-013, G-071, G-119 | R-026, R-198 |
| DL-85 | RS-01 統治・リスク定量化 | 作成済 | A | E3 | 0 件 | G-012 | R-005, R-006, R-014, R-019〜R-021 |
| DL-86 | RS-02 規制・法域の適用性 | 作成済 | A | E3 | 0 件 | G-011, G-139 | R-010, R-024, R-114, R-120, R-121, R-124 |
| DL-87 | RS-03 デジタル ID ライフサイクル | 作成済 | A | E3 | 0 件 | — | R-002, R-004, R-027〜R-048 |
| DL-88 | RS-04 OAuth/OIDC token… | 作成済 | A | E3 | 0 件 | — | R-005, R-006, R-020, R-112, R-158〜R-163 |
| DL-89 | RS-05 root of trust・鍵管… | 作成済 | A | E3 | 0 件 | G-012, G-150 | R-007, R-008, R-049〜R-057, R-073 |
| DL-90 | RS-06 workload ID・委任・A… | 作成済 | A | E3 | 0 件 | — | R-009, R-017, R-026, R-100, R-206, R-209 |
| DL-91 | RS-07 認可エンジンと整合性 | 作成済 | A | E3 | 0 件 | G-015 | R-010, R-011, R-025, R-093, R-097, R-142〜R-149 |
| DL-92 | RS-08 PEP 完全性とテナント分離 | 作成済 | A | E3 | 0 件 | G-012 | R-012, R-058〜R-062 |
| DL-93 | RS-09 レジリエンス・cell・fail… | 作成済 | A | E3 | 0 件 | G-014 | R-013, R-023, R-150〜R-157, R-207, R-210 |
| DL-94 | RS-10 監査・プライバシー・所在地 | 作成済 | A | E3 | 0 件 | — | R-014, R-118〜R-128 |
| DL-95 | RS-11 20 年の進化・PQC・depr… | 作成済 | A | E3 | 0 件 | G-068, G-073 | R-015, R-016, R-101, R-104〜R-109, R-209 |
| DL-96 | RS-12 実事故ケーススタディ | 作成済 | A | E3 | 0 件 | G-014 | R-002, R-003, R-166 |
| DL-97 | RS-13 不正・濫用対策 | 作成済 | A | E3 | 0 件 | — | R-031, R-042, R-168 |
| DL-98 | RS-14 B2B 顧客向け ID 機能 | 作成済 | A | E3 | 0 件 | — | R-013, R-024, R-129〜R-135 |
| DL-99 | RS-15 build/buy/manage… | 作成済 | A | E3 | 0 件 | G-015 | R-001, R-018, R-088〜R-093, R-141, R-208 |
| DL-100 | RS-16 超大規模並行開発の統治 | 作成済 | A | E3 | 0 件 | G-126, G-142 | R-022, R-105, R-108, R-109 |
| DL-113 | RS-17 連携パターンと認可モデリングの先… | 作成済 | A | E3 | 0 件 | G-098, G-107, G-135 | R-024, R-026, R-059, R-100, R-205, R-206 |
| DL-101 | 原子要求一覧 | 作成済 | A | E3 | 0 件 | G-010, G-022, G-029 | R-001〜R-210 |
| DL-102 | ゴール受入基準 | 作成済 | A | E3 | 0 件 | — | R-197〜R-202 |
| DL-103 | 成果物計画（本書） | 作成済 | A | E2 | 0 件 | — | R-025 |
| DL-104 | R/G 追跡表 | 作成済 | A | E3 | 2 件: R-213, R-214 | G-003, G-021 | R-025, R-197 |
| DL-105 | 主張台帳 | 作成済 | A | E3 | 4 件: R-198, R-199, R-201, R-263 | G-018, G-019 | R-197 |
| DL-106 | 見解相違ログ | 作成済 | A | E3 | 0 件 | G-023, G-029 | R-197, R-198 |
| DL-107 | 棄却仮説ログ | 作成済 | A | E3 | 0 件 | G-008 | R-201 |
| DL-108 | 独立反証レビュー記録 | 作成済（最終整合で確認） | A（独立反証は D） | E2（独立実施時は E6） | 0 件 | G-006, G-007 | R-063, R-201 |
| DL-109 | 模擬パネル判定記録 | 作成済（最終整合で確認） | A | E2 | 1 件: R-201 | G-038, G-039 | R-202 |
| DL-110 | 残課題・是正追跡（POA&M） | 作成済 | A | E11 | 4 件: R-076, R-187, R-213, R-273 | G-016, G-034, G-130 | — |
| DL-111 | 自動検査仕様と結果 | 作成済（最終整合で確認） | A・C | E4 | 0 件 | G-017, G-035, G-131 | R-197, R-199, R-200 |
| DL-112 | 変更履歴 | 作成済（最終整合で確認） | A | E2 | 0 件 | G-008, G-133 | R-202 |
| DL-114 | Phase 1 網羅性批評 | 作成済 | A | E3 | 0 件 | — | R-197 |
| DL-115 | claim 目録 | 作成済 | A | E2 | 0 件 | — | R-118, R-161, R-162 |

### 6.2 C→R→試験→証跡

- 「TC（試験欄の仮番から）」は統制台帳 §4.1 の試験欄の仮番（TH-TC 等）を試験計画で TC に読み替えたもの、「TC（対応 R から）」はその C に結び付く R の TC である [D]。後者は前者より広く、C の試験として採用するかは統制の所有者が決める [D]。
- 証跡の所在は統制台帳の「証跡の所在（予定）」の転記であり、「（未作成）」の注記も台帳の記載時点のものである[^4]。

| C-ID | 統制名 | R | TC（試験欄の仮番から） | TC（対応 R から） | RB | E | 証跡の所在（予定） |
|---|---|---|---|---|---|---|---|
| C-001 | リスク選好・許容度の承認と見直し | R-005, R-008, R-009, R-011, R-012, R-190.5, R-227, R-228, R-266 | — | — | — | E1 | 00_decision（DEC-1 議事録） |
| C-002 | 損失シナリオ・保護対象・データ分類の台帳… | R-001, R-003, R-004, R-214, R-221, R-229 | — | — | — | E2 | 01_governance/loss-scenarios.md、02_requirements/data-classification.md |
| C-003 | RACI・責任と権限の対応・三線分離 | R-014, R-015, R-019〜R-021, R-136, R-224, R-226 | — | — | — | E1 | 01_governance/raci-governance.md |
| C-004 | 例外・残余リスク受容票の管理 | R-007, R-016, R-021, R-023, R-075, R-086, R-218, R-225 | — | — | — | E9 | 00_decision/05-residual-risk-register.md（未作成） |
| C-005 | 停止権限・本番移行停止・凍結 | R-017, R-022, R-074, R-155 | — | TC-010, TC-108 | — | E1、E8 | 01_governance/stop-authority.md |
| C-006 | KRI の四半期報告 | R-006, R-181, R-223, R-228 | — | — | — | E2 | 01_governance/kri.md |
| C-007 | 数値契約の決裁（BIA・実測への紐付け） | R-077, R-087, R-188, R-188.4, R-188.5, R-189〜R-194, R-194.1, R-194.2, R-195, R-196, R-219, R-220 | — | TC-001, TC-008, TC-010, TC-012, TC-014, TC-017, TC-028, TC-101, TC-102, TC-103, TC-104, TC-105, TC-106, TC-107, TC-108, TC-109, TC-111, TC-114, TC-126, TC-131 | — | E1、E5 | 07_slo/numeric-contracts.md（未作成） |
| C-008 | 法域・規制適用性判定と変化追跡 | R-010, R-024, R-236, R-248, R-281 | — | — | — | E2（法務署名） | 06_controls/applicability.md、research/standards-status.md |
| C-009 | 統制台帳と双方向追跡の健全性検査 | R-025, R-026, R-165, R-213, R-214, R-229, R-236, R-237, R-241, R-243, R-247 | — | — | — | E3 | 06_controls/control-mapping-ledger.md、traceability/traceability-matrix.md |
| C-010 | 供給者リスク管理 | R-141, R-208, R-218, R-278 | — | — | — | E2（調達・法務署名） | 08_operations/tco-vendor-lts.md（未作成） |
| C-011 | 主張・引用の検証 | R-142, R-197〜R-201, R-225, R-263 | — | — | — | E3 | traceability/claims-ledger.md、traceability/citation-audit-*.md |
| C-012 | Gate・決裁範囲・退出基準 | R-022, R-202, R-211, R-216, R-217, R-264, R-276, R-277 | — | — | — | E1 | 00_decision/06-gate-plan-and-plan-b.md（未作成） |
| C-013 | 独立保証計画と評価者の独立性 | R-018, R-063, R-067〜R-069, R-234, R-273 | — | — | — | E2、E6 | 09_assurance/independent-assurance-plan.md（未作成） |
| C-014 | 継続保証（年次独立評価・定期 red t… | R-066, R-182, R-183, R-222 | — | — | — | E6、E11 | 09_assurance/continuous-assurance-plan.md（未作成） |
| C-015 | 是正追跡と Critical/High … | R-074, R-076, R-187, R-273 | — | — | — | E11、E6 | traceability/open-items.md（未作成） |
| C-016 | 要員・on-call・bus facto… | R-092, R-137〜R-139, R-141, R-222, R-274 | — | — | — | E1 | 08_operations/operating-model.md（未作成） |
| C-017 | 主体カタログと非人間主体台帳 | R-029, R-255, R-282 | — | — | — | E4 | 02_requirements/principal-catalog.md |
| C-018 | ID ライフサイクル状態機械 | R-028, R-034, R-035, R-044, R-048, R-170, R-279, R-283 | — | TC-018, TC-019, TC-020, TC-023 | — | E4、E5 | 02_requirements/identity-lifecycle.md |
| C-019 | 操作階層×保証レベルの割当 | R-027, R-030, R-079, R-188.4, R-188.5, R-237, R-267 | — | — | — | E2、E4 | 02_requirements/operation-risk-tiers-assurance.md |
| C-020 | フィッシング耐性認証の義務化 | R-031, R-168, R-231 | TC-113 | TC-002, TC-003, TC-005, TC-007, TC-008, TC-012, TC-014, TC-018, TC-020, TC-022, TC-103, TC-104, TC-106, TC-108, TC-109, TC-112, TC-115, TC-116, TC-118, TC-121, TC-127 | — | E4、E6 | 12_poc/data/（未作成） |
| C-021 | アカウント回復と認証器ライフサイクル | R-032, R-041, R-042, R-168, R-188.6, R-188.7 | — | TC-002, TC-003, TC-005, TC-007, TC-008, TC-012, TC-014, TC-018, TC-020, TC-022, TC-103, TC-104, TC-106, TC-108, TC-109, TC-112, TC-113, TC-115, TC-116, TC-118, TC-121, TC-127 | — | E4、E6 | 12_poc/data/（未作成） |
| C-022 | 同期 passkey の受入範囲 | R-043 | — | — | — | E4 | 12_poc/data/（未作成） |
| C-023 | 本人確認（identity proofi… | R-033 | — | — | — | E2、E4 | 02_requirements/identity-lifecycle.md |
| C-024 | federation 終端・linkin… | R-036, R-037, R-046, R-047, R-129, R-168, R-260 | TC-005 | TC-002, TC-003, TC-007, TC-008, TC-012, TC-014, TC-018, TC-019, TC-020, TC-022, TC-103, TC-104, TC-106, TC-108, TC-109, TC-112, TC-113, TC-115, TC-116, TC-118, TC-121, TC-127 | — | E4、E6、E7 | 12_poc/data/（未作成） |
| C-025 | SAML 証明書更新と IdP 停止時の… | R-038, R-039, R-188.3 | — | TC-019, TC-105, TC-111, TC-112 | — | E4、E5 | 12_poc/data/（未作成） |
| C-026 | SCIM のテナント結合・競合解決・de… | R-040, R-044, R-130, R-132 | — | TC-018, TC-019, TC-023, TC-112 | — | E4、E5 | 12_poc/data/（未作成） |
| C-027 | ドメイン検証 | R-131 | — | — | — | E4 | 12_poc/data/（未作成） |
| C-028 | step-up の鮮度 | R-045 | — | TC-020 | — | E4 | 12_poc/data/（未作成） |
| C-029 | 顧客管理者の委任管理と顧客向け監査 | R-133〜R-135, R-245 | — | — | — | E4 | 02_requirements/customer-admin-responsibility.md |
| C-030 | 責任分界（共有責任） | R-013, R-244 | — | — | — | E2（法務署名） | 02_requirements/customer-admin-responsibility.md |
| C-031 | 不正利用・アカウント乗っ取りの検知 | R-168, R-235, R-279 | — | TC-002, TC-003, TC-005, TC-007, TC-008, TC-012, TC-014, TC-018, TC-020, TC-022, TC-103, TC-104, TC-106, TC-108, TC-109, TC-112, TC-113, TC-115, TC-116, TC-118, TC-121, TC-127 | — | E4、E5 | 12_poc/data/（未作成） |
| C-032 | OAuth/OIDC profile（R… | R-158, R-159, R-173, R-239, R-259, R-270 | TC-007 | TC-004, TC-005, TC-006, TC-125 | — | E4、E7 | 09_assurance（未作成） |
| C-033 | FAPI 2.0 の適用範囲と適合試験 | R-064, R-096, R-160, R-240, R-270 | — | — | — | E7 | 09_assurance/oidf-conformance-plan.md（未作成） |
| C-034 | JWT の厳格検証と型間の排他 | R-161, R-162, R-173, R-249 | — | TC-004, TC-005, TC-006, TC-007, TC-125 | — | E4 | CI ログ（DL-111） |
| C-035 | token 寿命・送信者拘束・BFF | R-087, R-095, R-163, R-189, R-189.1, R-189.2 | TC-007, TC-113 | TC-014, TC-106, TC-109 | — | E4、E5 | 12_poc/data/（未作成） |
| C-036 | workload identity と … | R-100, R-206, R-230, R-251, R-255 | — | TC-004, TC-028, TC-120, TC-125 | — | E4 | 12_poc/data/（未作成） |
| C-037 | AI エージェント・非同期・長時間ジョブ… | R-251, R-282 | TC-023 | — | — | E4 | 12_poc/data/（未作成） |
| C-038 | 第三者 grant の管理 | R-231, R-232 | — | TC-022, TC-115, TC-127 | — | E4 | 12_poc/data/（未作成） |
| C-039 | 鍵階層・用途分離・鍵と issuer の… | R-049, R-056, R-101, R-268 | TC-014 | — | RB-01, RB-03, RB-05, RB-08 | E2、E4 | 04_architecture/root-of-trust.md |
| C-040 | 鍵の生成・保管・二者統制・ceremony | R-050, R-054, R-055 | TC-109 | TC-022, TC-127 | — | E8、E10、E6 | 04_architecture/root-of-trust.md |
| C-041 | rotation と JWKS 配布 | R-051, R-189.3, R-189.4, R-189.6 | TC-014 | TC-106, TC-109 | — | E4、E5 | 12_poc/data/（未作成） |
| C-042 | 鍵の失効と緊急切替 | R-052, R-113, R-189.5, R-195.4 | — | TC-014, TC-109 | RB-01 | E8 | 08_operations/compromise-runbooks.md（未作成） |
| C-043 | 鍵の災害復旧 | R-053 | — | TC-109 | — | E8 | 08_operations/compromise-runbooks.md（未作成） |
| C-044 | crypto agility と PQC… | R-101, R-104, R-209 | TC-015, TC-110 | TC-006 | — | E4 | 12_poc/data/（未作成） |
| C-045 | 管理面変更の単一経路 | R-054, R-056, R-140, R-256, R-268 | — | TC-022, TC-109, TC-127 | RB-01, RB-03, RB-05, RB-08 | E4、E10 | CI ログ（DL-111） |
| C-046 | ソフトウェア供給網（SLSA・SSDF） | R-073, R-233, R-246 | — | — | — | E4、E6、E10 | CI ログ（DL-111） |
| C-047 | 識別子と識別子ドメインの保有 | R-208, R-209 | — | — | — | E2 | 05_adr/ADR-021-irreversible-identifiers.md |
| C-048 | entry point 台帳と cove… | R-058, R-059, R-062, R-164, R-269 | — | — | — | E4 | CI ログ（DL-111） |
| C-049 | サービス内 PEP・既定 deny・PE… | R-098, R-204, R-205, R-230, R-252, R-254, R-262 | TC-002, TC-003 | TC-013, TC-016, TC-021, TC-027, TC-028, TC-101, TC-102, TC-121, TC-128, TC-129 | — | E4、E6 | CI ログ（DL-111） |
| C-050 | ストレージ側 tenant guardr… | R-061, R-250, R-269 | — | — | — | E4 | CI ログ（DL-111） |
| C-051 | cross-tenant・API 負例試… | R-060, R-062, R-065, R-071, R-172, R-242 | — | TC-002, TC-003 | — | E4、E6 | CI ログ（DL-111） |
| C-052 | 一覧・検索の post-check | R-171, R-242 | — | TC-003, TC-008, TC-021 | — | E4 | CI ログ（DL-111） |
| C-053 | テナント越境共有の制御 | R-171, R-250 | — | TC-008, TC-021 | — | E4 | CI ログ（DL-111） |
| C-054 | 認可整合性と剥奪 SLO | R-081, R-097, R-143〜R-146, R-191, R-191.1, R-191.2, R-191.3, R-253, R-271 | TC-008 | TC-009, TC-023, TC-028, TC-102, TC-103, TC-104, TC-105, TC-106 | — | E5 | 12_poc/data/（未作成） |
| C-055 | 失効の中央強制と継続評価 | R-112, R-143, R-191.1, R-238 | — | TC-008, TC-023, TC-103, TC-104, TC-105 | RB-02 | E5 | 12_poc/data/（未作成） |
| C-056 | model・policy 変更の段階展開… | R-107, R-147〜R-149, R-154, R-156, R-175, R-177〜R-180, R-194.1, R-194.2, R-194.3, R-256 | TC-012 | TC-106, TC-108 | — | E4、E5 | 12_poc/data/（未作成） |
| C-057 | cell 分割と blast radiu… | R-099, R-150〜R-153, R-157, R-207, R-261, R-265 | — | TC-010, TC-106, TC-107, TC-108, TC-116 | — | E5 | 12_poc/data/（未作成） |
| C-058 | 操作階層別の失敗モード | R-078, R-080, R-082〜R-087, R-174, R-188.3, R-210, R-262 | — | TC-008, TC-010, TC-011, TC-014, TC-017, TC-101, TC-103, TC-105, TC-106, TC-109, TC-111, TC-114, TC-126 | RB-05, RB-06 | E5 | 12_poc/data/（未作成） |
| C-059 | 依存 Tier | R-192.5, R-207 | — | TC-105 | — | E8 | 10_integration/dependency-tiers.md（未作成） |
| C-060 | 容量と性能・可用性の SLO | R-125, R-188, R-188.1, R-188.2, R-190, R-190.1, R-190.2, R-190.3, R-190.4, R-190.6, R-192, R-192.1, R-192.2, R-192.3, R-192.4, R-220 | — | TC-010, TC-017, TC-101, TC-102, TC-103, TC-105, TC-106, TC-107, TC-108, TC-111, TC-114, TC-131 | — | E5 | 12_poc/data/（未作成） |
| C-061 | 製品選定・PoC・出口 | R-088〜R-091, R-093, R-094, R-097, R-103, R-186, R-203, R-204, R-208, R-280 | — | TC-013, TC-101, TC-102, TC-103, TC-106, TC-117 | — | E5、E8 | 04_architecture/product-evaluation-exit.md |
| C-062 | 版管理・後方互換・非推奨と連携契約 | R-105, R-106, R-108, R-109, R-185, R-194, R-194.4, R-194.5, R-212, R-272 | — | TC-012, TC-106, TC-108 | — | E4、E8 | CI ログ（DL-111） |
| C-063 | 特権アクセス（JIT・二者・break-… | R-012, R-176, R-231, R-258 | — | TC-011, TC-016, TC-022, TC-114, TC-115, TC-127 | — | E4、E8 | 12_poc/data/（未作成） |
| C-064 | support アクセスの分離 | R-012, R-042, R-258 | — | — | — | E4 | 12_poc/data/（未作成） |
| C-065 | テナントライフサイクル操作 | R-124, R-130 | — | — | — | E4、E5 | 12_poc/data/（未作成） |
| C-066 | 監査の独立経路・全件記録・欠損検知 | R-083, R-102, R-118, R-126〜R-128, R-193, R-193.1, R-193.2 | — | TC-001, TC-011, TC-104, TC-114 | — | E4、E5 | 12_poc/data/（未作成） |
| C-067 | 監査記録の改ざん検知と WORM | R-123, R-176, R-193.3 | — | TC-011, TC-016, TC-022, TC-114, TC-115 | — | E4、E10 | 12_poc/data/（未作成） |
| C-068 | 監査の最小化・アクセス統制・保持・削除調停 | R-102, R-119, R-120, R-122, R-124, R-193.4, R-193.5, R-193.6 | — | TC-001, TC-114 | — | E2、E4 | 04_architecture/audit-privacy.md |
| C-069 | データ所在地の制御 | R-102, R-121 | — | — | — | E2、E4 | 04_architecture/audit-privacy.md |
| C-070 | IAM 変更の監視と判定記録の追跡項目 | R-232, R-257 | — | — | — | E4 | 12_poc/data/（未作成） |
| C-071 | 侵害 runbook・kill swit… | R-057, R-110, R-111, R-116, R-210, R-235, R-268 | — | — | RB-01, RB-02, RB-03, RB-04, RB-05, RB-06, RB-07, RB-08, RB-09, RB-10, RB-11, RB-12 | E8 | 08_operations/compromise-runbooks.md（未作成） |
| C-072 | 全 session 失効 | R-112, R-195.3 | — | TC-111 | RB-02 | E8 | 08_operations/compromise-runbooks.md（未作成） |
| C-073 | 証拠保全 | R-115, R-210 | — | — | RB-05, RB-06 | E8 | 08_operations/compromise-runbooks.md（未作成） |
| C-074 | 顧客通知・法定報告 | R-114, R-195.5 | — | TC-126 | — | E8 | 08_operations/compromise-runbooks.md（未作成） |
| C-075 | 侵害・移行・出口演習 | R-117, R-184〜R-186, R-195, R-195.1, R-195.2, R-275 | — | TC-014, TC-109, TC-111, TC-126 | — | E8、E11 | 08_operations/compromise-runbooks.md（未作成） |
| C-076 | 脅威モデリング工程 | R-002, R-135, R-164, R-166〜R-168, R-215 | — | TC-002, TC-003, TC-005, TC-007, TC-008, TC-012, TC-014, TC-018, TC-020, TC-022, TC-103, TC-104, TC-106, TC-108, TC-109, TC-112, TC-113, TC-115, TC-116, TC-118, TC-121, TC-127 | — | E2 | 03_threat-model/ |
| C-077 | PoC の事前登録（攻撃・障害主目的） | R-078, R-089, R-169〜R-171, R-173, R-174 | — | TC-001, TC-004, TC-005, TC-006, TC-007, TC-008, TC-010, TC-013, TC-014, TC-017, TC-018, TC-019, TC-020, TC-021, TC-101, TC-102, TC-105, TC-106, TC-109, TC-125, TC-126 | — | E4、E5 | 12_poc/preregistered-test-plan.md（未作成） |
| C-078 | SDLC の受入基準（ASVS・SSDF） | R-070, R-165, R-187, R-233, R-241 | — | — | — | E3、E4 | 09_assurance/self-assessments.md（未作成） |
| C-079 | クラウド設定レビュー | R-072, R-243 | — | — | — | E6、E10 | 09_assurance/rfp-sow.md（未作成） |

### 6.3 TC→R・G・C

| TC | 名称 | 系統 | R | G | C（試験欄の仮番から） | 凍結 | 証跡（E・所在） |
|---|---|---|---|---|---|---|---|
| TC-001 | 時計・probe・測定器の較正 | 1 | R-169, R-193.6 | — | — | 可 | E4/E5・12_poc/data/（未取得） |
| TC-002 | cross-tenant property te… | 1 | R-168, R-172, R-205 | G-103 | C-049 | 待（KP-4 の p_max） | E4/E5・12_poc/data/（未取得） |
| TC-003 | BOLA・機能／プロパティ単位の認可負例 | 1 | R-071, R-168, R-242 | — | C-049 | 可 | E4/E5・12_poc/data/（未取得） |
| TC-004 | audience 取違えと token exch… | 1 | R-173, R-206 | G-081, G-088, G-103 | — | 可 | E4/E5・12_poc/data/（未取得） |
| TC-005 | issuer mix-up・redirect U… | 1 | R-168, R-173 | G-088, G-103 | C-024 | 可（AS 機能の確認後） | E4/E5・12_poc/data/（未取得） |
| TC-006 | JWT 負例ベクタ（typ・alg・kid・is… | 1 | R-104, R-173 | G-081, G-088 | — | 可 | E4/E5・12_poc/data/（未取得） |
| TC-007 | DPoP replay と盗まれた refres… | 1 | R-168, R-173 | G-081, G-088, G-103 | C-032, C-035 | 可（AS 機能の確認後） | E4/E5・12_poc/data/（未取得） |
| TC-008 | stale allow 継続時間と consis… | 1 | R-080, R-081, R-143, R-144, R-146, R-168, R-171, R-191.1, R-191.3 | — | C-054 | 可 | E4/E5・12_poc/data/（未取得） |
| TC-009 | コンテンツ更新と relation 更新の原子的… | 1 | R-145 | — | — | 可 | E4/E5・12_poc/data/（未取得） |
| TC-010 | PDP 障害・評価不能・誤応答での縮退 | 1 | R-082, R-155, R-174, R-190.1, R-190.2, R-190.4, R-192.1, R-261 | G-058 | — | 可（rs は暫定の扱いで） | E4/E5・12_poc/data/（未取得） |
| TC-011 | 監査経路停止時の階層別挙動 | 1 | R-083, R-176 | G-058, G-092 | — | 待（Q_r・Q_w は複数水準で可） | E4/E5・12_poc/data/（未取得） |
| TC-012 | model migration differen… | 1 | R-147, R-148, R-156, R-168, R-175, R-194.2, R-194.3 | G-147 | C-056 | 可（rollback 時間は記録） | E4/E5・12_poc/data/（未取得） |
| TC-013 | AuthZEN adapter による 2 エン… | 1 | R-089, R-205, R-280 | G-066, G-108, G-117, G-147 | — | 可 | E4/E5・12_poc/data/（未取得） |
| TC-014 | 鍵の緊急 rotation・計画 rotatio… | 1 | R-051, R-052, R-168, R-174, R-189.4, R-189.5, R-189.6, R-195.4 | G-058, G-081 | C-039, C-041 | 可（時間は記録） | E4/E5・12_poc/data/（未取得） |
| TC-015 | 署名 alg の切替（古典 alg の範囲） | 1 | R-104 | — | C-044 | 可 | E4/E5・12_poc/data/（未取得） |
| TC-016 | txn・decision_id・trace_id… | 1 | R-176, R-205 | — | — | 可 | E4/E5・12_poc/data/（未取得） |
| TC-017 | 小規模負荷の p50/p99/p99.9 | 1 | R-078, R-188.2, R-190.1, R-190.3, R-190.4 | — | — | 記録 | E4/E5・12_poc/data/（未取得） |
| TC-018 | 登録・招待・所属変更・複数所属・退職 | 1 | R-034, R-035, R-044, R-168, R-170, R-279, R-283 | G-086 | — | 可 | E4/E5・12_poc/data/（未取得） |
| TC-019 | federation・linking・SCIM・… | 1 | R-036, R-037, R-039, R-040, R-170, R-260 | G-058, G-081, G-086, G-103 | — | 可 | E4/E5・12_poc/data/（未取得） |
| TC-020 | 回復・認証器・step-up の鮮度 | 1 | R-032, R-041, R-045, R-168, R-170 | G-081, G-086 | — | 可 | E4/E5・12_poc/data/（未取得） |
| TC-021 | 認可 graph シナリオ | 1 | R-171, R-205 | G-103 | — | 待（KP-4） | E4/E5・12_poc/data/（未取得） |
| TC-022 | 特権操作・監査改ざん（論理） | 1 | R-054, R-168, R-176, R-231 | G-092, G-103 | — | 可 | E4/E5・12_poc/data/（未取得） |
| TC-023 | 非同期・委任ジョブの再認可 | 1 | R-044, R-143 | G-103 | C-037 | 可 | E4/E5・12_poc/data/（未取得） |
| TC-024 | 署名付き URL・ヘッダ偽装・device co… | 1 | — | G-103, G-136 | — | 待（L_url） | E4/E5・12_poc/data/（未取得） |
| TC-025 | sandbox と本番の信頼分離 | 1 | — | G-081, G-141 | — | 可 | E4/E5・12_poc/data/（未取得） |
| TC-026 | 契約試験・モック一致・CI ガード | 1 | — | G-142 | — | 可 | E4/E5・12_poc/data/（未取得） |
| TC-027 | 一覧・検索の認可（打切り・cursor・側路） | 1 | R-205 | G-103 | — | 可 | E4/E5・12_poc/data/（未取得） |
| TC-028 | 連携パターン参照実装の負例 | 1 | R-191.3, R-205, R-206 | G-103 | — | 可 | E4/E5・12_poc/data/（未取得） |
| TC-101 | 容量段階 P1〜P5（Check tail・最大… | 2 | R-078, R-089, R-188.2, R-190.1, R-190.2, R-190.3, R-190.4, R-205, R-220 | G-056 | — | 待（DL-20） | E4/E5・12_poc/data/（未取得） |
| TC-102 | エンジン比較（OpenFGA と SpiceDB… | 2 | R-089, R-097, R-190.1, R-205, R-271, R-280 | G-056, G-066, G-117 | — | 待（ADR-010 §2.10 の事前登録） | E4/E5・12_poc/data/（未取得） |
| TC-103 | 整合性と stale allow（本番構成） | 2 | R-080, R-081, R-097, R-143〜R-146, R-168, R-191.1, R-220, R-271 | G-058 | — | 待（B、B_rs） | E4/E5・12_poc/data/（未取得） |
| TC-104 | 剥奪伝播の端から端（11 経路） | 2 | R-143, R-168, R-191.3, R-193.1, R-271 | G-058, G-081, G-103 | — | 待（R(t, c)） | E4/E5・12_poc/data/（未取得） |
| TC-105 | cell 内依存の障害注入（PDP・AS・IdP… | 2 | R-039, R-078, R-082, R-174, R-190.1, R-190.2, R-190.4, R-191.1, R-192.1, R-192.5, R-220 | G-058, G-081 | — | 待（D(t)、H、MTPD） | E4/E5・12_poc/data/（未取得） |
| TC-106 | cell・リージョンの封じ込め | 2 | R-078, R-097, R-150, R-168, R-174, R-189.6, R-190.2, R-192.1, R-192.2, R-192.4, R-194.1, R-261, R-271 | G-058, G-081 | — | 待（KD13-1） | E4/E5・12_poc/data/（未取得） |
| TC-107 | noisy neighbor と quota | 2 | R-152, R-190.1, R-190.4 | — | — | 待（DL-20） | E4/E5・12_poc/data/（未取得） |
| TC-108 | 配布の canary・wave・自動 rollb… | 2 | R-148, R-149, R-154〜R-156, R-168, R-175, R-194.1, R-194.2, R-194.3, R-220, R-261 | G-081 | — | 待（R-194.3、B13） | E4/E5・12_poc/data/（未取得） |
| TC-109 | 鍵: KMS・HSM・ceremony・二者統制… | 2 | R-050〜R-054, R-168, R-174, R-189.4, R-189.5, R-195.4 | G-058, G-081 | C-040 | 待（R-189.5、BIA） | E4/E5・12_poc/data/（未取得） |
| TC-110 | PQC への alg 切替とサイズ到達 | 2 | R-104 | — | C-044 | 待（DL-20） | E4/E5・12_poc/data/（未取得） |
| TC-111 | 全 session 失効後の一斉再認証と攻撃時負荷 | 2 | R-188.3, R-195.3 | G-059 | — | 待（R-195.3、DL-58） | E4/E5・12_poc/data/（未取得） |
| TC-112 | 実 IdP の federation・SAML・… | 2 | R-036〜R-040, R-168 | G-058, G-086, G-103 | — | 待（K04 系の許容値） | E4/E5・12_poc/data/（未取得） |
| TC-113 | 認証器・回復・passkey・AiTM（実機） | 2 | R-032, R-041, R-168 | G-081, G-086 | C-020, C-035 | 待（BIA B12） | E4/E5・12_poc/data/（未取得） |
| TC-114 | 監査基盤の端から端（WORM・SIEM・欠損検知） | 2 | R-083, R-126, R-176, R-192.3, R-193.1, R-193.2, R-193.3, R-193.5, R-193.6 | G-058 | — | 待（R-193.x） | E4/E5・12_poc/data/（未取得） |
| TC-115 | 特権・support・break-glass の… | 2 | R-168, R-176, R-231 | G-058, G-081, G-092, G-103 | — | 待（GOV-06 の発動窓） | E4/E5・12_poc/data/（未取得） |
| TC-116 | テナントの統合・分割・移動・削除 | 2 | R-150, R-168 | G-081 | — | 待（BIA） | E4/E5・12_poc/data/（未取得） |
| TC-117 | export・import・出口・製品差替え | 2 | R-091 | G-103 | — | 待（ADR-018 K18-3） | E4/E5・12_poc/data/（未取得） |
| TC-118 | OIDF 適合試験（OIDC・FAPI 2.0） | 2 | R-168 | G-089 | — | 可（全試験合格が基準） | E4/E5・12_poc/data/（未取得） |
| TC-119 | 並行開発パイロットと独立開発者の切替 | 2 | — | G-123, G-144, G-146, G-147 | — | 待（G-146 の基準値） | E4/E5・12_poc/data/（未取得） |
| TC-120 | workload identity・token … | 2 | R-206 | G-103 | — | 待（DL-20） | E4/E5・12_poc/data/（未取得） |
| TC-121 | PEP 網羅と storage guardrail | 2 | R-058, R-059, R-061, R-062, R-168, R-205, R-269 | G-072, G-082, G-103 | — | 待（未観測比率の上限・誤検知率の上限・property test の検出力の下限） | E4/E5・12_poc/data/（未取得） |
| TC-122 | 高リスク連携種別と sandbox の 6 項目 | 2 | — | G-136, G-141 | — | 待（L_url 等） | E4/E5・12_poc/data/（未取得） |
| TC-123 | 脆弱性公表を模した修正期限演習 | 2 | — | G-149, G-150 | — | 待（重大度別期限） | E4/E5・12_poc/data/（未取得） |
| TC-124 | アクセシビリティ適合と代替経路 | 2 | — | G-149, G-150 | — | 待（DL-34 の基準選定） | E4/E5・12_poc/data/（未取得） |
| TC-125 | AI エージェント・MCP の委任 | 2 | R-173, R-206 | G-103 | — | 待（DL-20） | E4/E5・12_poc/data/（未取得） |
| TC-126 | 侵害対応の kill switch・隔離・証拠保全 | 2 | R-174, R-195.2, R-195.5 | G-058, G-081 | — | 待（BIA） | E4/E5・12_poc/data/（未取得） |
| TC-127 | 管理面・CI/CD の保護 | 2 | R-054, R-168, R-231 | G-081 | — | 待（BIA） | E4/E5・12_poc/data/（未取得） |
| TC-128 | 越境共有と一覧・検索の実規模 | 2 | R-205 | G-056, G-058, G-081, G-103 | — | 待（DL-20） | E4/E5・12_poc/data/（未取得） |
| TC-129 | 契約の進化（版・識別子・非推奨） | 2 | R-205 | — | — | 待（DL-20） | E4/E5・12_poc/data/（未取得） |
| TC-130 | 運用・要員負荷の計測 | 2 | — | — | — | 記録 | E4/E5・12_poc/data/（未取得） |
| TC-131 | 利用者負担の指標（login 成功率等） | 2 | R-188.1 | G-147 | — | 記録 | E4/E5・12_poc/data/（未取得） |

### 6.4 RB→S・R・G・C

- 演習（EX-xx）の一覧と合否基準は compromise-runbooks.md §5 にある[^6]。演習の記録（E8）は 0 件である [D]。

| RB | 名称 | S | R | G | C（対応 R から） | 証跡（E・所在） |
|---|---|---|---|---|---|---|
| RB-01 | 署名鍵漏えい | S-02 | R-057, R-110, R-113, R-189.5, R-268 | G-084 | C-039, C-042, C-045, C-071 | E8・08_operations/compromise-runbooks.md §5.6 様式（未取得） |
| RB-02 | token 大量窃取 | S-07, S-15, S-18 | R-057, R-110, R-112 | G-059 | C-055, C-071, C-072 | E8・08_operations/compromise-runbooks.md §5.6 様式（未取得） |
| RB-03 | 自社 IdP・AS 侵害 | S-02, S-06, S-11 | R-057, R-110, R-111, R-268 | G-059 | C-039, C-045, C-071 | E8・08_operations/compromise-runbooks.md §5.6 様式（未取得） |
| RB-04 | 顧客 IdP 侵害 | S-03 | R-057, R-110 | G-059 | C-071 | E8・08_operations/compromise-runbooks.md §5.6 様式（未取得） |
| RB-05 | PDP・policy 改ざん | S-01, S-05 | R-057, R-110, R-116, R-210, R-268 | — | C-039, C-045, C-058, C-071, C-073 | E8・08_operations/compromise-runbooks.md §5.6 様式（未取得） |
| RB-06 | 誤 policy 配布による global allow | S-05 | R-057, R-110, R-210 | — | C-058, C-071, C-073 | E8・08_operations/compromise-runbooks.md §5.6 様式（未取得） |
| RB-07 | 監査基盤停止・改ざん | S-10, S-16 | R-057, R-110 | — | C-071 | E8・08_operations/compromise-runbooks.md §5.6 様式（未取得） |
| RB-08 | CI/CD 侵害 | S-02, S-05, S-08 | R-057, R-268 | G-084 | C-039, C-045, C-071 | E8・08_operations/compromise-runbooks.md §5.6 様式（未取得） |
| RB-09 | support 経路悪用 | S-04 | R-057 | — | C-071 | E8・08_operations/compromise-runbooks.md §5.6 様式（未取得） |
| RB-10 | 第三者連携アプリ侵害 | S-15 | R-057, R-111 | — | C-071 | E8・08_operations/compromise-runbooks.md §5.6 様式（未取得） |
| RB-11 | AI エージェント濫用 | S-14 | R-057, R-111 | — | C-071 | E8・08_operations/compromise-runbooks.md §5.6 様式（未取得） |
| RB-12 | テナント越境漏えい発覚 | S-01, S-09 | R-057 | — | C-071 | E8・08_operations/compromise-runbooks.md §5.6 様式（未取得） |

## 7. 再現手順

1. R-requirements.md・G-goal-criteria.md・deliverables.md から、R-ID・G-ID・DL-ID で始まる表の行を抽出する（§2.1）[D]。
2. R の対応成果物欄のパスを、deliverables.md §8 のパス→DL 表と §5 の ADR 表で DL に読み替える。G の対応成果物欄からは DL-ID を抽出する [D]。
3. G の関連 R 欄の範囲を親 ID に展開し、枝番には親 ID の G を継承させる [D]。
4. control-mapping-ledger.md §5 から R→C、§4.1 から C→試験・証跡、§6 から T→C を抽出する [D]。
5. preregistered-test-plan.md の §3.4・末尾の対応表・R/G 名を見出しに持つ節から R/G→TC を、各 TC の「吸収した仮番」と §6.5 から仮番→TC を作り、numeric-contracts.md の対応表（R→SLI）と SLI 行の仮番に適用する [D]。
6. compromise-runbooks.md の末尾の対応表と見出しから R/G→RB・EX を抽出する [D]。
7. 各 DL のファイルの有無を確認し、§2.4 の規則で G の現状を判定する [D]。
8. 本書の作成には一時的な抽出スクリプトを使った。スクリプトは本リポジトリに置いていない（本書以外を編集しない作業範囲のため）。Phase 4 の自動検査（DL-111）に上記手順を組み込むことを残課題とした [D]。

## 対応表

| 要求 | 内容 | 本書の該当箇所 | 閉じ方 | 状態 |
|---|---|---|---|---|
| R-025 | 全要求を単一統制台帳へ載せ証跡所有者を割当 | §3.2、§5、§6.2（統制台帳の結果を再抽出で確認） | A | 下流区間は孤児 0 件。証跡所有者は統制台帳の割当を転記 |
| R-213 | 保証証跡を要求単位で収集・追跡する仕組み | §5、§6.2 | A | 追跡の仕組みは本書。是正追跡は DL-110。証跡は 0 件取得 |
| R-214 | 保護対象→…→残余リスク受容者の連鎖を双方向に閉じる | §3.6、§5、§6 | A | 上位 10 件の S で連鎖の番号を記入し、許容度項目・合格値の出所・受容者（DCS-05 の RRG と段）を照合した。許容度未対応 2 件（S-18、S-14）、受容者の段の不一致 9 件。受容（E9）は未取得 |
| G-003 | 上位 S-xx の連鎖が途切れない | §3.6 | A | **一部（照合未了）**。番号の区間（S→T→C→TC→RB→K）は途切れ 0 件。許容度の区間は S-18・S-14 で未対応、受容者の区間は GOV-03 §7 と DCS-05 の段が 9 件で不一致（§3.6.2） |
| G-021 | 双方向追跡表と孤児 0 件 | §3 | A | **不合格（是正中）**。孤児 R（上流）6 件、孤児 G 4 件（関連 R なし。抽出時点は重複を除き 10 件、最終整合で更新） |

## 残課題

| # | 課題 | 是正先 | 期限（案） |
|---|---|---|---|
| 1 | G 台帳の関連 R を R-requirements.md の R-ID で再照合し、個別 G 未接続の 78 行（うち G 完全未接続 6 件）に G を割り当てる。§4.4 の候補を出発点にする | G-goal-criteria.md（DL-102）の担当 | Phase 4 |
| 2 | 関連 R を持たない G 4 件の扱い（正式な値とするか R を割り当てるか）を決め、孤児 G の定義を G 台帳に置く | DL-102 の担当、DL-111 | Phase 4 |
| 3 | 区分 C の R 41 行（ラウンド 4 で承認条件 4 の 5 行を TC-121 に割当て、残り 36 行）に TC・RB・EX を割り当てる。設定上限型の数値契約の扱いを決める | 試験計画（DL-22）、数値契約（DL-20） | Phase 4（凍結前） |
| 4 | TH-TC 47 件の吸収先を試験計画に記載する | DL-22、統制台帳（DL-28） | Phase 4（凍結前） |
| 5 | 計画外ファイル 17 件を成果物計画に登録する（最終整合時点で登録済み。DL-111 付録 A.2） | deliverables.md（DL-103） | Phase 4 |
| 6 | 未作成 DL 10 件の作成後に本書を再抽出し、G の現状を更新する（最終整合で 8 件、再最終整合で DL-81 の作成を確認し、G の現状・§3.3・§3.4・§6.1 を更新した。再抽出は未実施。残る DL-59 の作成後に再抽出する） | 本書（DL-104） | 各 DL の作成後 |
| 7 | §7 の手順を自動検査に組み込み、作成者以外が再実行する（DL-111 は作成されたが、孤児 R・G・DL の検査は未実装。consistency-checks.md §7） | consistency-checks.md（DL-111） | Phase 4 |
| 8 | 「充足」の G について、作成者以外が合格基準どおりに内容を確認し、G 台帳 §4.3 の「達成」へ移すか判定する | 独立反証レビュー（DL-108） | Phase 4 |
| 9 | 証跡（E1〜E11）の取得と、本書の証跡列への所在・ハッシュ・取得日の記入 | 各 C の所有者、残課題台帳（DL-110） | Gate ごと |
| 10 | 欄の自由記述に書かれた番号のない参照（§2.1 の注記）を ID に置き換え、機械抽出の取りこぼしをなくす | 各文書の担当 | Phase 4 |
| 11 | G-003 の許容度と受容者の照合を終える。S-18・S-14 の許容度項目を定め、GOV-03 §7 の受容者を DCS-05 の RRG-ID と段に置き換えた後に、§3.6.2 を再照合して G-003 の現状を判定し直す | 本書（DL-104）。前提は他文書への申し送り 1〜4 | Phase 4（DEC-1・DEC-6 の前） |
| 12 | 抽出後に追加された DL-116〜DL-121 を §5・§6 に入れ、DL 総数 121 で再抽出する（DL-120・DL-121 は再最終整合の時点で未作成） | 本書（DL-104） | Phase 4 |
| 13 | G-017・G-037・G-131 の不合格（自動検査の再実行結果）の是正。主張タグ欠落の候補 240 箇所（再最終整合。最終整合は 206 箇所）の抜取り確認と付与、未定義 ID 13 種の解消、POC-02 のメタ情報の補完、§8 にあり未作成の DL-59・DL-120・DL-121 の作成（consistency-checks.md §8・§10） | 各文書の担当、DL-111 | Phase 4（次回決裁の起案前） |
| 14 | 未達（成果物内で開示）の G-012・G-018・G-019・G-022 について、開示された未達の理由（G-012: 写像の要素単位化と範囲外判断の承認、G-018: 版・取得日・ハッシュ・検証者の列と 2 名の突合、G-019: 新パッケージの主張の CL-0288 以降への登録と前提 ID の継承、G-022: 検証記録のない 168 行への記録の付与）が解消した後に、本書の現状を再判定する。POA&M の受け先は OI-R10（G-012）、OI-V02（G-018）、OI-V07（G-022）で、G-019 は未起票（他文書への申し送り 7） | 本書（DL-104） | 各 OI の完了後（段階1 の判定の前） |

## 他文書への申し送り

| # | 宛先 | 内容 | 根拠 |
|---|---|---|---|
| 1 | 01_governance/loss-scenarios.md（GOV-03）§7・決裁案 D | §7 の表に「許容度項目（T/Z/P/L の ID）」と「合格値の出所（SLI-ID。TBD の場合は所有者・期限）」の 2 列を加える。受容者案の欄は 1 シナリオ 1 名とせず、DCS-05 の RRG-ID と段を並べる形に改め、正本を DCS-05 とする旨を書く。S-01・S-15・S-04・S-14 の受容者案（段1）は、DCS-05 の代表行（RRG-001・RRG-044・RRG-017・RRG-049。いずれも段2）と食い違っている | 本書 §3.6.2、DCS-05 §3.1・§6.2[^12]、GOV-03 §7[^8] |
| 2 | 01_governance/risk-appetite-draft.md（GOV-02） | §3.1 の「テナント内の不正アクセス」（S-18、S-04、S-03、S-14）には、§2.2 の許容度項目が対応していない。とくに S-18 と S-14 では、T1 以外に照らす項目がない。乗っ取りと agent 濫用の許容度項目（例: 一定期間の乗っ取り件数、委任範囲外の操作件数）を置くか、T1 だけで扱うことを明記する | 本書 §3.6.2、GOV-02 §2.2・§3.1[^13] |
| 3 | 07_slo/numeric-contracts.md（SLO-01） | S-15 の大量取得の検知時間、S-14 の grant 寿命、S-03 の IdP 追加の待機時間に SLI-ID を採番する。現在は GOV-03 §7 に TBD として残るだけである | 本書 §3.6.2、SLO-01 §5[^7]、GOV-03 §7[^8] |
| 4 | traceability/G-goal-criteria.md（DL-102） | G-003 の合格基準の照合項目に「許容度項目の ID」と「受容者の正本（DCS-05）との一致」を加える | 本書 §3.6、G 台帳[^2] |
| 5 | 06_controls/control-mapping-ledger.md（DL-28）の C-048・C-050 の試験欄 | 試験欄に POC-01 TC-121 を加える。加えた後に本書を再抽出すれば、§6 の C-048・C-050 の TC 欄も TC-121 になる | POC-01 版 0.3 の TC-121[^5]、本書レビュー記録ラウンド 4 |
| 6 | 00_decision/01-executive-summary.md（DCS-01）§10 の追跡性の段落 | 「追跡性は不合格である。」の段落に、G-019 が未達であること（主張台帳 TRC-05 は旧提案書の主張 287 件だけを登録し、決裁事項・ADR の結論を支える新パッケージの主張は未登録）を加える。あわせて、本書が G-012・G-018・G-019・G-022 を「未達（成果物内で開示）」としたことを引く。現在の §10 は G-018 の未達（§1）と G-021 の不合格を書くが、G-019 は書いていない | 本書 §2.4・§4.2、TRC-05 §0・§4[^15]、DCS-01 §1・§10[^17] |
| 7 | traceability/open-items.md（TRC-11、POA&M）§4.7.3 | G-019 の是正を新しい行として起票する（ID は POA&M 側で採番。案: OI-R33）。項目: 決裁事項（DEC-1〜DEC-10）と ADR の結論を支える主張を主張台帳に CL-0288 以降として登録し、[D] の主張に前提の CL／A／RS の ID を、仮定に依存する推論に [A-xxx] を継承させ、作成者以外のレビュアーが「結論から前提まで辿れない主張 0 件」を判定する。区分 A。担当（案）: 主張台帳（DL-105）の担当（登録）、決裁事項・ADR の各文書の所有者（主張の抽出）、判定は作成者以外のレビュアー。期限（案）: 次回決裁の起案前（G-019 は段階1 の判定対象）。出典: 本書 §0 の 5・§4.2・残課題 14。現在の POA&M には G-019 と主張台帳を出典とする行がない（本書の作成時に open-items.md を検索して確認） | 本書 §4.2、G-019 の合格条件[^2]、TRC-05 §0・§4[^15] |

## レビュー記録

| ラウンド | 指摘（重大度・指摘者） | 対応 |
|---|---|---|
| 1 | High（CISO）: §0 の 8 と §3.6 のリスク連鎖の表（GOV-03 §7 も同じ）が閉じていない。(1) 許容度（GOV-02 の T1〜T7、Z1〜Z7、P1〜P6）の欄がなく、合格値と許容度の対応を追えない。(2) 受容者の欄が残余リスク台帳と食い違う。§3.6 と GOV-03 §7 は S-01・S-15・S-03 を「B2B 事業責任者」、S-04・S-18 を「事業責任者」、S-14 を「agent 機能の事業責任者」としているが、DCS-05 は RRG-001・RRG-044・RRG-022・RRG-017・RRG-049 を段2 としている。それにもかかわらず G-003 を「途切れ 0 件」と判定している | §3.6 を番号の区間（§3.6.1）と、許容度・合格値・受容者の区間（§3.6.2）に分けた。§3.6.2 に「許容度項目（GOV-02 の ID）」「合格値の出所（SLI-ID と、TBD の所有者・期限）」「受容者（正本 DCS-05 の RRG と段）」「GOV-03 §7 との照合」の列を設け、DCS-05 §4 の全 RRG 行を突き合わせた。その結果、許容度未対応が 2 件（S-18、S-14）、受容者の段の不一致が 9 件（全行一致は S-08 だけ）となった。G-003 を「充足」から「一部（照合未了）」に改め、§0 の 5・8、§2.4、§4.2、§4.3、対応表を更新した。GOV-03・GOV-02・SLO-01・G 台帳への修正は「他文書への申し送り」1〜4 に記載し、残課題 11 を加えた |
| 最終整合（Phase 4、2026-10-15） | 指摘ではなく、抽出後の作業ツリーの変化（DL-35・36・37・82・108・109・111・112 の作成、自動検査の再実行、独立反証・模擬パネルの記録）への追随 | §0 の 3〜5、§3.1、§3.3、§3.4、§4.2、§4.3（13 件の G の現状と × 印）、§5 の × 印、§6.1 の状態、対応表、残課題 5〜7・12・13 を更新した。G→R・R→DL→C の再抽出はしていない（残課題 6・12）。判定の根拠は §4.2 の注記に書いた |
| 4 | High（cto）: 承認条件 4（R-269）を判定する TC が事前登録計画に対応付けられていない。TC-121 は R-205 だけに対応付けられ、本書は R-269 を「TC・RB・EX のいずれにも未割当」としている。G4 で何を測れば承認条件 4 が閉じるかが事前登録されておらず、事後に基準を作れる | 対応した。POC-01 版 0.3 で TC-121 の対応要求に R-269・R-058〜R-062 が加わり、判定量 3 つが合否基準 (7) として凍結対象に書かれたことを確認した[^5]（同じラウンドで同じ担当が POC-01 を修正）。§3 の未割当一覧の 5 行（R-058・R-059・R-061・R-062・R-269）、§5 正引き表の同じ 5 行、§6 の TC-121 行（R・G・凍結の欄）、§3 の PEP 網羅の注記、§0 の 6・§3.1 の件数（41 → 36。抽出時点の値は残した）、残課題 3、[^5] を更新した。再抽出はしていない。C-048・C-050 の TC 欄は統制台帳の試験欄からの抽出値であり、本書では変えていない（統制台帳の試験欄の更新は他文書への申し送り 5 とした） |
| 6 | High（audit）: G-019 と G-022 を「充足」としているが、正本はどちらも未達と明記している。DCS-02 §1 は検証記録のない行が 168 件残るため G-022 は未達とし、TRC-05（版 0.1）は旧提案書の主張 287 件だけを登録して新パッケージの主張は未登録で、自ら G-019 の合格条件に対して未達と書く。合格条件の中身が正本で不合格と判明している G まで「充足」に数えるのは自己評価の上振れである（§0 の 5、§4.2 の集計、§4.3 の G-019・G-022 行） | 対応した。(1) §2.4 に「未達（成果物内で開示）」の区分を加え、判定者の未実施だけを理由とする「未達」の記述（G-008、G-055 など）とは区別する規則を書いた。(2) 指摘の 2 件に加え、同じ規則で対応成果物を検索し、G-012（CTL-01 §0）と G-018（TRC-05 §4、TRC-06 §0）も該当することを確認して移した。原典の記述は DCS-02 §0 の 4・§1[^14]、TRC-05 §0・§4[^15]、TRC-06 §0[^16]、CTL-01 §0[^4] で確認した。(3) §0 の 5（充足 55 → 51、未達（成果物内で開示）4）、§4.2 の集計表・段階別表・段階1 の机上準備件数（78 → 74）と注記、§4.3 の 4 行、§2.4 の他の区分の古い「本版では」の記述を更新し、残課題 14 を加えた。(4) DCS-01 §10 への G-019 の追記と POA&M への G-019 の起票（所有者・期限の案を含む）は、本書の担当外のため他文書への申し送り 6・7 とした。G-012・G-018・G-022 は POA&M の OI-R10・OI-V02・OI-V07 が受けている。再抽出はしていない |
| 再最終整合（続行ワークフローの報告段、2026-10-15） | 指摘ではなく、模擬パネル ラウンド 4〜7 の是正の後の作業ツリーの変化（POC-02 版 0.1 の作成、TRC-09 版 0.3、TRC-10 版 0.4、自動検査の再実行 TRC-12 §10、DL-120・DL-121 の追加）への追随 | §0 の 3・5、§3.3、§4.2 の注記（再最終整合での確認）、§4.3・§5 の「×DL-81」14 箇所の × 印、§6.1 の DL-81 行、残課題 6・12・13 を更新した。G の現状の区分と件数は変わらない。G→R・R→DL→C の再抽出はしていない |

- 本記録は模擬パネルによる自己レビューへの対応、および AI エージェント（final-consistency 担当）による更新であり、実在の CTO/CISO の決裁ではない [D][^11]。

## 参考文献

[^1]: 本リポジトリ『原子要求追跡表（レビュー指摘の原子化）』版 0.2・2026-10-03. traceability/R-requirements.md （参照箇所: §1, §2.1, §4, §6、確認日: 2026-10-15）
[^2]: 本リポジトリ『/goal 受入基準（G-001〜G-151）』版 0.2・2026-10-03. traceability/G-goal-criteria.md （参照箇所: §0, §4.1〜§4.5, §6, §8, §9、確認日: 2026-10-15）
[^3]: 本リポジトリ『成果物計画（マスターファイル計画）』版 0.1・2026-10-03. traceability/deliverables.md （参照箇所: §1, §2.1, §2.2, §3〜§5, §7, §8、確認日: 2026-10-15）
[^4]: 本リポジトリ『統制マッピング台帳（本体）』版 0.1・2026-10-15. 06_controls/control-mapping-ledger.md （参照箇所: §0（G-012 は未達とする記述）, §3.1, §4.1, §5, §6, §7.2, §7.3、確認日: 2026-10-15）
[^5]: 本リポジトリ『高保証 PoC 試験計画（事前登録）』版 0.3・2026-10-15. 12_poc/preregistered-test-plan.md （参照箇所: §3.4, §4〜§5 の各 TC の吸収した仮番・関連, §5.3 の TC-121（関連欄の R-269・R-058・R-059・R-061・R-062、合否基準 (1)〜(7)）, §6.1〜§6.5, 対応表（R/G。承認条件 4 の 5 行の節を含む）, 残課題 12、確認日: 2026-10-15）
[^6]: 本リポジトリ『侵害別 runbook・演習計画』. 08_operations/compromise-runbooks.md （参照箇所: §1.3, §5, 対応表、確認日: 2026-10-15）
[^7]: 本リポジトリ『数値契約台帳（SLI/SLO）』. 07_slo/numeric-contracts.md （参照箇所: §5, 対応表、確認日: 2026-10-15）
[^8]: 本リポジトリ『重大損失シナリオ登録簿（FAIR 形式）』. 01_governance/loss-scenarios.md （参照箇所: §3, §7、確認日: 2026-10-15）
[^9]: 本リポジトリ『脅威カタログ・残余リスク記録』. 03_threat-model/threat-catalog.md （参照箇所: 各 T の分類欄、確認日: 2026-10-15）
[^10]: 本リポジトリ『KRI 定義・四半期報告様式』. 01_governance/kri.md （参照箇所: KRI 定義表の主な S 欄、確認日: 2026-10-15）
[^11]: 本リポジトリ『執筆規約（全成果物共通）』2026-10-03. CONVENTIONS.md （参照箇所: §1, §3, §6, §8、確認日: 2026-10-15）
[^12]: 本リポジトリ『残余リスク台帳』DCS-05 版 0.1・2026-10-15. 00_decision/05-residual-risk-register.md （参照箇所: 冒頭の表記注記（段1〜段3）, §3.1, §4.1〜§4.15, §5, §6.2、確認日: 2026-10-15）
[^13]: 本リポジトリ『リスク選好・許容度ステートメント（決裁案）』GOV-02 版 0.1・2026-10-03. 01_governance/risk-appetite-draft.md （参照箇所: §2.2, §2.3, §3.1, §3.3〜§3.7, §5、確認日: 2026-10-15）
[^14]: 本リポジトリ『前回指摘対照表（CTO/CISO レビュー指摘 R 全件の閉じ方と状態）』DCS-02 版 0.3・2026-10-15. 00_decision/02-prior-findings-crosswalk.md （参照箇所: §0 の 4（検証記録のある行 152 件・ない行 168 件）, §1（「検証記録のない行が 168 件残るため G-022 は未達」）, §2.1 の計の行、確認日: 2026-10-15）
[^15]: 本リポジトリ『主張台帳（旧提案書の主張の初期登録）』TRC-05 版 0.1・2026-10-03. traceability/claims-ledger.md （参照箇所: §0（主張数 287、CL-0001〜CL-0287 は旧提案書から抽出、「G-019 の合格条件…に対して未達」）, §4（版・取得日・スナップショットハッシュ・検証者の列を含めない「G-018 未達」、新構成の主張は CL-0288 以降として追記）、確認日: 2026-10-15）
[^16]: 本リポジトリ『引用監査（旧提案書側）: 参考文献 60 件』TRC-06 版 0.1・2026-10-03. traceability/citation-audit-proposal.md （参照箇所: §0（作成者以外の照合者 2 名による突合は未達）、確認日: 2026-10-15）
[^17]: 本リポジトリ『エグゼクティブ要約（決裁用 1 枚）』DCS-01 版 0.6・2026-10-15. 00_decision/01-executive-summary.md （参照箇所: §1 の表（G-018 の未達）, §10（追跡性の段落。G-019 の記載なし）、確認日: 2026-10-15）
