export const meta = {
  name: 'phase3b-remaining-adrs',
  description: 'Phase3 Wave B: 残りADR21本の起草と独立レビュー、ADR索引と棄却仮説ログの集約',
  phases: [
    { title: 'Author', detail: 'ADRの起草（主要ADRとWave A文書を前提に）' },
    { title: 'Review', detail: '独立レビューと修正（整合・引用・要求網羅）' },
    { title: 'Index', detail: 'ADR索引・棄却仮説ログ' },
  ],
}

const ROOT = 'E:\\Github\\auth-stack'
const COMMON = `作業ディレクトリは ${ROOT} 。背景: 汎用の共通認証・認可基盤の再提案プログラム（旧提案はCTO/CISOレビューで本番不承認）。規模は1000億円規模システム・利用者100万人・約1万テナント・約300マイクロサービス・20〜30開発チーム/ベンダー、法域は日本・EU/英国・米国・業界規制、計画期間20年、汎用・仮置き前提。必読: CONVENTIONS.md（主張タグ [N][V][I][M][D][A-xxx]、引用形式、禁止表現、閉じ方区分、ID体系）、traceability/deliverables.md（ファイル名・文書ID・DLの正本、§5 ADR一覧）。決定済みの主要ADR（必ず整合させる）: 05_adr/ADR-001, ADR-005, ADR-007, ADR-010, ADR-011, ADR-013, ADR-021, ADR-022 と 05_adr/reconciliation-notes.md。Wave Aの文書: 01_governance/, 02_requirements/（操作5分類の正本 operation-risk-tiers-assurance.md、principal-catalog.md、identity-lifecycle.md）, 03_threat-model/（attacker-model.md の ATK-ID、threat-catalog.md の T-ID、incident-casebook.md）, 06_controls/applicability.md。台帳: traceability/R-requirements.md、traceability/G-goal-criteria.md、01_governance/assumptions-register.md、traceability/claims-ledger.md、traceability/dissent-log.md。調査: research/RS-01〜RS-17（独立検証済み）と research/standards-status.md（版・状態の正本）。根拠は research で検証済みの原典を脚注で引き「RS-xx#n」併記。research にない事実は自分で原典を取得して確認（ToolSearch で "select:WebFetch,WebSearch"）。二次情報は根拠にしない。仮定は A-ID、前提台帳にない仮定は「新規仮定（前提台帳へ追加要）」と明記。禁止表現を使わない。指示されたファイル以外は作成・編集しない（多数のエージェントが並行作業中）。`

const ADR_TEMPLATE = `ADRの構成（この順で）:
# ADR-0xx <タイトル>
メタ情報ブロック（文書ID ADR-0xx、版0.1、状態 proposed（決裁前）、可逆性 可逆/不可逆、DEC-3対象 はい/いいえ、対応要求、依存文書）
## 1. 文脈（問題、制約、前提A-ID、関連R/G、関連研究RS-xx#n、関連脅威T-ID/攻撃者ATK-ID）
## 2. 決定（決定文を箇条で。各文に主張タグ）
## 3. 検討した選択肢（各案: 概要、利点、欠点、主要リスク、費用・要員の桁と根拠、可逆性、どの条件ならこの案が勝つか。最低3案）
## 4. 評価（評価軸と比較表）
## 5. 決定理由と棄却理由（棄却案ごと）
## 6. 帰結（良い/悪い帰結、残余リスクと受容者案、依存サービス・連携開発者への影響、運用・要員への影響）
## 7. 検証（PoC仮説とTC案、合否基準（A-IDやBIAに紐付けるかTBD）、第三者評価で確かめること）
## 8. 再検討トリガーと見直し時期
## 9. 依存関係（他ADR・設計文書・契約）
## 対応表（R/G。R-requirements.md と G-goal-criteria.md から、対応成果物欄にこのADRのファイル名・ADR-ID・DL-12を含む行、および内容上関係する行を Grep で抽出し、全てに本文の節で応えるか、閉じ方と残課題を明記）
## 参考文献`

const ADRS = [
  { id: 'ADR-002', file: '05_adr/ADR-002-assurance-levels-by-tier.md', rs: 'RS-03, RS-13, RS-02', q: '主体種別×操作リスク階層ごとのIAL/AAL/FALの割当方針（operation-risk-tiers-assurance.md の決裁案を設計判断として確定）、フィッシング耐性認証器を必須とする範囲、同期passkeyの受入範囲（800-63B-4の規範）、顧客企業IdP経由の認証強度（acr/amr）の受入れと不足時のstep-up、規制（PCI DSS 8.4、FISC、医療GL等）による上乗せ。' },
  { id: 'ADR-003', file: '05_adr/ADR-003-account-recovery-authenticators.md', rs: 'RS-03, RS-13, RS-12', q: 'アカウント回復と認証器ライフサイクル: 回復要素（800-63B-4のAAL2回復要件）、helpdesk経由回復の高保証化（Scattered Spider/MGMの教訓）、回復後の待機・通知・権限制限、管理者回復の二者承認、認証器追加・削除時の再認証と通知、passkey紛失時、顧客企業ユーザーの回復を顧客IdP側に委ねる境界。' },
  { id: 'ADR-004', file: '05_adr/ADR-004-b2b-federation-linking-scim.md', rs: 'RS-03, RS-14, RS-12, RS-04', q: 'B2B federation（home realm discovery、RP起点限定とIdP起点SAMLの扱い、テナント別IdP設定、IdP署名鍵更新、顧客IdP停止・侵害時の切離し、OpenID Federationの採否）、不変識別子によるaccount linking（iss+sub限定、email再利用・nOAuth対策）、domain verification と失効時再検証、SCIMとJITの衝突解決とdeprovision反映、複数所属。' },
  { id: 'ADR-006', file: '05_adr/ADR-006-revocation-continuous-evaluation.md', rs: 'RS-04, RS-03, RS-17, RS-07, RS-09', q: '権限剥奪・テナント停止・session失効・資格情報侵害・鍵失効の伝播方式（短命token、introspection、RFC 7009、SSF/CAEP/RISC、relationship変更のconsistency token、push invalidation）、送受信義務の範囲（内部RS、外部連携アプリ）、長時間接続・ネイティブ/CLI・AIエージェント・バッチへの伝播、操作階層別の剥奪SLOの分解方法（数値はTBDかA-ID）。' },
  { id: 'ADR-008', file: '05_adr/ADR-008-control-plane-cicd-protection.md', rs: 'RS-05, RS-12, RS-16, RS-09', q: '管理面（AS設定、PAP/model registry、KMS、テナント配置、break-glass）の保護: 二者承認、JIT、特権アクセス端末、自社IdPで自社IdP管理者を認証する循環依存の断ち方、非本番と本番の信頼分離（Midnight Blizzard教訓）。CI/CD: SLSAの目標レベル、policy bundle/model/設定の署名と検証、policyリポジトリの二者レビュー、設定配布の段階展開（CrowdStrike教訓）。' },
  { id: 'ADR-009', file: '05_adr/ADR-009-workload-identity-token-exchange.md', rs: 'RS-06, RS-04, RS-17, RS-05, RS-10', q: 'workload identity方式（SPIFFE/SPIRE、クラウドworkload identity federation、混在）とtrust domain単位（ADR-013のcellと整合）、サービス間の利用者委任（RFC 8693 token exchange、act chain上限、may_act、resource indicator）、共有client secretの廃止、M2M（client credentials＋private_key_jwt/mTLS）。内部contextを自作せずTransaction Tokens（IETF draft）に寄せるかの判断とdraft依存のリスク管理。外部リクエスト1件ごとの取引識別子 txn と rctx・tctx・purp を呼出しチェーン全体で引き継ぎ「共通基盤を通った一貫したリクエスト」の証跡とする方式。access token に trace id を入れない理由、W3C traceparent・decision_id・jti との監査上の結合（ADR-014と整合）。詳細なclaim目録は 04_architecture/claims-catalog.md（Wave Cで作成）に委ねる。' },
  { id: 'ADR-012', file: '05_adr/ADR-012-pep-coverage-storage-guardrails.md', rs: 'RS-08, RS-17, RS-07', q: 'PEPの配置（gateway/サービス内SDK/sidecar）とdeny-by-default、全entry pointの機械的棚卸し（IDL静的抽出×実行時トレース突合）、enforcement coverageのCI自動検証（静的ルール、decision_id実行時検査）、DB RLSとobject storage・検索インデックス・キャッシュのtenant guardrail（二重防御）、非同期経路の再認可、bypass試験。' },
  { id: 'ADR-014', file: '05_adr/ADR-014-audit-data.md', rs: 'RS-10, RS-02, RS-07, RS-12', q: '監査データモデル（decision event・管理操作・認証event、OCSF等の採否）、traceとの分離と100%記録対象、W3C trace_id・decision_id・txn（Transaction Token）・jti・sid の結合による一貫リクエスト証跡、欠損検知とbackpressure、監査経路停止時の挙動（操作階層別）、WORMと改ざん検知、保持期間・所在地、WORMと削除権の調停（仮名化・crypto-shredding）、顧客向け監査API、コスト（前提台帳のA-ID）。' },
  { id: 'ADR-015', file: '05_adr/ADR-015-crypto-agility-pqc.md', rs: 'RS-11, RS-05, RS-04', q: 'alg識別子と版付きprofile、複数alg併存JWKS、hybrid/composite署名の採否、PQC移行の順序（TLS鍵交換、長寿命root、token署名、SAML、監査署名）と期限（NIST IR 8547等の状態を正確に）、署名サイズとtoken/header/cookie上限への影響、CBOM、利用側無改修でalgを切り替える演習。' },
  { id: 'ADR-016', file: '05_adr/ADR-016-versioning-deprecation.md', rs: 'RS-16, RS-11, RS-07, RS-04', q: 'policy/model/schema/token claims/audit/契約APIのversioning、後方互換の定義、version negotiation、併存期間と非推奨告知から廃止までの最短期間（Sunset/Deprecation header等）、未移行consumerの計測と扱い、model ID pin・shadow・段階展開、例外承認。claimの追加・廃止の審査手続（将来候補: purp、status、authorization_details、VC受入れ）と見直しトリガー。' },
  { id: 'ADR-017', file: '05_adr/ADR-017-non-human-ai-agent-identity.md', rs: 'RS-06, RS-17, RS-13, RS-04', q: '非人間ID（service account、workload、外部連携アプリ、AIエージェント、バッチ）の主体モデル、AIエージェントを独立主体とするか利用者委任＋actで表すか、tool呼出し単位の認可、人による確認（step-up/承認）、MCP認可仕様への対応、prompt injection経由の権限濫用の封じ込め、エージェントの寿命と棚卸し。' },
  { id: 'ADR-018', file: '05_adr/ADR-018-exit-strategy.md', rs: 'RS-15, RS-07, RS-03, RS-11', q: '製品・クラウドからの出口: ユーザー（password hash、passkeyのRP ID）・tuple・policy・監査ログのexport形式、DSL間変換、dual-runでの移行、契約条項（データ返還・移行支援）、出口演習の頻度、撤退期間と費用の見積り方法。ADR-001/010/021/022と整合。' },
  { id: 'ADR-019', file: '05_adr/ADR-019-compromise-response.md', rs: 'RS-12, RS-05, RS-09, RS-02', q: '侵害時対応の設計原則: kill switch（対象・粒度・権限者）、全session失効の方式と所要時間、署名鍵緊急切替、PDP隔離、顧客IdP切離し、証拠保全、顧客・当局通知（法域別期限は applicability.md）、演習。設計で事前に用意すべき機能（失効のための識別子・stream・鍵併存）。' },
  { id: 'ADR-020', file: '05_adr/ADR-020-fapi2-applicability.md', rs: 'RS-04, RS-02, RS-13', q: 'FAPI 2.0 Security Profileを必須とするAPI範囲（管理API、権限付与、外部連携、大量データ取得、決済・医療等の規制スコープ）、sender constraint方式（DPoPかmTLS）、PAR・private_key_jwt、RFC 9068のRS256要件との衝突の扱い、conformance suite による検証、非FAPI範囲の最低基準（RFC 9700）。' },
  { id: 'ADR-023', file: '05_adr/ADR-023-dependency-tiers.md', rs: 'RS-09, RS-16, RS-12', q: '依存サービスの階層（Tier）定義と、各Tierが基盤に依存してよい範囲・静的安定性要件・基盤障害時の挙動、「この基盤に依存してはならないもの」（復旧ツール、break-glass、障害時連絡手段、基盤自身の監視）、データプレーンの静的安定性と剥奪反映のトレードオフ、全サービス同時停止を避ける設計。' },
  { id: 'ADR-024', file: '05_adr/ADR-024-cross-tenant-sharing.md', rs: 'RS-14, RS-07, RS-17, RS-02', q: '外部共有・ゲスト・テナント越え権限付与のモデル（ゲストを相手テナントの主体として招くか、共有リンクか、テナント間信頼）、token・route・resourceのテナント三者一致規則の例外の扱い、越境共有の監査と取消し、データ所在地をまたぐ共有、顧客管理者による越境共有ポリシー。' },
  { id: 'ADR-025', file: '05_adr/ADR-025-list-search-authorization.md', rs: 'RS-07, RS-08, RS-17', q: '一覧・検索の認可: pre-filter（ListObjects/LookupResources/AuthZEN search）とpost-filter、ACL反映検索インデックス、Leopard型の事前計算、件数・ページング・ファセット・自動補完からの情報漏えい対策、性能（前提台帳 ListObjects のA-ID）と整合性（インデックス遅延とstale）。' },
  { id: 'ADR-026', file: '05_adr/ADR-026-async-long-running-delegation.md', rs: 'RS-06, RS-17, RS-04, RS-07', q: '非同期・長時間・定期ジョブの委任: enqueue時認可と実行時再認可、ジョブ用workload IDと委任の記録（act）、短命tokenと長時間ジョブの整合（token exchangeでの再発行、offline_access の扱い）、ジョブ所有者の退職・権限喪失時の停止、イベント駆動consumerの再認可、メッセージ内の認可文脈（txn等）の改ざん防止。' },
  { id: 'ADR-027', file: '05_adr/ADR-027-migration-dual-run-rollback.md', rs: 'RS-07, RS-16, RS-09, RS-17', q: '既存（As-Is: レガシーSAML/LDAP/独自セッション/散在する認可）からの移行方式: dual-write、shadow判定、新旧判定差分（allow拡大差分は即時調査）、段階導入（read-only→低リスクtenant→限定resource type→cell）、自動rollback条件、顧客側作業（SAML/OIDC再設定、再同意、passkey再登録）の最小化。' },
  { id: 'ADR-028', file: '05_adr/ADR-028-tenant-lifecycle-operations.md', rs: 'RS-07, RS-09, RS-14, RS-10', q: 'テナント統合・分割・cell間移動・解約時エクスポート・削除の実装方式（識別子はADR-021、cellはADR-013と整合）、整合性と停止時間、tuple・policy・鍵・監査記録の移送、M&A時の統合、crypto-shreddingによる削除。02_requirements/tenant-lifecycle.md を設計判断として確定する。' },
  { id: 'ADR-029', file: '05_adr/ADR-029-privileged-support-access.md', rs: 'RS-12, RS-05, RS-13, RS-03', q: '特権・supportアクセス: JIT昇格、二者承認、理由入力、時間制限、セッション記録、support経路の分離（Okta 2023教訓: アップロード物サニタイズ、support用資格情報の保管）、顧客データへのsupportアクセスの顧客承認、break-glassの保管・発動・事後レビュー、通常graphへ特権を混ぜない。' },
]

const results = await pipeline(
  ADRS,
  a => agent(`${COMMON}
あなたの担当: ${a.id}（${a.file}）の起草。traceability/deliverables.md §5 の該当行の「決める内容」を満たす。
解くべき問い: ${a.q}
必読の調査ノート: ${a.rs}（関連箇所）。主要ADRとWave A文書のうち関係するものを必ず読み、矛盾しないこと。矛盾が避けられない場合は本ADRに「主要ADRとの論点」として明記する（主要ADRは編集しない）。
${ADR_TEMPLATE}
完了したら、決定の要旨（3行）・可逆性・主要ADRとの論点の有無を返答する。`, { label: `${a.id}-author`, phase: 'Author' }),
  (summary, a) => agent(`${COMMON}
あなたの担当: ${a.file} の独立レビューと修正（あなたは作成者ではない）。
観点: (1) 主要ADRと reconciliation-notes.md との整合。矛盾は本ADR側を修正。(2) 脚注の主張が原典で支持されるか（規範の強度、版・状態の正確さ）。誤りは修正。(3) 対応表の網羅（R/G を Grep し漏れを追記）。(4) 選択肢が藁人形でないか。(5) 根拠のない数値・禁止表現・主張タグ欠落。
ファイルを直接編集し、末尾に「レビュー記録」節を追加。完了したら修正件数と未解決事項を短く返答。`, { label: `${a.id}-review`, phase: 'Review' }),
)

phase('Index')
const idx = await parallel([
  () => agent(`${COMMON}
あなたの担当: 05_adr/README.md（文書ID ADR-000）の作成。ADR-001〜ADR-029 を全て読み、索引（ID、タイトル、状態、可逆性、DEC-3対象、決定の要旨1行、主な依存、PoC要否、再検討トリガーの要点）、ADR様式の説明、依存関係図（Mermaid）、不可逆決定の一覧（DEC-3）、未決論点の一覧を書く。存在しないADRは「未作成」と明記。完了したらADR件数と未決論点件数を返答。`, { label: 'adr-readme', phase: 'Index' }),
  () => agent(`${COMMON}
あなたの担当: traceability/rejected-hypotheses.md（TRC-08、DL-107）の作成。全ADRの「検討した選択肢」「棄却理由」、claims-ledger.md の処置「削除」「要実測」、Wave A文書で棄却された案を集約。各項目: RH-xxx、棄却した仮説・案、出典、棄却理由、根拠、変えた設計、再検討条件。旧提案からの主要な方針変更（一律5〜15分token、一律fail-closed、自己評価の4象限等）を含める。完了したら件数を返答。`, { label: 'rejected-hypotheses', phase: 'Index' }),
])
return { adrs: results.filter(Boolean).length, idx }
