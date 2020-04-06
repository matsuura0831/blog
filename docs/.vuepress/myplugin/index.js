const path = require('path')

module.exports = (option, context) => {
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