package com.secwebservices.dao.client.hibernate;

import java.util.Date;
import java.util.List;

import org.hibernate.Criteria;
import org.hibernate.SessionFactory;
import org.hibernate.classic.Session;
import org.hibernate.criterion.Restrictions;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.aranya.kaya.common.beans.Day;
import com.secwebservices.beans.client.Client;
import com.secwebservices.dao.HibernateDAO;
import com.secwebservices.dao.client.ClientDAO;
import com.secwebservices.entities.client.ClientEntity;

@Repository("clientDAO")
public class HibernateClientDAO extends HibernateDAO<ClientEntity> implements ClientDAO {

	 /**
     * 
     */
    public HibernateClientDAO()
    {
        super();
    }

    @Autowired
    public HibernateClientDAO(SessionFactory sessionFactory)
    {
        this.sessionFactory = sessionFactory;
    }
    
	@Autowired  
    private SessionFactory sessionFactory;  
      
    private Session getCurrentSession() {  
        return sessionFactory.getCurrentSession();  
    }  
  
    @Override
    public ClientEntity getClient(Integer id) {  
        ClientEntity client = (ClientEntity) getCurrentSession().load(ClientEntity.class, id);  
        return client;  
    }     

    @Override
    public List<ClientEntity> getClients() {
    	Session session = getCurrentSession();
        Criteria criteria =  session.createCriteria(ClientEntity.class);
        criteria.add(Restrictions.isNull("endDay"));
        
        @SuppressWarnings("unchecked")
        List<ClientEntity> clients = criteria.list(); 
            
        return clients;
    }
    
    @Override
    public List<ClientEntity> getClientsForAccount(Integer accountId) {
        Session session = getCurrentSession();
        Criteria criteria =  session.createCriteria(ClientEntity.class);
        criteria.add(Restrictions.eq("accountId", accountId)); 
        criteria.add(Restrictions.isNull("endDay"));
        
        @SuppressWarnings("unchecked")
        List<ClientEntity> clients = criteria.list(); 
            
        return clients;
    }
    
    @Override
    public Client saveClient(ClientEntity clientEntity) {
        
        ClientEntity entity = null;
        if(clientEntity.getId() != null){
            entity = getClient(clientEntity.getId());
        }
        
        if(entity != null){
            // this is a previously deleted item (soft delete)
            // clear out the end day to restore its visibility.
            entity.setClientName(clientEntity.getClientName());
            entity.setAccountId(clientEntity.getAccountId());
            entity.setEmail(clientEntity.getEmail());
            entity.setPhone(clientEntity.getPhone());
            entity.setStartDay(new Day().getDate());            
            entity.setEndDay(null);
        }else{
            entity = clientEntity;
        }
        
        Session session = sessionFactory.getCurrentSession();
        session.saveOrUpdate(entity);
        
        return new Client(entity);
    }   
    
    @Override
    public void removeClient(Integer clientId) {
        ClientEntity clientEntity = getClient(clientId);
        clientEntity.setEndDay(new Date());
        Session session = sessionFactory.getCurrentSession();
        
        session.saveOrUpdate(clientEntity);        
    }       
}
