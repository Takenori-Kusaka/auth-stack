export const meta = {
  name: 'phase4d-freeze-and-converge',
  description: 'ラウンド8〜10の未解消指摘だけを固定して是正し、指摘固定の確認ラウンドで収束を判定、版を凍結（提出版v1.0）',
  phases: [
    { title: 'Collect', detail: '未解消指摘の固定リスト化' },
    { title: 'Fix', detail: 'ファイル単位の是正' },
    { title: 'Confirm', detail: '固定リストの解消確認（新規指摘は受け付けず別台帳へ）' },
    { title: 'Freeze', detail: '整合検査・版凍結・最終報告' },
  ],
}
const ROOT = 'E:\\Github\\auth-stack'
const COMMON = `作業ディレクトリは ${ROOT} 。汎用共通認証・認可基盤の再提案プログラム。必読: CONVENTIONS.md、traceability/deliverables.md、traceability/mock-panel-report.md（模擬パネル ラウンド1〜10の記録）。模擬パネルはAIの自己レビューであり実在のCTO/CISOの決裁ではない。指示されたファイル以外は編集しない（並行作業中）。禁止表現なし。根拠は原典の脚注で。`

phase('Collect')
const LIST = {
  type: 'object',
  properties: { items: { type: 'array', items: { type: 'object', properties: {
    id: { type: 'string' }, file: { type: 'string' }, section: { type: 'string' }, issue: { type: 'string' }, fix: { type: 'string' }, severity: { type: 'string' },
  }, required: ['id', 'file', 'section', 'issue', 'fix', 'severity'] } } },
  required: ['items'],
}
const list = await agent(`${COMMON}
あなたの担当: 未解消指摘の固定リスト（FZ-001〜）を作る。traceability/mock-panel-report.md と各文書末尾の「レビュー記録」節（特にラウンド8〜10）を読み、Critical/High のうち (a) 机上で閉じられる (b) まだ解消されていない、ものを全て抽出し、現在の文書を開いて実際に未解消かを確認する。重複は統合。file は編集対象の単一ファイルパス（複数ファイルに跨る場合は主ファイルを file にし、他は issue に列挙）。traceability/freeze-list.md にも同じ一覧を書く。返答はスキーマ。`, { label: 'collect', phase: 'Collect', schema: LIST })
log(`固定リスト: ${list.items.length}件`)

phase('Fix')
const byFile = {}
list.items.forEach(f => { (byFile[f.file] = byFile[f.file] || []).push(f) })
await parallel(Object.entries(byFile).map(([file, fs]) => () => agent(`${COMMON}
あなたの担当: ${file} の是正（このファイルだけを編集）。固定リストの指摘: ${JSON.stringify(fs)}
全て是正し、他ファイルの同期が必要な点は traceability/freeze-list.md ではなく本ファイルの「他文書への申し送り」に書く。末尾の「レビュー記録」節に凍結前是正（FZ-ID）を追記。完了したら対応件数を返答。`, { label: `fix-${file.split('/').pop()}`, phase: 'Fix' })))
// second pass: propagate cross-file notes
await agent(`${COMMON}
あなたの担当: 凍結前の同期。固定リスト（traceability/freeze-list.md）の是正で各ファイルに書かれた「他文書への申し送り」のうち FZ-ID 付きのものを全て拾い、申し送り先の文書へ反映する（00_decision/ と traceability/ と README.md の状態表示・件数・版を特に一致させる）。完了したら反映件数を返答。`, { label: 'propagate', phase: 'Fix' })

phase('Confirm')
const CONF = { type: 'object', properties: { resolved: { type: 'array', items: { type: 'string' } }, unresolved: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, reason: { type: 'string' } }, required: ['id', 'reason'] } }, verdict: { type: 'string', enum: ['承認可（条件付き含む）', '差戻し'] }, rationale: { type: 'string' } }, required: ['resolved', 'unresolved', 'verdict', 'rationale'] }
const PERSONAS = ['CTO', 'CISO', '超大規模SRE', 'プライバシー・法務', '内部監査', 'レッドチーム', '連携サービス開発リーダー', 'CFO/PMO']
const confirms = (await parallel(PERSONAS.map(p => () => agent(`${COMMON}
あなたは模擬パネルの「${p}」として確認ラウンドを行う。対象は traceability/freeze-list.md の固定リスト（FZ-ID）だけである。各項目が解消されたかを現在の文書で確認する。新しい指摘は判定に含めず、気づいた場合は traceability/post-freeze-observations.md に追記する（他のパネリストも追記するので、自分の見出し「## ${p}」の下にだけ書く）。判定: 固定リストの未解消（あなたの観点で重要なもの）が残れば差戻し、なければ条件付き承認可。経営判断・実測・第三者評価が必要な残課題は、開示されていれば判定を妨げない。`, { label: `confirm-${p}`, phase: 'Confirm', schema: CONF })))).filter(Boolean)
const unresolved = [...new Set(confirms.flatMap(c => c.unresolved.map(u => u.id)))]
log(`確認ラウンド: 承認可 ${confirms.filter(c => c.verdict !== '差戻し').length}/${confirms.length}、未解消 ${unresolved.length}件`)
if (unresolved.length) {
  const left = list.items.filter(i => unresolved.includes(i.id))
  const bf = {}
  left.forEach(f => { (bf[f.file] = bf[f.file] || []).push(f) })
  await parallel(Object.entries(bf).map(([file, fs]) => () => agent(`${COMMON}
${file} の再是正（このファイルだけ）。確認ラウンドで未解消とされた指摘: ${JSON.stringify(fs)} 、未解消理由: ${JSON.stringify(confirms.flatMap(c => c.unresolved).filter(u => fs.some(f => f.id === u.id)))}。是正してレビュー記録に追記。完了したら件数を返答。`, { label: `refix-${file.split('/').pop()}`, phase: 'Confirm' })))
}

phase('Freeze')
await agent(`${COMMON}
あなたの担当: 版凍結。(1) .workflows/checks/ の整合検査スクリプトを再実行し traceability/consistency-checks.md に結果を追記、機械的に直せるものは直す。(2) 00_decision/ の全文書とREADME.mdの版を「提出版 v1.0（自己レビュー済み・未決裁）」に揃え、状態を review とする。(3) traceability/mock-panel-report.md に「凍結前収束（固定リスト方式）」の節を追加: 固定リスト件数、確認ラウンドの判定 ${JSON.stringify(confirms.map((c, i) => ({ who: PERSONAS[i], verdict: c.verdict, unresolved: c.unresolved.length })))}、再是正の有無、post-freeze-observations の件数と扱い（次版で対処する未トリアージ事項）、および「AI自己レビューであり、実在のCTO/CISOの決裁・第三者評価・立会い付き実測・経営承認は未達」であることを明記。(4) traceability/open-items.md に post-freeze-observations を未トリアージとして登録。(5) traceability/change-log.md に v1.0 凍結を記録。完了したら検査件数と凍結結果を返答。`, { label: 'freeze', phase: 'Freeze' })
return { fixed: list.items.length, confirms: confirms.map((c, i) => `${PERSONAS[i]}:${c.verdict}:${c.unresolved.length}`), unresolved }
