package com.secwebservices.filter;

import java.io.IOException;
import java.util.HashSet;
import java.util.Properties;
import java.util.Set;
import java.util.StringTokenizer;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.hibernate.SessionFactory;
import org.hibernate.classic.Session;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.context.support.WebApplicationContextUtils;

import com.secwebservices.beans.user.User;

/**
 * 
 * @author robertsuppenbach
 *
 */
public class UserFilter implements Filter{

    private FilterConfig filterConfig = null;
    private Properties properties = null;
    
    private WebApplicationContext springContext;
    
    private User user;
    
    private Set<String> securedResources;
    
    String subdomain; 
    
    @Autowired  
    private SessionFactory sessionFactory;  
      
    public SessionFactory getSessionFactory() {
        return sessionFactory;
    }

    public void setSessionFactory(SessionFactory sessionFactory) {
        this.sessionFactory = sessionFactory;
    }

    private Session getCurrentSession() {  
        return sessionFactory.getCurrentSession();  
    }  
    
    /**
     * init
     * @param filterConfig
     * @throws ServletException
     */
    @Override
    public void init(FilterConfig filterConfig) throws ServletException
    {
        this.filterConfig = filterConfig;
        springContext =  WebApplicationContextUtils.getWebApplicationContext(
                filterConfig.getServletContext());

        properties = new Properties();
        try {
            properties.load(springContext.getClassLoader().getResourceAsStream("config.properties"));
        } catch (IOException e) {
            LoggerFactory.getLogger(getClass()).error(e.getMessage(), e);
        }
        
        securedResources = new HashSet<String>();
        StringTokenizer tok = new StringTokenizer(filterConfig.getInitParameter("securedResources"), ",");
        while (tok.hasMoreTokens()) {
            securedResources.add(tok.nextToken().trim());
        }
    }

    @Override
    public void destroy()
    {
        filterConfig = null;
    }

    /**
     * doFilter
     * @param request
     * @param response
     * @param chain
     * @throws IOException
     * @throws ServletException
     * 
     * Adds information about the currently logged in user to the HttpSession
     */
    @Override
    public void doFilter(
            ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException
    {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        String requestURI = httpRequest.getRequestURI();
        
        if (!isResourceSecured(httpRequest, requestURI)) {
            chain.doFilter(request, response);
            return;
        }

        User user = (User) httpRequest.getSession().getAttribute("user");

        if (user == null) {             
            HttpServletResponse httpResponse = (HttpServletResponse) response;
            httpResponse.sendError(401, "User Session not found");
            return;
        }           

        chain.doFilter(request, response);
 
    }
    
    protected boolean isResourceSecured(HttpServletRequest request, String requestURI) {
        Boolean isSecured = false;
        for (String pattern : securedResources) {
            if (requestURI.matches(pattern)) {
                isSecured = true;
            }
        }
        return isSecured;
    }
}

