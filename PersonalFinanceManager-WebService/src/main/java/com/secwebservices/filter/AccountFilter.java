package com.secwebservices.filter;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringReader;
import java.io.StringWriter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpServletResponseWrapper;

import org.apache.velocity.VelocityContext;
import org.apache.velocity.app.VelocityEngine;
import org.apache.velocity.context.Context;
import org.apache.velocity.runtime.RuntimeConstants;
import org.hibernate.SessionFactory;
import org.hibernate.classic.Session;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.context.support.WebApplicationContextUtils;

import com.secwebservices.beans.account.Account;
import com.secwebservices.dao.account.hibernate.HibernateAccountDAO;
import com.secwebservices.entities.account.AccountEntity;

/**
 * 
 * RSSGnome - AccountFilter.java
 * @author Robert Suppenbach
 * @created Nov 13, 2013
 */
public class AccountFilter implements Filter{

    private FilterConfig filterConfig = null;
    private Properties properties = null;
    
    private WebApplicationContext springContext;
    
    private long lastrefresh;

    Map<String, Account> accounts = new HashMap<String, Account>();
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
     * Adds information about the current account requested based on the subdomain to the HttpSession
     */
    @Override
    public void doFilter(
            ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException
    {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        
        long currentTime = System.currentTimeMillis();
        long timeout = currentTime - (1000 * 60 * 5);
        
        if(accounts.isEmpty() || timeout > lastrefresh){
            List<AccountEntity> accountItems = new HibernateAccountDAO(sessionFactory).getAccounts();
            for(AccountEntity account: accountItems){
                accounts.put(account.getSubdomain(), new Account(account));
            }
            lastrefresh = System.currentTimeMillis();
        }
        
        String domain = properties.getProperty("primary.domain");
        String serverName = httpRequest.getServerName();

        if(serverName.indexOf(".") > 0){
            String requestsubdomain = httpRequest.getServerName().substring(0, (serverName.length() - domain.length()) -1); 
            httpRequest.getSession().setAttribute("account", accounts.get(requestsubdomain));
            
            CharResponseWrapper wrappedResponse = new CharResponseWrapper(
                    (HttpServletResponse)response);

            chain.doFilter(request, wrappedResponse);
            byte[] bytes = wrappedResponse.getByteArray();
            
            if (httpRequest.getRequestURI().equals("/") || httpRequest.getRequestURI().equals("/index.html")) {                
                String in = new String(bytes);
                Context context = new VelocityContext();
                
                VelocityEngine velocityEngine = new VelocityEngine();
                velocityEngine.setProperty( RuntimeConstants.RUNTIME_LOG_LOGSYSTEM_CLASS,"org.apache.velocity.runtime.log.Log4JLogChute" );
                velocityEngine.setProperty("runtime.log.logsystem.log4j.logger", LoggerFactory.getLogger(getClass()).getName());
                velocityEngine.init();

                StringWriter out = new StringWriter();
                velocityEngine.evaluate(context, out, "AccountFilter", new StringReader(in));

                response.getOutputStream().write(out.toString().getBytes());
            }
            else {
                response.getOutputStream().write(bytes);
            }            
        }
    }

    private static class ByteArrayServletStream extends ServletOutputStream
    {
        ByteArrayOutputStream baos;

        ByteArrayServletStream(ByteArrayOutputStream baos)
        {
            this.baos = baos;
        }

        @Override
        public void write(int param) throws IOException
        {
            baos.write(param);
        }
    }

    private static class ByteArrayPrintWriter
    {

        private ByteArrayOutputStream baos = new ByteArrayOutputStream();

        private PrintWriter pw = new PrintWriter(baos);

        private ServletOutputStream sos = new ByteArrayServletStream(baos);

        public PrintWriter getWriter()
        {
            return pw;
        }

        public ServletOutputStream getStream()
        {
            return sos;
        }

        byte[] toByteArray()
        {
            return baos.toByteArray();
        }
    }

    public class CharResponseWrapper extends HttpServletResponseWrapper
    {
        private ByteArrayPrintWriter output;
        private boolean usingWriter;

        public CharResponseWrapper(HttpServletResponse response)
        {
            super(response);
            usingWriter = false;
            output = new ByteArrayPrintWriter();
        }

        public byte[] getByteArray()
        {
            return output.toByteArray();
        }

        @Override
        public ServletOutputStream getOutputStream() throws IOException
        {
            // will error out, if in use
            if (usingWriter) {
                super.getOutputStream();
            }
            usingWriter = true;
            return output.getStream();
        }

        @Override
        public PrintWriter getWriter() throws IOException
        {
            // will error out, if in use
            if (usingWriter) {
                super.getWriter();
            }
            usingWriter = true;
            return output.getWriter();
        }

        @Override
        public String toString()
        {
            return output.toString();
        }
    }
}

