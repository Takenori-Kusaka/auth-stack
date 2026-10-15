# 試験群 revocation-consistency（TC-008・TC-009・TC-012）

> 試験計画: 12_poc/preregistered-test-plan.md（凍結コミット 151940ac00dc64a89ac5a5cd148e42326e7c5e73）§4.8・§4.9・§4.12
> 作成: AI エージェント（Claude）。自己レビューのみ。独立立会人の立会い・署名はない（RC-DEV-01）。

## 構成

| ファイル | 内容 |
|---|---|
| `common.js` | 凍結 manifest（F-3/F-4）と C-2 照合、実行ディレクトリ、探針利用者付きの合成データ、開放ループの探針、harness 要求の再試行 |
| `params/TC-0xx.json` | TC ごとの凍結パラメータ（計画が値を決めていない項目をここで測定前に固定した） |
| `TC-008.js`・`eval-TC-008.js` | stale allow 継続時間と consistency mode（収集・評価） |
| `TC-009.js`・`eval-TC-009.js` | 内容更新と relation 更新の原子的結合（収集・評価） |
| `TC-012.js`・`eval-TC-012.js` | model migration differential・shadow・rollback（収集・評価） |
| `harness-check.js` | 凍結前の動作確認（§2.5。合否を算出しない） |

## 実行

```bash
cd 12_poc/code
node tests/revocation-consistency/TC-008.js --freeze "<理由>"   # 6 条件（A〜F）。条件ごとに別の stack・実行ディレクトリ
node tests/revocation-consistency/eval-TC-008.js --manifest-versions 2,3
node tests/revocation-consistency/TC-009.js --freeze "<理由>"   # 2 構成（nocache・cache10s）
node tests/revocation-consistency/eval-TC-009.js
node tests/revocation-consistency/TC-012.js --freeze "<理由>"
node tests/revocation-consistency/eval-TC-012.js
```

- `--freeze` は manifest（`12_poc/data/revocation-consistency/_freeze/manifest-TC-0xx-v<N>.json`）を作る。内容が前版と同じなら版は上がらない。各実行の開始時に現在の木と最新 manifest を照合し、不一致なら `aborted:C-2` として記録を残して止まる。
- 生データ: `12_poc/data/revocation-consistency/<TC>/<run-id>/`（run.json・env.json・SHA256SUMS・requests.jsonl・inject.jsonl・各部品の記録・eval.json）。TC ごとの集計は `eval-summary-v<N>.json`。

## ポート

| TC | 区画 | 備考 |
|---|---|---|
| TC-008 | 42160〜42179 | README POC-03 §5 の固定区画 |
| TC-009 | 42180〜42199 | 同上 |
| TC-012 | 42240〜42259 | 同上 |
| 予備（同じ TC の 2 つ目の stack） | 44000＋nn×20 | 本群専用。今回は未使用 |

## 事前登録からの逸脱（全件）

| ID | 内容 | 理由 | 影響 |
|---|---|---|---|
| RC-DEV-01 | 凍結手順 F-3〜F-6 のうち、manifest の作成と照合（C-2）だけを行った。署名付き tag、独立立会人による manifest の保管（F-5）・合否記録への署名（§2.6）・再実行（§2.6-4）はない。凍結日時は manifest の `frozen_at` | 系統 1 の実施者は AI エージェントだけで、立会人（KP-1）が未決 | 合否は「自己判定」であり G-009 の証拠にはならない |
| RC-DEV-02 | 計画が定めていない試行回数・水準を、測定前に `params/*.json` で固定した（TC-008: 6 条件×20 試行、q=100 ms、例 A・B 各 10 回、read-after-write 20 回。TC-009: 2 構成×4 操作×7 障害×5 回。TC-012: 要求 3,000＋記録 300 呼出し、変異体規則、rollback 50 組） | 計画 §4.8・§4.9・§4.12 に試行回数の記載がない | 値の妥当性は立会人の確認を経ていない |
| RC-DEV-03 | C-3 の正例失敗率の上限を 10% と置いた（計画は「凍結時に TC ごとに定める」） | 同上 | — |
| RC-DEV-04 | TC-008 で、計画の層条件のうち基盤になかった「PEP SDK cache」「façade のフェンス」を基盤に追加して測った（CHANGES RC-CH-02・RC-CH-03）。OpenFGA の Check cache は `--check-query-cache-*` だけを使い、iterator cache・cache controller は測っていない | 層条件を作るため | フェンスは本 PoC の実装（単一 façade、伝播遅延 F=0）での結果 |
| RC-DEV-05 | TC-008 の ε は TC-001 の較正値（未提出）ではなく、実行内の探針送信遅れの最大値を使った。C-4（時計誤差が TC-001 の上限を超えた）は上限が未決のため判定できない。全時刻は harness 1 プロセスの単調時計で取った | TC-001（他群）の較正結果が測定時点で存在しない | 上限の式（構成値＋q＋ε）の ε が実行ごとの値になる |
| RC-DEV-06 | TC-012 の差分分類は規則（params の classification_rule）による機械分類とし、2 名の独立分類は行わない。代わりに参照評価器（Python）の期待値と照合した。中止基準（2 名の分類不一致）は適用できない | 実施者が 1 名（AI） | — |
| RC-DEV-07 | TC-008 は他群の基盤変更で C-2 が 2 回発生した。v1（sts/server.js 変更前）で条件 A・B、v2 で A〜D、v3（services/file-service.js の folder.list 頁送り追加後）で E・F を実行した。評価は v2 の A〜D と v3 の E・F を使う（eval-TC-008.js は版をまたいで条件ごとの最後の完了実行を選ぶように、v3 の凍結前に変更した）。v1 の A・B と中止した 2 実行は削除せず残した | 並行する他群が共有基盤を変更したため（変更は TC-008 の経路に関係しない。差分ファイルは各実行の c2-mismatch.json） | 条件間で基盤の版が異なる |
| RC-DEV-08 | 例 B・read-after-write の「最新強制の経路」は、基盤の K-3 未実装を直した後の経路で測った（CHANGES RC-CH-04） | 設計（authorization-model.md §11.1）と基盤の不一致 | 修正前の基盤では例 B のサービス経路はトークンなしで評価される |
| RC-DEV-09 | 測定中に、作業ツリーの試験計画が別の主体により版 0.2 に書き換えられた（§2.2.1 W-1〜W-5 等を追加）。本群は依頼どおり凍結コミット 151940ac の版 0.1 に従い、計画の照合を作業ツリーではなく凍結コミットの blob で行うように common.js を変更した（TC-009 は v1 が C-2 で中止、v2 で実行）。なお版 0.2 §2.2.1 に照らすと、本群の全実行は `witness=null`・`git_dirty=true` のため「凍結後の実測」の条件を満たさず §2.5 の扱いになる | 依頼が凍結コミットの版に従うよう指示している | 本群の合否は版 0.1 の下での自己判定であり、版 0.2 の下では合否判定に使えない |
| RC-DEV-10 | TC-012 v1（正式結果、`20261015T030140Z-93099a`）では、再提示攻撃に使った広がる候補（tool_instance#config `parent->admin \| operator`）が変異体の 1 つと同一で既に登録済みだったため、ゲートが冪等応答 200（状態変化なし）を返し、承認の束縛違反（403）と古い base_revision（409）の検査に到達しなかった。データを見た後に候補を変異体と異なるもの（`parent->admin \| parent->members`）へ変えた v2 を補足実行（`20261015T031146Z-a74728`）し、403・409 を確認した。正式な合否は v1 の基準・データで算出し（§2.4）、v2 は参考 | 試験設計の不備（攻撃が検査に到達しない） | v1 でも承認なしの配布 0 件・現行版の変化なしは成立 |

## TC-008 の観測上の注意

- OpenFGA v1.21.0（単一プロセス、sqlite）の Check query cache（TTL 2 s・10 s）を有効にした条件 B・C でも、剥奪後の stale allow は 0 件で、トークンなしの façade 経路（強制なし）でも例 A・B の漏洩は 0 件だった。剥奪の書込と同じインスタンスで cache が無効化されたと見られる（未確認）。したがって本 PoC はエンジン cache 起因の stale 窓を再現できておらず、フェンス・トークンの効果（stale を閉じること）は、PEP SDK cache（条件 E・F、最大 1.77 s）以外の層では示せていない。レプリカ・複数ノード構成は系統 2（TC-103）で確認する。
