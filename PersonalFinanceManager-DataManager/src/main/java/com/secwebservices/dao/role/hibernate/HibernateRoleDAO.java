package com.secwebservices.dao.role.hibernate;

import java.util.List;

import org.hibernate.Criteria;
import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.hibernate.criterion.Restrictions;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.secwebservices.dao.HibernateDAO;
import com.secwebservices.dao.role.RoleDAO;
import com.secwebservices.entities.role.RoleEntity;

@Repository("roleDAO")
public class HibernateRoleDAO extends HibernateDAO<RoleEntity> implements RoleDAO {

	 /**
     * 
     */
    public HibernateRoleDAO()
    {
        super();
    }

    @Autowired
    public HibernateRoleDAO(SessionFactory sessionFactory)
    {
        this.sessionFactory = sessionFactory;
    }
    
	@Autowired  
    private SessionFactory sessionFactory;  
      
    private Session getCurrentSession() {  
        return sessionFactory.getCurrentSession();  
    }  
  
    @Override
    public RoleEntity getRole(Integer id) {  
        RoleEntity role = (RoleEntity) getCurrentSession().load(RoleEntity.class, id);  
        return role;  
    }  
    
    @Override
    public RoleEntity getRole(String code) {  
   	
        Criteria criteria =  getCurrentSession().createCriteria(RoleEntity.class);
    	criteria.add(Restrictions.eq("code", code));
    	
        RoleEntity role = (RoleEntity) criteria.uniqueResult();
        return role;  
    }      
    
    @Override
    public List<RoleEntity> getRoles() {
    	Session session = sessionFactory.getCurrentSession();
        Criteria criteria =  session.createCriteria(RoleEntity.class);
        	
        @SuppressWarnings("unchecked")
        List<RoleEntity> roles = criteria.list(); 
            
        return roles;
    }
}
