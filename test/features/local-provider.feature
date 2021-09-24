
This tests that the local provider and RP are listening, logs in, then logs out. 

  Backgrounds: browser, local-provider, local-rp

    When the relying party is listening
    And the openid provider is listening
    And the openid provider has an oidc well-known configuration

    When I open the relying party page
    And I click on login
    Then the URI should match openid provider interaction page

    Start step delay of 300

The local provider will accept any username and pasword for this test.

    When I input "test" for username
    And I input "pw_771_abc" for password
    And I click on Sign-in
    Then the URI should match openid provider interaction page

    When I click on Continue
    Then I should be on the relying party success page
    And I should see "Success"

    When I click on Logout
    And I click "Yes, sign me out"
    Then I should be on the relying party page

    When I click on login
    Then the URI should match openid provider interaction page


