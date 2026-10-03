# RS-17 独立検証記録（脚注の原典照合）

> 文書ID: RS-17-V / 版: 0.1 / 状態: review / 最終更新: 2026-10-03
> 対応要求: R-029, R-042, R-044, R-054, R-058, R-061, R-100, R-112, R-135, R-158, R-163, R-176, R-190, R-204, R-205（RS-17 の対応要求に準ずる）
> 依存文書: CONVENTIONS.md, research/RS-17-integration-patterns-modeling.md（検証対象。検証後に版 0.1 から 0.2 へ改訂）

本記録は、RS-17 の作成者とは別の AI エージェント（Claude）が 2026-10-03 に行った脚注の原典照合のログである。検証者も AI であり、人間のレビュアによる照合ではない。判定は検証者の読解によるもので、CTO/CISO の決裁ではない。

---

## 1. 検証の方法

| 項目 | 内容 |
|---|---|
| 対象 | RS-17 版 0.1 の全脚注 [^1]〜[^86]（86 件、URL は重複を除いて 82 件）と、各脚注が付いた本文の主張（§2 結論サマリ、§3 調査結果、§4 ステータス表） |
| 取得 | 全 82 URL を 2026-10-03 に curl で取得した（全て HTTP 200）。RFC は rfc-editor.org の .txt 版、GitHub の blob は raw.githubusercontent.com、Zanzibar 論文は PDF を pdftotext で抽出し、HTML はテキスト化してから全文検索で照合した。WebFetch は小型モデルの要約を返すため、照合には使わなかった。作成者が使ったと見られる取得物（scratchpad の別フォルダ）は独立性を保つため使わず、全て取得し直した |
| 補助確認 | rfc7523bis の版ごとの投稿日と状態遷移は Datatracker の History ページで確認した。CloudEvents と OWASP ASVS のリリース日は GitHub の Releases ページ（HTML）で確認した（GitHub API は途中で rate limit に達したため HTML に切り替えた）。CloudEvents の Auth Context 拡張が v1.0.2 タグに含まれないことは raw.githubusercontent.com で 404 を確認した |
| 転送 | 次の URL は別 URL に転送された。内容は同じ文書で、脚注に転送先を記した: [^29]（Databricks、`/data-governance/unity-catalog/filters-and-masks`）、[^41]（SignalR、`?view=aspnetcore-10.0`）、[^52]・[^53]（MCP、`/docs/2026-07-28/...`）、[^78]（GitHub、`enterprise-cloud@latest`）、[^80]（Slack、docs.slack.dev）。[^47]・[^79]（Slack Help Center）は接続元の地域により ja-jp 版に転送されたため、同じ記事 ID の en-gb 版（`/intl/en-gb/help/articles/...`）で英語原文を取得した |
| 判定区分 | 支持: 脚注の参照箇所が主張を全て裏付ける。部分支持: 主張の核心は裏付けられるが、限定条件・版・日付・帰属のいずれかが原典とずれる。不支持: 原典が主張を裏付けない、または反する。検証不能: 原典を取得できない、または該当箇所が見つからない |
| 規範強度 | IETF 文書（RFC 10017、8252、8628、10027、6749、7523、7523bis-11、9700、8705、8693、8707、6455、4513、Transaction Tokens -11）、OIDC Core、AuthZEN 1.0、MCP 2026-07-28、CloudEvents の MUST / SHOULD / MAY / RECOMMENDED / OPTIONAL を、本文の該当文と 1 文ずつ照合した。小文字表記（"strongly recommended"、"not recommended"、"Avoid using"、"is not to be used"）が BCP 14 キーワードとして書かれていないことも確認した |

## 2. 判定の集計

| 判定 | 件数 | 脚注 |
|---|---|---|
| 支持 | 81 | 下表の「支持」 |
| 部分支持 | 5 | [^9], [^12], [^74], [^76], [^84] |
| 不支持 | 0 | — |
| 検証不能 | 0 | — |

部分支持の 5 件は、いずれも RS-17 版 0.2 で修正した（§4）。支持の脚注でも、原典の再取得で分かった追加事実（Slack Connect の所有組織だけができる操作、API Gateway の接続時間上限、CloudEvents・ASVS の公開日など）を反映し、§6 の未確認事項を 4 件解消した。出典の追加は 1 件（[^87] API Gateway の WebSocket クォータ）である。

## 3. 脚注ごとの判定表

凡例: 「主張」は脚注が付いた RS-17 の項目番号（#n）と結論サマリの番号（§2-n）。

| 脚注 | 原典（取得先） | 主張 | 判定 | 照合結果（原典の該当箇所） | 修正 |
|---|---|---|---|---|---|
| [^1] | RFC 10017 .txt | #1〜#4, §2-1 | 支持 | ヘッダ "BCP: 212"、"Category: Best Current Practice"、"August 2026"。§6 "presented in decreasing order of security"。§6.1.3.1 "the BFF MUST act as a confidential client"、"MUST use the OAuth 2.0 Authorization Code grant as described in Section 2.1.1 of [RFC9700]"。§6.1.3.2 Secure・HttpOnly は MUST、SameSite=Strict・path `/`・`__Host-Http-` は SHOULD、Domain は SHOULD NOT、client-side session の暗号化は SHOULD、"The 'SHOULD' items are not deemed as 'MUST' items so that existing architectures can be compliant"。§6.1.3.3 "The BFF MUST implement a proper CSRF defense"、§6.1.3.3.1 サブドメイン乗っ取り、§6.1.3.3.2 CORS-safelisted requests。§6.1.4.3 "only viable attack pattern is hijacking the client application"、"strongly recommended"（小文字） | なし |
| [^2] | 同上 | #4, #5, §2-1 | 支持 | §6.3.2.1 public client は PKCE を MUST。§6.3.2.3 rotate または sender-constrained を MUST、最大寿命または未使用期限を MUST、rotate 後の寿命延長は MUST NOT。§6.3.3.1 共有秘密の要求は MUST NOT。"not recommended"（小文字）は §6.3.4.3 Summary にある | 参照箇所の「§6.3 末尾」を §6.3.4.3 に精緻化（#4、脚注） |
| [^3] | RFC 8252 .txt | #1, #6〜#8, §2-2 | 支持 | ヘッダ "BCP: 212"、"October 2017"。§4 "the best current practice is to perform the OAuth authorization request in an external user-agent"。§6 PKCE は client MUST・AS MUST。§7 3 種の redirect を MUST、§7.1 逆ドメイン名を MUST、§7.2 claimed https を SHOULD、§7.3 任意ポートを MUST | なし |
| [^4] | 同上 | #6, #7, #9, §2-2 | 支持 | §8.1 PKCE なしの要求を拒否 SHOULD。§8.2 implicit は NOT RECOMMENDED。§8.5 静的秘密は "should not be treated as confidential secrets"、共有秘密の要求は NOT RECOMMENDED、それでも要求する AS は public client として扱うこと MUST。§8.12 embedded user-agent は MUST NOT、検知・遮断は MAY | なし |
| [^5] | RFC 8628 .txt | #11, #12 | 支持 | ヘッダ "Standards Track"、"August 2019"。§1 smart TVs、media consoles、picture frames、printers。§5.4 デバイスの確認を RECOMMENDED、デバイス情報の表示を SHOULD、"This doesn't prevent a phisher from presenting a fresh token" | 「新しいコード」に原文 "a fresh token" を併記（#12） |
| [^6] | RFC 10027 .txt | #13, §2-3 | 支持 | ヘッダ "BCP: 247"、"August 2026"。§2 リスク評価 MUST、緩和不能なら回避 SHOULD、§6.2 の選定ガイダンス SHOULD、§6.1 からの緩和策の選定 MUST、近接性 SHOULD。適用対象に RFC 8628、CIBA、SIOPv2、OpenID4VP、OpenID4VCI の Pre-Authorized Code Flow | なし |
| [^7] | 同上 | #14, §2-3 | 支持 | §6.2.1.5 "Only use this protocol if other cross-device protocols are not viable ... Avoid using if the protected resources are sensitive, high value, or business critical. Always deploy additional mitigations like proximity or only allow with pre-registered devices. Do not use for same-device scenarios"（いずれも小文字で BCP 14 キーワードではない。RS-17 も MUST 等とは書いていない） | なし |
| [^8] | Microsoft Learn（ms.date 2026-03-24） | #15, §2-3 | 支持 | "Device code flow is a high-risk authentication method that can be part of a phishing attack or used to access corporate resources on unmanaged devices"、"Microsoft recommends blocking device code flow wherever possible"。Protocol tracking は "sustained through subsequent refreshes" | なし |
| [^9] | Microsoft Security Blog（原文 HTML） | #16, §2-3 | 部分支持 | 内容は一致した: Teams 会議招待を装うメール、device code の入力、access token の取得、2025-02-14 追記の Microsoft Authentication Broker の client ID・デバイス登録・PRT、緩和策（device code flow の遮断、revokeSignInSessions）。ずれは 3 点。(a) 頁は 2026-07-31 に追記・更新されており（dateModified 2026-07-31）、Storm-2372 を "an initial access operations sub-cluster of Midnight Blizzard" と再評価していたが、脚注の版表記に反映されていなかった。(b) メッセージングサービスでの接触は原文では "likely" の推定で、断定になっていた。(c) 脚注は「要約経由で読了、逐語照合は未実施」としていた | #16 に 2026-07-31 の再評価、"likely" の留保、PRT を追記。脚注の日付・参照箇所を更新し、逐語照合済みと記載。§6 の記述を更新 |
| [^10] | RFC 6749 .txt | #18, §2-4 | 支持 | §4.4 "The client credentials grant type MUST only be used by confidential clients"。§4.4.3 "A refresh token SHOULD NOT be included" | なし |
| [^11] | RFC 7523 .txt | #20 | 支持 | §2.2 "It MUST NOT contain more than one JWT"。§3 iss・sub・aud・exp は MUST、クライアント認証の sub は client_id で MUST、自分を audience に含まない JWT の拒否 MUST、jti による再送防止は MAY | なし |
| [^12] | draft-ietf-oauth-rfc7523bis-11 .txt | #21, §2-4 | 部分支持 | 規範文は一致した: クライアント認証の aud は issuer 識別子を唯一の値として MUST、token endpoint URL は MUST NOT、満たさない JWT の拒否 MUST、§3.2 への追加で `typ` の明示は SHOULD。Abstract "to address a security vulnerability"。ずれ: 版の日付。-11 は Datatracker 上 2026-04-28 の投稿で、本文の日付表記 "26 March 2026" は -07（2026-03-26 投稿）から更新されていない。RS-17 は -11 を 2026-03-26 の版としていた | #21、§4 表、脚注の日付を 2026-04-28（本文表記は 2026-03-26）に修正 |
| [^13] | RFC 9700 .txt | #19, §2-4 | 支持 | ヘッダ "BCP: 240"、"January 2025"。§2.5 非対称暗号のクライアント認証を RECOMMENDED、"do not need to store sensitive symmetric keys"。§2.3 audience 制限を SHOULD、自分宛てでない token の拒否を MUST | なし |
| [^14] | RFC 8705 .txt | #22 | 支持 | §3 RS は TLS 層から証明書を取得し一致を検証 MUST、不一致は 401 `invalid_token` で拒否 MUST。§6.3 証明書更新で access token が無効になる。§6.5 中継装置での TLS 終端時の受け渡しは "out of scope" | なし |
| [^15] | OIDC Core 1.0 errata set 2（Final, 2023-12-15） | #24, §2-5 | 支持 | §11 "even when the End-User is not present (not logged in)"、`prompt=consent` を MUST（他の条件がある場合を除く）、OP は同意取得を MUST、"A previously saved user consent is not always sufficient" | なし |
| [^16] | RFC 8693 .txt | #25, §2-5 | 支持 | §1.1 成りすましでは "indistinguishable from B"、委任では "its own identity separate from B"。§2.1 "does not create a tight linkage"、失効の伝播は "not a general property of the STS protocol" | なし |
| [^17] | draft-ietf-oauth-transaction-tokens-11 .txt（30 July 2026） | #26 | 支持 | §6 "on the order of minutes or less" で呼出しの間だけ使うこと MUST、バッチ・オフラインでも短命の Txn-Token。§13.3 TTS の応答に refresh token を含めること MUST NOT。§8.2 定期処理で workload 自身の ID または利用者になり代わって要求 | なし |
| [^18] | Databricks（2026-09-11 更新） | #27, #31, §2-5 | 支持 | 作成者が IS OWNER かつ Run as、"Databricks recommends changing the Run as user to a service principal ... so that jobs do not break when the owner leaves or has changed privileges"（逐語一致） | なし |
| [^19] | Microsoft Learn（ms.date 2026-08-14） | #28 | 支持 | "This approach insulates the flow ownership from the lifecycle of the owner"、所有者の退職・役割変更時の問題を防ぐ | なし |
| [^20] | Microsoft Learn（ms.date 2026-06-11、KB 4556130） | #28, #31, §2-5 | 支持 | "An orphaned flow is a flow that no longer has a valid owner. These flows can fail if they use connections tied to that user account"。作成者で絞った一覧を取得し、全フローに共同所有者を割り当てる手順 | なし |
| [^21] | BigQuery Scheduling queries（2026-09-30 更新） | #29 | 支持 | "run jobs ... with its own service credentials rather than an end user's credentials"、federated identity では service account が必須、既存の scheduled query の資格情報の更新 | 脚注の「更新日表示は未取得」を 2026-09-30 更新に修正 |
| [^22] | GitHub Docs OIDC | #30 | 支持 | 各ジョブが OIDC token を要求、クラウド側が claim を信頼条件と照合、"short-lived cloud access token that is available only for the duration of the job"、長寿命の秘密が不要 | なし |
| [^23] | CloudEvents v1.0.2 spec.md（raw） | #32, §2-6 | 支持 | Privacy and Security: context attributes の機微情報は SHOULD NOT、検査・記録は MAY、event data の暗号化は SHOULD、プロトコル層のセキュリティは SHOULD。GitHub Release `ce@v1.0.2` は 2022-02-06 公開で、仕様の最新リリース | #32、§4 表、脚注に公開日 2022-02-06 を記入 |
| [^24] | CloudEvents authcontext.md（main） | #33, §2-6 | 支持 | "This extension is purely informational and is not intended to secure CloudEvents"、authclaims は MUST NOT（直接成りすませる資格情報）・MAY（ID サービスで成りすまし資格情報を発行させる情報）。main の spec.md は "Version 1.0.3-wip"。v1.0.2 タグには authcontext.md がない（404） | §6 に「v1.0.2 タグに含まれないことを確認」と追記 |
| [^25] | OWASP ASVS 5.0.0 V8（タグ v5.0.0） | #34, §2-6 | 支持 | 8.3.2（L3）即時反映と代替緩和策、"would not mitigate information leakage"。8.3.3（L3）"originating subject's ... permissions, not on the permissions of any intermediary"。8.4.1（L2）cross-tenant controls。5.0.0 は最新安定版（Release `v5.0.0_release`、2025-05-30） | §4 表に公開日と最新安定版である旨を記入 |
| [^26] | PostgreSQL 18 Row Security Policies | #36, #40, §2-7 | 支持 | default-deny、TRUNCATE と REFERENCES は対象外、superuser・BYPASSRLS は常に迂回、owner は FORCE しない限り迂回、参照整合性検査は常に迂回し "covert channel" に注意 | なし |
| [^27] | BigQuery row-level security（2026-09-30 更新） | #37, #40, §2-7 | 支持 | grantee_list 外の利用者は行を見られない。比較表で row-level access policy は "Can be vulnerable to query duration side-channel attacks"、authorized view は "carefully crafted queries, query durations, and other types of side-channel attacks" | なし |
| [^28] | Snowflake row access policies | #38, #40, §2-7 | 支持 | Enterprise Edition 以上、"evaluates the policy expression by using the role of the policy owner"、"do not currently prevent rows from being inserted, or prevent visible rows from being updated or deleted"、masking policy より先に評価 | なし |
| [^29] | Databricks Row filters and column masks（2026-09-24 更新、転送先 URL） | #39, #40, §2-7 | 支持 | 基表の値を見せない、12.2 LTS 未満は "fail securely"、view には適用不可、Iceberg REST catalog 不可、path-based access 不可、ABAC は "table owners can't override or remove them" | 脚注の URL を転送先に更新 |
| [^30] | Zanzibar 論文 PDF | #41, §2-8 | 支持 | §1 "a search index that respects access control and works across applications"。§2.4.5 Expand は "build efficient search indices for access-controlled content" | なし |
| [^31] | 同上 | #42 | 支持 | §3.2.4 一部 namespace で Leopard、オフライン索引と Watch API による増分層、"tens of thousands of discrete Leopard tuple events" | なし |
| [^32] | openfga.dev Search With Permissions | #43, §2-8 | 支持 | 3 方式、方式 2 の最後の Check、シナリオ C（~1000、割合も低い）で表は "3 or 2"、D（Google Drive）で 2 | なし |
| [^33] | openfga.dev Relationship Queries | #44, §2-8 | 支持 | ListObjects・ListUsers とも既定 3s・1000 件 | なし |
| [^34] | authzed.com Querying Data | #44, §2-8 | 支持 | LookupResources は cursoring 対応、"heavy request that can cause performance problems when more than 10k results"、CheckBulk による postfilter、次に Materialize | なし |
| [^35] | AuthZEN Authorization API 1.0（Final, Published 11 January 2026） | #45, §2-8 | 支持 | §8.1 evaluation で true になること SHOULD、"this outcome is not guaranteed"、推移的検索 RECOMMENDED。§8.2 "does not guarantee an atomic snapshot"、重複・欠落 MAY。total は OPTIONAL で合計と一致しないことがある | なし |
| [^36] | Amazon S3 presigned URL | #47, §2-9 | 支持 | 生成者の資格情報、期限まで複数回使用可、コンソール 1 分〜12 時間・CLI/SDK 最長 7 日、資格情報の失効・削除・無効化で失効、期限直前に始まったダウンロードは継続、"presigned URLs are bearer tokens"、`s3:signatureAge`、`aws:SourceIp` | なし |
| [^37] | GCS Signed URLs（2026-09-30 更新） | #48, §2-9 | 支持 | "Anyone in possession of the signed URL can use it while it's active, regardless of whether they have a Google account"、604800 秒（7 日）、"until the expiration time ... or the key used to sign the URL is rotated" | なし |
| [^38] | Azure Storage SAS（ms.date 2026-02-27） | #49, §2-9 | 支持 | user delegation SAS を推奨、漏えいした SAS は誰でも使える、"It's not possible to audit the generation of SAS tokens"、"Storage doesn't track the number of shared access signatures"、stored access policy で service SAS を取消し可、user delegation SAS・account SAS は非対応、HTTPS・期限ポリシー・近い期限・最小権限 | なし |
| [^39] | RFC 6455 .txt | #51, §2-10 | 支持 | §10.5 認証方式を規定しない。§10.2 Origin の検証 SHOULD、403 での応答 SHOULD | なし |
| [^40] | OWASP ASVS 5.0.0 V4（タグ v5.0.0） | #52 | 支持 | 4.4.1（L1）WSS、4.4.2（L2）Origin の許可リスト照合、4.4.3（L2）専用 token、4.4.4（L2）既存の認証済み HTTPS session を通じた取得・検証 | なし |
| [^41] | Microsoft Learn SignalR（ms.date 2026-09-20、view=aspnetcore-10.0 に転送） | #53, #54, §2-10 | 支持 | "SignalR doesn't automatically revalidate the user during the life of the connection, regardless of the authentication scheme"、Editor ロール除去の例、期限切れでも既定で継続、`CloseOnAuthenticationExpiration`、.NET 11 以降の Authentication refresh、ブラウザの WebSocket・SSE API は Authorization ヘッダを設定できず query string、多くのサーバーが query string を記録、YARP（BFF）でヘッダ付与 | #53 の「失効」を原文（expires）に合わせて「期限切れ」に修正。脚注に転送を記載 |
| [^42] | API Gateway WebSocket access control | #55 | 支持 | "we recommend that you configure an authorizer for the $connect route on all your WebSocket APIs" | なし（#55 に [^87] で接続時間上限を追記） |
| [^43] | GitHub Docs Differences between GitHub Apps and OAuth apps | #57, §2-11 | 支持 | "GitHub Apps are preferred to OAuth apps because they use fine-grained permissions ... and use short-lived tokens"（逐語一致）、installation access token は "currently 1 hour"、OAuth app の token は既定で長寿命、application policy 下で OAuth app は組織所有者の承認、GitHub App は application policy の対象外 | なし |
| [^44] | GitHub Docs Best practices for creating a GitHub App | #58 | 支持 | 最小権限、private key を hard code しない、installation token 1 時間・user access token 8 時間・refresh token 6 か月、`GET /user/installations` の定期確認、SAML SSO 未実施・組織離脱時のアクセス停止 | なし |
| [^45] | GitHub Docs Authenticating on behalf of a user | #59 | 支持 | 利用者がアクセスできる資源、アプリが権限を持つ資源、アプリがインストールされたアカウントの資源の 3 条件 | なし |
| [^46] | Slack Marketplace guidelines | #60 | 支持 | 最小権限の原則、scope ごとの理由、将来機能の scope は不可、広い履歴系 scope は承認されにくい、token を安全に保管しログ・クライアント側コード・公開リポジトリに置かない、state パラメータを使わなければならない、privacy model | なし |
| [^47] | Slack Help Center（en-gb 版で全文取得） | #61 | 支持 | オーナーとアプリ管理者が審査、optional scope の選択、scope 変更時の再要求 "members may need to request the app again"。版 0.1 は 429 のため一部しか取得していなかったが、全文で一致を確認した | 脚注の取得注記を全文照合済みに更新。§6 を更新 |
| [^48] | Microsoft Learn configure-user-consent（ms.date 2025-06-15） | #62, §2-11 | 支持 | 既定で全利用者が同意可、検証済み発行者に限る推奨、`microsoft-user-default-low` の説明、"Any updates to user consent settings only affect future consent operations ... Existing consent grants remain unchanged" | なし |
| [^49] | Microsoft Learn admin consent workflow（ms.date 2024-12-29） | #63 | 支持 | 審査者に指定しても権限は昇格しない、Graph のアプリケーション権限は Global Administrator だけが承認可、"Consent request expires after (days)" | なし |
| [^50] | Microsoft Learn publisher verification（ms.date 2024-08-13） | #64, §2-11 | 支持 | 発行組織の真正性の確認、2020-11-08 以降に登録されたアプリと risk-based step-up consent、"The blue verified badge doesn't imply or indicate quality criteria" | なし |
| [^51] | MCP Authorization 2026-07-28 | #66〜#68, #70（版 0.2）, §2-12 | 支持 | 認可は OPTIONAL、HTTP は SHOULD、STDIO は SHOULD NOT。RFC 8707 の実装 MUST、`resource` は両要求に含め MUST・正規 URI MUST・AS の対応に関係なく送る MUST。audience 検証 MUST、他の AS の token の送信 MUST NOT、"MUST NOT accept or transit any other tokens"、query string MUST NOT、RFC 9728 の実装 MUST。追加で確認した事項: Standards Compliance は "OAuth 2.1 IETF DRAFT (draft-ietf-oauth-v2-1-13)" を挙げ、"Authorization servers MUST implement OAuth 2.1" | §2-12、#70 に「MCP が参照する OAuth 2.1 は -13」を追記（[^84] の修正） |
| [^52] | MCP Security Best Practices（2026-07-28 版に転送） | #69 | 支持 | Token Passthrough は anti-pattern で "explicitly forbidden"、統制の迂回・監査・持出し・信頼境界。State Handle Hijacking で "MUST NOT treat possession of a state handle" | 脚注に転送を記載 |
| [^53] | MCP Versioning（2026-07-28 版に転送） | #66 | 支持 | "The current protocol version is 2026-07-28" | 脚注に転送を記載 |
| [^54] | RFC 8707 .txt | #67 | 支持 | §2 "The authorization server SHOULD audience-restrict issued access tokens to the resource(s) indicated by the 'resource' parameter" | なし |
| [^55] | Microsoft Learn PIM（ms.date 2026-04-23） | #72, §2-13 | 支持 | JIT、開始日・終了日、承認、MFA、justification、通知、access review、監査履歴、eligible の有効化、ライセンス要件 | なし |
| [^56] | Microsoft Learn JEA（ms.date 2022-11-16） | #73 | 支持 | "delegated administration for anything managed by PowerShell"、virtual account、cmdlet・関数・外部コマンドの限定、transcript とログ、DNS 管理者と Domain Admins の例 | なし |
| [^57] | Google Cloud PAM（2026-09-30 更新） | #74, §2-13 | 支持 | JIT の一時昇格と監査ログ、entitlement（要求者、justification、役割と IAM 条件、最大期間、承認）、期間終了で取消し、PAM 以外による role binding 変更で "might not work as expected" | なし |
| [^58] | Microsoft Learn Customer Lockbox（ms.date 2025-02-03） | #75, §2-13 | 支持 | テナント名・サービス要求番号・開始時刻・必要時間・サービス、Microsoft Support manager の承認後に顧客承認者へ通知、12 時間で失効、最大 4 時間、"pre-approved cmdlets"、"Microsoft Operator"、"no Microsoft personnel have permission to access customer content on an ongoing basis" | なし |
| [^59] | Google Cloud Access Approval（2026-09-30 更新） | #76 | 支持 | 明示的な承認、"automatically approved without the customer's action to address time-sensitive outages"、`auto approved`。追加で確認した事項: Access Transparency の除外事項も適用、EU Data Boundary with Access Justifications と Sovereign Controls by Partners では自動承認が無効 | 追加事項を #76 に追記（EU の顧客を想定する本基盤に関係するため）。脚注の参照箇所を更新 |
| [^60] | Keycloak Server Administration Guide（Version 26.8.0） | #78 | 支持 | "An Identity Broker is an intermediary service connecting service providers with identity providers"、SAML v2.0・OpenID Connect v1.0・OAuth v2.0、"Automatically linking the existing local account ... is a potential security hole"、AutoLink は "dangerous in a generic environment" | なし |
| [^61] | Google Cloud IAP signed headers（2026-09-30 更新） | #79, §2-14 | 支持 | "you must use signed headers for all app types"、3 つのリスク（誤った無効化、firewall の設定誤り、プロジェクト内の不正アクセス）、迂回時の未署名ヘッダの偽造、ES256・kid・exp・iat・aud・iss=`https://cloud.google.com/iap` | なし |
| [^62] | AWS ALB authenticate users | #80, §2-14 | 支持 | ES256、署名検証と `signer` の ALB ARN 確認、`x-amzn-oidc-accesstoken`・`x-amzn-oidc-identity` は後方互換の未署名ヘッダ、security group で ALB からのトラフィックに限る推奨、SessionTimeout 既定 7 日 | なし |
| [^63] | Microsoft Learn App Proxy header SSO（ms.date 2026-03-25） | #81, §2-14 | 支持 | "Application authorization policies only apply to the initial authentication request"、"should be restricted to only traffic from the connector ... using a firewall or IP restriction" | なし |
| [^64] | RFC 4513 .txt | #82 | 支持 | §5.1.2 匿名の認可状態、DN は "not to be authenticated or otherwise validated" かつ "not to be used ... for authorization purposes"（小文字）、空パスワード入力の禁止 SHOULD、unauthenticated Bind を `unwillingToPerform` で失敗 SHOULD。§6.3.1 Bind の成功で非ディレクトリ情報へのアクセスを許す誤用。§6.3.2 パスワードの開示 | #82 に "is not to be used" が BCP 14 キーワードでない旨を注記 |
| [^65] | openfga.dev Getting Started with Modeling | #84 | 支持 | 6 段階（Pick the most important feature〜Iterate）、"A user {user} can perform action {action} ... IF {conditions}"、"starting from the term 'role' might lead you down the wrong path" | なし |
| [^66] | openfga.dev Modular Models | #85, §2-15 | 支持 | "the ownership boundaries may not be clear and code review processes might not scale"、GitHub・GitLab・Gitea の code owners、type extension の制約（"must not already exist, or be part of another type extension"） | なし |
| [^67] | openfga.dev Testing Models | #86, §2-15 | 支持 | "Every OpenFGA model should be tested before deployment"、`.fga.yaml`、check・list_objects・list_users、"A good test covers scenarios that verify every relation"、`fga model test`、GitHub Actions | なし |
| [^68] | authzed.com Validation, Testing, Debugging | #87, §2-15 | 支持 | zed validate、assertTrue / assertFalse / assertCaveated、expected relations、explain flag、validate action は "highly recommended because it can prevent deployments of unverified changes" | 「強く推奨」に原文 "highly recommended" を併記（#87） |
| [^69] | authzed.com Migrating Schema | #88, §2-15 | 支持 | データがある relation・参照中の relation / permission の削除は不可、relation の追加・subject type の追加・permission の計算式変更は常に可、追加→二重書込み→backfill→permission から除去→書込み停止→削除の手順 | なし |
| [^70] | Google Cloud Roles and permissions（2026-09-30 更新） | #89 | 支持 | basic・predefined・custom の 3 種、basic role は "thousands of permissions"・本番では代替がない場合を除き付与しない、"You are responsible for maintaining custom roles"（新機能の権限追加を含む。predefined role は Google が自動更新すると対比）| なし |
| [^71] | Google Cloud IAM Conditions（2026-09-30 更新） | #89 | 支持 | legacy basic role と allUsers / allAuthenticatedUsers には条件を使えない、条件付き role binding は 100 を超えないことがベストプラクティス | なし |
| [^72] | Google Cloud Deny policies（2026-09-30 更新） | #90, §2-15 | 支持 | "IAM always checks relevant deny policies before checking relevant allow policies"、"If the condition evaluates to true or cannot be evaluated, the deny rule applies"、下位資源への継承、exceptionPrincipals、500 policy・500 rule | なし |
| [^73] | AWS IAM enforcement code logic | #91 | 支持 | root user を除き暗黙の拒否、明示 deny が allow に優先、評価順（deny 評価→RCP→SCP→resource-based→identity-based→permissions boundary→session policy） | なし |
| [^74] | AWS IAM Policy evaluation logic | #91 | 部分支持 | permissions boundary との積集合は一致。ずれ: SCP・RCP との積集合（3 種全ての許可が必要）は、原典では "accesses a resource that doesn't have a resource-based policy configured" の場合に限った記述で、RS-17 はこの条件を落としていた | #91 に条件を追記 |
| [^75] | AWS IAM Access Analyzer custom policy checks | #92 | 支持 | CheckNoNewAccess、CheckAccessNotGranted、CheckNoPublicAccess、"A charge is associated with each check" | なし |
| [^76] | Google Drive API manage-sharing（2026-09-14 更新） | #93, #96-7, §2-15 | 部分支持 | #93 は一致: user・group・domain・anyone、"Cannot be reduced on children ... or the folder must use the limited access setting"、子でより強い role、移動で再評価。ずれ: §2-15 と #96-7 は「継承した権限を子で縮小できない」を limited access 設定の例外なしに書き、§2-15 は GitHub と合わせて「主要 SaaS の共有は加算的で、継承した権限を子で縮小できない」と 2 製品の性質を 1 つに一般化していた | §2-15 を製品ごとの記述に分け、limited access の例外を明記。#96-7 と §5.2 の ADR-024 行も同様に修正 |
| [^77] | GitHub Docs Repository roles for an organization | #94 | 支持 | Read・Triage・Write・Maintain・Admin、組織所有者による base permissions | なし |
| [^78] | GitHub Enterprise Cloud Docs About custom repository roles（転送先） | #94, #96-7, §2-15 | 支持 | "Only organizations that use GitHub Enterprise Cloud can create custom repository roles"、上限 20、inherited role、"Roles and permissions are additive ... the user has the sum of all access grants"（逐語一致） | 脚注の URL を転送先に更新 |
| [^79] | Slack Help Center Slack Connect guide（en-gb 版で全文取得） | #95 | 支持 | 最大 250 組織、所有組織だけができる操作 4 項目（Invite organisations、Remove other organisations、Manage posting permissions、Continue using the channel if external organisations have been removed or disconnected）、プロフィール情報の範囲の選択。版 0.1 が「取得できず」とした一覧を取得できた | #95 に 4 項目を追記し未確認を解消。§6、脚注を更新 |
| [^80] | Slack Developer Docs Using Slack Connect API methods（転送先） | #95 | 支持 | `conversations.listConnectInvites`（"not been approved by all parties"）、"add an approval step to the Slack Connect process before invitations are sent to external people" | 脚注の URL を転送先に更新 |
| [^81] | Datatracker transaction-tokens | #26 | 支持 | WG state "WG Consensus: Waiting for Write-Up"、IESG state "I-D Exists"、最新版 -11（Latest revision 2026-07-30）、WG マイルストーン Dec 2026 | なし |
| [^82] | Datatracker identity-assertion-authz-grant | #70 | 支持 | WG state "WG Document"、IESG state "I-D Exists"、-04、Last updated 2026-05-21 | なし |
| [^83] | Datatracker identity-chaining | #70 | 支持 | IESG state "RFC Ed Queue"、Intended RFC status Proposed Standard、-17（Latest revision 2026-07-19） | なし |
| [^84] | Datatracker oauth-v2-1 | #70, §2-12 | 部分支持 | 状態は一致した: WG Document、IESG state "I-D Exists"、-16、Last updated 2026-09-02、マイルストーン "Dec 2026 Submit 'OAuth 2.1 Authorization Framework' to IESG"。ずれ: #70 は「MCP が準拠を求める OAuth 2.1 は draft-ietf-oauth-v2-1-16」としていたが、MCP 2026-07-28 の Standards Compliance が挙げるのは -13 であり（[^51]）、版の対応付けが誤っていた | #70、§2-12、§4 表を「MCP が参照するのは -13、最新は -16」に修正 |
| [^85] | Datatracker rfc7523bis（文書記録と History） | #21, §2-4 | 支持 | IESG state "RFC Ed Queue"、Intended RFC status Proposed Standard、最新版 -11。History: -11 は 2026-04-28 投稿、2026-04-30 IESG 承認、2026-05-04 RFC Ed Queue、2026-09-30 RPC 状態 "In Progress (Second Edit)" | 確認した日付を #21、§4 表、脚注に追記（[^12] の修正と一体） |
| [^86] | RFC 9728 .txt | #68 | 支持 | ヘッダ "Standards Track"、"April 2025" | なし |

追加した脚注:

| 脚注 | 原典（取得先） | 主張 | 内容 |
|---|---|---|---|
| [^87] | AWS API Gateway Developer Guide『Quotas for configuring and running a WebSocket in API Gateway』 | #55, §6 | "Connection duration for WebSocket API: 2 hours"（引上げ不可）、"Idle Connection Timeout: 10 minutes"（引上げ不可）。§6 の未確認事項「接続時間の上限」を解消するために追加した |

## 4. RS-17 に加えた修正（版 0.1 → 0.2）

| # | 箇所 | 修正内容 | 理由（脚注） |
|---|---|---|---|
| 1 | 冒頭メタ情報・前文 | 版を 0.2 にした。前文の「第三者による原典照合は未実施」を、AI による独立照合の実施（86 脚注、部分支持 5）と本記録の所在に改めた | — |
| 2 | §2-12, #70, §4 表, [^51] の参照箇所 | MCP 2026-07-28 版が参照する OAuth 2.1 は draft-ietf-oauth-v2-1-13 で、最新は -16 と分けて書いた | [^51], [^84] |
| 3 | §2-15, #96-7, §5.2（ADR-024） | 「主要 SaaS の共有は加算的で子で縮小できない」を、Google Drive（子で縮小不可、ただし limited access 設定がある）と GitHub（経路の異なる権限の加算）に分けて書いた。一般化の部分は [D] とした | [^76], [^78] |
| 4 | #16, [^9], §6 | Storm-2372 の頁の 2026-07-31 追記（Midnight Blizzard の初期アクセス担当サブクラスタと再評価）を加え、メッセージングサービスでの接触が "likely" の推定であることと PRT の取得を明記した。脚注の日付を最終更新 2026-07-31 に改め、逐語照合済みと記した | [^9] |
| 5 | #21, §4 表, [^12], [^85] | rfc7523bis-11 の日付を Datatracker の投稿日 2026-04-28 に改め、本文の日付表記（2026-03-26）が -07 から据え置きであることを注記した。IESG 承認（2026-04-30）、RFC Ed Queue 入り（2026-05-04）、RPC 状態（2026-09-30 時点 In Progress (Second Edit)）を追記した | [^12], [^85] |
| 6 | #91 | SCP・RCP との積集合は「resource-based policy の設定されていない資源へのアクセス」の場合であるという条件を加えた | [^74] |
| 7 | #4, [^2] | "not recommended" の所在を「§6.3 末尾」から §6.3.4.3 に精緻化した | [^2] |
| 8 | #12 | 「新しいコード」に原文 "a fresh token" を併記した | [^5] |
| 9 | #53 | 「token が接続中に失効しても」を原文（expires）に合わせて「期限切れになっても」に改めた | [^41] |
| 10 | #55, §6, [^87] | API Gateway の WebSocket 接続時間の上限 2 時間・アイドル 10 分（いずれも引上げ不可）を追加し、接続時の認可が残る時間の上限を [D] で記した。§6 の未確認から接続時間の上限を外した | [^87]（追加） |
| 11 | #76, [^59] | Access Approval に Access Transparency の除外事項が適用されること、EU Data Boundary with Access Justifications 等では自動承認が無効になることを追記した | [^59] |
| 12 | #82 | RFC 4513 §5.1.2 の「認可に使わない」は小文字の "is not to be used" で BCP 14 キーワードではないと注記した | [^64] |
| 13 | #87 | 「強く推奨」に原文 "highly recommended" を併記した | [^68] |
| 14 | #95, §6, [^79] | Slack Connect で所有組織だけができる操作 4 項目を追記し、未確認を解消した | [^79] |
| 15 | #32, §4 表, [^23] | CloudEvents v1.0.2 の公開日 2022-02-06（GitHub Release）を記入した | [^23] |
| 16 | §4 表 | OWASP ASVS 5.0.0 の公開日 2025-05-30 と、2026-10-03 時点の最新安定版であることを記入した | [^25], [^40] |
| 17 | §6, [^47] | Slack app approval の頁を全文で照合したことを記し、「一部だけ取得」の注記を改めた | [^47] |
| 18 | [^21] | 「更新日表示は未取得」を 2026-09-30 更新に改めた | [^21] |
| 19 | [^29], [^41], [^52], [^53], [^78], [^80] | 転送先の URL を記した | 上記 |
| 20 | §6 | 第三者照合の記載を更新し、Storm-2372 の逐語照合、Slack 頁の取得方法、Auth Context が v1.0.2 タグに含まれないことを記した | — |

結論サマリ（§2）のうち修正したのは §2-12 と §2-15 の 2 項目である。いずれも結論（設計への含意）の向きは変わらない。§2-4 の rfc7523bis の状態（IESG 承認済み、RFC Editor 処理中、RFC 未発行）は原典どおりで、修正していない。

## 5. 検証不能・二次情報の扱い

- **検証不能の脚注**: 0 件。全 86 脚注の原典を取得し、該当箇所を確認できた。
- **二次情報だけを根拠にした主張**: 本文の結論に使われているものは見つからなかった。RS-17 は seed-02 §10 の第三者 OAuth アプリ関連事故（Midnight Blizzard、Salesloft Drift）を既に「未確認」とし、結論に使っていない。本検証でも維持した。
- **取得方法による一次性の弱さ**: 版 0.1 の [^9]（Storm-2372）は、作成者が取得ツールの要約経由でしか読んでいなかった。原典自体は当事者（Microsoft Threat Intelligence）の一次報告であり、検証者が原文 HTML で逐語照合したため、二次情報の扱いにはしていない。
- **標準化団体以外の仕様への [N]**: MCP（LF Projects）、CloudEvents（CNCF）、OWASP ASVS は CONVENTIONS §3 の列挙する標準化団体の文書ではない。RS-17 は凡例でこの点を断ったうえで規範文に [N] を付けており、判定は変えていない。決裁で根拠の強さを評価する際は IETF・OIDF の文書と区別する必要がある。

## 6. 検証の限界

- 照合は 2026-10-03 時点で各ページが表示した内容に対して行った。ベンダー文書（Microsoft Learn、AWS、Google Cloud、Databricks、Snowflake、GitHub、Slack、OpenFGA、AuthZed）は後日の改訂で記述が変わり得る。とくに [^9] のように、公開後に追記で評価が変わる頁がある。
- Slack Help Center は接続元の地域で言語版が変わる。照合には同じ記事 ID の en-gb 版を使った。en-US 版との文言差は確認していない。
- SignalR の頁は既定で aspnetcore-10.0 のビューに転送された。.NET 11 の記述は同じビューに含まれていたが、aspnetcore-11.0 のビューとの差分は確認していない。
- Zanzibar 論文は PDF のテキスト抽出（2 段組の行が混在する形）で照合した。引用した文は前後の行と合わせて読み、意味を確認した。
- 本検証は脚注の付いた主張を対象にした。脚注のない [D] の推論（§3 の各まとめ項目、§5 の表）は、根拠とした項目と矛盾しないかだけを確認し、設計判断としての妥当性は評価していない。他の調査ノートの項目（RS-04#73、RS-06#57 など）への参照は、その項目の内容までは照合していない。
- 検証者は AI エージェントであり、規範文の解釈や [D] の推論の妥当性については、人間のレビュアによる確認が別途必要である。
