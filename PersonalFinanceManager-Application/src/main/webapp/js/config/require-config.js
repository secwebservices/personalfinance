// Configure loading modules from the lib directory,
// except for 'app' ones, which are in a sibling
// directory.
require.config({
    baseUrl: 'js',
    paths: {
        'jquery':       'js/lib/jquery',
        'jquery-ui':    'js/lib/jquery-ui',
        'knockoutjs': 	'node_modules/knockout/build/output/knockout-latest',
        'Sammy': 		'node_modules/sammy/lib/sammy',
    	'core': 		'js',
        'lib': 			'js/lib',
        'modules': 		'node_modules',
        'model': 		'js/model',
        'view': 		'js/view',
        'controller': 	'js/controller',
        'managers': 	'js/managers',
        'utilities': 	'js/utilities',
        'Mediator': 	'js/utilities/core/Mediator',
        'LoggerConfig': 'js/config/LoggerConfig'
    },
    shim : {
    	'Sammy': ['jquery'],
    	'jquery-ui': {
    		exports: '$',
    		deps: ['jquery']
    	}
    }

});