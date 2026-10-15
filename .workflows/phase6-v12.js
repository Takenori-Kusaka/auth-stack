export const meta = {
  name: 'phase6-v12-guest-ai-contracts',
  description: '再検証の重大2件（越境ゲスト招待・AI代理予約）と中6件の契約を補い、3つ目の題材で模擬連携検証（v1.2）',
  phases: [{ title: 'Fix' }, { title: 'Retrial' }, { title: 'Close' }],
}
const ROOT = 'E:\\Github\\auth-stack'
const COMMON = `作業ディレクトリは ${ROOT} 。提出版 v1.1（タグ v1.1）を v1.2 に改訂する。必読: CONVENTIONS.md、13_integration-trial/room-booking/report.md（AIによる模擬連携検証。重大 C-1 越境ゲスト招待、C-2 AI代理予約、中 M-1〜M-6、小 L-1〜L-13）、関連する ADR-017・ADR-024 と 04_architecture/workload-identity-delegation.md・authorization-model.md（設計の正本。設計判断を変えずに契約と連携文書へ落とす。設計に穴があれば ADR に「v1.2 で判明した論点」として追記）。契約は機械検証（JSON: python -m json.tool、OpenAPI/AsyncAPI: npx --yes @redocly/cli@latest lint または npx --yes @asyncapi/cli validate）でエラー0。指示されたファイル以外は編集しない（並行作業中）。変更箇所に「v1.2」と注記し版を上げる。`
const TASKS = [
  { files: '11_contracts/（越境ゲスト招待の契約: external_grant の発行・承諾・取消・照会。新規ファイル可、例 11_contracts/external-grant.openapi.yaml）と 10_integration/integration-patterns.md の P-16', items: 'C-1 と関連する M/L 項目（招待の正例経路、相手テナント側の同意、取消と剥奪伝播、監査、負例）' },
  { files: '11_contracts/（AI エージェント代理の契約: 利用者による委任付与・範囲・期限・人の承認（step-up）・取消、代理 token の取得経路。既存 token-exchange・client-registration の拡張または新規ファイル）と 10_integration/integration-patterns.md の P-08', items: 'C-2 と関連する M/L 項目（act.ptype=ai_agent の正例経路、tool 呼出し単位の認可、人の承認、prompt injection 封じ込め、負例）' },
  { files: '11_contracts/kit/（負例ベクタ追加、echo proxy 等）、11_contracts/mock-contract-test-kit.md、11_contracts/integration-essentials.md、10_integration/README.md、10_integration/developer-faq.md、10_integration/authz-modeling-guide.md', items: 'M-1〜M-6 と L-1〜L-13 のうち上記2担当に属さないもの全て、および新契約の案内・負例ベクタ' },
]
phase('Fix')
await parallel(TASKS.map((t, i) => () => agent(`${COMMON}\nあなたの担当ファイル: ${t.files}\n対象: ${t.items}\n他担当との整合が必要な点は担当ファイル内に「他文書への申し送り（v1.2）」として書く。完了したら変更内容と検証結果を返答。`, { label: `fix-${i + 1}`, phase: 'Fix' })))
await agent(`${COMMON}\nv1.2 の同期: 各ファイルの「他文書への申し送り（v1.2）」を拾い 10_integration/・11_contracts/・05_adr/・traceability/deliverables.md へ反映。完了したら件数を返答。`, { label: 'sync', phase: 'Fix' })
phase('Retrial')
const retrial = await agent(`作業ディレクトリ ${ROOT} 。あなたは「認証認可基盤にこれから依存する新規サービスの開発チーム」の役（AIによる模擬）として v1.2 の並行開発可能性を再検証する。制約: 12_poc/code、04_architecture、05_adr、13_integration-trial/ の既存内容は読まない。10_integration/ と 11_contracts/ だけを使う。題材は「顧客サポートチケット管理（顧客企業テナントと委託先サポート会社テナントの越境協業、外部ゲストの招待と閲覧、AIエージェントによる一次回答の下書きと人の承認後の送信、SLA超過の非同期通知、チケット一覧・検索、管理者による担当割当て）」。入口文書に従いパターン選択・認可モデル草案・キットとモック起動・最小実装（Node 22）を 13_integration-trial/support-ticket/ に作り、正例・負例の契約試験を実行。結果を 13_integration-trial/support-ticket/report.md に書く（書込みが止められたら返答に全文を含める）。内容: 使った文書と節、迂回の要否、試験結果、詰まった点（重大/中/小）、判定、AI模擬検証である旨。完了したら判定・詰まり件数・迂回の要否を返答。`, { label: 'retrial', phase: 'Retrial' })
phase('Close')
await agent(`${COMMON}\nv1.2 の締め: (1) 13_integration-trial/support-ticket/report.md がなければ次の返答文から作成（見出し以降を保存）: ${JSON.stringify(retrial).slice(0, 20000)} (2) traceability/open-items.md に残りの詰まりを登録。(3) traceability/change-log.md に v1.2 を記録。(4) 00_decision/01-executive-summary.md と README.md の並行開発の記述を3回の模擬連携検証の結果（AI模擬であり実在チーム検証ではない）に更新し版を v1.2 に。完了したら一行で返答。`, { label: 'close', phase: 'Close' })
return retrial
