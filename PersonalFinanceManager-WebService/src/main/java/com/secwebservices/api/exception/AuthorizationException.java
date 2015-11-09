package com.secwebservices.api.exception;

/**
 * 
 * RSSGnome - AuthorizationException.java
 * @author Robert Suppenbach
 * @created Nov 13, 2013
 */
@SuppressWarnings("serial")
public class AuthorizationException extends Exception {

    /**
     * 
     * @Author Robert Suppenbach
     * @param message
     */
	public AuthorizationException(String message) {
		super(message);
	}

	/**
	 * 
	 * @Author Robert Suppenbach
	 * @param t
	 */
	public AuthorizationException(Throwable t) {
		super(t);
	}

	/**
	 * 
	 * @Author Robert Suppenbach
	 * @param message
	 * @param t
	 */
	public AuthorizationException(String message, Throwable t) {
		super(message, t);
	}
}
