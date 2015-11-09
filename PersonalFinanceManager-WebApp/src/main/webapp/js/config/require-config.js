// Configure loading modules from the lib directory,
// except for 'app' ones, which are in a sibling
// directory.
requirejs.config({
    baseUrl: 'js',
    paths: {
        utils: 'js/utils',
        model: 'js/model',
        controller: 'js/controller',
        managers: 'js/managers',
        utilities: 'js/utilities',
        core: 'js',
        modules: 'node_modules',
        lib: 'js/lib'
    }
});