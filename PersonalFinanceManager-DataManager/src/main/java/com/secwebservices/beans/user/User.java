package com.secwebservices.beans.user;

import java.lang.reflect.InvocationTargetException;
import java.text.ParseException;
import java.util.ArrayList;
import java.util.List;

import com.aranya.kaya.common.beans.Email;
import com.secwebservices.beans.role.Role;
import com.secwebservices.entities.role.RoleEntity;
import com.secwebservices.entities.user.UserEntity;


public class User {

	private Integer id;
	private String username;
	private String password;
	private Email email;

	private Boolean enabled;
	private Boolean accountNonExpired;
	private Boolean credentialsNonExpired;
	private Boolean accountNonLocked;
	
	private Integer accountId;
	private Integer clientId;
	
	private Boolean admin;

	private List<Role> roles;
		
	public User(UserEntity userEntity) throws IllegalAccessException, InvocationTargetException, ParseException{
	    
	    setId(userEntity.getId());
	    setUsername(userEntity.getUsername());
	    setPassword(userEntity.getPassword());
	    setEmail(userEntity.getEmail());
        setEnabled(userEntity.isEnabled());
        setAccountNonLocked(userEntity.isAccountNonLocked());
        setAccountNonExpired(userEntity.isAccountNonExpired());
        setCredentialsNonExpired(userEntity.isCredentialsNonExpired());

        setAccountId((userEntity.getAccountId() == null) ? null : userEntity.getAccountId());
        setClientId((userEntity.getClientId() == null) ? null : userEntity.getClientId());
        
        for(RoleEntity roleEntity : userEntity.getRoles()){
            Role role = new Role(roleEntity);
            addRole(role);
            if(roleEntity.getCode().equalsIgnoreCase("ROLE_ADMIN")){
                setAdmin(true);                        
            }
        }
	}

	public Integer getId() {
		return id;
	}

	public void setId(Integer id) {
		this.id = id;
	}

	public String getUsername() {
		return username;
	}

	public void setUsername(String username) {
		this.username = username;
	}

	public String getPassword() {
		return password;
	}

	public void setPassword(String password) {
		this.password = password;
	}

	public String getEmail() {
		return email.toString();
	}

	public void setEmail(String email) throws ParseException {
	    this.email = new Email(email);
	}
    public void setEmail(Email email) {
        this.email = email;
    }
	
	public Boolean getEnabled() {
		return enabled;
	}

	public void setEnabled(Boolean enabled) {
		this.enabled = enabled;
	}

	public Boolean getAccountNonExpired() {
		return accountNonExpired;
	}

	public void setAccountNonExpired(Boolean accountNonExpired) {
		this.accountNonExpired = accountNonExpired;
	}

	public Boolean getCredentialsNonExpired() {
		return credentialsNonExpired;
	}

	public void setCredentialsNonExpired(Boolean credentialsNonExpired) {
		this.credentialsNonExpired = credentialsNonExpired;
	}

	public Boolean getAccountNonLocked() {
		return accountNonLocked;
	}

	public void setAccountNonLocked(Boolean accountNonLocked) {
		this.accountNonLocked = accountNonLocked;
	}

	public Integer getAccountId() {
        return accountId;
    }

    public void setAccountId(Integer accountId) {
        this.accountId = accountId;
    }

    public Integer getClientId() {
        return clientId;
    }

    public void setClientId(Integer clientId) {
        this.clientId = clientId;
    }

    public Boolean getAdmin() {
        return admin;
    }

    public void setAdmin(Boolean admin) {
        this.admin = admin;
    }

    public List<Role> getRoles() {
        return roles;
    }

    public void addRole(Role role){
        if(roles == null){
            roles = new ArrayList<Role>();
        }
        roles.add(role);
    }
    
    public void setRoles(List<Role> roles) {
        this.roles = roles;
    }
    
}
