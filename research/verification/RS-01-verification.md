# RS-01 独立検証記録（脚注の原典照合）

> 文書ID: RS-01-V / 版: 0.1 / 状態: review / 最終更新: 2026-10-03
> 対応要求: R-003, R-005〜R-009, R-011, R-012, R-014〜R-021, R-023, R-024, R-026, R-067, R-068, R-075, R-181, R-182, R-196（RS-01 の対応要求に準ずる）
> 依存文書: CONVENTIONS.md, research/RS-01-governance-risk.md（検証対象。検証後に版 0.1 から 0.2 へ改訂）

本記録は、RS-01 の作成者とは別の AI エージェント（Claude）が 2026-10-03 に行った脚注の原典照合のログである。検証者も AI であり、人間のレビュアや第三者による照合ではない。判定は検証者の読解によるもので、実在の CTO/CISO の決裁ではない。

---

## 1. 検証の方法

| 項目 | 内容 |
|---|---|
| 対象 | RS-01 版 0.1 の全脚注 [^1]〜[^49]（49 件）と、各脚注が付いた本文の主張（§2 結論サマリ、§3 調査結果、§4 ステータス表、§6 の状態記述） |
| 取得 | 全 49 脚注の原典を 2026-10-03 に取得した。文言・数値・規範語（must / should / may / shall・「べき」等）を逐語で照合するため、curl で原文を取得し、HTML はテキスト化、PDF は pdftotext で抽出して全文検索した。WebFetch は要約を返すため照合には使わなかった |
| 取得経路の例外 | (1) SEC の 4 件（[^30]〜[^33]）は、ブラウザ型の User-Agent では HTTP 403 になったため、自動取得であることを示す User-Agent で再取得した（HTTP 200）。[^33] と [^31] は Tavily extract でも同じ本文を確認した。(2) [^46] の EUR-Lex は自動応答（HTTP 202、本文 0 バイト）を 3 回返したため、同一 CELEX 番号 32022L2555 の官報本文（OJ L 333/80、27.12.2022）を EU 出版局（publications.europa.eu/resource/celex/32022L2555）から取得して照合した。(3) [^23] は登録ユーザー向けのログイン画面に転送された。これは脚注の主張（本文は登録ユーザー限定）そのものを裏付ける。(4) [^28] は eCFR の画面 URL と、同じ条文を返す eCFR renderer API の両方を取得した |
| 補助確認 | [^10] の「8286A 原版の撤回」を確かめるため、8286A 原版の CSRC ページを取得した（[^51] として追加）。[^14] の表にある「8286C ipd の obsolete」は 8286C Rev.1 ipd ページで確認した。O-RT の最新版は The Open Group の出版物ページで確認した（[^52] として追加）。SolarWinds 事件の訴えの内容は SEC Press Release 2023-227 で確認した（[^50] として追加）。SEC の Item 1.05 見直しの有無は SEC の Rulemaking Activity 一覧で確認した（[^53] として追加） |
| 判定区分 | 支持: 脚注の参照箇所が主張を全て裏付ける。部分支持: 主張の核心は裏付けられるが、限定条件・規範強度・版・状態・日付・帰属・用語のいずれかが原典とずれる。不支持: 原典が主張を裏付けない、または反する。検証不能: 原典を取得できない、または該当箇所が見つからない |
| 規範強度 | 各項目の「強度」欄と本文の動詞（「べき」「必要」「してよい」等）を、原典の該当文の must / should / may / could / shall / 「べき」と 1 文ずつ照合した |

## 2. 判定の集計

| 判定 | 件数 | 脚注 |
|---|---|---|
| 支持 | 37 | 下表の「支持」 |
| 部分支持 | 12 | [^5], [^9], [^11], [^13], [^24], [^25], [^27], [^33], [^39], [^42], [^45], [^47] |
| 不支持 | 0 | — |
| 検証不能 | 0 | — |

部分支持の 12 件は、いずれも RS-01 版 0.2 で修正した（§4）。原典の差し替えはなく、裏付けの不足を補うために原典を 4 件追加した（[^50]〜[^53]）。版・状態・日付の誤りとして重要なものは次の 3 点である。

- [^27] CISA のブログは、2026-10-03 時点で CISA サイト上「Archived Content」（現行の方針を反映しない可能性がある）と表示されていた。RS-01 版 0.1 はこの状態を書いておらず、結論 §2-4・§2-5・§2-10 で現行の機関見解のように引いていた。
- [^39] Three Lines Model の Statement of Position が置き換えた Position Paper を「2020 年版」としていたが、[^39]・[^40] には年が書かれていない。
- [^5] IR 8286r1 の定義を「OMB A-123 の定義を採用」としていたが、リスク選好の定義は COSO ERM（2017）からの引用で、OMB A-123 は連邦機関向けのリスク許容度の定義として併記されているだけだった。

## 3. 脚注ごとの判定表

凡例: 「主張」は脚注が付いた RS-01 の項目番号（#n）、結論サマリの番号（§2-n）、§4 ステータス表。

| 脚注 | 原典（取得先） | 主張 | 判定 | 照合結果（原典の該当箇所） | 修正 |
|---|---|---|---|---|---|
| [^1] | NIST CSWP 29 PDF | #2〜#8, §2-15 | 支持 | Abstract "The CSF does not prescribe how outcomes should be achieved."。§2 "These outcomes are not a checklist of actions to perform"。Appendix A の GV.RM（説明文と GV.RM-01/02/03/06）、GV.RR-01/02/03（"enforced" を含む）、GV.OV-01〜03、GV.OC-03 は逐語一致。§3.2 "Tiers should complement ... rather than replace it"。§5 mitigating / transferring / avoiding / accepting。§5.1 "they communicate expectations about risk appetite, accountability, and resources"、実務者は "key performance indicators, key risk indicators" を提供 | なし |
| [^2] | CSRC CSWP 29 ページ | #1, §2-14, §4 | 支持 | Date Published: February 26, 2024。Planning Note (09/24/2024) は CSF 1.1 to 2.0 Core Transition Changes Overview の公開のみ。Document History は 08/08/23 Draft、02/26/24 Final。後継版・draft の掲示なし | なし |
| [^3] | NIST SP 1303 PDF | #9 | 支持 | "Risk appetite expressed at other levels of risk management gets translated into more specific CSRM risk tolerance"。"CSF Organizational Profiles are a natural byproduct of a comprehensive CSRR" | なし |
| [^4] | CSRC SP 1303 ページ | #9, §4 | 支持 | Date Published: October 2024。Document History 02/26/24 Draft、10/21/24 Final | なし |
| [^5] | NIST IR 8286r1 PDF | #11, #12, #15〜#20, §2-1, §2-10 | 部分支持 | 引用文（§2.1、§3.1.2、§3.6.1、§3.6.2、§4.3）は全て逐語一致。電子メールの例、Table 3 の "Risk Transparency"（"without fear of reprisal"）、§3.5.2、§3.6.1 の System Owner / Authorizing Official の例も一致。ずれは 4 点。(a) #12 の「OMB A-123 の定義を採用」: 選好の定義は COSO ERM 2017（参考文献 [10]）、許容度は一般定義に加え連邦向けに OMB A-123（[3]）を併記、用語集では ISO Guide 73（[9]）も引く。(b) #20 の「先行指標の KRI を使うべき」: 原文は連邦機関の例で "could employ KRIs that provide a leading metric"（使い得る）。(c) #20 の見直し: 原文は "may require a periodic review"。(d) #11 の Appendix F: 追加されたのは "a list of actions for designated risk officers and senior management to perform on risk registers"（上級経営層だけ向けではない）。#15 の選好表現は原文が "qualitative, quantitative, and semi-qualitative methods" で、半定性の方法が抜けていた | #12 の強度欄、#20、#11、#15 を原典どおりに修正。§6 の「OMB の定義を採用」を修正 |
| [^6] | CSRC IR 8286 Rev.1 final ページ | #10, §2-14, §4 | 支持 | Date Published: December 2025。Supersedes IR 8286 (10/13/2020)。Planning Note (12/18/2025)。Document History 02/26/25 Draft、12/18/25 Final | なし |
| [^7] | CSRC IR 8286 Rev.1 ipd ページ | #10, §4 | 支持 | "Obsoleted on December 18, 2025 by IR 8286 Rev. 1"、Date Published: February 26, 2025、Comments Due: April 14, 2025 | なし |
| [^8] | CSRC IR 8286 原版ページ | #10, §4 | 支持 | "Withdrawn on December 18, 2025."、Superseded by IR 8286 Rev. 1、Date Published: October 2020（Final 10/13/20） | なし |
| [^9] | NIST IR 8286Ar1 PDF | #11, #13, #14, #30, #31, §2-1, §2-7, §2-8 | 部分支持 | §2.1.2 "always more specific"、"risk limits"、"Risk tolerance should always stay within the boundaries established by senior leadership." は一致。§2.2.4 SLE/ALE、§2.3.1 の IEC 31010:2019 引用、O-RT 3.0.1（参考文献 [16]、2021）、"Quantitatively informed qualitative decision-making should be the objective ..."、§2.3.2.1〜§2.3.2.5 の 5 技法、Appendix C の Table 6 再編と O-RT 引用の 2.0→3.0.1 更新も一致。ずれは 2 点。(a) #30 の「O-RT 3.0.1 を引き、TEF・LEF の較正済み範囲推定が ALE の精度を高めるとしている」: 較正の記述は脚注28 で "Agencies have pointed out that accurate calibrated ranges ... can lead to more accurate calculations for ALE" と機関の指摘として紹介されたもので、O-RT の主張ではない。(b) #14 の Table 2 の例は医療機関の例で、原文は "100 % of critical healthcare business applications must use multi-factor authentication"（医療業務アプリ、must） | #30 の帰属を脚注28 に直し、#14 に医療機関の例であることと must を明記 |
| [^10] | CSRC IR 8286A Rev.1 final ページ | #10, §2-14, §4 | 支持 | Date Published: December 2025、Supersedes IR 8286A (11/12/2021)、Document History 02/26/25 Draft、12/18/25 Final。8286A 原版の「撤回」は本ページにないため、原版ページ（[^51]）で "Withdrawn on December 18, 2025" を確認した | #10 に [^51] を追加 |
| [^11] | NIST IR 8286B-upd1 PDF | #21〜#24, §2-3, §2-4 | 部分支持 | §2.3 "levels of authority must be well defined by a role as part of the ERM policy and process"、"unacceptable risk cannot be adequately treated within the reporting period ... the risk is implicitly accepted"、"'ignore risk' is not among the available choices"、"there must be a clear plan"、"Many cybersecurity incidents have become notorious ..."、POA&M と民間の扱い、§2.3.1、§2.3.6（"should be recorded, including in the CSRR and RDR"）は一致。ずれは 4 点。(a) §2-3 は「残余リスクを受容する権限」としていたが、原文の権限階層は "who may approve risk treatment decisions"（リスク対応の承認）であり、受容への適用は推論。(b) §2-4 の「処置期限内」は原文では "within the reporting period"（報告期間内）。(c) #23 の強度を「説明文」としていたが、原文は "all risks must be fully disclosed, treated, and communicated"（must）。(d) #24 の強度を should としていたが、§2.3.1 は "The risk must be reported, monitored, and managed"（must）で、should は §2.3.6 だけ | §2-3 を原文どおりにし、受容への適用を [D] に分けた。§2-4 を「報告期間内」に修正。#21・#23・#24 の文言と強度を修正 |
| [^12] | CSRC IR 8286B upd1 ページ | #10, §2-14, §4 | 支持 | Date Published: February 2025、Supersedes IR 8286B (02/10/2022)、Document History 02/26/25 Final | なし |
| [^13] | NIST IR 8286Cr1 PDF | #11, #25〜#28, §2-1, §2-6, §2-9 | 部分支持 | Table 2（企業レベル監督: Board of Directors, Regulators, CEO, COO — "Holds management accountable"、"Receives periodic progress reports"、企業レベルのリスクガバナンス: "Identifies those risks that may require external reporting or disclosure"）、§4.2.2 "Discussion with decision-makers is necessary"、§5 の risk capacity（"third component of risk direction"、"rarely catastrophic"、"may even jeopardize the continuance"、"risk capacity should be evaluated to determine if cyber insurance is appropriate"）、§5.1 の三つ組、§5.2 の KRI 変化の 4 類型は一致。ずれは 2 点。(a) #27・§2-6: leading KRI の超過は "may be reported according to normal periodic reporting"（may）で、lagging の "should" と強度が違うのに区別していなかった。(b) #11: Appendix B では §2 は「大幅な変更」、§3 は「主に OMB A-11・A-123 に基づく大幅な変更」で、A-11・A-123 は §3 だけにかかる | #27、§2-6 に may / should を明記。#11 を原文どおりに修正 |
| [^14] | CSRC IR 8286C Rev.1 final ページ | #10, §2-14, §4 | 支持 | Date Published: December 2025、Supersedes IR 8286C (03/06/2024)、Document History 02/26/25 Draft、12/18/25 Final。§4 の「ipd は 2025-12-18 に obsolete」は 8286C Rev.1 ipd ページ（"Obsoleted on December 18, 2025 by IR 8286C Rev. 1"）で確認 | なし |
| [^15] | NIST IR 8286D-upd1 PDF | #29 | 支持 | "quantifying the organizational impact and enterprise consequences of compromised IT assets"。§1.2 "senior leaders define clear criteria for criticality and sensitivity. These criteria should be reviewed periodically" | なし |
| [^16] | CSRC IR 8286D upd1 ページ | #10, #29, §2-14, §4 | 支持 | Date Published: February 2025、Supersedes IR 8286D (11/17/2022)、Document History 02/26/25 Final | なし |
| [^17] | NIST SP 800-37r2 PDF | #32, #33 | 支持 | Task R-4 Discussion の引用は逐語一致。Appendix D: AO は "the only organizational official who can accept the security and privacy risk"、"typically have budgetary oversight ... or are responsible for the mission and/or business operations"。AODR: "The only activity that cannot be delegated ... is the authorization decision and signing ... (i.e., the acceptance of risk)"。SAISO は "may serve as authorizing official designated representative or as a security control assessor"、"chief information security officer" とも呼ぶ。Risk executive (function) は "a designated group (e.g., a risk board ...)" でもよい | なし |
| [^18] | CSRC SP 800-37 Rev.2 ページ | #32, §4 | 支持 | Date Published: December 2018、Document History 12/20/18 Final。Rev.3 の掲示なし | なし |
| [^19] | ISO 27001 ページ | #34, §2-14, §4 | 支持 | Status: Published、Publication date: 2022-10、Stage 60.60、Edition 3、改正は ISO/IEC 27001:2022/Amd 1:2024 の 1 件。Life cycle に改訂中（90.92 等）の表示なし | なし |
| [^20] | ISO 27001 Amd 1 ページ | #34, §4 | 支持 | Status: Published、Publication date: 2024-02、Stage 60.60（補足: 仏語の訂正版 2024-08 の表示あり） | なし |
| [^21] | ISO 27005 ページ | #35, §4 | 支持 | Published、2022-10、60.60、Edition 4。"guidance on managing information security risks to support the implementation of an ISMS based on ISO/IEC 27001"、"adapts the general principles of ISO 31000"、"assessment, treatment, communication, monitoring and review" | なし |
| [^22] | FAIR Institute ブログ | #36, §2-8, §4 | 支持 | Jan 23, 2025、Todd Tucker。FAIR Model (v3.0) と FAIR-CAM (v1.0) の公表、"Susceptibility"（旧 Vulnerability）、"Resistance Strength"（旧 Difficulty）、全因子の標準略号。FAIR-MAM は "in process" | なし |
| [^23] | FAIR Institute 資料ページ | #36 | 支持 | ログイン画面に転送され、"The page you are trying to view is only available to registered users." と表示 | なし |
| [^24] | The Open Group ブログ | #37, §2-8, §4 | 部分支持 | May 22, 2025、Linford・Brouch。O-RA 2.1 と O-RT 3.1 の公開は一致。ずれ: 原文は "The changes ... are limited to address the new Governance Function from the CSF 2.0, though other, small changes were made to ensure consistency"。RS-01 は後半を落としていた。また「最新版」は 2025-05 の告知だけでは言えないため、出版物ページで確認した（[^52]） | #37 に後半を補い、「最新版」の根拠に [^52] を追加。§2-8、§4 も修正 |
| [^25] | NACD ハンドブック PDF | #38〜#44, §2-2, §2-6, §2-7, §2-10, §4 | 部分支持 | 6 原則の名称、Principle Four（"the board provides strategic oversight and works with management to define the organization's risk appetite"、"explicit, quantitative where possible, and expressed in business or financial terms"、"Led by the CEO"、"risk ownership extends beyond IT"、Documented Governance Charter、"At least annually, the board can commission an evaluation ... independence of assurance functions"、Quantified Risk Appetite）、Principle Five（"at least quarterly and immediately following any material incident or significant change"、閾値、ダッシュボード、シナリオ、"standard risk quantification models"、KRI の 6 例）、Tool J、Tool K（独立検証、金額表示の選好、単一ベンダー集中）は一致。PDF の CreationDate は 2026-04-02。ずれは 3 点。(a) #43 は「原則3と Tool J は ... 成功指標」としていたが、成功指標は原則3（Formalized Management Reporting）で、Tool J は取締役会の問い。(b) §2-2 の「tolerance の設定主体は書かれていない」は [N] では書けない不在の主張で、実際には tolerance の語が Tool C・K・L の問いに 3 か所ある（設定主体の記述はない）。(c) 脚注の Tool K の頁は pp.66–68 | #43 の帰属、§2-2 のタグ（[D]）と記述、脚注の頁を修正 |
| [^26] | NACD ランディングページ | #38 | 支持 | "The fifth edition"、"six oversight principles"、"15 specialized tools" | なし |
| [^27] | CISA ブログ | #45, §2-4, §2-5, §2-10, §4 | 部分支持 | Released January 08, 2025、By Jen Easterly。CISO ではなく経営陣が所有、CISO への影響力と資源、引用文（"must be made transparently ..."）、"decisions to accept rather than mitigate cyber risks are scrutinized and revisited often"、報告閾値とニアミスは一致。状態の欠落: ページ冒頭に "Archived Content In an effort to keep CISA.gov current, the archive contains outdated information that may not reflect current policy or programs." と表示されている | #45 に状態を追記。§2-4・§2-5・§2-10、§4、§6 にアーカイブ扱いを明記 |
| [^28] | eCFR §229.106 | #46, §2-13 | 支持 | (b)(1)(i)〜(iii)、(c)(1)（引用文は逐語一致）、(c)(2)(i)〜(iii)、Instruction 1・2 to Item 106(c)。(b)(1) は "processes, if any" で、統制の実施でなく記述の義務 | なし |
| [^29] | eCFR Versioner API | #47, §4 | 支持 | content_versions 2023-08-04 と 2023-09-05、latest_amendment_date 2023-09-05。titles.json の Title 17 は up_to_date_as_of 2026-10-01 | なし |
| [^30] | SEC Release 33-11216 PDF | #48 | 支持 | DATES "effective September 5, 2023"。Item 1.05 は "within four business days after determining the incident is material"、Instruction 1 は "without unreasonable delay"。§II.D.3 "we are not adopting proposed Item 407(j). We are persuaded that effective cybersecurity processes are designed and administered largely at the management level" | なし |
| [^31] | SEC 規則制定ページ | #48, §4 | 支持 | Release Number 33-11216、SEC Issue Date July 26, 2023、Effective Date September 5, 2023 | なし |
| [^32] | SEC Petition 4-856 PDF | #49 | 支持 | May 22, 2025。ABA、BPI、SIFMA、ICBA、IIB の 5 団体。"this petition requests the rescission of both Form 8-K Item 1.05 and the corresponding Form 6-K requirements" | なし |
| [^33] | SEC Litigation Release 26423 | #50 | 部分支持 | November 20, 2025、No. 1:23-cv-09518-PAE (S.D.N.Y. filed Oct. 30, 2023)、joint stipulation で with prejudice 取下げ、"in the exercise of its discretion"、"does not necessarily reflect the Commission's position on any other case" は一致。ずれ: 「開示に関する執行」は本 Release に書かれていない（訴えの内容の記載がない） | 訴えの内容を Press Release 2023-227（[^50]）で確認して追記し、「開示に関する実例」という整理を [D] に分けた |
| [^34] | 経産省ページ | #51, §2-14, §4 | 支持 | 2023/03/24 Ver3.0 公開、2023/05/31 英訳版公開、Ver3.0 より新しい版の掲示なし、最終更新日 2023年5月31日（補足: 更新履歴の最新項目は 2023/10/31 の IPA プラクティス集第4版） | なし |
| [^35] | 経産省ガイドライン Ver3.0 PDF | #52〜#54 | 支持 | 作成時は WAF で取得できなかったが、検証時は PDF 全体を直接取得できた（HTTP 200）。概要の脚注5「許容可能水準に関しては所属業界のガイドラインや取引先からの要請などを考慮する必要がある」、重要10項目の「単なる指示ではなく…リーダーシップを発揮することが含まれる」、指示1 の引用文（逐語一致）、指示2、指示4（サイバー保険、残留リスクの識別）、付録D（ISO/IEC 27001:2022 の 5.1・5.2・5.3・6.1・6.2・8.2・8.3 等と NIST CSF Ver1.1 の ID.GV・ID.RA 等。CSF 2.0 / GOVERN の記載なし） | 脚注と §6 の取得経路の記述を更新 |
| [^36] | IIA Cybersecurity TR PDF | #55, #56, §2-6 | 支持 | "Topical Requirements are mandatory"、"mandatory for assurance services and recommended for advisory services"、適用可否の評価記録と除外理由の文書化・保存は must。GOVERNANCE A〜D、RISK MANAGEMENT A〜F（D: "quickly escalate any cybersecurity risk ... that reaches an unacceptable level"、財務・非財務の影響）、CONTROLS A〜G は一致。February 2025 | なし |
| [^37] | IIA Cybersecurity TR ページ | #55, §2-14, §4 | 支持 | "Issued: February 5, 2025 \| Effective: February 5, 2026" | なし |
| [^38] | IIA Topical Requirements ページ | #55, §4 | 支持 | IPPF の mandatory component、"Each Topical Requirement becomes effective 12 months after it is issued"。Third-Party 2026-09-15、Organizational Behavior 2026-12-15、Organizational Resilience 2027-04-30 | なし |
| [^39] | IIA Three Lines Model SoP PDF | #57, §2-2, §2-10, §4 | 部分支持 | Principles 1（"Boards set purpose, risk appetite"）・3、"Management (first line) owns and manages risks"、"ultimately, the CEO — is accountable to the board"、第二線は "guide, support, and challenge"（専門領域に cybersecurity を明記）、第三線の独立保証は一致。ずれ: 「2020 年版の Position Paper を置き換え」の年は原典にない（"replaces the prior Position Paper" のみ） | #57 と §4 から年を削除し、§6 に未確認として追加 |
| [^40] | IIA Statements of Position ページ | #57, #58, §4 | 支持 | "Both statements were published on July 8, 2026, and replace the former Position Papers on the topics." | #58 と §4 に「従前の Position Paper を置換」を追記 |
| [^41] | IIA ERM の役割 SoP PDF | #58, §2-3 | 支持 | "The chief audit executive must not make decisions about or be held accountable for risk responses"。"When the chief audit executive concludes that management has accepted a level of risk that exceeds the organization's risk appetite or risk tolerance, the matter must be discussed with senior management and escalated to the board as appropriate." | なし |
| [^42] | CG コード 2026年7月版 PDF | #60〜#62, §2-11, §2-12 | 部分支持 | 原則4-4 と解釈指針（グループ全体の体制、内部監査部門の活用、サイバーセキュリティリスク等を「考慮事項に含まれ得る」「適切に行われるべき」）、序文第9項（解釈指針はコンプライ・オア・エクスプレインの対象外、参照が期待される）、第12項、基本原則4 解釈指針の損害賠償責任と意思決定過程の合理性は一致。ずれ: #60 の強度欄にあった「プライム・スタンダード市場」の限定は本コードに書かれておらず、有価証券上場規程の定め（原典未確認） | #60 の強度欄を修正し、§6 に未確認として追加 |
| [^43] | JPX ニュースリリース | #59, §4 | 支持 | 「有価証券上場規程の一部改正を行い、2026年7月21日から施行」「コーポレートガバナンス・コード（2026年7月版）」 | なし |
| [^44] | 金融庁 報道発表 | #59 | 支持 | 令和8年4月10日〜5月15日の意見募集、147 の個人・団体、令和8年7月21日掲載、令和8年8月3日の一部修正注記 | なし |
| [^45] | 英国 DSIT Cyber Governance Code | #63, §2-6, §4 | 部分支持 | Published 8 April 2025、"tailor-made for boards and directors"、"not intended to be used by those who are responsible for the day-to-day management"、"designed for medium and large organisations"、A2・A3・E1・E2（引用文は逐語一致）・E3 は一致。ずれは 2 点。(a) D2 は「計画を年1回演習する」ではなく "Gain assurance that there is at least annual exercising of the plan"（演習が行われていることの保証を得る）。(b) 強度欄の「任意の行動規範」: 原典に任意・拘束の別の記載はない（gov.uk 上の分類は Guidance） | #63 の D2 と強度欄を修正（非拘束の扱いは [D]）。§4 も修正 |
| [^46] | NIS2 官報本文（EU 出版局経由） | #64, §2-13, §4 | 支持 | 27.12.2022、OJ L 333/80。Art. 20(1) の引用文は逐語一致（"Member States shall ensure ..."）。Art. 20(2) は構成員の研修受講の義務づけを加盟国が確保（shall）し、従業員向け研修は主体に促す（"shall encourage"） | 脚注に取得経路を追記。#64 の 2 項の書き方を、加盟国の確保義務として原文に近づけた（判定は変えていない） |
| [^47] | 金融庁ガイドライン PDF | #65, #66 | 部分支持 | 2.1.1【基本的な対応事項】①②③⑦⑧（引用文⑦は逐語一致、②・⑧は「少なくとも１年に１回」）、【対応が望ましい事項】b、1.1 のリスクベース・アプローチと「一律の対応を求めるものではなく」、「大手金融機関及び主要な清算・振替機関等が参照すべき優良事例」は一致。ずれ: #66 のリスク耐性度の定義で「業務中断が必ず生じることを前提に」の「必ず」と、「リスク選好度を設定した上で」が抜けていた | #66 を原文どおりにし、脚注14 のリスク選好度の定義（リスクキャパシティの範囲内）も追記 |
| [^48] | 金融庁 一部改正の告知 | #65 | 支持 | 令和7年7月4日、NISC の国家サイバー統括室への改組に伴う所要の技術的修正 | なし |
| [^49] | 金融庁 パブコメ結果 | #65 | 支持 | 「本日（令和６年10月4日）から適用します」 | なし |

### 3.1 検証時に追加した原典

| 脚注 | 原典 | 用途 | 照合結果 |
|---|---|---|---|
| [^50] | SEC Press Release 2023-227（2023-10-30） | #50 の訴えの内容 | "charges against ... SolarWinds Corporation and its chief information security officer, Timothy G. Brown, for fraud and internal control failures"、IPO から SUNBURST 公表までの間に "overstating SolarWinds' cybersecurity practices and understating or failing to disclose known risks" |
| [^51] | CSRC IR 8286A 原版ページ | #10 の 8286A 撤回 | "Withdrawn on December 18, 2025."、Superseded by IR 8286A Rev. 1、Date Published: November 2021 |
| [^52] | The Open Group 出版物ページ（Open FAIR Standards） | #37, §2-8 の「最新版」 | 掲載中の版は O-RT Version 3.1 と O-RA Version 2.1 が最新で、Open FAIR Body of Knowledge 2.0（O-RA 2.0.1 / O-RT 3.0.1）も併載 |
| [^53] | SEC Rulemaking Activity 一覧 | #49, §6 | 1 ページ目（2025-06-12〜2026-10-01）と 2 ページ目（2024-03-27〜2025-06-12）に、Item 1.05・Regulation S-K の見直しにあたる案件は見当たらない。一覧に載らない対応は確認できないため、RS-01 では「未確認」を維持した |

## 4. RS-01 に加えた修正（版 0.1 → 0.2）

| # | 箇所 | 修正内容 | 理由（脚注） |
|---|---|---|---|
| 1 | 冒頭メタ情報・前文 | 版を 0.2 にし、AI による独立照合の実施、追加原典 4 件、本記録の所在を前文に書いた | — |
| 2 | §2-2 | tolerance の設定主体についての不在の主張を [N] から [D] に分け、tolerance の語が Tool C・K・L の問いに 3 か所あることを明記した | [^25] |
| 3 | §2-3 | 権限階層の対象を原文どおり「リスク対応（受容を含む）の決定の承認」にし、残余リスクの受容権限への適用を [D] に分けた | [^11] |
| 4 | §2-4 | 「処置期限内」を「報告期間内」に直した。CISA 見解がアーカイブ扱いであることを明記した | [^11], [^27] |
| 5 | §2-5 | CISA 見解がアーカイブ扱いで、現在の立場は未確認であることを明記した | [^27] |
| 6 | §2-6 | IR 8286Cr1 の leading KRI（may）と lagging KRI（should）の強度を分けた | [^13] |
| 7 | §2-8 | O-RT 3.1 / O-RA 2.1 が掲載中の最新版であることを出版物ページで裏付けた | [^52] |
| 8 | §2-10 | CISA 見解がアーカイブ扱いであることを明記した | [^27] |
| 9 | #10 | 8286A 原版の撤回の根拠に原版ページを追加した | [^51] |
| 10 | #11 | 8286r1 Appendix F の活動一覧の対象（指定リスク責任者と上級経営層）、8286Ar1 の O-RT 更新（2.0→3.0.1）、8286Cr1 の §2 / §3 の改稿内容を原文どおりにした | [^5], [^9], [^13] |
| 11 | #12 | 強度欄の「OMB A-123 の定義を採用」を、COSO ERM（選好）と OMB A-123（連邦向け許容度）の引用に直した | [^5] |
| 12 | #14 | Table 2 の例が医療機関の例で、許容度が must であることを明記した | [^9] |
| 13 | #15 | 選好の表現方法に semi-qualitative と表現例を補った | [^5] |
| 14 | #20 | 先行 KRI を「使うべき」から「使い得る（could）」に、見直しを「要し得る（may require）」に直した | [^5] |
| 15 | #21 | 権限階層の対象を「リスク対応（risk treatment）の決定の承認」、定める場所を「ERM 方針と手順」にした | [^11] |
| 16 | #23 | 強度を must に直し、transliterate の内容（登録簿と POA&M の読み替え）を原文どおりにした | [^11] |
| 17 | #24 | 強度を §2.3.1 は must、§2.3.6 は should に分けた | [^11] |
| 18 | #27 | leading KRI は may、lagging KRI は should と強度を分けた | [^13] |
| 19 | #30 | TEF・LEF の較正の記述を、O-RT の主張から脚注28 の「機関の指摘」に帰属を直した | [^9] |
| 20 | #37 | 「文書間の整合のための小さな変更」を補い、最新版の根拠を追加した | [^24], [^52] |
| 21 | #43 | 成功指標は原則3、Tool J は取締役会の問いと帰属を分けた | [^25] |
| 22 | #45 | 状態として「Archived Content」表示を追記した | [^27] |
| 23 | #49 | SEC Rulemaking Activity 一覧の確認結果を追記し、未確認を維持した | [^53] |
| 24 | #50 | 提訴日（2023-10-30）と訴えの内容（詐欺・内部統制違反）を追記し、「開示に関する実例」という整理を [D] に分けた | [^33], [^50] |
| 25 | #57 | 置き換え対象の Position Paper の「2020 年版」を削除し、年は未確認とした | [^39], [^40] |
| 26 | #58 | 同主題の従前の Position Paper を置き換えたことを追記した | [^40] |
| 27 | #60 | 強度欄の市場区分の限定を、上場規程の定めで原典未確認と明記した | [^42] |
| 28 | #63 | D2 を「演習が行われていることの保証を得る」に直した。強度欄を Guidance（非拘束の扱いは [D]）に直した | [^45] |
| 29 | #66 | リスク耐性度の定義を原文どおりにし（「必ず」等）、リスク選好度の定義（脚注14）を追記した | [^47] |
| 30 | §4 ステータス表 | O-RT / O-RA、CISA、IIA SoP 2 件、英国 Code の 5 行の状態を修正した | [^24], [^27], [^39], [^40], [^45], [^52] |
| 31 | §6 | SEC の確認結果、経産省 PDF の取得経路、CISA のアーカイブ表示、IR 8286r1 の定義の出典、CG コードの市場区分、IIA の置換対象の年を更新・追加した | [^5], [^27], [^35], [^42], [^39], [^53] |
| 32 | 参考文献 | [^25] の頁、[^27]・[^39]・[^40] の参照箇所、[^35]・[^46] の取得経路を補記し、[^50]〜[^53] を追加した | 上記 |
| 33 | #64 | NIS2 第20条2項を、加盟国の確保義務（構成員の研修受講）と従業員向け研修の奨励として原文に近づけた | [^46] |
| 34 | §5.1 D34 行 | 英国 Code の「（任意）」を「政府ガイダンス。法的拘束力の記載なし」に直した | [^45] |

## 5. 検証不能・二次情報の扱い

- **検証不能の脚注**: 0 件。全 49 脚注の原典を取得し、該当箇所を確認できた。[^46] は EUR-Lex が本文を返さなかったため、同一 CELEX 番号の官報本文を EU 出版局から取得して照合した（同じ OJ L 333/80 の本文）。
- **二次情報だけを根拠にした主張**: 本文の結論に使われているものは見つからなかった。RS-01 §6 が二次情報でしか把握していないとした 2 点のうち、SEC の Item 1.05 見直しは SEC の一覧（[^53]）で該当案件がないことまで確認したが、一覧外の対応がありうるため「未確認」を維持した。コーポレートガバナンス報告書の提出期限（2027-07 末）は、JPX のリリース（[^43]）と添付 PDF 2 点に記載がなく、原典を見つけられなかったため「未確認」を維持した。
- **一次性の注記（判定は変えていない）**: [^22]（FAIR Institute ブログ）と [^24]（The Open Group ブログ）は、標準の発行者自身による告知であり、版と公表日の根拠としては一次情報と判断した。[^27] は CISA 長官名義の機関ブログで一次情報だが、アーカイブ扱いのため現行の機関見解としては使わない旨を本文に明記した。
- **タグの注記**: NACD・IIA・英国 Code・経産省・金融庁の指針は拘束力のない文書を含むが、RS-01 は凡例で `[N]` に強度欄を併記する扱いを定めており、その扱いは CONVENTIONS §3 の「原典」の条件を満たすと判断して変更していない。

## 6. 検証の限界

- 照合は 2026-10-03 時点で各ページが表示した内容に対して行った。CSRC・ISO・IIA・NACD・gov.uk のページは後日更新され得る。
- PDF はテキスト抽出で照合した。IR 8286Cr1 Table 2 は段組みの抽出で行の対応が崩れるため、RS-01#25 が引く 2 行（企業レベルの監督と企業レベルのリスクガバナンス）だけを確認し、他の行の割り当て（たとえば "Determines enterprise risk threshold" がどの行にかかるか）は判定していない。
- 規範強度の照合は英語・日本語の原文の助動詞・文末表現に基づく。「べき」「必要」等の日本語の強度対応や、[D] で書かれた推論の妥当性は、人間のレビュアによる確認が別途必要である。
- SEC の 4 件は自動取得であることを示す User-Agent で取得した。[^31] と [^33] の本文は Tavily extract で取得した本文と一致した。[^30] と [^32] の PDF は別経路で突き合わせておらず、後日の差し替えの有無までは確認していない。
- 前提台帳（A-ID）が未採番のため、仮定依存の推論（[D] と「仮定依存（A-ID 未採番）」の併記）の妥当性は検証の対象外とした。
