---
title: Customize VuePress Blog
date: 2020-04-19 13:00
category: blog
tags:
  - blog
  - vuepress
---

# Customize VuePress BLog

VuePressをBlog用にカスタマイズする手順を記す．

[[toc]]

## Plugin

### @vuepress/plugin-blog

Blog用にするためのプラグインとして [@vuepress/plugin-blog](https://vuepress-plugin-blog.ulivz.com/guide/getting-started.html)をインストールする．
多機能なプラグインでタグ・カテゴリ・記事一覧ページを作ったり，RSSを作ったり，サイトマップを作ったりできる．

なお，あくまでもプラグインなので〇〇ページを作る際に自分でレイアウトを作成する必要がある．
レイアウトも一緒になった [@vuepress/theme-blog](https://vuepress-theme-blog.ulivz.com/) もあるので面倒ならそっちを使ってもよさそう．
あるいは [他のテーマ](https://github.com/vuepressjs/vuepress-plugin-blog#projects-using-vuepressplugin-blog) で気に入ったのがあればそれを導入して終了としてもいい．

ただテーマを導入するとカスタムがめちゃくちゃ大変になるので，最小構成で動かせる意味でもまずは `@vuepress/plugin-blog` のみの導入をおすすめ．

インストールはyarnで一発．

```sh
yarn add -D @vuepress/plugin-blog
```

また`docs/.vuepress/convig.js`で設定する．

```js
const BASE_URL = "https://besolab.com";

module.exports = {
    plugins: [
        ['@vuepress/blog', {
            feed: { canonical_base: BASE_URL, },
            sitemap: {
                hostname: BASE_URL,
                changefreq: "weekly"
            },
            directories: [
                {
                    id: 'post',
                    dirname: '_posts',
                    path: '/',
                    itemPermalink: '/:year/:month/:day/:slug',
                },
            ],
            frontmatters: [
                {
                    id: 'category',
                    keys: ['category'],
                    path: '/category/',
                    layout: 'Categories',
                    scopeLayout: 'Category'
                },
                {
                    id: 'tag',
                    keys: ['tags'],
                    path: '/tag/',
                    layout: 'Tags',
                    scopeLayout: 'Tag'
                },
            ],
        }],
        ...
```

各オプション値 (`feed, sitemap, directories, frontmatters`) の意味は [公式のGettingStarted](https://vuepress-plugin-blog.ulivz.com/guide/getting-started.html) を見るのが良い．

更に，上記の設定で追加された下記5ページに対して，それぞれレイアウトを作成する(`theme-blog`をインストールした場合は不要)．

* 記事一覧ページ `https://besolab.com/` に対応した `docs/.vuepress/theme/layout/IndexPost.vue`
* タグ一覧ページ `https://besolab.com/tag/` に対応した `docs/.vuepress/theme/layout/Tags.vue`
* タグ個別ページ `https://besolab.com/tag/vuepress` (例) に対応した `docs/.vuepress/theme/layout/Tag.vue`
* カテゴリ一覧ページ `https://besolab.com/category/` に対応した `docs/.vuepress/theme/layout/Categories.vue`
* カテゴリ個別ページ `https://besolab.com/category/blog` (例) に対応した `docs/.vuepress/theme/layout/Category.vue`

テーマを1個でも作るとデフォルトのものが読み込まれなくなるので，デフォルトテーマを抽出したのちに追加すること．

```sh
vuepress eject docs/
```

以下はサンプルで，記事情報`$pagination.pages`，カテゴリ情報`$category`，タグ情報`$tag`を利用してそれぞれのリストを表示している．
`現在選択中のタグはリンクを張らない`といったことがしたければ `$currentTag.key` を，カテゴリについてやりたければ `$currentCategory.key` を利用すると条件分岐ができる．

```vue
<template>
<div class="theme-container">
    <header>
        <!-- CategoryList -->
        <ul>
            <li v-for="t in Object.keys($category.map)">
                <a :href="'/category/' +  t">{{ t }}</a>
            </li>
        </ul>
        <!-- Tag List -->
        <ul>
            <li v-for="t in Object.keys($tag.map)">
                <a :href="'/tag/' +  t">{{ t }}</a>
            </li>
        </ul>
    </header>

    <!-- Post List -->
    <section class="post" v-for="p in posts">
        <h1><a :href="p.path">{{ p.title }}</a>

        <ul>
            <li>{{ p.display_date }}</li>
            <li><a :href="'/category/' + p.frontmatter.category">{{ p.frontmatter.category }}</a>
            <li v-for="t in p.frontmatter.tags">
                <a :href="'/tag/' +  t">{{ t }}</a>
            </li>
        </ul>
    </section>
</div>
</template>

<script>
export default {
    name: "IndexPost",

    computed: {
        posts() {
            const pages = this.$pagination.pages.map(v => {
                const { date, tags } = v.frontmatter;

                v.frontmatter.tags = tags.sort()

                function _pad(i, n, s = '0') {
                    return i.toString().padStart(n, s);
                }

                if (date) {
                    const t = new Date(date);
                    v.parsed_date = t

                    v.display_day = [
                        t.getFullYear(),
                        _pad(t.getMonth() + 1, 2),
                        _pad(t.getDate(), 2),
                    ].join('/')

                    v.display_time = [
                        _pad(t.getHours(), 2),
                        _pad(t.getMinutes(), 2),
                    ].join(':')

                    v.display_date = `${v.display_day} ${v.display_time}`
                }

                return v
            }).sort((b, a) => { return a.parsed_date - b.parsed_date });

            return pages
        },
    },
}
</script>
```

上記でも最低限は動くがサイドバーやナビバーが消えるので，動作確認が済んだら `docs/.vuepress/layouts/Layout.vue` をコピペって改良するといい．

### @vuepress/google-analytics

https://vuepress.vuejs.org/plugin/official/plugin-google-analytics.html

グーグルのアクセス解析を設定するプラグイン．
`Google Analytics ID`を取得するのが若干大変だが，VuePress設定としては値を入力するだけなので簡単


## Others

### GoogleSearch

グーグル検索に登録する際にサイト所有者確認とサイトマップが必要になる．

所有者確認方法は幾つか候補が用意されているが一番簡単なのは`HTMLタグ`かと．
選択肢で選ぶとサイトのmeta情報に組み込む情報を教えてくれるので `docs/.vuepress/config.js` を以下のように弄ってデプロイする．

```js
module.exports = {
    head: [
        ['meta', { name: "google-site-verification", content: "xxxxxxxxxx"}],
    ],
}
```

サイトマップはすでに`@vuepress/plugin-blog`で生成するようにしているので，聞かれたらそのパスを入力するだけでいい．

### fontawaresome

アイコン利用する際に便利なので導入する．
いつの間にかユーザアカウント登録が必要になっていたので登録して，教えられたスクリプトを以下のように設定する．

```js
module.exports = {
    head: [
        ['script', { src: "https://kit.fontawesome.com/xxxxxxxx.js", crossorigin: "anonymous"}],
    ],
}
```

あとは `<i class="fas fa-tag"></i>`<i class="fas fa-tag"></i> といった形で利用できる．
markdown中で頻繁に利用する場合は`markdown-it-fontawesome`導入も検討するとよさそう．

### Tailwindcss

CSSフレームワークは [Bootstrap](https://getbootstrap.com/) の一強だと思っていたが[Tailwind CSS](https://tailwindcss.com/) というのがいつの間にか登場していたので導入する．

CSSのプロパティ値とHTMLのクラス名が定義されていて，そのクラスに変更するだけで所望のCSSを反映させることができる．
例えば `.w-full` をつけると `width: 100%;` が反映され， `.bg-red-600` だと `background-color: #e53e3e;` といった形．

```html
<p class="w-1/2 bg-blue-800 text-white">Test1<p>
<p class="w-full bg-blue-600 text-white">Test2<p>
```

<p class="w-1/2 bg-blue-800 text-white">Test1<p>
<p class="w-full bg-blue-600 text-white">Test2<p>

自然とクラス数がやばくなって把握できなくなるのでメンテナンス性や可読性は悪そうだけど，ワンポイントで利用する分にはいい感じで利用できるのではないかという感じ．

インストールはyarnで一発．

```sh
yarn add -D tailwindcss autoprefixer
```

`docs/.vuepress/convig.js`で設定する．

```sh
module.exports = {
    postcss: {
        plugins: [
            require("autoprefixer"),
            require("tailwindcss")(path.resolve(__dirname, 'tailwind.config.js')),
        ]
    },
}
```

設定ファイルを作成する．今回は初期設定のまま．

```sh
yarn tailwindcss init
mv tailwind.config.js docs/.vuepress/
```

cssが読み込まれるようにする．以下はデフォルトテーマ抽出後を想定しているが，もししていなければ実行しておくこと．

```sh
$ cd docs/.vuepress/theme/styles
$ mv index.styl index_base.styl

$ vi index.styl

@tailwind base;
@tailwind components;

@require 'index_base';

.theme-default-content p
  margin-top: 1em;
  margin-bottom: 1em;

@tailwind utilities;
```

VuePressのバージョンアップで元々の`index.syl`が劇的に変わるとしんどいので`index_base.styl`にリネームしてインポートするようにした．
またtailwindによるmarginリセットで記事の余白が消されていたので`.theme-default-content p`で修正している．

自分で何かを追加したい場合は `@tailwind components;` と `@tailwind utilities;` の間に指定するらしい．

ここまで完了すれば準備はOK．実行して動作確認をするとよい．

