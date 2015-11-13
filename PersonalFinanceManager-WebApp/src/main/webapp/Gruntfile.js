module.exports = function(grunt) {
    var generateSourceMaps = grunt.option('generateSourceMaps') || true;
    
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
        'string-replace': {
            dist: {
              files: {
                'js/config.js': '../resources/config.js'
              },
              options: {
                replacements: [{
                  pattern: "${buildId}",
                  replacement: function (match, p1) {
                    return grunt.option('buildId');
                  }
                },
                {
                      pattern: "${versionId}",
                      replacement: function (match, p1) {
                          return grunt.option('versionId');
                      }
                  },
                {
                      pattern: "${enviromentId}",
                      replacement: function (match, p1) {
                          return grunt.option('enviromentId');
                      }
                  }
                ]
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
                    generateSourceMaps: generateSourceMaps,
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
    grunt.loadNpmTasks('grunt-string-replace');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    
    grunt.registerTask('test', [
        'jshint', 'qunit'
    ]);

    grunt.registerTask('clean', [
        'string-replace', 'less', 'requirejs'
    ]);    
    
    grunt.registerTask('build', [
        'jshint', 'clean'
    ]);
    
    grunt.registerTask('package', [
        'uglify'
    ]);

};