/* jslint browser: true, devel: true, unparam: true, eval: true */

/**
 * @author Robert “The Man” Suppenbach
 */

define(['jquery',
        'knockoutjs', 
        'LoggerConfig', 
        'Mediator',
        'view/user/UserLoginView',
        'view/user/UserLogoutView',
        'controller/RouteController',
        'TemplateManager'], function($, ko, LoggerConfig, Nediator, UserLoginView, UserLogoutView, RouteController, TemplateManager){
	
    function UserController(config){
    	var self = this, userLoginView, userLogoutView;
    	
    	self.logger = new LoggerConfig().getLogger('UserController.js');
    	
    	userLoginView = new UserLoginView({
            /** the element to render the view on. */
            element : '.userdialog',
            user: config.user
        });

        userLogoutView = new UserLogoutView({
            /** the element to render the view on. */
            element : '.userdialog',
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
    
    UserController.prototype.applicationContext = undefined;
    
    UserController.prototype.user = undefined;

    UserController.prototype.userLoggedIn = undefined;
    
    UserController.prototype.userSessionHasTimedout = false;

    UserController.prototype.timeleft = 60;
    
    UserController.prototype.heatbeatcounter = 1;
    
    UserController.prototype.userStore = sessionStorage;

    UserController.prototype.sessionDialog = undefined;
    
    UserController.prototype.sessionTemplate = undefined;
    
    UserController.prototype.timeoutInterval = undefined;
    
    UserController.prototype.loginRequest = function(message){
    	var self = this, loginRequest = message.loginRequest;
    	
    	$.ajax({
		    type: "POST",
		    contentType: 'application/json',
		    url: '/api/user/login',
		    data: JSON.stringify(loginRequest),
		    success: function(data, status, request){
				self.logger.debug('Login Request', status);
				self.userStore.setItem('user', JSON.stringify(data));
				self.user(data);
				self.userLoggedIn = true;
				self.timeleft = 60;
				if(status === 'success'){
			    	Mediator.publish({channel: 'PF-Login-Success'});
			    	Mediator.publish({channel: 'PF-Derender', view: 'UserLoginView'});
				}
		    },
		    dataType: 'json'
		});
    };
    
    UserController.prototype.logoutRequest = function(){
    	var self = this;

    	$.ajax({
		    type: "GET",
		    url: '/api/user/logout',
		    success: function(data, status, request){
				self.logger.debug('Logout Request', status);
				self.userStore.removeItem('user');
				self.user(undefined);
				self.userLoggedIn = false;
				self.timeleft = 60;
				
				if(status === 'success'){
					Mediator.publish({channel: 'PF-Logout-Success'});	
					Mediator.publish({channel: 'PF-Derender', view: 'UserLogoutView'});
				}
		    },
		    dataType: 'json'
		});
    	
    };    
    
    UserController.prototype.initialize = function (config) {
        var self = this, c, options = $.extend({}, config), user;
        
        self.logger.info('UserController Initialize');
        
        for (c in options) {
            if (options.hasOwnProperty(c) && typeof self[c] === 'function') {
                self[c](options[c]);
            }else if (options.hasOwnProperty(c)){
                self[c] = options[c];
            }
        }
              
        RouteController.router.route('get', '#login', 
        	function(){
        		Mediator.publish({channel: 'PF-Render', view: 'UserLoginView', derender: false});	
        	}
        );
        
        RouteController.router.route('get', '#logout', 
        	function(){
        		Mediator.publish({channel: 'PF-Render', view: 'UserLogoutView', derender: false});	
        	}
        );   
        
        Mediator.subscribe({channel: 'PF-Login-Success', callback: function(){
        	window.location.hash = '#dashboard';
        }});

        Mediator.subscribe({channel: 'PF-Logout-Success', callback: function(){
        	window.location.hash = '#welcome';
        }});

        self.user = self.applicationContext().user;
        
        self.sessionTemplate = TemplateManager.getTemplate('session_timeout');
        
        if(self.userStore.getItem('user')){
        	user = JSON.parse(self.userStore.getItem('user'));
        	self.user(user);
        	self.userLoggedIn = true;
        }
        
        Mediator.subscribe({channel: 'PF-Heartbeat', context: self, callback: self.serverHeartbeat});  
        
        $.ajax('/api/ping', {
            cache:false,
            async:false,
            global: false,
            success: function(data, status, jqXHR){
            	self.applicationContext().servertime(data.timestamp);
            },
            dataType: 'json'
        });
        
    };
    
    /**
     * serverHeartbeat
     * 
     * @param data {object} format {timestamp : {integer}}
     */
    UserController.prototype.serverHeartbeat = function(data) {
        var self = this, ts = data.message.timestamp, url, currentStatus;
        
        if (!self.userStore.getItem('user') && (self.user() && !self.userSessionHasTimedout)) {
            self.sessionTimeout();
        }

        if (self.heatbeatcounter === 30) {
            self.heatbeatcounter = 1;
            url = '/api/ping?' + ts;

            if (self.user()) {
                url += "&user=" + ko.toJS(self.user);
            }

            $.ajax(url, {
                cache:false,
                async:false,
                global: false,
                success: function(data, status, jqXHR){

                    self.applicationContext().servertime(data.timestamp);
                	if(jqXHR.status == 401){
                		self.sessionTimeout();
                	}
                },
                error: function(jqXHR, status, error){
                	self.userStore.removeItem('user');
                },
                dataType: 'json'
            });  

        } else {
            self.heatbeatcounter++;
        }
    };
    
    /**
     * sessionTimeout
     */
    UserController.prototype.sessionTimeout = function() {
        var self = this;
    	
        self.userSessionHasTimedout = true;
        self.logger.debug('UserController.prototype.sessionTimeout', self.user);

        if($('.sessionTimeoutDialog').length === 0){
            $('body').append(self.sessionTemplate);        	
        }

        self.sessionDialog = $('.sessionTimeoutDialog').dialog(
        {
            title : 'Notification',
            modal : true,
            width : '420px',
            position :
            {
                my : 'center',
                at : 'center',
                of : '.section'
            },
            buttons :
            {
                'Ok' : function() {
                    self.logoutRequest();
                    $(this).dialog('close');
                },
                'Cancel' : function() {
                	self.userSessionHasTimedout = false;
                	if(self.user){
                    	self.userStore.setItem('user', JSON.stringify(ko.toJS(self.user)));                		
                	}
                    $(this).dialog('close');
                }
            },
            close : function() {
                $(this).dialog('destroy');
                $('#sessionTimeoutDialog').remove();
            },
            open : function() {
            	self.timeleft = 60;
            	$('.timeLeft').html(self.timeleft);
            	clearInterval(self.timeoutInterval);

            	self.timeoutInterval = setInterval(function(){
            		self.logoutTimer();
        		}, 1000);  
            }
        });

    };
    
    UserController.prototype.logoutTimer = function() {
        var self = this;

        self.timeleft += -1;
        $('.timeLeft').html(self.timeleft);

        if (self.timeleft === 0) {
            self.sessionDialog.dialog('close');
            self.logoutRequest();
        }
    };
    
    return UserController;
    
});
    
    