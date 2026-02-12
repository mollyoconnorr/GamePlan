package com.carroll.gameplan.config;


import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.client.oidc.web.logout.OidcClientInitiatedLogoutSuccessHandler;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.logout.LogoutSuccessHandler;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   LogoutSuccessHandler oidcLogoutSuccessHandler) throws Exception {

        http
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/health").permitAll()
                        .requestMatchers("/", "/index.html", "/assets/**", "/favicon.ico").permitAll() // public files
                        .requestMatchers("/oauth2/**", "/login/**").permitAll() // OAuth endpoints
                        .anyRequest().authenticated()
                )
                .oauth2Login(oauth -> oauth
                        .defaultSuccessUrl("http://localhost:5173/", true)
                )
                .logout(logout -> logout.logoutSuccessHandler(oidcLogoutSuccessHandler));

        return http.build();
    }

    @Bean
    public LogoutSuccessHandler oidcLogoutSuccessHandler(ClientRegistrationRepository clientRegistrationRepository) {
        OidcClientInitiatedLogoutSuccessHandler successHandler =
                new OidcClientInitiatedLogoutSuccessHandler(clientRegistrationRepository);

        // Redirect user back to home page after logout
        successHandler.setPostLogoutRedirectUri("http://localhost:5173/");
        return successHandler;
    }
}

