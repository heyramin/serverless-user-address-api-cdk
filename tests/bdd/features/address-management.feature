Feature: Address Management API
  As a user
  I want to manage my addresses
  So that I can store and retrieve my address information

  Background:
    Given the API is initialized
    And I am authenticated with valid credentials

  Scenario: Store a new address successfully
    When I store a new address with the following details:
      | field         | value                      |
      | userId        | user_test_123              |
      | streetAddress | 123 Main Street            |
      | suburb        | Sydney                     |
      | state         | NSW                        |
      | postcode      | 2000                       |
      | country       | Australia                  |
    Then the address should be created successfully
    And the response should contain an addressId

  Scenario: Retrieve addresses by postcode
    Given I have stored addresses with the following postcodes:
      | postcode |
      | 2000     |
      | 2001     |
      | 3000     |
    When I retrieve addresses with postcode "2000"
    Then I should get 1 address
    And the address should have postcode "2000"

  Scenario: Filter addresses by multiple postcodes
    Given I have stored addresses with the following details:
      | userId   | postcode |
      | user_001 | 2000     |
      | user_001 | 2001     |
      | user_001 | 3000     |
    When I retrieve addresses for user "user_001" with postcode "2000"
    Then I should get 1 address
    And the address postcode should be "2000"

  Scenario: Update an existing address
    Given I have stored an address with the following details:
      | field         | value                      |
      | userId        | user_test_456              |
      | streetAddress | 456 Oak Avenue             |
      | suburb        | Melbourne                  |
      | state         | VIC                        |
      | postcode      | 3000                       |
      | country       | Australia                  |
    When I update the address with the following changes:
      | field         | value              |
      | streetAddress | 789 Elm Street     |
      | suburb        | Collingwood        |
    Then the address should be updated successfully
    And the updated address should contain:
      | field         | value              |
      | streetAddress | 789 Elm Street     |
      | suburb        | Collingwood        |

  Scenario: Delete an address
    Given I have stored an address with the following details:
      | field         | value                      |
      | userId        | user_test_789              |
      | streetAddress | 321 Pine Road              |
      | suburb        | Brisbane                   |
      | state         | QLD                        |
      | postcode      | 4000                       |
      | country       | Australia                  |
    When I delete the address
    Then the address should be deleted successfully
    And attempting to retrieve the address should return no results

  Scenario: Validate required fields when storing address
    When I attempt to store an address without a suburb
    Then the request should fail with validation error
    And the error message should mention "suburb is required"

  Scenario: Retrieve all addresses for a user
    Given I have stored multiple addresses for user "user_multi":
      | streetAddress  | suburb    | postcode |
      | 100 First St   | Sydney    | 2000     |
      | 200 Second Ave | Melbourne | 3000     |
      | 300 Third Ln   | Brisbane  | 4000     |
    When I retrieve all addresses for user "user_multi"
    Then I should get 3 addresses
    And each address should have the correct userId
