# 残課題・是正追跡（POA&M）

> 文書ID: TRC-11 / 版: 0.3 / 状態: draft / 最終更新: 2026-10-15（0.2: 模擬パネル ラウンド 2 の指摘により、作業ツリーに合わせて再集計した。0.3: Phase 4 の最終整合で、独立反証レビューの未回答項目と模擬パネルの非机上指摘を §4.11 に追加し、OI-M02・OI-M03 の状態を更新した。末尾「レビュー記録」）
> 対応要求: R-076, R-187, R-273, R-202, G-130, G-034, G-016（主なもの）
> 依存文書: CONVENTIONS.md, traceability/deliverables.md（DL-110）, traceability/independent-challenge-review.md（DL-108）, traceability/mock-panel-report.md（DL-109）, traceability/consistency-checks.md（DL-111）, traceability/R-requirements.md, traceability/G-goal-criteria.md, traceability/traceability-matrix.md（§0、残課題）, 00_decision/00-cover.md〜08-alternatives-comparison.md（残課題・他文書への申し送り）, 01_governance/assumptions-register.md, 01_governance/exception-risk-acceptance.md, 01_governance/stop-authority.md, 05_adr/README.md（§6）, 05_adr/reconciliation-notes.md, 09_assurance/independent-assurance-plan.md, 09_assurance/rfp-sow.md, 12_poc/preregistered-test-plan.md, および §7 に挙げた各文書の「残課題」節
> 作成方法: AI エージェント（Claude）が、2026-10-15 時点の全成果物の「残課題」節、05_adr/README.md §6（未決論点 166 件）、05_adr/reconciliation-notes.md §5（U-01〜U-04）を通読し、担当・閉じるゲート・閉じ方が同じものを束ねて POA&M の行にした。版 0.2 では、2026-10-15 の作業ツリーで成果物ファイルの有無を確認し、00_decision の 9 文書と Phase 4 の traceability 文書の残課題・申し送りを読み直して行を追加した。集約・状態判定は自己レビューであり、実在の CTO/CISO の決裁ではない（CONVENTIONS §8）[D]。
> 表の注記: 表のセルでタグのないものは、出典文書の記述を転記・要約した設計推論 [D] であり、この注記で個別のタグに代える。

## 要旨

- 本書は、経営承認・第三者評価・実測・本番運用実績を待つ未達事項と、文書間の是正項目を、担当（役割）・期限（ゲート基準の相対期限）・依存ゲート・状態で追跡する POA&M である [D]。
- 2026-10-15 時点の POA&M は 151 行である（版 0.1 の 127 行に、版 0.2 で 16 行、版 0.3 で 8 行を追加）。版 0.3 の 8 行は、独立反証レビュー（DL-108）の未回答 3 件と残課題 ICR の束（OI-J01〜OI-J04）と、模擬パネル（DL-109）が非机上として指摘から除いた事項（OI-P01〜OI-P04）である（§4.11）[D]。以下の版 0.2 の内訳は、§4.11 を除いた 143 行のものである。内訳は、組織決定（B）43 行、横断未決 4 行、数値 TBD 11 行、実測（C）17 行、第三者評価（D）10 行、本番運用実績 6 行、是正項目 32 行、法務・規制 9 行、照合・独立レビュー 7 行、成果物の作成・検証 4 行である（§3）[D]。期限別では G3・DEC-3 が 35 行、G0 が 34 行、G4・DEC-4 が 21 行で多い [D]。
- 状態が「完了」の行は 1 行（棄却仮説の集約）だけで、その行も作成者以外の判定（G-008）は未達である [D]。残る 142 行に、達成済みと扱える行はない [D]。
- 追跡性は不合格である。追跡表（DL-104）は G-021 を「不合格（是正中）」とし、個別の G に結び付かない R が 78 行（G に全く結び付かない R が 6 件）、TC・RB・EX のいずれにも未割当の区分 C の R が 41 行、TC への吸収先が記録されていない TH-TC が 47 件あるとしている [D][^5]。版 0.2 でこれらを OI-R21〜OI-R24 として登録した（§4.7.3）[D]。
- 00_decision の 9 文書、追跡表、自動検査、変更履歴、ルートの README、PoC コードの README（DL-82）は 2026-10-15 の作業ツリーに存在するが、いずれも draft・未コミットで、作成者以外の検証を経ていない [D]。状態は「作成済み・作成者以外の検証待ち」とした（OI-M01、OI-M04）[D]。未作成は DL-59、DL-81、DL-108（付属 J）、DL-109、RS-18 の検証記録である（OI-M02、OI-M03）[D]。版 0.3 の時点（最終整合）では、DL-108・DL-109 と 12_poc/code/README.md（DL-82）も作成済みであり、未作成は DL-59、DL-81 の実測レポート、RS-18 の検証記録だけである [D]。
- 経営承認（DEC-1〜DEC-9）はすべて決裁前である [D]。29 本の ADR はすべて proposed であり、accepted は 0 本である [D]（05_adr/README.md 要旨）。
- 実測（[M]）は 0 件であり、PoC の試験案（ADR 仮番 412 件ほか）は採番・事前登録の途中である [D]（12_poc/preregistered-test-plan.md 残課題 1・2）。
- 第三者評価は 1 件も実施していない [D]（09_assurance/independent-assurance-plan.md 残課題 8）。したがって Critical/High の指摘は 0 件だが、これは「未解決が無い」ことではなく「未評価」であることを示す [D]（§5）。
- 最も多くの行が依存する未決は U-01（issuer の粒度）である [D]。U-01 は DEC-3 と DEC-8 の前提条件であり、13 本の ADR の記述・試算・手順がその結論に依存する [D]（05_adr/README.md §4.2、reconciliation-notes §5）。
- 次に依存の多い未達は、BIA の事業責任者署名（OI-B05）と G0 の日付の未決定（OI-B42）である [D]。前者は数値 TBD のほぼ全行の前提である [D]。後者について、DL-42（00_decision/06-gate-plan-and-plan-b.md、版 0.2）は作成済みだが、固定するのは次のゲートの日付だけとし、G0 の日付は経営会議・取締役会の開催予定から決めるとしており、その日付はまだ決まっていない [D][^7]。このため本書で日付にできるのは、G0 の日付の決定後に期限 G0 の行だけであり、それより後のゲートの行は相対期限のまま残る [D]。
- 民間組織では POA&M に将来の緩和を載せることで受容の代わりにする扱いは認められない（NIST IR 8286B-upd1: "is not permissible in private industry"）[N][^1]。本書の行は受容ではなく、受容が要る残余リスクは例外・受容票（GOV-07、RA-）で別に扱う [D]。

---

## 1. 本書の位置付けと使い方

### 1.1 目的

- 本書は deliverables.md の DL-110 である [D]。CONVENTIONS §8 は、経営承認・第三者評価・本番運用実績が必要な事項を「未達」として残課題に載せ、達成済みと書かないことを求める [D]。本書はその台帳である [D]。
- G-130 は、未達事項が残課題台帳に「未達」として載り、証拠のない「達成」「完了」の表記が 0 件であることを合格条件とする [D]（G-goal-criteria.md G-130）。
- R-076・R-273・G-034 は、独立設計レビュー、conformance、cross-tenant pentest、red team の Critical/High が是正と再試験で閉じているか、経営承認付きの期限付き受容になっていることの証跡を求める [D]。本書 §5 はその是正追跡（E11）の置き場所である [D]。
- R-187 は、脆弱性の根本原因を将来の開発へ反映する工程を求める [D]。本書 §6 はその記録の置き場所である [D]。
- レビュー原文は、Gate 5 で Critical/High の未解決事項は原則として本番移行を止め、例外は期限・補完統制・影響範囲・責任者・失効条件を記した経営承認付きの risk acceptance に限るとしている [D][^3]。

### 1.2 集約の規則

- 正本は各出典文書である [D]。本書は各文書の残課題を決め直さない [D]。食い違いがあれば出典文書の記述を正とし、本書を直す [D]。
- 担当・閉じるゲート・閉じ方（A〜D）が同じ残課題は 1 行に束ねた [D]。束ねた元の項目は「出典」列で追える [D]。
- 05_adr/README.md §6 が数えた未決論点 166 件（U-01〜U-04 の 4 件、決裁案 105 件、ADR 間の論点 57 件）は、U-01〜U-04 を §4.2 に、決裁案を §4.1 の ADR 別の行に、ADR 間の論点を §4.7 の改版先 ADR 別の行に割り当てた [D]。
- 各文書の「前提台帳への新規仮定の登録」は、文書ごとに同じ形の残課題であるため、§4.7.2 の 2 行（OI-R19、OI-R20）に束ねた [D]。
- 各文書の「作成者以外による原典照合」も同じ理由で §4.9 に束ねた [D]。

### 1.3 本書で扱わないもの

- 各 ADR の TBD のうち、出典の ADR が §2 で所有者・期限を持つ数値は、§4.3 の数値 TBD の行に主題ごとにまとめ、個々の値は列挙しない [D]。値の正本は DL-20（07_slo/numeric-contracts.md）と各 ADR である [D]。
- PoC の試験ケース単位の進捗は 12_poc/preregistered-test-plan.md（DL-22）と DL-81 で追う [D]。本書は試験群単位で追う [D]。

---

## 2. 凡例

### 2.1 列の意味

| 列 | 意味 |
|---|---|
| ID | 本書のローカル ID（OI-＜分類文字＞＜連番＞）。CONVENTIONS §2 への登録は OI-R17 で扱う |
| 項目 | 閉じるべき事項の要約 |
| 区分 | CONVENTIONS §6 の閉じ方（A 机上、B 組織決定、C 実測、D 第三者）。本番運用実績が要るものは C・D に「運用」を付記 |
| 担当（役割） | 閉じる責任を持つ役割。正式な役割名は RACI（DL-04）確定後に揃える |
| 期限（相対） | 閉じるべきゲート。日付は、DL-42（ゲート計画、DCS-06）の規則により次のゲートの日付が決まった行から置く。G0 の日付は未定である（OI-B42） |
| 依存ゲート | 先に満たされている必要がある決裁・実測・成果物、または他の OI 行 |
| 状態 | §2.2 の値 |
| 出典 | 残課題を記した文書と項番 |

### 2.2 状態の値

| 状態 | 意味 |
|---|---|
| 未着手 | 閉じるための作業（決裁案・計画・試験案）がまだない |
| 案あり・決裁前 | 決裁案（選択肢・推奨・帰結）は文書にあるが、決める人が決めていない |
| 計画あり・未実施 | 試験・評価・演習の計画や試験案はあるが、実施していない |
| 申し送り済み・未反映 | 宛先文書の所有者に申し送ったが、宛先側が改版していない |
| 並行作業中 | 2026-10-15 時点で別の作業が進めている |
| 作成済み・作成者以外の検証待ち | 成果物ファイルは作業ツリーにあるが、作成者以外の検証（G-016 ほかの判定者による確認）を経ていない。閉じた扱いにはしない |
| 完了 | 閉じた証跡の所在を「出典」列に記した。証跡のない「完了」は書かない |

### 2.3 ゲートと段階の表記

- G0〜G6 はレビュー原文の Gate 0〜6 を指す [D][^3]。DEC-1〜DEC-9 は deliverables.md §6.1 の暫定定義による [D]。
- 段階1〜段階3 は G-goal-criteria.md §4.2 の到達段階（決裁可能・実証済み・成立認定）を指す [D]。
- Phase 4 は本プログラムの作業工程（自動検査・模擬パネル）であり、Gate とは別の番号体系である [D]（deliverables.md §2）。

---

## 3. 集計

### 3.1 分類別の行数

| 分類 | 節 | 行数 | うち「完了」 |
|---|---|---|---|
| 組織決定（B） | §4.1 | 43 | 0 |
| 横断未決（U-01〜U-04） | §4.2 | 4 | 0 |
| 数値 TBD | §4.3 | 11 | 0 |
| 実測（C） | §4.4 | 17 | 0 |
| 第三者評価（D） | §4.5 | 10 | 0 |
| 本番運用実績 | §4.6 | 6 | 0 |
| 是正項目（文書間・台帳） | §4.7 | 32 | 1 |
| 法務・規制 | §4.8 | 9 | 0 |
| 照合・独立レビュー | §4.9 | 7 | 0 |
| 成果物の作成・検証 | §4.10 | 4 | 0 |
| 独立反証の未回答・模擬パネルの非机上指摘（版 0.3） | §4.11 | 8 | 0 |
| 計 | | 151 | 1 |

- 前提台帳への登録 3 行（OI-R19、OI-R20、OI-R31）は是正項目の 32 行に含めた [D]。
- 「完了」1 行は OI-R16（棄却仮説の集約）である [D]。
- 版 0.2 で追加した 16 行は、OI-B42・OI-B43、OI-R21〜OI-R32、OI-V07、OI-M04 である [D]。追加の契機は模擬パネル ラウンド 2 の指摘であり、出典は追跡表の §0・残課題[^5]と、00_decision の各文書の残課題・申し送り[^6][^7][^8][^9][^11][^12][^13][^14][^15]である [D]。

### 3.2 期限（相対）別の行数

| 期限（期限欄の最初に書いたゲート） | 行数 | 主な内容 |
|---|---|---|
| G0（統治。DEC-2・DEC-7・次回決裁の起案時・決裁パッケージ提出前を含む） | 36 | DEC-1、BIA 署名、統治規程の承認、法域判定、保持期間、G0 の日付、受容票、G-021 の是正、決裁パッケージの整合 |
| G1〜G2 | 23 | 操作 5 分類・ID ライフサイクルの決裁、脅威カタログ改版、統制台帳、法令・規範の本文取得、決裁文書の新規仮定の登録 |
| G3（ADR と選定）・DEC-3・段階 1 | 36 | ADR 決裁案、U-01、製品選定、ADR の改版、DEC-3 前の ADR・dissent-log の改版、DEC-8 の 2 段化 |
| DEC-8 前 | 8 | 連携契約 v1 の凍結と、その前提の契約・値、区分 C の R 41 行、TH-TC 47 件 |
| G4（PoC）・DEC-4 | 22 | 数値 TBD、PoC 実測、演習、PoC 予算の総額 |
| G5（独立保証） | 5 | 第三者評価、Critical/High の是正 |
| G6・継続ゲート | 6 | 本番運用実績 |
| Phase 4 | 13 | 照合、自動検査、模擬パネル、未作成成果物、作成済み成果物の検証、G-003 の照合、DEC-7 の前提の検証 |
| その他（次版・次回月次更新） | 2 | ADR 索引の保守、standards-status の更新 |
| 計 | 151 | |

- 1 行が複数のゲートにまたがる場合は、期限欄の最初に書いたゲートで数えた [D]。
- 版 0.2 の追加 16 行の内訳は、G0 が 6 行（OI-B42、OI-B43、OI-R21、OI-R22、OI-R26、OI-R30）、G1〜G2 が 1 行（OI-R31）、G3・DEC-3 が 3 行（OI-R28、OI-R29、OI-R32）、DEC-8 前が 2 行（OI-R23、OI-R24）、G4・DEC-4 が 1 行（OI-R27）、Phase 4 が 3 行（OI-R25、OI-V07、OI-M04）である [D]。既存行の期限は変えていない [D]。
- 版 0.3 の追加 8 行の内訳は、G0 が 2 行（OI-P01、OI-P02）、G1〜G2 が 3 行（OI-J01、OI-J03、OI-P04）、G3 が 1 行（OI-J02）、G4 が 1 行（OI-P03）、Phase 4 が 1 行（OI-J04）である [D]。

---

## 4. POA&M 本体

### 4.1 組織決定（B）

#### 4.1.1 DEC-1〜DEC-9

| ID | 項目 | 区分 | 担当（役割） | 期限（相対） | 依存ゲート | 状態 | 出典 |
|---|---|---|---|---|---|---|---|
| OI-B01 | DEC-1: リスク選好・受容しないリスク・別表の決議、重大損失シナリオの順位、データ分類体系、対象法域の承認（議事録 E1） | B | 取締役会・経営会議（起案: CISO・CTO・事業責任者） | G0 | OI-B05（BIA 署名）、OI-L01（法域判定）、OI-B07（単価・校正） | 案あり・決裁前 | risk-appetite-draft #1・#2、loss-scenarios（決裁案 A・D）、data-classification #1、applicability（L-01） |
| OI-B02 | DEC-2: プログラム憲章（DCS-04）と 20 年耐久性憲章（D47-1、D47-4）の承認。あわせて目的 O-1〜O-5 の事業戦略への紐付け、§5.3 の採点の重みと SC-6 の閾値、将来提供の 2 機能のゲート（ARC01-D1） | B | CTO＋CISO（O-1〜O-5 の紐付けは事業責任者） | DEC-2 | OI-B17、OI-M01（DCS-04 は作成済み・作成者以外の検証待ち） | 案あり・決裁前 | durability-charter-20y #1、04-program-charter 残課題 1・4・5・8 |
| OI-B03 | DEC-3: 不可逆決定 ADR-001・ADR-007・ADR-013・ADR-021・ADR-022 の v1 承認。あわせて議題化を提案された ADR-009 P09-1、ADR-018 K18-5、ADR-020 P-1、ADR-026 L26-2 | B | CTO（アーキテクチャ審査会）＋CISO 同意 | G3 | OI-U01（U-01）、OI-C04（製品選定 PoC）、OI-B26 | 案あり・決裁前 | ADR-001 #1、ADR-013、ADR-021 #1、ADR-022、05_adr/README §5.2 |
| OI-B04 | DEC-4: Gate 4 PoC 入場（予算上限、要員と稼働率、期間上限、事前登録仮説と合否・中止基準、合成データ限定、パイロット参加確約）。DCS-03 §4.4 の 2 段（第 1 段: 決め方・要員費の上限・要員・期間・事前登録、第 2 段: 総額）、PoC 要員の氏名・稼働率のライン長確約、パイロット 2〜3 サービスの選定と確約（G-052） | B | CTO＋CISO＋CFO、各ライン長、候補サービスのオーナー | G4 入場前 | OI-C01（事前登録の凍結）、OI-B09（要員）、OI-R27（非要員費と予備費率） | 案あり・決裁前（DCS-03 §4.4、DCS-07 §6・§8） | deliverables §6.1、preregistered-test-plan #6・#8、03-decision-items §4.4、07-organization-and-tco 残課題 1、04-program-charter 残課題 2 |
| OI-B05 | BIA: 全事業ドメインの票 A〜D の記入、事業責任者の署名（E2）、相関影響（X6・X9）の経営承認、影響度 1〜3 の基準、仮置き MTPD（NA-01）の署名 | B | 各事業責任者、経営会議、CFO | G0 | As-Is の初回置換（OI-C13）は G1 だが、BIA は仮置きで先行 | 案あり・決裁前 | business-impact-analysis #1〜#4、fail-mode-matrix（BIA 行）、numeric-contracts #1 |
| OI-B06 | DEC-5: 独立保証計画の承認と、内部監査による独立性確認手順の合意。DP-ASR-1〜DP-ASR-5 の決定 | B | CISO、内部監査責任者 | G0（DP-ASR は DEC-4 まで） | なし | 案あり・決裁前 | independent-assurance-plan #1・#2 |
| OI-B07 | 損失の金額化: MP-01〜MP-09 の単価、推定枠の校正ワークショップ、ALE の計算、二次損失の額、全面停止時の財務影響と財務レビュー（G-045） | B | CFO＋事業責任者、CISO 配下のリスク機能、法務責任者 | G0 | OI-B05 | 案あり・決裁前 | loss-scenarios（決裁案 B・C）、business-impact-analysis #5〜#7、tco-vendor-lts #4、kri #4 |
| OI-B08 | DEC-6: PoC 期間限定の残余リスク受容票（DP05-7）の起票と承認（E9） | B | パイロット事業の事業責任者 | G4 入場前 | OI-B04、OI-B11 | 未着手 | exception-risk-acceptance #4 |
| OI-B09 | 要員・予算の確約: SRE 8 名以上（K1-2、KD13-5）、CAM・facade の要員（ADR-011 決裁案 1）、移行専任要員（K27-3）、ライン長確約（DP-OM-1〜DP-OM-8）、CISO 組織・第 2 線・内部監査の人員と予算 | B | 経営会議、CFO＋人事責任者、CTO | G0（統治系の人員）、G3／DEC-4（技術要員） | OI-R12（ADR 間で重複を除いた FTE） | 案あり・決裁前 | ADR-001 #2、ADR-013、ADR-011 #1、operating-model #1・#12、raci-governance #6 |
| OI-B10 | DEC-7: 前回指摘のうち検証済み項目のクローズと、繰延べ項目のゲート割当。DCS-02 の繰延べ 23 行（G5 11 行、G6 12 行）のゲート割当・期限・担当の決裁と本書への登録 | B | CTO＋CISO | G0 | OI-V07（クローズの前提の検証）、OI-R21・OI-R22（G-021 の是正） | 案あり・決裁前（DCS-03 §4.7、DCS-02） | deliverables §6.1、03-decision-items §4.7、02-prior-findings-crosswalk 要旨 3・残課題 5 |
| OI-B11 | DEC-9: Plan B（マネージド IdP＋サービス内認可ライブラリ＋共通契約）の事前承認。M1〜M8 を満たす managed 候補がない場合の既定経路、Plan B の内部 token 方式と組込みライブラリ候補の ADR（発動時） | B | CTO＋CISO（経営へ報告） | G0 | OI-R30（DEC-9 決議文案の改訂 H-4） | 案あり・決裁前（DCS-06 §6、DCS-03 §4.9、DCS-08 K44-1） | deliverables §6.1、06-gate-plan-and-plan-b 残課題 4・5・14、08-alternatives-comparison 残課題 7 |

#### 4.1.2 統治規程（01_governance）

| ID | 項目 | 区分 | 担当（役割） | 期限（相対） | 依存ゲート | 状態 | 出典 |
|---|---|---|---|---|---|---|---|
| OI-B12 | RACI・例外受容・停止権限の 3 規程の経営会議承認と取締役会報告（E1）。DP-1〜DP-7、DP05-1〜DP05-6、DP46-1〜DP46-8 の決定 | B | 経営会議（起案: 第 2 線・CISO） | G0（DP-6・DP05-6・DP46-6 は G3） | OI-B13（事前閲読） | 案あり・決裁前 | raci-governance #1〜#3、exception-risk-acceptance #1〜#3、stop-authority #1〜#3 |
| OI-B13 | 第 2 線と内部監査による統治規程の事前閲読と所見（G-039） | B | 内部監査責任者 | 決裁パッケージ提出前 | 3 規程の draft（済） | 未着手 | raci-governance #12、exception-risk-acceptance #18、stop-authority #12 |
| OI-B14 | 受容階層の段の境目（金額・停止時間・影響テナント数）、手続の目標期間・更新回数の上限、受容票の保存期間と開示基準、第 2 線が無い場合の代替 | B | CFO＋事業責任者＋CISO、第 2 線、CEO、法務 | G0 | OI-B07 | 案あり・決裁前 | exception-risk-acceptance #5・#6・#15・#17、raci-governance #4 |
| OI-B15 | 停止権限の時間値（代行への移行、K4 の CEO 連絡待ち、S1 宣言から格付け確定、K2 の事後二者確認、freeze 継続判断、S4 の段階実行速度）と、鍵緊急失効の二者を 24/365 で揃える体制 | B | CISO＋SRE 責任者、CTO | G0／G3／G4 | OI-B12 | 案あり・決裁前 | stop-authority #4・#11 |
| OI-B16 | KRI: 決裁案 K-A〜K-E、K-xx の採番、§5 の閾値、CISO 直接報告の発動閾値、各文書の KRI 候補（CB-KRI-01〜16、認可モデル 3 件、claim 2 件、移行固有、ドメイン統制、K-05 への削除伝播、R-15）の取込み | B | 経営会議・取締役会（起案: CISO＋第 2 線）、KRI 所有者（CISO） | G0（定義）、G4（実測による校正） | OI-C14（基準値の実測） | 案あり・決裁前 | kri #1〜#2、incident-casebook R-3、authorization-model #10、claims-catalog #5、phased-rollout #11、data-outside-pep #2・#12 |
| OI-B17 | 耐久性: 計画期間と再決裁周期・期限超過時の既定動作（D47-2、D47-3）、耐久性維持枠の採否と額（D47-5）、§5.10 の T1〜T11 | B | 経営会議、CFO＋CTO | G0／DEC-4 | OI-B02 | 案あり・決裁前 | durability-charter-20y #2・#3・#7 |
| OI-B18 | 統治の新設要素: IC の役割と停止権限の参照を RACI へ追加、説明責任条項と就業規則・委託契約の整合、誤った公表・報告の訂正期限 | B | 第 2 線、法務＋人事責任者、法務＋CISO | G0 | OI-B12 | 未着手 | stop-authority #7、raci-governance #8・#9、compromise-runbooks #2・#7 |

#### 4.1.3 要件・脅威モデル（02・03）

| ID | 項目 | 区分 | 担当（役割） | 期限（相対） | 依存ゲート | 状態 | 出典 |
|---|---|---|---|---|---|---|---|
| OI-B19 | 操作 5 分類の決裁（REQ03-D1〜D5）、DIRM の実施、全業務操作の分類登録（入口約 1.2 万）と各サービスの申告 | B | CISO＋事業責任者、各ドメイン責任者 | G1（登録完了は G3） | なし（登録の様式は DL-67 にある） | 案あり・決裁前 | operation-risk-tiers-assurance、business-impact-analysis #13、ADR-002（DIRM） |
| OI-B20 | ID ライフサイクル IL-D1〜IL-D8、主体カタログ決裁案 1〜7（識別子の形式、類型×操作階層の xAL、エージェントを独立主体とするか委任＋act とするか、実行途中の人の承認方式） | B | §21・§7 の各決める人、CTO（ARB）＋CISO | G1〜G3 | OI-U01（識別子の形式） | 案あり・決裁前 | identity-lifecycle #1、principal-catalog #1〜#4・#9 |
| OI-B21 | テナントライフサイクル K-1〜K-8 と ADR-028 K28-1〜K28-4（大規模テナントの差分追従、テナント KEK の実体、管理者 1 名のテナントのエクスポート承認、論理削除の待機・復元期間） | B | §11・§2.16 の決める人 | G0〜G4 | OI-L03（crypto-shredding の法的評価） | 案あり・決裁前 | tenant-lifecycle、ADR-028 |
| OI-B22 | 顧客管理者責任分界の決裁案 1〜7、条項案の法務レビュー（G-096）、顧客 IdP 侵害時の責任分界（REQ-06 決裁案 5）と通知期限 | B | 各決める人、法務責任者、事業責任者、CISO | G0（通知期限は G1） | OI-L01 | 案あり・決裁前 | customer-admin-responsibility #1・#2、risk-appetite-draft #7 |
| OI-B23 | As-Is: DQ-A（回答義務と体制）、DQ-B（顧客側作業の扱い）、告知期間 | B | CTO、調達責任者、事業責任者（B2B）、法務責任者、営業・顧客成功責任者 | DQ-A は G1 開始前、DQ-B は G3 | なし | 案あり・決裁前 | as-is-inventory #5・#6、phased-rollout #7 |
| OI-B24 | 脅威モデルの決裁案: AM-1〜AM-3、TD-1〜TD-4、KD-THR01-1〜3、DA-1〜DA-5、不正対策の決裁案 1〜7、残余リスクの受容段の割当 | B | CISO（起案）、§7・§8・§14 の決める人 | G2（AM-1）、G3（AM-2・AM-3、TD）、G4（TD-3） | OI-B12（受容段） | 案あり・決裁前 | attacker-model #1〜#3、threat-catalog #7、dfd-entry-points #8、incident-casebook R-6、fraud-abuse-controls #2 |

#### 4.1.4 ADR の決裁案（05_adr/README.md §6.2。DEC-3 対象の不可逆原則と U-01〜U-04 を除く）

| ID | 項目 | 区分 | 担当（役割） | 期限（相対） | 依存ゲート | 状態 | 出典 |
|---|---|---|---|---|---|---|---|
| OI-B25 | ADR-002 KD2-1〜KD2-4、ADR-003 論点 3（PC-07・PC-08 の IAL）と RC2-5、ADR-003 の受容票 RR3-01〜RR3-08 | B | CISO＋事業責任者（B2B・B2C・決済）、各受容者 | G1（受容票は G3〜G5） | IAL3 を選ぶ場合は A-070 の変更（OI-R20） | 案あり・決裁前 | ADR-002 残課題、ADR-003 #2・#3・#12 |
| OI-B26 | ADR-001 K1-2〜K1-5（SRE 確約、有償サポート契約、AGPL-3.0、退出条項）、ADR-018 K18-1〜K18-5、ARC-14 K14-1〜K14-5 | B | 経営会議（DEC-4）、法務・調達、CISO、CFO、CTO | G3（K18-5 は DEC-3 の前） | RFP 見積り（OI-D01） | 案あり・決裁前 | ADR-001 #2・#4・#5、ADR-018 #1・#2、product-evaluation-exit #1 |
| OI-B27 | ADR-004 K04-1〜K04-5、ADR-024 K24-1〜K24-4 | B | CISO、プロダクト責任者、営業・顧客成功責任者、事業責任者 | G2〜G3 | なし | 案あり・決裁前 | 05_adr/README §6.2、ADR-004 #2 |
| OI-B28 | ADR-005 K-1〜K-6（BFF 経路、R(t)・E(t)、sender constraint 既定、内部 RS256、AS 置換時の再同意、内部束縛）、ADR-020 K20-1〜K20-5、token-profile KP-1〜KP-3 | B | CTO＋CISO、事業責任者、プロダクト責任者 | G1〜G4（K-1 は H-02・H-04 の後の G4） | OI-C05（BFF 経路の実測） | 案あり・決裁前 | ADR-005 残課題、token-profile（KP）、05_adr/README §6.2 |
| OI-B29 | ADR-006 K6-1〜K6-5、ARC-09 KA9-1・KA9-2 | B | CTO＋CISO、事業責任者、プロダクト責任者 | G3〜G4 | OI-B05、OI-T01 | 案あり・決裁前 | revocation-continuous-evaluation、05_adr/README §6.2 |
| OI-B30 | ADR-007 KD7-2〜KD7-8（L1 保管、緊急失効権限、鍵年齢、blast radius 予算、L0 の法域分割、要員、第 2 事業者）、AM-1・AM-2、root-of-trust KRT-1〜KRT-5 | B | CTO＋CISO、事業責任者、経営（DEC-4） | G3（KRT は段階 3 まで） | KD7-3 は GOV-06 DP46-3 と同時（OI-R02） | 案あり・決裁前 | ADR-007 残課題、root-of-trust |
| OI-B31 | ADR-008 KD8-1〜KD8-5（管理用 IdP、Source L4 の範囲、PAW、非本番の分離、CP-0 の待機）、ADR-029 KD29-1〜KD29-6 | B | CTO＋CISO、SRE 責任者、事業責任者、法務、support 部門長 | G3（KD8-5 は G4） | KD8-2 は AM-3 と同時 | 案あり・決裁前 | 05_adr/README §6.2・§6.3（ADR-008 論点 3） |
| OI-B32 | ADR-010 決裁案 1・3・4・5（自社部品の開発、SRE の on-call、剥奪書込の RPO 0、stale allow の上限 B）、ADR-011 決裁案 2（A-104）、G-066 の「利用側コード」の解釈 | B | CTO＋CFO、CISO、事業責任者、独立立会人 | G3〜G4 | OI-U03 | 案あり・決裁前 | ADR-010 #2、ADR-011 #2・#3 |
| OI-B33 | ADR-013 KD13-1〜KD13-8（KD13-6 の read-sensitive の fail-static と B_rs・H・Q_r・Q_w を含む）、ARC-18 KD18-1〜KD18-4、ARC-08 KD08-1〜KD08-6、ADR-023 KD23-1〜KD23-5 | B | 事業責任者、CTO＋CISO、法務、人事、CFO | G3〜G4（KD13-1 は DEC-3） | OI-U04、OI-B05 | 案あり・決裁前 | ADR-013 残課題、cell-blast-radius、fail-mode-matrix、dependency-tiers |
| OI-B34 | ADR-015 KD15-1〜KD15-5、ADR-016 K16-1〜K16-4、ARC-12 K23-1〜K23-3、社内の暗号移行期限 | B | CTO＋CISO、事業責任者、法務、経営会議（S6） | G3（DEC-8 前を含む） | なし | 案あり・決裁前 | ADR-015 残課題、evolution-pqc、durability-charter-20y #9 |
| OI-B35 | ADR-017 K17-1〜K17-4、ADR-026 K26-1〜K26-4、ARC-11 KD55-1・KD55-2 | B | CTO、CISO、事業責任者、法務 | G3〜G4（KD55 は DEC-8 前） | OI-U02 | 案あり・決裁前 | ADR-017 残課題、workload-identity-delegation |
| OI-B36 | ADR-021 K21-2〜K21-6（ドメイン構成、専用 issuer 枠、pairwise 既定、名前空間台帳の所有者、`<id-domain>` の名称と保有法人）、ADR-027 K27-1・K27-2・K27-4 | B | CTO＋CISO（DEC-3）、経営会議、法務、事業責任者、個人情報保護責任者 | DEC-3／G3 | OI-U01 | 案あり・決裁前 | ADR-021 #1、05_adr/README §6.2 |
| OI-B37 | 構成・データ系の決裁案: reference-architecture §12、ARC-05 K05-1〜K05-8、data-outside-pep K57-1〜K57-5、audit-privacy KAP-1〜KAP-4、capacity K58、claims-catalog KC-1 | B | CTO＋CISO、事業責任者、個人情報保護責任者 | G3〜G4 | OI-U02・OI-U04（KAP、KC-1） | 案あり・決裁前 | authorization-model #19、data-outside-pep #5、audit-privacy #2、claims-catalog #6 |

#### 4.1.5 連携・運用・保証・統制の決裁案

| ID | 項目 | 区分 | 担当（役割） | 期限（相対） | 依存ゲート | 状態 | 出典 |
|---|---|---|---|---|---|---|---|
| OI-B38 | DEC-8: 連携契約 v1 の凍結（ADR-022 D-11）。互換性 SLA KC-1〜KC-5、K-CON-1〜4、K11-1〜K11-4、KD-INT00-1〜3、KD-INT01-1・2、KD-INT05-1〜4、INT03-K1〜K4、ONB-K1〜K5、KD-FAQ-1〜3、KD64-1 | B | CTO＋CISO（KC-3 は経営会議） | DEC-8 | OI-U01、OI-R05（契約の欠け）、OI-C11（モックと試験キット） | 案あり・決裁前 | 11_contracts/README #9、compatibility-deprecation-policy #1、mock-contract-test-kit #4、10_integration 各書 |
| OI-B39 | 運用の決裁案: OPS04-K1〜K5、KD-OPS-5、DP-OM-1〜DP-OM-8、外部 SOC の契約条件、英語版の要否（DP-OM-8） | B | §11 の決める人、CISO | G3（DEC-4） | OI-B09 | 案あり・決裁前 | phased-rollout #6、compromise-runbooks、operating-model #1・#10 |
| OI-B40 | 保証の決裁案: RS-D1〜RS-D5、CA-1〜CA-6、SA-1〜SA-4、K60-1、重大度の格付け基準（DP46-1） | B | CISO、CTO、経営会議 | G0（格付け基準）、G3〜G6 | OI-B06 | 案あり・決裁前 | rfp-sow #1・#2、continuous-assurance-plan #1・#2、self-assessments #2、oidf-conformance-plan O-2 |
| OI-B41 | 統制・数値の決裁案: KM-1〜KM-4、CM-1〜CM-5、KC5-2、KRM-2、applicability L-02〜L-12、numeric-contracts K20-1〜K20-5、PoC KP-1〜KP-6 | B | CISO、CTO、経営会議、法務 | G0〜G3（KP は DEC-4 前） | OI-L01 | 案あり・決裁前 | identity-appsec、control-mapping-ledger、regulations、applicability、numeric-contracts #5、preregistered-test-plan #8 |

#### 4.1.6 決裁パッケージ（00_decision）由来（版 0.2 で追加）

| ID | 項目 | 区分 | 担当（役割） | 期限（相対） | 依存ゲート | 状態 | 出典 |
|---|---|---|---|---|---|---|---|
| OI-B42 | G0 の日付の決定（DCS-06 §5.4）、G0 から G6 開始までの年数 x の確定（3〜6 年の幅）、ゲート判定記録の様式（判定日、承認者、証拠参照、繰延べ先）、前置論点 ADR-018 K18-5・ADR-026 L26-2 の決定者と期限を DL-42 の日程に載せること。G0 の日付が決まった後、本書の期限 G0 の行を日付に置き換える | B | CISO＋CTO | 次回決裁の起案時（x は G4 入場前） | なし | 未着手（G0 の日付は未定） | 06-gate-plan-and-plan-b §5.4・残課題 2・3・11[^7]、03-decision-items 残課題 2・5[^6] |
| OI-B43 | 残余リスク台帳（DCS-05）の受容票の起票と承認（受容は 0 件）、許容度確定後の段の見直し、ADR 29 本の §6.3 受容者案の改訂（DP41-2）、金額化後の上位 5 件の選び直し、RRG-030 のサービス別個別票、RRG-008・RRG-040-1 の再計算、RRG-037・RRG-069 の必須化時期と広がりの KRI の閾値 | B | 第 2 線（起票）、各段の受容者、各 ADR の所有者、CFO | G0〜G5（ADR の受容者案は G2、RRG-068 は G4 入場前） | OI-B01、OI-B07、OI-B12、OI-B33（KD13-1） | 案あり・決裁前 | 05-residual-risk-register 残課題 1〜3・6・7・10・13・14 |

### 4.2 横断未決（U-01〜U-04）

正本は 05_adr/reconciliation-notes.md §5 である [D]。

| ID | 項目 | 区分 | 担当（役割） | 期限（相対） | 依存ゲート | 状態 | 出典 |
|---|---|---|---|---|---|---|---|
| OI-U01 | U-01 issuer の粒度（ADR-007 KD7-1 のテナント／realm 別か、ADR-021 K21-1 の信頼区画別＋cell 別鍵＋専用 issuer 枠か）。決裁後に ADR-007 の要旨・D7-16 と root-of-trust §7.1・§9.1 の片側を削除 | B | CTO＋CISO（DEC-3） | G3（DEC-8 の前提条件） | なし（本行が 13 本の ADR の前提） | 案あり・決裁前 | reconciliation-notes §5、05_adr/README §4.2・§7 M-4、root-of-trust 残課題 |
| OI-U02 | U-02 `txn` を証跡の主キーにする範囲（全要求か write 以上か） | B | CTO＋CISO | ADR-005 H-20 の実測の後（G4） | OI-C05（H-20、H09-06） | 案あり・決裁前 | reconciliation-notes §5、ADR-009（P09-2） |
| OI-U03 | U-03 OpenFGA の窓 W 方式の受容（期限付き受容か、常時格上げ・SpiceDB への絞込みか） | B | CISO（受容票） | G3（ADR-010 H-05 の後） | OI-C04（H-05） | 案あり・決裁前 | reconciliation-notes §5、authorization-model #2、fail-mode-matrix |
| OI-U04 | U-04 判定記録への PDP 署名（KD13-6 で read-sensitive の fail-static を許すかと同時） | B | CISO＋事業責任者＋CTO | G4 | OI-B33（KD13-6） | 案あり・決裁前 | reconciliation-notes §5、authorization-model #3、fail-mode-matrix |

### 4.3 数値 TBD（DL-20 で決裁）

| ID | 項目 | 区分 | 担当（役割） | 期限（相対） | 依存ゲート | 状態 | 出典 |
|---|---|---|---|---|---|---|---|
| OI-T01 | 剥奪・fail-mode の値: R(t, c)、E(t)、B、B_rs、M_rev、H、Q_r、Q_w、C_edge(t)、L、J_max、D(t)、H_g、S_ssf、cache invalidation 成功率 | B・C | CTO＋CISO＋SRE 責任者、事業責任者（BIA） | G4 | OI-B05、OI-C06 | 計画あり・未実施 | fail-mode-matrix、authorization-model #4、dependency-tiers、revocation-continuous-evaluation |
| OI-T02 | token・委任の値: 寿命 LP-1〜LP-3、S_int・S_ext・W、JWKS cache 最大齢、時刻差、jti ストア、grant 寿命、Txn-Token・SVID・派生 token の寿命、N_act、委任 grant 寿命、I_job(t)、外部 JWKS の取り直し頻度 | B・C | CTO＋CISO、事業責任者 | G3〜G4 | OI-B05 | 計画あり・未実施 | token-profile、ADR-005、ADR-009、workload-identity-delegation |
| OI-T03 | ID ライフサイクルの時間値: 回復の待機 W_A〜W_D・W_ext、制限期間 P、削除猶予、休眠期限、招待・未確認登録の期限、照合周期、非人間主体の猶予・未使用期限・資格情報寿命、静的秘密の移行期限 | B・C | CISO＋プロダクト責任者、プラットフォームチーム長 | G1（候補）、G4（確定） | OI-B20 | 案あり・決裁前 | ADR-003 #1、identity-lifecycle #2・#5、principal-catalog #5、ADR-009 |
| OI-T04 | 鍵系の値: 緊急失効完了時間、鍵差替え時間、MTTD、L0 緊急 rollover の目標、L0 の pin 更新期間、未知 kid の再取得抑止間隔、R-189.5・R-189.6・R-195.4 | B・C | CISO、SRE 責任者、CTO | G4 | OI-C07 | 計画あり・未実施 | ADR-007、root-of-trust |
| OI-T05 | 運用の時間値: Z2・Z3・Z7、Sev1〜Sev4 の応答・解決目標、R1 の初動目標、rollback の閾値 θ1〜θ6・窓・時間目標、bake・shadow 期間、本番走査の周期 | B・C | SRE 責任者、CTO＋CISO、事業責任者 | G3（値）、G4（実測補正） | OI-C09、OI-C12 | 案あり・決裁前 | kri #5、risk-appetite-draft #9・#12、operating-model #5、phased-rollout #2、evolution-pqc |
| OI-T06 | 連携契約の値: preview の期限、GA・preview の非推奨期間、SDK の版差（N−1／N−2）・支援期間・脆弱性修正期限（G-140）、固定改定日、緊急変更の事後承認期限 | B | CTO＋CISO | DEC-8 前 | OI-B38 | 案あり・決裁前 | ADR-022、compatibility-deprecation-policy #2・#4・#8、dependency-tiers、10_integration/README #3 |
| OI-T07 | 容量の値と KMS 実効枠: C_cell、session サイズ、store・状態ストア・受付制御の上限、export 速度、KMS の実効枠（1,000 か 300 か）と、日本の標準 cell が s=1.5 の失効直後に判定線（実効枠の 80%）へ到達する件の対処（枠の引上げ、cell 分割、鍵種別の並行） | B・C | SRE 責任者＋CTO | G4（KMS 枠の確認は PoC 前） | OI-C07（TC-07-07、TC-13-23） | 計画あり・未実施 | capacity-model #4・#5・#10、ADR-013 |
| OI-T08 | 数値契約の採番: TC 仮番の置換、「TC 未採番」SLI の試験案、未決 ADR 論点の決着後の SLI 再定義、R-190.2 の判定時点の明記 | A・C | PoC 担当（DL-22）、CTO＋CISO | G4 入場前 | OI-C01 | 計画あり・未実施 | numeric-contracts #3・#4・#7、preregistered-test-plan #9 |
| OI-T09 | 保持期間: AUD・PII・MED・CUS・SEC・AZD、SLI-073 の PCI 以外の区分、E7 の保持期間、受容票・停止記録の保持期間 | B | 法務責任者＋CISO、個人情報保護責任者 | G0→G3 | OI-L01 | 未着手 | data-classification #3、audit-privacy #1、numeric-contracts #9、oidf-conformance-plan O-3 |
| OI-T10 | 認可モデルの値: custom role 上限、`max_direct` の初期値、OpenFGA の型数上限への対処、unit の深さ上限とテナントあたり unit 数、facade 遅延予算、consistency_token 最大長、G-147 の表現率目標 | B・C | 認可・PDP チーム、プロダクト責任者＋CTO | G3〜G4 | OI-C10 | 計画あり・未実施 | authz-modeling-guide #11・#12、authorization-model #19、ADR-011 #9 |
| OI-T11 | 連携運用の値: U-C の期限、shadow の最短期間、切替後の監視期間、§3.5 の 8 既定値、L_url(t)、共有端末の自動 logout、grant 棚卸し周期、審査 SLA（DP-6、G-116） | B・C | プラットフォームチーム長、CTO | G3〜G4 | OI-C11（パイロット） | 計画あり・未実施 | definition-of-ready #5、integration-patterns #5、authz-modeling-guide #4 |

### 4.4 実測（C）

| ID | 項目 | 区分 | 担当（役割） | 期限（相対） | 依存ゲート | 状態 | 出典 |
|---|---|---|---|---|---|---|---|
| OI-C01 | PoC 事前登録の完成: ADR 仮番 412 件の機械照合、TH-TC-001〜086・CB-TC-01〜20・IL-TC・NV-01〜NV-58・EX-xx・SA-1〜SA-10・TC-ARC 系の採番、合否基準の凍結（系統 2 の 31 件中 28 件と系統 1 の 4 件は値待ち） | C | PoC リード（DL-22） | Phase 4（照合）、G4 入場前（凍結） | OI-T01〜OI-T11 | 並行作業中 | preregistered-test-plan #1・#2、threat-catalog #4、incident-casebook R-1 |
| OI-C02 | PoC 系統 1 の外部部品確認（node-oidc-provider の DPoP・PAR・device flow・RFC 9207、Cedar の wasm、SpiceDB の配布物、ML-DSA の可否）と、確認できない負例の系統 2 への移動 | C | PoC リード、PoC チーム | DL-22 凍結前 | なし | 並行作業中（12_poc/code と README（DL-82）は作業ツリーにあるが未コミット。OI-M04） | preregistered-test-plan #3、mock-contract-test-kit #6 |
| OI-C03 | 生データの保管先と、立会人による独立のハッシュ照合の方法 | C | PoC リード | DEC-4 前 | なし | 未着手 | preregistered-test-plan #6 |
| OI-C04 | 製品選定 PoC: IdP/AS（TC-01-01〜19）、認可エンジン（ADR-010 H-01〜H-20、M-8 の Watch API、M-10 の静的安定性）、重み・閾値・tie-break の事前登録、供給者健全性の記録 | C | プラットフォームチーム、認可・PDP チーム、独立立会人 | G3 | OI-C01 | 計画あり・未実施 | ADR-001 #3、ADR-010 #1・#4・#5・#8、product-evaluation-exit #2〜#5 |
| OI-C05 | token・委任の実測: BFF 経路（H-02・H-04）、H-20・H09-06（U-02 の入力）、負例 NV-01〜NV-58、委任の負例 50 件と H55-01〜08、TC-017-01〜14、H09-05 の分散係数 | C | プラットフォームチーム、12_poc | G4 | OI-C01 | 計画あり・未実施 | token-profile、workload-identity-delegation、ADR-017 |
| OI-C06 | 剥奪・fail-mode・cell の注入試験: §8 の注入と逸脱 0 件（G-058）、G-111、cell 障害注入（G-048）、X5 の追随時間、F1 での既存 session 継続、RTO・RPO、剥奪 RPO 0 の書込遅延と費用 | C | PoC チーム、SRE 責任者、CTO、独立立会人 | G4 | OI-C01 | 計画あり・未実施 | fail-mode-matrix、cell-blast-radius、business-impact-analysis #9・#10 |
| OI-C07 | 鍵・暗号の実測: TC-07-01〜16、TC-RT-01〜04、TC-08-01、ceremony の模擬（TC-07-12）、alg 切替・downgrade 負例・サイズ到達（R-104、G-068）、TC-15-01〜09 | C | PoC チーム、CISO | G4 | OI-C01 | 計画あり・未実施 | root-of-trust、ADR-015、durability-charter-20y #5 |
| OI-C08 | テナント分離の実測: cross-tenant property test、検索・DWH の側路、cross-cell の負例、crypto-shredding の完了時間、TC-057-01〜10、PEP 外経路 | C | プラットフォームチーム長 | G4 | OI-C01 | 計画あり・未実施 | data-classification #14、data-outside-pep #4 |
| OI-C09 | 移行の実測: shadow・differential による誤 allow・誤 deny、自動 rollback の作動（G-051、E-1・E-2）、逆複製（ADR-010 M-8）、統合と cell 間移動（TL-1・TL-2、TC-028-01〜15、G-075） | C | SRE 責任者＋CTO、認可・PDP チーム、独立立会人 | G4 | OI-C01 | 計画あり・未実施 | phased-rollout #1・#9、tenant-lifecycle、ADR-028、risk-appetite-draft #10 |
| OI-C10 | 認可モデルの検証器の実行（E4）: ARC-05 §8 と RS-18 のモデル例、authz-modeling-guide §9 の例を `fga model test`・`zed validate` で検証、OpenFGA の識別子規則・循環の扱い、要件カタログ 32 件の判定（G-108） | C | 認可・PDP チーム、CTO と独立立会人 | G3（G-108 は段階 2） | なし | 未着手 | authorization-model #1・#6・#16〜#18、authz-modeling-guide #1・#2・#17 |
| OI-C11 | 連携の実測: モック起動と G-121 の負例、モックと PoC 基盤の一致（TC-026）、独立開発者の切替（TC-119）、パイロット 2〜3 サービスでの問い合わせ・応答時間（G-144、G-145）と G-146 の 4 指標、DoR・DoD の判定記録 | C | PoC チーム（DL-82）、CTO、プラットフォームチーム長、独立立会人 | 段階 1〜G4 | OI-C02 | 計画あり・未実施 | mock-contract-test-kit #1〜#3、onboarding ONB-R4、definition-of-ready #10、developer-faq #5、04-program-charter 残課題 9 |
| OI-C12 | 演習: compromise runbook の EX-01〜EX-18・EX-M1・EX-V1〜V3（C 区分 23 件）、PDP 差替え（G-066）、export/import（G-070）、停止権限 SA-1〜SA-10（G-092）、区分判定会の机上演習、受容票の机上演習 | C | CISO＋SRE 責任者、CTO、第 2 線 | G0（受容票の机上演習）、G4 | OI-C01、OI-B15 | 計画あり・未実施 | compromise-runbooks #4・#8、durability-charter-20y #6、stop-authority #5、raci-governance #11、exception-risk-acceptance #7 |
| OI-C13 | As-Is の実データ棚卸し（8 領域・全サービス）、entry point の機械抽出（M-01）と差分 0 件、顧客側作業の工数、識別子の所在（N-3）、ROPC・client_secret・Bearer 連携の件数 | C | 各ドメイン責任者、プラットフォームチーム長、CTO | G1（初回の置換）、段階 2（完了） | OI-B23（DQ-A） | 未着手 | as-is-inventory #1〜#3、phased-rollout #4・#5、token-profile |
| OI-C14 | KRI の基準値と CI 検査: 各 K の基準値の実測、G-072 の CI 検査と混入違反の検出試験、DFD と台帳の整合検査（AC-08）、Susceptibility・TEF の実測 | C | プラットフォームチーム長、SRE 責任者、CISO | G4 | OI-B16 | 未着手 | kri #3・#8、dfd-entry-points #4、loss-scenarios |
| OI-C15 | 運用負荷の実測: on-call 負荷（TC-13-20）、有資格化の期間、問い合わせ率 q・処理時間 h、ADR 間で重複を除いた FTE（H-7、H-14、H-18、TC-01-08） | C | SRE 責任者、プラットフォームチーム長 | G4 | OI-C01 | 計画あり・未実施 | operating-model #3・#6・#7・#9 |
| OI-C16 | 自己評価の実施: 第 1 回・第 2 回（G-090）、ASVS 全章の要件単位の対応付け、V5 の該当性、Source L4 の自己評価 | C | CISO | G3〜G4 | OI-B40（SA-1〜SA-4）、KM-1 | 計画あり・未実施 | self-assessments #1〜#5 |
| OI-C17 | 認証・利用者側の観測: 外部 IdP の `acr`・`amr` と AAL・同期／device-bound の判別、WebAuthn L3 の signal メソッド対応、fresh の実現可能性、利用者負担 | C | CTO、プラットフォームチーム長 | G4 | OI-C01 | 計画あり・未実施 | operation-risk-tiers-assurance、principal-catalog #8、identity-lifecycle #13、ADR-002 |

### 4.5 第三者評価（D）

| ID | 項目 | 区分 | 担当（役割） | 期限（相対） | 依存ゲート | 状態 | 出典 |
|---|---|---|---|---|---|---|---|
| OI-D01 | 独立評価者の調達と任命: RFI、期間・人日・費用の幅、選定基準の重み、利益相反申告、禁止事項 X-1・X-2 の期間、SOW-01〜の発注 | D | CISO、調達責任者、CFO | G2 前（任命）、G3（費用） | OI-B06 | 計画あり・未実施 | independent-assurance-plan #4、rfp-sow #3〜#5 |
| OI-D02 | 独立設計レビューと外部の脅威モデルレビュー（R-063）。ATK-01〜ATK-19 と上位 S-ID の手法別照合表 | D | CISO、独立評価者 | G2〜G5 | OI-D01 | 計画あり・未実施 | threat-catalog #3、independent-assurance-plan #5 |
| OI-D03 | OAuth/OIDC/FAPI の conformance と認定（O-1〜O-9、K20-4、G-087 の RFC 9700 準拠表の独立確認） | D | CISO、プラットフォームチーム長 | G4〜G5 | OI-C01、OI-B28（K20-4） | 計画あり・未実施 | oidf-conformance-plan、token-profile |
| OI-D04 | PEP bypass と cross-tenant の pentest（G-083）、PEP 外経路からのテナント間漏えい（T-077・T-078）、失効配布・境界回避・偽造 SET、Txn-Token の replay・主体種別の偽装、トークン・フェンスの改ざん | D | CISO（DL-59）、独立評価者 | G5 | OI-D01、OI-M02（pentest-redteam-plan 未作成） | 未着手 | data-outside-pep #10、revocation-continuous-evaluation、claims-catalog #9、authorization-model #13 |
| OI-D05 | red team: helpdesk へのソーシャルエンジニアリング（CB-TC-13、IL-TC16、TC-03-05、R-042）、回復経路、エージェント | D | CISO（DL-59） | G5 | OI-D01、OI-M02 | 未着手 | incident-casebook R-2、fraud-abuse-controls #3、identity-lifecycle #4、ADR-003 #5 |
| OI-D06 | 管理面・供給網・クラウド設定の第三者レビュー（G-091）、鍵 ceremony の第三者立会い（G-085）、SPIRE selector の構成レビュー、SDK の pentest | D | CISO（第三者評価の調達） | G5／段階 3 | OI-D01 | 計画あり・未実施 | ADR-007、root-of-trust、workload-identity-delegation |
| OI-D07 | PoC の独立立会い（G4）: 演習・注入試験・切替の立会いと独立のハッシュ照合 | D | 独立立会人、CISO | G4 | OI-C03、OI-D01 | 計画あり・未実施 | independent-assurance-plan #8、product-evaluation-exit #4 |
| OI-D08 | プライバシー監査、SSCF の適合判定と管理機能の侵入試験、定量化モデルの独立検証（DL-07）、内部監査による KRI の仕組みの評価 | D | 個人情報保護責任者、CISO（DEC-5）、内部監査 | G5 | OI-D01 | 未着手 | audit-privacy #11、customer-admin-responsibility #9、loss-scenarios、kri #12 |
| OI-D09 | 第三者評価の Critical/High の是正と再試験（§5 の CH 台帳） | D | CISO（是正追跡）、CTO（是正）、独立評価者（再試験） | G5（本番移行の前） | OI-D02〜OI-D06 | 未着手（評価が 0 件のため指摘も 0 件） | R-076、R-273、G-034 |
| OI-D10 | 第三者認証・保証報告書の取得範囲の決定（applicability L-10 からの申し送り） | B・D | CISO＋法務 | G0（法域判定の後） | OI-L01 | 未着手 | independent-assurance-plan #6 |

### 4.6 本番運用実績（G6 以降）

| ID | 項目 | 区分 | 担当（役割） | 期限（相対） | 依存ゲート | 状態 | 出典 |
|---|---|---|---|---|---|---|---|
| OI-O01 | 四半期 KRI 報告と取締役会議事録（E1）の継続 | C（運用） | CEO、CISO、取締役会事務局 | G6 以降、四半期 | OI-B16 | 未着手 | kri #11 |
| OI-O02 | 年次独立評価・定期 red team・保証機能の独立性の年次評価・本番後の実施記録（E1、E6、E8、E11） | D（運用） | CISO、内部監査、各活動の責任者 | G6 以降、年次 | OI-B40（CA-6 の予算） | 未着手 | continuous-assurance-plan #4・#5、independent-assurance-plan #10、durability-charter-20y #11 |
| OI-O03 | 鍵・IdP・PDP 侵害演習、schema migration 演習、vendor exit 演習（X2・X3）と撤退見積りの年次更新（G-070、G-076） | C（運用） | CTO、CISO | 運用開始後、年次 | OI-C12 | 未着手 | ADR-018 #9、product-evaluation-exit #11 |
| OI-O04 | 年間の可用性（R-190.2）と本番 SLI の実測、本番承認の条件（numeric-contracts §7.1） | C（運用） | 各決める人、SRE 責任者 | G6 | OI-T08 | 未着手 | numeric-contracts #6、preregistered-test-plan #9 |
| OI-O05 | 根本原因の将来開発への反映（R-187）の運用（§6） | C（運用） | CISO、CTO | G6 以降 | OI-D09 | 未着手 | R-187 |
| OI-O06 | 3〜5 年ごとの継続・置換の再決裁と、GOV-06 S6 の F-b・F-d の解除（強制移行と旧経路撤去） | B（運用） | 経営会議（CISO の同意） | 継続ゲート、退出基準の充足後 | OI-B17 | 未着手 | durability-charter-20y #11、phased-rollout #13 |

### 4.7 是正項目（文書間・台帳）

#### 4.7.1 ADR の改版（05_adr/README.md §6.3 の 57 件を改版先で束ねた）

| ID | 項目 | 区分 | 担当（役割） | 期限（相対） | 依存ゲート | 状態 | 出典 |
|---|---|---|---|---|---|---|---|
| OI-R01 | ADR-005 の改版: P09-3（`rctx` を v1 で発行しない）、P09-4、U2-02、P16-1、L17-2・L17-4、L19-5、P-2〜P-4、L26-1、L29-3、ADR-014 論点 2（`jti_ref`）、token-profile AR-1〜AR-4、claims-catalog §11 の 6 件、client 認証方式（ADR-018 D18-5） | A | ADR-005 の所有者、CTO | G3（DL-115 凍結前、DEC-8 前） | OI-U02 | 申し送り済み・未反映 | 05_adr/README §6.3、token-profile、claims-catalog #10、ADR-018 #8 |
| OI-R02 | ADR-007 の改版: 監査・データ暗号化の鍵族（ADR-014 論点 1、RN-028-2、CEK-08、ip_ref 用鍵）、ADR-015 L-1・L-3・L-4、L19-1 と GOV-06 DP46-3 の同時決裁、P09-5、root-of-trust §15 の指摘 1〜3、M-4 | A・B | CISO（ADR-007 の所有者）、CTO | G3 | OI-U01（M-4） | 申し送り済み・未反映 | 05_adr/README §6.3・§7、root-of-trust、audit-privacy #4、cloud-supplychain #6 |
| OI-R03 | ADR-011 の改版: G 段規則 2 を act 連鎖の主体と現在の actor に適用（L6-4、L26-3）、第 7 規則（L17-3）、ADR-012 L-01、P16-2（`reason` の enum）、ADR-024 L-1、L27-4、U2-02、PIP の取得規則（reference-architecture T10）、query budget 超過の reason、shadow の評価モード | A | ADR-011 の所有者、契約変更審査会 | DEC-8 前 | なし | 申し送り済み・未反映 | 05_adr/README §6.3、authorization-model #8・#14、capacity-model #12、phased-rollout #8、reference-architecture |
| OI-R04 | ADR-013 の改版: D13-28 の注記（ADR-012 L-02）、L19-2〜L19-4、L23-1〜L23-3、ADR-024 L-2・L-3、ADR-008 論点 1、D13-06 と capacity の 21,678/秒の差、fail-mode L08-1〜L08-6、リスク判定停止時の分類 | A・B | CTO（ADR-013 の所有者）＋CISO | G3（KD13-6 と同時のものは G4） | OI-B33 | 申し送り済み・未反映 | 05_adr/README §6.3、capacity-model #3、fail-mode-matrix、dependency-tiers |
| OI-R05 | ADR-022 と契約の改版: L6-1・L6-2・L6-8、ADR-012 L-07、L17-5、契約間の差分 D-1〜D-9、ライフサイクル事象の契約（G-137）、client 登録の契約、Webhook 署名 profile、イベント配送契約（I-11）、429 の共通定義、`x-maturity`／`x-stability` の不一致、閉じたスキーマと minor 追加の両立、EIF の JSON Schema と退出条項の様式 | A | 契約所有者（DL-69）、プラットフォームチーム長、認証・IdP チーム | DEC-8 前 | OI-B38 | 未着手（契約ファイルの作成を含む） | 11_contracts/README #1・#3・#6・#7・#12、integration-patterns #1・#2・#6、compatibility-deprecation-policy #11・#12、onboarding ONB-R9、ADR-018 #7 |
| OI-R06 | ADR-001 の製品評価軸の追加: 回復の案件管理（ADR-003 論点 2）、管理 API・break-glass 管理者・管理コンソール無効化（ADR-008 論点 2）、Keycloak の delegation Preview と `resource` 未対応（L17-1）、SCM の Source VSA 発行能力、リスクエンジンの build/buy、FAPI 切替単位の不一致（P-1） | A・B | CTO（ADR-001 の製品評価、Gate 3） | G3 | OI-C04 | 申し送り済み・未反映 | 05_adr/README §6.3、cloud-supplychain #7、fraud-abuse-controls #17 |
| OI-R07 | ADR-010・ADR-021・ADR-012・ADR-006 ほかの改版: L29-2、ADR-014 論点 3（H-16 の参照先）、RN-028-1、L27-1・L27-2、pep-contract §11 の未決 12 件と ADR への指摘 4 件（L06-1 の非同期テナント文脈の出所を含む）、ADR-006 の「顧客 IdP 由来」範囲、authorization-model の ADR 指摘 3 件 | A | 各 ADR の所有者 | G3〜G4 | なし | 申し送り済み・未反映 | 05_adr/README §6.3、pep-contract、revocation-continuous-evaluation、authorization-model #14 |
| OI-R08 | ADR 索引の保守: §9 の「未起草」表記（M-1）、ADR-001・005・007・010・011・013 のメタ情報の日付（M-2）、durability-charter の DEC-3 記述（M-3）、ID の重複（M-5） | A | 各 ADR の所有者、durability-charter の所有者 | 次版 | なし | 申し送り済み・未反映 | 05_adr/README §7、revocation-continuous-evaluation |

#### 4.7.2 他の文書・台帳の是正

| ID | 項目 | 区分 | 担当（役割） | 期限（相対） | 依存ゲート | 状態 | 出典 |
|---|---|---|---|---|---|---|---|
| OI-R09 | 脅威カタログの改版: NT-THR01-01〜12 の T-ID 採番、DFD 照合 25 件、網羅表の DFD 要素 ID での作り直し、統制欄の C-ID 置換、ATK の仮割当の照合、T-017 の外部 traceparent、承認記録（G-133） | A | CISO、DL-10・DL-11 の作成者 | G2 | なし | 申し送り済み・未反映 | dfd-entry-points #1・#6、threat-catalog #1・#5・#11、control-mapping-ledger #4、fraud-abuse-controls #5 |
| OI-R10 | 統制台帳（CTL-01）: mappings 各書の C-ID 付与と証跡所有者、未着手 12 統制の正本、機械可読形式、規則 1・2 の再実行、写像の要素単位化、X-14 の改版 | A | CISO（CTL-01 の所有者）、mappings の作成者 | G1（機械可読化は Phase 4） | なし | 計画あり・未実施 | control-mapping-ledger #1〜#11、identity-appsec #11、nist-csf-iso27001 #4、regulations |
| OI-R11 | 統制ギャップの規則化: パスワード規則と ASVS、規則の明記漏れ（email OTP、binding code、秘密の質問）、session 機能、BFF 参照実装の追加要件、field 単位の認可規則、API4・API6、FAPI の細目、GV.RM-07・ID.RA-08、access review の周期 | A・B | CISO、プロダクト責任者、CTO | G1〜G3 | OI-B41（KM-1〜KM-4） | 未着手 | identity-appsec #1〜#9、nist-csf-iso27001 #5・#6、cloud-supplychain #4・#5・#10 |
| OI-R12 | 運用モデルと TCO の整合: ADR 間で重複を除いた FTE、OPS-02 の FTE による TCO §4.1 の置換、TBD 費目（ライセンス、インフラ、検索基盤・SIEM、第三者評価、SMS）、複数 driver の不確実性分析、要員費の金額 | A・B | プラットフォームチーム長、CFO 配下の財務担当、CTO | G3 | OI-C15、OI-D01 | 未着手 | operating-model #3・#11、tco-vendor-lts #1・#2・#5 |
| OI-R13 | 連携ハンドブック類の相互参照: CON-00・INT-02・INT-06 の「未作成」記述の修正、FAQ のリンク補完と依存 FQ の改訂、G-143 の置き場所（roadmap-interim）、DL-66・DL-67 への OB-0 と DoR の反映、根拠リンクの CI 検査 | A | 各文書の所有者、DL-42 の所有者、PEP SDK・開発者支援チーム | DEC-8 前 | OI-M01（DL-42 は作成済み・検証待ち）、OI-R29（8-4 の提供順序） | 申し送り済み・未反映 | 10_integration/README #7、developer-faq #2・#3・#8、integration-patterns #11・#12、onboarding ONB-R7、11_contracts/README #11、06-gate-plan-and-plan-b 残課題 8（INT-00 §7.1 の「未定」行への割当） |
| OI-R14 | 成果物計画・R/G 台帳の追記: DL-115 の対応 R/G、DL-49 と R-011・R-150、ADR-028 と R-150、P-18〜P-27 の §6.3 反映、テナント事象契約・利用者事象スキーマ・顧客向け設定リファレンスの DL 追加、nist-csf-iso27001 の §8 登録、ゲート割当の不一致（As-Is の G1 と G-050 の段階 2） | A | 成果物計画（TRC-03）の管理者、R 台帳の管理者（DL-101）、追跡表（DL-104） | Phase 4 | なし | 申し送り済み・未反映 | claims-catalog #4、tenant-lifecycle、ADR-028、integration-patterns #9、identity-lifecycle #11、customer-admin-responsibility #16、nist-csf-iso27001 #1、as-is-inventory #9 |
| OI-R15 | standards-status と research の更新: SS-B23 を -05（2026-10-08）へ、SD-JWT VC・RFC 9901・OpenID4VP/VCI 1.0・VC DM 2.0 ほかの行追加、PRA SS2/21 の次版、RS-14#62 の日付不一致（2025-09-16 と 2025-09-02）、research 外原典の収録（SP 800-207、AWS cell 白書、Calculus of Service Availability ほか） | A | 標準ステータス台帳（DL-84）の所有者、調査担当 | 次回月次更新 | なし | 申し送り済み・未反映 | evolution-pqc、claims-catalog #2、ADR-018 #6、fraud-abuse-controls #9、reference-architecture、dependency-tiers |
| OI-R16 | 棄却仮説の集約（ADR-001 RH-001-A〜J、ADR-007 H7-A〜K、ADR-011 RH-01〜10、ADR-018 案 B〜E、ADR-021 RH-01〜12） | A | traceability の担当 | Phase 4 | なし | 完了（集約は traceability/rejected-hypotheses.md に記録。G-008 の作成者以外の判定と Wave B/C ADR との再同期は OI-V01 で未達） | ADR-001 #10、ADR-007、ADR-011 #12、ADR-018 #10、ADR-021 #9 |
| OI-R17 | ID 体系と規約: RA-、OI-、PC-、ローカルラベル（BF・AS・分類コード・X・Z）の CONVENTIONS §2 への登録可否、未登録の新規仮定 ID をタグに入れる書き方（XR-36）、ARC-07 の接頭辞の見直し（XR-35）、監査欄名と claim 名の対応表（XR-34） | A | CONVENTIONS の所有者（統括者）、DL-77 の作成者 | Phase 4 の自動検査の前 | なし | 未着手 | exception-risk-acceptance #12、principal-catalog #12、data-classification #12、architecture-reconciliation-notes §4 |
| OI-R18 | 他文書の読み替えと整合: REQ-06 決裁案 1、REQ-03 J11、REQ-03 §6.5・REQ-05 §5・THR-04 §10.3 と停止権限 §3.1、REQ-05 の改訂（ADR-028 §2.15 の 4 点）、K57-3 と TD-2 の期限、data-classification §4.4 の RAG と ML の列分割、DL-48・DL-03 との整合、申し送り元による kri §8 の処置の確認 | A | 各文書の所有者（調整: 第 2 線） | G0〜G3 | なし | 申し送り済み・未反映 | exception-risk-acceptance #10、stop-authority #13、ADR-028、data-outside-pep #13・#14、operation-risk-tiers-assurance、kri #13 |
| OI-R19 | 前提台帳への登録（統治・要件・脅威系）: GOV-03 NA-01〜NA-24、GOV-04 NA-01・NA-02、GOV-05 新規仮定①〜④、GOV-06 新規仮定①〜④、GOV07-①②、KA-1〜KA-3、CTL-02 NA-1〜NA-7、NC5-1、NA-CTL04-1、IL-N1〜IL-N6、N1〜N9（主体）、N-1〜N-10（As-Is）、REQ-03・REQ-04・REQ-05・REQ-06 の新規仮定、AM-N1〜AM-N4、NA-THR01-1〜3、不正対策の新規仮定 1〜5、THR-05 ①②、KRM-3 | A | 前提台帳（DL-45）の確定責任者 | G0〜G1 | なし | 未着手 | 各文書の残課題（§7 の対応表） |
| OI-R20 | 前提台帳への登録と変更提案（構成・ADR・運用系）: 各 ADR の NA-xxx・N7・N13・NA09 ほか、ARC 各書の NA、OPS・ASR・SLO・INT・CON・POC の新規仮定。あわせて A-030・A-044・A-043・A-045 の変更提案、A-054 の改訂要否、A-070 との衝突、6 年目以降の成長シナリオ、超大規模テナントの規模分布 | A・B | 前提台帳の確定責任者、CTO＋CFO＋人事責任者（A-054） | G1〜G3 | なし | 未着手 | capacity-model #1・#2・#6・#11、operating-model #2、ADR-003 #3、各文書の残課題（§7） |

#### 4.7.3 追跡性の是正（追跡表 DL-104 の §0・残課題。版 0.2 で追加）

出典の正本は traceability/traceability-matrix.md の §0（2・4・6）と残課題 1〜4・11 である [D][^5]。OI-R21〜OI-R24 の ID・所有者・期限は、00_decision/01-executive-summary.md の申し送り 1〜4 の案を採った [D][^8]。

| ID | 項目 | 区分 | 担当（役割） | 期限（相対） | 依存ゲート | 状態 | 出典 |
|---|---|---|---|---|---|---|---|
| OI-R21 | G-021 の是正: 孤児 R・孤児 G・孤児 DL を 0 件にし、追跡表を再抽出して G-021（現状「不合格（是正中）」）を再判定する。関連 R を持たない G 4 件（G-043、G-052、G-129、G-133）の扱いと孤児 G の定義、未作成 DL の作成後の再抽出、§7 の手順の自動検査への組込み、番号のない参照の ID 化を含む | A | 追跡表（DL-104）の担当、G 台帳（DL-102）の担当、DL-111 の担当 | 次回決裁（DEC-1〜DEC-9）前 | OI-R22 | 未着手 | traceability-matrix §0 の 2・4、残課題 2・6・7・10、01-executive-summary 申し送り 1 |
| OI-R22 | G 台帳の関連 R を R-requirements.md の R-ID で再照合し、個別の G に結び付かない R 78 行（G に全く結び付かない R 6 件: R-278〜R-283）に G を割り当てる。追跡表 §4.4 の候補を出発点にする | A | G 台帳（DL-102）の担当 | 次回決裁前（G-021 再判定の前） | なし | 未着手 | traceability-matrix §0 の 2、§3.2、残課題 1、01-executive-summary 申し送り 2 |
| OI-R23 | 区分 C の R 147 行のうち TC・RB・EX のいずれにも未割当の 41 行への割当と、設定上限型の数値契約の扱いの決定 | A・C | PoC リード（DL-22）、数値契約（DL-20）の担当 | DEC-8 前かつ G4 入場（DEC-4）前（事前登録の凍結前） | OI-C01 | 未着手 | traceability-matrix §0 の 6、§3.5、残課題 3、01-executive-summary 申し送り 3、02-prior-findings-crosswalk 残課題 6 |
| OI-R24 | 統制台帳の TH-TC 58 件のうち TC への吸収先が記録されていない 47 件について、吸収先（TC-xxx）を試験計画に記載し、統制台帳の試験欄と照合する | A・C | PoC リード（DL-22）、統制台帳（DL-28）の担当 | DEC-8 前かつ DEC-4 前（事前登録の凍結前） | OI-C01、OI-R10 | 未着手 | traceability-matrix §0 の 6、§3.5、残課題 4、01-executive-summary 申し送り 4 |
| OI-R25 | G-003 の許容度と受容者の照合: S-18・S-14 の許容度項目の設定、GOV-03 §7 の受容者を DCS-05 の RRG-ID と段に置き換えた後の §3.6.2 の再照合。前提として GOV-03 §7 の列追加、GOV-02 の許容度項目、SLO-01 の SLI-ID 採番、G 台帳の G-003 合格基準の改訂（追跡表の申し送り 1〜4） | A・B | 追跡表（DL-104）の担当、GOV-03・GOV-02・SLO-01・DL-102 の各所有者 | Phase 4（DEC-1・DEC-6 の前） | OI-B43 | 申し送り済み・未反映 | traceability-matrix §0 の 8、§3.6、残課題 11、他文書への申し送り 1〜4 |

#### 4.7.4 決裁文書群（00_decision）の申し送り（版 0.2 で追加）

出典の正本は各 DCS の「他文書への申し送り」節と残課題である [D][^6][^7][^8][^9][^11][^12][^14][^15]。宛先の文書が改版されるまで、状態は「申し送り済み・未反映」とする [D]。

| ID | 項目 | 区分 | 担当（役割） | 期限（相対） | 依存ゲート | 状態 | 出典 |
|---|---|---|---|---|---|---|---|
| OI-R26 | 決裁パッケージ内の範囲と相互参照の整合: 次回決裁で求める DEC の範囲を DCS-03 §2.3 に揃える（DCS-00 §1・§3、DCS-01 §0・§3、DCS-06 §0 の 2・§3.2・§3.4・§3.5）、DEC-3 の関連ゲートを「次回決裁で先行し、G3 で点検」に改める、G 台帳 §4.2 段階1 の文言、deliverables §6.1 の DEC 表、DCS-02 の DEC-7 行の暫定クローズ表記と区分 A のクローズ規則、作成済みの文書を「未作成」と書いている記述（DCS-03 残課題 2・6、DCS-06 残課題 6・7、DCS-02 残課題 3）の更新、決裁範囲の一致の機械検査の追加 | A | 決裁文書の担当、DL-42 の担当（CTO）、G 台帳（DL-102）・TRC-03・DL-111 の担当 | 次回決裁の起案時 | なし | 申し送り済み・未反映（TR-1・TR-2 は DCS-00 の申し送り C-2 が DCS-00・DCS-01 版 0.2 で反映済みとしているが、2026-10-15 の作業ツリーの DCS-01 は版 0.1 であり、作成者以外の確認もない） | 03-decision-items TR-1〜TR-3・TR-9・残課題 2・6・8、06-gate-plan-and-plan-b H-2・H-3・残課題 6・7・12、00-cover 申し送り C-1〜C-3、02-prior-findings-crosswalk 申し送り 1〜3・残課題 3・4 |
| OI-R27 | 予算・費用の値の整合: PoC の非要員費（managed 候補の契約環境、評価契約、合成 100 万人の負荷環境、KMS・HSM、独立立会人）の費目別の幅と予備費率の選択肢、DEC-4 決議文案 1 の予算上限の候補値（約 0.4〜2.2 億円の範囲）、DCS-07 §8.3 の決議文案の 2 段化、PoC 要員の系統 1・系統 2 への振り分けの DL-42 との照合、DCS-01 §5・§8 の ④ の費用・要員を 48〜66 FTE 前提の値に改める、48 FTE を確約できない場合（W-2f）の行き先、② と ④ のプログラム単位の再採点、本案のライセンス・インフラ・保証と ② ③ の費用の TBD、W-1b・W-3a の閾値 | A・B | DCS-07 の担当、調達責任者、CFO、DL-42 の担当、DCS-01 の所有者、運用責任者、CTO | DEC-4 第 2 段（G4 入場前。可能なら次回決裁前） | OI-R12、OI-D01（見積り） | 申し送り済み・未反映 | 03-decision-items TR-4・残課題 12、06-gate-plan-and-plan-b H-6・残課題 1、07-organization-and-tco 残課題 2・5、08-alternatives-comparison 申し送り 1・2・4・5・残課題 3・4・9・10 |
| OI-R28 | DEC-3 前の ADR・台帳の改版: ADR-013 D13-02 の不可逆範囲の注記（英国の置き場所は可逆な配置の値）、ADR-021 §6.3 の RR21-01 の受容者を段 2（CEO）・CISO を同意者に、T-10 の条件文の改訂、dissent-log に DEC-3 を (1)(2) で決める場合の CISO の異議と U-01 で (a) を採らない場合の ADR-007 起草側の異議の登録欄 | A | ADR-013・ADR-021 の起案者、dissent-log の所有者 | DEC-3 前 | なし | 申し送り済み・未反映 | 03-decision-items TR-6〜TR-8・残課題 3・4 |
| OI-R29 | DEC-8 の 2 段化に伴う改版: ADR-022 D-11 に第 1 段の選択肢と条件 ②③ の実測時期を追加（8-1）、DCS-05 に 0.x・rc 期間の手戻りの残余リスク行を追加（8-2）、G-129 の委託契約条項案の追記（8-3）、onboarding §9・INT-00 §0-3・§7.1 の提供順序（8-4）、DCS-01 §9 の並行開発の開始条件（8-5）、CON-01 §13.1 の rc 期間の告知期間と RS-16 の SemVer 項目の検証（8-6）。第 1 段 (B) の告知期間の値（TBD、所有者 CTO） | A・B | ADR-022 の起案者と CTO、DCS-05 の担当、調達部門・法務、INT 文書の担当、決裁文書の担当、CON-01・RS-16 の担当 | DEC-3 前（8-1）、DEC-8 第 1 段の前（8-2・8-3・8-6）、次版（8-4・8-5） | OI-B38 | 申し送り済み・未反映 | 03-decision-items 申し送り 8-1〜8-6・残課題 10 |
| OI-R30 | DCS-06 から DCS-03・DCS-00 への申し送り: DEC-10「G0〜G3 の段階予算」の新設案を DCS-03 に取り込むか取り下げるか（H-1。DCS-00 の申し送り C-1 は DCS-03 の担当との調整を求めている）、DEC-9 決議文案 1・2 の既定経路の書き分け（H-4）、次回決裁で承認しない予算の DCS-00 §2 への明記（H-5）、DEC-1 の依存への OI-L01 の明記と決議文案 3 の改訂（H-7） | A・B | 決裁文書の担当、DCS-03 の担当、CONVENTIONS・TRC-03 の担当 | 次回決裁の起案時 | なし | 申し送り済み・未反映 | 06-gate-plan-and-plan-b H-1・H-4・H-5・H-7・残課題 12、00-cover 申し送り C-1 |
| OI-R31 | 前提台帳への登録（決裁文書系）: NA-021-1〜NA-021-5 と NA-021-1 の所有者・期限・決め方（TR-5）、NA-DCS06-1〜NA-DCS06-6 と OM-N3 の仮置き、SRE 採用開始の前倒し案の要否（H-8）、NA-DCS07-1〜NA-DCS07-4（PoC 期間上限、PoC 要員の人数、稼働率の下限、予備費率）と OPS-02 OM-N1〜OM-N6、OPS-03 NA-OPS03-1〜6、NA-001-1〜3、A-054 の改訂、NA-DCS08-1〜NA-DCS08-4、A-115（従業員 3 万人）の扱い | A・B | 前提台帳（DL-45）の確定責任者、プロダクト責任者、CTO＋CFO＋人事責任者（A-054） | G1（DCS-07 由来は G3、NA-DCS07 の値は G4 入場前） | なし | 未着手 | 03-decision-items TR-5、06-gate-plan-and-plan-b H-8・残課題 13、07-organization-and-tco 残課題 4・新規仮定表、08-alternatives-comparison 申し送り 3・残課題 8、04-program-charter 残課題 3 |
| OI-R32 | 日本 1 cell の封じ込め単位の訂正: ADR-007 N7-9・D7-17・KD7-5・RR7-01 と訂正表の「約 1,417 テナント（8,500 ÷ 6）」を、ADR-013 N13-1 の標準 cell 4 に合わせ約 2,125 テナント（21.25%）に改める。root-of-trust と compromise-runbooks（RB-01）の同じ値、決裁文書の blast radius の値と N13-1 の一致を見る機械検査の追加 | A | ADR-007 の所有者、アーキテクチャ所有者、運用責任者、統括者（DL-111） | DEC-3 前（ADR-007 は DEC-3 の対象） | OI-R02 | 申し送り済み・未反映（DCS-01・DCS-05 は修正済み） | 01-executive-summary §11 申し送り 1〜5、05-residual-risk-register §12.1 申し送り 1〜5 |

### 4.8 法務・規制

| ID | 項目 | 区分 | 担当（役割） | 期限（相対） | 依存ゲート | 状態 | 出典 |
|---|---|---|---|---|---|---|---|
| OI-L01 | 法域・規制の適用判定と法務署名（DL-34、G-011、G-054、G-139）: applicability 全体、RGM の全行と「法務: 要」32 行、分類ごとの適用規制、規制スコープの確認署名、NIS2・DORA・GDPR・個人情報保護法・HIPAA・州法の期限の適用、BIA 規制期限 | B | 法務責任者、コンプライアンス責任者 | G0（署名）、G3（解釈） | なし | 未着手 | applicability、regulations、data-classification #2、business-impact-analysis #12、cell-blast-radius、integration-patterns #8 |
| OI-L02 | 本文未取得の規範の取得と照合: PCI DSS v4.0.1（DS-12）、ISO/IEC 27001:2022・27002:2022、AICPA TSC、CSA CCM v4.1・Security Guidance v5、FISC 第 14 版、2 省 GL 第 2.0 版、ISMAP 改定案、FAIR Model v3.0・O-RT 3.1、CSF 2.0 の Function・Category 単位の対応、SP 800-61 Rev.3 本文 | A | CISO、法務責任者、CISO 組織の統制担当 | G1〜G3 | なし | 未着手 | data-classification #5・#6、applicability、nist-csf-iso27001 #2、cloud-supplychain #1〜#3、loss-scenarios、compromise-runbooks #5・#10 |
| OI-L03 | crypto-shredding の法的評価、削除期限と墓石・監査記録の保持が消去義務の例外に当たるか | B | 法務責任者＋個人情報保護責任者 | G0→G3 | なし | 未着手 | data-classification #4、tenant-lifecycle、identity-lifecycle #7、audit-privacy #1 |
| OI-L04 | 越境移転と所在: EU-US DPF の帰趨、英国から EU への移転規律、法域内集約・英国収容、EU・米国の DR（KD13-4）、再委託先・所在・移転根拠の台帳 | B | 法務責任者、CTO | G3（以後 DL-84 で四半期） | OI-L01 | 未着手 | data-classification #8、audit-privacy #1、ADR-013、regulations |
| OI-L05 | 顧客契約の条項: DPA 様式、金融顧客向け付属書、BAA 方針、export 済み監査データの削除責任、強制停止条項と事後通知、テナント条項（K-1・K-3・K-7）、標準契約書の条項案（KD-INT05-3、VC-09 の再委託） | B | 法務責任者（DL-26）、調達部門責任者 | G0〜DEC-8 前 | OI-L01 | 未着手 | regulations、audit-privacy #5、stop-authority #10、tenant-lifecycle、definition-of-ready #2・#3 |
| OI-L06 | 日本の改正法・業法の追跡: 改正個人情報保護法の政令・規則（本人通知の緩和）、犯収法施行規則の号ごとの対応、金融庁監督指針と招待メールの両立 | B | 法務責任者、プロダクト責任者 | 施行前（公布から 2 年以内）、G3 | なし | 未着手 | data-classification #7、regulations、applicability、fraud-abuse-controls #15 |
| OI-L07 | 本人確認と保証レベル: 日本の eKYC、eIDAS LoA、UK DIATF、規制業種の本人確認要件、代理人の法域別要件、eIDAS ウォレット受入の ADR の要否 | B | 法務責任者（DL-34）、CTO＋事業責任者 | G1〜G3 | OI-L01 | 未着手 | identity-lifecycle #6、principal-catalog #10、ADR-002、regulations |
| OI-L08 | 労働・不正・調査範囲外の法令: 従業員監視の適法性、EU PSR/PSD3・英国 APP 返金、FFIEC・OMB M-22-09 の現行性、EU AI 法・サイバーレジリエンス法・電気通信事業法の要否、S-17 の KRI 要否 | B | 法務責任者、RS-02・RS-13 の担当 | G0（要否）、G3（調査） | なし | 未着手 | fraud-abuse-controls #8・#10・#11、applicability、kri #16 |
| OI-L09 | アクセシビリティ: 基準の選定（JIS X 8341-3 ほか）、適合目標、提供言語、G-149 の適合試験と利用者試験 | B・C | プロダクト責任者＋法務責任者、独立立会人 | G1（基準）、段階 2（試験） | なし | 未着手 | operation-risk-tiers-assurance、applicability |

### 4.9 照合・独立レビュー

| ID | 項目 | 区分 | 担当（役割） | 期限（相対） | 依存ゲート | 状態 | 出典 |
|---|---|---|---|---|---|---|---|
| OI-V01 | 作成者以外の判定が要る G: G-004（第三者再導出）、G-008（棄却仮説）、G-014、G-055（計算の人による再計算）、G-077、G-098・G-100・G-135、G-101、G-124、G-125、G-128、G-132 | A | 作成者以外のレビュアー（人）、CISO | Phase 4〜段階 1 | なし | 未着手 | threat-catalog #2、capacity-model #9、rejected-hypotheses、principal-catalog #11、definition-of-ready #1、developer-faq #1、onboarding ONB-R10、rfp-sow #13 |
| OI-V02 | 引用監査（DL-29）の全件実施と、research 外で取得した原典の照合ログの traceability/ への追記（全 35 文書の残課題に共通） | A | 引用監査の担当、照合ログの所有者 | Phase 4 | なし | 未着手 | 各文書の残課題（§7） |
| OI-V03 | 人による全文書のレビュー: 本プログラムの文書は AI エージェントの起草と AI による独立レビューまでで、人の照合を経ていない | A | CTO が指名するレビュアー | DEC-8 前（契約）、Phase 4 | なし | 未着手 | 11_contracts/README #5・#10、developer-faq #9、mock-contract-test-kit #7 |
| OI-V04 | research/RS-18 の独立検証（verification 記録の作成） | A | 作成者以外の照合者 | G3 | なし | 未着手 | principal-catalog #14、authorization-model #15、claims-catalog #13、authz-modeling-guide #18 |
| OI-V05 | 模擬パネル（Phase 4）による評価。ADR-006・ADR-012・ADR-015 は 3 レンズ・判定者 3 名の手続きを経ていない | A | Phase 4 の統括者 | Phase 4 | OI-M03 | 並行作業中 | ADR-006、ADR-012、ADR-015 |
| OI-V06 | 未確認事項の原典確認: 外部 LLM の契約条件、CDN の所在、machine unlearning、外部 RP の ML-DSA 対応、HSM の ML-DSA、KMS の ML-DSA 単価、RHBK の修正日数、ZITADEL の major サポート、AuthZed の価格、Keycloak 採用版の文書、SSDF RV.3 の本文（§6） | A | 調査担当、CTO（RFP の質問票） | G3 | なし | 未着手 | data-outside-pep #6〜#8、ADR-015、tco-vendor-lts #7、ADR-017、product-evaluation-exit #9 |
| OI-V07 | DEC-7 のクローズの前提となる検証（版 0.2 で追加）: DCS-02 の全 326 行の閉じ方・状態・検証者欄の作成者以外による抜取り検証（G-022）、検証記録のない 168 行の対応文書へのレビュー記録の付与、暫定クローズ候補 35 行の人の検証者（内部監査または指名レビュアー）による抜取り確認と確定クローズ | A | 内部監査または CTO が指名するレビュアー、各対応文書の所有者 | Phase 4（抜取り確認は DEC-7 の前） | OI-V03 | 未着手 | 02-prior-findings-crosswalk 要旨 4・残課題 1・2・8 |

### 4.10 成果物の作成・検証（2026-10-15 の作業ツリーで確認）

- 版 0.3（最終整合、2026-10-15 12:03 の作業ツリー）: 自動検査（DL-111）の再実行で、§8 にあって存在しないファイルは 09_assurance/pentest-redteam-plan.md と 12_poc/measurement-report.md の 2 件になった（traceability/consistency-checks.md §8）[D]。traceability/independent-challenge-review.md（DL-108）、traceability/mock-panel-report.md（DL-109）、12_poc/code/README.md（DL-82）は作成済みである [D]。
- 版 0.1 では本節を「未作成成果物」とし、00_decision の 9 文書と Phase 4 の traceability 文書を未作成としていた [D]。2026-10-15 の作業ツリーで deliverables.md §8 のファイル一覧と照合し直した結果、§8 にあって存在しないファイルは 09_assurance/pentest-redteam-plan.md、12_poc/measurement-report.md、traceability/independent-challenge-review.md、traceability/mock-panel-report.md の 4 件と、research/verification の RS-18 分である [D][^10]。作成済みの文書は git では未追跡（未コミット）であり、版はすべて draft である [D]。
- 作成済みの文書は「作成者以外の検証待ち」とし、閉じた扱いにしない [D]。各文書が自身の残課題に掲げる作成者以外の検証（例: DCS-04 残課題 10、DCS-05 残課題 11、DCS-07 残課題 10、DCS-08 残課題 1、traceability-matrix 残課題 8）は、OI-M01・OI-M04 に束ねた [D]。

| ID | 項目 | 区分 | 担当（役割） | 期限（相対） | 依存ゲート | 状態 | 出典 |
|---|---|---|---|---|---|---|---|
| OI-M01 | 00_decision/ の 9 文書（表紙 DL-36、エグゼクティブ要約 DL-37、前回指摘対照表 DL-38、決裁事項 DL-39、プログラム憲章 DL-40、残余リスク台帳 DL-41、ゲート計画と Plan B DL-42、体制と TCO DL-43、代替案比較 DL-44）の作成者以外による検証（G-025・G-026 ほかの判定）と、DCS-07 の再計算の検算 | A | 作成者以外のレビュアー、traceability/ の照合担当 | Phase 4 | OI-R26（決裁パッケージ内の整合） | 作成済み・作成者以外の検証待ち（9 文書とも draft・未コミット） | deliverables §8、03-decision-items 残課題 9、04-program-charter 残課題 10、05-residual-risk-register 残課題 11、06-gate-plan-and-plan-b 残課題 10、07-organization-and-tco 残課題 10、08-alternatives-comparison 残課題 1 |
| OI-M02 | 未作成: 09_assurance/pentest-redteam-plan.md（DL-59）、12_poc/measurement-report.md（DL-81）、research/verification/RS-18-verification.md（OI-V04 と同件） | A・C | CISO（DL-59）、PoC リード（DL-81）、作成者以外の照合者（RS-18） | G3〜G4（DL-81 は G4 の実測後） | DL-81 は OI-C01〜OI-C11 の実測 | 未着手 | deliverables §8、consistency-checks §5.5 |
| OI-M03 | 未作成: traceability/independent-challenge-review.md（DL-108、決裁パッケージ付属 J。本リポジトリ内のものは AI による自己反証で、報告系統外の独立反証は D）、traceability/mock-panel-report.md（DL-109。模擬パネルの判定・指摘・是正状況。実在の CTO/CISO の決裁ではない自己レビューであることを冒頭に明記） | A（独立反証は D） | Phase 4 の各担当、作成者以外のレビュアー（ICR-22） | Phase 4 | なし | 作成済み・作成者以外の検証待ち（版 0.3。両文書とも draft。DL-108 は AI 自己反証であり、報告系統外の独立反証（G-007）は未達で OI-J04 の ICR-21 で追う。DL-109 のラウンド 3 の是正 16 件は再審査未実施、Medium/Low 106 件は未処理） | deliverables §4.8 DL-108・DL-109、§6.2 付属 J、traceability-matrix 残課題 8 |
| OI-M04 | traceability-matrix.md（DL-104）、consistency-checks.md（DL-111）、change-log.md（DL-112）、ルートの README.md（DL-35）、12_poc/code/README.md（DL-82）とコード本体の作成者以外による検証。12_poc/code のコミットとコミットハッシュの記録 | A・C | 作成者以外のレビュアー、PoC リード（DL-82） | Phase 4 | なし | 作成済み・作成者以外の検証待ち（いずれも draft・未コミット） | deliverables §8、traceability-matrix 残課題 7・8 |
### 4.11 独立反証の未回答項目と模擬パネルの非机上指摘（版 0.3 で追加）

- 独立反証レビュー（DL-108、AI による自己反証）は、pre-mortem・steelman・数値への攻撃の 53 件の指摘のうち 3 件を「未回答」（既存文書に該当する記述が見当たらない）と判定し、残課題 ICR に載せた [D]（independent-challenge-review §6.1・§6.2）。OI-J01〜OI-J03 はその 3 件である [D]。部分回答 28 件と未検証の条件 12 件を束ねた ICR-01〜ICR-22 は、OI-J04 に 1 行で登録した。ICR ごとの行への分割は、ICR の所有者が合意した後に行う [D]。
- 模擬パネル（DL-109）は、経営判断・実測・第三者評価でしか閉じない事項のうち残課題・決裁案として開示済みのものを指摘から除いた。そのため desk_closable=false の指摘は 3 ラウンドとも 0 件である [D]（mock-panel-report §3）。除外は解決を意味しないため、パネリストが判定理由で除外を明示した事項を、§3 の区分ごとに OI-P01〜OI-P04 として登録した [D]。各行の項目は既存の OI 行と重なる。本節の行は「パネルが除外した」ことの記録と既存行への索引であり、既存行を置き換えない [D]。
- 判定（未回答・除外）は、いずれも同じパイプラインの AI エージェントによる自己レビューの結果であり、実在の CTO/CISO の決裁ではない（CONVENTIONS §8）[D]。

| ID | 項目 | 区分 | 担当（役割） | 期限（相対） | 依存ゲート | 状態 | 出典 |
|---|---|---|---|---|---|---|---|
| OI-J01 | 未回答 PM-4c: テナント内階層（containment・membership・管理委任範囲）の 3 関係の分離案が RS-18 にあるが、RS-18 は draft で検証記録がなく、ARC-05・ADR に取り込まれていない。RS-18 の検証記録を作成し、取込みの可否を決める（ICR-08） | A・B | CTO（ARB）、作成者以外の照合者（RS-18 の検証） | G2 | OI-V04（RS-18 の独立検証）、DEC-3 | 未着手 | independent-challenge-review §2.4 PM-4c、§6.2 ICR-08 |
| OI-J02 | 未回答 SM-1b: 代替案比較（DCS-08）の R2 は managed 側の残余に事故事例を挙げる一方、本案（自社運用）の残余に事故の基準率がなく比較が非対称である。④ に固有の部品（共有 PDP、self-host の AS・STS）ごとの越境・鍵侵害の確率への寄与と、self-host の鍵運用事故の基準率を ② と同じ尺度で示す（ICR-13） | A・B | CTO | G3 | DEC-9 | 未着手 | independent-challenge-review §3.1 SM-1b、§6.2 ICR-13、他文書への申し送り 5 |
| OI-J03 | 未回答 SM-3a: 同じ予算を ① の個別改善に投じた場合（① の強い形）の 2031 年時点の越境リスクとの比較がない。x 年間の越境リスクの推移を ④ と ① の強い形で比べ、NR-3（BOLA 負例試験の CI 必須化）の As-Is 300 サービスへの展開計画を置く（ICR-06） | A・B | CTO＋事業責任者 | G1 | DEC-9、DEC-10 | 未着手 | independent-challenge-review §3.3 SM-3a、§6.2 ICR-06、他文書への申し送り 5 |
| OI-J04 | 独立反証の残課題 ICR-01〜ICR-22（部分回答 28 件と未検証の条件 MBT-01〜12 を束ねたもの。OI-J01〜OI-J03 の ICR-06・08・13 を除く）の所有者・期限の合意と個別行への分割。とくに ICR-02（多層防御の独立性、TC-002 の K2 の立会い下での再実行）、ICR-21（報告系統外の独立反証 G-007 の発注）、ICR-22（本書の判定の作成者以外による確認、G-006 の判定） | A・B・D | 各 ICR の所有者（案）、作成者以外のレビュアー（ICR-22）、CISO（ICR-21） | Phase 4（ICR-22）、G0〜G4（各 ICR の期限案） | DEC-1・DEC-3・DEC-4・DEC-5・DEC-7・DEC-9・DEC-10 | 未着手 | independent-challenge-review §5、§6.2、§7、他文書への申し送り 1 |
| OI-P01 | 模擬パネルが非机上として除外した経営承認: DEC の決議（決議 0 件）、要員確約（SRE 8 名以上、定常 48〜66 FTE）、受容票の起票（0 件）、許容度・KRI 閾値の値、損失単価 MP-01〜09、予備費率・付議基準額、パイロット確約、リードタイム目標値・窓口体制・審査 SLA | B | 取締役会・経営会議、CTO＋CISO、CFO | G0 | 既存行 OI-B01〜OI-B11、OI-B07、OI-B09、OI-B12〜OI-B14、OI-B16 | 未着手（パネルの除外は解決を意味しない） | mock-panel-report §3（経営承認） |
| OI-P02 | 模擬パネルが非机上として除外した法務判断: 法務署名（E2）、外部の現地法律意見（KRM-3）、L-01〜L-13 の結論、年齢閾値・補完的ルールの適用範囲 | B | 法務責任者 | G0（署名）、G3（解釈） | 既存行 OI-L01〜OI-L09、OI-B41（KRM-2・L-02〜L-12） | 未着手（同上） | mock-panel-report §3（法務判断） |
| OI-P03 | 模擬パネルが非机上として除外した実測: PoC の実測（C_cell、KMS 実効枠、TC-106 ほか）、SLO 値、G-123・G-146、リードタイムの実測、TCO の非要員費（RFP 実額、HSM 見積り） | C | PoC リード、SRE 責任者、CFO | G4 | 既存行 OI-C01〜OI-C17、OI-T07、OI-R27 | 未着手（同上。系統 1 の凍結前の実行記録は合否に使わない。OI-C01） | mock-panel-report §3（実測）、§6 注意 4 |
| OI-P04 | 模擬パネルが非机上として除外した第三者評価: Gate 2・Gate 5 の独立評価、cross-tenant pentest・red team、OIDF conformance、G5 の見積り | D | CISO（独立性は内部監査） | G2（Gate 2 の独立評価）、G5 | 既存行 OI-D01〜OI-D09、OI-M02（DL-59） | 未着手（同上） | mock-panel-report §3（第三者評価）、§6 注意 2 |

---

## 5. Critical/High の是正追跡（R-076、R-273、G-034）

### 5.1 規則

- Gate 5 では、Critical/High の未解決事項は原則として本番移行を止める [D][^3]。例外は期限・補完統制・影響範囲・責任者・失効条件を記した経営承認付きの risk acceptance に限り、CISO 単独へ押し付けない [D][^3]。
- 本書はこの規則を次のように運用する [D]。是正と再試験で閉じた指摘だけを「閉」とし、受容した指摘は「受容（RA-xxx）」として別に数える [D]。G-034 の合格条件は「受容分を除く未解決の Critical/High 0 件」である [D]（G-goal-criteria.md G-034）。
- 受容は本書では行わない [D]。民間では POA&M に将来の緩和を載せて受容の代わりにする扱いは認められず、すべてのリスクを開示・処置・伝達しなければならない（"all risks must be fully disclosed, treated, and communicated"）[N][^1]。将来の緩和計画は、緩和の日付に応じて、登録簿では「受容」、POA&M ではその逆として読み替える必要がある [N][^1]。本書の CH 行が期限内に閉じない場合は、例外・受容票（GOV-07 の RA-）を起票するか、停止権限（GOV-06）で本番移行を止める [D]。
- 受容済みの指摘も、許容度内に留まっていることを測り続ける必要がある [N][^2]。受容した CH 行は本書から消さず、RA- の失効日まで状態を「受容（監視中）」とする [D]。
- 報告期間内に処置できない容認不可のリスクは暗黙に受容されたものになり、「無視」は選択肢にならない [N][^1]。期限を超えた CH 行は、KRI（GOV-08）と四半期報告に載せる [D]。

### 5.2 台帳の列と証跡の所在

| 列 | 内容 | 証跡（E 種別）と所在 |
|---|---|---|
| CH-ID | CH-＜年＞-＜連番＞ | 本書 |
| 出所 | 評価の種類（独立設計レビュー、conformance、cross-tenant pentest、red team、クラウド設定・供給網レビュー）と SOW 番号 | 第三者報告書（E6）。所在は評価者との守秘条件で決める（OI-D01）。本書には報告書 ID とハッシュだけを書く |
| 重大度 | Critical／High（評価者の格付け。格付け基準は DP46-1、OI-B40） | E6 |
| 対象 | 関係する T-xxx、C-xxx、ADR、DL | 脅威カタログ、統制台帳 |
| 是正担当（役割）・是正期限 | 重大度別の是正期限は independent-assurance-plan §6.2 の TBD（OI-B06） | 本書 |
| 再試験 | 再試験の実施者と結果（実装側は格付けを変えられない。rfp-sow の独立性条件） | 再試験報告書（E6） |
| 受容 | RA-xxx、受容者、失効日、補完統制 | 例外・受容票（GOV-07）、残余リスク台帳（DL-41、00_decision/05-residual-risk-register.md。作成済み・検証待ち、OI-M01） |
| 根本原因 | §6 の分類と反映先 | 本書 §6 |
| 状態 | 開／是正中／再試験待ち／閉／受容（監視中） | 本書（E11） |

### 5.3 現在の台帳

| CH-ID | 出所 | 重大度 | 対象 | 是正担当・期限 | 再試験 | 受容 | 状態 |
|---|---|---|---|---|---|---|---|
| （登録なし） | — | — | — | — | — | — | — |

- 2026-10-15 時点で第三者評価を 1 件も実施していないため、登録された指摘は 0 件である [D]（OI-D01〜OI-D06）。
- 0 件は「未解決の Critical/High が無い」ことを示さない [D]。G-034・G-083・G-061・G-091 の判定は第三者評価の実施後であり、すべて未達である [D]。
- 自己評価（DL-61）・PoC・模擬パネルの指摘は第三者評価ではないため、この台帳には入れない [D]。それらで見つかった重大な欠陥は §4 の OI 行として追う [D]。

---

## 6. 根本原因の将来開発への反映（R-187）

- レビュー原文は、本番後も継続的な評価・演習を行い、SSDF が求めるのは脆弱性の根本原因を将来の開発へ反映する継続的工程であるとしている [D][^3]。
- SSDF の現行版は SP 800-218 1.1（final）であり、1.2 は ipd である [N][^4]。R-187 が付記する RV.3 の task の本文は research で照合していない（未確認）[D]。本節は RV.3 の文言に依らず、R-187 の要求文から導いた手順である [D]。照合は OI-V06 で行う [D]。

| 手順 | 内容 | 記録先 |
|---|---|---|
| 1 | CH 行が「閉」または「受容」になった時点で、根本原因を分類する（設計・ADR、契約・SDK、統制の欠落、試験の欠落、運用手順、供給者） | 本書 §5 の「根本原因」列 |
| 2 | 反映先を決める（ADR の改版、統制の追加、CI 検査、負例ベクタ（CON-11）、DoR・DoD の項目、runbook、製品評価軸） | 反映先文書の変更履歴（DL-112） |
| 3 | 同種の欠陥を他のサービス・契約で探す（横展開） | 本書の新しい OI 行 |
| 4 | 反映が効いたかを KRI と次回の独立評価で確認する | KRI（GOV-08）、年次独立評価（OI-O02） |

- 本手順は 1 度も実行していない [D]。状態は OI-O05 のとおり未着手である [D]。

---

## 7. 出典文書との対応

各出典文書の残課題が本書のどの行に入ったかを示す [D]。出典の項目を本書のどの行にも割り当てていない文書は、2026-10-15 時点で 0 件である [D]。ただし、この網羅の確認は作成者による自己確認であり、作成者以外の照合（OI-V01）は未実施である [D]。

| 出典文書 | 残課題の件数（出典の表記） | 主な OI 行 |
|---|---|---|
| 01_governance/assumptions-register.md | 4 | OI-R19、OI-R20、OI-C13 |
| 01_governance/business-impact-analysis.md | 15 | OI-B05、OI-B07、OI-C06、OI-L01、OI-B19、OI-V02 |
| 01_governance/durability-charter-20y.md | 11 | OI-B02、OI-B17、OI-B34、OI-C07、OI-C12、OI-O06 |
| 01_governance/exception-risk-acceptance.md | 18 | OI-B08、OI-B12〜OI-B14、OI-C12、OI-R17、OI-R18 |
| 01_governance/kri.md | 17 | OI-B16、OI-C14、OI-O01、OI-D08、OI-R18 |
| 01_governance/loss-scenarios.md | 15 | OI-B01、OI-B07、OI-D08、OI-L02、OI-R09 |
| 01_governance/raci-governance.md | 12 | OI-B09、OI-B12〜OI-B14、OI-B18、OI-C12 |
| 01_governance/risk-appetite-draft.md | 18 | OI-B01、OI-B22、OI-T05、OI-C09、OI-R19 |
| 01_governance/stop-authority.md | 13 | OI-B12、OI-B15、OI-B18、OI-C12、OI-D09、OI-L05 |
| 02_requirements/as-is-inventory.md | 11 | OI-B23、OI-C13、OI-R14 |
| 02_requirements/customer-admin-responsibility.md | 16 | OI-B22、OI-D08、OI-R14、OI-L01 |
| 02_requirements/data-classification.md | 17 | OI-B01、OI-T09、OI-L01〜OI-L04、OI-C08、OI-R17 |
| 02_requirements/identity-lifecycle.md | 15 | OI-B20、OI-T03、OI-D05、OI-L03、OI-L07、OI-C17 |
| 02_requirements/operation-risk-tiers-assurance.md | 13 | OI-B19、OI-C17、OI-L07、OI-L09 |
| 02_requirements/principal-catalog.md | 15 | OI-B20、OI-T03、OI-L07、OI-V04 |
| 02_requirements/tenant-lifecycle.md | 12 | OI-B21、OI-C09、OI-L03、OI-L05、OI-R14 |
| 03_threat-model/attacker-model.md | 10 | OI-B24、OI-R09、OI-V01 |
| 03_threat-model/dfd-entry-points.md | 10 | OI-R09、OI-B24、OI-C14 |
| 03_threat-model/fraud-abuse-controls.md | 19 | OI-B24、OI-D05、OI-L06、OI-L08、OI-R15 |
| 03_threat-model/incident-casebook.md | 11 | OI-C01、OI-D05、OI-B16、OI-B24 |
| 03_threat-model/threat-catalog.md | 11 | OI-R09、OI-C01、OI-D02、OI-T02 |
| 04_architecture/（ARC 15 文書と整合記録） | 約 189 | OI-B29、OI-B30、OI-B33、OI-B37、OI-T01〜OI-T10、OI-C04〜OI-C10、OI-R01〜OI-R07 |
| 05_adr/ADR-001〜ADR-029、README、reconciliation-notes | 未決 166 件と残課題 | OI-B03、OI-B25〜OI-B36、OI-U01〜OI-U04、OI-R01〜OI-R08、OI-R16 |
| 06_controls/（applicability、control-mapping-ledger、mappings 4 書） | 約 81 | OI-B41、OI-R10、OI-R11、OI-L01、OI-L02 |
| 07_slo/numeric-contracts.md | 9 | OI-T08、OI-B05、OI-O04 |
| 08_operations/（4 文書） | 約 49 | OI-B39、OI-C12、OI-C15、OI-R12、OI-T05 |
| 09_assurance/（5 文書） | 約 54 | OI-B06、OI-B40、OI-D01〜OI-D10、OI-O02 |
| 10_integration/（7 文書） | 約 84 | OI-B38、OI-T11、OI-C11、OI-R13 |
| 11_contracts/（README、互換性ポリシー、試験キット） | 約 37 | OI-B38、OI-R05、OI-C11、OI-V03 |
| 12_poc/preregistered-test-plan.md | 9 | OI-C01〜OI-C03、OI-O04 |
| traceability/（phase1-critique-R、rejected-hypotheses） | 9 | OI-V01、OI-R16 |
| 00_decision/02-prior-findings-crosswalk.md（版 0.2 で追加） | 残課題 8、申し送り 3 | OI-V07、OI-B10、OI-R23、OI-R26、OI-M01 |
| 00_decision/03-decision-items.md（同） | 残課題 13、申し送り TR-1〜TR-9 と 8-1〜8-6 | OI-B01〜OI-B11、OI-B42、OI-R26〜OI-R31、OI-U01、OI-R05、OI-L01、OI-M01 |
| 00_decision/04-program-charter.md（同） | 10 | OI-B02、OI-B04、OI-R31、OI-B20、OI-L01、OI-C11、OI-M01 |
| 00_decision/05-residual-risk-register.md（同） | 残課題 14、申し送り 6 | OI-B43、OI-B24、OI-C06、OI-V06、OI-R17、OI-D09、OI-R32、OI-M01 |
| 00_decision/06-gate-plan-and-plan-b.md（同） | 残課題 14、申し送り H-1〜H-8 | OI-B42、OI-B11、OI-R26、OI-R27、OI-R30、OI-R31、OI-R13、OI-R20、OI-C04、OI-M01 |
| 00_decision/07-organization-and-tco.md（同） | 残課題 10、新規仮定 NA-DCS07-1〜4 | OI-B04、OI-R27、OI-R12、OI-R31、OI-C15、OI-B09、OI-M01 |
| 00_decision/08-alternatives-comparison.md（同） | 残課題 10、申し送り 5 | OI-R27、OI-R31、OI-B11、OI-B07、OI-C13、OI-C15、OI-M01 |
| 00_decision/00-cover.md、01-executive-summary.md（同） | 申し送り（DCS-00 C-1〜C-3 ほか、DCS-01 申し送り 1〜5 と §11 の 1〜5） | OI-R21〜OI-R24、OI-R26、OI-R30、OI-R32 |
| traceability/traceability-matrix.md（同） | 残課題 11、申し送り 4 | OI-R21〜OI-R25、OI-R14、OI-M03、OI-M04 |
| traceability/independent-challenge-review.md（版 0.3 で追加） | 残課題 ICR-01〜ICR-22、未回答 3 件、申し送り 6 | OI-J01〜OI-J04、OI-M03 |
| traceability/mock-panel-report.md（版 0.3 で追加） | §3 の非机上の除外事項 4 区分、§7 申し送り 4 | OI-P01〜OI-P04、OI-M03（§4.4 の Medium/Low の群 a〜g は版 0.3 では未登録。残課題 12） |

- 件数は各文書の残課題節の表の行と箇条書きの項目を数えた値である [D]。00_decision と traceability-matrix の行（版 0.2 で追加）は、残課題に加えて「他文書への申し送り」のうち本書や宛先文書の改版を要する項目も割り当てた [D]。consistency-checks.md、change-log.md、ルートの README.md、12_poc/code/README.md には番号付きの残課題表がなく、作成者以外の検証だけを OI-M04 に載せた [D]。ディレクトリ単位の「約」は機械集計で、表の見出し行の判定に数件の誤差があり得る [D]。1 項目が複数の OI 行に分かれたものがあるため、件数の合計と OI 行数は一致しない [D]。
- phase1-critique-R.md の「§5.2・§6・§7 の指摘への作成者の対応記録」は、R 表の改版または dissent-log で扱う残課題であり、OI-V01 に含めた [D]。

---

## 8. 運用規則

- 更新の契機: 各出典文書の残課題節が変わったとき、決裁・実測・第三者評価の結果が出たとき、Phase 4 の自動検査（DL-111）の結果が出たときに更新する [D]。
- 閉じ方: 行を「完了」にするには、閉じた証跡（E1 決裁記録、E2 署名、E4・E5 試験結果、E6 第三者報告書など）の所在を「出典」列に書く [D]。証跡の所在が書けない行は「完了」にしない [D]（G-130）。
- 期限の日付化: DL-42（DCS-06）§5.4 は、固定するのは次のゲートの日付だけとし、その先は相対期間で示すとしている [D][^7]。本書もこれに従い、G0 の日付が決まった時点（OI-B42）で期限 G0 の行だけを日付に置き換え、以後は各ゲートの日付が決まるたびに該当する行を日付にする [D]。超過した行は KRI に載せる [D]。
- 受容との関係: 本書の行は受容ではない [D]。期限内に閉じない B・C・D の行で残余リスクが許容度を超えるものは、GOV-07 の受容票を起票する [D][^1]。
- 担当: 本書の所有者は暫定で CISO 組織の第 2 線とする（新規仮定（前提台帳へ追加要）: open-items の所有者は第 2 線とし、更新作業はプラットフォームのアーキテクチャ審査会事務局が補佐する）[D]。

---

## 残課題

| # | 本書で閉じないもの | 担当（役割） | 閉じるゲート |
|---|---|---|---|
| 1 | 本書の集約・件数・状態判定の、作成者以外による照合（G-130、G-016 の判定を含む） | 作成者以外のレビュアー、模擬パネル | Phase 4 |
| 2 | Phase 4 の自動検査（DL-111）で、出典文書の残課題と本書の OI 行の対応を機械照合する仕組み | DL-111 の作成者 | Phase 4 |
| 3 | 相対期限の日付化（G0 の日付の決定後に期限 G0 の行から。OI-B42） | 本書の所有者 | G0 |
| 4 | 本書の所有者の確定（§8 の新規仮定の前提台帳への登録と RACI への記載） | 前提台帳の確定責任者、RACI の所有者 | G0 |
| 5 | Critical/High の格付け表と重大度別の是正期限（independent-assurance-plan §6.2 の TBD）の確定と §5.2 への反映 | CISO | G0／DEC-4 |
| 6 | 第三者報告書（E6）の保管場所と、本書に書く参照 ID・ハッシュの形式 | CISO、評価者 | G2 前 |
| 7 | 版 0.2 で 00_decision の 9 文書と追跡表を再集約した。未作成の DL-59・DL-81・DL-108・DL-109 の作成後と、各文書の模擬パネル ラウンド 2 以降の改版後の再集約、および本書の行数・状態と出典文書との機械照合（残課題 2）は未実施 | 本書の所有者 | Phase 4 |
| 8 | OI- 接頭辞の CONVENTIONS §2 への登録（OI-R17 に含む） | CONVENTIONS の所有者 | Phase 4 |
| 9 | SSDF RV.3 の本文照合と §6 の手順の見直し（OI-V06 に含む） | 調査担当 | G3 |
| 10 | 本書は AI エージェントの起草による自己レビューであり、実在の CTO/CISO の承認、DEC-7 の決裁、第三者の確認はいずれも未達である | CTO＋CISO | DEC-7 |
| 11 | 版 0.2 で追加した 16 行の所有者・期限は出典文書の案を転記したもので、所有者本人の合意を得ていない | 本書の所有者、各行の担当 | G0 |
| 12 | 模擬パネルの Medium/Low 106 件（mock-panel-report §4.4 の群 a〜g）と、ラウンド 3 の是正 16 件の再審査未実施・差戻し 2 名（内部監査、CFO/PMO）の扱いを、OI 行として登録する。版 0.3 では非机上の除外事項（OI-P01〜OI-P04）だけを登録した | 本書の所有者 | 次回決裁の起案前 |
| 13 | 版 0.3 で追加した 8 行（OI-J01〜OI-J04、OI-P01〜OI-P04）の所有者・期限は出典文書の案の転記であり、所有者本人の合意と、作成者以外による照合を得ていない | 本書の所有者、各行の担当 | G0 |

## 他文書への申し送り

本書以外は編集しない作業範囲のため、次を各文書の所有者に申し送る [D]。

| # | 申し送り先 | 内容 | 所有者（案） | 期限（案） |
|---|---|---|---|---|
| 1 | 00_decision/01-executive-summary.md §10、他文書への申し送り 1〜5、§11 申し送り 4 | 追跡性の 4 点は POA&M に OI-R21〜OI-R24 として登録済みであり（ID は案のとおり確定）、「POA&M に行がなく」の記述を改める。行数は「127 行→131 行」ではなく、他の追加と合わせて 143 行である。§11 申し送り 4（ADR-007 N7-9 ほか）は OI-R32 として登録済みである | DCS-01 の所有者 | 次版 |
| 2 | 00_decision/05-residual-risk-register.md §12.1 申し送り 4 | OI-R32 として登録済みである旨に改める | DCS-05 の担当 | 次版 |
| 3 | 00_decision/02-prior-findings-crosswalk.md 残課題 5 | 繰延べ 23 行の登録先を OI-B10（DEC-7）とした。行ごとのゲート割当は DEC-7 の決裁後に OI-B10 から行を分けて登録する | DCS-02 の担当 | DEC-7 |
| 4 | 00_decision/00-cover.md 脚注 9 | 参照箇所「§4.10 OI-M01〜OI-M03」の意味が変わった（OI-M01 は作成済み・検証待ち、未作成は OI-M02・OI-M03）。引用している記述が「00_decision が未作成」の意味であれば改める | DCS-00 の担当 | 次版 |
| 5 | traceability/traceability-matrix.md C-015 行、06_controls/control-mapping-ledger.md の C-015 の試験・証跡行 | 証跡の所在「traceability/open-items.md（未作成）」を、作成済み（TRC-11 版 0.2、§5）に改める | 追跡表（DL-104）の担当、統制台帳（DL-28）の担当 | 次版 |
| 6 | README.md 要旨、traceability/change-log.md の追跡表・残課題台帳の行 | 「POA&M 127 行」を「143 行（版 0.2）」に改める | README（DL-35）・変更履歴（DL-112）の担当 | 次版 |
| 7 | 12_poc/code/README.md 冒頭 | POC-01 を「凍結コミット 151940a」と書いているが、POC-01 版 0.1 は自身を事前登録の案とし、凍結（§2）は Phase 4 の独立検証の後に行うとしている（本書 OI-C01 は並行作業中）。「凍結」が事前登録の凍結を指すのか、参照した版のコミットを指すのかを明記する | PoC リード（DL-82） | DEC-4 前 |
| 8 | traceability/consistency-checks.md | (1) 本書の §3.1・§3.2 の行数と §4 の表の行数の一致、(2) 各文書の「他文書への申し送り」で宛先が open-items.md の項目が本書の OI 行に対応しているか、(3) 作成済みのファイルを「未作成」と書く記述、の 3 つの機械検査を追加する | DL-111 の担当 | Phase 4 |

## 参考文献

[^1]: S. Quinn et al. (NIST)『Prioritizing Cybersecurity Risk for Enterprise Risk Management』NIST IR 8286B-upd1, 2025-02. https://doi.org/10.6028/NIST.IR.8286B-upd1 （参照箇所: §2.3, §2.3.1, §2.3.6、確認日: 2026-10-03。RS-01#22、RS-01#23、RS-01#24）
[^2]: S. Quinn et al. (NIST)『Integrating Cybersecurity and Enterprise Risk Management (ERM)』NIST IR 8286r1, 2025-12. https://doi.org/10.6028/NIST.IR.8286r1 （参照箇所: §3.6.2、確認日: 2026-10-03。RS-01#20）
[^3]: 『20年運用を前提とした認証・認可基盤提案のCTO/CISOレビュー』. 20年運用を前提とした認証・認可基盤提案のCTO CISOレビュー.md （参照箇所: 進め方の再設計 Gate 0〜6、とくに Gate 5・Gate 6、確認日: 2026-10-15。本書が満たすべき要求の出所として引く。事実の根拠には使わない）
[^4]: NIST (M. Souppaya, K. Scarfone, D. Dodson)『SP 800-218: Secure Software Development Framework (SSDF) Version 1.1』final, 2022-02. https://csrc.nist.gov/pubs/sp/800/218/final （参照箇所: 版と状態、確認日: 2026-10-03。RS-05#79・#80、research/standards-status.md SS-E36・SS-E37）
[^5]: 本リポジトリ『R/G 追跡表（双方向トレーサビリティ）』TRC-04 版 0.1. traceability/traceability-matrix.md （参照箇所: §0 の 2・3・4・6・8、§3.5、残課題 1〜11、他文書への申し送り 1〜4、C-015 行、確認日: 2026-10-15）
[^6]: 本リポジトリ『決裁事項詳細（DEC-1〜DEC-10）』DCS-03 版 0.3. 00_decision/03-decision-items.md （参照箇所: §4.4、§4.7、§4.9、残課題 1〜13、DEC-1・DEC-3・DEC-4・DEC-7 是正の他文書への申し送り TR-1〜TR-9、DEC-8 是正の他文書への申し送り 8-1〜8-6、確認日: 2026-10-15）
[^7]: 本リポジトリ『ゲート計画と Plan B』DCS-06 版 0.2. 00_decision/06-gate-plan-and-plan-b.md （参照箇所: §5.4 日付の決め方、§6、§11 申し送り H-1〜H-8、残課題 1〜14、確認日: 2026-10-15）
[^8]: 本リポジトリ『エグゼクティブ要約（決裁用 1 枚）』DCS-01 版 0.1. 00_decision/01-executive-summary.md （参照箇所: §10 未達と限界、他文書への申し送り 1〜5、§11 他文書への申し送り 1〜5、確認日: 2026-10-15）
[^9]: 本リポジトリ『体制と TCO（決裁要約）』DCS-07 版 0.1. 00_decision/07-organization-and-tco.md （参照箇所: §6、残課題 1〜10、新規仮定 NA-DCS07-1〜4、確認日: 2026-10-15）
[^10]: 本リポジトリ『成果物計画』TRC-03. traceability/deliverables.md （参照箇所: §4.1 DL-35〜DL-44、§4.6 DL-81・DL-82、§4.8 DL-104・DL-108〜DL-112、§6.2 付属 J、§8 ファイル一覧、確認日: 2026-10-15）。ファイルの有無と git の追跡状態は 2026-10-15 の作業ツリーで確認した
[^11]: 本リポジトリ『決裁パッケージ表紙』DCS-00 版 0.2. 00_decision/00-cover.md （参照箇所: 他文書への申し送り C-1〜C-3、脚注 9、確認日: 2026-10-15）
[^12]: 本リポジトリ『前回指摘対照表』DCS-02 版 0.1. 00_decision/02-prior-findings-crosswalk.md （参照箇所: 要旨 3・4、§7 残課題 1〜8、§8 他文書への申し送り 1〜3、確認日: 2026-10-15）
[^13]: 本リポジトリ『プログラム憲章・スコープ・非目標』DCS-04 版 0.1. 00_decision/04-program-charter.md （参照箇所: §10 残課題 1〜10、確認日: 2026-10-15）
[^14]: 本リポジトリ『残余リスク台帳』DCS-05 版 0.1. 00_decision/05-residual-risk-register.md （参照箇所: §12 残課題 1〜14、§12.1 他文書への申し送り 1〜6、確認日: 2026-10-15）
[^15]: 本リポジトリ『代替案比較』DCS-08 版 0.2. 00_decision/08-alternatives-comparison.md （参照箇所: 残課題 1〜10、他文書への申し送り 1〜5、確認日: 2026-10-15）

## レビュー記録

| ラウンド | 指摘（重大度・指摘者） | 対応 |
|---|---|---|
| 1 | 本書への直接の指摘はなかった。決裁文書側（DCS-01、DCS-03、DCS-05、DCS-06）の指摘への対応として、本書への登録が各文書の「他文書への申し送り」に記載された | ラウンド 1 の時点では本書に反映していなかった。ラウンド 2 で反映した（下の行） |
| 2 | High（audit）: POA&M（G-130 の台帳）が作業ツリーと合っていない。00_decision の 9 文書、traceability-matrix.md、consistency-checks.md、change-log.md、README.md、12_poc/code（DL-82）は存在するのに OI-M01〜OI-M03・OI-B02 ほかが「未作成」のままで、要旨は DL-42 の未作成を日付化の前提としている。一方、実在する未達（DCS-01 §10 の OI-R21〜R24、DCS-03 の TR-1〜TR-9 と 8-1〜8-6、DCS-06 の H-1〜H-8、DCS-07 の NA-DCS07、DL-108（付属 J）と DL-109 の未作成）が行になっていない | (1) deliverables.md §8 のファイル一覧と 2026-10-15 の作業ツリーを照合し、存在しないのは DL-59、DL-81、DL-108、DL-109 と RS-18 の検証記録だけであることを確認した [D][^10]。§4.10 を「成果物の作成・検証」に改め、作成済みの 00_decision 9 文書を OI-M01、traceability の 3 文書・README・DL-82 を新設の OI-M04 とし、状態を「作成済み・作成者以外の検証待ち」にした。§2.2 にこの状態を追加した。OI-M02・OI-M03 は未作成のものだけに絞り、DL-108 が付属 J であることと DL-109 の自己レビュー明記の要件を書いた。(2) OI-B02・OI-B04・OI-B10・OI-B11 の依存から「未作成」を外し、DCS-03・DCS-04・DCS-06・DCS-07 の決裁案の所在を示して状態を「案あり・決裁前」に改めた。OI-C02・OI-R13・§5.2 の参照も直した。(3) 追跡表 §0 と残課題で数値を確認し[^5]、OI-R21〜OI-R24（DCS-01 の ID 案を確定）と、同じ追跡表の G-003 の照合を OI-R25 として登録した。(4) DCS-03 の TR-1〜TR-9・8-1〜8-6、DCS-06 の H-1〜H-8、DCS-07 の NA-DCS07-1〜4、DCS-00・DCS-02・DCS-05・DCS-08 の申し送りと残課題を読み[^6][^7][^9][^11][^12][^14][^15]、OI-R26〜OI-R32（§4.7.4）、OI-B42・OI-B43（§4.1.6）、OI-V07 に所有者・期限付きで登録した。(5) DL-42 は作成済みだが、DCS-06 §5.4 は次のゲートの日付だけを固定し G0 の日付は未定であることを確認し[^7]、要旨・§2.1・§8・残課題 3 の日付化の前提を「G0 の日付の決定（OI-B42）」に改めた。(6) 要旨・§3.1・§3.2・§7 を再集計した（127 行→143 行）。他文書の修正が要る点は「他文書への申し送り」1〜8 に記載した |
| 最終整合（版 0.3） | 指摘ではない。independent-challenge-review の他文書への申し送り 1（DL-108 の状態更新と ICR の登録）と、mock-panel-report §3（非机上の除外事項）を受けた追随 | §4.11 を新設し、未回答 3 件（PM-4c、SM-1b、SM-3a）を OI-J01〜OI-J03、ICR-01〜ICR-22 の束を OI-J04、非机上の除外事項 4 区分を OI-P01〜OI-P04 として登録した。OI-M03 の状態を「作成済み・作成者以外の検証待ち」に改め、§4.10 の前書きに DL-82・DL-108・DL-109 の作成を追記した。要旨、§3.1、§3.2、§7、残課題 12・13 を更新した（143 行→151 行） |

- 本記録は模擬パネルによる自己レビューへの対応、および AI エージェント（final-consistency 担当）による更新であり、実在の CTO/CISO の決裁ではない [D]。版 0.2・0.3 の再集計も作成者による自己確認であり、作成者以外の照合（残課題 1）は未実施である [D]。
