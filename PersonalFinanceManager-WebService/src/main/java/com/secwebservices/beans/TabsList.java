package com.secwebservices.beans;

import java.util.ArrayList;
import java.util.List;


public class TabsList {

    private List<TabData> tabs;

    public List<TabData> getTabs() {
        return tabs;
    }

    public void setTabs(List<TabData> tabs) {
        this.tabs = tabs;
    }
    
    public void addTab(TabData tab){
        if(this.tabs == null){
            tabs = new ArrayList<TabData>();
        }
        tabs.add(tab);
    }
    
}
