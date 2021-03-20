---
title: AWS Multi-account Strategy その2
date: 2021-03-19 22:30
category: aws
tags:
  - aws
---

# AWS Multi-account strategy その2

前回からの続きで，作成したアカウントに対してガバナンスを効かせる方法について整理する．

なお東京リージョン以外でのリソース作成をOrganizationsのSCP機能で限定しているので，東京リージョンのみを考慮した書き方をしている．
他リージョンでのリソース作成を許可している場合はそっちも一緒にやること．

## はじめに

企業ルールによって色々とバリエーションはあるが，ざっと下記設定ができれば大半はカバーできるのではないかと思う．

1. コンプラ違反の検出(Config)
    * 各リソース作成時にルールを守って作成しているかを判定し，違反リソースが一目で見てわかる
    * Auditアカウント上で複数アカウントの判定結果を集約して見ることもできる
    * 自由に使ってもらいつつも最低限守ってほしいことはチェックするために利用
2. 監査用ログの自動収集(CloudTrail, CloudWatch)と保存(S3)とレポート作成(Athena)
    * AWSリソースの操作履歴をCloudTrailで，各ログをCloudWatchで確認できる
    * 手順5との組み合わせでEC2のログ情報もCloudWatchで確認できるようにする(操作ログも含)
    * 監査用ログ提出を求められた際にありません！ってならないように利用
3. 各種検出時のメール通知(SNS: SimpleNotificationService)
    * ConfigやCloudTrailで検出したセキュリティ通知をメールに転送する
    * Auditアカウント上で購読設定するだけで複数アカウントのセキュリティ通知を集約して受け取れる
    * 緊急対応が必要な場合をメールですぐわかるように利用(ちょっと改造すればslackとかでも受け取れる)
4. 脅威検出の設定(GuadDuty)
    * AWSマネージドな脅威検出機能
    * ウィルス対策ソフトとかWAF/IPS/IDSとかの代わりにはなれないけれど，あまりお金もかからないのでとりあえず有効にしとくとよい
5. セキュリティ対策済みのEC2イメージ配布(EC2ImageBuilder, Ansible)
    * 必須ソフトウェアをインストールしたEC2イメージを作成して配布する(ウィルス対策ソフトとか)
    * ついでにログ情報をCloudWatchにアップロードするように設定もしてしまう
    * 設定漏れ・ミスを防ぐために利用
6. EC2ログイン用の鍵とユーザ管理(SSM-SessionManager)
    * 鍵不要でもセキュアにSSH接続ができる
    * EC2の鍵とユーザ管理から解放されるために利用(建付け次第で管理簿が減らせるはず)
7. EC2のアプリケーションバージョン管理(SSM-inventory)
    * EC2にインストールされているアプリケーションのバージョン確認
    * セキュリティパッチが出てたら自動で適用するために利用(監視・保守労力を削減)

プラスアルファの対応が求められる場合場合は頑張って．

なお各アカウントにて手作業で設定するのはあほらしいのでCFn(CloudFormation)により上記を行えるようにしたほうが良い．
今回はCFnの設定と，本格的に新規作成アカウントの設定を行う前にAuditアカウントとLogアカウントの設定を説明する．

AuditとLogアカウントの位置づけは前回参照．

## CFn

CloudFormationはテンプレートに沿ってAWSリソースを作成できる機能．
AWSの設定の殆どが自動化でき，さらにOrganizations環境下ではMasterアカウントから各サブアカウントに作成指示を出すことができる．
自アカウント上で作成する際はStack機能，サブアカウントに作成指示を出す際はStackSets機能をそれぞれ利用する．

アカウントが数個レベルなら手作業でやってもよいが(それでも間違うときは間違うので**絶対にやめたほうが良い**)，数十個超えると死ぬので必須だと思ったほうが良い．
利用するにあたってはMasterアカウント上での設定と，各サブアカウント上での設定の大きく2種類が必要となる．

MasterアカウントでStackSetsを実行するIAMロール(AdministrationRole)を作成し，対象となるサブアカウント(移行，Targetアカウントと呼ぶ)でリソースを作成するIAMロール(ExecutionRole)を作成する．

ちょっと細かい話をすると，

1. StackSetsをAdministrationRole@Masterロールで実行する
2. AdministrationRole@MasterからExecutionRole@TargetにAssumeRoleする
3. Targetアカウント上でテンプレートをExecutionRoleロールで実行する

という動きをする．
セキュリティ対策のためExecutionRoleはMasterアカウントのAdministrationRoleからのみAssumeRoleを許容するようにすること．

各アカウントの[CFnのStackダッシュボード](https://ap-northeast-1.console.aws.amazon.com/cloudformation/home?region=ap-northeast-1#/stacks)に移動し，以下のパラメータで実行する．
AWSがテンプレートを用意してくれているので活用する．

Masterアカウントの設定

* テンプレートソース: Amazon S3 URL
* Amazon S3 URL: https://s3.amazonaws.com/cloudformation-stackset-templates-us-east-1/master_account_role.template
* スタックの名前: common-role-cfn-admin

Targetアカウントの設定

* テンプレートソース: Amazon S3 URL
* Amazon S3 URL: https://s3.amazonaws.com/cloudformation-stackset-templates-us-east-1/managed_account_role.template
* スタックの名前: common-role-cfn-execute

## 監査アカウントの設定

Auditアカウント(監査機能・通知を集約するアカウント)を設定する．

大きく2つの設定を行う．

1. セキュリティ通知をメールで受け取れるようにする
2. Config集約する

CfnのTargetアカウントの設定が実行しておくこと．

### セキュリティ通知

2つのSNSトピック作成とメール購読設定を行う．

* SNSAllConfigurationトピック
  * Auditアカウント上でのConfigとCloudTrailのセキュリティ通知用トピック
  * 後の設定で全アカウントのConfig監視がAuditアカウントに集約されて，めっちゃメールが飛んでくるので注意
* SNSNotificationトピック
  * Targetアカウントのセキュリティ通知を集約して受け取るためのトピック

以下の内容で`security-topic.yml`を作成する．

::: details
```yml
AWSTemplateFormatVersion: 2010-09-09
Description: Configure the SNS Topics for Security Account

Parameters:
  ManagedResourcePrefix:
    Type: 'String'
    Description: 'Prefix for the managed resources'
    Default: "aws-organizations"
  AllConfigurationEmail:
    Type: 'String'
    Description: Email for receiving all AWS configuration events
  SecurityNotificationEmail:
    Type: 'String'
    Description: Email for the security administrators
  OrgID:
    Type: 'String'
    Description: AWS Organizations ID
  SubscribeToAllConfigurationTopic:
    Type: String
    Default: false
    Description: Indicates whether AllConfigurationEmail will be subscribed to the AllConfigurationTopicName topic.
    AllowedValues:
      - true
      - false

Conditions:
  Subscribe: !Equals
    - !Ref SubscribeToAllConfigurationTopic
    - 'true'

Mappings:
  TopicNameSuffix:
    AllConfigurationTopicName:
      Suffix: 'AllConfigNotifications'
    NotifyTopicName:
      Suffix: 'AggregateSecurityNotifications'

Resources:
  SNSAllConfigurationTopic:
    Type: AWS::SNS::Topic
    Properties:
      DisplayName: !Join [ "-", [ !Ref ManagedResourcePrefix, !FindInMap [TopicNameSuffix, AllConfigurationTopicName, Suffix] ]]
      TopicName: !Join [ "-", [ !Ref ManagedResourcePrefix, !FindInMap [TopicNameSuffix, AllConfigurationTopicName, Suffix] ]]

  SNSAllConfigurationTopicPolicy:
    Type: AWS::SNS::TopicPolicy
    Properties:
      Topics:
        - !Ref SNSAllConfigurationTopic
      PolicyDocument:
        Statement:
          - Sid: AWSSNSPolicy
            Action:
              - sns:Publish
            Effect: Allow
            Resource: !Ref SNSAllConfigurationTopic
            Principal:
              Service:
                - cloudtrail.amazonaws.com
                - config.amazonaws.com

  SNSAllConfigurationEmailNotification:
    Condition: Subscribe
    Type: AWS::SNS::Subscription
    Properties:
      Endpoint: !Ref AllConfigurationEmail
      Protocol: email
      TopicArn: !Ref SNSAllConfigurationTopic

  SNSNotification:
    Type: AWS::SNS::Topic
    Properties:
      DisplayName: !Join [ "-", [ !Ref ManagedResourcePrefix, !FindInMap [TopicNameSuffix, NotifyTopicName, Suffix] ]]
      TopicName: !Join [ "-", [ !Ref ManagedResourcePrefix, !FindInMap [TopicNameSuffix, NotifyTopicName, Suffix] ]]
      Subscription:
      - Protocol: email
        Endpoint: !Ref SecurityNotificationEmail

  SNSNotificationPolicy:
    Type: AWS::SNS::TopicPolicy
    Metadata:
      cfn_nag:
        rules_to_suppress:
          - id: F18
            reason: "Conditions restrict permissions to Organization account and publishing only to member accounts."
    Properties:
      Topics:
        - !Ref SNSNotification
      PolicyDocument:
        Statement:
          - Sid: __default_statement_ID
            Effect: Allow
            Principal:
              AWS: "*"
            Action:
            - SNS:GetTopicAttributes
            - SNS:SetTopicAttributes
            - SNS:AddPermission
            - SNS:RemovePermission
            - SNS:DeleteTopic
            - SNS:Subscribe
            - SNS:ListSubscriptionsByTopic
            - SNS:Publish
            - SNS:Receive
            Resource: !Ref SNSNotification
            Condition:
              StringEquals:
                AWS:SourceOwner: !Sub ${AWS::AccountId}
          - Sid: AWSSNSPolicy
            Effect: Allow
            Principal:
              AWS: "*"
            Action: sns:Publish
            Resource: !Ref SNSNotification
            Condition:
              StringEquals:
                aws:PrincipalOrgID: !Ref OrgID

Outputs:
  SecurityTopicARN:
    Description: Security Notification SNS Topic ARN
    Value: !Ref SNSNotification
  SecurityTopicName:
    Description: Security Notification SNS Topic Name
    Value: !GetAtt SNSNotification.TopicName
  AllConfigTopicARN:
    Description: All Configuration Notification SNS Topic ARN
    Value: !Ref SNSAllConfigurationTopic
  AllConfigTopicName:
    Description: All Configuration Notification SNS Topic Name
    Value: !GetAtt SNSAllConfigurationTopic.TopicName
```
:::


パラメータのうち重要なものを説明．

* AllConfigurationEmail: SNSAllConfigurationトピックを受け取るメールアドレス
* SecurityNotificationEmail: SNSNotificationトピックを受け取るメールアドレス
* OrgID: OrganizationsのID．Masterアカウント上で調べたのを記載
* SubscribeToAllConfigurationTopic: AllConfigurationEmail有効化のフラグ．trueだと通知が飛ぶ．めっちゃ多いのでプログラム処理しない限りfalse推奨

以下のように実行する．Masterアカウントのcredentialを取得して設定しておくこと．

```sh
EMAIL_ALL='"<全通知を受けるメールアドレス>"'
EMAIL_NOTIFY='"<セキュリティ通知を受けるメールアドレス>"'

STACK_NAME=AWSOrganizations-SecurityTopic
REGIONS='["ap-northeast-1"]'
ORG_ID=`aws organizations describe-organization | jq ".Organization.Id"`
ACCOUNT=`aws organizations list-accounts | jq '.Accounts[] | select(.Name == "audit") | .Id'`

aws cloudformation create-stack-set --stack-set-name ${STACK_NAME} --template-body file://security-topic.yml
  --parameters \
    ParameterKey=AllConfigurationEmail,ParameterValue=${EMAIL_ALL} \
    ParameterKey=SecurityNotificationEmail,ParameterValue=${EMAIL_NOTIFY} \
    ParameterKey=OrgID,ParameterValue=${ORG_ID}

aws cloudformation create-stack-instances --stack-set-name ${STACK_NAME} --accounts "[${ACCOUNT}]" --regions ${REGIONS}
```

### Config集約設定

以下の内容で`security-resource.yml`を作成する．

::: details
```yml
AWSTemplateFormatVersion: 2010-09-09
Description: Configure the Cross-Account IAM Audit Roles for Audit Account

Parameters:
  ManagedResourcePrefix:
    Type: 'String'
    Description: 'Prefix for the managed resources'
    Default: 'aws-organizations'
  Accounts:
    Type: 'String'
    Description: 'Account Ids with csv'

Resources:
  AdministrationRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub ${ManagedResourcePrefix}-AuditAdministratorRole
      AssumeRolePolicyDocument:
        Version: 2012-10-17
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action:
              - sts:AssumeRole
      Path: /
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/AWSLambdaExecute
      Policies:
        - PolicyName: !Sub AssumeRole-${ManagedResourcePrefix}-AuditAdministratorRole
          PolicyDocument:
            Version: 2012-10-17
            Statement:
              - Effect: Allow
                Action:
                  - sts:AssumeRole
                Resource:
                  - !Sub "arn:aws:iam::*:role/${ManagedResourcePrefix}-AdministratorExecutionRole"

  ReadOnlyRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub ${ManagedResourcePrefix}-AuditReadOnlyRole
      AssumeRolePolicyDocument:
        Version: 2012-10-17
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action:
              - sts:AssumeRole
      Path: /
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/AWSLambdaExecute
      Policies:
        - PolicyName: !Sub AssumeRole-${ManagedResourcePrefix}-AuditReadOnlyRole
          PolicyDocument:
            Version: 2012-10-17
            Statement:
              - Effect: Allow
                Action:
                  - sts:AssumeRole
                Resource:
                  - !Sub "arn:aws:iam::*:role/${ManagedResourcePrefix}-ReadOnlyExecutionRole"

  ConfigAggregator:
    Type: AWS::Config::ConfigurationAggregator
    Properties:
      AccountAggregationSources:
        - AccountIds: !Split [",", !Ref Accounts]
          AllAwsRegions: true
      ConfigurationAggregatorName: !Sub ${ManagedResourcePrefix}-ConfigAggregator

Outputs:
  CrossAccountAdminRole:
    Description: Audit Administrator Role
    Value: !GetAtt 'AdministrationRole.Arn'
  CrossAccountReadOnlyRole:
    Description: Audit ReadOnly Role
    Value: !GetAtt 'ReadOnlyRole.Arn'
```
:::

以下のように実行する．Masterアカウントのcredentialを取得して設定しておくこと．

```sh
STACK_NAME=AWSOrganizations-SecurityResource
REGIONS='["ap-northeast-1"]'

ACCOUNT=`aws organizations list-accounts | jq '.Accounts[] | select(.Name == "audit") | .Id'`
TARGET_ACCOUNT=`aws organizations list-accounts | jq '[.Accounts[] | select(.Name != "master" and .Name != "audit" and .Name != "log") | .Id] | join(",")'`

aws cloudformation create-stack-set --stack-set-name ${STACK_NAME} --template-body file://security-resource.yml --capabilities CAPABILITY_NAMED_IAM --parameters "ParameterKey=Accounts,ParameterValue=${TARGET_ACCOUNT}"
aws cloudformation create-stack-instances --stack-set-name ${STACK_NAME} --accounts "[${ACCOUNT}]" --regions ${REGIONS}
```

## ログアカウントの設定

Logアカウント(各種ログの集約するアカウント)の設定を行う．
CfnのTargetアカウントの設定が実行しておくこと．

以下のS3バケットを作成する．

* S3アクセスログ: `${ManagedResourcePrefix}-s3-access-logs-${AWS::AccountId}-${AWS::Region}`
  * 各種ログの改ざん防止に．詳細ログを記録
* 各種ログ: `${ManagedResourcePrefix}-logs-${AWS::AccountId}-${AWS::Region}`
  * Targetアカウントの各種ログが集約さる

以下の内容で`logging-resource.yml`を作成する．

::: details
```yml
AWSTemplateFormatVersion: 2010-09-09
Description: Configure an Audit S3 bucket for the Log Archive account.

Parameters:
  SSEAlgorithm:
    Type: 'String'
    Default: 'AES256'
    Description: S3 bucket SSE Algorithm.
    AllowedValues:
    - 'AES256'
  ManagedResourcePrefix:
    Type: 'String'
    Description: 'Prefix for the managed resources'
    Default: "aws-organizations"
  RetentionDays:
    Type: String
    Description: 'No of Days to retain the logs, after which it will be permanently deleted'
    Default: 365
  TransitionToGlacier:
    Type: String
    Description: 'Do you wish to transition the logs to Glacier before permanently deleting?'
    Default: 'No'
    AllowedValues:
    - 'Yes'
    - 'No'
  TransitionDays:
    Type: String
    Description: 'No of Days to transition the data from S3 to Glacier'
    Default: 90
  AWSLogsS3KeyPrefix:
    Type: 'String'
    Description: 'Organization ID to use as the S3 Key prefix for storing the audit logs'

Conditions:
  MoveToGlacier: !Equals
    - !Ref TransitionToGlacier
    - 'Yes'

Resources:
  # Create S3 Server Access Logging bucket
  S3LoggingBucket:
    DeletionPolicy: Retain
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub ${ManagedResourcePrefix}-s3-access-logs-${AWS::AccountId}-${AWS::Region}
      AccessControl: LogDeliveryWrite
      VersioningConfiguration:
        Status: Enabled
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: !Ref SSEAlgorithm
  # Create S3 Audit bucket
  S3AuditBucket:
    DeletionPolicy: Retain
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub ${ManagedResourcePrefix}-logs-${AWS::AccountId}-${AWS::Region}
      VersioningConfiguration:
        Status: Enabled
      LoggingConfiguration:
        DestinationBucketName: !Ref S3LoggingBucket
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: !Ref SSEAlgorithm
      LifecycleConfiguration:
        Rules:
        - !If
          - MoveToGlacier
          - Id: RetentionRule
            Status: Enabled
            ExpirationInDays: !Ref RetentionDays
            NoncurrentVersionExpirationInDays: !Ref RetentionDays
            Transitions:
                - TransitionInDays: !Ref TransitionDays
                  StorageClass: Glacier
            NoncurrentVersionTransitions:
                - TransitionInDays: !Ref TransitionDays
                  StorageClass: Glacier
          - Id: RetentionRule
            Status: Enabled
            ExpirationInDays: !Ref RetentionDays
            NoncurrentVersionExpirationInDays: !Ref RetentionDays
  # Create Bucket Policy for S3 Audit bucket
  S3AuditBucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref S3AuditBucket
      PolicyDocument:
        Version: 2012-10-17
        Statement:
          - Sid: AWSBucketPermissionsCheck
            Effect: Allow
            Principal:
              Service:
                - cloudtrail.amazonaws.com
                - config.amazonaws.com
            Action: s3:GetBucketAcl
            Resource:
              - !Sub "arn:aws:s3:::${S3AuditBucket}"
          - Sid: AWSBucketDelivery
            Effect: Allow
            Principal:
              Service:
                - cloudtrail.amazonaws.com
                - config.amazonaws.com
            Action: s3:PutObject
            Resource: !Sub "arn:aws:s3:::${S3AuditBucket}/${AWSLogsS3KeyPrefix}/AWSLogs/*/*"

Outputs:
  BucketName:
    Description: Audit S3 bucket name
    Value: !Ref S3AuditBucket
  LoggingBucketName:
    Description: S3 Access Logging Bucket name
    Value: !Ref S3LoggingBucket
  AuditLogsS3KeyPrefix:
    Description: S3 Key prefix for storing the audit logs
    Value: !Ref AWSLogsS3KeyPrefix
```
:::

パラメータのうち重要なものを説明．

* RetentionDays: 保持期間．適切に設定すべし
* AWSLogsS3KeyPrefix: バケットのPrefix名の設定．基本何でもいいけど，私はOrganizationsのIDにすることが多い

以下のように実行する．Masterアカウントのcredentialを取得して設定しておくこと．

```sh
STACK_NAME=AWSOrganizations-LoggingResource
REGIONS='["ap-northeast-1"]'

ACCOUNT=`aws organizations list-accounts | jq '.Accounts[] | select(.Name == "log") | .Id'`
ORG_ID=`aws organizations describe-organization | jq ".Organization.Id"`

aws cloudformation create-stack-set --stack-set-name ${STACK_NAME} --template-body file://logging-resource.yml \
  --parameters "ParameterKey=AWSLogsS3KeyPrefix,ParameterValue=${ORG_ID}"

aws cloudformation create-stack-instances --stack-set-name ${STACK_NAME} --accounts "[${ACCOUNT}]" --regions ${REGIONS}
```
