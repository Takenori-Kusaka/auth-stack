# RS-05 独立検証記録（脚注の原典照合）

> 文書ID: RS-05-V / 版: 0.1 / 状態: review / 最終更新: 2026-10-03
> 対応要求: R-049〜R-057, R-073, R-101, R-104, R-110, R-113, R-115, R-161, R-162, R-168, R-184, R-187, R-189（RS-05 の対応要求に準ずる）
> 依存文書: CONVENTIONS.md, research/RS-05-root-of-trust-keys-supply-chain.md（検証対象。検証後に版 0.1 から 0.2 へ改訂）

本記録は、RS-05 の作成者とは別の AI エージェント（Claude）が 2026-10-03 に行った脚注の原典照合のログである。検証者も AI であり、人間のレビュアによる照合ではない。判定は検証者の読解によるもので、CTO/CISO の決裁ではない。

---

## 1. 検証の方法

| 項目 | 内容 |
|---|---|
| 対象 | RS-05 版 0.1 の全脚注 [^1]〜[^63]（63 件）と、各脚注が付いた本文の主張（§2 結論サマリ 1〜15、§3 調査結果 RS-05#1〜#82、§4 ステータス表、§6 のうち脚注に依拠する記述） |
| 取得 | 全 63 脚注の URL を 2026-10-03 に curl で取得した（全て HTTP 200）。PDF 11 件（NIST SP 800-57pt1r5 / r6 ipd / 800-130 / 800-152 / 800-53r5 / 800-218、IR 8547 ipd、CSRB 報告書、Microsoft SFI 報告 3 件）は PyMuPDF で頁ごとにテキスト化し、印字頁番号と PDF 頁番号を対応付けて照合した。HTML は標準ライブラリの HTML パーサでテキスト化し、規範語・数値・日付を全文検索で逐語照合した。MSRC Security Update Guide は JavaScript 描画のため、ノートの指定どおり MSRC 公式 API（`api.msrc.microsoft.com/sug/v2.0/en-US/vulnerability?$filter=cveNumber eq 'CVE-2025-55241'`）の JSON で照合した。WebFetch は小型モデルの要約を返すため、照合には使わなかった |
| 補助確認 | (1) RFC 7518 / 8725 / 9964 の状態を RFC Editor の info ページで確認した。(2) CSRB 報告書の公表日を、CISA ページからリンクされた DHS プレスリリースで確認した。(3) FIPS 140-2 証明書が予定どおり Historical に移ったかを、CMVP 証明書ページ 5 件（#4400, #4450, #4500, #4550, #4600）で抽出確認した。(4) Google Cloud KMS の PQC GA を公式リリースノートで確認した。(5) IANA の DNSSEC 手続ページで、DPS 第 8 版（2025-04-14）が最新であることを確認した。(6) SP 800-218 Rev.1 の final URL が 404 であることを確認した |
| 判定区分 | 支持: 脚注の参照箇所が主張を全て裏付ける。部分支持: 主張の核心は裏付けられるが、規範強度・限定条件・版・日付・頁・書誌・帰属のいずれかが原典とずれる。不支持: 原典が主張を裏付けない、または反する。検証不能: 原典を取得できない、または該当箇所が見つからない。1 つの脚注が複数の主張に付いている場合は、最も弱い判定をその脚注の判定とした |
| 規範強度 | NIST 文書の shall / should / may / recommended / suggested、RFC と SLSA の BCP 14 キーワード（MUST / SHOULD / RECOMMENDED / MAY）、OIDC Core の MUST / SHOULD、ベンダー文書の must / should / highly recommended を、本文の該当文と 1 文ずつ照合した |

## 2. 判定の集計

| 判定 | 件数 | 脚注 |
|---|---|---|
| 支持 | 51 | 下表の「支持」 |
| 部分支持 | 12 | [^1], [^6], [^9], [^12], [^17], [^18], [^19], [^21], [^22], [^41], [^45], [^49] |
| 不支持 | 0 | — |
| 検証不能 | 0 | — |

部分支持の 12 件は、いずれも RS-05 版 0.2 で修正した（§4）。出典の差し替えは [^19] の 1 件（CISA 資料ページ → DHS プレスリリース）である。検証の過程で新たに確認した事実の出典として [^64]（CMVP 証明書 #4600）と [^65]（Google Cloud KMS リリースノート）の 2 件を追加した。結論サマリから外した主張はないが、Google Cloud KMS の ML-KEM GA は「未確認」として §6 に移した（v0.1 でも結論には使っていなかった）。

## 3. 脚注ごとの判定表

凡例: 「主張」は脚注が付いた RS-05 の項目番号（#n）と結論サマリの番号（§2-n）。頁は印字頁番号、PDF 頁は「PDF p.」と書く。

| 脚注 | 原典（取得先） | 主張 | 判定 | 照合結果（原典の該当箇所） | 修正 |
|---|---|---|---|---|---|
| [^1] | NIST SP 800-57 Pt1 Rev5（nvlpubs PDF、final 2020-05-04 を CSRC で確認） | #1〜#6, §2-2 | 部分支持 | §5.2 "a single key shall be used for only one purpose"（p.33）と被害限定の理由（p.33）、§5.3.1 の要因列挙（p.34–35）、§5.3.6 1.b "about one to three years is recommended ... shall be destroyed"、公開鍵 "on the order of several years"、Table 1 "1 to 3 years"（p.45）、§5.5.2 "should be designed so that ... as little data as possible"・"shall be documented and easily accessible"、§6.2.3 のメタデータ例と "should accompany a key" は全て一致。ずれ: (1) #4 は「無効となり得る署名の特定」を should の列挙に含めていたが、原典では "The compromise-recovery plan should contain" の a〜i ではなく "Other compromise-recovery procedures may include" の l 項（p.52）。(2) 1.b の該当文は p.39（§5.3.6 は p.38 から）。(3) §5.5.2 の計画内容は p.52 まで続く | #4 を should / may include に分けて修正。#3 と脚注の頁を p.38–39、§5.5.2 を p.50–52 に修正 |
| [^2] | CSRC SP 800-57 Pt1 Rev6 ipd ページ | #7, §4 | 支持 | Date Published 2025-12-05、Comments Due 2026-02-05（CLOSED）、Document History は Draft のみ。変更点（FIPS 203/204/205 と Ascon、承認期限を SP 800-131A 参照へ、鍵保管の新節）も一致 | なし |
| [^3] | SP 800-57pt1r6 ipd PDF | #8 | 支持 | §4.2 "a single key should be used for only one purpose"（PDF p.35）、§4.3.6 "about one to three years is suggested. A private signature key shall be destroyed"（PDF p.41）、§4.5.2 "shall be documented and easily accessible"（PDF p.57）。Rev5 の shall から should への変更も原文どおり | なし |
| [^4] | NIST SP 800-130（final 2013-08-15） | #9 | 支持 | FR:6.98・FR:6.99 は p.59（§6.7.4 は p.58 から）、FR:6.100 は §6.7.5 p.59。いずれも shall | なし |
| [^5] | NIST SP 800-152（final 2015-10-28） | #10, #11 | 支持 | PR:6.74（High は shall）・PA:6.19（Low/Moderate は should）と CA 鍵・自己保護鍵への言及（p.66）、PR:6.75/6.76（shall、p.67）、§6.8.1 "must not be used to apply cryptographic protection" と迅速な失効・交換・通知能力の should（p.68） | なし |
| [^6] | NIST SP 800-53 Rev5（2020-12-10 更新版 PDF） | #12 | 部分支持 | AC-3(2) p.23、CM-5(4) p.102、CM-14 p.114（原文引用も一致）、SC-12 p.307。ずれ: SC-12 の trust anchor の記述は統制本文ではなく Discussion の "Organizations manage trust stores to ensure that only approved trust anchors are part of such trust stores" であり、「求める」は規範強度の過大表現 | #12 を「解説（Discussion。統制本文の要求ではない）は…と述べる」に修正 |
| [^7] | CSRC SP 800-53 Rev5 ページ | #13 | 支持 | Planning Note (08/27/2025) の Release 5.2.0 と変更対象一覧（SA-15(13), SA-24, SI-02(07), SI-07(12) ほか、関連統制は All -01 等）。AC-3、CM-5、CM-14、SC-12 は含まれない。以後の Planning Note はない | なし |
| [^8] | CSRC FIPS 140-3 ページ | #14 | 支持 | Date Published 2019-03-22、Supersedes FIPS 140-2、"This standard shall be used in designing and implementing cryptographic modules that federal departments and agencies operate or are operated for them under contract"、"four increasing, qualitative levels" | なし |
| [^9] | CMVP FIPS 140-3 Transition Effort | #15, §2-10, §4 | 部分支持 | "remain active for 5 years after validation or until September 21, 2026"、予定表の "April 1, 2022 ... no longer accepts FIPS 140-2 submissions" と "September 22, 2026 All FIPS 140-2 certificates are placed on the Historical List" は一致。ずれ: 同ページは予定表であり、§2-10 と §4 は「置かれた」と実施済みの事実として書いていた | §2-10・#15・§4 を「予定表上」に修正し、実施状況は証明書 5 件の抽出照合（新設 [^64]）で補った |
| [^10] | CMVP Validated Modules | #16, §2-10 | 支持 | "If a validation certificate is marked as historical, Federal Agencies should not include these in new systems but can be procured for legacy systems. This does not mean that the overall FIPS-140 certificates for these modules have been revoked" | なし |
| [^11] | CMVP 証明書 #4884 | #17, #65 | 支持 | FIPS 140-3、Active、Sunset 11/17/2029、Overall Level 3、Caveat "Interim validation. No assurance of minimum security of SSPs ... externally loaded ..."、初回 11/18/2024、HW 3.0 / FW 1.8.104。承認アルゴリズムの署名系は ECDSA と RSA（FIPS186-4）のみで ML-DSA・EdDSA はない | §4 に HW 版と Interim を追記（補足） |
| [^12] | NIST IR 8547 ipd PDF（状態は CSRC で確認） | #64, §2-11 | 部分支持 | §4.1.1 Table 2（p.13）: ECDSA/RSA 112-bit "Deprecated after 2030 / Disallowed after 2035"、≥128-bit と EdDSA "Disallowed after 2035"。CSRC は Date Published 2024-11-12、Comments Due 2025-01-10、Document History は Draft のみ。ずれ: §2-11 の「2030 年以降非推奨、2035 年以降不許可」は "after 2030"（2030 年を含まない）と 1 年ずれ得る表現で、≥128-bit も 2035 年後に不許可である点が落ちていた | §2-11 を「2030 年より後（after 2030）」「128-bit 以上を含め 2035 年より後は不許可」に修正。#64 に EdDSA を追記 |
| [^13] | CSRC FIPS 204 ページ | #62 | 支持 | Date Published 2024-08-13、Document History 08/13/24 Final | なし |
| [^14] | RFC 8725（RFC Editor、BCP 225 を info ページで確認） | #36, #37, §2-1, §2-7 | 支持 | §3.8 "MUST validate that the cryptographic keys ... belong to the issuer. If they do not, the application MUST reject the JWT" と OIDC の jwks_uri の例、§3.9 aud の MUST、§3.11 "Explicit typing is RECOMMENDED for new uses of JWTs"、§3.12 "MUST be written such that they are mutually exclusive" と "Use different keys for different kinds of JWTs" | なし |
| [^15] | Datatracker draft-ietf-oauth-rfc8725bis | #38, §4 | 支持 | 版 00〜10、Latest revision 2026-08-21、Intended RFC status Best Current Practice、IESG state RFC Ed Queue。RFC 未発行 | なし |
| [^16] | OpenID Connect Core 1.0 errata set 2（2023-12-15） | #39, §2-7 | 支持 | §10.1.1 の kid と jwks_uri 再取得による rotation 方式、"SHOULD retain recently decommissioned signing keys for a reasonable period of time"、§3.1.3.7 "MUST exactly match the value of the iss (issuer) Claim" | なし |
| [^17] | RFC 9964（info ページで Proposed Standard を確認） | #63, §2-11 | 部分支持 | 2026-05、Standards Track、署名長 2420/3309/4627・公開鍵長 1312/1952/2592、"The ctx parameter MUST be the empty string"、JWS では base64url で長くなる旨、§7.2 HashML-DSA 非対応は一致。ずれ: 書誌で参照箇所を「§2」としていたが、表・ctx・符号化は §5 ML-DSA Algorithms にある。著者は Prorock と Steele の 2 名で「ほか」は誤り | 脚注の参照箇所を §5 に、著者表記を修正し、状態に Proposed Standard を併記 |
| [^18] | CSRB 報告書 PDF（CISA 掲載、2024-03-20 付） | #18〜#28, §2-1, §2-2, §2-4, §2-6, §2-8, §2-15 | 部分支持 | p.iii（22 組織・500 超、2016 年作成の鍵、"preventable and should never have occurred"、鍵の取得方法・時期を Microsoft は把握せず）、§1.1 p.2（consumer OWA 用、2021 年 3 月退役予定）、§1.2.3.1 p.5（crash dump の証拠・ログなし、2024-03-12 更新）、§1.2.3.2 p.6（自動 rotation なし、"stopped the rotation entirely in 2021 following a major cloud outage linked to the manual rotation process"、鍵年齢アラートなし、共通 OIDC endpoint と SDK）、§2.1.1 p.17（原文一致）、§2.1.2 p.19（他 CSP の実践）、p.20（勧告 5、原文一致）、p.21（勧告 6、"isolated key storage with minimal key release"）、§2.1.4 p.22（勧告 11・13）は全て一致。ずれ: #23 は「2023-06-27 までにキャッシュを消去し全資格情報を無効化した」としていたが、原文は "By June 27, 2023, Microsoft believed it had identified the technique ... and rapidly cleared related caching data ... to invalidate all credentials derived from the stolen key"。6/27 は手口特定の判断時点に掛かり、無効化は目的として書かれている | #23 を原文の構造どおりに修正し、Microsoft が緩和を有効と判断した根拠も追記 |
| [^19] | CISA 資料ページ（v0.1）→ DHS プレスリリース（v0.2） | #18, §4 | 部分支持 | CISA ページは DHS が CSRB 報告を公表した旨と PDF へのリンクを載せるが、公表日の記載がない。公表日 2024-04-02 は、同ページからリンクされた DHS プレスリリース（Release Date: April 2, 2024）で確認できた | 脚注を DHS プレスリリースに差し替え。#18 と §4 の「DHS/CISA が公表」を「DHS が公表（PDF は CISA 掲載）」に修正 |
| [^20] | MSRC ブログ 2023-07-11 | #29 | 支持 | "blocked the usage of tokens signed with the acquired MSA key in OWA"、"completed the replacement of the key"、Microsoft.IdentityModel と Microsoft.Identity.Web の更新 | なし |
| [^21] | MSRC ブログ 2023-09-06（2024-03-12 追記） | #21, #24, #29 | 部分支持 | 2018 年 9 月の共通 key metadata endpoint、"did not update these libraries to perform this scope validation automatically"、開発者が issuer/scope 検証を追加しなかった点、改善一覧は一致。ずれ: #29 は改善として「crash dump に鍵が混入する race condition の修正」を挙げつつ、同じ脚注で引く 2024-03-12 追記の訂正（"we have not found a crash dump containing the impacted key material"、"The race condition ... did not impact whether the key could be present in the crash dump, but rather whether the crash dump could be removed from the secure token signing environment"）を反映していなかった | #29 に 2024-03-12 追記による訂正を明記 |
| [^22] | Microsoft SFI 報告 2024 年 9 月 PDF | #30, #32, §2-6, §2-15 | 部分支持 | 内容（Entra ID と MSA のアクセス token 署名鍵の HSM 保管と人手を介さない自動 rotation、PAT 7 日、proof-of-presence、85% の pipeline テンプレート、identity 基盤監査ログの 2 年保持、署名鍵システムへの操作のページングアラート）は全て一致。ずれ: 頁番号。HSM・自動 rotation は p.12（ノートは p.13）、engineering systems は p.19（同 p.20）、監視は p.20–21（同 p.21–22）。この PDF は印字頁と PDF 頁が一致する | #30・#32 と脚注の頁を修正 |
| [^23] | Microsoft SFI 報告 2025 年 4 月 PDF | #31 | 支持 | p.16 Objective 1（MSA 署名サービスを Azure confidential VM へ移行済み、Entra ID は移行中）と Objective 6（identity 鍵の分割）。p.15 の要約も同旨 | なし |
| [^24] | Microsoft SFI 報告 2025 年 11 月 PDF | #31, §2-6 | 支持 | 95% の Entra ID 署名 VM を Azure Confidential Compute へ、94% 超の Entra ID security token を標準 SDK で検証、署名分割の最初のマイルストーン（"compromised keys cannot enable traversal into higher-privilege management layers"）。記載は PDF p.23–24（印字頁 22–23）。ノートの頁は PDF 頁として正しいが、どちらの頁番号かが不明確だった | #31 と脚注に印字頁と PDF 頁を併記（明確化） |
| [^25] | MSRC 公式 API（CVE-2025-55241） | #33, §2-9 | 支持 | releaseDate 2025-09-04、cveTitle "Azure Entra ID Elevation of Privilege Vulnerability"、CWE-287、baseScore 10.0、severity Critical、exploited No、customerActionRequired false、FAQ「fully mitigated by Microsoft」、revision 1.1（2025-09-18）"Attack Complexity metric from High to Low" | なし |
| [^26] | Dirk-jan Mollema ブログ（2025-09-17） | #34, #35, §2-9 | 支持 | Access Control Service、S2S、actor token は RS256 署名・impersonation token は "alg": "none"、24 時間有効で失効不可、Conditional Access を迂回、"There are no logs when Actor tokens are issued"、テナント ID を書き換えても Azure AD Graph がデータを返した、UPN と Exchange の表示名が混在した監査ログ、時系列（7/14 報告、7/17 修正、8/6 追加緩和、9/4 CVE、9/17 公開）。種別の注記: 発見者自身の一次報告であり報道・解説ではないが、事故の当事者（Microsoft）の事後報告ではない。Microsoft の公表は [^25] の範囲に限られる | §2-9 と #34 に「発見者の一次報告によれば」と、Microsoft の公表範囲を明記。§6 に限界として追記。#34 の「有効期間 24 時間」の帰属（actor token）を明確化 |
| [^27] | Microsoft Learn Signing key rollover（ms.date 2024-10-28） | #40, §2-8 | 支持 | "roll over on a periodic basis and, in an emergency, could be rolled over immediately"、"no set or guaranteed time"、テナント固有 endpoint で独立に cache、原文引用、kid 単位、"time-to-live ... 24 hours, with refreshes happening every hour"、未知の kid または tid で更新、5 分以内の再取得抑止、last known good。§2-8 の「削除済み鍵が最大 TTL まで受理され得る」は疑似コード（一覧にない鍵は期限が延長されない）からの [D] 推論として妥当 | なし |
| [^28] | Okta Developer Key rotation | #41 | 支持 | "four times a year, but can change without notice"、原文引用、緊急時の rotation、Cache-Control と安全な cache 期間の終わりの短い cache 時間、rotationMode、org authorization server は手動 rotation 不可 | なし |
| [^29] | Google OpenID Connect（Last updated 2026-06-15） | #42 | 支持 | iss は https://accounts.google.com または accounts.google.com、aud は client ID、"Since Google changes its public keys only infrequently, you can cache them using the cache directives of the HTTP response" | なし |
| [^30] | Auth0 Rotate Signing Keys | #42 | 支持 | discovery document は "always include both the current key and the next key" と未失効の旧鍵、"all tokens signed with the previous key will still be valid until you revoke the previous key" | なし |
| [^31] | AWS KMS Developer Guide 概要 | #43 | 支持 | "protected by FIPS 140-3 Security Level 3 validated hardware security modules (HSM). They never leave AWS KMS unencrypted"。リンク先は CMVP certificate/4884 | なし |
| [^32] | AWS KMS Request quotas | #44, §2-5 | 支持 | RSA・ML-DSA・ECC/SM2 は各 1,000 (shared)、対称は 10,000 / 20,000 / 100,000 (shared)、AWS サービスによる代行要求を含む全 principal を合算、CloudHSM key store を除き調整可（1,800）。説明例に RSA 500・ECC 300 の記述が残る点も一致 | なし |
| [^33] | AWS KMS Rotate keys | #45, §2-3 | 支持 | "Automatic key rotation is supported only on symmetric encryption KMS keys with key material that AWS KMS generates (AWS_KMS origin)"、非対称・HMAC・custom key store は自動・オンデマンドとも対象外で手動 rotation | なし |
| [^34] | AWS KMS Key spec reference | #46, #65, §2-11 | 支持 | ML_DSA_44/65/87、ML_DSA_SHAKE_256、FIPS 204 への言及とリンク、"Each KMS key can have only one Key usage" | なし |
| [^35] | AWS KMS API Sign | #47 | 支持 | "Messages can be 0-4096 bytes"、DIGEST、"EXTERNAL_MU for 64-byte representative μ used in ML-DSA signing as defined in NIST FIPS 204 Section 6.2"。なお同ページの Length Constraints は最小 1 で、説明文の 0 と食い違う（ノートは説明文に従っており、誤りではない） | なし |
| [^36] | AWS KMS Multi-Region keys | #48 | 支持 | 同じ鍵素材と鍵 ID、非対称署名にも使用可、"Regional isolation and fault tolerance ... make standard AWS KMS single-Region keys a best-fit solution"、"because multi-Region keys have different security properties ... we recommend that you create a multi-Region key only when you plan to replicate it" | なし |
| [^37] | AWS CloudHSM What is | #49 | 支持 | "general purpose, single tenant, and either FIPS 140-2 level-3 or FIPS 140-3 level-3 validated for clusters in FIPS mode" | なし |
| [^38] | AWS CloudHSM performance | #50, #65, #67 | 支持 | hsm2m.medium: RSA-2048 sign 2,000/3,000/5,000、EC P256 sign 3,000/4,500/7,000、ML-DSA-44 sign 80/140/190 ops/sec。注記 [1]〜[3] は c4.large 1 台の Java マルチスレッド。3,000/80 = 37.5 | なし |
| [^39] | AWS CloudHSM quorum authentication（CMU） | #51, #75 | 支持 | CO によるユーザー管理操作を統制、最小 2・最大 8、"tokens expire ten minutes after their creation" | なし |
| [^40] | Microsoft Learn Managed HSM Overview（ms.date 2026-07-06） | #52, #75, §2-13 | 支持 | single-tenant、FIPS 140-3 Level 3、Marvell LiquidSecurity、local RBAC は "even management group, subscription, or resource group administrators cannot override"、Microsoft's Signing Transparency の台帳 | なし |
| [^41] | Microsoft Learn Managed HSM security domain（ms.date 2026-04-02） | #53, #75, §2-13 | 部分支持 | 3 つ以上の RSA 鍵対、Shamir、quorum 上限 10・m≥3 推奨、原文引用、紛失は侵害と見なす、異なる security domain へ移行不可、再ダウンロードで保護鍵を交換可は一致。ずれ（規範強度）: 原文は "Notifications and alerts should be set on 'SecurityDomainBackup' ... and enabling PIM on the Managed HSM Administrator role is highly recommended"。アラートは should、PIM は highly recommended であり、両者をまとめて「強く推奨」としていた | #53 を should と highly recommended に分けて修正 |
| [^42] | Microsoft Learn Managed HSM Scaling Guidance（ms.date 2025-12-03） | #54, §2-5 | 支持 | 1 パーティション・同一鍵・5 分平均・最良値、RSA sign 900/340/150、EC sign P-256 330・P-384 160、"does not throttle on cryptographic operation transactions"、3 パーティション構成、保証が要る場合は 1 パーティションで計画 | なし |
| [^43] | Microsoft Learn Managed HSM About keys（ms.date 2026-05-21） | #55, #65, §2-11 | 支持 | RSA-HSM 2048/3072/4096、EC-HSM P-256/P-256K/P-384/P-521、oct-HSM、量子耐性は oct-HSM 256-bit の AES のみ。PQ 署名の鍵種別はない | なし |
| [^44] | Microsoft Learn Managed HSM key autorotation（ms.date 2026-04-28） | #56, §2-3 | 支持 | "limit of 100 versions per key"、"cannot mandate that new key versions be created more frequently than once every 28 days"、"does not support Event Grid Notifications" | なし |
| [^45] | Google Cloud HSM（Last updated 2026-09-30） | #57, §2-10 | 部分支持 | "cluster of FIPS 140-2 Level 3 certified HSMs" は一致。ずれ（範囲）: 8 KiB の制限は "Message size is limited to 8 KiB (as opposed to 64 KiB for Cloud KMS software keys) for user-provided plaintext and ciphertext, including the additional authenticated data" であり、「HSM 鍵で扱えるメッセージ」一般（署名を含む）へ広げていた | #57 を原文の範囲（平文・暗号文と AAD、software は 64 KiB）に限定 |
| [^46] | Google Cloud KMS quotas（Last updated 2026-09-30） | #58, §2-5 | 支持 | 2026-02-16 の移行、リージョン単位、鍵を含むプロジェクトに計上、HSM usage 既定 3,000,000 TPM・Soft、Software usage 6,000,000 TPM、token 数（RSA-2048 1,500、P-256 4,500、P-384 7,000、RSA-4096 14,000、software 100）、Cloud HSM 鍵の作成・import と EKM は hard。補足: 既存プロジェクトの上限は以前の上限と利用実績から自動設定される（dynamic limits） | #58 に dynamic limits を追記（補足） |
| [^47] | Google Cloud KMS Key purposes and algorithms（Last updated 2026-09-30） | #60, #65, §2-11 | 支持 | PQC signing algorithms の表は software タブ（と Any）にのみ掲載され、hsm・hsm-single-tenant・external タブは空。ML-DSA-44/65/87 と各 external-μ、SLH-DSA-SHA2-128S と pre-hash | なし |
| [^48] | Google Cloud KMS Key rotation（Last updated 2026-09-30） | #61, §2-3 | 支持 | 原文引用 "Cloud KMS does not support automatic rotation for asymmetric keys, because additional steps are required ..." と一致 | なし |
| [^49] | Google Cloud Blog（2026-07-29） | #60 | 部分支持 | ブログは "we are announcing the general availability of our quantum-safe digital signatures (ML-DSA, SLH-DSA) and post-quantum key encapsulation (ML-KEM)" と記し、主張の文言自体は原典どおり。ずれ: 公式リリースノート（新設 [^65]）は PQC 署名 8 種の GA を 2026-07-16 付で記録し、KEM は 2025-09-23 付の Preview 記載しかなく GA の記録がない。ベンダーのブログを根拠に、公式文書と食い違う GA（特に ML-KEM）を事実としていた | #60 を、署名の GA はリリースノートの 2026-07-16、ML-KEM の GA は未確認に修正。§4 に行を追加、§6 に限界を追記 |
| [^50] | IANA DPS for the Root Zone KSK Operator 第 8 版（2025-04-14。手続ページで最新版と確認） | #68〜#71, §2-12 | 支持 | §5.2.2 "three out of seven" と Crypto Officer の選出、§5.2.1 "HSMs shall meet either FIPS 140-2 or FIPS 140-3, at level 3 or higher"、§5.2 暗号化バックアップ以外で HSM 外へ出さない、§5.2.3 escrow しない、§4.2.2 Tier 7（3/7）と SMK 再構成（5/7）、§4.1.2 "automatically logged and video recorded"、§4.5.3.1 48 時間の暫定 trust anchor、§6.5 5 年、§5.1.4 21 日・180 日、§7.1〜7.3（年 1 回、独立した公認会計事務所、原文引用） | なし |
| [^51] | IANA Root KSK Ceremonies | #72 | 支持 | "usually conducted four times a year"、3 か月分の ZSK、Ceremony 65-1（2027-04-29、Delete KSK-2017）と 65-2（2027-04-30、Generate KSK-2027） | なし |
| [^52] | IANA Root KSK Ceremony 62（2026-08-12） | #73, §2-12 | 支持 | 注釈付き台本、事前提案台本、CAM01〜03 の映像、coen-2.0.1 とその SHA-256、Key Signing Log 4 件、Signing Computer Audit Log、HSM7W Audit Log（tty）、HSM 5W・6W の破壊証明 | なし |
| [^53] | Microsoft Learn Emergency access（ms.date 2026-06-04） | #74, §2-13 | 支持 | 2 つ以上、cloud-only でフェデレーション・同期なし、通常管理者と異なる phishing 耐性認証（Passkey (FIDO2) 推奨、CBA）、CA 除外、専用の安全な端末、耐火金庫の別々の場所、全使用の警報、少なくとも 90 日ごとの検証、原文引用 | なし |
| [^54] | SLSA v1.2 仕様トップ | #76, §2-14 | 支持 | "Status: Approved"、"This is Version 1.2" | なし |
| [^55] | SLSA v1.2 Build Track Basics | #77, §2-14 | 支持 | L1〜L3 の表の文言、L3 "prevent runs from influencing one another, even within the same project" と "prevent secret material used to sign the provenance from being accessible to the user-defined build steps" | なし |
| [^56] | SLSA v1.2 Source requirements | #78, §2-14 | 支持 | L1 Version controlled〜L4 Two-party review、原文引用（MUST）、"Reviews SHOULD cover, at least, security relevant properties"。force push の禁止は History 要件（L2 以上）の "the SCS MUST ensure that a Branch can only be updated to point to revisions that descend from the current revision. In git, this requires a technical control to prohibit git push --force" にある | #78 で force push の要件が History（L2 以上）に属することを明記（明確化） |
| [^57] | SLSA ブログ Announcing SLSA v1.2（2025-11-24） | #76 | 支持 | 公表日、Source Track の導入、"backwards compatible with SLSA v1.1" | なし |
| [^58] | NIST SP 800-218 SSDF 1.1 PDF（final 2022-02） | #79 | 支持 | PO.5.1（PDF p.17）、PO.5.2（PDF p.18）、PS.1.1 と例 3・4（commit signing、code owner）、PS.2.1 と例 3（certificate renewal, rotation, revocation, and protection）。文書は "This document recommends the SSDF" とし、task は shall 形式ではない。脚注の PO.5 の頁を PDF p.17 としていたが PO.5.2 は p.18 | 脚注の頁を PDF p.17–18 に修正（軽微） |
| [^59] | CSRC SP 800-218 Rev.1 ipd | #80, §4 | 支持 | Date Published 2025-12-17、Comments Due 2026-01-30（CLOSED）、Document History は Draft のみ。r1/final は 404 | なし |
| [^60] | Sigstore overview | #81 | 支持 | Cosign・Fulcio・Rekor、OIDC identity token と短命証明書による keyless 署名。SLO の記載はない | なし |
| [^61] | Sigstore Fulcio overview | #81 | 支持 | "Fulcio signs X.509 certificates valid for 10 minutes" | なし |
| [^62] | OPA Bundles（Signing 節） | #82, §2-14 | 支持 | .signatures.json の JWT、3 段の検証、原文引用、keyid の解決順（command-line → configuration → JWT header kid）。manifest の revision は識別子の文字列にとどまり、単調性検証の記述はない | なし |
| [^63] | RFC 7518（info ページで Proposed Standard を確認） | #66 | 支持 | §3.4 "The JWS Signature value MUST be a 64-octet sequence. If it is not a 64-octet sequence, the validation has failed" | なし |

### 3.1 新設した脚注

| 脚注 | 原典 | 目的 | 確認内容 |
|---|---|---|---|
| [^64] | CMVP 証明書 #4600（FIPS 140-2、2023-09-14 検証） | [^9] の予定表が実施されたことの裏付け | Status: Historical、Historical Reason "Moved to historical list due to sunsetting"、ページ冒頭に "should not be included by Federal Agencies in new procurements"。同日に #4400（2022-12-27 検証）、#4450（2023-03-14）、#4500（2023-05-02）、#4550（2023-07-12）も同じ状態であることを照合した。全件の照合ではないため、本文には「抽出照合」と明記した |
| [^65] | Google Cloud KMS release notes | [^49] の GA 日付と範囲の公式確認 | 2026-07-16 "Cloud KMS supports the following post-quantum computing (PQC) signing algorithms in General Availability"（8 種）、2026-08-06 quantum-safe key import（Preview）、2025-09-23 KEMs（Preview）。KEM の GA の記載はない |

## 4. 修正内容（RS-05 版 0.1 → 0.2）

| # | 箇所 | 修正前（要旨） | 修正後（要旨） | 根拠脚注 |
|---|---|---|---|---|
| 1 | 冒頭メタ情報 | 版 0.1 | 版 0.2。本検証記録への参照行を追加 | — |
| 2 | §2-5 | 「署名能力はベンダー間で桁が異なる」 | クォータ既定値と性能目安という性質の異なる値の比較であることを明記 | [^32][^42][^46] |
| 3 | §2-9 | CVE-2025-55241 の詳細を断定 | 「発見者の一次報告によれば」とし、Microsoft の公表範囲（CVSS・CWE・緩和済み）を明記 | [^25][^26] |
| 4 | §2-10 | 「2026-09-22 に全証明書が Historical List に置かれた」 | 「CMVP の移行予定表では…置かれる」とし、証明書 5 件の抽出照合結果を追記 | [^9][^64] |
| 5 | §2-11 | 「2030 年以降非推奨、2035 年以降不許可」 | 「2030 年より後（after 2030）は非推奨、128-bit 以上を含め 2035 年より後は不許可」 | [^12] |
| 6 | #3, [^1] | §5.3.6 p.38 | 1.b の該当文は p.39（§5.3.6 は p.38–39） | [^1] |
| 7 | #4, [^1] | 「無効となり得る署名の特定」を含め should | 棚卸し・re-keying 監視は should contain、無効署名の特定は may include。頁を p.50–52 に | [^1] |
| 8 | #12 | SC-12 は trust anchor の管理を「求める」 | 解説（Discussion。統制本文の要求ではない）が「述べる」 | [^6] |
| 9 | #15, §4 | 2026-09-22 の Historical 化を事実として記載 | 予定表の記載であることと、抽出照合の結果（5 件全て Historical）を明記。§4 の状態欄も同様に修正 | [^9][^64] |
| 10 | #18, §4, [^19] | 「DHS/CISA が 2024-04-02 公表」、脚注は CISA ページ | 「DHS が 2024-04-02 に公表（PDF は CISA 掲載）」。脚注を DHS プレスリリースに差し替え | [^19] |
| 11 | #23 | 「2023-06-27 までにキャッシュを消去し全資格情報を無効化した」 | 「6/27 までに手口を特定したと判断し、派生資格情報を無効化するため関連キャッシュを速やかに消去した」と原文の構造に合わせ、緩和を有効と判断した根拠を追記 | [^18] |
| 12 | #29 | race condition の修正を改善として列挙 | 2024-03-12 追記の訂正（鍵を含む crash dump は未発見、race condition は持ち出し可否に関わる）を追記 | [^21] |
| 13 | #30, #32, [^22] | p.13、p.20、p.21–22 | p.12、p.19、p.20–21 | [^22] |
| 14 | #31, [^24] | p.23–24 | 印字頁 p.22–23 = PDF p.23–24 | [^24] |
| 15 | #34 | 「impersonation token は未署名、有効期間は24時間」 | 未署名は impersonation token、24 時間有効・失効不可・CA 迂回は actor token の性質として分けて記載 | [^26] |
| 16 | #53 | PIM 適用とアラートを一括で「強く推奨」 | アラートは should、PIM は highly recommended | [^41] |
| 17 | #57 | 「HSM 鍵で扱えるメッセージは 8 KiB まで」 | 利用者が渡す平文・暗号文（AAD を含む）が 8 KiB まで（software 鍵は 64 KiB） | [^45] |
| 18 | #58 | 既定値のみ | 既存プロジェクトは dynamic limits で自動設定される旨を追記 | [^46] |
| 19 | #60, §4, §6, [^49], [^65] | 「2026-07-29 に ML-DSA・SLH-DSA・ML-KEM の GA を公表」 | 署名 8 種の GA はリリースノートの 2026-07-16。ブログは ML-KEM の GA も告知するがリリースノートに記録がなく未確認。§4 に Cloud KMS PQC の行、§6 に ML-KEM GA と CVE 詳細の限界を追加 | [^49][^65] |
| 20 | #64 | ≥128-bit の 2035 年不許可のみ | EdDSA も同様であることを追記 | [^12] |
| 21 | #78 | 「git では force push を禁止する技術的統制が要る」（L4 の文脈） | History 要件（L2 以上）の MUST に属することを明記 | [^56] |
| 22 | [^17] | 「M. Prorock, O. Steele ほか」「§2」 | 著者 2 名、参照箇所 §5、状態に Proposed Standard を併記 | [^17] |
| 23 | [^58] | PO.5（PDF p.17） | PO.5（PDF p.17–18） | [^58] |
| 24 | §4 #4884 行 | FW 1.8.104 / Active | HW 3.0 / FW 1.8.104、Interim validation を併記 | [^11] |

## 5. 検証不能の理由

検証不能と判定した脚注はない。全 63 件の URL を取得でき、参照箇所を原典上で特定できた。

ただし、次の 2 点は原典の性質上、照合の範囲が限られる。

- **[^26]（CVE-2025-55241 の技術的詳細）**: 発見者の一次報告として内容は原典どおりだが、Microsoft 側の事後報告（PIR/RCA）は確認できず、Microsoft の公表は [^25] の範囲にとどまる。CONVENTIONS §3 の `[I]` の根拠条件（当事者の事後報告・政府報告・公的勧告）に照らすと、発見者報告は当事者報告に準じる扱いになる。このため本文に「発見者の一次報告によれば」と明記し、§6 に限界として記した。結論 9 の設計判断（`[D]`）は、MSRC が CWE-287（Improper Authentication）・CVSS 10.0 を公表した事実とも整合する。
- **[^64]（FIPS 140-2 の Historical 化）**: CMVP の検索結果ページは JavaScript で描画されるため、全 FIPS 140-2 証明書の一括照合はできなかった。証明書ページ 5 件の抽出照合にとどまる。

## 6. 二次情報の扱い

- 脚注 63 件のうち、ブログ形式の原典は [^26]（発見者の一次報告）、[^49]（Google Cloud 公式ブログ）、[^57]（SLSA 公式ブログ）の 3 件である。[^57] は仕様策定主体自身の公表告知で、[^54] の仕様状態表示と一致した。[^49] は公式リリースノートと食い違ったため、事実の根拠を [^65] に移した。[^26] は §5 のとおり扱った。
- 報道・解説記事・AI 要約・Q&A を根拠とした主張は見つからなかった。v0.1 §6 の「Azure AD 2021-03-15 障害の PIR」と「CSRB の 2025 年の活動停止」は、すでに「未確認」として結論から外されており、本検証でも原典の照合は行っていない（結論に使われていないため）。
- 種資料（traceability/seed/）は本検証の根拠に使っていない。

## 7. 規範強度の照合結果（要約）

| 原典 | 本文の強度 | 原典の強度 | 結果 |
|---|---|---|---|
| SP 800-57r5 §5.2 用途分離 | shall | shall | 一致 |
| SP 800-57r5 §5.3.6 私有署名鍵 cryptoperiod / 破棄 | recommended / shall | recommended / shall | 一致 |
| SP 800-57r5 §5.5.2 設計 / 計画の文書化 / 計画内容 | should / shall / should | should / shall / should contain（無効署名の特定は may include） | 不一致 1 箇所を修正 |
| SP 800-57r6 ipd §4.2 / §4.3.6 / §4.5.2 | should / suggested・shall / shall | 同左 | 一致 |
| SP 800-130 FR:6.98–6.100 | shall | shall | 一致 |
| SP 800-152 PR:6.74 / PA:6.19 / PR:6.75–76 / §6.8.1 | shall / should / shall / must not・should | 同左 | 一致 |
| SP 800-53 SC-12 trust anchor | 求める | Discussion の記述 | 修正 |
| FIPS 140-3 適用範囲 | shall | shall | 一致 |
| CMVP Historical | should not | should not | 一致 |
| RFC 8725 §3.8 / §3.9 / §3.11 / §3.12 | MUST / MUST / RECOMMENDED / MUST | 同左 | 一致 |
| OIDC Core §10.1.1 / §3.1.3.7 | SHOULD / MUST | 同左 | 一致 |
| RFC 9964 ctx | MUST | MUST | 一致 |
| RFC 7518 §3.4 | MUST | MUST | 一致 |
| SLSA Source L4 / レビュー範囲 / History | MUST / SHOULD / （記載なし） | MUST / SHOULD / MUST | History を追記 |
| IANA DPS §5.2.1 | shall | shall | 一致 |
| Managed HSM security domain のアラート / PIM | 強く推奨（一括） | should / highly recommended | 修正 |
| SSDF 1.1 task | 推奨（shall ではない） | recommends | 一致 |
