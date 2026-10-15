# 模擬連携検証（3 回目・v1.2）: 顧客サポートチケット管理サービス

> 文書種別: 模擬連携検証の記録 / 対象版: v1.2（HEAD `e7a4cff` に未コミットの v1.2 改訂を重ねた作業ツリー） / 実施日: 2026-10-15
> **本書は AI エージェント（Claude）が「認証認可基盤にこれから依存する新規サービスの開発チーム」の役を演じた模擬検証の記録である。実在の連携チームによる検証ではなく、人による照合・立会いはない。試験結果は自作スタブとキット先行配布物を使った自己実行で、キット（DL-120）による判定や、DoR・DoD・Gate の証拠にはならない**（CONVENTIONS §8、kit/README §5）。
> 制約: 12_poc/code、04_architecture、05_adr、13_integration-trial/ の既存内容（expense-service・room-booking とその報告）は読んでいない。使ったのは 10_integration/ と 11_contracts/ だけである。

## 0. 結論

| 項目 | 結果 |
|---|---|
| 判定 | **条件付きで可**。10_integration と 11_contracts だけで、設計・最小実装・単体試験・契約試験・汎用モックでの正例確認まで進められた。ただし委託先サポート会社との越境協業は、v1 の契約では「個人ごとの招待」と「窓口単位の付与」にしか落とせない。チケット単位の担当割当てを認可で表せないため（重大 C-1）、要件を縮めるか、K24-4 などの決裁が要る |
| 迂回 | **不要（0 件）**。PEP の検査を外す・緩める、試験側で応答を書き換える、契約外の経路を使う、のどれもしていない。汎用モックとの間に置いたのは kit の echo proxy だけである |
| 詰まった点 | **重大 1 件、中 4 件、小 5 件**（§6） |
| 試験 | 正例と業務上の負例は 8/8 合格。kit の負例ベクタは 71 ケース中 69 合格・2 不合格（どちらもベクタ側の不整合。M-4）、対象外 5 ケース。意図に合わせて直した変種 3 件は全合格。`fga model test` は 3/3 試験・37/37 check 合格。Prism 5.12.0＋echo proxy 0.3.0 の正例は 12/12 段階合格。監査イベント E2 は 113 件中 2 件が CON-08 に不適合（契約の欠け。L-2） |

## 1. 題材と役割

題材は顧客サポートチケット管理で、名前空間は案として `sup` を使った。顧客企業テナント（資源側）が窓口 `sup/desk` を持ち、利用者がその下にチケット `sup/ticket` を起票する。想定した運用は次のとおり。

- 委託先サポート会社（別テナント）の要員が、顧客テナントの窓口でチケットに対応する
- チケットごとに外部ゲストを招待して閲覧させる
- AI エージェントが一次回答を下書きし、人が承認して送信する
- SLA（初回応答 4 時間）を超えたら、担当者へ非同期で通知する
- チケットを一覧・検索する
- 顧客管理者が担当者を割り当てる

実装は Node.js v22.23.2 で、外部の npm パッケージは使っていない。PEP は SDK を使わない自前実装（PP-2）とした。

## 2. 使った文書と節

| 段（INT-00 入口の手順） | 文書と節 |
|---|---|
| 入口 | INT-00「実装者向けの入口（1 枚）」と、そこにある「v1.2 で加えた規則」 |
| 1 パターン選択 | INT-02 §2.1（Q1〜Q21・X1〜X6）、§2.2（種別 18・19・23）、§2.3、P-01・P-04・P-05・P-08・P-09・P-11・P-16、§3.7、§3.8、§3.9（BN-1〜BN-9） |
| 2 契約の固定 | kit/README §5.4 に従って `CONTRACTS.lock.json` を作った（33 ファイル、うち未コミット 21 件は SHA-256 だけで固定） |
| 3 認可モデル | INT-03 §9.3（委託先の例）、§10.1 XS-1〜XS-11、AC-11、CON-16 §3.1〜§3.5 |
| 4 PEP・token・監査 | CON-16 §1（V1〜V14、§1.6、§1.8、§1.9）、§2（処理順、OB-01〜OB-15、11 関数、bind_tenant、§2.5〜§2.10）、§4（ST-1〜ST-10）、§5（U-1〜U-12）<br>CON-18 §2・§4.2（AD-01〜AD-12）・§5<br>CON-17 §1〜§5・§10<br>CON-05 requestTxnToken・registerAcceptanceRecord・x-test-signing-key<br>CON-04 §3・writeRelationships<br>CON-03 Reason・ProfileDecision・ProfileRequest・SubjectProperties・EvaluationsRequest<br>CON-08 E2・x-enforcement-without-decision・Actor・Correlation<br>CON-11 §11.4・§11.6.1・§11.6.2 |
| 5 モック | kit/README §2.2〜§2.6、echo-proxy.js の使用法 |
| 6 負例 | kit/README §3〜§5.5、CV-001〜CV-014・CV-045・CV-058〜CV-062 |
| 7 迷ったとき | INT-06 FQ-16（複数テナント所属）、越境共有の FAQ（該当行だけ） |

## 3. パターン選択と entry point 台帳（`entrypoints.json`）

| EP | 操作 | 階層 | 主 | 付加 | 判断 |
|---|---|---|---|---|---|
| EP-SUP-01 | 起票（CREATE_CHILD） | write | P-01 | P-24・P-04（A1） | SLA の受付記録を要求の処理中に登録する。`acceptance_atomic=true` |
| EP-SUP-02 | 閲覧 | read-sensitive | P-01 | P-16 | ゲストも委託先要員も通常の経路を通る |
| EP-SUP-03 | 一覧・検索 | read-sensitive | P-01 | P-09・P-16 | L2 方式。自 DB をテナントで絞り、evaluations `execute_all` で後段 Check する |
| EP-SUP-04 | 担当割当て | write | P-01 | — | Q4（P-11）とも読める（L-5） |
| EP-SUP-05 | ゲスト招待 | write＋XT | P-01 | P-16 | CON-17 createExternalGrant を呼ぶ |
| EP-SUP-06 | 下書き | write | P-01 | P-08 | `agent_delegation` を宣言（tool `sup.draft_reply`、承認不要） |
| EP-SUP-07 | 送信 | write＋XT | P-01 | P-08・P-24 | `agent_delegation` は承認要（+XT）と宣言。人が自分の session で送る経路を正とした（M-3） |
| EP-SUP-08 | コメント | write | P-01 | P-04 | 起票者がコメントすると SLA を再起動する（A1） |
| EP-SUP-09 | クローズ | write | P-01 | P-16 | 先に revokeExternalGrantsByAnchor を呼ぶ（XGC-7） |
| EP-SUP-10 | SLA 通知（consumer） | read-sensitive | P-04 | §3.9 | 内部開始の Txn-Token で再 Check し、アプリ内通知だけを出す（BN-7） |

## 4. 認可モデル草案（`model/support.fga.yaml`）

- **`sup/desk`**
  - relation: `parent [core/tenant]`、`admin`、`agent`、`partner [core/external_grant#grantee]`
  - permission: `manage = admin or manage from parent`、`handle = agent or partner or manage`、`create_ticket = member from parent or handle`
- **`sup/ticket`**
  - relation: `parent [sup/desk]`、`requester`、`assignee [core/user]`、`guest [core/external_grant#grantee]`
  - permission は動詞: read、comment、draft_reply、send_reply、assign、invite_guest、close
  - ゲストが届くのは `read` だけ（XS-2）。エージェント用の relation は作っていない（XS-11）
- **core 型**: CON-16 §3.5 の代替定義をそのまま使った。`core/tenant#manage` を含むので IE-5 に依存する
- **モデル試験**: openfga/cli v0.8.1 の releases 実行ファイルを使い、SHA-256 を checksums.txt と照合した。3/3 試験、37/37 check 合格。ゲストの閉じ込めと期限切れ、委託先要員が窓口の全チケットに届くこと（C-1 の確認）を含む

## 5. 実装・スタブ・試験

### 5.1 構成

| パス | 内容 |
|---|---|
| `src/config.js` | §11.4 の差し替え点だけから設定を読む。`verifier-config/1`・`failmode-config/1` を起動時に検査する。issuer の期待値は `AUTH_OIDC_DISCOVERY_URL` から導く |
| `src/token.js` | K3・K5 を §1.2 の順に検証する。K3 と K5 は別の鍵族を使う。JWKS に届かず前回の値もなければ 503 |
| `src/pdp.js` | evaluation と evaluations を呼ぶ。D(t) は要求全体に掛ける。§2.6 の 8 条件と、要素ごとの規則を実装した。主体の写像と actor の暫定写像は 1 か所に置いた |
| `src/app.js` | authenticate → AD-02/03/05 → bind_tenant → AD-07 → authorize → enforce → 業務処理、の順に処理する。ほかに A1 受付、consumer、CON-17 呼出しを持つ |
| `src/audit.js` | CON-08 E2 を作る。参照値は試験用の固定値表から取る。producer_seq・prev_fp の連鎖と、entry point ごとの計数を出す |
| `test/stubs.js` | ST-1（issuer A・B）、ST-2（TTS＋受付台帳）、ST-3（sup モデルの評価器、G 段、注入 13 種）、CON-04 Registry、ST-10、ST-5 |
| `test/02-vectors.test.js` | kit のベクタ JSON を無改変で読む汎用ランナー。同じ群の応答が同一かも検査する |
| `scripts/prism-positive.mjs` | Prism＋echo proxy で正例を流す |
| `scripts/validate-audit.py` | 出力した E2 を CON-08 で検証する |
| `scripts/lock-contracts.mjs` | `CONTRACTS.lock.json` を作る |

### 5.2 試験結果（2026-10-15、作成者による自己実行）

**(a) 正例と業務上の負例: 8/8 合格**

- 起票は Txn-Token 必須で、A1 受付と CON-04 の書込みを伴う。
- 他テナント・不存在・権限なしは、同一の 404 になる。
- PDP 要求の値:
  - `action.name` は動詞の permission 名
  - `subject.type` は `core/user`
  - `resource.properties.tid` は束縛したテナント
- 委託先要員を担当に割り当てると、Registry が `tenant_boundary_violation` で拒否する。
- 委託先要員は、窓口単位の付与で窓口の全チケットに届く。home 側の token では 404 になる。
- ゲストの流れ:
  1. 招待が `invited` の間は 404
  2. 受諾後は閲覧だけ 200
  3. 一覧には付与されたチケットだけが出る
  4. クローズ時に revoke-by-anchor が呼ばれ、以後 404
- 招待先の email は、監査にも自 DB にも残らない。
- エージェントの代理（`sub` は職員、`act` はエージェント）:
  - 下書きは 201
  - PDP 要求の actor は `{core/workload, agent, ai_agent}`
  - エージェントからの送信は 403 `approval_required`、職員本人の送信は 200
  - 自律動作（`sub` 自体が ai_agent）は PDP を呼ばずに 403
- SLA consumer は、内部開始の Txn-Token を使い、受付時に保存した主体種別で再 Check し、担当者へアプリ内通知を出す。

**(b) kit の負例ベクタ**

| ベクタ | 実施 | 合格 | 対象外 |
|---|---|---|---|
| CV-001〜CV-014 | 44 | 43 | 5 |
| CV-045・CV-058〜CV-062 | 27 | 26 | 0 |
| 計 | 71 | 69 | 5 |

- 対象外の内訳:
  - CV-003b・CV-011c: RP と client 登録を担わないため
  - CV-009a: sender_constrained=false のため
  - CV-012b・c: 注入を成立させられないため（kit/README §5.3）
- 不合格の 2 件（CV-014b・CV-061d）はベクタ側の不整合で、詳細は M-4。変種 3 件は合格した。
- 同じ群の応答は、`token_reject` 24 件、`tenant_denied` 5 件、`resource_denied` 5 件のいずれも完全に一致した。

**(c) Prism 5.12.0＋echo proxy 0.3.0: 12/12 段階合格**

- 4 つのモックの起動
- 閲覧と一覧（`--prefer oneItem`）
- 起票（R10、CON-04 は 200）
- consumer（R9 で作り直した Txn-Token を CON-05 `/txn-token-jwks` の試験鍵で検証）
- ゲスト招待
- エージェントの下書きと、人の送信
- クローズ（revoke-by-anchor）

PEP の検査は外していない。MK-01 が未配布なので、issuer は自作の ST-1 を使った。

**(d) 監査**

- E2 113 件のうち 111 件が CON-08 に適合した。不適合の 2 件は自律エージェントを拒否した記録（L-2）。
- `corr.iss` が http になる件は、スタブ由来として検証から除いた（L-3）。

### 5.3 再現手順

```sh
cd 13_integration-trial/support-ticket
npm test
node scripts/prism-positive.mjs
python scripts/validate-audit.py ../../11_contracts/schemas out/audit-positive.jsonl out/audit-vectors.jsonl out/audit-prism.jsonl
fga model test --tests model/support.fga.yaml   # openfga/cli v0.8.1
node scripts/lock-contracts.mjs
```

## 6. 詰まった点

### 重大

**C-1 委託先サポート会社との越境協業を、チケット単位の担当で表せない**

**状況**
- 委託先の要員は別テナントの個人で、顧客テナントの資源に触れる手段は外部付与（CON-17）しかない。
- 付与先は個人に限られる。会社単位の付与は v1 で提供しない（INT-03 §9.3 の注意・AC-11。ADR-024 K24-4 は決裁待ち）。
- チケット単位の担当を tuple で書くと、他テナント主体の `assignee [core/user]` は CON-04 §3 の `tenant_boundary_violation` で拒否される（スタブで確認）。
- INT-03 §9.3 の通し例は、委託先を `watcher [core/external_grant#grantee]` でタスクごとに表している。しかし CON-17 の発行は `invitee.channel=email` だけで、受諾済みの外部主体へ招待なしで追加付与する operation がない。担当を割り当てるたびに、email 招待と受諾が要ることになる。

**本検証で採った形**
- 要員 1 人につき、窓口（`sup/desk#partner`）へ 1 回だけ招待した。担当割当ては業務データとして表示するだけにした。
- この形では委託先要員が窓口の全チケットに届くので、最小権限を満たせない。
- 委託先要員に書込み（コメント・下書き・送信）を許すには、write の permission に「外部付与可」の印を付ける M1 のモデル変更が要る。
- 委託先が複数の顧客を担当する場合は、顧客テナントごとに token を取り直すことになる（FQ-16）。委託先側で顧客をまたいだ受付箱は作れない。

**求めること**（次のいずれか）
- (a) 受諾済みの外部主体へ追加付与する operation を CON-17 に加える
- (b) K24-4 を決裁する
- (c) 窓口単位の付与を P-16 の推奨形として明記し、最小権限を満たせないことを要件側で受け入れてもらう

### 中

**M-1 SLA 超過の通知の型が決まらない**
- A1 で実装したが、受付記録の有効期限は TBD（CON-05 x-open-issues、U-9）。期限を超える SLA では通知が実行されない。
- 定期走査型の A3 は、依存サービスから使う手段がない。
- BN-3 の「起点主体の権限で、通知を起こした操作の動詞を再 Check する」は、時間起点の通知に合わない。起票者が退職・異動すると、担当者への SLA 通知が止まる。本検証は起票者の `read` で代用した。
- `job_definition_id` を TTS 発行方針台帳に登録する手順が見当たらない。

**M-2 AI による一次回答を起票時に自動で走らせられない**
- 自律動作は K17-1 が未決のため、AD-02 で拒否される。
- 下書きができるのは、職員が AS の画面で委任（PAR と step-up）した後だけである。対象はその職員が見られるチケットに限られ、職員がいない時間帯は動かせない。
- 委託先の AI を使う場合:
  - 受諾できるのは人間だけなので（XGS-8 (2)）、外部付与では入れられない。
  - 顧客テナントごとにエージェント主体として登録する必要があるが、登録手段の契約がない（CON-18 HO12-AG-05）。

**M-3 「人の承認後の送信」を契約上の承認 grant で表せない**
- 文書を素直に読むと CON-18 §2.3 の承認 grant に行き着くが、L17-5 の決定まで無効で、AD-07 で常に拒否される。
- 本検証では、エージェントは下書きだけ、送信は人が通常の P-01 の write で行う形にした。
- この形を推奨とする記述は、10・11 のどこにもない。また承認の記録は自サービスの業務記録にしか残らない。

**M-4 kit のベクタ 2 件が、契約どおりの実装で不合格になる**
- **CV-014b**: write の要求に Txn-Token が付いていない（L-6 の付与漏れ）。CV-058 の規則で先に 401 になる（期待は 503）。
- **CV-061d**: access token の `sub` はゲスト、Txn-Token の `sub` は `{{subject.self}}` になっている。CON-16 §1.6 (3) の照合で先に 401 になり、狙いの 404 に届かない。
- **CV-062a**: 同じ食い違いのため、AD-02 を試さないまま「拒否」として合格してしまう。
- kit/README §4 は「consumer はベクタを編集しない」とする。そのため原本は不合格のまま記録し、`sub` などを揃えた変種を別に流した。

### 小

- **L-1** CON-08 は token 検証失敗以外のすべての E2 に `actor` を必須とするが、CON-16 §2.8 には人が直接呼んだ要求での書き方がない。CON-08 の例にならい、自 workload を chain[0] に置いた。主体が分からない consumer の拒否は、schema に適合する書き方がない。
- **L-2** chain に ai_agent を含む actor は `on_behalf_of` が必須だが、AD-02 で拒否する自律 K3 には委任元が載っていない。このため 2 件が不適合のまま残る。
- **L-3** CON-08 の `corr.iss` は `^https://` だが、CON-16 §4 と kit は自作スタブの TLS を求めていない。http のスタブでは全 E2 が不適合になる。
- **L-4** CON-16 の中で記述が食い違う。§2.8 は「`subject_unmapped` に決定済み」とするが、§5 U-11 は暫定の `deny_failmode` のまま。
- **L-5** INT-02 Q4 を上から当てると、顧客管理者の担当割当ては P-11 になる。本検証は P-01 とした。業務操作と管理操作の境目の判断基準があると迷わない。

## 7. 前回までとの関係

v1.2 で加わったものは、どれも詰まらずに使えた。対象は CON-17、CON-18、echo proxy R9/R10、CV-058〜CV-062、§11.4 の差し替え点、§2.6 の要素ごとの規則、§2.10 の A1 の暫定である。

新たに詰まったのは、この題材に固有の点（C-1・M-1〜M-3）と、ベクタの保守（M-4）である。

## 8. 申し送り（他文書は編集していない）

| # | 宛先 | 内容 | 由来 |
|---|---|---|---|
| ST-H1 | CON-17・ADR-024 K24-4・INT-02 P-16 | 受諾済み外部主体への追加付与、または会社単位付与の決裁。暫定の推奨形を P-16 に明記する | C-1 |
| ST-H2 | CON-05・ADR-026・INT-02 BN-3 | 受付記録の期限、依存サービスから使える A3、時間起点の再 Check の主体、`job_definition_id` の登録手順 | M-1 |
| ST-H3 | INT-02 P-08・CON-18 HO12-AG-05 | 「下書きはエージェント、送信は人」の推奨形を書く。委託先 AI の登録手段を用意する | M-2・M-3 |
| ST-H4 | CV-014・CV-061・CV-062 | Txn-Token の付与と、`sub` の整合を直す | M-4 |
| ST-H5 | CON-16 §2.8・§4・§5 U-11、CON-08 Actor | E2 の `actor`、自律拒否の `on_behalf_of`、スタブの https、U-11 の更新 | L-1〜L-4 |
| ST-H6 | INT-02 §2.1 Q4 | 管理操作と業務操作の判断基準 | L-5 |