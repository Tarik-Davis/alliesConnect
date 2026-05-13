describe('Volunteer Manage Subscribed Organizations Flow', () => {
  beforeEach(() => {
    let isActive = true;

    // 1. Intercept Login
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      body: {
        message: 'Login successful',
        user_id: 777,
        roles: ['volunteer']
      }
    }).as('loginRequest');

    // 2. Intercept Profile
    cy.intercept('GET', '**/api/users/profile/777', {
      statusCode: 200,
      body: {
        user_id: 777,
        first_name: 'Test',
        last_name: 'Volunteer',
        email: 'volunteer@example.com'
      }
    }).as('profileRequest');

    // 3. Intercept Resource Connections (Dynamic)
    cy.intercept('GET', '**/api/users/777/resource-connections', (req) => {
        req.reply({
            statusCode: 200,
            body: [
              {
                connection_id: 444,
                resource_name: "Food Pantry Support",
                provider_name: "Community Food Bank",
                active: isActive
              }
            ]
        });
    }).as('getConnections');

    // 4. Intercept Deactivate (Sets state to false)
    cy.intercept('PUT', '**/api/resource-connections/444/deactivate', (req) => {
        isActive = false;
        req.reply({
            statusCode: 200,
            body: { message: "Deactivated" }
        });
    }).as('deactivateRequest');

    // 5. Intercept Activate (Sets state to true)
    cy.intercept('PUT', '**/api/resource-connections/444/activate', (req) => {
        isActive = true;
        req.reply({
            statusCode: 200,
            body: { message: "Activated" }
        });
    }).as('activateRequest');
  });

  it('allows a volunteer to manage their subscribed organizations', () => {
    // 1. Log in as a volunteer
    cy.visit('/login');
    cy.get('input[name="username"]').type('test_volunteer');
    cy.get('input[name="password"]').type('Password123!');
    cy.get('select').select('volunteer');
    cy.get('button.btn-gold').contains('Login').click();
    
    cy.wait('@loginRequest');
    cy.wait('@profileRequest');
    cy.url().should('include', '/volunteer');

    // 2. Click the image in the upper left corner to go to the home page
    cy.get('.navbar-brand img[alt="Allies Connect logo"]').click();
    cy.url().should('eq', Cypress.config().baseUrl + '/');

    // 3. Click the Dashboard button (in navbar)
    cy.get('.navbar').contains('Dashboard').should('be.visible').click();
    cy.url().should('include', '/volunteer');

    // 4. Click Manage Subscribed Organizations
    cy.contains('button', 'Manage Subscribed Organizations').click();
    cy.wait('@getConnections');

    // 5. Click one of the Stop Volunteering buttons
    cy.get('.modal').within(() => {
      cy.contains('Active').should('be.visible');
      cy.contains('button', 'Stop Volunteering').click();
    });

    cy.wait('@deactivateRequest');

    // Confirm that the Status changes to Inactive and the button text changes to Resume Volunteering
    cy.get('.modal').within(() => {
        // Wait for the state update to reflect in UI
        cy.contains('Inactive', { timeout: 10000 }).should('be.visible');
        cy.contains('button', 'Resume Volunteering').should('be.visible');
    });

    // 6. Close the modal dialog box
    cy.get('.modal-header .btn-close').click();
    cy.get('.modal').should('not.exist');

    // 7. Reopen the modal dialog box
    cy.contains('button', 'Manage Subscribed Organizations').click();
    cy.wait('@getConnections'); 

    // Confirm that the Status still says Inactive and the button text still says Resume Volunteering
    cy.get('.modal').within(() => {
        cy.contains('Inactive').should('be.visible');
        cy.contains('button', 'Resume Volunteering').should('be.visible');
    });
  });

});
