package com.secwebservices.dao.role;

import java.util.List;

import com.secwebservices.dao.CoreDAO;
import com.secwebservices.entities.role.RoleEntity;

public interface RoleDAO extends CoreDAO<RoleEntity> 
{
	public RoleEntity getRole(Integer id); 

	public RoleEntity getRole(String code); 
	
	public List<RoleEntity> getRoles();
}
