/*jslint browser: true, devel: true */

define(['jquery',
        'knockoutjs',
        'LoggerConfig'], function ($, ko, LoggerConfig) {
    'use strict';
    
    var instance;
    function init() {
        
        var logger,
            templateList = {},
            templates = {},
            stringTemplateEngine, 
            StringTemplateSource,
            _config = {
                name : 'Dashboard',
                projectPath : 'dashboard',
                applyBindingsOnLoad : false
            };

        logger = new LoggerConfig().getLogger("TemplateManager.js");
        logger.info("Initializing Template Manager");
        
        function getTemplateCount(){
            var count = 0, k;
            for (k in templates) {
                if (templates.hasOwnProperty(k)) {
                   ++count;
                }
            }
            return count;
        }   
        
        /**
         * convertName(name, dotNotation)
         * converts a filename to a template name
         * can also return in dot notation.
         */
        function convertName(name, dotNotation) {
            var converted;
            try {
                // first remove the .htm extension
                converted = name.substring(0, name.length - 4);
                
                // strip out top level paths
                converted = converted.substring(name.lastIndexOf("/") + 1);
                             
                // if the dotNotation flag is set convert to dot notation
                if(dotNotation){
                    converted = converted.replace(new RegExp("_", 'g'), ".");                    
                }
            } catch (e) {
                logger.error(e.stack);
            }

            return converted;
        }     
        
        /**
         * applyBindings(context)
         * helper to ko.applyBindings logs errors when application fails. 
         */
        function applyBindings(context) {
            try {
                ko.applyBindings(context);
            } catch (e) {
                logger.error("Error applying knockout bindings", e, e.stack);
            }
        }        
        
        /**
         * getEntry(obj, entry)
         * 
         * returns a single entry from the list of loaded templates
         */
        function getEntry(obj, entry) { //templates, template
            var returner = true, i, entryList, entryPoint = obj;
            if (entryPoint) {
                entryList = entry.split(/\./);
                for (i = 0; i < entryList.length; i += 1) {
                    if (entryPoint[entryList[i]] !== undefined) {
                        entryPoint = entryPoint[entryList[i]];
                    } else {
                        returner = undefined;
                        break;
                    }
                }
                if (returner) {
                    returner = entryPoint;
                }
            } else {
                returner = undefined;
            }
            return returner;
        }     
        
        /**
         * clearEntry(obj, entry)
         * 
         * clears a single entry from the list of templates
         */
        function clearEntry(obj, entry) {//templates, template
            var returner = obj, i, entryList, entryPoint = obj;
            if (entryPoint) {
                entryList = entry.split(/\./);
                for (i = 0; i < entryList.length; i += 1) {
                    if (entryPoint[entryList[i]] !== undefined) {
                        delete entryPoint[entryList[i]];
                    } else {
                        break;
                    }
                }
                returner = entryPoint;
            }
            
            return returner;
        }        
        
        
        /**
         * enque(config)
         *  
         * template {
         *      name : 'templateName',
         *      path : 'path/to/html'
         *  }          
         * 
         */
        function enque(template) {
            templateList[template.name] = {
                name: template.name,
                path: template.path
            };
        }  
        
        /**
         * getTemplateList(config)
         * config {
         *      name : 'app name',
         *      projectPath : 'root_path',
         *      applyBindingsOnLoad : true/false - default: false
         * }
         */
        function getTemplateList(config) {
            var templateItem = {}, template;

            $.extend(_config, config);
            
            $.ajax({url:'/api/utilities/gethtmltemplates/'+config.projectPath,
                "global": false,
                "dataType": "json",
                "contentType": "application/json; charset=UTF-8", 
                "success":function(templates) {
                    var templateName = '', percent = 0;
                    if ( templates !== null && templates.length > 0 ) {
                        for(template = 0; template < templates.length; template++){
                            templateName = convertName(templates[template]);
                            enque({
                                name : templateName,
                                path : templates[template]
                            });
                        }
                        
                    }else{
                        templateList = config.templateList;
                    }
                    
                    if(config.callback && typeof(config.callback) === 'function'){
                        setTimeout(function(){
                            config.callback();                            
                        }, 1);
                    }
                }
            }); 
        }
        
        /**
         * setTemplateList(config)
         * config { 
         *      callback : function(){}, 
         *      templateList : {}, 
         *      context: bindingContext,
         *      name : 'app name',
         *      projectPath : 'root_path',
         *      applyBindingsOnLoad : true/false - default: false
         * }
         *  
         * config.templateList is formatted
         *  { 
         *      'templateName' : {
         *          name : 'templateName',
         *          path : 'path/to/html'
         *      }
         *  } ...              
         * 
         *  sets the list of templates to use and calls the callback
         * 
         */
        function setTemplateList(config) {
            var templateItem = {}, template;
            
            $.extend(_config, config);
            
            templateList = config.templateList;
            
            if(config.callback && typeof(config.callback) === 'function'){
                config.callback();
            }
        }         
        
        /**
         * loadTemplate(templateName)
         * 
         * loads in the HTML for a specific template (lazy loading)
         */
        function loadTemplate(templateName) {
            var template, context = _config.context;
            
            template = templateList[templateName];
            
            if(template){
                $.ajax(template.path, {
                    cache:false,
                    async:false,
                    success: function(html, status, jqXHR){
                        templateName = template.name;
                        
                        templates[templateName] = html;
                        
                        if(_config.applyBindingsOnLoad){
                            applyBindings(context);   
                        }

                    },
                    error: function(jqXHR, status, error){
                        logger.error("File load", status, "'" + JSON.stringify(template) + "'");
                    }
                });                  
            }  
        }        
        
        /**
         * getTemplate(template)
         * 
         * helper gets a specific templates HTML value
         */
        function getTemplate(template) {
            var templateEntry;
            
            templateEntry =  getEntry(templates, template);
            
            if(!templateEntry){
                loadTemplate(template);
                templateEntry = getEntry(templates, template);
            }
            
            return templateEntry || '';
        }     
        
        /**
         * clearTemplate(template)
         * 
         * clear a templates HTML data
         */
        function clearTemplate(template) {
            templates = clearEntry(templates, template);
        }        

        /**
         * StringTemplate(template, options)
         * 
         * Wrpper Used with the Knockout StringTemplateEngine.
         */
        function StringTemplate(template, options) {
            if (!(options && options.special) && template.match(/^\w+(?:\.\w+)*$/)) {
                this.templateName = template;
                this.templateSrc = false;
            } else {
                this.templateName = String.uuid();
                this.templateSrc = template;
            }
        }
        
        
        $.extend(StringTemplate.prototype, {
            data: function(key, value) {
                if (arguments.length === 1) {
                    return getTemplate(this.templateName);
                }
            },
            text: function(value) {
                if (arguments.length === 0) {
                   return getTemplate(this.templateName);
                }   
            }
        });        
        
        /**
         * createStringTemplateEngine(engine)
         * 
         * wraps the StringTemplateEngine allowing for access to inline templates.
         */
        function createStringTemplateEngine(engine) {
            engine.renderTemplate = function (template, bindingContext, options) {
                var templateSource = this.makeTemplateSource(template, options);
                return this.renderTemplateSource(templateSource, bindingContext, options);
            };
            engine.makeTemplateSource = function (template, options) {
                return new StringTemplate(template, options);
            };
            return engine;
        }
        
        ko.setTemplateEngine(createStringTemplateEngine(new ko.nativeTemplateEngine()));

                
        return {
            "getTemplateList": getTemplateList,
            "setTemplateList": setTemplateList,
            "applyBindings": applyBindings,
            "getTemplate": getTemplate,
            "clearTemplate": clearTemplate,
            "enque": enque
        };   
    }
    
    return (function () {
        if (!instance) {
            instance = init();
        }
        return instance;
    }());  
    
});
