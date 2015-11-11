package com.secwebservices.utilities.jsonserializer;

import java.lang.reflect.Type;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonSerializationContext;
import com.google.gson.JsonSerializer;


public class ExceptionTypeSerializer implements JsonSerializer<Object> {
    
	public JsonElement serialize(Object src, Type typeOfSrc, JsonSerializationContext context) {
		Exception exception = (Exception) src;
	
    	JsonObject jsonObject = new JsonObject();
		
    	if (exception != null) {
    		if(exception.getMessage().length() > 150){
        		jsonObject.addProperty("message", exception.getMessage().substring(0, 150));
    		}else{
        		jsonObject.addProperty("message", exception.getMessage());    			
    		}

    	}
    	
    	return jsonObject;
    }
    
}


