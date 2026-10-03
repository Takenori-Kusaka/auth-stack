# RS-10 独立検証記録（脚注の原典照合）

> 文書ID: RS-10-V / 版: 0.1 / 状態: review / 最終更新: 2026-10-03
> 対応要求: R-102, R-118〜R-128, R-134, R-193（RS-10 の対応要求に準ずる）
> 依存文書: CONVENTIONS.md, research/RS-10-audit-privacy-residency.md（検証対象。検証後に版 0.1 から 0.2 へ改訂）

本記録は、RS-10 の作成者とは別の AI エージェント（Claude）が 2026-10-03 に行った脚注の原典照合のログである。検証者も AI であり、人間のレビュアによる照合ではない。判定は検証者の読解によるもので、CTO/CISO の決裁ではない。

---

## 1. 検証の方法

| 項目 | 内容 |
|---|---|
| 対象 | RS-10 版 0.1 の全脚注 [^1]〜[^53]（53 件）と、各脚注が付いた本文の主張（§2 結論サマリ、§3 調査結果、§4 ステータス表、§6 未確認事項） |
| 取得 | 全 53 脚注の原典を 2026-10-03 に取得した。逐語照合のため、原則として curl で原文を取得し、HTML はテキスト化、PDF は pdftotext（日本語 PDF は `-enc UTF-8`）で抽出して全文検索した |
| 取得経路の例外 | (1) W3C（[^7]〜[^9]）は curl に 403 を返したため、tavily_extract（原文の抽出）と WebFetch で該当節を取得した。規範語を含む文は tavily_extract の原文で照合した。(2) EUR-Lex（[^16], [^17], [^30]〜[^32], [^43]）は curl に 202（bot 判定）を返したため、同じ CELEX 番号の文書を EU 出版局の Cellar（publications.europa.eu/resource/celex/…）から XHTML で取得した。脚注の URL は有効なので変更していない。(3) OCSF（[^2]）は tag 1.9.0 のスキーマ定義 JSON を raw.githubusercontent.com から取得し、属性の requirement を機械的に抽出した。(4) NIST SP 800-53（[^6]）は OSCAL カタログ JSON から AU 系統制の本文とパラメータを抽出した |
| 補助確認 | GitHub のリリース日とライセンスは GitHub API（gh api）で確認した（OCSF、OpenTelemetry）。RFC の状態と公表月は RFC Editor の JSON メタデータで確認した。eCFR の版は eCFR versioner API で確認した。e-Gov は法令 API v2 の law_data と law_revisions で、改正履歴ごとの本文と附則を確認した |
| 転送 | [^35] は記載 URL から https://www.edpb.europa.eu/public-consultations/guidelines-012025-on-pseudonymisation_en へ転送された。内容は同じ文書で、脚注の URL を転送先に更新した |
| 判定区分 | 支持: 脚注の参照箇所が主張を全て裏付ける。部分支持: 主張の核心は裏付けられるが、限定条件・版・日付・帰属・規範強度のいずれかが原典とずれる。不支持: 原典が主張を裏付けない、または反する。検証不能: 原典を取得できない、または該当箇所が見つからない |
| 規範強度 | W3C（MUST / MUST NOT / SHOULD / MAY）、OpenTelemetry（MUST / MUST NOT）、RFC 9943（BCP 14 の MUST と小文字の must の区別）、CADF（SHALL / SHOULD / must）、NIST SP 800-88r2（should not / must）、法令の「しなければならない」と「努めなければならない」を、原典の該当文と 1 文ずつ照合した |

## 2. 判定の集計

| 判定 | 件数 | 脚注 |
|---|---|---|
| 支持 | 39 | 下表の「支持」 |
| 部分支持 | 14 | [^4], [^9], [^13], [^23], [^26], [^27], [^29], [^30], [^33], [^38], [^40], [^45], [^46], [^48] |
| 不支持 | 0 | — |
| 検証不能 | 0 | — |

部分支持の 14 件は、いずれも RS-10 版 0.2 で修正した（§4）。このうち日付の誤りは 4 件（[^29], [^30], [^33], [^40]）、規範強度・規範の範囲のずれは 3 件（[^9], [^23], [^26]/[^27] の §2-6）、施行状態の不正確さは 1 件（[^45]）である。出典を差し替えた脚注はない。検証者が追加した脚注は [^54]（PCI DSS v4.0.1 の公表）と [^55]（EDPB の DPF に関する書簡）の 2 件である。

## 3. 脚注ごとの判定表

凡例: 「主張」は脚注が付いた RS-10 の項目番号（#n）と結論サマリの番号（§2-n）。

| 脚注 | 原典（取得先） | 主張 | 判定 | 照合結果（原典の該当箇所） | 修正 |
|---|---|---|---|---|---|
| [^1] | GitHub ocsf-schema Release 1.9.0、releases API | #1, #6, #9 | 支持 | 1.9.0 は 2026-08-03T14:39:07Z。1.8.0 2026-03-18、1.7.0 2025-11-14、1.6.0 2025-08-01、1.5.0 2025-04-28。1.9.0 より新しいリリースはない。"Added record_integrity profile"、"Added optional delegation attribute to the ai_operation profile"、"Added ai_agent attribute to the ai_operation profile"、delegation / ai_agent / attestation / prev_event オブジェクトの追加、"Deprecated the app_name and app_uid usages in the actor object in favor of the application attribute" | なし |
| [^2] | ocsf-schema tag 1.9.0 の JSON（objects、events、profiles、dictionary） | #3〜#8, #42, §2-1, §2-5 | 支持 | authorization（caption "Authorization Result"）: decision recommended、policy optional。dictionary の decision は "Decision/outcome of the authorization mechanism (e.g. Approved, Denied)"、型 string_t、enum なし。policy: at_least_one [name, type, uid]、version・is_applied recommended、説明文は引用どおり。actor: user・process・application recommended、authorizations・session・idp・invoked_by optional。api_activity: actor・api・src_endpoint required、resources recommended、profiles [trace]。authorize_session の説明は引用どおり。metadata: version required（引用どおり）、tenant_uid recommended、sequence optional（dictionary の説明は引用どおり）、correlation_uid・is_truncated・untruncated_size・loggers・logged_time・processed_time あり。record_integrity は attestation_list（optional）を追加し "may be applied to any event class"。attestation の説明文中の prev_event に関する一文は引用どおり。fingerprint・digital_signature は algorithm・serialization を持つ（§5.1 ADR-015 の記述も確認） | なし |
| [^3] | ocsf.io | #2 | 支持 | "an open-source project, delivering an extensible framework for developing schemas, along with a vendor-agnostic core security schema"、"November 19, 2024 ... becoming a Linux Foundation Project"、"licensed under the Apache License 2.0"。GitHub API のライセンスも Apache-2.0 | なし |
| [^4] | DMTF DSP0262 1.0.0 PDF | #10〜#14, §2-1 | 部分支持 | 表紙: Version 1.0.0、Date 2014-06-19、Document Status: DMTF Standard。Table 3 の必須要素 5 つ、§4.2.2 の observer の一文、§4.5.1 の control の定義、Table 13 の REASON "must be included"、A.3.4 の control 時 action の SHALL、A.4.5 の outcome root 値の SHALL、§1.2.1 の Data Chaining と署名の記述は全て一致。ずれ: §2-1 は「認可 decision 専用の標準イベントクラスは CADF にもない」としていたが、CADF には OCSF のようなイベントクラスの仕組みがない。eventType "control" は "the application of a policy or business rule, or more generally express the outcome of a decision making process" を表し、"attempted resource access" を例示する型として定義されている | §2-1 を「CADF にはイベントクラスの仕組みがなく、汎用の eventType control で表す」に修正 |
| [^5] | dmtf.org/standards/cadf | #10, §4 | 支持 | 仕様一覧: DSP2038 1.1.0（16 Apr 2015、Informational）、DSP0262 1.0.0（19 Jun 2014、Standard）、DSP2038 1.0.0（16 Sep 2014）、DSP2028 1.0.0a（27 Jun 2012、Historical）。DSP0262 の後続版はない。RS-10 が「未確認」としていた DSP2038 1.1.0 の公表日は、このページで確認できた | #10、§4、§6-14、[^5] に DSP2038 の日付と区分を追記 |
| [^6] | NIST OSCAL SP 800-53 Rev 5.2.0 カタログ JSON | #15, #32, #33, §2-4 | 支持 | metadata: version 5.2.0、last-modified 2026-05-11T16:01:09。AU-3 a〜f、AU-3(3)（"identified in the privacy risk assessment"）、AU-5 a・b、AU-5(2)、AU-5(4)（選択肢 full system shutdown / partial system shutdown / degraded operational mode、"unless an alternate audit logging capability exists"、選択は one-or-more）、AU-8（UTC / 固定オフセット / オフセット付き）、AU-9 a・b、AU-9(2)（"physically different system or system component"）、AU-9(3)、AU-10 が一致 | なし |
| [^7] | W3C Trace Context（REC 2021-11-23） | #16〜#18, §2-2 | 支持 | §6 "Tracing vendors MUST NOT use traceparent and tracestate fields for any personally identifiable or otherwise sensitive information. The only purpose of these fields is to enable trace correlation."、§6.1 "Random number generators MUST NOT rely on any information that can potentially be user-identifiable."、§6.2 "Vendors MUST NOT include any personally identifiable information in the tracestate header."、§7.2 "When distributed tracing is enabled on a service with a public API and naively continues any trace with the sampled flag set, a malicious attacker could ..."、§8.2 "Randomly generated value of trace-id SHOULD be preferred ..."。全て一致 | なし |
| [^8] | W3C Trace Context Level 2 | #18, §4 | 支持 | "W3C Candidate Recommendation Draft 28 March 2024"（This version: CRD-trace-context-2-20240328）。Status に "adds the random trace ID flag"。random trace ID flag は trace-flags の第 2 最下位ビット | なし |
| [^9] | W3C Baggage（CR Snapshot 2024-05-30） | #19 | 部分支持 | 状態・日付、Privacy の "Systems MUST assess the risk of header abuse."、Security の "Application owners should either ensure ..." は一致。ずれ: 「上限は list-member 64 個、合計 8192 bytes」は原典の構造と異なる。原典は、baggage-string が 64 list-member 以下かつ 8192 bytes 以下なら platform は全 list-member を伝播しなければならない（MUST）とし、超える場合は条件を満たすまで落としてよい（MAY）とする。送信の禁止上限ではない | #19 を MUST / MAY の構造どおりに修正。[^9] の参照箇所を補記 |
| [^10] | opentelemetry-specification v1.61.0 trace/sdk.md | #22, §2-2 | 支持 | 冒頭 "**Status**: Stable, except where otherwise specified"。Sampler 節に個別の Status 指定はない。"DROP - IsRecording will be false, the Span will not be recorded and all events and attributes will be dropped."、"RECORD_ONLY - IsRecording will be true, but the Sampled flag MUST NOT be set."。v1.61.0 のリリースは 2026-09-14T14:53:49Z（GitHub API）で最新 | なし |
| [^11] | 同 v1.61.0 baggage/api.md | #20 | 支持 | "**Status**: Stable"、"To avoid sending any name/value pairs to an untrusted process, the Baggage API MUST provide a way to remove all baggage entries from a context." | なし |
| [^12] | opentelemetry.io Baggage（Concepts） | #21 | 支持 | "Sensitive Baggage items can be shared with unintended resources, like third-party APIs. This is because automatic instrumentation includes Baggage in most of your service's network requests."、baggage は span・metric・log の attribute と "unassociated ... without explicitly adding them"。RS-10 は本文で「仕様本体ではない解説文書」と性格を明記しており妥当 | なし |
| [^13] | PCI DSS v4.0 SAQ D for Service Providers PDF（April 2022） | #23〜#26, #77, §2-3, §2-4, §2-12 | 部分支持 | 10.2.1、10.2.1.1〜10.2.1.7、10.2.2 の 6 項目、10.3.1〜10.3.4、10.5.1（"at least 12 months, with at least the most recent three months immediately available"）、10.7.2（Logical access controls、Audit logging mechanisms、Audit log review mechanisms を含む。"applies to all entities"、2025-03-31 まで best practice）、10.7.3（復旧、障害期間の記録等）は全て一致。ずれ: §2-3 の「PCI DSS 10.2.1.x の列挙は…である」が 10.2.1.1（カード会員データへの個別アクセス）と 10.2.1.6 の「初期化」を落としていた | §2-3 の列挙を 7 項目に補完 |
| [^14] | PCI SSC Bulletin（2024-10-15） | #27 | 支持 | "15 October 2024"、v4.0.1 用 SAQ の公開、"The SAQs for PCI DSS v4.0 will remain active until PCI DSS v4.0 is retired on 31 December 2024." | なし |
| [^15] | PCI Perspectives Blog topic: PCI DSS | #27 | 支持 | "Request for Comments: PCI Data Security Standard (PCI DSS) v4.0.1 / Posted by Alicia Malone on 3 Jun, 2026 / From 3 June to 20 July ..." | なし |
| [^16] | Delegated Regulation (EU) 2024/1774（Cellar） | #30, #31, #78, §2-4, §2-12 | 支持 | OJ L 2024/1774、25.6.2024。Art.12(1)、(2)(a)〜(f)（(d) "measures to protect logging systems and log information against tampering, deletion, and unauthorised access at rest, in transit, and, where relevant, in use"、(e) "measures to detect a failure of logging systems"）、保持期間の決定方法。Art.23(2) 末尾 "automated alerts based on pre-defined rules to identify anomalies affecting the completeness and integrity of the data sources or log collection" | なし |
| [^17] | Implementing Regulation (EU) 2024/2690（Cellar） | #28, #29, #78, §2-3, §2-4 | 支持 | OJ L 2024/2690、18.10.2024。Art.1 の対象列挙。Annex 3.2.3（"Where appropriate, logs shall include:" (b)(c)(d)(e)(k) が RS-10 の列挙と一致）、3.2.5（"maintain and back up logs for a predefined period"）、3.2.6（"To the extent feasible" の時刻同期、冗長化、"The availability of the monitoring and logging systems shall be monitored independent of the systems they are monitoring."） | §2-3 に "Where appropriate" の限定を明記（[^13] の修正と同時） |
| [^18] | OMB M-21-31 PDF | #34, #78 | 支持 | 日付 August 27, 2021。p.6 "logging facilities and log information must be protected by cryptographic methods from tampering and unauthorized access"、"Traps shall be put in place to monitor these data streams for disruption. These traps shall be monitored."。Table 5 の Identity & Credential Management 等の保持 "12 Months Active Storage" / "18 Months Cold Data Storage" | なし |
| [^19] | CSRC SP 800-92 Rev.1 ipd ページと PDF | #35 | 支持 | "Date Published: October 11, 2023"、"Comments Due: November 29, 2023 (public comment period is CLOSED)"。本文 TS-3.5、TS-3.7、TS-3.8 は引用どおり | なし |
| [^20] | CSRC Log Management プロジェクト | #35, #36 | 支持 | "NIST is in the process of addressing public comments on Draft Special Publication (SP) 800-92 Revision 1"、"This document replaces the original SP 800-92" | なし |
| [^21] | CSRC SP 800-92 final | #36 | 支持 | "Date Published: September 2006"、"09/13/06: SP 800-92 (Final)" | なし |
| [^22] | RFC 9162 | #37, #38, §2-5 | 支持 | Category: Experimental、December 2021、Obsoletes: 6962。§1 の superset の一文、"misbehaving log that shows different, inconsistent views of itself to different clients. Therefore, it is necessary to treat each log as a trusted third party."、防止の仕組みは "outside the scope of this document"。§2.1.4 "Merkle consistency proofs prove the append-only property of the tree." | なし |
| [^23] | RFC 9943 | #39, #40, §2-5 | 部分支持 | Standards Track（RFC Editor の status: PROPOSED STANDARD）、June 2026。§8 の "TSs can leverage VDSs that only retain cryptographic metadata (e.g., a hash) ..." は一致。ずれ: (a) §5.1.3 は "This VDS MUST support the following security requirements" として Append-only、Non-equivocation、Replayability の 3 つを挙げる。RS-10 は 2 つとしていた。(b) §8 の PII の記述は小文字の "Issuers must carefully review"（BCP 14 の規範語ではない） | #39 を 3 要件に修正。#40 に小文字 must である旨を注記。[^23] の参照箇所を補記 |
| [^24] | RFC 9942 | #41, §2-5 | 支持 | Standards Track（PROPOSED STANDARD）、June 2026。§5 RFC9162_SHA256、§5.2 Inclusion Proof、§5.3 Consistency Proof | なし |
| [^25] | AWS CloudTrail log file integrity validation | #43 | 支持 | "SHA-256 for hashing and SHA-256 with RSA for digital signing"、"Every hour, CloudTrail also creates and delivers a file ..."、"Each digest file also contains the digital signature of the previous digest file if one exists."、"assert positively that no log files were delivered to your account during a given period of time" | なし |
| [^26] | Amazon S3 Object Lock | #44, #45, §2-6 | 部分支持 | WORM、Versioning 必須、compliance mode（root を含め上書き・削除不可、短縮不可、"The only way to delete an object under the compliance mode before its retention date expires is to delete the associated AWS account."）、governance mode の迂回条件、legal hold に期限なし、version ID 指定の削除は 403・指定なしは 200 と delete marker、Cohasset の評価の記載は全て一致。ずれ: §2-6 の「主要クラウドの WORM は、保持期間中の削除を構造上許さない」は、同じ原典が迂回可能とする governance mode を含めた一般化になっていた | §2-6 を「保持を固定した状態（compliance mode 等）では」に限定し、固定前の状態は迂回・変更できることを併記 |
| [^27] | Azure immutable storage overview（ms.date 2026-08-18） | #46, #80, §2-6 | 部分支持 | ms.date 2026-08-18。ロック済み policy は削除不可・延長可・短縮不可、container レベルの延長は最大 5 回、1〜146,000 日、SEC 17a-4(f) 準拠にはロックが必要で未ロックは短期テスト用、version レベルの変更は "aren't audited"、追加の容量課金なし、version レベル WORM の versioning 費用、policy 操作の transaction 課金は全て一致。ずれ: §2-6 の一般化は、未ロック policy が短縮・削除できるという同じ原典の記述と合わない | [^26] と同じ修正 |
| [^28] | Google Cloud Storage Bucket Lock（Last updated 2026-09-30） | #47, §2-6 | 支持 | "Locking a bucket's retention policy is an irreversible action."、"You cannot delete a bucket with a locked policy unless every object in the bucket has met the retention period."、"3,155,760,000 seconds (100 years)"、Last updated 2026-09-30 UTC | なし |
| [^29] | eCFR 17 CFR 240.17a-4 | #48, #78 | 部分支持 | (f)(2)(i)(A) の audit trail 方式（全ての変更・削除、時刻、再現可能性）、(B) "Preserve the records exclusively in a non-rewriteable, non-erasable format"、(ii) "Verify automatically the completeness and accuracy of the processes for storing and retaining records electronically" は一致。同条の最終改正 2024-08-02（versioner API）も一致。ずれ: 脚注の「2026-09-01 時点で取得」は、eCFR の表示（Title 17 は up to date as of 2026-10-01）と合わない | [^29]、§4 の書誌を「eCFR は up to date as of 2026-10-01」に修正 |
| [^30] | GDPR（Cellar、OJ L 119 4.5.2016） | #49〜#52, #70, §2-8, §2-12, §4 | 部分支持 | 前文 26・49、Art.4(5)、5(1)(e)、17(1)・(3)(b)(e)、25(1)、32(1)(a)、33(1)・(5)、44・46・49 の文言は全て一致。ずれ: §4 の公表日 2016-04-27 は採択（署名）日で、官報掲載は 2016-05-04（脚注 [^30] 自体は 2016-05-04 と正しく記載） | §4 を「2016-04-27 採択、2016-05-04 官報掲載」に修正 |
| [^31] | CJEU C-579/21 判決（Cellar） | #60, §2-9 | 支持 | 判決主文 2: 照会操作の日時と目的は Art.15(1) で得られる情報。従業員の身元は、権利の実効的行使に不可欠で従業員の権利と自由を考慮した場合を除き対象外。事案は内部監査部門による照会（para 184 付近） | なし |
| [^32] | CJEU C-413/23 P 判決（Cellar） | #53 | 支持 | 2025-09-04 First Chamber。para 86 "pseudonymised data must not be regarded as constituting, in all cases and for every person, personal data ..."、para 76（SRB は追加情報を持ち、仮名化後も個人的性格を保つ）、para 77（Deloitte にとって個人的性格を持たない条件）。事案は規則 2018/1725。ECLI:EU:C:2025:645 は判決本文の取得版に記載がなかったため、EDPB-EDPS Joint Opinion 2/2026 の脚注 19（[^36]）で確認した | なし |
| [^33] | EDPB CEF 2025 報告書 PDF | #59 | 部分支持 | §4.2.6 "it might not always be advisable to modify or delete information from back-ups. But, in that case, organisations should have appropriate procedures to keep track of erasure requests and comply with them on restored systems"、推奨 "Verify that erasure has been carried out and be able to demonstrate such erasure."、§4.2.7 の "pseudonymisation or partial masking" の指摘は一致。ずれ: 採択日。報告書表紙は "Adopted on 10 February 2026"。RS-10 の 2026-02-18 は EDPB のプレスリリース（"Brussels, 18 February"）の日付だった | #59、§4、[^33] を「2026-02-10 採択、2026-02-18 公表」に修正 |
| [^34] | EDPB Guidelines 02/2025 v1.1 PDF | #55, §2-7 | 支持 | "Version 1.1 / Adopted on 08 April 2025 / Adopted - version for public consultation"。§4.2 の "technical impossibility cannot be invoked ..."、"encrypted personal data is still personal data ..."、"at least until the algorithm is broken"、鍵付き・salt 付きハッシュは個人データ、鍵・salt 消去後は "should not be linkable ... provided that the algorithm has not been broken, the keys have not been compromised or leaked"、存在証明（pointer、commitment、keyed hash）を鎖上に置く推奨。§4.3 "When deletion has not been taken into account by design, this may require deleting the whole blockchain." | なし |
| [^35] | EDPB 意見募集ページ（転送先） | §4, §6-4 | 支持 | "Guidelines 01/2025 on Pseudonymisation / Closed for feedback / Feedback period 17 January - 14 March 2025 (23:59 CET)" | URL を転送先に更新。§4 に意見募集期間と採択日（2025-01-16、Joint Opinion 2/2026 の脚注の記載）を補記 |
| [^36] | EDPB-EDPS Joint Opinion 2/2026 PDF | #54 | 支持 | "Adopted on 10 February 2026"。para 11 の Art.4(1) 追加文案（"Information relating to a natural person is not necessarily personal data for every other person or entity, merely because another entity can identify that natural person. ..."）、"goes far beyond a targeted modification of the GDPR"、Art.33 の 72 時間から 96 時間への変更、COM(2025) 836 final | なし |
| [^37] | CSRC SP 800-88 Rev.2 ページと PDF | #56, #57, §2-7 | 支持 | "Date Published: September 2025"、"Supersedes: SP 800-88 Rev. 1 (12/17/2014)"。§3.1.2 "For an ISM that takes the form of logical/virtual storage (e.g., cloud storage), cryptographic erase may be the only viable purge sanitization technique option."、§3.2.2 の平文未保存の前提（ISO/IEC 27040）、"For such situations, CE may not be an acceptable sanitization technique."、"Sanitization using CE should not be trusted on ISM that have been backed up or escrowed unless ..."、§3.2.3 "all copies of the target cryptographic keys must be able to be sanitized"、§3.2.5 の証跡項目（key escrow or injection、error condition handling 等）。CSRC の Planning Note（2026-07-17）は FAQ の案内で、状態の変更ではない | なし |
| [^38] | AWS KMS Delete an AWS KMS key | #58 | 部分支持 | 不可逆、復号不能、7〜30 日（既定 30 日）の待機期間、"Scheduling the deletion of a KMS key might not immediately affect data keys"、CloudHSM の "AWS KMS does not delete the key material from cluster backups." は一致。ずれ: 原典は「復号できなくなる」に例外（"The only exceptions are multi-Region replica keys and asymmetric and HMAC KMS keys with imported key material."）を付けており、RS-10 はこれを落としていた。crypto-shredding の完了判定に直結する。待機期間が最大 24 時間延びる点も未記載だった | #58 に例外と 24 時間の延長を追記し、例外鍵種別の扱いを [D] で追加。[^38] の参照箇所を補記 |
| [^39] | California leginfo Civ. Code 1798.105 | #61 | 支持 | (d)(2) "Help to ensure security and integrity to the extent the use of the consumer's personal information is reasonably necessary and proportionate for those purposes."、(d)(8) "Comply with a legal obligation."、"Amended November 3, 2020, by initiative Proposition 24 ... Effective December 16, 2020. Operative January 1, 2023" | なし |
| [^40] | eCFR 45 CFR Part 164 Subpart C | #62, #78 | 部分支持 | §164.312(b) "Standard: Audit controls. Implement hardware, software, and/or procedural mechanisms that record and examine activity ..."、§164.316(b)(2)(i) "Retain the documentation required by paragraph (b)(1) of this section for 6 years ..., whichever is later." は一致。ずれ: [^29] と同じく、脚注の「2026-09-01 時点で取得」は eCFR の表示（Title 45 は up to date as of 2026-10-01）と合わない。両条の版は 2016-12-30（versioner API） | [^40]、§4 の書誌を修正 |
| [^41] | EDPB Guidelines 05/2021 v2.0 PDF | #71〜#73, §2-10 | 支持 | "Version 2.0 / Adopted on 14 February 2023"。3 つの累積要件、"remote access from a third country (even if it takes place only by means of displaying personal data on a screen, for example in support situations, troubleshooting or for administration purposes) and/or storage in a cloud situated outside the EEA ..."、Example 11、Example 12（第三国法の適用を受ける EU 内 processor）、第三国法の衝突・政府アクセスのリスク | なし |
| [^42] | 欧州委員会 Adequacy decisions ページ | #74, #75, §2-11 | 支持 | 日本の第 1 回見直し報告（4 April 2023）、英国の更新（Renewal ... 19 December 2025）、米国（"commercial organisations participating in the EU-US Data Privacy Framework"、Adequacy decision 10 July 2023） | なし |
| [^43] | OJ C/2025/6610（Cellar） | #76, §2-11 | 支持 | "Appeal brought on 31 October 2025 by Philippe Latombe against the judgment of the General Court ... delivered on 3 September 2025 in Case T-553/23"、OJ 22.12.2025。原判決の取消しと Implementing Decision (EU) 2023/1795 の取消しを求める（予備的に差戻し） | なし。§2-11、#76 に EDPB 書簡（[^55]）を追加 |
| [^44] | e-Gov 法令 API（415AC0000000057、現行版） | #63, #66, #68, §2-12 | 支持 | 取得版の改正履歴 ID は 415AC0000000057_20261001_507AC0000000070（日本学術会議法による改正、2026-10-01 施行）で脚注と一致。第 22 条（努めなければならない）、第 23 条（講じなければならない）、第 26 条第 1 項・第 2 項、第 28 条第 1〜3 項、第 35 条第 5 項・第 6 項ただし書は引用・要約どおり | なし |
| [^45] | e-Gov 法令 API（law_revisions と各改正履歴の law_data） | #67, §2-15, §4 | 部分支持 | 令和 8 年法律第 56 号の公布日 2026-07-17、施行日 2027-01-17 と 2028-07-16（"公布の日から起算して二年を超えない範囲内において政令で定める日"）の改正履歴、未施行版の第 26 条第 2 項ただし書と第 148 条の 3 は一致。ずれ: 同法には施行日 2026-07-17 の改正履歴もある。同法附則第 1 条によると、附則第 13 条・第 16 条は公布の日、附則第 17 条は令和 8 年法律第 46 号の公布の日とこの法律の公布の日のいずれか遅い日（2026-07-17）に施行済みである。「2026-10-03 時点では未施行」は本則についてだけ正しい | §2-15、#67、§4、§6-10、[^45] を「本則は未施行、附則第 13 条・第 16 条・第 17 条は 2026-07-17 施行」に修正 |
| [^46] | PPC ガイドライン（通則編）令和 8 年 6 月一部改正 PDF | #64〜#67 | 部分支持 | 表紙「平成 28 年 11 月（令和 8 年 6 月一部改正）」。速報の目安「概ね 3～5 日以内」（p.64）、確報 30 日・60 日（p.66）、3-8-5-1 の接続認証ログの事例（p.140）、外的環境の把握（p.182）は一致。ずれ: 10（別添）組織的安全管理措置で、「利用状況等を記録することも重要である」とシステムログ等の手法の例示（p.173）は「(2) 個人データの取扱いに係る規律に従った運用」に属する。RS-10 はこれらを「(3) 取扱状況を確認する手段の整備」の説明として一続きに書いていた | #64 を (2) と (3) に分けて書き直し。[^46] の参照箇所に p.66 と (2)・(3) を補記 |
| [^47] | PPC ガイドライン（外国第三者提供編）令和 7 年 12 月一部改正 PDF | #68 | 支持 | 表紙「平成 28 年 11 月（令和 7 年 12 月一部改正）」。同等水準の外国は「EU及び英国が該当する」、EU は平成 31 年告示第 1 号の国（「ただし、英国は含まない。」）。第 28 条第 3 項の相当措置の継続的実施の確保（規則第 18 条第 1 項）の節がある | なし |
| [^48] | PPC Q&A（Web 版） | #69, §2-10 | 部分支持 | A7-53（取り扱わないこととなっている場合の例「契約条項によって…取り扱わない旨が定められており、適切にアクセス制御を行っている場合等」）、A12-3（外国事業者が外国に設置したサーバでも同様。令和 3 年 9 月更新）、A12-4 の引用文、A10-25（所在国名とサーバ所在国名を明らかにし本人の知り得る状態に置く）、A6-22（令和 5 年 12 月更新）は一致。ずれ: (a) §2-10 の「外国の名称の公表が要る」は、原典では「本人の知り得る状態（本人の求めに応じて遅滞なく回答する場合を含む。）に置く」で、公表に限られない。(b) A12-4 のただし書（外国事業者が日本国内で個人情報データベース等を事業の用に供している場合は該当しない）が落ちていた | §2-10 の表現を原典どおりに修正。#69 に A12-4 のただし書を追記 |
| [^49] | Okta Help Center System Log filters and search | #79, §2-13 | 支持 | "Events are retained by Okta for 90 days. Specifying a longer range will result in an error." | なし |
| [^50] | Microsoft Entra data retention（ms.date 2026-01-06） | #79, §2-13 | 支持 | ms.date 2026-01-06。Audit logs・Sign-ins: Free 7 日、P1・P2 30 日。Azure Monitor 経由で storage へ送れば延長可能。Microsoft Graph activity logs は "Data isn't retained unless it's archived to a storage account or integrated with analytics tools." | なし |
| [^51] | AWS CloudTrail event history | #79, §2-13 | 支持 | "a viewable, searchable, downloadable, and immutable record of the past 90 days of management events in an AWS Region"、data events を表示しない、"For an ongoing record of events in your AWS account, create an event data store or a trail." | なし |
| [^52] | Amazon S3 storage classes | #80, §2-14 | 支持 | Standard-IA・One Zone-IA・Glacier IR の最小課金 128 KB、最小保管期間 Standard-IA 30 日・Glacier IR 90 日・Flexible Retrieval 90 日・Deep Archive 180 日、脚注 *・** の 40 KB（32 KB はアーカイブ料金、8 KB は Standard 料金）、復元が必要 | なし |
| [^53] | CSRC SP 800-53 Rev.5 出版ページ | #15 | 支持 | "Date Published: September 2020 (includes updates as of Dec. 10, 2020)"、Planning Note（08/27/2025）"On August 27, 2025, NIST issued a minor release of SP 800-53 (Release 5.2.0)"、"A list of all the changes in the patch release is available ..."。NIST は minor release と patch release の両方の語を使っている | §4 の状態欄に両方の表記を併記 |

## 4. RS-10 に加えた修正（版 0.1 → 0.2）

| # | 箇所 | 修正内容 | 理由（脚注） |
|---|---|---|---|
| 1 | 冒頭メタ情報・前文・凡例 | 版を 0.2、状態を review にした。依存文書に本記録を加えた。前文の「第三者による原典照合はまだ行っていない」を、AI による独立照合の実施と本記録の所在、追加脚注 [^54]・[^55] の明示に改めた。凡例の非拘束文書の列挙に EDPB 議長の書簡を加えた | — |
| 2 | §2-1 | CADF について「専用イベントクラスはない」を、「イベントクラスの仕組みがなく、汎用の eventType control で表す」に改めた。OCSF の部分は維持した | [^4] |
| 3 | §2-3 | 全件記録の下限の文を [N] から [D]（RS-10#23, #28 から導出）に分け、NIS2 実施規則の列挙が "Where appropriate" 付きであることを [N] で明記した。PCI DSS 10.2.1.x の列挙に、カード会員データへの個別アクセスと監査ログの初期化を補った | [^13], [^17] |
| 4 | §2-6 | WORM が削除を許さないのは保持を固定した状態（compliance mode、ロック済み policy、ロック済み Bucket Lock）に限ると明記し、governance mode と未ロック policy が迂回・変更できることを併記した | [^26], [^27] |
| 5 | §2-10 | 「外国の名称の公表」を「所在国名等を本人の知り得る状態（求めに応じた回答を含む）に置く」に改めた | [^48] |
| 6 | §2-11, #76, §4, §6-7 | EDPB 議長が 2026-07-31 付で、Trump v. Slaughter 判決（2026-06-29）が DPF 十分性認定の機能に影響するかを精査するよう欧州委員会に求めた書簡を、一次資料として追加した。書簡は十分性認定を無効としたものではないことを [D] で明記した | [^55]（追加） |
| 7 | §2-15, #67, §4, §6-10 | 令和 8 年法律第 56 号の「未施行」を、「本則の改正規定は未施行。附則第 13 条・第 16 条・第 17 条は 2026-07-17 施行。附則第 1 条第 3 号の規定は 6 月経過日（2027-01-17）施行」に精緻化した | [^45] |
| 8 | #10, §4, §6-14 | DSP2038 1.1.0 の公表日（2015-04-16）と区分（Informational）を追記し、「公表日は未確認」を解消した | [^5] |
| 9 | #19 | Baggage の 64 個・8192 bytes を「上限」から、「この範囲なら全件伝播が MUST、超えれば MAY drop」に改め、送信側の禁止上限ではない旨を [D] で加えた | [^9] |
| 10 | #27, §4, §6-1 | PCI DSS v4.0.1 の公表日を、二次情報由来の「2024-06（未確認）」から、PCI SSC の告知による 2024-06-11 に改めた。限定改訂で要件の追加・削除がないことを追記した。§4 の URL を告知に差し替えた。v4.0.1 本体の文言差は未確認のまま残した | [^54]（追加） |
| 11 | #39 | RFC 9943 §5.1.3 の MUST の対象を、Append-only・Non-equivocation・Replayability の 3 要件に改めた | [^23] |
| 12 | #40 | PII の検討義務が小文字の "must"（BCP 14 の規範語ではない）であることを注記した | [^23] |
| 13 | #58 | AWS KMS の「削除後は復号できない」に原典の例外（multi-Region replica key、imported key material の非対称鍵・HMAC 鍵）と、待機期間が最大 24 時間延びる点を追記した。crypto-shredding 用の鍵でこれらを避けるか全コピーを消す必要があることを [D] で加えた | [^38] |
| 14 | #59, §4, [^33] | CEF 2025 報告書の採択日を 2026-02-18 から 2026-02-10 に修正し、2026-02-18 は公表日であると明記した | [^33] |
| 15 | #64 | 組織的安全管理措置の記述を、(2) 規律に従った運用（記録の重要性とシステムログ等の手法の例示）と (3) 取扱状況を確認する手段の整備に分けて書き直した | [^46] |
| 16 | #69 | PPC Q&A A12-4 のただし書（国内で個人情報データベース等を事業の用に供している場合は該当しない）を追記した | [^48] |
| 17 | §4 | GDPR の公表日を「2016-04-27 採択、2016-05-04 官報掲載」に、17a-4・HIPAA の版を eCFR の表示（up to date as of 2026-10-01、各条の版）に、EDPB 01/2025 の期間と採択日、SP 800-53 の表記、DPF の状態を補記した。EDPB 書簡の行を追加した | [^29], [^30], [^35], [^40], [^53], [^55] |
| 18 | 参考文献 | [^29]・[^40] の「2026-09-01 時点で取得」を eCFR の表示に修正した。[^33] の題名・採択日、[^35] の URL（転送先）、[^5]・[^9]・[^23]・[^38]・[^45]・[^46] の参照箇所を修正・補記した。[^54]・[^55] を追加した | 上記 |
| 19 | §6-17 | 検証の状態を「作成者以外の AI による突合を実施、人間のレビュアによる突合は未実施」に改めた | — |

## 5. 検証不能・二次情報の扱い

- **検証不能の脚注**: 0 件。全 53 脚注の原典を取得し、該当箇所を確認できた。W3C と EUR-Lex は curl では取得できなかったが、§1 の別経路で原文を取得できた。
- **二次情報だけを根拠にしていた主張**: 1 件。§4 の PCI DSS v4.0.1 の公表月（2024-06）は、RS-10 自身が「二次情報。未確認」と注記していた。PCI SSC の告知（[^54]）で 2024-06-11 と確認し、一次資料に差し替えた。
- **RS-10 が「未確認」としたまま残した事項（検証者も一次資料で解消できなかったもの）**:
  - C-703/25 P の判決・法務官意見の有無（§6-7）。tavily の検索結果は二次情報（法律事務所・解説記事）で、いずれも係属中としていたが、CURIA の事件ページは bot 判定で取得できず、一次資料での確認はできなかった。根拠には使っていない。
  - Digital Omnibus 提案（COM(2025) 836）の立法状態（§6-6）。一次資料を確認していない。
  - 令和 8 年法律第 56 号の成立日（種資料の 2026-07-10）と、政令・規則・ガイドラインの内容（§6-10）。
  - EDPB Guidelines 01/2025・02/2025 の final 版の有無（§6-4）。
  - PCI DSS v4.0.1 本体の文言（§6-1）。PCI SSC の document library は利用許諾への同意を要するため取得していない。
- **検証者が二次情報から手掛かりを得て一次資料で確認した事項**: Trump v. Slaughter 判決後の EDPB 書簡。手掛かりは解説記事（tavily の検索結果）だが、本文の根拠は EDPB が公開した書簡 PDF（[^55]）だけである。米国最高裁判決の本文は読んでいないため、判決の内容は書簡の記載としてだけ RS-10 に書いた。

## 6. 検証の限界

- 照合は 2026-10-03 時点で各ページが表示した内容に対して行った。クラウド事業者・IdP の文書（[^25]〜[^28], [^38], [^49]〜[^52]）は随時改訂される。
- PDF は pdftotext のテキスト抽出で照合した。PCI DSS SAQ D の表組みと PPC ガイドラインの 2 段組み（手法の例示の表）は抽出で行が混ざるため、該当箇所はレイアウト保持の抽出と前後の文脈で読み直して帰属を確認した（[^13] の 10.3.3／10.3.4、[^46] の (2)／(3)）。
- W3C の 3 文書は、curl での取得を W3C が拒否したため、tavily_extract と WebFetch の抽出結果で照合した。規範語を含む文は tavily_extract が返した原文で確認したが、HTML 原本を直接全文検索したわけではない。
- CJEU C-413/23 P の ECLI は判決本文の取得版に含まれていなかったため、EDPB-EDPS Joint Opinion 2/2026 の脚注で確認した。
- 規範文の法的解釈（例: GDPR Art.17(3) の適用範囲、個人情報保護法第 28 条の「提供」該当性）と、[D] で書かれた設計推論の妥当性は、検証の対象外である。法務・DPO と人間のレビュアによる確認が別途必要である。
- 検証者は RS-10 の ID の食い違い（traceability/deliverables.md では本テーマが RS-11）を確認していない。RS-10 §6-16 の記載のまま残した。
