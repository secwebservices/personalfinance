package com.secwebservices.api;

import java.util.HashMap;
import java.util.Map;

import javax.servlet.ServletContext;
import javax.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseBody;

import com.secwebservices.api.exception.AuthorizationException;
import com.secwebservices.api.exception.FileNotFoundException;
import com.secwebservices.api.exception.RegistrationException;
import com.secwebservices.api.exception.RequestFailureException;
import com.secwebservices.api.exception.ValidationException;

/**
 * 
 * RSSGnome - BaseController.java
 * @author Robert Suppenbach
 * @created Nov 13, 2013
 */
public class BaseController {
	protected Logger logger = LoggerFactory.getLogger(getClass());

	@Autowired
	private ServletContext servletContext;
	
	public Logger getLogger() {
		return logger;
	}

	public ServletContext getServletContext() {
		return servletContext;
	}

	public void setServletContext(ServletContext servletContext) {
		this.servletContext = servletContext;
	}

	/**
	 * handleFileNotFoundException
	 * @param e
	 * @param response
	 * @return Map<String, String>
	 * 
	 * Returns an mapping of the exception and sets the status of the HttpResponse to 404
	 */
	@ExceptionHandler(FileNotFoundException.class)
	@ResponseBody
	public Map<String, String> handleFileNotFoundException(FileNotFoundException e, HttpServletResponse response) {
		getLogger().debug("File not found", e);

		response.setStatus(404);

		Map<String, String> data = new HashMap<String, String>();
		data.put("message", e.getMessage());

		return data;
	}

	/**
	 * handleAuthorizationException
	 * @param e
	 * @param response
	 * @return Map<String, String>
	 * 
     * Returns an mapping of the exception and sets the status of the HttpResponse to 401
	 */
	@ExceptionHandler(AuthorizationException.class)
	@ResponseBody
	public Map<String, String> handleAuthorizationException(AuthorizationException e, HttpServletResponse response) {
		getLogger().debug("Authorization failed", e);

		response.setStatus(401);

		Map<String, String> data = new HashMap<String, String>();
		data.put("message", e.getMessage());

		return data;
	}

	/**
	 * handleValidationException
	 * @param e
	 * @param response
	 * @return Map<String, Object>
	 * 
     * Returns an mapping of the exception and sets the status of the HttpResponse to 400
	 */
	@ExceptionHandler(ValidationException.class)
	@ResponseBody
	public Map<String, Object> handleValidationException(ValidationException e, HttpServletResponse response) {
		getLogger().debug("Validation failed", e);

		response.setStatus(400);

		Map<String, Object> data = new HashMap<String, Object>();
		data.put("message", e.getMessage());
		data.put("errors", e.getErrors());
		return data;
	}

	/**
	 * handleRequestFailureException
	 * @param e
	 * @param response
	 * @return Map<String, String>
	 * 
     * Returns an mapping of the exception and sets the status of the HttpResponse to 500
	 */
	@ExceptionHandler(RegistrationException.class)
	@ResponseBody
	public Map<String, String> handleRequestFailureException(RegistrationException e, HttpServletResponse response) {
		//getLogger().error("Registration Exception", e);

		response.setStatus(500);

		Map<String, String> data = new HashMap<String, String>();
		data.put("message", e.getMessage());

		return data;
	}

	/**
	 * handleRequestFailureException
	 * @param e
	 * @param response
	 * @return Map<String, String>
	 * 
     * Returns an mapping of the exception and sets the status of the HttpResponse to 500
	 */
	@ExceptionHandler(RequestFailureException.class)
	@ResponseBody
	public Map<String, String> handleRequestFailureException(RequestFailureException e, HttpServletResponse response) {
		getLogger().error("Request failed", e);

		response.setStatus(500);

		Map<String, String> data = new HashMap<String, String>();
		data.put("message", e.getMessage());

		return data;
	}

}
