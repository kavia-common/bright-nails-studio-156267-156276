import { render, screen } from '@testing-library/react';
import App from './App';

test('renders site brand', () => {
  render(<App />);
  const brand = screen.getByText(/MVB Nails/i);
  expect(brand).toBeInTheDocument();
});

test('renders booking section title', () => {
  render(<App />);
  const bookingTitle = screen.getByText(/Book an Appointment/i);
  expect(bookingTitle).toBeInTheDocument();
});
