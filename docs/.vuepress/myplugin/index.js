const path = require('path')

module.exports = (option, context) => {
    return {
        extendPageData($page) {
            const {
                //_filePath,           // file's absolute path
                //_computed,           // access the client global computed mixins at build time, e.g _computed.$localePath.
                //_content,            // file's raw content string
                _strippedContent,    // file's content string without frontmatter
                //key,                 // page's unique hash key
                frontmatter,         // page's frontmatter object
                //regularPath,         // current page's default link (follow the file hierarchy)
                //path,                // current page's real link (use regularPath when permalink does not exist)
            } = $page

            if (frontmatter && !frontmatter.description && $page.id) {
                frontmatter.description = frontmatter.description || _strippedContent.split('\n').filter(e => !/^\s*$/.test(e) && !/#/.test(e))[0]
            }
        },
    }
};