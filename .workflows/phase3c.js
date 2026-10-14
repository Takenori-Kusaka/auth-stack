export const meta = {
  name: 'phase3c-architecture-contracts-integration',
  description: 'Phase3 Wave C: アーキテクチャ15文書（claim目録含む）、DFD・統制台帳・数値契約・運用・保証・PoC計画、連携契約、連携ハンドブックの起草と独立レビュー',
  phases: [
    { title: 'Architecture', detail: '04_architecture 15文書の起草と独立レビュー' },
    { title: 'Arch reconcile', detail: '参照アーキテクチャと詳細文書の整合' },
    { title: 'Contracts & ops', detail: '11_contracts、DFD、統制台帳、数値契約、運用、保証、PoC計画' },
    { title: 'Integration', detail: '10_integration 連携ハンドブックとモック・契約試験キット' },
  ],
}

const ROOT = 'E:\\Github\\auth-stack'
const COMMON = `作業ディレクトリは ${ROOT} 。背景: 汎用の共通認証・認可基盤の再提案プログラム（旧提案はCTO/CISOレビューで本番不承認）。規模は1000億円規模システム・利用者100万人・約1万テナント・約300マイクロサービス・20〜30開発チーム/ベンダー、法域は日本・EU/英国・米国・業界規制、計画期間20年、汎用・仮置き前提。必読: CONVENTIONS.md、traceability/deliverables.md（ファイル名・文書ID・DLの正本。該当行の要点を必ず満たす）。設計判断の正本: 05_adr/（README.md 索引、ADR-001〜ADR-029、reconciliation-notes.md）。決定済みADRに反する設計を書かない。ADRで未決の点は「未決（ADR-0xx）」と明記。上流文書: 01_governance/（前提台帳 assumptions-register.md の A-ID と容量導出、BIA、損失シナリオ S-ID、KRI K-ID、20年耐久性憲章）、02_requirements/（操作5分類は operation-risk-tiers-assurance.md が正本）、03_threat-model/（ATK-ID、T-ID、事故ケースブック、不正対策）、06_controls/applicability.md。台帳: traceability/R-requirements.md、G-goal-criteria.md、claims-ledger.md、dissent-log.md、rejected-hypotheses.md。調査: research/RS-01〜RS-17 と research/standards-status.md（版・状態の正本）。根拠は research で検証済みの原典を脚注で引き「RS-xx#n」併記、ないものは原典取得（ToolSearch "select:WebFetch,WebSearch"）。二次情報は根拠にしない。仮定は A-ID（新規は「前提台帳へ追加要」）。禁止表現なし。指示されたファイル以外は作成・編集しない（多数のエージェントが並行作業中）。`

const DOC_RULES = `文書の共通要件: (1) CONVENTIONS §1 のメタ情報ブロック。(2) R-requirements.md と G-goal-criteria.md から、対応成果物欄にこのファイルのパスまたはDL-IDを含む行を Grep で全て抽出し全てに応える。末尾「対応表」でR/G-ID→節→閉じ方→状態。(3) 経営判断が要る点は決裁案（選択肢・推奨・帰結・決める人）。根拠のない数値を置かない（A-ID、BIA、ADR、実測予定TCに紐付けるか TBD＋所有者＋期限＋決め方）。(4) 末尾に「残課題」と「参考文献」。(5) 読み手はCTO/CISOと連携開発者。結論先行、表とMermaid図を活用。`

function author(d, ph) {
  return agent(`${COMMON}
あなたの担当: ${d.path}（文書ID ${d.id}、${d.dl}）「${d.title}」。
必読: ${d.inputs}
固有の要件: ${d.req}
${DOC_RULES}
完了したら、主要な結論3点と対応表の件数を短く返答する。`, { label: `${d.id}-author`, phase: ph })
}
function reviewer(d, ph) {
  return agent(`${COMMON}
あなたの担当: ${d.path}（${d.id}）の独立レビューと修正（作成者ではない）。観点: (1) ADR・上流文書との整合（矛盾は本書側を修正、ADR側の誤りと考える場合は本書に「ADRへの指摘」として記載）。(2) 重要な主張が原典で支持されるか、規範の強度・版・状態が正確か。(3) 対応表の網羅。(4) 連携開発者がこの文書だけで何をすべきか分かるか、曖昧な「〜を検討する」を具体化。(5) 根拠のない数値、禁止表現、主張タグ欠落。${d.extraReview || ''}
ファイルを直接修正し、末尾に「レビュー記録」節を追加。完了したら修正件数と未解決事項を返答。`, { label: `${d.id}-review`, phase: ph })
}

const ARCH = [
  { path: '04_architecture/reference-architecture-v2.md', id: 'ARC-01', dl: 'DL-54', title: '参照アーキテクチャ v2', inputs: '全ADR、旧提案書（マルチテナントSaaS認証・認可基盤の比較調査と設計指針.md）、traceability/claims-ledger.md、02_requirements/principal-catalog.md、operation-risk-tiers-assurance.md',
    req: '構成要素（IdP/AS、STS/token exchange、Transaction Token service、BFF、API gateway、PEP SDK/sidecar、PDP、relationship store、model registry/PAP、PIP、SSF transmitter/receiver、鍵/KMS/HSM、監査パイプライン、SCIM、顧客IdP連携、管理コンソール、break-glass経路）を control/decision/data plane と cell/global に配置した全体図。主要フロー（ブラウザログインとAPI呼出し、ネイティブ、サービス間委任、非同期ジョブ、外部連携アプリ、AIエージェント、管理操作、剥奪伝播、鍵rotation）のシーケンス図。各構成要素の責務・担当ADR・DL・SLI・障害時挙動・依存Tierの表。旧提案からの変更点対照表。中核トポロジーの未決定を残さない（旧提案の「各リソースサービスまたは共通PDP」等を確定またはADR参照）。' },
  { path: '04_architecture/token-profile.md', id: 'ARC-02', dl: 'DL-16', title: 'OAuth/OIDC セキュリティ profile（token profile）', inputs: 'ADR-005, ADR-020, ADR-007, ADR-015, ADR-021, research/RS-04（RFC 9700 MUST/SHOULD 一覧）, RS-03, RS-13, RS-17',
    req: 'RFC 9700 全要件の採否・実装方法・逸脱理由の準拠表。token種別（ID token、外部access token、内部access token、refresh token、transaction token、DPoP proof、logout token、SET、SAML assertion）ごとの形式・typ・alg allowlist・iss/aud・寿命（操作階層とA-IDから導出、一律値禁止）・sender constraint・検証規則（種別間の相互排他、kid-issuer結合、clock skew）。クライアント種別ごとのgrant・認証方式。FAPI 2.0適用範囲（ADR-020）。DPoPの限界と併用策。JWT検証ライブラリの必須負例ベクタ。claimの詳細は claims-catalog.md（ARC-15、並行作成）に委ね整合させる。' },
  { path: '04_architecture/claims-catalog.md', id: 'ARC-15', dl: 'DL-115', title: 'claim 目録（token・Transaction Token・判定記録・監査の識別子体系）', inputs: 'ADR-005, ADR-009, ADR-014, ADR-016, ADR-017, ADR-021, research/RS-04, RS-06, RS-03, RS-10, RS-11, research/standards-status.md',
    req: 'ユーザー要望による追加文書。(1) 3層の識別子体系: access token（jti, sid）／Transaction Token（txn, rctx, tctx, purp。IETF draft の状態を standards-status で確認し依存リスクを明記）／認可判定記録（decision_id, policy/model revision, reason。claimではなくAuthZEN応答と監査イベント）と、W3C Trace Context の traceparent/trace_id を監査イベントで結合する方法。trace id を access token に入れない理由。「共通基盤を通った一貫したリクエスト」の証跡を改ざん検知可能に辿る仕組み（署名、ハッシュ連鎖、検証手順）。(2) claim 目録表: IANA JWT Claims Registry・OIDC・RFC 9068/8693/7800/9396/8707/9470・OpenID Connect for Identity Assurance（verified_claims）・Token Status List・Txn Token の各claimについて、意味、規格と状態、token種別ごとの採用区分（必須/条件付き/不採用）、理由、PII該当性、寿命中の変化可能性、サイズ影響、検証主体、関連ADR。独自claim（tid, ver 等）の命名規則と登録手順。(3) W3C Verifiable Credentials Data Model 2.0（issuer, validFrom/validUntil, credentialSubject, credentialStatus, evidence, termsOfUse, credentialSchema 等）と SD-JWT VC・OpenID4VP/VCI の状態を原典で確認し、OAuth/JWT claim との対応表、VCを入力（本人確認・B2B属性・資格）として受け入れる将来設計、受け入れない範囲。(4) 将来候補（purp、status、authorization_details、AIエージェント関連claim、PQC移行時のcnf/alg）の採用判断基準と再検討トリガー、claimを増やす害（万能JWT化、stale、PII、結合）を防ぐガードレール（追加審査の基準）。' },
  { path: '04_architecture/root-of-trust.md', id: 'ARC-03', dl: 'DL-14', title: 'root of trust・鍵管理設計と鍵 ceremony 手順', inputs: 'ADR-007, ADR-008, ADR-013, ADR-015, ADR-019, research/RS-05, RS-11, RS-12',
    req: '鍵階層図、鍵目録（用途・アルゴリズム・保管場所・cell/リージョン・寿命・rotation周期（根拠付き）・併存期間・所有者）、生成・保管・利用・rotation・失効・廃棄・DR手順、二者統制、JWKS配布とcache最大齢、鍵年齢監視、issuer-tenant-token種別のスコープ結合検証、管理面の信頼境界、付録に第三者立会い付きkey ceremony手順。' },
  { path: '04_architecture/workload-identity-delegation.md', id: 'ARC-04', dl: 'DL-55', title: 'workload ID・委任', inputs: 'ADR-009, ADR-017, ADR-026, ADR-005, ADR-013, research/RS-06, RS-04, RS-17',
    req: 'workload ID発行と検証（trust domain＝cell整合）、サービス間認証、利用者委任のtoken exchange profile（act chain上限、may_act、audience/resource縮小）、Transaction Token による取引文脈の伝播、非同期・長時間ジョブの委任、AIエージェントの委任とtool呼出し単位の認可、trust domain越え。confused deputy・token横流し対策の検証方法。' },
  { path: '04_architecture/authorization-model.md', id: 'ARC-05', dl: 'DL-17', title: '認可モデル・整合性・剥奪仕様', inputs: 'ADR-010, ADR-011, ADR-024, ADR-025, ADR-016, ADR-013, 02_requirements/operation-risk-tiers-assurance.md, research/RS-07, RS-17, RS-08',
    req: '共通型システム（基盤所有の core 型）とドメイン拡張規則（名前空間、命名、継承制約、深さ・fanout上限）、ReBACとABAC条件の合成、deny semantics、custom role、越境共有、一覧・検索。サンプルモデル（ファイル/フォルダ、組織/拠点、プロジェクト/ツール、医療記録、管理機能）。操作階層別の整合性モード、剥奪→拒否の最大時間の構成、コンテンツ更新とrelation更新の因果結合、model ID pin・shadow・段階展開。Zanzibar同等の保証は主張せず採用候補が実際に保証する範囲を明記。' },
  { path: '04_architecture/pep-contract.md', id: 'ARC-06', dl: 'DL-15', title: 'PEP 契約・coverage・storage guardrail 検証仕様', inputs: 'ADR-012, ADR-011, ADR-005, ADR-014, ADR-023, research/RS-08, RS-17',
    req: 'PEPの義務（token検証、tenant binding: token tid・route・resource-derived tenant の照合アルゴリズムと越境共有の例外、deny-by-default、PDP呼出し、decision_id付与、txn/trace_id伝播、監査送出、キャッシュ規則とキー構成、エラー応答）、SDKの最小API、配置パターン、coverage機械検証、DB RLS・object storage・検索インデックスのguardrail、bypass試験。' },
  { path: '04_architecture/cell-blast-radius.md', id: 'ARC-07', dl: 'DL-18', title: 'PDP topology・cell・blast radius 分析', inputs: 'ADR-013, ADR-007, ADR-010, ADR-023, ADR-028, 01_governance/business-impact-analysis.md, research/RS-09, RS-07',
    req: 'cell構成、global部品と最小化、static stability、shuffle sharding、policy store分割、quota、段階rollout・緊急freeze・既知良好版復帰、単一障害・単一侵害シナリオごとの影響テナント割合の見積り（A-ID根拠）とblast radius予算（事業が決めるTBD）との照合表、障害注入計画。' },
  { path: '04_architecture/fail-mode-matrix.md', id: 'ARC-08', dl: 'DL-19', title: '失敗モード表（fail-mode matrix）', inputs: 'ADR-013, ADR-006, ADR-014, ADR-023, 02_requirements/operation-risk-tiers-assurance.md, 01_governance/business-impact-analysis.md, research/RS-09',
    req: '操作5分類×障害種別（PDP timeout、PDP全断、replica遅延、store障害、IdP停止、AS停止、KMS停止、JWKS取得失敗、監査sink停止、SSF停止、cell間分断、リージョン障害）のマトリクス。各セルに挙動、キャッシュ最大齢、必要整合性、監査不能時挙動、代替経路、根拠、検証TC。一律fail-closedを置き換えた理由。経営判断が要るセルは決裁案。' },
  { path: '04_architecture/revocation-continuous-evaluation.md', id: 'ARC-09', dl: 'DL-56', title: '失効・継続評価', inputs: 'ADR-006, ADR-005, ADR-010, ADR-026, ADR-017, research/RS-04, RS-03, RS-07',
    req: '剥奪事象ごとの伝播経路とend-to-end最大時間の遅延予算分解、SSF/CAEP/RISCの送受信範囲、長時間接続・非HTTP・ネイティブ/CLI・AIエージェント・バッチへの伝播、測定方法（TC）。' },
  { path: '04_architecture/audit-privacy.md', id: 'ARC-10', dl: 'DL-25', title: '監査ログ設計・PIA', inputs: 'ADR-014, ADR-019, ADR-009, 04_architecture/claims-catalog.md（並行作成）, 06_controls/applicability.md, 02_requirements/data-classification.md, research/RS-10, RS-02',
    req: 'イベント分類と必須フィールド、trace_id・decision_id・txn・jti・sid の結合による一貫リクエスト証跡の再構成手順、100%記録対象、パイプライン（traceと独立）、欠損検知・backpressure・監査経路停止時挙動、WORMと改ざん検知、保持期間（法域・分類別）、所在地、アクセス統制、削除権との調停、顧客監査API、コスト見積り（A-ID）、PIA。' },
  { path: '04_architecture/data-outside-pep.md', id: 'ARC-11', dl: 'DL-57', title: 'PEP 外データの統制', inputs: 'ADR-012, ADR-025, ADR-014, ADR-028, 02_requirements/data-classification.md, research/RS-08, RS-17, RS-10',
    req: '検索インデックス、DWH/データレイク、ML学習・推論、エクスポート、バックアップ、ログ、キャッシュ、AIエージェントのコンテキストなどPEPを経由しない経路ごとに、持出し条件、ACL反映方式、テナント分離、削除伝播、監査、所在地。' },
  { path: '04_architecture/evolution-pqc.md', id: 'ARC-12', dl: 'DL-23', title: '進化・互換方針（versioning・crypto agility・deprecation）', inputs: 'ADR-015, ADR-016, ADR-018, ADR-021, ADR-022, 01_governance/durability-charter-20y.md, research/RS-11, RS-16',
    req: '20年耐久性憲章の7性質を技術的に実現する仕組み: versioning、version negotiation、dual-run、schema migration、crypto agility（PQC移行計画と期限、サイズ影響）、deprecation SLA、組織再編・M&A・所在地規制・非人間ID増加への互換性、劣化の自動検知（CIで検査するアーキテクチャ性質）、演習計画。' },
  { path: '04_architecture/capacity-model.md', id: 'ARC-13', dl: 'DL-58', title: '容量モデル', inputs: '01_governance/assumptions-register.md, ADR-010, ADR-013, ADR-001, ADR-005, ADR-014, research/RS-07, RS-15',
    req: '前提台帳のトラフィックとデータ量を構成要素別のピーク負荷・設計容量（不確実性・成長・冗長係数）・cell当たり負荷・ストレージ量・5年後に展開し、公開性能値（原典と測定条件付き）との比較の限界を明記。PoCの負荷条件と外挿方法。TCOへの入力値。全数値に導出式とA-ID。' },
  { path: '04_architecture/product-evaluation-exit.md', id: 'ARC-14', dl: 'DL-13', title: '製品選定評価・出口戦略', inputs: 'ADR-001, ADR-010, ADR-018, ADR-022, research/RS-15, RS-07, RS-03',
    req: 'IdP/AS候補と認可エンジン候補をレビューの13評価軸＋意味論で評価する表（公式情報の [V] とPoCで確認する項目の区別）。最終選定はGate 3/PoC後。依存回避策、データ移出演習の計画。' },
]

const CONTRACT_RULES = `契約ファイルの要件: 機械可読で妥当であること。OpenAPI 3.1.0、JSON Schema 2020-12。作成後に検証: JSON は "python -m json.tool <file>"、OpenAPI は "npx --yes @redocly/cli@latest lint <file>"（エラー0、警告は理由を記録）。メタ情報は deliverables.md §2.3（OpenAPI は info.version と info.x-document-id/x-status/x-depends-on、JSON Schema は $id と $comment）。準拠標準（AuthZEN 1.0、RFC 9068、RFC 8693、SCIM、SSF/CAEP）の版・状態は research/standards-status.md に従い、標準の項目名・意味を変えない。拡張は x- 接頭辞または明示した拡張に限定。example（正例）と負例の説明を含める。R/G は x-requirements（OpenAPI）または $comment（JSON Schema）に列挙。`

const CONTRACTS = [
  { path: '11_contracts/schemas/common.schema.json', id: 'CON-02', dl: 'DL-71', title: '共通スキーマ', inputs: 'ADR-021, ADR-022, ADR-011, ADR-009, 04_architecture/reference-architecture-v2.md, authorization-model.md, claims-catalog.md',
    req: '主体ID・テナントID・リソース型/ID・action名の形式（ADR-021）、tenant context、decision_id、txn、trace参照、model/policy revision、consistency token、エラー形式（RFC 9457 の採否）、版情報。' },
  { path: '11_contracts/authorization-api.openapi.yaml', id: 'CON-03', dl: 'DL-72', title: 'Authorization API（AuthZEN 準拠）', inputs: 'ADR-011, ADR-010, ADR-025, 04_architecture/authorization-model.md, pep-contract.md, research/RS-07, 11_contracts/schemas/common.schema.json（並行作成中、存在すれば参照）',
    req: 'AuthZEN Authorization API 1.0 の evaluation・evaluations と search 系の扱い（1.0 に含まれるかを standards-status と RS-07 で確認し、含まれない場合は拡張として明示）。拡張: decision_id、model/policy revision、consistency指定、理由コード、obligation、txn。認証、テナント境界、レート制限、エラー。' },
  { path: '11_contracts/relationship-model-registry.openapi.yaml', id: 'CON-04', dl: 'DL-73', title: 'Relationship/Model Registry API', inputs: 'ADR-010, ADR-011, ADR-016, ADR-018, ADR-027, 04_architecture/authorization-model.md, research/RS-07',
    req: 'tuple の書込み・削除・読取り（条件付き書込み、consistency token返却）、bulk import/export、model の登録・検証・pin・shadow比較・段階展開・rollback、ドメイン名前空間の所有と審査ステータス。' },
  { path: '11_contracts/token-exchange.openapi.yaml', id: 'CON-05', dl: 'DL-74', title: 'Token Exchange API', inputs: 'ADR-009, ADR-005, ADR-026, ADR-017, 04_architecture/workload-identity-delegation.md, token-profile.md, claims-catalog.md, research/RS-04, RS-06',
    req: 'RFC 8693 準拠 profile: subject_token/actor_token種別、audience/resource（RFC 8707）、scope縮小、act chain上限、may_act、client認証、エラー、issued_token_type。Transaction Token の発行を同APIで扱うかはADR-009に従う。' },
  { path: '11_contracts/schemas/access-token-claims.schema.json', id: 'CON-06', dl: 'DL-75', title: 'Access token claims スキーマ', inputs: 'ADR-005, ADR-021, ADR-015, 04_architecture/token-profile.md, claims-catalog.md, research/RS-04',
    req: 'claims-catalog.md の採用区分に従い、RFC 9068 の必須claimと追加claim（tid, scope, cnf, act, auth_time, acr, amr, sid, ver 等）、typ、内部/外部の差を定義。Transaction Token のclaimを別定義（$defs）として含める。' },
  { path: '11_contracts/scim.openapi.yaml', id: 'CON-07', dl: 'DL-76', title: 'SCIM API profile', inputs: 'ADR-004, 02_requirements/identity-lifecycle.md, customer-admin-responsibility.md, research/RS-03, RS-14',
    req: 'SCIM 2.0（RFC 7643/7644）の User/Group と拡張属性、テナントスコープ、JIT衝突解決、deprovision、ETag、filter制限、認証、レート制限。' },
  { path: '11_contracts/schemas/audit-event.schema.json', id: 'CON-08', dl: 'DL-77', title: '監査イベントスキーマ', inputs: 'ADR-014, ADR-009, 04_architecture/audit-privacy.md, claims-catalog.md, research/RS-10',
    req: 'decision event・管理操作・認証イベントの共通フィールドと型別フィールド（decision_id、trace_id、txn、jti、sid、actor chain、subject/resource/action、tenant、policy/model revision、理由、データ分類、cell、時刻精度、ハッシュ連鎖用フィールド）、最小化方針、OCSF等との対応。' },
  { path: '11_contracts/ssf-caep.openapi.yaml', id: 'CON-09', dl: 'DL-78', title: 'SSF/CAEP stream API profile', inputs: 'ADR-006, 04_architecture/revocation-continuous-evaluation.md, research/RS-04, RS-03',
    req: 'SSF 1.0 の stream 設定・push/poll 配送・検証エンドポイントのうち本基盤が送受信する範囲の profile、受信者認証、配送保証、再送。' },
  { path: '11_contracts/schemas/ssf-caep-set.schema.json', id: 'CON-10', dl: 'DL-79', title: 'SSF/CAEP イベント（SET）スキーマ', inputs: 'ADR-006, 04_architecture/revocation-continuous-evaluation.md, research/RS-04, RS-03',
    req: 'CAEP session-revoked、credential-change、token-claims-change、assurance-level-change 等と RISC イベントの SET payload profile（RISC sessions-revoked は非推奨）、受信義務の範囲、独自イベントの命名。' },
]

const OPS = [
  { path: '03_threat-model/dfd-entry-points.md', id: 'THR-01', dl: 'DL-10', title: 'DFD・entry point inventory', inputs: '04_architecture/ 全文書, 03_threat-model/threat-catalog.md, ADR-012, research/RS-08',
    req: 'レベル0/1 DFDと信頼境界、全entry point類型（HTTP/gRPC/GraphQL/webhook/queue/batch/管理面/export/support tool/ETL/DB直/緊急経路/AIエージェントtool）の一覧と各PEP。threat-catalog の「DFDで再確認を要する脅威」を照合し追加脅威を本書に列挙。entry point の機械抽出と差分0の受入条件。' },
  { path: '06_controls/control-mapping-ledger.md', id: 'CTL-01', dl: 'DL-28', title: '統制マッピング台帳（本体）', inputs: 'traceability/seed/seed-01-ciso-assurance.md §4, traceability/R-requirements.md 全件, 03_threat-model/threat-catalog.md, 05_adr/, 04_architecture/, research/RS-01, RS-02, RS-08, 06_controls/applicability.md',
    req: '社内統制 C-001〜 のカタログと、R-ID→C-ID の多対多対応（全Rに統制または閉じ方）、C-ID→試験→証跡。外部枠組みの詳細は 06_controls/mappings/ 配下（並行作成）に委ね、本書は列定義と C-ID の正本、健全性ルール（孤児R/孤児C/統制なし適用要件=0）の検査結果を持つ。' },
  { path: '06_controls/mappings/nist-csf-iso27001.md', id: 'CTL-03', dl: 'DL-28', title: '統制マッピング: NIST CSF 2.0 / ISO/IEC 27001:2022', inputs: 'research/RS-01, RS-08, 06_controls/applicability.md, 05_adr/, 04_architecture/',
    req: 'CSF 2.0 subcategory と ISO 27001:2022 Annex A のうち関係するものを、設計要素（ADR/ARC）と統制（C-ID未採番なら設計要素で記述）へ対応付け、関係（等価/部分集合/上位集合/交差）を示す。' },
  { path: '06_controls/mappings/identity-appsec.md', id: 'CTL-04', dl: 'DL-28', title: '統制マッピング: SP 800-63-4 / ASVS 5.0 / API Top 10 / RFC 9700 / FAPI 2.0', inputs: 'research/RS-03, RS-04, RS-08, 04_architecture/token-profile.md, 02_requirements/operation-risk-tiers-assurance.md, 05_adr/',
    req: '800-63B-4 のSHALL要件、ASVS 5.0 関連要件ID、API Top 10 2023、RFC 9700、FAPI 2.0 の要件ごとに、満たす設計要素・検証方法・状態。' },
  { path: '06_controls/mappings/cloud-supplychain.md', id: 'CTL-05', dl: 'DL-28', title: '統制マッピング: CSA CCM / SSDF / SLSA / SOC 2 TSC', inputs: 'research/RS-01, RS-05, RS-14, RS-16, 05_adr/ADR-008, 04_architecture/root-of-trust.md',
    req: 'CCM（IAM・LOG・CEK等）、SSDF、SLSA 1.2、SOC 2 TSC の関連基準に対する設計要素・検証方法・状態。' },
  { path: '06_controls/mappings/regulations.md', id: 'CTL-06', dl: 'DL-28', title: '統制マッピング: 日本・EU/英国・米国・業界規制', inputs: '06_controls/applicability.md, research/RS-02, RS-10, 04_architecture/audit-privacy.md',
    req: 'applicability.md で適用・条件付きとした法令・規制の具体要件（条・項番号）ごとに、満たす設計要素・運用・証跡・状態（法務確認要否）。' },
  { path: '07_slo/numeric-contracts.md', id: 'SLO-01', dl: 'DL-20', title: '数値契約台帳（SLI/SLO）', inputs: '01_governance/business-impact-analysis.md, assumptions-register.md, 04_architecture/capacity-model.md, fail-mode-matrix.md, revocation-continuous-evaluation.md, R-requirements.md の数値契約行, research/RS-09',
    req: 'レビューの数値契約8分類の全指標を SLI-001〜 として定義し、各指標に定義と測定方法、導出の鎖、候補値（根拠があるもののみ）、状態、決める人、検証TC。根拠のない値は TBD。plane別・cell別のSLO構成とerror budget方針。' },
  { path: '08_operations/compromise-runbooks.md', id: 'OPS-01', dl: 'DL-24', title: '侵害別 runbook・演習計画', inputs: 'ADR-019, ADR-006, ADR-007, ADR-029, 04_architecture/root-of-trust.md, 06_controls/applicability.md, 03_threat-model/incident-casebook.md, research/RS-12, RS-05',
    req: 'RB-01〜（署名鍵漏えい、token大量窃取、IdP侵害、顧客IdP侵害、PDP/policy改ざん、誤policy配布によるglobal allow、監査基盤停止・改ざん、CI/CD侵害、support経路悪用、第三者連携アプリ侵害、AIエージェント濫用、テナント越境漏えい発覚）ごとに検知・初動・封じ込め・復旧・証拠保全・通知判断（法域別期限）・事後レビュー。演習計画。' },
  { path: '08_operations/operating-model.md', id: 'OPS-02', dl: 'DL-27', title: '運用・要員モデル', inputs: '01_governance/raci-governance.md, ADR-022, ADR-023, research/RS-15, RS-16',
    req: 'プラットフォーム・ドメイン・security・SREの責任分界とチーム構成、24/365 on-call、必要FTEの幅（根拠付き、A-ID）、採用・教育、bus factor指標、変更承認、連携開発チーム向けサポート体制（問い合わせSLA、office hours、例外申請）、要員確保できない場合のゲート条件（Plan B）。' },
  { path: '08_operations/tco-vendor-lts.md', id: 'OPS-03', dl: 'DL-33', title: 'TCO・vendor support・LTS 評価', inputs: '04_architecture/capacity-model.md, product-evaluation-exit.md, 08_operations/operating-model.md（並行作成）, ADR-001, ADR-010, research/RS-15',
    req: '費目別TCOを幅（低/中/高）で示し、公式料金表（[V]、確認日）とA-IDから式で算出。全サービス同時SLA違反・全顧客一斉通知時の財務影響の試算枠。1000億円規模の全体予算に対する比率の考え方（前提明記）。vendor support・LTS・価格変動リスク。' },
  { path: '08_operations/phased-rollout.md', id: 'OPS-04', dl: 'DL-31', title: '段階導入計画', inputs: 'ADR-027, ADR-016, ADR-013, 02_requirements/as-is-inventory.md, research/RS-16',
    req: 'dual-run・shadow・差分記録、導入順序、各段階の合格基準と自動rollback条件、パイロットサービス選定基準、顧客側作業と告知、移行期間中の併存運用。' },
  { path: '09_assurance/independent-assurance-plan.md', id: 'ASR-01', dl: 'DL-07', title: '独立保証計画', inputs: 'research/RS-01, 01_governance/raci-governance.md',
    req: '評価者の独立性要件、評価範囲、Gate 2/4/5での関与と立会い、Critical/Highの扱い、結果の決裁への反映。本リポジトリ内の模擬パネルは独立保証に当たらないことを明記。' },
  { path: '09_assurance/pentest-redteam-plan.md', id: 'ASR-02', dl: 'DL-59', title: 'pentest・red team 計画', inputs: '03_threat-model/attacker-model.md, threat-catalog.md, ADR-029, research/RS-12, RS-13',
    req: 'cross-tenant pentest と SE含むred teamの範囲、ATK-ID対応の攻撃シナリオ、交戦規則、成果物、再試験条件、Critical/High closure証跡。' },
  { path: '09_assurance/oidf-conformance-plan.md', id: 'ASR-03', dl: 'DL-60', title: 'OIDF conformance 計画', inputs: 'ADR-020, ADR-005, 04_architecture/token-profile.md, research/RS-04',
    req: 'OIDF conformance suite の自前実行計画（対象 profile、構成、合否、ログ保存）と認定取得の条件・時期、PoCでの実行可否。' },
  { path: '09_assurance/self-assessments.md', id: 'ASR-04', dl: 'DL-61', title: '自己評価（ASVS 5.0・API Top 10・SLSA 1.2）', inputs: 'research/RS-08, RS-05',
    req: '自己評価計画と結果記録様式。第三者評価ではないことを明記。' },
  { path: '09_assurance/rfp-sow.md', id: 'ASR-05', dl: 'DL-30', title: '独立評価 RFP/SOW 群', inputs: 'research/RS-01, 03_threat-model/attacker-model.md',
    req: '外部アーキテクチャレビュー、cross-tenant pentest、red team、クラウド設定レビュー、供給網レビュー、OIDF認定、独立反証レビューのRFP/SOW（独立性要件、利益相反申告、範囲、手法、成果物形式、再試験、期間・体制の目安）。' },
  { path: '09_assurance/continuous-assurance-plan.md', id: 'ASR-06', dl: 'DL-32', title: '継続保証計画', inputs: '01_governance/kri.md, durability-charter-20y.md, research/RS-01, RS-05',
    req: '本番後の四半期KRI、年次独立評価、定期red team、各種演習の周期、脆弱性根本原因の反映（SSDF RV.3）、3〜5年ごとの再決裁との接続。' },
  { path: '12_poc/preregistered-test-plan.md', id: 'POC-01', dl: 'DL-22', title: '高保証 PoC 試験計画（事前登録）', inputs: '全ADRの「検証」節, 04_architecture/capacity-model.md, fail-mode-matrix.md, revocation-continuous-evaluation.md, claims-catalog.md, 03_threat-model/threat-catalog.md, R-requirements.md の区分C',
    req: 'TC-001〜: 仮説、手順、攻撃・障害注入、測定点、合否基準、中止基準、生データ保存方式、関連R/T/ADR。2系統: (1) 本リポジトリ内の小規模PoC（Node 22・Python 3.14、OpenFGA v1.21.0 単体バイナリ（12_poc/tools/openfga/openfga.exe）、Cedar wasm、node-oidc-provider、Docker不使用）で実行可能なもの（cross-tenant property test、audience取り違え、issuer mix-up、JWT負例、stale allow継続時間、PDP障害縮退、model migration differential、AuthZEN adapterによる2エンジン差替え、鍵緊急rotation、txn/decision_id/trace_id による一貫リクエスト証跡の再構成、小規模負荷p99）と (2) Gate 4 本番相当環境が必要なもの。事前登録の凍結手順と凍結前の実測を合否に使わない規則。' },
]

const INTEG = [
  { path: '11_contracts/README.md', id: 'CON-00', dl: 'DL-69', title: '契約一覧・規約', inputs: '11_contracts/ の全ファイル, ADR-022, ADR-016',
    req: '全契約の一覧（パス、版、状態、準拠標準と範囲、lint結果）、命名・版付け規約、変更提案手順、凍結（DEC-8）の範囲と凍結しないもの。' },
  { path: '11_contracts/compatibility-deprecation-policy.md', id: 'CON-01', dl: 'DL-70', title: '互換性・非推奨ポリシー（SLA）', inputs: 'ADR-016, ADR-022, research/RS-16',
    req: '互換性区分の判定規則、版の併存期間、非推奨告知から廃止までの最短期間（根拠付き）、Sunset/Deprecation header、未移行consumerの計測と扱い、例外承認、緊急セキュリティ変更。' },
  { path: '11_contracts/mock-contract-test-kit.md', id: 'CON-11', dl: 'DL-80', title: 'モック・契約試験キット仕様', inputs: '11_contracts/ の全契約, 04_architecture/pep-contract.md, token-profile.md, claims-catalog.md, research/RS-16',
    req: '各契約のモックサーバ（開発用IdP/AS、PDP、SSF transmitter、SCIM）の振る舞い仕様、sandboxテナント、consumer-driven contract test、負例ベクタ、CI組込み、合格判定、基盤側でのcontract test。12_poc/code でモックを実装する前提の起動仕様。' },
  { path: '10_integration/dependency-tiers.md', id: 'INT-01', dl: 'DL-63', title: '依存階層', inputs: 'ADR-023, ADR-013, 04_architecture/fail-mode-matrix.md, cell-blast-radius.md',
    req: 'Tier分類規則、各Tierの依存可能範囲、静的安定性要件、基盤障害時の挙動、依存してはならないもの、サービス側の必須実装、Tier判定チェックリスト。' },
  { path: '10_integration/integration-patterns.md', id: 'INT-02', dl: 'DL-64', title: '連携パターン集', inputs: '11_contracts/ 全契約, 04_architecture/ 全文書, ADR全件, research/RS-17, RS-06, G-goal-criteria.md（G-135 のサービス種別27種）',
    req: 'G-135 が固定した全サービス種別（27種）と deliverables §6.3 の P-01〜P-17 を網羅する P-01〜。各パターン: 適用条件、シーケンス図、token・grant・委任、呼び出す契約API（パスと操作ID）、PEP配置、認可モデル例、整合性モード、キャッシュ規則、失敗時挙動、監査イベント（txn/decision_id/trace_id の扱い）、必須の契約試験・負例、アンチパターン、チェックリスト。冒頭に自サービスのパターンを選ぶ決定表。' },
  { path: '10_integration/authz-modeling-guide.md', id: 'INT-03', dl: 'DL-65', title: '認可モデリングガイド', inputs: '04_architecture/authorization-model.md, ADR-010, ADR-011, ADR-016, ADR-024, ADR-025, 11_contracts/relationship-model-registry.openapi.yaml, research/RS-17, RS-07',
    req: 'resource type・relation・permission・ABAC条件の設計手順、命名・名前空間規約、巨大ロール表を避ける指針、custom role、越境共有と一覧検索の表現、性能制約、モデル変更レビュー（ドメイン所有＋中央ガードレール自動検査）とshadow・段階展開、誤りと修正例、ドメイン別の完全な例（ファイル共有、組織・拠点・ツール、プロジェクト管理、医療記録、金融取引承認、管理コンソール）。' },
  { path: '10_integration/onboarding.md', id: 'INT-04', dl: 'DL-66', title: 'オンボーディング手順', inputs: '10_integration/ 他文書, 11_contracts/, ADR-022, ADR-027, 08_operations/operating-model.md, research/RS-16',
    req: '参加段階ごとの成果物・承認者・リードタイム目標（根拠付きかTBD）・費用配賦。基盤本番より先に本番を迎えるサービスの暫定方式。並行開発のマイルストーン例。' },
  { path: '10_integration/definition-of-ready.md', id: 'INT-05', dl: 'DL-67', title: 'Definition of Ready', inputs: '10_integration/ 他文書, 02_requirements/operation-risk-tiers-assurance.md, 03_threat-model/dfd-entry-points.md',
    req: '連携開始前の条件チェックリストと未充足時の扱い、Definition of Done（本番切替条件）。' },
  { path: '10_integration/developer-faq.md', id: 'INT-06', dl: 'DL-68', title: '開発者 FAQ', inputs: '10_integration/ 他文書, 11_contracts/, 04_architecture/',
    req: 'token、テナントcontext、キャッシュ、非同期、エラー、ローカル開発とモック、権限追加、越境共有、検索、AIエージェント、レガシー、性能、障害時、例外申請、trace id と txn の違いなど40問以上。各回答に根拠文書リンク。' },
  { path: '10_integration/README.md', id: 'INT-00', dl: 'DL-62', title: '連携ハンドブック総覧', inputs: '10_integration/ 全文書, 11_contracts/README.md',
    req: '読む順番、依存してよい契約と依存してはならない実装、1ページの全体像（基盤が提供するもの/サービスが実装するもの）、並行開発の始め方（初日にすること、モック起動、契約試験）、問い合わせ・例外申請経路、用語集。' },
]

await pipeline(ARCH, d => author(d, 'Architecture'), (_, d) => reviewer(d, 'Architecture'))
phase('Arch reconcile')
await agent(`${COMMON}
あなたの担当: 04_architecture/ の15文書の整合調整。reference-architecture-v2.md と詳細文書を全て読み、構成要素名・責務・数値（A-ID）・ADR参照・用語・claim名の不一致を列挙し、該当文書を直接修正（ADRは編集しない。ADRとの矛盾は 04_architecture/architecture-reconciliation-notes.md に記録）。修正一覧も同ファイルに。完了したら検出数・修正数を返答。`, { label: 'arch-reconcile', phase: 'Arch reconcile' })

phase('Contracts & ops')
await parallel([
  () => pipeline(CONTRACTS,
    d => agent(`${COMMON}\nあなたの担当: ${d.path}（${d.id}、${d.dl}）「${d.title}」。\n必読: ${d.inputs}\n固有の要件: ${d.req}\n${CONTRACT_RULES}\n完了したら検証コマンドの結果（エラー数・警告数）を返答。`, { label: `${d.id}-author`, phase: 'Contracts & ops' }),
    (_, d) => agent(`${COMMON}\nあなたの担当: ${d.path}（${d.id}）の独立レビュー（作成者ではない）。観点: 準拠標準の項目名・必須性・意味を正しく写しているか（原典か research で確認）、ADRと04_architectureとの整合、機械検証（JSON: python -m json.tool、OpenAPI: npx --yes @redocly/cli@latest lint）でエラー0、example と負例の妥当性、モック生成・コード生成に使えるか。ファイルを直接修正し 11_contracts/review-notes/${d.id}.md にレビュー記録。完了したら修正件数と検証結果を返答。`, { label: `${d.id}-review`, phase: 'Contracts & ops' })),
  () => parallel(OPS.map(d => () => author(d, 'Contracts & ops'))),
])

phase('Integration')
const order1 = INTEG.filter(d => ['CON-00', 'CON-01', 'CON-11', 'INT-01', 'INT-02', 'INT-03'].includes(d.id))
const order2 = INTEG.filter(d => ['INT-04', 'INT-05', 'INT-06'].includes(d.id))
const order3 = INTEG.filter(d => d.id === 'INT-00')
await pipeline(order1, d => author(d, 'Integration'), (_, d) => reviewer(Object.assign({}, d, { extraReview: ' (6) 連携開発者の立場で「この文書と契約だけで、基盤の完成を待たずに自サービスの開発・試験を始められるか」を判定し、足りない情報を補う。' }), 'Integration'))
await pipeline(order2, d => author(d, 'Integration'))
await pipeline(order3, d => author(d, 'Integration'))
return 'done'
