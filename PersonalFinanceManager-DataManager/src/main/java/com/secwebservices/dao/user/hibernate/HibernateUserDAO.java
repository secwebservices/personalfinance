package com.secwebservices.dao.user.hibernate;

import java.util.List;

import org.hibernate.Criteria;
import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.hibernate.criterion.Restrictions;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.secwebservices.dao.HibernateDAO;
import com.secwebservices.dao.user.UserDAO;
import com.secwebservices.entities.client.ClientEntity;
import com.secwebservices.entities.user.UserEntity;

@Repository("userDAO")
public class HibernateUserDAO extends HibernateDAO<UserEntity> implements UserDAO
{
    /**
     * 
     */
    public HibernateUserDAO()
    {
        super();
    }

    @Autowired
    public HibernateUserDAO(SessionFactory sessionFactory)
    {
        this.sessionFactory = sessionFactory;
    }
    
    @Override
    public UserEntity getUser(Integer userId) {  
        Session session = sessionFactory.getCurrentSession();
        Criteria criteria =  session.createCriteria(UserEntity.class);
        criteria.add(Restrictions.eq("id", userId));
        
        UserEntity user = (UserEntity) criteria.uniqueResult();
        return user;   
    } 
    
    @Override   
    public UserEntity getUser(String username) {  
    	Session session = sessionFactory.getCurrentSession();
    	Criteria criteria =  session.createCriteria(UserEntity.class);
    	criteria.add(Restrictions.eq("username", username));
    	
        UserEntity user = (UserEntity) criteria.uniqueResult();
        return user;   
    }  
 
    @Override    
    public UserEntity getUserByEmail(String email) {  
    	Session session = sessionFactory.getCurrentSession();
    	Criteria criteria =  session.createCriteria(UserEntity.class);
    	criteria.add(Restrictions.eq("email", email));
    	
        UserEntity user = (UserEntity) criteria.uniqueResult();
        return user;   
    }  
 
    @Override
    public UserEntity getUserByPwResetKey(String key) {  
    	Session session = sessionFactory.getCurrentSession();
    	Criteria criteria =  session.createCriteria(UserEntity.class);
    	criteria.add(Restrictions.eq("pwResetKey", key));
    	
        UserEntity user = (UserEntity) criteria.uniqueResult();
        return user;   
    }  
    
    @Override
    public List<UserEntity> getUsers() {  
    	Session session = sessionFactory.getCurrentSession();
    	Criteria criteria =  session.createCriteria(UserEntity.class)
    			.setResultTransformer(Criteria.DISTINCT_ROOT_ENTITY);
    	
        @SuppressWarnings("unchecked")
        List<UserEntity> users = criteria.list(); 
        
        return users;
    }  
    
    @Override
    public List<UserEntity> getUsersForAccount(Integer accountId) {  
        Session session = sessionFactory.getCurrentSession();
        Criteria clientCriteria =  session.createCriteria(ClientEntity.class);

        @SuppressWarnings("unchecked")
        List<ClientEntity> clients = clientCriteria.list();
        Integer[] clientIds = new Integer[clients.size()];
        
        Integer index = 0;
        for(ClientEntity client: clients){
            clientIds[index++] = client.getId().intValue();
        }
        
        Criteria criteria =  session.createCriteria(UserEntity.class);
        criteria.add(Restrictions.disjunction()
                .add(Restrictions.in("clientId", clientIds))
                .add(Restrictions.eq("accountId", accountId))
        );
        
        @SuppressWarnings("unchecked")
        List<UserEntity> users = criteria.list(); 
        
        return users;
    }  
    
    @Override
    public List<UserEntity> getUsersForClient(Integer clientId) {  
        Session session = sessionFactory.getCurrentSession();
        Criteria criteria =  session.createCriteria(UserEntity.class);
        criteria.add(Restrictions.eq("clientId", clientId));
        
        @SuppressWarnings("unchecked")
        List<UserEntity> users = criteria.list(); 
        
        return users;
    }      
    @Override
    public UserEntity saveUser(UserEntity user) {  
    	Session session = sessionFactory.getCurrentSession();
    	session.saveOrUpdate(user);

        return getUser(user.getUsername());
    }

    
}
