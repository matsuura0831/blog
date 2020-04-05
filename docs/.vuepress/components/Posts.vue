<template>
  <div>
    <ul>
      <li v-for="post of posts('/posts/')" :key="post.key">
        <a :href="post.path">{{ post.frontmatter.date }}, {{ post.title }}</a></li>
    </ul>
  </div>
</template>

<script>
export default {
    computed: {
        posts: function() {
            return (base) => {
              return this.$site.pages.filter(v => v.path.startsWith(base));
            }
        }
    }
};
</script>