/* jslint browser: true, devel: true, unparam: true, eval: true */

/**
 * @author Robert “The Man” Suppenbach
 */

define(['jquery',
        'knockoutjs', 
        'LoggerConfig', 
        'view/user/UserView',
        'controller/RouteController'], function($, ko, LoggerConfig, UserView, RouteController){
	
    function UserController(config){
    	var self = this, userView;
    	
    	self.logger = new LoggerConfig().getLogger('UserController.js');
    	
        userView = new UserView({
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
			    	Mediator.publish({channel: 'PF-Render', view: 'UserView'});					
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
        		Mediator.publish({channel: 'PF-Render', view: 'UserView'});	
        	}
        });
    };
    
    return UserController;
    
});
    
    