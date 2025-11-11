import { arrayMove } from "@dnd-kit/sortable";
import { NodeData, NodeType, Page } from "../utils/types";
import { useSyncedState } from "./useSyncedState";
import { updatePage } from "../utils/updatePage";
import { createPage } from "../utils/createPage";
import { supabase } from "../supabaseClient";
import { useEffect, useState } from "react";

export const usePageState = (initialState: Page) => {
    const [page, setPage] = useSyncedState(initialState, updatePage);
    const [userId, setUserId] = useState<string | null>(null);
    const [isCommandPanelOpen, setIsCommandPanelOpen] = useState(false);
    
        useEffect(() => {
        const getUser = async () => {
            const { data, error } = await supabase.auth.getUser();
            if (data?.user?.id) {
            setUserId(data.user.id);
            } else {
            console.error("User not found:", error);
            }
        };
        getUser();
        }, []);

    const addNode = (node: NodeData, index: number) => {
        setPage((draft) => {draft.nodes.splice(index, 0, node)}
        );
    };

    const removeNodeByIndex = (nodeIndex: number) => {
        setPage((draft) => {draft.nodes.splice(nodeIndex, 1)})
    };

    const changeNodeValue = (nodeIndex: number, value: string) => {
        setPage((draft) => {
            draft.nodes[nodeIndex].value = value;
        });
    };

    const changeNodeType = async (nodeIndex: number, type: NodeType) => {
        if (type === "page") {
            const newPage = await createPage();
            if (newPage) {
                setPage((draft) => {
                    draft.nodes[nodeIndex].type = type;
                    draft.nodes[nodeIndex].value = newPage.slug;
                });
            }
        } else {
            setPage((draft) => {
                draft.nodes[nodeIndex].type = type;
                draft.nodes[nodeIndex].value = "";
            });
        }
    };

    const setNodes = (nodes: NodeData[]) => {
        setPage((draft) => {
            draft.nodes = nodes;
        });
    };

    const setTitle = (title: string) => {
        setPage((draft) => {
            draft.title = title;
        });
    };

    const setCoverImage = (coverImage: string) => {
        setPage((draft) => {
            draft.cover = coverImage;
        });
    };

    const reorderNodes = (id1: string, id2: string) => {
        setPage((draft) => {
            const index1 = draft.nodes.findIndex(node => node.id === id1)
            const index2 = draft.nodes.findIndex(node => node.id === id2)
            draft.nodes = arrayMove(draft.nodes, index1, index2)
        })
    }

    const updateNodeEmoji = async (nodeId: string, emoji: string) => {
        const { error } = await supabase
            .from("pages")
            .update({ emoji })
            .eq("id", nodeId)
            .eq("created_by", userId);
        if (error) {
            console.error("Error updating emoji:", error);
        }
    };

    const setEmoji = async (nodeIndex: number, emoji: string) => {
        setPage((draft) => {
            draft.nodes[nodeIndex].emoji = emoji;
        });
    
        const nodeIdString = page.nodes[nodeIndex].id;

        if (!nodeIdString) {
            console.error("Invalid node ID:", nodeIdString);
            return;
        }

        await updateNodeEmoji(nodeIdString, emoji);
    };

    const updateNodeCaptionInDatabase = async (nodeId: string, caption: string) => {
        const { error } = await supabase
            .from("pages")
            .update({ caption })
            .eq("id", nodeId)
            .eq("created_by", userId);
            if (error) {
                console.error("Error updating caption:", error.message, error.details);
            }
    };

    return {
        nodes: page.nodes,
        title: page.title,
        cover: page.cover,
        changeNodeType,
        changeNodeValue,
        addNode,
        removeNodeByIndex,
        setTitle,
        setCoverImage,
        setNodes,
        reorderNodes,
        setEmoji,
        updateNodeCaptionInDatabase,
        isCommandPanelOpen,
        setIsCommandPanelOpen,
    }
}