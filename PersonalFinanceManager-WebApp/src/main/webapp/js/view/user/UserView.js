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
    function UserView(config) {
    	var self = this;
    	self.logger = new LoggerConfig().getLogger('UserView.js'); 

        self.initialize(config);
    }

    
    /**
     * @param user {object}
     */
    UserView.prototype.user = undefined;
    /**
     * @param logger {object}
     */
    UserView.prototype.logger = undefined;
    /**
     * @param element {object}
     */
    UserView.prototype.element = undefined;
    /**
     * @param template {object}
     */
    UserView.prototype.templateManager = undefined;

    UserView.prototype.initialize = function (config) {
        var self = this, c, options = $.extend({}, config);
        
        self.logger.info('UserView Initialize');
        
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
        		if(message.view === 'UserView'){
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
    UserView.prototype.render = function() {
        var self = this, userModel, $el, templateData;

        self.logger.debug("UserView.prototype.render");

        try {
            $el = $(self.element);
            
            if(self.user()){
                templateData = self.templateManager.getTemplate('user_profile');            	
            }else{
                templateData = self.templateManager.getTemplate('login');
            }

            
            $el.html(templateData);

            userModel = new UserModel();

            ko.cleanNode($el[0]);
            ko.applyBindings(userModel, $el[0]);

            Mediator.publish("PF-Ready", {});
        } catch (e) {
            self.logger.error('UserView.prototype.render', e);
        }

    };

    // Return the function
    return UserView;

});