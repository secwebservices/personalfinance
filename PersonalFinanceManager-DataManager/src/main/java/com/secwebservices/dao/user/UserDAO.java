package com.secwebservices.dao.user;

import java.util.List;

import com.secwebservices.dao.CoreDAO;
import com.secwebservices.entities.user.UserEntity;

public interface UserDAO extends CoreDAO<UserEntity> 
{

    public UserEntity getUser(Integer userId);  
    
    public UserEntity getUser(String username);  
    
	public UserEntity getUserByEmail(String email);
	
	public UserEntity getUserByPwResetKey(String key);
	
	public List<UserEntity> getUsers();

	public List<UserEntity> getUsersForAccount(Integer accountId);

    public List<UserEntity> getUsersForClient(Integer clientId);
    
	public UserEntity saveUser(UserEntity user);
}
