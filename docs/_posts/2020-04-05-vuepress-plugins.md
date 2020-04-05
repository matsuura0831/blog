---
title: Develop VuePress plugins
date: 2020-04-05 23:00
category: blog
tags:
  - blog
  - vuepress
---

# Develop VuePress plugins

::: warning
現在執筆中です．内容が更新される可能性があります．
:::

VuePressを改造するにあたり幾つかの選択肢が存在するの整理していく．

[[toc]]

## VueComponent

[Using Vue in Markdown](https://v1.vuepress.vuejs.org/guide/using-vue.html)

VueComponent(Vue.js勉強し始めたところなのでよく分かってない)で部品を作ってMarkdown内で利用できる．
DOMを追加したり単純にjs実行したりできるので自由度は高い．

明示的にMarkdown内で呼び出す必要があり，更にサイト全体に関係する操作(例: sidebar挙動変更)はできないためピンポイントで部品を導入する用途．

## Plugin

サイト全体に影響する操作はこちらで実装する．

以下のように記述すると`./docs/.vuepress/myplugin/index.js`が読み込まれる．

```yaml{4}
module.exports = {
    ...
    plugins: [
        require('./myplugin'),
    ],
}
```

`myplugin/index.js`は以下のように記述する．

```js
$ cat ./docs/.vuepress/myplugin/index.js

module.exports = (option, context) => ({
    async ready() {
      console.log(this);
    },

    extendPageData($page) {
        const {
            _filePath,           // file's absolute path
            _computed,           // access the client global computed mixins at build time, e.g _computed.$localePath.
            _content,            // file's raw content string
            _strippedContent,    // file's content string without frontmatter
            key,                 // page's unique hash key
            frontmatter,         // page's frontmatter object
            regularPath,         // current page's default link (follow the file hierarchy)
            path,                // current page's real link (use regularPath when permalink does not exist)
        } = $page
        console.log(this, $page);
    },
    additionalPages() {
        console.log(this);
        return [ {
            path: '/readme/',
            filePath: path.resolve(__dirname, 'README.md')
        }, ]
    },
    enhanceAppFiles: path.resolve(__dirname, 'client.js'),
});
```

更に`client.js`は以下のように記述する．

```js
$ cat ./docs/.vuepress/myplugin/client.js

module.exports = ({ Vue, options, router, siteData }) => {
    console.log(Vue, options, router, siteData);
} 
```

`README.md`はサンプルなので適当に．

```sh
echo "# Plugin REAME" >> ./docs/.vuepress/myplugin/REAMDE.md
```

ここまで準備できればVSCode上でデバック実行するとよい．
次章にてざっと解析結果と所感を書いていく．

### extendPageData

```js
    extendPageData($page) {
        const {
            _filePath,           // file's absolute path
            _computed,           // access the client global computed mixins at build time, e.g _computed.$localePath.
            _content,            // file's raw content string
            _strippedContent,    // file's content string without frontmatter
            key,                 // page's unique hash key
            frontmatter,         // page's frontmatter object
            regularPath,         // current page's default link (follow the file hierarchy)
            path,                // current page's real link (use regularPath when permalink does not exist)
        } = $page
```

上のは公式サイトからパクってきたソースだが，ここで以下のようなことがわかる．

* `extendPageData`: ページ毎に呼ばれる
* `_computed`: 全設定が入っている
  * ページ全体に影響するような操作が可能(sidebarとか)
  * レコードを追加すれば後述する処理で参照してもらえるかも(categories, tags変数作成とか)
* `_content`, `_strippedContent`: markdown内容が入っている
  * 特定のワードを書き換えたりとか？でも`markdown-it-*`で対応した方がいい気がする
* `key`: 取り出しているのはいいけど用途が分からん．記事単位でユニークなのが生きる場合に
* `frontmatter`: フロントマットが入っている
  * 特定条件で追加したり，参照して処理したり
* `regularPath`, `path`: 両方ともファイルパスが入っている
  * 使い分けがよくわからない．．．`path`を書き換えたら対応してURLも変わることは確認
  * ただ`frontmatter.permalink`を弄った方がキーワード使えるのでおすすめ

### additionalPages

返した値に応じてPage(URL)が作成されるので，動的にページ追加したい場合に利用する形．

```js
module.exports = (option, context) => ({
```

引数はないが上記`context`にはアクセスできるので，動的に処理するといった操作は可能．
`context`で重要そうなのは`context.siteConfig`, `context.themeConfig`, `context.pages`あたり．
ただ利用用途は思いつかない．

### ready

上記処理が一通り終わってから呼び出される．
`extendPageData`で処理した結果を`context`に登録したり，`context`の一部を一括で変換(ソートとか)するために利用する形か．

### enhanceAppFile

これは上記とは異なりブラウザ上で実行する．
`extendPageData`で不可能だった操作をこっちでやる感じか．

ただブラウザ上で実行されるということは処理が重いとその分ユーザをイライラさせるので使いどころは気を付けた方がよさそう．
