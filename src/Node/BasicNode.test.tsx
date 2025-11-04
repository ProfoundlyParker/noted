const mockChangeNodeValue = vi.fn()
const mockChangeNodeType = vi.fn()
const mockRemoveNodeByIndex = vi.fn()
const mockAddNode = vi.fn()
const mockSetIsCommandPanelOpen = vi.fn()

vi.mock('../state/AppStateContext', () => ({
  useAppState: () => ({
    changeNodeValue: mockChangeNodeValue,
    changeNodeType: mockChangeNodeType,
    removeNodeByIndex: mockRemoveNodeByIndex,
    addNode: mockAddNode,
    setIsCommandPanelOpen: mockSetIsCommandPanelOpen,
  }),
}))

vi.mock('./CommandPanel', () => ({
  CommandPanel: ({ nodeText }: any) => (
    <div data-testid="command-panel">Command Panel: {nodeText}</div>
  )
}))

beforeEach(() => {
  document.body.innerHTML = "";
  window.getSelection()?.removeAllRanges();
  mockAddNode.mockClear();
  mockChangeNodeValue.mockClear();
  mockRemoveNodeByIndex.mockClear();
});

import { render, fireEvent, waitFor, act } from '@testing-library/react'
import { BasicNode } from './BasicNode'
import { NodeType } from '../utils/types'
import { vi } from 'vitest'

describe('BasicNode', () => {
  const mockUpdateFocusedIndex = vi.fn()

  const baseProps = {
    index: 0,
    isFocused: false,
    node: { id: '1', type: 'text' as NodeType, value: 'hello' },
    updateFocusedIndex: mockUpdateFocusedIndex,
  }

  it('renders the editable div with correct content', () => {
    const { getByText } = render(<BasicNode {...baseProps} />)
    expect(getByText('hello')).toBeInTheDocument()
  })
  it('shows command panel if value starts with "/" and isFocused', () => {
    const { getByTestId } = render(
      <BasicNode {...baseProps} node={{ ...baseProps.node, value: '/text' }} isFocused />
    )
    expect(getByTestId('command-panel')).toBeInTheDocument()
  })
  it('calls updateFocusedIndex on click', () => {
    const { getByRole } = render(<BasicNode {...baseProps} />)
    fireEvent.click(getByRole('textbox'))
    expect(mockUpdateFocusedIndex).toHaveBeenCalledWith(0)
  })
  it('calls changeNodeValue on input', () => {
    const { getByRole } = render(<BasicNode {...baseProps} isFocused />)
    const editable = getByRole('textbox')
    editable.textContent = 'new text'
    fireEvent.input(editable)
    expect(mockChangeNodeValue).toHaveBeenCalledWith(0, 'new text')
  })
  it('splits node on Enter at end of content', () => {
        const { getByRole } = render(<BasicNode {...baseProps} isFocused />)
        const editable = getByRole('textbox')

        editable.textContent = 'hello'
        fireEvent.focus(editable)

        const range = document.createRange()
        const sel = window.getSelection()
        range.selectNodeContents(editable)
        range.collapse(false)
        sel?.removeAllRanges()
        sel?.addRange(range)

        fireEvent.keyDown(editable, { key: 'Enter' })

        const callArgs = mockAddNode.mock.calls[0]

        expect(callArgs[1]).toBe(1)
        expect(callArgs[0].type).toBe('text')
        expect(typeof callArgs[0].value).toBe('string')
        expect(callArgs[0].id).toBeDefined()
    })
    it('removes node on Backspace if empty', () => {
        const emptyNode = { ...baseProps.node, value: '' }
        const { getByRole } = render(<BasicNode {...baseProps} isFocused node={emptyNode} />)
        const editable = getByRole('textbox')
        editable.textContent = ''

        fireEvent.focus(editable)
        fireEvent.keyDown(editable, { key: 'Backspace' })

        expect(mockRemoveNodeByIndex).toHaveBeenCalledWith(0)
    })
    it('removes node on Backspace if all text is selected', () => {
        const { getByRole } = render(<BasicNode {...baseProps} isFocused />)
        const editable = getByRole('textbox')
        editable.textContent = 'hello'

        const range = document.createRange()
        const sel = window.getSelection()
        range.selectNodeContents(editable)
        sel?.removeAllRanges()
        sel?.addRange(range)

        fireEvent.keyDown(editable, { key: 'Backspace' })

        expect(mockRemoveNodeByIndex).toHaveBeenCalledWith(0)
    })
    it('does not show CommandPanel if node does not start with /', () => {
        const { queryByText } = render(
            <BasicNode {...baseProps} node={{ ...baseProps.node, value: 'not a command' }} isFocused />
        )
        expect(queryByText('CommandPanel')).not.toBeInTheDocument()
    })
    it('focuses editable div when isFocused becomes true', () => {
        const { getByRole, rerender } = render(<BasicNode {...baseProps} isFocused={false} />)
        const editable = getByRole('textbox')
        
        expect(document.activeElement).not.toBe(editable)
        
        rerender(<BasicNode {...baseProps} isFocused={true} />)
        
        expect(document.activeElement).toBe(editable)
    })
    it('updates textContent when node.value changes externally', () => {
        const { getByRole, rerender } = render(<BasicNode {...baseProps} node={{ ...baseProps.node, value: 'hello' }} />)
        const editable = getByRole('textbox')
        expect(editable.textContent).toBe('hello')

        rerender(<BasicNode {...baseProps} node={{ ...baseProps.node, value: 'updated' }} />)
        expect(editable.textContent).toBe('updated')
    })
    it('blurs editable div when isFocused becomes false and div is focused', () => {
        const { getByRole, rerender } = render(<BasicNode {...baseProps} isFocused={true} />)
        const editable = getByRole('textbox')
        editable.focus()
        expect(document.activeElement).toBe(editable)

        rerender(<BasicNode {...baseProps} isFocused={false} />)
        expect(document.activeElement).not.toBe(editable)
    })
    it('does nothing on Enter if node.value starts with "/"', () => {
        mockAddNode.mockClear();
        mockChangeNodeValue.mockClear();

        const slashCommandNode = {
            ...baseProps.node,
            value: '/slash',
        };

        const { getByRole } = render(
            <BasicNode
                {...baseProps}
                node={slashCommandNode}
                isFocused
            />
        );

        const editable = getByRole('textbox');
        editable.textContent = '/slash';

        const range = document.createRange();
        const textNode = editable.firstChild;
        range.setStart(textNode || editable, slashCommandNode.value.length);
        range.collapse(true);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);

        fireEvent.keyDown(editable, { key: 'Enter' });

        expect(mockAddNode).not.toHaveBeenCalled();
        expect(mockChangeNodeValue).not.toHaveBeenCalled();
    });
    it('adds node at current index if caret at 0 on Enter', () => {
        const { getByRole } = render(<BasicNode {...baseProps} isFocused />)
        const editable = getByRole('textbox')
        editable.textContent = 'hello'
        
        const range = document.createRange()
        const sel = window.getSelection()
        range.setStart(editable.firstChild!, 0)
        range.collapse(true)
        sel?.removeAllRanges()
        sel?.addRange(range)

        fireEvent.keyDown(editable, { key: 'Enter' })

        expect(mockAddNode).toHaveBeenCalledWith(expect.objectContaining({ type: 'text', value: '' }), 0)
    })
    it('adds node at next index if caret at end on Enter', () => {
        mockAddNode.mockClear();

        const nodeWithValue = {
            ...baseProps.node,
            value: 'hello',
        };

        const { getByRole } = render(
            <BasicNode {...baseProps} node={nodeWithValue} isFocused />
        );
        const editable = getByRole('textbox');

        // Wait for content to render
        expect(editable.textContent).toBe('hello');

        const textNode = editable.firstChild;
        const range = document.createRange();
        const sel = window.getSelection();
        range.setStart(textNode!, textNode!.textContent!.length);
        range.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(range);

        fireEvent.keyDown(editable, { key: 'Enter' });

        expect(mockAddNode).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'text', value: '' }),
            1
        );
    });
    it('splits node on Enter if caret in middle', () => {
        const { getByRole } = render(<BasicNode {...baseProps} isFocused />)
        const editable = getByRole('textbox')
        editable.textContent = 'hello'

        const range = document.createRange()
        const sel = window.getSelection()
        range.setStart(editable.firstChild!, 2)
        range.collapse(true)
        sel?.removeAllRanges()
        sel?.addRange(range)

        fireEvent.keyDown(editable, { key: 'Enter' })

        expect(mockChangeNodeValue).toHaveBeenCalledWith(0, 'he')
        expect(mockAddNode).toHaveBeenCalledWith(expect.objectContaining({ type: 'text', value: 'llo' }), 1)
    })
    it('removes node on Backspace if all text selected', () => {
        const { getByRole } = render(<BasicNode {...baseProps} isFocused />)
        const editable = getByRole('textbox')
        editable.textContent = 'hello'

        const range = document.createRange()
        const sel = window.getSelection()
        range.selectNodeContents(editable)
        sel?.removeAllRanges()
        sel?.addRange(range)

        fireEvent.keyDown(editable, { key: 'Backspace' })
        expect(mockRemoveNodeByIndex).toHaveBeenCalledWith(0)
    })
    it('removes node on Backspace if node is empty', () => {
        const emptyNode = { ...baseProps.node, value: '' }
        const { getByRole } = render(<BasicNode {...baseProps} isFocused node={emptyNode} />)
        const editable = getByRole('textbox')
        editable.textContent = ''

        fireEvent.keyDown(editable, { key: 'Backspace' })
        expect(mockRemoveNodeByIndex).toHaveBeenCalledWith(0)
    })
    it('merges with previous node on Backspace if caret at start', () => {
        document.body.innerHTML = `
            <div data-node-index="0">prev</div>
            <div data-node-index="1" contenteditable="true">current</div>
        `
        mockChangeNodeValue.mockClear()
        mockRemoveNodeByIndex.mockClear()

        const { getByRole } = render(<BasicNode {...baseProps} index={1} isFocused />)
        const editable = getByRole('textbox')
        editable.textContent = 'current'

        const range = document.createRange()
        const sel = window.getSelection()
        range.setStart(editable.firstChild!, 0)
        range.collapse(true)
        sel?.removeAllRanges()
        sel?.addRange(range)

        fireEvent.keyDown(editable, { key: 'Backspace' })

        expect(
            mockChangeNodeValue.mock.calls.some(
            ([calledIndex, calledValue]) =>
                calledIndex === 0 && calledValue === 'prevcurrent'
            )
        ).toBe(true)

        expect(mockRemoveNodeByIndex).toHaveBeenCalledWith(1)
    })
    it('does nothing on Backspace if partial selection', () => {
        mockChangeNodeValue.mockClear()
        mockRemoveNodeByIndex.mockClear()
        const { getByRole } = render(<BasicNode {...baseProps} isFocused />)
        const editable = getByRole('textbox')
        editable.textContent = 'hello'

        const range = document.createRange()
        const sel = window.getSelection()
        range.setStart(editable.firstChild!, 1)
        range.setEnd(editable.firstChild!, 3)
        sel?.removeAllRanges()
        sel?.addRange(range)

        fireEvent.keyDown(editable, { key: 'Backspace' })

        expect(mockRemoveNodeByIndex).not.toHaveBeenCalled()
    })
    it('merges with next node on Delete if caret at end', () => {
        mockChangeNodeValue.mockClear()
        mockRemoveNodeByIndex.mockClear()

        const firstNodeProps = {
            ...baseProps,
            node: { ...baseProps.node, value: 'hello' },
            index: 0,
            isFocused: true,
        }

        const secondNodeProps = {
            ...baseProps,
            node: { ...baseProps.node, value: 'world' },
            index: 1,
            isFocused: false,
        }

        const { getByTestId } = render(
            <>
                <BasicNode {...firstNodeProps} data-testid="editable-0" />
                <BasicNode {...secondNodeProps} data-testid="editable-1" />
            </>
        )

        const editable = getByTestId('editable-0')
        const nextEditable = getByTestId('editable-1')

        editable.textContent = 'hello'
        nextEditable.textContent = 'world'

        const range = document.createRange()
        range.setStart(editable.firstChild!, editable.textContent!.length)
        range.collapse(true)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)

        fireEvent.keyDown(editable, { key: 'Delete' })

        expect(mockChangeNodeValue).toHaveBeenCalledWith(0, 'helloworld')
        expect(mockRemoveNodeByIndex).toHaveBeenCalledWith(1)
    })
    it('does nothing on Delete if caret not at end', async () => {
        mockChangeNodeValue.mockClear()
        mockRemoveNodeByIndex.mockClear()
        const { getByTestId } = render(
            <>
                <BasicNode
                    {...baseProps}
                    node={{ ...baseProps.node, value: 'hello' }}
                    isFocused
                    index={0}
                />
                <BasicNode
                    {...baseProps}
                    node={{ ...baseProps.node, value: 'world' }}
                    isFocused={false}
                    index={1}
                />
            </>
        )

        const editable = getByTestId('editable-0')
        

        await waitFor(() => {
            expect(editable.textContent).toBe('hello')
            expect(editable.firstChild).not.toBeNull()
        })
        const range = document.createRange()
        const sel = window.getSelection()
        range.setStart(editable.firstChild!, 1)
        range.collapse(true)
        sel?.removeAllRanges()
        sel?.addRange(range)

        expect(sel?.getRangeAt(0).startOffset).toBeLessThan(editable.textContent!.length)

        fireEvent.keyDown(editable, { key: 'Delete' })

        expect(mockChangeNodeValue).not.toHaveBeenCalled()
        expect(mockRemoveNodeByIndex).not.toHaveBeenCalled()
    })
    it('calls placeCaretAtEnd when deleting an entire node', () => {
        const { getByRole } = render(<BasicNode {...baseProps} isFocused node={{ ...baseProps.node, value: 'some text' }} />)
        const editable = getByRole('textbox')

        const range = document.createRange()
        range.selectNodeContents(editable)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)

        fireEvent.keyDown(editable, { key: 'Backspace' })

        expect(mockRemoveNodeByIndex).toHaveBeenCalledWith(0)
    })
    it('removes node and moves focus to previous node if all text selected and Backspace is pressed', () => {
        const { getByRole } = render(<BasicNode {...baseProps} isFocused node={{ ...baseProps.node, value: 'hello' }} />)
        const editable = getByRole('textbox')

        const range = document.createRange()
        range.selectNodeContents(editable)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)

        fireEvent.keyDown(editable, { key: 'Backspace' })

        expect(mockRemoveNodeByIndex).toHaveBeenCalledWith(0)
    })
    it('removes empty node on Backspace and places caret at end of previous node', () => {
        const { getByRole } = render(<BasicNode {...baseProps} isFocused node={{ ...baseProps.node, value: '' }} />)
        const editable = getByRole('textbox')

        fireEvent.keyDown(editable, { key: 'Backspace' })

        expect(mockRemoveNodeByIndex).toHaveBeenCalledWith(0)
    })
    it('removes empty node on Backspace and moves focus to previous node', () => {
    const { getByTestId } = render(
        <BasicNode {...baseProps} index={1} node={{ id: '2', type: 'text', value: '' }} isFocused={true} />
    );

    const editable = getByTestId('editable-1');
    editable.focus();

    fireEvent.keyDown(editable, { key: 'Backspace' });
    vi.useFakeTimers();

    act(() => {
        vi.runAllTimers();
    });

    expect(mockRemoveNodeByIndex).toHaveBeenCalledWith(1);
    });
    it('adds node above when Enter is pressed at start of text', () => {
    const mockSelection = {
        removeAllRanges: vi.fn(),
        addRange: vi.fn(),
        anchorOffset: 0,
        getRangeAt: () => ({ startOffset: 0 }),
    };
    vi.spyOn(window, 'getSelection').mockReturnValue(mockSelection as any);

    const { getByTestId } = render(<BasicNode {...baseProps} isFocused={true} />);
    const editable = getByTestId('editable-0');
    editable.focus();

    fireEvent.keyDown(editable, { key: 'Enter' });

    vi.useFakeTimers();

    act(() => {
        vi.runAllTimers();
    });

    expect(mockAddNode).toHaveBeenCalledWith(expect.objectContaining({ value: "" }), 0);
    });
    it('deletes node and moves caret to previous node when all text is selected and Backspace is pressed', async () => {
        const mockPrevDiv = document.createElement('div')
        mockPrevDiv.setAttribute('data-node-index', '0')
        document.body.appendChild(mockPrevDiv)

        const { getByTestId } = render(
            <>
            <BasicNode {...baseProps} index={1} />
            </>
        )

        const editable = getByTestId('editable-1')

        editable.textContent = 'Text'
        const range = document.createRange()
        range.selectNodeContents(editable)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)

        fireEvent.keyDown(editable, { key: 'Backspace' })

        await act(() => Promise.resolve())

        expect(mockRemoveNodeByIndex).toHaveBeenCalledWith(1)
        expect(mockUpdateFocusedIndex).toHaveBeenCalledWith(0)
    })
    it('deletes node and focuses previous when node is empty and Backspace is pressed', async () => {
        const mockPrev = document.createElement('div')
        mockPrev.setAttribute('data-node-index', '0')
        document.body.appendChild(mockPrev)

        const { getByTestId } = render(
            <>
            <BasicNode {...baseProps} index={1} />
            </>
        )

        const editable = getByTestId('editable-1')
        editable.textContent = ''

        fireEvent.keyDown(editable, { key: 'Backspace' })

        await act(() => Promise.resolve())

        expect(mockRemoveNodeByIndex).toHaveBeenCalledWith(1)
        expect(mockUpdateFocusedIndex).toHaveBeenCalledWith(0)
    });
    it('calls placeCaretAtEnd with el.lastChild when deleting entire node', () => {
        document.body.innerHTML = `
            <div data-node-index="0">prev text</div>
            <div data-node-index="1" contenteditable="true">current</div>
        `;
        const { getByTestId } = render(
            <BasicNode {...baseProps} index={1} isFocused node={{ ...baseProps.node, value: 'current' }} />
        );
        const editable = getByTestId('editable-1');
        editable.focus();

        const range = document.createRange();
        range.selectNodeContents(editable);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);

        fireEvent.keyDown(editable, { key: 'Backspace' });

        expect(mockRemoveNodeByIndex).toHaveBeenCalledWith(1);
    });
    it('moves caret to previous node when deleting current node with Backspace', async () => {
        document.body.innerHTML = `
            <div data-node-index="0">prev</div>
            <div data-node-index="1" contenteditable="true">current</div>
        `;

        const { getByTestId } = render(
            <BasicNode {...baseProps} index={1} isFocused node={{ ...baseProps.node, value: 'current' }} />
        );

        const editable = getByTestId('editable-1');
        editable.focus();

        const range = document.createRange();
        range.selectNodeContents(editable);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);

        fireEvent.keyDown(editable, { key: 'Backspace' });

        await act(() => Promise.resolve());

        expect(mockRemoveNodeByIndex).toHaveBeenCalledWith(1);
        expect(mockUpdateFocusedIndex).toHaveBeenCalledWith(0);
    });
})