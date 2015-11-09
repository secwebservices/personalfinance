package com.secwebservices.api.controller.admin;

import java.lang.reflect.InvocationTargetException;
import java.text.ParseException;
import java.util.ArrayList;
import java.util.List;

import javax.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import com.secwebservices.api.BaseController;
import com.secwebservices.api.exception.AuthorizationException;
import com.secwebservices.api.exception.RequestFailureException;
import com.secwebservices.api.exception.ValidationException;
import com.secwebservices.beans.user.User;
import com.secwebservices.serverservice.ServiceManager;

/**
 * 
 * RSSGnome - AdminUserCommand.java
 * @author Robert Suppenbach
 * @created Nov 13, 2013
 */
@Controller
@RequestMapping(value = "/admin/user", produces = "application/json")
public class AdminUserCommand extends BaseController {

    @Autowired
    ServiceManager serviceManager;  

    @Autowired
    private PasswordEncoder passwordEncoder;
    
    /**
     * listUsers
     * @param request
     * @return List<User>
     * @throws AuthorizationException
     * @throws ValidationException
     * @throws RequestFailureException
     * 
     * Returns a list of users
     * * If the currently logged in user is an System level user this will be 
     * a list of all users
     * * If the currently logged in user is an Account level user this will be 
     * a list of all users associated with this account including all clients
     * * If the currently logged in user is an Client level user this will be
     * a list of all users associated with this client. 
     */
    @RequestMapping(value = "/list", method = RequestMethod.GET)
    @ResponseBody
    public List<User> listUsers(HttpServletRequest request)
            throws AuthorizationException, ValidationException, RequestFailureException {

        User user = (User) request.getSession().getAttribute("user");
        List<User> users = new ArrayList<User>();

        try {

            if (user != null) {             

                if(user.getAccountId() == null && user.getClientId() == null && user.getAdmin()){
                    //System Admin user 
                    users.addAll(serviceManager.getUserService().getUsers());
                }else if(user.getAccountId() != null && user.getAdmin()){
                    //if Account Admin
                    users.addAll(serviceManager.getUserService().getUsersForAccount(user.getAccountId().intValue()));
                }else{
                    users = null;
                }
            
            } else {
                throw new AuthorizationException("User Session does not exist.");
            }

        } catch (InvocationTargetException e) {
            throw new RequestFailureException(e.getMessage(), e);
        } catch (IllegalAccessException e) {
            throw new RequestFailureException(e.getMessage(), e);
        } catch (ParseException e) {
            throw new ValidationException(e.getMessage(), e);
        }

        return users;
    }    
}
