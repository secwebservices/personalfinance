module.exports = function(grunt) {

    grunt.initConfig({
        pkg : grunt.file.readJSON('package.json'),
        qunit : {
            files : [
                'test/**/*.html'
            ]
        },
        jshint : {
            files : [
                'Gruntfile.js', 'app.js', 'js/**/*.js', '!js/lib/**/*.js'
            ],
            options : {
                // options here to override JSHint defaults
                globals : {
                    jQuery : true,
                    console : true,
                    module : true,
                    document : true,
                    evil : true
                }
            }
        },
        requirejs : {
            compile : {
                options : {
                    optimize : 'none',
                    baseUrl : "./",
                    mainConfigFile : "js/config/require-config.js",
                    preserveLicenseComments : false,
                    name : "pfapp.js",
                    include : [
                      	'node_modules/requirejs/require.js',
                        'node_modules/knockout/build/output/knockout-latest.debug.js',

                        ],
                    out : "dist/<%= pkg.name %>.js"
                }
            }
        },
        less : {
            development : {
                options : {
                    paths : [
                        "less"
                    ]
                },
                files : {
                    "css/default.css" : "less/default.less"
                }
            }
        },
        uglify : {
            options : {
                banner : '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
            },
            dist : {
                files : {
                    'dist/<%= pkg.name %>.min.js' : [
                        'dist/<%= pkg.name %>.js'
                    ]
                }
            }
        }

    });

    grunt.loadNpmTasks('grunt-contrib-qunit');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    
    grunt.registerTask('test', [
        'jshint', 'qunit'
    ]);

    grunt.registerTask('lesscss', [
        'less'
    ]);

    grunt.registerTask('clean', [
        'less', 'requirejs'
    ]);    
    
    grunt.registerTask('build', [
        'less', 'jshint', 'requirejs'
    ]);
    
    grunt.registerTask('package', [
        'less', 'jshint', 'requirejs', 'uglify'
    ]);

};