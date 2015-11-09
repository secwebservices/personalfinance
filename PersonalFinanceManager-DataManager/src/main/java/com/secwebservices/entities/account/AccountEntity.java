package com.secwebservices.entities.account;

import java.util.Date;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Table;

@Entity
@Table(name="account")
public class AccountEntity {
	
	@Id
	@GeneratedValue
	@Column(name = "account_id")
	private Integer accountId;

    @Column(name = "account_name", length = 128)
    private String accountName;
	
    @Column(name = "email", length = 128)
	private String email;

    @Column(name = "enabled")
    private Boolean enabled;

    @Column(name = "subdomain", length = 128)
    private String subdomain;
    
    @Column(name = "create_dt")
    private Date createDate;

    @Column(name = "modify_dt")
    private Date modifyDate;

    public Integer getId() {
        return accountId;
    }

    public void setId(Integer accountId) {
        this.accountId = accountId;
    }

    public String getAccountName() {
        return accountName;
    }

    public void setAccountName(String accountName) {
        this.accountName = accountName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
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
}
