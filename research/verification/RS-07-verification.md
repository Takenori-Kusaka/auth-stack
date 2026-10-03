# RS-07 独立検証記録（脚注の原典照合）

> 文書ID: RS-07-V / 版: 0.1 / 状態: review / 最終更新: 2026-10-03
> 対応要求: R-142〜R-152, R-190, R-205, R-208（RS-07 の対応要求に準ずる）
> 依存文書: CONVENTIONS.md, research/RS-07-authz-engines-consistency.md（検証対象。検証後に版 0.1 から 0.2 へ改訂）

本記録は、RS-07 の作成者とは別の AI エージェント（Claude）が 2026-10-03 に行った脚注の原典照合のログである。検証者も AI であり、人間のレビュアによる照合ではない。判定は検証者の読解によるもので、CTO/CISO の決裁ではない。

---

## 1. 検証の方法

| 項目 | 内容 |
|---|---|
| 対象 | RS-07 版 0.1 の全脚注 [^1]〜[^64]（64 件）と、各脚注が付いた本文の主張（§2 結論サマリ、§3 調査結果、§4 ステータス表） |
| 取得 | 全 64 脚注の URL を 2026-10-03 に取得した（全て HTTP 200）。文言・数値・規範語（MUST/SHOULD/MAY 等）を逐語で照合するため、curl で原文を取得し、HTML はテキスト化、PDF は pdftotext で抽出して全文検索した。WebFetch は小型モデルによる要約を返すため、照合には使わなかった。補助に WebSearch を 1 回使った（SpiceDB の AuthZEN 対応の探索。結論には使っていない） |
| 補助確認 | GitHub のライセンス・最新リリースは GitHub API（gh api）で確認した。Cedar 論文の正式版書誌は Crossref API（DOI 10.1145/3649835）で確認した。arXiv の版履歴は arXiv の abs ページで確認した |
| 転送 | [^27]（AuthZed Materialize）と [^41]（AVP マルチテナンシー）は、記載 URL から別 URL へ転送された。内容は同じ文書で、脚注の URL を転送先に更新した。[^28] は GitHub の blob URL と同じファイルを raw.githubusercontent.com から取得した |
| 判定区分 | 支持: 脚注の参照箇所が主張を全て裏付ける。部分支持: 主張の核心は裏付けられるが、限定条件・版・日付・帰属・用語のいずれかが原典とずれる。不支持: 原典が主張を裏付けない、または反する。検証不能: 原典を取得できない、または該当箇所が見つからない |
| 規範強度 | AuthZEN（[^52]〜[^54]）の MUST / SHOULD / MAY / RECOMMENDED / REQUIRED / OPTIONAL を、仕様本文の該当文と 1 文ずつ照合した |

## 2. 判定の集計

| 判定 | 件数 | 脚注 |
|---|---|---|
| 支持 | 53 | 下表の「支持」 |
| 部分支持 | 11 | [^7], [^15], [^16], [^18], [^27], [^37], [^46], [^49], [^54], [^62], [^63] |
| 不支持 | 0 | — |
| 検証不能 | 0 | — |

部分支持の 11 件は、いずれも RS-07 版 0.2 で修正した（§4）。出典を差し替えたのは [^18] と [^37] の 2 件、URL を転送先に更新したのは [^27] と [^41] の 2 件である。

## 3. 脚注ごとの判定表

凡例: 「主張」は脚注が付いた RS-07 の項目番号（#n）と結論サマリの番号（§2-n）。

| 脚注 | 原典（取得先） | 主張 | 判定 | 照合結果（原典の該当箇所） | 修正 |
|---|---|---|---|---|---|
| [^1] | Zanzibar 論文 PDF（USENIX ATC 2019） | #1, #2, §2-12 | 支持 | Abstract "trillions of access control lists and millions of authorization requests per second"、"95th-percentile latency of less than 10 milliseconds and availability of greater than 99.999% over 3 years"。§1 "more than two trillion ACLs" | §2-12 に [^1] を追加 |
| [^2] | 同上 §2.2 | #4, #5, #6, §2-1 | 支持 | 例 A・例 B、"two key consistency properties: external consistency ... and snapshot reads with bounded staleness"、TrueTime、単一スナップショットでの評価、zookie を内容と原子的に保存、content-change check は同一トランザクション不要 | なし |
| [^3] | 同上 §2.1, §2.4 | #5, #9, #12, §2-5 | 支持 | §2.4 の API は Read / Write / Watch / Check / Expand。§2.4.4 content-change check は zookie なしで最新スナップショットで評価。§2.4.5 Expand は "crucial ... to build efficient search indices"。§2.4.3 Watch で二次索引を維持。union / intersection / exclusion | なし |
| [^4] | 同上 §3.2.1, §3.2.2 | #7 | 支持 | 既定 staleness を out-of-zone 読取の確率から統計的に決める。"purely a performance optimization"、"always respects zookies"。config も要求ごとに単一スナップショット時刻 | なし |
| [^5] | 同上 §3.2.4 | #8 | 支持 | 一部の namespace で Leopard を使う。オフライン索引と増分層（Watch API）。1 tuple の変更が "tens of thousands of discrete Leopard tuple events" になり得る | なし |
| [^6] | 同上 §3.2.5, §3.2.6 | #10 | 支持 | 分散キャッシュ、lock table、"one or ten seconds" への丸め、"the most critical frontier"。クライアントごとの CPU 上限、(object, client) ごとの同時読取上限、クライアント別 lock table キー | なし |
| [^7] | 同上 §4〜§4.4（Table 2） | #1, #2, #3, #6, #8, §2-12 | 部分支持 | 数値は全て一致した（Table 2: Safe Check p50 3.0 / p95 9.46 / p99 15.0、Recent Check 2.86 / 60.0 / 76.3、Write 127.0 / 233.0 / 401.0。Leopard 1.56M QPS、150µs 未満、p99 1ms 未満）。ずれは 2 点。(a) #1 の「測定条件: 2018 年 12 月の 7 日間」は、論文上は API 別ピーク QPS にだけ付いた条件で、1,500 namespace・2 兆 tuple・1,000 万 QPS 等には期間の記載がない。(b) §2-12 の「p95 < 10ms は Safe 要求の値」は論文の記述ではなく推論。論文は全 Check の値として述べている | #1 の測定条件の帰属を修正。§2-12 を「論文は全体値として述べ、Table 2 で 10ms を下回るのは Safe Check。全体値が Safe に支配されると読める [D]」に修正 |
| [^8] | 同上 §4.5, §5 | #11 | 支持 | "Freshness requirements are often but not always loose"、hedging、performance isolation。TAO は "eventual global consistency ... best-effort read-after-write" | なし |
| [^9] | openfga.dev Query Consistency Modes | #13, #14, #15, §2-1, §2-4 | 支持 | MINIMIZE_LATENCY（既定）/ HIGHER_CONSISTENCY、"might not be taken in consideration"、"OpenFGA caching is disabled by default ... strong consistency regardless of the consistency mode"、"used by Check and partially in ListObjects"、"considering a similar feature in future releases" | なし |
| [^10] | openfga.dev Configuring OpenFGA | #16, #19, #23, §2-1, §2-4 | 支持 | `--datastore-secondary-uri`、HIGHER_CONSISTENCY は primary に自動で回す、通常読取はレプリカ、"Potential for read-after-write inconsistencies (replica lag)"。memory / postgres / mysql / sqlite（memory は再起動でデータ消失）。"not recommended to enable experimental features for anything other than experimentation" | なし |
| [^11] | openfga.dev Configuration（表示 v1.20.0） | #15, #19, §2-2 | 支持 | 表示 "configuration options for the OpenFGA server v1.20.0"。checkQueryCache.ttl 10s、cacheController.enabled false・ttl 10s、resolveNodeLimit 25、maxTuplesPerWrite 100、maxTypesPerAuthorizationModel 100、listObjectsDeadline 3s、listObjectsMaxResults 1000。最新リリース v1.21.0 と表示版が違う点は RS-07 §6 に既に記載あり | なし |
| [^12] | openfga.dev Running in Production | #17 | 支持 | "it will increase the staleness of OpenFGA's responses"。DB は "Co-located in the same physical datacenter" かつ "Used exclusively for OpenFGA" | なし |
| [^13] | openfga.dev Immutable Authorization Models | #18 | 支持 | "strongly recommend passing, especially in production"、"If this field is not passed, OpenFGA will use the last created Authorization Model"、ULID、shadow checks、gradual rollouts | なし |
| [^14] | openfga.dev Relationship Queries | #20, §2-5 | 支持 | "results found within the time allotted (listObjectsDeadline, default: 3s) up to ... (listObjectsMaxResults, default: 1000)"、ストリーミング版あり | なし |
| [^15] | openfga.dev Search With Permissions | #21, §2-5 | 部分支持 | 3 方式と、方式 (2) の最後に Check を呼ぶ点は一致。ずれ: 方式 (3) の推奨条件は「アクセスし得る対象が少ない（~1000）**かつ**全体に占める割合も低い」で、要約表は「3 or 2」。RS-07 は割合の条件を落としていた。§2-5 の「約 1,000 件を超える場合 (2) を推奨」は、原典では「件数が十分多く、割合が低い場合」 | #21 と §2-5 に割合の条件を追加 |
| [^16] | openfga.dev Conditions | #22, §2-8 | 部分支持 | CEL、32KB、CEL コスト上限 100、保存 context が要求 context に優先する点は一致。ずれ: 原典は "can be used to represent some ABAC policies"（一部の ABAC）。512KB は要求 context の上限ではなく、サーバ全体の要求サイズ上限（"at this time"）で、要求 context 自体は "not explicitly limited" | #22 を原典どおりに修正 |
| [^17] | openfga.dev AuthZEN API (Experimental) | #23, #68, §2-7 | 支持 | "experimental and must be explicitly enabled. The API surface may change"、`--experimentals=authzen`、/stores/{store_id}/access/v1/…、Check / BatchCheck / ListObjects / ListUsers への対応、"does not support pagination"、contextual tuples 不可。追加で確認した事項: モデル ID は独自ヘッダ `Openfga-Authorization-Model-Id`、"does not currently echo back client-provided request IDs" | 確認した追加事項を #23, #68, §2-7 に追記（AuthZEN §10.1.3 の MUST との不一致を [D] で明記） |
| [^18] | openfga.dev Store File Format → 差替え後 openfga/cli README | #24, §2-13 | 部分支持 | 旧出典には `fga store export` のコマンド例（"Export store configuration to file"）しかなく、「モデルと tuple を書き出す」は書かれていなかった。公式リポジトリ openfga/cli の README は、モデルと tuple を書き出すこと、`--max-tuples` の既定が 100 であること、`--model-id` 省略時は最新モデルであることを記載していた | 出典を openfga/cli README に差し替え。#24、§2-13、§5.1、§6 に「tuple は既定 100 件まで」を追記 |
| [^19] | cncf.io/projects/openfga | #25, #71, §2-11 | 支持 | "accepted to CNCF on September 14, 2022 and moved to the Incubating maturity level on October 28, 2025" | なし |
| [^20] | GitHub openfga/openfga Release v1.21.0 | #25, §4 | 支持 | リリース日時 2026-09-20T16:27:53Z。ライセンスはリリースページには出ないため GitHub API で確認（Apache-2.0）。gh api の latest も v1.21.0 | なし |
| [^21] | authzed.com SpiceDB Consistency | #26〜#29, §2-1, §2-3 | 支持 | Defaults 表（Write/Delete/ReadSchema/WriteSchema は fully_consistent、他は minimize_latency）、"this can lead to a window of time where the New Enemy Problem can occur"、Snapshot Expired と `--datastore-gc-window`、CockroachDB の注記（max_offset 既定 500ms）、"ZedToken is the SpiceDB equivalent of Google Zanzibar's Zookie"、text または varchar(1024) | なし |
| [^22] | authzed.com Read-After-Write Consistency | #28, #29（追記）, §2-3（追記） | 支持 | 窓は "primarily controlled by ... --datastore-revision-quantization-interval (default: 5 seconds)"、max-staleness-percent と follower-read delay も影響。追加で確認した事項: 比較表で fully_consistent を "Guaranteed read-after-write" と、datastore の条件なしで記載 | Consistency ページとの食い違いを #29、§2-3、§6 に追記 |
| [^23] | authzed.com Datastores | #30, #31 | 支持 | 推奨 datastore 一覧（MySQL は "Not recommended; only use if you cannot use PostgreSQL"、memdb は開発・結合試験）、"standardized our managed services on CockroachDB"、overlap strategy（static が既定、prefix、request、insecure の "vulnerable to the New Enemy Problem"） | なし |
| [^24] | authzed.com Caveats | #32, §2-8 | 支持 | CEL、PERMISSIONSHIP_CONDITIONAL_PERMISSION と不足フィールドの返却、LookupResources / LookupSubjects の 2 状態 | なし |
| [^25] | authzed.com Querying Data | #33, §2-5 | 支持 | LookupResources は "supports cursoring"、"heavy request ... when more than 10k results"、CheckBulk による後段フィルタ、Materialize。LookupSubjects は "does not support cursoring" | なし |
| [^26] | authzed.com SpiceDB Commands & Parameters | #28, #32, #33, #35, §2-2 | 支持 | --dispatch-max-depth 50、quantization-interval 5s、max-staleness-percent 0.1、gc-window 24h、max-lookup-resources-limit 1000、max-caveat-context-size 4096、write-relationships-max-updates-per-call 1000 | なし |
| [^27] | authzed.com Materialize（転送先 /docs/materialize/getting-started/overview） | #34 | 部分支持 | Accelerated Queries は "generally available to users of AuthZed Dedicated"、Event Streams は "AuthZed Dedicated as part of an early access program"。ずれ: 「OSS 版 SpiceDB には含まれない」は明記されていない（提供対象からの推論）。URL も転送されていた | #34 を原典どおりにし、OSS 不含は [D] に変更。URL を更新 |
| [^28] | authzed/api permission_service.proto（main） | #36, §2-13 | 支持 | "ExportBulkRelationships is the fastest path available to exporting relationships from the server. It is resumable, and will return results in an order determined by the server."、ExportBulkRelationshipsRequest に Consistency | なし |
| [^29] | GitHub authzed/spicedb Release v1.56.2 | #37, §4 | 支持 | リリース日時 2026-09-11T18:01:43Z。GitHub API でライセンス Apache-2.0、latest も v1.56.2 | なし |
| [^30] | arXiv 2403.04651（abs ページと v2 PDF） | #38, #46 | 支持 | v2 は 2024-03-08（v1 は 2024-03-07）。Abstract の RBAC / ABAC / ReBAC、§2.2 "directed acyclic graph (DAG), called the entity hierarchy"、§2.3 effect / scope / conditions。正式版の書誌（PACMPL Vol.8 OOPSLA1、2024-04-29、DOI 10.1145/3649835）は Crossref で一致 | なし |
| [^31] | 同上 §3.5, §3.6 | #39 | 支持 | Lean で証明した性質: Forbid trumps permit / Default deny / Explicit allow / Sound slicing / Validation soundness | なし |
| [^32] | 同上 §4, §4.4 | #42, §2-9 | 支持 | "decidable, sound, and complete encoding"、equivalence / subsumption、"proved ... on paper"、Lean による証明は "underway, as of this writing" | なし |
| [^33] | 同上 §5.2 と脚注 6 | #43, §2-12 | 支持 | m5.4xlarge、Cedar 3.0.1 / Rego 0.61.0 / OpenFGA commit bbb4a07、100,000 要求、データ取得等を除外、28.7×/34.4×/35.2×（OpenFGA）、60.4×/80.8×/42.8×（Rego）、in-memory datastore は "intended mainly for debugging and is not optimized" | なし |
| [^34] | docs.cedarpolicy.com Authorization | #39, #44, §2-8 | 支持 | default deny / forbid overrides permit / skip on error（"it is skipped"）、"your application needs to determine which policies and entity data are relevant" | なし |
| [^35] | docs.cedarpolicy.com Policy validation | #40 | 支持 | validation soundness は schema に従う要求が前提。検出されない誤りは integer overflow、missing entities（"do not confirm the existence of entities"）、extension values（non-strict mode）。strict mode が既定 | なし |
| [^36] | docs.cedarpolicy.com Document history | #46, §4 | 支持 | Cedar 4.5、SDK 4.10.0 - 4.13.0、April 23, 2026 | なし |
| [^37] | GitHub Release v4.8.0 → 差替え後 cedar-policy/CHANGELOG.md | #45, §4 | 部分支持 | 旧出典（v4.8.0、2025-11-17）は `tpe` を experimental と記すが、`partial-eval` は "feature" とだけあり、experimental とは書いていない。「この主体はどの資源に許可されるか」に答えるという用途の記載もない。最新の状態も分からない。CHANGELOG（main）では、[4.13.0] で `tpe` が experimental のまま、[4.6.0] で RFC 95 の TPE と batched evaluation（"permission queries against large databases of entities"）を `tpe` で実装、[4.3.0] で `partial-eval` を experimental feature と記載していた | 出典を CHANGELOG に差し替え、#45 を書き直し。§4 に行を追加 |
| [^38] | cncf.io/projects/cedar | #46, #71, §2-11 | 支持 | "accepted to CNCF on October 8, 2025 at the Sandbox maturity level" | なし |
| [^39] | aws.amazon.com Verified Permissions pricing | #47, #54, §2-10, §2-13 | 支持 | 単発 $0.000005、batch は $0.00015 / $0.000075 / $0.00004、policy 管理 $0.00004、"same pricing for all Regions"。GetPolicy・ListPolicy・BatchGetPolicies の記載あり。#54 の試算（1,000 RPS×30 日=2.592×10⁹ 件→$12,960、10,000 RPS→$129,600）を再計算して一致 | なし |
| [^40] | AVP User Guide Quotas | #48, #53, §2-10 | 支持 | policy store 30,000（Yes）、identity source 1（No）、要求 1MB（No）、schema 100,000 bytes、policy size per resource 200,000 bytes、推移的親 100（No）、IsAuthorized 200 RPS（Yes）、BatchIsAuthorized 30 RPS（Yes）。追加で確認した事項: CreatePolicyStore は 1 RPS（No）、CreatePolicy は 10 RPS/store（Yes） | #53 に追加事項と、1 万 store の作成時間の試算（[D]）を追記 |
| [^41] | AVP User Guide（転送先 design-authz-strategy.html#design-multi-tenancy-considerations） | #51, §2-10 | 支持 | 6 観点の比較表、"Neither strategy will have a large impact on your AWS bill."、global policy 複製は High、off-boarding は表で High・本文で "requires less effort"（食い違いの指摘も原典どおり）。"How to choose" は、テナント固有 policy が不要で identity source が 1 つなら共有 store が最も効果的になりやすいとする | URL を転送先に更新。§2-10 に "How to choose" の条件を追記（[^43] だけでは一方的な要約になっていたため） |
| [^42] | AWS Prescriptive Guidance（AVP multi-tenant design considerations） | #52 | 支持 | "Isolating a tenant prevents inbound and outbound data from being exposed to the wrong tenant. Authorization ensures that a user has the permissions to access a tenant." | なし |
| [^43] | AWS Prescriptive Guidance（Example 3） | #52, §2-10 | 支持 | "Using the Per Tenant Policy Store design pattern is a best practice for maintaining tenant isolation" | §2-10 で Prescriptive Guidance の記述であることを明記 |
| [^44] | AVP API Reference CreatePolicy | #49, §2-1, §2-2 | 支持 | schema 検証に通らない policy は保存されない。"Verified Permissions is eventually consistent. It can take a few seconds for a new or changed element to propagate" | なし |
| [^45] | AVP API Reference IsAuthorized | #50 | 支持 | entities（principal と resource のみ、action は不可）、応答は decision（ALLOW / DENY）・determiningPolicies・errors、errors の例は "a policy references an Entity or entity Attribute that does not exist in the slice" | なし |
| [^46] | OPA Blog（2025-08-20） | #57, §2-11 | 部分支持 | "creators of Open Policy Agent (along with many team members from Styra) have joined Apple"、"remains a CNCF graduated open source project and there are no changes to the project governance or licensing"、メンテナは所属変更のみ、の 3 点は一致。ずれ: Styra のツールについては "We've initiated the community process for these repositories to be included in the CNCF OPA GitHub organization"（手続きの開始）であり、「移されると告知」は言い過ぎ。製品名も原典は "EOPA"。掲載者表示は Tim Hinrichs | #57 を「手続きを開始したと告知」に修正し、移管完了を §6 で未確認とした。脚注の著者表記を修正 |
| [^47] | cncf.io/projects/open-policy-agent-opa | #57, #71 | 支持 | 受理 2018-03-29、Incubating 2019-04-02、Graduated 2021-01-29 | なし |
| [^48] | OPA Docs Bundles | #55, §2-1, §2-13 | 支持 | "in an eventually consistent manner"、HTTP Long Polling、persist、.signatures.json による署名検証 | なし |
| [^49] | OPA Docs Decision Logs | #56 | 部分支持 | decision_id、input、bundle メタ情報、drop 規則、レート制限は一致。ずれ: mask の op は `remove` / `upsert` で、`erase` という op はない（除去したパスはログの `erased` フィールドに記録される） | #56 の用語を修正 |
| [^50] | OPA Docs Configuration | #55, #56, §2-2 | 支持 | bundles[_].polling.min_delay_seconds の既定 60・max 120、decision_logs.reporting.min_delay_seconds の既定 300・max 600、buffer_size_limit_events の既定 10000（event 型のみ）、"OPA will drop old events from the log if this limit is exceeded"、max_decisions_per_second 超過で破棄。補足: buffer_type の既定は size で、buffer_size_limit_bytes の既定は無制限、max_decisions_per_second には既定値がない | #56 に既定値の補足と、欠落が起きる条件（[D]）を追記 |
| [^51] | GitHub open-policy-agent/opa Release v1.21.1 | #58, §4 | 支持 | 2026-09-29T21:07:37Z。GitHub API でライセンス Apache-2.0、latest も v1.21.1 | なし |
| [^52] | openid.net/specs/authorization-api-1_0.html | #61, #62, #63, #66, §2-6, §2-13 | 支持 | Published 11 January 2026 / Status: Final。§2 "The policy language, architecture, and state management aspects of a PDP are beyond the scope"、OAuth 2.0 は RECOMMENDED。§4 "MAY augment ... MUST NOT modify"、v1 は SHOULD。§5.1 type・id は REQUIRED、properties は OPTIONAL、§5.1.1 "Many authorization systems are stateless"。§5.5 decision は REQUIRED、false は "MUST NOT be permitted to go forward"、true でも context を理解できなければ PEP は MAY 拒否。§11.1 PEP–PDP 接続の保護は MUST、§11.2 PEP の認証は SHOULD。規範強度は全て原典どおり | §2-6 で、トークンが「定義されていない」を [N] から [D]（全文検索による不在の推論）に分けた |
| [^53] | 同上 §6〜§8 | #64, #65, §2-6 | 支持 | §7.1.1 上位キーが既定値、§7.1.2.1 execute_all（既定）/ deny_on_first_deny / permit_on_first_permit、§7.2 evaluations があるとき上位 decision 省略は RECOMMENDED。§8.1 search 結果の評価は true に SHOULD（保証なし）、推移的検索は RECOMMENDED。§8.2 ページングは PDP の MAY、"Pagination does not guarantee an atomic snapshot ... MAY be repeated or omitted"、token 付き要求は全 entity と parameter を同一にすることが MUST | なし |
| [^54] | 同上 §9〜§11 | #66 | 部分支持 | §9 メタデータ提供は RECOMMENDED、/.well-known/authzen-configuration、§9.2.3 不一致なら "MUST NOT be used"、§10 HTTPS JSON binding は MUST、§11.6 応答署名は MAY、§11.7 DoS 対策は SHOULD、の各点は原典どおり。ずれ: §10.1.3 では、要求 ID 自体は MAY、ヘッダに X-Request-ID を使うことは RECOMMENDED、要求 ID があれば PDP は応答に含めることが MUST、PEP が指定した ID と同じ値を含めることも MUST である。RS-07 は「X-Request-ID が付いていれば同じ ID を MUST」と、ヘッダ名と MUST をまとめて書いていた | #66 を原典の強度どおりに分けて修正 |
| [^55] | openid.net Final Specification Approved | #60, §2-6 | 支持 | Published January 12, 2026、"not subject to further revision"、Approve 81 / Object 1 / Abstain 25 | なし |
| [^56] | openid.net/wg/authzen/specifications | #67, §4 | 支持 | Final は Authorization API 1.0（2026 年 1 月承認）。COAZ Framework 1.0、COAZ-MCP Binding 1.0、Access Request and Approval Profile 1.0、Profile for Obligations 1.0 は Working Group Drafts。draft 00〜03 は "superseded by the Authorization API 1.0 Final Specification" | なし |
| [^57] | openid.net Implementer's Draft Approved | #60, §4 | 支持 | Published November 15, 2024、対象は authorization-api-1_0-01（draft 01）、Approve 82 / Object 2 / Abstain 22 | なし |
| [^58] | aserto.com The final chapter for Aserto | #69, §2-11 | 支持 | Apr 27th, 2025、"shut it down by May 31, 2025"、"wind down Aserto as a commercial entity"、Topaz はメンテナが継続支援し、商用支援もあり得る | なし |
| [^59] | fusionauth.io プレスリリース | #70, §2-11 | 支持 | 2025-11-20 に買収を発表、"committed to maintaining and expanding Permify's thriving open-source community" | なし |
| [^60] | GitHub Permify/permify | #70, §2-11, §4 | 支持 | GitHub API でライセンス AGPL-3.0、latest v1.7.4（2026-09-10） | なし |
| [^61] | GitHub aserto-dev/topaz | #69, §4 | 支持 | GitHub API でライセンス Apache-2.0、latest v0.33.22（2026-09-28） | なし |
| [^62] | aserto.com AuthZEN, Gartner IAM, and native support in Topaz | #68, §2-7 | 部分支持 | "as of Topaz 0.32.54, we support the native AuthZEN endpoints, across both the HTTP REST and gRPC bindings" は一致。日付の誤り: RS-07 は公開日を「未確認」としていたが、記事上に Feb 28th, 2025（著者 Omri Gazitt）と明記されていた。版の問題: 告知は draft 02 / draft 03 を前提にした Final 承認前のもので、「AuthZEN 1.0 Final への対応」と読める §2-7 の書き方は版の誤認を招く | 脚注に日付と著者を補記。#68、§2-7、§4、§6 に「Final 前の告知で、Final 版への準拠は未確認」と明記 |
| [^63] | medium.com Airbnb Tech Blog（Himeji） | #73, §2-12 | 部分支持 | 3 層構成、~98% の命中率目標、DB 変更による無効化、Amazon Aurora、書込み時の fan-out、数百億件の関係、の各点は一致。ずれ: 「2021 年 3 月時点」は 85 万 entity/s のスループットにだけかかり、可用性 99.9990% と P50 / P95 / P99 は "over the last year"（約 1 年間）の値 | #73 の時点の帰属を修正 |
| [^64] | medium.com Building Carta（AuthZ） | #74 | 支持 | 2021-06-11、"sub-10ms"、"Consumers don't have to wait for the index updates to propagate"、trigram 索引で "50ms for the 95th percentile"、7 アプリ・約 130 権限型・約 15 req/s、"Some tokens reached almost 1mb" | なし |

## 4. RS-07 に加えた修正（版 0.1 → 0.2）

| # | 箇所 | 修正内容 | 理由（脚注） |
|---|---|---|---|
| 1 | 冒頭メタ情報・前文 | 版を 0.2 にした。前文の「第三者照合は未実施」を、AI による独立照合の実施と本記録の所在に改めた | — |
| 2 | §2-3, #29, §6 | SpiceDB の Read-After-Write ページは比較表で fully_consistent を条件なしに "Guaranteed read-after-write" としており、Consistency ページの CockroachDB 注記と食い違う。このことを追記した | [^22] |
| 3 | §2-5, #21 | OpenFGA の方式 (3) / (2) の推奨条件に「割合が低い」を加えた | [^15] |
| 4 | §2-6 | 「整合性トークンは定義されていない」を [N] から [D]（RS-07#61 の全文検索）に分けた | [^52] |
| 5 | §2-7, #23, #68, §4, §6 | Topaz の告知を 2025-02-28・Final 前（draft 02/03 前提）と明記し、Final 準拠は未確認とした。OpenFGA の独自モデル ID ヘッダと、要求 ID を返さない点（AuthZEN §10.1.3 の MUST と不一致）を追記した | [^17], [^62] |
| 6 | §2-10 | AVP の共有 store / テナント別 store について、ユーザーガイドの "How to choose" の条件を併記した | [^41], [^43] |
| 7 | §2-12 | Zanzibar の p95 < 10ms を、論文の全体値と Table 2 の Safe 値に分けて書き、Safe が全体を支配するという読みは [D] とした | [^1], [^7] |
| 8 | §2-13, #24, §4, §5.1, §6 | `fga store export` の tuple 上限が既定 100 件であることを追記し、出典を openfga/cli README に差し替えた | [^18] |
| 9 | #1 | 「2018 年 12 月の 7 日間」は API 別ピーク QPS にだけかかることを明記した | [^7] |
| 10 | #22 | 「一部の ABAC」、要求 context は個別上限なしで全体 512KB（現時点）、に修正した | [^16] |
| 11 | #34 | Materialize の提供対象を AuthZed Dedicated の利用者と書き、「OSS 版不含」は [D] に変更した。URL を更新した | [^27] |
| 12 | #45, §4 | Cedar の `tpe` / `partial-eval` を、CHANGELOG（4.13.0 時点で experimental、`tpe` は 4.6.0 で導入）に基づいて書き直し、出典を差し替えた | [^37] |
| 13 | #53 | CreatePolicyStore 1 RPS（引上げ不可）を追記し、1 万 store の作成時間を [D] で試算した | [^40] |
| 14 | #56, §5.1 | mask の op を `remove` / `upsert` に直した。バッファの既定（size 型、バイト上限無制限、レート制限は既定なし）と、欠落が起きる条件を追記した | [^49], [^50] |
| 15 | #57, §6 | Styra 関連ツールの CNCF 移管を「手続きの開始」に改め、完了は未確認とした。脚注の著者表記を修正した | [^46] |
| 16 | #66 | AuthZEN §10.1.3 の要求 ID の規範強度（MAY / RECOMMENDED / MUST）を原典どおりに分けた | [^54] |
| 17 | #73 | Himeji の「2021 年 3 月時点」をスループットだけに限定し、可用性と遅延は約 1 年間の値と明記した | [^63] |
| 18 | 参考文献 | [^18] と [^37] の出典を差し替えた。[^27] と [^41] の URL を転送先に更新した。[^17]、[^22]、[^46]、[^62] の参照箇所・著者・日付を補記した | 上記 |
| 19 | §6 | SpiceDB の AuthZEN 対応の手掛かり（authzed/authzed-marketplace の移行用参照文書）を追記した。製品文書ではないので結論には使わず、未確認のままとした | — |

## 5. 検証不能・二次情報の扱い

- **検証不能の脚注**: 0 件。全 64 脚注の原典を取得し、該当箇所を確認できた。
- **二次情報だけを根拠にした主張**: 本文の結論に使われているものは見つからなかった。RS-07 は SpiceDB の AuthZEN 対応（GitHub Discussions の Q&A）を既に「未確認」としており、本検証でも維持した。
- **一次性の注記（判定は変えていない）**: [^58]・[^62]（Aserto ブログ）、[^46]（OPA ブログ）、[^63]・[^64]（Airbnb・Carta の Medium 上の技術ブログ）は、いずれも当事者自身が発表した記事である。CONVENTIONS §3 が禁じる「ブログ転載」には当たらないと判断した。ただし [^63]・[^64] の数値は測定条件の記載が乏しいため、RS-07 は既に [M] で「目標値の根拠に使わない」としており、妥当である。
- **WebSearch の結果**: SpiceDB の AuthZEN 対応について、WebSearch で公式文書の記載を見つけられなかった。結果は §6 の未確認を補強するだけで、結論には使っていない。

## 6. 検証の限界

- 照合は 2026-10-03 時点で各ページが表示した内容に対して行った。OpenFGA・SpiceDB・AVP・OPA の web 文書には版の表記がなく、後日の改訂で記述が変わり得る。
- Zanzibar と Cedar の論文は PDF のテキスト抽出で照合した。表や数式の抽出崩れは、該当箇所をレイアウト保持の抽出で読み直して確認した（Zanzibar の Table 2）。
- Cedar 論文の ACM 正式版本文は読んでいない（Crossref の書誌だけ確認した）。arXiv v2 と正式版の差分は RS-07 §6 のとおり未確認である。
- 検証者は AI エージェントであり、規範文の解釈や、[D] で書かれた推論の妥当性については、人間のレビュアによる確認が別途必要である。
