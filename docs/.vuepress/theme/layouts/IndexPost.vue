<template>
    <MyBlog
        :shouldShowSidebar="false"
        :shouldShowDescription="true"
        />
</template>

<script>
import MyBlog from "@theme/mycomponents/BlogPage.vue";

export default {
    name: "IndexPost",
    components: {
        MyBlog
    },
}
</script>
