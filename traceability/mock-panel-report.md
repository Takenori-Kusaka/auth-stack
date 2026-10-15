# 模擬パネル判定記録

> 文書ID: TRC-10 / 版: 0.1 / 状態: draft / 最終更新: 2026-10-15
> 対応要求: R-201, R-202（DL-109 の対応要求）。G-009, G-130（関連）
> 依存文書: CONVENTIONS.md, traceability/deliverables.md, .workflows/phase4.js, 00_decision/00-cover.md〜08-alternatives-comparison.md, traceability/open-items.md
> 作成方法: AI エージェント（Claude）が、Phase 4 のワークフロー（.workflows/phase4.js）が集計したラウンド別データ（判定・理由・件数・Medium/Low 指摘）を整理した。指摘の個別の是正結果は、各文書末尾の「レビュー記録」節が正本であり、本書は件数と扱いを記録する。
> 表の注記: 表のセルでタグのないものは、ワークフローの集計データと各パネリストの判定理由の転記・要約（設計推論 [D]）であり、この注記で個別のタグに代える。

**本書は AI エージェントによる模擬パネルの自己レビューであり、実在の CTO/CISO の決裁ではない。** パネリスト 8 名（CTO、CISO、超大規模 SRE、プライバシー・法務、内部監査、レッドチーム、連携サービス開発リーダー、CFO/PMO）はいずれも同じパイプライン内の AI エージェントが役割を演じたものであり、報告系統の外にある独立性を持たない [D][^1]。本書の「承認可」「差戻し」は、実在の経営会議・CTO・CISO・CFO・法務・内部監査のいずれの判断にも代わらない [D][^1]。

## 0. 要旨

- 模擬パネルは 3 ラウンド実施した。指摘総数はラウンド 1 が 69 件、ラウンド 2 が 67 件、ラウンド 3 が 49 件である [D][^2]。
- 机上で閉じる Critical/High の新規指摘は 30 件・33 件・16 件で、各ラウンドの Critical/High の全数に一致した（机上で閉じない Critical/High と、前ラウンドとの重複は 0 件）[D][^2]。
- 是正に回付した件数（作成者以外のエージェントによる実在性の検証を通過した件数）は 29 件・32 件・16 件である。検証で棄却されたのは 1 件・1 件・0 件である [D][^2]。
- 最終ラウンド（ラウンド 3）の判定は、承認可（条件付き含む）6 名、差戻し 2 名（内部監査、CFO/PMO）である [D][^2]。
- ラウンド 3 の是正 16 件は、ワークフローが 3 ラウンドで終了したため、パネルによる再審査を受けていない。「是正済み」とは扱わず、「是正エージェントに回付済み・再審査未実施」とする [D][^2]。
- Medium/Low の指摘（106 件、§4）は、設計上、是正ループの対象外であった。すべて机上で閉じられる（desk_closable=true）が未処理であり、同じ趣旨の指摘がラウンドをまたいで繰り返し出た（§4.4）[D][^2]。
- 経営判断・実測・第三者評価でしか閉じない事項は、決裁案・残課題として開示済みであることを各パネリストが確認したうえで指摘から除いた。このため非机上の指摘は 0 件である。除いた事項は §3 に記録する [D][^2]。

## 1. 方法

| 項目 | 内容 |
|---|---|
| パネリスト | cto、ciso、sre、legal、audit、redteam、devlead、cfo の 8 役（いずれも AI エージェント） |
| 審査基準 | レビュー原文の承認条件 10 項と重大な不足、G-goal-criteria、CONVENTIONS |
| 判定の選択肢 | 「承認可（条件付き含む）」「差戻し」 |
| 指摘の属性 | 重大度（Critical/High/Medium/Low）、ファイル・節、問題、desk_closable、修正案 |
| 除外規則 | 経営判断・実測・第三者評価でしか閉じない事項は、残課題・決裁案として開示されていれば指摘しない。前ラウンドで是正済みの点は繰り返さない |
| 是正ループ | 机上で閉じる Critical/High の新規指摘だけを、作成者以外のエージェントが実在性を検証し（反証を試み、不確かなら棄却）、通過したものをファイル単位の是正エージェントに回付 |
| 終了条件 | 最大 3 ラウンド。新規 Critical/High が 2 ラウンド連続で 0 件なら早期終了（本件は 3 ラウンドすべて実施） |

出典: .workflows/phase4.js [D][^2]。

## 2. ラウンド別の結果

### 2.1 件数

| ラウンド | 指摘総数 | Critical/High | うち机上・新規 | 検証通過（是正回付） | 検証で棄却 | Medium | Low | 差戻し / 8 |
|---|---|---|---|---|---|---|---|---|
| 1 | 69 | 30 | 30 | 29 | 1 | 30 | 9 | 6 |
| 2 | 67 | 33 | 33 | 32 | 1 | 26 | 8 | 5 |
| 3 | 49 | 16 | 16 | 16 | 0 | 25 | 8 | 2 |
| 計 | 185 | 79 | 79 | 77 | 2 | 81 | 25 | — |

注: Critical/High の件数は「指摘総数 − Medium/Low の件数」で算出した。Critical と High の内訳、および Critical/High 各指摘の本文はワークフローの集計データに含まれないため、各文書の「レビュー記録」節を正本とする [D][^2]。

### 2.2 判定

| パネリスト | ラウンド 1 | ラウンド 2 | ラウンド 3 |
|---|---|---|---|
| CTO | 差戻し | 差戻し | 承認可（条件付き） |
| CISO | 差戻し | 差戻し | 承認可（条件付き） |
| 超大規模 SRE | 承認可（条件付き） | 承認可（条件付き） | 承認可（条件付き） |
| プライバシー・法務 | 差戻し | 差戻し | 承認可（条件付き） |
| 内部監査 | 差戻し | 差戻し | 差戻し |
| レッドチーム | 承認可（条件付き） | 承認可（条件付き） | 承認可（条件付き） |
| 連携サービス開発リーダー | 差戻し | 差戻し | 承認可（条件付き） |
| CFO/PMO | 差戻し | 差戻し | 差戻し |

### 2.3 ラウンドごとの主な論点

| ラウンド | 差戻しの主な理由（要約） |
|---|---|
| 1 | 代替案比較の費用が DCS-07 の基準値の約半分（26〜30 FTE 前提）。Plan B の発動条件が循環。決裁事項に統治規程（GOV-05〜08）の承認がなく G0 を通過できない。DEC-3（不可逆）の前提にリスク選好と Gate 2 独立レビューがない。法務署名前の判定表を経営が承認する構成。ライフサイクルイベント契約・client 登録契約の欠落。DEC-4 の予算上限が空欄で G0〜G3 の支出に決議主体がない |
| 2 | ラウンド 1 の是正が DCS-03・DCS-06 にだけ入り、表紙・要約・DCS-07 に伝播していない。次回決裁で DEC-3・DEC-8 を求めるかが文書間で正反対。DEC-10 の有無が DCS-03 と DCS-06 で逆。申し送り（TR-1〜9、H-1〜8、8-1〜6、M-1〜M-9）が POA&M に未起票。敵対的な破壊・恐喝（DX 型）の欠落。PoC 範囲の従業員テナントと「合成データ限定」の矛盾 |
| 3 | 次回決裁の範囲は文書間で一致した。残る差戻し理由は 2 点。(a) 内部監査: 要約の「実測 0 件」と、12_poc/data/ にある系統 1 の実行記録（不合格・中止を含み、立会人署名なし、不合格を見た後の manifest 再凍結）の未開示。(b) CFO: DEC-10 の承認額が正本 DCS-06 版 0.3（G0〜G3 計 約 1.2〜8.6 億円、Gate 2 独立レビューを含む）と DCS-03・表紙・要約（計 約 1.0〜7.8 億円）で食い違い、継続費用（定常 48 FTE、G3 以降の SRE、G5 独立保証）の決裁単位が未定義 |

## 3. 非机上指摘の扱い

- 3 ラウンドを通じ、desk_closable=false の指摘は 0 件である [D][^2]。これは除外規則（§1）により、経営判断・実測・第三者評価でしか閉じない事項のうち残課題・決裁案として開示済みのものを、パネリストが指摘から除いたためである [D][^2]。
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
- 106 件すべてが desk_closable=true（文書の修正で閉じられる）である [D][^2]。
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

### 4.3 集計

| 指摘者 | R1 | R2 | R3 | 計 |
|---|---|---|---|---|
| cto | 4 | 4 | 4 | 12 |
| ciso | 4 | 5 | 2 | 11 |
| sre | 6 | 5 | 3 | 14 |
| legal | 4 | 4 | 3 | 11 |
| audit | 5 | 6 | 5 | 16 |
| redteam | 3 | 3 | 1 | 7 |
| devlead | 5 | 3 | 6 | 14 |
| cfo | 8 | 4 | 9 | 21 |
| 計 | 39 | 34 | 33 | 106 |

### 4.4 繰り返し出た指摘の群

Medium/Low が是正ループに入らなかったため、同じ趣旨の指摘がラウンドをまたいで残った [D][^2]。POA&M には群ごとに 1 行で起票することを推奨する [D]。

| 群 | 趣旨 | 該当 ID | 優先度の目安 |
|---|---|---|---|
| a | 決裁パッケージの状態表示が作業ツリーと不一致（change-log、DL-39〜44、CON-12/13、client 登録、件数、版） | MP-1-02, 1-19, 1-20, 1-27, 1-38, 2-03, 2-09, 2-14, 2-19, 2-20, 2-27, 3-01, 3-13, 3-14, 3-17, 3-21, 3-22, 3-23, 3-32, 3-33 | 次回決裁の起案前（決裁者の判断材料の信頼性に直結） |
| b | 要約（DCS-01）の構成崩れ（節の重複、申し送り番号の重複） | MP-2-04, 2-24, 3-02, 3-16 | 次回決裁の起案前 |
| c | PoC 系統 1 の実行データの開示 | MP-2-21, 3-04（ラウンド 3 の内部監査の High と関連） | 次回決裁の起案前 |
| d | 認可遅延・可用性の合成式と予算 | MP-1-09, 1-12, 2-12（ラウンド 3 SRE 判定理由にも再掲） | G3 前 |
| e | 費用の枠（Plan B、中止時の累計、単価仮定の登録） | MP-1-33, 1-36, 2-33, 2-34, 3-29, 3-30 | 次回決裁の起案前（DEC-10 の上限に影響） |
| f | 汎用モック・PoC コードの利用範囲 | MP-1-30, 1-31, 2-30, 3-19, 3-20 | DEC-8 前 |
| g | 申し送り・是正の POA&M 未起票 | MP-2-16, 2-25, 3-12, 3-14, 3-18 | 次回決裁の起案前（G-130） |

## 5. 各パネリストの最終判定理由の要約（ラウンド 3）

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

注: ラウンド 3 の Critical/High 16 件は是正エージェントに回付されたが、ラウンド 4 の再審査は実施していない。したがって上表の「条件」が満たされたかは、本書では判定しない [D][^2]。

## 6. 実在の決裁者に提出する際の注意

1. **本書の判定は決裁ではない。** 模擬パネルは同じパイプラインの AI エージェントによる自己レビューである。8 役の「承認可」は、実在の CTO・CISO・CFO・法務・内部監査の判断を予測も代替もしない [D][^1]。
2. **独立保証は未達である。** 報告系統の外の独立反証（DL-108 の区分 D 部分）、Gate 2・Gate 5 の独立評価、cross-tenant pentest・red team、OIDF conformance はいずれも未実施である。ラウンド 1 で指摘された「作成者以外の検証」が同じパイプラインの AI によるものであることも、決裁者に開示する必要がある [D][^3]。
3. **経営承認は未達である。** DEC-1〜DEC-10 の決議は 0 件、accepted な ADR は 0 本、受容票は 0 件、要員確約は未了である。本パッケージは決裁案・選択肢・様式までである [D][^3]。
4. **実測は未達である。** 合否判定に使える PoC の実測（[M]）は 0 件である。ただし系統 1 の凍結前の実行記録が 12_poc/data/ に存在し、不合格・中止と手順上の逸脱の疑いを含む（§5 内部監査）。提出前に、その実行・結果・逸脱を開示し、合否に使わない扱いを明記すること [D][^4]。
5. **最終ラウンドで差戻しが 2 名残っている。** 内部監査（実測データの未開示）と CFO（決議文案の金額の不一致）の差戻し理由が是正されたかは、パネルの再審査を経ていない。提出前に作成者以外が確認すること [D][^2]。
6. **Medium/Low 106 件は未処理である。** とくに §4.4 の群 a・b・c・e・g は決裁者の判断材料の正確さに直結するため、次回決裁の起案前に閉じること [D]。
7. **法務署名（E2）前である。** 法域判定・規制写像は AI 起草案であり、外部の現地法律意見も未取得である [D][^3]。

## 7. 他文書への申し送り

| # | 宛先 | 内容 |
|---|---|---|
| 1 | traceability/open-items.md（所有者） | §4.4 の群 a〜g を OI 行として起票する。各行に該当 MP-ID を記す |
| 2 | 00_decision/00-cover.md・01-executive-summary.md（所有者） | §6 の注意 1〜7 を提出時の注記として反映する。模擬パネルの最終判定（承認可 6、差戻し 2、ラウンド 3 の是正は再審査未実施）を記す |
| 3 | 12_poc/（PoC リード） | 系統 1 の実行記録と逸脱の開示（§5 内部監査、§4.4 群 c） |
| 4 | traceability/deliverables.md（所有者） | DL-109 の状態を draft とし、ラウンド 4（再審査）を実施する場合は本書に追記する |

## レビュー記録

| 日付 | 版 | 内容 |
|---|---|---|
| 2026-10-15 | 0.1 | 初版。Phase 4 ワークフローの集計データから作成。作成者以外の照合は未実施 |

## 参考文献

[^1]: 本リポジトリ『執筆規約』CONVENTIONS.md（参照箇所: §8、確認日: 2026-10-15）。および traceability/deliverables.md DL-109 行（確認日: 2026-10-15）
[^2]: 本リポジトリ『Phase 4 ワークフロー定義』.workflows/phase4.js（参照箇所: パネル・検証・是正ループと集計処理、確認日: 2026-10-15）。数値は同スクリプトがラウンドごとに出力した集計データによる
[^3]: 本リポジトリ『POA&M』traceability/open-items.md、および 00_decision/03-decision-items.md・06-gate-plan-and-plan-b.md（確認日: 2026-10-15。各パネリストの判定理由で参照された記載）
[^4]: 本リポジトリ『事前登録試験計画』12_poc/preregistered-test-plan.md §2.2・§2.4、および 12_poc/data/（ラウンド 3 内部監査の判定理由で参照された記載、確認日: 2026-10-15）
