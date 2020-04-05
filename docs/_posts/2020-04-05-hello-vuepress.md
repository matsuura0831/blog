---
title: Hello Vuepress
date: 2020-04-05
category: blog
tags:
  - blog
  - vuepress
---

# Hello Vuepress

https://vuepress.vuejs.org/ という静的サイトジェネレータを作成してサイト作成を行った時の手順について説明する．

## 環境構築

ホストOSによる違いが出るのは嫌だったのですべてdocker上で動作させる．

`git`インストールしているのは`vscode`の`Remote-Container`でdockerイメージ内で作業する際に`git`コマンドを直接入力できるようにするため．
もし不要なら当該行は削除してもよい．

```docker
$ cat docker/Dockerfile

FROM node:13.12-alpine

RUN apk update && apk add git
ADD .yarnrc $HOME/.yarnrc

WORKDIR /workspace
ADD package.json /workspace/package.json
RUN yarn install

ADD docs /workspace/docs
CMD ["yarn", "build"]
```

イメージ作成に当たって，追加したファイルは`.yarnrc`と`package.json`の2種類．

まず`.yarnrc`で`yarn install`した時に`/workspace/node_module/`から`/opt/node_modules`以下にインストールされるように修正．
全ファイルを`docker -v`でマウントする際に`node_modules`を上書きしないようにするため．

```rc
$ cat .yarnrc

--modules-folder /opt/node_modules
```

また`package.json`で`RUN yarn install`でインストールされるパッケージのバージョンを固定．

```json
$ cat package.json

{
    "scripts": {
        "dev": "yarn vuepress dev docs",
        "build": "yarn vuepress build docs",
        "debug": "node --nolazy --inspect-brk=9229 /opt/node_modules/.bin/vuepress dev docs"
    },
    "devDependencies": {
        "vuepress": "^1.4.0"
    }
}
```

ついでにコマンドをいくつか登録しておく．

* ローカルサーバ起動(`scripts.dev`)
* ビルド実行(`scripts.build`)
* vscodeでのデバッグ実行用(`scripts.debug`)

また`docker-compose`用のファイルも作成しておく．

```yaml
$ cat docker-compose.yml

version: "3"

services:
  www:
    build:
      context: .
      dockerfile: docker/Dockerfile
    ports:
      - "8080:8080"
      - "9229:9229"
    volumes:
      - ".:/workspace"
    command: yarn dev
```

この時点でフォルダ構成は以下の通り．

```
<prj-root>/
├── package.json
├── .yarnrc
├── docker-comopse.yml
└── docker/
    └── Dockerfile
```

ビルドがうまくいくかこの時点で一度確認する．

```sh
docker-compose build
```

OKだったら次の作業へ．

## Tutorial

公式のチュートリアルが一番分かりやすいと思うが，作業手順としてやったことを残しておく．

各ファイルを配置する`docs/`と，ジェネレートしたファイルを配置する`build/`を追加する．

```
<prj-root>/
├── package.json
├── .yarnrc
├── docker-comopse.yml
|── docker/
|   └── Dockerfile
|── docs/
|   |── index.md
|   |── about/
|   |   └── index.md
|   └── .vuepress/
|       └── config.js
└── build/
```

`docs/index.md`と`docs/about/index.md`がジェネレート元のmarkdownファイルになる．
現時点では適当に作る(あとでしっかり書き直すこと)．

```sh
mkdir -p docs/about

echo "# Home" >> docs/index.md
echo "# About" >> docs/about/index.md
```

で`docs/.vuepress/config.js`がVuePressの設定ファイルとなる．

```js
module.exports = {
    base: '/',
    dest: './build',

    title: '<your site title>',
    description: '<your site description>',
    locales: {
        '/': { lang: 'ja' },
    },
    themeConfig: {
        sidebar: 'auto',
        nav: [
            { text: 'Home', link: '/' },
            { text: 'About', link: '/about/' },
        ]
    },
}
```

それぞれ`<something>`となっている部分は適宜書き換えること．

ここまで出来たら一度テスト実行してみる．

`docker-compose.yml`の`services.www.command`で`yarn dev`が実行されるようにしているので`docker-compose up`するだけでローカルサーバが立ち上がる．

起動完了した旨のログが出力されたら http://localhost:8080 にアクセスして確認する，

## Githubへの自動デプロイ

生成したページをgithub上で公開する．
githubユーザ用のページ https://your-github-id.github.io/ と，リポジトリ用のページ https://your-github-id.github.io/repository-name/ の2種類の方法がある．

今回は前者の方法をとり，さらに自ドメインからアクセスできるようにする．

更に，いちいち記事書いてbuildしてpushして．．．が面倒なので，`develop`ブランチにマークダウンファイルがpushされたら自動で公開までやってくれるようGithub Acions設定も行う．

### リポジトリ設定

最低限必要なのは以下の3つ．

1. `your-github-id.github.io` というリポジトリを作成する
2. `Github Pages`有効化
2. リポジトリにpushするための公開鍵，秘密鍵を登録する

#### リポジトリ作成

リポジトリ名を間違えないことに注意

#### GithubPages有効化

リポジトリサイトから `Settings(Tab) > Options(Left-Navigation) > Github Pages` と移動し，`Source`を`master branch`にする．
以降 https://your-github-id.github.io/ にアクセスすると`master`ブランチ以下のファイルを読み込んで表示される．

`custom domain` に自ドメインを登録すると https://your-domain/ に切り替わるが，自動デプロイ実行した際に設定が初期化されるのでここでは何もしない．

なお[Github Pages サイトのカスタムドメインを管理する](https://help.github.com/ja/github/working-with-github-pages/managing-a-custom-domain-for-your-github-pages-site) の`Apexドメインを設定する`を参考に，自ドメインに`A`レコードを幾つか登録しておくこと．

#### 鍵登録

```sh
ssh-keygen -t rsa -b 4096 -C "$(git config user.email)" -f gh-pages -N ""
```

出来上がった公開鍵(`gh-pages.pub`)と秘密鍵(`gh-pages`)をリポジトリサイトに登録する．

* 公開鍵: `Setting(Tab) > Deploy Keys(Left-Navigation) > Add deploy key`
  * `Title`は適当でよい(あとでなんの鍵か分かれば)
  * `Key`に公開鍵の中身をコピペする
* 秘密鍵: `Setting(Tab) > Secrets(Left-Navigation) > Add new secret`
  * `Name`は`ACTIONS_DEPLOY_KEY`にする(actions内で参照する際に利用するので変えないように)
  * `Value`は秘密鍵の中身をコピペする

### ソースコード設定

リポジトリ側の設定が終わったら，ソースコードの設定に移る．
まずこれまで作成したファイルを`develop`ブランチにpushしておく．

```sh
cd <prj-root>
git init
git remote add origin git://your-github-id.github.io

git branch develop
git checkout develop

git add .
git commit -m "first commit."
git push -u origin develop
```

次にgithub action用のファイルを追加する．

```
<prj-root>/
├── .github/
|   |── actions/
|   |   └── build/
|   |       └── Dockerfile
|   └── workflows/
|       └── vuepress.yml
|── static/
|   |── README.md
|   └── CNAME
...
```

`.github/workflows/vuepress.yml`がAction実行フローが記載されたファイルで，`.gihub/actions/build/Dockerfile`がその中でビルドするために利用するファイル．

```yaml
$ cat .github/workflows/vuepress.yml

name: CI
on:
  push:
    branches: [ develop ]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Copy package
      run: cp ./package.json ./.yarnrc .github/actions/build
    - name: Build
      uses: ./.github/actions/build
    - name: Copy static files
      run: sudo cp -rf ./static/* ./build/
    - name: Deploy
      uses: peaceiris/actions-gh-pages@v2
      env:
        ACTIONS_DEPLOY_KEY: ${{ secrets.ACTIONS_DEPLOY_KEY }}
        EXTERNAL_REPOSITORY: matsuura0831/matsuura0831.github.io
        PUBLISH_BRANCH: master
        PUBLISH_DIR: ./build
```

ポイントは`name: Copy package`と，`name: Copy static files`の2箇所．

`Copy package`では`.github/actions/build/Dockerfile`のビルド用ファイルを同階層にコピーしている．
ビルド時のディレクトリが`.github/actions/build`以下で行われる用で，`../../../package.json`で参照できなかったための苦肉の策．

`Copy static files`ではビルドしたファイルに`static/`以下のファイルをコピーしている．
`actions-gh-pages`でデプロイした場合，同階層内がごっそり置き換えられるため，`README.md`や`CNAME`(リポジトリ設定の`custom domain`を入力すると作られるファイル)も失われてしまう．
これらファイルを混ぜ込むことで維持する用にしている．
`sudo`をつけてるのは`Permission Denied`で怒られたためで，なぜ必要かはちゃんと理解していない．

```sh
echo "# Blog" > static/README.md
echo "your-domain" > static/CNAME
```

`.github/actions/build/Dockerfile`も作成しておく．中身は`docker/Dockerfile`とあまり変わらない(`git`インストールをやめたぐらい)．

```docker
FROM node:13.12-alpine

ADD .yarnrc $HOME/.yarnrc

WORKDIR /workspace
ADD package.json /workspace/package.json
RUN yarn install

CMD ["yarn", "build"]
```

ここまで完成したらpushして動作するか確認する．

```sh
git add .github
git add static
git commit -m "add auto deploy github action flow."
git push
```

適当に`docs/index.md`を弄ってビルドが成功するか確認する．

```sh
echo "# Home!" > docs/index.md
git add docs/index.md
git commit -m "github action test!"
git push
```

ビルド状況はgithubのリポジトリサイトの`Actions`タブから確認できる．
失敗していたら当該箇所の修正を行い，成功したら https://your-domain にアクセスして確認すること．

## VSCodeデバック実行

VuePressをカスタマイズするにあたりデバック実行ができるように環境を整える．

IDEとしては[Visual Studio Code(vscode)](https://azure.microsoft.com/ja-jp/products/visual-studio-code/)を利用する．
またホストOSではなくdockerイメージ内で動作させるため[Remote Development拡張](https://code.visualstudio.com/docs/remote/containers)をインストールしておく．

上記が完了したら以下の手順でコンテナ内に入る．

1. `develop`ブランチを`vscode`で開く
2. `F1`を押下して出た入力欄に`Remote-Containers: Open Folder in Container`を入力
3. どのコンテナを参照するか聞かれるので，ローカルの`docker-compose.yml`を指定する
4. ビルドが走ってwindowが立ち上がり直したら完了

メニューの`Debug > Run > Start Debugging`を押下した際にvuepressがデバック実行されるように設定を行う．

```json
$ cat .vscode/launch.json

{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "Debug VuePress",
            "runtimeExecutable": "npm",
            "runtimeArgs": [
                "run-script",
                "debug"
            ],
            "port": 9229
        }
    ]
}
```

あとは`docs/.vuepress/config.js`に適当にBreakpointを設置して，デバック実行すると止まってくれることを確認できればOK．

