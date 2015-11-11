package com.secwebservices.utilities;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.lang.reflect.Type;
import java.nio.charset.Charset;

import org.codehaus.jackson.map.type.TypeFactory;
import org.codehaus.jackson.type.JavaType;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.HttpOutputMessage;
import org.springframework.http.MediaType;
import org.springframework.http.converter.AbstractHttpMessageConverter;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.http.converter.HttpMessageNotWritableException;
import org.springframework.stereotype.Component;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonParseException;
import com.google.gson.reflect.TypeToken;
import com.secwebservices.utilities.jsonserializer.ExceptionTypeSerializer;


@Component
public class GsonHttpMessageConverter extends AbstractHttpMessageConverter<Object> {

    public static final Charset DEFAULT_CHARSET = Charset.forName("UTF-8");

    private GsonBuilder gsonBuilder = new GsonBuilder()
            .serializeNulls().setPrettyPrinting();
    
    public GsonHttpMessageConverter() {
        super(new MediaType("application", "json", DEFAULT_CHARSET));


        registerTypeAdapter(Exception.class, new ExceptionTypeSerializer());
          
    }
    
    @Override
    protected boolean supports(Class<?> clazz) {
        // should not be called, since we override canRead/Write instead
        throw new UnsupportedOperationException();
    }
 
    @Override
    public boolean canRead(Class<?> clazz, MediaType mediaType) {
        return MediaType.APPLICATION_JSON.isCompatibleWith(mediaType);
    }

    @Override
    public boolean canWrite(Class<?> clazz, MediaType mediaType) {
        return MediaType.APPLICATION_JSON.isCompatibleWith(mediaType);
    }
    
    public void registerTypeAdapter(Type type, Object serializer) {   
        LoggerFactory.getLogger(getClass()).debug("Adding registration for type :" +  type.toString() + " with :" + serializer.getClass().getName());
        gsonBuilder.registerTypeAdapter(type, serializer);
    }

    @Override
    protected Object readInternal(Class<? extends Object> clazz, HttpInputMessage inputMessage) throws IOException, HttpMessageNotReadableException {
        StringBuilder sb = new StringBuilder();
        try {
            Gson gson = gsonBuilder.create();
            BufferedReader br = null;
            String line;
            try {
                
                br = new BufferedReader(new InputStreamReader(inputMessage.getBody()));
                while ((line = br.readLine()) != null) {
                    sb.append(line);
                }
     
            } catch (IOException e) {
                e.printStackTrace();
            } finally {
                if (br != null) {
                    try {
                        br.close();
                    } catch (IOException e) {
                        LoggerFactory.getLogger(getClass()).error(e.getMessage(), e);
                    }
                }
            }
          
            LoggerFactory.getLogger(getClass()).debug("\nTo Class : " + clazz.getName() +
                    "\nJSON : " + sb.toString());
            
            Object converted = gson.fromJson(sb.toString(), clazz);
            return converted;   
        } catch (JsonParseException e) {
            LoggerFactory.getLogger(getClass()).error("\nCould not convert from JSON: " + sb.toString() + "\n" + e.getMessage(), e);
            throw new HttpMessageNotReadableException(e.getMessage(), e);
        }
    }

    @Override
    protected void writeInternal(Object genericClass, HttpOutputMessage outputMessage) throws IOException, HttpMessageNotWritableException {
        Type genericType = TypeToken.get(genericClass.getClass()).getType();

        BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(outputMessage.getBody(), DEFAULT_CHARSET));
        try {
            Gson gson = gsonBuilder.create();
           
            String json = gson.toJson(genericClass, genericType);
            
            LoggerFactory.getLogger(getClass()).debug("\nFrom Class : " + genericClass.getClass().getName() +
                    "\nJSON : " + json.toString());            
            
            writer.append(json);
        }catch(Exception e){
            LoggerFactory.getLogger(getClass()).error("\nCould not convert from Class : " + genericClass.getClass().getName() + "\n" + e.getMessage(), e);
            throw new HttpMessageNotWritableException(e.getMessage(), e);
        } finally {
            writer.flush();
            writer.close();
        }
    }
    
    protected JavaType getJavaType(Class<?> clazz) {
        return TypeFactory.defaultInstance().constructType(clazz);
    }
}