package com.secwebservices.dao;

import java.io.Serializable;
import java.util.List;

/**
 * Interface which defines the core (unchecked) functionality of the persistence
 * implementation
 * 
 * @author Robert Suppenbach
 * 
 */
public interface CoreDAO<T>
{

    public T clone(T entity);

    public void delete(T entity);

    public List<T> findByExample(Object instance);

    public T findById(Class cls, Serializable id);

    public T findByKey(Class cls, String code);

    public T merge(T entity);

    public void persist(T entity);

    public void refresh(T entity);

}
