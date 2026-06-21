import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input Component', () => {
  it('renders correctly and accepts input', async () => {
    const { getByPlaceholderText } = render(<Input placeholder="Enter text" />);
    const inputElement = getByPlaceholderText('Enter text');
    expect(inputElement).toBeInTheDocument();
    
    await userEvent.type(inputElement, 'Hello World');
    expect(inputElement).toHaveValue('Hello World');
  });

  it('can be disabled', () => {
    const { getByPlaceholderText } = render(<Input placeholder="Disabled input" disabled />);
    const inputElement = getByPlaceholderText('Disabled input');
    expect(inputElement).toBeDisabled();
  });
});
