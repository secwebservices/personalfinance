package com.secwebservices.exception;

public class DAOException extends RuntimeException
{
	/**
	 * 
	 */
	private static final long serialVersionUID = -4103487594752035871L;

	public DAOException(String e)
	{
		super(e);
	}
	
	public DAOException(Exception e)
	{
		super(e);
	}
}
