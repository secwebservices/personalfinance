package com.secwebservices.api.exception;

/**
 * 
 * RSSGnome - FileNotFoundException.java
 * @author Robert Suppenbach
 * @created Nov 13, 2013
 */
@SuppressWarnings("serial")
public class FileNotFoundException extends Exception {

    /**
     * 
     * @Author Robert Suppenbach
     * @param message
     */
	public FileNotFoundException(String message) {
		super(message);
	}

	/**
	 * 
	 * @Author Robert Suppenbach
	 * @param t
	 */
	public FileNotFoundException(Throwable t) {
		super(t);
	}

	/**
	 * 
	 * @Author Robert Suppenbach
	 * @param message
	 * @param t
	 */
	public FileNotFoundException(String message, Throwable t) {
		super(message, t);
	}
}
