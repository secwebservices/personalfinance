package com.secwebservices.api.controller.admin;

import javax.servlet.http.HttpServletRequest;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import com.secwebservices.api.BaseController;
import com.secwebservices.api.exception.AuthorizationException;
import com.secwebservices.api.exception.RequestFailureException;
import com.secwebservices.api.exception.ValidationException;
import com.secwebservices.beans.TabData;
import com.secwebservices.beans.TabsList;
import com.secwebservices.beans.user.User;

/**
 * 
 * RSSGnome - AdminCommand.java
 * @author Robert Suppenbach
 * @created Nov 13, 2013
 */
@Controller
@RequestMapping(value = "/admin", produces = "application/json")
public class AdminCommand extends BaseController {
    
    /**
     * list
     * @param request
     * @return TabsList
     * @throws AuthorizationException
     * @throws ValidationException
     * @throws RequestFailureException
     * 
     * Sets up the tabs for the Admin side.
     */
	@RequestMapping(value = "/basic", method = RequestMethod.GET)
	@ResponseBody
    public TabsList list(HttpServletRequest request)
            throws AuthorizationException, ValidationException, RequestFailureException {
	    TabsList data = new TabsList();

		User user = (User) request.getSession().getAttribute("user");

		if (user != null) {				
		    if(user.getAccountId() == null && user.getClientId() == null){
	            TabData tab = new TabData();
	            tab.setTabId("accounts");
	            tab.setTabName("Accounts");
	            data.addTab(tab);
	            
	            tab = new TabData();
                tab.setTabId("clients");
                tab.setTabName("Clients");
                data.addTab(tab);
                
                tab = new TabData();
                tab.setTabId("users");
                tab.setTabName("Users");
                data.addTab(tab);
                
                tab = new TabData();
                tab.setTabId("skins");
                tab.setTabName("Skins");
                data.addTab(tab);
		    }

		    if(user.getAccountId() != null){
                TabData tab = new TabData();
                tab.setTabId("clients");
                tab.setTabName("Clients");
                data.addTab(tab);
                
                tab = new TabData();
                tab.setTabId("users");
                tab.setTabName("Users");
                data.addTab(tab);
		    }
		    
		    if(user.getClientId() != null){
		        TabData tab = new TabData();
                tab = new TabData();
                tab.setTabId("users");
                tab.setTabName("Users");
                data.addTab(tab);		        
		    }

		} else {
		    throw new AuthorizationException("User Session does not exist.");
		}

		return data;
	}	
}
