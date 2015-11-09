package com.secwebservices.beans.account;

import java.text.ParseException;

import org.slf4j.LoggerFactory;

import com.aranya.kaya.common.beans.DayAndTime;
import com.aranya.kaya.common.beans.Email;
import com.secwebservices.entities.account.AccountEntity;

public class Account {
	
	private Integer id;

    private String accountName;
	private Email email;

    private Boolean enabled;
    private String subdomain;
    
    private DayAndTime createDate;
    private DayAndTime modifyDate;

    public Account(){
        
    };
    
    public Account(AccountEntity accountEntity) {    
        
        setId(accountEntity.getId());
        setAccountName(accountEntity.getAccountName());
        try {
            setEmail(new Email(accountEntity.getEmail()));
        } catch (ParseException e) {
            LoggerFactory.getLogger(getClass()).error(e.getMessage(), e);
        }
        
        setSubdomain(accountEntity.getSubdomain());

        setCreateDate(accountEntity.getCreateDate() != null ? new DayAndTime(accountEntity.getCreateDate()) : new DayAndTime());
        setModifyDate(accountEntity.getModifyDate() != null ? new DayAndTime(accountEntity.getModifyDate()) : new DayAndTime());
    }
    
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getAccountName() {
        return accountName;
    }

    public void setAccountName(String accountName) {
        this.accountName = accountName;
    }

    public Email getEmail() {
        return email;
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

    public String getSubdomain() {
        return subdomain;
    }

    public void setSubdomain(String subdomain) {
        this.subdomain = subdomain;
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
