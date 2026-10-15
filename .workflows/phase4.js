export const meta = {
  name: 'phase4-decision-package-and-adversarial-review',
  description: 'RS-18反映、決裁パッケージ・追跡表起草、自動整合検査、8視点の模擬CTO/CISOパネルによる敵対的レビューと修正ループ、反証レビュー記録',
  phases: [
    { title: 'Apply', detail: 'RS-18階層モデリングと主体識別子方針の反映' },
    { title: 'Package', detail: '決裁パッケージ・追跡表・残課題・README' },
    { title: 'Checks', detail: '自動整合検査と機械的是正' },
    { title: 'Panel', detail: '8視点の模擬パネル（ラウンド制）' },
    { title: 'Verify', detail: '指摘の独立検証' },
    { title: 'Fix', detail: 'ファイル単位の是正' },
    { title: 'Report', detail: 'パネル報告・反証レビュー・最終整合' },
  ],
}

const ROOT = 'E:\\Github\\auth-stack'
const COMMON = `作業ディレクトリは ${ROOT} 。背景: 汎用の共通認証・認可基盤の再提案プログラム（旧提案はCTO/CISOレビュー「20年運用を前提とした認証・認可基盤提案のCTO CISOレビュー.md」で本番不承認）。規模は1000億円規模・利用者100万人・約1万テナント・約300マイクロサービス・20〜30開発チーム/ベンダー、法域は日本・EU/英国・米国・業界規制、計画期間20年、汎用・仮置き前提。必読: CONVENTIONS.md、traceability/deliverables.md。全成果物: 00_decision/ 01_governance/ 02_requirements/ 03_threat-model/ 04_architecture/ 05_adr/ 06_controls/ 07_slo/ 08_operations/ 09_assurance/ 10_integration/ 11_contracts/ 12_poc/ research/ traceability/ reports/。台帳: traceability/R-requirements.md、G-goal-criteria.md、claims-ledger.md、dissent-log.md、rejected-hypotheses.md、01_governance/assumptions-register.md。根拠は research で検証済みの原典を脚注で。二次情報は根拠にしない。禁止表現なし。模擬パネルは自己レビューであり実在のCTO/CISOの決裁ではないことを明記。指示されたファイル以外は編集しない（並行作業中）。`
const GOAL = '20年戦っている完全無欠の汎用共通認証認可基盤を検討し、その検討手法や調査範囲、どのようにその設計方針としたのか、など設計妥当性についてCTO/CISOレベルが納得し、1000億円規模の超大規模システムと100万人が利用する超高度な認証認可基盤として成立すると認められる状態。この認証認可基盤とこの基盤に依存するあらゆるサービスやマイクロサービス、システムが、どのように認証認可基盤と連携すればそのサービスがやりたいことを実現でき、柔軟にアクセスコントロールできるかが示されており、同時並行的に他システムの開発も進められる状態であること'

// ---------- Apply RS-18 ----------
phase('Apply')
await agent(`${COMMON}
あなたの担当: research/RS-18-hierarchy-modeling.md（テナント配下の階層モデリング調査）の結論と、主体識別子の方針（user_id ではなく sub＝人もシステムも種別付き不透明ID、client_id＝要求元ソフトウェア、act＝代理、subject_type を別claimで持つ）を、次の文書に反映する: 04_architecture/authorization-model.md（core/tenant・core/unit（単一親の再帰コンテナ、kind属性）・core/group（n:n）・core/admin_scope（非ネスト委任範囲）の4型、containment relation 名を parent に統一する規約、木/DAGの区別、循環・深さ検査を階層サービスで行う、ancestor 事前計算による評価段数の抑制と設計値8との関係（決裁案として明記）、owner_unit）、04_architecture/claims-catalog.md（sub/client_id/act/subject_type の区別、token に階層を載せない）、02_requirements/principal-catalog.md、10_integration/authz-modeling-guide.md、05_adr/ADR-021-irreversible-identifiers.md と ADR-011 は矛盾があれば最小限の追記（「RS-18反映」と注記）のみ。各文書の変更箇所に「RS-18反映（2026-10-15）」と記し、research/RS-18 を脚注で引く。RS-18 の未検証事項（エンジン検証器未実行）は残課題として明記。完了したら変更点の要約を返答。`, { label: 'apply-rs18', phase: 'Apply' })

// ---------- Decision package & traceability ----------
phase('Package')
const PKG = [
  { path: '00_decision/03-decision-items.md', req: 'DEC-1〜DEC-9（deliverables §6.1）の正式定義: 各DECの決裁内容、選択肢、推奨、帰結、可逆性、承認者、見直し日、決議文案、依存ADR/文書。05_adr/README.md の未決論点（特に U-01 issuer粒度）を DEC-3 の議題として整理。今回求めない事項を明記。' },
  { path: '00_decision/04-program-charter.md', req: 'プログラム憲章: 目的、スコープ（顧客向けID・社員ID・workload IDの範囲）、パイロット候補サービス選定基準、非目標、20年耐久性憲章（01_governance/durability-charter-20y.md）参照。' },
  { path: '00_decision/05-residual-risk-register.md', req: '損失シナリオ・脅威カタログ・各ADRの残余リスクを集約し、受容者案・期限・補完統制・失効条件・受容票IDを付ける。上位5件を選定理由付きで示す。' },
  { path: '00_decision/06-gate-plan-and-plan-b.md', req: 'Gate 0〜6と継続ゲートの承認者・合格基準・中止基準・予算/期間上限（TBD可、決め方明記）。旧提案Phase0〜3・レビューGate0〜6・本プログラムPhase1〜6の対応表。Plan B（マネージドIdP＋サービス内認可ライブラリ＋共通契約）。' },
  { path: '00_decision/07-organization-and-tco.md', req: '08_operations の operating-model と tco-vendor-lts から RACI・FTE・TCO幅・PoC期間の予算上限と要員稼働率（DEC-4）を要約。' },
  { path: '00_decision/08-alternatives-comparison.md', req: '①現状維持 ②マネージドIdP＋サービス内認可ライブラリ ③共通契約だけの連邦型 ④本案 を、リスク・費用・要員・可逆性・移行コスト・並行開発への影響の同一基準で比較し、どの条件なら代替案が勝つかを明記。' },
  { path: '00_decision/02-prior-findings-crosswalk.md', req: 'traceability/R-requirements.md の全R（R-001〜R-283、枝番含む）について: レビュー原文の位置、対応文書と節、閉じ方（文書/証拠/経営判断/繰延べ/見解相違）、状態（本書で閉じた/決裁案まで/要実測/要第三者）、検証者（作成者以外のエージェント名またはレビュー記録の所在）。集計（状態別件数、繰延べ件数）を冒頭に。dissent-log の見解相違も載せる。' },
  { path: 'traceability/traceability-matrix.md', req: 'R-ID→G-ID→DL→C-ID→TC/RB→証跡（E種別・所在）の双方向追跡表。孤児R・孤児DL・孤児Gの検査結果（件数と一覧）。G-001〜G-151 の各基準について現状（充足/決裁案まで/要実測/要第三者/未着手）と根拠文書。' },
  { path: 'traceability/open-items.md', req: '未達（経営承認、第三者評価、実測、本番運用実績待ち）と是正項目のPOA&M: 担当（役割）、期限（相対）、依存ゲート、状態。各ADRの未決論点・各文書の残課題節から集約。' },
]
await parallel(PKG.map(d => () => agent(`${COMMON}
あなたの担当: ${d.path} の作成（deliverables.md の該当行の要点を満たす）。要件: ${d.req}
メタ情報ブロック、主張タグ、根拠の脚注、末尾に残課題と参考文献。完了したら主要な結論と件数を短く返答。`, { label: d.path.split('/').pop(), phase: 'Package' })))
await agent(`${COMMON}
あなたの担当: 00_decision/01-executive-summary.md（全文に主張タグ）と 00_decision/00-cover.md（決裁事項1行、承認者、版、前版との差分、付属A〜Lの索引）の作成。00_decision/ の他文書、05_adr/README.md、traceability/traceability-matrix.md、open-items.md を読み、1枚で判断できるよう: 現状と前回からの変化（旧提案の主張287件の処置、引用監査の結果）、ゴールの再定義（完全無欠→攻撃者モデル＋統制＋証拠＋残余リスク受容、20年→7性質）、DEC-1〜DEC-9、今回求めない事項、費用・期間・要員の幅、残余リスク上位5と受容者、次ゲートと中止基準、代替案比較の要約、並行開発の開始条件（DEC-8：契約v1凍結・モック・契約試験キット）。完了したら一行で返答。`, { label: 'exec-summary', phase: 'Package' })
await agent(`${COMMON}
あなたの担当: リポジトリ直下 README.md（GEN-01）と traceability/change-log.md（TRC-13）。README: 目的、ゴール原文と再定義、ディレクトリ構成、読む順番（決裁者・アーキテクト/セキュリティ・連携開発者・監査人の4ペルソナ別）、各文書の状態一覧、検討手法（Phase1〜6、一次資料調査17+1ストリームと独立検証、judge panel、模擬パネル）と調査範囲・限界、AIエージェント使用の開示と原典照合ログの所在。change-log: Phase別の変更と旧提案からの主要変更。完了したら一行で返答。`, { label: 'readme', phase: 'Package' })

// ---------- Automated checks ----------
phase('Checks')
await agent(`${COMMON}
あなたの担当: traceability/consistency-checks.md（TRC-12）の自動検査の実装・実行・機械的是正。Python（-I オプション、スクリプトは 12_poc の外、例えば .workflows/checks/ に置く）で次を検査する: (1) 各mdのメタ情報ブロック有無、(2) 禁止表現（CONVENTIONS §5）の出現と文脈、(3) 主張タグの欠落が多い段落（00_decision と 05_adr の主要部）、(4) 未定義ID参照（R/G/A/S/T/ATK/ADR/DL/SLI/K/RB/TC/P/C の参照先が定義ファイルに存在するか）、(5) 脚注の未定義・未使用、(6) deliverables.md §8 ファイル一覧と実ファイルの差分、(7) 相対リンク切れ、(8) JSON（python -m json.tool）とOpenAPI（npx --yes @redocly/cli@latest lint）の妥当性。機械的に直せるもの（リンク、脚注番号、メタ情報欠落、deliverablesへの未登録ファイルの追記）は直し、内容判断が要るものは一覧化する。検査スクリプトを再実行可能な形で残し、結果（件数推移）を記録。完了したら検査項目別の件数（是正前/後）を返答。`, { label: 'consistency-checks', phase: 'Checks' })

// ---------- Panel loop ----------
const PERSONAS = [
  { key: 'cto', name: 'CTO', lens: '事業戦略整合、可用性、変更容易性、供給者依存、TCO、人材継続性、20年互換、被害封じ込め、1000億円規模の多ベンダー開発で成立するか' },
  { key: 'ciso', name: 'CISO', lens: 'リスク連鎖（保護対象→脅威→損失→許容度→統制→検証→合格値→残余リスク受容者）が閉じているか、攻撃者モデル網羅、不正対策、独立保証、規制、証跡' },
  { key: 'sre', name: '超大規模SRE', lens: '100万人・300サービスの容量、tail latency、障害モード・縮退、相関障害、cell、運用手順、数値の根拠' },
  { key: 'legal', name: 'プライバシー・法務（多法域）', lens: '日本・EU/英国・米国・業界規制の適用判断、所在地、保持・削除、通知期限、契約上の責任分界' },
  { key: 'audit', name: '内部監査', lens: '追跡可能性、主張と引用の一致、自己評価の排除、証跡の形式、未達の開示、レビュー指摘R全件の扱い' },
  { key: 'redteam', name: 'レッドチーム', lens: '設計を破る具体的攻撃経路（テナント越境、token横流し、回復悪用、supportアクセス、PEP迂回、policy誤配布、AIエージェント濫用、供給網）と未対策の穴' },
  { key: 'devlead', name: '連携サービス開発リーダー', lens: '10_integrationと11_contractsだけで、基盤完成を待たずに自サービス（任意の27種別のどれか）の開発・試験を始められるか、契約・モック・契約試験・オンボーディング・リードタイム・問い合わせが揃っているか、柔軟なアクセス制御を自分で設計できるか' },
  { key: 'cfo', name: 'CFO/PMO', lens: '費用の幅と根拠、要員確保、ゲートと中止基準、代替案比較、決裁事項の明確さ、スケジュールリスク' },
]
const FINDINGS = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['承認可（条件付き含む）', '差戻し'] },
    rationale: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'] },
          file: { type: 'string' },
          section: { type: 'string' },
          issue: { type: 'string' },
          desk_closable: { type: 'boolean', description: '文書の修正で閉じられるか（経営判断・実測・第三者が必要ならfalse）' },
          fix: { type: 'string' },
        },
        required: ['severity', 'file', 'section', 'issue', 'desk_closable', 'fix'],
      },
    },
  },
  required: ['verdict', 'rationale', 'findings'],
}
const VERDICT = { type: 'object', properties: { real: { type: 'boolean' }, reason: { type: 'string' } }, required: ['real', 'reason'] }

const seen = new Set()
const rounds = []
let dry = 0
for (let round = 1; round <= 3 && dry < 2; round++) {
  phase('Panel')
  const reviews = (await parallel(PERSONAS.map(p => () => agent(`${COMMON}
あなたは模擬審査パネルの「${p.name}」（ラウンド${round}）。観点: ${p.lens}
審査基準: レビュー原文の承認条件10項と重大な不足、traceability/G-goal-criteria.md（ゴール原文「${GOAL}」の受入基準）、CONVENTIONS。00_decision/ から読み始め、必要な文書を深く読む。
「決裁可能か」を判定し、指摘を出す。指摘は具体的に（ファイル・節・問題・修正案）。経営判断・実測・第三者評価でしか閉じないものは desk_closable=false とし、それが明示的に残課題・決裁案として開示されていれば指摘しない（開示されていない場合のみ指摘）。既に前ラウンドで是正済みの点を繰り返さない。`, { label: `R${round}-${p.key}`, phase: 'Panel', schema: FINDINGS })))).filter(Boolean)
  const all = reviews.flatMap((r, i) => r.findings.map(f => Object.assign({}, f, { by: PERSONAS[i] ? PERSONAS[i].key : '?' })))
  const key = f => `${f.file}|${f.section}|${f.issue.slice(0, 60)}`
  const fresh = all.filter(f => (f.severity === 'Critical' || f.severity === 'High') && f.desk_closable && !seen.has(key(f)))
  fresh.forEach(f => seen.add(key(f)))
  log(`ラウンド${round}: 指摘${all.length}件、机上で閉じるCritical/High新規${fresh.length}件、差戻し${reviews.filter(r => r.verdict === '差戻し').length}/${reviews.length}`)
  rounds.push({ round, verdicts: reviews.map((r, i) => ({ who: PERSONAS[i].key, verdict: r.verdict, rationale: r.rationale })), counts: { all: all.length, fresh: fresh.length }, medLow: all.filter(f => !(f.severity === 'Critical' || f.severity === 'High')).slice(0, 80) })
  if (!fresh.length) { dry++; continue }
  dry = 0
  phase('Verify')
  const verified = (await parallel(fresh.map(f => () => agent(`${COMMON}
次の指摘が実在し、文書修正で閉じるべきものかを独立に検証せよ（反証を試み、不確かなら real=false）。指摘: ${JSON.stringify(f)}
該当ファイルと関連文書を読んで判断する。`, { label: `verify-${f.by}`, phase: 'Verify', schema: VERDICT }).then(v => (v && v.real ? f : null))))).filter(Boolean)
  const byFile = {}
  verified.forEach(f => { (byFile[f.file] = byFile[f.file] || []).push(f) })
  log(`ラウンド${round}: 検証済み${verified.length}件、対象ファイル${Object.keys(byFile).length}`)
  phase('Fix')
  await parallel(Object.entries(byFile).map(([file, fs]) => () => agent(`${COMMON}
あなたの担当: ${file} の是正（このファイルだけを編集）。模擬パネルの検証済み指摘: ${JSON.stringify(fs)}
各指摘を修正し、修正箇所に根拠を付ける（新たな事実は原典で確認）。他文書の修正が必要な場合は本ファイルに「他文書への申し送り」として記載。末尾の「レビュー記録」節にラウンド${round}の指摘と対応を追記。完了したら対応件数を返答。`, { label: `fix-${file.split('/').pop()}`, phase: 'Fix' })))
  rounds[rounds.length - 1].fixed = verified.length
}

phase('Report')
await parallel([
  () => agent(`${COMMON}
あなたの担当: traceability/mock-panel-report.md（TRC-10）の作成。冒頭に「本書は AI エージェントによる模擬パネルの自己レビューであり、実在の CTO/CISO の決裁ではない」と明記。ラウンド別の判定・指摘件数・是正件数・残った Medium/Low と非机上指摘の扱いを記録。データ: ${JSON.stringify(rounds)}
また、各パネリストの最終判定理由を要約し、実在の決裁者に提出する際の注意（独立保証・経営承認・実測が未達であること）を書く。完了したら一行で返答。`, { label: 'panel-report', phase: 'Report' }),
  () => agent(`${COMMON}
あなたの担当: traceability/independent-challenge-review.md（TRC-09、DL-108）。独立反証レビューを実施して記録する（あなたは作成者ではない立場で）: (1) pre-mortem「2031年にテナント越境の重大事故が起きた。原因は何か」を5シナリオ、(2) 代替案（Plan B、連邦型、現状維持）の steelman、(3) 主要数値（容量、寿命、剥奪時間、TCO）への攻撃、(4)「推奨が正しいために真でなければならないこと」の列挙と各々の検証手段。各指摘に、既存文書での回答箇所または未回答（残課題へ）を付ける。本リポジトリ内の反証はAIによる自己反証であり、報告系統外の独立反証は未達であることを明記。完了したら一行で返答。`, { label: 'challenge-review', phase: 'Report' }),
])
await agent(`${COMMON}
あなたの担当: 最終整合。traceability/consistency-checks.md の検査スクリプトを再実行し、結果を追記。traceability/traceability-matrix.md と 00_decision/02-prior-findings-crosswalk.md の状態欄を、レビュー記録・是正結果に合わせて更新。traceability/open-items.md に、independent-challenge-review の未回答項目とパネルの非机上指摘を追加。完了したら検査結果の件数を返答。`, { label: 'final-consistency', phase: 'Report' })
return rounds.map(r => ({ round: r.round, counts: r.counts, fixed: r.fixed || 0, verdicts: r.verdicts.map(v => `${v.who}:${v.verdict}`) }))
