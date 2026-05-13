describe('Volunteer Contact Information Flow', () => {
  beforeEach(() => {
    let mockProfile = {
      user_id: 101,
      first_name: 'Contact',
      last_name: 'Tester',
      phone: '1234567890',
      zip_code: '30303',
      email: 'tester@example.com'
    };

    // 1. Intercept Login
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      body: {
        message: 'Login successful',
        user_id: 101,
        roles: ['volunteer']
      }
    }).as('loginRequest');

    // 2. Intercept Profile (Dynamic)
    cy.intercept('GET', '**/api/users/profile/101', (req) => {
      req.reply({
        statusCode: 200,
        body: mockProfile
      });
    }).as('profileRequest');

    // 3. Intercept Update Profile
    cy.intercept('PUT', '**/api/users/profile/101', (req) => {
      mockProfile = { ...mockProfile, ...req.body };
      req.reply({
        statusCode: 200,
        body: { message: "Contact info updated!" }
      });
    }).as('saveRequest');
  });

  it('allows a volunteer to update and persist contact information', () => {
    const newZip = '90210';
    const newFirstName = 'Updated';

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

    // 4. Click Contact Information
    cy.contains('button', 'Contact Information').click();
    cy.wait('@profileRequest');

    // 5. Change the data in one of the fields (First Name and Zip Code)
    cy.get('input[placeholder="First name"]').clear().type(newFirstName);
    cy.get('input[placeholder="Zip code"]').clear().type(newZip);

    // 6. Click Save Changes
    cy.contains('button', 'Save Changes').click();
    cy.wait('@saveRequest');
    cy.contains('Contact info updated!').should('be.visible');

    // 7. Close the modal dialog box
    cy.get('.modal-header .btn-close').click();
    cy.get('.modal').should('not.exist');

    // 8. Reopen the modal dialog box
    cy.contains('button', 'Contact Information').click();
    cy.wait('@profileRequest');

    // Confirm that the changes made were retained
    cy.get('input[placeholder="First name"]').should('have.value', newFirstName);
    cy.get('input[placeholder="Zip code"]').should('have.value', newZip);
  });
});
