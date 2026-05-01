package edu.carroll.gameplan.service;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.OidcUserInfo;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

/**
 * Delegating OIDC user that carries the application auth version.
 */
public class VersionedOidcUser implements OidcUser {

    public static final String AUTH_VERSION_ATTRIBUTE = "appAuthVersion";

    private final OidcUser delegate;
    private final Map<String, Object> attributes;

    /**
     * Wraps an OIDC user with the local authorization version so session invalidation can detect role changes.
     */
    public VersionedOidcUser(OidcUser delegate, long authVersion) {
        this.delegate = delegate;
        this.attributes = new HashMap<>(delegate.getAttributes());
        this.attributes.put(AUTH_VERSION_ATTRIBUTE, authVersion);
    }

    /**
     * Returns the Attributes.
     *
     * @return the current value
     */
    @Override
    public Map<String, Object> getAttributes() {
        return attributes;
    }

    /**
     * Returns the Authorities.
     *
     * @return the current value
     */
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return delegate.getAuthorities();
    }

    /**
     * Returns the Name.
     *
     * @return the current value
     */
    @Override
    public String getName() {
        return delegate.getName();
    }

    /**
     * Returns the Claims.
     *
     * @return the current value
     */
    @Override
    public Map<String, Object> getClaims() {
        return delegate.getClaims();
    }

    /**
     * Returns the UserInfo.
     *
     * @return the current value
     */
    @Override
    public OidcUserInfo getUserInfo() {
        return delegate.getUserInfo();
    }

    /**
     * Returns the IdToken.
     *
     * @return the current value
     */
    @Override
    public OidcIdToken getIdToken() {
        return delegate.getIdToken();
    }
}
