package com.secwebservices.entities.client;

import java.util.Date;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;

@Entity
@Table(name="client", schema = "public")
public class ClientEntity {
	
	@Id
    @GeneratedValue(generator = "client_client_id_seq",  strategy = GenerationType.SEQUENCE)
    @SequenceGenerator(name = "client_client_id_seq", sequenceName = "client_client_id_seq", schema = "public")
	@Column(name = "client_id")
	private Integer clientId;

    @Column(name = "client_name", length = 128)
    private String clientName;
	
    @Column(name = "client_email", length = 128)
	private String email;

    @Column(name = "client_phone", length = 16)
    private String phone;

    @Column(name = "account_id")
    private Integer accountId;
    
    @Column(name = "start_day")
    private Date startDay;

    @Column(name = "end_day")
    private Date endDay;
    
    @Column(name = "create_dt")
    private Date createDate;

    @Column(name = "modify_dt")
    private Date modifyDate;

    public Integer getId() {
        return clientId;
    }

    public void setId(Integer clientId) {
        this.clientId = clientId;
    }

    public String getClientName() {
        return clientName;
    }

    public void setClientName(String clientName) {
        this.clientName = clientName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public Integer getAccountId() {
        return accountId;
    }

    public void setAccountId(Integer accountId) {
        this.accountId = accountId;
    }

    public Date getStartDay() {
        return startDay;
    }

    public void setStartDay(Date startDay) {
        this.startDay = startDay;
    }

    public Date getEndDay() {
        return endDay;
    }

    public void setEndDay(Date endDay) {
        this.endDay = endDay;
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
