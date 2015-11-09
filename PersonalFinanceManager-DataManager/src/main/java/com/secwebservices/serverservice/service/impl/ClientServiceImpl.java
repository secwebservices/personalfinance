package com.secwebservices.serverservice.service.impl;

import java.lang.reflect.InvocationTargetException;
import java.text.ParseException;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.secwebservices.beans.client.Client;
import com.secwebservices.dao.client.ClientDAO;
import com.secwebservices.entities.client.ClientEntity;
import com.secwebservices.serverservice.service.ClientService;

/**
 * 
 * @author robertsuppenbach
 *
 */
@Transactional
@Service("clientService")
public class ClientServiceImpl implements ClientService {

    @Autowired
    private ClientDAO clientDAO;

    @Override
    public Client getClient(Integer id) throws ParseException, IllegalAccessException, InvocationTargetException {
        return new Client(clientDAO.getClient(id));
    }

    @Override
    public List<Client> getClients() throws ParseException, IllegalAccessException, InvocationTargetException {
        List<Client> clients = new ArrayList<Client>();
        
        for(ClientEntity clientEntity : clientDAO.getClients()){
            clients.add(new Client(clientEntity));
        }
        
        return clients;
    }

    @Override
    public List<Client> getClientsForAccount(Integer accountId) throws ParseException, IllegalAccessException, InvocationTargetException {
        List<Client> clients = new ArrayList<Client>();
        
        for(ClientEntity clientEntity : clientDAO.getClientsForAccount(accountId)){
            clients.add(new Client(clientEntity));
        }
        
        return clients;
    }

    
    @Override
    public Client saveClient(ClientEntity clientEntity) throws IllegalAccessException, InvocationTargetException {
        // TODO Auto-generated method stub
        return clientDAO.saveClient(clientEntity);
    }

    @Override
    public void removeClient(Integer feedId) throws IllegalAccessException, InvocationTargetException {
        // TODO Auto-generated method stub
        clientDAO.removeClient(feedId);
    }

}    

