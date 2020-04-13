<template>
    <div class="theme-container">
        <Navbar />
        <MyBlog :is-show-description="true" />
    </div>
</template>

<script>
import Navbar from "@theme/components/Navbar.vue";
import MyBlog from "@theme/mycomponents/Blog.vue";

export default {
    name: "IndexPost",
    components: { Navbar, MyBlog },
};
</script>
