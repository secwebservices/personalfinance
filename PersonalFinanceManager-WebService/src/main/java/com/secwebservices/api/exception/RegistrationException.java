package com.secwebservices.api.exception;

/**
 * 
 * RSSGnome - RegistrationException.java
 * @author Robert Suppenbach
 * @created Nov 13, 2013
 */
@SuppressWarnings("serial")
public class RegistrationException extends Exception {

    /**
     * 
     * @Author Robert Suppenbach
     * @param message
     */
	public RegistrationException(String message) {
		super(message);
	}

	/**
	 * 
	 * @Author Robert Suppenbach
	 * @param t
	 */
	public RegistrationException(Throwable t) {
		super(t);
	}

	/**
	 * 
	 * @Author Robert Suppenbach
	 * @param message
	 * @param t
	 */
	public RegistrationException(String message, Throwable t) {
		super(message, t);
	}
}
