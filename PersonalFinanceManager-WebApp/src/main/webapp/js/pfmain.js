/*jslint browser: true, devel: true, unparam: true, evil: true */

define(['modules/knockout/build/output/knockout-latest',
         'core/config/LoggerConfig',
         'managers/TemplateManager',
         'utilities/core/Mediator',
         'utilities/core/AjaxHandlers'
         ], function(ko, 
                 LoggerConfig,
                 TemplateManager,
                 Mediator,
                 AjaxHandlers
                 ) {
    
    var App = {
            "logger": undefined,
            "financemanager": ko.observable({
            	"user": ko.observable(undefined),
            	"uiTheme": ko.observable("start"),
            	"uiThemes": uiThemes
            }),
            "load" : function(){
                // Load Configuration form LocalStorage
                var store = localStorage.PersonalFinanceManager_store, template, vm, box,
                themeStore = localStorage.PersonalFinanceManager_theme;

                if(themeStore){
                    App.financemanager().uiTheme(themeStore);
                }                
            }
                       
        };
    
        (function () {        	
            App.logger = new LoggerConfig().getLogger('pfmain.js');
            App.logger.info("Initializing Application Layer");
            
            App.financemanager().uiTheme.subscribe(function(value){
                localStorage.PersonalFinanceManager_theme = value;
            });
                        
            TemplateManager.getTemplateList({
                name: 'Personal Finance Manager',
                projectPath: 'personalfinance',
                context: App,
                callback: function(){
                    setTimeout(function() {
                        // Apply bindings
                        ko.applyBindings(App.financemanager, document.getElementById("htmlTop"));

                        App.load();
                    }, 15);
                }
            });  
        }());   
        
        $.extend(window, {
            PFApp: App,
            TemplateManager: TemplateManager,
            Mediator: Mediator
        });
        
        return App;
});