module.exports = ({ Vue, options, router, siteData }) => {
    const sidebar = []
  
    for (const page of siteData.pages) {
      sidebar.push(page.regularPath)
    }
  
    sidebar.sort((page1, page2) => {
      return page1.localeCompare(page2)
    })
  
    siteData.themeConfig.sidebar = sidebar
  }