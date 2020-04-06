---
title: Develop VuePress plugins
date: 2020-04-05 23:00
category: blog
tags:
  - blog
  - vuepress
---

# Develop VuePress plugins

VuePressを改造するにあたり幾つかの選択肢が存在するの整理していく．

[[toc]]

## VueComponent

[Using Vue in Markdown](https://v1.vuepress.vuejs.org/guide/using-vue.html)

`VueComponent` (Vue.js勉強し始めたところなのでよく分かってない)で部品を作ってMarkdown内で利用できる．
DOMを追加したり単純にjs実行したりできるので自由度は高い．実行はブラウザ上で行われる．

明示的にMarkdown内で呼び出す必要があり，更にサイト全体に関係する操作(例: sidebar挙動変更)はできないためピンポイントで部品を導入する用途．

## Plugin

サイト全体に影響する操作はこちらで実装する．ちょっと分かりにくいのでサンプルを動かしてみる．

以下のように記述すると`./docs/.vuepress/myplugin/index.js`が読み込まれる．

```yaml{4-10}
module.exports = {
    ...
    plugins: [
        [require('./myplugin'), {
            directories: [
                id: 'post',
                sidebar: 'auto',
                targetDir: '_post',
            ]
        }],
    ],
}
```

`myplugin/index.js`は以下のように記述する．

```js
$ cat ./docs/.vuepress/myplugin/index.js

const path = require('path')

module.exports = (option, context) => {
    // config.jsに記載した引数はoptionに入っている
    const {
        directories = []
    } = option;

    return {
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

            for(const directory of directories) {
                const {
                    id,
                    sidebar,
                    targetDir,
                    permalink = '/:year/:month/:day/:slug'
                } = directory;

                if (regularPath.startsWith(`/${targetDir}/`)) {
                    frontmatter.permalink = permalink;
                    frontmatter.sidebar = sidebar;
                }
            }
        },
        additionalPages() {
            return [{
                path: '/readme/',
                filePath: path.resolve(__dirname, '../../../README.md')
            },]
        },
        async ready() {
            const { pages } = context;

            const categories = {};
            for(const { path, frontmatter } of pages) {
                if (!frontmatter || Object.keys(frontmatter).length === 0) continue;

                const { category: key } = frontmatter;
                if (!categories[key]) {
                    categories[key] = []
                }
                categories[key].push(path);
            }
            context.categories = categories;
        },

        async clientDynamicModules() {
            const PREFIX = 'myplugin';
            const { categories } = context;

            return [{
                name: `${PREFIX}/sample.js`,
                content: `export default ${JSON.stringify(categories)}`,
            }];
        },
        enhanceAppFiles: path.resolve(__dirname, 'client.js'),
    }
};
```

更に`client.js`は以下のように記述する．

```js
$ cat ./docs/.vuepress/myplugin/client.js

import data from '@dynamic/myplugin/sample';

export default ({ Vue, options, router, siteData }) => {
    console.log(data);

    const computed = {};
    computed.$categories = function() { return data; }
    Vue.mixin({ computed });
} 
```

`README.md`はサンプルなので適当に．

```sh
echo "# Plugin REAME" >> ./docs/.vuepress/myplugin/REAMDE.md
```

ここまで準備できればVSCode上でデバック実行するとよい．

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

    for(const directory of directories) {
        const {
            id,
            sidebar,
            targetDir,
            permalink = '/:year/:month/:day/:slug'
        } = directory;

        if (regularPath.startsWith(`/${targetDir}/`)) {
            frontmatter.permalink = permalink;
            frontmatter.sidebar = sidebar;
            $page.id = id;
        }
    }
},
```

処理としては単純に，プラグイン引数をもとに`targetDir`から始まるページが存在していたら`frontmatter.(permalink, sidebar)`を指定値で上書きしている．
基本は`$page`に新しい変数を追加したり`frontmatter`を書き換えたりするのに利用するだけらしい．

`VueComponent`側で`$site.pages[*].id`という形で付与した`id`を利用することができる．
同様に`$site.pages[*].frontmatter`の値を確認すると，元のではなく上記で上書きされた値が取得できる．

参考: https://vuepress.vuejs.org/plugin/option-api.html#extendpagedata

### additionalPages

```js
additionalPages() {
    return [{
        path: '/readme/',
        filePath: path.resolve(__dirname, '../../../README.md')
    },]
},
```

返り値に応じてページが追加される．追加されたページは更に`expandPageData`にもかけられる．

なお`additionalPages`以外にも，`context.addPages()`を呼ぶことでもページの追加が可能．
後者の場合はpluginのどこから読んでもOKそうな感じ．

### ready

```js
async ready() {
    const { pages } = context;

    const categories = {};
    for(const { path, frontmatter } of pages) {
        if (!frontmatter || Object.keys(frontmatter).length === 0) continue;

        const { category: key } = frontmatter;
        if (!categories[key]) {
            categories[key] = []
        }
        categories[key].push(path);
    }
    context.categories = categories;
},
```

`expandPageData`および`additionalPages`が一通り終わってから呼び出される．

現時点で出そろったページに対して，`frontmatter.category`が登録されていればパスを保存している．
保存した`categories`は`context`に登録することで`clientDynamicModules`に渡す．

### clientDynamicModules

```js
async clientDynamicModules() {
    const PREFIX = 'myplugin';
    const { categories } = context;

    return [{
        name: `${PREFIX}/sample.js`,
        content: `export default ${JSON.stringify(categories)}`,
    }];
},
```

`redady`で作成したカテゴリ辞書を`myplugin/sample.js`として出力している．
ここで出力したjsファイルは `enhanceAppFile` で利用することができる．

### enhanceAppFile

```js{1}
import data from '@dynamic/myplugin/sample';

export default ({ Vue, options, router, siteData }) => {
    console.log(data);

    const computed = {};
    computed.$categories = function() { return data; }
    Vue.mixin({ computed });
} 
```

1行目で`clientDynamicModules`が出力したデータを読み込みVueに登録している．
これにより`VueComponent`側で `$categories` を利用して値を取得できる(値はconsole出力しているのでブラウザの開発者ツールで確認可能)．

1. `ready`でページ全体をスキャンしてメタデータを生成し，
2. `clientDynamicModules`でメタデータを出力し，
3. `enhanceAppFile`でメタデータを`VueComponent`で利用できる形で読み込み，
4. `VueComponent`でメタデータを使ったDOMを生成する

というのが大体の流れのよう．
