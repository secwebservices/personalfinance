/* jslint browser: true, devel: true, unparam: true, eval: true */

/**
 * @author Robert “The Man” Suppenbach
 */

define(['jquery',
        'knockoutjs', 
        'LoggerConfig', 
        'view/user/UserLoginView',
        'view/user/UserLogoutView',
        'controller/RouteController'], function($, ko, LoggerConfig, UserLoginView, UserLogoutView, RouteController){
	
    function UserController(config){
    	var self = this, userLoginView, userLogoutView;
    	
    	self.logger = new LoggerConfig().getLogger('UserController.js');
    	
    	userLoginView = new UserLoginView({
            /** the element to render the view on. */
            element : '.viewpoint',
            templateManager : config.templateManager,
            user: config.user
        });

        userLogoutView = new UserLoginView({
            /** the element to render the view on. */
            element : '.viewpoint',
            templateManager : config.templateManager,
            user: config.user
        });
        
        self.initialize(config);
        
        /*
         * Add the subscription to control login requests
         */
        Mediator.subscribe({channel: 'PF-Login-Request', context: self, callback: self.loginRequest});
        /*
         * Add the subscription to control logout requests
         */        
        Mediator.subscribe({channel: 'PF-Logout-Request', context: self, callback: self.logoutRequest});
    }
    
    UserController.prototype.logger = undefined;
    
    UserController.prototype.user = undefined;

    UserController.prototype.loginRequest = function(message){
    	var self = this, loginRequest = message.loginRequest;
    	
    	$.ajax({
		    type: "POST",
		    contentType: 'application/json',
		    url: '/api/user/login',
		    data: JSON.stringify(loginRequest),
		    success: function(data, status, request){
				self.logger.debug('Login Request', status);
				self.user(data);
				if(status === 'success'){
			    	Mediator.publish({channel: 'PF-Login-Success'});					
				}
		    },
		    dataType: 'json'
		});
    };
    
    UserController.prototype.logoutRequest = function(message){
    	var self = this, logoutRequest = message.logoutRequest;
    	
    	$.ajax({
		    type: "POST",
		    contentType: 'application/json',
		    url: '/api/user/logout',
		    data: JSON.stringify(logoutRequest),
		    success: function(data, status, request){
				self.logger.debug('Logout Request', status);
				self.user(undefined);
				if(status === 'success'){
					Mediator.publish({channel: 'PF-Logout-Success'});					
				}
		    },
		    dataType: 'json'
		});
    };    
    
    UserController.prototype.initialize = function (config) {
        var self = this, c, options = $.extend({}, config);
        
        self.logger.info('UserController Initialize');
        
        for (c in options) {
            if (options.hasOwnProperty(c) && typeof self[c] === 'function') {
                self[c](options[c]);
            }else if (options.hasOwnProperty(c)){
                self[c] = options[c];
            }
        }
        
        RouteController.addRoute({
        	method: 'get', 
        	path: '#login', 
        	callback: function(){
        		Mediator.publish({channel: 'PF-Render', view: 'UserLoginView'});	
        	}
        });
        
        RouteController.addRoute({
        	method: 'get', 
        	path: '#logout', 
        	callback: function(){
        		Mediator.publish({channel: 'PF-Render', view: 'UserLogoutView'});	
        	}
        });        
    };
    
    return UserController;
    
});
    
    