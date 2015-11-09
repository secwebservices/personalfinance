package com.secwebservices.serverservice.service;

import java.lang.reflect.InvocationTargetException;
import java.text.ParseException;
import java.util.List;

import com.secwebservices.beans.user.User;
import com.secwebservices.entities.user.UserEntity;

/**
 * 
 * @author robertsuppenbach
 *
 */
public interface UserService {

	public User getUser(Integer userId) throws IllegalAccessException, InvocationTargetException, ParseException;
	
	public User getUser(String email) throws IllegalAccessException, InvocationTargetException, ParseException;
	
	public List<User> getUsers() throws IllegalAccessException, InvocationTargetException, ParseException;

	public List<User> getUsersForAccount(Integer accountId) throws IllegalAccessException, InvocationTargetException, ParseException;
	
    public List<User> getUsersForClient(Integer clientId) throws IllegalAccessException, InvocationTargetException, ParseException;
	
	public User saveUser(UserEntity user) throws IllegalAccessException, InvocationTargetException, ParseException;
	
}
