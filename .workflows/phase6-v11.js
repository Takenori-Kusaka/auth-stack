export const meta = {
  name: 'phase6-v11-integration-fixes',
  description: '模擬連携検証の改善提案I-1〜I-14を10_integration/11_contractsへ反映し、別エージェントで連携検証を再実施（v1.1）',
  phases: [{ title: 'Fix' }, { title: 'Retrial' }, { title: 'Close' }],
}
const ROOT = 'E:\\Github\\auth-stack'
const COMMON = `作業ディレクトリは ${ROOT} 。汎用共通認証・認可基盤の提出版 v1.0（タグ v1.0-submission）を v1.1 に改訂する。必読: CONVENTIONS.md、13_integration-trial/report.md（AIによる模擬連携検証。詰まった点 P-01〜P-26 と改善提案 I-1〜I-14）。契約ファイルは機械検証（JSON: python -m json.tool、OpenAPI/AsyncAPI: npx --yes @redocly/cli@latest lint または npx --yes @asyncapi/cli validate）でエラー0を保つ。指示されたファイル以外は編集しない（並行作業中）。変更箇所に「v1.1（I-x）」と注記し、各文書の版を上げる。`
const TASKS = [
  { files: '11_contracts/authorization-api.openapi.yaml', items: 'I-1（write の allow 例 fully_consistent、要求件数に連動する evaluations 例、X-Request-ID の例を echo 前提で記述）、I-5（action.name を動詞 permission 名に統一）、P-20' },
  { files: '11_contracts/schemas/audit-event.schema.json', items: 'I-3（PDP 不達・L0 拒否時の decision_id の扱い、Txn-Token のない write の txn の扱い、prev_fp の初期値、参照値の鍵の取得方法）、I-5（subject.type の値と ptype からの写像）' },
  { files: '11_contracts/token-exchange.openapi.yaml', items: 'I-9（受付記録登録 API、TTS の JWKS、subject_token_type を domain 非依存の URN に）、P-19（scope 例）' },
  { files: '11_contracts/lifecycle-events.asyncapi.yaml と新規 11_contracts/state-query.openapi.yaml', items: 'I-10（CON-15 を単独ファイルに切出し、QC に不適合応答・4xx・未知 verdict の扱い）、I-11（lcsig 正例の再署名手順）' },
  { files: '11_contracts/schemas/common.schema.json と 11_contracts/relationship-model-registry.openapi.yaml', items: 'I-7（tid と tier 表記を CON-02 に一本化し、各契約から参照）、P-21（base_revision 初回値）' },
  { files: '11_contracts/mock-contract-test-kit.md と新規 11_contracts/kit/（echo-proxy.js、negative-vectors/*.json、README.md）', items: 'I-1（汎用モックの制約と echo proxy の同梱）、I-11（負例形式の統一と CV-001〜014 の JSON 配布）、I-8（§11.4 の差替え点 aud・alg・profile 版・env・自 SPIFFE ID、fail-mode 設定文書のスキーマ）、P-23、P-24（fga CLI の版と入手方法）、P-25（401 の形）' },
  { files: '新規 11_contracts/integration-essentials.md', items: 'I-2（SDK なし実装に必要な token 検証規則 V1〜V14、PEP の 11 関数の外形、core 型の relation と公開 permission の連携向け抜粋。04_architecture を読まずに実装できる自己完結の抜粋）、スタブの最小構成' },
  { files: '10_integration/authz-modeling-guide.md', items: 'I-4（承認経路（組織階層・部署長・閾値による上位承認）の通し例、所属部署の取得手段、決裁前に使える暫定形）、I-5' },
  { files: '10_integration/integration-patterns.md と 10_integration/developer-faq.md', items: 'I-6（PP-2 の一覧候補生成で使ってよいもの、NP09-4 の判定方法）、I-12（業務通知の送信経路）、I-5' },
  { files: '10_integration/README.md と 11_contracts/README.md', items: 'I-13（実装者向けの1枚の入口を冒頭に、改版履歴を末尾へ）、I-7（凍結区分キーの読替え表）、新規ファイル（integration-essentials.md、state-query.openapi.yaml、kit/）の案内' },
]
phase('Fix')
await parallel(TASKS.map((t, i) => () => agent(`${COMMON}
あなたの担当ファイル: ${t.files}
反映する改善提案: ${t.items}
13_integration-trial/report.md の該当 P-xx を読み、問題が解消するように修正・作成する。他文書との整合が必要な点は担当ファイル内に「他文書への申し送り（v1.1）」として書く。完了したら変更内容と検証結果を返答。`, { label: `fix-${i + 1}`, phase: 'Fix' })))
await agent(`${COMMON}
あなたの担当: v1.1 の同期。上記改訂で各ファイルに書かれた「他文書への申し送り（v1.1）」を拾い、10_integration/・11_contracts/・traceability/deliverables.md（新規ファイルの登録）へ反映する。完了したら件数を返答。`, { label: 'sync', phase: 'Fix' })
phase('Retrial')
const retrial = await agent(`作業ディレクトリ ${ROOT} 。あなたは「認証認可基盤にこれから依存する新規サービスの開発チーム」の役（AIによる模擬）として、v1.1 の並行開発可能性を再検証する。制約: 12_poc/code、04_architecture、05_adr、13_integration-trial/ は読まない。10_integration/ と 11_contracts/ だけを使う。題材は前回と別の「会議室予約サービス（拠点・フロアの階層、予約の作成・取消・一覧、他テナントの外部ゲスト招待、AIアシスタントによる代理予約、予約リマインドの非同期通知）」。手順: 入口文書に従いパターン選択と認可モデル草案、11_contracts/kit とモックで起動、最小実装（Node 22）を 13_integration-trial/room-booking/ に作り契約試験（正例・負例）を実行。結果を 13_integration-trial/room-booking/report.md に書く（使った文書と節、迂回の要否、試験結果、詰まった点を重大/中/小で、判定、AI模擬検証である旨）。ファイル書込みが止められた場合は返答に全文を含める。完了したら判定・詰まった点の件数（重大/中/小）・迂回の要否を返答。`, { label: 'retrial', phase: 'Retrial' })
phase('Close')
await agent(`${COMMON}
あなたの担当: v1.1 の締め。(1) 13_integration-trial/room-booking/report.md（なければ次の返答文: ${JSON.stringify(retrial).slice(0, 6000)}）を確認し、存在しなければ返答文から作成。(2) traceability/open-items.md に再検証の残り詰まり点を登録。(3) traceability/change-log.md に v1.1 を記録。(4) 00_decision/01-executive-summary.md と README.md の並行開発に関する記述を、2回の模擬連携検証の結果（AI模擬であり実在チーム検証ではない）に合わせて更新し、版を v1.1 に。完了したら一行で返答。`, { label: 'close', phase: 'Close' })
return retrial
