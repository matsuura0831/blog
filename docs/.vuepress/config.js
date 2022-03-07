const path = require('path')

const BASE_URL = "https://besolab.com";

module.exports = {
    base: '/',
    dest: './build',

    plugins: [
        ['@vuepress/blog', {
            feed: {
                canonical_base: BASE_URL,
            },
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
        [ '@vuepress/google-analytics', {
            'ga': 'UA-6230037-2'
        }],
        ['@vuepress/last-updated', {}],
        [require('./myplugin'), {}],
    ],

    title: 'besolab',
    description: 'A place to store technical knowledge for myself.',
    head: [
        ['meta', { name: "google-site-verification", content: "0q-QVeFFAfyqwV4y7aF2OGBbto4tctFQ0C8MjBRCQ54"}],
        ['script', { src: "https://kit.fontawesome.com/845cc1d72b.js", crossorigin: "anonymous"}],
    ],
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
    postcss: {
        plugins: [
            require("autoprefixer"),
            require("tailwindcss")(path.resolve(__dirname, 'tailwind.config.js')),
        ]
    },
    markdown: {
        lineNumbers: true,
        linkify: true,

        extendMarkdown: md => {
            md.use(require('markdown-it-footnote'));
            md.use(require('markdown-it-task-lists'));
            md.use(require('markdown-it-abbr'));
        }
    },
}
