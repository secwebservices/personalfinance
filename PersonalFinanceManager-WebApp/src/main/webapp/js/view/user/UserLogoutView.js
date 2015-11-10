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
    function UserLogoutView(config) {
    	var self = this;
    	self.logger = new LoggerConfig().getLogger('UserLogoutView.js'); 

        self.initialize(config);
    }

    
    /**
     * @param user {object}
     */
    UserLogoutView.prototype.user = undefined;
    /**
     * @param logger {object}
     */
    UserLogoutView.prototype.logger = undefined;
    /**
     * @param element {object}
     */
    UserLogoutView.prototype.element = undefined;
    /**
     * @param template {object}
     */
    UserLogoutView.prototype.templateManager = undefined;

    UserLogoutView.prototype.initialize = function (config) {
        var self = this, c, options = $.extend({}, config);
        
        self.logger.info('UserLogoutView Initialize');
        
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
        		if(message.view === 'UserLogoutView'){
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
    UserLogoutView.prototype.render = function() {
        var self = this, userModel = {}, $el, templateData;

        self.logger.debug("UserLogoutView.prototype.render");

        try {
            $el = $(self.element);
            
            templateData = self.templateManager.getTemplate('logout');

            $el.html(templateData);
            
            $.extend(userModel, {
            	doLogout: function(){
            		Mediator.publish({channel: 'PF-Logout-Request'});
            	}
            });

            ko.cleanNode($el[0]);
            ko.applyBindings(userModel, $el[0]);
        } catch (e) {
            self.logger.error('UserLogoutView.prototype.render', e);
        }

    };

    // Return the function
    return UserLogoutView;

});