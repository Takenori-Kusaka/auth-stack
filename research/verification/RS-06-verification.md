# RS-06 独立検証記録（脚注の原典照合）

> 文書ID: RS-06-V / 版: 0.1 / 状態: review / 最終更新: 2026-10-03
> 対応要求: R-100, R-206, R-209, R-029（RS-06 の対応要求に準ずる）
> 依存文書: CONVENTIONS.md, research/RS-06-workload-identity-delegation-agents.md（検証対象。検証後に版 0.1 から 0.2 へ改訂）

本記録は、RS-06 の作成者とは別の AI エージェント（Claude）が 2026-10-03 に行った脚注の原典照合のログである。検証者も AI であり、人間のレビュアによる照合ではない。判定は検証者の読解によるもので、CTO/CISO の決裁ではない。

---

## 1. 検証の方法

| 項目 | 内容 |
|---|---|
| 対象 | RS-06 版 0.1 の全脚注 [^1]〜[^52]（52 件）と、各脚注が付いた本文の主張（§2 結論サマリ、§3 調査結果 RS-06#1〜#80、§4 ステータス表） |
| 取得 | 全 52 脚注の原典を 2026-10-03 に取得した。文言・規範語を逐語で照合するため、curl で原文を取得し、HTML はテキスト化、PDF は pdftotext で抽出して全文検索した。WebFetch は要約を返すため照合には使わなかった |
| IETF 文書 | 本文は IETF アーカイブの原文テキスト（`https://www.ietf.org/archive/id/<name>-<rev>.txt`、RFC は rfc-editor.org の .txt）で照合した。状態は Datatracker の `doc.json`（rev・rev_history・expires・iesg_state・rfceditor_state）と `/api/v1/doc/document/<name>/` の states（draft-stream-ietf 等）、置換関係は `/api/v1/doc/relateddocument/` で確認した |
| GitHub 文書 | SPIFFE 仕様は raw.githubusercontent.com の main を取得し、各ファイルの最終変更コミット日は `git log`（blob なしクローン）で確認した。MCP 仕様は modelcontextprotocol/modelcontextprotocol を sparse clone して `docs/specification/2026-07-28/` の .mdx を照合し、modelcontextprotocol.io の各 URL が HTTP 200 で同じ版を返すことも確認した。ext-auth も clone して確認した。リリース日は GitHub の releases.atom で確認した（GitHub REST API はレート制限で使えなかった） |
| NIST 文書 | SP 800-207A・IR 8587 は DOI 経由の PDF、NCCoE concept paper は記載 URL の PDF（ブラウザ UA 指定で取得可能）、状態・日付は CSRC の文書ページで確認した |
| ベンダー文書 | Microsoft Learn は `updated_at` メタデータ、Google Cloud は「Last updated」表示、AWS は本文を確認した |
| 判定区分 | 支持: 脚注の参照箇所が主張を全て裏付ける。部分支持: 主張の核心は裏付けられるが、限定条件・版・日付・題名・規範強度の表現のいずれかが原典とずれる。不支持: 原典が主張を裏付けない、または反する。検証不能: 原典を取得できない、または該当箇所が見つからない |
| 規範強度 | IETF 草案・RFC・MCP・AIMS・NIST IR 8587 の MUST / MUST NOT / SHOULD / SHOULD NOT / MAY / RECOMMENDED / REQUIRED / OPTIONAL を、本文の該当文と 1 文ずつ照合した。小文字の should/must（BCP 14 の規範語ではない）を大文字相当に書いていないかも確認した |

## 2. 判定の集計

| 判定 | 件数 | 脚注 |
|---|---|---|
| 支持 | 46 | 下表の「支持」 |
| 部分支持 | 6 | [^4], [^9], [^13], [^21], [^30], [^42] |
| 不支持 | 0 | — |
| 検証不能 | 0 | — |

部分支持の 6 件は、いずれも RS-06 版 0.2 で修正した（§4）。出典の差し替えが必要な脚注はなかった。二次情報だけを根拠にした主張は見つからなかった（全主張が原典の脚注を持つ）。検証の過程で、§6 の未確認事項 1 件（MCP feature lifecycle ポリシーの 12 か月）を原典で確認し、脚注 [^53] を追加した。

## 3. 脚注ごとの判定表

凡例: 「主張」は脚注が付いた RS-06 の項目番号（#n）と結論サマリの番号（§2-n）、ステータス表（§4）。

| 脚注 | 原典（取得先） | 主張 | 判定 | 照合結果（原典の該当箇所） | 修正 |
|---|---|---|---|---|---|
| [^1] | SPIFFE.md（main） | #1 | 支持 | §3 "The supported document types are an X.509 certificate, JWT token and WIT token."、冒頭 "Stability: Stable" | なし |
| [^2] | STABILITY.md（main、21896ac） | #2 | 支持 | §2 の 4 区分。Stable "breaking changes are severely avoided and reserved for resolving critical security issues"、"production-critical use"。§2.3 "it is recommended that adopters record the revision"。導入コミット 21896ac は 2026-07-01 | なし |
| [^3] | X509-SVID.md（main） | #3, #4, §2-3, §2-4, §4 | 支持 | 冒頭 Stable。§2 "MUST contain exactly one URI SAN"、"Validators encountering an SVID containing more than one URI SAN MUST reject"。§3.1 "MUST have a non-root path component"。§3.2 "Signing certificates MUST NOT be used for authentication purposes"。最終変更 2026-07-01 | なし |
| [^4] | JWT-SVID.md（main） | #3, #5, #6, §2-3 | 部分支持 | 規範要求（§2.1 alg、§2.3 typ、§3.2 aud、§3.3 exp、§4、§6.2 "MUST extract the JWT-SVID specific keys"、§7.1 "susceptible to replay attacks"、§7.2 "strongly recommended"）は全て一致。ただし #5 の注記「小文字表記で BCP 14 の規範語ではない」は、SPIFFE 仕様群が BCP 14（RFC 2119/8174）の適用自体を宣言していない点を欠き、大文字 MUST が BCP 14 の規範語であるかのような前提を置いていた | #5 の注記を「SPIFFE 仕様群は BCP 14 の適用を宣言しておらず、大文字の MUST 等も慣用表記」に修正 |
| [^5] | SPIFFE-ID.md（main） | #3, #7 | 支持 | 冒頭 Stable。§2.1 "nominally self-registered"。§2.1.1 "no guarantee of global uniqueness nor is there any technical means for preventing..."、登録済みドメイン名を接尾辞に使う助言 | なし |
| [^6] | WIT-SVID.md（main） | #3, §4 | 支持 | 冒頭 "Stability: Incubating"。追加コミット 665a28f は 2026-07-01 | なし |
| [^7] | CNCF SPIRE プロジェクトページ | #8, §2-3, §4 | 支持 | "accepted to CNCF on March 29, 2018, moved to the Incubating maturity level on June 22, 2020, and then moved to the Graduated maturity level on August 22, 2022" | なし |
| [^8] | spiffe/spire releases（releases.atom） | #8, §4 | 支持 | v1.15.3 2026-08-21、v1.14.7 2026-05-28 | なし |
| [^9] | NIST SP 800-207A PDF（DOI）、CSRC ページ | #9, #10, §2-14, §4 | 部分支持 | 状態 Final・2023-09、ID-SEG-REC-2（p.8、"should present a short-lived cryptographically verifiable identity credential ... reauthenticated regularly"、TTL または 15-30 分）、ID-SEG-REC-4 注記（p.8、"NIST recommends using short-lived end user credentials ... exchanging them for a locally authenticatable token"）、ID-SEG-REC-5（p.9）は一致。ただし題名が PDF 本体では「...in Multi-Location Environments」で、ノートの「Multi-Cloud Environments」は CSRC 文書ページの表示とだけ一致していた | #9 と [^9] の題名を PDF 本体の題名に直し、CSRC 表示との差を併記 |
| [^10] | NIST IR 8587 PDF（DOI）、CSRC ページ | #11, #12, §2-14, §4 | 支持 | CSRC "Date Published: September 2026"（/final）。§1.1.1（p.2）、§1.2 "conformance ... remains voluntary ... unless otherwise determined through policy ... or other binding agreements"、大文字のみ規範語。§5.3.1.6（p.32）"MUST use tightly scoped, short-lived tokens that are issued exclusively through approved enterprise identity platforms and SHOULD use sender-constrained mechanisms (e.g., mTLS, DPoP)" | 副題「Implementation Recommendations for Agencies and Cloud Service Providers」を [^10] に追記 |
| [^11] | NCCoE concept paper PDF | #13, #14, §2-14 | 支持 | 表紙 "DRAFT February 2026"、著者 Booth・Bill Fisher・Galluzzo・Roberts。p.1 Abstract（意見募集で範囲を決める）、p.4 Note to Reviewers（"on behalf of"、"human-in-the-loop"、least privilege の問い）、p.6〜7 §2（MCP、OAuth 2.0/2.1、OIDC、SPIFFE/SPIRE、SCIM、NGAC）、p.7 §3 "external agents from untrusted sources will not be addressed under this initial effort" | なし |
| [^12] | CSRC 文書ページ | #13, §2-14, §4 | 支持 | "Other (Initial Public Draft) [Concept Paper]"、"Date Published: February 5, 2026"、"Comments Due: April 2, 2026 (public comment period is CLOSED)" | なし |
| [^13] | Datatracker（doc.json、API states、relateddocument、文書検索） | #15, #16, #29, #46, #48, #52, #63, #68, #74, §2-1, §2-3, §2-10, §2-15, §4 | 部分支持 | 各草案の rev・WG 状態・IESG 状態・RFC Editor 状態・失効日・置換関係（s2s-protocol → creds/http-signature/mutual-tls/wpt、klrc → aims）、WIMSE の RFC 0 件は一致。誤り: (a) §4 の s2s-protocol -07 の日付 2025-11-06 は Datatracker 記録の最終更新時刻（置換処理時）で、-07 の掲載日は 2025-10-16。(b) 失効済み SCIM エージェント草案に draft-scim-agent-extension-00（2025-10-11、Expired、個人提出）が漏れており「2 件」は「少なくとも 3 件」。(c) §2-15 の「最新の draft-wzdk」は、より新しい draft-kushwaha-scim-agent-governance-00（2026-07-26）があるため不正確。補足: rfc7523bis-11 の Datatracker 掲載は 2026-04-28（文書内日付 2026-03-26）、kushwaha-00 の掲載は 2026-07-27 UTC（文書内日付 2026-07-26） | §4 の s2s 日付を修正。§2-3・#74・§4 に draft-scim-agent-extension を追加。§2-15 を「現行の基底となる」に修正。#52・§4 に掲載日を併記。[^13] に rev_history と time の区別を明記 |
| [^14] | WIMSE WG ページ（charter-ietf-wimse-01、Milestones） | #16, §2-3 | 支持 | Milestones: 2026-07（arch、Informational）、2025-11（1 件）、2025-03（3 件）。補足: 表には 2024-11 期限の Informational マイルストーン（Kubernetes のファイルシステム JWT 配布）もある | #16 に 2024-11 マイルストーンと、IESG 提出済みの WG 文書は practices だけである点を追記。§2-3 の「憲章マイルストーンは全て期限超過」を、対象を明示した表現に修正 |
| [^15] | draft-ietf-wimse-arch-08 | #17〜#20, §2-6, §2-12 | 支持 | §3.1.1 "SHOULD be identified by a fully qualified domain name"、"MUST be obtained through a secure mechanism"。§3.1.3 "SHOULD use bounded credential lifetimes and automated renewal"。§3.2.2 token exchange で transaction token へ、"A bearer token ... is not usually forwarded"。§3.4.9 小文字 should。§3.4.11 SHOULD propagate、"autonomous actions MUST be clearly distinguished"、"each hop in the chain MUST explicitly scope and re-bind"。§4.5 | なし |
| [^16] | draft-ietf-wimse-workload-creds-02 | #21〜#24 | 支持 | §4 "exactly one Workload Identifier"、"MUST NOT be encoded as a second workload identifier"。§5.1 typ wit+jwt、cnf.jwk MUST、"MUST NOT be used as a bearer token"、ES256 MUST。§9.2.1 "MUST have a limited lifetime"、"SHOULD ... be short-lived, typically on the order of hours"。§6.1 "exactly one SubjectAltName extension of type URI"。§8 SPIFFE WIC "fully compatible with the X509-SVID and widely used"、WIT beta、Defakto alpha、Teleport research。§5.3 | なし |
| [^17] | draft-ietf-wimse-mutual-tls-02 | #25 | 支持 | §5 "Authorization policies MUST NOT evaluate only the path ... without also considering the trust domain and the trust anchor"、"MUST NOT share private keys across unrelated workload instances" | なし |
| [^18] | draft-ietf-wimse-identifier-03 | #25 | 支持 | §7.2 "MUST only be considered authenticated when presented in a credential or token that has been cryptographically verified"、"plaintext string ... MUST NOT be treated as authenticated"。§4.5 "SHOULD NOT be reassigned ... unless explicitly intended by the policies of the trust domain"（例外条件をノートが省略） | #25 に例外条件を追記（判定は支持のまま） |
| [^19] | draft-ietf-wimse-workload-identity-practices-07 | #26, #27, §2-13 | 支持 | §5.4 "MUST NOT exceed the lifetime of the workload instance ... unless the issuing platform cannot determine"。§5.5 "MUST invalidate ... unless the credential lifetime is short enough"。§5.7 "MUST be audienced"、"MUST NOT carry more than one audience, unless..."、プラットフォーム API token "MUST NOT be used beyond the platform API"。§5.8 "MUST NOT be granted based solely on untrusted or easily forgeable attributes"、iss の警告 | なし |
| [^20] | draft-ietf-wimse-wpt-02 | #28 | 支持 | §2 tth は SHA-256 の base64url、"the tth and oth claims are each mandatory if the respective tokens are included in the request" | なし |
| [^21] | draft-ietf-oauth-transaction-tokens-11 | #29〜#42, §2-1, §2-2, §2-11〜§2-13 | 部分支持 | 照合した規範文は全て一致（§3・§10 "MUST have exactly one logical TTS"、§5.1/§11 "MUST use [RFC8693]"、§6 MUST NOT／MAY、§8.2 impersonation、§9.1 typ、§9.2 必須・RECOMMENDED・OPTIONAL と "MUST ignore"、§9.2.1、§11.1 audience MUST、§11.3、§11.5、§12〜§12.2、§13.1 "not resistant to replay attacks"・MUST、§13.2、§13.6、§13.10、§13.12〜§13.15、§14 SHOULD、§15.2 MUST NOT）。ずれ: (a) #41 は token type URN と claim も「提案する」段階としたが、草案は URN・claim を "registers" と書き、"will be proposed"／"is proposed" はメディアタイプと HTTP ヘッダーだけ。(b) #38 の「保護する必要がある」は原文が小文字 "should be protected" で、強度表示がなかった | #41 を原文の書き分けどおりに修正し、IANA 側の登録状況は未確認と明記。#38 に「小文字の should」を明記 |
| [^22] | RFC 8693 | #43〜#45, §2-7, §2-11 | 支持 | §1.1 "In a sense, A is an agent for B."。§2.1 "MUST perform the appropriate validation procedures"、"does not create a tight linkage"、"not a general property of the STS protocol"。§4.1 "MUST only consider the token's top-level claims and the party identified as the current actor"、"informational only"。§4.4 "might be used"／"can be used"（処理義務なし） | なし |
| [^23] | draft-ietf-oauth-identity-chaining-17 | #46, #47, §2-10 | 支持 | §2.3・§2.4 の流れ。§2.3.3 aud MUST、単一認可サーバーを RECOMMENDED。§2.4.2 RFC 7523 §3・§3.1 で検証 MUST、subject 不明なら deny MUST。§5.4 SHOULD NOT issue refresh tokens。§5.5 bearer、短命・一回限り・クライアント認証 | なし |
| [^24] | draft-ietf-oauth-identity-assertion-authz-grant-04 | #48〜#51, §2-10, §4 | 支持 | §1 identity chaining の profile。§4.3 "MUST accept Identity Assertions"、"MAY additionally accept Refresh Tokens"。§3.1 typ MUST、REQUIRED／OPTIONAL の区分、tenant は [OpenID.Enterprise] 参照。§4.4.1 aud はちょうど 1 要素、client_id 一致 MUST、部分集合 MAY。§4.4.3 SHOULD NOT return a Refresh Token。§9.1 SHOULD only be supported for confidential clients。§9.3 MUST NOT（同一 domain）、テナント・顧客境界は可、別下流での再利用 MUST NOT。§9.7 actor_token の規範処理なし。§6.1 tenant MUST、§6.3 iss+tenant+sub 一意 MUST | なし |
| [^25] | draft-ietf-oauth-rfc7523bis-11 | #52 | 支持 | 文書内日付 26 March 2026。§4 b. "MUST use the issuer identifier ... as its sole value"、"MUST NOT be used as an audience value"、"In the absence of an application profile specifying otherwise, applications MUST compare ... Simple String Comparison" | #52 に「アプリケーション profile が別に定めない限り」と Datatracker 掲載日を追記（判定は支持のまま） |
| [^26] | RFC 9396 | #53 | 支持 | §1 "an amount of 45 Euros to Merchant A" の例、authorization_details | なし |
| [^27] | MCP GitHub（docs/specification 版ディレクトリ、releases.atom） | #54, §2-9 | 支持 | 版ディレクトリ 2024-11-05、2025-03-26、2025-06-18、2025-11-25、2026-07-28（ほかに draft）。Release「2026-07-28」は 2026-07-28T16:47:49Z | なし |
| [^28] | MCP Governance and Stewardship | #55 | 支持 | "established as Model Context Protocol a Series of LF Projects, LLC"、"hierarchical structure"、"Lead Maintainers (BDFL) Final decision authority" | なし |
| [^29] | MCP 2026-07-28 Key Changes | #56, §2-9 | 支持 | Major changes 1（セッションと Mcp-Session-Id の削除）・2（initialize handshake の削除、stateless）、Deprecated 4（DCR を CIMD 優先で廃止予定）、Governance and process updates 1（"a minimum twelve-month deprecation window"） | なし |
| [^30] | MCP 2026-07-28 basic/authorization | #57〜#61, #63, #65, §2-9 | 部分支持 | §3 の各項目は一致（Protocol Requirements: OPTIONAL、HTTP は SHOULD conform、STDIO は SHOULD NOT。Overview 1 MUST OAuth 2.1、4 MUST RFC 9728。Authorization Response Validation の SHOULD／MUST と将来 MUST 化の見込み。Resource Parameter の MUST 群と "regardless of whether authorization servers support it"。Token Handling "MUST only accept"・"MUST NOT accept or transit"。Scope Challenge の SHOULD、Step-Up の SHOULD と "Servers MUST account for scope hierarchies"。Standards Compliance が -13 と CIMD -00 を指定）。ずれ: §2-9 は「HTTP 系 transport で実装する場合、MCP server は RFC 9728 を実装しなければならず（MUST）」と書き、HTTP 系 transport の適合自体が SHOULD である層を省いていた | §2-9 を「認可を実装する HTTP 系 transport は認可仕様に適合すべき（SHOULD）。適合する実装では…MUST」に修正 |
| [^31] | MCP authorization-server-discovery | #58 | 支持 | "MCP servers MUST implement ... RFC9728"、"MUST include the authorization_servers field containing at least one"、metadata の issuer 不一致は "MUST NOT use the metadata" | なし |
| [^32] | RFC 9728 | #58, #59 | 支持 | §3.3 "If these values are not identical, the data contained in the response MUST NOT be used."。§7.4 "the client SHOULD request audience-restricted access tokens" | なし |
| [^33] | RFC 8707 | #59 | 支持 | §2 "The authorization server SHOULD audience-restrict issued access tokens to the resource(s) indicated" | なし |
| [^34] | RFC 9207 | #61 | 支持 | §2.4 "clients MUST reject the authorization response and MUST NOT proceed" | なし |
| [^35] | MCP client-registration | #62 | 支持 | "Clients supporting all options SHOULD use the following priority order"（事前登録 → CIMD → DCR → 利用者入力）、"MCP clients and authorization servers SHOULD support ... CIMD"、DCR は MAY かつ deprecated | なし |
| [^36] | draft-ietf-oauth-client-id-metadata-document-02 | #62, #63 | 支持 | 日付 6 July 2026。§4.1 共有秘密系の token_endpoint_auth_method は MUST NOT。§8.6 特殊用途 IP への取得 MUST NOT、本番での例外適用 MUST NOT。セキュリティ考慮事項は -02 で §8（-00 は §6、両版の目次で確認） | なし |
| [^37] | MCP authorization/security-considerations | #60, #63, #64, §2-9 | 支持 | Access Token Privilege Restriction "MUST NOT pass through the token"。Authorization Code Protection の PKCE・S256 MUST、`code_challenge_methods_supported` 欠如時 "MUST refuse to proceed"。Open Redirection の完全一致 MUST。Token Theft の public client rotation MUST。CIMD Security が -00 の "Section 6" を参照 | なし |
| [^38] | MCP server/tools | #66, §2-8 | 支持 | Warning "there SHOULD always be a human in the loop with the ability to deny tool invocations"、"Applications SHOULD: ... Present confirmation prompts"。"clients MUST consider tool annotations to be untrusted unless they come from trusted servers" | なし |
| [^39] | MCP /specification/latest（2026-07-28 へ転送） | #54, #66 | 支持 | /specification/latest は /specification/2026-07-28 へ転送。BCP 14 宣言（"when, and only when, they appear in all capitals"）。Key Principles の小文字 "Hosts must obtain explicit user consent before invoking any tool"。"While MCP itself cannot enforce these security principles at the protocol level" | なし |
| [^40] | ext-auth README | #67 | 支持 | Extensions: Stable に Enterprise-Managed Authorization、Draft に Client Credentials | なし |
| [^41] | ext-auth specification/stable/enterprise-managed-authorization.mdx | #67, §2-10, §4 | 支持 | "**Status**: Stable"、ID-JAG -04 の各節へのリンク、§1.1 "automatically obtain access tokens ... without user interaction"、企業管理者の可視化・統制。最終変更コミット 2026-06-18 | なし |
| [^42] | draft-ietf-wimse-aims-00 | #68〜#73, §2-6, §2-8 | 部分支持 | Abstract・§2、§4 "Agents are workloads"、§6 "MUST be uniquely identified"・"MUST be assigned exactly one WIMSE identifier"、§7 MUST／SHOULD／MUST と静的 API キーのアンチパターン、§10.3 "These identifiers MUST be used by resource servers"、§10.4.1・§10.4.2、§10.6 SHOULD、§10.7 "MUST be bound to a verifiable authorization grant"・"MUST NOT treat local UI confirmation alone as sufficient"、§11 の MUST 群は一致。ずれ: (a) #71 の「Transaction Token に交換することを推奨」は、原文が §10.5 "can exchange"、§10.8 小文字 "should use" で、推奨の強度が原文より強く読める。(b) #72・§2-8 の「追加の設計作業が要る」「追加の標準化作業が要ると明記」は、原文 "Additional specification or design work may be needed" より断定的 | #71 を "can exchange"／小文字 should に修正。#72・§2-8 を「必要になり得る（may be needed）」に修正 |
| [^43] | OpenID CIBA Core 1.0 | #72, §4 | 支持 | 表題下に "Final"、"September 1, 2021"、Abstract | なし |
| [^44] | draft-wzdk-scim-agent-resource-00 | #74, §2-15 | 支持 | 5 June 2026、Informational。§3 Agent リソース型、§4.1 agentUserName "MUST be unique ... REQUIRED"、§4.2 owners、§4.4 members の拡張 | なし（§2-15 の「最新」は [^13] の項で修正） |
| [^45] | draft-kushwaha-scim-agent-governance-00 | #74 | 支持 | Abstract: "a lifecycle state model richer than a boolean, an autonomy classification, an operational validity window" | なし |
| [^46] | Microsoft Learn: What are agent identities?（updated_at 2026-06-15） | #75 | 支持 | "specialized identity construct"、application identities・human user identities との対比、"distinguish operations performed by AI agents from ... workforce, customer, or workload identities"、Autonomous access／Delegated access、Copilot Studio "The user who created the agent is recorded as its sponsor" | なし |
| [^47] | Datatracker 文書検索 API | #76 | 支持 | 同条件で再実行し total_count 258、AI 関連語 203 件（単語境界付き正規表現。部分一致では 237 件）、その中の draft-ietf- は 0 件を再現（全 258 件中の WG 文書は draft-ietf-sshm-ssh-agent の 1 件で AI 無関係） | #76 と [^47] に単語境界の条件と再現結果を追記（判定は支持のまま） |
| [^48] | Google Cloud Workload Identity Federation（Last updated 2026-09-30 UTC） | #77, §2-5 | 支持 | X.509 client certificates、AWS／Azure、AD、GitHub／GitLab、OIDC／SAML 2.0。Direct resource access と service account impersonation | なし |
| [^49] | Google Cloud Managed workload identities（Last updated 2026-09-30 UTC） | #78, §2-5 | 支持 | SPIFFE ベース、CA Service からの X.509、SPIFFE ID 形式（Compute Engine、GKE、Agent identity の `spiffe://agents.global.org-ORGANIZATION_ID.system.id.goog/resources/aiplatform/...`）、"Managed workload identities for GKE ( Preview )" | なし |
| [^50] | AWS IAM Roles Anywhere User Guide | #79, §2-5 | 支持 | 自社 CA の X.509 で一時資格情報、CA を trust anchor に登録。Account trust boundary "Certificates issued by any trust anchor in the account can be used to assume any target role in that same account, unless you specify conditions" | なし |
| [^51] | AWS IAM outbound identity federation | #79 | 支持 | GetWebIdentityToken で短命の署名付き JWT、OIDC discovery の検証鍵、IAM ポリシーで署名アルゴリズム・audience・有効期間を制御 | なし |
| [^52] | Microsoft Learn: Workload identity federation（updated_at 2026-08-13） | #80, §2-5 | 支持 | Kubernetes、GitHub Actions、Google Cloud、AWS（IAM Outbound Identity Federation）、SPIFFE/SPIRE。"must case-sensitively match"、"stores only the first 100 signing keys" | なし |

## 4. RS-06 への修正内容（版 0.1 → 0.2）

| # | 箇所 | 修正前（要旨） | 修正後（要旨） | 根拠脚注 |
|---|---|---|---|---|
| 1 | メタ情報・§0 | 版 0.1 / draft | 版 0.2 / review。独立検証を反映した旨と本記録への参照を追記 | — |
| 2 | §2-3 | 「憲章マイルストーンは全て期限超過」「SCIM…うち 2 件は失効済み」 | 「標準化トラック文書とアーキテクチャ文書の憲章マイルストーンはいずれも期限超過で IESG 未提出」「少なくとも 3 件は失効済み」 | [^13][^14] |
| 3 | §2-8 | AIMS は実行途中の承認方式に「追加の標準化作業が要ると明記」 | 「追加の仕様化・設計作業が必要になり得る（may be needed）と注記」 | [^42] |
| 4 | §2-9 | HTTP 系 transport で実装する場合 MCP server は RFC 9728 を MUST | 認可を実装する HTTP 系 transport は認可仕様に適合すべき（SHOULD）。適合する実装では RFC 9728 等が MUST | [^30] |
| 5 | §2-15 | 「最新の draft-wzdk-scim-agent-resource-00」 | 「現行の基底となる draft-wzdk-…-00」。拡張草案 kushwaha-00 も個人提出と併記 | [^13][^44] |
| 6 | #5 | 「小文字表記で BCP 14 の規範語ではない」 | SPIFFE 仕様群は BCP 14 の適用を宣言しておらず、大文字 MUST も慣用表記である旨を明記 | [^4] |
| 7 | #9・[^9] | 題名「…Multi-Cloud Environments」 | PDF 本体の題名「…Multi-Location Environments」に修正し、CSRC 表示との差を併記 | [^9] |
| 8 | #16 | 標準化トラック・アーキテクチャのマイルストーンだけを記載 | 2024-11 期限の Informational マイルストーンと、IESG 提出済みの WG 文書は practices だけである点を追記 | [^13][^14] |
| 9 | #25 | 識別子の再割当ては SHOULD NOT | 「trust domain の方針で明示的に意図する場合を除き」SHOULD NOT | [^18] |
| 10 | #38 | TTS 構成情報を「保護する必要がある」 | 「保護されるべき（小文字の should で BCP 14 の規範語ではない）」 | [^21] |
| 11 | #41 | URN・claim・メディアタイプ・ヘッダーの IANA 登録は全て「提案する」段階 | URN・claim は登録内容として記載、メディアタイプとヘッダーは "will be proposed"／"is proposed"。IANA 側の登録状況は未確認と明記 | [^21] |
| 12 | #52・§4 | rfc7523bis の日付は文書内日付だけ。比較は単純文字列比較 MUST | Datatracker 掲載 2026-04-28 を併記。「アプリケーション profile が別に定めない限り」を追記 | [^13][^25] |
| 13 | #71 | AIMS は Transaction Token への交換を「推奨」 | §10.5 "can exchange"、§10.8 小文字 "should use" と書き分け | [^42] |
| 14 | #72 | 「追加の設計作業が要ると注記」 | 「追加の仕様化・設計作業が必要になり得る（may be needed）と注記」 | [^42] |
| 15 | #74・§4 | 失効済みの先行草案 2 件 | draft-scim-agent-extension-00（2025-10-11、Expired）を追加 | [^13] |
| 16 | #76・[^47] | 正規表現の条件に単語境界の記載なし | 単語境界付きであること、部分一致では 237 件になること、再現結果を追記 | [^47] |
| 17 | §4 | s2s-protocol -07 の日付 2025-11-06 | 2025-10-16（2025-11-06 は置換処理による記録更新日と注記） | [^13] |
| 18 | §4 | kushwaha-00 は「draft（個人提出）」、日付 2026-07-26 | 「個人提出、Informational」、文書内日付と Datatracker 掲載日 2026-07-27 UTC を併記 | [^13] |
| 19 | [^10]・[^13] | 題名の副題なし／API の参照箇所の説明 | IR 8587 の副題を追記。版の日付は rev_history.published により、time は記録の最終更新時刻であると明記 | [^10][^13] |
| 20 | §6・[^53] | 12 か月の廃止猶予は変更履歴の記述だけによる（未確認） | feature lifecycle ポリシー本文で "at least twelve" months を確認し、脚注 [^53] を追加 | [^29][^53] |

結論サマリ（§2）とステータス表（§4）は上記の修正と整合させた。§5 の設計推論（[D]）は、修正した事実の範囲では結論が変わらないため変更していない。§5.1 の層別（L1〜L4）も、各草案の状態が確認結果どおりであるため変更していない。

## 5. 検証不能とした主張と理由

検証不能とした脚注はない。次の点は、ノートが自ら「未確認」または範囲外としており、本検証でも根拠に使っていない。

| 項目 | 状態 |
|---|---|
| NCCoE プロジェクトページ（concept paper 後の段階） | 本検証でも project description・協力者募集は確認していない。concept paper の PDF は記載 URL からブラウザ UA 指定で取得できた。CSRC 文書ページは確認日時点で concept paper（ipd）だけを掲載していた |
| Transaction Tokens 対応の TTS 製品・OSS | ノートどおり未確認（草案に実装状況節がない） |
| SPIRE の WIT-SVID 実装状況 | ノートどおり workload-creds 草案の自己申告（beta）だけが根拠 |
| Google Cloud の Compute Engine 向け・エージェント ID の提供段階（GA か否か） | 本検証でも、managed workload identities のページで Preview 表示が GKE 向けにだけ付いていることのみ確認した |
| Txn-Token 関連の IANA レジストリ側の登録状況 | 未確認（#41 に明記した） |
| [OpenID.Enterprise]（ID-JAG の tenant 定義の参照先）の状態 | ノートどおり未確認 |

## 6. 検証者の所見（修正対象外）

- [^30] の MCP 認可仕様は OAuth 2.1 を -13 で参照する一方、Refresh Tokens 節の 1 か所は -14 を参照している。ノートの主張（-13 を規範参照）には影響しない。
- [^41] の Enterprise-Managed Authorization は、ID-JAG -04 のほか、CIMD -01 と MCP 2025-11-25 版へのリンクも含む。ノートの主張（Stable 表示で ID-JAG -04 に依存）には影響しない。
- NIST CSRC の concept paper ページには、確認日時点で 2026-09-29 付けの大統領令に関する告知が加わっていた。文書の状態・日付・意見募集の終了表示は変わっていない。
- SPIFFE 仕様群が BCP 14 を宣言していないことは、RS-06 の L1 層（Stable 仕様を契約に使う）の判断を変えない。ただし社内 profile で SPIFFE の要求を引用するときは、規範語の解釈を profile 側で定める必要がある（設計推論 [D]、本記録 §3 の [^4] から導出）。
