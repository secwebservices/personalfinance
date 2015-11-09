package com.secwebservices.serverservice.service.impl;
import java.lang.reflect.InvocationTargetException;
import java.text.ParseException;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.secwebservices.beans.account.Account;
import com.secwebservices.dao.account.AccountDAO;
import com.secwebservices.entities.account.AccountEntity;
import com.secwebservices.serverservice.service.AccountService;

/**
 * 
 * @author robertsuppenbach
 *
 */
@Transactional
@Service("accountService")
public class AccountServiceImpl implements AccountService {

    @Autowired
    private AccountDAO accountDAO;

    @Override
    public Account getAccount(Integer id) throws ParseException, IllegalAccessException, InvocationTargetException {
        return new Account(accountDAO.getAccount(id));
    }

    @Override
    public Account getAccount(String subdomain) throws ParseException, IllegalAccessException, InvocationTargetException {
        return new Account(accountDAO.getAccount(subdomain));
    }

    @Override
    public List<Account> getAccounts() throws ParseException, IllegalAccessException, InvocationTargetException {
        List<Account> accounts = new ArrayList<Account>();
        
        for(AccountEntity accountEntity : accountDAO.getAccounts()){
            accounts.add(new Account(accountEntity));
        }
        
        return accounts;
    }
    
    @Override
    public Account saveAccount(AccountEntity accountEntity) throws IllegalAccessException, InvocationTargetException {
        // TODO Auto-generated method stub
        return accountDAO.saveAccount(accountEntity);
    }
}
