/*jslint browser: true, devel: true */

/**
 * @author Robert “The Man” Suppenbach
 */
define(['model/user/UserModel', 
        'knockoutjs',
        'LoggerConfig',
        'Mediator'], 
        function(UserModel, ko, LoggerConfig, Mediator) {

    /**
     * @constructor
     */
    function UserLoginView(config) {
    	var self = this;
    	self.logger = new LoggerConfig().getLogger('UserLoginView.js'); 

        self.initialize(config);
    }

    
    /**
     * @param user {object}
     */
    UserLoginView.prototype.user = undefined;
    /**
     * @param logger {object}
     */
    UserLoginView.prototype.logger = undefined;
    /**
     * @param element {object}
     */
    UserLoginView.prototype.element = undefined;
    /**
     * @param template {object}
     */
    UserLoginView.prototype.templateManager = undefined;

    UserLoginView.prototype.initialize = function (config) {
        var self = this, c, options = $.extend({}, config);
        
        self.logger.info('UserLoginView Initialize');
        
        for (c in options) {
            if (options.hasOwnProperty(c) && typeof self[c] === 'function') {
                self[c](options[c]);
            }else if (options.hasOwnProperty(c)){
                self[c] = options[c];
            }
        }
        
        Mediator.subscribe({
        	channel:'PF-Render', 
        	callback: function(message){
        		if(message.view === 'UserLoginView'){
        			self.render(); 
        		}
        	},
        	context: self
    	});
    };
    
    /**
     * render the view
     * 
     * @returns {object}
     */
    UserLoginView.prototype.render = function() {
        var self = this, userModel, $el, templateData;

        self.logger.debug("UserLoginView.prototype.render");

        try {
            $el = $(self.element);
            
            templateData = self.templateManager.getTemplate('login');
            
            $el.html(templateData);

            userModel = new UserModel();
            
            $.extend(userModel, {
            	doLogin: function(){
            		var loginRequest = {
						username: this.username(),
						password: this.password()
			    	};
            		
            		Mediator.publish({channel: 'PF-Login-Request', loginRequest: loginRequest});
            	}
            });

            ko.cleanNode($el[0]);
            ko.applyBindings(userModel, $el[0]);
        } catch (e) {
            self.logger.error('UserLoginView.prototype.render', e);
        }

    };

    // Return the function
    return UserLoginView;

});