package edu.carroll.gameplan.config;

import edu.carroll.gameplan.service.CustomOidcUserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.jspecify.annotations.NonNull;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.client.oidc.web.logout.OidcClientInitiatedLogoutSuccessHandler;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.logout.LogoutSuccessHandler;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.csrf.CsrfTokenRequestHandler;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.XorCsrfTokenRequestAttributeHandler;
import org.springframework.util.StringUtils;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.function.Supplier;

/**
 * Defines the backend security posture: OAuth2/OIDC login, logout, CSRF, and
 * CORS rules for the SPA and API.
 */
@Configuration
@EnableWebSecurity
@EnableConfigurationProperties(SecurityProps.class)
public class SecurityConfig {

    /**
     * Builds the Spring Security filter chain used by the application.
     *
     * <p>The backend permits the SPA shell and OAuth endpoints, requires
     * authentication for API routes, stores CSRF tokens in cookies for the
     * frontend, and uses Okta for login and logout.</p>
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   LogoutSuccessHandler oidcLogoutSuccessHandler,
                                                   CustomOidcUserService customOidcUserService,
                                                   @Qualifier("app.security-edu.carroll.gameplan.config.SecurityProps") SecurityProps props){
        CookieCsrfTokenRepository csrfTokenRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        AuthenticationEntryPoint unauthorizedEntryPoint = new HttpStatusEntryPoint(org.springframework.http.HttpStatus.UNAUTHORIZED);

        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf
                    .csrfTokenRepository(csrfTokenRepository)
                    .csrfTokenRequestHandler(new SpaCsrfTokenRequestHandler())
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(unauthorizedEntryPoint)
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/health").permitAll()
                        .requestMatchers("/", "/index.html", "/assets/**", "/favicon.ico", "/app/**", "/error").permitAll()
                        .requestMatchers("/api/csrf").permitAll()
                        .requestMatchers("/oauth2/**", "/login/**", "/authorization-code/callback").permitAll()
                        .anyRequest().authenticated()
                )
                .oauth2Login(oauth -> oauth
                        .redirectionEndpoint(redir -> redir
                                .baseUri(props.getBaseUri())
                        )
                        .userInfoEndpoint(userInfo -> userInfo
                                .oidcUserService(customOidcUserService)
                        )
                        .defaultSuccessUrl(props.getSuccessUrl(), true)
                        .failureHandler((request, response, exception) ->
                                response.sendRedirect(buildLoginFailureRedirectUrl(props.getLogoutUrl()))
                        )
                )
                .logout(logout -> logout
                        .logoutUrl("/api/logout")
                        .logoutSuccessHandler(oidcLogoutSuccessHandler)
                )
                .exceptionHandling(exceptions -> exceptions
                        .defaultAuthenticationEntryPointFor(
                                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED),
                                request -> request.getRequestURI().startsWith(request.getContextPath() + "/api/")
                        )
                )
                // Ensure SPA clients receive XSRF-TOKEN cookie to mirror into X-XSRF-TOKEN header.
                .addFilterAfter(new CsrfCookieFilter(), BasicAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Registers the allowed browser origins and headers for authenticated SPA requests.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource(@Qualifier("app.security-edu.carroll.gameplan.config.SecurityProps") SecurityProps props) {
        final CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOrigins(props.getAllowedOrigins());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Content-Type", "Authorization", "X-XSRF-TOKEN"));
        config.setAllowCredentials(true);

        config.setExposedHeaders(List.of("Set-Cookie"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    /**
     * Creates the Okta logout handler that sends the browser back to the app
     * after the OIDC session ends.
     */
    @Bean
    public LogoutSuccessHandler oidcLogoutSuccessHandler(ClientRegistrationRepository clientRegistrationRepository,
                                                         @Qualifier("app.security-edu.carroll.gameplan.config.SecurityProps") SecurityProps props) {
        OidcClientInitiatedLogoutSuccessHandler successHandler =
                new OidcClientInitiatedLogoutSuccessHandler(clientRegistrationRepository);

        successHandler.setPostLogoutRedirectUri(props.getLogoutUrl());
        return successHandler;
    }

    /**
     * Falls back to the frontend logout page and adds a login error flag when
     * Okta login fails.
     */
    private String buildLoginFailureRedirectUrl(String logoutUrl) {
        if (logoutUrl == null || logoutUrl.isBlank()) {
            return "/?loginError=true";
        }

        final String separator = logoutUrl.contains("?") ? "&" : "?";
        return logoutUrl + separator + "loginError=true";
    }

    /**
     * Forces CSRF token generation so the SPA can read the XSRF cookie.
     */
    private static final class CsrfCookieFilter extends OncePerRequestFilter {
        @Override
        protected void doFilterInternal(HttpServletRequest request,
                                        @NonNull HttpServletResponse response,
                                        @NonNull FilterChain filterChain) throws ServletException, IOException {
            CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
            if (csrfToken != null) {
                csrfToken.getToken();
            }

            filterChain.doFilter(request, response);
        }
    }

    /**
     * Adapts CSRF handling for the SPA so request headers and cookie-based
     * bootstrap flows both work.
     */
    private static final class SpaCsrfTokenRequestHandler implements CsrfTokenRequestHandler {
        private final CsrfTokenRequestHandler plain = new CsrfTokenRequestAttributeHandler();
        private final CsrfTokenRequestHandler xor = new XorCsrfTokenRequestAttributeHandler();

        @Override
        public void handle(HttpServletRequest request,
                           HttpServletResponse response,
                           Supplier<CsrfToken> csrfToken) {
            this.xor.handle(request, response, csrfToken);
        }

        @Override
        public String resolveCsrfTokenValue(HttpServletRequest request, CsrfToken csrfToken) {
            String headerValue = request.getHeader(csrfToken.getHeaderName());
            if (StringUtils.hasText(headerValue)) {
                return this.plain.resolveCsrfTokenValue(request, csrfToken);
            }

            return this.xor.resolveCsrfTokenValue(request, csrfToken);
        }
    }
}
