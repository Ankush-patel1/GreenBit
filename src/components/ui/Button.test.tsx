import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    const { getByRole } = render(<Button>Click me</Button>);
    expect(getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('renders as disabled when disabled prop is true', () => {
    const { getByRole } = render(<Button disabled>Disabled</Button>);
    expect(getByRole('button', { name: /disabled/i })).toBeDisabled();
  });
});
