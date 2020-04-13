<template>
    <div class="theme-container">
        <Navbar />
        <MyBlog :is-show-description="true">
            <template #top>
                <section class="flex flex-col shadow-xl mb-4">
                    <div class="bg-white flex flex-col justify-start p-6">
                        <p class="text-3xl font-bold mb-2">Tags</p>
                        <ul class="flex">
                            <li class="mr-4" v-for="t in Object.keys($tag.map)">
                                <i class="fas fa-tag"></i>
                                <span v-if="t == $currentTag.key">
                                    <a href="#">{{ t }}[{{ $tag.map[t].pages.length }}]</a>
                                </span>
                                <span v-else>
                                    <a class="text-gray-600" :href="'/tag/' +  t">{{ t }}[{{ $tag.map[t].pages.length }}]</a>
                                </span>
                            </li>
                        </ul>
                    </div>
                </section>
            </template>
        </MyBlog>
    </div>
</template>

<script>
import Navbar from "@theme/components/Navbar.vue";
import MyBlog from "@theme/mycomponents/Blog.vue";

export default {
    name: "Tag",
    components: { Navbar, MyBlog },
};
</script>
