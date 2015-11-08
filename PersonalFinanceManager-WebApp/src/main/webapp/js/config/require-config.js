// Configure loading modules from the lib directory,
// except for 'app' ones, which are in a sibling
// directory.
requirejs.config({
    baseUrl: 'js',
    paths: {
        utils: 'js/utils',
        model: 'js/model',
        controller: 'js/controller',
        core: 'js',
        modules: 'node_modules',
        lib: 'js/lib'
    }
});