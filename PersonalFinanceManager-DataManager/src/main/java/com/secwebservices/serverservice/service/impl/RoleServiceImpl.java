package com.secwebservices.serverservice.service.impl;

import java.lang.reflect.InvocationTargetException;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.secwebservices.beans.role.Role;
import com.secwebservices.dao.role.RoleDAO;
import com.secwebservices.entities.role.RoleEntity;
import com.secwebservices.serverservice.service.RoleService;



/**
 * 
 * @author robertsuppenbach
 *
 */
@Transactional
@Service("roleService")
public class RoleServiceImpl implements RoleService {

    @Autowired
    private RoleDAO roleDAO;

    @Override
    public Role getRole(Integer id) throws IllegalAccessException, InvocationTargetException {
        return new Role(roleDAO.getRole(id));
    }

    @Override
    public Role getRole(String code) throws IllegalAccessException, InvocationTargetException {
        return new Role(roleDAO.getRole(code));
    }

    @Override
    public List<Role> getRoles() throws IllegalAccessException, InvocationTargetException {
        List<Role> roles = new ArrayList<Role>();
        
        for(RoleEntity roleEntity : roleDAO.getRoles()){
            roles.add(new Role(roleEntity));
        }
        
        return roles;  
    }
}
