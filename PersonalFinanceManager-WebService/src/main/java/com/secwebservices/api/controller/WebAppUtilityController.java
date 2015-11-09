package com.secwebservices.api.controller;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import javax.servlet.ServletContext;
import javax.servlet.http.HttpServletRequest;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
@RequestMapping(produces = "application/json")
public class WebAppUtilityController {
	protected Logger logger = LoggerFactory.getLogger(getClass());
	
	@Autowired
	private ServletContext servletContext;
	
	public Logger getLogger() {
		return logger;
	}

	public ServletContext getServletContext() {
		return servletContext;
	}

	public void setServletContext(ServletContext servletContext) {
		this.servletContext = servletContext;
	}

	@RequestMapping(value = "/utilities/gethtmltemplates/{mediaFolder}", method = RequestMethod.GET)
	@ResponseBody
	public List<String> getHtmlTemplates(@PathVariable("mediaFolder") String mediaFolder, HttpServletRequest request) {
				
		List<String> mediaPaths = new ArrayList<String>();
		
		try {
			if(mediaFolder.indexOf("_") > 0){
				mediaFolder = mediaFolder.replaceAll("_", "/");
			}
		
			
			Set<String> paths = getServletContext().getResourcePaths("/html/"+mediaFolder+"/");
			
			if(paths != null){
				mediaPaths = processPaths(paths);
			}
			
		} catch (Exception e) {
			getLogger().error(e.getMessage(), e);
		} 

		
		return mediaPaths;
	}
	
	private List<String> processPaths(Set<String> paths){
		List<String> mediaPaths = new ArrayList<String>();
		
		for(String path : paths){
			getLogger().info(path);
			if(!path.contains("index.htm") && !path.endsWith("/")){
				mediaPaths.add(path);						
			}else if(path.endsWith("/")){
				mediaPaths.addAll(processPaths(getServletContext().getResourcePaths(path)));
			}
		}
		
		return mediaPaths;
	}
}
