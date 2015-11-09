package com.secwebservices.api.controller.user;

import java.lang.reflect.InvocationTargetException;
import java.text.ParseException;
import java.util.List;

import javax.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import com.secwebservices.api.BaseController;
import com.secwebservices.api.exception.AuthorizationException;
import com.secwebservices.api.exception.RequestFailureException;
import com.secwebservices.api.exception.ValidationException;
import com.secwebservices.beans.account.Account;
import com.secwebservices.beans.client.Client;
import com.secwebservices.beans.user.LoginRequest;
import com.secwebservices.beans.user.User;
import com.secwebservices.serverservice.ServiceManager;

/**
 * 
 * RSSGnome - UserCommand.java
 * @author Robert Suppenbach
 * @created Nov 13, 2013
 */
@Controller
@RequestMapping(value = "/user", produces = "application/json")
public class UserCommand extends BaseController {
    
    @Autowired
    ServiceManager serviceManager;   
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    /**
     * login
     * @param loginRequest
     * @param request
     * @return User
     * @throws AuthorizationException
     * @throws ValidationException
     * @throws RequestFailureException
     * 
     * Sets the user in the session and returns the logged in user.
     */
	@RequestMapping(value = "/login", method = RequestMethod.POST)
	@ResponseBody
    public User login(@RequestBody LoginRequest loginRequest, HttpServletRequest request)
            throws AuthorizationException, ValidationException, RequestFailureException {
		User user = null;
		try {
			user = serviceManager.getUserService().getUser(loginRequest.getUsername());
			if (user != null) {				
				if(!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())){
					throw new AuthorizationException("Username or password invalid");
				}
				
				if(!user.getAccountNonLocked()){
				    throw new AuthorizationException("Account locked");
				}
				
				if(!user.getEnabled()){
				    throw new AuthorizationException("Account disabled");
				}
				
				if(!user.getCredentialsNonExpired()){
				    throw new AuthorizationException("Username or password invalid");
				}
				
				if(!user.getAccountNonExpired()){
				    throw new AuthorizationException("Account expired");
				}

				if(user.getAccountId() != null){
				    Account account = (Account) request.getSession().getAttribute("account");

	                if(account != null && !account.getId().equals(user.getAccountId())){
	                    throw new AuthorizationException("Username or password invalid for this site"); 
	                }
				}else if(user.getClientId() != null){
                    Client client = (Client) request.getSession().getAttribute("client");
                    Account account = (Account) request.getSession().getAttribute("account");
                    
                    if(client == null){
                        List<Client> clients = serviceManager.getClientService().getClientsForAccount(account.getId());
                        if(clients == null){
                            throw new AuthorizationException("Username or password invalid for this site"); 
                        }
                        
                        for(Client clientItem: clients){
                            if(user.getClientId().equals(clientItem.getId())){
                                client = clientItem;
                            }
                        }
                    }
                    
                    if(client == null || !client.getId().equals(user.getClientId())){
                        throw new AuthorizationException("Username or password invalid for this site"); 
                    }				    
				}else if(user.getAccountId() == null && user.getClientId() == null){
				    if(!user.getAdmin()){
				        throw new AuthorizationException("Username or password invalid");
				    }
				}

				user.setPassword("");
                request.getSession().setAttribute("user", user);
			} else {
				throw new AuthorizationException("Database Error - Please Contact Support.");
			}

		} catch (InvocationTargetException e) {
		    throw new RequestFailureException(e.getMessage(), e);
		} catch (IllegalAccessException e) {
			throw new RequestFailureException(e.getMessage(), e);
		} catch (ParseException e) {
		    throw new ValidationException(e.getMessage(), e);
        }

		return user;
	}
	
	/**
	 * logout
	 * @param request
	 * @return String
	 * @throws AuthorizationException
	 * @throws ValidationException
	 * @throws RequestFailureException
	 * 
	 * Removes the user from the session and returns a status message
	 */
    @RequestMapping(value = "/logout", method = RequestMethod.GET)
    @ResponseBody
    public String logout(HttpServletRequest request)
            throws AuthorizationException, ValidationException, RequestFailureException {
        request.getSession().removeAttribute("user");


        return "{message:'success'}";
    }	
    
    /**
     * isLoggedIn
     * @param request
     * @return User
     * @throws AuthorizationException
     * @throws ValidationException
     * @throws RequestFailureException
     * 
     * Checks for and returns the currenlty logged in user.
     */
    @RequestMapping(value = "/isloggedin", method = RequestMethod.GET)
    @ResponseBody
    public User isLoggedIn(HttpServletRequest request)
            throws AuthorizationException, ValidationException, RequestFailureException {
        User user = (User) request.getSession().getAttribute("user");

        if(user == null){
            throw new AuthorizationException("Not Logged In");
        }

        return user;
    }    
}
