import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { CommandPanel } from './CommandPanel.tsx';

const setIsCommandPanelOpen = vi.fn();

// Mock useOverflowsScreenBottom
vi.mock('../hooks/useOverflowsScreenBottom', () => ({
  useOverflowsScreenBottom: () => ({
    overflows: false,
    ref: { current: null }
  })
}));

vi.mock('../state/AppStateContext', () => ({
  useAppState: () => ({
    setIsCommandPanelOpen,
  })
}));

describe('CommandPanel component', () => {
  const mockSelectItem = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all supported node types', () => {
    render(<CommandPanel selectItem={mockSelectItem} nodeText="" />);
    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText('List')).toBeInTheDocument();
    expect(screen.getByText('Numbered List')).toBeInTheDocument();
    expect(screen.getByText('Page')).toBeInTheDocument();
    expect(screen.getByText('Image')).toBeInTheDocument();
    expect(screen.getByText('Heading 1')).toBeInTheDocument();
    expect(screen.getByText('Heading 2')).toBeInTheDocument();
    expect(screen.getByText('Heading 3')).toBeInTheDocument();
  });

  it('calls selectItem when a list item is clicked', () => {
    render(<CommandPanel selectItem={mockSelectItem} nodeText="" />);
    fireEvent.click(screen.getByText('Image'));
    expect(mockSelectItem).toHaveBeenCalledWith('image');
  });

  it('calls selectItem when Enter key is pressed on selected item', () => {
    render(<CommandPanel selectItem={mockSelectItem} nodeText="" />);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(mockSelectItem).toHaveBeenCalledWith('text'); // Default first item
  });

  it('navigates with ArrowDown and selects new item with Enter', () => {
    render(<CommandPanel selectItem={mockSelectItem} nodeText="" />);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(mockSelectItem).toHaveBeenCalledWith('list');
  });

  it('navigates with ArrowUp and wraps correctly', () => {
    render(<CommandPanel selectItem={mockSelectItem} nodeText="" />);
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(mockSelectItem).toHaveBeenCalledWith('heading3'); // Wrapped to last item
  });

  it('updates selected item based on nodeText prop', () => {
    render(<CommandPanel selectItem={mockSelectItem} nodeText="/image" />);
    // Check if 'Image' is now the selected item
    const imageItem = screen.getByText('Image');
    expect(imageItem.className).toMatch(/selected/);
  });
  
 it('sets isCommandPanelOpen true on mount and false on unmount', () => {
    const { unmount } = render(<CommandPanel selectItem={mockSelectItem} nodeText="" />);
    expect(setIsCommandPanelOpen).toHaveBeenCalledWith(true);

    unmount();

    expect(setIsCommandPanelOpen).toHaveBeenCalledWith(false);
  });
  it("does nothing for unhandled keys (default case)", () => {
    render(<CommandPanel selectItem={mockSelectItem} nodeText="" />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(mockSelectItem).not.toHaveBeenCalled();
  });
  it("sets selected index to matched item when nodeText matches", () => {
    render(<CommandPanel selectItem={mockSelectItem} nodeText="/image" />);
    const imageItem = screen.getByText("Image");
    expect(imageItem.className).toMatch(/selected/);
  });
  it("sets selected index to 0 when nodeText does not match", () => {
    render(<CommandPanel selectItem={mockSelectItem} nodeText="/nomatch" />);
    const firstItem = screen.getByText("Text"); // first item
    expect(firstItem.className).toMatch(/selected/);
  });
});
