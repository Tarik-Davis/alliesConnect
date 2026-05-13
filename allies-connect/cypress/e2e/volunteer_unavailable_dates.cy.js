describe('Volunteer Specific Unavailable Dates Flow', () => {
  beforeEach(() => {
    let mockUnavailableDates = [];

    // 1. Intercept Login
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      body: {
        message: 'Login successful',
        user_id: 101,
        roles: ['volunteer']
      }
    }).as('loginRequest');

    // 2. Intercept Profile
    cy.intercept('GET', '**/api/users/profile/101', {
      statusCode: 200,
      body: {
        user_id: 101,
        first_name: 'Dates',
        last_name: 'Tester',
        email: 'dates@example.com'
      }
    }).as('profileRequest');

    // 3. Intercept Availability (Empty/Default)
    cy.intercept('GET', '**/api/volunteers/101/availability', {
      statusCode: 200,
      body: []
    }).as('getAvailability');

    // 4. Intercept Unavailable Dates (Dynamic)
    cy.intercept('GET', '**/api/volunteers/101/unavailable-dates', (req) => {
      req.reply({
        statusCode: 200,
        body: mockUnavailableDates
      });
    }).as('getUnavailableDates');

    // 5. Intercept Add Unavailable Date
    cy.intercept('POST', '**/api/volunteers/101/unavailable-dates', (req) => {
      const newEntry = {
        unavailable_id: Math.floor(Math.random() * 1000),
        user_id: 101,
        unavailable_date: req.body.unavailable_date,
        reason: req.body.reason
      };
      mockUnavailableDates.push(newEntry);
      req.reply({
        statusCode: 201,
        body: newEntry
      });
    }).as('addDateRequest');
  });

  it('allows a volunteer to add and persist specific unavailable dates', () => {
    const testDate = '2030-12-25';
    const testReason = 'Family Holiday';
    // Expectation based on browser locale: Wed, Dec 25, 2030 (standard US)
    const displayDateSnippet = 'Dec 25, 2030';

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

    // 4. Click Edit Availability
    cy.contains('button', 'Edit Availability').click();
    cy.wait('@getAvailability');
    cy.wait('@getUnavailableDates');

    // 5. Enter a date, reason, and click Add Date
    cy.get('input[type="date"]').type(testDate);
    cy.get('input[placeholder*="Vacation" i]').type(testReason);
    cy.contains('button', '+ Add Date').click();
    cy.wait('@addDateRequest');

    // Confirm it appears in the table immediately
    cy.get('table').contains('td', displayDateSnippet).scrollIntoView().should('be.visible');
    cy.get('table').contains('td', testReason).should('be.visible');

    // 6. Close the modal dialog box
    cy.get('.modal-header .btn-close').click();
    cy.get('.modal').should('not.exist');

    // 7. Reopen the modal dialog box
    cy.contains('button', 'Edit Availability').click();
    cy.wait('@getAvailability');
    cy.wait('@getUnavailableDates');

    // Confirm that the date and description added were retained
    cy.get('table').contains('td', displayDateSnippet).scrollIntoView().should('be.visible');
    cy.get('table').contains('td', testReason).should('be.visible');

  });
});
