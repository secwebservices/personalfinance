package com.secwebservices.dao;

import java.beans.BeanInfo;
import java.beans.PropertyDescriptor;
import java.io.Serializable;
import java.lang.reflect.InvocationTargetException;
import java.util.List;

import org.apache.commons.beanutils.BeanUtils;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.hibernate.Criteria;
import org.hibernate.SessionFactory;
import org.hibernate.criterion.Example;
import org.hibernate.criterion.Restrictions;

import com.secwebservices.exception.DAOException;


/**
 * Abstract class which implements core DAO functions
 * 
 * @author snoyes
 * 
 */
public abstract class HibernateDAO<T> implements CoreDAO<T>
{
    private static final Log logger = LogFactory.getLog(HibernateDAO.class);

    protected SessionFactory sessionFactory;

    /**
     * 
     */
    public HibernateDAO()
    {
        super();
    }

    @Override
    @SuppressWarnings("unchecked")
    public T clone(T entity) throws DAOException
    {
        Object clone;

        try
        {
            clone = entity.getClass().newInstance();
            BeanUtils.copyProperties(entity, clone);
        }
        catch (InstantiationException ie)
        {
            throw new DAOException(ie);
        }
        catch (IllegalAccessException ie)
        {
            throw new DAOException(ie);
        } catch (InvocationTargetException e) {
        	throw new DAOException(e);
		}
        return (T) clone;

    }

    @Override
    public void delete(T entity)
    {
        //HibernateDAO.logger.debug("deleting " + entity.getClass().getName() + " instance");

        this.sessionFactory.getCurrentSession().delete(entity);

    }

    @Override
    @SuppressWarnings("unchecked")
    public List<T> findByExample(Object instance)
    {
        return this.sessionFactory.getCurrentSession()
                .createCriteria(instance.getClass().getName()).add(Example.create(instance)).list();

    }

    @Override
    @SuppressWarnings("unchecked")
    public T findById(Class cls, Serializable id)
    {
        //HibernateDAO.logger.debug("getting " + cls.getName() + " instance with id: " + id);
        return (T) this.sessionFactory.getCurrentSession().get(cls, id);
    }

    @Override
    @SuppressWarnings("unchecked")
    public T findByKey(Class cls, String key)
    {
        if ("-".equals(key) || "".equals(key) || (null == key))
        {
            //HibernateDAO.logger.debug("Skipping findByKey for " + cls.getName() + ", code is not valid: " + key);
            return null;
        }

        Criteria criteria = this.sessionFactory.getCurrentSession().createCriteria(cls);
        criteria.add(Restrictions.eq("key", key));
        return (T) criteria.uniqueResult();

    }

    @SuppressWarnings("unchecked")
    protected void logCriteriaResult(List list)
    {
        BeanInfo info;
        PropertyDescriptor[] descriptors;

        try
        {
            for (Object o : list)
            {
                info = java.beans.Introspector.getBeanInfo(o.getClass());
                descriptors = info.getPropertyDescriptors();
                //HibernateDAO.logger.info("\nnew Object...");
                /*
                for (PropertyDescriptor descriptor : descriptors)
                {
                    HibernateDAO.logger.info("\t" + descriptor.getName() + " - " + descriptor.getValue(descriptor.getName()));
                }*/
            }
        }
        catch (Exception e)
        {
            HibernateDAO.logger.error(e);
        }
    }

    @Override
    @SuppressWarnings("unchecked")
    public T merge(T entity)
    {
        //HibernateDAO.logger.debug("merging " + entity.getClass().getName() + " instance");
        return (T) this.sessionFactory.getCurrentSession().merge(entity);
    }

    @Override
    public void persist(T entity)
    {
        if (entity == null)
        {
            throw new DAOException("Null transient instance");
        }

        //HibernateDAO.logger.debug("persisting instance of " + entity.getClass().getName());

        this.sessionFactory.getCurrentSession().persist(entity);
    }

    @Override
    public void refresh(T entity)
    {
        if (entity == null)
        {
            throw new DAOException("Null detached instance");
        }

        //HibernateDAO.logger.debug("refreshing instance of " + entity.getClass().getName());

        this.sessionFactory.getCurrentSession().refresh(entity);
    }

}
