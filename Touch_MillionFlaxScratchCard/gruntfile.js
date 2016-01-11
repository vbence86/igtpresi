module.exports = function(grunt) {
    'use strict';

    var WebkitCorePath = '/usr/local/WebkitCore/',
    WebkitCoreLibrariesPath = WebkitCorePath + 'www/lib/util/',
    GIT_HOME = "git@git.office.probability.co.uk",
    i,
    projectName = 'MillionFlaxScratchCard',

    // JIRA Project abbriviation
    jiraProjectNAme = 'MFSC',


    // paths for jasmine test suites
    jasmine_src_dir = 'scripts/*.js',
    jasmine_specs_dir = 'test/jasmine/spec/**/*.js',

    // grabbing the SGD config file for the project dependencies
    SGDConfigFilePath = projectName + "/lib/SGDfile.json",
    SGDConfig = (function(jsonFile){

        return grunt.file.readJSON(jsonFile);

    })(SGDConfigFilePath);

    var scriptName = projectName + "/dist/" + projectName + ".min.js";
    var scriptObj = {};
    scriptObj[scriptName] = [projectName + "/scripts/**/*.js"];

    //Yuidoc and testbed configs
    var docPath = projectName + "/docs/classes/",
    docImgPath = "../../docImg/",
    docAuxPath = "../../docAux/",
    iFrames = 0,
    jsStrings = "\n<script>var Frames = window.Frames || {}</script>\n";

    // command line arguments
    var args = process.argv,
        releaseProject = jiraProjectNAme,
        releaseVer = args[3] && args[3].replace("--releaseVer=", ""),
        releaseBranch = "support/nt/release/"+(releaseVer || "tmp-release-branch");
    

    // Project configuration.
    grunt.initConfig({
        // YUIDoc
        yuidoc: {
            compile: {
                name: projectName,
                description: "Scratch-o-matic scratch card simulation library",
                options: {
                    paths: projectName + "/scripts",
                    outdir: projectName + "/docs",
                    dontsortfields: true
                }
            }
        },

        // CSSLint
        csslint: {
            options: {
                force: true,
                csslintrc: '.csslintrc'
            },
            lax: {
                src: './styles/**/*.css'
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
                    "http://i.probability.mobi.localhost/lib/scripts/util_js.php",
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
            all: [projectName + '/scripts/*.js']
        },

        // Uglify
        uglify: {
            options: {
                sourceMap: true
            },
            build: {
                files: scriptObj
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
                    projectName + '/scripts/*.js',
                    'test/jasmine/spec/*.js'
                ],
                tasks: ['jshint', 'jasmine', 'uglify']
            },
            // watching SASS files against being changed
            styles: {
                files: [
                    projectName + '/styles/**/*.css'
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
                    to: function (matchedWord, index, fullText, regexMatches) {
                        var n1 = regexMatches[0],
                            n2 = regexMatches[1],
                            n3 = regexMatches[2];
                        n3++;
                        if (n3 > 99) {
                            n3 = 0;
                            n2++;
                            if (n2 > 99) {
                                n2 = 0;
                                n1++;
                            }
                        }
                        var str = n1 + '.' + n2 + '.' + n3;
                        grunt.log.write(n1 + '.' + n2 + '.' + n3);
                        return str;
                    }
                }]
            },

            docImg: {
                src: [docPath + "*.html"],
                overwrite: true,
                replacements: [{
                    from: /\{\{img.*=.*&quot;(.*)&quot;\}\}/g,
                    to: function (matchedWord, index, fullText, regexMatches) {
                        var imgSrc = docImgPath + regexMatches[0],
                            str = "";
                        try {
                            grunt.log.write("added image: " + imgSrc + "\n");
                            str += "<img src=" + imgSrc + ">";
                            return str;
                        } catch (err) {
                            grunt.fail.warn("failed to add image: " + imgSrc + " --- " + err + "\n");
                            return str;
                        }
                    }
                }]
            },

            testBed: {
                src: [docPath + "*.html"],
                overwrite: true,
                replacements: [{
                    from: /\{\{testBed(.|\n)*?}}/g,
                    to: function (matchedWord, index, fullText, regexMatches) {

                        var setupContent = matchedWord.match(/setup.*?=\s*?&quot;((.|\n)*?)&quot;\n/),
                            textContent = matchedWord.match(/content.*?=\s*?&quot;((.|\n)*?)&quot;(\n|})}/),
                            setupLines = [],
                            textLines = [];
                        var hasSetup = setupContent ? true : false,
                            hasContent = textContent ? true : false,
                            i;

                        //Format setupContent and textContent
                        ////Strip leading whitespace, replace &quot;, replace "</p><p>", escape newlines and markdown shenanigans
                        if (hasSetup) {
                            setupContent = setupContent[1].trim().replace(/&quot;/g, "\'").replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/<\/p>(.|\n)*?<p>\s*?/g, "\n\n").replace(/^ /mg, "");
                            setupContent = setupContent.replace(/\n/g, "\\n").replace(/<\/*?em>/g, "\*").replace(/    /g, "\t");
                        }
                        if (hasContent) {
                            textContent = textContent[1].trim().replace(/&quot;/g, "\'").replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/<\/p>(.|\n)*?<p>\s*?/g, "\n\n").replace(/^ /mg, "");
                            textContent = textContent.replace(/\n/g, "\\n").replace(/<\/*?em>/g, "\*").replace(/    /g, "\t");
                        }

                        grunt.log.write("Adding iFrame frame_" + iFrames + "...\n");

                        var htmlStr = "" +
                            "\n<div id='frameWrapper_" + iFrames + "' ></div>\n" +
                            "<button id='frameButton_" + iFrames + "' class='tableButton' type='button' onclick='(function(document) {\n" +
                            "\tvar bt = document.getElementById(\"frameButton_" + iFrames + "\");\n" +
                            "\tbt.style.visibility = \"hidden\";\n" +
                            "\tvar htm = \"<iframe id = \\\"frame_" + iFrames + "\\\" " + "width=\\\"100%\\\" style=\\\"overflow:hidden\\\" src=\\\"" + docAuxPath + "sampleStage.html\\\" onload=\\\"Frames.writeToFrame_" + iFrames + "()\\\"</iframe>\";\n" +
                            "\tdocument.getElementById(\"frameWrapper_" + iFrames + "\").innerHTML = htm;\n" +
                            "})(document);'>Show</button>";

                        //Create the writeToFrame script
                        var jsStr = "" +
                            "\n<script>\n" +
                            "\t\tFrames.writeToFrame_" + iFrames + " = function() {\n" +
                            "\t\t\tvar frameWindow = document.getElementById(\"frame_" + iFrames + "\").contentWindow;\n" +
                            "\t\t\tvar frameDocument = document.getElementById(\"frame_" + iFrames + "\").contentDocument;\n";
                        if (hasSetup) {
                            jsStr += "\t\t\tframeWindow.setupMirror.setValue(\"" + setupContent + "\");\n";
                        }
                        if (hasContent) {
                            jsStr += "\t\t\tframeWindow.editMirror.setValue(\"" + textContent.replace(/\n/g, "\\n") + "\");\n";
                        }
                        jsStr += "\t\t\tFrames.reSizeFrame_" + iFrames + "();\n";
                        if (hasSetup) {
                            jsStr += "\t\t\ttry {\n";
                            jsStr += "\t\t\t\tframeWindow.eval(\"" + setupContent + "\");\n";
                            jsStr += "\t\t\t} catch(err) {\n\t\t\t\tdebugger;\n\t\t\t}\n";
                        }
                        jsStr +=
                            "\t\t};\n" +
                            "\t\tFrames.reSizeFrame_" + iFrames + " = function() {\n" +
                            "\t\t\tvar frameDocument = document.getElementById(\"frame_" + iFrames + "\").contentDocument;\n" +
                            "\t\t\tvar newHeight = Math.max(frameDocument.body.scrollHeight + 20, 300);\n" +
                            "\t\t\tdocument.getElementById(\"frame_" + iFrames + "\").height= (newHeight) + \"px\"\n" +
                            "\t\t};\n" +
                            "</script>\n";

                        //Increment counter, add javascript to jsStrings and return
                        iFrames++;
                        jsStrings += jsStr;
                        return htmlStr;
                    }
                }]
            },

            testInit: {
                src: [docPath + "../index.html", docPath + "*.html"],
                overwrite: true,
                replacements: [{
                    from: /\<\/head\>/g,
                    to: function (matchedWord, index, fullText, regexMatches) {
                        //Create the initialisation script for the documentation index
                        return jsStrings + "</head>";
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
                        directory: projectName + "/lib/"+key,
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
                cmd: (function (config) {
                    var cmd = "cd "+projectName+"/lib";
                    Object.keys(config.dependencies).forEach(function (key) {
                        if (cmd.length > 0) {
                            cmd += " && ";
                        }
                        cmd += "rm -rf " + key;
                    });
                    return cmd;
                })(SGDConfig)
            },

           //Copy dependencies to the library
            integrate: {
                cmd: (function (config) {

                    var cmd = [
                            "mkdir -p __lib",
                            "cp -R "+projectName+"/lib/* __lib",
                            "rm -R "+projectName+"/lib",
                            "mkdir "+projectName+"/lib && cp -R __lib/* "+projectName+"/lib",
                            "rm -rf "+projectName+"/lib/.gitignore && rm -R __lib",
                            "cd "+projectName+'/lib && find . | grep .git | xargs rm -rf && cd ../../',
                        ].join(" && ");

                    cmd += "&& cd "+projectName+" && git add lib/*";

                    return cmd;
                })(SGDConfig)
            },      

            // Invoking the grunt:install against the dependencies if there's any
            installRecursiveDependencies: {
              cmd: (function(config){
                var cmd = "";
                if (config.dependencies) {
                  cmd = "cd "+projectName+"/lib";
                  Object.keys(config.dependencies).forEach(function(key){
                    if (cmd.length > 0){
                      cmd += " && ";
                    }
                    cmd += "cd " + key + " && npm install && grunt -f install && cd ..";
                  });
                }
                return cmd;
              })(SGDConfig)
            },

            // creating release branch
            createReleaseBranch: {
                cmd: (function(){
                    var cmd;
                    cmd = [
                        "CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)",
                        "git checkout -b " + releaseBranch
                    ].join(" && ");
                    return cmd;
                })()
            },

            // creating release branch
            tagging: {
                cmd: (function(){
                    var cmd;
                    cmd = [
                        "git commit -am\"Adding deployable code to release branch\"",
                        "BUILD_NUMBER=$(git tag | grep '_[0-9]*' | rev | cut -d_ -f1 | rev | sort -n -r | head -1)",
                        "BUILD_NUMBER=$((BUILD_NUMBER+1))",
                        "TAG_NAME=\""+releaseProject+"_"+releaseVer+"_$BUILD_NUMBER\"",
                        "git tag -a $TAG_NAME "+releaseBranch+" -m\"$TAG_NAME\"",
                        "git push origin $TAG_NAME",
                        "echo ===========================================",
                        "echo The created tag is: $TAG_NAME",
                        "echo ===========================================",
                    ].join(" && ");
                    return cmd;
                })()
            },

            // removing release branch
            removeReleaseBranch: {
                cmd: (function(){
                    var cmd;
                    cmd = [
                        "git checkout develop",
                        "git branch -D "+releaseBranch
                    ].join(" && ");
                    return cmd;
                })()
            },            

            //Ignore library when checking in game-specific code
            ignoreLib: {
                cmd: (function (config) {
                    var cmd = "> "+projectName+"/lib/.gitignore";
                    Object.keys(config.dependencies).forEach(function (key) {
                        var version = config.dependencies[key],
                            commands = [
                                "echo " + key + " >> "+projectName+"/lib/.gitignore"
                            ];
                        cmd += " && " + commands.join(" && ");
                    });
                    return cmd;
                })(SGDConfig)
            },

            cdLib: {
                cmd: function (dir) {
                    return "cd "+projectName+"/lib/" + dir;
                }
            },

            cdGame: {
                cmd: "cd ../../.."
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-yuidoc");
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
    grunt.registerTask('install', ['exec:clear', 'gitclone', 'exec:ignoreLib', 'exec:installRecursiveDependencies']);
    grunt.registerTask('integrate', ['install', 'exec:integrate']);
    grunt.registerTask('build', ['exec:createReleaseBranch', 'integrate', 'default', 'exec:tagging', 'exec:removeReleaseBranch']);
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
