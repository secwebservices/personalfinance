package com.secwebservices.serverservice.service;

import java.lang.reflect.InvocationTargetException;
import java.text.ParseException;
import java.util.List;

import com.secwebservices.beans.client.Client;
import com.secwebservices.entities.client.ClientEntity;

/**
 * 
 * @author robertsuppenbach
 *
 */
public interface ClientService {
	public Client getClient(Integer id) throws ParseException, IllegalAccessException, InvocationTargetException; 
	
	public List<Client> getClients() throws ParseException, IllegalAccessException, InvocationTargetException; 

    public List<Client> getClientsForAccount(Integer accountId) throws ParseException, IllegalAccessException, InvocationTargetException;
    
    public Client saveClient(ClientEntity clientEntity) throws IllegalAccessException, InvocationTargetException; 

    public void removeClient(Integer id) throws IllegalAccessException, InvocationTargetException;     
}
