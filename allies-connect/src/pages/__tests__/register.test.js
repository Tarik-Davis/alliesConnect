import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Register from '../register';

describe('Register Page', () => {
  it('renders tabs to select account type', () => {
    // Avoid missing DOM errors for maps API
    window.google = {
      maps: {
        places: {
          Autocomplete: class { }
        }
      }
    };

    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    );

    expect(screen.getByRole('tab', { name: /Volunteer/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Organization/i })).toBeInTheDocument();
  });
});
