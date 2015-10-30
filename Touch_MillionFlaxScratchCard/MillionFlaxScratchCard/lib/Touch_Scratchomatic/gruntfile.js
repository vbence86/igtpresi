module.exports = function(grunt) {
    'use strict';

    var WebkitCorePath = '/usr/local/WebkitCore/',

        WebkitCoreLibrariesPath = WebkitCorePath + 'www/lib/util/',

        GIT_HOME = "git@git.office.probability.co.uk",

        i,

        projectName = 'Scratchomatic',

    // files should be minified
        jsFiles = [
            "CanvasText.js",
            "CanvasToolkit.js",
            "game.js",
            "game_client.js",
            "game_loader.js",
            "game_states.js",
            "main.js",
            "ScratchController.js",
            "ScratchMask.js",
            "Symbol.js",
            "SymbolGroup.js",
            "TimeLine.js"
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
        jasmine_specs_dir = 'test/jasmine/spec/**/*.js';

    //Yuidoc and testbed configs
    var docPath = projectName + "/docs/classes/",
        docImgPath = projectName + "/../../docImg/",
        docAuxPath = projectName + "/../../docAux/",
        iFrames = 0,
        jsStrings = "\n<script>var Frames = window.Frames || {}</script>\n";

    // Project configuration.
    grunt.initConfig({
        // YUIDoc
        yuidoc: {
            compile: {
                name: "Scratchomatic",
                description: "Scratch-o-matic scratch card simulation library",
                options: {
                    paths: projectName + "/scripts/uncompressed",
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

            styles: {
                files: [
                    projectName + '/styles/**/*.css'
                ],
                tasks: ['csslint']
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
            },

            docImg: {
                src: [docPath + "*.html"],
                overwrite: true,
                replacements: [{
                    from: /\{\{img.*=.*&quot;(.*)&quot;\}\}/g,
                    to: function(matchedWord, index, fullText, regexMatches) {
                        var imgSrc = docImgPath + regexMatches[0],
                            str = "";
                        try {
                            grunt.log.write("added image: " + imgSrc + "\n");
                            str += "<img src=" + imgSrc + ">";
                            return str;
                        } catch(err) {
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
                    to: function(matchedWord, index, fullText, regexMatches) {

                        var setupContent = matchedWord.match(/setup.*?=\s*?&quot;((.|\n)*?)&quot;\n/),
                            textContent = matchedWord.match(/content.*?=\s*?&quot;((.|\n)*?)&quot;(\n|})}/),
                            setupLines = [],
                            textLines = [];
                        var hasSetup = setupContent ? true : false,
                            hasContent = textContent ? true : false,
                            i;

                        //Format setupContent and textContent
                        ////Strip leading whitespace, replace &quot;, replace "</p><p>", escape newlines and markdown shenanigans
                        if(hasSetup) {
                            setupContent = setupContent[1].trim().replace(/&quot;/g, "\'").replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/<\/p>(.|\n)*?<p>\s*?/g, "\n\n").replace(/^ /mg, "");
                            setupContent = setupContent.replace(/\n/g, "\\n").replace(/<\/*?em>/g, "\*").replace(/    /g, "\t");
                        }
                        if(hasContent) {
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
                        if(hasSetup) {
                            jsStr += "\t\t\tframeWindow.setupMirror.setValue(\"" + setupContent + "\");\n";
                        }
                        if(hasContent) {
                            jsStr += "\t\t\tframeWindow.editMirror.setValue(\"" + textContent.replace(/\n/g, "\\n") + "\");\n";
                        }
                        jsStr += "\t\t\tFrames.reSizeFrame_" + iFrames + "();\n";
                        if(hasSetup) {
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
                    to: function(matchedWord, index, fullText, regexMatches) {
                        //Create the initialisation script for the documentation index
                        return jsStrings + "</head>";
                    }
                }]
            }
        },

        exec: {
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

    grunt.loadNpmTasks("grunt-contrib-yuidoc");
    grunt.loadNpmTasks('grunt-contrib-csslint');
    grunt.loadNpmTasks('grunt-contrib-jasmine');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-text-replace');
    grunt.loadNpmTasks('grunt-exec');
    grunt.loadNpmTasks('grunt-git');

    grunt.registerTask('docs', ["yuidoc", "jshint", "uglify", "replace:incrementRelease", "replace:docImg", "replace:testBed", "replace:testInit"])
    grunt.registerTask('default', ['jshint', 'uglify', 'replace:incrementRelease']);
};
