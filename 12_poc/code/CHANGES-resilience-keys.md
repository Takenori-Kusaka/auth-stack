# 基盤への変更記録（試験群 resilience-keys）

> 対象: 12_poc/code（POC-03）の基盤。試験群 resilience-keys（TC-010・TC-014・TC-015）の実装中に見つけた不足・不具合に対する最小限の変更。
> 方針: 設計の正本（05_adr、04_architecture）が求めているのに基盤に無かったものだけを足す。既定の挙動を変えるものは、他群の試験に影響しないこと（意味が変わらないこと、または明示の設定でだけ有効になること）を確かめてから入れた。RK-01〜RK-07 は測定（凍結 manifest の作成）より前に行った。RK-08〜RK-10 は TC-010 の正式な実行（不合格）を見た後に行い、その後の TC-010 の実行は参考扱い（計画 §2.4）とした。TC-015 は RK-08〜RK-10 の後に凍結・測定した（データ閲覧前の再凍結）。TC-014 は RK-08〜RK-10 の前の版で測定した。
> 作成方法: AI エージェント（Claude）による自己レビュー。実在の CTO/CISO・独立立会人の確認を経ていない。

| # | ファイル | 変更 | 理由（正本） | 既定の挙動・他群への影響 |
|---|---|---|---|---|
| RK-01 | `pdp/adapters/cedar.js` `check()` | (1) 要求が参照する entity（資源属性の値、parents）を、所属者のない userset も含めて明示的に entity 集合へ入れる。(2) slice 確定後に、参照される entity が 1 つでも欠けていれば評価せず `indeterminate`（façade では `deny_indeterminate`）を返す（entity 完全性検査） | ADR-011（Cedar を使う場合は「schema 検証と entity 完全性検査も必須」、RS-07#40/#41）、authorization-model.md C-5。Cedar は欠けた entity を空集合として扱うため、除外条件 `!(principal in X)` や forbid が黙って効かなくなり得る。TC-010 の仮説「entity 欠落で forbid が skip されて allow になる経路が完全性検査で塞がれる」の対象 | (1) は所属者のない entity を足すだけで `in` の意味は変わらない。`npm run selftest`（OpenFGA・Cedar・参照評価器の 1,507 件一致）を変更後に実行し、合格（不一致 0）を確かめた。(2) は故障注入（`dropEntityPrefix`）がない限り発火しない |
| RK-02 | `pep/sdk.js` | FM-13（誤った応答）の既知解判定: 環境変数 `PEP_KNOWN_ANSWER`（既知 allow と既知 deny の要求の組、間隔）を与えたときだけ、PEP が定期的に façade へ既知解の判定を流し、不一致なら PDP を不達と同じに扱い（全要求を `pdp_suspect` で 503）、`pep/<svc>-alarms.jsonl` に alarm を書く。2 回連続で一致したら解除。あわせて façade の model registry（`GET /v1/models`）の写しと判定の `model_revision` を照合し、版の不一致（後退）も不達扱いにする | ADR-013 D13-27、fail-mode-matrix §3.4・§3.5・§6.13（各 cell の PEP は合成テナントへの既知解の判定要求を定期的に流し、一致しない PDP は不達と同じ扱い）。基盤の PEP SDK には無かった | 既定（環境変数なし）では何もしない。他群の試験は影響を受けない。配布の freeze（D13-27）は PoC に配布 pipeline がないため alarm に「requested_not_modelled」と記録するだけ。allow 率・deny 率の急変の検知（D13-27 の 2）は未実装 |
| RK-03 | `lib/http.js` `request()`、`lib/jwt.js` `JwksCache`・`verifyInternalToken`、`pep/sdk.js`、`sts/server.js` | JWKS 取得先のサーバ識別子の固定: issuer 設定に `jwksPeer`（SPIFFE ID）を持たせ、JWKS の取得時、TLS の完全ハンドシェイクでサーバ証明書の URI SAN を照合し、一致しなければ取得失敗として扱う（前回値を使い続ける）。固定ごとに別の HTTPS agent を使い、TLS セッション再開は照合済みの相手に限る。PEP SDK と STS は `spiffe://poc.test/w/sts` を指定 | ADR-007 D7-21（内部の検証点は L1 署名付き鍵マニフェストで鍵集合を検証し、JWKS の差替えを TLS と配布経路の侵害から切り離す）、TC-07-16、T-042。基盤は CA の検証だけで、同じ CA の別ワークロードの証明書（全証明書が IP SAN 127.0.0.1 を持つ）で JWKS を差し替えられた。署名付き鍵マニフェスト（D7-21 本体）は PoC に無いため、その代替として最小の固定を入れた（残る差分は TC-014 の結果に記録） | `jwksPeer` を指定しない呼出しは従来どおり。PEP・STS の JWKS 取得先は正規の STS なので、他群の通常経路の結果は変わらない |
| RK-04 | `lib/keys.js` `remove()`・`noteSigned()`、`lib/jwt.js` `signJwt()`、`sts/server.js` 管理 API `remove` | 鍵ごとに署名した token の最大 `exp` を記録し、`checkInUse` 指定時は未失効の token が残る鍵の JWKS 撤去を 409 `in_use` で拒否する。STS では設定 `keyRemovalInUseCheck` または要求の `check_in_use: true` で有効 | ADR-007 D7-35 の撤去条件 2（未失効・未期限切れの token が 0 件）の一部。TC-014 手順 (4)「使用中の鍵の撤去」 | 既定は無効（設定・要求で指定したときだけ）。retain の印は従来どおり `force` なしでは外せない（管理 API から `force` は渡せない） |
| RK-05 | `lib/keys.js` `activate()` | `retiring`（公開中で署名に使っていない）鍵の再有効化を許す | ADR-015 D15-71 手順 4（巻戻し: 旧鍵は公開したままなので戻しも利用側無改修で済む）と手順 5（再切替）。従来は `pending` の鍵しか有効化できず、巻戻しのたびに新しい鍵を作る必要があった | 従来 409 だった操作が成功するようになるだけで、他の遷移は変わらない |
| RK-06 | `lib/keys.js` `rollIfAged()`、`sts/server.js` 署名箇所 | 鍵年齢の硬上限: 設定 `keyMaxAgeMs` があるとき、署名前に現用鍵の年齢を見て、上限を超えていれば事前公開済みの同じ alg の次鍵へ切り替える。次鍵がなければ署名を続け、Sev-1 の事象（`hard_limit_no_next_sev1`）を鍵台帳に 1 回記録する | ADR-007 D7-32（硬上限に達しても発行は止めず next 鍵へ切り替える。next 鍵がない状態は Sev-1）、TC-07-13、TC-014 の合否「鍵年齢の硬上限で発行エラー 0 件」。基盤に硬上限の処理がなかった | 既定（設定なし）では何もしない |
| RK-07 | `state/server.js`、`lib/revocation.js`、`pep/sdk.js`、`sts/server.js` | 暗号 profile（CP）の配布: state store に `POST /status {kind:'alg_policy', id:<版>, status:{at:[...], txn:[...]}}` を追加し、版は単調増加（同じか古い版の再提示は 409）。配布の受け手（RevocationClient）も古い版へ戻らない。PEP SDK と STS は CP が配布されていればその alg allowlist で検証し、なければ従来の設定値を使う | ADR-005 V1（受理 alg の allowlist は検証側の版付き CP から読む）、ADR-015 D15-71（CP の改版で 導入→併存→退役、手順 7 の「CP v(n+1) 以前の版の再提示」の拒否）、TC-015。基盤の allowlist は起動時の設定に固定され、alg の切替にはサービスの再起動（設定差分）が要った | CP を配布しない限り従来どおり（他群は CP を使っていない） |
| RK-08 | `lib/http.js` `request()` | `timeoutMs` を接続確立を含む全体の期限としても適用する（従来の `ClientRequest#setTimeout` は接続後にしか始まらない） | TC-010 W1（PEP→façade の接続確立を 5 秒遅らせる注入）で、PEP の deadline D(t)=3 秒が効かず、5 秒待って判定を得て write・privileged を許可した（正式な実行 `resilience-keys/TC-010/20261015T025031Z-5418a7`）。fail-mode-matrix §6.1（D(t) 超過は拒否） | 期限内に終わる要求は変わらない。期限を超える接続確立が失敗になる（意図した挙動） |
| RK-09 | `pdp/adapters/cedar.js` `listObjects()` | 候補の評価が評価不能なら列挙全体を失敗にする（façade の search は 503） | TC-010 C1（属性欠落）で、評価不能の候補を黙って除いた空の一覧を 200 で返した（正式な実行 `20261015T025322Z-01d308`）。ADR-025 D25-19（失敗時に空の一覧を返さない） | 評価不能が起きない限り変わらない（smoke 両構成で確認） |
| RK-10 | `inject/proxy.js` | TCP モードに `delay_each`（client→upstream の全チャンクを ms 遅らせる）を追加 | 既存の `delay` は接続確立だけを遅らせ、keep-alive の後続要求は遅れないため、FM-01（PDP が応答するが D(t) を超える）を 1 回目の接続にしか注入できなかった | 新しいモードの追加だけ。既存モードは不変 |

### 評価器の修正（TC-010、データ閲覧後。合否基準は変えていない）

| # | 内容 | 影響 |
|---|---|---|
| RK-EV-01 | 評価器が構成（openfga/cedar）を run.json から読んでいたが、run.json は終了時にしか書かれないため Cedar の実行で窓の一覧を取り違えた（`windows_missing` の誤表示）。roles.json から読むよう直した | 指標の値は不変。判定の「incomplete」表示が「fail」に直った |
| RK-EV-02 | params/TC-010.json の C3（schema なし）の注記「期待 deny の要求が許可された場合だけ数える」を評価器が実装していなかった。注記どおりに実装した | Cedar の正式な実行の indeterminate_to_allow が 54→18、write_plus_allow 18→6、rs_allow_in_outage 36→12。どちらでも不合格 |
| RK-EV-03 | 評価の再実行が eval.json を上書きしていた（TC-010 の 2 つの正式な実行で、最初の評価器出力が上書きされた。SHA256SUMS は最初の出力のハッシュを保持）。以後は eval-rN.json に追記する | 上書き前の値はこの表と返答に記録した（openfga: 不合格・write_plus_allow 16・rs_allow_in_outage 24、cedar: 上記の修正前の値） |

## 変更の確認

- RK-03 の初版は応答受信時に `getPeerCertificate()` で照合していたが、TLS セッション再開後の接続では証明書が得られず、接続が切れた後の JWKS 取得が恒常的に失敗した（TC-014 の凍結前ハーネス確認 `_prefreeze/resilience-keys/TC-014/20261015T023151Z-8fd76b` の post-check で C-3 に該当、TC-015 の同 `20261015T023507Z-3038a0` も同じ）。照合を TLS ハンドシェイクの `checkServerIdentity` に移して直した。どちらも凍結前の実行であり、合否は算出していない。

- RK-01: `npm run selftest` 合格（2026-10-15、変更後、1 回）。
- RK-01〜RK-07: TC-010・TC-014・TC-015 の凍結前のハーネス動作確認（§2.5、`12_poc/data/_prefreeze/resilience-keys/`）で、平常時の正例（対照）が通ることを確かめた。合否の指標は集計していない。
- RK-08〜RK-10 の後に `npm run smoke`（OpenFGA・Cedar）を実行し、全段階 OK を確かめた（2026-10-15）。
- 他群が同時に基盤を編集していたため、変更は Edit の完全一致置換で入れ、改行コード（CRLF/LF）を保った。
