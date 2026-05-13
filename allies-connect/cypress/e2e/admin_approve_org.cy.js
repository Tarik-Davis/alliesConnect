describe('Admin Approve Organization Flow', () => {
  beforeEach(() => {
    // Intercept backend login endpoints to simulate a logged-in Admin
    cy.intercept('POST', 'http://localhost:5000/api/auth/login', {
      statusCode: 200,
      body: {
        message: 'Login successful',
        user_id: 1,
        roles: ['admin'] // User has admin role
      }
    }).as('loginRequest');

    cy.intercept('GET', '**/api/users/profile/1', {
      statusCode: 200,
      body: {
        user_id: 1,
        first_name: 'Super',
        last_name: 'Admin',
        email: 'admin@example.com'
      }
    }).as('profileRequest');

    // MOCK: First time the admin requests pending orgs, return 1 pending org
    cy.intercept('GET', '**/api/admin/pending-providers', (req) => {
      // If the URL has a special query param to return empty (we don't), we can just use req.reply.
      // Instead, we can use cy.intercept overriding or just reply with it directly.
    }).as('getPendingOrgs');

    // Actually, dynamic intercepts are simpler by just providing the array:
    cy.intercept('GET', '**/api/admin/pending-providers', {
      statusCode: 200,
      body: [
        {
          provider_id: 55,
          name: "Test Foundation",
          email: "test55@example.com",
          application_date: "2030-01-01",
          ein: "99-9999999"
        }
      ]
    }).as('getPendingOrgsInitial');

    // Intercept the approval PATCH request to fake a successful approval
    cy.intercept('PATCH', '**/api/admin/providers/55/approve', {
      statusCode: 200,
      body: { message: "Approved successfully" }
    }).as('approveOrgRequest');
  });

  it('allows an admin to log in, view pending organizations, and approve one', () => {
    // We want to verify the window alert message fires
    const stub = cy.stub()
    cy.on('window:alert', stub)

    // 1. Visit Login Page
    cy.visit('/login');

    // 2. Fill out the authentication form
    cy.get('input[name="username"]').type('admin_user');
    cy.get('input[name="password"]').type('Password123!');
    cy.get('select').select('admin'); // Select 'Admin' role
    cy.get('button.btn-gold').contains('Login').click({ force: true });

    // Verify login network requests fired
    cy.wait('@loginRequest');
    cy.wait('@profileRequest');

    // We should be redirected to the admin dashboard automatically
    cy.url().should('include', '/admin');

    // 3. Click the "Review Pending Organizations" button
    cy.get('button').contains('Review Pending Organizations').click();

    // Verify the UI fetched pending orgs
    cy.wait('@getPendingOrgsInitial');

    // 4. Assert the modal opens and contains the pending org in the table
    cy.get('.modal').should('be.visible');
    cy.get('.modal').contains('Test Foundation');
    cy.get('.modal').contains('99-9999999');

    // 5. Override the intercept so the NEXT time fetchPendingOrgs() runs, it returns an empty list!
    cy.intercept('GET', '**/api/admin/pending-providers', {
      statusCode: 200,
      body: []
    }).as('getPendingOrgsEmpty');

    // 6. Click the "Approve" button
    cy.get('.modal').contains('Approve').click();

    // 7. Assert the PATCH network request fired
    cy.wait('@approveOrgRequest');

    // 8. Wait for the automatic refresh ping
    cy.wait('@getPendingOrgsEmpty').then(() => {
      // 9. Verify the alert fired with success!
      expect(stub.getCall(0)).to.be.calledWith('Organization approved successfully.')
      // 10. Verify the table is now empty (Test Foundation should no longer exist)
      cy.get('.modal').contains('Test Foundation').should('not.exist');
    });
  });
});
