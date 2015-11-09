package com.secwebservices.serverservice.service;

import java.lang.reflect.InvocationTargetException;
import java.util.List;

import com.secwebservices.beans.role.Role;

/**
 * 
 * @author robertsuppenbach
 *
 */
public interface RoleService {
	public Role getRole(Integer id) throws IllegalAccessException, InvocationTargetException; 

	public Role getRole(String code) throws IllegalAccessException, InvocationTargetException;
	
	public List<Role> getRoles() throws IllegalAccessException, InvocationTargetException; 
	

}
