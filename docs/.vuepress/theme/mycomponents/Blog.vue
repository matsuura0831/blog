<template>
    <div class="max-w-screen-lg mx-auto mt-20">
        <slot name="top" />
        
        <section class="flex flex-col shadow-xl mb-4" v-for="p in posts">
            <div class="bg-white flex flex-col justify-start p-6">
                <a :href="p.path" class="text-3xl font-bold hover:text-green-800 pb-2">{{ p. title }}</a>
                <ul class="flex flex-row list-none pl-2">
                    <li class="mr-4"><i class="fas fa-calendar"></i> {{ p.display_date }}</lli>
                    <li class="mr-4">
                        <i class="fas fa-database"></i>
                        <a :href="'/category/' + p.frontmatter.category" class="text-gray-600 uppercase">{{ p.frontmatter.category }}</a>
                    <li class="mr-4" v-for="t in p.frontmatter.tags">
                        <i class="fas fa-tag"></i>
                        <a class="text-gray-600" :href="'/tag/' +  t">{{ t }}</a>
                    </li>
                </ul>
                <p class="mt-4 text-lg" v-if="isShowDescription">{{ p.frontmatter.description }}</p>
            </div>
            
        </section>
    </div>
</template>

<script>
export default {
    props: [ 'isShowDescription' ],
    computed: {
        posts() {
            const pages = this.$pagination.pages.map(v => {
                const { date, tags } = v.frontmatter;

                v.frontmatter.tags = tags.sort()

                function _pad(i, n, s = '0') {
                    return i.toString().padStart(n, s);
                }

                if (date) {
                    const t = new Date(date);
                    v.parsed_date = t

                    v.display_day = [
                        t.getFullYear(),
                        _pad(t.getMonth() + 1, 2),
                        _pad(t.getDate(), 2),
                    ].join('/')

                    v.display_time = [
                        _pad(t.getHours(), 2),
                        _pad(t.getMinutes(), 2),
                    ].join(':')

                    v.display_date = `${v.display_day} ${v.display_time}`
                }

                return v
            }).sort((b, a) => { return a.parsed_date - b.parsed_date });

            return pages
        }
    }
};
</script>