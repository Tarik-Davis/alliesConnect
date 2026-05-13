import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../login';

describe('Login Page', () => {
  it('renders login form correctly', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    expect(screen.getAllByText(/Login/i).length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText(/Username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Password/i)).toBeInTheDocument();
  });

  it('updates input values when typed', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const usernameInput = screen.getByPlaceholderText(/Username/i);
    const passwordInput = screen.getByPlaceholderText(/Password/i);

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(usernameInput.value).toBe('testuser');
    expect(passwordInput.value).toBe('password123');
  });
});
