module.exports = {
    base: '/',
    dest: './build',

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