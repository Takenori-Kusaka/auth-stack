# 並行開発可能性の模擬実地検証 v1.1 再検証（会議室予約サービス）

> 文書種別: 検証記録 / 対象: 提出版 v1.1（2026-10-15 時点の作業ツリー。HEAD `33e06ea` に未コミットの変更を重ねた状態） / 作成日: 2026-10-15
> **これは AI による模擬検証である。** 「認証認可基盤にこれから依存する新規サービスの開発チーム」の役を AI エージェント（Claude）が演じた。実在の連携チームによる検証でも、キット本体（DL-120）による判定でも、Gate の証拠でもない。試験はすべて立会人なしの自己実行である。
> 読んだ範囲: 10_integration/ と 11_contracts/ だけ。12_poc/code、04_architecture、05_adr、13_integration-trial/ の既存ファイル（前回の報告と expense-service）は読んでいない。

## 0. 結論

| 項目 | 結果 |
|---|---|
| **判定** | **条件付きで可**。5 機能のうち 3 機能（拠点・フロア・会議室の階層、予約の作成・取消・一覧、予約リマインドの非同期通知）は、10_integration と 11_contracts だけで設計・実装・単体試験・負例試験まで進められた。残る 2 機能（他テナントの外部ゲスト招待、AI アシスタントによる代理予約）は契約に足りないものがあり、正例の経路を実装できなかった。どちらも fail-closed（501 と 403）で止めている |
| 詰まった点 | **重大 2 件、中 6 件、小 13 件**（§5） |
| 迂回の要否 | **不要**。PEP・token 検証の検査を外したり緩めたりする迂回は 0 件である。試験側では、キットが用意した手段（echo proxy の R1〜R8、`Prefer` による例の選択、自前スタブ ST-1〜ST-8）だけを使った。重大 2 件は迂回しなければ実装できないが、迂回はせず未実装として残した |
| 試験 | キットのベクタ（CV-001〜CV-014・CV-045）は 49 ケース中 45 ケース合格、4 ケース対象外、不合格 0 件。自前で 1 ケースを加えて合格（CV-045a-own）。ドメインの正例・負例 23 件はすべて合格。`fga model test`（openfga/cli v0.8.1）は 3 試験・30 check・ListObjects 1 件がすべて合格。CamModule は CON-04 のスキーマに適合。汎用モック（Prism 5.12.0 と echo proxy）での正例の形の確認は 11 段中 9 段が通った。通らなかった 2 段の原因は中 M-1 と M-2 である |

前回（経費精算、v1.0）で詰まった点の多くは解消していた。

- 入口が 1 枚になった。
- 04_architecture を読まずに SDK なしで実装できた（CON-16）。
- echo proxy で汎用モックの正例が通る。
- 負例ベクタが JSON で配られている。
- 差し替え点と設定文書のスキーマが定まった。
- TTS の JWKS と受付記録の登録 API が加わった。

今回の新しい詰まりは、前回の題材になかった次の 3 領域に集中した。

- 越境ゲスト（P-16）
- AI エージェント（P-08）
- 遅延実行の通知（P-04/P-05 と §3.9）

## 1. 題材と作ったもの

| 機能 | 内容 | entry point | 主パターン（付加） | 階層 |
|---|---|---|---|---|
| F1 | 拠点 → フロア → 会議室の階層 | モデルと fixture | — | — |
| F2 | 予約の作成・閲覧・取消・一覧 | EP-RSV-01〜04 | P-01（P-09） | write / read-sensitive |
| F3 | 他テナントの外部ゲスト招待と、ゲストによる閲覧 | EP-RSV-05、EP-RSV-02 | P-16（P-01） | write / read-sensitive |
| F4 | AI アシスタントによる代理予約 | EP-RSV-01〜03 | P-01（P-08） | write |
| F5 | 予約リマインドの非同期通知 | EP-RSV-06 | P-04（P-24、INT-02 §3.9） | read-sensitive |

成果物はすべて `13_integration-trial/room-booking/` にある。

| パス | 内容 |
|---|---|
| `ledger/entry-points.json` | entry point 台帳 |
| `CONTRACTS.lock.json` | 使う契約と、ファイルごとの SHA-256 |
| `model/rsv.cam.json` | 認可モデル草案（CON-04 CamModule の形） |
| `model/rsv.fga.yaml` | 同じモデルの OpenFGA DSL と試験 |
| `scripts/validate-cam.py` | CON-04 のスキーマ検証と AN-5 の検査 |
| `src/*.js` | 最小実装（Node.js 22、外部依存なし） |
| `test/*.js` | 自前スタブ、ベクタの実行器、ドメインの試験 |
| `scripts/prism-positive.mjs` | Prism と echo proxy による正例の形の確認 |
| `vector-results.json`、`prism-results*.json` | 実行結果の生データ |

## 2. 使った文書と節

| 順 | 文書 | 節 | 使い道 |
|---|---|---|---|
| 1 | INT-00 | 冒頭「実装者向けの入口（1 枚）」、§3、§6.1〜§6.4 | 手順 1〜7 の骨組み、モックの起動、スタブの条件 |
| 2 | CON-00 | 冒頭「実装者向けの契約早見表」 | 使う契約の特定 |
| 3 | INT-02 | §2.1、§2.3、§3.7（AN-1〜AN-5、SM-1〜SM-5）、§3.8、§3.9（BN-1〜BN-9、NP24-4〜7）、P-04、P-05、P-08、P-16 | パターンの選択、主体と操作の書き方、一覧、業務通知、非同期、AI、越境 |
| 4 | INT-03 | §3.1〜§3.2、§4（N-1〜N-26）、§9.2、§10.1（XS-1〜XS-9、LS-1〜LS-6）、§15 | モデル草案、命名、越境と一覧の規則、試験の手順 |
| 5 | INT-06 | FQ-54、FQ-55、FQ-79 | 越境と写像の確認 |
| 6 | CON-16 | §1〜§5（全体） | SDK なしの実装の本体。抜粋だけで実装できた |
| 7 | kit/README.md | §1〜§6 | echo proxy、ベクタ、応答の型、置換子、fga の版 |
| 8 | CON-11 | §11.4、§11.6.1、§11.6.2 | 差し替え点、設定文書のスキーマ |
| 9 | CON-03 | evaluation・evaluations の例、`Subject`・`SubjectProperties.actor`・`Action`・`ProfileRequest`・`Reason`・`XRequestIdEcho` | PDP 要求の組み立てと応答の検査 |
| 10 | CON-02 | `x-subject-type-map`、`x-notation-canon` | 主体の型の写像、tid と tier の表記 |
| 11 | CON-06 | `internalAccessTokenClaims`・`actor`・`txnTokenClaims`・`txnContext`・examples | 検証すべき claim。3 つ目の例が AI 委任の token |
| 12 | CON-05 | `/txn-token`、`/txn-token-jwks`、`/acceptance-records`、`x-open-issues`、`x-test-signing-key` | 内部開始、受付記録、TTS 鍵 |
| 13 | CON-04 | info §3、`writeRelationships`、`CamModule` ほかのスキーマ | 越境の書込み規則、モデルの形 |
| 14 | CON-08 | `DetailEnforcement`、`Correlation`、`x-enforcement-without-decision`、`x-ref-derivation`、examples | E2 の形 |

必要な節だけを読んだ。全文を通読したのは CON-16 と kit/README.md だけである。前回の P-18（分量と入口の分散）は、入口の 1 枚と早見表で実用上ほぼ解消していた。

## 3. 手順の記録

### 3.1 パターン選択

- 予約の画面は Q10 → P-01 とした。
- 代理予約は Q6（P-08）に当たるが、同じ entry point なので主パターンは P-01 とし、P-08 の義務を重ねた（§2.3 の規則 1・2）。
- ゲストは Q5 → P-16、一覧は付加 X1 → P-09 とした。
- リマインドは §3.9 により P-24＋P-04 とした（Q15 の注記で、P-19 ではないことが明確だった）。
- 迷ったのは非同期の型（A1〜A4）だけである（M-4）。

### 3.2 認可モデル

- 型は `rsv/site`・`rsv/floor`・`rsv/room`・`rsv/booking` の 4 つで、包含は `parent` でつないだ（X-11）。
- 動詞の permission は `book`・`view`・`configure`・`cancel`・`invite_guest` である。
- 保持者集合 `administrators`・`bookers` は catalog に載せない（N-23・N-24）。
- ゲストは `guest: [core/external_grant#grantee]` を `view` だけに到達させた（XS-1・XS-2）。
- テナント管理者の継承は、CON-16 の代替定義にある `core/tenant#manage` に頼った（IE-5 は未反映。L-10）。
- fga では 3 試験・30 check・ListObjects 1 件が合格した。CamModule のスキーマの誤りは 0 件だった。

### 3.3 実装

token 検証:

- CON-16 §1.2 の 11 段どおりに書いた。
- 期待値は差し替え点と `verifier-config/1`・`failmode-config/1` からだけ読む。
- EN-1・EN-2・EN-3 に対処した（exp に時刻差を足さない、discovery の issuer が設定と違えば起動しない、Txn-Token は TTS の鍵族で検証してから読む）。

PEP:

- §2.1 の順序どおりにした。
- write 以上では Txn-Token が必須で、`tctx.tid` の照合は bind_tenant の最初に行う。
- 判定が得られない 8 条件をすべて実装した。
- 拒否と不存在は同じ 404、判定が得られないときは 503 と Retry-After を返す。

一覧:

- PP-2 で作った。候補は自 DB から L2 で絞り、evaluations の `execute_all` で後段 Check する。search は呼ばない。

監査:

- E2 は CON-08 v1.1 の decision_source・no_decision_cause・txn/txn_absence を書く。
- 参照値は試験用の固定表から入れる。

リマインド:

1. 予約の作成時に、元の Txn-Token を添えて `registerAcceptanceRecord`（A1）を呼ぶ。
2. outbox に参照だけを書く。
3. 実行時に内部開始の Txn-Token を得て、検証する。
4. 三者一致を確かめる。
5. BN-4 の状態（取消・テナント停止）を確かめる。
6. BN-3 の再 Check（`book`）をする。
7. 最小の本文でアプリ内通知を送る。拒否と判定不能はデッドレターと監査に回す。

### 3.4 キットとモック

- Prism と echo proxy は kit/README.md の手順どおりに動いた。CON-03 の経路では R1・R3・R5・R6・R7 による書換えが記録された。
- 負例ベクタは JSON のまま読み込め、置換子も過不足なく埋められた。

## 4. 試験結果

### 4.1 キットのベクタ（自前スタブ）

| 範囲 | ケース | 結果 |
|---|---|---|
| CV-001〜008、010、011a・b、013、014 | 30 | 全件合格 |
| CV-003c | 1 | 合格（起動を拒否した） |
| CV-012a・b・d〜o（write と read-sensitive の両方で流した） | 14 | 全件合格。判定が得られないものは 503 と Retry-After、deny と剥奪は 404 |
| CV-045a・b | 2 | 合格。ただし CV-045a は署名で落ちた（deny_token。M-3） |
| CV-045a-own（自前） | 1 | 合格（deny_l0:mismatch、PDP の呼出し 0 回） |
| 対象外 | 4 | CV-003b、CV-009a、CV-011c、CV-012c |

- CV-012b は非到達アドレスに向けたが、Windows ではすぐに unreachable が返るため、本当の接続確立の遅延にはなっていない（L-11）。
- CV-005a は、JWKS の取り直しの最短間隔を 0 にした設定で流した。

### 4.2 ドメインの試験（23 件すべて合格）

| 機能 | 主な試験 |
|---|---|
| F2 | 作成 201（`book`、`core/user`、`fully_consistent`）。Txn-Token なしは 401（業務処理 0、PDP 0、`txn_absence`）。受付台帳の停止時は 503 で予約を作らない。他テナントと不存在で応答が同一。一覧の後段 Check で拒否分を除く。件数不一致は 503（空の一覧にしない） |
| F3 | 資源側 token のゲストは、付与があれば 200。NP16-1、NP16-6。招待は 501 |
| F4 | act.ptype=ai_agent は PDP 0 回で 403。Txn-Token のないエージェントの読取りは 401。sub が ai_agent なら 403。NP08-7 |
| F5 | 再 Check のあと 2 名へ最小の本文で通知。取消済みと NP24-6 は送らない。NP24-7、NP04-2。TTS の停止は保留にして再試行 |
| 共通 | NP09-4a、AN-5、監査の不適合 0 件 |

### 4.3 汎用モック

| 段 | 既定の例 | `Prefer: example=oneItem` |
|---|---|---|
| 起動、R3 による metadata の照合 | OK | OK |
| 作成（allowWrite と受付記録 201） | OK | OK |
| 閲覧 | OK | OK |
| 一覧 | **NG 503**（M-1） | OK |
| 取消 | OK | OK |
| リマインド（Prism の TTS で内部開始） | **NG**: txn_expired（M-2） | **NG**（同じ） |
| 監査の形 | OK | OK |

## 5. 詰まった点

区分の目安は次のとおり。

- 重大: 契約だけでは機能の正例経路を作れない。
- 中: 自力で回避したが、読み違いや本番での失敗につながり得る。
- 小: 手間や記録の問題にとどまる。

### 重大（2 件）

| ID | 詰まった点 | 根拠 | 扱い |
|---|---|---|---|
| **C-1** | **外部ゲストを招待する（`core/external_grant` を作る）契約 API がない。** CON-04 は、越境の tuple を「façade が external_grant を書く場合を除き拒否」とする。しかし依存サービスが façade に外部付与を作らせる operation がない。P-16 は `writeRelationships` を挙げるだけで、書き方の例も、ゲストの sub を知る手段もない。招待の受諾は AS の機能で、依存サービスからは呼べない（INT-02 §3.9.1、FQ-81）。`booking#guest` の tuple を誰が書くのかも分からない | CON-04 info §3・writeRelationships、INT-02 P-16、CON-16 §3.2、INT-03 XS-1 | 招待は 501 で止めた。閲覧の側（NP16-1・6）は試験できた。迂回しなければ進めないが、迂回はしていない |
| **C-2** | **AI の代理予約を、正規の書き方で判定に進められない。** CON-06 の例 3（sub=human、act.ptype=ai_agent）がまさに代理予約の token である。CON-03 の `subject.properties.actor` は type と id が必須だが、CON-02 は ai_agent を null（推測せず拒否）とするため、actor.type を書けない。CON-02 は actor を「context 側」とし、CON-03 の欄（subject.properties）と食い違う。P-08 の「grant ∧ 自律度区分」を誰がどの欄で評価するのかも書かれていない | CON-03、CON-02 `x-subject-type-map`、CON-06 examples[2]、CON-16 §2.5・U-1、INT-02 P-08・SM-3 | 全件 403（PDP 0 回）。actor.type を推測で埋めるか省くしかなく、どちらも SM-3 に反するので迂回していない |

### 中（6 件）

| ID | 詰まった点 | 扱い |
|---|---|---|
| M-1 | CON-03 の evaluations の既定の例 `mixed` は、存在しない資源を `deny_indeterminate` で返し、「存在しないと権限なしを同じ応答に」と説明する。一方、CON-16 §2.6 は deny_indeterminate を「判定が得られない」とし、一覧は利用不可（503）になる。どちらに従うべきか契約から決められない | PEP は厳格なまま（503）にした。正例の形は kit R7 の `oneItem` で確かめた |
| M-2 | CON-05 の `/txn-token` の例の Txn-Token は静的な値で、exp=iat+60 のためすでに期限切れである。tid・sub・ptxn もメッセージと一致しない。echo proxy は CON-05 の本文を直さないので、内部開始の正例は汎用モックでは通らない | 自前の ST-2 で試験した |
| M-3 | CV-045a と CV-010 は Txn-Token を `A.current`（access token の issuer の鍵）で署名すると指定している。鍵族の分離に忠実な SUT は署名で落とすので、EN-3（l0_mismatch）を検出できない。CV-010 の stub_requirements（「TTS 役の鍵で」）とも食い違う | 自前ケース CV-045a-own を加えた |
| M-4 | 遅延実行（数日後のリマインド）の型が決められない。受付記録の登録は A1・A2 だけで、受付記録の有効期限は TBD である。A2 の委任 grant を作る契約も、job_definition_id を登録する手段もない。A1 は元の Txn-Token（60 秒）の寿命内に登録する必要があるため、予約の作成が受付台帳の可用性に結合する | A1 として実装し、台帳の停止時は予約を 503 にした |
| M-5 | 連絡先の解決の契約がなく（BN-7）、アプリ内通知しか使えない。外部ゲストにはリマインドを事実上送れない | 宛先は同じテナントの主催者と参加者に限った |
| M-6 | 監査の参照値 API（subj_ref・res_ref・jti_ref）が未作成で、`cell_id`・`jurisdiction` の出所もない | 試験用の固定表と仮の値で埋めた |

### 小（13 件）

| ID | 詰まった点 |
|---|---|
| L-1 | v1.1 の契約は未コミットで、コミットでは固定できない。SHA-256 で固定した |
| L-2 | 受付台帳の差し替え点の名前が CON-11 §11.4 にない。`AUTH_JOB_LEDGER_URL` と独自に命名した |
| L-3 | issuer の期待値の出所が CON-16 §1.8 と CON-11 §11.6.2 で異なる。discovery URL から導いた |
| L-4 | CON-08 の `no_decision_cause` に「写像が未決のため PDP を呼ばない」に当たる値がない |
| L-5 | Txn-Token は主体種別を持たないので、consumer の再 Check で subject.type を決められない。保存した subject_type 列で代替した |
| L-6 | Txn-Token が無い・不正なときの応答コードが未定義。CV-012 の write ケースも Txn-Token の付与を規定していない |
| L-7 | CON-08 の examples に `can_update`・`can_submit` が残っている |
| L-8 | INT-02 P-16 のモデル例 `[core/external_grant]` が、CON-16 と INT-03 の `#grantee` 付きの書き方と食い違う |
| L-9 | 拠点を core/unit で表すかドメイン型で表すかの判断材料がない。`org` 名前空間の所有者も不明。ドメイン型を選んだ |
| L-10 | テナント管理者の配下への継承が、正本に未反映の代替定義（IE-5）に依存する |
| L-11 | CV-012b の接続確立の遅延を Windows のスタブで再現できない |
| L-12 | go install した fga の `fga version` が dev と表示される。32 bit の Go ではパニックした |
| L-13 | 代理予約で本サービスが受ける token の種別（P-08 の「外部 AT」か、CON-16 §1.1 の K3 か）が読み取れない |

### 前回からの変化

前回の報告は読んでいない。v1.1 の文書に書かれた P-xx の記述から照合した。

- 解消を確認した: P-01、P-02、P-03、P-05・P-06（人の主体について）、P-10、P-11、P-14、P-17、P-18、P-24。
- 形を変えて残る: P-06 の ai_agent（C-2）、P-11 の内部開始の正例（M-2）、P-03 の参照値 API（M-6）、P-10 の差し替え点の欠け（L-2）。

## 6. 判定の根拠と条件

可とした範囲: F1・F2・F5 は、PEP の検査を一切外さずに実装と試験ができた。キットのベクタは対象外の 4 ケースを除いて全件合格した。

条件: 次の 3 点が契約で決まるまで、F3 と F4 は着手を保留した。

1. 外部付与の作成経路（C-1）
2. AI 委任の actor の写像と、grant 評価の分担（C-2）
3. evaluations の要素ごとの不存在の reason（M-1）

改善の候補（本書は他の文書を編集していない）:

1. 外部付与の作成・取消の operation と、ゲストの sub の受け渡しを定める（C-1・M-5）。
2. ai_agent の暫定の型か、actor の暫定の写像を置き、grant・自律度の評価の分担を CON-03 に書く（C-2）。
3. `mixed` の 2 件目を `deny_no_relation` にするか、要素単位の扱いを CON-16 §2.6 に書く（M-1）。
4. echo proxy に CON-05 の Txn-Token の再署名を加える（M-2）。
5. CV-045a・CV-010 の signer を TTS の鍵に改める（M-3）。
6. CON-11 §11.4 に受付台帳の差し替え点を加える（L-2）。

## 7. 再現

```sh
cd 13_integration-trial/room-booking
node --test --test-concurrency=1 test/*.test.js
python scripts/validate-cam.py
fga model test --tests model/rsv.fga.yaml
node scripts/prism-positive.mjs
node scripts/prism-positive.mjs --prefer-oneItem
```

実行環境: Windows 11、Node.js 22.23.2、Python 3.14（jsonschema 4.26.0）、Prism 5.12.0、openfga/cli v0.8.1（amd64、内蔵 openfga v1.21.0）。実行日は 2026-10-15。

ベクタの SHA-256 は `CONTRACTS.lock.json` に記録した（CV-045.json は dbbf473a…）。