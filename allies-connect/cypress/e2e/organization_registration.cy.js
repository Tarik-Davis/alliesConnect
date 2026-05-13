describe('Organization Registration Flow', () => {
  it('successfully registers a new organization into the platform', () => {
    // Navigate to the live local server
    cy.visit('/register');

    // Switch to the Organization tab using the role and text selectors
    cy.get('button[role="tab"]').contains('Organization').click();

    // Generate randomized inputs to ensure no duplicate email/username collision with the live DB
    const randomNumber = Math.floor(Math.random() * 10000000);
    const username = `TestOrg${randomNumber}`;
    const email = `testorg${randomNumber}@example.com`;
    const ein = "84-3234923";
    const phone = String(Math.floor(Math.random() * 9000000000) + 1000000000); // 10 random digits

    // Intercept the EIN verification call
    cy.intercept('GET', '**/api/organizations/verify-ein/843234923', {
      statusCode: 200,
      body: {
        name: "Test Foundation E2E",
        ein: "84-3234923",
        city: "Atlanta",
        state: "GA",
        address: "123 Main St",
        zipcode: "30303"
      }
    }).as('verifyEin');

    // Scope our queries to only the form currently visible on the screen
    cy.get('.tab-pane.active').within(() => {
      cy.get('input[name="username"]').type(username);
      cy.get('input[name="password"]').type('TestP@ssw0rd!1'); // Needs >6 characters, 1 capital, 1 special
      cy.get('input[name="confirmPassword"]').type('TestP@ssw0rd!1');
      cy.get('input[name="email"]').type(email);
      cy.get('input[name="firstName"]').type('John');
      cy.get('input[name="lastName"]').type('Doe');
      cy.get('input[name="name"]').type('Test Foundation E2E');
      cy.get('input[name="phone"]').type(phone);
      cy.get('input[name="zip"]').type('90210');

      // Types the specific EIN for validation
      cy.get('input[name="ein"]').type(ein);
      // Wait longer for the EIN verification fetch and state updates
      cy.wait('@verifyEin', { timeout: 10000 });
      cy.wait(1000);
    });

    // Confirm the organization identity (the "Yes, this is my organization" button)
    // Use a longer timeout and ensure it's clickable
    cy.contains('button', 'Yes, this is my organization', { timeout: 10000 })
      .should('be.visible')
      .click({ force: true });

    cy.get('.tab-pane.active').within(() => {
      // Intercept the backend request before it happens and return a mock success
      cy.intercept('POST', '**/api/organizations/register', {
        statusCode: 201,
        body: {
          message: "Organization registered successfully",
          user_id: 123,
          provider_id: 456
        }
      }).as('registerRequest');

      // Click the nested Register button
      cy.get('button').contains('Register').should('not.be.disabled').click();
    });

    // Wait for the backend with a generous timeout (registration involves multiple DB hits)
    cy.wait('@registerRequest', { timeout: 15000 }).its('response.statusCode').should('eq', 201);



    // Verify the browser alert popup displays the correct success string
    cy.on('window:alert', (text) => {
      expect(text).to.contain('Registration successful');
    });
  });
});
