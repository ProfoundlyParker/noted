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
                    setSelectedItemIndex(prevIndex =>
                        prevIndex > 0 ? prevIndex - 1 : supportedNodeTypes.length - 1
                    );
                    break;
                case "ArrowDown": 
                    setSelectedItemIndex(prevIndex => (prevIndex < supportedNodeTypes.length - 1 ? prevIndex + 1 : 0));
                    break;
                case "Enter":
                    selectItem(supportedNodeTypes[selectedItemIndex].value);
                    break;
                default:
                    break;
            }
        }

        window.addEventListener("keydown", handleKeyDown)

        return () => {
            window.removeEventListener("keydown", handleKeyDown)
        }
    }, [selectedItemIndex, selectItem]);

    useEffect(() => {
        const normalizedValue = nodeText.toLowerCase().replace(/\//, "");
        setSelectedItemIndex(
            supportedNodeTypes.findIndex((item) => item.value.match(normalizedValue))
        )
    }, [nodeText])

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