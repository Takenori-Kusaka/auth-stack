# 20年運用を前提とした認証・認可基盤提案のCTO/CISOレビュー

## エグゼクティブ判断

**現時点の判定は「本番基盤としては不承認、Phase 0の高保証設計・実証だけ条件付き承認」である。** 提案書は、万能JWTを避け、短命・宛先限定トークン、リソース起点のテナント照合、PEP/PDP分離、ReBAC・RBAC・ABACの合成、ワークロードID、監査、権限変更の一貫性まで視野に入れており、一般的な社内設計書より明らかに技術水準が高い。一方で、これは「有望な参照アーキテクチャと論点集」であり、20年間の経営リスクを引き受けられる承認資料、実装仕様、保証証跡には到達していない。

最大の問題は、採るべき技術要素を広く列挙している一方、保護対象・脅威主体・損失シナリオ・リスク許容度・制御要件・検証方法・合格値・残余リスク受容者の連鎖が閉じていないことである。OWASPも脅威モデリングを、対象の分解、脅威の特定・順位付け、緩和、レビュー・検証からなる反復可能な工程とし、残余リスクの受容理由と検証可能性を記録するよう求めている。提案書のPhase 0に脅威モデルは置かれているが、現時点の本文自体はその工程を完了した成果物ではない。[^1]

したがって、CTO/CISOが承認すべき対象は「この構成を完成形として採用すること」ではなく、**独立評価を含む高保証設計プロセスへ進むこと**である。後述する退出基準を満たすまで、全社共通の認証・認可基盤としての不可逆な標準化、既存システムの強制移行、外部顧客への安全性表明は行わない。

## CTO/CISOの視座

### CTOの責務

CTOは技術選定者に留まらず、事業戦略を技術戦略へ変換し、可用性、変更容易性、運用能力、供給者依存、総所有コスト、人材継続性を含む技術リスクを引き受ける。現代のCTOには、セキュリティとコンプライアンスを製品ライフサイクルへ組み込み、独立リスク評価を行い、レジリエンスを売上継続・信頼・規制対応へ結び付ける役割が求められる。[^2]

本件でCTOが最も重視すべき問いは次の通りである。

- 障害・侵害・誤設定が起きても、被害を一つのテナント、一つのサービス、一つの期間へ封じ込められるか
- 認可判断の正しさだけでなく、可用性、遅延、整合性、変更安全性を数値で保証できるか
- 特定製品、特定クラウド、少数の専門家、独自ポリシー言語へ過度に依存しないか
- 5年後の組織再編、M&A、データ所在地規制、非人間ID増加、暗号移行にも互換性を保てるか
- 事故時に安全な縮退、復旧、ロールバック、証拠保全ができるか

### CISOの責務

CISOは「事故をゼロにする人」ではなく、企業のサイバーリスクを識別・評価し、経営が理解できる損失シナリオへ翻訳し、統制、監視、対応、保証を継続的に成立させる責任者である。ISACAは、CISOの責務をセキュリティアーキテクチャ、運用、ガバナンス、リスク、コンプライアンスにまたがるものとし、リスク許容度、脅威規模、緩和費用を経営へ伝える役割を挙げている。[^3][^4]

ただし、サイバーリスクの最終所有者をCISO個人へ押し付けてはならない。CISAは、コスト、機能、速度をセキュリティより優先する判断はCEO・取締役会が透明に所有すべきであり、CISOには影響力と資源を与えるべきだとしている。NACDも、取締役会がリスク許容度を定め、経営が継続評価と透明な報告を伴うリスクベースのプログラムを実行する分担を示している。[^5][^6][^7]

従って「瑕疵があればCTO/CISOが辞任」という覚悟は重いが、良い統治モデルではない。必要なのは、責任だけでなく決裁権、予算、人員、停止権限、リスク受容権者、独立監査経路を明文化し、意図的な無視、虚偽報告、重大な管理不履行と、合理的統制を尽くしても残るリスクを区別することである。

## 最重要原則

世界的な枠組みから抽出すると、CTO/CISOが最も大事にすべき考え方は次の七つに集約できる。

1. **経営リスクとして扱う** — NIST CSF 2.0はGovernを追加し、サイバーリスクを財務・評判等と並ぶ企業リスクとして扱い、Govern、Identify、Protect、Detect、Respond、Recoverを同時並行で回す。[^8][^9]
2. **リスク許容度から制御を導く** — ISO/IEC 27001:2022は、組織の文脈に即した情報セキュリティリスク評価・処置と、ISMSの継続的改善を要求する。[^10]
3. **暗黙の信頼を置かない** — NIST SP 800-207は、ネットワーク位置や資産所有だけで信頼せず、主体・端末を認証・認可してから資源アクセスを確立し、ネットワーク区画ではなく資源を保護対象とする。[^11][^12]
4. **最小権限と職務分離を証明する** — クラウドIAMではMFA、JIT、PBAC/ABAC、ライフサイクル管理、全IAM変更の監視が基本であり、提供者と利用者の責任分界も明確にする必要がある。[^13][^14]
5. **Secure by DesignをSDLCへ埋め込む** — NIST SSDFは、組織準備、ソフトウェア保護、安全なソフトウェア生成、脆弱性対応を既存SDLCへ統合し、リスクを設計・アーキテクチャで緩和することを求める。[^15][^16][^17]
6. **独立した保証を得る** — 高影響システムでは、実装チーム自身の説明だけでなく、独立評価者による統制評価と侵入試験が必要である。NIST系の評価実務でもCA-2の独立評価、CA-8の独立侵入試験が置かれる。[^18][^19]
7. **侵害を前提に検知・封じ込め・復旧する** — NISTのインシデント対応指針は、対応を単独工程ではなくCSF 2.0の全六機能へ統合し、予防、準備、検知、封じ込め、復旧、教訓反映を一体化する。[^20]

## 適用すべき基準

| 層 | 基準・規格 | 本基盤への使い方 |
|---|---|---|
| 経営・統治 | NIST CSF 2.0、ISO/IEC 27001:2022 | リスク許容度、役割、サプライチェーン、指標、継続改善、取締役会報告の骨格[^8][^10] |
| デジタルID | NIST SP 800-63-4、63B-4、63C-4 | IAL/AAL/FAL、認証器、フィッシング耐性、アカウント回復、再認証、連携保証の基準[^21][^22][^23] |
| Zero Trust | NIST SP 800-207 | 人・端末・ワークロード・資源単位の継続的評価、制御面とデータ面の分離[^11][^12] |
| OAuth/OIDC | RFC 9700、RFC 9068、RFC 8725、RFC 9449 | PKCE、redirect URI完全一致、refresh rotationまたはsender constraint、JWT厳格検証、DPoP[^24][^25][^26][^27] |
| 高保証API | FAPI 2.0 Security Profile | 金融に限らない高価値APIの攻撃者モデル、PAR、mTLS/DPoP、非対称クライアント認証、適合性試験[^28][^29][^30] |
| セキュア開発 | NIST SSDF 1.1、OWASP ASVS 5.0 | 要件、設計、認証、セッション、アクセス制御、暗号、APIの検証可能なチェックリスト[^15][^31][^32] |
| API脅威 | OWASP API Security Top 10 | BOLA、認証不備、オブジェクト属性・機能レベル認可不備を負例試験へ組み込む[^33] |
| クラウド統制 | CSA Security Guidance v5、CCM、SSCF | SaaS提供者・顧客の責任分界、IAM統制、顧客向け設定可能なセキュリティ機能の基準[^34][^35][^36] |
| ソフトウェア供給網 | SLSA 1.2 | ビルド来歴、署名、隔離されたビルド基盤、成果物改ざん防止[^37] |
| 監査・保証 | SOC 2 Trust Services Criteria、必要時PCI DSS | Security/Availability/Confidentiality等の統制証跡、決済対象時のアカウント・MFA・ログ要件[^38][^39] |

この一覧は「全部の認証を取る」という意味ではない。対象市場、扱うデータ、契約、法域に応じて適用可能性を決め、各要求を一つの統制台帳へマッピングし、設計・実装・テスト・運用証跡の所有者を割り当てる。

## 提案の評価

### 高く評価できる点

| 項目 | 評価 | CTO/CISO所見 |
|---|---|---|
| 万能JWTの否定 | 強い | JWTを権限DBにせず、主体・テナント・API能力の封筒として扱う方向は正しい |
| テナント境界 | 強い | tokenの`tid`だけでなく、resource-derived tenant、ストレージ境界、サービス認可を重ねる発想は防御深度がある |
| 宛先限定 | 強い | サービス別`aud`、token exchange、`sub`と`act`の分離はconfused deputyと横流し対策として妥当 |
| 細粒度認可 | 強い | typed ReBACを中核に固定RBACと限定ABACを合成し、巨大ロール表を避ける設計は拡張性が高い |
| 一貫性認識 | 強い | 権限剥奪、新旧ACL、transactional outbox、revision-aware cacheまで認識している |
| PEP/PDP分離 | 強い | 判定と強制を分け、各サービスでbypass不能にする思想は妥当 |
| 非人間ID | 強い | ユーザーJWT流用ではなく、workload identity、mTLS、委任を分離している |
| 変更統制 | 良い | schema-first、policy-as-code、revision pinning、shadow判定、canary、rollbackを挙げている |
| 監査 | 良い | decision ID、policy/model revision、actor chain、resource、理由を追跡する方針は説明責任に資する |
| 特権アクセス | 良い | JIT、MFA、二者承認、理由、セッション記録、break-glassを通常権限から分離している |

OAuth 2.0 Security BCPはpublic clientのPKCEを必須とし、redirect URIの完全一致、public clientのrefresh tokenにsender constraintまたはrotation、非対称クライアント認証、end-to-end TLSを推奨・要求しているため、提案の宛先限定・短命化・DPoP/mTLSの方向は最新の標準と整合する。また、ZanzibarがACL更新とコンテンツ更新の因果順序をconsistency tokenで守る点まで認識しているのは重要で、単純TTLキャッシュ設計より一段深い。[^24][^40]

### 重大な不足

| 重大度 | 不足 | 問題になる理由 | 必須対応 |
|---|---|---|---|
| Critical | リスク定義と承認基準がない | 「高セキュリティ」が何をどこまで防ぐか、経営が何を受容したか証明できない | 損失シナリオ、脅威主体、データ分類、リスク許容度、KRI、残余リスク受容者を確定 |
| Critical | 認証ライフサイクルが薄い | 本文は認可中心で、登録、本人確認、IdP連携、account linking、回復、認証器変更、退職・削除が設計されていない | NIST 800-63-4でIAL/AAL/FALをユースケース別に決め、全イベントを状態機械化 |
| Critical | 管理面・鍵のroot of trustが未設計 | AS/PAP、署名鍵、JWKS、HSM/KMS、CI/CDの侵害は全テナントへ波及する | 鍵階層、生成・保管・rotation・失効・災害復旧、二者統制、オフラインroot、侵害runbookを設計 |
| Critical | PEP完全性の証明がない | 一つでも認可を通らない経路、batch、queue、内部API、データ直アクセスがあれば全体が破綻する | 全entry point inventory、enforcement coverage、bypass test、DB/storage側guardrailを自動検証 |
| Critical | 独立保証がない | 設計者の自己評価だけでは共通セキュリティ基盤を承認できない | 外部アーキテクチャレビュー、OAuth/OIDC適合試験、独立侵入試験、red teamをgate化 |
| High | 可用性・整合性の合格値が空欄 | p99、RTO/RPO、剥奪反映時間、stale許容が「決めるべき事項」のまま | 操作リスク階層ごとに数値を決裁し、負荷・障害・分断試験で証明 |
| High | fail-closedが粗い | 全読取を一律停止すると業務継続を損ない、fail-openは漏えいを生む | read/write/admin/緊急業務ごとに安全な失敗モードと限定graceを定義 |
| High | 製品・運用モデル未決定 | OpenFGA、Cedar、OPA、AVP、独自実装は意味論・整合性・運用負荷が異なる | build/buy/managed比較、PoC、出口戦略、データ移行可能性、必要要員を評価 |
| High | 20年の進化設計がない | 暗号、標準、クラウド、組織、法規制、ID種別は変化する | crypto agility、version negotiation、schema migration、dual-run、deprecation policyを設計 |
| High | インシデント運用が不足 | token・鍵・IdP・PDP・監査基盤ごとの侵害時に止め方が違う | compromise別runbook、kill switch、全session失効、鍵切替、顧客通知、証拠保全演習 |
| High | 証跡・プライバシー設計が未完 | 全decision監査は大量・高コストで、主体・資源情報自体が機密になる | 目的、最小化、保持、地域、アクセス、WORM、削除、コスト、SIEM障害時挙動を確定 |
| Medium | 顧客管理機能が弱い | B2B SaaSでは顧客管理者、SCIM、SAML/OIDC設定、domain claim、delegated adminが主要攻撃面 | federation onboarding/offboarding、domain verification、SCIM、顧客監査APIを設計 |
| Medium | 人材・所有権モデルがない | 高度な認可モデルは少数専門家への依存と運用事故を招く | platform/domain/security/SREの責任分界、on-call、教育、bus factor、変更承認を定義 |

NIST 800-63B-4では、OTPの手入力はフィッシング耐性とは見なされず、AAL2アカウント回復にも二つの異なる回復要素、既存認証器との組合せ、または再本人確認が必要になる。提案書の「OIDC、MFA、BFF」だけでは、アカウント乗っ取りの主要経路である回復・認証器変更・IdP再連携を統制したことにならない。[^23][^41][^42]

### 技術上の危険点

#### 認証と認可の非対称

提案書の技術的厚みは認可に偏っている。認証局面では、ユーザー登録、招待、所属変更、IdP発見、複数IdP、メールアドレス再利用、同一人物のaccount linking、SAML署名鍵更新、IdP停止時の回復、SCIM競合、認証器紛失、supportによる回復、passkey同期、step-upの鮮度などが未定義である。

FAL2ではassertion injection protectionが必要で、RP起点の連携や期待IdP・audienceの厳密検証が重要になる。B2Bマルチテナントで「どのテナントの、どのIdPが、この主体を保証したか」を誤ると、精緻なReBAC以前に境界が崩れる。[^43][^44]

#### Zanzibar系の過信

Zanzibarの論文は、関係タプルだけでなく、外部整合性、因果順序、グローバル時刻、専用運用基盤を組み合わせたシステムである。OpenFGA等で似たモデルを書くことと、Zanzibar相当の保証を得ることは同義ではない。OpenFGA自身もキャッシュがstalenessを増やすこと、read replicaでは古い結果があり得ること、高整合性読取を使い分けることを明記している。[^45][^40][^46]

よって「権限剥奪直後に何ミリ秒以内で拒否するか」「変更直後の読取でどのconsistency modeを使うか」「コンテンツ更新とrelation更新をどう原子的に結び付けるか」を操作単位で決めなければならない。モデルID固定、shadow check、段階展開は必須であり、OpenFGAも本番で特定model IDをpinし、新旧モデルのshadow checkを推奨している。[^47]

#### 共有PDPのblast radius

共通PDPは統制を強くする一方、誤ったglobal deny/allow、schema移行、キャッシュ汚染、tenant routing不具合が全サービスへ波及する。AWSもshared policy storeには変更失敗の影響範囲とnoisy-neighborの増大があり、テナント固有policyにはper-tenant storeを推奨している。[^48][^49]

従って「control plane中央、decision plane分散」だけでは不足する。tenant/domainごとのfault containment、policy store分割、quota、cell architecture、段階rollout、緊急freeze、既知良好版への即時復帰を設計する必要がある。

#### JWT・OAuthの更新不足

提案書はRFC 9068、JWT BCP、DPoPへ触れているが、2025年のRFC 9700を明示的な準拠基準としていない。RFC 9700はimplicit grant等の古い運用を非推奨化し、PKCE、redirect URI完全一致、refresh token保護、issuer binding、asymmetric client authentication等を具体化している。[^24]

高価値APIではFAPI 2.0 Security Profileを基準profileとして比較すべきである。FAPI 2.0は2025年にFinalとなり、OAuth Security BCPに従い、PAR、mTLSまたはDPoP、攻撃者モデルに基づく高保証API保護を定義し、適合性試験も利用できる。[^28][^50][^30]

#### fail-closedの扱い

「不明ならdeny」は認可の安全側原則として正しいが、全操作に一律適用すると、PDP障害が全社停止へ直結する。例えば閲覧、更新、管理、権限付与、緊急医療・安全関連操作では、機密性と可用性の優先度が異なる。

操作を少なくとも `public/read-sensitive/write/privileged/break-glass` に分類し、それぞれについてキャッシュ最大齢、必要整合性、PDP不達時挙動、監査不能時挙動、利用可能な代替経路を決めるべきである。高リスク操作はfresh decision必須、低リスクreadのみ短い署名済み既知良好decisionを認める、といった明示的なリスク判断が必要になる。

### 文書品質の問題

提案書の参考文献番号には、本文の主張と参照先が一致しない箇所が見られる。たとえばDPoPの説明に付いた参照番号が実際には別製品のマルチテナント説明やアクセストークンprofileを指し、JWT BCPの説明に付いた番号が認可サーバー作成ガイドを指すなど、引用索引が崩れている。さらに重要論点の一部でQ&Aページを一次仕様の代替にしている。

これは単なる体裁問題ではない。安全性判断では、規範RFC、NIST/ISO、ベンダー正式仕様、適合試験結果、実測データ、設計上の推論を明確に区別する必要がある。現状のままでは、レビュー担当者が「標準が要求する事項」「ベンダー実装の事実」「提案者の設計判断」を追跡できず、保証証跡として利用できない。

また「推奨自社基盤＝柔軟性・セキュリティとも非常に高い」という自己評価は削除すべきである。実装前の構想は高セキュリティではなく、**高セキュリティを目標とする設計候補**に過ぎない。評価は制御の実装証拠、適合性、攻撃試験、運用実績、SLO、監査結果でのみ上げる。

## 進め方の再設計

### Gate 0: 統治

経営会議または取締役会が、保護対象、最大許容損失、最大停止時間、規制・契約要件、テナント間漏えいの許容度ゼロ、特権濫用、顧客IdP侵害時の責任境界を承認する。CISOはリスクを提示し、CTOは実現性・費用・可用性を提示し、事業責任者が残余リスクを受容する。

成果物は、risk appetite statement、重大損失シナリオ、RACI、例外承認手順、停止権限、四半期報告KRI、独立保証計画である。これがなければ技術チームは「何をもって十分安全か」を決められない。

### Gate 1: 要件

ユーザー、人事ID、顧客管理者、support、service account、workload、外部integration、agent/AIを主体として列挙し、登録から削除までの状態遷移を定義する。各業務操作に対して、必要IAL/AAL/FAL、step-up、SoD、最大session、再認証、回復要件、監査、データ分類を割り当てる。

同時に全entry point、trust boundary、データフロー、非同期経路、管理面、緊急経路をDFD化する。OWASP ASVSはアーキテクチャ・脅威モデル、認証、session、アクセス制御を別領域として検証するため、この粒度を受入基準へ落とし込める。[^32]

### Gate 2: 攻撃者モデル

最低限、外部攻撃者、悪意あるテナント管理者、侵害された一般ユーザー、侵害された顧客IdP、盗まれたtoken、侵害されたmicroservice、CI/CD侵害、クラウド管理者、内部support、policy author、DB read権限者、リージョン障害を扱う。

各脅威について、予防、検知、封じ込め、復旧、証拠を記載する。「MFAがある」ではなく、フィッシング耐性、recovery bypass、session theft、token replay、IdP mix-up、JWKS差替え、tenant confusion、BOLA、policy rollback、stale allowまで具体化する。

### Gate 3: ADRと選定

少なくとも次をArchitecture Decision Recordとして分離する。

- managed IdPか自営ASか。原則として認証プロトコル・認証器・回復を自作しない
- access tokenはopaqueかJWTか、どの境界で使い分けるか
- FAPI 2.0を必須にするAPI範囲
- authorization engineとstoreの選定、整合性モデル、tenant/domain分割
- policy language、schema、deny semantics、conflict resolution
- PDP topologyとcell/fault domain
- workload identityとtoken exchange
- 鍵管理、暗号俊敏性、量子耐性移行の抽象境界
- 監査データモデル、保持、データ所在地、顧客への開示
- migration、dual-write、shadow、rollback、vendor exit

選定表には機能だけでなく、整合性、最大深度、tail latency、障害モード、multi-region、バックアップ復旧、運用人員、ライセンス、価格変動、データ移出、schema portability、CVE対応、LTSを含める。

### Gate 4: 高保証PoC

happy pathのデモではなく、攻撃と障害を主目的にする。

- 2テナント、複数IdP、同一メール、複数所属、招待、退職、SCIM遅延、account recovery
- folder移動、外部共有、group nesting、custom role、権限剥奪直後、同時更新
- 他テナントIDをURL/body/header/tokenへ混ぜるcross-tenant property test
- API A用tokenをAPI Bへ提示、redirect URI差異、issuer mix-up、stolen refresh token、DPoP replay
- PDP timeout、全断、片リージョン断、read replica lag、古いpolicy bundle、鍵rotation、JWKS障害
- policy/modelの旧版・新版differential test、shadow判定、即時rollback
- 管理者・supportのJIT、二者承認、break-glass、監査改ざん・監査基盤停止

JWTはalgorithm allowlist、`typ`、`iss`、`aud`、有効時刻、署名鍵とissuerの結合を厳格に検証し、異なる種類のJWTで相互排他的な検証規則を持たせる。これはJWT BCPの中心要件である。DPoPはtokenを鍵へ束縛してreplayを難しくするが、侵害された実行環境やXSSを解決しないため、BFF、CSP、短命化、鍵保護と併用する。[^27][^51][^26]

### Gate 5: 独立保証

実装チームと報告系統を分けた評価者が、設計、コード、IaC、policy、鍵管理、CI/CD、運用runbookを評価する。OAuth/OIDC/FAPIのconformance suite、ASVSベースの検証、API Top 10、cross-tenant pentest、red team、クラウド設定レビュー、供給網レビューを行う。

Critical/Highの未解決事項は原則として本番移行を止める。例外は、期限、補完統制、影響範囲、責任者、失効条件を記した経営承認付きrisk acceptanceだけとし、CISO単独へ押し付けない。

### Gate 6: 段階導入

新旧認可を同時実行し、旧判定と新判定の差分を記録する。新基盤のallowが旧基盤より広い差分は即時調査し、deny差分は業務影響を確認する。read-only、低リスクtenant、限定resource typeから始め、cell単位で拡大し、各段階に自動rollback条件を置く。

本番後も四半期ごとにKRI、年次独立評価、定期red team、鍵・IdP・PDP侵害演習、schema migration演習、vendor exit演習を行う。SSDFが求めるのは一度の審査ではなく、脆弱性の根本原因を将来の開発へ反映する継続的工程である。[^15]

## 必須の数値契約

数値自体は事業影響分析とPoC実測で決めるべきで、提案書の段階で任意に置いてはならない。ただし、少なくとも以下を空欄のまま本番承認してはならない。

| 分類 | 必須指標 |
|---|---|
| 認証 | login成功率、p95/p99、IdP障害時挙動、session最大時間、再認証間隔、回復完了SLO、不正回復検知時間 |
| token | access/refresh寿命、clock skew、鍵rotation周期、旧鍵併存時間、緊急失効完了時間、JWKS cache最大齢 |
| 認可 | Check p95/p99/p99.9、availability、最大graph depth/fanout、query budget、誤allow許容値、誤deny予算 |
| 剥奪 | 通常・高権限・tenant停止ごとの最大反映時間、stale allowの最大継続、cache invalidation成功率 |
| 可用性 | control/decision plane別SLO、RTO、RPO、リージョン切替時間、dependency budget |
| 監査 | 重要decision記録率、欠損検知時間、WORM転送遅延、保持期間、検索SLO、時刻同期精度 |
| 変更 | policy/model canary期間、diff許容条件、rollback時間、schema互換期間、未移行consumer数 |
| インシデント | MTTD、封じ込め時間、全session失効時間、鍵差替え時間、顧客通知判断時間 |

「全decisionを監査する」は目標としては良いが、記録率、欠損検知、backpressure、監査経路停止時の挙動を定義しなければ保証にならない。監査をtrace samplingへ依存させず、セキュリティイベントを独立経路へ送る方針は維持すべきである。

## 意思決定マトリクス

| 選択肢 | 判断 |
|---|---|
| 現提案を完成アーキテクチャとして即時承認 | **不承認** |
| 現提案を方向性としてPhase 0〜高保証PoCへ進める | **条件付き承認** |
| 認証器・password・account recovery・OAuth ASを全面自作 | **原則不承認**。差別化要因と法的必要性があり、専任チームと独立保証を用意できる場合のみ例外審査 |
| 認可domain modelとPEP統合を自社開発 | **承認候補**。業務固有性が高いため。ただしengine/store自作は別審査 |
| 一つのglobal policy store/PDPへ全テナントを集約 | **原則不承認**。blast radiusとnoisy neighborを実証的に抑えられる場合のみ限定採用 |
| typed ReBAC + 限定ABAC + resource-local PEP | **方向性承認** |
| service別audience、token exchange、workload identity | **方向性承認** |
| 5〜15分token、全fail-closed等の一律値 | **未承認**。リスク階層と実測に基づき決定 |
| 「非常に高いセキュリティ」という自己評価 | **削除**。第三者保証と運用実績で評価 |

## 承認条件

本番設計審査へ進む最低条件は以下である。

- 経営承認済みのrisk appetite、対象法域、データ分類、重大損失シナリオがある
- IAL/AAL/FAL、認証器、account recovery、federation、SCIM、session lifecycleがユースケース別に定義されている
- AS/PAP/CI/CD/KMS/HSM/JWKSを含むroot of trustと侵害runbookがある
- 全entry pointのPEP coverageを機械的に検証でき、DB/storageにもtenant guardrailがある
- OAuth 2.0 Security BCP準拠profileと、高価値APIに対するFAPI 2.0採否が決まっている
- authorization engine/storeの整合性・分割・障害モデルを実測し、権限剥奪SLOを満たしている
- policy/model/schema/token/auditのversioningと後方互換・rollback方式がある
- 独立設計レビュー、conformance、cross-tenant pentest、red teamでCritical/Highが閉じている
- 24時間365日の運用責任、SRE容量、on-call、教育、bus factor、vendor support、TCOが承認されている
- 顧客通知、全session失効、鍵交換、PDP隔離、監査証拠保全を含む演習に合格している

## 最終所見

提案チームは、認証・認可を単なるJWTとrole判定ではなく、分散システム、整合性、委任、テナント分離、監査、変更統制の問題として捉えている。この点は高く評価でき、アーキテクチャの方向性は十分に専門的である。

しかし、**高度な用語と技術要素が揃っていることと、高保証基盤として安全であることは別である。** 現在の文書には、認証ライフサイクル、root of trust、定量SLO、独立保証、インシデント対応、20年の移行・廃止戦略、統制証跡が不足し、引用の追跡可能性にも問題がある。従って、現時点で「この設計なら20年戦える」と署名するのは、CTO/CISOとして適切ではない。

適切な決裁は、方向性を評価しつつ完成扱いを拒み、Phase 0を経営リスク定義からやり直し、FAPI 2.0、NIST 800-63-4、SSDF、ASVS 5、CSF 2.0へ明示的にマッピングし、攻撃・障害・移行を実証し、独立評価を通すことである。その証拠が揃った時点で初めて、限定スコープの本番導入を承認できる。

---

## References

1. [Threat Modeling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html) - Website with the collection of all the cheat sheets of the project.

2. [[PDF] Five forces redefining the CTO mandate in software companies | EY](https://www.ey.com/content/dam/ey-unified-site/ey-com/fr-fr/insights/tmt/documents/ey-five-forces-redefining-the-cto-mandate-in-software-companies-15122025.pdf)

3. [The Role of the CISO and the Digital Security Landscape](https://www.isaca.org/resources/isaca-journal/issues/2019/volume-2/the-role-of-the-ciso-and-the-digital-security-landscape) - The CISO is responsible for translating the digital security risk to senior management by identifyin...

4. [2021 Volume 5 Virtual CISOs Security Leader or Security Risk - ISACA](https://www.isaca.org/resources/isaca-journal/issues/2021/volume-5/virtual-cisos-security-leader-or-security-risk) - Every organization needs a leader dedicated to establishing, executing and preserving its informatio...

5. [2026 Director's Handbook on Cyber-Risk Oversight](https://www.nacdonline.org/globalassets/public-pdfs/2026_directors-handbook-cyber-risk_accessible.pdf)

6. [Adopt an Enterprise Framework for Managing Cyber Risk](https://www.nacdonline.org/all-governance/governance-resources/governance-research/director-handbooks/2026-cyber-risk-oversight/cyber-risk-handbook-principles-2026/principle-4-adopt-an-enterprise-framework-for-managing-cyber-risk/) - Align board oversight with management execution. Discover how to adopt an enterprise framework for m...

7. [Corporate Cyber Governance: Owning Cyber Risk at the ...](https://www.cisa.gov/news-events/news/corporate-cyber-governance-owning-cyber-risk-board-level)

8. [NIST Releases Version 2.0 of Landmark Cybersecurity Framework](https://www.nist.gov/news-events/news/2024/02/nist-releases-version-20-landmark-cybersecurity-framework) - The agency has finalized the framework’s first major update since its creation in 2014.

9. [The NIST Cybersecurity Framework (CSF) 2](https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf?/)

10. [ISO/IEC 27001:2022](https://webstore.iec.ch/en/publication/79694)

11. [Zero Trust Architecture | NIST](https://www.nist.gov/publications/zero-trust-architecture) - Zero trust (ZT) is the term for an evolving set of cybersecurity paradigms that move defenses from s...

12. [Zero Trust Architecture - NIST](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-207.pdf)

13. [Identity and Access Management in Cloud Security](https://cloudsecurityalliance.org/blog/2024/08/28/identity-and-access-management-in-cloud-security) - Identity and access management (IAM) ensures that only authorized identities have access to resource...

14. [Introductory Guidance to Cloud Controls Matrix (CCM) | CSA](https://cloudsecurityalliance.org/artifacts/introductory-guidance-to-ccm) - Practical directions on using CSA’s Cloud Controls Matrix (CCM) v4.1 & the Shared Security Responsib...

15. [SP 800-218, Secure Software Development Framework ...](https://csrc.nist.gov/pubs/sp/800/218/final) - M Souppaya 著 · 2022 · 被引用数: 249 — This document recommends the Secure Software Development Framework...

16. [[PDF] Secure Software Development Framework (SSDF) Version 1.1](https://nvlpubs.nist.gov/nistpubs/specialpublications/nist.sp.800-218.pdf)

17. [NIST Computer Security Resource Center](https://csrc.nist.gov/files/pubs/sp/800/218/final/docs/nist.sp.800-218.ssdf-table.xlsx)

18. [[PDF] Information Technology (IT) Assessment, Authorization, and ...](https://www.ed.gov/media/document/2025-security-assessment-and-authorization-standards-109735.pdf)

19. [nvlpubs.nist.gov · SP · nistspecialpublication800-53ar4Assessing Security and Privacy Controls in Federal Information...](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-53ar4.pdf)

20. [Incident Response Recommendations and Considerations for ...](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r3.pdf)

21. [NIST Special Publication 800-63-4](https://pages.nist.gov/800-63-4/sp800-63.html) - NIST Special Publication 800-63-4

22. [SP 800-63C-4, Digital Identity Guidelines: Federation and ...](https://csrc.nist.gov/pubs/sp/800/63/c/4/final) - This guideline focuses on identity federations and the use of assertions to implement them. Federati...

23. [NIST Special Publication 800-63B](https://pages.nist.gov/800-63-4/sp800-63b.html) - NIST Special Publication 800-63B

24. [RFC 9700: Best Current Practice for OAuth 2.0 Security](https://datatracker.ietf.org/doc/html/rfc9700) - This document describes best current security practice for OAuth 2.0. It updates and extends the thr...

25. [RFC 9068: JSON Web Token (JWT) Profile for OAuth 2.0 Access Tokens](https://www.ietf.org/rfc/rfc9068.pdf)

26. [RFC 8725 - JSON Web Token Best Current Practices](https://datatracker.ietf.org/doc/html/rfc8725) - JSON Web Tokens, also known as JWTs, are URL-safe JSON-based security tokens that contain a set of c...

27. [RFC 9449: OAuth 2.0 Demonstrating Proof of Possession (DPoP)](https://www.ietf.org/rfc/rfc9449.pdf)

28. [FAPI 2.0 Security Profile](https://openid.net/specs/fapi-security-profile-2_0-final.html) - OIDF FAPI 2.0 is an API security profile suitable for high-security applications based on the OAuth ...

29. [FAPI Working Group - Overview](https://openid.net/wg/fapi/) - The FAPI working group provides JSON data schemas, security and privacy recommendations and protocol...

30. [Final Tests for FAPI 2.0 Security Profile & Message Signing](https://openid.net/fapi2-0-final-conformance-tests-available/) - OIDF has announced conformance tests and certifications for the FAPI 2.0 Security Profile and FAPI 2...

31. [ASVS](https://owasp.org/projects/asvs) - The OWASP Application Security Verification Standard (ASVS) Project provides a basis for testing web...

32. [ASVS - OWASP Developer Guide](https://devguide.owasp.org/en/06-verification/01-guides/03-asvs/) - OWASP Foundation Developer Guide project

33. [API Top 10 - OWASP Developer Guide](https://devguide.owasp.org/en/07-training-education/07-api-top-ten/) - OWASP Foundation Developer Guide project

34. [CSA Security Guidance for Cloud Computing](https://cloudsecurityalliance.org/research/guidance) - Emphasizing the practical application of security principles in real-world scenarios, this comprehen...

35. [Cloud Controls Matrix | CSA](https://cloudsecurityalliance.org/research/cloud-controls-matrix) - The CSA Cloud Controls Matrix (CCM) is a framework created by the Cloud Security Alliance (CSA) to h...

36. [SaaS Security Capability Framework (SSCF)](https://cloudsecurityalliance.org/artifacts/saas-security-capability-framework) - The SaaS Security Capability Framework defines configurable, consumable, and customer-facing securit...

37. [slsa.dev › spec › v1SLSA • SLSA specification](https://slsa.dev/spec/v1.2/) - SLSA is a specification for describing and incrementally improving supply chain security, establishe...

38. [2017 Trust Services Criteria (With Revised Points of Focus](https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022) - The 2017 Trust Services Criteria for Security, Availability, Processing Integrity, Confidentiality, ...

39. [Payment Card Industry Data Security Standard](https://listings.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-A.pdf)

40. [Zanzibar: Google’s Consistent, Global Authorization System](https://storage.googleapis.com/gweb-research2023-media/pubtools/5068.pdf)

41. [Authenticator Event Management - NIST Pages](https://pages.nist.gov/800-63-4/sp800-63b/events/) - NIST Special Publication 800-63 Digital Identity Guidelines

42. [Authenticators - NIST Pages](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/) - NIST Special Publication 800-63 Digital Identity Guidelines

43. [Federation Assurance Level (FAL)](https://pages.nist.gov/800-63-4/sp800-63c/fal/) - NIST Special Publication 800-63 Digital Identity Guidelines

44. [Digital Identity Guidelines: Federation and Assertions](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-63C-4.pdf) - D Temoshok 著 · 2025 · 被引用数: 60 — See [SP800-63] for details on how to choose the most appropriate FA...

45. [openfga.dev › best-practices › running-in-productionRunning OpenFGA in Production](https://openfga.dev/docs/best-practices/running-in-production)

46. [Configuring OpenFGA](https://openfga.dev/docs/getting-started/setup-openfga/configure-openfga)

47. [Immutable Authorization Models](https://openfga.dev/docs/getting-started/immutable-models)

48. [One shared multi-tenant policy store - AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-api-access-authorization/avp-design-shared-store.html) - One shared multi-tenant policy store design model for implementing authorization in SaaS application...

49. [Per-tenant policy store - AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-api-access-authorization/avp-design-per-tenant-store.html) - Per-tenant policy store design model for implementing authorization in SaaS applications by using Am...

50. [FAPI 2.0 Security Profile and Attacker Model Final Specifications ...](https://openid.net/fapi-2-security-profile-attacker-model-final-specifications-approved/) - The OpenID Foundation membership has approved the FAPI 2.0 Security Profile and Attacker Model as Fi...

51. [DPoP Adoption Guide | Authorization Resources](https://developers.google.com/identity/protocols/oauth2/resources/dpop-adoption)

