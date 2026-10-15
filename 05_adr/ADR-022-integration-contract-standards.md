# ADR-022 連携契約の標準と並行開発の契約凍結範囲

> 文書ID: ADR-022 / 版: 0.2（v1.2 の同期） / 状態: draft（ADR 状態: proposed＝決裁前）/ 最終更新: 2026-10-15（0.2: v1.2 の同期で §8A「v1.2 で判明した論点」V12-22-1・V12-22-2 を追記した。決定は変えていない）
> 可逆性: **部分的に不可逆**。不可逆なのは識別子（issuer URL、sub/tid の形式、scope・permission・resource type の名前空間、claim 名の予約名前空間、CloudEvents の type/source の命名、kid の命名規則、相関 ID 欄の意味。形式は ADR-021 で決める）と、GA で凍結した claim の意味である。それ以外の契約要素は「版付き・非推奨期間付き・強制移行なし」で置き換えられる（§2 D-1、§3）。
> DEC-3 対象: はい（traceability/deliverables.md §5 の DEC-3 列「対象」）。凍結そのものは DEC-8（連携契約 v1 の凍結）で決裁する（§2 D-11 の決裁案）。
> 対応要求: R-105, R-109, R-208（deliverables.md の ADR-022 行）／G-042, G-066, G-120, G-134, G-140（対応成果物欄に本書のパスを含む行）。関連: R-022, R-108, R-118, R-062, R-071, R-172, R-194, R-206, R-209, R-249／G-088, G-102, G-118〜G-123, G-126, G-137, G-141〜G-146（全件は末尾の対応表）
> 依存文書: CONVENTIONS.md, traceability/deliverables.md（DL-12, DL-62〜DL-80, DL-115, DEC-3, DEC-8）, traceability/R-requirements.md, traceability/G-goal-criteria.md, traceability/claims-ledger.md（CL-0177, CL-0264）, 01_governance/assumptions-register.md, 03_threat-model/attacker-model.md, 05_adr/ADR-005-token-profile.md, research/RS-03, RS-04, RS-06, RS-07, RS-10, RS-11, RS-16, RS-17（各 verification 記録を含む）, research/standards-status.md
> 作成方法: 3 つの起草レンズ（sec＝セキュリティ・保証優先、ops＝運用性・費用・組織実現性優先、evo＝20 年の進化可能性・退出可能性優先）の提案を、3 判定者の採点にもとづいて最終起草者が統合した。土台は集計上の勝者 ops 案で、判定者が挙げた移植（graft）を取り込み、判定者が指摘した事実誤りを原典で確認して修正した（§4.3）。起草・判定とも AI エージェント（Claude）による模擬パネルで、実在する CTO/CISO の決裁ではない（CONVENTIONS §8）[D]。
> 日付の注記: 計画上の起草基準日は 2026-10-03 である。W3C VC Data Model 2.0 と OpenID Connect Back-Channel Logout 1.0 の原典は最終起草者が 2026-10-15 に取得・確認したため、最終更新日をその日にした [D]。

**要旨（結論）**

- 連携契約 v1 は 4 区分で凍結する [D]（RS-16#71、RS-16 §5.1 表 2）。「不可逆」は識別子だけ、「GA」は Final・RFC・W3C Recommendation に寄せた要素と、標準がない領域のうち製品から独立した最小の自社契約、「preview」は draft 標準・製品選定（Gate 3）で変わり得る要素で期限付き、「凍結しない」は製品・エンジン・内部実装である [D]。
- 連携側は契約だけに依存する [D]。SDK は 5 つの責務に限った薄いラッパとし、SDK を使わずに契約と負例ベクタだけで適合できることを凍結の承認条件にする [D][A-054]（G-140）。
- セキュリティ上の不変条件（aud・typ・iss・alg・kid・tenant の検証と、token 種別間の相互排他）は、必須の負例ベクタ 13 種として凍結し、全 consumer の CI と基盤側の CI の両方で実行する [D]（G-088, G-121, G-122, G-142）。
- **相談事項への回答（trace id と付加すべき claim）**:
  - 認可後に返す access token に、要求単位の trace id は入れない [D]。token は寿命の間に多数の要求で再利用されるので要求を特定できず [D][A-027]、要求ごとに発行し直すと発行負荷が A-043 の 1,374/秒から A-040 の 16,804/秒の桁に上がる [D][A-040][A-043]。W3C の trace-id は相関専用で攻撃者が値を制御でき、sampling で欠落する [N][^17][^46]（RS-10#16, #17, #22）。
  - 「共通の認証認可を通った一貫したリクエスト」の証跡は、署名の有無が異なる 4 層の識別子（token の `jti`／session の `sid`、取引の `txn`、判定の `decision_id`、観測の `trace_id`）を監査イベントで結んで残す [D]（§2 D-8）。主キーは `txn` とし、Transaction Tokens が RFC にならない場合は、edge が発行する自社形式の取引 ID を同じ欄に入れる退出経路を持つ [D]。ADR-005 D9-3 は Txn-Token を write 以上に限るため、主キーを全要求に広げるかは未決の論点 U-02 とする（整合調整で追記）[D]。
  - v1 で発行する claim は、RFC 9068 の必須 claim、scope、tid、acr/amr/auth_time、cnf、act、sid、grant 参照、主体の種別、profile 版とする [D]（ADR-005 の V9・V10・D1-4・D6-4・D9-4 と整合。grant 参照と主体の種別は ADR-005・ADR-021 との整合調整で予約から発行対象へ移した）。所属（tid）だけでは足りない将来の語彙として、発行元 IdP、authorization_details、保証の根拠への参照、資格の状態参照、利用目的（termsOfUse 相当）を予約名前空間に置く [D]。W3C VC Data Model 2.0 の属性は token に複写せず、認証と PDP への入力証拠として受け入れる [D]（§2 D-9）。

---

## 1. 文脈

### 1.1 解くべき問題

約 300 の依存サービスと 25 組織・60 チームが、基盤の実装と製品の最終選定（Gate 3）を待たずに開発を始められる状態を作る必要がある [D][A-050][A-052]。そのために、どの連携契約を、どの標準・版・状態に寄せ、どの強度で凍結し、何を凍結しないかを決める [D]（R-109, G-118, G-119, G-120）。

同時に次の 3 つの緊張を解く必要がある [D]。

| # | 緊張 | 根拠 |
|---|---|---|
| T1 | DEC-8 の凍結（G-134）と、退出基準を満たすまで不可逆な標準化・強制移行を凍結する R-022 | RS-16 §2-2 [D] |
| T2 | 300 サービスが各自で token・テナント・内部 context を解釈すると、検証漏れが 1 か所あるだけで越境の入口になる（ATK-02, ATK-05, ATK-06） | 03_threat-model/attacker-model.md [D] |
| T3 | 認証・認可プロトコルは理解できない claim・parameter を無視することを MUST とするため、後から足した制約は旧版の consumer に黙って無視される | RFC 7519 §4 [N][^2]、RFC 6749 [N]（RS-16#14, #15） |

本 ADR が答える問いは次のとおりである [D]。

| # | 問い | 主な R/G |
|---|---|---|
| Q1 | 10 種の契約（OIDC/OAuth profile、RFC 9068 claims、AuthZEN、Relationship/Model Registry、RFC 8693、SCIM、SSF/CAEP/RISC、監査イベント、イベント配送、記述形式）の凍結区分 | R-109, G-118, G-119, G-134 |
| Q2 | 製品からの独立と契約外依存の禁止 | R-208, G-066, G-120 |
| Q3 | SDK の責務の上限と、SDK を使わない連携 | G-140, CL-0177, CL-0264 |
| Q4 | 版管理・互換性・非推奨・未移行 consumer | R-105, R-108, R-194, G-126 |
| Q5 | consumer-driven contract test、モック、sandbox | R-062, R-071, R-172, G-121, G-122, G-141, G-142 |
| Q6 | 一貫したリクエストの証跡用の識別子（相談事項） | R-118 |
| Q7 | 基盤が付加すべき claim と将来の語彙（W3C VC を含む、相談事項） | R-209, R-249, G-102 |
| Q8 | 「共通の契約・統制」と「共有される実装」の区別 | G-042 |

### 1.2 制約（規範。強度は原文どおり）

| # | 内容 | 強度 | 根拠 |
|---|---|---|---|
| N-a | 実装は理解できない JWT claim を無視しなければならない | MUST | RFC 7519 §4 [N][^2]（RS-16#14） |
| N-b | `crit` に挙げた拡張を受信者が理解しない JWS は無効。`crit` は保護 header に置く | MUST | RFC 7515 §4.1.11 [N][^3]（RS-16#16） |
| N-c | metadata の issuer は ID Token の iss と同一でなければならず、一致しない metadata は使ってはならない | MUST / MUST NOT | OIDC Discovery §3・§7 [N][^4]、RFC 8414 §3.3 [N][^5]（RS-16#17, #18） |
| N-d | JWT access token は iss・exp・aud・sub・client_id・iat・jti が REQUIRED。RS は typ・iss・aud・署名・exp を検証する。resource ごとに異なる aud を使う。client は access token の内容を調べてはならない | REQUIRED / MUST / MUST NOT | RFC 9068 §2.2, §4, §5, §6 [N][^1]（RS-04#60, #61） |
| N-e | auth_time・acr・amr は OPTIONAL。scope 付きの要求なら scope を含めるべき。衝突耐性のある名前なら未定義の claim を発行してよい。roles・groups・entitlements を載せる場合は SCIM の属性名を使うべき | OPTIONAL / SHOULD / MAY | RFC 9068 §2.2.1, §2.2.2, §2.2.3, §2.2.3.1 [N][^1] |
| N-f | alg の allowlist、鍵と alg・issuer の結合、同じ issuer の複数種別 JWT の相互排他的な検証 | MUST | RFC 8725 §3 [N][^16]（RS-04#62） |
| N-g | AuthZEN の後続改訂は API を augment してよいが modify してはならない。要求 ID が付いていれば PDP は応答に含めなければならない。search の結果は evaluation で true に SHOULD なるが保証されない | MAY / MUST NOT / MUST / SHOULD | Authorization API 1.0 §4, §8, §10.1.3 [N][^7]（RS-07#62, #65, #66） |
| N-h | token exchange の consumer は、最上位 claim と現在の actor だけを考慮しなければならない | MUST | RFC 8693 §4.1 [N][^9]（RS-04#66） |
| N-i | Txn-Token の typ は txntoken+jwt、`txn`・`sub`・`scope`・`req_wl` ほかが必須。Authorization ヘッダで渡してはならず、下流へ無改変で渡す。replay 耐性がなく、認証資格情報として使ってはならない。全文をログに残してはならない | MUST / MUST NOT（草案） | draft-ietf-oauth-transaction-tokens-11 §9, §12, §13, §15.2 [N][^10]（RS-06#31, #35, #36, #41） |
| N-j | traceparent・tracestate に個人識別情報を入れてはならず、目的は相関だけである。外部の sampled flag を素直に継続すると悪用され得る | MUST NOT | W3C Trace Context §6, §7.2 [N][^17]（RS-10#16, #17） |
| N-k | Sampler が DROP を返すと span は記録されない | 規定 | OpenTelemetry Tracing SDK [N][^46]（RS-10#22） |
| N-l | CloudEvents の producer は source と id の組を一意にしなければならない。非互換なスキーマ変更は別の dataschema URI で表すべき | MUST / SHOULD | CloudEvents 1.0.2 [N][^18]（RS-16#9, #10） |
| N-m | Problem Details の client は認識できない拡張メンバを無視しなければならない | MUST | RFC 9457 §3.2 [N][^24]（RS-16#12） |
| N-n | Sunset の日時は Deprecation の日時より前であってはならない。両 header はヒントである | MUST NOT | RFC 9745 [N][^25]、RFC 8594 [N][^26]（RS-16#34, #35） |
| N-o | SSF はイベント処理の義務を配備ごとに定めてよい | 配備に委任 | SSF 1.0 §4.1.5 [N][^11]（RS-04#77） |
| N-p | ID Token・Logout Token の `sid` は session の識別子で OPTIONAL。Logout Token は sub か sid の少なくとも一方を含まなければならない | OPTIONAL / MUST | OIDC Back-Channel Logout 1.0 §2.1, §2.4 [N][^42]（research ノート外。最終起草者が 2026-10-15 に原典を確認。独立検証は未実施） |

**標準の状態（確認日は各 RS ノートの 2026-10-03。VC・Back-Channel Logout は 2026-10-15）**

| 標準 | 状態 | 根拠 |
|---|---|---|
| OIDC Core / Discovery | Final（errata set 2） | [^6][^4]（RS-16#17, #19） |
| RFC 9068 / RFC 8693 / RFC 8725 / RFC 9457 / RFC 7643・7644 | RFC。RFC 9068 には Reported のままの errata 8802 がある | [^1][^9][^16][^24][^13][^14][^60]（RS-04#60） |
| AuthZEN Authorization API 1.0 | OpenID Final（2026-01-11 発行、2026-01-12 承認告知）。COAZ・Obligations 等は WG Draft | [^7][^8]（RS-07#60, #67） |
| Relationship / Model Registry API | 該当する標準なし。AuthZEN は policy language と状態管理を範囲外とする | [^7]（RS-07#61） |
| SSF 1.0 / CAEP 1.0 / RISC 1.0 | Final（2025-08-29） | [^11][^58][^59]（RS-04#77） |
| CAEP Interoperability Profile | Implementer's Draft 1。Final 化のレビューはやり直し | [^55]（RS-04#79） |
| Transaction Tokens | Internet-Draft -11（WG Consensus: Waiting for Write-Up、IESG 未提出、失効予定 2027-01-31） | [^10]（RS-06#29） |
| OCSF | 1.9.0（2026-08-03）。minor 版が半年弱ごと。SDO 外 | [^15]（RS-10#1, #2） |
| OpenAPI | 最新 3.2.1、3.1 系最新 3.1.2。minor 版でも非互換変更があり得る | [^20][^21]（RS-16#1〜#3） |
| JSON Schema | 2020-12 が現行。IETF での発行をやめた | [^22][^23]（RS-16#4, #5） |
| AsyncAPI / CloudEvents | 3.1.0 ／ 1.0.2（CNCF Graduated） | [^19][^18]（RS-16#6, #7, #9, #11） |
| W3C Trace Context | Level 1 は Recommendation、Level 2 は CR | [^17]（RS-10#16, #18） |
| W3C VC Data Model 2.0 | W3C Recommendation（2025-05-15） | [^41]（research ノート外。最終起草者が 2026-10-15 に確認。独立検証は未実施） |
| OIDC Back-Channel Logout 1.0 | Final（2023-12-15、errata set 1） | [^42]（同上） |

### 1.3 前提（A-ID）と新規仮定

| A-ID | 値（基準） | 本 ADR での効き方 |
|---|---|---|
| A-014 | AI エージェント ID 1 万（成長 20 万） | 主体種別 claim の予約と act の発行 [D][A-014] |
| A-015 | 複数テナント所属 3% | 1 token に 1 tid（ADR-005 V9）[D][A-015] |
| A-027 | access token 寿命 10 分（容量計算用の仮置き） | token は多数の要求で再利用される [D][A-027] |
| A-040 / A-043 | edge API 呼出 16,804/秒 ／ token 発行 1,374/秒 | 要求単位で token を発行しない理由 [D][A-040][A-043] |
| A-050 / A-052 / A-053 | 依存サービス 300（成長 600）／25 組織・60 チーム／開発者 1,500 | consumer 台帳の規模、全組織に同じツールを強制できない [D] |
| A-054 | プラットフォーム 24 FTE（うち PEP SDK・開発者支援 4、認証 5、認可 5、SRE 6） | SDK・契約保守の要員上限 [D][A-054] |
| A-100 / A-101 | 計画期間 20 年／再決裁は初回 3 年以内、以後 5 年以内 | 識別子の永続期間、棚卸し周期 [D] |
| A-103 / A-104 | 暗号移行 1 回以上／AS・認可エンジン・PEP SDK を各 1 回以上置換 | alg を固定しない、契約を製品から独立させる [D] |
| A-110 / A-112 | 現行認証: 共通 SSO 120・独自セッション 105・LDAP 30・共有シークレットのみ 45／自前認可 240 | 移行の波、cnf 導入の前提、tuple 書込み API の安定性 [D] |

**新規仮定（前提台帳へ追加要）**

| ID | 内容 | 検証 |
|---|---|---|
| NA-022-1 | SDK を提供するサーバー側言語は 3 とする。それ以外は契約だけで連携する | 言語分布の as-is 調査。4 以上なら §8 のトリガー |
| NA-022-2 | 目的拘束・同意の範囲を token で運ぶ法域要件の有無は未確定 | ADR-014・法務確認 |
| NA-022-3 | 破壊的変更 1 回あたりの consumer 側移行費は 2〜5 人日／サービス（300 サービスで 600〜1,500 人日） | パイロット実測（H-7） |
| NA-022-4 | 契約管理（スキーマ、モック、負例ベクタ、正誤表、FAQ、審査会事務局）に 2 FTE を新設する | H-7 |
| NA-022-5 | 負例ベクタ 13 種の多言語保守は NA-022-4 と A-054 の SDK 4 FTE の内側で賄う | H-7、H-1 の保守記録 |

### 1.4 関連研究

| RS | 使う項目 |
|---|---|
| RS-16 | #1〜#13（記述形式）、#14〜#22（プロトコル固有の互換性規則）、#23〜#33（破壊的変更）、#34〜#45（非推奨、#41 Google Cloud Terms）、#46〜#56（契約試験・モック）、#57〜#61（変更管理）、#71〜#74、#78〜#82、表 1・表 2 |
| RS-04 | #60〜#62（RFC 9068・RFC 8725）、#64（RAR）、#66（RFC 8693）、#72（step-up）、#77〜#79（SSF/CAEP/RISC） |
| RS-06 | #29〜#42（Transaction Tokens）、#53（RFC 9396） |
| RS-07 | #60〜#69（AuthZEN、OpenFGA の experimental 実装、Aserto の事業終了） |
| RS-10 | #1〜#7（OCSF）、#13（CADF の observer）、#16〜#22（Trace Context・Baggage・OTel） |
| RS-11 | #62（PQC 署名による token サイズの計算値） |
| RS-17 | #32〜#35（イベントと主体情報）、#45、#88 |
| RS-03 | #75, #76, #80（SCIM、RFC 9967） |

---

## 2. 決定

### D-1 凍結区分（4 区分）

| 区分 | 対象 | 変更の扱い | 根拠 |
|---|---|---|---|
| 不可逆 | issuer URL、sub/tid の形式、scope・permission・resource type の名前空間、claim 名の予約名前空間、CloudEvents の type/source の命名、kid の命名規則、相関 ID 欄（`jti`・`txn`・`decision_id`・`trace_id`）の意味 | 変えない。避けられない場合は新しい識別子を並行運用し、旧識別子を非推奨手続で退役させる | RS-16#9, #17, #18、ADR-021 [D] |
| GA（v1） | D-2 の表で GA としたもの | minor では後方互換な追加だけ。制約の強化と意味の変更は新しい major の並行提供 | RS-16#14〜#16, #31 [D] |
| preview | D-2 の表で preview としたもの | 版付き。非推奨期間は GA より短い（値は TBD、ADR-016）。DEC-8 の凍結対象に含めるが、GA への昇格は別途承認 | AIP-181 の beta の扱い [V][^31]（RS-16#25） |
| 凍結しない | AS・IdP 製品、PDP エンジン、関係ストア、cell 構成、内部 API、SDK の内部実装、OCSF の版、モックの実装 | 契約の範囲内で自由に変える。外部挙動の不変は契約試験で確かめる | RS-16#71 [D] |

- **D-1-1** GA に置けるのは次のいずれかに限る [D]（sec 案 D22-03 と evo 案 D1-2 の統合）。
  - (a) 準拠先が RFC（Standards Track または BCP）、OpenID Final、W3C Recommendation のいずれかで、自社拡張が版付き profile として分離されている要素。
  - (b) 該当する標準がない領域で、自社定義が最小（形式を規定しない不透明値を含む）で、製品固有の要素を含まず、独立した 2 実装で動くこと（D-6-6）を PoC で示せる要素。
  - 準拠先が Internet-Draft、Implementer's Draft、WG Draft、experimental 実装のいずれかに依存する要素は preview 以下に置き、GA の契約から preview の要素への必須依存を作らない [D]。
- **D-1-2** preview には期限（GA 昇格・改版・廃止のいずれかを判断する日）を付ける [D]。期限を超えた preview の件数と、preview に依存する consumer の数を KRI にする [D]（sec 案の移植）。期限の値は TBD（所有者: CTO、決め方: ADR-016・DL-70 で非推奨期間と合わせて決める、期限: DEC-8 前）。
- **D-1-3** DEC-8 の決裁文に「不可逆なのは識別子だけで、他は版付き・非推奨期間付き・強制移行なし」と明記し、R-022 と両立させる [D]（RS-16 §5.1 表 2）。
- **D-1-4** 「共通の契約・統制」は GA・preview の契約と負例ベクタであり、「共有される実装」は「凍結しない」区分である [D]（G-042）。consumer は前者だけに依存し、後者を直接呼ばない（D-3）。共有実装のうち global 部品の列挙と障害時の影響範囲は DL-54・ADR-013 が持つ [D]。

### D-2 10 種の契約の個別判定

| 契約（DL） | 準拠標準・状態 | GA に置く範囲 | preview に置く範囲 | 凍結しない範囲 |
|---|---|---|---|---|
| OIDC/OAuth profile（DL-69 収載、中身は ADR-005・ADR-020） | OIDC Core/Discovery（Final）、RFC 8414、RFC 9700（BCP 240） | issuer の照合、discovery、JWKS 取得規則（未知の kid で取り直し、取り直し後も無ければ拒否）、client 種別ごとの grant と sender constraint、RFC 9457 のエラー形式 [N][^4][^5][^24] | 非本番環境の動的登録（RS-16#20） | AS 製品、鍵の保管方式、PAR・DPoP の運用値 |
| access token claims（DL-75） | RFC 9068（Proposed Standard） | D-9 の core claim、typ=at+jwt（不可逆）、検証規則 V1〜V14（ADR-005） | 予約 claim の発行開始 | — |
| Authorization API（DL-72） | AuthZEN 1.0（Final） | evaluation・evaluations、PDP metadata、X-Request-ID の往復、自社拡張のうち `decision_id` と不透明な consistency token [N][^7] | search 3 種、model/policy revision の表現、obligation（WG Draft）[N][^7]（RS-07#65, #67） | PDP エンジン固有の API・ヘッダ |
| Relationship / Model Registry API（DL-73） | 標準なし（D-1-1(b)） | tuple の書込み・削除・読取り、テナント指定の必須化、不透明な consistency token（形式を規定しない文字列）、エラー形式 | モデル DSL、モデル管理（登録・pin・shadow・rollback、export/import） | エンジン固有の DSL・ヘッダ（自社の正規モデル定義から生成） |
| Token Exchange API（DL-74） | RFC 8693 | subject/actor token の種別、audience/resource の必須化、act の深さの上限、エラー [N][^9] | `requested_token_type` に txn_token を指定する行（draft 依存、RS-06#32） | 派生 token の寿命の値（ADR-006） |
| 内部取引 context（Transaction Token） | draft-11（Internet-Draft） | `txn` 欄の意味と形式（不透明な文字列、PII なし）、`Txn-Token` ヘッダを無改変で下流へ渡す義務、Authorization ヘッダに入れない義務、全文をログに残さない義務 [N][^10] | Txn-Token の claim 構成（社内 profile `txn-v1`）、TTS への要求 | TTS の配置 |
| SCIM（DL-76） | RFC 7643/7644 | 顧客 IdP からの受信。User・Group の core 属性、テナントの表し方、deprovision の意味 [N][^13][^14] | SCIM の SET profile（RFC 9967、要旨のみ確認: RS-03#80）[N][^56]、エージェント拡張 | 依存サービスへの下流配信は SCIM ではなくライフサイクルイベント（G-137）で行う |
| SSF / CAEP / RISC（DL-78, DL-79） | Final | stream 管理、push/poll、SET の形式（secevent+jwt）、v1 で使うイベント種別（CAEP session-revoked・credential-change・token-claims-change・assurance-level-change、RISC account-disabled・credential-compromise・identifier-recycled）と受信義務（値は TBD、ADR-006）[N][^11][^58][^59] | CAEP Interoperability Profile（ID1）への準拠表明 [N][^55] | 配送基盤 |
| 監査イベント（DL-77） | 正準スキーマは自社定義。写像先は OCSF 1.9.0・CADF 1.0.0 | 共通項目（主体、tenant、actor chain、resource、action、decision の列挙、reason、policy/model revision、producer 連番、スキーマ版、`jti`・`sid`・`txn`・`decision_id`・`trace_id`） | — | OCSF・CADF への写像（export 層、版を契約と別に管理）（RS-10#1） |
| イベント配送（ライフサイクルイベント、G-137） | CloudEvents 1.0.2、AsyncAPI 3.x | 封筒（id・source・type・specversion・dataschema）、type の命名（不可逆）、冪等キー・順序・再送の規約 [N][^18][^19] | 初版の個別 data スキーマ | broker 製品、配信経路 |
| 記述形式 | OpenAPI 3.1.2、JSON Schema 2020-12（`jsonSchemaDialect` を明示）、AsyncAPI 3.x | 凍結版の記述言語 [N][^21][^22] | OpenAPI 3.2 への移行（ツール対応を H-9 で確認してから判断） | — |
| trace 伝播 | W3C Trace Context Level 1（Recommendation） | traceparent を受け取ったら伝播する義務。外部から来た sampled flag を監査の記録可否に使わない [N][^17] | Level 2・Baggage（CR）。Baggage に subject・tenant を載せることは禁止 [N][^47] | — |
| 非推奨の通知 | RFC 9745、RFC 8594 | header の送出と client_id 単位の利用計測 [N][^25][^26] | — | 期間の数値は DL-70・ADR-016 |

- **D-2-1** Relationship API の tuple 操作を GA にするのは、自前で認可を実装している 240 サービス（A-112）が移行時に tuple の書込みへ依存するため、短い非推奨期間の preview で移行を繰り返させないためである [D][A-112]（判定者 2・3 の移植）。G-120 の「変わり得る箇所の列挙」には、モデル DSL、consistency token の内部形式、search のページングの挙動の 3 点を載せ、列挙外の要素は Gate 3 の選定結果によって変えない [D]。
- **D-2-2** AuthZEN search の結果を利用者へ返す直前に、対象ごとの evaluation を行うことを契約上の義務にする [N][^7][D]（RS-07#65、RS-17#45）。
- **D-2-3** G-138 の「パターン × インタフェース × 契約」の行列で、空欄は GA または preview の契約で埋める。埋められない外部インタフェースは「未対応」と明記し、暫定方式は G-143 で扱う [D]。

### D-3 contract-first と契約外依存の禁止

- **D-3-1** 11_contracts の OpenAPI・AsyncAPI・JSON Schema を正本とし、SDK・モック・文書はそこから生成または検証する [D]（G-118）。
- **D-3-2** 次の依存を禁止する [D]（R-208、G-120）。
  - 製品固有のヘッダ・パラメータ・endpoint（例: OpenFGA の model ID 指定ヘッダ、RS-07 §2-7）と製品固有の claim 名（例: `scp`。ADR-005 V10）
  - access token の内容の解析（client による検査は RFC 9068 §6 の MUST NOT）[N][^1]
  - JWKS URL の直書き（discovery を経由する）
  - AS・PDP・ストアへの直接接続、未公開の内部 endpoint
  - エラー文言・HTTP 理由句の文字列一致
  - sandbox の資格情報を本番で使うこと
- **D-3-3** 禁止は 4 層で検出・強制する [D]（evo 案 D3-3 の移植、RS-16#82）。
  1. CI の静的検査と契約 lint（Spectral は OpenAPI 3.1・AsyncAPI を検証できる）[V][^52]
  2. gateway による未定義ヘッダの除去
  3. egress の許可リスト
  4. 契約試験の負例ベクタ（D-6）
- **D-3-4** 2・3 層目は 300 サービスの経路すべてに運用変更を課し、必要なヘッダを誤って除去すると障害になる [D]（判定者 3 の指摘）。このため次を条件にする [D]。
  - 除去・遮断はまず「検出のみ（ログ）」で導入し、検出件数が 0 になった経路から遮断に切り替える。
  - 遮断の規則は版付きで配布し、1 操作で直前の版に戻せる切戻し手順を runbook（DL-24 系）に置く。
- **D-3-5** 製品に依存せざるを得ない要素は、例外台帳に「製品名、理由、置換時の互換方針、期限」を記載して契約変更審査会の承認を得る [D]（G-120）。

### D-4 薄い SDK（G-140 の 7 項目）

- **D-4-1** SDK の責務は次の 5 つに限る [D]（CL-0177 の処置）。(1) 契約どおりの token 検証（ADR-005 の V1〜V14）、(2) AuthZEN 呼出しのラッパ、(3) Txn-Token と traceparent の無改変伝播、(4) 監査イベントの共通項目の付与と送出、(5) 非推奨警告の表示と利用計測。
- **D-4-2** SDK は契約にない意味論（独自の deny 条件、独自のキャッシュ延長、判定不能時の allow などの独自 fallback）を持たない [D]。fail-mode の値（timeout、retry、cache 最大齢）は SDK に埋め込まず、操作階層ごとの設定として契約側（DL-20、G-106）から読む [D]。
- **D-4-3** SDK が実装する検証規則は契約文書（DL-75）に規範として書き、SDK を使わない consumer も同じ負例ベクタで適合を判定できるようにする [D]。
- **D-4-4** SDK は非推奨の版や機能の利用を client_id・workload ID 単位で計測して基盤へ送り、未移行 consumer 数（R-194.5）の実測源にする [D]（evo 案 D4-4 の移植。Kubernetes の同種の計測 [V][^35]、RS-16#38）。
- **D-4-5** G-140 の 7 項目は次のとおりとする [D]。

| 項目 | 本書の決定 | 値・所有者 |
|---|---|---|
| 対象の言語・フレームワーク | サーバー側は主要 3 言語（NA-022-1）。ブラウザは BFF 経由とし token を扱う SDK を提供しない。モバイルは OpenID RP 適合試験を通ったライブラリを使う（D-6-5） | 言語の確定: as-is 調査（所有者 CTO、DEC-8 前） |
| 責務の上限 | D-4-1・D-4-2 | 本書で決定 |
| SDK なしの連携 | 契約と負例ベクタだけで適合できること（D-11 の承認条件） | 手順は DL-62・DL-66 |
| 版付け | SemVer 2.0.0。リリースごとに契約の版を 1 つに固定 [N][^53] | 本書で決定 |
| サポート期間・版差 | 基盤との版差の許容幅（候補 N−2）とメジャー版ごとの支援期間を数値契約にする | TBD（所有者 CTO、DL-70、DEC-8 前） |
| 脆弱性修正の期限 | 深刻度別の修正・配布期限を数値契約にする | TBD（所有者 CISO、DL-20） |
| 利用状況の把握 | D-4-4 の計測と consumer 台帳 | 本書で決定 |

### D-5 版管理・互換性・非推奨

- **D-5-1** 破壊的変更の定義表を自社で持つ。少なくとも次を破壊的とする [D]（RS-16#24, #27, #32）。
  - 既定値の変更（AIP-180 は must not）[V][^30]
  - claim・エラーコードの意味の変更。エラーコードの変更も破壊的とする（Microsoft Graph は後方互換に分類するが [V][^33]、監視・runbook が壊れるため本基盤では逆に扱う）[D]
  - 制約を強める claim の追加。未知の claim は無視されるため（N-a）、制約の強化は typ・profile 版の変更、または `crit` で表す [N][^2][^3][D]（ADR-005 V13）
  - 判定を担う閉じた enum（例: decision）への値の追加
- **D-5-2** 判定を担わない応答の enum は開いた enum と宣言し、値の追加を後方互換とする。consumer に未知値の fallback を義務づけ、fallback は deny 側に倒す [V][^36][D]（RS-16#32）。
- **D-5-3** 非推奨は RFC 9745 の Deprecation と RFC 8594 の Sunset で告知し、両 header はヒントにすぎないため consumer 台帳への直接通知と D-4-4 の計測を併用する [N][^25][^26][D]。
- **D-5-4** GA・preview の最短非推奨期間、延長の判断基準、段階的な締め出しの順序（新規 consumer から締め出す）は ADR-016・DL-70 の数値契約で決める [D]。本書では値を置かない（TBD、所有者 CTO＋CISO、決め方: BIA と NA-022-3 の実測、期限 DEC-8 前）。参考値は次のとおりである [V]（RS-16 表 1）。
  - Microsoft Graph: GA の削除前に 24 か月以上 [V][^33]（RS-16#28）
  - Google Cloud Terms of Service §1.4(e): 後方互換でない大きな API 変更の 12 か月以上前に通知 [V][^34]（RS-16#41）
  - AIP-185: beta の非推奨期間 180 日を推奨 [V][^32]（RS-16#26）
  - Kubernetes: GA はメジャー版の中で削除しない [V][^35]
  - Azure AD Graph は告知から完全退役予定まで約 6 年かかり、予定日も延びた [V][^57]（RS-16#40）。退役は延びる前提で延長基準を置く [D]。
- **D-5-5** セキュリティ上の緊急変更は非推奨期間の約束から外す [D]。RS-16 表 1 の先例のうち AIP-181・Microsoft Graph・Google Cloud Terms の 3 例は、セキュリティ等を理由とする例外を設けている [V][^31][^33][^34]（RS-16#25, #28, #41。一般化は RS-16#81 の [D]）。例外を使った場合は、事後承認と consumer への個別通知を義務づける [D]（sec 案 D22-21 の移植）。
- **D-5-6** 契約の改定は年 2 回の固定日に束ね、誤記・解釈の補記は正誤表で随時出す [D]（自治体標準化の改定基準日と正誤表の運用 [N][^40]、RS-16#73, #74）。

### D-6 試験・モック・sandbox

- **D-6-1** 試験は二層にする [D]（RS-16 §2-6）。
  - 下層（全 consumer に必須）: OpenAPI・AsyncAPI から生成したモック（Microcks 型 [V][^29]）、スキーマ適合試験、D-6-2 の必須負例ベクタ。
  - 上層（主要 consumer に限る）: Pact の consumer-driven 契約。対象は基盤との結合が深い edge、BFF、PEP sidecar、監査収集とし、調達契約で Broker への登録を義務づける。pending pacts と can-i-deploy で基盤側の開発を止めない [V][^27][^28]。
  - 全 consumer への Pact 必須化は採らない。Pact の公式文書が、個別に関係を管理できない多数の consumer と安定した OAuth provider を向かない例に挙げるためである [V][^27]（RS-16#47）。
- **D-6-2** 必須の負例ベクタは少なくとも次の 13 種とする [D]（sec 案 D22-23 の移植。G-088, G-121）。
  1. aud の誤り（API A 用の token を API B へ提示）
  2. typ の取違え（at+jwt／txntoken+jwt／secevent+jwt／ID Token）
  3. issuer mix-up
  4. alg=none と allowlist 外の alg
  5. 未知の kid（JWKS の取り直しと、取り直し後も見つからない場合の拒否）
  6. 未知の crit
  7. 期限切れ
  8. cross-tenant（tid と resource 側テナントの不一致）
  9. DPoP replay（sender-constrained token を受ける consumer に限る）
  10. Txn-Token を Authorization ヘッダで提示
  11. sandbox 発行の token を本番相当環境に提示
  12. PDP の timeout・deny・失効（モックで再現）
  13. 未知 claim の注入（無視して動作を続けることの確認）
- **D-6-3** 基盤側の CI では、全 consumer の下層試験と必須負例を毎回実行し、違反する変更は merge できないようにする [D]（G-142）。同じベクタをモックと PoC 基盤の両方に流し、結果の不一致 0 件を凍結後の維持条件にする [D]（sec 案 D22-24 の移植）。
- **D-6-4** 共有 sandbox は、本番と別の issuer・鍵・trust domain で運用し、sandbox の issuer を本番の allowlist に載せない [D]（G-141）。
- **D-6-5** OIDC の RP 実装には OpenID Foundation の RP 適合試験の自己実行を推奨し、高リスクの連携（FAPI 範囲、ADR-020）では必須にする [V][^51][D]（RS-16#56）。
- **D-6-6** GA の各契約について、独立した 2 実装（1 つは adapter 経由でよい）で動作することを PoC で示し、凍結の維持条件にする [D]（evo 案 D3-4 の移植、G-066）。AuthZEN では OpenFGA の実装が experimental で要求 ID を返さず [V][^48]（RS-07#68）、Topaz の営利母体は事業を終了した [V][^49]（RS-07#69）。このため 2 実装目の候補は PoC で選んで記録する [D]。

### D-7 変更管理

- **D-7-1** 変更管理は二層にする [D]（RS-16#57〜#60）。
  - 上層の契約変更審査会は、破壊的変更・非推奨・例外・凍結日・claim の追加と廃止だけを審議する。構成員にセキュリティ・プライバシーの代表（RS-16#58 の CM-3）と consumer 側開発組織の代表を含める [D]。
  - 下層の実装変更は peer review、自動の契約試験、can-i-deploy で通す。DORA は、チーム外の CAB による重い承認がデリバリー性能に負に働いたと報告している [M][^37]（RS-16#59）。
- **D-7-2** claim の追加審査には ARC-15（DL-115）の様式（規格・状態・PII・理由・互換性区分）を使う [D]。
- **D-7-3** 疑義対応の窓口を置き、回答を FAQ（DL-68）と正誤表で公開する [D]（RS-16#74）。デジタル庁の多ベンダー検証事業は、仕様書の解釈のずれと未定義部分の差を課題に挙げている [M][^39]（RS-16#79）。

### D-8 相関識別子と証跡（相談事項 Q6 への回答）

- **D-8-1** access token に要求単位の trace id は入れない [D]。理由は次の 3 つである。
  - access token は寿命の間に多数の要求で再利用されるため、要求単位の ID を入れても 1 要求を特定できない [D][A-027]。要求ごとに token を発行し直すと、発行負荷が A-043（1,374/秒）から A-040（16,804/秒）の桁へ上がる [D][A-040][A-043]。
  - W3C Trace Context は traceparent の目的を相関だけとし [N][^17]（RS-10#16）、外部から来た trace 状態を素直に継続すると悪用され得ると述べる [N][^17]（RS-10#17）。trace_id は攻撃者が値を制御できるものとして扱う [D]。
  - Sampler が DROP を返すと span は記録されない [N][^46]（RS-10#22）。trace だけを証跡にすることはできない [D]。
- **D-8-2** 「共通の認証認可を通った一貫したリクエスト」の証跡は、次の 4 層の識別子を監査イベント（DL-77）上で結んで残す [D]（sec 案 D22-09 の列を移植）。結合方法と改ざん検知（hash chain、外部アンカー）は ADR-014 が持つ [D]。

| 層 | 識別子 | 発行者 | 署名 | 攻撃者が値を制御できるか | 単位 | 証跡上の役割 | v1 の区分 |
|---|---|---|---|---|---|---|---|
| 1 | `jti`（RFC 9068 で REQUIRED）、`sid` | AS | あり（access token） | できない | token／利用者 session | どの認証・grant の結果か。`sid` は CAEP session-revoked との突合に使う [N][^1][^42] | GA |
| 2 | `txn` | TTS（edge で外部 token を検証した後に発行） | あり（Txn-Token） | できない（無改変で伝播） | 取引（呼出し連鎖全体） | 共通の入口で検証を通った取引の連鎖であること。`txn` の記録で replay も発見できる [N][^10]（RS-06#36） | 欄の意味と伝播義務は GA、claim 構成は preview |
| 3 | `decision_id` | PDP | 監査レコードの改ざん検知（ADR-014）に依存。read-sensitive の判定記録への PDP 署名は未決の論点 U-04（ADR-013 D13-26、整合調整で追記） | できない（PDP が払い出す） | 認可判定 1 件 | どの policy/model revision で allow/deny したか。PEP の X-Request-ID とも対応づける（AuthZEN の MUST [N][^7]、RS-07#66、CADF の observer モデル RS-10#13） | GA（自社拡張） |
| 4 | `trace_id`（traceparent） | 誰でも生成できる | なし | できる | 要求の相関 | 調査のための索引だけ。証拠としての価値は持たせない | GA（伝播のみ） |
| 補 | CloudEvents の `id`＋`source` | producer | — | — | イベント 1 件 | イベント経路の一意性（MUST）[N][^18] | GA |

- **D-8-3** 証跡の主キーは `txn` とする [D]（RS-06 §5 の ADR-014 入力と整合）。合否基準は「3 hop の呼出し連鎖で sampling を DROP にしても監査から再構成率 100%、trace_id を偽造しても判定記録が変わらない」とする（H-4）[D]（sec 案 H5 の移植）。
  - **未決の論点 U-02（整合調整で明記）**: ADR-005 D9-3 は Txn-Token（要求 context）の発行を write・privileged・break-glass/B・FAPI 範囲に限り、public・read-sensitive は任意としている。このため現状の設計では、`txn` を主キーにできるのは write 以上の要求に限られ、それ以外は (jti, decision_id, X-Request-ID) で相関する [D]。全要求に広げると署名が基準 16,804/秒・成長 56,444/秒になる [D][A-040]。H-4 の合否基準をどの範囲に適用するかは、ADR-005 H-20 の実測の後に CTO＋CISO が決める（ADR-005 §2.15 U2、reconciliation-notes U-02）[D]。
- **D-8-4** Txn-Token は replay 耐性がなく認証資格情報として使ってはならないため [N][^10]、各 hop の呼出し元認証は mTLS（X.509-SVID、ADR-009）で別に行う [D]。Txn-Token の全文はログに残さず `txn` だけを残す [N][^10]。subject・tenant を Baggage に載せない [N][^47][D]。
- **D-8-5** Transaction Tokens が RFC にならない、または大きく改訂された場合は、edge が発行する自社形式の取引 ID を同じ `txn` 欄に入れる [D]（evo 案 D6-3 の移植）。欄の意味（取引の一意な識別子、不透明な文字列、PII なし）は変えず、adapter を外しても consumer の差分が 0 であることを H-10 で確かめる [D]。
- **D-8-6** 依存サービス側の義務は「`Txn-Token` ヘッダと `traceparent` を無改変で下流へ渡し、監査イベントに `txn` を書く」ことに絞り、検証は SDK・sidecar が行う [D]。
- **D-8-7** CloudEvents の context attributes には主体・権限を載せない [N][^18]。consumer は処理の直前に再認可し、Auth Context 拡張（「純粋に情報提供」と自ら述べる）を認可の根拠にしない [N][^50][D]（RS-17#33, #35。evo 案 D6-5 の移植）。

### D-9 基盤が付加する claim（相談事項 Q7 への回答）

- **D-9-1** v1 で発行し GA で凍結する内部 access token の claim は次のとおりとする [D]。

| 区分 | claim | 意味 | 規範・根拠 | 発行条件 |
|---|---|---|---|---|
| RFC 9068 必須 | iss, sub, aud, exp, iat, jti, client_id | 発行者、主体、宛先、時刻、token ID、client | REQUIRED [N][^1] | 常に |
| RFC 9068 推奨 | scope | 付与範囲。各 scope は aud の resource にとって意味を持つ | SHOULD [N][^1] | scope 要求時 |
| 種別 | typ=at+jwt（JWS header） | 種別間の相互排他の要（不可逆） | RFC 9068 §2.1 [N][^1]、RFC 8725 [N][^16] | 常に |
| 自社 core | tid | テナント。1 token に 1 つ。PEP が資源側テナントと照合する | ADR-005 V9 [D][A-015] | 常に |
| 認証の文脈 | acr, amr, auth_time | 保証水準、認証方式、認証時刻（refresh で変わらない） | OPTIONAL [N][^1]、RFC 9470 [N][^43]（RS-04#72）。ADR-005 D6-4 の step-up 必須の前提 | 利用者主体の token |
| sender constraint | cnf | 鍵・証明書への束縛 | RFC 8705 §3 [N][^44]、ADR-005 | 束縛した token |
| 委任 | act | 現在の actor（過去の actor は情報扱い） | RFC 8693 §4.1 MUST [N][^9]（RS-04#66）。ADR-005 D1-4・V10 | exchange・委任時 |
| session | sid | session の識別子。CAEP session-revoked と突合する | OIDC Back-Channel Logout 1.0 §2.1 で OPTIONAL [N][^42]。`sid` は IANA の JSON Web Token Claims registry に登録済みである（ADR-005 D9-4、ADR-021 D21-39 の照合による）ため、衝突耐性名の条件は要らない（整合調整で修正）[D] | 利用者 session 由来の token |
| grant 参照 | grant 参照（社内 claim。名前は DL-75） | どの同意（grant）から発行されたか。grant・client・publisher 単位の一括失効の結合キー | ADR-005 D7-6・D9-4 [D] | 利用者主体・第三者 grant 由来の token（整合調整で追加） |
| 主体の種別 | 人・workload・AI エージェント・service account（社内 claim。名前は DL-75） | AuthZEN の subject.type（REQUIRED）へ変換表なしで写像する。client が主体になる token を RS が区別する | AuthZEN §5 [N][^7]（RS-07#63）。RFC 9700 §4.15.1 の区別手段（ADR-021 D21-23）。ADR-005 D9-4・ADR-021 D21-39 で v1 必須 [D][A-014] | 常に（整合調整で予約から移した） |
| profile 版 | 版を示す claim（名前は DL-75 で決める） | 制約の強化を版で表す | ADR-005 V13 [D] | 常に |

- **D-9-2** 名前と意味だけを v1 で予約し、発行開始は後続の profile 版で契約変更審査会が決める claim は次のとおりとする [D]。予約名前空間は自社所有ドメインに基づく衝突耐性のある名前にし、名前空間の文字列は不可逆区分に置く（RFC 9068 §2.2.2 の MAY の条件）[N][^1][D]（evo 案 D5-5 の移植）。予約名前空間外の claim の発行は AS 側で禁止する [D]（ops 案）。

| 予約 claim | 将来の用途 | 根拠・状態 |
|---|---|---|
| 発行元 IdP | 顧客 IdP 侵害時の IdP 単位の失効・判定（ATK-04） | 標準なし [D]（ADR-005 §6.3） |
| authorization_details | 高リスク操作の step-up grant | RFC 9396 [N][^45]（RS-06#53, RS-04#64） |
| 保証の根拠への参照 | 本人確認の水準・根拠を RS に示す必要が出たときの参照（属性値ではない） | 候補の OpenID Identity Assurance Schema 1.0 はページ上の状態表記が矛盾しており未確認 [^54]。結論には使わない |
| 資格の状態参照 | 長寿命の委任・エージェントの資格の状態参照。追跡されない設計を条件にする | VC 2.0 §4.10 [N][^41] |
| 利用目的（termsOfUse 相当） | 法域別の目的拘束を token で運ぶ場合 | VC 2.0 §5.5 [N][^41]、NA-022-2 |
| groups, roles, entitlements | 粗い認可属性。使う場合は SCIM の属性名 | RFC 9068 §2.2.3.1 SHOULD [N][^1]。v1 では発行しない |

- **D-9-3** 次は access token に入れない [D]。
  - 要求単位の trace id（D-8-1）
  - 権限の全量と groups・roles・entitlements（v1）。token に載せた役割は寿命の間更新されず、剥奪の反映が token 寿命に縛られ [D][A-027]、PDP の判定と二重管理になる（ADR-005 V10、ADR-006、ADR-011）[D]。
  - 氏名・メール等の個人属性。access token の内容は client から見え得るため、機微な claim は省く [N][^1]（RS-04#61、RFC 9068 §6）。
  - Verifiable Credential の本体と属性（D-9-4）
- **D-9-4** W3C VC Data Model 2.0 は holder が保持・提示する資格情報の形式で、access token の形式ではない [N][^41]。VC は認証（提示の検証）と PDP の属性入力として受け入れ、VC の属性を access token の claim に複写しないことを v1 の契約原則にする [D]（sec 案 D22-14 の移植）。理由は 3 つである [D]。
  - VC の状態による失効が token の寿命まで反映されなくなる。
  - 最小化に反する。
  - 将来 VC の形式が変わっても token 契約を壊さずに済む。
  - token に残せるのは、検証済み VC への参照（例: 検証イベントの ID）を情報 claim として追加する余地だけで、これは D-5-1 の「情報を足すだけの追加」に当たる [D]。
- **D-9-5** VC 2.0 の各 property と token 側の概念の対応は次のとおりである [D]。強度はいずれも最終起草者が 2026-10-15 に原典で確認した [N][^41]（独立検証は未実施）。

| VC 2.0 の property（原典の強度） | token 側の概念 | v1 の扱い | 将来の検討事項 |
|---|---|---|---|
| issuer（MUST。URL または URL の id を持つ object。§4.7） | iss | GA | 対応済み |
| credentialSubject（MUST。§4.8） | sub、tid、act | GA | 主体の種別は v1 で発行（D-9-1、ADR-017。整合調整で修正） |
| validFrom / validUntil（任意。使う場合の時点の前後関係が MUST。§4.9） | iat / nbf / exp | GA（exp・iat） | — |
| credentialStatus（type が REQUIRED。status の仕様は個人の追跡を可能にしてはならない: MUST NOT。§4.10） | 失効状態の参照 | 予約 | 状態参照を持たせる場合は追跡されない設計を条件にする |
| credentialSchema（値は 1 つ以上の data schema で MUST、各要素は type を MUST。§4.11） | profile 版 claim と DL-75 の JSON Schema | GA（profile 版） | claim の JSON Schema を契約で公開する |
| termsOfUse（値は 1 つ以上の利用条件ポリシーで MUST、各要素は type を MUST、id は MAY。§5.5） | 利用目的・同意の範囲 | 予約 | 目的拘束を token で運ぶか（NA-022-2、ADR-014） |
| evidence（使う場合は object または object の集合で MUST、各要素の type は REQUIRED。§5.6） | acr・amr、本人確認の根拠 | GA（acr/amr）／予約（根拠への参照） | IAL の根拠（ADR-002）を参照として運ぶか。最小化と両立する形が条件 |
| id（任意。使う場合は単一の URL で MUST。仮名性が要る場面で識別子が害になり得るとし、省略を許す。§4.4、§8.4 は長寿命の識別子による相関を警告） | jti、txn、sid | 内部だけで使う | 外部に出す token・イベントに一意 ID を出すときは相関による追跡を評価する |

### D-10 暗号の俊敏性と標準の寿命

- **D-10-1** 契約は署名 alg の値を固定せず、交渉の仕組みを凍結する [D][A-103]（evo 案 D7-1 の移植）。対象は、issuer 別 alg allowlist を検証側の版付き設定から読む規則（issuer metadata を allowlist の出所にしない。ADR-005 V1。整合調整で修正）、JWKS の取得と未知 kid での取り直し（OIDC Core §10.1.1 [N][^6]）、複数鍵の併存、外部契約に書く token の最大長（ADR-005 D10-2。整合調整で節番号を修正）である。
- **D-10-2** claim の追加は、PQC 署名による token の大型化（ML-DSA-65 で約 5.0KB の計算値: RS-11#62）と合わせて、profile 版ごとのサイズ上限の範囲で行う [D]。
- **D-10-3** SDO の文書でない仕様（OpenAPI、AsyncAPI、CloudEvents、OCSF）と IETF を離れた JSON Schema について、凍結版の仕様本文・メタスキーマ・方言 URI の写しを自社で保管する [D]（evo 案 D7-2 の移植、RS-16#5）。GA が依存する標準の状態は standards-status.md で四半期ごとに追跡する [D]。
- **D-10-4** 契約試験とモックの基本ツールは OSS の仕様・実装にする（Pact の仕様と OSS Broker、Microcks）[D]（evo 案 D7-3）。商用の上乗せは任意にとどめる [D]。

### D-10b 未決の論点（整合調整で追加）

| # | 論点 | 本書への影響 | 決める場 |
|---|---|---|---|
| U-01 | issuer の粒度（ADR-007 KD7-1 と ADR-021 K21-1 の対立） | 不可逆区分の issuer URL の値。負例ベクタ 3（issuer mix-up）の対象数 | DEC-3 |
| U-02 | `txn` を証跡の主キーにする範囲（D-8-3 と ADR-005 D9-3） | H-4 の合否基準の適用範囲。監査イベント（DL-77）の主キー欄の必須条件 | CTO＋CISO（ADR-005 H-20 の後） |
| U-04 | 判定記録への PDP 署名（ADR-013 D13-26 と ADR-011 D5-7） | DL-72 の自社拡張に署名欄を GA で置くか | ADR-013 KD13-6 と同時 |

- U-02・U-04 が DEC-8 の凍結の前に決まらない場合は、該当要素を preview に置く [D]（D-1-1 の規則の適用）。U-01 は不可逆区分の値なので preview に置けず、DEC-3 の決裁を DEC-8 の前提条件とする [D]。

### D-11 DEC-8 の決裁案（凍結の承認条件）

決める人: CTO＋CISO（DEC-8）。本書は決裁案であり、決定済みではない [D]。

| 選択肢 | 内容 | 帰結 |
|---|---|---|
| (1) 推奨: 条件付き凍結 | D-1〜D-10 の区分で v1 を凍結し、次の 5 条件の充足を承認条件にする | 並行開発を開始できる。preview 依存の consumer には改版が残る |
| (2) 段階凍結 | OIDC/OAuth と token 検証だけを先に凍結し、残りは Gate 3 の後 | 認可・監査の契約がないまま開発が始まり、自前実装が再生産される（§3 案 C） |
| (3) 凍結延期 | パイロットの実測後に一括凍結 | G-146 の並行開発を始められない |

推奨案の承認条件 [D]（sec 案 D22-17 の移植を含む）:

1. 少なくとも 1 つの主要言語で、SDK を使わず契約と負例ベクタだけで適合試験に合格した記録がある（G-140）。
2. 基盤チームと報告系統が異なる者が、ハンドブック・契約・モック・試験キットだけで模擬連携を作り、コード差分 0 で PoC 基盤へ切り替えられた（G-123）。
3. モックと PoC 基盤の負例ベクタの結果の不一致が 0 件（G-142）。
4. G-118〜G-122 と G-126 の判定が済んでいる（G-134）。
5. 凍結版の版とハッシュが固定され、決議に「凍結後の変更は互換性・非推奨ポリシーに従う」「不可逆なのは識別子だけ」が含まれる（G-134、D-1-3）。

---

## 3. 検討した選択肢

### 案 A 標準最大寄せ・全面凍結（draft・標準なしの領域も GA）

- **概要**: Transaction Tokens、CAEP Interop、AuthZEN search、Registry API の全体を v1 で GA にする [D]。
- **利点**: consumer から見た確定範囲が最も広く、並行開発の開始が最も単純になる [D]。
- **欠点**: draft が変わると GA 契約の破壊的変更になる [D]。Transaction Tokens は IESG 未提出で失効予定は 2027-01-31 [N][^10]、CAEP Interop は Final 化のレビューをやり直している [N][^55]。モデル管理は Gate 3 前の凍結になり G-120 に反するおそれがある [D]。
- **主要リスク**: GA の約束を破るか標準から乖離するかの二択に陥る [D]。
- **費用・要員の桁**: 破壊的変更 1 回あたり consumer 側 600〜1,500 人日（NA-022-3）[D][A-050]。
- **可逆性**: 低い（draft 由来の意味を戻すには major 版が要る）[D]。
- **この案が勝つ条件**: Transaction Tokens が RFC、CAEP Interop が Final になり、認可エンジンが選定済みの場合（その場合は本案の preview を GA に昇格すれば同じ結果になる）[D]。

### 案 B（採用）層別凍結＋必須負例＋薄い SDK＋二層試験＋退出経路

- **概要**: §2 のとおり。ops 案を土台に、sec 案の負例ベクタ・承認条件・相関 ID の列、evo 案の暗号の俊敏性・代替取引 ID・2 実装 PoC・仕様の写しの保管を移植した [D]。
- **利点**: GA を Final・RFC・Recommendation と製品非依存の最小自社契約に限るので、標準側の理由で破壊的変更が起きる余地が小さい [D]。セキュリティ不変条件を両側の CI で強制できる [D]。SDK の責務を絞るので A-054 の範囲で保守できる見込みがある [D][A-054]。
- **欠点**: preview（Txn-Token の claim 構成、search、モデル管理）を使う consumer に改版が残る [D]。4 区分と破壊的変更の定義表の教育負荷がある（R-138）[D]。負例 13 種の多言語保守が継続作業になる [D]。
- **主要リスク**: preview の既成事実化（D-1-2 の期限と KRI、DL-67 での申告で抑える）、負例ベクタ外の検証漏れ（R-1）[D]。
- **費用・要員の桁**: SDK 3 言語（NA-022-1）× 責務 5 つの保守を A-054 の PEP SDK・開発者支援 4 FTE の内側に収め、契約管理に 2 FTE を新設する（NA-022-4）[D][A-054]。負例ベクタの保守は両者の内側で賄う（NA-022-5）[D]。いずれも H-7 で実測して置き換える [D]。
- **可逆性**: 識別子は不可逆、その他は版付きで可逆 [D]。
- **この案が勝つ条件**: consumer 組織が 20 以上あり、計画期間中に製品の置換が 1 回以上起こり、draft と標準のない領域が契約全体の一部にとどまる場合 [D][A-052][A-104]。

### 案 C 最小凍結（OIDC/RFC 9068 と AuthZEN evaluation だけ）

- **概要**: Final の 2 系統だけを凍結し、他は製品選定と PoC の後に決める [D]。
- **利点**: 凍結の判断を誤る範囲が最も小さく、基盤側の初期作業が少ない [D]。
- **欠点**: 監査イベント、イベント配送、SSF/CAEP、token exchange が未定のままで、依存する連携（P-03 サービス間、P-08 イベント駆動など）は開発を始められない [D]。G-118 が列挙する契約を満たせない [D]。
- **主要リスク**: 未定の部分を各チームが独自に実装し、自前実装 240 サービス（A-112）と同じ形が再生産される [D][A-112]。暫定実装で tenant 照合が抜けたまま本番に出る（ATK-02）[D]。
- **費用・要員の桁**: 初期は小さいが、後からの統一は 1 回あたり数百〜千人日の桁（NA-022-3）[D]。
- **可逆性**: 高い。ただし暫定実装の回収は困難 [D]。
- **この案が勝つ条件**: Gate 3 までに本番を迎える依存サービスがパイロット 2〜3 件に限られることが計画で確定し、暫定方式（G-143）で吸収できる場合 [D]。

### 案 D 自社独自 API＋厚い必須 SDK（SDK を唯一の連携経路とする）

- **概要**: 独自の内部 context ヘッダ・認可 API・監査形式を定め、SDK にキャッシュ、fail-mode、retry、PDP 呼出し、監査を作り込む [D]。
- **利点**: 連携側の実装量が少なく立ち上がりが速い。挙動を中央で統一できる [D]。
- **欠点**: SDK の挙動が事実上の契約になり、SDK のない言語は連携できない（G-140 不適合）[D]。第三者が原典で検証できず、R-208 の過度依存に当たる [D]。製品置換（A-104）のたびに SDK の major 版を上げることになる [D]。
- **主要リスク**: SDK の供給網侵害が 300 サービスに一斉に波及する（ATK-07）[D]。版差のある SDK が併存し脆弱性修正の展開が律速になる。Microsoft Graph の SDK は直前のメジャー版を 12 か月しかセキュリティ修正で支援しない [V][^33]（RS-16#44）[D]。
- **費用・要員の桁**: 言語ごとに 1〜2 FTE、3 言語で 3〜6 FTE と見込み、A-054 の 4 FTE を超えるおそれがある [D][A-054]（NA-022-1）。
- **可逆性**: 低い [D]。
- **この案が勝つ条件**: 依存サービスの言語が 1〜2 に収れんし、外部連携がなく、基盤製品を置き換えない前提が置ける場合（A-104 と矛盾する）[D]。

### 案 E Pact 中心の consumer-driven 全面適用

- **概要**: 300 サービスすべてに Pact を必須化し、基盤側は全 pact の検証を CI で回す [D]。
- **利点**: consumer が実際に使う部分だけを精密に試験できる [V][^27]（RS-16#46）。
- **欠点**: Pact 自身が挙げる適合条件を満たしにくい [V][^27]（RS-16#47）。25 組織に同じ道具立てを強制する必要がある [D][A-052]。攻撃の負例は consumer の期待から生まれないため、セキュリティ不変条件が抜ける [D]。
- **主要リスク**: 契約が consumer の都合で緩む方向に進化する。Broker が運用上の単一障害点になる [D]。
- **費用・要員の桁**: provider 検証の件数は consumer 数に比例し、300 件の検証時間は TBD（H-11 で実測）[D]。
- **可逆性**: 中（調達契約に入れた義務を外す手続が要る）[D]。
- **この案が勝つ条件**: consumer が数十以下の自社チームに集約され、全ベンダーが調達契約で受け入れる場合 [D]。

### 案 F 製品のネイティブ API を契約にする

- **概要**: 先に IdP・認可エンジンを選び、その API を契約にする [D]。
- **利点**: 実装と契約の差がなく、モックが容易 [D]。
- **欠点**: Gate 3 前に製品を決める必要があり G-120 に反する [D]。製品固有の要素（OpenFGA の独自ヘッダ、AuthZEN の MUST と一致しない挙動 [V][^48]）がそのまま契約に入る [D]。
- **主要リスク**: 製品の健全性の変化がそのまま契約の変化になる。Aserto は SaaS を停止し営利事業を終えた [V][^49]（RS-07#69）[D]。
- **費用・要員の桁**: 初期は最小、置換時は 300 サービスの再連携 [D][A-050][A-104]。
- **可逆性**: 最も低い [D]。
- **この案が勝つ条件**: Plan B（DEC-9）でマネージド製品への全面依存が決裁され、置換を計画しない場合 [D]。

### 副論点: 相関 ID の置き場所

| 案 | 内容 | 勝つ条件 |
|---|---|---|
| access token に trace id を入れる | 棄却（D-8-1） | 1 つの access token を 1 要求でしか使わない運用（要求ごとの発行）が容量上成り立つ場合に限られる。DPoP は proof JWT を要求ごとに束縛するが access token 自体は寿命の間再利用されるため、DPoP では token は要求単位にならない [D]（evo 案 §3.7 の記述を修正） |
| Txn-Token の `txn` に寄せる（採用） | 取引単位の ID を伝播 | — |
| 自社の内部 context を自作する | 退出経路として保持（D-8-5） | Transaction Tokens が RFC にならない場合 |

### 副論点: 監査イベントの形式

| 案 | 内容 | 勝つ条件 |
|---|---|---|
| 正準を自社で定義し export 層で OCSF・CADF へ写像する（採用） | OCSF の版から独立させる | OCSF の minor 版が半年弱ごとに出る状況が続く場合（RS-10#1）[D] |
| OCSF をそのまま凍結する | 写像層が要らない | OCSF が SDO の標準になり版の寿命が長くなる場合 [D] |

---

## 4. 評価

### 4.1 評価軸

judge panel は次の 6 軸を 1〜5（5 が最良）で採点した [D]。

| 軸 | 内容 |
|---|---|
| requirement_coverage | R/G の対応範囲 |
| risk_reduction | 攻撃者類型・運用障害に対する残余リスクの低減 |
| feasibility_at_scale | 300 サービス・25 組織・A-054 の要員で実行できるか |
| evolvability_exit | 20 年の進化・製品置換・標準の状態変化への耐性 |
| evidence_quality | 原典との一致、根拠の強度 |
| reversibility_cost | 判断を誤ったときに戻す費用の小ささ |

### 4.2 採点表（判定者 × 提案 × 6 軸）

| 判定者 | 提案 | coverage | risk | feasibility | evolvability | evidence | reversibility | 合計（30 点満点） | 判定者の勝者 |
|---|---|---|---|---|---|---|---|---|---|
| 判定者 1 | sec | 4 | 5 | 3 | 4 | 4 | 3 | 23 | |
| 判定者 1 | ops | 5 | 4 | 5 | 4 | 4 | 5 | 27 | ops |
| 判定者 1 | evo | 4 | 4 | 4 | 5 | 4 | 4 | 25 | |
| 判定者 2 | sec | 5 | 5 | 3 | 4 | 4 | 4 | 25 | sec |
| 判定者 2 | ops | 4 | 3 | 5 | 4 | 3 | 4 | 23 | |
| 判定者 2 | evo | 4 | 4 | 3 | 5 | 4 | 4 | 24 | |
| 判定者 3 | sec | 5 | 5 | 3 | 4 | 4 | 3 | 24 | |
| 判定者 3 | ops | 4 | 4 | 5 | 4 | 4 | 4 | 25 | ops |
| 判定者 3 | evo | 4 | 4 | 3 | 5 | 4 | 3 | 23 | |
| **合算** | sec | 14 | 15 | 9 | 12 | 12 | 10 | **72** | 1 票 |
| **合算** | ops | 13 | 11 | 15 | 12 | 11 | 13 | **75** | 2 票 |
| **合算** | evo | 12 | 12 | 10 | 15 | 12 | 11 | **72** | 0 票 |

- 集計上の勝者は ops（2 票、合算 75 点）である [D]。sec と evo は合算同点（72 点）で、sec は 1 票を得た [D]。
- 各起草者の §4 の自己採点（加重合計）は、3 案とも計算誤りがあると判定者 3 が指摘した [D]。本書の判定には自己採点を使わず、上表の judge panel の採点だけを使う [D]。

### 4.3 判定者間の不一致と、本書での扱い

| 論点 | 不一致の内容 | 本書での扱い |
|---|---|---|
| ops の risk_reduction（4／3／4） | 判定者 2 は、必須負例が 8 種に留まり、decision_id と Registry API を preview にした点を重く見た | sec の 13 種を移植し（D-6-2）、decision_id と tuple 操作を GA に上げた（D-2） |
| Relationship/Model Registry API の区分 | 判定者 1 は ops の preview を一貫していると評価し、判定者 2・3 は 240 サービス（A-112）の tuple 依存から GA を求めた | tuple 操作と不透明な consistency token は GA、モデル DSL とモデル管理は preview に分けた（D-2-1）。sec 案の自己矛盾（GA は標準準拠に限るとしながら標準のない tuple 操作を GA にした）は、D-1-1(b) の GA 条件を明文化して解消した |
| feasibility_at_scale（sec 3／3／3、evo 4／3／3） | 負例 13 種の多言語保守（sec）と SDK 4〜6 言語（evo）が A-054 の 4 FTE に収まるか | SDK は 3 言語（NA-022-1）、負例保守は NA-022-5 として H-7 で実測し、不合格を §8 のトリガーにした |
| evidence_quality（ops 4／3／4） | ops の VC 表の evidence・termsOfUse が未確認原典に依拠、出典の取違え | §4.4 のとおり原典で確認・修正した |
| 証跡の扱い | 判定者 2 は「規制当局が要求単位の署名付き証跡を求めた場合」に 4 層設計の見直しが要るとした | §8 のトリガーに加えた |

### 4.4 判定者が指摘した事実誤りの確認と修正

| 指摘 | 原典での確認結果 | 本書での修正 |
|---|---|---|
| sec: `sid` を「OIDC 由来」とし出典がない | `sid` を定義するのは OIDC Back-Channel Logout 1.0 §2.1（Front-Channel Logout と同一定義、OPTIONAL）で、Logout Token は sub か sid の少なくとも一方を MUST で含む [N][^42] | N-p と D-9-1 に原典と強度を記した |
| sec: D22-03（GA は標準準拠に限る）と、標準のない tuple 操作の GA が矛盾 | 指摘どおり | D-1-1 に (b) の条件を置き、tuple 操作をその条件で GA にした |
| sec: ver の理由が「D22-14」を参照（正しくは D22-12） | 指摘どおり | 本書では制約強化の扱いを D-5-1 に一本化した |
| sec: 緊急変更の例外を「どの提供者も同じ扱い」と断定 | RS-16#81 は 3 例（RS-16#25, #28, #41）からの [D] の一般化 | D-5-5 で「3 例は例外を設けている」と事実の範囲に限った |
| sec: §4 の加重合計の計算誤り | 判定者 3 の再計算どおり | 自己採点を判定に使わない（§4.2） |
| ops: Google Cloud の 12 か月に [^29]（Microsoft Graph）と [^28]（AIP-180/185）を付けた | 根拠は Google Cloud Terms of Service §1.4(e)（RS-16#41、確認日 2026-10-03） | D-5-4 で [^34] を付けた |
| ops: VC の evidence・termsOfUse を本文未確認のまま使用 | 最終起草者が 2026-10-15 に §5.5・§5.6 の本文を確認した（termsOfUse は 1 つ以上の利用条件ポリシーで MUST・各要素の type が MUST、evidence は使う場合 object または集合で MUST・type が REQUIRED）[N][^41] | D-9-5 の表に原典の強度を記した。独立検証は未実施と明記した |
| ops: credentialSchema の表記が原文と異なる可能性 | 原文 §4.11 は "The value of the credentialSchema property MUST be one or more data schemas" と "Each credentialSchema MUST specify its type" で、表記は原文と一致していた [N][^41] | type の MUST を補って D-9-5 に記した |
| ops: groups/roles の陳腐化の根拠に RS-04#66 を使用 | RS-04#66 は RFC 8693 の token 検証と act の扱いで、役割 claim の陳腐化を述べていない | D-9-3 の根拠を A-027 の寿命と ADR-005 V10・ADR-006 からの設計推論 [D] に改めた |
| ops: §4.2 の加重合計の計算誤り | 指摘どおり（順位は不変） | 自己採点を判定に使わない |
| evo: acr/amr/auth_time と act を v1 で発行しない予約にした | ADR-005 D6-4 は privileged 操作の step-up を必須とし、D1-4・V10 は act を運ぶ | D-9-1 で v1 の発行対象にした |
| evo: 最終更新 2026-10-03 と確認日 2026-10-15 の不整合 | 指摘どおり | 本書の最終更新を実際の原典確認日に合わせ、メタ情報に注記した |
| evo: DPoP で access token が 1 要求単位になるとした | DPoP が要求ごとに束縛するのは proof JWT で、access token は寿命の間再利用される | §3 副論点の表で記述を改めた |

### 4.5 3 提案にない論点で、判定から追加したもの

- cnf を v1 で凍結すると、共有シークレットだけのサービス 45 と独自セッション 105（A-110）に sender constraint の実装を求めることになる [D][A-110]。claim の名前と意味は v1 で凍結するが、cnf を必須にする範囲と時期は移行の波（DL-31、ADR-027）に割り当て、DPoP replay の負例は sender-constrained token を受ける consumer に限って必須にした（D-6-2 の 9）[D]。
- gateway による未定義ヘッダ除去の障害時の縮退と切戻し（D-3-4）[D]。
- 監査の再構成率の合否基準を TBD から 100% に置き換えた（D-8-3、H-4）[D]。
- 要求単位の署名付き証跡を規制が求めた場合の見直しトリガー（§8）[D]。

---

## 5. 決定理由と棄却理由

**採用理由（案 B）**: 破壊的変更 1 回の consumer 側費用が数百〜千人日の桁（NA-022-3）になるため、移行を伴う変更の回数を減らすことを最優先にした [D][A-050]。自治体標準化では、仕様の版を固定しても 34,366 システムのうち 10,013（29.1%）が期限までに移行できず、主因に事業者のリソースひっ迫が挙がっている [M][^38]（RS-16#78）。このため GA を Final・RFC・Recommendation と製品非依存の最小自社契約に限り、draft 依存は期限付き preview に隔離する [D]。そのうえで、ops 案に不足していたセキュリティ不変条件の網羅（sec）と、20 年の退出経路（evo）を移植した [D]。

| 棄却した案 | 棄却理由（棄却仮説として traceability/rejected-hypotheses.md へ集約） | 再検討する条件 |
|---|---|---|
| 案 A 全面凍結 | 「draft を含めて GA にすれば連携側の不確実性が減る」という仮説は、draft の変更が GA 契約の破壊的変更に変わり、移行費（NA-022-3）と R-022 の強制移行凍結に衝突するため成り立たない [D] | Transaction Tokens の RFC 化、CAEP Interop の Final 化、Gate 3 の完了 |
| 案 C 最小凍結 | 「凍結しなければ誤りもない」という仮説は、未定の部分が独自実装で埋まり後の統一費用が生じ、G-118 を満たせないため成り立たない [D][A-112] | Gate 3 までに本番を迎える依存サービスがパイロットに限られることが計画で確定した場合 |
| 案 D 独自 API＋厚い SDK | 「SDK で挙動を統一すれば速く安い」という仮説は、SDK が事実上の契約になり、SDK のない言語が連携できず（G-140）、置換（A-104）と供給網侵害の波及で費用とリスクが増えるため成り立たない [D] | 言語が 1〜2 に収れんし、外部連携と置換の前提がなくなった場合 |
| 案 E Pact 全面 | 「consumer-driven を全員に課せば互換性が守られる」という仮説は、Pact 自身の適合条件 [V][^27] と 25 組織の道具立ての不一致、負例の欠落から成り立ちにくい [D] | consumer が数十以下の自社チームに集約された場合 |
| 案 F 製品ネイティブ API | 「先に製品を決めればその API を契約にして手戻りがない」という仮説は、G-120 に反し、製品の健全性の変化がそのまま契約の変化になるため成り立たない [D]（RS-07#68, #69） | Plan B（DEC-9）で置換を計画しないことが決裁された場合 |
| access token に trace id を入れる | 「認可後の claim に trace id を付ければ一貫した要求の証跡になる」という仮説は、token が再利用されること、要求単位の発行で負荷が A-040 の桁になること、trace が攻撃者に制御され sampling で欠落することから成り立たない [N][^17][^46][D][A-027][A-040][A-043] | 署名付きで要求単位に発行される標準の相関 claim が Final・RFC になった場合。または規制が要求単位の署名付き証跡を求めた場合（§8） |
| groups/roles/entitlements を v1 の token に入れる | 剥奪の反映が token 寿命に縛られ、PDP の判定と二重管理になる [D][A-027] | PDP を使わない連携パターンで、短寿命と組み合わせる例外を審査会が承認した場合 |
| VC の属性を token claim に複写する | 失効の反映、最小化、形式変更への耐性の 3 点で不利 [D] | VC を token 形式として直接受け入れる標準 profile が Final になった場合 |
| acr・act を v1 で予約にとどめる（evo 案） | ADR-005 の D6-4（step-up 必須）と D1-4・V10（act を運ぶ）が前提とする発行と整合しない [D] | ADR-005 側で step-up と act の方針が撤回された場合 |
| Registry API 全体を preview にする（ops 案） | 自前認可 240 サービス（A-112）の tuple 書込みが短い非推奨期間の preview に乗る [D] | Gate 3 の製品選定で tuple 操作の契約を変えざるを得なくなった場合（§8） |
| OCSF をそのまま凍結する | minor 版の更新が速く SDO の標準でない [D]（RS-10#1, #2） | OCSF が SDO の標準になった場合 |

---

## 6. 帰結

### 6.1 良い帰結

- 連携側は、契約 v1・生成モック・負例ベクタだけで開発と自己判定を始められる [D]（G-121, G-122）。
- 製品・エンジンを置き換えても、GA の範囲では連携側のコードを変えずに済む見込みがある。H-3 で確かめる [D]（G-066, G-120）。
- 監査上は `jti`/`sid`・`txn`・`decision_id`・`trace_id` で「どの認証を経て、どの取引の中で、どの判定によって通ったか」を再構成できる。trace の欠落や偽造に左右されない [D]（D-8）。
- 将来の claim 語彙（発行元 IdP、保証の根拠、状態参照、利用目的）を、v1 の consumer を壊さずに追加できる（N-a と予約名前空間）[D]。主体の種別は整合調整で v1 の発行対象へ移した [D]。

### 6.2 悪い帰結

- preview（Txn-Token の claim 構成、search、モデル管理、AuthZEN の一部拡張）を使う consumer は改版に追随する必要がある [D]。
- 4 区分、破壊的変更の定義表、負例 13 種の教育負荷が生じる（R-138）[D]。
- 自社 profile（AuthZEN 拡張、正準監査スキーマ、claim 名前空間、OCSF 写像）の保守が 20 年続く [D]。
- SDK を提供しない言語のチームは、契約からの自前実装と適合試験に工数がかかる [D]。

### 6.3 残余リスクと受容者案

| ID | 残余リスク | 統制 | 受容者案 |
|---|---|---|---|
| RR-1 | 負例ベクタにない検証漏れ | pentest・red team（R-183）、ベクタの継続追加、第三者による網羅レビュー | CISO |
| RR-2 | Transaction Tokens の改訂・失効 | preview 区分、adapter、D-8-5 の代替取引 ID | CTO＋CISO |
| RR-3 | preview の既成事実化（事実上の GA） | 期限と KRI（D-1-2）、DL-67 での申告、consumer 台帳 | CTO |
| RR-4 | 未知 claim を無視する規則により旧 PEP が新しい制約を無視する | 制約強化を破壊的変更として扱う（D-5-1）、D-4-4 の版計測 | CTO |
| RR-5 | SDK の供給網侵害 | 薄い SDK、SDK なしの経路の維持、署名付き配布（ATK-07） | CISO |
| RR-6 | AuthZEN 1.0 Final に準拠する実装が 2 種そろわない | D-6-6、adapter、ADR-011 と再審議 | CTO |
| RR-7 | 予約 claim の意味が将来の標準と食い違う | 標準の claim が出たら別名を並行発行し非推奨にする | CTO＋CISO |
| RR-8 | 契約の解釈が組織ごとにずれる（RS-16#79 の課題の再発） | 負例ベクタ、参照実装、FAQ・正誤表 | CTO（プラットフォームチーム長） |
| RR-9 | 暫定方式（G-143）の期間中、契約外の認可が残る | 残余リスク台帳への登録と切替期限 | 事業オーナー＋CISO |
| RR-10 | 非推奨期間の延長が続き旧版保守が長期化する（RS-16#40 の先例） | DL-70 の延長基準 | CTO |

### 6.4 依存サービス・連携開発者への影響

- 義務は次の 5 点に絞る [D]。
  1. 使う契約の版を宣言する。
  2. 下層試験（必須負例 13 種を含む）に自チームの CI で合格する。
  3. `Txn-Token` と `traceparent` を無改変で下流へ渡す。
  4. 監査イベントに `txn` を記録する。
  5. 未知の claim は無視し、開いた enum の未知値は deny 側へ fallback し、access token の内容を解析しない。
- preview への依存は Definition of Ready（DL-67）で申告する [D]。
- 主要 consumer（edge、BFF、PEP sidecar、監査収集）は Pact の登録義務を負う [D]。
- 禁止事項（D-3-2）を DL-62・DL-68 と発注仕様の条項案（G-129）に入れる [D]。
- 現行方式から移る 300 サービス（A-110）は凍結後に移行の波へ割り当て、要員を確保できない組織と cnf 導入が先行条件になるサービス（共有シークレットのみ 45）は後続の波に回す [D][A-052][A-110]。

### 6.5 運用・要員への影響

- 契約管理 2 FTE の新設（NA-022-4）と、SDK 3 言語の保守を A-054 の 4 FTE に収めることが前提になる [D][A-054]。成り立たない場合は §8 のトリガーで見直す。
- 契約変更審査会は年 2 回の改定日と臨時の例外審議に限って開き、常設の重い承認手続にしない [D]（RS-16#59）。
- 疑義窓口・FAQ・正誤表、consumer 台帳、非推奨の利用計測を運用する（G-145）[D]。
- 仕様の写しの保管と標準の状態の四半期棚卸し（D-10-3）を契約管理の業務に含める [D]。

---

## 7. 検証

TC-ID は未採番である（DL-22 で採番する）[D]。

| # | 仮説 | TC 案 | 合否基準 |
|---|---|---|---|
| H-1 | モックだけで開発した consumer を PoC 基盤に切り替えてもコードを変えずに動く（G-123） | 基盤チームと報告系統が異なる者が模擬サービスを開発し、切り替える | コード差分 0、文書不備による質問はすべて是正済み |
| H-2 | 未知の claim・parameter・header を全 SDK と代表的な PEP が無視し、未知の `crit` を拒否する。alg 変更と鍵 rotation を契約の変更なしで吸収できる（D-10-1） | 負例注入（RS-16 §5.2-2）。署名 alg を ES256 から PQC 方式の試験鍵へ切り替え、SDK 版 N・N−1・N−2 で実行 | 無視による継続 100%、crit での拒否 100%、契約の差分 0。取り直しまでの時間と失敗率を記録（閾値 TBD、所有者 CTO、DL-20） |
| H-3 | 同じ AuthZEN 契約の裏で PDP を 2 種差し替えても利用側のコードが変わらない（G-066、D-6-6） | 差替え演習。X-Request-ID の往復を負例に含める（OpenFGA は返さない: RS-07#68） | 利用側の差分 0、契約試験の全件合格、GA 契約ごとに独立 2 実装で動作 |
| H-4 | 4 層の識別子で一貫したリクエストを再構成できる（D-8） | 3 hop の呼出し連鎖で trace sampling を DROP にし、監査から再構成する。trace_id を偽造した要求を混ぜる | 再構成率 100%。trace_id を偽造しても判定記録が変わらない |
| H-5 | 契約違反の変更は merge 前に止まる（G-142） | 既定値の変更、閉じた enum への値の追加、claim の意味の変更、制約を強める claim の追加を意図的に混入させる | 全件停止。スキーマ差分だけでは検出できない種類の比率も記録する（RS-16#82） |
| H-6 | 非推奨の計測で未移行 consumer を全件特定できる（D-4-4） | 模擬の非推奨（RS-16 §5.2-5） | 特定漏れ 0 件 |
| H-7 | 契約管理 2 FTE（NA-022-4）と SDK 3 言語の保守（A-054 の 4 FTE）で、パイロットの疑義対応、正誤表、負例ベクタの保守を回せる。破壊的変更 1 回の consumer 側移行費が NA-022-3 の範囲に入る | パイロット 2〜3 サービス（少なくとも 1 件は報告系統が別のベンダー）の疑義件数・回答時間・保守工数・移行人日を記録（RS-16 §5.2-9） | 回答時間の目標は TBD（所有者 CTO、DL-20・G-144）。工数が 4＋2 FTE を超えない。移行人日が 2〜5 人日／サービスから 1 桁以上外れない |
| H-8 | モックと PoC 基盤は同じベクタに同じ結果を返す（D-6-3） | 必須負例 13 種と正例を両方に流す | 不一致 0 件 |
| H-9 | OpenAPI 3.1／AsyncAPI 3.x を採用候補のツールが扱える | 生成・lint・差分の確認（RS-16 §5.2-8） | 全ツールで成功 |
| H-10 | Txn-Token adapter を外して自社形式の取引 ID に差し替えても、監査の `txn` 欄の意味が変わらない（D-8-5） | adapter の差替え演習 | consumer の差分 0 |
| H-11 | 並行開発の待ちと手戻りが事前登録基準内に収まる（G-146）。provider 検証の時間が CI に収まる | パイロットの 4 指標。合成 consumer 50・300 件で provider 検証時間を測る | 4 指標が事前登録基準内（基準値 TBD、所有者 CTO、DL-22）。検証時間は TBD |

- 非推奨期間、SDK の版差、脆弱性修正の期限、オンボーディングのリードタイムの数値は DL-20・DL-70 と BIA に紐づけて決める（TBD）[D]。
- **第三者評価で確かめること** [D]
  - 契約と負例ベクタが、攻撃者類型のうち契約に関わる類型（ATK-02, ATK-05, ATK-06, ATK-07, ATK-10）を網羅しているか。
  - 契約一式が、引用した標準の規範（RFC 9068 の REQUIRED claim、AuthZEN の MUST 等）に反していないか。
  - 契約外依存の検出（D-3）の有効性、sandbox と本番の信頼の分離（G-141）。
  - 相関 ID に個人識別情報が入らないこと（Trace Context §6）。
  - SDK の供給網統制（署名、SBOM）、OIDC RP・OP の OpenID 適合試験の結果。
  - 本書が research ノート外で確認した W3C VC 2.0 と OIDC Back-Channel Logout 1.0 の引用の独立検証。

---

## 8. 再検討トリガーと見直し時期

| 種別 | トリガー | 見直す決定 |
|---|---|---|
| 標準の状態 | Transaction Tokens の RFC 化、大幅改訂、または 2027-01-31 の失効（RS-06#29） | D-2・D-8。RFC 化なら GA 昇格を審議、失効・大幅改訂なら D-8-5 の代替取引 ID へ移す |
| 標準の状態 | CAEP Interoperability Profile の Final 化（RS-04#79） | SSF/CAEP の GA 範囲 |
| 標準の状態 | AuthZEN の後続版、search の改訂、COAZ・Obligations の Final 化（RS-07#67） | preview 範囲の縮小 |
| 標準の状態 | OpenAPI 3.2 系・JSON Schema 次期安定版の公開と主要ツールの対応 | 記述形式の版 |
| 標準の状態 | RFC 9068 errata 8802 の状態変化 [^60] | core claim |
| 標準の状態 | W3C VC 関連仕様の改訂、VC 提示プロトコルの Final 化、OpenID Identity Assurance の状態の確認 | D-9 の予約 claim |
| 製品の健全性 | 採用した AuthZEN 実装・AS の撤退・停止、AuthZEN 1.0 Final 準拠の実装が 2 種そろわない | D-6-6、例外台帳、ADR-011 |
| 製品の健全性 | 契約ツール（Pact Broker、Microcks）、CloudEvents・OCSF のガバナンスや成熟度の変化 | D-10-4、監査の写像 |
| 実測値の逸脱 | H-7 の不合格（4＋2 FTE に収まらない）、SDK が必要な言語が 4 以上になる（NA-022-1 の逸脱） | 要員見積りを主要な論点として再評価。運用費での案 B の優位が崩れる場合は負例の必須範囲と SDK 言語数を見直す |
| 実測値の逸脱 | 破壊的変更 1 回の consumer 側移行費が NA-022-3 から 1 桁以上外れる | 凍結範囲の広さ（案 A 寄りか案 C 寄りか） |
| 実測値の逸脱 | パイロット・第三者評価で負例ベクタにない検証漏れ（cross-tenant、typ 取違え等）が見つかる | 負例ベクタの追加と必須範囲の拡大 |
| 実測値の逸脱 | preview 依存の consumer 数が台帳上で想定（閾値 TBD）を超える、preview の期限超過 | 区分の見直し（GA 昇格の前倒しか区分設計の変更） |
| 実測値の逸脱 | H-1・H-3・H-4・H-8 の不合格、未移行 consumer 数（R-194.5）が非推奨期間内に減らない | 該当する契約と DEC-8 の承認条件 |
| 計画の変化 | Gate 3 までに本番を迎える依存サービスがパイロット 2〜3 件に限られることが確定 | 最小凍結（案 C）の再評価 |
| 計画の変化 | Gate 3 の製品選定で tuple 操作の契約を変えざるを得なくなる（G-120 違反） | D-2-1。Registry API を preview に戻す |
| 依存 ADR | ADR-005 の step-up（D6-4）・act の方針の変更 | D-9-1 の発行対象 |
| 規制 | 規制当局・監査人が要求単位の署名付き証跡（否認防止）を求める | D-8 の 4 層設計（trace_id に証拠価値を持たせない方針） |
| 規制 | 目的拘束・同意の範囲を token で運ぶ要件が法域で生じる（NA-022-2） | D-9-2 の利用目的の予約 claim |
| 規制 | 監査項目・保持に関わる規制の改正（RS-10 §2-15） | DL-77 の共通項目 |
| 定期 | 四半期ごとの標準の状態棚卸し（D-10-3）、年 2 回の改定日、Gate ごと、A-101 の再決裁周期（初回 3 年以内） | 全体 |

---

## 8A. v1.2 で判明した論点（2026-10-15 追記）

> 本節は v1.2 の同期（2026-10-15）で追記した。2 回目の模擬連携検証（13_integration-trial/room-booking/report.md。AI が依存サービスの開発チームを演じたもので、実在の連携チームの検証ではない）を受けた v1.2 の契約・連携文書の改訂で、本書の決定を変えずに契約へ落とそうとした際に見つかった不足である。**本書の決定（D 番号）は変えていない**。各論点は決めるまで契約側の暫定で動き、決めた時点で決定として本文に加える。AI エージェント（Claude）による追記で、人による照合・模擬パネルの判定・CTO/CISO の決裁を経ていない（CONVENTIONS §8）[D]。

CON-11 §14.5 H12-7、CON-17 §12 V12-XG-1、CON-18 HO12-AG-01 を受けた [D]。

| # | 出所 | 論点 | 関係する決定 | 契約側の暫定（決めるまで） | 決める人・期限（案） |
|---|---|---|---|---|---|
| V12-22-1 | CON-11 H12-7（room-booking L-2・M-6） | CON-11 §11.4 に v1.2 で加えた差し替え点（`AUTH_JOB_LEDGER_URL`・`EXTERNAL_GRANT_API_URL`・`AGENT_APPROVAL_CONSUME_URL`・`AUTH_CELL_ID`・`AUTH_JURISDICTION`）の名前を凍結の対象に含めるか。値（URL）は配置スナップショットで配り凍結しないが、名前は依存サービスのコードと設定に入る | D-3-2・D-4-2 | 名前は CON-11 §11.4 のまま使い、変える場合は CON-01 の通知の対象とする | CTO（契約変更審査会）、DEC-8 第 1 段の前 |
| V12-22-2 | CON-17 V12-XG-1、CON-18 HO12-AG-01 | v1.2 で新設した CON-17（外部付与 API）と CON-18（AI エージェント代理）は全 operation が preview で、D-2 の表に行がない | D-1・D-2 | preview として扱い、`x-freeze-class: preview` と期限（CON-17 `x-preview-expires`）で表す。CON-00 版 0.12 の一覧と DL-123・DL-124 に登録した | CTO、DEC-8 第 1 段の前 |

## 9. 依存関係

| 種別 | 対象 | 関係 |
|---|---|---|
| ADR | ADR-005（token profile） | core claim、検証規則 V1〜V14、typ、V9・V10・V13、D1-4、D6-4、D10-2 のサイズ上限（節番号は整合調整で修正） |
| ADR | ADR-021（不可逆識別子） | 不可逆区分の形式と永続性 |
| ADR | ADR-016（versioning・deprecation） | 非推奨期間・preview 期限の数値 |
| ADR | ADR-006（失効・継続評価） | SSF/CAEP の受信義務、剥奪反映の数値、派生 token の寿命 |
| ADR | ADR-009・ADR-026（workload identity・非同期委任） | Txn-Token の発行、mTLS による呼出し元認証 |
| ADR | ADR-010・ADR-011（認可エンジン・PEP–PDP API） | consistency token、AuthZEN 自社拡張、2 実装目 |
| ADR | ADR-014（監査） | 正準スキーマ、4 層識別子の結合と改ざん検知 |
| ADR | ADR-013（cell・fail-mode） | 共有実装と global 部品（G-042） |
| ADR | ADR-015（暗号の俊敏性） | D-10 |
| ADR | ADR-002・ADR-017（保証水準・AI エージェント） | 予約 claim の採否 |
| ADR | ADR-018（出口戦略）・ADR-020（FAPI 適用範囲）・ADR-027（移行） | 退出、RP 適合試験の必須範囲、移行の波 |
| 設計文書 | ARC-15（04_architecture/claims-catalog.md、DL-115） | claim ごとの採否・PII・理由の詳細 |
| 設計文書 | DL-16、DL-20、DL-22、DL-24、DL-25、DL-27、DL-31、DL-54、standards-status.md | token profile、数値契約、PoC、runbook、監査、運用・要員、段階導入、参照アーキテクチャ |
| 契約 | DL-69〜DL-80（11_contracts 一式） | 本書の決定を各契約に実装する |
| 連携ハンドブック | DL-62〜DL-68 | 手順、Definition of Ready、FAQ |
| 決裁 | DEC-3（本書）、DEC-8（凍結、D-11）、DEC-9（Plan B、案 F が勝つ条件） | 承認 |

---

## 対応表（R/G）

| ID | 本文の節 | 閉じ方 | 状態 |
|---|---|---|---|
| R-105 version negotiation | D-4-4, D-5, D-10-1, H-2 | C | 要実測 |
| R-109 versioning・後方互換・rollback | D-1, D-2, D-5, H-5 | C | 要実測（方式は本書で決定） |
| R-208 過度依存の回避 | D-1-1, D-3, D-4, D-6-6, D-10-4, 案 D・F の棄却 | A | 本書で閉じた |
| R-022 不可逆な標準化・強制移行の凍結 | D-1-3, D-11 | B | 決裁案まで |
| R-108 deprecation policy | D-5-3〜D-5-5 | B | 決裁案まで（数値は ADR-016・DL-70） |
| R-118 監査ログの目的 | D-8 | A | 本書で閉じた（相関の目的。保持・地域は ADR-014） |
| R-062, R-071, R-172 | D-6 | C・D | 要実測・要第三者 |
| R-194 | D-4-4, D-5, H-6 | B・C | 決裁案まで／要実測 |
| R-206 | D-2（token exchange）, D-8 | C | 要実測 |
| R-209 | D-9-2 | A | 本書で閉じた（予約まで） |
| R-249 | D-9-3 | A | 本書で閉じた |
| G-042 共通の契約と共有実装の区別 | D-1-4 | A | 本書は契約側を閉じた。global 部品の列挙と影響範囲は DL-54・ADR-013 |
| G-066 PDP 2 種の差替え | D-6-6, H-3 | C | 要実測 |
| G-120 製品選定からの独立 | D-1-1, D-2-1, D-3 | A | 本書で閉じた（変わり得る 3 箇所を列挙） |
| G-134 DEC-8 の凍結承認 | D-1-3, D-11 | B | 決裁案まで |
| G-140 SDK 方針 7 項目 | D-4-5 | A | 方針は本書で閉じた。言語の確定・支援期間・修正期限の値は TBD |
| G-088 | D-6-2, H-2 | C | 要実測 |
| G-102 | D-2（token exchange）, D-9-1（act） | C | 要実測 |
| G-118, G-119 | D-2 | A | 決定は本書、契約ファイルは DL-69〜DL-79 |
| G-121, G-122, G-142 | D-6, H-8, H-5 | C | 要実測 |
| G-123 | D-11 条件 2, H-1 | C | 要実測 |
| G-126 | D-5 | B | 決裁案まで |
| G-137 | D-2（SCIM ではなくライフサイクルイベント） | A | 本書で閉じた（配送規約は DL-77 系） |
| G-141 | D-6-4 | C | 要実測 |
| G-143, G-144, G-145 | D-2-3, §6.4, §6.5 | B・C | 決裁案まで／要実測 |
| G-146 | H-11 | C | 要実測 |

## 残課題

| 課題 | 担当（案） | 閉じるゲート |
|---|---|---|
| 新規仮定 NA-022-1〜NA-022-5 の前提台帳への追加 | 前提台帳の所有者 | DEC-8 前 |
| preview の期限、GA・preview の非推奨期間、SDK の版差・支援期間・脆弱性修正期限の数値（TBD） | CTO＋CISO（ADR-016・DL-70・DL-20） | DEC-8 前 |
| SDK 提供言語の確定（as-is 調査） | CTO | DEC-8 前 |
| AuthZEN の 2 実装目の選定と H-3 | CTO | G3（Gate 3 前） |
| H-1〜H-11 の実測 | PoC チーム（DL-22） | G3〜G4 |
| W3C VC 2.0・OIDC Back-Channel Logout 1.0 の引用の独立検証、OpenID IDA の状態確認 | 作成者以外の検証者 | DEC-3 前 |
| global 部品の列挙と影響範囲（G-042 の残り） | DL-54・ADR-013 の起草者 | 段階1 |
| claim ごとの PII 区分と採否の詳細 | ARC-15（DL-115） | DEC-8 前 |
| 第三者評価（§7） | CISO | 段階2 |
| DEC-3・DEC-8 の決裁（実在の CTO/CISO による） | CTO＋CISO | DEC-3／DEC-8 |

---

## 参考文献

[^1]: IETF (V. Bertocci)『RFC 9068: JSON Web Token (JWT) Profile for OAuth 2.0 Access Tokens』2021-10. https://www.rfc-editor.org/rfc/rfc9068 （参照箇所: §2.1, §2.2, §2.2.1, §2.2.2, §2.2.3, §2.2.3.1, §4, §5, §6、確認日: 2026-10-03）（RS-04#60, #61）
[^2]: M. Jones, J. Bradley, N. Sakimura『JSON Web Token (JWT)』RFC 7519, 2015-05. https://www.rfc-editor.org/rfc/rfc7519 （参照箇所: §4、確認日: 2026-10-03）（RS-16#14）
[^3]: M. Jones, J. Bradley, N. Sakimura『JSON Web Signature (JWS)』RFC 7515, 2015-05. https://www.rfc-editor.org/rfc/rfc7515 （参照箇所: §4.1.11、確認日: 2026-10-03）（RS-16#16）
[^4]: OpenID Foundation『OpenID Connect Discovery 1.0 incorporating errata set 2』Final, 2023-12-15. https://openid.net/specs/openid-connect-discovery-1_0.html （参照箇所: §3, §7、確認日: 2026-10-03）（RS-16#17）
[^5]: M. Jones, N. Sakimura, J. Bradley『OAuth 2.0 Authorization Server Metadata』RFC 8414, 2018-06. https://www.rfc-editor.org/rfc/rfc8414 （参照箇所: §3.3、確認日: 2026-10-03）（RS-16#18）
[^6]: OpenID Foundation『OpenID Connect Core 1.0 incorporating errata set 2』Final, 2023-12-15. https://openid.net/specs/openid-connect-core-1_0.html （参照箇所: §10.1.1、確認日: 2026-10-03）（RS-16#19）
[^7]: O. Gazitt, D. Brossard, A. Tulshibagwale (Eds.), OpenID AuthZEN WG『Authorization API 1.0』Final, 2026-01-11. https://openid.net/specs/authorization-api-1_0.html （参照箇所: §4, §5, §8, §10.1.3、確認日: 2026-10-03）（RS-07#60〜#66）
[^8]: OpenID Foundation『Authorization API 1.0 Final Specification Approved』2026-01-12. https://openid.net/authorization-api-1-0-final-specification-approved/ （参照箇所: 告知本文と投票結果、確認日: 2026-10-03）（RS-16#22、RS-07#60）
[^9]: IETF (M. Jones ほか)『RFC 8693: OAuth 2.0 Token Exchange』2020-01. https://www.rfc-editor.org/rfc/rfc8693 （参照箇所: §2.1, §4.1, §4.4、確認日: 2026-10-03）（RS-04#66）
[^10]: A. Tulshibagwale, G. Fletcher, P. Kasselman / IETF『Transaction Tokens』draft-ietf-oauth-transaction-tokens-11（Internet-Draft、WG Consensus: Waiting for Write-Up）, 2026-07-30. https://datatracker.ietf.org/doc/html/draft-ietf-oauth-transaction-tokens-11 （参照箇所: §9.1, §9.2, §12, §13.1, §13.2, §13.12, §13.13, §15.2、確認日: 2026-10-03）（RS-06#29〜#42）
[^11]: OpenID Foundation Shared Signals WG『OpenID Shared Signals Framework Specification 1.0』Final, 2025-08-29. https://openid.net/specs/openid-sharedsignals-framework-1_0-final.html （参照箇所: §4.1.1, §4.1.5、確認日: 2026-10-03）（RS-04#77）
[^13]: IETF『RFC 7643 System for Cross-domain Identity Management: Core Schema』2015-09. https://www.rfc-editor.org/rfc/rfc7643 （参照箇所: §3.1, §4.1.1、確認日: 2026-10-03）（RS-03#75）
[^14]: IETF『RFC 7644 System for Cross-domain Identity Management: Protocol』2015-09. https://www.rfc-editor.org/rfc/rfc7644 （参照箇所: §6 Multi-Tenancy、確認日: 2026-10-03）（RS-03#76）
[^15]: Open Cybersecurity Schema Framework『ocsf-schema Release 1.9.0』2026-08-03. https://github.com/ocsf/ocsf-schema/releases/tag/1.9.0 （参照箇所: releases 一覧の 1.5.0〜1.9.0 の公表日、確認日: 2026-10-03）（RS-10#1）
[^16]: Y. Sheffer, D. Hardt, M. Jones『JSON Web Token Best Current Practices』RFC 8725 (BCP 225), 2020-02. https://www.rfc-editor.org/rfc/rfc8725 （参照箇所: §3.1〜§3.12、確認日: 2026-10-03）（RS-04#62）
[^17]: W3C『Trace Context』W3C Recommendation, 2021-11-23. https://www.w3.org/TR/trace-context/ （参照箇所: §6, §6.1, §6.2, §7.2, §8、確認日: 2026-10-03）（RS-10#16〜#18）
[^18]: CloudEvents『CloudEvents - Version 1.0.2』（タグ ce@v1.0.2, 2022-02-06）. https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md （参照箇所: Context Attributes の id, source, specversion, type, dataschema, Privacy and Security、確認日: 2026-10-03）（RS-16#9, #10、RS-17#32）
[^19]: AsyncAPI Initiative『AsyncAPI Specification 3.1.0』. https://www.asyncapi.com/docs/reference/specification/v3.1.0 （参照箇所: Versions、確認日: 2026-10-03）（RS-16#6）
[^20]: OpenAPI Initiative『OpenAPI Specification v3.2.1』2026-09-10. https://spec.openapis.org/oas/v3.2.1.html （参照箇所: §2.1 Versions, Appendix A、確認日: 2026-10-03）（RS-16#1, #2）
[^21]: OpenAPI Initiative『OpenAPI Specification v3.1.2』2025-09-19. https://spec.openapis.org/oas/v3.1.2.html （参照箇所: Schema Object, jsonSchemaDialect、確認日: 2026-10-03）（RS-16#3）
[^22]: JSON Schema『Specification』. https://json-schema.org/specification （参照箇所: 現行版 2020-12 の段落、確認日: 2026-10-03）（RS-16#4）
[^23]: G. Dennis (JSON Schema)『Moving Toward a Stable Spec』2025-01-13. https://json-schema.org/blog/posts/stable-json-schema （参照箇所: Publication Process, Compatibility、確認日: 2026-10-03）（RS-16#5）
[^24]: M. Nottingham, E. Wilde, S. Dalal『Problem Details for HTTP APIs』RFC 9457, 2023-07. https://www.rfc-editor.org/rfc/rfc9457 （参照箇所: §3.2、確認日: 2026-10-03）（RS-16#12）
[^25]: S. Dalal, E. Wilde『The Deprecation HTTP Response Header Field』RFC 9745, 2025-03. https://www.rfc-editor.org/rfc/rfc9745 （参照箇所: §2.1, §4, §5, §7、確認日: 2026-10-03）（RS-16#34）
[^26]: E. Wilde『The Sunset HTTP Header Field』RFC 8594, Informational, 2019-05. https://www.rfc-editor.org/rfc/rfc8594 （参照箇所: §3, §8、確認日: 2026-10-03）（RS-16#35）
[^27]: Pact Foundation『When to use Pact』Pact Docs, 最終更新 2022-04-13. https://docs.pact.io/getting_started/what_is_pact_good_for （参照箇所: What is Pact good for? / What is it not good for?、確認日: 2026-10-03）（RS-16#46, #47）
[^28]: Pact Foundation『Pending pacts』Pact Docs. https://docs.pact.io/pact_broker/advanced_topics/pending_pacts （参照箇所: 定義と解決する問題、確認日: 2026-10-03）（RS-16#50）
[^29]: Microcks『Main Concepts』Microcks Documentation. https://microcks.io/documentation/overview/main-concepts/ （参照箇所: Artifacts, Mocks, Tests、確認日: 2026-10-03）（RS-16#55）
[^30]: Google『AIP-180: Backwards compatibility』Approved. https://google.aip.dev/180 （参照箇所: 互換性の 3 類型, Enum values, Default values、確認日: 2026-10-03）（RS-16#23, #24）
[^31]: Google『AIP-181: Stability levels』. https://google.aip.dev/181 （参照箇所: Alpha, Beta, Stable, Emergency changes、確認日: 2026-10-03）（RS-16#25）
[^32]: Google『AIP-185: API Versioning』. https://google.aip.dev/185 （参照箇所: Channel-based versioning、beta の非推奨期間、確認日: 2026-10-03）（RS-16#26）
[^33]: Microsoft『Versioning, support, and breaking change policies for Microsoft Graph』Microsoft Learn, ms.date 2024-11-07（更新 2025-08-06）. https://learn.microsoft.com/en-us/graph/versioning-and-support （参照箇所: API contract and nonbackward compatible changes, Support policy and deprecation information、確認日: 2026-10-03）（RS-16#27, #28, #44）
[^34]: Google『Google Cloud Terms of Service』最終更新 2026-09-02. https://cloud.google.com/terms （参照箇所: §1.4(e) Discontinuation of Services、確認日: 2026-10-03）（RS-16#41）
[^35]: The Kubernetes Authors『Kubernetes Deprecation Policy』最終更新 2026-08-21. https://kubernetes.io/docs/reference/deprecation-policy/ （参照箇所: Rule #1〜#4b、REST resources の Warning header と metric、確認日: 2026-10-03）（RS-16#36, #38）
[^36]: Stripe『Versioning』Stripe API Reference. https://docs.stripe.com/api/versioning （参照箇所: Enums 節、確認日: 2026-10-03）（RS-16#32）
[^37]: DORA (Google Cloud)『Capabilities: Streamlining change approval』. https://dora.dev/capabilities/streamlining-change-approval/ （参照箇所: 冒頭, Common pitfalls、確認日: 2026-10-03）（RS-16#59, #60）
[^38]: デジタル庁『移行支援期間における特定移行支援システムの数について（令和8年3月末時点）』2026-06-30 掲載. https://www.digital.go.jp/assets/contents/node/basic_page/field_ref_resources/c58162cb-92e5-4a43-9ad5-095b7c45100c/d70e8d19/20260630_policies_local_governments_doc_1.pdf （参照箇所: p.1、確認日: 2026-10-03）（RS-16#78）
[^39]: デジタル庁『令和6年度 共同利用方式の推進及びマルチベンダーにおけるシステム間連携の検証事業 報告書（本紙）』2026-03-27. https://www.digital.go.jp/assets/contents/node/basic_page/field_ref_resources/92d70acb-8407-4f60-8b45-363d9a2d358d/c71cd4d5/20260327_policies_local_governments_government-cloud-vendor-verification_01.pdf （参照箇所: p.2, p.7、確認日: 2026-10-03）（RS-16#79）
[^40]: 内閣（閣議決定）『地方公共団体情報システム標準化基本方針』2024-12-24 改定. https://www.digital.go.jp/assets/contents/node/basic_page/field_ref_resources/c58162cb-92e5-4a43-9ad5-095b7c45100c/6a6cf2e1/20241224_policies_local_governments_doc_04.pdf （参照箇所: 4.3.1 共通機能の標準, 5.1.2、確認日: 2026-10-03）（RS-16#71, #73）
[^41]: W3C『Verifiable Credentials Data Model v2.0』W3C Recommendation, 2025-05-15. https://www.w3.org/TR/vc-data-model-2.0/ （参照箇所: §4.4 Identifiers, §4.7 Issuer, §4.8 Credential Subject, §4.9 Validity Period, §4.10 Status, §4.11 Data Schemas, §5.5 Terms of Use, §5.6 Evidence, §8.4 Identifier-Based Correlation、確認日: 2026-10-15。research ノート外で、最終起草者が原典を取得して確認した。独立検証は未実施）
[^42]: OpenID Foundation『OpenID Connect Back-Channel Logout 1.0 incorporating errata set 1』Final, 2023-12-15. https://openid.net/specs/openid-connect-backchannel-1_0.html （参照箇所: §2.1 sid の定義, §2.4 Logout Token、確認日: 2026-10-15。research ノート外で、最終起草者が原典を取得して確認した。独立検証は未実施）
[^43]: IETF (V. Bertocci, B. Campbell)『RFC 9470: OAuth 2.0 Step Up Authentication Challenge Protocol』2023-09. https://www.rfc-editor.org/rfc/rfc9470 （参照箇所: §6.1、確認日: 2026-10-03）（RS-04#72）
[^44]: IETF (B. Campbell ほか)『RFC 8705: OAuth 2.0 Mutual-TLS Client Authentication and Certificate-Bound Access Tokens』2020-02. https://www.rfc-editor.org/rfc/rfc8705 （参照箇所: §3、確認日: 2026-10-03）（RS-04 参考文献）
[^45]: T. Lodderstedt, J. Richer, B. Campbell『OAuth 2.0 Rich Authorization Requests』RFC 9396, 2023-05. https://www.rfc-editor.org/rfc/rfc9396 （参照箇所: §1、確認日: 2026-10-03）（RS-06#53, RS-04#64）
[^46]: OpenTelemetry『OpenTelemetry Specification — Tracing SDK』v1.61.0, 2026-09-14. https://github.com/open-telemetry/opentelemetry-specification/blob/v1.61.0/specification/trace/sdk.md （参照箇所: Sampler の Decision（DROP, RECORD_ONLY）、確認日: 2026-10-03）（RS-10#22）
[^47]: W3C『Propagation format for distributed context: Baggage』Candidate Recommendation Snapshot, 2024-05-30. https://www.w3.org/TR/baggage/ （参照箇所: Security Considerations, Privacy Considerations、確認日: 2026-10-03）（RS-10#19）
[^48]: OpenFGA『AuthZEN API (Experimental)』. https://openfga.dev/docs/interacting/authzen （参照箇所: Implementation Notes、確認日: 2026-10-03）（RS-07#68）
[^49]: O. Gazitt, G. Drapers (Aserto)『The final chapter for Aserto』2025-04-27. https://www.aserto.com/blog/the-final-chapter-for-aserto （参照箇所: SaaS の停止と事業終了、確認日: 2026-10-03）（RS-07#69）
[^50]: CloudEvents『Auth Context』拡張（main ブランチ、1.0.3-wip）. https://github.com/cloudevents/spec/blob/main/cloudevents/extensions/authcontext.md （参照箇所: 冒頭, authclaims、確認日: 2026-10-03）（RS-17#33）
[^51]: OpenID Foundation『OpenID Connect RP Testing』. https://openid.net/certification/connect_rp_testing/ （参照箇所: テスト計画と実行手順、確認日: 2026-10-03）（RS-16#56）
[^52]: Stoplight『stoplightio/spectral』README v6.17.0, 2026-10-01. https://github.com/stoplightio/spectral （参照箇所: Ready-to-use Rulesets、確認日: 2026-10-03）（RS-16#13）
[^53]: T. Preston-Werner『Semantic Versioning 2.0.0』. https://semver.org/ （参照箇所: Specification 項目 4, 7, 8, FAQ、確認日: 2026-10-03）（RS-16#31）
[^54]: OpenID Foundation eKYC & IDA WG『OpenID Identity Assurance Schema Definition 1.0』2024-10-01. https://openid.net/specs/openid-ida-verified-claims-1_0-final.html （参照箇所: 冒頭の状態表示と Warning, verified_claims の定義、確認日: 2026-10-15（evo 起草者）。状態の表記が矛盾しているため未確認扱い。research ノート外）
[^55]: OpenID Foundation『Public Review Period for Proposed OpenID CAEP Interoperability Profile Final Specification』2026-07-27（2026-09-12・09-15 UPDATE）. https://openid.net/public-review-period-for-proposed-openid-caep-interoperbility-profile-final-specification/ （参照箇所: 日程と UPDATE、確認日: 2026-10-03）（RS-04#79）
[^56]: IETF『RFC 9967 SCIM Profile for Security Event Tokens』Proposed Standard, 2026-05. https://datatracker.ietf.org/doc/rfc9967/ （参照箇所: Abstract、確認日: 2026-10-03）（RS-03#80）
[^57]: Microsoft『Migrate from Azure AD Graph to Microsoft Graph』ms.date 2025-09-29. https://learn.microsoft.com/en-us/graph/migrate-azure-ad-graph-overview （参照箇所: Key timelines、確認日: 2026-10-03）（RS-16#40）
[^58]: OpenID Foundation Shared Signals WG『OpenID Continuous Access Evaluation Profile 1.0』Final, 2025-08-29. https://openid.net/specs/openid-caep-1_0-final.html （参照箇所: §3.1〜§3.8、確認日: 2026-10-03）（RS-04#78）
[^59]: OpenID Foundation Shared Signals WG『OpenID RISC Profile Specification 1.0』Final, 2025-08-29. https://openid.net/specs/openid-risc-1_0-final.html （参照箇所: §2, §2.11、確認日: 2026-10-03）（RS-04#78）
[^60]: RFC Editor『RFC Errata: RFC 9068』. https://www.rfc-editor.org/errata/rfc9068 （参照箇所: Errata ID 8802、確認日: 2026-10-03）（RS-04#60）
