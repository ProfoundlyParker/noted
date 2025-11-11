import React, { useState, Dispatch } from "react";
import { NodeData } from "../utils/types"

type UseFocusedNodeIndexProps = {
    nodes: NodeData[];
    commandPanelRef: React.RefObject<HTMLDivElement>;
}

// @ts-ignore
export const useFocusedNodeIndex = ({ nodes, commandPanelRef }: UseFocusedNodeIndexProps): [number, Dispatch<number>] => {
    const [ focusedNodeIndex, setFocusedNodeIndex ] = useState(0);
    return [ focusedNodeIndex, setFocusedNodeIndex ]
}