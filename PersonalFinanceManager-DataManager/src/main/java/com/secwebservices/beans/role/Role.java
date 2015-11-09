package com.secwebservices.beans.role;

import java.lang.reflect.InvocationTargetException;

import com.aranya.kaya.common.beans.DayAndTime;
import com.secwebservices.entities.role.RoleEntity;

public class Role {
	
	private Integer id;
    private String code;
	private String name;
	
    private DayAndTime createDate;
    private DayAndTime modifyDate;
    
    public Role(RoleEntity roleEntity) throws IllegalAccessException, InvocationTargetException{
        
        setId(roleEntity.getId());
        setCode(roleEntity.getCode());
        setName(roleEntity.getName());

        setCreateDate(roleEntity.getCreateDate() != null ? new DayAndTime(roleEntity.getCreateDate()) : new DayAndTime());
        setModifyDate(roleEntity.getModifyDate() != null ? new DayAndTime(roleEntity.getModifyDate()) : new DayAndTime());
    }
    
	public Integer getId() {
		return id;
	}

	public void setId(Integer id) {
		this.id = id;
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

    public DayAndTime getCreateDate() {
        return createDate;
    }

    public void setCreateDate(DayAndTime createDate) {
        this.createDate = createDate;
    }

    public DayAndTime getModifyDate() {
        return modifyDate;
    }

    public void setModifyDate(DayAndTime modifyDate) {
        this.modifyDate = modifyDate;
    }
    
}
