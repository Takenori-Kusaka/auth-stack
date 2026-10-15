export const meta = {
  name: 'phase5-poc-build-and-measure',
  description: 'Phase5: 事前登録済みPoC系統1（TC-001〜TC-028）の実装・実行・実測レポートと独立再現',
  phases: [
    { title: 'Scaffold', detail: 'PoC基盤（AS・STS・PDP façade・アダプタ・PEP SDK・サンプルサービス・監査）' },
    { title: 'Tests', detail: '試験ケース群の実装と実行' },
    { title: 'Report', detail: '実測レポート' },
    { title: 'Reproduce', detail: '独立再現と照合' },
  ],
}

const ROOT = 'E:\\Github\\auth-stack'
const FROZEN = '151940ac00dc64a89ac5a5cd148e42326e7c5e73'
const COMMON = `作業ディレクトリは ${ROOT} 。高保証PoCの系統1を、事前登録済みの試験計画 12_poc/preregistered-test-plan.md（凍結コミット ${FROZEN}。§2 事前登録の規則、§3 2系統の構成、§4 TC-001〜TC-028）に厳密に従って実装・実行する。合否基準・中止基準を事後に変更しない。変更が必要なら「事前登録からの逸脱」として理由とともに記録する。環境: Windows、Node 22、Python 3.14、Go（386）、Docker不使用。OpenFGA v1.21.0 単体バイナリが 12_poc/tools/openfga/openfga.exe にある（memory datastore で起動可能、git管理外）。npm パッケージ（oidc-provider、@cedar-policy/cedar-wasm、jose、@openfga/sdk、fast-check 等）は 12_poc/code/ に npm install してよい（node_modules は gitignore 済み）。設計の正本: 05_adr/、04_architecture/（token-profile.md、claims-catalog.md、authorization-model.md、pep-contract.md、revocation-continuous-evaluation.md、fail-mode-matrix.md、root-of-trust.md）、11_contracts/（authorization-api.openapi.yaml ほか、mock-contract-test-kit.md）。コードは 12_poc/code/ 配下、生データは 12_poc/data/ 配下。ポート衝突を避けるため、各試験は自分でプロセスを起動・停止し、ポートは試験ごとに固定割当（README に表を作る）。外部ネットワークへの依存は npm install のみ。秘密鍵は試験時に生成し、コミットしない。`

phase('Scaffold')
const scaffold = await agent(`${COMMON}
あなたの担当: PoC 基盤の実装（12_poc/code/）。最初に試験計画 §3・§4 を読み、全TCが必要とする部品を洗い出す。実装する部品（TypeScriptまたはJavaScript、Node 22）:
(1) AS: node-oidc-provider による OIDC/OAuth AS（PKCE、client 認証 private_key_jwt、DPoP、PAR、resource indicators、opaque access token＋introspection を token-profile/ADR-005 に従って構成。cell/issuer を2つ起動できること（issuer mix-up試験用））。
(2) STS: RFC 8693 token exchange（11_contracts/token-exchange.openapi.yaml 準拠）で内部 RFC 9068 JWT（typ at+jwt、サービス別aud、act）と Transaction Token（txn, tctx, rctx, purp）を発行。
(3) PDP façade: 11_contracts/authorization-api.openapi.yaml（AuthZEN）準拠の HTTP サーバ。バックエンドを OpenFGA アダプタと Cedar アダプタで切替可能（環境変数）。decision_id、model revision、consistency 指定、テナント境界の前段 deny（ADR-010）を実装。
(4) OpenFGA の起動スクリプトとモデル（authorization-model.md の core/tenant・core/unit・core/group・ドメイン型 folder/file 等、RS-18反映の parent 規約）と同等の Cedar ポリシー/スキーマ。
(5) PEP SDK（pep-contract.md の義務: token 検証 V1〜、tenant binding（token tid・route・resource-derived tenant 照合）、deny-by-default、decision_id 付与、txn/trace 伝播、監査送出）。
(6) サンプルサービス file-service と tool-service、gateway/BFF の最小実装。
(7) 監査パイプライン: 11_contracts/schemas/audit-event.schema.json 準拠、ハッシュ連鎖付き append-only ファイル、trace_id・decision_id・txn・jti の結合で一貫リクエスト証跡を再構成する検証スクリプト。
(8) 合成データ生成（テナント・unit木・グループ・ファイル）、共通の試験ハーネス（プロセス起動/停止、計測、生データ書出し）。
12_poc/code/README.md（POC-03）に構成、起動方法、ポート表、各部品と設計文書の対応、再現手順を書く。最後に smoke test（ログイン→token exchange→PDP→file 読取りの1経路）を実行し成功を確認する。完了したら部品一覧と smoke test 結果を返答。`, { label: 'scaffold', phase: 'Scaffold' })

phase('Tests')
const GROUPS = [
  { key: 'tenant-isolation', tcs: 'クロステナント property test、BOLA、tenant binding 関連のTC（計画§4で該当するもの）' },
  { key: 'token-misuse', tcs: 'audience 取り違え、token 横流し、issuer mix-up、JWT 負例ベクタ（alg混同、typ、kid-issuer結合、期限）、DPoP replay 関連のTC' },
  { key: 'revocation-consistency', tcs: '権限剥奪の反映遅延、stale allow 継続時間、consistency token、model migration differential、shadow 関連のTC' },
  { key: 'resilience-keys', tcs: 'PDP 障害時の縮退（fail-mode-matrix準拠）、鍵緊急 rotation、JWKS 障害 関連のTC' },
  { key: 'engine-swap-perf-audit', tcs: 'AuthZEN adapter による OpenFGA/Cedar 差替え（利用側無改修）、小規模負荷 p99/p99.9、一貫リクエスト証跡（txn/decision_id/trace_id）再構成、監査改ざん検知 関連のTC、および上記4群に属さない残りの系統1 TC' },
]
const testResults = await parallel(GROUPS.map(g => () => agent(`${COMMON}
PoC基盤は実装済み（12_poc/code/README.md を読む）。あなたの担当: 試験群「${g.key}」— ${g.tcs}。
手順: 計画§4から担当TCを特定し、TCごとに 12_poc/code/tests/${g.key}/TC-xxx.* として実装（試験は他群と独立に実行可能に）。各TCを計画どおりの回数・条件で実行し、生データを 12_poc/data/${g.key}/TC-xxx/ に保存（JSON/CSV、実行時刻、環境情報、コードの git ハッシュ）。基盤の不具合を見つけたら最小限の修正を行い、修正内容を 12_poc/code/CHANGES-${g.key}.md に記録（他群の試験を壊さないこと）。合否は計画の基準でのみ判定し、基準が TBD のものは「判定保留（値の記録のみ）」とする。中止基準に該当したら中止して記録。
返答: TCごとに {TC, 結果(合格/不合格/判定保留/中止/未実施), 主要測定値, 逸脱の有無} を一覧で。`, { label: `tests-${g.key}`, phase: 'Tests' })))

phase('Report')
await agent(`${COMMON}
あなたの担当: 12_poc/measurement-report.md（POC-02、DL-81）の作成。入力: 12_poc/data/ の生データ、12_poc/code/CHANGES-*.md、各試験群の返答: ${JSON.stringify(testResults)}
内容: 要旨（合格/不合格/判定保留/未実施の件数）、TCごとの結果表（仮説、測定値、合否、生データのパスとSHA-256、実行環境）、事前登録からの逸脱（全件、理由）、不合格・中止の分析と設計文書への影響（どのADR/ARCの見直しトリガーに当たるか）、系統2（本番相当環境）で確認すべき残り、外挿の限界（100万人規模は容量モデルと公開値からの外挿であり実測ではない）。主張タグ [M] を使い、TC-ID と生データの所在を付ける。完了したら件数を返答。`, { label: 'measurement-report', phase: 'Report' })

phase('Reproduce')
const repro = await agent(`${COMMON}
あなたの担当: 独立再現（あなたは実装者ではない）。12_poc/code/README.md の再現手順だけを頼りに、クリーンな状態（node_modules を消して npm ci 等）から全試験を再実行し、12_poc/measurement-report.md の合否・主要測定値と照合する。再現できない手順の欠落・結果の不一致・生データとレポートの食い違いを 12_poc/reproduction-log.md に記録し、レポートの誤記は修正（修正箇所に「再現時修正」と注記）。性能値は環境差の範囲を明記。完了したら再現一致件数/不一致件数を返答。`, { label: 'reproduce', phase: 'Reproduce' })
return { scaffold, testResults, repro }
