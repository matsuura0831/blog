<template>
    <MyBlog
        :shouldShowSidebar="false"
        :shouldShowDescription="true">
        <template #blog-top>
            <section class="flex flex-col shadow-xl mb-4">
                <div class="bg-white flex flex-col justify-start p-6">
                    <p class="text-3xl font-bold mb-2">Category</p>
                    <ul class="flex">
                        <li class="mr-4" v-for="t in Object.keys($category.map)">
                            <i class="fas fa-database"></i>
                            <span v-if="t == $currentCategory.key">
                                <a href="#">{{ t }}[{{ $category.map[t].pages.length }}]</a>
                            </span>
                            <span v-else>
                                <a class="text-gray-600" :href="'/tag/' +  t">{{ t }}[{{ $category.map[t].pages.length }}]</a>
                            </span>
                        </li>
                    </ul>
                </div>
            </section>
        </template>
    </MyBlog>
</template>

<script>
import MyBlog from "@theme/mycomponents/BlogPage.vue";

export default {
    name: "Category",
    components: {
        MyBlog
    },
}
</script>