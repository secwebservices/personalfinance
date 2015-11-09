package com.secwebservices.serverservice.service;

import java.lang.reflect.InvocationTargetException;
import java.text.ParseException;
import java.util.List;

import com.secwebservices.beans.account.Account;
import com.secwebservices.entities.account.AccountEntity;

/**
 * 
 * @author robertsuppenbach
 *
 */
public interface AccountService {
	public Account getAccount(Integer id) throws ParseException, IllegalAccessException, InvocationTargetException; 
	
	public Account getAccount(String subdomain) throws ParseException, IllegalAccessException, InvocationTargetException;
	
	public List<Account> getAccounts() throws ParseException, IllegalAccessException, InvocationTargetException; 
	
	public Account saveAccount(AccountEntity accountEntity) throws IllegalAccessException, InvocationTargetException; 
}
