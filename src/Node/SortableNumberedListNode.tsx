import { useSortable } from "@dnd-kit/sortable";
import { NodeData } from "../utils/types";
import styles from "./Node.module.css";
import { NumberedListNode } from "./NumberedListNode";

type Props = {
  node: NodeData;
  index: number;
  isFocused: boolean;
  updateFocusedIndex: (index: number) => void;
  registerRef?: (index: number, ref: HTMLLIElement) => void;
};

export const SortableNumberedListNode = ({ node, index, isFocused, updateFocusedIndex, registerRef }: Props) => {
  const {
    attributes,
    setNodeRef,
    listeners,
    transition,
  } = useSortable({ id: node.id });

  const style = {
    transition,
  };

  return (
  <li
    ref={setNodeRef}
    style={{
      ...style,
      display: "flex",
      alignItems: "center",
      position: "relative",
      minHeight: 32,
    }}
    {...attributes}
    className={styles.listItem}
  >
    {/* Drag handle absolutely positioned */}
    <div className={styles.dragZone}>
    <div
      {...listeners}
      className={styles.dragHandle}
      style={{
        position: "absolute",
        top: "45%",
        transform: "translateY(-50%)",
        zIndex: 1,
      }}
    >
      ⠿
    </div>
  </div>
    {/* The rest of your node content */}
    <div style={{ flex: 1 }}>
      <NumberedListNode
        node={node}
        index={index}
        isFocused={isFocused}
        updateFocusedIndex={updateFocusedIndex}
        registerRef={(i, el) => registerRef?.(i, el as any)}
      />
    </div>
  </li>
);
};