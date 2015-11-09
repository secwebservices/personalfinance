package com.secwebservices.serverservice;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.secwebservices.serverservice.service.AccountService;
import com.secwebservices.serverservice.service.ClientService;
import com.secwebservices.serverservice.service.RoleService;
import com.secwebservices.serverservice.service.UserService;

@Component
public class ServiceManager {

    @Autowired
    private AccountService accountService;
    
    @Autowired
    private ClientService clientService;
	
    @Autowired
    private RoleService roleService;

    @Autowired
    private UserService userService;

 
    public AccountService getAccountService() {
		return accountService;
	}

	public void setAccountService(AccountService accountService) {
		this.accountService = accountService;
	}

	public ClientService getClientService() {
		return clientService;
	}

	public void setClientService(ClientService clientService) {
		this.clientService = clientService;
	}

	public void setRoleService(RoleService roleService) {
		this.roleService = roleService;
	}

	public RoleService getRoleService() {
        return roleService;
    }

    public UserService getUserService() {
        return userService;
    }

    public void setUserService(UserService userService) {
        this.userService = userService;
    }

}
