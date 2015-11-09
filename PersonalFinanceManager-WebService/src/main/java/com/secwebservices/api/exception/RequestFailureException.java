package com.secwebservices.api.exception;

/**
 * 
 * RSSGnome - RequestFailureException.java
 * @author Robert Suppenbach
 * @created Nov 13, 2013
 */
@SuppressWarnings("serial")
public class RequestFailureException extends Exception {

    /**
     * 
     * @Author Robert Suppenbach
     * @param message
     */
	public RequestFailureException(String message) {
		super(message);
	}

	/**
	 * 
	 * @Author Robert Suppenbach
	 * @param t
	 */
	public RequestFailureException(Throwable t) {
		super(t);
	}

	/**
	 * 
	 * @Author Robert Suppenbach
	 * @param message
	 * @param t
	 */
	public RequestFailureException(String message, Throwable t) {
		super(message, t);
	}
}
