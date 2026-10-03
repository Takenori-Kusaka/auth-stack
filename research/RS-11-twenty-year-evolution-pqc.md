# RS-11 20年の進化・PQC・deprecation（一次資料調査ノート）

> 文書ID: RS-11 / 版: 0.2 / 状態: draft / 最終更新: 2026-10-03
> 対応要求: R-101, R-104, R-105, R-106, R-107, R-108, R-109, R-161, R-209（seed-01 §2 の採番。対応付けのためだけに参照し、根拠には使わない）
> 依存文書: CONVENTIONS.md, traceability/seed/seed-01-ciso-assurance.md, traceability/seed/seed-02-cto-technical.md（§9 9-1〜9-4）, traceability/seed/seed-03-redteam-decision.md（§2）, research/verification/RS-11-verification.md（独立検証記録）

- 版 0.2 は、作成者以外による全脚注の原典照合（2026-10-03）の結果を反映した。修正箇所と判定は research/verification/RS-11-verification.md に記録した。

- 本ノートの調査・起草には AI エージェント（Claude）を用いた。原典は 2026-10-03 に取得し、RFC・NIST・OMB・EO・EU・NSA・内閣官房の文書は本文テキストを直接照合した。要約ツールの出力だけに依拠した主張はない（例外は §6 に列挙）。
- seed-01〜03 は計画段階の二次情報を含むため、問いの手掛かりとしてだけ使い、記載の版・日付はすべて原典で再確認した。seed と原典が食い違った点は §6 に記録した。
- 想定事業（1000億円規模、利用者100万人、約300マイクロサービス、日本・EU/英国・米国、計画期間20年）は CONVENTIONS.md §7 の暫定前提による。前提台帳（01_governance/assumptions-register.md）がまだないため、[A-xxx] は採番待ちとし、仮定に依存する推論は本文で仮定を明示した。

## 1. 調査の問い

seed-02 §9（9-1〜9-4）と seed-03 §2 の問い:

1. 20年の計画期間で入れ替わる前提のもの（プロトコル、暗号、ライブラリ）と、保つべきもの（識別子、データモデル、監査記録、境界原則）をどう区別するか。
2. 移行期限と順序はどうなるか（TLS の KEM を先行させ、署名は長寿命の root、SAML、VC から移行するのか）。FIPS 203/204/205/206、NIST IR 8547、SP 800-131A、CNSA 2.0、OMB 覚書の状態と期限は何か。
3. token 種別ごとの alg 識別子、複数 alg を載せる JWKS、hybrid/composite 署名をどう扱うか。ML-DSA の署名サイズ（ML-DSA-44 で約 2.4KB）はどこで上限に当たるか。
4. versioning と deprecation をどう運用するか（claim の版、model の版、SDK サポート期間、未移行 consumer 数）。
5. 利用側を改修せずに alg を切り替えられる設計（seed-03 §2 の「利用側改修なし alg 切替演習」）は、標準のどの規定に依拠して成り立つか。
6. 識別子の不可逆性: どの識別子が変更不能で、どの識別子は registry 側で deprecated になり得るか。
7. deprecation SLA: 告知から停止まで、どれだけの最短期間と延長余地を設けるべきか。

本ストリームで追加した問い:

8. OIDC Core、OIDC Discovery、RFC 9068 が RS256 を必須実装（MTI）にしている現状で、PQ 署名だけの IdP は規格に適合するか。
9. 主要 KMS（AWS、Google Cloud、Azure）は PQ 署名鍵を、どの保護レベル（HSM かソフトウェアか）で提供しているか。マルチクラウドや出口戦略に差が出るか。
10. ML-DSA の JWT や DPoP proof は、cookie（RFC 6265/6265bis）、HTTP ヘッダ、HTTP/2 の HPACK、代表的な proxy や LB の既定上限に収まるか。
11. 規格化前の暫定識別子（draft codepoint）を採用した場合、何が起きるか。
12. 各法域の期限のうち、民間の共通基盤に直接かかるものと、顧客や調達条件を通じて間接的にかかるものはどれか。

## 2. 結論サマリ（設計への含意）

1. 20年の計画期間中に、token 署名、TLS 鍵交換、workload ID の公開鍵暗号を少なくとも1回入れ替える前提を置く必要がある。NIST IR 8547 ipd は量子脆弱な署名と鍵確立を「Disallowed after 2035」とし[N][^7]、EU（2030/2035）[N][^18]、英国（2035）[N][^19]、日本政府（原則2035）[N][^20] も同じ時期を目標にしている。したがって20年の計画期間（2026〜2046年）の前半で移行期限が来る（RS-11#8, #30, #33, #34 より）[D]。
2. RSA-2048（112-bit）による RS256 は、IR 8547 ipd と SP 800-131A Rev.3 ipd のどちらでも2030年より後は「deprecated」とされている[N][^7][^9]。一方、OIDC Core と OIDC Discovery は OP に RS256 の実装を MUST で求め[N][^39][^40]、RFC 9068 も AS と RS に RS256 を MUST で求める[N][^38]。このため、外部 RP と連携する経路は当面 RS256 を落とせない。IR 8547 ipd では RSA-2048 も 2035年までは「deprecated」（利用は続けられるがリスク受容が要る）にとどまり、3072 bit 以上（128-bit）は deprecated の段階を経ずに 2035年より後に「disallowed」となる[N][^7]。したがって RS256 を残す場合は、鍵長を 3072 bit 以上にして 2031〜2035年の deprecated 状態を避けるのが現実的である[D]。どちらの鍵長でも 2035年より後は使えない（RS-11#8, #53, #54 より）[D]。
3. 鍵交換は署名より先に移行できる。TLS 1.3 の PQ/T hybrid 鍵交換は RFC 10024（2026-08、Standards Track）として確定し、X25519MLKEM768 だけが Recommended=Y である[N][^31]。CISA も、Web サーバや IaaS/PaaS の製品群では PQC 鍵交換が普及済みである一方、署名と認証は「not yet widely implemented」と整理している[N][^16]。よって、edge と mesh の TLS を先行させ、token 署名を後続にする順序をとる（RS-11#28, #47 より）[D]。
4. JWT の PQ 署名は RFC 9964（2026-05、ML-DSA for JOSE/COSE）で標準の識別子（ML-DSA-44/65/87）を使えるようになった[N][^24]。一方、JOSE/COSE の composite（ML-DSA と ECDSA/EdDSA の組み合わせ）はまだ WG 段階の I-D（-04）である[N][^25]。JWT は Compact Serialization に限られ、署名を1つしか持てない[N][^69]。このため、1つの JWT に hybrid 署名を載せる標準的な手段は 2026-10-03 時点で存在しない（RS-11#41, #44, #52 より）[D]。
5. 規格化前の暫定 codepoint は、RFC 化の時点で破棄される。TLS では Kyber の暫定 codepoint（25497/25498）が RFC 10024 で廃止（obsolete）され、IANA の Recommended 欄が 'D' に変更された[N][^31]。'D' は「discouraged」を意味する（RFC 9847 §3）[N][^70]。I-D の段階にある composite JOSE の alg 名を、長寿命の token profile や SDK に固定してはならない（RS-11#44, #48 より）[D]。
6. サイズの影響は大きい。ML-DSA-65 の access token（payload 376 byte の仮定）は計算上約 5.0KB になり、RFC 6265bis の cookie 上限 4096 octets（name+value、超過分は cookie ごと無視される）を超える[N][^42]。HTTP/2 の HPACK 動的テーブルの初期値 4,096 octets も超える[N][^44][^45]。ML-DSA-65 の DPoP proof は公開鍵を header に含むため計算上約 8.2KB になり、nginx の既定ヘッダバッファ 8k を超える（RS-11#62 の計算値）[D]。nginx はヘッダフィールドが 8k を超えると 400 を返すが、HTTP/2 と HTTP/3 ではこの上限を HPACK/QPACK で圧縮した後のサイズに適用するため、400 になると言えるのは HTTP/1.1 の場合である[V][^47]。ブラウザ経路の token をセッション参照型にするか、サーバ間だけで JWT を使う構成が必要になる（RS-11#62, #63 より）[D]。
7. 利用側を改修せずに alg を切り替える設計は、次の3点の組み合わせで成り立つ。(a) alg ヘッダと kid による鍵選択（RFC 7515/7517）[N][^36][^37]。(b) 鍵ごとに alg を1つに固定する検証（RFC 8725 §3.1 の MUST）[N][^34] と、AKP 鍵での alg 必須（RFC 9964）[N][^24]。(c) RP が許可する alg を、コードに固定せず issuer のメタデータと設定から取得する（OMB M-26-15 App. A §5 も、アルゴリズムを外部設定に置くことを挙げる）[N][^13]。ただしこの成立範囲は、検証ロジックを共通 SDK または gateway に集約したサービスに限られる（RS-11#21, #51, #52 より）[D]。
8. 識別子の寿命は、種類によって分けて扱う必要がある。IANA registry の alg 識別子は「変更・削除しない」のが原則である（RFC 7696、SHOULD NOT）[N][^22]。一方で、registry 上で「Deprecated」になることはある。実例として RFC 9864 は COSE の ES256（-7）と JOSE の EdDSA を Deprecated とした[N][^23]。自社で発行する識別子（issuer URL、sub/tid、kid の命名規則、token profile 名）に alg 名を埋め込むと、alg を替えたときに不可逆識別子まで変わってしまう（RS-11#40, #43 より）[D]。
9. KMS の PQ 署名対応は、クラウドごとに差が大きい。AWS KMS は ML_DSA_44/65/87 の鍵仕様を提供している[V][^49]。Google Cloud KMS は ML-DSA と SLH-DSA を提供しているが、保護レベルは software だけである[V][^51]。Azure Key Vault と Managed HSM の公式文書には PQ 署名の記載がない[V][^52][^53]。「HSM で保護した PQ 署名鍵」をマルチクラウドで同等に満たすことは、2026-10-03 時点ではできない（RS-11#64〜#67 より）[D]。
10. 標準の世代交代の周期は、10年前後と見積もるのが妥当である。OAuth 1.0（RFC 5849、2010）は 2.5年後に RFC 6749 で廃止された[N][^54][^55]。OpenID 2.0（2007）は OIDC（2014）に置き換わり、識別子の移行のために専用の標準（2015）が作られた[N][^56][^57][^58]。implicit grant は RFC 6749（2012）から RFC 9700（2025）で SHOULD NOT になった[N][^59]。TLS 1.0/1.1 は RFC 8996（2021）で MUST NOT になった[N][^60]。20年の基盤は「プロトコルとライブラリを少なくとも1回は置換する」前提で境界を設計する必要がある（RS-11#68〜#72 より）[D]。
11. SAML 2.0（2005）の XML 署名ラッピングは、2012年の評価で 14 framework 中 11 に見つかった[M][^63]。2024年と2025年にも ruby-saml で SAML の署名検証を迂回できる脆弱性が CVE として公表された（NVD の記載では、2024年の CVE-2024-45409 は署名検証の不備、2025年の CVE-2025-25291 はパーサ差分による Signature Wrapping）[I][^64][^65]。SAML は顧客 IdP との互換のために残すが、検証は隔離した adapter に閉じ込め、内部 token には変換して伝播しないことが望ましい（RS-11#73〜#75 より）[D]。
12. deprecation SLA は安定度の段階ごとに分けて定める。Kubernetes は、GA の API はメジャー版の中で削除せず、Beta の API は廃止告知後 9か月または3リリース、挙動の廃止は告知後1年以上とする段階別の方針をとる[V][^66]。Azure AD Graph の退役は、2019年の告知から完全退役日とされた 2025-08-31 まで約6年で、当初の退役日（2023-06-30）から2年以上延長された[V][^67]。ただし同ページは完全退役を「will be fully retired」と予定形で記しており、実際に停止したことは本ノートでは確認していない[V][^67]。SLA には最短告知期間だけでなく、延長の判断基準と、未移行 consumer の計測方法を含める必要がある（RS-11#76, #77 より）[D]。
13. hybrid の扱いは機関によって違う。NIST は hybrid を「一時的な措置で、2回目の移行につながる」と位置付けている[N][^7]。NSA は NSS に hybrid を要求せず、複雑さと2回目の移行を理由に慎重である[N][^15]。EU は「feasible and suitable」な範囲で hybrid を推奨している[N][^18]。このため、鍵交換は RFC 10024 の hybrid を採用し、署名は純 ML-DSA への移行と、移行期間の鍵の並行公開を基本とし、composite は RFC 化を待って再評価する方針が整合的である（RS-11#10, #27, #31 より）[D]。
14. FIPS 206（FN-DSA）、NIST IR 8547 の final 版、SP 800-131A Rev.3 の final 版は、2026-10-03 時点でいずれも公表されていない[N][^5][^7][^9]。日本政府の PQC 移行工程表（2026年度に策定予定）も未掲載である[N][^21]。期限と推奨アルゴリズムは変わり得るため、標準ステータス台帳を四半期ごとに更新し、ADR-015 に再検討トリガーとして登録する必要がある（RS-11#5, #7, #12, #35 より）[D]。

## 3. 調査結果

### 3.1 NIST の PQC 標準と移行文書

**RS-11#1** FIPS 203（ML-KEM）は 2024-08-13 に Final として公表された。CSRC には 2025-11-17 付で「将来の改訂で修正する issue がある」とする planning notice と errata が掲示されている。[N][^1]

**RS-11#2** FIPS 204（ML-DSA）は 2024-08-13 に Final として公表され、軽微な修正を将来の更新で行うための errata が掲示されている（CSRC の planning note は 2026-07-31 付）。[N][^2]

**RS-11#3** FIPS 204 Table 2 によると、鍵と署名のサイズ（byte）は次のとおりである。ML-DSA-44 は公開鍵 1312、署名 2420。ML-DSA-65 は公開鍵 1952、署名 3309。ML-DSA-87 は公開鍵 2592、署名 4627。[N][^2]
- 原文: "Table 2. Sizes (in bytes) of keys and signatures of ML-DSA"（FIPS 204 §4）

**RS-11#4** FIPS 205（SLH-DSA）は 2024-08-13 に Final として公表された。Table 2 によると、署名長は SLH-DSA-SHA2-128s で 7,856 byte、128f で 17,088 byte、256f で 49,856 byte、公開鍵は 32〜64 byte である。[N][^3]

**RS-11#5** FIPS 206（FN-DSA）は、2026-10-03 時点で CSRC の FIPS 一覧に掲載されていない（最新は FIPS 205）。FN-DSA で検索しても該当文書はなかった。[N][^5] NIST の 2025年の発表資料は「We expect to release an Initial Public Draft soon」と述べており、ipd が出たかどうかは CSRC で確認できなかった。[N][^4]

**RS-11#6** SP 800-227（Recommendations for Key-Encapsulation Mechanisms）は 2025-09-18 に Final として公表された。[N][^6]

**RS-11#7** NIST IR 8547 は 2024-11-12 に Initial Public Draft として公表され、意見募集は 2025-01-10 に締め切られた。2026-10-03 の CSRC 検索でも状態は「Draft」のままで、final 版は確認できない。[N][^7][^5]

**RS-11#8** IR 8547 ipd の Table 2（署名）と Table 4（鍵確立）は、次のとおり定める。ECDSA、RSA、有限体 DH/MQV、楕円曲線 DH/MQV、RSA 鍵確立のうち、112-bit の強度のものは「Deprecated after 2030」かつ「Disallowed after 2035」。128-bit 以上のもの（EdDSA を含む）は「Disallowed after 2035」。[N][^7]
- 原文: "Table 2: Quantum-vulnerable digital signature algorithms ... Deprecated after 2030 ... Disallowed after 2035"（IR 8547 ipd §4.1.1、Table 4 は §4.1.2）

**RS-11#9** IR 8547 ipd §4.1.1 によると、SP 800-57 Part 1 は 112-bit の公開鍵方式を 2031-01-01 に disallow する計画だった。IR 8547 ipd はこれを改め、PQC への移行期間中は「deprecate」にとどめる。[N][^7]
- 原文: "NIST intends to instead deprecate classical digital signatures at the 112-bit security level."

**RS-11#10** IR 8547 ipd §3.2 は、hybrid を「少なくとも一方が安全なら安全」とする保険と位置付ける一方、複雑さとコストが増すことを指摘し、一時的な措置で2回目の移行につながると述べる。[N][^7]
- 原文: "When used, hybrid solutions are typically expected to be temporary measures that lead to a second transition to cryptographic tools that use only PQC algorithms."

**RS-11#11** IR 8547 ipd §3.2.2 によると、dual signature（hybrid/composite 署名）は、構成要素のうち少なくとも1つが NIST 承認方式であれば既存の標準で許容される。NIST は FIPS 140 の検証でも、NIST 承認方式と適切に組み合わせた dual signature を受け入れる方針である。[N][^7]

**RS-11#12** 現行の Final は SP 800-131A Rev.2（2019-03-21）である。Rev.3 は 2024-10-21 に ipd として公表され、意見募集は 2024-12-04 に締め切られた。2026-10-03 時点で final 版は確認できない。[N][^8][^9]

**RS-11#13** SP 800-131A Rev.3 ipd §1.2.3 は、二段階の移行（112-bit から 128-bit へ、その後 PQC へ）をやめ、一段階で移行する案を示す。古典署名と鍵確立の 112-bit は 2030-12-31 より後に deprecated とし、SHA-1 と 224-bit のハッシュ関数は 2030-12-31 まで deprecated、それ以降は保護の適用に使うことを disallow する。[N][^9]
- 原文: "This revision of SP 800-131A also deprecates SHA-1 and the 224-bit hash functions through December 31, 2030, and disallows them thereafter for applying cryptographic protection"

**RS-11#14** SP 800-131A Rev.3 ipd §11 は、SHA-1 による署名生成を disallow とし、署名検証については legacy use として許容する。[N][^9]
- 原文: "SHA-1 is disallowed for digital signature generation." / "When used for digital signature verification, SHA-1 is allowed for legacy use."

**RS-11#15** NIST は 2022-12-15 に、SHA-1 を 2030-12-31 までに段階的に廃止する方針を公表した。[N][^11]
- 原文: "SHA-1 should be phased out by Dec. 31, 2030"

**RS-11#16** NIST CSWP 39upd1（2026-06-29 更新、初版 CSWP 39 は 2025-12-19 で、upd1 に置き換えられた）は、crypto agility を「セキュリティと継続運用を保ったまま暗号アルゴリズムを置換・適応する能力」と定義する。同文書は、Triple DES から AES への移行に 23年かかったこと（§2.1）、CA 証明書の署名が数十年使われ続けるため移行を妨げること（§3.2.1）、PQC では鍵と署名が大きくなるため「significant growth in the size of cryptographic data」を見込むべきこと（§3.2.2）を挙げる。[N][^10]
- 原文: "the complete transition from Triple DES to AES took 23 years."

### 3.2 米国連邦（EO・OMB・NSA・CISA）

**RS-11#17** EO 14412「Securing the Nation Against Advanced Cryptographic Attacks」（2026-06-22 署名、91 FR 38483、2026-06-25 官報掲載）§4(b) は、OMB に対し 90日以内に次の指針を出すよう命じる。HVA と high impact system（NSS を除く）は、鍵確立を 2030-12-31 までに、デジタル署名を 2031-12-31 までに PQC へ移行する。§4(c) は、NIST に対し、NIST が所有・運用する情報システムの一部で PQC 移行パイロットを 180日以内に開始し、2027-12-31 までに完了させるよう命じる。[N][^12]
- 原文: "(ii) transition all HVAs and high impact systems to use PQC for key establishment by December 31, 2030; (iii) transition all HVAs and high impact systems to use PQC for digital signatures by December 31, 2031"

**RS-11#18** EO 14412 §6(c) は、FAR Council に対し 180日以内に FAR 改正案を出すよう命じる。改正案は、covered contractor が 2030-12-31 までに、PQC を含む NIST FIPS に準拠することを求める内容である。§5(d) は、CISA に対し 270日以内に CBOM の最小要素の指針を出すよう命じる。[N][^12]

**RS-11#19** OMB M-26-15「Execution of the Migration to Post-Quantum Cryptography」（2026-06-24）は、各機関に対し、2030-12-31 までに「as much quantum risk as feasible」を軽減するよう、優先順位をつけた移行を MUST で求める。移行計画は覚書の日付から 120日以内に提出する MUST である（起算日から計算すると 2026-10-22 頃）。この覚書は NSS には適用されない。[N][^13]

**RS-11#20** M-26-15 §3.D は、移行を5つの Phase に分ける。Phase 1（戦略・計画・棚卸し、2026–2027）、Phase 2（パイロットと早期移行、2027–2028）、Phase 3（優先移行。HVA などの鍵確立を PQC 化、2028–2030）、Phase 4（署名の移行、2031）、Phase 5（全面移行、2035）である。計画を IR 8547 またはその後継文書に整合させることは MUST とされる。[N][^13]
- 原文: "Agencies must align their plans with NIST Internal Report (IR) 8547, Transition to Post-Quantum Cryptography Standards, or successor document."

**RS-11#21** M-26-15 Appendix A §7（ZTA への統合）は、API gateway と application workload が PQC 署名の token（JWT を例示）を発行・検証できるよう構成することを MUST で求める。新規アプリケーションに PQC-agile なライブラリの使用を義務付けることも MUST とされる。[N][^13]
- 原文: "API gateways and application workloads must be configured to issue and validate PQC-signed tokens. Secure software development practices must mandate the use of PQC-agile libraries for all new applications."

**RS-11#22** M-26-15 Appendix A §5（Cryptographic Agility）は、crypto agility の要素として次を挙げる。アルゴリズム名をコードに固定しないこと、アルゴリズムを外部の設定ファイルで指定すること、プロトコルにネゴシエーションの field を設けること（downgrade を防ぐため、許容アルゴリズムだけに制限できるようにする）。KMS と HSM については、ECC と PQC の両方の鍵を扱い、PQC をネイティブに支援することを「must」とする。[N][^13]
- 原文: "Achieving cryptographic agility requires more than simply avoiding hardcoded algorithm names."

**RS-11#23** M-26-15 Appendix A §4 は、EO 14306 に整合させて、TLS 1.3 以降への対応を遅くとも 2030-01-02 までに行うことを MUST で求める。§3 は hybrid を「intricate and resource-intensive stopgap」と呼び、採否は各機関のリスク評価に委ねる。[N][^13]

**RS-11#24** NSA の CNSA 2.0 FAQ（Ver.2.1、2024-12）は、CNSA 2.0 のアルゴリズムを次のように定める。ML-KEM-1024、ML-DSA-87、AES-256、SHA-384/512。ソフトウェアとファームウェアの署名には LMS/XMSS も使える。SLH-DSA は NSS での使用が承認されず、HashML-DSA は「Not at the present time」とされる。[N][^15]

**RS-11#25** NSA の CNSA 2.0 CSA（Ver.1.0、2022-09）の移行予定は次のとおりである。ソフトウェアとファームウェアの署名は 2025年までに支援・優先、2030年までに専用化。Web ブラウザ・サーバとクラウドサービスは 2025年までに支援・優先、2033年までに専用化。従来型ネットワーク機器は 2026/2030、OS は 2027/2033、ニッチ機器（大規模 PKI を含む）は 2030/2033。カスタムアプリとレガシー機器は 2033年までに更新または置換する。[N][^14]
- 原文: "Web browsers/servers and cloud services: support and prefer CNSA 2.0 by 2025, and exclusively use CNSA 2.0 by 2033."

**RS-11#26** CNSA 2.0 FAQ（Ver.2.1）によると、CNSSP 15 は NSS の新規調達を 2027-01-01 から CNSA 2.0 準拠とする。CNSA 2.0 を支援できない機器は 2030-12-31 までに廃止し、2031-12-31 から CNSA 2.0 の使用を必須とする。NSS 全体を量子耐性にする目標は 2035年である。同 FAQ は、NSS 以外への要求ではないとも明言している。[N][^15]
- 原文: "NSA encourages CNSA 2.0 adoption in standards and deployment in vendor products, but it is not a requirement beyond NSS."

**RS-11#27** CNSA 2.0 FAQ（Ver.2.1）は、NSS の開発者に hybrid を要求しないとする。理由として、hybrid がネゴシエーションとエラー処理を複雑にし、後に古典アルゴリズムから離れる2回目の移行を生むことを挙げる。[N][^15]
- 原文: "hybrid deployments add a second transition later as users eventually move away from classical algorithms"

**RS-11#28** CISA の「Product Categories for Technologies That Use Post-Quantum Cryptography Standards」（2026-01-23）は、カテゴリを2つの表に分ける。Table 2（widely available）には Web ソフトウェア（ブラウザ・サーバ）とクラウドの PaaS/IaaS が入る。ただし注記で、これらは鍵カプセル化と鍵合意を PQC 化した一方、署名と認証は未普及だとしている。Table 3（transitioning）には ICAM ソフトウェア（IdP、federation、CA、PKI 管理）と ICAM ハードウェア（HSM）が入る。[N][^16]
- 原文: "Most of these categories have implemented PQC for key encapsulation and key agreement but have not yet widely implemented PQC for digital signatures and authentication."

### 3.3 EU・英国・日本

**RS-11#29** 欧州委員会勧告 (EU) 2024/1101（2024-04-11、OJ L 2024-04-12）は、加盟国に協調ロードマップを勧告から2年以内に作るよう求める。展開の手段として、既存の暗号と組み合わせる hybrid 方式に言及している。[N][^17]

**RS-11#30** EU PQC Workstream の「A Coordinated Implementation Roadmap for the Transition to Post-Quantum Cryptography」Part 1 v1.1（2025-06-11、欧州委員会の掲載は 2025-06-23）§4.1 は、次のマイルストーンを示す。2026-12-31 までに First Steps と各国ロードマップを整える。2030-12-31 までに high-risk のユースケースの移行を完了する。2035-12-31 までに medium-risk の移行を完了し、low-risk も可能な限り移行する。§4.2 は、10年以上後に機密性が破られても重大な損害が出るユースケースを high-risk と定義する。[N][^18]

**RS-11#31** EU ロードマップ §4.1 は、high-risk のユースケースでは 2030年末より後、medium-risk では 2035年末より後に、量子脆弱な公開鍵方式を単独で使ってはならない（shall not）とする。標準化され試験済みの hybrid を「whenever feasible and suitable」推奨する。この文書は加盟国向けのロードマップで、法的拘束力のある規則ではない。[N][^18]
- 原文: "For high-risk use cases, quantum-vulnerable public-key mechanisms shall not be used stand-alone after the end of 2030, analogously after the end of 2035 for medium-risk use cases."

**RS-11#32** EU ロードマップ §4.2 は、2030年を超えて使われる予定の製品を PQC にアップグレード可能にすること、ソフトウェアとファームウェアの更新機構に PQ 署名を組み込むことを強く推奨する（highly recommended）。[N][^18]

**RS-11#33** 英国 NCSC の「Timelines for migration to post-quantum cryptography」（2025-03-20 公表、Version 1.0。ページ表示の Reviewed も 2025-03-20。ページのメタデータ dateModified は 2026-08-03 だが、版番号と本文の期限は変わっていない）は、3つの期限を示す。2028年までに移行目標を定義し、全面的な棚卸しを行い、初期計画を作る。2031年までに最優先の移行を行う。2035年までに全システム、サービス、製品の PQC 移行を完了する。[N][^19]
- 原文: "By 2035 Complete migration to PQC of all your systems, services and products"

**RS-11#34** 内閣官房の「政府機関等における耐量子計算機暗号（PQC）への移行について（中間とりまとめ）」（令和7年11月）は、政府機関等の PQC 移行を原則として2035年までに行うことを目指し、2026年度に工程表を策定するとしている。同文書は、RSA 等では暗号の提案から社会への普及まで20年ほどかかったことにも言及する。手段としては、クリプト・アジリティ（暗号部分を迅速に切り替えられる情報システム）や、現在主流の暗号との併用（hybrid）を挙げる。さらに、移行は政府機関に限らず、重要インフラ事業者や民間事業者も考慮しなければならない課題だと明記している。[N][^20]
- 原文: 「原則として、2035 年までに行うことを目指し、…2026 年度に工程表（ロードマップ）を策定し」

**RS-11#35** 内閣官房の関係府省庁連絡会議のページ（2026-10-03 確認）の「とりまとめ等」欄には中間とりまとめだけが掲載されている。工程表は未掲載で、幹事会の最新の開催記録は第5回（2026-03-30）である。[N][^21]

### 3.4 IETF・OpenID: crypto agility、JOSE/COSE、TLS

**RS-11#36** RFC 7696（BCP 201、2015-11）§2.1 は、暗号を使うプロトコルに、使用中のアルゴリズムやスイートを識別する仕組みを含めることを MUST とする。識別子がなければ、アルゴリズムを移行するためにプロトコルの版番号を変えるような大きな変更が必要になると述べる。[N][^22]
- 原文: "The protocol MUST include a mechanism to identify the algorithm or suite that is being used."

**RS-11#37** RFC 7696 §2.2 は、必須実装（MTI）のアルゴリズムは時間とともに変わる前提に立つ。そのうえで、本体仕様からアルゴリズム文書を分け、片方だけを更新できるようにすることを RECOMMENDED とする。[N][^22]

**RS-11#38** RFC 7696 §2.4 は、アルゴリズムの選択やネゴシエーションに完全性保護をかけることを SHOULD とし、保護しなければ downgrade 攻撃を受けると述べる。[N][^22]
- 原文: "Cryptographic algorithm selection or negotiation SHOULD be integrity protected."

**RS-11#39** RFC 7696 §3.3 は、SHA-1 から SHA-256 への移行で、仕様化から広く普及するまでに5年以上かかったことを記している。§4 は、置換アルゴリズムの仕様化、実装、展開には長い時間がかかるため、実用的な欠陥が判明した時点で移行を始める必要があるとする。[N][^22]
- 原文: "the time from protocol specification to widespread use takes more than five years."

**RS-11#40** RFC 7696 §3.1 は、選択肢が多すぎると相互運用性と安全性を損なうと警告する。§5 は、registry に登録したアルゴリズム識別子やスイート識別子を変更・削除しないこと（SHOULD NOT）と、deprecated として印を付ける手段を設けることを推奨する。[N][^22]
- 原文: "Once an algorithm or suite identifier is added to the registry, it SHOULD NOT be changed or removed."

**RS-11#41** RFC 9964「ML-DSA for JOSE and COSE」（2026-05、Standards Track）は、JOSE と COSE に ML-DSA-44、ML-DSA-65、ML-DSA-87 を登録した（COSE の値は -48、-49、-50）。同 RFC は、汎用の鍵型 AKP（Algorithm Key Pair）を定義する。AKP 鍵では alg パラメータを REQUIRED とし、秘密鍵 priv は 32 byte の seed であることを MUST とし、ctx は空文字列であることを MUST とする。HashML-DSA は規定しない。[N][^24]
- 原文: "The alg JSON Web Key (JWK) parameter or COSE Key Common parameter is REQUIRED for all AKP keys."（§3）

**RS-11#42** RFC 9964 §5 は、JWS では署名を base64url で符号化するため表のサイズより大きくなること、ML-DSA は小さい鍵や署名を必要とする用途に向かない場合があること、thumbprint（RFC 7638/9679）で公開鍵の繰り返しを減らせることを述べる。[N][^24]
- 原文: "ML-DSA may not be suitable for use cases requiring small keys or signatures."

**RS-11#43** RFC 9864「Fully-Specified Algorithms for JOSE and COSE」（2025-10、Standards Track）は、曲線などを含めて処理内容を完全に特定する alg 識別子（fully-specified）を定義し、多相的な識別子（polymorphic）を Deprecated とした。対象は JOSE の EdDSA と、COSE の ES256（-7）、ES384、ES512、EdDSA である。同 RFC は registry の用語も定義する。「Deprecated」は、新規展開では置換手段を使うべき（SHOULD）だが、文書化された運用上または規制上の要件があれば例外を認める。「Prohibited」は使ってはならない（MUST NOT）。[N][^23]

**RS-11#44** JOSE/COSE の PQ/T hybrid composite 署名（ML-DSA と ECDSA/EdDSA の組み合わせ）は、draft-ietf-jose-pq-composite-sigs-04（2026-09-11）として jose WG の WG Document の段階にあり、IESG の状態は「I-D Exists」である。RFC ではない。[N][^25]

**RS-11#45** SLH-DSA の COSE/JOSE 化（draft-ietf-cose-sphincs-plus-10）は、IESG に提出された後の AD Evaluation の段階にあり、RFC ではない。[N][^26]

**RS-11#46** X.509 では、ML-DSA の識別子が RFC 9881（2025-10）、SLH-DSA の識別子が RFC 9909（2025-12）として公表済みである。composite ML-DSA の X.509 仕様（draft-ietf-lamps-pq-composite-sigs-19）は RFC Editor Queue にある（2026-10-02 更新）。[N][^27][^28][^29]

**RS-11#47** RFC 10024「Post-Quantum Traditional (PQ/T) Hybrid Key Agreement Mechanisms for TLS 1.3」（2026-08、Standards Track）は、X25519MLKEM768（0x11EC、Recommended=Y）、SecP256r1MLKEM768（0x11EB、N）、SecP384r1MLKEM1024（0x11ED、N）を登録した。X25519MLKEM768 の key share は、client 側 1216 byte、server 側 1120 byte である。server はクライアントの encapsulation key を FIPS 203 §7.2 の手順で検査することを MUST とする。[N][^31]

**RS-11#48** RFC 10024 §7.4 は、規格化前の Kyber768 用の実験的 codepoint（X25519Kyber768Draft00=25497、SecP256r1Kyber768Draft00=25498）を廃止し、IANA の Recommended 欄を 'D' に変更した。[N][^31] 'D' は「discouraged」を意味し、'D' を付ける場合は Reference 欄か Comment 欄にその理由を書くことが MUST とされる（RFC 9847 §3）。[N][^70]
- 原文: "This document obsoletes these entries."

**RS-11#49** RFC 9954「Hybrid Key Exchange in TLS 1.3」（2026-07、Informational）は、2つの共有秘密を連結して TLS 1.3 の key schedule に入れる方式を定める。ML-KEM の全パラメータは TLS の制約に収まるが、ClientHello が1パケットに収まらない場合があると注意している。[N][^30]
- 原文: "(although this may result in ClientHello messages larger than a single packet)"

**RS-11#50** 純 ML-KEM の TLS 1.3 鍵合意（draft-ietf-tls-mlkem-11）と、ML-DSA による TLS 1.3 認証（draft-ietf-tls-mldsa-06）は、どちらも Informational を予定して RFC Editor Queue にあり、RFC ではない。[N][^32][^33] IETF は 2026-06 に、技術者向け解説 RFC 9958「Post-Quantum Cryptography for Engineers」（Informational）を公表した。[N][^68]

**RS-11#51** RFC 8725（JWT BCP、BCP 225、2020-02）§3.1 は、ライブラリに次のことを MUST で求める。呼び出し側が許可するアルゴリズムの集合を指定できるようにし、それ以外を使わないこと。alg ヘッダと実際に使うアルゴリズムが一致することを確認すること。1つの鍵をちょうど1つのアルゴリズムでだけ使い、そのことを処理時に検査すること。改訂版の draft-ietf-oauth-rfc8725bis-10 は、BCP として RFC Editor Queue にある。[N][^34][^35]
- 原文: "each key MUST be used with exactly one algorithm, and this MUST be checked when the cryptographic operation is performed."

**RS-11#52** JWS の alg ヘッダは、署名アルゴリズムを識別する（RFC 7515 §4.1.1）。JWS の JSON Serialization は複数の署名を持てるが（RFC 7515 §1）、JWT は常に Compact Serialization で表現する（RFC 7519 §1）。JWK の kid は、鍵の rollover 中に JWK Set の中から鍵を選ぶために使い、JWK Set の中では鍵ごとに異なる kid を使うことが SHOULD とされる（RFC 7517 §4.5）。[N][^36][^69][^37]
- 原文: "JWTs are always represented using the JWS Compact Serialization or the JWE Compact Serialization."（RFC 7519 §1）

**RS-11#53** RFC 9068（JWT Profile for OAuth 2.0 Access Tokens、2021-10）§2.1 は、準拠する AS と RS が対応アルゴリズムに RS256 を含めることを MUST とする。[N][^38]
- 原文: "Authorization servers and resource servers conforming to this specification MUST include RS256 ... among their supported signature algorithms."

**RS-11#54** OIDC Core 1.0（errata set 2、2023-12-15）§15.1 は、OP に RS256 での ID Token 署名への対応を MUST で求める（Token Endpoint からだけ ID Token を返し、none だけを許す OP は例外）。OIDC Discovery 1.0（errata set 2）は、id_token_signing_alg_values_supported に RS256 を含めることを MUST とする。[N][^39][^40]
- 原文: "OPs MUST support signing ID Tokens with the RSA SHA-256 algorithm (an alg value of RS256)" / "The algorithm RS256 MUST be included."

### 3.5 サイズ制約（cookie・HTTP ヘッダ・HTTP/2・DPoP）

**RS-11#55** RFC 6265（2011-04）§6.1 は、汎用のユーザエージェントに対し、cookie 1個あたり name、value、属性の合計で少なくとも 4096 byte を扱えるようにすることを SHOULD とする。[N][^41]

**RS-11#56** RFC 6265bis（draft-ietf-httpbis-rfc6265bis-22、RFC Editor Queue）§5.6–5.7 の処理手順は、name と value の合計が 4096 octets を超えると、cookie 全体を無視する。属性値が 1024 octets を超える場合は、その属性を無視する。[N][^42]
- 原文: "If the sum of the lengths of the name string and the value string is more than 4096 octets, abort this algorithm and ignore the set-cookie-string entirely."

**RS-11#57** RFC 9110（2022-06）§5.4 は、HTTP にはフィールド長の既定上限がないとする。そのうえで、処理したくない大きさのヘッダを受けた server は、適切な 4xx を返すことを MUST とする。[N][^43]

**RS-11#58** HTTP/2 の SETTINGS_HEADER_TABLE_SIZE の初期値は 4,096 octets である（RFC 9113 §6.5.2）。HPACK の動的テーブルでは、エントリのサイズを name 長 + value 長 + 32 で数え、最大サイズを超えるエントリを追加しようとするとテーブルが空になる（RFC 7541 §4.1, §4.4）。[N][^44][^45]

**RS-11#59** nginx の large_client_header_buffers の既定値は「4 8k」で、1つのヘッダフィールドがバッファ1個（8k）を超えると 400 を返す。同じ上限は HTTP/2 と HTTP/3 にも適用されるが、その場合はバッファ1個が HPACK/QPACK で圧縮した後のヘッダフィールドの最大サイズを制限する。[V][^47]（nginx.org 公式文書、2026-10-03 確認）

**RS-11#60** AWS Application Load Balancer の HTTP ヘッダ上限は、単一ヘッダ 16K、リクエストヘッダ全体 64K、レスポンスヘッダ全体 32K で、いずれも引き上げできない。[V][^48]（AWS 公式文書、2026-10-03 確認）

**RS-11#61** RFC 9449（DPoP、2023-09）§4.2 は、DPoP proof の JOSE ヘッダに、クライアントの公開鍵を JWK で入れた jwk を含めることを MUST とする。[N][^46]

**RS-11#62** 次の表は計算値で、実測ではない。計算は FIPS 204/205 のサイズ（RS-11#3, #4）、RFC 7515 の base64url 符号化（パディングなし）、RS-11#61 の DPoP の構造を使った。前提として、payload は iss/sub/aud/exp/iat/nbf/jti/client_id/scope/tid/acr/auth_time を含む JSON 376 byte、header は typ/alg/kid（43 文字）とした。[D]

| 署名方式 | 署名 (byte) | 署名 (base64url 文字数) | access token 全体（概算） | DPoP proof 全体（概算） |
|---|---|---|---|---|
| RS256（RSA-2048） | 256 | 342 | 約 956 | — |
| ES256（P-256） | 64 | 86 | 約 700 | 約 534 |
| ML-DSA-44 | 2,420 | 3,227 | 約 3,846 | 約 5,899 |
| ML-DSA-65 | 3,309 | 4,412 | 約 5,031 | 約 8,222 |
| ML-DSA-87 | 4,627 | 6,170 | 約 6,789 | 約 11,117 |
| SLH-DSA-SHA2-128s | 7,856 | 10,475 | 約 11,105 | — |

**RS-11#63** RS-11#55〜#62 から、次のことが言える。(a) ML-DSA-65 と ML-DSA-87 の JWT は、RFC 6265bis の 4096 octets の上限により、1個の cookie に入らない。(b) ML-DSA-44 は上限まで約 250 byte しか余裕がなく、claim を足すとすぐ超える。(c) ML-DSA-65 以上の Authorization ヘッダは HPACK の既定テーブル（4,096）に入らないため、毎回の要求で非圧縮に近い形で送ることになる。(d) ML-DSA-65 の DPoP proof は、HTTP/1.1 では nginx の既定値で 400 になる。HTTP/2/3 では圧縮後のサイズで判定されるため、到達可否は PoC（P-1）で確かめる。(e) ML-DSA-65 の access token と DPoP proof を同時に送ると、1要求あたりのヘッダは 13KB を超える。[D]

### 3.6 主要 KMS の PQ 署名対応（公式文書）

**RS-11#64** AWS KMS は、鍵仕様として ML_DSA_44、ML_DSA_65、ML_DSA_87 を提供し、署名アルゴリズムとして全仕様に ML_DSA_SHAKE_256 を提供する。秘密鍵は AWS KMS の外に暗号化されない状態では出ない。[V][^49]（AWS KMS Developer Guide「Key spec reference」、2026-10-03 確認）

**RS-11#65** AWS KMS の Sign API が受け付けるメッセージは 0〜4096 byte で、それより大きいものはダイジェストを渡す必要がある。ML-DSA 向けに、FIPS 204 §6.2 の 64 byte の μ を渡す MessageType=EXTERNAL_MU がある。[V][^50]（AWS KMS API Reference「Sign」、2026-10-03 確認）

**RS-11#66** Google Cloud KMS は、PQC 署名として PQ_SIGN_ML_DSA_44/65/87（それぞれ external-μ 版あり）と SLH-DSA-SHA2-128S（pure 版と pre-hash 版）を掲載している。これらに使える保護レベルは「software」だけである。鍵カプセル化として X-Wing、ML-KEM-768、ML-KEM-1024 も掲載している。ページに Preview の表示はない。[V][^51]（Cloud KMS「Key purposes and algorithms」、最終更新 2026-09-30、2026-10-03 確認）

**RS-11#67** Azure Key Vault（vault）の公式文書（2026-07-30 更新）が挙げる鍵型は RSA、EC、oct-HSM（preview）である。量子耐性については、256-bit AES 鍵だけを quantum-resistant と記載している。Managed HSM の公式文書（2026-06-12 更新）が挙げる署名アルゴリズムも EC と RSA だけで、ML-DSA などの PQ 署名の記載はない。[V][^52][^53]

### 3.7 標準の寿命の歴史

**RS-11#68** OpenID Authentication 2.0 は 2007-12-05 に Final となった[N][^56]。OpenID Connect Core 1.0 は 2014-02-25 に Final となった[N][^57]。「OpenID 2.0 to OpenID Connect Migration 1.0」（2015-04-16 Final）は、ID Token に旧 OpenID 2.0 の識別子（openid2_id）を入れて、利用者の識別子を移行する方法を定める[N][^58]。識別子の移行のために、専用の標準が必要になった実例である。

**RS-11#69** OAuth 1.0（RFC 5849、2010-04、Informational）は、OAuth 2.0（RFC 6749、2012-10）で「Obsoletes: 5849」とされた。[N][^54][^55]

**RS-11#70** RFC 9700（OAuth 2.0 Security BCP、BCP 240、2025-01）§2.1.2 は、implicit grant（response type token）など、認可応答で access token を発行する方式を使わないこと（SHOULD NOT）をクライアントに求める（例外は、token injection を防ぎ、漏洩経路を緩和している場合）。RFC 6749（2012）での定義から、約12年後の非推奨化である。[N][^59][^55]
- 原文: "clients SHOULD NOT use the implicit grant (response type token) or other response types issuing access tokens in the authorization response"

**RS-11#71** RFC 8996（BCP 195、2021-03）は、TLS 1.0 と TLS 1.1 を使ってはならない（MUST NOT be used）とし、これらを「negotiate」することも MUST NOT とする。[N][^60]

**RS-11#72** RFC 9155（2021-12）は、TLS 1.2 のクライアントが signature_algorithms 拡張に MD5 と SHA-1 を含めることを MUST NOT とする。[N][^61]

**RS-11#73** SAML V2.0 Core は、2005-03-15 に OASIS Standard となった。[N][^62]

**RS-11#74** Somorovsky らの論文（USENIX Security 2012）は、主要な SAML framework 14 個を分析し、Salesforce、Shibboleth、IBM XS40 を含む 11 個に XML Signature Wrapping の重大な脆弱性を見つけた。測定条件は、著者らが2012年時点の実装を手作業と自動ツールで評価したものである。[M][^63]
- 原文: "we describe an in-depth analysis of 14 major SAML frameworks and show that 11 of them ... have critical XML Signature wrapping (XSW) vulnerabilities."

**RS-11#75** NVD によると、CVE-2024-45409（ruby-saml、2024-09-10 公表、GitHub CNA の CVSS v3.1 は 10.0）は SAML Response の署名を適切に検証しない脆弱性で、署名済み文書を1つ持つ攻撃者が任意のアサーションを偽造できる。CVE-2025-25291（2025-03-12 公表）は、ReXML と Nokogiri のパーサ差分により Signature Wrapping が成立する脆弱性である。[I][^64][^65]

### 3.8 deprecation 方針の先例

**RS-11#76** Kubernetes の Deprecation Policy（kubernetes.io、2026-08-21 更新）は、次の規則を定める。Rule #1: API 要素は API group の版を上げることでしか削除できない。Rule #4a: GA の API 版はメジャー版の中で削除しない。Beta の API 版は導入から 9か月または3マイナーリリースのうち長い方の期間内に deprecated にし、その後 9か月または3リリースのうち長い方の期間を経て提供を止める。Alpha は予告なしに削除できる。Rule #4b: preferred version と storage version は、新旧両方の版を支援するリリースを出すまで進めない（rollback を保証するため）。Rule #5a: 利用者向け CLI の GA 要素は、廃止告知後 12か月または2リリースのうち長い方の期間、動作させる。Rule #7: 挙動の廃止は、告知後1年以上動作させる。[V][^66]
- 原文: "GA API versions may be marked as deprecated, but must not be removed within a major version of Kubernetes"

**RS-11#77** Microsoft の公式文書は、Azure AD Graph の退役の経緯を次のように記す。2019年に deprecation を告知し、退役日を 2023-06-30 と設定した。2023-06-30 に3年の告知期間が終わり、退役サイクルに入った。2024-08-31 以降は、新規アプリが明示的に opt-in しないと使えなくなった。2025-02-01 からは、既存アプリも含めて opt-in が必要になった。2025-08-31 に extended access が終わり、完全に退役する（同ページの記述は「will be fully retired」という予定形で、退役の実施そのものは確認していない）。[V][^67]（Microsoft Learn、ms.date 2025-09-29、2026-10-03 確認）

## 4. 標準・文書ステータス表

確認日はすべて 2026-10-03。状態の表記: final（確定）／ipd（Initial Public Draft）／I-D（Internet-Draft。括弧内は IETF 内の段階）／RFC。I-D の「公表日」はその版（rev）の提出日で、Datatracker の「最終更新」（状態変更などの日付）とは区別して併記した。

| 名称 | 版 | 状態 | 公表日 | 確認日 | URL |
|---|---|---|---|---|---|
| FIPS 203 ML-KEM | — | final（errata・改訂予告あり） | 2024-08-13 | 2026-10-03 | https://csrc.nist.gov/pubs/fips/203/final |
| FIPS 204 ML-DSA | — | final（errata あり） | 2024-08-13 | 2026-10-03 | https://csrc.nist.gov/pubs/fips/204/final |
| FIPS 205 SLH-DSA | — | final | 2024-08-13 | 2026-10-03 | https://csrc.nist.gov/pubs/fips/205/final |
| FIPS 206 FN-DSA | — | 未公表（CSRC に ipd・final とも掲載なし） | — | 2026-10-03 | https://csrc.nist.gov/publications/fips |
| NIST SP 800-227 | — | final | 2025-09-18 | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/227/final |
| NIST IR 8547 | ipd | ipd（意見募集 2025-01-10 締切、final 未公表） | 2024-11-12 | 2026-10-03 | https://csrc.nist.gov/pubs/ir/8547/ipd |
| NIST SP 800-131A | Rev.2 | final（現行） | 2019-03-21 | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/131/a/r2/final |
| NIST SP 800-131A | Rev.3 | ipd（意見募集 2024-12-04 締切、final 未公表） | 2024-10-21 | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/131/a/r3/ipd |
| NIST CSWP 39 | upd1 | final（初版 2025-12-19 を置換） | 2026-06-29 | 2026-10-03 | https://csrc.nist.gov/pubs/cswp/39/upd1/considerations-for-achieving-crypto-agility/final |
| EO 14412 | — | 署名・官報掲載済（91 FR 38483） | 2026-06-22（官報 2026-06-25） | 2026-10-03 | https://www.whitehouse.gov/wp-content/uploads/2026/06/eo-14412.pdf |
| OMB M-26-15 | — | 発出済（NSS 適用外） | 2026-06-24 | 2026-10-03 | https://www.whitehouse.gov/wp-content/uploads/2026/06/M-26-15-Execution-of-the-Migration-to-Post-Quantum-Cryptography.pdf |
| NSA CNSA 2.0 CSA | Ver.1.0 | 公表済（NSS 向け） | 2022-09 | 2026-10-03 | https://media.defense.gov/2025/May/30/2003728741/-1/-1/0/CSA_CNSA_2.0_ALGORITHMS.PDF |
| NSA CNSA 2.0 FAQ | Ver.2.1 | 公表済（NSS 向け） | 2024-12 | 2026-10-03 | https://media.defense.gov/2022/Sep/07/2003071836/-1/-1/1/CSI_CNSA_2.0_FAQ_.PDF |
| CISA PQC Product Categories | — | 公表済（随時更新） | 2026-01-23 | 2026-10-03 | https://www.cisa.gov/resources-tools/resources/product-categories-technologies-use-post-quantum-cryptography-standards |
| 欧州委員会勧告 (EU) 2024/1101 | — | 採択済（勧告、拘束力なし） | 2024-04-11 | 2026-10-03 | https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202401101 |
| EU PQC Coordinated Implementation Roadmap | Part 1 v1.1 | 公表済 | 2025-06-11（掲載 2025-06-23） | 2026-10-03 | https://digital-strategy.ec.europa.eu/en/library/coordinated-implementation-roadmap-transition-post-quantum-cryptography |
| UK NCSC PQC migration timelines | Version 1.0 | 公表済 | 2025-03-20（Reviewed 2025-03-20。メタデータ dateModified 2026-08-03） | 2026-10-03 | https://www.ncsc.gov.uk/guidance/pqc-migration-timelines |
| 内閣官房 PQC 移行 中間とりまとめ | — | 公表済（工程表は2026年度策定予定・未掲載） | 令和7年11月 | 2026-10-03 | https://www.cas.go.jp/jp/seisaku/pqc/pdf/report_202511.pdf |
| RFC 7696（BCP 201） | — | RFC（BCP） | 2015-11 | 2026-10-03 | https://www.rfc-editor.org/info/rfc7696 |
| RFC 9864 Fully-Specified Algorithms | — | RFC（Standards Track） | 2025-10 | 2026-10-03 | https://www.rfc-editor.org/info/rfc9864 |
| RFC 9964 ML-DSA for JOSE/COSE | — | RFC（Standards Track） | 2026-05 | 2026-10-03 | https://www.rfc-editor.org/info/rfc9964 |
| draft-ietf-jose-pq-composite-sigs | -04 | I-D（WG Document／I-D Exists） | 2026-09-11 | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-jose-pq-composite-sigs/ |
| draft-ietf-cose-sphincs-plus | -10 | I-D（AD Evaluation） | 2026-07-28（Datatracker 最終更新 2026-08-24） | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-cose-sphincs-plus/ |
| RFC 9881 ML-DSA in X.509 | — | RFC（Standards Track） | 2025-10 | 2026-10-03 | https://www.rfc-editor.org/info/rfc9881 |
| RFC 9909 SLH-DSA in X.509 | — | RFC（Standards Track） | 2025-12 | 2026-10-03 | https://www.rfc-editor.org/info/rfc9909 |
| draft-ietf-lamps-pq-composite-sigs | -19 | I-D（RFC Editor Queue） | 2026-04-21（Datatracker 最終更新 2026-10-02） | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-lamps-pq-composite-sigs/ |
| RFC 9954 Hybrid Key Exchange in TLS 1.3 | — | RFC（Informational） | 2026-07 | 2026-10-03 | https://www.rfc-editor.org/info/rfc9954 |
| RFC 10024 PQ/T Hybrid KA for TLS 1.3 | — | RFC（Standards Track） | 2026-08 | 2026-10-03 | https://www.rfc-editor.org/info/rfc10024 |
| RFC 9847 IANA Registry Updates for TLS and DTLS（'D'=discouraged の定義） | — | RFC（Standards Track） | 2025-12 | 2026-10-03 | https://www.rfc-editor.org/info/rfc9847 |
| draft-ietf-tls-mlkem | -11 | I-D（RFC Editor Queue、Informational 予定） | 2026-09-17（Datatracker 最終更新 2026-09-24） | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-tls-mlkem/ |
| draft-ietf-tls-mldsa | -06 | I-D（RFC Editor Queue、Informational 予定） | 2026-09-11（Datatracker 最終更新 2026-09-29） | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-tls-mldsa/ |
| RFC 9958 PQC for Engineers | — | RFC（Informational） | 2026-06 | 2026-10-03 | https://www.rfc-editor.org/info/rfc9958 |
| RFC 8725 JWT BCP（BCP 225） | — | RFC（BCP） | 2020-02 | 2026-10-03 | https://www.rfc-editor.org/info/rfc8725 |
| draft-ietf-oauth-rfc8725bis | -10 | I-D（RFC Editor Queue、BCP 予定） | 2026-08-21（Datatracker 最終更新 2026-08-31） | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-oauth-rfc8725bis/ |
| RFC 9068 JWT Access Token Profile | — | RFC（Standards Track） | 2021-10 | 2026-10-03 | https://www.rfc-editor.org/info/rfc9068 |
| OpenID Connect Core 1.0 | errata set 2 | final | 2023-12-15（初版 2014-02-25） | 2026-10-03 | https://openid.net/specs/openid-connect-core-1_0.html |
| OpenID Connect Discovery 1.0 | errata set 2 | final | 2023-12-15 | 2026-10-03 | https://openid.net/specs/openid-connect-discovery-1_0.html |
| RFC 6265 Cookies | — | RFC（Standards Track） | 2011-04 | 2026-10-03 | https://www.rfc-editor.org/info/rfc6265 |
| draft-ietf-httpbis-rfc6265bis | -22 | I-D（RFC Editor Queue） | 2025-12-01（Datatracker 最終更新 2026-08-13） | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-httpbis-rfc6265bis/ |
| RFC 9449 DPoP | — | RFC（Standards Track） | 2023-09 | 2026-10-03 | https://www.rfc-editor.org/info/rfc9449 |
| RFC 9700 OAuth 2.0 Security BCP（BCP 240） | — | RFC（BCP） | 2025-01 | 2026-10-03 | https://www.rfc-editor.org/info/rfc9700 |
| RFC 8996 TLS 1.0/1.1 廃止（BCP 195） | — | RFC（BCP） | 2021-03 | 2026-10-03 | https://www.rfc-editor.org/info/rfc8996 |
| RFC 9155 MD5/SHA-1 in TLS 1.2 廃止 | — | RFC（Standards Track） | 2021-12 | 2026-10-03 | https://www.rfc-editor.org/info/rfc9155 |
| SAML V2.0 Core | — | OASIS Standard | 2005-03-15 | 2026-10-03 | https://docs.oasis-open.org/security/saml/v2.0/saml-core-2.0-os.pdf |
| Kubernetes Deprecation Policy | — | 公式方針（随時更新） | 2026-08-21 更新 | 2026-10-03 | https://kubernetes.io/docs/reference/using-api/deprecation-policy/ |

## 5. 設計への含意と PoC で実測すべきこと

### 5.1 ADR・設計文書への入力

ADR 番号は seed-02 の A01〜A19 を ADR-001〜ADR-019 と読み替えた。DL 番号は seed-01 の D01〜D34 を DL-01〜DL-34 と読み替えた。

| 入力先 | 入力する内容 | 根拠 |
|---|---|---|
| ADR-015 crypto agility と PQC 移行 | 移行順序を、TLS 鍵交換（RFC 10024 の X25519MLKEM768）を先行させ、内部 token 署名、外部 federation 署名の順に進める。期限の目安は、2030（112-bit を deprecated とし、EU の high-risk の期限）、2031（米国 HVA の署名期限）、2035（量子脆弱な方式を disallow、英国・EU・日本の目標）とする。hybrid の方針は、鍵交換では採用し、署名では composite JOSE の RFC 化まで保留する。再検討トリガーは、IR 8547 final、SP 800-131A Rev.3 final、FIPS 206、composite JOSE の RFC 化、日本の工程表の公表とする。[D] | RS-11#8, #13, #17, #31, #33, #34, #44, #47 |
| ADR-005 token profile | (1) alg は fully-specified の IANA 識別子だけを使う。(2) 鍵ごとに alg を1つに固定し、AKP 鍵では alg を必須にする。(3) 外部 RP 向けの ID Token は RS256 を残し、鍵長は 3072 bit 以上とする（OIDC と RFC 9068 の MTI）。(4) ブラウザ経路は BFF/セッション参照型とし、PQ 署名の JWT を cookie に入れない。(5) サーバ間 JWT の初期 PQ 候補は ML-DSA-44 とし、サイズ上限を token profile の版ごとに明記する。[D] | RS-11#41, #43, #51, #53, #54, #56, #62, #63 |
| ADR-007 鍵階層と KMS/HSM | クラウドごとに PQ 署名の対応状況が違う（AWS は ML-DSA の鍵仕様あり。ただし保護レベルと FIPS 140-3 の検証範囲は未確認。GCP は software のみ。Azure は公式文書に記載なし）ことを前提に、どの鍵を HSM 保護必須にするかを決める。KMS の4096 byte 上限と EXTERNAL_MU 経路を issuer の実装要件に入れる。KMS/HSM が ECC と PQC の両方の鍵を扱えることを調達要件に入れる。[D] | RS-11#22, #64〜#67 |
| ADR-016 versioning と deprecation | deprecation SLA を安定度の段階ごとに定める。値は仮置きで、組織決定（区分 B）が必要である。例: GA 契約（token profile のメジャー版、discovery、JWKS 構造）はメジャー版の中で削除せず、廃止告知から最短 24か月とする。Beta は告知から 9か月以上とする。暗号 alg は、規制期限から逆算した停止日を告知に含める。延長の判断基準（未移行 consumer の割合など）と、計測の手段（RP ごとの alg と版の利用テレメトリ）も定める。[D] | RS-11#39, #76, #77 |
| ADR-018 出口戦略 | KMS の PQ 対応がクラウドごとに違うため、署名鍵の生成場所と、移植できる形式（RFC 9964 の seed 形式）を出口戦略に含める。draft 段階の codepoint（composite JOSE など）に依存しないことを、ベンダー選定の評価項目にする。[D] | RS-11#41, #48, #64〜#67 |
| ADR-004 B2B federation | SAML は顧客 IdP との互換のために残すが、検証は隔離した adapter で行い、内部では OIDC/内部 token に変換する。adapter の XML 署名ライブラリは CVE の追跡対象として最優先にする。[D] | RS-11#73〜#75 |
| ADR-009 workload identity | mesh の mTLS は RFC 10024 の hybrid 群から始める。ML-DSA の証明書（RFC 9881）は、TLS の ML-DSA 認証（draft-ietf-tls-mldsa）の RFC 化を待って評価する。[D] | RS-11#46, #47, #50 |
| ADR-013 cell・fail-mode／gateway | gateway、LB、proxy のヘッダ上限（nginx 8k、ALB 16K/64K）と HPACK の初期値を、PQ 移行の前提条件として台帳に載せる。cell 間の経路にある全ての中継機器のヘッダ上限を棚卸しする。[D] | RS-11#58〜#60, #63 |
| DL-23 進化・互換方針 | 「入れ替わる前提のもの」は、署名と鍵交換のアルゴリズム、JOSE/COSE の alg 値、TLS の群、プロトコルの版（OAuth/OIDC/SAML）、ライブラリである。「保つべきもの」は、issuer URL、sub/tid、kid の命名規則（alg を含めない）、token の claim の意味、監査イベントのスキーマ、境界原則である。不可逆識別子に alg 名や製品名を含めないことを規則にする。[D] | RS-11#40, #43, #48, #68 |
| DL-14 鍵管理・ceremony | 長寿命の root と署名鍵（PKI root、SAML 署名鍵、firmware 署名鍵）は、移行に長い時間がかかる（CA の署名は数十年使われる、3DES から AES まで23年）。このため、署名の PQ 化は長寿命の鍵から計画する。[D] | RS-11#16, #25, #32 |
| 調達要件（RFP） | 米国連邦の調達（FAR 改正案、2030 の期限）と CISA の分類（ICAM ソフトウェアと HSM は transitioning）を踏まえ、IdP、federation、HSM 製品に PQC の roadmap と crypto agility（alg を外部設定にすること、KMS の agility）を要求項目として入れる。[D] | RS-11#18, #22, #28 |

### 5.2 PoC で実測すべきこと

TC-ID は 12_poc で採番する（本ノートでは未採番）。

| # | 測るもの | 合否判定に使う観点（案） | 根拠 |
|---|---|---|---|
| P-1 | 実ブラウザ（主要3系統）、CDN、ALB、nginx/Envoy、service mesh を通したときの、ML-DSA-44/65/87 の JWT と DPoP proof の到達可否とエラーの種類 | 経路上で 4xx や切り捨てが 0 件であること。不可の場合は、その経路の token 方式を変える | RS-11#56〜#63 |
| P-2 | ML-DSA の署名と検証の遅延（KMS 経由とローカル、p50/p99/p99.9）と、KMS の quota 内での最大の署名 QPS | issuer の SLO（07_slo で定義）を満たすこと | RS-11#64〜#66 |
| P-3 | 利用側を改修せずに alg を切り替える演習。JWKS に ML-DSA 鍵を事前に公開し、署名を切り替え、旧鍵を撤去したときに、RP 側でコード変更が 0 件であること。切替にかかった時間も測る | RP のコード変更 0 件。切替時間と、JWKS キャッシュの最大齢との関係 | RS-11#51, #52, #41 |
| P-4 | downgrade 耐性。issuer×token 種別の許容 alg 集合の外にある alg（RS256 への戻しを含む）が拒否されること | 負例を 100% 拒否すること | RS-11#38, #51 |
| P-5 | TLS hybrid（X25519MLKEM768）の handshake 遅延、ClientHello が分割されたときの middlebox の互換性、mesh の CPU 増分 | 接続失敗率と遅延の増分を記録し、ADR-015 に入力する | RS-11#47, #49 |
| P-6 | RP 側ライブラリ（社内 SDK と主要言語の JOSE ライブラリ）の ML-DSA（RFC 9964）対応状況の棚卸し（CBOM） | 未対応ライブラリの数を KRI にする | RS-11#21, #41 |
| P-7 | JWKS のサイズとキャッシュの挙動（ML-DSA-87 の鍵を複数並行で公開した場合） | JWKS の取得失敗率と、取得にかかる時間 | RS-11#3, #52 |
| P-8 | HTTP/2 で PQ の Authorization ヘッダを使ったときの帯域増分（HPACK の圧縮が効かない影響） | 1要求あたりの増分 byte とコスト試算 | RS-11#58, #63 |

## 6. 調査の限界と未確認事項

1. FIPS 206（FN-DSA）の ipd が公表されたかどうかは、CSRC の FIPS 一覧とキーワード検索で見つからないことしか確かめられていない。NIST の公告や Federal Register は網羅的に確認していない。報道などの二次情報が述べる「2026年後半から2027年初めに final」は未確認であり、結論には使っていない。
2. NIST IR 8547 と SP 800-131A Rev.3 は ipd のままである。2030 と 2035 の日付は確定値ではない。OMB M-26-15 は「IR 8547 or successor document」への整合を求めているため、final 版で日付が変われば米国連邦の要件も変わり得る。
3. EO 14412 §6(c) の FAR 改正案（180日以内、2026年12月頃）が出たかどうかと、その内容は未確認である。covered contractor の範囲が当社の顧客や当社自身に及ぶかどうかは、法務の判断（区分 B）が要る。
4. CNSA 2.0 の CSA は、media.defense.gov への直接アクセスが 403 になったため、Tavily の抽出テキストで確認した。期限の記述は確認できたが、図（Figure 1）とアルゴリズムの表の全体は目視していない。独立検証（2026-10-03）でも CSA と FAQ（Ver.2.1）の両方が直接取得では 403 となり、Tavily で原典 PDF の全文テキストを抽出して照合した。
5. EU については、勧告とロードマップの Part 1 だけを確認した。各加盟国のロードマップ、NIS2 の評価に crypto agility を組み込む具体策、英国以外の EU 外の国（豪州・カナダなど）は確認していない。
6. 日本: 内閣官房の工程表は未公表である（2026年度に策定予定）。金融庁の PQC 関連文書と FISC 安全対策基準の PQC 関連の改訂（seed-01 は「第14版 2026-03、PQC 追加」と記載）は、本ストリームでは原典を確認しておらず、未確認である。業界規制を持つ顧客への影響は、規制担当のストリームで確認する必要がある。
7. KMS: AWS KMS の ML-DSA については、FIPS 140-3 の検証範囲、対応リージョン、料金、quota を確認していない。Google Cloud KMS で PQ 署名の HSM 保護レベルを提供する予定があるか、Azure の PQ 署名の preview や roadmap があるかも未確認である（公式文書に記載がないことだけを確認した）。オンプレミス HSM ベンダーは調べていない。
8. OpenID Foundation が RS256 の MTI を見直す予定があるか、FAPI 2.0 の PQ 対応があるかは確認できていない。OIDF conformance test が ML-DSA に対応しているかも未確認である。
9. composite JOSE（draft-ietf-jose-pq-composite-sigs）は WG 段階にあり、alg 名、署名の符号化、鍵の表現は変わり得る。本ノートでは、その詳細仕様を評価していない。
10. §3.5 のサイズは計算値で、実測していない（payload 376 byte の仮定に依存する）。ブラウザの実装上の cookie 上限、CDN の上限、Envoy や Istio の既定値は、本ストリームでは公式文書を確認していない（PoC の P-1 で確認する）。
11. ML-DSA の性能（署名と検証の遅延、CPU）、FN-DSA の実装上の注意（浮動小数点を使うサンプリングなど）は、本ノートの範囲外である。
12. WebAuthn/passkey の PQ 化（COSE の -48〜-50 を認証器が支援するか）、VC/SD-JWT の PQ 化は、他のストリームで扱う。
13. seed との差分: seed-02 9-2 は IR 8547 ipd を「2030年 112-bit 非推奨、2035年使用不可」と要約していた。原典では、128-bit 以上（P-256 や RSA-3072 など）も deprecated の段階を経ずに「Disallowed after 2035」と規定されている（RS-11#8）。seed-02 の「OMB M-26-15【確:要再検証】」「RFC 9964」「RFC 10024」は原典で存在と内容を確認した。CSWP 39 は初版が 2026-06-29 に upd1 で置き換えられている。
14. 本ノートの [N] には、政府機関の方針文書（EO、OMB、NSA、CISA、EU 勧告とロードマップ、NCSC、内閣官房）も含めた。これらは、法的拘束力のある規則（EO の対象機関、OMB の対象機関）、NSS に限った要件（CNSA 2.0）、拘束力のない勧告や指針（EU、NCSC、内閣官房、CISA）が混在している。当社のような民間の共通基盤に直接拘束力を持つものは、本調査の範囲では確認されていない。間接的な適用（顧客との契約、調達、業界規制）の有無は、組織決定と法務確認（区分 B）による。
15. 独立検証（2026-10-03、作成者以外）で次を修正した。(a) I-D 5件（cose-sphincs-plus-10、tls-mlkem-11、tls-mldsa-06、oauth-rfc8725bis-10、httpbis-rfc6265bis-22）の日付は、版の提出日ではなく Datatracker の最終更新日を記していたため、版の提出日に改め、最終更新日を併記した。特に rfc6265bis-22 は 2025-12-01 提出で、2026-08-13 は最終更新日である。(b) TLS registry の 'D' を「deprecated」と書いていたが、RFC 9847 の定義は「discouraged」である。(c) 英国 NCSC の「2026-08-03 更新」はページのメタデータの日付で、版は 1.0 のままである。(d) nginx の 8k 上限は HTTP/2・HTTP/3 では圧縮後のサイズに適用される。(e) Azure AD Graph の 2025-08-31 完全退役は、原典では予定形の記述である。詳細は research/verification/RS-11-verification.md を参照。

## 参考文献

[^1]: NIST『FIPS 203 Module-Lattice-Based Key-Encapsulation Mechanism Standard』Final, 2024-08-13. https://csrc.nist.gov/pubs/fips/203/final （参照箇所: 書誌ページ・Planning Note 2025-11-17、確認日: 2026-10-03）
[^2]: NIST『FIPS 204 Module-Lattice-Based Digital Signature Standard』Final, 2024-08-13. https://csrc.nist.gov/pubs/fips/204/final （参照箇所: 書誌ページ・Planning Note 2026-07-31、本文 §4 Table 2、確認日: 2026-10-03）
[^3]: NIST『FIPS 205 Stateless Hash-Based Digital Signature Standard』Final, 2024-08-13. https://csrc.nist.gov/pubs/fips/205/final （参照箇所: 書誌ページ、本文 Table 2、確認日: 2026-10-03）
[^4]: NIST (R. Perlner)『FIPS 206 Status Update』発表資料, 2025. https://csrc.nist.gov/csrc/media/presentations/2025/fips-206-fn-dsa-%28falcon%29/images-media/fips_206-perlner_2.1.pdf （参照箇所: p.2 "Where FIPS 206 (FN-DSA) stands"、確認日: 2026-10-03）
[^5]: NIST CSRC『Publications（FIPS 一覧・検索結果）』2026-10-03 取得. https://csrc.nist.gov/publications/fips （参照箇所: FIPS 一覧 13件・"FN-DSA" と "8547" の検索結果、確認日: 2026-10-03）
[^6]: NIST『SP 800-227 Recommendations for Key-Encapsulation Mechanisms』Final, 2025-09-18. https://csrc.nist.gov/pubs/sp/800/227/final （参照箇所: 書誌ページ、確認日: 2026-10-03）
[^7]: NIST『IR 8547 ipd Transition to Post-Quantum Cryptography Standards』Initial Public Draft, 2024-11-12. https://csrc.nist.gov/pubs/ir/8547/ipd （参照箇所: §3.2, §3.2.2, §4.1.1 Table 2, §4.1.2 Table 4、確認日: 2026-10-03）
[^8]: NIST『SP 800-131A Rev.2 Transitioning the Use of Cryptographic Algorithms and Key Lengths』Final, 2019-03-21. https://csrc.nist.gov/pubs/sp/800/131/a/r2/final （参照箇所: 書誌ページ・Document History、確認日: 2026-10-03）
[^9]: NIST『SP 800-131A Rev.3 ipd Transitioning the Use of Cryptographic Algorithms and Key Lengths』Initial Public Draft, 2024-10-21. https://csrc.nist.gov/pubs/sp/800/131/a/r3/ipd （参照箇所: §1.2.3, §11、確認日: 2026-10-03）
[^10]: NIST『CSWP 39upd1 Considerations for Achieving Crypto Agility: Strategies and Practices』Final, 2026-06-29. https://csrc.nist.gov/pubs/cswp/39/upd1/considerations-for-achieving-crypto-agility/final （参照箇所: Abstract, §2.1, §3.2.1, §3.2.2、確認日: 2026-10-03）
[^11]: NIST『NIST Retires SHA-1 Cryptographic Algorithm』News, 2022-12-15. https://www.nist.gov/news-events/news/2022/12/nist-retires-sha-1-cryptographic-algorithm （参照箇所: 本文、確認日: 2026-10-03）
[^12]: The President『Executive Order 14412 Securing the Nation Against Advanced Cryptographic Attacks』2026-06-22（Federal Register Vol.91 No.121, pp.38483–38486, 2026-06-25）. https://www.whitehouse.gov/wp-content/uploads/2026/06/eo-14412.pdf （参照箇所: Sec.4(b)(c), Sec.5(d), Sec.6(c)、確認日: 2026-10-03）
[^13]: OMB『M-26-15 Execution of the Migration to Post-Quantum Cryptography』2026-06-24. https://www.whitehouse.gov/wp-content/uploads/2026/06/M-26-15-Execution-of-the-Migration-to-Post-Quantum-Cryptography.pdf （参照箇所: §1, §3.A, §3.B, §3.D, Appendix A §3, §4, §5, §7、確認日: 2026-10-03）
[^14]: NSA『Announcing the Commercial National Security Algorithm Suite 2.0』CSA Ver.1.0, 2022-09（PP-22-1338）. https://media.defense.gov/2025/May/30/2003728741/-1/-1/0/CSA_CNSA_2.0_ALGORITHMS.PDF （参照箇所: p.6–7 "Timing for software signing and firmware signing" / "Other requirements for NSS"、確認日: 2026-10-03）
[^15]: NSA『The Commercial National Security Algorithm Suite 2.0 and Quantum Computing FAQ』CSI Ver.2.1, 2024-12（U/OO/194427-22）. https://media.defense.gov/2022/Sep/07/2003071836/-1/-1/1/CSI_CNSA_2.0_FAQ_.PDF （参照箇所: p.3 CNSA 2.0 表, p.9 HashML-DSA, p.11–13 Timeframe, p.19–20 Hybrids、確認日: 2026-10-03）
[^16]: CISA『Product Categories for Technologies That Use Post-Quantum Cryptography Standards』2026-01-23. https://www.cisa.gov/resources-tools/resources/product-categories-technologies-use-post-quantum-cryptography-standards （参照箇所: Table 2 と注記, Table 3、確認日: 2026-10-03）
[^17]: European Commission『Commission Recommendation (EU) 2024/1101 of 11 April 2024 on a Coordinated Implementation Roadmap for the transition to Post-Quantum Cryptography』OJ L, 2024-04-12. https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202401101 （参照箇所: 前文 (6)(7)、本文第2節（ロードマップは勧告公表の2年後までに利用可能とする）、確認日: 2026-10-03）
[^18]: EU PQC Workstream (NIS Cooperation Group)『A Coordinated Implementation Roadmap for the Transition to Post-Quantum Cryptography』Part 1 v1.1, 2025-06-11. https://ec.europa.eu/newsroom/dae/redirection/document/117507 （参照箇所: §1, §4.1, §4.2、確認日: 2026-10-03）
[^19]: UK NCSC『Timelines for migration to post-quantum cryptography』Version 1.0, 2025-03-20（Reviewed 2025-03-20、ページのメタデータ dateModified 2026-08-03）. https://www.ncsc.gov.uk/guidance/pqc-migration-timelines （参照箇所: "The key milestones are"、確認日: 2026-10-03）
[^20]: 内閣官房（政府機関等における耐量子計算機暗号（PQC）利用に関する関係府省庁連絡会議）『政府機関等における耐量子計算機暗号（PQC）への移行について（中間とりまとめ）』令和7年11月. https://www.cas.go.jp/jp/seisaku/pqc/pdf/report_202511.pdf （参照箇所: 3.(1) 移行期限（RSA 等で20年ほど）、4.(1) 工程表の方向性、5. その他、確認日: 2026-10-03）
[^21]: 内閣官房『政府機関等における耐量子計算機暗号（PQC）利用に関する関係府省庁連絡会議』Webページ. https://www.cas.go.jp/jp/seisaku/pqc/index.html （参照箇所: 「とりまとめ等」「開催状況」欄、確認日: 2026-10-03）
[^22]: R. Housley『RFC 7696 Guidelines for Cryptographic Algorithm Agility and Selecting Mandatory-to-Implement Algorithms』BCP 201, 2015-11. https://www.rfc-editor.org/rfc/rfc7696 （参照箇所: §2.1, §2.2, §2.4, §3.1, §3.3, §4, §5、確認日: 2026-10-03）
[^23]: M.B. Jones, O. Steele『RFC 9864 Fully-Specified Algorithms for JOSE and COSE』Standards Track, 2025-10. https://www.rfc-editor.org/rfc/rfc9864 （参照箇所: Abstract, §4.1.2, §4.2.2, §4.4、確認日: 2026-10-03）
[^24]: M. Prorock, O. Steele『RFC 9964 ML-DSA for JSON Object Signing and Encryption (JOSE) and CBOR Object Signing and Encryption (COSE)』Standards Track, 2026-05. https://www.rfc-editor.org/rfc/rfc9964 （参照箇所: §3, §4, §5 Table 1, §7.2, §8.1、確認日: 2026-10-03）
[^25]: IETF JOSE WG『PQ/T Hybrid Composite Signatures for JOSE and COSE』draft-ietf-jose-pq-composite-sigs-04, 2026-09-11. https://datatracker.ietf.org/doc/draft-ietf-jose-pq-composite-sigs/ （参照箇所: Datatracker の状態欄・Abstract、確認日: 2026-10-03）
[^26]: IETF COSE WG『SLH-DSA for JOSE and COSE』draft-ietf-cose-sphincs-plus-10, 2026-07-28（Datatracker 最終更新 2026-08-24）. https://datatracker.ietf.org/doc/draft-ietf-cose-sphincs-plus/ （参照箇所: Datatracker の IESG 状態欄・版履歴、確認日: 2026-10-03）
[^27]: J. Massimo ほか『RFC 9881 Internet X.509 Public Key Infrastructure -- Algorithm Identifiers for the Module-Lattice-Based Digital Signature Algorithm (ML-DSA)』Standards Track, 2025-10. https://www.rfc-editor.org/rfc/rfc9881 （参照箇所: 書誌情報、確認日: 2026-10-03）
[^28]: K. Bashiri ほか『RFC 9909 Internet X.509 Public Key Infrastructure -- Algorithm Identifiers for the Stateless Hash-Based Digital Signature Algorithm (SLH-DSA)』Standards Track, 2025-12. https://www.rfc-editor.org/rfc/rfc9909 （参照箇所: 書誌情報、確認日: 2026-10-03）
[^29]: IETF LAMPS WG『Composite Module-Lattice-Based Digital Signature Algorithm (ML-DSA) for use in X.509 Public Key Infrastructure』draft-ietf-lamps-pq-composite-sigs-19, 2026-04-21（Datatracker 最終更新 2026-10-02）. https://datatracker.ietf.org/doc/draft-ietf-lamps-pq-composite-sigs/ （参照箇所: Datatracker の IESG・RFC Editor 状態欄、確認日: 2026-10-03）
[^30]: D. Stebila, S. Fluhrer, S. Gueron『RFC 9954 Hybrid Key Exchange in TLS 1.3』Informational, 2026-07. https://www.rfc-editor.org/rfc/rfc9954 （参照箇所: §3.3, §4、確認日: 2026-10-03）
[^31]: K. Kwiatkowski ほか『RFC 10024 Post-Quantum Traditional (PQ/T) Hybrid Key Agreement Mechanisms for TLS 1.3』Standards Track, 2026-08. https://www.rfc-editor.org/rfc/rfc10024 （参照箇所: §4.1, §4.2, §7.1–7.4、確認日: 2026-10-03）
[^32]: IETF TLS WG『ML-KEM Post-Quantum Key Agreement for TLS 1.3』draft-ietf-tls-mlkem-11, 2026-09-17（Datatracker 最終更新 2026-09-24）. https://datatracker.ietf.org/doc/draft-ietf-tls-mlkem/ （参照箇所: Datatracker の状態欄・版履歴、確認日: 2026-10-03）
[^33]: IETF TLS WG『Use of ML-DSA in TLS 1.3』draft-ietf-tls-mldsa-06, 2026-09-11（Datatracker 最終更新 2026-09-29）. https://datatracker.ietf.org/doc/draft-ietf-tls-mldsa/ （参照箇所: Datatracker の状態欄・版履歴、確認日: 2026-10-03）
[^34]: Y. Sheffer, D. Hardt, M. Jones『RFC 8725 JSON Web Token Best Current Practices』BCP 225, 2020-02. https://www.rfc-editor.org/rfc/rfc8725 （参照箇所: §2.1, §3.1, §3.11、確認日: 2026-10-03）
[^35]: IETF OAuth WG『JSON Web Token Best Current Practices（RFC 8725 改訂版）』draft-ietf-oauth-rfc8725bis-10, 2026-08-21（Datatracker 最終更新 2026-08-31）. https://datatracker.ietf.org/doc/draft-ietf-oauth-rfc8725bis/ （参照箇所: Datatracker の状態欄・版履歴、確認日: 2026-10-03）
[^36]: M. Jones, J. Bradley, N. Sakimura『RFC 7515 JSON Web Signature (JWS)』Standards Track, 2015-05. https://www.rfc-editor.org/rfc/rfc7515 （参照箇所: §1, §4.1.1, §7.2.1、確認日: 2026-10-03）
[^37]: M. Jones『RFC 7517 JSON Web Key (JWK)』Standards Track, 2015-05. https://www.rfc-editor.org/rfc/rfc7517 （参照箇所: §4.5、確認日: 2026-10-03）
[^38]: V. Bertocci『RFC 9068 JSON Web Token (JWT) Profile for OAuth 2.0 Access Tokens』Standards Track, 2021-10. https://www.rfc-editor.org/rfc/rfc9068 （参照箇所: §2.1、確認日: 2026-10-03）
[^39]: OpenID Foundation『OpenID Connect Core 1.0 incorporating errata set 2』Final, 2023-12-15. https://openid.net/specs/openid-connect-core-1_0.html （参照箇所: §15.1 "Signing ID Tokens with RSA SHA-256"、確認日: 2026-10-03）
[^40]: OpenID Foundation『OpenID Connect Discovery 1.0 incorporating errata set 2』Final, 2023-12-15. https://openid.net/specs/openid-connect-discovery-1_0.html （参照箇所: §3 id_token_signing_alg_values_supported、確認日: 2026-10-03）
[^41]: A. Barth『RFC 6265 HTTP State Management Mechanism』Standards Track, 2011-04. https://www.rfc-editor.org/rfc/rfc6265 （参照箇所: §6.1、確認日: 2026-10-03）
[^42]: IETF HTTPBIS WG『Cookies: HTTP State Management Mechanism』draft-ietf-httpbis-rfc6265bis-22, 2025-12-01（RFC Editor Queue。Datatracker 最終更新 2026-08-13）. https://datatracker.ietf.org/doc/draft-ietf-httpbis-rfc6265bis/ （参照箇所: §5.6 手順5, §5.7 手順4, §6.1、確認日: 2026-10-03）
[^43]: R. Fielding, M. Nottingham, J. Reschke『RFC 9110 HTTP Semantics』STD 97, 2022-06. https://www.rfc-editor.org/rfc/rfc9110 （参照箇所: §5.4、確認日: 2026-10-03）
[^44]: M. Thomson, C. Benfield『RFC 9113 HTTP/2』Standards Track, 2022-06. https://www.rfc-editor.org/rfc/rfc9113 （参照箇所: §6.5.2 SETTINGS_HEADER_TABLE_SIZE、確認日: 2026-10-03）
[^45]: R. Peon, H. Ruellan『RFC 7541 HPACK: Header Compression for HTTP/2』Standards Track, 2015-05. https://www.rfc-editor.org/rfc/rfc7541 （参照箇所: §4.1, §4.4、確認日: 2026-10-03）
[^46]: D. Fett ほか『RFC 9449 OAuth 2.0 Demonstrating Proof of Possession (DPoP)』Standards Track, 2023-09. https://www.rfc-editor.org/rfc/rfc9449 （参照箇所: §4.2、確認日: 2026-10-03）
[^47]: NGINX『Module ngx_http_core_module: large_client_header_buffers』公式文書. https://nginx.org/en/docs/http/ngx_http_core_module.html#large_client_header_buffers （参照箇所: Default と本文（HTTP/2・HTTP/3 では HPACK/QPACK 圧縮後のサイズに適用する旨を含む）、確認日: 2026-10-03）
[^48]: AWS『Quotas for your Application Load Balancers』Elastic Load Balancing User Guide. https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-limits.html （参照箇所: HTTP headers、確認日: 2026-10-03）
[^49]: AWS『Key spec reference』AWS KMS Developer Guide. https://docs.aws.amazon.com/kms/latest/developerguide/symm-asymm-choose-key-spec.html （参照箇所: ML-DSA key specs、確認日: 2026-10-03）
[^50]: AWS『Sign』AWS KMS API Reference. https://docs.aws.amazon.com/kms/latest/APIReference/API_Sign.html （参照箇所: Message, MessageType, SigningAlgorithm、確認日: 2026-10-03）
[^51]: Google Cloud『Key purposes and algorithms』Cloud KMS documentation（Last updated 2026-09-30 UTC）. https://docs.cloud.google.com/kms/docs/algorithms （参照箇所: PQC signing algorithms, Key encapsulation algorithms、確認日: 2026-10-03）
[^52]: Microsoft『About keys - Azure Key Vault』Microsoft Learn（updated_at 2026-07-30）. https://learn.microsoft.com/en-us/azure/key-vault/keys/about-keys （参照箇所: Key types and protection methods; Quantum-resistant…、確認日: 2026-10-03）
[^53]: Microsoft『Key types, algorithms, and operations - Azure Key Vault Managed HSM』Microsoft Learn（updated_at 2026-06-12）. https://learn.microsoft.com/en-us/azure/key-vault/managed-hsm/about-keys-details （参照箇所: 冒頭の表、EC/RSA algorithms、確認日: 2026-10-03）
[^54]: E. Hammer-Lahav『RFC 5849 The OAuth 1.0 Protocol』Informational, 2010-04. https://www.rfc-editor.org/rfc/rfc5849 （参照箇所: 書誌情報、確認日: 2026-10-03）
[^55]: D. Hardt『RFC 6749 The OAuth 2.0 Authorization Framework』Standards Track, 2012-10. https://www.rfc-editor.org/rfc/rfc6749 （参照箇所: ヘッダ "Obsoletes: 5849", §4.2、確認日: 2026-10-03）
[^56]: OpenID Foundation『OpenID Authentication 2.0 - Final』2007-12-05. https://openid.net/specs/openid-authentication-2_0.html （参照箇所: 書誌情報、確認日: 2026-10-03）
[^57]: OpenID Foundation『OpenID Connect Core 1.0』Final, 2014-02-25. https://openid.net/specs/openid-connect-core-1_0-final.html （参照箇所: 書誌情報、確認日: 2026-10-03）
[^58]: OpenID Foundation『OpenID 2.0 to OpenID Connect Migration 1.0』Final, 2015-04-16. https://openid.net/specs/openid-connect-migration-1_0.html （参照箇所: Abstract, openid2_id の検証手順、確認日: 2026-10-03）
[^59]: T. Lodderstedt ほか『RFC 9700 Best Current Practice for OAuth 2.0 Security』BCP 240, 2025-01. https://www.rfc-editor.org/rfc/rfc9700 （参照箇所: §2.1.2、確認日: 2026-10-03）
[^60]: K. Moriarty, S. Farrell『RFC 8996 Deprecating TLS 1.0 and TLS 1.1』BCP 195, 2021-03. https://www.rfc-editor.org/rfc/rfc8996 （参照箇所: §4, §5, §6、確認日: 2026-10-03）
[^61]: L. Velvindron, K. Moriarty, A. Ghedini『RFC 9155 Deprecating MD5 and SHA-1 Signature Hashes in TLS 1.2 and DTLS 1.2』Standards Track, 2021-12. https://www.rfc-editor.org/rfc/rfc9155 （参照箇所: §2, §4、確認日: 2026-10-03）
[^62]: OASIS『Assertions and Protocols for the OASIS Security Assertion Markup Language (SAML) V2.0』OASIS Standard, 2005-03-15. https://docs.oasis-open.org/security/saml/v2.0/saml-core-2.0-os.pdf （参照箇所: 表紙、確認日: 2026-10-03）
[^63]: J. Somorovsky, A. Mayer, J. Schwenk, M. Kampmann, M. Jensen『On Breaking SAML: Be Whoever You Want to Be』21st USENIX Security Symposium, 2012. https://www.usenix.org/conference/usenixsecurity12/technical-sessions/presentation/somorovsky （参照箇所: Abstract、確認日: 2026-10-03）
[^64]: NIST NVD『CVE-2024-45409』2024-09-10 公表. https://nvd.nist.gov/vuln/detail/CVE-2024-45409 （参照箇所: Description, CVSS v3.1（GitHub CNA）、確認日: 2026-10-03）
[^65]: NIST NVD『CVE-2025-25291』2025-03-12 公表. https://nvd.nist.gov/vuln/detail/CVE-2025-25291 （参照箇所: Description、確認日: 2026-10-03）
[^66]: The Kubernetes Authors『Kubernetes Deprecation Policy』kubernetes.io（Last modified 2026-08-21）. https://kubernetes.io/docs/reference/using-api/deprecation-policy/ （参照箇所: Rule #1, #4a, #4b, #5a, #7、確認日: 2026-10-03）
[^67]: Microsoft『Migrate from Azure Active Directory (Azure AD) Graph to Microsoft Graph』Microsoft Learn（ms.date 2025-09-29）. https://learn.microsoft.com/en-us/graph/migrate-azure-ad-graph-overview （参照箇所: "Key timelines in the retirement of Azure AD Graph"（2025-08-31 は "will be fully retired" と予定形）、確認日: 2026-10-03）
[^68]: IETF PQUIP WG『RFC 9958 Post-Quantum Cryptography for Engineers』Informational, 2026-06. https://www.rfc-editor.org/rfc/rfc9958 （参照箇所: 書誌情報、確認日: 2026-10-03）
[^69]: M. Jones, J. Bradley, N. Sakimura『RFC 7519 JSON Web Token (JWT)』Standards Track, 2015-05. https://www.rfc-editor.org/rfc/rfc7519 （参照箇所: §1, §3、確認日: 2026-10-03）
[^70]: J. Salowey, S. Turner『RFC 9847 IANA Registry Updates for TLS and DTLS』Standards Track, 2025-12. https://www.rfc-editor.org/rfc/rfc9847 （参照箇所: Abstract, §3 "Updating 'Recommended' Column's Values"、確認日: 2026-10-03）
