package com.secwebservices.api.controller.admin;

import java.lang.reflect.InvocationTargetException;
import java.text.ParseException;
import java.util.ArrayList;
import java.util.List;

import javax.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import com.secwebservices.api.BaseController;
import com.secwebservices.api.exception.AuthorizationException;
import com.secwebservices.api.exception.RequestFailureException;
import com.secwebservices.api.exception.ValidationException;
import com.secwebservices.beans.AccountData;
import com.secwebservices.beans.account.Account;
import com.secwebservices.beans.account.AccountRequest;
import com.secwebservices.beans.user.User;
import com.secwebservices.entities.account.AccountEntity;
import com.secwebservices.serverservice.ServiceManager;

/**
 * 
 * RSSGnome - AdminAccountCommand.java
 * @author Robert Suppenbach
 * @created Nov 13, 2013
 */
@Controller
@RequestMapping(value = "/admin/account", produces = "application/json")
public class AdminAccountCommand extends BaseController {
    
    @Autowired
    ServiceManager serviceManager;  
    
    /**
     * listAccounts
     * @param request
     * @return List<Account>
     * @throws AuthorizationException
     * @throws ValidationException
     * @throws RequestFailureException
     * 
     * Returns a list of accounts
     */
    @RequestMapping(value = "/list", method = RequestMethod.GET)
    @ResponseBody
    public List<Account> listAccounts(HttpServletRequest request)
            throws AuthorizationException, ValidationException, RequestFailureException {

        Account account = (Account) request.getSession().getAttribute("account");
        User user = (User) request.getSession().getAttribute("user");
        List<Account> accounts = new ArrayList<Account>();
        
        try {

            if (user != null) {             

                if(user.getAccountId() == null && user.getClientId() == null && user.getAdmin()){
                    //System Admin user
                    accounts.addAll(serviceManager.getAccountService().getAccounts());      
                }else if(user.getAccountId() != null && user.getAdmin()){
                    //if Account Admin
                    Account adminAccount = serviceManager.getAccountService().getAccount(user.getAccountId().intValue());
                    accounts.add(adminAccount);
                }else{
                    accounts = null;
                }
            
            } else {
                throw new AuthorizationException("User Session does not exist.");
            }

        } catch (InvocationTargetException e) {
            throw new RequestFailureException(e.getMessage(), e);
        } catch (IllegalAccessException e) {
            throw new RequestFailureException(e.getMessage(), e);
        } catch (ParseException e) {
            throw new ValidationException(e.getMessage(), e);
        }

        return accounts;
    }
     
    /**
     * createAccount
     * @param request
     * @return AccountData
     * @throws AuthorizationException
     * @throws ValidationException
     * @throws RequestFailureException
     * 
     * Sets up the data for a new Account
     */
    @RequestMapping(value = "/create", method = RequestMethod.GET)
    @ResponseBody
    public AccountData createAccount(HttpServletRequest request)
            throws AuthorizationException, ValidationException, RequestFailureException {

        AccountData accountData = new AccountData();
        Account account = new Account();
        accountData.setAccount(account);

        return accountData;
    }    
    
    /**
     * editAccount
     * @param accountId
     * @param request
     * @return AccountData
     * @throws AuthorizationException
     * @throws ValidationException
     * @throws RequestFailureException
     * 
     * Sets up an Account for editing
     */
    @RequestMapping(value = "/edit/{accountId}", method = RequestMethod.GET)
    @ResponseBody
    public AccountData editAccount(@PathVariable Integer accountId, HttpServletRequest request)
            throws AuthorizationException, ValidationException, RequestFailureException {

        if(accountId == null){
            throw new ValidationException("Missing Account Id");
        }
        
        Account account = null;
        AccountData accountData = new AccountData();
 
        try {
            account = serviceManager.getAccountService().getAccount(accountId);
            
            if(account == null){
                throw new RequestFailureException("Missing Account");
            }
            
            accountData.setAccount(account);

        } catch (IllegalAccessException e) {
            throw new RequestFailureException(e.getMessage(), e);
        } catch (InvocationTargetException e) {
            throw new RequestFailureException(e.getMessage(), e);
        } catch (ParseException e) {
            throw new RequestFailureException(e.getMessage(), e);
        }

        return accountData;
    }
    
    /**
     * saveAccount
     * @param accountRequest
     * @param request
     * @return Account
     * @throws AuthorizationException
     * @throws ValidationException
     * @throws RequestFailureException
     * 
     * Saves the account to the database
     */
    @RequestMapping(value = "/save", method = RequestMethod.POST, consumes="application/json")
    @ResponseBody
    public Account saveAccount(@RequestBody AccountRequest accountRequest, HttpServletRequest request)
            throws AuthorizationException, ValidationException, RequestFailureException {
             
        AccountEntity accountEntity = new AccountEntity();
        Account account = null;
        try {
            accountEntity.setId(accountRequest.getId());
            accountEntity.setAccountName(accountRequest.getAccountName());
            accountEntity.setEmail(accountRequest.getEmail().toString());
            accountEntity.setSubdomain(accountRequest.getSubdomain());
            
            accountEntity.setEnabled(accountRequest.getEnabled());   

            account = serviceManager.getAccountService().saveAccount(accountEntity);
            
        } catch (IllegalAccessException e) {
            getLogger().error(e.getMessage(), e);
            throw new RequestFailureException(e.getMessage());
        } catch (InvocationTargetException e) {
            getLogger().error(e.getMessage(), e);
            throw new RequestFailureException(e.getMessage());
        }
        return account;
    }   

        
}
