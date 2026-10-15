# 試験群 resilience-keys（TC-010・TC-014・TC-015）

> 試験計画: 12_poc/preregistered-test-plan.md（凍結コミット 151940ac00dc64a89ac5a5cd148e42326e7c5e73）§4.10・§4.14・§4.15。
> 基盤への変更: 12_poc/code/CHANGES-resilience-keys.md（RK-01〜RK-07）。
> 作成方法: AI エージェント（Claude）が実装・実行した。独立立会人の立会い・署名（§2.2 F-5、§2.6）はない。

## 担当 TC

| TC | 名称 | 実装 | パラメータ |
|---|---|---|---|
| TC-010 | PDP 障害・評価不能・誤応答での縮退 | `TC-010.js`（OpenFGA 構成と Cedar 構成を別の実行で行う） | `params/TC-010.json` |
| TC-014 | 鍵の緊急 rotation・計画 rotation・JWKS 差替え | `TC-014.js`、`keyharness.js` | `params/TC-014.json` |
| TC-015 | 署名 alg の切替（古典 alg の範囲） | `TC-015.js`（TC-014 の試験台を再利用） | `params/TC-015.json` |

## ポート表（試験ごとに固定）

各 TC は `config/ports.js` の自分の区画（20 ポート）だけを使う。区画内のオフセットは基盤 README（POC-03 §5）と同じで、本群は +18・+19 を試験プロセス内のリスナーに使う。

| TC | 区画 | 本群が使う追加のポート |
|---|---|---|
| TC-010 | 42200〜42219 | なし（障害注入は基盤の inj-pep +12、inj-engine +13） |
| TC-014 | 42280〜42299 | +18 = 42298 JWKS リダイレクタ（検証点 → STS、切替で攻撃者サーバ・遮断）、+19 = 42299 攻撃者 JWKS サーバ |
| TC-015 | 42300〜42319 | +18 = 42318 JWKS リダイレクタ（STS へ素通し） |

各試験は自分でプロセスを起動・停止する（`harness/stack.js`）。他群と同時に実行してもポートは衝突しない。

## 実行

```bash
cd 12_poc/code
node tests/resilience-keys/TC-010.js --freeze            # 凍結 manifest（コード・パラメータ・ツールのハッシュ）を作る
node tests/resilience-keys/TC-010.js --engine openfga    # 測定（C-2: manifest と現行ツリーが一致しなければ中止）
node tests/resilience-keys/TC-010.js --engine cedar
node tests/resilience-keys/TC-014.js --freeze && node tests/resilience-keys/TC-014.js
node tests/resilience-keys/TC-015.js --freeze && node tests/resilience-keys/TC-015.js
node tests/resilience-keys/TC-0xx.js --eval <run-dir>    # 生データだけから評価器を再実行
```

- 生データ: `12_poc/data/resilience-keys/<TC>/<run-id>/`（run.json・env.json・SHA256SUMS・eval.json と、TC ごとの requests/ticks/events 等）。凍結 manifest は `12_poc/data/resilience-keys/_freeze/`。
- 凍結前のハーネス確認（§2.5、評価器は実行しない）: `--prefreeze`。データは `12_poc/data/_prefreeze/resilience-keys/`。
- 秘密鍵は実行ごとに生成し `12_poc/code/.run/`（git 管理外）にだけ置く。生データに鍵材料・token の全文は書かない（鍵台帳の写しはサーバ側で鍵材料を除いたもの）。

## 結果（2026-10-15、実施チームの評価器出力。立会人の署名なし）

| TC | 実行（12_poc/data/resilience-keys/） | 扱い | 結果 | 主要測定値 |
|---|---|---|---|---|
| TC-010 | `TC-010/20261015T025031Z-5418a7`（OpenFGA） | 正式 | 不合格 | write 以上の allow 16（W1: D(t) 超過の接続遅延で PEP が待って許可 12、W10・W13 全 allow 誤応答の検知前 4）、rs の許可 24（W1）、評価不能→許可 0、迂回 0（netstat 151 標本）、不達時の空一覧 0、全 allow 誤応答の alarm 2/2（検知 150〜203 ms） |
| TC-010 | `TC-010/20261015T025322Z-01d308`（Cedar） | 正式 | 不合格 | 空一覧 6（C1 属性欠落で search が 200 の空一覧）、C1 の評価不能→許可 18・write 以上 6（属性を持たない tool 型の正当な判定を事前定義が数えたもの）、C2 entity 欠落: 制限付きゲストの許可 0（RK-01 で indeterminate）、C4 全断: 全 503 |
| TC-010 | `TC-010/20261015T030247Z-8882ff`（OpenFGA）、`20261015T030445Z-ee7b9d`（Cedar） | 参考（RK-08〜RK-10 の後、params/TC-010.ref.json） | 参考でも不合格 | OpenFGA: 残るのは FM-13 検知前の誤 allow 4 件だけ（検知 39〜156 ms）。Cedar: 残るのは C1 の tool 型の正当な判定 12＋6 件（事前定義の数え方による）、空一覧 0 |
| TC-014 | `TC-014/20261015T025035Z-ece5ac` | 正式 | 合格 | 失効 epoch 適用後の旧 kid 受理 0、計画 rotation 12 周（at・txn）の検証失敗 0／47,590 検証、retain 鍵の削除は 3/3 阻止、偽 JWKS の受理 0（固定なしの対照は F3 で 650/650 受理）、硬上限での発行エラー 0。緊急失効の所要（宣言→最後の受理）: push あり p50 76 ms・最大 182 ms、push なし p50 3,999 ms・最大 14,066 ms、実 PEP 最大 134 ms（記録のみ）。誤撤去は検知されず（in-flight token の拒否 1,566／1,980） |
| TC-015 | `TC-015/20261015T025555Z-39e207` | 正式 | 合格 | ES256→ES384→巻戻し→再切替→ES256 退役、ES384→PS256 で同じ。コード・設定差分 0、サービス再起動 0、手順中の検証失敗 0／15,761、負例の受理 0（古い CP 版の再提示は 409）、巻戻し 4〜5 ms（全検証点の受理まで 4〜59 ms） |

## 事前登録からの逸脱（本群）

| # | 内容 |
|---|---|
| RK-DEV-01 | 凍結パッケージは実施者が作った manifest（`_freeze/`）だけで、署名付き tag（F-4）と立会人の保管（F-5）、立会人の署名（§2.6）がない。作業ツリーは dirty（コードは未コミット）。結果はすべて暫定 |
| RK-DEV-02 | 計画が「凍結時に定める」とした値（試行回数、C-3 の上限、時間、q、窓の構成、合否指標の操作的定義）を実施者が params に定めた（測定前） |
| RK-DEV-03 | TC-001 の較正値（q・ε）が使えず、q を params に置いた |
| RK-DEV-04 | 操作階層は public・read-sensitive・write・privileged/T の 4 行だけ（privileged/P・break-glass/P・break-glass/B は PoC に入口がない）。SDK は版 N だけ（N−1・N−2 なし）。TC-014・TC-015 の検証点は、実 PEP 1 つと、同じ検証器を使う試験プロセス内の検証点で構成した |
| RK-DEV-05 | 測定中に作業ツリーの計画書が別の主体により版 0.2 に更新された（2026-10-15T02:52:30Z）。本群は凍結コミットの計画に従い、計画書の差分は C-2 にせず記録だけにした（Cedar の 1 回目の実行はこの判定で C-2 中止: `TC-010/20261015T025231Z-384bb2`）。版 0.2 の §2.2.1 に照らすと本群の実行はすべて §2.5 扱いになる |
| RK-DEV-06 | TC-010 は正式な実行の後に基盤（RK-08〜RK-10）・パラメータ（W1 の注入方式）・評価器（RK-EV-01〜03）を直し、参考の再実行をした。正式な結果は修正前の実行（§2.4） |
| RK-DEV-07 | FM-13 の freeze（配布の凍結）は PoC に配布 pipeline がないため alarm の記録だけ。allow 率・deny 率の急変検知は未実装。ML-DSA は Node 22 で使えず TC-110 に残した（計画どおり） |
