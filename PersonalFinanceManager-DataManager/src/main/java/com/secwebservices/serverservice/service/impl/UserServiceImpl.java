package com.secwebservices.serverservice.service.impl;

import java.lang.reflect.InvocationTargetException;
import java.text.ParseException;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.secwebservices.beans.user.User;
import com.secwebservices.dao.user.UserDAO;
import com.secwebservices.entities.user.UserEntity;
import com.secwebservices.serverservice.service.UserService;


/**
 * 
 * @author robertsuppenbach
 *
 */
@Transactional
@Service("userService")
public class UserServiceImpl implements UserService {

    @Autowired  
    private UserDAO userDAO;  
    
    @Autowired
    private PasswordEncoder passwordEncoder;
  
    @Override
    public User getUser(String username) throws IllegalAccessException, InvocationTargetException, ParseException {  
        User user = new User(userDAO.getUser(username));  
        return user;
    }  
    
    public User getUserByEmail(String email) throws IllegalAccessException, InvocationTargetException, ParseException {  
        User user = new User(userDAO.getUserByEmail(email));  
        return user;
    }  
    
    public User getUserByPwResetKey(String key) throws IllegalAccessException, InvocationTargetException, ParseException {  
        User user = new User(userDAO.getUserByPwResetKey(key));  
        return user;
    }  
    
    @Override
    public User getUser(Integer userId) throws IllegalAccessException, InvocationTargetException, ParseException {  
        User user = new User(userDAO.getUser(userId));  
        return user;
    }      
    
    @Override
    public List<User> getUsers() throws IllegalAccessException, InvocationTargetException, ParseException { 
        List<User> users = new ArrayList<User>();
        
        for(UserEntity accountEntity : userDAO.getUsers()){
            users.add(new User(accountEntity));
        }
        
        return users;  
    } 
    
    @Override
    public List<User> getUsersForAccount(Integer accountId) throws IllegalAccessException, InvocationTargetException, ParseException { 
        List<User> users = new ArrayList<User>();
        
        for(UserEntity accountEntity : userDAO.getUsers()){
            users.add(new User(accountEntity));
        }
        
        return users;  
    } 
    
    @Override
    public List<User> getUsersForClient(Integer clientId) throws IllegalAccessException, InvocationTargetException, ParseException { 
        List<User> users = new ArrayList<User>();
        
        for(UserEntity accountEntity : userDAO.getUsers()){
            users.add(new User(accountEntity));
        }
        
        return users;  
    } 
        
    @Override
    public User saveUser(UserEntity user) throws IllegalAccessException, InvocationTargetException, ParseException{
        return new User(userDAO.saveUser(user));
    }

}
