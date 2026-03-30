package com.carroll.gameplan.dto;

public class CreateUserRequest {
    private String email;
    private String firstName;
    private String lastName;
    private String oidcUserId;

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getOidcUserId() {
        return oidcUserId;
    }

    public void setOidcUserId(String oidcUserId) {
        this.oidcUserId = oidcUserId;
    }

}
