import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from '../navbar';

describe('Navbar Component', () => {
  it('renders standard links for unauthenticated users', () => {
    render(
      <BrowserRouter>
        <Navbar user={null} role={null} />
      </BrowserRouter>
    );

    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
  });

  it('renders dashboard link for authenticated users', () => {
    const mockUser = { first_name: 'John', email: 'john@example.com' };
    
    render(
      <BrowserRouter>
        <Navbar user={mockUser} role="volunteer" />
      </BrowserRouter>
    );

    expect(screen.getByText(/Hello, John/i)).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
  });
});
