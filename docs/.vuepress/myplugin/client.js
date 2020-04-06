import data from '@dynamic/myplugin/sample';

export default ({ Vue, options, router, siteData }) => {
    const computed = {};
    computed.$categories = function() { return data; }
    Vue.mixin({ computed });
} 