package com.secwebservices.entities.role;

import java.util.Date;
import java.util.HashSet;
import java.util.Set;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.ManyToMany;
import javax.persistence.Table;

import com.secwebservices.entities.user.UserEntity;

@Entity
@Table(name="role")
public class RoleEntity {
	
	@Id
	@GeneratedValue
	@Column(name = "role_id")
	private Integer roleId;

    @Column(name = "code", length = 64)
    private String code;
	
    @Column(name = "name", length = 128)
	private String name;
    
    @Column(name = "create_dt")
    private Date createDate;

    @Column(name = "modify_dt")
    private Date modifyDate;
    
    @ManyToMany(fetch = FetchType.LAZY, mappedBy = "roles")
    private Set<UserEntity> users = new HashSet<UserEntity>();
    

	public Integer getId() {
		return roleId;
	}

	public void setId(Integer roleId) {
		this.roleId = roleId;
	}

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Date getCreateDate() {
        return createDate;
    }

    public void setCreateDate(Date createDate) {
        this.createDate = createDate;
    }

    public Date getModifyDate() {
        return modifyDate;
    }

    public void setModifyDate(Date modifyDate) {
        this.modifyDate = modifyDate;
    }

    public Set<UserEntity> getUsers() {
        return users;
    }

    public void setUsers(Set<UserEntity> users) {
        this.users = users;
    }
	
}
