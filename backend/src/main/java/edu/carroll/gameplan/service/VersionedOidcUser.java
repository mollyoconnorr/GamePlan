package edu.carroll.gameplan.service;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.OidcUserInfo;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

/**
 * Delegating OIDC user that carries the local application auth version.
 *
 * <p>The extra attribute lets the backend detect when a user's role or
 * approval state changed and force the browser to sign in again.</p>
 */
public class VersionedOidcUser implements OidcUser {

    public static final String AUTH_VERSION_ATTRIBUTE = "appAuthVersion";

    private final OidcUser delegate;
    private final Map<String, Object> attributes;

    /**
     * Wraps an OIDC user with the local authorization version for session checks.
     */
    public VersionedOidcUser(OidcUser delegate, long authVersion) {
        this.delegate = delegate;
        this.attributes = new HashMap<>(delegate.getAttributes());
        this.attributes.put(AUTH_VERSION_ATTRIBUTE, authVersion);
    }

    /**
     * Returns the attribute map, including the local `appAuthVersion` entry.
     *
     * @return the current attributes
     */
    @Override
    public Map<String, Object> getAttributes() {
        return attributes;
    }

    /**
     * Returns the authorities granted by the upstream OIDC identity.
     *
     * @return the granted authorities
     */
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return delegate.getAuthorities();
    }

    /**
     * Returns the display name from the upstream OIDC identity.
     *
     * @return the principal name
     */
    @Override
    public String getName() {
        return delegate.getName();
    }

    /**
     * Returns the claims from the upstream OIDC identity.
     *
     * @return the claim map
     */
    @Override
    public Map<String, Object> getClaims() {
        return delegate.getClaims();
    }

    /**
     * Returns the OIDC user-info payload.
     *
     * @return the user info
     */
    @Override
    public OidcUserInfo getUserInfo() {
        return delegate.getUserInfo();
    }

    /**
     * Returns the OIDC ID token.
     *
     * @return the ID token
     */
    @Override
    public OidcIdToken getIdToken() {
        return delegate.getIdToken();
    }
}
