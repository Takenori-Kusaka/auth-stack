# RS-13 不正・濫用対策（ATO・フィッシング・回復濫用・session 窃取・検知と通知）一次資料調査ノート

> 文書ID: RS-13 / 版: 0.2 / 状態: review / 最終更新: 2026-10-03
> 対応要求: R-030, R-031, R-032, R-041, R-042, R-045, R-112, R-114, R-163, R-166, R-167, R-168, R-188, R-195, R-012, R-135, R-010, R-024
> 依存文書: CONVENTIONS.md、traceability/seed/seed-01-ciso-assurance.md（R-ID の出典）、traceability/seed/seed-02-cto-technical.md（ADR 一覧 A01〜A19、§1-3・§10）、traceability/seed/seed-03-redteam-decision.md、research/RS-12-incident-casebook.md（事故の一次報告。重複部分は相互参照）、research/RS-04-oauth-oidc-profile.md（DPoP・token profile）

本ノートは AI エージェント（Claude）が原典（NIST CSRC/pages.nist.gov、RFC Editor、IETF Datatracker、OpenID Foundation、W3C、CISA・FBI・NCSC、金融庁・日本証券業協会・日本クレジット協会、EUR-Lex・欧州議会、eCFR、e-Gov 法令、MITRE ATT&CK、OWASP、各ベンダーの公式文書、当事者の事後報告）を取得して作成した。版 0.2 では、作成者とは別の AI エージェント（Claude）が 2026-10-03 に全脚注の原典照合を行い、部分支持の箇所を修正し、未確認だった保険会社向け監督指針・OpenID 仕様の承認状態・個人情報保護法の改正状況を原典で補った（記録: research/verification/RS-13-verification.md）。照合者も AI であり、人間のレビュアによる照合ではない。seed-01〜03 は問いの手掛かりとしてのみ使い、根拠には引いていない。

凡例（CONVENTIONS §3 の適用方法）:
- [N]: 規範要求と標準・法令の状態。IETF の MUST/SHOULD/MAY、NIST の SHALL/SHOULD/MAY は原文の大文字表記どおりに写した。法令・監督指針・自主規制ガイドラインは原文の日本語表現（「〜しなければならない」「求められる」等）を写した。OWASP Cheat Sheet・OAT Handbook・W3C Group Note は規範文書ではないため、[N] を付けたうえで「非規範」と明記し、原文が小文字の should/consider であることを書いた。
- [V]: ベンダー公式文書。MITRE ATT&CK の技術 ID・名称・記述は「ATT&CK という公開知識ベースの公式記載事実」として [V] を付け、版（v19.2）と確認日を書いた。手口が実在した根拠には ATT&CK を使わず、[I] の原典を引いた。
- [I]: 当事者の事後報告、政府報告・統計、CISA・FBI・NCSC の公的勧告。
- [M]: 公開された実測値。測定者・対象・条件を併記した。自前の実測（TC-ID）は本ノートにはない。
- [D]: 設計推論。根拠の RS-13#n を併記した。
- 前提台帳（01_governance/assumptions-register.md）が未作成のため [A-xxx] は付けていない。基準シナリオ（CONVENTIONS §7: 利用者 100 万人、B2B テナント約 1 万、約 300 サービス、日本・EU/英国・米国）に依存する推論は「前提: 基準シナリオ」と書いた。

---

## 1. 調査の問い

seed（seed-01 R-030〜R-045・R-112・R-114・R-166〜R-168、seed-02 §1-3・§10、seed-03 §5）由来の問い:

1. 利用者 100 万人規模の共通認証基盤に必要な不正対策の層構造（予防・検知・対応）は何か。
2. どの検知シグナルを、認証前・認証時・認証後のどの段階で使うか。
3. 誤検知と利便性のトレードオフは、どの公開値を目安にでき、自社では何を測れば決められるか。
4. 不正対策を AAL・step-up（R-030、R-045）とどう連携させるか。
5. 利用者本人と顧客企業（テナント）への通知を、何を契機に、どの経路で、どの期限で行うか（R-114）。
6. フィッシング耐性の要求範囲（R-031）はどこまでか。手入力 OTP・SMS・承認型 push を残す場合の条件は何か。
7. support・ヘルプデスク経由の回復（R-042）と AAL2 回復要件（R-032）を、ソーシャルエンジニアリングに対してどう守るか。
8. session theft と token replay（R-168、R-163）をどう防ぎ、どう検知するか。DBSC は採用判断できる状態か。

本ストリームで追加した問い:

9. 法域・業界規制（日本の金融庁監督指針・日本証券業協会ガイドライン・クレジットカード・セキュリティガイドライン、EU の PSD2 RTS、米国の FFIEC ガイダンス等）の数値要件は、どこで互いに食い違うか。
10. device code フロー、OAuth の同意画面、第三者アプリ経由の濫用（MFA を通過した後の経路）をどう扱うか。
11. MITRE ATT&CK の現行版で、該当技術の ID・名称に改廃はあるか。
12. 検知の多くが事後（offline）判定である場合、対応（失効・通知）はどこまで速く届く必要があるか。
13. 不正検知に AI/ML や第三者ベンダーを使う場合、どの開示とプライバシー評価が要るか。
14. 標準・規制の状態（draft／final／未施行／遵守日未設定）は、設計判断の確度にどう影響するか。
15. SIM swap について、通信事業者側の規制にどこまで依存できるか。

---

## 2. 結論サマリ（設計への含意）

1. 予防層の中核は、フィッシング耐性認証（WebAuthn/passkey、PKI）にする必要がある [D]（RS-13#2〜#6、#23 から導出）[^1][^6]。63B-4 は手入力型の OTP と out-of-band をフィッシング耐性とみなすことを SHALL NOT とし、AAL2 でもフィッシング耐性の選択肢の提供を SHALL としている [N][^1]。CISA は、広く使えるフィッシング耐性方式は FIDO/WebAuthn だけであり、SMS・音声は最後の手段だとしている [I][^6]。金融庁の金融商品取引業者等向け監督指針（主な着眼点として「〜を講じているか」の形）と日本証券業協会ガイドライン（「スタンダード」）は、ログイン・出金・出金先口座変更時のフィッシング耐性 MFA の実装と必須化（既定設定）を挙げている [N][^17][^18]。2026-07-17 適用の保険会社向け監督指針の改正でも、インターネット取引の着眼点として同旨の項目が新設された [N][^83][^84]。基盤は全テナントにフィッシング耐性方式を既定で提供し、弱い方式はテナントが明示的に許可したときだけ使える例外にすべきである [D]（RS-13#2〜#6、#33、#35 から導出）[^1][^17][^18]。

2. 弱い方式を fallback として残すと、攻撃者はその経路を使いうる [D]（RS-13#6、#25 から導出）[^1][^8]。CISA は、authenticator app を登録しても SMS は自動では無効にならず、悪用可能な弱い fallback になると注意している [I][^8]。63B-4 は PSTN（SMS・音声）を restricted authenticator とし、制限のない代替方式の提供、リスクの通知、移行計画を CSP に SHALL として課している [N][^1]。認証の強さは、その主体に残っている最も弱い経路（回復経路を含む）で評価し、AAL の判定にも反映すべきである [D]（RS-13#6、#12、#25 から導出）[^1][^8]。

3. 回復とヘルプデスクは、MFA を迂回する主要経路として独立に統制する必要がある [D]（RS-13#18、#26、#28、#31 から導出）[^1][^9]。63B-4 は回復手続を多くの認証機構の弱点と述べ、人手による回復にはソーシャルエンジニアリングのリスクがあるとしている（informative 節）[N][^1]。CISA・FBI 等の共同勧告 AA23-320A は、攻撃者が従業員を装ってヘルプデスクにパスワードと MFA を再設定させた手口を記している [I][^9]。63B-4 は AAL2 の回復手段を限定し（SHALL）、回復のたびに通知することを SHALL としている [N][^1]。オペレータが介在する回復は 63B-4 §4.2.1 上「リスク分析に基づき文書化する」アプリ固有の方式（MAY）にあたる [D]（RS-13#11 から導出）[^1]。ただし AAL2 まで認証できるアカウントの回復には §4.2.2.2 が三択のいずれかを SHALL としており、オペレータ介在の方式がこの三択に代わりうるかは原文から明確でない [D]（RS-13#11、#12 から導出）。そのためオペレータ介在の回復は三択の手続を補助する経路として扱い、二者承認・事前登録番号へのコールバック・待機時間・特権者の追加審査を設計し、ソーシャルエンジニアリング演習で検証すべきである [D]（RS-13#11、#12、#26、#28、#31 から導出）[^1][^11][^14]。

4. MFA を通過した後の窃取（AiTM による session cookie の窃取、infostealer、device code の悪用、悪性 OAuth アプリへの同意）は、ログイン時の認証を強くするだけでは防げない [D]（RS-13#27、#47、#48、#50 から導出）[^10][^35]。ATT&CK は、Evilginx2 等の中間者プロキシによる cookie 窃取と、窃取した cookie による MFA の迂回を記載している [V][^35][^36]。FBI は device code を悪用して MFA を迂回し OAuth token を盗む PhaaS を警告し、device code フローの遮断を推奨した [I][^12]。RFC 10027（BCP 247）は、device authorization grant を他の方式が使えない場合に限って使い、機微・高価値の資源には使わないよう求めている [N][^51]。基盤は device code を既定で無効にし、第三者アプリへの利用者同意を既定で制限し、session と token を端末に束縛する仕組み（DBSC、DPoP/mTLS）を段階的に導入する必要がある [D]（RS-13#47、#48、#56〜#61、#63〜#67 から導出）[^12][^51][^64]。

5. session の端末束縛は標準化の途中であり、単独の統制として依存できない [D]（RS-13#63〜#65 から導出）[^58][^59]。DBSC の W3C 公表版は 2025-08-21 の First Public Working Draft だけで、Editor's Draft の最新は 2026-09-08 版である [N][^58][^59]。Google は Chrome の Windows 版で DBSC を提供済みと公表したが、対応版を Chrome 145 とする告知と Chrome 146 とする告知が併存している [V][^60][^61]。仕様自身が、端末にマルウェアが常駐している間と、session 登録時に攻撃者が介在した場合は防げないと明記している [N][^59]。DBSC は対応ブラウザで有効化する追加の層と位置づけ、短い session 寿命、再認証、異常検知、即時失効と組み合わせる必要がある [D]（RS-13#16、#63〜#67 から導出）[^1][^59]。

6. 検知は「認証前（自動化攻撃）」「認証時（リスク評価）」「認証後（session 監視、管理操作、データアクセス）」の三段で設計し、事後判定が多いことを前提に対応経路を持つ必要がある [D]（RS-13#8、#17、#51、#69 から導出）[^1][^66]。Microsoft Entra ID Protection の公式文書では、AiTM と漏えい資格情報の検知は offline（事後）判定に分類されている [V][^66]。63B-4 は、session 監視で不正の可能性を検知したら再認証・session 終了・担当者への通知を行うことを SHOULD としている [N][^1]。検知から全 session と refresh token の失効、下流サービスへの通知（CAEP/RISC）までの時間を数値契約で定める必要がある [D]（RS-13#17、#69、#70 から導出）[^56][^57]。

7. ロックアウト閾値と無操作タイムアウトは法域・業界ごとに値が違い、単一の既定値では満たせない [D]（RS-13#8、#15、#39 から導出）[^1][^22]。63B-4 は認証器ごとの連続失敗を 100 回以下に制限することを SHALL としている [N][^1]。EU の PSD2 RTS は、連続失敗を 5 回以下、支払口座へのオンラインアクセスの無操作時間を 5 分以下と定めている [N][^22]。一方、ATT&CK は厳しすぎるロックアウトがサービス妨害を招くと記載し [V][^32]、ASVS 5.0 は悪意あるロックアウトの防止策を文書化するよう求めている [N][^48]。閾値はテナント・規制プロファイル単位で設定可能にし、既定はハードなロックアウトより段階的なスロットリングとリスクに応じた追加認証を優先すべきである [D]（RS-13#8、#39、#46、#54 から導出）[^1][^22][^32]。

8. 誤検知と利便性の関係は公開実測値で目安を得られるが、自社の閾値は PoC で測る必要がある [D]（RS-13#74〜#76 から導出）[^72][^74]。Wiefling らは、330 万人・3,130 万回のログインデータで、RBA（リスクベース認証）が模擬した攻撃の 99% 超を拒否しつつ、再認証要求はまれだったと報告した [M][^74]。Google は 2019 年に、不審なログインに対するチャレンジが、SMS コードで自動化ボットの 100%・大量フィッシングの 96%・標的型攻撃の 76% を、端末上のプロンプトでそれぞれ 100%・99%・90% を防いだと報告した [M][^72]。これらは測定条件が異なり、AiTM や session 窃取を対象にしていないため、閾値の根拠ではなく PoC の比較基準にとどめるべきである [D]（RS-13#74〜#76 から導出）[^72][^73][^74]。

9. step-up は「操作ごとに必要な AAL と認証の鮮度」を検証できる形で実装する必要がある [D]（RS-13#10、#16、#73 から導出）[^1][^53]。63B-4 は、session を認証事象より高い AAL で扱うことを SHALL NOT とし、新しい認証器の登録時に既存の最高 AAL（または新認証器の AAL の低いほう）での認証を SHALL としている [N][^1]。RFC 9470 は、resource server が insufficient_user_authentication と acr_values・max_age で step-up を要求する方式を定めている [N][^53]。ASVS 5.0 は、IdP が返す acr/amr/auth_time を検証し、情報がなければ最も弱い方式が使われたと仮定する文書化済みの代替手順を求めている [N][^48]。操作階層表（ADR-002）と RFC 9470 の challenge を対応づけ、認証要素の追加・回復情報の変更・管理操作は常に step-up の対象にすべきである [D]（RS-13#10、#16、#54、#55、#73 から導出）[^1][^48][^49][^53]。

10. 通知は「利用者本人への独立経路」と「顧客企業への機械可読な信号」の二系統で設計する必要がある [D]（RS-13#13、#22、#70 から導出）[^1][^5]。63B-4 は、認証器の追加時と回復時に、その操作とは独立した経路で、登録された通知先（原則として郵便を除く全通知先）へ通知することを SHALL としている [N][^1]。63C-4 は、shared signaling を使う場合はその事象・情報・期待処理を信頼合意に文書化することを SHALL とし、IdP が RP へ侵害の疑い等の信号を送ることを SHOULD としている [N][^5]。OpenID SSF/CAEP/RISC 1.0 は、session 失効、資格情報の侵害、回復の発動などのイベント型を定めている [N][^55][^56][^57]。個人データの漏えいに至った場合、GDPR は処理者から管理者への遅滞ない通知を求め、個人情報保護法は委託先が委託元へ通知すれば委託先の報告義務を免除している [N][^24][^76]。顧客企業への通知は、SSF の stream、監査 API、契約上の通知（判断基準と期限）の三つを組み合わせ、R-114 の決裁事項として起案すべきである [D]（RS-13#10、#13、#22、#41、#42、#70 から導出）[^5][^24][^55][^76]。

11. 不正対策は一度作って終わる機能ではなく、継続評価の運用として定義する必要がある [D]（RS-13#19、#33、#35 から導出）[^3][^17]。SP 800-63-4 は、脅威と不正手口の監視、不正検知能力の定期的な有効性評価、指標に基づく継続改善プログラムを SHALL としている [N][^3]。金融庁監督指針は不正防止策の利用者への普及状況の定期的なモニタリングを着眼点に挙げ、日本証券業協会ガイドラインは不正防止設定の利用状況の確認と経営層への定期報告をスタンダードとしている [N][^17][^18]。SP 800-63-4 は、AI/ML を使う場合に依拠する組織（RP）への開示と、訓練データ・テスト結果等の情報提供を SHALL としている [N][^3]。確定・疑い・申告ベースの不正率、回復試行数、フィッシング耐性方式の登録率と解除率を KRI（DL-06）に入れるべきである [D]（RS-13#19、#20、#33〜#35 から導出）[^3][^17][^18]。

12. 規範と攻撃分類は版が頻繁に変わるため、版と確認日を付けて追跡する必要がある [D]（RS-13#32、#40、#43、#63、#65 から導出）[^23][^27]。MITRE ATT&CK の現行版は v19.2 であり、T1656 Impersonation は v19 で Social Engineering: Impersonation（T1684.001）に置き換えられた [V][^26][^27]。EU の PSR は 2025-11-27 に暫定合意されたが、2026-09-20 更新の欧州議会のページでは正式採択前とされている [N][^23]。米国の SIM 変更に関する FCC 規則は、eCFR（2026-10-01 時点の版）上で遵守日が設定されていない [N][^15]。検知カバレッジ表と規制プロファイルは、標準ステータス台帳（DL-84）と同じ周期で版を再確認する運用に載せるべきである [D]（RS-13#32、#40、#43 から導出）[^15][^23][^26]。

---

## 3. 調査結果

凡例:
- 引用（> の行）は原典の原文（英語または日本語）
- NIST SP 800-63-4 系の節番号は、HTML 版の見出し順と文書内の相互参照（例: 63A-4 の「Sec. 3.5.2 of SP 800-63」）で特定（PDF 版との照合は §6）

### 3.1 NIST SP 800-63-4 系（AAL、フィッシング耐性、回復、通知、session）

**RS-13#1** SP 800-63B-4 は 2025-07 に公表された最終版で、旧 SP 800-63B を置き換える [N][^2]。CSRC の履歴欄は「07/31/25: SP 800-63B-4 (Final)」と記載している [N][^2]。63-4・63A-4・63C-4 も、CSRC 上でそれぞれ「07/31/25: (Final)」と記載されている [N][^77][^78][^79]。
> "This publication supersedes NIST Special Publication (SP) 800-63B."

**RS-13#2** AAL2 では、verifier はフィッシング耐性のある認証の選択肢を少なくとも一つ提供しなければならない（SHALL、§2.2.2）[N][^1]。連邦機関は職員・契約者・パートナーにフィッシング耐性認証を要求しなければならず（SHALL）、すべての場合で verifier はフィッシング耐性認証の利用を奨励すべきである（SHOULD）[N][^1]。
> "Verifiers SHALL offer at least one phishing-resistant authentication option at AAL2, as described in Sec. 3.2.5."

**RS-13#3** AAL3 の認証器は、エクスポート不可の秘密鍵を持ち、フィッシング耐性を提供しなければならない（SHALL、§2.3.2）[N][^1]。syncable authenticator（同期型 passkey 等）は鍵がエクスポート可能なため、AAL3 で使ってはならない（SHALL NOT）[N][^1]。AAL2 で syncable authenticator を使う場合、verifier は UV（User Verified）を preferred と指示し、応答の UV フラグを検査しなければならない（SHALL、App. B）[N][^1]。Backup State フラグによる受入可否の判断は、一般向けアプリでは行うべきでない（SHOULD NOT）[N][^1]。
> "Since syncable authenticators (described in Appendix B) require the private key to be exportable, syncable authenticators SHALL NOT be used at AAL3."

**RS-13#4** 63B-4 はフィッシング耐性を「利用者の注意力に頼らずに、偽の verifier への認証秘密と有効な認証器出力の開示を防ぐ能力」と定義している（§3.2.5）[N][^1]。認証器出力を手入力する方式（out-of-band、OTP）はフィッシング耐性とみなしてはならない（SHALL NOT）[N][^1]。認められる方式は channel binding と verifier name binding の二つで、WebAuthn は verifier name binding の例とされている [N][^1]。
> "Authenticators that involve the manual entry of an authenticator output (e.g., out-of-band and OTP authenticators) SHALL NOT be considered phishing-resistant because the manual entry does not bind the authenticator output to the specific session being authenticated."

**RS-13#5** out-of-band 認証（push を含む）はフィッシング耐性がない（§3.1.3）[N][^1]。二つの経路の秘密を比べて承認だけさせる方式は「authentication fatigue」攻撃で承認されやすいため、もはや受け入れられないとされ、候補の一覧から選ばせる方式も不十分とされている [N][^1]。承認を二次経路で求める場合、一次経路の秘密を二次経路へ転記させなければならない（SHALL、§3.1.3.1）[N][^1]。push を送る verifier は、最後の成功認証以降の送信回数または送信率に妥当な上限を設けるべきである（SHOULD、§3.1.3.2）[N][^1]。out-of-band 認証は 10 分以内に完了しなければ無効としなければならず、新しい秘密を生成しても失敗回数をリセットしてはならない（SHALL / SHALL NOT）[N][^1]。
> "This method is no longer considered acceptable because it increases the likelihood that the subscriber would approve an authentication request without actually comparing the secrets as required."

**RS-13#6** PSTN（SMS・音声）による out-of-band は restricted authenticator である（§3.1.3.3、§3.2.9）[N][^1]。登録電話番号の設定・変更は新しい認証器の binding とみなされ、§4.1.2 の手順でのみ行わなければならない（SHALL）[N][^1]。verifier は、PSTN で秘密を送る前に、端末の交換・SIM 変更・番号ポータビリティ等のリスク指標を考慮すべきである（SHOULD）[N][^1]。restricted authenticator を受け入れる CSP は、制限のない代替認証器の提供、リスクと代替手段の通知、将来受け入れられなくなる場合の移行計画を行わなければならず（SHALL）、RP がリスクを受容できないと判断した場合は使ってはならない（SHALL NOT）[N][^1]。
> "Verifiers SHOULD consider risk indicators (e.g., device swap, SIM change, number porting, other abnormal behavior) before using the PSTN to deliver an out-of-band authentication secret."

**RS-13#7** 電子メールを out-of-band 認証に使ってはならない（SHALL NOT、§3.1.3.1）[N][^1]。メールアドレス確認用の確認コードと回復コードは認証ではないため、この禁止の対象外とされている [N][^1]。

**RS-13#8** 連続した認証失敗は、認証器ごと・アカウントごとに 100 回以下に制限し、超えたら当該認証器を無効化しなければならない（SHALL、§3.2.2）[N][^1]。100 回は上限であり、より低い値にしてよい（MAY）[N][^1]。正規利用者が締め出されないように、ボット検知チャレンジ、失敗回数に応じて伸びる待ち時間（例: 30 秒から 1 時間）、IP アドレス・位置・要求のタイミング・ブラウザのメタデータを使うリスクベース／アダプティブ認証を併用してよい（MAY）[N][^1]。
> "the verifier SHALL limit consecutive failed authentication attempts using a specific authenticator on a single subscriber account to no more than 100 by disabling that authenticator."

**RS-13#9** パスワードの設定・変更時には、過去の漏えいコーパス等を含むブロックリストと照合しなければならない（SHALL、§3.1.1.2）[N][^1]。定期的なパスワード変更を要求してはならない（SHALL NOT）が、侵害の証拠がある場合は変更を強制しなければならない（SHALL）[N][^1]。パスワードマネージャと自動入力の利用を許可しなければならない（SHALL）[N][^1]。
> "Verifiers and CSPs SHALL NOT require subscribers to change passwords periodically. However, verifiers SHALL force a change if there is evidence that the authenticator has been compromised."

**RS-13#10** 認証器を追加で binding するときは、そのアカウントで現在使える最高の AAL と新しい認証器を使う AAL のうち低いほうで認証させなければならない（SHALL、§4.1.2.1）[N][^1]。認証器を追加したときは、その操作とは独立した仕組みで利用者に通知しなければならない（SHALL）[N][^1]。CSP は認証器のライフサイクル事象の日時を記録しなければならず（SHALL）、binding 元の IP アドレスや端末識別子を記録すべきである（SHOULD、§4.1）[N][^1]。
> "When an authenticator is added, the CSP SHALL notify the subscriber via a mechanism independent of the transaction binding the new authenticator, as described in Sec. 4.6."

**RS-13#11** 回復手段は、保存型回復コード、発行型回復コード、回復連絡先、本人確認のやり直しの 4 類型である（§4.2.1）[N][^1]。CSP は 1 つ以上を提供しなければならず（SHALL）、アプリ固有の方式（例: CSP の担当者とのやり取り）も使ってよい（MAY）が、その場合はリスク分析に基づき文書化しなければならない（SHALL）[N][^1]。ただし AAL2 まで認証できるアカウントの回復には §4.2.2.2 の三択（RS-13#12）が SHALL とされており、アプリ固有の方式が三択に代わりうるかは原文に明記がない [D]（RS-13#11、#12 から導出）。保存型回復コードは 64 ビット以上の乱数を含まなければならない（SHALL）[N][^1]。発行型回復コードの有効期間は、SMS・音声で最大 10 分、電子メールで最大 24 時間でなければならない（SHALL）[N][^1]。
> "The use of alternative methods SHALL be based on a risk analysis and documented by the CSP."

**RS-13#12** AAL2 まで認証できるアカウントの回復では、(a) 異なる方法で得た回復コード二つ、(b) 回復コード一つと、アカウントに紐づく単一要素認証器での認証、(c) 本人確認のやり直し、のいずれかを要求しなければならない（SHALL、§4.2.2.2）[N][^1]。回復は必ず利用者または代理人への通知を発生させなければならない（SHALL、§4.2.3）[N][^1]。
> "In all cases, account recovery SHALL cause a notification to be sent to the subscriber or their designee, as described in Sec. 4.6."

**RS-13#13** CSP はアカウントごとに通知先を 2 つ以上サポートし、通知が必要な事象では郵便を除く全通知先へ通知しなければならない（SHALL、§4.6）[N][^1]。通知には、受信者が事象を否認する場合の連絡先を含む明確な指示を記載しなければならない（SHALL）[N][^1]。
> "The notification SHALL provide clear instructions, including contact information, in case the recipient repudiates the event associated with the notification."

**RS-13#14** 侵害された認証器は、侵害の検知後速やかに停止・無効化・破棄しなければならない（SHALL、§4.3）[N][^1]。組織はその処理の期限を定めるべきである（SHOULD）[N][^1]。利用者からの無効化依頼は、リスクに基づいて真正性を判断しなければならない（SHALL、§4.5）[N][^1]。
> "The consequences of not invalidating a compromised authenticator are usually more significant than the denial-of-service potential of invalidating one in error."

**RS-13#15** AAL2 の再認証は、全体のタイムアウトを定めなければならず（SHALL）その値は 24 時間以下にすべきであり（SHOULD）、無操作タイムアウトは 1 時間以下にすべきである（SHOULD、§2.2.3）[N][^1]。AAL3 の全体タイムアウトは 12 時間以下でなければならず（SHALL）、無操作タイムアウトは 15 分以下にすべきである（SHOULD、§2.3.3）[N][^1]。

**RS-13#16** session は、それを作った認証事象より高い AAL として扱ってはならない（SHALL NOT、§5.1）[N][^1]。bearer として使う session 秘密は永続化すべきでない（SHOULD NOT）[N][^1]。63B-4 は DBSC を「新しく出てきた仕様」として名指しし、所持証明で使う session 秘密は永続化してよい（MAY）が、その場合も session 寿命の上限を強制しなければならない（SHALL）としている [N][^1]。session 用 cookie は HTTPS 限定かつ最小限のホスト名・パスに限定しなければならず（SHALL）、HttpOnly、`__Host-` 接頭辞、SameSite=Lax/Strict にすべきである（SHOULD、§5.1.1）[N][^1]。RP は access token の存在を利用者の在席の指標と解釈してはならない（SHALL NOT、§5.1.2）[N][^1]。
> "Some technologies (e.g., the emerging device bound session credentials specification [DBSC]) mitigate the risk of theft of session secrets by using cryptographic protocols that prove the possession of a session secret rather than using them as bearer tokens."

**RS-13#17** session 監視（continuous authentication）は任意（MAY）であり、評価してよい特性として、利用パターン・速度・タイミング、行動バイオメトリクス、端末とブラウザの特性、位置、IP アドレスの特性（悪用の多いアドレス帯か等）が挙げられている（§5.3）[N][^1]。不正の可能性を検知した RP は、CSP/IdP と連携して再認証・session 終了・担当者への通知を行うべきである（SHOULD）[N][^1]。これらの特性の収集と処理は、プライバシーリスク評価に含めなければならない（SHALL）[N][^1]。
> "When potential fraud is detected during a session, the RP SHOULD act in conjunction with the CSP, IdP, or verifier to reauthenticate, terminate the session, or notify appropriate support personnel."

**RS-13#18** 63B-4 の脅威の節（§6、informative）は、ソーシャルエンジニアリングへの対策として「顧客サービス担当者などの第三者にソーシャルエンジニアリングのリスクを生じる認証器を避ける」ことを、authentication fatigue への対策として「承認ではなく秘密の転記を要求する」ことを挙げている（Table 4）[N][^1]。同節は、人手による回復にはソーシャルエンジニアリングのリスクがあり、ある要素を使って別の要素の認証器を入手できてはならないと述べている（§6.3）[N][^1]。
> "To the extent that authenticator recovery is human-assisted, social engineering attacks also pose risks."

**RS-13#19** SP 800-63-4 は、組織に継続的な評価・改善プログラムの実施と文書化を SHALL としている（§3.5）[N][^3]。組織は脅威の状況を監視して最新の不正手口を把握し、現行の対策と不正検知能力の有効性を定期的に評価しなければならない（SHALL）[N][^3]。評価の入力には、不正の傾向・調査結果・指標とヘルプデスク統計を含めなければならない（SHALL、§3.5.1）[N][^3]。推奨指標（SHOULD、§3.5.2 Table 4）には、認証失敗率、回復試行数、確定・疑い・申告ベースの不正アクセス率、認証方式別の不正件数、ヘルプデスク呼量が含まれている [N][^3]。
> "Organizations SHALL regularly assess the effectiveness of current security measures and fraud detection capabilities against the latest threats and fraud tactics."

**RS-13#20** 組織は、セキュリティと不正防止を担う社内の関係者間で情報を交換する仕組みを設けなければならず（SHALL）、外部の関係者とも同様の仕組みを設けるべきである（SHOULD、§3.7）[N][^3]。AI/ML を使う場合、その利用を文書化して依拠する組織へ伝え、IdP・verifier 等が AI/ML を使うときは判断に依拠する全 RP に開示しなければならない（SHALL、§3.8）[N][^3]。訓練の方法、データセットの説明、モデル更新頻度、全テスト結果の提供も SHALL とされている [N][^3]。
> "The use of integrated technologies that leverage AI/ML by CSPs, IdPs, or verifiers SHALL be disclosed to all RPs that make access decisions based on information from these systems."

**RS-13#21** 63A-4 は、CSP に不正の識別・検知・調査・報告・解決の能力を持つ不正管理プログラムを SHALL としている（§3.2.1、本人確認の文脈）[N][^4]。CSP は、疑い・確定の不正事象を RP に伝える技術的または手続的な仕組みを設けなければならない（SHALL）[N][^4]。推奨される不正チェック（SHOULD）には、SIM swap 検知、端末・アカウントの保有期間確認、デバイスフィンガープリント、取引分析（IP アドレス・位置・速度）が含まれている [N][^4]。RP は CSP の不正管理プログラムと閾値を定期的にレビューしなければならない（SHALL、§3.2.2）[N][^4]。
> "CSPs SHALL establish a technical or process-based mechanism to communicate suspected and confirmed fraudulent events to RPs."

**RS-13#22** shared signaling の利用は信頼合意に文書化し、信号を送る事象・含める情報・受信側の期待処理を記載しなければならない（SHALL、63C-4 §4.8）[N][^5]。信号には、対象アカウントの識別に必要な範囲を超える個人情報を含めてはならない（SHALL NOT）[N][^5]。IdP は、アカウントの停止、侵害の疑い、認証器の更新等を RP に送るべきである（SHOULD）[N][^5]。侵害の疑いの信号を受けた IdP は自らの側の行動を調べなければならず、不審な活動を確認したら、その期間に当該アカウントが使われた他の RP にも信号を送らなければならない（SHALL）[N][^5]。また IdP は、要求が満たされなかった場合も含め、結果の xAL を assertion に必ず示さなければならない（SHALL、§2.5）[N][^5]。
> "If suspicious activity is confirmed at the IdP, the IdP SHALL signal any additional RPs that the subscriber account was used for during the suspected time frame."

### 3.2 公的勧告と米国の規範（CISA・FBI・NCSC・OMB・FFIEC・FCC）

**RS-13#23** CISA の「Implementing Phishing-Resistant MFA」（2022-10）は、MFA への脅威としてフィッシング、push bombing、SS7 の脆弱性悪用、SIM swap を挙げている [I][^6]。同文書は MFA を強い順に、フィッシング耐性 MFA（FIDO/WebAuthn、PKI）、app ベース（OTP、number matching 付き push）、number matching なし push、SMS・音声と並べ、SMS・音声は最後の手段とした [I][^6]。
> "The only widely available phishing-resistant authentication is FIDO/WebAuthn authentication."

**RS-13#24** CISA の「Implementing Number Matching in MFA Applications」（2022-10）は、number matching をフィッシング耐性 MFA ほど強くはないが、すぐに移行できない組織の最良の暫定策の一つとしている [I][^7]。CISA の説明する number matching は、ログイン画面の数字を利用者がアプリへ入力するもので、ログイン画面を見られない者は承認できない [I][^7]。この方式は、一次経路の秘密を二次経路へ転記させる 63B-4 §3.1.3.1 の要求と整合し、候補一覧から選ばせる方式とは異なる [D]（RS-13#5、#24 から導出）。
> "Although number matching is not as strong as phishing-resistant MFA, it is one of the best interim mitigation for organizations who may not immediately be able to implement phishing-resistant MFA."

**RS-13#25** CISA の「Mobile Communications Best Practice Guidance」（2024-12-18 時点）は、主に「高度に標的とされる個人」向けに、SMS を第二要素に使わないよう勧告している [I][^8]。同文書は、authenticator ベースの MFA を登録しても SMS は自動では解除されず、悪用可能な弱い fallback になると注意し、番号ポータビリティを防ぐための通信事業者 PIN の設定を勧めている [I][^8]。
> "Enrollment in authenticator-based MFA does not automatically unenroll the account's SMS. This can create a weak, exploitable fallback mechanism that can be exploited by threat actors."

**RS-13#26** CISA・FBI 等の共同勧告 AA23-320A（2023-11-16 初版、2025-07-29 改訂）は、Scattered Spider が次の手口を使ったと記している [I][^9]。従業員を装ってヘルプデスクにパスワードを再設定させ MFA を攻撃者の端末へ移させる、複数回の電話で再設定手順を探る、push bombing（T1621）、SIM swap、侵害後に自分の MFA トークンを登録する（T1556.006）、過去には SSO テナントへ federated IdP を追加し自動のアカウント連結を有効化した（T1484.002）[I][^9]。緩和策として FIDO/WebAuthn または PKI ベースの MFA を挙げ、2025 年改訂で「risky logins」の監視強化を追加した [I][^9]（事故としての詳細: RS-12#48〜#51）。なお、下の 1 つ目の引用は Overview で "According to public reporting, Scattered Spider threat actors have:" として列挙された項目（出典は民間の公開報告）である [I][^9]。2025-07-29 改訂の Technical Details は、IT ヘルプデスク担当者を電話で騙してパスワード再設定と MFA トークンの移転をさせる手口を、勧告自身の記述として述べている（2 つ目の引用）[I][^9]。
> "Posed as employees to convince IT and/or helpdesk staff to provide sensitive information, reset the employee's password, and transfer the employee's MFA to a device they control on separate devices."
> "Finally, the threat actors conduct spearphising calls to convince IT help desk personnel to reset passwords and/or transfer MFA tokens [T1078.002] [T1199] [T1566.004]."

**RS-13#27** CISA 等の共同勧告 AA23-341A（2023-12-07）は、Star Blizzard がオープンソースの EvilGinx を使って資格情報と session cookie を収集し、二要素認証を迂回したと記している [I][^10]。これは AiTM（中間者型）フィッシングが政府勧告で確認された例である [I][^10]。
> "Star Blizzard uses the open-source framework EvilGinx in their spearphishing activity, which allows them to harvest credentials and session cookies to successfully bypass the use of two-factor authentication [T1539], [T1550.004]."

**RS-13#28** 英国 NCSC のブログ（2025-05-04）は、小売業者の事案を受けて、多要素認証の網羅的な展開、管理者アカウントへの注意、ヘルプデスクのパスワード再設定手順（特に特権者の本人確認方法）の見直し、住宅用 IP の VPN など通常と異なる送信元からのログインの検知を推奨した [I][^11]。
> "review helpdesk password reset processes, including how the helpdesk authenticates staff members credentials before resetting passwords, especially those with escalated privileges"

**RS-13#29** FBI の PSA（I-052126-PSA、2026-05-21）は、2026 年 4 月に初めて確認された PhaaS「Kali365」が、利用者に正規の Microsoft 確認ページで device code を入力させ、攻撃者の端末に access token と refresh token を発行させると警告した [I][^12]。攻撃者はその後パスワードや追加の MFA なしにメール・Teams・OneDrive にアクセスできる [I][^12]。FBI は、device code フローの全利用者への遮断（業務上必要な例外のみ）、既存利用の監査、認証の端末間転送の遮断を推奨した [I][^12]。
> "Create a conditional access policy to block device code flow for all users, with limited exceptions for required business processes."

**RS-13#30** OMB M-22-09（2022-01-26）は、米国連邦機関の職員・契約者・パートナーにフィッシング耐性方式を要求し、SMS・音声・OTP・push を使う方式のサポート終了を求めた [N][^13]。一般向けシステムについては、フィッシング耐性方式だけに頼れない利用者がいることを認めたうえで、発出から 1 年以内にフィッシング耐性方式を選択肢として提供するよう求めた（現行性は未確認、§6）[N][^13]。
> "public-facing agency systems that support MFA must give users the option of using phishing-resistant authentication within one year of the issuance of this guidance."

**RS-13#31** FFIEC の「Authentication and Access to Financial Institution Services and Systems」（2021-08-11、Federal Reserve SR 21-14 の添付で確認）は、予防・検知・是正の統制を重ねる layered security を示し、リスク評価で単一要素認証では不十分とされる場合（高リスクの取引・利用者など）には、MFA または同等の強度の統制がリスクをより効果的に低減するとしている（Section 4、5）[N][^14]。Section 8 は、脅威主体がコールセンターと IT ヘルプデスクを騙して資格情報を再設定させてきたと述べている [N][^14]。付録は、資格情報再設定時の強化認証（事前登録端末への OTP、事前登録番号へのコールバック、ビデオでの確認等）、利用者単位と IP 単位のログイン試行のレート制限、行動や取引速度・ロックアウト件数の変化を見る不正・異常検知、顧客が設定する取引アラート、法人顧客の管理者向け追加統制と二者承認を例示している [N][^14]。
> "Threat actors frequently have used social engineering and other techniques to deceive customer call center and IT help desk representatives into resetting passwords and other credentials"

**RS-13#32** 米国の 47 CFR 64.2010(h) は、携帯通信事業者に、SIM 変更要求の実行前に、容易に入手できる個人情報に依拠しない安全な方法で顧客を認証することと、不正な SIM 変更に関する従業員教育を求めている [N][^15]。ただし eCFR（2026-10-01 時点の版。§64.2010 の最終改正は 89 FR 47870, 2024-06-04）では、同項 (9) が「遵守日が定められるまで遵守を要しない」としている [N][^15]。
> "Compliance with this paragraph (h) will not be required until this paragraph is removed or contains a compliance date."

### 3.3 日本・EU の規制と業界ガイドライン

**RS-13#33** 金融庁は「金融商品取引業者等向けの総合的な監督指針」を改正し、2025-10-15 から適用した [N][^16]。改正後のⅢ－２－８－２－２（２）は、ログイン・出金・出金先銀行口座の変更など重要な操作時のフィッシング耐性 MFA（例: パスキー、PKI ベースの認証）の実装と必須化（既定設定）を挙げている [N][^17]。監督指針は法令ではなく、これらは主な着眼点として「以下の不正防止策を講じているか」の形で書かれている（（注２）の暫定対応は「必要がある」）[N][^17]。同項は、顧客が機器を持たない等でやむを得ず解除する場合の代替 MFA の提供と解除率のフォロー、必須化までの間の振る舞い検知・ログイン通知の強化、不正なログイン・取引・出金・出金先変更の顧客への通知、連続失敗時のアカウントロック、ログイン時の振る舞い検知と事後検証用の記録保存、評価に応じた追加認証と遮断を列挙している [N][^17]。
> 「ログイン、出金、出金先銀行口座の変更など、重要な操作時におけるフィッシングに耐性のある多要素認証（例：パスキーによる認証、ＰＫＩ（公開鍵基盤）をベースとした認証）の実装及び必須化（デフォルトとして設定）」

**RS-13#33a**（版 0.2 で追加）金融庁は「保険会社向けの総合的な監督指針」等を、サイバーリスクへの対応強化のために改正し、2026-07-17 から適用した [N][^83]。同日の改正対象には、少額短期保険業者・貸金業者・金融サービス仲介業者・電子決済等代行業者・前払式支払手段発行者・資金移動業者向けの監督指針・事務ガイドラインも含まれる（別紙 2〜10）[N][^83]。保険会社向け監督指針には「Ⅱ－３－１３－２－２ インターネット取引」が新設され、ログイン・出金・振込先金融機関口座（出金先口座）の指定・変更等の重要な操作時のフィッシング耐性 MFA の実装と必須化（既定設定）、解除時の代替 MFA と解除率のフォロー、身に覚えのないログイン・取引・出金・保険金受取人の変更等の通知、連続失敗時のアカウント・ロックの実装と必須化、ログイン時の振る舞い検知と記録保存、評価に応じた追加認証と遮断が着眼点として挙げられている [N][^84]。別紙 3〜10 の各業態向けの内容は本ノートでは読んでいない（§6）。
> 「ログイン、出金、振込先金融機関口座（出金先口座）の指定・変更等の手続きなど、重要な操作時におけるフィッシングに耐性のある多要素認証（例：パスキーによる認証、PKI（公開鍵基盤）をベースとした認証）の実装及び必須化（デフォルトとして設定）」

**RS-13#34** 同監督指針の（３）顧客対応は、顧客自身が早期に被害を認識できる手段、届出の受付体制、被害を受けるおそれのある顧客が特定できる場合の迅速な連絡、不正防止策の普及状況の定期的なモニタリング、不正取引の記録保存を求めている [N][^17]。同（２）は、メールや SMS にパスワード入力ページの URL やログインリンクを記載しないこと（法令上の義務履行など代替手段がない場合を除く）と、送信ドメイン認証技術の計画的な導入も求めている [N][^17]。
> 「特に、被害にあう可能性がある顧客を特定可能な場合は、可能な限り迅速に顧客に連絡するなどして被害を最小限に抑制するための措置を講じることとしているか。」

**RS-13#35** 日本証券業協会の「インターネット取引における不正アクセス等防止に向けたガイドライン」（2025-10-15 施行）は、対応が必要な事項を「スタンダード」、望ましい事項を「ベストプラクティス」と区分している [N][^18]。スタンダードには、重要な操作時のフィッシング耐性 MFA の実装・必須化（Ⅳ.1.(2)①）、身に覚えのないログイン・取引・出金・出金先変更の通知（②）、連続失敗時のアカウントロック（③）、連絡先や出金先口座等の変更時の通知（④）、設定の利用状況の確認と経営層への定期報告（Ⅳ.1.(3)）が含まれる [N][^18]。脚注 4 は、フィッシング耐性 MFA に CISA 等が認める方式を含めうるとしている [N][^18]。DMARC の reject ポリシー化もスタンダードとされている（Ⅳ.4.(1)）[N][^18]。
> 「ログイン時、出金時、出金先銀行口座の変更時など、重要な操作時におけるフィッシングに耐性のある多要素認証（例：パスキーによる認証、PKI（公開鍵基盤）をベースとした認証）の実装及び必須化（デフォルトとして設定）する。」

**RS-13#36** 金融庁の集計（暫定値、発生日ベース、2026-09-09 更新）では、2025 年 1 月から 2026 年 8 月までのインターネット取引サービスへの不正アクセスは 19,207 件、不正取引は 10,639 件、不正取引による売却金額は約 4,368 億円、買付金額は約 3,837 億円だった [I][^20]。月別の不正アクセス件数は 2025 年 4 月の 5,490 件が最多で、2026 年 7 月は 18 件、8 月は 39 件だった [I][^20]。金融庁は、これらが証券会社等から報告を受けた発生日ベースの暫定値であり、未判明の不正アクセス・不正取引が存在しうると注記している [I][^19]。月別件数の減少と監督指針改正等との因果関係は、この集計からは判断できない [D]（RS-13#36 から導出）。

**RS-13#37** クレジット取引セキュリティ対策協議会の「クレジットカード・セキュリティガイドライン【6.1 版】」（2026-03）は、EC 加盟店の不正利用対策として、決済前の「会員登録時」「会員ログイン時」「属性情報変更時」の不正ログイン対策と EMV 3-D セキュアの導入を求めている [N][^21]。不正ログイン対策は、附属文書 20 の対策から手口のリスクに応じて 1 つ以上を導入するもので、対策表の①〜⑦は優先導入が「望ましい」とされている [N][^21]。対策項目には、不審な IP アドレスからのアクセス制限、2 段階認証または多要素認証、ログイン試行回数の制限強化とスロットリング、ログイン時・属性変更時のメールや SMS での通知、属性・行動分析、デバイスフィンガープリントが含まれる [N][^21]。同ガイドラインは、これらを割賦販売法で義務付けられた不正利用防止措置の「指針対策」と位置づけている [N][^21]。
> 「これらは、割賦販売法で義務付けられている不正利用を防止するための措置の指針対策である」

**RS-13#38** EU の PSD2 RTS（委任規則 (EU) 2018/389）第 2 条は、決済サービス事業者に、不正な取引を検知する取引監視の仕組みを持つことを課している [N][^22]。その仕組みは少なくとも、侵害・盗難された認証要素の一覧、取引額、既知の不正シナリオ、認証手続中のマルウェア感染の兆候、事業者が提供した端末・ソフトウェアの利用ログと異常利用を考慮しなければならない [N][^22]。第 18 条の取引リスク分析による SCA 免除には、不正率が基準以下であることに加え、支払者の異常な支出・行動パターン、端末・ソフトウェアの異常、マルウェア感染、既知の不正シナリオ、支払者の異常な所在地、受取人の高リスク所在地が検出されないことが条件とされている [N][^22]。第 18 条を使う事業者は、手法・モデル・不正率について少なくとも年 1 回の監査を受けなければならない（第 3 条）[N][^22]。
> "Payment service providers shall have transaction monitoring mechanisms in place that enable them to detect unauthorised or fraudulent payment transactions"

**RS-13#39** 同 RTS 第 4 条 3 項は、連続した認証失敗の回数を一定期間内で 5 回以下とし、超えたら一時的または恒久的にブロックすること、支払口座へのオンラインアクセス後の無操作時間を 5 分以下とすることを定めている [N][^22]。一時ブロックの期間と再試行回数は、少なくとも第 2 条 2 項のリスク要因を考慮して定め、恒久ブロックの前に支払者へ警告しなければならない（第 4 条 4 項）[N][^22]。63B-4 の上限 100 回・AAL2 の無操作 1 時間以下（SHOULD）とは値が大きく異なる [D]（RS-13#8、#15、#39 から導出）。
> "the number of failed authentication attempts that can take place consecutively, after which the actions referred to in Article 97(1) of Directive (EU) 2015/2366 shall be temporarily or permanently blocked, shall not exceed five within a given period of time"

**RS-13#40** EU の PSR（Payment Services Regulation）と PSD3 は 2025-11-27 に欧州議会と理事会が暫定合意し、2026-05-05 に ECON 委員会が合意文を承認した [N][^23]。欧州議会の Legislative Train（2026-09-20 更新）は、発効前に両機関の正式採択が必要であり、まだ採択されていないとしている（PSR の不正対策条文の内容は未確認、§6）[N][^23]。

**RS-13#41** GDPR 第 33 条 1 項は、管理者が個人データ侵害を知ってから遅滞なく、可能であれば 72 時間以内に監督機関へ通知することを定める（自然人の権利・自由へのリスクが生じるおそれがない場合を除く）[N][^24]。同条 2 項は、処理者が侵害を知ったら遅滞なく管理者に通知することを定めている [N][^24]。
> "The processor shall notify the controller without undue delay after becoming aware of a personal data breach."

**RS-13#42** 個人情報保護法第 26 条 1 項は、規則で定める漏えい等の事態について個人情報保護委員会への報告を義務づけ、委託を受けた事業者が委託元に通知した場合はこの限りでないとしている [N][^76]。同法施行規則第 7 条は、対象事態に「不正に利用されることにより財産的被害が生じるおそれがある個人データの漏えい等」と「不正の目的をもって行われたおそれがある行為による漏えい等」を含め、第 8 条は速やかな報告と、知った日から 30 日以内（不正目的の事態は 60 日以内）の報告を定めている [N][^25]。第 9 条は、委託先から委託元への通知も速やかに行うことを定めている [N][^25]。上記は e-Gov 法令 API の現行版（法は 2026-10-01 施行分まで、規則は 2026-06-14 施行分まで反映）による [N][^76][^25]。改正法「個人情報の保護に関する法律等の一部を改正する法律」（令和 8 年法律第 56 号、2026-07-17 公布）は、e-Gov の改正履歴上、一部が公布日に施行済みで、残りは 2027-01-17 と「公布の日から起算して二年を超えない範囲内において政令で定める日」（e-Gov の仮置き 2028-07-16）に施行予定とされている [N][^85]。後者の施行後の版では第 26 条 2 項ただし書（本人通知の例外）が拡張されるが、同条 1 項（委託先が委託元へ通知した場合の報告義務の免除）の文言は変わらない [N][^85]。施行規則第 7〜9 条の改正予定は確認していない（§6）。

### 3.4 MITRE ATT&CK（v19.2）

**RS-13#43** MITRE ATT&CK の現行版は v19.2 で、v19 は 2026-04-28 に公開された [V][^26]。v19 の更新では、Impersonation（T1656）が Social Engineering: Impersonation（T1684.001）に置き換えられ（revoked）、Defense Evasion 戦術が Stealth と Defense Impairment に分割された [V][^27]。旧 ID（T1656）で検知カバレッジを管理している場合は、T1684.001 への読み替えが必要になる [D]（RS-13#43 から導出）。

**RS-13#44** 本ストリームの範囲に該当する ATT&CK の技術（v19.2、2026-10-03 確認）は次表のとおりである [V][^29][^30][^31][^32][^33][^34][^35][^36][^37][^38][^39][^40][^41][^42][^43][^44]。

| ID | 名称 | 最終更新 | 本基盤で主に関係する統制 |
|---|---|---|---|
| T1078 / T1078.004 | Valid Accounts / Cloud Accounts | 2026-05-12 | 認証後の異常検知、休眠アカウント管理 |
| T1110.003 | Brute Force: Password Spraying | 2025-10-24 | 多アカウント横断の失敗集計、IP インテリジェンス |
| T1110.004 | Brute Force: Credential Stuffing | 2026-05-12 | 漏えいパスワード照合、レート制限、ボット対策 |
| T1111 | Multi-Factor Authentication Interception | 2026-05-12 | フィッシング耐性方式、SMS の制限 |
| T1528 | Steal Application Access Token | 2026-05-12 | 同意制限、OAuth アプリ棚卸し、refresh token 失効 |
| T1539 | Steal Web Session Cookie | 2026-05-12 | session の端末束縛、短命化、異常検知 |
| T1550.004 | Use Alternate Authentication Material: Web Session Cookie | 2026-05-12 | 同上 |
| T1556.006 | Modify Authentication Process: Multi-Factor Authentication | 2026-05-12 | MFA 登録時の step-up と通知 |
| T1556.009 | Modify Authentication Process: Conditional Access Policies | 2026-05-12 | テナント管理面の変更監視・二者承認 |
| T1621 | Multi-Factor Authentication Request Generation | 2025-10-24 | push の回数制限、秘密の転記 |
| T1557 | Adversary-in-the-Middle | 2026-05-12 | フィッシング耐性方式、token 束縛 |
| T1566.002 | Phishing: Spearphishing Link | 2026-05-12 | 同意制限、フィッシング耐性方式 |
| T1684.001 | Social Engineering: Impersonation（旧 T1656） | 2026-05-12 | ヘルプデスク本人確認、コールバック |
| T1098.005 | Account Manipulation: Device Registration | 2025-05-22 | 端末・MFA 登録の通知と監視 |
| T1451（Mobile） | SIM Card Swap | 2025-02-12 | PSTN の制限、SIM 変更シグナル |

**RS-13#45** T1621 は、資格情報を持つ攻撃者が push 通知を大量に発生させて承認させる手口に加え、セルフサービスのパスワードリセットで push が設定されている場合に資格情報なしでも悪用されうると記載している [V][^39]。緩和策として、一度押すだけの push をログイン画面のコードを入力させる方式に置き換えること、一定時間内の MFA 要求の最大数を制限することを挙げている [V][^39]。
> "change default configurations and implement limits upon the maximum number of 2FA/MFA request prompts that can be sent to users in period of time."

**RS-13#46** T1110.003 と T1110.004 の緩和策（M1036）は、失敗回数に応じたロックアウトを挙げつつ、厳しすぎる設定はサービス妨害を招くと注記している [V][^31][^32]。同緩和策は匿名化サービス・プロキシからの危険な認証要求の遮断を、T1110.004 の M1018 は漏えいした資格情報に含まれるアカウントの事前リセットを挙げている [V][^32]。
> "Too strict a policy may create a denial of service condition and render environments un-usable, with all accounts used in the brute force being locked-out."

**RS-13#47** T1539 は、ブラウザからの cookie 窃取マルウェアに加え、Evilginx2 や Muraena のような中間者プロキシで session cookie を収集する手口を記載している [V][^35]。T1550.004 は、窃取した session cookie はすでに認証済みであるため一部の MFA を迂回すると記載している [V][^36]。T1539 の緩和策（M1032）は、ログイン先ドメインを交渉に組み込むハードウェアトークン（FIDO 等）がプロキシ経由の cookie 窃取を防ぐとし、M1054 は cookie の有効期間の短縮を挙げている [V][^35]。T1557 は、AiTM の位置から access token と session cookie を傍受しうると記載している [V][^40]。
> "Deploy hardware-based token (e.g., YubiKey or FIDO key), which incorporates the target login domain as part of the negotiation protocol, will prevent session cookie theft through proxy methods."

**RS-13#48** T1528 は、攻撃者が悪性アプリを登録し、利用者を誘導して OAuth の同意を得させる手口と、refresh token を盗めば利用者に再要求せず新しい access token を得られることを記載している [V][^34]。緩和策として、全 OAuth アプリと権限の監査（M1047）と、利用者による同意の禁止と管理者同意への一本化（M1021）を挙げている [V][^34]。T1566.002 も、悪性の OAuth 2.0 要求 URL による consent phishing を記載している [V][^41]。

**RS-13#49** T1556.006 は、侵入後に Conditional Access の対象から利用者を除外する、攻撃者が管理する MFA 方式を登録するなどして MFA を改変・無効化する手口を記載している [V][^37]。T1556.009 は Conditional Access ポリシーの無効化・改変を [V][^38]、T1098.005 は攻撃者が管理する端末を MFA や端末管理システムに登録する手口を記載している [V][^43]。

**RS-13#50** ATT&CK v19.2（2026-08-06 の Agile リリース）は、ShinyHunters（G1057）と、ターゲット型の誘導で利用者にコマンドを貼り付けさせ、device code を随時生成し、AiTM で OAuth token と session cookie を盗む PhaaS キット Kali365（S9044）を追加した [V][^28]。
> "Kali365 (S9044) is a phishing-as-a-service kit that uses targeted lures to trick users into copying and pasting attacker-controlled commands, generates device codes on demand, and steals OAuth tokens and session cookies through adversary-in-the-middle collection."

### 3.5 OWASP（Credential Stuffing、Automated Threats、ASVS 5.0）

**RS-13#51** OWASP の Credential Stuffing Prevention Cheat Sheet（非規範）は、credential stuffing（他サイトの漏えい資格情報の試行）と password spraying（少数の弱いパスワードを多数アカウントへ試行）を区別し、MFA を最も有効な防御としている [N][^45]。MFA を常時要求できない場合は、新しい端末・IP、通常と異なる国、匿名化サービス、複数アカウントへの試行元、スクリプト的な挙動などを条件に MFA を要求する方法を挙げている [N][^45]。IP の遮断は単独の主防御にすべきでない（原文は小文字の should）とし、住宅用かホスティングかの分類、短期と長期の両方の時間窓、遮断の一時性を考慮するよう述べている [N][^45]。デバイスとコネクションのフィンガープリントは偽装されうること、JavaScript の必須化はスクリーンリーダー利用者のアクセシビリティを下げうることを注記している [N][^45]。
> "Blocking IP addresses may be sufficient to stop less sophisticated attacks, but should not be used as the sole or primary defense due to the ease in circumvention."

**RS-13#52** 同 Cheat Sheet は、不審な事象の利用者通知について、重要でない通知を大量に送ると無視されるため、誤ったパスワードでの失敗は通知せず、正しいパスワードの後に MFA で失敗した場合は通知してパスワード変更を促す例を挙げている [N][^45]。また、利用者が直近のログイン日時・場所と稼働中の session 一覧を確認し、不正な session を終了できるようにすることを挙げている [N][^45]。
> "if there had been a login with the correct password, but which had then failed the subsequent MFA check, the user should be notified so that they can change their password."

**RS-13#53** OWASP Automated Threat Handbook は v1.30（2026-03-17）が最新である [N][^47]。OAT-008 Credential Stuffing は「盗まれた利用者名とパスワードの組の有効性を確かめるための大量のログイン試行」と定義されている [N][^46]。同 Handbook の OAT-008 対策は、登録・ログオン・パスワードリセット・変更・再認証の全機能と、web・モバイル・コールセンターの全チャネルで成功と失敗を記録し、通常時との比で監視することを挙げている [N][^47]。一方、同 Handbook は「定期的なパスワード失効」も対策例に挙げており、63B-4 の定期変更要求の禁止（SHALL NOT）と食い違う [N][^47][^1]。本基盤では 63B-4 を優先し、この食い違いを見解相違ログ（DL-106）に記録すべきである [D]（RS-13#9、#53 から導出）。
> "Mass log in attempts used to verify the validity of stolen username/password pairs."

**RS-13#54** OWASP ASVS 5.0.0（2025-05）V6 は、次の検証要件を定めている [N][^48]。ASVS は MUST/SHALL ではなく「Verify that」と検証レベル（L1〜L3）で強度を表す [N][^48]。
- 6.1.1（L1）: レート制限・反自動化・アダプティブな対応の構成と、悪意あるロックアウトの防止方法を文書化する [N][^48]。
- 6.3.1（L1）: その文書どおりに credential stuffing と総当たりへの対策を実装する [N][^48]。
- 6.2.12（L2）: 登録・変更時のパスワードを漏えいパスワード集合と照合する [N][^48]。
- 6.4.3（L2）: パスワードリセットが有効な MFA を迂回しない [N][^48]。
- 6.6.1（L2）: PSTN の OTP は、番号が検証済みで、より強い方式も提供し、リスクを利用者に説明している場合に限って提供する [N][^48]。同要件は、L3 では SMS・電話を選択肢にしないことも求めている [N][^48]。
- 6.8.4（L2）: IdP の acr/amr/auth_time を検証し、情報がなければ最弱方式が使われたと仮定する文書化済みの代替手順を持つ [N][^48]。
- 6.3.5（L3）: 不審な認証試行（成功・失敗とも）を利用者に通知する [N][^48]。
- 6.3.7（L3）: 資格情報の再設定やユーザー名・メールアドレスの変更などの更新後に利用者へ通知する [N][^48]。
- 6.3.8（L3）: 失敗時の応答（エラーメッセージ、HTTP 応答コード、応答時間）から有効な利用者を推測できない [N][^48]。
- 6.6.4（L3）: push 通知を MFA に使う場合、push bombing を防ぐレート制限を行う（number matching も有効とされる）[N][^48]。
> "The documentation must make clear how these controls are configured and prevent malicious account lockout."

**RS-13#55** ASVS 5.0.0 V7 は、session について次の検証要件を定めている [N][^49]。
- 7.1.1（L2）: 無操作タイムアウトと最大 session 寿命を文書化し、SP 800-63B の再認証要件から逸脱する場合は理由を記す [N][^49]。
- 7.4.3（L2）: 認証要素の変更・削除の後に、他の全 session を終了する選択肢を与える [N][^49]。
- 7.4.5（L2）: 管理者が個人または全利用者の稼働中 session を終了できる [N][^49]。
- 7.5.1（L2）: メールアドレス・電話番号・MFA 設定・回復情報など認証に影響する属性の変更前に、完全な再認証を要求する [N][^49]。
- 7.5.2（L2）: 利用者が稼働中の session を確認し、少なくとも一要素で再認証したうえで終了できる [N][^49]。
- 7.5.3（L3）: 機微な取引・操作の前に、少なくとも一要素による追加認証または二次確認を要求する [N][^49]。
> "Verify that the application requires full re-authentication before allowing modifications to sensitive account attributes which may affect authentication such as email address, phone number, MFA configuration, or other information used in account recovery."

### 3.6 クロスデバイスフローと OAuth の同意（device code、consent phishing）

**RS-13#56** RFC 8628（OAuth 2.0 Device Authorization Grant）§5.4 は、攻撃者が自分の端末で device フローを開始し、利用者に確認 URL とコードを入力させる遠隔フィッシングを記載している [N][^50]。対策として、利用者に端末を認可していることを示し端末を所持しているか確認させること（RECOMMENDED）、認可サーバが端末の情報を表示すること（SHOULD）、ユーザーコードの寿命を短くすることを挙げている [N][^50]。同節は、リアルタイムで利用者とやり取りする攻撃者が新しいコードを示すことは防げないとも述べている [N][^50]。
> "it is RECOMMENDED to inform the user that they are authorizing a device during the user-interaction step (see Section 3.3) and to confirm that the device is in their possession."

**RS-13#57** RFC 10027（BCP 247、2026-08、"Best Current Practice for Security of Cross-Device Flows"）は、クロスデバイスフローの実装前にリスク評価を行うこと（MUST）、十分に緩和できない場合は使わないこと（SHOULD）、§6.1 から緩和策を選ぶこと（MUST）、可能なら近接性の確認を含めること（SHOULD）を定めている（§2）[N][^51]。device authorization grant は、他の方式が端末やシステムの制約で使えない場合に限って使い、保護資源が機微・高価値・業務上重要な場合は避けるよう述べている（§6.2.1.5）[N][^51]。FIDO2/WebAuthn のクロスデバイス認証（CTAP 2.2 hybrid）は BLE で近接性を確認するため、端末が対応し、かつ利用端末側に適した FIDO 資格情報がない場合には使うべきであり（SHOULD）、authorization code + PKCE と組み合わせれば device grant のリスクなしにクロスデバイス認可ができるとしている（§6.2.3.5）[N][^51]。
> "Avoid using if the protected resources are sensitive, high value, or business critical."

**RS-13#58** RFC 10027 は、push で取引承認を求める方式への攻撃例として、多数の利用者に一斉に承認要求を送る例（§4.3.4.1）と、利用者の金融機関の担当者を装って連絡し、不正な取引要求を「確認」させて承認させる「Fake Help Desk」例（§4.3.4.2）を挙げている [N][^51]。認可サーバがコードの悪用を検知した場合、そのコードで発行した全 token を無効化し、CAEP 等で resource server に通知してよい（MAY、§6.1.6）[N][^51]。レート制限は大規模攻撃を遅らせるが、低速の標的型攻撃は防げないと注記している（§6.1.11）[N][^51]。送信者拘束 token は token を別端末へ移すことを難しくするが、攻撃者が利用端末を制御していれば鍵を使えてしまうとも注記している（§6.1.12）[N][^51]。
> "Rate limits are effective at slowing an attacker down and help to degrade scaled attacks, but they do not prevent more targeted attacks that are executed with lower volumes and velocity."

**RS-13#59** Microsoft Learn の Conditional Access「authentication flows」（ms.date 2026-03-24）は、device code フローを、フィッシング攻撃の一部や非管理端末からのアクセスに使われうる高リスクの方式としている [V][^65]。Microsoft は、可能な限り device code フローを遮断し、必要な箇所にだけ許可するよう推奨している [V][^65]。
> "Microsoft recommends blocking device code flow wherever possible."

**RS-13#60** RFC 9700（BCP 240）§4.11.2 は、攻撃者が正規に登録した redirect URI を使い、誤った要求や同意拒否の後のリダイレクトで利用者をフィッシングサイトへ送る攻撃を記載している [N][^52]。認可サーバはこれらの脅威に備えなければならず（MUST）、まず利用者を認証し（MUST）、信頼できる redirect URI に対してだけ自動リダイレクトすべきである（SHOULD）[N][^52]。
> "The authorization server MUST take precautions to prevent these threats."

**RS-13#61** Microsoft Learn の「Protect against consent phishing」（ms.date 2023-12-11）は、consent phishing を、利用者をだまして悪性クラウドアプリに権限を与えさせる攻撃と定義している [V][^64]。Microsoft が悪性アプリを無効化すると新しい token と refresh token の要求は拒否されるが、既存の access token は期限まで有効のままであると記載している [V][^64]。対策として、検証済み発行元のアプリと低リスクの権限に限って利用者の同意を許す設定、定期的な権限監査を挙げている [V][^64]。
> "Any new token requests or requests for refresh tokens are denied, but existing access tokens are still valid until their expiration."

**RS-13#62** Microsoft の Midnight Blizzard 対応ガイダンス（2024-01-25）は、攻撃者が MFA のない旧来の非本番テストテナントのアカウントを password spray で侵害したと報告している [I][^67]。攻撃者は検知とブロックを避けるため、対象を少数のアカウントに絞って試行回数を少なくし、住宅用プロキシ網を使ったため、IP アドレスの入れ替わりが激しく従来型の IOC ベースの検知は実行不能（infeasible）だったとしている [I][^67]。侵害後、攻撃者は高い権限を持つ旧テスト OAuth アプリを悪用し、悪性 OAuth アプリを追加作成して同意させた [I][^67]（事故としての詳細: RS-12#15〜#21）。
> "the actor tailored their password spray attacks to a limited number of accounts, using a low number of attempts to evade detection and avoid account blocks based on the volume of failures."

### 3.7 session 窃取と端末束縛（DBSC、Token Protection）

**RS-13#63** DBSC（Device Bound Session Credentials）の W3C における公表版は、Web Application Security WG の 2025-08-21 First Public Working Draft だけである [N][^58]。同文書は「いつでも更新・置換・廃止されうる草案」と明記している [N][^58]。Editor's Draft の最新版は 2026-09-08 付で、「作業中の文書としてのみ引用すべき」とされている [N][^59]。
> "This is a draft document and may be updated, replaced, or obsoleted by other documents at any time."

**RS-13#64** DBSC の Editor's Draft は、非目標として、攻撃者が利用者の端末に常駐している間の一時的な session 利用は防げないこと、session 登録時に攻撃者が user agent を置換・注入していれば防げないこと、host に端末の種類や状態を保証しないことを明記している（§2.1）[N][^59]。プライバシー面では、ブラウザがサイトデータの消去時に session と鍵を消去しなければならない（MUST）としている（§3）[N][^59]。
> "DBSC will not prevent temporary access to the browser session while the attacker is resident on the user's device."

**RS-13#65** Google の Chrome for Developers ブログ（最終更新 2026-03-03）は、DBSC が Windows の Chrome 145 で利用可能になり、鍵は TPM で保護されると告知した [V][^60]。一方、Google のブログ（2026-04-09）は、DBSC が Windows の Chrome 146 で一般提供に入り、macOS は今後のリリースで対応すると告知した [V][^61]。Google Workspace Updates（2026-05-28）は、Windows の Chrome での DBSC が一般提供となり、全 Workspace 顧客で既定有効・管理者による無効化不可とし、2026-05-25 から最大 60 日の段階展開と告知した [V][^62]。対応版の記載（145 と 146）は Google の公式告知間で一致していない [V][^60][^61]。
> "Device Bound Session Credentials (DBSC) is now entering public availability for Windows users on Chrome 146, and expanding to macOS in an upcoming Chrome release."

**RS-13#66** Google は、ソフトウェアだけでは cookie の持ち出しを確実に防ぐ方法はどの OS にもないと述べている [V][^61]。今後の改良として、IdP から RP への federated ログインで同じ端末鍵に束縛を続けるクロスオリジン束縛、既存の鍵素材（mTLS 証明書やセキュリティキー）への束縛、セキュアハードウェアのない端末向けのソフトウェア鍵を挙げている [V][^61]。Workspace は DBSC の束縛イベントを監査ログで確認できるとしている [V][^62]。
> "there is no reliable way to prevent cookie exfiltration using software alone on any operating system."

**RS-13#67** Microsoft Learn の Token Protection（ms.date 2026-08-14）は、端末に束縛されたサインイン session token（PRT 等）だけを受け入れる Conditional Access の session 制御と説明している [V][^63]。プラットフォーム表では、Windows のネイティブアプリは一般提供、ブラウザアプリは Azure Resource Manager にアクセスする一部の Web アプリでのプレビューとされている [V][^63]。Apple 系はプラットフォーム表で一般提供、端末要件の節で Preview と記載されており、同一文書内で表記が一致していない [V][^63]。
> "Token Protection is a Conditional Access session control that attempts to reduce token replay attacks by ensuring only device bound sign-in session tokens, like Primary Refresh Tokens (PRTs), are accepted by Microsoft Entra ID when applications request access to protected resources."

**RS-13#68** Okta の根本原因報告（2023-11-03）は、サポートシステムから持ち出された HAR ファイルに session token が含まれ、session ハイジャックに使われうる状態だったと報告している [I][^70]。是正の一つとして、管理者 session token をネットワーク位置に束縛し、ネットワークの変化を検知したら再認証させる機能を公開した（顧客が管理ポータルの early access で有効化する製品機能）[I][^70]（事故としての詳細: RS-12#22〜#27）。
> "Okta administrators are now forced to re-authenticate if we detect a network change."

### 3.8 検知シグナル、ITDR、信号の標準、step-up

**RS-13#69** Microsoft Entra ID Protection のリスク検知一覧（ms.date 2026-04-22）は、検知ごとに real-time と offline を区別している [V][^66]。サインイン時の検知には、匿名 IP（real-time）、Unfamiliar sign-in properties（real-time）、不審な MFA 承認（real-time）、Password spray（real-time または offline）、Atypical travel・Impossible travel・New country・Malicious IP・Token issuer anomaly（offline）がある [V][^66]。利用者単位の検知には、Attacker in the Middle・Leaked credentials・PRT へのアクセス試行・利用者からの不審活動報告（いずれも offline）がある [V][^66]。
> "For details on real-time vs offline detections and risk levels, see Risk detection types and levels."

**RS-13#70** OpenID の Shared Signals Framework 1.0、CAEP 1.0、RISC 1.0 は、いずれも 2025-08-29 付で公開されている（URL 上の版表記は final）[N][^55][^56][^57]。OpenID Foundation は 2025-09-02 に、会員投票によりこの 3 仕様を Final Specification として承認したと告知している（賛成 85、反対 1、棄権 25）[N][^82]。CAEP は session-revoked、token-claims-change、credential-change、assurance-level-change、device-compliance-change、session-established、session-presented、risk-level-change の各イベント型を定義している [N][^56]。RISC は account-credential-change-required、account-disabled、account-enabled、account-purged、credential-compromise、identifier-changed、identifier-recycled、recovery-activated、recovery-information-changed、sessions-revoked 等を定義している [N][^57]。CAEP の risk-level-change は、未知の送信元からの不審なアクセス、パスワード侵害、強い認証器の追加などによる主体のリスク変化を伝える用途を例示している [N][^56]。
> "The Risk Level Change event is employed by the Transmitter to communicate any modifications in a subject's assessed risk level"

**RS-13#71** NIST CSF 2.0（2024-02）は、利用者・サービス・機器の認証（PR.AA-03）、要員の活動と技術利用の監視（DE.CM-03）、事象の分析（DE.AE-02）、複数情報源の相関（DE.AE-03）、インシデントの封じ込め（RS.MI-01）を subcategory として定めている [N][^71]。

**RS-13#72** 「ITDR（Identity Threat Detection and Response）」について、NIST・CISA・NCSC 等の公的機関による権威ある定義は、本調査の範囲では見つからなかった [D]（検索結果は業界・ベンダーの解説のみで、根拠には使っていない）。本基盤では ITDR を製品分類ではなく、63B-4 §5.3 の session 監視、63-4 §3.5 の継続評価、CSF 2.0 の DE.CM/DE.AE/RS.MI と、IdP 構成の改変検知（T1556.006/.009、T1098.005）を束ねた機能群として定義するのが妥当である [D]（RS-13#17、#19、#49、#71 から導出）。

**RS-13#73** RFC 9470（OAuth 2.0 Step Up Authentication Challenge Protocol、2023-09）は、resource server が、access token に結びつく認証事象が保護資源の要件を満たさない場合に insufficient_user_authentication を返し、acr_values と max_age で要件を伝える方式を定めている [N][^53]。この方式で acr_values を要求された認可サーバは、要求された acr を満たすことを必要条件とみなすべきである（SHOULD）[N][^53]。
> "insufficient_user_authentication:  The authentication event associated with the access token presented with the request does not meet the authentication requirements of the protected resource."

### 3.9 公開実測値・ボット対策・事故の一次報告

**RS-13#74** Google のブログ（2019-05-17、NYU・UCSD との 1 年間の研究、The Web Conference で発表）は、新しい位置や端末からの不審なログインに対するチャレンジの効果を報告した [M][^72]。SMS コードは自動化ボットの 100%・大量フィッシングの 96%・標的型攻撃の 76% を、端末上のプロンプトはそれぞれ 100%・99%・90% を防いだ [M][^72]。セキュリティキーだけを使う利用者で標的型フィッシングの被害者はいなかった [M][^72]。測定条件: Google アカウント、Google のリスク検知でチャレンジが発動した場合、2019 年以前の攻撃 [M][^72]。
> "We found that an SMS code sent to a recovery phone number helped block 100% of automated bots, 96% of bulk phishing attacks, and 76% of targeted attacks."

**RS-13#75** Meyer らの論文（arXiv 2305.00945、2023-05、Microsoft の研究者）は、不審な活動のある Azure AD 利用者の大規模データで、MFA が侵害リスクを集団全体で 99.22%、資格情報漏えいがあった場合で 98.56% 下げたと報告した [M][^73]。専用の MFA アプリは SMS より効果が高かったとしている [M][^73]。測定条件: 商用アカウント、benchmark-multiplier 法と手作業のアカウントレビュー（査読の有無は未確認、§6）[M][^73]。
> "MFA reduces the risk of compromise by 99.22% across the entire population and by 98.56% in cases of leaked credentials."

**RS-13#76** Wiefling らの論文（ACM TOPS 26(1), 2023-02、arXiv 2206.15139）は、ある大規模オンラインサービスの 330 万人・3,130 万回のログイン（1 年超）を使い、RBA を評価した [M][^74]。被害者の資格情報を使い正規のログイン文脈の一部を模倣する攻撃者モデルで 99% 超を拒否しても、再認証の要求はまれだったと報告している [M][^74]。最も標的型の攻撃者モデルでは成功した乗っ取りの 78.16% を検知したとし、標的型攻撃者の 99.5% を拒否する設定ではログイン履歴 8 件の保持で安定した構成になる（最も標的型の攻撃者モデルでは 18 件を要した）としている [M][^74]。測定条件: 攻撃は模擬（攻撃者モデル）、ログイン時の特徴量（IP、User-Agent 等）による RBA [M][^74]。
> "RBA rarely requests re-authentication in practice, even when blocking more than 99% of attacks that used the victim's credentials and mimicked some of the legitimate login contexts."

**RS-13#77** RFC 9576（The Privacy Pass Architecture、Informational、2024-06）は、Privacy Pass の用途として、クライアントが credential stuffing などの自動化攻撃を行うボットではないことを示す低品質の不正対策シグナルを挙げている [N][^54]。発行の前提となる確認手段の例として、CAPTCHA の解答や、正常な状態のロック解除済み端末の証拠を挙げている [N][^54]。RFC 9577・9578 は Proposed Standard である（§4 表）[N][^80][^81]。
> "Tokens can attest that the Client behind the user agent is likely not a bot attempting to perform some form of automated attack such as credential stuffing."

**RS-13#78** W3C の「Inaccessibility of CAPTCHA」（Group Draft Note、2021-12-16、非規範）は、CAPTCHA が障害のある人の手続を妨げることが多いと指摘し、導入前の目的と有効性の検討と導入後の監視を推奨している [N][^75]。同文書は、非対話型の手法はアクセシビリティ上の問題を生まないが、個人データの収集を伴いうると述べている [N][^75]。
> "a CAPTCHA not only separates computers from humans, but also often prevents people with disabilities from performing the requested procedure."

**RS-13#79** Uber の事後報告（2022-09-19 更新）は、外部委託者の私物端末がマルウェアに感染して社用パスワードが漏れ、攻撃者がそれをダークウェブで購入した可能性が高いとし、攻撃者が繰り返しログインを試みて二要素の承認要求を送り続けた結果、委託者が承認して侵入されたと報告している [I][^68]。侵入後、攻撃者は他の従業員アカウントを経て G-Suite や Slack 等の高い権限を得た [I][^68]。
> "Eventually, however, the contractor accepted one, and the attacker successfully logged in."

**RS-13#80** Cloudflare の事後報告（2022-08-09）は、2022-07-20 に 1 分足らずで少なくとも 76 人の従業員に偽の Okta ログインページへのリンクを含む SMS が届き、3 人が資格情報を入力したと報告している [I][^69]。偽ページは入力をリアルタイムに攻撃者へ中継し TOTP も要求していたが、Cloudflare は全従業員に origin binding を実装する FIDO2 セキュリティキーを必須にしていたため、攻撃者はログインできなかった [I][^69]。
> "Since the hard keys are tied to users and implement origin binding, even a sophisticated, real-time phishing operation like this cannot gather the information necessary to log in to any of our systems."

---

## 4. 標準・文書ステータス表

確認日はいずれも 2026-10-03 である。

| 名称 | 版・識別 | 状態 | 公表日 | URL |
|---|---|---|---|---|
| NIST SP 800-63-4 | Rev.4 | final | 2025-07（CSRC: 07/31/25） | https://csrc.nist.gov/pubs/sp/800/63/4/final |
| NIST SP 800-63A-4 | Rev.4 | final | 2025-07（CSRC: 07/31/25） | https://csrc.nist.gov/pubs/sp/800/63/a/4/final |
| NIST SP 800-63B-4 | Rev.4 | final | 2025-07（CSRC: 07/31/25） | https://csrc.nist.gov/pubs/sp/800/63/b/4/final |
| NIST SP 800-63C-4 | Rev.4 | final | 2025-07（CSRC: 07/31/25） | https://csrc.nist.gov/pubs/sp/800/63/c/4/final |
| NIST CSF | 2.0（CSWP 29） | final | 2024-02 | https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf |
| RFC 8628 OAuth 2.0 Device Authorization Grant | RFC 8628 | Proposed Standard | 2019-08 | https://www.rfc-editor.org/rfc/rfc8628 |
| RFC 9700 OAuth 2.0 Security BCP | BCP 240 | Best Current Practice | 2025-01 | https://www.rfc-editor.org/rfc/rfc9700 |
| RFC 9470 Step Up Authentication Challenge | RFC 9470 | Proposed Standard | 2023-09 | https://www.rfc-editor.org/rfc/rfc9470 |
| RFC 10027 Security of Cross-Device Flows | BCP 247（draft-ietf-oauth-cross-device-security-16 から） | Best Current Practice | 2026-08 | https://www.rfc-editor.org/rfc/rfc10027 |
| RFC 9576 Privacy Pass Architecture | RFC 9576 | Informational | 2024-06 | https://www.rfc-editor.org/rfc/rfc9576 |
| RFC 9577 / RFC 9578 Privacy Pass | RFC 9577 / 9578 | Proposed Standard | 2024-06 | https://www.rfc-editor.org/rfc/rfc9577 ／ https://www.rfc-editor.org/rfc/rfc9578 |
| OpenID Shared Signals Framework | 1.0 | Final Specification（OIDF 承認告知 2025-09-02 [^82]） | 2025-08-29 | https://openid.net/specs/openid-sharedsignals-framework-1_0-final.html |
| OpenID CAEP | 1.0 | Final Specification（同上） | 2025-08-29 | https://openid.net/specs/openid-caep-1_0-final.html |
| OpenID RISC Profile | 1.0 | Final Specification（同上） | 2025-08-29 | https://openid.net/specs/openid-risc-1_0-final.html |
| W3C Device Bound Session Credentials | FPWD | draft（W3C 公表版は FPWD のみ） | 2025-08-21 | https://www.w3.org/TR/2025/WD-dbsc-1-20250821/ |
| DBSC Editor's Draft | ED | draft（作業中） | 2026-09-08 | https://w3c.github.io/webappsec-dbsc/ |
| W3C Inaccessibility of CAPTCHA | Group Draft Note | 非規範 Note | 2021-12-16 | https://www.w3.org/TR/turingtest/ |
| OWASP ASVS | 5.0.0 | released | 2025-05 | https://github.com/OWASP/ASVS/tree/v5.0.0_release/5.0/en |
| OWASP Automated Threat Handbook | 1.30 | released | 2026-03-17 | https://github.com/OWASP/www-project-automated-threats-to-web-applications/tree/master/assets/files/EN |
| OWASP Credential Stuffing Prevention Cheat Sheet | 版表記なし（随時更新） | 非規範ガイダンス | — | https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html |
| MITRE ATT&CK | v19.2 | current（v19: 2026-04-28〜、v19.2 Agile: 2026-08-06） | 2026-08-06 | https://attack.mitre.org/resources/versions/ |
| CISA Implementing Phishing-Resistant MFA | — | 公的勧告 | 2022-10 | https://www.cisa.gov/sites/default/files/publications/fact-sheet-implementing-phishing-resistant-mfa-508c.pdf |
| CISA Implementing Number Matching in MFA Applications | — | 公的勧告 | 2022-10 | https://www.cisa.gov/sites/default/files/publications/fact-sheet-implement-number-matching-in-mfa-applications-508c.pdf |
| CISA Mobile Communications Best Practice Guidance | — | 公的勧告 | 2024-12-18 | https://www.cisa.gov/sites/default/files/2024-12/guidance-mobile-communications-best-practices.pdf |
| CISA AA23-320A Scattered Spider | 2025-07-29 改訂 | 公的勧告（改訂あり） | 2023-11-16 | https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-320a |
| CISA AA23-341A Star Blizzard | — | 公的勧告 | 2023-12-07 | https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-341a |
| FBI PSA I-052126-PSA（Kali365） | — | 公的勧告 | 2026-05-21 | https://ic3.gov/PSA/2026/PSA260521 |
| NCSC "Incidents impacting retailers" | — | 公的機関ブログ | 2025-05-04 | https://www.ncsc.gov.uk/blog-post/incidents-impacting-retailers |
| OMB M-22-09 | — | 発出済み（現行性未確認） | 2022-01-26 | https://www.whitehouse.gov/wp-content/uploads/2022/01/M-22-09.pdf |
| FFIEC Authentication and Access to Financial Institution Services and Systems | — | 監督ガイダンス（2005・2011 版を置換。現行性は FFIEC サイトで未確認） | 2021-08-11 | https://www.federalreserve.gov/supervisionreg/srletters/sr2114.pdf |
| 47 CFR 64.2010(h)（SIM 変更） | eCFR 2026-10-01 時点の版（同条の最終改正 89 FR 47870, 2024-06-04） | 公布済み・遵守日未設定 | 88 FR 85814（2023-12-08）等 | https://www.ecfr.gov/current/title-47/part-64/section-64.2010 |
| 金融商品取引業者等向けの総合的な監督指針 | 2025-10-15 改正 | 適用中（同日適用） | 2025-10-15 | https://www.fsa.go.jp/news/r7/shouken/20251015/20251015.html |
| 日本証券業協会 インターネット取引における不正アクセス等防止に向けたガイドライン | 2025-10-15 改正 | 施行中 | 2025-10-15 | https://www.jsda.or.jp/houdou/2025/20251015fuseiaccess-guideline.pdf |
| クレジットカード・セキュリティガイドライン | 6.1 版 | 公表済み | 2026-03 | https://www.j-credit.or.jp/security/pdf/Creditcardsecurityguidelines_6.1_published.pdf |
| 保険会社向けの総合的な監督指針（Ⅱ－３－１３－２－２ インターネット取引） | 2026-07-17 改正（少額短期保険・貸金業・金融サービス仲介業・電子決済等代行業・前払式支払手段・資金移動業向けの指針等も同日改正） | 適用中（同日適用） | 2026-07-17 | https://www.fsa.go.jp/news/r8/sonota/20260717-2/20260717.html ／ https://www.fsa.go.jp/news/r8/sonota/20260717-2/02.pdf |
| Commission Delegated Regulation (EU) 2018/389（PSD2 RTS） | OJ L 69, 2018-03-13 | 施行中 | 2017-11-27 採択 | https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32018R0389 |
| EU Payment Services Regulation（PSR）／PSD3 | 暫定合意文 | 暫定合意（2025-11-27）、ECON 承認（2026-05-05）、正式採択前 | — | https://www.europarl.europa.eu/legislative-train/theme-an-economy-that-works-for-people/file-revision-of-eu-rules-on-payment-services |
| GDPR（Regulation (EU) 2016/679） | — | 施行中 | 2016-04-27 | https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679 |
| 個人情報の保護に関する法律／同施行規則 | e-Gov 法令 API 取得版（法: 2026-10-01 施行分まで、規則: 2026-06-14 施行分まで） | 施行中。改正法（令和 8 年法律第 56 号、2026-07-17 公布）は一部施行済み、残りは 2027-01-17 と公布後 2 年以内の政令で定める日（e-Gov 仮置き 2028-07-16）に施行予定 | — | https://laws.e-gov.go.jp/law/415AC0000000057 ／ https://laws.e-gov.go.jp/law/428M60020000003 ／ 改正履歴 [^85] |
| Chrome DBSC（Windows） | Chrome 145（Chrome for Developers）／146（Google ブログ） | 一般提供（版表記に不一致） | 2026-03〜2026-05-28 | §参考文献 [^60][^61][^62] |
| Microsoft Entra Token Protection | ms.date 2026-08-14 | Windows ネイティブは一般提供、ブラウザはプレビュー | — | https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-token-protection |

---

## 5. 設計への含意と PoC で実測すべきこと

### 5.1 ADR・設計文書への入力

ADR 番号は seed-02 の A01〜A19 を ADR-001〜ADR-019 と読み替えた。DL 番号は traceability/deliverables.md による。

| 入力先 | 入力する内容 | 根拠 |
|---|---|---|
| ADR-002（主体×操作階層の IAL/AAL/FAL）、DL-09 | フィッシング耐性方式を全テナントの既定とし、AAL3 は非エクスポート鍵、同期型 passkey は AAL2 までとする [D]。PSTN は restricted として、テナントが明示的に許可した場合だけ使え、代替方式と移行計画を必須にする [D]。主体の AAL は「残っている最も弱い経路（回復を含む）」で判定する [D]。日本の証券・保険等の顧客には、ログイン・出金・出金先変更等の重要操作でのフィッシング耐性 MFA の既定化をプロファイルとして提供する [D]。 | RS-13#2〜#6、#25、#33、#33a、#35 |
| ADR-003（回復と認証器ライフサイクル）、DL-08 | AAL2 回復は 63B-4 §4.2.2.2 の三択に限定する [D]。オペレータ介在の回復はリスク分析を文書化した経路とし、AAL2 アカウントでは §4.2.2.2 の三択を満たす手続の補助として位置づけたうえで、事前登録番号へのコールバック、二者承認、待機時間、特権者の追加審査、回復後の一定期間の権限制限を設計する [D]。認証器の追加・回復・回復情報の変更は、独立した全通知先への通知と step-up を必須にする [D]。回復コードの有効期間（SMS 10 分、メール 24 時間）を上限にする [D]。 | RS-13#10〜#13、#18、#26、#28、#31 |
| ADR-004（B2B federation・linking） | テナントへの federated IdP の追加と自動連結の有効化を、高リスクの管理操作として二者承認と通知の対象にする [D]。顧客 IdP と shared signaling を結び、侵害の疑いの送受信手順を信頼合意（契約）に文書化する [D]。 | RS-13#22、#26、#49 |
| ADR-005（token profile）、DL-16 | device code フローを既定で無効にし、許可する場合は RFC 10027 のリスク評価・近接性・短い user code 寿命・機微資源への禁止を条件にする [D]。代替として FIDO クロスデバイス認証＋authorization code＋PKCE を優先する [D]。第三者クライアントへの利用者同意は、検証済み発行元と低リスク scope に限定する [D]。送信者拘束 token（DPoP/mTLS）は RS-04 の結論と合わせる [D]。 | RS-13#56〜#61 |
| ADR-006（失効と継続評価）、DL-56、DL-78/79 | 検知から全 session・refresh token の失効、CAEP（session-revoked、credential-change、risk-level-change 等）の配信、悪性クライアント無効化時の既存 access token の失効（introspection 拒否または短寿命化）までを一連の手順にする [D]。 | RS-13#58、#61、#69、#70 |
| ADR-008（管理面と CI/CD）、DL-26 | テナント管理者による Conditional Access 相当のポリシー変更、MFA 方式の除外、端末登録を監視対象にし、変更時の通知と二者承認を設ける [D]。サポート担当者の調査ツールが session token を扱わない設計（HAR 等の受付時サニタイズ）にする [D]。 | RS-13#49、#68 |
| ADR-013（cell と fail-mode）、DL-19 | レート制限・ボット対策・リスクエンジンを cell 単位で動かし、一つのテナントへの攻撃が他テナントのログインを止めない設計にする [D]（前提: 基準シナリオ）。リスクエンジン障害時の動作（fail-open で追加認証なし／fail-closed で全員に追加認証）を操作階層ごとに決める [D]。 | RS-13#8、#46、#51 |
| ADR-014（監査データ）、DL-25 | 認証・回復・要素変更・管理操作・リスク判定の各イベントに、判定理由・使った特徴量の種類・判定モデルの版を記録する [D]。行動・位置などの特徴量はプライバシーリスク評価の対象にし、保持期間を定める [D]。 | RS-13#10、#17、#20、#69 |
| ADR-017（非人間 ID・AI エージェント） | 不正検知に AI/ML を使う場合、RP（テナント・利用サービス）への開示事項（用途、訓練データの説明、更新頻度、テスト結果）を定める [D]。 | RS-13#20 |
| ADR-019（侵害時 runbook）、DL-24 | runbook に「大規模 credential stuffing」「AiTM キャンペーン」「push bombing」「ヘルプデスク経由の乗っ取り」「悪性 OAuth アプリ」「device code キャンペーン」を加える [D]。各 runbook に、影響アカウントの特定、session・token 失効、パスワード強制変更、テナントへの信号と通知、法定報告の判断（GDPR 72 時間、個人情報保護法の速報・確報）を含める [D]。 | RS-13#26〜#29、#41、#42、#62 |
| ADR-001（build/buy）、DL-13 | ボット対策・リスクエンジン・IP インテリジェンスは購入候補とし、検知の real-time/offline 区分、判定根拠の取得可否、AI/ML の開示、データの所在地を評価軸に加える [D]。 | RS-13#20、#69 |
| DL-52（不正・濫用対策） | 本ノートの層構造（予防・検知・対応）と ATT&CK 対応表（RS-13#44）を統制カタログの初版として使う [D]。 | RS-13#44 ほか |
| DL-20（数値契約）R-188・R-195 | 「不正回復の検知時間」「検知から全 session 失効までの時間」「CAEP 配信遅延」「通知の到達時間」「誤検知率（正規ログインへの追加認証率）」を指標候補にする。値は TBD とし、BIA と PoC の実測で決める [D]。 | RS-13#19、#74〜#76 |
| DL-06（KRI） | フィッシング耐性方式の登録率と解除率、弱い方式の残存率、回復試行数、確定・疑い・申告ベースの不正率、ヘルプデスク経由の要素リセット件数を KRI 候補にする [D]。 | RS-13#19、#33、#35 |
| R-114（顧客通知）、DL-26、DL-34 | テナント向け通知を、SSF stream（機械可読）、監査 API（調査用）、契約上の通知（判断基準と期限）の三層で起案する [D]。処理者としての通知義務（GDPR 33 条 2 項、個人情報保護法 26 条 1 項ただし書）を契約条項に反映する [D]。 | RS-13#22、#41、#42、#70 |
| DL-34（適用性判定）、R-010、R-024 | 規制プロファイル（JSDA/金融庁の金商業者向け・保険会社向け等の監督指針、クレジット GL、PSD2 RTS、FFIEC）ごとにロックアウト回数・無操作時間・通知要件・フィッシング耐性の既定を表にし、テナント設定で切り替えられるようにする [D]。PSR と FCC SIM 規則は未確定として扱う [D]。 | RS-13#32〜#40 |
| DL-59（pentest・red team） | ヘルプデスク・サポートへのソーシャルエンジニアリング演習（電話・チャット、複数回の接触、特権者の再設定）を範囲に含める [D]。 | RS-13#26、#28、#31 |
| DL-106（見解相違ログ） | OWASP OAT Handbook の「定期的なパスワード失効」と 63B-4 の禁止の食い違い、DBSC 対応 Chrome 版の告知不一致、Token Protection の Apple 系表記の不一致を記録する [D]。 | RS-13#53、#65、#67 |

### 5.2 PoC で実測すべきこと（TC 番号は DL-22 で採番する）

1. AiTM 耐性: 検証環境で中間者プロキシ型のフィッシングを再現し、認証方式（パスワード＋TOTP、承認型 push、転記型 push、passkey、PKI）ごとに session の取得可否を測る [D]（RS-13#4、#27、#47、#80 から導出）。合否基準の案は「フィッシング耐性方式では取得 0 件」とする [D]。
2. push bombing: 送信回数上限・秘密の転記による承認率の変化と、正規利用者の完了時間・離脱率を測る [D]（RS-13#5、#24、#45 から導出）。
3. credential stuffing と password spraying: 合成した攻撃トラフィックと正規トラフィックを混ぜ、検知までの時間、正規ログインへの追加認証率（誤検知）、ロックアウトの巻き添え件数を、低速・分散（住宅用プロキシ相当）の攻撃も含めて測る [D]（RS-13#8、#46、#51、#62 から導出）。
4. RBA の閾値: As-Is のログイン履歴（入手できる場合）または合成データで、攻撃拒否率と再認証要求率の関係を測り、公開値（RS-13#74〜#76）と比べる [D]。
5. session 窃取: 別端末への cookie 再生を、DBSC あり・なし、短寿命 cookie、ネットワーク位置束縛で比べ、拒否までの時間を測る [D]（RS-13#16、#63〜#68 から導出）。
6. 失効の伝播: リスク検知から、全 session と refresh token の失効、CAEP 受信、下流サービス（約 300 の代表サンプル）での拒否までの時間の分布（p50/p99/最大）を測る [D]（RS-13#58、#69、#70 から導出、前提: 基準シナリオ）。
7. 悪性クライアントの無効化: クライアント無効化後に、既存 access token で資源にアクセスできる時間を測る [D]（RS-13#61 から導出）。
8. device code: 既定無効の強制と、例外テナントでの近接性確認・コード寿命の効果を確認する [D]（RS-13#56、#57、#59 から導出）。
9. 通知: 認証器の追加・回復・ログイン通知の到達時間と、独立経路（メール・SMS・push）の分離が保たれているかを試験する [D]（RS-13#10、#13 から導出）。
10. ヘルプデスク演習: 台本どおりのソーシャルエンジニアリング（複数回の電話、公開情報の利用）で、要素リセットが手順どおり拒否される割合と所要時間を測る [D]（RS-13#26、#28、#31 から導出）。
11. 容量: ログインのピーク時（基準シナリオ 100 万人の想定ピーク）に、リスク判定とボット判定を加えた認証の p99 遅延を測る [D]（前提: 基準シナリオ）。

---

## 6. 調査の限界と未確認事項

- 文書 ID の衝突: traceability/deliverables.md では RS-13 が「暗号移行・PQC・長期進化」（DL-97）に割り当てられている。本ノートは本ストリームへの指示どおり RS-13（不正・濫用対策）として作成した。DL-83（research/README.md）で調整が必要である。
- ATT&CK の主張タグ: ATT&CK の記載を [V]（公式文書の記載事実）として扱った。CONVENTIONS の区分に ATT&CK の明示がないため、判定は作成者以外のレビューで確認が必要である。手口の実在の根拠には [I] の原典を併記したが、全技術について [I] を揃えてはいない。
- OWASP Cheat Sheet・OAT Handbook・W3C Note を [N]（非規範と明記）で扱った。CONVENTIONS の [N] の定義に厳密には当てはまらない可能性がある。
- 保険会社向け監督指針: 版 0.1 では二次情報で存在を把握しただけだったが、版 0.2 で金融庁の公表ページと新旧対照表（別紙 2）を取得し、2026-07-17 適用の改正内容を確認した（RS-13#33a）。同日改正の別紙 3〜10（少額短期保険業者、貸金業者、金融サービス仲介業者、電子決済等代行業者、前払式支払手段発行者、資金移動業者向け）の内容は読んでいない。新旧対照表の列見出しは「改正案」のままであるが、公表ページは改正後の指針を同日から適用するとしている。
- EU PSR/PSD3 は状態だけを確認し、不正対策条文（なりすまし詐欺の返金、事業者間の不正情報共有等）の内容は原文で確認していない。英国の規制（PSR の APP 詐欺返金制度等）も調べていない。
- FFIEC ガイダンスは Federal Reserve SR 21-14 の添付で確認した。FFIEC 自身のサイトでの現行性（撤回・改訂の有無）は確認していない。OMB M-22-09 の現行性（2025 年以降の撤回・改訂の有無）も確認していない。
- FCC の SIM 変更規則は eCFR（2026-10-01 時点の版）の表示だけを確認し、FCC の命令文と遵守日に関する公告は読んでいない。
- DBSC: Chrome の対応版（145 か 146 か）は Google の公式告知間で一致していない。Edge・Safari・Firefox の対応状況、DBSC の企業向け拡張（DBSC(E)）や federated 向けクロスオリジン束縛の標準化状況は確認していない。Google の「session 窃取が大きく減った」という記述には数値がなく、効果の大きさは未確認である。
- OpenID SSF/CAEP/RISC 1.0 は、版 0.2 で OpenID Foundation の承認告知（2025-09-02）を確認し、Final Specification であることを確かめた（RS-13#70）。
- ITDR は公的機関の定義を見つけられなかった。§3 RS-13#72 の定義は本ノートの設計推論である。
- OWASP Cheat Sheet が引用する「Microsoft の分析では MFA が 99.9% の侵害を防いだ」という数値は、原典を確認していないため使っていない。
- 公開実測値の限界: Google（2019）は自社アカウントの古いデータで、その後の SIM swap や AiTM の普及を反映していない。Meyer ら（2023）は arXiv の論文（v1、2023-05-01 投稿のみ。abstract ページに Journal reference の記載なし）で、査読の有無は確認できていない。著者の所属（Microsoft）は PDF v1 の著者欄で確認した。版 0.1 にあった「arXiv の更新日が 2026-10-02 と表示される」という記述は、照合時の abstract ページに該当する表示がなく、削除した。Wiefling ら（2023）は攻撃者が模擬であり、AiTM や session 窃取は対象外である。いずれも本基盤の利用者構成（B2B・一般・従業員の混在）での値ではない。
- ヘルプデスクの本人確認手段（コールバック、ビデオ確認、待機時間等）の効果を定量化した一次資料は見つからなかった。
- 個人情報保護法の改正法（令和 8 年法律第 56 号）は、版 0.2 で e-Gov の改正履歴により公布日と施行段階を確認し、第 26 条の未施行版の文言を照合した（RS-13#42）。施行規則（第 7〜9 条）の改正予定と、改正法の他の条項の内容は確認していない。英国 GDPR、米国の州法の侵害通知、業界別（医療・決済の PCI DSS）の通知要件は確認していない。PCI DSS v4.0.1 の認証要件（ロックアウト回数等）は原文を取得していない。
- 63B-4 の節番号は HTML 版の見出し順と文書内の相互参照で特定した。PDF 版の印刷節番号との照合はしていない。
- 本ノートの数値（RS-13#36 の金融庁集計）は暫定値であり、更新で変わりうる。
- 事故の一次報告は本ストリームの論点に関係するもの（Uber、Cloudflare、Okta、Midnight Blizzard）に限った。網羅的な事故の整理は RS-12 に依拠している。
- 自前の実測はまだない。§5.2 はすべて計画である。

---

## 参考文献

[^1]: NIST『SP 800-63B-4 Digital Identity Guidelines: Authentication and Authenticator Management』Final, 2025-07（HTML 版の HTTP Last-Modified は 2025-08-26。ページ内に更新日の表示はない）. https://pages.nist.gov/800-63-4/sp800-63b.html （参照箇所: §2.2.2, §2.2.3, §2.3.2, §2.3.3, §3.1.1.2, §3.1.3, §3.1.3.1〜§3.1.3.3, §3.2.2, §3.2.5, §3.2.9, §4.1, §4.1.2.1, §4.2, §4.2.1, §4.2.2.2, §4.2.3, §4.3, §4.5, §4.6, §5.1, §5.1.1, §5.1.2, §5.2, §5.3, §6.2 Table 4, §6.3, App. B、確認日: 2026-10-03）
[^2]: NIST CSRC『SP 800-63B-4 (Final) 公表ページ』2025-07. https://csrc.nist.gov/pubs/sp/800/63/b/4/final （参照箇所: Date Published、History「07/31/25: SP 800-63B-4 (Final)」、Supersedes、確認日: 2026-10-03）
[^3]: NIST『SP 800-63-4 Digital Identity Guidelines』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63.html （参照箇所: §1.3.1, §3.5, §3.5.1, §3.5.2 Table 4, §3.7, §3.8、確認日: 2026-10-03）
[^4]: NIST『SP 800-63A-4 Digital Identity Guidelines: Identity Proofing and Enrollment』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63a.html （参照箇所: §3.2, §3.2.1, §3.2.2, §3.2.3、確認日: 2026-10-03）
[^5]: NIST『SP 800-63C-4 Digital Identity Guidelines: Federation and Assertions』Final, 2025-07. https://pages.nist.gov/800-63-4/sp800-63c.html （参照箇所: §2.5, §4.8、確認日: 2026-10-03）
[^6]: CISA『Implementing Phishing-Resistant MFA』Fact Sheet, 2022-10. https://www.cisa.gov/sites/default/files/publications/fact-sheet-implementing-phishing-resistant-mfa-508c.pdf （参照箇所: Overview, Cyber Threats to MFA, Table 1, Phishing-Resistant MFA Implementations、確認日: 2026-10-03）
[^7]: CISA『Implementing Number Matching in MFA Applications』Fact Sheet, 2022-10. https://www.cisa.gov/sites/default/files/publications/fact-sheet-implement-number-matching-in-mfa-applications-508c.pdf （参照箇所: Overview, The Problem, Mitigation、確認日: 2026-10-03）
[^8]: CISA『Mobile Communications Best Practice Guidance』2024-12-18. https://www.cisa.gov/sites/default/files/2024-12/guidance-mobile-communications-best-practices.pdf （参照箇所: 項目 3「Migrate away from SMS-based MFA」、項目 5「Set a Telco PIN」、確認日: 2026-10-03）
[^9]: CISA, FBI ほか『AA23-320A Scattered Spider』2023-11-16 初版、2025-07-29 改訂. https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-320a （参照箇所: Overview（"According to public reporting" の列挙）、Technical Details（Initial Access の 2025-07-29 Update、Execution, Persistence）、Mitigations、Revisions、確認日: 2026-10-03）
[^10]: CISA, NCSC ほか『AA23-341A Russian FSB Cyber Actor Star Blizzard Continues Worldwide Spear-phishing Campaigns』2023-12-07. https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-341a （参照箇所: Technical Details、ATT&CK 表 T1539/T1550.004、確認日: 2026-10-03）
[^11]: UK NCSC『Incidents impacting retailers – recommendations from the NCSC』2025-05-04. https://www.ncsc.gov.uk/blog-post/incidents-impacting-retailers （参照箇所: 推奨事項の箇条書き、確認日: 2026-10-03）
[^12]: FBI IC3『Kali365 Phishing-as-a-Service Kit Hijacks Microsoft 365 Access Tokens』Alert I-052126-PSA, 2026-05-21. https://ic3.gov/PSA/2026/PSA260521 （参照箇所: How the Scam Works、Tips to Protect Yourself、確認日: 2026-10-03）
[^13]: OMB『M-22-09 Moving the U.S. Government Toward Zero Trust Cybersecurity Principles』2022-01-26. https://www.whitehouse.gov/wp-content/uploads/2022/01/M-22-09.pdf （参照箇所: Identity 2. Multi-factor authentication（staff と public-facing systems の要件）、確認日: 2026-10-03）
[^14]: FFIEC『Authentication and Access to Financial Institution Services and Systems』2021-08-11（Federal Reserve SR 21-14 添付版）. https://www.federalreserve.gov/supervisionreg/srletters/sr2114.pdf （参照箇所: Section 4 Layered Security, Section 5, Section 6, Section 8 Call Center and IT Help Desk Authentication, Appendix（Customer Call Centers and IT Help Desks Controls, Customer Controls, Transaction Logging and Monitoring Controls）、確認日: 2026-10-03）
[^15]: eCFR『47 CFR § 64.2010 Safeguards on the disclosure of customer proprietary network information』2026-10-01 時点の版（"up to date as of 10/01/2026"。同条の最終改正 89 FR 47870, 2024-06-04）. https://www.ecfr.gov/current/title-47/part-64/section-64.2010 （参照箇所: (h)(1), (h)(7), (h)(9)、確認日: 2026-10-03）
[^16]: 金融庁『「金融商品取引業者等向けの総合的な監督指針」等の一部改正（案）に対するパブリックコメントの結果等の公表について』2025-10-15. https://www.fsa.go.jp/news/r7/shouken/20251015/20251015.html （参照箇所: 1. 改正の概要、2. 適用日等、確認日: 2026-10-03）
[^17]: 金融庁『「金融商品取引業者等向けの総合的な監督指針」の一部改正（新旧対照表）』（別紙 2）2025-10-15. https://www.fsa.go.jp/news/r7/shouken/20251015/02.pdf （参照箇所: Ⅲ－２－８－２－２（１）（２）（３）、確認日: 2026-10-03）
[^18]: 日本証券業協会『「インターネット取引における不正アクセス等防止に向けたガイドライン」の改正について』（改正後ガイドライン本文を含む）2025-10-15. https://www.jsda.or.jp/houdou/2025/20251015fuseiaccess-guideline.pdf （参照箇所: 改正の趣旨・施行時期、ガイドライン Ⅳ.1.(2)①〜④・脚注 4・脚注 6、Ⅳ.1.(3)、Ⅳ.4.(1)、確認日: 2026-10-03）
[^19]: 金融庁『インターネット取引サービスへの不正アクセス・不正取引にご注意ください』2025-04-03（2026-09-09 更新）. https://www.fsa.go.jp/ordinary/chuui/chuui_phishing.html （参照箇所: 注記※1〜※3、利用者への留意事項、確認日: 2026-10-03）
[^20]: 金融庁『インターネット取引サービスへの不正アクセス・不正取引の発生状況』2026-09-09. https://www.fsa.go.jp/ordinary/chuui/chuui_phishing/20260909.pdf （参照箇所: 月別表 2025/1〜2026/8 と合計欄、確認日: 2026-10-03）
[^21]: クレジット取引セキュリティ対策協議会『クレジットカード・セキュリティガイドライン【6.1 版】』2026-03. https://www.j-credit.or.jp/security/pdf/Creditcardsecurityguidelines_6.1_published.pdf （参照箇所: 冒頭「指針対策」の説明、EC 加盟店が講じる具体的な対策「ⅳ.不正ログイン対策」の対策項目表（pp.37–38 付近）、確認日: 2026-10-03）
[^22]: European Commission『Commission Delegated Regulation (EU) 2018/389 (RTS on strong customer authentication and common and secure open standards of communication)』OJ L 69, 2018-03-13. https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32018R0389 （参照箇所: Art. 2, Art. 3, Art. 4(3)(b)(d), Art. 4(4), Art. 18、確認日: 2026-10-03）
[^23]: European Parliament『Legislative Train: Payment services regulation』2026-09-20 更新. https://www.europarl.europa.eu/legislative-train/theme-an-economy-that-works-for-people/file-revision-of-eu-rules-on-payment-services （参照箇所: 手続状況（暫定合意、ECON 承認、正式採択の要否）、確認日: 2026-10-03）
[^24]: European Parliament and Council『Regulation (EU) 2016/679 (GDPR)』2016-04-27. https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679 （参照箇所: Art. 33(1), (2)、確認日: 2026-10-03）
[^25]: 個人情報保護委員会『個人情報の保護に関する法律施行規則』（e-Gov 法令 API 取得版）. https://laws.e-gov.go.jp/law/428M60020000003 （参照箇所: 第 7 条、第 8 条、第 9 条、確認日: 2026-10-03）
[^26]: MITRE『ATT&CK Versions』v19.2. https://attack.mitre.org/resources/versions/ （参照箇所: Current Version「ATT&CK v19.2 April 28, 2026 - current」、確認日: 2026-10-03）
[^27]: MITRE『ATT&CK Updates - April 2026』v19. https://attack.mitre.org/resources/updates/updates-april-2026/ （参照箇所: 概要（Defense Evasion の分割）、Object revocations「Impersonation (revoked by Social Engineering: Impersonation)」、確認日: 2026-10-03）
[^28]: MITRE『ATT&CK Updates - August 2026』v19.2. https://attack.mitre.org/resources/updates/updates-august-2026/ （参照箇所: 概要、ShinyHunters (G1057)、Kali365 (S9044)、確認日: 2026-10-03）
[^29]: MITRE ATT&CK『T1078 Valid Accounts』Version 3.0, Last Modified 2026-05-12. https://attack.mitre.org/techniques/T1078/ （参照箇所: 説明、メタデータ、確認日: 2026-10-03）
[^30]: MITRE ATT&CK『T1078.004 Valid Accounts: Cloud Accounts』Version 2.0, Last Modified 2026-05-12. https://attack.mitre.org/techniques/T1078/004/ （参照箇所: 説明、メタデータ、確認日: 2026-10-03）
[^31]: MITRE ATT&CK『T1110.003 Brute Force: Password Spraying』Version 1.8, Last Modified 2025-10-24. https://attack.mitre.org/techniques/T1110/003/ （参照箇所: 説明、Mitigations M1036/M1032/M1027、確認日: 2026-10-03）
[^32]: MITRE ATT&CK『T1110.004 Brute Force: Credential Stuffing』Version 1.7, Last Modified 2026-05-12. https://attack.mitre.org/techniques/T1110/004/ （参照箇所: 説明、Mitigations M1036/M1032/M1027/M1018、確認日: 2026-10-03）
[^33]: MITRE ATT&CK『T1111 Multi-Factor Authentication Interception』Version 2.1, Last Modified 2026-05-12. https://attack.mitre.org/techniques/T1111/ （参照箇所: 説明、メタデータ、確認日: 2026-10-03）
[^34]: MITRE ATT&CK『T1528 Steal Application Access Token』Version 1.5, Last Modified 2026-05-12. https://attack.mitre.org/techniques/T1528/ （参照箇所: 説明（OAuth 悪性アプリ、refresh token）、Mitigations M1047/M1021、確認日: 2026-10-03）
[^35]: MITRE ATT&CK『T1539 Steal Web Session Cookie』Version 1.5, Last Modified 2026-05-12. https://attack.mitre.org/techniques/T1539/ （参照箇所: 説明（Evilginx2/Muraena）、Mitigations M1047/M1032/M1021/M1054、確認日: 2026-10-03）
[^36]: MITRE ATT&CK『T1550.004 Use Alternate Authentication Material: Web Session Cookie』Version 2.0, Last Modified 2026-05-12. https://attack.mitre.org/techniques/T1550/004/ （参照箇所: 説明、Mitigations M1054、確認日: 2026-10-03）
[^37]: MITRE ATT&CK『T1556.006 Modify Authentication Process: Multi-Factor Authentication』Version 2.0, Last Modified 2026-05-12. https://attack.mitre.org/techniques/T1556/006/ （参照箇所: 説明、Mitigations M1047/M1032/M1018、確認日: 2026-10-03）
[^38]: MITRE ATT&CK『T1556.009 Modify Authentication Process: Conditional Access Policies』Version 2.0, Last Modified 2026-05-12. https://attack.mitre.org/techniques/T1556/009/ （参照箇所: 説明、確認日: 2026-10-03）
[^39]: MITRE ATT&CK『T1621 Multi-Factor Authentication Request Generation』Version 1.2, Last Modified 2025-10-24. https://attack.mitre.org/techniques/T1621/ （参照箇所: 説明（SSPR を含む）、Mitigations M1036/M1032/M1017、確認日: 2026-10-03）
[^40]: MITRE ATT&CK『T1557 Adversary-in-the-Middle』Version 2.5, Last Modified 2026-05-12. https://attack.mitre.org/techniques/T1557/ （参照箇所: 説明（access token と session cookie の傍受）、確認日: 2026-10-03）
[^41]: MITRE ATT&CK『T1566.002 Phishing: Spearphishing Link』Version 2.8, Last Modified 2026-05-12. https://attack.mitre.org/techniques/T1566/002/ （参照箇所: 説明（consent phishing）、確認日: 2026-10-03）
[^42]: MITRE ATT&CK『T1684.001 Social Engineering: Impersonation』Version 1.0, Created 2026-04-14, Last Modified 2026-05-12. https://attack.mitre.org/techniques/T1684/001/ （参照箇所: 説明、Mitigations M1019/M1017、旧 T1656 からのリダイレクト、確認日: 2026-10-03）
[^43]: MITRE ATT&CK『T1098.005 Account Manipulation: Device Registration』Version 1.4, Last Modified 2025-05-22. https://attack.mitre.org/techniques/T1098/005/ （参照箇所: 説明、確認日: 2026-10-03）
[^44]: MITRE ATT&CK Mobile『T1451 SIM Card Swap』Version 2.0, Last Modified 2025-02-12. https://attack.mitre.org/techniques/T1451/ （参照箇所: 説明、メタデータ、確認日: 2026-10-03）
[^45]: OWASP Cheat Sheet Series『Credential Stuffing Prevention Cheat Sheet』（版表記なし）. https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html （参照箇所: Introduction, Multi-Factor Authentication, Defense in Depth & Metrics, CAPTCHA, IP Mitigation and Intelligence, Device Fingerprinting, Require JavaScript and Block Headless Browsers, Notify users about unusual security events、確認日: 2026-10-03）
[^46]: OWASP Automated Threats to Web Applications『OAT-008 Credential Stuffing』（GitHub ソース）. https://github.com/OWASP/www-project-automated-threats-to-web-applications/blob/master/assets/oats/EN/OAT-008_Credential_Stuffing.md （参照箇所: Definition, Summary Defining Characteristics, Description、確認日: 2026-10-03）
[^47]: OWASP『Automated Threat Handbook - Web Applications』v1.30, 2026-03-17. https://github.com/OWASP/www-project-automated-threats-to-web-applications/blob/master/assets/files/EN/automated-threat-handbook-EN-1v30.pdf （参照箇所: Figure 8 Countermeasure Classes, OAT-008 Suggested Threat-Specific Countermeasures, changelog.txt v1.30、確認日: 2026-10-03）
[^48]: OWASP『Application Security Verification Standard 5.0.0, V6 Authentication』2025-05. https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/en/0x15-V6-Authentication.md （参照箇所: 6.1.1, 6.2.12, 6.3.1, 6.3.5, 6.3.7, 6.3.8, 6.4.3, 6.6.1, 6.6.4, 6.8.4、確認日: 2026-10-03）
[^49]: OWASP『Application Security Verification Standard 5.0.0, V7 Session Management』2025-05. https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/en/0x16-V7-Session-Management.md （参照箇所: 7.1.1, 7.4.3, 7.4.5, 7.5.1, 7.5.2, 7.5.3、確認日: 2026-10-03）
[^50]: IETF『RFC 8628 OAuth 2.0 Device Authorization Grant』2019-08. https://www.rfc-editor.org/rfc/rfc8628 （参照箇所: §5.4 Remote Phishing、確認日: 2026-10-03）
[^51]: IETF『RFC 10027 Best Current Practice for Security of Cross-Device Flows』BCP 247, 2026-08. https://www.rfc-editor.org/rfc/rfc10027 （参照箇所: §2, §4.3.4.1, §4.3.4.2, §6.1.6, §6.1.11, §6.1.12, §6.2.1.5, §6.2.3.5、確認日: 2026-10-03）
[^52]: IETF『RFC 9700 Best Current Practice for OAuth 2.0 Security』BCP 240, 2025-01. https://www.rfc-editor.org/rfc/rfc9700 （参照箇所: §4.11.2、確認日: 2026-10-03）
[^53]: IETF『RFC 9470 OAuth 2.0 Step Up Authentication Challenge Protocol』2023-09. https://www.rfc-editor.org/rfc/rfc9470 （参照箇所: §3, §5、確認日: 2026-10-03）
[^54]: IETF『RFC 9576 The Privacy Pass Architecture』Informational, 2024-06. https://www.rfc-editor.org/rfc/rfc9576 （参照箇所: §3.2 Use Cases、RFC Editor のステータス表示（Informational）、確認日: 2026-10-03）
[^55]: OpenID Foundation『OpenID Shared Signals Framework Specification 1.0』2025-08-29. https://openid.net/specs/openid-sharedsignals-framework-1_0-final.html （参照箇所: 表題・Published、確認日: 2026-10-03）
[^56]: OpenID Foundation『OpenID Continuous Access Evaluation Profile 1.0』2025-08-29. https://openid.net/specs/openid-caep-1_0-final.html （参照箇所: §3 Event Types（session-revoked〜risk-level-change）、§3.8、確認日: 2026-10-03）
[^57]: OpenID Foundation『OpenID RISC Profile Specification 1.0』2025-08-29. https://openid.net/specs/openid-risc-1_0-final.html （参照箇所: Event Types（credential-compromise、recovery-activated ほか）、確認日: 2026-10-03）
[^58]: W3C Web Application Security WG『Device Bound Session Credentials』First Public Working Draft, 2025-08-21. https://www.w3.org/TR/2025/WD-dbsc-1-20250821/ （参照箇所: Status of this document、Abstract、W3C 公表履歴、確認日: 2026-10-03）
[^59]: W3C Web Application Security WG『Device Bound Session Credentials』Editor's Draft, 2026-09-08. https://w3c.github.io/webappsec-dbsc/ （参照箇所: Status, §2 Security Considerations, §2.1 Non-goals, §3 Privacy Considerations、確認日: 2026-10-03）
[^60]: Google（Chrome for Developers）『Device Bound Session Credentials now available on Windows』最終更新 2026-03-03. https://developer.chrome.com/blog/dbsc-windows-announcement （参照箇所: 本文冒頭（Chrome 145）、How DBSC works、確認日: 2026-10-03）
[^61]: Google『Protecting cookies with Device Bound Session Credentials』2026-04-09. https://blog.google/security/protecting-cookies-with-device-bound-session-credentials/ （参照箇所: 冒頭（Chrome 146）、How DBSC Works、Future improvements、確認日: 2026-10-03）
[^62]: Google Workspace Updates『Prevent account takeovers with Device Bound Session Credentials (DBSC), now generally available in the Chrome browser for Windows』2026-05-28. https://workspaceupdates.googleblog.com/2026/05/prevent-account-takeovers-with-DBSC-now-generally-available-in-the-Chrome-browser-for-Windows.html （参照箇所: 本文、Rollout pace、Availability、確認日: 2026-10-03）
[^63]: Microsoft Learn『Token Protection in Microsoft Entra Conditional Access』ms.date 2026-08-14. https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-token-protection （参照箇所: Overview, Platform availability, Supported devices、確認日: 2026-10-03）
[^64]: Microsoft Learn『Protect against consent phishing』ms.date 2023-12-11. https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/protect-against-consent-phishing （参照箇所: What is consent phishing?, Mitigating consent phishing attacks, Best practices、確認日: 2026-10-03）
[^65]: Microsoft Learn『Authentication flows as a condition in Conditional Access policy』ms.date 2026-03-24. https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-authentication-flows （参照箇所: Device code flow、確認日: 2026-10-03）
[^66]: Microsoft Learn『What are risk detections?（Microsoft Entra ID Protection）』ms.date 2026-04-22. https://learn.microsoft.com/en-us/entra/id-protection/concept-identity-protection-risks （参照箇所: Sign-in risk detections 表、User risk detections 表、確認日: 2026-10-03）
[^67]: Microsoft Threat Intelligence『Midnight Blizzard: Guidance for responders on nation-state attack』2024-01-25. https://www.microsoft.com/en-us/security/blog/2024/01/25/midnight-blizzard-guidance-for-responders-on-nation-state-attack/ （参照箇所: Initial access through password spray, Malicious use of OAuth applications, Use of residential proxy infrastructure、確認日: 2026-10-03）
[^68]: Uber『Security update』記事日付 2022-09-16（最初の記載は 2022-09-15 18:25 PT）、2022-09-19 10:45 PT 更新. https://www.uber.com/en-US/newsroom/security-update/ （参照箇所: September 19 更新「What happened?」「How did we respond?」、確認日: 2026-10-03）
[^69]: Cloudflare『The mechanics of a sophisticated phishing scam and how we stopped it』2022-08-09. https://blog.cloudflare.com/2022-07-sms-phishing-attacks/ （参照箇所: 本文（76 人、3 人、FIDO2 キー）、確認日: 2026-10-03）
[^70]: Okta『Unauthorized Access to Okta's Support Case Management System: Root Cause and Remediation』2023-11-03. https://sec.okta.com/articles/2023/11/unauthorized-access-oktas-support-case-management-system-root-cause （参照箇所: 概要、タイムライン、Remediation 4「Binding Okta administrator session tokens based on network location」、確認日: 2026-10-03）
[^71]: NIST『The NIST Cybersecurity Framework (CSF) 2.0』CSWP 29, 2024-02. https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf （参照箇所: Appendix A Core（PR.AA-03, DE.CM-03, DE.AE-02, DE.AE-03, RS.MI-01）、確認日: 2026-10-03）
[^72]: Google Security Blog（K. Thomas, A. Moscicki）『New research: How effective is basic account hygiene at preventing hijacking』2019-05-17. https://security.googleblog.com/2019/05/new-research-how-effective-is-basic.html （参照箇所: Google's automatic, proactive hijacking protection の節、確認日: 2026-10-03）
[^73]: L. A. Meyer, S. Romero, G. Bertoli, T. Burt, A. Weinert, J. L. Ferres『How effective is multifactor authentication at deterring cyberattacks?』arXiv:2305.00945v1, 2023-05-01. https://arxiv.org/abs/2305.00945 （参照箇所: Abstract、PDF v1 の著者欄（所属: Microsoft Corporation）、確認日: 2026-10-03）
[^74]: S. Wiefling ほか『Pump Up Password Security! Evaluating and Enhancing Risk-Based Authentication on a Real-World Large-Scale Online Service』ACM TOPS 26(1), Article 6, 2023-02（arXiv:2206.15139v2）. https://arxiv.org/abs/2206.15139 （参照箇所: Abstract, §1 の結果要約, RQ1c, RQ1d の結果（本文は PDF v2 https://arxiv.org/pdf/2206.15139v2 で確認）、確認日: 2026-10-03）
[^75]: W3C Accessible Platform Architectures WG『Inaccessibility of CAPTCHA』Group Draft Note, 2021-12-16. https://www.w3.org/TR/turingtest/ （参照箇所: Abstract、結論部、確認日: 2026-10-03）
[^76]: 『個人情報の保護に関する法律』（平成 15 年法律第 57 号、e-Gov 法令 API 取得版）. https://laws.e-gov.go.jp/law/415AC0000000057 （参照箇所: 第 26 条第 1 項・第 2 項、確認日: 2026-10-03）
[^77]: NIST CSRC『SP 800-63-4 (Final) 公表ページ』2025-07. https://csrc.nist.gov/pubs/sp/800/63/4/final （参照箇所: Date Published、History「07/31/25: SP 800-63-4 (Final)」、確認日: 2026-10-03）
[^78]: NIST CSRC『SP 800-63A-4 (Final) 公表ページ』2025-07. https://csrc.nist.gov/pubs/sp/800/63/a/4/final （参照箇所: Date Published、History「07/31/25: SP 800-63A-4 (Final)」、確認日: 2026-10-03）
[^79]: NIST CSRC『SP 800-63C-4 (Final) 公表ページ』2025-07. https://csrc.nist.gov/pubs/sp/800/63/c/4/final （参照箇所: Date Published、History「07/31/25: SP 800-63C-4 (Final)」、確認日: 2026-10-03）
[^80]: IETF『RFC 9577 The Privacy Pass HTTP Authentication Scheme』Proposed Standard, 2024-06. https://www.rfc-editor.org/rfc/rfc9577 （参照箇所: RFC Editor のステータス表示、確認日: 2026-10-03）（版 0.2 で追加）
[^81]: IETF『RFC 9578 Privacy Pass Issuance Protocols』Proposed Standard, 2024-06. https://www.rfc-editor.org/rfc/rfc9578 （参照箇所: RFC Editor のステータス表示、確認日: 2026-10-03）（版 0.2 で追加）
[^82]: OpenID Foundation『Three Shared Signals Final Specifications Approved』2025-09-02. https://openid.net/three-shared-signals-final-specifications-approved/ （参照箇所: 本文（承認された 3 仕様の URL、投票結果）、確認日: 2026-10-03）（版 0.2 で追加）
[^83]: 金融庁『「保険会社向けの総合的な監督指針」等の一部改正（案）に対するパブリックコメントの結果等の公表について』2026-07-17. https://www.fsa.go.jp/news/r8/sonota/20260717-2/20260717.html （参照箇所: 1. 改正の概要、2. 適用日等、別紙 1〜10 の一覧、確認日: 2026-10-03）（版 0.2 で追加）
[^84]: 金融庁『「保険会社向けの総合的な監督指針」の一部改正（新旧対照表）』（別紙 2）2026-07-17. https://www.fsa.go.jp/news/r8/sonota/20260717-2/02.pdf （参照箇所: Ⅱ－３－１３－２－２ インターネット取引（－１ 意義、－２ 主な着眼点（１）〜（３））、確認日: 2026-10-03）（版 0.2 で追加）
[^85]: デジタル庁 e-Gov 法令 API『個人情報の保護に関する法律 改正履歴（law_revisions）』および未施行版の法令本文. https://laws.e-gov.go.jp/api/2/law_revisions/415AC0000000057 （参照箇所: 令和 8 年法律第 56 号の公布日・施行日・施行状態、版 415AC0000000057_20280716_508AC0000000056 の第 26 条、確認日: 2026-10-03）（版 0.2 で追加）
