# RS-11 独立検証記録（脚注の原典照合）

> 文書ID: RS-11-V / 版: 0.1 / 状態: review / 最終更新: 2026-10-03
> 対応要求: R-101, R-104, R-105, R-106, R-107, R-108, R-109, R-161, R-209（RS-11 の対応要求に準ずる）
> 依存文書: CONVENTIONS.md, research/RS-11-twenty-year-evolution-pqc.md（検証対象。検証後に版 0.1 から 0.2 へ改訂）

本記録は、RS-11 の作成者とは別の AI エージェント（Claude）が 2026-10-03 に行った脚注の原典照合のログである。検証者も AI であり、人間のレビュアによる照合ではない。判定は検証者の読解によるもので、CTO/CISO の決裁ではない。

---

## 1. 検証の方法

| 項目 | 内容 |
|---|---|
| 対象 | RS-11 版 0.1 の全脚注 [^1]〜[^69]（69 件）と、各脚注が付いた本文の主張（§2 結論サマリ、§3 調査結果 RS-11#1〜#77、§4 ステータス表、§5.1 の根拠付き記述） |
| 取得 | 全 69 脚注の URL を 2026-10-03 に取得した。文言・数値・規範語（MUST/SHOULD/MAY、shall/should）を逐語で照合するため、原則として curl で原文を取得し、HTML はテキスト化、PDF は pdftotext（日本語 PDF は PyMuPDF）で抽出して全文検索した。RFC は rfc-editor.org の .txt を取得した |
| 補助確認 | I-D の版・提出日・IESG 状態は Datatracker の doc.json（版履歴 rev_history）と文書ページで確認した。CVE は NVD API 2.0（services.nvd.nist.gov）で公表日・CVSS・記述を確認した。CSRC で未公表の文書（FIPS 206 ipd/final、IR 8547 final、SP 800-131A Rev.3 final）は、想定 URL（/pubs/fips/206/ipd 等）が 404 になることでも補強した |
| 取得できなかったもの | NSA の 2 文書（[^14] CNSA 2.0 CSA、[^15] CNSA 2.0 FAQ）は、curl と WebFetch の直接取得がいずれも HTTP 403 になった。Tavily extract（advanced）で同じ URL の原典 PDF の全文テキストを抽出し、それを照合した。要約ではなく本文テキストであり、版番号・文書番号・ページ番号も抽出テキスト中で確認できた |
| 二次情報 | FIPS 206 の状況について、Tavily 検索で業界ブログ等（「2026年8月時点で ipd 未公開」等）を見たが、手掛かりにとどめ、判定には CSRC の一次情報だけを使った |
| 判定区分 | 支持: 脚注の参照箇所が主張を全て裏付ける。部分支持: 主張の核心は裏付けられるが、限定条件・版・日付・参照箇所・用語のいずれかが原典とずれる。不支持: 原典が主張を裏付けない、または反する。検証不能: 原典を取得できない、または該当箇所が見つからない |
| 規範強度 | RFC 7696、RFC 8725、RFC 9964、RFC 10024、RFC 9864、RFC 9068、OIDC Core/Discovery、RFC 6265、RFC 9110、RFC 9449、RFC 9700、RFC 8996、RFC 9155、OMB M-26-15（must/should/may）、EU ロードマップ（shall not / highly recommended）の規範語を、該当文と 1 文ずつ照合した。強度の写し違いはなかった |

## 2. 判定の集計

| 判定 | 件数 | 脚注 |
|---|---|---|
| 支持 | 56 | 下表の「支持」 |
| 部分支持 | 13 | [^12], [^17], [^19], [^20], [^26], [^31], [^32], [^33], [^35], [^42], [^47], [^64], [^67] |
| 不支持 | 0 | — |
| 検証不能 | 0 | — |

部分支持の 13 件は、いずれも RS-11 版 0.2 で修正した（§4）。最も多かった誤りは I-D の日付で、5 件（[^26], [^32], [^33], [^35], [^42]）が版の提出日ではなく Datatracker の「最終更新」（状態変更などの日付）を版の日付として記していた。用語の誤りは 1 件で、TLS registry の 'D' を「deprecated」と書いていた（正しくは discouraged、RFC 9847 §3）。新たな原典として RFC 9847 を [^70] に追加した。

## 3. 脚注ごとの判定表

凡例: 「主張」は脚注が付いた RS-11 の項目番号（#n）と結論サマリの番号（§2-n）。「取得」の curl は原文の全文取得、DT は Datatracker、Tavily は Tavily extract による原典全文の抽出を表す。

### 3.1 NIST（[^1]〜[^11]）

| 脚注 | 原典（取得） | 主張 | 判定 | 照合結果（原典の該当箇所） | 修正 |
|---|---|---|---|---|---|
| [^1] | CSRC FIPS 203 書誌ページ（curl） | #1 | 支持 | Date Published: August 13, 2024。Planning Note (11/17/2025) "We've identified an issue that will be corrected in a future update/revision of this publication."。Errata (potential updates) あり | なし |
| [^2] | CSRC FIPS 204 書誌ページ（curl）、FIPS 204 PDF（curl） | #2, #3 | 支持 | 2024-08-13 Final。Planning Note (07/31/2026) "several minor issues that will be corrected in a future update/revision"。§4 Table 2: ML-DSA-44 pk 1312 / sig 2420、-65 1952 / 3309、-87 2592 / 4627 | #2 と [^2] に planning note の日付（2026-07-31）を追記 |
| [^3] | CSRC FIPS 205 書誌ページ、FIPS 205 PDF（curl） | #4 | 支持 | 2024-08-13 Final。Table 2: SLH-DSA-SHA2-128s sig 7 856、128f 17 088、256f 49 856、pk 32〜64 | なし |
| [^4] | Perlner「FIPS 206 Status Update」PDF（curl） | #5 | 支持 | p.2 "We expect to release an Initial Public Draft soon / It's basically written, awaiting approval" | なし |
| [^5] | CSRC FIPS 一覧（WebFetch）、想定 URL の照会（curl） | #5, #7, §2-14 | 支持 | 一覧は 13 件で最新は FIPS 205、FIPS 206 は ipd・final とも掲載なし。/pubs/fips/206/ipd、/pubs/fips/206/final、/pubs/ir/8547/final、/pubs/sp/800/131/a/r3/final はいずれも 404 | なし |
| [^6] | CSRC SP 800-227 書誌ページ（curl） | #6 | 支持 | Document History "09/18/25: SP 800-227 (Final)" | なし |
| [^7] | CSRC IR 8547 ipd 書誌ページ、IR 8547 ipd PDF（curl） | #7〜#11, §2-1, §2-2, §2-13 | 支持 | 2024-11-12 ipd、Comments Due 2025-01-10（CLOSED）、newer version なし。§4.1.1 Table 2 と §4.1.2 Table 4: 112-bit は "Deprecated after 2030" と "Disallowed after 2035"、128-bit 以上と EdDSA は "Disallowed after 2035"。§4.1.1 "projected that NIST would disallow public-key schemes that provide 112 bits of security on January 1, 2031 ... NIST intends to instead deprecate classical digital signatures at the 112-bit security level"。§3.2 "hybrid solutions are typically expected to be temporary measures that lead to a second transition"。§3.2.2 "provided that at least one component digital signature algorithm is NIST-approved"、"NIST will accommodate the use of ... dual signatures in FIPS 140 validation" | §2-2 の推論を Table 2 に合わせて精緻化（F-01） |
| [^8] | CSRC SP 800-131A Rev.2 書誌ページ（curl） | #12 | 支持 | "03/21/19: SP 800-131A Rev. 2 (Final)"。Rev.3 ipd の存在を告知 | なし |
| [^9] | CSRC SP 800-131A Rev.3 ipd 書誌ページ、PDF（curl） | #12〜#14, §2-2 | 支持 | 2024-10-21 ipd、Comments Due 2024-12-04（CLOSED）、newer version なし。§1.2.3 "deprecates SHA-1 and the 224-bit hash functions through December 31, 2030, and disallows them thereafter"、"Deprecate the use of the 112-bit security strength for the classical digital signature and key-establishment mechanisms after December 31, 2030"、"one-step approach"。§11 "SHA-1 is disallowed for digital signature generation." / "allowed for legacy use"。RSA 署名生成（2048 ≤ len(n) < 3072）は 2030-12-31 より後 deprecated | なし |
| [^10] | CSRC CSWP 39upd1 書誌ページ、PDF（curl） | #16 | 支持 | "Date Published: December 19, 2025 (includes updates as of 06-29-2026)"、"Supersedes: CSWP 39 (12/19/2025)"。Abstract の定義 "capabilities needed to replace and adapt cryptographic algorithms ... while preserving security and ongoing operations"。§2.1 "took 23 years"、§3.2.1 CA 証明書の署名が数十年、§3.2.2 "significant growth in the size of cryptographic data" | なし |
| [^11] | NIST News（curl） | #15 | 支持 | 2022-12-15。"SHA-1 should be phased out by Dec. 31, 2030" | なし |

### 3.2 米国連邦（[^12]〜[^16]）

| 脚注 | 原典（取得） | 主張 | 判定 | 照合結果（原典の該当箇所） | 修正 |
|---|---|---|---|---|---|
| [^12] | EO 14412 官報 PDF（curl） | #17, #18 | 部分支持 | 2026-06-22 署名、91 FR 38483–38486、2026-06-25 掲載。§4(b)(ii) 鍵確立 2030-12-31、(iii) 署名 2031-12-31（NSS 除外は (i)）。§5(d) CISA 270日以内に CBOM 最小要素。§6(c) FAR Council 180日以内に、covered contractors が 2030-12-31 までに PQC を含む FIPS に準拠する FAR 改正案。ずれ: §4(c) は「NIST が所有・運用する情報システムの適切な一部で、180日以内にパイロットを開始し、2027-12-31 までに完了」であり、ノートは対象と開始期限を落としていた | #17 を修正（F-08） |
| [^13] | OMB M-26-15 PDF（curl） | #19〜#23, §2-7 | 支持 | 2026-06-24。§1 "does not apply to national security systems"。§3.A "must execute a prioritized migration ... mitigating as much quantum risk as feasible by December 31, 2030"。§3.B 120日以内に提出（must。2026-06-24 起算で 2026-10-22）。§3.D Phase 1〜5 と年次、"Agencies must align their plans with NIST Internal Report (IR) 8547 ... or successor document"。App. A §3 "intricate and resource-intensive stopgap"、"Agencies may choose to implement hybrid architectures"。§4 TLS 1.3 "not later than January 2, 2030"（must）。§5 外部設定（must）、ネゴシエーション field（should）、KMS/HSM（must）。§7 "API gateways and application workloads must be configured to issue and validate PQC-signed tokens" | なし |
| [^14] | NSA CNSA 2.0 CSA（直接取得 403、Tavily） | #25 | 支持 | PP-22-1338、SEP 2022、Ver. 1.0。p.6–7 "Software and firmware signing: ... support and prefer CNSA 2.0 by 2025, and exclusively use CNSA 2.0 by 2030"、"Web browsers/servers and cloud services: ... by 2025 ... by 2033"、networking 2026/2030、OS 2027/2033、niche（large PKI を含む）2030/2033、"Custom applications and legacy equipment: update or replace by 2033" | なし |
| [^15] | NSA CNSA 2.0 FAQ（直接取得 403、Tavily） | #24, #26, #27, §2-13 | 支持 | U/OO/194427-22、PP-24-4014、December 2024、Ver. 2.1。p.3 表: ML-KEM-1024、ML-DSA-87、AES-256、SHA-384/512、LMS/XMSS（ソフトウェア・ファームウェア署名）。"SLH-DSA ... is not approved for any use in NSS"。HashML-DSA "Not at the present time"。CNSSP 15: 2027-01-01 新規調達、2030-12-31 phase out、2031-12-31 mandated、2035 NSS 全体。"it is not a requirement beyond NSS"。Hybrids: "will not require NSS developers to use hybrid"、"hybrid deployments add a second transition later" | §6-4 に FAQ も Tavily で照合した旨を追記（F-19） |
| [^16] | CISA 製品カテゴリページ（curl） | #28, §2-3 | 支持 | Publish Date January 23, 2026。Table 2: Cloud Services（PaaS, IaaS）、Web Software（browsers, servers）等。注記 "Most of these categories have implemented PQC for key encapsulation and key agreement but have not yet widely implemented PQC for digital signatures and authentication."。Table 3: ICAM Software（identity provider and federation services, certificate authorities, PKI management）、ICAM Hardware（HSM） | なし |

### 3.3 EU・英国・日本（[^17]〜[^21]）

| 脚注 | 原典（取得） | 主張 | 判定 | 照合結果（原典の該当箇所） | 修正 |
|---|---|---|---|---|---|
| [^17] | EUR-Lex 勧告 (EU) 2024/1101（curl） | #29 | 部分支持 | "Done at Brussels, 11 April 2024"、OJ 12.4.2024。前文 (6) "via hybrid schemes that may combine Post-Quantum Cryptography with existing cryptographic approaches"。ずれ: 「2年」の規定（"should be available after a period of two years following the publication"）は前文 (6)(7) ではなく本文第2節にある | [^17] の参照箇所に本文第2節を追加 |
| [^18] | EU ロードマップ Part 1 PDF（curl）、欧州委員会掲載ページ（curl） | #30〜#32, §2-1, §2-13 | 支持 | 表紙 "Part 1, Version: 1.1 ... 11.06.2025"。掲載ページ "Publication 23 June 2025"。§4.1 "recommended to use standardised and tested hybrid solutions, whenever feasible and suitable"、"quantum-vulnerable public-key mechanisms shall not be used stand-alone after the end of 2030, analogously after the end of 2035 for medium-risk use cases"、マイルストーン 31.12.2026 / 31.12.2030 / 31.12.2035。§4.2 high-risk の定義（10年以上後の機密性侵害）、"highly recommended to ensure that products ... beyond 2030 should be upgradable to PQC" | なし |
| [^19] | NCSC ページ（curl） | #33, §2-1 | 部分支持 | "The key milestones are: By 2028 ... By 2031 ... By 2035 Complete migration to PQC of all your systems, services and products"。ずれ: ページ表示は Published 20 March 2025、Reviewed 20 March 2025、Version 1.0。「2026-08-03」は JSON-LD の dateModified だけに現れ、版と本文の更新を示す表示はない | #33、§4 表、[^19] を修正（F-09, F-15） |
| [^20] | 内閣官房 中間とりまとめ PDF（curl、PyMuPDF） | #34, §2-1 | 部分支持 | 表紙「令和７年11 月」。4.(1)「原則として、2035 年までに行うことを目指し、…2026 年度に工程表（ロードマップ）を策定し」。5.「クリプト・アジリティ」「現在主流の暗号技術との併用」「重要インフラ事業者等や民間事業者等においても考慮しなければならない課題」。ずれ:「RSA 等で20 年ほどの期間が必要」は 3.(1) にあり、脚注の参照箇所（4.(1)、5.）に含まれていなかった | [^20] の参照箇所に 3.(1) を追加 |
| [^21] | 内閣官房 連絡会議ページ（curl） | #35, §2-14 | 支持 | 「とりまとめ等」は中間とりまとめ（PDF／226KB）だけ。幹事会の最新は「第５回 令和８年 ３月３０日（月）」 | なし |

### 3.4 IETF・OpenID（[^22]〜[^40], [^68], [^69]）

| 脚注 | 原典（取得） | 主張 | 判定 | 照合結果（原典の該当箇所） | 修正 |
|---|---|---|---|---|---|
| [^22] | RFC 7696（curl .txt） | #36〜#40, §2-8 | 支持 | BCP 201、November 2015。§2.1 "The protocol MUST include a mechanism to identify the algorithm or suite"。§2.2 "it is RECOMMENDED that the base protocol specification includes a reference to a companion algorithms document"。§2.4 "SHOULD be integrity protected"。§3.1 "Specification of too many alternatives will likely hamper interoperability and may hamper security as well"。§3.3 "more than five years"。§4 "the transition process needs to begin when practically exploitable flaws become known"。§5 "it SHOULD NOT be changed or removed ... a means of marking a registry entry as deprecated" | なし |
| [^23] | RFC 9864（curl .txt） | #43, §2-8 | 支持 | Standards Track、October 2025。§4.1.2 JOSE EdDSA "Deprecated"。§4.2.2 COSE ES256 (-7)、ES384 (-35)、ES512 (-36)、EdDSA (-8) "Deprecated"。§4.4 Deprecated（SHOULD、運用・規制上の例外）、Prohibited（MUST NOT） | なし |
| [^24] | RFC 9964（curl .txt） | #41, #42, §2-4, §2-7 | 支持 | Standards Track、May 2026。§3 "The alg ... parameter is REQUIRED for all AKP keys"。§4 "the priv parameter MUST be the seed and MUST have a length of 32 bytes"。§5 "The ctx parameter MUST be the empty string"、base64url で大きくなる旨、"ML-DSA may not be suitable for use cases requiring small keys or signatures"、RFC 7638/9679 の thumbprint。§7.2 HashML-DSA を規定しない。§8.1 COSE -48/-49/-50 | なし |
| [^25] | DT draft-ietf-jose-pq-composite-sigs | #44, §2-4 | 支持 | rev 04 の提出 2026-09-11。WG state "WG Document"、IESG state "I-D Exists"、Intended RFC status なし | 日付を 2026-09-11 に精緻化（F-10） |
| [^26] | DT draft-ietf-cose-sphincs-plus | #45 | 部分支持 | IESG state "AD Evaluation"、"Submitted to IESG for Publication"、Intended Proposed Standard。ずれ: -10 の提出日は 2026-07-28。脚注・§4 表の 2026-08-24 は Datatracker の最終更新日 | [^26]、§4 表を修正（F-16） |
| [^27] | RFC 9881（curl .txt） | #46 | 支持 | Standards Track、October 2025、J. Massimo ほか | なし |
| [^28] | RFC 9909（curl .txt） | #46 | 支持 | Standards Track、December 2025、K. Bashiri ほか | なし |
| [^29] | DT draft-ietf-lamps-pq-composite-sigs | #46 | 支持 | rev 19 の提出 2026-04-21。IESG "RFC Ed Queue"、RFC Editor state "In Progress"。2026-10-02 は Datatracker の最終更新日 | 脚注・§4 表に最終更新日を併記 |
| [^30] | RFC 9954（curl .txt） | #49 | 支持 | Informational、July 2026。§3.3 "The two shared secrets are concatenated together and used as the shared secret in the existing TLS 1.3 key schedule"。§4 "(although this may result in ClientHello messages larger than a single packet)" | なし |
| [^31] | RFC 10024（curl .txt） | #47, #48, §2-3, §2-5 | 部分支持 | Standards Track、August 2026。§7.1 X25519MLKEM768 4588 (0x11EC) Recommended Y、§7.2 SecP256r1MLKEM768 0x11EB N、§7.3 SecP384r1MLKEM1024 0x11ED N。§4.1 client 1216 byte、§4.2 server 1120 byte、"the server MUST perform the encapsulation key check described in Section 7.2 of [NIST-FIPS-203]"。§7.4 "This document obsoletes these entries ... modified the Recommended field to 'D'"。ずれ: §2-5 が 'D' を「deprecated」と注記していた。RFC 10024 は 'D' の意味を定義しておらず、定義元の RFC 9847 §3 では "D: Indicates that the item is discouraged" | §2-5 と #48 を修正し、[^70] として RFC 9847 を追加（F-02, F-11, F-22） |
| [^32] | DT draft-ietf-tls-mlkem | #50 | 部分支持 | IESG "RFC Ed Queue"、Intended Informational。ずれ: -11 の提出日は 2026-09-17。2026-09-24 は Datatracker の最終更新日 | [^32]、§4 表を修正 |
| [^33] | DT draft-ietf-tls-mldsa | #50 | 部分支持 | IESG "RFC Ed Queue"、Intended Informational。ずれ: -06 の提出日は 2026-09-11。2026-09-29 は Datatracker の最終更新日 | [^33]、§4 表を修正 |
| [^34] | RFC 8725（curl .txt） | #51, §2-7 | 支持 | BCP 225、February 2020。§3.1 "Libraries MUST enable the caller to specify a supported set of algorithms and MUST NOT use any other algorithms ... each key MUST be used with exactly one algorithm, and this MUST be checked" | なし |
| [^35] | DT draft-ietf-oauth-rfc8725bis | #51 | 部分支持 | IESG "RFC Ed Queue"、Intended Best Current Practice。ずれ: -10 の提出日は 2026-08-21。2026-08-31 は Datatracker の最終更新日 | [^35]、§4 表を修正 |
| [^36] | RFC 7515（curl .txt） | #52, §2-7 | 支持 | §1 "The JWS JSON Serialization ... enables multiple signatures and/or MACs to be applied to the same content"。§4.1.1 alg の定義 | なし |
| [^37] | RFC 7517（curl .txt） | #52 | 支持 | §4.5 "to choose among a set of keys within a JWK Set during key rollover ... different keys within the JWK Set SHOULD use distinct "kid" values" | なし |
| [^38] | RFC 9068（curl .txt） | #53, §2-2 | 支持 | §2.1 "Authorization servers and resource servers conforming to this specification MUST include RS256 ... among their supported signature algorithms" | なし |
| [^39] | OIDC Core 1.0 errata set 2（curl） | #54, §2-2 | 支持 | "Final"、December 15, 2023。§15.1 "OPs MUST support signing ID Tokens with the RSA SHA-256 algorithm (an alg value of RS256), unless the OP only supports returning ID Tokens from the Token Endpoint ... and only allows Clients to register specifying none" | なし |
| [^40] | OIDC Discovery 1.0 errata set 2（curl） | #54, §2-2 | 支持 | December 15, 2023。id_token_signing_alg_values_supported "The algorithm RS256 MUST be included." | なし |
| [^68] | RFC 9958（curl .txt） | #50 | 支持 | Informational、June 2026、"Post-Quantum Cryptography for Engineers" | なし |
| [^69] | RFC 7519（curl .txt） | #52, §2-4 | 支持 | §1 "JWTs are always represented using the JWS Compact Serialization or the JWE Compact Serialization." | なし |

### 3.5 サイズ制約（[^41]〜[^48]）

| 脚注 | 原典（取得） | 主張 | 判定 | 照合結果（原典の該当箇所） | 修正 |
|---|---|---|---|---|---|
| [^41] | RFC 6265（curl .txt） | #55 | 支持 | §6.1 "General-use user agents SHOULD provide ... At least 4096 bytes per cookie (as measured by the sum of the length of the cookie's name, value, and attributes)" | なし |
| [^42] | DT draft-ietf-httpbis-rfc6265bis、-22 本文（ietf.org archive） | #56, §2-6 | 部分支持 | §5.6 手順5 "If the sum of the lengths of the name string and the value string is more than 4096 octets, abort this algorithm and ignore the set-cookie-string entirely."、属性値 1024 octets 超は無視、§5.7 手順4 も同旨。IESG "RFC Ed Queue"。ずれ: -22 の提出日は 2025-12-01（Datatracker 表示 "Last updated 2026-08-13 (Latest revision 2025-12-01)"）。脚注・§4 表は 2026-08-13 を版の日付としていた | [^42]、§4 表を修正 |
| [^43] | RFC 9110（curl .txt） | #57 | 支持 | §5.4 "HTTP does not place a predefined limit on the length of each field line ... A server that receives a request header field line ... larger than it wishes to process MUST respond with an appropriate 4xx" | なし |
| [^44] | RFC 9113（curl .txt） | #58, §2-6 | 支持 | §6.5.2 SETTINGS_HEADER_TABLE_SIZE "The initial value is 4,096 octets." | なし |
| [^45] | RFC 7541（curl .txt） | #58 | 支持 | §4.1 "sum of its name's length in octets ..., its value's length in octets, and 32"。§4.4 "an attempt to add an entry larger than the maximum size causes the table to be emptied of all existing entries" | なし |
| [^46] | RFC 9449（curl .txt） | #61 | 支持 | §4.2 "The JOSE Header of a DPoP JWT MUST contain at least the following parameters: typ ... alg ... jwk" | なし |
| [^47] | nginx 公式文書（curl） | #59, #63(d), §2-6 | 部分支持 | Default "large_client_header_buffers 4 8k"、"A request header field cannot exceed the size of one buffer as well, or the 400 (Bad Request) error is returned"。ずれ: 同じ節に "The limits are similarly applied in HTTP/2 and HTTP/3 connections. The size of one buffer limits the maximum size of a request header field compressed with HPACK and QPACK" とあり、「ML-DSA-65 の DPoP proof は nginx の既定値で 400 になる」と断定できるのは HTTP/1.1 に限られる | #59, #63(d), §2-6 を条件付きに修正（F-03, F-12, F-13） |
| [^48] | AWS ALB クォータ（curl） | #60 | 支持 | HTTP headers: Request line 16 K、Single header 16 K、Entire response header 32 K、Entire request header 64 K、Adjustable はすべて No | なし |

### 3.6 KMS（[^49]〜[^53]）

| 脚注 | 原典（取得） | 主張 | 判定 | 照合結果（原典の該当箇所） | 修正 |
|---|---|---|---|---|---|
| [^49] | AWS KMS Developer Guide「Key spec reference」（curl） | #64, §2-9 | 支持 | ML_DSA_44 / ML_DSA_65 / ML_DSA_87、"AWS KMS supports the ML_DSA_SHAKE_256 signing algorithm for all of the ML-DSA key specs"、"The private key that generates signatures never leaves AWS KMS unencrypted"。補足: 同ページに HSM・FIPS 140-3 の記載はない | §5.1 ADR-007 の「AWS はあり」を「鍵仕様あり、保護レベルと FIPS 140-3 範囲は未確認」に明確化（F-18） |
| [^50] | AWS KMS API Reference「Sign」（curl） | #65 | 支持 | "Messages can be 0-4096 bytes. To sign a larger message, provide a message digest."、"EXTERNAL_MU for 64-byte representative μ used in ML-DSA signing as defined in NIST FIPS 204 Section 6.2" | なし |
| [^51] | Google Cloud KMS「Key purposes and algorithms」（curl） | #66, §2-9 | 支持 | "Last updated 2026-09-30 UTC"。PQC signing: "You can use the algorithms in this table with the following protection levels: software"（hsm、hsm-single-tenant、external、external-vpc のタブは空）。PQ_SIGN_ML_DSA_44/65/87（各 EXTERNAL_MU 版）、PQ_SIGN_SLH_DSA_SHA2_128S、PQ_SIGN_HASH_SLH_DSA_SHA2_128S_SHA256。KEM: KEM_XWING、ML_KEM_768、ML_KEM_1024。HTML 中の Preview 表示はナビゲーションの別ページ（Quantum-safe key import 等）に付くもので、本ページには付いていない | なし |
| [^52] | Azure Key Vault「About keys」（curl） | #67, §2-9 | 支持 | updated_at 2026-07-30。Supported key types: RSA、EC、oct-HSM（symmetric/AES、preview）。"256-bit symmetric (oct-HSM / AES) keys ... are quantum-resistant"。ML-DSA 等の記載なし | なし |
| [^53] | Azure Managed HSM「Key types, algorithms, and operations」（curl） | #67, §2-9 | 支持 | updated_at 2026-06-12。署名アルゴリズムは EC（ES256 等）と RSA（PS256、RS256 等）だけ。PQ 署名の記載なし | なし |

### 3.7 標準の寿命・SAML（[^54]〜[^65]）

| 脚注 | 原典（取得） | 主張 | 判定 | 照合結果（原典の該当箇所） | 修正 |
|---|---|---|---|---|---|
| [^54] | RFC 5849（curl .txt） | #69, §2-10 | 支持 | Informational、April 2010 | なし |
| [^55] | RFC 6749（curl .txt） | #69, #70, §2-10 | 支持 | "Obsoletes: 5849"、October 2012 | なし |
| [^56] | OpenID Authentication 2.0（curl） | #68, §2-10 | 支持 | "OpenID Authentication 2.0 - Final"、December 5, 2007 | なし |
| [^57] | OIDC Core 1.0 final（curl） | #68, §2-10 | 支持 | "Final: OpenID Connect Core 1.0"、February 25, 2014 | なし |
| [^58] | OpenID 2.0 to OpenID Connect Migration 1.0（curl） | #68 | 支持 | Final、April 16, 2015。openid2_id による識別子移行 | §2-10 の「置き換わった」の根拠として追加引用（F-04） |
| [^59] | RFC 9700（curl .txt） | #70, §2-10 | 支持 | BCP 240、January 2025。§2.1.2 "clients SHOULD NOT use the implicit grant (response type token) or other response types issuing access tokens in the authorization response, unless access token injection ... is prevented and the aforementioned token leakage vectors are mitigated" | なし |
| [^60] | RFC 8996（curl .txt） | #71, §2-10 | 支持 | BCP 195、March 2021。§4 "TLS 1.0 MUST NOT be used"、§5 "TLS 1.1 MUST NOT be used"、§6 "Implementations MUST NOT negotiate TLS version 1.0/1.1" | なし |
| [^61] | RFC 9155（curl .txt） | #72 | 支持 | December 2021。§2 "Clients MUST NOT include MD5 and SHA-1 in this extension." | なし |
| [^62] | SAML V2.0 Core PDF（curl） | #73 | 支持 | 表紙 "OASIS Standard, 15 March 2005" | なし |
| [^63] | USENIX Security 2012 論文ページ（curl） | #74, §2-11 | 支持 | Abstract "an in-depth analysis of 14 major SAML frameworks and show that 11 of them, including Salesforce, Shibboleth, and IBM XS40, have critical XML Signature wrapping (XSW) vulnerabilities" | なし |
| [^64] | NVD CVE-2024-45409（NVD API 2.0） | #75, §2-11 | 部分支持 | published 2024-09-10、GitHub CNA の CVSS v3.1 10.0（NVD 自身は 9.8）。記述 "does not properly verify the signature of the SAML Response. An unauthenticated attacker with access to any signed saml document (by the IdP) can thus forge a SAML Response/Assertion"。ずれ: §2-11 は 2024年分も 2012年の XSW と「同じ種類」と書いていたが、NVD の記述は署名検証の不備であり、XSW とは書いていない | §2-11 を NVD の記述どおりに修正（F-05） |
| [^65] | NVD CVE-2025-25291（NVD API 2.0） | #75, §2-11 | 支持 | published 2025-03-12。"ReXML and Nokogiri parse XML differently ... That allows an attacker to be able to execute a Signature Wrapping attack" | なし |

### 3.8 deprecation の先例（[^66]〜[^67]）

| 脚注 | 原典（取得） | 主張 | 判定 | 照合結果（原典の該当箇所） | 修正 |
|---|---|---|---|---|---|
| [^66] | Kubernetes Deprecation Policy（curl） | #76, §2-12 | 支持 | "Last modified August 21, 2026"。Rule #1、Rule #4a（GA "must not be removed within a major version"、Beta "deprecated no more than 9 months or 3 minor releases after introduction ... no longer served 9 months or 3 minor releases after deprecation"、Alpha は予告なし）、Rule #4b、Rule #5a（GA 12 months or 2 releases）、Rule #7（1 year） | なし |
| [^67] | Microsoft Learn「Migrate from Azure AD Graph」（curl） | #77, §2-12 | 部分支持 | ms.date 2025-09-29。2019 告知・退役日 2023-06-30、"June 30, 2023: End of the three-year notice period"、2024-08-31、2025-02-01、"August 31, 2025: End of extended access to Azure AD Graph. Azure AD Graph will be fully retired."。ずれ: 原典は予定形で、退役の実施を記した記述ではない。ノートは「完全に退役した」と断定していた | #77、§2-12、[^67] を修正（F-06, F-14） |

### 3.9 検証者が追加した原典

| 脚注 | 原典（取得） | 主張 | 判定 | 照合結果（原典の該当箇所） | 措置 |
|---|---|---|---|---|---|
| [^70] | RFC 9847（curl .txt） | #48, §2-5 | 追加 | Standards Track、December 2025、"Updates: 8447"。Abstract "It adds a new value, "D" for discouraged, to the "Recommended" column"。§3 "D: Indicates that the item is discouraged ... When marking a registry entry as "D", either the "Reference" or the "Comment" column MUST include sufficient information to determine why" | 新規脚注として追加し、§4 表にも行を追加 |

## 4. 修正内容（RS-11 版 0.1 → 0.2）

| ID | 箇所 | 修正前（要旨） | 修正後（要旨） | 理由 |
|---|---|---|---|---|
| F-01 | §2-2 | RS256 は鍵長 3072 bit 以上にして「2035年までの猶予を確保」 | IR 8547 ipd では RSA-2048 も 2035年までは deprecated（利用可・リスク受容要）。3072 bit 以上は deprecated の段階を避けるだけで、どちらも 2035年より後は disallowed | Table 2 の構造（112-bit も 2035 までは disallowed ではない）と推論の対応を正確にするため |
| F-02 | §2-5 | 'D'（deprecated） | 廃止（obsolete）され Recommended 欄が 'D'。'D' は discouraged（RFC 9847 §3）[^70] | [^31] の部分支持 |
| F-03 | §2-6 | DPoP proof は nginx 既定 8k を超える | 計算上超える[D]。400 と言えるのは HTTP/1.1。HTTP/2・HTTP/3 は圧縮後サイズに適用[V] | [^47] の部分支持 |
| F-04 | §2-10 | OpenID 2.0 は OIDC に置き換わった[^56][^57] | 識別子移行の専用標準（2015）を併記し [^58] を追加 | 「置き換わった」の根拠を原典で補うため |
| F-05 | §2-11 | 2024年・2025年に「同じ種類の脆弱性」 | SAML 署名検証を迂回できる脆弱性。NVD の記載（2024 は署名検証の不備、2025 は Signature Wrapping）を明記 | [^64] の部分支持 |
| F-06 | §2-12 | 2025-08-31 の「完全停止」 | 完全退役日とされた 2025-08-31。原典は予定形で、停止の実施は未確認 | [^67] の部分支持 |
| F-07 | RS-11#2, [^2] | errata 掲示 | planning note の日付 2026-07-31 を追記 | 版・日付の明示 |
| F-08 | RS-11#17 | NIST にパイロット完了を命じる | NIST が所有・運用するシステムの一部で、180日以内に開始し 2027-12-31 までに完了 | [^12] の部分支持 |
| F-09 | RS-11#33 | 2025-03-20 公表、2026-08-03 更新 | Version 1.0、Reviewed 2025-03-20。2026-08-03 はメタデータ dateModified で、版と期限は不変 | [^19] の部分支持 |
| F-10 | RS-11#44, [^25], §4 表 | 2026-09 | 2026-09-11 | 日付の精緻化 |
| F-11 | RS-11#48 | 'D' に変更 | 'D' = discouraged、理由の記載が MUST（RFC 9847 §3）を追記 | [^31] の部分支持 |
| F-12 | RS-11#59 | 8k 超で 400 | HTTP/2・HTTP/3 では圧縮後サイズに適用される旨を追記 | [^47] の部分支持 |
| F-13 | RS-11#63(d) | DPoP proof は nginx 既定で 400 | HTTP/1.1 の場合に限定し、HTTP/2/3 は PoC（P-1）で確認 | [^47] の部分支持 |
| F-14 | RS-11#77, [^67] | 2025-08-31 に完全に退役した | 2025-08-31 に完全に退役する（予定形、実施は未確認） | [^67] の部分支持 |
| F-15 | §4 表 NCSC 行、[^19] | 2025-03-20（更新 2026-08-03） | Version 1.0、2025-03-20（Reviewed 2025-03-20。メタデータ dateModified 2026-08-03） | [^19] の部分支持 |
| F-16 | §4 表 I-D 行、[^26], [^29], [^32], [^33], [^35], [^42] | cose-sphincs-plus-10: 2026-08-24、tls-mlkem-11: 2026-09-24、tls-mldsa-06: 2026-09-29、oauth-rfc8725bis-10: 2026-08-31、httpbis-rfc6265bis-22: 2026-08-13 | 版の提出日 2026-07-28、2026-09-17、2026-09-11、2026-08-21、2025-12-01 に改め、Datatracker 最終更新日を併記。lamps-pq-composite-sigs-19 にも最終更新日 2026-10-02 を併記。表の冒頭に「公表日」の定義を追記 | 版の日付の誤り（5件） |
| F-17 | §4 表 | — | RFC 9847 の行を追加 | F-02 で引用した原典の状態を台帳に載せるため |
| F-18 | §5.1 ADR-007 行 | AWS はあり | AWS は ML-DSA の鍵仕様あり。保護レベルと FIPS 140-3 の検証範囲は未確認 | [^49] に HSM の記載がなく、「あり」が保護レベルを指すと読めるため |
| F-19 | §6-4 | CSA だけを Tavily で確認 | 独立検証でも CSA と FAQ の両方が 403 で、Tavily の全文抽出で照合した旨を追記 | 取得経路の透明性 |
| F-20 | §6-15（新設） | — | 独立検証で修正した点の要約 | 読者への告知 |
| F-21 | 参考文献 [^17], [^20], [^47] | 参照箇所の不足 | [^17] に本文第2節、[^20] に 3.(1)、[^47] に HTTP/2・HTTP/3 の記述を追加 | 参照箇所と本文の主張を一致させるため |
| F-22 | 参考文献 [^70]（新設） | — | RFC 9847 | F-02, F-11 の原典 |
| F-23 | メタ情報 | 版 0.1 | 版 0.2、依存文書に本記録を追加、版 0.2 の注記を追加 | 改訂の記録 |

修正は 23 件（F-01〜F-23）。不支持の主張はなく、「未確認」として結論から外した主張もない。ただし F-06 と F-14 では、Azure AD Graph の退役が実際に行われたかどうかを「未確認」と明記した（結論 §2-12 の趣旨である「告知から停止予定日まで約6年、当初予定から2年以上延長」は原典で裏付けられる）。

## 5. 検証不能・限界

1. 検証不能と判定した脚注はない。
2. NSA の 2 文書（[^14], [^15]）は直接取得が 403 で、Tavily による原典 PDF の全文抽出を照合した。抽出テキストには文書番号（PP-22-1338、U/OO/194427-22、PP-24-4014）、版、ページ番号が含まれており、要約ではない。ただし PDF の図（CSA の Figure 1）は目視していない。
3. FIPS 206、IR 8547 final、SP 800-131A Rev.3 final が「公表されていない」ことは、CSRC の一覧と想定 URL の 404 による否定の証拠であり、NIST の公告や Federal Register を網羅的に調べたものではない（RS-11 §6-1 の限界と同じ）。
4. CSRC のキーワード検索ページは JavaScript で描画されるため、検索結果そのものは取得できなかった。FIPS 一覧ページ（WebFetch）と想定 URL の照会（curl）で代替した。
5. RS-11#62 の表は脚注のない計算値（[D]）である。検証者が同じ前提（payload 376 byte、header は typ/alg/kid 43 文字）で再計算したところ、access token の列は 6 方式すべてで一致した（例: ML-DSA-65 は 5,031）。DPoP proof の列は、payload の前提（jti/htm/htu/iat/ath の長さ）がノートに明記されていないため完全には再現できないが、検証者の仮定との差は全方式で一定（約 70 文字）で、計算は内部的に整合している。
6. RS-11 §6-13 の seed との差分の記述（seed-02 9-2 の要約、seed-01 の FISC 第14版の記載）は、seed 文書の該当行と一致することを確認した。seed は根拠には使っていない。
7. 本検証は脚注と本文の対応の照合であり、RS-11 が扱っていない原典（例: 金融庁・FISC の PQC 関連文書、Azure の PQ 署名の preview 情報）の探索はしていない。

## 6. AI 利用の明記

本検証は AI エージェント（Claude）が行った。原典の取得と照合には curl、pdftotext、PyMuPDF、Datatracker API、NVD API、WebFetch（CSRC 書誌ページの初回確認と FIPS 一覧ページ。書誌ページは curl で再取得して逐語照合した）、Tavily extract（NSA 2 文書のみ）を使った。取得した原文は検証者の作業領域に保存して全文検索した。

## 参考文献

検証に使った原典は RS-11 版 0.2 の参考文献 [^1]〜[^70] と同じである。そのほかに次を補助的に使った。

[^1]: IETF Datatracker『Document metadata API（doc.json）』draft-ietf-jose-pq-composite-sigs, draft-ietf-cose-sphincs-plus, draft-ietf-lamps-pq-composite-sigs, draft-ietf-tls-mlkem, draft-ietf-tls-mldsa, draft-ietf-oauth-rfc8725bis, draft-ietf-httpbis-rfc6265bis. https://datatracker.ietf.org/doc/draft-ietf-httpbis-rfc6265bis/doc.json （参照箇所: rev, rev_history.published, iesg_state, rfceditor_state, intended_std_level、確認日: 2026-10-03）
[^2]: NIST NVD『CVE API 2.0』. https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2024-45409 （参照箇所: published, descriptions, metrics.cvssMetricV31。CVE-2025-25291 も同様、確認日: 2026-10-03）
[^3]: IETF『draft-ietf-httpbis-rfc6265bis-22（本文）』2025-12-01. https://www.ietf.org/archive/id/draft-ietf-httpbis-rfc6265bis-22.txt （参照箇所: §5.6 手順5・6, §5.7 手順4、確認日: 2026-10-03）
