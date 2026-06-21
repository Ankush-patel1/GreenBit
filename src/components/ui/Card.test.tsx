import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';

describe('Card Components', () => {
  it('renders Card with children correctly', () => {
    const { getByText } = render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
        </CardHeader>
        <CardContent>Test Content</CardContent>
      </Card>
    );
    expect(getByText('Test Title')).toBeInTheDocument();
    expect(getByText('Test Content')).toBeInTheDocument();
  });
});
