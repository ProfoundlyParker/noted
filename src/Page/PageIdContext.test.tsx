import { render, screen } from '@testing-library/react';
import { PageIdContext, usePageId } from './PageIdContext';

function TestComponent() {
  const pageId = usePageId();
  return <div>{pageId}</div>;
}

describe('usePageId', () => {
  it('returns the page ID when used inside a provider', () => {
    render(
      <PageIdContext.Provider value="12345">
        <TestComponent />
      </PageIdContext.Provider>
    );
    expect(screen.getByText('12345')).toBeInTheDocument();
  });

  it('throws an error when used outside the provider', () => {
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => render(<TestComponent />)).toThrow(
      'usePageId must be used within a PageIdProvider'
    );

    console.error = originalError;
  });
  it('throws correct error when used outside the provider (inline check)', () => {
    let error;
    try {
      render(<TestComponent />);
    } catch (e: any) {
      error = e;
    }

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('usePageId must be used within a PageIdProvider');
  });
  it('throws error if used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestComponent />)).toThrow(
      "usePageId must be used within a PageIdProvider"
    );
    consoleSpy.mockRestore();
  });
});