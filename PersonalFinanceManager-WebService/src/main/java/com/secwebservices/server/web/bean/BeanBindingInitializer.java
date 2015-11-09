package com.secwebservices.server.web.bean;

import org.slf4j.LoggerFactory;
import org.springframework.web.bind.WebDataBinder;
import org.springframework.web.bind.support.WebBindingInitializer;
import org.springframework.web.context.request.WebRequest;

import com.secwebservices.common.beans.editor.StringConstructorEditor;

public class BeanBindingInitializer implements WebBindingInitializer {
	
	public BeanBindingInitializer() {
		LoggerFactory.getLogger(getClass()).debug("Initializer Started");
	}
	
	public void initBinder(WebDataBinder binder, WebRequest request) {

		binder.registerCustomEditor(Short.class, new StringConstructorEditor(Short.class));
		binder.registerCustomEditor(Integer.class, new StringConstructorEditor(Integer.class));
		binder.registerCustomEditor(Long.class, new StringConstructorEditor(Long.class));
		binder.registerCustomEditor(Float.class, new StringConstructorEditor(Float.class));
		binder.registerCustomEditor(Double.class, new StringConstructorEditor(Double.class));
		binder.registerCustomEditor(Boolean.class, new StringConstructorEditor(Boolean.class));
	}
}


