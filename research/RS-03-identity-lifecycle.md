# RS-03 デジタルIDライフサイクル 一次資料調査ノート

> 文書ID: RS-03 / 版: 0.2 / 状態: review / 最終更新: 2026-10-03
> 対応要求: R-013, R-027〜R-048, R-087, R-131, R-132, R-168, R-203（seed-01 の R-ID。正式定義は traceability/R-requirements.md で確定予定）
> 依存文書: CONVENTIONS.md, traceability/seed/seed-01-ciso-assurance.md, traceability/seed/seed-02-cto-technical.md, traceability/seed/seed-03-redteam-decision.md
> 作成方法: AI エージェント（Claude）が原典を取得・本文照合して作成した。種資料（seed-01〜03）は手掛かりとしてのみ使い、本書の根拠には使っていない。原典照合ログ（traceability/ 配下）は本書の作成範囲外のため未作成である。
> 仮定ID: 前提台帳（01_governance/assumptions-register.md）が未作成のため A-xxx は採番していない。CONVENTIONS.md §7 の暫定値に依存する推論は「前提: CONVENTIONS §7」と明記した。
> 独立検証: 作成者とは別の AI エージェント（Claude）が 2026-10-03 に全脚注（[^1]〜[^91]）の原典を取得して照合し、版 0.2 で修正した。記録は research/verification/RS-03-verification.md。検証者も AI であり、人間のレビュアによる照合ではない。

## 1. 調査の問い

seed-02 §1（1-1〜1-8）と seed-01 §2.2（R-027〜R-048）に由来する問い（Q1〜Q9）と、本調査で追加した問い（Q10〜Q14）を扱う。

1. Q1 主体種別×操作リスク階層ごとに IAL/AAL/FAL をどの方法で割り当てるか。初期値はどう決まるか。（R-027, R-029, R-030）
2. Q2 同期 passkey をどの階層まで受け入れられるか。NIST と日本（DS-511/DS-512）で扱いは同じか。（R-031, R-043）
3. Q3 passkey の RP ID、related origins、attestation、hybrid をどう設計するか。IdP 製品を乗り換えた後も passkey を使い続けられるか。（R-043, R-203）
4. Q4 アカウント回復手順に必要な要件は何か（回復要素、helpdesk 経由の回復、通知、待機）。（R-032, R-041, R-042）
5. Q5 不変識別子は何か。メール再利用と account linking をどの条件なら安全に扱えるか（nOAuth）。（R-037, R-047）
6. Q6 B2B マルチ IdP（home realm discovery、SAML/OIDC 併存、IdP 鍵更新、顧客 IdP の停止・侵害時の切離し、OpenID Federation の採否）をどう扱うか。（R-013, R-036, R-038, R-039）
7. Q7 IdP 起点 SAML と assertion injection をどう扱うか。iss/aud/InResponseTo の検証要件は何か。（R-046）
8. Q8 SCIM と JIT の衝突をどう解決するか。deprovision の遅延と domain 検証の再検証はどう扱うか。（R-040, R-044, R-131, R-132）
9. Q9 step-up と再認証の要件は何か（acr/amr/auth_time、再認証間隔）。（R-045, R-087）
10. Q10（追加）認証器イベント（登録・追加・紛失・失効）で何を記録し、何を通知しなければならないか。（R-028, R-041）
11. Q11（追加）多数の利用者に影響する特権主体（テナント管理者、運用者、support）の保証レベルをどう扱うか。（R-029, R-042）
12. Q12（追加）非人間主体（service account、workload、AI エージェント）は SP 800-63-4 の範囲に入るか。（R-029）
13. Q13（追加）失効・識別子の再利用・侵害疑いを IdP と RP の間でどう伝えるか（RISC、SSF、SCIM SET）。（R-044, R-047）
14. Q14（追加）外部 IdP の assertion（amr/acr）から AAL や同期 passkey の使用を判別できるか。（R-031, R-043）

## 2. 結論サマリ

1. 保証レベルの割当は、SP 800-63-4 の DIRM に倣い「主体種別＝user group」「操作＝transaction」として影響度を評価する方法をとる[D]。最低5つの影響カテゴリを用い、カテゴリを統合する規則を文書化し、初期値（Low→1、Moderate→2、High→3）から tailoring した結果を DIAS 相当の文書に記録する（RS-03#4〜#9）[D][^6][^7][^8]。ただし SP 800-63-4 は連邦政府向けの指針であり、民間組織については「may consider」とされている[N][^5]。したがって本基盤では参照基準として採用し、逸脱は記録する（RS-03#2）[D][^5]。
2. 多数の利用者に影響する操作（テナント横断の管理、support による回復代行、運用者権限）については、DS-511 が「高位」より高次の影響として個別のリスク分析と追加対策を求めている[N][^89]。そのため、これらの操作は保証レベル3相当に追加統制を重ねる階層として別に定義する（RS-03#10）[D][^89]。
3. 最上位階層（AAL3 相当）では、エクスポート不能な鍵を持つ認証器（device-bound）だけを許可する[D]。NIST は同期型認証器の AAL3 での使用を SHALL NOT としている（RS-03#15）[N][^14]。一方、DS-512 は passkey（同期/デバイス固定を区別せず）で当人認証保証レベル3を実現できると説明している（RS-03#25）[N][^90]。日米で扱いが異なるため、両法域にまたがる最上位階層には厳しい側（NIST）を適用する[D]。
4. Microsoft Entra ID が発行する amr は、同期 passkey とデバイス固定 passkey をどちらも `fido, mfa` と表す（RS-03#27）[V][^77]。外部 IdP の amr だけでは AAL3 適格かどうかを判別できない場合があるため、最上位階層では本基盤自身が WebAuthn の BE フラグや attestation を検証する RP 側束縛認証器を要求する（RS-03#24, #49）[D]。
5. 手入力の OTP や out-of-band はフィッシング耐性ありと見なしてはならない（SHALL NOT）[N][^16]。AAL2 の verifier は、フィッシング耐性のある選択肢を少なくとも1つ提供しなければならない（SHALL）[N][^13]。顧客管理者・support・運用者には、SP 800-63-4 が補完統制の例に挙げる「AAL2 でもフィッシング耐性のみ」を必須とする（RS-03#8, #14, #16）[D][^8]。
6. アカウント回復は、認証手段と同等以上の強度で設計する（DS-511）[N][^87]。AAL2 の回復は、異なる方法による回復コード2つ、回復コードと既存の単要素認証器、再本人確認のいずれかとする（SHALL）[N][^27]。helpdesk 経由の回復は SP 800-63B-4 の「application-specific method」に当たり、リスク分析と文書化が条件になる（SHALL）[N][^26]。Scattered Spider は helpdesk に MFA リセットをさせる手口を使っているため（CISA）、特権主体については helpdesk 単独での回復を認めない（RS-03#36〜#42）[I][^84][D]。
7. 利用者を識別するキーは、OIDC では `iss`+`sub`、Entra では `tid`+`oid` に限る[D]。email、UPN、preferred_username は識別子にも認可にも使わない（RS-03#57, #58, #64, #65）[N][^54][V][^75]。OIDC は発行者が email を別人に再利用することを認めており[N][^54]、RISC は `identifier-recycled` イベントを定義している[N][^64]。メールの再利用は仕様上起こり得る前提として扱う（RS-03#66）[D]。
8. account linking は、認証済みセッションの中で、既存の連携 ID による再認証を経た場合にだけ許可する[D]。email の一致を理由とする自動 linking は行わない[D]。linking と解除は利用者に通知する（RS-03#59〜#63）[N][^36][V][^71][I][^72][D]。
9. FAL2 では「federation transaction は RP が開始しなければならない（SHALL）」[N][^32]。そのため IdP 起点 SAML（unsolicited response）は既定で無効にする[D]。ポータル起動が必要な顧客には、OIDC Core §4 の第三者起点ログイン（RP が改めて要求を送る方式）へ変換して提供する（RS-03#49〜#54）[N][^57][D]。
10. 各テナントの「期待 IdP」を allowlist に登録する[D]。ワイルドカードは使わない（SHALL NOT）[N][^39]。assertion の発行者がその IdP であることを検証し、加えて iss/aud/nonce/InResponseTo も検証する（RS-03#51, #55, #68）[N][^37][^68][D]。
11. email ドメインで IdP を振り分ける home realm discovery は利用者体験のための機能であり、セキュリティ統制ではない（Okta）[V][^81]。ドメインの所有は DNS TXT で検証し、定期的に再検証する[D]。所有の衝突や引継ぎの手順も定める（Microsoft、Atlassian の運用）（RS-03#69〜#71）[V][^79][^80][D]。
12. 顧客 IdP が侵害された場合に備え、IdP 単位で遮断できる仕組み（RP blocklist）を用意し、共有シグナルを受信する[N][^39][^43]。高影響の操作には、侵害された IdP からも守れる FAL3 相当（RP 側の束縛認証器）を求める（RS-03#7, #49, #72, #73）[N][^7][^32][D]。
13. SCIM と JIT の衝突を解決するため、事前プロビジョニングした account には作成時点で連携 ID を結合する（SHALL、trust agreement に別の定めがある場合を除く）[N][^40]。照合キーには変わらない属性を使い、SCIM の 409/ETag を処理する[N][^61]。Entra のプロビジョニングは、非ギャラリーの SCIM アプリでは約40分間隔で同期し[V][^83]、ギャラリーアプリの増分サイクルの間隔はアプリ別のチュートリアルで定められる[V][^82]。そのため deprovision の SLO は SCIM だけでは決められない[D]。共有シグナルとセッション失効を組み合わせる（RS-03#75〜#80）[D]。
14. 再認証の上限値は AAL ごとに設定する[D]。AAL2 は全体 24h・無操作 1h（SHOULD）、AAL3 は全体 12h（SHALL）・無操作 15min（SHOULD）である[N][^15]。device-bound の仕組みなど、より安全なセッション維持技術を使う場合は上限を延長してよい（MAY）が、適用する上限は文書化しなければならない（SHALL）[N][^31]。要件を満たしたかの判断権は RP にある[N][^31]。step-up は `max_age`/`auth_time`/`acr` と RFC 9470 で実装する[D]。JWT access token の `acr`/`auth_time` は refresh しても変わらないため、step-up のたびに新しい認可要求を送る（RS-03#43〜#48）[N][^56][^67][D]。
15. passkey の RP ID は本基盤が保有する registrable domain にする[D]。これは、credential が RP ID を単位に結び付くためであり、managed IdP のドメイン上で登録すると IdP を乗り換えたときに passkey を持ち出せないおそれがある（RS-03#29）[N][^47][D]。CXF 1.0 は Proposed Standard だが、CXP は Working Draft のままである（RS-03#30）[N][^50][^51]。プロバイダ間で passkey を移す手段を、20年間の前提にすることはできない[D]。

## 3. 調査結果

凡例: 「強度」＝原文の規範語（SHALL/SHOULD/MAY/MUST 等）をそのまま写したもの、「原文」＝英語または日本語の原文引用、各文末＝主張タグと脚注

### 3.1 標準の状態と適用範囲

**RS-03#1** NIST SP 800-63-4 と、その付属文書 63A-4（Identity Proofing and Enrollment）、63B-4（Authentication and Authenticator Management）、63C-4（Federation and Assertions）は、2025-07-31 に最終版（Final）として公表された[N][^1][^2][^3][^4]。これにより SP 800-63-3 系は置き換えられた[N][^1][^2][^3][^4]。
- CSRC の版履歴: 2020-06-08 Draft、2022-12-16 Draft、2024-08-21 Second Public Draft、2025-07-31 Final（63-4）[N][^1]。

**RS-03#2** SP 800-63-4 は連邦政府向けの指針である[N][^5]。民間組織は「may consider」とされる[N][^5]。machine-to-machine 認証、IoT、主体に代わる API アクセスは明示的には扱っていない[N][^5]。
- 原文（§1.1）: "Private-sector organizations and state, local, and tribal governments whose digital processes require varying levels of digital identity assurance may consider the use of these standards where appropriate."
- 原文（§1.1）: "these guidelines do not explicitly address some subjects including, but not limited to, machine-to-machine authentication, interconnected devices (e.g., Internet of Things [IoT] devices), or access to Application Programming Interfaces (APIs) on behalf of subjects."

**RS-03#3** デジタル庁 DS-511「行政手続等での本人確認におけるデジタルアイデンティティの取扱いに関するガイドライン」は、2025-09-30 にデジタル社会推進会議幹事会で決定された[N][^85]。位置付けは Normative（政府情報システムで順守するルール）、適用対象は国の行政機関が提供する手続・サービスである[N][^85]。決定日から施行され、決定日に稼働中・構築中のシステムには、施行後速やかに評価を行い、準拠のための改修が必要な場合は改修計画を策定して対応を進めるよう求めている[N][^85]。
- 原文（別紙1）: 「本ガイドラインは、決定の日から施行する。」

### 3.2 保証レベル割当の方法（DIRM）

**RS-03#4** 影響度は user group ごとに、その group が実行できる transaction を基にして別々に評価しなければならない（SHALL）[N][^6]。影響を受ける人数などの規模も考慮すべきである（SHOULD）[N][^6]。
- 原文（§3.2）: "The level of impact for each user group identified in Sec. 3.1 SHALL be considered separately based on the transactions available to that user group."

**RS-03#5** 影響度の評価には少なくとも5つの影響カテゴリを含めなければならない（SHALL）[N][^6]。5つとは、Degradation of mission delivery、Damage to trust, standing, or reputation、Unauthorized access to information、Financial loss or liability、Loss of life or danger to human safety, human health, or environmental health である[N][^6]。影響度は Low/Moderate/High で表す[N][^6]。カテゴリを統合する方法（high-water mark や加重平均など）は文書化し、全サービスに一貫して適用しなければならない（SHALL）[N][^6]。
- 原文（§3.2.4）: "Organizations SHALL document the approach they use to combine their impact assessment into an overall impact level for each of their defined user groups and SHALL apply it consistently across all of its online services."

**RS-03#6** 初期の保証レベルは、影響度から単純に対応づけて選ぶ[N][^7]。Low は IAL1/AAL1/FAL1、Moderate は IAL2/AAL2/FAL2、High は IAL3/AAL3/FAL2 または FAL3 である[N][^7]。IAL・AAL・FAL がそれぞれ異なる値になってもよく、本人確認が不要（IAL なし）という判断もあり得る[N][^7]。
- 原文（§3.3.3）: "the initial impact assessment may be low impact and indicate IAL1 and FAL1 but may also determine that personal information is accessible and therefore requires AAL2."

**RS-03#7** High と評価したサービスでは、IdP が侵害されるリスクを追加で評価し、FAL2 と FAL3 のどちらが適切かを決めなければならない（SHALL）[N][^7]。考慮事項には、IdP が自組織の境界の内側にあるか外側にあるかが含まれる（SHOULD）[N][^7]。
- 原文（§3.3.3.3）: "For online services that are assessed to be high impact, organizations SHALL conduct a further assessment to evaluate the risk of a compromised IdP to determine whether FAL2 or FAL3 is more appropriate for their use case."

**RS-03#8** tailoring の過程は文書化しなければならない（SHALL）[N][^8]。補償統制には、逸脱の理由、代替策との比較、残余リスクを記録する（SHALL）[N][^8]。補完統制の例として「AAL2 でもフィッシング耐性のある認証だけに限定する」が挙げられている[N][^8]。結果は DIAS（Digital Identity Acceptance Statement）にまとめる（SHALL）[N][^8]。DIAS は SaaS など外部のオンラインサービスについても作成する（SHALL）[N][^8]。RP は、利用する CSP/IdP の DIAS を確認しなければならない（SHALL）[N][^8]。
- 原文（§3.4.3）: "An organization could restrict users to only phishing-resistant authentication at AAL2."
- 原文（§3.4.4）: "RPs who intend to use a particular CSP/IdP SHALL review the latter’s DIAS and incorporate relevant information into the organization’s DIAS for each online service."

**RS-03#9** RP は、提供する機能ごとに受け入れる IAL/AAL/FAL の最低値を決めなければならない（SHALL）[N][^33]。機能ごとに要求値を変えてもよい（MAY）[N][^33]。IdP は、RP が trust agreement で最低 xAL を指定できる仕組みを用意しなければならず（SHALL）、要求を満たせなかった場合も結果の xAL を assertion に示さなければならない（SHALL）[N][^33]。IAL の申告がない assertion は「IAL なし」として扱い、IAL1 と見なしてはならない[N][^33]。
- 原文（§2.5）: "The IdP SHALL always indicate the resulting xAL in the assertion, even if the request has not been met."
- 原文（§2.5）: "the RP cannot assume the account meets “IAL1,” which is the lowest numbered IAL described in this suite."

**RS-03#10** DS-511 は「身元確認保証レベル」と「当人認証保証レベル」をそれぞれ3段階で定め、影響度の高位・中位・低位を各レベル3・2・1に対応させている[N][^89]。影響が多数の利用者に及ぶ場合は「高位」より高次として扱い、レベル3を超える対策を個別に検討するよう求めている[N][^89]。
- 原文（§4.1 3) 補足）: 「リスクの影響範囲が多数の利用者又は関係者に及ぶ場合には、その影響度は本ガイドラインが定義する「高位」よりも更に高次のものとして扱う必要があり、必要な対策についても「保証レベル3」より高次の対策が求められるため、対象手続において個別のリスク分析と追加対策の検討を行うこと。」

### 3.3 IAL（本人確認）

**RS-03#11** IAL には「本人確認なし」と IAL1〜IAL3 がある[N][^9]。IAL3 は on-site attended に限られる（SHALL）[N][^9]。IAL を引き上げるときは、その account で使える最高の AAL で認証させなければならない（SHALL）[N][^12]。
- 原文（63A-4 §4.3.1）: "IAL3 identity proofing SHALL only be delivered as on-site attended."
- 原文（63A-4 §3.16）: "CSPs SHALL require subscribers to authenticate at the highest authentication assurance level (AAL) available on their account prior to initiating the upgrade process."

**RS-03#12** 遠隔の本人確認では、デジタル injection（生成 AI による偽造媒体を含む）に備えて、正規センサーからの入力であることを確かめる技術的統制と、媒体の改ざん解析を実装しなければならない（SHALL）[N][^10]。
- 原文（63A-4 §3.14）: "CSPs SHALL implement technical controls to increase confidence that digital media is being produced by a genuine sensor during the proofing process (e.g., detect the presence of a virtual camera, device emulator, or a jailbroken device)."

**RS-03#13** trusted referee を使う場合は、手順を practice statement に記載し、研修（ソーシャルエンジニアリングの兆候を含む）を行い、全セッションを記録しなければならない（SHALL）[N][^11]。記録には、使った理由、referee の身元、判断と理由を含める[N][^11]。これは helpdesk による本人確認を設計するときの参考になる[D]。
- 原文（63A-4 §3.15.1）: "The CSP SHALL establish a record of any identity proofing session that involves a trusted referee"

### 3.4 AAL とフィッシング耐性

**RS-03#14** AAL2 の verifier は、フィッシング耐性のある認証の選択肢を少なくとも1つ提供しなければならない（SHALL）[N][^13]。連邦機関は、職員・契約者・パートナーにフィッシング耐性のある認証を使わせなければならない（SHALL）[N][^13]。それ以外の場合も、可能な限りフィッシング耐性のある認証を勧めるべきである（SHOULD）[N][^13]。
- 原文（63B-4 §2.2.2）: "Verifiers SHALL offer at least one phishing-resistant authentication option at AAL2, as described in Sec. 3.2.5."

**RS-03#15** AAL3 の認証器は、エクスポートできない秘密鍵を持ち、フィッシング耐性を備えなければならない（SHALL）[N][^14]。同期型認証器は AAL3 で使ってはならない（SHALL NOT）[N][^14]。「エクスポート不能」と言えるのは、独立したハードウェアか、組込みの実行環境（secure element、TEE、TPM）の場合に限られる（SHALL）[N][^20]。
- 原文（63B-4 §2.3.2）: "Since syncable authenticators (described in Appendix B) require the private key to be exportable, syncable authenticators SHALL NOT be used at AAL3."
- 原文（63B-4 §3.2.13）: "To be considered non-exportable, an authenticator SHALL either be a separate piece of hardware or an embedded processor or execution environment (e.g., secure element, TEE, TPM)."

**RS-03#16** フィッシング耐性とは、利用者の注意力に頼らずに、偽の verifier へ秘密や有効な出力が渡らない性質をいう[N][^16]。出力を手入力する OTP や out-of-band はフィッシング耐性ありと見なしてはならない（SHALL NOT）[N][^16]。方式は channel binding と verifier name binding の2つが認められる[N][^16]。DNS 名で束縛する場合、束縛先は認証済みのホスト名か、public suffix より1段以上下の親ドメインでなければならない（SHALL）[N][^16]。WebAuthn は verifier name binding の例として挙げられている[N][^16]。
- 原文（63B-4 §3.2.5）: "Authenticators that involve the manual entry of an authenticator output (e.g., out-of-band and OTP authenticators) SHALL NOT be considered phishing-resistant"

**RS-03#17** PSTN（SMS・音声）による out-of-band は restricted authenticator に分類される[N][^17]。RP がリスクを受容できない場合は使ってはならない（SHALL NOT）[N][^17]。CSP は、制限のない代替手段の提供、リスクの告知、将来使えなくなる場合に備えた移行計画の DIAS への記載を行わなければならない（SHALL）[N][^17]。登録済み電話番号の変更は新しい認証器の binding として扱う（SHALL）[N][^17]。SIM 変更や番号ポータビリティなどの兆候も考慮すべきである（SHOULD）[N][^17]。
- 原文（63B-4 §3.1.3.3）: "Setting or changing the pre-registered telephone number is considered to be the binding of a new authenticator and SHALL only occur as described in Sec. 4.1.2."

**RS-03#18** hybrid 接続（CTAP 2.2 の hybrid transport など）は、次のいずれかの方法で確立しなければならない（SHALL）[N][^18]。(a) QR コードなどの視覚表示で初期鍵情報とトンネルサービスを渡し、残りの情報を無線で受け取る方法で、その無線は最大到達距離 240m 以下の技術でなければならない（SHALL）[N][^18]。(b) 以前の認証で認証器と端末が保持した、キャッシュ済みの鍵情報とトンネル情報を使う方法[N][^18]。キャッシュされた関連付けを端末から削除する手段も提供しなければならない（SHALL）[N][^18]。

**RS-03#19** attestation については、連邦エンタープライズの verifier は使うべき（SHOULD）、その他の用途ではリスク判断に使ってよい（MAY）とされる[N][^19]。公衆向けのサービスでは、attestation に対応していないことを理由に認証器を拒否すべきでない（SHOULD NOT）[N][^19]。
- 原文（63B-4 §4.1.3）: "The lack of support for attestations SHOULD NOT block the use of authenticators for broad public-facing applications."

**RS-03#20** DS-511 の当人認証保証レベルの基準は次のとおりである[N][^86]。レベル3は多要素で、うち1要素が公開鍵認証であり、全利用者にフィッシング耐性を求める[N][^86]。レベル2は多要素で、フィッシング耐性は希望する利用者が選べればよい[N][^86]。ただし公開鍵認証を使う場合は「暗号鍵の不正な取り出し・複製への耐性」が必要である[N][^86]。レベル1は単要素でもよい[N][^86]。
- 原文（表3-9）: 「多要素認証を必須とし、さらにフィッシング耐性をもつ認証手法を全ての利用者が利用することを必須とすることで、厳格な耐性を確保する。」（レベル3）

### 3.5 同期 passkey（syncable authenticators）

**RS-03#21** sync fabric に置く鍵は暗号化した状態でのみ保存しなければならない（SHALL）[N][^21]。sync fabric へのアクセスは AAL2 相当の MFA で保護しなければならない（SHALL）[N][^21]。これらの要件と機関固有の要件は文書化して周知しなければならず、該当する場合は公衆向けウェブサイトやデジタルサービスのポリシーにも記載する（SHALL）[N][^21]。連邦エンタープライズ向けには、MDM と機関が管理するアカウントによる統制が追加で求められる（SHALL）[N][^21]。AAL2 での使用は、これらの要件を満たすことを条件に認められる[N][^21]。
- 原文（63B-4 App. B.2）: "Syncing authentication keys inherently means that the key can be exported. Authentication at AAL2 may be supported subject to the above requirements. However, syncing violates the non-exportability requirements of AAL3."

**RS-03#22** WebAuthn のフラグについて、verifier は UV を preferred と指定し、応答の UV を確認しなければならない（SHALL）[N][^22]。UV が立っていない場合は単要素の暗号認証器として扱わなければならない（SHALL）[N][^22]。BE フラグは同期型を制限するポリシーに使ってよい（MAY）[N][^22]。公衆向けのサービスでは、BS フラグを受け入れ条件にすべきでない（SHOULD NOT）[N][^22]。
- 原文（63B-4 App. B.3）: "If the user is not verified, agencies SHALL treat the authenticator as a single-factor cryptographic authenticator."

**RS-03#23** 公衆向けのサービスでは、同期型認証器がほかの利用者と共有され得ると想定すべきである[N][^23]。また WebAuthn の credential は RP ごとの鍵なので、PKI の CRL のように一か所でまとめて失効させる手段がない[N][^23]。緩和策として、SSO と federation で RP ごとの鍵の数を減らすことが挙げられている[N][^23]。
- 原文（63B-4 App. B.6）: "A similar process is not available for syncable authenticators or any FIDO WebAuthn-based credentials."

**RS-03#24** WebAuthn Level 3 では、BE フラグは作成後に変わってはならない（MUST NOT）[N][^48]。RP は BE/BS の最新値を account に保存することが推奨される（RECOMMENDED）[N][^48]。BE=0（single-device credential）の場合は、追加の認証器か回復手段を確保すべきである（SHOULD）[N][^48]。BS が 1 から 0 に変わった場合は、利用者に他の要素を確認させるべきである（SHOULD）[N][^48]。
- 原文（§6.1.3）: "Relying Parties SHOULD ensure that each user account has additional authenticators registered and/or an account recovery process in place."

**RS-03#25** DS-512（解説書、位置付けは Informative）は、passkey が当人認証保証レベル3を実現できると説明している[N][^90]。この記述は同期/デバイス固定を区別していない[N][^90]。同期 passkey については、同期に使うアカウントが奪われた場合は耐性がないと明記している[N][^90]。また、「暗号鍵の不正な取り出し・複製」への耐性（DS-511 のレベル2 以上で公開鍵認証を使う場合に求められる耐性）は、利用者のデバイスや同期用クラウドサービスの実装に依存すると説明している[N][^90][^86]。これは NIST の AAL3 での同期型禁止（RS-03#15）とは異なる扱いである[D]。
- 原文（別紙2 3) ア）: 「パスキーはフィッシング耐性を有しており、かつ多要素認証として機能するため、当人認証保証レベル3 の当人認証を実現できます。」
- 原文（別紙2 3) イ c)）: 「同期パスキーの場合、何らかの手段によって同期に用いるアカウントを攻撃者に奪われた場合の耐性は有しません。」

**RS-03#26** FIDO Alliance の白書「High Assurance Enterprise FIDO Authentication」は規範文書ではない[N][^52]。以下は業界団体の非規範的な記述であり、規範要求としては扱わない（結論の根拠にも使っていない）[D]。白書は、AAL3 が求められることが多い組織（医療・政府・金融など）は credential が device-bound で複製されないことを必須とすると説明し、高保証のエンタープライズでは attestation を常に要求すべき（小文字の should）だとしている[N][^52]。同期 passkey は回復に強みがある一方、device-bound の回復には helpdesk の関与が必要になりやすいとも述べている[N][^52]。なお、白書が AAL の参照先に挙げているのは SP 800-63-3 の実装資料であり、SP 800-63-4 Final（2025-07-31）より前の記述である[N][^52][D]。
- 原文: "For high assurance enterprise scenarios, attestations should always be requested."

**RS-03#27** Microsoft Entra ID が OIDC v2.0 token に入れる amr は、「Passkey (device-bound)」と「Passkey (synced)」のどちらも `fido, mfa` である[V][^77]。したがって、この amr だけでは同期型かどうかを RP が判別できない[D]。

### 3.6 WebAuthn L3 と passkey の可搬性

**RS-03#28** W3C WebAuthn Level 3 は、2026-08-25 に W3C Recommendation になった（前段は 2026-05-26 の CR）[N][^46]。Level 3 には、RP が credential の状態を認証器に伝える signal メソッド（`signalUnknownCredential`、`signalAllAcceptedCredentials`、`signalCurrentUserDetails`）が含まれている[N][^49]。

**RS-03#29** public key credential は、登録したときと同じ RP ID の RP でしか認証に使えない[N][^47]。RP ID は、origin の effective domain と同じか、その registrable domain suffix でなければならない[N][^47]。related origins を使う場合、RP は全関連 origin で共通の RP ID を選ばなければならない（MUST）[N][^47]。また `/.well-known/webauthn` に origin 一覧を置かなければならない（MUST）[N][^47]。対応するクライアントは、少なくとも5つの registrable origin label をサポートしなければならない（MUST）[N][^47]。
- 原文（§4）: "A public key credential can only be used for authentication with the same entity (as identified by RP ID) it was registered with."
- 原文（§5.11）: "WebAuthn Clients supporting this feature MUST support at least five registrable origin labels."

**RS-03#30** FIDO Alliance の Credential Exchange Format（CXF）1.0 は、2026-03-09 版（errata 版）で Proposed Standard である[N][^50]。Credential Exchange Protocol（CXP）1.0 は、2024-10-03 版の Working Draft のままである[N][^51]。

### 3.7 認証器イベント管理

**RS-03#31** CSP は、account に結び付いたすべての認証器を記録しなければならない（SHALL）[N][^24]。各認証器の特性（単要素か多要素か、フィッシング耐性の有無など）を判定し（SHALL）、binding・renewal（更新）・update・expiration（有効期限切れ）などの重要なライフサイクルイベントの日時を記録しなければならない（SHALL）[N][^24]。binding 元の IP アドレスや端末識別子も記録すべきである（SHOULD）[N][^24]。
- 原文（63B-4 §4.1）: "The CSP SHALL determine the characteristics of the authenticator being bound (e.g., single-factor versus multi-factor, phishing-resistant or not) so that verifiers can assess compliance with the requirements at each AAL."

**RS-03#32** 認証器を追加で binding するには、「account が現在使える最高 AAL」と「新しい認証器を使う最高 AAL」のうち低いほうで認証させなければならない（SHALL）[N][^24]。追加したことは、binding とは別の経路で通知しなければならない（SHALL）[N][^24]。複数の認証器の登録を許可しなければならない（SHALL）[N][^24]。別の端末から binding する場合の binding code は、識別子と組み合わせるなら40ビット以上、組み合わせないなら112ビット以上とし、1回限り・最大10分で、email では送ってはならない（SHALL）[N][^25]。
- 原文（63B-4 §4.1.2.1）: "When an authenticator is added, the CSP SHALL notify the subscriber via a mechanism independent of the transaction binding the new authenticator"

**RS-03#33** 侵害された認証器は、侵害を検知したら速やかに停止・無効化・破棄しなければならない（SHALL）[N][^28]。処理の期限を定めるべきである（SHOULD）[N][^28]。利用者からの無効化要求が本物かどうかは、リスクに基づいて判断しなければならない（SHALL）[N][^28]。

**RS-03#34** 通知先は1 account につき2つ以上をサポートしなければならない（SHALL）[N][^29]。通知は郵便以外のすべての通知先に送らなければならない（SHALL）[N][^29]。通知には、身に覚えがない場合の連絡先を含む明確な指示を記載しなければならない（SHALL）[N][^29]。
- 原文（63B-4 §4.6）: "CSPs SHALL support at least two notification addresses per subscriber account."

**RS-03#35** DS-511 は、認証器の登録方法と、盗難・紛失時の対応を事前に定めることを求めている[N][^87]。紛失の報告を受け付けるときは、第三者のなりすましを想定して報告者の本人確認を行う必要があるとしている[N][^87]。

### 3.8 アカウント回復

**RS-03#36** アカウント回復は、必要な AAL の認証器の制御を失った状態から回復することをいう[N][^26]。回復イベントでは必ず通知を送る[N][^26]。他の認証器で認証できる状態でパスワードを再設定する場合は、回復ではなく認証器の追加 binding として扱う[N][^26]。回復には長い待機時間が伴うことがあると記載されているが、具体的な時間は規定されていない[N][^26]。
- 原文（63B-4 §4.2）: "Replacement of a forgotten password where the subscriber can authenticate with one or more other authenticators is considered to be the binding of a new authenticator (see Sec. 4.1.2.1) rather than account recovery."

**RS-03#37** 回復方法は4つに分類される（saved recovery code、issued recovery code、recovery contact、再本人確認）[N][^26]。CSP はそのうち1つ以上をサポートしなければならない（SHALL）[N][^26]。CSP 担当者とのやり取りなど、アプリケーション固有の方法を使ってもよい（MAY）が、その場合はリスク分析に基づき文書化しなければならない（SHALL）[N][^26]。
- 原文（63B-4 §4.2.1）: "CSPs SHALL support one or more of these and MAY support an application-specific method (e.g., interaction with a CSP agent) to recover a subscriber account. The use of alternative methods SHALL be based on a risk analysis and documented by the CSP."

**RS-03#38** saved recovery code は64ビット以上とし、ハッシュで保存し、使用後は無効化して再発行しなければならない（SHALL）[N][^26]。issued recovery code は10進6桁以上で、有効期限の上限は SMS・音声で10分、email で24時間などと決められている（SHALL）[N][^26]。issued recovery code の送付先となる回復用アドレス（recovery address）は、2つ以上登録できるようにしなければならない（SHALL）[N][^26]。これは §4.2.1.3 の recovery contact（信頼できる知人の連絡先）とは別の要件である[N][^26]。

**RS-03#39** AAL2 の account を回復するには、次のいずれかを要求しなければならない（SHALL）[N][^27]。(a) 異なる方法で得た回復コード2つ、(b) 回復コード1つと既存の単要素認証器、(c) 再本人確認（本人確認済みの account に限る）[N][^27]。本人確認をしていない account の回復は、回復コードか recovery contact によらなければならない（SHALL）[N][^27]。

**RS-03#40** IAL3 で本人確認した AAL3 の account を回復するには、初回の on-site 本人確認で採取した生体情報と照合しなければならない（SHALL）[N][^27]。回復した場合は、利用者または指定者に必ず通知しなければならない（SHALL）[N][^27]。AAL3 の回復通知は郵便の住所にも送らなければならない（SHALL）[N][^29]。

**RS-03#41** DS-511 は、回復手段が攻撃の起点にならないよう、採用している当人認証手法と同等以上の強度を持つ回復手段を選ぶよう求めている[N][^87]。表3-11 には、身元確認の再実施、予備の認証器、リカバリーコードの事前発行、必要時の発行が、それぞれの留意点とともに挙げられている[N][^87]。
- 原文（§3.2 5) ウ）: 「アカウント回復の手段は、採用している当人認証手法と同等以上の強度の手法を選択すること。」

**RS-03#42** CISA の勧告 AA23-320A（2023-11-16 公開、2025-07-29 更新）によれば、Scattered Spider は IT helpdesk に電話をかけてパスワードのリセットや MFA の移し替えをさせた[I][^84]。ほかに SIM スワップや MFA 疲労攻撃も使った[I][^84]。勧告は FIDO/WebAuthn または PKI ベースの MFA を推奨している[I][^84]。
- 原文: "Finally, the threat actors conduct spearphising [sic] calls to convince IT help desk personnel to reset passwords and/or transfer MFA tokens"
- 原文: "Implement FIDO/WebAuthn authentication or Public Key Infrastructure (PKI)-based MFA."

### 3.9 セッション・再認証・step-up

**RS-03#43** 再認証の時間制限は次のとおりである[N][^15]。AAL1: 全体の制限を設けなければならない（SHALL）、30日以内にすべきである（SHOULD）[N][^15]。AAL2: 全体の制限を設けなければならず（SHALL）、24h 以内にすべきである（SHOULD）。無操作は 1h 以内（SHOULD）[N][^15]。無操作の制限だけを超えた場合は、パスワードか生体照合とセッション秘密で再認証してよい（MAY）[N][^15]。AAL3: 全体 12h 以内（SHALL）、無操作 15min 以内（SHOULD）で、初回と同じ要件で再認証する[N][^15]。また 63B-4 §5.2 は、より安全なセッション維持技術（device-bound の仕組みなど）を使う場合は上限を延長してよい（MAY）とし、機関は実際に適用する無操作・全体の上限を system security plan などに文書化しなければならない（SHALL）としている[N][^31]。
- 原文（63B-4 §2.3.3）: "At AAL3, the overall timeout for reauthentication SHALL be no more than 12 hours. The inactivity timeout SHOULD be no more than 15 minutes."

**RS-03#44** セッションの AAL は、元になった認証イベントの AAL より高く扱ってはならない（SHALL NOT）[N][^30]。DBSC のような所有証明型のセッション秘密は永続化してもよい（MAY）が、その場合も時間制限は守らなければならない（SHALL）[N][^30]。access token を持っていることを、利用者がその場にいる証拠と解釈してはならない（SHALL NOT）[N][^30]。
- 原文（63B-4 §5.1.2）: "The RP SHALL NOT interpret the presence of an access token as an indicator of the subscriber’s presence in the absence of other signals."

**RS-03#45** federation では、IdP と RP のセッションは独立している[N][^31]。再認証の要件を満たしたかを判断する権限は RP にある（SHALL）[N][^31]。
- 原文（63B-4 §5.2）: "the RP SHALL be authoritative as to whether the reauthentication requirements have been met."

**RS-03#46** IdP は、直近の認証がいつ行われたかについて持っている情報を RP に伝えなければならない（SHALL）[N][^42]。RP が新たな認証を要求できるようにすべきである（SHOULD）[N][^42]。identity API にアクセスできることを根拠に、RP のセッションを確立・延長してはならない（SHALL NOT）[N][^42]。

**RS-03#47** OIDC の `max_age` が指定され、前回の認証からの経過時間がそれを超えている場合、OP は能動的に再認証を試みなければならない（MUST）[N][^56]。`max_age` が指定された場合、`auth_time` は REQUIRED になる[N][^53]。クライアントは `acr` が要求に合っているかを確認し（SHOULD）、`auth_time` を確認して必要なら再認証を要求すべきである（SHOULD）[N][^56]。
- 原文（§3.1.2.1）: "If the elapsed time is greater than this value, the OP MUST attempt to actively re-authenticate the End-User."

**RS-03#48** RFC 9470 では、リソースサーバーは `insufficient_user_authentication` と `acr_values`/`max_age` を返して step-up を要求できる[N][^67]。JWT access token の `acr`/`auth_time` は認証した時点で決まり、token を更新しても変わらない[N][^67]。セキュリティ上の考慮（§9）として、リソースサーバーが challenge で返す `acr_values` は利用者や資源に関する情報を意図せず開示し得る、と述べている[N][^67]。たとえば一部の利用者にだけ高い保証レベルの `acr` を要求すると、高権限の利用者を推測される手掛かりになる[N][^67]。
- 原文（§6.1）: "the values of those two parameters are established at user-authentication time and will not change in the event of access token renewals."

### 3.10 フェデレーション（FAL、assertion injection、IdP 起点）

**RS-03#49** FAL2 では、assertion を injection 攻撃から強く保護しなければならず（SHALL）、federation transaction は RP が開始しなければならない（SHALL）[N][^32]。audience は単一の RP に限り、trust agreement は事前に結ぶ[N][^32]。FAL3 では、assertion に加えて利用者が認証器を制御していることを RP が確かめなければならない（SHALL）[N][^32]。これにより、侵害された IdP からも守られる[N][^32]。
- 原文（63C-4 §2.3）: "At FAL2, the assertion SHALL be strongly protected from assertion injection attacks, as discussed in Sec. 3.11.1. The federation transaction SHALL be initiated by the RP."
- 原文（63C-4 §2.4）: "FAL3 also protects against the possibility of a compromised IdP by requiring additional authentication by the subscriber at the RP."

**RS-03#50** injection 対策の一般的な実践として、back-channel での提示、セッションと結び付けた推測不能な値、RP の認証、IdP 起点の federation の禁止、nonce を含む署名付き応答が挙げられている[N][^38]。ただし、外部の当事者が RP に federation の開始を促し、RP がそれを受けて transaction を開始する場合は、禁止の対象外とされている[N][^38]。
- 原文（63C-4 §3.11.1）: "Prohibiting IdP-initiated federation processes to prevent the RP from accepting unsolicited assertions and assertion references from the IdP, though this prohibition does not include processes in which an external party (e.g., the IdP or a federation authority) signals the RP to start a federation process with the IdP"

**RS-03#51** assertion には、発行者、audience、発行時刻、有効期間、assertion ID、認証時刻、署名を含めなければならない（SHALL）[N][^44]。FAL2 以上では RP の nonce も含めなければならない（SHALL）[N][^44]。RP は署名、発行者（期待した IdP か）、時刻、audience、nonce、xAL、再送でないことを検証しなければならない（SHALL）[N][^44]。認証済みセッションを作れるのは、assertion が「その transaction で期待した IdP」から来ていて、かつ「連携 ID に示された IdP」が発行者である場合に限られる（SHALL）[N][^37]。

**RS-03#52** SAML 2.0 Web Browser SSO Profile では、IdP が unsolicited Response を送ってもよい（MAY）[N][^69]。その場合 `InResponseTo` を含めてはならない（MUST NOT）[N][^69]。要求に対する応答の場合、SP は `InResponseTo` が元の `AuthnRequest` の ID と一致することを確かめなければならない（MUST）[N][^69]。
- 原文（§4.1.5）: "An identity provider MAY initiate this profile by delivering an unsolicited <Response> message to a service provider."

**RS-03#53** OIDC Core §4 では、OP などの第三者が RP のログイン開始エンドポイントにリダイレクトし、RP が改めて Authentication Request を送る[N][^57]。このとき `iss` パラメータは REQUIRED である[N][^57]。

**RS-03#54** Auth0 の公式文書は、IdP 起点のフローにはセキュリティリスクがあるため推奨しないとしている[V][^70]。理由は、誰もフローの開始者を確かめられず、Login CSRF の余地が生じるためである[V][^70]。OIDC を正しく実装したアプリケーションは、要求していない応答を拒否する、とも記している（2026-09-18 更新の版を確認）[V][^70]。
- 原文: "IdP-Initiated flows carry a security risk and are therefore not recommended."

**RS-03#55** RFC 9207 に対応するクライアントは、認可応答の `iss` を、要求を送った AS の issuer と単純な文字列比較で照合しなければならない（MUST）[N][^68]。一致しない場合は拒否しなければならない（MUST）[N][^68]。`iss` に対応している AS からの応答に `iss` がない場合も拒否しなければならない（MUST）[N][^68]。

**RS-03#56** DS-511 は、フェデレーションについては保証レベルを定めず、一律の基準を置いている[N][^88]。transaction は原則として依拠当事者（RP）から開始する[N][^88]。閉域網などリスクが低い場合に限り、IdP から開始してもよい[N][^88]。trust の合意事項には共有シグナルの使い方を含め、assertion では「想定する IdP からの発行」「自身の要求への応答」「再利用でないこと」などを検証することを求めている[N][^88]。
- 原文（表3-15）: 「フェデレーションのトランザクションは原則として依拠当事者側から開始すること。」

### 3.11 識別子、メール再利用、account linking、nOAuth

**RS-03#57** 連携 ID（federated identifier）は、issuer と subject を組み合わせたものである[N][^34]。RP は、subject を発行した IdP を考慮せずに subject を処理してはならない[N][^34]。subject を IdP をまたいで一意だと扱ってはならない（SHALL NOT）[N][^44]。FAL2 以上では、連携 ID に平文の個人情報（email など）を含めてはならない（SHALL NOT）[N][^32]。
- 原文（63C-4 §4.9）: "An RP that uses the federated identifier to identify the subscriber SHALL NOT treat subject identifiers as inherently globally unique across IdPs."

**RS-03#58** OIDC の `sub` は、Issuer の中で一意で、再割当てされない（最大255文字の ASCII、大文字小文字を区別）[N][^53]。RP が安定した識別子として頼れるのは `iss` と `sub` の組合せだけである[N][^54]。email、phone_number、preferred_username、name を一意の識別子として使ってはならない（MUST NOT）[N][^54]。Issuer は email の値を時期を変えて別の利用者に再利用してもよい（MAY）[N][^54]。`email_verified` は「検証した時点で」その利用者が制御していたことを意味するにとどまる[N][^55]。OIDC Core 1.0 errata set 2（2023-12-15）は ISO/IEC 26131:2024（2024-10 発行、stage 60.60）として出版されている[N][^53][^58]。
- 原文（§5.7）: "For instance, an Issuer MAY re-use an email Claim Value across different End-Users at different points in time, and the claimed email address for a given End-User MAY change over time."

**RS-03#59** account linking を許す RP は、すべての linking 機能で認証済みセッションを要求しなければならない（SHALL）[N][^36]。このセッションでは、既存の連携 ID で認証させるべきである（SHOULD）[N][^36]。連携 ID の追加・削除は利用者に通知しなければならない（SHALL）[N][^36]。削除した連携 ID からのアクセスは拒否しなければならない（SHALL）[N][^36]。account resolution を行う場合は、属性が利用者を一意に特定できることを確かめ（SHALL）、他人の連携 ID と結び付けない設計にしなければならない（SHALL）[N][^36]。
- 原文（63C-4 §3.8.1）: "the RP SHALL require an authenticated session with the subscriber account for all linking functions."

**RS-03#60** Auth0 の公式文書は、手動でも自動でも、linking の前に両方の account の認証を要求すべきだとしている（2026-09-25 更新の版を確認）[V][^71]。
- 原文: "For both manual and automatic account links, your tenant should request authentication for both accounts before linking occurs."

**RS-03#61** nOAuth は Descope が発見して Microsoft に報告し、命名した[I][^72]。Azure AD（当時）の email claim は変更可能で未検証だったため、email で account を統合するアプリでは、攻撃者が自分の tenant で被害者の email を設定し、account を乗っ取れた[I][^72]。Descope は 2023-04-11 に Microsoft に報告し、2023-06-20 に Microsoft と共同で公表した[I][^72]。

**RS-03#62** MSRC は 2023-06-20 の勧告で、email claim は改ざんされ得るため認可に使ってはならないとし、ドメイン所有者が未検証の token claim を大半のアプリケーションで省く緩和策を展開した[I][^73]。
- 原文: "Microsoft has deployed mitigations to omit token claims from unverified domain owners for most applications."
- 原文: "Applications should never use the email claim for authorization due to its mutability and non-uniqueness."

**RS-03#63** Microsoft Learn の breaking changes（June 2023）によると、マルチテナントアプリでは、ドメイン所有者が検証していない email は既定で token から省かれる[V][^74]。Facebook と SAML/WS-Fed の account には検証済みドメインがない[V][^74]。`xms_edov` claim は、email のドメイン所有者が検証済みかどうかを示す[V][^76]。

**RS-03#64** Microsoft Learn の claims validation 文書は、`tid` と `oid` の組合せをアプリケーションデータと認可のキーに使うよう示している[V][^75]。email、preferred_username、unique_name は、認可にもデータ保存のキーにも使ってはならないとしている[V][^75]。
- 原文: "use the immutable claim values tid and oid as a combined key for application data and determining whether a user should be granted access."

**RS-03#65** Google の OIDC 文書によると、`sub` は Google Account 全体で一意で再利用されない[V][^78]。email を一意の識別子として使ってはならない[V][^78]。email のドメインで Google Workspace の利用者を判定することはできず、`hd` claim を使う必要がある[V][^78]。
- 原文: "You also can't rely on the domain of the email claim to identify users of Google Workspace or Cloud organizations; use the hd claim instead."

**RS-03#66** OpenID RISC Profile 1.0（2025-08-29 公開）は、SSF 1.0・CAEP 1.0（いずれも 2025-08-29 公開）とともに Final として承認されたことが、2025-09-02 付の OpenID Foundation の告知で公表された[N][^64][^65][^92][^93]。RISC には次のイベントが定義されている[N][^64]。`identifier-recycled`（email/phone が別人に再割当てされた）、`identifier-changed`、`account-disabled`（理由 `hijacking` など）、`credential-compromise`、`recovery-activated` など[N][^64]。`sessions-revoked`（§2.11）も定義に残っているが非推奨（deprecated）とされ、新規実装は CAEP の `session-revoked` を使わなければならない（MUST）[N][^64]。CAEP 1.0 §3.1 は `session-revoked` を定義している[N][^92]。
- 原文（§2.6）: "Identifier Recycled signals that the identifier specified in the subject was recycled and now it belongs to a new user."

**RS-03#67** Google の Cross-Account Protection は、署名付きの security event token を RP に送る[V][^66]。対象のイベントには sessions-revoked、tokens-revoked、account-disabled などがある[V][^66]。`account-disabled` の理由が hijacking の場合は、開いているセッションを終わらせることを Required としている（2026-03-22 更新の版を確認）[V][^66]。

### 3.12 B2B マルチ IdP、HRD、domain 検証、顧客 IdP の切離し

**RS-03#68** RP が IdP を allowlist に入れる場合は、その IdP が trust agreement を守っていることを確認しなければならない（SHALL）[N][^39]。allowlist でワイルドカードドメインを使ってはならない（SHALL NOT）[N][^39]。blocklist は使ってもよい（MAY）[N][^39]。trust agreement があり allowlist にない IdP には、実行時に authorized party が選ぶ既定ポリシーを適用しなければならない（SHALL）[N][^39]。その際、email を入力させて IdP を選ぶ discovery を使ってよい[N][^39]。選択を記憶する場合は、そのことを開示し、取り消せるようにしなければならない（SHALL）[N][^39]。当事者の識別子には一般にワイルドカードを使ってはならない（SHALL NOT）[N][^35]。鍵更新の手順は trust agreement で定め、認証された保護経路で行わなければならない（SHALL）[N][^35]。

**RS-03#69** Okta の IdP routing rules（IdP Discovery）は、email ドメインや属性で IdP を振り分ける機能である[V][^81]。Okta は、この機能自体はセキュリティを強化しないと明記している[V][^81]。
- 原文: "Routing rules improve the end-user sign-in experience, but they don't provide security enhancements."

**RS-03#70** Microsoft Entra ID では、カスタムドメインの所有を DNS の TXT または MX で検証する[V][^91]。別の tenant で検証済みのドメインは追加できない[V][^79]。セルフサービスで作られた管理されていないディレクトリは、DNS TXT で所有を証明すれば引き継げ、external admin takeover では利用者も移される[V][^79]。`forceTakeover` で引き継いだ管理されていない組織は、10日後に削除される（2026-06-18 版を確認）[V][^79]。

**RS-03#71** Atlassian は、検証後も DNS の TXT レコードを定期的に確認している[V][^80]。レコードが削除・変更され14日以内に再検証しないと、ドメインは未検証に戻り、SAML SSO などのポリシーが効かなくなり、managed account は unclaimed になる[V][^80]。
- 原文: "If you don't verify your domain within 14 days, your domain verification status will change to Unverified and any managed accounts with this domain will become unclaimed."

**RS-03#72** IdP から RP へシグナルを送るには、事前に trust agreement を結んでいなければならない（SHALL）[N][^43]。IdP は、account の停止、侵害の疑い、email などの属性変更、xAL の範囲の変更、認証器の更新を RP に送るべきである（SHOULD）[N][^43]。侵害の疑いを受けた IdP は自身での行動を調べなければならず（SHALL）、確認できたらその期間に使われた他の RP にも知らせなければならない（SHALL）[N][^43]。複数の IdP と linking している RP は、シグナルで linking 先の IdP が分からないようにしなければならない（SHALL）[N][^43]。

**RS-03#73** SP 800-63C-4 の脅威表には、「侵害された IdP が適切に認証していない者を主張する」ことと、「失効した email 属性を持つ attribute bundle を提示してその email を使う」ことが挙がっている[N][^45]。IdP への攻撃は RP に波及し得るため、RP は独自の監視能力を持つ必要があるとしている[N][^45]。

**RS-03#74** OpenID Federation 1.0 は、2026-02-17 に Final として公開された[N][^59]。trust chain を通じて多者間の信頼を第三者が仲介する仕組みを定め、OIDC と OAuth 2.0 への適用方法も規定している[N][^59]。

### 3.13 SCIM、JIT、deprovision

**RS-03#75** SCIM の `id` は service provider が付与し、安定していて再割当てされない（MUST）[N][^60]。クライアントが指定してはならない（MUST NOT）[N][^60]。`externalId` は provisioning クライアントが定義する[N][^60]。`userName` は service provider 内で一意（MUST）で、大文字小文字を区別しない[N][^60]。service provider は削除された resource を衝突の判定に含めるべきでなく（SHOULD NOT）、削除済みの resource と同じ `userName` での作成要求を `userName` の衝突を理由に 409 で失敗させるべきでない（SHOULD NOT）[N][^61]。つまり削除後に同じ `userName` で作り直せることは SHOULD 水準の期待であり、保証ではない[D]。
- 原文（RFC 7643 §3.1）: "It MUST be a stable, non-reassignable identifier that does not change when the same resource is returned in subsequent requests."

**RS-03#76** 重複する resource を作ろうとした場合、service provider は 409 と `scimType` `uniqueness` を返さなければならない（MUST）[N][^61]。ETag による版管理はサポートしてもよい（MAY）[N][^61]。版の不一致には 409 または 412 を返す[N][^61]。SCIM はマルチテナンシーの方式を定めておらず（OPTIONAL）、`externalId` が一意であるのはテナント内だけである[N][^62]。
- 原文（RFC 7644 §6.2）: "The externalId, defined by the client, is required to be unique ONLY within the resources associated with the associated Tenant."

**RS-03#77** RP の account は、JIT、事前プロビジョニング、ephemeral のいずれかで作る[N][^40]。事前プロビジョニングした account は、trust agreement に別の定めがない限り、作成時に連携 ID と結合しなければならない（SHALL）[N][^40]。どのモデルを使うかは trust agreement に文書化しなければならない（SHALL）[N][^40]。JIT の RP は、キャッシュした属性に責任を持つ（SHALL）[N][^40]。シグナルがない場合は、一定期間使われていない account を削除してもよい（MAY、例は120日）[N][^40]。その場合は事前に通知しなければならない（SHALL）[N][^40]。
- 原文（63C-4 §4.6.3）: "Pre-provisioned accounts SHALL be bound to a federated identifier at the time of provisioning, unless an alternative means of access is defined by the trust agreement"

**RS-03#78** provisioning API は相互認証された経路で使わなければならない（SHALL）[N][^41]。IdP は account の停止などの状態変化を RP に知らせなければならない（SHALL）[N][^41]。知らせを受けた RP は、連携 ID の結合を外さなければならない（SHALL）[N][^41]。IdP は、account の終了や RP へのアクセス取消を RP に知らせるべきである（SHOULD）[N][^41]。

**RS-03#79** Microsoft Entra のプロビジョニングは、matching attribute で既存の利用者を照合する[V][^82]。非ギャラリー機能で接続した SCIM アプリでは、同期は40分ごと（初回サイクル後は約40分ごと）である[V][^83]。ギャラリーアプリを含む一般の増分サイクルは、アプリ別のチュートリアルで定める間隔で繰り返される[V][^82]。対象外になった利用者や無効化・論理削除された利用者は、更新で無効化される[V][^82]。物理削除は論理削除から30日後である[V][^82]。SCIM の対応例として、`userPrincipalName` を `userName` に、`mailNickname` を `externalId` に（グループは `objectId` を `externalId` に）割り当てる例が示されている[V][^83]。この例で照合キーになっている属性は変更可能な値である[D]。

**RS-03#80** RFC 9967「SCIM Profile for Security Event Tokens」（Proposed Standard、2026-05）は、RFC 7643/7644 を更新し、SCIM の service provider と受信者の間で SET を使ってイベントを非同期にやり取りする方法を定めている[N][^63]。本調査で確認したのは要旨だけである[N][^63]。

## 4. 標準・文書ステータス表

| 名称 | 版 | 状態 | 公表日 | 確認日 | URL |
|---|---|---|---|---|---|
| NIST SP 800-63-4 Digital Identity Guidelines | Rev. 4 | final | 2025-07-31 | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/63/4/final |
| NIST SP 800-63A-4 Identity Proofing and Enrollment | Rev. 4 | final | 2025-07-31 | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/63/a/4/final |
| NIST SP 800-63B-4 Authentication and Authenticator Management | Rev. 4 | final | 2025-07-31 | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/63/b/4/final |
| NIST SP 800-63C-4 Federation and Assertions | Rev. 4 | final | 2025-07-31 | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/63/c/4/final |
| W3C Web Authentication Level 3 | REC-webauthn-3-20260825 | W3C Recommendation | 2026-08-25 | 2026-10-03 | https://www.w3.org/TR/webauthn-3/ |
| FIDO Credential Exchange Format | v1.0 ps-errata-20260309 | Proposed Standard | 2026-03-09 | 2026-10-03 | https://fidoalliance.org/specs/cx/cxf-v1.0-ps-errata-20260309.html |
| FIDO Credential Exchange Protocol | v1.0 wd-20241003 | Working Draft | 2024-10-03 | 2026-10-03 | https://fidoalliance.org/specs/cx/cxp-v1.0-wd-20241003.html |
| FIDO White Paper: High Assurance Enterprise FIDO Authentication | — | 白書（非規範） | 掲載ページ表示 2024-08-29 | 2026-10-03 | https://fidoalliance.org/white-paper-high-assurance-enterprise-fido-authentication/ |
| OpenID Connect Core 1.0 incorporating errata set 2 | errata set 2 | final | 2023-12-15 | 2026-10-03 | https://openid.net/specs/openid-connect-core-1_0.html |
| ISO/IEC 26131:2024（OIDC Core 1.0 errata set 2） | Edition 1 | published（60.60） | 2024-10 | 2026-10-03 | https://www.iso.org/standard/89056.html |
| OpenID Federation 1.0 | 1.0 | final | 2026-02-17 | 2026-10-03 | https://openid.net/specs/openid-federation-1_0.html |
| OpenID RISC Profile Specification 1.0 | 1.0 | final（承認告知 2025-09-02） | 2025-08-29 | 2026-10-03 | https://openid.net/specs/openid-risc-1_0-final.html |
| OpenID Shared Signals Framework Specification 1.0 | 1.0 | final（承認告知 2025-09-02。本文は公表日のみ確認） | 2025-08-29 | 2026-10-03 | https://openid.net/specs/openid-sharedsignals-framework-1_0-final.html |
| OpenID CAEP Specification 1.0 | 1.0 | final（承認告知 2025-09-02。本文は公表日と §3.1 のみ確認） | 2025-08-29 | 2026-10-03 | https://openid.net/specs/openid-caep-1_0-final.html |
| RFC 7643 SCIM Core Schema | RFC | Proposed Standard（RFC 9865, RFC 9967 で更新） | 2015-09 | 2026-10-03 | https://datatracker.ietf.org/doc/rfc7643/ |
| RFC 7644 SCIM Protocol | RFC | Proposed Standard（RFC 9865, RFC 9967 で更新） | 2015-09 | 2026-10-03 | https://datatracker.ietf.org/doc/rfc7644/ |
| RFC 9967 SCIM Profile for SETs | RFC | Proposed Standard（要旨のみ確認） | 2026-05 | 2026-10-03 | https://datatracker.ietf.org/doc/rfc9967/ |
| RFC 9470 OAuth 2.0 Step Up Authentication Challenge | RFC | Standards Track | 2023-09 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9470 |
| RFC 9207 OAuth 2.0 AS Issuer Identification | RFC | Standards Track | 2022-03 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9207 |
| OASIS SAML V2.0 Profiles | saml-profiles-2.0-os | OASIS Standard | 2005-03-15 | 2026-10-03 | https://docs.oasis-open.org/security/saml/v2.0/saml-profiles-2.0-os.pdf |
| デジタル庁 DS-511 | 初版 | 決定・施行済（Normative、国の行政機関向け） | 2025-09-30 | 2026-10-03 | 脚注[^85]の URL |
| デジタル庁 DS-512（DS-511 解説書） | 初版 | 公表（Informative） | 2026-02-24 | 2026-10-03 | 脚注[^90]の URL |
| CISA AA23-320A Scattered Spider | 勧告 | 公開（改訂あり） | 2023-11-16（最終改訂 2025-07-29） | 2026-10-03 | https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-320a |

## 5. 設計への含意

### 5.1 ADR・設計文書への入力

| 入力先 | 入力内容 | 根拠 | 閉じ方 |
|---|---|---|---|
| ADR-002（主体×操作の IAL/AAL/FAL）／DL-09（保証レベル割当表）／DL-19 | 主体種別を user group、操作を transaction として、5つの影響カテゴリで評価する[D]。統合規則（high-water mark を推奨案とする）を文書化する[D]。初期値の対応表を使い、tailoring・補償統制・補完統制は DIAS 相当の様式に記録する[D] | RS-03#4〜#9 | B |
| ADR-002／DL-09 | 多数の利用者に影響する操作（テナント管理者の一括操作、support の回復代行、運用者権限）を「レベル3超」の階層として定義する[D]。フィッシング耐性 MFA に、二者承認・JIT 昇格・監査などの追加統制を重ねる候補とする[D] | RS-03#10, #8 | B |
| ADR-002／DL-09 | 最上位階層は AAL3 相当とし、device-bound の認証器（エクスポート不能な鍵）に限る[D]。同期 passkey は AAL2 までとする[D]。日米の差（DS-512）は、厳しい側を適用すると記録する[D] | RS-03#15, #21, #25 | A |
| ADR-002／ADR-001（build/buy） | 外部 IdP の amr だけでは同期型かどうかを判別できない場合がある[D]。最上位階層では、本基盤の RP 側で WebAuthn の BE フラグと attestation を確かめる束縛認証器を要求する[D]。managed IdP を選ぶ評価軸に「AAL と認証器種別（同期/device-bound）を assertion で区別して伝えられるか」を加える[D] | RS-03#27, #24, #9 | A＋C |
| ADR-002 | 非人間主体（service account、workload、AI エージェント）は SP 800-63-4 の範囲外である[D]。保証の枠組みは workload identity 系の調査ストリームに委ねる[D] | RS-03#2 | A |
| ADR-003（回復と認証器ライフサイクル）／DL-08（ID ライフサイクル仕様） | 状態機械に次を組み込む[D]。認証器の台帳（特性・フィッシング耐性・イベント日時）、追加 binding 時の AAL 規則、binding とは別の経路での通知、通知先2つ以上、紛失時の停止期限[D] | RS-03#31〜#35 | A |
| ADR-003／DL-08 | AAL2 の回復は NIST の3つの組合せのいずれかとし、回復通知を必須にする[D]。helpdesk 経由の回復は「application-specific method」として扱い、リスク分析と文書化を条件にする[D]。特権主体は helpdesk 単独では回復できないようにする[D]。待機時間は NIST に数値の規定がないため、BIA と実測で決める[D] | RS-03#36〜#42 | B＋C |
| ADR-004（B2B federation、linking、domain、SCIM）／DL-08 | 識別子は `iss`+`sub`（Entra は `tid`+`oid`）に限る[D]。email・UPN は表示用だけに使う[D]。email 一致による自動 linking は禁止する[D]。linking は認証済みセッションで、両方の account を認証させたうえで行い、利用者に通知する[D] | RS-03#57〜#65 | A＋C |
| ADR-004／DL-16（OAuth/OIDC profile） | RP 起点だけを許可する（FAL2）[D]。IdP 起点 SAML は既定で無効にする[D]。例外は「第三者起点ログイン（RP が改めて要求する）」への変換とする[D]。テナントごとに期待 IdP の allowlist を持ち、iss/aud/nonce/InResponseTo/RFC 9207 の `iss` を検証する[D] | RS-03#49〜#56, #68 | A＋C |
| ADR-004／DL-26（顧客管理機能） | HRD はドメイン検証済みの tenant だけを対象にする[D]。DNS TXT の定期再検証、失効の猶予期間、所有の衝突や引継ぎの手順を定める[D]。Google の利用者は `hd` claim で判定する[D] | RS-03#65, #69〜#71 | A＋C |
| ADR-004／ADR-019（侵害時 runbook）／DL-24 | 顧客 IdP が侵害された場合は、IdP 単位で遮断（blocklist）し、その IdP 由来のセッションを失効させ、共有シグナルを送受信する[D]。高影響の操作には FAL3 相当（RP 側の束縛認証器）を求める[D]。責任分界は契約条項（DL-26/DL-34）に記載する[D] | RS-03#7, #49, #68, #72, #73 | B＋C |
| ADR-004／ADR-006（失効と継続評価） | SCIM と JIT の調停規則を定める[D]。(1) 事前プロビジョニングの account は作成時に連携 ID と結合する、(2) 照合キーは変わらない ID（例: Entra の `objectId`）にする、(3) 409/ETag の処理、(4) JIT で作った account と後から届いた SCIM の統合は、resolution の規則（一意性の証明）に従う[D] | RS-03#75〜#79, #59 | A＋C |
| ADR-006／DL-20（数値契約） | deprovision の SLO は SCIM の同期間隔（Entra の非ギャラリー SCIM アプリは約40分、ギャラリーアプリはアプリ別）だけでは決められない[D]。RISC/SSF/CAEP、RFC 9967 SET、セッション失効を組み合わせた反映時間を実測して決める[D]。セッション失効のシグナルは CAEP の `session-revoked` を使い、非推奨の RISC `sessions-revoked` は受信互換のためだけに扱う[D]。`identifier-recycled` を受け取ったら、その識別子に結び付いた回復先・通知先を無効にする[D] | RS-03#66, #67, #72, #79, #80 | C |
| ADR-005（token profile）／DL-16 | step-up は `acr_values`/`max_age` と RFC 9470 の challenge で行う[D]。AT の `acr`/`auth_time` は refresh しても変わらないため、step-up のたびに新しい認可要求を送る[D]。RS が challenge で返す `acr_values` は利用者ごとの差から高権限者を推測され得るため、開示する情報と条件を最小限にする[D] | RS-03#47, #48 | A |
| ADR-005／DL-20 | 再認証の上限値は AAL ごとの値（RS-03#43）を上限として、階層ごとに決める[D]。全階層一律の値は使わない（R-087）[D]。判断権は RP 側に置く[D] | RS-03#43〜#46 | B＋C |
| ADR-018（出口戦略）／DL-13 | passkey の RP ID は本基盤が保有する registrable domain にする[D]。managed IdP では custom domain が使えることを必須の条件にする[D]。CXP がまだ draft なので、プロバイダ間での passkey の移行は前提にしない[D] | RS-03#29, #30 | A＋C |
| ADR-008（管理面） | 顧客管理者・support・運用者にはフィッシング耐性 MFA を必須にする（補完統制）[D]。SMS/音声は restricted authenticator として、使う場合は受容票と移行計画を記録する[D] | RS-03#8, #14, #16, #17 | A |

### 5.2 PoC で実測すべきこと

TC-ID は未採番である（12_poc で採番する）[D]。

1. 外部 IdP（Entra、Okta、Google）から届く assertion を観測する[D]。AAL と同期/device-bound を `acr`/`amr` で区別できるか、`max_age=0` で実際に再認証されるかを測る[D]（RS-03#27, #47）。
2. 利用者群ごとの passkey の構成比を測る[D]。BE/BS フラグの分布、attestation が得られる割合、BS の 1→0 遷移の頻度を記録する[D]（RS-03#22, #24）。
3. nOAuth の再現試験を行う[D]。マルチテナントの Entra アプリで email を偽装した利用者が既存 account に結び付かないことを、負例試験で確かめる[D]（RS-03#61〜#64）。
4. フェデレーションの負例試験を行う[D]。unsolicited SAML Response、`InResponseTo` の不一致、テナント A の IdP が発行した assertion をテナント B の ACS に提示する、`iss` の不一致（RFC 9207）、nonce の欠落について、すべて拒否されることを確かめる[D]（RS-03#49〜#55）。
5. SCIM と JIT の競合試験を行う[D]。SCIM の作成より先に JIT でログインした場合、同じ `userName` が再利用された場合、ETag が衝突した場合を試す[D]。IdP で割当を解除してから本基盤で無効化・セッション失効されるまでの時間分布も測る[D]（RS-03#75〜#79）。
6. 回復手順を試験する[D]。完了までの時間、通知が届くまでの遅延、helpdesk に対するソーシャルエンジニアリング演習（red team）で回復を不正に成功させられた率を測る[D]（RS-03#36〜#42）。
7. ドメイン検証を試験する[D]。TXT を削除してから検知するまでの時間と、猶予期間が切れた後の SSO 強制の挙動を確かめる[D]（RS-03#70, #71）。
8. RP ID を試験する[D]。custom domain の RP ID で、IdP 製品を差し替えた後も passkey が使えるか、主要ブラウザで related origins（5 label 以上）が動作するかを確かめる[D]（RS-03#29）。
9. 顧客 IdP を遮断する演習を行う[D]。blocklist を有効にしてから、その IdP 由来の全セッションが失効するまでの時間を測る[D]（RS-03#68, #72）。
10. 再認証の設定値を比べる[D]。AAL2 の 24h/1h と、より短い値で、作業完了率・再認証の頻度・step-up の発生率を測る[D]（RS-03#43）。

## 6. 調査の限界と未確認事項

1. SP 800-63-4 系は連邦政府向けの指針で、民間には「may consider」とされている[N][^5]。EU/英国の保証レベル体系（eIDAS の LoA、UK DIATF）と日本の民間向けの規制（犯収法の eKYC など）は本 RS では調べていない[D]。
2. ISO/IEC 26131:2024 については、ISO の公式ページで題名・版・状態・発行月だけを確認した[D]。本文が OIDC Core errata set 2 と一字一句同じかは確かめていない（未確認）[D]。
3. SSF 1.0 と CAEP 1.0 は、OpenID Foundation の承認告知で Final であることを確認し、独立検証の段階で各仕様の公表日（いずれも 2025-08-29）と CAEP §3.1 `session-revoked` の定義を確認した[D]。SSF の規範要件と、`session-revoked` 以外の CAEP イベント種別は未確認である[D]。
4. RFC 9967 は datatracker の要旨だけを確認し、本文の規範要件は読んでいない（未確認）[D]。
5. Microsoft Learn の「email claim の使用から移行する」ガイド（migrate-off-email-claim-authorization）の URL は、確認日にはハブページへ転送され、本文を取得できなかった（未確認）[D]。代わりに MSRC の勧告と claims validation の文書を根拠とした[D]。
6. Semperis による nOAuth の再調査（2025、seed-02 に記載）は取得していない（未確認）[D]。結論には使っていない[D]。
7. 「主要 IdP」のドメイン検証については、Microsoft Entra、Okta（routing）、Google（`hd`）、Auth0、Atlassian（SaaS 側の運用例）だけを確認した[D]。Okta 自身のドメイン検証、Ping Identity、AWS IAM Identity Center などは調べていない[D]。
8. DS-511 の本文は、同期 passkey が当人認証保証レベル2の「暗号鍵の不正な取り出し・複製への耐性」を満たすかを明示していない[D][^86]。DS-512 の「レベル3を実現できる」という記述は Informative 文書のものであり、デジタル庁の公式な解釈は確認していない（未確認）[D]。
9. FIDO の白書は、掲載ページの日付が 2024-08-29 だが、PDF のファイル名は 2023 年春版を示している[D]。初版の公表日は確定できていない[D]。また、白書の AAL の参照先は SP 800-63-3 の実装資料（参考文献 [7]）であり、SP 800-63-4 Final を踏まえた記述ではない[D]。
10. WebAuthn L3 の機能（related origins、signal API、hints）がブラウザにどこまで実装されているかは調べていない（implementation report は未読）[D]。
11. SP 800-63B-4 は回復の「待機時間」に数値を定めていない[N][^26]。待機時間を設ける場合は本基盤の設計判断になり、BIA と実測で決める必要がある[D]。
12. DS-511 は SP 800-63 の全面改定を「2025年8月」と書いているが、NIST CSRC の版履歴では Final は 2025-07-31 である[N][^85][^1]。本書では CSRC を採った[D]。
13. 63B-4 §2.5 の Table 1（Summary of requirements by AAL。再認証の推奨値など）は非規範である[N][^15]。規範強度は §2.1.3、§2.2.3、§2.3.3 の本文から写した[D]。
14. ベンダー文書（Microsoft、Okta、Google、Auth0、Atlassian）は確認日時点の版であり、予告なく変わり得る[D]。四半期ごとに確認し直す必要がある[D]。
15. 種資料との照合結果: seed-02 の「63B-4 では同期 passkey は AAL2 まで」「WebAuthn L3 は 2026-08-25 に Rec」「OpenID Federation 1.0 は 2026-02 に Final」「RISC 1.0 は Final」「OIDC Core は ISO/IEC 26131:2024」「Entra は tid+oid」は、いずれも原典で確認できた[D]。seed-01 の「DS-511 は 2025-09-30 決定、DS-512 は 2026-02-24」も一致した[D]。seed に記載がなかった RFC 9967（2026-05）と、DS-512 の同期 passkey の扱い（RS-03#25）は本調査で新たに見つけた[D]。
16. IPSIE WG の状況、SCIM Agent の草案、OpenID Federation の実装・適合試験の状況は調べていない（未確認）[D]。

## 参考文献

[^1]: NIST『SP 800-63-4 Digital Identity Guidelines』Final, 2025-07-31（CSRC 表記 July 2025）. https://csrc.nist.gov/pubs/sp/800/63/4/final （参照箇所: 出版情報・Document History・Supersedes、確認日: 2026-10-03）
[^2]: NIST『SP 800-63A-4 Digital Identity Guidelines: Identity Proofing and Enrollment』Final, 2025-07-31. https://csrc.nist.gov/pubs/sp/800/63/a/4/final （参照箇所: 出版情報・Document History、確認日: 2026-10-03）
[^3]: NIST『SP 800-63B-4 Digital Identity Guidelines: Authentication and Authenticator Management』Final, 2025-07-31. https://csrc.nist.gov/pubs/sp/800/63/b/4/final （参照箇所: 出版情報・Document History、確認日: 2026-10-03）
[^4]: NIST『SP 800-63C-4 Digital Identity Guidelines: Federation and Assertions』Final, 2025-07-31. https://csrc.nist.gov/pubs/sp/800/63/c/4/final （参照箇所: 出版情報・Document History、確認日: 2026-10-03）
[^5]: NIST『SP 800-63-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63.html （参照箇所: §1.1 Scope and Applicability、確認日: 2026-10-03）
[^6]: NIST『SP 800-63-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63.html （参照箇所: §3.1、§3.2、§3.2.1、§3.2.2、§3.2.4、確認日: 2026-10-03）
[^7]: NIST『SP 800-63-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63.html （参照箇所: §3.3.3、§3.3.3.1〜§3.3.3.3、確認日: 2026-10-03）
[^8]: NIST『SP 800-63-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63.html （参照箇所: §3.4、§3.4.2、§3.4.3、§3.4.4、確認日: 2026-10-03）
[^9]: NIST『SP 800-63A-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63a.html （参照箇所: §1.2、§4.3.1、確認日: 2026-10-03）
[^10]: NIST『SP 800-63A-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63a.html （参照箇所: §3.14 Digital Injection Prevention and Forged Media Detection、確認日: 2026-10-03）
[^11]: NIST『SP 800-63A-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63a.html （参照箇所: §3.15.1 Requirements for Trusted Referees、確認日: 2026-10-03）
[^12]: NIST『SP 800-63A-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63a.html （参照箇所: §3.16 Elevating Subscriber IALs、確認日: 2026-10-03）
[^13]: NIST『SP 800-63B-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63b.html （参照箇所: §2.2.2、確認日: 2026-10-03）
[^14]: NIST『SP 800-63B-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63b.html （参照箇所: §2.3、§2.3.2、確認日: 2026-10-03）
[^15]: NIST『SP 800-63B-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63b.html （参照箇所: §2.1.3、§2.2.3、§2.3.3、§2.5 Table 1、確認日: 2026-10-03）
[^16]: NIST『SP 800-63B-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63b.html （参照箇所: §3.2.5、§3.2.5.1、§3.2.5.2、確認日: 2026-10-03）
[^17]: NIST『SP 800-63B-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63b.html （参照箇所: §3.1.3.3、§3.2.9、確認日: 2026-10-03）
[^18]: NIST『SP 800-63B-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63b.html （参照箇所: §3.2.11.3 Hybrid Connections、確認日: 2026-10-03）
[^19]: NIST『SP 800-63B-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63b.html （参照箇所: §3.2.4、§4.1.3、確認日: 2026-10-03）
[^20]: NIST『SP 800-63B-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63b.html （参照箇所: §3.2.13 Exportability、確認日: 2026-10-03）
[^21]: NIST『SP 800-63B-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63b.html （参照箇所: Appendix B.2 Cloning Authentication Keys、確認日: 2026-10-03）
[^22]: NIST『SP 800-63B-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63b.html （参照箇所: Appendix B.3 Implementation Requirements、確認日: 2026-10-03）
[^23]: NIST『SP 800-63B-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63b.html （参照箇所: Appendix B.4 Sharing、B.6 Table 5、確認日: 2026-10-03）
[^24]: NIST『SP 800-63B-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63b.html （参照箇所: §4.1、§4.1.2.1、確認日: 2026-10-03）
[^25]: NIST『SP 800-63B-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63b.html （参照箇所: §4.1.2.2 Binding Across Endpoints、確認日: 2026-10-03）
[^26]: NIST『SP 800-63B-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63b.html （参照箇所: §4.2、§4.2.1、§4.2.1.1、§4.2.1.2、確認日: 2026-10-03）
[^27]: NIST『SP 800-63B-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63b.html （参照箇所: §4.2.2.1〜§4.2.2.3、§4.2.3、確認日: 2026-10-03）
[^28]: NIST『SP 800-63B-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63b.html （参照箇所: §4.3、§4.5、確認日: 2026-10-03）
[^29]: NIST『SP 800-63B-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63b.html （参照箇所: §4.6 Account Notifications、確認日: 2026-10-03）
[^30]: NIST『SP 800-63B-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63b.html （参照箇所: §5.1、§5.1.2、確認日: 2026-10-03）
[^31]: NIST『SP 800-63B-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63b.html （参照箇所: §5.2 Reauthentication、確認日: 2026-10-03）
[^32]: NIST『SP 800-63C-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63c.html （参照箇所: §2 Table 1、§2.3、§2.4、確認日: 2026-10-03）
[^33]: NIST『SP 800-63C-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63c.html （参照箇所: §2.5 Requesting and Processing xALs、確認日: 2026-10-03）
[^34]: NIST『SP 800-63C-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63c.html （参照箇所: §3.4 Federated Identifiers、確認日: 2026-10-03）
[^35]: NIST『SP 800-63C-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63c.html （参照箇所: §3.6、§3.6.1、確認日: 2026-10-03）
[^36]: NIST『SP 800-63C-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63c.html （参照箇所: §3.8、§3.8.1、§3.8.2、確認日: 2026-10-03）
[^37]: NIST『SP 800-63C-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63c.html （参照箇所: §3.9 Authenticated Sessions at the RP、確認日: 2026-10-03）
[^38]: NIST『SP 800-63C-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63c.html （参照箇所: §3.11.1 Protection From Assertion Injection Attacks、確認日: 2026-10-03）
[^39]: NIST『SP 800-63C-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63c.html （参照箇所: §4.6.2.1〜§4.6.2.3、確認日: 2026-10-03）
[^40]: NIST『SP 800-63C-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63c.html （参照箇所: §4.6.3、§4.6.7、確認日: 2026-10-03）
[^41]: NIST『SP 800-63C-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63c.html （参照箇所: §4.6.4、§4.6.5、確認日: 2026-10-03）
[^42]: NIST『SP 800-63C-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63c.html （参照箇所: §4.7 Reauthentication and Session Requirements in Federated Environments、確認日: 2026-10-03）
[^43]: NIST『SP 800-63C-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63c.html （参照箇所: §4.8 Shared Signaling、確認日: 2026-10-03）
[^44]: NIST『SP 800-63C-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63c.html （参照箇所: §4.9 Assertion Contents、確認日: 2026-10-03）
[^45]: NIST『SP 800-63C-4』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63c.html （参照箇所: §6.1 Federation Threats, Table 3、確認日: 2026-10-03）
[^46]: W3C『Web Authentication: An API for accessing Public Key Credentials Level 3』W3C Recommendation, 2026-08-25. https://www.w3.org/TR/2026/REC-webauthn-3-20260825/ （参照箇所: 文書冒頭の状態・版情報、確認日: 2026-10-03）
[^47]: W3C『Web Authentication Level 3』W3C Recommendation, 2026-08-25. https://www.w3.org/TR/webauthn-3/ （参照箇所: §4 Terminology「Relying Party Identifier」、§5.11、§5.11.1、確認日: 2026-10-03）
[^48]: W3C『Web Authentication Level 3』W3C Recommendation, 2026-08-25. https://www.w3.org/TR/webauthn-3/ （参照箇所: §6.1.3 Credential Backup State、確認日: 2026-10-03）
[^49]: W3C『Web Authentication Level 3』W3C Recommendation, 2026-08-25. https://www.w3.org/TR/webauthn-3/ （参照箇所: §5.1.10 Signal Credential Changes to the Authenticator、確認日: 2026-10-03）
[^50]: FIDO Alliance『Credential Exchange Format』v1.0 Proposed Standard (errata), 2026-03-09. https://fidoalliance.org/specs/cx/cxf-v1.0-ps-errata-20260309.html （参照箇所: 冒頭・Status of This Document、確認日: 2026-10-03）
[^51]: FIDO Alliance『Download Credential Exchange Specifications』（CXP v1.0 Working Draft 2024-10-03 の掲載）. https://fidoalliance.org/download-credential-exchange-specifications/ （参照箇所: CXP の版・成熟度の記載、確認日: 2026-10-03）
[^52]: FIDO Alliance『White Paper: High Assurance Enterprise FIDO Authentication』掲載ページ 2024-08-29. https://fidoalliance.org/white-paper-high-assurance-enterprise-fido-authentication/ （参照箇所: §1 Introduction（attestation の段落）、§2 Passkey Use Cases（AAL3 と device-bound の段落）、§2.3 Recovery/Lost Device、§6 References [7]（NIST SP 800-63-3 Implementation Resources）、確認日: 2026-10-03。非規範の白書）
[^53]: OpenID Foundation『OpenID Connect Core 1.0 incorporating errata set 2』Final, 2023-12-15. https://openid.net/specs/openid-connect-core-1_0.html （参照箇所: §2 ID Token（sub、auth_time、acr、amr）、確認日: 2026-10-03）
[^54]: OpenID Foundation『OpenID Connect Core 1.0 incorporating errata set 2』Final, 2023-12-15. https://openid.net/specs/openid-connect-core-1_0.html （参照箇所: §5.7 Claim Stability and Uniqueness、確認日: 2026-10-03）
[^55]: OpenID Foundation『OpenID Connect Core 1.0 incorporating errata set 2』Final, 2023-12-15. https://openid.net/specs/openid-connect-core-1_0.html （参照箇所: §5.1 Standard Claims（email、email_verified）、確認日: 2026-10-03）
[^56]: OpenID Foundation『OpenID Connect Core 1.0 incorporating errata set 2』Final, 2023-12-15. https://openid.net/specs/openid-connect-core-1_0.html （参照箇所: §3.1.2.1（max_age）、§3.1.3.7 ID Token Validation、確認日: 2026-10-03）
[^57]: OpenID Foundation『OpenID Connect Core 1.0 incorporating errata set 2』Final, 2023-12-15. https://openid.net/specs/openid-connect-core-1_0.html （参照箇所: §4 Initiating Login from a Third Party、確認日: 2026-10-03）
[^58]: ISO/IEC『ISO/IEC 26131:2024 Information technology — OpenID connect — OpenID connect core 1.0 incorporating errata set 2』Edition 1, 2024-10. https://www.iso.org/standard/89056.html （参照箇所: Status/Publication date/Stage 欄、確認日: 2026-10-03）
[^59]: OpenID Foundation『OpenID Federation 1.0』Final, 2026-02-17. https://openid.net/specs/openid-federation-1_0.html （参照箇所: 文書冒頭の Status/Published、Abstract、確認日: 2026-10-03）
[^60]: IETF『RFC 7643 System for Cross-domain Identity Management: Core Schema』2015-09. https://www.rfc-editor.org/rfc/rfc7643 （参照箇所: §3.1 Common Attributes（id、externalId）、§4.1.1 userName、確認日: 2026-10-03）
[^61]: IETF『RFC 7644 System for Cross-domain Identity Management: Protocol』2015-09. https://www.rfc-editor.org/rfc/rfc7644 （参照箇所: §3.3、§3.6、§3.12 Table、§3.14、確認日: 2026-10-03）
[^62]: IETF『RFC 7644 System for Cross-domain Identity Management: Protocol』2015-09. https://www.rfc-editor.org/rfc/rfc7644 （参照箇所: §6 Multi-Tenancy、§6.2、確認日: 2026-10-03）
[^63]: IETF『RFC 9967 System for Cross-Domain Identity Management (SCIM) Profile for Security Event Tokens (SETs)』Proposed Standard, 2026-05. https://datatracker.ietf.org/doc/rfc9967/ （参照箇所: Document Type、Abstract、確認日: 2026-10-03）
[^64]: OpenID Foundation『OpenID RISC Profile Specification 1.0』Final, 2025-08-29. https://openid.net/specs/openid-risc-1_0-final.html （参照箇所: §2.1〜§2.11 Event Types（§2.6 Identifier Recycled、§2.11 Sessions Revoked の deprecated 注記）、確認日: 2026-10-03）
[^65]: OpenID Foundation『Three Shared Signals Final Specifications Approved』2025-09-02. https://openid.net/three-shared-signals-final-specifications-approved/ （参照箇所: 承認告知本文、確認日: 2026-10-03）
[^66]: Google『Protect user accounts with Cross-Account Protection』Last updated 2026-03-22. https://developers.google.com/identity/protocols/risc （参照箇所: Overview、Supported event types、確認日: 2026-10-03）
[^67]: IETF『RFC 9470 OAuth 2.0 Step Up Authentication Challenge Protocol』2023-09. https://www.rfc-editor.org/rfc/rfc9470 （参照箇所: §3、§6.1、§9、確認日: 2026-10-03）
[^68]: IETF『RFC 9207 OAuth 2.0 Authorization Server Issuer Identification』2022-03. https://www.rfc-editor.org/rfc/rfc9207 （参照箇所: §2.4 Validating the Issuer Identifier、確認日: 2026-10-03）
[^69]: OASIS『Profiles for the OASIS Security Assertion Markup Language (SAML) V2.0』OASIS Standard, 2005-03-15. https://docs.oasis-open.org/security/saml/v2.0/saml-profiles-2.0-os.pdf （参照箇所: §4.1.4.3 <Response> Message Processing Rules、§4.1.5 Unsolicited Responses, p.19-20、確認日: 2026-10-03）
[^70]: Auth0 (Okta)『Configure SAML Identity Provider-Initiated Single Sign-On』dateModified 2026-09-18. https://auth0.com/docs/authenticate/protocols/saml/saml-sso-integrations/identity-provider-initiated-single-sign-on （参照箇所: Risks and considerations、OpenID Connect IdP-initiated flow、確認日: 2026-10-03）
[^71]: Auth0 (Okta)『User Account Linking』dateModified 2026-09-25. https://auth0.com/docs/manage-users/user-accounts/user-account-linking （参照箇所: Precautions、確認日: 2026-10-03）
[^72]: Descope『nOAuth: How Microsoft OAuth Misconfiguration Can Lead to Full Account Takeover』2023-06-20. https://www.descope.com/blog/post/noauth （参照箇所: 脆弱性の説明、Disclosure timeline、確認日: 2026-10-03）
[^73]: Microsoft Security Response Center『Potential Risk of Privilege Escalation in Azure AD Applications』2023-06-20. https://www.microsoft.com/en-us/msrc/blog/2023/06/potential-risk-of-privilege-escalation-in-azure-ad-applications （参照箇所: 問題の説明、緩和策、開発者向けガイダンス、確認日: 2026-10-03）
[^74]: Microsoft Learn『Updates and breaking changes - Microsoft identity platform』updated_at 2026-08-26. https://learn.microsoft.com/en-us/entra/identity-platform/reference-breaking-changes （参照箇所: June 2023「Omission of email claims with an unverified domain owner」、確認日: 2026-10-03）
[^75]: Microsoft Learn『Secure applications and APIs by validating claims』ms.date 2025-03-21. https://learn.microsoft.com/en-us/entra/identity-platform/claims-validation （参照箇所: Validate the subject、Warning、確認日: 2026-10-03）
[^76]: Microsoft Learn『Optional claims reference』ms.date 2026-07-22. https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims-reference （参照箇所: email、xms_edov の行、確認日: 2026-10-03）
[^77]: Microsoft Learn『Optional claims reference』ms.date 2026-07-22. https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims-reference （参照箇所: amr（authnmethodsreferences）の対応表、確認日: 2026-10-03）
[^78]: Google『OpenID Connect | Sign in with Google』Last updated 2026-06-15. https://developers.google.com/identity/openid-connect/openid-connect （参照箇所: ID token の sub、email、hd の説明、確認日: 2026-10-03）
[^79]: Microsoft Learn『Admin takeover of an unmanaged directory』ms.date 2026-06-18. https://learn.microsoft.com/en-us/entra/identity/users/domains-admin-takeover （参照箇所: Overview、External admin takeover、PowerShell and Microsoft Graph API steps の Note、確認日: 2026-10-03）
[^80]: Atlassian Support『Verify a domain to manage accounts』（版日付の表示なし）. https://support.atlassian.com/user-management/docs/verify-a-domain-to-manage-accounts/ （参照箇所: 検証方法、定期確認、14日の猶予、確認日: 2026-10-03）
[^81]: Okta『Identity Provider routing rules』Classic Engine publication（版日付の表示なし）. https://help.okta.com/en-us/content/topics/security/identity_provider_discovery.htm （参照箇所: 機能説明・評価順・注意書き、確認日: 2026-10-03）
[^82]: Microsoft Learn『Understand how Application Provisioning in Microsoft Entra ID』ms.date 2025-03-04. https://learn.microsoft.com/en-us/entra/identity/app-provisioning/how-provisioning-works （参照箇所: Provisioning cycles（initial/incremental。増分サイクルの間隔はアプリ別チュートリアルで定める旨）、Deprovisioning、確認日: 2026-10-03）
[^83]: Microsoft Learn『Tutorial - Develop a SCIM endpoint for user provisioning to apps from Microsoft Entra ID』ms.date 2026-09-15. https://learn.microsoft.com/en-us/entra/identity/app-provisioning/use-scim-to-provision-users-and-groups （参照箇所: 属性の対応表、非ギャラリーアプリとして接続した場合の同期（"The process runs every 40 minutes"）、Handling provisioning and deprovisioning of users、確認日: 2026-10-03）
[^84]: CISA ほか『Scattered Spider』Cybersecurity Advisory AA23-320A, 2023-11-16（最終改訂 2025-07-29）. https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-320a （参照箇所: Technical Details（Social Engineering）、Mitigations、確認日: 2026-10-03）
[^85]: デジタル庁『DS-511 行政手続等での本人確認におけるデジタルアイデンティティの取扱いに関するガイドライン』2025-09-30 デジタル社会推進会議幹事会決定. https://www.digital.go.jp/assets/contents/node/basic_page/field_ref_resources/e2a06143-ed29-4f1d-9c31-0f06fca67afc/12cb1a6c/20250930_resources_standard_guideline_identityverification_01.pdf （参照箇所: 表紙、§1.2、§1.3 p.2、別紙1 p.48、確認日: 2026-10-03）
[^86]: デジタル庁『DS-511』2025-09-30. https://www.digital.go.jp/assets/contents/node/basic_page/field_ref_resources/e2a06143-ed29-4f1d-9c31-0f06fca67afc/12cb1a6c/20250930_resources_standard_guideline_identityverification_01.pdf （参照箇所: §3.2 表3-6 p.28、表3-9 p.32、表3-10 p.33、確認日: 2026-10-03）
[^87]: デジタル庁『DS-511』2025-09-30. https://www.digital.go.jp/assets/contents/node/basic_page/field_ref_resources/e2a06143-ed29-4f1d-9c31-0f06fca67afc/12cb1a6c/20250930_resources_standard_guideline_identityverification_01.pdf （参照箇所: §3.2 5) ア〜ウ、表3-11 p.34-35、確認日: 2026-10-03）
[^88]: デジタル庁『DS-511』2025-09-30. https://www.digital.go.jp/assets/contents/node/basic_page/field_ref_resources/e2a06143-ed29-4f1d-9c31-0f06fca67afc/12cb1a6c/20250930_resources_standard_guideline_identityverification_01.pdf （参照箇所: §3.3、表3-14、表3-15 p.36-40、確認日: 2026-10-03）
[^89]: デジタル庁『DS-511』2025-09-30. https://www.digital.go.jp/assets/contents/node/basic_page/field_ref_resources/e2a06143-ed29-4f1d-9c31-0f06fca67afc/12cb1a6c/20250930_resources_standard_guideline_identityverification_01.pdf （参照箇所: §3.1 4) p.22、§3.2 4) p.32、§4.1 3) 表4-4 と補足 p.44、確認日: 2026-10-03）
[^90]: デジタル庁『DS-512 行政手続等での本人確認におけるデジタルアイデンティティの取扱いに関するガイドライン 解説書』2026-02-24（Informative）. https://www.digital.go.jp/assets/contents/node/basic_page/field_ref_resources/e2a06143-ed29-4f1d-9c31-0f06fca67afc/c7edc43c/20260224_resources_standard_guideline_identityverification_1.pdf （参照箇所: 別紙2 1.1 3) パスキー ア〜ウ（イ c) と e) を含む）p.81-82、確認日: 2026-10-03）
[^91]: Microsoft Learn『Add your custom domain - Microsoft Entra』ms.date 2026-06-18. https://learn.microsoft.com/en-us/entra/fundamentals/add-custom-domain （参照箇所: Add your DNS information to the domain registrar、確認日: 2026-10-03）
[^92]: OpenID Foundation『OpenID Continuous Access Evaluation Profile 1.0』Final, 2025-08-29. https://openid.net/specs/openid-caep-1_0-final.html （参照箇所: 文書冒頭の Published、§3.1 Session Revoked、確認日: 2026-10-03。独立検証時に追加）
[^93]: OpenID Foundation『OpenID Shared Signals Framework Specification 1.0』Final, 2025-08-29. https://openid.net/specs/openid-sharedsignals-framework-1_0-final.html （参照箇所: 文書冒頭の Published、確認日: 2026-10-03。独立検証時に追加）
