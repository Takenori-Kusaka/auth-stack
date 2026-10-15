# ADR-009 workload identity・token exchange・委任の伝搬・内部取引 context

> 文書ID: ADR-009 / 版: 0.2 / 状態: draft（ADR 状態: proposed＝決裁前）/ 最終更新: 2026-10-15（0.2（PoC/R7反映）: PoC 実測レポート POC-02（§6.5 TC-004 の未実施、§6.3 の TC-016 行）と模擬パネル ラウンド 7 の指摘により、§7.1.1、§8 の実測トリガー、残課題、レビュー記録を加えた。PoC の値は自己実行の参考値で Gate 4 の証拠ではない）
> 可逆性: **一部不可逆**。不可逆側に入るのは (1) SPIFFE trust domain の名前と数、(2) SPIFFE ID の path の形式と非再割当の約束、(3) 監査証跡に残す `txn` の意味（取引の一意な不透明識別子）の 3 点である。Txn-Token の claim 構成、TTS の配置、act の深さ上限、派生 token の寿命の値、クラウド federation の接続先は可逆である（§2.11）
> DEC-3 対象: いいえ（traceability/deliverables.md §5 の ADR 表で DEC-3 列は「—」）。ただし (1)(2) は ADR-021（DEC-3 対象）の命名規則に従う識別子であり、§2.12 の論点 P09-1 を ADR-021 K21 系と同じ DEC-3 の議題に載せることを提案する
> 対応要求: R-100（本書を対応成果物に含む行）／G-020, G-102（DL-12 として本書を含む行）。関連: R-029, R-044, R-118, R-128, R-143, R-161, R-162, R-206, R-207, R-209, R-230, R-251, R-255, R-259, R-282／G-042, G-063, G-068, G-074, G-088, G-093, G-099, G-124, G-138, G-141（全件と閉じ方は末尾の対応表）
> 依存文書: CONVENTIONS.md, traceability/deliverables.md（§5 ADR-009 行、DL-55, DL-74, DL-115）, 05_adr/ADR-001-build-buy-identity-provider.md, 05_adr/ADR-005-token-profile.md, 05_adr/ADR-007-key-hierarchy-kms-hsm.md, 05_adr/ADR-010-authz-engine-store-consistency.md, 05_adr/ADR-011-policy-language-pep-pdp-api.md, 05_adr/ADR-013-cell-partitioning-fail-mode.md, 05_adr/ADR-021-irreversible-identifiers.md, 05_adr/ADR-022-integration-contract-standards.md, 05_adr/reconciliation-notes.md, 01_governance/assumptions-register.md, 02_requirements/operation-risk-tiers-assurance.md, 02_requirements/principal-catalog.md, 02_requirements/identity-lifecycle.md, 03_threat-model/attacker-model.md, 03_threat-model/threat-catalog.md, 03_threat-model/incident-casebook.md, research/RS-04, RS-05, RS-06, RS-10, RS-17（各 verification 記録を含む）, research/standards-status.md
> 表記: 決定は D09-xx、決裁案は KD09-x、未決・論点は P09-x、試験案は H09-xx（仮番。TC-ID は 12_poc の DL-22 で採番）、残余リスクは RR09-x、新規仮定は NA09-x と書く。表のセルのうちタグのないものは設計推論 [D] であり、この注記で個別のタグに代える。事実を述べるセルには個別にタグと脚注を付けた。
> 作成方法: AI エージェント（Claude）が research の検証済み項目と主要 ADR 8 本・整合調整記録・Wave A 文書を通読して起草した。research にない原典（Transaction Tokens draft-06 の `purp`、draft-11 の Document History、RFC 8417 §2.2、RFC 8693 §4.4 の本文、RFC 8705 §2.1.2、SPIFFE X509-SVID §4.2、Datatracker の 2026-10-15 時点の状態）は起草者が 2026-10-15 に取得して照合した。作成者以外による独立検証は未了であり、照合ログの traceability/ への追記は要対応である（本書からは編集していない）。本書の判断は自己レビューであり、実在の CTO/CISO の決裁ではない（CONVENTIONS §8）[D]。

**要旨（結論）**

- **workload identity**: サービス間の呼出し元認証の正本は SPIFFE ID と X.509-SVID による mTLS とし、発行系は SPIRE を第一候補にする [D]（RS-06#3, #4, #8）。クラウド事業者の API を呼ぶ場合に限り、各社の workload identity federation を SPIFFE 資格情報から federate して使う混在型にする [D]（RS-06#77〜#80）。JWT-SVID は単一 audience の補助用途に限り、WIMSE の WIT は RFC 化まで採らない [D]（RS-06#5, #22, #23）。
- **trust domain**: SPIFFE trust domain は法域パーティション（日本／EU・英国／米国）ごとに 1 つ、非本番に 1 つを置くことを推奨する [D]。SVID の検証者は SVID が属する trust domain に対応する bundle を選ぶので、ある trust domain の発行系が侵害されても別の trust domain の検証者には受け入れられない（SPIFFE Trust Domain and Bundle §3）[N][^39]。URI 型の名前制約も trust domain（host 部）の単位でしか効かない（RFC 5280 §4.2.1.10、SPIFFE X509-SVID §4.2）[N][^40][^7]。trust domain を分けることが封じ込めの単位になり、ADR-013 D13-02 の「鍵を共有しない硬い境界」と一致させるためである [D]。ADR-021 D21-28 は本番 1・非本番 1 としているため、これを主要 ADR との論点 P09-1 として DEC-3 に上げる [D]。Txn-Token の trust domain は ADR-005 D9-3 のとおり cell ごとの内部値とし、SPIFFE の trust domain とは別物として扱う [D]（reconciliation-notes C-26）。
- **委任の伝搬**: edge の後の各 hop は、RFC 8693 の token exchange で呼出し先 1 サービスを aud とし呼出し元の SVID に束縛した内部 access token を取り直し、利用者を `sub`、呼出し元 workload を `act` に置く [N][D]（RS-06#43〜#45）。exchange は `resource`（RFC 8707）を必須とし、交換可能な組（呼出し元 workload × 呼出し先）の登録簿と act の深さ上限（初期案 3、NA09-2）で STS が拒否する [D]。actor の身元は actor_token ではなく STS へのクライアント認証（SVID による mTLS）から取る [D]。`may_act` は token に載せず、登録簿がその役割を持つ [D]。
- **内部取引 context**: 内部 context を自作せず、Transaction Tokens（draft-ietf-oauth-transaction-tokens-11、IESG 未提出の Internet-Draft）に寄せた版固定の社内 profile `txn-v1` を使う [N][D]（RS-06#29〜#42）[^3]。draft への依存は、契約上の GA を `txn` 欄の意味と伝播義務に限り、claim 構成は preview・adapter で隔離し、draft が失効・大改訂した場合は ADR-022 D-8-5 の自社形式の取引 ID へ退避する [D]。`txn`・`tctx`・`rctx`・`scope` の扱いを §2.6 で定める [D]。旧版の `purp` は draft-07 で `scope` に改名されており、本書は `purp` を発行しない [N][^2][^1]。
- **trace id と監査上の結合**: trace id は access token にも Txn-Token にも入れない [D]（reconciliation-notes §3.1）。監査では (iss, jti)・sid・grant 参照・txn・decision_id・X-Request-ID・trace_id の 8 欄で結合し、取引の再構成は `txn` → 判定記録（decision_id）→ 提示 token の jti → STS の交換台帳（入力 jti → 出力 jti）の順に辿る [D]。trace_id は索引だけに使う [D]。
- **共有 client secret の廃止と M2M**: 新規の client 登録と workload 間認証で共有 client secret を禁止する [D]。M2M は client credentials＋private_key_jwt か mTLS に限り、既存の静的秘密（仮置き 3,000 件、A-113）は期限付き例外として移行する [N][D][A-113]（RS-17#19〜#23）。
- **主要 ADR との論点**: あり。P09-1（SPIFFE trust domain の数、ADR-021 D21-28）は決裁事項である [D]。P09-2（`txn` を全要求に発行するか、未決 U-02）には本書から条件付きで (a) を推奨する入力を出す [D]。その他 3 点は整合確認事項である（§2.12）[D]。

---

## 1. 文脈

### 1.1 解くべき問題

旧提案は、サービス間の利用者委任を「token exchange/OBO・trusted context・再認可のいずれか」と並べるにとどまり（CL-0164）、trusted context は上流 PEP が署名/MAC 付きの短命 context を渡す独自方式だった（CL-0166、主張台帳の判定は「修正」）[D]。レビューは workload identity と token exchange の ADR を求めた（R-100）[D]。方向性（service 別 aud、短命化、token exchange、workload identity、共有 client secret の廃止）は承認済みで、実証が残っている（R-206、R-251、R-255、CL-0234、CL-0253）[D]。本 ADR は次の 9 問に答える [D]。

| # | 問い | 主な R/G | 本書の節 |
|---|---|---|---|
| Q1 | workload identity の方式（SPIFFE/SPIRE、クラウドの workload identity federation、混在） | R-100, R-255, G-102 | D09-01〜D09-05 |
| Q2 | trust domain の単位と ADR-013 の cell との関係 | R-207, G-042 | D09-06〜D09-09 |
| Q3 | サービス間の利用者委任（RFC 8693、act の上限、may_act、resource indicator） | R-100, R-251, G-102 | D09-10〜D09-17 |
| Q4 | 共有 client secret の廃止と M2M | R-255, G-102 | D09-18〜D09-21 |
| Q5 | 内部 context を自作せず Transaction Tokens に寄せるか。draft 依存のリスク管理 | R-100, R-209 | D09-22〜D09-27 |
| Q6 | 外部要求 1 件ごとの `txn` と `rctx`・`tctx`・`purp` を呼出し連鎖全体で引き継ぎ、「共通基盤を通った一貫したリクエスト」の証跡にする方式 | R-118, R-128 | D09-28〜D09-33 |
| Q7 | access token に trace id を入れない理由と、traceparent・decision_id・jti との監査上の結合（ADR-014 と整合） | R-118, R-128 | D09-34〜D09-36 |
| Q8 | trust domain 越え（法域パーティション越え・外部）の委任 | G-102 | D09-37〜D09-38 |
| Q9 | 静的安定性・失効・暗号移行への備え | R-143, R-207, G-068 | D09-39〜D09-43 |

詳細な claim 目録（名前・型・PII 区分）は 04_architecture/claims-catalog.md（ARC-15、DL-115、Wave C）に委ね、本書は claim の役割と採否だけを決める [D]。非同期・長時間ジョブの委任の詳細は ADR-026、AI エージェントは ADR-017 に委ね、本書はそれらが従う共通の枠（Txn-Token の内部開始フロー、act の表現）だけを決める [D]。

### 1.2 制約（規範。強度は原文どおり）

| # | 内容 | 強度 | 根拠 |
|---|---|---|---|
| N-a | X509-SVID は URI SAN をちょうど 1 つ含む。複数の URI SAN を持つ SVID を検証者は拒否する | MUST | SPIFFE X509-SVID §2 [N][^7]（RS-06#4） |
| N-b | JWT-SVID は `aud` と `exp` を必須とし、自分が `aud` に含まれない token を拒否する。bearer token として replay を受けやすく、単一 audience が強く推奨される | MUST／strongly recommended（小文字、SPIFFE は BCP 14 適用を宣言していない） | SPIFFE JWT-SVID §3.2, §4, §7.1, §7.2 [N][^8]（RS-06#5） |
| N-c | 署名用証明書は名前制約で SPIFFE ID の名前空間を制限してよい。名前制約は侵害された署名用証明書の影響を名前付きの trust domain に限るために使う。URI 型名前制約の実装支援は乏しく、注意が促されている | MAY | SPIFFE X509-SVID §4.2 [N][^7]（research 外。起草者が 2026-10-15 に確認） |
| N-c2 | SVID を検証するときは、SVID が属する trust domain に対応する bundle を選ばなければならない（小文字 must）。URI 型の名前制約は URI の host 部に適用される | must（小文字）／MUST | SPIFFE Trust Domain and Bundle §3 [N][^39]、RFC 5280 §4.2.1.10 [N][^40]（いずれも research 外。レビュー者が 2026-10-15 に確認） |
| N-d | trust domain 名は自己登録で大域的一意性の保証がない。自社登録ドメインを接尾辞に使うと衝突の可能性が下がる | 記述（助言） | SPIFFE-ID §2.1.1 [N][^9]（RS-06#7） |
| N-e | 認可ポリシーは trust domain と検証に使った trust anchor を考慮せずに識別子の path だけを評価してはならない。無関係な workload インスタンス間で秘密鍵を共有してはならない | MUST NOT（draft） | draft-ietf-wimse-mutual-tls-02 §5 [N][^12]（RS-06#25） |
| N-f | 識別子は暗号学的に検証された資格情報で提示された場合に限り認証済みとみなす。別の workload への再割当ては避けるべき | MUST NOT／SHOULD NOT（draft） | draft-ietf-wimse-identifier-03 §7.2, §4.5 [N][^13]（RS-06#25） |
| N-g | token の寿命はそれが表す workload インスタンスの寿命を超えない（発行基盤が寿命を判定できない場合を除く）。インスタンス停止時に発行元は資格情報を無効化する（残余期間が許容できるほど短い場合を除く）。JWT 資格情報は `aud` を持ち、原則として複数 audience を持たない | MUST NOT／MUST（draft） | draft-ietf-wimse-workload-identity-practices-07 §5.4, §5.5, §5.7 [N][^14]（RS-06#26） |
| N-h | 各サービスは接続ごとに短命で暗号学的に検証可能な ID 資格情報を提示し、定期的に再認証する。外部利用者の短命な資格情報を各 hop で認証できるローカルな token に交換することを推奨する | should（推奨） | NIST SP 800-207A ID-SEG-REC-2, ID-SEG-REC-4 注記 [N][^18]（RS-06#9, #10） |
| N-i | workload identity は承認済みの企業 ID 基盤から発行される範囲を絞った短命 token を使う。可能な場合は mTLS や DPoP の送信者制約を使う | MUST／SHOULD（政策・契約で拘束されない限り任意適合） | NIST IR 8587 §5.3.1.6, §1.2 [N][^19]（RS-06#11） |
| N-j | AS は subject_token と actor_token をそれぞれの種別に応じて検証する。token exchange は入力 token と出力 token を強く結び付けず、失効の伝播は STS の一般的性質ではない | MUST／記述 | RFC 8693 §2.1 [N][^4]（RS-06#44） |
| N-k | アクセス制御で考慮するのは top-level claim と `act` が示す現在の actor だけで、入れ子の過去 actor は情報扱い | MUST | RFC 8693 §4.1 [N][^4]（RS-06#45、RS-04#66） |
| N-l | `may_act` は、ある主体が別主体の代わりに行動することを認可されているという表明で、AS が token exchange で判定に使い得る。処理義務は定めていない | 記述 | RFC 8693 §4.4 [N][^4]（RS-06#45） |
| N-m | `resource` は絶対 URI で fragment を含まない。AS は発行する access token を `resource` が示す資源に audience 制限すべき | MUST／SHOULD | RFC 8707 §2 [N][^5]（RS-04#65、RS-06#59） |
| N-n | Txn-Token の typ は `txntoken+jwt`。必須 claim は `iat`・`aud`（trust domain、それ以外で受け入れない）・`exp`・`txn`・`sub`・`scope`・`req_wl`、`tctx`・`rctx` は RECOMMENDED。受信者は理解できない claim を無視する | MUST／REQUIRED／RECOMMENDED（draft） | draft-11 §9.1, §9.2 [N][^1]（RS-06#31） |
| N-o | TTS は要求元 workload を認証し、発行する `scope` を元の subject_token 以下にする。subject_token の scope を判定できなければ拒否する | MUST／MUST NOT（draft） | draft-11 §11.3, §13.6, §13.14 [N][^1]（RS-06#33） |
| N-p | Txn-Token は `Txn-Token` ヘッダで渡し、Authorization ヘッダを使わない。受信 workload は署名・aud・期限を検証し、下流には受け取った Txn-Token を無改変で含める | MUST／MUST NOT（draft） | draft-11 §12, §12.1, §12.2 [N][^1]（RS-06#35） |
| N-q | Txn-Token は replay に耐性がなく短命にする。workload の認証資格情報としても OAuth access token としても使わない | MUST／MUST NOT（draft） | draft-11 §13.1, §13.12, §13.13 [N][^1]（RS-06#36） |
| N-r | 各 trust domain は論理的にちょうど 1 つの TTS を持つ（複数インスタンスは想定内） | MUST（draft） | draft-11 §3, §10 [N][^1]（RS-06#38） |
| N-s | 置換 Txn-Token で許可範囲を広げたり `txn`・`sub`・`aud` を変えたりしない。期限切れ token の置換も発行しない | MUST NOT（draft） | draft-11 §13.15 [N][^1]（RS-06#40） |
| N-t | Txn-Token 全体をそのままログに記録しない | MUST NOT（draft） | draft-11 §15.2 [N][^1]（RS-06#41） |
| N-u | 非対称暗号によるクライアント認証（mTLS、private_key_jwt）が RECOMMENDED。access token は特定の RS に audience を絞るべきで、RS は自分宛てでない token を拒否する | RECOMMENDED／SHOULD／MUST | RFC 9700 §2.5, §2.3 [N][^20]（RS-17#19、RS-04#17, #20） |
| N-v | client credentials grant は confidential client だけが使う。この grant の token 応答に refresh token を含めるべきでない | MUST／SHOULD NOT | RFC 6749 §4.4, §4.4.3 [N][^24]（RS-17#18） |
| N-w | traceparent・tracestate に個人識別情報や機微情報を入れない。目的は trace の相関だけ。公開 API で外部の trace を素直に継続すると trace-id 衝突を偽造され得る | MUST NOT／記述 | W3C Trace Context §6, §7.2 [N][^25]（RS-10#16, #17） |
| N-x | Sampler が DROP を返すと span は記録されず event と attribute も捨てられる | 記述（Stable 仕様） | OpenTelemetry Tracing SDK [N][^26]（RS-10#22） |
| N-y | trust domain を越えて context を保つ場合は identity chaining 草案を使うべき | SHOULD（draft） | draft-11 §14 [N][^1]（RS-06#41） |

### 1.3 前提（A-ID）

| A-ID | 値（基準） | 本 ADR での使い方 |
|---|---|---|
| A-012 | workload ID 5,400・本番インスタンス 1.1 万。資格情報寿命 1 時間・半減時更新で発行は約 6/秒 [A-012] | SPIRE の発行量、静的安定性の窓 |
| A-028 | token 寿命内に 1 session が要求する下流 audience 数 6 [A-028] | exchange 量。NA09-1 の分散係数と組み合わせる |
| A-040 | edge API 呼出 16,804/秒（成長 56,444） [A-040] | Txn-Token の発行量（U-02 の (a)） |
| A-043 | token 発行 1,374/秒（うち token exchange 1,112/秒、81%） [A-043] | STS の容量と署名費用（ADR-007 が本書に従属） |
| A-050 | 依存サービス 300 [A-050] | 登録簿の規模、SDK 導入対象 |
| A-054 | プラットフォーム 24 FTE（うち SRE 6） [A-054] | 運用要員の比較 |
| A-063 | リージョン 4（日本主・副、EU、米国） [A-063] | 発行系の配置 |
| A-110 | 共有シークレット/API key だけで認証するサービス 45 [A-110] | 移行の先行条件 |
| A-113 | 共有シークレット・静的資格情報 3,000 件、rotation 記録のない比率 50% [A-113] | 共有 client secret の廃止計画 |
| A-014 | AI エージェント ID 1 万（範囲 1,000〜10 万） [A-014] | ADR-017 と共有する workload ID 発行量の上振れ |

**新規仮定（前提台帳へ追加要）**

前提台帳は本書から編集しない [D]。

| 仮 ID | 内容 | 扱い |
|---|---|---|
| NA09-1 | インスタンス分散係数 r: 同じ session の要求が token 寿命内に同じサービスの何インスタンスに分散するか。exchange 済み token はインスタンスの SVID に束縛され（D09-12）インスタンスごとに cache されるので、exchange 量は A-043 の 1,112/秒 × r の桁になる | 値は TBD（所有者 SRE 責任者、期限 G4、決め方: H09-05 の実測）。感度は r＝1, 3, 10 で 1,112／3,336／11,120 回/秒 [D][A-043] |
| NA09-2 | act の入れ子の深さ上限 N_act の初期案 3。A-028 の構成（3 サービス経由、各 1 下流）では深さ 1〜2 が通常で、余裕を 1 とった値 | 値は TBD（所有者 CTO、期限 G3、決め方: As-Is の呼出しグラフ DL-50 と H09-01） |
| NA09-3 | 構築要員: SPIRE と federation、STS の exchange profile、TTS、登録簿、SDK・sidecar の検証部品で 3〜5 FTE × 12〜18 か月。定常は 2〜3 FTE（A-054 の内数で収まるかは未確認）。根拠は ADR-007 N7-8（鍵系 2〜3 FTE × 12〜18 か月）との部品数の比較だけで弱い | H09-11（要員の実測）と DL-33 で更新 |
| NA09-4 | 静的資格情報 1 件あたりの置換工数 0.5〜3 人日。3,000 件で 1,500〜9,000 人日の桁 [A-113] | 根拠なしの仮置き。As-Is（DL-50）の抽出調査で更新 |
| NA09-5 | 業務サービス（依存サービス）は cell に属さず、リージョンに配備されて複数 cell のテナントを処理する（ADR-013 §6「依存サービスは cell を意識しない」からの推論） | 業務サービスを cell 単位に配備する方針が出たら D09-08 を見直す |
| NA09-6 | 法域パーティションを越える同期呼出しの比率 | TBD（所有者 CTO＋法務、期限 G1、決め方: As-Is）。越境呼出しは DL-34 の移転判定の対象 |

### 1.4 関連 R/G

本書を対応成果物（ファイル名・ADR-ID・DL-12）に含む行は R-100、G-020、G-102 である（traceability/R-requirements.md・traceability/G-goal-criteria.md の対応成果物欄を 2026-10-15 に Grep で確認）[D]。内容上関係する行と閉じ方は末尾の対応表に示す [D]。

### 1.5 関連研究

| 研究 | 使う項目 |
|---|---|
| RS-06 | #1〜#8（SPIFFE/SPIRE）、#9〜#11（SP 800-207A、IR 8587）、#15〜#28（WIMSE）、#29〜#42（Transaction Tokens）、#43〜#47（RFC 8693、identity chaining）、#52（RFC 7523bis）、#69〜#73（AIMS）、#77〜#80（クラウド federation）、§5.1（draft 依存度の層別 L1〜L4）、§5.2（ADR-009 への入力） |
| RS-04 | #17, #20（RFC 9700 の audience 制限と非対称クライアント認証）、#59（RFC 8705）、#65（RFC 8707）、#66（RFC 8693） |
| RS-05 | #33, #34（CVE-2025-55241）、#44（KMS の要求枠）、結論 9（内部 token を外部 token と同じ統制下に置く） |
| RS-10 | #13（CADF の observer モデル）、#16, #17（Trace Context）、#19（Baggage）、#22（OTel の DROP） |
| RS-17 | #18〜#23（M2M profile）、#25, #26（委任と Txn-Token の寿命）、#30, #31（ジョブ・CI の短命資格情報） |

### 1.6 関連脅威と攻撃者

| T-ID（03_threat-model/threat-catalog.md） | 本書の統制 |
|---|---|
| T-025 内部 context の偽造・欠落 | D09-22〜D09-33（Txn-Token profile、mTLS 併用、証跡） |
| T-037 token exchange による権限の拡大 | D09-10〜D09-17（登録簿、downscope、深さ上限、resource 必須） |
| T-038 派生 token の失効非連動 | D09-40（派生 token の寿命上限、ADR-006 へ） |
| T-039 長時間ジョブの委任 | D09-31（内部開始フローの枠。詳細は ADR-026） |
| T-040 未署名・内部 token の受理と発行記録の欠落 | D09-14, D09-17, D09-24（全派生 token の署名・台帳、actor_token を使わない） |
| T-015 audience 誤用・横流し | D09-11, D09-12 |
| T-017 trace context・baggage の注入 | D09-34〜D09-36 |
| T-021 tenant confusion | D09-29（tctx の tid と資源側テナントの照合） |
| T-053 長寿命秘密情報の漏えい | D09-18〜D09-21 |

攻撃者類型（03_threat-model/attacker-model.md）のうち主に扱うのは、ATK-06（侵害された microservice）、ATK-07（CI/CD 侵害）、ATK-08（クラウド管理者）、ATK-15（第三者連携アプリ）、ATK-16（濫用される AI エージェント）、ATK-17（内部不正の開発者）、ATK-19（変更と自動化の誤り）である [D]。優先順位は、(1) 侵害された workload 1 つが自分の登録範囲を超えて他サービス・他テナント・他パーティションに到達できないこと、(2) 内部 token・context の偽造と未署名経路が検査点で必ず拒否されること、(3) 取引の連鎖を監査から再構成でき trace の欠落・偽造に左右されないこと、の順とする [D]。

---

## 2. 決定

本節はすべて決裁前の提案である [D]。

### 2.1 workload identity の方式（Q1）

- **D09-01** サービス間呼出しの呼出し元認証の正本は SPIFFE ID とし、資格情報は X.509-SVID による mTLS を既定にする [D]。SPIFFE-ID・X509-SVID・JWT-SVID の各仕様は 2026-10-03 時点で SPIFFE の安定度区分 Stable であり [N][^7][^8][^9]（RS-06#3）、RS-06 の層別では L1（基盤の契約に直接使える）に当たる [D]（RS-06 §5.1）。SVID は URI SAN をちょうど 1 つ持ち、複数持つものを拒否する（MUST）[N][^7]（RS-06#4）。
- **D09-02** 発行系は SPIRE を第一候補にする [D]。SPIRE は 2022-08-22 に CNCF Graduated となった [V][^10]（RS-06#8）。製品の最終選定は ADR-001 の評価枠（D1-1 のプロトコル処理を自作しない原則）で行い、Graduated であることを採用の十分条件にはしない [D]。
- **D09-03** クラウド事業者の API（KMS、ストレージ、キュー等）を呼ぶときに限り、各社の workload identity federation を使い、外部資格情報として SPIFFE の資格情報を提示する [D]。Google Cloud は X.509 クライアント証明書と OIDC を含む外部資格情報との federation を [V][^28]、Microsoft Entra は SPIFFE/SPIRE を含む外部 IdP の token の交換を [V][^31]、AWS IAM Roles Anywhere は自社 CA 発行の X.509 証明書による一時資格情報を [V][^30] 公式に提供している（RS-06#77, #79, #80）。クラウド固有の ID（IAM role、service account 等）は「そのクラウドの資源への権限」を表すだけにし、サービス間の呼出し元識別には使わない [D]。
  - AWS IAM Roles Anywhere は信頼境界がアカウント単位で、ロールの信頼ポリシーに条件を付けない限りアカウント内の任意の trust anchor の証明書で任意の対象ロールを引き受けられる [V][^30]（RS-06#79）。このため信頼ポリシーに SPIFFE ID の条件を付けることを必須にする [D]。
  - Microsoft Entra の federated identity credential は issuer・subject・audience を大文字小文字を区別して一致させる必要があり、外部 IdP の署名鍵は最初の 100 個までしか保存されない [V][^31]（RS-06#80）。JWT-SVID の鍵 rotation 計画をこの上限内に置く [D]。
  - クラウドの federation endpoint への実行時依存は ADR-013 D13-21 の列挙対象にし、global endpoint を使う場合は例外登録する [D]。
- **D09-04** JWT-SVID は、X.509-SVID を提示できない相手（クラウドの federation endpoint 等）への単一 audience の補助用途に限る [D]。JWT-SVID は bearer で replay を受けやすく、仕様は単一 audience を強く推奨する [N][^8]（RS-06#5）。JWT-SVID は `typ` で区別できない（任意かつ `JWT`／`JOSE`）ため [N][^8]（RS-06#6）、内部 RS では JWT-SVID を access token として受理しない（ADR-005 V5 の typ 必須で拒否される）[D]。
- **D09-05** WIMSE の Workload Identity Token（WIT）と Workload Proof Token（WPT）は RFC 化まで採らない [D]。WIMSE WG 発の RFC は 0 件で、標準化トラック文書の憲章マイルストーンは期限を過ぎている [N][^36]（RS-06#16）。workload-creds 草案の実装状況節（自己申告で IETF は検証しない）は、SPIFFE の WIT 対応を beta と記載している [N][^15]（RS-06#23）。SPIFFE の WIT-SVID 仕様は Incubating である [N][^37]（RS-06#3）。振る舞い（N-e、N-f の識別子検証の規則）は取り入れ、wire format には依存しない（RS-06 §5.1 の L3 の方針）[D]。

### 2.2 trust domain の単位（Q2）

- **D09-06（推奨。P09-1 として DEC-3 に上げる）** SPIFFE trust domain は法域パーティション（日本／EU・英国／米国）ごとに本番 1 つずつ、非本番に 1 つ置く [D]。理由は次の 4 つである [D]。
  1. SPIFFE の検証者は SVID が属する trust domain に対応する bundle で検証するので（N-c2）[N][^39]、パーティション A の workload CA が侵害されても、B の trust domain を名乗る SVID は B の bundle で検証されて拒否される [D]。名前制約は侵害された署名用証明書の影響を名前付きの trust domain に限るための仕組みだが（N-c）[N][^7]、任意（MAY）で実装支援も乏しく、URI 型の制約は host 部（trust domain）にしか効かない [N][^40]。このため trust domain を本番全体で 1 つにすると、どのパーティションの workload CA が侵害されても、全パーティションの任意の SPIFFE ID を名乗る SVID を作れ、標準の仕組みでは path 単位に封じ込められない [D]。
  2. ADR-013 D13-02 は法域パーティションを「データ・鍵・運用アクセスを共有しない硬い境界」とする [D]。単一 trust domain では全パーティションが 1 つの trust bundle を受け入れることになり、この境界と一致しない [D]。
  3. ADR-007 は法域の間で L1 を共有しない（D7-13）[D]。workload CA を同じ法域単位で分けると、侵害時の封じ込めと回復の単位が鍵階層と揃う [D]。
  4. 法域を越える同期呼出しは、SPIFFE federation の明示的な許可（相手 trust domain の bundle を受け入れる設定）がない限り成立しないので、越境の経路を設定から機械的に列挙できる（DL-34 の移転判定の入力）[D][NA09-6]。
- **D09-07** trust domain 名は ADR-021 D21-28 の規則に従い `<id-domain>` 配下の FQDN にする [D]。自社登録ドメインを接尾辞にすると衝突の可能性が下がる [N][^9]（RS-06#7）。名前にはリージョン名・cell 名を入れず、パーティションを示す不透明な短いコードにする（ADR-021 D21-28 の path 規則と D13-42 の趣旨に合わせる）[D]。非本番の trust anchor を本番の検証点に置かない（ADR-007 D7-04、G-141）[D]。
- **D09-08（cell との関係）** SPIFFE trust domain を cell ごとには切らない [D]。業務サービス（依存サービス約 300）は cell に属さずリージョンに配備され、複数 cell のテナントを処理する [D][NA09-5]。cell を trust domain にすると、業務サービスは 9 個以上の trust domain の SVID を同時に持つ必要が生じ、cell の追加・分割のたびに 300 サービスの設定が変わる（ADR-013 D13-42 が避けた事態）[D][N13-1][A-050]。cell 単位の封じ込めは次の 3 つで行う [D]。
  1. cell 内の基盤部品（edge、STS・TTS、PDP、状態ストア）の SVID は、その cell に置く発行インスタンスから発行し、発行インスタンスごとに中間 CA を分ける [D]。
  2. 内部 access token と Txn-Token の署名鍵は cell ごと（ADR-005 V4、ADR-007 D7-13・族 3/3b）で、業務サービスの SDK は「tid の収容 cell と鍵・aud の cell の一致」を署名付き配置スナップショット（ADR-013 G1）で検証する（ADR-021 D21-07(b) と同じ型）[D]。
  3. cell 間の同期呼出しは置かない（ADR-013 D13-13）[D]。
- **D09-09（Txn-Token の trust domain）** Txn-Token の `aud` に置く trust domain は ADR-005 D9-3 のとおり cell ごとの可逆な内部値とし、SPIFFE trust domain 名とは別物とする（reconciliation-notes C-26）[D]。草案は trust domain ごとに論理的に 1 つの TTS を求めており（MUST）[N][^1]（RS-06#38）、TTS を cell の edge に併設する構成と一致する [D]。業務サービスは複数 cell の Txn-Token を受け取るので、SDK は `tctx` の tid から配置スナップショットで期待する `aud`（cell）を引き、それ以外の `aud` を拒否する [D]。「1 つの workload が複数の Txn trust domain に属する」構成を草案が許すかは明文がなく、解釈のリスク RR09-7 として扱う [D]。草案の審査でこの構成が否定された場合は、パーティション単位の論理 TTS（インスタンスと署名鍵は cell ごと）に寄せ、`aud` をパーティション値に変える（`aud` は内部値なので可逆）[D]。

### 2.3 サービス間の利用者委任（Q3）

- **D09-10（方式）** 利用者の要求を処理する呼出し連鎖では、各 hop で RFC 8693 の token exchange により呼出し先 1 サービスを aud とする内部 access token（RFC 9068 JWT、ADR-005 の at+jwt）を取り直し、同時に Txn-Token を無改変で伝播する（§3.2 の案 C3）[D]。
  - edge の最初の exchange は ADR-005 D1-4 のとおりで、出力 token は `sub`＝利用者、`client_id`＝外部 client、`act` なしとする（edge は経路上の PEP であって代理人ではない）[D]。
  - 業務サービス A が B を呼ぶときは、A が受け取った内部 access token を subject_token にして STS に exchange を要求し、`sub`＝利用者、`act`＝{`sub`: A の主体}、`aud`＝B の token を得る [D]。RFC 8693 の委任では A は B と別の ID を保ち、A が B を代表することが明示される [N][^4]（RS-06#43）。impersonation（`act` を付けない交換）は使わない [D]。
  - SP 800-207A は外部利用者の短命資格情報を各 hop で認証できるローカルな token に交換することを推奨している [N][^18]（RS-06#10）。
- **D09-11（resource indicator と aud）** exchange 要求は `resource`（RFC 8707）に呼出し先サービスの正規識別子を 1 つだけ指定することを必須にし、欠落・複数指定を拒否する [D]。RFC 8707 は AS が token を `resource` の資源に audience 制限すべき（SHOULD）とし [N][^5]（RS-04#65）、RFC 9700 は RS が自分宛てでない token を拒否することを MUST とする [N][^20]（RS-04#17）。共通 aud は発行しない（R-251、ADR-005 V6）[D]。サービスの正規識別子は ADR-021 の名前空間台帳で払い出す不透明な値にする [D]。
- **D09-12（送信者束縛）** exchange で出す内部 access token は、要求元インスタンスの X.509-SVID に `cnf`（x5t#S256）で束縛する（ADR-005 D5 の I1）[D]。RS は TLS 層の証明書と token の束縛証明書の一致を検証し、不一致を拒否する（MUST）[N][^21]（RS-17#22）。証明書を更新すると束縛 token は無効になるので [N][^21]、SDK は SVID 更新の前に token を取り直し、内部 access token の寿命を要求元 SVID の残存期間以下にする [D]。束縛の費用が過大な場合の I2（mesh mTLS＋aud＋呼出し元照合）への切替は ADR-005 K-6 に従う [D]。
- **D09-13（交換可能な組の登録簿）** STS は「呼出し元 workload（SPIFFE ID）× 呼出し先サービス × 許可する scope の上限」の登録簿にない exchange を拒否する [D]。登録はサービス所有者の申請と呼出し先所有者の承認で行い、変更は ADR-016 の版管理と監査の対象にする [D]。これは T-037 の予防策（交換可能な組の宣言）の具体化である [D]。
- **D09-14（actor の身元）** actor の身元は、STS へのクライアント認証（X.509-SVID による mTLS。RFC 8705 の `tls_client_auth` で SAN URI を照合）から取る [D]。RFC 8705 は PKI 方式の client が `tls_client_auth_san_uri` などの metadata のうちちょうど 1 つで期待する証明書 subject を示すことを MUST とする [N][^21]（§2.1.2、research 外。起草者が 2026-10-15 に確認）。RFC 8693 の `actor_token` は使わない [D]。actor を別の bearer token で表すと、その token の窃取・偽造が委任の偽装に直結するためである [D]。CVE-2025-55241 では、発見者の一次報告によれば、service 間通信用の actor token は 24 時間有効で失効できず、それを埋め込む impersonation token は未署名だった [I][^33]（RS-05#34）。
- **D09-15（downscope）** STS が発行する scope は subject_token の scope と登録簿の上限の共通部分以下にする [D]。RFC 8693 は AS に subject_token の種別に応じた検証を求める（MUST）[N][^4]（RS-06#44）。subject_token の scope を判定できない場合は拒否する（Txn-Token 草案の §13.14 と同じ扱いを exchange にも適用する自社判断）[N][^1][D]。
- **D09-16（act の深さ上限）** STS は、出力 token の `act` の入れ子の深さが N_act（初期案 3、NA09-2）を超える exchange と、同じ actor が連鎖に 2 回現れる exchange（循環）を拒否する [D]。RFC 8693 はアクセス制御に最上位 claim と現在の actor だけを使うことを求め、入れ子の過去 actor は情報扱いである（MUST）[N][^4]（RS-06#45）。このため過去 actor は RS のアクセス制御には使わず、STS の発行判断（深さと循環の検査）と監査にだけ使う [D]。チェーン長の上限は標準ではなく社内 profile（DL-74）で決める事項である（RS-06 §2 第 7 項）[D]。
- **D09-17（may_act）** `may_act` は v1 では token に載せない [D]。RFC 8693 は `may_act` を AS が判定に使い得る表明とし処理義務を定めていない [N][^4]（N-l）。「誰が誰の代わりに行動できるか」は D09-13 の登録簿（呼出し元 × 呼出し先）と、ADR-017・ADR-026 の委任 grant（エージェント・ジョブが特定利用者の代わりに動く同意の記録）で STS 側に持つ [D]。整合調整記録の「may_act は AS 側」と一致する [D]（reconciliation-notes §3.3）。trust domain 越えの委任で相手 AS に判断材料を渡す必要が出た場合は再検討する（§8）[D]。

### 2.4 共有 client secret の廃止と M2M（Q4）

- **D09-18** 新規に登録する client と workload 間認証では、共有 client secret（client_secret_basic・client_secret_post・client_secret_jwt、静的 API key）を禁止する [D]。RFC 9700 は非対称暗号のクライアント認証を RECOMMENDED とし、理由に AS が機密な対称鍵を保存せずに済むことを挙げる [N][^20]（RS-17#19）。
- **D09-19（M2M の profile）** 利用者の代理でない M2M（サービスが自身の権限で他サービス・外部 API を呼ぶ）は client credentials grant に限り、confidential client だけが使う（MUST）[N][^24]（RS-17#18）。refresh token は発行しない（RFC 6749 §4.4.3 の SHOULD NOT）[N][^24]。クライアント認証は次の 2 つに限る [D]。
  - 内部 workload: X.509-SVID による mTLS（D09-14 と同じ）[D]。
  - 外部 partner・社外 workload: private_key_jwt（RFC 7523。`aud` は AS の issuer 識別子を唯一の値にし、token endpoint URL を使わない）か mTLS [D]。RFC 7523 はクライアント認証の JWT に `iss`・`sub`（client_id）・`aud`・`exp` を求める（MUST）[N][^22]（RS-17#20）。`aud` の規則は RFC 7523bis-11（RFC Ed Queue、RFC 未発行）が締めており [N][^23]（RS-06#52、RS-17#21）、本書は RFC 発行前から 7523bis の規則を採る（厳しくなる側の先行採用）[D]。
  - M2M の access token の `sub` は ADR-021 D21-10 の単一名前空間の主体で、主体種別 claim を workload または service account にする（ADR-005 D9-4）[D]。
- **D09-20（既存の静的秘密の移行）** 既存の共有シークレット・静的資格情報（仮置き 3,000 件、rotation 記録なし 50%）[A-113] は、期限付きの例外（01_governance/exception-risk-acceptance.md の様式）として登録し、次の順で置き換える [D]。
  1. CI の秘密を OIDC 連携の短命資格情報に置き換える（CB-REQ-20）[D]。GitHub Actions の OIDC はジョブごとに JWT を要求し、クラウド側が claim を検証してジョブの間だけ有効な短命 token を発行するので、長寿命の秘密をリポジトリに置かずに済む [V][^34]（RS-17#30）。
  2. 共有シークレットだけで認証する 45 サービス [A-110] を workload ID に移す（ADR-027 の移行順序の先行条件）[D]。
  3. 残る service account の秘密を非対称鍵に置き換える（PC-12）[D]。
  - 期限と例外の上限件数は TBD とする（所有者 CISO＋プラットフォームチーム長、期限 G1 で As-Is 確定後に決める）[D]。工数は NA09-4 の桁で仮置きする [D][NA09-4]。
- **D09-21（KRI）** 残存する静的秘密の件数、期限切れ例外の件数、静的秘密による認証の成功回数を KRI 候補として 01_governance/kri.md の所有者へ申し送る（SRC-05 の資格情報台帳を出所にする）[D]。

### 2.5 内部 context を Transaction Tokens に寄せる判断と draft 依存の管理（Q5）

- **D09-22（採用）** 内部取引 context は自作せず、Transaction Tokens 草案の形式に寄せた社内 profile `txn-v1` を使う（ADR-022 D-2 の名前）[D]。草案は「署名付き短命内部 context」を目的とする形式と、RFC 8693 を使う発行手順を定めている [N][^1]（RS-06#30〜#32）。WIMSE アーキテクチャ草案も、gateway が外部 access token を token exchange で transaction token 等の内部 context token に変換し、外部の bearer token を内部に転送しない構成例を示す [N][^11]（RS-06#18）。旧提案の trusted context（MAC 付き独自形式）は棄却する（§5、CL-0166）[D]。
- **D09-23（版の固定）** `txn-v1` は draft-ietf-oauth-transaction-tokens-11（2026-07-30）に固定する [D]。2026-10-15 時点の Datatracker では最新版は -11 のままで、IESG 状態は「I-D Exists」（IESG 未提出）、RFC ではない [N][^3]。draft の失効予定は 2027-01-31 である [N][^3]（RS-06#29）。
- **D09-24（凍結区分と adapter）** 契約上の凍結は ADR-022 D-2 の区分に従う [D]。
  - GA: `txn` 欄の意味（取引の一意な不透明文字列、PII を含まない）、`Txn-Token` ヘッダを無改変で下流へ渡す義務、Authorization ヘッダに入れない義務、全文をログに残さない義務 [D]（ADR-022 D-2）。
  - preview: claim 構成（`tctx`・`rctx` の中身）と TTS への要求形式 [D]。
  - Txn-Token の生成・検証は共通 SDK・sidecar の adapter に閉じ込め、依存サービスのコードは Txn-Token の中身を読まない（読むのは SDK が検証後に渡す型付きの値だけ）[D]。
  - Txn-Token も外部 token と同じく署名・発行台帳・テナント結合・短寿命の対象にし、未署名の Txn-Token（草案の `unsigned_json` 型 subject_token を含む）を受け付ける経路を持たない [D]。草案は subject_token に署名なし JSON も使えるとしているが [N][^1]（RS-06#32）、T-040（未署名・内部 token の受理）を避けるため、TTS は署名済みの内部 access token だけを subject_token に受け付ける [D]。
- **D09-25（draft の差分管理）** 新しい版が出るたびに、標準ステータス台帳（research/standards-status.md の SS-B04）の四半期更新に合わせて差分を評価し、`txn-v1` を改版するか据え置くかを ADR-016 の手順で決める [D]。改版は新しい typ・profile 版で並行提供し、既存の版を壊さない（ADR-005 V13）[D]。
- **D09-26（退避経路）** draft が失効・廃案になった場合、または `txn`・`typ`・必須 claim の意味が大きく変わった場合は、ADR-022 D-8-5 のとおり edge が発行する自社形式の取引 ID を同じ `txn` 欄に入れる [D]。`txn` の名前と「一意の取引識別子」という意味は RFC 8417 §2.2 が定め IANA に登録されており [N][^6]、SET 以外の JWT でも使えるので [N][^6]、退避しても欄の意味は変わらない [D]。adapter の差替えで依存サービスの差分が 0 であることを H09-08（ADR-022 H-10 と共同）で確かめる [D]。
- **D09-27（TTS の実装）** TTS は ADR-001 D10 の cell 内 STS の上に、RFC 8693 の profile として実装する（プロトコル処理を自作しない D10-2 の範囲内）[D]。草案には実装状況節がなく、Txn-Token に対応した既製の TTS は RS-06 の調査で確認できていない（RS-06 §6）[D]。このため TTS の発行方針・claim 生成の部分は自社部品になり、ADR-001 D1-5 の例外審査に載せる [D]。

### 2.6 `txn`・`tctx`・`rctx`・`scope`（`purp`）の引継ぎと証跡（Q6）

- **D09-28（`txn`）** `txn` は外部要求 1 件ごとに、cell の edge 併設 TTS が CSPRNG で 1 回だけ払い出す [D]（ADR-005 D9-2 L3、ADR-021 D21-35, D21-36）。値は D21-09 と同じ不透明な乱数形式にし、時刻・ホスト名・cell 名を埋め込まない [D]。下流の各サービスは受け取った Txn-Token を無改変で下流に含める（草案の MUST）[N][^1]（RS-06#35）ので、`txn` は呼出し連鎖全体で 1 つの値になる [D]。置換 Txn-Token でも `txn` を変えてはならない（MUST NOT）[N][^1]（RS-06#40）。
- **D09-29（`tctx`）** `tctx`（呼出し連鎖で不変の値、草案で RECOMMENDED）[N][^1] は `txn-v1` で必須にし、次の値に限る [D]。名前は DL-115 で決める [D]。

| 内容 | 必須 | 用途 | 根拠 |
|---|---|---|---|
| 作用中テナント（tid） | 必須 | PEP が資源側テナントと突き合わせる（T-021）。SDK が期待 `aud`（cell）を引く鍵（D09-09） | 草案はテナント claim を定義していない [N][^1]（RS-06#42）。ADR-005 D9-3 と ADR-021 D21-35 が必須とした [D] |
| 内部 token 系譜の起点 jti | 必須 | edge の最初の exchange で出した内部 access token の jti。取引と token 系譜の結合キー | ADR-005 D9-3 [D] |
| grant 参照・sid | 利用者主体で必須 | 一括失効・全 session 失効と取引の結合 | ADR-005 D9-2 L2 [D] |
| 起点の操作階層 | 必須 | entry point 台帳（ADR-012）で宣言した階層。下流 PEP の fail-mode 選択（ADR-013 D13-28）と監査 | 02_requirements/operation-risk-tiers-assurance.md §2 [D] |
| 親取引の `txn` | 内部開始の取引だけ | 非同期処理・ジョブが元の取引と結び付くための参照（D09-31） | 自社判断 [D] |
| profile 版 | 必須 | `txn-v1` の版 | ADR-005 V13 [D] |

  - 取引の業務パラメータ（金額・対象 ID 等）は `tctx` に入れない [D]。草案の例は `tctx` に取引パラメータを入れているが [N][^1]、高リスク操作の取引内容は内部 access token の `authorization_details`（ADR-005 D9-4）に置き、PDP の入力にする [D]。Txn-Token は access token として使ってはならない（MUST NOT）[N][^1] ため、認可の根拠を Txn-Token に置かないためである [D]。
  - 個人識別属性（氏名・メール等）と権限（roles・groups）は入れない（ADR-005 D9-4 の「載せない」行と同じ）[D]。
- **D09-30（`rctx`）** `rctx`（要求環境、草案で RECOMMENDED）[N][^1] は、ADR-005 D9-3 の「rctx の IP 等の要求環境は採らない」に従い、`txn-v1` では発行しない [D]（独立レビューで修正。旧版は 4 項目に限って採るとしていた）。草案の例は送信元 IP を `rctx` に入れているが [N][^1]、IP は監査の edge 記録（ADR-014）にだけ残す [D]。受信した `rctx` は未知 claim と同じく無視する [D]。
  - 次の非個人情報を `rctx` に載せる案は、v2 以降の候補として P09-3 で ADR-005 の所有者に提案する [D]。(a) entry point の識別子、(b) 外部 client の種別（第一者 BFF・ネイティブ・第三者・M2M）、(c) 送信者制約の方式（DPoP・mTLS・なし）、(d) 認証文脈の要約（acr。草案の例の `authn` に相当）[D]。v1 ではこれらを edge の監査記録に置き、(d) は内部 access token の acr（ADR-005 D9-4）で PDP に渡す [D]。認可判断に使う値は PDP の入力として明示する（ADR-011 の属性辞書に登録）[D]。
- **D09-31（`scope` と `purp`）** Txn-Token の `scope` は草案の必須 claim で、取引の目的・意図をできるだけ狭く表す値として TTS が trust domain の認可モデルに沿って決める [N][^1]（§9.2.1、RS-06#42）。`txn-v1` では entry point 台帳の操作 ID（例: 「請求書の承認」）を `scope` に入れ、外部 client の scope より狭くする [D]。発行する `scope` は subject_token の scope 以下にする（MUST）[N][^1]（RS-06#33）。
  - 草案の -06（2025-07-28）は取引の目的を `purp`（REQUIRED）で表していたが [N][^2]、-11 の Document History は「Since Draft 06」の変更として「Rename the purpose claim to scope」を記録している [N][^1]（research 外。起草者が 2026-10-15 に確認）。このため `txn-v1` は `purp` を発行も検査もしない [D]。旧版の `purp` を含む token を受け取っても、未知 claim として無視する（草案の MUST）[N][^1]。
  - Txn-Token の `scope`（取引の意図）は、個人データ処理の「利用目的」（ADR-022 D-9-2 が名前だけ予約した項目、監査の目的欄）とは別の概念である [D]。後者は ADR-014・DL-115 で扱い、`scope` を利用目的の代わりに使わない [D]。
- **D09-32（発行と受信の手順）** edge・TTS・業務サービスの手順を次のとおりにする [D]。
  1. edge が外部 opaque token を検証する（ADR-005 D1-2）。
  2. edge が cell 内 STS で exchange し、最初の呼出し先を aud とする内部 access token を得る（D09-10）。
  3. edge が TTS に RFC 8693 で Txn-Token を要求する。`requested_token_type` は `urn:ietf:params:oauth:token-type:txn_token`、`audience` は cell の trust domain 値、`subject_token` は 2 の内部 access token とする（草案の MUST）[N][^1]（RS-06#32）。TTS と要求元は相互認証し（MUST）[N][^1]（RS-06#34）、本書では SVID の mTLS で行う [D]。`req_wl` は edge の SPIFFE ID にする [D]。
  4. 業務サービスの SDK・sidecar は、受信時に (i) mTLS の peer SPIFFE ID が登録簿で自分を呼べる workload か、(ii) 内部 access token の V1〜V14（ADR-005）と `cnf`、(iii) Txn-Token の署名・`aud`・`exp`（草案の MUST）[N][^1]、(iv) 両 token の `sub` の一致と、Txn-Token の tid と内部 access token の tid の一致、(v) tid の収容 cell と Txn-Token の `aud`・署名鍵の cell の一致、を検証する [D]。1 つでも失敗したら拒否する [D]。
  5. 下流を呼ぶときは、Txn-Token を無改変で `Txn-Token` ヘッダに入れ、内部 access token は exchange で取り直す（受け取った token を下流へ素通ししない）[D]。
- **D09-33（発行範囲。未決 U-02 への入力）** ADR-005 D9-3 は Txn-Token の発行を write・privileged・break-glass/B・FAPI 範囲に限り、全要求への拡大は未決の論点 U-02 である（reconciliation-notes §5）[D]。本書は次の条件付きで (a)「全要求に発行」を推奨する入力を U-02 に出す [D]。
  - 理由: 「共通基盤を通った一貫したリクエスト」を階層によらず同じ型の証跡で示せ、ADR-022 D-8-3 の主キー `txn` と H-4 の再構成率 100% を全階層に適用できる（R-118, R-128）[D]。`txn` のない階層は (jti, decision_id, X-Request-ID) で相関するので、証跡の強さが階層で異なる [D]。
  - 費用: 全要求に発行すると署名は基準 16,804/秒・成長 56,444/秒になる [D][A-040]。9 cell に均等に配ると 1 cell あたり約 1,870/秒（成長約 6,270/秒）である [D][A-040][N13-1]。AWS KMS の非対称署名の既定要求枠は鍵種別ごとに 1,000 req/s（アカウント×リージョンの共有枠、調整可）で [V][^32]（RS-05#44。同じページの説明例には RSA 500・ECC 300 という表と食い違う値が残っており、低い方なら超過幅はさらに大きい）、cell 専用アカウント（ADR-007 D7-06）でも既定枠を超える [D]。
  - 条件: (i) ADR-005 H-20 で署名・検証の遅延が合格すること、(ii) ADR-007 の Signer 抽象で、族 3b の鍵を KMS 直接署名以外の backend（cell 内の隔離実行環境での署名など）で使う例外が ADR-007 の手続きで承認されるか、KMS の要求枠の引上げが確保されること [D]。どちらかが成立しなければ (b)「write 以上に限る」に戻す [D]。決めるのは CTO＋CISO（ADR-005 §2.15 U2）である [D]。

### 2.7 trace id を入れない理由と監査上の結合（Q7、ADR-014 と整合）

- **D09-34（入れない）** trace id（W3C traceparent の trace-id）は内部 access token にも Txn-Token にも入れない [D]。理由は整合調整記録 §3.1 の 3 つ（token の再利用で要求単位にならないこと、Trace Context の目的が相関だけで PII を入れてはならず外部から衝突を偽造され得ること、Sampler の DROP で span が記録されないこと）に、次の 1 つを加える [D]。
  - Txn-Token は呼出し連鎖で無改変（MUST）[N][^1] なのに対し、trace context は各 hop で span ID が変わり、信頼境界で再採番され得る [D]。値の寿命と変更規則が異なる識別子を同じ署名付き token に入れると、どちらかの規則を破ることになる [D]。
  - 根拠の原典: Trace Context §6 の MUST NOT と §7.2 の偽造の注意 [N][^25]（RS-10#16, #17）、OTel の DROP [N][^26]（RS-10#22）。Baggage は利用者を識別できるデータが入り得ることへの注意を求めており [N][^27]（RS-10#19）、認可・取引の context を Baggage で運ばない（ADR-022 D-8-4）[D]。
- **D09-35（監査の欄と結合）** 監査イベントの欄は整合調整記録 §3.2 の 8 欄（iss、jti、sid、grant 参照、txn、decision_id、X-Request-ID、trace_id）に揃える [D]。本書が足すのは、STS・TTS の発行台帳に置く次の欄である（ADR-014・DL-77 への入力）[D]。
  - STS の交換台帳: 入力 token の (iss, jti)、出力 token の (iss, jti)、呼出し元 SPIFFE ID、呼出し先、発行 scope、`act` の深さ、`txn`（受信した Txn-Token があれば）[D]。
  - TTS の発行台帳: `txn`、Txn-Token の hash、`req_wl`、`sub`、tid、起点 jti、`aud`（cell）、`exp` [D]。Txn-Token の全文は記録しない（MUST NOT）[N][^1]（RS-06#41）。
  - `jti` をハッシュで記録する場合の関数と鍵は、発行台帳（ADR-007 D7-45）と判定記録で同じにする（reconciliation-notes C-34。決定は ADR-014）[D]。
- **D09-36（再構成の手順と trace_id の位置付け）** 「共通基盤を通った一貫したリクエスト」は監査から次の順で再構成する [D]。
  1. `txn` で TTS の発行台帳を引き、起点 jti・tid・sid・grant 参照を得る（edge で外部 token が検証された取引であること）[D]。
  2. `txn` で各 PEP の判定記録（decision_id、X-Request-ID）を集め、PDP 側の記録と decision_id で突合する [D]。CADF は各 observer が自分の層で見えたものだけを記録し、他の observer の記録と相関させるモデルを取る [N][^38]（RS-10#13）。
  3. 各判定記録の提示 token の jti から、STS の交換台帳を入力 jti へ辿り、起点 jti に戻れることを確かめる（token 系譜の連続性）[D]。
  4. trace_id は 1〜3 の検索を速くする索引にだけ使い、trace の欠落・偽造で 1〜3 の結果が変わらないことを H09-07 で確かめる [D]。edge は外部から届いた traceparent を信頼境界で再採番し、外部の値は別属性に退避する（ADR-005 D9-2）[D]。
  - AIMS 草案（Informational の WG 文書 -00）は、配備がエージェントの行動と認可文脈を事後に再構成できる監視を維持し（MUST）、監査記録は改ざん検知可能であること（MUST）を求めている [N][^35]（RS-06#73）。本書の手順はエージェント以外の workload にも同じ再構成可能性を与えるものとして位置付ける [D]。

### 2.8 trust domain 越えの委任（Q8）

- **D09-37** 法域パーティション（SPIFFE trust domain）を越える利用者委任は、identity chaining 草案（-17、Internet-Draft。IESG 状態は RFC Ed Queue で RFC 未発行、2026-10-03 確認）の方式で表す [N][^17][^36]（RS-06#46、standards-status SS-B05）。trust domain A の STS が exchange で JWT authorization grant を出し、B の AS が RFC 7523 の assertion として検証して B の access token を出す [N][^17]。grant の `aud` は B の AS を示さなければならず（MUST）、単一の AS に限ることが RECOMMENDED である [N][^17]（RS-06#47）。B の AS は A の client に refresh token を発行すべきでない（SHOULD NOT）[N][^17]。Txn-Token 草案も trust domain を越える場合は identity chaining を使うべき（SHOULD）とする [N][^1]（RS-06#41）。
  - Txn-Token は trust domain を越えて渡さない（`aud` の trust domain 外で受け入れてはならない MUST）[N][^1]（RS-06#31）。B 側では B の TTS が新しい Txn-Token を発行し、`tctx` の親取引欄に A 側の `txn` を入れて結び付ける [D]。
  - 越境は DL-34 の移転判定と ADR-013 D13-02 の境界規則に従い、許可した組（A の呼出し元 × B の資源）だけを SPIFFE federation と B の AS の信頼設定に登録する [D][NA09-6]。
- **D09-38** 外部（顧客企業 IdP・第三者 AS）との委任は ADR-004・ADR-017 で扱う [D]。ID-JAG（-04、WG Document、2026-11-22 失効予定）は任意機能の PoC にとどめる（RS-06 結論 10）[D]。

### 2.9 静的安定性・失効・暗号移行（Q9）

- **D09-39（SVID の寿命と発行系の停止）** X.509-SVID の寿命はインスタンスの寿命以下にし（N-g）、更新は残存寿命の半分で行う [D]。値は TBD とする（所有者 CTO＋CISO、期限 G4、決め方: DL-20 で BIA の停止許容時間と H09-04 の実測から決める）[D]。容量計算は A-012 の 1 時間を使う [D][A-012]。発行系（SPIRE server 等）が止まっても、既発行 SVID は残存寿命まで有効で、半減時更新なら停止後おおむね寿命の半分（1 時間なら約 30 分）は新規発行なしで業務が続く [D][A-012]。障害時だけ寿命を延ばす grace は設けない（ADR-005 D3 と同じ）[D]。SP 800-207A は接続を長くしないこと（通常は証明書の TTL 程度、構成によって 15〜30 分）で接続単位の認証の安全性を保つと述べる [N][^18]（RS-06#9）ので、長時間接続の上限も同じ窓で決める [D]。
- **D09-40（派生 token の寿命と失効）** exchange の出力 token の `exp` は入力 token の残存寿命以下にし、Txn-Token の `exp` も subject_token の残存寿命以下にする [D]。草案は Txn-Token の寿命が提示 token の期限を超えることを TTS の方針で許すが（MAY）[N][^1]（RS-06#37）、RFC 8693 は入力と出力の強い結び付きや失効の伝播を一般的性質としないので [N][^4]（RS-06#44）、寿命の入れ子で上限を固定する（T-038）[D]。派生 token の最大寿命の値は操作階層ごとに ADR-006 と DL-20 で決める（RS-06 §5.2 の ADR-006 入力）[D]。
- **D09-41（インスタンス停止時の無効化）** インスタンス停止時は発行系が当該 SVID を無効化し、残存寿命が十分短いことを示せる場合だけ寿命満了に委ねる（N-g の MUST の例外条件）[D]。無効化の方式（発行系の拒否リスト、bundle の更新）は H09-04 で決める [D]。
- **D09-42（fail-mode）** TTS・STS に届かない場合、Txn-Token や exchange 済み token のない要求を未署名の代替経路で通さない（ADR-013 D13-15・D13-23）[D]。exchange 済み token の cache は寿命内だけ使い、その後は操作階層ごとの fail-mode（ADR-013 D13-25、DL-19）に従う [D]。TTS を edge に併設するので、edge が動いていて TTS だけが止まる状態を減らせる [D]。
- **D09-43（暗号移行）** workload CA は ADR-007 の L2 とは別系統にする（ADR-007 D7-11）[D]。workload CA の root はパーティションごとにオフラインで保管し、ceremony・二者統制は ADR-007 の様式を使う [D]。01_governance/durability-charter-20y.md の M5 は、原典脚注に基づき、X.509 の ML-DSA 識別子は RFC 9881 で公表済みで、TLS 1.3 の ML-DSA 認証（draft-ietf-tls-mldsa-06）は RFC Editor Queue にあり RFC ではないと整理している [D]。SVID と mesh の PQ 化は TLS の ML-DSA が RFC になってから ADR-015 で評価する [D]。SVID の寿命が短いので、alg の切替は発行系の設定変更と bundle の並行公開で行え、依存サービスの改修を要しないことを H09-10 で確かめる（G-068）[D]。

### 2.10 依存サービス・連携パターンへの既定形

- **P-03（サービス間の同期呼出し）**: mTLS（X.509-SVID）＋exchange 済み内部 access token（aud＝呼出し先、`cnf` 束縛、`act`）＋Txn-Token（無改変）[D]。
- **P-04・P-05（非同期 consumer・長時間ジョブ）**: Txn-Token をメッセージに入れて持ち越さない [D]。Txn-Token は短命のままとし（草案）[N][^1]（RS-17#26）、consumer・ジョブは実行時に TTS の内部開始フローで新しい Txn-Token を要求し、`tctx` の親取引欄に元の `txn` を入れる [D]。TTS は発行前に利用者の状態を再確認する [D]。どの workload が誰の名で発行を受けられるかの発行方針は草案の範囲外である [N][^1]（RS-06#39）ので、ADR-026 で台帳化し変更を二者承認にする [D]。
- **P-06（Webhook）**: 受信側は送信元を PC-15 の外部連携主体として扱い、mTLS か署名付き要求で認証する [D]。Webhook の署名方式の標準は research で調査しておらず、方式は DL-64 で原典を取得して決める（未確認）[D]。外部から受けた Webhook の処理は edge を経由させ、edge が Txn-Token を発行する [D]。
- **P-08（AI エージェント）**: エージェントは 1 エージェント＝1 SPIFFE ID とし、委任時は `sub`＝利用者・`client_id`／`act`＝エージェントで表す（RS-06 §5.2、ADR-017 で決める）[D]。

### 2.11 可逆性の区分

| 決定 | 区分 | 理由 |
|---|---|---|
| SPIFFE trust domain の名前と数（D09-06, D09-07） | 不可逆 | 全 SVID・全認可ポリシー・クラウド federation の信頼設定が名前を参照する。変えると 300 サービスと全接続先の再設定になる [D][A-050] |
| SPIFFE ID の path 形式と非再割当（D09-07、identity-lifecycle INV-1） | 不可逆 | 監査記録と認可ポリシーが計画期間を通じて参照する [D] |
| `txn` の意味（D09-28） | 不可逆 | 監査証跡の主キーの意味。RFC 8417 の登録で固定 [N][^6] |
| Txn-Token の claim 構成・TTS の配置・`aud` の値（D09-09, D09-29, D09-30） | 可逆 | preview 区分と adapter で隔離（D09-24）[D] |
| exchange の方式・act の上限・登録簿（D09-10〜D09-17） | 可逆 | STS と SDK の設定・版で変えられる。契約上は DL-74 の版で管理 [D] |
| クラウド federation の接続先（D09-03） | 可逆 | 接続ごとに追加・撤去できる [D] |

### 2.12 主要 ADR との論点（主要 ADR は編集していない）

| ID | 論点 | 本書の立場 | 関係する主要 ADR | 決める場・期限 |
|---|---|---|---|---|
| P09-1（決裁事項） | SPIFFE trust domain の数 | ADR-021 D21-28 は「本番用と非本番用に 1 つずつ」とし、採否と詳細を ADR-009 に委ねている。本書は法域パーティションごと（本番 3＋非本番 1）を推奨する（D09-06）。理由は SVID 検証の bundle 選択（と URI 型名前制約）が効く単位と ADR-013 D13-02 の硬い境界の一致である。帰結: (a) 本番 1 の場合、workload CA の侵害が全パーティションに及ぶ。封じ込めは中間 CA と SPIFFE ID の対応を検証側で照合する自社規則（標準外）に頼り、RR09-3 が大きくなる。(b) パーティション別の場合、trust domain 名が 3 つ増え、越境呼出しに SPIFFE federation の設定が要る | ADR-021（D21-28）、ADR-013（D13-02）、ADR-007（D7-13） | DEC-3（CTO＋CISO 同意）。ADR-021 の K21 系と同時。G3 |
| P09-2（未決 U-02 への入力） | `txn` を全要求に発行するか | 条件付きで (a) 全要求を推奨（D09-33） | ADR-005（D9-3, §2.15 U2）、ADR-021（D21-35）、ADR-022（D-8-3） | CTO＋CISO。ADR-005 H-20 と H09-06 の後 |
| P09-3（整合確認） | `rctx` の採否 | ADR-005 D9-3 は「rctx の IP 等の要求環境は採らない」とした。本書は v1 では `rctx` を発行せず ADR-005 に揃えた（D09-30、独立レビューで修正）。IP 等の個人情報を除いた 4 項目を `rctx` に載せる案を v2 以降の候補として ADR-005 の所有者に提案する | ADR-005（D9-3） | ADR-005 の所有者。DL-115 の起草時（G3） |
| P09-4（整合確認） | 業務サービスが複数の Txn trust domain（cell）に属すること | ADR-005 D9-3 と reconciliation-notes C-26 の「Txn-Token の trust domain は cell ごと」を維持し、SDK の tid→cell 照合で補う（D09-09）。草案の解釈リスクは RR09-7 | ADR-005（D9-3）、ADR-013（D13-08） | CTO。H09-02 の後 |
| P09-5（整合確認） | exchange 量の前提 | A-028・A-043 は session あたりの下流 audience 数で exchange 量を置いており、インスタンスごとの cache（D09-12 の束縛による）を含んでいない。本書は NA09-1 の分散係数 r を加える。ADR-007 の鍵操作 QPS と署名費用（81% が exchange）はこの値に従属する | ADR-007（§1.5、§8）、ADR-005（D3 の Lmin(a)） | SRE 責任者。H09-05 の後 |

---

## 3. 検討した選択肢

選択肢は 3 つの論点に分けて比較する [D]。

### 3.1 論点 A: workload identity の基盤

| 項目 | W1 SPIFFE/SPIRE のみ（クラウド資源にも SVID だけで接続） | W2 クラウドネイティブの workload identity のみ | **W3 SPIFFE を正本＋クラウド資源は federation（推奨）** | W4 現状維持（共有シークレット・API key、mesh の独自 ID） |
|---|---|---|---|---|
| 概要 | 全サービス間・全クラウド API を SVID で認証 | 各クラウドの IAM role・service account をサービスの ID にする | D09-01〜D09-05 | 既存の静的秘密を rotation で延命 |
| 利点 | 単一の ID 体系。クラウド間で同じ識別子 [D] | 構築が小さい。事業者が発行系を運用する [D] | サービス間は事業者から独立した単一の ID、クラウド資源は事業者の標準経路 [D]。Google Cloud の managed workload identities は SPIFFE に基づく ID を発行しており [V][^29]（RS-06#78）、SPIFFE ID を共通の識別子にする方向と矛盾しない [D] | 追加構築なし [D] |
| 欠点 | クラウド API の多くは SVID を直接受けない。federation の設定は結局要る [D] | クラウドごとに ID 体系が異なり、マルチクラウド・オンプレミス間で共通の識別子がない。20 年の事業者置換で ID が変わる [D][A-104] | SPIRE の運用と federation 設定の両方が要る [D] | 静的秘密 3,000 件・rotation 記録なし 50% が残る [A-113]。RFC 9700 の RECOMMENDED から外れる [N][^20] |
| 主要リスク（攻撃者類型） | ATK-19: 発行系の誤設定が全サービスに及ぶ | ATK-08: 事業者管理者・事業者の IAM 障害に ID が依存。AWS Roles Anywhere のアカウント単位の信頼境界 [V][^30] | ATK-19（W1 と同じ）、federation 設定の誤り | ATK-07・ATK-06: 秘密の漏えいがそのまま成りすましになる（T-053） |
| 費用・要員の桁 | NA09-3（構築 3〜5 FTE × 12〜18 か月、定常 2〜3 FTE）。発行約 6/秒 [D][A-012][NA09-3] | 構築 0.5〜1 FTE の桁（設定と SDK）。定常は各クラウドの IAM 運用に分散 [D]（根拠のない仮置き。NA09-3 と同じく H09-11 で更新） | W1 ＋ federation 設定 0.5 FTE の桁 [D][NA09-3]（federation 分は根拠のない仮置き） | 移行費はかからないが、侵害時の全件 rotation（CB-TC-07）の費用が残る [D][A-113] |
| 可逆性 | trust domain 名は不可逆。発行系の製品は可逆 [D] | クラウドの ID 名に依存した認可ポリシーは移行時に全面書換え [D] | W1 と同じ。federation は可逆 [D] | 可逆（ただし負債が累積）[D] |
| 勝つ条件 | 全資源がオンプレミスかクラウド API を直接使わない構成 [D] | 単一クラウドに限定し、計画期間中の事業者置換を想定しない場合 [D] | 複数クラウド・オンプレミスの混在と 20 年の事業者置換を想定する場合（本計画の前提）[D][A-104] | なし（受容票の期限付き例外としてだけ残す）[D] |

### 3.2 論点 B: サービス間の利用者委任と内部 context

| 項目 | C1 各 hop の token exchange のみ | C2 Txn-Token＋mTLS のみ（edge 以降は access token なし） | **C3 exchange＋Txn-Token＋mTLS（推奨）** | C4 自作の署名/MAC 付き context（旧提案の trusted context） | C5 受け取った token を下流へ転送 |
|---|---|---|---|---|---|
| 概要 | 各 hop で aud を絞った内部 access token を取り直す。取引 context は持たない | edge で Txn-Token を発行し、下流は mTLS の peer ID＋Txn-Token の sub・scope で PDP に問う | D09-10〜D09-33 | 上流 PEP が独自形式の短命 context を署名/MAC して渡す | 外部・上流の token をそのまま下流へ |
| 利点 | RFC 8693・8707 だけで構成（L1）。各 hop で downscope と登録簿の検査 [D] | exchange が不要で署名量が A-040×p に限られる。WIMSE arch の構成例と一致 [N][^11] | hop ごとの audience 制限・送信者束縛と、連鎖全体で不変の取引 ID を両立 [D] | 標準の状態に依存しない [D] | 実装が最小 [D] |
| 欠点 | 取引単位の ID がなく、R-118 の証跡が token 系譜の辿りだけになる [D] | Txn-Token は access token として使ってはならず（MUST NOT）、replay に耐性がない [N][^1]。aud が trust domain なので service 別 aud（R-206, R-251）を満たさない [D] | exchange 量（1,112×r/秒）と Txn-Token の署名量の両方を負う [D][A-043][NA09-1] | 標準化されておらず、MAC 鍵の管理と上流 PEP 侵害時の波及の分析がない（CL-0166）[D] | 共通 aud が必要になり、RS が自分宛てでない token を拒否する MUST [N][^20] と両立しない |
| 主要リスク（攻撃者類型） | ATK-06: 侵害 workload が登録範囲内で exchange を濫用（T-037） | ATK-06: 侵害 workload が通過した Txn-Token を寿命内に再提示し、呼べる全サービスへ利用者として要求（T-025） | ATK-06: 登録範囲内の濫用は残る（RR09-1）。Txn-Token の再提示だけでは束縛された access token がないので通らない [D] | ATK-06・ATK-17: 鍵の共有範囲が広いと 1 つの侵害で全 context を偽造 | ATK-06: token の横流し（T-015） |
| 費用・要員の桁 | exchange 1,112×r/秒 [D][A-043][NA09-1] | Txn-Token 16,804×p/秒（p は発行範囲の比率）[D][A-040] | C1＋C2 の和。U-02 (a) なら署名は 1 cell 約 1,870/秒＋exchange [D][A-040] | 自社 MAC 鍵系と形式の保守 1〜2 FTE の桁 [D]（根拠のない仮置き） | 0 [D] |
| 可逆性 | 可逆 | 可逆 | 可逆（adapter）[D] | 独自形式が監査に残ると証跡の意味の移行が要る [D] | 可逆だが是正に全サービスの改修 [D] |
| 勝つ条件 | U-02 で「`txn` を使わない」と決まり、R-118 を token 系譜だけで閉じると決裁された場合 [D] | H09-05 で r が大きく exchange 量が STS・署名の容量を超え、かつ service 別 aud の要求（R-206）を下流 hop では緩めると決裁された場合 [D] | 本計画の要求（R-206, R-251 の service 別 aud と R-118 の取引単位の証跡）を同時に満たす必要がある場合 [D] | Transaction Tokens が廃案になり、かつ ADR-022 D-8-5 の退避（自社形式の `txn` を同じ欄に入れる）でも足りない場合 [D] | なし [D] |

### 3.3 論点 C: SPIFFE trust domain の単位

| 項目 | T1 本番 1・非本番 1（ADR-021 D21-28 の記述） | **T2 法域パーティション別（本番 3）＋非本番 1（推奨）** | T3 cell 別 | T4 リージョン別 |
|---|---|---|---|---|
| 概要 | 全本番 workload が 1 つの trust domain | D09-06 | 約 9 cell ごとに trust domain [N13-1] | 4 リージョンごと [A-063] |
| 利点 | 名前が最少。越境の federation 設定が不要 [D] | bundle の選択単位（封じ込めの単位）が法域の硬い境界と一致。越境が設定で列挙できる [N][^39][D] | 基盤部品の cell 封じ込めが標準の仕組みで効く [D] | 障害単位と一致 [D] |
| 欠点 | workload CA の侵害が全パーティションに及ぶ。bundle は trust domain 単位で選ばれ [N][^39]、URI 型の名前制約も host 部（trust domain）にしか効かないので [N][^40]、パーティション単位の封じ込めは標準外の自社規則（中間 CA と SPIFFE ID の対応の照合）に頼る [D] | 名前が 3 つ増える。越境の設定と運用 [D] | 業務サービスが 9 以上の trust domain に属し、cell の追加・分割のたびに 300 サービスの設定が変わる [D][A-050][NA09-5] | 日本主・副が別 trust domain になり、cell の待機切替（ADR-013 D13-20）で trust domain をまたぐ。法域の境界とも一致しない [D] |
| 主要リスク（攻撃者類型） | ATK-08・ATK-07: CA 侵害の影響範囲が全域 | ATK-19: federation 設定の誤り | ATK-19: 設定の組合せ爆発 | ATK-12: 切替時の信頼設定の欠落 |
| 費用・要員の桁 | 最少 | trust anchor 3 系統の ceremony（ADR-007 KD7-6 の法域別 L0 と同じ増分の型）[D] | trust anchor 9 系統以上 [D] | 4 系統 [D] |
| 可逆性 | 不可逆（名前） | 不可逆（名前） | 不可逆（名前） | 不可逆（名前） |
| 勝つ条件 | 法域を越える同期呼出しが大半で（NA09-6 が高い）、CISO が CA 侵害の全域波及を受容する場合 [D] | 法域越えが例外的で、法域の境界を鍵の境界と揃えることを優先する場合 [D] | 業務サービスを cell 単位に配備し直す方針が決まった場合（NA09-5 が否定された場合）[D] | なし（法域の境界と一致しないため）[D] |

### 3.4 副論点

| 論点 | 採用 | 棄却した案 | 理由 |
|---|---|---|---|
| actor の表し方 | STS へのクライアント認証（SVID）から actor を決める | actor_token（JWT-SVID 等）を exchange 要求に添付 | bearer の actor token の窃取・偽造が委任の偽装に直結する（CVE-2025-55241 の教訓、RS-05#34）[I][^33][D] |
| act の上限 | 深さ N_act（初期案 3）＋循環拒否を STS で検査 | 上限なし／過去 actor を RS のアクセス制御に使う | RFC 8693 は過去 actor をアクセス制御に使わない（MUST）[N][^4]。上限がないと連鎖の長さで token サイズと監査の負担が増える（RS-04 §5 の測定項目 8）[D] |
| may_act | 載せない（登録簿と委任 grant が役割を持つ） | subject token に may_act を載せる | 処理義務がなく [N][^4]、登録簿と二重管理になる [D] |
| JWT-SVID | 単一 audience の補助用途だけ | サービス間の既定にする | bearer で replay を受けやすい [N][^8] |
| WIT/WPT | 採らない（RFC 化まで） | WPT の `tth` で Txn-Token を hop に結び付ける | WG 草案で wire format が流動的（RS-06 §5.1 L3）[D]。`tth` は Txn-Token の再提示を防ぐ有力な手段なので再検討トリガーに置く（§8）[N][^16][D] |
| `purp` | 発行しない（`scope` に一本化） | draft-06 互換で `purp` も発行 | draft-07 で `scope` に改名済み [N][^1][^2] |

---

## 4. 評価

### 4.1 評価軸

| 軸 | 内容 | 重み（案） |
|---|---|---|
| S 封じ込め | 侵害された workload・CA・cell の影響が登録範囲・パーティション・cell に閉じるか（R-207） | 高 |
| V 証跡 | 「共通基盤を通った一貫したリクエスト」を監査から再構成できるか（R-118, R-128） | 高 |
| N 標準依存 | RS-06 §5.1 の層（L1〜L4）でどこに依存するか | 中 |
| C 容量・費用 | exchange・署名・発行の量と要員 | 中 |
| R 静的安定性 | 発行系・STS・TTS の停止時に既存の業務が続くか | 中 |
| E 20 年の退出性 | 事業者・製品・draft の変化に依存サービスの改修なしで追随できるか | 中 |
| D 連携開発者の負担 | 依存サービスに課す義務の量 | 低〜中 |

### 4.2 比較表（論点 B。◎ 優れる、○ 可、△ 弱い、× 不可）

| 軸 | C1 exchange のみ | C2 Txn＋mTLS のみ | **C3 併用** | C4 自作 context | C5 転送 |
|---|---|---|---|---|---|
| S | ○（登録簿と downscope）[D] | △（Txn-Token の再提示に耐性なし）[N][^1][D] | ◎（aud・cnf・登録簿＋取引の不変 context）[D] | △（鍵共有範囲に依存）[D] | ×（横流し）[D] |
| V | △（取引 ID なし）[D] | ◎（`txn`）[D] | ◎ [D] | ○（独自形式）[D] | × [D] |
| N | ◎（L1 のみ）[D] | △（L2 draft）[D] | ○（L1＋L2、adapter）[D] | ○（標準外）[D] | ◎ [D] |
| C | ○（1,112×r/秒）[D] | ◎（exchange なし）[D] | △（両方）[D] | ○ [D] | ◎ [D] |
| R | ○ [D] | ○ [D] | ○（TTS を edge に併設）[D] | ○ [D] | ◎ [D] |
| E | ◎ [D] | ○ [D] | ○（D09-26 の退避）[D] | △（独自形式の保守）[D] | × [D] |
| D | ○（SDK が exchange）[D] | ◎ [D] | ○（SDK に閉じる）[D] | ○ [D] | ◎ [D] |

- 重みの高い S と V の両方で ◎ になるのは C3 だけである [D]。C3 の弱点は C（容量・費用）であり、H09-05・H09-06 の実測で不合格なら、§8 のトリガーで C2 寄り（read 系の下流 hop だけ exchange を省く）を再評価する [D]。

### 4.3 比較表（論点 A と C の要約）

| 案 | S | N | C | E | 判定 |
|---|---|---|---|---|---|
| W3＋T2（推奨） | ◎（CA 侵害をパーティションに封じる）[D] | ◎（L1）[D] | ○ [D] | ◎ [D] | 採用案 |
| W3＋T1 | △（CA 侵害が全域）[D] | ◎ [D] | ◎ [D] | ◎ [D] | P09-1 で T1 と決まった場合の構成 |
| W2＋T1 | △ [D] | ○（事業者仕様）[D] | ◎ [D] | △ [D] | 棄却 |
| W4 | × [D] | — | ◎（短期）[D] | × [D] | 例外としてだけ残す |

---

## 5. 決定理由と棄却理由

**採用（W3＋T2＋C3＋`txn-v1`）**: 重みの高い封じ込め（S）と証跡（V）を同時に満たし、L1 の標準（RFC 8693・8707・8705、SPIFFE Stable）を基盤の契約に使い、L2 の draft（Transaction Tokens）は adapter と退避経路で隔離できる [D]。費用（exchange と署名の量）が弱点であり、NA09-1 と U-02 の実測で再判断する [D]。

| 棄却案 | 棄却理由 | 再評価の条件 |
|---|---|---|
| W1 SPIFFE のみ | クラウド API の多くは SVID を直接受けず、federation が結局必要になる [D] | クラウド事業者が SVID を直接受ける認証を標準提供した場合 |
| W2 クラウドネイティブのみ | クラウド間・オンプレミスで共通の識別子がなく、20 年で 1 回以上の製品・事業者置換（A-104）で ID と認可ポリシーが全面的に変わる [D][A-104] | 単一クラウドへの集約が経営決定された場合 |
| W4 現状維持 | 静的秘密の漏えいがそのまま成りすましになり（T-053）、RFC 9700 の RECOMMENDED から外れる [N][^20][D] | なし |
| C1 exchange のみ | 取引単位の不変 ID がなく、R-118 の証跡が token 系譜の辿りだけになる [D] | U-02 で `txn` を使わないと決裁された場合 |
| C2 Txn＋mTLS のみ | Txn-Token は access token として使えず replay 耐性がない（MUST NOT／記述）[N][^1]。下流 hop の service 別 aud（R-206, R-251）を満たさない [D] | H09-05 で exchange 量が容量を超え、下流 hop の service 別 aud を緩める決裁があった場合 |
| C4 自作 context | 標準化されておらず MAC 鍵の管理と侵害時の波及が未分析（CL-0166）[D]。同じ目的の草案がある [N][^1] | Transaction Tokens が廃案になり、D09-26 の退避でも足りない場合 |
| C5 token の転送 | 共通 aud を要し、RS が自分宛てでない token を拒否する MUST と両立しない [N][^20] | なし |
| T1 本番 1 trust domain | CA 侵害の影響が全パーティションに及ぶ。bundle の選択と URI 型名前制約はいずれも trust domain 単位でしか効かない [N][^39][^40][D] | P09-1 で DEC-3 が T1 を選んだ場合（その場合は RR09-3 を CISO が受容） |
| T3 cell 別 | 業務サービスが cell に属さないため、設定が cell 数に比例して増える [D][NA09-5] | 業務サービスの cell 単位配備が決まった場合 |
| T4 リージョン別 | 法域の境界と一致せず、待機切替で trust domain をまたぐ [D] | なし |

棄却した仮説（ADR-009/RH-xx）:

| ID | 仮説 | 棄却理由 |
|---|---|---|
| RH-009-1 | 「Txn-Token があれば下流は access token なしで認可できる」 | 草案は Txn-Token を access token として使うことを禁じる（MUST NOT）[N][^1] |
| RH-009-2 | 「mesh の mTLS で呼出し元を認証すれば利用者の委任は不要」 | 呼出し元が誰の代わりに動いているかを mTLS は表さない。confused deputy（T-025）を防げない [D] |
| RH-009-3 | 「trace id を token に入れれば共通基盤を通った証跡になる」 | §2.7（D09-34）。整合調整記録 §3.1 と同じ |
| RH-009-4 | 「`purp` を必須にすれば目的の証跡になる」 | `purp` は draft-07 で `scope` に改名済みで、個人データ処理の利用目的とも別概念 [N][^1][^2][D] |

---

## 6. 帰結

### 6.1 良い帰結

- 侵害された workload は、登録簿で許された呼出し先に、自分を通過した利用者の範囲でしか到達できない [D]。Txn-Token を盗まれても、束縛された内部 access token がなければ下流は受理しない [D]。
- workload CA の侵害はパーティション内に閉じ、cell の基盤部品は cell 別の鍵と tid→cell 照合で封じ込められる [D]。
- write 以上（U-02 で (a) なら全要求）の要求を、`txn`・decision_id・jti・交換台帳で trace に依存せず再構成できる [D]。
- 静的秘密が台帳上の期限付き例外になり、件数を KRI で追える [D]。

### 6.2 悪い帰結

- STS（exchange）・TTS・SPIRE の 3 種が Tier-0 部品として増える [D]。
- exchange 量がインスタンス分散係数 r に比例し、ADR-007 の署名費用・KMS 枠を押し上げ得る [D][NA09-1]。
- trust domain 名が 3 つ増え、法域越えの呼出しごとに federation の設定と移転判定が要る（P09-1 で T2 の場合）[D]。
- Transaction Tokens の改版・失効のたびに `txn-v1` の評価と、場合により adapter の差替えが要る [D]。

### 6.3 残余リスクと受容者案

| ID | 残余リスク | 統制 | 証拠 | 受容者案 |
|---|---|---|---|---|
| RR09-1 | 侵害された workload が、登録範囲内で Txn-Token・内部 access token の寿命の間、通過した利用者として振る舞える（T-025, T-037 の残余）[D] | 登録簿、aud・cnf、短寿命、深さ上限 | H09-01, H09-03 | CISO |
| RR09-2 | Transaction Tokens の改版・失効で `txn-v1` の改修が要る [D] | 版固定、preview 区分、adapter、D09-26 の退避 | H09-08 | CTO |
| RR09-3 | パーティションの workload CA が侵害されると、そのパーティションの全 SPIFFE ID を名乗れる（T1 なら全域）[D]。URI 名前制約は実装支援が乏しく任意（MAY）[N][^7] | オフライン root、中間 CA の分離、短寿命、侵害 runbook（ADR-019） | H09-09（CA 侵害演習） | CISO |
| RR09-4 | U-02 で (b) の場合、public・read-sensitive の要求の証跡が (jti, decision_id, X-Request-ID) に限られる [D] | 8 欄の監査、判定記録の全件記録 | ADR-022 H-4 | CISO＋事業責任者（R-118 の閉じ方） |
| RR09-5 | 移行が終わるまで静的秘密が残る（T-053）[D][A-113] | 例外台帳と期限、KRI | 例外台帳、CB-TC-07 | CISO（期限付き） |
| RR09-6 | 派生 token の最大寿命の間は剥奪が反映されない（T-038）[D] | 寿命の入れ子（D09-40）、ADR-006 | ADR-006 の実測 | 事業責任者＋CISO（ADR-006・DL-20 の決裁） |
| RR09-7 | 業務サービスが複数の Txn trust domain に属する構成を草案が許すかの解釈リスク [D] | tid→cell 照合、`aud` を可逆な内部値に保つ（D09-09） | H09-02、標準の再確認 | CTO |

### 6.4 依存サービス・連携開発者への影響

- 依存サービスが守る義務は次の 5 つに絞り、検証と exchange は SDK・sidecar が行う（ADR-022 D-8-6 と同じ方針）[D]。
  1. `Txn-Token` ヘッダと `traceparent` を無改変で下流へ渡す [D]。
  2. 受け取った Authorization の token を下流へ転送しない（下流用の token は SDK が exchange で取る）[D]。
  3. 呼び出す相手と呼ばれる相手を登録簿に申請する（D09-13）[D]。
  4. 新規の client・連携で共有秘密を使わない（D09-18）[D]。
  5. 監査イベントに `txn` を書く（SDK の既定）[D]。
- 共有シークレットだけで認証する 45 サービスは、workload ID への移行が ADR-027 の移行の先行条件になる [D][A-110]。
- sandbox では非本番の trust domain を使い、そこで発行した SVID・token は本番で拒否される（G-141）[D]。

### 6.5 運用・要員への影響

- SPIRE（または選定製品）の発行系、STS の exchange profile、TTS、登録簿の運用が増える [D]。要員は NA09-3 の桁で仮置きし、A-054（プラットフォーム 24 FTE、うち SRE 6）の内数で収まるかを H09-11 と DL-33 で確かめる [D][A-054][NA09-3]。
- 登録簿の変更（呼出し元×呼出し先の追加）は日常業務になる [D]。300 サービス [A-050] の申請・承認の処理量を H09-11 で測る [D]。
- 監視対象: SVID 発行の失敗率、exchange の拒否理由別件数（未登録の組、深さ超過、scope 拡大）、Txn-Token 検証の失敗（aud・cell 不一致）、静的秘密の残数 [D]。

---

## 7. 検証

### 7.1 PoC の仮説と TC 案（TC-ID は 12_poc で採番する）

| ID | 仮説 | 方法 | 合否基準 | 紐付け |
|---|---|---|---|---|
| H09-01 | 委任の負例がすべて拒否される | 未登録の組の exchange、`resource` 欠落・複数、scope 拡大、act 深さ N_act＋1、actor の循環、期限切れ subject token、他インスタンスの証明書での提示（cnf 不一致）、未署名の内部 token・Txn-Token（CVE-2025-55241 型）| 全件拒否（G-102） | G-102、T-037、T-040 |
| H09-02 | Txn-Token の負例がすべて拒否される | Authorization ヘッダで提示、別 cell の `aud`、tid の収容 cell と `aud` の不一致、`tctx` の tid と資源のテナントの不一致、`sub` が内部 access token と不一致、改変・剥ぎ取り | 全件拒否 | T-021、T-025 |
| H09-03 | Txn-Token を盗んだ workload が、束縛された access token なしでは下流に到達できない | 侵害 workload を模擬し、通過した Txn-Token を寿命内に別サービスへ提示 | 全件拒否。`txn` 記録による検知率を測る（草案は `txn` の記録で replay を発見できると述べる [N][^1]） | RR09-1 |
| H09-04 | 発行系・STS・TTS の停止で、既存業務の継続時間と剥奪反映が設計どおり | SPIRE server、STS、TTS をそれぞれ停止。停止中に主体を失効 | 継続時間と拒否までの時間を実測。合否値は TBD（BIA の MTPD と DL-20 に紐付け。所有者 CTO＋CISO、期限 G4） | R-143、R-207 |
| H09-05 | exchange 量の分散係数 r と STS の容量 | 実トラフィックに近い負荷で、同一 session のインスタンス分散と cache 命中率を測る | r を測定し、1,112×r/秒が STS・署名の容量以下 | NA09-1、A-043、P09-5 |
| H09-06 | Txn-Token を全要求に発行した場合の署名・検証の遅延と費用 | 16,804/秒（成長 56,444/秒）を 9 cell に配分し、Signer の backend 別に測る | 遅延 TBD 以内（ADR-005 H-20 と共同。所有者 CTO、期限 G4） | U-02、P09-2 |
| H09-07 | 監査から取引を再構成できる | 3 hop の連鎖で trace sampling を DROP にし、偽造 traceparent を混ぜる | 再構成率 100%、trace の偽造で判定記録と再構成結果が変わらない（ADR-022 H-4 と共同） | R-118、R-128、T-017 |
| H09-08 | Txn-Token adapter を自社形式の `txn` に差し替えても依存サービスの差分が 0 | adapter の差替え演習 | 差分 0（ADR-022 H-10 と共同） | RR09-2 |
| H09-09 | パーティションの workload CA 侵害からの回復 | 中間 CA の失効と再発行、bundle 更新の演習 | 回復時間を実測。値は TBD（ADR-019 と共同） | RR09-3、G-093 |
| H09-10 | SVID の alg 切替を依存サービスの改修なしで行える | 発行系の設定変更と bundle の並行公開 | 依存サービスの改修 0（G-068） | G-068 |
| H09-11 | 要員と登録簿の運用負荷 | パイロットで申請・承認・失効の件数と工数を計測 | NA09-3 の桁に収まるか（A-054 と比較） | NA09-3 |
| H09-12 | クラウド federation が SPIFFE 資格情報で成立する | SPIRE 発行の X.509-SVID・JWT-SVID で Entra・Google Cloud・AWS（Roles Anywhere）へ接続し、鍵数上限・大文字小文字一致の失敗挙動を確かめる（RS-06 §5.3 の 9） | 接続の成立と失敗挙動の記録 | D09-03 |
| H09-13 | 法域越えの委任が identity chaining で成立し、未許可の越境が拒否される | パーティション間で JWT authorization grant を使う | 許可した組だけ成立、他は拒否 | D09-37 |

### 7.1.1 PoC 系統 1 の結果と未実施の扱い（PoC/R7反映、版 0.2）

以下の値はすべて PoC 系統 1 の自己実行（実施者は AI エージェント、立会人なし、凍結タグなし、`git_dirty`）の参考値であり、POC-01 §2.2.1 の W-1〜W-4 を満たさないため Gate 4 の証拠ではない。原因区分は実施者の記録で、作成者以外は確かめていない。独立再現（reproduction-log）も同じ機械で別の AI エージェントが行ったもので、立会人による再実行ではない [D][^41]。

| POC-01 の TC | 本書の仮説 | 観測（参考値） | 本書の決定への影響 |
|---|---|---|---|
| TC-004（aud 取違え・token exchange・Txn-Token の盗用） | H09-01・H09-02・H09-03 | **未実施**。担当の試験群（token-misuse）が作業を中断し、成果物がない（POC-02 DEV-19 候補。系統 1 の実行体制・環境の制約による未実施で、中止基準による中止ではない）[D][^41] | 委任の負例（未登録の組、`resource` の欠落・複数、scope 拡大、act の深さ超過、actor の循環）と Txn-Token の束縛の性質には、系統 1 の証拠が何もない。決定は変えないが、立会い下の系統 1 の再実行（POC-02 §7.1 R-2）で初めて実行し、系統 2 の TC-120（token exchange）・TC-125（AI エージェント）の前提にする。それまで H09-01〜03 を G4 の判定材料にしない [D] |
| TC-016（3 hop の監査の再構成） | H09-07・H09-08 | 正式な実行（v1）で再構成率は write 55/55・read-sensitive 61/61、偽造 trace による差分 0。adapter を自社形式の `txn` に差し替えた後の再構成は 0/12 で不合格（PEP SDK が受信した `txn` を発行側の pattern で検査して拒否した、F-2）。試験と STS の修正後の参考実行では 12/12 [D][^41] | H09-08（adapter 差替えで依存サービスの差分 0）は、受信側が `txn` の形式を検査しない前提に立つ。契約 schema の `opaqueId` の注記（受信側はこの pattern で拒否しない）と SDK の実装が食い違ったので、受信側の規則を契約に揃える（ADR-022 D-8-5、POC-02 MR-10）。参考実行の合格は H09-08 の証拠にしない [D] |

### 7.2 第三者評価で確かめること

- 内部からの pentest（E6）で、侵害 workload を起点に登録範囲外のサービス・他テナント・他パーティションへ到達できないこと（ATK-06）[D]。
- SPIRE（または選定製品）の構成レビューで、登録エントリの付与条件（attestation の selector）が偽造しやすい属性だけに依存していないこと [D]。WIMSE の practices 草案は、マルチテナント基盤で偽造しやすい属性だけでアクセスや federation を許してはならない（MUST NOT）とする [N][^14]（RS-06#27）。
- 監査の再構成（H09-07）を独立立会人の下で再実施すること [D]。

---

## 8. 再検討トリガーと見直し時期

| 種別 | トリガー | 見直す決定 |
|---|---|---|
| 標準 | Transaction Tokens の新版（-12 以降）の公開、IESG 提出、RFC 発行、または 2027-01-31 の失効 [N][^3] | D09-23〜D09-26。RFC 化なら GA 昇格を審議（ADR-022）。失効・大改訂なら D09-26 の退避 |
| 標準 | 草案の審査で「1 つの workload が複数の trust domain の Txn-Token を受ける」構成が否定された | D09-09（パーティション単位の論理 TTS へ） |
| 標準 | identity chaining の RFC 発行 | D09-37（社内 profile を RFC に合わせる） |
| 標準 | WIMSE workload-creds・WPT の WGLC、SPIFFE WIT-SVID の Stable 化 | D09-05（WPT の `tth` による Txn-Token の hop 束縛の採否）[N][^16] |
| 標準 | SPIFFE が URI 名前制約を必須化する改訂 | D09-06、RR09-3 |
| 実測（PoC/R7反映） | POC-01 TC-004 の初回実行（立会い下）で、委任・Txn-Token の負例の受理が 1 件でも出た | 該当する D09 の検証規則（STS の exchange 方針、TTS の束縛）、H09-01〜03 の手順 |
| 実測（PoC/R7反映） | `txn` の受信側の形式検査をめぐる契約と SDK の食い違い（TC-016 F-2）が契約の改版で解消できない | D09-23〜D09-26 の adapter 差替えの前提、H09-08 |
| 標準 | TLS 1.3 の ML-DSA 認証の RFC 化 | D09-43（ADR-015 と共同） |
| 実測 | H09-05 で r が大きく、exchange 量が STS・署名の容量を超える | D09-10（read 系の下流 hop で C2 寄りにするか） |
| 実測 | H09-06 不合格、または Signer の例外 backend が承認されない | D09-33（U-02 を (b) へ） |
| 計画 | 業務サービスを cell 単位に配備する方針（NA09-5 の否定） | D09-08（T3 の再評価） |
| 計画 | 法域越えの同期呼出しが多いと判明（NA09-6） | D09-06（P09-1 の再評価） |
| 事故 | 内部 token・actor token・workload 資格情報の偽造・横流しの一次報告（自社・他社） | D09-12〜D09-17 |
| 定期 | 標準ステータス台帳の四半期更新（次回 2027-01-03）と、3〜5 年ごとの継続・置換の再決裁 | 全体 |

---

## 9. 依存関係

| 種別 | 対象 | 依存の内容 |
|---|---|---|
| ADR | ADR-001 | STS を cell 内で self-host し、プロトコル処理を自作しない（D10）。TTS の自社部品の例外審査（D1-5） |
| ADR | ADR-004 | 外部 IdP・ID-JAG による委任（D09-38） |
| ADR | ADR-005 | 内部 access token の profile（V1〜V14、cnf、D1-4）、Txn-Token の発行範囲（D9-3、U2）、監査の層（D9-2）。P09-2〜P09-5 |
| ADR | ADR-006 | 派生 token の最大寿命と失効の伝播（D09-40） |
| ADR | ADR-007 | 族 3（内部 token）・族 3b（要求 context）の cell 別鍵、Signer 抽象と例外 backend（D09-33）、workload CA を L2 と別系統にすること（D7-11）、鍵操作 QPS が本書の exchange 量に従属すること（P09-5） |
| ADR | ADR-011 | PEP の PDP への認証を workload mTLS にする（D5-7）。要求環境の値を認可に使う場合の属性辞書（D09-30） |
| ADR | ADR-012 | entry point 台帳（操作階層、`tctx` の起点階層）、非同期経路の再認可 |
| ADR | ADR-013 | cell と法域パーティションの定義、global 部品の許可リスト（本書は global 部品を追加しない）、cell 間同期呼出しの禁止、fail-mode（D09-42） |
| ADR | ADR-014 | 監査の 8 欄、交換台帳・発行台帳の欄（D09-35）、jti のハッシュ（C-34） |
| ADR | ADR-015 | SVID・mTLS の PQ 化（D09-43） |
| ADR | ADR-016 | `txn-v1` と DL-74 の版管理 |
| ADR | ADR-017 | AI エージェントの workload ID と委任（P-08） |
| ADR | ADR-019 | workload CA・STS・TTS の侵害 runbook（H09-09） |
| ADR | ADR-021 | trust domain 名・SPIFFE ID・`txn` の命名規則（D21-28, D21-35, D21-36）。P09-1 |
| ADR | ADR-022 | Token Exchange API と Transaction Token の凍結区分（D-2）、証跡の 4 層（D-8）、退避（D-8-5） |
| ADR | ADR-024 | テナント越えの共有と `tctx` の tid 照合の例外 |
| ADR | ADR-026 | 非同期・長時間ジョブの Txn-Token 発行方針（P-04, P-05） |
| ADR | ADR-027 | 静的秘密のサービスの移行順序 |
| 設計文書 | 04_architecture/workload-identity-delegation.md（DL-55） | 本書の決定の詳細設計（登録簿の項目、STS の判定手順、P-03〜P-08 の既定形） |
| 設計文書 | 04_architecture/claims-catalog.md（DL-115） | `tctx`・`rctx` の claim 名・型・PII 区分、`act` の表現 |
| 契約 | 11_contracts/token-exchange.openapi.yaml（DL-74） | subject/actor token 種別、`resource` 必須、act の深さ上限、エラー、txn_token の要求 |
| 契約 | DL-75（access token claims）、DL-77（監査イベント）、DL-64（連携パターン P-03・P-06） | — |
| 外部契約 | クラウド事業者 | workload identity federation の提供継続、要求枠（KMS の Sign 枠）の引上げ（D09-33） |
| 前提 | 01_governance/assumptions-register.md | NA09-1〜NA09-6 の登録（本書からは編集していない） |

---

## 対応表（R/G）

抽出方法: traceability/R-requirements.md と traceability/G-goal-criteria.md の対応成果物欄に `ADR-009-workload-identity-token-exchange.md`・`ADR-009`・`DL-12` を含む行を Grep で抽出し（R-100、G-020、G-102。DL-12 を含む他の G 行は他 ADR 宛てのため除外）、内容上関係する行を加えた（2026-10-15）[D]。

| R/G | 内容（要約） | 本書の対応箇所 | 閉じ方 | 状態・残課題 |
|---|---|---|---|---|
| R-100 | ADR: workload identity と token exchange | 全節（D09-01〜D09-43） | A | 本書で閉じた（ADR として。決裁は未了） |
| G-020 | 全 ADR に文脈・選択肢・却下案と理由・決定・帰結・可逆性・再検討トリガー・証拠 | §1〜§9、§2.11、§5 | A | 本書で閉じた（作成者以外の検査は未了） |
| G-102 | workload identity、service 別 aud、token exchange、act 上限、trust domain 越え、非同期ジョブ、AI エージェントの委任が定義され、負例が PoC で拒否される | D09-01〜D09-17、D09-37、§2.10、H09-01・H09-02・H09-13 | C | 要実測。非同期ジョブ（権限喪失後のジョブ実行の負例）は ADR-026、AI エージェントは ADR-017 で詳細化 |
| R-206 | service 別 aud・token exchange・workload identity の方向性を実証で裏付け | D09-10〜D09-12、H09-01・H09-05 | C | 要実測 |
| R-251 | 宛先限定（service 別 aud、token exchange、sub と act の分離による confused deputy・横流し対策） | D09-10〜D09-16 | A | 本書で方式を閉じた（詳細は DL-55） |
| R-255 | 非人間 ID の分離（ユーザー JWT 流用ではなく workload identity、mTLS、委任を分離） | D09-01, D09-10, D09-14, D09-19 | A | 本書で方式を閉じた |
| R-230 | 暗黙の信頼を置かない（ネットワーク位置で信頼しない） | D09-01, D09-32（各 hop の mTLS と token 検証） | A | 本書で閉じた（全体は DL-54 参照アーキテクチャ v2） |
| R-029 / R-282 | 主体 8 類型と非人間主体の状態遷移 | D09-01, D09-39〜D09-41（PC-13 の資格情報の寿命と無効化） | A | PC-13 の寿命の値は TBD（DL-20） |
| R-044 | 退職・削除 | §2.10 P-05（実行時の利用者状態の再確認） | C | ADR-026・identity-lifecycle で詳細化 |
| R-118 | 監査ログの目的 | D09-28〜D09-36 | A | U-02 の決裁で証跡の範囲が確定（P09-2） |
| R-128 | 監査を trace sampling に依存させない | D09-34〜D09-36、H09-07 | C | 要実測 |
| R-143 | 剥奪から拒否までの最大時間 | D09-39, D09-40, H09-04 | C | 要実測（値は ADR-006・DL-20） |
| R-161 / R-162 | JWT 厳格検証と相互排他的検証規則 | D09-04, D09-24, D09-32 | C | 要実測（ADR-005 H-01 と共同） |
| R-207 | 被害を 1 テナント／1 サービス／1 期間に封じ込める論証 | D09-06〜D09-09, D09-13, §6.3 | C | 要実測（H09-03、H09-09）。P09-1 の決裁に依存 |
| R-209 | 組織再編・データ所在地・非人間 ID 増加・暗号移行への互換性 | D09-06, D09-37, D09-43、§2.11 | A | 本書で閉じた（PQ 化は ADR-015） |
| G-042 | global 部品の列挙と共有理由 | D09-06〜D09-08（本書は global 部品を追加しない） | A | 本書で閉じた（正本は ADR-013） |
| G-068 | token 署名・mTLS・workload ID の暗号を 1 回以上移行する前提の順序 | D09-43、H09-10 | C | 要実測 |
| G-088 | 種類の異なる JWT の相互排他を含む負例の拒否 | D09-04, D09-24, H09-02 | C | 要実測 |
| G-138 | 連携パターンごとのインタフェースが契約に定義される | §2.10（P-03〜P-08）、§9（DL-74） | A | 行列は DL-64。P-06 の署名方式は未確認 |
| G-141 | sandbox の信頼分離（sandbox の資格情報は本番で拒否） | D09-06, D09-07、§6.4 | C | 要実測（負例） |
| R-259 | 宛先限定・短命化・DPoP/mTLS の方向の維持 | D09-11, D09-12（内部 token の `cnf` 束縛）, D09-39, D09-40 | A | 内部 hop の方式は本書で閉じた（外部 token の profile は ADR-005 と 04_architecture/token-profile.md）。独立レビューで追記 |
| G-063 | 監査の記録率・欠損検知を trace sampling に依存しない独立経路で実測 | D09-34〜D09-36、H09-07 | C | 要実測。正本は ADR-014・DL-25。独立レビューで追記 |
| G-074 | 自作しない原則と例外審査 | D09-02, D09-27（TTS の発行方針部分を ADR-001 D1-5 の例外審査に載せる） | B | 例外審査の承認は未了。独立レビューで追記 |
| G-093 | 侵害別 runbook と演習（鍵切替を含む） | D09-43, H09-09（workload CA 侵害からの回復）、§6.3 RR09-3 | C | 要実測。正本は ADR-019・DL-24。独立レビューで追記 |
| G-099 | P-xx ごとの主体・認証方式・token の種別・aud・委任・テナント context の伝搬 | §2.10（P-03〜P-06, P-08） | A | 本書は既定形だけ。全項目は DL-64。独立レビューで追記 |
| G-124 | 参加手順（workload ID の発行を含む） | D09-13（登録簿の申請・承認）、§6.4、§6.5 | A | 手順・承認者・所要期間の正本は DL-66。独立レビューで追記 |

---

## 残課題

| 項目 | 所有者 | 期限 |
|---|---|---|
| P09-1（SPIFFE trust domain の数）の DEC-3 での決裁 | CTO＋CISO | G3 |
| PoC/R7反映（版 0.2）: POC-01 TC-004 の負例の事前登録と初回実行、`txn` の受信側規則の契約への反映（POC-02 MR-10） | PoC リード（TC）、契約の所有者・ADR-022 の所有者（規則） | 事前登録は DEC-4 第 1 段の付議前、実行は G4 |
| P09-2（U-02）の決裁 | CTO＋CISO | H09-06 の後 |
| NA09-1〜NA09-6 の前提台帳への登録 | 前提台帳の所有者 | G1 |
| N_act・SVID 寿命・Txn-Token 寿命・派生 token 最大寿命の値 | CTO＋CISO | G3〜G4（DL-20） |
| 静的秘密の移行期限と例外上限 | CISO＋プラットフォームチーム長 | G1 |
| P-06（Webhook）の署名方式の原典調査 | DL-64 の所有者 | G3 |
| 本書で起草者が取得した research 外の原典のうち、[^1] の Document History・§9.2.1、[^3]、[^6]、[^7] の §4.2 は独立レビューで照合済み（2026-10-15、末尾のレビュー記録）。[^2]（draft-06 の `purp`）と [^21] の §2.1.2 の独立照合、レビューで追加した [^39]・[^40] を含む traceability/ への照合ログ追記は未了 | 作成者以外の検証者 | G3 |

---

## 参考文献

[^1]: A. Tulshibagwale, G. Fletcher, P. Kasselman / IETF『Transaction Tokens』draft-ietf-oauth-transaction-tokens-11, 2026-07-30（Internet-Draft、状態: draft、IESG 未提出）. https://www.ietf.org/archive/id/draft-ietf-oauth-transaction-tokens-11.txt （参照箇所: §1, §3, §5.1, §6, §8.2, §9.1, §9.2, §9.2.1〜§9.2.4, §10, §11.1〜§11.5, §12〜§12.2, §13.1, §13.2, §13.6, §13.12〜§13.15, §14, §15.2, Document History「Since Draft 06」、確認日: 2026-10-03（RS-06#29〜#42、RS-17#26）。Document History と §9.2.2〜§9.2.4 の例は起草者が 2026-10-15 に確認）
[^2]: A. Tulshibagwale, G. Fletcher, P. Kasselman / IETF『Transaction Tokens』draft-ietf-oauth-transaction-tokens-06, 2025-07-28（Internet-Draft、2026-01-29 失効予定と記載）. https://www.ietf.org/archive/id/draft-ietf-oauth-transaction-tokens-06.txt （参照箇所: JWT Body Claims の `purp`（REQUIRED、"A String defining the purpose or intent of this transaction"）、確認日: 2026-10-15。research ノート外。起草者が確認、独立検証は未実施）
[^3]: IETF Datatracker『draft-ietf-oauth-transaction-tokens』文書記録（doc.json）. https://datatracker.ietf.org/doc/draft-ietf-oauth-transaction-tokens/ （参照箇所: rev 11、state Active、iesg_state「I-D Exists」、確認日: 2026-10-15。2026-10-03 時点の WG 状態「WG Consensus: Waiting for Write-Up」と失効予定 2027-01-31 は RS-06#29・standards-status SS-B04）
[^4]: M. Jones ほか / IETF『RFC 8693: OAuth 2.0 Token Exchange』Standards Track, 2020-01. https://www.rfc-editor.org/rfc/rfc8693 （参照箇所: §1.1, §2.1, §4.1, §4.4、確認日: 2026-10-03（RS-06#43〜#45、RS-04#66）。§4.4 の本文は起草者が 2026-10-15 に再確認）
[^5]: B. Campbell, J. Bradley, H. Tschofenig / IETF『RFC 8707: Resource Indicators for OAuth 2.0』Standards Track, 2020-02. https://www.rfc-editor.org/rfc/rfc8707 （参照箇所: §2、確認日: 2026-10-03。RS-04#65、RS-06#59）
[^6]: P. Hunt, Ed., M. Jones, W. Denniss, M. Ansari / IETF『RFC 8417: Security Event Token (SET)』Proposed Standard, 2018-07. https://www.rfc-editor.org/rfc/rfc8417 （参照箇所: §2.2 "txn" Claim（OPTIONAL、関連する複数の JWT の相関、SET 以外の profile でも使用可）、§7.1 IANA 登録、確認日: 2026-10-15。research ノート外（ADR-005 [^25] の起草者も取得）。独立検証は未実施）
[^7]: SPIFFE Project『The X.509 SPIFFE Verifiable Identity Document』GitHub spiffe/spiffe main（standards/X509-SVID.md、Stability: Stable）. https://github.com/spiffe/spiffe/blob/main/standards/X509-SVID.md （参照箇所: §2, §3.1, §3.2（RS-06#3, #4、確認日: 2026-10-03）、§4.2 Name Constraints（起草者が 2026-10-15 に確認。research ノート外、独立検証は未実施））
[^8]: SPIFFE Project『The JWT SPIFFE Verifiable Identity Document』GitHub spiffe/spiffe main（standards/JWT-SVID.md、Stability: Stable）. https://github.com/spiffe/spiffe/blob/main/standards/JWT-SVID.md （参照箇所: §2.1, §2.3, §3.2, §3.3, §4, §7.1, §7.2、確認日: 2026-10-03。RS-06#5, #6）
[^9]: SPIFFE Project『The SPIFFE Identity and Verifiable Identity Document』GitHub spiffe/spiffe main（standards/SPIFFE-ID.md、Stability: Stable）. https://github.com/spiffe/spiffe/blob/main/standards/SPIFFE-ID.md （参照箇所: §2.1, §2.1.1、確認日: 2026-10-03。RS-06#3, #7）
[^10]: Cloud Native Computing Foundation『SPIRE』プロジェクトページ. https://www.cncf.io/projects/spire/ （参照箇所: 受入・Incubating・Graduated の日付、確認日: 2026-10-03。RS-06#8）
[^11]: J. Salowey, Y. Rosomakho, H. Tschofenig / IETF『Workload Identity in a Multi System Environment (WIMSE) Architecture』draft-ietf-wimse-arch-08, 2026-07-06（Internet-Draft、Informational、WG Document）. https://datatracker.ietf.org/doc/html/draft-ietf-wimse-arch-08 （参照箇所: §3.2.2、確認日: 2026-10-03。RS-06#18）
[^12]: J. Salowey, Y. Rosomakho / IETF『Workload Authentication Using Mutual TLS』draft-ietf-wimse-mutual-tls-02, 2026-07-06（Internet-Draft、WG Document）. https://datatracker.ietf.org/doc/html/draft-ietf-wimse-mutual-tls-02 （参照箇所: §5、確認日: 2026-10-03。RS-06#25）
[^13]: Y. Rosomakho, J. Salowey / IETF『Workload Identifier』draft-ietf-wimse-identifier-03, 2026-07-06（Internet-Draft、WG Document）. https://datatracker.ietf.org/doc/html/draft-ietf-wimse-identifier-03 （参照箇所: §4.5, §7.2、確認日: 2026-10-03。RS-06#25）
[^14]: A. Schwenkschuster, Y. Rosomakho / IETF『Workload Identity Practices』draft-ietf-wimse-workload-identity-practices-07, 2026-09-22（Internet-Draft、Informational、Submitted to IESG・AD Evaluation）. https://datatracker.ietf.org/doc/html/draft-ietf-wimse-workload-identity-practices-07 （参照箇所: §5.4, §5.5, §5.7, §5.8、確認日: 2026-10-03。RS-06#26, #27）
[^15]: B. Campbell ほか / IETF『WIMSE Workload Credentials』draft-ietf-wimse-workload-creds-02, 2026-07-02（Internet-Draft、WG Document）. https://datatracker.ietf.org/doc/html/draft-ietf-wimse-workload-creds-02 （参照箇所: §5.1, §8, §9.2、確認日: 2026-10-03。RS-06#22, #23）
[^16]: B. Campbell, A. Schwenkschuster / IETF『WIMSE Workload Proof Token』draft-ietf-wimse-wpt-02, 2026-08-27（Internet-Draft、WG Document）. https://datatracker.ietf.org/doc/html/draft-ietf-wimse-wpt-02 （参照箇所: §2（`tth`）、確認日: 2026-10-03。RS-06#28）
[^17]: A. Schwenkschuster ほか / IETF『OAuth Identity and Authorization Chaining Across Domains』draft-ietf-oauth-identity-chaining-17, 2026-07-19（Internet-Draft、Standards Track 予定、RFC Ed Queue）. https://datatracker.ietf.org/doc/html/draft-ietf-oauth-identity-chaining-17 （参照箇所: Abstract, §2.3, §2.3.3, §2.4, §5.4, §5.5、確認日: 2026-10-03。RS-06#46, #47）
[^18]: R. Chandramouli, Z. Butcher / NIST『SP 800-207A: A Zero Trust Architecture Model for Access Control in Cloud-Native Applications in Multi-Location Environments』Final, 2023-09. https://doi.org/10.6028/NIST.SP.800-207A （参照箇所: p.8〜9 の ID-SEG-REC-2, ID-SEG-REC-4、確認日: 2026-10-03。RS-06#9, #10）
[^19]: R. Galluzzo ほか / NIST・CISA『NIST IR 8587: Protecting Tokens and Assertions from Forgery, Theft, and Misuse』Final, 2026-09. https://doi.org/10.6028/NIST.IR.8587 （参照箇所: §1.2, §5.3.1.6（p.32）、確認日: 2026-10-03。RS-06#11）
[^20]: T. Lodderstedt, J. Bradley, A. Labunets, D. Fett / IETF『RFC 9700: Best Current Practice for OAuth 2.0 Security』BCP 240, 2025-01. https://www.rfc-editor.org/rfc/rfc9700 （参照箇所: §2.3, §2.5、確認日: 2026-10-03。RS-17#19、RS-04#17, #20）
[^21]: B. Campbell, J. Bradley, N. Sakimura, T. Lodderstedt / IETF『RFC 8705: OAuth 2.0 Mutual-TLS Client Authentication and Certificate-Bound Access Tokens』Standards Track, 2020-02. https://www.rfc-editor.org/rfc/rfc8705 （参照箇所: §3, §6.3（RS-17#22、確認日: 2026-10-03）、§2.1.2 Client Registration Metadata の `tls_client_auth_san_uri`（起草者が 2026-10-15 に確認。research ノート外、独立検証は未実施））
[^22]: M. Jones, B. Campbell, C. Mortimore / IETF『RFC 7523: JSON Web Token (JWT) Profile for OAuth 2.0 Client Authentication and Authorization Grants』2015-05. https://www.rfc-editor.org/rfc/rfc7523 （参照箇所: §2.2, §3、確認日: 2026-10-03。RS-17#20）
[^23]: M. Jones, B. Campbell, C. Mortimore, F. Skokan / IETF『Updates to OAuth 2.0 JSON Web Token (JWT) Client Authentication and Assertion-Based Authorization Grants』draft-ietf-oauth-rfc7523bis-11（文書内日付 2026-03-26、Datatracker 掲載 2026-04-28、RFC Ed Queue）. https://datatracker.ietf.org/doc/html/draft-ietf-oauth-rfc7523bis-11 （参照箇所: Abstract, §4、確認日: 2026-10-03。RS-06#52、RS-17#21）
[^24]: D. Hardt, Ed. / IETF『RFC 6749: The OAuth 2.0 Authorization Framework』2012-10. https://www.rfc-editor.org/rfc/rfc6749 （参照箇所: §4.4, §4.4.3、確認日: 2026-10-03。RS-17#18）
[^25]: W3C『Trace Context』W3C Recommendation, 2021-11-23. https://www.w3.org/TR/trace-context/ （参照箇所: §6 Privacy Considerations, §7.2、確認日: 2026-10-03。RS-10#16, #17）
[^26]: OpenTelemetry『OpenTelemetry Specification — Tracing SDK』v1.61.0, 2026-09-14. https://github.com/open-telemetry/opentelemetry-specification/blob/v1.61.0/specification/trace/sdk.md （参照箇所: Sampler の Decision（DROP）、確認日: 2026-10-03。RS-10#22）
[^27]: W3C『Propagation format for distributed context: Baggage』W3C Candidate Recommendation Snapshot, 2024-05-30. https://www.w3.org/TR/baggage/ （参照箇所: Privacy Considerations、確認日: 2026-10-03。RS-10#19）
[^28]: Google Cloud『Workload Identity Federation』IAM documentation（Last updated 2026-09-30 UTC）. https://docs.cloud.google.com/iam/docs/workload-identity-federation （参照箇所: 概要、対応 IdP、確認日: 2026-10-03。RS-06#77）
[^29]: Google Cloud『Managed workload identities』IAM documentation（Last updated 2026-09-30 UTC）. https://docs.cloud.google.com/iam/docs/managed-workload-identity （参照箇所: SPIFFE interoperability、SPIFFE ID 形式、Preview 表示、確認日: 2026-10-03。RS-06#78）
[^30]: Amazon Web Services『What is AWS Identity and Access Management Roles Anywhere?』IAM Roles Anywhere User Guide. https://docs.aws.amazon.com/rolesanywhere/latest/userguide/introduction.html （参照箇所: 冒頭、Account trust boundary、確認日: 2026-10-03。RS-06#79）
[^31]: Microsoft『Workload Identity Federation - Microsoft Entra Workload ID』Microsoft Learn（updated_at 2026-08-13）. https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation （参照箇所: Supported scenarios（SPIFFE/SPIRE を含む）、How it works の Note、署名鍵 100 個の記述、確認日: 2026-10-03。RS-06#80）
[^32]: AWS『AWS KMS Developer Guide: Request quotas』（版日付の記載なし）. https://docs.aws.amazon.com/kms/latest/developerguide/requests-per-second.html （参照箇所: Request quotas for each AWS KMS API operation、Shared quotas for cryptographic operations、確認日: 2026-10-03。RS-05#44）
[^33]: Dirk-jan Mollema（発見者）『One Token to rule them all - obtaining Global Admin in every Entra ID tenant via Actor tokens』2025-09-17. https://dirkjanm.io/obtaining-global-admin-in-every-entra-id-tenant-with-actor-tokens/ （参照箇所: Actor token の説明、ログの節、確認日: 2026-10-03。RS-05#34。技術的詳細は発見者の一次報告だけに基づく（RS-05 §6））
[^34]: GitHub『OpenID Connect』GitHub Docs（Actions, Concepts, Security）. https://docs.github.com/en/actions/concepts/security/openid-connect （参照箇所: 仕組み, Benefits of using OIDC、確認日: 2026-10-03。RS-17#30）
[^35]: P. Kasselman ほか / IETF『AI Identity Management System』draft-ietf-wimse-aims-00, 2026-09-15（Internet-Draft、Informational、WG Document）. https://datatracker.ietf.org/doc/html/draft-ietf-wimse-aims-00 （参照箇所: §11、確認日: 2026-10-03。RS-06#73）
[^36]: IETF『Datatracker document records』API（/api/v1/doc/document/<name>/ と doc.json）および WIMSE WG ページ（Milestones）. https://datatracker.ietf.org/api/v1/doc/document/ （参照箇所: draft-ietf-oauth-identity-chaining（RFC Ed Queue）、WIMSE WG 文書の状態と RFC 0 件、確認日: 2026-10-03。RS-06#15, #16, #46、standards-status SS-B05, SS-B10）
[^37]: SPIFFE Project『The WIT SPIFFE Verifiable Identity Document』GitHub spiffe/spiffe main（standards/WIT-SVID.md、Stability: Incubating、2026-07-01 追加）. https://github.com/spiffe/spiffe/blob/main/standards/WIT-SVID.md （参照箇所: 冒頭の Stability 表示、確認日: 2026-10-03。RS-06#3）
[^38]: DMTF『DSP0262 Cloud Auditing Data Federation (CADF) - Data Format and Interface Definitions Specification』Version 1.0.0, 2014-06-19. https://www.dmtf.org/sites/default/files/standards/documents/DSP0262_1.0.0.pdf （参照箇所: §4.2.2、確認日: 2026-10-03。RS-10#13）
[^39]: SPIFFE Project『SPIFFE Trust Domain and Bundle』GitHub spiffe/spiffe main（standards/SPIFFE_Trust_Domain_and_Bundle.md、Stability: Stable）. https://github.com/spiffe/spiffe/blob/main/standards/SPIFFE_Trust_Domain_and_Bundle.md （参照箇所: §3 SPIFFE Bundle の "When validating an SVID, validators must choose the bundle corresponding to the trust domain that the SVID resides in"（小文字 must）、確認日: 2026-10-15。research ノート外。独立レビュー者が確認）
[^40]: D. Cooper ほか / IETF『RFC 5280: Internet X.509 Public Key Infrastructure Certificate and Certificate Revocation List (CRL) Profile』Standards Track, 2008-05. https://www.rfc-editor.org/rfc/rfc5280 （参照箇所: §4.2.1.10 Name Constraints "For URIs, the constraint applies to the host part of the name."、確認日: 2026-10-15。research ノート外。独立レビュー者が確認）
[^41]: 本リポジトリ『高保証 PoC 実測レポート（系統 1）』POC-02 版 0.1（draft）. 12_poc/measurement-report.md （参照箇所: §4.1 の TC-004・TC-016 行、§5.6 DEV-19、§6.3 の TC-016 行、§6.5、§7.1 R-2、§7.2 の TC-120・TC-125 行、§9 MR-10、確認日: 2026-10-15。AI エージェントによる自己実行の報告で、独立立会人・作成者以外の確認を経ていない。Gate 4 の証拠ではない）
[^42]: 本リポジトリ『模擬パネル報告』TRC-10 版 0.4. traceability/mock-panel-report.md （参照箇所: §4.2 ラウンド 7、§5.1、確認日: 2026-10-15。模擬パネルは AI エージェントによる自己レビューであり、実在の CTO/CISO の決裁ではない）

---

## レビュー記録

> 独立レビュー（作成者以外の AI エージェント Claude による。実在の CTO/CISO の決裁ではない。CONVENTIONS §8）/ 実施日: 2026-10-15

### 確認した範囲

- 主要 ADR との整合: ADR-001（D1-1, D1-5, D10-2）、ADR-005（D1-4, D9-2, D9-3, V5, K-6, U2）、ADR-007（D7-04, D7-06, D7-11, D7-13, KD7-6, N7-8）、ADR-011（D5-7）、ADR-013（D13-02, D13-08, D13-13, D13-15, D13-20, D13-21, D13-23, D13-25, D13-28, D13-42）、ADR-021（D21-28, D21-35, D21-36）、ADR-022（D-2 の表、D-8-2〜D-8-6, H-4, H-10）、reconciliation-notes（§3, C-22, C-26, C-34, U-02, §6 の ADR-009 宛て申し送り）[D]。
- 原典の照合: draft-ietf-oauth-transaction-tokens-11 の §6・§9.2・§9.2.1・§10・§11.3・§13.14・Document History「Since Draft 06」、Datatracker の doc.json（rev 11、state Active、expires 2027-01-31）、RFC 8417 §2.2・§7.1.1、SPIFFE X509-SVID §4.2・§5、SPIFFE Trust Domain and Bundle §3、RFC 5280 §4.2.1.10 を 2026-10-15 に取得した [D]。RS-06#3〜#47、RS-05#34, #44、RS-17#18〜#30 と本文の強度・版・状態を突き合わせた [D]。
- 前提値: A-012, A-014, A-028, A-040, A-043, A-050, A-054, A-063, A-104, A-110, A-113 を前提台帳と照合し、一致を確認した [D]。
- T-ID・ATK-ID の名称、脚注の参照（[^1]〜[^40] の参照漏れ・未使用なし）、禁止表現（0 件）を確認した [D]。

### 修正（11 件）

| # | 箇所 | 指摘 | 修正 |
|---|---|---|---|
| 1 | D09-30、P09-3、§9 ADR-011 行 | ADR-005 D9-3 は「rctx の IP 等の要求環境は採らない」としており、本書が `rctx` を 4 項目で採ることは主要 ADR と矛盾する | v1 では `rctx` を発行しないに改め、4 項目は v2 以降の候補として P09-3 で提案する形にした |
| 2 | 要旨、D09-06 理由 1 | trust domain 分割の根拠を名前制約（MAY、実装支援が乏しい）だけに置いており、規範の強度に対して論拠が弱い | 検証者が SVID の trust domain に対応する bundle を選ぶ規則（SPIFFE Trust Domain and Bundle §3）を主根拠にし、名前制約は補助に下げた（[^39] 追加） |
| 3 | §3.3 T1 欠点、§5 T1 棄却理由、P09-1 | 「名前制約は trust domain 単位でしか制限できない」を SPIFFE §4.2 [^7] に帰していたが、§4.2 にその記述はない。根拠は RFC 5280 の URI 型制約が host 部に適用されること | RFC 5280 §4.2.1.10 を引いて書き直した（[^40] 追加） |
| 4 | §1.2 | N-c2（bundle 選択、RFC 5280）を制約表に追加 | 追加 |
| 5 | N-g | practices 草案 §5.4 の MUST NOT の例外条件（発行基盤が寿命を判定できない場合）が欠落 | 追記 |
| 6 | D09-02 | 「プロトコル処理を自作しない原則」を ADR-001 D10-2 としていたが、原則は D1-1（D10-2 は STS への適用） | D1-1 に修正 |
| 7 | D09-06 理由 3 | ADR-007 D7-01 は鍵 3 層の定義で、法域別の L1 分離は D7-13 | D7-13 のみに修正 |
| 8 | D09-08 | 「9 個以上」「300 サービス」に前提 ID がない | [N13-1][A-050] を付けた |
| 9 | D09-33 | AWS KMS の 1,000 req/s について、同じページに RSA 500・ECC 300 の食い違う値が残る旨（RS-05#44）が抜けていた | 注記を追加 |
| 10 | D09-37 | identity chaining を「IESG 承認済み」と書いていたが、research の記録は IESG 状態「RFC Ed Queue」 | 状態表記を research・standards-status SS-B05 に合わせた |
| 11 | §3.1・§3.2 の費用行、対応表・冒頭の関連 R/G | W2・W3・C4 の FTE 値に根拠がない。対応表に R-259, G-063, G-074, G-093, G-099, G-124 が漏れていた | FTE 値を「根拠のない仮置き」と明記。R/G 6 行を追記し冒頭の関連一覧も更新 |

### 修正しなかった確認事項

- 選択肢（W1〜W4、C1〜C5、T1〜T4）は各案に勝つ条件と再評価条件があり、藁人形ではないと判断した [D]。C5 と T4 は「勝つ条件なし」だが、棄却理由が規範（RFC 9700 の MUST）または法域境界との不一致で示されている [D]。
- `purp` の改名（draft-07 で `scope`）、`scope` の定義（§9.2.1 "as narrowly as possible, the purpose"）、§13.14、§6 の MAY、RFC 8417 の `txn`（SET 以外でも使用可、IESG が change controller）は原典と一致した [D]。
- CVE-2025-55241 の記述は発見者の一次報告に基づく [I] で、research（RS-05#34）の扱いと一致する [D]。

### 未解決事項

- P09-1（SPIFFE trust domain の数）は ADR-021 D21-28 の「本番 1・非本番 1」と食い違ったままである。ADR-021 が採否を本書に委ねているので矛盾ではなく決裁事項として残した（DEC-3）[D]。
- P09-3: `rctx` の v2 候補 4 項目の採否は ADR-005 の所有者の判断待ちである [D]。
- RR09-7（1 つの workload が複数の Txn trust domain の Txn-Token を受ける構成）: draft-11 に許容・禁止の明文はない。§11.3 は「TTS が複数の trust domain を支える場合」に言及するだけである（レビュー者が 2026-10-15 に確認）[N][^1][D]。
- 新規仮定 NA09-1〜NA09-6 の前提台帳への登録、本レビューで取得した [^39]・[^40] と起草者取得分の traceability/ への照合ログ追記は未了である（指示外のため本レビューでは編集していない）[D]。

### PoC/R7反映（版 0.2）

> 模擬パネルは AI エージェントによる自己レビューであり、実在の CTO/CISO の決裁ではない [D]。

| 指摘・入力 | 対応 |
|---|---|
| 模擬パネル ラウンド 7（cto・ciso・sre）: POC-02 の結果が設計文書に入っていない [D][^42]。POC-02 §6.5（TC-004 の未実施）、§6.3 の TC-016 行、§7.2 の TC-120・TC-125 行、§9 MR-10 | §7.1.1 に TC-004 の未実施の扱いと TC-016 の観測、§8 に 2 行、残課題に 1 行を加えた。PoC の値は自己実行の参考値で、Gate 4 の証拠にしていない |
