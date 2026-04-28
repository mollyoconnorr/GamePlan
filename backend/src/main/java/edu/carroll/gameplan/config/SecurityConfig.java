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
 * Configures Spring Security for OIDC login, CSRF protection, CORS, logout, and API authorization rules.
 */
@Configuration
@EnableWebSecurity
@EnableConfigurationProperties(SecurityProps.class)
public class SecurityConfig {

    /**
     * Defines the application security rules, login flow, logout behavior, and CSRF integration.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   LogoutSuccessHandler oidcLogoutSuccessHandler,
                                                   CustomOidcUserService customOidcUserService,
                                                   @Qualifier("app.security-edu.carroll.gameplan.config.SecurityProps") SecurityProps props){
        CookieCsrfTokenRepository csrfTokenRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();

        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf
                    .csrfTokenRepository(csrfTokenRepository)
                    .csrfTokenRequestHandler(new SpaCsrfTokenRequestHandler())
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
     * Builds CORS settings from configured frontend origins so local and deployed clients can call the API.
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
     * Creates the logout handler that signs users out locally and redirects them back to the configured frontend URL.
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
     * Builds a frontend-safe login failure URL with the encoded OAuth error reason.
     */
    private String buildLoginFailureRedirectUrl(String logoutUrl) {
        if (logoutUrl == null || logoutUrl.isBlank()) {
            return "/?loginError=true";
        }

        final String separator = logoutUrl.contains("?") ? "&" : "?";
        return logoutUrl + separator + "loginError=true";
    }

    private static final class CsrfCookieFilter extends OncePerRequestFilter {
        /**
         * Forces lazy CSRF token creation so Spring writes the XSRF-TOKEN cookie for the SPA.
         */
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

    private static final class SpaCsrfTokenRequestHandler implements CsrfTokenRequestHandler {
        private final CsrfTokenRequestHandler plain = new CsrfTokenRequestAttributeHandler();
        private final CsrfTokenRequestHandler xor = new XorCsrfTokenRequestAttributeHandler();

        /**
         * Delegates CSRF token exposure to Spring Security's XOR handler while custom resolution supports SPA headers.
         */
        @Override
        public void handle(HttpServletRequest request,
                           HttpServletResponse response,
                           Supplier<CsrfToken> csrfToken) {
            this.xor.handle(request, response, csrfToken);
        }

        /**
         * Reads CSRF tokens from SPA headers first and falls back to Spring Security token resolution.
         */
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
