/*jslint browser: true, devel: true, unparam: true, evil: true */

/**
 * @author Robert “The Man” Suppenbach
 */
define([ 'jquery',
         'knockoutjs',	
         'LoggerConfig',
         'Mediator',
         'managers/TemplateManager',
         'utilities/core/AjaxHandlers',
         'controller/user/UserController',
         'controller/user/DashboardController',
         'controller/RouteController'
         ], function(
        		 $,
        		 ko,
                 LoggerConfig,
                 Mediator,
                 TemplateManager,
                 AjaxHandlers,
                 UserController,
                 DashboardController,
                 RouteController
                 ) {
	
    var App = {
            "logger": undefined,
            "applicationContext": ko.observable({
            	"servertime": ko.observable(),
            	"user": ko.observable(undefined),
            	"uiTheme": ko.observable("start"),
            	"uiThemes": uiThemes
            }),
            "load" : function(){
                // Load Configuration form LocalStorage
                var store = localStorage.PersonalFinanceManager_store, template, vm, box,
                themeStore = localStorage.PersonalFinanceManager_theme, indexView, 
                dashboardController, userController, d, ts;

                if(themeStore){
                    App.applicationContext().uiTheme(themeStore);
                }     

                dashboardController = new DashboardController({
                	templateManager : TemplateManager,
                	applicationContext: App.applicationContext
                });
                
                userController = new UserController({
                	templateManager : TemplateManager,
                	applicationContext: App.applicationContext
                });
                                
            	RouteController.router.run('#welcome');
                
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
            
            App.applicationContext().uiTheme.subscribe(function(value){
                localStorage.PersonalFinanceManager_theme = value;
            });
                        
            TemplateManager.getTemplateList({
                name: 'Personal Finance Manager',
                projectPath: 'personalfinance',
                context: App,
                callback: function(){
                    setTimeout(function() {
                        // Apply bindings
                        ko.applyBindings(App.applicationContext, document.getElementById("htmlTop"));

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