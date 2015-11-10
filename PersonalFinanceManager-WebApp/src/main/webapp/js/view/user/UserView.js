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

    UserView.prototype.template = 'user_profile';
    
    UserView.prototype.rendered = false;
    
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
        		}else if(self.rendered && message.derender){
        			self.derender();
        		}
        	},
        	context: self
    	});
        
        Mediator.subscribe({
        	channel:'PF-Derender', 
        	callback: function(message){
        		if(message.view === 'UserView' && self.rendered){
        			self.derender();
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
            
            templateData = self.templateManager.getTemplate(self.template);

            $el.html(templateData);

            userModel = new UserModel();

            ko.cleanNode($el[0]);
            ko.applyBindings(userModel, $el[0]);
            
            self.rendered = true;
        } catch (e) {
            self.logger.error('UserView.prototype.render', e);
        }

    };
    
    UserView.prototype.derender = function() {
        var self = this, $el;

        self.logger.debug("UserView.prototype.derender");
        
        try {
            $el = $(self.element);
            self.templateManager.clearTemplate(self.template);
            ko.cleanNode($el[0]);
            
            self.rendered = false;
        } catch (e) {
            self.logger.error('UserView.prototype.derender', e);
        }        
    };

    // Return the function
    return UserView;

});