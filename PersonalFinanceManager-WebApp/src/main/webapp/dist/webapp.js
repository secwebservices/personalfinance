/** vim: et:ts=4:sw=4:sts=4
 * @license RequireJS 2.1.20 Copyright (c) 2010-2015, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */
//Not using strict: uneven strict support in browsers, #392, and causes
//problems with requirejs.exec()/transpiler plugins that may not be strict.
/*jslint regexp: true, nomen: true, sloppy: true */
/*global window, navigator, document, importScripts, setTimeout, opera */

var requirejs, require, define;
(function (global) {
    var req, s, head, baseElement, dataMain, src,
        interactiveScript, currentlyAddingScript, mainScript, subPath,
        version = '2.1.20',
        commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg,
        cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,
        jsSuffixRegExp = /\.js$/,
        currDirRegExp = /^\.\//,
        op = Object.prototype,
        ostring = op.toString,
        hasOwn = op.hasOwnProperty,
        ap = Array.prototype,
        isBrowser = !!(typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document),
        isWebWorker = !isBrowser && typeof importScripts !== 'undefined',
        //PS3 indicates loaded and complete, but need to wait for complete
        //specifically. Sequence is 'loading', 'loaded', execution,
        // then 'complete'. The UA check is unfortunate, but not sure how
        //to feature test w/o causing perf issues.
        readyRegExp = isBrowser && navigator.platform === 'PLAYSTATION 3' ?
                      /^complete$/ : /^(complete|loaded)$/,
        defContextName = '_',
        //Oh the tragedy, detecting opera. See the usage of isOpera for reason.
        isOpera = typeof opera !== 'undefined' && opera.toString() === '[object Opera]',
        contexts = {},
        cfg = {},
        globalDefQueue = [],
        useInteractive = false;

    function isFunction(it) {
        return ostring.call(it) === '[object Function]';
    }

    function isArray(it) {
        return ostring.call(it) === '[object Array]';
    }

    /**
     * Helper function for iterating over an array. If the func returns
     * a true value, it will break out of the loop.
     */
    function each(ary, func) {
        if (ary) {
            var i;
            for (i = 0; i < ary.length; i += 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    /**
     * Helper function for iterating over an array backwards. If the func
     * returns a true value, it will break out of the loop.
     */
    function eachReverse(ary, func) {
        if (ary) {
            var i;
            for (i = ary.length - 1; i > -1; i -= 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    function getOwn(obj, prop) {
        return hasProp(obj, prop) && obj[prop];
    }

    /**
     * Cycles over properties in an object and calls a function for each
     * property value. If the function returns a truthy value, then the
     * iteration is stopped.
     */
    function eachProp(obj, func) {
        var prop;
        for (prop in obj) {
            if (hasProp(obj, prop)) {
                if (func(obj[prop], prop)) {
                    break;
                }
            }
        }
    }

    /**
     * Simple function to mix in properties from source into target,
     * but only if target does not already have a property of the same name.
     */
    function mixin(target, source, force, deepStringMixin) {
        if (source) {
            eachProp(source, function (value, prop) {
                if (force || !hasProp(target, prop)) {
                    if (deepStringMixin && typeof value === 'object' && value &&
                        !isArray(value) && !isFunction(value) &&
                        !(value instanceof RegExp)) {

                        if (!target[prop]) {
                            target[prop] = {};
                        }
                        mixin(target[prop], value, force, deepStringMixin);
                    } else {
                        target[prop] = value;
                    }
                }
            });
        }
        return target;
    }

    //Similar to Function.prototype.bind, but the 'this' object is specified
    //first, since it is easier to read/figure out what 'this' will be.
    function bind(obj, fn) {
        return function () {
            return fn.apply(obj, arguments);
        };
    }

    function scripts() {
        return document.getElementsByTagName('script');
    }

    function defaultOnError(err) {
        throw err;
    }

    //Allow getting a global that is expressed in
    //dot notation, like 'a.b.c'.
    function getGlobal(value) {
        if (!value) {
            return value;
        }
        var g = global;
        each(value.split('.'), function (part) {
            g = g[part];
        });
        return g;
    }

    /**
     * Constructs an error with a pointer to an URL with more information.
     * @param {String} id the error ID that maps to an ID on a web page.
     * @param {String} message human readable error.
     * @param {Error} [err] the original error, if there is one.
     *
     * @returns {Error}
     */
    function makeError(id, msg, err, requireModules) {
        var e = new Error(msg + '\nhttp://requirejs.org/docs/errors.html#' + id);
        e.requireType = id;
        e.requireModules = requireModules;
        if (err) {
            e.originalError = err;
        }
        return e;
    }

    if (typeof define !== 'undefined') {
        //If a define is already in play via another AMD loader,
        //do not overwrite.
        return;
    }

    if (typeof requirejs !== 'undefined') {
        if (isFunction(requirejs)) {
            //Do not overwrite an existing requirejs instance.
            return;
        }
        cfg = requirejs;
        requirejs = undefined;
    }

    //Allow for a require config object
    if (typeof require !== 'undefined' && !isFunction(require)) {
        //assume it is a config object.
        cfg = require;
        require = undefined;
    }

    function newContext(contextName) {
        var inCheckLoaded, Module, context, handlers,
            checkLoadedTimeoutId,
            config = {
                //Defaults. Do not set a default for map
                //config to speed up normalize(), which
                //will run faster if there is no default.
                waitSeconds: 7,
                baseUrl: './',
                paths: {},
                bundles: {},
                pkgs: {},
                shim: {},
                config: {}
            },
            registry = {},
            //registry of just enabled modules, to speed
            //cycle breaking code when lots of modules
            //are registered, but not activated.
            enabledRegistry = {},
            undefEvents = {},
            defQueue = [],
            defined = {},
            urlFetched = {},
            bundlesMap = {},
            requireCounter = 1,
            unnormalizedCounter = 1;

        /**
         * Trims the . and .. from an array of path segments.
         * It will keep a leading path segment if a .. will become
         * the first path segment, to help with module name lookups,
         * which act like paths, but can be remapped. But the end result,
         * all paths that use this function should look normalized.
         * NOTE: this method MODIFIES the input array.
         * @param {Array} ary the array of path segments.
         */
        function trimDots(ary) {
            var i, part;
            for (i = 0; i < ary.length; i++) {
                part = ary[i];
                if (part === '.') {
                    ary.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    // If at the start, or previous value is still ..,
                    // keep them so that when converted to a path it may
                    // still work when converted to a path, even though
                    // as an ID it is less than ideal. In larger point
                    // releases, may be better to just kick out an error.
                    if (i === 0 || (i === 1 && ary[2] === '..') || ary[i - 1] === '..') {
                        continue;
                    } else if (i > 0) {
                        ary.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
        }

        /**
         * Given a relative module name, like ./something, normalize it to
         * a real name that can be mapped to a path.
         * @param {String} name the relative name
         * @param {String} baseName a real name that the name arg is relative
         * to.
         * @param {Boolean} applyMap apply the map config to the value. Should
         * only be done if this normalization is for a dependency ID.
         * @returns {String} normalized name
         */
        function normalize(name, baseName, applyMap) {
            var pkgMain, mapValue, nameParts, i, j, nameSegment, lastIndex,
                foundMap, foundI, foundStarMap, starI, normalizedBaseParts,
                baseParts = (baseName && baseName.split('/')),
                map = config.map,
                starMap = map && map['*'];

            //Adjust any relative paths.
            if (name) {
                name = name.split('/');
                lastIndex = name.length - 1;

                // If wanting node ID compatibility, strip .js from end
                // of IDs. Have to do this here, and not in nameToUrl
                // because node allows either .js or non .js to map
                // to same file.
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                // Starts with a '.' so need the baseName
                if (name[0].charAt(0) === '.' && baseParts) {
                    //Convert baseName to array, and lop off the last part,
                    //so that . matches that 'directory' and not name of the baseName's
                    //module. For instance, baseName of 'one/two/three', maps to
                    //'one/two/three.js', but we want the directory, 'one/two' for
                    //this normalization.
                    normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                    name = normalizedBaseParts.concat(name);
                }

                trimDots(name);
                name = name.join('/');
            }

            //Apply map config if available.
            if (applyMap && map && (baseParts || starMap)) {
                nameParts = name.split('/');

                outerLoop: for (i = nameParts.length; i > 0; i -= 1) {
                    nameSegment = nameParts.slice(0, i).join('/');

                    if (baseParts) {
                        //Find the longest baseName segment match in the config.
                        //So, do joins on the biggest to smallest lengths of baseParts.
                        for (j = baseParts.length; j > 0; j -= 1) {
                            mapValue = getOwn(map, baseParts.slice(0, j).join('/'));

                            //baseName segment has config, find if it has one for
                            //this name.
                            if (mapValue) {
                                mapValue = getOwn(mapValue, nameSegment);
                                if (mapValue) {
                                    //Match, update name to the new value.
                                    foundMap = mapValue;
                                    foundI = i;
                                    break outerLoop;
                                }
                            }
                        }
                    }

                    //Check for a star map match, but just hold on to it,
                    //if there is a shorter segment match later in a matching
                    //config, then favor over this star map.
                    if (!foundStarMap && starMap && getOwn(starMap, nameSegment)) {
                        foundStarMap = getOwn(starMap, nameSegment);
                        starI = i;
                    }
                }

                if (!foundMap && foundStarMap) {
                    foundMap = foundStarMap;
                    foundI = starI;
                }

                if (foundMap) {
                    nameParts.splice(0, foundI, foundMap);
                    name = nameParts.join('/');
                }
            }

            // If the name points to a package's name, use
            // the package main instead.
            pkgMain = getOwn(config.pkgs, name);

            return pkgMain ? pkgMain : name;
        }

        function removeScript(name) {
            if (isBrowser) {
                each(scripts(), function (scriptNode) {
                    if (scriptNode.getAttribute('data-requiremodule') === name &&
                            scriptNode.getAttribute('data-requirecontext') === context.contextName) {
                        scriptNode.parentNode.removeChild(scriptNode);
                        return true;
                    }
                });
            }
        }

        function hasPathFallback(id) {
            var pathConfig = getOwn(config.paths, id);
            if (pathConfig && isArray(pathConfig) && pathConfig.length > 1) {
                //Pop off the first array value, since it failed, and
                //retry
                pathConfig.shift();
                context.require.undef(id);

                //Custom require that does not do map translation, since
                //ID is "absolute", already mapped/resolved.
                context.makeRequire(null, {
                    skipMap: true
                })([id]);

                return true;
            }
        }

        //Turns a plugin!resource to [plugin, resource]
        //with the plugin being undefined if the name
        //did not have a plugin prefix.
        function splitPrefix(name) {
            var prefix,
                index = name ? name.indexOf('!') : -1;
            if (index > -1) {
                prefix = name.substring(0, index);
                name = name.substring(index + 1, name.length);
            }
            return [prefix, name];
        }

        /**
         * Creates a module mapping that includes plugin prefix, module
         * name, and path. If parentModuleMap is provided it will
         * also normalize the name via require.normalize()
         *
         * @param {String} name the module name
         * @param {String} [parentModuleMap] parent module map
         * for the module name, used to resolve relative names.
         * @param {Boolean} isNormalized: is the ID already normalized.
         * This is true if this call is done for a define() module ID.
         * @param {Boolean} applyMap: apply the map config to the ID.
         * Should only be true if this map is for a dependency.
         *
         * @returns {Object}
         */
        function makeModuleMap(name, parentModuleMap, isNormalized, applyMap) {
            var url, pluginModule, suffix, nameParts,
                prefix = null,
                parentName = parentModuleMap ? parentModuleMap.name : null,
                originalName = name,
                isDefine = true,
                normalizedName = '';

            //If no name, then it means it is a require call, generate an
            //internal name.
            if (!name) {
                isDefine = false;
                name = '_@r' + (requireCounter += 1);
            }

            nameParts = splitPrefix(name);
            prefix = nameParts[0];
            name = nameParts[1];

            if (prefix) {
                prefix = normalize(prefix, parentName, applyMap);
                pluginModule = getOwn(defined, prefix);
            }

            //Account for relative paths if there is a base name.
            if (name) {
                if (prefix) {
                    if (pluginModule && pluginModule.normalize) {
                        //Plugin is loaded, use its normalize method.
                        normalizedName = pluginModule.normalize(name, function (name) {
                            return normalize(name, parentName, applyMap);
                        });
                    } else {
                        // If nested plugin references, then do not try to
                        // normalize, as it will not normalize correctly. This
                        // places a restriction on resourceIds, and the longer
                        // term solution is not to normalize until plugins are
                        // loaded and all normalizations to allow for async
                        // loading of a loader plugin. But for now, fixes the
                        // common uses. Details in #1131
                        normalizedName = name.indexOf('!') === -1 ?
                                         normalize(name, parentName, applyMap) :
                                         name;
                    }
                } else {
                    //A regular module.
                    normalizedName = normalize(name, parentName, applyMap);

                    //Normalized name may be a plugin ID due to map config
                    //application in normalize. The map config values must
                    //already be normalized, so do not need to redo that part.
                    nameParts = splitPrefix(normalizedName);
                    prefix = nameParts[0];
                    normalizedName = nameParts[1];
                    isNormalized = true;

                    url = context.nameToUrl(normalizedName);
                }
            }

            //If the id is a plugin id that cannot be determined if it needs
            //normalization, stamp it with a unique ID so two matching relative
            //ids that may conflict can be separate.
            suffix = prefix && !pluginModule && !isNormalized ?
                     '_unnormalized' + (unnormalizedCounter += 1) :
                     '';

            return {
                prefix: prefix,
                name: normalizedName,
                parentMap: parentModuleMap,
                unnormalized: !!suffix,
                url: url,
                originalName: originalName,
                isDefine: isDefine,
                id: (prefix ?
                        prefix + '!' + normalizedName :
                        normalizedName) + suffix
            };
        }

        function getModule(depMap) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (!mod) {
                mod = registry[id] = new context.Module(depMap);
            }

            return mod;
        }

        function on(depMap, name, fn) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (hasProp(defined, id) &&
                    (!mod || mod.defineEmitComplete)) {
                if (name === 'defined') {
                    fn(defined[id]);
                }
            } else {
                mod = getModule(depMap);
                if (mod.error && name === 'error') {
                    fn(mod.error);
                } else {
                    mod.on(name, fn);
                }
            }
        }

        function onError(err, errback) {
            var ids = err.requireModules,
                notified = false;

            if (errback) {
                errback(err);
            } else {
                each(ids, function (id) {
                    var mod = getOwn(registry, id);
                    if (mod) {
                        //Set error on module, so it skips timeout checks.
                        mod.error = err;
                        if (mod.events.error) {
                            notified = true;
                            mod.emit('error', err);
                        }
                    }
                });

                if (!notified) {
                    req.onError(err);
                }
            }
        }

        /**
         * Internal method to transfer globalQueue items to this context's
         * defQueue.
         */
        function takeGlobalQueue() {
            //Push all the globalDefQueue items into the context's defQueue
            if (globalDefQueue.length) {
                each(globalDefQueue, function(queueItem) {
                    var id = queueItem[0];
                    if (typeof id === 'string') {
                        context.defQueueMap[id] = true;
                    }
                    defQueue.push(queueItem);
                });
                globalDefQueue = [];
            }
        }

        handlers = {
            'require': function (mod) {
                if (mod.require) {
                    return mod.require;
                } else {
                    return (mod.require = context.makeRequire(mod.map));
                }
            },
            'exports': function (mod) {
                mod.usingExports = true;
                if (mod.map.isDefine) {
                    if (mod.exports) {
                        return (defined[mod.map.id] = mod.exports);
                    } else {
                        return (mod.exports = defined[mod.map.id] = {});
                    }
                }
            },
            'module': function (mod) {
                if (mod.module) {
                    return mod.module;
                } else {
                    return (mod.module = {
                        id: mod.map.id,
                        uri: mod.map.url,
                        config: function () {
                            return getOwn(config.config, mod.map.id) || {};
                        },
                        exports: mod.exports || (mod.exports = {})
                    });
                }
            }
        };

        function cleanRegistry(id) {
            //Clean up machinery used for waiting modules.
            delete registry[id];
            delete enabledRegistry[id];
        }

        function breakCycle(mod, traced, processed) {
            var id = mod.map.id;

            if (mod.error) {
                mod.emit('error', mod.error);
            } else {
                traced[id] = true;
                each(mod.depMaps, function (depMap, i) {
                    var depId = depMap.id,
                        dep = getOwn(registry, depId);

                    //Only force things that have not completed
                    //being defined, so still in the registry,
                    //and only if it has not been matched up
                    //in the module already.
                    if (dep && !mod.depMatched[i] && !processed[depId]) {
                        if (getOwn(traced, depId)) {
                            mod.defineDep(i, defined[depId]);
                            mod.check(); //pass false?
                        } else {
                            breakCycle(dep, traced, processed);
                        }
                    }
                });
                processed[id] = true;
            }
        }

        function checkLoaded() {
            var err, usingPathFallback,
                waitInterval = config.waitSeconds * 1000,
                //It is possible to disable the wait interval by using waitSeconds of 0.
                expired = waitInterval && (context.startTime + waitInterval) < new Date().getTime(),
                noLoads = [],
                reqCalls = [],
                stillLoading = false,
                needCycleCheck = true;

            //Do not bother if this call was a result of a cycle break.
            if (inCheckLoaded) {
                return;
            }

            inCheckLoaded = true;

            //Figure out the state of all the modules.
            eachProp(enabledRegistry, function (mod) {
                var map = mod.map,
                    modId = map.id;

                //Skip things that are not enabled or in error state.
                if (!mod.enabled) {
                    return;
                }

                if (!map.isDefine) {
                    reqCalls.push(mod);
                }

                if (!mod.error) {
                    //If the module should be executed, and it has not
                    //been inited and time is up, remember it.
                    if (!mod.inited && expired) {
                        if (hasPathFallback(modId)) {
                            usingPathFallback = true;
                            stillLoading = true;
                        } else {
                            noLoads.push(modId);
                            removeScript(modId);
                        }
                    } else if (!mod.inited && mod.fetched && map.isDefine) {
                        stillLoading = true;
                        if (!map.prefix) {
                            //No reason to keep looking for unfinished
                            //loading. If the only stillLoading is a
                            //plugin resource though, keep going,
                            //because it may be that a plugin resource
                            //is waiting on a non-plugin cycle.
                            return (needCycleCheck = false);
                        }
                    }
                }
            });

            if (expired && noLoads.length) {
                //If wait time expired, throw error of unloaded modules.
                err = makeError('timeout', 'Load timeout for modules: ' + noLoads, null, noLoads);
                err.contextName = context.contextName;
                return onError(err);
            }

            //Not expired, check for a cycle.
            if (needCycleCheck) {
                each(reqCalls, function (mod) {
                    breakCycle(mod, {}, {});
                });
            }

            //If still waiting on loads, and the waiting load is something
            //other than a plugin resource, or there are still outstanding
            //scripts, then just try back later.
            if ((!expired || usingPathFallback) && stillLoading) {
                //Something is still waiting to load. Wait for it, but only
                //if a timeout is not already in effect.
                if ((isBrowser || isWebWorker) && !checkLoadedTimeoutId) {
                    checkLoadedTimeoutId = setTimeout(function () {
                        checkLoadedTimeoutId = 0;
                        checkLoaded();
                    }, 50);
                }
            }

            inCheckLoaded = false;
        }

        Module = function (map) {
            this.events = getOwn(undefEvents, map.id) || {};
            this.map = map;
            this.shim = getOwn(config.shim, map.id);
            this.depExports = [];
            this.depMaps = [];
            this.depMatched = [];
            this.pluginMaps = {};
            this.depCount = 0;

            /* this.exports this.factory
               this.depMaps = [],
               this.enabled, this.fetched
            */
        };

        Module.prototype = {
            init: function (depMaps, factory, errback, options) {
                options = options || {};

                //Do not do more inits if already done. Can happen if there
                //are multiple define calls for the same module. That is not
                //a normal, common case, but it is also not unexpected.
                if (this.inited) {
                    return;
                }

                this.factory = factory;

                if (errback) {
                    //Register for errors on this module.
                    this.on('error', errback);
                } else if (this.events.error) {
                    //If no errback already, but there are error listeners
                    //on this module, set up an errback to pass to the deps.
                    errback = bind(this, function (err) {
                        this.emit('error', err);
                    });
                }

                //Do a copy of the dependency array, so that
                //source inputs are not modified. For example
                //"shim" deps are passed in here directly, and
                //doing a direct modification of the depMaps array
                //would affect that config.
                this.depMaps = depMaps && depMaps.slice(0);

                this.errback = errback;

                //Indicate this module has be initialized
                this.inited = true;

                this.ignore = options.ignore;

                //Could have option to init this module in enabled mode,
                //or could have been previously marked as enabled. However,
                //the dependencies are not known until init is called. So
                //if enabled previously, now trigger dependencies as enabled.
                if (options.enabled || this.enabled) {
                    //Enable this module and dependencies.
                    //Will call this.check()
                    this.enable();
                } else {
                    this.check();
                }
            },

            defineDep: function (i, depExports) {
                //Because of cycles, defined callback for a given
                //export can be called more than once.
                if (!this.depMatched[i]) {
                    this.depMatched[i] = true;
                    this.depCount -= 1;
                    this.depExports[i] = depExports;
                }
            },

            fetch: function () {
                if (this.fetched) {
                    return;
                }
                this.fetched = true;

                context.startTime = (new Date()).getTime();

                var map = this.map;

                //If the manager is for a plugin managed resource,
                //ask the plugin to load it now.
                if (this.shim) {
                    context.makeRequire(this.map, {
                        enableBuildCallback: true
                    })(this.shim.deps || [], bind(this, function () {
                        return map.prefix ? this.callPlugin() : this.load();
                    }));
                } else {
                    //Regular dependency.
                    return map.prefix ? this.callPlugin() : this.load();
                }
            },

            load: function () {
                var url = this.map.url;

                //Regular dependency.
                if (!urlFetched[url]) {
                    urlFetched[url] = true;
                    context.load(this.map.id, url);
                }
            },

            /**
             * Checks if the module is ready to define itself, and if so,
             * define it.
             */
            check: function () {
                if (!this.enabled || this.enabling) {
                    return;
                }

                var err, cjsModule,
                    id = this.map.id,
                    depExports = this.depExports,
                    exports = this.exports,
                    factory = this.factory;

                if (!this.inited) {
                    // Only fetch if not already in the defQueue.
                    if (!hasProp(context.defQueueMap, id)) {
                        this.fetch();
                    }
                } else if (this.error) {
                    this.emit('error', this.error);
                } else if (!this.defining) {
                    //The factory could trigger another require call
                    //that would result in checking this module to
                    //define itself again. If already in the process
                    //of doing that, skip this work.
                    this.defining = true;

                    if (this.depCount < 1 && !this.defined) {
                        if (isFunction(factory)) {
                            //If there is an error listener, favor passing
                            //to that instead of throwing an error. However,
                            //only do it for define()'d  modules. require
                            //errbacks should not be called for failures in
                            //their callbacks (#699). However if a global
                            //onError is set, use that.
                            if ((this.events.error && this.map.isDefine) ||
                                req.onError !== defaultOnError) {
                                try {
                                    exports = context.execCb(id, factory, depExports, exports);
                                } catch (e) {
                                    err = e;
                                }
                            } else {
                                exports = context.execCb(id, factory, depExports, exports);
                            }

                            // Favor return value over exports. If node/cjs in play,
                            // then will not have a return value anyway. Favor
                            // module.exports assignment over exports object.
                            if (this.map.isDefine && exports === undefined) {
                                cjsModule = this.module;
                                if (cjsModule) {
                                    exports = cjsModule.exports;
                                } else if (this.usingExports) {
                                    //exports already set the defined value.
                                    exports = this.exports;
                                }
                            }

                            if (err) {
                                err.requireMap = this.map;
                                err.requireModules = this.map.isDefine ? [this.map.id] : null;
                                err.requireType = this.map.isDefine ? 'define' : 'require';
                                return onError((this.error = err));
                            }

                        } else {
                            //Just a literal value
                            exports = factory;
                        }

                        this.exports = exports;

                        if (this.map.isDefine && !this.ignore) {
                            defined[id] = exports;

                            if (req.onResourceLoad) {
                                req.onResourceLoad(context, this.map, this.depMaps);
                            }
                        }

                        //Clean up
                        cleanRegistry(id);

                        this.defined = true;
                    }

                    //Finished the define stage. Allow calling check again
                    //to allow define notifications below in the case of a
                    //cycle.
                    this.defining = false;

                    if (this.defined && !this.defineEmitted) {
                        this.defineEmitted = true;
                        this.emit('defined', this.exports);
                        this.defineEmitComplete = true;
                    }

                }
            },

            callPlugin: function () {
                var map = this.map,
                    id = map.id,
                    //Map already normalized the prefix.
                    pluginMap = makeModuleMap(map.prefix);

                //Mark this as a dependency for this plugin, so it
                //can be traced for cycles.
                this.depMaps.push(pluginMap);

                on(pluginMap, 'defined', bind(this, function (plugin) {
                    var load, normalizedMap, normalizedMod,
                        bundleId = getOwn(bundlesMap, this.map.id),
                        name = this.map.name,
                        parentName = this.map.parentMap ? this.map.parentMap.name : null,
                        localRequire = context.makeRequire(map.parentMap, {
                            enableBuildCallback: true
                        });

                    //If current map is not normalized, wait for that
                    //normalized name to load instead of continuing.
                    if (this.map.unnormalized) {
                        //Normalize the ID if the plugin allows it.
                        if (plugin.normalize) {
                            name = plugin.normalize(name, function (name) {
                                return normalize(name, parentName, true);
                            }) || '';
                        }

                        //prefix and name should already be normalized, no need
                        //for applying map config again either.
                        normalizedMap = makeModuleMap(map.prefix + '!' + name,
                                                      this.map.parentMap);
                        on(normalizedMap,
                            'defined', bind(this, function (value) {
                                this.init([], function () { return value; }, null, {
                                    enabled: true,
                                    ignore: true
                                });
                            }));

                        normalizedMod = getOwn(registry, normalizedMap.id);
                        if (normalizedMod) {
                            //Mark this as a dependency for this plugin, so it
                            //can be traced for cycles.
                            this.depMaps.push(normalizedMap);

                            if (this.events.error) {
                                normalizedMod.on('error', bind(this, function (err) {
                                    this.emit('error', err);
                                }));
                            }
                            normalizedMod.enable();
                        }

                        return;
                    }

                    //If a paths config, then just load that file instead to
                    //resolve the plugin, as it is built into that paths layer.
                    if (bundleId) {
                        this.map.url = context.nameToUrl(bundleId);
                        this.load();
                        return;
                    }

                    load = bind(this, function (value) {
                        this.init([], function () { return value; }, null, {
                            enabled: true
                        });
                    });

                    load.error = bind(this, function (err) {
                        this.inited = true;
                        this.error = err;
                        err.requireModules = [id];

                        //Remove temp unnormalized modules for this module,
                        //since they will never be resolved otherwise now.
                        eachProp(registry, function (mod) {
                            if (mod.map.id.indexOf(id + '_unnormalized') === 0) {
                                cleanRegistry(mod.map.id);
                            }
                        });

                        onError(err);
                    });

                    //Allow plugins to load other code without having to know the
                    //context or how to 'complete' the load.
                    load.fromText = bind(this, function (text, textAlt) {
                        /*jslint evil: true */
                        var moduleName = map.name,
                            moduleMap = makeModuleMap(moduleName),
                            hasInteractive = useInteractive;

                        //As of 2.1.0, support just passing the text, to reinforce
                        //fromText only being called once per resource. Still
                        //support old style of passing moduleName but discard
                        //that moduleName in favor of the internal ref.
                        if (textAlt) {
                            text = textAlt;
                        }

                        //Turn off interactive script matching for IE for any define
                        //calls in the text, then turn it back on at the end.
                        if (hasInteractive) {
                            useInteractive = false;
                        }

                        //Prime the system by creating a module instance for
                        //it.
                        getModule(moduleMap);

                        //Transfer any config to this other module.
                        if (hasProp(config.config, id)) {
                            config.config[moduleName] = config.config[id];
                        }

                        try {
                            req.exec(text);
                        } catch (e) {
                            return onError(makeError('fromtexteval',
                                             'fromText eval for ' + id +
                                            ' failed: ' + e,
                                             e,
                                             [id]));
                        }

                        if (hasInteractive) {
                            useInteractive = true;
                        }

                        //Mark this as a dependency for the plugin
                        //resource
                        this.depMaps.push(moduleMap);

                        //Support anonymous modules.
                        context.completeLoad(moduleName);

                        //Bind the value of that module to the value for this
                        //resource ID.
                        localRequire([moduleName], load);
                    });

                    //Use parentName here since the plugin's name is not reliable,
                    //could be some weird string with no path that actually wants to
                    //reference the parentName's path.
                    plugin.load(map.name, localRequire, load, config);
                }));

                context.enable(pluginMap, this);
                this.pluginMaps[pluginMap.id] = pluginMap;
            },

            enable: function () {
                enabledRegistry[this.map.id] = this;
                this.enabled = true;

                //Set flag mentioning that the module is enabling,
                //so that immediate calls to the defined callbacks
                //for dependencies do not trigger inadvertent load
                //with the depCount still being zero.
                this.enabling = true;

                //Enable each dependency
                each(this.depMaps, bind(this, function (depMap, i) {
                    var id, mod, handler;

                    if (typeof depMap === 'string') {
                        //Dependency needs to be converted to a depMap
                        //and wired up to this module.
                        depMap = makeModuleMap(depMap,
                                               (this.map.isDefine ? this.map : this.map.parentMap),
                                               false,
                                               !this.skipMap);
                        this.depMaps[i] = depMap;

                        handler = getOwn(handlers, depMap.id);

                        if (handler) {
                            this.depExports[i] = handler(this);
                            return;
                        }

                        this.depCount += 1;

                        on(depMap, 'defined', bind(this, function (depExports) {
                            if (this.undefed) {
                                return;
                            }
                            this.defineDep(i, depExports);
                            this.check();
                        }));

                        if (this.errback) {
                            on(depMap, 'error', bind(this, this.errback));
                        } else if (this.events.error) {
                            // No direct errback on this module, but something
                            // else is listening for errors, so be sure to
                            // propagate the error correctly.
                            on(depMap, 'error', bind(this, function(err) {
                                this.emit('error', err);
                            }));
                        }
                    }

                    id = depMap.id;
                    mod = registry[id];

                    //Skip special modules like 'require', 'exports', 'module'
                    //Also, don't call enable if it is already enabled,
                    //important in circular dependency cases.
                    if (!hasProp(handlers, id) && mod && !mod.enabled) {
                        context.enable(depMap, this);
                    }
                }));

                //Enable each plugin that is used in
                //a dependency
                eachProp(this.pluginMaps, bind(this, function (pluginMap) {
                    var mod = getOwn(registry, pluginMap.id);
                    if (mod && !mod.enabled) {
                        context.enable(pluginMap, this);
                    }
                }));

                this.enabling = false;

                this.check();
            },

            on: function (name, cb) {
                var cbs = this.events[name];
                if (!cbs) {
                    cbs = this.events[name] = [];
                }
                cbs.push(cb);
            },

            emit: function (name, evt) {
                each(this.events[name], function (cb) {
                    cb(evt);
                });
                if (name === 'error') {
                    //Now that the error handler was triggered, remove
                    //the listeners, since this broken Module instance
                    //can stay around for a while in the registry.
                    delete this.events[name];
                }
            }
        };

        function callGetModule(args) {
            //Skip modules already defined.
            if (!hasProp(defined, args[0])) {
                getModule(makeModuleMap(args[0], null, true)).init(args[1], args[2]);
            }
        }

        function removeListener(node, func, name, ieName) {
            //Favor detachEvent because of IE9
            //issue, see attachEvent/addEventListener comment elsewhere
            //in this file.
            if (node.detachEvent && !isOpera) {
                //Probably IE. If not it will throw an error, which will be
                //useful to know.
                if (ieName) {
                    node.detachEvent(ieName, func);
                }
            } else {
                node.removeEventListener(name, func, false);
            }
        }

        /**
         * Given an event from a script node, get the requirejs info from it,
         * and then removes the event listeners on the node.
         * @param {Event} evt
         * @returns {Object}
         */
        function getScriptData(evt) {
            //Using currentTarget instead of target for Firefox 2.0's sake. Not
            //all old browsers will be supported, but this one was easy enough
            //to support and still makes sense.
            var node = evt.currentTarget || evt.srcElement;

            //Remove the listeners once here.
            removeListener(node, context.onScriptLoad, 'load', 'onreadystatechange');
            removeListener(node, context.onScriptError, 'error');

            return {
                node: node,
                id: node && node.getAttribute('data-requiremodule')
            };
        }

        function intakeDefines() {
            var args;

            //Any defined modules in the global queue, intake them now.
            takeGlobalQueue();

            //Make sure any remaining defQueue items get properly processed.
            while (defQueue.length) {
                args = defQueue.shift();
                if (args[0] === null) {
                    return onError(makeError('mismatch', 'Mismatched anonymous define() module: ' +
                        args[args.length - 1]));
                } else {
                    //args are id, deps, factory. Should be normalized by the
                    //define() function.
                    callGetModule(args);
                }
            }
            context.defQueueMap = {};
        }

        context = {
            config: config,
            contextName: contextName,
            registry: registry,
            defined: defined,
            urlFetched: urlFetched,
            defQueue: defQueue,
            defQueueMap: {},
            Module: Module,
            makeModuleMap: makeModuleMap,
            nextTick: req.nextTick,
            onError: onError,

            /**
             * Set a configuration for the context.
             * @param {Object} cfg config object to integrate.
             */
            configure: function (cfg) {
                //Make sure the baseUrl ends in a slash.
                if (cfg.baseUrl) {
                    if (cfg.baseUrl.charAt(cfg.baseUrl.length - 1) !== '/') {
                        cfg.baseUrl += '/';
                    }
                }

                //Save off the paths since they require special processing,
                //they are additive.
                var shim = config.shim,
                    objs = {
                        paths: true,
                        bundles: true,
                        config: true,
                        map: true
                    };

                eachProp(cfg, function (value, prop) {
                    if (objs[prop]) {
                        if (!config[prop]) {
                            config[prop] = {};
                        }
                        mixin(config[prop], value, true, true);
                    } else {
                        config[prop] = value;
                    }
                });

                //Reverse map the bundles
                if (cfg.bundles) {
                    eachProp(cfg.bundles, function (value, prop) {
                        each(value, function (v) {
                            if (v !== prop) {
                                bundlesMap[v] = prop;
                            }
                        });
                    });
                }

                //Merge shim
                if (cfg.shim) {
                    eachProp(cfg.shim, function (value, id) {
                        //Normalize the structure
                        if (isArray(value)) {
                            value = {
                                deps: value
                            };
                        }
                        if ((value.exports || value.init) && !value.exportsFn) {
                            value.exportsFn = context.makeShimExports(value);
                        }
                        shim[id] = value;
                    });
                    config.shim = shim;
                }

                //Adjust packages if necessary.
                if (cfg.packages) {
                    each(cfg.packages, function (pkgObj) {
                        var location, name;

                        pkgObj = typeof pkgObj === 'string' ? {name: pkgObj} : pkgObj;

                        name = pkgObj.name;
                        location = pkgObj.location;
                        if (location) {
                            config.paths[name] = pkgObj.location;
                        }

                        //Save pointer to main module ID for pkg name.
                        //Remove leading dot in main, so main paths are normalized,
                        //and remove any trailing .js, since different package
                        //envs have different conventions: some use a module name,
                        //some use a file name.
                        config.pkgs[name] = pkgObj.name + '/' + (pkgObj.main || 'main')
                                     .replace(currDirRegExp, '')
                                     .replace(jsSuffixRegExp, '');
                    });
                }

                //If there are any "waiting to execute" modules in the registry,
                //update the maps for them, since their info, like URLs to load,
                //may have changed.
                eachProp(registry, function (mod, id) {
                    //If module already has init called, since it is too
                    //late to modify them, and ignore unnormalized ones
                    //since they are transient.
                    if (!mod.inited && !mod.map.unnormalized) {
                        mod.map = makeModuleMap(id, null, true);
                    }
                });

                //If a deps array or a config callback is specified, then call
                //require with those args. This is useful when require is defined as a
                //config object before require.js is loaded.
                if (cfg.deps || cfg.callback) {
                    context.require(cfg.deps || [], cfg.callback);
                }
            },

            makeShimExports: function (value) {
                function fn() {
                    var ret;
                    if (value.init) {
                        ret = value.init.apply(global, arguments);
                    }
                    return ret || (value.exports && getGlobal(value.exports));
                }
                return fn;
            },

            makeRequire: function (relMap, options) {
                options = options || {};

                function localRequire(deps, callback, errback) {
                    var id, map, requireMod;

                    if (options.enableBuildCallback && callback && isFunction(callback)) {
                        callback.__requireJsBuild = true;
                    }

                    if (typeof deps === 'string') {
                        if (isFunction(callback)) {
                            //Invalid call
                            return onError(makeError('requireargs', 'Invalid require call'), errback);
                        }

                        //If require|exports|module are requested, get the
                        //value for them from the special handlers. Caveat:
                        //this only works while module is being defined.
                        if (relMap && hasProp(handlers, deps)) {
                            return handlers[deps](registry[relMap.id]);
                        }

                        //Synchronous access to one module. If require.get is
                        //available (as in the Node adapter), prefer that.
                        if (req.get) {
                            return req.get(context, deps, relMap, localRequire);
                        }

                        //Normalize module name, if it contains . or ..
                        map = makeModuleMap(deps, relMap, false, true);
                        id = map.id;

                        if (!hasProp(defined, id)) {
                            return onError(makeError('notloaded', 'Module name "' +
                                        id +
                                        '" has not been loaded yet for context: ' +
                                        contextName +
                                        (relMap ? '' : '. Use require([])')));
                        }
                        return defined[id];
                    }

                    //Grab defines waiting in the global queue.
                    intakeDefines();

                    //Mark all the dependencies as needing to be loaded.
                    context.nextTick(function () {
                        //Some defines could have been added since the
                        //require call, collect them.
                        intakeDefines();

                        requireMod = getModule(makeModuleMap(null, relMap));

                        //Store if map config should be applied to this require
                        //call for dependencies.
                        requireMod.skipMap = options.skipMap;

                        requireMod.init(deps, callback, errback, {
                            enabled: true
                        });

                        checkLoaded();
                    });

                    return localRequire;
                }

                mixin(localRequire, {
                    isBrowser: isBrowser,

                    /**
                     * Converts a module name + .extension into an URL path.
                     * *Requires* the use of a module name. It does not support using
                     * plain URLs like nameToUrl.
                     */
                    toUrl: function (moduleNamePlusExt) {
                        var ext,
                            index = moduleNamePlusExt.lastIndexOf('.'),
                            segment = moduleNamePlusExt.split('/')[0],
                            isRelative = segment === '.' || segment === '..';

                        //Have a file extension alias, and it is not the
                        //dots from a relative path.
                        if (index !== -1 && (!isRelative || index > 1)) {
                            ext = moduleNamePlusExt.substring(index, moduleNamePlusExt.length);
                            moduleNamePlusExt = moduleNamePlusExt.substring(0, index);
                        }

                        return context.nameToUrl(normalize(moduleNamePlusExt,
                                                relMap && relMap.id, true), ext,  true);
                    },

                    defined: function (id) {
                        return hasProp(defined, makeModuleMap(id, relMap, false, true).id);
                    },

                    specified: function (id) {
                        id = makeModuleMap(id, relMap, false, true).id;
                        return hasProp(defined, id) || hasProp(registry, id);
                    }
                });

                //Only allow undef on top level require calls
                if (!relMap) {
                    localRequire.undef = function (id) {
                        //Bind any waiting define() calls to this context,
                        //fix for #408
                        takeGlobalQueue();

                        var map = makeModuleMap(id, relMap, true),
                            mod = getOwn(registry, id);

                        mod.undefed = true;
                        removeScript(id);

                        delete defined[id];
                        delete urlFetched[map.url];
                        delete undefEvents[id];

                        //Clean queued defines too. Go backwards
                        //in array so that the splices do not
                        //mess up the iteration.
                        eachReverse(defQueue, function(args, i) {
                            if (args[0] === id) {
                                defQueue.splice(i, 1);
                            }
                        });
                        delete context.defQueueMap[id];

                        if (mod) {
                            //Hold on to listeners in case the
                            //module will be attempted to be reloaded
                            //using a different config.
                            if (mod.events.defined) {
                                undefEvents[id] = mod.events;
                            }

                            cleanRegistry(id);
                        }
                    };
                }

                return localRequire;
            },

            /**
             * Called to enable a module if it is still in the registry
             * awaiting enablement. A second arg, parent, the parent module,
             * is passed in for context, when this method is overridden by
             * the optimizer. Not shown here to keep code compact.
             */
            enable: function (depMap) {
                var mod = getOwn(registry, depMap.id);
                if (mod) {
                    getModule(depMap).enable();
                }
            },

            /**
             * Internal method used by environment adapters to complete a load event.
             * A load event could be a script load or just a load pass from a synchronous
             * load call.
             * @param {String} moduleName the name of the module to potentially complete.
             */
            completeLoad: function (moduleName) {
                var found, args, mod,
                    shim = getOwn(config.shim, moduleName) || {},
                    shExports = shim.exports;

                takeGlobalQueue();

                while (defQueue.length) {
                    args = defQueue.shift();
                    if (args[0] === null) {
                        args[0] = moduleName;
                        //If already found an anonymous module and bound it
                        //to this name, then this is some other anon module
                        //waiting for its completeLoad to fire.
                        if (found) {
                            break;
                        }
                        found = true;
                    } else if (args[0] === moduleName) {
                        //Found matching define call for this script!
                        found = true;
                    }

                    callGetModule(args);
                }
                context.defQueueMap = {};

                //Do this after the cycle of callGetModule in case the result
                //of those calls/init calls changes the registry.
                mod = getOwn(registry, moduleName);

                if (!found && !hasProp(defined, moduleName) && mod && !mod.inited) {
                    if (config.enforceDefine && (!shExports || !getGlobal(shExports))) {
                        if (hasPathFallback(moduleName)) {
                            return;
                        } else {
                            return onError(makeError('nodefine',
                                             'No define call for ' + moduleName,
                                             null,
                                             [moduleName]));
                        }
                    } else {
                        //A script that does not call define(), so just simulate
                        //the call for it.
                        callGetModule([moduleName, (shim.deps || []), shim.exportsFn]);
                    }
                }

                checkLoaded();
            },

            /**
             * Converts a module name to a file path. Supports cases where
             * moduleName may actually be just an URL.
             * Note that it **does not** call normalize on the moduleName,
             * it is assumed to have already been normalized. This is an
             * internal API, not a public one. Use toUrl for the public API.
             */
            nameToUrl: function (moduleName, ext, skipExt) {
                var paths, syms, i, parentModule, url,
                    parentPath, bundleId,
                    pkgMain = getOwn(config.pkgs, moduleName);

                if (pkgMain) {
                    moduleName = pkgMain;
                }

                bundleId = getOwn(bundlesMap, moduleName);

                if (bundleId) {
                    return context.nameToUrl(bundleId, ext, skipExt);
                }

                //If a colon is in the URL, it indicates a protocol is used and it is just
                //an URL to a file, or if it starts with a slash, contains a query arg (i.e. ?)
                //or ends with .js, then assume the user meant to use an url and not a module id.
                //The slash is important for protocol-less URLs as well as full paths.
                if (req.jsExtRegExp.test(moduleName)) {
                    //Just a plain path, not module name lookup, so just return it.
                    //Add extension if it is included. This is a bit wonky, only non-.js things pass
                    //an extension, this method probably needs to be reworked.
                    url = moduleName + (ext || '');
                } else {
                    //A module that needs to be converted to a path.
                    paths = config.paths;

                    syms = moduleName.split('/');
                    //For each module name segment, see if there is a path
                    //registered for it. Start with most specific name
                    //and work up from it.
                    for (i = syms.length; i > 0; i -= 1) {
                        parentModule = syms.slice(0, i).join('/');

                        parentPath = getOwn(paths, parentModule);
                        if (parentPath) {
                            //If an array, it means there are a few choices,
                            //Choose the one that is desired
                            if (isArray(parentPath)) {
                                parentPath = parentPath[0];
                            }
                            syms.splice(0, i, parentPath);
                            break;
                        }
                    }

                    //Join the path parts together, then figure out if baseUrl is needed.
                    url = syms.join('/');
                    url += (ext || (/^data\:|\?/.test(url) || skipExt ? '' : '.js'));
                    url = (url.charAt(0) === '/' || url.match(/^[\w\+\.\-]+:/) ? '' : config.baseUrl) + url;
                }

                return config.urlArgs ? url +
                                        ((url.indexOf('?') === -1 ? '?' : '&') +
                                         config.urlArgs) : url;
            },

            //Delegates to req.load. Broken out as a separate function to
            //allow overriding in the optimizer.
            load: function (id, url) {
                req.load(context, id, url);
            },

            /**
             * Executes a module callback function. Broken out as a separate function
             * solely to allow the build system to sequence the files in the built
             * layer in the right sequence.
             *
             * @private
             */
            execCb: function (name, callback, args, exports) {
                return callback.apply(exports, args);
            },

            /**
             * callback for script loads, used to check status of loading.
             *
             * @param {Event} evt the event from the browser for the script
             * that was loaded.
             */
            onScriptLoad: function (evt) {
                //Using currentTarget instead of target for Firefox 2.0's sake. Not
                //all old browsers will be supported, but this one was easy enough
                //to support and still makes sense.
                if (evt.type === 'load' ||
                        (readyRegExp.test((evt.currentTarget || evt.srcElement).readyState))) {
                    //Reset interactive script so a script node is not held onto for
                    //to long.
                    interactiveScript = null;

                    //Pull out the name of the module and the context.
                    var data = getScriptData(evt);
                    context.completeLoad(data.id);
                }
            },

            /**
             * Callback for script errors.
             */
            onScriptError: function (evt) {
                var data = getScriptData(evt);
                if (!hasPathFallback(data.id)) {
                    return onError(makeError('scripterror', 'Script error for: ' + data.id, evt, [data.id]));
                }
            }
        };

        context.require = context.makeRequire();
        return context;
    }

    /**
     * Main entry point.
     *
     * If the only argument to require is a string, then the module that
     * is represented by that string is fetched for the appropriate context.
     *
     * If the first argument is an array, then it will be treated as an array
     * of dependency string names to fetch. An optional function callback can
     * be specified to execute when all of those dependencies are available.
     *
     * Make a local req variable to help Caja compliance (it assumes things
     * on a require that are not standardized), and to give a short
     * name for minification/local scope use.
     */
    req = requirejs = function (deps, callback, errback, optional) {

        //Find the right context, use default
        var context, config,
            contextName = defContextName;

        // Determine if have config object in the call.
        if (!isArray(deps) && typeof deps !== 'string') {
            // deps is a config object
            config = deps;
            if (isArray(callback)) {
                // Adjust args if there are dependencies
                deps = callback;
                callback = errback;
                errback = optional;
            } else {
                deps = [];
            }
        }

        if (config && config.context) {
            contextName = config.context;
        }

        context = getOwn(contexts, contextName);
        if (!context) {
            context = contexts[contextName] = req.s.newContext(contextName);
        }

        if (config) {
            context.configure(config);
        }

        return context.require(deps, callback, errback);
    };

    /**
     * Support require.config() to make it easier to cooperate with other
     * AMD loaders on globally agreed names.
     */
    req.config = function (config) {
        return req(config);
    };

    /**
     * Execute something after the current tick
     * of the event loop. Override for other envs
     * that have a better solution than setTimeout.
     * @param  {Function} fn function to execute later.
     */
    req.nextTick = typeof setTimeout !== 'undefined' ? function (fn) {
        setTimeout(fn, 4);
    } : function (fn) { fn(); };

    /**
     * Export require as a global, but only if it does not already exist.
     */
    if (!require) {
        require = req;
    }

    req.version = version;

    //Used to filter out dependencies that are already paths.
    req.jsExtRegExp = /^\/|:|\?|\.js$/;
    req.isBrowser = isBrowser;
    s = req.s = {
        contexts: contexts,
        newContext: newContext
    };

    //Create default context.
    req({});

    //Exports some context-sensitive methods on global require.
    each([
        'toUrl',
        'undef',
        'defined',
        'specified'
    ], function (prop) {
        //Reference from contexts instead of early binding to default context,
        //so that during builds, the latest instance of the default context
        //with its config gets used.
        req[prop] = function () {
            var ctx = contexts[defContextName];
            return ctx.require[prop].apply(ctx, arguments);
        };
    });

    if (isBrowser) {
        head = s.head = document.getElementsByTagName('head')[0];
        //If BASE tag is in play, using appendChild is a problem for IE6.
        //When that browser dies, this can be removed. Details in this jQuery bug:
        //http://dev.jquery.com/ticket/2709
        baseElement = document.getElementsByTagName('base')[0];
        if (baseElement) {
            head = s.head = baseElement.parentNode;
        }
    }

    /**
     * Any errors that require explicitly generates will be passed to this
     * function. Intercept/override it if you want custom error handling.
     * @param {Error} err the error object.
     */
    req.onError = defaultOnError;

    /**
     * Creates the node for the load command. Only used in browser envs.
     */
    req.createNode = function (config, moduleName, url) {
        var node = config.xhtml ?
                document.createElementNS('http://www.w3.org/1999/xhtml', 'html:script') :
                document.createElement('script');
        node.type = config.scriptType || 'text/javascript';
        node.charset = 'utf-8';
        node.async = true;
        return node;
    };

    /**
     * Does the request to load a module for the browser case.
     * Make this a separate function to allow other environments
     * to override it.
     *
     * @param {Object} context the require context to find state.
     * @param {String} moduleName the name of the module.
     * @param {Object} url the URL to the module.
     */
    req.load = function (context, moduleName, url) {
        var config = (context && context.config) || {},
            node;
        if (isBrowser) {
            //In the browser so use a script tag
            node = req.createNode(config, moduleName, url);
            if (config.onNodeCreated) {
                config.onNodeCreated(node, config, moduleName, url);
            }

            node.setAttribute('data-requirecontext', context.contextName);
            node.setAttribute('data-requiremodule', moduleName);

            //Set up load listener. Test attachEvent first because IE9 has
            //a subtle issue in its addEventListener and script onload firings
            //that do not match the behavior of all other browsers with
            //addEventListener support, which fire the onload event for a
            //script right after the script execution. See:
            //https://connect.microsoft.com/IE/feedback/details/648057/script-onload-event-is-not-fired-immediately-after-script-execution
            //UNFORTUNATELY Opera implements attachEvent but does not follow the script
            //script execution mode.
            if (node.attachEvent &&
                    //Check if node.attachEvent is artificially added by custom script or
                    //natively supported by browser
                    //read https://github.com/jrburke/requirejs/issues/187
                    //if we can NOT find [native code] then it must NOT natively supported.
                    //in IE8, node.attachEvent does not have toString()
                    //Note the test for "[native code" with no closing brace, see:
                    //https://github.com/jrburke/requirejs/issues/273
                    !(node.attachEvent.toString && node.attachEvent.toString().indexOf('[native code') < 0) &&
                    !isOpera) {
                //Probably IE. IE (at least 6-8) do not fire
                //script onload right after executing the script, so
                //we cannot tie the anonymous define call to a name.
                //However, IE reports the script as being in 'interactive'
                //readyState at the time of the define call.
                useInteractive = true;

                node.attachEvent('onreadystatechange', context.onScriptLoad);
                //It would be great to add an error handler here to catch
                //404s in IE9+. However, onreadystatechange will fire before
                //the error handler, so that does not help. If addEventListener
                //is used, then IE will fire error before load, but we cannot
                //use that pathway given the connect.microsoft.com issue
                //mentioned above about not doing the 'script execute,
                //then fire the script load event listener before execute
                //next script' that other browsers do.
                //Best hope: IE10 fixes the issues,
                //and then destroys all installs of IE 6-9.
                //node.attachEvent('onerror', context.onScriptError);
            } else {
                node.addEventListener('load', context.onScriptLoad, false);
                node.addEventListener('error', context.onScriptError, false);
            }
            node.src = url;

            //For some cache cases in IE 6-8, the script executes before the end
            //of the appendChild execution, so to tie an anonymous define
            //call to the module name (which is stored on the node), hold on
            //to a reference to this node, but clear after the DOM insertion.
            currentlyAddingScript = node;
            if (baseElement) {
                head.insertBefore(node, baseElement);
            } else {
                head.appendChild(node);
            }
            currentlyAddingScript = null;

            return node;
        } else if (isWebWorker) {
            try {
                //In a web worker, use importScripts. This is not a very
                //efficient use of importScripts, importScripts will block until
                //its script is downloaded and evaluated. However, if web workers
                //are in play, the expectation that a build has been done so that
                //only one script needs to be loaded anyway. This may need to be
                //reevaluated if other use cases become common.
                importScripts(url);

                //Account for anonymous modules
                context.completeLoad(moduleName);
            } catch (e) {
                context.onError(makeError('importscripts',
                                'importScripts failed for ' +
                                    moduleName + ' at ' + url,
                                e,
                                [moduleName]));
            }
        }
    };

    function getInteractiveScript() {
        if (interactiveScript && interactiveScript.readyState === 'interactive') {
            return interactiveScript;
        }

        eachReverse(scripts(), function (script) {
            if (script.readyState === 'interactive') {
                return (interactiveScript = script);
            }
        });
        return interactiveScript;
    }

    //Look for a data-main script attribute, which could also adjust the baseUrl.
    if (isBrowser && !cfg.skipDataMain) {
        //Figure out baseUrl. Get it from the script tag with require.js in it.
        eachReverse(scripts(), function (script) {
            //Set the 'head' where we can append children by
            //using the script's parent.
            if (!head) {
                head = script.parentNode;
            }

            //Look for a data-main attribute to set main script for the page
            //to load. If it is there, the path to data main becomes the
            //baseUrl, if it is not already set.
            dataMain = script.getAttribute('data-main');
            if (dataMain) {
                //Preserve dataMain in case it is a path (i.e. contains '?')
                mainScript = dataMain;

                //Set final baseUrl if there is not already an explicit one.
                if (!cfg.baseUrl) {
                    //Pull off the directory of data-main for use as the
                    //baseUrl.
                    src = mainScript.split('/');
                    mainScript = src.pop();
                    subPath = src.length ? src.join('/')  + '/' : './';

                    cfg.baseUrl = subPath;
                }

                //Strip off any trailing .js since mainScript is now
                //like a module name.
                mainScript = mainScript.replace(jsSuffixRegExp, '');

                //If mainScript is still a path, fall back to dataMain
                if (req.jsExtRegExp.test(mainScript)) {
                    mainScript = dataMain;
                }

                //Put the data-main script in the files to load.
                cfg.deps = cfg.deps ? cfg.deps.concat(mainScript) : [mainScript];

                return true;
            }
        });
    }

    /**
     * The function that handles definitions of modules. Differs from
     * require() in that a string for the module should be the first argument,
     * and the function to execute after dependencies are loaded should
     * return a value to define the module corresponding to the first argument's
     * name.
     */
    define = function (name, deps, callback) {
        var node, context;

        //Allow for anonymous modules
        if (typeof name !== 'string') {
            //Adjust args appropriately
            callback = deps;
            deps = name;
            name = null;
        }

        //This module may not have dependencies
        if (!isArray(deps)) {
            callback = deps;
            deps = null;
        }

        //If no name, and callback is a function, then figure out if it a
        //CommonJS thing with dependencies.
        if (!deps && isFunction(callback)) {
            deps = [];
            //Remove comments from the callback string,
            //look for require calls, and pull them into the dependencies,
            //but only if there are function args.
            if (callback.length) {
                callback
                    .toString()
                    .replace(commentRegExp, '')
                    .replace(cjsRequireRegExp, function (match, dep) {
                        deps.push(dep);
                    });

                //May be a CommonJS thing even without require calls, but still
                //could use exports, and module. Avoid doing exports and module
                //work though if it just needs require.
                //REQUIRES the function to expect the CommonJS variables in the
                //order listed below.
                deps = (callback.length === 1 ? ['require'] : ['require', 'exports', 'module']).concat(deps);
            }
        }

        //If in IE 6-8 and hit an anonymous define() call, do the interactive
        //work.
        if (useInteractive) {
            node = currentlyAddingScript || getInteractiveScript();
            if (node) {
                if (!name) {
                    name = node.getAttribute('data-requiremodule');
                }
                context = contexts[node.getAttribute('data-requirecontext')];
            }
        }

        //Always save off evaluating the def call until the script onload handler.
        //This allows multiple modules to be in a file without prematurely
        //tracing dependencies, and allows for anonymous module support,
        //where the module name is not known until the script onload event
        //occurs. If no context, use the global queue, and get it processed
        //in the onscript load callback.
        if (context) {
            context.defQueue.push([name, deps, callback]);
            context.defQueueMap[name] = true;
        } else {
            globalDefQueue.push([name, deps, callback]);
        }
    };

    define.amd = {
        jQuery: true
    };

    /**
     * Executes the text. Normally just uses eval, but can be modified
     * to use a better, environment-specific call. Only used for transpiling
     * loader plugins, not for plain JS modules.
     * @param {String} text the text to execute/evaluate.
     */
    req.exec = function (text) {
        /*jslint evil: true */
        return eval(text);
    };

    //Set up with config info.
    req(cfg);
}(this));

define("node_modules/requirejs/require.js", function(){});

/*!
 * Knockout JavaScript library v3.3.0
 * (c) Steven Sanderson - http://knockoutjs.com/
 * License: MIT (http://www.opensource.org/licenses/mit-license.php)
 */

(function() {(function(p){var y=this||(0,eval)("this"),w=y.document,M=y.navigator,u=y.jQuery,E=y.JSON;(function(p){"function"===typeof define&&define.amd?define('modules/knockout/build/output/knockout-latest',["exports","require"],p):"function"===typeof require&&"object"===typeof exports&&"object"===typeof module?p(module.exports||exports):p(y.ko={})})(function(N,O){function J(a,d){return null===a||typeof a in Q?a===d:!1}function R(a,d){var c;return function(){c||(c=setTimeout(function(){c=p;a()},d))}}function S(a,d){var c;return function(){clearTimeout(c);
c=setTimeout(a,d)}}function K(b,d,c,e){a.d[b]={init:function(b,k,h,l,g){var m,x;a.w(function(){var q=a.a.c(k()),n=!c!==!q,r=!x;if(r||d||n!==m)r&&a.Z.oa()&&(x=a.a.la(a.e.childNodes(b),!0)),n?(r||a.e.T(b,a.a.la(x)),a.Ja(e?e(g,q):g,b)):a.e.ma(b),m=n},null,{q:b});return{controlsDescendantBindings:!0}}};a.h.ka[b]=!1;a.e.R[b]=!0}var a="undefined"!==typeof N?N:{};a.b=function(b,d){for(var c=b.split("."),e=a,f=0;f<c.length-1;f++)e=e[c[f]];e[c[c.length-1]]=d};a.D=function(a,d,c){a[d]=c};a.version="3.3.0";
a.b("version",a.version);a.a=function(){function b(a,b){for(var c in a)a.hasOwnProperty(c)&&b(c,a[c])}function d(a,b){if(b)for(var c in b)b.hasOwnProperty(c)&&(a[c]=b[c]);return a}function c(a,b){a.__proto__=b;return a}function e(b,c,g,d){var e=b[c].match(m)||[];a.a.o(g.match(m),function(b){a.a.ga(e,b,d)});b[c]=e.join(" ")}var f={__proto__:[]}instanceof Array,k={},h={};k[M&&/Firefox\/2/i.test(M.userAgent)?"KeyboardEvent":"UIEvents"]=["keyup","keydown","keypress"];k.MouseEvents="click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave".split(" ");
b(k,function(a,b){if(b.length)for(var c=0,g=b.length;c<g;c++)h[b[c]]=a});var l={propertychange:!0},g=w&&function(){for(var a=3,b=w.createElement("div"),c=b.getElementsByTagName("i");b.innerHTML="\x3c!--[if gt IE "+ ++a+"]><i></i><![endif]--\x3e",c[0];);return 4<a?a:p}(),m=/\S+/g;return{Bb:["authenticity_token",/^__RequestVerificationToken(_.*)?$/],o:function(a,b){for(var c=0,g=a.length;c<g;c++)b(a[c],c)},m:function(a,b){if("function"==typeof Array.prototype.indexOf)return Array.prototype.indexOf.call(a,
b);for(var c=0,g=a.length;c<g;c++)if(a[c]===b)return c;return-1},vb:function(a,b,c){for(var g=0,d=a.length;g<d;g++)if(b.call(c,a[g],g))return a[g];return null},ya:function(b,c){var g=a.a.m(b,c);0<g?b.splice(g,1):0===g&&b.shift()},wb:function(b){b=b||[];for(var c=[],g=0,d=b.length;g<d;g++)0>a.a.m(c,b[g])&&c.push(b[g]);return c},Ka:function(a,b){a=a||[];for(var c=[],g=0,d=a.length;g<d;g++)c.push(b(a[g],g));return c},xa:function(a,b){a=a||[];for(var c=[],g=0,d=a.length;g<d;g++)b(a[g],g)&&c.push(a[g]);
return c},ia:function(a,b){if(b instanceof Array)a.push.apply(a,b);else for(var c=0,g=b.length;c<g;c++)a.push(b[c]);return a},ga:function(b,c,g){var d=a.a.m(a.a.cb(b),c);0>d?g&&b.push(c):g||b.splice(d,1)},za:f,extend:d,Fa:c,Ga:f?c:d,A:b,pa:function(a,b){if(!a)return a;var c={},g;for(g in a)a.hasOwnProperty(g)&&(c[g]=b(a[g],g,a));return c},Ra:function(b){for(;b.firstChild;)a.removeNode(b.firstChild)},Jb:function(b){b=a.a.O(b);for(var c=(b[0]&&b[0].ownerDocument||w).createElement("div"),g=0,d=b.length;g<
d;g++)c.appendChild(a.S(b[g]));return c},la:function(b,c){for(var g=0,d=b.length,e=[];g<d;g++){var m=b[g].cloneNode(!0);e.push(c?a.S(m):m)}return e},T:function(b,c){a.a.Ra(b);if(c)for(var g=0,d=c.length;g<d;g++)b.appendChild(c[g])},Qb:function(b,c){var g=b.nodeType?[b]:b;if(0<g.length){for(var d=g[0],e=d.parentNode,m=0,f=c.length;m<f;m++)e.insertBefore(c[m],d);m=0;for(f=g.length;m<f;m++)a.removeNode(g[m])}},na:function(a,b){if(a.length){for(b=8===b.nodeType&&b.parentNode||b;a.length&&a[0].parentNode!==
b;)a.splice(0,1);if(1<a.length){var c=a[0],g=a[a.length-1];for(a.length=0;c!==g;)if(a.push(c),c=c.nextSibling,!c)return;a.push(g)}}return a},Sb:function(a,b){7>g?a.setAttribute("selected",b):a.selected=b},ib:function(a){return null===a||a===p?"":a.trim?a.trim():a.toString().replace(/^[\s\xa0]+|[\s\xa0]+$/g,"")},Dc:function(a,b){a=a||"";return b.length>a.length?!1:a.substring(0,b.length)===b},jc:function(a,b){if(a===b)return!0;if(11===a.nodeType)return!1;if(b.contains)return b.contains(3===a.nodeType?
a.parentNode:a);if(b.compareDocumentPosition)return 16==(b.compareDocumentPosition(a)&16);for(;a&&a!=b;)a=a.parentNode;return!!a},Qa:function(b){return a.a.jc(b,b.ownerDocument.documentElement)},tb:function(b){return!!a.a.vb(b,a.a.Qa)},v:function(a){return a&&a.tagName&&a.tagName.toLowerCase()},n:function(b,c,d){var m=g&&l[c];if(!m&&u)u(b).bind(c,d);else if(m||"function"!=typeof b.addEventListener)if("undefined"!=typeof b.attachEvent){var e=function(a){d.call(b,a)},f="on"+c;b.attachEvent(f,e);a.a.C.fa(b,
function(){b.detachEvent(f,e)})}else throw Error("Browser doesn't support addEventListener or attachEvent");else b.addEventListener(c,d,!1)},qa:function(b,c){if(!b||!b.nodeType)throw Error("element must be a DOM node when calling triggerEvent");var g;"input"===a.a.v(b)&&b.type&&"click"==c.toLowerCase()?(g=b.type,g="checkbox"==g||"radio"==g):g=!1;if(u&&!g)u(b).trigger(c);else if("function"==typeof w.createEvent)if("function"==typeof b.dispatchEvent)g=w.createEvent(h[c]||"HTMLEvents"),g.initEvent(c,
!0,!0,y,0,0,0,0,0,!1,!1,!1,!1,0,b),b.dispatchEvent(g);else throw Error("The supplied element doesn't support dispatchEvent");else if(g&&b.click)b.click();else if("undefined"!=typeof b.fireEvent)b.fireEvent("on"+c);else throw Error("Browser doesn't support triggering events");},c:function(b){return a.F(b)?b():b},cb:function(b){return a.F(b)?b.B():b},Ia:function(b,c,g){var d;c&&("object"===typeof b.classList?(d=b.classList[g?"add":"remove"],a.a.o(c.match(m),function(a){d.call(b.classList,a)})):"string"===
typeof b.className.baseVal?e(b.className,"baseVal",c,g):e(b,"className",c,g))},Ha:function(b,c){var g=a.a.c(c);if(null===g||g===p)g="";var d=a.e.firstChild(b);!d||3!=d.nodeType||a.e.nextSibling(d)?a.e.T(b,[b.ownerDocument.createTextNode(g)]):d.data=g;a.a.mc(b)},Rb:function(a,b){a.name=b;if(7>=g)try{a.mergeAttributes(w.createElement("<input name='"+a.name+"'/>"),!1)}catch(c){}},mc:function(a){9<=g&&(a=1==a.nodeType?a:a.parentNode,a.style&&(a.style.zoom=a.style.zoom))},kc:function(a){if(g){var b=a.style.width;
a.style.width=0;a.style.width=b}},Bc:function(b,c){b=a.a.c(b);c=a.a.c(c);for(var g=[],d=b;d<=c;d++)g.push(d);return g},O:function(a){for(var b=[],c=0,g=a.length;c<g;c++)b.push(a[c]);return b},Hc:6===g,Ic:7===g,M:g,Db:function(b,c){for(var g=a.a.O(b.getElementsByTagName("input")).concat(a.a.O(b.getElementsByTagName("textarea"))),d="string"==typeof c?function(a){return a.name===c}:function(a){return c.test(a.name)},m=[],e=g.length-1;0<=e;e--)d(g[e])&&m.push(g[e]);return m},yc:function(b){return"string"==
typeof b&&(b=a.a.ib(b))?E&&E.parse?E.parse(b):(new Function("return "+b))():null},jb:function(b,c,g){if(!E||!E.stringify)throw Error("Cannot find JSON.stringify(). Some browsers (e.g., IE < 8) don't support it natively, but you can overcome this by adding a script reference to json2.js, downloadable from http://www.json.org/json2.js");return E.stringify(a.a.c(b),c,g)},zc:function(c,g,d){d=d||{};var m=d.params||{},e=d.includeFields||this.Bb,f=c;if("object"==typeof c&&"form"===a.a.v(c))for(var f=c.action,
l=e.length-1;0<=l;l--)for(var k=a.a.Db(c,e[l]),h=k.length-1;0<=h;h--)m[k[h].name]=k[h].value;g=a.a.c(g);var s=w.createElement("form");s.style.display="none";s.action=f;s.method="post";for(var p in g)c=w.createElement("input"),c.type="hidden",c.name=p,c.value=a.a.jb(a.a.c(g[p])),s.appendChild(c);b(m,function(a,b){var c=w.createElement("input");c.type="hidden";c.name=a;c.value=b;s.appendChild(c)});w.body.appendChild(s);d.submitter?d.submitter(s):s.submit();setTimeout(function(){s.parentNode.removeChild(s)},
0)}}}();a.b("utils",a.a);a.b("utils.arrayForEach",a.a.o);a.b("utils.arrayFirst",a.a.vb);a.b("utils.arrayFilter",a.a.xa);a.b("utils.arrayGetDistinctValues",a.a.wb);a.b("utils.arrayIndexOf",a.a.m);a.b("utils.arrayMap",a.a.Ka);a.b("utils.arrayPushAll",a.a.ia);a.b("utils.arrayRemoveItem",a.a.ya);a.b("utils.extend",a.a.extend);a.b("utils.fieldsIncludedWithJsonPost",a.a.Bb);a.b("utils.getFormFields",a.a.Db);a.b("utils.peekObservable",a.a.cb);a.b("utils.postJson",a.a.zc);a.b("utils.parseJson",a.a.yc);a.b("utils.registerEventHandler",
a.a.n);a.b("utils.stringifyJson",a.a.jb);a.b("utils.range",a.a.Bc);a.b("utils.toggleDomNodeCssClass",a.a.Ia);a.b("utils.triggerEvent",a.a.qa);a.b("utils.unwrapObservable",a.a.c);a.b("utils.objectForEach",a.a.A);a.b("utils.addOrRemoveItem",a.a.ga);a.b("utils.setTextContent",a.a.Ha);a.b("unwrap",a.a.c);Function.prototype.bind||(Function.prototype.bind=function(a){var d=this;if(1===arguments.length)return function(){return d.apply(a,arguments)};var c=Array.prototype.slice.call(arguments,1);return function(){var e=
c.slice(0);e.push.apply(e,arguments);return d.apply(a,e)}});a.a.f=new function(){function a(b,k){var h=b[c];if(!h||"null"===h||!e[h]){if(!k)return p;h=b[c]="ko"+d++;e[h]={}}return e[h]}var d=0,c="__ko__"+(new Date).getTime(),e={};return{get:function(c,d){var e=a(c,!1);return e===p?p:e[d]},set:function(c,d,e){if(e!==p||a(c,!1)!==p)a(c,!0)[d]=e},clear:function(a){var b=a[c];return b?(delete e[b],a[c]=null,!0):!1},I:function(){return d++ +c}}};a.b("utils.domData",a.a.f);a.b("utils.domData.clear",a.a.f.clear);
a.a.C=new function(){function b(b,d){var e=a.a.f.get(b,c);e===p&&d&&(e=[],a.a.f.set(b,c,e));return e}function d(c){var e=b(c,!1);if(e)for(var e=e.slice(0),l=0;l<e.length;l++)e[l](c);a.a.f.clear(c);a.a.C.cleanExternalData(c);if(f[c.nodeType])for(e=c.firstChild;c=e;)e=c.nextSibling,8===c.nodeType&&d(c)}var c=a.a.f.I(),e={1:!0,8:!0,9:!0},f={1:!0,9:!0};return{fa:function(a,c){if("function"!=typeof c)throw Error("Callback must be a function");b(a,!0).push(c)},Pb:function(d,e){var f=b(d,!1);f&&(a.a.ya(f,
e),0==f.length&&a.a.f.set(d,c,p))},S:function(b){if(e[b.nodeType]&&(d(b),f[b.nodeType])){var c=[];a.a.ia(c,b.getElementsByTagName("*"));for(var l=0,g=c.length;l<g;l++)d(c[l])}return b},removeNode:function(b){a.S(b);b.parentNode&&b.parentNode.removeChild(b)},cleanExternalData:function(a){u&&"function"==typeof u.cleanData&&u.cleanData([a])}}};a.S=a.a.C.S;a.removeNode=a.a.C.removeNode;a.b("cleanNode",a.S);a.b("removeNode",a.removeNode);a.b("utils.domNodeDisposal",a.a.C);a.b("utils.domNodeDisposal.addDisposeCallback",
a.a.C.fa);a.b("utils.domNodeDisposal.removeDisposeCallback",a.a.C.Pb);(function(){a.a.ca=function(b,d){var c;if(u)if(u.parseHTML)c=u.parseHTML(b,d)||[];else{if((c=u.clean([b],d))&&c[0]){for(var e=c[0];e.parentNode&&11!==e.parentNode.nodeType;)e=e.parentNode;e.parentNode&&e.parentNode.removeChild(e)}}else{(e=d)||(e=w);c=e.parentWindow||e.defaultView||y;var f=a.a.ib(b).toLowerCase(),e=e.createElement("div"),f=f.match(/^<(thead|tbody|tfoot)/)&&[1,"<table>","</table>"]||!f.indexOf("<tr")&&[2,"<table><tbody>",
"</tbody></table>"]||(!f.indexOf("<td")||!f.indexOf("<th"))&&[3,"<table><tbody><tr>","</tr></tbody></table>"]||[0,"",""],k="ignored<div>"+f[1]+b+f[2]+"</div>";for("function"==typeof c.innerShiv?e.appendChild(c.innerShiv(k)):e.innerHTML=k;f[0]--;)e=e.lastChild;c=a.a.O(e.lastChild.childNodes)}return c};a.a.gb=function(b,d){a.a.Ra(b);d=a.a.c(d);if(null!==d&&d!==p)if("string"!=typeof d&&(d=d.toString()),u)u(b).html(d);else for(var c=a.a.ca(d,b.ownerDocument),e=0;e<c.length;e++)b.appendChild(c[e])}})();
a.b("utils.parseHtmlFragment",a.a.ca);a.b("utils.setHtml",a.a.gb);a.H=function(){function b(c,d){if(c)if(8==c.nodeType){var f=a.H.Lb(c.nodeValue);null!=f&&d.push({ic:c,wc:f})}else if(1==c.nodeType)for(var f=0,k=c.childNodes,h=k.length;f<h;f++)b(k[f],d)}var d={};return{$a:function(a){if("function"!=typeof a)throw Error("You can only pass a function to ko.memoization.memoize()");var b=(4294967296*(1+Math.random())|0).toString(16).substring(1)+(4294967296*(1+Math.random())|0).toString(16).substring(1);
d[b]=a;return"\x3c!--[ko_memo:"+b+"]--\x3e"},Wb:function(a,b){var f=d[a];if(f===p)throw Error("Couldn't find any memo with ID "+a+". Perhaps it's already been unmemoized.");try{return f.apply(null,b||[]),!0}finally{delete d[a]}},Xb:function(c,d){var f=[];b(c,f);for(var k=0,h=f.length;k<h;k++){var l=f[k].ic,g=[l];d&&a.a.ia(g,d);a.H.Wb(f[k].wc,g);l.nodeValue="";l.parentNode&&l.parentNode.removeChild(l)}},Lb:function(a){return(a=a.match(/^\[ko_memo\:(.*?)\]$/))?a[1]:null}}}();a.b("memoization",a.H);
a.b("memoization.memoize",a.H.$a);a.b("memoization.unmemoize",a.H.Wb);a.b("memoization.parseMemoText",a.H.Lb);a.b("memoization.unmemoizeDomNodeAndDescendants",a.H.Xb);a.Sa={throttle:function(b,d){b.throttleEvaluation=d;var c=null;return a.j({read:b,write:function(a){clearTimeout(c);c=setTimeout(function(){b(a)},d)}})},rateLimit:function(a,d){var c,e,f;"number"==typeof d?c=d:(c=d.timeout,e=d.method);f="notifyWhenChangesStop"==e?S:R;a.Za(function(a){return f(a,c)})},notify:function(a,d){a.equalityComparer=
"always"==d?null:J}};var Q={undefined:1,"boolean":1,number:1,string:1};a.b("extenders",a.Sa);a.Ub=function(b,d,c){this.da=b;this.La=d;this.hc=c;this.Gb=!1;a.D(this,"dispose",this.p)};a.Ub.prototype.p=function(){this.Gb=!0;this.hc()};a.Q=function(){a.a.Ga(this,a.Q.fn);this.G={};this.rb=1};var z={U:function(b,d,c){var e=this;c=c||"change";var f=new a.Ub(e,d?b.bind(d):b,function(){a.a.ya(e.G[c],f);e.ua&&e.ua(c)});e.ja&&e.ja(c);e.G[c]||(e.G[c]=[]);e.G[c].push(f);return f},notifySubscribers:function(b,
d){d=d||"change";"change"===d&&this.Yb();if(this.Ba(d))try{a.k.xb();for(var c=this.G[d].slice(0),e=0,f;f=c[e];++e)f.Gb||f.La(b)}finally{a.k.end()}},Aa:function(){return this.rb},pc:function(a){return this.Aa()!==a},Yb:function(){++this.rb},Za:function(b){var d=this,c=a.F(d),e,f,k;d.ta||(d.ta=d.notifySubscribers,d.notifySubscribers=function(a,b){b&&"change"!==b?"beforeChange"===b?d.pb(a):d.ta(a,b):d.qb(a)});var h=b(function(){c&&k===d&&(k=d());e=!1;d.Wa(f,k)&&d.ta(f=k)});d.qb=function(a){e=!0;k=a;
h()};d.pb=function(a){e||(f=a,d.ta(a,"beforeChange"))}},Ba:function(a){return this.G[a]&&this.G[a].length},nc:function(b){if(b)return this.G[b]&&this.G[b].length||0;var d=0;a.a.A(this.G,function(a,b){d+=b.length});return d},Wa:function(a,d){return!this.equalityComparer||!this.equalityComparer(a,d)},extend:function(b){var d=this;b&&a.a.A(b,function(b,e){var f=a.Sa[b];"function"==typeof f&&(d=f(d,e)||d)});return d}};a.D(z,"subscribe",z.U);a.D(z,"extend",z.extend);a.D(z,"getSubscriptionsCount",z.nc);
a.a.za&&a.a.Fa(z,Function.prototype);a.Q.fn=z;a.Hb=function(a){return null!=a&&"function"==typeof a.U&&"function"==typeof a.notifySubscribers};a.b("subscribable",a.Q);a.b("isSubscribable",a.Hb);a.Z=a.k=function(){function b(a){c.push(e);e=a}function d(){e=c.pop()}var c=[],e,f=0;return{xb:b,end:d,Ob:function(b){if(e){if(!a.Hb(b))throw Error("Only subscribable things can act as dependencies");e.La(b,b.ac||(b.ac=++f))}},u:function(a,c,e){try{return b(),a.apply(c,e||[])}finally{d()}},oa:function(){if(e)return e.w.oa()},
Ca:function(){if(e)return e.Ca}}}();a.b("computedContext",a.Z);a.b("computedContext.getDependenciesCount",a.Z.oa);a.b("computedContext.isInitial",a.Z.Ca);a.b("computedContext.isSleeping",a.Z.Jc);a.b("ignoreDependencies",a.Gc=a.k.u);a.r=function(b){function d(){if(0<arguments.length)return d.Wa(c,arguments[0])&&(d.X(),c=arguments[0],d.W()),this;a.k.Ob(d);return c}var c=b;a.Q.call(d);a.a.Ga(d,a.r.fn);d.B=function(){return c};d.W=function(){d.notifySubscribers(c)};d.X=function(){d.notifySubscribers(c,
"beforeChange")};a.D(d,"peek",d.B);a.D(d,"valueHasMutated",d.W);a.D(d,"valueWillMutate",d.X);return d};a.r.fn={equalityComparer:J};var H=a.r.Ac="__ko_proto__";a.r.fn[H]=a.r;a.a.za&&a.a.Fa(a.r.fn,a.Q.fn);a.Ta=function(b,d){return null===b||b===p||b[H]===p?!1:b[H]===d?!0:a.Ta(b[H],d)};a.F=function(b){return a.Ta(b,a.r)};a.Da=function(b){return"function"==typeof b&&b[H]===a.r||"function"==typeof b&&b[H]===a.j&&b.qc?!0:!1};a.b("observable",a.r);a.b("isObservable",a.F);a.b("isWriteableObservable",a.Da);
a.b("isWritableObservable",a.Da);a.ba=function(b){b=b||[];if("object"!=typeof b||!("length"in b))throw Error("The argument passed when initializing an observable array must be an array, or null, or undefined.");b=a.r(b);a.a.Ga(b,a.ba.fn);return b.extend({trackArrayChanges:!0})};a.ba.fn={remove:function(b){for(var d=this.B(),c=[],e="function"!=typeof b||a.F(b)?function(a){return a===b}:b,f=0;f<d.length;f++){var k=d[f];e(k)&&(0===c.length&&this.X(),c.push(k),d.splice(f,1),f--)}c.length&&this.W();return c},
removeAll:function(b){if(b===p){var d=this.B(),c=d.slice(0);this.X();d.splice(0,d.length);this.W();return c}return b?this.remove(function(c){return 0<=a.a.m(b,c)}):[]},destroy:function(b){var d=this.B(),c="function"!=typeof b||a.F(b)?function(a){return a===b}:b;this.X();for(var e=d.length-1;0<=e;e--)c(d[e])&&(d[e]._destroy=!0);this.W()},destroyAll:function(b){return b===p?this.destroy(function(){return!0}):b?this.destroy(function(d){return 0<=a.a.m(b,d)}):[]},indexOf:function(b){var d=this();return a.a.m(d,
b)},replace:function(a,d){var c=this.indexOf(a);0<=c&&(this.X(),this.B()[c]=d,this.W())}};a.a.o("pop push reverse shift sort splice unshift".split(" "),function(b){a.ba.fn[b]=function(){var a=this.B();this.X();this.yb(a,b,arguments);a=a[b].apply(a,arguments);this.W();return a}});a.a.o(["slice"],function(b){a.ba.fn[b]=function(){var a=this();return a[b].apply(a,arguments)}});a.a.za&&a.a.Fa(a.ba.fn,a.r.fn);a.b("observableArray",a.ba);a.Sa.trackArrayChanges=function(b){function d(){if(!c){c=!0;var g=
b.notifySubscribers;b.notifySubscribers=function(a,b){b&&"change"!==b||++k;return g.apply(this,arguments)};var d=[].concat(b.B()||[]);e=null;f=b.U(function(c){c=[].concat(c||[]);if(b.Ba("arrayChange")){var g;if(!e||1<k)e=a.a.Ma(d,c,{sparse:!0});g=e}d=c;e=null;k=0;g&&g.length&&b.notifySubscribers(g,"arrayChange")})}}if(!b.yb){var c=!1,e=null,f,k=0,h=b.ja,l=b.ua;b.ja=function(a){h&&h.call(b,a);"arrayChange"===a&&d()};b.ua=function(a){l&&l.call(b,a);"arrayChange"!==a||b.Ba("arrayChange")||(f.p(),c=!1)};
b.yb=function(b,d,f){function l(a,b,c){return h[h.length]={status:a,value:b,index:c}}if(c&&!k){var h=[],r=b.length,v=f.length,t=0;switch(d){case "push":t=r;case "unshift":for(d=0;d<v;d++)l("added",f[d],t+d);break;case "pop":t=r-1;case "shift":r&&l("deleted",b[t],t);break;case "splice":d=Math.min(Math.max(0,0>f[0]?r+f[0]:f[0]),r);for(var r=1===v?r:Math.min(d+(f[1]||0),r),v=d+v-2,t=Math.max(r,v),G=[],A=[],p=2;d<t;++d,++p)d<r&&A.push(l("deleted",b[d],d)),d<v&&G.push(l("added",f[p],d));a.a.Cb(A,G);break;
default:return}e=h}}}};a.w=a.j=function(b,d,c){function e(a,b,c){if(I&&b===g)throw Error("A 'pure' computed must not be called recursively");B[a]=c;c.sa=F++;c.ea=b.Aa()}function f(){var a,b;for(a in B)if(B.hasOwnProperty(a)&&(b=B[a],b.da.pc(b.ea)))return!0}function k(){!s&&B&&a.a.A(B,function(a,b){b.p&&b.p()});B=null;F=0;G=!0;s=r=!1}function h(){var a=g.throttleEvaluation;a&&0<=a?(clearTimeout(z),z=setTimeout(function(){l(!0)},a)):g.nb?g.nb():l(!0)}function l(b){if(!v&&!G){if(y&&y()){if(!t){w();return}}else t=
!1;v=!0;try{var c=B,m=F,f=I?p:!F;a.k.xb({La:function(a,b){G||(m&&c[b]?(e(b,a,c[b]),delete c[b],--m):B[b]||e(b,a,s?{da:a}:a.U(h)))},w:g,Ca:f});B={};F=0;try{var l=d?A.call(d):A()}finally{a.k.end(),m&&!s&&a.a.A(c,function(a,b){b.p&&b.p()}),r=!1}g.Wa(n,l)&&(s||q(n,"beforeChange"),n=l,s?g.Yb():b&&q(n));f&&q(n,"awake")}finally{v=!1}F||w()}}function g(){if(0<arguments.length){if("function"===typeof C)C.apply(d,arguments);else throw Error("Cannot write a value to a ko.computed unless you specify a 'write' option. If you wish to read the current value, don't pass any parameters.");
return this}a.k.Ob(g);(r||s&&f())&&l();return n}function m(){(r&&!F||s&&f())&&l();return n}function x(){return r||0<F}function q(a,b){g.notifySubscribers(a,b)}var n,r=!0,v=!1,t=!1,G=!1,A=b,I=!1,s=!1;A&&"object"==typeof A?(c=A,A=c.read):(c=c||{},A||(A=c.read));if("function"!=typeof A)throw Error("Pass a function that returns the value of the ko.computed");var C=c.write,D=c.disposeWhenNodeIsRemoved||c.q||null,u=c.disposeWhen||c.Pa,y=u,w=k,B={},F=0,z=null;d||(d=c.owner);a.Q.call(g);a.a.Ga(g,a.j.fn);
g.B=m;g.oa=function(){return F};g.qc="function"===typeof C;g.p=function(){w()};g.$=x;var T=g.Za;g.Za=function(a){T.call(g,a);g.nb=function(){g.pb(n);r=!0;g.qb(g)}};c.pure?(s=I=!0,g.ja=function(b){if(!G&&s&&"change"==b){s=!1;if(r||f())B=null,F=0,r=!0,l();else{var c=[];a.a.A(B,function(a,b){c[b.sa]=a});a.a.o(c,function(a,b){var c=B[a],g=c.da.U(h);g.sa=b;g.ea=c.ea;B[a]=g})}G||q(n,"awake")}},g.ua=function(b){G||"change"!=b||g.Ba("change")||(a.a.A(B,function(a,b){b.p&&(B[a]={da:b.da,sa:b.sa,ea:b.ea},b.p())}),
s=!0,q(p,"asleep"))},g.bc=g.Aa,g.Aa=function(){s&&(r||f())&&l();return g.bc()}):c.deferEvaluation&&(g.ja=function(a){"change"!=a&&"beforeChange"!=a||m()});a.D(g,"peek",g.B);a.D(g,"dispose",g.p);a.D(g,"isActive",g.$);a.D(g,"getDependenciesCount",g.oa);D&&(t=!0,D.nodeType&&(y=function(){return!a.a.Qa(D)||u&&u()}));s||c.deferEvaluation||l();D&&x()&&D.nodeType&&(w=function(){a.a.C.Pb(D,w);k()},a.a.C.fa(D,w));return g};a.sc=function(b){return a.Ta(b,a.j)};z=a.r.Ac;a.j[z]=a.r;a.j.fn={equalityComparer:J};
a.j.fn[z]=a.j;a.a.za&&a.a.Fa(a.j.fn,a.Q.fn);a.b("dependentObservable",a.j);a.b("computed",a.j);a.b("isComputed",a.sc);a.Nb=function(b,d){if("function"===typeof b)return a.w(b,d,{pure:!0});b=a.a.extend({},b);b.pure=!0;return a.w(b,d)};a.b("pureComputed",a.Nb);(function(){function b(a,f,k){k=k||new c;a=f(a);if("object"!=typeof a||null===a||a===p||a instanceof Date||a instanceof String||a instanceof Number||a instanceof Boolean)return a;var h=a instanceof Array?[]:{};k.save(a,h);d(a,function(c){var g=
f(a[c]);switch(typeof g){case "boolean":case "number":case "string":case "function":h[c]=g;break;case "object":case "undefined":var d=k.get(g);h[c]=d!==p?d:b(g,f,k)}});return h}function d(a,b){if(a instanceof Array){for(var c=0;c<a.length;c++)b(c);"function"==typeof a.toJSON&&b("toJSON")}else for(c in a)b(c)}function c(){this.keys=[];this.mb=[]}a.Vb=function(c){if(0==arguments.length)throw Error("When calling ko.toJS, pass the object you want to convert.");return b(c,function(b){for(var c=0;a.F(b)&&
10>c;c++)b=b();return b})};a.toJSON=function(b,c,d){b=a.Vb(b);return a.a.jb(b,c,d)};c.prototype={save:function(b,c){var d=a.a.m(this.keys,b);0<=d?this.mb[d]=c:(this.keys.push(b),this.mb.push(c))},get:function(b){b=a.a.m(this.keys,b);return 0<=b?this.mb[b]:p}}})();a.b("toJS",a.Vb);a.b("toJSON",a.toJSON);(function(){a.i={s:function(b){switch(a.a.v(b)){case "option":return!0===b.__ko__hasDomDataOptionValue__?a.a.f.get(b,a.d.options.ab):7>=a.a.M?b.getAttributeNode("value")&&b.getAttributeNode("value").specified?
b.value:b.text:b.value;case "select":return 0<=b.selectedIndex?a.i.s(b.options[b.selectedIndex]):p;default:return b.value}},Y:function(b,d,c){switch(a.a.v(b)){case "option":switch(typeof d){case "string":a.a.f.set(b,a.d.options.ab,p);"__ko__hasDomDataOptionValue__"in b&&delete b.__ko__hasDomDataOptionValue__;b.value=d;break;default:a.a.f.set(b,a.d.options.ab,d),b.__ko__hasDomDataOptionValue__=!0,b.value="number"===typeof d?d:""}break;case "select":if(""===d||null===d)d=p;for(var e=-1,f=0,k=b.options.length,
h;f<k;++f)if(h=a.i.s(b.options[f]),h==d||""==h&&d===p){e=f;break}if(c||0<=e||d===p&&1<b.size)b.selectedIndex=e;break;default:if(null===d||d===p)d="";b.value=d}}}})();a.b("selectExtensions",a.i);a.b("selectExtensions.readValue",a.i.s);a.b("selectExtensions.writeValue",a.i.Y);a.h=function(){function b(b){b=a.a.ib(b);123===b.charCodeAt(0)&&(b=b.slice(1,-1));var c=[],d=b.match(e),x,h=[],n=0;if(d){d.push(",");for(var r=0,v;v=d[r];++r){var t=v.charCodeAt(0);if(44===t){if(0>=n){c.push(x&&h.length?{key:x,
value:h.join("")}:{unknown:x||h.join("")});x=n=0;h=[];continue}}else if(58===t){if(!n&&!x&&1===h.length){x=h.pop();continue}}else 47===t&&r&&1<v.length?(t=d[r-1].match(f))&&!k[t[0]]&&(b=b.substr(b.indexOf(v)+1),d=b.match(e),d.push(","),r=-1,v="/"):40===t||123===t||91===t?++n:41===t||125===t||93===t?--n:x||h.length||34!==t&&39!==t||(v=v.slice(1,-1));h.push(v)}}return c}var d=["true","false","null","undefined"],c=/^(?:[$_a-z][$\w]*|(.+)(\.\s*[$_a-z][$\w]*|\[.+\]))$/i,e=RegExp("\"(?:[^\"\\\\]|\\\\.)*\"|'(?:[^'\\\\]|\\\\.)*'|/(?:[^/\\\\]|\\\\.)*/w*|[^\\s:,/][^,\"'{}()/:[\\]]*[^\\s,\"'{}()/:[\\]]|[^\\s]",
"g"),f=/[\])"'A-Za-z0-9_$]+$/,k={"in":1,"return":1,"typeof":1},h={};return{ka:[],V:h,bb:b,Ea:function(e,g){function m(b,g){var e;if(!r){var l=a.getBindingHandler(b);if(l&&l.preprocess&&!(g=l.preprocess(g,b,m)))return;if(l=h[b])e=g,0<=a.a.m(d,e)?e=!1:(l=e.match(c),e=null===l?!1:l[1]?"Object("+l[1]+")"+l[2]:e),l=e;l&&k.push("'"+b+"':function(_z){"+e+"=_z}")}n&&(g="function(){return "+g+" }");f.push("'"+b+"':"+g)}g=g||{};var f=[],k=[],n=g.valueAccessors,r=g.bindingParams,v="string"===typeof e?b(e):e;
a.a.o(v,function(a){m(a.key||a.unknown,a.value)});k.length&&m("_ko_property_writers","{"+k.join(",")+" }");return f.join(",")},vc:function(a,b){for(var c=0;c<a.length;c++)if(a[c].key==b)return!0;return!1},ra:function(b,c,d,e,f){if(b&&a.F(b))!a.Da(b)||f&&b.B()===e||b(e);else if((b=c.get("_ko_property_writers"))&&b[d])b[d](e)}}}();a.b("expressionRewriting",a.h);a.b("expressionRewriting.bindingRewriteValidators",a.h.ka);a.b("expressionRewriting.parseObjectLiteral",a.h.bb);a.b("expressionRewriting.preProcessBindings",
a.h.Ea);a.b("expressionRewriting._twoWayBindings",a.h.V);a.b("jsonExpressionRewriting",a.h);a.b("jsonExpressionRewriting.insertPropertyAccessorsIntoJson",a.h.Ea);(function(){function b(a){return 8==a.nodeType&&k.test(f?a.text:a.nodeValue)}function d(a){return 8==a.nodeType&&h.test(f?a.text:a.nodeValue)}function c(a,c){for(var e=a,f=1,l=[];e=e.nextSibling;){if(d(e)&&(f--,0===f))return l;l.push(e);b(e)&&f++}if(!c)throw Error("Cannot find closing comment tag to match: "+a.nodeValue);return null}function e(a,
b){var d=c(a,b);return d?0<d.length?d[d.length-1].nextSibling:a.nextSibling:null}var f=w&&"\x3c!--test--\x3e"===w.createComment("test").text,k=f?/^\x3c!--\s*ko(?:\s+([\s\S]+))?\s*--\x3e$/:/^\s*ko(?:\s+([\s\S]+))?\s*$/,h=f?/^\x3c!--\s*\/ko\s*--\x3e$/:/^\s*\/ko\s*$/,l={ul:!0,ol:!0};a.e={R:{},childNodes:function(a){return b(a)?c(a):a.childNodes},ma:function(c){if(b(c)){c=a.e.childNodes(c);for(var d=0,e=c.length;d<e;d++)a.removeNode(c[d])}else a.a.Ra(c)},T:function(c,d){if(b(c)){a.e.ma(c);for(var e=c.nextSibling,
f=0,l=d.length;f<l;f++)e.parentNode.insertBefore(d[f],e)}else a.a.T(c,d)},Mb:function(a,c){b(a)?a.parentNode.insertBefore(c,a.nextSibling):a.firstChild?a.insertBefore(c,a.firstChild):a.appendChild(c)},Fb:function(c,d,e){e?b(c)?c.parentNode.insertBefore(d,e.nextSibling):e.nextSibling?c.insertBefore(d,e.nextSibling):c.appendChild(d):a.e.Mb(c,d)},firstChild:function(a){return b(a)?!a.nextSibling||d(a.nextSibling)?null:a.nextSibling:a.firstChild},nextSibling:function(a){b(a)&&(a=e(a));return a.nextSibling&&
d(a.nextSibling)?null:a.nextSibling},oc:b,Fc:function(a){return(a=(f?a.text:a.nodeValue).match(k))?a[1]:null},Kb:function(c){if(l[a.a.v(c)]){var m=c.firstChild;if(m){do if(1===m.nodeType){var f;f=m.firstChild;var h=null;if(f){do if(h)h.push(f);else if(b(f)){var k=e(f,!0);k?f=k:h=[f]}else d(f)&&(h=[f]);while(f=f.nextSibling)}if(f=h)for(h=m.nextSibling,k=0;k<f.length;k++)h?c.insertBefore(f[k],h):c.appendChild(f[k])}while(m=m.nextSibling)}}}}})();a.b("virtualElements",a.e);a.b("virtualElements.allowedBindings",
a.e.R);a.b("virtualElements.emptyNode",a.e.ma);a.b("virtualElements.insertAfter",a.e.Fb);a.b("virtualElements.prepend",a.e.Mb);a.b("virtualElements.setDomNodeChildren",a.e.T);(function(){a.L=function(){this.ec={}};a.a.extend(a.L.prototype,{nodeHasBindings:function(b){switch(b.nodeType){case 1:return null!=b.getAttribute("data-bind")||a.g.getComponentNameForNode(b);case 8:return a.e.oc(b);default:return!1}},getBindings:function(b,d){var c=this.getBindingsString(b,d),c=c?this.parseBindingsString(c,
d,b):null;return a.g.sb(c,b,d,!1)},getBindingAccessors:function(b,d){var c=this.getBindingsString(b,d),c=c?this.parseBindingsString(c,d,b,{valueAccessors:!0}):null;return a.g.sb(c,b,d,!0)},getBindingsString:function(b){switch(b.nodeType){case 1:return b.getAttribute("data-bind");case 8:return a.e.Fc(b);default:return null}},parseBindingsString:function(b,d,c,e){try{var f=this.ec,k=b+(e&&e.valueAccessors||""),h;if(!(h=f[k])){var l,g="with($context){with($data||{}){return{"+a.h.Ea(b,e)+"}}}";l=new Function("$context",
"$element",g);h=f[k]=l}return h(d,c)}catch(m){throw m.message="Unable to parse bindings.\nBindings value: "+b+"\nMessage: "+m.message,m;}}});a.L.instance=new a.L})();a.b("bindingProvider",a.L);(function(){function b(a){return function(){return a}}function d(a){return a()}function c(b){return a.a.pa(a.k.u(b),function(a,c){return function(){return b()[c]}})}function e(d,g,e){return"function"===typeof d?c(d.bind(null,g,e)):a.a.pa(d,b)}function f(a,b){return c(this.getBindings.bind(this,a,b))}function k(b,
c,d){var g,e=a.e.firstChild(c),f=a.L.instance,m=f.preprocessNode;if(m){for(;g=e;)e=a.e.nextSibling(g),m.call(f,g);e=a.e.firstChild(c)}for(;g=e;)e=a.e.nextSibling(g),h(b,g,d)}function h(b,c,d){var e=!0,f=1===c.nodeType;f&&a.e.Kb(c);if(f&&d||a.L.instance.nodeHasBindings(c))e=g(c,null,b,d).shouldBindDescendants;e&&!x[a.a.v(c)]&&k(b,c,!f)}function l(b){var c=[],d={},g=[];a.a.A(b,function I(e){if(!d[e]){var f=a.getBindingHandler(e);f&&(f.after&&(g.push(e),a.a.o(f.after,function(c){if(b[c]){if(-1!==a.a.m(g,
c))throw Error("Cannot combine the following bindings, because they have a cyclic dependency: "+g.join(", "));I(c)}}),g.length--),c.push({key:e,Eb:f}));d[e]=!0}});return c}function g(b,c,g,e){var m=a.a.f.get(b,q);if(!c){if(m)throw Error("You cannot apply bindings multiple times to the same element.");a.a.f.set(b,q,!0)}!m&&e&&a.Tb(b,g);var h;if(c&&"function"!==typeof c)h=c;else{var k=a.L.instance,x=k.getBindingAccessors||f,n=a.j(function(){(h=c?c(g,b):x.call(k,b,g))&&g.K&&g.K();return h},null,{q:b});
h&&n.$()||(n=null)}var u;if(h){var w=n?function(a){return function(){return d(n()[a])}}:function(a){return h[a]},y=function(){return a.a.pa(n?n():h,d)};y.get=function(a){return h[a]&&d(w(a))};y.has=function(a){return a in h};e=l(h);a.a.o(e,function(c){var d=c.Eb.init,e=c.Eb.update,f=c.key;if(8===b.nodeType&&!a.e.R[f])throw Error("The binding '"+f+"' cannot be used with virtual elements");try{"function"==typeof d&&a.k.u(function(){var a=d(b,w(f),y,g.$data,g);if(a&&a.controlsDescendantBindings){if(u!==
p)throw Error("Multiple bindings ("+u+" and "+f+") are trying to control descendant bindings of the same element. You cannot use these bindings together on the same element.");u=f}}),"function"==typeof e&&a.j(function(){e(b,w(f),y,g.$data,g)},null,{q:b})}catch(m){throw m.message='Unable to process binding "'+f+": "+h[f]+'"\nMessage: '+m.message,m;}})}return{shouldBindDescendants:u===p}}function m(b){return b&&b instanceof a.N?b:new a.N(b)}a.d={};var x={script:!0,textarea:!0};a.getBindingHandler=function(b){return a.d[b]};
a.N=function(b,c,d,g){var e=this,f="function"==typeof b&&!a.F(b),m,l=a.j(function(){var m=f?b():b,h=a.a.c(m);c?(c.K&&c.K(),a.a.extend(e,c),l&&(e.K=l)):(e.$parents=[],e.$root=h,e.ko=a);e.$rawData=m;e.$data=h;d&&(e[d]=h);g&&g(e,c,h);return e.$data},null,{Pa:function(){return m&&!a.a.tb(m)},q:!0});l.$()&&(e.K=l,l.equalityComparer=null,m=[],l.Zb=function(b){m.push(b);a.a.C.fa(b,function(b){a.a.ya(m,b);m.length||(l.p(),e.K=l=p)})})};a.N.prototype.createChildContext=function(b,c,d){return new a.N(b,this,
c,function(a,b){a.$parentContext=b;a.$parent=b.$data;a.$parents=(b.$parents||[]).slice(0);a.$parents.unshift(a.$parent);d&&d(a)})};a.N.prototype.extend=function(b){return new a.N(this.K||this.$data,this,null,function(c,d){c.$rawData=d.$rawData;a.a.extend(c,"function"==typeof b?b():b)})};var q=a.a.f.I(),n=a.a.f.I();a.Tb=function(b,c){if(2==arguments.length)a.a.f.set(b,n,c),c.K&&c.K.Zb(b);else return a.a.f.get(b,n)};a.va=function(b,c,d){1===b.nodeType&&a.e.Kb(b);return g(b,c,m(d),!0)};a.cc=function(b,
c,d){d=m(d);return a.va(b,e(c,d,b),d)};a.Ja=function(a,b){1!==b.nodeType&&8!==b.nodeType||k(m(a),b,!0)};a.ub=function(a,b){!u&&y.jQuery&&(u=y.jQuery);if(b&&1!==b.nodeType&&8!==b.nodeType)throw Error("ko.applyBindings: first parameter should be your view model; second parameter should be a DOM node");b=b||y.document.body;h(m(a),b,!0)};a.Oa=function(b){switch(b.nodeType){case 1:case 8:var c=a.Tb(b);if(c)return c;if(b.parentNode)return a.Oa(b.parentNode)}return p};a.gc=function(b){return(b=a.Oa(b))?
b.$data:p};a.b("bindingHandlers",a.d);a.b("applyBindings",a.ub);a.b("applyBindingsToDescendants",a.Ja);a.b("applyBindingAccessorsToNode",a.va);a.b("applyBindingsToNode",a.cc);a.b("contextFor",a.Oa);a.b("dataFor",a.gc)})();(function(b){function d(d,e){var g=f.hasOwnProperty(d)?f[d]:b,m;g?g.U(e):(g=f[d]=new a.Q,g.U(e),c(d,function(a,b){var c=!(!b||!b.synchronous);k[d]={definition:a,tc:c};delete f[d];m||c?g.notifySubscribers(a):setTimeout(function(){g.notifySubscribers(a)},0)}),m=!0)}function c(a,b){e("getConfig",
[a],function(c){c?e("loadComponent",[a,c],function(a){b(a,c)}):b(null,null)})}function e(c,d,g,f){f||(f=a.g.loaders.slice(0));var k=f.shift();if(k){var q=k[c];if(q){var n=!1;if(q.apply(k,d.concat(function(a){n?g(null):null!==a?g(a):e(c,d,g,f)}))!==b&&(n=!0,!k.suppressLoaderExceptions))throw Error("Component loaders must supply values by invoking the callback, not by returning values synchronously.");}else e(c,d,g,f)}else g(null)}var f={},k={};a.g={get:function(c,e){var g=k.hasOwnProperty(c)?k[c]:
b;g?g.tc?a.k.u(function(){e(g.definition)}):setTimeout(function(){e(g.definition)},0):d(c,e)},zb:function(a){delete k[a]},ob:e};a.g.loaders=[];a.b("components",a.g);a.b("components.get",a.g.get);a.b("components.clearCachedDefinition",a.g.zb)})();(function(){function b(b,c,d,e){function k(){0===--v&&e(h)}var h={},v=2,t=d.template;d=d.viewModel;t?f(c,t,function(c){a.g.ob("loadTemplate",[b,c],function(a){h.template=a;k()})}):k();d?f(c,d,function(c){a.g.ob("loadViewModel",[b,c],function(a){h[l]=a;k()})}):
k()}function d(a,b,c){if("function"===typeof b)c(function(a){return new b(a)});else if("function"===typeof b[l])c(b[l]);else if("instance"in b){var e=b.instance;c(function(){return e})}else"viewModel"in b?d(a,b.viewModel,c):a("Unknown viewModel value: "+b)}function c(b){switch(a.a.v(b)){case "script":return a.a.ca(b.text);case "textarea":return a.a.ca(b.value);case "template":if(e(b.content))return a.a.la(b.content.childNodes)}return a.a.la(b.childNodes)}function e(a){return y.DocumentFragment?a instanceof
DocumentFragment:a&&11===a.nodeType}function f(a,b,c){"string"===typeof b.require?O||y.require?(O||y.require)([b.require],c):a("Uses require, but no AMD loader is present"):c(b)}function k(a){return function(b){throw Error("Component '"+a+"': "+b);}}var h={};a.g.register=function(b,c){if(!c)throw Error("Invalid configuration for "+b);if(a.g.Xa(b))throw Error("Component "+b+" is already registered");h[b]=c};a.g.Xa=function(a){return a in h};a.g.Ec=function(b){delete h[b];a.g.zb(b)};a.g.Ab={getConfig:function(a,
b){b(h.hasOwnProperty(a)?h[a]:null)},loadComponent:function(a,c,d){var e=k(a);f(e,c,function(c){b(a,e,c,d)})},loadTemplate:function(b,d,f){b=k(b);if("string"===typeof d)f(a.a.ca(d));else if(d instanceof Array)f(d);else if(e(d))f(a.a.O(d.childNodes));else if(d.element)if(d=d.element,y.HTMLElement?d instanceof HTMLElement:d&&d.tagName&&1===d.nodeType)f(c(d));else if("string"===typeof d){var l=w.getElementById(d);l?f(c(l)):b("Cannot find element with ID "+d)}else b("Unknown element type: "+d);else b("Unknown template value: "+
d)},loadViewModel:function(a,b,c){d(k(a),b,c)}};var l="createViewModel";a.b("components.register",a.g.register);a.b("components.isRegistered",a.g.Xa);a.b("components.unregister",a.g.Ec);a.b("components.defaultLoader",a.g.Ab);a.g.loaders.push(a.g.Ab);a.g.$b=h})();(function(){function b(b,e){var f=b.getAttribute("params");if(f){var f=d.parseBindingsString(f,e,b,{valueAccessors:!0,bindingParams:!0}),f=a.a.pa(f,function(d){return a.w(d,null,{q:b})}),k=a.a.pa(f,function(d){var e=d.B();return d.$()?a.w({read:function(){return a.a.c(d())},
write:a.Da(e)&&function(a){d()(a)},q:b}):e});k.hasOwnProperty("$raw")||(k.$raw=f);return k}return{$raw:{}}}a.g.getComponentNameForNode=function(b){b=a.a.v(b);return a.g.Xa(b)&&b};a.g.sb=function(c,d,f,k){if(1===d.nodeType){var h=a.g.getComponentNameForNode(d);if(h){c=c||{};if(c.component)throw Error('Cannot use the "component" binding on a custom element matching a component');var l={name:h,params:b(d,f)};c.component=k?function(){return l}:l}}return c};var d=new a.L;9>a.a.M&&(a.g.register=function(a){return function(b){w.createElement(b);
return a.apply(this,arguments)}}(a.g.register),w.createDocumentFragment=function(b){return function(){var d=b(),f=a.g.$b,k;for(k in f)f.hasOwnProperty(k)&&d.createElement(k);return d}}(w.createDocumentFragment))})();(function(b){function d(b,c,d){c=c.template;if(!c)throw Error("Component '"+b+"' has no template");b=a.a.la(c);a.e.T(d,b)}function c(a,b,c,d){var e=a.createViewModel;return e?e.call(a,d,{element:b,templateNodes:c}):d}var e=0;a.d.component={init:function(f,k,h,l,g){function m(){var a=x&&
x.dispose;"function"===typeof a&&a.call(x);q=null}var x,q,n=a.a.O(a.e.childNodes(f));a.a.C.fa(f,m);a.w(function(){var l=a.a.c(k()),h,t;"string"===typeof l?h=l:(h=a.a.c(l.name),t=a.a.c(l.params));if(!h)throw Error("No component name specified");var p=q=++e;a.g.get(h,function(e){if(q===p){m();if(!e)throw Error("Unknown component '"+h+"'");d(h,e,f);var l=c(e,f,n,t);e=g.createChildContext(l,b,function(a){a.$component=l;a.$componentTemplateNodes=n});x=l;a.Ja(e,f)}})},null,{q:f});return{controlsDescendantBindings:!0}}};
a.e.R.component=!0})();var P={"class":"className","for":"htmlFor"};a.d.attr={update:function(b,d){var c=a.a.c(d())||{};a.a.A(c,function(c,d){d=a.a.c(d);var k=!1===d||null===d||d===p;k&&b.removeAttribute(c);8>=a.a.M&&c in P?(c=P[c],k?b.removeAttribute(c):b[c]=d):k||b.setAttribute(c,d.toString());"name"===c&&a.a.Rb(b,k?"":d.toString())})}};(function(){a.d.checked={after:["value","attr"],init:function(b,d,c){function e(){var e=b.checked,f=x?k():e;if(!a.Z.Ca()&&(!l||e)){var h=a.k.u(d);g?m!==f?(e&&(a.a.ga(h,
f,!0),a.a.ga(h,m,!1)),m=f):a.a.ga(h,f,e):a.h.ra(h,c,"checked",f,!0)}}function f(){var c=a.a.c(d());b.checked=g?0<=a.a.m(c,k()):h?c:k()===c}var k=a.Nb(function(){return c.has("checkedValue")?a.a.c(c.get("checkedValue")):c.has("value")?a.a.c(c.get("value")):b.value}),h="checkbox"==b.type,l="radio"==b.type;if(h||l){var g=h&&a.a.c(d())instanceof Array,m=g?k():p,x=l||g;l&&!b.name&&a.d.uniqueName.init(b,function(){return!0});a.w(e,null,{q:b});a.a.n(b,"click",e);a.w(f,null,{q:b})}}};a.h.V.checked=!0;a.d.checkedValue=
{update:function(b,d){b.value=a.a.c(d())}}})();a.d.css={update:function(b,d){var c=a.a.c(d());null!==c&&"object"==typeof c?a.a.A(c,function(c,d){d=a.a.c(d);a.a.Ia(b,c,d)}):(c=String(c||""),a.a.Ia(b,b.__ko__cssValue,!1),b.__ko__cssValue=c,a.a.Ia(b,c,!0))}};a.d.enable={update:function(b,d){var c=a.a.c(d());c&&b.disabled?b.removeAttribute("disabled"):c||b.disabled||(b.disabled=!0)}};a.d.disable={update:function(b,d){a.d.enable.update(b,function(){return!a.a.c(d())})}};a.d.event={init:function(b,d,c,
e,f){var k=d()||{};a.a.A(k,function(h){"string"==typeof h&&a.a.n(b,h,function(b){var g,m=d()[h];if(m){try{var k=a.a.O(arguments);e=f.$data;k.unshift(e);g=m.apply(e,k)}finally{!0!==g&&(b.preventDefault?b.preventDefault():b.returnValue=!1)}!1===c.get(h+"Bubble")&&(b.cancelBubble=!0,b.stopPropagation&&b.stopPropagation())}})})}};a.d.foreach={Ib:function(b){return function(){var d=b(),c=a.a.cb(d);if(!c||"number"==typeof c.length)return{foreach:d,templateEngine:a.P.Va};a.a.c(d);return{foreach:c.data,as:c.as,
includeDestroyed:c.includeDestroyed,afterAdd:c.afterAdd,beforeRemove:c.beforeRemove,afterRender:c.afterRender,beforeMove:c.beforeMove,afterMove:c.afterMove,templateEngine:a.P.Va}}},init:function(b,d){return a.d.template.init(b,a.d.foreach.Ib(d))},update:function(b,d,c,e,f){return a.d.template.update(b,a.d.foreach.Ib(d),c,e,f)}};a.h.ka.foreach=!1;a.e.R.foreach=!0;a.d.hasfocus={init:function(b,d,c){function e(e){b.__ko_hasfocusUpdating=!0;var f=b.ownerDocument;if("activeElement"in f){var g;try{g=f.activeElement}catch(m){g=
f.body}e=g===b}f=d();a.h.ra(f,c,"hasfocus",e,!0);b.__ko_hasfocusLastValue=e;b.__ko_hasfocusUpdating=!1}var f=e.bind(null,!0),k=e.bind(null,!1);a.a.n(b,"focus",f);a.a.n(b,"focusin",f);a.a.n(b,"blur",k);a.a.n(b,"focusout",k)},update:function(b,d){var c=!!a.a.c(d());b.__ko_hasfocusUpdating||b.__ko_hasfocusLastValue===c||(c?b.focus():b.blur(),a.k.u(a.a.qa,null,[b,c?"focusin":"focusout"]))}};a.h.V.hasfocus=!0;a.d.hasFocus=a.d.hasfocus;a.h.V.hasFocus=!0;a.d.html={init:function(){return{controlsDescendantBindings:!0}},
update:function(b,d){a.a.gb(b,d())}};K("if");K("ifnot",!1,!0);K("with",!0,!1,function(a,d){return a.createChildContext(d)});var L={};a.d.options={init:function(b){if("select"!==a.a.v(b))throw Error("options binding applies only to SELECT elements");for(;0<b.length;)b.remove(0);return{controlsDescendantBindings:!0}},update:function(b,d,c){function e(){return a.a.xa(b.options,function(a){return a.selected})}function f(a,b,c){var d=typeof b;return"function"==d?b(a):"string"==d?a[b]:c}function k(d,e){if(r&&
m)a.i.Y(b,a.a.c(c.get("value")),!0);else if(n.length){var g=0<=a.a.m(n,a.i.s(e[0]));a.a.Sb(e[0],g);r&&!g&&a.k.u(a.a.qa,null,[b,"change"])}}var h=b.multiple,l=0!=b.length&&h?b.scrollTop:null,g=a.a.c(d()),m=c.get("valueAllowUnset")&&c.has("value"),x=c.get("optionsIncludeDestroyed");d={};var q,n=[];m||(h?n=a.a.Ka(e(),a.i.s):0<=b.selectedIndex&&n.push(a.i.s(b.options[b.selectedIndex])));g&&("undefined"==typeof g.length&&(g=[g]),q=a.a.xa(g,function(b){return x||b===p||null===b||!a.a.c(b._destroy)}),c.has("optionsCaption")&&
(g=a.a.c(c.get("optionsCaption")),null!==g&&g!==p&&q.unshift(L)));var r=!1;d.beforeRemove=function(a){b.removeChild(a)};g=k;c.has("optionsAfterRender")&&"function"==typeof c.get("optionsAfterRender")&&(g=function(b,d){k(0,d);a.k.u(c.get("optionsAfterRender"),null,[d[0],b!==L?b:p])});a.a.fb(b,q,function(d,e,g){g.length&&(n=!m&&g[0].selected?[a.i.s(g[0])]:[],r=!0);e=b.ownerDocument.createElement("option");d===L?(a.a.Ha(e,c.get("optionsCaption")),a.i.Y(e,p)):(g=f(d,c.get("optionsValue"),d),a.i.Y(e,a.a.c(g)),
d=f(d,c.get("optionsText"),g),a.a.Ha(e,d));return[e]},d,g);a.k.u(function(){m?a.i.Y(b,a.a.c(c.get("value")),!0):(h?n.length&&e().length<n.length:n.length&&0<=b.selectedIndex?a.i.s(b.options[b.selectedIndex])!==n[0]:n.length||0<=b.selectedIndex)&&a.a.qa(b,"change")});a.a.kc(b);l&&20<Math.abs(l-b.scrollTop)&&(b.scrollTop=l)}};a.d.options.ab=a.a.f.I();a.d.selectedOptions={after:["options","foreach"],init:function(b,d,c){a.a.n(b,"change",function(){var e=d(),f=[];a.a.o(b.getElementsByTagName("option"),
function(b){b.selected&&f.push(a.i.s(b))});a.h.ra(e,c,"selectedOptions",f)})},update:function(b,d){if("select"!=a.a.v(b))throw Error("values binding applies only to SELECT elements");var c=a.a.c(d());c&&"number"==typeof c.length&&a.a.o(b.getElementsByTagName("option"),function(b){var d=0<=a.a.m(c,a.i.s(b));a.a.Sb(b,d)})}};a.h.V.selectedOptions=!0;a.d.style={update:function(b,d){var c=a.a.c(d()||{});a.a.A(c,function(c,d){d=a.a.c(d);if(null===d||d===p||!1===d)d="";b.style[c]=d})}};a.d.submit={init:function(b,
d,c,e,f){if("function"!=typeof d())throw Error("The value for a submit binding must be a function");a.a.n(b,"submit",function(a){var c,e=d();try{c=e.call(f.$data,b)}finally{!0!==c&&(a.preventDefault?a.preventDefault():a.returnValue=!1)}})}};a.d.text={init:function(){return{controlsDescendantBindings:!0}},update:function(b,d){a.a.Ha(b,d())}};a.e.R.text=!0;(function(){if(y&&y.navigator)var b=function(a){if(a)return parseFloat(a[1])},d=y.opera&&y.opera.version&&parseInt(y.opera.version()),c=y.navigator.userAgent,
e=b(c.match(/^(?:(?!chrome).)*version\/([^ ]*) safari/i)),f=b(c.match(/Firefox\/([^ ]*)/));if(10>a.a.M)var k=a.a.f.I(),h=a.a.f.I(),l=function(b){var c=this.activeElement;(c=c&&a.a.f.get(c,h))&&c(b)},g=function(b,c){var d=b.ownerDocument;a.a.f.get(d,k)||(a.a.f.set(d,k,!0),a.a.n(d,"selectionchange",l));a.a.f.set(b,h,c)};a.d.textInput={init:function(b,c,l){function h(c,d){a.a.n(b,c,d)}function k(){var d=a.a.c(c());if(null===d||d===p)d="";w!==p&&d===w?setTimeout(k,4):b.value!==d&&(u=d,b.value=d)}function v(){A||
(w=b.value,A=setTimeout(t,4))}function t(){clearTimeout(A);w=A=p;var d=b.value;u!==d&&(u=d,a.h.ra(c(),l,"textInput",d))}var u=b.value,A,w;10>a.a.M?(h("propertychange",function(a){"value"===a.propertyName&&t()}),8==a.a.M&&(h("keyup",t),h("keydown",t)),8<=a.a.M&&(g(b,t),h("dragend",v))):(h("input",t),5>e&&"textarea"===a.a.v(b)?(h("keydown",v),h("paste",v),h("cut",v)):11>d?h("keydown",v):4>f&&(h("DOMAutoComplete",t),h("dragdrop",t),h("drop",t)));h("change",t);a.w(k,null,{q:b})}};a.h.V.textInput=!0;a.d.textinput=
{preprocess:function(a,b,c){c("textInput",a)}}})();a.d.uniqueName={init:function(b,d){if(d()){var c="ko_unique_"+ ++a.d.uniqueName.fc;a.a.Rb(b,c)}}};a.d.uniqueName.fc=0;a.d.value={after:["options","foreach"],init:function(b,d,c){if("input"!=b.tagName.toLowerCase()||"checkbox"!=b.type&&"radio"!=b.type){var e=["change"],f=c.get("valueUpdate"),k=!1,h=null;f&&("string"==typeof f&&(f=[f]),a.a.ia(e,f),e=a.a.wb(e));var l=function(){h=null;k=!1;var e=d(),g=a.i.s(b);a.h.ra(e,c,"value",g)};!a.a.M||"input"!=
b.tagName.toLowerCase()||"text"!=b.type||"off"==b.autocomplete||b.form&&"off"==b.form.autocomplete||-1!=a.a.m(e,"propertychange")||(a.a.n(b,"propertychange",function(){k=!0}),a.a.n(b,"focus",function(){k=!1}),a.a.n(b,"blur",function(){k&&l()}));a.a.o(e,function(c){var d=l;a.a.Dc(c,"after")&&(d=function(){h=a.i.s(b);setTimeout(l,0)},c=c.substring(5));a.a.n(b,c,d)});var g=function(){var e=a.a.c(d()),f=a.i.s(b);if(null!==h&&e===h)setTimeout(g,0);else if(e!==f)if("select"===a.a.v(b)){var l=c.get("valueAllowUnset"),
f=function(){a.i.Y(b,e,l)};f();l||e===a.i.s(b)?setTimeout(f,0):a.k.u(a.a.qa,null,[b,"change"])}else a.i.Y(b,e)};a.w(g,null,{q:b})}else a.va(b,{checkedValue:d})},update:function(){}};a.h.V.value=!0;a.d.visible={update:function(b,d){var c=a.a.c(d()),e="none"!=b.style.display;c&&!e?b.style.display="":!c&&e&&(b.style.display="none")}};(function(b){a.d[b]={init:function(d,c,e,f,k){return a.d.event.init.call(this,d,function(){var a={};a[b]=c();return a},e,f,k)}}})("click");a.J=function(){};a.J.prototype.renderTemplateSource=
function(){throw Error("Override renderTemplateSource");};a.J.prototype.createJavaScriptEvaluatorBlock=function(){throw Error("Override createJavaScriptEvaluatorBlock");};a.J.prototype.makeTemplateSource=function(b,d){if("string"==typeof b){d=d||w;var c=d.getElementById(b);if(!c)throw Error("Cannot find template with ID "+b);return new a.t.l(c)}if(1==b.nodeType||8==b.nodeType)return new a.t.ha(b);throw Error("Unknown template type: "+b);};a.J.prototype.renderTemplate=function(a,d,c,e){a=this.makeTemplateSource(a,
e);return this.renderTemplateSource(a,d,c,e)};a.J.prototype.isTemplateRewritten=function(a,d){return!1===this.allowTemplateRewriting?!0:this.makeTemplateSource(a,d).data("isRewritten")};a.J.prototype.rewriteTemplate=function(a,d,c){a=this.makeTemplateSource(a,c);d=d(a.text());a.text(d);a.data("isRewritten",!0)};a.b("templateEngine",a.J);a.kb=function(){function b(b,c,d,h){b=a.h.bb(b);for(var l=a.h.ka,g=0;g<b.length;g++){var m=b[g].key;if(l.hasOwnProperty(m)){var x=l[m];if("function"===typeof x){if(m=
x(b[g].value))throw Error(m);}else if(!x)throw Error("This template engine does not support the '"+m+"' binding within its templates");}}d="ko.__tr_ambtns(function($context,$element){return(function(){return{ "+a.h.Ea(b,{valueAccessors:!0})+" } })()},'"+d.toLowerCase()+"')";return h.createJavaScriptEvaluatorBlock(d)+c}var d=/(<([a-z]+\d*)(?:\s+(?!data-bind\s*=\s*)[a-z0-9\-]+(?:=(?:\"[^\"]*\"|\'[^\']*\'|[^>]*))?)*\s+)data-bind\s*=\s*(["'])([\s\S]*?)\3/gi,c=/\x3c!--\s*ko\b\s*([\s\S]*?)\s*--\x3e/g;return{lc:function(b,
c,d){c.isTemplateRewritten(b,d)||c.rewriteTemplate(b,function(b){return a.kb.xc(b,c)},d)},xc:function(a,f){return a.replace(d,function(a,c,d,e,m){return b(m,c,d,f)}).replace(c,function(a,c){return b(c,"\x3c!-- ko --\x3e","#comment",f)})},dc:function(b,c){return a.H.$a(function(d,h){var l=d.nextSibling;l&&l.nodeName.toLowerCase()===c&&a.va(l,b,h)})}}}();a.b("__tr_ambtns",a.kb.dc);(function(){a.t={};a.t.l=function(a){this.l=a};a.t.l.prototype.text=function(){var b=a.a.v(this.l),b="script"===b?"text":
"textarea"===b?"value":"innerHTML";if(0==arguments.length)return this.l[b];var d=arguments[0];"innerHTML"===b?a.a.gb(this.l,d):this.l[b]=d};var b=a.a.f.I()+"_";a.t.l.prototype.data=function(c){if(1===arguments.length)return a.a.f.get(this.l,b+c);a.a.f.set(this.l,b+c,arguments[1])};var d=a.a.f.I();a.t.ha=function(a){this.l=a};a.t.ha.prototype=new a.t.l;a.t.ha.prototype.text=function(){if(0==arguments.length){var b=a.a.f.get(this.l,d)||{};b.lb===p&&b.Na&&(b.lb=b.Na.innerHTML);return b.lb}a.a.f.set(this.l,
d,{lb:arguments[0]})};a.t.l.prototype.nodes=function(){if(0==arguments.length)return(a.a.f.get(this.l,d)||{}).Na;a.a.f.set(this.l,d,{Na:arguments[0]})};a.b("templateSources",a.t);a.b("templateSources.domElement",a.t.l);a.b("templateSources.anonymousTemplate",a.t.ha)})();(function(){function b(b,c,d){var e;for(c=a.e.nextSibling(c);b&&(e=b)!==c;)b=a.e.nextSibling(e),d(e,b)}function d(c,d){if(c.length){var e=c[0],f=c[c.length-1],h=e.parentNode,k=a.L.instance,r=k.preprocessNode;if(r){b(e,f,function(a,
b){var c=a.previousSibling,d=r.call(k,a);d&&(a===e&&(e=d[0]||b),a===f&&(f=d[d.length-1]||c))});c.length=0;if(!e)return;e===f?c.push(e):(c.push(e,f),a.a.na(c,h))}b(e,f,function(b){1!==b.nodeType&&8!==b.nodeType||a.ub(d,b)});b(e,f,function(b){1!==b.nodeType&&8!==b.nodeType||a.H.Xb(b,[d])});a.a.na(c,h)}}function c(a){return a.nodeType?a:0<a.length?a[0]:null}function e(b,e,f,h,q){q=q||{};var n=(b&&c(b)||f||{}).ownerDocument,r=q.templateEngine||k;a.kb.lc(f,r,n);f=r.renderTemplate(f,h,q,n);if("number"!=
typeof f.length||0<f.length&&"number"!=typeof f[0].nodeType)throw Error("Template engine must return an array of DOM nodes");n=!1;switch(e){case "replaceChildren":a.e.T(b,f);n=!0;break;case "replaceNode":a.a.Qb(b,f);n=!0;break;case "ignoreTargetNode":break;default:throw Error("Unknown renderMode: "+e);}n&&(d(f,h),q.afterRender&&a.k.u(q.afterRender,null,[f,h.$data]));return f}function f(b,c,d){return a.F(b)?b():"function"===typeof b?b(c,d):b}var k;a.hb=function(b){if(b!=p&&!(b instanceof a.J))throw Error("templateEngine must inherit from ko.templateEngine");
k=b};a.eb=function(b,d,h,x,q){h=h||{};if((h.templateEngine||k)==p)throw Error("Set a template engine before calling renderTemplate");q=q||"replaceChildren";if(x){var n=c(x);return a.j(function(){var k=d&&d instanceof a.N?d:new a.N(a.a.c(d)),p=f(b,k.$data,k),k=e(x,q,p,k,h);"replaceNode"==q&&(x=k,n=c(x))},null,{Pa:function(){return!n||!a.a.Qa(n)},q:n&&"replaceNode"==q?n.parentNode:n})}return a.H.$a(function(c){a.eb(b,d,h,c,"replaceNode")})};a.Cc=function(b,c,h,k,q){function n(a,b){d(b,v);h.afterRender&&
h.afterRender(b,a);v=null}function r(a,c){v=q.createChildContext(a,h.as,function(a){a.$index=c});var d=f(b,a,v);return e(null,"ignoreTargetNode",d,v,h)}var v;return a.j(function(){var b=a.a.c(c)||[];"undefined"==typeof b.length&&(b=[b]);b=a.a.xa(b,function(b){return h.includeDestroyed||b===p||null===b||!a.a.c(b._destroy)});a.k.u(a.a.fb,null,[k,b,r,h,n])},null,{q:k})};var h=a.a.f.I();a.d.template={init:function(b,c){var d=a.a.c(c());if("string"==typeof d||d.name)a.e.ma(b);else{if("nodes"in d){if(d=
d.nodes||[],a.F(d))throw Error('The "nodes" option must be a plain, non-observable array.');}else d=a.e.childNodes(b);d=a.a.Jb(d);(new a.t.ha(b)).nodes(d)}return{controlsDescendantBindings:!0}},update:function(b,c,d,e,f){var k=c(),r;c=a.a.c(k);d=!0;e=null;"string"==typeof c?c={}:(k=c.name,"if"in c&&(d=a.a.c(c["if"])),d&&"ifnot"in c&&(d=!a.a.c(c.ifnot)),r=a.a.c(c.data));"foreach"in c?e=a.Cc(k||b,d&&c.foreach||[],c,b,f):d?(f="data"in c?f.createChildContext(r,c.as):f,e=a.eb(k||b,f,c,b)):a.e.ma(b);f=
e;(r=a.a.f.get(b,h))&&"function"==typeof r.p&&r.p();a.a.f.set(b,h,f&&f.$()?f:p)}};a.h.ka.template=function(b){b=a.h.bb(b);return 1==b.length&&b[0].unknown||a.h.vc(b,"name")?null:"This template engine does not support anonymous templates nested within its templates"};a.e.R.template=!0})();a.b("setTemplateEngine",a.hb);a.b("renderTemplate",a.eb);a.a.Cb=function(a,d,c){if(a.length&&d.length){var e,f,k,h,l;for(e=f=0;(!c||e<c)&&(h=a[f]);++f){for(k=0;l=d[k];++k)if(h.value===l.value){h.moved=l.index;l.moved=
h.index;d.splice(k,1);e=k=0;break}e+=k}}};a.a.Ma=function(){function b(b,c,e,f,k){var h=Math.min,l=Math.max,g=[],m,p=b.length,q,n=c.length,r=n-p||1,v=p+n+1,t,u,w;for(m=0;m<=p;m++)for(u=t,g.push(t=[]),w=h(n,m+r),q=l(0,m-1);q<=w;q++)t[q]=q?m?b[m-1]===c[q-1]?u[q-1]:h(u[q]||v,t[q-1]||v)+1:q+1:m+1;h=[];l=[];r=[];m=p;for(q=n;m||q;)n=g[m][q]-1,q&&n===g[m][q-1]?l.push(h[h.length]={status:e,value:c[--q],index:q}):m&&n===g[m-1][q]?r.push(h[h.length]={status:f,value:b[--m],index:m}):(--q,--m,k.sparse||h.push({status:"retained",
value:c[q]}));a.a.Cb(l,r,10*p);return h.reverse()}return function(a,c,e){e="boolean"===typeof e?{dontLimitMoves:e}:e||{};a=a||[];c=c||[];return a.length<=c.length?b(a,c,"added","deleted",e):b(c,a,"deleted","added",e)}}();a.b("utils.compareArrays",a.a.Ma);(function(){function b(b,d,f,k,h){var l=[],g=a.j(function(){var g=d(f,h,a.a.na(l,b))||[];0<l.length&&(a.a.Qb(l,g),k&&a.k.u(k,null,[f,g,h]));l.length=0;a.a.ia(l,g)},null,{q:b,Pa:function(){return!a.a.tb(l)}});return{aa:l,j:g.$()?g:p}}var d=a.a.f.I();
a.a.fb=function(c,e,f,k,h){function l(b,d){s=u[d];t!==d&&(z[b]=s);s.Ua(t++);a.a.na(s.aa,c);r.push(s);y.push(s)}function g(b,c){if(b)for(var d=0,e=c.length;d<e;d++)c[d]&&a.a.o(c[d].aa,function(a){b(a,d,c[d].wa)})}e=e||[];k=k||{};var m=a.a.f.get(c,d)===p,u=a.a.f.get(c,d)||[],q=a.a.Ka(u,function(a){return a.wa}),n=a.a.Ma(q,e,k.dontLimitMoves),r=[],v=0,t=0,w=[],y=[];e=[];for(var z=[],q=[],s,C=0,D,E;D=n[C];C++)switch(E=D.moved,D.status){case "deleted":E===p&&(s=u[v],s.j&&s.j.p(),w.push.apply(w,a.a.na(s.aa,
c)),k.beforeRemove&&(e[C]=s,y.push(s)));v++;break;case "retained":l(C,v++);break;case "added":E!==p?l(C,E):(s={wa:D.value,Ua:a.r(t++)},r.push(s),y.push(s),m||(q[C]=s))}g(k.beforeMove,z);a.a.o(w,k.beforeRemove?a.S:a.removeNode);for(var C=0,m=a.e.firstChild(c),H;s=y[C];C++){s.aa||a.a.extend(s,b(c,f,s.wa,h,s.Ua));for(v=0;n=s.aa[v];m=n.nextSibling,H=n,v++)n!==m&&a.e.Fb(c,n,H);!s.rc&&h&&(h(s.wa,s.aa,s.Ua),s.rc=!0)}g(k.beforeRemove,e);g(k.afterMove,z);g(k.afterAdd,q);a.a.f.set(c,d,r)}})();a.b("utils.setDomNodeChildrenFromArrayMapping",
a.a.fb);a.P=function(){this.allowTemplateRewriting=!1};a.P.prototype=new a.J;a.P.prototype.renderTemplateSource=function(b,d,c,e){if(d=(9>a.a.M?0:b.nodes)?b.nodes():null)return a.a.O(d.cloneNode(!0).childNodes);b=b.text();return a.a.ca(b,e)};a.P.Va=new a.P;a.hb(a.P.Va);a.b("nativeTemplateEngine",a.P);(function(){a.Ya=function(){var a=this.uc=function(){if(!u||!u.tmpl)return 0;try{if(0<=u.tmpl.tag.tmpl.open.toString().indexOf("__"))return 2}catch(a){}return 1}();this.renderTemplateSource=function(b,
e,f,k){k=k||w;f=f||{};if(2>a)throw Error("Your version of jQuery.tmpl is too old. Please upgrade to jQuery.tmpl 1.0.0pre or later.");var h=b.data("precompiled");h||(h=b.text()||"",h=u.template(null,"{{ko_with $item.koBindingContext}}"+h+"{{/ko_with}}"),b.data("precompiled",h));b=[e.$data];e=u.extend({koBindingContext:e},f.templateOptions);e=u.tmpl(h,b,e);e.appendTo(k.createElement("div"));u.fragments={};return e};this.createJavaScriptEvaluatorBlock=function(a){return"{{ko_code ((function() { return "+
a+" })()) }}"};this.addTemplate=function(a,b){w.write("<script type='text/html' id='"+a+"'>"+b+"\x3c/script>")};0<a&&(u.tmpl.tag.ko_code={open:"__.push($1 || '');"},u.tmpl.tag.ko_with={open:"with($1) {",close:"} "})};a.Ya.prototype=new a.J;var b=new a.Ya;0<b.uc&&a.hb(b);a.b("jqueryTmplTemplateEngine",a.Ya)})()})})();})();

/*global $, define, window */

/**
 * Copyright 2013 Tim Down.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * log4javascript
 *
 * log4javascript is a logging framework for JavaScript based on log4j
 * for Java. This file contains all core log4javascript code and is the only
 * file required to use log4javascript, unless you require support for
 * document.domain, in which case you will also need console.html, which must be
 * stored in the same directory as the main log4javascript.js file.
 *
 * Author: Tim Down <tim@log4javascript.org>
 * Version: 1.4.6
 * Edition: log4javascript
 * Build date: 19 March 2013
 * Website: http://log4javascript.org
 */

/* -------------------------------------------------------------------------- */
// Array-related stuff

// Next three methods are solely for IE5, which is missing them
if (!Array.prototype.push) {
	Array.prototype.push = function() {
		for (var i = 0, len = arguments.length; i < len; i++){
			this[this.length] = arguments[i];
		}
		return this.length;
	};
}

if (!Array.prototype.shift) {
	Array.prototype.shift = function() {
		if (this.length > 0) {
			var firstItem = this[0];
			for (var i = 0, len = this.length - 1; i < len; i++) {
				this[i] = this[i + 1];
			}
			this.length = this.length - 1;
			return firstItem;
		}
	};
}

if (!Array.prototype.splice) {
	Array.prototype.splice = function(startIndex, deleteCount) {
		var itemsAfterDeleted = this.slice(startIndex + deleteCount);
		var itemsDeleted = this.slice(startIndex, startIndex + deleteCount);
		this.length = startIndex;
		// Copy the arguments into a proper Array object
		var argumentsArray = [];
		for (var i = 0, len = arguments.length; i < len; i++) {
			argumentsArray[i] = arguments[i];
		}
		var itemsToAppend = (argumentsArray.length > 2) ?
			itemsAfterDeleted = argumentsArray.slice(2).concat(itemsAfterDeleted) : itemsAfterDeleted;
		for (i = 0, len = itemsToAppend.length; i < len; i++) {
			this.push(itemsToAppend[i]);
		}
		return itemsDeleted;
	};
}

/* -------------------------------------------------------------------------- */


var log4javascript = (function() {

	function isUndefined(obj) {
		return typeof obj == "undefined";
	}

	/* ---------------------------------------------------------------------- */
	// Custom event support

	function EventSupport() {}

	EventSupport.prototype = {
		eventTypes: [],
		eventListeners: {},
		setEventTypes: function(eventTypesParam) {
			if (eventTypesParam instanceof Array) {
				this.eventTypes = eventTypesParam;
				this.eventListeners = {};
				for (var i = 0, len = this.eventTypes.length; i < len; i++) {
					this.eventListeners[this.eventTypes[i]] = [];
				}
			} else {
				handleError("log4javascript.EventSupport [" + this + "]: setEventTypes: eventTypes parameter must be an Array");
			}
		},

		addEventListener: function(eventType, listener) {
			if (typeof listener == "function") {
				if (!array_contains(this.eventTypes, eventType)) {
					handleError("log4javascript.EventSupport [" + this + "]: addEventListener: no event called '" + eventType + "'");
				}
				this.eventListeners[eventType].push(listener);
			} else {
				handleError("log4javascript.EventSupport [" + this + "]: addEventListener: listener must be a function");
			}
		},

		removeEventListener: function(eventType, listener) {
			if (typeof listener == "function") {
				if (!array_contains(this.eventTypes, eventType)) {
					handleError("log4javascript.EventSupport [" + this + "]: removeEventListener: no event called '" + eventType + "'");
				}
				array_remove(this.eventListeners[eventType], listener);
			} else {
				handleError("log4javascript.EventSupport [" + this + "]: removeEventListener: listener must be a function");
			}
		},

		dispatchEvent: function(eventType, eventArgs) {
			if (array_contains(this.eventTypes, eventType)) {
				var listeners = this.eventListeners[eventType];
				for (var i = 0, len = listeners.length; i < len; i++) {
					listeners[i](this, eventType, eventArgs);
				}
			} else {
				handleError("log4javascript.EventSupport [" + this + "]: dispatchEvent: no event called '" + eventType + "'");
			}
		}
	};

	/* -------------------------------------------------------------------------- */

	var applicationStartDate = new Date();
	var uniqueId = "log4javascript_" + applicationStartDate.getTime() + "_" +
		Math.floor(Math.random() * 100000000);
	var emptyFunction = function() {};
	var newLine = "\r\n";
	var pageLoaded = false;

	// Create main log4javascript object; this will be assigned public properties
	function Log4JavaScript() {}
	Log4JavaScript.prototype = new EventSupport();

	log4javascript = new Log4JavaScript();
	log4javascript.version = "1.4.6";
	log4javascript.edition = "log4javascript";

	/* -------------------------------------------------------------------------- */
	// Utility functions

	function toStr(obj) {
		if (obj && obj.toString) {
			return obj.toString();
		} else {
			return String(obj);
		}
	}

	function getExceptionMessage(ex) {
		if (ex.message) {
			return ex.message;
		} else if (ex.description) {
			return ex.description;
		} else {
			return toStr(ex);
		}
	}

	// Gets the portion of the URL after the last slash
	function getUrlFileName(url) {
		var lastSlashIndex = Math.max(url.lastIndexOf("/"), url.lastIndexOf("\\"));
		return url.substr(lastSlashIndex + 1);
	}

	// Returns a nicely formatted representation of an error
	function getExceptionStringRep(ex) {
		if (ex) {
			var exStr = "Exception: " + getExceptionMessage(ex);
			try {
				if (ex.lineNumber) {
					exStr += " on line number " + ex.lineNumber;
				}
				if (ex.fileName) {
					exStr += " in file " + getUrlFileName(ex.fileName);
				}
			} catch (localEx) {
				logLog.warn("Unable to obtain file and line information for error");
			}
			if (showStackTraces && ex.stack) {
				exStr += newLine + "Stack trace:" + newLine + ex.stack;
			}
			return exStr;
		}
		return null;
	}

	function bool(obj) {
		return Boolean(obj);
	}

	function trim(str) {
		return str.replace(/^\s+/, "").replace(/\s+$/, "");
	}

	function splitIntoLines(text) {
		// Ensure all line breaks are \n only
		var text2 = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
		return text2.split("\n");
	}

	var urlEncode = (typeof window.encodeURIComponent != "undefined") ?
		function(str) {
			return encodeURIComponent(str);
		}: 
		function(str) {
			return escape(str).replace(/\+/g, "%2B").replace(/"/g, "%22").replace(/'/g, "%27").replace(/\//g, "%2F").replace(/=/g, "%3D");
		};

	var urlDecode = (typeof window.decodeURIComponent != "undefined") ?
		function(str) {
			return decodeURIComponent(str);
		}: 
		function(str) {
			return unescape(str).replace(/%2B/g, "+").replace(/%22/g, "\"").replace(/%27/g, "'").replace(/%2F/g, "/").replace(/%3D/g, "=");
		};

	function array_remove(arr, val) {
		var index = -1;
		for (var i = 0, len = arr.length; i < len; i++) {
			if (arr[i] === val) {
				index = i;
				break;
			}
		}
		if (index >= 0) {
			arr.splice(index, 1);
			return true;
		} else {
			return false;
		}
	}

	function array_contains(arr, val) {
		for(var i = 0, len = arr.length; i < len; i++) {
			if (arr[i] == val) {
				return true;
			}
		}
		return false;
	}

	function extractBooleanFromParam(param, defaultValue) {
		if (isUndefined(param)) {
			return defaultValue;
		} else {
			return bool(param);
		}
	}

	function extractStringFromParam(param, defaultValue) {
		if (isUndefined(param)) {
			return defaultValue;
		} else {
			return String(param);
		}
	}

	function extractIntFromParam(param, defaultValue) {
		if (isUndefined(param)) {
			return defaultValue;
		} else {
			try {
				var value = parseInt(param, 10);
				return isNaN(value) ? defaultValue : value;
			} catch (ex) {
				logLog.warn("Invalid int param " + param, ex);
				return defaultValue;
			}
		}
	}

	function extractFunctionFromParam(param, defaultValue) {
		if (typeof param == "function") {
			return param;
		} else {
			return defaultValue;
		}
	}

	function isError(err) {
		return (err instanceof Error);
	}

	if (!Function.prototype.apply){
		Function.prototype.apply = function(obj, args) {
			var methodName = "__apply__";
			if (typeof obj[methodName] != "undefined") {
				methodName += String(Math.random()).substr(2);
			}
			obj[methodName] = this;

			var argsStrings = [];
			for (var i = 0, len = args.length; i < len; i++) {
				argsStrings[i] = "args[" + i + "]";
			}
			var script = "obj." + methodName + "(" + argsStrings.join(",") + ")";
			var returnValue = eval(script);
			delete obj[methodName];
			return returnValue;
		};
	}

	if (!Function.prototype.call){
		Function.prototype.call = function(obj) {
			var args = [];
			for (var i = 1, len = arguments.length; i < len; i++) {
				args[i - 1] = arguments[i];
			}
			return this.apply(obj, args);
		};
	}

	function getListenersPropertyName(eventName) {
		return "__log4javascript_listeners__" + eventName;
	}

	function addEvent(node, eventName, listener, useCapture, win) {
		win = win ? win : window;
		if (node.addEventListener) {
			node.addEventListener(eventName, listener, useCapture);
		} else if (node.attachEvent) {
			node.attachEvent("on" + eventName, listener);
		} else {
			var propertyName = getListenersPropertyName(eventName);
			if (!node[propertyName]) {
				node[propertyName] = [];
				// Set event handler
				node["on" + eventName] = function(evt) {
					evt = getEvent(evt, win);
					var listenersPropertyName = getListenersPropertyName(eventName);

					// Clone the array of listeners to leave the original untouched
					var listeners = this[listenersPropertyName].concat([]);
					var currentListener;

					// Call each listener in turn
					while ((currentListener = listeners.shift())) {
						currentListener.call(this, evt);
					}
				};
			}
			node[propertyName].push(listener);
		}
	}

	function removeEvent(node, eventName, listener, useCapture) {
		if (node.removeEventListener) {
			node.removeEventListener(eventName, listener, useCapture);
		} else if (node.detachEvent) {
			node.detachEvent("on" + eventName, listener);
		} else {
			var propertyName = getListenersPropertyName(eventName);
			if (node[propertyName]) {
				array_remove(node[propertyName], listener);
			}
		}
	}

	function getEvent(evt, win) {
		win = win ? win : window;
		return evt ? evt : win.event;
	}

	function stopEventPropagation(evt) {
		if (evt.stopPropagation) {
			evt.stopPropagation();
		} else if (typeof evt.cancelBubble != "undefined") {
			evt.cancelBubble = true;
		}
		evt.returnValue = false;
	}

	/* ---------------------------------------------------------------------- */
	// Simple logging for log4javascript itself

	var logLog = {
		quietMode: false,

		debugMessages: [],

		setQuietMode: function(quietMode) {
			this.quietMode = bool(quietMode);
		},

		numberOfErrors: 0,

		alertAllErrors: false,

		setAlertAllErrors: function(alertAllErrors) {
			this.alertAllErrors = alertAllErrors;
		},

		debug: function(message) {
			this.debugMessages.push(message);
		},

		displayDebug: function() {
			alert(this.debugMessages.join(newLine));
		},

		warn: function(message, exception) {
		},

		error: function(message, exception) {
			if (++this.numberOfErrors == 1 || this.alertAllErrors) {
				if (!this.quietMode) {
					var alertMessage = "log4javascript error: " + message;
					if (exception) {
						alertMessage += newLine + newLine + "Original error: " + getExceptionStringRep(exception);
					}
					alert(alertMessage);
				}
			}
		}
	};
	log4javascript.logLog = logLog;

	log4javascript.setEventTypes(["load", "error"]);

	function handleError(message, exception) {
		logLog.error(message, exception);
		log4javascript.dispatchEvent("error", { "message": message, "exception": exception });
	}

	log4javascript.handleError = handleError;

	/* ---------------------------------------------------------------------- */

	var enabled = !((typeof log4javascript_disabled != "undefined") &&
					log4javascript_disabled);

	log4javascript.setEnabled = function(enable) {
		enabled = bool(enable);
	};

	log4javascript.isEnabled = function() {
		return enabled;
	};

	var useTimeStampsInMilliseconds = true;

	log4javascript.setTimeStampsInMilliseconds = function(timeStampsInMilliseconds) {
		useTimeStampsInMilliseconds = bool(timeStampsInMilliseconds);
	};

	log4javascript.isTimeStampsInMilliseconds = function() {
		return useTimeStampsInMilliseconds;
	};
	

	// This evaluates the given expression in the current scope, thus allowing
	// scripts to access private variables. Particularly useful for testing
	log4javascript.evalInScope = function(expr) {
		return eval(expr);
	};

	var showStackTraces = false;

	log4javascript.setShowStackTraces = function(show) {
		showStackTraces = bool(show);
	};

	/* ---------------------------------------------------------------------- */
	// Levels

	var Level = function(level, name) {
		this.level = level;
		this.name = name;
	};

	Level.prototype = {
		toString: function() {
			return this.name;
		},
		equals: function(level) {
			return this.level == level.level;
		},
		isGreaterOrEqual: function(level) {
			return this.level >= level.level;
		}
	};

	Level.ALL = new Level(Number.MIN_VALUE, "ALL");
	Level.TRACE = new Level(10000, "TRACE");
	Level.DEBUG = new Level(20000, "DEBUG");
	Level.INFO = new Level(30000, "INFO");
	Level.WARN = new Level(40000, "WARN");
	Level.ERROR = new Level(50000, "ERROR");
	Level.FATAL = new Level(60000, "FATAL");
	Level.OFF = new Level(Number.MAX_VALUE, "OFF");

	log4javascript.Level = Level;

	/* ---------------------------------------------------------------------- */
	// Timers

	function Timer(name, level) {
		this.name = name;
		this.level = isUndefined(level) ? Level.INFO : level;
		this.start = new Date();
	}

	Timer.prototype.getElapsedTime = function() {
		return new Date().getTime() - this.start.getTime();
	};

	/* ---------------------------------------------------------------------- */
	// Loggers

	var anonymousLoggerName = "[anonymous]";
	var defaultLoggerName = "[default]";
	var nullLoggerName = "[null]";
	var rootLoggerName = "root";

	function Logger(name) {
		this.name = name;
		this.parent = null;
		this.children = [];

		var appenders = [];
		var loggerLevel = null;
		var isRoot = (this.name === rootLoggerName);
		var isNull = (this.name === nullLoggerName);

		var appenderCache = null;
		var appenderCacheInvalidated = false;
		
		this.addChild = function(childLogger) {
			this.children.push(childLogger);
			childLogger.parent = this;
			childLogger.invalidateAppenderCache();
		};

		// Additivity
		var additive = true;
		this.getAdditivity = function() {
			return additive;
		};

		this.setAdditivity = function(additivity) {
			var valueChanged = (additive != additivity);
			additive = additivity;
			if (valueChanged) {
				this.invalidateAppenderCache();
			}
		};

		// Create methods that use the appenders variable in this scope
		this.addAppender = function(appender) {
			if (isNull) {
				handleError("Logger.addAppender: you may not add an appender to the null logger");
			} else {
				if (appender instanceof log4javascript.Appender) {
					if (!array_contains(appenders, appender)) {
						appenders.push(appender);
						appender.setAddedToLogger(this);
						this.invalidateAppenderCache();
					}
				} else {
					handleError("Logger.addAppender: appender supplied ('" +
						toStr(appender) + "') is not a subclass of Appender");
				}
			}
		};

		this.removeAppender = function(appender) {
			array_remove(appenders, appender);
			appender.setRemovedFromLogger(this);
			this.invalidateAppenderCache();
		};

		this.removeAllAppenders = function() {
			var appenderCount = appenders.length;
			if (appenderCount > 0) {
				for (var i = 0; i < appenderCount; i++) {
					appenders[i].setRemovedFromLogger(this);
				}
				appenders.length = 0;
				this.invalidateAppenderCache();
			}
		};

		this.getEffectiveAppenders = function() {
			if (appenderCache === null || appenderCacheInvalidated) {
				// Build appender cache
				var parentEffectiveAppenders = (isRoot || !this.getAdditivity()) ?
					[] : this.parent.getEffectiveAppenders();
				appenderCache = parentEffectiveAppenders.concat(appenders);
				appenderCacheInvalidated = false;
			}
			return appenderCache;
		};
		
		this.invalidateAppenderCache = function() {
			appenderCacheInvalidated = true;
			for (var i = 0, len = this.children.length; i < len; i++) {
				this.children[i].invalidateAppenderCache();
			}
		};

		this.log = function(level, params) {
			if (enabled && level.isGreaterOrEqual(this.getEffectiveLevel())) {
				// Check whether last param is an exception
				var exception;
				var finalParamIndex = params.length - 1;
				var lastParam = params[finalParamIndex];
				if (params.length > 1 && isError(lastParam)) {
					exception = lastParam;
					finalParamIndex--;
				}

				// Construct genuine array for the params
				var messages = [];
				for (var i = 0; i <= finalParamIndex; i++) {
					messages[i] = params[i];
				}

				var loggingEvent = new LoggingEvent(
					this, new Date(), level, messages, exception);

				this.callAppenders(loggingEvent);
			}
		};

		this.callAppenders = function(loggingEvent) {
			var effectiveAppenders = this.getEffectiveAppenders();
			for (var i = 0, len = effectiveAppenders.length; i < len; i++) {
				effectiveAppenders[i].doAppend(loggingEvent);
			}
		};

		this.setLevel = function(level) {
			// Having a level of null on the root logger would be very bad.
			if (isRoot && level === null) {
				handleError("Logger.setLevel: you cannot set the level of the root logger to null");
			} else if (level instanceof Level) {
				loggerLevel = level;
			} else {
				handleError("Logger.setLevel: level supplied to logger " +
					this.name + " is not an instance of log4javascript.Level");
			}
		};

		this.getLevel = function() {
			return loggerLevel;
		};

		this.getEffectiveLevel = function() {
			for (var logger = this; logger !== null; logger = logger.parent) {
				var level = logger.getLevel();
				if (level !== null) {
					return level;
				}
			}
		};

		this.group = function(name, initiallyExpanded) {
			if (enabled) {
				var effectiveAppenders = this.getEffectiveAppenders();
				for (var i = 0, len = effectiveAppenders.length; i < len; i++) {
					effectiveAppenders[i].group(name, initiallyExpanded);
				}
			}
		};

		this.groupEnd = function() {
			if (enabled) {
				var effectiveAppenders = this.getEffectiveAppenders();
				for (var i = 0, len = effectiveAppenders.length; i < len; i++) {
					effectiveAppenders[i].groupEnd();
				}
			}
		};

		var timers = {};

		this.time = function(name, level) {
			if (enabled) {
				if (isUndefined(name)) {
					handleError("Logger.time: a name for the timer must be supplied");
				} else if (level && !(level instanceof Level)) {
					handleError("Logger.time: level supplied to timer " +
						name + " is not an instance of log4javascript.Level");
				} else {
					timers[name] = new Timer(name, level);
				}
			}
		};

		this.timeEnd = function(name) {
			if (enabled) {
				if (isUndefined(name)) {
					handleError("Logger.timeEnd: a name for the timer must be supplied");
				} else if (timers[name]) {
					var timer = timers[name];
					var milliseconds = timer.getElapsedTime();
					this.log(timer.level, ["Timer " + toStr(name) + " completed in " + milliseconds + "ms"]);
					delete timers[name];
				} else {
					logLog.warn("Logger.timeEnd: no timer found with name " + name);
				}
			}
		};

		this.assert = function(expr) {
			if (enabled && !expr) {
				var args = [];
				for (var i = 1, len = arguments.length; i < len; i++) {
					args.push(arguments[i]);
				}
				args = (args.length > 0) ? args : ["Assertion Failure"];
				args.push(newLine);
				args.push(expr);
				this.log(Level.ERROR, args);
			}
		};

		this.toString = function() {
			return "Logger[" + this.name + "]";
		};
	}

	Logger.prototype = {
		trace: function() {
			this.log(Level.TRACE, arguments);
		},

		debug: function() {
			this.log(Level.DEBUG, arguments);
		},

		info: function() {
			this.log(Level.INFO, arguments);
		},

		warn: function() {
			this.log(Level.WARN, arguments);
		},

		error: function() {
			this.log(Level.ERROR, arguments);
		},

		fatal: function() {
			this.log(Level.FATAL, arguments);
		},

		isEnabledFor: function(level) {
			return level.isGreaterOrEqual(this.getEffectiveLevel());
		},

		isTraceEnabled: function() {
			return this.isEnabledFor(Level.TRACE);
		},

		isDebugEnabled: function() {
			return this.isEnabledFor(Level.DEBUG);
		},

		isInfoEnabled: function() {
			return this.isEnabledFor(Level.INFO);
		},

		isWarnEnabled: function() {
			return this.isEnabledFor(Level.WARN);
		},

		isErrorEnabled: function() {
			return this.isEnabledFor(Level.ERROR);
		},

		isFatalEnabled: function() {
			return this.isEnabledFor(Level.FATAL);
		}
	};

	Logger.prototype.trace.isEntryPoint = true;
	Logger.prototype.debug.isEntryPoint = true;
	Logger.prototype.info.isEntryPoint = true;
	Logger.prototype.warn.isEntryPoint = true;
	Logger.prototype.error.isEntryPoint = true;
	Logger.prototype.fatal.isEntryPoint = true;

	/* ---------------------------------------------------------------------- */
	// Logger access methods

	// Hashtable of loggers keyed by logger name
	var loggers = {};
	var loggerNames = [];

	var ROOT_LOGGER_DEFAULT_LEVEL = Level.DEBUG;
	var rootLogger = new Logger(rootLoggerName);
	rootLogger.setLevel(ROOT_LOGGER_DEFAULT_LEVEL);

	log4javascript.getRootLogger = function() {
		return rootLogger;
	};

	log4javascript.getLogger = function(loggerName) {
		// Use default logger if loggerName is not specified or invalid
		if (!(typeof loggerName == "string")) {
			loggerName = anonymousLoggerName;
			logLog.warn("log4javascript.getLogger: non-string logger name "	+
				toStr(loggerName) + " supplied, returning anonymous logger");
		}

		// Do not allow retrieval of the root logger by name
		if (loggerName == rootLoggerName) {
			handleError("log4javascript.getLogger: root logger may not be obtained by name");
		}

		// Create the logger for this name if it doesn't already exist
		if (!loggers[loggerName]) {
			var logger = new Logger(loggerName);
			loggers[loggerName] = logger;
			loggerNames.push(loggerName);

			// Set up parent logger, if it doesn't exist
			var lastDotIndex = loggerName.lastIndexOf(".");
			var parentLogger;
			if (lastDotIndex > -1) {
				var parentLoggerName = loggerName.substring(0, lastDotIndex);
				parentLogger = log4javascript.getLogger(parentLoggerName); // Recursively sets up grandparents etc.
			} else {
				parentLogger = rootLogger;
			}
			parentLogger.addChild(logger);
		}
		return loggers[loggerName];
	};

	var defaultLogger = null;
	log4javascript.getDefaultLogger = function() {
		if (!defaultLogger) {
			defaultLogger = log4javascript.getLogger(defaultLoggerName);
			var a = new log4javascript.PopUpAppender();
			defaultLogger.addAppender(a);
		}
		return defaultLogger;
	};

	var nullLogger = null;
	log4javascript.getNullLogger = function() {
		if (!nullLogger) {
			nullLogger = new Logger(nullLoggerName);
			nullLogger.setLevel(Level.OFF);
		}
		return nullLogger;
	};

	// Destroys all loggers
	log4javascript.resetConfiguration = function() {
		rootLogger.setLevel(ROOT_LOGGER_DEFAULT_LEVEL);
		loggers = {};
	};

	/* ---------------------------------------------------------------------- */
	// Logging events

	var LoggingEvent = function(logger, timeStamp, level, messages,
			exception) {
		this.logger = logger;
		this.timeStamp = timeStamp;
		this.timeStampInMilliseconds = timeStamp.getTime();
		this.timeStampInSeconds = Math.floor(this.timeStampInMilliseconds / 1000);
		this.milliseconds = this.timeStamp.getMilliseconds();
		this.level = level;
		this.messages = messages;
		this.exception = exception;
	};

	LoggingEvent.prototype = {
		getThrowableStrRep: function() {
			return this.exception ?
				getExceptionStringRep(this.exception) : "";
		},
		getCombinedMessages: function() {
			return (this.messages.length == 1) ? this.messages[0] :
				   this.messages.join(newLine);
		},
		toString: function() {
			return "LoggingEvent[" + this.level + "]";
		}
	};

	log4javascript.LoggingEvent = LoggingEvent;

	/* ---------------------------------------------------------------------- */
	// Layout prototype

	var Layout = function() {
	};

	Layout.prototype = {
		defaults: {
			loggerKey: "logger",
			timeStampKey: "timestamp",
			millisecondsKey: "milliseconds",
			levelKey: "level",
			messageKey: "message",
			exceptionKey: "exception",
			urlKey: "url"
		},
		loggerKey: "logger",
		timeStampKey: "timestamp",
		millisecondsKey: "milliseconds",
		levelKey: "level",
		messageKey: "message",
		exceptionKey: "exception",
		urlKey: "url",
		batchHeader: "",
		batchFooter: "",
		batchSeparator: "",
		returnsPostData: false,
		overrideTimeStampsSetting: false,
		useTimeStampsInMilliseconds: null,

		format: function() {
			handleError("Layout.format: layout supplied has no format() method");
		},

		ignoresThrowable: function() {
			handleError("Layout.ignoresThrowable: layout supplied has no ignoresThrowable() method");
		},

		getContentType: function() {
			return "text/plain";
		},

		allowBatching: function() {
			return true;
		},

		setTimeStampsInMilliseconds: function(timeStampsInMilliseconds) {
			this.overrideTimeStampsSetting = true;
			this.useTimeStampsInMilliseconds = bool(timeStampsInMilliseconds);
		},

		isTimeStampsInMilliseconds: function() {
			return this.overrideTimeStampsSetting ?
				this.useTimeStampsInMilliseconds : useTimeStampsInMilliseconds;
		},

		getTimeStampValue: function(loggingEvent) {
			return this.isTimeStampsInMilliseconds() ?
				loggingEvent.timeStampInMilliseconds : loggingEvent.timeStampInSeconds;
		},

		getDataValues: function(loggingEvent, combineMessages) {
			var dataValues = [
				[this.loggerKey, loggingEvent.logger.name],
				[this.timeStampKey, this.getTimeStampValue(loggingEvent)],
				[this.levelKey, loggingEvent.level.name],
				[this.urlKey, window.location.href],
				[this.messageKey, combineMessages ? loggingEvent.getCombinedMessages() : loggingEvent.messages]
			];
			if (!this.isTimeStampsInMilliseconds()) {
				dataValues.push([this.millisecondsKey, loggingEvent.milliseconds]);
			}
			if (loggingEvent.exception) {
				dataValues.push([this.exceptionKey, getExceptionStringRep(loggingEvent.exception)]);
			}
			if (this.hasCustomFields()) {
				for (var i = 0, len = this.customFields.length; i < len; i++) {
					var val = this.customFields[i].value;

					// Check if the value is a function. If so, execute it, passing it the
					// current layout and the logging event
					if (typeof val === "function") {
						val = val(this, loggingEvent);
					}
					dataValues.push([this.customFields[i].name, val]);
				}
			}
			return dataValues;
		},

		setKeys: function(loggerKey, timeStampKey, levelKey, messageKey,
				exceptionKey, urlKey, millisecondsKey) {
			this.loggerKey = extractStringFromParam(loggerKey, this.defaults.loggerKey);
			this.timeStampKey = extractStringFromParam(timeStampKey, this.defaults.timeStampKey);
			this.levelKey = extractStringFromParam(levelKey, this.defaults.levelKey);
			this.messageKey = extractStringFromParam(messageKey, this.defaults.messageKey);
			this.exceptionKey = extractStringFromParam(exceptionKey, this.defaults.exceptionKey);
			this.urlKey = extractStringFromParam(urlKey, this.defaults.urlKey);
			this.millisecondsKey = extractStringFromParam(millisecondsKey, this.defaults.millisecondsKey);
		},

		setCustomField: function(name, value) {
			var fieldUpdated = false;
			for (var i = 0, len = this.customFields.length; i < len; i++) {
				if (this.customFields[i].name === name) {
					this.customFields[i].value = value;
					fieldUpdated = true;
				}
			}
			if (!fieldUpdated) {
				this.customFields.push({"name": name, "value": value});
			}
		},

		hasCustomFields: function() {
			return (this.customFields.length > 0);
		},

		toString: function() {
			handleError("Layout.toString: all layouts must override this method");
		}
	};

	log4javascript.Layout = Layout;

	/* ---------------------------------------------------------------------- */
	// Appender prototype

	var Appender = function() {};

	Appender.prototype = new EventSupport();

	Appender.prototype.layout = new PatternLayout();
	Appender.prototype.threshold = Level.ALL;
	Appender.prototype.loggers = [];

	// Performs threshold checks before delegating actual logging to the
	// subclass's specific append method.
	Appender.prototype.doAppend = function(loggingEvent) {
		if (enabled && loggingEvent.level.level >= this.threshold.level) {
			this.append(loggingEvent);
		}
	};

	Appender.prototype.append = function(loggingEvent) {};

	Appender.prototype.setLayout = function(layout) {
		if (layout instanceof Layout) {
			this.layout = layout;
		} else {
			handleError("Appender.setLayout: layout supplied to " +
				this.toString() + " is not a subclass of Layout");
		}
	};

	Appender.prototype.getLayout = function() {
		return this.layout;
	};

	Appender.prototype.setThreshold = function(threshold) {
		if (threshold instanceof Level) {
			this.threshold = threshold;
		} else {
			handleError("Appender.setThreshold: threshold supplied to " +
				this.toString() + " is not a subclass of Level");
		}
	};

	Appender.prototype.getThreshold = function() {
		return this.threshold;
	};

	Appender.prototype.setAddedToLogger = function(logger) {
		this.loggers.push(logger);
	};

	Appender.prototype.setRemovedFromLogger = function(logger) {
		array_remove(this.loggers, logger);
	};

	Appender.prototype.group = emptyFunction;
	Appender.prototype.groupEnd = emptyFunction;

	Appender.prototype.toString = function() {
		handleError("Appender.toString: all appenders must override this method");
	};

	log4javascript.Appender = Appender;

	/* ---------------------------------------------------------------------- */
	// SimpleLayout 

	function SimpleLayout() {
		this.customFields = [];
	}

	SimpleLayout.prototype = new Layout();

	SimpleLayout.prototype.format = function(loggingEvent) {
		return loggingEvent.level.name + " - " + loggingEvent.getCombinedMessages();
	};

	SimpleLayout.prototype.ignoresThrowable = function() {
	    return true;
	};

	SimpleLayout.prototype.toString = function() {
	    return "SimpleLayout";
	};

	log4javascript.SimpleLayout = SimpleLayout;
	/* ----------------------------------------------------------------------- */
	// NullLayout 

	function NullLayout() {
		this.customFields = [];
	}

	NullLayout.prototype = new Layout();

	NullLayout.prototype.format = function(loggingEvent) {
		return loggingEvent.messages;
	};

	NullLayout.prototype.ignoresThrowable = function() {
	    return true;
	};

	NullLayout.prototype.toString = function() {
	    return "NullLayout";
	};

	log4javascript.NullLayout = NullLayout;
/* ---------------------------------------------------------------------- */
	// XmlLayout

	function XmlLayout(combineMessages) {
		this.combineMessages = extractBooleanFromParam(combineMessages, true);
		this.customFields = [];
	}

	XmlLayout.prototype = new Layout();

	XmlLayout.prototype.isCombinedMessages = function() {
		return this.combineMessages;
	};

	XmlLayout.prototype.getContentType = function() {
		return "text/xml";
	};

	XmlLayout.prototype.escapeCdata = function(str) {
		return str.replace(/\]\]>/, "]]>]]&gt;<![CDATA[");
	};

	XmlLayout.prototype.format = function(loggingEvent) {
		var layout = this;
		var i, len;
		function formatMessage(message) {
			message = (typeof message === "string") ? message : toStr(message);
			return "<log4javascript:message><![CDATA[" +
				layout.escapeCdata(message) + "]]></log4javascript:message>";
		}

		var str = "<log4javascript:event logger=\"" + loggingEvent.logger.name +
			"\" timestamp=\"" + this.getTimeStampValue(loggingEvent) + "\"";
		if (!this.isTimeStampsInMilliseconds()) {
			str += " milliseconds=\"" + loggingEvent.milliseconds + "\"";
		}
		str += " level=\"" + loggingEvent.level.name + "\">" + newLine;
		if (this.combineMessages) {
			str += formatMessage(loggingEvent.getCombinedMessages());
		} else {
			str += "<log4javascript:messages>" + newLine;
			for (i = 0, len = loggingEvent.messages.length; i < len; i++) {
				str += formatMessage(loggingEvent.messages[i]) + newLine;
			}
			str += "</log4javascript:messages>" + newLine;
		}
		if (this.hasCustomFields()) {
			for (i = 0, len = this.customFields.length; i < len; i++) {
				str += "<log4javascript:customfield name=\"" +
					this.customFields[i].name + "\"><![CDATA[" +
					this.customFields[i].value.toString() +
					"]]></log4javascript:customfield>" + newLine;
			}
		}
		if (loggingEvent.exception) {
			str += "<log4javascript:exception><![CDATA[" +
				getExceptionStringRep(loggingEvent.exception) +
				"]]></log4javascript:exception>" + newLine;
		}
		str += "</log4javascript:event>" + newLine + newLine;
		return str;
	};

	XmlLayout.prototype.ignoresThrowable = function() {
	    return false;
	};

	XmlLayout.prototype.toString = function() {
	    return "XmlLayout";
	};

	log4javascript.XmlLayout = XmlLayout;
	/* ---------------------------------------------------------------------- */
	// JsonLayout related

	function escapeNewLines(str) {
		return str.replace(/\r\n|\r|\n/g, "\\r\\n");
	}

	function JsonLayout(readable, combineMessages) {
		this.readable = extractBooleanFromParam(readable, false);
		this.combineMessages = extractBooleanFromParam(combineMessages, true);
		this.batchHeader = this.readable ? "[" + newLine : "[";
		this.batchFooter = this.readable ? "]" + newLine : "]";
		this.batchSeparator = this.readable ? "," + newLine : ",";
		this.setKeys();
		this.colon = this.readable ? ": " : ":";
		this.tab = this.readable ? "\t" : "";
		this.lineBreak = this.readable ? newLine : "";
		this.customFields = [];
	}

	/* ---------------------------------------------------------------------- */
	// JsonLayout

	JsonLayout.prototype = new Layout();

	JsonLayout.prototype.isReadable = function() {
		return this.readable;
	};

	JsonLayout.prototype.isCombinedMessages = function() {
		return this.combineMessages;
	};

    JsonLayout.prototype.format = function(loggingEvent) {
        var layout = this;
        var dataValues = this.getDataValues(loggingEvent, this.combineMessages);
        var str = "{" + this.lineBreak;
        var i, len;

        function formatValue(val, prefix, expand) {
            // Check the type of the data value to decide whether quotation marks
            // or expansion are required
            var formattedValue;
            var valType = typeof val;
            if (val instanceof Date) {
                formattedValue = String(val.getTime());
            } else if (expand && (val instanceof Array)) {
                formattedValue = "[" + layout.lineBreak;
                for (var i = 0, len = val.length; i < len; i++) {
                    var childPrefix = prefix + layout.tab;
                    formattedValue += childPrefix + formatValue(val[i], childPrefix, false);
                    if (i < val.length - 1) {
                        formattedValue += ",";
                    }
                    formattedValue += layout.lineBreak;
                }
                formattedValue += prefix + "]";
            } else if (valType !== "number" && valType !== "boolean") {
                formattedValue = "\"" + escapeNewLines(toStr(val).replace(/\"/g, "\\\"")) + "\"";
            } else {
                formattedValue = val;
            }
            return formattedValue;
        }

        for (i = 0, len = dataValues.length - 1; i <= len; i++) {
            str += this.tab + "\"" + dataValues[i][0] + "\"" + this.colon + formatValue(dataValues[i][1], this.tab, true);
            if (i < len) {
                str += ",";
            }
            str += this.lineBreak;
        }

        str += "}" + this.lineBreak;
        return str;
    };

	JsonLayout.prototype.ignoresThrowable = function() {
	    return false;
	};

	JsonLayout.prototype.toString = function() {
	    return "JsonLayout";
	};

	JsonLayout.prototype.getContentType = function() {
		return "application/json";
	};

	log4javascript.JsonLayout = JsonLayout;
	/* ---------------------------------------------------------------------- */
	// HttpPostDataLayout

	function HttpPostDataLayout() {
		this.setKeys();
		this.customFields = [];
		this.returnsPostData = true;
	}

	HttpPostDataLayout.prototype = new Layout();

	// Disable batching
	HttpPostDataLayout.prototype.allowBatching = function() {
		return false;
	};

	HttpPostDataLayout.prototype.format = function(loggingEvent) {
		var dataValues = this.getDataValues(loggingEvent);
		var queryBits = [];
		for (var i = 0, len = dataValues.length; i < len; i++) {
			var val = (dataValues[i][1] instanceof Date) ?
				String(dataValues[i][1].getTime()) : dataValues[i][1];
			queryBits.push(urlEncode(dataValues[i][0]) + "=" + urlEncode(val));
		}
		return queryBits.join("&");
	};

	HttpPostDataLayout.prototype.ignoresThrowable = function(loggingEvent) {
	    return false;
	};

	HttpPostDataLayout.prototype.toString = function() {
	    return "HttpPostDataLayout";
	};

	log4javascript.HttpPostDataLayout = HttpPostDataLayout;
	/* ---------------------------------------------------------------------- */
	// formatObjectExpansion

	function formatObjectExpansion(obj, depth, indentation) {
		var objectsExpanded = [];

		function doFormat(obj, depth, indentation) {
			var i, j, len, childDepth, childIndentation, childLines, expansion,
				childExpansion;

			if (!indentation) {
				indentation = "";
			}

			function formatString(text) {
				var lines = splitIntoLines(text);
				for (var j = 1, jLen = lines.length; j < jLen; j++) {
					lines[j] = indentation + lines[j];
				}
				return lines.join(newLine);
			}

			if (obj === null) {
				return "null";
			} else if (typeof obj == "undefined") {
				return "undefined";
			} else if (typeof obj == "string") {
				return formatString(obj);
			} else if (typeof obj == "object" && array_contains(objectsExpanded, obj)) {
				try {
					expansion = toStr(obj);
				} catch (ex) {
					expansion = "Error formatting property. Details: " + getExceptionStringRep(ex);
				}
				return expansion + " [already expanded]";
			} else if ((obj instanceof Array) && depth > 0) {
				objectsExpanded.push(obj);
				expansion = "[" + newLine;
				childDepth = depth - 1;
				childIndentation = indentation + "  ";
				childLines = [];
				for (i = 0, len = obj.length; i < len; i++) {
					try {
						childExpansion = doFormat(obj[i], childDepth, childIndentation);
						childLines.push(childIndentation + childExpansion);
					} catch (ex) {
						childLines.push(childIndentation + "Error formatting array member. Details: " +
							getExceptionStringRep(ex) + "");
					}
				}
				expansion += childLines.join("," + newLine) + newLine + indentation + "]";
				return expansion;
            } else if (Object.prototype.toString.call(obj) == "[object Date]") {
                return obj.toString();
			} else if (typeof obj == "object" && depth > 0) {
				objectsExpanded.push(obj);
				expansion = "{" + newLine;
				childDepth = depth - 1;
				childIndentation = indentation + "  ";
				childLines = [];
				for (i in obj) {
					try {
						childExpansion = doFormat(obj[i], childDepth, childIndentation);
						childLines.push(childIndentation + i + ": " + childExpansion);
					} catch (ex) {
						childLines.push(childIndentation + i + ": Error formatting property. Details: " +
							getExceptionStringRep(ex));
					}
				}
				expansion += childLines.join("," + newLine) + newLine + indentation + "}";
				return expansion;
			} else {
				return formatString(toStr(obj));
			}
		}
		return doFormat(obj, depth, indentation);
	}
	/* ---------------------------------------------------------------------- */
	// Date-related stuff

	var SimpleDateFormat;

	(function() {
		var regex = /('[^']*')|(G+|y+|M+|w+|W+|D+|d+|F+|E+|a+|H+|k+|K+|h+|m+|s+|S+|Z+)|([a-zA-Z]+)|([^a-zA-Z']+)/;
		var monthNames = ["January", "February", "March", "April", "May", "June",
			"July", "August", "September", "October", "November", "December"];
		var dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
		var TEXT2 = 0, TEXT3 = 1, NUMBER = 2, YEAR = 3, MONTH = 4, TIMEZONE = 5;
		var types = {
			G : TEXT2,
			y : YEAR,
			M : MONTH,
			w : NUMBER,
			W : NUMBER,
			D : NUMBER,
			d : NUMBER,
			F : NUMBER,
			E : TEXT3,
			a : TEXT2,
			H : NUMBER,
			k : NUMBER,
			K : NUMBER,
			h : NUMBER,
			m : NUMBER,
			s : NUMBER,
			S : NUMBER,
			Z : TIMEZONE
		};
		var ONE_DAY = 24 * 60 * 60 * 1000;
		var ONE_WEEK = 7 * ONE_DAY;
		var DEFAULT_MINIMAL_DAYS_IN_FIRST_WEEK = 1;

		var newDateAtMidnight = function(year, month, day) {
			var d = new Date(year, month, day, 0, 0, 0);
			d.setMilliseconds(0);
			return d;
		};

		Date.prototype.getDifference = function(date) {
			return this.getTime() - date.getTime();
		};

		Date.prototype.isBefore = function(d) {
			return this.getTime() < d.getTime();
		};

		Date.prototype.getUTCTime = function() {
			return Date.UTC(this.getFullYear(), this.getMonth(), this.getDate(), this.getHours(), this.getMinutes(),
					this.getSeconds(), this.getMilliseconds());
		};

		Date.prototype.getTimeSince = function(d) {
			return this.getUTCTime() - d.getUTCTime();
		};

		Date.prototype.getPreviousSunday = function() {
			// Using midday avoids any possibility of DST messing things up
			var midday = new Date(this.getFullYear(), this.getMonth(), this.getDate(), 12, 0, 0);
			var previousSunday = new Date(midday.getTime() - this.getDay() * ONE_DAY);
			return newDateAtMidnight(previousSunday.getFullYear(), previousSunday.getMonth(),
					previousSunday.getDate());
		};

		Date.prototype.getWeekInYear = function(minimalDaysInFirstWeek) {
			if (isUndefined(this.minimalDaysInFirstWeek)) {
				minimalDaysInFirstWeek = DEFAULT_MINIMAL_DAYS_IN_FIRST_WEEK;
			}
			var previousSunday = this.getPreviousSunday();
			var startOfYear = newDateAtMidnight(this.getFullYear(), 0, 1);
			var numberOfSundays = previousSunday.isBefore(startOfYear) ?
				0 : 1 + Math.floor(previousSunday.getTimeSince(startOfYear) / ONE_WEEK);
			var numberOfDaysInFirstWeek =  7 - startOfYear.getDay();
			var weekInYear = numberOfSundays;
			if (numberOfDaysInFirstWeek < minimalDaysInFirstWeek) {
				weekInYear--;
			}
			return weekInYear;
		};

		Date.prototype.getWeekInMonth = function(minimalDaysInFirstWeek) {
			if (isUndefined(this.minimalDaysInFirstWeek)) {
				minimalDaysInFirstWeek = DEFAULT_MINIMAL_DAYS_IN_FIRST_WEEK;
			}
			var previousSunday = this.getPreviousSunday();
			var startOfMonth = newDateAtMidnight(this.getFullYear(), this.getMonth(), 1);
			var numberOfSundays = previousSunday.isBefore(startOfMonth) ?
				0 : 1 + Math.floor(previousSunday.getTimeSince(startOfMonth) / ONE_WEEK);
			var numberOfDaysInFirstWeek =  7 - startOfMonth.getDay();
			var weekInMonth = numberOfSundays;
			if (numberOfDaysInFirstWeek >= minimalDaysInFirstWeek) {
				weekInMonth++;
			}
			return weekInMonth;
		};

		Date.prototype.getDayInYear = function() {
			var startOfYear = newDateAtMidnight(this.getFullYear(), 0, 1);
			return 1 + Math.floor(this.getTimeSince(startOfYear) / ONE_DAY);
		};

		/* ------------------------------------------------------------------ */

		SimpleDateFormat = function(formatString) {
			this.formatString = formatString;
		};

		/**
		 * Sets the minimum number of days in a week in order for that week to
		 * be considered as belonging to a particular month or year
		 */
		SimpleDateFormat.prototype.setMinimalDaysInFirstWeek = function(days) {
			this.minimalDaysInFirstWeek = days;
		};

		SimpleDateFormat.prototype.getMinimalDaysInFirstWeek = function() {
			return isUndefined(this.minimalDaysInFirstWeek)	?
				DEFAULT_MINIMAL_DAYS_IN_FIRST_WEEK : this.minimalDaysInFirstWeek;
		};

		var padWithZeroes = function(str, len) {
			while (str.length < len) {
				str = "0" + str;
			}
			return str;
		};

		var formatText = function(data, numberOfLetters, minLength) {
			return (numberOfLetters >= 4) ? data : data.substr(0, Math.max(minLength, numberOfLetters));
		};

		var formatNumber = function(data, numberOfLetters) {
			var dataString = "" + data;
			// Pad with 0s as necessary
			return padWithZeroes(dataString, numberOfLetters);
		};

		SimpleDateFormat.prototype.format = function(date) {
			var formattedString = "";
			var result;
			var searchString = this.formatString;
			while ((result = regex.exec(searchString))) {
				var quotedString = result[1];
				var patternLetters = result[2];
				var otherLetters = result[3];
				var otherCharacters = result[4];

				// If the pattern matched is quoted string, output the text between the quotes
				if (quotedString) {
					if (quotedString == "''") {
						formattedString += "'";
					} else {
						formattedString += quotedString.substring(1, quotedString.length - 1);
					}
				} else if (otherLetters) {
					// Swallow non-pattern letters by doing nothing here
				} else if (otherCharacters) {
					// Simply output other characters
					formattedString += otherCharacters;
				} else if (patternLetters) {
					// Replace pattern letters
					var patternLetter = patternLetters.charAt(0);
					var numberOfLetters = patternLetters.length;
					var rawData = "";
					switch(patternLetter) {
						case "G":
							rawData = "AD";
							break;
						case "y":
							rawData = date.getFullYear();
							break;
						case "M":
							rawData = date.getMonth();
							break;
						case "w":
							rawData = date.getWeekInYear(this.getMinimalDaysInFirstWeek());
							break;
						case "W":
							rawData = date.getWeekInMonth(this.getMinimalDaysInFirstWeek());
							break;
						case "D":
							rawData = date.getDayInYear();
							break;
						case "d":
							rawData = date.getDate();
							break;
						case "F":
							rawData = 1 + Math.floor((date.getDate() - 1) / 7);
							break;
						case "E":
							rawData = dayNames[date.getDay()];
							break;
						case "a":
							rawData = (date.getHours() >= 12) ? "PM" : "AM";
							break;
						case "H":
							rawData = date.getHours();
							break;
						case "k":
							rawData = date.getHours() || 24;
							break;
						case "K":
							rawData = date.getHours() % 12;
							break;
						case "h":
							rawData = (date.getHours() % 12) || 12;
							break;
						case "m":
							rawData = date.getMinutes();
							break;
						case "s":
							rawData = date.getSeconds();
							break;
						case "S":
							rawData = date.getMilliseconds();
							break;
						case "Z":
							rawData = date.getTimezoneOffset(); // This returns the number of minutes since GMT was this time.
							break;
					}
					// Format the raw data depending on the type
					switch(types[patternLetter]) {
						case TEXT2:
							formattedString += formatText(rawData, numberOfLetters, 2);
							break;
						case TEXT3:
							formattedString += formatText(rawData, numberOfLetters, 3);
							break;
						case NUMBER:
							formattedString += formatNumber(rawData, numberOfLetters);
							break;
						case YEAR:
							if (numberOfLetters <= 3) {
								// Output a 2-digit year
								var dataString = "" + rawData;
								formattedString += dataString.substr(2, 2);
							} else {
								formattedString += formatNumber(rawData, numberOfLetters);
							}
							break;
						case MONTH:
							if (numberOfLetters >= 3) {
								formattedString += formatText(monthNames[rawData], numberOfLetters, numberOfLetters);
							} else {
								// NB. Months returned by getMonth are zero-based
								formattedString += formatNumber(rawData + 1, numberOfLetters);
							}
							break;
						case TIMEZONE:
							var isPositive = (rawData > 0);
							// The following line looks like a mistake but isn't
							// because of the way getTimezoneOffset measures.
							var prefix = isPositive ? "-" : "+";
							var absData = Math.abs(rawData);

							// Hours
							var hours = "" + Math.floor(absData / 60);
							hours = padWithZeroes(hours, 2);
							// Minutes
							var minutes = "" + (absData % 60);
							minutes = padWithZeroes(minutes, 2);

							formattedString += prefix + hours + minutes;
							break;
					}
				}
				searchString = searchString.substr(result.index + result[0].length);
			}
			return formattedString;
		};
	})();

	log4javascript.SimpleDateFormat = SimpleDateFormat;

	/* ---------------------------------------------------------------------- */
	// PatternLayout

	function PatternLayout(pattern) {
		if (pattern) {
			this.pattern = pattern;
		} else {
			this.pattern = PatternLayout.DEFAULT_CONVERSION_PATTERN;
		}
		this.customFields = [];
	}

	PatternLayout.TTCC_CONVERSION_PATTERN = "%r %p %c - %m%n";
	PatternLayout.DEFAULT_CONVERSION_PATTERN = "%m%n";
	PatternLayout.ISO8601_DATEFORMAT = "yyyy-MM-dd HH:mm:ss,SSS";
	PatternLayout.DATETIME_DATEFORMAT = "dd MMM yyyy HH:mm:ss,SSS";
	PatternLayout.ABSOLUTETIME_DATEFORMAT = "HH:mm:ss,SSS";

	PatternLayout.prototype = new Layout();

	PatternLayout.prototype.format = function(loggingEvent) {
		var regex = /%(-?[0-9]+)?(\.?[0-9]+)?([acdfmMnpr%])(\{([^\}]+)\})?|([^%]+)/;
		var formattedString = "";
		var result;
		var searchString = this.pattern;

		// Cannot use regex global flag since it doesn't work with exec in IE5
		while ((result = regex.exec(searchString))) {
			var matchedString = result[0];
			var padding = result[1];
			var truncation = result[2];
			var conversionCharacter = result[3];
			var specifier = result[5];
			var text = result[6];

			// Check if the pattern matched was just normal text
			if (text) {
				formattedString += "" + text;
			} else {
				// Create a raw replacement string based on the conversion
				// character and specifier
				var replacement = "";
				switch(conversionCharacter) {
					case "a": // Array of messages
					case "m": // Message
						var depth = 0;
						if (specifier) {
							depth = parseInt(specifier, 10);
							if (isNaN(depth)) {
								handleError("PatternLayout.format: invalid specifier '" +
									specifier + "' for conversion character '" + conversionCharacter +
									"' - should be a number");
								depth = 0;
							}
						}
						var messages = (conversionCharacter === "a") ? loggingEvent.messages[0] : loggingEvent.messages;
						for (var i = 0, len = messages.length; i < len; i++) {
							if (i > 0 && (replacement.charAt(replacement.length - 1) !== " ")) {
								replacement += " ";
							}
							if (depth === 0) {
								replacement += messages[i];
							} else {
								replacement += formatObjectExpansion(messages[i], depth);
							}
						}
						break;
					case "c": // Logger name
						var loggerName = loggingEvent.logger.name;
						if (specifier) {
							var precision = parseInt(specifier, 10);
							var loggerNameBits = loggingEvent.logger.name.split(".");
							if (precision >= loggerNameBits.length) {
								replacement = loggerName;
							} else {
								replacement = loggerNameBits.slice(loggerNameBits.length - precision).join(".");
							}
						} else {
							replacement = loggerName;
						}
						break;
					case "d": // Date
						var dateFormat = PatternLayout.ISO8601_DATEFORMAT;
						if (specifier) {
							dateFormat = specifier;
							// Pick up special cases
							if (dateFormat == "ISO8601") {
								dateFormat = PatternLayout.ISO8601_DATEFORMAT;
							} else if (dateFormat == "ABSOLUTE") {
								dateFormat = PatternLayout.ABSOLUTETIME_DATEFORMAT;
							} else if (dateFormat == "DATE") {
								dateFormat = PatternLayout.DATETIME_DATEFORMAT;
							}
						}
						// Format the date
						replacement = (new SimpleDateFormat(dateFormat)).format(loggingEvent.timeStamp);
						break;
					case "f": // Custom field
						if (this.hasCustomFields()) {
							var fieldIndex = 0;
							if (specifier) {
								fieldIndex = parseInt(specifier, 10);
								if (isNaN(fieldIndex)) {
									handleError("PatternLayout.format: invalid specifier '" +
										specifier + "' for conversion character 'f' - should be a number");
								} else if (fieldIndex === 0) {
									handleError("PatternLayout.format: invalid specifier '" +
										specifier + "' for conversion character 'f' - must be greater than zero");
								} else if (fieldIndex > this.customFields.length) {
									handleError("PatternLayout.format: invalid specifier '" +
										specifier + "' for conversion character 'f' - there aren't that many custom fields");
								} else {
									fieldIndex = fieldIndex - 1;
								}
							}
                            var val = this.customFields[fieldIndex].value;
                            if (typeof val == "function") {
                                val = val(this, loggingEvent);
                            }
                            replacement = val;
						}
						break;
					case "n": // New line
						replacement = newLine;
						break;
					case "p": // Level
						replacement = loggingEvent.level.name;
						break;
					case "r": // Milliseconds since log4javascript startup
						replacement = "" + loggingEvent.timeStamp.getDifference(applicationStartDate);
						break;
					case "%": // Literal % sign
						replacement = "%";
						break;
					default:
						replacement = matchedString;
						break;
				}
				// Format the replacement according to any padding or
				// truncation specified
				var l;

				// First, truncation
				if (truncation) {
					l = parseInt(truncation.substr(1), 10);
					var strLen = replacement.length;
					if (l < strLen) {
						replacement = replacement.substring(strLen - l, strLen);
					}
				}
				// Next, padding
				if (padding) {
					if (padding.charAt(0) == "-") {
						l = parseInt(padding.substr(1), 10);
						// Right pad with spaces
						while (replacement.length < l) {
							replacement += " ";
						}
					} else {
						l = parseInt(padding, 10);
						// Left pad with spaces
						while (replacement.length < l) {
							replacement = " " + replacement;
						}
					}
				}
				formattedString += replacement;
			}
			searchString = searchString.substr(result.index + result[0].length);
		}
		return formattedString;
	};

	PatternLayout.prototype.ignoresThrowable = function() {
	    return true;
	};

	PatternLayout.prototype.toString = function() {
	    return "PatternLayout";
	};

	log4javascript.PatternLayout = PatternLayout;
	/* ---------------------------------------------------------------------- */
	// AlertAppender

	function AlertAppender() {}

	AlertAppender.prototype = new Appender();

	AlertAppender.prototype.layout = new SimpleLayout();

	AlertAppender.prototype.append = function(loggingEvent) {
		var formattedMessage = this.getLayout().format(loggingEvent);
		if (this.getLayout().ignoresThrowable()) {
			formattedMessage += loggingEvent.getThrowableStrRep();
		}
		alert(formattedMessage);
	};

	AlertAppender.prototype.toString = function() {
		return "AlertAppender";
	};

	log4javascript.AlertAppender = AlertAppender;
	/* ---------------------------------------------------------------------- */
	// BrowserConsoleAppender (only works in Opera and Safari and Firefox with
	// Firebug extension)

	function BrowserConsoleAppender() {}

	BrowserConsoleAppender.prototype = new log4javascript.Appender();
	BrowserConsoleAppender.prototype.layout = new NullLayout();
	BrowserConsoleAppender.prototype.threshold = Level.DEBUG;

	BrowserConsoleAppender.prototype.append = function(loggingEvent) {
		var appender = this;

		var getFormattedMessage = function() {
			var layout = appender.getLayout();
			var formattedMessage = layout.format(loggingEvent);
			if (layout.ignoresThrowable() && loggingEvent.exception) {
				formattedMessage += loggingEvent.getThrowableStrRep();
			}
			return formattedMessage;
		};

		if ((typeof opera != "undefined") && opera.postError) { // Opera
			opera.postError(getFormattedMessage());
		} else if (window.console && window.console.log) { // Safari and Firebug
			var formattedMesage = getFormattedMessage();
			// Log to Firebug using its logging methods or revert to the console.log
			// method in Safari
			if (window.console.debug && Level.DEBUG.isGreaterOrEqual(loggingEvent.level)) {
				window.console.debug(formattedMesage);
			} else if (window.console.info && Level.INFO.equals(loggingEvent.level)) {
				window.console.info(formattedMesage);
			} else if (window.console.warn && Level.WARN.equals(loggingEvent.level)) {
				window.console.warn(formattedMesage);
			} else if (window.console.error && loggingEvent.level.isGreaterOrEqual(Level.ERROR)) {
				window.console.error(formattedMesage);
			} else {
				window.console.log(formattedMesage);
			}
		}
	};

	BrowserConsoleAppender.prototype.group = function(name) {
		if (window.console && window.console.group) {
			window.console.group(name);
		}
	};

	BrowserConsoleAppender.prototype.groupEnd = function() {
		if (window.console && window.console.groupEnd) {
			window.console.groupEnd();
		}
	};

	BrowserConsoleAppender.prototype.toString = function() {
		return "BrowserConsoleAppender";
	};

	log4javascript.BrowserConsoleAppender = BrowserConsoleAppender;
	/* ---------------------------------------------------------------------- */
	// AjaxAppender related

	var xmlHttpFactories = [
		function() { return new XMLHttpRequest(); },
		function() { return new ActiveXObject("Msxml2.XMLHTTP"); },
		function() { return new ActiveXObject("Microsoft.XMLHTTP"); }
	];

	var getXmlHttp = function(errorHandler) {
		// This is only run the first time; the value of getXmlHttp gets
		// replaced with the factory that succeeds on the first run
		var xmlHttp = null, factory;
		for (var i = 0, len = xmlHttpFactories.length; i < len; i++) {
			factory = xmlHttpFactories[i];
			try {
				xmlHttp = factory();
				getXmlHttp = factory;
				return xmlHttp;
			} catch (e) {
			}
		}
		// If we're here, all factories have failed, so throw an error
		if (errorHandler) {
			errorHandler();
		} else {
			handleError("getXmlHttp: unable to obtain XMLHttpRequest object");
		}
	};

	function isHttpRequestSuccessful(xmlHttp) {
		return isUndefined(xmlHttp.status) || xmlHttp.status === 0 ||
			(xmlHttp.status >= 200 && xmlHttp.status < 300) ||
			xmlHttp.status == 1223 /* Fix for IE */;
	}

	/* ---------------------------------------------------------------------- */
	// AjaxAppender

	function AjaxAppender(url) {
		var appender = this;
		var isSupported = true;
		if (!url) {
			handleError("AjaxAppender: URL must be specified in constructor");
			isSupported = false;
		}

		var timed = this.defaults.timed;
		var waitForResponse = this.defaults.waitForResponse;
		var batchSize = this.defaults.batchSize;
		var timerInterval = this.defaults.timerInterval;
		var requestSuccessCallback = this.defaults.requestSuccessCallback;
		var failCallback = this.defaults.failCallback;
		var postVarName = this.defaults.postVarName;
		var sendAllOnUnload = this.defaults.sendAllOnUnload;
		var contentType = this.defaults.contentType;
		var sessionId = null;

		var queuedLoggingEvents = [];
		var queuedRequests = [];
		var headers = [];
		var sending = false;
		var initialized = false;

		// Configuration methods. The function scope is used to prevent
		// direct alteration to the appender configuration properties.
		function checkCanConfigure(configOptionName) {
			if (initialized) {
				handleError("AjaxAppender: configuration option '" +
					configOptionName +
					"' may not be set after the appender has been initialized");
				return false;
			}
			return true;
		}

		this.getSessionId = function() { return sessionId; };
		this.setSessionId = function(sessionIdParam) {
			sessionId = extractStringFromParam(sessionIdParam, null);
			this.layout.setCustomField("sessionid", sessionId);
		};

		this.setLayout = function(layoutParam) {
			if (checkCanConfigure("layout")) {
				this.layout = layoutParam;
				// Set the session id as a custom field on the layout, if not already present
				if (sessionId !== null) {
					this.setSessionId(sessionId);
				}
			}
		};

		this.isTimed = function() { return timed; };
		this.setTimed = function(timedParam) {
			if (checkCanConfigure("timed")) {
				timed = bool(timedParam);
			}
		};

		this.getTimerInterval = function() { return timerInterval; };
		this.setTimerInterval = function(timerIntervalParam) {
			if (checkCanConfigure("timerInterval")) {
				timerInterval = extractIntFromParam(timerIntervalParam, timerInterval);
			}
		};

		this.isWaitForResponse = function() { return waitForResponse; };
		this.setWaitForResponse = function(waitForResponseParam) {
			if (checkCanConfigure("waitForResponse")) {
				waitForResponse = bool(waitForResponseParam);
			}
		};

		this.getBatchSize = function() { return batchSize; };
		this.setBatchSize = function(batchSizeParam) {
			if (checkCanConfigure("batchSize")) {
				batchSize = extractIntFromParam(batchSizeParam, batchSize);
			}
		};

		this.isSendAllOnUnload = function() { return sendAllOnUnload; };
		this.setSendAllOnUnload = function(sendAllOnUnloadParam) {
			if (checkCanConfigure("sendAllOnUnload")) {
				sendAllOnUnload = extractBooleanFromParam(sendAllOnUnloadParam, sendAllOnUnload);
			}
		};

		this.setRequestSuccessCallback = function(requestSuccessCallbackParam) {
			requestSuccessCallback = extractFunctionFromParam(requestSuccessCallbackParam, requestSuccessCallback);
		};

		this.setFailCallback = function(failCallbackParam) {
			failCallback = extractFunctionFromParam(failCallbackParam, failCallback);
		};

		this.getPostVarName = function() { return postVarName; };
		this.setPostVarName = function(postVarNameParam) {
			if (checkCanConfigure("postVarName")) {
				postVarName = extractStringFromParam(postVarNameParam, postVarName);
			}
		};

		this.getHeaders = function() { return headers; };
		this.addHeader = function(name, value) {
			if (name.toLowerCase() == "content-type") {
				contentType = value;
			} else {
				headers.push( { name: name, value: value } );
			}
		};

		// Internal functions
		function sendAll() {
			if (isSupported && enabled) {
				sending = true;
				var currentRequestBatch;
				if (waitForResponse) {
					// Send the first request then use this function as the callback once
					// the response comes back
					if (queuedRequests.length > 0) {
						currentRequestBatch = queuedRequests.shift();
						sendRequest(preparePostData(currentRequestBatch), sendAll);
					} else {
						sending = false;
						if (timed) {
							scheduleSending();
						}
					}
				} else {
					// Rattle off all the requests without waiting to see the response
					while ((currentRequestBatch = queuedRequests.shift())) {
						sendRequest(preparePostData(currentRequestBatch));
					}
					sending = false;
					if (timed) {
						scheduleSending();
					}
				}
			}
		}

		this.sendAll = sendAll;

		// Called when the window unloads. At this point we're past caring about
		// waiting for responses or timers or incomplete batches - everything
		// must go, now
		function sendAllRemaining() {
			var sendingAnything = false;
			if (isSupported && enabled) {
				// Create requests for everything left over, batched as normal
				var actualBatchSize = appender.getLayout().allowBatching() ? batchSize : 1;
				var currentLoggingEvent;
				var batchedLoggingEvents = [];
				while ((currentLoggingEvent = queuedLoggingEvents.shift())) {
					batchedLoggingEvents.push(currentLoggingEvent);
					if (queuedLoggingEvents.length >= actualBatchSize) {
						// Queue this batch of log entries
						queuedRequests.push(batchedLoggingEvents);
						batchedLoggingEvents = [];
					}
				}
				// If there's a partially completed batch, add it
				if (batchedLoggingEvents.length > 0) {
					queuedRequests.push(batchedLoggingEvents);
				}
				sendingAnything = (queuedRequests.length > 0);
				waitForResponse = false;
				timed = false;
				sendAll();
			}
			return sendingAnything;
		}

		this.sendAllRemaining = sendAllRemaining;

		function preparePostData(batchedLoggingEvents) {
			// Format the logging events
			var formattedMessages = [];
			var currentLoggingEvent;
			var postData = "";
			while ((currentLoggingEvent = batchedLoggingEvents.shift())) {
				var currentFormattedMessage = appender.getLayout().format(currentLoggingEvent);
				if (appender.getLayout().ignoresThrowable()) {
					currentFormattedMessage += currentLoggingEvent.getThrowableStrRep();
				}
				formattedMessages.push(currentFormattedMessage);
			}
			// Create the post data string
			if (batchedLoggingEvents.length == 1) {
				postData = formattedMessages.join("");
			} else {
				postData = appender.getLayout().batchHeader +
					formattedMessages.join(appender.getLayout().batchSeparator) +
					appender.getLayout().batchFooter;
			}
			if (contentType == appender.defaults.contentType) {
				postData = appender.getLayout().returnsPostData ? postData :
					urlEncode(postVarName) + "=" + urlEncode(postData);
				// Add the layout name to the post data
				if (postData.length > 0) {
					postData += "&";
				}
				postData += "layout=" + urlEncode(appender.getLayout().toString());
			}
			return postData;
		}

		function scheduleSending() {
			window.setTimeout(sendAll, timerInterval);
		}

		function xmlHttpErrorHandler() {
			var msg = "AjaxAppender: could not create XMLHttpRequest object. AjaxAppender disabled";
			handleError(msg);
			isSupported = false;
			if (failCallback) {
				failCallback(msg);
			}
		}

		function sendRequest(postData, successCallback) {
			try {
				var xmlHttp = getXmlHttp(xmlHttpErrorHandler);
				if (isSupported) {
					if (xmlHttp.overrideMimeType) {
						xmlHttp.overrideMimeType(appender.getLayout().getContentType());
					}
					xmlHttp.onreadystatechange = function() {
						if (xmlHttp.readyState == 4) {
							if (isHttpRequestSuccessful(xmlHttp)) {
								if (requestSuccessCallback) {
									requestSuccessCallback(xmlHttp);
								}
								if (successCallback) {
									successCallback(xmlHttp);
								}
							} else {
								var msg = "AjaxAppender.append: XMLHttpRequest request to URL " +
									url + " returned status code " + xmlHttp.status;
								handleError(msg);
								if (failCallback) {
									failCallback(msg);
								}
							}
							xmlHttp.onreadystatechange = emptyFunction;
							xmlHttp = null;
						}
					};
					xmlHttp.open("POST", url, true);
					try {
						for (var i = 0, header; header = headers[i++]; ) {
							xmlHttp.setRequestHeader(header.name, header.value);
						}
						xmlHttp.setRequestHeader("Content-Type", contentType);
					} catch (headerEx) {
						var msg = "AjaxAppender.append: your browser's XMLHttpRequest implementation" +
							" does not support setRequestHeader, therefore cannot post data. AjaxAppender disabled";
						handleError(msg);
						isSupported = false;
						if (failCallback) {
							failCallback(msg);
						}
						return;
					}
					xmlHttp.send(postData);
				}
			} catch (ex) {
				var errMsg = "AjaxAppender.append: error sending log message to " + url;
				handleError(errMsg, ex);
				isSupported = false;
				if (failCallback) {
					failCallback(errMsg + ". Details: " + getExceptionStringRep(ex));
				}
			}
		}

		this.append = function(loggingEvent) {
			if (isSupported) {
				if (!initialized) {
					init();
				}
				queuedLoggingEvents.push(loggingEvent);
				var actualBatchSize = this.getLayout().allowBatching() ? batchSize : 1;

				if (queuedLoggingEvents.length >= actualBatchSize) {
					var currentLoggingEvent;
					var batchedLoggingEvents = [];
					while ((currentLoggingEvent = queuedLoggingEvents.shift())) {
						batchedLoggingEvents.push(currentLoggingEvent);
					}
					// Queue this batch of log entries
					queuedRequests.push(batchedLoggingEvents);

					// If using a timer, the queue of requests will be processed by the
					// timer function, so nothing needs to be done here.
					if (!timed && (!waitForResponse || (waitForResponse && !sending))) {
						sendAll();
					}
				}
			}
		};

		function init() {
			initialized = true;
			// Add unload event to send outstanding messages
			if (sendAllOnUnload) {
				var oldBeforeUnload = window.onbeforeunload;
				window.onbeforeunload = function() {
					if (oldBeforeUnload) {
						oldBeforeUnload();
					}
					if (sendAllRemaining()) {
						return "Sending log messages";
					}
				};
			}
			// Start timer
			if (timed) {
				scheduleSending();
			}
		}
	}

	AjaxAppender.prototype = new Appender();

	AjaxAppender.prototype.defaults = {
		waitForResponse: false,
		timed: false,
		timerInterval: 1000,
		batchSize: 1,
		sendAllOnUnload: false,
		requestSuccessCallback: null,
		failCallback: null,
		postVarName: "data",
		contentType: "application/x-www-form-urlencoded"
	};

	AjaxAppender.prototype.layout = new HttpPostDataLayout();

	AjaxAppender.prototype.toString = function() {
		return "AjaxAppender";
	};

	log4javascript.AjaxAppender = AjaxAppender;
	/* ---------------------------------------------------------------------- */
	// PopUpAppender and InPageAppender related

	function setCookie(name, value, days, path) {
	    var expires;
	    path = path ? "; path=" + path : "";
		if (days) {
			var date = new Date();
			date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
			expires = "; expires=" + date.toGMTString();
		} else {
		    expires = "";
	    }
		document.cookie = escape(name) + "=" + escape(value) + expires + path;
	}

	function getCookie(name) {
		var nameEquals = escape(name) + "=";
		var ca = document.cookie.split(";");
		for (var i = 0, len = ca.length; i < len; i++) {
			var c = ca[i];
			while (c.charAt(0) === " ") {
			    c = c.substring(1, c.length);
			}
			if (c.indexOf(nameEquals) === 0) {
			    return unescape(c.substring(nameEquals.length, c.length));
	        }
		}
		return null;
	}

	// Gets the base URL of the location of the log4javascript script.
	// This is far from infallible.
	function getBaseUrl() {
		var scripts = document.getElementsByTagName("script");
		for (var i = 0, len = scripts.length; i < len; ++i) {
			if (scripts[i].src.indexOf("log4javascript") != -1) {
				var lastSlash = scripts[i].src.lastIndexOf("/");
				return (lastSlash == -1) ? "" : scripts[i].src.substr(0, lastSlash + 1);
			}
		}
        return null;
    }

	function isLoaded(win) {
		try {
			return bool(win.loaded);
		} catch (ex) {
			return false;
		}
	}

	/* ---------------------------------------------------------------------- */
	// ConsoleAppender (prototype for PopUpAppender and InPageAppender)

	var ConsoleAppender;

	// Create an anonymous function to protect base console methods
	(function() {
		var getConsoleHtmlLines = function() {
			return [
'<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">',
'<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en">',
'	<head>',
'		<title>log4javascript</title>',
'		<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />',
'		<!-- Make IE8 behave like IE7, having gone to all the trouble of making IE work -->',
'		<meta http-equiv="X-UA-Compatible" content="IE=7" />',
'		<script type="text/javascript">var isIe = false, isIePre7 = false;</script>',
'		<!--[if IE]><script type="text/javascript">isIe = true</script><![endif]-->',
'		<!--[if lt IE 7]><script type="text/javascript">isIePre7 = true</script><![endif]-->',
'		<script type="text/javascript">',
'			//<![CDATA[',
'			var loggingEnabled = true;',
'			var logQueuedEventsTimer = null;',
'			var logEntries = [];',
'			var logEntriesAndSeparators = [];',
'			var logItems = [];',
'			var renderDelay = 100;',
'			var unrenderedLogItemsExist = false;',
'			var rootGroup, currentGroup = null;',
'			var loaded = false;',
'			var currentLogItem = null;',
'			var logMainContainer;',
'',
'			function copyProperties(obj, props) {',
'				for (var i in props) {',
'					obj[i] = props[i];',
'				}',
'			}',
'',
'			/*----------------------------------------------------------------*/',
'',
'			function LogItem() {',
'			}',
'',
'			LogItem.prototype = {',
'				mainContainer: null,',
'				wrappedContainer: null,',
'				unwrappedContainer: null,',
'				group: null,',
'',
'				appendToLog: function() {',
'					for (var i = 0, len = this.elementContainers.length; i < len; i++) {',
'						this.elementContainers[i].appendToLog();',
'					}',
'					this.group.update();',
'				},',
'',
'				doRemove: function(doUpdate, removeFromGroup) {',
'					if (this.rendered) {',
'						for (var i = 0, len = this.elementContainers.length; i < len; i++) {',
'							this.elementContainers[i].remove();',
'						}',
'						this.unwrappedElementContainer = null;',
'						this.wrappedElementContainer = null;',
'						this.mainElementContainer = null;',
'					}',
'					if (this.group && removeFromGroup) {',
'						this.group.removeChild(this, doUpdate);',
'					}',
'					if (this === currentLogItem) {',
'						currentLogItem = null;',
'					}',
'				},',
'',
'				remove: function(doUpdate, removeFromGroup) {',
'					this.doRemove(doUpdate, removeFromGroup);',
'				},',
'',
'				render: function() {},',
'',
'				accept: function(visitor) {',
'					visitor.visit(this);',
'				},',
'',
'				getUnwrappedDomContainer: function() {',
'					return this.group.unwrappedElementContainer.contentDiv;',
'				},',
'',
'				getWrappedDomContainer: function() {',
'					return this.group.wrappedElementContainer.contentDiv;',
'				},',
'',
'				getMainDomContainer: function() {',
'					return this.group.mainElementContainer.contentDiv;',
'				}',
'			};',
'',
'			LogItem.serializedItemKeys = {LOG_ENTRY: 0, GROUP_START: 1, GROUP_END: 2};',
'',
'			/*----------------------------------------------------------------*/',
'',
'			function LogItemContainerElement() {',
'			}',
'',
'			LogItemContainerElement.prototype = {',
'				appendToLog: function() {',
'					var insertBeforeFirst = (newestAtTop && this.containerDomNode.hasChildNodes());',
'					if (insertBeforeFirst) {',
'						this.containerDomNode.insertBefore(this.mainDiv, this.containerDomNode.firstChild);',
'					} else {',
'						this.containerDomNode.appendChild(this.mainDiv);',
'					}',
'				}',
'			};',
'',
'			/*----------------------------------------------------------------*/',
'',
'			function SeparatorElementContainer(containerDomNode) {',
'				this.containerDomNode = containerDomNode;',
'				this.mainDiv = document.createElement("div");',
'				this.mainDiv.className = "separator";',
'				this.mainDiv.innerHTML = "&nbsp;";',
'			}',
'',
'			SeparatorElementContainer.prototype = new LogItemContainerElement();',
'',
'			SeparatorElementContainer.prototype.remove = function() {',
'				this.mainDiv.parentNode.removeChild(this.mainDiv);',
'				this.mainDiv = null;',
'			};',
'',
'			/*----------------------------------------------------------------*/',
'',
'			function Separator() {',
'				this.rendered = false;',
'			}',
'',
'			Separator.prototype = new LogItem();',
'',
'			copyProperties(Separator.prototype, {',
'				render: function() {',
'					var containerDomNode = this.group.contentDiv;',
'					if (isIe) {',
'						this.unwrappedElementContainer = new SeparatorElementContainer(this.getUnwrappedDomContainer());',
'						this.wrappedElementContainer = new SeparatorElementContainer(this.getWrappedDomContainer());',
'						this.elementContainers = [this.unwrappedElementContainer, this.wrappedElementContainer];',
'					} else {',
'						this.mainElementContainer = new SeparatorElementContainer(this.getMainDomContainer());',
'						this.elementContainers = [this.mainElementContainer];',
'					}',
'					this.content = this.formattedMessage;',
'					this.rendered = true;',
'				}',
'			});',
'',
'			/*----------------------------------------------------------------*/',
'',
'			function GroupElementContainer(group, containerDomNode, isRoot, isWrapped) {',
'				this.group = group;',
'				this.containerDomNode = containerDomNode;',
'				this.isRoot = isRoot;',
'				this.isWrapped = isWrapped;',
'				this.expandable = false;',
'',
'				if (this.isRoot) {',
'					if (isIe) {',
'						this.contentDiv = logMainContainer.appendChild(document.createElement("div"));',
'						this.contentDiv.id = this.isWrapped ? "log_wrapped" : "log_unwrapped";',
'					} else {',
'						this.contentDiv = logMainContainer;',
'					}',
'				} else {',
'					var groupElementContainer = this;',
'					',
'					this.mainDiv = document.createElement("div");',
'					this.mainDiv.className = "group";',
'',
'					this.headingDiv = this.mainDiv.appendChild(document.createElement("div"));',
'					this.headingDiv.className = "groupheading";',
'',
'					this.expander = this.headingDiv.appendChild(document.createElement("span"));',
'					this.expander.className = "expander unselectable greyedout";',
'					this.expander.unselectable = true;',
'					var expanderText = this.group.expanded ? "-" : "+";',
'					this.expanderTextNode = this.expander.appendChild(document.createTextNode(expanderText));',
'					',
'					this.headingDiv.appendChild(document.createTextNode(" " + this.group.name));',
'',
'					this.contentDiv = this.mainDiv.appendChild(document.createElement("div"));',
'					var contentCssClass = this.group.expanded ? "expanded" : "collapsed";',
'					this.contentDiv.className = "groupcontent " + contentCssClass;',
'',
'					this.expander.onclick = function() {',
'						if (groupElementContainer.group.expandable) {',
'							groupElementContainer.group.toggleExpanded();',
'						}',
'					};',
'				}',
'			}',
'',
'			GroupElementContainer.prototype = new LogItemContainerElement();',
'',
'			copyProperties(GroupElementContainer.prototype, {',
'				toggleExpanded: function() {',
'					if (!this.isRoot) {',
'						var oldCssClass, newCssClass, expanderText;',
'						if (this.group.expanded) {',
'							newCssClass = "expanded";',
'							oldCssClass = "collapsed";',
'							expanderText = "-";',
'						} else {',
'							newCssClass = "collapsed";',
'							oldCssClass = "expanded";',
'							expanderText = "+";',
'						}',
'						replaceClass(this.contentDiv, newCssClass, oldCssClass);',
'						this.expanderTextNode.nodeValue = expanderText;',
'					}',
'				},',
'',
'				remove: function() {',
'					if (!this.isRoot) {',
'						this.headingDiv = null;',
'						this.expander.onclick = null;',
'						this.expander = null;',
'						this.expanderTextNode = null;',
'						this.contentDiv = null;',
'						this.containerDomNode = null;',
'						this.mainDiv.parentNode.removeChild(this.mainDiv);',
'						this.mainDiv = null;',
'					}',
'				},',
'',
'				reverseChildren: function() {',
'					// Invert the order of the log entries',
'					var node = null;',
'',
'					// Remove all the log container nodes',
'					var childDomNodes = [];',
'					while ((node = this.contentDiv.firstChild)) {',
'						this.contentDiv.removeChild(node);',
'						childDomNodes.push(node);',
'					}',
'',
'					// Put them all back in reverse order',
'					while ((node = childDomNodes.pop())) {',
'						this.contentDiv.appendChild(node);',
'					}',
'				},',
'',
'				update: function() {',
'					if (!this.isRoot) {',
'						if (this.group.expandable) {',
'							removeClass(this.expander, "greyedout");',
'						} else {',
'							addClass(this.expander, "greyedout");',
'						}',
'					}',
'				},',
'',
'				clear: function() {',
'					if (this.isRoot) {',
'						this.contentDiv.innerHTML = "";',
'					}',
'				}',
'			});',
'',
'			/*----------------------------------------------------------------*/',
'',
'			function Group(name, isRoot, initiallyExpanded) {',
'				this.name = name;',
'				this.group = null;',
'				this.isRoot = isRoot;',
'				this.initiallyExpanded = initiallyExpanded;',
'				this.elementContainers = [];',
'				this.children = [];',
'				this.expanded = initiallyExpanded;',
'				this.rendered = false;',
'				this.expandable = false;',
'			}',
'',
'			Group.prototype = new LogItem();',
'',
'			copyProperties(Group.prototype, {',
'				addChild: function(logItem) {',
'					this.children.push(logItem);',
'					logItem.group = this;',
'				},',
'',
'				render: function() {',
'					if (isIe) {',
'						var unwrappedDomContainer, wrappedDomContainer;',
'						if (this.isRoot) {',
'							unwrappedDomContainer = logMainContainer;',
'							wrappedDomContainer = logMainContainer;',
'						} else {',
'							unwrappedDomContainer = this.getUnwrappedDomContainer();',
'							wrappedDomContainer = this.getWrappedDomContainer();',
'						}',
'						this.unwrappedElementContainer = new GroupElementContainer(this, unwrappedDomContainer, this.isRoot, false);',
'						this.wrappedElementContainer = new GroupElementContainer(this, wrappedDomContainer, this.isRoot, true);',
'						this.elementContainers = [this.unwrappedElementContainer, this.wrappedElementContainer];',
'					} else {',
'						var mainDomContainer = this.isRoot ? logMainContainer : this.getMainDomContainer();',
'						this.mainElementContainer = new GroupElementContainer(this, mainDomContainer, this.isRoot, false);',
'						this.elementContainers = [this.mainElementContainer];',
'					}',
'					this.rendered = true;',
'				},',
'',
'				toggleExpanded: function() {',
'					this.expanded = !this.expanded;',
'					for (var i = 0, len = this.elementContainers.length; i < len; i++) {',
'						this.elementContainers[i].toggleExpanded();',
'					}',
'				},',
'',
'				expand: function() {',
'					if (!this.expanded) {',
'						this.toggleExpanded();',
'					}',
'				},',
'',
'				accept: function(visitor) {',
'					visitor.visitGroup(this);',
'				},',
'',
'				reverseChildren: function() {',
'					if (this.rendered) {',
'						for (var i = 0, len = this.elementContainers.length; i < len; i++) {',
'							this.elementContainers[i].reverseChildren();',
'						}',
'					}',
'				},',
'',
'				update: function() {',
'					var previouslyExpandable = this.expandable;',
'					this.expandable = (this.children.length !== 0);',
'					if (this.expandable !== previouslyExpandable) {',
'						for (var i = 0, len = this.elementContainers.length; i < len; i++) {',
'							this.elementContainers[i].update();',
'						}',
'					}',
'				},',
'',
'				flatten: function() {',
'					var visitor = new GroupFlattener();',
'					this.accept(visitor);',
'					return visitor.logEntriesAndSeparators;',
'				},',
'',
'				removeChild: function(child, doUpdate) {',
'					array_remove(this.children, child);',
'					child.group = null;',
'					if (doUpdate) {',
'						this.update();',
'					}',
'				},',
'',
'				remove: function(doUpdate, removeFromGroup) {',
'					for (var i = 0, len = this.children.length; i < len; i++) {',
'						this.children[i].remove(false, false);',
'					}',
'					this.children = [];',
'					this.update();',
'					if (this === currentGroup) {',
'						currentGroup = this.group;',
'					}',
'					this.doRemove(doUpdate, removeFromGroup);',
'				},',
'',
'				serialize: function(items) {',
'					items.push([LogItem.serializedItemKeys.GROUP_START, this.name]);',
'					for (var i = 0, len = this.children.length; i < len; i++) {',
'						this.children[i].serialize(items);',
'					}',
'					if (this !== currentGroup) {',
'						items.push([LogItem.serializedItemKeys.GROUP_END]);',
'					}',
'				},',
'',
'				clear: function() {',
'					for (var i = 0, len = this.elementContainers.length; i < len; i++) {',
'						this.elementContainers[i].clear();',
'					}',
'				}',
'			});',
'',
'			/*----------------------------------------------------------------*/',
'',
'			function LogEntryElementContainer() {',
'			}',
'',
'			LogEntryElementContainer.prototype = new LogItemContainerElement();',
'',
'			copyProperties(LogEntryElementContainer.prototype, {',
'				remove: function() {',
'					this.doRemove();',
'				},',
'',
'				doRemove: function() {',
'					this.mainDiv.parentNode.removeChild(this.mainDiv);',
'					this.mainDiv = null;',
'					this.contentElement = null;',
'					this.containerDomNode = null;',
'				},',
'',
'				setContent: function(content, wrappedContent) {',
'					if (content === this.formattedMessage) {',
'						this.contentElement.innerHTML = "";',
'						this.contentElement.appendChild(document.createTextNode(this.formattedMessage));',
'					} else {',
'						this.contentElement.innerHTML = content;',
'					}',
'				},',
'',
'				setSearchMatch: function(isMatch) {',
'					var oldCssClass = isMatch ? "searchnonmatch" : "searchmatch";',
'					var newCssClass = isMatch ? "searchmatch" : "searchnonmatch";',
'					replaceClass(this.mainDiv, newCssClass, oldCssClass);',
'				},',
'',
'				clearSearch: function() {',
'					removeClass(this.mainDiv, "searchmatch");',
'					removeClass(this.mainDiv, "searchnonmatch");',
'				}',
'			});',
'',
'			/*----------------------------------------------------------------*/',
'',
'			function LogEntryWrappedElementContainer(logEntry, containerDomNode) {',
'				this.logEntry = logEntry;',
'				this.containerDomNode = containerDomNode;',
'				this.mainDiv = document.createElement("div");',
'				this.mainDiv.appendChild(document.createTextNode(this.logEntry.formattedMessage));',
'				this.mainDiv.className = "logentry wrapped " + this.logEntry.level;',
'				this.contentElement = this.mainDiv;',
'			}',
'',
'			LogEntryWrappedElementContainer.prototype = new LogEntryElementContainer();',
'',
'			LogEntryWrappedElementContainer.prototype.setContent = function(content, wrappedContent) {',
'				if (content === this.formattedMessage) {',
'					this.contentElement.innerHTML = "";',
'					this.contentElement.appendChild(document.createTextNode(this.formattedMessage));',
'				} else {',
'					this.contentElement.innerHTML = wrappedContent;',
'				}',
'			};',
'',
'			/*----------------------------------------------------------------*/',
'',
'			function LogEntryUnwrappedElementContainer(logEntry, containerDomNode) {',
'				this.logEntry = logEntry;',
'				this.containerDomNode = containerDomNode;',
'				this.mainDiv = document.createElement("div");',
'				this.mainDiv.className = "logentry unwrapped " + this.logEntry.level;',
'				this.pre = this.mainDiv.appendChild(document.createElement("pre"));',
'				this.pre.appendChild(document.createTextNode(this.logEntry.formattedMessage));',
'				this.pre.className = "unwrapped";',
'				this.contentElement = this.pre;',
'			}',
'',
'			LogEntryUnwrappedElementContainer.prototype = new LogEntryElementContainer();',
'',
'			LogEntryUnwrappedElementContainer.prototype.remove = function() {',
'				this.doRemove();',
'				this.pre = null;',
'			};',
'',
'			/*----------------------------------------------------------------*/',
'',
'			function LogEntryMainElementContainer(logEntry, containerDomNode) {',
'				this.logEntry = logEntry;',
'				this.containerDomNode = containerDomNode;',
'				this.mainDiv = document.createElement("div");',
'				this.mainDiv.className = "logentry nonielogentry " + this.logEntry.level;',
'				this.contentElement = this.mainDiv.appendChild(document.createElement("span"));',
'				this.contentElement.appendChild(document.createTextNode(this.logEntry.formattedMessage));',
'			}',
'',
'			LogEntryMainElementContainer.prototype = new LogEntryElementContainer();',
'',
'			/*----------------------------------------------------------------*/',
'',
'			function LogEntry(level, formattedMessage) {',
'				this.level = level;',
'				this.formattedMessage = formattedMessage;',
'				this.rendered = false;',
'			}',
'',
'			LogEntry.prototype = new LogItem();',
'',
'			copyProperties(LogEntry.prototype, {',
'				render: function() {',
'					var logEntry = this;',
'					var containerDomNode = this.group.contentDiv;',
'',
'					// Support for the CSS attribute white-space in IE for Windows is',
'					// non-existent pre version 6 and slightly odd in 6, so instead',
'					// use two different HTML elements',
'					if (isIe) {',
'						this.formattedMessage = this.formattedMessage.replace(/\\r\\n/g, "\\r"); // Workaround for IE\'s treatment of white space',
'						this.unwrappedElementContainer = new LogEntryUnwrappedElementContainer(this, this.getUnwrappedDomContainer());',
'						this.wrappedElementContainer = new LogEntryWrappedElementContainer(this, this.getWrappedDomContainer());',
'						this.elementContainers = [this.unwrappedElementContainer, this.wrappedElementContainer];',
'					} else {',
'						this.mainElementContainer = new LogEntryMainElementContainer(this, this.getMainDomContainer());',
'						this.elementContainers = [this.mainElementContainer];',
'					}',
'					this.content = this.formattedMessage;',
'					this.rendered = true;',
'				},',
'',
'				setContent: function(content, wrappedContent) {',
'					if (content != this.content) {',
'						if (isIe && (content !== this.formattedMessage)) {',
'							content = content.replace(/\\r\\n/g, "\\r"); // Workaround for IE\'s treatment of white space',
'						}',
'						for (var i = 0, len = this.elementContainers.length; i < len; i++) {',
'							this.elementContainers[i].setContent(content, wrappedContent);',
'						}',
'						this.content = content;',
'					}',
'				},',
'',
'				getSearchMatches: function() {',
'					var matches = [];',
'					var i, len;',
'					if (isIe) {',
'						var unwrappedEls = getElementsByClass(this.unwrappedElementContainer.mainDiv, "searchterm", "span");',
'						var wrappedEls = getElementsByClass(this.wrappedElementContainer.mainDiv, "searchterm", "span");',
'						for (i = 0, len = unwrappedEls.length; i < len; i++) {',
'							matches[i] = new Match(this.level, null, unwrappedEls[i], wrappedEls[i]);',
'						}',
'					} else {',
'						var els = getElementsByClass(this.mainElementContainer.mainDiv, "searchterm", "span");',
'						for (i = 0, len = els.length; i < len; i++) {',
'							matches[i] = new Match(this.level, els[i]);',
'						}',
'					}',
'					return matches;',
'				},',
'',
'				setSearchMatch: function(isMatch) {',
'					for (var i = 0, len = this.elementContainers.length; i < len; i++) {',
'						this.elementContainers[i].setSearchMatch(isMatch);',
'					}',
'				},',
'',
'				clearSearch: function() {',
'					for (var i = 0, len = this.elementContainers.length; i < len; i++) {',
'						this.elementContainers[i].clearSearch();',
'					}',
'				},',
'',
'				accept: function(visitor) {',
'					visitor.visitLogEntry(this);',
'				},',
'',
'				serialize: function(items) {',
'					items.push([LogItem.serializedItemKeys.LOG_ENTRY, this.level, this.formattedMessage]);',
'				}',
'			});',
'',
'			/*----------------------------------------------------------------*/',
'',
'			function LogItemVisitor() {',
'			}',
'',
'			LogItemVisitor.prototype = {',
'				visit: function(logItem) {',
'				},',
'',
'				visitParent: function(logItem) {',
'					if (logItem.group) {',
'						logItem.group.accept(this);',
'					}',
'				},',
'',
'				visitChildren: function(logItem) {',
'					for (var i = 0, len = logItem.children.length; i < len; i++) {',
'						logItem.children[i].accept(this);',
'					}',
'				},',
'',
'				visitLogEntry: function(logEntry) {',
'					this.visit(logEntry);',
'				},',
'',
'				visitSeparator: function(separator) {',
'					this.visit(separator);',
'				},',
'',
'				visitGroup: function(group) {',
'					this.visit(group);',
'				}',
'			};',
'',
'			/*----------------------------------------------------------------*/',
'',
'			function GroupFlattener() {',
'				this.logEntriesAndSeparators = [];',
'			}',
'',
'			GroupFlattener.prototype = new LogItemVisitor();',
'',
'			GroupFlattener.prototype.visitGroup = function(group) {',
'				this.visitChildren(group);',
'			};',
'',
'			GroupFlattener.prototype.visitLogEntry = function(logEntry) {',
'				this.logEntriesAndSeparators.push(logEntry);',
'			};',
'',
'			GroupFlattener.prototype.visitSeparator = function(separator) {',
'				this.logEntriesAndSeparators.push(separator);',
'			};',
'',
'			/*----------------------------------------------------------------*/',
'',
'			window.onload = function() {',
'				// Sort out document.domain',
'				if (location.search) {',
'					var queryBits = unescape(location.search).substr(1).split("&"), nameValueBits;',
'					for (var i = 0, len = queryBits.length; i < len; i++) {',
'						nameValueBits = queryBits[i].split("=");',
'						if (nameValueBits[0] == "log4javascript_domain") {',
'							document.domain = nameValueBits[1];',
'							break;',
'						}',
'					}',
'				}',
'',
'				// Create DOM objects',
'				logMainContainer = $("log");',
'				if (isIePre7) {',
'					addClass(logMainContainer, "oldIe");',
'				}',
'',
'				rootGroup = new Group("root", true);',
'				rootGroup.render();',
'				currentGroup = rootGroup;',
'				',
'				setCommandInputWidth();',
'				setLogContainerHeight();',
'				toggleLoggingEnabled();',
'				toggleSearchEnabled();',
'				toggleSearchFilter();',
'				toggleSearchHighlight();',
'				applyFilters();',
'				checkAllLevels();',
'				toggleWrap();',
'				toggleNewestAtTop();',
'				toggleScrollToLatest();',
'				renderQueuedLogItems();',
'				loaded = true;',
'				$("command").value = "";',
'				$("command").autocomplete = "off";',
'				$("command").onkeydown = function(evt) {',
'					evt = getEvent(evt);',
'					if (evt.keyCode == 10 || evt.keyCode == 13) { // Return/Enter',
'						evalCommandLine();',
'						stopPropagation(evt);',
'					} else if (evt.keyCode == 27) { // Escape',
'						this.value = "";',
'						this.focus();',
'					} else if (evt.keyCode == 38 && commandHistory.length > 0) { // Up',
'						currentCommandIndex = Math.max(0, currentCommandIndex - 1);',
'						this.value = commandHistory[currentCommandIndex];',
'						moveCaretToEnd(this);',
'					} else if (evt.keyCode == 40 && commandHistory.length > 0) { // Down',
'						currentCommandIndex = Math.min(commandHistory.length - 1, currentCommandIndex + 1);',
'						this.value = commandHistory[currentCommandIndex];',
'						moveCaretToEnd(this);',
'					}',
'				};',
'',
'				// Prevent the keypress moving the caret in Firefox',
'				$("command").onkeypress = function(evt) {',
'					evt = getEvent(evt);',
'					if (evt.keyCode == 38 && commandHistory.length > 0 && evt.preventDefault) { // Up',
'						evt.preventDefault();',
'					}',
'				};',
'',
'				// Prevent the keyup event blurring the input in Opera',
'				$("command").onkeyup = function(evt) {',
'					evt = getEvent(evt);',
'					if (evt.keyCode == 27 && evt.preventDefault) { // Up',
'						evt.preventDefault();',
'						this.focus();',
'					}',
'				};',
'',
'				// Add document keyboard shortcuts',
'				document.onkeydown = function keyEventHandler(evt) {',
'					evt = getEvent(evt);',
'					switch (evt.keyCode) {',
'						case 69: // Ctrl + shift + E: re-execute last command',
'							if (evt.shiftKey && (evt.ctrlKey || evt.metaKey)) {',
'								evalLastCommand();',
'								cancelKeyEvent(evt);',
'								return false;',
'							}',
'							break;',
'						case 75: // Ctrl + shift + K: focus search',
'							if (evt.shiftKey && (evt.ctrlKey || evt.metaKey)) {',
'								focusSearch();',
'								cancelKeyEvent(evt);',
'								return false;',
'							}',
'							break;',
'						case 40: // Ctrl + shift + down arrow: focus command line',
'						case 76: // Ctrl + shift + L: focus command line',
'							if (evt.shiftKey && (evt.ctrlKey || evt.metaKey)) {',
'								focusCommandLine();',
'								cancelKeyEvent(evt);',
'								return false;',
'							}',
'							break;',
'					}',
'				};',
'',
'				// Workaround to make sure log div starts at the correct size',
'				setTimeout(setLogContainerHeight, 20);',
'',
'				setShowCommandLine(showCommandLine);',
'				doSearch();',
'			};',
'',
'			window.onunload = function() {',
'				if (mainWindowExists()) {',
'					appender.unload();',
'				}',
'				appender = null;',
'			};',
'',
'			/*----------------------------------------------------------------*/',
'',
'			function toggleLoggingEnabled() {',
'				setLoggingEnabled($("enableLogging").checked);',
'			}',
'',
'			function setLoggingEnabled(enable) {',
'				loggingEnabled = enable;',
'			}',
'',
'			var appender = null;',
'',
'			function setAppender(appenderParam) {',
'				appender = appenderParam;',
'			}',
'',
'			function setShowCloseButton(showCloseButton) {',
'				$("closeButton").style.display = showCloseButton ? "inline" : "none";',
'			}',
'',
'			function setShowHideButton(showHideButton) {',
'				$("hideButton").style.display = showHideButton ? "inline" : "none";',
'			}',
'',
'			var newestAtTop = false;',
'',
'			/*----------------------------------------------------------------*/',
'',
'			function LogItemContentReverser() {',
'			}',
'			',
'			LogItemContentReverser.prototype = new LogItemVisitor();',
'			',
'			LogItemContentReverser.prototype.visitGroup = function(group) {',
'				group.reverseChildren();',
'				this.visitChildren(group);',
'			};',
'',
'			/*----------------------------------------------------------------*/',
'',
'			function setNewestAtTop(isNewestAtTop) {',
'				var oldNewestAtTop = newestAtTop;',
'				var i, iLen, j, jLen;',
'				newestAtTop = Boolean(isNewestAtTop);',
'				if (oldNewestAtTop != newestAtTop) {',
'					var visitor = new LogItemContentReverser();',
'					rootGroup.accept(visitor);',
'',
'					// Reassemble the matches array',
'					if (currentSearch) {',
'						var currentMatch = currentSearch.matches[currentMatchIndex];',
'						var matchIndex = 0;',
'						var matches = [];',
'						var actOnLogEntry = function(logEntry) {',
'							var logEntryMatches = logEntry.getSearchMatches();',
'							for (j = 0, jLen = logEntryMatches.length; j < jLen; j++) {',
'								matches[matchIndex] = logEntryMatches[j];',
'								if (currentMatch && logEntryMatches[j].equals(currentMatch)) {',
'									currentMatchIndex = matchIndex;',
'								}',
'								matchIndex++;',
'							}',
'						};',
'						if (newestAtTop) {',
'							for (i = logEntries.length - 1; i >= 0; i--) {',
'								actOnLogEntry(logEntries[i]);',
'							}',
'						} else {',
'							for (i = 0, iLen = logEntries.length; i < iLen; i++) {',
'								actOnLogEntry(logEntries[i]);',
'							}',
'						}',
'						currentSearch.matches = matches;',
'						if (currentMatch) {',
'							currentMatch.setCurrent();',
'						}',
'					} else if (scrollToLatest) {',
'						doScrollToLatest();',
'					}',
'				}',
'				$("newestAtTop").checked = isNewestAtTop;',
'			}',
'',
'			function toggleNewestAtTop() {',
'				var isNewestAtTop = $("newestAtTop").checked;',
'				setNewestAtTop(isNewestAtTop);',
'			}',
'',
'			var scrollToLatest = true;',
'',
'			function setScrollToLatest(isScrollToLatest) {',
'				scrollToLatest = isScrollToLatest;',
'				if (scrollToLatest) {',
'					doScrollToLatest();',
'				}',
'				$("scrollToLatest").checked = isScrollToLatest;',
'			}',
'',
'			function toggleScrollToLatest() {',
'				var isScrollToLatest = $("scrollToLatest").checked;',
'				setScrollToLatest(isScrollToLatest);',
'			}',
'',
'			function doScrollToLatest() {',
'				var l = logMainContainer;',
'				if (typeof l.scrollTop != "undefined") {',
'					if (newestAtTop) {',
'						l.scrollTop = 0;',
'					} else {',
'						var latestLogEntry = l.lastChild;',
'						if (latestLogEntry) {',
'							l.scrollTop = l.scrollHeight;',
'						}',
'					}',
'				}',
'			}',
'',
'			var closeIfOpenerCloses = true;',
'',
'			function setCloseIfOpenerCloses(isCloseIfOpenerCloses) {',
'				closeIfOpenerCloses = isCloseIfOpenerCloses;',
'			}',
'',
'			var maxMessages = null;',
'',
'			function setMaxMessages(max) {',
'				maxMessages = max;',
'				pruneLogEntries();',
'			}',
'',
'			var showCommandLine = false;',
'',
'			function setShowCommandLine(isShowCommandLine) {',
'				showCommandLine = isShowCommandLine;',
'				if (loaded) {',
'					$("commandLine").style.display = showCommandLine ? "block" : "none";',
'					setCommandInputWidth();',
'					setLogContainerHeight();',
'				}',
'			}',
'',
'			function focusCommandLine() {',
'				if (loaded) {',
'					$("command").focus();',
'				}',
'			}',
'',
'			function focusSearch() {',
'				if (loaded) {',
'					$("searchBox").focus();',
'				}',
'			}',
'',
'			function getLogItems() {',
'				var items = [];',
'				for (var i = 0, len = logItems.length; i < len; i++) {',
'					logItems[i].serialize(items);',
'				}',
'				return items;',
'			}',
'',
'			function setLogItems(items) {',
'				var loggingReallyEnabled = loggingEnabled;',
'				// Temporarily turn logging on',
'				loggingEnabled = true;',
'				for (var i = 0, len = items.length; i < len; i++) {',
'					switch (items[i][0]) {',
'						case LogItem.serializedItemKeys.LOG_ENTRY:',
'							log(items[i][1], items[i][2]);',
'							break;',
'						case LogItem.serializedItemKeys.GROUP_START:',
'							group(items[i][1]);',
'							break;',
'						case LogItem.serializedItemKeys.GROUP_END:',
'							groupEnd();',
'							break;',
'					}',
'				}',
'				loggingEnabled = loggingReallyEnabled;',
'			}',
'',
'			function log(logLevel, formattedMessage) {',
'				if (loggingEnabled) {',
'					var logEntry = new LogEntry(logLevel, formattedMessage);',
'					logEntries.push(logEntry);',
'					logEntriesAndSeparators.push(logEntry);',
'					logItems.push(logEntry);',
'					currentGroup.addChild(logEntry);',
'					if (loaded) {',
'						if (logQueuedEventsTimer !== null) {',
'							clearTimeout(logQueuedEventsTimer);',
'						}',
'						logQueuedEventsTimer = setTimeout(renderQueuedLogItems, renderDelay);',
'						unrenderedLogItemsExist = true;',
'					}',
'				}',
'			}',
'',
'			function renderQueuedLogItems() {',
'				logQueuedEventsTimer = null;',
'				var pruned = pruneLogEntries();',
'',
'				// Render any unrendered log entries and apply the current search to them',
'				var initiallyHasMatches = currentSearch ? currentSearch.hasMatches() : false;',
'				for (var i = 0, len = logItems.length; i < len; i++) {',
'					if (!logItems[i].rendered) {',
'						logItems[i].render();',
'						logItems[i].appendToLog();',
'						if (currentSearch && (logItems[i] instanceof LogEntry)) {',
'							currentSearch.applyTo(logItems[i]);',
'						}',
'					}',
'				}',
'				if (currentSearch) {',
'					if (pruned) {',
'						if (currentSearch.hasVisibleMatches()) {',
'							if (currentMatchIndex === null) {',
'								setCurrentMatchIndex(0);',
'							}',
'							displayMatches();',
'						} else {',
'							displayNoMatches();',
'						}',
'					} else if (!initiallyHasMatches && currentSearch.hasVisibleMatches()) {',
'						setCurrentMatchIndex(0);',
'						displayMatches();',
'					}',
'				}',
'				if (scrollToLatest) {',
'					doScrollToLatest();',
'				}',
'				unrenderedLogItemsExist = false;',
'			}',
'',
'			function pruneLogEntries() {',
'				if ((maxMessages !== null) && (logEntriesAndSeparators.length > maxMessages)) {',
'					var numberToDelete = logEntriesAndSeparators.length - maxMessages;',
'					var prunedLogEntries = logEntriesAndSeparators.slice(0, numberToDelete);',
'					if (currentSearch) {',
'						currentSearch.removeMatches(prunedLogEntries);',
'					}',
'					var group;',
'					for (var i = 0; i < numberToDelete; i++) {',
'						group = logEntriesAndSeparators[i].group;',
'						array_remove(logItems, logEntriesAndSeparators[i]);',
'						array_remove(logEntries, logEntriesAndSeparators[i]);',
'						logEntriesAndSeparators[i].remove(true, true);',
'						if (group.children.length === 0 && group !== currentGroup && group !== rootGroup) {',
'							array_remove(logItems, group);',
'							group.remove(true, true);',
'						}',
'					}',
'					logEntriesAndSeparators = array_removeFromStart(logEntriesAndSeparators, numberToDelete);',
'					return true;',
'				}',
'				return false;',
'			}',
'',
'			function group(name, startExpanded) {',
'				if (loggingEnabled) {',
'					initiallyExpanded = (typeof startExpanded === "undefined") ? true : Boolean(startExpanded);',
'					var newGroup = new Group(name, false, initiallyExpanded);',
'					currentGroup.addChild(newGroup);',
'					currentGroup = newGroup;',
'					logItems.push(newGroup);',
'					if (loaded) {',
'						if (logQueuedEventsTimer !== null) {',
'							clearTimeout(logQueuedEventsTimer);',
'						}',
'						logQueuedEventsTimer = setTimeout(renderQueuedLogItems, renderDelay);',
'						unrenderedLogItemsExist = true;',
'					}',
'				}',
'			}',
'',
'			function groupEnd() {',
'				currentGroup = (currentGroup === rootGroup) ? rootGroup : currentGroup.group;',
'			}',
'',
'			function mainPageReloaded() {',
'				currentGroup = rootGroup;',
'				var separator = new Separator();',
'				logEntriesAndSeparators.push(separator);',
'				logItems.push(separator);',
'				currentGroup.addChild(separator);',
'			}',
'',
'			function closeWindow() {',
'				if (appender && mainWindowExists()) {',
'					appender.close(true);',
'				} else {',
'					window.close();',
'				}',
'			}',
'',
'			function hide() {',
'				if (appender && mainWindowExists()) {',
'					appender.hide();',
'				}',
'			}',
'',
'			var mainWindow = window;',
'			var windowId = "log4javascriptConsoleWindow_" + new Date().getTime() + "_" + ("" + Math.random()).substr(2);',
'',
'			function setMainWindow(win) {',
'				mainWindow = win;',
'				mainWindow[windowId] = window;',
'				// If this is a pop-up, poll the opener to see if it\'s closed',
'				if (opener && closeIfOpenerCloses) {',
'					pollOpener();',
'				}',
'			}',
'',
'			function pollOpener() {',
'				if (closeIfOpenerCloses) {',
'					if (mainWindowExists()) {',
'						setTimeout(pollOpener, 500);',
'					} else {',
'						closeWindow();',
'					}',
'				}',
'			}',
'',
'			function mainWindowExists() {',
'				try {',
'					return (mainWindow && !mainWindow.closed &&',
'						mainWindow[windowId] == window);',
'				} catch (ex) {}',
'				return false;',
'			}',
'',
'			var logLevels = ["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"];',
'',
'			function getCheckBox(logLevel) {',
'				return $("switch_" + logLevel);',
'			}',
'',
'			function getIeWrappedLogContainer() {',
'				return $("log_wrapped");',
'			}',
'',
'			function getIeUnwrappedLogContainer() {',
'				return $("log_unwrapped");',
'			}',
'',
'			function applyFilters() {',
'				for (var i = 0; i < logLevels.length; i++) {',
'					if (getCheckBox(logLevels[i]).checked) {',
'						addClass(logMainContainer, logLevels[i]);',
'					} else {',
'						removeClass(logMainContainer, logLevels[i]);',
'					}',
'				}',
'				updateSearchFromFilters();',
'			}',
'',
'			function toggleAllLevels() {',
'				var turnOn = $("switch_ALL").checked;',
'				for (var i = 0; i < logLevels.length; i++) {',
'					getCheckBox(logLevels[i]).checked = turnOn;',
'					if (turnOn) {',
'						addClass(logMainContainer, logLevels[i]);',
'					} else {',
'						removeClass(logMainContainer, logLevels[i]);',
'					}',
'				}',
'			}',
'',
'			function checkAllLevels() {',
'				for (var i = 0; i < logLevels.length; i++) {',
'					if (!getCheckBox(logLevels[i]).checked) {',
'						getCheckBox("ALL").checked = false;',
'						return;',
'					}',
'				}',
'				getCheckBox("ALL").checked = true;',
'			}',
'',
'			function clearLog() {',
'				rootGroup.clear();',
'				currentGroup = rootGroup;',
'				logEntries = [];',
'				logItems = [];',
'				logEntriesAndSeparators = [];',
' 				doSearch();',
'			}',
'',
'			function toggleWrap() {',
'				var enable = $("wrap").checked;',
'				if (enable) {',
'					addClass(logMainContainer, "wrap");',
'				} else {',
'					removeClass(logMainContainer, "wrap");',
'				}',
'				refreshCurrentMatch();',
'			}',
'',
'			/* ------------------------------------------------------------------- */',
'',
'			// Search',
'',
'			var searchTimer = null;',
'',
'			function scheduleSearch() {',
'				try {',
'					clearTimeout(searchTimer);',
'				} catch (ex) {',
'					// Do nothing',
'				}',
'				searchTimer = setTimeout(doSearch, 500);',
'			}',
'',
'			function Search(searchTerm, isRegex, searchRegex, isCaseSensitive) {',
'				this.searchTerm = searchTerm;',
'				this.isRegex = isRegex;',
'				this.searchRegex = searchRegex;',
'				this.isCaseSensitive = isCaseSensitive;',
'				this.matches = [];',
'			}',
'',
'			Search.prototype = {',
'				hasMatches: function() {',
'					return this.matches.length > 0;',
'				},',
'',
'				hasVisibleMatches: function() {',
'					if (this.hasMatches()) {',
'						for (var i = 0; i < this.matches.length; i++) {',
'							if (this.matches[i].isVisible()) {',
'								return true;',
'							}',
'						}',
'					}',
'					return false;',
'				},',
'',
'				match: function(logEntry) {',
'					var entryText = String(logEntry.formattedMessage);',
'					var matchesSearch = false;',
'					if (this.isRegex) {',
'						matchesSearch = this.searchRegex.test(entryText);',
'					} else if (this.isCaseSensitive) {',
'						matchesSearch = (entryText.indexOf(this.searchTerm) > -1);',
'					} else {',
'						matchesSearch = (entryText.toLowerCase().indexOf(this.searchTerm.toLowerCase()) > -1);',
'					}',
'					return matchesSearch;',
'				},',
'',
'				getNextVisibleMatchIndex: function() {',
'					for (var i = currentMatchIndex + 1; i < this.matches.length; i++) {',
'						if (this.matches[i].isVisible()) {',
'							return i;',
'						}',
'					}',
'					// Start again from the first match',
'					for (i = 0; i <= currentMatchIndex; i++) {',
'						if (this.matches[i].isVisible()) {',
'							return i;',
'						}',
'					}',
'					return -1;',
'				},',
'',
'				getPreviousVisibleMatchIndex: function() {',
'					for (var i = currentMatchIndex - 1; i >= 0; i--) {',
'						if (this.matches[i].isVisible()) {',
'							return i;',
'						}',
'					}',
'					// Start again from the last match',
'					for (var i = this.matches.length - 1; i >= currentMatchIndex; i--) {',
'						if (this.matches[i].isVisible()) {',
'							return i;',
'						}',
'					}',
'					return -1;',
'				},',
'',
'				applyTo: function(logEntry) {',
'					var doesMatch = this.match(logEntry);',
'					if (doesMatch) {',
'						logEntry.group.expand();',
'						logEntry.setSearchMatch(true);',
'						var logEntryContent;',
'						var wrappedLogEntryContent;',
'						var searchTermReplacementStartTag = "<span class=\\\"searchterm\\\">";',
'						var searchTermReplacementEndTag = "<" + "/span>";',
'						var preTagName = isIe ? "pre" : "span";',
'						var preStartTag = "<" + preTagName + " class=\\\"pre\\\">";',
'						var preEndTag = "<" + "/" + preTagName + ">";',
'						var startIndex = 0;',
'						var searchIndex, matchedText, textBeforeMatch;',
'						if (this.isRegex) {',
'							var flags = this.isCaseSensitive ? "g" : "gi";',
'							var capturingRegex = new RegExp("(" + this.searchRegex.source + ")", flags);',
'',
'							// Replace the search term with temporary tokens for the start and end tags',
'							var rnd = ("" + Math.random()).substr(2);',
'							var startToken = "%%s" + rnd + "%%";',
'							var endToken = "%%e" + rnd + "%%";',
'							logEntryContent = logEntry.formattedMessage.replace(capturingRegex, startToken + "$1" + endToken);',
'',
'							// Escape the HTML to get rid of angle brackets',
'							logEntryContent = escapeHtml(logEntryContent);',
'',
'							// Substitute the proper HTML back in for the search match',
'							var result;',
'							var searchString = logEntryContent;',
'							logEntryContent = "";',
'							wrappedLogEntryContent = "";',
'							while ((searchIndex = searchString.indexOf(startToken, startIndex)) > -1) {',
'								var endTokenIndex = searchString.indexOf(endToken, searchIndex);',
'								matchedText = searchString.substring(searchIndex + startToken.length, endTokenIndex);',
'								textBeforeMatch = searchString.substring(startIndex, searchIndex);',
'								logEntryContent += preStartTag + textBeforeMatch + preEndTag;',
'								logEntryContent += searchTermReplacementStartTag + preStartTag + matchedText +',
'									preEndTag + searchTermReplacementEndTag;',
'								if (isIe) {',
'									wrappedLogEntryContent += textBeforeMatch + searchTermReplacementStartTag +',
'										matchedText + searchTermReplacementEndTag;',
'								}',
'								startIndex = endTokenIndex + endToken.length;',
'							}',
'							logEntryContent += preStartTag + searchString.substr(startIndex) + preEndTag;',
'							if (isIe) {',
'								wrappedLogEntryContent += searchString.substr(startIndex);',
'							}',
'						} else {',
'							logEntryContent = "";',
'							wrappedLogEntryContent = "";',
'							var searchTermReplacementLength = searchTermReplacementStartTag.length +',
'								this.searchTerm.length + searchTermReplacementEndTag.length;',
'							var searchTermLength = this.searchTerm.length;',
'							var searchTermLowerCase = this.searchTerm.toLowerCase();',
'							var logTextLowerCase = logEntry.formattedMessage.toLowerCase();',
'							while ((searchIndex = logTextLowerCase.indexOf(searchTermLowerCase, startIndex)) > -1) {',
'								matchedText = escapeHtml(logEntry.formattedMessage.substr(searchIndex, this.searchTerm.length));',
'								textBeforeMatch = escapeHtml(logEntry.formattedMessage.substring(startIndex, searchIndex));',
'								var searchTermReplacement = searchTermReplacementStartTag +',
'									preStartTag + matchedText + preEndTag + searchTermReplacementEndTag;',
'								logEntryContent += preStartTag + textBeforeMatch + preEndTag + searchTermReplacement;',
'								if (isIe) {',
'									wrappedLogEntryContent += textBeforeMatch + searchTermReplacementStartTag +',
'										matchedText + searchTermReplacementEndTag;',
'								}',
'								startIndex = searchIndex + searchTermLength;',
'							}',
'							var textAfterLastMatch = escapeHtml(logEntry.formattedMessage.substr(startIndex));',
'							logEntryContent += preStartTag + textAfterLastMatch + preEndTag;',
'							if (isIe) {',
'								wrappedLogEntryContent += textAfterLastMatch;',
'							}',
'						}',
'						logEntry.setContent(logEntryContent, wrappedLogEntryContent);',
'						var logEntryMatches = logEntry.getSearchMatches();',
'						this.matches = this.matches.concat(logEntryMatches);',
'					} else {',
'						logEntry.setSearchMatch(false);',
'						logEntry.setContent(logEntry.formattedMessage, logEntry.formattedMessage);',
'					}',
'					return doesMatch;',
'				},',
'',
'				removeMatches: function(logEntries) {',
'					var matchesToRemoveCount = 0;',
'					var currentMatchRemoved = false;',
'					var matchesToRemove = [];',
'					var i, iLen, j, jLen;',
'',
'					// Establish the list of matches to be removed',
'					for (i = 0, iLen = this.matches.length; i < iLen; i++) {',
'						for (j = 0, jLen = logEntries.length; j < jLen; j++) {',
'							if (this.matches[i].belongsTo(logEntries[j])) {',
'								matchesToRemove.push(this.matches[i]);',
'								if (i === currentMatchIndex) {',
'									currentMatchRemoved = true;',
'								}',
'							}',
'						}',
'					}',
'',
'					// Set the new current match index if the current match has been deleted',
'					// This will be the first match that appears after the first log entry being',
'					// deleted, if one exists; otherwise, it\'s the first match overall',
'					var newMatch = currentMatchRemoved ? null : this.matches[currentMatchIndex];',
'					if (currentMatchRemoved) {',
'						for (i = currentMatchIndex, iLen = this.matches.length; i < iLen; i++) {',
'							if (this.matches[i].isVisible() && !array_contains(matchesToRemove, this.matches[i])) {',
'								newMatch = this.matches[i];',
'								break;',
'							}',
'						}',
'					}',
'',
'					// Remove the matches',
'					for (i = 0, iLen = matchesToRemove.length; i < iLen; i++) {',
'						array_remove(this.matches, matchesToRemove[i]);',
'						matchesToRemove[i].remove();',
'					}',
'',
'					// Set the new match, if one exists',
'					if (this.hasVisibleMatches()) {',
'						if (newMatch === null) {',
'							setCurrentMatchIndex(0);',
'						} else {',
'							// Get the index of the new match',
'							var newMatchIndex = 0;',
'							for (i = 0, iLen = this.matches.length; i < iLen; i++) {',
'								if (newMatch === this.matches[i]) {',
'									newMatchIndex = i;',
'									break;',
'								}',
'							}',
'							setCurrentMatchIndex(newMatchIndex);',
'						}',
'					} else {',
'						currentMatchIndex = null;',
'						displayNoMatches();',
'					}',
'				}',
'			};',
'',
'			function getPageOffsetTop(el, container) {',
'				var currentEl = el;',
'				var y = 0;',
'				while (currentEl && currentEl != container) {',
'					y += currentEl.offsetTop;',
'					currentEl = currentEl.offsetParent;',
'				}',
'				return y;',
'			}',
'',
'			function scrollIntoView(el) {',
'				var logContainer = logMainContainer;',
'				// Check if the whole width of the element is visible and centre if not',
'				if (!$("wrap").checked) {',
'					var logContainerLeft = logContainer.scrollLeft;',
'					var logContainerRight = logContainerLeft  + logContainer.offsetWidth;',
'					var elLeft = el.offsetLeft;',
'					var elRight = elLeft + el.offsetWidth;',
'					if (elLeft < logContainerLeft || elRight > logContainerRight) {',
'						logContainer.scrollLeft = elLeft - (logContainer.offsetWidth - el.offsetWidth) / 2;',
'					}',
'				}',
'				// Check if the whole height of the element is visible and centre if not',
'				var logContainerTop = logContainer.scrollTop;',
'				var logContainerBottom = logContainerTop  + logContainer.offsetHeight;',
'				var elTop = getPageOffsetTop(el) - getToolBarsHeight();',
'				var elBottom = elTop + el.offsetHeight;',
'				if (elTop < logContainerTop || elBottom > logContainerBottom) {',
'					logContainer.scrollTop = elTop - (logContainer.offsetHeight - el.offsetHeight) / 2;',
'				}',
'			}',
'',
'			function Match(logEntryLevel, spanInMainDiv, spanInUnwrappedPre, spanInWrappedDiv) {',
'				this.logEntryLevel = logEntryLevel;',
'				this.spanInMainDiv = spanInMainDiv;',
'				if (isIe) {',
'					this.spanInUnwrappedPre = spanInUnwrappedPre;',
'					this.spanInWrappedDiv = spanInWrappedDiv;',
'				}',
'				this.mainSpan = isIe ? spanInUnwrappedPre : spanInMainDiv;',
'			}',
'',
'			Match.prototype = {',
'				equals: function(match) {',
'					return this.mainSpan === match.mainSpan;',
'				},',
'',
'				setCurrent: function() {',
'					if (isIe) {',
'						addClass(this.spanInUnwrappedPre, "currentmatch");',
'						addClass(this.spanInWrappedDiv, "currentmatch");',
'						// Scroll the visible one into view',
'						var elementToScroll = $("wrap").checked ? this.spanInWrappedDiv : this.spanInUnwrappedPre;',
'						scrollIntoView(elementToScroll);',
'					} else {',
'						addClass(this.spanInMainDiv, "currentmatch");',
'						scrollIntoView(this.spanInMainDiv);',
'					}',
'				},',
'',
'				belongsTo: function(logEntry) {',
'					if (isIe) {',
'						return isDescendant(this.spanInUnwrappedPre, logEntry.unwrappedPre);',
'					} else {',
'						return isDescendant(this.spanInMainDiv, logEntry.mainDiv);',
'					}',
'				},',
'',
'				setNotCurrent: function() {',
'					if (isIe) {',
'						removeClass(this.spanInUnwrappedPre, "currentmatch");',
'						removeClass(this.spanInWrappedDiv, "currentmatch");',
'					} else {',
'						removeClass(this.spanInMainDiv, "currentmatch");',
'					}',
'				},',
'',
'				isOrphan: function() {',
'					return isOrphan(this.mainSpan);',
'				},',
'',
'				isVisible: function() {',
'					return getCheckBox(this.logEntryLevel).checked;',
'				},',
'',
'				remove: function() {',
'					if (isIe) {',
'						this.spanInUnwrappedPre = null;',
'						this.spanInWrappedDiv = null;',
'					} else {',
'						this.spanInMainDiv = null;',
'					}',
'				}',
'			};',
'',
'			var currentSearch = null;',
'			var currentMatchIndex = null;',
'',
'			function doSearch() {',
'				var searchBox = $("searchBox");',
'				var searchTerm = searchBox.value;',
'				var isRegex = $("searchRegex").checked;',
'				var isCaseSensitive = $("searchCaseSensitive").checked;',
'				var i;',
'',
'				if (searchTerm === "") {',
'					$("searchReset").disabled = true;',
'					$("searchNav").style.display = "none";',
'					removeClass(document.body, "searching");',
'					removeClass(searchBox, "hasmatches");',
'					removeClass(searchBox, "nomatches");',
'					for (i = 0; i < logEntries.length; i++) {',
'						logEntries[i].clearSearch();',
'						logEntries[i].setContent(logEntries[i].formattedMessage, logEntries[i].formattedMessage);',
'					}',
'					currentSearch = null;',
'					setLogContainerHeight();',
'				} else {',
'					$("searchReset").disabled = false;',
'					$("searchNav").style.display = "block";',
'					var searchRegex;',
'					var regexValid;',
'					if (isRegex) {',
'						try {',
'							searchRegex = isCaseSensitive ? new RegExp(searchTerm, "g") : new RegExp(searchTerm, "gi");',
'							regexValid = true;',
'							replaceClass(searchBox, "validregex", "invalidregex");',
'							searchBox.title = "Valid regex";',
'						} catch (ex) {',
'							regexValid = false;',
'							replaceClass(searchBox, "invalidregex", "validregex");',
'							searchBox.title = "Invalid regex: " + (ex.message ? ex.message : (ex.description ? ex.description : "unknown error"));',
'							return;',
'						}',
'					} else {',
'						searchBox.title = "";',
'						removeClass(searchBox, "validregex");',
'						removeClass(searchBox, "invalidregex");',
'					}',
'					addClass(document.body, "searching");',
'					currentSearch = new Search(searchTerm, isRegex, searchRegex, isCaseSensitive);',
'					for (i = 0; i < logEntries.length; i++) {',
'						currentSearch.applyTo(logEntries[i]);',
'					}',
'					setLogContainerHeight();',
'',
'					// Highlight the first search match',
'					if (currentSearch.hasVisibleMatches()) {',
'						setCurrentMatchIndex(0);',
'						displayMatches();',
'					} else {',
'						displayNoMatches();',
'					}',
'				}',
'			}',
'',
'			function updateSearchFromFilters() {',
'				if (currentSearch) {',
'					if (currentSearch.hasMatches()) {',
'						if (currentMatchIndex === null) {',
'							currentMatchIndex = 0;',
'						}',
'						var currentMatch = currentSearch.matches[currentMatchIndex];',
'						if (currentMatch.isVisible()) {',
'							displayMatches();',
'							setCurrentMatchIndex(currentMatchIndex);',
'						} else {',
'							currentMatch.setNotCurrent();',
'							// Find the next visible match, if one exists',
'							var nextVisibleMatchIndex = currentSearch.getNextVisibleMatchIndex();',
'							if (nextVisibleMatchIndex > -1) {',
'								setCurrentMatchIndex(nextVisibleMatchIndex);',
'								displayMatches();',
'							} else {',
'								displayNoMatches();',
'							}',
'						}',
'					} else {',
'						displayNoMatches();',
'					}',
'				}',
'			}',
'',
'			function refreshCurrentMatch() {',
'				if (currentSearch && currentSearch.hasVisibleMatches()) {',
'					setCurrentMatchIndex(currentMatchIndex);',
'				}',
'			}',
'',
'			function displayMatches() {',
'				replaceClass($("searchBox"), "hasmatches", "nomatches");',
'				$("searchBox").title = "" + currentSearch.matches.length + " matches found";',
'				$("searchNav").style.display = "block";',
'				setLogContainerHeight();',
'			}',
'',
'			function displayNoMatches() {',
'				replaceClass($("searchBox"), "nomatches", "hasmatches");',
'				$("searchBox").title = "No matches found";',
'				$("searchNav").style.display = "none";',
'				setLogContainerHeight();',
'			}',
'',
'			function toggleSearchEnabled(enable) {',
'				enable = (typeof enable == "undefined") ? !$("searchDisable").checked : enable;',
'				$("searchBox").disabled = !enable;',
'				$("searchReset").disabled = !enable;',
'				$("searchRegex").disabled = !enable;',
'				$("searchNext").disabled = !enable;',
'				$("searchPrevious").disabled = !enable;',
'				$("searchCaseSensitive").disabled = !enable;',
'				$("searchNav").style.display = (enable && ($("searchBox").value !== "") &&',
'						currentSearch && currentSearch.hasVisibleMatches()) ?',
'					"block" : "none";',
'				if (enable) {',
'					removeClass($("search"), "greyedout");',
'					addClass(document.body, "searching");',
'					if ($("searchHighlight").checked) {',
'						addClass(logMainContainer, "searchhighlight");',
'					} else {',
'						removeClass(logMainContainer, "searchhighlight");',
'					}',
'					if ($("searchFilter").checked) {',
'						addClass(logMainContainer, "searchfilter");',
'					} else {',
'						removeClass(logMainContainer, "searchfilter");',
'					}',
'					$("searchDisable").checked = !enable;',
'				} else {',
'					addClass($("search"), "greyedout");',
'					removeClass(document.body, "searching");',
'					removeClass(logMainContainer, "searchhighlight");',
'					removeClass(logMainContainer, "searchfilter");',
'				}',
'				setLogContainerHeight();',
'			}',
'',
'			function toggleSearchFilter() {',
'				var enable = $("searchFilter").checked;',
'				if (enable) {',
'					addClass(logMainContainer, "searchfilter");',
'				} else {',
'					removeClass(logMainContainer, "searchfilter");',
'				}',
'				refreshCurrentMatch();',
'			}',
'',
'			function toggleSearchHighlight() {',
'				var enable = $("searchHighlight").checked;',
'				if (enable) {',
'					addClass(logMainContainer, "searchhighlight");',
'				} else {',
'					removeClass(logMainContainer, "searchhighlight");',
'				}',
'			}',
'',
'			function clearSearch() {',
'				$("searchBox").value = "";',
'				doSearch();',
'			}',
'',
'			function searchNext() {',
'				if (currentSearch !== null && currentMatchIndex !== null) {',
'					currentSearch.matches[currentMatchIndex].setNotCurrent();',
'					var nextMatchIndex = currentSearch.getNextVisibleMatchIndex();',
'					if (nextMatchIndex > currentMatchIndex || confirm("Reached the end of the page. Start from the top?")) {',
'						setCurrentMatchIndex(nextMatchIndex);',
'					}',
'				}',
'			}',
'',
'			function searchPrevious() {',
'				if (currentSearch !== null && currentMatchIndex !== null) {',
'					currentSearch.matches[currentMatchIndex].setNotCurrent();',
'					var previousMatchIndex = currentSearch.getPreviousVisibleMatchIndex();',
'					if (previousMatchIndex < currentMatchIndex || confirm("Reached the start of the page. Continue from the bottom?")) {',
'						setCurrentMatchIndex(previousMatchIndex);',
'					}',
'				}',
'			}',
'',
'			function setCurrentMatchIndex(index) {',
'				currentMatchIndex = index;',
'				currentSearch.matches[currentMatchIndex].setCurrent();',
'			}',
'',
'			/* ------------------------------------------------------------------------- */',
'',
'			// CSS Utilities',
'',
'			function addClass(el, cssClass) {',
'				if (!hasClass(el, cssClass)) {',
'					if (el.className) {',
'						el.className += " " + cssClass;',
'					} else {',
'						el.className = cssClass;',
'					}',
'				}',
'			}',
'',
'			function hasClass(el, cssClass) {',
'				if (el.className) {',
'					var classNames = el.className.split(" ");',
'					return array_contains(classNames, cssClass);',
'				}',
'				return false;',
'			}',
'',
'			function removeClass(el, cssClass) {',
'				if (hasClass(el, cssClass)) {',
'					// Rebuild the className property',
'					var existingClasses = el.className.split(" ");',
'					var newClasses = [];',
'					for (var i = 0, len = existingClasses.length; i < len; i++) {',
'						if (existingClasses[i] != cssClass) {',
'							newClasses[newClasses.length] = existingClasses[i];',
'						}',
'					}',
'					el.className = newClasses.join(" ");',
'				}',
'			}',
'',
'			function replaceClass(el, newCssClass, oldCssClass) {',
'				removeClass(el, oldCssClass);',
'				addClass(el, newCssClass);',
'			}',
'',
'			/* ------------------------------------------------------------------------- */',
'',
'			// Other utility functions',
'',
'			function getElementsByClass(el, cssClass, tagName) {',
'				var elements = el.getElementsByTagName(tagName);',
'				var matches = [];',
'				for (var i = 0, len = elements.length; i < len; i++) {',
'					if (hasClass(elements[i], cssClass)) {',
'						matches.push(elements[i]);',
'					}',
'				}',
'				return matches;',
'			}',
'',
'			// Syntax borrowed from Prototype library',
'			function $(id) {',
'				return document.getElementById(id);',
'			}',
'',
'			function isDescendant(node, ancestorNode) {',
'				while (node != null) {',
'					if (node === ancestorNode) {',
'						return true;',
'					}',
'					node = node.parentNode;',
'				}',
'				return false;',
'			}',
'',
'			function isOrphan(node) {',
'				var currentNode = node;',
'				while (currentNode) {',
'					if (currentNode == document.body) {',
'						return false;',
'					}',
'					currentNode = currentNode.parentNode;',
'				}',
'				return true;',
'			}',
'',
'			function escapeHtml(str) {',
'				return str.replace(/&/g, "&amp;").replace(/[<]/g, "&lt;").replace(/>/g, "&gt;");',
'			}',
'',
'			function getWindowWidth() {',
'				if (window.innerWidth) {',
'					return window.innerWidth;',
'				} else if (document.documentElement && document.documentElement.clientWidth) {',
'					return document.documentElement.clientWidth;',
'				} else if (document.body) {',
'					return document.body.clientWidth;',
'				}',
'				return 0;',
'			}',
'',
'			function getWindowHeight() {',
'				if (window.innerHeight) {',
'					return window.innerHeight;',
'				} else if (document.documentElement && document.documentElement.clientHeight) {',
'					return document.documentElement.clientHeight;',
'				} else if (document.body) {',
'					return document.body.clientHeight;',
'				}',
'				return 0;',
'			}',
'',
'			function getToolBarsHeight() {',
'				return $("switches").offsetHeight;',
'			}',
'',
'			function getChromeHeight() {',
'				var height = getToolBarsHeight();',
'				if (showCommandLine) {',
'					height += $("commandLine").offsetHeight;',
'				}',
'				return height;',
'			}',
'',
'			function setLogContainerHeight() {',
'				if (logMainContainer) {',
'					var windowHeight = getWindowHeight();',
'					$("body").style.height = getWindowHeight() + "px";',
'					logMainContainer.style.height = "" +',
'						Math.max(0, windowHeight - getChromeHeight()) + "px";',
'				}',
'			}',
'',
'			function setCommandInputWidth() {',
'				if (showCommandLine) {',
'					$("command").style.width = "" + Math.max(0, $("commandLineContainer").offsetWidth -',
'						($("evaluateButton").offsetWidth + 13)) + "px";',
'				}',
'			}',
'',
'			window.onresize = function() {',
'				setCommandInputWidth();',
'				setLogContainerHeight();',
'			};',
'',
'			if (!Array.prototype.push) {',
'				Array.prototype.push = function() {',
'			        for (var i = 0, len = arguments.length; i < len; i++){',
'			            this[this.length] = arguments[i];',
'			        }',
'			        return this.length;',
'				};',
'			}',
'',
'			if (!Array.prototype.pop) {',
'				Array.prototype.pop = function() {',
'					if (this.length > 0) {',
'						var val = this[this.length - 1];',
'						this.length = this.length - 1;',
'						return val;',
'					}',
'				};',
'			}',
'',
'			if (!Array.prototype.shift) {',
'				Array.prototype.shift = function() {',
'					if (this.length > 0) {',
'						var firstItem = this[0];',
'						for (var i = 0, len = this.length - 1; i < len; i++) {',
'							this[i] = this[i + 1];',
'						}',
'						this.length = this.length - 1;',
'						return firstItem;',
'					}',
'				};',
'			}',
'',
'			if (!Array.prototype.splice) {',
'				Array.prototype.splice = function(startIndex, deleteCount) {',
'					var itemsAfterDeleted = this.slice(startIndex + deleteCount);',
'					var itemsDeleted = this.slice(startIndex, startIndex + deleteCount);',
'					this.length = startIndex;',
'					// Copy the arguments into a proper Array object',
'					var argumentsArray = [];',
'					for (var i = 0, len = arguments.length; i < len; i++) {',
'						argumentsArray[i] = arguments[i];',
'					}',
'					var itemsToAppend = (argumentsArray.length > 2) ?',
'						itemsAfterDeleted = argumentsArray.slice(2).concat(itemsAfterDeleted) : itemsAfterDeleted;',
'					for (i = 0, len = itemsToAppend.length; i < len; i++) {',
'						this.push(itemsToAppend[i]);',
'					}',
'					return itemsDeleted;',
'				};',
'			}',
'',
'			function array_remove(arr, val) {',
'				var index = -1;',
'				for (var i = 0, len = arr.length; i < len; i++) {',
'					if (arr[i] === val) {',
'						index = i;',
'						break;',
'					}',
'				}',
'				if (index >= 0) {',
'					arr.splice(index, 1);',
'					return index;',
'				} else {',
'					return false;',
'				}',
'			}',
'',
'			function array_removeFromStart(array, numberToRemove) {',
'				if (Array.prototype.splice) {',
'					array.splice(0, numberToRemove);',
'				} else {',
'					for (var i = numberToRemove, len = array.length; i < len; i++) {',
'						array[i - numberToRemove] = array[i];',
'					}',
'					array.length = array.length - numberToRemove;',
'				}',
'				return array;',
'			}',
'',
'			function array_contains(arr, val) {',
'				for (var i = 0, len = arr.length; i < len; i++) {',
'					if (arr[i] == val) {',
'						return true;',
'					}',
'				}',
'				return false;',
'			}',
'',
'			function getErrorMessage(ex) {',
'				if (ex.message) {',
'					return ex.message;',
'				} else if (ex.description) {',
'					return ex.description;',
'				}',
'				return "" + ex;',
'			}',
'',
'			function moveCaretToEnd(input) {',
'				if (input.setSelectionRange) {',
'					input.focus();',
'					var length = input.value.length;',
'					input.setSelectionRange(length, length);',
'				} else if (input.createTextRange) {',
'					var range = input.createTextRange();',
'					range.collapse(false);',
'					range.select();',
'				}',
'				input.focus();',
'			}',
'',
'			function stopPropagation(evt) {',
'				if (evt.stopPropagation) {',
'					evt.stopPropagation();',
'				} else if (typeof evt.cancelBubble != "undefined") {',
'					evt.cancelBubble = true;',
'				}',
'			}',
'',
'			function getEvent(evt) {',
'				return evt ? evt : event;',
'			}',
'',
'			function getTarget(evt) {',
'				return evt.target ? evt.target : evt.srcElement;',
'			}',
'',
'			function getRelatedTarget(evt) {',
'				if (evt.relatedTarget) {',
'					return evt.relatedTarget;',
'				} else if (evt.srcElement) {',
'					switch(evt.type) {',
'						case "mouseover":',
'							return evt.fromElement;',
'						case "mouseout":',
'							return evt.toElement;',
'						default:',
'							return evt.srcElement;',
'					}',
'				}',
'			}',
'',
'			function cancelKeyEvent(evt) {',
'				evt.returnValue = false;',
'				stopPropagation(evt);',
'			}',
'',
'			function evalCommandLine() {',
'				var expr = $("command").value;',
'				evalCommand(expr);',
'				$("command").value = "";',
'			}',
'',
'			function evalLastCommand() {',
'				if (lastCommand != null) {',
'					evalCommand(lastCommand);',
'				}',
'			}',
'',
'			var lastCommand = null;',
'			var commandHistory = [];',
'			var currentCommandIndex = 0;',
'',
'			function evalCommand(expr) {',
'				if (appender) {',
'					appender.evalCommandAndAppend(expr);',
'				} else {',
'					var prefix = ">>> " + expr + "\\r\\n";',
'					try {',
'						log("INFO", prefix + eval(expr));',
'					} catch (ex) {',
'						log("ERROR", prefix + "Error: " + getErrorMessage(ex));',
'					}',
'				}',
'				// Update command history',
'				if (expr != commandHistory[commandHistory.length - 1]) {',
'					commandHistory.push(expr);',
'					// Update the appender',
'					if (appender) {',
'						appender.storeCommandHistory(commandHistory);',
'					}',
'				}',
'				currentCommandIndex = (expr == commandHistory[currentCommandIndex]) ? currentCommandIndex + 1 : commandHistory.length;',
'				lastCommand = expr;',
'			}',
'			//]]>',
'		</script>',
'		<style type="text/css">',
'			body {',
'				background-color: white;',
'				color: black;',
'				padding: 0;',
'				margin: 0;',
'				font-family: tahoma, verdana, arial, helvetica, sans-serif;',
'				overflow: hidden;',
'			}',
'',
'			div#switchesContainer input {',
'				margin-bottom: 0;',
'			}',
'',
'			div.toolbar {',
'				border-top: solid #ffffff 1px;',
'				border-bottom: solid #aca899 1px;',
'				background-color: #f1efe7;',
'				padding: 3px 5px;',
'				font-size: 68.75%;',
'			}',
'',
'			div.toolbar, div#search input {',
'				font-family: tahoma, verdana, arial, helvetica, sans-serif;',
'			}',
'',
'			div.toolbar input.button {',
'				padding: 0 5px;',
'				font-size: 100%;',
'			}',
'',
'			div.toolbar input.hidden {',
'				display: none;',
'			}',
'',
'			div#switches input#clearButton {',
'				margin-left: 20px;',
'			}',
'',
'			div#levels label {',
'				font-weight: bold;',
'			}',
'',
'			div#levels label, div#options label {',
'				margin-right: 5px;',
'			}',
'',
'			div#levels label#wrapLabel {',
'				font-weight: normal;',
'			}',
'',
'			div#search label {',
'				margin-right: 10px;',
'			}',
'',
'			div#search label.searchboxlabel {',
'				margin-right: 0;',
'			}',
'',
'			div#search input {',
'				font-size: 100%;',
'			}',
'',
'			div#search input.validregex {',
'				color: green;',
'			}',
'',
'			div#search input.invalidregex {',
'				color: red;',
'			}',
'',
'			div#search input.nomatches {',
'				color: white;',
'				background-color: #ff6666;',
'			}',
'',
'			div#search input.nomatches {',
'				color: white;',
'				background-color: #ff6666;',
'			}',
'',
'			div#searchNav {',
'				display: none;',
'			}',
'',
'			div#commandLine {',
'				display: none;',
'			}',
'',
'			div#commandLine input#command {',
'				font-size: 100%;',
'				font-family: Courier New, Courier;',
'			}',
'',
'			div#commandLine input#evaluateButton {',
'			}',
'',
'			*.greyedout {',
'				color: gray !important;',
'				border-color: gray !important;',
'			}',
'',
'			*.greyedout *.alwaysenabled { color: black; }',
'',
'			*.unselectable {',
'				-khtml-user-select: none;',
'				-moz-user-select: none;',
'				user-select: none;',
'			}',
'',
'			div#log {',
'				font-family: Courier New, Courier;',
'				font-size: 75%;',
'				width: 100%;',
'				overflow: auto;',
'				clear: both;',
'				position: relative;',
'			}',
'',
'			div.group {',
'				border-color: #cccccc;',
'				border-style: solid;',
'				border-width: 1px 0 1px 1px;',
'				overflow: visible;',
'			}',
'',
'			div.oldIe div.group, div.oldIe div.group *, div.oldIe *.logentry {',
'				height: 1%;',
'			}',
'',
'			div.group div.groupheading span.expander {',
'				border: solid black 1px;',
'				font-family: Courier New, Courier;',
'				font-size: 0.833em;',
'				background-color: #eeeeee;',
'				position: relative;',
'				top: -1px;',
'				color: black;',
'				padding: 0 2px;',
'				cursor: pointer;',
'				cursor: hand;',
'				height: 1%;',
'			}',
'',
'			div.group div.groupcontent {',
'				margin-left: 10px;',
'				padding-bottom: 2px;',
'				overflow: visible;',
'			}',
'',
'			div.group div.expanded {',
'				display: block;',
'			}',
'',
'			div.group div.collapsed {',
'				display: none;',
'			}',
'',
'			*.logentry {',
'				overflow: visible;',
'				display: none;',
'				white-space: pre;',
'			}',
'',
'			span.pre {',
'				white-space: pre;',
'			}',
'			',
'			pre.unwrapped {',
'				display: inline !important;',
'			}',
'',
'			pre.unwrapped pre.pre, div.wrapped pre.pre {',
'				display: inline;',
'			}',
'',
'			div.wrapped pre.pre {',
'				white-space: normal;',
'			}',
'',
'			div.wrapped {',
'				display: none;',
'			}',
'',
'			body.searching *.logentry span.currentmatch {',
'				color: white !important;',
'				background-color: green !important;',
'			}',
'',
'			body.searching div.searchhighlight *.logentry span.searchterm {',
'				color: black;',
'				background-color: yellow;',
'			}',
'',
'			div.wrap *.logentry {',
'				white-space: normal !important;',
'				border-width: 0 0 1px 0;',
'				border-color: #dddddd;',
'				border-style: dotted;',
'			}',
'',
'			div.wrap #log_wrapped, #log_unwrapped {',
'				display: block;',
'			}',
'',
'			div.wrap #log_unwrapped, #log_wrapped {',
'				display: none;',
'			}',
'',
'			div.wrap *.logentry span.pre {',
'				overflow: visible;',
'				white-space: normal;',
'			}',
'',
'			div.wrap *.logentry pre.unwrapped {',
'				display: none;',
'			}',
'',
'			div.wrap *.logentry span.wrapped {',
'				display: inline;',
'			}',
'',
'			div.searchfilter *.searchnonmatch {',
'				display: none !important;',
'			}',
'',
'			div#log *.TRACE, label#label_TRACE {',
'				color: #666666;',
'			}',
'',
'			div#log *.DEBUG, label#label_DEBUG {',
'				color: green;',
'			}',
'',
'			div#log *.INFO, label#label_INFO {',
'				color: #000099;',
'			}',
'',
'			div#log *.WARN, label#label_WARN {',
'				color: #999900;',
'			}',
'',
'			div#log *.ERROR, label#label_ERROR {',
'				color: red;',
'			}',
'',
'			div#log *.FATAL, label#label_FATAL {',
'				color: #660066;',
'			}',
'',
'			div.TRACE#log *.TRACE,',
'			div.DEBUG#log *.DEBUG,',
'			div.INFO#log *.INFO,',
'			div.WARN#log *.WARN,',
'			div.ERROR#log *.ERROR,',
'			div.FATAL#log *.FATAL {',
'				display: block;',
'			}',
'',
'			div#log div.separator {',
'				background-color: #cccccc;',
'				margin: 5px 0;',
'				line-height: 1px;',
'			}',
'		</style>',
'	</head>',
'',
'	<body id="body">',
'		<div id="switchesContainer">',
'			<div id="switches">',
'				<div id="levels" class="toolbar">',
'					Filters:',
'					<input type="checkbox" id="switch_TRACE" onclick="applyFilters(); checkAllLevels()" checked="checked" title="Show/hide trace messages" /><label for="switch_TRACE" id="label_TRACE">trace</label>',
'					<input type="checkbox" id="switch_DEBUG" onclick="applyFilters(); checkAllLevels()" checked="checked" title="Show/hide debug messages" /><label for="switch_DEBUG" id="label_DEBUG">debug</label>',
'					<input type="checkbox" id="switch_INFO" onclick="applyFilters(); checkAllLevels()" checked="checked" title="Show/hide info messages" /><label for="switch_INFO" id="label_INFO">info</label>',
'					<input type="checkbox" id="switch_WARN" onclick="applyFilters(); checkAllLevels()" checked="checked" title="Show/hide warn messages" /><label for="switch_WARN" id="label_WARN">warn</label>',
'					<input type="checkbox" id="switch_ERROR" onclick="applyFilters(); checkAllLevels()" checked="checked" title="Show/hide error messages" /><label for="switch_ERROR" id="label_ERROR">error</label>',
'					<input type="checkbox" id="switch_FATAL" onclick="applyFilters(); checkAllLevels()" checked="checked" title="Show/hide fatal messages" /><label for="switch_FATAL" id="label_FATAL">fatal</label>',
'					<input type="checkbox" id="switch_ALL" onclick="toggleAllLevels(); applyFilters()" checked="checked" title="Show/hide all messages" /><label for="switch_ALL" id="label_ALL">all</label>',
'				</div>',
'				<div id="search" class="toolbar">',
'					<label for="searchBox" class="searchboxlabel">Search:</label> <input type="text" id="searchBox" onclick="toggleSearchEnabled(true)" onkeyup="scheduleSearch()" size="20" />',
'					<input type="button" id="searchReset" disabled="disabled" value="Reset" onclick="clearSearch()" class="button" title="Reset the search" />',
'					<input type="checkbox" id="searchRegex" onclick="doSearch()" title="If checked, search is treated as a regular expression" /><label for="searchRegex">Regex</label>',
'					<input type="checkbox" id="searchCaseSensitive" onclick="doSearch()" title="If checked, search is case sensitive" /><label for="searchCaseSensitive">Match case</label>',
'					<input type="checkbox" id="searchDisable" onclick="toggleSearchEnabled()" title="Enable/disable search" /><label for="searchDisable" class="alwaysenabled">Disable</label>',
'					<div id="searchNav">',
'						<input type="button" id="searchNext" disabled="disabled" value="Next" onclick="searchNext()" class="button" title="Go to the next matching log entry" />',
'						<input type="button" id="searchPrevious" disabled="disabled" value="Previous" onclick="searchPrevious()" class="button" title="Go to the previous matching log entry" />',
'						<input type="checkbox" id="searchFilter" onclick="toggleSearchFilter()" title="If checked, non-matching log entries are filtered out" /><label for="searchFilter">Filter</label>',
'						<input type="checkbox" id="searchHighlight" onclick="toggleSearchHighlight()" title="Highlight matched search terms" /><label for="searchHighlight" class="alwaysenabled">Highlight all</label>',
'					</div>',
'				</div>',
'				<div id="options" class="toolbar">',
'					Options:',
'					<input type="checkbox" id="enableLogging" onclick="toggleLoggingEnabled()" checked="checked" title="Enable/disable logging" /><label for="enableLogging" id="enableLoggingLabel">Log</label>',
'					<input type="checkbox" id="wrap" onclick="toggleWrap()" title="Enable / disable word wrap" /><label for="wrap" id="wrapLabel">Wrap</label>',
'					<input type="checkbox" id="newestAtTop" onclick="toggleNewestAtTop()" title="If checked, causes newest messages to appear at the top" /><label for="newestAtTop" id="newestAtTopLabel">Newest at the top</label>',
'					<input type="checkbox" id="scrollToLatest" onclick="toggleScrollToLatest()" checked="checked" title="If checked, window automatically scrolls to a new message when it is added" /><label for="scrollToLatest" id="scrollToLatestLabel">Scroll to latest</label>',
'					<input type="button" id="clearButton" value="Clear" onclick="clearLog()" class="button" title="Clear all log messages"  />',
'					<input type="button" id="hideButton" value="Hide" onclick="hide()" class="hidden button" title="Hide the console" />',
'					<input type="button" id="closeButton" value="Close" onclick="closeWindow()" class="hidden button" title="Close the window" />',
'				</div>',
'			</div>',
'		</div>',
'		<div id="log" class="TRACE DEBUG INFO WARN ERROR FATAL"></div>',
'		<div id="commandLine" class="toolbar">',
'			<div id="commandLineContainer">',
'				<input type="text" id="command" title="Enter a JavaScript command here and hit return or press \'Evaluate\'" />',
'				<input type="button" id="evaluateButton" value="Evaluate" class="button" title="Evaluate the command" onclick="evalCommandLine()" />',
'			</div>',
'		</div>',
'	</body>',
'</html>',
''
];
		};

		var defaultCommandLineFunctions = [];

		ConsoleAppender = function() {};

		var consoleAppenderIdCounter = 1;
		ConsoleAppender.prototype = new Appender();

		ConsoleAppender.prototype.create = function(inPage, container,
				lazyInit, initiallyMinimized, useDocumentWrite, width, height, focusConsoleWindow) {
			var appender = this;

			// Common properties
			var initialized = false;
			var consoleWindowCreated = false;
			var consoleWindowLoaded = false;
			var consoleClosed = false;

			var queuedLoggingEvents = [];
			var isSupported = true;
			var consoleAppenderId = consoleAppenderIdCounter++;

			// Local variables
			initiallyMinimized = extractBooleanFromParam(initiallyMinimized, this.defaults.initiallyMinimized);
			lazyInit = extractBooleanFromParam(lazyInit, this.defaults.lazyInit);
			useDocumentWrite = extractBooleanFromParam(useDocumentWrite, this.defaults.useDocumentWrite);
			var newestMessageAtTop = this.defaults.newestMessageAtTop;
			var scrollToLatestMessage = this.defaults.scrollToLatestMessage;
			width = width ? width : this.defaults.width;
			height = height ? height : this.defaults.height;
			var maxMessages = this.defaults.maxMessages;
			var showCommandLine = this.defaults.showCommandLine;
			var commandLineObjectExpansionDepth = this.defaults.commandLineObjectExpansionDepth;
			var showHideButton = this.defaults.showHideButton;
            var showCloseButton = this.defaults.showCloseButton;
            var showLogEntryDeleteButtons = this.defaults.showLogEntryDeleteButtons;

			this.setLayout(this.defaults.layout);

			// Functions whose implementations vary between subclasses
			var init, createWindow, safeToAppend, getConsoleWindow, open;

			// Configuration methods. The function scope is used to prevent
			// direct alteration to the appender configuration properties.
			var appenderName = inPage ? "InPageAppender" : "PopUpAppender";
			var checkCanConfigure = function(configOptionName) {
				if (consoleWindowCreated) {
					handleError(appenderName + ": configuration option '" + configOptionName + "' may not be set after the appender has been initialized");
					return false;
				}
				return true;
			};

			var consoleWindowExists = function() {
				return (consoleWindowLoaded && isSupported && !consoleClosed);
			};

			this.isNewestMessageAtTop = function() { return newestMessageAtTop; };
			this.setNewestMessageAtTop = function(newestMessageAtTopParam) {
				newestMessageAtTop = bool(newestMessageAtTopParam);
				if (consoleWindowExists()) {
					getConsoleWindow().setNewestAtTop(newestMessageAtTop);
				}
			};

			this.isScrollToLatestMessage = function() { return scrollToLatestMessage; };
			this.setScrollToLatestMessage = function(scrollToLatestMessageParam) {
				scrollToLatestMessage = bool(scrollToLatestMessageParam);
				if (consoleWindowExists()) {
					getConsoleWindow().setScrollToLatest(scrollToLatestMessage);
				}
			};

			this.getWidth = function() { return width; };
			this.setWidth = function(widthParam) {
				if (checkCanConfigure("width")) {
					width = extractStringFromParam(widthParam, width);
				}
			};

			this.getHeight = function() { return height; };
			this.setHeight = function(heightParam) {
				if (checkCanConfigure("height")) {
					height = extractStringFromParam(heightParam, height);
				}
			};

			this.getMaxMessages = function() { return maxMessages; };
			this.setMaxMessages = function(maxMessagesParam) {
				maxMessages = extractIntFromParam(maxMessagesParam, maxMessages);
				if (consoleWindowExists()) {
					getConsoleWindow().setMaxMessages(maxMessages);
				}
			};

			this.isShowCommandLine = function() { return showCommandLine; };
			this.setShowCommandLine = function(showCommandLineParam) {
				showCommandLine = bool(showCommandLineParam);
				if (consoleWindowExists()) {
					getConsoleWindow().setShowCommandLine(showCommandLine);
				}
			};

			this.isShowHideButton = function() { return showHideButton; };
			this.setShowHideButton = function(showHideButtonParam) {
				showHideButton = bool(showHideButtonParam);
				if (consoleWindowExists()) {
					getConsoleWindow().setShowHideButton(showHideButton);
				}
			};

			this.isShowCloseButton = function() { return showCloseButton; };
			this.setShowCloseButton = function(showCloseButtonParam) {
				showCloseButton = bool(showCloseButtonParam);
				if (consoleWindowExists()) {
					getConsoleWindow().setShowCloseButton(showCloseButton);
				}
			};

			this.getCommandLineObjectExpansionDepth = function() { return commandLineObjectExpansionDepth; };
			this.setCommandLineObjectExpansionDepth = function(commandLineObjectExpansionDepthParam) {
				commandLineObjectExpansionDepth = extractIntFromParam(commandLineObjectExpansionDepthParam, commandLineObjectExpansionDepth);
			};

			var minimized = initiallyMinimized;
			this.isInitiallyMinimized = function() { return initiallyMinimized; };
			this.setInitiallyMinimized = function(initiallyMinimizedParam) {
				if (checkCanConfigure("initiallyMinimized")) {
					initiallyMinimized = bool(initiallyMinimizedParam);
					minimized = initiallyMinimized;
				}
			};

			this.isUseDocumentWrite = function() { return useDocumentWrite; };
			this.setUseDocumentWrite = function(useDocumentWriteParam) {
				if (checkCanConfigure("useDocumentWrite")) {
					useDocumentWrite = bool(useDocumentWriteParam);
				}
			};

			// Common methods
			function QueuedLoggingEvent(loggingEvent, formattedMessage) {
				this.loggingEvent = loggingEvent;
				this.levelName = loggingEvent.level.name;
				this.formattedMessage = formattedMessage;
			}

			QueuedLoggingEvent.prototype.append = function() {
				getConsoleWindow().log(this.levelName, this.formattedMessage);
			};

			function QueuedGroup(name, initiallyExpanded) {
				this.name = name;
				this.initiallyExpanded = initiallyExpanded;
			}

			QueuedGroup.prototype.append = function() {
				getConsoleWindow().group(this.name, this.initiallyExpanded);
			};

			function QueuedGroupEnd() {}

			QueuedGroupEnd.prototype.append = function() {
				getConsoleWindow().groupEnd();
			};

			var checkAndAppend = function() {
				// Next line forces a check of whether the window has been closed
				safeToAppend();
				if (!initialized) {
					init();
				} else if (consoleClosed && reopenWhenClosed) {
					createWindow();
				}
				if (safeToAppend()) {
					appendQueuedLoggingEvents();
				}
			};

			this.append = function(loggingEvent) {
				if (isSupported) {
					// Format the message
					var formattedMessage = appender.getLayout().format(loggingEvent);
					if (this.getLayout().ignoresThrowable()) {
						formattedMessage += loggingEvent.getThrowableStrRep();
					}
					queuedLoggingEvents.push(new QueuedLoggingEvent(loggingEvent, formattedMessage));
					checkAndAppend();
				}
			};

            this.group = function(name, initiallyExpanded) {
				if (isSupported) {
					queuedLoggingEvents.push(new QueuedGroup(name, initiallyExpanded));
					checkAndAppend();
				}
			};

            this.groupEnd = function() {
				if (isSupported) {
					queuedLoggingEvents.push(new QueuedGroupEnd());
					checkAndAppend();
				}
			};

			var appendQueuedLoggingEvents = function() {
				var currentLoggingEvent;
				while (queuedLoggingEvents.length > 0) {
					queuedLoggingEvents.shift().append();
				}
				if (focusConsoleWindow) {
					getConsoleWindow().focus();
				}
			};

			this.setAddedToLogger = function(logger) {
				this.loggers.push(logger);
				if (enabled && !lazyInit) {
					init();
				}
			};

			this.clear = function() {
				if (consoleWindowExists()) {
					getConsoleWindow().clearLog();
				}
				queuedLoggingEvents.length = 0;
			};

			this.focus = function() {
				if (consoleWindowExists()) {
					getConsoleWindow().focus();
				}
			};

			this.focusCommandLine = function() {
				if (consoleWindowExists()) {
					getConsoleWindow().focusCommandLine();
				}
			};

			this.focusSearch = function() {
				if (consoleWindowExists()) {
					getConsoleWindow().focusSearch();
				}
			};

			var commandWindow = window;

			this.getCommandWindow = function() { return commandWindow; };
			this.setCommandWindow = function(commandWindowParam) {
				commandWindow = commandWindowParam;
			};

			this.executeLastCommand = function() {
				if (consoleWindowExists()) {
					getConsoleWindow().evalLastCommand();
				}
			};

			var commandLayout = new PatternLayout("%m");
			this.getCommandLayout = function() { return commandLayout; };
			this.setCommandLayout = function(commandLayoutParam) {
				commandLayout = commandLayoutParam;
			};

			this.evalCommandAndAppend = function(expr) {
				var commandReturnValue = { appendResult: true, isError: false };
				var commandOutput = "";
				// Evaluate the command
				try {
					var result, i;
					// The next three lines constitute a workaround for IE. Bizarrely, iframes seem to have no
					// eval method on the window object initially, but once execScript has been called on
					// it once then the eval method magically appears. See http://www.thismuchiknow.co.uk/?p=25
					if (!commandWindow.eval && commandWindow.execScript) {
						commandWindow.execScript("null");
					}

					var commandLineFunctionsHash = {};
					for (i = 0, len = commandLineFunctions.length; i < len; i++) {
						commandLineFunctionsHash[commandLineFunctions[i][0]] = commandLineFunctions[i][1];
					}

					// Keep an array of variables that are being changed in the command window so that they
					// can be restored to their original values afterwards
					var objectsToRestore = [];
					var addObjectToRestore = function(name) {
						objectsToRestore.push([name, commandWindow[name]]);
					};

					addObjectToRestore("appender");
					commandWindow.appender = appender;

					addObjectToRestore("commandReturnValue");
					commandWindow.commandReturnValue = commandReturnValue;

					addObjectToRestore("commandLineFunctionsHash");
					commandWindow.commandLineFunctionsHash = commandLineFunctionsHash;

					var addFunctionToWindow = function(name) {
						addObjectToRestore(name);
						commandWindow[name] = function() {
							return this.commandLineFunctionsHash[name](appender, arguments, commandReturnValue);
						};
					};

					for (i = 0, len = commandLineFunctions.length; i < len; i++) {
						addFunctionToWindow(commandLineFunctions[i][0]);
					}

					// Another bizarre workaround to get IE to eval in the global scope
					if (commandWindow === window && commandWindow.execScript) {
						addObjectToRestore("evalExpr");
						addObjectToRestore("result");
						window.evalExpr = expr;
						commandWindow.execScript("window.result=eval(window.evalExpr);");
						result = window.result;
 					} else {
 						result = commandWindow.eval(expr);
 					}
					commandOutput = isUndefined(result) ? result : formatObjectExpansion(result, commandLineObjectExpansionDepth);

					// Restore variables in the command window to their original state
					for (i = 0, len = objectsToRestore.length; i < len; i++) {
						commandWindow[objectsToRestore[i][0]] = objectsToRestore[i][1];
					}
				} catch (ex) {
					commandOutput = "Error evaluating command: " + getExceptionStringRep(ex);
					commandReturnValue.isError = true;
				}
				// Append command output
				if (commandReturnValue.appendResult) {
					var message = ">>> " + expr;
					if (!isUndefined(commandOutput)) {
						message += newLine + commandOutput;
					}
					var level = commandReturnValue.isError ? Level.ERROR : Level.INFO;
					var loggingEvent = new LoggingEvent(null, new Date(), level, [message], null);
					var mainLayout = this.getLayout();
					this.setLayout(commandLayout);
					this.append(loggingEvent);
					this.setLayout(mainLayout);
				}
			};

			var commandLineFunctions = defaultCommandLineFunctions.concat([]);

			this.addCommandLineFunction = function(functionName, commandLineFunction) {
				commandLineFunctions.push([functionName, commandLineFunction]);
			};

			var commandHistoryCookieName = "log4javascriptCommandHistory";
			this.storeCommandHistory = function(commandHistory) {
				setCookie(commandHistoryCookieName, commandHistory.join(","));
			};

			var writeHtml = function(doc) {
				var lines = getConsoleHtmlLines();
				doc.open();
				for (var i = 0, len = lines.length; i < len; i++) {
					doc.writeln(lines[i]);
				}
				doc.close();
			};

			// Set up event listeners
			this.setEventTypes(["load", "unload"]);

			var consoleWindowLoadHandler = function() {
				var win = getConsoleWindow();
				win.setAppender(appender);
				win.setNewestAtTop(newestMessageAtTop);
				win.setScrollToLatest(scrollToLatestMessage);
				win.setMaxMessages(maxMessages);
				win.setShowCommandLine(showCommandLine);
				win.setShowHideButton(showHideButton);
				win.setShowCloseButton(showCloseButton);
				win.setMainWindow(window);

				// Restore command history stored in cookie
				var storedValue = getCookie(commandHistoryCookieName);
				if (storedValue) {
					win.commandHistory = storedValue.split(",");
					win.currentCommandIndex = win.commandHistory.length;
				}

				appender.dispatchEvent("load", { "win" : win });
			};

			this.unload = function() {
				logLog.debug("unload " + this + ", caller: " + this.unload.caller);
				if (!consoleClosed) {
					logLog.debug("really doing unload " + this);
					consoleClosed = true;
					consoleWindowLoaded = false;
					consoleWindowCreated = false;
					appender.dispatchEvent("unload", {});
				}
			};

			var pollConsoleWindow = function(windowTest, interval, successCallback, errorMessage) {
				function doPoll() {
					try {
						// Test if the console has been closed while polling
						if (consoleClosed) {
							clearInterval(poll);
						}
						if (windowTest(getConsoleWindow())) {
							clearInterval(poll);
							successCallback();
						}
					} catch (ex) {
						clearInterval(poll);
						isSupported = false;
						handleError(errorMessage, ex);
					}
				}

				// Poll the pop-up since the onload event is not reliable
				var poll = setInterval(doPoll, interval);
			};

			var getConsoleUrl = function() {
				var documentDomainSet = (document.domain != location.hostname);
				return useDocumentWrite ? "" : getBaseUrl() + "console_uncompressed.html" +
											   (documentDomainSet ? "?log4javascript_domain=" + escape(document.domain) : "");
			};

			// Define methods and properties that vary between subclasses
			if (inPage) {
				// InPageAppender

				var containerElement = null;

				// Configuration methods. The function scope is used to prevent
				// direct alteration to the appender configuration properties.
				var cssProperties = [];
				this.addCssProperty = function(name, value) {
					if (checkCanConfigure("cssProperties")) {
						cssProperties.push([name, value]);
					}
				};

				// Define useful variables
				var windowCreationStarted = false;
				var iframeContainerDiv;
				var iframeId = uniqueId + "_InPageAppender_" + consoleAppenderId;

				this.hide = function() {
					if (initialized && consoleWindowCreated) {
						if (consoleWindowExists()) {
							getConsoleWindow().$("command").blur();
						}
						iframeContainerDiv.style.display = "none";
						minimized = true;
					}
				};

				this.show = function() {
					if (initialized) {
						if (consoleWindowCreated) {
							iframeContainerDiv.style.display = "block";
							this.setShowCommandLine(showCommandLine); // Force IE to update
							minimized = false;
						} else if (!windowCreationStarted) {
							createWindow(true);
						}
					}
				};

				this.isVisible = function() {
					return !minimized && !consoleClosed;
				};

				this.close = function(fromButton) {
					if (!consoleClosed && (!fromButton || confirm("This will permanently remove the console from the page. No more messages will be logged. Do you wish to continue?"))) {
						iframeContainerDiv.parentNode.removeChild(iframeContainerDiv);
						this.unload();
					}
				};

				// Create open, init, getConsoleWindow and safeToAppend functions
				open = function() {
					var initErrorMessage = "InPageAppender.open: unable to create console iframe";

					function finalInit() {
						try {
							if (!initiallyMinimized) {
								appender.show();
							}
							consoleWindowLoadHandler();
							consoleWindowLoaded = true;
							appendQueuedLoggingEvents();
						} catch (ex) {
							isSupported = false;
							handleError(initErrorMessage, ex);
						}
					}

					function writeToDocument() {
						try {
							var windowTest = function(win) { return isLoaded(win); };
							if (useDocumentWrite) {
								writeHtml(getConsoleWindow().document);
							}
							if (windowTest(getConsoleWindow())) {
								finalInit();
							} else {
								pollConsoleWindow(windowTest, 100, finalInit, initErrorMessage);
							}
						} catch (ex) {
							isSupported = false;
							handleError(initErrorMessage, ex);
						}
					}

					minimized = false;
					iframeContainerDiv = containerElement.appendChild(document.createElement("div"));

					iframeContainerDiv.style.width = width;
					iframeContainerDiv.style.height = height;
					iframeContainerDiv.style.border = "solid gray 1px";

					for (var i = 0, len = cssProperties.length; i < len; i++) {
						iframeContainerDiv.style[cssProperties[i][0]] = cssProperties[i][1];
					}

					var iframeSrc = useDocumentWrite ? "" : " src='" + getConsoleUrl() + "'";

					// Adding an iframe using the DOM would be preferable, but it doesn't work
					// in IE5 on Windows, or in Konqueror prior to version 3.5 - in Konqueror
					// it creates the iframe fine but I haven't been able to find a way to obtain
					// the iframe's window object
					iframeContainerDiv.innerHTML = "<iframe id='" + iframeId + "' name='" + iframeId +
						"' width='100%' height='100%' frameborder='0'" + iframeSrc +
						" scrolling='no'></iframe>";
					consoleClosed = false;

					// Write the console HTML to the iframe
					var iframeDocumentExistsTest = function(win) {
						try {
							return bool(win) && bool(win.document);
						} catch (ex) {
							return false;
						}
					};
					if (iframeDocumentExistsTest(getConsoleWindow())) {
						writeToDocument();
					} else {
						pollConsoleWindow(iframeDocumentExistsTest, 100, writeToDocument, initErrorMessage);
					}
					consoleWindowCreated = true;
				};

				createWindow = function(show) {
					if (show || !initiallyMinimized) {
						var pageLoadHandler = function() {
							if (!container) {
								// Set up default container element
								containerElement = document.createElement("div");
								containerElement.style.position = "fixed";
								containerElement.style.left = "0";
								containerElement.style.right = "0";
								containerElement.style.bottom = "0";
								document.body.appendChild(containerElement);
								appender.addCssProperty("borderWidth", "1px 0 0 0");
								appender.addCssProperty("zIndex", 1000000); // Can't find anything authoritative that says how big z-index can be
								open();
							} else {
								try {
									var el = document.getElementById(container);
									if (el.nodeType == 1) {
										containerElement = el;
									}
									open();
								} catch (ex) {
									handleError("InPageAppender.init: invalid container element '" + container + "' supplied", ex);
								}
							}
						};

						// Test the type of the container supplied. First, check if it's an element
						if (pageLoaded && container && container.appendChild) {
							containerElement = container;
							open();
						} else if (pageLoaded) {
							pageLoadHandler();
						} else {
							log4javascript.addEventListener("load", pageLoadHandler);
						}
						windowCreationStarted = true;
					}
				};

				init = function() {
					createWindow();
					initialized = true;
				};

				getConsoleWindow = function() {
					var iframe = window.frames[iframeId];
					if (iframe) {
						return iframe;
					}
				};

				safeToAppend = function() {
					if (isSupported && !consoleClosed) {
						if (consoleWindowCreated && !consoleWindowLoaded && getConsoleWindow() && isLoaded(getConsoleWindow())) {
							consoleWindowLoaded = true;
						}
						return consoleWindowLoaded;
					}
					return false;
				};
			} else {
				// PopUpAppender

				// Extract params
				var useOldPopUp = appender.defaults.useOldPopUp;
				var complainAboutPopUpBlocking = appender.defaults.complainAboutPopUpBlocking;
				var reopenWhenClosed = this.defaults.reopenWhenClosed;

				// Configuration methods. The function scope is used to prevent
				// direct alteration to the appender configuration properties.
				this.isUseOldPopUp = function() { return useOldPopUp; };
				this.setUseOldPopUp = function(useOldPopUpParam) {
					if (checkCanConfigure("useOldPopUp")) {
						useOldPopUp = bool(useOldPopUpParam);
					}
				};

				this.isComplainAboutPopUpBlocking = function() { return complainAboutPopUpBlocking; };
				this.setComplainAboutPopUpBlocking = function(complainAboutPopUpBlockingParam) {
					if (checkCanConfigure("complainAboutPopUpBlocking")) {
						complainAboutPopUpBlocking = bool(complainAboutPopUpBlockingParam);
					}
				};

				this.isFocusPopUp = function() { return focusConsoleWindow; };
				this.setFocusPopUp = function(focusPopUpParam) {
					// This property can be safely altered after logging has started
					focusConsoleWindow = bool(focusPopUpParam);
				};

				this.isReopenWhenClosed = function() { return reopenWhenClosed; };
				this.setReopenWhenClosed = function(reopenWhenClosedParam) {
					// This property can be safely altered after logging has started
					reopenWhenClosed = bool(reopenWhenClosedParam);
				};

				this.close = function() {
					logLog.debug("close " + this);
					try {
						popUp.close();
						this.unload();
					} catch (ex) {
						// Do nothing
					}
				};

				this.hide = function() {
					logLog.debug("hide " + this);
					if (consoleWindowExists()) {
						this.close();
					}
				};

				this.show = function() {
					logLog.debug("show " + this);
					if (!consoleWindowCreated) {
						open();
					}
				};

				this.isVisible = function() {
					return safeToAppend();
				};

				// Define useful variables
				var popUp;

				// Create open, init, getConsoleWindow and safeToAppend functions
				open = function() {
					var windowProperties = "width=" + width + ",height=" + height + ",status,resizable";
					var frameInfo = "";
					try {
						var frameEl = window.frameElement;
						if (frameEl) {
							frameInfo = "_" + frameEl.tagName + "_" + (frameEl.name || frameEl.id || "");
						}
					} catch (e) {
						frameInfo = "_inaccessibleParentFrame";
					}
					var windowName = "PopUp_" + location.host.replace(/[^a-z0-9]/gi, "_") + "_" + consoleAppenderId + frameInfo;
					if (!useOldPopUp || !useDocumentWrite) {
						// Ensure a previous window isn't used by using a unique name
						windowName = windowName + "_" + uniqueId;
					}

					var checkPopUpClosed = function(win) {
						if (consoleClosed) {
							return true;
						} else {
							try {
								return bool(win) && win.closed;
							} catch(ex) {}
						}
						return false;
					};

					var popUpClosedCallback = function() {
						if (!consoleClosed) {
							appender.unload();
						}
					};

					function finalInit() {
						getConsoleWindow().setCloseIfOpenerCloses(!useOldPopUp || !useDocumentWrite);
						consoleWindowLoadHandler();
						consoleWindowLoaded = true;
						appendQueuedLoggingEvents();
						pollConsoleWindow(checkPopUpClosed, 500, popUpClosedCallback,
								"PopUpAppender.checkPopUpClosed: error checking pop-up window");
					}

					try {
						popUp = window.open(getConsoleUrl(), windowName, windowProperties);
						consoleClosed = false;
						consoleWindowCreated = true;
						if (popUp && popUp.document) {
							if (useDocumentWrite && useOldPopUp && isLoaded(popUp)) {
								popUp.mainPageReloaded();
								finalInit();
							} else {
								if (useDocumentWrite) {
									writeHtml(popUp.document);
								}
								// Check if the pop-up window object is available
								var popUpLoadedTest = function(win) { return bool(win) && isLoaded(win); };
								if (isLoaded(popUp)) {
									finalInit();
								} else {
									pollConsoleWindow(popUpLoadedTest, 100, finalInit,
											"PopUpAppender.init: unable to create console window");
								}
							}
						} else {
							isSupported = false;
							logLog.warn("PopUpAppender.init: pop-ups blocked, please unblock to use PopUpAppender");
							if (complainAboutPopUpBlocking) {
								handleError("log4javascript: pop-up windows appear to be blocked. Please unblock them to use pop-up logging.");
							}
						}
					} catch (ex) {
						handleError("PopUpAppender.init: error creating pop-up", ex);
					}
				};

				createWindow = function() {
					if (!initiallyMinimized) {
						open();
					}
				};

				init = function() {
					createWindow();
					initialized = true;
				};

				getConsoleWindow = function() {
					return popUp;
				};

				safeToAppend = function() {
					if (isSupported && !isUndefined(popUp) && !consoleClosed) {
						if (popUp.closed ||
								(consoleWindowLoaded && isUndefined(popUp.closed))) { // Extra check for Opera
							appender.unload();
							logLog.debug("PopUpAppender: pop-up closed");
							return false;
						}
						if (!consoleWindowLoaded && isLoaded(popUp)) {
							consoleWindowLoaded = true;
						}
					}
					return isSupported && consoleWindowLoaded && !consoleClosed;
				};
			}

			// Expose getConsoleWindow so that automated tests can check the DOM
			this.getConsoleWindow = getConsoleWindow;
		};

		ConsoleAppender.addGlobalCommandLineFunction = function(functionName, commandLineFunction) {
			defaultCommandLineFunctions.push([functionName, commandLineFunction]);
		};

		/* ------------------------------------------------------------------ */

		function PopUpAppender(lazyInit, initiallyMinimized, useDocumentWrite,
							   width, height) {
			this.create(false, null, lazyInit, initiallyMinimized,
					useDocumentWrite, width, height, this.defaults.focusPopUp);
		}

		PopUpAppender.prototype = new ConsoleAppender();

		PopUpAppender.prototype.defaults = {
			layout: new PatternLayout("%d{HH:mm:ss} %-5p - %m{1}%n"),
			initiallyMinimized: false,
			focusPopUp: false,
			lazyInit: true,
			useOldPopUp: true,
			complainAboutPopUpBlocking: true,
			newestMessageAtTop: false,
			scrollToLatestMessage: true,
			width: "600",
			height: "400",
			reopenWhenClosed: false,
			maxMessages: null,
			showCommandLine: true,
			commandLineObjectExpansionDepth: 1,
			showHideButton: false,
			showCloseButton: true,
            showLogEntryDeleteButtons: true,
            useDocumentWrite: true
		};

		PopUpAppender.prototype.toString = function() {
			return "PopUpAppender";
		};

		log4javascript.PopUpAppender = PopUpAppender;

		/* ------------------------------------------------------------------ */

		function InPageAppender(container, lazyInit, initiallyMinimized,
								useDocumentWrite, width, height) {
			this.create(true, container, lazyInit, initiallyMinimized,
					useDocumentWrite, width, height, false);
		}

		InPageAppender.prototype = new ConsoleAppender();

		InPageAppender.prototype.defaults = {
			layout: new PatternLayout("%d{HH:mm:ss} %-5p - %m{1}%n"),
			initiallyMinimized: false,
			lazyInit: true,
			newestMessageAtTop: false,
			scrollToLatestMessage: true,
			width: "100%",
			height: "220px",
			maxMessages: null,
			showCommandLine: true,
			commandLineObjectExpansionDepth: 1,
			showHideButton: false,
			showCloseButton: false,
            showLogEntryDeleteButtons: true,
            useDocumentWrite: true
		};

		InPageAppender.prototype.toString = function() {
			return "InPageAppender";
		};

		log4javascript.InPageAppender = InPageAppender;

		// Next line for backwards compatibility
		log4javascript.InlineAppender = InPageAppender;
	})();
	/* ---------------------------------------------------------------------- */
	// Console extension functions

	function padWithSpaces(str, len) {
		if (str.length < len) {
			var spaces = [];
			var numberOfSpaces = Math.max(0, len - str.length);
			for (var i = 0; i < numberOfSpaces; i++) {
				spaces[i] = " ";
			}
			str += spaces.join("");
		}
		return str;
	}

	(function() {
		function dir(obj) {
			var maxLen = 0;
			// Obtain the length of the longest property name
			for (var p in obj) {
				maxLen = Math.max(toStr(p).length, maxLen);
			}
			// Create the nicely formatted property list
			var propList = [];
			for (p in obj) {
				var propNameStr = "  " + padWithSpaces(toStr(p), maxLen + 2);
				var propVal;
				try {
					propVal = splitIntoLines(toStr(obj[p])).join(padWithSpaces(newLine, maxLen + 6));
				} catch (ex) {
					propVal = "[Error obtaining property. Details: " + getExceptionMessage(ex) + "]";
				}
				propList.push(propNameStr + propVal);
			}
			return propList.join(newLine);
		}

		var nodeTypes = {
			ELEMENT_NODE: 1,
			ATTRIBUTE_NODE: 2,
			TEXT_NODE: 3,
			CDATA_SECTION_NODE: 4,
			ENTITY_REFERENCE_NODE: 5,
			ENTITY_NODE: 6,
			PROCESSING_INSTRUCTION_NODE: 7,
			COMMENT_NODE: 8,
			DOCUMENT_NODE: 9,
			DOCUMENT_TYPE_NODE: 10,
			DOCUMENT_FRAGMENT_NODE: 11,
			NOTATION_NODE: 12
		};

		var preFormattedElements = ["script", "pre"];

		// This should be the definitive list, as specified by the XHTML 1.0 Transitional DTD
		var emptyElements = ["br", "img", "hr", "param", "link", "area", "input", "col", "base", "meta"];
		var indentationUnit = "  ";

		// Create and return an XHTML string from the node specified
		function getXhtml(rootNode, includeRootNode, indentation, startNewLine, preformatted) {
			includeRootNode = (typeof includeRootNode == "undefined") ? true : !!includeRootNode;
			if (typeof indentation != "string") {
				indentation = "";
			}
			startNewLine = !!startNewLine;
			preformatted = !!preformatted;
			var xhtml;

			function isWhitespace(node) {
				return ((node.nodeType == nodeTypes.TEXT_NODE) && /^[ \t\r\n]*$/.test(node.nodeValue));
			}

			function fixAttributeValue(attrValue) {
				return attrValue.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
			}

			function getStyleAttributeValue(el) {
				var stylePairs = el.style.cssText.split(";");
				var styleValue = "";
				var isFirst = true;
				for (var j = 0, len = stylePairs.length; j < len; j++) {
					var nameValueBits = stylePairs[j].split(":");
					var props = [];
					if (!/^\s*$/.test(nameValueBits[0])) {
						props.push(trim(nameValueBits[0]).toLowerCase() + ":" + trim(nameValueBits[1]));
					}
					styleValue = props.join(";");
				}
				return styleValue;
			}

			function getNamespace(el) {
				if (el.prefix) {
					return el.prefix;
				} else if (el.outerHTML) {
					var regex = new RegExp("<([^:]+):" + el.tagName + "[^>]*>", "i");
					if (regex.test(el.outerHTML)) {
						return RegExp.$1.toLowerCase();
					}
				}
                return "";
			}

			var lt = "<";
			var gt = ">";

			if (includeRootNode && rootNode.nodeType != nodeTypes.DOCUMENT_FRAGMENT_NODE) {
				switch (rootNode.nodeType) {
					case nodeTypes.ELEMENT_NODE:
						var tagName = rootNode.tagName.toLowerCase();
						xhtml = startNewLine ? newLine + indentation : "";
						xhtml += lt;
						// Allow for namespaces, where present
						var prefix = getNamespace(rootNode);
						var hasPrefix = !!prefix;
						if (hasPrefix) {
							xhtml += prefix + ":";
						}
						xhtml += tagName;
						for (i = 0, len = rootNode.attributes.length; i < len; i++) {
							var currentAttr = rootNode.attributes[i];
							// Check the attribute is valid.
							if (!	currentAttr.specified ||
									currentAttr.nodeValue === null ||
									currentAttr.nodeName.toLowerCase() === "style" ||
									typeof currentAttr.nodeValue !== "string" ||
									currentAttr.nodeName.indexOf("_moz") === 0) {
								continue;
							}
							xhtml += " " + currentAttr.nodeName.toLowerCase() + "=\"";
							xhtml += fixAttributeValue(currentAttr.nodeValue);
							xhtml += "\"";
						}
						// Style needs to be done separately as it is not reported as an
						// attribute in IE
						if (rootNode.style.cssText) {
							var styleValue = getStyleAttributeValue(rootNode);
							if (styleValue !== "") {
								xhtml += " style=\"" + getStyleAttributeValue(rootNode) + "\"";
							}
						}
						if (array_contains(emptyElements, tagName) ||
								(hasPrefix && !rootNode.hasChildNodes())) {
							xhtml += "/" + gt;
						} else {
							xhtml += gt;
							// Add output for childNodes collection (which doesn't include attribute nodes)
							var childStartNewLine = !(rootNode.childNodes.length === 1 &&
								rootNode.childNodes[0].nodeType === nodeTypes.TEXT_NODE);
							var childPreformatted = array_contains(preFormattedElements, tagName);
							for (var i = 0, len = rootNode.childNodes.length; i < len; i++) {
								xhtml += getXhtml(rootNode.childNodes[i], true, indentation + indentationUnit,
									childStartNewLine, childPreformatted);
							}
							// Add the end tag
							var endTag = lt + "/" + tagName + gt;
							xhtml += childStartNewLine ? newLine + indentation + endTag : endTag;
						}
						return xhtml;
					case nodeTypes.TEXT_NODE:
						if (isWhitespace(rootNode)) {
							xhtml = "";
						} else {
							if (preformatted) {
								xhtml = rootNode.nodeValue;
							} else {
								// Trim whitespace from each line of the text node
								var lines = splitIntoLines(trim(rootNode.nodeValue));
								var trimmedLines = [];
								for (var i = 0, len = lines.length; i < len; i++) {
									trimmedLines[i] = trim(lines[i]);
								}
								xhtml = trimmedLines.join(newLine + indentation);
							}
							if (startNewLine) {
								xhtml = newLine + indentation + xhtml;
							}
						}
						return xhtml;
					case nodeTypes.CDATA_SECTION_NODE:
						return "<![CDA" + "TA[" + rootNode.nodeValue + "]" + "]>" + newLine;
					case nodeTypes.DOCUMENT_NODE:
						xhtml = "";
						// Add output for childNodes collection (which doesn't include attribute nodes)
						for (var i = 0, len = rootNode.childNodes.length; i < len; i++) {
							xhtml += getXhtml(rootNode.childNodes[i], true, indentation);
						}
						return xhtml;
					default:
						return "";
				}
			} else {
				xhtml = "";
				// Add output for childNodes collection (which doesn't include attribute nodes)
				for (var i = 0, len = rootNode.childNodes.length; i < len; i++) {
					xhtml += getXhtml(rootNode.childNodes[i], true, indentation + indentationUnit);
				}
				return xhtml;
			}
		}

		function createCommandLineFunctions() {
			ConsoleAppender.addGlobalCommandLineFunction("$", function(appender, args, returnValue) {
				return document.getElementById(args[0]);
			});

			ConsoleAppender.addGlobalCommandLineFunction("dir", function(appender, args, returnValue) {
				var lines = [];
				for (var i = 0, len = args.length; i < len; i++) {
					lines[i] = dir(args[i]);
				}
				return lines.join(newLine + newLine);
			});

			ConsoleAppender.addGlobalCommandLineFunction("dirxml", function(appender, args, returnValue) {
				var lines = [];
				for (var i = 0, len = args.length; i < len; i++) {
					var win = appender.getCommandWindow();
					lines[i] = getXhtml(args[i]);
				}
				return lines.join(newLine + newLine);
			});

			ConsoleAppender.addGlobalCommandLineFunction("cd", function(appender, args, returnValue) {
				var win, message;
				if (args.length === 0 || args[0] === "") {
					win = window;
					message = "Command line set to run in main window";
				} else {
					if (args[0].window == args[0]) {
						win = args[0];
						message = "Command line set to run in frame '" + args[0].name + "'";
					} else {
						win = window.frames[args[0]];
						if (win) {
							message = "Command line set to run in frame '" + args[0] + "'";
						} else {
							returnValue.isError = true;
							message = "Frame '" + args[0] + "' does not exist";
							win = appender.getCommandWindow();
						}
					}
				}
				appender.setCommandWindow(win);
				return message;
			});

			ConsoleAppender.addGlobalCommandLineFunction("clear", function(appender, args, returnValue) {
				returnValue.appendResult = false;
				appender.clear();
			});

			ConsoleAppender.addGlobalCommandLineFunction("keys", function(appender, args, returnValue) {
				var keys = [];
				for (var k in args[0]) {
					keys.push(k);
				}
				return keys;
			});

			ConsoleAppender.addGlobalCommandLineFunction("values", function(appender, args, returnValue) {
				var values = [];
				for (var k in args[0]) {
					try {
						values.push(args[0][k]);
					} catch (ex) {
						logLog.warn("values(): Unable to obtain value for key " + k + ". Details: " + getExceptionMessage(ex));
					}
				}
				return values;
			});

			ConsoleAppender.addGlobalCommandLineFunction("expansionDepth", function(appender, args, returnValue) {
				var expansionDepth = parseInt(args[0], 10);
				if (isNaN(expansionDepth) || expansionDepth < 0) {
					returnValue.isError = true;
					return "" + args[0] + " is not a valid expansion depth";
				} else {
					appender.setCommandLineObjectExpansionDepth(expansionDepth);
					return "Object expansion depth set to " + expansionDepth;
				}
			});
		}

		function init() {
			// Add command line functions
			createCommandLineFunctions();
		}

		/* ------------------------------------------------------------------ */

		init();
	})();

	/* ---------------------------------------------------------------------- */
	// Main load

   log4javascript.setDocumentReady = function() {
       pageLoaded = true;
       log4javascript.dispatchEvent("load", {});
   };

    if (window.addEventListener) {
        window.addEventListener("load", log4javascript.setDocumentReady, false);
    } else if (window.attachEvent) {
        window.attachEvent("onload", log4javascript.setDocumentReady);
    } else {
        var oldOnload = window.onload;
        if (typeof window.onload != "function") {
            window.onload = log4javascript.setDocumentReady;
        } else {
            window.onload = function(evt) {
                if (oldOnload) {
                    oldOnload(evt);
                }
                log4javascript.setDocumentReady();
            };
        }
    }

    // Ensure that the log4javascript object is available in the window. This
    // is necessary for log4javascript to be available in IE if loaded using
    // Dojo's module system
    window.log4javascript = log4javascript;

    return log4javascript;
})();

define('lib/log4javascript',[], function () { return log4javascript; } );
/*global define, window */
define('core/config/LoggerConfig',[ "lib/log4javascript" ], function(log4javascript) {
    /**
     * @constructor
     * @param loglevel
     */
    function LoggerConfig(loglevel) {
        var self = this;
        
        if(loglevel === undefined){
            self.logLevel = log4javascript.Level.INFO;
        }
        if(loglevel === 'TRACE'){
            self.logLevel = log4javascript.Level.TRACE;
        }
        if(loglevel === 'DEBUG'){
            self.logLevel = log4javascript.Level.DEBUG;
        }
        if(loglevel === 'INFO'){
            self.logLevel = log4javascript.Level.INFO;
        }            
        if(loglevel === 'WARN'){
            self.logLevel = log4javascript.Level.WARN;
        }    
        if(loglevel === 'ERROR'){
            self.logLevel = log4javascript.Level.ERROR;
        }   
        if(loglevel === 'FATAL'){
            self.logLevel = log4javascript.Level.FATAL;
        } 
        
        if(!window.logappenders){
			self.setup();         
        }
    }

    LoggerConfig.prototype.logLevel = undefined;
    
    LoggerConfig.prototype.name = 'ECMConfig';

    /**
     * setup
     * Sets up the log appenders and layouts
     */
    LoggerConfig.prototype.setup = function() {
        var self = this, appenders = {}, layout = {};

        layout.standard = new log4javascript.PatternLayout("%r [%p] - %d{HH:mm:ss} \t %c \t %m");
        
        appenders.browserConsoleAppender = new log4javascript.BrowserConsoleAppender();
        appenders.browserConsoleAppender.setLayout(layout.standard);
        appenders.browserConsoleAppender.setThreshold(self.logLevel);

        appenders.warnBrowserConsoleAppender = new log4javascript.BrowserConsoleAppender();
        appenders.warnBrowserConsoleAppender.setLayout(new log4javascript.NullLayout());
        appenders.warnBrowserConsoleAppender.setThreshold(log4javascript.Level.WARN);
        
        appenders.alertAppender = new log4javascript.AlertAppender();
        appenders.alertAppender.setLayout(layout.standard);
        appenders.alertAppender.setThreshold(log4javascript.Level.FATAL);
        
        window.logappenders = appenders;
    };
    /**
     * getLogger
     * 
     * @param {log4javascript}
     * @returns {object}
     */
    LoggerConfig.prototype.getLogger = function(name) {
        var self = this, logger;

        if (typeof name !== 'undefined') {
            self.name = name;
        }

        /**
         * setup the log4javascript logger
         */
        logger = log4javascript.getLogger(self.name);

        logger.addAppender(window.logappenders.browserConsoleAppender);   
        logger.addAppender(window.logappenders.warnBrowserConsoleAppender);
        logger.addAppender(window.logappenders.alertAppender);

        return logger;
    };

    // Return the function
    return LoggerConfig;
});
define('core/globals',['modules/knockout/build/output/knockout-latest', 'core/config/LoggerConfig'], function(ko, LoggerConfig){
    var logger = new LoggerConfig().getLogger('globals.js'),
    Globals = {
        uiThemes: [
                   {label:"Black Tie", value:"black-tie"},
                   {label:"Blitzer", value:"blitzer"},
                   {label:"Cupertino", value:"cupertino"},
                   {label:"Dark Hive", value:"dark-hive"},
                   {label:"Excite Bike", value:"excite-bike"},
                   {label:"Flick", value:"flick"},
                   {label:"Hot Sneaks", value:"hot-sneaks"},
                   {label:"Humanity", value:"humanity"},
                   {label:"Mint Chocolate", value:"mint-choc"},
                   {label:"Overcast", value:"overcast"},
                   {label:"Pepper Grinder", value:"pepper-grinder"},
                   {label:"Redmond", value:"redmond"},
                   {label:"Smoothness", value:"smoothness"},
                   {label:"Start", value:"start"},
                   {label:"Trontastic", value:"trontastic"},
                   {label:"Vader", value:"vader"}],    	
    };
    
    $.extend(window, Globals);
    
    Array.prototype.contains = function(elem) {
        var i;

        if ( $.isArray(this) ) {
            if ( $.inArray(elem, this) > -1 ) {
                return true;
            }
        }
        for ( i in this ) {
            if ( $.isArray(this[i]) ) {
                if ( $.inArray(elem, this[i]) > -1 ) {
                    return true;
                }
            }
        }

        return false;
    };

    window.onbeforeunload = function(e) {
        return 'Really....';
    }; 
    
    return Globals;
});
/*jslint browser: true, devel: true, unparam: true, evil: true */

define('core/pfmain',[ 'modules/knockout/build/output/knockout-latest',
         'core/config/LoggerConfig'
         ], function(ko, 
                 LoggerConfig) {
    
    var App = {
            "logger": undefined,
            "uiTheme": ko.observable("start"),
            "uiThemes": uiThemes,
            "load" : function(){
                // Load Configuration form LocalStorage
                var store = localStorage.PersonalFinanceManager_store, template, vm, box,
                themeStore = localStorage.PersonalFinanceManager_theme;

                if(themeStore){
                    App.uiTheme(themeStore);
                }
            }            
        };
    
        (function () {
            App.logger = new LoggerConfig().getLogger('app.js');
            // Apply bindings
            ko.applyBindings(App, document.getElementById("htmlTop"));
            
            App.uiTheme.subscribe(function(value){
                localStorage.PersonalFinance_theme = value;
            });
            
            App.load();
        }());   
        
        $.extend(window, {
            PFApp: App
        });
        
        return App;
});
/* jslint browser: true, devel: true, unparam: true, eval: true */
// For any third party dependencies, like jQuery, place them in the lib folder.

requirejs(['core/globals', 'core/pfmain']);
define("pfapp.js", function(){});

