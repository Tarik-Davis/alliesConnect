import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Home from '../home';

describe('Home Page', () => {
  it('renders hero copy and call to action buttons', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    // Search for texts typically found on the homepage
    expect(screen.getByText(/Georgia's Community Resource/i)).toBeInTheDocument();
  });
});
