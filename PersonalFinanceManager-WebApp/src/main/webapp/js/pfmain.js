/*jslint browser: true, devel: true, unparam: true, evil: true */

define([ 'jquery',
         'knockoutjs',	
         'LoggerConfig',
         'Mediator',
         'managers/TemplateManager',
         'utilities/core/AjaxHandlers',
         'view/IndexView',
         'controller/user/UserController'
         ], function(
        		 $,
        		 ko,
                 LoggerConfig,
                 Mediator,
                 TemplateManager,
                 AjaxHandlers,
                 IndexView,
                 UserController
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
                themeStore = localStorage.PersonalFinanceManager_theme, indexView, userController,
                d, ts;

                if(themeStore){
                    App.financemanager().uiTheme(themeStore);
                }     
                
                indexView = new IndexView({
                    /** the element to render the view on. */
                    element : '.viewpoint',
                    templateManager : TemplateManager
                });


                userController = new UserController({
                	templateManager : TemplateManager,
                	user: App.financemanager().user
                });
                
                setTimeout(function(){
                    Mediator.publish({channel:'PF-Render', view: 'IndexView'});                	
                }, 10);
                                
                setInterval(function() {
                    d = new Date();
                    ts = d.getTime();

                    Mediator.publish({channel: 'PF-Heartbeat', message: { timestamp : ts }});
                }, 1000);
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