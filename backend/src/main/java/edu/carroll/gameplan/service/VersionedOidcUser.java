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

    public VersionedOidcUser(OidcUser delegate, long authVersion) {
        this.delegate = delegate;
        this.attributes = new HashMap<>(delegate.getAttributes());
        this.attributes.put(AUTH_VERSION_ATTRIBUTE, authVersion);
    }

    @Override
    public Map<String, Object> getAttributes() {
        return attributes;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return delegate.getAuthorities();
    }

    @Override
    public String getName() {
        return delegate.getName();
    }

    @Override
    public Map<String, Object> getClaims() {
        return delegate.getClaims();
    }

    @Override
    public OidcUserInfo getUserInfo() {
        return delegate.getUserInfo();
    }

    @Override
    public OidcIdToken getIdToken() {
        return delegate.getIdToken();
    }
}
