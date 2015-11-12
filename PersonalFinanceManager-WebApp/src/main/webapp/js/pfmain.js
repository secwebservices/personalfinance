/*jslint browser: true, devel: true, unparam: true, evil: true */

/**
 * @author Robert “The Man” Suppenbach
 */
define([ 'jquery',
         'knockoutjs',	
         'LoggerConfig',
         'Mediator',
         'TemplateManager',
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
            "sessionTimer": undefined,
            "sessionActivity": function(){
                clearTimeout(App.sessionTimer);
                App.sessionTimer = setTimeout(function(){
                    App.clearSession();
                }, (1000 * 60 * 5));  
            },
            "clearSession": function(){
                clearTimeout(App.sessionTimer);
                sessionStorage.removeItem('user');
            },
            "applicationContext": ko.observable({
                "errors": ko.observableArray([]),
            	"servertime": ko.observable(),
            	"user": ko.observable(undefined),
            	"uiTheme": ko.observable("start"),
            	"uiThemes": uiThemes,
            	"loginRequest": function(){
            		Mediator.publish({channel: 'PF-Render', view: 'UserLoginView', derender: false});
            	},
            	"logoutRequest": function(){
            		Mediator.publish({channel: 'PF-Render', view: 'UserLogoutView', derender: false});
            	}
            }),
            "load" : function(){
                // Load Configuration form LocalStorage
                var template, vm, box, d, ts,
                themeStore = localStorage.PersonalFinanceManager_theme, indexView, 
                dashboardController, userController;

                if(themeStore){
                    App.applicationContext().uiTheme(themeStore);
                }     

                dashboardController = new DashboardController({
                	applicationContext: App.applicationContext
                });
                
                userController = new UserController({
                	applicationContext: App.applicationContext
                });
                
                App.applicationContext().errors.subscribe(function(changes){
                    changes.forEach(function(change) {
                        if (change.status === 'added') {
                            setTimeout(function(){
                                App.applicationContext().errors.shift();                             
                            }, 3000);
                        }
                    });

                }, null, "arrayChange");

                                
            	RouteController.router.run('#welcome');
                
            	$(window).on('scroll', App.sessionActivity);
            	$('body').on('click', App.sessionActivity);
            	
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