package com.secwebservices.api.controller;

import java.util.HashMap;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import org.apache.commons.lang.StringUtils;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import com.aranya.kaya.common.beans.DayAndTime;
import com.secwebservices.api.BaseController;
import com.secwebservices.api.exception.AuthorizationException;
import com.secwebservices.beans.user.User;

/**
 * 
 * RSSGnome - Ping.java
 * @author Robert Suppenbach
 * @created Nov 13, 2013
 */
@Controller
public class Ping extends BaseController {

    /**
     * ping
     * @param request
     * @return Map<String, String>
     * @throws AuthorizationException
     * 
     * Returns a timestamp and user data for the currently logged in user for this session.
     */
	@RequestMapping(value = "/ping")
	@ResponseBody
	public Map<String, String> ping(HttpServletRequest request) throws AuthorizationException {

	    Map<String, String> settings = new HashMap<String, String>();
	    settings.put("timestamp", new DayAndTime().getFormattedString("M/d/yyyy h:mm:ss"));
	    
	    String userdata = request.getParameter("user");
	    if(StringUtils.isNotBlank(userdata)){
	        User user = (User) request.getSession().getAttribute("user");
	        if (user == null) {    
	            throw new AuthorizationException("User Session does not exist.");
	        }

	        settings.put("username", user.getUsername());
	        settings.put("userEmail", user.getEmail());	        
	    }
	    
		return settings;
	}
}
