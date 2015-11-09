/*jslint browser: true, devel: true */

define(['LoggerConfig',
        'Mediator', 
        'knockoutjs'], function(LoggerConfig, Mediator, ko) {

    /**
     * @constructor
     */
    function UserModel(config) {
    	var self = this;
    	self.logger = new LoggerConfig().getLogger('UserModel.js'); 
    	
    	if(config){
        	self.initialize(config);    		
    	}
    }

    UserModel.prototype.logger = undefined;
    
    UserModel.prototype.username = ko.observable(undefined);

    UserModel.prototype.password = ko.observable(undefined);
    
    UserModel.prototype.enabled = ko.observable(undefined);
    
    UserModel.prototype.loginRequest = undefined;
    
    UserModel.prototype.doLogin = function(){
    	var self = this, loginRequest;
    	
    	loginRequest = {
			username: self.username(),
			password: self.password()
    	};

    	Mediator.publish({channel: 'PF-Login-Request', loginRequest: loginRequest});
    	
    };
    
    UserModel.prototype.initialize = function (config) {
        var self = this, c, options = $.extend({}, config);
        
        self.logger.info('UserModel Initialize');
        
        for (c in options) {
            if (options.hasOwnProperty(c) && typeof self[c] === 'function') {
                self[c](options[c]);
            }else if (options.hasOwnProperty(c)){
                self[c] = options[c];
            }
        }
    };
    
    // Return the function
    return UserModel;
});