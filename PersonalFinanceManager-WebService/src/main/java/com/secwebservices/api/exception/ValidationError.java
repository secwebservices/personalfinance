package com.secwebservices.api.exception;

/**
 * 
 * RSSGnome - ValidationError.java
 * @author Robert Suppenbach
 * @created Nov 13, 2013
 */
public class ValidationError {

	private String fieldName;

	private String message;

	public String getFieldName() {
		return fieldName;
	}

	public void setFieldName(String fieldName) {
		this.fieldName = fieldName;
	}

	public String getMessage() {
		return message;
	}

	public void setMessage(String message) {
		this.message = message;
	}

}
