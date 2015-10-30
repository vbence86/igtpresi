module.exports = function(grunt) {
  'use strict';

  var WebkitCorePath = '/usr/local/WebkitCore/',

      WebkitCoreLibrariesPath = WebkitCorePath + 'www/lib/util/',

        GIT_HOME = "git@git.office.probability.co.uk",

      i,

      projectName = 'MillionFlaxScratchCard',

      // files should be minified
      jsFiles = [
        'main.js',
        'game_loader.js',
        'game_client.js',
        'game_states.js'
      ],

      // creating the list of the files should be minified
      minifiedJSFiles = (function(jsFiles){

        var files = {};

        for (i = jsFiles.length; jsFiles[--i];) !function(file){
            files[projectName + '/scripts/' + file] = projectName + '/scripts/uncompressed/' + file;
        }(jsFiles[i]);

        return files;

      })(jsFiles),

      // paths for jasmine test suites
      jasmine_src_dir = 'scripts/uncompressed/*.js',
      jasmine_specs_dir = 'test/jasmine/spec/**/*.js',


      // grabbing the SGD config file for the project dependencies
      SGDConfigFilePath = projectName + "/lib/SGDfile.json",
      SGDConfig = (function(jsonFile){

        return grunt.file.readJSON(jsonFile);

      })(SGDConfigFilePath);
  
  // Project configuration.
  grunt.initConfig({

    // CSSLint
    csslint: {
      options: {
        force: true,
        csslintrc: '.csslintrc'
      },
      lax: {
        src: projectName + '/styles/**/*.css'
      }
    },

    // Jasmine configuration for Unit testing
    jasmine : {
      src : [
        jasmine_src_dir,
        WebkitCoreLibrariesPath + 'PGCGameStateMachine/scripts/uncompressed/PGCGameStateMachine.js'
      ],
      options : {
        specs : jasmine_specs_dir,
        vendor: [
          "test/jasmine/globals.js",
          "http://i.probability.mobi.localhost/lib/" + projectName + "/scripts/util_js.php",
          WebkitCoreLibrariesPath + 'PGCGameStateMachine/scripts/uncompressed/state-machine.js',
          WebkitCoreLibrariesPath + 'PGCToolkit/scripts/uncompressed/PGCToolkit.js'
        ]
      }
    },
    
    // JSHint
    jshint: {
      options: {
        '-W083': true // enable immediate functions within loops
      },
      all: [ projectName + '/scripts/uncompressed/*.js']
    },

    // Uglify
    uglify: {
      options: {},
      build: {
        files: minifiedJSFiles
      }
    },

    // SASS
    sass: {
      dist: {
        files: [{
          sourcemap: 'auto',
          expand: true,
          src: [projectName + '/styles/**/*.scss'],
          dest: '',
          ext: '.css'
        }]
      }
    },

    // watch tasks
    watch: {
      // watching all the JS srouces for applying unit tests once a file has been modified
      scripts: {
        files: [ 
          projectName + '/scripts/uncompressed/*.js',
          'test/jasmine/spec/*.js'
        ],
        tasks: ['jshint', 'jasmine', 'uglify']
      },
      // watching SASS files against being changed 
      styles: {
        files: [ 
          projectName + '/styles/**/*.scss'
        ],
        tasks: ['sass', 'csslint']
      }
    },

    replace: {
      incrementRelease: {
          src: [projectName + '/releaseVersion.txt'],             // source files array (supports minimatch)
          overwrite: true,                 // overwrite matched source files
          replacements: [{
              from: /(\d+)\.(\d+)\.(\d+)/g,
              to: function(matchedWord, index, fullText, regexMatches) {
                  var n1 = regexMatches[0],
                      n2 = regexMatches[1],
                      n3 = regexMatches[2];
                  n3++;
                  if(n3 > 99) {
                      n3 = 0;
                      n2++;
                      if(n2 > 99) {
                          n2 = 0;
                          n1++;
                      }
                  }
                  var str = n1 + '.' + n2 + '.' + n3;
                  grunt.log.write(n1 + '.' + n2 + '.' + n3);
                  return str;
              }
          }]
      }
    },

    gitclone: (function(config) {
        var tasks = {};
        Object.keys(config.dependencies).forEach(function(key) {
            tasks[key] = {
                options: {
                    repository: GIT_HOME+":"+key,
                    directory: projectName+"/lib/"+key,
                    branch: config.dependencies[key]
                }
            }
        });
        return tasks;
    })(SGDConfig),

    gitcommit: (function(config) {
        var tasks = {};
        Object.keys(config.dependencies).forEach(function(key){
            tasks[key] = {
                options: {
                    message: "Auto-Commit by grunt task - " + new Date(),
                    allowEmpty: true
                }
            }
        });
        return tasks;
    })(SGDConfig),

    gitpush: (function(config) {
        var tasks = {};
        Object.keys(config.dependencies).forEach(function(key){
            tasks[key] = {
                options: {
                    branch: "origin/develop"
                }
            };
        });
        return tasks;
    })(SGDConfig),



    exec: {
        //Clear old dependencies from the library
        clear: {
            cmd: (function(config){
                var cmd = "cd "+projectName+"/lib";
                Object.keys(config.dependencies).forEach(function(key) {
                    if (cmd.length > 0){
                        cmd += " && ";
                    }                  
                        cmd += "rm -rf " + key;
                });
                return cmd;
            })(SGDConfig)
        },

        //Copy dependencies to the library
        integrate: {
            cmd: (function(config){
                var cmd = "cd "+projectName+"/lib";
                cmd += " && rm -rf .gitignore";
                Object.keys(config.dependencies).forEach(function(key){
                    var version = config.dependencies[key];
                    if (cmd.length > 0){
                        cmd += " && ";
                    }
                    cmd += "mkdir "+key+" && cd $_ && git archive --remote=$GIT_HOME:"+key+" "+version+" --format=zip -o latest.zip && unzip latest.zip && rm latest.zip";
                });
                return cmd;
            })(SGDConfig)
        },        

        //Ignore library when checking in game-specific code
        ignoreLib: {
            cmd: (function(config){
                    var cmd = ">"+projectName+"/lib/.gitignore";
                Object.keys(config.dependencies).forEach(function(key){
                        var version = config.dependencies[key],
                            commands = [
                                "echo "+key+" >> "+projectName+"/lib/.gitignore"
                            ];
                        cmd += " && "+commands.join(" && ");
                });
                return cmd;
            })(SGDConfig)
        },

        cdLib: {
            cmd: function(dir) {
                return "cd "+projectName+"/lib/"+dir;
            }
        },

        cdGame: {
            cmd: "cd ../../.."
        },

        tagger: {
            cmd: "git-tagger"
        },

        setLastTag: {
            cmd: "git show-ref --tags",
            callback:  function(error, result, code) {
                if(code === 127) {
                    grunt.fail.fatal("reTag task failed");
                } else {
                   global["lastTag"] = result.stdout.match(/refs\/tags\/.*$/);
                }
            }
        }
    }
});

  grunt.loadNpmTasks('grunt-contrib-csslint');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-text-replace');
  grunt.loadNpmTasks('grunt-exec');
    grunt.loadNpmTasks('grunt-git');

    grunt.registerTask('default', ['jshint', 'uglify', 'replace:incrementRelease']);
    grunt.registerTask('install', ['exec:clear', 'gitclone', 'exec:ignoreLib']);
    grunt.registerTask('integrate', ['exec:clear', 'exec:integrate']);
    grunt.registerTask('reTagLib', "sets the given dependency branch to the current lastTag global in the SGDConfig", function(lib) {
        SGDConfig.dependencies[lib] = global["lastTag"];
        //Write the updated SGDConfig to a file
        grunt.file.delete(SGDConfigFilePath);
        grunt.file.write(SGDConfigFilePath, JSON.stringify(SGDConfig));
    });
    grunt.registerTask('reTagAll', "Runs git-tagger on all libraries then updates the dependencies", function(){
        Object.keys(SGDConfig.dependencies).forEach(function(key) {
            //Switch to library directory, commit, push, run the tagger, update the dependency to the new tag, return to the game directory
            grunt.task.run(["exec:cdLib:"+key, "gitcommit:"+key, "gitpush:"+key, "exec:tagger", "exec:setLastTag", "reTagLib:"+key, "exec:cdGame"]);
        });
    });
};
