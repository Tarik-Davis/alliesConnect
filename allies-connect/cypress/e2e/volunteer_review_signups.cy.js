describe('Volunteer Review Event Signups Flow', () => {
  beforeEach(() => {
    // 1. Intercept Login
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      body: {
        message: 'Login successful',
        user_id: 123,
        roles: ['volunteer']
      }
    }).as('loginRequest');

    // 2. Intercept Profile
    cy.intercept('GET', '**/api/users/profile/123', {
      statusCode: 200,
      body: {
        user_id: 123,
        first_name: 'Signup',
        last_name: 'Tester',
        email: 'tester@example.com'
      }
    }).as('profileRequest');

    // 3. Intercept Signups
    cy.intercept('GET', '**/api/volunteers/123/event-signups', {
      statusCode: 200,
      body: [
        {
          event_id: 10,
          opportunity_id: 20,
          title: "Charity Gala",
          provider_name: "Local Helpers",
          start_datetime: "2030-10-10T18:00:00Z",
          city: "Atlanta",
          state: "GA",
          event_status: "upcoming"
        }
      ]
    }).as('getSignups');
  });

  it('allows a volunteer to review their event signups and view details', () => {
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

    // 4. Click Review Event Signups
    cy.contains('button', 'Review Event Signups').click();
    cy.wait('@getSignups');

    // 5. Click View Details
    cy.get('table').within(() => {
        cy.contains('td', 'Charity Gala').should('be.visible');
        cy.contains('button', 'View Details').click();
    });

    // 6. Confirm that the details modal dialog box appears
    // The EventDetailsModal uses 'modal' class and has the title
    cy.get('.modal').should('be.visible');
    cy.get('.modal-title').should('contain', 'Charity Gala');
  });
});
