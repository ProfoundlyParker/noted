import { useRef, useEffect, FormEventHandler, KeyboardEventHandler, useState } from "react";
import cx from "classnames";
import { NodeData, NodeType } from "../utils/types";
import styles from "./Node.module.css";
import { useAppState } from "../state/AppStateContext";
import { CommandPanel } from "./CommandPanel";

export const NumberedListNode = ({
    node,
    index,
    isFocused,
    updateFocusedIndex,
    registerRef
}: {
    node: NodeData;
    index: number;
    isFocused: boolean;
    updateFocusedIndex: (index: number) => void;
    registerRef?: (index: number, ref: HTMLDivElement) => void;
}) => {
    const nodeRef = useRef<HTMLDivElement>(null);
    const { changeNodeValue, removeNodeByIndex, addNode, changeNodeType, nodes } = useAppState();
    const showCommandPanel = isFocused && node?.value?.match(/^\//);
    const [currentNodeType, setCurrentNodeType] = useState<NodeType>(node.type);
    const [justChangedType, setJustChangedType] = useState(false);

    useEffect(() => {
            if (nodeRef.current && registerRef) {
                registerRef(index, nodeRef.current);
            }
        }, [nodeRef.current, index, registerRef]);

    useEffect(() => {
        if (!nodeRef.current) return;
        const editable = nodeRef.current;

        // Only update content if NOT focused and value is different
        if (
            document.activeElement !== editable &&
            editable.textContent !== node.value
        ) {
            editable.textContent = node.value || "\u200B";
        }
        // Only focus if needed, but don't move caret!
        if (isFocused && document.activeElement !== editable) {
            editable.focus();
        }
        setCurrentNodeType(node.type);
    }, [node.value, isFocused, node.type]);


    const handleInput: FormEventHandler<HTMLDivElement> = ({ currentTarget }) => {
        changeNodeValue(index, currentTarget.textContent || "");
    };

    const handleClick = () => {
        updateFocusedIndex(index);
    };

    const parseCommand = (nodeType: NodeType) => {
        if (!nodeRef.current) return;
          const editable = nodeRef.current;
            let text = editable.textContent ?? "";

            // Trim and normalize any stray zero-width spaces or whitespace
            text = text.replace(/\u200B/g, "").trim();

            // Clear before changing type to avoid leftover placeholder
            changeNodeValue(index, text);
            editable.textContent = text;

            if (text === "") {
                changeNodeValue(index, "");
            }

        changeNodeType(index, nodeType);
        setJustChangedType(true);
    };

    // Helper: focus the contenteditable for node `idx` and place caret at end
    const focusEditableAtIndex = (idx: number, placeCaretAtEnd = true) => {
    // Run on next paint so the DOM reflects the removed/updated node
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const container = document.querySelector(`[data-node-index="${idx}"]`) as HTMLElement | null;
            if (!container) {
            return;
            }

            // Find any descendant with contenteditable
            const editable = container.querySelector<HTMLElement>('[contenteditable]');

            // If there's no editable element (image/page/etc.), still update focused index so UI highlights the node
            if (!editable) {
            /* c8 ignore next 3 */
            updateFocusedIndex(idx);
            return;
            }

            // If there's a zero-width placeholder, normalize it out for caret placement
            if (editable.textContent === "\u200B") {
            /* c8 ignore next 2 */
            editable.textContent = "";
            }

            // Focus the editable element
            editable.focus();

            // Place caret robustly: if there's a text node use it, otherwise collapse to start/end of the editable
            const sel = window.getSelection();
            if (!sel) {
                /* c8 ignore next 3 */
                updateFocusedIndex(idx);
                return;
            }

            const range = document.createRange();
            const walker = document.createTreeWalker(editable, NodeFilter.SHOW_TEXT, null);
            let lastTextNode: Text | null = null;
            while (walker.nextNode()) {
                lastTextNode = walker.currentNode as Text;
            }

            if (lastTextNode) {
                // place caret at end or start of the last node
                const offset = placeCaretAtEnd ? (lastTextNode.textContent?.length ?? 0) : 0;
                range.setStart(lastTextNode, Math.min(offset, lastTextNode.textContent?.length ?? 0));
                range.setEnd(lastTextNode, Math.min(offset, lastTextNode.textContent?.length ?? 0));
            } /* c8 ignore next 6 */
             else {
                // no text nodes — select contents and collapse to start/end
                range.selectNodeContents(editable);
                // collapse(false) -> end, collapse(true) -> start
                range.collapse(!placeCaretAtEnd ? true : false);
            }

            sel.removeAllRanges();
            sel.addRange(range);

            // Tell app state that this index is focused
            updateFocusedIndex(idx);
        });
      });
    };

    const onKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
        const target = event.target as HTMLDivElement;

        if (event.key === "Backspace") {
            const selection = window.getSelection();
            const caretPos = selection?.getRangeAt(0)?.startOffset || 0;
            const text = target.textContent || "";

            // Check if all text is selected
            const isAllSelected = (() => {
                if (!selection || !selection.rangeCount || !target.firstChild) return false;

                    const range = selection.getRangeAt(0);

                    return (
                        range.startContainer === target.firstChild &&
                        range.endContainer === target.firstChild &&
                        range.startOffset === 0 &&
                        range.endOffset === text.length &&
                        text.length > 0
                    );
                })();


            // Case 1: All text is selected, delete node and value
            if (isAllSelected) {
                event.preventDefault();
                if (index === 0) {
                    /* c8 ignore next 10 */
                    if (nodes.length > 1) {
                        target.textContent = "";
                        removeNodeByIndex(0);
                        focusEditableAtIndex(0, false);
                    } else {
                        changeNodeValue(0, "");
                        target.textContent = "";
                    }
                    return;
                }
                removeNodeByIndex(index);
                focusEditableAtIndex(index - 1, true);
                return;
            }

            // Case 2: If node is empty
            if (text.trim().length === 0 || target.innerHTML === "<br>") {
                event.preventDefault();

                if (index === 0) {
                    if (nodes.length > 1) {
                        target.textContent = "";
                        removeNodeByIndex(0);
                        focusEditableAtIndex(0, false);
                    } else {
                        /* c8 ignore next 3 */
                        changeNodeValue(0, "");
                        target.textContent = "";
                    }
                    return;
                }

                removeNodeByIndex(index);

                if (index > 0) {
                    focusEditableAtIndex(index - 1, true);
                }
                return;
            }

            // Case 3: Not empty, but caret is at the start
            else if (caretPos === 0 && index > 0) {
                event.preventDefault();

                if (text.trim().length === 0) {
                    /* c8 ignore next 4 */
                    removeNodeByIndex(index);
                    focusEditableAtIndex(index - 1, true);
                    return; // stop here, don’t merge
                }

                const prevText = nodes?.[index - 1]?.value ?? "";
                const mergedText = prevText + text;
                changeNodeValue(index - 1, mergedText);
                removeNodeByIndex(index);

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        const updatedPrev = document.querySelector(
                            `[data-node-index="${index - 1}"] [contenteditable]`
                        ) as HTMLElement | null;

                        if (!updatedPrev) {
                            /* c8 ignore next 3 */
                            updateFocusedIndex(index - 1);
                            return;
                        }

                        updatedPrev.focus();

                        const range = document.createRange();
                        range.selectNodeContents(updatedPrev);
                        range.collapse(false);

                        const sel = window.getSelection();
                        sel?.removeAllRanges();
                        sel?.addRange(range);

                        updateFocusedIndex(index - 1);
                    });
                });

                return;
            }
        }
        if (event.key === "Enter") {
            if (showCommandPanel) return;
            if (justChangedType) {
                /* c8 ignore next 3 */
                setJustChangedType(false);
                return;
            }
            if (target.textContent?.[0] === "/") return;
                event.preventDefault();

                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) return;

                const range = selection.getRangeAt(0);
                const caretPos = range.startOffset;
                const fullText = target.textContent || "";

                const before = fullText.slice(0, caretPos);
                const after = fullText.slice(caretPos);

                // Update current node with text before cursor
            if (before !== node.value) {
                    changeNodeValue(index, before);
                    target.textContent = before;
                }

                // Add new node with text after cursor (if any)
                addNode({ type: currentNodeType, value: after, id: crypto.randomUUID() }, index + 1);

                requestAnimationFrame(() => {
                    updateFocusedIndex(index + 1);
                });
        }
        if (event.key === "Delete") {
            const selection = window.getSelection();
            const caretPos = selection?.getRangeAt(0)?.startOffset ?? 0;
            const currentText = target.textContent ?? "";

            // If caret is at the end of this node
            if (caretPos === currentText.length) {
                event.preventDefault();

                const nextNodeEl = document.querySelector(
                    `[data-node-index="${index + 1}"] div[contenteditable]`
                ) as HTMLDivElement;

                if (nextNodeEl) {
                    const nextText = nextNodeEl.textContent ?? "";

                    // Merge text
                    const merged = currentText + nextText;
                    changeNodeValue(index, merged);
                    removeNodeByIndex(index + 1);

                    requestAnimationFrame(() => {
                        const thisNode = document.querySelector(
                            `[data-node-index="${index}"] div[contenteditable]`
                        ) as HTMLDivElement;

                        if (thisNode && thisNode.firstChild) {
                            const range = document.createRange();
                            const sel = window.getSelection();

                            range.setStart(thisNode.firstChild, currentText.length);
                            range.collapse(true);

                            sel?.removeAllRanges();
                            sel?.addRange(range);

                            thisNode.focus();
                        }
                    });
                }
            }
        }
    };

 return (
    <>
    {
        showCommandPanel && (
            <CommandPanel selectItem={parseCommand} nodeText={node.value} />
        )
    }
    <div
    className={cx(styles.node, styles.numberedList)}
    style={{ flex: 1 }}
    data-node-index={index}
    onClick={handleClick}
    >
        <div
            ref={(el) => {
                (nodeRef as React.MutableRefObject<any>).current = el;
                if (el && registerRef) {
                    registerRef(index, el);
                }
            }}
            contentEditable
            data-testid="editable"
            role="textbox"
            suppressContentEditableWarning
            className={styles.editable}
            style={{
                outline: "none",
                minHeight: 24,
                whiteSpace: "pre-wrap",
            }}
            onInput={handleInput}
            onKeyDown={onKeyDown}
            tabIndex={0}
        >
            {node.value || " "} {/* Non-breaking space if empty */}
        </div>
    </div>
    </>
 )
};