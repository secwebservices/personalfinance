package com.secwebservices.beans.client;

import com.aranya.kaya.common.beans.Day;
import com.aranya.kaya.common.beans.DayAndTime;
import com.aranya.kaya.common.beans.Email;
import com.aranya.kaya.common.beans.PhoneNumber;

public class ClientRequest {
	
    private Integer id;

    private String clientName;
    private Email email;    
    private PhoneNumber phone;
    
    private Integer accountId;

    private Day startDay;

    private Day endDay;

    private DayAndTime createDate;

    private DayAndTime modifyDate;

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
