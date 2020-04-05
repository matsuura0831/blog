<template>
    <div class="theme-container">
        <Navbar />

        <div class="theme-default-content">
            <h1>{{ $frontmatter.title }}</h1>

            <ul v-for="p in posts">
                <li>
                    <a :href="p.path">{{ p.display_date }}: {{ p.title }}</a>
                </li>
            </ul>
        </div>
    </div>
</template>

<script>
import Navbar from "@theme/components/Navbar.vue";

export default {
    name: "IndexPost",
    components: { Navbar },
    
    computed: {
        posts() {
            const pages = this.$pagination.pages.map(v => {
                const { date } = v.frontmatter;

                function _pad(i, n, s) {
                    return i.toString().padStart(n, s);
                }

                if (date) {
                    const t = new Date(date);
                    v.parsed_date = t
                    v.display_date = `${t.getFullYear()}/${t.getMonth()+1}/${_pad(t.getDate(), 2, '0')} ${_pad(t.getHours(), 2, '0')}:${_pad(t.getMinutes(), 2, '0')}`
                }
                return v
            }).sort((b, a) => { return a.parsed_date - b.parsed_date });

            return pages
        }
    }
};
</script>
