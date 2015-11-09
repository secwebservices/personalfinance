package com.secwebservices.dao.client;

import java.util.List;

import com.secwebservices.beans.client.Client;
import com.secwebservices.dao.CoreDAO;
import com.secwebservices.entities.client.ClientEntity;

public interface ClientDAO extends CoreDAO<ClientEntity> 
{
	public ClientEntity getClient(Integer id); 
	
	public List<ClientEntity> getClients();
	
	public List<ClientEntity> getClientsForAccount(Integer accountId);
    
    public Client saveClient(ClientEntity ClientEntity);	
    
    public void removeClient(Integer id);     
}
