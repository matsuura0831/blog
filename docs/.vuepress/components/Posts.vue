<template>
  <div>
    <ul>
      <li v-for="p of posts" :key="p.key">
        <a :href="p.path">{{ p.title }}, {{ p.path }}</a></li>
    </ul>
  </div>
</template>

<script>
export default {
    computed: {
        posts: function() {
            return this.$site.pages;
        }
    }
};
</script>