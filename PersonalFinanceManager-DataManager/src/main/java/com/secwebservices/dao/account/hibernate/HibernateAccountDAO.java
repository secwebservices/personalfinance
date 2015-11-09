package com.secwebservices.dao.account.hibernate;

import java.util.List;

import org.hibernate.Criteria;
import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.hibernate.criterion.Restrictions;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.secwebservices.beans.account.Account;
import com.secwebservices.dao.HibernateDAO;
import com.secwebservices.dao.account.AccountDAO;
import com.secwebservices.entities.account.AccountEntity;



@Repository("accountDAO")
public class HibernateAccountDAO extends HibernateDAO<AccountEntity> implements AccountDAO {

	 /**
     * 
     */
    public HibernateAccountDAO()
    {
        super();
    }

    @Autowired
    public HibernateAccountDAO(SessionFactory sessionFactory)
    {
        this.sessionFactory = sessionFactory;
    }
    
	@Autowired  
    private SessionFactory sessionFactory;  
      
    private Session getCurrentSession() {  
        return sessionFactory.getCurrentSession();  
    }  
  
    @Override
    public AccountEntity getAccount(Integer id) {  
        AccountEntity account = (AccountEntity) getCurrentSession().load(AccountEntity.class, id);  
        return account;  
    }     
    
    @Override
    public AccountEntity getAccount(String subdomain) {  
        Session session = getCurrentSession();
        Criteria criteria =  session.createCriteria(AccountEntity.class);
        criteria.add(Restrictions.eq("subdomain", subdomain));
        
        AccountEntity account = (AccountEntity) criteria.uniqueResult();  
        return account;  
    }  
    
    
    @Override
    public List<AccountEntity> getAccounts() {
    	Session session = getCurrentSession();
        Criteria criteria =  session.createCriteria(AccountEntity.class);
        	
        @SuppressWarnings("unchecked")
        List<AccountEntity> accounts = criteria.list(); 
            
        return accounts;
    }
    
    @Override
    public Account saveAccount(AccountEntity accountEntity) {
        
        Session session = sessionFactory.getCurrentSession();
        session.saveOrUpdate(accountEntity);
        
        return new Account(accountEntity);
    }    
}
