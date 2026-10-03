# RS-04 独立検証記録（脚注の原典照合）

> 文書ID: RS-04-V / 版: 0.1 / 状態: review / 最終更新: 2026-10-03
> 対応要求: R-158〜R-163, R-095, R-096, R-100, R-206, R-046, R-045, R-064, R-143, R-189, R-197, R-198（RS-04 の対応要求に準ずる）
> 依存文書: CONVENTIONS.md, research/RS-04-oauth-oidc-profile.md（検証対象。検証後に版 0.1 から 0.2 へ改訂）

本記録は、RS-04 の作成者とは別の AI エージェント（Claude）が 2026-10-03 に行った脚注の原典照合のログである。検証者も AI であり、人間のレビュアによる照合ではない。判定は検証者の読解によるもので、CTO/CISO の決裁ではない。

---

## 1. 検証の方法

| 項目 | 内容 |
|---|---|
| 対象 | RS-04 版 0.1 の全脚注 [^1]〜[^35]（35 件）と、各脚注が付いた本文の主張（§2 結論サマリ、§3 調査結果 RS-04#1〜#80、§4 ステータス表、§5.2 の seed 再検証、§6） |
| 取得 | 全 35 脚注の URL を 2026-10-03 に取得した（全て HTTP 200）。RFC は rfc-editor.org の `.txt`、I-D は ietf.org/archive の `.txt`、OIDF の仕様・告知・WG 一覧は HTML を curl で取得してテキスト化し、規範語と日付を全文検索で逐語照合した。WebFetch は小型モデルの要約を返すため、照合には使わなかった |
| 状態の確認 | I-D の状態は Datatracker の HTML と Datatracker API（`/api/v1/doc/document/<name>/` と各 state）の両方で確認した。OIDF の告知は、原ページの HTML に加え、OIDF サイトの WordPress API（`/wp-json/wp/v2/posts?search=...`）で後続告知の有無を確認した |
| 補助確認 | 本ノートが引く RFC のうち RFC 6749 を除く 15 件の errata を RFC Editor の errata 検索ページで確認した。8725bis の規範参照 draft-ietf-jose-deprecate-none-rsa15 の状態を Datatracker API で確認した。WebSearch はセッションの上限に達していたため使っていない |
| 判定区分 | 支持: 脚注の参照箇所が主張を全て裏付ける。部分支持: 主張の核心は裏付けられるが、限定条件・版・日付・帰属・書誌・用語のいずれかが原典とずれる。不支持: 原典が主張を裏付けない、または反する。検証不能: 原典を取得できない、または該当箇所が見つからない。1 つの脚注が複数の主張に付いている場合は、最も弱い判定をその脚注の判定とした |
| 規範強度 | RFC の MUST / MUST NOT / REQUIRED / SHOULD / SHOULD NOT / RECOMMENDED / MAY と、OIDF 仕様の shall / shall not / should / should not / may を、本文の該当文と 1 文ずつ照合した。RFC 9700 については §2 と §4 の BCP 14 キーワードを含む文を機械抽出し、§3.1 の 39 行と突き合わせた |

## 2. 判定の集計

| 判定 | 件数 | 脚注 |
|---|---|---|
| 支持 | 29 | 下表の「支持」 |
| 部分支持 | 5 | [^1], [^9], [^15], [^18], [^29] |
| 不支持 | 1 | [^35]（「2026-10-03 時点で Final の投票期間中」という状態の主張） |
| 検証不能 | 0 | — |

不支持と部分支持の 6 件は、いずれも RS-04 版 0.2 で修正した（§5）。出典の差し替えはない。書誌の誤り（題名）を直したのは [^29] の 1 件である。検証の過程で新たに確認した事実の出典として、[^36]〜[^40] の 5 件を追加した（§4）。

## 3. 脚注ごとの判定表

凡例: 「主張」は脚注が付いた RS-04 の項目番号（#n）と結論サマリの番号（§2-n）。

| 脚注 | 原典（取得先） | 主張 | 判定 | 照合結果（原典の該当箇所） | 修正 |
|---|---|---|---|---|---|
| [^1] | RFC 9700（rfc9700.txt） | #1〜#39, #59, §2-1, §2-2, §2-5, §2-8, §5.2 | 部分支持 | ヘッダ BCP 240、Best Current Practice、January 2025 で一致。39 行の強度は全て原文の BCP 14 キーワードと一致（§3.1 の表を参照）。ずれは 2 行: #3 は §2.1 の「OIDC フローでは nonce が CSRF 保護になる」を落としていた。#34 は §4.11.2 "MUST always authenticate the user first and, with the exception of the silent authentication use case, prompt the user for credentials when needed" の例外の掛かり先を誤っていた（例外は資格情報の入力要求に掛かり、認証そのものには掛からない）。§2-1 の「39 行・29 行」は本ノート自身の表の集計であり、[N] ではなく [D] が適切 | #3, #34 を修正。§2-1 のタグを [D] に変更し、独立行にしていない規定（§4.1.3 の MAY、§4.17.2 末尾の MUST）を明記 |
| [^2] | RFC 6749 §10.4 | #70 | 支持 | "Refresh tokens MUST be kept confidential in transit and storage, and shared only among the authorization server and the client"、"MUST maintain the binding"、"MUST only be transmitted using TLS" | なし |
| [^3] | RFC 9126 | #53 | 支持 | §1 "confidential and integrity-protected authorization request"、"authenticate the client before any user interaction happens"。§2.2 request_uri はクライアントに結合（MUST）。§4 クライアントは一度だけ使用（MUST）、AS は一回限りとして扱うべき（SHOULD）・再読み込みの重複は可（MAY）、期限切れは拒否（MUST）。§7.2 新しい redirect URI は認証済みクライアントからのみ（MUST）。§5/§6 に require_pushed_authorization_requests | なし |
| [^4] | RFC 9449 | #54〜#58, §2-5 | 支持 | §2 "not ... a substitute for a secure transport and MUST always be used in conjunction with HTTPS"、"application-layer means"。§4.3 の 12 項目の検査（MUST）。§5 public client の refresh token は鍵に束縛（MUST）・検証（MUST）、confidential client の refresh token は束縛しない、token_type が DPoP でなければ破棄（MUST、保護が重要な場合）。§7.2 Bearer として提示された DPoP 束縛 token を拒否（MUST）。§10 dpop_jkt 不一致は拒否（MUST）。§11.1 受理は作成後の限られた時間のみ（MUST）、jti の単回検査は共有状態がないと実現できないことがある。§11.2 nonce なしの配備は長寿命 token を発行すべきでない（SHOULD NOT）。§11.3 nonce 提供後は nonce なしの proof を受理してはならない（MUST NOT）。§11.4 非エクスポート鍵でもオンライン中は proof を作られ得る、silent な新規 grant で攻撃者の鍵に束縛され得る、CSP は第二の防御層。§11.7 本文・ヘッダの完全性を保証しない | なし |
| [^5] | RFC 8705 | #59, §2-5 | 支持 | §3 RS は mTLS 使用を事前に知る必要がある（access token は handshake 後の Application Data）、証明書の一致検証（MUST）と 401 invalid_token（MUST）。§4 public client の refresh token も束縛すべき（SHOULD）。§6.2 信頼チェーン検証は不要。§6.3 証明書更新で token は無効化。§6.5 TLS 終端時の証明書情報の受け渡しは範囲外 | なし |
| [^6] | RFC 9396 | #64 | 支持 | §5 未知の type・型定義に合わない要素は処理を拒否（MUST）し invalid_authorization_details。§12 完全性が問題なら改ざん・すり替えから保護（MUST）、手段に RFC 9101・RFC 9126。§9.1 JWT には audience で絞った authorization details を top-level claim に入れることが RECOMMENDED。§12 AS は sanitize（MUST） | なし |
| [^7] | RFC 9068 | #60, #61, §2-7 | 支持 | §2.1 署名必須（MUST）、none 禁止（MUST NOT）、RS256 を含める（MUST）、typ に media type を含める（MUST）・値は at+jwt とすべき（SHOULD）。§2.2 iss/exp/aud/sub/client_id/iat/jti は REQUIRED。§4 RS の検証 5 項目（MUST）。§5 resource ごとに異なる aud（MUST）、別鍵署名は鍵漏えいの防御にならない。§6 クライアントは内容を調べてはならない（MUST NOT）、漏えい対策として暗号化・省略・opaque。errata 8802（Reported、未検証）は §2.2 の iss を OPTIONAL とする提案で、本文は変わっていない | #60 に errata の注記を追加（[^37]） |
| [^8] | RFC 8725 | #62, §2-7 | 支持 | §3.1 許容 alg の指定と他 alg の不使用（MUST / MUST NOT）、1 鍵 1 alg（MUST）。§3.3 全暗号処理の検証（MUST）。§3.8 iss の鍵帰属検証（MUST）。§3.9 aud を含め受信者が検証（MUST）。§3.10 jku/x5u の SSRF 対策（SHOULD）。§3.11 明示的型付けは RECOMMENDED。§3.12 相互排他的な検証規則（MUST） | なし |
| [^9] | draft-ietf-oauth-rfc8725bis-10 | #63 | 部分支持 | ヘッダ（Intended status: BCP、Obsoletes: 8725 (if approved)、21 August 2026）は一致。Appendix A は 8 項目を挙げるが、本ノートの列挙は原文と対応していなかった: 「alg と kid で引いた鍵との整合検査」は Appendix A の項目ではなく §3.1 本文の規定（Appendix A の項目 1 は alg 値の大文字小文字誤読への防御）。暗号化・署名の取り違え（項目 2）、typ 指針の拡充（項目 6）、kid/jku/x5u と SSRF（項目 7）が欠けていた。「RSA-PKCS1 v1.5 の非推奨化」は §3.2 で "RSA-PKCS1 v1.5 encryption algorithms (Section 7.2 of [RFC8017])" に限られ、署名の RS256 は対象外（参照 draft の題名も "Deprecate 'none' and 'RSA1_5'"） | #63 の列挙を Appendix A の 8 項目どおりに直し、§3.1 本文の規定と、非推奨化の範囲（暗号化のみ）を明記 |
| [^10] | Datatracker draft-ietf-oauth-rfc8725bis | #63, §2-12, §5.2 | 支持 | HTML と API の両方で rev 10、WG 状態 Submitted to IESG for Publication、IESG 状態 RFC Ed Queue、RFC Editor 状態 Blocked（画面表示 "blocked: Reference Not Received"）、Intended RFC status: Best Current Practice | なし |
| [^11] | RFC 8693 | #66, §2-9 | 支持 | §2.1 AS は subject_token・actor_token を種類に応じて検証（MUST）、"one-time event and does not create a tight linkage"、失効伝播は "not a general property of the STS protocol"。§4.1 "the consumer of a token MUST only consider the token's top-level claims and the party identified as the current actor"（引用は逐語一致）、過去の actor は informational only。§4.4 may_act の定義 | なし |
| [^12] | RFC 8707 | #65 | 支持 | §2 絶対 URI（MUST）、fragment 禁止（MUST NOT）、query を含むべきでない（SHOULD NOT）、API の base URI を使うべき（SHOULD）、AS は resource に audience-restrict すべき（SHOULD） | なし |
| [^13] | RFC 7662 | #67 | 支持 | §2.1 token scanning 防止のため何らかの認可を要求（MUST）。§2.2 キャッシュしてよい（MAY）。§4 性能とセキュリティのトレードオフを検討（MUST）、失効 token が使われ得る窓、機微な環境ではキャッシュ無効化、exp を超えてキャッシュしない（MUST NOT） | なし |
| [^14] | RFC 9701 | #68, §2-7 | 支持 | §1 AS が応答内容に責任を負う場合などの用途。§3 RS の識別・認証・認可（MUST）、audience 判定（MUST）。§5 typ token-introspection+jwt。§8.1 RS は受け取った JWT access token の typ を確認（MUST）。§8.2 introspection 要求は全て認証（MUST） | なし |
| [^15] | RFC 7009 | #69, §2-6 | 部分支持 | §2 refresh token の失効支援（MUST）、access token の失効支援（SHOULD）、同一 grant の access token の無効化（SHOULD）、伝播遅延の明記は一致。ずれ: 本ノートは「self-contained な access token を即時に失効させるには、標準化されていない backend 連携か短命化しか手段がない」と書いたが、§3 Implementation Note は "While these are not the only options, they illustrate the implications for revocation" と述べており、唯一の手段とはしていない。短命化は即時失効の手段ではなく、失効後に使われ得る時間を制限する別設計として挙げられている。"currently non-standardized" は 2013 年の発行時点の記述 | #69 と §2-6 を原文の構造どおりに修正 |
| [^16] | RFC 9207 | #71 | 支持 | §2 エラー応答を含む全認可応答に iss（MUST）、https で query/fragment なし（MUST）。§2.3 authorization_response_iss_parameter_supported を true（MUST）。§2.4 単純文字列比較（MUST）、不一致なら拒否し grant を進めない（MUST / MUST NOT）、支援有無の状態保持（MUST）と、支援 AS からの iss なし応答の拒否（MUST） | なし |
| [^17] | RFC 9470 | #72 | 支持 | §3 insufficient_user_authentication、acr_values、max_age。§6.1 auth_time と acr は認証時点で確定し、更新で変わらない。§9 OAuth を認証プロトコルと位置付けるために使ってはならない（MUST NOT）、acr_values による情報漏えい（高権限利用者の推測） | なし |
| [^18] | RFC 10017 | #73〜#75, §2-8, §2-11, §5.2 | 部分支持 | ヘッダ（RFC 10017、BCP 212、Best Current Practice、August 2026）は一致。§6 3 構成をセキュリティの高い順に提示。§6.1.4.3 "strongly recommended"、§6.3.4.3 "not recommended"（いずれも小文字）。§6.1.3.1 confidential client と認可コードグラント（MUST）。§6.1.3.2 Secure・HttpOnly（MUST）、SameSite=Strict・path=/・Domain なし・`__Host-Http-` prefix（SHOULD / SHOULD NOT）。§6.1.3.3 CSRF 対策（MUST）。§6.3.3.1 静的 secret を本人性の証明にしない（MUST）。§6.3.4.2.2、§9.2 の DPoP の限界は一致。ずれ: §6.3.2.3 の「rotation で寿命を延長しない（MUST NOT）」は "if the refresh token has a preestablished expiration time" という条件付きだが、本ノートは条件を落としていた | #74 と §2-8 に条件を追記 |
| [^19] | draft-ietf-oauth-v2-1-16 | #76 | 支持 | ヘッダ 3 September 2026、Expires 7 March 2027、Intended status: Standards Track。§10 の非規範的な変更点一覧（PKCE 既定化、redirect URI 完全一致、implicit と ROPC の除外、query 文字列の Bearer 除外、public client の refresh token は sender-constrained か one-time use、plain の削除） | なし |
| [^20] | Datatracker draft-ietf-oauth-v2-1 | #76, §2-12 | 支持 | Active Internet-Draft、WG 状態 WG Document、IESG 状態 I-D Exists、Responsible AD なし。WG マイルストーンは「Dec 2026 Submit to IESG」 | なし |
| [^21] | draft-ietf-oauth-status-list-21 | #80 | 支持 | ヘッダ 21 June 2026、Intended status: Standards Track、Expires 23 December 2026。Abstract（JOSE/COSE、JWT・SD-JWT・CWT・ISO mdoc）。§1.1 access token の状態管理と Issuer への問い合わせ削減（herd anonymity）。§1.2 herd privacy。§11.5 exp と ttl、クライアントは範囲を確認すべき（SHOULD）、下限・上限の設定 | なし |
| [^22] | Datatracker draft-ietf-oauth-status-list | #80, §2-12 | 支持 | API の state: IESG RFC Ed Queue、RFC Editor in_progress（In Progress）、WG Submitted to IESG for Publication。HTML の RFC Editor status 欄は "Awaiting First editor" と、より細かい表示 | §4 表と [^22] に画面表示を補記 |
| [^23] | FAPI 2.0 Security Profile（Final） | #41〜#49, #64, §2-3, §2-4, §2-6〜§2-8 | 支持 | Published 22 February 2025、Status: Final。Introduction の "universally applicable ..." は逐語一致。§5.1.1 public client は範囲外。§5.1.2 "shall not remove or override mandatory behaviors"。§5.2.1〜§5.2.3、§5.3.2.1、§5.3.2.2、§5.3.3.1、§5.3.3.2、§5.3.4、§5.4.1〜§5.4.3 の shall / should / shall not は本ノートの記載と全て一致（RS の "shall verify the validity, integrity, expiration and revocation status" は逐語一致。失効状態の検証手段の規定はない）。Note 1（rotation）、NOTE 2（認可コードフローと CIBA のみ詳細解析済み）、NOTE 5（RAR の推奨）、§6.2（A5 による DPoP proof 再送と緩和策 4 つ）、§6.3（Cuckoo's Token Attack と緩和策）も一致。#48 の「解析の対象外と明記」は NOTE 2 の記述からの帰結で、明記まではされていないため表現を精緻化した（判定は支持） | #48 の表現を精緻化。#49 に、Final の Message Signing はリソース要求の署名を含まない旨の [D] を追記 |
| [^24] | FAPI 2.0 Attacker Model（Final） | #50 | 支持 | Published 22 February 2025、Status: Final。§5 の 3 目標。§6 の範囲外（TLS、JWKS、Browsers and endpoints、Identity and session management）。§7.2〜§7.7 の A1、A1a、A2、A3a、A4（"not relevant in FAPI 2.0 ... informative purposes only"）、A5（"read requests sent to the resource server after they have been processed"）。§8.2 の引用は逐語一致 | なし |
| [^25] | FAPI 2.0 Message Signing（Final） | #51, §2-13 | 支持 | Published 25 September 2025、Status: Final。§5 "All provisions of the [FAPI2_Security_Profile] apply"。§5.1 JAR・JARM・RFC 7662＋RFC 9701 と、3 方式ごとの適合試験オプション（"anticipated"）。§5.2 NR1〜NR5。リソース要求・応答の署名は規定なし | なし |
| [^26] | OIDF FAPI WG Specifications | #40, #51, §2-3, §2-13 | 支持 | Final Specifications に FAPI 2.0 Message Signing・Security Profile・Attacker Model。Drafts に "FAPI 2.0 Http Signatures" | なし |
| [^27] | OIDF 告知（FAPI 2.0 SP/AM Final 承認） | #40, §2-3 | 支持 | Published February 19, 2025。Approve 82、Object 0、Abstain 14（96 票、401 会員中） | なし |
| [^28] | OIDF 告知（Message Signing Final 承認） | #40, §2-3, §5.2 | 支持 | Published September 26, 2025。Approve 87、Object 0、Abstain 20（107 票、448 会員中） | なし |
| [^29] | OIDF 告知（FAPI 2.0 Final 適合試験） | #52 | 部分支持 | Published July 9, 2025。"conformance tests and certifications for the final versions of the FAPI 2.0 Security Profile and FAPI 2.0 Message Signing specifications for both authorization servers and OAuth clients" は一致。ずれ: 脚注の題名が原典と異なっていた（正: "FAPI 2.0 Security Profile and FAPI 2.0 Message Signing: Final Conformance Tests and Certifications Now Available"）。また同告知の時点で Message Signing は "currently undergoing public review and voting"（リンク表記 "Proposed Final"）であり、本ノートはこの限定を書いていなかった | [^29] の題名を修正。#52 に告知時点の Message Signing の状態を追記 |
| [^30] | OpenID SSF 1.0（Final） | #77, §2-7, §2-10 | 支持 | Published 29 August 2025。§4.1.1 "SSF events MUST use explicit typing"、typ secevent+jwt。§4.1.5 の引用は逐語一致。§6.1.1 push（RFC 8935）、§6.1.2 poll（RFC 8936） | なし |
| [^31] | OpenID CAEP 1.0（Final） | #78, §2-10 | 支持 | Published 29 August 2025。§3.1〜§3.8 の 8 イベント種別は本ノートの列挙と一致。§4 "SHOULD comply with the Shared Signals Framework" | なし |
| [^32] | OpenID RISC 1.0（Final） | #78, §2-10 | 支持 | Published 29 August 2025。§2.1〜§2.10 のイベント種別（opt-in / opt-out 系を含む）。§2.11 sessions-revoked は deprecated、"New implementations MUST use the session-revoked event defined in the CAEP Specification" | なし |
| [^33] | OIDF Shared Signals WG Specifications | #77, #79, §2-10 | 支持 | Final Specifications に SSF・CAEP・RISC 1.0。Implementer's Drafts に CAEP Interoperability Profile（リンク先 -ID1.html） | なし |
| [^34] | OIDF 告知（Shared Signals 3 仕様 Final 承認） | #77, §2-10, §5.2 | 支持 | Published September 2, 2025。Approve 85、Object 1、Abstain 25（111 票、433 会員中）。対象 3 仕様の URL | なし |
| [^35] | OIDF 告知（CAEP Interoperability Profile Final のレビュー期間） | #79, §2-10, §4, §6 | 不支持 | Published July 27, 2026、当初日程（レビュー 2026-07-27〜09-25、投票 2026-09-26〜10-10）は原文にある。しかし同ページ冒頭に UPDATE が 2 件ある: 2026-09-12「60 日レビューの結果、仕様に複数の修正が必要と共同議長が確認。改訂後のレビュー・投票期間を告知する」、2026-09-15「修正を反映したうえで 15 日の WG レビューを再開し、続けて 60 日のレビューを行うことで WG が合意」。本ノートの「2026-10-03 時点で Final の投票期間中」「投票結果（2026-10-10 締切）は未確定」は原典に反する。「Final ではない」は支持される。WordPress API で検索した範囲では、09-15 より新しい告知はなかった | §2-10、#79、§4 表、§6 を修正。[^35] に UPDATE の存在を明記 |

### 3.1 RFC 9700（[^1]）の行ごとの照合

§2 と §4 から BCP 14 キーワードを含む文を機械抽出し、§3.1 の 39 行と突き合わせた。強度列は全行で原文と一致した。

| 行 | 原文の節 | 判定 | 備考 |
|---|---|---|---|
| #1 | §2.1, §4.1.3 | 支持 | exact string matching（MUST）、localhost の可変 port を許容（MUST） |
| #2 | §2.1, §4.1.3, §4.11.1 | 支持 | Clients and AS / redirect URI のホストする Web サーバ / Clients の MUST NOT |
| #3 | §2.1, §4.7.1 | 部分支持 | OIDC nonce による CSRF 保護の記述が欠けていた（修正済み） |
| #4〜#6 | §2.1, §4.4.2, §4.4.2.1, §4.4.2.2 | 支持 | REQUIRED / MUST / SHOULD / MAY の組み合わせが原文どおり |
| #7 | §2.1, §4.12 | 支持 | MUST avoid / MUST NOT 307 / SHOULD 303 |
| #8〜#12 | §2.1.1, §4.5.3.2, §4.7.1, §4.8.2 | 支持 | PKCE と nonce 代替の強度が原文どおり |
| #13 | §2.1.2, §4.1.3 | 支持 | SHOULD NOT / SHOULD（原文には「access token 注入と漏えい経路が緩和されていない限り」の条件がある。採否は無効化なので結論に影響しない） |
| #14〜#17 | §2.2.1, §2.2.2, §2.3, §4.9.3, §4.10, §4.10.2 | 支持 | §4.10 "Authorization servers therefore SHOULD ensure that access tokens are sender-constrained and audience-restricted" |
| #18〜#23 | §2.4, §2.5, §2.6, §4.15.1 | 支持 | — |
| #24 | §4.13 | 支持 | sanitize（MUST）、proxy とアプリ間の保護（MUST） |
| #25〜#27 | §2.6, §4.17.2 | 支持 | — |
| #28 | §3 | 支持 | "Implementers MUST take into account all possible types of attackers" |
| #29〜#33 | §4.2.4, §4.3.2, §4.9.3 | 支持 | — |
| #34 | §4.11.2 | 部分支持 | silent authentication の例外の掛かり先を誤っていた（修正済み） |
| #35〜#38 | §4.14.2 | 支持 | 失効させてよいセキュリティイベントの例は password change と logout at the AS |
| #39 | §4.16 | 支持 | MUST / SHOULD ×4 |
| #59 後半 | §4.10.1, §4.10.2 | 支持 | mTLS は複数 RS で使える、token と鍵の両方を取られると無効、セキュリティモジュールで保護すればオフライン中の悪用を防ぐ |

独立行になっていない規定: §4.1.3 の MAY 2 件（fragment の付加、PAR/JAR でクライアント認証済みなら redirect URI を信頼してよい）、§4.11.2 の MAY（信頼できない URI を利用者に知らせる）、§4.14.2 の MAY（他の grant で再取得）、§4.16 の MAY（client が他 origin からの framing を許す）、§4.17.2 末尾の MUST（§2.1 の保護策を in-browser 通信にも同等に適用）。§4.15 の SHOULD 2 件は RFC 9068 からの引用であり、RFC 9700 自身の要求ではない。

### 3.2 seed 再検証（§5.2 末尾）の照合

| 項目 | 判定 | 根拠 |
|---|---|---|
| RFC 10017 Browser-Based Apps | 支持 | [^18] のヘッダ |
| Message Signing Final | 支持 | [^25] Status: Final、[^28] |
| SSF 1.0 / CAEP 1.0 / RISC 1.0 Final | 支持 | [^30]〜[^34] |
| 8725bis は RFC Ed Queue で Blocked | 支持 | [^10]（HTML と API） |
| R-158「implicit廃止」は RFC 9700 では SHOULD NOT | 支持 | [^1] §2.1.2 |

## 4. 追加した脚注

検証で新たに確認した事実を本文に書くため、次の 5 件を RS-04 に追加した。いずれも 2026-10-03 に取得し、内容を確認した。

| 脚注 | 原典 | 使った箇所 | 確認内容 |
|---|---|---|---|
| [^36] | Datatracker draft-ietf-jose-deprecate-none-rsa15（API） | §6 | rev 06、IESG 状態 In Last Call、WG 状態 Submitted to IESG for Publication。8725bis の Blocked の原因である可能性が高いが、RFC Editor キュー上の待ち参照は確認できていない（キューのページが JavaScript で描画され、curl では内容を取得できなかった） |
| [^37] | RFC Editor errata（RFC 9068） | #60, §6 | Errata ID 8802、Reported、Technical、2026-03-04 報告、§2.2 の iss を OPTIONAL とする提案 |
| [^38] | FAPI 2.0 Http Signatures (Draft) working copy | #40, §4 | 題名 "FAPI 2.0 Http Signatures (Draft)"、Published 26 June 2026 |
| [^39] | CAEP Interoperability Profile 1.0 ID1 | #79, §4 | 表題 "CAEP Interoperability Profile 1.0 - draft 00"、Published 25 June 2024 |
| [^40] | OIDF 告知「Three Shared Signals Implementer's Drafts Approved」 | #79, §4 | Published August 20, 2024。CAEP Interoperability Profile 1.0 ID1 を含む 3 仕様を承認。Approve 74、Object 1、Abstain 21 |

## 5. 修正内容（RS-04 版 0.1 → 0.2）

| # | 箇所 | 修正前 | 修正後 | 理由 |
|---|---|---|---|---|
| 1 | §2-10、#79、§4 表、§6、[^35] | CAEP Interoperability Profile は「Final の投票期間中（2026-09-26〜10-10）」「投票結果は 10-10 締切で未確定」 | ID1 で Final ではない。2026-09-12/09-15 の UPDATE によりレビューをやり直すことになり、当初の投票期間は進行していない。改訂後の日程は未確認 | [^35] の同一ページの UPDATE に反していた（状態の誤り） |
| 2 | #69、§2-6 | 即時失効には「標準化されていない backend 連携か短命化しか手段がない」 | backend 連携（2013 年時点で非標準）と短命化を挙げ、唯一の選択肢ではないとしている | [^15] §3 "not the only options" |
| 3 | #63 | Appendix A の主な追加点 7 項目（alg と kid の整合検査を含む、RSA-PKCS1 v1.5 の非推奨化） | Appendix A の 8 項目を原文どおりに列挙。alg と kid の整合検査は §3.1 本文の規定と明記。非推奨化は RSA-PKCS1 v1.5 暗号化（RSA1_5）のみで RS256 は対象外と明記 | [^9] Appendix A、§3.1、§3.2 |
| 4 | #34 | 「silent authentication を除き、リダイレクト前に必ず利用者を認証しなければならない」 | 「常にまず利用者を認証し、silent authentication の場合を除いて必要に応じて資格情報の入力を求めなければならない」 | [^1] §4.11.2 の例外の掛かり先 |
| 5 | #3 | OIDC nonce の記述なし | 「OIDC フローでは nonce が CSRF 保護になる」と §4.7.1 の規定を追記 | [^1] §2.1、§4.7.1 |
| 6 | #74、§2-8 | rotation で寿命を延長しない（MUST NOT）を無条件で記載 | 「事前に有効期限を定めた refresh token の場合」の条件を追記 | [^18] §6.3.2.3 |
| 7 | #52、[^29] | 脚注題名「Final Tests for FAPI 2.0 Security Profile & Message Signing」 | 原典の題名に修正。告知時点で Message Signing は public review・投票中（Proposed Final）だったことを追記 | [^29] 本文 |
| 8 | §2-1 | 「39 行、うち 29 行が MUST 系」に [N][^1] | 本ノートの表の集計であるとして [D] に変更し、独立行にしていない規定を明記 | 行数は RFC 9700 が定める数ではない |
| 9 | §2-7 | issuer 別 allowlist で RFC 9068 と FAPI が両立するかのような記述 | FAPI 範囲の AS・RS は RFC 9068 §2.1 の RS256 MUST から逸脱するため、採否表に FAPI 優先の逸脱として記録すると追記 | [^7] §2.1 と [^23] §5.4.1 の突き合わせ（[D]） |
| 10 | #49 | 緩和策に「Message Signing の署名付きリソース要求」 | Final の Message Signing はリソース要求の署名を含まないため、確認日時点では実現できない旨の [D] を追記 | [^23] §6.2 と [^25] の突き合わせ |
| 11 | #48 | client credentials grant は「解析の対象外と明記」 | NOTE 2 の記述（多様な grant を使えるよう構成、詳細解析済みは認可コードフローと CIBA のみ）に沿って精緻化 | [^23] §5.3.2.1 NOTE 2 |
| 12 | #60、§6 | errata は未確認 | RFC 9068 errata 8802（Reported、未検証）を注記。15 件の RFC の errata 確認結果を §6 に記載（RFC 6749 は未確認のまま） | [^37] |
| 13 | §6 | 8725bis の Blocked の原因は未確認 | 規範参照 draft-ietf-jose-deprecate-none-rsa15 が IESG In Last Call であることを追記（原因の断定はしない） | [^36] |
| 14 | §4 表、#40 | Http Signatures の公表日は「未確認」 | working copy の Published 表示 2026-06-26 | [^38] |
| 15 | §4 表、#79 | CAEP Interop ID1 の公表日は「未確認」 | 2024-06-25（ID 承認告知 2024-08-20） | [^39], [^40] |
| 16 | §4 表、[^22] | RFC Editor 状態 In Progress | API の state 名 In Progress に、画面表示 "Awaiting First editor" を補記 | [^22] の HTML と API |
| 17 | 冒頭、§6 | 作成者以外の照合は未実施。OIDF 告知の日付・票数は要約経由で要再確認 | 独立検証を実施した旨と、原ページの HTML で一致を確認した旨 | 本記録 |

## 6. 検証不能・未確認として残した事項

検証不能と判定した脚注はない。次の事項は、本検証でも確認できなかったため RS-04 に「未確認」として残した。

| 事項 | 理由 |
|---|---|
| 8725bis の RFC Editor キュー上の待ち参照 | queue.rfc-editor.org のページが JavaScript で描画され、curl で内容を取得できなかった。Datatracker からキュー項目へのリンクはあるが、待ち参照の名前は Datatracker に表示されない |
| CAEP Interoperability Profile の改訂後のレビュー・投票日程 | OIDF の告知（WordPress API の検索）では 2026-09-15 の UPDATE より新しい告知が見つからなかった。WebSearch はセッションの上限に達していて使えなかった |
| RFC 6749 の errata | 件数が多く、本ノートの主張（§10.4）に関わるものの選別を行っていない |
| FAPI 2.0 適合試験の組み合わせ（DPoP と mTLS 等） | RS-04 §6 の未確認事項のまま。本検証の範囲外 |

## 7. 気付いた点（修正対象外）

- FAPI 2.0 Message Signing の Final 文書は、冒頭に "Warning: This document is not an OIDF International Standard. It is distributed for review and comment." という定型文を残している。表題部の Status は Final であり、OIDF の承認告知 [^28] と WG 一覧 [^26] も Final としているため、状態の判定は変えていない。
- FAPI 2.0 Message Signing は §5.3 で「PAR を署名すれば NR2（front-channel の認可要求）も既定で達成される」とする一方、§6.4 で「front-channel の認可要求には否認防止を提供しない」と書いている。RS-04#51 の記述には影響しないが、否認防止の設計で引用する場合は両節を併記する必要がある。
- OAuth 2.1 draft-16 の §10 は、RFC 10017 の発行後も Browser-Based Apps を I-D（[I-D.ietf-oauth-browser-based-apps]）として参照している。RS-04 の結論には影響しない。
