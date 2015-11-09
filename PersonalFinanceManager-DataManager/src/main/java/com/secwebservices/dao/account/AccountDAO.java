package com.secwebservices.dao.account;

import java.util.List;

import com.secwebservices.beans.account.Account;
import com.secwebservices.dao.CoreDAO;
import com.secwebservices.entities.account.AccountEntity;

public interface AccountDAO extends CoreDAO<AccountEntity> 
{
	public AccountEntity getAccount(Integer id); 
	
	public AccountEntity getAccount(String subdomain);	
	
	public List<AccountEntity> getAccounts();
	
	public Account saveAccount(AccountEntity AccountEntity);
}
