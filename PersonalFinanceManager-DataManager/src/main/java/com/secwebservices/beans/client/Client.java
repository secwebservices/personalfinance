package com.secwebservices.beans.client;

import java.text.ParseException;

import org.slf4j.LoggerFactory;

import com.aranya.kaya.common.beans.Day;
import com.aranya.kaya.common.beans.DayAndTime;
import com.aranya.kaya.common.beans.Email;
import com.aranya.kaya.common.beans.PhoneNumber;
import com.secwebservices.entities.client.ClientEntity;

public class Client {
	
	private Integer id;

    private String clientName;
	private Email email;    
    private PhoneNumber phone;
    
    private Integer accountId;

    private Day startDay;

    private Day endDay;

    private DayAndTime createDate;

    private DayAndTime modifyDate;

    public Client(){};
    
    public Client(ClientEntity clientEntity){    
        
        setId(clientEntity.getId());
        setClientName(clientEntity.getClientName());
        
        try {
            setEmail(new Email(clientEntity.getEmail()));
        } catch (ParseException e) {
            LoggerFactory.getLogger(getClass()).error(e.getMessage(), e);
        }
        try {
            setPhone(new PhoneNumber(clientEntity.getPhone()));
        } catch (ParseException e) {
            LoggerFactory.getLogger(getClass()).error(e.getMessage(), e);
        }
        setAccountId(clientEntity.getAccountId());
        setStartDay(new Day(clientEntity.getStartDay()));
        setEndDay(clientEntity.getEndDay() == null ? null : new Day(clientEntity.getEndDay()));
        
        setCreateDate(clientEntity.getCreateDate() != null ? new DayAndTime(clientEntity.getCreateDate()) : new DayAndTime());
        setModifyDate(new DayAndTime(clientEntity.getModifyDate()));
    }
    
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getClientName() {
        return clientName;
    }

    public void setClientName(String clientName) {
        this.clientName = clientName;
    }

    public Email getEmail() {
        return email;
    }
    
    public void setEmail(Email email) {
        this.email = email;
    }

    public PhoneNumber getPhone() {
        return phone;
    }

    public void setPhone(PhoneNumber phone) {
        this.phone = phone;
    }

    public Integer getAccountId() {
        return accountId;
    }

    public void setAccountId(Integer accountId) {
        this.accountId = accountId;
    }

    public Day getStartDay() {
        return startDay;
    }
    
    public void setStartDay(Day startDay) {
        this.startDay = startDay;
    }
    
    public Day getEndDay() {
        return endDay;
    }
    
    public void setEndDay(Day endDay) {
        this.endDay = endDay;
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
