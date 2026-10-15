# 模擬パネル判定記録

> 文書ID: TRC-10 / 版: 0.4 / 状態: draft / 最終更新: 2026-10-15（0.4: 続行ワークフローの報告段として、ラウンド 6・7 の Medium/Low 55 件の一覧（MP-6-01〜25、MP-7-01〜30）を §4.2 に、§4.4 の群への割当て（群 h・i を新設）を追記し、ラウンド 4 の 8 役の判定理由の要約を §5.4 に表で加えた。ラウンド 7 の是正 25 件の処理完了をワークフローの集計値で記録し、再審査未実施であることを §0・§2.1・§5.1・§6 に明記した。§6 の注意 4 を PoC 実測レポート POC-02 の存在に合わせて改めた。既存のラウンド 1〜7 の記録は残した。0.3: 模擬パネル ラウンド 7 の ciso 指摘〔状態表示の陳腐化の再発。本書がラウンド 5 で止まっていた〕により、ラウンド 6・7 の判定・件数・Critical の内訳・是正への回付件数・主な論点を §0・§1・§2・§3・§4・§5・§6・§7 に追記し、「最新の判定済みラウンド」をラウンド 7 に改めた。末尾「レビュー記録」。0.2: 模擬パネル ラウンド 5 の redteam 指摘〔状態表示の陳腐化〕と、DCS-00 申し送り C4-8・C5-7、DCS-01 申し送り R4S-6 により、Phase 4 続行ワークフロー（.workflows/phase4b.js）のラウンド 4・5 の判定・件数・是正の状態を §0・§1・§2・§3・§4・§5・§6・§7 に追記し、「最終ラウンド」の語を「最新の判定済みラウンド」に改めた。末尾「レビュー記録」）
> 状態確認の時刻（版 0.4）: ラウンド 6・7 の Medium/Low の一覧と、ラウンド 7 の是正の処理件数（25 件）は、続行ワークフローの報告段に渡されたラウンド別の集計データ（verdicts、counts、medLow、fixed）による。件数は版 0.3 で数えた値（§2.1、§4.3）と一致した。ラウンド 7 の是正の内容は各文書の「レビュー記録」節のラウンド 7 行を正本とし、本書では照合していない [D][^9]
> 状態確認の時刻（版 0.3）: ラウンド 6・7 の判定・件数は、2026-10-15T04:45Z（UTC）時点で、続行ワークフローの実行記録（journal.jsonl の started／result 記録。各パネリストの構造化出力と検証エージェントの real/reason 出力を含む）から数えた（git HEAD a155148。phase4b.js は未追跡）。この時刻に、ラウンド 7 のパネル（04:38Z〜04:43Z）と検証は完了しており、ラウンド 7 の是正（回付 25 件）は進行中である。続行ワークフローはラウンド 7 が上限であり（§1）、ラウンド 7 の是正を再審査するパネルは同ワークフローでは行われない [D][^5][^8]
> 状態確認の時刻（版 0.2）: ラウンド 4・5 の判定・件数は、2026-10-15T03:50Z（UTC）時点で、同じ出力から数えた。この時刻にラウンド 5 の是正（回付 28 件）は進行中であった [D][^5][^6]
> 対応要求: R-201, R-202（DL-109 の対応要求）。G-009, G-130（関連）
> 依存文書: CONVENTIONS.md, traceability/deliverables.md, .workflows/phase4.js, .workflows/phase4b.js, 00_decision/00-cover.md〜08-alternatives-comparison.md, traceability/open-items.md
> 作成方法: AI エージェント（Claude）が、Phase 4 のワークフロー（.workflows/phase4.js）が集計したラウンド別データ（判定・理由・件数・Medium/Low 指摘）を整理した。版 0.2 のラウンド 4・5 と版 0.3 のラウンド 6・7 は、続行ワークフロー（.workflows/phase4b.js）の各パネリスト・検証エージェントの出力を作成者（本書の是正エージェント）が直接数えたもので、作成者以外の照合は未実施である。指摘の個別の是正結果は、各文書末尾の「レビュー記録」節が正本であり、本書は件数と扱いを記録する。
> 表の注記: 表のセルでタグのないものは、ワークフローの集計データと各パネリストの判定理由の転記・要約（設計推論 [D]）であり、この注記で個別のタグに代える。

**本書は AI エージェントによる模擬パネルの自己レビューであり、実在の CTO/CISO の決裁ではない。** パネリスト 8 名（CTO、CISO、超大規模 SRE、プライバシー・法務、内部監査、レッドチーム、連携サービス開発リーダー、CFO/PMO）はいずれも同じパイプライン内の AI エージェントが役割を演じたものであり、報告系統の外にある独立性を持たない [D][^1]。本書の「承認可」「差戻し」は、実在の経営会議・CTO・CISO・CFO・法務・内部監査のいずれの判断にも代わらない [D][^1]。

## 0. 要旨

- 模擬パネルは 7 ラウンド実施した（2026-10-15T04:45Z 時点）。ラウンド 1〜3 は Phase 4 のワークフロー（.workflows/phase4.js、最大 3 ラウンド）、ラウンド 4〜7 は続行ワークフロー（.workflows/phase4b.js、ラウンド 4〜7）による [D][^2][^5]。指摘総数はラウンド 1 が 69 件、ラウンド 2 が 67 件、ラウンド 3 が 49 件、ラウンド 4 が 73 件、ラウンド 5 が 59 件、ラウンド 6 が 59 件、ラウンド 7 が 56 件である [D][^2][^6][^8]。
- 机上で閉じる Critical/High の新規指摘は 30 件・33 件・16 件・42 件・28 件・34 件・26 件で、各ラウンドの Critical/High の全数に一致した（机上で閉じない Critical/High と、前ラウンドとの重複は 0 件）[D][^2][^6][^8]。Critical はラウンド 4 が 1 件（cfo）、ラウンド 5 が 5 件（cto・audit・legal・sre・cfo）、ラウンド 6 が 4 件（cto・ciso・audit・legal）、ラウンド 7 が 0 件である（ラウンド 1〜3 の内訳は集計データにない）[D][^6][^8]。
- 是正に回付した件数（作成者以外のエージェントによる実在性の検証を通過した件数）は 29 件・32 件・16 件・42 件・28 件・34 件・25 件である。検証で棄却されたのは 1 件・1 件・0 件・0 件・0 件・0 件・1 件である [D][^2][^6][^8]。
- **最新の判定済みラウンドはラウンド 7 である。** その判定は、承認可（条件付き含む）4 名（legal・redteam・devlead・cfo）、差戻し 4 名（cto・ciso・sre・audit）である [D][^8]。ラウンド 6 は承認可 1 名（cfo）、差戻し 7 名であった [D][^8]。ラウンド 4・5 は承認可 0 名、差戻し 8 名、Phase 4 の終了時点（ラウンド 3）は承認可 6 名、差戻し 2 名である。いずれも最新の結果ではない [D][^2][^6]。
- 差戻しの主因は、ラウンド 4 では「ラウンド 3 の是正が正本（DCS-02・03・06 ほか）にだけ入り、決裁者が読む表紙・要約・DCS-07 に伝播していない」こと（とくに DEC-10 の金額と DEC-7 の件数）、ラウンド 5 では「ラウンド 4 の並行是正で正本の DEC-10 の金額が改められ（計 約 1.5〜10.9 億円）、表紙・要約・DCS-07 が旧値のまま、表紙が事実と異なる整合宣言をしていた」ことである。ラウンド 6 では同じ型が残余リスク台帳で再発した（正本 DCS-05 版 0.7・75 件に対し、DEC-1 決議文案 9 と表紙は版 0.5・73 件、要約は 71 件。Critical 4 件はこの論点）。ラウンド 7 では、新たに作られた PoC 実測レポート（POC-02）の不利な結果（TC-021・TC-014・F-5 ほか）とその存在が決裁文書・台帳・POA&M に未反映であること、ラウンド 6 の是正（ゲート順序、DEC-10 の追加事項）の表紙・要約への未伝播、本書と表紙・要約の模擬パネルの状態表示の陳腐化が主な論点であった（§2.3、§5）[D][^6][^8]。
- 再審査の状態: ラウンド 3〜6 の是正（16 件・42 件・28 件・34 件）は、それぞれ次のラウンドのパネルが確かめた。ラウンド 4・5 は全員差戻し、ラウンド 6 は差戻し 7 名、ラウンド 7 は差戻し 4 名であり、各ラウンドとも差戻しの理由の一部が残る、または同じ型が再発したと判定された [D][^6][^8]。**ラウンド 7 の是正 25 件は、ワークフローの集計で処理済みと記録されたが（fixed=25）、パネルの再審査を受けていない。** 続行ワークフローはラウンド 7 で終わるため、同ワークフローの中で再審査されることはない。「是正済み（是正エージェントの自己申告）・再審査未実施」とする [D][^5][^8][^9]。
- Medium/Low の指摘（7 ラウンドで 223 件。全件を §4.2 に一覧）は、設計上、是正ループの対象外であった。すべて机上で閉じられる（desk_closable=true）が未処理であり、同じ趣旨の指摘がラウンドをまたいで繰り返し出た（§4.4）[D][^2][^6][^8]。
- 経営判断・実測・第三者評価でしか閉じない事項は、決裁案・残課題として開示済みであることを各パネリストが確認したうえで指摘から除いた。このため非机上の指摘は 7 ラウンドとも 0 件である。除いた事項は §3 に記録する [D][^2][^6][^8]。

## 1. 方法

| 項目 | 内容 |
|---|---|
| パネリスト | cto、ciso、sre、legal、audit、redteam、devlead、cfo の 8 役（いずれも AI エージェント） |
| 審査基準 | レビュー原文の承認条件 10 項と重大な不足、G-goal-criteria、CONVENTIONS |
| 判定の選択肢 | 「承認可（条件付き含む）」「差戻し」 |
| 指摘の属性 | 重大度（Critical/High/Medium/Low）、ファイル・節、問題、desk_closable、修正案 |
| 除外規則 | 経営判断・実測・第三者評価でしか閉じない事項は、残課題・決裁案として開示されていれば指摘しない。前ラウンドで是正済みの点は繰り返さない |
| 是正ループ | 机上で閉じる Critical/High の新規指摘だけを、作成者以外のエージェントが実在性を検証し（反証を試み、不確かなら棄却）、通過したものをファイル単位の是正エージェントに回付 |
| 終了条件 | Phase 4（phase4.js）: 最大 3 ラウンド。新規 Critical/High が 2 ラウンド連続で 0 件なら早期終了（3 ラウンドすべて実施）。続行（phase4b.js）: ラウンド 4〜7。新規の机上 Critical/High が 2 ラウンド連続で 0 件なら終了。ラウンド 4〜7 のいずれも新規の机上 Critical/High が 1 件以上あったため早期終了せず、上限のラウンド 7 まで実施した。2026-10-15T04:45Z 時点でラウンド 7 の是正中。ループの後に、全ラウンドのデータを本書に追記する報告段がある（phase4b.js L89） |
| ラウンド 4 以降の重点 | 続行ワークフローの指示により、ラウンド 3 で内部監査と CFO が差し戻した論点（DEC-7 の件数と AI 検証の開示、PEP coverage の TC、DEC-4 の予算上限の算定、G0〜G3 段階予算の承認 DEC、代替案比較の TCO 基準値、Plan B の経路の循環、ライフサイクルイベント契約・client 登録契約、状態表示の陳腐化）の解消を重点的に確認した |

出典: .workflows/phase4.js、.workflows/phase4b.js [D][^2][^5]。

## 2. ラウンド別の結果

### 2.1 件数

| ラウンド | 指摘総数 | Critical/High | うち机上・新規 | 検証通過（是正回付） | 検証で棄却 | Medium | Low | 差戻し / 8 |
|---|---|---|---|---|---|---|---|---|
| 1 | 69 | 30 | 30 | 29 | 1 | 30 | 9 | 6 |
| 2 | 67 | 33 | 33 | 32 | 1 | 26 | 8 | 5 |
| 3 | 49 | 16 | 16 | 16 | 0 | 25 | 8 | 2 |
| 4 | 73 | 42（Critical 1、High 41） | 42 | 42 | 0 | 28 | 3 | 8 |
| 5 | 59 | 28（Critical 5、High 23） | 28 | 28 | 0 | 22 | 9 | 8 |
| 6 | 59 | 34（Critical 4、High 30） | 34 | 34 | 0 | 17 | 8 | 7 |
| 7（最新） | 56 | 26（Critical 0、High 26） | 26 | 25（是正済み・再審査未実施） | 1 | 24 | 6 | 4 |
| 計 | 432 | 209 | 209 | 206 | 3 | 172 | 51 | — |

注: ラウンド 1〜3 の Critical/High の件数は「指摘総数 − Medium/Low の件数」で算出した。その Critical と High の内訳、および Critical/High 各指摘の本文はワークフローの集計データに含まれないため、各文書の「レビュー記録」節を正本とする [D][^2]。ラウンド 4・5 の件数は、各パネリストの構造化出力の指摘を重大度別に数えた（パネリスト別: ラウンド 4 は cto 9・ciso 10・sre 7・legal 7・audit 9・redteam 10・devlead 12・cfo 9、ラウンド 5 は cto 8・ciso 5・sre 8・legal 6・audit 7・redteam 6・devlead 11・cfo 8）。検証エージェントは、ラウンド 4 の 42 件、ラウンド 5 の 28 件のすべてで real=true を返した [D][^6]。ラウンド 4 の是正は対象ファイルの組ごとに 28 の是正エージェント、ラウンド 5 は 19 の是正エージェントに回付された [D][^6]。各指摘の是正の内容は、各文書の「レビュー記録」節のラウンド 4・5 行を正本とする [D][^7]。ラウンド 6・7 の件数も同じ方法で数えた（パネリスト別の指摘数: ラウンド 6 は cto 6・ciso 6・sre 6・legal 9・audit 8・redteam 7・devlead 11・cfo 6、ラウンド 7 は cto 7・ciso 8・sre 7・legal 6・audit 5・redteam 6・devlead 10・cfo 7）。ラウンド 6 の検証エージェントは 34 件すべてで real=true を返し、是正は 20 の是正エージェントに回付された。ラウンド 7 は 26 件のうち 25 件が real=true で、1 件（audit の High。本書がラウンド 5 で止まっているという、ciso の High と同じ趣旨の指摘）が real=false で棄却された。棄却の理由は「空白は時刻付きで開示済みで、報告段で追記される予定のため」である。同じ趣旨の ciso の指摘は検証を通過し、本書版 0.3 の契機となった。ラウンド 7 の是正は 2026-10-15T04:45Z 時点で 14 の是正エージェントに回付されていた。その後、報告段に渡された集計では、ラウンド 4〜7 の是正件数（fixed）はそれぞれ 42・28・34・25 件で、回付件数と一致した。是正の内容が指摘を満たすかは、ラウンド 7 分についてはパネルの再審査を経ていない [D][^8][^9]。

### 2.2 判定

| パネリスト | ラウンド 1 | ラウンド 2 | ラウンド 3 | ラウンド 4 | ラウンド 5 | ラウンド 6 | ラウンド 7（最新） |
|---|---|---|---|---|---|---|---|
| CTO | 差戻し | 差戻し | 承認可（条件付き） | 差戻し | 差戻し | 差戻し | 差戻し |
| CISO | 差戻し | 差戻し | 承認可（条件付き） | 差戻し | 差戻し | 差戻し | 差戻し |
| 超大規模 SRE | 承認可（条件付き） | 承認可（条件付き） | 承認可（条件付き） | 差戻し | 差戻し | 差戻し | 差戻し |
| プライバシー・法務 | 差戻し | 差戻し | 承認可（条件付き） | 差戻し | 差戻し | 差戻し | 承認可（条件付き） |
| 内部監査 | 差戻し | 差戻し | 差戻し | 差戻し | 差戻し | 差戻し | 差戻し |
| レッドチーム | 承認可（条件付き） | 承認可（条件付き） | 承認可（条件付き） | 差戻し | 差戻し | 差戻し | 承認可（条件付き） |
| 連携サービス開発リーダー | 差戻し | 差戻し | 承認可（条件付き） | 差戻し | 差戻し | 差戻し | 承認可（条件付き） |
| CFO/PMO | 差戻し | 差戻し | 差戻し | 差戻し | 差戻し | 承認可（条件付き） | 承認可（条件付き） |
| 承認可 / 差戻し | 2 / 6 | 3 / 5 | 6 / 2 | 0 / 8 | 0 / 8 | 1 / 7 | 4 / 4 |

注: ラウンド 4・5 の判定は 2026-10-15T03:50Z 時点、ラウンド 6・7 の判定は 2026-10-15T04:45Z 時点の各パネリストの構造化出力（verdict 欄）による [D][^6][^8]。ラウンド 7 で承認可とした 4 名も、いずれも「次回決裁の起案前に High を是正すること」を条件とし、cfo は「未是正のまま実在の決裁者に提出することは認めない」とした（§5.1）[D][^8]。ラウンド 3 で承認可とした 6 名は、ラウンド 4 で全員が差戻しに転じた。各役の判定理由によれば、ラウンド 3 の是正が正本にだけ入り、表紙・要約・決議文案に届いていないことを、ラウンド 4 のパネルが作業ツリーで確かめたためである [D][^6]。

### 2.3 ラウンドごとの主な論点

| ラウンド | 差戻しの主な理由（要約） |
|---|---|
| 1 | 代替案比較の費用が DCS-07 の基準値の約半分（26〜30 FTE 前提）。Plan B の発動条件が循環。決裁事項に統治規程（GOV-05〜08）の承認がなく G0 を通過できない。DEC-3（不可逆）の前提にリスク選好と Gate 2 独立レビューがない。法務署名前の判定表を経営が承認する構成。ライフサイクルイベント契約・client 登録契約の欠落。DEC-4 の予算上限が空欄で G0〜G3 の支出に決議主体がない |
| 2 | ラウンド 1 の是正が DCS-03・DCS-06 にだけ入り、表紙・要約・DCS-07 に伝播していない。次回決裁で DEC-3・DEC-8 を求めるかが文書間で正反対。DEC-10 の有無が DCS-03 と DCS-06 で逆。申し送り（TR-1〜9、H-1〜8、8-1〜6、M-1〜M-9）が POA&M に未起票。敵対的な破壊・恐喝（DX 型）の欠落。PoC 範囲の従業員テナントと「合成データ限定」の矛盾 |
| 3 | 次回決裁の範囲は文書間で一致した。残る差戻し理由は 2 点。(a) 内部監査: 要約の「実測 0 件」と、12_poc/data/ にある系統 1 の実行記録（不合格・中止を含み、立会人署名なし、不合格を見た後の manifest 再凍結）の未開示。(b) CFO: DEC-10 の承認額が正本 DCS-06 版 0.3（G0〜G3 計 約 1.2〜8.6 億円、Gate 2 独立レビューを含む）と DCS-03・表紙・要約（計 約 1.0〜7.8 億円）で食い違い、継続費用（定常 48 FTE、G3 以降の SRE、G5 独立保証）の決裁単位が未定義 |
| 4 | 8 名全員が差戻し。ラウンド 3 の是正が正本（DCS-02 版 0.2、DCS-03 版 0.4、DCS-05 版 0.4、DCS-06、POC-01 版 0.2）にだけ入り、決裁者が読む表紙・要約・DCS-07・決議文案・POA&M に伝播していない（ラウンド 2 と同型の再発）。具体的には、DEC-10 の金額（正本 計 約 1.2〜8.6 億円に対し表紙・要約・DCS-07 は 約 1.0〜7.8 億円。Critical は cfo）、DEC-7 の件数（DCS-02 は 34 件、表紙・要約・DCS-03 は 35 件）、DEC-11（仮）が DCS-03 以外にない、残余リスク件数（70／71／72 件）、系統 1 の実行記録の開示が 21 件の時点で止まり TC-010 の不合格などが未開示、R-269 と TC-121 の対応欠落、表紙の付属 J・L の「未作成」表示、DX 型の POA&M 未起票、DEC-9 決議文案の Plan B 経路、契約試験キット（DL-120）の未登録と G3 予算の欠落、越境ゲストとモデル誤りの攻撃経路（TC-002 v2）、未成年者・運用アクセス元の決裁文書への未伝播、FM-13 の検知前の窓。各役とも「1 回の整合改版で閉じられる規模」とした |
| 5 | 8 名全員が差戻し。ラウンド 3 の重点論点の大半（DEC-7 の 34 件の一致と AI 検証の開示、TC-121 と R-269、DEC-4 の上限式、DEC-10・DEC-11（仮）の新設、TCO 基準値、Plan B の循環、CON-12〜14）は解消を確認した。しかし、ラウンド 4 の並行是正（devlead R4K-1）で正本 DCS-06 §5.2・DCS-03 §4.10 の DEC-10 が「G0〜G2 約 0.9〜6.7 億円、G3 約 0.6〜4.2 億円、計 約 1.5〜10.9 億円」に改まった一方、表紙・要約・DCS-07・OI-B45 は旧値（計 約 1.2〜8.6 億円）のままで、表紙 §8 の 7 は「揃った」と事実と異なる整合宣言をしていた（Critical: cto・audit・legal・sre・cfo）。ほかに、DCS-06 の版を上げずに値を変えた版管理の破綻、DEC-1 決議文案 9 の残余リスク台帳の版・件数（DCS-05 版 0.5・73 件、RRG-072）、ゲート統制からの逸脱 GD-01 の継続と OI-C18 への未起票、DX 型の構成要素の POA&M 未起票、K33 の経営判断の DEC 未接続、Plan B の切替え費用、GDPR 34 条の本人通知、ライフサイクル事象の偽造・prompt injection・回復手続の悪用・group 入れ子の資源枯渇の攻撃経路、FM-13 の残余リスク行、系統 1 の自己実行の [M] 引用、本書と表紙・要約の模擬パネルの状態表示（本書版 0.2 の契機） |
| 6 | 差戻し 7 名、承認可（条件付き）1 名（cfo）。ラウンド 3 の重点論点と DEC-10 の金額（計 約 1.5〜10.9 億円）は表紙・要約・DCS-07・OI-B45 まで揃ったことを確認した。しかし「正本の並行是正が決裁文と要約に伝わらない」型が残余リスク台帳で再発した。正本 DCS-05 は版 0.7・75 件（段2 55。RRG-032-1〔FM-13 の検知前の窓の誤 allow、E_max 未決〕・RRG-073〔ライフサイクル事象の偽造〕を追加、DP41-7 を新設）なのに、DEC-1 決裁内容 (8)・決議文案 9 と表紙 §7 は版 0.5・73 件、要約 §6 は 71 件のままで、署名すると 2 件が採用対象から落ちる（Critical: cto・ciso・audit・legal。ciso は決議文案 1 の GOV-02 B 標準〔write・privileged の誤 allow 0 件〕との矛盾も指摘）。ほかに、値の伝播を確かめる機械検査が未実装（cto・sre・audit）、DCS-05 版 0.5〜0.7 の追加分と RA-0074・0075 の POA&M 未起票、G-019・G-022 の「充足」表示、RR3-09 の台帳への未写像と「漏れ 0 件」の誤り、RRG-073 の失効条件が DEC-8 の前提にない、CON-15（照会 API）の DL 未登録、ADR-017 RR17-08 の受容者が GOV-02 U1・GOV-07 RV-1 に反する、OPS-01 の本人通知の未修正、L-04・NA-3 の決める人の食い違い、Plan B の法務上の残余リスク、ゲート順序（G3 と G4 の判定の先後）の 3 通りの記載（cfo）、ラウンド 5 で追加した試験案の POC-01 未登録 |
| 7（最新） | 差戻し 4 名（cto・ciso・sre・audit）、承認可（条件付き）4 名（legal・redteam・devlead・cfo）。Critical は 0 件。ラウンド 3 の重点論点、DEC-10・DEC-11（仮）の金額、残余リスク台帳の伝播は解消を確認した。主な論点は次のとおり。(a) PoC 実測レポート POC-02（12_poc/measurement-report.md）が作成されたのに、表紙 §6 付属 H・§8 の 2、要約 §10.1、POA&M（OI-M02・OI-C18）は「未作成」のまま。POC-02 の不利な結果（TC-021: 他テナントの role を subject として受理し昇格が 1 件成立、TC-014: 鍵の誤撤去を検知できず使用中の token 1,980 件のうち 1,566 件が拒否、F-5: 拒否された support アクセスが監査に outcome=success で記録）が脅威台帳・残余リスク台帳・POA&M・要約に未反映（cto・ciso・sre・cfo・audit）。TC-010 の件数の過小表示（audit）。(b) ラウンド 6 の是正（DCS-06 のゲート順序の一本化、DEC-10 の決裁内容 (8)・(9)）が表紙・要約・DCS-03 §2.1 の DEC-11（仮）行に未伝播（cto・cfo）。(c) RRG-074 の POA&M 未起票、DP41-3・DP41-5 の DEC 未割当、RB-13 の期限の食い違いと THR-02 の DX 型の仮番の衝突（ラウンド 5 の CISO 条件の未是正）、H6L-1〜5 の未反映。(d) 攻撃経路: 本番 client 登録の所有テナント同意、T-094 の連鎖、T-092・T-093 の侵害 runbook、CON-13 の lcsig。(e) CON-14 §4A の入口文書・キット仕様への未伝播（devlead）。(f) 本書がラウンド 5 で止まり、表紙・要約が「最新はラウンド 5」と書いている（ciso。本書版 0.3 の契機） |

## 3. 非机上指摘の扱い

- 7 ラウンドを通じ、desk_closable=false の指摘は 0 件である（ラウンド 4〜7 は全 247 件が desk_closable=true）[D][^2][^6][^8]。これは除外規則（§1）により、経営判断・実測・第三者評価でしか閉じない事項のうち残課題・決裁案として開示済みのものを、パネリストが指摘から除いたためである [D][^2]。
- 除外は「解決した」ことを意味しない。各パネリストが判定理由で除外を明示した事項を次に記録する。いずれも未達のままであり、POA&M（traceability/open-items.md）と決裁案で追跡される [D][^3]。

| 区分 | 除外された事項（判定理由に明記されたもの） | 閉じ方 |
|---|---|---|
| 経営承認 | DEC の決議（決議 0 件）、要員確約（SRE 8 名以上、定常 48〜66 FTE）、受容票の起票（0 件）、許容度・KRI 閾値の値、損失単価 MP-01〜09、予備費率・付議基準額、パイロット確約、リードタイム目標値・窓口体制・審査 SLA | B 組織決定 |
| 法務判断 | 法務署名（E2、OI-L01）、外部の現地法律意見（KRM-3）、L-01〜L-13 の結論、年齢閾値・補完的ルールの適用範囲 | B 組織決定 |
| 実測 | PoC の実測（C_cell、KMS 実効枠、TC-106 ほか）、SLO 値、G-123・G-146、リードタイムの実測、TCO の非要員費（RFP 実額、HSM 見積り） | C 実測 |
| 第三者評価 | Gate 2・Gate 5 の独立評価、cross-tenant pentest・red team、OIDF conformance、G5 の見積り | D 第三者 |

## 4. 残った Medium/Low 指摘

### 4.1 扱い

- Medium/Low の指摘は、ワークフローの設計上、検証・是正ループに回付されなかった [D][^2]。本書の作成時点で、各指摘が個別に是正されたかは確認していない。下表の状態はすべて「未処理」とする [D]。
- 168 件（ラウンド 1〜3 の 106 件、ラウンド 4 の 31 件、ラウンド 5 の 31 件）すべてが desk_closable=true（文書の修正で閉じられる）である [D][^2][^6]。
- ラウンド 6 の 25 件（Medium 17、Low 8）とラウンド 7 の 30 件（Medium 24、Low 6）も、すべて desk_closable=true である。版 0.4 で §4.2 に一覧を加え、MP-6-01〜25、MP-7-01〜30 を付番した [D][^9]。ラウンド 7 の Medium のうち 6 件（MP-7-01・06・13・17・23・28）は本書そのものの陳腐化を指摘したもので、本書は版 0.3・0.4 で対応した。ただし同じ指摘のうち表紙・要約の分は未適用である（§7 申し送り 8）[D]。
- 推奨する扱い: (1) POA&M の所有者が、§4.4 の重複群を 1 行に束ねて起票する。(2) 決裁パッケージ（00_decision/）の状態表示に関わる行（§4.4 の群 a〜c）は、次回決裁の起案前に閉じる。(3) 個別の行は、各ラウンドのファイル所有者が「レビュー記録」節に処理結果を追記する [D]。本書は他文書を編集しない。

### 4.2 一覧

ID は本書内の通し番号（MP-ラウンド-連番）。「重」は重大度（M=Medium、L=Low）。

#### ラウンド 1（Medium 30、Low 9）

| ID | 重 | 指摘者 | 対象 | 要旨 |
|---|---|---|---|---|
| MP-1-01 | M | cto | 10_integration/definition-of-ready.md §7 | 委託条項案が VC 系と付録 A 系の 2 系統で食い違い、G-129 の採否者（調達・法務）が DEC-8 の前提にない |
| MP-1-02 | M | cto | 00_decision/00-cover.md ほか | change-log・DL-40/42/44 を「未作成」とする古い状態記述。DEC-9 決議文案に DCS-08 K44-1 (b) が未反映 |
| MP-1-03 | M | cto | 00_decision/00-cover.md §6・§8 | ASR-02（pentest-redteam-plan）未作成が付属索引・残課題に記載されていない |
| MP-1-04 | L | cto | 00_decision/07-organization-and-tco.md §8.1 | 要員確約・A-054 改訂を DEC-4 に置き、承認者が一致しない |
| MP-1-05 | M | ciso | 00_decision/03-decision-items.md §4.3 | RR21-01 の受容者・受容票・期限が DCS-05 の RRG-008（段2、RA-0008）と食い違う |
| MP-1-06 | M | ciso | 03_threat-model/fraud-abuse-controls.md §1.2 | SMS pumping 未扱い。FA と S-xx・MP・KRI の対応なし。ATK-15 の照合漏れ |
| MP-1-07 | M | ciso | 01_governance/exception-risk-acceptance.md §5 | 個人データに及ぶ受容で法務判断・DPIA・GDPR 36 条の確認が必須になっていない |
| MP-1-08 | L | ciso | 00_decision/05-residual-risk-register.md §2.2 | 失効条件が TBD の KRI 閾値に依存し、失効が働かない受容が成立し得る |
| MP-1-09 | M | sre | 07_slo/numeric-contracts.md §5.3 | 多段 hop の認可遅延の合成と tail 増幅の予算がない |
| MP-1-10 | M | sre | 04_architecture/capacity-model.md ほか | SCIM・bulk のバースト同時発生が容量化されず、剥奪書込みの優先規則がない |
| MP-1-11 | M | sre | 08_operations/compromise-runbooks.md ほか | 可用性障害の runbook（cell 切替、shed、KMS throttle 等）がない |
| MP-1-12 | M | sre | 07_slo/numeric-contracts.md §5.5 | decision plane 内部の可用性配分表がない |
| MP-1-13 | M | sre | 00_decision/05-residual-risk-register.md RRG-040 | 基準時点で既に生じている容量超過を将来の問題として記述 |
| MP-1-14 | L | sre | 12_poc/preregistered-test-plan.md ほか | 到着過程・バースト形状が凍結項目にない。k_r に配備中の容量減が含まれない |
| MP-1-15 | M | legal | 04_architecture/audit-privacy.md §11.2 | 権利行使の法定回答期限が未定義で、消去完了（最長約 61 日）との関係が未分析 |
| MP-1-16 | M | legal | 02_requirements/data-classification.md §4.2 | 運用拠点の前提が N2（日本のみ）と NA-3（未定）で食い違う |
| MP-1-17 | M | legal | 00_decision/01-executive-summary.md §10 | 法域判定・規制写像が法務署名前の AI 起草であることが要約にない |
| MP-1-18 | L | legal | 06_controls/applicability.md | DL-84 を未作成のまま記載し、RES-01 の整理が未反映 |
| MP-1-19 | M | audit | traceability/open-items.md | 作成済み文書を「未作成」と記載。行数・完了数の再集計が必要 |
| MP-1-20 | M | audit | 00_decision/00-cover.md §4・§6・§8 | change-log と DL-39/40/42/44 の状態表示が実態と不一致 |
| MP-1-21 | M | audit | 00_decision/01-executive-summary.md §5 | SRE 人数の根拠（Google SRE 本）を原典より強い強度で記述、[V] の誤用 |
| MP-1-22 | M | audit | 00_decision/01-executive-summary.md §3 | DEC-3 の対立推奨（ADR-007 KD7-1）が要約になく dissent-log にも未登録 |
| MP-1-23 | L | audit | 00_decision/01-executive-summary.md §10 | 承認条件 10 項の現状が要約にない |
| MP-1-24 | M | redteam | 05_adr/ADR-016-versioning-deprecation.md | policy bundle の署名に宛先が含まれず、誤配布・再提示を検証で拒否できない |
| MP-1-25 | M | redteam | 05_adr/ADR-017-non-human-ai-agent-identity.md D17-07 | 複数テナントのエージェント主体が同一実行環境に同居し、prompt injection による越境経路が残る |
| MP-1-26 | M | redteam | 03_threat-model/threat-catalog.md §5.10 | 利用側での PEP SDK 改ざん・既知脆弱版の稼働が脅威として未登録 |
| MP-1-27 | M | devlead | 11_contracts/README.md ほか入口文書 | 存在する CON-11・DL-42・DL-62・DL-65〜68 を「未作成」と記載 |
| MP-1-28 | M | devlead | 11_contracts/scim.openapi.yaml・schemas/ ほか | x-freeze-class の注記がない契約があり、規約外の値「GA 候補」を使用 |
| MP-1-29 | M | devlead | 10_integration/onboarding.md §3・§5.1 | リードタイムの計画用仮置き値がなく、G-124 を過大表示 |
| MP-1-30 | M | devlead | 11_contracts/README.md §2.3 ほか | 汎用モックの起動確認が CON-07 だけ |
| MP-1-31 | L | devlead | 10_integration/README.md §5.1・§7.1 | 12_poc/code の位置付け（依存してよいか）が未記載 |
| MP-1-32 | M | cfo | 00_decision/08-alternatives-comparison.md | ④ の費用が DCS-07 の基準値（48〜66 FTE）と食い違い、② の要員費が TBD |
| MP-1-33 | M | cfo | 00_decision/06-gate-plan-and-plan-b.md §6 | Plan B の切替え費用・定常費用・回収不能投資の枠がない |
| MP-1-34 | M | cfo | 00_decision/03-decision-items.md §4.4 | 耐久性維持枠・CISO 独立予算枠が DEC-4 の決裁内容にない |
| MP-1-35 | M | cfo | 00_decision/03-decision-items.md §4.5 | DEC-5（RFP 発出）が CISO 単独承認で CFO がおらず RACI-32 と食い違う |
| MP-1-36 | M | cfo | 00_decision/07-organization-and-tco.md | 要員単価 NA-001-2 が前提台帳未登録で CFO への入力依頼もない |
| MP-1-37 | L | cfo | 00_decision/07-organization-and-tco.md §2 | RACI-30 の A が CTO だけで DEC-4 の承認者と食い違う |
| MP-1-38 | L | cfo | 00_decision/00-cover.md ほか | change-log・DL-39/40/42/44 の状態表示が古い（MP-1-20 と同旨） |
| MP-1-39 | L | cfo | 00_decision/01-executive-summary.md §5 | 予算・期間上限の所有者等を「決定」と記載（実際は案） |

#### ラウンド 2（Medium 26、Low 8）

| ID | 重 | 指摘者 | 対象 | 要旨 |
|---|---|---|---|---|
| MP-2-01 | M | cto | 00_decision/04-program-charter.md ほか | 便益側の KPI 定義・測定方法がなく、費用との比較の片側が空 |
| MP-2-02 | M | cto | 00_decision/01-executive-summary.md §5 | 依存サービス改修費の表記が誤読を招き、PEP 組込みの人月が未転記 |
| MP-2-03 | M | cto | 00_decision/00〜03・06 | change-log・CON-12/13・client 登録を未作成とする誤った理由記載 |
| MP-2-04 | L | cto | 00_decision/01-executive-summary.md | 申し送り節・レビュー記録節がそれぞれ 2 つある |
| MP-2-05 | M | ciso | 00_decision/05-residual-risk-register.md RRG-068 | 本番に及ぶ影響を段1 で受容。入場前の負例試験で確かめるべき予防条件 |
| MP-2-06 | M | ciso | 03_threat-model/fraud-abuse-controls.md | deepfake・映像注入による helpdesk・遠隔本人確認の突破が未扱い |
| MP-2-07 | M | ciso | 03_threat-model/attacker-model.md | 開発・運用で使う AI エージェントが特権主体として未扱い |
| MP-2-08 | M | ciso | 06_controls/applicability.md | FTC Act §5 が判定表・判定保留・残課題のいずれにもない |
| MP-2-09 | L | ciso | 00_decision/00-cover.md ほか | change-log の状態表示が古い。FA の ATK 割当が未照合 |
| MP-2-10 | M | sre | 00_decision/06-gate-plan-and-plan-b.md §3.6 | G4 の中止基準「可用性目標の未達」が PoC で判定できない |
| MP-2-11 | M | sre | 04_architecture/cell-blast-radius.md §7.1 | W0→W1 で実顧客の露出が 0% から 21% に跳ぶ。cell 内段階がない |
| MP-2-12 | M | sre | 07_slo/numeric-contracts.md §3.4 | 1 要求あたりの基盤呼出しの遅延・可用性の合成式がない（MP-1-09 と同旨） |
| MP-2-13 | L | sre | 04_architecture/capacity-model.md §5.5.1 | canary 優先の理由が Tier X の逆転禁止（ADR-023）と矛盾 |
| MP-2-14 | L | sre | 00_decision/00-cover.md ほか | change-log・CON-12/13 の状態表示が古い |
| MP-2-15 | M | legal | 00_decision/05-residual-risk-register.md §4.12 | PIA-B の残余リスク（PR-16 ほか）が台帳に未登録、受容者規則とも矛盾 |
| MP-2-16 | M | legal | traceability/open-items.md §4.8 | NA-8・L-13、L-P1〜P3、GDPR 代理人・DPO・ROPA、B5 の DPIA が未起票 |
| MP-2-17 | M | legal | 02_requirements/customer-admin-responsibility.md §11.4 | 契約上の通知期限（G1）が実測（G4）より先に確約される順序 |
| MP-2-18 | L | legal | 06_controls/applicability.md §3.7 | GDPR 34 条（データ主体への通知）の行がない |
| MP-2-19 | M | audit | 00_decision/02-prior-findings-crosswalk.md | 古い文書状態から DEC-7 の件数を算出 |
| MP-2-20 | M | audit | 00_decision/00-cover.md・01 | change-log・CON-12/13 の状態と未達理由が実態と不一致 |
| MP-2-21 | M | audit | 12_poc/code/README.md ほか | 系統 1 の実装と凍結前の実行データが決裁パッケージ・POA&M に未開示 |
| MP-2-22 | M | audit | 00_decision/06-gate-plan-and-plan-b.md §5.2.2 | KMS・CloudHSM 価格が research 未登録・未照合のまま予算根拠 |
| MP-2-23 | M | audit | traceability/consistency-checks.md | 再実行で deliverables 未登録 3 件ほか悪化。G-131 未達が未反映 |
| MP-2-24 | L | audit | 00_decision/01・03 | 節の重複、表セルの主張タグ欠落 |
| MP-2-25 | M | redteam | traceability/open-items.md §3 | ラウンド 1 レッドチーム是正の申し送り M-1〜M-9 が未起票 |
| MP-2-26 | M | redteam | 11_contracts/authorization-api.openapi.yaml §4.3 | write 以上の照会でも主体の裏付けが任意 |
| MP-2-27 | L | redteam | 00_decision/03-decision-items.md §4.8 | CON-12 を「未作成」と記載（実際は未審査） |
| MP-2-28 | M | devlead | 11_contracts/lifecycle-events.asyncapi.yaml | 現在状態の照会 API が未作成で、突合・統合分割の処理を実装できない |
| MP-2-29 | M | devlead | 11_contracts/mock-contract-test-kit.md ほか | sandbox の workload 登録の契約がない |
| MP-2-30 | L | devlead | 00_decision/01-executive-summary.md §9 ほか | モック起動を確認済みの範囲を超えた記述 |
| MP-2-31 | M | cfo | 00_decision/03-decision-items.md §4.9 | DEC-9 決議文案が次回決裁で成立しない DEC-3・DEC-8 を参照 |
| MP-2-32 | M | cfo | 00_decision/03-decision-items.md §4.9 | DEC-9 の承認者に CFO がおらず、移行予算の扱いが不明 |
| MP-2-33 | M | cfo | 00_decision/06-gate-plan-and-plan-b.md §5.2 | ゲート別の中止時の累積支出と残存資産の表がない |
| MP-2-34 | M | cfo | 01_governance/assumptions-register.md | 金額承認の根拠仮定（NA-001-2、NA-DCS06/07/08）が未登録 |

#### ラウンド 3（Medium 25、Low 8）

| ID | 重 | 指摘者 | 対象 | 要旨 |
|---|---|---|---|---|
| MP-3-01 | M | cto | 00_decision/01-executive-summary.md | POA&M 行数・OI 状態など古い件数と状態が残る |
| MP-3-02 | M | cto | 00_decision/01-executive-summary.md | 約 82KB、申し送り・レビュー記録が 2 系統、番号 16・17 が重複 |
| MP-3-03 | M | cto | 00_decision/03-decision-items.md §4.4 | DEC-4 第 1 段で氏名・TBD を含む合否基準を承認させ、DCS-07・POC-01 の時期と食い違う |
| MP-3-04 | L | cto | 00_decision/01-executive-summary.md §0 | 「実測 0 件」と系統 1 の実行データの取込み時期・扱いが未記載 |
| MP-3-05 | M | ciso | 03_threat-model/attacker-model.md §6.1 | 仮番 T-087・RRG-069 が DCS-05 の確定 ID と衝突 |
| MP-3-06 | M | ciso | 00_decision/03-decision-items.md §4.1 | S-18・S-14 の許容度が空欄であることが DEC-1 で開示されていない |
| MP-3-07 | M | sre | 04_architecture/capacity-model.md | dual-run の shadow 負荷（最大 42,009/秒）が容量モデルに未計上 |
| MP-3-08 | M | sre | 07_slo/numeric-contracts.md §3 | テナント単位 SLI のテレメトリ系列数・観測基盤の容量と費用が未設計 |
| MP-3-09 | L | sre | 07_slo/numeric-contracts.md §5.3 | SLI-030 の導出の鎖が PoC で得られない全体値の実測を前提 |
| MP-3-10 | M | legal | 02_requirements/principal-catalog.md | 利用者ごとの法域の決定規則（B2C 収容、転居、他法域の従業員）が未定義 |
| MP-3-11 | M | legal | 00_decision/05-residual-risk-register.md §4.11 | S-16（報告期限の超過）専用の残余リスク行がない |
| MP-3-12 | M | legal | 10_integration/definition-of-ready.md §7.2 | ベンダー→当社の通知期限 T_V の申し送り H-1・2・5・6 が未反映・未起票 |
| MP-3-13 | M | audit | 00_decision/00-cover.md | change-log を 3 か所で「未作成」と記載 |
| MP-3-14 | M | audit | 00_decision/01-executive-summary.md | POA&M 行数が古い。OI-P01〜P14 が open-items に未起票 |
| MP-3-15 | M | audit | 00_decision/00-cover.md §6 付属 J | 独立反証レビュー（DL-108）が未作成で期限もない |
| MP-3-16 | L | audit | 00_decision/01-executive-summary.md §11 | 申し送り番号 16・17 の重複（MP-3-02 と同旨） |
| MP-3-17 | L | audit | 00_decision/00-cover.md 脚注 | As-Is の根拠が正本 REQ-07 でない。DCS-01 の版が古い |
| MP-3-18 | M | redteam | 03_threat-model/attacker-model.md §6.1 | T-087・RRG-069 の二重割当（MP-3-05 と同旨）。OI-R09 が是正の追跡を束ねていない |
| MP-3-19 | M | devlead | 10_integration/README.md §6.3 | 12_poc/code をローカル結合環境に使える範囲が未記載。モック起動は CON-07 だけ |
| MP-3-20 | M | devlead | 11_contracts/mock-contract-test-kit.md §11.4 | PoC SDK の環境変数名が規約と異なり、discovery を経由しない（ADR-022 D-3-2 に反する） |
| MP-3-21 | M | devlead | 10_integration/README.md §1.2 | 文書一覧の版が古く CON-12〜14 の行がない |
| MP-3-22 | M | devlead | 10_integration/authz-modeling-guide.md §15 | 契約版が古い。CAM 生成器の利用可否が未判断 |
| MP-3-23 | L | devlead | 00_decision/00-cover.md | 契約ファイル数（9 と 12）の食い違い、脚注の版が古い |
| MP-3-24 | L | devlead | 10_integration/developer-faq.md FQ-44 | ライフサイクル系の環境変数と registration_endpoint の取得方法が未記載 |
| MP-3-25 | M | cfo | 00_decision/03-decision-items.md §4.10 | DCS-06 との食い違い（解消済み）を未解消として記載 |
| MP-3-26 | M | cfo | 00_decision/03-decision-items.md §4.5 | G5 独立保証の予算に CFO が承認する手続がない |
| MP-3-27 | M | cfo | 00_decision/03-decision-items.md §4.10 | DEC-10 の決議文案に予算到達時の扱い・流用権限・定期報告がない |
| MP-3-28 | M | cfo | 00_decision/06-gate-plan-and-plan-b.md §3.5 | 費用を理由とする G3 の方針転換基準（PB-T9 案）がない |
| MP-3-29 | M | cfo | 00_decision/07-organization-and-tco.md | 単価 NA-001-2 の確定（G3）が依存する承認（G0）より後（MP-1-36・MP-2-34 と同旨） |
| MP-3-30 | M | cfo | 00_decision/06-gate-plan-and-plan-b.md §5.2 | 中止時の累計支出・回収不能額の一覧がない（MP-2-33 と同旨） |
| MP-3-31 | M | cfo | 00_decision/07-organization-and-tco.md §3.4 | 採用計画に人数推移・調達手段・離職率・中間判定がない |
| MP-3-32 | L | cfo | 00_decision/00-cover.md | change-log を「未作成」と記載（MP-3-13 と同旨） |
| MP-3-33 | L | cfo | 00_decision/07-organization-and-tco.md | DCS-06 を版 0.2 で参照し、金額が古い |

#### ラウンド 4（Medium 28、Low 3）

要旨は各指摘の本文の冒頭を、作成者が短く写した [D][^6]。

| ID | 重 | 指摘者 | 対象 | 要旨 |
|---|---|---|---|---|
| MP-4-01 | M | cto | 00_decision/03-decision-items.md | DCS-06 §6.7 と申し送り H-4 は、PB-T3（managed 候補も M1〜M8 を満たさない）で発動した場合の既定経路を §6.2 の構成ではなく §6.7 (i) とし、決議文案に書き分けることを求めて… |
| MP-4-02 | M | cto | 00_decision/01-executive-summary.md | 1 枚で判断するための要約（約 96KB）に、申し送り節とレビュー記録節が 2 系統ずつ残っている（MP-2-04、MP-3-02、MP-3-16 と同旨） |
| MP-4-03 | M | ciso | 00_decision/00-cover.md | 表紙の状態表示が作業ツリーと一致しない |
| MP-4-04 | M | ciso | 00_decision/05-residual-risk-register.md | 系統1のTC-002 v2は、わざと全域permitにした誤りモデル（K2）で、OpenFGA 10,004回中275件、Cedar 10,003回中90件の越境allowを記録し、中止基準に当たった |
| MP-4-05 | M | ciso | 00_decision/03-decision-items.md | 独立保証の独立性の確認が自己確認になる構造である |
| MP-4-06 | M | ciso | 00_decision/03-decision-items.md | ラウンド3のCISO条件（S-18 大規模アカウント乗っ取り、S-14 AI エージェント濫用の許容度欠落をDEC-1で開示する |
| MP-4-07 | M | ciso | 03_threat-model/fraud-abuse-controls.md | 不正対策の文書（THR-04）は版0.1（2026-10-03）から改訂されていない |
| MP-4-08 | M | sre | 04_architecture/pep-contract.md, 11_contracts/mock-contract-test-kit.m | TC-010 の OpenFGA の正式実行（W1）で、D(t) を超える接続遅延の下で PEP が応答を待ち、write 以上を 12 件許可した |
| MP-4-09 | M | sre | 00_decision/00-cover.md, 00_decision/01-executive-summary.md | 状態表示が作業ツリーと一致していない |
| MP-4-10 | M | sre | 04_architecture/capacity-model.md, 07_slo/numeric-contracts.md | ラウンド 3 の SRE 指摘 MP-3-07・MP-3-08 が未処理のまま残っている |
| MP-4-11 | M | legal | 00_decision/06-gate-plan-and-plan-b.md, 05_adr/ADR-001-build-buy-ident | DEC-9 で事前承認する Plan B（managed IdP）について、法務上の残余リスクが開示されていない |
| MP-4-12 | M | legal | 00_decision/00-cover.md, traceability/open-items.md | 状態表示が古いままである（ラウンド 3 の重点確認項目） |
| MP-4-13 | L | legal | 08_operations/operating-model.md, 06_controls/applicability.md | 規約では、根拠に使えるのは research で作成者以外が照合済みの原典に限られる |
| MP-4-14 | M | audit | 00_decision/01-executive-summary.md | 申し送りの追跡IDが壊れており、状態表示も古い |
| MP-4-15 | M | audit | CONVENTIONS.md, traceability/deliverables.md | ID 体系の正本が『DEC-1〜DEC-9』のままで、次回決裁で承認を求める DEC-10 と、将来の決裁単位 DEC-11（仮）が登録されていない（DCS-00 §8 の4、DCS-01 OI-P01 案が未反映） |
| MP-4-16 | M | audit | 00_decision/01-executive-summary.md, 12_poc/preregistered-test-plan.md | 主張タグ [M] の使い方が CONVENTIONS §3 の定義（自前の測定は TC-ID と生データの所在を記す）から外れている |
| MP-4-17 | M | redteam | 12_poc/preregistered-test-plan.md / traceability/traceability-matrix.m | PEP coverage を検証する TC が要求に結び付いていない |
| MP-4-18 | M | redteam | 00_decision/00-cover.md / 00_decision/03-decision-items.md | 状態表示の陳腐化が続いている（ラウンド 3 の MP-3-13・3-15・3-25・3-32 と同旨で、未是正） |
| MP-4-19 | M | redteam | traceability/open-items.md / 00_decision/01-executive-summary.md | POA&M の ID が衝突しており、申し送りも起票されていない |
| MP-4-20 | M | redteam | 03_threat-model/attacker-model.md / 03_threat-model/threat-catalog.md | T-087 の二重割当が源文書に残っている |
| MP-4-21 | M | redteam | 11_contracts/client-registration.openapi.yaml | 本番の client 登録で、所有テナント側の承認がない |
| MP-4-22 | L | redteam | 05_adr/ADR-017-non-human-ai-agent-identity.md / 03_threat-model/attack | AI エージェントのデータ流出経路の一つが扱われていない |
| MP-4-23 | M | devlead | 11_contracts/relationship-model-registry.openapi.yaml | INT-03 v0.5 §4.4（N-22〜N-25）は、保持者集合のpermission（例 editors）と動詞のpermissionに分けて書くよう求めている |
| MP-4-24 | M | devlead | traceability/open-items.md | KD-INT00-1（暫定疑義窓口）と K11-3（共有 sandbox）の決定が DEC-8（G2 の後）にまとめられ、DEC-8 前の 0.x 契約での実装中の疑義の受け先が決まらない |
| MP-4-25 | M | devlead | 10_integration/README.md, 10_integration/integration-patterns.md | ライフサイクル事象の受信は『条件付きで着手可』と書かれている |
| MP-4-26 | M | devlead | 10_integration/README.md, 10_integration/authz-modeling-guide.md, 11_c | 状態表示が作業ツリーと合っていない（群 a。MP-3-21・22・23 の残り） |
| MP-4-27 | M | devlead | 10_integration/onboarding.md | オンボーディング各段のリードタイムは全段TBDで、計画用の仮置き値もない（MP-1-29から未処理） |
| MP-4-28 | L | devlead | 11_contracts/client-registration.openapi.yaml | P-03（サービス間の同期呼出し）は約300のマイクロサービスで最も多いパターンである |
| MP-4-29 | M | cfo | 00_decision/06-gate-plan-and-plan-b.md | 中止基準と発動条件（G0 範囲縮小、PB-T2〜T5、PB-T8）はあるが、各ゲートで中止した時点の累計支出、回収不能額（sunk）、残存資産、Plan B の切替え費用の一覧がない |
| MP-4-30 | M | cfo | 00_decision/03-decision-items.md | 決議文案4が扱うのは期間上限への到達だけで、予算上限への到達、G0〜G2 と G3 の間での流用の可否と権限、CFO への定期報告（頻度、消化率）が決議文案にない（MP-3-27 と同じ趣旨） |
| MP-4-31 | M | cfo | 00_decision/07-organization-and-tco.md | 要員確保の計画が、OPS-02 §5.1 の時期の要約にとどまっている |

#### ラウンド 5（Medium 22、Low 9）

| ID | 重 | 指摘者 | 対象 | 要旨 |
|---|---|---|---|---|
| MP-5-01 | M | cto | 00_decision/00-cover.md | 表紙は「03:27Z の確認では traceability/open-items.md に OI-C18 の行はまだない」としている |
| MP-5-02 | M | cto | 00_decision/03-decision-items.md | §4.4 は要約の件数を「21件（判定済み9件）」と引いているが、DCS-01 §10.1 の現行の写しは 03:22Z 時点で47件（凍結実行は 03:28Z までに49件）である |
| MP-5-03 | M | cto | 00_decision/06-gate-plan-and-plan-b.md | 多ベンダー（20〜30組織）が依存する契約試験キット（DL-120）・共有 sandbox・BFF 参照実装・第1言語の SDK は、G0〜G3 の間、常勤でない配置換えまたは期間を限った委託で作られる |
| MP-5-04 | L | cto | 00_decision/06-gate-plan-and-plan-b.md | G3 の予算の所有者が「CTO＋CFO」になっており、DEC-10 の承認者（CFO＋CTO＋CISO、DCS-03 §4.10）と一致しない |
| MP-5-05 | M | ciso | 03_threat-model/attacker-model.md | ラウンド 3 で CISO が条件とした「T-087・RRG-069 の ID 衝突の解消」が、ATK 定義の正本である攻撃者モデルで未是正である |
| MP-5-06 | M | ciso | 00_decision/06-gate-plan-and-plan-b.md | DEC-5 は、ラウンド 4 の cfo 是正で 2 段に分けられた |
| MP-5-07 | M | sre | 04_architecture/capacity-model.md | KMS の枠の申請値に、副リージョンの DR 鍵の分が含まれていない |
| MP-5-08 | M | sre | 07_slo/numeric-contracts.md | 災害規模の事象を error budget でどう数えるかが定義されていない |
| MP-5-09 | M | sre | 00_decision/00-cover.md, 00_decision/01-executive-summary.md | 開示したゲート統制からの逸脱 GD-01（DEC-4 第 1 段の決裁前の凍結実行）が、締切 03:28Z の後も続いている |
| MP-5-10 | L | sre | 07_slo/numeric-contracts.md | SLI-067（リージョン切替時間）の検証 TC 欄が「TC 未採番」のままである |
| MP-5-11 | M | legal | 00_decision/05-residual-risk-register.md | S-16（規制当局・顧客への報告期限の超過）の写像先は RRG-052（記録の喪失）だけです |
| MP-5-12 | M | legal | 00_decision/05-residual-risk-register.md | ラウンド 4 の申し送り DCS-03 R4-1・R4-3（DCS-01 §11 の 25）が未適用です |
| MP-5-13 | M | legal | 06_controls/applicability.md | ラウンド 4 の申し送り（DCS-03 R4L-1・R4-2、REQ-04 申し送り 2）が CTL-02 に未反映です |
| MP-5-14 | L | legal | 00_decision/00-cover.md | 状態表示が陳腐化しています |
| MP-5-15 | M | audit | 00_decision/00-cover.md | 付属 H は DCS-01 §10.1 の 03:22Z の写しを「合格または全基準 true 24」と書いている |
| MP-5-16 | M | audit | 00_decision/00-cover.md, 00_decision/01-executive-summary.md, 00_decis | POC-01 版 0.3 と TRC-04 版 0.3 で、承認条件 4 の 5 行（R-058・059・061・062・269）が TC-121 に割り当てられ、区分 C の未割当は 41 行から 36 行になった |
| MP-5-17 | L | audit | 00_decision/00-cover.md, 00_decision/01-executive-summary.md, traceabi | 提出時の注記は「最終ラウンド（ラウンド 3）」の判定（承認可 6、差戻し 2）だけを記している |
| MP-5-18 | L | audit | 00_decision/06-gate-plan-and-plan-b.md | レビュー記録のラウンド 2 とラウンド 4 の見出しが「Phase 5 模擬パネル」になっている |
| MP-5-19 | M | redteam | 04_architecture/authorization-model.md, 12_poc/code/CHANGES-tenant-iso | 攻撃経路: group 入れ子の循環・深さ超過による共有 PDP の資源枯渇（noisy neighbor） |
| MP-5-20 | M | devlead | 11_contracts/client-registration.openapi.yaml, 10_integration/onboardi | 約 300 サービスの多くは、内部 workload（C7）として token exchange を使う |
| MP-5-21 | M | devlead | 10_integration/README.md | (1) §1.2 の版が古い |
| MP-5-22 | M | devlead | 10_integration/authz-modeling-guide.md, 11_contracts/README.md, 00_dec | 契約・仕様の版の表示が古い |
| MP-5-23 | M | devlead | 10_integration/onboarding.md | 「キット本体（DL-82）の配布は G3 の予定」「キット配布（DL-82、G3）」「M-c の依存: DL-82」が残る |
| MP-5-24 | M | devlead | 10_integration/onboarding.md | OB-1〜OB-7 のリードタイムは、すべて TBD である（決めるのは G4 のパイロット実測の後） |
| MP-5-25 | L | devlead | 10_integration/README.md, 10_integration/developer-faq.md | INT-00 §7.1 は client 登録について「x-mock は定義済みで起動は未確認」と書く |
| MP-5-26 | L | devlead | 11_contracts/mock-contract-test-kit.md | DL-120 は deliverables.md 版 0.3 で登録済みである |
| MP-5-27 | L | devlead | 11_contracts/README.md | CON-05（token exchange）は 2 operation とも 400 しか返さず、理由は「form の必須欄（grant_type 等）の欠落」とされた |
| MP-5-28 | M | cfo | 00_decision/06-gate-plan-and-plan-b.md, 00_decision/03-decision-items. | 日程モデルが自己矛盾している |
| MP-5-29 | M | cfo | 00_decision/00-cover.md, 00_decision/03-decision-items.md, 00_decision | 状態表示の陳腐化が残っている（群a・群b） |
| MP-5-30 | M | cfo | 00_decision/07-organization-and-tco.md | 要員確保の計画が時期と確約の形の表しかなく、CFO が採用リスクを評価する材料が足りない |
| MP-5-31 | L | cfo | 00_decision/03-decision-items.md | 第1段（G0）の決議文案2で「要員は〔氏名・稼働率〕とする」と氏名の確約を求めているが、G4 入場は G0 の6〜15か月後であり、氏名の確約は時期として早すぎる（MP-3-03 と同じ点で未是正） |

注: MP-5-17（audit、Low）は、本書版 0.2 の契機となったラウンド 5 redteam の High（末尾「レビュー記録」）と同じ趣旨である [D][^6]。

#### ラウンド 6（Medium 17、Low 8）

| ID | 重 | 指摘者 | 対象 | 要旨 |
|---|---|---|---|---|
| MP-6-01 | M | cto | 00_decision/03-decision-items.md | DEC-8 第 1 段の前提条件に、CON-15（照会 API、LC-OI-3）と ADR-007 族 9（LC-OI-8）の完成がない。DCS-05 の RRG-073 の失効条件と合わない |
| MP-6-02 | M | cto | 00_decision/01-executive-summary.md | 要約 §1 は POA&M を 127 行とするが、正本 TRC-11 版 0.7 は 182 行。TRC-11 §0 の「残る 174 行」も誤り（正しくは 181 行） |
| MP-6-03 | M | cto | 00_decision/01-executive-summary.md | 「1 枚で判断するための要約」が約 194KB・596 行に膨らみ、決裁者が 1 回の会議で読める分量ではない |
| MP-6-04 | M | ciso | traceability/open-items.md | DCS-05 §12.1 の 43 の 5 件と、RRG-032-1 の E_max・P_ka・N_ka・RA-0074 が POA&M に未起票（E_max・RRG-032-1・RRG-073・RR17-08・RR3-09 の出現 0 件） |
| MP-6-05 | M | sre | traceability/open-items.md | RRG-032-1 に伴う後続作業（DCS-05 申し送り 39。GOV-02 §3.4.3 の論点追加は期限 G0）が POA&M に未起票 |
| MP-6-06 | L | sre | 00_decision/03-decision-items.md | DEC-8 第 1 段の前提条件に RRG-073 の失効条件（CON-15・ADR-007 族 9）がない（MP-6-01 と同旨） |
| MP-6-07 | M | legal | 02_requirements/identity-lifecycle.md, 11_contracts/lifecycle-events.asyncapi.yaml | 削除期限 T_user_del・猶予 G_del の決め方に、権利行使の回答期限（GDPR 12 条 3 項）という法定の上限がない |
| MP-6-08 | M | legal | 06_controls/applicability.md, 08_operations/compromise-runbooks.md | ベンダーから当社への通知時計 T_V（VC-13）が CTL-02 §3.7 と OPS-01 §2.8 に未反映（INT-05 §11 の申し送り） |
| MP-6-09 | M | legal | 00_decision/05-residual-risk-register.md | S-16（報告期限の超過）の写像先が RRG-052 だけ（MP-3-11・MP-5-11 から未是正）。未成年者の 1 行の開示も未反映 |
| MP-6-10 | L | legal | 06_controls/applicability.md | EU GDPR 34 条の内容を UK GDPR から推定して [N] で記載しており、原典で確認していない |
| MP-6-11 | L | legal | 06_controls/applicability.md | §1.3 の NA-9 の行と依存前提の列挙に A-064 が併記されていない |
| MP-6-12 | M | audit | 00_decision/00-cover.md | 表紙の本文 3 か所が、DCS-06 版 0.3 を現行として引いている（正本は版 0.4） |
| MP-6-13 | M | audit | 00_decision/01-executive-summary.md | 申し送り節とレビュー記録節が 2 組ずつあり、番号体系も分かれている（群 b） |
| MP-6-14 | L | audit | 00_decision/01-executive-summary.md | §10.1.2 の TC-017（#50）を「実行中（新規）」としたまま、その後の状態（終了記録なし）を追記していない |
| MP-6-15 | L | audit | 00_decision/03-decision-items.md | 表題と要旨が「DEC-1〜DEC-10」「10 件」のままで、本文の DEC-11（仮）の定義と食い違う |
| MP-6-16 | M | redteam | 03_threat-model/threat-catalog.md | 登録済み redirect URI のドメイン失効・dangling DNS による乗っ取りが、どの T・RRG にもない |
| MP-6-17 | M | redteam | 05_adr/ADR-008-control-plane-cicd-protection.md | 消費側（ベンダーの約 300 サービス）のビルドで、PEP SDK の依存取違え・typosquat を検証する統制がない |
| MP-6-18 | L | redteam | 03_threat-model/threat-catalog.md | 時刻源（EE-12）の改ざん・誤設定による脅威が未起票 |
| MP-6-19 | M | devlead | 10_integration/onboarding.md | DL-82 と DL-120 の取違えが残り（MP-5-23）、リードタイムに計画用の仮置き値がない |
| MP-6-20 | M | devlead | 11_contracts/token-exchange.openapi.yaml | CON-05 の 2 operation に 429・503 と Retry-After の定義がない |
| MP-6-21 | L | devlead | 11_contracts/README.md | 「モック（CON-11）がまだない」は不正確（仕様は CON-11 §4.11 にあり、未了なのは実装 DL-120） |
| MP-6-22 | M | cfo | 00_decision/06-gate-plan-and-plan-b.md | G0〜G2 の期間上限（6〜12 か月）と、その内側に置いた CP-5・CP-7 の経路が両立しない |
| MP-6-23 | M | cfo | 00_decision/06-gate-plan-and-plan-b.md | §5.2 の所有者列（G3・G5 行）が DCS-03 の承認者と一致しない（MP-5-04 未是正） |
| MP-6-24 | M | cfo | 00_decision/00-cover.md, 01-executive-summary.md, 03-decision-items.md | 区分 C の未割当を 41 行としたまま（TRC-04 では 36 行。MP-5-16 未是正）。DCS-06 版 0.3 の参照も残る |
| MP-6-25 | L | cfo | 00_decision/03-decision-items.md | DEC-4 第 1 段の決議文案 2 が氏名の確約を求めている（MP-3-03・MP-5-31 と同じ点で未是正） |

#### ラウンド 7（Medium 24、Low 6）

| ID | 重 | 指摘者 | 対象 | 要旨 |
|---|---|---|---|---|
| MP-7-01 | M | cto | traceability/mock-panel-report.md, 00_decision/00-cover.md, 01-executive-summary.md | 本書が版 0.2（ラウンド 5 まで）のままで、表紙と要約もラウンド 5 を最新としている（本書は版 0.3 で対応。表紙・要約は未適用） |
| MP-7-02 | M | cto | traceability/consistency-checks.md, .workflows/checks/run_checks.py | 値の伝播検査 VC-9〜11 が仕様登録だけで未実装。「未作成」表示・DEC の決裁内容の項目・ゲート順序の語も対象外 |
| MP-7-03 | M | cto | 00_decision/00-cover.md, 01-executive-summary.md | 表紙の「最終更新」欄と §4 の版の行が数千字の是正履歴になり、要約も 619 行あり、決裁の要点が作業記録に埋もれる |
| MP-7-04 | M | ciso | 00_decision/05-residual-risk-register.md | ADR-017 RR17-08（共有エージェント実行環境での資格情報流用）が台帳（版 0.8・76 件）に未写像で、T-094 も未起票 |
| MP-7-05 | M | ciso | 12_poc/measurement-report.md | POC-02 は立会人なしの系統 1 の値に [M] を付けており、表紙・要約・ARC-08 の [D] の扱いと食い違う（MR-1） |
| MP-7-06 | M | sre | traceability/mock-panel-report.md, 00_decision/00-cover.md, 01-executive-summary.md | 本書がラウンド 5 で止まり、表紙の中でも記述が矛盾している（MP-7-01 と同旨） |
| MP-7-07 | M | sre | 04_architecture/capacity-model.md, 07_slo/numeric-contracts.md, traceability/open-items.md | SRE の Medium（MP-3-07・3-08・5-07・5-08）が 3 ラウンド未処理で、POA&M にも群 d として未起票 |
| MP-7-08 | M | sre | 12_poc/measurement-report.md, CONVENTIONS.md, 04_architecture/fail-mode-matrix.md | 同じ数値（TC-010 の write の誤 allow 12 件など）が、文書によって [M] と [D] で引かれている（MP-7-05 と同旨） |
| MP-7-09 | L | sre | 04_architecture/cell-blast-radius.md | cell 数の上限条件に A-054 の SRE 6 名を使っており、DCS-07 の下限（単一拠点で 8 名以上）と食い違う |
| MP-7-10 | M | legal | traceability/open-items.md, 06_controls/applicability.md, 02_requirements/customer-admin-responsibility.md | ラウンド 6 法務の申し送り H6L-1〜4（再処理者の変更通知、GDPR 28 条 2 項・4 項）が宛先の文書にも POA&M にもない |
| MP-7-11 | M | legal | 00_decision/00-cover.md, 01-executive-summary.md | 表紙・要約の DEC-9 行に、PB-L・再処理者の変更通知・段 2 の受容（決議文案 7）がない |
| MP-7-12 | M | legal | 00_decision/05-residual-risk-register.md | S-16 の写像先が RRG-052 だけ（MP-3-11・5-11・6-09 と同旨。4 回目） |
| MP-7-13 | M | legal | traceability/mock-panel-report.md, 00_decision/00-cover.md, 01-executive-summary.md | 本書がラウンド 6 を記録していない（MP-7-01 と同旨） |
| MP-7-14 | L | legal | 00_decision/04-program-charter.md | DEC-2 決議文案 1 は未成年者の扱いを L-14 に従わせるが、承認対象の DCS-04 に記載がない（R4-3 未適用） |
| MP-7-15 | M | audit | 10_integration/authz-modeling-guide.md ほか | [M] タグの意味が 3 通りに分かれる（TC 未採番・生データなしの確認、作成者の再実行、生データの所在を示す値） |
| MP-7-16 | M | redteam | 11_contracts/schemas/lifecycle-event.schema.json | CON-13 の Envelope に lcsig と withdrawn 系の type がなく、署名のない事象がスキーマ適合と判定される |
| MP-7-17 | M | redteam | traceability/mock-panel-report.md | 状態表示の陳腐化（MP-7-01 と同旨） |
| MP-7-18 | L | redteam | traceability/traceability-matrix.md | §4.3 の G-082・G-105 行の TC 欄が「—」のままで、正引きと逆引きが一致しない |
| MP-7-19 | M | devlead | 10_integration/onboarding.md | 版 0.1 のまま。DL-82 の誤記とリードタイムの全 TBD が 4 ラウンド連続で残る |
| MP-7-20 | M | devlead | traceability/open-items.md | OI-R46・OI-R47 が CON-14 版 0.2.0（§4A）の追加を反映しておらず、残作業が追跡されていない |
| MP-7-21 | M | devlead | 11_contracts/README.md | CON-11・CON-14 の版とハッシュが古く、§3 に §4A（workload・組の登録）の行がない（MP-5-22 未是正） |
| MP-7-22 | M | devlead | 10_integration/README.md | KD-INT00-1 が DEC-10 の費目化を反映しておらず、どの決定で窓口が開くのか読めない |
| MP-7-23 | M | devlead | 00_decision/01-executive-summary.md, traceability/mock-panel-report.md | 要約 §0 の注記がラウンド 5 のままで、自ら置いた更新条件を満たしていない（MP-7-01 と同旨） |
| MP-7-24 | M | devlead | traceability/open-items.md | INT-00 申し送り S-2（PoC の SDK・STS・TTS の差し替え点）が POA&M に未起票 |
| MP-7-25 | M | devlead | 11_contracts/token-exchange.openapi.yaml | CON-05 に 429 と Retry-After の定義がない（MP-6-20 未是正） |
| MP-7-26 | L | devlead | 10_integration/README.md | CON-14 v0.2.0（12 operation）での Prism の再実行記録がない |
| MP-7-27 | M | cfo | 00_decision/03-decision-items.md ほか、traceability/consistency-checks.md | 金額の正本を DCS-06 版 0.4 として引いている（現行は 0.5）。VC-9b の DCS-05 の版・件数も古い |
| MP-7-28 | M | cfo | traceability/mock-panel-report.md, 00_decision/00-cover.md, 01-executive-summary.md | 本書がラウンド 6・7 を記録していない（MP-7-01 と同旨） |
| MP-7-29 | L | cfo | 00_decision/06-gate-plan-and-plan-b.md, 07-organization-and-tco.md | G3 の契約管理行が G4 の期間分を DEC-4 と二重に計上し得る |
| MP-7-30 | L | cfo | CONVENTIONS.md, traceability/deliverables.md | DEC 番号の範囲が「DEC-1〜DEC-9」のまま（ラウンド 2 以来の申し送り C-7・TR-17・R3S-6 が未適用） |

注: ラウンド 6・7 の一覧は、報告段に渡された集計データ（medLow）の順（指摘者ごと）に付番した。要旨は作成者が短くしたもので、原文と修正案は集計データにある [D][^9]。MP-7-01・06・13・17・23・28 は本書の陳腐化に関する同旨の指摘で、本書の分は版 0.3・0.4 で対応した [D]。

### 4.3 集計

| 指摘者 | R1 | R2 | R3 | R4 | R5 | 計（R1〜R5、§4.2 に一覧） | R6 | R7 | 計（R1〜R7） |
|---|---|---|---|---|---|---|---|---|---|
| cto | 4 | 4 | 4 | 2 | 4 | 18 | 3 | 3 | 24 |
| ciso | 4 | 5 | 2 | 5 | 2 | 18 | 1 | 2 | 21 |
| sre | 6 | 5 | 3 | 3 | 4 | 21 | 2 | 4 | 27 |
| legal | 4 | 4 | 3 | 3 | 4 | 18 | 5 | 5 | 28 |
| audit | 5 | 6 | 5 | 3 | 4 | 23 | 4 | 1 | 28 |
| redteam | 3 | 3 | 1 | 6 | 1 | 14 | 3 | 3 | 20 |
| devlead | 5 | 3 | 6 | 6 | 8 | 28 | 3 | 8 | 39 |
| cfo | 8 | 4 | 9 | 3 | 4 | 28 | 4 | 4 | 36 |
| 計 | 39 | 34 | 33 | 31 | 31 | 168 | 25 | 30 | 223 |

注: R6・R7 の列は 2026-10-15T04:45Z 時点の各パネリストの構造化出力から数え、版 0.4 で報告段の集計データと照合して一致を確かめた。個別の指摘は §4.2 に収録した [D][^8][^9]。

### 4.4 繰り返し出た指摘の群

Medium/Low が是正ループに入らなかったため、同じ趣旨の指摘がラウンドをまたいで残った [D][^2]。版 0.4 でラウンド 6・7 の MP-ID を各群に割り当て、群 h・i を新設した。どの群にも入らない単発の指摘（MP-6-07・6-10・6-11・6-16・6-17・6-18・7-04・7-11・7-16 など）は §4.2 の個別の行で追う [D]。POA&M には群ごとに 1 行で起票することを推奨する [D]。

| 群 | 趣旨 | 該当 ID | 優先度の目安 |
|---|---|---|---|
| a | 決裁パッケージの状態表示が作業ツリーと不一致（change-log、DL-39〜44、CON-12/13、client 登録、件数、版） | MP-1-02, 1-19, 1-20, 1-27, 1-38, 2-03, 2-09, 2-14, 2-19, 2-20, 2-27, 3-01, 3-13, 3-14, 3-17, 3-21, 3-22, 3-23, 3-32, 3-33, 4-03, 4-09, 4-12, 4-18, 4-26, 5-01, 5-14, 5-15, 5-16, 5-17, 5-21, 5-22, 5-29, 6-02, 6-12, 6-15, 6-24, 7-01, 7-02, 7-06, 7-13, 7-17, 7-18, 7-20, 7-21, 7-23, 7-27, 7-28, 7-30 | 次回決裁の起案前（決裁者の判断材料の信頼性に直結） |
| b | 要約（DCS-01）の構成崩れ（節の重複、申し送り番号の重複） | MP-2-04, 2-24, 3-02, 3-16, 4-02, 4-14, 6-03, 6-13, 7-03 | 次回決裁の起案前 |
| c | PoC 系統 1 の実行データの開示 | MP-2-21, 3-04, 4-04, 4-08, 4-16, 5-09, 6-14（ラウンド 3〜5 の内部監査・sre の High、ラウンド 7 の POC-02 未反映の High と関連） | 次回決裁の起案前 |
| d | 認可遅延・可用性の合成式と予算 | MP-1-09, 1-12, 2-12, 4-10, 5-07, 5-08, 5-10, 7-07, 7-09（ラウンド 3 SRE 判定理由にも再掲） | G3 前 |
| e | 費用の枠（Plan B、中止時の累計、単価仮定の登録、要員確保の計画） | MP-1-33, 1-36, 2-33, 2-34, 3-29, 3-30, 3-31, 4-29, 4-30, 4-31, 5-28, 5-30, 5-31, 6-22, 6-23, 6-25, 7-29 | 次回決裁の起案前（DEC-10 の上限に影響） |
| f | 汎用モック・PoC コードの利用範囲 | MP-1-30, 1-31, 2-30, 3-19, 3-20, 4-24, 4-25, 5-23, 5-25, 5-26, 5-27, 6-19, 6-20, 6-21, 7-19, 7-22, 7-25, 7-26 | DEC-8 前 |
| g | 申し送り・是正の POA&M 未起票 | MP-2-16, 2-25, 3-12, 3-14, 3-18, 4-15, 4-19, 5-12, 5-13, 6-01, 6-04, 6-05, 6-06, 6-08, 7-10, 7-24 | 次回決裁の起案前（G-130） |
| h | 証跡タグ [M] の区分（立会人なしの自己実行・作成者の再実行と、合否に使える実測の区別） | MP-7-05, 7-08, 7-15（ラウンド 5 の sre High、POC-02 の MR-1 と関連） | DEC-4 第 1 段の付議前 |
| i | 法務の残余リスクの台帳・承認対象文書への写像（S-16 の写像先、未成年者・児童） | MP-3-11, 5-11, 5-12, 6-09, 7-12, 7-14 | 次回決裁の起案前（DEC-1・DEC-2 の承認対象） |

## 5. 各パネリストの判定理由の要約

### 5.1 最新の判定済みラウンド（ラウンド 7）

| パネリスト | 判定 | 理由の要約 | 本人が挙げた条件・閉じ方 |
|---|---|---|---|
| CTO | 差戻し | POC-02 の不利な結果（TC-021・TC-014・F-5）が決裁文書と台帳に入っていない。ラウンド 6 のゲート順序の一本化（G4 入場→G4 判定→G3 判定→G5）が表紙 §3・要約 §3・DCS-03 §2.1 の DEC-11（仮）行に未伝播。DEC-10 の決裁内容 (8)・(9) が表紙・要約にない。原因は検査 9〜11 が仕様だけで未実装であること | 3 点を 1 回の整合改版で直し、検査を実装する |
| CISO | 差戻し | POC-02 の TC-021・F-5・TC-014 が THR-03・DCS-05・POA&M・要約にない。ラウンド 5 の CISO 条件のうち RB-13 の期限と THR-02 の仮番の衝突が未是正。DP41-3・DP41-5 の DEC 未割当。本書と表紙・要約の状態表示がラウンド 5 のまま | 文書の修正で閉じられるが、DEC-1 と DEC-4 第 1 段の判断材料に直結するため、それまでは条件付き承認もできない |
| 超大規模 SRE | 差戻し | 表紙・要約・POA&M・DL-81 が POC-02 を「未作成」としたまま。TC-014（Azure AD 2021 型の全域障害に当たる）に可用性 runbook・検証失敗率の SLI・FM-08 の検知基準の受け皿がない | 1 回の整合改版で閉じられる |
| プライバシー・法務 | 承認可（条件付き） | 本人通知、L-04・NA-3 の決める人、Plan B の処理者連鎖、未成年者はラウンド 5・6 の指摘どおり是正済み。H6L-1〜5 の POA&M・DCS-05 等への未反映、表紙・要約の DEC-9 行に PB-L がない、S-16 の写像先、状態表示が残る | 次回決裁（G0）の起案前に 1 回の改版で閉じる |
| 内部監査 | 差戻し | DEC-4・DEC-10・DEC-11（仮）・TCO・Plan B・契約は一致。POC-02 の未反映、TC-010 の件数の過小表示（正式 54 件に対し 18 件で表示）、RRG-074 の POA&M 未起票、本書がラウンド 5 で止まっていること | 決裁者の読む面で正すまでは決裁可と判定しない |
| レッドチーム | 承認可（条件付き） | 8 経路は概ね文書化。本番 client 登録の所有テナント同意、T-094 の連鎖、T-092・T-093 の runbook、CON-13 の lcsig が穴。ラウンド 6 の判定が未開示で状態表示が再び陳腐化 | 付議前に是正（少なくとも開示）。T-094 の連鎖が閉じないまま DEC-1 で台帳を採用するなら差戻し相当 |
| 連携サービス開発リーダー | 承認可（条件付き） | 連携の観点では単体で条件付き承認の水準。ラウンド 6 の CON-14 §4A（workload 登録）が入口文書・キット仕様・POA&M に伝わっていない | High 2 件を起案前に是正し、作成者以外が CON-00 §2.1 と INT-00 §1.2 の版の列を照合する |
| CFO/PMO | 承認可（条件付き） | DEC-10 の金額は全文書で一致し、積上げも再計算で合う。DEC-11（仮）の範囲の「G4・G5 を含む」の残存、要約に DEC-10 の要員確約・K33-2・K33-6・DEC-9 の移行予算がない、POC-02 の未反映 | 金額の誤りではなく 1 回の改版で閉じられる。ただし未是正のまま実在の決裁者に提出することは認めない |

注: 出典はラウンド 7 の各パネリストの構造化出力（2026-10-15T04:38Z〜04:43Z 実行）[D][^8]。ラウンド 7 の是正 25 件はワークフローの集計で処理済みと記録されたが（fixed=25）、上表の条件が満たされたかはパネルの再審査を経ていない [D][^9]。続行ワークフローはラウンド 7 で終わるため、同ワークフローの中で再審査は行われない [D][^5][^8]。

### 5.2 ラウンド 6

| パネリスト | 判定 | 理由の要約 | 本人が挙げた条件・閉じ方 |
|---|---|---|---|
| CTO | 差戻し（Critical 1） | DEC-1 で採用する残余リスク台帳が正本（DCS-05 版 0.7・75 件）より古い（版 0.5・73 件）。DCS-03 版 0.8 で加わった K33-6・K33-2・K33-1・DP-OM 群・DEC-9 決議文案 6 が表紙・要約にない。値の伝播を確かめる機械検査が 1 件もない | 文書の修正で閉じられる（Critical 1・High 2） |
| CISO | 差戻し（Critical 1） | DEC-1 決議文案 1（GOV-02 B 標準）・9（版 0.5・73 件）が DCS-05 の DP41-7（誤 allow は 0 件ではない旨の G0 開示）と矛盾。ADR-017 RR17-08 の受容者が GOV-02 U1・GOV-07 RV-1 に反する。RR3-09 の未写像。RRG-073 の失効条件が DEC-8・DEC-3 にない | 文書の修正だけで閉じられる。GD-01 の停止記録を OI-C19 に残すことを強く求める |
| 超大規模 SRE | 差戻し | 同じ型の伝播漏れが残余リスク台帳で再発（FM-13 の窓の誤 allow が受容経路を失う）。文字列一致の機械検査が未実装 | 1 回の改版で閉じる規模だが、決議文の対象が誤っているため決裁可能としない |
| プライバシー・法務 | 差戻し（Critical 1） | 伝播漏れの 3 回目（RRG-073 が受容の対象から外れる）。OPS-01 の本人通知の未修正、L-04・NA-3 の決める人の食い違い、Plan B の法務上の残余リスクの未開示 | 文書の修正で閉じられる |
| 内部監査 | 差戻し（Critical 1） | 台帳の伝播漏れで E_max・DP41-7・RRG-073 の失効条件が DEC-1 と決裁者の読む文書から抜ける。POA&M 未起票。機械照合が 3 ラウンド未実装。G-019・G-022 の「充足」表示が正本と矛盾 | 文書の修正で閉じられる |
| レッドチーム | 差戻し | 台帳の伝播漏れ、RRG-073 の失効条件と CON-15 の DL 未登録、RR3-09 の未写像、ラウンド 5 の試験案の POC-01・POA&M 未登録。新規の攻撃経路 2 件（redirect URI のドメイン失効、PEP SDK の依存取違え） | 机上で閉じられるが、Critical/High が 4 件あるため差戻し |
| 連携サービス開発リーダー | 差戻し | CON-15 の DL 未登録・単独ファイル化未了、P-03 の workload 登録の契約欠落、INT-00 の版・状態の陳腐化、PoC の CAM の CON-04 不適合の注意欠落、暫定疑義窓口の扱いの 3 か所の食い違い | 1 回の整合改版で直せるが、提出前に直す |
| CFO/PMO | 承認可（条件付き） | 金額・決裁単位・承認者の骨格はできた。ゲート順序（G3 と G4 の判定の先後）の 3 通りの記載と、G0〜G2 の内部工数の確保方法の未定義 | High 2 件を付議前に是正 |

注: 出典はラウンド 6 の各パネリストの構造化出力（2026-10-15T04:09Z〜04:18Z 実行）[D][^8]。ラウンド 6 の是正 34 件は、ラウンド 7 のパネルが再審査した。台帳の伝播（Critical の論点）と DEC-10 の金額は解消と判定されたが、ゲート順序と DEC-10 の追加事項の未伝播、RB-13 の期限など一部が残った（§5.1）[D][^8]。

### 5.3 ラウンド 5

| パネリスト | 判定 | 理由の要約 | 本人が挙げた、条件付き承認に移る条件 |
|---|---|---|---|
| CTO | 差戻し | ラウンド 3 の重点論点 8 点のうち 7 点は解消。DEC-10 の承認額の食い違いが再発し、表紙 §8 の 7 は照合表付きで事実と異なる整合宣言をしている。原因は並行是正の競合と正本の版管理の欠如（DCS-06 が版 0.3 のまま値を変えた）。GD-01 の是正が OI-C18 にない | 金額の伝播と整合宣言の訂正。1 回の改版で閉じられる規模 |
| CISO | 差戻し | 重点論点は解消。DEC-10 の金額が再発。DEC-1 決議文案 9 は DCS-05 版 0.4・72 件の採用を求めるが、正本は版 0.5・73 件（RRG-072、越境ゲストの付与範囲の閉じ込め）。DX 型の構成要素が POA&M に 1 行もなく、RB-13 の期限が文書間で矛盾。T-087 の ID 衝突が攻撃者モデルに残る | DEC-1 決議文案 9 の版・件数、DEC-10 の金額の伝播、DX 型の POA&M 起票と RB-13 の期限の統一、攻撃者モデルの改番 |
| 超大規模 SRE | 差戻し | 容量・失敗モード・cell・数値契約の骨格は足りる。DEC-10 の金額が再発（Critical）。FM-13 の検知前の窓の誤 allow が台帳の独立行にない。ARC-08・SLO-01 が系統 1 の自己実行を [M] で引用し、FM-01 の不合格に触れていない。G6 の入場条件に可用性・容量の関門がない | 決議文案の金額の不一致と、DEC-1 で採用する台帳の欠落の是正 |
| プライバシー・法務 | 差戻し | ラウンド 4 の法務 High 2 件は決裁文書に伝播済み。DEC-10 の金額が逆向きに再発し、表紙 §8 の 7 は誤った照合結果を載せている（Critical）。GDPR・UK GDPR 34 条の本人通知、S-16 の残余リスク行、未成年者の DCS-05・DCS-04 への反映、L-04・NA-3 の決める人の食い違いが残る | DEC-10 の金額の統一と表紙の照合記載の訂正、High と Medium の是正 |
| 内部監査 | 差戻し | DEC-7 の 34 件は R-requirements と過不足なく一致し、系統 1 の開示の質は大きく改善。DEC-10 の金額の不一致が再発（Critical）。GD-01 は開示後も続き（03:38Z に TC-017 の実行）、OI-C18 に未起票。DCS-03 §4.4 と DEC-4 決議文案 9 の件数が古い | 金額と決議文案の是正。それまでは次回決裁の範囲でも条件付き承認はできない |
| レッドチーム | 差戻し | 重点論点は解消。DEC-10 の金額が再発し、表紙は「揃った」と断定。表紙と要約の模擬パネルの注記がラウンド 3 のまま（本書版 0.2 の契機）。ライフサイクル事象の偽造・注入、共有実行環境での prompt injection、管理者 1 名のテナントの回復手続の悪用、group 入れ子の資源枯渇が台帳にない | 文書修正で閉じられる |
| 連携サービス開発リーダー | 差戻し | 連携の観点では単体で条件付き承認の水準。DEC-10 の金額が再発し、DEC-8 第 1 段の前提（G3 でのキット・sandbox）の資金が上限の外に出るおそれ。PoC の CAM と CON-04 の不適合 13 件、LC-OI-3 の照会 API 契約の欠落、内部 workload の sandbox 登録契約の欠落 | 3 ファイルの改版で閉じられるが、提出前に直す |
| CFO/PMO | 差戻し | 重点論点の大半は解消（G5 の予算は DEC-5 第 2 段で CISO＋CFO）。DEC-10 の承認額の食い違いが再発（Critical）し、キット・sandbox・暫定窓口の先行要員（約 0.3〜2.3 億円）が承認上限の外に出る。Plan B の切替え費用と中止時の累計支出の表がない。K33 の経営判断が DEC・POA&M に未接続。GD-01 が表紙にない | 1 回の改版で閉じられる |

注: 版 0.2 の時点では、ラウンド 5 の是正 28 件は進行中で再審査前であった。その後、ラウンド 6 のパネルが再審査し、差戻し 7 名・承認可（条件付き）1 名とした（§5.2）[D][^6][^8]。

### 5.4 ラウンド 4

8 名全員が差戻しとした。各役の理由と条件を下表に要約する（版 0.4 で追加）[D][^9]。

| パネリスト | 判定 | 理由の要約 | 本人が挙げた条件・閉じ方 |
|---|---|---|---|
| CTO | 差戻し | 次回決裁の範囲と DEC-3・DEC-8 の G2 後への配置、DCS-03 版 0.4 の DEC-10（計 1.2〜8.6 億円）・DEC-11（仮）は前進。表紙・要約・DCS-07 の DEC-10 が旧値、DEC-7 が 35 件（DCS-02 は 34 件）、R-269 を判定する TC がない、表紙の付属 J・change-log が「未作成」。Plan B の既定経路 ② が承認条件 4・6 を満たせない | 1 回の整合改版で閉じれば条件付き承認に移れる |
| CISO | 差戻し | ラウンド 3 の CISO 条件 4 点の是正が正本の個別文書で止まり、表紙・要約・決議文案・POA&M に届いていない。DEC-7 の件数、DEC-10 の金額、残余リスクの件数（70／71／72）、DX 型の POA&M 未起票、R-269 の TC なし、KP-1・KP-2 を決める DEC がない | 文書の改版で閉じられる |
| 超大規模 SRE | 差戻し | 容量・遅延合成・on-call の骨格は足りる。DEC-10 の金額が表紙・要約に未伝播。系統 1 の実行は 45 件に増え、TC-010 の正式実行 2 件の不合格（write 以上の誤 allow）などが未開示。FM-13 の検知窓の露出量と PEP deadline の範囲が未規定 | 1 回の改版で是正できる |
| プライバシー・法務 | 差戻し | ラウンド 3 で条件とした未成年者と運用アクセス元は下位文書で是正されたが、00_decision と POA&M に未伝播。DEC-10・DEC-7・状態表示の食い違い | 金額と件数を正本に揃え、法務 2 件を DEC-1・DEC-3 と POA&M に開示し、Plan B の法務上の残余リスクを加えれば条件付きで決裁可能 |
| 内部監査 | 差戻し | 「是正が正本にだけ入り表紙・要約に伝播しない」構造の再発。系統 1 の frozen 実行 45 件のうち不利な結果（TC-028 v2 の不合格と再凍結、TC-002・TC-022 の中止）が未開示。R-269 の割当なし、DEC-9 決議文案に Plan B の循環が残る | 文書修正で閉じられるが、署名する文書の件数・金額が正本と一致するまで決裁可と判定しない |
| レッドチーム | 差戻し | DEC-10・DEC-7・DEC-9 決議文案（PB-T3 の既定経路）の未伝播。TC-002 で誤ったモデルの下の越境 allow（OpenFGA 275 件、Cedar 90 件）が観測され、越境ゲストの閉じ込めが R 段だけに依存する経路が台帳・脅威カタログに未開示（High） | 是正すれば次回決裁の範囲で条件付き決裁は可能 |
| 連携サービス開発リーダー | 差戻し | 10_integration・11_contracts は良好で、token 検証・PEP・exchange・監査送出は今日から着手可能。契約試験キット DL-120 の未登録と G3 予算の欠落、12_poc/code の位置付けの未反映、入口文書の版・件数の陳腐化 | 机上で 1 回の改版で閉じられる |
| CFO/PMO | 差戻し（Critical 1） | DCS-03 版 0.4 で DEC-10・DEC-4 の上限式・DEC-11（仮）は整理された。しかしラウンド 3 の CFO 差戻し理由（DEC-10 の金額）が表紙・要約・DCS-07 に届いていない。DEC-11（仮）が DCS-03 にしかなく、G5 独立保証の予算に決裁単位がない | 1 つの整合改版で是正できる |

各役とも、閉じ方を「文書の修正で閉じられる。1 回の整合改版で閉じられる規模」とした [D][^6]。

### 5.5 Phase 4 の終了時点（ラウンド 3）

以下はラウンド 3 の判定であり、最新の判定ではない（最新は §5.1 のラウンド 7）[D][^6][^8]。

| パネリスト | 最終判定 | 理由の要約 | 付された条件 |
|---|---|---|---|
| CTO | 承認可（条件付き） | 次回決裁の範囲（DEC-3・DEC-8 は G2 後、DEC-4 第 2 段・DEC-6 は G4 入場前）が DCS-00・01・03・06 で一致し、DEC-10 と PB-T8 も新設された。未算出費目・要員確約・移行負債は開示済み | High 2 件の是正: DEC-10 の承認額を DCS-06 版 0.3（Gate 2 独立レビューを含む）に揃える。NR-2（issuer 等の固定）を DEC-10 で先行させることが DEC-3 後回しの理由を崩さないよう整理する |
| CISO | 承認可（条件付き） | 次回決裁は可逆な事項に限られ、不可逆決定・受容・実測・第三者評価は後のゲートに送られている。ラウンド 2 の指摘は是正済み | DX 型（敵対的破壊・恐喝）の残余リスク行を DEC-1 で採用する台帳に入れる。T-087・RRG-069 の ID 衝突を解消する。R-268 を暫定クローズ候補から外す。S-18・S-14 の許容度欠落を DEC-1 の未完成部分として開示する |
| 超大規模 SRE | 承認可（条件付き） | 容量モデル・失敗モード表・cell 分析・数値契約の骨格は PoC 入場の判断材料として足りる。主リージョン喪失の式と可用性 runbook は是正済み | G3〜G6 前に、多段 hop の遅延合成、段階導入への可用性・容量の関門（複数 cell 切替演習、K58-5、SLO 値の決裁）、shadow 負荷の容量計上、テレメトリ容量を文書化する |
| プライバシー・法務 | 承認可（条件付き） | DEC-1 の依存に署名版 CTL-02、DEC-2・3 に L-13 を前置。通知期限・保持削除・所在地・責任分界が原典付きで網羅され、未確定事項は所有者・期限付きで開示 | High 2 件（運用アクセス元の矛盾、未成年者の扱い）を次回決裁の起案時までに残課題・決裁案として開示し、DEC-3 の前置条件に加える |
| 内部監査 | 差戻し | 決裁範囲は一致し R 326 行の脱落もない。しかし要約の「実測 0 件」に対し、12_poc/data/ に系統 1 の実行記録（TC-002 中止、TC-013・016・027 は v1 不合格後に v2、立会人署名 null、git_dirty true、不合格確認後の manifest 再凍結）があり、事前登録の規則（POC-01 §2.2 F-5、§2.4）に反するおそれがあるのに開示がない | 系統 1 の実行と逸脱の開示（指摘 1・2）、表紙・要約・POA&M の件数・状態の食い違い解消。これらを満たせば次回決裁の範囲で条件付き決裁可能 |
| レッドチーム | 承認可（条件付き） | 8 つの攻撃経路は文書で扱われ残余リスクも開示されている。決裁範囲は本番化・契約凍結・不可逆 ADR を含まない | 付議前に、DX 型の台帳行の追加、workload CA・STS・TTS 侵害の runbook と演習、T-087・RRG-069 の二重割当解消。未是正のまま DEC-1 で台帳を採用するなら差戻し相当 |
| 連携サービス開発リーダー | 承認可（条件付き） | 契約 12 ファイル（draft）、27 種別のパターン割当、着手可否表がそろい、token 検証・PEP 呼出し・exchange・監査送出・ライフサイクル受信は今日から実装と単体試験に着手できる。DEC-8 は次回決裁に含まれない | INT-03 の例と CON-04 CamRelation の不整合、12_poc/code の現状の文書への反映、PoC SDK の差し替え点の規約準拠、入口文書の版・件数の更新 |
| CFO/PMO | 差戻し | DEC-10 の決議文案の金額（計 約 1.0〜7.8 億円）が正本 DCS-06 版 0.3（計 約 1.2〜8.6 億円、Gate 2 独立レビュー上限 0.8 億円を含む）と食い違い、署名すると Gate 2 の費用が承認上限の外に出る。定常 48 FTE（年 4.8〜13.2 億円）、G3 以降の SRE 人件費、G5 独立保証の予算に決裁単位がない | 決議文案の金額の訂正と、継続費用の決裁単位（どの DEC で誰が承認するか）の定義。一つの改版で是正できる規模 |

注: 版 0.1 の時点では、ラウンド 3 の Critical/High 16 件の再審査は未実施であった。その後、ラウンド 4 のパネルが再審査し、8 名全員が差戻しとした（§5.4）[D][^2][^6]。

## 6. 実在の決裁者に提出する際の注意

1. **本書の判定は決裁ではない。** 模擬パネルは同じパイプラインの AI エージェントによる自己レビューである。8 役の「承認可」「差戻し」は、実在の CTO・CISO・CFO・法務・内部監査の判断を予測も代替もしない [D][^1]。
2. **独立保証は未達である。** 報告系統の外の独立反証（DL-108 の区分 D 部分）、Gate 2・Gate 5 の独立評価、cross-tenant pentest・red team、OIDF conformance はいずれも未実施である。ラウンド 1 で指摘された「作成者以外の検証」が同じパイプラインの AI によるものであることも、決裁者に開示する必要がある [D][^3]。
3. **経営承認は未達である。** DEC-1〜DEC-10 の決議は 0 件、accepted な ADR は 0 本、受容票は 0 件、要員確約は未了である。本パッケージは決裁案・選択肢・様式までである [D][^3]。
4. **実測は未達である。** 合否判定に使える PoC の実測（立会人の下で凍結手順を満たした [M]）は 0 件である。ただし系統 1 の実行記録が 12_poc/data/ に、その整理が PoC 実測レポート（12_poc/measurement-report.md、POC-02 版 0.1）にあり、不合格・中止と手順上の逸脱（ゲート統制からの逸脱 GD-01 を含む）、TC-021（他テナントの role による昇格の成立）・TC-014（鍵の誤撤去を検知できず使用中 token の大半が拒否）・F-5（拒否した support アクセスの監査上の outcome=success）などの不利な結果を含む（§5.1）。提出前に、その実行・結果・逸脱を決裁文書・残余リスク台帳・POA&M に開示し、合否に使わない扱いと [M] の区分（§4.4 群 h）を明記すること [D][^4]。
5. **最新の判定済みラウンド（ラウンド 7）は承認可（条件付き）4 名、差戻し 4 名である。** ラウンド 6（承認可 1、差戻し 7）、ラウンド 4・5（0／8）、ラウンド 3（承認可 6、差戻し 2）の判定は最新の結果ではない。ラウンド 7 の主因は、PoC 実測レポート POC-02 の不利な結果とその存在が決裁文書・台帳・POA&M に未反映であることと、ラウンド 6 の是正の表紙・要約への未伝播である（§2.3、§5.1）。承認可の 4 名も High の是正を条件とし、cfo は未是正のままの提出を認めていない。ラウンド 7 の是正 25 件はワークフローの集計で処理済みとされたが、パネルの再審査を経ておらず、続行ワークフローの中で再審査される予定もない。判定の人数を引用するときは、確認時刻（本書冒頭）と本書の版を併記すること。提出前に、作成者以外が金額・件数・版の一致を確認すること。確認者は統括者が指名する作成者以外とし、期限は次回決裁の起案前とする（案）[D][^6]。
6. **Medium/Low 223 件（§4.2 に全件一覧）は未処理である。** とくに §4.4 の群 a・b・c・e・g・h・i は決裁者の判断材料の正確さに直結するため、次回決裁の起案前に閉じること [D]。
7. **法務署名（E2）前である。** 法域判定・規制写像は AI 起草案であり、外部の現地法律意見も未取得である [D][^3]。
8. **判定の推移を人数だけで要約しない。** 承認可の人数は、ラウンド 3 の 6 名からラウンド 4・5 の 0 名、ラウンド 6 の 1 名、ラウンド 7 の 4 名へと動いた。動いた理由は設計の良否よりも、各ラウンドの時点で正本の是正が表紙・要約・決議文案・台帳に伝わっていたかに強く依存した（§2.3）。決裁者には、人数ではなく最新ラウンドの差戻し理由と未是正の条件（§5.1）を示すこと [D]。

## 7. 他文書への申し送り

| # | 宛先 | 内容 |
|---|---|---|
| 1 | traceability/open-items.md（所有者） | §4.4 の群 a〜g を OI 行として起票する。各行に該当 MP-ID を記す |
| 2 | 00_decision/00-cover.md・01-executive-summary.md（所有者） | §6 の注意 1〜7 を提出時の注記として反映し、模擬パネルの最新の判定を記す。版 0.2 の時点の状態: ラウンド 3 の判定は、ラウンド 4 の devlead・cfo 是正で DCS-00 §4・DCS-01 §0 に反映された。ラウンド 5 の redteam 指摘により、両書の注記を最新の判定済みラウンド（ラウンド 5: 承認可 0、差戻し 8。ラウンド 4 も 0／8）と再審査未実施の範囲（ラウンド 5 の是正）に改め、表紙の冒頭に状態確認の時刻と本書の版を置いた（本書の是正エージェントが同じ指摘への対応として実施）。ラウンド 6 以降が行われた場合は、両書の注記を再び更新する。版 0.3 の時点の状態: 未適用（DCS-00 版 0.7 の冒頭の行・§4・§8 の 8 と DCS-01 §0 はラウンド 5 のまま。#8 で再送） |
| 3 | 12_poc/（PoC リード） | 系統 1 の実行記録と逸脱の開示（§5 内部監査、§4.4 群 c） |
| 4 | traceability/deliverables.md（所有者） | DL-109 の状態を draft とする。ラウンド 4・5 は本書版 0.2、ラウンド 6・7 は本書版 0.3 に追記済み。DL-109 行の版の表示を 0.4 に改める（版 0.4 でラウンド 6・7 の Medium/Low の一覧とラウンド 7 の是正件数を追記済み） |
| 5 | traceability/consistency-checks.md（TRC-12 の担当） | DCS-00 申し送り C4-9 の検査（DCS-00 §4・DCS-01 §0 の模擬パネルの判定の人数が、本書 §0・§2.2 の最新ラウンドと一致するか）に、「最新の判定済みラウンド」が指すラウンド番号の一致を加える。版 0.3 の時点の状態: TRC-12 版 0.3 は検査 9〜11（VC-9〜VC-11）の仕様を登録したが、この照合は含まれていない。検査 9〜11 に、本書の「最新の判定済みラウンド」の番号・判定の人数・本書の版を正本として抽出し、DCS-00 冒頭の状態確認の行・§4・§8 の 8、DCS-01 §0 と照合する項目を加える（ラウンド 7 ciso 指摘の修正案）。本書では見出し「### 5.1 最新の判定済みラウンド（ラウンド N）」と §0 の太字の文「最新の判定済みラウンドはラウンド N である」を抽出点とする |
| 6 | traceability/open-items.md（所有者） | §4.4 の群 a〜g にラウンド 4・5 の MP-ID を加えた。#1 の起票時にはこれを含める |
| 7 | 01_governance（統括者） | ラウンド 3 からラウンド 4 で承認可 6 名が全員差戻しに転じた経緯（§2.2 注）は、模擬パネルの判定が、どの時点のどの文書を確かめたかに強く依存することを示す。提出時に判定の人数だけを引用せず、確認した作業ツリーの時刻と版を併記する運用とする（案） |
| 8 | 00_decision/00-cover.md・01-executive-summary.md（所有者） | ラウンド 7 ciso 指摘の修正案の適用。(1) DCS-00 冒頭の「模擬パネルの状態確認」の行を、「2026-10-15T04:45Z（UTC）時点で、TRC-10 版 0.3（ラウンド 1〜7 を記録）により確認した。最新の判定済みラウンドはラウンド 7 で、判定は承認可（条件付き）4 名・差戻し 4 名。ラウンド 7 の是正は再審査未実施で、続行ワークフローの中で再審査は行われない」に改める。(2) DCS-00 §4 の「ラウンド 6 の判定の人数は TRC-10 に記録がなく、本書では記さない」を削り、ラウンド 6（承認可 1、差戻し 7、Critical 4 件）とラウンド 7（4／4、Critical 0 件）を記す。(3) DCS-00 §8 の 8 を「最新の判定済みラウンド＝ラウンド 7」と確認時刻に改める。(4) DCS-01 §0 の注記と脚注 83 を同じ内容に改める。DCS-00 脚注 35 の版と参照箇所も 0.3 に改める |
| 9 | 01_governance（統括者） | 続行ワークフローはラウンド 7 で終わるため、ラウンド 7 の是正 25 件を確かめるパネルは予定されていない。実在の決裁者への提出前に、作成者以外による再審査（ラウンド 8 相当、または §6 の 5 の確認者による照合）を行うかを決める（案） |
| 10 | 続行ワークフローの報告段（phase4b.js L89） | 本書は版 0.3 で、ラウンド 6・7 の判定・件数・Critical の内訳・論点を追記済みである。報告段は既存の記載を残し、ラウンド 7 の是正の結果と、ラウンド 6・7 の Medium/Low 55 件の一覧（MP-6-xx、MP-7-xx）と §4.4 の群への割当てを追記する。件数が本書の値（§2.1、§4.3）と食い違う場合は、出典の時刻を併記して差を記す。版 0.4 の時点の状態: 適用済み（§4.2 に MP-6-01〜25・MP-7-01〜30、§4.4 に群の割当て、§2.1 にラウンド 7 の是正件数 25 件。件数の食い違いはなし）。ラウンド 7 の是正の内容の照合と再審査は #9 による |

## レビュー記録

| 日付 | 版 | 内容 |
|---|---|---|
| 2026-10-15 | 0.1 | 初版。Phase 4 ワークフローの集計データから作成。作成者以外の照合は未実施 |
| 2026-10-15 | 0.2 | ラウンド 5（模擬パネル。自己レビューであり実在の CTO/CISO の決裁ではない）の指摘への対応。下表 |
| 2026-10-15 | 0.3 | ラウンド 7（模擬パネル。自己レビューであり実在の CTO/CISO の決裁ではない）の指摘への対応。下表 |
| 2026-10-15 | 0.4 | 続行ワークフローの報告段による更新（申し送り 10 の適用）。既存のラウンド 1〜7 の記録は残し、ラウンド 6・7 の Medium/Low 55 件の一覧（§4.2）、§4.4 の群の割当てと群 h・i、ラウンド 4 の 8 役の判定理由の表（§5.4）、ラウンド 7 の是正件数（25 件、再審査未実施）、§6 の注意 4 の改訂と注意 8 を加えた。出典は報告段に渡された集計データ [^9]。作成者以外の照合は未実施 |

| ラウンド | 指摘者 | 重大度 | 指摘 | 対応 |
|---|---|---|---|---|
| 5 | redteam | High | 状態表示が陳腐化している。表紙と要約は模擬パネルの「最終ラウンド（ラウンド 3）」の判定（承認可 6・差戻し 2）を提出時の注記にしている。実際にはラウンド 4 が実施され、Critical（cfo）を含む指摘と是正が各文書のレビュー記録にあるが、ラウンド 4 の 8 役の判定と理由はどこにも開示されていない。TRC-10 は版 0.1（ラウンド 3 まで）のままで、申し送り C4-8 は未反映である。決裁者は「6 名が承認可」を最新の結果と読む | 対応した（本書・DCS-00・DCS-01 の 3 ファイル）。根拠: 続行ワークフロー .workflows/phase4b.js の制御（ラウンド 4〜7、検証・是正の回付規則）を読み、2026-10-15T03:50Z 時点の各パネリスト（R4-・R5-）の構造化出力の verdict と findings、検証エージェントの real を直接数えた [D][^5][^6]。(1) 本書: 版 0.2 とし、冒頭に状態確認の時刻を置いた。§0 に 5 ラウンドの件数と「最新の判定済みラウンドはラウンド 5（承認可 0・差戻し 8）、ラウンド 4 も 0／8」を記し、ラウンド 3 の判定が最新ではないことを明記した。§1 に続行ワークフローの終了条件と重点、§2.1〜§2.3 にラウンド 4・5 の件数・判定・論点、§3・§4 に非机上 0 件と Medium/Low 62 件（MP-4-01〜31、MP-5-01〜31）、§5.1 に最新ラウンドの 8 役の理由と条件を加え、§6 の注意 5・6、§7 の申し送り 2・4〜7 を改めた（DCS-00 C4-8・C5-7、DCS-01 R4S-6 の適用）。(2) DCS-00: 冒頭の状態確認の時刻の行に本書の版と確認時刻を加え、§4 の提出時の注記を最新の判定済みラウンド（ラウンド 5）の判定と再審査未実施の範囲に改め、§8 の 8 と申し送り C4-8・C5-7 の状態を改めた。(3) DCS-01: §0 の注記と脚注 83 を同じ内容に改め、申し送り R4S-6 の状態を改めた。修正案の「再審査未実施の是正の範囲（ラウンド 3・4）」は、ラウンド 3 の是正がラウンド 4 で、ラウンド 4 の是正がラウンド 5 で再審査された事実（いずれも差戻し）に合わせ、「ラウンド 3・4 の是正は次のラウンドで再審査され、差戻しの理由が残った。ラウンド 5 の是正は再審査未実施」と書いた [D][^6]。残る限界: ラウンド 5 の是正の結果とラウンド 6 以降は反映していない。件数は作成者が数えたもので、作成者以外の照合は未実施である |
| 7 | ciso | High | 模擬パネルの状態表示が再び陳腐化している（ラウンド 3 の重点論点）。表紙・要約・DCS-03・DCS-05・DCS-06・TRC-12 などにラウンド 6 の指摘（Critical を含む）と是正の記録があるのに、TRC-10 は版 0.2（ラウンド 1〜5）のままで、ラウンド 6 の 8 役の判定・件数・Critical の内訳を記録していない。表紙冒頭と要約 §0 は「最新の判定済みラウンドはラウンド 5」、表紙 §4 は「ラウンド 6 の判定の人数は TRC-10 に記録がなく、本書では記さない」と書く。決裁者は、ラウンド 6 の結果と、その是正が再審査されていないことを確かめられない | 対応した（本書のみ。他文書は申し送り）。根拠: 続行ワークフローの実行記録（journal.jsonl の started／result 記録）を 2026-10-15T04:45Z に読み、ラウンド 6・7 の各パネリストの verdict と findings の重大度、検証エージェントの real を直接数えた [D][^8]。phase4b.js のループの上限（ラウンド 7）と報告段も読んだ [D][^5]。(1) 版 0.3 とし、冒頭に版 0.3 の状態確認の時刻を置いた。(2) §0 に 7 ラウンドの件数、Critical の内訳（ラウンド 6: cto・ciso・audit・legal の 4 件、ラウンド 7: 0 件）、回付件数（34 件・25 件）、棄却（ラウンド 7 の 1 件）を記した。(3) 修正案は「最新の判定済みラウンド＝ラウンド 6」「ラウンド 6 の是正が再審査未実施」としていたが、確認時刻にはラウンド 7 のパネルと検証が完了していたため、事実に合わせて「最新はラウンド 7（承認可 4・差戻し 4）、ラウンド 6 は 1／7、ラウンド 6 の是正 34 件はラウンド 7 で再審査済み、ラウンド 7 の是正 25 件は再審査未実施で、続行ワークフローの中では再審査されない」と書いた [D][^5][^8]。(4) §1 の終了条件、§2.1〜§2.3 にラウンド 6・7 の件数・判定・論点、§3 の件数、§4.1・§4.3 にラウンド 6・7 の Medium/Low の件数、§5.1 にラウンド 7、§5.2 にラウンド 6 の 8 役の理由と条件を加え、旧 §5.1〜§5.3 を §5.3〜§5.5 に繰り下げた。§6 の注意 5・6 を改めた。(5) 他文書: 表紙冒頭・§4・§8 の 8 と要約 §0 の修正は申し送り 8、TRC-12 の検査 9〜11 への「最新の判定済みラウンド」の番号の照合の追加は申し送り 5、DL-109 の版は申し送り 4、ラウンド 7 の是正の再審査の要否は申し送り 9、報告段との重複の回避は申し送り 10 とした。残る限界: ラウンド 7 の是正の結果と、ラウンド 6・7 の Medium/Low の個別一覧は反映していない。件数は作成者が数えたもので、作成者以外の照合は未実施である。同じ趣旨のラウンド 7 audit の High は、検証で棄却された（§2.1 注）[D][^8] |

## 参考文献

[^1]: 本リポジトリ『執筆規約』CONVENTIONS.md（参照箇所: §8、確認日: 2026-10-15）。および traceability/deliverables.md DL-109 行（確認日: 2026-10-15）
[^2]: 本リポジトリ『Phase 4 ワークフロー定義』.workflows/phase4.js（参照箇所: パネル・検証・是正ループと集計処理、確認日: 2026-10-15）。数値は同スクリプトがラウンドごとに出力した集計データによる
[^3]: 本リポジトリ『POA&M』traceability/open-items.md、および 00_decision/03-decision-items.md・06-gate-plan-and-plan-b.md（確認日: 2026-10-15。各パネリストの判定理由で参照された記載）
[^4]: 本リポジトリ『事前登録試験計画』12_poc/preregistered-test-plan.md §2.2・§2.4、および 12_poc/data/（ラウンド 3 内部監査の判定理由で参照された記載、確認日: 2026-10-15）
[^5]: 本リポジトリ『Phase 4 続行ワークフロー定義』.workflows/phase4b.js（未追跡。参照箇所: ラウンド 4〜7 のループと終了条件、Critical/High の新規判定、検証・是正の回付、報告段、確認日: 2026-10-15）
[^6]: 続行ワークフロー（phase4b.js）の実行記録。ラウンド 4・5 の各パネリスト（ラベル R4-cto〜R4-cfo、R5-cto〜R5-cfo）の構造化出力（verdict、rationale、findings）と、検証エージェント（ラベル verify-*）の構造化出力（real、reason）。Claude Code のローカルのセッション記録（リポジトリ外）にあり、2026-10-15T03:50Z に作成者が読み、件数を数えた。ラウンド 4 のパネルは 03:15Z〜03:20Z、ラウンド 5 のパネルは 03:38Z〜03:44Z に実行された
[^7]: 本リポジトリ 00_decision/00-cover.md（DCS-00 版 0.5）、00_decision/01-executive-summary.md（DCS-01 版 0.6）ほか各文書の末尾「レビュー記録」節のラウンド 4・5 行（確認日: 2026-10-15）
[^9]: 続行ワークフロー（phase4b.js）の報告段に渡されたラウンド別の集計データ（ラウンド 4〜7 の verdicts〔各役の verdict・rationale〕、counts〔all・fresh〕、medLow〔Medium/Low の severity・file・section・issue・desk_closable・fix・by〕、fixed）。リポジトリ外のワークフロー実行時データで、2026-10-15 に作成者が読んだ
[^8]: 続行ワークフロー（phase4b.js）の実行記録 journal.jsonl（started／result 記録）。ラウンド 6・7 の各パネリスト（ラベル R6-cto〜R6-cfo、R7-cto〜R7-cfo）の構造化出力（verdict、rationale、findings の severity・desk_closable）と、検証エージェント（ラベル verify-*）の構造化出力（real、reason）、是正エージェント（ラベル fix-*）の起動記録。Claude Code のローカルのセッション記録（リポジトリ外）にあり、2026-10-15T04:45Z に作成者が読み、件数を数えた。ラウンド 6 のパネルは 04:09Z〜04:18Z、ラウンド 7 のパネルは 04:38Z〜04:43Z に実行された
