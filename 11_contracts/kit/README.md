# 契約試験キットの先行配布物（echo proxy・CV-001〜CV-014）

> 文書ID: CON-11-KIT / 版: 0.2 / 状態: draft / 最終更新: 2026-10-15（0.2: v1.1 の同期。echo proxy 0.2.0 の規則 R8（CON-03 §12 N-2 (c)）、CV-003c・CV-007c・CV-007d・CV-045（CON-16 IE-3）を加えた）
> 対応要求: G-121, G-122, G-123（CON-11 の対応表のうち、キット配布前の連携開発に効くもの）
> 依存文書: 11_contracts/mock-contract-test-kit.md（CON-11。本書の正本。版 0.12＝v1.1）, 11_contracts/authorization-api.openapi.yaml（CON-03）, 11_contracts/schemas/access-token-claims.schema.json（CON-06）, 11_contracts/schemas/common.schema.json（CON-02）, 13_integration-trial/report.md（AI による模擬連携検証。P-01・P-14・P-23・P-24・P-25、I-1・I-11・I-14）
> 作成方法: AI エージェント（Claude）が、模擬連携検証（AI が連携チームの役を演じたもの。実在の連携チームの検証ではない）で詰まった点を解消するために作成した。人による照合は未実施 [D]。

v1.1（I-1・I-11）で新設した。キット本体（MK-01〜MK-08・ドライバ。DL-120、期限 G3）の配布前に、連携チームが自分の CI で使える部分だけを先に配る [D]。本書の内容はキット本体の凍結（DEC-8）までに変わり得る。変わる場合は CON-11 の改版で知らせる [D]。

## 1. 中身

| パス | 内容 | 根拠 |
|---|---|---|
| `echo-proxy.js` | 汎用モック（Prism 等）の前に置く試験専用の中継。汎用モックの静的な応答を、契約に忠実な PEP が受け取れる形に直す（§2） | CON-11 §4.10、I-1、P-01 |
| `negative-vectors/vector.schema.json` | 試験ベクタの統一形式（JSON Schema 2020-12） | CON-11 §6.1、I-11、P-14 |
| `negative-vectors/CV-001.json`〜`CV-014.json` | 必須ベクタ 14 種の機械可読版。期待結果つき。v1.1 の同期で CV-003c（discovery が別の issuer を返す構成）、CV-007c・CV-007d（exp の境界値）を加えた | CON-11 §6.2、CON-16 IE-3 |
| `negative-vectors/CV-045.json` | Txn-Token の検証と access token との照合（write 以上。条件付き）。v1.1 の同期で新設 | CON-11 §6.8、CON-16 §1.10 EN-3・IE-3 |
| `README.md` | 本書 | — |

- 動作環境: Node.js 22 以上。外部の npm パッケージに依存しない [D]。
- 業務コードはこのディレクトリのファイルを import しない。試験コードと CI だけが使う（CON-11 MK-P4）[D]。

## 2. 汎用モックの制約と echo proxy（I-1、P-01）

### 2.1 汎用モックだけでは正例が通らない理由

契約の examples から起動した汎用モックは、要求の内容に関係なく静的な例を返す。模擬連携検証では、CON-03（v1.0）を Prism 5.12.0 で起動し、契約に忠実な PEP を向けると、正例の要求がすべて「判定が得られない」（503）になった [M]（13_integration-trial/report.md P-01。AI による模擬検証の記録で、Gate の証拠ではない）。原因は次の 5 点である。

| # | 汎用モックの応答 | 契約に忠実な PEP の判定 | 契約の規則 |
|---|---|---|---|
| 1 | `X-Request-ID` に要求の値でなく固定値（v1.0 は `string`）を返す | echo 不一致 → 判定が得られない | AuthZEN §10.1.3 の MUST、CON-03 `XRequestIdEcho` |
| 2 | `Deprecation: string`、`Sunset: string` を返す | ヘッダの形の不適合 | CON-03 の Deprecation の pattern `^@-?[0-9]{1,15}$` |
| 3 | 許可の例の `consistency.mode` が要求より弱い（v1.0 は `at_least_as_fresh` だけ） | write で格下げ → 判定が得られない | CON-03 §7、ADR-011 D6-3 |
| 4 | `evaluations` の件数が例の件数（2 件）で固定 | 要求の件数と合わない → 判定が得られない | AuthZEN §7（要求の順序どおり 1 件ずつ） |
| 5 | PDP metadata の `policy_decision_point` が例の値（`https://cell-placeholder...`） | 取得に使った識別子と一致しない → metadata を使わない | AuthZEN §9.2.3 の MUST NOT、CON-03 |

- CON-03 は v1.1 で 1〜3 の一部を契約側で直している（Deprecation・Sunset を条件付きヘッダへ移し、許可の先頭の例を `fully_consistent` の `allowWrite` にし、`X-Request-ID` の例を要求の例と同じ値にした）[D]。それでも汎用モックは要求の値を写さないので、1・4・5 は契約の例だけでは解消しない [D]。
- PEP の検査を外して汎用モックに合わせてはならない。外した検査は本番で fail-open の経路になる（CON-11 §16.2 #8）[D]。

### 2.2 echo proxy が直すもの（規則 R1〜R8）

| 規則 | 内容 | 既定 | 無効化 |
|---|---|---|---|
| R1 | 応答の `X-Request-ID` を要求の値にする。要求になければ応答から消す | 有効 | `--no-echo` |
| R2 | 形の合わない `Deprecation`・`Sunset` と、値が `string` のヘッダ（`content-type` を除く）を消す | 有効 | `--no-placeholder-headers` |
| R3 | `/.well-known/authzen-configuration` の `policy_decision_point` を proxy の URL（`--public-base`）に、同じ origin の `*_endpoint` も proxy の URL に書き換える | 有効 | `--no-metadata` |
| R4 | evaluation・evaluations の許可・拒否の `consistency.mode` が要求（要素ごとの指定、なければ上位の指定、なければ `operation_tier` が write 以上なら `fully_consistent`）より弱いとき、要求のモードに上げる。façade の格上げ（ADR-011 D6-3）を模すもので、下げることはない | 有効 | `--no-consistency` |
| R5 | evaluations の応答の件数を要求の件数に合わせる。例の要素を順に繰り返す（`--fill cycle`）か、先頭の要素だけを繰り返す（`--fill first`） | 有効（cycle） | `--no-fill` |
| R6 | `decision_id`・`batch_decision_id` を応答ごとに新しい不透明値（小文字 base32 26 文字。CON-02 OpaqueId の範囲）にする。監査の主キーの重複を避けるため | 有効 | `--no-fresh-decision-id` |
| R8 | `POST /access/v1/search/resource` の応答の `results[].type` を要求の `resource.type` に書き換える。CON-03 は返す要素の型が要求の型と一致することを契約にしており（P-20）、契約に忠実な一覧ヘルパは型の違う要素を除くため、汎用モックの静的な例（`docs/document`）のままでは自ドメインの型の正例が 0 件になる。`id` と判定は書き換えない。v1.1 の同期で追加（echo proxy 0.2.0。CON-03 §12 N-2 (c)） | 有効 | `--no-search-type` |
| R7 | 指定した経路の上流要求に `Prefer` ヘッダを付け、汎用モックが返す例を選ぶ（例: `--prefer "POST /access/v1/evaluation=example=allowWrite"`）。Prism は `Prefer: example=<例の名前>` で返す例を選べる [V][^1] | なし | — |

echo proxy がしないこと [D]:

- `decision` の値を作らない。R5 は汎用モックの例の要素を写すだけである。拒否の例を含む `--fill cycle` では、許可と拒否が交互に並ぶ。
- 負例・障害注入を再現しない。timeout・接続確立の遅延・`deny_unavailable` 等は MK-03（DL-120）か自前の PDP スタブで試す（§5）。
- 業務 API に経路・ヘッダを加えない。書換えはすべて JSON Lines の記録（既定は標準エラー、`--log` でファイル）に残す。
- loopback 以外で待ち受けない。上流（`--target`）も loopback に限る。共有 sandbox・PoC 基盤・本番の前には置けない。

### 2.3 使い方

```sh
# 1) 汎用モックを契約から起動する（Prism の版は固定する。模擬連携検証は 5.12.0）
npx --yes @stoplight/prism-cli@5.12.0 mock -p 4010 11_contracts/authorization-api.openapi.yaml
# 2) echo proxy を前に置く
node 11_contracts/kit/echo-proxy.js --target http://127.0.0.1:4010 --listen 127.0.0.1:4110 --log .mocks/echo-proxy.log
# 3) SUT の PDP の差し替え点を proxy に向ける（CON-11 §11.4。コードは変えない）
AUTHZ_PDP_BASE_URL=http://127.0.0.1:4110  <SUT の起動コマンド>
```

- 外部参照（`$ref` で別ファイル）を解けない道具には、契約を 1 ファイルにまとめた版を渡す（CON-02 の申し送り HO-I7-6 (1)）。例: `npx --yes @redocly/cli@<固定した版> bundle 11_contracts/relationship-model-registry.openapi.yaml -o .mocks/con04.bundled.yaml` [D]。`@latest` は CI で使わない（判定の再現のため。CON-11 MK-P5）[D]。
- CON-05（STS）・CON-04（Registry）の汎用モックの前にも置ける。R1・R2 だけが効き、R3〜R6 は CON-03 の経路にだけ効く [D]。

### 2.4 動作の確認記録（2026-10-15、本書の作成者による自己実行）

| 構成 | 書込み（作成、write） | 閲覧（read-sensitive） | 一覧（3 件、evaluations） |
|---|---|---|---|
| CON-03 v1.0（タグ `v1.0-submission`）を Prism 5.12.0 で起動し、模擬連携検証の PEP（`13_integration-trial/expense-service`）を直接向けた | 503（`request_id_mismatch`） | — | 503 |
| 同じ Prism の前に echo proxy を置き、PEP の検査は変えず、模擬連携検証の迂回 W-1・W-2 を使わない | 201 | 200 | 200 |

- 閲覧の行の「—」は、作成が失敗したため閲覧の対象がなかったことを示す。Registry（CON-04 v1.0）は別の Prism で起動した [M]（AI エージェントによる自己実行。立会人なし。生データは作成者の一時作業領域にあり版管理していない。Gate の証拠ではない）。
- 記録した書換えは R1（`string`→要求の値）、R2（`Deprecation`・`Sunset`）、R3（metadata の 4 欄）、R4（write の `at_least_as_fresh`→`fully_consistent`）、R5（2 件→3 件）、R6 だった [M]。

## 3. 応答の型（v1.1、P-25）

ベクタの `expect.response_profile` は次の型を指す。正本は CON-11 §6.1 で、本節はその写しである [D]。

| 型 | 状態コード | ヘッダ | 本文 | 根拠 |
|---|---|---|---|---|
| `auth_failure`（token を提示したが検証に失敗） | 401 | `WWW-Authenticate` を必ず付ける。auth-scheme は `Bearer`（DPoP 束縛の token では `DPoP`）で、`error="invalid_token"` を付ける。`error_description`・`error_uri` は付けないか、全ケースで同じ値にする | なしか、`application/problem+json`（CON-02 Problem）で `code`=`invalid_token`。`detail` に失敗の理由を書かない | RFC 6750 §3（WWW-Authenticate の MUST）・§3.1（invalid_token は 401 を SHOULD）[N][^2]、RFC 9449 §7.1 [N][^3] |
| `missing_credentials`（token なし） | 401 | `WWW-Authenticate` を付け、`error` を付けない | 同上 | RFC 6750 §3.1（認証情報のない要求には error を付けない SHOULD NOT）[N][^2] |
| `resource_denied`（他テナント・不存在・権限なし・L0 不一致） | K06-4 の決裁まで固定しない（既定案 404） | 同じ群の全ケースで同一 | 同じ群の全ケースで同一 | ARC-06 §3.10、ADR-012 D12-39 |
| `no_decision`（判定が得られない） | write 以上は 503＋`Retry-After`。read-sensitive も KD13-6 の決裁までは 503 | `Retry-After` | 理由を書かない | ADR-013 D13-25、CON-11 L11-5 |
| `success` | 契約・業務の正常応答 | — | — | — |

- 同一性の比較（`same_as_group`）では、`request_id`・`instance`（Problem の欄）と `Date`・`traceparent`・`X-Request-ID` のヘッダを除いて比べる [D]。token の拒否の理由（署名・期限・aud・typ など）で応答が変わると、攻撃者に検証の段を教えることになるため、`auth_failure` の全ケースを 1 つの群（`token_reject`）で比べる [D]。

## 4. 置換子の語彙

ベクタの `{{...}}` は実行時に fixture（CON-11 §4.9）・manifest（§7.2）・SUT の設定から埋める。consumer はベクタを編集しない [D]。

| 置換子 | 値 |
|---|---|
| `{{sut.audience}}` | SUT の aud（CON-11 §11.4 `AUTH_SERVICE_AUDIENCE`） |
| `{{other.audience}}` | fixture の別サービスの aud |
| `{{issuer.other}}` | どの discovery にもない issuer URL |
| `{{key.A.current.kid}}` | issuer A の現行鍵の kid |
| `{{tenant.1}}`・`{{tenant.2}}` | fixture の 2 テナントの tid（CON-02 IssuedTenantId の形） |
| `{{resource.t1.own}}`・`{{resource.t2.existing}}`・`{{resource.absent}}` | fixture adapter（CON-11 §6.4）が作った資源の ID と、存在しない ID |
| `{{manifest.operation.read}}`・`{{manifest.operation.write}}` | manifest に書いた read-sensitive・write の操作 |
| `{{now-3600}}` など | 実行時刻（Unix 秒）からの差 |
| `{{profile.below_min}}` | SUT の最低受理版より古い major の版（例 `0.9`） |
| `{{dpop.key.jkt}}` | DPoP 鍵の thumbprint |
| `{{rp.callback}}`・`{{issuer.A.token_endpoint}}` | RP の redirect 受付、issuer A の token endpoint |

## 5. MK-01〜MK-08 の配布前にベクタを流す（自前スタブ）

- 各ベクタの `stub_requirements` を満たす自前スタブを作れば、CV-001〜CV-014 を自分の CI の単体・結合試験として先に流せる [D]。合否はキット配布後の判定（CON-11 §10.1）に代えない [D]。
- 最低限のスタブは、issuer A・B の discovery と JWKS（別々の origin）、token の鋳造器、注入を切り替えられる PDP スタブ、TCP の accept を遅らせる中継、スタブへの取得の記録である [D]。模擬連携検証の `13_integration-trial/expense-service/test/harness.js` は一例で、契約ではない [D]。
- **CV-003 と CV-011 の区別（v1.1、P-23）**: CV-003 は iss だけが違い署名は issuer A の正規の鍵で作る。CV-011 は issuer B を実際に起動し、B の鍵で正しく署名した token を提示して、SUT が B の discovery・JWKS を 1 回も取得しないことまで確かめる。B を起動しないまま流した CV-011 は、CV-003（iss の不一致）や CV-005（未知の kid）と区別できないので合否に数えない [D]。

## 6. 認可モデルの試験と fga CLI（v1.1、P-24）

- 認可モデル（OpenFGA DSL）の試験は、OpenFGA の公式 CLI `fga` の `fga model test --tests <ファイルか glob>` で行う（INT-03 §15、ADR-011 D2-4）[V][^4]。
- 版: キットの既定は **openfga/cli v0.8.1**（2026-09-24 公開。standards-status SS-K05 の記録と同じ）に固定する [V][^4][^5]。INT-03 §9.0 の作成者の予備実行は v0.7.4 だった。版で試験の結果が変わり得るので、判定記録に `fga version` の出力を残す [D]。CLI に内蔵された engine の版と PoC の OpenFGA（v1.21.0、CON-11 §1.2）の版の対応は本書では確かめていない（未確認）[D]。
- 入手方法（openfga/cli の README による）[V][^4]: Homebrew（`brew install openfga/tap/fga`）、Windows の Scoop（`scoop install openfga`）、Linux の `.deb`・`.rpm`・`.apk`（releases ページ）、Docker（`openfga/cli`）、Go（`go install github.com/openfga/cli/cmd/fga@v0.8.1`。README の例は `@latest` だが、キットでは版を固定する）、releases ページの実行ファイル。Docker のイメージも版のタグを付けて使い、`latest` を使わない（タグ名は Docker Hub で確かめる。本書では未確認）[D]。
- モデルの試験の合格は、アプリの契約試験（MK-03 は tuple と許可表で判定し、モデルの意味論を評価しない。INT-06 FQ-43）の合格と別に記録する [D]。

## 7. 変更履歴

| 版 | 日付 | 内容 |
|---|---|---|
| 0.1 | 2026-10-15 | v1.1（I-1・I-11・I-14 の一部）で新設。echo proxy 0.1.0、CV-001〜CV-014 の先行配布、応答の型、置換子、自前スタブの条件、fga CLI の版 |
| 0.2 | 2026-10-15 | v1.1 の同期（AI エージェント）。echo proxy 0.2.0 で R8（search の結果の型）を追加し、ダミーの上流に対する自己実行で `results[].type` が要求の型に替わることと書換えの記録を確かめた（作成者による自己実行）。CON-16 IE-3 の CV-003c・CV-007c・CV-007d と CV-045 を加え、全ベクタが `vector.schema.json` に適合することを jsonschema で確かめた。期待結果を変えた既存のケースはない（追加だけ）[D] |

## 参考文献

[^1]: Stoplight『Prism — Mocking: Response Examples』stoplightio/prism, docs/guides/01-mocking.md（master ブランチ）. https://github.com/stoplightio/prism/blob/master/docs/guides/01-mocking.md （参照箇所: Response Generation — Response Examples（`Prefer` ヘッダの `example=` で返す例を選ぶ）、確認日: 2026-10-15。research ノート未収録。模擬連携検証で使った 5.12.0 の文書との差は未確認）
[^2]: M. Jones, D. Hardt / IETF『The OAuth 2.0 Authorization Framework: Bearer Token Usage』RFC 6750, Standards Track, 2012-10. https://www.rfc-editor.org/rfc/rfc6750 （参照箇所: §3（保護資源の要求が認証情報を含まないか有効な access token を含まない場合、資源サーバは WWW-Authenticate を含めなければならない MUST）、§3.1（invalid_token は 401 で応答すべき SHOULD。認証情報のない要求には error を含めるべきでない SHOULD NOT）、確認日: 2026-10-15。research ノート未収録のため本書の作成者が RFC Editor の原文で確認した）
[^3]: D. Fett ほか / IETF『OAuth 2.0 Demonstrating Proof of Possession (DPoP)』RFC 9449, Standards Track, 2023-09. https://www.rfc-editor.org/rfc/rfc9449 （参照箇所: §7.1（DPoP 束縛の token の検証に失敗した要求への 401 と `WWW-Authenticate: DPoP error="invalid_token"` の例）、確認日: 2026-10-15。本書の作成者が RFC Editor の原文で確認した）
[^4]: OpenFGA『openfga/cli』README, GitHub（main ブランチ）. https://github.com/openfga/cli （参照箇所: Installation（Homebrew・Linux パッケージ・Scoop・Docker・Go・手動）、Models — Test（`fga model test --tests`）、確認日: 2026-10-15）
[^5]: OpenFGA『openfga/cli Releases』GitHub. https://github.com/openfga/cli/releases （参照箇所: v0.8.1（Latest、2026-09-24）、v0.8.0（2026-09-18）、確認日: 2026-10-15。standards-status.md SS-K05 は同じ版を 2026-10-03 に記録）
