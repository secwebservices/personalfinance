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

    UserLoginView.prototype.template = 'login';
    
    UserLoginView.prototype.rendered = false;
    
    UserLoginView.prototype.model = undefined;
    
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
        		}else if(self.rendered && message.derender){
        			self.derender();
        		}
        	},
        	context: self
    	});
        
        Mediator.subscribe({
        	channel:'PF-Derender', 
        	callback: function(message){
        		if(message.view === 'UserLoginView' && self.rendered){
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
    UserLoginView.prototype.render = function() {
        var self = this, $el, templateData;

        self.logger.debug("UserLoginView.prototype.render");

        try {
            $el = $(self.element);
            
            templateData = TemplateManager.getTemplate(self.template);
            
            $el.html(templateData).show();
            
            self.model = new UserModel();
            
            $.extend(self.model, {
            	doLogin: function(){
            		var loginRequest = {
						username: this.username(),
						password: this.password()
			    	};
            		
            		Mediator.publish({channel: 'PF-Login-Request', loginRequest: loginRequest});
            	},
            	derender: function(){
            		Mediator.publish({channel: 'PF-Derender', view: 'UserLoginView'});
            	}
            });

            ko.cleanNode($el[0]);
            ko.applyBindings(self.model, $el[0]);

            self.rendered = true;
        } catch (e) {
            self.logger.error('UserLoginView.prototype.render', e);
        }

    };
    
    UserLoginView.prototype.derender = function() {
        var self = this, $el;

        self.logger.debug("UserLoginView.prototype.derender");
        
        try {
            $('.loginWrapper').dialog('close');
            
            $el = $(self.element);
            $el.html('').hide();
            
            TemplateManager.clearTemplate(self.template);
            ko.cleanNode($el[0]);
            
            self.rendered = false;
        } catch (e) {
            self.logger.error('UserLoginView.prototype.derender', e);
        }        
    };

    // Return the function
    return UserLoginView;

});