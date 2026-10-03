# RS-04 OAuth/OIDC token profile 一次資料調査ノート

> 文書ID: RS-04 / 版: 0.2 / 状態: draft / 最終更新: 2026-10-03
> 対応要求: R-158, R-159, R-160, R-161, R-162, R-163, R-095, R-096, R-100, R-206, R-046, R-045, R-064, R-143, R-189, R-197, R-198
> 依存文書: CONVENTIONS.md, traceability/seed/seed-01-ciso-assurance.md, traceability/seed/seed-02-cto-technical.md, traceability/seed/seed-03-redteam-decision.md

本ノートは AI エージェント（Claude）が原典（RFC Editor の RFC 本文、IETF Datatracker、OpenID Foundation の仕様本文と公式告知）を取得して作成した調査ノートである。作成者以外による原典照合を 2026-10-03 に実施し、その結果に基づいて版 0.2 で修正した（判定表と修正内容は research/verification/RS-04-verification.md）。照合も AI エージェント（Claude）が行ったものであり、人間の査読ではない。seed-01〜03 は問いの手掛かりとしてのみ使い、根拠には引いていない。

凡例: [N] 規範要求・標準の状態（原典）、[D] 設計推論（根拠の RS-04#n を併記）。前提台帳（01_governance/assumptions-register.md）が未作成のため、[A-xxx] は付けていない。基準シナリオ（CONVENTIONS.md §7）に依存する推論は「前提: 基準シナリオ」と書いた。強度表記の「MUST」「SHOULD」等は IETF BCP 14 の原文どおりである。OIDF 仕様の「shall」「should」は ISO Directive Part 2 の用法であり、こちらも原文どおりに写した。

## 1. 調査の問い

seed 由来の問い:

1. RFC 9700 の MUST/SHOULD を、どの単位とどの列で採否表にするか。逸脱はどう記録するか（seed-02 2-1、R-158、R-159）。
2. FAPI 2.0 の状態（Final か draft か）と主要要件（PAR、PKCE、sender-constrained、private_key_jwt/mTLS、issuer 識別）は何か。FAPI 2.0 を必須にすべき API 範囲はどこか（seed-02 2-2、R-096、R-160）。
3. DPoP と mTLS をどう使い分けるか。DPoP nonce はどう運用するか（seed-02 2-2、R-163）。
4. opaque token と JWT の境界をどこに引くか。introspection の負荷と即時失効はどう両立させるか（seed-02 2-3、R-095）。
5. JWT の検証規則（typ 分離、alg allowlist、鍵と issuer の結合、相互排他的検証規則）は何か。8725bis はどの状態にあるか（seed-02 2-4、R-161、R-162）。
6. 委任（act、may_act、resource indicator、RAR）には規範上どんな制約があるか（seed-02 2-5、R-100、R-206）。
7. 失効と継続評価（RFC 7009、SSF/CAEP/RISC、Token Status List）はどの状態にあるか。伝播について規範が保証しないものは何か（seed-02 2-6、R-143）。
8. refresh token をクライアント種別ごとにどう保護するか（seed-02 2-7）。

本調査で追加した問い:

9. OAuth 2.0 for Browser-Based Apps は RFC になったか。RFC 番号と主要要求は何か（seed-02 で要再検証とされた項目）。
10. OAuth 2.1 は確定したか。準拠基準として引用してよいか。
11. FAPI 2.0 を部分的に採用してよいか（プロファイル化規則）。FAPI 2.0 の形式解析が対象にしていないフローは何か。
12. RFC 9068 の署名アルゴリズム要件と FAPI 2.0 の alg 制限は両立するか。
13. FAPI 2.0 Message Signing の Final はどこまでを対象にしているか。リソース要求本文の署名は標準化済みか。
14. step-up（RFC 9470）を使うとき、RS は auth_time/acr をどう扱えるか（R-045）。
15. FAPI 2.0 の適合試験は利用できるか（R-064）。

## 2. 結論サマリ

1. 本ノートの方針で RFC 9700 の規範要求を主体・条件ごとにまとめると39行になり、そのうち29行が MUST/MUST NOT/REQUIRED を含む。残る10行は SHOULD 系（SHOULD/SHOULD NOT/RECOMMENDED。MAY を併記した行を含む）である（根拠: RS-04#1〜#39 の強度列の集計。行数は要約の粒度に依存し、RFC 9700 が定める数ではない）[D]。MAY だけの規定（§4.1.3 の、PAR/JAR でクライアント認証済みの要求なら redirect URI を追加検査なしで信頼してよい、など）と、§4.17.2 末尾の「§2.1 の認可応答保護策を in-browser 通信にも同等に適用する（MUST）」は独立行にしていない[N][^1]。同じ要求でも public/confidential、browser/native、複数 AS と対話するか否かで適用条件が変わる[N][^1]。このため採否表は「規範文 × 適用条件」の単位で作り、SHOULD から逸脱する場合は理由、補完統制、受容票を必須にする（根拠: RS-04#1〜#39）[D]。
2. 規範文の強度は原文どおりに写す必要がある。RFC 9700 では、implicit grant は SHOULD NOT（MUST NOT ではない）、非対称クライアント認証は RECOMMENDED、mix-up 対策は「複数 AS と対話するクライアントでは REQUIRED」である[N][^1]。seed-01 R-158 の「implicit廃止」は自社の採否判断として書き分け、BCP の要求と混同しないようにする（根拠: RS-04#4, #13, #20）[D]。
3. FAPI 2.0 Security Profile と Attacker Model は 2025-02 に、Message Signing は 2025-09 に OIDF Final になった[N][^26][^27][^28]。Security Profile は、金融以外を含む高価値・機微データの API を対象に設計されている[N][^23]。一方で public client は対象外であり、AS は confidential client だけを支援しなければならない（shall）[N][^23]。このため FAPI 2.0 の必須範囲は「高価値・要配慮データ・決済・特権操作を扱い、confidential client（BFF や第三者サーバーを含む）から呼ばれる API」とするのが整合的である（根拠: RS-04#41, #73, #74、前提: 基準シナリオ）[D]。
4. FAPI 2.0 では、準拠を名乗るプロファイルが mandatory な振る舞いを除去・上書きしてはならない（shall not）[N][^23]。このため部分的に採用する範囲は「FAPI 2.0 準拠」と称さず、「RFC 9700 準拠プロファイル＋FAPI 由来の個別統制」として扱う必要がある（根拠: RS-04#48）[D]。
5. mTLS（RFC 8705）には次の制約がある。RS は mTLS を使うことを TLS handshake 前に知っている必要がある[N][^5]。クライアント証明書を更新すると、その証明書に束縛された access token は無効になる[N][^5]。TLS 終端点からアプリへ証明書情報を渡す方法は範囲外とされている[N][^5]。DPoP（RFC 9449）はアプリ層の仕組みで public client にも使えるが、要求本文の完全性は守らない[N][^4][^1]。proof の再送防止に jti を使う場合、受理窓の間 jti を保持する共有状態が必要になる[N][^4]。以上から、サービス間・B2B サーバー連携は mTLS、ネイティブアプリなど public client は DPoP（＋nonce）を既定とし、TLS 終端時のヘッダ sanitize を必須統制にするのが妥当である（根拠: RS-04#14, #24, #54〜#59）[D]。
6. FAPI 2.0 の RS は、access token の validity、integrity、expiration に加えて revocation status を検証しなければならない（shall）[N][^23]。RFC 7009 は、self-contained な access token について、即時失効が必要なら（同 RFC 発行時の 2013年時点で）標準化されていない AS–RS 間の backend 連携を使い得ること、別の設計として短命の access token で失効後に使われ得る時間を制限できることを挙げ、これらが唯一の選択肢ではないとしている[N][^15]。このため FAPI 範囲の API では、JWT を署名検証するだけでは要件を満たさず、introspection などの失効状態確認手段を併用する必要がある（根拠: RS-04#45, #67, #69）[D]。
7. JWT の検証では次を必須規則にする必要がある[N][^8][^7][^14][^30]。
   - typ による種別分離（at+jwt、token-introspection+jwt、secevent+jwt、dpop+jwt）
   - issuer ごとの alg allowlist と、鍵と issuer の結合
   - resource ごとに異なる aud（RFC 9068 §5 の MUST）
   - 種別間で相互排他的な検証規則（RFC 8725 §3.12 の MUST）

   RFC 9068 は RS256 のサポートを MUST としている[N][^7]。FAPI 2.0 は JWT の作成・処理に PS256、ES256、EdDSA(Ed25519) を使うよう求めている（shall）[N][^23]。このため、FAPI 範囲の issuer と audience だけ allowlist を FAPI の3方式に絞る、issuer 別 allowlist 設計が必要である（根拠: RS-04#47, #60〜#63）[D]。ただし FAPI 範囲の AS・RS は RS256 を処理できないため、RFC 9068 §2.1 の「RS256 をサポートする algorithm に含めなければならない」という MUST から逸脱する。両者は完全には両立しないので、採否表ではこの点を FAPI 優先の逸脱として記録する（根拠: RS-04#47, #60）[D]。
8. refresh token の規範はクライアント種別ごとに異なる。
   - public client: sender-constraining か rotation のどちらかが MUST である[N][^1]。
   - browser-based app: さらに、最大寿命か非活動失効のどちらかを設けることが MUST である。事前に有効期限を定めた refresh token では、rotation で寿命を延長してはならない（MUST NOT）[N][^18]。
   - FAPI の confidential client: AS は例外的な状況を除き rotation を使ってはならない（shall not）[N][^23]。

   したがって refresh token ポリシーは単一値にせず、クライアント種別表として ADR-005 に定義する必要がある（根拠: RS-04#15, #46, #74）[D]。
9. RFC 8693 の token exchange は、入力 token と出力 token を強く結び付けない。失効を伝播させることは一般的な性質ではなく、実装や配備に依存するとされている[N][^11]。このため、exchange で派生した token を親 session や grant の失効に連動させる仕組みは自社で設計し、PoC で反映時間を測る必要がある（根拠: RS-04#66）[D]。
10. OpenID Shared Signals Framework 1.0、CAEP 1.0、RISC 1.0 は Final である（文書の Published は 2025-08-29、承認告知は 2025-09-02）[N][^30][^31][^32][^34]。ただし SSF は、イベントの処理を「情報提供」から「強制執行」まで配備ごとに定めてよいとしている[N][^30]。このため、どのイベントを受けたら、どの操作を、何秒以内に拒否するかという受信義務は、自社の受信プロファイルと DL-17 で定義する必要がある（根拠: RS-04#77, #78）[D]。CAEP Interoperability Profile は 2026-10-03 時点で Implementer's Draft 1 であり、Final ではない[N][^33][^35]。Final 化のレビュー告知には 2026-09-12 と 09-15 の UPDATE があり、60日レビューでの指摘を反映したうえで15日の WG レビューと60日のレビューをやり直すことになった。このため、当初告知されていた投票期間（2026-09-26〜10-10）は進行していない[N][^35]。新しいレビュー・投票の日程は未確認である（確認日に OIDF サイトの投稿を検索したが、2026-09-15 の UPDATE より新しい告知は見つからなかった）。Final 化の時期は未定として扱う（根拠: RS-04#79）[D]。
11. Browser-Based Apps は RFC 10017（BCP 212、2026-08）として発行済みである[N][^18]。同文書は、業務アプリ・機微なアプリ・個人データを扱うアプリについて BFF を「strongly recommended」としている（小文字表記で、BCP 14 キーワードではない）[N][^18]。これは R-163（DPoP の限界と BFF の併用）の根拠として引用できる（根拠: RS-04#73〜#75）[D]。
12. 次の3文書はいずれも Internet-Draft であり、規範根拠には使えない[N][^20][^10][^22]。
    - OAuth 2.1: draft-16、WG Document で、IESG には未提出。
    - 8725bis: draft-10、RFC Editor Queue に入っているが、参照文書待ちで Blocked。
    - Token Status List: draft-21、RFC Editor Queue で処理中。

    いずれも標準ステータス台帳で四半期ごとに追跡し、RFC になった時点で採否表を改版する（根拠: RS-04#63, #76, #80）[D]。
13. FAPI 2.0 Message Signing の Final が対象にしているのは、PAR での JAR、JARM、RFC 9701 の署名付き introspection 応答、ID Token の署名である。リソース要求の署名は含まれていない[N][^25]。HTTP Signatures は FAPI WG の一覧で Draft に区分されている[N][^26]。このため、API 要求本文の否認防止が必要な操作には Final の標準がなく、当面は業務層の署名や監査で補う設計判断が要る（根拠: RS-04#51）[D]。

## 3. 調査結果

### 3.1 RFC 9700（BCP 240）の規範要求一覧: MUST/SHOULD 採否表の素案

- 「要求」列は RFC 9700 本文の要約である[N][^1]。強度は原文の BCP 14 キーワードをそのまま写した。§4 の詳細規定が §2 と重なる場合は1行にまとめた。
- 「採否案」と「検証」は本ノートの設計推論である（前提: 基準シナリオ。最終決定は ADR-005 と DL-16）[D]。
- 検証の略記: 適=OIDF 適合試験、負=負例試験（PoC）、設=設定レビュー、実=実装・コードレビュー。

| ID | §（RFC 9700） | 主体 | 要求（原文の強度を保持した要約） | 強度 | 採否案 [D] | 検証 |
|---|---|---|---|---|---|---|
| RS-04#1 | 2.1, 4.1.3 | AS | redirect URI と事前登録 URI の照合には exact string matching を使わなければならない。例外は native app の localhost URI の port 番号だけで、その場合は可変 port を許容しなければならない[N][^1] | MUST | 採用（全クライアント） | 負・適 |
| RS-04#2 | 2.1, 4.1.3, 4.11.1 | Client、AS、redirect URI のホスト | open redirector を公開してはならない[N][^1] | MUST NOT | 採用 | 負 |
| RS-04#3 | 2.1, 4.7.1 | Client | CSRF を防止しなければならない。PKCE の CSRF 保護に依存してよい（MAY）のは AS の PKCE 対応を確認した場合だけである（MUST）。OIDC フローでは nonce が CSRF 保護になる。それ以外の場合は UA に結合した一回限りの CSRF token を state に入れて使わなければならない（§4.7.1 では「AS が PKCE を支援しない場合は state か nonce を使わなければならない」）。state で application state を運び、その完全性が問題になる場合は改ざんとすり替えを防がなければならない[N][^1] | MUST（MAY を含む） | 採用（PKCE を全クライアント必須にし、PKCE に依存する） | 負 |
| RS-04#4 | 2.1, 4.4.2 | 複数の AS と対話する Client | mix-up 対策は REQUIRED であり、クライアントは mix-up を防がなければならない。認可要求ごとに送信先 issuer を保存し、UA に結合しなければならない[N][^1] | REQUIRED / MUST | 採用（B2B マルチ IdP の RP 機能と、複数 AS を扱うクライアント） | 負 |
| RS-04#5 | 2.1, 4.4.2.1 | Client | mix-up 対策には RFC 9207 の iss パラメータ（または ID Token の iss 等）を使うべきである（SHOULD）。受信した issuer は保存した issuer と比較し、不一致なら処理を中止しなければならない。iss は RFC 9207 に従って評価しなければならない[N][^1] | SHOULD / MUST | 採用（RFC 9207 方式を既定にする） | 負 |
| RS-04#6 | 2.1, 4.4.2.2 | Client | issuer ごとに異なる redirect URI を使う方式は、上記の方式が使えない場合に限って使ってよい（MAY）。使う場合は issuer ごとに別 URI とし、受信 URI を照合し、不一致なら中止しなければならない（MUST）。この方式は他の選択肢がない場合だけに使うべきである（SHOULD）[N][^1] | MAY / MUST / SHOULD | 不採用（代替方式としてのみ記録） | 設 |
| RS-04#7 | 2.1, 4.12 | AS | 利用者の資格情報を含み得る要求をリダイレクトする AS は、資格情報を誤って転送しないようにしなければならない。HTTP 307 を使ってはならない。HTTP リダイレクトには 303 を使うべきである[N][^1] | MUST / MUST NOT / SHOULD | 採用 | 負 |
| RS-04#8 | 2.1.1 | public client | PKCE を使わなければならない[N][^1] | MUST | 採用 | 適・負 |
| RS-04#9 | 2.1.1, 4.5.3.2 | confidential client | PKCE は RECOMMENDED である。confidential な OIDC client は、追加措置のもとで nonce を代わりに使ってよい（MAY）。その場合は token endpoint から得た ID Token の nonce を検証し、検証が成功するまで全 token を使ってはならない（MUST）[N][^1] | RECOMMENDED / MAY / MUST | 採用（confidential client も PKCE 必須。nonce による代替は不採用） | 適 |
| RS-04#10 | 2.1.1 | Client | PKCE challenge または OIDC nonce は取引ごとに固有で、クライアントと開始した UA に安全に結合しなければならない（MUST）。verifier を認可要求で露出しない challenge method を使うべきであり（SHOULD）、現時点でそれに当たるのは S256 だけである[N][^1] | MUST / SHOULD | 採用（S256 のみ。plain は禁止） | 負 |
| RS-04#11 | 2.1.1, 4.7.1 | AS | PKCE を支援しなければならない。code_challenge が送られた場合は code_verifier の正しい使用を強制しなければならない。PKCE への対応をクライアントが検出できる手段を提供しなければならない。code_challenge_methods_supported の公開は RECOMMENDED である[N][^1] | MUST / RECOMMENDED | 採用 | 適 |
| RS-04#12 | 2.1.1, 4.8.2 | AS | PKCE downgrade 攻撃を緩和しなければならない。認可要求に code_challenge がなかった場合、code_verifier を含む token 要求は拒否しなければならない[N][^1] | MUST | 採用（PKCE 必須化で暗黙に満たす。負例試験で確認する） | 負 |
| RS-04#13 | 2.1.2, 4.1.3 | Client | implicit grant（response_type=token）など、認可応答で access token を発行する response type は使うべきでない（SHOULD NOT）。代わりに code を使うべきである（SHOULD）[N][^1] | SHOULD NOT / SHOULD | 採用（AS 側で該当する response type を無効化する） | 設・負 |
| RS-04#14 | 2.2.1, 4.9.3, 4.10 | AS、RS | access token は mTLS や DPoP で sender-constrained にすべきである。AS は access token を sender-constrained かつ audience-restricted にすべきである[N][^1] | SHOULD | 採用（既定）。逸脱する場合は操作階層ごとに受容票を作る | 負 |
| RS-04#15 | 2.2.2, 4.14.2 | AS | public client の refresh token は、sender-constrained にするか rotation を使わなければならない[N][^1] | MUST | 採用 | 負 |
| RS-04#16 | 2.3 | AS | access token の権限は、用途に必要な最小限に制限すべきである。さらに特定のリソースと操作に制限すべきである。制限には scope や authorization_details を使ってよい（MAY）[N][^1] | SHOULD / MAY | 採用 | 設 |
| RS-04#17 | 2.3, 4.9.3, 4.10.2 | AS、RS | access token は特定の RS（難しければ少数の RS）に audience-restricted にすべきである。RS は自分宛でない token による要求を拒否しなければならない。aud claim（RFC 9068）や resource パラメータ（RFC 8707）を使ってよい[N][^1] | SHOULD / MUST / MAY | 採用（サービス別の aud。共通 aud は禁止） | 負 |
| RS-04#18 | 2.4 | 全体 | resource owner password credentials grant を使ってはならない[N][^1] | MUST NOT | 採用（AS で無効化する。既存システムの移行に伴う例外は期限付きの受容票で扱う） | 設 |
| RS-04#19 | 2.5 | AS | 配備上可能であれば、クライアント認証を強制すべきである[N][^1] | SHOULD | 採用 | 設 |
| RS-04#20 | 2.5 | AS、Client | クライアント認証には非対称暗号（mTLS、private_key_jwt）を使うことが RECOMMENDED である[N][^1] | RECOMMENDED | 採用（client_secret は移行期限付きの例外） | 適 |
| RS-04#21 | 2.6 | AS、Client | AS は RFC 8414 の metadata を公開し、クライアントはそれを使って自己設定することが RECOMMENDED である[N][^1] | RECOMMENDED | 採用 | 設 |
| RS-04#22 | 2.6, 4.15.1 | AS | client_id と利用者識別子が共通の名前空間にある場合、クライアントが client_id など利用者と混同され得る claim に影響を与えられるようにすべきでない。避けられない場合は、RS が2種類の token を区別できる別の手段を提供しなければならない[N][^1] | SHOULD NOT / MUST | 採用（client_id の自己指定を禁止し、sub の名前空間を分離する） | 負 |
| RS-04#23 | 2.6 | Client と RS の間 | Client と RS の間は end-to-end TLS にすることが RECOMMENDED である。中間で終端する場合は §4.13 に従う[N][^1] | RECOMMENDED | 要決定（ingress や mesh で終端する構成が想定されるため、#24 で補う） | 設 |
| RS-04#24 | 4.13 | reverse proxy | reverse proxy は、アプリケーションサーバのセキュリティに関わる全ヘッダ値の真正性と完全性を確保するため、受信要求を sanitize しなければならない。proxy とアプリの間の通信路は、盗聴・注入・再送から保護しなければならない[N][^1] | MUST | 採用（mTLS のクライアント証明書ヘッダの転送を含む） | 負 |
| RS-04#25 | 2.6 | AS | 認可応答を暗号化されていない接続で送ってはならない。loopback を使う native client を除き、http scheme の redirect URI を許可してはならない[N][^1] | MUST NOT | 採用 | 設 |
| RS-04#26 | 2.6, 4.17.2 | AS、Client | postMessage などブラウザ内通信で認可応答を送る場合、送信側と受信側の双方を厳格に検証しなければならない。AS は受信 origin を exact match で照合し、信頼済み origin にだけ送信し、`"*"` を使ってはならない。Client はメッセージの注入を防ぎ、送信元 origin を exact match で照合しなければならない[N][^1] | MUST / MUST NOT | 条件付き（使う場合に限る。既定では使わない） | 負 |
| RS-04#27 | 2.6 | AS | 認可エンドポイントでは CORS を支援してはならない。token endpoint などでは支援してよい（MAY）[N][^1] | MUST NOT / MAY | 採用 | 負 |
| RS-04#28 | 3 | 実装者 | 実装の環境に存在し得る全種類の攻撃者を考慮しなければならない。A1〜A5 は最小限のモデルである[N][^1] | MUST | 採用（03_threat-model の ATK 類型に対応付ける） | 設 |
| RS-04#29 | 4.2.4 | AS、Client | 認可応答の結果として描画されるページと認可エンドポイントには、第三者のリソースや外部サイトへのリンクを含めるべきでない[N][^1] | SHOULD NOT | 採用 | 実 |
| RS-04#30 | 4.2.4 | AS | 認可コードは、token endpoint での初回使用後に無効化しなければならない（RFC 6749 §4.1.2 の再掲）。同じコードが二重に償還された場合は、そのコードに基づいて発行した全 token を失効させるべきである[N][^1] | MUST / SHOULD | 採用 | 適・負 |
| RS-04#31 | 4.2.4 | Client | state 値は、redirect endpoint での初回使用後に無効化すべきである[N][^1] | SHOULD | 採用（state を使う場合） | 実 |
| RS-04#32 | 4.3.2 | Client | access token を URI の query parameter で送ってはならない[N][^1] | MUST NOT | 採用（RS は query の access token を拒否する） | 負 |
| RS-04#33 | 4.9.3 | RS | access token は他の機微な秘密と同様に扱い、平文で保存・転送してはならない[N][^1] | MUST | 採用（ログ、トレース、エラー出力に access token を記録しない） | 実 |
| RS-04#34 | 4.11.2 | AS | 正規に登録された redirect URI を悪用するフィッシングへの予防措置を取らなければならない。リダイレクトの前に、常にまず利用者を認証し、silent authentication の場合を除いて必要に応じて資格情報の入力を求めなければならない。redirect URI を信頼できる場合にだけ自動リダイレクトすべきである[N][^1] | MUST / SHOULD | 採用（動的クライアント登録を許す場合は特に重要） | 負 |
| RS-04#35 | 4.14.2 | AS | クライアントごとに、refresh token を発行するかどうかをリスク評価に基づいて決めなければならない[N][^1] | MUST | 採用（クライアント種別×操作階層の発行可否表で決める） | 設 |
| RS-04#36 | 4.14.2 | AS | 発行した refresh token は、資源所有者が同意した scope と RS に結合しなければならない[N][^1] | MUST | 採用 | 負 |
| RS-04#37 | 4.14.2 | AS | refresh token に grant を符号化する場合は、refresh token 値の完全性（署名など）を確保しなければならない[N][^1] | MUST（条件付き） | 条件付き（構造化された refresh token を採用する場合） | 実 |
| RS-04#38 | 4.14.2 | AS | クライアントが一定期間使っていない refresh token は失効させるべきである。パスワード変更や AS でのログアウトなどのセキュリティイベントで自動的に失効させてよい（MAY）[N][^1] | SHOULD / MAY | 採用（値は R-189 の数値契約で決める） | 負 |
| RS-04#39 | 4.16 | AS | clickjacking を防がなければならない（MUST）。CSP level 2 以上を使うべきである。管理者がクライアントごとに framing を許可する origin を設定できるようにすべきである。CSP は他の手法と併用すべきである（いずれも SHOULD）[N][^1] | MUST / SHOULD | 採用 | 負 |

RFC 9700 の原文例（§2.2.2）: "Refresh tokens for public clients MUST be sender-constrained or use refresh token rotation as described in Section 4.14."[N][^1]

### 3.2 FAPI 2.0（Security Profile / Attacker Model / Message Signing）

- **RS-04#40（状態）**: FAPI 2.0 Security Profile と Attacker Model は OIDF Final である[N][^23][^24]。文書の Published 日付は 2025-02-22 である[N][^23][^24]。OIDF の承認告知は 2025-02-19 付で、投票結果は承認82、反対0、棄権14だった[N][^27]。FAPI 2.0 Message Signing も Final で、文書の Published 日付は 2025-09-25、承認告知は 2025-09-26 付（承認87、反対0、棄権20）である[N][^25][^28]。FAPI WG の仕様一覧では、「FAPI 2.0 Http Signatures」は Drafts に区分されている[N][^26]。一覧からリンクされた working copy の題名は「FAPI 2.0 Http Signatures (Draft)」で、Published 表示は 2026-06-26 である[N][^38]。
- **RS-04#41（適用対象と public client の除外）**: Security Profile は、金融向けに始まったが、高価値で機微な（個人その他の）データを公開する API の保護に汎用的に使えるよう設計されている。原文は "designed to be universally applicable for protecting APIs exposing high-value and sensitive (personal and other) data, for example, in e-health and e-government applications"[N][^23]。一方で、public client を同じ程度に保護する仕組みは知られていないとして、public client は適用範囲外とされている[N][^23]。AS は confidential client だけを支援しなければならない（shall）[N][^23]。
- **RS-04#42（AS 一般要件、§5.3.2.1）**: AS には次の義務がある[N][^23]。
  - metadata（OIDD / RFC 8414）を配布する（shall）。
  - ROPC を拒否する（shall）。
  - sender-constrained な access token だけを発行する（shall）。方式は mTLS（RFC 8705）か DPoP（RFC 9449）とする。
  - クライアント認証は mTLS か private_key_jwt で行う（shall）。
  - open redirector を公開しない（shall not）。
  - client assertion の aud には、自 AS の issuer 識別子を文字列として受け入れるだけにする（shall）。
  - 認可コードの最大寿命を60秒とする（shall）。
  - DPoP を使う場合は、認可コードと DPoP 鍵の結合を支援する（shall）。
  - iat/nbf が未来0〜10秒の JWT は受け入れ、60秒を超える JWT は拒否する（shall）。
  - access token の権限は最小限に制限するべきである（should）。
- **RS-04#43（認可エンドポイントのフロー、§5.3.2.2）**: AS には次の義務がある[N][^23]。
  - response_type は code だけを要求する（shall）。
  - クライアント認証付きの PAR（RFC 9126）を支援する（shall）。PAR を使わない認可要求は拒否し、クライアント認証のない PAR も拒否する（shall）。
  - PKCE の S256 を要求する（shall）。PAR では redirect_uri を必須にする（shall）。
  - 認可応答で RFC 9207 の iss を返す（shall）。
  - 一度使われた認可コードは拒否する（shall）。
  - 資格情報を含む要求のリダイレクトに 307 を使わない（shall not）。303 を使うべきである（should）。
  - PAR の request_uri の expires_in は600秒未満とする（shall）。
- **RS-04#44（Client 要件、§5.3.3）**: Client には次の義務がある[N][^23]。
  - sender-constrained な token（mTLS と DPoP のどちらか一方または両方）を支援する。
  - クライアント認証（mTLS と private_key_jwt のどちらか一方または両方）を支援する。
  - private_key_jwt の aud には、AS の issuer 識別子を配列ではなく文字列で入れる。
  - DPoP を使う場合は、サーバ提供の nonce を支援する。
  - metadata は信頼できる取得元から安全な経路で得た issuer URL をもとに取得し、metadata の issuer と一致することを確認する。
  - 認可コードフローでは PAR と PKCE S256 を使う。
  - 認可応答の iss を RFC 9207 に従って検査する。
  - 認可エンドポイントには client_id と request_uri だけを送る。

  いずれも強度は shall である。
- **RS-04#45（RS 要件、§5.3.4）**: RS は access token を query parameter で受け付けてはならない（shall not）[N][^23]。RS は "shall verify the validity, integrity, expiration and revocation status of access tokens" を満たさなければならない[N][^23]。RS は sender-constrained token（mTLS と DPoP のどちらか一方または両方）を支援し、検証しなければならない（shall）[N][^23]。失効状態をどの手段で検証するかは、Security Profile に規定がない[N][^23]。
- **RS-04#46（refresh token rotation）**: AS は、例外的な状況を除き refresh token rotation を使ってはならない（shall not）[N][^23]。理由として、confidential client と sender-constrained access token の組み合わせでは rotation にセキュリティ上の利点がなく、新しい refresh token を受け取り損ねた場合に利用者体験と運用を損なうことが挙げられている（Note 1）[N][^23]。例外的に rotation を使う場合は、旧 refresh token で再試行できる期限付きの手段をクライアントに提供することが条件とされている[N][^23]。一方で、クライアントは refresh token と rotation の両方を支援しなければならない（shall）[N][^23]。
- **RS-04#47（暗号とネットワーク、§5.2, §5.4）**: 暗号とネットワークに関する主な要件は次のとおりである[N][^23]。
  - JWT は RFC 8725 に従う（shall）。使ってよい alg は PS256、ES256、EdDSA（Ed25519）に限られ、none は使用も受理もしない（shall）。
  - 鍵長は RSA 2048 bit 以上、EC 224 bit 以上とする（shall）。
  - 利用者が扱わない資格情報（token、コード等）は128 bit 以上のエントロピーで生成する（shall）。
  - jwks_uri は TLS でだけ提供する（shall）。x5u と jku は使うべきでなく、同じ kid の鍵を複数含めるべきでない（should not）。
  - TLS 1.2 以上を使い、BCP 195 に従う（shall）。DNSSEC を使うべきである（should）。
  - 認可エンドポイントでは CORS を支援しない（shall not）。
  - 新しい BCP 195 が出た場合、12か月以内に準拠することが期待されている（NOTE 2）。
- **RS-04#48（プロファイル化規則と形式解析の範囲）**: Security Profile に準拠するプロファイルは、mandatory な振る舞いを除去・上書きしてはならない（shall not）[N][^23]。理由は、形式的なセキュリティ解析が無効になるおそれがあるためである[N][^23]。§5.3.2.1 NOTE 2 は、一般要件の下で client credentials grant や CIBA grant などの多様な grant を使えるよう構成していると述べたうえで、執筆時点で詳細なセキュリティ解析を経たのは認可コードフローと CIBA だけであると記している[N][^23]。したがって client credentials grant は、詳細解析を経たフローに含まれない[N][^23]。
- **RS-04#49（セキュリティ考察 §6.2, §6.3）**: RS 側で要求を読める攻撃者（A5）は DPoP proof を再送でき、DPoP は本文や大半のヘッダに署名しないため、改変した要求にも proof を再利用され得る[N][^23]。緩和策として次が挙げられている[N][^23]。
  - RS が短命の DPoP nonce を発行する。
  - jti で再送を防ぐ。
  - FAPI Message Signing の署名付きリソース要求を使う。
  - DPoP の代わりに mTLS を検討する。

  ただし RS-04#51 のとおり、Final の FAPI 2.0 Message Signing はリソース要求の署名を含まない。このため3つ目の緩和策は、確認日時点では Final の仕様で実現できない（根拠: RS-04#51）[D]。

  いわゆる "Cuckoo's Token Attack"（攻撃者が支配する AS から得た token を注入する攻撃）には、AS ごとに異なる DPoP 鍵や mTLS 証明書を使うこと、短命の access token を使うことなどが緩和策として挙げられている[N][^23]。
- **RS-04#50（Attacker Model）**: セキュリティ目標は認可、認証、セッション完全性の3つである[N][^24]。想定する攻撃者は A1 web attacker、A1a（AS として参加する web attacker）、A2 network attacker、A3a（認可要求を読める攻撃者）、A4（token endpoint の誤設定を表すモデルで、FAPI 2.0 では関連なしとして参考扱い）、A5（RS 側で要求を読める攻撃者）である[N][^24]。次の事項はモデルの範囲外である[N][^24]。
  - TLS の破綻
  - JWKS の配布障害
  - 侵害された端末やブラウザ
  - 本人確認、利用者認証、セッション管理
  - AS 上の RCE
  - 誤設定された DB からの資格情報漏えい

  原文は "Other attacks are not covered by the attacker model. For example, user credentials being exposed through misconfigured databases or remote code execution attacks on authorization servers are neither prevented by nor accounted for in the attacker model."[N][^24]
- **RS-04#51（Message Signing の範囲）**: Message Signing は Security Profile の全規定に追加して適用される[N][^25]。対象は次の3つで、いずれも別々に適合試験を選べるとされている[N][^25]。
  - JAR（RFC 9101）による PAR の署名
  - JARM による認可応答の署名
  - RFC 7662 と RFC 9701 による introspection 応答の署名

  否認防止の対象メッセージとして NR1〜NR5 が定義されている（PAR、front-channel の認可要求、認可応答、introspection 応答、ID Token）[N][^25]。リソース要求とリソース応答の署名は Final の範囲に含まれていない[N][^25][^26]。
- **RS-04#52（適合試験）**: OIDF は 2025-07-09 付の告知で、FAPI 2.0 Security Profile と Message Signing の最終版に対する適合試験と認定を、AS とクライアントの双方向けに提供すると発表した[N][^29]。ただし同告知の時点では、Message Signing はまだ public review と投票の途中（告知中のリンク表記は「Proposed Final」）であった。Final として承認されたのは 2025-09-26 の告知による[N][^29][^28]。DPoP と mTLS のどの組み合わせが試験の対象になっているかは、本調査では確認していない（§6 参照）。

### 3.3 PAR・DPoP・mTLS

- **RS-04#53（RFC 9126 PAR）**: PAR は、機密性と完全性が保護された認可要求を送る手段であり、利用者とのやり取りが始まる前に AS がクライアントを認証できる[N][^3]。request_uri はそれを登録したクライアントに結合しなければならない（MUST）[N][^3]。クライアントは request_uri を一度だけ使わなければならない（MUST）[N][^3]。AS は request_uri を一回限りとして扱うべきである（SHOULD）が、利用者の再読み込みによる重複は許してよい（MAY）[N][^3]。期限切れの request_uri は拒否しなければならない（MUST）[N][^3]。AS は、認証済みのクライアントから送られた PAR の場合に限り、新しい redirect URI を受け入れなければならない（MUST、§7.2）[N][^3]。PAR だけを受け付けることを示す metadata として require_pushed_authorization_requests が定義されている[N][^3]。
- **RS-04#54（RFC 9449 DPoP の目的と限界）**: DPoP は、漏えい・窃取された token の不正使用を防ぐための多層防御である[N][^4]。安全な通信路の代わりにはならず、常に HTTPS と組み合わせて使わなければならない（MUST、§2）[N][^4]。XSS などで攻撃者がクライアントの実行コンテキストでコードを動かせる場合、DPoP の安全性は保証されない[N][^4]。その場合、鍵が非エクスポートでも、クライアントがオンラインの間は新しい proof を作られ得る[N][^4]。さらに、silent な新規フローを通じて攻撃者自身の鍵に token を束縛させられ得る（§11.4）[N][^4]。RFC 9449 は、XSS への第二の防御層として CSP を挙げている[N][^4]。
- **RS-04#55（DPoP proof の検査、§4.3）**: 受信側サーバは次をすべて確認しなければならない（MUST）[N][^4]。
  - DPoP ヘッダが1つだけであること。
  - typ が dpop+jwt であること。
  - alg が登録済みの非対称署名方式で、none ではなく、ローカルポリシーで許容されていること。
  - jwk の公開鍵で署名を検証できること。jwk に秘密鍵が含まれていないこと。
  - htm と htu が実際の要求と一致すること。
  - nonce を提供した場合は、それと一致すること。
  - iat（または nonce）が許容窓の中にあること。
  - access token と一緒に提示された場合は、ath が access token のハッシュと一致し、access token に束縛された鍵と一致すること。
- **RS-04#56（再送・事前生成・nonce、§11.1〜§11.3）**: サーバは、作成後の限られた時間（秒〜分の単位が望ましい）だけ DPoP proof を受け入れなければならない（MUST）[N][^4]。jti による単回使用の検査は強い再送防止になるが、同じエンドポイントの背後にある複数のサーバが状態を共有していない場合は実現できないことがあると明記されている[N][^4]。nonce の仕組みを使わない配備では、長寿命の DPoP 束縛 access token を発行すべきでない（SHOULD NOT）[N][^4]。サーバが nonce を提供した後は、nonce のない proof を受け入れてはならない（MUST NOT）[N][^4]。
- **RS-04#57（DPoP と refresh token、§5）**: DPoP proof を提示した public client に refresh token を発行する場合、その refresh token は proof の公開鍵に束縛しなければならず（MUST）、その後の使用時にもこの束縛を検証しなければならない（MUST）[N][^4]。confidential client の refresh token は、クライアント認証によってすでに sender-constrained されているため、DPoP 鍵には束縛しない[N][^4]。token 応答の token_type が DPoP でない場合、その保護が重要なクライアントは応答を破棄しなければならない（MUST）[N][^4]。
- **RS-04#58（downgrade、要求の完全性、コード束縛）**: DPoP と Bearer の両方を受け付ける RS は、Bearer として提示された DPoP 束縛 token を拒否しなければならない（MUST、§7.2）[N][^4]。DPoP は要求本文やヘッダの完全性を保証しない（§11.7）[N][^4]。dpop_jkt パラメータを使った認可コードの束縛（§10）では、token 要求の proof の鍵の thumbprint が一致しない場合、AS は要求を拒否しなければならない（MUST）[N][^4]。
- **RS-04#59（RFC 8705 mTLS と RFC 9700 での位置付け）**: mTLS で証明書に束縛された access token を使うには、RS は一部または全部の資源で mTLS を使うことをあらかじめ知っている必要がある。access token は TLS handshake の後にしか届かないため、mTLS を要求するかどうかの判断材料にはならない（§3）[N][^5]。RS は TLS 層からクライアント証明書を取得し、access token に結び付いた証明書と一致することを検証しなければならず（MUST）、一致しなければ 401 invalid_token で拒否しなければならない（MUST）[N][^5]。RS は証明書の信頼チェーンを検証する必要はない（§6.2）[N][^5]。クライアントが証明書を更新すると、束縛されていた access token は無効になる（§6.3）[N][^5]。TLS を中継装置で終端する場合に証明書情報をどう渡すかは、RFC 8705 の範囲外である（§6.5）[N][^5]。public client も自己署名証明書で access token を束縛でき、その場合は refresh token も束縛すべきである（SHOULD、§4）[N][^5]。RFC 9700 は次のように整理している（§4.10.1, §4.10.2）[N][^1]。
  - mTLS の token は複数の RS で使える。audience 制限をかける場合は RS ごとに token が必要になる。
  - 攻撃者が token と鍵の両方を手に入れると、sender-constraining は効かなくなる。
  - 鍵がハードウェアやソフトウェアのセキュリティモジュール、または TLS スタックに保護されていれば、クライアントがオフラインの間の不正使用は防げる。

### 3.4 token の形式と検証

- **RS-04#60（RFC 9068 の構造と検証、§2, §4）**: JWT access token は次の要件を満たす[N][^7]。
  - 署名しなければならず（MUST）、none を使ってはならない（MUST NOT）。
  - typ は at+jwt とする（SHOULD。media type の宣言自体は MUST）。
  - iss、exp、aud、sub、client_id、iat、jti は REQUIRED である。
  - AS と RS は、サポートする署名方式に RS256 を含めなければならない（MUST）。

  なお、§2.2 の iss を OPTIONAL に改めるよう求める errata 8802 が 2026-03-04 に報告されているが、確認日時点の状態は Reported（未検証）であり、本文の REQUIRED は変わっていない[N][^37]。

  RS は次をすべて検証しなければならない（MUST）[N][^7]。
  - typ が at+jwt または application/at+jwt であること。
  - iss が issuer 識別子と完全に一致すること。
  - aud に自分の識別子が含まれること。
  - AS が提供する鍵で署名を検証できること。alg が none なら拒否すること。
  - 現在時刻が exp より前であること。
- **RS-04#61（RFC 9068 のセキュリティとプライバシー、§5, §6）**: 同じ issuer が異なるリソース向けに発行する access token には、resource ごとに異なる aud を使わなければならない（MUST）[N][^7]。ID Token と access token を別の鍵で署名しても、鍵漏えいへの防御にはならない。RS は公開されたどの鍵による署名も受け入れざるを得ないためである[N][^7]。クライアントは access token の内容を調べてはならない（MUST NOT）[N][^7]。JWT の内容はクライアントからも見えるため、情報漏えいの対策として、暗号化、機微な claim の省略、opaque token への切り替えなどが挙げられている[N][^7]。
- **RS-04#62（RFC 8725 JWT BCP、§3）**: 主な要求は次のとおりである[N][^8]。
  - ライブラリは、呼び出し側が許容する alg の集合を指定できるようにしなければならず、それ以外の alg を使ってはならない（MUST / MUST NOT）。
  - 1つの鍵は1つの alg だけに使わなければならない（MUST）。
  - JWT に含まれる暗号処理はすべて検証し、1つでも失敗したら JWT 全体を拒否しなければならない（MUST）。
  - iss がある場合は、署名鍵がその issuer のものであることを検証しなければならない（MUST）。
  - 同じ issuer が複数の当事者向けに JWT を発行する場合は、aud を含め、受信者が検証しなければならない（MUST）。
  - 新しい用途の JWT には明示的な型付け（typ）が RECOMMENDED である。
  - 同じ issuer が複数種類の JWT を発行する場合は、種類ごとの検証規則が互いに排他的になるようにしなければならない（MUST、§3.12）。
  - jku や x5u を盲目的に辿ると SSRF の危険がある（SHOULD で対策）。
- **RS-04#63（draft-ietf-oauth-rfc8725bis-10 の状態と差分）**: 8725bis は Internet-Draft（2026-08-21 付、BCP を予定）であり、承認されれば RFC 8725 を廃止する[N][^9]。Datatracker では「Submitted to IESG for Publication」、IESG 状態は RFC Ed Queue、RFC Editor 状態は「Blocked」（理由: Reference Not Received）である[N][^10]。draft の Appendix A は、RFC 8725 からの変更点として次の8項目を挙げている[N][^9]。
  1. alg 値を大文字小文字を区別せずに読む誤りへの防御的検査（§2.11, §3.1）
  2. 復号成功と署名検証成功を区別しない検証者への攻撃（暗号化と署名の取り違え）の緩和（§2.3, §3.3）
  3. PBES2 の反復回数（p2c）が過大な入力の拒否（§2.10, §3.13。本文の強度は RECOMMENDED）
  4. JWT 形式の取り違えへの緩和（§2.13, §3.14。本文の強度は MUST）
  5. JWE の圧縮を悪用した DoS の緩和（展開後サイズの上限。§2.12, §3.15。本文の強度は RECOMMENDED）
  6. 明示的な型付け（typ）の指針の拡充（§3.11, §3.12）
  7. kid、jku、x5u を攻撃者が制御し得る入力として扱う指針と SSRF 対策（§3.10）
  8. draft-ietf-jose-deprecate-none-rsa15 の規範参照化、none の利用を呼び出し側の明示的な opt-in に限ることの MUST 化、RSA-PKCS1 v1.5 **暗号化**アルゴリズムの非推奨化

  §3.1 の本文には、alg と kid で引いた鍵の algorithm との整合検査（MUST）と、alg を blocklist でなく allowlist で扱うべきこと（小文字の should）が書かれている[N][^9]。8 の非推奨化の対象は RSA-PKCS1 v1.5 の鍵暗号化（RSAES-PKCS1-v1_5）であり、署名方式の RS256（RSASSA-PKCS1-v1_5）は含まれない[N][^9]。いずれも draft の内容であり、規範根拠ではない[N][^10]。
- **RS-04#64（RFC 9396 RAR）**: AS は、未知の authorization details type や型定義に合わない要素を処理してはならず、invalid_authorization_details エラーを返さなければならない（MUST）[N][^6]。authorization_details の完全性が問題になる場合、クライアントは改ざんとすり替えから保護しなければならない（MUST）[N][^6]。その手段として、JAR（RFC 9101）や PAR（RFC 9126）が挙げられている[N][^6]。access token が JWT の場合は、audience ごとに絞り込んだ authorization details を top-level claim として入れることが RECOMMENDED である[N][^6]。AS は受け取った値を sanitize しなければならない（MUST）[N][^6]。FAPI 2.0 は、scope では表現しきれない場合に RAR を使うことを推奨している（NOTE 5）[N][^23]。
- **RS-04#65（RFC 8707 resource indicators）**: resource パラメータは絶対 URI でなければならず、fragment を含んではならない（MUST）[N][^12]。query は含むべきでない（SHOULD NOT）[N][^12]。クライアントは API の base URI を使うべきである（SHOULD）[N][^12]。AS は、発行する access token を resource パラメータで示された資源に audience-restrict すべきである（SHOULD）[N][^12]。

### 3.5 委任（token exchange）

- **RS-04#66（RFC 8693）**: AS は、subject_token と（ある場合は）actor_token を、それぞれの種類に応じた手順で検証しなければならない（MUST）[N][^11]。アクセス制御に使ってよいのは、token の top-level claim と、act claim が示す現在の actor だけである（MUST）[N][^11]。入れ子になった act claim が示す過去の actor は情報提供に過ぎず、アクセス制御の判断に使ってはならない[N][^11]。原文は "the consumer of a token MUST only consider the token's top-level claims and the party identified as the current actor by the "act" claim."[N][^11]。token exchange は一度きりの出来事であり、入力 token と出力 token を強く結び付けない[N][^11]。失効イベントの伝播は「STS プロトコルの一般的な性質ではない」とされている（§2.1）[N][^11]。may_act claim は、AS が委任や impersonation を認めるかどうかを判断する材料として定義されている（§4.4）[N][^11]。

### 3.6 introspection、失効、refresh token の基本規定

- **RS-04#67（RFC 7662）**: introspection エンドポイントは、token scanning 攻撃を防ぐため、何らかの認可を要求しなければならない（MUST）[N][^13]。RS は応答をキャッシュしてよい（MAY）が、システムの設計者はキャッシュに伴う性能とセキュリティのトレードオフを検討しなければならない（MUST）[N][^13]。キャッシュしている間に失効した token が使われ得る窓が生じることも明記されている[N][^13]。応答に exp がある場合、その時刻を超えてキャッシュしてはならない（MUST NOT）[N][^13]。非常に機微な環境ではキャッシュを無効にできる、とされている[N][^13]。
- **RS-04#68（RFC 9701 JWT 形式の introspection 応答）**: RFC 9701 は、AS が応答内容に責任を負う場合など、RS がより強い保証を必要とする用途を想定している[N][^14]。AS は RS を識別・認証・認可できなければならず（MUST）、token introspection エンドポイントへの要求はすべて認証しなければならない（MUST）[N][^14]。AS は、その RS が当該 token の audience であることを判定できなければならない（MUST）[N][^14]。応答 JWT の typ は token-introspection+jwt である[N][^14]。RS は、JWT 形式の access token を受け取ったときに typ を確認し、introspection 応答 JWT が access token として使われる置換攻撃を防がなければならない（MUST）[N][^14]。
- **RS-04#69（RFC 7009 revocation）**: 実装は refresh token の失効を支援しなければならず（MUST）、access token の失効も支援すべきである（SHOULD）[N][^15]。refresh token を失効させ、かつ access token の失効を支援している場合は、同じ grant に基づく access token も無効化すべきである（SHOULD）[N][^15]。実際には、一部のサーバだけが失効を知っている「伝播遅延」が起こり得ることが明記されている[N][^15]。Implementation Note は、self-contained な access token について次の2つを挙げている[N][^15]。
  - 即時の失効が必要な場合は、AS と RS の間の（2013年の発行時点で）標準化されていない backend 連携を使い得る。
  - 別の設計として、短命の access token を発行し、失効後に使われ得る時間を制限する。

  同時に、これらが唯一の選択肢ではないこと、どの方式を選ぶかはシステム設計とリスク分析によることも述べている[N][^15]。
- **RS-04#70（RFC 6749 §10.4）**: refresh token は、通信中も保存時も秘匿し、AS と発行先クライアントの間でだけ共有しなければならない（MUST）[N][^2]。AS は refresh token と発行先クライアントの結合を維持しなければならない（MUST）[N][^2]。refresh token は TLS でだけ送らなければならない（MUST）[N][^2]。

### 3.7 issuer 識別と step-up

- **RS-04#71（RFC 9207）**: RFC 9207 を支援する AS は、エラー応答を含むすべての認可応答に iss を入れなければならない（MUST）[N][^16]。iss の値は、query と fragment を含まない https URL でなければならない（MUST）[N][^16]。metadata の authorization_response_iss_parameter_supported を true にしなければならない（MUST）[N][^16]。クライアントは iss と送信先 AS の issuer を単純な文字列比較で比べ、一致しなければ応答を拒否し、grant を進めてはならない（MUST / MUST NOT）[N][^16]。iss を支援する AS としない AS が混在する場合、クライアントは AS ごとに支援の有無を保持し、支援する AS からの iss のない応答を拒否しなければならない（MUST）[N][^16]。
- **RS-04#72（RFC 9470 step-up）**: RS は、エラーコード insufficient_user_authentication と、auth-param の acr_values と max_age を使って、クライアントに追加認証を求めることができる[N][^17]。JWT access token の auth_time と acr は利用者の認証時点で確定し、token を更新しても変わらない（§6.1）[N][^17]。RFC 9470 を、OAuth を認証プロトコルとして位置付けるために使ってはならない（MUST NOT）[N][^17]。acr_values によるチャレンジは、高権限の利用者を推測させる情報漏えいにつながり得るとされている[N][^17]。

### 3.8 Browser-Based Apps（RFC 10017）

- **RS-04#73（状態と構成パターン）**: OAuth 2.0 for Browser-Based Applications は RFC 10017（Best Current Practice、BCP 212、2026-08）として発行済みである[N][^18]。RFC 10017 は3つの構成を、セキュリティが高い順に BFF、token-mediating backend、ブラウザ内 OAuth client として示している[N][^18]。BFF について、原文は "This architecture is strongly recommended for business applications, sensitive applications, and applications that handle personal data." である[N][^18]。ブラウザ内 OAuth client については、同じ対象に対して "not recommended" とされている[N][^18]。どちらも小文字表記であり、BCP 14 キーワードではない[N][^18]。
- **RS-04#74（BFF と refresh token の要求）**: BFF は confidential client として振る舞い、認可コードグラントを使わなければならない（MUST）[N][^18]。BFF の cookie には Secure と HttpOnly を付けなければならない（MUST）[N][^18]。さらに SameSite=Strict、path=/、Domain 属性なし、`__Host-Http-` などの prefix を使うべきである（SHOULD）[N][^18]。BFF は CSRF 対策を実装しなければならない（MUST）[N][^18]。browser-based app に refresh token を発行する場合、AS には次の義務がある[N][^18]。
  - 使用ごとの rotation か sender-constraining のどちらかを行う（MUST）。
  - 最大寿命か非活動失効のどちらかを設ける（MUST）。
  - 事前に有効期限を定めた refresh token の場合、rotation で発行する新しい refresh token の寿命を、最初の refresh token の寿命を超えて延長しない（MUST NOT）。
  - refresh token の寿命を利用者の AS セッションに連動させる（SHOULD）。

  shared secret を静的に埋め込んだ SPA について、AS はその secret を本人性の証明として扱ってはならない（MUST）[N][^18]。
- **RS-04#75（ブラウザでの DPoP の限界）**: DPoP は XSS による token の持ち出しを防ぐが、攻撃者が新しいフローを始めて自分の鍵に束縛した token を得ることは防げない（§6.3.4.2.2）[N][^18]。WebCrypto の非エクスポート鍵が TPM で保護される保証はなく、malware によるファイルシステムからの鍵の持ち出しはセッションハイジャックと同等の攻撃経路になる（§9.2）[N][^18]。

### 3.9 OAuth 2.1

- **RS-04#76（draft-ietf-oauth-v2-1-16）**: OAuth 2.1 は Internet-Draft である（draft-16、2026-09-03 付、有効期限 2027-03-07）[N][^19]。Datatracker では WG Document で、IESG 状態は「I-D Exists」、つまり IESG には未提出である[N][^20]。draft は OAuth 2.0 からの非規範的な変更点として次を挙げている（§10）[N][^19]。
  - PKCE の既定化と plain 方式の削除
  - redirect URI の完全一致
  - implicit grant と ROPC の除外
  - query 文字列での Bearer token の除外
  - public client の refresh token を sender-constrained または一回限りにすること

### 3.10 OpenID Shared Signals（SSF / CAEP / RISC）

- **RS-04#77（状態と SSF の枠組み）**: OpenID Shared Signals Framework 1.0、CAEP 1.0、RISC 1.0 は Final である[N][^33]。各文書の Published 日付は 2025-08-29 である[N][^30][^31][^32]。承認告知は 2025-09-02 付で、投票結果は承認85、反対1、棄権25だった[N][^34]。SSF のイベント（SET）は明示的な型付け（typ: secevent+jwt）を使わなければならない（MUST）[N][^30]。配信方式は push（RFC 8935）と poll（RFC 8936）が規定されている[N][^30]。原文 §4.1.5 は "The Shared Signals Framework allows each deployment or integration to define its own event processing behaviors, ranging from informational input to additional processing needed, to mandatory enforcement." である[N][^30]。
- **RS-04#78（CAEP と RISC のイベント種別）**: CAEP 1.0 は次のイベント種別を定義している[N][^31]。
  - session-revoked
  - token-claims-change
  - credential-change
  - assurance-level-change
  - device-compliance-change
  - session-established
  - session-presented
  - risk-level-change

  CAEP のイベントを実装する場合、SSF に準拠すべきである（SHOULD）[N][^31]。RISC 1.0 は、account-disabled、account-enabled、account-purged、account-credential-change-required、credential-compromise、identifier-changed、identifier-recycled、recovery-activated、recovery-information-changed、opt-in/opt-out 系などを定義している[N][^32]。RISC の sessions-revoked は非推奨であり、新しい実装は CAEP の session-revoked を使わなければならない（MUST）[N][^32]。
- **RS-04#79（CAEP Interoperability Profile）**: CAEP Interoperability Profile は Implementer's Draft 1 である[N][^33]。ID1 の文書の Published 日付は 2024-06-25 であり[N][^39]、OIDF は 2024-08-20 付の告知で Implementer's Draft として承認した（承認74、反対1、棄権21）[N][^40]。Final 化に向けては、2026-07-27 付の告知で、パブリックレビューを 2026-07-27〜09-25、投票を 2026-09-26〜10-10 とする日程が示された[N][^35]。しかし同告知には次の UPDATE が追記されている[N][^35]。
  - 2026-09-12: 60日レビューの指摘により、仕様に複数の修正が必要であると WG 共同議長が確認した。改訂後のレビューと投票の日程は追って告知する。
  - 2026-09-15: WG の会合で、推奨された修正を反映したうえで15日の WG レビューを再開し、続けて Final に必要な60日のレビューを行うことで合意した。

  したがって、当初の投票期間（2026-09-26〜10-10）は進行しておらず、確認日（2026-10-03）の時点で Final ではない[N][^35]。改訂後の日程は未確認である（確認日に OIDF サイトの投稿を検索したが、2026-09-15 の UPDATE より新しい告知は見つからなかった）。

### 3.11 Token Status List

- **RS-04#80（draft-ietf-oauth-status-list-21）**: Token Status List は Internet-Draft（draft-21、2026-06-21 付、Standards Track を予定）である[N][^21]。Datatracker では IESG 状態が RFC Ed Queue、RFC Editor 状態が In Progress である[N][^22]。この仕様は、JOSE または COSE で保護された token（JWT、SD-JWT、CWT、mdoc）の状態を、ビット列を圧縮した一覧で表す[N][^21]。用途の例として access token の状態管理が挙げられており、introspection に比べて Issuer への問い合わせを減らし、herd privacy を得られると説明されている[N][^21]。キャッシュは exp と ttl の claim で制御する[N][^21]。値の妥当な範囲は用途に強く依存し、クライアントには下限と上限を設定すべきとされている[N][^21]。

## 4. 標準・文書ステータス表

確認日はすべて 2026-10-03 である。RFC の状態は RFC 本文のヘッダ（Category / BCP 番号）、I-D の状態は IETF Datatracker、OIDF 文書の状態は OIDF の仕様一覧と公式告知で確認した。

| 名称 | 版 | 状態 | 公表日 | 確認日 | URL |
|---|---|---|---|---|---|
| RFC 9700 OAuth 2.0 Security BCP | BCP 240 | final（RFC、Best Current Practice） | 2025-01 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9700 |
| RFC 6749 OAuth 2.0 | — | final（RFC、Standards Track） | 2012-10 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc6749 |
| RFC 9126 PAR | — | final（RFC、Standards Track） | 2021-09 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9126 |
| RFC 9449 DPoP | — | final（RFC、Standards Track） | 2023-09 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9449 |
| RFC 8705 OAuth mTLS | — | final（RFC、Standards Track） | 2020-02 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc8705 |
| RFC 9396 RAR | — | final（RFC、Standards Track） | 2023-05 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9396 |
| RFC 9068 JWT Access Token Profile | — | final（RFC、Standards Track） | 2021-10 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9068 |
| RFC 8725 JWT BCP | BCP 225 | final（RFC、Best Current Practice） | 2020-02 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc8725 |
| draft-ietf-oauth-rfc8725bis | -10 | draft（I-D、BCP 予定、RFC Ed Queue、RFC Editor 状態 Blocked） | 2026-08-21 | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-oauth-rfc8725bis/ |
| RFC 8693 Token Exchange | — | final（RFC、Standards Track） | 2020-01 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc8693 |
| RFC 8707 Resource Indicators | — | final（RFC、Standards Track） | 2020-02 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc8707 |
| RFC 7662 Token Introspection | — | final（RFC、Standards Track） | 2015-10 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc7662 |
| RFC 9701 JWT Response for Introspection | — | final（RFC、Standards Track） | 2025-01 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9701 |
| RFC 7009 Token Revocation | — | final（RFC、Standards Track） | 2013-08 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc7009 |
| RFC 9207 Issuer Identification | — | final（RFC、Standards Track） | 2022-03 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9207 |
| RFC 9470 Step Up Authentication Challenge | — | final（RFC、Standards Track） | 2023-09 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9470 |
| RFC 10017 OAuth 2.0 for Browser-Based Applications | BCP 212 | final（RFC、Best Current Practice） | 2026-08 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc10017 |
| draft-ietf-oauth-v2-1 OAuth 2.1 | -16 | draft（I-D、WG Document、IESG 未提出） | 2026-09-03 | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/ |
| draft-ietf-oauth-status-list Token Status List | -21 | draft（I-D、Standards Track 予定、RFC Ed Queue、RFC Editor 状態 In Progress。Datatracker の画面表示では「Awaiting First editor」） | 2026-06-21 | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-oauth-status-list/ |
| FAPI 2.0 Security Profile | final | final（OIDF Final Specification） | 2025-02-22（承認告知 2025-02-19） | 2026-10-03 | https://openid.net/specs/fapi-security-profile-2_0-final.html |
| FAPI 2.0 Attacker Model | final | final（OIDF Final Specification） | 2025-02-22（承認告知 2025-02-19） | 2026-10-03 | https://openid.net/specs/fapi-attacker-model-2_0-final.html |
| FAPI 2.0 Message Signing | final | final（OIDF Final Specification） | 2025-09-25（承認告知 2025-09-26） | 2026-10-03 | https://openid.net/specs/fapi-message-signing-2_0-final.html |
| FAPI 2.0 Http Signatures | working copy | draft（FAPI WG 一覧の「Drafts」） | working copy の Published 表示 2026-06-26 | 2026-10-03 | https://openid.bitbucket.io/fapi/fapi-2_0-http-signatures.html |
| OpenID Shared Signals Framework 1.0 | final | final（OIDF Final Specification） | 2025-08-29（承認告知 2025-09-02） | 2026-10-03 | https://openid.net/specs/openid-sharedsignals-framework-1_0-final.html |
| OpenID CAEP 1.0 | final | final（OIDF Final Specification） | 2025-08-29（承認告知 2025-09-02） | 2026-10-03 | https://openid.net/specs/openid-caep-1_0-final.html |
| OpenID RISC Profile 1.0 | final | final（OIDF Final Specification） | 2025-08-29（承認告知 2025-09-02） | 2026-10-03 | https://openid.net/specs/openid-risc-1_0-final.html |
| OpenID CAEP Interoperability Profile 1.0 | ID1 | draft（Implementer's Draft 1。Final 化は 2026-09-15 の WG 合意で修正後にレビューをやり直すことになり、当初の投票期間 2026-09-26〜10-10 は進行していない。改訂後の日程は未確認） | 2024-06-25（ID 承認告知 2024-08-20） | 2026-10-03 | https://openid.net/specs/openid-caep-interoperability-profile-1_0-ID1.html |

## 5. 設計への含意とPoCで実測すべきこと

### 5.1 RFC 9700 採否表の作り方（問い1への回答案）

- 行の単位は、BCP 14 キーワードを含む規範文とする。§2 と §4 で重複する規定は1行にまとめ、両方の節番号を記す。§3.1 の39行が素案である[D]（根拠: RS-04#1〜#39）。
- 列は次の構成を提案する[D]（根拠: seed-01 §4.2 の統制台帳の列設計を手掛かりに、RS-04#1〜#39 の性質から導出）。
  - 規範文 ID
  - RFC の節番号
  - 主体（AS/Client/RS/proxy）
  - 原文の強度
  - 適用条件（public/confidential、browser/native、複数 AS、操作階層）
  - 採否（採用/条件付き/逸脱/非該当）
  - 逸脱の理由・補完統制・受容票 ID（E9）
  - 統制 C-ID
  - 検証方法（OIDF 適合試験 E7、負例試験 E4、設定スナップショット E10）
  - 証跡の所在
  - 状態
- MUST 行から逸脱する場合は「非準拠」として受容票を必須にする。SHOULD 行から逸脱する場合は、BCP が許す範囲内だと理由で示す[D]（根拠: RS-04#14, #23）。
- FAPI 2.0 の範囲では FAPI の shall を優先する。FAPI と RFC 9700 で扱いが異なる規定（refresh token rotation など）は、両方の要求を並べて記す[D]（根拠: RS-04#15, #46）。

### 5.2 ADR・設計文書への入力

ADR 番号は seed-02 の A01〜A19 を ADR-001〜ADR-019 に読み替えたものである。

| 入力先 | 入力する内容 | 根拠（RS-04#） |
|---|---|---|
| ADR-005 token profile、DL-16 OAuth/OIDC セキュリティプロファイル | RFC 9700 採否表（§3.1）。全クライアントに PKCE S256 を必須にし、implicit と ROPC を AS 側で無効化する。sender-constraining とサービス別 aud を既定にする。非対称クライアント認証にする。いずれも [D] | #1〜#39 |
| ADR-005、DL-16 | FAPI 2.0 の必須適用範囲案: 高価値・要配慮データ・決済・特権操作の API で、かつ confidential client から呼ばれるもの。FAPI 範囲では PAR、PKCE S256、iss、sender-constrained、private_key_jwt/mTLS、認可コード60秒以下、request_uri 600秒未満を固定値にする。部分採用する範囲は「FAPI 準拠」と称さない。いずれも [D] | #41〜#48, #53 |
| ADR-005、ADR-009 workload identity と委任 | DPoP と mTLS の使い分け: サービス間と B2B サーバー連携は mTLS。public client（ネイティブ等）は DPoP＋nonce と refresh token の鍵束縛。ブラウザは BFF にして token をブラウザに置かない。TLS を終端する経路ではヘッダ sanitize を必須にする。いずれも [D] | #14, #24, #54〜#59, #73〜#75 |
| ADR-005、ADR-006 失効と継続評価、DL-17 認可整合性・剥奪仕様 | opaque と JWT の境界案。第三者クライアントに渡す token は opaque にし、内部 RS 向けには token exchange でサービス別 aud の JWT を発行する。FAPI 範囲と特権・書込みの操作では、失効状態の確認（introspection 等）を必須にする。いずれも [D] | #45, #60, #61, #66〜#69 |
| ADR-005、ADR-007 鍵階層 | JWT 検証規則: typ の分離（at+jwt、token-introspection+jwt、secevent+jwt、dpop+jwt）、issuer 別の alg allowlist（FAPI 範囲は PS256/ES256/EdDSA）、鍵と issuer の結合、token 種別間の相互排他的な検証規則。ID Token と access token の鍵を分けることを防御策として当てにしない。8725bis の差分は RFC 化を待って取り込む。いずれも [D] | #47, #60〜#63 |
| ADR-009 | token exchange の act チェーン: アクセス制御に使うのは現在の actor だけ。may_act を使った委任可否の判断。resource indicator によるサービス別 aud。派生 token の失効連動は自社で設計する。いずれも [D] | #65, #66 |
| ADR-006、DL-17、R-143 | 失効伝播: SSF の受信プロファイル（必須イベント: CAEP session-revoked、credential-change、assurance-level-change、RISC account-disabled、credential-compromise、identifier-recycled 等）と、イベントごとの拒否反映 SLO。CAEP Interop Profile は Final になるまで依存しない。Token Status List は RFC 化まで採用候補にとどめる。いずれも [D] | #69, #77〜#80 |
| ADR-002 IAL/AAL/FAL、R-045 | step-up: RS は RFC 9470 のチャレンジを返す。auth_time と acr は refresh で更新されないので、max_age は RS 側で判定する。acr_values の開示範囲を管理する。いずれも [D] | #72 |
| ADR-004 B2B federation、R-046 | 複数の IdP や AS と対話する RP 機能では mix-up 対策が REQUIRED である。RFC 9207 の iss 検査と issuer 単位の状態保持を必須にする。いずれも [D] | #4〜#6, #71 |
| ADR-001 build/buy、DL-13 製品選定評価 | AS 候補の必須機能: PAR、DPoP（nonce と dpop_jkt を含む）、mTLS、RFC 9207、RFC 9068、RFC 7662/9701、RFC 7009、RFC 8693、RFC 8707、RFC 9396、SSF 送信。FAPI 2.0 Final の OIDF 認定を評価軸にする。いずれも [D] | #42〜#45, #52 |
| ADR-016 versioning と deprecation | 標準ステータス台帳で追跡する対象: OAuth 2.1、8725bis、Token Status List、CAEP Interop Profile、FAPI HTTP Signatures。FAPI は新しい BCP 195 への12か月以内の追随を期待しているので、TLS 設定の改訂周期に入れる。いずれも [D] | #47, #63, #76, #79, #80 |
| DL-20 数値契約（R-189） | 規範が上限を定めている値: 認可コード60秒以下（FAPI）、request_uri 600秒未満（FAPI）、JWT の iat/nbf の未来許容10秒／拒否60秒（FAPI）、DPoP proof の受理窓（RFC 9449 では秒〜分）、introspection キャッシュは exp を超えない。それ以外の寿命の値は BIA と実測で決める。いずれも [D] | #42, #43, #56, #67 |
| DL-29 引用索引（R-197, R-198） | 旧提案レビューの DPoP の限界に関する引用（Google の DPoP Adoption Guide、旧レビュー文書の脚注51）を、一次資料の RFC 9449 §11.4 と RFC 10017 §6.3.4.2.2、§9.2 に差し替える候補。[D] | #54, #75 |

seed の記載を原典で再検証した結果は次のとおりである。

- seed-02 の「RFC 10017 Browser-Based Apps【確:要再検証】」は確認できた（RFC 10017、BCP 212、2026-08）[N][^18]。
- seed-02 の「Message Signing【確:要再検証】」は確認できた（Final）[N][^28]。
- seed-02 の「SSF 1.0/CAEP 1.0/RISC 1.0【確:要再検証】」は確認できた（Final）[N][^34]。
- seed-02 の「8725bis【草】」は確認できた。RFC Ed Queue で Blocked の状態である[N][^10]。
- seed-01 R-158 の「implicit廃止」は、RFC 9700 の原文では SHOULD NOT である[N][^1]。したがって「廃止」は自社の採否判断として書き分ける必要がある[D]。

### 5.3 PoC で実測すべきこと

TC-ID は 12_poc で採番する。合否基準の数値は BIA と実測で決め、未定の間は TBD と記す。

1. 負例試験として次を実施する[D]（根拠: RS-04#1〜#39, #55〜#58, #60〜#62, #68）。
   - mix-up
   - 認可コード注入
   - PKCE downgrade
   - API A 向けの token を API B に提示する audience 混同
   - typ 混同（ID Token、introspection 応答 JWT、SET を access token として提示）
   - alg 混同
   - DPoP proof の再送と事前生成
   - DPoP 束縛 token の Bearer としての提示
   - open redirect、307 リダイレクト、認可エンドポイントでの CORS、clickjacking
2. OIDF の FAPI 2.0 Security Profile Final と Message Signing Final の適合試験を、AS と代表的なクライアントについて自前で実行し、ログを E7 として保存する[D]（根拠: RS-04#52）。
3. introspection 方式と JWT 方式を比較する。約300サービスを想定した負荷で、AS への QPS、p99/p99.9 の遅延、AS 停止時の影響範囲、キャッシュ TTL ごとの失効反映遅延（stale allow の継続時間）を測る[D]（根拠: RS-04#67, #69、前提: 基準シナリオ）。
4. DPoP の実装コストを測る。proof 検証の遅延、cell をまたぐ jti 再送防止ストアの容量と整合性、nonce を更新する頻度とクライアントの再試行率、時計ずれによる拒否率[D]（根拠: RS-04#56）。
5. mTLS の運用を検証する。ingress や mesh で TLS を終端する構成で、クライアント証明書ヘッダの偽装を拒否できるか（RFC 9700 §4.13）、証明書を更新したときの token 無効化と再取得の挙動、handshake のコスト[D]（根拠: RS-04#24, #59）。
6. refresh token rotation の誤検知を測る。同時更新（複数タブや再試行）で正規のクライアントが失効させられる率。FAPI の例外的 rotation で旧 token による再試行を許す窓[D]（根拠: RS-04#15, #46, #74）。
7. 失効伝播の時間を測る。RFC 7009 での失効、CAEP session-revoked、RISC account-disabled のそれぞれについて、RS で拒否されるまでの時間を、操作階層ごと、push 配信と poll 配信ごとに測る。token exchange で派生した token への連動も含める[D]（根拠: RS-04#66, #69, #77, #78）。
8. token のサイズを測る。RAR の authorization_details、act チェーン、将来の署名方式の変更を想定した JWT サイズと、HTTP ヘッダの上限との関係[D]（根拠: RS-04#64, #66）。

## 6. 調査の限界と未確認事項

- RFC と I-D の本文は rfc-editor.org と ietf.org から原文テキストを取得して読んだ。OIDF の告知ページ（承認日と投票数）は、作成時には WebFetch による要約経由で取得していた。2026-10-03 の独立検証で原ページの HTML を取得し、日付と票数の文字列が一致することを確認した（research/verification/RS-04-verification.md）。
- FAPI 2.0 Security Profile と Attacker Model では、文書の Published 日付（2025-02-22）が承認告知の日付（2025-02-19）より後になっている。この差の理由（公開手続き上の日付なのかなど）は確認していない。
- errata は、独立検証で本ノートが引く15件の RFC（RFC 6749 を除く）について 2026-10-03 に RFC Editor の errata 検索で確認した。本ノートの主張に影響し得るのは、RFC 9068 の Reported（未検証）errata 8802 だけである（RS-04#60 参照）[N][^37]。RFC 6749 の errata は確認していない。
- 8725bis が RFC Editor で Blocked（Reference Not Received）になっている原因は、RFC Editor のキュー上では確認していない。draft が規範参照している draft-ietf-jose-deprecate-none-rsa15 は、確認日時点で IESG 状態が In Last Call であり、まだ承認されていない[N][^36]。このため、この参照文書が待ちの原因である可能性は高いが、断定はしない。
- OIDF の FAPI 2.0 適合試験がどの組み合わせ（DPoP と mTLS、private_key_jwt と mTLS など）を試験しているか、試験の詳細仕様は確認していない。
- FAPI 2.0 Http Signatures（draft）と CAEP Interoperability Profile（ID1）の本文は、状態と日付の確認以外には読んでいない。CAEP Interoperability Profile の Final 化は、2026-09-15 の WG 合意でレビューをやり直すことになった。改訂後のレビュー・投票日程は未確認である（RS-04#79）。
- 次の文書は本調査の範囲外として詳しく読んでいない。
  - RFC 9101（JAR）、JARM、RFC 7636、RFC 8414、RFC 8252
  - RFC 9728（Protected Resource Metadata）
  - OpenID Connect Core と OIDC のログアウト系仕様
  - Transaction Tokens、WIMSE、ID-JAG（workload と agent の調査ストリームで扱う想定）
- RFC 10017 が BCP 212 であることは本文ヘッダで確認した。BCP 212 に含まれる他の RFC（RFC 8252 など）は確認していない。
- 各製品（AS 候補）が PAR、DPoP、RFC 9207、SSF 等に対応しているかは、本ストリームの範囲外であり確認していない（製品評価のストリームで [V] として確認する必要がある）。
- §3.1 の採否表は要約である。DL-16 の準拠表にするときは、各行を RFC 9700 の原文と照合し直す必要がある。採否案は前提台帳が未作成の段階での設計推論であり、A-ID を割り当てた後に見直す。
- 本ノートに実測値（[M]）はない。性能、失効反映時間、運用コストに関する主張はすべて、§5.3 の PoC に委ねている。
- 「どの API を高価値とするか」の線引きは、データ分類（R-004）と損失シナリオ（R-003）が経営決裁で確定するまで仮置きである（閉じ方区分 B）。

## 参考文献

[^1]: IETF (T. Lodderstedt, J. Bradley, A. Labunets, D. Fett)『RFC 9700: Best Current Practice for OAuth 2.0 Security』BCP 240, 2025-01. https://www.rfc-editor.org/rfc/rfc9700 （参照箇所: §2.1, §2.1.1, §2.1.2, §2.2.1, §2.2.2, §2.3, §2.4, §2.5, §2.6, §3, §4.1.3, §4.2.4, §4.3.2, §4.4.2, §4.4.2.1, §4.4.2.2, §4.5.3.2, §4.7.1, §4.8.2, §4.9.3, §4.10, §4.10.1, §4.10.2, §4.11.1, §4.11.2, §4.12, §4.13, §4.14.2, §4.15.1, §4.16, §4.17.2、確認日: 2026-10-03）
[^2]: IETF (D. Hardt, Ed.)『RFC 6749: The OAuth 2.0 Authorization Framework』2012-10. https://www.rfc-editor.org/rfc/rfc6749 （参照箇所: §10.4、確認日: 2026-10-03）
[^3]: IETF (T. Lodderstedt, B. Campbell, N. Sakimura, D. Tonge, F. Skokan)『RFC 9126: OAuth 2.0 Pushed Authorization Requests』2021-09. https://www.rfc-editor.org/rfc/rfc9126 （参照箇所: §1, §2.2, §4, §5, §6, §7.2, §7.3, §7.5、確認日: 2026-10-03）
[^4]: IETF (D. Fett, B. Campbell, J. Bradley, T. Lodderstedt, M. Jones, D. Waite)『RFC 9449: OAuth 2.0 Demonstrating Proof of Possession (DPoP)』2023-09. https://www.rfc-editor.org/rfc/rfc9449 （参照箇所: §2, §4.3, §5, §7.2, §8, §9, §10, §11.1, §11.2, §11.3, §11.4, §11.7、確認日: 2026-10-03）
[^5]: IETF (B. Campbell, J. Bradley, N. Sakimura, T. Lodderstedt)『RFC 8705: OAuth 2.0 Mutual-TLS Client Authentication and Certificate-Bound Access Tokens』2020-02. https://www.rfc-editor.org/rfc/rfc8705 （参照箇所: §3, §4, §6.2, §6.3, §6.5, §7.1、確認日: 2026-10-03）
[^6]: IETF (T. Lodderstedt, J. Richer, B. Campbell)『RFC 9396: OAuth 2.0 Rich Authorization Requests』2023-05. https://www.rfc-editor.org/rfc/rfc9396 （参照箇所: §2, §5, §9, §12、確認日: 2026-10-03）
[^7]: IETF (V. Bertocci)『RFC 9068: JSON Web Token (JWT) Profile for OAuth 2.0 Access Tokens』2021-10. https://www.rfc-editor.org/rfc/rfc9068 （参照箇所: §2.1, §2.2, §4, §5, §6、確認日: 2026-10-03）
[^8]: IETF (Y. Sheffer, D. Hardt, M. Jones)『RFC 8725: JSON Web Token Best Current Practices』BCP 225, 2020-02. https://www.rfc-editor.org/rfc/rfc8725 （参照箇所: §3.1〜§3.12、確認日: 2026-10-03）
[^9]: IETF OAuth WG (Y. Sheffer, D. Hardt, M. Jones)『JSON Web Token Best Current Practices』draft-ietf-oauth-rfc8725bis-10, 2026-08-21（Internet-Draft）. https://www.ietf.org/archive/id/draft-ietf-oauth-rfc8725bis-10.txt （参照箇所: ヘッダ, §3.1, §3.2, §3.13〜§3.15, Appendix A、確認日: 2026-10-03）
[^10]: IETF Datatracker『draft-ietf-oauth-rfc8725bis』文書状態ページ. https://datatracker.ietf.org/doc/draft-ietf-oauth-rfc8725bis/ （参照箇所: rev 10、Stream/IESG/RFC Editor/IANA の各状態、確認日: 2026-10-03）
[^11]: IETF (M. Jones, A. Nadalin, B. Campbell, J. Bradley, C. Mortimore)『RFC 8693: OAuth 2.0 Token Exchange』2020-01. https://www.rfc-editor.org/rfc/rfc8693 （参照箇所: §2.1, §4.1, §4.4, §5、確認日: 2026-10-03）
[^12]: IETF (B. Campbell, J. Bradley, H. Tschofenig)『RFC 8707: Resource Indicators for OAuth 2.0』2020-02. https://www.rfc-editor.org/rfc/rfc8707 （参照箇所: §2、確認日: 2026-10-03）
[^13]: IETF (J. Richer, Ed.)『RFC 7662: OAuth 2.0 Token Introspection』2015-10. https://www.rfc-editor.org/rfc/rfc7662 （参照箇所: §2.1, §2.2, §4、確認日: 2026-10-03）
[^14]: IETF (T. Lodderstedt, V. Dzhuvinov)『RFC 9701: JSON Web Token (JWT) Response for OAuth Token Introspection』2025-01. https://www.rfc-editor.org/rfc/rfc9701 （参照箇所: §1, §3, §5, §8.1, §8.2、確認日: 2026-10-03）
[^15]: IETF (T. Lodderstedt, Ed., S. Dronia, M. Scurtescu)『RFC 7009: OAuth 2.0 Token Revocation』2013-08. https://www.rfc-editor.org/rfc/rfc7009 （参照箇所: §2, §2.1, §3（Implementation Note）、確認日: 2026-10-03）
[^16]: IETF (K. Meyer zu Selhausen, D. Fett)『RFC 9207: OAuth 2.0 Authorization Server Issuer Identification』2022-03. https://www.rfc-editor.org/rfc/rfc9207 （参照箇所: §2, §2.3, §2.4、確認日: 2026-10-03）
[^17]: IETF (V. Bertocci, B. Campbell)『RFC 9470: OAuth 2.0 Step Up Authentication Challenge Protocol』2023-09. https://www.rfc-editor.org/rfc/rfc9470 （参照箇所: §3, §6, §6.1, §9、確認日: 2026-10-03）
[^18]: IETF (A. Parecki, P. De Ryck, D. Waite)『RFC 10017: OAuth 2.0 for Browser-Based Applications』BCP 212, 2026-08. https://www.rfc-editor.org/rfc/rfc10017 （参照箇所: ヘッダ, §6, §6.1.3.1, §6.1.3.2, §6.1.3.3, §6.1.4.3, §6.3.2.1, §6.3.2.3（refresh token）, §6.3.3.1, §6.3.4.2.2, §6.3.4.3, §9.2、確認日: 2026-10-03）
[^19]: IETF OAuth WG (D. Hardt, A. Parecki, T. Lodderstedt)『The OAuth 2.1 Authorization Framework』draft-ietf-oauth-v2-1-16, 2026-09-03（Internet-Draft）. https://www.ietf.org/archive/id/draft-ietf-oauth-v2-1-16.txt （参照箇所: ヘッダ, §10、確認日: 2026-10-03）
[^20]: IETF Datatracker『draft-ietf-oauth-v2-1』文書状態（Datatracker API の document と state で取得）. https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/ （参照箇所: rev 16、状態 Active / WG Document / I-D Exists、確認日: 2026-10-03）
[^21]: IETF OAuth WG (T. Looker, P. Bastian, C. Bormann)『Token Status List (TSL)』draft-ietf-oauth-status-list-21, 2026-06-21（Internet-Draft）. https://www.ietf.org/archive/id/draft-ietf-oauth-status-list-21.txt （参照箇所: Abstract, §1.1, §1.2, §11.5、確認日: 2026-10-03）
[^22]: IETF Datatracker『draft-ietf-oauth-status-list』文書状態（Datatracker API の document と state で取得）. https://datatracker.ietf.org/doc/draft-ietf-oauth-status-list/ （参照箇所: rev 21、状態 RFC Ed Queue / RFC Editor In Progress（API の state 名。画面表示は「Awaiting First editor」）/ Submitted to IESG for Publication、確認日: 2026-10-03）
[^23]: OpenID Foundation FAPI WG (D. Fett, D. Tonge, J. Heenan)『FAPI 2.0 Security Profile』Final, 2025-02-22. https://openid.net/specs/fapi-security-profile-2_0-final.html （参照箇所: Introduction, §5.1.1, §5.1.2, §5.2.1〜§5.2.3, §5.3.2.1, §5.3.2.2, §5.3.3.1, §5.3.3.2, §5.3.4, §5.4.1〜§5.4.3, §6.2, §6.3、確認日: 2026-10-03）
[^24]: OpenID Foundation FAPI WG (D. Fett)『FAPI 2.0 Attacker Model』Final, 2025-02-22. https://openid.net/specs/fapi-attacker-model-2_0-final.html （参照箇所: §5, §6, §7.2〜§7.7, §8.2, §8.4、確認日: 2026-10-03）
[^25]: OpenID Foundation FAPI WG (D. Tonge, D. Fett, J. Heenan)『FAPI 2.0 Message Signing』Final, 2025-09-25. https://openid.net/specs/fapi-message-signing-2_0-final.html （参照箇所: Introduction, §5, §5.1, §5.2, §5.3.1, §5.5、確認日: 2026-10-03）
[^26]: OpenID Foundation『FAPI Working Group Specifications』（仕様一覧ページ）. https://openid.net/wg/fapi/specifications/ （参照箇所: Final Specifications、Implementer's Drafts、Drafts の各区分、確認日: 2026-10-03）
[^27]: OpenID Foundation『FAPI 2.0 Security Profile and Attacker Model Final Specifications Approved』2025-02-19. https://openid.net/fapi-2-security-profile-attacker-model-final-specifications-approved/ （参照箇所: 告知の日付と投票結果、確認日: 2026-10-03）
[^28]: OpenID Foundation『FAPI 2.0 Message Signing Final Specification Approved』2025-09-26. https://openid.net/fapi-2-message-signing-final-specification-approved/ （参照箇所: 告知の日付と投票結果、確認日: 2026-10-03）
[^29]: OpenID Foundation『FAPI 2.0 Security Profile and FAPI 2.0 Message Signing: Final Conformance Tests and Certifications Now Available』2025-07-09. https://openid.net/fapi2-0-final-conformance-tests-available/ （参照箇所: 本文（AS とクライアント向けの適合試験・認定の提供、Message Signing が public review・投票中である旨）、確認日: 2026-10-03）
[^30]: OpenID Foundation Shared Signals WG (A. Tulshibagwale ほか)『OpenID Shared Signals Framework Specification 1.0』Final, 2025-08-29. https://openid.net/specs/openid-sharedsignals-framework-1_0-final.html （参照箇所: Abstract, §4.1.1, §4.1.5, §6.1.1, §6.1.2、確認日: 2026-10-03）
[^31]: OpenID Foundation Shared Signals WG (T. Cappalli, A. Tulshibagwale)『OpenID Continuous Access Evaluation Profile 1.0』Final, 2025-08-29. https://openid.net/specs/openid-caep-1_0-final.html （参照箇所: §1, §3.1〜§3.8, §4、確認日: 2026-10-03）
[^32]: OpenID Foundation Shared Signals WG (M. Scurtescu ほか)『OpenID RISC Profile Specification 1.0』Final, 2025-08-29. https://openid.net/specs/openid-risc-1_0-final.html （参照箇所: §2（イベント種別）, §2.11, §3.1、確認日: 2026-10-03）
[^33]: OpenID Foundation『Shared Signals Working Group Specifications』（仕様一覧ページ）. https://openid.net/wg/sharedsignals/specifications/ （参照箇所: Final Specifications、Implementer's Drafts の各区分、確認日: 2026-10-03）
[^34]: OpenID Foundation『Three Shared Signals Final Specifications Approved』2025-09-02. https://openid.net/three-shared-signals-final-specifications-approved/ （参照箇所: 告知の日付、投票結果、承認された3仕様、確認日: 2026-10-03）
[^35]: OpenID Foundation『Public Review Period for Proposed OpenID CAEP Interoperability Profile Final Specification』2026-07-27（2026-09-12 と 2026-09-15 に UPDATE 追記）. https://openid.net/public-review-period-for-proposed-openid-caep-interoperbility-profile-final-specification/ （参照箇所: 冒頭の UPDATE 2件、レビュー期間と投票期間、確認日: 2026-10-03）
[^36]: IETF Datatracker『draft-ietf-jose-deprecate-none-rsa15』文書状態（Datatracker API の document と state で取得）. https://datatracker.ietf.org/doc/draft-ietf-jose-deprecate-none-rsa15/ （参照箇所: rev 06、状態 Active / In Last Call / Submitted to IESG for Publication、確認日: 2026-10-03）
[^37]: RFC Editor『RFC Errata: RFC 9068』. https://www.rfc-editor.org/errata/rfc9068 （参照箇所: Errata ID 8802（Reported、Technical、2026-03-04 報告、§2.2）、確認日: 2026-10-03）
[^38]: OpenID Foundation FAPI WG (D. Tonge, D. Fett, J. Heenan)『FAPI 2.0 Http Signatures (Draft)』working copy, Published 2026-06-26. https://openid.bitbucket.io/fapi/fapi-2_0-http-signatures.html （参照箇所: 題名と Published 表示、確認日: 2026-10-03）
[^39]: OpenID Foundation Shared Signals WG (A. Tulshibagwale, A. Deshpande)『CAEP Interoperability Profile 1.0 - draft 00』Implementer's Draft 1, Published 2024-06-25. https://openid.net/specs/openid-caep-interoperability-profile-1_0-ID1.html （参照箇所: 表題部の Published 表示、確認日: 2026-10-03）
[^40]: OpenID Foundation『Three Shared Signals Implementer's Drafts Approved』2024-08-20. https://openid.net/three-shared-signals-implementers-drafts-approved/ （参照箇所: 承認された3仕様（CAEP Interoperability Profile 1.0 ID1 を含む）と投票結果、確認日: 2026-10-03）
