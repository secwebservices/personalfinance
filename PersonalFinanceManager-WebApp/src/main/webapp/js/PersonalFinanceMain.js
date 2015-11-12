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
	
    var PersonalFinanceApp = {
            "logger": undefined,
            "sessionTimer": undefined,
            "sessionActivity": function(){
                PersonalFinanceApp.logger.debug('User activity detected');
                clearTimeout(PersonalFinanceApp.sessionTimer);
                PersonalFinanceApp.sessionTimer = setTimeout(function(){
                    PersonalFinanceApp.clearSession();
                }, sessionTimeOutTime);  
            },
            "clearSession": function(){
                clearTimeout(PersonalFinanceApp.sessionTimer);
                sessionStorage.removeItem('user');
            },
            "applicationContext": ko.observable({
                "errors": ko.observableArray([]),
                "build": ko.observable(build),
                "version": ko.observable(version),
                "environment": ko.observable(environment),
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
                var d, ts,
                themeStore = localStorage.PersonalFinanceManager_theme,
                dashboardController, userController;

                if(themeStore){
                    PersonalFinanceApp.applicationContext().uiTheme(themeStore);
                }     

                dashboardController = new DashboardController({
                	applicationContext: PersonalFinanceApp.applicationContext
                });
                
                userController = new UserController({
                	applicationContext: PersonalFinanceApp.applicationContext
                });
                
                PersonalFinanceApp.applicationContext().errors.subscribe(function(changes){
                    changes.forEach(function(change) {
                        if (change.status === 'added') {
                            setTimeout(function(){
                                PersonalFinanceApp.applicationContext().errors.shift();                             
                            }, 3000);
                        }
                    });

                }, null, "arrayChange");

                                
            	RouteController.router.run('#welcome');
                
            	$('body').on('click tap keypress', PersonalFinanceApp.sessionActivity);
            	
                setInterval(function() {
                    d = new Date();
                    ts = d.getTime();

                    Mediator.publish({channel: 'PF-Heartbeat', message: { timestamp : ts }});
                }, 1000);
            }
                       
        };
    
        (function () {        	
            PersonalFinanceApp.logger = new LoggerConfig().getLogger('pfmain.js');
            PersonalFinanceApp.logger.info("Initializing PersonalFinanceApplication Layer");
            
            PersonalFinanceApp.applicationContext().uiTheme.subscribe(function(value){
                localStorage.PersonalFinanceManager_theme = value;
            });
                        
            TemplateManager.getTemplateList({
                name: 'Personal Finance Manager',
                projectPath: 'personalfinance',
                context: PersonalFinanceApp,
                callback: function(){
                    setTimeout(function() {
                        // Apply bindings
                        ko.applyBindings(PersonalFinanceApp.applicationContext, document.getElementById("htmlTop"));

                        PersonalFinanceApp.load();
                    }, 15);
                }
            });
        }());   
        
        $.extend(window, {
            App: PersonalFinanceApp,
            TemplateManager: TemplateManager,
            Mediator: Mediator
        });
        
        return PersonalFinanceApp;
});