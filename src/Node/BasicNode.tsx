import { FormEventHandler, KeyboardEventHandler, useEffect, useRef } from "react";
import { NodeData, NodeType } from "../utils/types";
import styles from "./Node.module.css"
import { nanoid } from "nanoid";
import { useAppState } from "../state/AppStateContext";
import { CommandPanel } from "./CommandPanel";
import cx from "classnames";

type BasicNodeProps = {
    node: NodeData;
    updateFocusedIndex(index: number): void;
    isFocused: boolean;
    index: number;
}

export const BasicNode = ({
    node,
    updateFocusedIndex,
    isFocused,
    index,
}: BasicNodeProps) => {
    const nodeRef = useRef<HTMLDivElement>(null);
    const showCommandPanel = isFocused && node?.value?.match(/^\//);

    const placeCaretAtEnd = (el: HTMLElement) => {
        el.focus();
        const range = document.createRange();
        const sel = window.getSelection();
        if (el.lastChild) {
            range.setStart(el.lastChild, (el.lastChild.textContent || "").length);
        } else {
            range.setStart(el, 0);
        }
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
    };    

    const { changeNodeValue, changeNodeType, removeNodeByIndex, addNode } = useAppState();
    useEffect(() => {
        if (!nodeRef.current) return;

        const el = nodeRef.current;

        if (document.activeElement !== el && el.textContent !== node.value) {
            el.textContent = node.value;
        }

        if (isFocused && document.activeElement !== el) {
            el.focus();
        } else if (!isFocused && document.activeElement === el) {
            el.blur();
        }
    }, [node.value, isFocused]);


    const parseCommand = (nodeType: NodeType) => {
        if (nodeRef.current) {
            changeNodeType(index, nodeType);
            nodeRef.current.textContent = "";
        }
    }

    const handleInput: FormEventHandler<HTMLDivElement> = ({currentTarget}) => {
        const { textContent } = currentTarget;
        changeNodeValue(index, textContent || "");
    }

    const handleClick = () => {
        updateFocusedIndex(index);
    }

    const onKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
        const target = event.target as HTMLDivElement;
        if (event.key === "Enter") {
            event.preventDefault();
        
            if (node.value?.[0] === "/") return;
        
            const selection = window.getSelection();
            const range = selection?.getRangeAt(0);
            const fullText = node.value || "";
            const caretPos = range?.startOffset ?? fullText.length;

                if (caretPos === 0) {
                    addNode({ type: node.type, value: "", id: nanoid() }, index);
                    requestAnimationFrame(() => {
                        const next = document.querySelector(`[data-node-index="${index}"]`) as HTMLDivElement;
                        if (next) {
                            next.focus();
                            updateFocusedIndex(index);
                        }
                    });
                    return;
                }

              if (caretPos === fullText.length) {
                addNode({ type: node.type, value: "", id: nanoid() }, index + 1);
                requestAnimationFrame(() => {
                    const next = document.querySelector(`[data-node-index="${index + 1}"]`) as HTMLDivElement;
                    if (next) {
                        next.focus();
                        updateFocusedIndex(index + 1);
                    }
                });
                return;
            }
    
            const before = fullText.slice(0, caretPos);
            const after = fullText.slice(caretPos);
        
            changeNodeValue(index, before);
            addNode({ type: node.type, value: after, id: nanoid() }, index + 1);

            requestAnimationFrame(() => {
                const next = document.querySelector(`[data-node-index="${index + 1}"]`) as HTMLDivElement;
                if (next) {
                    next.focus();
                    updateFocusedIndex(index + 1);
                    const range = document.createRange();
                    range.setStart(next, 0);
                    range.collapse(true);
                    const sel = window.getSelection();
                    sel?.removeAllRanges();
                    sel?.addRange(range);
                }
            });
        }
        
        if (event.key === "Backspace") {
            const text = target.textContent || "";
            const selection = window.getSelection();
            const range = selection?.rangeCount ? selection.getRangeAt(0) : null;

            const anchorOffset = selection?.anchorOffset ?? 0;
            const focusOffset = selection?.focusOffset ?? 0;

            // Normalize offsets regardless of selection direction
            const start = Math.min(anchorOffset, focusOffset);
            const end = Math.max(anchorOffset, focusOffset);

            const isAllSelected =
                selection?.anchorNode === selection?.focusNode &&
                start === 0 &&
                end === text.length &&
                text.length > 0;

            const isEverythingSelected = range?.toString() === text;


            // Case 1: All text selected — delete entire node
            if (isAllSelected || isEverythingSelected) {
                event.preventDefault();
                removeNodeByIndex(index);
                requestAnimationFrame(() => {
                    const prev = document.querySelector(`[data-node-index="${index - 1}"]`) as HTMLDivElement;
                    if (prev) {
                        placeCaretAtEnd(prev);
                        updateFocusedIndex(index - 1);
                    }
                });
                return;
            }

            // Case 2: Node is empty — delete it
            if (text.length === 0) {
                event.preventDefault();
                removeNodeByIndex(index);
                requestAnimationFrame(() => {
                    const prev = document.querySelector(`[data-node-index="${index - 1}"]`) as HTMLDivElement;
                    if (prev) {
                        placeCaretAtEnd(prev);
                        updateFocusedIndex(index - 1);
                    }
                });
                return;
            }

            // Case 3: Caret at beginning — merge with previous
            if (selection?.anchorOffset === 0) {
                event.preventDefault();
                const prev = document.querySelector(`[data-node-index="${index - 1}"]`) as HTMLDivElement;
                const prevText = prev?.textContent || "";
                const currentText = text;

                if (prev) {
                    const mergedText = prevText + currentText;
                    changeNodeValue(index - 1, mergedText);
                    removeNodeByIndex(index);

                    requestAnimationFrame(() => {
                        const range = document.createRange();
                        range.setStart(prev.firstChild || prev, prevText.length);
                        range.collapse(true);

                        const sel = window.getSelection();
                        sel?.removeAllRanges();
                        sel?.addRange(range);

                        updateFocusedIndex(index - 1);
                    });
                }
                return;
            }
        }


        if (event.key === "Delete") {
            const selection = window.getSelection();
            const caretPos = selection?.getRangeAt(0)?.startOffset ?? 0;
            const currentText = target.textContent ?? "";

            // Only proceed if caret is at end
            if (caretPos === currentText.length) {
                const nextNodeEl = document.querySelector(
                    `[data-node-index="${index + 1}"]`
                ) as HTMLDivElement;

                if (nextNodeEl) {
                    event.preventDefault();

                    const nextText = nextNodeEl.textContent ?? "";
                    const merged = currentText + nextText;

                    changeNodeValue(index, merged);
                    removeNodeByIndex(index + 1);

                    // Restore caret position after merge
                    requestAnimationFrame(() => {
                        const updatedEl = document.querySelector(
                            `[data-node-index="${index}"]`
                        ) as HTMLDivElement;

                        if (updatedEl && updatedEl.firstChild) {
                            const range = document.createRange();
                            const sel = window.getSelection();

                            range.setStart(updatedEl.firstChild, currentText.length);
                            range.collapse(true);

                            sel?.removeAllRanges();
                            sel?.addRange(range);

                            updatedEl.focus();
                            updateFocusedIndex(index);
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
                <CommandPanel data-testid="command-panel" selectItem={parseCommand} nodeText={node.value} />
            )
        }
        <div onClick={handleClick} 
        onInput={handleInput}
        onKeyDown={onKeyDown}
        ref={nodeRef} contentEditable
        role="textbox"
        data-testid={`editable-${index}`}
        data-node-index={index}
        suppressContentEditableWarning
        className={cx(styles.node, styles[node.type])}></div>
        </>
    )
}