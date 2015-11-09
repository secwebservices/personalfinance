package com.secwebservices.entities.user;

import java.util.Date;
import java.util.Set;

import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.JoinTable;
import javax.persistence.ManyToMany;
import javax.persistence.ManyToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;

import com.secwebservices.entities.account.AccountEntity;
import com.secwebservices.entities.role.RoleEntity;

@Entity
@Table(name = "user", schema="public")
public class UserEntity {

    @Id
    @Column(name = "user_id")
    @GeneratedValue(generator = "user_user_id_seq",  strategy = GenerationType.SEQUENCE)
    @SequenceGenerator(name = "user_user_id_seq", sequenceName = "user_user_id_seq", schema = "public")
    private Integer userId;

    @Column(name = "username", length = 128)
    private String username;

    @Column(name = "password", length = 128)
    private String password;

    @Column(name = "email", length = 255)
    private String email;

    @Column(name = "create_dt")
    private Date createdDate;

    @Column(name = "modify_dt")
    private Date modifyDate;

    @Column(name = "enabled", nullable = false)
    private Boolean enabled;

    @Column(name = "account_non_expired", nullable = false)
    private Boolean accountNonExpired;

    @Column(name = "credentials_non_expired", nullable = false)
    private Boolean credentialsNonExpired;

    @Column(name = "account_non_locked", nullable = false)
    private Boolean accountNonLocked;

    @Column(name = "pw_reset_key", length = 128, nullable = true)
    private String pwResetKey;

    @Column(name = "pw_reset_timer", nullable = true)
    private Integer pwResetTimer;

    @ManyToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "account_id")
    private AccountEntity account;

    @Column(name = "client_id", nullable = true)
    private Integer clientId;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "user_role", joinColumns = @JoinColumn(name = "user_id"), inverseJoinColumns = @JoinColumn(name = "role_id"))
    private Set<RoleEntity> roles;

    public Integer getId() {
        return userId;
    }

    public void setId(Integer userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Date getCreatedDate() {
        return createdDate;
    }

    public void setCreatedDate(Date createdDate) {
        this.createdDate = createdDate;
    }

    public Date getModifyDate() {
        return modifyDate;
    }

    public void setModifyDate(Date modifyDate) {
        this.modifyDate = modifyDate;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public Boolean isAccountNonExpired() {
        return accountNonExpired;
    }

    public void setAccountNonExpired(Boolean accountNonExpired) {
        this.accountNonExpired = accountNonExpired;
    }

    public Boolean isCredentialsNonExpired() {
        return credentialsNonExpired;
    }

    public void setCredentialsNonExpired(Boolean credentialsNonExpired) {
        this.credentialsNonExpired = credentialsNonExpired;
    }

    public Boolean isAccountNonLocked() {
        return accountNonLocked;
    }

    public void setAccountNonLocked(Boolean accountNonLocked) {
        this.accountNonLocked = accountNonLocked;
    }

    public String getPwResetKey() {
        return pwResetKey;
    }

    public void setPwResetKey(String pwResetKey) {
        this.pwResetKey = pwResetKey;
    }

    public Integer getPwResetTimer() {
        return pwResetTimer;
    }

    public void setPwResetTimer(Integer timer) {
        this.pwResetTimer = timer;
    }

    public AccountEntity getAccount() {
        return account;
    }

    public void setAccount(AccountEntity account) {
        this.account = account;
    }

    public Integer getAccountId() {
        if(getAccount() != null){
            return account.getId();    
        }else{
            return null;
        }
        
    }

    public Integer getClientId() {
        return clientId;
    }

    public void setClientId(Integer clientId) {
        this.clientId = clientId;
    }

    public Set<RoleEntity> getRoles() {
        return roles;
    }

    public void setRoles(Set<RoleEntity> roles) {
        this.roles = roles;
    }
}
