# RS-05 root of trust・鍵管理・供給網 調査ノート

> 文書ID: RS-05 / 版: 0.2 / 状態: draft / 最終更新: 2026-10-03
> 独立検証: research/verification/RS-05-verification.md（2026-10-03、作成者以外による脚注全件の原典照合。v0.2 で修正を反映）
> 対応要求: R-049〜R-057（root of trust 9件）, R-073, R-101, R-104, R-110, R-113, R-115, R-161, R-162, R-168, R-184, R-187, R-189（特に R-189.6）
> 依存文書: CONVENTIONS.md, traceability/seed/seed-01-ciso-assurance.md, traceability/seed/seed-02-cto-technical.md（3-1〜3-7）, traceability/seed/seed-03-redteam-decision.md
> 作成方法: AI エージェント（Claude）が一次資料（NIST CSRC/nvlpubs、RFC Editor/IETF Datatracker、OpenID Foundation、CSRB/CISA、MSRC、各クラウド公式文書、IANA、SLSA、Sigstore、OPA）を取得・本文照合して作成した。種資料（seed-01〜03）は問いの手掛かりとしてのみ使い、根拠には引用していない。前提台帳（01_governance/assumptions-register.md）は未作成のため、仮定 ID（A-xxx）は未採番であり、仮定に依存する推論はその旨を本文に記す。
> 凡例: `[M]` はベンダー公表の測定値（測定条件を併記）に用いる。NIST CMVP の認証記録は製品に関する公的記録として `[V]` を付す。SLSA（OpenSSF）は業界仕様の原典として `[N]` を付す。

## 1. 調査の問い

seed-02 §3（3-1〜3-7）由来の問い:

1. 鍵階層（オフライン root → issuer 署名鍵、用途別分離、issuer 共通かテナント別か）を規範はどう求めているか（seed-02 3-1）。
2. KMS と専用 HSM の違い（FIPS レベル、署名スループット・クォータ、リージョン障害、PQ 署名対応）は何か（seed-02 3-2）。
3. key ceremony と rotation（旧鍵併存、JWKS cache 最大齢、鍵年齢アラート、緊急失効時間）の公開事例と規範は何か（seed-02 3-3）。
4. 鍵 → issuer → テナント → token 種別の結合をどの層で検証すべきか（seed-02 3-4）。
5. 管理面（AS / PAP / KMS / HSM / JWKS 公開）の保護と、自社 IdP で自社 IdP 管理者を認証する循環依存の断ち方は何か（seed-02 3-5）。
6. CI/CD の保護（SLSA レベル、policy bundle 署名、policy リポジトリ二者レビュー）の規範は何か（seed-02 3-6）。
7. 署名鍵漏えい時の runbook 要素（全 token 失効、JWKS 差替え、下流 cache 強制更新、通知）の根拠は何か（seed-02 3-7）。

本ストリームで追加した問い:

8. FIPS 140-2 証明書の Historical List 移行（2026-09）が HSM 調達要件に与える影響は何か。
9. 主要クラウド KMS は非対称署名鍵の自動 rotation を提供するか（rotation の責任分界）。
10. NIST SP 800-57 Part 1 Rev6 ipd は Rev5 から鍵用途分離・cryptoperiod の規範強度を変えているか。
11. 内部用 token（service 間の代理 token 等）を外部 token と同じ統制下に置く必要性を示す一次報告はあるか（CVE-2025-55241）。
12. rotation 自体が可用性障害の原因になる事例はあるか。
13. 鍵系システムの監査ログはどの範囲・期間で保持すべきか。
14. policy bundle の署名検証は「改ざん」と「旧版の再提示（rollback）」の双方を防げるか。
15. 鍵 ceremony の証跡（seed-01 E8/E10）として公開事例は何を残しているか。

## 2. 結論サマリ

1. 鍵の保護強度とは独立に、鍵と issuer・テナント（cell）・token 種別のスコープ結合を検証側が欠くと、1本の鍵漏えいが全域の偽造に拡大し得る[I][^18]。Storm-0558 では consumer 用に 2016 年に作成された鍵が、共通 OIDC endpoint と SDK の検証不足により enterprise 向け token の署名としても受理された[I][^18][^21]。RFC 8725 は JWT の鍵が issuer に属することの検証を MUST と定める[N][^14]。本基盤の検証ライブラリは「(iss, kid, typ) → 許可鍵集合」の結合を必須機能とし、負例試験で閉じるべきである[D]（根拠: RS-05#21, #22, #36, #37）。
2. 鍵年齢の監視と自動 rotation の欠落は、CSRB が「2016 年鍵が 2023 年に有効だった」直接要因として挙げている[I][^18]。SP 800-57 Part 1 Rev5 は私有署名鍵の最大 cryptoperiod を約1〜3年と推奨（recommended）し、期間終了時の破棄を shall とする[N][^1]。最長稼働鍵年齢を KRI とし、閾値超過を発行停止に連動させる設計が要る[D]（根拠: RS-05#3, #20, #22）。
3. 主要クラウド KMS は JWT 署名に使う非対称鍵の自動 rotation を提供しない（AWS KMS、Google Cloud KMS）[V][^33][^48]。Azure Managed HSM は rotation policy を持つが、自動 rotation の最短間隔は28日、1鍵あたり100版の上限がある[V][^44]。JWKS への事前公開 → 署名切替 → 旧鍵保持 → 撤去 → 破棄の一連は自社のオーケストレーションと試験の責任になる[D]（根拠: RS-05#45, #56, #61）。
4. rotation 自体が可用性障害源になり得る[I][^18]。CSRB は、Microsoft が手動 rotation に関連した大規模障害の後、2021 年に consumer 鍵の rotation を全面停止したと記す[I][^18]。rotation は自動化・段階展開・ロールバック可能な変更として扱い、PoC で反復演習すべきである[D]（根拠: RS-05#18）。
5. 公表されている署名能力の値はベンダー間で桁が異なる（ただしクォータ既定値と性能目安という性質の異なる値の比較である）[D]（根拠: RS-05#44, #54, #59）。AWS KMS の非対称署名の既定クォータは鍵種別ごとに 1,000 req/s（アカウント×リージョン共有、調整可）[V][^32]、Azure Managed HSM の P-256 署名は 330 ops/s（1パーティション・単一鍵の最良値）[M][^42]、Google Cloud HSM は既定の token 枠から換算すると P-256 署名で毎秒約11回相当（soft enforcement）である[D][^46]。全 token を KMS/HSM で直接署名する案の採否は、発行ピーク（BIA と前提台帳で確定、A-ID 未採番）と PoC の実測を比べるまで決められない[D]（根拠: RS-05#44, #50, #54, #58, #59）。
6. CSRB は、規模によっては従来型 HSM が成立しない場合があると認めたうえで「isolated key storage with minimal key release」を求めた[I][^18]。Microsoft は、HSM 保管、人手を介さない自動 rotation、confidential VM 上の署名サービスへの移行を報告している[I][^22][^24]。鍵階層は「オフライン root（ceremony 管理）＋ HSM/KMS 内の非エクスポート issuer 鍵」を基本とし、性能上の例外は隔離実行環境と鍵放出の最小化を条件に限定すべきである[D]（根拠: RS-05#25, #27, #30, #31）。
7. 標準的な OIDC/JWT 検証では、検証者は issuer metadata が示す jwks_uri から取得した鍵で署名を検証する[N][^14][^16]。両仕様の手順には、オフライン root からの署名連鎖の検証は含まれない[D]（根拠: RS-05#36, #39）。このため token 署名鍵の root of trust は「issuer metadata・jwks_uri・TLS・JWKS 公開パイプラインを誰が変更できるか」に帰着する[D]。JWKS 公開は管理面（ADR-008）として二者統制の対象にすべきである[D]（根拠: RS-05#12, #36, #39）。
8. 緊急失効は JWKS から鍵を外すだけでは完了しない[D]（根拠: RS-05#23, #40）。Microsoft が推奨する検証側キャッシュ（TTL 24時間・1時間ごとの更新・取得失敗時は last known good を継続）に従うと、削除済み鍵が最大で TTL まで受理され得る[V][^27][D]。Storm-0558 でも Microsoft は下流システムのキャッシュを消去して派生資格情報を無効化した[I][^18]。R-189.6（JWKS cache 最大齢）は BIA から決め、JWKS 取得とは独立した失効 kid の配信経路を設けるべきである[D]（根拠: RS-05#23, #40）。
9. 内部 token も外部 token と同じ profile・署名・発行ログ・テナント検証の対象にする必要がある[D]。CVE-2025-55241（MSRC 公表の CVSS 3.1 基本値 10.0）について、発見者の一次報告によれば、未署名の内部 impersonation token をレガシー API がテナント不一致のまま受理し、actor token の発行時のログもなかった[I][^25][^26]。これらの技術的詳細は発見者の報告に基づき、Microsoft の公表（Security Update Guide）は CVSS・CWE・緩和済みである旨に限られる（根拠: RS-05#33, #34）。
10. CMVP の移行予定表では、FIPS 140-2 の認証は 2026-09-21 までで Historical List へ移され、2026-09-22 に全証明書が Historical List に置かれる[N][^9]。確認日に抽出照合した FIPS 140-2 証明書（2022-12〜2023-09 検証の5件）はいずれも「Moved to historical list due to sunsetting」の Historical であった[V][^64]。Historical の認証について CMVP は「Federal Agencies should not include these in new systems」とする[N][^10]。確認日時点で Google Cloud HSM の公式文書は「FIPS 140-2 Level 3」と記載している[V][^45]。HSM の調達要件は、FIPS 140-3 Level 3 の有効な証明書番号の提示と照合にすべきである[D]（根拠: RS-05#14〜#17, #57）。
11. PQ 署名の提供状況は不均一である[V][^34][^43][^47]。AWS KMS は ML-DSA-44/65/87 を提供し[V][^34]、Google Cloud KMS は software 保護レベルに限られ[V][^47]、Azure Managed HSM の鍵種別一覧には PQ 署名がない[V][^43]。JOSE 用 ML-DSA は RFC 9964 で標準化され、署名長は 2,420〜4,627 バイトである[N][^17]。NIST IR 8547 ipd は 112-bit 強度の RSA/ECDSA を 2030 年より後（after 2030）は非推奨、128-bit 以上を含め 2035 年より後は不許可とする案である[N][^12]。20年計画の中で署名アルゴリズムの移行が少なくとも1回は起きる前提で、KMS 選定と token サイズ上限を設計すべきである[D]（前提: CONVENTIONS §7 の計画期間20年。根拠: RS-05#62〜#67）。
12. 公開されている key ceremony の事例（IANA Root KSK）は、起動資格を組織外の Crypto Officer 7名中3名に分散し、独立監査人を quorum に参加させない[V][^50]。各 ceremony では、注釈付き台本、3台の監査カメラ映像、署名ログ、署名用 OS イメージの SHA-256 を公開している[V][^52]。本基盤のオフライン root ceremony の証跡様式（E8/E10）に転用できる[D]（根拠: RS-05#68〜#73）。
13. 管理面の循環依存を断つ公開手法として、Entra の緊急アクセスアカウントは非フェデレーション・別系統の phishing 耐性認証・Conditional Access 除外・90日ごとの検証を求める[V][^53]。Managed HSM は、サブスクリプション管理者でも上書きできない local RBAC と、quorum による security domain を持つ[V][^40][^41]。KMS/HSM・JWKS 公開・CI 署名鍵の管理者認証を、本基盤の AS に依存させるべきではない[D]（根拠: RS-05#52, #53, #74, #75）。
14. SLSA v1.2（Approved、2025-11-24 公表）は、Build L3 で provenance 署名用の秘密を build 手順から隔離することを求め、Source L4 で保護ブランチ変更の二者合意を MUST とする[N][^55][^56]。OPA は署名検証に失敗すると既存 bundle を使い続ける[V][^62]。ただし、署名済み旧版の再提示（rollback）を拒否する仕組みは本調査で読んだ公式記述では確認できず、版の単調性検証を自前で設計・試験する必要がある[D]（根拠: RS-05#77, #78, #82）。
15. CSRB 勧告5は、鍵システムへの全アクセスの記録と、鍵の有効期間に加えて少なくとも2年の保持（一部のログは10年以上）を推奨する[I][^18]。Microsoft は identity 基盤の監査ログを2年保持し、署名鍵システムへのあらゆる操作でページングアラートを出すと報告している[I][^22]（根拠: RS-05#26, #30）。

## 3. 調査結果

### 3.1 NIST 鍵管理規範（SP 800-57 / 800-130 / 800-152 / 800-53）

- **RS-05#1** SP 800-57 Part 1 Rev5（final, 2020-05）§5.2 は、1本の鍵を1つの用途にのみ使うことを shall で求め、その理由の1つに侵害時の被害限定を挙げる[N][^1]。
  - 原文: "In general, a single key shall be used for only one purpose (e.g., encryption, integrity authentication, key wrapping, random bit generation, or digital signatures)." / "Limiting the use of a key limits the damage that could be done if the key is compromised."（§5.2, p.33–34）
- **RS-05#2** Rev5 §5.3.1 は、cryptoperiod を左右する要因として、実装形態（FIPS 140 Level 4 かソフトウェアか）、運用環境、要員の異動、取引量、re-keying 方法などを列挙する[N][^1]。（§5.3.1, p.34–35）
- **RS-05#3** Rev5 §5.3.6 は私有署名鍵の最大 cryptoperiod を「約1〜3年」と推奨（recommended）し、cryptoperiod 終了時の破棄を shall とする[N][^1]。公開署名検証鍵の cryptoperiod は「数年オーダー」でよいとする[N][^1]。表1も私有署名鍵を「1 to 3 years」とする[N][^1]。
  - 原文: "a maximum cryptoperiod of about one to three years is recommended. A private signature key shall be destroyed at the end of its cryptoperiod."（§5.3.6 は p.38 から始まり、1.b の該当文は p.39; Table 1, p.45）
- **RS-05#4** Rev5 §5.5.2 は保護措置として、平文の私有鍵を HSM 等の物理的に保護された容器に限定すること、平文の私有鍵へのアクセスを1件ずつ追跡する説明責任の仕組み、侵害回復計画を挙げる[N][^1]。侵害回復計画は「shall be documented and easily accessible」とされる[N][^1]。計画には、全鍵の所在の棚卸し、re-keying の監視などを含めるべき（should contain）とされる[N][^1]。無効となり得る署名の特定は、should contain の列挙ではなく「その他の侵害回復手順に含め得る（may include）」項目として挙げられている[N][^1]。（§5.5.2, p.50–52）
- **RS-05#5** Rev5 §5.5.2 は、1本の鍵の侵害で失われるデータができるだけ少なくなるようにシステムを設計すべき（should）とする[N][^1]。
  - 原文: "the system should be designed so that the compromise of a single key compromises as little data as possible (see SP 800-152)."（§5.5.2, p.51）
- **RS-05#6** Rev5 §6.2.3 は鍵メタデータの例として、鍵識別子、アルゴリズム、所有者、cryptoperiod の開始・終了日、鍵状態、状態履歴（失効理由を含む）、wrapping 鍵の識別を挙げ、メタデータは鍵に付随すべき（should）とする[N][^1]。（§6.2.3, p.78–79）
- **RS-05#7** SP 800-57 Part 1 Rev6 は 2025-12-05 に Initial Public Draft（ipd）として公表され、意見募集は 2026-02-05 に締め切られた[N][^2]。確認日時点で CSRC 上の final は公表されていない[N][^2]。主な変更として、FIPS 203/204/205 と Ascon の追加、アルゴリズム承認期限の記載削除（SP 800-131A を参照）、鍵保管に関する新節が示されている[N][^2]。
- **RS-05#8** Rev6 ipd §4.2 は鍵用途分離を「should be used for only one purpose」と記し、Rev5 §5.2 の shall から強度を下げている[N][^3]。一方、私有署名鍵の cryptoperiod（約1〜3年を suggested、期間終了時の破棄は shall）と侵害回復計画の文書化（shall）は維持している[N][^3]。（Rev6 ipd §4.2 PDF p.35; §4.3.6 PDF p.41; §4.5.2 PDF p.57）ipd は確定版ではないため、本基盤は Rev5 の shall を内部要求として維持すべきである[D]（根拠: RS-05#1, #7）。
- **RS-05#9** SP 800-130（final, 2013-08）§6.7.4 は、multiparty control を要する全機能と k・n を CKMS 設計で特定することを shall とし（FR:6.98）、k 人で可能かつ k−1 人で不可能である根拠の記載も shall とする（FR:6.99）[N][^4]。§6.7.5 は鍵分割の k・n の特定を shall とする（FR:6.100）[N][^4]。
  - 原文: "The CKMS design shall specify all functions that require multiparty control, specifying k and n for each function."（§6.7.4, p.58–59）
- **RS-05#10** SP 800-152（final, 2015-10）§6.7.4 は、High impact システムで CA 鍵の管理・使用に multiparty control を備えることを shall とし（PR:6.74）、Low/Moderate では should とする（PA:6.19）[N][^5]。同節は、CKMS 自身の保護に使う鍵（他の鍵へのアクセス鍵など）も特に懸念対象と明記する[N][^5]。（§6.7.4, p.66）
- **RS-05#11** SP 800-152 §6.8 は、侵害回復計画の作成・維持（PR:6.75/6.76）と、侵害の検知・疑い時の報告・原因と範囲の評価・緩和・再発防止・安全状態への復帰を shall とする[N][^5]。§6.8.1 は、侵害または侵害が疑われる鍵を保護の適用（署名生成等）に使ってはならない（must not）とし、鍵の迅速な失効・交換と依拠当事者への通知能力を持つべき（should）とする[N][^5]。（§6.8–6.8.1, p.67–68）
- **RS-05#12** SP 800-53 Rev5 には、特権コマンドの二者承認（AC-3(2)）、変更実施の二者承認（CM-5(4)）、承認済み証明書で署名されていない部品の導入防止（CM-14）、鍵の生成・配布・保管・アクセス・破棄要件の定義（SC-12）の統制がある[N][^6]。SC-12 の解説（Discussion。統制本文の要求ではない）は、組織が trust store を管理して承認済み trust anchor だけが含まれるようにすると述べる[N][^6]。（AC-3(2) p.23, CM-5(4) p.102, CM-14 p.114, SC-12 p.307）
  - 原文（CM-14）: "Prevent the installation of [Assignment: organization-defined software and firmware components] without verification that the component has been digitally signed using a certificate that is recognized and approved by the organization."
- **RS-05#13** SP 800-53 の現行は Release 5.2.0（2025-08-27 minor release）である[N][^7]。CSRC の告知に列挙された変更対象（SA-15(13)、SA-24、SI-02(07) 等）には AC-3、CM-5、CM-14、SC-12 が含まれない[N][^7]。

### 3.2 FIPS 140-3 と CMVP

- **RS-05#14** FIPS 140-3（final, 2019-03-22）は FIPS 140-2 を置き換え、4段階の質的セキュリティレベルを定める[N][^8]。適用対象は米連邦機関が運用する（または委託運用させる）暗号モジュールである（shall）[N][^8]。本基盤にとっては法的義務ではなく調達・評価の基準として参照するものである[D]（前提: CONVENTIONS §7 の法域。根拠: RS-05#14）。
- **RS-05#15** CMVP の移行告知によれば、FIPS 140-2 の認証は検証から5年または 2026-09-21 まで有効で、その後 Historical List へ移される[N][^9]。同ページは、2026-09-22 に全 FIPS 140-2 証明書が Historical List に置かれるとする（予定表の記載）[N][^9]。新規の FIPS 140-2 申請受付は 2022-04-01 に終了している[N][^9]。予定どおり移行したかを確認するため、確認日に CMVP の証明書ページを抽出照合したところ、本来の5年期限が 2027〜2028 年となる FIPS 140-2 証明書（#4400, #4450, #4500, #4550, #4600。2022-12〜2023-09 検証）はいずれも Status: Historical、Historical Reason:「Moved to historical list due to sunsetting」であった[V][^64]。全件の照合ではない。
- **RS-05#16** CMVP は Historical の認証について、米連邦機関は新規システムに含めるべきでない（should not）が、レガシーシステム向けには調達可能とする[N][^10]。Historical 化は認証の失効（revoke）を意味しないとも説明している[N][^10]。
  - 原文: "Federal Agencies should not include these in new systems but can be procured for legacy systems."
- **RS-05#17** CMVP 証明書 #4884（AWS Key Management Service HSM）は FIPS 140-3・Overall Level 3・Active・sunset 2029-11-17・初回検証 2024-11-18 である[V][^11]。caveat には「Interim validation. No assurance of minimum security of SSPs ... that are externally loaded ...」とある[V][^11]。承認アルゴリズム一覧の署名系は ECDSA と RSA（FIPS 186-4）で、ML-DSA と EdDSA は確認日時点の一覧に見当たらない[V][^11]。

### 3.3 Storm-0558（CSRB 報告・MSRC 事後報告・SFI 報告）

- **RS-05#18** CSRB 報告書（2024-03-20 付、DHS が 2024-04-02 に公表。PDF は CISA サイトに掲載）は、Storm-0558 が 2016 年作成の Microsoft Services Account（MSA）署名鍵で署名した token を使い、22組織と500超の個人の Exchange Online メールボックスを侵害したとする[I][^18][^19]。同報告は、侵入は「preventable and should never have occurred」と結論し、報告時点で Microsoft は鍵の窃取方法・時期を把握していないとする[I][^18]。（Executive Summary, p.iii）
- **RS-05#19** CSRB によれば、2016 年 MSA 鍵は consumer OWA 用 token だけを署名できるはずのもので、2021年3月に退役予定だったが撤去が遅れていた[I][^18]。（§1.1, p.2）
- **RS-05#20** CSRB によれば、consumer MSA 系には自動 rotation がなく、手動 rotation は 2021 年に「a major cloud outage linked to the manual rotation process」の後に全面停止された[I][^18]。稼働中の署名鍵の年齢を通知する自動アラートもなかった[I][^18]。（§1.2.3.2, p.6）
- **RS-05#21** CSRB によれば、enterprise と consumer の両方の稼働署名鍵を列挙する共通 OIDC endpoint を設けた際に SDK が両者を区別するよう更新されず、どちらの鍵でも一部アプリ（メール等）への認証が成立した[I][^18]。（§1.2.3.2, p.6）MSRC は、2018年9月に共通の key metadata 公開 endpoint を導入した際、ライブラリがスコープ検証を自動で行わず、開発者が issuer/scope 検証を追加しなかったと説明している[I][^21]。
  - 原文（MSRC）: "Microsoft provided an API to help validate the signatures cryptographically but did not update these libraries to perform this scope validation automatically."
- **RS-05#22** CSRB は p.17 で、手動 rotation の停止がなく、自動 rotation への移行が完了し、鍵年齢アラートがあれば、2016 年鍵は 2023 年に有効でなかったとする[I][^18]。consumer 鍵が enterprise データに認証できる誤りがなければ被害範囲は大幅に狭かった、ともする[I][^18]。
  - 原文: "if it had put in place a technical or other control to generate alerts for aging keys, the 2016 MSA key would not have been valid in 2023."（§2.1.1, p.17）
- **RS-05#23** CSRB によれば、Microsoft は 2023-06-27 までに侵入手口を特定したと判断し、盗まれた鍵から派生した全資格情報を無効化するため、下流の各システムの関連キャッシュを速やかに消去した[I][^18]。Microsoft はこの緩和が有効だったと判断している（攻撃者がその直後にフィッシングへ切り替えたため）[I][^18]。（§1.1, p.2）
- **RS-05#24** CSRB は、Microsoft が 2023-09-06 のブログで挙げた crash dump 経由の窃取説について、鍵が crash dump に存在した、または持ち出された証拠やログを Microsoft は持っていないと判断した[I][^18]。Microsoft は 2024-03-12 にこのブログを更新した[I][^18][^21]。（§1.2.3.1, p.5）
- **RS-05#25** CSRB は他の CSP の良い実践として、自動の定期鍵 rotation、HSM 等の分離された鍵システムでの保管、stateful な token 検証、鍵スコープの限定（場合により顧客単位）、偽造 token を検知するための独自データの埋め込み、操作・セッションに束縛した token を挙げる[I][^18]。（§2.1.2, p.19）
- **RS-05#26** CSRB 勧告5は、identity 系と root key material を含むシステムについて、全アクセスの記録、継続的な分析、鍵の稼働期間全体に加えて失効後少なくとも2年の保持を推奨し、一部の高価値ログは10年以上が適切な場合があるとする[I][^18]。
  - 原文: "Retention should include all time the key was in active use and extend at least two years beyond the expiration of that key. Longer retention periods of at least 10 years may be appropriate for some high-value log types."（§2.1.2, p.20）
- **RS-05#27** CSRB 勧告6は、stateful token、監視付きの自動・頻繁な鍵 rotation（例: 月次）、顧客単位の鍵（key scope）、bound token、共通認証ライブラリ、分離された鍵保管、linkable token、独自データによる偽造検知を列挙する[I][^18]。分離保管については、規模によっては従来型 HSM が成立しない場合を認めつつ、「isolated key storage with minimal key release」を適切とする[I][^18]。（§2.1.2, p.21）
- **RS-05#28** CSRB 勧告13は、CSP と標準化団体（OIDF、OASIS、IETF）に対し、OIDC/SAML の profile に key rotation、stateful credential、credential linking、key scope の要件または考慮事項を含めるよう求める[I][^18]。勧告11は DPoP と OpenID SSE の実装を求める[I][^18]。（§2.1.4, p.22）
- **RS-05#29** MSRC（2023-07-11）は緩和策として、取得された鍵で署名された token の利用遮断、鍵の置き換え完了、Microsoft.IdentityModel 等のライブラリ更新を挙げる[I][^20]。MSRC（2023-09-06）は改善として、crash dump に鍵が混入する race condition の修正、debug 環境での資格情報スキャン強化、鍵スコープ検証を自動化したライブラリの公開を挙げる[I][^21]。ただし同記事の 2024-03-12 追記は、鍵を含む crash dump は見つかっていないこと、race condition は鍵の混入ではなく crash dump を署名環境から持ち出せるかどうかに関わるものだったことを訂正している[I][^21]。
- **RS-05#30** Microsoft SFI 進捗報告（2024年9月）は、Entra ID と MSA のアクセス token 署名鍵（パブリッククラウドと米政府クラウド）の HSM 保管と、人手を介さない自動 rotation の完了を報告する[I][^22]。（p.12）同報告は、署名鍵のライフサイクル全体の identity 基盤監査ログを2年保持し、署名鍵システムへのあらゆる操作にページングアラートを追加したとする[I][^22]。（p.20–21）
- **RS-05#31** SFI 報告（2025年4月）は、MSA 署名サービスを Azure confidential VM へ移行済み、Entra ID 署名サービスは移行中とし、重要基盤の identity 鍵の分割を進めていると報告する[I][^23]。（p.16）SFI 報告（2025年11月）は、Entra ID 署名 VM の95%を confidential compute に移行し、Entra ID の security token の94%超を標準 SDK で検証していると報告する[I][^24]。同報告は、侵害された鍵から上位の管理層へ辿れないようにする署名鍵分割の最初のマイルストーンを完了したとする[I][^24]。（印字頁 p.22–23 = PDF p.23–24）
- **RS-05#32** SFI 報告（2024年9月）の engineering systems 柱は、Personal Access Token の寿命を7日に短縮、重要なマージ経路での proof-of-presence 確認、本番 build pipeline の85%で中央統制テンプレートを使用、と報告する[I][^22]。（p.19）

### 3.4 CVE-2025-55241（Entra ID actor token）

- **RS-05#33** MSRC の Security Update Guide は CVE-2025-55241 を「Azure Entra ID Elevation of Privilege Vulnerability」（CWE-287、CVSS 3.1 基本値 10.0、Critical）として 2025-09-04 に公表した[I][^25]。2025-09-18 の改訂 1.1 で Attack Complexity を High から Low に変更している[I][^25]。Exploited は No、顧客対応は不要（Microsoft が緩和済み）とされる[I][^25]。
- **RS-05#34** 発見者の一次報告（2025-09-17）によれば、actor token は service 間通信用に Access Control Service が発行する token である[I][^26]。actor token 自体は署名されるが、それを埋め込む impersonation token は未署名（"alg": "none"）である[I][^26]。actor token の有効期間は24時間で、その間は失効できず、Conditional Access の制約を受けない[I][^26]。同報告は「There are no logs when Actor tokens are issued」と記す[I][^26]。Azure AD Graph は、impersonation token のテナント ID を別テナントに書き換えてもデータを返した[I][^26]。対象テナントでのオブジェクト変更は通常監査ログに残るが、偽装された UPN と Exchange の表示名が混在する形で記録されたとする[I][^26]。
- **RS-05#35** 同報告の時系列は、報告 2025-07-14、修正展開 2025-07-17、SP 資格情報での Azure AD Graph 向け actor token 発行を防ぐ追加緩和 2025-08-06、CVE 公表 2025-09-04 である[I][^26]。

### 3.5 JWT/JWKS の規範と主要 IdP の rotation 実務

- **RS-05#36** RFC 8725（BCP 225, 2020-02）§3.8 は、JWT が iss を含む場合、使われた鍵が当該 issuer に属することの検証を MUST、属さない場合の拒否を MUST とする[N][^14]。鍵と issuer の結合手段は application-specific であり、例として OIDC の issuer metadata → jwks_uri（https）→ JWK Set を挙げる[N][^14]。
  - 原文: "the application MUST validate that the cryptographic keys used for the cryptographic operations in the JWT belong to the issuer. If they do not, the application MUST reject the JWT."（§3.8）
- **RS-05#37** RFC 8725 §3.12 は、同一 issuer が複数種別の JWT を発行する場合、検証規則を相互排他的に書くことを MUST とする[N][^14]。その手段の1つに「Use different keys for different kinds of JWTs」を挙げる[N][^14]。§3.11 は新規用途の明示的 typing を RECOMMENDED とし、§3.9 は複数 RP 向けの場合に aud の付与と検証を MUST とする[N][^14]。
- **RS-05#38** RFC 8725 の改訂版 draft-ietf-oauth-rfc8725bis は -10（2026-08-21）が最新で、IESG state は「RFC Ed Queue」、intended status は BCP である[N][^15]。確認日時点では RFC として未発行である[N][^15]。
- **RS-05#39** OpenID Connect Core 1.0（errata set 2, 2023-12-15）§10.1.1 は、署名者が JWK Set を jwks_uri に公開し、kid で使用鍵を示し、検証者は未知の kid を見たら jwks_uri を再取得する rotation 方式を示す[N][^16]。JWK Set は最近退役した署名鍵を合理的な期間保持すべき（SHOULD）とする[N][^16]。§3.1.3.7 は ID Token の iss と issuer 識別子の完全一致を MUST とする[N][^16]。
- **RS-05#40** Microsoft identity platform の文書（ms.date 2024-10-28）によれば、署名鍵は定期的に、緊急時には即時に rollover され、間隔に保証はない[V][^27]。テナント固有 endpoint で鍵を発見し、テナントごとに独立して cache することを推奨し、現在テナント共通の鍵が将来テナント別になり得るとする[V][^27]。推奨 cache は kid 単位、TTL 24時間、1時間ごとの更新、未知の kid または tid を受けたときの即時更新（ただし5分以内の再取得は抑止）、取得失敗時は last known good を継続、である[V][^27]。
  - 原文: "A key that is common across tenants today can become distinct across tenants in the future."
- **RS-05#41** Okta は現行の鍵 rotation を「four times a year, but can change without notice」とし、緊急時は必要に応じて rotation するとする[V][^28]。新しい鍵は、下流の cache が更新されるよう通常 rotation の数週間前に生成される[V][^28]。org authorization server の署名鍵は手動 rotation できず、custom authorization server は rotationMode の変更で rotation 方式を切り替えられる[V][^28]。jwks_uri の応答は Cache-Control に従って cache するよう案内され、安全な cache 期間の終わりには短い cache 時間が返される[V][^28]。
  - 原文: "New keys are normally generated a few weeks before the rotation occurs to ensure that downstream customer caching mechanisms are updated before the rotation occurs."
- **RS-05#42** Google は公開鍵の変更頻度は低いとして、HTTP 応答の cache 指示に従った cache を案内している[V][^29]。ID token の iss は `https://accounts.google.com` または `accounts.google.com`、aud は自アプリの client ID と一致することの検証を求める[V][^29]。Auth0 は、JWKS に現行鍵と次期鍵を常に含め、旧鍵は失効させるまで残り、その間は旧鍵で署名された token も有効とする[V][^30]。

### 3.6 クラウド KMS / HSM の公式文書

AWS

- **RS-05#43** AWS KMS の鍵は FIPS 140-3 Security Level 3 認証済み HSM で保護され、暗号化されない形で KMS 外に出ないとされる[V][^31]。（リンク先は CMVP #4884。RS-05#17）
- **RS-05#44** AWS KMS の request quota は、RSA・ECC/SM2・ML-DSA の暗号操作（Sign/Verify 等）がいずれも既定 1,000 req/s（鍵種別ごとの共有枠）である[V][^32]。対称鍵は 10,000〜100,000 req/s（リージョンにより異なる）である[V][^32]。枠はアカウント×リージョン単位で、AWS サービスが代行する要求を含む全 principal の要求を合算して throttle される[V][^32]。CloudHSM key store 経由の枠（1,800 req/s）を除き、すべて調整可能である[V][^32]。同ページの説明例には RSA 500・ECC 300 という旧値らしい記述が残っており、表の値と食い違う[V][^32]。
- **RS-05#45** AWS KMS の自動 rotation は、AWS_KMS 起源の対称暗号鍵に限られる[V][^33]。非対称鍵、HMAC 鍵、custom key store の鍵は自動・オンデマンド rotation の対象外で、新しい鍵を作ってアプリまたは alias を切り替える手動 rotation となる[V][^33]。
- **RS-05#46** AWS KMS は ML_DSA_44 / ML_DSA_65 / ML_DSA_87 の鍵仕様と ML_DSA_SHAKE_256 署名アルゴリズムを提供し、FIPS 204 を参照している[V][^34]。1つの KMS 鍵は署名または暗号化の一方の用途しか持てない[V][^34]。
- **RS-05#47** AWS KMS の Sign API は、メッセージを 0〜4,096 バイトに制限する[V][^35]。それより大きい場合は digest を渡し、ML-DSA では 64 バイトの μ（FIPS 204 §6.2）を渡す MessageType=EXTERNAL_MU を使う[V][^35]。
- **RS-05#48** AWS KMS の multi-Region key は非対称署名鍵にも使え、関連する鍵はリージョン間で同じ鍵素材と鍵 ID を共有する[V][^36]。同文書は、多くの用途では単一リージョン鍵のリージョン分離と障害耐性が最適とし、複製予定がある場合にだけ multi-Region key を作ることを推奨する（セキュリティ特性が異なるため）[V][^36]。
- **RS-05#49** AWS CloudHSM は single-tenant で、FIPS モードのクラスタでは FIPS 140-2 Level 3 または FIPS 140-3 Level 3 の HSM を提供する[V][^37]。
- **RS-05#50** CloudHSM の公表性能（hsm2m.medium、Java マルチスレッドアプリを c4.large 1台で実行）は、2台構成で RSA-2048 署名 2,000 ops/s、EC P-256 署名 3,000 ops/s、ML-DSA-44 署名 80 ops/s である[M][^38]。6台構成ではそれぞれ 5,000 / 7,000 / 190 ops/s である[M][^38]。
- **RS-05#51** CloudHSM の quorum 認証（M of N）は承認者数を2〜8で設定でき、Crypto Officer によるユーザー管理操作を統制する[V][^39]。quorum token の既定有効期間は10分である[V][^39]。

Azure

- **RS-05#52** Azure Key Vault Managed HSM は single-tenant で、FIPS 140-3 Level 3 認証の HSM（Marvell LiquidSecurity）を使う[V][^40]。local RBAC により、管理グループ・サブスクリプション・リソースグループの管理者でも上書きできない HSM 管理者統制を持つ[V][^40]。build 成果物を Microsoft Signing Transparency の台帳に登録し、顧客が検証できるとする[V][^40]。（ms.date 2026-07-06）
- **RS-05#53** Managed HSM の security domain は、顧客が提供する3つ以上の RSA 鍵対と quorum（Shamir 秘密分散）で暗号化され、quorum の上限は10、m≥3 が推奨される[V][^41]。security domain がなければ災害復旧は不可能で、紛失は侵害と見なされ、異なる security domain の HSM へ鍵素材は移行できない[V][^41]。security domain の保護鍵は再ダウンロードで交換できる[V][^41]。SecurityDomainBackup 等の操作には通知・アラートを設定すべき（should）とされ、Managed HSM Administrator ロールへの PIM 適用は強く推奨（highly recommended）される[V][^41]。（ms.date 2026-04-02）
  - 原文: "Without the security domain, disaster recovery isn't possible — all keys are permanently and irrecoverably lost."
- **RS-05#54** Managed HSM の性能目安は1パーティション・単一鍵・5分平均の最良値で、RSA-2048 署名 900 ops/s、RSA-3072 340、RSA-4096 150、EC P-256 署名 330、P-384 160 である[M][^42]。同文書は、暗号操作を throttle しないこと、1インスタンスは3パーティションで構成され、保証が必要な容量は1パーティションで計画すべきことを示す[M][^42]。（ms.date 2025-12-03）
- **RS-05#55** Managed HSM の鍵種別は RSA-HSM（2048/3072/4096）、EC-HSM（P-256、P-256K、P-384、P-521）、oct-HSM（AES）である[V][^43]。量子耐性として言及されるのは AES-256 だけで、PQ 署名の鍵種別は記載がない[V][^43]。（ms.date 2026-05-21）
- **RS-05#56** Managed HSM の自動 rotation は rotation policy で設定するが、28日より短い間隔では新しい版を作れず、1鍵あたりの版数は100が上限である[V][^44]。Event Grid 通知には対応しない[V][^44]。（ms.date 2026-04-28）

Google Cloud

- **RS-05#57** Google Cloud HSM の文書（最終更新 2026-09-30）は「FIPS 140-2 Level 3 certified HSMs」のクラスタと記し、既知の制限として、利用者が渡す平文・暗号文（AAD を含む）のメッセージサイズを 8 KiB まで（software 鍵は 64 KiB）とする[V][^45]。
- **RS-05#58** Google Cloud KMS は 2026-02-16 から token 方式のクォータに移行した[V][^46]。全指標がリージョン単位で、鍵を含むプロジェクトに計上され、HSM usage の既定は 3,000,000 tokens/分（soft enforcement）である[V][^46]。既存プロジェクトの上限は 2026-02-16 以前の上限と利用実績から自動設定される（dynamic limits）とされる[V][^46]。1操作あたりの token は、Cloud HSM の RSA-2048 署名 1,500、EC P-256 署名 4,500、P-384 7,000、RSA-4096 14,000、software 鍵の暗号操作 100 である[V][^46]。soft enforcement では、超過してもシステムに余力があれば処理されるが、HSM 鍵の作成・import と EKM は hard enforcement である[V][^46]。
- **RS-05#59** RS-05#58 の既定値からの換算では、Cloud HSM の P-256 署名は約667回/分（約11回/秒）、RSA-2048 署名は約2,000回/分（約33回/秒）である[D]。software 鍵の署名は既定 software usage 6,000,000 tokens/分から約60,000回/分（約1,000回/秒）になる[D]。soft enforcement の超過分は余力次第のため、容量計画の保証値には使えない[D]（根拠: RS-05#58）。
- **RS-05#60** Google Cloud KMS のアルゴリズム一覧（最終更新 2026-09-30）は、PQ 署名として PQ_SIGN_ML_DSA_44/65/87（各 external-μ 版を含む）と PQ_SIGN_SLH_DSA_SHA2_128S（pre-hash 版を含む）を挙げ、利用可能な保護レベルを software としている[V][^47]。Cloud KMS のリリースノートは、2026-07-16 付で PQC 署名アルゴリズム8種（ML-DSA-44/65/87 と各 external-μ 版、SLH-DSA-SHA2-128S と pre-hash 版）の GA を記録している[V][^65]。Google Cloud の公式ブログ（2026-07-29）は ML-DSA・SLH-DSA に加え ML-KEM の GA も告知しているが[V][^49]、同リリースノートでは KEM は 2025-09-23 付の Preview 記載のみで、GA の記録は確認できなかった[V][^65]。ML-KEM の GA は未確認として扱う。
- **RS-05#61** Google Cloud KMS は非対称鍵の自動 rotation をサポートしない[V][^48]。
  - 原文: "Cloud KMS does not support automatic rotation for asymmetric keys, because additional steps are required before you can use the new asymmetric key version."

### 3.7 PQ 署名の標準と移行期限

- **RS-05#62** FIPS 204（ML-DSA）は 2024-08-13 に final として公表された[N][^13]。
- **RS-05#63** RFC 9964（Standards Track, 2026-05）は JOSE/COSE 用の ML-DSA-44/65/87 を定める[N][^17]。署名長は 2,420 / 3,309 / 4,627 バイト、公開鍵長は 1,312 / 1,952 / 2,592 バイトで、JWS では base64url 化によりさらに長くなる[N][^17]。ctx パラメータは空文字列でなければならず（MUST）、HashML-DSA は定義しない[N][^17]。
- **RS-05#64** NIST IR 8547 ipd（2024-11-12、意見募集は 2025-01-10 締切、確認日時点で final 未公表）は、112-bit 強度の ECDSA/RSA 署名を「Deprecated after 2030」、128-bit 以上を含め（EdDSA も）「Disallowed after 2035」とする案である[N][^12]。（§4.1.1 Table 2, p.13）
- **RS-05#65** 確認日時点の PQ 署名の提供状況は、AWS KMS が ML-DSA 3種、CloudHSM が ML-DSA-44 の性能値を公表、Google Cloud KMS が software 保護レベルのみ、Azure Managed HSM が記載なしである[V][^34][^38][^47][^43]。AWS KMS HSM の CMVP 証明書 #4884 の承認アルゴリズム一覧には ML-DSA が見当たらないため、FIPS 承認境界内で ML-DSA 署名が行われるかは未確認である（RS-05#17）[V][^11]。
- **RS-05#66** RFC 7518 §3.4 は、ES256 の JWS 署名値を 64 オクテットとし、それ以外の長さなら検証失敗とする（MUST）[N][^63]。ML-DSA-44 の署名（2,420 バイト）は ES256 の約38倍で、cookie・HTTP ヘッダ長の上限や検証側の帯域に影響し得る[D]（根拠: RS-05#63 と本項前段）。
- **RS-05#67** CloudHSM の公表値では、ML-DSA-44 署名（2台で 80 ops/s）は P-256 署名（2台で 3,000 ops/s）の約1/37.5 である[M][^38]。PQ 署名へ移行すると HSM 直接署名の容量計画が大きく変わり得る[D]（根拠: RS-05#50）。

### 3.8 key ceremony の公開事例（IANA Root Zone KSK）

- **RS-05#68** IANA の DNSSEC Practice Statement for the Root Zone KSK Operator 第8版（2025-04-14）§5.2.2 は、KSK 私有鍵の起動データを Crypto Officer の資格情報に分割し、閾値を「three out of seven」とする[V][^50]。Crypto Officer は Root Zone 運用に関与しないインターネットコミュニティから選ばれ、PTI・ICANN・Verisign に属さない[V][^50]。§5.2.1 は HSM に FIPS 140-2 または FIPS 140-3 の Level 3 以上を求める（shall、運用者自身の規程）[V][^50]。§5.2 は、私有鍵をバックアップ用の暗号化形式以外で HSM から出さないとし、§5.2.3 は escrow しないとする[V][^50]。
- **RS-05#69** 同 DPS §4.2.2 は物理・役割の多層統制として、HSM 起動に Crypto Officer 7名中3名を要し、Storage Master Key の再構成に Recovery Key Share Holder 7名中5名を要すると定める[V][^50]。§4.1.2 によれば、物理アクセスは自動記録・録画される[V][^50]。
- **RS-05#70** 同 DPS §4.5.3.1 は KSK 侵害に備えた緊急 rollover 手順を維持し、暫定 trust anchor を48時間以内に生成・公表できる能力を持つとする[V][^50]。§6.5 は KSK を必要に応じて、または5年の運用後に ceremony で rollover するとし、§5.1.4 は KSK による RRSIG の有効期間を21日以下、将来180日を超えて失効しないものとする[V][^50]。
- **RS-05#71** 同 DPS §7.1〜7.3 は、少なくとも年1回、PTI・ICANN・Verisign とその監査人から独立した公認会計事務所が適合性監査を行い、第三者監査人は KSK の multi-person control に参加しないとする[V][^50]。
  - 原文: "Third party auditors do not participate in the multi-person control for the RZ KSK."（§7.3）
- **RS-05#72** IANA は ceremony を「usually conducted four times a year」とし、通常は3か月分の ZSK を KSK で署名すると説明する[V][^51]。予定表には Ceremony 65-1（2027-04-29、KSK-2017 の削除）と 65-2（2027-04-30、KSK-2027 の生成）が掲載されている[V][^51]。
- **RS-05#73** Ceremony 62（2026-08-12 実施）のページには、注釈付き台本、事前提案台本、3台の監査カメラ映像、署名用 OS イメージ（coen-2.0.1）とその SHA-256、鍵署名ログ、script ログ、TTY 監査ログ、HSM 破壊証明が公開されている[V][^52]。

### 3.9 管理面と break-glass

- **RS-05#74** Microsoft Entra の緊急アクセスアカウントの文書（ms.date 2026-06-04）は、次を求める[V][^53]。
  - 2つ以上用意し、フェデレーションも on-premises 同期もしないクラウド専用アカウントとする。
  - 通常の管理者とは別系統の phishing 耐性認証（FIDO2 passkey 推奨、または証明書ベース認証）を使う。
  - サインインを阻止・制限する Conditional Access から除外する。
  - 専用の安全な端末で使い、資格情報は別々の耐火金庫に保管する。
  - 全サインインに警報を出し、少なくとも90日ごとに検証する。
  - 原文: "Keep the emergency access for on-premises systems and the emergency access for cloud services distinct, with no dependency of one on the other."
- **RS-05#75** 管理面の分離に使える製品機能として、Managed HSM の local RBAC（RS-05#52）、security domain の quorum とオフライン保管（RS-05#53）、CloudHSM の M of N quorum（RS-05#51）が公式文書で確認できた[V][^40][^41][^39]。

### 3.10 供給網（SLSA / SSDF / Sigstore / OPA bundle 署名）

- **RS-05#76** SLSA v1.2 の仕様は status が「Approved」である[N][^54]。2025-11-24 に公表され、Source Track を新設し、v1.1 と後方互換である[N][^57]。
- **RS-05#77** SLSA v1.2 の Build Track は L1「Provenance showing how the package was built」、L2「Signed provenance, generated by a hosted build platform」、L3「Hardened build platform」である[N][^55]。L3 では、同一プロジェクト内でも実行同士が互いに影響しないこと、provenance 署名に使う秘密を利用者定義の build 手順から触れられないことが求められる[N][^55]。
- **RS-05#78** SLSA v1.2 の Source Track は L1「Version controlled」から L4「Two-party review」までの4段階である[N][^56]。L4 は保護ブランチへの変更を提出前に2名以上の信頼された者が合意することを MUST とし、レビューは少なくともセキュリティ関連の性質を扱うべき（SHOULD）とする[N][^56]。また History 要件（L2 以上）は、branch を現在の revision の子孫にのみ更新できるよう SCS が保証することを MUST とし、git ではそのために force push を禁止する技術的統制が要るとする[N][^56]。
  - 原文: "Changes in protected branches MUST be agreed to by two or more trusted persons prior to submission."
- **RS-05#79** NIST SSDF 1.1（SP 800-218, final, 2022-02）は、開発に関わる各環境の分離・保護（PO.5.1）と開発端末の堅牢化（PO.5.2）を推奨 task とする[N][^58]。configuration-as-code を含む全コードの最小権限保管（PS.1.1、例: commit 署名、code owner レビュー、code signing）と、完全性検証情報の提供（PS.2.1、例: code signing 証明書の更新・rotation・失効・保護の定期レビュー）も推奨 task である[N][^58]。SSDF の task は推奨であり、shall 形式の要求ではない[N][^58]。（Table 1, PDF p.17–19）
- **RS-05#80** SSDF 1.2（SP 800-218 Rev.1）は 2025-12-17 に ipd として公表され、意見募集は 2026-01-30 に締め切られた[N][^59]。確認日時点で CSRC に final は掲載されていない[N][^59]。
- **RS-05#81** Sigstore は署名クライアント Cosign、コード署名 CA の Fulcio、追記専用の透明性ログ Rekor で構成される[V][^60]。keyless 署名では OIDC の identity token と引き換えに短命証明書が発行され、利用者は長期鍵を管理しない[V][^60]。Fulcio の証明書は10分間有効である[V][^61]。公開サービス（public-good instance）の SLO は、確認した文書に記載がない[V][^60]。
- **RS-05#82** OPA の bundle 署名は、`.signatures.json` 内の JWT に対象ファイルの一覧とハッシュを記録する方式である[V][^62]。OPA は JWT 署名・ファイル集合・各ハッシュの検証がすべて成功した場合にだけ新しい bundle を有効化し、失敗時は既存 bundle を継続して status API とログで報告する[V][^62]。検証鍵 ID は、コマンドライン → 設定 → JWT ヘッダの kid の順に解決される[V][^62]。
  - 原文: "OPA activates the new bundle only if all the verification steps succeed; otherwise, it continues using its existing bundle and reports an activation failure via the status API and error logging."

## 4. 標準・文書ステータス表

| 名称 | 版 | 状態 | 公表日 | 確認日 | URL |
|---|---|---|---|---|---|
| NIST SP 800-57 Part 1 | Rev.5 | final | 2020-05-04 | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final |
| NIST SP 800-57 Part 1 | Rev.6 | ipd（意見募集 2026-02-05 締切、final 未公表） | 2025-12-05 | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/57/pt1/r6/ipd |
| NIST SP 800-130 | — | final | 2013-08-15 | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/130/final |
| NIST SP 800-152 | — | final | 2015-10-28 | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/152/final |
| NIST SP 800-53 | Rev.5（Release 5.2.0） | final（5.2.0 は minor release） | 2020-09（5.2.0: 2025-08-27） | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final |
| NIST FIPS 140-3 | — | final | 2019-03-22 | 2026-10-03 | https://csrc.nist.gov/pubs/fips/140-3/final |
| FIPS 140-2 認証（CMVP） | — | 予定表上 2026-09-22 に全証明書を Historical List へ移す。確認日の抽出照合（5件）では全件 Historical（due to sunsetting） | — | 2026-10-03 | https://csrc.nist.gov/projects/fips-140-3-transition-effort |
| NIST FIPS 204（ML-DSA） | — | final | 2024-08-13 | 2026-10-03 | https://csrc.nist.gov/pubs/fips/204/final |
| NIST IR 8547 | ipd | ipd（意見募集 2025-01-10 締切、final 未公表） | 2024-11-12 | 2026-10-03 | https://csrc.nist.gov/pubs/ir/8547/ipd |
| NIST SP 800-218（SSDF） | 1.1 | final | 2022-02 | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/218/final |
| NIST SP 800-218 Rev.1（SSDF） | 1.2 | ipd（意見募集 2026-01-30 締切、final 未公表） | 2025-12-17 | 2026-10-03 | https://csrc.nist.gov/pubs/sp/800/218/r1/ipd |
| RFC 8725（BCP 225） | — | BCP | 2020-02 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc8725.html |
| draft-ietf-oauth-rfc8725bis | -10 | Internet-Draft（IESG state: RFC Ed Queue、RFC 未発行） | 2026-08-21 | 2026-10-03 | https://datatracker.ietf.org/doc/draft-ietf-oauth-rfc8725bis/ |
| RFC 9964（ML-DSA for JOSE/COSE） | — | Proposed Standard | 2026-05 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc9964.html |
| RFC 7518（JWA） | — | Proposed Standard | 2015-05 | 2026-10-03 | https://www.rfc-editor.org/rfc/rfc7518.html |
| OpenID Connect Core 1.0 | errata set 2 | final | 2023-12-15 | 2026-10-03 | https://openid.net/specs/openid-connect-core-1_0.html |
| SLSA | v1.2 | Approved | 2025-11-24 | 2026-10-03 | https://slsa.dev/spec/v1.2/ |
| CSRB『Review of the Summer 2023 Microsoft Exchange Online Intrusion』 | — | 公表済み（政府報告） | 2024-03-20 付（DHS 公表 2024-04-02） | 2026-10-03 | https://www.cisa.gov/sites/default/files/2025-03/CSRBReviewOfTheSummer2023MEOIntrusion508.pdf |
| IANA DPS for the Root Zone KSK Operator | 第8版 | 有効 | 2025-04-14 | 2026-10-03 | https://www.iana.org/dnssec/procedures/ksk-operator/ksk-dps-20250414.html |
| CMVP 証明書 #4884（AWS KMS HSM） | HW 3.0 / FW 1.8.104 | Active（sunset 2029-11-17、Interim validation） | 2024-11-18 | 2026-10-03 | https://csrc.nist.gov/projects/cryptographic-module-validation-program/certificate/4884 |
| Google Cloud KMS の PQC 署名（ML-DSA・SLH-DSA） | — | GA（リリースノート 2026-07-16）。ML-KEM は Preview（2025-09-23）以降の GA 記録なし | 2026-07-16 | 2026-10-03 | https://docs.cloud.google.com/kms/docs/release-notes |

## 5. 設計への含意と PoC で実測すべきこと

### 5.1 ADR・設計文書への入力

| 入力先 | 入力する内容 | 根拠 | 閉じ方 |
|---|---|---|---|
| ADR-007 鍵階層と KMS/HSM | 2層を基本とする: (1) オフライン root（k-of-n、ceremony、FIPS 140-3 L3 以上）、(2) HSM/KMS 内の非エクスポート issuer 署名鍵（cell×token 種別ごと）。性能で例外を設ける場合は隔離実行環境と鍵放出の最小化を条件にする[D] | RS-05#1, #3, #9, #10, #27, #30, #31 | A＋C |
| ADR-007 | 鍵用途分離は Rev5 の shall を内部要求として維持する（Rev6 ipd の should 化は採らない）[D] | RS-05#1, #8 | A |
| ADR-007 | 調達要件は「有効な FIPS 140-3 Level 3 の CMVP 証明書番号と承認アルゴリズム一覧の提示」とし、使う署名アルゴリズム（特に ML-DSA・Ed25519）が一覧に含まれるかを照合する[D] | RS-05#14〜#17, #57, #65 | A＋D |
| ADR-007 | KMS の非対称鍵は自動 rotation の対象外である前提で、rotation オーケストレータ（事前公開 → 切替 → 保持 → 撤去 → 破棄）を自社責任範囲として設計する[D] | RS-05#45, #56, #61 | A＋C |
| ADR-007 | multi-Region 署名鍵は cell 間・リージョン間の鍵共有で blast radius を広げるため、原則使わず、リージョン（cell）ごとに独立した鍵とする[D] | RS-05#5, #48 | A |
| ADR-005 token profile | 検証規則を「(iss, kid, typ, aud) → 許可鍵集合」の明示表で定義する。issuer 間・cell 間で JWKS を合成しない。token 種別ごとに鍵を分ける（RFC 8725 §3.12 の手段）[D] | RS-05#21, #36, #37, #40 | A＋C |
| ADR-005 / DL-20 数値契約 | R-189.6（JWKS cache 最大齢）は BIA から決める。最大齢は緊急失効時に旧鍵が受理され続け得る時間の上限になる[D] | RS-05#39, #40, #23 | B＋C |
| ADR-008 管理面と CI/CD | JWKS 公開経路（issuer metadata、jwks_uri、TLS 証明書、公開パイプライン）を管理面として扱い、変更に二者承認（SP 800-53 CM-5(4) 相当）を課す[D] | RS-05#12, #36, #39 | A＋C |
| ADR-008 | KMS/HSM 管理者・JWKS 公開・CI 署名鍵の管理者認証は本基盤の AS に依存させない。別系統の phishing 耐性認証、非フェデレーションの緊急アカウント、HSM 側の local RBAC と quorum で循環依存を断つ[D] | RS-05#52, #53, #74, #75 | A＋C |
| ADR-008 | policy・認可モデルのリポジトリは SLSA Source L4（二者合意 MUST）、bundle の build は Build L3（署名秘密を build 手順から隔離）を目標水準とする[D] | RS-05#77, #78 | A＋D |
| ADR-011 policy 言語と PEP–PDP API | policy bundle は署名検証に加え、版の単調性（旧版の再提示を拒否）と有効期限を PDP 側で検証する。検証失敗時は last known good を継続するが、継続の上限時間を定める[D] | RS-05#82, R-168 | A＋C |
| ADR-009 workload identity | 内部 token（service 間の代理 token を含む）も外部 token と同じ profile・署名・発行ログ・テナント検証の対象とし、未署名 token を禁止する[D] | RS-05#33, #34 | A＋C |
| ADR-016 versioning / deprecation | レガシー API に期限付き廃止を課し、廃止までの間もテナント結合検証と監査ログを必須とする[D] | RS-05#34, #35 | B＋C |
| ADR-014 監査データ | 鍵システム（KMS/HSM、JWKS 公開、ceremony）への全アクセスを記録し、保持期間は「鍵の稼働期間＋少なくとも2年」を下限案として法務と決める[D] | RS-05#26, #30 | B |
| ADR-015 crypto agility / PQC | alg ごとに独立した鍵・kid を持てる JWKS とし、ML-DSA（RFC 9964）の採用時期は KMS 対応・FIPS 境界・token サイズの実測で決める。2030/2035 の期限案（IR 8547 ipd）を再決裁の観測点にする[D] | RS-05#63〜#67 | A＋C |
| ADR-013 cell と fail-mode | KMS/HSM のスロットリング・停止時の発行縮退（既発行 token の継続、新規発行の停止範囲）を cell 単位で定義する。Managed HSM の容量は1パーティションで計画する[D] | RS-05#44, #54, #58 | C |
| ADR-018 出口戦略 | HSM/KMS の非エクスポート鍵や security domain は他インスタンスへ移せないため、出口は「新鍵の事前公開 → 署名切替」による rotation 型移行を基本とする[D] | RS-05#45, #53 | A＋C |
| ADR-019 / DL-24 runbook | 鍵侵害 runbook の必須手順: 侵害鍵での署名停止（must not、SP 800-152）、JWKS 撤去、失効 kid の push 配信と下流 cache の消去、全依存 token の失効、影響署名の特定、依拠当事者への通知[D] | RS-05#4, #11, #23, #29 | C |
| DL-14 鍵管理・ceremony 手順 | ceremony の様式: k-of-n の明示（SP 800-130 FR:6.98–6.99）、quorum 外の独立立会人、注釈付き台本、複数カメラの録画、署名環境イメージのハッシュ、署名ログ、HSM 破壊証明、緊急 rollover 目標時間（IANA は暫定 trust anchor を48時間）[D] | RS-05#9, #68〜#73 | C＋D |
| KRI（K-xx 未採番） | 最長稼働署名鍵年齢、JWKS 掲載鍵数と最古鍵の年齢、rotation 失敗回数、鍵系アクセスの監査欠損率[D] | RS-05#3, #20, #22, #26 | B＋C |

### 5.2 PoC で実測すべきこと（TC-ID 未採番）

1. 署名レイテンシとスループット: AWS KMS、CloudHSM、Azure Managed HSM、Google Cloud HSM / software で、RSA-2048/3072・P-256・Ed25519・ML-DSA-44/65 の p50/p99/p99.9 と throttle の発生点を測る。同一鍵と複数鍵、リージョン内とリージョン間の両方で測る[D]（根拠: RS-05#44, #50, #54, #58）。
2. 計画 rotation: JWKS 事前公開 → 署名切替 → 旧鍵保持 → 撤去を連続して実施し、全検証点で検証失敗が0件であることと、所要時間を測る[D]（根拠: RS-05#39, #40, #45）。
3. 緊急 rotation: 侵害宣言から全検証点で旧 kid を拒否するまでの時間を、JWKS cache 設定（TTL・更新間隔・last known good）別、push 配信の有無別に測る[D]（根拠: RS-05#23, #40）。
4. 負例試験: 他 issuer・他 cell・他 token 種別の鍵で署名した token、未知 kid、alg 混同、未署名の内部 token（CVE-2025-55241 型）、テナント不一致の代理 token が拒否されることを確認する[D]（根拠: RS-05#21, #34, #36, #37）。
5. 鍵年齢アラート: cryptoperiod を超えた鍵の検出から発行停止に連動するまでの時間を測る[D]（根拠: RS-05#3, #22）。
6. KMS 障害注入: KMS/HSM の停止・スロットリング・リージョン障害時に、発行の縮退範囲と既存 session の継続時間を測る[D]（根拠: RS-05#44, #54）。
7. PQ token: ML-DSA 署名の JWT サイズが cookie・HTTP ヘッダ・ゲートウェイ上限に与える影響と、検証 CPU を測る[D]（根拠: RS-05#63, #67）。
8. policy bundle: 改ざん、署名鍵不一致、署名済み旧版の再提示（rollback）が拒否されることと、検証失敗時に last known good で動き続ける時間を確認する[D]（根拠: RS-05#82）。
9. ceremony 演習: 台本・k-of-n・quorum 外の立会い・録画・ハッシュ記録を模擬実施し、E8 の様式で記録する[D]（根拠: RS-05#68〜#73）。
10. break-glass: 本基盤の AS を停止した状態で、KMS/HSM 管理、JWKS 公開、CI 署名、緊急 rotation を実施できることを確認する[D]（根拠: RS-05#74, #75）。
11. 監査: 鍵系システムへの全アクセスのログ欠損率と、保持設定が設計値どおりかを確認する[D]（根拠: RS-05#26）。

## 6. 調査の限界と未確認事項

- **Azure AD の 2021-03-15 認証障害の PIR は原典を取得できなかった。** Azure status history は確認日時点で該当期間を表示しない。第三者による写しと Microsoft Q&A 上の転載は、規約上根拠に使えない。このため「署名鍵の自動削除が retain 指定を無視した」という内容は未確認として扱い、結論には使っていない。rotation が可用性障害源になる点の根拠は CSRB の記述（RS-05#20）だけである。
- **Azure Managed HSM の CMVP 証明書番号は確認していない。** FIPS 140-3 Level 3 であることは Microsoft 公式文書で確認したが、証明書番号・承認アルゴリズム・sunset 日は未照合である。
- **Google Cloud HSM の FIPS 140-3 認証状況は未確認である。** 公式文書は確認日時点で FIPS 140-2 Level 3 と記載しており、FIPS 140-3 の証明書の有無と番号は確認できなかった。
- **AWS KMS で ML-DSA・Ed25519 の署名が FIPS 承認境界内で行われるかは未確認である。** CMVP #4884 の承認アルゴリズム一覧に両者は見当たらないが、別の証明書や security policy での扱いは照合していない。
- **Google Cloud HSM（hardware 保護レベル）での PQ 署名提供時期は未確認である。** リリースノートの GA 記載（2026-07-16）と公式ブログ（2026-07-29）のいずれからも保護レベル別の提供状況を確認できず、アルゴリズム一覧は software のみとしている。
- **Google Cloud KMS の ML-KEM の GA は未確認である。** 公式ブログ（2026-07-29）は GA と告知するが、公式リリースノートには KEM の Preview（2025-09-23）と quantum-safe key import の Preview（2026-08-06）の記載しかなく、GA の記録がない。本ノートの結論には使っていない。
- **CVE-2025-55241 の技術的詳細（未署名 impersonation token、発行ログの欠如、テナント検証の欠落）は発見者の一次報告だけに基づく。** Microsoft の公表は Security Update Guide の CVSS・CWE・FAQ（緩和済み）に限られ、詳細を裏付ける Microsoft の事後報告は本調査では確認していない。
- **Azure Key Vault（Premium、Managed HSM 以外）の PQ 署名対応は、公式文書を見つけられなかった。**
- **AWS KMS のクォータ文書には、表（RSA/ECC 1,000 req/s）と説明例（RSA 500・ECC 300）の食い違いがある。** 実効値は PoC 時に Service Quotas コンソールで確認する必要がある。
- **公表性能値は、いずれもベンダー条件下の最良値または目安である**（CloudHSM は c4.large 1台のクライアント、Managed HSM は1パーティション・単一鍵）。本基盤の負荷形状での値ではない。
- **OPA bundle の rollback（署名済み旧版の再提示）を拒否する仕組みは未確認である。** management-bundles 文書の署名節では確認できず、manifest の revision 等で防げるかは照合していない。
- **Sigstore の public-good instance の可用性目標（SLO）・サポート条件は確認できなかった。** private 運用時の要件も未調査である。
- **FIPS 140-3 の各セキュリティレベルの詳細要件は未読である。** 要件本体の ISO/IEC 19790 と ISO/IEC 24759 は有償のため読んでいない。
- **未読の関連文書:** SP 800-57 Part 2 Rev1・Part 3 Rev1、SP 800-131A（Rev.3 の状態を含む）、RFC 7517 の本文。RFC 7518 は §3.4 だけを照合した。
- **Okta と Auth0 の公式文書には更新日の記載がない。** AWS の文書にも ms.date に相当する版日付がない。
- **前提台帳が未作成のため、仮定（発行ピーク TPS、cell 数、テナント別鍵の要否など）は A-ID を採番できていない。** 結論5・11は仮定に依存する箇所を明記した。
- **CSRB は 2025 年に活動を停止したとされるが、その公的告知は本調査で照合していない。** 報告書 PDF は CISA サイトの移転後 URL（2025-03 パス）から取得した。
- **調査対象外とした事項:** Okta 2023 support 侵害など、他の事故の一次報告（seed-02 §10）は他ストリーム（seed-03 が示す RS-09/RS-12）の範囲であり、本ノートでは扱っていない。

## 参考文献

[^1]: NIST (E. Barker)『SP 800-57 Part 1 Rev. 5: Recommendation for Key Management: Part 1 – General』final, 2020-05. https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-57pt1r5.pdf （参照箇所: §5.2 p.33–34、§5.3.1 p.34–35、§5.3.6 p.38–39、Table 1 p.45、§5.5.2 p.50–52、§6.2.3 p.78–79、確認日: 2026-10-03）
[^2]: NIST CSRC『SP 800-57 Part 1 Rev. 6 (Initial Public Draft): Recommendation for Key Management: Part 1 – General』ipd, 2025-12-05. https://csrc.nist.gov/pubs/sp/800/57/pt1/r6/ipd （参照箇所: 公表日・意見募集締切・主な変更点の記載、確認日: 2026-10-03）
[^3]: NIST (E. Barker, W. Barker)『NIST SP 800-57pt1r6 ipd』本文 PDF, 2025-12. https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-57pt1r6.ipd.pdf （参照箇所: §4.2 PDF p.35、§4.3.6 PDF p.41、§4.5.2 PDF p.57、確認日: 2026-10-03）
[^4]: NIST (E. Barker ほか)『SP 800-130: A Framework for Designing Cryptographic Key Management Systems』final, 2013-08. https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-130.pdf （参照箇所: §6.7.4 FR:6.98–6.99 p.58–59、§6.7.5 FR:6.100 p.59、確認日: 2026-10-03）
[^5]: NIST (E. Barker ほか)『SP 800-152: A Profile for U.S. Federal Cryptographic Key Management Systems』final, 2015-10. https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-152.pdf （参照箇所: §6.7.4 PR:6.74/PA:6.19 p.66、§6.8 PR:6.75–6.76 p.67、§6.8.1 p.67–68、確認日: 2026-10-03）
[^6]: NIST Joint Task Force『SP 800-53 Rev. 5: Security and Privacy Controls for Information Systems and Organizations』final, 2020-09（2020-12-10 更新版 PDF）. https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53r5.pdf （参照箇所: AC-3(2) p.23、CM-5(4) p.102、CM-14 p.114、SC-12 p.307、確認日: 2026-10-03）
[^7]: NIST CSRC『SP 800-53 Rev. 5』公表ページ（Planning Note 2025-08-27: Release 5.2.0）. https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final （参照箇所: Planning Note の変更対象一覧、確認日: 2026-10-03）
[^8]: NIST CSRC『FIPS 140-3: Security Requirements for Cryptographic Modules』final, 2019-03-22. https://csrc.nist.gov/pubs/fips/140-3/final （参照箇所: Abstract、Supersedes FIPS 140-2、確認日: 2026-10-03）
[^9]: NIST CMVP『FIPS 140-3 Transition Effort』. https://csrc.nist.gov/projects/fips-140-3-transition-effort （参照箇所: 移行日程（2022-04-01、2026-09-21、2026-09-22）、確認日: 2026-10-03）
[^10]: NIST CMVP『Validated Modules』. https://csrc.nist.gov/projects/cryptographic-module-validation-program/validated-modules （参照箇所: Historical の説明、確認日: 2026-10-03）
[^11]: NIST CMVP『Certificate #4884: AWS Key Management Service HSM』初回検証 2024-11-18. https://csrc.nist.gov/projects/cryptographic-module-validation-program/certificate/4884 （参照箇所: Standard/Status/Sunset/Overall Level/Caveat/Approved Algorithms、確認日: 2026-10-03）
[^12]: NIST (D. Moody ほか)『NIST IR 8547 ipd: Transition to Post-Quantum Cryptography Standards』ipd, 2024-11-12. https://nvlpubs.nist.gov/nistpubs/ir/2024/NIST.IR.8547.ipd.pdf （参照箇所: §4.1.1 Table 2 p.13、確認日: 2026-10-03。状態は https://csrc.nist.gov/pubs/ir/8547/ipd で確認）
[^13]: NIST CSRC『FIPS 204: Module-Lattice-Based Digital Signature Standard』final, 2024-08-13. https://csrc.nist.gov/pubs/fips/204/final （参照箇所: 状態・公表日、確認日: 2026-10-03）
[^14]: Y. Sheffer, D. Hardt, M. Jones『RFC 8725 (BCP 225): JSON Web Token Best Current Practices』2020-02. https://www.rfc-editor.org/rfc/rfc8725.html （参照箇所: §3.8、§3.9、§3.11、§3.12、確認日: 2026-10-03）
[^15]: IETF Datatracker『draft-ietf-oauth-rfc8725bis: JSON Web Token Best Current Practices』-10, 2026-08-21. https://datatracker.ietf.org/doc/draft-ietf-oauth-rfc8725bis/ （参照箇所: IESG state、Intended RFC status、Last updated、確認日: 2026-10-03）
[^16]: OpenID Foundation (N. Sakimura ほか)『OpenID Connect Core 1.0 incorporating errata set 2』final, 2023-12-15. https://openid.net/specs/openid-connect-core-1_0.html （参照箇所: §3.1.3.7 item 2、§10.1.1、確認日: 2026-10-03）
[^17]: M. Prorock, O. Steele『RFC 9964: ML-DSA for JSON Object Signing and Encryption (JOSE) and CBOR Object Signing and Encryption (COSE)』Standards Track（Proposed Standard）, 2026-05. https://www.rfc-editor.org/rfc/rfc9964.html （参照箇所: Abstract、§5 ML-DSA Algorithms（Table 1、ctx 要件、署名符号化）、§7.2、確認日: 2026-10-03）
[^18]: Cyber Safety Review Board『Review of the Summer 2023 Microsoft Exchange Online Intrusion』2024-03-20. https://www.cisa.gov/sites/default/files/2025-03/CSRBReviewOfTheSummer2023MEOIntrusion508.pdf （参照箇所: Executive Summary p.iii、§1.1 p.2、§1.2.3.1 p.5、§1.2.3.2 p.6、§2.1.1 p.17、§2.1.2 p.19–21（勧告5・6）、§2.1.4 p.22（勧告11・13）、確認日: 2026-10-03）
[^19]: U.S. Department of Homeland Security『Cyber Safety Review Board Releases Report on Microsoft Online Exchange Incident from Summer 2023』Release Date 2024-04-02（Archived Content）. https://www.dhs.gov/news/2024/04/02/cyber-safety-review-board-releases-report-microsoft-online-exchange-incident-summer （参照箇所: Release Date と冒頭段落、確認日: 2026-10-03。v0.1 の脚注先 CISA 資料ページには公表日の記載がなかったため差し替え）
[^20]: Microsoft Security Response Center『Microsoft mitigates China-based threat actor Storm-0558 targeting of customer email』2023-07-11. https://www.microsoft.com/en-us/msrc/blog/2023/07/microsoft-mitigates-china-based-threat-actor-storm-0558-targeting-of-customer-email （参照箇所: 攻撃概要と緩和策の節、確認日: 2026-10-03）
[^21]: Microsoft Security Response Center『Results of Major Technical Investigations for Storm-0558 Key Acquisition』2023-09-06（2024-03-12 更新）. https://www.microsoft.com/en-us/msrc/blog/2023/09/results-of-major-technical-investigations-for-storm-0558-key-acquisition （参照箇所: 2024-03-12 更新注記、key metadata endpoint とスコープ検証の説明、改善項目一覧、確認日: 2026-10-03）
[^22]: Microsoft『Secure Future Initiative: September 2024 progress report』2024-09. https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/microsoft/final/en-us/microsoft-brand/documents/SFI_September_2024_progress_report.pdf （参照箇所: p.12（Protect identities and secrets）、p.19（Protect engineering systems）、p.20–21（Monitor and detect threats）、確認日: 2026-10-03）
[^23]: Microsoft『Secure Future Initiative: April 2025 progress report』2025-04. https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/microsoft/final/en-us/microsoft-brand/documents/sfi-april-2025-progress-report.pdf （参照箇所: p.16（Protect identities and secrets）、確認日: 2026-10-03）
[^24]: Microsoft『Secure Future Initiative: November 2025 progress report』2025-11. https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/microsoft/bade/documents/products-and-services/en-us/security/sfi-nov-2025-progress-report.pdf （参照箇所: 印字頁 p.22–23 = PDF p.23–24（Protect identities and secrets、Objectives 1・2・5・6）、確認日: 2026-10-03）
[^25]: Microsoft Security Response Center『Security Update Guide: CVE-2025-55241 Azure Entra ID Elevation of Privilege Vulnerability』2025-09-04（rev 1.1: 2025-09-18）. https://msrc.microsoft.com/update-guide/vulnerability/CVE-2025-55241 （参照箇所: CVSS、CWE、Exploited、FAQ、改訂履歴。JavaScript 描画のため同内容を MSRC 公式 API https://api.msrc.microsoft.com/sug/v2.0/en-US/vulnerability から取得、確認日: 2026-10-03）
[^26]: Dirk-jan Mollema（発見者）『One Token to rule them all - obtaining Global Admin in every Entra ID tenant via Actor tokens』2025-09-17. https://dirkjanm.io/obtaining-global-admin-in-every-entra-id-tenant-with-actor-tokens/ （参照箇所: Actor token の説明、Azure AD Graph の検証不備、ログの節、Disclosure timeline、確認日: 2026-10-03）
[^27]: Microsoft Learn『Signing Key Rollover in Microsoft identity platform』ms.date 2024-10-28. https://learn.microsoft.com/en-us/entra/identity-platform/signing-key-rollover （参照箇所: Overview、Best practices for keys metadata caching and validation、確認日: 2026-10-03）
[^28]: Okta Developer『Key rotation』（版日付の記載なし）. https://developer.okta.com/docs/concepts/key-rotation/ （参照箇所: rotation 頻度と新鍵の事前生成の Note、Key rotation for custom authorization servers（緊急 rotation、Cache-Control、rotationMode）、org authorization server の節、確認日: 2026-10-03）
[^29]: Google for Developers『OpenID Connect』最終更新 2026-06-15. https://developers.google.com/identity/openid-connect/openid-connect （参照箇所: Validating an ID token、公開鍵の cache、確認日: 2026-10-03）
[^30]: Auth0 Docs『Rotate Signing Keys』（版日付の記載なし）. https://auth0.com/docs/get-started/tenant-settings/signing-keys/rotate-signing-keys （参照箇所: rotation と revoke の説明、確認日: 2026-10-03）
[^31]: AWS『AWS Key Management Service Developer Guide: AWS Key Management Service』（版日付の記載なし）. https://docs.aws.amazon.com/kms/latest/developerguide/overview.html （参照箇所: 冒頭段落、確認日: 2026-10-03）
[^32]: AWS『AWS KMS Developer Guide: Request quotas』（版日付の記載なし）. https://docs.aws.amazon.com/kms/latest/developerguide/requests-per-second.html （参照箇所: Request quotas for each AWS KMS API operation、Applying request quotas、Shared quotas for cryptographic operations、Custom key store request quotas、確認日: 2026-10-03）
[^33]: AWS『AWS KMS Developer Guide: Rotate AWS KMS keys』（版日付の記載なし）. https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html （参照箇所: How key rotation works（Automatic / On-demand / Manual rotation）、確認日: 2026-10-03）
[^34]: AWS『AWS KMS Developer Guide: Key spec reference』（版日付の記載なし）. https://docs.aws.amazon.com/kms/latest/developerguide/symm-asymm-choose-key-spec.html （参照箇所: RSA/ECC key specs、ML-DSA key specs、確認日: 2026-10-03）
[^35]: AWS『AWS KMS API Reference: Sign』（版日付の記載なし）. https://docs.aws.amazon.com/kms/latest/APIReference/API_Sign.html （参照箇所: Message、MessageType、Signature の各パラメータ、確認日: 2026-10-03）
[^36]: AWS『AWS KMS Developer Guide: Multi-Region keys in AWS KMS』（版日付の記載なし）. https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html （参照箇所: 概要、Distributed signing applications、Supported KMS key types、Primary key、確認日: 2026-10-03）
[^37]: AWS『AWS CloudHSM User Guide: What is AWS CloudHSM?』（版日付の記載なし）. https://docs.aws.amazon.com/cloudhsm/latest/userguide/introduction.html （参照箇所: HSMs are general purpose, single tenant, and ... FIPS 140-3 level-3 validated、確認日: 2026-10-03）
[^38]: AWS『AWS CloudHSM User Guide: AWS CloudHSM performance information』（版日付の記載なし）. https://docs.aws.amazon.com/cloudhsm/latest/userguide/performance.html （参照箇所: Performance data for hsm1.medium / hsm2m.medium と注記[1]〜[3]、確認日: 2026-10-03）
[^39]: AWS『AWS CloudHSM User Guide: Using CMU to manage quorum authentication (M of N access control)』（版日付の記載なし）. https://docs.aws.amazon.com/cloudhsm/latest/userguide/quorum-authentication.html （参照箇所: 統制対象操作、承認者数 2〜8、token 有効期間、確認日: 2026-10-03）
[^40]: Microsoft Learn『Azure Key Vault Managed HSM Overview』ms.date 2026-07-06. https://learn.microsoft.com/en-us/azure/key-vault/managed-hsm/overview （参照箇所: Important 注記、Why use Managed HSM（Single-tenant、Isolated access control、FIPS 140-3 Level 3）、Signing Transparency、確認日: 2026-10-03）
[^41]: Microsoft Learn『About the security domain in Azure Key Vault Managed HSM』ms.date 2026-04-02. https://learn.microsoft.com/en-us/azure/key-vault/managed-hsm/security-domain （参照箇所: 冒頭、Downloading the encrypted security domain、Establishing a security domain quorum、Security domain compromise or loss、Security domain keys compromise or loss、確認日: 2026-10-03）
[^42]: Microsoft Learn『Azure Key Vault Managed HSM Scaling Guidance』ms.date 2025-12-03. https://learn.microsoft.com/en-us/azure/key-vault/managed-hsm/scaling-guidance （参照箇所: Custom Applications、Planning for transaction capacity、RSA/EC key operations 表、確認日: 2026-10-03）
[^43]: Microsoft Learn『About keys - Azure Key Vault Managed HSM』ms.date 2026-05-21. https://learn.microsoft.com/en-us/azure/key-vault/managed-hsm/about-keys （参照箇所: Supported key types and sizes、Quantum-resistant cryptography、確認日: 2026-10-03）
[^44]: Microsoft Learn『Configure key autorotation in Azure Key Vault Managed HSM』ms.date 2026-04-28. https://learn.microsoft.com/en-us/azure/key-vault/managed-hsm/key-rotation （参照箇所: Overview の Warning（100版）、Key rotation policy（28日、Event Grid 非対応）、確認日: 2026-10-03）
[^45]: Google Cloud『Cloud HSM』最終更新 2026-09-30. https://docs.cloud.google.com/kms/docs/hsm （参照箇所: What is Cloud HSM?、メッセージサイズの制限、確認日: 2026-10-03）
[^46]: Google Cloud『Cloud KMS quotas』最終更新 2026-09-30. https://docs.cloud.google.com/kms/quotas （参照箇所: Timeline、Summary of changes、Cloud KMS quotas after February 16, 2026、Tokens per operation、確認日: 2026-10-03）
[^47]: Google Cloud『Key purposes and algorithms』最終更新 2026-09-30. https://docs.cloud.google.com/kms/docs/algorithms （参照箇所: Asymmetric signing algorithms、PQC signing algorithms、確認日: 2026-10-03）
[^48]: Google Cloud『Key rotation』最終更新 2026-09-30. https://docs.cloud.google.com/kms/docs/key-rotation （参照箇所: 非対称鍵の自動 rotation 非対応の記述、確認日: 2026-10-03）
[^49]: Google Cloud Blog『Future-proofing data integrity: quantum-safe digital signatures in Cloud KMS』2026-07-29. https://cloud.google.com/blog/products/identity-security/future-proofing-data-integrity-quantum-safe-digital-signatures-in-cloud-kms （参照箇所: GA 告知の段落、確認日: 2026-10-03。ベンダー自身の告知ブログ。署名アルゴリズムの GA 日付は脚注65のリリースノートの 2026-07-16 を正とし、ML-KEM の GA は同リリースノートに記録がないため未確認）
[^50]: RZ KSK PMA / IANA『DNSSEC Practice Statement for the Root Zone KSK Operator』8th Edition, 2025-04-14. https://www.iana.org/dnssec/procedures/ksk-operator/ksk-dps-20250414.html （参照箇所: §4.1.2、§4.2.2（Tier 7 と再構成要件）、§4.5.3.1、§5.1.4、§5.2、§5.2.1、§5.2.2、§5.2.3、§6.5、§7.1–7.3、確認日: 2026-10-03）
[^51]: IANA『Root KSK Ceremonies』. https://www.iana.org/dnssec/ceremonies （参照箇所: 冒頭説明と Ceremonies 一覧、確認日: 2026-10-03）
[^52]: IANA『Root KSK Ceremony 62』2026-08-12. https://www.iana.org/dnssec/ceremonies/62 （参照箇所: Ceremony Materials、確認日: 2026-10-03）
[^53]: Microsoft Learn『Manage emergency access admin accounts - Microsoft Entra ID』ms.date 2026-06-04. https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/security-emergency-access （参照箇所: Create emergency access accounts、Configuration requirements、Federation guidance、Security guardrails summary、確認日: 2026-10-03）
[^54]: SLSA (OpenSSF)『SLSA specification v1.2』Status: Approved. https://slsa.dev/spec/v1.2/ （参照箇所: 仕様状態表示、確認日: 2026-10-03）
[^55]: SLSA (OpenSSF)『SLSA v1.2: Build Track Basics』. https://slsa.dev/spec/v1.2/build-track-basics （参照箇所: Build levels 表、Build L2/L3 の要件、確認日: 2026-10-03）
[^56]: SLSA (OpenSSF)『SLSA v1.2: Source Track requirements』. https://slsa.dev/spec/v1.2/source-requirements （参照箇所: Source levels、Two-party review、Change history、確認日: 2026-10-03）
[^57]: SLSA Community『Announcing SLSA v1.2』2025-11-24. https://slsa.dev/blog/2025/11/announce-slsa-v1.2 （参照箇所: 本文冒頭、確認日: 2026-10-03）
[^58]: NIST (M. Souppaya, K. Scarfone, D. Dodson)『SP 800-218: Secure Software Development Framework (SSDF) Version 1.1』final, 2022-02. https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-218.pdf （参照箇所: Table 1 PO.5（PDF p.17–18）、PS.1（PDF p.18）、PS.2（PDF p.19）、確認日: 2026-10-03）
[^59]: NIST CSRC『SP 800-218 Rev. 1 (Initial Public Draft): SSDF Version 1.2』ipd, 2025-12-17. https://csrc.nist.gov/pubs/sp/800/218/r1/ipd （参照箇所: 状態・公表日・意見募集締切、確認日: 2026-10-03。同日に https://csrc.nist.gov/pubs/sp/800/218/r1/final が 404 であることも確認）
[^60]: Sigstore『Sigstore overview』. https://docs.sigstore.dev/about/overview/ （参照箇所: How Sigstore works（Cosign/Fulcio/Rekor、keyless signing）、確認日: 2026-10-03）
[^61]: Sigstore『Fulcio overview』. https://docs.sigstore.dev/certificate_authority/overview/ （参照箇所: 証明書有効期間、確認日: 2026-10-03）
[^62]: Open Policy Agent『Bundles』（Signing 節）. https://www.openpolicyagent.org/docs/management-bundles （参照箇所: Signing（.signatures.json、検証手順、keyid の解決順、検証失敗時の挙動）、確認日: 2026-10-03）
[^63]: M. Jones『RFC 7518: JSON Web Algorithms (JWA)』Standards Track, 2015-05. https://www.rfc-editor.org/rfc/rfc7518.html （参照箇所: §3.4 Digital Signature with ECDSA、確認日: 2026-10-03）
[^64]: NIST CMVP『Certificate #4600: HYCU Cryptographic Library Module』FIPS 140-2, 初回検証 2023-09-14. https://csrc.nist.gov/projects/cryptographic-module-validation-program/certificate/4600 （参照箇所: Status: Historical、Historical Reason「Moved to historical list due to sunsetting」、Validation History、確認日: 2026-10-03。同日に #4400・#4450・#4500・#4550 も同じ状態であることを照合）
[^65]: Google Cloud『Cloud Key Management Service release notes』（確認日時点の最新記載 2026-09-23）. https://docs.cloud.google.com/kms/docs/release-notes （参照箇所: 2026-07-16（PQC signing algorithms GA）、2026-08-06（quantum-safe key import Preview）、2025-09-23（KEMs Preview）、確認日: 2026-10-03）
