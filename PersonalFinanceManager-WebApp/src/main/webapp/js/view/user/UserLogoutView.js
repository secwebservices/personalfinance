/*jslint browser: true, devel: true */

/**
 * @author Robert “The Man” Suppenbach
 */
define(['model/user/UserModel', 
        'knockoutjs',
        'LoggerConfig',
        'Mediator',
        'TemplateManager'], 
        function(UserModel, ko, LoggerConfig, Mediator, TemplateManager) {

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

    UserLogoutView.prototype.template = 'logout';
    
    UserLogoutView.prototype.rendered = false;
    
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
        		}else if(self.rendered && message.derender){
        			self.derender();
        		}
        	},
        	context: self
    	});
        
        Mediator.subscribe({
        	channel:'PF-Derender', 
        	callback: function(message){
        		if(message.view === 'UserLogoutView' && self.rendered){
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
    UserLogoutView.prototype.render = function() {
        var self = this, userModel = {}, $el, templateData;

        self.logger.debug("UserLogoutView.prototype.render");

        try {
            $el = $(self.element);
            
            templateData = TemplateManager.getTemplate(self.template);

            $el.html(templateData).show();
            
            $.extend(userModel, {
            	doLogout: function(){
            		Mediator.publish({channel: 'PF-Logout-Request'});
            	},
            	derender: function(){
            		Mediator.publish({channel: 'PF-Derender', view: 'UserLogoutView'});
            	}
            });

            ko.cleanNode($el[0]);
            ko.applyBindings(userModel, $el[0]);
            
            self.rendered = true;            
        } catch (e) {
            self.logger.error('UserLogoutView.prototype.render', e);
        }

    };
    
    UserLogoutView.prototype.derender = function() {
        var self = this, $el;

        self.logger.debug("UserLogoutView.prototype.derender");
        
        try {
            $('.loginWrapper').dialog('close');
            
        	$el = $(self.element);
            $el.html('').hide();

            TemplateManager.clearTemplate(self.template);
            ko.cleanNode($el[0]);
            
            self.rendered = false;
        } catch (e) {
            self.logger.error('UserLogoutView.prototype.derender', e);
        }        
    };

    // Return the function
    return UserLogoutView;

});