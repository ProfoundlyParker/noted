import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { NodeData } from "../utils/types";
import { NodeTypeSwitcher } from "./NodeTypeSwitcher";
import styles from "./NodeContainer.module.css";
import { useRef } from "react";

type NodeContainerProps = {
    node: NodeData;
    updateFocusedIndex(index: number): void;
    isFocused: boolean;
    index: number;
    registerRef?: (index: number, ref: HTMLDivElement) => void;
};

export const NodeContainer = ({ node, index, isFocused, updateFocusedIndex, registerRef }: NodeContainerProps) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: node.id
    })
    const nodeRef = useRef<HTMLDivElement>(null);
     const combinedRef = (el: HTMLDivElement | null) => {
        (nodeRef as React.MutableRefObject<any>).current = el;
        setNodeRef(el);
        if (el && registerRef) {
            registerRef(index, el);
        }
    };


    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

     const nodeSwitcherRef = useRef<HTMLDivElement>(null);

    // When the container is clicked, update focus and focus the input inside NodeTypeSwitcher
    const handleContainerClick = (e: React.MouseEvent) => {
        // Prevent drag handle from triggering focus
        if ((e.target as HTMLElement).closest(`.${styles.dragHandle}`)) return;
        updateFocusedIndex(index);
        // Try to focus the first input or textarea inside NodeTypeSwitcher
        (nodeSwitcherRef.current?.querySelector("input,textarea") as HTMLElement)?.focus();
    };

    return (
        <div 
        ref={combinedRef}
        style={style}
        className={styles.container}
        {...attributes}
        onClick={handleContainerClick}
        data-testid="node-container"
        >
           <div {...listeners} className={styles.dragHandle}>
             ⠿
            </div> 
            <NodeTypeSwitcher 
                node={node}
                index={index}
                isFocused={isFocused}
                updateFocusedIndex={updateFocusedIndex}
            />
        </div>
    )
}
