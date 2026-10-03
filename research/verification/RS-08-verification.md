# RS-08 原典照合記録（独立検証）

> 文書ID: RS-08-VER / 版: 0.1 / 状態: review / 最終更新: 2026-10-03
> 対応要求: RS-08 と同じ（R-058, R-059, R-060, R-061, R-062, R-011, R-071, R-164, R-165, R-168, R-172, R-207）
> 依存文書: CONVENTIONS.md, research/RS-08-pep-completeness-tenant-isolation.md（照合対象。照合前は版 0.1、修正後は版 0.2）

本記録は、RS-08 の作成者とは別の AI エージェント（Claude）のセッションが、2026-10-03 に行った原典照合の結果である。CONVENTIONS §4 の「作成者以外による検証」に当たるが、照合者も AI であり、人間の第三者による照合ではない。実在の CTO / CISO のレビューでもない。

---

## 1. 方法

- 対象は RS-08 版 0.1 の脚注 [^1]〜[^69]（69 件）と、各脚注を付けた本文の主張である。対象範囲は §2 結論サマリ、§3 調査結果、§4 ステータス表である。
- 全 69 件の URL を確認日 2026-10-03 に取得した。取得できなかった原典はない。
  - GitHub 上の原典（OWASP ASVS / API Security / LLM Top 10 / Cheat Sheet、Semgrep rules、OpenTelemetry spec、OpenFGA API 定義）は raw.githubusercontent.com から Markdown・YAML・JSON の原文を取得した。
  - NIST SP 800-53 / 53A / 53B の統制文・評価方法・ベースラインは、usnistgov/oscal-content の catalog JSON（version 5.2.0）と LOW / MODERATE / HIGH の profile JSON を取得し、プログラムで照合した。
  - SP 800-207 と AI 100-2 E2025 は nvlpubs.nist.gov の PDF を取得し、テキストを抽出して頁番号を確かめた。
  - Web 文書（PostgreSQL、PgBouncer、AWS、GitHub Docs、CodeQL、CWE、OpenAPI、Istio、GraphQL、AuthZed、OpenFGA、Elastic、Microsoft Learn、Google Cloud、Snowflake、OWASP WSTG、Semgrep docs）は HTML を取得してテキスト化し、引用文を文字列検索で突き合わせた。AWS whitepaper の冒頭表示だけは WebFetch で確かめた。
  - 版と日付は、GitHub Releases API（gh api。認証付き）、IETF Datatracker の doc.json と文書ページ、CSRC の出版物ページ、各文書の document history で確かめた。
- 判定区分は次のとおりである。
  - 支持: 主張・引用文・強度・版・日付が原典と一致する。
  - 部分支持: 原典に根拠はあるが、言い換えが不正確、条件の脱落、見出しの取り違えなどがある。
  - 不支持: 原典に根拠がない、または原典と矛盾する。
  - 検証不能: 原典を取得できない、または該当箇所を特定できない。
- 規範の強度（MUST / SHOULD / MAY、must / should、ASVS のレベル）は、原文の該当文で確かめた。

---

## 2. 集計

| 区分 | 件数 |
|---|---|
| 脚注の総数（照合対象） | 69 |
| 取得できた原典 | 69 |
| 支持 | 63 |
| 部分支持 | 6（[^7], [^24], [^33], [^36], [^48], [^53]） |
| 不支持 | 0 |
| 検証不能 | 0 |
| 照合時に追加した脚注 | 2（[^70] SP 800-53B の CSRC 出版物ページ、[^71] CVE-2016-2193 の勧告ページ） |

部分支持の 6 件は、いずれも脚注の原典自体は正しかった。問題は本文の言い換えにあった。このほか、脚注の事実は支持されるが、そこから導いた設計推論 [D] に穴がある箇所が 2 件あった（§4 の C-1、C-2）。

---

## 3. 脚注ごとの判定

「対象主張」は、脚注が付いた RS-08 の項目番号（#n）または結論サマリの番号（§2-n）である。

### 3.1 OWASP ASVS 5.0.0

| 脚注 | 原典 | 対象主張 | 判定 | 照合結果 |
|---|---|---|---|---|
| [^1] | ASVS 5.0.0 What is the ASVS | #1 | 支持 | "only contains requirements (must) ..." の引用は一致した。L1 約 20%、L2 約 50%（L1+L2 で約 70%）、L3 約 30%、`v<version>-...` 形式の推奨も一致した。GitHub release `v5.0.0_release` の公開日は 2025-05-30 で、§4 と一致した |
| [^2] | ASVS V8 | §2-1, §2-8, #2〜#5, #6, #57 | 支持 | 8.1.1=L1、8.1.2=L2、8.2.1=L1、8.2.2=L1、8.2.3=L2、8.3.1=L1、8.3.2=L3、8.3.3=L3、8.4.1=L2 で、いずれも一致した。8.3.2 の「mitigating controls ... must」と "would not mitigate information leakage" も一致した。V8 全文（8.1.1〜8.4.2）に棚卸しや coverage の自動検証を求める要件がないことも確かめた |
| [^3] | ASVS V13 | #6, #22 | 支持 | 13.1.1=L2、13.4.5=L2 は一致した。脚注の参照箇所に挙げた 13.2.2 は本文で使われていない（誤りではないため修正していない） |
| [^4] | ASVS V14 | #80 | 支持 | 14.1.2=L2 で、"access controls around sensitive data in logs" を含むことを確かめた |
| [^5] | ASVS V15 | #10, #58 | 支持 | 15.3.1=L1、15.3.3=L2、15.4.2=L3（TOCTOU）は一致した |
| [^6] | ASVS V16 | §2-4, §2-13, #34, #80 | 支持 | 16.3.2 は要件レベル 2 で、"For L3, this must include logging all authorization decisions" を含む。16.1.1、16.2.3、16.2.5、16.4.2、16.4.3 は L2 で一致した |
| [^7] | ASVS V4 | #22 | 部分支持 | 4.1.3=L2 は一致した。4.3.2 の条件は原文では「GraphQL API を他者が使う意図がない限り（unless the GraphQL API is meant to be used by other parties）」である。ノートは「意図しない限り」と書いており、条件の中身が落ちていた。→ 修正した |

### 3.2 OWASP API Security Top 10 2023、Cheat Sheet、WSTG、LLM Top 10

| 脚注 | 原典 | 対象主張 | 判定 | 照合結果 |
|---|---|---|---|---|
| [^8] | API1:2023 | #8, #9 | 支持 | 2 つの引用文と予防策の "Write tests ... Do not deploy changes that make the tests fail." は一致した。強度は小文字の should で、ノートの表記どおりである |
| [^9] | API3:2023 | #10 | 支持 | `to_json()` 回避と "schema-based response validation ... extra layer of security" は一致した |
| [^10] | API5:2023 | #11 | 支持 | "should deny all access by default"、"consistent and easy-to-analyze authorization module"、URL パスで判断しない旨は一致した |
| [^11] | API9:2023 | #21 | 支持 | API ホストと連携サービスの棚卸し、"Generate documentation automatically ... CI/CD pipeline"、非本番で本番データを使う場合の should は一致した |
| [^12] | API Top 10 2023 Release Notes | #7 | 支持 | "forward-looking awareness document" の引用と、Excessive Data Exposure と Mass Assignment の統合は一致した。公表月日は原典に記載がなく、ノートの「未確認」の扱いは妥当である |
| [^53] | OWASP Authorization Cheat Sheet | #33, #39 | 部分支持 | "Validating permissions correctly on just the majority of requests is insufficient." と、単体・結合試験が pentest の代替にならない旨は一致した。ただし「規範語はない」という記述は不正確である。原文は "Permission should be validated ..." と小文字の should を使っており、§3 の凡例（小文字の should はそのまま写す）とも食い違っていた。→ 修正した |
| [^54] | WSTG v4.2 WSTG-ATHZ-04 | #39 | 支持 | 引用文と「全箇所の洗い出し」は一致した。v4.2 の GitHub release 日は 2020-12-03 で、§4 と一致した |
| [^68] | OWASP LLM08:2025 | §2-12, #74 | 支持 | マルチテナント環境での context leakage と、"permission-aware vector and embedding stores" の引用文は一致した。原稿ファイルの最終コミットは 2025-10-27 で、§4 と一致した |

### 3.3 NIST

| 脚注 | 原典 | 対象主張 | 判定 | 照合結果 |
|---|---|---|---|---|
| [^13] | CSRC SP 800-53 Rev.5 upd1 ページ | #12, §4 | 支持 | Date Published は September 2020（includes updates as of Dec. 10, 2020）である。Planning Note (08/27/2025) で Release 5.2.0 を確かめた |
| [^14] | OSCAL catalog 5.2.0 | §2-1, §2-13, #12, #13, #15〜#18, #78, #80 | 支持 | AC-3、AC-3(8)、AC-3(9)、AC-4（discussion の引用を含む）、AC-6(9)、AC-6(10)、AC-25（statement と "always invoked property ..."）、SC-4（covert channel を対象外とする記述）、CP-9 d、CP-9(8)、AU-9 a/b、SA-11(1) の文言は一致した。AC-3 と AC-25 の TEST 対象（"Mechanisms implementing access control policy" / "... access enforcement functions"）も一致した。catalog の metadata version は 5.2.0 である |
| [^15] | OSCAL baseline profiles 5.2.0 | §2-1, #14, #18, #78 | 支持 | include-controls をプログラムで照合し、#14 の表の全セルが一致した。AC-25 はどこにもない。AC-3 は全部にある。AC-4、AC-6(1)、AC-6(9)、AC-6(10)、SC-4、CP-9(8) は MODERATE と HIGH にある。AC-3(8)、AC-3(9)、AC-4(21)、SA-11(1) はどこにもない |
| [^16] | CSRC SP 800-53A Rev.5 ページ | #12, §4 | 支持 | Date Published は January 2022 で、Release 5.2.0 は 2025-08-27 である |
| [^17] | SP 800-207 | #19 | 支持 | 引用文は PDF の印刷頁 p.5（§2）にあり、PEP の定義は p.10（§3）にある。"must be as small as possible" は小文字の must で、ノートの表記どおりである |
| [^69] | NIST AI 100-2 E2025 | §2-12, #73 | 支持 | p.7 の Attacker Goals and Objectives（§2.1.2 内、§2.1.3 の直前）に、data reconstruction、membership inference、training data extraction、attribute inference、property inference が列挙されている。p.46 の §3.3.2 は PII、RAG データベース、system prompt を抽出対象に挙げている。CSRC ページで Date Published March 2025 と、2025-06-03 付の誤記注記を確かめた |

### 3.4 PostgreSQL / PgBouncer

| 脚注 | 原典 | 対象主張 | 判定 | 照合結果 |
|---|---|---|---|---|
| [^18] | PG18 §5.9 Row Security Policies | §2-5, #40, #44, #76 | 支持 | default-deny、BYPASSRLS と superuser の常時迂回、owner と FORCE、TRUNCATE / REFERENCES が対象外であること、"prior to any conditions ..."（leakproof は例外）、参照整合性の covert channel、副問合せの race condition、row_security とバックアップ（"disastrous"）は一致した。ページ上部に "Current (18)" と「2026-09-24 PostgreSQL 19 Beta 4 Released」が表示されていることも確かめた |
| [^19] | ALTER TABLE | #41 | 支持 | FORCE は既定で無効（"If disabled (the default)"）で、一致した |
| [^20] | CREATE ROLE | #41 | 支持 | "NOBYPASSRLS is the default"、および BYPASSRLS を付与できるのは superuser か BYPASSRLS を持つロールだけであること、は一致した |
| [^21] | CREATE VIEW | §2-5, #45 | 支持 | 既定では view owner のポリシーと権限で評価され、security_invoker=true なら呼出し元のもので評価される。一致した |
| [^22] | SET | §2-6, #48 | 支持 | SET はコミット後 session 終了まで続き、SET LOCAL はトランザクション終了までである。一致した |
| [^23] | §9.28.1 Configuration Settings Functions | #48, #50 | 支持 | Table 9.95 の current_setting（missing_ok）と set_config（is_local）は一致した。ただし #50 の fail-closed 設計は、原典が保証する範囲（設定が「存在しない」場合にエラー）を超えて読める書き方だったため、注記を加えた（§4 C-3） |
| [^24] | pg_dump | §2-13, #76 | 部分支持 | #76 の引用は原典と一致した。しかし §2-13 の「既定で RLS を無効化して全行を取得する」は不正確である。原典では、pg_dump は `row_security` を off にする。row_security=off は RLS を迂回せず、絞り込みが起きる場合はエラーにする（[^25]、[^18]）。→ §2-13 を修正した |
| [^25] | §19.11.1 row_security | #76 | 支持 | "When set to off, queries fail which would otherwise apply at least one policy" と、BYPASSRLS ロールと superuser には効かないことは一致した。節番号も 19.11.1 Statement Behavior で一致した |
| [^26] | §29.11 Logical Replication Security | #77 | 支持 | SUPERUSER も BYPASSRLS も持たない場合に publisher のポリシーが実行され得ること、`options=-crow_security=off` で複製が停止することは一致した |
| [^27] | CVE-2024-10976 | §2-6, #46 | 支持 | 説明文、引用文、修正版（17.1 / 16.5 / 15.9 / 14.14 / 13.17 / 12.21、2024-11-14）、CVSS 3.0 = 4.2、先行 CVE への言及は一致した |
| [^28] | CVE-2023-2455 | §2-6, #47 | 支持 | 関数のインライン化に関わる経路であること、修正版（15.3 / 14.8 / 13.11 / 12.15 / 11.20、2023-05-11）は一致した |
| [^29] | PgBouncer features | §2-6, #49 | 支持 | "breaks a few session-based features" と、機能表で SET/RESET が transaction pooling では Never であることは一致した。PgBouncer 1.26.0 の公開は 2026-09-23（GitHub release とサイトのニュース）で一致した |
| [^30] | PgBouncer config | §2-6, #49 | 支持 | 引用文と既定値 DISCARD ALL は一致した。なお `server_reset_query_always` を有効にすると全モードで実行される（既定は off）。ノートの記述は既定動作の説明として正しい |

### 3.5 AWS

| 脚注 | 原典 | 対象主張 | 判定 | 照合結果 |
|---|---|---|---|---|
| [^31] | SaaS Tenant Isolation Strategies | §2-7, #52, #53 | 支持 | "This whitepaper is for historical reference only." の表示と、Publication date: August 1, 2020 を確かめた。基本則 3 点（"should not represent an opportunity to lower your isolation requirements" を含む）、broad IAM scope、isolation manager、"agreed upon convention" の引用、共有ライブラリ・ラッパーによる隠蔽は一致した |
| [^32] | Well-Architected SaaS Lens | §2-7, #54 | 支持 | Publication date: April 4, 2023 で、初版は 2020-12-03 である。"Isolate all tenant resources"、pool モデルの難しさを分離要件を緩める理由にしないこと、引用文は一致した |
| [^33] | SaaS Lens SEC 2（WA Tool） | #54 | 部分支持 | ノートは、SEC 2 のベストプラクティスを「IAM で表現できない資源はアプリ強制ポリシーで守る」「厳格な分離が要る資源は silo 化する」の 2 点としていた。原典のベストプラクティスの見出しは "Use coarse-grained constructs, application-enforced policies, or both" と "Apply a combination of IAM and application-enforced policies" である。silo 化と SQS のテナント専用キューは Improvement Plan の項目である。→ 見出しと出所を正確に書き直した |
| [^34] | Prescriptive Guidance（PostgreSQL） | §2-5, #42 | 支持 | "RLS is required ..." の引用、実行時変数方式を "preferred" とすること、例が ENABLE と current_setting だけで FORCE を含まないことは一致した。document history は初版 2021-09-30、更新 2024-04-29 で一致した |
| [^35] | IAM policy variables | #55 | 支持 | `${aws:PrincipalTag/team}` を s3:prefix 条件とリソース ARN に使う例を確かめた |
| [^36] | STS session tags | #55 | 部分支持 | 原典は「API 操作の権限に加えて、permissions-only action の sts:TagSession が必要」と書いている。信頼ポリシーへの付与が必須と明記されているのは、IdP に連携したロールについてである。ノートの「ロールの信頼ポリシーには sts:TagSession 権限が要る」は一般化しすぎていた。→ 修正した |
| [^37] | S3 presigned URL | §2-13, #81 | 支持 | "presigned URLs are bearer tokens ..."、有効期限まで複数回使えること、CLI / SDK で最長 7 日（コンソールは 1 分〜12 時間）、作成に使った資格情報が失効すると URL も失効すること（原文は "In general"）は一致した |

### 3.6 GitHub / SAST / CWE

| 脚注 | 原典 | 対象主張 | 判定 | 照合結果 |
|---|---|---|---|---|
| [^38] | Troubleshooting the REST API | #24 | 支持 | X-Accepted-GitHub-Permissions の引用文と、カンマ（AND）とセミコロン（代替集合）の例は一致した |
| [^39] | Permissions required for GitHub Apps | #24, #25 | 支持 | ノートと同じ方法（article body API で取得し、`` | ` `` で始まる行を計数）で再計数し、1,090 行を得た。#25 の [M] の値は再現した |
| [^40] | Permissions required for fine-grained PATs | #24, #25 | 支持 | 同じ方法で 1,056 行を得た。再現した |
| [^41] | Semgrep rule ideas | §2-3, #30 | 支持 | Flask の認証デコレータの例と、"If deployed in CI/CD pipelines ..." の引用は一致した |
| [^42] | semgrep-rules C# missing-or-broken-authorization | §2-3, #31 | 支持 | 4 種の属性（AllowAnonymous / Authorize / Roles / Policy）の pattern-not、severity INFO、confidence MEDIUM、CWE-862 は一致した |
| [^43] | semgrep-rules Rails check-unscoped-find | §2-3, #31 | 支持 | taint モード、sources（params / cookies / request.env）、sinks（find / find_by_id / find_by_id!）、CWE-639、`current_user.accounts.find(...)` の修正例は一致した |
| [^44] | CodeQL cs/web/missing-function-level-access-control | §2-3, #28 | 支持 | Precision: medium、CWE-285/284/862、csharp-security-extended / security-and-quality、機微操作の説明は一致した |
| [^45] | CodeQL cs/web/insecure-direct-object-reference | §2-3, #28 | 支持 | Precision: medium、CWE-639、スイートは一致した |
| [^46] | CodeQL CWE coverage | §2-3, #29 | 支持 | 表を解析して確かめた。CWE-639 に対応するのは C# IDOR と JS CORS 2 件である。CWE-862 に対応するのは C# 3 件（うち 1 件は空パスワード設定）、Java の URL 検証、JS の CORS と空パスワードである。Web endpoint の認可欠落そのものを対象とするのは C# の 2 件だけ、という読み取りは一致した。CWE-284 / 285 には `java/tainted-permissions-check` 等の user-controlled bypass 系クエリがあるが、認可チェックの欠落を検出するものではない。ノートの §6-6 の留保はそのまま妥当である |
| [^47] | MITRE CWE 4.20 | #20 | 支持 | CWE-862、639、566 の Description は一致した。各ページの表題は「(4.20)」で、変更履歴に「CWE 4.20, 2026-04-30」がある |

### 3.7 標準・仕様（OpenAPI、OpenTelemetry、IETF）

| 脚注 | 原典 | 対象主張 | 判定 | 照合結果 |
|---|---|---|---|---|
| [^48] | OpenAPI 3.2.1 | §2-2, #23 | 部分支持 | #23 の引用文と節番号（§4.10 Operation Object、§4.30 Security Requirement Object）は一致した。GitHub release "OAS 3.2.1 Released!" は 2026-09-10 である。ただし §2-2 の「空 requirement `{}` や空配列で認証要件を外せる」は不正確である。原典では、`{}` を含めると「任意（optional）」になり、空配列で top-level 宣言が「外れる」。→ §2-2 を修正した |
| [^49] | OpenTelemetry Spec v1.61.0 Trace API | #26 | 支持 | SpanKind の引用（SERVER / CONSUMER が incoming、PRODUCER / CONSUMER が deferred execution）は一致した。文書の Status は "Stable, except where otherwise specified" である。v1.61.0 の release は 2026-09-14 で一致した |
| [^55] | draft-ietf-oauth-transaction-tokens-11 | #59 | 支持 | Datatracker で状態を確かめた。rev 11（2026-07-30）、Expires 2027-01-31、WG state「WG Consensus: Waiting for Write-Up」、IESG state「I-D Exists」で、§4 と一致した。§6 の "MUST be used only for the expected duration"、"TTS MUST NOT issue ... if the expiration time has passed"、引用文は一致した。ただし同じ §6 の「Txn-Token 自体の有効期間は提示 token の期限を超えてよい（MAY）」と、それに伴う SHOULD の記述が #59 になかった。剥奪（R-143）に関わるため、追記した |

### 3.8 ベンダー文書（mesh、GraphQL、認可エンジン、検索、DWH）

| 脚注 | 原典 | 対象主張 | 判定 | 照合結果 |
|---|---|---|---|---|
| [^50] | Istio AuthorizationPolicy reference | §2-14, #36 | 支持 | 評価順 CUSTOM → DENY → ALLOW と、"If there are no ALLOW policies for the workload, allow the request." は一致した。Istio 1.31.1 の release は 2026-09-21 で一致した |
| [^51] | Istio Security concepts | #36 | 支持 | "deny by default" が ALLOW ポリシーが 1 つ以上ある場合に限られることと、allow-nothing から始める "good security practice" は一致した |
| [^52] | graphql.org Authorization | #37 | 支持 | 引用文と single source of truth は一致した |
| [^56] | SpiceDB Consistency | §2-8, #60 | 支持 | minimize_latency を単独で使うと New Enemy Problem の窓が生じること、at_least_as_fresh の引用文は一致した。SpiceDB v1.56.2 の release は 2026-09-11 で一致した。ただし、この事実から導いた §2-8 と #61 の設計推論には穴があった（§4 C-1） |
| [^57] | SpiceDB Querying Data | §2-10, #67 | 支持 | LookupResources は cursoring に対応し、"more than 10k results" で性能問題を起こし得ること、CheckBulk による事後フィルタ、Materialize の評価は一致した |
| [^58] | OpenFGA Search with Permissions | #65 | 支持 | Option 1〜3、局所索引方式で返却前に Check すること、マルチテナントでの "not ideal, but it can be a reasonable trade-off" は一致した |
| [^59] | OpenFGA API（swagger） | §2-10, #66 | 支持 | 打切り条件と "two identical calls can give a given different set of objects" は一致した。この打切り条件は非ストリーミング版の ListObjects のものである。StreamedListObjects は deadline だけで制限される。この区別を §2-10 と #66 に明記した（精度の補足であり、誤りではない） |
| [^60] | OpenFGA Configuration | §2-10, #66 | 支持 | listObjectsDeadline の既定は 3s、listObjectsMaxResults の既定は 1000（非ストリーミング応答）で一致した。OpenFGA v1.21.0 の release は 2026-09-20 で一致した |
| [^61] | Elastic DLS / FLS | §2-9, #62 | 支持 | 引用文、グローバル統計にスコアへの DLS が効かないこと、許可外文書は返されないこと、suggester が無視されること、読取り専用アカウントを前提とすることは一致した |
| [^62] | Microsoft Graph connectors items | #64 | 支持 | ACL の構成（Entra のユーザー / グループ / Everyone）、deny が grant に優先すること、外部グループの所属を item の ACL に展開しないことは一致した |
| [^63] | BigQuery RLS intro | §2-11, #69 | 支持 | 比較表（authorized views、row-level access policies、separate tables）の文言と、"total number of rows must be secret" は一致した。Last updated 2026-09-30 UTC |
| [^64] | BigQuery RLS with features | #70 | 支持 | copy job の TRUE filter とポリシーの複製、ポリシーなし表での上書き時の削除（append は例外）、extract job が閲覧可能行だけを出力することは一致した |
| [^65] | BigQuery column-level | #71 | 支持 | Fine-Grained Reader と、`SELECT *` がエラーになることは一致した |
| [^66] | Snowflake row access policies | #71 | 支持 | Enterprise Edition 以上であること、dynamic secure view、制限事項（CHANGES 句、外部表を mapping table に使えないこと）は一致した |
| [^67] | Snowflake column-level security | #71 | 支持 | Dynamic Data Masking と External Tokenization の 2 方式、Enterprise Edition 以上であることは一致した |

---

## 4. 修正内容

### 4.1 部分支持の是正（本文の言い換えの修正）

| ID | 箇所 | 修正前 | 修正後 | 根拠 |
|---|---|---|---|---|
| P-1 | §2-2 | 空 requirement `{}` や空配列で認証要件を外せる | `{}` を含めるとセキュリティが任意になり、空配列で top-level 宣言が外れる | [^48] |
| P-2 | §2-13 | pg_dump は既定で RLS を無効化して全行を取得する | `row_security` を off にし、全行を取得するか、迂回できないロールではエラーになる（黙って欠けない）。したがってバックアップ主体は RLS を迂回できる特権ロールになる[D] | [^24][^18][^25] |
| P-3 | #22 | 4.3.2: 意図しない限り本番の GraphQL introspection を無効化 | 他者に使わせる意図がない限り、本番の introspection を無効化 | [^7] |
| P-4 | #33 | 強度は推奨であり、規範語はない | 推奨。原文は小文字の should で、RFC 2119 の強度表現ではない | [^53] |
| P-5 | #54 | SEC 2 の BP を「アプリ強制ポリシー」「silo 化（SQS 専用キュー）」の 2 点と記述 | BP の見出し 2 つを原文どおりに記し、silo と SQS は Improvement Plan の項目と明記した | [^33] |
| P-6 | #55 | ロールの信頼ポリシーには sts:TagSession が要る | API 操作の権限に加えて sts:TagSession の許可が要る。信頼ポリシーへの付与が必須と明記されているのは IdP 連携ロール | [^36] |

### 4.2 設計推論 [D] の是正と、未確認事項の明示

| ID | 箇所 | 問題 | 修正 |
|---|---|---|---|
| C-1 | §2-8、#61(b) | enqueue 時点の ZedToken を `at_least_as_fresh` に渡す再 Check で、剥奪後の実行を防げるかのように読めた。原典 [^56] が保証するのは「指定時点以上に新しいデータ」だけである。enqueue 後の剥奪が反映されるとは限らない | §2-8 と #61(b) に、`fully_consistent` を使うか、剥奪の書込み時点以降の ZedToken を使う必要があることを [D] として追記した。選択は M-07 で決めるとした |
| C-2 | #59 | 原典 §6 にある「Txn-Token の有効期間は提示 token の期限を超えてよい（MAY）」と、それに伴う SHOULD が抜けていた。剥奪（R-143）の議論に直接関わる | MAY と SHOULD を原文の強度で追記した。上流 token の失効後も Txn-Token が残り得ることを [D] として追記した |
| C-3 | #50、§5.2 M-05、§6-8 | 「`current_setting` を missing_ok なしで呼べば、未設定時はエラーで fail-closed」という設計は、原典が「設定が存在しない」場合のエラーしか保証していない。同じ session で一度 `SET LOCAL` したカスタム変数が、トランザクション終了後に「存在しない」状態へ戻るかどうかは、原典で確認できなかった | 「未確認」と明記して結論から外した。M-05 の測定項目に加え、§6-8 に未確認事項として載せた |

### 4.3 精度の補足と、原典の追加

| ID | 箇所 | 内容 |
|---|---|---|
| A-1 | §2-10、#66 | OpenFGA の 1000 件・3 秒の打切りは非ストリーミング版の ListObjects のものであり、StreamedListObjects は deadline だけで制限されることを明記した（[^59][^60]） |
| A-2 | #14、§4、§6-5 | CSRC の SP 800-53B 出版物ページを確認した。Date Published は September 2020（2020-12-10 の更新を含む）で、Release 5.2.0（2025-08-27）は "includes no changes to the baselines" である。[^70] を追加し、§4 の「CSRC の出版物ページは未確認」を解消した |
| A-3 | §2-6、§6-8 | CVE-2016-2193 の勧告ページ（"Plan cache might use wrong role context for RLS policy"、9.5.2、2016-03-31）を確認した。[^71] を追加し、§6-8 の「勧告本文の言及で知っただけ」を解消した |
| A-4 | 冒頭、§6-1 | 独立照合を実施したことを記した（版 0.1 → 0.2）。照合者も AI であることを明記した |

§2 結論サマリと §4 ステータス表は、上の修正と整合させた。具体的には §2-2、§2-6、§2-8、§2-10、§2-13 と、§4 の SP 800-53B の行である。§4 のそれ以外の行の版・状態・日付は、§3 の照合で一致を確かめた。

---

## 5. 検証不能・未確認として残る事項

脚注の原典はすべて取得でき、検証不能と判定した脚注はない。次の事項は、ノート内で「未確認」のまま残る。いずれも結論には使われていない。

| 事項 | 理由 |
|---|---|
| OWASP API Security Top 10 2023 の公表月日 | release notes に日付がない。owasp.org のプロジェクトページは照合時に 404 を返し、確認できなかった |
| OWASP Top 10 for LLM Applications 2025 の公表月日 | genai.owasp.org の一覧ページに公表日の記載がなかった。原稿ファイルの最終コミット日（2025-10-27）だけを確かめた |
| `SET LOCAL` 後のカスタム変数の見え方（C-3） | PostgreSQL の公式文書（SET、§9.28.1、§19.16 Customized Options）に記述がない。実測（M-05）で確かめる必要がある |
| GitHub の内部での permission 宣言の検証方法（#25） | 非公開であり、公開文書からは確認できない |

---

## 6. 照合者の所見（修正していないもの）

- [^3] の参照箇所に 13.2.2 が挙がっているが、本文では使われていない。誤りではないため残した。
- [^37] の「作成に使った資格情報が失効すると URL も失効する」は、原文では "In general" という限定が付いている。設計の結論は変わらないため、本文は修正していない。
- [^30] の reset query の記述は、既定値（`server_reset_query_always` が off）での動作として正しい。設定次第で全モードで実行される点は、結論に影響しないため追記していない。
- #25 の [M] の値（1,090 行 / 1,056 行）は、照合時に同じ方法で再現した。ただし生データは本照合でもリポジトリに保存していない。
