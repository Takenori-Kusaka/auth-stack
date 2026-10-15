export const meta = {
  name: 'phase4b-panel-continuation',
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
for (let round = 4; round <= 7 && dry < 2; round++) {
  phase('Panel')
  const reviews = (await parallel(PERSONAS.map(p => () => agent(`${COMMON}
あなたは模擬審査パネルの「${p.name}」（ラウンド${round}）。観点: ${p.lens}
審査基準: レビュー原文の承認条件10項と重大な不足、traceability/G-goal-criteria.md（ゴール原文「${GOAL}」の受入基準）、CONVENTIONS。00_decision/ から読み始め、必要な文書を深く読む。
「決裁可能か」を判定し、指摘を出す。指摘は具体的に（ファイル・節・問題・修正案）。経営判断・実測・第三者評価でしか閉じないものは desk_closable=false とし、それが明示的に残課題・決裁案として開示されていれば指摘しない（開示されていない場合のみ指摘）。既に前ラウンドで是正済みの点を繰り返さない（ラウンド1〜3の記録は traceability/mock-panel-report.md と各文書末尾のレビュー記録にある）。ラウンド3で内部監査とCFOが差戻した論点（DEC-7のクローズ件数の不整合とAI検証の開示、PEP coverage を検証するTCの欠落、DEC-4予算上限の算定、G0〜G3段階予算の承認DEC、代替案比較のTCO基準値の不一致、Plan Bの経路の循環、ライフサイクルイベント契約・client登録契約の欠落、状態表示の陳腐化）が解消されたかを重点的に確認する。`, { label: `R${round}-${p.key}`, phase: 'Panel', schema: FINDINGS })))).filter(Boolean)
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
あなたの担当: traceability/mock-panel-report.md（TRC-10）の更新（既存のラウンド1〜3記録を残し、ラウンド4以降を追記）。冒頭に「本書は AI エージェントによる模擬パネルの自己レビューであり、実在の CTO/CISO の決裁ではない」と明記。ラウンド別の判定・指摘件数・是正件数・残った Medium/Low と非机上指摘の扱いを記録。データ: ${JSON.stringify(rounds)}
また、各パネリストの最終判定理由を要約し、実在の決裁者に提出する際の注意（独立保証・経営承認・実測が未達であること）を書く。完了したら一行で返答。`, { label: 'panel-report', phase: 'Report' }),
  () => agent(`${COMMON}
あなたの担当: traceability/independent-challenge-review.md（TRC-09、DL-108）の更新。既存の反証項目の回答状況を是正結果に合わせて更新し、新たな反証があれば追記する（あなたは作成者ではない立場で）: (1) pre-mortem「2031年にテナント越境の重大事故が起きた。原因は何か」を5シナリオ、(2) 代替案（Plan B、連邦型、現状維持）の steelman、(3) 主要数値（容量、寿命、剥奪時間、TCO）への攻撃、(4)「推奨が正しいために真でなければならないこと」の列挙と各々の検証手段。各指摘に、既存文書での回答箇所または未回答（残課題へ）を付ける。本リポジトリ内の反証はAIによる自己反証であり、報告系統外の独立反証は未達であることを明記。完了したら一行で返答。`, { label: 'challenge-review', phase: 'Report' }),
])
await agent(`${COMMON}
あなたの担当: 最終整合。traceability/consistency-checks.md の検査スクリプトを再実行し、結果を追記。traceability/traceability-matrix.md と 00_decision/02-prior-findings-crosswalk.md の状態欄を、レビュー記録・是正結果に合わせて更新。traceability/open-items.md に、independent-challenge-review の未回答項目とパネルの非机上指摘を追加。完了したら検査結果の件数を返答。`, { label: 'final-consistency', phase: 'Report' })
return rounds.map(r => ({ round: r.round, counts: r.counts, fixed: r.fixed || 0, verdicts: r.verdicts.map(v => `${v.who}:${v.verdict}`) }))
