# CON-05 独立レビュー記録（Token Exchange API）

> 文書ID: CON-05-RV / 版: 0.1 / 状態: review / 最終更新: 2026-10-15
> 対応要求: R-100, R-206, R-251, R-255, R-118, R-128 ／ G-088, G-102, G-118, G-119, G-120, G-138
> 依存文書: 11_contracts/token-exchange.openapi.yaml（CON-05 / DL-74）、05_adr/ADR-009-workload-identity-token-exchange.md、05_adr/ADR-022-integration-contract-standards.md、05_adr/ADR-026-async-long-running-delegation.md、04_architecture/workload-identity-delegation.md（ARC-04 §4.1, §5.1, §5.2, §10.3）、research/standards-status.md（SS-A09, SS-B04, SS-I16）

レビュー者は CON-05 の作成者ではない。本記録は AI エージェント（Claude）による独立レビューであり、実在の CTO/CISO・第三者の評価ではない [D]。

## 1. 観点と方法

| 観点 | 方法 |
|---|---|
| 標準の項目名・必須性・意味 | RFC 8693[^1] の §2.1・§2.2.1・§2.2.2・§3、Transaction Tokens draft-11[^2] の §9.1・§9.2・§11.1〜§11.4・§13.15 を 2026-10-15 に取得し、各パラメータ名・REQUIRED/RECOMMENDED/OPTIONAL・MUST の強度と照合した。RFC 6749 §3.2・§5.1・§5.2 の写し（未認識パラメータの無視、no-store、エラーコード、文字集合）は契約の記載と照合した。research の RS-06#32〜#45 と突き合わせた |
| ADR・04_architecture との整合 | ADR-009 D09-10〜D09-17・D09-24・D09-28〜D09-32・D09-40・D09-42、ADR-022 D-1-1・D-1-2・D-2（DL-74 行）、ADR-026 D26-03（段内置換）・N-7、ARC-04 §4.1 の手順図、§5.1 のパラメータ表、§5.2 の判定図とエラー規則（W55-14/15/17/18）、§10.3 の負例 N-08〜N-42 と照合した |
| 機械検証 | `npx --yes @redocly/cli@latest lint`（recommended）、YAML→JSON 変換、jsonschema 4.26.0（Draft 2020-12、FormatChecker）で正例 examples が schema に適合し、`x-negative-request-examples` が schema に不適合になることを確認した。例の JWT を base64url で復号し header（alg・typ・kid）と payload を確認した |
| モック・コード生成 | `not: {}` で表した拒否パラメータ、oneOf（const と pattern）、form 本文での複数 `resource` の扱いが、モックサーバ・コード生成でどう振る舞うかを確認した |

## 2. 指摘と修正（12 件、すべて契約へ反映済み）

| # | 区分 | 指摘 | 根拠 | 修正 |
|---|---|---|---|---|
| 1 | 標準の写し | TxnTokenRequest の `scope` を「本 profile では必須 [D]」としていたが、草案自体が REQUIRED とし、TTS に評価を求める（MUST） | draft-11 §11.1, §11.3 [N][^2] | 「草案は REQUIRED、TTS は評価しなければならない（MUST）」と [N] で書き直し、[D] の記述を削除 |
| 2 | 標準の写し | `request_context`・`request_details` は草案上 JSON オブジェクトで form 本文の 1 値として送るが、schema は単なる string だった | draft-11 §11.1（全パラメータを application/x-www-form-urlencoded で送る）[N][^2] | `contentMediaType: application/json` を追加し、URL エンコードした 1 値で送る旨を記載 |
| 3 | 標準の写し | 共通ヘッダ Cache-Control/Pragma の説明が「RFC 6749 §5.1 の MUST」で、エラー応答（400・401）にも同じ説明が再利用されていた。§5.1 の MUST は token を含む成功応答に掛かる | RFC 6749 §5.1, §5.2 | 「成功応答に MUST、エラー応答に付けるのは本 profile の選択 [D]」に改めた |
| 4 | 標準の写し | 内部開始の subject_token_type（https URI）について、草案が独自種別を「要求元と TTS が合意した独自の URN」と書くことに触れていなかった | draft-11 §11.2（値は URI でなければならない MUST、独自種別は URN と例示）[N][^2] | InternalStartReferenceType に、https URI は MUST を満たすが例示と異なること、URN に揃えるかは未決（ADR-026）を追記 |
| 5 | ADR との整合 | ADR-026 は同一段内で scope を狭める Txn-Token の置換を認めるが、契約は置換要求を扱わず、扱いが書かれていなかった。草案も Txn-Token を subject_token にする要求の subject_token_type を定めていない | ADR-026 D26-03・N-7、draft-11 §11.2, §13.15 [N][^2] | x-open-issues に「Txn-Token の置換」を追加（v0.1 は未定義で T03 拒否、追加時の MUST NOT を負例に入れる）。T03 の意味に「v0.1 で定義しない種別（置換要求を含む）」を追加 |
| 6 | 負例 | N-34（ARC-04 では「置換で scope 拡大・txn 変更・期限切れの置換」）を期限切れ・scope 拡大だけに当てており、置換部分の扱いが不明だった | ARC-04 §10.3 N-34 | N-34 の case に、置換・txn 変更は v0.1 では T03 で拒否する旨と open issue への参照を追記 |
| 7 | 負例 | N-14 の期待値が ARC-04 §10.3 の「拒否」と異なる（未認識パラメータを無視し tid を変えない）のに、差異が明記されていなかった | RFC 6749 §3.2（未認識パラメータは無視 MUST）、ARC-04 §10.3 N-14 | 判定の形が異なること、合格条件「tid を変えた発行 0 件」への読み替えを ARC-04 所有者へ申し送ることを明記 |
| 8 | 負例 | N-26 は ARC-04 では RS への提示の負例で、STS への持込みに当てる読み替えが書かれていなかった | ARC-04 §10.3 N-26 | case に読み替えを注記 |
| 9 | ADR との整合 | preview 要素（/txn-token、内部開始の種別）に、ADR-022 D-1-2 が求める期限（GA 昇格・改版・廃止の判断日）がなかった。GA から preview への必須依存がないこと（D-1-1）も未記載 | ADR-022 D-1-1, D-1-2 | §3 凍結区分に、期限は TBD（所有者 CTO、期限 DEC-8 前）と、/token が /txn-token に必須依存しないことを追記 |
| 10 | 台帳整合 | /txn-token の x-requirements が R-118・R-128 を挙げるのに info.x-requirements に無く、全件一覧と食い違っていた | ADR-009 Q6・Q7（R-118, R-128 と D09-28〜D09-36 の対応） | info.x-requirements に R-118・R-128 を閉じ方 C（H09-07 未実施）で追加 |
| 11 | モック・生成 | `not: {}` の拒否パラメータは、要求検証つきモックでは RFC 6749 §5.2 形式の 400 ではなくツール固有の検証エラーになり、コード生成では任意型の欄になり得る。契約試験の期待値と取り違えるおそれ | 機械検証の結果 [D] | §4 記述形式に、負例の期待値は x-negative-request-examples / x-negative-examples を正とし、SDK はこれらを送出しない旨を追記 |
| 12 | 運用の明確化 | 401（invalid_client）は、SVID のチェーン検証失敗では TLS ハンドシェイクで切断され HTTP 応答が返らない場合がある点が書かれていなかった | RFC 8705 の mTLS クライアント認証の構造、ADR-009 D09-14 [D] | InvalidClient401 に、401 は TLS 成立後の未登録 SPIFFE ID の場合で、記録（R01・T01）は両方で残す旨を追記 |

あわせて info.description §6 誠実性の「作成者以外による検証は未了」を、本レビューの実施と人による照合が未了である旨に更新した。

## 3. 照合して誤りがなかった項目

- RFC 8693 §2.1: grant_type・subject_token・subject_token_type は REQUIRED、resource（絶対 URI・fragment 不可 MUST、複数可）・audience（複数可）・scope（RFC 6749 §3.3）・requested_token_type・actor_token は OPTIONAL、actor_token_type は actor_token があるとき REQUIRED でないとき MUST NOT [N][^1]。契約の写しと一致する。
- RFC 8693 §2.2.1: access_token・issued_token_type・token_type は REQUIRED（access token として使えないとき N_A）、expires_in は RECOMMENDED、scope は要求と同一なら OPTIONAL・異なれば REQUIRED、refresh_token は OPTIONAL [N][^1]。本 profile の絞り込み（expires_in・scope を常に返す、refresh_token を返さない）は許容値の縮小として整合する。
- RFC 8693 §2.2.2: 要求不正・subject/actor token の不正または方針上の不受理は invalid_request（MUST）、resource/audience の対象に発行できない場合は invalid_target（SHOULD）[N][^1]。R01〜R10 のエラーコード割当ては ARC-04 §5.2 の図・W55-18 と一致する。
- RFC 8693 §3 の token type URN（access_token・refresh_token・id_token・jwt 等）と、他 URI の使用（MAY）[N][^1]。
- draft-11 §11.1: grant_type・audience（trust domain 名 MUST）・scope・requested_token_type（txn_token MUST）・subject_token・subject_token_type が REQUIRED、request_context・request_details が RECOMMENDED [N][^2]。§11.4: access_token は Txn-Token JWT、issued_token_type は txn_token、token_type は N_A（MUST）、refresh_token を含めない（MUST NOT）、expires_in は規定なし [N][^2]。§11.2.1・§11.2.2 の self_signed・unsigned_json の URN [N][^2]。
- draft-11 §9.1 の typ=txntoken+jwt（MUST）と §9.2 の claim（iat・aud・exp・txn・sub・scope・req_wl が REQUIRED、iss は OPTIONAL、tctx・rctx は RECOMMENDED）[N][^2]。TxnTokenResponse の x-decoded-payload-example は REQUIRED claim をすべて含み、rctx を含まない（ADR-009 D09-30 と一致）。
- RFC 6749 の scope-token・error_description の文字集合の pattern、unsupported_grant_type を含む error enum。
- ADR-009 D09-11（resource 1 つ必須）、D09-14（actor_token 拒否・SVID mTLS）、D09-15（downscope）、D09-16（深さ上限・循環拒否）、D09-17（may_act 不使用）、D09-24（unsigned_json 拒否）、D09-40（寿命の入れ子）、D09-42（fail-mode）と、ARC-04 §4.1 の TTS 検査（W55-17）・§5.2 の判定順。
- 例: 正例 6 件（要求 4、応答 2）とエラー例 4 件が schema に適合し、負例 4 件が意図した keyword（not、required、oneOf）で不適合になる。例の JWT の header は at+jwt・txntoken+jwt と一致し、expires_in は payload の exp−iat（120 秒・60 秒）と一致する。

## 4. 機械検証の結果（修正後）

| 検査 | 結果 |
|---|---|
| `npx --yes @redocly/cli@latest lint 11_contracts/token-exchange.openapi.yaml` | エラー 0、警告 1（info-license。info.x-lint-notes に理由を記載済みで、扱いは DL-69 で一括決定） |
| YAML→JSON 変換（json.dumps の往復） | 成功 |
| jsonschema 4.26.0 による examples 検証 | 正例 10 件適合、負例 4 件が意図どおり不適合 |

## 5. 残課題（本レビューでは閉じない）

- 複数 `resource`（N-11）は form 本文の同名パラメータの繰返しであり、JSON の例では表せない。DL-80 の負例ベクタで生の form 本文として供給する必要がある [D]。
- 例の JWT の compact 形式の payload は抜粋（sub・aud・txn だけ）で、x-decoded-payload-example と一致しない。署名検証を伴う契約試験には DL-80 で整合した試験ベクタを別に用意する [D]。
- 負例は 1 件も実行していない（閉じ方 C）。人による原典照合と traceability/ への照合ログ追記は未了 [D]。

## 参考文献

[^1]: M. Jones, A. Nadalin, B. Campbell, J. Bradley, C. Mortimore / IETF『RFC 8693: OAuth 2.0 Token Exchange』Standards Track, 2020-01. https://www.rfc-editor.org/rfc/rfc8693 （参照箇所: §2.1, §2.2.1, §2.2.2, §3、確認日: 2026-10-15。RS-06#43〜#45）

[^2]: A. Tulshibagwale, G. Fletcher, P. Kasselman / IETF『Transaction Tokens』draft-ietf-oauth-transaction-tokens-11, 2026-07-30（Internet-Draft、IESG 未提出、2027-01-31 失効予定。standards-status SS-B04）. https://www.ietf.org/archive/id/draft-ietf-oauth-transaction-tokens-11.txt （参照箇所: §9.1, §9.2, §11.1〜§11.4, §13.15、確認日: 2026-10-15。RS-06#32〜#42）
