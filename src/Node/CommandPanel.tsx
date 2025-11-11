import { useEffect, useState } from "react";
import { NodeType } from "../utils/types";
import { useOverflowsScreenBottom } from "./useOverflowsScreenBottom";
import styles from "./CommandPanel.module.css";
import cx from "classnames";
import { useAppState } from "../state/AppStateContext";

type CommandPanelProps = {
    nodeText: string;
    selectItem: (nodeType: NodeType) => void;
}

type SupportedNodeType = {
    value: NodeType;
    name: string;
}

const supportedNodeTypes: SupportedNodeType[] = [
    {value: "text", name: "Text"},
    {value: "list", name: "List"},
    {value: "numberedList", name: "Numbered List"},
    {value: "page", name: "Page"},
    {value: "image", name: "Image"},
    {value: "heading1", name: "Heading 1"},
    {value: "heading2", name: "Heading 2"},
    {value: "heading3", name: "Heading 3"},
]

export const CommandPanel = ({ selectItem, nodeText }: CommandPanelProps) => {
    const [selectedItemIndex, setSelectedItemIndex] = useState(0);
    const { overflows, ref } = useOverflowsScreenBottom();
    const { setIsCommandPanelOpen } = useAppState();
    useEffect(() => {
        setIsCommandPanelOpen(true);
        return () => {
            setIsCommandPanelOpen(false);
        };
    }, [setIsCommandPanelOpen]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            switch (event.key) {
                case "ArrowUp":
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    setSelectedItemIndex(prevIndex =>
                        prevIndex > 0 ? prevIndex - 1 : supportedNodeTypes.length - 1
                    );
                    break;
                case "ArrowDown": 
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    setSelectedItemIndex(prevIndex => (prevIndex < supportedNodeTypes.length - 1 ? prevIndex + 1 : 0));
                    break;
                case "Enter":
                    event.preventDefault();
                    event.stopPropagation();
                    selectItem(supportedNodeTypes[selectedItemIndex].value);
                    break;
                default:
                    break;
            }
        }

        window.addEventListener("keydown", handleKeyDown, { capture: true });

        return () => {
            window.removeEventListener("keydown", handleKeyDown, { capture: true });
        }
    }, [selectedItemIndex, selectItem]);

    useEffect(() => {
        const normalizedValue = (nodeText || "")
            .toLowerCase()
            .replace(/\//g, "")        // remove slashes
            .replace(/\u200B/g, "")    // remove zero-width spaces
            .trim();                   // trim spaces

        if (!normalizedValue) {
            // default to first item (or keep existing behavior)
            setSelectedItemIndex(0);
            return;
        }

        // Searching by name and value
        const idx = supportedNodeTypes.findIndex(item =>
            item.value.toLowerCase().startsWith(normalizedValue) ||
            item.name.toLowerCase().startsWith(normalizedValue) ||
            item.value.toLowerCase().includes(normalizedValue) ||
            item.name.toLowerCase().includes(normalizedValue)
        );

        setSelectedItemIndex(idx >= 0 ? idx : 0);
    }, [nodeText]);

    return (
        <div ref={ref}
            className={cx(styles.panel, {
                [styles.reverse]: overflows,
            })}
        >
            <div className={styles.title}>Blocks</div>
            <ul>
                {supportedNodeTypes.map((type, index) => {
                    const selected = selectedItemIndex === index;
                    
                    return <li key={type.value}
                    className={cx({
                        [styles.selected]: selected,
                    })}
                    onClick={() =>  selectItem(type.value)}>
                        {type.name}
                        </li>
                })}
            </ul>
        </div>
    )
}