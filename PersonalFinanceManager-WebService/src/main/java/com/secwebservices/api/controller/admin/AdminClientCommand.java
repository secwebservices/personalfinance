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
import com.secwebservices.beans.ClientData;
import com.secwebservices.beans.account.Account;
import com.secwebservices.beans.client.Client;
import com.secwebservices.beans.client.ClientRequest;
import com.secwebservices.beans.user.User;
import com.secwebservices.entities.client.ClientEntity;
import com.secwebservices.serverservice.ServiceManager;

/**
 * 
 * RSSGnome - AdminClientCommand.java
 * @author Robert Suppenbach
 * @created Nov 13, 2013
 */
@Controller
@RequestMapping(value = "/admin/client", produces = "application/json")
public class AdminClientCommand extends BaseController {

    @Autowired
    ServiceManager serviceManager;  
	
    /**
     * listClients
     * @param request
     * @return List<Client>
     * @throws AuthorizationException
     * @throws ValidationException
     * @throws RequestFailureException
     * 
     * Returns a list of clients based on the current logged in user Client
     * * If the user is a system admin level user this will return all clients.
     * * If the user is an Client level user, the list will be for all  
     * clients associated with the Client the user is tied to.
     * * If the user is a client level user this will return null;
     */
    @RequestMapping(value = "/list", method = RequestMethod.GET)
    @ResponseBody
    public List<Client> listClients(HttpServletRequest request)
            throws AuthorizationException, ValidationException, RequestFailureException {

        User user = (User) request.getSession().getAttribute("user");
        List<Client> clients = new ArrayList<Client>();

        try {

            if (user != null) {             

                if(user.getClientId() == null && user.getClientId() == null && user.getAdmin()){
                    //System Admin user 
                    clients.addAll(serviceManager.getClientService().getClients());
                }else if(user.getClientId() != null && user.getAdmin()){
                    //if Client Admin
                    clients.addAll(serviceManager.getClientService().getClientsForAccount(user.getClientId().intValue()));
                }else{
                    clients = null;
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

        return clients;
    }  
    
    /**
     * createClient
     * @param request
     * @return ClientData
     * @throws AuthorizationException
     * @throws ValidationException
     * @throws RequestFailureException
     * 
     * Sets up the data for a new Client
     */
    @RequestMapping(value = "/create", method = RequestMethod.GET)
    @ResponseBody
    public ClientData createClient(HttpServletRequest request)
            throws AuthorizationException, ValidationException, RequestFailureException {

        ClientData clientData = new ClientData();
        Client client = new Client();

        try {
            
            clientData.setClient(client);
            
            Account account = (Account) request.getSession().getAttribute("account");
            clientData.setAccount(account);
            
        } catch (Exception e) {
            throw new RequestFailureException(e.getMessage(), e);
        }

        return clientData;
    }     
    
    
    /**
     * editClient
     * @param clientId
     * @param request
     * @return ClientData
     * @throws AuthorizationException
     * @throws ValidationException
     * @throws RequestFailureException
     * 
     * Sets up an Client for editing
     */
    @RequestMapping(value = "/edit/{clientId}", method = RequestMethod.GET)
    @ResponseBody
    public ClientData editClient(@PathVariable Integer clientId, HttpServletRequest request)
            throws AuthorizationException, ValidationException, RequestFailureException {

        if(clientId == null){
            throw new ValidationException("Missing Client Id");
        }
        
        Client client = null;
        ClientData clientData = new ClientData();
 
        try {
            client = serviceManager.getClientService().getClient(clientId);
            
            if(client == null){
                throw new RequestFailureException("Missing Client");
            }
            
            clientData.setClient(client);
            
            Account account = serviceManager.getAccountService().getAccount(client.getAccountId());
            
            clientData.setAccount(account);
            
        } catch (IllegalAccessException e) {
            throw new RequestFailureException(e.getMessage(), e);
        } catch (InvocationTargetException e) {
            throw new RequestFailureException(e.getMessage(), e);
        } catch (ParseException e) {
            throw new RequestFailureException(e.getMessage(), e);
        }

        return clientData;
    }    
    
    /**
     * saveClient
     * @param clientRequest
     * @param request
     * @return Client
     * @throws AuthorizationException
     * @throws ValidationException
     * @throws RequestFailureException
     * 
     * Saves the client to the database
     */
    @RequestMapping(value = "/save", method = RequestMethod.POST, consumes="application/json")
    @ResponseBody
    public Client saveClient(@RequestBody ClientRequest clientRequest, HttpServletRequest request)
            throws AuthorizationException, ValidationException, RequestFailureException {
             
        ClientEntity clientEntity = new ClientEntity();
        Client client = null;
        try {
            clientEntity.setId(clientRequest.getId());
            clientEntity.setClientName(clientRequest.getClientName());
 
            

            client = serviceManager.getClientService().saveClient(clientEntity);
            
        } catch (IllegalAccessException e) {
            getLogger().error(e.getMessage(), e);
            throw new RequestFailureException(e.getMessage());
        } catch (InvocationTargetException e) {
            getLogger().error(e.getMessage(), e);
            throw new RequestFailureException(e.getMessage());
        }
        return client;
    }

    /**
     * removeClient
     * @param clientRequest
     * @param request
     * @return String
     * @throws AuthorizationException
     * @throws ValidationException
     * @throws RequestFailureException
     * 
     * Removes a client and returns a status of the remove action
     */
    @RequestMapping(value = "/remove", method = RequestMethod.POST, consumes="application/json")
    @ResponseBody
    public String removeClient(@RequestBody ClientRequest clientRequest, HttpServletRequest request)
            throws AuthorizationException, ValidationException, RequestFailureException {
             
        try {
            serviceManager.getClientService().removeClient(clientRequest.getId());

        } catch (IllegalAccessException e) {
            getLogger().error(e.getMessage(), e);
            throw new RequestFailureException(e.getMessage());
        } catch (InvocationTargetException e) {
            getLogger().error(e.getMessage(), e);
            throw new RequestFailureException(e.getMessage());
        }
        return "{message:'Success'}";
    }
}