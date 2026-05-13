import { render, screen } from '@testing-library/react';
import App from './App';

test('renders main headline', () => {
  render(<App />);
  const headlineElement = screen.getByText(/Georgia's Community Resource/i);
  expect(headlineElement).toBeInTheDocument();
});
