module.exports = {
    base: '/',
    dest: './build',

    plugins: [
        /*
        [require('./myplugin'), {
            directories: [{
                id: 'post',
                sidebar: 'auto',
                targetDir: '_posts',
                permalink: '/post/:year/:month/:day/:slug',
            }],
        }],
        */
        ['@vuepress/blog', {
            directories: [
                {
                    // Unique ID of current classification
                    id: 'post',
                    // Target directory
                    dirname: '_posts',
                    // Path of the `entry page` (or `list page`)
                    path: '/',
                    itemPermalink: '/:year/:month/:day/:slug',
                },
            ],
            frontmatters: [
                {
                    // Unique ID of current classification
                    id: 'tag',
                    // Decide that the frontmatter keys will be grouped under this classification
                    keys: ['tags'],
                    // Path of the `entry page` (or `list page`)
                    path: '/tag/',
                    // Layout of the `entry page`
                    layout: 'Tags',
                    // Layout of the `scope page`
                    scopeLayout: 'Tag'
                },
            ],
        }]
    ],

    title: 'besolab',
    description: 'A place to store technical knowledge for myself.',
    locales: {
        '/': { lang: 'ja' },
    },
    themeConfig: {
        sidebar: 'auto',
        nav: [
            { text: 'Home', link: '/' },
            { text: 'About', link: '/about/' },
            {
                text: 'SNS',
                items: [
                    { text: 'Twitter', link: 'https://twitter.com/matsuura0831/' },
                    { text: 'GitHub', link: 'https://github.com/matsuura0831/' }
                ]
            }
        ]
    },
}