package edu.carroll.gameplan.service;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

import java.util.Collection;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class VersionedOidcUserTest {

    @Test
    void wrapsDelegateAndExposesAuthVersionAttribute() {
        OidcUser delegate = mock(OidcUser.class);
        Collection<? extends GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_USER"));
        Map<String, Object> attributes = Map.of("sub", "sub-123");
        Map<String, Object> claims = Map.of("email", "user@example.com");

        doReturn(authorities).when(delegate).getAuthorities();
        when(delegate.getAttributes()).thenReturn(attributes);
        when(delegate.getName()).thenReturn("user");
        when(delegate.getClaims()).thenReturn(claims);
        when(delegate.getUserInfo()).thenReturn(null);
        when(delegate.getIdToken()).thenReturn(null);

        VersionedOidcUser wrapped = new VersionedOidcUser(delegate, 9L);

        assertEquals("sub-123", wrapped.getAttributes().get("sub"));
        assertEquals(9L, wrapped.getAttributes().get(VersionedOidcUser.AUTH_VERSION_ATTRIBUTE));
        assertSame(authorities, wrapped.getAuthorities());
        assertEquals("user", wrapped.getName());
        assertSame(claims, wrapped.getClaims());
        assertNull(wrapped.getUserInfo());
        assertNull(wrapped.getIdToken());
    }
}
