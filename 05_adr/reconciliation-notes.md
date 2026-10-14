# 主要 ADR 8 本の整合調整記録

> 文書ID: ADR-RN / 版: 0.1 / 状態: draft / 最終更新: 2026-10-15
> 対応要求: G-020（全 ADR の必須節）、R-118, R-161, R-162, R-209（相関識別子・claim・識別子の整合）
> 依存文書: CONVENTIONS.md, traceability/deliverables.md, 05_adr/ADR-001-build-buy-identity-provider.md, 05_adr/ADR-005-token-profile.md, 05_adr/ADR-007-key-hierarchy-kms-hsm.md, 05_adr/ADR-010-authz-engine-store-consistency.md, 05_adr/ADR-011-policy-language-pep-pdp-api.md, 05_adr/ADR-013-cell-partitioning-fail-mode.md, 05_adr/ADR-021-irreversible-identifiers.md, 05_adr/ADR-022-integration-contract-standards.md, 02_requirements/tenant-lifecycle.md, 02_requirements/principal-catalog.md, 03_threat-model/threat-catalog.md
> 作成方法: 並行して決定された 8 本の ADR を AI エージェント（Claude）が通読し、相互の矛盾・前提の食い違い・用語と参照の不一致を列挙して、どちらに揃えるかを判断した。判断は自己レビューであり、実在の CTO/CISO の決裁ではない（CONVENTIONS §8）[D]。各 ADR の修正箇所には「整合調整で修正」（または「整合調整で追加・追記・明記」）と注記した。01〜03 の文書は編集していない。

## 1. 要約

- 検出した不整合は 35 件である [D]。このうち 30 件は該当 ADR を直接修正して解消した [D]。4 件は決裁事項に関わるため「未決の論点」（U-01〜U-04）として関係する両 ADR に明記した [D]。1 件は ADR 以外の成果物（ADR-014・DL-77）への申し送りにとどめた [D]。
- 最も影響が大きい未決は U-01（issuer の粒度）である。ADR-007 はテナント／realm 別の issuer を、ADR-021 は信頼区画別の issuer＋cell 別鍵＋専用 issuer 枠を推奨しており、ADR-001・ADR-013・ADR-022 と 03_threat-model/threat-catalog.md の記述がそれぞれ片方を前提にしていた [D]。整合調整では各文書をどちらに決まっても読める条件付きの記述にし、DEC-3 で KD7-1 と K21-1 を同時に決裁する形に揃えた [D]。
- 利用者からの相談（認可後の claim に trace id 的な ID を付けるか、所属以外に付加を検討すべき claim は何か）に対して 8 本が個別に答えていた。層の数や欄の名前が食い違っていたため、§3 に統一モデルを置いた [D]。

## 2. 判断の原則

| # | 原則 | 理由 |
|---|---|---|
| P1 | 規範（原典）と照合済みの事実が食い違う場合は、原典を確認して正しい方に揃える | CONVENTIONS §3・§4 [D] |
| P2 | 識別子・claim 名・名前空間は ADR-021 を正本とし、claim の意味・発行条件は ADR-005、契約上の凍結区分は ADR-022 を正本とする | deliverables.md の ADR 表で ADR-021 が識別子、ADR-005 が token profile、ADR-022 が契約標準を担う [D] |
| P3 | cell の定義・数・global 部品は ADR-013 を正本とする | deliverables.md の ADR-013 行（cell の原則、DEC-3 対象）[D] |
| P4 | 認可エンジン・整合性は ADR-010、PEP–PDP 契約と deny semantics は ADR-011 を正本とする | deliverables.md の ADR-010・ADR-011 行 [D] |
| P5 | 01〜03 の文書（要求・前提・脅威）と食い違う場合は ADR 側を直す。01〜03 の側に直す必要がある場合は §5 に申し送る | 本作業の指示 [D] |
| P6 | 経営・事業・リスク受容の決裁が要る対立は、どちらかに寄せずに未決として両方に書く | CONVENTIONS §6 の B 区分 [D] |

## 3. 相関識別子と claim の統一モデル（相談事項への 8 本共通の答え）

### 3.1 trace id を認可後の claim に付けるか

- 付けない [D]。8 本すべてがこの結論で一致していた [D]。理由は次の 3 つに集約できる。
  1. access token は寿命の間に多数の要求で使い回されるので、要求単位の ID を入れても 1 要求を特定できない。要求ごとに発行し直すと、発行負荷が A-043（1,374/秒）から A-040（16,804/秒）の桁に上がる [D][A-027, A-040, A-043]（ADR-005 D9-1、ADR-022 D-8-1）。
  2. W3C Trace Context は traceparent・tracestate の目的を相関だけとし、個人識別情報を入れてはならない（MUST NOT）。外部から来た trace を素直に継続すると trace-id の衝突を偽造され得る [N][^1]（RS-10#16, #17）。
  3. Sampler が DROP を返すと span は記録されない。trace だけでは全件の証跡にならない [N][^2]（RS-10#22）。
- 「trace id 的な id」の役割に最も近いのは、edge が外部 token を検証した後に払い出し、署名付きの Transaction Token に載せる `txn` である（ADR-021 D21-35、ADR-022 D-8-2）[D]。Transaction Tokens は Internet-Draft（draft-11、IESG 未提出）なので、版を固定した社内 profile として扱う（ADR-005 D9-3、ADR-022 D-2）[D]。

### 3.2 統一した層（ADR-001 §1.7・ADR-005 D9-2・ADR-011 D8-2・ADR-013 D13-43・ADR-021 D21-35・ADR-022 D-8-2 を揃えた結果）

| 層 | 識別子 | 発行者・署名 | 載せる場所 | 証跡上の役割 |
|---|---|---|---|---|
| L1 token | (iss, jti)。外部 opaque token は AS の発行記録 ID | AS・STS。署名あり | 内部 access token の claim、introspection 応答、発行台帳（ADR-007 D7-45） | どの発行記録から来た token か。台帳と KMS 署名回数の照合で偽造を検知する |
| L2 session・grant | `sid`、grant 参照 | AS。署名あり | 内部 access token の claim、introspection 応答 | どのログイン session・どの同意に属するか。一括失効・全 session 失効の結合キー |
| L3 取引 | `txn` | cell の TTS（edge 併設）。署名あり | Txn-Token（`Txn-Token` ヘッダ。Authorization ヘッダには置かない） | 共通の入口で検証を通った呼出し連鎖であること。発行範囲は ADR-005 D9-3（write 以上）。全要求に広げるかは U-02 |
| L4 判定 | `decision_id`、AuthZEN 要求 ID（X-Request-ID の echo）、model_revision、整合性の実効モード、cell_id、失効 epoch | PDP façade。判定記録の署名は U-04 | AuthZEN 応答の context、decision event | どの policy・model 版でどう判定したか |
| 補助 | trace_id | 誰でも生成できる。署名なし | traceparent ヘッダ、監査の相関欄 | 調査の索引だけ。認可にも真正性にも使わない |

- 監査イベントの欄は、iss・jti・sid・grant 参照・txn・decision_id・X-Request-ID・trace_id の 8 欄に揃える（ADR-005 D9-2、ADR-021 D21-37 を修正）[D]。Txn-Token の全文はログに残さない（草案の MUST NOT）[N][^3]（RS-06#41）。
- 由来する認証イベント ID は claim にせず発行台帳だけに置き、token 側は `sid`・grant 参照で台帳と結合する（ADR-005 D9-4 に追加、ADR-007 §2.9 を追記）[D]。

### 3.3 所属以外に基盤が付加する claim（v1）

| 区分 | claim | v1 の扱い | 正本 |
|---|---|---|---|
| 識別 | iss, sub, aud, exp, iat, jti, client_id | 発行（RFC 9068 で REQUIRED）[N][^4] | ADR-005 D9-4、ADR-022 D-9-1 |
| 権限の粗い範囲 | scope | 発行 | 同上 |
| テナント | `tid`（内部 token の短い名前。外部 ID Token では衝突耐性名） | 発行。1 token に 1 つ | ADR-021 D21-38・D21-39、ADR-005 V9 |
| 主体の種別 | 人・service account・workload・AI エージェント | 発行（整合調整で ADR-022 の予約から発行へ移した） | ADR-005 D9-4、ADR-021 D21-39 |
| 認証の文脈 | acr, amr, auth_time | 発行（利用者主体） | ADR-005 D9-4 |
| 鍵束縛 | cnf | 発行（束縛時） | ADR-005 D5 |
| 委任 | act（may_act は AS 側） | 発行（委任時）。アクセス制御は現在の actor だけ（RFC 8693 の MUST）[N][^5] | ADR-005、ADR-009、ADR-017 |
| session・grant | sid、grant 参照 | 発行（整合調整で ADR-022 に grant 参照を追加） | ADR-005 D9-4 |
| profile 版 | 版 claim | 発行 | 意味 ADR-005、運用 ADR-016、名前 DL-75 |
| 予約（名前だけ） | authorization_details、status、verified_claims、発行元 IdP、保証の根拠への参照、資格の状態参照、利用目的 | 発行しない | ADR-021 D21-39、ADR-022 D-9-2 |
| 載せない | trace id、roles・groups・entitlements の全量、氏名・メール等、VC の本体と属性、認証イベント ID | — | ADR-005 D9-4、ADR-022 D-9-3 |

- W3C VC Data Model 2.0（W3C Recommendation、2025-05-15）の扱いは 4 本（ADR-005 D9-6、ADR-011 D9-3、ADR-021 D21-40、ADR-022 D-9-4）で一致している [D]。VC は holder が提示する資格情報の形式であり access token の代わりにならないこと、VC の属性を token に複写しないこと、検証は IdP・オンボーディング・PIP で閉じて PDP には検証結果と出所だけを渡すこと、issuer URL を将来 VC の issuer にも使える形（path なしの https URL）に保つこと、である [D]。原典はこれらの ADR の起草者が取得したが、作成者以外の独立検証は未了である [D]。
- 名前の正本: claim の名前は DL-75（schema）と DL-115（claim 目録）に置く。名前の規則は ADR-021 D21-38、意味と発行条件は ADR-005、版の運用は ADR-016、凍結区分は ADR-022 とする [D]（整合調整で各 ADR の記述を揃えた）。

## 4. 検出した不整合・判断・修正の一覧

区分: 修正＝該当 ADR を直接修正して解消。未決＝決裁事項のため両 ADR に「未決の論点」として明記。申送＝ADR 以外の成果物に申し送り。

| ID | 不整合の内容 | 判断（揃えた先） | 修正した ADR と箇所 | 区分 |
|---|---|---|---|---|
| C-01 | issuer の粒度。ADR-007 D7-16・KD7-1 はテナント／realm 別、ADR-021 D21-03・K21-1 は信頼区画別。ADR-001 D4-1 は cell ごとの AS を issuer とし、D16-2 はテナント別 issuer を前提にした。ADR-013 は G2 の DNS 構成・規制スコープ cell の「専用 issuer」・KD13-3 でテナント別 issuer を前提にした | DEC-3 の決裁事項のため寄せない。各文書を条件付きにする | ADR-001 D4-1・D16-2・§2.18a、ADR-007 D7-16・D7-22・KD7-1、ADR-013 D13-03・G2 行・KD13-3・§2.9 の U-01 行、ADR-021 §1.6、ADR-022 D-10b、ADR-005 §2.15 | 未決（U-01） |
| C-02 | cell の定義。ADR-001 D4-1 は cell を 4 リージョン（日本主・日本副・EU・米国）と書いていた。ADR-013 は法域×規制スコープ×テナント群（試算 9）で、日本副は待機 cell | ADR-013 に揃える（P3） | ADR-001 D4-1 | 修正 |
| C-03 | ADR-010 D-23 が cell を「リージョン・所在地」と書いていた | ADR-013 に揃える（P3） | ADR-010 D-23 | 修正 |
| C-04 | 試算用の cell 数。ADR-007 N7-1 は 10、ADR-013 N13-1 は 9 | 正本は ADR-013。ADR-007 の値は上限側の試算として残す | ADR-007 N7-1 | 修正 |
| C-05 | ADR-005 D9-4 が「sub の名前空間も種別ごとに分ける」とした。ADR-021 D21-10 と 02_requirements/principal-catalog.md §3.2 は全類型共通の単一名前空間で、sub から類型を推論させない | 01〜03 と ADR-021 に揃える（P2、P5） | ADR-005 D9-4 主体種別行 | 修正 |
| C-06 | ADR-013 D13-13 が複数テナント所属の利用者を「テナント別 issuer ごとに別主体」とした。ADR-021 D21-10 は sub をテナントから独立させ、ADR-005 V9 は 1 token 1 テナントで取り直す | ADR-021・ADR-005 に揃え、テナント別 issuer になった場合の扱いを条件付きで残す | ADR-013 D13-13 | 修正 |
| C-07 | ADR-013 は要求単位の証跡の相関キーを trace-id とし、証跡の 1 つを「trace-id による連鎖の再構成」とした。他の 5 本は trace-id を権威のない補助とし、取引単位は `txn` | 規範（Trace Context の MUST NOT と偽造の注意、OTel の DROP）に照らし他の 5 本に揃える（P1） | ADR-013 要旨・D13-43 表と箇条 | 修正 |
| C-08 | 相関の層の数と欄の不一致。ADR-001 は 3 層で sid・grant がない。ADR-011 は sid・grant がない。ADR-021 の監査欄は 5 つで grant と X-Request-ID がない | §3.2 の統一モデルに揃える | ADR-001 §1.7 表と要旨、ADR-005 D9-2、ADR-011 D8-2 表、ADR-013 D13-43、ADR-021 D21-37、ADR-010 §6.6 表 | 修正 |
| C-09 | ADR-022 D-8-3 は `txn` を証跡の主キーにし再構成率 100% を合否基準にした。ADR-005 D9-3 は要求 context を write 以上に限る | 費用（署名 16,804/秒）と R-118 の証跡範囲の判断が要るため寄せない | ADR-005 D9-3・§2.15、ADR-022 要旨・D-8-3・D-10b、ADR-021 D21-35 | 未決（U-02） |
| C-10 | 主体の種別と grant 参照。ADR-022 D-9 は主体の種別を予約にとどめ、grant 参照を挙げていなかった。ADR-005 D9-4 は両方を必須、ADR-021 D21-39 は主体類型を v1 固定とした。ADR-021 D21-23 は RFC 9700 の区別手段として主体類型を要する | ADR-005・ADR-021 に揃え、ADR-022 で発行対象へ移す（P2） | ADR-022 要旨・D-9-1・D-9-2・D-9-5 表・§6.1 | 修正 |
| C-11 | 社内 claim の命名。ADR-005 D9-5 は IANA 登録か Public Name にするとした。ADR-021 D21-38 規則 3 と ADR-022 D-9-1 は内部 token に限り短い名前（`tid`）を許す | ADR-021 に揃え、Public Name 化は外部向けに限定（P2） | ADR-005 D9-5 | 修正 |
| C-12 | claim 名を決める文書が ADR-005／ADR-016／ADR-022・DL-75 にばらけていた | 名前は DL-75・DL-115、規則は ADR-021、意味は ADR-005、版の運用は ADR-016 | ADR-005 D9-5、ADR-021 D21-39 表の主体類型行・profile 版行、ADR-001 §1.7 表 | 修正 |
| C-13 | OpenID Identity Assurance Schema Definition 1.0 の状態。ADR-005 は Final とし、ADR-022 は状態表記が矛盾として未確認扱い、ADR-021 は未調査とした | 原典を 2026-10-15 に再確認した。状態表示は Final だが Warning 節は「OIDF International Standard ではない」「draft」と述べる [N][^6]。ADR-022 の扱いに揃える（P1） | ADR-005 D9-4 の出所枠行、ADR-021 D21-39 の verified_claims 行 | 修正 |
| C-14 | W3C VC Data Model 2.0 について、ADR-001・ADR-010・ADR-013 は「research に無く未確認」とし、ADR-005・ADR-011・ADR-021・ADR-022 は原典を取得していた | 取得済みの事実と独立検証未了を併記し、3 本は結論に使わない立場を維持 | ADR-001 §1.7 表、ADR-010 §6.6、ADR-013 要旨・D13-44 | 修正 |
| C-15 | 整合性 token の最大長。ADR-010 D-14 は 1,024 バイト（NA-010-2）、ADR-011 D6-4 は TBD とし varchar(1024) は保証でないとした | 1,024 を façade が自社形式で守る初期案とし、DL-72 凍結前に実測で確定する（技術的な調整で決裁事項ではない） | ADR-010 D-14、ADR-011 D6-4 | 修正 |
| C-16 | OpenFGA の read-sensitive。ADR-010 D-13 は窓 W を過ぎたら MINIMIZE_LATENCY に戻す。ADR-011 D6-3 は格下げ不可で常に HIGHER_CONSISTENCY | ADR-010 決裁案 2（CISO の受容）に関わるため寄せない | ADR-010 D-13 の注記・§2.12 の未決、ADR-011 D6-3 | 未決（U-03） |
| C-17 | 判定記録への署名。ADR-013 D13-26 は known-good に PDP 署名の判定記録を要件にした。ADR-011 D5-7 は v1 で応答署名を採らず、ADR-010 D-53 は PoC 項目、ADR-022 D-8-2 は監査の改ざん検知に依存 | ADR-013 KD13-6（fail-static を許すか）の決裁に連動させる | ADR-010 D-53・§2.12、ADR-011 D5-7、ADR-013 D13-26・D13-43・§2.9、ADR-022 D-8-2・D-10b | 未決（U-04） |
| C-18 | 「G 段」（ADR-011 の façade 評価の固定カタログ）と「G1/G2」（ADR-010 のエンジン内モデルか Cedar か）の用語と評価場所が食い違って読める | G 段カタログは façade で決定論的に評価。G1/G2 の比較はカタログ外の横断規則に限定 | ADR-010 D-32 | 修正 |
| C-19 | ADR-010 D-12・可逆性欄が tuple に「テナント接頭辞」を使うとし、INV-1・ADR-021 D21-14（資源 ID にテナントを埋め込まない）と衝突して読める | 01〜03 と ADR-021 に揃え、区画キーは façade・store の内部値とする | ADR-010 冒頭の可逆性、D-12 | 修正 |
| C-20 | ADR-010 D-5 の格上げ条件「ADR-013 が cell を複数リージョンにまたがせる場合」が、ADR-013 D13-20 の決定（3 AZ＋待機 cell）を反映していない | ADR-013 に揃え、現状は条件不成立と明記 | ADR-010 D-5 | 修正 |
| C-21 | ADR-007 D7-10 が外部 access token（RFC 9068）の鍵族を持ち、D7-61 が外部 RS256/ES256 の並行公開を RFC 9068 の MTI で説明。ADR-005 D1-1 は外部 access token を opaque にする | ADR-005 に揃え、族 2 は予約とし初期構成で鍵を作らない。鍵本数と Sign 費用を上限側の試算と明記 | ADR-007 §1.6 注記、D7-10、D7-14、D7-61 | 修正 |
| C-22 | ADR-007 D7-10 族 3 が内部 token と Txn-Token を同じ族（1 族 1 鍵）にした。ADR-005 は種別ごとに鍵集合を異ならせ（RFC 8725 §3.12 の相互排他の手段）、D9-3 で要求 context に専用鍵を置く | ADR-005 に揃え、族 3b を分ける | ADR-007 D7-10、D7-14 | 修正 |
| C-23 | ADR-007 D7-45 の「全 token に jti」と Sign 回数照合が、署名しない外部 opaque token を含んで読める | 署名する JWT に限り、opaque は AS の発行記録 ID で台帳に載せる | ADR-007 D7-45 | 修正 |
| C-24 | 認証イベント ID を claim に入れるかを ADR-007 §9.2 が ADR-005 に委ねたが、ADR-005 に記述がなかった | ADR-005 で「claim にせず台帳だけ、token 側は sid・grant 参照で結合」と決める | ADR-005 D9-4 表、ADR-007 D7-45 | 修正 |
| C-25 | ADR-007 D7-15 は高保証テナント 50 すべてに専用 issuer を提供するとし、ADR-021 D21-05 は契約で求めたテナントに限る | ADR-021 に揃える（P2）。費用試算は上限 50 で残す | ADR-007 D7-15 | 修正 |
| C-26 | Txn-Token の trust domain。ADR-005 は TTS を cell ごとに置き aud を trust domain とする。草案は trust domain ごとに論理的に 1 つの TTS を MUST とする [N][^3]（RS-06#38）。ADR-021 D21-28 の SPIFFE trust domain は本番 1 つ | Txn-Token の trust domain は cell ごとの可逆な内部値とし、SPIFFE の trust domain 名とは別物と明記 | ADR-005 D9-3 | 修正 |
| C-27 | ADR-022 D-10-1 が alg allowlist を「metadata・設定から読む」とした。ADR-005 V1 は検証側の版付き設定から読み、metadata は出所にしない | ADR-005 に揃える（検証規則の正本） | ADR-022 D-10-1 | 修正 |
| C-28 | ADR-022 D-9-1 が `sid` の access token への搭載を「衝突耐性条件で扱う」とした。`sid` は IANA 登録済み | ADR-005・ADR-021 の registry 照合に揃える | ADR-022 D-9-1 | 修正 |
| C-29 | ADR-005 D9-6 は「目的」の私的 claim を作らないとし、ADR-022 D-9-2 は利用目的を予約した | v1 では発行しない点で一致。名前の予約は両立すると明記 | ADR-005 D9-6 表 | 修正 |
| C-30 | ADR-005 D11-1・K-5 は grant と refresh token の export/import を ADR-001 の必須評価項目にしたが、ADR-001 D13-2 の評価軸になかった | ADR-005 に揃える | ADR-001 D13-2 | 修正 |
| C-31 | 存在しない節・試験への参照。ADR-001 の「ADR-005 D11-4」「D1-3」「H-22」「H-14」「ADR-007 INV-1」「§1.8」、ADR-013 の「ADR-005 D10-4」、ADR-021 の「ADR-005 H-13」、ADR-022 の「ADR-005 D6-5」「D10-3」 | 正しい参照先（ADR-005 D8-2、§9、D1-2、H-02・H-04、D1-6・H-09、tenant-lifecycle INV-1、§1.7、D10-3、H-10、D6-4、D10-2）に直す | ADR-001、ADR-013、ADR-021、ADR-022 の該当行 | 修正 |
| C-32 | テナント claim の名前。ADR-011 D9-2 は `tenant`（ID-JAG 草案の名前）、ADR-010 §6.6 は「標準 claim 名は research で未確認」とした。ADR-021・ADR-022 は内部 token で `tid` | ADR-021 に揃える（P2） | ADR-011 D9-2 表、ADR-010 §6.6 表 | 修正 |
| C-33 | ADR-007 D7-22 のテナント結合「tid と issuer の一致」は、信頼区画 issuer では成り立たない | U-01 の両方の結論で読めるよう、区画 issuer の場合の検査（tid の収容 cell と kid の cell の一致、ADR-021 D21-07(b)）を併記 | ADR-007 D7-22 | 修正 |
| C-34 | ADR-011 D8-3 は decision event に `jti` のハッシュを記録し、ADR-005・ADR-007・ADR-021 は `jti` をそのまま記録する。結合に同じハッシュ関数が要る | 監査スキーマの決定事項のため ADR-014・DL-77 へ申し送る（§5） | なし | 申送 |
| C-35 | ADR-013 の「失効 epoch」と ADR-010 の「テナント剥奪フェンス」が同じものに読める | 別の検査であり、known-good の条件と read-sensitive の評価下限の両方を満たすと明記 | ADR-010 §2.12 後の注記、ADR-013 D13-26 | 修正 |

## 5. 未決の論点（決裁事項）

| ID | 論点 | 選択肢と帰結 | 関係する ADR（両方に明記済み） | 決める場・期限 |
|---|---|---|---|---|
| U-01 | issuer の粒度 | (a) テナント／realm 別（ADR-007）: 外部 RP も標準の検証（RFC 8725 §3.8 の鍵と issuer の結合、OIDC の iss 完全一致）だけで cell 封じ込めを得る [N][^7]。issuer metadata が約 1 万件になり、複数 issuer を扱う外部 client の負担が増える。(b) 信頼区画別＋cell 別鍵＋専用 issuer 枠（ADR-021）: 外部 client 800 は区画ごとに 1 issuer で済む。外部 RP に対する cell 封じ込めは失われ（RR21-01）、第一者の検証点が tid→cell 対応表で補う [D][A-013] | ADR-001、ADR-005、ADR-007、ADR-013、ADR-021、ADR-022 | DEC-3（CTO＋CISO）。G3。DEC-8 の前提条件 |
| U-02 | `txn` を証跡の主キーにする範囲 | (a) 全要求に要求 context を発行: 署名 16,804/秒（成長 56,444/秒）[D][A-040]。(b) write 以上に限る: public・read-sensitive は (jti, decision_id, X-Request-ID) で相関し、証跡の強さが階層で異なる | ADR-005、ADR-021、ADR-022 | CTO＋CISO。ADR-005 H-20 の実測の後 |
| U-03 | OpenFGA の窓 W 方式 | (a) 窓方式を受容（期限付き）: 剥奪後の因果順序でなく時間の上限だけを守る（ADR-010 RR-1）。(b) 受容しない: ADR-011 D6-3 の常時格上げ、または候補を SpiceDB に絞る | ADR-010、ADR-011 | CISO（受容票）。Gate 3、ADR-010 H-05 の後 |
| U-04 | 判定記録への PDP 署名 | (a) KD13-6 で read-sensitive の fail-static を許す: read-sensitive の判定記録への署名が必須になり、DL-72 の自社拡張に署名欄が要る。(b) 許さない: 署名は PoC 項目のまま、read-sensitive も PDP 不達時は拒否 | ADR-010、ADR-011、ADR-013、ADR-022 | ADR-013 KD13-6 と同時（CISO＋事業責任者＋CTO）。G4 |

## 6. 01〜03 の文書と ADR 以外の成果物への申し送り（本作業では編集していない）

| 宛先 | 内容 | 理由 |
|---|---|---|
| 03_threat-model/threat-catalog.md | テナントの取違えの予防策（「テナントごとの不変 issuer と cell 単位の鍵」）と鍵侵害の予防策（「テナント／realm ごとの不変 issuer と cell 単位の jwks」）は ADR-007 の案を前提にしている。U-01 の決裁後に、信頼区画 issuer になった場合の予防策（区画別 issuer＋cell 別鍵＋SDK 既定の tid→cell 検証、ADR-021 D21-07）へ書き換えるか、条件付きにする | U-01 の結論に依存する [D] |
| 02_requirements/tenant-lifecycle.md | K-8 は (b) 共通 issuer＋tid＋cell 別署名鍵を推奨しており、ADR-007 KD7-1 と対立する。DEC-3 の決裁資料で K-8・KD7-1・K21-1 を 1 つの論点として示す | 3 文書の推奨を 1 つの決裁に束ねるため [D] |
| 02_requirements/principal-catalog.md | 変更不要。ADR-005 を §3.2（単一名前空間、類型を sub から推論させない）に揃えた | — |
| ADR-014・DL-77（監査） | 監査イベントの欄を §3.2 の 8 欄にする。`jti` をハッシュで記録する場合（ADR-011 D8-3）は、発行台帳（ADR-007 D7-45）と同じ関数・同じ鍵で求め、結合できるようにする（C-34） | 監査スキーマの決定は ADR-014 の範囲 [D] |
| DL-75・DL-115（claim schema と claim 目録） | §3.3 の表を v1 の起点にする。主体の種別と grant 参照を GA の発行対象に入れる。名前の規則は ADR-021 D21-38 | C-10〜C-12 の結果 [D] |
| ADR-009（workload・Txn-Token） | Txn-Token の trust domain を cell ごとの内部値とし、SPIFFE trust domain 名と区別する（C-26）。要求 context の専用鍵族 3b（ADR-007）を前提にする | C-22・C-26 の結果 [D] |
| 01_governance/assumptions-register.md | 新規仮定の追加は各 ADR に記載済み（NA-xxx、N7-x、N13-x）。cell 数の試算値の差（N7-1 の 10 と N13-1 の 9）は、台帳に登録するときに 1 つの仮定に統合する | C-04 の結果 [D] |

## 7. 残課題

- 本記録の判断は作成者以外の照合を受けていない [D]。各 ADR の作成者または独立した確認者が、修正箇所と本表の対応を確かめる必要がある [D]。
- C-13 の原典確認は整合調整の作成者が 2026-10-15 に行った 1 回だけである [D]。traceability/ の照合ログへの追記は、本作業では指示外のため行っていない [D]。

## 参考文献

[^1]: W3C『Trace Context』W3C Recommendation, 2021-11-23. https://www.w3.org/TR/trace-context/ （参照箇所: §6 Privacy Considerations, §7.2、確認日: 2026-10-03。RS-10#16, #17）
[^2]: OpenTelemetry『Tracing SDK』specification. https://opentelemetry.io/docs/specs/otel/trace/sdk/ （参照箇所: Sampler の DROP、確認日: 2026-10-03。RS-10#22）
[^3]: IETF OAuth WG『Transaction Tokens』draft-ietf-oauth-transaction-tokens-11, 2026-07-30（Internet-Draft、IESG 未提出）. https://datatracker.ietf.org/doc/draft-ietf-oauth-transaction-tokens/ （参照箇所: trust domain ごとの TTS、ログ記録の禁止、確認日: 2026-10-03。RS-06#38, #41）
[^4]: IETF『RFC 9068 JSON Web Token (JWT) Profile for OAuth 2.0 Access Tokens』2021-10. https://www.rfc-editor.org/rfc/rfc9068 （参照箇所: §2.2、確認日: 2026-10-03。RS-04#60）
[^5]: IETF『RFC 8693 OAuth 2.0 Token Exchange』2020-01. https://www.rfc-editor.org/rfc/rfc8693 （参照箇所: §4.1、確認日: 2026-10-03。RS-04#66）
[^6]: OpenID Foundation eKYC & IDA WG『OpenID Identity Assurance Schema Definition 1.0』Published 2024-10-01. https://openid.net/specs/openid-ida-verified-claims-1_0-final.html （参照箇所: 冒頭の Status 表示と Warning 節、確認日: 2026-10-15。research ノート外。整合調整の作成者が確認、独立検証は未実施）
[^7]: IETF『RFC 8725 JSON Web Token Best Current Practices』2020-02. https://www.rfc-editor.org/rfc/rfc8725 （参照箇所: §3.8、確認日: 2026-10-03。RS-05#36）
