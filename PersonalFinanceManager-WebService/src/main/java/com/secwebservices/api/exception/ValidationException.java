package com.secwebservices.api.exception;

import java.util.List;

/**
 * 
 * RSSGnome - ValidationException.java
 * @author Robert Suppenbach
 * @created Nov 13, 2013
 */
@SuppressWarnings("serial")
public class ValidationException extends Exception {

	private List<ValidationError> errors;

	/**
	 * @param message
	 */
	public ValidationException(String message) {
		super(message);
	}

	/**
	 * @param t
	 */
	public ValidationException(Throwable t) {
		super(t);
	}

	/**
	 * @param message
	 * @param t
	 */
	public ValidationException(String message, Throwable t) {
		super(message, t);
	}

	/**
	 * @param errors
	 */
	public ValidationException(List<ValidationError> errors) {
		super("Validation Errors");
		this.errors = errors;
	}

	/**
	 * @param message
	 * @param errors
	 */
	public ValidationException(String message, List<ValidationError> errors) {
		super(message);
		this.errors = errors;
	}

	/**
	 * @return List<ValidationError>
	 */
	public List<ValidationError> getErrors() {
		return errors;
	}

	/**
	 * @param errors
	 */
	public void setErrors(List<ValidationError> errors) {
		this.errors = errors;
	}

}
