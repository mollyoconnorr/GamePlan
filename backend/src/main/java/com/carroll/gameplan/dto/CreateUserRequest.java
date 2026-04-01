package com.carroll.gameplan.dto;

/**
 * DTO used when creating a new user from external identity information.
 */
public class CreateUserRequest {

    /**
     * User's email address.
     */
    private String email;
    /**
     * User's first name.
     */
    private String firstName;
    /**
     * User's last name.
     */
    private String lastName;
    /**
     * Okta subject identifier for the user.
     */
    private String oidcUserId;

    /**
     * Gets the user's email address.
     *
     * @return email address
     */
    public String getEmail() {
        return email;
    }

    /**
     * Sets the user's email address.
     *
     * @param email email address
     */
    public void setEmail(String email) {
        this.email = email;
    }

    /**
     * Gets the user's first name.
     *
     * @return first name
     */
    public String getFirstName() {
        return firstName;
    }

    /**
     * Sets the user's first name.
     *
     * @param firstName first name
     */
    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    /**
     * Gets the user's last name.
     *
     * @return last name
     */
    public String getLastName() {
        return lastName;
    }

    /**
     * Sets the user's last name.
     *
     * @param lastName last name
     */
    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    /**
     * Gets the Okta subject identifier.
     *
     * @return Okta user ID
     */
    public String getOidcUserId() {
        return oidcUserId;
    }

    /**
     * Sets the Okta subject identifier.
     *
     * @param oidcUserId Okta user ID
     */
    public void setOidcUserId(String oidcUserId) {
        this.oidcUserId = oidcUserId;
    }

}
