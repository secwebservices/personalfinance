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
        'view/user/SessionExpiredView',
        'controller/RouteController',
        'TemplateManager'], function($, ko, LoggerConfig, Nediator, UserLoginView, UserLogoutView, SessionExpiredView, RouteController,  TemplateManager){
	
    function UserController(config){
    	var self = this;
    	
    	self.logger = new LoggerConfig().getLogger('UserController.js');
    	
    	self.userLoginView = new UserLoginView({
            /** the element to render the view on. */
            element : '.userdialog',
            user: config.user
        });

        self.userLogoutView = new UserLogoutView({
            /** the element to render the view on. */
            element : '.userdialog',
            user: config.user
        });
        
        self.sessionExpiredView = new SessionExpiredView({
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
    
    UserController.prototype.userLoginView = undefined; 
    
    UserController.prototype.userLogoutView = undefined;
    
    UserController.prototype.sessionExpiredView = undefined;
    
    UserController.prototype.logger = undefined;
    
    UserController.prototype.applicationContext = undefined;
    
    UserController.prototype.user = undefined;

    UserController.prototype.userLoggedIn = undefined;
    
    UserController.prototype.userSessionHasTimedout = false;
    
    UserController.prototype.userSessionHasExpired = false;

    UserController.prototype.timeleft = 60;
    
    UserController.prototype.heatbeatcounter = 1;

    UserController.prototype.sessionTimeoutDialog = undefined;
    
    UserController.prototype.sessionTimeoutTemplate = undefined;
    
    UserController.prototype.sessionExpiredDialog = undefined;

    UserController.prototype.sessionExpiredTemplate = undefined;
    
    UserController.prototype.timeoutInterval = undefined;
    
    UserController.prototype.getUserSession = function(){
        return JSON.parse(sessionStorage.getItem('user'));  
    };
    
    UserController.prototype.setUserSession = function(data){
        sessionStorage.setItem('user', JSON.stringify(data)); 
    };
    
    UserController.prototype.clearUserSession = function(){
        sessionStorage.removeItem('user'); 
    };

    UserController.prototype.loginRequest = function(message){
    	var self = this, loginRequest = message.loginRequest;
    	
    	$.ajax({
		    type: "POST",
		    contentType: 'application/json',
		    url: '/api/user/login',
		    data: JSON.stringify(loginRequest),
		    success: function(data, status, request){
				self.logger.debug('Login Request', status);
				self.setUserSession('user', JSON.stringify(data));
				self.user(data);
                self.userLoggedIn = true;
                self.userSessionHasExpired = false;
                self.userSessionHasTimedout = false;
                self.timeleft = 60;
				if(status === 'success'){
			    	Mediator.publish({channel: 'PF-Login-Success'});
			    	Mediator.publish({channel: 'PF-Derender', view: 'UserLoginView'});
				}
		    },
		    error: function(jqXHR, status, error){
		        Mediator.publish({channel: 'PF-Error', message: JSON.parse(jqXHR.responseText).message});
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
				self.clearUserSession();
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
        
        self.sessionTimeoutTemplate = TemplateManager.getTemplate('session_timeout');
        
        self.sessionExpiredTemplate = TemplateManager.getTemplate('session_expired');
        
        user = self.getUserSession();
        
        if(user){
        	self.user(user);
        	self.userLoggedIn = true;
        }
        
        Mediator.subscribe({channel: 'PF-Heartbeat', context: self, callback: self.serverHeartbeat});  

        Mediator.subscribe({channel: 'PF-Session-Expired', context: self, callback: self.expireUserSession}); 
        
        $.ajax('/api/ping', {
            cache:false,
            async:false,
            global: false,
            success: function(data, status, jqXHR){
            	self.applicationContext().servertime(data.timestamp);
            },
            dataType: 'json'
        });
        
        $(document).ajaxError(function(event, xhr, settings, exception) {
            if (xhr.status === 401 && self.userLoggedIn) {
                Mediator.publish({"channel" : "PF-Session-Expired"}); 
            }    
        }); 
        
    };
    
    /**
     * serverHeartbeat
     * 
     * @param data {object} format {timestamp : {integer}}
     */
    UserController.prototype.serverHeartbeat = function(data) {
        var self = this, ts = data.message.timestamp, url, currentStatus;
        
        if (!self.getUserSession() && (
                self.user() && !self.userSessionHasTimedout && !self.userSessionHasExpired)
        ) {
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
                },
                error: function(jqXHR, status, error){
                	if(jqXHR.status == 401){
                		self.logoutRequest();
                	}
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
            $('body').append(self.sessionTimeoutTemplate);        	
        }

        self.sessionTimeoutDialog = $('.sessionTimeoutDialog').dialog(
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
                    $(this).dialog('close');
                    self.logoutRequest();
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
            	clearInterval(self.timeoutInterval);
                $(this).dialog('destroy');
                $('.sessionTimeoutDialog').remove();
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
    
    /**
     * sessionExpired
     */
    UserController.prototype.sessionExpired = function() {
        var self = this;
    	
        self.userSessionHasExpired = true;
        self.userSessionHasTimedout = false;
        self.logger.debug('UserController.prototype.sessionExpired', self.user);

        Mediator.publish({channel: 'PF-Render', view: 'SessionExpiredView', derender: false});
        
        self.timeleft = 60;
        $('.timeLeft').html(self.timeleft);
        clearInterval(self.timeoutInterval);

        self.timeoutInterval = setInterval(function(){
            self.logoutTimer();
        }, 1000);  
    };    
    
    UserController.prototype.logoutTimer = function() {
        var self = this;

        self.timeleft += -1;
        $('.timeLeft').html(self.timeleft);

        if (self.timeleft === 0) {
            Mediator.publish({channel: 'PF-Derender', view: 'SessionExpiredView', derender: false});
            if(self.sessionTimeoutDialog){
                self.sessionTimeoutDialog.dialog('close');                
            }

            self.logoutRequest();
        }
        
        
    };

    UserController.prototype.expireUserSession = function(){
        var self = this;
        self.sessionExpired();   
        self.clearUserSession();
    };
    
    
    return UserController;
    
});
    
    