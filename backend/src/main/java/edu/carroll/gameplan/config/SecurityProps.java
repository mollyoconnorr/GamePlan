package edu.carroll.gameplan.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Binds frontend and OAuth security URLs from configuration for environment-specific deployments.
 */
@Configuration
@ConfigurationProperties(prefix = "app.security")
public class SecurityProps {
    private String successUrl;

    private List<String> allowedOrigins;

    private String logoutUrl;

    private String baseUri;

    /**
     * Returns the SuccessUrl.
     *
     * @return the current value
     */
    public String getSuccessUrl() {
        return successUrl;
    }

    /**
     * Sets the SuccessUrl.
     *
     * @param value the new value
     */
    public void setSuccessUrl(String successUrl) {
        this.successUrl = successUrl;
    }

    /**
     * Returns the AllowedOrigins.
     *
     * @return the current value
     */
    public List<String> getAllowedOrigins() {
        return allowedOrigins;
    }

    /**
     * Sets the AllowedOrigins.
     *
     * @param value the new value
     */
    public void setAllowedOrigins(List<String> allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }

    /**
     * Returns the LogoutUrl.
     *
     * @return the current value
     */
    public String getLogoutUrl() {
        return logoutUrl;
    }

    /**
     * Sets the LogoutUrl.
     *
     * @param value the new value
     */
    public void setLogoutUrl(String logoutUrl) {
        this.logoutUrl = logoutUrl;
    }

    /**
     * Returns the BaseUri.
     *
     * @return the current value
     */
    public String getBaseUri() {
        return baseUri;
    }

    /**
     * Sets the BaseUri.
     *
     * @param value the new value
     */
    public void setBaseUri(String baseUri) {
        this.baseUri = baseUri;
    }
}
