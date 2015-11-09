package com.secwebservices.beans;

import com.secwebservices.beans.account.Account;
import com.secwebservices.beans.client.Client;

public class ClientData {

    private Client client;

    private Account account;

    public Client getClient() {
        return client;
    }

    public void setClient(Client client) {
        this.client = client;
    }

    public Account getAccount() {
        return account;
    }

    public void setAccount(Account account) {
        this.account = account;
    }

    
    
}
