import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { Title } from './Title';
import styles from './Title.module.css';

describe('Title component', () => {
  it('renders the title text correctly', () => {
    render(<Title title="Test Title" changePageTitle={() => {}} addNode={() => {}} />);
    const titleElement = screen.getByRole('heading', { level: 1 });
    expect(titleElement).toBeInTheDocument();
    expect(titleElement.textContent).toBe('Test Title');
  });
  it('calls changePageTitle on input', () => {
    const changePageTitleMock = vi.fn();
    render(<Title title="Initial Title" changePageTitle={changePageTitleMock} addNode={() => {}} />);
    const titleElement = screen.getByRole('heading', { level: 1 });

    fireEvent.input(titleElement, { target: { textContent: 'New Title' } });

    expect(changePageTitleMock).toHaveBeenCalledWith('New Title');
  });
  it('calls changePageTitle on blur', () => {
    const changePageTitleMock = vi.fn();
    render(<Title title="Initial Title" changePageTitle={changePageTitleMock} addNode={() => {}} />);
    const titleElement = screen.getByRole('heading', { level: 1 });

    fireEvent.blur(titleElement, { target: { textContent: 'Blurred Title' } });

    expect(changePageTitleMock).toHaveBeenCalledWith('Blurred Title');
  });
  it('calls addNode when Enter key is pressed', () => {
    const addNodeMock = vi.fn();
    render(<Title title="Some Title" changePageTitle={() => {}} addNode={addNodeMock} />);
    const titleElement = screen.getByRole('heading', { level: 1 });

    fireEvent.keyDown(titleElement, { key: 'Enter' });

    expect(addNodeMock).toHaveBeenCalledTimes(1);
  });
  it('does not call addNode when keys other than Enter are pressed', () => {
    const addNodeMock = vi.fn();
    render(<Title title="Some Title" changePageTitle={() => {}} addNode={addNodeMock} />);
    const titleElement = screen.getByRole('heading', { level: 1 });

    fireEvent.keyDown(titleElement, { key: 'a' });
    fireEvent.keyDown(titleElement, { key: 'Backspace' });
    fireEvent.keyDown(titleElement, { key: 'Tab' });

    expect(addNodeMock).not.toHaveBeenCalled();
  });
  it("has the correct class applied", () => {
    render(<Title title="Test Title" changePageTitle={() => {}} addNode={() => {}} />);
    const titleElement = screen.getByRole('heading', { level: 1 });
    expect(titleElement).toHaveClass(styles.title);
  });
  it('calls changePageTitle with empty string if textContent is null on input', () => {
    const changePageTitleMock = vi.fn();
    render(<Title title="Initial Title" changePageTitle={changePageTitleMock} addNode={() => {}} />);
    const titleElement = screen.getByRole('heading', { level: 1 });

    fireEvent.input(titleElement, { target: { textContent: null } });

    expect(changePageTitleMock).toHaveBeenCalledWith('');
  });
  it('calls changePageTitle with empty string if textContent is null on blur', () => {
    const changePageTitleMock = vi.fn();
    render(<Title title="Initial Title" changePageTitle={changePageTitleMock} addNode={() => {}} />);
    const titleElement = screen.getByRole('heading', { level: 1 });

    fireEvent.blur(titleElement, { target: { textContent: null } });

    expect(changePageTitleMock).toHaveBeenCalledWith('');
  });
});
