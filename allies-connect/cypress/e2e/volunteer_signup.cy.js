describe('Volunteer Signup Flow', () => {
  beforeEach(() => {
    // Intercept backend login endpoints to seamlessly simulate a logged-in Volunteer
    cy.intercept('POST', 'http://localhost:5000/api/auth/login', {
      statusCode: 200,
      body: {
        message: 'Login successful',
        user_id: 999,
        roles: ['volunteer']
      }
    }).as('loginRequest');

    cy.intercept('GET', '**/api/users/profile/999', {
      statusCode: 200,
      body: {
        user_id: 999,
        first_name: 'Test',
        last_name: 'Volunteer',
        email: 'volunteer@example.com'
      }
    }).as('profileRequest');

    // Intercept the events endpoint to predictably serve one Event
    cy.intercept('GET', '**/api/events', {
      statusCode: 200,
      body: [
        {
          event_id: 50,
          title: "Community Park Cleanup",
          start_datetime: "2030-01-01T12:00:00Z",
          end_datetime: "2030-01-01T16:00:00Z",
          category_name: "Environmental",
          city: "Atlanta",
          state: "GA",
          provider_name: "Test Organization",
          description: "Help us clean up the local park!",
          street_address: "123 Park Ave",
          zip: "30301"
        }
      ]
    }).as('getEvents');

    // Intercept shifts for this event
    cy.intercept('GET', '**/api/events/50/shifts', {
      statusCode: 200,
      body: [
        {
          shift_id: 101,
          event_id: 50,
          start_datetime: "2030-01-01T12:00:00Z",
          end_datetime: "2030-01-01T14:00:00Z",
          capacity: 10,
          signup_count: 0
        }
      ]
    }).as('getShifts');

    // Mock the backend volunteer-signups creation endpoint (Wait for the user to submit)
    cy.intercept('POST', '**/api/volunteer-signups', {
      statusCode: 201,
      body: {
        message: "Volunteer signup created successfully",
        signup_id: 1
      }
    }).as('signupRequest');
  });

  it('allows a volunteer to log in, view events, and sign up to volunteer', () => {
    // 1. Visit Login Page
    cy.visit('/login');

    // 2. Fill out the authentication form
    cy.get('input[name="username"]').type('test_volunteer');
    cy.get('input[name="password"]').type('Password123!');
    cy.get('select').select('volunteer'); // Select 'Volunteer' role
    cy.get('button.btn-gold').contains('Login').click({ force: true });

    // Verify login network requests fired
    cy.wait('@loginRequest');
    cy.wait('@profileRequest');

    // We should be redirected to the volunteer dashboard automatically
    cy.url().should('include', '/volunteer');

    // 3. Click the header logo to go to the Home page
    cy.get('.navbar-brand img[alt="Allies Connect logo"]').click();
    cy.url().should('eq', Cypress.config().baseUrl + '/');

    // 4. Click the "Events" button on the Home page
    cy.contains('.btn-gold', 'Events').click();
    cy.url().should('include', '/events');
    cy.wait('@getEvents');

    // 5. Find our mocked event on the page and click it to open the Event Details Modal
    cy.contains('Community Park Cleanup').should('be.visible').click();

    // 6. Assert the modal opens and contains the "Volunteer" button
    cy.get('.modal').should('be.visible');
    cy.get('.modal').contains('Test Organization');
    
    // 7. Click the "Volunteer" button to open the Shift Selection Modal
    cy.get('.modal').contains('Volunteer').click();
    cy.wait('@getShifts');

    // 8. Select a shift and click "Sign Up" in the Shift Selection Modal
    cy.get('.modal').contains('Select a Volunteer Shift').should('be.visible');
    cy.get('.modal').contains('Sign Up').click();

    // 9. Assert the front-end successfully triggered a backend creation request for user 999
    cy.wait('@signupRequest').its('request.body').should('have.property', 'user_id', 999);

    // 10. Assert that the UI provides visual feedback of success to the user
    cy.contains('Signed up successfully', { matchCase: false }).should('be.visible');
  });

});

