# 自動検査仕様と結果（規約・ID・リンク・契約ファイルの整合）

> 文書ID: TRC-12 / 版: 0.2 / 状態: draft / 最終更新: 2026-10-15（0.2: Phase 4 の最終整合で検査を再実行し、結果を §8 に追記した）
> 対応要求: R-197, R-199, R-200（DL-111）／G-017, G-035, G-131（判定者に自動検査 DL-111 を指定する行）。関連: G-021, G-138
> 依存文書: CONVENTIONS.md, traceability/deliverables.md（DL-111 行、§8）, traceability/G-goal-criteria.md, traceability/traceability-matrix.md, traceability/open-items.md, .workflows/checks/run_checks.py, .workflows/checks/render_report.py, .workflows/checks/out/
> 作成方法: AI エージェント（Claude）が検査スクリプトを書き、実行し、機械的に直せる違反だけを直した。検出結果の内容判断（禁止表現の文脈、ID 体系の衝突、主張タグの要否）はこのエージェントの自己判断であり、作成者以外の確認は済んでいない。模擬パネルの判定ではなく、実在の CTO/CISO の決裁でもない（CONVENTIONS §8）[D][^1]。

---

## 0. 要旨

- 8 項目の検査を `python -I .workflows/checks/run_checks.py` として再実行できる形で置いた。是正前・是正後の件数は付録 A.1 にある [M]（生データ: .workflows/checks/out/results-before.json, results-after.json。PoC 試験ではないので TC-ID はない）。
- 機械的に直したのは次の 3 種類である [D]。(a) メタ情報ブロックの欠落 3 文書（自動挿入）、(b) 文書ID の不一致・衝突 7 文書、(c) deliverables.md §8 に載っていない 20 ファイルの登録と DL-116 の追加（付録 A.2）。
- 是正後も残る検出は、すべて内容判断が要るものである（§5）[D]。主なものは次の 4 つである。(1) 00_decision と ADR 本文にある主張タグ欠落の候補 191 箇所、(2) 統合パターン P-xx と DFD のプロセス番号 P-xx の名前空間衝突、(3) 本文が参照する計画外のファイル 7 種、(4) RS-18 が脚注形式の原典引用を持たないこと [D]。
- 禁止表現は 35 箇所で検出したが、目視ですべて引用・否定文・ゴール再定義の文脈と判定した。規約違反は 0 件である [D][^1]。
- 相対リンク切れ、未定義脚注、重複定義、JSON 構文エラー、OpenAPI lint error は是正前から 0 件であった [M]。
- 最終整合（2026-10-15）で再実行した結果は §8 にある [M]。メタ情報欠落・ID の重複定義・リンク切れ・未定義脚注・§8 未登録・JSON 構文エラー・OpenAPI lint error は 0 件のままである [M]。一方、模擬パネルの是正による改版で、未定義 ID が 13 種に、主張タグ欠落の候補が 206 箇所に増え、§8 にあって未作成のファイルは 2 件に減った [M]。このため G-131 と G-017 は不合格（是正中）である [D]。

## 1. 目的と範囲

- CONVENTIONS 冒頭は「違反は Phase 4 の自動検査で検出・是正する」と定める。本書はその検査の仕様と結果を記録する [D][^1]。
- deliverables.md は DL-111 に、規約違反、ID 整合、§8 ファイル一覧との差分、リンク切れの検査仕様と実行結果を割り当てている [D][^2]。G-131 は、メタ情報欠落・未定義 ID・ID 重複・リンク切れ・§8 との差分の 0 件を合格条件にしている [D][^3]。
- 検査対象は、リポジトリ内の Markdown（12_poc/code/ と .workflows/ を除く）、11_contracts/ の OpenAPI と JSON Schema、12_poc/code/model/ の JSON である [D]。12_poc/code/node_modules と 12_poc/tools は外部配布物なので対象外にした [D]。
- 既存の baseline 文書（CONVENTIONS.md、旧提案書、レビュー原文、traceability/seed/ の 3 件）は編集対象ではないので、メタ情報・禁止表現・ID の検査から外した [D][^2]。research_notes/ は deep research の作業メモなので、メタ情報・禁止表現・ID の検査から外した [D]。

## 2. 実行方法

| 手順 | コマンド（リポジトリ直下で実行） | 出力 |
|---|---|---|
| 検査のみ | `python -I .workflows/checks/run_checks.py --label <名前>` | .workflows/checks/out/results-<名前>.json と history.json（件数の推移を追記） |
| 機械的是正つき | `python -I .workflows/checks/run_checks.py --fix --label fix` | 同上。是正内容は JSON の `fixes` に記録 |
| OpenAPI を省く | `--no-openapi`（npx が使えない環境向け） | (8) の OpenAPI 欄が 0 件になる |
| 別ツリーを検査 | `--root <ディレクトリ> --outdir .workflows/checks/out` | 是正前の状態を複製した作業ツリーでの再計測に使う |
| 本書の付録を更新 | `python -I .workflows/checks/render_report.py --before before --after after` | 本書の `AUTO:BEGIN`〜`AUTO:END` の間を書き換える |
| 結果の表示 | `python -I .workflows/checks/show.py <results.json> <検査名> [区分]` | 1 行 1 件の JSON |

- 確認した実行環境は Python 3.14.6、Node.js v22.23.2、npx 10.9.8 である。OpenAPI は `npx --yes @redocly/cli@latest lint --format=json` で検査した（既定の設定）[M]。
- スクリプトは `-I`（隔離モード）で動き、標準ライブラリだけを使う。リポジトリ内のファイルを import しない [D]。

## 3. 検査仕様

| # | 検査 | 判定規則 | 除外・分類 | 是正 |
|---|---|---|---|---|
| 1 | メタ情報ブロック | 冒頭 15 行に `> 文書ID:`・`> 対応要求:`・`> 依存文書:` の 3 行がある。文書ID は §8 の文書ID と一致する[^1][^2] | baseline と research_notes/ を除く | 3 行とも欠ける文書には §8 の文書ID と DL 行の対応要求から 1 ブロックを挿入する。対応要求だけ欠ける検証記録には、検証対象ノートの対応要求を写す |
| 2 | 禁止表現 | CONVENTIONS §5 の 10 表現（空白を除いて照合）[^1] | コード・インライン code を除く。引用符内、引用ブロック（`>`）、後続 30 字の否定語、「禁止表現」の語がある行を「引用/否定（自動）」に、それ以外を「要目視」に分ける | なし（文脈判断が要る）。全件を目視で判定する |
| 3 | 主張タグ | 00_decision と ADR-0xx の本文（参考文献・対応表・レビュー記録の節より前）で、文（「。」区切り、15 字以上、ID・脚注を除く）ごとに `[N][V][I][M][D][A-xxx]` の有無を見る[^1] | 段落・箇条でタグなしの文が 2 文以上かつ半数以上、または 60 字を超える 1 文の箇条を「要確認」とする。表のセルは件数だけ数える（表注記でタグを代える文書があるため[^2]） | なし |
| 4 | 未定義 ID | R/G/A/S/T/ATK/ADR/DL/SLI/K/RB/TC/P/C の参照が、CONVENTIONS §2 の定義場所で、表の第 1 列か見出しの先頭（または見出し中の括弧内）に現れる[^1] | 判例番号（C-413/23 等）と OMB Circular A-123 は外部名前空間として除外する。範囲の終端（「〜」の後）・番号帯（「以降」）・枝番（TC-057-01 等）は別区分にする | なし |
| 4b | ID の重複定義 | 定義ファイルで同じ ID が 2 つ以上の見出しの先頭にある。DL は §3・§4 の 9 列表に 2 行以上ある | — | なし |
| 5 | 脚注 | 本文の `[^n]` に定義がない（未定義）、定義が本文から参照されない（未使用）、定義が重複する。番号だけの脚注で欠番がある | 脚注定義の中、「脚注」「RS-15 の」等の文書 ID の直後、および範囲表記の `[^n]` は他文書の脚注番号への言及として除外する | なし（欠番の詰め直しは他文書からの「`ADR-022 [^54]`」型の参照を壊すため行わない） |
| 6 | §8 との差分 | §8 の各パスが実在する。実在する .md/.yaml/.json が §8 にある[^2] | 12_poc/code・data 配下（DL-82・DL-81 が一括で受ける）、research/verification/RS-xx（§8 の型行で受ける）、.workflows/ を除く | 未登録ファイルを §8 に追記し、DL がない成果物には DL を末尾採番で追加する[^2] |
| 7 | リンク | Markdown リンク `[..](..)` の相対パスがファイル位置から解決できる | http(s)・mailto・アンカーのみのリンクを除く。本文中のパス表記（`04_architecture/x.md` 等）が実在しない場合は、§8 にあり未作成のものと、§8 にもないものに分ける | リポジトリ直下からは解決できるがファイル位置からは解決できないリンクを、相対パスに書き換える |
| 8 | JSON・OpenAPI | `python -I -m json.tool` が成功する。redocly lint の error が 0 件 | warning は件数と規則名を一覧にする | なし（契約本体の変更は CON 担当の判断） |

## 4. 機械的是正の方針

- 機械的に直すのは、内容の意味を変えず、正しい形が一意に決まるものに限る [D]。今回の対象は、メタ情報ブロックの欠落、文書ID の不一致、§8 への未登録ファイルの追記、相対リンクである [D]。
- 是正前の件数は、是正前の状態を複製した作業ツリーで同じスクリプトを実行して得た [M]。複製は git の HEAD 版で本書の是正対象ファイルだけを戻し、ほかは並行作業中の作業ツリーのままにした [D]。
- 次のものは直さず §5 に一覧化した [D]。理由は、どちらに揃えるかを担当文書の作成者が決める必要があるからである [D]。
  - 脚注番号の欠番: 他文書が「`ADR-022 [^54]`」の形で番号を引いており、詰め直すと参照が壊れる [D]。
  - 未使用脚注: 削除すると原典の記録が失われる [D]。
  - 計画外ファイルへの参照: 文書を作るか、参照先を変えるかは内容判断である [D]。

## 5. 是正後に残る検出と判定

### 5.1 禁止表現（35 箇所、違反 0 件）

- 検出した 35 箇所を目視で確認した結果、規約違反は 0 件である [D][^1]。内訳は、/goal 原文の引用（README.md・G-goal-criteria.md の引用ブロック、00-cover.md、durability-charter-20y.md）、「完全無欠」をゴール再定義の対象として説明する文、「Zanzibar相当」と主張しないことを述べる否定文、レビュー原文と旧提案の表現を引く主張台帳・棄却仮説ログの行である [D]。
- 自動分類で「要目視」に残った 2 行（G-goal-criteria.md 170 行、phase1-critique-G.md 46 行）は、/goal 原文の句「完全無欠の」を G へ分解する表の見出し語である [D]。ゴール再定義を説明する文脈に当たり、例外に入る [D][^1]。

### 5.2 主張タグ（要確認 191 箇所）

- 00_decision のうち、01-executive-summary.md、00-cover.md、04-program-charter.md、06-gate-plan-and-plan-b.md は、表を除く本文にタグのない文が 0 件であった [M]。
- 表を除く本文でタグのない文が多いのは、ADR-007（99 文）、ADR-021（92 文）、ADR-001（90 文）、ADR-011（75 文）、ADR-012（74 文）である [M]。多くは新規仮定（NA-xxx）の列挙、対応 R/G の列挙、選択肢の条件の列挙である [D]。新規仮定の行は `[A-xxx]` に当たる前提台帳 ID がまだないので、前提台帳への登録とタグ付けを ADR 担当に戻す [D]。
- エグゼクティブ要約は「全文にタグ」を課される[^1]。表セルのうちタグのない 2 文の扱いは 01-executive-summary.md の担当が判断する [D]。
- 本検査は「。」で文を区切る近似なので、括弧内の句点で文が割れる場合や、ID の列挙を文と数える場合がある [D]。191 箇所は違反の確定数ではなく、作成者以外が抜き取りで確認する候補の数である [D]。

### 5.3 ID（未定義 4 種 15 箇所、重複定義 0 件）

| 検出 | 判定 | 戻し先 |
|---|---|---|
| P-28, P-29, P-30（03_threat-model/dfd-entry-points.md） | DFD のプロセス番号 P-01〜P-30 が、連携パターン P-01〜P-27（INT-02）と同じ接頭辞を使っている。P-28〜P-30 は INT-02 にない。P-01〜P-27 は INT-02 の別物に「解決」してしまうため、検査では誤りを検出できない [D] | THR-01 の担当: DFD のプロセス番号を別の接頭辞（例 PR-xx）に改め、CONVENTIONS §2 に登録するかを決める |
| R-170.1（traceability/phase1-critique-R.md） | 枝番方式の提案例であり、R 台帳には R-170 の枝番がない [D] | DL-101 の担当: 提案を採るか、批評記録に「未採用」と注記するか |
| A-123（research/verification/RS-01-verification.md 55 行） | OMB Circular A-123 を指す。前提台帳の A-123 ではない（外部名前空間）[D] | 対応不要（検査の除外規則の取りこぼし） |
| TC-057-01〜06（04_architecture/data-outside-pep.md、枝番 29 箇所） | POC-01 に TC-057 がない。仮番として使われている [D] | ARC-11 と POC-01 の担当: POC-01 に採番するか、既存 TC へ寄せる |
| A-001〜A-079（README.md 20 行）ほか範囲端 | 前提台帳は A-090〜A-115 も定義しており、README の範囲表記が実態より狭い [D] | DL-35 の担当 |

### 5.4 脚注

- 未定義脚注は 0 件である [M]。素朴に数えると 1,083 件になったが、その大半（1,055 件）は検証記録や review-notes が対象文書の脚注番号を本文で言及しているものであり、検査規則で除外した [M]（§6）。
- 未使用脚注は 2 件ある（ADR-011 の `[^54]`、06_controls/mappings/cloud-supplychain.md の `[^14]`）[M]。削除するか本文から引くかは各担当が判断する [D]。
- 番号の欠番は 10 文書にある（付録 A.3）[M]。CONVENTIONS は連番を要求していないので違反とはしない [D][^1]。

### 5.5 §8 との差分とパス表記

- §8 にあって未作成のファイルは、是正前の 7 件から是正後の 5 件に減った。本書の作成と、並行作業による 12_poc/data/ の作成で 2 件が解消した。残るのは 09_assurance/pentest-redteam-plan.md、12_poc/measurement-report.md、12_poc/code/README.md、traceability/independent-challenge-review.md、traceability/mock-panel-report.md である [M]。いずれも Phase 4・5 の担当の作成待ちであり、open-items の OI-M03 等で追跡されている [D]。
- 本文が参照しているのに、実在せず §8 にもないパスは 27 箇所ある（付録 A.3）[M]。性質で分けると次の 3 群である [D]。
  - 計画外の新規ファイルの提案: 10_integration/sandbox.md, roadmap-interim.md, sdk-policy.md, vendor-integration-requirements.md、11_contracts/lifecycle-events.asyncapi.yaml, schemas/lifecycle-event.schema.json。G-goal-criteria.md §8、ADR-008、tenant-lifecycle.md、10_integration/README.md、11_contracts/README.md、integration-patterns.md が参照している。DL を追加して作るか、既存 DL に寄せるかを TRC-03 の管理者が決める必要がある [D]。
  - 旧計画名への言及: traceability/citation-audit.md, disagreement-log.md（citation-audit-review.md 12〜13 行、dissent-log.md 13 行）、research/RS-09-security-incident-reports.md（RS-09 273 行）、research/RS-11-audit-privacy-residency.md（RS-10 9 行）。§8 は現在、実ファイル名（citation-audit-proposal.md・citation-audit-review.md・dissent-log.md）と RS-10＝監査・プライバシーの割当てになっているので、これらの注記は古い [D][^2]。注記の削除または「解消済み」への書換えを各担当に戻す。
  - 未作成の検証記録: research/verification/RS-18-verification.md（authorization-model.md 239 行）。OI-V04 で追跡されている [D]。
- phase1-critique-G.md 143〜149 行の旧ファイル名は、批評時点の計画を記録した履歴なので、修正しない [D]。

### 5.6 RS-18（追記した DL-116）

- research/RS-18-hierarchy-modeling.md と reports/テナント配下の階層モデリング.md は同文で、メタ情報ブロック、主張タグ、脚注形式の参考文献を持っていなかった [M]。メタ情報ブロックは機械的に挿入した [D]。
- 原典は本文中のインラインリンクで示されている（24 箇所）。CONVENTIONS §4 の脚注形式への書換えと主張タグの付与は内容判断を伴うので、RS-18 の担当と独立検証（OI-V04）に戻す [D][^1]。
- RS-18 は ARC-05 v0.3 に反映されている。独立検証の前に設計へ使っている点は、残課題として扱う必要がある [D]。

### 5.7 契約ファイル

- JSON 9 件はすべて構文として正しい。OpenAPI 5 件の lint error は 0 件である [M]。
- warning は 4 件ある [M]。scim.openapi.yaml の `POST /Bulk` と `GET /Me` に 2xx 応答がない。同ファイルの security scheme `staticBearerException` が未使用である。token-exchange.openapi.yaml の info に license がない。前 2 件は、SCIM の Bulk・/Me を本 profile で提供しないことを表した定義である可能性があるため、CON-07 の担当が意図を確認する [D]。

## 6. 検出器の調整履歴（件数の推移）

| 段階 | 変更 | 影響した件数 |
|---|---|---|
| 初回（素朴な規則） | — | 未定義脚注 1,083、未定義 ID 23 種 154 箇所 [M] |
| 脚注の言及除外 | 脚注定義の中、他文書 ID の直後、「脚注」の直後、範囲表記の `[^n]` を言及として除外 | 未定義脚注 1,083 → 0（言及 1,055）[M] |
| ID の外部名前空間除外 | `C-413/23`・`T-553/23` 型の判例番号、OMB Circular A-123 を除外 | 未定義 ID から 5 種を除外 [M] |
| 範囲端・番号帯・枝番の分離 | 「〜」の後、「以降」の前、`-01` 型の枝番を別区分にした | 未定義 ID 23 種 → 4 種 [M] |
| 是正前（確定規則） | 上記すべて | 付録 A.1「是正前」列 [M] |
| 是正後 | 付録 A.2 の是正を適用 | 付録 A.1「是正後」列 [M] |

- history.json は、確定規則にしてからの実行（是正前・是正適用・是正後）を記録する。調整の途中経過は上表に要約した [D]。
- 「是正適用」（label `fix`）は、是正前の複製ツリーに deliverables.md の追記だけを先に入れて `--fix` を実行した記録である。そのため、文書ID の不一致が 6 件（手作業で直す前の review-notes）と表示され、OpenAPI 欄は省略（0）になっている。自動是正の内訳は results-fix.json に、手作業の機械的是正は manual-fixes.json にある [D]。

## 7. 限界と未実装

- 主張タグ検査は文の近似分割に頼っており、偽陽性と偽陰性がある。合否判定（G-017）には作成者以外による抜取り確認が要る [D][^3]。
- 禁止表現は 10 表現の文字列一致だけを見ている。G-035 の「自己評価の形容詞」一般（例: 堅牢、盤石）は検査していない [D][^3]。
- 孤児 R・孤児 G・孤児 DL の検査（G-021）と、traceability-matrix.md §7 の抽出手順の組込みは未実装であり、残課題とする [D][^4]。
- 見出しへのアンカー（`#節名`）の存在は検査していない [D]。
- 本書の検査は Phase 4 時点の 2 回の実行（是正時と最終整合時、§8）である。CI で継続実行して E4（CI ログ・コミットハッシュ）として残す仕組みは、まだない [D][^2]。

## 8. 最終整合での再実行（Phase 4、2026-10-15）

### 8.1 実行条件

- Phase 4 の最終整合（final-consistency）で、§2 と同じ規則のまま `python -I .workflows/checks/run_checks.py --label final` を再実行した [M]。機械的是正（`--fix`）は使っていない [D]。生データは .workflows/checks/out/results-final.json、件数の推移は history.json にある [M]。
- 再実行の前に、traceability-matrix.md・00_decision/02-prior-findings-crosswalk.md・open-items.md の状態欄を、レビュー記録と是正結果に合わせて更新した [D]。下の件数は、それらの更新と本節の追記を反映した作業ツリーでの値である [M]。
- 是正後（§5、付録 A）からの増減の大半は、模擬パネル ラウンド 1〜3 の是正で 00_decision・ADR・契約・PoC の文書が改版されたことによる [D]。付録 A は是正後の記録として残し、書き換えていない [D]。

### 8.2 件数（是正後／最終整合）

| 検査項目 | 是正後（after） | 最終整合（final） | 増減の主な理由 |
|---|---|---|---|
| (1) メタ情報ブロック欠落（文書数） | 0 | 0 | — |
| (1) 文書ID と §8 の不一致 | 0 | 0 | — |
| (2) 禁止表現の出現（全件） | 35 | 36 | 00_decision/05-residual-risk-register.md 749 行の「完全無欠」（DCS-01 §2 のゴール再定義を引く文脈）が加わった |
| (2) うち自動分類で文脈不明（要目視） | 2 | 2 | §5.1 と同じ 2 行 |
| (3) 主張タグ欠落が多い段落・箇条（00_decision・ADR 本文） | 191 | 206 | 00_decision 25 箇所、ADR 181 箇所。00_decision の改版で本文が増えた |
| (3) タグのない文（表を除く、同範囲） | 997 | 1,112 | 同上 |
| (4) 未定義 ID（異なり） | 4 | 13 | §8.4 |
| (4) 未定義 ID（出現） | 15 | 207 | 同上（S-20・T-087・RB-13・DL-120 の出現が多い） |
| (4) 枝番・範囲端・番号帯（参考） | 14 | 17 | — |
| (4) 外部名前空間として除外 | 5 | 5 | 判例番号 3 種、T-553、OMB Circular A-123 |
| (4) ID の重複定義 | 0 | 0 | — |
| (5) 未定義脚注 | 0 | 0 | — |
| (5) 他文書の脚注番号への言及（除外） | 1,055 | 1,055 | — |
| (5) 未使用脚注 | 2 | 2 | §5.4 と同じ 2 件 |
| (5) 脚注番号に欠番がある文書 | 10 | 12 | 00_decision/03-decision-items.md と 06-gate-plan-and-plan-b.md の改版で欠番が生じた |
| (5) 重複定義 | 0 | 0 | — |
| (6) §8 にあり実ファイルなし | 5 | 2 | 12_poc/code/README.md、independent-challenge-review.md、mock-panel-report.md が作成された |
| (6) 実ファイルがあり §8 に未登録 | 0 | 0 | 新規の契約 3 ファイルは DL-117〜DL-119 として登録済み |
| (7) 相対リンク切れ（Markdown リンク） | 0 | 0 | — |
| (7) 本文中のパス表記で、実在せず §8 にもないもの | 27 | 25 | §8.5 |
| (7) 本文中のパス表記で、§8 にあり未作成のもの（参考） | 74 | 54 | 作成済みになったファイルへの言及が減った |
| (8) JSON 構文エラー | 0 | 0 | 対象は 10 件（lifecycle-event.schema.json が加わった） |
| (8) OpenAPI lint error | 0 | 0 | 対象は 6 件（client-registration.openapi.yaml が加わった） |
| (8) OpenAPI lint warning | 4 | 13 | §8.6 |

- 合計で見ると、G-131 の合格条件 5 項目（メタ情報欠落・未定義 ID・ID 重複・リンク切れ・§8 との差分）のうち 0 件になったのは、メタ情報欠落・ID 重複・リンク切れの 3 項目である。未定義 ID 13 種と §8 との差分 2 件が残るため、G-131 は不合格（是正中）である [D][^3]。
- G-017 は、全文タグの対象であるエグゼクティブ要約（DL-37）の表を除く本文に、タグのない文が 19 文ある（是正後は 0 文）[M]。決裁事項詳細（DCS-03）は 38 文である [M]。合格基準の「欠落 0 件」を満たさないため、不合格（是正中）である [D][^3]。ただし、この検査は文の近似分割による候補の数であり、確定数ではない（§5.2、§7）[D]。
- G-035 は、禁止表現 36 箇所をすべて目視し、引用・否定文・ゴール再定義の文脈と判定した。規約違反は 0 件である [D][^1]。文脈の判定は本書の作成者の自己判断であり、作成者以外の確認は済んでいない [D]。
- G の現状の更新は traceability-matrix.md（版 0.2）§4.2 に記録した [D]。

### 8.3 主張タグの文書別（00_decision、表を除く本文）

| 文書 | 文 | タグなし | 是正後のタグなし |
|---|---|---|---|
| 00_decision/00-cover.md | 25 | 3 | 0 |
| 00_decision/01-executive-summary.md | 175 | 19 | 0 |
| 00_decision/02-prior-findings-crosswalk.md | 100 | 25 | 16 |
| 00_decision/03-decision-items.md | 464 | 38 | 3 |
| 00_decision/04-program-charter.md | 99 | 0 | 0 |
| 00_decision/05-residual-risk-register.md | 217 | 16 | 10 |
| 00_decision/06-gate-plan-and-plan-b.md | 264 | 23 | 0 |
| 00_decision/07-organization-and-tco.md | 77 | 2 | 1 |
| 00_decision/08-alternatives-comparison.md | 165 | 25 | 13 |

- 値は results-final.json の `claimtag_stats` による [M]。行番号と先頭の文は `results.claimtags` にある [D]。
- タグのない文が増えたのは、模擬パネルの指摘への是正で追記された節である [D]。是正の作業がタグ付けを伴わなかったことを示しており、各文書の担当に戻す（§8.7）[D]。

### 8.4 未定義 ID（13 種）

| ID | 出現 | 主な位置 | 判定 | 戻し先 |
|---|---|---|---|---|
| S-20 | 32 | 00_decision/05-residual-risk-register.md | 攻撃者モデル（THR-02 §3.21）が「S-20 案」として申し送った損失シナリオである。GOV-03 には S-01〜S-19 しかない [D] | GOV-03 の担当: S-20 を採番するか、DCS-05 の参照を「S-20 案」と書く |
| T-087〜T-091 | 78 | 00_decision/05-residual-risk-register.md、02-prior-findings-crosswalk.md、03_threat-model/attacker-model.md | 脅威カタログは T-001〜T-086 までを定義している。T-087〜T-090 は THR-02 の「案」であり、T-091 は DCS-05 だけが使う [D]。模擬パネル ラウンド 3 の CISO・レッドチームは「T-087・RRG-069 の二重割当」の解消を条件に付けた（mock-panel-report §5）[D] | THR-03 の担当: 採番して脅威カタログに定義するか、参照側を「案」と明記する |
| RB-13 | 48 | 00_decision/02-prior-findings-crosswalk.md | OPS-01 は RB-13 を「破壊・恐喝」案のための欠番として残しており、未作成である [D]。DCS-02 は未作成であることを述べるために参照している | OPS-01 の担当: RB-13 の起票（DCS-02 §8 申し送り 7） |
| DL-120 | 30 | 11_contracts/mock-contract-test-kit.md | deliverables.md は DL-119 までを定義している。§8 にない DL を参照している [D] | CON-11 の担当と TRC-03 の管理者: DL を追加するか、既存 DL に寄せる |
| TC-057 | 2 | traceability/independent-challenge-review.md、traceability-matrix.md | POC-01 に TC-057 がない。data-outside-pep.md の枝番 TC-057-01〜 の親として引かれている（§5.3）[D] | ARC-11 と POC-01 の担当（§5.3 と同じ） |
| P-28〜P-30 | 15 | 03_threat-model/dfd-entry-points.md | §5.3 と同じ（DFD のプロセス番号と連携パターン P-xx の名前空間衝突）[D] | THR-01 の担当 |
| R-170.1 | 2 | traceability/phase1-critique-R.md | §5.3 と同じ [D] | DL-101 の担当 |

- 是正後に未定義としていた A-123 は、OMB Circular A-123 として外部名前空間に分類されるようになった [D]。
- traceability-matrix.md の出現は、本節の検出を引用した説明文である [D]。

### 8.5 実在せず §8 にもないパス表記（25 箇所）

- 解消したもの: 02_requirements/tenant-lifecycle.md と G-goal-criteria.md が参照していた 11_contracts/lifecycle-events.asyncapi.yaml と schemas/lifecycle-event.schema.json は、作成され DL-117・DL-118 として登録された [M]。10_integration/integration-patterns.md の roadmap-interim.md への言及はなくなった [M]。
- 新たに検出したもの: 11_contracts/mock-contract-test-kit.md 821 行・1020 行の 12_poc/code/contract-kit/README.md、open-items.md 371 行の research/verification/RS-18-verification.md（OI-V04 の未作成記録への言及）[M]。
- 残りは §5.5 の 3 群（計画外の新規ファイルの提案、旧計画名への言及、未作成の検証記録）と同じである [D]。

### 8.6 OpenAPI lint の warning（13 件）

| ファイル | warning | 内容 |
|---|---|---|
| 11_contracts/relationship-model-registry.openapi.yaml | 9 | `SemanticChangeDeclaration` の `then.required` が未定義の property（description、affected）を挙げている（2 件）。`ConditionCatalog` とその `$defs` 6 件が未使用（7 件） |
| 11_contracts/scim.openapi.yaml | 3 | §5.7 と同じ |
| 11_contracts/token-exchange.openapi.yaml | 1 | §5.7 と同じ |
| 11_contracts/client-registration.openapi.yaml | 0 | — |

- relationship-model-registry の 2 件は、条件付き必須の項目がスキーマに定義されていないことを示す [D]。lint の規則上は warning だが、契約の利用者が必須項目を検証できない可能性があるため、CON-04 の担当が意図を確認する [D]。未使用の `ConditionCatalog` は、条件の一覧を参照用に置いた定義である可能性がある [D]。

### 8.7 戻し先（最終整合で追加したもの）

| # | 検出 | 戻し先 | 期限（案） |
|---|---|---|---|
| 1 | 00_decision の改版部分の主張タグ欠落（§8.3。とくに DCS-01 の 19 文、DCS-03 の 38 文） | 各 DCS の担当 | 次回決裁の起案前（G-017・G-037） |
| 2 | 未定義 ID S-20、T-087〜T-091、RB-13、DL-120（§8.4） | GOV-03、THR-03、OPS-01、CON-11・TRC-03 の各担当 | 次回決裁の起案前（G-131。DX 型の台帳行は DEC-1 の前） |
| 3 | 脚注番号の欠番が増えた 2 文書（DCS-03、DCS-06） | 各 DCS の担当（詰め直しは他文書の参照を確認してから） | 次版 |
| 4 | relationship-model-registry.openapi.yaml の warning 9 件（§8.6） | CON-04 の担当 | DEC-8 前 |
| 5 | §8 にあり未作成の 2 件（DL-59、DL-81 の実測レポート） | CISO（DL-59）、PoC リード（DL-81） | G3〜G4 |

- 本節の判定（文脈、名前空間、戻し先）は本書の作成者（AI エージェント）の自己判断であり、作成者以外の確認は済んでいない [D]。模擬パネルの判定ではなく、実在の CTO/CISO の決裁でもない（CONVENTIONS §8）[D][^1]。

## 参考文献

[^1]: 本リポジトリ『執筆規約（全成果物共通）』. CONVENTIONS.md （参照箇所: 冒頭, §1, §2, §3, §4, §5, §8、確認日: 2026-10-15）
[^2]: 本リポジトリ『成果物計画（マスターファイル計画）』TRC-03 版 0.1. traceability/deliverables.md （参照箇所: §1, §2.3, §4.8 DL-111 行, §8、確認日: 2026-10-15）
[^3]: 本リポジトリ『/goal 受入基準』TRC-02 版 0.2. traceability/G-goal-criteria.md （参照箇所: G-017, G-021, G-035, G-131、確認日: 2026-10-15）
[^4]: 本リポジトリ『R/G 追跡表』TRC-04. traceability/traceability-matrix.md （参照箇所: §7 の手順と残課題 2・7、確認日: 2026-10-15）

## 付録 A 自動生成の結果

<!-- AUTO:BEGIN -->
生成: render_report.py（是正前 `before` 2026-10-15T10:52:29、是正後 `after` 2026-10-15T10:56:19）。生データ: .workflows/checks/out/results-before.json, results-after.json, history.json。

### A.1 検査項目別の件数（是正前／是正後）

| 検査項目 | 是正前 | 是正後 |
|---|---|---|
| (1) メタ情報ブロック欠落（文書数） | 3 | 0 |
| (1) 文書ID と §8 の不一致 | 1 | 0 |
| (2) 禁止表現の出現（全件） | 35 | 35 |
| (2) うち自動分類で文脈不明（要目視） | 2 | 2 |
| (3) 主張タグ欠落が多い段落・箇条（00_decision・ADR 本文） | 191 | 191 |
| (3) タグのない文（表を除く、同範囲） | 997 | 997 |
| (4) 未定義 ID（異なり） | 4 | 4 |
| (4) 未定義 ID（出現） | 15 | 15 |
| (4) 枝番・範囲端・番号帯（参考） | 14 | 14 |
| (4) 外部名前空間として除外（判例番号・OMB 通達） | 5 | 5 |
| (4) ID の重複定義 | 0 | 0 |
| (5) 未定義脚注 | 0 | 0 |
| (5) 他文書の脚注番号への言及（除外） | 1055 | 1055 |
| (5) 未使用脚注 | 2 | 2 |
| (5) 脚注番号に欠番がある文書 | 10 | 10 |
| (5) 重複定義 | 0 | 0 |
| (6) §8 にあり実ファイルなし | 7 | 5 |
| (6) 実ファイルがあり §8 に未登録 | 20 | 0 |
| (7) 相対リンク切れ（Markdown リンク） | 0 | 0 |
| (7) 本文中のパス表記で、実在せず §8 にもないもの | 27 | 27 |
| (7) 本文中のパス表記で、§8 にあり未作成のもの（参考） | 81 | 74 |
| (8) JSON 構文エラー | 0 | 0 |
| (8) OpenAPI lint error | 0 | 0 |
| (8) OpenAPI lint warning | 4 | 4 |

### A.2 適用した機械的是正

| 検査 | ファイル | 内容 |
|---|---|---|
| meta | reports/テナント配下の階層モデリング.md | inserted metadata block |
| meta | research/RS-18-hierarchy-modeling.md | inserted metadata block |
| meta | research/verification/RS-09-verification.md | inserted 対応要求 line copied from RS-09-resilience-cell-failmode.md |
| deliverables | traceability/deliverables.md | §8 に未登録 20 ファイルの行を追記（ARC-RN, ADR-RN, CTL-03〜CTL-06, CON-02-RV〜CON-10-RV, RS-18, RS-18-RPT, research_notes 3 件）（手作業の機械的是正） |
| deliverables | traceability/deliverables.md | §4.8 に DL-116（RS-18 と報告原稿・作業メモ）を末尾採番で追加し、§7 の件数（DL 116、追加 82、計画ファイル数 166）を更新（手作業の機械的是正） |
| meta | traceability/deliverables.md | §8 の citation-audit-review.md の文書ID を TRC-06b から既発行の TRC-06-R に揃えた（参照元 2 文書も TRC-06-R）（手作業の機械的是正） |
| meta | 11_contracts/review-notes/CON-02/03/04/06/07/08.md | 文書ID を CON-0x（契約本体と衝突）から CON-0x-RV に揃えた（CON-05/09/10 の既存表記に合わせた）（手作業の機械的是正） |

### A.3 是正後に残る検出（内容判断が要るもの）

#### (2) 禁止表現の出現箇所

| ファイル:行 | 表現 | 自動分類 | 文脈（抜粋） |
|---|---|---|---|
| 00_decision/00-cover.md:55 | 完全無欠 | quote/negation(auto) | `\|ゴールの表し方\|/goal原文は「20年戦っている完全無欠の汎用共通認証認可基盤」を求めていた[D][^10]\|攻撃者モデル・統制・証拠・` |
| 00_decision/01-executive-summary.md:42 | 完全無欠 | quote/negation(auto) | `\|「完全無欠」\|欠陥の不存在は試験で示せないため、「定義した攻撃者モデルと脅威カタログの全件` |
| 00_decision/01-executive-summary.md:46 | 完全無欠 | quote/negation(auto) | `-この再定義は原文より判定を厳しくする側に寄せたものである[D][^8]。「完全無欠」は文書を書くだけで主張できるが、再定義後の基準は第三者` |
| 00_decision/01-executive-summary.md:172 | 完全無欠 | quote/negation(auto) | `ty/G-goal-criteria.md（参照箇所:§2翻訳の原則3,翻訳表「完全無欠」「あらゆる攻撃」の行、確認日:2026-10-15` |
| 00_decision/02-prior-findings-crosswalk.md:328 | Zanzibar相当 | quote/negation(auto) | `\|R-142\|L111「Zanzibar相当の保証を得ることは同義ではない」\|A\|ARC-05§9.3,§9.4\|文書＋見解` |
| 01_governance/durability-charter-20y.md:42 | 完全無欠 | quote/negation(auto) | `-ゴール原文は「20年戦っている完全無欠の汎用共通認証認可基盤」を求めている[^4][D]。` |
| 03_threat-model/attacker-model.md:13 | 完全無欠 | quote/negation(auto) | `1.本プログラムは、基盤の性質を「完全無欠」という語で表さない[D]。旧提案が性質の主張に使った「完全無欠」は、**(1)` |
| 03_threat-model/attacker-model.md:13 | 完全無欠 | quote/negation(auto) | `、基盤の性質を「完全無欠」という語で表さない[D]。旧提案が性質の主張に使った「完全無欠」は、**(1)本書の攻撃者モデル（ATK-xx）、` |
| 03_threat-model/attacker-model.md:560 | 完全無欠 | quote/negation(auto) | `##6.統制・証拠・残余リスクへの接続（「完全無欠」の置き換え）` |
| 05_adr/ADR-010-authz-engine-store-consistency.md:14 | Zanzibar相当 | quote/negation(auto) | `Pcacheの最大齢＋フェンス反映遅延」の和で表し、各項をPoCで測る[D]。「Zanzibar相当」とは主張しない[D]。` |
| 05_adr/ADR-010-authz-engine-store-consistency.md:651 | Zanzibar相当 | quote/negation(auto) | `\|R-142\|採用engineの実保証範囲を明記し「Zanzibar相当」と主張しない\|D-16〜D-19、RR-3\|A\|本書で閉じた（記述` |
| 05_adr/ADR-025-list-search-authorization.md:469 | Zanzibar相当 | quote/negation(auto) | `\|R-142\|「Zanzibar相当」と主張せず実保証範囲を明記\|D25-10、§1.4（Leopardの数値を目標` |
| 05_adr/ADR-025-list-search-authorization.md:558 | Zanzibar相当 | quote/negation(auto) | `A-046,A-047,NA-010-7]。禁止表現はR-142行の否定文脈（「Zanzibar相当」と主張しない）だけで、規約の例外に当た` |
| 06_controls/control-mapping-ledger.md:640 | Zanzibar相当 | quote/negation(auto) | `\|R-142\|A\|「Zanzibar相当」と主張せず採用engineの実保証範囲を明記\|C-011\|` |
| README.md:37 | 完全無欠 | quote/negation(auto) | `>20年戦っている完全無欠の汎用共通認証認可基盤を検討し、その検討手法や調査範囲、どのようにその設計方針と` |
| README.md:41 | 完全無欠 | quote/negation(auto) | `-原文には、そのままでは誰も合否を判定できない表現（「20年戦っている」「完全無欠」「あらゆる」「超大規模」「納得し」「成立すると認められる` |
| README.md:42 | 完全無欠 | quote/negation(auto) | `い換えた。言い換えはゴールの縮小ではなく、判定が厳しくなる側に寄せる。たとえば「完全無欠」という自己評価は文書を書くだけで主張できるが、言い` |
| traceability/G-goal-criteria.md:18 | 完全無欠 | quote/negation(auto) | `>20年戦っている完全無欠の汎用共通認証認可基盤を検討し、その検討手法や調査範囲、どのようにその設計方針と` |
| traceability/G-goal-criteria.md:33 | 完全無欠 | quote/negation(auto) | `3.翻訳後の基準は、原文の表現よりも判定が厳しくなる側に寄せる。たとえば「完全無欠」という自己評価は文書を書くだけで主張できるが、翻訳後の基` |
| traceability/G-goal-criteria.md:42 | 完全無欠 | quote/negation(auto) | `\|「完全無欠」\|欠陥がないことは試験や評価では示せない。試験は欠陥の存在を示せても、不存在は` |
| traceability/G-goal-criteria.md:43 | 完全無欠 | quote/negation(auto) | `\|「あらゆる攻撃」（「完全無欠」に含意される）\|攻撃手法の集合は閉じておらず、列挙し尽くせない。\|攻撃者類型・` |
| traceability/G-goal-criteria.md:99 | 完全無欠 | quote/negation(auto) | `\|6.9\|攻撃者モデルと不正対策の網羅（「完全無欠」の翻訳）\|21\|3\|5\|9\|4\|—\|` |
| traceability/G-goal-criteria.md:170 | 完全無欠 | review | `\|P2\|完全無欠の\|攻撃者モデルと不正対策の網羅\|G-077〜G-097（濫用はG-062）、G` |
| traceability/G-goal-criteria.md:243 | Zanzibar相当 | quote/negation(auto) | `表現と自己評価の形容詞が、引用・否定文・ゴール再定義の文脈を除いて0件であり、「Zanzibar相当」と主張する箇所がない。性質の主張は、攻` |
| traceability/G-goal-criteria.md:306 | 完全無欠 | quote/negation(auto) | `###6.9攻撃者モデルと不正対策の網羅（「完全無欠」の翻訳）` |
| traceability/G-goal-criteria.md:431 | Zanzibar相当 | quote/negation(auto) | `\|5\|自己評価の形容詞0、「Zanzibar相当」の主張なし\|G-035\|` |
| traceability/R-requirements.md:357 | Zanzibar相当 | quote/negation(auto) | `\|R-142\|「Zanzibar相当」と主張せず採用engineの実保証範囲を明記\|**L111**\|「Zanzib` |
| traceability/R-requirements.md:357 | Zanzibar相当 | quote/negation(auto) | `ibar相当」と主張せず採用engineの実保証範囲を明記\|**L111**\|「Zanzibar相当の保証を得ることは同義ではない」\|A\|0` |
| traceability/R-requirements.md:765 | 非常に高いセキュリティ | quote/negation(auto) | `\|233\|「非常に高いセキュリティ」という自己評価/削…\|R-200\|` |
| traceability/claims-ledger.md:434 | Zanzibar相当 | quote/negation(auto) | `）\|維持\|レビューが評価（一貫性認識）。採用engineの実保証範囲を明記し、「Zanzibar相当」とは主張しない（R-142）\|04_a` |
| traceability/claims-ledger.md:524 | 非常に高いセキュリティ | quote/negation(auto) | `で「削除」と判定。実装前構想の自己評価で、CONVENTIONS§5の禁止表現「非常に高いセキュリティ」に当たる。評価は実装証拠・適合性・攻` |
| traceability/phase1-critique-G.md:46 | 完全無欠 | review | `\|P2完全無欠の\|G-077〜G-097、G-062\|脅威カタログの5要素と負例試験で判定でき` |
| traceability/rejected-hypotheses.md:70 | 非常に高いセキュリティ | quote/negation(auto) | `実装前の構想の自己評価であり、レビューが削除と判定した[D][^3]。禁止表現「非常に高いセキュリティ」に当たる[D][^1]\|レビューL1` |
| traceability/rejected-hypotheses.md:222 | Zanzibar相当 | quote/negation(auto) | `\|Zanzibar論文[^45]\|自作しない。採用エンジンの実保証範囲を明記し「Zanzibar相当」と主張しない（R-142）\|R-204` |
| traceability/traceability-matrix.md:678 | Zanzibar相当 | quote/negation(auto) | `\|R-142\|A\|「Zanzibar相当」と主張せず採用engineの…\|G-015,G-035\|DL-17\|C-011` |

#### (4) 未定義 ID・枝番・範囲端

| ID | 区分 | 出現 | 位置（先頭 4 件） |
|---|---|---|---|
| R-170.8 | range-or-band | 1 | traceability/phase1-critique-R.md:137 |
| R-170.1 | undefined | 1 | traceability/phase1-critique-R.md:137 |
| A-019 | range-or-band | 1 | 01_governance/assumptions-register.md:66 |
| A-039 | range-or-band | 1 | 01_governance/assumptions-register.md:67 |
| A-059 | range-or-band | 1 | 01_governance/assumptions-register.md:69 |
| A-069 | range-or-band | 1 | 01_governance/assumptions-register.md:70 |
| A-079 | range-or-band | 2 | 01_governance/assumptions-register.md:71, README.md:20 |
| A-089 | range-or-band | 1 | 01_governance/assumptions-register.md:72 |
| A-095 | range-or-band | 1 | 01_governance/business-impact-analysis.md:267 |
| A-099 | range-or-band | 2 | 01_governance/assumptions-register.md:73, 01_governance/business-impact-analysis.md:267 |
| A-109 | range-or-band | 1 | 01_governance/assumptions-register.md:74 |
| A-119 | range-or-band | 1 | 01_governance/assumptions-register.md:75 |
| A-120 | range-or-band | 4 | 01_governance/assumptions-register.md:76, 01_governance/assumptions-register.md:488, research/RS-15-build-buy-tco.md:297, research/RS-15-build-buy-tco.md:329 |
| TC-057 | range-or-band | 2 | 04_architecture/data-outside-pep.md:24, 04_architecture/data-outside-pep.md:188 |
| TC-057 | sub-id | 30 | 04_architecture/data-outside-pep.md:7, 04_architecture/data-outside-pep.md:24, 04_architecture/data-outside-pep.md:30, 04_architecture/data-outside-pep.md:188 |
| P-28 | undefined | 5 | 03_threat-model/dfd-entry-points.md:443, 03_threat-model/dfd-entry-points.md:499, 03_threat-model/dfd-entry-points.md:500, 03_threat-model/dfd-entry-points.md:734 |
| P-29 | undefined | 4 | 03_threat-model/dfd-entry-points.md:444, 03_threat-model/dfd-entry-points.md:499, 03_threat-model/dfd-entry-points.md:733, 03_threat-model/dfd-entry-points.md:763 |
| P-30 | undefined | 5 | 03_threat-model/dfd-entry-points.md:327, 03_threat-model/dfd-entry-points.md:445, 03_threat-model/dfd-entry-points.md:508, 03_threat-model/dfd-entry-points.md:764 |

#### (4) 重複定義

0 件。

#### (5) 脚注

| ファイル | 種別 | 脚注 |
|---|---|---|
| 03_threat-model/threat-catalog.md | numbering-gap | 8,12,31 |
| 04_architecture/authorization-model.md | numbering-gap | 10,16,33 |
| 04_architecture/capacity-model.md | numbering-gap | 19,24 |
| 04_architecture/cell-blast-radius.md | numbering-gap | 4,5,8,11,20,28,29,35,36,37,38,39,50 |
| 04_architecture/pep-contract.md | numbering-gap | 40,45 |
| 04_architecture/product-evaluation-exit.md | numbering-gap | 6,46,47,48,58,69,83,96 |
| 05_adr/ADR-003-account-recovery-authenticators.md | numbering-gap | 26,27,28,29,49 |
| 05_adr/ADR-011-policy-language-pep-pdp-api.md | unused | 54 |
| 05_adr/ADR-022-integration-contract-standards.md | numbering-gap | 12 |
| 06_controls/mappings/cloud-supplychain.md | unused | 14 |
| 07_slo/numeric-contracts.md | numbering-gap | 15,16,18 |
| 11_contracts/mock-contract-test-kit.md | numbering-gap | 9,14 |

#### (6) §8 との差分

| 種別 | パス | DL |
|---|---|---|
| planned-missing | 09_assurance/pentest-redteam-plan.md | DL-59 |
| planned-missing | 12_poc/measurement-report.md | DL-81 |
| planned-missing | 12_poc/code/README.md | DL-82 |
| planned-missing | traceability/independent-challenge-review.md | DL-108 |
| planned-missing | traceability/mock-panel-report.md | DL-109 |

#### (7) 実在せず §8 にもないパス表記

| ファイル:行 | パス |
|---|---|
| 02_requirements/tenant-lifecycle.md:561 | 11_contracts/lifecycle-events.asyncapi.yaml |
| 02_requirements/tenant-lifecycle.md:561 | 11_contracts/schemas/lifecycle-event.schema.json |
| 04_architecture/authorization-model.md:239 | research/verification/RS-18-verification.md |
| 05_adr/ADR-008-control-plane-cicd-protection.md:525 | 10_integration/sandbox.md |
| 10_integration/README.md:419 | 10_integration/roadmap-interim.md |
| 10_integration/integration-patterns.md:1595 | 10_integration/roadmap-interim.md |
| 11_contracts/README.md:482 | 10_integration/roadmap-interim.md |
| research/RS-09-resilience-cell-failmode.md:273 | research/RS-09-security-incident-reports.md |
| research/RS-10-audit-privacy-residency.md:9 | research/RS-11-audit-privacy-residency.md |
| traceability/G-goal-criteria.md:451 | 10_integration/vendor-integration-requirements.md |
| traceability/G-goal-criteria.md:458 | 11_contracts/lifecycle-events.asyncapi.yaml |
| traceability/G-goal-criteria.md:458 | 11_contracts/schemas/lifecycle-event.schema.json |
| traceability/G-goal-criteria.md:460 | 10_integration/sdk-policy.md |
| traceability/G-goal-criteria.md:461 | 10_integration/sandbox.md |
| traceability/G-goal-criteria.md:462 | 10_integration/roadmap-interim.md |
| traceability/citation-audit-review.md:12 | traceability/citation-audit.md |
| traceability/citation-audit-review.md:13 | traceability/citation-audit.md |
| traceability/citation-audit-review.md:13 | traceability/disagreement-log.md |
| traceability/dissent-log.md:13 | traceability/disagreement-log.md |
| traceability/phase1-critique-G.md:143 | research/RS-16-jurisdictions-sector-regulations.md |
| traceability/phase1-critique-G.md:144 | research/RS-15-control-frameworks-risk-methods.md |
| traceability/phase1-critique-G.md:145 | research/RS-09-security-incident-reports.md |
| traceability/phase1-critique-G.md:145 | research/RS-12-availability-outage-reports.md |
| traceability/phase1-critique-G.md:146 | research/RS-14-build-buy-products-exit.md |
| traceability/phase1-critique-G.md:147 | traceability/citation-audit.md |
| traceability/phase1-critique-G.md:148 | traceability/disagreement-log.md |
| traceability/phase1-critique-G.md:149 | research/RS-13-crypto-agility-pqc.md |

#### (8) OpenAPI lint

| ファイル | error | warning | 指摘（rule / pointer） |
|---|---|---|---|
| 11_contracts/authorization-api.openapi.yaml | 0 | 0 | — |
| 11_contracts/relationship-model-registry.openapi.yaml | 0 | 0 | — |
| 11_contracts/scim.openapi.yaml | 0 | 3 | operation-2xx-response #/paths/~1Bulk/post/responses; operation-2xx-response #/paths/~1Me/get/responses; no-unused-components #/components/securitySchemes/staticBearerException |
| 11_contracts/ssf-caep.openapi.yaml | 0 | 0 | — |
| 11_contracts/token-exchange.openapi.yaml | 0 | 1 | info-license #/info |

#### (3) 主張タグ: 文書別の集計

| 文書 | 文（表を除く） | タグなし | 表セル内の文 | うちタグなし | 要確認の段落・箇条 |
|---|---|---|---|---|---|
| 00_decision/00-cover.md | 8 | 0 | 23 | 1 | 0 |
| 00_decision/01-executive-summary.md | 45 | 0 | 41 | 1 | 0 |
| 00_decision/02-prior-findings-crosswalk.md | 68 | 16 | 170 | 165 | 4 |
| 00_decision/03-decision-items.md | 150 | 3 | 132 | 46 | 1 |
| 00_decision/04-program-charter.md | 99 | 0 | 108 | 74 | 0 |
| 00_decision/05-residual-risk-register.md | 127 | 10 | 244 | 220 | 1 |
| 00_decision/06-gate-plan-and-plan-b.md | 80 | 0 | 130 | 100 | 0 |
| 00_decision/07-organization-and-tco.md | 70 | 1 | 45 | 36 | 0 |
| 00_decision/08-alternatives-comparison.md | 111 | 13 | 116 | 101 | 4 |
| 05_adr/ADR-001-build-buy-identity-provider.md | 248 | 75 | 297 | 181 | 19 |
| 05_adr/ADR-002-assurance-levels-by-tier.md | 216 | 4 | 208 | 117 | 1 |
| 05_adr/ADR-003-account-recovery-authenticators.md | 309 | 13 | 166 | 86 | 1 |
| 05_adr/ADR-004-b2b-federation-linking-scim.md | 309 | 11 | 226 | 141 | 2 |
| 05_adr/ADR-005-token-profile.md | 303 | 25 | 314 | 186 | 6 |
| 05_adr/ADR-006-revocation-continuous-evaluation.md | 310 | 12 | 141 | 109 | 0 |
| 05_adr/ADR-007-key-hierarchy-kms-hsm.md | 418 | 91 | 169 | 115 | 14 |
| 05_adr/ADR-008-control-plane-cicd-protection.md | 249 | 19 | 165 | 107 | 4 |
| 05_adr/ADR-009-workload-identity-token-exchange.md | 297 | 11 | 213 | 114 | 2 |
| 05_adr/ADR-010-authz-engine-store-consistency.md | 414 | 46 | 205 | 143 | 2 |
| 05_adr/ADR-011-policy-language-pep-pdp-api.md | 249 | 70 | 258 | 144 | 16 |
| 05_adr/ADR-012-pep-coverage-storage-guardrails.md | 368 | 64 | 180 | 140 | 19 |
| 05_adr/ADR-013-cell-partitioning-fail-mode.md | 411 | 50 | 273 | 175 | 11 |
| 05_adr/ADR-014-audit-data.md | 338 | 11 | 182 | 119 | 1 |
| 05_adr/ADR-015-crypto-agility-pqc.md | 281 | 29 | 172 | 129 | 5 |
| 05_adr/ADR-016-versioning-deprecation.md | 244 | 12 | 286 | 171 | 1 |
| 05_adr/ADR-017-non-human-ai-agent-identity.md | 259 | 10 | 220 | 118 | 2 |
| 05_adr/ADR-018-exit-strategy.md | 178 | 38 | 217 | 141 | 10 |
| 05_adr/ADR-019-compromise-response.md | 310 | 20 | 127 | 85 | 1 |
| 05_adr/ADR-020-fapi2-applicability.md | 169 | 9 | 220 | 122 | 0 |
| 05_adr/ADR-021-irreversible-identifiers.md | 441 | 89 | 355 | 281 | 13 |
| 05_adr/ADR-022-integration-contract-standards.md | 258 | 51 | 223 | 162 | 10 |
| 05_adr/ADR-023-dependency-tiers.md | 316 | 44 | 182 | 136 | 17 |
| 05_adr/ADR-024-cross-tenant-sharing.md | 285 | 16 | 124 | 95 | 1 |
| 05_adr/ADR-025-list-search-authorization.md | 223 | 25 | 132 | 91 | 1 |
| 05_adr/ADR-026-async-long-running-delegation.md | 277 | 18 | 115 | 97 | 2 |
| 05_adr/ADR-027-migration-dual-run-rollback.md | 295 | 15 | 260 | 153 | 1 |
| 05_adr/ADR-028-tenant-lifecycle-operations.md | 329 | 44 | 285 | 238 | 11 |
| 05_adr/ADR-029-privileged-support-access.md | 280 | 32 | 245 | 169 | 8 |

要確認の段落・箇条の全件（行番号と先頭の文）は results-after.json の `results.claimtags` にある。
<!-- AUTO:END -->
