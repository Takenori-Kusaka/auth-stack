# RS-03 独立検証記録（脚注の原典照合）

> 文書ID: RS-03-V / 版: 0.1 / 状態: review / 最終更新: 2026-10-03
> 対応要求: R-013, R-027〜R-048, R-087, R-131, R-132, R-168, R-203（RS-03 の対応要求に準ずる）
> 依存文書: CONVENTIONS.md, research/RS-03-identity-lifecycle.md（検証対象。検証後に版 0.1 から 0.2 へ改訂）

本記録は、RS-03 の作成者とは別の AI エージェント（Claude）が 2026-10-03 に行った脚注の原典照合のログである。検証者も AI であり、人間のレビュアによる照合ではない。判定は検証者の読解によるもので、CTO/CISO の決裁ではない。

---

## 1. 検証の方法

| 項目 | 内容 |
|---|---|
| 対象 | RS-03 版 0.1 の全脚注 [^1]〜[^91]（91 件）と、各脚注が付いた本文の主張（§2 結論サマリ、§3 調査結果、§4 ステータス表、§5.1 の根拠欄、§6 の限界事項） |
| 取得 | 全 91 脚注の URL を 2026-10-03 に curl で取得した。異なる URL は 42 件（NIST 800-63-4 系は CSRC 4 頁と pages.nist.gov の HTML 4 頁に集約される）。W3C（[^46]〜[^49]）はブラウザの User-Agent では Cloudflare の確認画面（HTTP 403）が返ったため、curl の User-Agent で再取得し HTTP 200 で本文を得た。それ以外は初回で HTTP 200 |
| 照合の手段 | HTML は標準ライブラリでテキスト化し、PDF は pdftotext（OASIS SAML）と PyMuPDF（DS-511、DS-512）で抽出して、文言・数値・規範語を全文検索で照合した。WebFetch は小型モデルによる要約を返すため照合には使わなかった。WebSearch も使っていない |
| 節番号の確認 | pages.nist.gov の HTML は節番号を CSS カウンタで描画するため、見出しの data-section 属性と階層から節番号を再構成し、脚注の「参照箇所」と引用文の所在が一致するかを確認した。PDF はページ番号（印刷ページ）で確認した |
| 版の確認 | pages.nist.gov の HTML にドラフト表記はなく、相互参照は Final 版の DOI（10.6028/NIST.SP.800-63-4 等）を指している。CSRC の Document History では 4 文書とも 07/31/25 Final。HTML と PDF の字句の同一性までは照合していない |
| 補助取得 | ステータス表と RS-03#66 の確認のため、脚注にない原典を 5 件取得した。OpenID CAEP 1.0 Final 本文、OpenID SSF 1.0 Final 本文、datatracker の RFC 7643・RFC 7644・RFC 9865 の頁。CAEP と SSF は脚注 [^92][^93] として RS-03 に追加した |
| 判定区分 | 支持: 脚注の参照箇所が主張を全て裏付ける。部分支持: 主張の核心は裏付けられるが、限定条件・版・日付・帰属・用語・節番号・規範強度のいずれかが原典とずれる。不支持: 原典が主張を裏付けない、または反する。検証不能: 原典を取得できない、または該当箇所が見つからない |
| 規範強度 | NIST の SHALL / SHOULD / MAY、W3C・IETF・OIDF の MUST / SHOULD / MAY / RECOMMENDED / REQUIRED / OPTIONAL を、主張ごとに原文の該当文と 1 文ずつ照合した |

## 2. 判定の集計

| 判定 | 件数 | 脚注 |
|---|---|---|
| 支持 | 82 | 下表の「支持」 |
| 部分支持 | 9 | [^15], [^18], [^21], [^26], [^52], [^64], [^67], [^83], [^85] |
| 不支持 | 0 | — |
| 検証不能 | 0 | — |

- 部分支持の 9 件は、いずれも RS-03 版 0.2 で修正した（§4）。
- 「支持」のうち 7 件（[^24], [^31], [^61], [^72], [^81], [^89], [^90]）は、主張は原典どおりだが表現・参照箇所を原典に寄せて補正した（§4.2）。
- 版・状態・日付の誤りはなかった。NIST 800-63-4 系（2025-07-31 Final）、WebAuthn L3（2026-08-25 REC、前段 2026-05-26 CR）、CXF 1.0（2026-03-09 Proposed Standard）、CXP 1.0（2024-10-03 Working Draft）、OpenID Federation 1.0（2026-02-17 Final）、RISC 1.0（2025-08-29）、ISO/IEC 26131:2024（2024-10、60.60）、RFC 9967（2026-05 Proposed Standard）、DS-511（2025-09-30）、DS-512（2026-02-24）、CISA AA23-320A（2023-11-16 初版、2025-07-29 改訂）は、いずれも原典の表記と一致した。
- 二次情報だけを根拠にした主張は見当たらなかった。[^72]（Descope ブログ）は脆弱性の発見・報告の当事者による開示であり、[I] の一次報告として扱えると判断した。

## 3. 脚注ごとの判定表

凡例: 「主張」は脚注が付いた RS-03 の項目番号（#n）、結論サマリの番号（§2-n）、限界事項（§6-n）。

| 脚注 | 原典（取得先） | 主張 | 判定 | 照合結果（原典の該当箇所） | 修正 |
|---|---|---|---|---|---|
| [^1] | CSRC SP 800-63-4 final | #1, §6-12 | 支持 | Document History: 06/08/20 Draft、12/16/22 Draft、08/21/24 Draft、07/31/25 Final。Date Published: July 2025。"supersedes NIST Special Publication (SP) 800-63-3"。2024-08-21 版は CSRC の URL が /2pd（Second Public Draft） | なし |
| [^2] | CSRC SP 800-63A-4 final | #1 | 支持 | 12/16/22 Draft、08/21/24 Draft、07/31/25 Final。supersedes SP 800-63A | なし |
| [^3] | CSRC SP 800-63B-4 final | #1 | 支持 | 同上、supersedes SP 800-63B | なし |
| [^4] | CSRC SP 800-63C-4 final | #1 | 支持 | 同上、supersedes SP 800-63C | なし |
| [^5] | pages.nist.gov sp800-63 §1.1 | #2, §2-1, §6-1 | 支持 | "may consider the use of these standards where appropriate"、"do not explicitly address ... machine-to-machine authentication, ... IoT ..., or access to Application Programming Interfaces (APIs) on behalf of subjects" | なし |
| [^6] | 同 §3.2, §3.2.1, §3.2.4 | #4, #5, §2-1 | 支持 | §3.2 "SHALL be considered separately based on the transactions"、"SHOULD also consider scale"。§3.2.1 "At a minimum, organizations SHALL include the following impact categories"（5 カテゴリ一致）。§3.2.4 high-water mark・加重平均の例示、"SHALL document the approach ... SHALL apply it consistently" | なし |
| [^7] | 同 §3.3.3, §3.3.3.1〜§3.3.3.3 | #6, #7, §2-1, §2-12 | 支持 | Low→IAL1/AAL1/FAL1、Moderate→IAL2/AAL2/FAL2、High→IAL3/AAL3/"FAL2 or FAL3"。"may be low impact and indicate IAL1 and FAL1 but ... requires AAL2"、"no proofing is required, resulting in no IAL"。High では "SHALL conduct a further assessment ... compromised IdP"、"Considerations SHOULD include ... whether the IdP is internal or external" | なし |
| [^8] | 同 §3.4, §3.4.2〜§3.4.4 | #8, §2-1, §2-5 | 支持 | tailoring process は SHALL で文書化。補償統制は "rationale for the deviation, comparability ..., and any resulting residual risks"（SHALL）。補完統制（§3.4.3）の例 "restrict users to only phishing-resistant authentication at AAL2"。DIAS は (ii) 外部オンラインサービス（SaaS を含む）にも SHALL、"RPs ... SHALL review the latter's DIAS" | なし |
| [^9] | pages.nist.gov sp800-63a §1.2, §4.3.1 | #11 | 支持 | §1.2 に "No identity proofing" と IAL1〜IAL3。§4.3.1 "IAL3 identity proofing SHALL only be delivered as on-site attended" | なし |
| [^10] | 同 §3.14 | #12 | 支持 | genuine sensor の技術的統制（SHALL）、全デジタル媒体の改ざん解析（SHALL）。生成 AI・deepfake への言及あり | なし |
| [^11] | 同 §3.15.1 | #13 | 支持 | practice statement への記載（SHALL）、研修に "Indicators of social engineering"（SHALL）、記録に理由・referee の身元・判断と否定時の理由（SHALL） | なし |
| [^12] | 同 §3.16 | #11 | 支持 | "SHALL require subscribers to authenticate at the highest authentication assurance level (AAL) available on their account prior to initiating the upgrade process" | なし |
| [^13] | pages.nist.gov sp800-63b §2.2.2 | #14, §2-5 | 支持 | "Verifiers SHALL offer at least one phishing-resistant authentication option at AAL2"、連邦機関の職員等は SHALL、"verifiers SHOULD encourage" | なし |
| [^14] | 同 §2.3, §2.3.2 | #15, §2-3 | 支持 | "SHALL have a non-exportable private key and SHALL provide phishing resistance"、"syncable authenticators SHALL NOT be used at AAL3" | なし |
| [^15] | 同 §2.1.3, §2.2.3, §2.3.3, §2.5 | #43, §2-14, §6-13 | 部分支持 | 本文の強度は一致（AAL1 全体 SHALL・30 日 SHOULD、AAL2 24h SHOULD・1h SHOULD・MAY、AAL3 12h SHALL・15min SHOULD）。ずれは 2 点。(a) 脚注と §6-13 の「§2.4 Table 1」は誤りで、非規範の要約表は §2.5 Summary of Requirements の Table 1（§2.4 は General Requirements）。(b) AAL2 では全体の上限を「設けること」自体が SHALL だが、#43 はこれを落としていた | 脚注と §6-13 を §2.5 Table 1 に訂正。#43 に AAL2 の SHALL を追記 |
| [^16] | 同 §3.2.5, §3.2.5.1, §3.2.5.2 | #16, §2-5 | 支持 | 手入力の OTP・out-of-band は "SHALL NOT be considered phishing-resistant"。channel binding と verifier name binding。DNS 名は "authenticated hostname ... or a parent domain that is at least one level below the public suffix"（SHALL）。WebAuthn が例 | なし |
| [^17] | 同 §3.1.3.3, §3.2.9 | #17 | 支持 | PSTN は restricted。RP がリスクを受容できない場合 "SHALL NOT be used"。CSP は代替手段・告知・移行計画の DIAS 記載（SHALL）。電話番号の設定・変更は新規 binding（SHALL）。SIM 変更・番号ポータビリティ等は SHOULD | なし |
| [^18] | 同 §3.2.11.3 | #18 | 部分支持 | "SHALL be established ... in one of the following ways" として 2 方式がある。(1) QR 等＋240m 以下の無線、(2) 以前の取引で保持したキャッシュ済みの鍵・トンネル情報。#18 は (1) だけを要件として書いていた。関連付け削除手段の SHALL は一致 | #18 を「次のいずれか」に直し、(2) を追記 |
| [^19] | 同 §3.2.4, §4.1.3 | #19 | 支持 | 連邦エンタープライズの verifier は SHOULD、他は MAY。"The lack of support for attestations SHOULD NOT block the use of authenticators for broad public-facing applications" | なし |
| [^20] | 同 §3.2.13 | #15 | 支持 | "To be considered non-exportable, an authenticator SHALL either be a separate piece of hardware or an embedded processor or execution environment (e.g., secure element, TEE, TPM)" | なし |
| [^21] | 同 Appendix B.2 | #21 | 部分支持 | 暗号化保存・AAL2 相当 MFA・連邦エンタープライズの MDM と機関管理アカウント（いずれも SHALL）、"Authentication at AAL2 may be supported subject to the above requirements" は一致。ずれ: 原文は "SHALL be documented and communicated, including on public-facing websites and digital service policies, where applicable"。#21 の「要件は公開しなければならない」は限定条件（where applicable）を落としていた | #21 を「文書化して周知し、該当する場合は公衆向けサイト等にも記載（SHALL）」に修正 |
| [^22] | 同 Appendix B.3 | #22 | 支持 | UV は "SHALL indicate that UV is preferred and SHALL inspect"、未検証は単要素扱い（SHALL）、BE は MAY、BS は "SHOULD NOT condition acceptance ... for public-facing applications" | なし |
| [^23] | 同 Appendix B.4, B.6 Table 5 | #23 | 支持 | B.4 "should assume that all syncable authenticators may be subject to sharing"（小文字の should）。B.6 "A similar process is not available for syncable authenticators or any FIDO WebAuthn-based credentials"、緩和策 "Leverage SSO and federation to limit the number of RP-specific keys" | なし |
| [^24] | 同 §4.1, §4.1.2.1 | #31, #32 | 支持 | 全認証器の記録（SHALL）、特性の判定（SHALL）、日時の記録（SHALL。例は binding, renewal, update, expiration）、IP・端末識別子（SHOULD）。追加 binding の AAL 規則、独立経路での通知、複数登録の許可（SHALL） | #31 の「失効」を原文の expiration（有効期限切れ）に寄せて補正 |
| [^25] | 同 §4.1.2.2 | #32 | 支持 | binding code は識別子併用で 40 ビット以上、それ以外 112 ビット以上、"usable only once"、"maximum of 10 minutes"、"SHALL NOT be communicated over any insecure channel (e.g., email)" | なし |
| [^26] | 同 §4.2, §4.2.1, §4.2.1.1, §4.2.1.2 | #36, #37, #38, §2-6, §6-11 | 部分支持 | 回復の定義、通知、パスワード忘れの扱い、待機時間に数値なし、4 分類、"SHALL support one or more ... MAY support an application-specific method ... SHALL be based on a risk analysis"、64 ビット・ハッシュ保存・使用後の無効化と再発行、6 桁・10 分・24 時間は一致。ずれ: #38 の「回復用の連絡先は 2 つ以上」は、原文では issued recovery code の送付先である recovery address の要件（"SHALL allow the subscriber to establish at least two recovery addresses"）。#37 で「recovery contact」（信頼できる知人）を同じ語で訳しており、取り違えを招く | #38 を「回復用アドレス（recovery address）」に直し、recovery contact とは別と明記。有効期限は「上限」と明記 |
| [^27] | 同 §4.2.2.1〜§4.2.2.3, §4.2.3 | #39, #40, §2-6 | 支持 | AAL2 回復の 3 方式（SHALL）、未本人確認は回復コードか recovery contact（SHALL）、IAL3 の AAL3 は初回 on-site の生体情報と照合（SHALL）、"In all cases, account recovery SHALL cause a notification" | なし |
| [^28] | 同 §4.3, §4.5 | #33 | 支持 | "SHALL suspend, invalidate, or destroy compromised authenticators ... promptly"、"SHOULD establish time limits"、"SHALL make a risk-based determination of the authenticity of invalidation requests" | なし |
| [^29] | 同 §4.6 | #34, #40 | 支持 | "SHALL support at least two notification addresses"、郵便以外の全通知先へ（SHALL）、AAL3 の回復は郵便にも（SHALL）、"SHALL provide clear instructions, including contact information" | なし |
| [^30] | 同 §5.1, §5.1.2 | #44 | 支持 | "SHALL NOT be considered at a higher AAL"、DBSC 等は "MAY persist" だが上限は SHALL、"The RP SHALL NOT interpret the presence of an access token as an indicator of the subscriber's presence" | なし |
| [^31] | 同 §5.2 | #45, §2-14 | 支持 | "the RP SHALL be authoritative as to whether the reauthentication requirements have been met"。追加で確認した事項: "The limits MAY also be extended when higher security session maintenance technologies (e.g., device-bound mechanisms) are used"、"Agencies SHALL establish and document the inactivity and overall time limits" | 追加確認事項を #43 と §2-14 に追記 |
| [^32] | pages.nist.gov sp800-63c §2 Table 1, §2.3, §2.4 | #49, #57, §2-9, §2-12 | 支持 | FAL2 "SHALL be strongly protected from assertion injection attacks"、"SHALL be initiated by the RP"、単一 RP、事前の trust agreement（SHALL）、連携 ID に平文の個人情報を含めない（SHALL NOT）。FAL3 は認証器の制御確認（SHALL）、"protects against the possibility of a compromised IdP" | なし |
| [^33] | 同 §2.5 | #9 | 支持 | RP の最低 xAL（SHALL）、機能ごとの差（MAY）、IdP の指定手段（SHALL）、"SHALL always indicate the resulting xAL"、"the RP cannot assume the account meets 'IAL1'" | なし |
| [^34] | 同 §3.4 | #57 | 支持 | 連携 ID は subject identifier と issuer identifier の論理的な組合せ。"it is imperative that an RP never process the subject identifier without accounting for the IdP"（小文字表現。#57 も強度語を付けていない） | なし |
| [^35] | 同 §3.6, §3.6.1 | #68 | 支持 | "wildcards SHALL NOT be used"、鍵更新は "SHALL be defined by the trust agreement and SHALL be executed using an authenticated protected channel" | なし |
| [^36] | 同 §3.8, §3.8.1, §3.8.2 | #59, §2-8 | 支持 | linking 機能に認証済みセッション（SHALL）、既存連携 ID での認証（SHOULD）、連携 ID の追加・削除の通知（SHALL）、削除した ID からのアクセス拒否（SHALL）、resolution の一意性（SHALL）と誤結合防止（SHALL） | なし |
| [^37] | 同 §3.9 | #51, §2-10 | 支持 | 認証済みセッションの作成条件に "from the expected IdP for a transaction" と "The IdP that issued the assertion is the IdP identified in the federated identifier"（SHALL） | なし |
| [^38] | 同 §3.11.1 | #50 | 支持 | back-channel、推測不能値、RP 認証、IdP 起点の禁止（外部当事者が RP に開始を促す場合は除外）、RP の nonce を含む署名付き応答 | なし |
| [^39] | 同 §4.6.2.1〜§4.6.2.3 | #68, §2-10, §2-12 | 支持 | allowlist の確認（SHALL）、"SHALL NOT use a wildcard domain identifier"、blocklist（MAY）、既定ポリシー（SHALL）、email 入力による discovery、記憶の開示と取消（SHALL） | なし |
| [^40] | 同 §4.6.3, §4.6.7 | #77, §2-13 | 支持 | JIT・事前・ephemeral、"Pre-provisioned accounts SHALL be bound to a federated identifier at the time of provisioning, unless ..."、文書化（SHALL）、JIT のキャッシュ属性責任（SHALL）、時間ベース削除（MAY、例 120 日）、事前通知（SHALL） | なし |
| [^41] | 同 §4.6.4, §4.6.5 | #78 | 支持 | provisioning API は相互認証経路（SHALL）、状態変化の通知（SHALL）、結合の解除（SHALL）、終了・取消の通知（SHOULD） | なし |
| [^42] | 同 §4.7 | #46 | 支持 | 直近認証の情報を伝える（SHALL）、新たな認証の要求を可能に（SHOULD）、identity API でセッションを確立・延長しない（SHALL NOT） | なし |
| [^43] | 同 §4.8 | #72, §2-12 | 支持 | IdP→RP のシグナルは事前の trust agreement（SHALL）、送るべき 5 種（SHOULD）、侵害疑いの調査と他 RP への通知（SHALL）、linking 先 IdP を明かさない（SHALL） | なし |
| [^44] | 同 §4.9 | #51, #57 | 支持 | 必須属性、FAL2 以上の nonce（SHALL）、RP の検証 7 項目（SHALL）、"SHALL NOT treat subject identifiers as inherently globally unique across IdPs" | なし |
| [^45] | 同 §6.1 Table 3 | #73 | 支持 | "Compromised IdP asserts the identity of a claimant who has not properly authenticated"、"An attribute bundle with a revoked email address ..."、"RPs need to maintain independent monitoring and threat evaluation capabilities" | なし |
| [^46] | W3C REC-webauthn-3-20260825 | #28 | 支持 | "W3C Recommendation, 25 August 2026"、Previous Versions に CR-webauthn-3-20260526、"no substantive changes since the Candidate Recommendation Snapshot of 26 May 2026" | なし |
| [^47] | W3C webauthn-3 §4, §5.11 | #29, §2-15 | 支持 | "A public key credential can only be used for authentication with the same entity (as identified by RP ID)"、registrable domain suffix、"MUST choose a common RP ID"、well-known URL の JSON（MUST）、"MUST support at least five registrable origin labels" | なし |
| [^48] | 同 §6.1.3 | #24 | 支持 | BE は "MUST NOT change"、最新値の保存は RECOMMENDED、BE=0 の追加認証器・回復（SHOULD）、BS 1→0 で他の要素を確認（SHOULD） | なし |
| [^49] | 同 §5.1.10 | #28 | 支持 | signalUnknownCredential / signalAllAcceptedCredentials / signalCurrentUserDetails | なし |
| [^50] | FIDO cxf-v1.0-ps-errata-20260309 | #30, §2-15 | 支持 | 表題下 "Proposed Standard, March 09, 2026"、"published by the FIDO Alliance as a Proposed Standard Specification" | なし |
| [^51] | FIDO Download Credential Exchange Specifications | #30, §2-15 | 支持 | 掲載は "CXF 1.0 Proposed Standard"、"CXF 1.0 Errata"、"Credential Exchange Protocol (Working Draft)" で、リンク先は cxp-v1.0-wd-20241003（本文表記 "Working Draft, October 03, 2024"） | なし |
| [^52] | FIDO 白書の掲載ページ | #26 | 部分支持 | 内容は一致（"Quite often, AAL3 applies to companies ... specifically, that it is device-bound and never copied"、"attestations should always be requested"、device-bound の回復は help desk が必要になりやすい）。ずれは 2 点。(a) 白書の AAL の参照先は SP 800-63-3 の実装資料（References [7]）で、63-4 Final 前の記述であることが書かれていなかった。(b) 非規範の白書の記述に、規範要求を表す [N] タグがそのまま付いていた | #26 に非規範であること、小文字の should、800-63-3 参照を明記。§6-9 と脚注の参照箇所を補正 |
| [^53] | OIDC Core 1.0 errata set 2 §2 | #47, #58 | 支持 | 表題 "Final"、"December 15, 2023"。sub は "locally unique and never reassigned"、255 ASCII、case-sensitive。auth_time は max_age 要求時 REQUIRED | なし |
| [^54] | 同 §5.7 | #58, §2-7 | 支持 | iss と sub の組合せだけが安定識別子、"an Issuer MAY re-use an email Claim Value"、email 等は "MUST NOT be used as unique identifiers" | なし |
| [^55] | 同 §5.1 | #58 | 支持 | email_verified は "controlled by the End-User at the time the verification was performed" | なし |
| [^56] | 同 §3.1.2.1, §3.1.3.7 | #47, §2-14 | 支持 | "the OP MUST attempt to actively re-authenticate"、acr の確認（SHOULD）、auth_time の確認と再認証要求（SHOULD） | なし |
| [^57] | 同 §4 | #53, §2-9 | 支持 | 第三者がログイン開始エンドポイントへリダイレクトし RP が Authentication Request を送る。iss は REQUIRED | なし |
| [^58] | ISO/IEC 26131:2024 | #58 | 支持 | Edition 1、Publication date 2024-10、Stage 60.60（International Standard published） | なし |
| [^59] | OpenID Federation 1.0 | #74 | 支持 | "Published: 17 February 2026"、"Status: Final"。Abstract に multilateral federation と OIDC・OAuth 2.0 への適用 | なし |
| [^60] | RFC 7643 §3.1, §4.1.1 | #75 | 支持 | id は "stable, non-reassignable"・"MUST NOT be specified by the client"、externalId はクライアントが付与、userName は一意（MUST）で "case insensitive" | なし |
| [^61] | RFC 7644 §3.3, §3.6, §3.12, §3.14 | #75, #76, §2-13 | 支持 | 重複作成は 409＋uniqueness（MUST）、削除済み resource を衝突計算に含めない（SHOULD NOT）・同じ userName の作成を 409 で失敗させない（SHOULD NOT）、ETag（MAY）、409/412 | #75 の「作り直せる」を SHOULD NOT 水準の期待と明記 |
| [^62] | RFC 7644 §6, §6.2 | #76 | 支持 | "Multi-tenancy is OPTIONAL"、"The externalId ... is required to be unique ONLY within the resources associated with the associated Tenant" | なし |
| [^63] | datatracker RFC 9967 | #80 | 支持 | Proposed Standard（May 2026）、Updates RFC 7643, RFC 7644、Abstract は SET による非同期のメッセージ交換。datatracker の頁に本文全体も掲載されているが、規範要件は本検証でも照合していない（RS-03 §6-4 のとおり未確認） | なし |
| [^64] | OpenID RISC 1.0 final | #66, §2-7 | 部分支持 | Published 29 August 2025、§2.1〜§2.11 のイベント種別、§2.6 "was recycled and now it belongs to a new user" は一致。ずれ: §2.11 Sessions Revoked は "This event type is now deprecated. New implementations MUST use the session-revoked event defined in the CAEP Specification" だが、#66 は有効なイベントとして列挙していた | #66 に非推奨と CAEP の MUST を追記。CAEP 本文を [^92] として追加。§5.1 ADR-006 行に設計上の扱いを追記 |
| [^65] | OIDF 承認告知 | #66 | 支持 | "Published September 2, 2025"、SSF・CAEP・RISC を Final として承認、投票結果 Approve 85 / Object 1 / Abstain 25 | #66 を「2025-09-02 付の告知で公表された」に表現補正（SSF・CAEP の公表日 2025-08-29 を [^93][^92] で追記） |
| [^66] | Google Cross-Account Protection | #67 | 支持 | "Last updated 2026-03-22 UTC"、署名付き SET、sessions-revoked・tokens-revoked・account-disabled、hijacking の場合 "Required: ... ending their currently open sessions" | なし |
| [^67] | RFC 9470 §3, §6.1, §9 | #48, §2-14 | 部分支持 | insufficient_user_authentication と acr_values/max_age、§6.1 "established at user-authentication time and will not change in the event of access token renewals" は一致。ずれ: §9 の懸念は、RS が challenge で返す acr_values が利用者ごとに異なると高権限者を推測され得ること。#48 の「acr を開示すると」は対象が不正確 | #48 と §5.1 ADR-005 行を原文の範囲に修正 |
| [^68] | RFC 9207 §2.4 | #55, §2-10 | 支持 | 単純文字列比較（MUST）、不一致は拒否（MUST）、対応 AS の iss 欠落は拒否（MUST）。March 2022 | なし |
| [^69] | OASIS SAML Profiles 2.0 os（p.19-20） | #52 | 支持 | "OASIS Standard, 15 March 2005"。§4.1.5 "An identity provider MAY initiate this profile by delivering an unsolicited <Response>"、"MUST NOT contain an InResponseTo attribute"。§4.1.4.3 SP は InResponseTo と元の AuthnRequest の ID の一致を確認（MUST） | なし |
| [^70] | Auth0 IdP-initiated SSO | #54 | 支持 | dateModified 2026-09-18、"IdP-Initiated flows carry a security risk and are therefore not recommended"、Login CSRF、"will reject an unrequested response" | なし |
| [^71] | Auth0 User Account Linking | #60, §2-8 | 支持 | dateModified 2026-09-25、"your tenant should request authentication for both accounts before linking occurs" | なし |
| [^72] | Descope nOAuth | #61, §2-8 | 支持 | datePublished 2023-06-20、Azure AD の email claim は "both mutable and unverified"、Disclosure timeline（2023-04-11 報告、2023-06-20 共同公表）。「最初に報告した」は原文に明示がなく、原文は "Descope discovered" | #61 を「発見して報告し、命名した」に表現補正 |
| [^73] | MSRC 2023-06-20 | #62 | 支持 | "Microsoft has deployed mitigations to omit token claims from unverified domain owners for most applications"、"Applications should never use the email claim for authorization due to its mutability and non-uniqueness" | なし |
| [^74] | Microsoft Learn breaking changes | #63 | 支持 | updated_at 2026-08-26。June 2023 "Omission of email claims with an unverified domain owner"、マルチテナントで既定省略、"Facebook and SAML/WS-Fed accounts don't have verified domains" | なし |
| [^75] | Microsoft Learn claims validation | #64, §2-7 | 支持 | ms.date 2025-03-21。"use the immutable claim values tid and oid as a combined key"、email・preferred_username・unique_name を使わない（Warning） | なし |
| [^76] | Microsoft Learn optional claims（xms_edov） | #63 | 支持 | ms.date 2026-07-22。"Boolean value indicating whether the user's email domain owner has been verified" | なし |
| [^77] | 同（AMR 表） | #27, §2-4 | 支持 | OIDC v2.0 の表で "Passkey (device-bound) (PRMFA)" と "Passkey (synced) (PRMFA)" はどちらも "fido, mfa" | なし |
| [^78] | Google OpenID Connect | #65 | 支持 | "Last updated 2026-06-15"、sub は "unique among all Google Accounts and never reused"、email を主識別子にしない、"use the hd claim instead" | なし |
| [^79] | Microsoft Learn admin takeover | #70, §2-11 | 支持 | ms.date 2026-06-18。別組織で検証済みのドメインは追加不可、external admin takeover では Users・Subscriptions・License assignments が移る、"deleted 10 days after a successful external admin takeover with the forceTakeover option" | なし |
| [^80] | Atlassian verify a domain | #71, §2-11 | 支持 | "periodically check your DNS host for the txt record"、"If you don't verify your domain within 14 days ... unclaimed"（全方式のトークンが失われた "Verified (expires soon)" 状態の説明）、SAML SSO を含むポリシーが無効になる | なし |
| [^81] | Okta IdP routing rules | #69, §2-11 | 支持 | "Routing rules improve the end-user sign-in experience, but they don't provide security enhancements"。取得した頁は Classic Engine publication | 脚注に Classic Engine 版であることを追記 |
| [^82] | Microsoft Learn how provisioning works | #79, §2-13 | 支持 | ms.date 2025-03-04。matching attributes、無効化・論理削除は update で無効化、物理削除は 30 日後。増分サイクルは "at intervals defined in the tutorial specific to each application" | §2-13・#79 の出典として追加使用、参照箇所を補正 |
| [^83] | Microsoft Learn SCIM tutorial | #79, §2-13 | 部分支持 | ms.date 2026-09-15。属性対応表（userPrincipalName→userName、mailNickname→externalId、objectId→externalId）は一致。ずれ: 40 分は "non-gallery application" として接続した SCIM アプリの記述（"The process runs every 40 minutes"）。§2-13・#79・§5.1 は「Entra の同期は約 40 分」と一般化していた | §2-13、#79、§5.1 ADR-006 行に「非ギャラリーの SCIM アプリ」の限定と、ギャラリーアプリはアプリ別（[^82]）を追記 |
| [^84] | CISA AA23-320A | #42, §2-6 | 支持 | 初版 2023-11-16、2025-07-29 改訂。"conduct spearphising calls to convince IT help desk personnel to reset passwords and/or transfer MFA tokens"、SIM swap・MFA fatigue、"Implement FIDO/WebAuthn authentication or Public Key Infrastructure (PKI)-based MFA" | なし |
| [^85] | DS-511 PDF（表紙、§1.2 p.2、別紙1 p.48） | #3, §6-12 | 部分支持 | 2025-09-30 幹事会決定、Normative、国の行政機関の手続、「決定の日から施行する」は一致。§1.1 の「SP 800-63 が 2025 年 8 月に全面改定」も確認（§6-12）。ずれ: 別紙1 は「改修の必要性がある場合には、改修に向けた計画を策定」と条件付きだが、#3 は条件を落としていた | #3 に条件を追記 |
| [^86] | DS-511 表3-6 p.28、表3-9 p.32、表3-10 p.33 | #20, #25, §6-8 | 支持 | 表3-9 のレベル定義（引用文一致）、表3-10 レベル3 は多要素・うち一要素は公開鍵認証・全利用者のフィッシング耐性、レベル2 は希望者・「暗号鍵の不正な取り出し・複製への耐性（公開鍵認証を用いる場合）」、レベル1 は単要素又は多要素 | #25 の追記で併用 |
| [^87] | DS-511 §3.2 5) ア〜ウ、表3-11 p.34-35 | #35, #41, §2-6 | 支持 | 登録方法・盗難紛失時の対応、報告者の本人確認、「アカウント回復の手段は、採用している当人認証手法と同等以上の強度の手法を選択すること」、表3-11 の 4 手法 | なし |
| [^88] | DS-511 §3.3、表3-14、表3-15 p.36-40 | #56 | 支持 | 「本ガイドラインではフェデレーションに関する保証レベルは定義せず、一律の対策基準」、原則 RP 開始（閉域網など低リスクの場合は IdP 開始可）、共有シグナルの活用方針、アサーション検証 6 項目 | なし |
| [^89] | DS-511 §4.1 3) 表4-4 と補足 p.44 | #10, §2-2 | 支持 | 表4-4（高位・中位・低位→レベル3・2・1）、補足の引用文一致。身元確認保証レベルの 3 段階の定義は §3.1 4)（p.22）にあり、脚注の参照箇所になかった | 脚注に §3.1 4) p.22 を追加 |
| [^90] | DS-512 PDF 別紙2 1.1 3) p.81-82 | #25, §2-3 | 支持 | Informative、2026-02-24。「当人認証保証レベル3 の当人認証を実現できます」、同期パスキーのアカウント奪取への非耐性。追加で確認した事項: e)「暗号鍵の不正な取り出し・複製」は「利用者が用いるデバイスや同期用クラウドサービス等の実装に依存」 | 追加確認事項を #25 に追記 |
| [^91] | Microsoft Learn add custom domain | #70 | 支持 | ms.date 2026-06-18、"Creating this TXT or MX record for your domain verifies ownership" | なし |

## 4. RS-03 への修正内容（版 0.1 → 0.2）

### 4.1 部分支持の是正

| # | 対象箇所 | 修正前（要旨） | 修正後（要旨） | 根拠 |
|---|---|---|---|---|
| 1 | [^15]、§6-13 | 要約表は「§2.4 Table 1」 | §2.5 Summary of Requirements の Table 1 | 63B-4 の目次（§2.4 は General Requirements） |
| 2 | #43 | AAL2 の全体上限は 24h（SHOULD）とだけ記載 | 上限を設けること自体が SHALL、24h は SHOULD | 63B-4 §2.2.3 |
| 3 | #18 | hybrid 接続は QR＋240m 無線で確立（SHALL） | 「次のいずれか」で、(a) QR＋240m 以下の無線、(b) 以前の取引のキャッシュ済み情報 | 63B-4 §3.2.11.3 |
| 4 | #21 | 要件は公開しなければならない（SHALL） | 文書化して周知し、該当する場合は公衆向けサイト等にも記載（SHALL） | 63B-4 Appendix B.2 |
| 5 | #38 | 回復用の連絡先は 2 つ以上 | 回復用アドレス（recovery address）を 2 つ以上。recovery contact とは別 | 63B-4 §4.2.1.2、§4.2.1.3 |
| 6 | #26、§6-9、[^52] | FIDO 白書の記述を [N] として記載 | 非規範の記述で結論に使わないこと、小文字の should、AAL の参照先が SP 800-63-3 の実装資料であることを明記 | 白書 §1、§2、§6 References [7] |
| 7 | #66、§4 表、§5.1 ADR-006、§6-3 | `sessions-revoked` を RISC の有効イベントとして列挙。SSF/CAEP の公表日は未確認 | `sessions-revoked` は非推奨で、新規実装は CAEP の `session-revoked` を使う（MUST）。SSF・CAEP の公表日 2025-08-29 をステータス表に記載。設計は CAEP を使い、RISC 版は受信互換のためだけに扱う [D] | RISC §2.11、CAEP §3.1（[^92]）、SSF（[^93]） |
| 8 | #48、§5.1 ADR-005 | `acr` を開示すると高権限者が推測される | RS が challenge で返す `acr_values` が利用者ごとに異なると高権限者を推測され得る | RFC 9470 §9 |
| 9 | §2-13、#79、§5.1 ADR-006、[^82]、[^83] | Entra の同期は約 40 分間隔 | 非ギャラリーの SCIM アプリは約 40 分。ギャラリーアプリの増分サイクルはアプリ別チュートリアルで定める | SCIM tutorial、how provisioning works |
| 10 | #3 | 稼働中・構築中のシステムに速やかな評価と改修計画の策定を求める | 速やかに評価し、改修が必要な場合は計画を策定 | DS-511 別紙1 |

### 4.2 支持した主張の表現・参照箇所の補正

| # | 対象箇所 | 補正内容 | 根拠 |
|---|---|---|---|
| 11 | #31 | 「失効」を原文の expiration（有効期限切れ）に寄せ、renewal・update も原語で併記 | 63B-4 §4.1 |
| 12 | #75 | 「削除後に同じ userName で作り直せる」を SHOULD NOT 水準の期待（保証ではない）と明記 | RFC 7644 §3.6 |
| 13 | #61 | 「最初に報告した」を「発見して報告し、命名した」に変更 | Descope ブログ |
| 14 | #43、§2-14 | 63B-4 §5.2 の「より安全なセッション維持技術では上限を延長してよい（MAY）」と「適用する上限の文書化（SHALL）」を追記 | 63B-4 §5.2（[^31]） |
| 15 | #25、[^90] | DS-512 が「暗号鍵の不正な取り出し・複製」への耐性を実装依存としている点を追記 | DS-512 別紙2 1.1 3) イ e) |
| 16 | [^81]、[^89] | Okta の頁が Classic Engine 版であること、DS-511 身元確認保証レベルの所在 §3.1 4) p.22 を参照箇所に追加 | 各原典 |
| — | 冒頭メタ情報 | 版 0.2・状態 review に更新し、独立検証の実施と本記録の所在を追記 | — |

## 5. 検証不能・未確認の事項

- 検証不能と判定した脚注はない。全 91 脚注の URL を取得し、該当箇所を確認できた。
- RS-03 §6 が自ら「未確認」とした事項（ISO/IEC 26131 本文と OIDC Core errata set 2 の字句の同一性、RFC 9967 本文の規範要件、Microsoft の migrate-off-email-claim ガイド、Semperis による nOAuth 再調査、WebAuthn L3 のブラウザ実装状況など）は、本検証でも確認していない。結論に使われていないことは確認した。
- pages.nist.gov の HTML 版と CSRC 掲載の PDF 版の字句が同一かは照合していない。HTML にドラフト表記がなく、相互参照が Final 版の DOI を指していることだけを確認した。
- ベンダー文書（[^66], [^70]〜[^83], [^91]）は確認日（2026-10-03）時点の版であり、予告なく改訂され得る。

## 6. 検証者の所見（判定の対象外）

- §2 結論サマリの各文は、上記の修正後、脚注の原典と整合している。とくに §2-3（同期 passkey と AAL3）、§2-5（フィッシング耐性）、§2-9（FAL2 の RP 起点）、§2-14（再認証上限）の規範強度は原典どおりである。
- RS-03 は [N] タグを、規範語を持たない原典の記述（63B-4 Appendix B.4 の小文字の should、FIDO 白書）にも付けている。CONVENTIONS.md §3 の [N] は「規範要求」なので、非規範の記述には「非規範」と本文で明記する運用が望ましい。#26 は今回そのように修正した。
