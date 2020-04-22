---
title: AWS Multi-account Strategy その1
date: 2020-04-22 20:30
category: aws
tags:
  - aws
---

# AWS Multi-account strategy その1

50人程度のチームでAWS運用をはじめて暫く立ったので運用に関しての方法論を整理して残しておく．

## はじめに

企業での利用のため割と厳しめの監査が発生する．
その監査に耐えうるような仕組みを構築しなければならないというのが第一の制限．
また色々なプロジェクトを立ち上げて外部協力会社にリソースを使わせたりしている．
身内以外が使え，更にプロジェクト毎にアイソレーションされなければならないというのが第二の制限．

これらを踏まえた上で環境構築をする必要があるのだが，正直AWSアカウント1個だと上記のことを実現するのは不可能．
はじめのうちはIAMユーザの権限を細かく変更することで対応出来なくはないが，規模が大きくなるにつれ管理コストが爆発し管理者は絶望するしかなくなる．

上記についてどうしようかと悩んでいたところ下記記事を見つけ，マルチアカウントなる方針を知ったのがおおよそ2年前．

Developers.IO: 【レポート】マルチアカウント戦略におけるセキュリティとガバナンスのアーキテクチャ設計 #reinvent #SID331
https://dev.classmethod.jp/articles/aws-reinvent-sid331/

ポイントとなるのが Organizations という機能で，これは `AWSアカウントを簡単に新規作成し，支払いをMasterアカウントに紐づける` 機能となる．
AWSアカウントを新規で作成しようとすると割と面倒くさいのだが上記を用いると数ステップで作成ができる．
これで所定の粒度でAWSアカウントを作成し，AWSアカウントという単位で諸々を分離することができるようになる[^1]．

ただ無軌道にAWSアカウントを作成して配ると皆さん割と無茶苦茶な事をするので，いくらかのガバナンスを効かせるための仕組みが必要となる．
このガバナンスをどの程度・どういう方向性で聞かせるかというのが問題で，効かせまくると使ってくれなくなるし，効かせないと無法地帯となるしで割と難しい問題．

これも悩んでいたところ下記記事を見つけ，`信ぜよ、されど確認せよ`というアプローチもあるんだなと学んだのがおおよそ1年前．

SlideShare: 「これ危ない設定じゃないでしょうか」とヒアリングするための仕組み @AWS Summit Tokyo 2018
https://www.slideshare.net/cyberagent/awssummit2018-ca-kakishimaazuma

これから色々と試行錯誤してようやく満足のいく構成が整いつつあるので，その内容をまとめるぞ！というのが本記事の位置づけ．

## マルチアカウント構成(Organizations)

Organizationsを使うとアカウントを量産できるが，それもある程度のルールが必要となる．

先のreinventの紹介記事にアカウント作成事例も乗っていたので参考に以下のように設計した．
ここら辺は状況に応じて適切なものも変わるので，適宜調整すると良いと思う．

* Coreアカウント
    * Master: Organizationsのマスタアカウント．Cloudformationを利用したリソース配布も行う
    * Audit: 監査機能・通知を集約するアカウント．
    * Log: 各種ログを集約するアカウント．
* Customアカウント
    * `Project_*`: プロジェクト毎に作成するアカウント
    * `Sandbox_*`: 個人毎に作成するアカウント
    * `Shared`: 利用者が広く利用するリソースを作成するアカウント(Webサービス，proxyなど)

更に，OrganizationsではService Control Policy(SCP)というアカウント単位で各リソースに対する権限を設定することができる．
例えば以下のような`Deny-All`というポリシーを作成し，アカウントに付与すると全く何もできなくなる．

```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Deny",
            "Action": "*",
            "Resource": "*"
        }
    ]
}
```

例えば`Action`の部分を`ec2:*`にするとEC2に関しては何もできなくなるし，`Resource`でARNを指定すると当該リソースのみ利用できなくなる．
また`Condition`という条件分岐も付与できる．

こうして定義したSCPはアカウント個別に紐づけることもできるが，Organizationsの機能で組織単位(OU; Organizational Unit)でアカウントをグルーピングしたうえでグループに対して適用することもできる．
OUというと分かりにくいが，ディレクトリ構造でアカウントをファイルのような形で放り込むようなイメージ．
SCPはファイル(アカウント)に紐づけたり，ディレクトリ(OU)に紐づける事ができ，親ディレクトリ(OU)の制限を子ディレクトリ(OU)は継承する[^2]．

上記のSCPとOUを駆使して以下のような権限設定を行い，各アカウントを`SHARE, JP_PUBLIC, JP_PRIVATE`のどれかに放り込むことでザックリとした権限設定を行う．

* JP_ONLY: 東京リージョン以外でのリソース作成を禁止する + IAMユーザの作成を禁止する
    * SHARE: ほかに制限なし
    * NOT_SHARE: 更にドメイン取得・作成を禁止する
        * JP_PUBLIC: ほかに制限なし
        * JP_PRIVATE: 更にEIP, IGW, NATといったインターネット接続する際に必要なリソース作成を禁止する

なお東京リージョンだけでは利用できないリソース(コンソールからアクセスした際に右上のリージョン表示がグローバルになるやつ)や，東京リージョン未対応な機能(SNSとか)は除外して以下のように設定している．

::: details
```
{
    "Version": "2012-10-17",
    "Statement": [
        {
			"Sid": "DenyActionOutsideJP",
			"Effect": "Deny",
			"NotAction": [
				"cloudformation:*",
				"sns:*",
				"ses:*",
				"ecs:*",
				"ecr:*",
				"ds:*",
				"health:*",
				"s3:*",
				"sts:*",
				"iam:*",
				"organizations:*",
				"route53:*",
				"route53domains:*",
				"budgets:*",
				"waf:*",
				"cloudfront:*",
				"globalaccelerator:*",
				"importexport:*",
				"support:*",
				"imagebuilder:*"
			],
			"Resource": [
				"*"
			],
			"Condition": {
				"StringNotEquals": {
					"aws:RequestedRegion": [
						"ap-northeast-1"
					]
				}
			}
		},
		{
			"Sid": "AllowActionOnTokyoVirginia",
			"Effect": "Deny",
			"Action": [
				"cloudformation:*",
				"sns:*"
			],
			"Resource": [
				"*"
			],
			"Condition": {
				"StringNotEquals": {
					"aws:RequestedRegion": [
						"ap-northeast-1",
						"us-east-1"
					]
				}
			}
		},
		{
			"Sid": "AllowActionOnVirginia",
			"Effect": "Deny",
			"Action": [
				"ses:*"
			],
			"Resource": [
				"*"
			],
			"Condition": {
				"StringNotEquals": {
					"aws:RequestedRegion": [
						"us-east-1"
					]
				}
			}
		},
		{
			"Sid": "DenyCreateIamCreateUser",
			"Effect": "Deny",
			"Action": "iam:CreateUser",
			"Resource": [
				"*"
			]
		}
    ]
}
```
:::

## ユーザアカウント管理(Single Sign-On)

OrganizationsのSCPでさらっと`IAMユーザの作成を禁止する`と記載したが，ではどのようにしてアカウントにログインすれば良いか．
ここでSingle Sign-On(SSO)機能を有効化することを考える．

SSOはOrganizationsと連携させることができ，Organizations影響化のAWSアカウントとSSOユーザの紐づけを行うことができる．
紐づけを完了した後SSOログインを行うと，以下のようにアクセスするAWSアカウントを選択することができる(例ではmasterとdevアカウントに紐づけたユーザでログインした)．

![SSOログインページ](/image/2020-04-22/sso_login.png)

`Management console`というリンクを選択するとmasterアカウントのWebコンソールに飛ぶことができ，`Command line or programmatic access`を選ぶとaws-cli用のcredentialを取得できる．

なおSSOログイン時に多要素認証(MFA; Multi-Factor Authentication)を強制させることができるため，Webコンソールへのアクセスおよびaws-cli利用時に自然とMFA認証を突破することを強制させることができる．
旧来のIAMログインの場合はWebコンソールのみMFAしてaws-cliにはMFAをかけないといった運用にしがちだが，SSOの場合はそれが解消できるのが嬉しい．
なおSSOログインにはExpiredTimeが指定されているようで，おおよそ2時間経過するとWebコンソールとaws-cliが利用できなくなる．
面倒くさいといえばそうだが，監査を考えると非常に有利．

デフォルトだとSSOユーザ作成時に登録したメールアドレスにワンタイムパスワードが到着するが，1Password等のアプリ認証に変更することができる．
SSOの設定から`MFAデバイスを管理できるユーザー`を`ユーザーと管理者がMFAデバイスを追加および管理できる`に変更して，利用者が独自に指定できるようにするといい．
利用者が登録する際は上記画面の右上の`My Devices`から登録画面に飛ぶことができる．

なおAWSアカウントにはSSOユーザかSSOグループのどちらかを紐づけする事ができる．
好みの問題もあるがユーザが増えると大変になるので，なるべくグループを作成してグループ単位で紐づけるようにするのをお勧め．

::: tip 
SSOはAWSアカウントと紐づけるだけでなく，Webサービスのログイン処理にも利用することができる．
SAML認証に対応していればOK．

企業の内部監査ではアカウント管理簿なる存在を作成する必要があると思うが，SSOに寄せていればSSOだけ管理すればよい(事が多い)ため．
:::


といったところで**その1**は終了．
次は作成したアカウントに対してどのようにガバナンスを効かせるかを執筆予定．


[^1]: ただし作成が容易になるだけであって削除は割と面倒くさい．なので作るときは本当に必要かを考えた方がいい
[^2]: AllowとDenyが混じるとしんどいので，ホワイトリスト(Allowのみ)にするかブラックリスト(Denyのみ)にするか，片方に寄せるのがベター
